import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  HeroScene,
  PipelineScene,
  ParallelScene,
  MetricsSceneSection,
  CtaScene,
} from "../components/cinematic/Scenes.jsx";
import { ShootingStars } from "../components/backgrounds/ShootingStars.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function NavBar() {
  const { isAuthenticated } = useAuth();
  return (
    <header
      className="fixed left-0 right-0 top-0 z-50"
      style={{
        background: "rgba(9,9,11,0.7)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 group no-underline">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #34d399, #22d3ee)",
              boxShadow: "0 0 12px rgba(52,211,153,0.4)",
            }}
          >
            <svg
              className="w-4 h-4 text-zinc-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm font-bold text-zinc-100 tracking-tight">
              ShipStack
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600 group-hover:text-zinc-500 transition-colors">
              by Kush
            </span>
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-xs font-medium text-zinc-500">
          {[
            ["Pipeline", "#pipeline"],
            ["Docs", "#"],
            ["Pricing", "#"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="transition-colors hover:text-zinc-200"
              style={{ textDecoration: "none" }}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className="hidden text-xs font-medium text-zinc-400 transition hover:text-zinc-200 sm:inline"
            >
              Dashboard
            </Link>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold text-zinc-950 no-underline"
              style={{
                background: "linear-gradient(135deg, #34d399, #22d3ee)",
                padding: "7px 16px",
                boxShadow: "0 0 16px rgba(52,211,153,0.3)",
              }}
            >
              {isAuthenticated ? "Open app" : "Get started"}
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      className="border-t"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "transparent" }}
    >
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between sm:gap-12">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #34d399, #22d3ee)" }}
              >
                <svg
                  className="w-4 h-4 text-zinc-900"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-zinc-200 tracking-tight">
                  ShipStack
                </p>
                <p className="text-[11px] text-zinc-600 font-medium tracking-wide">
                  An independent product
                </p>
              </div>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Pipelines you can trace end to end—webhooks, queues, workers, and logs in one honest thread. No borrowed
              roadmap slides; just systems that ship.
            </p>
          </div>

          <div className="sm:text-right space-y-4 shrink-0">
            <div className="space-y-1.5 text-xs text-zinc-500 leading-relaxed">
              <p className="text-zinc-400 font-medium text-[13px]">Ownership</p>
              <p>
                ShipStack is designed, built, and operated by{" "}
                <span className="text-zinc-300">Kush</span>.
              </p>
              <p className="text-zinc-600 text-[11px] pt-1">
                © {new Date().getFullYear()} Kush. All rights reserved.
              </p>
            </div>
            <p className="text-[11px] text-zinc-600 leading-snug max-w-xs sm:ml-auto">
              The ShipStack name, logo, and original materials on this site belong to Kush. For licensing or press,
              reach out through the same channels you would for product feedback—there is no separate “legal@” queue.
            </p>
          </div>
        </div>

        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] text-zinc-700 font-mono"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <span>ShipStack · distributed execution</span>
          <span className="text-zinc-600">Kush · all rights reserved</span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 overflow-x-hidden">
      <ShootingStars />

      <div className="relative z-10">
        <NavBar />

        <main>
          <HeroScene />
          <PipelineScene />
          <ParallelScene />
          <MetricsSceneSection />
          <CtaScene />
        </main>

        <Footer />
      </div>
    </div>
  );
}
