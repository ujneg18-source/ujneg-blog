# Phase 7 Implementation Plan: Contact Page (Revised)

This revised plan details the new interactive, carousel-based architecture for the `/contact` page.

## Proposed Changes

### 1. Page Layout Structure (`src/pages/contact.astro`)
- Use the existing `<Layout title="Contact">` wrapper.
- Since we are using a horizontal carousel, we will use the standard wide container width (`max-w-7xl` or inherited from Layout) rather than the narrow essay-style width.

### 2. Top Section: Open Source Interactive Carousel
- **Header**: A bold title like "Open Source" with a 1-line description (e.g., "오픈소스 기여 및 개인 프로젝트 아카이브").
- **Draggable Carousel Container**:
  - A horizontal flex layout (`flex flex-row overflow-x-auto gap-6`) with scrollbars hidden via CSS (`scrollbar-width: none` and webkit pseudo-classes).
  - **Interaction (JS)**: Implemented with `mousedown`, `mousemove`, `mouseup`, and `mouseleave` events to allow users to click and drag the track horizontally.
  - **Navigation Controls**: Left and Right arrow buttons floating on the edges to scroll programmatically.
- **3D Flip Cards**:
  - CSS 3D Transforms: Utilizing `perspective`, `preserve-3d`, and `backface-visibility: hidden` for a premium hardware-accelerated flip animation (`rotateY(180deg)`).
  - **Trigger**: Flips on hover (`group-hover`) for desktop. For mobile devices, JavaScript will attach a tap/click listener to toggle a `.is-flipped` class.
  - **Front Side**: Minimalist design featuring an Icon (GitHub/Hugging Face) and the Repository/Model Name.
  - **Back Side**: Rotated 180 degrees initially. Contains a short description, tech stack badges, and an external link button ("View on GitHub").

### 3. Bottom Section: Guestbook (Giscus)
- **Title**: "방명록 (Guestbook)"
- **Giscus Placeholder**:
  - HTML comment injected: `<!-- Giscus embed here, need repo connection -->`.
  - A visual grey placeholder box (`h-[300px] bg-gray-50 border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-text-muted`) with descriptive text indicating that users will be able to leave comments using their GitHub accounts once the repository is linked.
