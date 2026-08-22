import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Landscape from './Landscape';
import ContentPanels from './ContentPanels';

// SceneRoot owns the <Canvas> and all renderer-level settings — the single
// place renderer configuration lives (PLAN.md §3, world/*).
//
// Post-pivot (HANDOVER.md) this is deliberately simple: there's no
// approach-the-monitor beat and no phase machine driving the camera
// anymore, so free-roam `OrbitControls` replaces the old scripted
// `CameraRig`. The visitor orbits an outdoor scene and clicks floating
// panels directly — no state machine needed to gate that.
export default function SceneRoot() {
  return (
    <Canvas
      camera={{ position: [0, 2.6, 9.5], fov: 50 }}
      // Cap device pixel ratio at 1.5: the audience is a wide range of
      // desktop/laptop GPUs, so we never let a 4K panel run at dpr 3+.
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#bfd4e0']} />
      <Landscape />
      <ContentPanels />
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
