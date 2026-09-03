// Shared content schema. Both the flat /resume route and the 3D scene's
// floating panels (src/world/ContentPanels.tsx) read from the same
// content/*.ts modules via these types — this is the seam that keeps
// presentation (flat page, spatial panels, and eventually a v2 VR skin)
// decoupled from data. (The OS-layer/window-manager presentation this
// comment used to reference was dropped in the landscape/panels pivot —
// see HANDOVER.md — but the decoupling principle still holds.)

export interface Project {
  slug: string;
  title: string;
  summary: string;
  description: string;
  stack: string[];
  role: string;
  year: number;
  links: {
    repo?: string;
    live?: string;
    caseStudy?: string;
  };
  media: {
    thumbnail: string;
    images?: string[];
  };
  featured: boolean;
}

export interface AboutContent {
  name: string;
  bio: string;
  skills: string[];
  timeline: { year: number; label: string }[];
}

export interface ContactContent {
  email: string;
  socials: { label: string; url: string }[];
}
