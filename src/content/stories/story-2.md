---
title: "Astro 블로그 회고"
date: "2023-12-04"
category: "프로젝트"
description: "Astro 템플릿과 Tailwind CSS를 이용해 개인 기술 블로그 및 포트폴리오를 제작하면서 느낀 장단점을 고성능 관점에서 정리했습니다."
tags: ["Astro", "프로젝트", "회고"]
thumbnail: ../../assets/images/stories/story-2/thumb.png
---

## 1. 왜 Astro였는가?
최근 모던 프론트엔드 프레임워크 생태계에서는 블로그나 스태틱 콘텐츠 사이트를 제작할 때 **Next.js**, **Gatsby**, 그리고 **Astro** 등 수많은 강력한 선수들이 경합하고 있습니다. 이 중에서 Astro가 갖는 독보적인 매력은 바로 **"Zero JS by Default (기본 자바스크립트 제로화)"**와 아일랜드 아키텍처(Islands Architecture)입니다.

### 아일랜드 아키텍처의 황홀감
정적 텍스트로 가득 찬 마크다운 본문 페이지를 로드하기 위해 무거운 React 번들을 매번 다운로드할 이유가 전혀 없습니다. Astro는 빌드 시점에 완벽한 순수 HTML과 바닐라 CSS로 프라이드를 유지시키며, 상호작용이 정말 필요한 검색 모달이나 토스트 알림 컴포넌트에만 부분적으로 하이드레이션(Hydration)을 부여합니다.

---

## 2. 개발 겪었던 고충과 성과
처음 Astro의 `.astro` 구문(Frontmatter 영역과 HTML 구문의 융화)에 적응하는 것은 JSX와 템플릿 엔진 사이의 절묘한 감미로움을 안겨주었습니다.

- **성과**: Lighthouse 성능 테스트에서 손쉽게 Performance, Accessibility, Best Practices, SEO 전 영역 100점에 수렴하는 압도적 속도를 달성했습니다.
- **아쉬웠던 점**: 클라이언트 측 라우팅을 돕는 View Transitions API가 매우 쾌적한 UX를 보장하지만, 일부 자바스크립트 DOM 이벤트 리스너가 페이지 전환 시 재로드되지 않는 현상이 발생해 `astro:page-load` 훅으로 일일이 이식해야 하는 교훈을 깨달았습니다.
