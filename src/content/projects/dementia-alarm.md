---
title: "AI 치매 정보 알리미"
period: "2026.07 - 2026.08"
description: |
  치매가 걱정되는 가족을 위한 AI 상담 서비스.
  공공기관 자료를 근거로 증상 · 검진 질문에 답하고,
  가까운 치매안심센터와 예방 콘텐츠를 안내한다.
techStack: ["LangGraph", "OpenAI", "Gemini", "Neo4j", "Qdrant", "Supabase", "FastAPI", "React"]
githubUrl: "https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN31-4th-1Team"
thumbnail: ../../assets/images/projects/dementia-alarm/1.jpg
status: "Completed"
affiliation: "SK네트웍스 Family AI 캠프 31기 · 3–4차 프로젝트"
order: 3
---

## 1. 프로젝트 개요

### 서비스 소개

**AI 치매 정보 알리미**는 치매가 걱정되는 보호자를 위한 서비스다. 전국 치매안심센터 정보(GraphDB)와 치매 조기검진 · 증상 가이드라인 문서(VectorDB)를 결합한 **RAG 기반 AI 상담 챗봇**을 중심으로, 상담 이후의 행동까지 이어지도록 **센터 찾기 지도, 오늘의 대화, 예방 콘텐츠, 두뇌 게임**을 함께 제공한다.

- 보호자가 증상을 설명하면 VectorDB에 적재된 가이드라인을 근거로 안내하고, 거주 지역을 알려주면 가까운 치매안심센터의 위치 · 운영기관 · 제공 프로그램 정보를 GraphDB에서 찾아 연결한다.
- LangGraph 기반 AI 에이전트가 질문 내용에 따라 어떤 Tool을 쓸지 스스로 판단한다. 정적인 체인 대신, LLM과 Tool이 답이 나올 때까지 왕복하는 **ReAct 에이전트** 루프를 사용했다.
- 3차에서 챗봇 코어(에이전트, GraphDB, VectorDB)를 완성하고, 4차에서 그 코어를 감싸는 회원 관리, 예방 콘텐츠, 두뇌 게임, 센터 찾기 지도, 자기관리 저널(오늘의 대화)까지 갖춘 하나의 완결된 서비스로 확장했다.

| 항목 | 내용 |
|------|------|
| 기간 | 2026.07.09 ~ 2026.08.07<br>SK네트웍스 Family AI 캠프 3차(LLM) · 4차(AI 애플리케이션) 단위 프로젝트 |
| 팀원 | 건망검진 5인 (4차 4인) |
| 담당 업무 | 프로젝트 기획, 산출물 관리, 데이터 수집 및 전처리, GraphDB 설계 및 구축, GraphDB Tool 개발<br>Git 형상 관리 |
| 기술 스택 | **AI** LangGraph · LangChain · OpenAI · Gemini<br>**DB** Neo4j AuraDB · Qdrant Cloud · Supabase<br>**Backend** FastAPI · Render<br>**Frontend** React · Vite · Kakao Map · Vercel |

