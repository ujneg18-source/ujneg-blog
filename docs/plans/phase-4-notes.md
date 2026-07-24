# Phase 4 Implementation Plan: Notes Page

This plan details the implementation of the `/notes` page, featuring a left sidebar for categories/stats and a right main area for the post list.

## Proposed Changes

### 1. Page Layout Structure (`src/pages/notes.astro`)
- Use the existing `<Layout>` component for the common header, footer, and 1280px container.
- Implement a two-column grid layout for the `<main>` content area: `grid-cols-1 md:grid-cols-[260px_1fr]` with a generous gap (e.g., `gap-16` or `gap-12`).
- *Mobile behavior*: Based on user approval, the sidebar will stack vertically above the main content on mobile screens.

### 2. Left Sidebar Component
The sidebar will have a fixed width of `260px` (on desktop) and contain two main sections:
- **전체 방문자 (Visitor Stats)**:
  - A clean vertical list displaying "오늘" (Today), "어제" (Yesterday), and "전체" (Total).
  - Values will be right-aligned or distinctly spaced for easy reading.
- **전체 카테고리 (Category Tree)**:
  - A hierarchical list (2 levels: Category > Sub-category).
  - Each item will show its post count in parentheses (e.g., `Tech (52)`).
  - Sub-categories will be indented vertically with a visual indicator (like a subtle left border or padding).
  - Will include hover effects using the design system's primary color.

### 3. Right Main Content (Post List)
A vertical list of blog posts, separated by subtle borders (`border-b border-border/50`).
Each post item will be a flex container with:
- **Left Content Area**:
  - **Title**: Large, bold font (`text-[20px]` or `22px`), `text-text-title`.
  - **Summary**: 2-line truncated text (`line-clamp-2`), `text-text-body`.
  - **Meta Information**: A row at the bottom displaying `[Category] · [Date] · [Comments]`. Icons (SVG) will be used for the category list icon and the comment bubble.
- **Right Thumbnail**:
  - A square image (`aspect-square`), approximately `140px` by `140px`.
  - Will use placeholder images generated during execution.
  - Rounded corners matching the design system (`rounded-[var(--radius-card)]` or similar).

### 4. Pagination
- A simple, centered pagination control at the bottom of the post list.

### 5. Assets
- Generate 3 distinct square placeholder images (`note-thumb-1.png`, `note-thumb-2.png`, `note-thumb-3.png`) in `src/assets/images/` to be used for the dummy data.
