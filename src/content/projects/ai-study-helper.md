---
title: "AI Study Helper"
period: "2022.09 - 2022.12"
description: "AI 기반 학습 도우미 챗봇 및 문제 자동 생성기. OpenAI API 및 LangChain을 적용하고 Streamlit으로 대화형 프로토타이핑 구축."
techStack: ["Streamlit", "LangChain", "OpenAI"]
githubUrl: "https://github.com/example/ai-study-helper"
thumbnail: ../../assets/images/projects/ai-study-helper/1.jpg
status: "Live"
---

## 1. 프로젝트 목적 및 기획
AI Study Helper는 대학 전공 도서, 학술 강의 스크립트, 그리고 방대한 개념 서적을 읽는 데 겪는 시간 비효율을 해결하기 위해 개발된 **지능형 학습 러닝메이트 대화 봇 서비스**입니다. 긴 교재 PDF를 업로드하기만 하면 해당 교재 본문에만 기반을 둔 높은 độ chính xác의 답변과 예상 기말고사 퀴즈를 쏟아냅니다.

### 주요 서비스 타겟
- 방대한 기계학습 전공 PDF 문서를 빠르게 요약하고 시험 대비 모의테스트를 자동 추출하고 싶은 수강생

---

## 2. 시스템 구조 및 LangChain 파이프라인
프로토타입 개발의 민첩성과 AI 시각화의 강력한 장점을 결합하고자 프론트엔드는 **Streamlit**을 적용하고, 코어 LLM 체인은 **LangChain** 모듈을 조합하여 구현했습니다.

### LangChain 핵심 처리 로직
- **PDF Document Loader & Splitter**: PyPDF2 래퍼를 활용해 문서 파서블 청크(Chunk size: 1000, overlap: 200)로 분절
- **Conversational Retrieval Chain**: 과거 5 턴(Turn) 이상의 대화 이력을 메모리 버퍼에 기록하여 다단 문맥 질의("아까 설명한 그 개념을 수학 기호로 풀어서 보여줘")를 정확히 해석

---

## 3. 트러블슈팅 및 향후 개선안
초기 프로토타이핑 모델이었던 만큼 다양한 LLM 호출 비용 및 레이턴시 문제와 직면하였으며, 이를 통해 많은 노하우를 깨우쳤습니다.

### 트러블슈팅: 프론트엔드 UI Blocking 및 OpenAI Rate Limit 에러
- **문제 현상**: 긴 요약 요청 수행 도중 Streamlit 대화형 창이 하얗게 동결되거나, 연속 퀴즈 추출 요청 시 OpenAI 429 Rate Limit 초과 에러 다발성 발생
- **해결 방안**: LangChain AsyncCallbackHandler 모듈 및 SSE 토큰 스트리밍 기술을 수입하여 대화 입력 창의 실시간 피드백감을 향상시켰으며, Exponential Backoff 기반 자동 재시도 알고리즘(Tenacity 패키지 응용)을 삽입해 Rate Limit 예외 처리를 완화했습니다.

---

## 4. 프로젝트 회고
단기간(약 3개월)에 AI의 힘을 응용한 사용성 높은 데스크톱 수준의 프로토타이핑 서비스를 이뤄냈다는 점에서 무척 뜻깊었던 작업이었습니다.
