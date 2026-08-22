import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function DashboardLayout({ user, children, onLogout, onConnectGitHub }) {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 right-0 h-[420px] w-[420px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle at center, rgba(52,211,153,0.2), transparent 70%)",
            filter: "blur(32px)",
          }}
        />
        <div className="absolute inset-0 bg-dot-grid opacity-25" />
      </div>

      <header className="relative z-20 border-b border-white/[0.05] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900/70 ring-1 ring-emerald-400/20 shadow-lg shadow-emerald-500/15"
            >
              <img
                src="/vite.svg"
                alt="ShipStack logo"
                className="h-6 w-6 object-contain drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]"
              />
            </div>
            <span className="text-sm font-bold tracking-tight text-zinc-100">
              ShipStack
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/analyze"
              className="hidden rounded-lg border border-white/[0.08] bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 no-underline transition hover:border-emerald-500/30 sm:inline-flex"
            >
              Analyze
            </Link>
            <Link
              to="/dashboard/runs"
              className="hidden rounded-lg border border-white/[0.08] bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 no-underline transition hover:border-emerald-500/30 sm:inline-flex"
            >
              Actions
            </Link>
            {!user?.github_connected && (
              <button
                type="button"
                onClick={onConnectGitHub}
                className="hidden rounded-lg border border-white/[0.08] bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 shadow-sm transition hover:border-emerald-500/30 hover:bg-zinc-800 sm:inline-flex"
              >
                Connect GitHub
              </button>
            )}
            <div className="flex items-center gap-2.5 rounded-full border border-white/[0.06] bg-zinc-900/50 py-1 pl-1 pr-3">
              <img
                src={
                  user?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "?")}&background=27272a&color=a1a1aa`
                }
                alt=""
                className="h-8 w-8 rounded-full ring-1 ring-white/10"
              />
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium text-zinc-200">{user?.name}</p>
                <p className="max-w-[140px] truncate text-[10px] text-zinc-500">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-300"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6"
      >
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-600">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {greet}, {user?.name?.split(" ")[0] || "operator"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Repositories and live execution signals — wired to your GitHub account.
          </p>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
