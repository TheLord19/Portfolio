// Shared content schema. Both the flat /resume route and the OS-layer
// windows (once built, Phase 5) read from the same content/*.ts modules
// via these types — this is the seam that keeps presentation (flat page,
// retro-OS windows, and eventually a v2 VR skin) decoupled from data.

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
  bio: string;
  skills: string[];
  timeline: { year: number; label: string }[];
}

export interface ContactContent {
  email: string;
  socials: { label: string; url: string }[];
}
