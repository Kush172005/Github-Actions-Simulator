import { useState } from "react";
import { motion } from "framer-motion";
import { RunRow } from "./RunRow.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "failure", label: "Failed" },
  { id: "success", label: "Success" },
  { id: "cancelled", label: "Cancelled" },
];

function matchesFilter(run, filter) {
  if (filter === "all") return true;
  if (filter === "failure") return run.conclusion === "failure" || run.conclusion === "timed_out";
  if (filter === "cancelled") return run.conclusion === "cancelled";
  return run.conclusion === filter;
}

export function RunList({
  runs,
  onSelect,
  hasMore = false,
  loadingMore = false,
  totalCount = 0,
  onLoadMore,
}) {
  const [activeFilter, setActiveFilter] = useState("all");

  const allRuns = runs || [];
  const filtered = allRuns.filter((r) => matchesFilter(r, activeFilter));

  return (
    <div>
      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const count =
              f.id === "all"
                ? allRuns.length
                : allRuns.filter((r) => matchesFilter(r, f.id)).length;
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/[0.08] bg-zinc-900/40 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-md px-1 py-px text-[10px] font-bold ${
                    active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {totalCount > 0 && (
          <p className="text-[11px] text-zinc-600">
            Showing{" "}
            <span className="font-mono text-zinc-400">{allRuns.length}</span>
            {totalCount > allRuns.length && (
              <>
                {" "}
                of <span className="font-mono text-zinc-400">{totalCount}</span>
              </>
            )}{" "}
            runs
          </p>
        )}
      </div>

      {/* Run rows */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-white/[0.05] bg-zinc-900/30 py-12 text-center"
        >
          <p className="text-sm text-zinc-500">
            No {activeFilter !== "all" ? activeFilter : ""} runs found
            {hasMore && activeFilter !== "all" ? " in loaded pages" : ""}.
          </p>
          {activeFilter !== "all" && (
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className="mt-3 text-xs text-emerald-400/80 hover:text-emerald-400"
            >
              Show all runs
            </button>
          )}
          {hasMore && activeFilter !== "all" && onLoadMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="mt-3 ml-3 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more runs"}
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filtered.map((run, i) => (
            <RunRow key={run.id} run={run} index={i} onSelect={onSelect} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore || !onLoadMore}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-zinc-900/50 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:border-emerald-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {loadingMore ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
                Loading…
              </>
            ) : (
              "Load more runs"
            )}
          </button>
          {totalCount > allRuns.length && (
            <p className="text-[10px] text-zinc-600">
              {totalCount - allRuns.length} more available
            </p>
          )}
        </div>
      )}
    </div>
  );
}
