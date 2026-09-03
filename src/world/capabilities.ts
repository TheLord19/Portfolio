// Phase 8, the "performance & compatibility pass" (PLAN.md §4). Two related
// questions this module answers, both before a single frame is drawn:
//
//   1. *Can* this browser render the scene at all? three.js removed WebGL 1
//      support in r163, so there is no lower renderer to degrade to — if we
//      can't get a `webgl2` context, the scene cannot run, and SceneRoot
//      needs to show something other than a black canvas.
//   2. *How hard* should we push it? PLAN.md §1 defines the audience as
//      "the range of desktop/laptop hardware, integrated GPUs and older
//      drivers included", so the scene ships two quality tiers instead of
//      one setting tuned to whatever machine it happened to be built on.

export type QualityTier = 'high' | 'low';

export interface QualitySettings {
  /** `<Canvas dpr>` — clamps [min, max] device pixel ratio. */
  dpr: [number, number];
  /** MSAA. Create-time only — see the note on `detectQualityTier` below. */
  antialias: boolean;
  /** Real reflections in the river, vs. a plain water material. */
  reflections: boolean;
  /** Whether the drei `<Cloud>` layer is drawn at all. */
  clouds: boolean;
  /** Multiplier on every scattered-prop count (trees, rocks, grass). */
  sceneryDensity: number;
}

// What each tier turns down is ordered by what actually costs frames in
// *this* scene, which is fill rate and per-frame render passes — not
// triangle count:
//
//   - `reflections`: MeshReflectorMaterial re-renders the entire scene into
//     an off-screen target and then blurs it, every frame. Comfortably the
//     single most expensive thing here — it roughly doubles the scene's
//     draw cost on its own.
//   - `clouds`: each drei <Cloud> is a stack of large alpha-blended
//     billboards. Cheap in triangles, brutal in overdraw, which is exactly
//     the axis integrated GPUs are weakest on.
//   - `dpr`: fragment cost scales with the *square* of the pixel ratio, so
//     1.5 → 1.0 is a ~2.25x saving on every pixel-bound pass above.
//   - `sceneryDensity` is deliberately last and mild: the props are already
//     GPU-instanced (one draw call each, however many there are), so
//     thinning them is a real but secondary win. It's here so the low tier
//     has a vertex-side lever at all, not because trees are the problem.
export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: { dpr: [1, 1.5], antialias: true, reflections: true, clouds: true, sceneryDensity: 1 },
  low: { dpr: [1, 1], antialias: false, reflections: false, clouds: false, sceneryDensity: 0.55 },
};

interface GpuProbe {
  webgl2: boolean;
  /** Unmasked GPU string, or null where the browser withholds it. */
  renderer: string | null;
}

let cachedProbe: GpuProbe | null = null;

function runProbe(): GpuProbe {
  if (typeof document === 'undefined') return { webgl2: false, renderer: null };

  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement('canvas').getContext('webgl2');
  } catch {
    // Some browsers throw rather than return null when WebGL is disabled by
    // policy or by a user setting. Either way: no context, same answer.
    return { webgl2: false, renderer: null };
  }
  if (!gl) return { webgl2: false, renderer: null };

  // WEBGL_debug_renderer_info is the only way to see the real GPU string.
  // Firefox and Safari withhold it as a fingerprinting surface and return
  // nothing — `null` here means "unknown", and the tier logic below treats
  // unknown as capable, so privacy-preserving browsers aren't penalised.
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : null;

  // Browsers cap how many WebGL contexts may be live at once (~16), and the
  // real renderer is about to ask for one. Hand this throwaway one back
  // rather than leaving it to garbage collection.
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  return { webgl2: true, renderer };
}

function probe(): GpuProbe {
  cachedProbe ??= runProbe();
  return cachedProbe;
}

export function supportsWebGL2(): boolean {
  return probe().webgl2;
}

// Pure software rasterisers — no GPU involved at all, orders of magnitude
// slower than the weakest real hardware. These show up on precisely the
// machines PLAN.md §1 puts in scope: locked-down corporate laptops, VMs,
// and installs where the graphics driver is missing or has been blocklisted
// by the browser.
const SOFTWARE_RENDERERS = ['swiftshader', 'llvmpipe', 'softpipe', 'basic render driver', 'software adapter'];

/**
 * The tier to *start* on. Deliberately conservative: it only drops to `low`
 * where the evidence is conclusive, and leaves everything else to the
 * frame-rate monitor in `SceneRoot`.
 *
 * That asymmetry is the whole design. Guessing `high` wrongly costs about
 * two seconds of a poor frame rate before the monitor notices and drops the
 * tier; guessing `low` wrongly costs a permanently worse-looking scene on a
 * machine that could have handled the full one, with no path back up. So
 * static detection answers only the questions it can answer confidently,
 * and measured frame time decides the rest.
 *
 * One thing measurement can't undo: `antialias` is a context-creation flag,
 * so a later downgrade can't switch MSAA off without destroying and
 * rebuilding the renderer — a visible teardown mid-session is worse than
 * the MSAA it would save. It's tier-controlled for the machines detected
 * here, and effectively fixed for the ones caught at runtime.
 */
export function detectQualityTier(): QualityTier {
  const { webgl2, renderer } = probe();
  if (!webgl2) return 'low';

  const gpu = renderer?.toLowerCase();
  if (gpu && SOFTWARE_RENDERERS.some((name) => gpu.includes(name))) return 'low';

  if (typeof navigator === 'undefined') return 'high';

  // Thresholds are set where a false "low" is implausible rather than where
  // they'd catch the most machines — a 2-core, 2GB desktop browser is not
  // running this scene well under any settings.
  const { hardwareConcurrency } = navigator;
  if (typeof hardwareConcurrency === 'number' && hardwareConcurrency > 0 && hardwareConcurrency <= 2) {
    return 'low';
  }

  // Chromium-only, quantised to [0.25, 0.5, 1, 2, 4, 8] and absent
  // elsewhere — hence the cast and the explicit type guard.
  const { deviceMemory } = navigator as Navigator & { deviceMemory?: number };
  if (typeof deviceMemory === 'number' && deviceMemory <= 2) return 'low';

  return 'high';
}
