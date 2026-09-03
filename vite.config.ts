import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Phase 8 (REVIEW.md/PLAN.md): the 3D route's chunk is one large blob
    // — three.js core plus the @react-three/fiber + @react-three/drei
    // wrappers plus this project's own scene code. Draco/KTX2 (the fix
    // originally proposed in REVIEW.md) compress *loaded* glTF meshes/
    // textures — this project has none (procedural geometry only, see
    // PLAN.md Decision #1), so there's nothing for either to compress;
    // that note was written ahead of asset work that never happened.
    //
    // Manual vendor-chunk splitting (three/@react-three into their own
    // chunk, for better caching across content-only deploys) was tried
    // and reverted: with a single-page app and one shared index.html,
    // Rolldown's `codeSplitting.groups` hoisted those vendor chunks into
    // eager `modulepreload` tags on *every* route's HTML — including
    // `/resume`, which would have started downloading three.js/r3f in the
    // background there too, breaking the flat resume route's hard
    // "ships zero 3D bundle" requirement (PLAN.md §1/§5). Not worth it:
    // vendor splitting doesn't reduce total bytes anyway, only shifts
    // *when* they're cached, so it's not worth risking that requirement.
    //
    // What's actually true: three.js's own minified size (~725kB) is
    // inherent to using it, not a symptom of unsplit chunks — the default
    // 500kB warning threshold just isn't calibrated for a three.js-based
    // app. Raise it instead of chasing an unactionable warning, while
    // still catching real bloat (this repo's own code, or a future heavy
    // dependency) above that line.
    chunkSizeWarningLimit: 1000,
  },
})
