import './SceneFallback.css';

export type SceneFallbackReason = 'unsupported' | 'context-lost';

// Shown in place of the whole 3D route when the scene can't run. Two ways
// that happens, both from Phase 8's compatibility pass (PLAN.md §4):
//
//   - 'unsupported' — no WebGL2 context available. three.js dropped WebGL 1
//     in r163, so there is no simpler renderer to fall back to; the scene is
//     simply off the table on this machine.
//   - 'context-lost' — the GPU driver reset, or the browser evicted our
//     context. A real failure mode on the older drivers PLAN.md §1 puts in
//     scope, and the nastier of the two: without handling it the canvas just
//     freezes on its last frame, so the page looks fine and is dead.
//
// The point of this component isn't to apologise, it's to route. `/resume`
// is the same content with no 3D at all and is already a hard requirement of
// the project (PLAN.md §1), which means the failure path has somewhere
// genuinely useful to land rather than being a dead end.
//
// Unlike ContentPanels/ControlDock, this styles itself from the page's
// light/dark `:root` variables: there's no rendered sky behind it here, so
// the "glass over daylight" treatment those use would have nothing to sit on.
export default function SceneFallback({ reason }: { reason: SceneFallbackReason }) {
  return (
    <main className="scene-fallback">
      <h1>The 3D scene can&rsquo;t run here</h1>
      <p>
        {reason === 'unsupported'
          ? 'This browser has no WebGL 2 support available — usually a disabled setting, a very old browser, or a graphics driver the browser has blocked.'
          : 'The graphics context was lost, which usually means the GPU driver reset. Reloading the page often brings it back.'}
      </p>
      <a className="scene-fallback__cta" href="/resume">
        Read the r&eacute;sum&eacute; instead &rarr;
      </a>
    </main>
  );
}
