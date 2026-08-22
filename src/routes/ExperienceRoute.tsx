import SceneRoot from '../world/SceneRoot';
import ControlDock from '../world/ControlDock';

// The 3D experience entry (PLAN.md §4 Phase 2). Lazy-imported from App.tsx
// so the three.js/@react-three/fiber bundle never loads on /resume. The
// scene itself lives in src/world/SceneRoot.
export default function ExperienceRoute() {
  return (
    <main className="experience">
      <SceneRoot />
      {/* Quest-Home-style dock, fixed to the viewport outside the Canvas
          — see ControlDock.tsx for why it isn't a world-anchored panel. */}
      <ControlDock />
      {/* The escape hatch (PLAN.md §1) needs to be reachable from the 3D
          entry itself, not just known to exist — a recruiter shouldn't have
          to guess the /resume URL. Plain anchor, no 3D/JS dependency. */}
      <a className="experience__skip" href="/resume">
        Skip to résumé &rarr;
      </a>
    </main>
  );
}
