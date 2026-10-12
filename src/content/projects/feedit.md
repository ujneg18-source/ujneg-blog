---
title: "FEEDiT"
period: "2026.08 - 2026.10"
description: |
  패션의 흐름을 읽고, 나에게 맞는 선택으로.
  패션 상품·리뷰·영상·댓글·검색 신호를 모아 트렌드 분석, AI 스타일 대화, 구매 판단(살!말?)으로 연결하는 서비스.
  SK네트웍스 Family AI 캠프 파이널 프로젝트.
techStack: ["Vite", "Django", "Python", "PostgreSQL", "Celery", "Redis", "AWS EC2", "Vercel"]
githubUrl: "https://github.com/feedit-official/feedit"
thumbnail: ../../assets/images/projects/feedit/1.jpg
status: "Live"
---

## 1. 프로젝트 개요

패션 상품·리뷰·영상·댓글·검색 신호를 수집하고, 사전 기반 정규화와 분석을 거쳐 사용자가 탐색하고 질문할 수 있는 서비스로 제공한다. 가격과 트렌드를 보여줄 때 **그 근거를 함께 보여주는 것**을 핵심으로 잡았다.

| 항목 | 내용 |
|------|------|
| 팀 | FEEDiT (5인 · PM 1, 백엔드 2, 프론트엔드 2) |
| 역할 | PM · 서비스 기획 |
| 서비스 | [fee-di-t-frontend.vercel.app](https://fee-di-t-frontend.vercel.app) |
| 저장소 | [feedit-official/feedit](https://github.com/feedit-official/feedit) · [스타일 분류기](https://github.com/ujneg18-source/feedit-style-classifier) |

---

## 2. 핵심 기능

| 단계 | 기능 | 내용 |
|------|------|------|
| 01 / DISCOVER | **트렌드 탐색** | 키워드 검색, 기간별 추이, 연관어, 스타일과 상품 탐색. 트렌드 온도·연관어·구매의향·할인·리셀·수명주기 조회와 시각화 |
| 02 / UNDERSTAND | **AI 스타일 대화** | 데이터 도구로 지표를 해석하고 상품 질문과 코디 제안에 답한다. 일반/살말 모드, SSE 응답, 대화 기록, 근거 기반 도구 호출 |
| 03 / DECIDE | **살!말?** | 구매 판단 지표, 커뮤니티 투표, 코디 인계와 가상 피팅. 관심 키워드·저장 항목·주간 리포트를 모은 내 피드로 이어진다 |

---

## 3. PM으로서 한 일

프론트엔드, 백엔드, 데이터, AI까지 팀원마다 맡은 영역과 기술 수준이 달라서, 각자의 결과물을 **하나의 서비스로 연결하는 것**이 가장 큰 과제였다.

- 프로젝트 초기에 핵심 기능과 우선순위를 정하고, WBS로 업무를 세분화했다.
- 기획서와 산출물을 관리하고, Git 작업 현황을 보며 기능별 진행 상황과 선후 관계를 조율했다.
- 기능을 요청할 때는 사용 목적, 필요한 데이터, 입력·출력 형태를 함께 정리해 전달했다.
- EC2 서버와 서비스 아키텍처를 관리하고, AI 챗봇 구조를 설계했다.
- 가상 피팅은 VTON 계열 모델과 생성형 이미지 모델을 비교해 서비스 적용 방식을 검토했다.

---

## 4. 패션 스타일 분류기

상품 이미지를 14개 한국 패션 스타일로 자동 분류하는 모델이다. ZooClaw 임베딩과 Linear Classifier를 학습하며 베이스 모델을 비교했다.

### 데이터

- 무신사 상품 이미지 4,759장의 원본 태그는 품질이 낮아, 자체 제작한 Streamlit 라벨 에디터로 Top-1/Top-2 라벨을 수동 태깅해 **5,142장**으로 정리했다.
- 검증셋 오분류 424장을 전수 감사해, 라벨 오류와 직접 입력 확정분 **226건을 교정**했다.

### 베이스 임베딩 모델 비교

| 임베딩 모델 | 분류기 | Top-1 정확도 |
|-------------|--------|-------------|
| OpenCLIP | SVM | 54.5% |
| Marqo-fashionSigLIP | MLP | 68.9% |
| ZooClaw-FashionSigLIP2 | MLP | 70.6% |
| **ZooClaw-FashionSigLIP2** | **Linear Probe** | **62.4% (실질 ≈ 81%)** |

- 영문 프롬프트 기반 zero-shot은 Top-1 0.19~0.20에 그쳐, 지도학습(Linear Probe)으로 전환했다.
- 패션 스타일은 경계가 모호해서(예: 비즈니스코어와 클래식) 단일 라벨 정확도만으로는 실제 성능이 과소평가된다. Top-2 라벨까지 고려한 감사 기반 실질 정확도로 평가했다.

### 운영 태깅

- 라벨이 없는 상품 이미지 4,059장 중 4,044장에 스타일 태그를 자동 부여했다.
- 태그 후처리 규칙: Top-1은 항상 넣고, Top-2는 확률 0.15 이상일 때만 넣어 최대 2개까지 붙인다.

---

## 5. 시스템 구성

```
사용자 → Vercel(프론트엔드 · Serverless API) → EC2 / nginx ─┬─ Django API ──── RDS PostgreSQL
                                          └─ Chat / SSE 서버 ─ 외부 언어·이미지 모델 API
Celery Beat → Redis → Celery Worker → 수집·텍스트 분석 → RDS · S3
```

- 프론트엔드는 Vite + Vanilla JavaScript, 백엔드는 Django, 챗봇은 별도 Python 서버로 분리했다.
- 수집과 분석은 Celery Beat가 정기적으로 돌린다.

---

## 6. 기술 스택

| 분류 | 기술 |
|------|------|
| 프론트엔드 | Vite, JavaScript, Vercel |
| 백엔드 | Django, Python |
| 데이터 | PostgreSQL(RDS), Redis, Celery, S3 |
| 인프라 | AWS EC2, nginx |
| AI | 스타일 분류기(ZooClaw-FashionSigLIP2 + Linear Probe), LLM 챗봇, 가상 피팅 |
