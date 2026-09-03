import { Float, Html } from '@react-three/drei';
import { useAppStore, type PanelId } from '../state/appStore';
import { about } from '../content/about';
import { projects } from '../content/projects';
import { contact } from '../content/contact';
import './ContentPanels.css';

// The pivot's core idea (HANDOVER.md): portfolio content as floating
// spatial panels *inside* the 3D scene, instead of a fake-OS window
// system behind a monitor click. Each panel is a real DOM node placed at
// a 3D point via drei's `Html` — not a texture, not canvas-drawn text.
// `Html` works by reading the object's world position every frame,
// projecting it through the camera's matrix to a 2D screen coordinate,
// and positioning an absolutely-positioned `<div>` there with a CSS
// transform. That's *why* it exists: normal DOM text stays crisp,
// selectable, and accessible (a real <a href>, real focus order) at any
// zoom level, which a texture/canvas approach can't give you cheaply.
//
// Deliberate choice: this is *billboard* mode (the default — we don't
// pass `transform`), meaning each panel always faces the camera flat-on
// rather than rotating with the 3D scene. `transform` mode exists and
// looks more "embedded in 3D," but rotated paragraph text is hard to
// read — for content-heavy panels like these, staying readable wins over
// looking more literally 3D. `distanceFactor` is the compromise: it still
// scales the panel down as it gets farther from the camera, so distance
// depth-cues correctly, it just never rotates out of plane.
interface PanelDef {
  id: PanelId;
  position: [number, number, number];
  title: string;
}

// The panel card itself is click-to-focus/unfocus (see the `<article
// onClick>` below), but it also holds real `<a>`s (mailto, socials, the
// résumé CTA, project links). Without this, clicking one of those bubbles
// up to the card and toggles focus at the same instant the link action
// fires — e.g. clicking a project's "Code" link would also collapse the
// panel you were just reading. Stop the click from reaching the card.
function stopPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

const PANEL_LAYOUT: PanelDef[] = [
  { id: 'about', position: [-5, 1.7, 1], title: 'About' },
  { id: 'projects', position: [0, 2.1, -2.5], title: 'Projects' },
  { id: 'contact', position: [5, 1.5, 1.5], title: 'Contact' },
  { id: 'resume', position: [2.2, 1.4, 5.5], title: 'Résumé' },
];

function PanelBody({ id }: { id: PanelId }) {
  if (id === 'about') {
    return (
      <>
        <p>{about.bio}</p>
        <ul className="content-panel__tags">
          {about.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </>
    );
  }

  if (id === 'projects') {
    return (
      <ul className="content-panel__list">
        {projects.map((project) => (
          <li key={project.slug}>
            <strong>{project.title}</strong>
            <span>{project.summary}</span>
            <span className="content-panel__project-links">
              {project.links.live && (
                <a href={project.links.live} target="_blank" rel="noreferrer" onClick={stopPropagation}>
                  Live
                </a>
              )}
              {project.links.repo && (
                <a href={project.links.repo} target="_blank" rel="noreferrer" onClick={stopPropagation}>
                  Code
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (id === 'contact') {
    return (
      <>
        <a href={`mailto:${contact.email}`} onClick={stopPropagation}>
          {contact.email}
        </a>
        <ul className="content-panel__list content-panel__list--inline">
          {contact.socials.map((social) => (
            <li key={social.url}>
              <a href={social.url} target="_blank" rel="noreferrer" onClick={stopPropagation}>
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (id === 'resume') {
    return (
      <>
        <p>The one-page version, ready to skim or hand to an ATS.</p>
        <a className="content-panel__cta" href="/resume" onClick={stopPropagation}>
          Open résumé &rarr;
        </a>
      </>
    );
  }

  // Exhaustiveness check: if `PanelId` ever grows a new variant, this is a
  // compile error instead of a silently-wrong fallback render.
  const _exhaustive: never = id;
  throw new Error(`Unhandled panel id: ${_exhaustive}`);
}

export default function ContentPanels() {
  const focusedPanel = useAppStore((s) => s.focusedPanel);
  const setFocusedPanel = useAppStore((s) => s.setFocusedPanel);

  return (
    <>
      {PANEL_LAYOUT.map((panel) => {
        const isFocused = focusedPanel === panel.id;
        const isDimmed = focusedPanel !== null && !isFocused;

        return (
          // Float adds a small idle sine-wave bob + tilt so panels read as
          // physical objects hanging in the air rather than flat HUD
          // overlays — a cheap per-frame position offset, not physics.
          <Float key={panel.id} speed={1.2} floatIntensity={0.5} rotationIntensity={0.1}>
            <Html position={panel.position} center distanceFactor={8} style={{ pointerEvents: 'auto' }}>
              <article
                className={
                  'content-panel' +
                  (isFocused ? ' content-panel--focused' : '') +
                  (isDimmed ? ' content-panel--dimmed' : '')
                }
                role="button"
                tabIndex={isDimmed ? -1 : 0}
                aria-pressed={isFocused}
                onClick={() => setFocusedPanel(isFocused ? null : panel.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setFocusedPanel(isFocused ? null : panel.id);
                  }
                }}
              >
                <header className="content-panel__header">
                  <h2>{panel.title}</h2>
                  {isFocused && (
                    <button
                      type="button"
                      className="content-panel__close"
                      aria-label="Close"
                      onClick={(event) => {
                        event.stopPropagation();
                        setFocusedPanel(null);
                      }}
                    >
                      &times;
                    </button>
                  )}
                </header>
                <div className="content-panel__body">
                  <PanelBody id={panel.id} />
                </div>
              </article>
            </Html>
          </Float>
        );
      })}
    </>
  );
}
