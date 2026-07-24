# Phase 5 Implementation Plan: Stories Page

This plan details the implementation of the `/stories` page based on the provided reference design.

## Proposed Changes

### 1. Page Layout Structure (`src/pages/stories.astro`)
- Base the page on the existing `<Layout>` component for a consistent 1280px container width.
- Create a single-column layout containing the Hero Title, Filter Tabs, and the Story Card List.

### 2. Hero Title
- Text: "MOMENTS,<br/>IN WORDS."
- Styling: `56px` font size, `800` font weight (Hero size).
- Gradient: Apply a gradient text effect (`bg-gradient-to-r from-slate-900 to-blue-600 text-transparent bg-clip-text`) to achieve the requested dark navy to primary blue transition.

### 3. Filter Tabs
- A horizontal flex container for category pill buttons.
- **Tabs**: "전체 (10)", "일상 (1)", "프로젝트 (1)", "JavaScript (4)", "Web (4)".
- **Styling**:
  - Active Tab (전체): Light purple/blue background (`bg-blue-50` or `bg-indigo-50`) with primary text color.
  - Inactive Tabs: Gray border/background, muted text, with hover states.
- A right-aligned chevron down icon button (`v`) as shown in the mockup.

### 4. Story List (Horizontal Cards)
A vertical stack of horizontal story cards with generous spacing (`gap-6` or `gap-8`).
Each card will be a flex container (border, rounded corners) split into two sections:
- **Left Side (Thumbnail)**:
  - Width: Fixed to about `280px` to `320px`.
  - Aspect Ratio: Close to square or 4:3 (as per the "정사각형에 가까운" request).
  - Use `<Image />` component with `object-cover`.
- **Right Side (Content)**:
  - Vertically centered padding.
  - **Meta Data**: Category Label (e.g., Primary blue for "일상", Indigo for "프로젝트") · Date (e.g., "2024.08.04").
  - **Title**: Bold, dark text (`text-[22px] font-[700]`).
  - **Summary**: 1-line truncated body text (`line-clamp-1` or `line-clamp-2`), `text-text-body`.

### 5. Assets
- Copy the existing `hwanhee-mockup.png` into 3 new placeholder files (`story-thumb-1.png`, `story-thumb-2.png`, `story-thumb-3.png`) in `src/assets/images/` and wire them up using the Astro `<Image />` component.
