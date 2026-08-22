import type { ReactElement } from 'react';
import { useAppStore, type PanelId } from '../state/appStore';
import './ControlDock.css';

// Quest-Home-style central dock: a persistent launcher, always on screen,
// that jumps focus to a panel instead of relying on the visitor to notice
// and click one of the scattered floating panels themselves.
//
// Deliberately a plain fixed-position DOM overlay *outside* the `<Canvas>`
// (rendered as a sibling in `ExperienceRoute`, not inside `SceneRoot`) —
// not a world-anchored `Html` panel like `ContentPanels`. Quest's own dock
// behaves the same way: it stays put in your view rather than being an
// object you'd have to walk up to. Since scope here is desktop-viewed
// only (no WebXR), a real screen-space-fixed element is simpler and more
// reliable than faking that behavior inside the 3D scene.
const DOCK_ITEMS: { id: PanelId; label: string; icon: ReactElement }[] = [
  {
    id: 'about',
    label: 'About',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="4" width="7" height="7" rx="1.4" />
        <rect x="13" y="4" width="7" height="7" rx="1.4" />
        <rect x="4" y="13" width="7" height="7" rx="1.4" />
        <rect x="13" y="13" width="7" height="7" rx="1.4" />
      </svg>
    ),
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3.5" y="5.5" width="17" height="13" rx="1.8" />
        <path d="M4.5 7l7.5 6 7.5-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'resume',
    label: 'Résumé',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 3.5h9l3 3v14a1 1 0 01-1 1H6a1 1 0 01-1-1v-16a1 1 0 011-1z" />
        <path d="M9 12h6M9 15.5h6M9 8.5h3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ControlDock() {
  const focusedPanel = useAppStore((s) => s.focusedPanel);
  const setFocusedPanel = useAppStore((s) => s.setFocusedPanel);

  return (
    <nav className="control-dock" aria-label="Portfolio sections">
      {DOCK_ITEMS.map((item) => {
        const isActive = focusedPanel === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={'control-dock__item' + (isActive ? ' control-dock__item--active' : '')}
            aria-pressed={isActive}
            onClick={() => setFocusedPanel(isActive ? null : item.id)}
          >
            <span className="control-dock__icon">{item.icon}</span>
            <span className="control-dock__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
