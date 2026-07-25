# Phase 4: Projects 상세 페이지 확장 및 Stories Content Collection 고도화 최종 계획

## 1. 작업 개요 및 확정 목표
- **Projects 및 Stories 마크다운 전환**: 하드코딩된 목록을 Astro Content Collection 기반으로 재구성하여 데이터 구조를 체계화합니다.
- **Projects 상세 페이지 신설**: `/projects/[slug]` 라우팅을 만들고, Notes 상세 페이지에서 검증된 **좌측 정렬 레이아웃, 상단 박스 목차(TOC), 우측 Sticky 목차 구조(`max-w-[740px]`)**를 100% 동일하게 적용합니다.
- **스크린샷 갤러리 캐러셀 탑재**: 포트폴리오 상세 페이지 본문 내에 좌우 화살표 및 하단 닷(dot) 인디케이터로 조작할 수 있는 전용 캐러셀 갤러리를 신설합니다.
- **명확한 UI/UX 정책 반영**: GitHub 링크가 없는 프로젝트의 버튼 비활성화 처리(`opacity-40, cursor-not-allowed`) 및 상태 배지(`Live` / `Completed`) 표기 규격을 완벽히 준수합니다.

---

## 2. 확정된 디자인 및 도메인 규칙 (Domain Rules)

### 2-1. GitHub 버튼 일괄 규칙
- 버튼 텍스트는 **무조건 `"GitHub"`로 통일** ("Private", "N/A" 등 부가 텍스트 없음).
- `githubUrl`이 존재할 경우: 정상 클릭 버튼 (새 탭 `target="_blank"` 링크).
- `githubUrl`이 없을 경우: `"GitHub"` 텍스트 유지, `opacity-40 cursor-not-allowed select-none pointer-events-none` 클래스를 부여하여 흐릿하고 클릭 비활성화 처리.

### 2-2. 상태 배지 (Status Badge)
- 별도 URL 연동 없이, `status` frontmatter 값(`Live` | `Completed`)을 텍스트와 초록/파랑 상태 원(circle) 아이콘과 함께 우상단/헤더에 표시합니다.

### 2-3. 스크린샷 갤러리 이미지 경로 정격화
- 향후 실사용 교체 시 혼동이 없도록 스크린샷 플레이스홀더 경로 규칙을 명확히 확립합니다:
  - **`src/assets/images/projects/[project-slug]/1.jpg`, `2.jpg`, `3.jpg`...**

---

## 3. 구성 변경 및 아키텍처 다이얼그램
```mermaid
flowchart TD
    subgraph collections["src/content.config.ts"]
        N[notes - 보존]
        B[blog - 보존]
        P[projects <span style='color:green'>[NEW]</span>]
        S[stories <span style='color:green'>[NEW]</span>]
    end

    subgraph projects_domain["Projects Domain"]
        P -->|getCollection| P_List["/projects (목록)"]
        P_List -->|View Project| P_Detail["/projects/[slug] (상세)"]
        P_List -->|GitHub URL 유무| P_Btn["GitHub 활성 / 비활성 버튼"]
        P_Detail --> TOC["TableOfContents.astro (box & sticky)"]
        P_Detail --> Carousel["ProjectCarousel.astro <span style='color:green'>[NEW]</span>"]
        Carousel --> Img["src/assets/images/projects/[slug]/*.jpg"]
    end

    subgraph stories_domain["Stories Domain"]
        S -->|getCollection| S_List["/stories (목록)"]
        S_List --> S_Tabs["동적 필터 탭 & 개수 계산"]
    end
```

---

## 4. 상세 개발 계획 (Proposed Changes)

### 4-1. Content Collection 설정 및 템플릿 스크립트
#### [MODIFY] [content.config.ts](file:///c:/Users/Playdata/Desktop/ujneg-blog/src/content.config.ts)
- 기존 `blog`, `notes` 컬렉션을 절대 수정하거나 건드리지 않고 원본 보존합니다.
- `projects` 컬렉션 추가:
  - `title`: `z.string()`
  - `period`: `z.string()` (예: "2024.01 - 2024.06")
  - `description`: `z.string()`
  - `techStack`: `z.array(z.string()).default([])`
  - `githubUrl`: `z.string().optional()`
  - `thumbnail`: `image().optional()`
  - `status`: `z.enum(['Live', 'Completed']).default('Completed')`
- `stories` 컬렉션 추가:
  - `title`: `z.string()`
  - `date`: `z.coerce.date()`
  - `category`: `z.string()`
  - `description`: `z.string().optional()`
  - `tags`: `z.array(z.string()).default([])`
  - `thumbnail`: `image().optional()`

#### [NEW] 프로젝트 플레이스홀더 에셋 생성 (`src/assets/images/projects/[slug]/`)
- `hwanhee`, `bookly`, `nlp-toolkit`, `ai-study-helper` 각각의 디렉토리에 1~3개의 플레이스홀더 이미지(SVG 또는 JPG)를 생성하여 1:1 규칙 매칭을 달성합니다.

