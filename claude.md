# CLAUDE.md — instructions for AI coding sessions

> **Not setup documentation.** If you are a person trying to run these projects,
> read [README.md](README.md) instead. This file only steers AI assistants working
> in this repo.

## Local servers

Two projects, both on port 3000 — run one at a time.

| Project | Start | Serves |
|---|---|---|
| `static_page` | `npm start` (runs `serve.mjs`) | `http://localhost:3000` |
| `dynamic_page` | `npm run dev` | client `http://localhost:3000`, API `http://localhost:4000` |

- Always serve over localhost — never open a `file:///` URL.
- If a server is already running, do not start a second instance.
- `dynamic_page` needs no database to run; with none configured it falls back to an
  in-memory store.

## Frontend work

### Reference images
- If a reference image is provided: match layout, spacing, typography, and color
  exactly. Swap in placeholder content (images via `https://placehold.co/`, generic
  copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Compare your output against the reference and fix mismatches. Be specific when
  comparing: "heading is 32px but reference shows ~24px", "card gap is 16px but
  should be 24px". Check spacing/padding, font size/weight/line-height, colors
  (exact hex), alignment, border-radius, shadows, image sizing.

### Output defaults
- Single `index.html` file, all styles inline, unless the user says otherwise.
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive.

### Brand assets
- Check for a `brand_assets/` folder before designing. It may contain logos, color
  guides, style guides, or images.
- If assets exist there, use them — do not use placeholders where real assets are
  available. If a color palette is defined, use those exact values; do not invent
  brand colors.

## Anti-generic guardrails

These describe how both pages in this repo were actually built — match them.

- **Colors:** Never use the default Tailwind palette (indigo-500, blue-600, etc.).
  Pick a custom brand color and derive from it.
- **Shadows:** Never use a flat `shadow-md`. Use layered, color-tinted shadows with
  low opacity.
- **Typography:** Never use the same font for headings and body. Pair a
  display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large
  headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via an SVG noise
  filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`.
  Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and
  active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color
  treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating),
  not all sit at the same z-plane.

## Hard rules

- Do not add sections, features, or content not in the reference.
- Do not "improve" a reference design — match it.
- Do not use `transition-all`.
- Do not use default Tailwind blue/indigo as a primary color.
