"""Hugging Face Inference Providers (router) client — OpenAI-compatible chat completions."""

from __future__ import annotations

import asyncio
import json
import random
import re
from typing import Any, TypeVar

import httpx
import structlog
from pydantic import BaseModel, ValidationError

from app.ai.prompts import INSIGHT_SYSTEM, LOG_SYSTEM, insight_user_payload, log_user_payload
from app.ai.sanitize import sanitize_insight_bundle, sanitize_log_explanation
from app.ai.schemas import InsightBundle, LogExplanation
from app.config import Settings, get_settings

logger = structlog.get_logger(__name__)

T = TypeVar("T", bound=BaseModel)

# Legacy `https://api-inference.huggingface.co/models/...` is decommissioned (404).
# Use the router: https://huggingface.co/docs/inference-providers/index
_HF_ROUTER_CHAT = "https://router.huggingface.co/v1/chat/completions"

_JSON_TAIL = (
    "\n\nOutput: a single valid JSON object only. No markdown, no code fences, no extra text."
)

# Models with broad Inference Providers coverage (avoid hub IDs that require niche / disabled providers).
# If all fail, enable more providers at https://huggingface.co/settings/inference-providers
HF_MODEL_CHAIN: tuple[str, ...] = (
    "Qwen/Qwen2.5-7B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.2",
    "microsoft/Phi-3.5-mini-instruct",
)


def _extract_json_object(text: str) -> dict:
    """Normalize model output to a single JSON object (strip fences / prose)."""
    t = (text or "").strip()
    if not t:
        raise ValueError("empty model output")
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", t, re.IGNORECASE)
    if fence:
        t = fence.group(1).strip()
    t = re.sub(r"^[^{\[]*", "", t)
    try:
        data = json.loads(t)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    start = t.find("{")
    end = t.rfind("}")
    if start >= 0 and end > start:
        chunk = t[start : end + 1]
        data = json.loads(chunk)
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


class AIClient:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    def _api_key(self) -> str:
        key = (self.settings.huggingface_api_key or "").strip()
        if not key:
            raise RuntimeError("Hugging Face is not configured")
        return key

    def _chain(self) -> tuple[str, ...]:
        return HF_MODEL_CHAIN

    def _router_model_candidates(self, model_id: str) -> list[str]:
        """Try routing policies in order; many400s are 'no provider' until one matches your HF settings."""
        if ":" in model_id:
            return [model_id]
        return [
            f"{model_id}:fastest",
            model_id,
            f"{model_id}:hf-inference",
        ]

    async def _hf_chat_complete(
        self,
        client: httpx.AsyncClient,
        model_id: str,
        system: str,
        user: str,
    ) -> str:
        max_tokens = max(64, min(int(self.settings.ai_max_output_tokens), 4096))
        base_payload: dict[str, Any] = {
            "messages": [
                {"role": "system", "content": system + _JSON_TAIL},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.2,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key()}",
            "Content-Type": "application/json",
        }
        candidates = self._router_model_candidates(model_id)
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
                raise ValueError("no choices in router response")
            msg = choices[0].get("message") if isinstance(choices[0], dict) else None
            if not isinstance(msg, dict):
                raise ValueError("invalid choice message")
            text = _message_text(msg).strip()
            if not text:
                raise ValueError("empty model content")
            return text
        if last_status:
            raise last_status
        raise RuntimeError("no router model variant succeeded")

    async def _with_retries(self, model_id: str, system: str, user: str) -> str:
        timeout = httpx.Timeout(self.settings.ai_request_timeout_s)
        attempts = max(1, self.settings.ai_max_retries)
        delay = 1.0
        last_err: Exception | None = None

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(attempts):
                try:
                    return await self._hf_chat_complete(client, model_id, system, user)
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
                continue

        raise last_err or RuntimeError("HF retry exhausted")

    async def complete_json_model(
        self,
        model_id: str,
        system: str,
        user: str,
        model_type: type[T],
    ) -> T:
        raw = await self._with_retries(model_id, system, user)
        data = _extract_json_object(raw)
        return model_type.model_validate(data)

    async def generate_insights(self, repo_full_name: str, branch: str, analyzer_json: str) -> InsightBundle:
        user = insight_user_payload(repo_full_name, branch, analyzer_json)
        last_err: Exception | None = None
        for model_id in self._chain():
            try:
                bundle = await self.complete_json_model(
                    model_id, INSIGHT_SYSTEM, user, InsightBundle
                )
                return sanitize_insight_bundle(bundle)
            except (ValidationError, ValueError, json.JSONDecodeError) as e:
                last_err = e
                logger.warning("insight_json_invalid", model=model_id, err=str(e))
            except Exception as e:
                last_err = e
                logger.warning("insight_model_failed", model=model_id, err=str(e))
        raise RuntimeError(f"All Hugging Face models failed for insights: {last_err}")

    async def explain_logs(self, repo_full_name: str, logs: str) -> LogExplanation:
        user = log_user_payload(repo_full_name, logs)
        last_err: Exception | None = None
        for model_id in self._chain():
            try:
                obj = await self.complete_json_model(
                    model_id, LOG_SYSTEM, user, LogExplanation
                )
                return sanitize_log_explanation(obj)
            except (ValidationError, ValueError, json.JSONDecodeError) as e:
                last_err = e
                logger.warning("log_json_invalid", model=model_id, err=str(e))
            except Exception as e:
                last_err = e
                logger.warning("log_model_failed", model=model_id, err=str(e))
        raise RuntimeError(f"All Hugging Face models failed for log explanation: {last_err}")
