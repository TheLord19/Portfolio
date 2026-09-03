import { useCallback, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import Landscape from './Landscape';
import ContentPanels from './ContentPanels';
import { QUALITY, detectQualityTier, type QualityTier } from './capabilities';

// SceneRoot owns the <Canvas> and all renderer-level settings — the single
// place renderer configuration lives (PLAN.md §3, world/*). That now
// includes which quality tier the scene runs at (Phase 8): the tier is
// picked here and pushed down as settings, rather than each part of the
// scene deciding for itself how expensive it's allowed to be.
//
// Post-pivot (HANDOVER.md) the camera side of this is deliberately simple:
// there's no approach-the-monitor beat and no phase machine driving the
// camera anymore, so free-roam `OrbitControls` replaces the old scripted
// `CameraRig`. The visitor orbits an outdoor scene and clicks floating
// panels directly — no state machine needed to gate that.

// Watches for the GPU context going away underneath us. Lives inside the
// Canvas because that's where the renderer is reachable; it reports upward
// so the route can swap in `SceneFallback` (see ExperienceRoute).
//
// Deliberately no `preventDefault()` on the event — that would ask the
// browser to restore the context, but every buffer, texture and program in
// the scene graph would still need rebuilding afterwards. A half-restored
// scene is a worse outcome than an honest handoff to the flat résumé route.
function ContextLossWatcher({ onLost }: { onLost: () => void }) {
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    canvas.addEventListener('webglcontextlost', onLost);
    return () => canvas.removeEventListener('webglcontextlost', onLost);
  }, [canvas, onLost]);

  return null;
}

export default function SceneRoot({ onContextLost }: { onContextLost: () => void }) {
  // Starts from what can be detected before first paint (capabilities.ts),
  // then only ever moves downward — see `dropQuality` below.
  const [tier, setTier] = useState<QualityTier>(detectQualityTier);
  const settings = QUALITY[tier];

  // One-way on purpose. drei's PerformanceMonitor also reports recovery
  // (`onIncline`), but acting on it would let the scene oscillate between
  // tiers on any machine sitting near the threshold — repeatedly popping
  // reflections and clouds in and out is far more distracting than just
  // staying on the cheaper settings for the rest of the visit.
  const dropQuality = useCallback(() => setTier('low'), []);

  return (
    <Canvas
      camera={{ position: [0, 2.6, 9.5], fov: 50 }}
      dpr={settings.dpr}
      // r3f constructs the renderer once and never re-reads this object, so
      // `antialias` is fixed at whatever the *initial* tier asked for; a
      // later downgrade can't switch MSAA off without tearing the renderer
      // down and rebuilding it. Reasoned through in capabilities.ts.
      gl={{ antialias: settings.antialias, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#bfd4e0']} />
      <Landscape quality={settings} />
      <ContentPanels />
      {/* Sampling costs a little work every frame, so it's only mounted
          while there's still a tier left to drop to. */}
      {tier === 'high' && <PerformanceMonitor onDecline={dropQuality} />}
      <ContextLossWatcher onLost={onContextLost} />
      <OrbitControls
        target={[0, 1.6, -1]}
        enablePan={false}
        minDistance={3.5}
        maxDistance={17}
        // Polar angle is measured from straight up (0) to straight down
        // (PI). Clamping the range keeps the camera from flipping to a
        // bird's-eye top-down view on one end, or dipping through the
        // ground plane to look up from underneath on the other — a cheap
        // approximation of ground collision without actually detecting it.
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.49}
      />
    </Canvas>
  );
}
