export function AnalyzeSkeleton() {
  return (
    <div className="space-y-6 min-h-[420px]">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="repo-skeleton h-40 w-40 shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="repo-skeleton h-6 w-48 rounded-lg" />
          <div className="repo-skeleton h-4 w-full max-w-md rounded-lg" />
          <div className="repo-skeleton h-4 w-2/3 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="repo-skeleton h-28 rounded-xl" />
        ))}
      </div>
      <div className="repo-skeleton h-40 rounded-xl" />
    </div>
  );
}
