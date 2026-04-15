import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchGithubRepos } from "../lib/api.js";
import { DashboardLayout } from "../components/dashboard/DashboardLayout.jsx";
import { RepoCard } from "../components/dashboard/RepoCard.jsx";
import { ActivityPanel } from "../components/dashboard/ActivityPanel.jsx";

const ghClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
const redirectUri =
  import.meta.env.VITE_GITHUB_REDIRECT_URI ||
  `${window.location.origin}/auth/callback/github`;

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState(null);
  /** Avoid skeleton flash on refetch — only show shimmer when we have no rows yet. */
  const hadReposRef = useRef(false);
  const prevUserIdRef = useRef(undefined);

  const loadRepos = useCallback(async () => {
    if (!user?.github_connected) {
      setRepos([]);
      hadReposRef.current = false;
      setReposLoading(false);
      return;
    }
    const showSkeleton = !hadReposRef.current;
    if (showSkeleton) setReposLoading(true);
    setReposError(null);
    try {
      const list = await fetchGithubRepos();
      const arr = Array.isArray(list) ? list : [];
      setRepos(arr);
      hadReposRef.current = arr.length > 0;
    } catch (e) {
      setReposError(e.message || "Could not load repositories");
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  }, [user?.github_connected]);

  const refetchReposOnly = useCallback(async () => {
    if (!user?.github_connected) return;
    setReposLoading(true);
    setReposError(null);
    try {
      const list = await fetchGithubRepos();
      const arr = Array.isArray(list) ? list : [];
      setRepos(arr);
      hadReposRef.current = arr.length > 0;
    } catch (e) {
      setReposError(e.message || "Could not load repositories");
    } finally {
      setReposLoading(false);
    }
  }, [user?.github_connected]);

  useEffect(() => {
    if (loading || !user?.id) return;
    if (prevUserIdRef.current !== user.id) {
      prevUserIdRef.current = user.id;
      hadReposRef.current = false;
      setRepos([]);
    }
    loadRepos();
    // Primitives only — `user` object identity changes often and was retriggering fetch + skeleton flicker.
  }, [loading, user?.id, user?.github_connected, loadRepos]);

  const connectGitHub = useCallback(() => {
    if (!ghClientId) return;
    const params = new URLSearchParams({
      client_id: ghClientId,
      redirect_uri: redirectUri,
      scope: "repo read:user user:email",
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-zinc-400">
        <span className="h-8 w-8 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={logout}
      onConnectGitHub={connectGitHub}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          {!user.github_connected ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-8 text-center"
            >
              <p className="text-sm font-semibold text-amber-200/90">
                Connect GitHub to load your repositories
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                OAuth opens GitHub — we only store tokens server-side and use them to
                call the GitHub API on your behalf.
              </p>
              <button
                type="button"
                onClick={connectGitHub}
                disabled={!ghClientId}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-zinc-100 to-zinc-200 px-6 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg transition hover:opacity-95 disabled:opacity-40"
              >
                {ghClientId ? "Connect GitHub" : "Configure VITE_GITHUB_CLIENT_ID"}
              </button>
            </motion.div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">
                    Repositories
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Pulled live from GitHub · sorted by last push
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/dashboard/analyze"
                    className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 no-underline transition hover:border-emerald-400/40"
                  >
                    Analyze repo
                  </Link>
                  <button
                    type="button"
                    onClick={() => refetchReposOnly()}
                    className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:border-emerald-500/25 hover:text-zinc-200"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {reposLoading && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="repo-skeleton h-28 rounded-xl"
                    />
                  ))}
                </div>
              )}

              {!reposLoading && reposError && (
                <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {reposError}
                </p>
              )}

              {!reposLoading && !reposError && repos.length === 0 && (
                <p className="text-sm text-zinc-500">No repositories found.</p>
              )}

              {!reposLoading && repos.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {repos.map((repo, i) => (
                    <RepoCard key={repo.id} repo={repo} index={i} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="lg:col-span-4 lg:sticky lg:top-6 lg:self-start">
          <ActivityPanel active />
        </div>
      </div>
    </DashboardLayout>
  );
}
