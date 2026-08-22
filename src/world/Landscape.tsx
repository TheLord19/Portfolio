import { Sky, MeshReflectorMaterial } from '@react-three/drei';

// The outdoor scene from the pivot in HANDOVER.md: river bank + mountains,
// built entirely from procedural geometry and drei helpers — no modeled
// terrain, no downloaded assets. Three techniques worth understanding
// (also see the chat explanation):
//
// 1. `<Sky>` is a physically-inspired shader (the Preetham sky model) that
//    paints an entire realistic sky gradient from a single "where's the
//    sun" vector — cheaper and more flexible than any skybox photo/HDRI,
//    and it changes believably if we ever animate `sunPosition` (day/night).
// 2. `fog` is the cheapest depth cue in 3D: geometry linearly fades to the
//    fog color between `near` and `far`. It hides the mountains' flat
//    silhouette edges into the sky and hides any far-plane pop-in, for
//    the cost of one uniform — no extra draw calls.
// 3. `MeshReflectorMaterial` fakes water by rendering the scene a second
//    time from a mirrored camera into a texture, then blending that
//    texture into the material with blur/distortion. It's an illusion
//    (there's no real "water volume"), but it's what a reflective river
//    surface looks like on the web without a full SSR/planar-reflection
//    pipeline.
//
// Mountain placement is a fixed, hand-picked array rather than
// `Math.random()` — deterministic layout so the scene doesn't reshuffle
// on every hot-reload/re-render, and so positions can be tuned by eye.
const MOUNTAINS: { position: [number, number, number]; scale: [number, number, number]; rotationY: number; color: string }[] = [
  { position: [-14, 0, -22], scale: [9, 7, 9], rotationY: 0.4, color: '#5b5d7a' },
  { position: [-4, 0, -28], scale: [12, 10, 12], rotationY: 1.1, color: '#4d4f6b' },
  { position: [8, 0, -24], scale: [10, 8.5, 10], rotationY: 2.0, color: '#565877' },
  { position: [18, 0, -20], scale: [8, 6, 8], rotationY: 2.8, color: '#63658a' },
  { position: [2, 0, -34], scale: [14, 12, 14], rotationY: 0.7, color: '#43455e' },
];

function Mountains() {
  return (
    <group>
      {MOUNTAINS.map((m, i) => (
        <mesh
          key={i}
          position={[m.position[0], m.scale[1] / 2 - 0.5, m.position[2]]}
          rotation={[0, m.rotationY, 0]}
          scale={m.scale}
        >
          {/* A cone is the whole trick for a "low-poly mountain": few
              radial segments (6) keep the facets big and visible, which
              reads as a deliberate art style rather than a rounding error. */}
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial color={m.color} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow={false}>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#3d4a34" roughness={1} />
    </mesh>
  );
}

function River() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[0, -0.48, -4]}>
      <planeGeometry args={[10, 90]} />
      {/* MeshReflectorMaterial args: resolution of the reflection render
          target (lower = cheaper, blurrier), and how much of the render
          budget to spend on it. blur softens the reflection so it reads
          as moving water rather than a literal mirror. */}
      <MeshReflectorMaterial
        resolution={512}
        mirror={0.4}
        mixBlur={8}
        mixStrength={1.2}
        blur={[300, 100]}
        depthScale={0.2}
        minDepthThreshold={0.85}
        color="#1b2a33"
        metalness={0.4}
        roughness={0.6}
      />
    </mesh>
  );
}

export default function Landscape() {
  return (
    <>
      {/* Fog color should match the sky's horizon color, otherwise the
          "fade to fog" seam is visible as a hard-edged haze band. */}
      <fog attach="fog" args={['#bfd4e0', 20, 65]} />
      <Sky sunPosition={[10, 6, -20]} turbidity={4} rayleigh={1.2} mieCoefficient={0.01} />

      {/* Hemisphere light = sky color from above, ground-bounce color from
          below, blended by surface normal. It's the single cheapest way
          to make an outdoor scene not look lit from a lightbulb — no
          shadow maps, just two colors and a lerp the GPU already does. */}
      <hemisphereLight args={['#cfe8ff', '#3d4a34', 0.9]} />
      <directionalLight position={[10, 6, -20]} intensity={1.4} color="#fff2d8" />

      <Ground />
      <River />
      <Mountains />
    </>
  );
}
