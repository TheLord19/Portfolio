import type { Project } from './types';

// Pulled from github.com/TheLord19's public repos (GitHub REST API + READMEs,
// 2026-08-19). Summaries/descriptions are lightly edited from each repo's
// README, not fabricated. Still TODO: `role` is a guess (all repos read as
// solo/author-owned — confirm), thumbnails are all placeholder (no repo has
// a social-preview/screenshot image to pull), and `caseStudy` links are
// unset. Reorder/toggle `featured` to match what you actually want led with.
export const projects: Project[] = [
  {
    slug: 'orthopedic-rag',
    title: 'OrthoInsight',
    summary:
      'AI-powered orthopedic research assistant: RAG chat over PubMed literature plus a 17-model deep-learning ensemble for X-ray abnormality detection.',
    description:
      'A multi-modal clinical decision-support prototype. The chat side runs a real retrieval-augmented-generation pipeline — queries hit the PubMed E-utilities API, abstracts are embedded locally and ranked with FAISS, then synthesised into a grounded, cited answer. The X-ray side runs a 17-model ensemble (EfficientNet-B6/B4 + DenseNet169) trained on the Stanford MURA v1.1 dataset, reaching 90.33% validation accuracy, exported to ONNX for inference. Ships with a fully working simulated mode so the frontend runs standalone with no backend or API keys.',
    stack: ['Next.js', 'FastAPI', 'PyTorch', 'ONNX', 'FAISS', 'OpenAI API'],
    role: 'Solo developer',
    year: 2025,
    links: {
      repo: 'https://github.com/TheLord19/Orthopedic-rag',
      live: 'https://orthopedic-rag.vercel.app',
    },
    media: { thumbnail: '/placeholder-thumb.svg' },
    featured: true,
  },
  {
    slug: 'annotron',
    title: 'AnnoTron',
    summary:
      'Web-based YOLO11 annotation tool with a hardware-aware backend that adapts model choice to the machine it is running on.',
    description:
      'A computer-vision annotation tool built on Ultralytics YOLO11. Before loading a model, the Flask backend inspects available GPU VRAM/CPU and issues non-blocking warnings rather than letting an under-resourced machine silently stall or crash on a model too large for it — the UI surfaces those warnings without stopping the user. Supports the full YOLO11 size range (nano through extra-large), with weights auto-downloaded and cached on first use.',
    stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Flask', 'PyTorch', 'Ultralytics YOLO'],
    role: 'Solo developer',
    year: 2025,
    links: {
      repo: 'https://github.com/TheLord19/AnnoTron',
    },
    media: { thumbnail: '/placeholder-thumb.svg' },
    featured: true,
  },
  {
    slug: 'agriflow',
    title: 'AgriFlow',
    summary:
      'A nation-scale agricultural supply-chain integrity system built for a government client, using a hybrid database + hash-chain architecture instead of a full blockchain.',
    description:
      "Designed around what it calls the 'blockchain scalability paradox': a public ledger is too slow for millions of daily transactions, but a plain database is too easy to tamper with undetected. AgriFlow splits the difference — a fast Postgres layer handles real-time writes, while every 15-second batch is hashed into a Merkle root and sealed into an append-only ledger table. Any change to already-anchored data breaks the hash and is flagged red in the dashboard immediately. Includes role-gated access (viewer/validator/commissioner), live sync over Socket.io, and yield-physics fraud checks specific to the grain-milling domain it was built for.",
    stack: ['React', 'Vite', 'Node.js', 'Express', 'PostgreSQL', 'Socket.io'],
    role: 'Solo developer',
    year: 2026,
    links: {
      repo: 'https://github.com/TheLord19/Agriflow',
    },
    media: { thumbnail: '/placeholder-thumb.svg' },
    featured: true,
  },
  {
    slug: 'psai-power-website',
    title: 'PSAI POWER',
    summary:
      'Bilingual marketing site for a power-engineering firm, covering grid modernization and renewable-integration services across utility, industrial, and government clients.',
    description:
      'A client-facing Next.js site for a power-systems engineering firm, built with full English/French toggling (i18next) for a North American audience, and Framer Motion for the transition polish expected of a professional-services site. Covers the firm\'s core service lines — power system design, grid modernization, renewable integration, and maintenance/optimization — targeted at utility, mining, oil & gas, and government sectors.',
    stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'i18next', 'Vitest'],
    role: 'Developer',
    year: 2025,
    links: {
      repo: 'https://github.com/TheLord19/PSAI-POWER-Website',
      live: 'https://psai-power-website.vercel.app',
    },
    media: { thumbnail: '/placeholder-thumb.svg' },
    featured: false,
  },
];
