"""AI client — OpenRouter (primary) + Hugging Face (fallback) hybrid chain.

Provider priority:
  1. OpenRouter — poolside/laguna-s-2.1:free       (118B, 256K ctx, coding specialist)
  2. OpenRouter — nvidia/nemotron-ultra-253b-v1:free (253B, 1M ctx, reasoning)
  3. HuggingFace — Qwen/Qwen2.5-7B-Instruct        (reliable structured JSON)
  4. HuggingFace — mistralai/Mistral-7B-Instruct-v0.2
  5. HuggingFace — microsoft/Phi-3.5-mini-instruct  (final safety net)

Every attempt is logged — which model was tried, whether it succeeded, and why
fallbacks were triggered.
"""

from __future__ import annotations

import asyncio
import json
import random
import re
from typing import Any, TypeVar

import httpx
import structlog
from pydantic import BaseModel, ValidationError

from app.ai.prompts import (
    INSIGHT_SYSTEM,
    LOG_SYSTEM,
    RUN_SYSTEM,
    insight_user_payload,
    log_user_payload,
    run_user_payload,
)
from app.ai.sanitize import sanitize_insight_bundle, sanitize_log_explanation, sanitize_run_diagnosis
from app.ai.schemas import InsightBundle, LogExplanation, RunDiagnosis
from app.config import Settings, get_settings

logger = structlog.get_logger(__name__)

T = TypeVar("T", bound=BaseModel)

# ---------------------------------------------------------------------------
# Provider endpoints
# ---------------------------------------------------------------------------
_OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions"
_HF_ROUTER_CHAT = "https://router.huggingface.co/v1/chat/completions"

# OpenRouter free-tier models (no credit card required, 50 req/day, 20 req/min)
# Model IDs verified against openrouter.ai/models — update here if OpenRouter changes slugs.
_OR_MODELS: tuple[str, ...] = (
    "poolside/laguna-s-2.1:free",              # 118B active params, 256K ctx, coding specialist
    "nvidia/nemotron-3-ultra-550b-a55b:free",  # 550B, 1M ctx, deep reasoning (correct OR slug)
    "nvidia/nemotron-3-super-120b-a12b:free",  # 120B fallback if ultra is unavailable
)

# HuggingFace fallback chain (runs when OpenRouter is rate-limited or unavailable)
_HF_MODELS: tuple[str, ...] = (
    "Qwen/Qwen2.5-7B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.2",
    "microsoft/Phi-3.5-mini-instruct",
)

_JSON_TAIL = (
    "\n\nOutput: a single valid JSON object only. No markdown, no code fences, no extra text."
)


# ---------------------------------------------------------------------------
# Shared JSON extraction helpers
# ---------------------------------------------------------------------------

def _sanitize_for_json(t: str) -> str:
    """Pre-sanitize model output before JSON parsing.

    Some models (e.g. poolside) embed literal control characters (\\x00-\\x1f)
    inside JSON string values, which json.loads rejects in strict mode.
    We replace them with their escaped equivalents so parsing can succeed.
    """
    # Replace literal newlines / carriage returns inside what looks like strings
    # Keep \\n and \\r as-is (they're already escaped); only fix bare control chars
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", t)


def _extract_json_object(text: str) -> dict:
    """Normalize model output to a single JSON object (strip fences / prose).

    Uses strict=False so that literal \\t and \\n inside string values (a quirk
    of several open-source models) don't cause spurious parse failures.
    """
    t = (text or "").strip()
    if not t:
        raise ValueError("empty model output")
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", t, re.IGNORECASE)
    if fence:
        t = fence.group(1).strip()
    t = re.sub(r"^[^{\[]*", "", t)
    t = _sanitize_for_json(t)
    try:
        data = json.loads(t, strict=False)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    start = t.find("{")
    end = t.rfind("}")
    if start >= 0 and end > start:
        chunk = t[start : end + 1]
        data = json.loads(chunk, strict=False)
        if isinstance(data, dict):
            return data
    raise ValueError("no valid json object found")



def _message_text(message: dict[str, Any]) -> str:
    raw = message.get("content")
    if raw is None:
        return ""
    if isinstance(raw, str):
        return raw
    if isinstance(raw, list):
        parts: list[str] = []
        for block in raw:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text", "")))
        return "".join(parts)
    return str(raw)


