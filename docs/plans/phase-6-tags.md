# Phase 6 Implementation Plan: Tags Page

This plan details the implementation of the `/tags` page based on the provided reference designs.

## Proposed Changes

### 1. Page Layout Structure (`src/pages/tags.astro`)
- Use the existing `<Layout>` component for consistent styling and a 1280px container.
- The page will be vertically divided into two main sections: **Content Archive** (Top) and **Tag Cloud** (Bottom).

### 2. Top Section: Content Archive
- **Layout**: A 3-column grid (`grid-cols-1 md:grid-cols-3`) to separate content by type.
- **Columns**: "Projects", "Notes", "Stories".
- **List Items**: Each column will contain an unordered list (`ul`) of items.
  - Format: `{Date} - {Title}` (e.g., `2024.05.20 - Pandas groupby 완벽 정리`).
  - **Navigation**: Instead of standard `<a href>` links, list items will have `data-href` attributes. Client-side JS will attach a `click` event listener to programmatically navigate to the page (e.g., `window.location.href = item.dataset.href`), fulfilling your request for explicit movement handlers.
  - **Filtering Support**: Each list item (`<li>`) will include a `data-tags` attribute (e.g., `data-tags="Python,Backend"`) so it can be filtered by the Tag Cloud below.

### 3. Bottom Section: Tag Cloud
- **Header**: "23 TAGS" (title).
- **Layout**: A flex container (`flex flex-wrap gap-3`) displaying tags as pill-shaped buttons.
- **Visual Weighting**: 
  - High-frequency tags: Larger font size, darker text, bolder weight (e.g., `text-[15px] font-[600] text-gray-800`).
  - Low-frequency tags: Smaller font size, lighter text (e.g., `text-[13px] font-[500] text-gray-500`).
- **Tag Count**: Display the frequency number next to the tag name in a small circular badge (e.g., `#웹 3`).

### 4. Client-side JavaScript (Filtering & Navigation)
- **Tag Filtering**: Clicking a tag in the cloud will:
  1. Highlight the selected tag (active styling).
  2. Iterate through all archive list items across the 3 columns and toggle their visibility (`display: none`) based on whether their `data-tags` attribute contains the selected tag.
  3. Clicking an active tag again will reset the filter, showing all items.
- **Explicit Navigation**: Attach `click` handlers to the archive list items to trigger `window.location.href = dataset.href`.
