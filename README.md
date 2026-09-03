# 3D Portfolio

A personal portfolio built as a walkable 3D scene instead of a flat page:
an outdoor river-and-mountain landscape (React Three Fiber) with portfolio
content — About, Projects, Contact, Résumé — shown as floating spatial
panels you click through, plus a fixed launcher dock for quick navigation.
A plain, fast `/resume` route exists alongside it for anyone who'd rather
skip the 3D scene entirely.

## Stack

- **React 19 + TypeScript**, built with **Vite**
- **React Three Fiber** + **drei** for the 3D scene and in-scene HTML panels
- **Zustand** for the small bit of cross-cutting UI state (which panel is
  focused)
- **react-router-dom** for the `/` ↔ `/resume` split
- **Oxlint** for linting

## Structure

```
src/
  routes/
    ExperienceRoute.tsx   — the 3D entry ("/"), lazy-loaded
    FlatResumeRoute.tsx   — plain HTML/CSS escape hatch ("/resume")
  world/
    SceneRoot.tsx          — <Canvas>, camera, controls
    Landscape.tsx          — sky/fog/mountains/river, all procedural geometry
    ContentPanels.tsx      — floating in-scene content panels
    ControlDock.tsx        — fixed launcher dock (screen-space overlay)
  content/
    projects.ts, about.ts, contact.ts, types.ts
                            — plain data, read by both routes; this is the
                              seam that keeps 3D presentation and content
                              decoupled
  state/
    appStore.ts             — Zustand store (focusedPanel, audioEnabled)
```

`/resume` is code-split from the 3D route via `lazy()` in `App.tsx`, so it
never loads three.js or the R3F bundle — the goal is a route a
time-pressed recruiter can open instantly.

## Development

```
npm install
npm run dev       # http://localhost:5173, serves both "/" and "/resume"
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npm run preview    # serve the production build locally
```

## Status

Content in `src/content/*.ts` is a mix of real and placeholder data —
`projects.ts` has real projects, `about.ts`/`contact.ts` are still
placeholders. See the (gitignored) working-notes files for day-to-day
status if you have them locally; they aren't part of the public repo.