# ---------------------------------------------------------------------------
# OpenRouter provider
# ---------------------------------------------------------------------------

async def _openrouter_chat_complete(
    client: httpx.AsyncClient,
    api_key: str,
    model_id: str,
    system: str,
    user: str,
    max_tokens: int,
) -> str:
    """Call OpenRouter's OpenAI-compatible chat completions endpoint."""
    payload: dict[str, Any] = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": system + _JSON_TAIL},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://shipstack.app",
        "X-Title": "ShipStack Repository Analyzer",
    }
    r = await client.post(_OPENROUTER_CHAT, json=payload, headers=headers)
    if r.status_code >= 400:
        try:
            err_body = r.json()
            msg = err_body.get("error") if isinstance(err_body, dict) else r.text
            if isinstance(msg, dict):
                msg = msg.get("message") or msg.get("type") or str(msg)
        except Exception:
            msg = r.text[:500]
        raise httpx.HTTPStatusError(
            f"OpenRouter HTTP {r.status_code}: {msg}",
            request=r.request,
            response=r,
        )
    body = r.json()
    if isinstance(body, dict) and body.get("error"):
        err = body["error"]
        raise RuntimeError(str(err) if not isinstance(err, dict) else err.get("message", str(err)))
    choices = body.get("choices") if isinstance(body, dict) else None
    if not isinstance(choices, list) or not choices:
        raise ValueError(f"no choices in OpenRouter response. Body keys: {list(body.keys()) if isinstance(body, dict) else type(body)}")
    choice = choices[0]
    if not isinstance(choice, dict):
        raise ValueError(f"unexpected choice type from OpenRouter: {type(choice)}")
    # Some free-tier models return finish_reason='content_filter' or 'length' with empty content
    finish_reason = choice.get("finish_reason") or ""
    msg_obj = choice.get("message")
    if not isinstance(msg_obj, dict):
        raise ValueError(f"invalid choice message from OpenRouter (finish_reason={finish_reason!r})")
    text = _message_text(msg_obj).strip()
    if not text:
        # Log native_finish_reason and finish_reason so we know why content is empty
        native = choice.get("native_finish_reason") or finish_reason
        raise ValueError(
            f"empty model content from OpenRouter (finish_reason={finish_reason!r}, native={native!r}). "
            "This usually means the free-tier model was rate-limited or applied a content filter."
        )
    return text


# ---------------------------------------------------------------------------
# HuggingFace provider (preserved exactly as before)
# ---------------------------------------------------------------------------

def _hf_router_model_candidates(model_id: str) -> list[str]:
    if ":" in model_id:
        return [model_id]
    return [
        f"{model_id}:fastest",
        model_id,
        f"{model_id}:hf-inference",
    ]


