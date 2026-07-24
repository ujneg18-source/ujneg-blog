# Phase 8 Implementation Plan: Global Features

This plan covers the implementation of Dark Mode, the Search Modal using Pagefind, and the Footer redesign across the entire site.

## Proposed Changes

### 1. Dark Mode Toggle
- **Tailwind v4 Setup**: Add `@custom-variant dark (&:where(.dark, .dark *));` to `src/styles/global.css` to enable the class-based dark mode strategy.
- **FOUC Prevention**: Inject an inline `<script>` into the `<head>` of `Layout.astro` to synchronously check `localStorage.theme` or system preference and apply the `dark` class to `<html>` before the page renders, preventing flashing.
- **Header Toggle**: Update the Sun/Moon icon in `Header.astro` to toggle the `dark` class and save the preference to `localStorage`. Add an animation for a smooth icon transition.
- **Color Palette Application**: 
  - Background: `dark:bg-[#0F172A]`
  - Surface/Card: `dark:bg-[#1E293B]`
  - Text: `dark:text-[#F1F5F9]`
  - Border: `dark:border-[#334155]`
  - I will review and update **all 7 pages** to ensure text, backgrounds, and borders adapt perfectly to this dark palette.

### 2. Search Functionality (Pagefind)
- **Integration**: We will use the `astro-pagefind` integration (or raw Pagefind via `npm run build` hook).
- **Search UI (Modal)**: 
  - Create a new `SearchModal.astro` component (included in Layout).
  - **Design**: Dark translucent backdrop (`backdrop-blur`), white center modal (dark in dark mode).
  - **Empty State**: Icon with "어떤 글을 찾고 있나요?"
  - **Keyboard Shortcuts**: Open with `Ctrl+K` or `Cmd+K`, close with `Esc`, navigate with `↑/↓`, select with `Enter`. Footer bar describing these shortcuts.
- **Search Engine Logic**: 
  - Dynamically load `/pagefind/pagefind.js` on modal open.
  - Display results (Title, Category, Excerpt).
  - Add `data-pagefind-body` to the relevant content blocks in Notes, Stories, and Projects to index them correctly.

### 3. Footer Redesign & Sticky Layout
- **Footer Updates**: 
  - Centered layout for social icons (GitHub, LinkedIn, Email, X).
  - Copyright text directly below the icons.
  - Adaptive styling for dark mode.
- **Sticky Bottom**: 
  - Ensure the `<body>` in `Layout.astro` has `flex flex-col min-h-screen` and the `<main>` wrapper has `flex-1` to push the footer to the absolute bottom of the viewport, even on short pages.
