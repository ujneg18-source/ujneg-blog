# Phase 3 Implementation Plan: Projects Page

Based on the design system and the provided mockup, we will now implement the **Projects Page** (`/projects`).

## Proposed Changes

### 1. `src/pages/projects.astro`
- **Page Layout**: Use the shared `Layout.astro` component to ensure consistent 1280px max-width, center alignment, and padding.
- **Hero/Title Section**: (Full width stacking as requested)
  - Main Heading: "Projects"
  - Hero Text: "IDEAS,<br/>MADE REAL." (Large, bold, primary blue color styling for "MADE REAL.").
  - Subtext: "(8) Projects" count.
- **Featured Project Card**: (Full width below title)
  - A wide, prominent card for "환희 (HWANHEE)".
  - Left side: Title, Description ("LLM 기반 한국어 가독성 분석..."), and tech stack pills (Python, FastAPI, RAG, LLM).
  - Link: "View Project →"
  - Right side: A placeholder image for the project screenshot (`hwanhee-mockup.png`).
- **Project Grid Section**:
  - A 3-column grid layout for the remaining projects.
  - **Card 1**: Bookly (Next.js, TypeScript, MongoDB)
  - **Card 2**: Korean NLP Toolkit (Python, KoNLPy, PyTorch)
  - **Card 3**: AI Study Helper (Streamlit, LangChain, OpenAI)
  - Each card will have a title, short description, tech stack pills matching the design system colors, and a "View Project →" link.
- **Bottom Button**:
  - A centered "View All Projects →" button (or "Load More" functionality placeholder) to match the visual element in the mockup.

### 2. Assets
- Generate placeholder image for the featured project screenshot:
  - `hwanhee-mockup.png` (Aspect ratio 16:9 or similar).
