# Jinyeong Lab Portfolio - Phase 2 Implementation Plan

This plan covers the implementation of the `About` page (`/about`) based on the provided design specifications.

## Proposed Changes

### 1. `src/pages/about.astro`
- **Page Layout**: Ensure it uses the common `Layout.astro` so the 1280px container width and centering rules are perfectly applied, matching the Home page.
- **Introduction Section**:
  - Title: Large "About" heading.
  - Subtitle: "AI ENGINEER" (uppercase, tracking spaced).
  - Introduction text: Three short paragraphs providing a personal introduction and vision.
  - Social Icons: 4 circular buttons with hover effects (Mail, GitHub, LinkedIn, Website/Other icon placeholders).
  - Profile Image Placeholder: A 3:4 aspect ratio placeholder element for the profile picture, using Astro `<Image />` mapped to `src/assets/images/profile-image.png`.
- **Profile Details Card**:
  - A card element with a soft shadow and border radius matching the design system.
  - Title "Profile".
  - Key-value layout for Name, Birth, Contact, Email, and Interests.
- **Currently Working On Card**:
  - A card element matching the profile details card.
  - Title "Currently Working On".
  - A list of 4 ongoing projects using bullet points or custom check icons.
  - A 16:9 placeholder for a laptop illustration (`src/assets/images/working-on-illustration.png`) on the right side of the card.

### 2. Assets to Generate
- Placeholder images will be generated for:
  - `profile-image.png`
  - `working-on-illustration.png`
