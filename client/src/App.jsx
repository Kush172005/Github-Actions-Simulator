import { motion } from "framer-motion";
import {
  HeroScene,
  PipelineScene,
  ParallelScene,
  MetricsSceneSection,
  CtaScene,
} from "./components/cinematic/Scenes.jsx";

function NavBar() {
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
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #34d399, #22d3ee)", boxShadow: "0 0 12px rgba(52,211,153,0.4)" }}
          >
            <svg className="w-4 h-4 text-zinc-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-zinc-100 tracking-tight">ShipStack</span>
        </a>

        {/* Nav links */}
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

        {/* CTA */}
        <motion.a
          href="#"
          className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold text-zinc-950"
          style={{
            background: "linear-gradient(135deg, #34d399, #22d3ee)",
            padding: "7px 16px",
            boxShadow: "0 0 16px rgba(52,211,153,0.3)",
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
        >
          Get started
        </motion.a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      className="border-t py-8 text-center font-mono text-xs text-zinc-700"
      style={{ borderColor: "rgba(255,255,255,0.04)", background: "#09090b" }}
    >
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <div
          className="w-4 h-4 rounded flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #34d399, #22d3ee)" }}
        >
          <svg className="w-2.5 h-2.5 text-zinc-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-zinc-600">ShipStack</span>
      </div>
      <p>Distributed execution engine · Real-time CI/CD · Zero ceremony</p>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 overflow-x-hidden">
      <NavBar />

      <main>
        {/* Scene 1: Hero — push code, watch it deploy */}
        <HeroScene />

        {/* Scene 2: Scroll-driven pipeline */}
        <PipelineScene />

        {/* Scene 3: Parallel builds */}
        <ParallelScene />

        {/* Scene 4: Live metrics */}
        <MetricsSceneSection />

        {/* Scene 5: Final CTA */}
        <CtaScene />
      </main>

      <Footer />
    </div>
  );
}
