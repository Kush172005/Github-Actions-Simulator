import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchGithubRepos } from "../lib/api.js";
import { DashboardLayout } from "../components/dashboard/DashboardLayout.jsx";
import { RepoCard } from "../components/dashboard/RepoCard.jsx";
import { ActivityPanel } from "../components/dashboard/ActivityPanel.jsx";
import { RepoPreviewModal } from "../components/dashboard/RepoPreviewModal.jsx";

const ghClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
const redirectUri =
  import.meta.env.VITE_GITHUB_REDIRECT_URI ||
  `${window.location.origin}/auth/callback/github`;

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const ITEMS_PER_PAGE = 6;
  
  /** Avoid skeleton flash on refetch — only show shimmer when we have no rows yet. */
  const hadReposRef = useRef(false);
  const prevUserIdRef = useRef(undefined);

  // Reset pagination on search or tab switch
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const filteredRepos = repos.filter((repo) => {
    const matchesSearch =
      (repo.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "public") return matchesSearch && !repo.private;
    if (activeTab === "private") return matchesSearch && repo.private;
    return matchesSearch;
  });

  const totalCount = repos.length;
  const publicCount = repos.filter(r => !r.private).length;
  const privateCount = repos.filter(r => r.private).length;

  // Pagination parameters
  const totalPages = Math.ceil(filteredRepos.length / ITEMS_PER_PAGE) || 1;
  const paginatedRepos = filteredRepos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const loadRepos = useCallback(async () => {
    if (!user?.github_connected) {
      setRepos([]);
      hadReposRef.current = false;
      setReposLoading(false);
      return;
    }

    // Check session storage cache first
    const cached = sessionStorage.getItem("github_repos_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRepos(parsed);
          hadReposRef.current = true;
          setReposLoading(false);
          return;
        }
      } catch (e) {
        // ignore malformed cache
      }
    }

    setReposLoading(true);
    setReposError(null);
    try {
      const list = await fetchGithubRepos();
      const arr = Array.isArray(list) ? list : [];
      setRepos(arr);
      hadReposRef.current = arr.length > 0;
      sessionStorage.setItem("github_repos_cache", JSON.stringify(arr));
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
      sessionStorage.setItem("github_repos_cache", JSON.stringify(arr));
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
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.04] pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">
                    Repositories
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Pulled live from GitHub · sorted by last push
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[180px] sm:min-w-[240px]">
                    <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 pointer-events-none">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-black/40 pl-9 pr-4 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-emerald-500/35 focus:ring-1 focus:ring-emerald-500/20"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>
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

              {/* Filtering Tabs */}
              {!reposLoading && repos.length > 0 && (
                <div className="mb-4 flex border-b border-white/[0.04] p-0.5">
                  {[
                    { id: "all", label: "All", count: totalCount },
                    { id: "public", label: "Public", count: publicCount },
                    { id: "private", label: "Private", count: privateCount },
                  ].map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                          active
                            ? "border-emerald-400 text-white"
                            : "border-transparent text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {tab.label}
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          active ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

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

              {!reposLoading && !reposError && repos.length > 0 && filteredRepos.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center bg-zinc-900/10">
                  <p className="text-sm text-zinc-400">No repositories match your search query.</p>
                  <button
                    onClick={() => { setSearchQuery(""); setActiveTab("all"); }}
                    className="mt-3 text-xs text-emerald-400 underline hover:text-emerald-300"
                  >
                    Clear search and filters
                  </button>
                </div>
              )}

              {!reposLoading && filteredRepos.length > 0 && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {paginatedRepos.map((repo, i) => (
                      <RepoCard
                        key={repo.id}
                        repo={repo}
                        index={i}
                        onOpenDetails={setSelectedRepo}
                      />
                    ))}
                  </div>

                  {/* Pagination Panel */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-white/[0.04] pt-4">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition disabled:opacity-40 disabled:hover:text-zinc-400"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-zinc-500 font-mono">
                        Page <span className="text-zinc-200 font-bold">{currentPage}</span> of{" "}
                        <span className="text-zinc-200 font-bold">{totalPages}</span>
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition disabled:opacity-40 disabled:hover:text-zinc-400"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="lg:col-span-4 lg:sticky lg:top-6 lg:self-start">
          <ActivityPanel active />
        </div>
      </div>

      {/* Repo Preview Modal Overlay */}
      <AnimatePresence>
        {selectedRepo && (
          <RepoPreviewModal
            repo={selectedRepo}
            onClose={() => setSelectedRepo(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