👉 **[AI 치매 정보 알리미 보러가기](https://dementia-front.vercel.app)**

---

## 2. 프로젝트 기획

### 2.1 문제 정의

![치매 정보 수요와 치매안심센터 인지도 vs 실제 방문 경험률](/images/projects/dementia-alarm/awareness.jpg)

- 국내 치매 환자 수는 **2026년 100만 명**을 넘어서고, 2044년에는 200만 명을 넘어설 것으로 전망된다. 치매는 더 이상 일부의 문제가 아니라 우리 사회 전체가 마주할 과제가 되었다.
- 중앙치매센터의 「2025년 치매 인식도 조사」(전국 성인 1,200명 대상)를 보면, '아는 것'과 '실제 이용'은 전혀 다른 이야기였다. **치매안심센터 인지도는 49.4%** 였지만 **실제 방문 경험률은 12.1%** 로 오히려 낮아졌다.
- 국민이 가장 필요로 하는 정보는 **예방 및 치료(76.2%)**, **원인 및 증상(49.9%)** 순으로, 조기 대응에 대한 수요는 분명하다.

센터가 있다는 건 알아도 실제로 가지는 않는다. 그래서 **초기 증상 정보에 쉽게 닿고, 그 대화가 가까운 치매안심센터로 자연스럽게 이어지는 서비스**를 목표로 잡았다.

### 2.2 타깃 사용자

| 구분 | 내용 |
|------|------|
| 주 사용자 | 가족의 기억력 변화가 걱정되는 **보호자** |
| 상담 대상 | 사용자 본인이 아니라 보호자가 돌보는 **가족**(어머니, 아버지 등) |
| 필요한 것 | 증상이 치매 신호인지에 대한 근거 있는 안내, 가까운 센터와 그 센터의 프로그램, 꾸준히 돌아와 기록하고 예방할 이유 |

상담 대상이 사용자 본인이 아니라 가족이라는 점은 DB 설계에도 그대로 반영했다. 로그인 계정(`auth.users`)과 상담 대상자(`subjects`)를 분리해, 한 보호자가 여러 가족을 등록하고 각자의 상태를 따로 관리할 수 있게 했다.

### 2.3 서비스 방향

3차의 챗봇이 정확한 정보 안내라는 핵심 가치를 검증했다면, 4차는 보호자가 서비스를 **"계속 사용할 이유"** 를 넓히는 데 집중했다. 상담만 하고 끝나는 게 아니라, 상담 이후 실제 행동(**센터 방문, 예방 활동, 꾸준한 기록**)으로 이어지도록 기능을 설계했다.

| 사용자가 하는 일 | 기능 | 이어지는 행동 |
|------|------|------|
| "우리 엄마 요즘 이래요" | AI 상담 챗봇 | 근거 있는 증상 안내 → 지역 센터 연결 |
| 가까운 센터 찾기 | 치매센터 찾기 지도 | 위치 · 연락처 · 프로그램 확인 → 방문 |
| 매일 짧게 하루 기록 | 오늘의 대화 | 대화 요약 · 관찰 신호 → 필요하면 상담 권유 |
| 예방 정보 읽기 · 두뇌 게임 | 예방 콘텐츠 · 두뇌 게임 | 주기적으로 돌아오는 습관 |

### 2.4 요구사항 정의

기능 요구사항 20개, 비기능 요구사항 7개를 정의했다.

| ID | 유형 | 요구사항 | 내용 | 중요도 |
|------|------|------|------|:---:|
| REQ-004 | 기능 | AI 치매 상담 챗봇 | 보호자가 어르신의 증상을 입력하면 AI가 분석해 대처 방안과 관련 정보를 안내 | 상 |
| REQ-005 | 기능 | 출처 기반 응답 | 챗봇 응답 하단에 참고한 공공기관 문서 출처를 카드로 표시 | 상 |
| REQ-006 | 기능 | 치매안심센터 지도 검색 | 주소 · 현재 위치 · 시도/시군구로 가까운 센터를 지도에서 검색 | 상 |
| REQ-008 | 기능 | 오늘의 대화 | 어르신과 나눈 하루 대화를 AI 챗봇으로 기록하고 요약 표시 | 상 |
| REQ-010 | 기능 | 두뇌 자극 게임 | 스도쿠 · 색깔 맞추기 · 순서 기억하기 · 카드 짝 맞추기 4종 | 상 |
| REQ-017 | 비기능 | RAG 응답 정확도 | 공공기관 문서 기반 VectorDB/GraphDB 검색 결과로 답변하고 허위 정보 생성을 최소화 | 상 |
| REQ-019 | 비기능 | 챗봇 응답 속도 | 스트리밍 기준 10초 이내 응답 | 중 |
| REQ-021 | 비기능 | 페이지 로딩 성능 | 모든 페이지 초기 로딩 3초 이내 | 중 |
| REQ-027 | 기능 | 오늘의 대화 진단 금지 원칙 | tone은 안심 · 보통 · 관찰 권함 · 상담 권유 4단계만 쓰고, 우려 tone에는 근거를 반드시 포함 | 상 |

<details>
<summary>요구사항 정의서 전체 보기 (27개)</summary>

| ID | 유형 | 요구사항 | 내용 | 중요도 |
|------|------|------|------|:---:|
| REQ-001 | 기능 | 회원 가입 | 이메일/비밀번호 또는 구글 소셜 계정으로 회원 가입 | 상 |
| REQ-002 | 기능 | 로그인/로그아웃 | 이메일 로그인, 구글 OAuth 로그인, 로그아웃 | 상 |
| REQ-003 | 기능 | 계정 관리 | 비밀번호 변경, 본인 확인 후 회원 탈퇴 | 중 |
| REQ-004 | 기능 | AI 치매 상담 챗봇 | 증상 입력 시 AI가 분석해 대처 방안과 관련 정보 안내 | 상 |
| REQ-005 | 기능 | 출처 기반 응답 | 응답 하단에 참고한 공공기관 문서 출처를 카드로 표시 | 상 |
| REQ-006 | 기능 | 치매안심센터 지도 검색 | 주소 · 현재 위치 · 시도/시군구 드롭다운으로 센터 검색 | 상 |
| REQ-007 | 기능 | 센터 반경 필터 | 5km / 10km / 20km 반경 필터 | 중 |
| REQ-008 | 기능 | 오늘의 대화 | 하루 대화를 AI 챗봇으로 기록하고 상단에 요약 표시 | 상 |
| REQ-009 | 기능 | 블로그 콘텐츠 제공 | 식습관 · 운동 · 수면 · 두뇌훈련 등 카테고리별 예방 콘텐츠 | 중 |
| REQ-010 | 기능 | 두뇌 자극 게임 제공 | 4종 게임을 난이도 선택 후 실행 | 상 |
| REQ-011 | 기능 | 게임 결과 기록 | 플레이 횟수, 개인 최고 기록, 최근 30일 점수 추이 차트 | 중 |
| REQ-012 | 기능 | 데이터 출처 페이지 | 활용한 공공기관 데이터 출처를 원문 링크와 함께 제공 | 하 |
| REQ-013 | 기능 | 개인정보처리방침 | 수집 항목 · 처리 목적 · 보유 기간 · 파기 방침 명시 | 상 |
| REQ-014 | 비기능 | 보안 | HTTPS, 비밀번호 암호화 저장, Supabase 인증 기반 세션 관리 | 상 |
| REQ-015 | 비기능 | 서비스 가용성 | 무료 클라우드 환경에서 cron 기반 keepalive로 중단 없이 운영 | 상 |
| REQ-016 | 비기능 | 반응형 디자인 | PC · 모바일 최적화 UI | 중 |
| REQ-017 | 비기능 | RAG 응답 정확도 | 공공기관 문서 기반 검색 결과로 답변, 허위 정보 최소화 | 상 |
| REQ-018 | 기능 | 블로그 포스팅 관리 프로그램 | 관리자 전용 프로그램에서 마크다운으로 포스팅 작성 · 등록 | 상 |
| REQ-019 | 비기능 | 챗봇 응답 속도 | 스트리밍 기준 10초 이내 | 중 |
| REQ-020 | 기능 | 사용자 관리 | 관리자가 계정 삭제, 대화 내역 삭제, 세션 초기화 | 상 |
| REQ-021 | 비기능 | 페이지 로딩 성능 | 모든 페이지 초기 로딩 3초 이내 | 중 |
| REQ-022 | 기능 | 오늘의 대화 로그인 게이트 | 비로그인 상태에서는 체크인 위젯 미노출 | 상 |
| REQ-023 | 기능 | 오늘의 대화 완료 여부 표시 | 미완료 시 안내 문구, 완료 시 요약과 tone 칩 표시 | 상 |
| REQ-024 | 기능 | 오늘의 대화 모달 | 최소 1턴 후 종료 가능, 6턴 초과 시 입력 잠금, 이탈 시 확인창 | 상 |
| REQ-025 | 기능 | 오늘의 대화 요약 · 저장 | 대화 종료 시 LLM이 summary · tone · concern_note · observations를 하루 1행으로 저장 | 상 |
| REQ-026 | 기능 | 오늘의 대화 완료 자동 전환 | 완료 즉시 모달 종료, 재조회 없이 위젯을 완료 상태로 전환 | 중 |
| REQ-027 | 기능 | 오늘의 대화 진단 금지 원칙 | tone 4단계만 사용, 우려 tone에는 근거(concern_note) 필수 | 상 |

</details>

### 2.5 프로젝트 관리

**① 역할 분담**

| 영역 | 3차 (챗봇 코어) | 4차 (서비스 확장) |
|------|------|------|
| GraphDB | 공공데이터 수집 · 전처리, GraphDB 설계 · 구축, GraphDB Tool 개발 | — |
| VectorDB | 가이드라인 문서 수집 · 정제 · 청킹 · 적재, 검색 Tool | — |
| 에이전트 · 백엔드 | LangGraph · AI Agent 설계, 프롬프트 엔지니어링 | 오늘의 대화 챗봇 로직 구현 |
| 프론트엔드 | 웹 UI(챗봇 인터페이스), 백엔드 API 연동 | 센터 지도, 두뇌 게임 UI, 인증 보완 |
| 산출물 · 평가 | 기획서, 아키텍처, 데이터 · 성능평가 문서 | 요구사항 정의서, 화면설계서, 테스트 계획 및 결과 |

**② WBS**

<a href="/images/projects/dementia-alarm/wbs.png"><img src="/images/projects/dementia-alarm/wbs.png" alt="WBS" /></a>

기획 → 데이터 수집 · DB 구축 → AI Agent 개발 → 백엔드 · 프론트 개발 → 테스트 · 배포 → 문서화 순서로 일정을 나눴다. 3차에서 배포까지 미리 끝내 두었기 때문에, 배포가 핵심 목표였던 4차에서는 기능 확장에 일정을 더 쓸 수 있었다.

---

## 3. 프로젝트 상세

### 3.1 시스템 아키텍처

<a href="/images/projects/dementia-alarm/system-flow.jpg"><img src="/images/projects/dementia-alarm/system-flow.jpg" alt="시스템 아키텍처" /></a>

| 계층 | 구성 | 역할 |
|------|------|------|
| Frontend | React · Vite · Vercel | 챗봇, 센터 지도, 예방 탭, 두뇌 게임 화면 |
| Backend | FastAPI · Render | API 라우터, RAG 파이프라인, JWT 검증 |
| GraphDB | Neo4j AuraDB | 시도 · 시군구 · 센터 · 운영기관 · 프로그램 관계 |
| VectorDB | Qdrant Cloud | 치매 조기검진 · 증상 가이드라인 청크 |
| RDB · Auth | Supabase | 회원, 상담 대상자, 대화 세션, 체크인, 게임 기록, 게시글 |
| 외부 서비스 | Kakao Map · OpenAI · Gemini · Google OAuth | 지도 렌더링, 임베딩 · LLM, 소셜 로그인 |

무료 클라우드 환경(Vercel · Render · Supabase)에서 운영하기 때문에, cron으로 keepalive 엔드포인트를 주기적으로 호출해 Render 서버가 잠들지 않게 하고 Neo4j · Qdrant 연결 상태도 함께 확인한다.

---

### 3.2 데이터

#### 3.2.1 데이터 출처와 수집 경로

서비스는 성격이 다른 두 종류의 데이터를 쓴다. **구조화된 지역 · 센터 정보**는 GraphDB에, **비정형 증상 · 가이드라인 문서**는 VectorDB에 담았다.

| 구분 | 데이터 | 출처 | 수집 경로 | 규모 |
|------|------|------|------|------|
| GraphDB | ① 치매안심센터 정보 | 국립중앙의료원 · 공공데이터포털 | CSV 다운로드 | 256행 |
| GraphDB | ② 전국치매센터표준데이터 | 행정안전부 표준데이터 · 공공데이터포털 | CSV 다운로드 | 317행 |
| VectorDB | 치매 조기검진 · 증상 · 관련 법령 안내 문서 | 중앙치매센터, 보건복지부, 질병관리청, 법제처 생활법령, 국가정신건강정보포털, 지자체 보건소 등 7개 기관 | `robots.txt` 확인 후 크롤링 | 7개 사이트 |

**① GraphDB: 두 데이터셋을 병합한 이유**

| 데이터셋 | 장점 | 한계 |
|------|------|------|
| ① 치매안심센터 정보 | 센터명 · 시도 · 시군구 · 주소 · 위경도가 정제되어 있음 | "치매안심센터" 유형만 있고 운영기관 · 프로그램 정보가 없음 |
| ② 전국치매센터표준데이터 | 운영기관 · 인력 현황 · 제공 프로그램 목록이 있음, 광역치매센터 · 상담전화센터까지 포함 | 지자체별 제출 데이터를 취합해 주소 · 기관명 표기가 제각각, 시도/시군구가 주소 문자열 안에 섞여 있음 |

어느 한쪽만으로는 정제된 위치 정보와 운영기관 · 프로그램 정보를 동시에 얻을 수 없어서, ①을 기준으로 ②의 정보를 매칭해 보강했다.

**② VectorDB: 문서로 공공기관 안내 자료를 고른 이유**

논문이나 학술자료는 전문 용어가 많아 보호자가 이해하기 어렵다. 반면 공공기관과 의료기관 홈페이지의 안내 문서는 일반 시민을 대상으로 쓰여 있어, 이해하기 쉬우면서도 객관적인 정보를 줄 수 있다.

#### 3.2.2 DB 설계

**① GraphDB를 쓴 이유**

"강남구에 치매안심센터 몇 개야?", "인지훈련 프로그램 하는 센터 어디야?", "삼성서울병원이 운영하는 센터는?", "의사가 2명 이상인 센터는?"처럼 **지역 · 센터 · 운영기관 · 프로그램 사이의 다대다 관계**를 묻는 질문이 많았다. RDB라면 JOIN을 여러 번 거쳐야 하는 질문을, GraphDB는 관계를 그대로 따라가면 된다.

**② GraphDB 스키마 (Neo4j)**

```
(:시도) -[:CONTAINS]-> (:시군구)
(:시군구) -[:LOCATED_IN]-> (:시도)
(:치매안심센터) -[:LOCATED_IN]-> (:시군구)
(:운영기관) -[:MANAGES]-> (:치매안심센터)
(:치매안심센터) -[:PROVIDES]-> (:프로그램)
```

| 노드 | 주요 프로퍼티 | 제약조건 |
|------|------|------|
| `:시도` | name | `name` UNIQUE |
| `:시군구` | name, 시도 (동명 시군구 구분용) | `(시도, name)` UNIQUE |
| `:치매안심센터` | 센터ID, name, 유형, 주소, 위도 · 경도, 전화번호, 홈페이지, 의사 · 간호사 · 사회복지사 인원, 표준 직종별 인원 15종 내외 | `센터ID` UNIQUE |
| `:운영기관` | 운영기관ID, name, 대표자명, 전화번호, 홈페이지 | `운영기관ID` UNIQUE |
| `:프로그램` | 프로그램ID, name, category, source, raw_text | `프로그램ID` UNIQUE |

모든 관계는 **단방향으로만 저장**하고, 역방향 조회는 Cypher에서 화살표를 생략한 패턴(`-[:REL]-`)으로 처리하도록 정했다. 이 결정이 뒤에서 다룰 에이전트 Tool 설계로 이어진다.

`:시군구`는 이름만으로는 유일하지 않다. "중구", "서구"는 여러 시도에 있기 때문에, 시군구 노드는 `(시도, name)` 조합으로 식별한다.

**③ VectorDB 컬렉션 (Qdrant)**

| 항목 | 값 |
|------|------|
| 컬렉션 | `dementia_guideline` |
| 임베딩 모델 | `text-embedding-3-small` (1,536차원) |
| 거리 척도 | Cosine |
| Point payload | text, title, source_url, source_type, chunk_index, total_chunks |
| 검색 파라미터 | top_k 4, score_threshold 0.3 |

**④ RDB (Supabase)**

<a href="/images/projects/dementia-alarm/erd.png"><img src="/images/projects/dementia-alarm/erd.png" alt="Supabase ERD" /></a>

로그인한 보호자가 하는 일 네 가지가 그대로 네 개의 테이블 그룹이 된다.

| 사용자가 하는 일 | 테이블 | 저장 주체 |
|------|------|------|
| 상담 챗봇과 대화 | `subjects`, `state`, `contexts` | 서버 (AI가 파악한 정보를 한 번 검증해서 저장) |
| 하루 체크인 | `daily_checkins` | 서버 (AI 요약을 만든 뒤 저장) |
| 두뇌 게임 | `game_scores` | 프론트엔드가 직접 저장 |
| 예방 정보 읽기 | `posts` | 관리자 전용 기능만 쓰기 가능 |

스키마를 지배하는 원칙은 두 가지다.

1. **상담 대상은 사용자 본인이 아니라 가족**이다. 그래서 대상자(`subjects`)를 따로 둔다.
2. **상담 내용은 건강 민감정보**다. 그래서 신원(`auth.users`)과 한 단계 떼어 놓고, `subjects` · `state` · `contexts` · `daily_checkins` · `game_scores`에 RLS를 걸어 본인 데이터만 조회되게 했다.

환자 정보(`state`)와 대화 맥락(`contexts`)도 분리했다. `state`에는 필터를 거친 정확한 값만 저장하고, `contexts`에는 대화 요약과 최근 N턴만 남긴다. 대화가 요약으로 압축되어도 판단의 근거가 되는 환자 정보는 그대로 남는다.

```json
// state.data 예시
{
  "symptoms": ["반복질문", "배회"],
  "duration": "1년쯤",
  "adl_impact": true,
  "safety_flags": [],
  "notes": ["duration 정정: 6개월 -> 1년쯤"]
}
```

#### 3.2.3 처리: GraphDB 전처리

**① 시도 · 시군구 정규화**

데이터셋 ②는 시도 · 시군구가 도로명주소 문자열 안에 섞여 있어, 주소 앞 토큰을 파싱해 별도 컬럼으로 분리했다. "전라북도"와 "전북특별자치도"처럼 두 데이터셋 간 표기가 다른 경우는 하나로 통일하고, 시군구 단위가 없는 세종특별자치시는 예외로 처리했다.

<details>
<summary>코드 보기: 주소 파싱</summary>

```python
SIDO_NORMALIZE = {
    '전라북도': '전북특별자치도',
}

def parse_address(addr):
    tokens = str(addr).split()
    if not tokens:
        return None, None
    sido = SIDO_NORMALIZE.get(tokens[0], tokens[0])
    if sido == '세종특별자치시':
        sigungu = '세종시'          # 시군구가 없는 광역자치단체
    else:
        sigungu = tokens[1] if len(tokens) > 1 else None
    return sido, sigungu
```

</details>

**② 두 데이터셋 매칭: 이름 → 좌표 2단계**

같은 시군구 안에서만 후보를 찾고, 두 단계로 매칭했다.

1. **센터명 핵심부 비교**: "치매안심센터" 같은 접미어와 시도 · 시군구 이름을 지운 뒤 남은 핵심부가 같으면 매칭한다.
2. **좌표 최근접 매칭**: 남은 센터끼리 Haversine 거리를 계산해 5km 안에서 가장 가까운 쌍을 묶는다. 이름이 부분적으로라도 겹치면 좌표 오차를 감안해 30km까지 허용한다.

처음에는 매칭 후보를 유형 구분 없이 잡았더니, 근처에 있는 광역치매센터나 치매상담전화센터와 잘못 매칭되는 문제가 있었다. 데이터셋 ①은 전부 "치매안심센터" 유형이므로 ② 쪽 후보도 같은 유형으로 제한해 해결했다. 최종적으로 **256개 중 214개**가 매칭됐고, 매칭되지 않은 센터는 데이터셋별로 별도 노드로 유지했다.

<details>
<summary>코드 보기: 2단계 매칭</summary>

```python
DIST_THRESHOLD_KM = 5.0
NAME_FALLBACK_DIST_KM = 30.0   # 이름이 일치하면 좌표 오차가 있어도 넓게 허용

for sgg, group1 in df1.groupby(['시도', '시군구']):
    # 파일1은 전부 '치매안심센터' 타입 → 후보도 같은 타입으로 제한
    group2 = df2[(df2['시도'] == sgg[0]) & (df2['시군구'] == sgg[1])
                 & (df2['치매센터유형'] == '치매안심센터')]

    # 1차: 센터명 핵심부(시군구 · 접미어 제거 후) 일치
    for i1, r1 in group1.iterrows():
        core1 = strip_name(r1['치매안심센터명'], r1['시도'], r1['시군구'])
        for i2, r2 in group2.iterrows():
            if strip_name(r2['치매센터명'], r2['시도'], r2['시군구']) == core1:
                match(i1, i2); break

    # 2차: 남은 것끼리 좌표 최근접
    candidates = []
    for i1, r1 in unmatched(group1):
        for i2, r2 in unmatched(group2):
            d = haversine(r1['위도'], r1['경도'], r2['위도'], r2['경도'])
            threshold = NAME_FALLBACK_DIST_KM if name_overlap(r1, r2) else DIST_THRESHOLD_KM
            if d <= threshold:
                candidates.append((d, i1, i2))
    for d, i1, i2 in sorted(candidates):      # 가까운 쌍부터 확정
        if not used(i1) and not used(i2):
            match(i1, i2)
```

</details>

**③ 전화번호 기준 중복 센터 병합**

이름 · 좌표 매칭이 임계값 밖으로 빠지면, 같은 센터가 "① 매칭분"과 "② 단독분"에 한 번씩 두 번 들어간다. "광주서구치매안심센터"와 "서구치매안심센터"처럼 표기만 다른 경우다. 전화번호는 기관마다 고유하다는 점에 착안해, 하이픈 · 공백을 지운 숫자만 비교해 같은 번호면 같은 센터로 보고 병합했다. 원본 데이터가 더 정제된 ① 쪽 행을 우선 남겼다. 이 방식으로 **중복 45개 그룹(약 90개 노드)** 을 찾아 병합했다.

<details>
<summary>코드 보기: 전화번호 정규화와 중복 제거</summary>

```python
def normalize_phone(phone):
    """하이픈 · 공백 · 표기 차이를 지우고 숫자만 남긴다"""
    if pd.isna(phone):
        return None
    digits = re.sub(r'\D', '', str(phone))
    return digits if digits else None

centers['_전화_norm'] = centers['전화번호'].apply(normalize_phone)

# 정제도가 높은 출처를 우선 보존: 파일1+파일2 > 파일1 > 파일2
centers['_priority'] = centers['데이터출처'].map({'파일1+파일2': 0, '파일1': 1, '파일2': 2})
centers = centers.sort_values('_priority')

dup_mask = centers['_전화_norm'].notna() & centers.duplicated(subset='_전화_norm', keep='first')
centers = centers[~dup_mask]
```

</details>

**④ 운영기관 병합: Union-Find**

운영기관은 센터보다 까다로웠다. 원본을 검증해 보니 **같은 운영기관명인데 전화번호가 다른 경우가 18건** 있었다. 분소마다 대표번호를 다르게 입력한 것으로 보인다. 전화번호만 기준으로 묶으면 같은 기관이 쪼개지고, 이름만 기준으로 묶으면 표기가 다른 같은 기관을 놓친다.

그래서 **이름과 전화번호 중 하나라도 같으면 같은 기관**으로 보는 Union-Find로 묶었다. 이름(시도명 제거 · 공백 제거)과 전화번호(숫자만)를 각각 키로 삼아, 같은 키를 가진 행끼리 합친다. 그룹마다 이름이 가장 긴(정보량이 많은) 행을 대표로 남겼다.

<details>
<summary>코드 보기: Union-Find로 운영기관 병합</summary>

```python
parent = list(range(len(op_raw)))

def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # 경로 압축
        x = parent[x]
    return x

def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[rb] = ra

key_to_idx = {}
for i, row in op_raw.iterrows():
    # 이름 키와 전화번호 키 중 하나라도 이미 본 적 있으면 같은 그룹
    for key in [('name', row['_name_norm']), ('phone', row['_phone_norm'])]:
        if not key[1]:
            continue
        if key in key_to_idx:
            union(i, key_to_idx[key])
        else:
            key_to_idx[key] = i

op_raw['_group'] = [find(i) for i in range(len(op_raw))]

# 그룹별 대표: 이름이 가장 긴 행
op_df = (op_raw.assign(_len=op_raw['운영기관명'].str.len())
               .sort_values('_len', ascending=False)
               .drop_duplicates(subset='_group', keep='first'))
```

</details>

**⑤ 인력 현황 표준화와 결측 보완**

- **인력 현황**: `기타인원현황` 컬럼은 "임상심리사 1, 음악치료사 1" 같은 자유 텍스트였다. 15개 내외 표준 직종(임상심리사, 작업치료사, 물리치료사, 행정인력 등)으로 매핑 테이블을 만들어 `{직종: 인원수}` 형태로 파싱했다.
- **홈페이지 결측**: 치매안심센터 홈페이지 결측 **101건**을 전수 조사해 `nid.or.kr` 패턴과 지자체 공식 도메인으로 직접 채웠다. 운영기관 홈페이지 **225건**도 추가로 조사했다.
- **타입 · URL 정리**: 인원수 · 우편번호를 float에서 int로 바꾸고, `https://`가 빠진 URL에 프로토콜을 일괄 보완했다.

#### 3.2.4 처리: VectorDB 전처리

1. **수집**: `robots.txt`로 크롤링이 허용된 사이트만 대상으로 했다. 사이트마다 본문이 놓인 HTML 구조가 달라, 본문 영역의 CSS Selector를 사이트별로 따로 지정해 메뉴 · 광고를 제외한 안내 내용만 추출했다.
2. **정제**: 5자 미만 문장, 메뉴 · 이전/다음 · 공유 버튼 · 저작권 문구, 중복 문장을 지웠다. 정제 후 30자 이하인 문서는 정보가 부족하다고 보고 제외했다.
3. **청킹**: `RecursiveCharacterTextSplitter`로 **400자 · overlap 50자** 단위로 나눴다. 의미가 끊기지 않도록 문단 → 줄바꿈 → 문장 → 단어 순서로 분할 기준을 적용했다.
4. **중복 방지 ID**: `URL + 청크 순번 + 텍스트`의 해시로 ID를 만들었다. 같은 문서를 다시 적재해도 같은 ID로 upsert되어 중복이 생기지 않는다.

<details>
<summary>코드 보기: 결정론적 청크 ID</summary>

```python
def build_chunks(doc, splitter):
    chunks = splitter.split_text(doc["text"])
    result = []
    for i, chunk_text in enumerate(chunks):
        # source_url + chunk_index + text 기반 결정론적 id
        hash_input = f"{doc['url']}|{i}|{chunk_text}".encode("utf-8")
        deterministic_id = str(uuid.UUID(hashlib.md5(hash_input).hexdigest()))
        result.append({
            "chunk_id": deterministic_id,
            "text": chunk_text,
            "metadata": {
                "title": doc["title"],
                "source_url": doc["url"],
                "source_type": "guideline",
                "chunk_index": i,
                "total_chunks": len(chunks),
            },
        })
    return result
```

</details>

#### 3.2.5 구축 결과

**① GraphDB**

| 노드 | 관계 |
|:------|:------|
| 시도 (17) | 시군구 → 시도 `LOCATED_IN` (263) |
| 시군구 (263) | 시도 → 시군구 `CONTAINS` (263) |
| 치매안심센터 (313) | 치매안심센터 → 시군구 `LOCATED_IN` (313) |
| 운영기관 (228) | 운영기관 → 치매안심센터 `MANAGES` (271) |
| 프로그램 (683) | 치매안심센터 → 프로그램 `PROVIDES` (1,309) |
| **총 1,504개** | **총 2,419개** |

**② VectorDB**

| 출처 사이트 | 청크 | 벡터 차원 | 검색 방식 |
|:---:|:---:|:---:|:---:|
| 7개 | 150개 | 1,536 | Cosine Similarity |

적재 후에는 노드 · 관계 개수가 원본과 맞는지, 지역 · 운영기관 · 프로그램 조회 결과가 원본 데이터와 일치하는지 교차 검증했다. 매칭 로직을 고치기 전후의 유형 분류는 경주시, 부산 서구, 세종시를 표본으로 비교했다.

---

### 3.3 AI Agent

#### 3.3.1 베이스 모델 선정과 평가 계획

| 용도 | 모델 | 비고 |
|------|------|------|
| 상담 에이전트 · 출처 추출 · 되묻기 보정 | Gemini Flash Lite | 구조화 출력(`reply` / `choices`)으로 응답 |
| 오늘의 대화 요약 | OpenAI GPT mini | summary · tone · concern_note · observations를 JSON으로 출력 |
| 임베딩 | OpenAI `text-embedding-3-small` | 초기에 BAAI/bge-m3를 썼으나, OpenAI API 기반 서비스와의 연동 편의성과 검색 성능을 고려해 교체 |
| Fallback Cypher 생성 | LLM + `GraphCypherQAChain` | 고정 Tool로 처리하지 못하는 복합 질의만 담당 |

평가는 검색 단계와 답변 단계를 나눠서 계획했다. 검색이 맞는데 답이 틀린 건지, 검색부터 틀린 건지를 구분하기 위해서다.

| 대상 | 지표 | 방법 |
|------|------|------|
| GraphDB Tool | Precision · Recall | Tool 10개에 질문 1개씩, 결과에 정답 키워드가 모두 들어있는지 확인 |
| VectorDB 검색 | Hit Rate · MRR | 질의-정답 키워드 쌍 10개, top-4 결과에서 정답이 처음 나온 순위 |
| 최종 답변 | RAGAS (Faithfulness, Answer Relevancy, Context Precision, Context Recall) | VectorDB 청크로 테스트셋 자동 생성 후 측정 |
| 최종 답변 | 정성 평가 | 정확성 · 유용성 · 톤 · 일관성 기준으로 실제 배포 환경 응답 채점 |
| 서비스 전체 | 테스트 케이스 | 프론트 · 백엔드 · DB · 가용성 테스트 설계 및 결과 |

#### 3.3.2 에이전트 설계

<a href="/images/projects/dementia-alarm/agent-architecture.jpg"><img src="/images/projects/dementia-alarm/agent-architecture.jpg" alt="AI Agent 아키텍처" /></a>

전체 파이프라인은 LangGraph의 `StateGraph`로 구성했다.

```
START
  ↓
generation_node          # LLM + Tool 호출 (ReAct 루프)
  ↓
route_after_generation   # 응답 type에 따라 분기
  ↙                ↘
source_extraction_node   choices_rewrite_node
  ↓                ↓
END              END
```

| 노드 | 역할 |
|------|------|
| `generation_node` | LLM이 Tool 호출 여부를 판단하며 ReAct 루프를 돈다. 응답은 `reply`(정보 안내)나 `choices`(되묻기) 두 가지 구조화된 형태로만 나온다. |
| `route_after_generation` | 응답의 `type`을 보고 다음 노드를 고르는 조건부 라우터 |
| `source_extraction_node` | `reply`일 때 실행. Tool 실행 결과와 답변을 보조 LLM에 넘겨 출처(title · snippet · url)를 뽑고, URL 기준으로 중복을 지운다. 화면의 출처 카드가 여기서 만들어진다. |
| `choices_rewrite_node` | `choices`일 때 실행. 직전 대화를 보고 되묻기 질문이 어색하거나 반복되면 자연스러운 문장으로 고친다. |

정보가 부족할 때 억지로 답하지 않고 **되묻기(`choices`)** 로 분기하는 구조가 핵심이다. "어머니가 길을 잃어버려요"라고만 하면, 지역을 모르니 센터를 찾을 수 없다. 이때는 선택지를 주고 지역을 되묻는다.

<details>
<summary>코드 보기: LangGraph 그래프 구성</summary>

```python
def route_after_generation(state: GraphState):
    response = state["structured_response"]
    if getattr(response, "type", None) == "reply":
        return "source_extraction"
    return "choices_rewrite"

builder = StateGraph(GraphState)
builder.add_node("generation", generation_node)
builder.add_node("source_extraction", source_extraction_node)
builder.add_node("choices_rewrite", choices_rewrite_node)

builder.add_edge(START, "generation")
builder.add_conditional_edges(
    "generation",
    route_after_generation,
    {"source_extraction": "source_extraction",
     "choices_rewrite": "choices_rewrite"},
)
builder.add_edge("source_extraction", END)
builder.add_edge("choices_rewrite", END)
graph = builder.compile()
```

</details>

**① Tool 구성 (13개)**

| 분류 | Tool | 역할 |
|------|------|------|
| GraphDB 고정 (9) | `get_centers_by_sido` · `get_centers_by_sigungu` | 시도 · 시군구 기준 센터 목록 |
| | `get_sido_list` · `get_sigungu_list` | 시도 · 시군구 목록 |
| | `search_center_by_name` | 센터명 키워드 검색 |
| | `get_operator_by_center` · `get_centers_by_operator` | 센터 ↔ 운영기관 |
| | `get_programs_by_center` · `get_centers_by_program` | 센터 ↔ 프로그램 |
| <span style="white-space:nowrap">GraphDB Fallback (1)</span> | `flexible_graph_search` | 위 9개로 안 되는 집계 · 복합 조건 질의 |
| VectorDB (1) | `search_dementia_guideline` | 가이드라인 의미 검색 (유사도 0.3 미만 제외) |
| 상태 (2) | `propose_state_change` | 대화 중 파악한 증상 · 기간 · 안전 신호를 구조화된 슬롯으로 추출해 저장 |
| | `query_family_info` | 상담 대상자와 현재 상태 조회 |

**② 메모리 구조**

| 구분 | 저장 단위 | 메커니즘 | 담는 내용 |
|------|------|------|------|
| 단기 기억 | 세션 (`thread_id`) | LangGraph Checkpointer (Supabase) | 이번 세션의 대화 메시지, 진행 중인 슬롯 |
| 장기 기억 | 사용자 + 대상자 | Supabase `subjects` · `state` | 보호자 프로필, 대상자별 증상 · 안전 신호 이력 |

#### 3.3.3 구현: GraphDB Tool, 고정 9개 + Fallback 1개

**① 문제: LLM이 관계 방향을 거꾸로 잡는다**

처음에는 LLM이 질문마다 Cypher를 직접 만들게 했다. 그런데 `(:치매안심센터)-[:LOCATED_IN]->(:시군구)` 방향을 반대로 생성해서 **"서울에 센터 0개"** 라는 오답이 나왔다. 추가 지시문(`extra_instructions`)만으로는 방향이 잡히지 않았다.

**② 해결: 자주 묻는 질문은 검증된 Cypher로 고정한다**

질문 유형을 보니 대부분이 지역 · 센터명 · 운영기관 · 프로그램 기준의 단순 조회였다. 이 9가지는 미리 검증한 Cypher로 Tool을 만들어 두고, 집계나 복합 조건처럼 고정 Tool로 안 되는 질의만 LLM이 Cypher를 만드는 Fallback Tool이 맡게 했다.

- **고정 Tool**: Cypher가 코드에 박혀 있어 방향 오류가 날 수 없다. LLM은 어떤 Tool을 부를지와 인자만 정한다.
- **Tool 설명(docstring)으로 라우팅**: 각 Tool의 docstring에 "언제 이 Tool을 쓰는지"를 구체적으로 적었다. Fallback에는 "9개로 답이 되는 질문에는 쓰지 않는다", "최후의 수단"이라고 명시해 LLM이 고정 Tool을 먼저 고르게 했다.
- **Fallback도 방향을 못 박는다**: Fallback이 쓰는 Cypher 생성 프롬프트를 직접 작성했다. 저장된 관계 방향 5가지를 모두 명시하고, "이 프로그램 하는 센터는?"처럼 역방향으로 묻는 질문은 새 관계를 만들지 말고 화살표를 생략한 패턴으로 조회하라고 예시까지 넣었다.

<details>
<summary>코드 보기: 고정 Tool 예시</summary>

```python
@tool
def get_centers_by_sigungu(sido: str, sigungu: str) -> str:
    """
    시도+시군구(기초자치단체) 단위로 치매안심센터 목록을 조회한다.

    사용자가 "강남구 치매안심센터 알려줘", "수원시 센터 어디야?",
    "OO센터 홈페이지 알려줘"처럼 구/시/군 단위까지 지역을 특정했을 때 호출한다.

    Args:
        sido: 시도명 (예: "서울특별시")
        sigungu: 시군구명 (예: "강남구"). "중구", "서구"처럼 여러 시도에
            중복되는 이름일 수 있으므로 sido와 함께 넘긴다.
    """
    rows, truncated = _run_query_capped(
        """
        MATCH (c:치매안심센터)-[:LOCATED_IN]->(sg:시군구 {시도: $sido, name: $sigungu})
        RETURN c.name AS name, c.주소 AS 주소, c.전화번호 AS 전화번호, c.홈페이지 AS 홈페이지
        LIMIT $limit
        """,
        sido=sido, sigungu=sigungu,
    )
    return _format_centers(rows, truncated)
```

</details>

<details>
<summary>코드 보기: Fallback Cypher 프롬프트의 방향 규칙</summary>

```text
관계 방향 규칙 (반드시 지켜야 함, 저장된 방향은 아래가 전부이며 역방향 관계는 별도로 존재하지 않음):
- (:치매안심센터)-[:LOCATED_IN]->(:시군구)
- (:시도)-[:CONTAINS]->(:시군구)
- (:시군구)-[:LOCATED_IN]->(:시도)
- (:운영기관)-[:MANAGES]->(:치매안심센터)
- (:치매안심센터)-[:PROVIDES]->(:프로그램)

역방향처럼 보이는 질문 처리 규칙:
질문이 "이 프로그램 하는 센터는?", "이 보건소가 관리하는 센터는?"처럼
저장된 방향과 반대 방향으로 묻더라도, 새로운 관계를 만들려 하지 말고
화살표를 생략한 패턴(-[:REL]-)으로 기존 관계를 그대로 타고 가서 조회하세요.

올바른 예시 3 (역방향 질문 - 프로그램 기준으로 센터 찾기):
MATCH (c:치매안심센터)-[:PROVIDES]-(p:프로그램 {name: '치매조기검진'})
RETURN c.name, c.주소, c.전화번호
```

</details>

#### 3.3.4 구현: VectorDB 검색 Tool

LangChain Retriever 대신 **Qdrant Client와 OpenAI 라이브러리를 직접 사용**해 검색 로직을 구현했다. 유사도 임계값(0.3), Top-K(4), 출력 형식을 서비스 목적에 맞게 직접 제어하기 위해서다. 임베딩은 100개 청크씩 배치로 처리해 API 호출 횟수를 줄였다.

#### 3.3.5 구현: 오늘의 대화

하루 한 번, 최대 6턴의 짧은 대화를 나누면 LLM이 전체 대화를 요약해 `summary` · `tone` · `concern_note` · `observations`를 하루 한 행으로 저장한다.

이 기능의 핵심 원칙은 **진단하지 않는 것**이다. AI가 "치매가 의심됩니다"라고 말하면 안 된다. 그래서 tone은 다음 행동을 권하는 네 단계로만 제한했다.

| tone | 의미 | `concern_note` |
|------|------|------|
| `reassure` 안심 | 특이사항 없음 | 비워야 함 |
| `neutral` 보통 | 애매하거나 판단할 것 없음 | 비워야 함 |
| `observe` 관찰 권함 | 신경 쓰이는 신호 있음 | **근거 필수** |
| `suggest_consult` 상담 권유 | 전문가 상담 권함 | **근거 필수** |

프롬프트만 믿지 않고 코드로도 검증했다. tone이 네 값 중 하나인지, 우려 tone에 근거가 있는지, 안심 tone인데 근거 칸에 우려 내용이 들어가 있지는 않은지 확인한다. "가볍게", "별일 아니지만"처럼 위험을 축소하는 표현이 들어가도 걸러낸다.

<details>
<summary>코드 보기: 요약 결과 검증</summary>

```python
TONE_VALUES = ["reassure", "neutral", "observe", "suggest_consult"]

BANNED_MINIMIZING_PHRASES = ["가볍게", "별일 아니지만", "크게 걱정할 정도는 아니지만"]

def is_valid_summary(data: dict) -> tuple[bool, str]:
    if data["tone"] not in TONE_VALUES:
        return False, f"허용되지 않은 tone 값: {data['tone']}"

    concern_note = data.get("concern_note", "")
    # 우려 tone인데 근거가 없으면 거부
    if data["tone"] in ("observe", "suggest_consult") and not concern_note.strip():
        return False, f"'{data['tone']}' tone인데 concern_note(근거)가 비어 있음"
    # 안심 tone인데 우려 내용이 적혀 있으면 tone을 올려야 함
    if data["tone"] in ("reassure", "neutral") and concern_note.strip():
        return False, f"'{data['tone']}' tone인데 concern_note가 채워져 있음"

    text = data["summary"] + concern_note
    for phrase in BANNED_MINIMIZING_PHRASES:
        if phrase in text:
            return False, f"위험 축소 표현 포함: {phrase}"
    return True, ""
```

</details>

---

### 3.4 서비스

#### 3.4.1 핵심 기능

| 구분 | 기능 | 설명 |
|------|------|------|
| **상담** | AI 치매 상담 챗봇 | 증상을 설명하면 가이드라인 근거로 안내하고, 지역을 알려주면 가까운 센터 연결. 응답마다 출처 카드 표시 |
| **서비스** | 치매센터 찾기 | 주소 · 현재 위치 · 시도/시군구로 검색, 5/10/20km 반경 필터, 센터별 주소 · 전화 · 프로그램 · 길찾기 |
| **건강** | 오늘의 대화 | 하루 한 번 짧은 대화를 요약해 기록하고, 4단계 tone으로 다음 행동 안내 |
| **정보** | 치매 예방 정보 | 식습관 · 운동 · 수면 등 카테고리별 예방 콘텐츠, 관리자가 지정한 오늘의 추천 |
| **게임** | 두뇌 게임 | 스도쿠 · 색깔 맞추기 · 순서 기억하기 · 카드 짝 맞추기, 난이도 선택 |
| **게임** | 내 게임 기록 | 플레이 횟수, 최고 기록, 최근 30일 점수 추이 차트 |
| **계정** | 계정 관리 | 이메일 · 구글 로그인, 비밀번호 변경, 회원 탈퇴 |
| **관리자** | 콘텐츠 관리 | 마크다운으로 예방 콘텐츠 작성 · 등록 |

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
  <img src="/images/projects/dementia-alarm/chat-symptom.png" alt="증상 상담 응답" />
  <img src="/images/projects/dementia-alarm/chat-center.png" alt="센터 안내 응답" />
</div>

#### 3.4.2 화면설계서

전체 화면을 SCR-01 ~ SCR-28로 정의했다. 3차의 24개 화면에 센터 찾기(SCR-25 ~ 26)와 오늘의 대화(SCR-27 ~ 28)를 더했다.

```
/                 메인(랜딩)                      SCR-01
/guide            이용 가이드                     SCR-02
/reference        데이터 출처                     SCR-03
/privacy          개인정보처리방침                 SCR-04
/prompt           AI 치매 상담 (로그인 필요)       SCR-10, 11
/prevention       예방 탭
  ├─ 오늘의 대화 위젯 (로그인 시에만 노출)          SCR-27, 28
  ├─ 오늘의 추천 + 게시글 목록                     SCR-12
  └─ 두뇌 게임 슬라이더                            SCR-14
/center-search    치매 센터 찾기 (비로그인도 가능)   SCR-25, 26
/game/*           두뇌 게임 4종                    SCR-15 ~ 22
/game-stats       두뇌 게임 통계                   SCR-23, 24
```

화면 설계에서 정한 기준은 다음과 같다.

- **지도가 안 떠도 서비스는 돈다**: 지도 SDK 로딩에 실패해도 왼쪽 결과 리스트(정적 JSON 기반)는 그대로 동작하고, 지도 자리만 "다시 시도" 카드로 바꾼다.
- **모바일에서는 지도를 가리지 않는다**: PC에서는 지도 위에 380px 패널을 띄우고, 모바일에서는 지도 55% · 검색 결과 45%로 화면을 나눈다.
- **오늘의 대화는 원문을 저장하지 않는다**: 대화 원문은 서버에 남기지 않고 요약만 저장한다. 그래서 모달을 열 때마다 새 대화로 시작한다.
- **접근성**: 본문 16px 이상, 클릭 대상 44×44px 이상, 명도 대비 4.5:1 이상. 색만으로 상태를 구분하지 않고 지도 마커 범례와 tone 칩에 텍스트 라벨을 함께 붙였다.

#### 3.4.3 배포와 서비스 테스트

- **배포**: 프론트엔드는 Vercel, 백엔드는 Render, DB는 Neo4j AuraDB · Qdrant Cloud · Supabase 클라우드로 운영한다. 3차에서 이미 배포까지 마쳐 두었다.
- **가용성**: 무료 플랜의 슬립을 막기 위해 cron으로 keepalive 엔드포인트를 주기적으로 호출한다.
- **보안**: 모든 엔드포인트 HTTPS, JWT 검증, Supabase RLS로 본인 데이터만 조회되게 했다. API 키와 DB 접속 정보가 클라이언트에 노출되지 않는지도 테스트 항목에 넣었다.

---

## 4. 프로젝트 결과

### 4.1 평가

<a href="/images/projects/dementia-alarm/eval-summary.jpg"><img src="/images/projects/dementia-alarm/eval-summary.jpg" alt="성능 평가 종합" /></a>

#### 4.1.1 GraphDB: Precision · Recall 1.0

| 질문 | Tool | Precision | Recall |
|------|------|:---:|:---:|
| 서울특별시 치매안심센터 조회 | `get_centers_by_sido` | 1.0 | 1.0 |
| 강남구 치매안심센터 조회 | `get_centers_by_sigungu` | 1.0 | 1.0 |
| 인지훈련 프로그램 센터 검색 | `get_centers_by_program` | 1.0 | 1.0 |
| 삼성서울병원 운영 센터 조회 | `get_centers_by_operator` | 1.0 | 1.0 |
| 센터명 키워드 검색 (강남) | `search_center_by_name` | 1.0 | 1.0 |
| 강남구 치매안심센터 운영기관 조회 | `get_operator_by_center` | 1.0 | 1.0 |
| 센터 제공 프로그램 조회 | `get_programs_by_center` | 1.0 | 1.0 |
| 시도 목록 조회 | `get_sido_list` | 1.0 | 1.0 |
| 시군구 목록 조회 (경기도) | `get_sigungu_list` | 1.0 | 1.0 |
| 의사 2명 이상 센터 (Fallback) | `flexible_graph_search` | 1.0 | 1.0 |

10개 질의 모두 정답 키워드를 빠짐없이 반환했다. 고정 Tool의 라우팅과 Fallback이 의도대로 동작하고, 속성 조건과 관계를 결합한 질문까지 처리했다.

#### 4.1.2 VectorDB: Hit Rate 1.0 · MRR 0.93

| 질문 | Rank | RR |
|------|:---:|:---:|
| 부모님이 자꾸 같은 말을 반복해요, 치매인가요? | 1 | 1.00 |
| 치매 조기검진은 어디서 어떻게 받나요? | 1 | 1.00 |
| 알츠하이머랑 치매랑 뭐가 달라요? | 1 | 1.00 |
| 치매 예방하려면 어떻게 해야 하나요? | 3 | 0.33 |
| 경도인지장애가 뭔가요? | 1 | 1.00 |
| 치매 환자 가족으로서 어떻게 대해야 하나요? | 1 | 1.00 |
| 치매 검사 비용이 얼마나 드나요? | 1 | 1.00 |
| 밤에 자꾸 나가려고 해요, 치매 증상인가요? | 1 | 1.00 |
| 치매 관련 법적 지원이 있나요? | 1 | 1.00 |
| 파킨슨병과 치매의 관계가 뭔가요? | 1 | 1.00 |

10개 질의 모두 top-4 안에서 정답을 찾았고, 9개는 첫 번째 결과가 정답이었다.

#### 4.1.3 최종 답변: RAGAS와 정성 평가

| 지표 | 점수 |
|------|:---:|
| Faithfulness | 0.27 |
| Answer Relevancy | 0.41 |
| Context Precision | 0.45 |
| Context Recall | 0.60 |

검색 단계와 달리 RAGAS 점수는 낮게 나왔다. 그래서 같은 질문을 실제 배포 환경에 넣고, 정확성 · 유용성 · 톤 · 일관성 기준으로 답변을 직접 채점했다.

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
  <img src="/images/projects/dementia-alarm/qual-1.png" alt="정성평가: 작업 요법" />
  <img src="/images/projects/dementia-alarm/qual-2.png" alt="정성평가: 베란다 소변" />
</div>

| 질문 | 평가 |
|------|------|
| 치매 환자에게 작업 요법이 필요한 이유는? | 참고자료 2건을 인용해 목적과 효과를 정확히 설명하고, 어르신의 관심사를 되물은 뒤 지역 센터 연계까지 자연스럽게 제안했다. |
| 치매 환자가 베란다에서 소변 보는 이유는? | 화장실 혼동 등 원인을 설명하고 표식 부착 같은 실행 가능한 대처법을 제시했다. 보호자의 고충에 대한 공감 표현도 적절했다. |

두 질문 모두 RAGAS 점수는 낮았지만 실제 답변은 준수했다. 출처 인용, 되묻기, 공감 표현처럼 서비스가 의도한 응답 방식을 RAGAS가 "근거에 없는 내용"으로 낮게 평가한 것으로 보인다. 자동 지표만으로는 상담형 답변의 품질을 판단하기 어렵다는 점을 확인했고, 정량 · 정성 평가를 함께 보는 기준이 필요하다.

#### 4.1.4 서비스 테스트: 99건 중 98건 통과

| 영역 | 테스트 수 | 결과 |
|------|:---:|------|
| 프론트엔드 | 40 | 전체 통과 |
| 백엔드 | 29 | 28건 통과, 1건 미실행 (체크인 저장 API 병합 전) |
| DB | 18 | 전체 통과 |
| 서비스 가용성 | 12 | 전체 통과 (페이지 로딩 3초 이내, 챗봇 응답 10초 이내 포함) |

### 4.2 서비스 화면 · 시연

![서비스 데모](/images/projects/dementia-alarm/demo.gif)

<details>
<summary>서비스 화면 보기</summary>

<br/>

| | |
|:---:|:---:|
| ![메인](/images/projects/dementia-alarm/screen-01-main.jpg) | ![AI 상담](/images/projects/dementia-alarm/screen-12-chat.jpg) |
| **메인** | **AI 치매 상담** |
| ![센터 찾기](/images/projects/dementia-alarm/screen-02-center-map.jpg) | ![이용 가이드](/images/projects/dementia-alarm/screen-03-guide.jpg) |
| **치매센터 찾기** | **이용 가이드** |
| ![예방 탭](/images/projects/dementia-alarm/screen-13-prevention.jpg) | ![게시글](/images/projects/dementia-alarm/screen-16-post.jpg) |
| **예방 탭** | **예방 콘텐츠** |
| ![오늘의 대화](/images/projects/dementia-alarm/screen-14-checkin-modal.jpg) | ![오늘의 대화 기록](/images/projects/dementia-alarm/screen-15-checkin-report.jpg) |
| **오늘의 대화** | **오늘의 대화 기록** |
| ![두뇌 게임](/images/projects/dementia-alarm/screen-17-games.jpg) | ![스도쿠](/images/projects/dementia-alarm/screen-19-sudoku.jpg) |
| **두뇌 게임** | **스도쿠** |
| ![색깔 맞추기](/images/projects/dementia-alarm/screen-21-color-match.jpg) | ![순서 기억하기](/images/projects/dementia-alarm/screen-23-sequence.jpg) |
| **색깔 맞추기** | **순서 기억하기** |
| ![카드 짝 맞추기](/images/projects/dementia-alarm/screen-25-card-match.jpg) | ![게임 통계](/images/projects/dementia-alarm/screen-27-game-stats.jpg) |
| **카드 짝 맞추기** | **게임 통계** |
| ![데이터 출처](/images/projects/dementia-alarm/screen-04-data-source.jpg) | |
| **데이터 출처** | |

</details>

### 4.3 회고

- **좋은 답변은 결국 잘 정리된 데이터와 구조에서 나온다.** 공공데이터 두 개는 서로 빠진 정보를 갖고 있었고 기관명 표기도 달랐다. 이름 → 좌표 2단계 매칭, 전화번호 기준 중복 병합, Union-Find 운영기관 병합으로 하나의 그래프를 만든 뒤에야 Tool이 정확한 답을 낼 수 있었다.
- **LLM에게 모든 걸 맡기지 않는 설계가 더 정확했다.** Cypher를 매번 생성하게 하자 관계 방향 오류가 났다. 자주 묻는 질문은 검증된 쿼리로 고정하고 LLM은 어떤 Tool을 쓸지만 고르게 하자, Tool 평가에서 10개 모두 정답을 냈다.
- **검색 성능과 답변 품질은 다른 문제였다.** GraphDB · VectorDB 검색은 거의 완벽했지만 RAGAS 점수는 낮았다. 정성 평가로 실제 답변은 준수하다는 걸 확인했지만, 근거를 답변에 더 충실히 반영하는 프롬프트 · 응답 구조 개선과 상담형 서비스에 맞는 평가 기준이 다음 과제로 남았다.
- **먼저 배포해 두면 다음 단계가 넓어진다.** 3차에서 배포까지 끝내 두었기 때문에, 4차는 센터 지도 · 오늘의 대화 · 예방 콘텐츠 · 두뇌 게임 같은 기능 확장에 집중할 수 있었다.

---

## 5. 참고 문헌

**① 통계 · 조사**
- 중앙치매센터. (2025). 2025년 치매 인식도 조사.

**② GraphDB 데이터**
- 국립중앙의료원. 치매안심센터 정보. 공공데이터포털. [data.go.kr/data/15138421](https://www.data.go.kr/data/15138421/fileData.do)
- 행정안전부. 전국치매센터표준데이터. 공공데이터포털. [data.go.kr/data/15021138](https://www.data.go.kr/data/15021138/standard.do)

**③ VectorDB 문서**
- 국립치매관리기관 치매안심센터. 조기검진 서비스. [ansim.nid.or.kr](https://ansim.nid.or.kr/introduce/early_service.aspx)
- 보건복지부. [mohw.go.kr](https://www.mohw.go.kr/menu.es?mid=a10712010100)
- 법제처 찾기쉬운 생활법령정보. [easylaw.go.kr](https://www.easylaw.go.kr/CSP/OnhunqueansInfoRetrieve.laf?onhunqnaAstSeq=97&onhunqueSeq=4461)
- 국가정신건강정보포털. [mentalhealth.go.kr](https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=22)
- 중앙치매센터. 치매사전. [nid.or.kr](https://www.nid.or.kr/info/diction_list5.aspx?gubun=0506)
- 질병관리청 국가건강정보포털. [health.kdca.go.kr](https://health.kdca.go.kr/healthinfo/)
- 파주시 보건소. [clinic.paju.go.kr](https://clinic.paju.go.kr/clinic/clinic_03/clinic_03_14/clinic_03_14_02.jsp)
