import { useMemo } from 'react';
import { Sky, MeshReflectorMaterial, Instances, Instance, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import type { QualitySettings } from './capabilities';

// The outdoor scene from the pivot in HANDOVER.md: river bank + mountains,
// built entirely from procedural geometry and drei helpers — no modeled
// terrain, no downloaded assets (PLAN.md Decision #1). This pass ("make it
// specific, HD scenery") adds detail density on top of that same rule:
// undulating terrain, instanced trees/rocks/grass, a richer mountain
// skyline, and a canvas-generated ground texture — all generated at
// runtime, nothing fetched over the network. Core techniques, in addition
// to the three already explained below (Sky, fog, MeshReflectorMaterial):
//
// 4. `Instances`/`Instance` (drei) wraps three.js `InstancedMesh`: every
//    tree/rock/grass clump of the same kind shares one geometry + one
//    material and is drawn in a *single* GPU draw call, no matter how many
//    there are — only the per-instance transform differs. This is the only
//    way scattering dozens of trees stays cheap; without it, each tree
//    would be its own draw call.
// 5. Scatter positions come from a small seeded PRNG (`mulberry32`), not
//    `Math.random()` — same reasoning as the hand-placed mountains: a
//    fixed seed means the forest/rocks/grass lay out identically on every
//    reload, so positions can be reasoned about and tuned instead of
//    reshuffling underfoot.
// 6. The ground is a subdivided `PlaneGeometry` with per-vertex height
//    ("terrain displacement") from layered sine waves — cheap, dependency-
//    free noise. Amplitude is damped to ~0 near the river and near the
//    mountain feet so neither looks like it's floating on a bump.
// 7. The ground's texture is a `CanvasTexture` painted at runtime (speckled
//    noise, tiled) instead of an image file — texture detail with zero
//    added network/bundle weight.
// 8. The far ridge behind the main mountains is colored close to the fog/
//    sky color ("atmospheric perspective") so it reads as haze-softened
//    distance rather than a second identical mountain range.
//
// The scene takes a `quality` prop (Phase 8 — see capabilities.ts for how
// the tier is chosen). The two most expensive things in here are the
// river's real-time reflections and the alpha-blended cloud layer, so the
// low tier drops both and thins the scattered props; weak GPUs get the
// same scene rather than a broken one.

// ---------------------------------------------------------------------------
// Seeded scatter — shared by trees, rocks, and grass below.
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The river plane (`River`, below) is a 10x90 rectangle rotated
// [-PI/2, 0, 0.5] and positioned at [0, -0.48, -4]. Worked out once by
// transforming its corner vertices through that same matrix: the long
// axis runs along unit vector (0.4794, 0.8776) in the XZ ground plane, so
// the *width* axis (what "distance from the river" is measured against)
// is the perpendicular unit vector below.
const RIVER_CENTER: [number, number] = [0, -4];
const RIVER_WIDTH_DIR: [number, number] = [0.8776, -0.4794];
const RIVER_HALF_WIDTH = 5;

function riverDistance(x: number, z: number): number {
  return Math.abs((x - RIVER_CENTER[0]) * RIVER_WIDTH_DIR[0] + (z - RIVER_CENTER[1]) * RIVER_WIDTH_DIR[1]);
}

// Keep-clear circles: the four content panels (see ContentPanels.tsx —
// positions duplicated here rather than imported, since these are ground
// footprints, not the panels' actual floating height) plus the starting
// camera/orbit-target area, so scattered props never grow into the UI or
// the initial view.
const KEEP_CLEAR: { point: [number, number]; radius: number }[] = [
  { point: [-5, 1], radius: 2.6 }, // about
  { point: [0, -2.5], radius: 2.8 }, // projects
  { point: [5, 1.5], radius: 2.6 }, // contact
  { point: [2.2, 5.5], radius: 2.6 }, // resume
  { point: [0, -1], radius: 3.2 }, // orbit target
  { point: [0, 9], radius: 3 }, // camera start
];

function clearOfPanels(x: number, z: number): boolean {
  return KEEP_CLEAR.every(({ point, radius }) => (x - point[0]) ** 2 + (z - point[1]) ** 2 >= radius * radius);
}

function isOpenGround(x: number, z: number): boolean {
  return riverDistance(x, z) > 6.5 && clearOfPanels(x, z);
}

function isRiverbank(x: number, z: number): boolean {
  const d = riverDistance(x, z);
  return d > 5.4 && d < 8.2 && clearOfPanels(x, z);
}

interface ScatterPoint {
  x: number;
  z: number;
  scale: number;
  rotationY: number;
}

interface ScatterBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

// Rejection-sampled scatter: pick random points inside `bounds`, keep only
// ones that pass `filter` and aren't too close to a point already placed.
// Deterministic given `seed` — same layout every load.
function scatter(
  seed: number,
  count: number,
  bounds: ScatterBounds,
  scaleRange: [number, number],
  minSpacing: number,
  filter: (x: number, z: number) => boolean,
): ScatterPoint[] {
  const rand = mulberry32(seed);
  const points: ScatterPoint[] = [];
  const maxAttempts = count * 60;
  let attempts = 0;
  while (points.length < count && attempts < maxAttempts) {
    attempts++;
    const x = bounds.xMin + rand() * (bounds.xMax - bounds.xMin);
    const z = bounds.zMin + rand() * (bounds.zMax - bounds.zMin);
    if (!filter(x, z)) continue;
    const tooClose = points.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < minSpacing * minSpacing);
    if (tooClose) continue;
    const scale = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
    const rotationY = rand() * Math.PI * 2;
    points.push({ x, z, scale, rotationY });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Mountains — hand-placed main range, low-detail hazy ridge behind it.
// ---------------------------------------------------------------------------

interface MountainDef {
  position: [number, number, number];
  scale: [number, number, number];
  rotationY: number;
  color: string;
  segments: number;
}

// Segment count varies per peak (5–8) so the low-poly facets read as a
// deliberate mix of silhouettes instead of one repeated cone stamped
// around the scene.
const MOUNTAINS: MountainDef[] = [
  { position: [-14, 0, -22], scale: [9, 7, 9], rotationY: 0.4, color: '#5b5d7a', segments: 7 },
  { position: [-4, 0, -28], scale: [12, 10, 12], rotationY: 1.1, color: '#4d4f6b', segments: 6 },
  { position: [8, 0, -24], scale: [10, 8.5, 10], rotationY: 2.0, color: '#565877', segments: 8 },
  { position: [18, 0, -20], scale: [8, 6, 8], rotationY: 2.8, color: '#63658a', segments: 5 },
  { position: [2, 0, -34], scale: [14, 12, 14], rotationY: 0.7, color: '#43455e', segments: 6 },
  { position: [-22, 0, -18], scale: [7, 5.5, 7], rotationY: 1.6, color: '#6a6c8f', segments: 5 },
  { position: [26, 0, -26], scale: [9, 7.5, 9], rotationY: 2.3, color: '#54566f', segments: 7 },
];

// Peaks taller than this get a small white cap cone nested near the apex —
// reads as snow above the tree line, no textures/decals needed.
const SNOW_LINE = 8;

function Mountains() {
  return (
    <group>
      {MOUNTAINS.map((m, i) => {
        const height = m.scale[1];
        return (
          <group key={i} position={[m.position[0], 0, m.position[2]]} rotation={[0, m.rotationY, 0]}>
            <mesh position={[0, height / 2 - 0.5, 0]} scale={m.scale}>
              <coneGeometry args={[1, 1, m.segments]} />
              <meshStandardMaterial color={m.color} flatShading roughness={1} />
            </mesh>
            {height > SNOW_LINE && (
              <mesh position={[0, height * 0.78 - 0.5, 0]} scale={[m.scale[0] * 0.45, height * 0.4, m.scale[2] * 0.45]}>
                <coneGeometry args={[1, 1, m.segments]} />
                <meshStandardMaterial color="#f4f7fb" flatShading roughness={0.9} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

const DISTANT_RIDGE: { position: [number, number, number]; scale: [number, number, number]; rotationY: number }[] = [
  { position: [-30, 0, -58], scale: [20, 14, 20], rotationY: 0.3 },
  { position: [-8, 0, -64], scale: [26, 17, 26], rotationY: 1.4 },
  { position: [16, 0, -60], scale: [22, 15, 22], rotationY: 2.1 },
  { position: [36, 0, -55], scale: [18, 12, 18], rotationY: 0.9 },
];

function DistantRidge() {
  return (
    <group>
      {DISTANT_RIDGE.map((m, i) => (
        <mesh
          key={i}
          position={[m.position[0], m.scale[1] / 2 - 0.5, m.position[2]]}
          rotation={[0, m.rotationY, 0]}
          scale={m.scale}
        >
          <coneGeometry args={[1, 1, 5]} />
          <meshStandardMaterial color="#a9bdcd" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Terrain — displaced ground plane + runtime-painted texture.
// ---------------------------------------------------------------------------

function useTerrainGeometry() {
  return useMemo(() => {
    const segments = 80;
    const geometry = new THREE.PlaneGeometry(120, 120, segments, segments);
    // Bake the "lay flat" rotation into the geometry itself so the mesh
    // needs no rotation prop, and so `x`/`z` on each vertex already line up
    // with world X/Z — simpler to reason about than rotating at the object
    // level and re-deriving which local axis became which world axis.
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      let height = 0;
      height += Math.sin(x * 0.08 + 3.1) * Math.cos(z * 0.09) * 0.6;
      height += Math.sin(x * 0.21 - z * 0.17) * 0.25;
      height += Math.sin((x + z) * 0.05) * 0.4;
      // Flatten the undulation near the river (so the water still reads as
      // sitting in a believable channel) and near the mountain feet (so
      // they sit flush on the ground instead of on a visible bump).
      const riverDamp = THREE.MathUtils.clamp(riverDistance(x, z) / 10, 0.15, 1);
      const mountainDamp = THREE.MathUtils.smoothstep(z, -20, -8);
      position.setY(i, height * riverDamp * mountainDamp);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
}

function useGrassTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#3d4a34';
    ctx.fillRect(0, 0, size, size);
    // Seeded, not Math.random() — matches the "deterministic layout" rule
    // used everywhere else in this file, so the ground grain doesn't
    // reshuffle on every reload either.
    const rand = mulberry32(7);
    for (let i = 0; i < 4000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(96,116,76,0.28)' : 'rgba(28,36,24,0.32)';
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(24, 24);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function Terrain() {
  const geometry = useTerrainGeometry();
  const texture = useGrassTexture();
  return (
    <mesh geometry={geometry} position={[0, -0.5, 0]}>
      <meshStandardMaterial map={texture ?? undefined} color={texture ? undefined : '#3d4a34'} roughness={1} />
    </mesh>
  );
}

function River({ reflections }: { reflections: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[0, -0.48, -4]}>
      <planeGeometry args={[RIVER_HALF_WIDTH * 2, 90]} />
      {reflections ? (
        /* MeshReflectorMaterial args: resolution of the reflection render
           target (lower = cheaper, blurrier), and how much of the render
           budget to spend on it. blur softens the reflection so it reads
           as moving water rather than a literal mirror. */
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
      ) : (
        /* Low tier. Everything above costs a second full render of the
           scene into an off-screen target plus two blur passes, every
           frame — the most expensive thing in the file by a wide margin.
           This keeps the water reading as water for the price of any other
           surface: same base colour, but more metallic and much smoother,
           so the directional light glints off it in place of a reflection. */
        <meshStandardMaterial color="#1b2a33" metalness={0.7} roughness={0.25} />
      )}
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Instanced scenery — trees, rocks, grass.
// ---------------------------------------------------------------------------

const TREE_BOUNDS: ScatterBounds = { xMin: -42, xMax: 42, zMin: -14, zMax: 46 };
const GRASS_BOUNDS: ScatterBounds = { xMin: -18, xMax: 18, zMin: -8, zMax: 24 };
const BANK_ROCK_BOUNDS: ScatterBounds = { xMin: -24, xMax: 26, zMin: -38, zMax: 36 };

function Trees({ points }: { points: ScatterPoint[] }) {
  // Three `Instances` blocks (trunk, lower foliage tier, upper foliage
  // tier) — three draw calls total, however many trees there are, since
  // every tree of a given part shares one geometry/material pair.
  return (
    <group>
      <Instances limit={points.length} range={points.length}>
        <cylinderGeometry args={[0.12, 0.16, 1.4, 6]} />
        <meshStandardMaterial color="#4a3625" flatShading roughness={1} />
        {points.map((p, i) => (
          <Instance key={i} position={[p.x, 0.2 * p.scale, p.z]} rotation={[0, p.rotationY, 0]} scale={p.scale} />
        ))}
      </Instances>
      <Instances limit={points.length} range={points.length}>
        <coneGeometry args={[0.9, 2.1, 6]} />
        <meshStandardMaterial color="#2f4a30" flatShading roughness={1} />
        {points.map((p, i) => (
          <Instance key={i} position={[p.x, 1.5 * p.scale, p.z]} rotation={[0, p.rotationY, 0]} scale={p.scale} />
        ))}
      </Instances>
      <Instances limit={points.length} range={points.length}>
        <coneGeometry args={[0.65, 1.5, 6]} />
        <meshStandardMaterial color="#375339" flatShading roughness={1} />
        {points.map((p, i) => (
          <Instance key={i} position={[p.x, 2.5 * p.scale, p.z]} rotation={[0, p.rotationY, 0]} scale={p.scale} />
        ))}
      </Instances>
    </group>
  );
}

function Rocks({ points, color }: { points: ScatterPoint[]; color: string }) {
  return (
    <Instances limit={points.length} range={points.length}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color={color} flatShading roughness={1} />
      {points.map((p, i) => (
        <Instance
          key={i}
          position={[p.x, 0.15 * p.scale, p.z]}
          rotation={[p.rotationY * 0.3, p.rotationY, p.rotationY * 0.2]}
          scale={[p.scale, p.scale * 0.7, p.scale]}
        />
      ))}
    </Instances>
  );
}

function GrassTufts({ points }: { points: ScatterPoint[] }) {
  // Classic cross-plane grass: two perpendicular double-sided planes per
  // clump so it reads as foliage from any viewing angle without needing
  // real per-blade geometry. Two `Instances` blocks (one per plane
  // orientation) cover every clump.
  return (
    <group>
      {[0, Math.PI / 2].map((extraRotation, blockIndex) => (
        <Instances key={blockIndex} limit={points.length} range={points.length}>
          <planeGeometry args={[0.5, 0.6]} />
          <meshStandardMaterial color="#4d6b3a" flatShading roughness={1} side={THREE.DoubleSide} />
          {points.map((p, i) => (
            <Instance
              key={i}
              position={[p.x, 0.3 * p.scale, p.z]}
              rotation={[0, p.rotationY + extraRotation, 0]}
              scale={p.scale}
            />
          ))}
        </Instances>
      ))}
    </group>
  );
}

function CloudLayer() {
  return (
    <group>
      <Cloud position={[-9, 9.5, -19]} speed={0.15} opacity={0.5} segments={20} bounds={[6, 1.4, 3]} color="#ffffff" />
      <Cloud position={[9, 10.5, -27]} speed={0.1} opacity={0.4} segments={16} bounds={[7, 1.4, 3]} color="#ffffff" />
      <Cloud position={[-2, 11.5, -34]} speed={0.12} opacity={0.35} segments={14} bounds={[9, 1.8, 4]} color="#eef3f8" />
    </group>
  );
}

export default function Landscape({ quality }: { quality: QualitySettings }) {
  // `scatter` accepts points in a fixed, seed-determined order and simply
  // stops once it has `count` of them — so a lower count yields a strict
  // prefix of the full layout. Thinning the scenery therefore removes
  // props without rearranging the ones that stay, which is what makes it
  // safe to do mid-session when the tier drops.
  const { sceneryDensity } = quality;
  const trees = useMemo(
    () => scatter(11, Math.round(42 * sceneryDensity), TREE_BOUNDS, [0.7, 1.4], 2.4, isOpenGround),
    [sceneryDensity],
  );
  const forestRocks = useMemo(
    () => scatter(23, Math.round(16 * sceneryDensity), TREE_BOUNDS, [0.4, 0.9], 3, isOpenGround),
    [sceneryDensity],
  );
  const bankRocks = useMemo(
    () => scatter(37, Math.round(10 * sceneryDensity), BANK_ROCK_BOUNDS, [0.35, 0.75], 2.5, isRiverbank),
    [sceneryDensity],
  );
  const grass = useMemo(
    () => scatter(53, Math.round(130 * sceneryDensity), GRASS_BOUNDS, [0.6, 1.1], 1.1, isOpenGround),
    [sceneryDensity],
  );

  return (
    <>
      {/* Fog color should match the sky's horizon color, otherwise the
          "fade to fog" seam is visible as a hard-edged haze band. */}
      <fog attach="fog" args={['#bfd4e0', 20, 65]} />
      <Sky sunPosition={[10, 6, -20]} turbidity={4} rayleigh={1.2} mieCoefficient={0.01} />
      {quality.clouds && <CloudLayer />}

      {/* Hemisphere light = sky color from above, ground-bounce color from
          below, blended by surface normal. It's the single cheapest way
          to make an outdoor scene not look lit from a lightbulb — no
          shadow maps, just two colors and a lerp the GPU already does. */}
      <hemisphereLight args={['#cfe8ff', '#3d4a34', 0.9]} />
      <directionalLight position={[10, 6, -20]} intensity={1.4} color="#fff2d8" />

      <Terrain />
      <River reflections={quality.reflections} />
      <Mountains />
      <DistantRidge />
      <Trees points={trees} />
      <Rocks points={forestRocks} color="#6b6b6f" />
      <Rocks points={bankRocks} color="#7c7167" />
      <GrassTufts points={grass} />
    </>
  );
}
