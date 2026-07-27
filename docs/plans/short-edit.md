# 단기 수정 기록 (Short Edits)

## 2026-07-25: 레이아웃 및 폰트 스타일 미세 조정

### 1. 전체 레이아웃 폭 축소
- **배경**: 콘텐츠 영역이 다소 넓어 시선이 분산되는 느낌을 개선.
- **작업 내용**: 
  - `src/styles/global.css`에서 `--layout-max-width`를 `1152px`에서 `1024px`로 소폭 축소.

### 2. 헤더 하단(Hero 섹션) 상단 여백 통일
- **배경**: Home, Stories, Tags, Contact 페이지마다 상단 여백이 달라 시각적 불균형 발생.
- **작업 내용**: 
  - `Layout.astro`의 `<main>` 태그 상단 패딩을 `pt-[32px] md:pt-[64px]`로 일괄 축소하여 모든 페이지의 기본 여백을 통일.
  - Home 페이지의 네거티브 마진(`-mt-6`), Stories 페이지의 `pt-8`, Contact 페이지의 `py-12` 등 개별 하드코딩 여백 제거.

### 3. 헤드라인 텍스트 스타일 및 그라데이션 일괄 통일
- **배경**: 페이지별 헤드라인 폰트 크기와 그라데이션 강도가 다르고, 다크모드에서 일부 글자가 보이지 않는 문제 해결.
- **작업 내용**:
  - `global.css`에 공통 유틸리티 클래스 생성:
    - `.text-hero-heading`: 기본 텍스트 폰트 (`font-[800] text-[44px] md:text-[56px] text-text-title`)
    - `.text-gradient-hero`: 그라데이션 효과 (`from-indigo-800 via-indigo-500 to-sky-400` / 다크모드 대응 포함)
  - Home, Projects, Stories, Contact 4개 페이지의 헤드라인을 위 공통 클래스로 교체 적용하고 Contact 페이지 텍스트를 좌측 정렬로 복구.

---

## 2026-07-25 (추가): Home 메인 개편 및 캐러셀 2중 드래그 방호 조치

### 1. Home 메인 통계 섹션 실데이터 연동
- **작업 내용**:
  - `projects`, `notes`, `stories` 컬렉션을 `getCollection()`으로 연계하여 각 실제 게시글 및 프로젝트 개수를 정밀 출력.
  - 기존 'Research' 항목 라벨을 'Stories'로 변경하고 성격에 맞는 알맞은 아이콘으로 리셋.
  - 'GitHub Contributions' 수치를 실제 개인 레포지토리 규모(7~8개)와 매칭되는 현실적인 숫자(`24`)로 교정.

### 2. Home 'Latest Updates' 통합 캐러셀 구축 및 미학 리셋
- **작업 내용**:
  - Projects, Notes, Stories 전체 컬렉션을 합산 후 날짜 최신순으로 정렬하여 상위 6개 항목을 동적 캐러셀로 구성.
  - 각 카드 썸네일 위의 컬러 배지("Note · Tech" 등)를 제거해 여유롭고 쾌적한 썸네일 화면 확보.
  - 섹션 제목을 원래 디자인인 단정하고 미니멀한 대문자 캡션 스타일(`text-sm font-bold tracking-widest text-text-secondary uppercase mb-8`)로 100% 롤백.

### 3. 고경도 드래그 UX 및 오입력 차단 시스템 적용 (Home & Contact 페이지)
- **작업 내용**:
  - **드래그 감도 저감 (Speed Optimization)**: 스크롤 이동 가속도를 2배수에서 `1.1배수`로 완화하여, 당기는 손맛과 시선이 1:1로 자연스럽게 따라오는 촉감 구현.
  - **양옆 좌우 화살표 컨트롤러 배치 (`<`, `>`)**: 카드 섹션 트랙의 좌·우측 정중앙 가장자리에 글래스모피즘 기반의 예쁜 라운드 화살표 버튼을 부착하여 버튼 조작만으로도 편리한 스와이프 탐색 제공.
  - **Hold-Only Drag (마우스 뗐을 때 즉시 해제)**: 마우스를 이동(`mousemove`)할 때 물리 마우스 버튼 들림 여부(`e.buttons === 0`)를 실시간 추적하고, 전역 `window.mouseup` 이벤트를 병행하여 브라우저 외곽 및 카드 밖에서 마우스를 놓아도 '유령 드래그'가 무조건 퇴출되고 멈추도록 개선.
  - **Click Suppression (꾹 누르는 중 오작동 100% 방지)**: 마우스를 3px 이상 이동(드래그)하거나 **0.25초 이상 꾹 누르고(Hold) 있을 경우**, 링크 방문 및 이미지 선택 끌기(`dragstart`) 이벤트를 즉각 회수 및 가로채(`e.preventDefault()`, `e.stopPropagation()`), 꾹 누른 상태에서 슬라이드를 만지는 동안 엉뚱한 상세 페이지로 튕기는 오입력을 완벽히 근절.
  - **Contact 동기화**: 위 2중 방호(Hold-Only & Click Suppression) 시스템을 `contact.astro` 오픈소스 캐러셀에도 동일하게 이식하여 웹사이트 전체에 걸쳐 견고한 UX를 달성.

