---
title: "AI 치매 정보 알리미"
period: "2026.07 - 2026.08"
description: |
  치매가 걱정되는 보호자를 위한 RAG 기반 챗봇.
  전국 치매안심센터 정보(GraphDB)와 조기검진·증상 가이드라인 문서(VectorDB)를 결합해,
  증상 안내부터 가까운 센터 연결까지 한 번에 돕는다.
techStack: ["LangGraph", "OpenAI", "Neo4j", "Qdrant", "Supabase", "FastAPI", "React"]
githubUrl: "https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN31-3rd-1Team"
thumbnail: ../../assets/images/projects/dementia-alarm/1.jpg
status: "Live"
---

## 1. 프로젝트 개요

보호자가 증상을 설명하면 VectorDB에 적재된 가이드라인을 근거로 안내하고, 거주 지역을 알려주면 가까운 치매안심센터의 위치·운영기관·제공 프로그램을 알려주는 챗봇이다. SK네트웍스 Family AI 캠프 3차 프로젝트로 만들고, 4차 프로젝트에서 팀원 4명이 서비스를 확장했다.

| 항목 | 내용 |
|------|------|
| 팀 | 건망검진 (3차 5인 · 4차 4인) |
| 역할 (3차) | PM · GraphDB 설계 · 데이터 수집 및 전처리 · Agent Tool 개발 |
| 역할 (4차) | GraphDB · VectorDB 설계 · 데이터 수집 및 포스팅 |
| 서비스 | [dementia-front.vercel.app](https://dementia-front.vercel.app) |
| 저장소 | [SKN31-3rd-1Team](https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN31-3rd-1Team) · [SKN31-4th-1Team](https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN31-4th-1Team) |

---

## 2. 배경

- 국내 치매 환자 수는 2026년 100만 명을 넘고, 2044년에는 200만 명을 넘어설 전망이다.
- 중앙치매센터 「2025년 치매 인식도 조사」에서 치매안심센터 인지도는 49.4%였지만, 실제 방문 경험률은 12.1%에 그쳤다.
- 국민이 가장 필요로 하는 정보는 예방 및 치료(76.2%), 원인 및 증상(49.9%) 순이었다.

센터가 있다는 건 알아도 실제로 가지는 않는다. 그래서 **초기 증상 정보에 쉽게 닿고, 그 대화가 가까운 센터로 자연스럽게 이어지는 챗봇**을 기획했다.

---

## 3. 구조

LangGraph 기반 ReAct 에이전트가 질문 내용에 따라 GraphDB와 VectorDB 중 어떤 도구를 쓸지 스스로 판단한다. 정해진 순서대로 흐르는 체인 대신, LLM과 도구가 답이 나올 때까지 왕복하는 루프를 썼다.

1. 생각 — 질문에 필요한 정보가 무엇인지 판단
2. 행동 — GraphDB / VectorDB 도구 호출
3. 관찰 — 결과 확인
4. 재판단 — 더 필요하면 1번으로
5. 최종 답변

| 저장소 | 담는 것 |
|------|------|
| GraphDB (Neo4j AuraDB) | 시도 → 시군구 → 치매안심센터 → 운영기관 → 프로그램 |
| VectorDB (Qdrant) | 치매 조기검진·증상 가이드라인 문서 |
| Supabase | 세션 단위 단기 상태, 사용자별 장기 상태 |

---

## 4. GraphDB 구축 (담당)

- 공공데이터 2종을 병합해 **치매안심센터 313 · 운영기관 228 · 프로그램 683**, 노드 1,504개와 관계 2,419개를 구축했다.
- **중복 노드 45개 그룹**을 병합했다.
- **홈페이지 결측 101건**을 보완했다.
- 에이전트가 호출할 그래프 검색 도구로 **고정 Tool 9개와 Fallback Tool 1개**를 구현했다.

---

## 5. 성능 평가

| 대상 | 지표 | 결과 |
|------|------|------|
| GraphDB | Precision · Recall | 1.0 (10/10) |
| VectorDB | Hit Rate | 1.0 |
| VectorDB | MRR | 0.93 |

---

## 6. 4차 프로젝트: 서비스 확장

4차 프로젝트에서는 상담 챗봇에 더해, 보호자가 매일 쓰는 서비스로 넓혔다. 이 단계의 PM은 다른 팀원이 맡았고, 나는 GraphDB · VectorDB 설계와 데이터 수집, 예방 정보 포스팅을 맡았다.

- **오늘의 대화**: 3~5턴 짧은 대화를 AI가 요약해 하루 한 번 기록하고, 상태에 따라 센터 찾기를 권한다.
- **두뇌 게임**: 스도쿠·카드 짝 맞추기 등 게임 기록과 통계
- **예방 정보**: 식습관·운동·수면 등 예방 콘텐츠
- **센터 지도**: 지도에서 가까운 치매안심센터 찾기

---

## 7. 기술 스택

| 분류 | 기술 |
|------|------|
| 에이전트 | LangGraph, OpenAI |
| GraphDB | Neo4j AuraDB |
| VectorDB | Qdrant |
| DB · 인증 | Supabase |
| 백엔드 | FastAPI |
| 프론트엔드 | React |