async def _hf_chat_complete(
    client: httpx.AsyncClient,
    api_key: str,
    model_id: str,
    system: str,
    user: str,
    max_tokens: int,
) -> str:
    base_payload: dict[str, Any] = {
        "messages": [
            {"role": "system", "content": system + _JSON_TAIL},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    candidates = _hf_router_model_candidates(model_id)
    last_status: httpx.HTTPStatusError | None = None
    for idx, routed_model in enumerate(candidates):
        payload = {**base_payload, "model": routed_model}
        r = await client.post(_HF_ROUTER_CHAT, json=payload, headers=headers)
        if r.status_code >= 400:
            try:
                err_body = r.json()
                msg = err_body.get("error") if isinstance(err_body, dict) else r.text
                if isinstance(msg, dict):
                    msg = msg.get("message") or msg.get("type") or str(msg)
                if isinstance(msg, list) and msg:
                    msg = msg[0]
            except Exception:
                msg = r.text[:2000]
            last_status = httpx.HTTPStatusError(
                f"HF router HTTP {r.status_code}: {msg}",
                request=r.request,
                response=r,
            )
            if r.status_code in (401, 403):
                raise last_status
            if r.status_code == 400 and idx < len(candidates) - 1:
                logger.info("hf_router_try_next_variant", base=model_id, tried=routed_model)
                continue
            raise last_status
        body = r.json()
        if isinstance(body, dict) and body.get("error"):
            err = body["error"]
            raise RuntimeError(str(err) if not isinstance(err, dict) else err.get("message", err))
        choices = body.get("choices") if isinstance(body, dict) else None
        if not isinstance(choices, list) or not choices:
            raise ValueError("no choices in HF router response")
        msg_obj = choices[0].get("message") if isinstance(choices[0], dict) else None
        if not isinstance(msg_obj, dict):
            raise ValueError("invalid choice message from HF")
        text = _message_text(msg_obj).strip()
        if not text:
            raise ValueError("empty model content from HF")
        return text
    if last_status:
        raise last_status
    raise RuntimeError("no HF router model variant succeeded")


# ---------------------------------------------------------------------------
# Main AIClient
# ---------------------------------------------------------------------------

class AIClient:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    def _or_key(self) -> str | None:
        key = (self.settings.openrouter_api_key or "").strip()
        return key if key else None

    def _hf_key(self) -> str | None:
        key = (self.settings.huggingface_api_key or "").strip()
        return key if key else None

    def _max_tokens_or(self) -> int:
        """OpenRouter frontier models support higher output budgets."""
        return 8192  # poolside and nemotron support this; avoids finish_reason='length'

    def _max_tokens_hf(self) -> int:
        """HuggingFace router is more conservative on output tokens."""
        return max(64, min(int(self.settings.ai_max_output_tokens), 4096))

    # ------------------------------------------------------------------
    # Try a single OpenRouter model with retries on 429/5xx
    # ------------------------------------------------------------------
    async def _openrouter_with_retries(
        self, model_id: str, system: str, user: str
    ) -> str:
        or_key = self._or_key()
        if not or_key:
            raise RuntimeError("OpenRouter not configured (OPENROUTER_API_KEY missing)")

        timeout = httpx.Timeout(self.settings.ai_request_timeout_s)
        attempts = max(1, self.settings.ai_max_retries)
        delay = 1.0
        last_err: Exception | None = None

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(attempts):
                try:
                    result = await _openrouter_chat_complete(
                        client, or_key, model_id, system, user, self._max_tokens_or()
                    )
                    logger.info(
                        "openrouter_model_succeeded",
                        model=model_id,
                        attempt=attempt,
                    )
                    return result
                except httpx.TimeoutException as e:
                    last_err = e
                    logger.warning("openrouter_timeout", model=model_id, attempt=attempt, err=str(e))
                except httpx.HTTPStatusError as e:
                    last_err = e
                    code = e.response.status_code
                    if code == 429:
                        ra = e.response.headers.get("Retry-After")
                        try:
                            wait_s = float(ra) if ra else delay
                        except ValueError:
                            wait_s = delay
                        logger.warning(
                            "openrouter_rate_limited",
                            model=model_id,
                            attempt=attempt,
                            wait_s=wait_s,
                        )
                        await asyncio.sleep(wait_s + random.random())
                        delay = min(delay * 2, 30.0)
                        continue
                    if code in (503, 502, 504):
                        logger.warning("openrouter_server_error", model=model_id, code=code, attempt=attempt)
                        await asyncio.sleep(delay + random.random())
                        delay = min(delay * 2, 30.0)
                        continue
                    logger.warning("openrouter_http_error", model=model_id, code=code, err=str(e))
                    raise
                except RuntimeError as e:
                    last_err = e
                    msg = str(e).lower()
                    if "rate" in msg or "503" in msg or "loading" in msg or "unavailable" in msg:
                        await asyncio.sleep(delay + random.random())
                        delay = min(delay * 2, 30.0)
                        continue
                    raise
                await asyncio.sleep(delay + random.random())
                delay = min(delay * 2, 30.0)

        raise last_err or RuntimeError(f"OpenRouter exhausted retries for {model_id}")

    # ------------------------------------------------------------------
    # Try a single HuggingFace model with retries on 429/5xx
    # ------------------------------------------------------------------
    async def _hf_with_retries(self, model_id: str, system: str, user: str) -> str:
        hf_key = self._hf_key()
        if not hf_key:
            raise RuntimeError("HuggingFace not configured (HUGGINGFACE_API_KEY missing)")

        timeout = httpx.Timeout(self.settings.ai_request_timeout_s)
        attempts = max(1, self.settings.ai_max_retries)
        delay = 1.0
        last_err: Exception | None = None

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(attempts):
                try:
                    result = await _hf_chat_complete(
                        client, hf_key, model_id, system, user, self._max_tokens_hf()
                    )
                    logger.info(
                        "hf_model_succeeded",
                        model=model_id,
                        attempt=attempt,
                    )
                    return result
                except httpx.TimeoutException as e:
                    last_err = e
                    logger.warning("hf_timeout", model=model_id, attempt=attempt, err=str(e))
                except httpx.HTTPStatusError as e:
                    last_err = e
                    code = e.response.status_code
                    if code == 429:
                        ra = e.response.headers.get("Retry-After")
                        try:
                            wait_s = float(ra) if ra else delay
                        except ValueError:
                            wait_s = delay
                        await asyncio.sleep(wait_s + random.random())
                        delay = min(delay * 2, 60.0)
                        continue
                    if code in (503, 502, 504):
                        await asyncio.sleep(delay + random.random())
                        delay = min(delay * 2, 60.0)
                        continue
                    raise
                except RuntimeError as e:
                    last_err = e
                    msg = str(e).lower()
                    if "rate" in msg or "503" in msg or "loading" in msg or "unavailable" in msg:
                        await asyncio.sleep(delay + random.random())
                        delay = min(delay * 2, 60.0)
                        continue
                    raise
                await asyncio.sleep(delay + random.random())
                delay = min(delay * 2, 60.0)

        raise last_err or RuntimeError(f"HuggingFace exhausted retries for {model_id}")

    # ------------------------------------------------------------------
    # Master fallback chain: OR models → HF models
    # ------------------------------------------------------------------
    async def _complete_with_full_chain(self, system: str, user: str) -> tuple[str, str]:
        """Try every model in order. Returns (raw_text, winning_model_id).

        Chain order:
          1. poolside/laguna-s-2.1:free         (OpenRouter)
          2. nvidia/nemotron-ultra-253b-v1:free  (OpenRouter)
          3. Qwen/Qwen2.5-7B-Instruct            (HuggingFace)
          4. mistralai/Mistral-7B-Instruct-v0.2  (HuggingFace)
          5. microsoft/Phi-3.5-mini-instruct     (HuggingFace)
        """
        errors: list[str] = []

        # --- Tier 1: OpenRouter free models ---
        or_key = self._or_key()
        if or_key:
            for model_id in _OR_MODELS:
                try:
                    logger.info("ai_trying_model", provider="openrouter", model=model_id)
                    text = await self._openrouter_with_retries(model_id, system, user)
                    return text, model_id
                except Exception as e:
                    logger.warning(
                        "ai_model_failed",
                        provider="openrouter",
                        model=model_id,
                        err=str(e),
                    )
                    errors.append(f"[OpenRouter/{model_id}] {e}")
        else:
            logger.info("ai_openrouter_skipped", reason="OPENROUTER_API_KEY not set")

        # --- Tier 2: HuggingFace fallback chain ---
        hf_key = self._hf_key()
        if hf_key:
            for model_id in _HF_MODELS:
                try:
                    logger.info("ai_trying_model", provider="huggingface", model=model_id)
                    text = await self._hf_with_retries(model_id, system, user)
                    return text, model_id
                except Exception as e:
                    logger.warning(
                        "ai_model_failed",
                        provider="huggingface",
                        model=model_id,
                        err=str(e),
                    )
                    errors.append(f"[HuggingFace/{model_id}] {e}")
        else:
            logger.info("ai_huggingface_skipped", reason="HUGGINGFACE_API_KEY not set")

        raise RuntimeError(
            "All AI models failed. Tried:\n" + "\n".join(errors)
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    async def complete_json_model(
        self,
        system: str,
        user: str,
        model_type: type[T],
    ) -> tuple[T, str]:
        """Run the full chain, parse JSON, validate with Pydantic.

        Returns (validated_model, winning_model_id).
        """
        raw, winning_model = await self._complete_with_full_chain(system, user)
        data = _extract_json_object(raw)
        return model_type.model_validate(data), winning_model

    async def generate_insights(
        self, repo_full_name: str, branch: str, analyzer_json: str
    ) -> InsightBundle:
        user = insight_user_payload(repo_full_name, branch, analyzer_json)
        last_err: Exception | None = None

        # We run the full chain but re-attempt per-model on JSON/validation errors
        or_key = self._or_key()
        hf_key = self._hf_key()

        all_models: list[tuple[str, str]] = []  # (provider, model_id)
        if or_key:
            all_models += [("openrouter", m) for m in _OR_MODELS]
        if hf_key:
            all_models += [("huggingface", m) for m in _HF_MODELS]

        for provider, model_id in all_models:
            try:
                logger.info("insight_trying_model", provider=provider, model=model_id)
                if provider == "openrouter":
                    raw = await self._openrouter_with_retries(model_id, INSIGHT_SYSTEM, user)
                else:
                    raw = await self._hf_with_retries(model_id, INSIGHT_SYSTEM, user)
                data = _extract_json_object(raw)
                bundle = InsightBundle.model_validate(data)
                result = sanitize_insight_bundle(bundle)
                logger.info(
                    "insight_generation_succeeded",
                    provider=provider,
                    model=model_id,
                    insights_count=len(result.insights),
                    fixes_count=len(result.fix_suggestions),
                )
                return result
            except (ValidationError, ValueError, json.JSONDecodeError) as e:
                last_err = e
                logger.warning(
                    "insight_json_invalid",
                    provider=provider,
                    model=model_id,
                    err=str(e),
                )
            except Exception as e:
                last_err = e
                logger.warning(
                    "insight_model_failed",
                    provider=provider,
                    model=model_id,
                    err=str(e),
                )

        raise RuntimeError(f"All models failed for insight generation: {last_err}")

    async def explain_logs(self, repo_full_name: str, logs: str) -> LogExplanation:
        user = log_user_payload(repo_full_name, logs)
        last_err: Exception | None = None

        or_key = self._or_key()
        hf_key = self._hf_key()

        all_models: list[tuple[str, str]] = []
        if or_key:
            all_models += [("openrouter", m) for m in _OR_MODELS]
        if hf_key:
            all_models += [("huggingface", m) for m in _HF_MODELS]

        for provider, model_id in all_models:
            try:
                logger.info("log_explain_trying_model", provider=provider, model=model_id)
                if provider == "openrouter":
                    raw = await self._openrouter_with_retries(model_id, LOG_SYSTEM, user)
                else:
                    raw = await self._hf_with_retries(model_id, LOG_SYSTEM, user)
                data = _extract_json_object(raw)
                obj = LogExplanation.model_validate(data)
                result = sanitize_log_explanation(obj)
                logger.info(
                    "log_explain_succeeded",
                    provider=provider,
                    model=model_id,
                    confidence=result.confidence,
                )
                return result
            except (ValidationError, ValueError, json.JSONDecodeError) as e:
                last_err = e
                logger.warning(
                    "log_explain_json_invalid",
                    provider=provider,
                    model=model_id,
                    err=str(e),
                )
            except Exception as e:
                last_err = e
                logger.warning(
                    "log_explain_model_failed",
                    provider=provider,
                    model=model_id,
                    err=str(e),
                )

        raise RuntimeError(f"All models failed for log explanation: {last_err}")

    async def explain_run(self, repo_full_name: str, run_data_json: str) -> RunDiagnosis:
        """Produce a correlated diagnosis for a completed GitHub Actions run."""
        user = run_user_payload(repo_full_name, run_data_json)
        last_err: Exception | None = None

        or_key = self._or_key()
        hf_key = self._hf_key()

        all_models: list[tuple[str, str]] = []
        if or_key:
            all_models += [("openrouter", m) for m in _OR_MODELS]
        if hf_key:
            all_models += [("huggingface", m) for m in _HF_MODELS]

        for provider, model_id in all_models:
            try:
                logger.info("run_explain_trying_model", provider=provider, model=model_id)
                if provider == "openrouter":
                    raw = await self._openrouter_with_retries(model_id, RUN_SYSTEM, user)
                else:
                    raw = await self._hf_with_retries(model_id, RUN_SYSTEM, user)
                data = _extract_json_object(raw)
                obj = RunDiagnosis.model_validate(data)
                result = sanitize_run_diagnosis(obj)
                logger.info(
                    "run_explain_succeeded",
                    provider=provider,
                    model=model_id,
                    confidence=result.confidence,
                )
                return result
            except (ValidationError, ValueError, json.JSONDecodeError) as e:
                last_err = e
                logger.warning(
                    "run_explain_json_invalid",
                    provider=provider,
                    model=model_id,
                    err=str(e),
                )
            except Exception as e:
                last_err = e
                logger.warning(
                    "run_explain_model_failed",
                    provider=provider,
                    model=model_id,
                    err=str(e),
                )

        raise RuntimeError(f"All models failed for run diagnosis: {last_err}")
