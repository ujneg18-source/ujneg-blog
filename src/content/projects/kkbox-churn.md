---
title: "KKBOX 구독자 이탈 예측"
period: "2026.06.02 - 2026.06.04"
description: |
  아시아 음악 스트리밍 서비스 KKBOX의 실제 구독자 데이터로 고객 이탈을 예측하는 머신러닝 모델.
  LightGBM · XGBoost · Decision Tree를 비교하고, 결과를 Streamlit 대시보드로 시각화했다.
techStack: ["Python", "Pandas", "LightGBM", "XGBoost", "scikit-learn", "Streamlit"]
githubUrl: "https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN31-2nd-4Team"
thumbnail: ../../assets/images/projects/kkbox-churn/1.jpg
status: "Completed"
---

## 1. 프로젝트 개요

KKBOX가 Kaggle에 공개한 실제 구독자 데이터로, **구독 만료 후 30일 안에 재구독하지 않을 고객**을 미리 예측하는 프로젝트다. 결제 이력, 멤버십 정보, 음악 청취 로그를 통합해 이탈 위험 고객을 조기에 찾고, 그 결과를 마케팅 액션으로 연결하는 대시보드까지 만들었다.

| 항목 | 내용 |
|------|------|
| 수행 기간 | 2026.06.02 ~ 06.04 (3일) |
| 팀 | 영크크Box (5인) · SK네트웍스 Family AI 캠프 2차 프로젝트 |
| 담당 | 데이터 전처리, LightGBM 모델링, 데이터·모델 산출물 작성 |

---

## 2. 데이터

| 테이블 | 사용 파일 |
|------|------|
| 학습 라벨 | `train_v2.csv` |
| 멤버 정보 | `members_v3.csv` |
| 결제 이력 | `transactions.csv` + `transactions_v2.csv` 병합 |
| 청취 로그 | `user_logs_v2.csv` |

네 테이블을 사용자 ID(`msno`) 기준으로 합쳐 도시·가입 경로, 가입 시점, 결제 횟수, 총 청취 시간, 구간별 청취 곡 수 등을 하나의 데이터셋으로 만들었다.

### 데이터 누수 제거

결제 만료 연·월처럼 **이탈 여부를 사실상 알려주는 컬럼**(`expire_month/year`, `trans_month/year`)을 찾아 제거했다. 이런 컬럼이 남아 있으면 점수는 높게 나오지만 실제 예측에는 쓸 수 없는 모델이 된다.

---

## 3. 모델링

LightGBM, XGBoost, Decision Tree를 비교하고, Kaggle 공식 지표인 Log Loss를 기준으로 최종 모델을 골랐다. 최종 모델은 LightGBM이다.

| 지표 | LightGBM (최종) |
|------|------|
| Test AUC | 0.9927 |
| F1 | 0.8738 |

### 이탈 요인 분석 (SHAP)

가장 영향이 큰 변수는 `expire_day`(만료일), `is_auto_renew`(자동 갱신 여부), `is_cancel`(구독 취소 클릭)이었다.

---

## 4. 대시보드

예측 결과를 비즈니스 의사결정으로 연결하는 데 초점을 맞췄다.

- **전체 가입자 EDA 리포트**: 유저 청취·탐색 인게이지먼트 분석
- **LightGBM 검증 성능 리포트**: 모델 성능과 변수 중요도
- **리스크 추이 및 골든타임**: 위험도 구간(decile)별 이탈 추이
- **위험 등급별 고객 CRM**: 당월 만료 예정자 규모, 매출 리스크, CRM 예상 방어 매출액(CLTV 기반 영향 분석)

자동 갱신 여부와 취소 클릭 행태에 따른 실제 이탈률을 교차 분석해, 자동 결제 전환 프로모션 같은 구체적인 대응 방안으로 이어지게 했다.

---

## 5. 기술 스택

| 분류 | 기술 |
|------|------|
| 언어 | Python |
| 데이터 처리 | Pandas, NumPy |
| 모델 | LightGBM, XGBoost, scikit-learn(Decision Tree), SHAP |
| 시각화 | Matplotlib, Streamlit |