#### [NEW] 프로젝트 더미 마크다운 파일 4종 (`src/content/projects/`)
1. **`hwanhee.md`**: 환희 (HWANHEE), `githubUrl: 'https://github.com/example/hwanhee'`, `status: 'Completed'`.
2. **`bookly.md`**: Bookly, `githubUrl: 'https://github.com/example/bookly'`, `status: 'Completed'`.
3. **`nlp-toolkit.md`**: Korean NLP Toolkit, `githubUrl` 없음 (비활성화 검증용), `status: 'Completed'`.
4. **`ai-study-helper.md`**: AI Study Helper, `githubUrl: 'https://github.com/example/ai-study'`, `status: 'Live'`.
*※ 모든 글 내부에는 `## 프로젝트 개요`, `### 주요 기능 및 특징`, `## 시스템 아키텍처`, `### 핵심 기술 및 트러블슈팅` 등 계층형 마크다운 헤딩을 풍부하게 작성하여 상단/우측 TOC 렌더링을 보장합니다.*

#### [NEW] 스토리 더미 마크다운 파일 3종 (`src/content/stories/`)
1. **`story-1.md`**: "최근 근황과 블로그 방향에 대해" (`category: '일상'`)
2. **`story-2.md`**: "Astro 블로그 회고" (`category: '프로젝트'`)
3. **`story-3.md`**: "Slick 같은 무한 루프 슬라이드 만들기" (`category: 'JavaScript'`)

---

### 4-2. Projects 목록 및 상세 페이지 컴포넌트
#### [MODIFY] [projects.astro](file:///c:/Users/Playdata/Desktop/ujneg-blog/src/pages/projects.astro)
- `getCollection('projects')`로 기존 4개 하드코딩 카드를 반복문(`projects.map`)으로 전환.
- 각 카드의 상태 표시(Live/Completed 뱃지)를 frontmatter `status` 값에 연동.
- 하단 링크 버튼을 2단 구조(`View Project` + `GitHub`)로 분리 및 `githubUrl` 유무에 따른 `opacity-40 cursor-not-allowed` 적용.

#### [NEW] [ProjectCarousel.astro](file:///c:/Users/Playdata/Desktop/ujneg-blog/src/components/ProjectCarousel.astro)
- 프로젝트 스크린샷 갤러리를 위한 UI 컴포넌트입니다.
- 좌우 화살표(`<`, `>`) 및 하단 인디케이터 닷(dot), 슬라이드 전환 CSS Transition 및 부드러운 자바스크립트 스와이프 제어를 구현합니다.

#### [NEW] `src/pages/projects/[...slug].astro`
- `getStaticPaths` 및 마크다운 본문 `render(post)` 적용.
- Notes 개별 글의 1024px 중앙 배열(`Layout`), `flex items-start justify-between gap-12 w-full`, 좌측 본문(`flex-1 max-w-[740px]`), 우측 Sticky TOC(`hidden lg:block w-[220px] sticky top-28 mt-32`) 레이아웃을 100% 그대로 계승.
- 본문 영역 상단에 프로젝트 메타 정보(Tech Stack 칩, 상태, GitHub 이동 버튼), 상단 박스 목차(TOC), 그리고 신설한 `<ProjectCarousel>` 갤러리 섹션을 세련되게 삽입합니다.

---

### 4-3. Stories 목록 페이지 변환
#### [MODIFY] [stories.astro](file:///c:/Users/Playdata/Desktop/ujneg-blog/src/pages/stories.astro)
- `getCollection('stories')`를 로드하여 날짜 역순 소팅 및 개시.
- `tagCounts`/`categoryCounts` 로직을 집계하여, 상단 탭(전체, 일상, 프로젝트 등) 옆의 숫자 배지를 완전 자동으로 계산하여 표시합니다.

---

## 5. Verification Plan (검증 및 테스트 계획)

### 5-1. 로컬 HTTP 요청 자동 검증 (`Invoke-WebRequest` in Terminal)
작업이 완료되는 즉시 터미널에서 다음 3대 필수 검증 커맨드를 텍스트 기반으로 실행하여 보고합니다:
1. **`/projects` 검증**:
   - HTTP 200 반환 여부.
   - `View Project` 링크 경로(`/projects/...`) 존재 확인.
   - `Korean NLP Toolkit` 카드 내에 `cursor-not-allowed` 및 `opacity-40` 속성을 품은 비활성 `GitHub` 버튼 렌더링 확인.
2. **`/projects/hwanhee` (상세) 검증**:
   - Notes와 동일한 목차 DOM(`<TableOfContents variant="box" />`, `variant="sticky"`) 정상 렌더링 확인.
   - 캐러셀 DOM 컨테이너(`id="project-carousel"`) 및 슬라이더 스크립트 로드 유무 파싱.
3. **`/stories` 검증**:
   - 동적 카운트 계산 결과(예: 전체 3, 일상 1 등) 및 마크다운 리스트 DOM 정상 렌더링 확인.

### 5-2. 사용자 직접 모니터링 안내
- 터미널 텍스트 자동 검증을 통과한 후, 실행 중인 로컬 Dev 서버(`npm run dev`)를 통해 유저분께서 직접 브라우저에서 디자인 및 캐러셀 슬라이드 동작, 비활성 버튼 UI 감정을 확인하실 수 있도록 보고드립니다.
