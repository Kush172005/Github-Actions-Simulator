const GH_HOST = /^(https?:\/\/)?(www\.)?github\.com\//i;

/** @returns {{ ok: boolean, full_name?: string, error?: string }} */
export function parseRepoInput(raw) {
  const s = (raw || "").trim();
  if (!s) return { ok: false, error: "Enter a GitHub repository URL or owner/name" };

  if (!s.includes("/") && !GH_HOST.test(s)) {
    return { ok: false, error: "Use owner/repo or a full github.com URL" };
  }

  if (GH_HOST.test(s) || s.startsWith("git@")) {
    try {
      const u = s.startsWith("http") ? new URL(s) : new URL(`https://${s.replace(/^git@github\.com:/, "github.com/")}`);
      const host = u.hostname.replace(/^www\./, "");
      if (host !== "github.com") {
        return { ok: false, error: "Only github.com is supported" };
      }
      const parts = u.pathname.split("/").filter(Boolean);
      const cleaned = [];
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i];
        if (p === "blob" || p === "tree") {
          i += 2;
          continue;
        }
        cleaned.push(p);
      }
      if (cleaned.length < 2) {
        return { ok: false, error: "Could not parse owner and repo from URL" };
      }
      const owner = cleaned[0];
      const repo = cleaned[1].replace(/\.git$/, "");
      if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
        return { ok: false, error: "Invalid owner or repository name" };
      }
      return { ok: true, full_name: `${owner}/${repo}` };
    } catch {
      return { ok: false, error: "Invalid URL" };
    }
  }

  if (s.includes("/")) {
    const [owner, repo] = s.split("/", 2).map((x) => x.trim());
    if (!owner || !repo || repo.includes("/")) {
      return { ok: false, error: "Use exactly owner/repo" };
    }
    const r = repo.replace(/\.git$/, "");
    if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(r)) {
      return { ok: false, error: "Invalid owner or repository name" };
    }
    return { ok: true, full_name: `${owner}/${r}` };
  }

  return { ok: false, error: "Invalid input" };
}

export function cacheKey(fullName, ref) {
  return `shipstack_analyze_v1:${fullName}:${ref || ""}`;
}
