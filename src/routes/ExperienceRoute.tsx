import { useCallback, useState } from 'react';
import SceneRoot from '../world/SceneRoot';
import ControlDock from '../world/ControlDock';
import SceneFallback, { type SceneFallbackReason } from '../world/SceneFallback';
import { supportsWebGL2 } from '../world/capabilities';

// The 3D experience entry (PLAN.md §4 Phase 2). Lazy-imported from App.tsx
// so the three.js/@react-three/fiber bundle never loads on /resume.
export default function ExperienceRoute() {
  // Whether the scene can run at all (Phase 8, PLAN.md §4). This lives at
  // the route level rather than inside SceneRoot because the answer decides
  // whether the dock and skip link render *too*: with no scene behind it,
  // the dock's buttons would focus panels that don't exist, leaving a
  // control bar that looks live and does nothing.
  //
  // The lazy initialiser keeps the WebGL probe to a single call for the
  // component's lifetime (capabilities.ts caches it besides).
  const [status, setStatus] = useState<SceneFallbackReason | 'ok'>(() =>
    supportsWebGL2() ? 'ok' : 'unsupported',
  );
  const handleContextLost = useCallback(() => setStatus('context-lost'), []);

  if (status !== 'ok') return <SceneFallback reason={status} />;

  return (
    <main className="experience">
      <SceneRoot onContextLost={handleContextLost} />
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
