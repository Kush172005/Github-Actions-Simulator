import { SceneDeploy } from "./scenes/SceneDeploy.jsx";
import { ScenePipeline } from "./scenes/ScenePipeline.jsx";
import { SceneParallel } from "./scenes/SceneParallel.jsx";
import { SceneMetrics } from "./scenes/SceneMetrics.jsx";
import { SceneCta } from "./scenes/SceneCta.jsx";

/** One continuous scroll narrative — no dead “section” gaps; shared chrome + density. */
export function CinematicExperience() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(24,24,27,0.97)_0%,rgba(9,9,11,1)_40%,rgba(9,9,11,1)_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.35] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2327272a\' fill-opacity=\'0.35\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

      <div className="relative z-10">
        <SceneDeploy />
        <ScenePipeline />
        <SceneParallel />
        <SceneMetrics />
        <SceneCta />
      </div>
    </div>
  );
}
