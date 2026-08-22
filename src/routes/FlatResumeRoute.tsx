import { projects } from '../content/projects';
import { about } from '../content/about';
import { contact } from '../content/contact';
import './FlatResumeRoute.css';

// The escape hatch (PLAN.md §1, hard requirement): a plain, fast route for
// recruiters who don't want the 3D experience. This file must never import
// three.js, @react-three/fiber, or anything from src/world — that's what
// keeps this route's bundle free of the WebGL payload. Enforced by the
// lazy() boundary around ExperienceRoute in App.tsx, not by convention
// alone, but worth keeping in mind when editing this file.
export default function FlatResumeRoute() {
  return (
    <main className="flat-resume">
      <header className="flat-resume__header">
        <h1>Your Name</h1>
        <p>{about.bio}</p>
        <a className="flat-resume__cta" href="/resume.pdf">
          Download Resume (PDF)
        </a>
      </header>

      <section aria-labelledby="skills-heading">
        <h2 id="skills-heading">Skills</h2>
        <ul className="flat-resume__tags">
          {about.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="projects-heading">
        <h2 id="projects-heading">Projects</h2>
        <ul className="flat-resume__projects">
          {projects.map((project) => (
            <li key={project.slug} className="flat-resume__project">
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              <p className="flat-resume__tags">{project.stack.join(' · ')}</p>
              <div className="flat-resume__links">
                {project.links.live && <a href={project.links.live}>Live</a>}
                {project.links.repo && <a href={project.links.repo}>Code</a>}
                {project.links.caseStudy && (
                  <a href={project.links.caseStudy}>Case study</a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading">Contact</h2>
        <a href={`mailto:${contact.email}`}>{contact.email}</a>
        <ul className="flat-resume__socials">
          {contact.socials.map((social) => (
            <li key={social.url}>
              <a href={social.url}>{social.label}</a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flat-resume__footer">
        <a href="/">View the full 3D experience &rarr;</a>
      </footer>
    </main>
  );
}
