# Jinyeong Lab Portfolio - Phase 1 Implementation Plan

This plan covers setting up the initial Astro project with Tailwind CSS, establishing the requested design system, and implementing the `Header`, `Footer`, and `Home` page (/).

## Proposed Changes

### 1. Configuration & Design System Setup
- Install `@astrojs/tailwind` and `tailwindcss` integrations to enable styling.
- Update `astro.config.mjs` to include the Tailwind integration.
- Create `tailwind.config.mjs` containing the exact color palette, typography (Inter & Pretendard), font sizes, border radii, and shadows specified in the prompt.
- Create a `src/styles/global.css` file to import fonts (Inter via Google Fonts, Pretendard via web font CDN) and define base global styles (background colors, text colors) leveraging Tailwind.

### 2. Common Layout Components
#### [NEW] `src/layouts/Layout.astro`
- Provide the basic HTML shell, injecting the global styles.
- Include the shared `Header` and `Footer` components.
- Wrap page-specific content in a semantic `<main>` tag with max-width and padding constraints.

#### [NEW] `src/components/Header.astro`
- Implement the top navigation bar.
- Include the "Jinyeong Lab" logo on the left.
- Render navigation links (About, Projects, Notes, Stories, Tags, Contact).
- Include a Search input and Theme toggle on the right side.

#### [NEW] `src/components/Footer.astro`
- A minimal footer containing the copyright notice ("© 2024 Jinyeong Yoo. All rights reserved.") and the tagline ("Every great thing starts small.").

### 3. Home Page Implementation
#### [MODIFY] `src/pages/index.astro`
- Will use the `Layout` component.
- **Hero Section:**
  - "Hi, I'm Jinyeong" badge.
  - "Learning more, Growing better." bold heading.
  - Short introduction text.
  - "Carpe diem." handwriting text.
  - Call-to-action buttons (프로젝트 보기, 개인 공부 기록, 스토리 보기).
  - Placeholder for the Hero Illustration via Astro's `<Image />` component.
- **Stats Section:**
  - A grid/row displaying counts for Projects, Notes, Research, and GitHub Contributions.
- **Latest Stories Section:**
  - A grid of three "LATEST STORIES" cards featuring an image placeholder, tags, title, and date.

### 4. Image Placeholders Setup
- Provide a clear directory structure and naming convention for the user to replace these images later (e.g., `src/assets/hero-illustration.png`, `src/assets/latest-1.jpg`).
- Set up temporary UI placeholder blocks that map exactly to these `src/assets/` paths using Astro's built-in `<Image />`.