### 4. About 페이지 프로필 이미지(카카오 스타일) 개편 및 타이포그래피 정렬
- **작업 내용**:
  - **파일명 정제**: 괄호가 포함되어 경로 문제를 일으킬 수 있는 `profile-image(kka).png` 파일을 `profile-image-kka.png`로 하이픈 교체 및 명명 표준화.
  - **와이드 레이아웃 적용 (방법 B 채택)**: 이미지 자체가 좌측 공백과 우측 원형 일러스트로 기획된 가로형이므로, 일부 크롭(방법 A) 대신 **배너 영역 전체를 사용하는 방법 B**로 판단 및 적용. 좌측 공백에는 소개 텍스트가 자연스럽게 올라가고, 우측 공간에는 인물+강아지 일러스트가 위치하는 최적 구도 완성.
  - **라이트/다크모드 완벽 대응 그라데이션**: 라이트모드(`from-white/95 via-white/85 to-transparent`)와 다크모드(`dark:from-slate-900 dark:via-slate-900/85 dark:to-slate-900/35`, `dark:brightness-[0.85]`)용 정교한 그라데이션 오버레이 및 필터를 부착해 배경색과 이질감 없이 고급스럽게 녹아들도록 처리.
  - **헤더 텍스트 순서 및 스타일 원복**: `"AI ENGINEER"` 텍스트를 블루 알약형(Pill) 배지에서 기존의 심플한 회색 텍스트(`text-sm font-bold tracking-widest text-text-secondary uppercase`)로 복원하고, 위치를 
  `"About Me"` 제목 바로 위로 상향 배치하여 균형 잡힌 간격(`gap-2`)으로 정렬 완료.

### 5. 블로그 포스팅 편의성 강화 및 마크다운 본문/목차 UI 대대적 업그레이드
- **작업 내용**:
  - **콘텐츠 스키마 유연화 (`src/content.config.ts`)**: `thumbnail`, `githubUrl` 등의 선택 항목이 비어 있거나(`null`), `status`에 커스텀 상태값을 적어도 빌드 오류가 발생하지 않도록 `.nullable()` 및 `z.string().default('Completed')`로 안전망 구축.
  - **여러 줄 Description 줄바꿈 유지**: `whitespace-pre-line`을 프로젝트 카드 및 상세페이지 설명글(`description`) 영역에 적용하여, YAML의 파이프(`|`) 기호로 줄바꿈한 본문 그대로 화면에 자연스럽게 렌더링되도록 개선.
  - **마크다운 전용 폰트 크기 및 스타일 정립 (`.prose`)**: Tailwind CSS v4 초기화 룰로 인해 평탄화되었던 마크다운 제목(`# ~ ###`)에 대형 폰트 크기(`28px`, `23px`, `19px`)와 굵기(`800`, `700`), 하단 경계선을 부여하고, 리스트 bullet 색상 고도화 및 백틱(` `) 단어용 코드 칩 배지 스타일링을 `global.css`에 구축.
  - **TOC 'ON THIS PAGE' 맨위로 이동 버튼 전환**: 목차(TableOfContents)의 우측 측면 메뉴 타이틀(`ON THIS PAGE`) 및 상단 박스 메뉴 타이틀(`목차`) 클릭 시 스무스하게 최상단으로 이동하는 스크롤 기능(`data-toc-scroll-top`)과 마우스 호버 화살표 애니메이션을 탑재해 이동 편의성 극대화.
  - **포스팅 완강 사용 설명서 마련**: `docs/POSTING_GUIDE.md` 파일을 발간하여 카테고리별 마크다운 문법, 줄바꿈 방법, 이미지 캐러셀 자동 생성 규칙 및 예제 코드를 프로젝트 내에 영구 보존.