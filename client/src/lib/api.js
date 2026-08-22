const BASE = import.meta.env.VITE_API_URL ?? "";

const TOKEN_KEY = "shipstack_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const bearer =
    options.bearer !== undefined
      ? options.bearer
      : options.skipAuth
        ? null
        : getStoredToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers, signal: options.signal });
  if (res.status === 401 && !options.skipAuth) {
    setStoredToken(null);
    const err = new Error("Session expired");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
      if (Array.isArray(detail)) detail = detail.map((d) => d.msg || d).join(", ");
    } catch {
      /* ignore */
    }
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return res.text();
}

export async function postGoogleCredential(credential) {
  return apiFetch("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
    skipAuth: true,
  });
}

/**
 * GitHub OAuth callback: if user already has a JWT (e.g. signed in with Google),
 * it is sent so the backend can link GitHub to that account.
 */
export async function postGitHubCode(code, redirectUri) {
  const bearer = getStoredToken();
  return apiFetch("/api/auth/github", {
    method: "POST",
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
    skipAuth: !bearer,
    bearer: bearer || undefined,
  });
}

export async function fetchMe() {
  return apiFetch("/api/user/me");
}

export async function fetchGithubRepos() {
  return apiFetch("/api/github/repos");
}

/**
 * @param {{ repo_url?: string, full_name?: string, ref?: string, ci_logs?: string }} body
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function postAnalyzeRepo(body, opts = {}) {
  return apiFetch("/api/analyze", {
    method: "POST",
    body: JSON.stringify(body),
    signal: opts.signal,
  });
}

/**
 * @param {string} owner
 * @param {string} repo
 * @param {{ signal?: AbortSignal, page?: number }} [opts]
 * @returns {Promise<{ runs: any[], page: number, per_page: number, total_count: number, has_more: boolean }>}
 */
export async function fetchActionRuns(owner, repo, opts = {}) {
  if (!owner || !repo || owner === "undefined" || repo === "undefined") {
    throw new Error("Invalid repository — provide owner/repo");
  }
  const page = Math.max(1, opts.page || 1);
  const qs = page > 1 ? `?page=${page}` : "";
  return apiFetch(
    `/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs${qs}`,
    { signal: opts.signal },
  );
}

/**
 * @param {{ full_name?: string, repo_url?: string, run_id: number }} body
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function postAnalyzeRun(body, opts = {}) {
  return apiFetch("/api/analyze/run", {
    method: "POST",
    body: JSON.stringify(body),
    signal: opts.signal,
  });
}
