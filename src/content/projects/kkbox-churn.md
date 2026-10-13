---
title: "KKBOX 구독자 이탈 예측"
period: "2026.05.28 - 2026.06.04"
description: |
  아시아 음악 스트리밍 서비스 KKBOX의 실제 구독자 데이터로 고객 이탈을 예측하는 머신러닝 모델.
  LightGBM · XGBoost · Decision Tree를 비교하고, 결과를 Streamlit 대시보드로 시각화했다.
techStack: ["Python", "Pandas", "LightGBM", "XGBoost", "scikit-learn", "Streamlit"]
githubUrl: "https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN31-2nd-4Team"
thumbnail: ../../assets/images/projects/kkbox-churn/1.jpg
status: "Completed"
type: "toy"
---

## 1. 프로젝트 개요

KKBOX가 Kaggle에 공개한 실제 구독자 데이터로, **구독 만료 후 30일 안에 재구독하지 않을 고객**을 미리 예측하는 프로젝트다. 결제 이력, 멤버십 정보, 음악 청취 로그를 통합해 이탈 위험 고객을 조기에 찾고, 그 결과를 마케팅 액션으로 연결하는 대시보드까지 만들었다.

| 항목 | 내용 |
|------|------|
| 수행 기간 | 2026.05.28 ~ 06.04 (공식 일정 06.02 ~ 06.04) |
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

### 학습 데이터

| 항목 | 내용 |
|------|------|
| 학습 / 검증 / 평가 | 516,580 / 172,193 / 172,194 행 |
| 사용 피처 | 32개 |
| 이탈률 | 약 9.46% (클래스 불균형) |
| 불균형 대응 | `scale_pos_weight = 9.57`, `class_weight='balanced'` |
| 튜닝 | GridSearchCV (5-fold, AUC 기준) |

### 모델 비교

| 모델 | AUC | F1 | Log Loss |
|------|------|------|------|
| **LightGBM (최종)** | **0.9927** | **0.8752** | **0.0733** |
| XGBoost | 0.9918 | 0.8568 | 0.0915 |
| Decision Tree | 0.9691 | 0.6859 | 0.2154 |

AUC는 LightGBM과 XGBoost가 거의 같았지만, F1과 Log Loss에서 LightGBM이 앞섰다. SHAP으로 변수 영향을 설명할 수 있다는 점까지 고려해 LightGBM을 최종 모델로 골랐다.

### 이탈 요인 분석 (SHAP)

| 순위 | 변수 | 의미 |
|------|------|------|
| 1 | `expire_day` | 구독 만료일 |
| 2 | `is_auto_renew` | 자동 갱신 여부 |
| 3 | `expire_weekday` | 만료 요일 |
| 4 | `trans_day` | 결제일 |
| 5 | `is_cancel` | 구독 취소 클릭 |

상위 변수 대부분이 결제·구독 관련 변수였다. 자동 갱신을 쓰지 않거나(`is_auto_renew=0`) 취소를 누른 고객(`is_cancel=1`)일수록 이탈 확률이 높아지는 방향으로 작용했다.

### 위험군 분류

예측 확률로 고객을 10개 구간(Risk Decile)으로 나눴다. **고위험군의 실제 이탈률은 31.5%로 전체 이탈률(9.46%)의 약 3.3배**였다. 모델이 이탈할 고객을 실제로 골라낸다는 뜻이다.

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
