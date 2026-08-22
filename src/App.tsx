import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import FlatResumeRoute from './routes/FlatResumeRoute';

// lazy() is the actual enforcement of the "flat route ships zero
// three.js/r3f" requirement (PLAN.md §3/§4 Phase 1) — everything imported
// from ExperienceRoute.tsx lands in a separate chunk that only loads when
// someone visits "/", never on "/resume".
const ExperienceRoute = lazy(() => import('./routes/ExperienceRoute'));

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<div className="route-loading">Loading…</div>}>
            <ExperienceRoute />
          </Suspense>
        }
      />
      <Route path="/resume" element={<FlatResumeRoute />} />
    </Routes>
  );
}
