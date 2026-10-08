---
title: "데이터 전처리: 결측치·이상치·인코딩·스케일링"
description: "결측치 삭제와 대체(SimpleImputer·KNNImputer), IQR 기준 이상치 탐지, 범주형 변수의 레이블 인코딩과 원핫 인코딩, StandardScaler·MinMaxScaler 스케일링, 그리고 전처리기와 모델을 pickle로 저장하는 방법까지 Adult·유방암 데이터 예제와 함께 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 6
originalNotebook: "04_데이터_전처리.ipynb"
tags: ["Python","scikit-learn","Preprocessing","Encoding","Scaling"]
date: 2026-05-18
---

> SKN31 머신러닝 과정 노트북 `04_데이터_전처리.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7, pandas 2.3에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 데이터 전처리란
- 결측치 처리: 삭제, 대체, `SimpleImputer`, `KNNImputer`
- 이상치 처리: 표준편차·IQR 기준, 제거·윈저화·대체
- Feature 타입별 전처리: 범주형(레이블 인코딩, 원핫 인코딩), Adult 데이터 예제
- 수치형 스케일링: `StandardScaler`, `MinMaxScaler`, 유방암 데이터 예제
- 학습한 전처리기와 모델을 pickle로 저장하기

## 데이터 전처리(Data Preprocessing)란

수업 시작에 적은 메모들이다.

```python
# 전처리: DATA 학습 전 (모델이 학습하기 좋게) 정제 (스케일링, 인코딩, 결측치 처리)
# 후처리: 모델의 출력값(예측 값)을 처리하는 경우 => ex.0번->세토사
```

```python
#  (시간을 가장 많이 씀) 전처리를 잘하면 성능이 올라감
```

```python
# 도메인 지식에 의한 전처리 ex) 구매와 관련된 고객데이터 / 타겟:구매여부/피처:나이/성별<=마케팅지식을 활용함
# 만드려고 하는 프로그램의 도메인지식이 좋을수록 좋음 ex.글쓰기, 작법
# 피쳐 엔지니어링 => 공학적인 전처리 방법
```

- **정의**: 데이터 분석이나 머신러닝 모델에 적합하도록 데이터셋을 변환·조정하는 과정
- **시점**: 분석·모델링 전에 하는 준비 작업
- **원칙: Garbage in, garbage out**. 입력이 잘못되면 출력도 잘못된다
  - 학습(train) 데이터의 품질이 **모델 성능에 가장 큰 영향**을 준다

주요 작업은 이렇다.

| 작업 | 내용 |
|---|---|
| **데이터 정제** (Data cleaning) | 오류값, 이상치, 불필요한 값, 결측치, 중복값을 찾아 수정·제거 |
| **특성 선택·파생변수 생성** (Feature selection & engineering) | 필요한 컬럼만 고르거나, 기존 컬럼을 조합·변환해 새 feature 생성 |
| **데이터 타입 변환** (Type casting) | 문자열 → 날짜, 범주형 → 수치형 등 원래 의미에 맞게 변환 |
| **스케일링** (Feature scaling) | 수치형 컬럼의 척도를 맞춤. 표준화(평균 0, 표준편차 1), 정규화([0, 1]) |
| **범주형 인코딩** (Categorical encoding) | 문자열 범주를 숫자로. 원핫, 순서형, 타깃 인코딩 등 |
| **클래스 불균형** 처리 | 적은 클래스를 늘리거나(Over sampling) 많은 클래스를 줄여(Under sampling) 수를 맞춤 |

```python
# 사이킥런은 결측치를 계산못함
# X(파생변수=특성) = 입력값 多(제거) 少(생성)
```

```python
# 가짜 데이터를 생성 => LLM 활용
```

feature가 너무 많으면 줄이고, 적으면 만든다. Over sampling에서 말하는 "가짜 데이터"는 기존 데이터를 바탕으로 비슷한 데이터를 만들어 내는 것이고, 요즘은 LLM으로 생성하기도 한다는 메모다.

> **보충** "사이킷런은 결측치를 계산 못 한다"는 대부분의 모델에 해당하는 말이다. `NaN`이 있는 데이터를 `fit()`에 넣으면 에러가 난다. 다만 `HistGradientBoostingClassifier`처럼 결측치를 직접 처리하는 모델도 일부 있다.

## 결측치(Missing Value) 처리

결측치는 수집하지 못한 값, 모르는 값, 없는 값이다. 언어마다 `NA`, `NaN`, `None`, `null`로 표현한다. 모델링 전에 반드시 처리해야 한다.

처리하기 전에 먼저 결측의 성격을 구분한다.

- **구조적 결측**(structural missingness): 원래 존재하지 않아서 비어 있음. 그 맥락에서 값이 정의되지 않는 경우다. 임의로 추정하지 말고 결측으로 두거나 "해당 없음"처럼 의미가 드러나게 표시한다
- **관측 결측**(observational missingness): 값이 있었는데 기록·수집에 실패해 비어 있음. 다른 컬럼 정보나 도메인 지식으로 대체를 검토할 수 있다

```python
# 결측치 제거 방법 => 대체 및 제거
# 결측치 제거 순서
# 판단: 관측 결측 OR 존재 無
```

> **보충** 예를 들어 "배우자 나이" 컬럼이 비어 있다면, 미혼이라 비어 있는 건 구조적 결측이고 기혼인데 입력을 안 한 건 관측 결측이다. 앞쪽을 평균으로 채우면 없는 배우자의 나이를 지어내는 셈이 된다.

### 1. 결측치 삭제

- **리스트와이즈 삭제**(Listwise Deletion): 결측치가 있는 **행**을 삭제한다. 수집한 다른 값도 같이 사라진다. 데이터가 충분히 크고 결측치가 적을 때 적합하다
- **컬럼 삭제**(Drop column): 컬럼 자체에 결측치가 너무 많으면 컬럼을 지운다

```python
# 리스트 와이즈 (행을 삭제) = 일반적으로 행을 삭제
# 컬럼 삭제 (열을 삭제) => 컬럼을 삭제하는 경우는 컬럼자체에 문제가 있을 경우 (노이즈) 기본 베이스는 얼마나 데이터를 살릴 수 있냐
```

```python
import pandas as pd
import numpy as np
data = {
    "name":['김영희', '이명수', '박진우', '이수영', '오영미'],
    "age": [23, 18, 25, 32, np.nan],
    "weight":[np.nan, 80, np.nan, 57, 48]
}
df = pd.DataFrame(data)
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>weight</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영희</td><td>23.0</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">1</th><td>이명수</td><td>18.0</td><td>80.0</td></tr><tr><th class="idx">2</th><td>박진우</td><td>25.0</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">3</th><td>이수영</td><td>32.0</td><td>57.0</td></tr><tr><th class="idx">4</th><td>오영미</td><td><span class="sql-null">NaN</span></td><td>48.0</td></tr></tbody></table></div></div>

```python
# 결측치 확인 - 전체
df.isna().sum() # 컬럼별 결측치 개수
```

```text
name      0
age       1
weight    2
dtype: int64
```

```python
# 제거 - 행단위(리스트와즈, 0축 기준 제거: default)
df.dropna()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>weight</th></tr></thead><tbody><tr><th class="idx">1</th><td>이명수</td><td>18.0</td><td>80.0</td></tr><tr><th class="idx">3</th><td>이수영</td><td>32.0</td><td>57.0</td></tr></tbody></table></div></div>

```python
# 컬럼단위 (1축 기준 삭제)
new_df = df.dropna(axis=1)
new_df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 1열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영희</td></tr><tr><th class="idx">1</th><td>이명수</td></tr><tr><th class="idx">2</th><td>박진우</td></tr><tr><th class="idx">3</th><td>이수영</td></tr><tr><th class="idx">4</th><td>오영미</td></tr></tbody></table></div></div>

행 단위로 지우면 5명 중 2명만 남고, 열 단위로 지우면 `name`만 남는다. 결측치 3개 때문에 데이터 대부분을 잃는다.

### 2. 결측치 대체(Imputation)

수집하지 못해 누락된 값이라면 그 값일 가능성이 가장 높은 값으로 채운다.

- **도메인 기반 처리**
- **평균/중앙값/최빈값 대체**
  - **평균**: 정규분포를 따르거나 극단치가 없는 수치형 컬럼에 적합
  - **중앙값**: 극단치가 있거나 분포가 비대칭인 수치형 컬럼에 적합. 보통 평균보다 중앙값을 쓴다
  - **최빈값**: 범주형 컬럼은 대푯값인 최빈값으로 채운다
- **모델링 기반 대체**: 결측치가 있는 컬럼을 출력(y)으로, 나머지 컬럼을 입력(X)으로 해서 결측치를 예측하는 모델을 만든다
  - **K-NN 대체**: 가장 가까운 K개 데이터의 평균(수치형)이나 최빈값(범주형)으로 채운다
- **결측치를 표현하는 값으로 대체**: 나이의 `NaN`을 `-1`, 혈액형의 `NaN`을 `"없음"`처럼 그 컬럼이 가질 수 없는 값으로 바꾼다
- **다중 대체**(multiple imputation): 여러 방식으로 대체한 데이터셋을 만들어 각각 분석한 뒤 결과를 합친다

```python
# 평균 = 정규 분포에서 제일 많은 값으로 대체
```

```python
# 머신러닝 모델로 결측치를 예측하는 모델을 만듦
# 입력값으로는 이름하고 나이(feature) => 몸무게 예측 (target)
```

```python
# 결측치 자체를 값으로 쓸 경우 => nan을 대체
# 결측치 자체를 하나의 데이터로 분석해야 하는 경우
# ex -> 나이 = -1 , 문자열 = 없음
```

```python
# 여러 방법을 활용해서 제일 **성능** 좋은 것을 사용함
```

### 판다스로 대체하기

```python
import pandas as pd
import numpy as np

df = pd.DataFrame([
        [0.1, 2.2, np.nan],
        [0.3, 4.1, 1],
        [np.nan, 6, 1],
        [0.08, np.nan, 2],
        [0.12, 2.4, 1],
        [np.nan, 1.1, 3]
    ], columns=['A', 'B', 'C']
)
org = df.copy()
```

```python
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>A</th><th>B</th><th>C</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.1</td><td>2.2</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">1</th><td>0.3</td><td>4.1</td><td>1.0</td></tr><tr><th class="idx">2</th><td><span class="sql-null">NaN</span></td><td>6.0</td><td>1.0</td></tr><tr><th class="idx">3</th><td>0.08</td><td><span class="sql-null">NaN</span></td><td>2.0</td></tr><tr><th class="idx">4</th><td>0.12</td><td>2.4</td><td>1.0</td></tr><tr><th class="idx">5</th><td><span class="sql-null">NaN</span></td><td>1.1</td><td>3.0</td></tr></tbody></table></div></div>

컬럼별로 처리한다. A는 평균으로 채운다.

```python
# 컬럼별로 처리한다.
### 평균 대체
df['A']  = df['A'].fillna(df['A'].mean())
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>A</th><th>B</th><th>C</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.1</td><td>2.2</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">1</th><td>0.3</td><td>4.1</td><td>1.0</td></tr><tr><th class="idx">2</th><td>0.15</td><td>6.0</td><td>1.0</td></tr><tr><th class="idx">3</th><td>0.08</td><td><span class="sql-null">NaN</span></td><td>2.0</td></tr><tr><th class="idx">4</th><td>0.12</td><td>2.4</td><td>1.0</td></tr><tr><th class="idx">5</th><td>0.15</td><td>1.1</td><td>3.0</td></tr></tbody></table></div></div>

```python
#  df['A'] => 바꿀 열/행
# .fillna() 메서드
# ()=대체할 값
```

B는 중앙값으로 채운다.

```python
### 중앙값 대체
df['B'] = df['B'].fillna(df['B'].median())
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>A</th><th>B</th><th>C</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.1</td><td>2.2</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">1</th><td>0.3</td><td>4.1</td><td>1.0</td></tr><tr><th class="idx">2</th><td>0.15</td><td>6.0</td><td>1.0</td></tr><tr><th class="idx">3</th><td>0.08</td><td>2.4</td><td>2.0</td></tr><tr><th class="idx">4</th><td>0.12</td><td>2.4</td><td>1.0</td></tr><tr><th class="idx">5</th><td>0.15</td><td>1.1</td><td>3.0</td></tr></tbody></table></div></div>

C는 범주형이라고 보고 최빈값으로 채운다.

```python
df['C'].mode()
```

```text
0    1.0
Name: C, dtype: float64
```

```python
### 최빈값(범주형) 대체
df['C'] = df['C'].fillna(df['C'].mode())
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>A</th><th>B</th><th>C</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.1</td><td>2.2</td><td>1.0</td></tr><tr><th class="idx">1</th><td>0.3</td><td>4.1</td><td>1.0</td></tr><tr><th class="idx">2</th><td>0.15</td><td>6.0</td><td>1.0</td></tr><tr><th class="idx">3</th><td>0.08</td><td>2.4</td><td>2.0</td></tr><tr><th class="idx">4</th><td>0.12</td><td>2.4</td><td>1.0</td></tr><tr><th class="idx">5</th><td>0.15</td><td>1.1</td><td>3.0</td></tr></tbody></table></div></div>

> **보충** 결과는 맞게 나왔지만 **우연히** 맞은 것이다. `mode()`는 값 하나가 아니라 Series(`index 0 → 1.0`)를 돌려주고, `fillna()`에 Series를 넘기면 **같은 index끼리** 채운다. 결측치가 마침 0번 행에 있어서 채워졌을 뿐, 결측치가 다른 행에 있었다면 그대로 `NaN`으로 남는다. 최빈값이 여러 개일 수도 있으니 첫 번째 값 `mode()[0]`을 꺼내 써야 한다.

```python
# 보충: 결측치가 0번 행이 아닐 때
s = pd.Series([1, 1, np.nan, 2])
print(s.fillna(s.mode()).tolist())     # 2번 행이 채워지지 않는다
print(s.fillna(s.mode()[0]).tolist())  # 최빈값 하나를 꺼내서 채운다
```

```text
[1.0, 1.0, nan, 2.0]
[1.0, 1.0, 1.0, 2.0]
```

## scikit-learn 전처리기로 대체

수업에서 scikit-learn 클래스 구조를 먼저 정리했다.

```python
# 사이킷런 메인 클래스2가지
#  Estimator = 머신러닝 알고리즘 추론기(피쳐입력&라벨반환&예측) - 모든 추론기들은 이걸 상속받아서 만듦
#  why 상속? 알고리즘은 다르지만 받을 값은 같기 때문, 그래서 문법이 비슷함 (fit, predict)

#  Transtformer = 데이터 전처리 (피쳐변경) - 모든 전처리기들은 이걸 상속받아서 만듦
#  why 상속? 전처리하는데 필요한 기능을 통일함.
#  Imputer (na->처리)
#  Simplelmputer & KNNlmputer
#  Simplelmputer 피쳐를 (평균, 중앙값, 최빈값)으로 대체 Strategy = 파라미터 어떤 값으로 대체할지
#  KNNlmputer => 머신러닝 모델로 예측해서 대체해줌
```

모델(Estimator)은 `fit`/`predict`, 전처리기(Transformer)는 `fit`/`transform`으로 사용법이 통일되어 있다.

- **SimpleImputer**: 결측값을 평균, 중앙값, 최빈값, 상수로 대체한다
  - `strategy`: `"mean"`(평균), `"median"`(중앙값), `"most_frequent"`(최빈값), `"constant"`(상수, `fill_value=채울값`)
- **KNNImputer**: K-최근접 이웃 알고리즘으로 결측치가 있는 샘플과 가장 가까운 이웃을 찾아 그 값들의 평균으로 채운다

**모든 전처리기의 공통 메소드**

| 메소드 | 하는 일 |
|---|---|
| `fit()` | 변환에 필요한 값을 찾아 객체에 저장 (컬럼별 평균, 중앙값 등) |
| `transform()` | `fit`에서 찾은 값으로 실제 변환 (결측치 대체) |
| `fit_transform()` | `fit()`과 `transform()`을 순서대로 한 번에 |

```python
# fit = NA를 찾는 작업 ex. 컬럼별 평균, 중앙값        (찾는 과정)
# transform() = fit에서 찾은 값을 이용해 대체함     (대체 과정)
# fit_transform(): fit(), transform()을 순서대로 처리 (한번에 함)
```

> **보충** `fit`은 "결측치를 찾는" 작업이라기보다 **채울 값을 계산하는** 작업이다. 중앙값 대체라면 `fit`이 컬럼별 중앙값을 계산해 저장하고, `transform`이 그 값으로 `NaN`을 채운다. 이렇게 둘을 나눠 둔 이유는 아래 Adult 예제와 스케일링에서 나온다. train으로 `fit`한 값을 test와 새 데이터에도 **똑같이** 써야 하기 때문이다.

```python
# A, B 는 중앙값으로 대체
# C 는 최빈값으로 대체

# imputer가 2개 필요함 (중앙값, 최빈값)
# fit, transform은 기본적으로 2차원의 값을 받음 df 변환은 열기준으로 해줌 (Axis=o)
# 1차원 배열은 2차원 배열로 바꿔줘야 함 (방법1-series.to_frame(), 방법2 series.values.reshape(-1, 1))
```

### SimpleImputer 예제

```python
########################################################
# SimpleImputer 예제
########################################################
df = org.copy()

from sklearn.impute import SimpleImputer

# A, B (수치형) => 중앙값, C(범주형) => 최빈값
# 객체 생성시 어떤 방식으로 결측치를 대체할지 지정.

imputer1 = SimpleImputer(strategy="median")
imputer2 = SimpleImputer(strategy="most_frequent")


# 대체값을 찾는 과정
imputer1.fit(df[['A', 'B']])  # 결측치를 어떤 값으로 바꿀지 학습. (2차원 -> 0축 기준으로 계산)

# 대체값으로 변환하는 과정
result1 = imputer1.transform(df[['A', 'B']])  # 변환작업 (fit에서 찾은 중앙값으로 결측치를 대체) ## Fancy Indexing 열이름을 리스트로 줌

# 대체값을 찾고 바로 변환하는 과정
result2 = imputer2.fit_transform(df['C'].to_frame()) #2차원 배열/DataFrame전달. series.to_frame() : Series->DataFrame(메소드들은 2차원값을 받기 때문)
# fit/transform 을 순서대로 실행. fit/transform을 같은 데이터셋으로 할 경우 사용.

# result1, result2 하나로 합치기.
## ndarray 합치는 함수: np.concatenate([대상 배열들], axis=합칠방향(default: 0))
result = np.concatenate([result1, result2], axis=1) #합쳐지는 축은 상관없지만 나머지축은 숫자가 맞아야 함
print(result.shape)
c = ['A', 'B', 'C']
pd.DataFrame(result, columns= c)

#이게 하나의 trainset으로 사용
```

```text
(6, 3)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>A</th><th>B</th><th>C</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.1</td><td>2.2</td><td>1.0</td></tr><tr><th class="idx">1</th><td>0.3</td><td>4.1</td><td>1.0</td></tr><tr><th class="idx">2</th><td>0.11</td><td>6.0</td><td>1.0</td></tr><tr><th class="idx">3</th><td>0.08</td><td>2.4</td><td>2.0</td></tr><tr><th class="idx">4</th><td>0.12</td><td>2.4</td><td>1.0</td></tr><tr><th class="idx">5</th><td>0.11</td><td>1.1</td><td>3.0</td></tr></tbody></table></div></div>

A의 결측치가 평균 0.15가 아니라 중앙값 **0.11**로 채워졌다.

```python
result1.shape, result2.shape, '더하면', result.shape  #합쳐지는 축은 상관없지만 나머지축은 숫자가 맞아야 함
```

```text
((6, 2), (6, 1), '더하면', (6, 3))
```

전처리기는 2차원 입력을 받는다. Series 하나를 넣으려면 2차원으로 바꿔야 한다.

```python
df['C'] # 시리즈. 1차원
#imputer.fit (2차원배열) transfor,(2차원배열)
df['C'].to_frame()#시리즈(1차원)를 Dataframe 2차원으로 변환

df['C'].values.reshape(-1, 1) # reshape하는 방법도 있음
```

```text
array([[nan],
       [ 1.],
       [ 1.],
       [ 2.],
       [ 1.],
       [ 3.]])
```

### KNNImputer 예제

```python
#######################################################
# 주위에 가장 가까운 값으로 대체
#
########################################################
# KNNImputer 예제 / 1차원 데이터 = [-1(삼각형), 0(삼각형), 1(삼각형), 2(삼각형), 3(네모), 4(네모), 5(네모), 6] 1.5는 무슨도형일까? 삼각형 근처에 있는 값이 삼각형이기 때문
# 문제 상황 => 이상치가 가장 가까운 값일 경우 잘못된 값이 나올 수 있음
# 따라서 k는 여러 값을 지정해주는 것이 유리함 #k=몇개의 이웃을 확인할지
# 지정방법은 피처를 기준으로 타겟(*미지수)를 찾고 피처-다른 것들 후 가장 가까운 값대로 순위를 매겨서 평균으로 계산
########################################################
df = org.copy()
from sklearn.impute import KNNImputer

imputer = KNNImputer(n_neighbors=3)  # K - 가까운 데이터포인트 몇개를 확인 할지.

# n_neighbors 몇개의 이웃을 찾을 건지


result = imputer.fit_transform(df)
# imputer.fit(df) -> imputer.transform(df)
print(result)
```

```text
[[0.1        2.2        2.        ]
 [0.3        4.1        1.        ]
 [0.16666667 6.         1.        ]
 [0.08       2.9        2.        ]
 [0.12       2.4        1.        ]
 [0.1        1.1        3.        ]]
```

0번 행의 C는 A, B 값이 비슷한 이웃 3개의 C 평균인 2.0으로 채워졌다. 컬럼별로 따로 계산하는 SimpleImputer와 달리, **다른 컬럼 값까지 보고** 비슷한 행을 찾는다.

```python
# 머신 러닝 모델링에서 결측치를 제거하는건 쉽지 않음 => 앞으로 서비스할 때 결측치가 절대 안들어올리가 없기 때문
# 머신 러닝 모델링에서는 대부분 결측치를 대체함
# 어떤 값으로 대체했는지 (어떻게 전처리했는지) => 서비스할때도 동일하게 전처리함
# 요약 제거보다 대체
```

학습 데이터에서는 결측치가 있는 행을 지울 수 있지만, 서비스 중에 들어오는 데이터는 지울 수 없다. 그래서 대부분 **대체**하고, 학습 때 쓴 대체 방법을 서비스에서도 똑같이 적용한다.

## 이상치(Outlier) 처리

- 다른 관측치들과 크게 다른 값을 가지는 데이터 포인트
- **잘못된 값**이나 **극단치**가 있다
- 수집 과정의 문제, 측정 오류, 극단적인 변이가 그대로 수집된 경우 등에서 생긴다
- 일반적인 경향에서 벗어난 값이므로 **정확하게 식별하고 처리**해야 분석의 정확성과 신뢰성이 높아진다

```python
# 이상치 = 잘못들어가있는 값(少)=> 결측치 처리하면 됌, 극단치(多)
```

잘못 들어간 값은 결측치로 보고 처리하면 되고, 고민할 건 정상이지만 튀는 **극단치**다.

### 이상치 식별 기준

```python
# 도메인 => 그 분야에서 관습상 잘쓰지 않는 값
# 통계적 기준 => 표준편차, 분위수
```

**표준편차 기준**: 데이터가 정규분포를 따른다고 가정할 때, 평균에서 k 표준편차 범위 밖에 있으면 이상치로 본다.

$$
\mu - k \times \sigma \leq \text{정상 범위} \leq \mu + k \times \sigma \quad (\mu: \text{평균},\ \sigma: \text{표준편차})
$$

```python
# 이상치 판별 매뉴얼: Z-Score 기준

# 머신러닝에서는 데이터가 평균에서 표준편차의 몇 배만큼 떨어져 있는지를 보고 이상치를 판단함.

# k=1 (정상 범위): 데이터가 평균 근처에 있다는 뜻이야. 보통 전체 데이터의 약 68%가 이 범위 안에 들어옴

# k=2 (주의 범위): 평균에서 꽤 멀어지기 시작했어. 전체의 약 95%가 이 안에 포함

# k=3 이상 (이상치 의심): 평균에서 표준편차의 3배 넘게 떨어졌다면, 이건 일반적인 데이터가 아닐 확률이 매우 높음(약 99.7% 바깥).
```

> **보충** 마지막 줄은 "99.7%의 데이터가 ±3σ **안**에 있다", 즉 바깥은 약 0.3%라는 뜻이다.

**분위수(IQR) 기준**: 1분위(25%)와 3분위(75%)에서 IQR × 1.5보다 더 떨어진 값을 이상치로 본다. 정상 범위를 넓히거나 좁히려면 1.5를 바꾼다.

$$
IQR = Q_3 - Q_1, \qquad Q_1 - 1.5 \times IQR \leq \text{정상 범위} \leq Q_3 + 1.5 \times IQR
$$

### 극단치 처리 방법

1. **제거**: 결측치로 바꾸거나 행을 지운다. 분석 결과에 부정적 영향을 주거나, 대상 집단을 대표하지 않거나, 명확한 오류값일 때
2. **윈저화**(Winsorization): 최솟값과 최댓값을 정해 두고, 범위보다 작은 값은 최솟값으로, 큰 값은 최댓값으로 바꾼다
3. **대체**(Imputation): 평균, 중앙값, 최빈값 등으로 바꾼다

```python
# 서비스 중 다시 나오지 않을 확률이 높은 값은 제거
```

```python
# 최소값과 최빈값의 범위를 정해놓고 그 값을 넘어가는 값은 최소값이나 최빈값으로 대체
```

> **보충** 윈저화 메모의 "최빈값"은 **최댓값**이다. 하한과 상한을 정해 그 밖의 값을 경계값으로 눌러 붙이는 방식이다.

### 이상치 예제: 분위수 기준

```python
import pandas as pd
import numpy as np
np.random.seed(0)

df = pd.DataFrame(np.random.normal(10, 2, size=(10, 3)), columns=['a', 'b', 'c'])
df.iloc[[0, 3], [0, 2]] = [[100, 200],[300,-100]] # 극단값으로 변경
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 10행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>a</th><th>b</th><th>c</th></tr></thead><tbody><tr><th class="idx">0</th><td>100.0</td><td>10.800314</td><td>200.0</td></tr><tr><th class="idx">1</th><td>14.481786</td><td>13.735116</td><td>8.045444</td></tr><tr><th class="idx">2</th><td>11.900177</td><td>9.697286</td><td>9.793562</td></tr><tr><th class="idx">3</th><td>300.0</td><td>10.288087</td><td>-100.0</td></tr><tr><th class="idx">4</th><td>11.522075</td><td>10.24335</td><td>10.887726</td></tr><tr><th class="idx">5</th><td>10.667349</td><td>12.988158</td><td>9.589683</td></tr><tr><th class="idx">6</th><td>10.626135</td><td>8.291809</td><td>4.89402</td></tr><tr><th class="idx">7</th><td>11.307237</td><td>11.728872</td><td>8.51567</td></tr><tr><th class="idx">8</th><td>14.539509</td><td>7.091269</td><td>10.091517</td></tr><tr><th class="idx">9</th><td>9.625632</td><td>13.065558</td><td>12.938718</td></tr></tbody></table></div></div>

평균 10, 표준편차 2인 정규분포 난수에 극단값 4개를 넣었다. 박스플롯으로 보면 바로 드러난다.

```python
import matplotlib.pyplot as plt

# Boxplot을 이용해 이상치 확인
df.boxplot()
plt.title('Boxplot')
plt.show()
```

![그래프 출력](/images/ml/ml-preprocessing-1.png)

```python
# 시각화를 통해 보면 결측치 4개의 값이 보임
```

> **보충** 메모의 "결측치 4개"는 **이상치(극단값) 4개**다. a 컬럼의 100, 300과 c 컬럼의 200, -100이 박스에서 멀리 떨어진 점으로 찍혔다. 박스플롯의 수염(whisker)이 바로 IQR × 1.5 경계다.

IQR 기준으로 a 컬럼의 이상치를 찾는다.

```python
####################################################################
# # 4 분위수 기준으로 outlier를 찾기(식별)
# 1. "1분위(100분위기준 25분위), 3분위(100분위 기준 75분위)" 계산.
# 2. "IQR(Inter Quartile Range) = 3분위수 - 1분위수" 계산
# 3. "정상범위: v < 1분위값 - 1.5*iqr, v > 3분위 + 1.5*iqr" 조건으로 outlier를 찾기
####################################################################
# "a" 컬럼에서 outlier를 찾기
q1, q3 = df['a'].quantile(q=[0.25, 0.75])
iqr = q3 - q1
whis = 1.5
iqr = iqr * whis
df['a'][~df['a'].between(q1 - iqr, q3 + iqr)]  #series boolean indexing // 분위수 계산을 통한 값으로 이상치 찾기


# c컬럼에서 outlier를 찾기 (컬럼명만 변경)
```

```text
0    100.0
3    300.0
Name: a, dtype: float64
```

> **보충** 주석 3번의 "정상범위" 조건은 사실 **이상치 조건**이다. 정상 범위는 `1분위 - 1.5*iqr <= v <= 3분위 + 1.5*iqr`이고, 코드도 그 범위(`between`)를 `~`로 뒤집어 이상치를 고른다.

`between(a, b)`는 원소마다 a 이상 b 이하인지 판단한다. 앞에 `~`를 붙이면 반대가 된다.

```python
# between () => 원소별로 그 사이에 있는지 판단
~df['a'].between(10,15)
```

```text
0     True
1    False
2    False
3     True
4    False
5    False
6    False
7    False
8    False
9     True
Name: a, dtype: bool
```

다른 컬럼에도 쓸 수 있게 함수로 만든다.

```python
# 함수화 하기.
def find_outliers(df, column_name, whis=1.5):
    """
    분위수 기준으로 이상치를 찾는 함수

    Args:
        df (pd.DataFrame): 데이터프레임
        column_name (str): 이상치를 찾을 컬럼명

    Returns:
        pd.Series: 이상치 값들
    """
    q1, q3 = df[column_name].quantile(q=[0.25, 0.75]) #컬럼명 받고, 분위수로 계산
    iqr = q3 - q1
    iqr *= whis

    return df.loc[~df[column_name].between(q1 - iqr, q3 + iqr), column_name]
```

```python
find_outliers(df, 'c') #, whis =0.2)
```

```text
0    200.0
3   -100.0
Name: c, dtype: float64
```

## Feature 타입별 전처리

### Feature(변수)의 타입

```python
# 피쳐(컬럼) 타입별 전처리 방법
# 포함관계
```

- **범주형(Categorical) 변수**: 범주를 구분하는 이름을 값으로 가진다. 값 사이에 중간값이 없고(이산적), 가질 수 있는 값이 정해져 있다
  - **명목(Nominal) 변수**: 값 사이에 순서가 없다. 성별, 혈액형, 지역
  - **순위(Ordinal) 변수**: 값 사이에 순서가 있다. 성적, 직급, 만족도
- **수치형(Numeric) 변수**: 수량을 나타낸다
  - **이산형(Discrete)**: 정수로만 표현된다. 하루 방문 고객 수, 가격(원화), 물건 개수
  - **연속형(Continuous)**: 실수로 표현된다. 키, 몸무게, 시간

```python
# 범주형은 숫자로 바꿔야 함
```

```python
# 수치형은 척도를 통일시켜줘야 함
# 이산형 : 몇개, 몇명
```

범주형은 **인코딩**, 수치형은 **스케일링**이 기본 전처리다.

## 범주형 데이터 전처리

- scikit-learn 모델은 Feature와 Label이 **숫자**(정수/실수)인 것만 처리한다
- 문자열이면 숫자로 바꿔야 한다
  - **범주형 변수**는 정수값으로 변환한다
  - 범주형이 아닌 **단순 문자열**(이름, 주소 등)은 보통 제거한다

```python
# 인코딩 전 원래 값은 어딘가에 저장해두어야 함
```

```python
# 인코딩 = 다른 값(이름을 부여, 약속, 표현하는 방법)
# 레이블인코딩 => 0부터 시작하는 정수로 대체
# disition tree 알고리즘은 레이블인코딩 사용, but 다른 모델들은 원핫인코딩을 사용(성능적으로 우수)
```

### 레이블 인코딩(Label Encoding)

- 범주의 고유값들을 오름차순 정렬한 뒤 0부터 1씩 증가하는 정수로 바꾼다
- **숫자 크기 차이가 모델에 영향을 주지 않는 트리 계열 모델**(의사결정나무, 랜덤포레스트)에 쓴다
- **숫자 크기 차이가 영향을 주는 선형 계열 모델**(로지스틱 회귀, SVM, 신경망)에는 쓰면 안 된다

![레이블 인코딩: 상품 분류를 0~3 정수로 변환](/images/ml/fig-label-encoding.png)

```python
# 문제점: 인코딩 후에는 '상품분류'는  tv, computer의 차이가 생김
# 그 차이 값으로 인해 모델의 영향을 끼치기도 함
```

TV=0, 컴퓨터=3으로 바뀌면 선형 모델은 "컴퓨터가 TV보다 3만큼 크다"고 받아들인다. 원래 상품 사이에는 그런 크기 관계가 없다.

`sklearn.preprocessing.LabelEncoder`

| 메소드/속성 | 하는 일 |
|---|---|
| `fit()` | 어떻게 변환할지 학습 |
| `transform()` | 범주값을 정수로 변환 |
| `fit_transform()` | 학습과 변환을 한 번에 |
| `inverse_transform()` | 정수를 원래 값으로 복원 |
| `classes_` | 원래 값과 인코딩 값의 매핑 |

```python
import pandas as pd
# LabelEncoder는 1차원 자료구조(iterable)을 받아서 변환.
items = pd.Series(['TV', '냉장고', '컴퓨터', '컴퓨터', '냉장고', '에어컨',  'TV', '에어컨'])
items
```

```text
0     TV
1    냉장고
2    컴퓨터
3    컴퓨터
4    냉장고
5    에어컨
6     TV
7    에어컨
dtype: object
```

`fit()`에 실제 데이터에 없는 범주(공기 청정기, 정수기)까지 넣어 학습시켜 봤다.

```python
import numpy as np
from sklearn.preprocessing import LabelEncoder

# LabelEncoder의 instance 생성
le = LabelEncoder() #

# 학습: 각 고유값들을 어떤 정수로 바꿀지 계산.
le.fit(['TV', '냉장고', '컴퓨터', '에어컨', '공기 청정기', '정수기'])  # 인코딩 대상을 넣어 학습한다. #각 피쳐별로 해야함

# 변환: 학습 결과에 맞춰서 값들을 변환
result1 = le.transform(items) # 찾을 대상과 변환할 대상이 다르기 때문에 따로해야함.
print(result1)
```

```text
[0 2 5 5 2 3 0 3]
```

```python
# 어떤 값을 어떻게 바꿨는지 조회, 값: 고유값, index: encoding 한 값
print(le.classes_)
type(le.classes_)
```

```text
['TV' '공기 청정기' '냉장고' '에어컨' '정수기' '컴퓨터']
```

```text
<class 'numpy.ndarray'>
```

`classes_`의 index가 인코딩 값이다. 그래서 fancy indexing으로 원래 값을 되찾을 수 있다.

```python
le.classes_[result1] # fancy indexing
```

```text
array(['TV', '냉장고', '컴퓨터', '컴퓨터', '냉장고', '에어컨', 'TV', '에어컨'], dtype='<U6')
```

```python
le.inverse_transform(result1)
```

```text
array(['TV', '냉장고', '컴퓨터', '컴퓨터', '냉장고', '에어컨', 'TV', '에어컨'], dtype='<U6')
```

학습 대상과 변환 대상이 같으면 `fit_transform()`으로 한 번에 한다.

```python
# fit 대상과 transform 대상이 동일한 경우. -> fit_transform() 한번에 변환.
le2 = LabelEncoder()
result2 = le2.fit_transform(items) # items 를 기준으로
print(le2.classes_)
result2
```

```text
['TV' '냉장고' '에어컨' '컴퓨터']
```

```text
array([0, 1, 3, 3, 1, 2, 0, 2])
```

같은 '컴퓨터'라도 `le`에서는 5, `le2`에서는 3이다. 무엇으로 `fit`했느냐에 따라 매핑이 달라진다.

```python
### encoding 값을 원래 값으로 원복시키기(Decoding)
le2.inverse_transform([1, 1, 1, 2, 2 ])
```

```text
array(['냉장고', '냉장고', '냉장고', '에어컨', '에어컨'], dtype=object)
```

`fit`할 때 없던 값을 변환하면 어떻게 될까. 노트북에서는 주석으로만 남겨 둔 셀이다. **아래 셀은 에러가 나는 것이 정상이다.**

```python
# le2.transform(['마우스', '컴퓨터']) #fit() 할 때 없는 것을 변환하면 KeyError발생.
# fit 할때 찾은 class값만 바꿀 수 있음.
le2.transform(['마우스', '컴퓨터'])
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: y contains previously unseen labels: &#x27;마우스&#x27;</div></div>

> **보충** 주석에는 `KeyError`라고 적었는데 실제로는 `ValueError`("previously unseen labels")가 난다. 서비스 중에 학습 때 없던 범주가 들어오는 일은 흔해서, 원핫 인코딩의 `OneHotEncoder(handle_unknown="ignore")`처럼 처음 보는 값을 처리하는 옵션을 쓰기도 한다.

### 원핫 인코딩(One-Hot Encoding)

- N개의 클래스를 N차원의 One-Hot 벡터로 바꾼다
  - 고유값들을 컬럼으로 만들고, 해당하는 열은 1, 나머지는 0으로 표시한다
- **선형 계열 모델**(로지스틱 회귀, SVM, 신경망)에서는 범주형 변환에 레이블 인코딩보다 원핫 인코딩을 쓴다
- **트리 계열**은 0이 많은 feature(희소 행렬, Sparse Matrix)에서 성능이 떨어지기 때문에 레이블 인코딩을 쓴다

![원핫 인코딩: 상품 분류를 열 4개로 변환](/images/ml/fig-onehot-encoding.png)

```python
# 희소행렬 sparse matrix 대부분이 0으로 구성되어있는 행렬
# 원핫인코딩 => 정답에 해당하는 열을 1로 나머지는 0으로 표현
```

`sklearn.preprocessing.OneHotEncoder`

| 메소드 | 하는 일 |
|---|---|
| `fit(데이터셋)` | 데이터셋을 기준으로 어떻게 변환할지 학습 |
| `transform(데이터셋)` | 원핫 인코딩 처리 |
| `fit_transform(데이터셋)` | 학습과 변환을 한 번에 |
| `get_feature_names_out()` | 변환된 컬럼들의 이름 반환 |

- 데이터셋은 **2차원 배열**(DataFrame 포함)로 넘기고, feature별로 원핫 인코딩한다
- 넘긴 컬럼은 타입과 관계없이 **전부** 변환한다(연속형도). 그래서 변환할 범주형 컬럼만 골라서 넘겨야 한다

```python
# get_feature_name_out() => 원핫인코딩으로 변환된 피쳐의 이름들을 다시 반환해줌
```

```python
# 레이블인코딩은 하나씩
# 원핫인코딩은 df로 입력
```

> `sparse_output=False`를 지정하지 않으면 결과를 scipy의 `csr_matrix`(희소 행렬 객체)로 반환한다. 희소 행렬은 0이 아닌 값의 위치만 저장해 메모리를 아낀다. `.toarray()`로 ndarray로 바꿀 수 있다.

```python
import numpy as np
# 원핫 인코딩은 열 단위로 처리하므로 2차원 형태의 자료구조를 입력한다.
items=np.array([['TV'],['냉장고'],['전자렌지'],['컴퓨터'],['선풍기'],['선풍기'],['믹서'],['믹서']])
print(np.shape(items)) # items.shape
items
```

```text
(8, 1)
```

```text
array([['TV'],
       ['냉장고'],
       ['전자렌지'],
       ['컴퓨터'],
       ['선풍기'],
       ['선풍기'],
       ['믹서'],
       ['믹서']], dtype='<U4')
```

```python
from sklearn.preprocessing import OneHotEncoder
# 객체 생성
ohe = OneHotEncoder()
# 학습 - 어떻게 바꿀지 학습.
ohe.fit(items)
# 변환
result = ohe.transform(items)
# ohe.fit_transform(items)
```

```python
print(type(result))
result
```

```text
<class 'scipy.sparse._csr.csr_matrix'>
```

```text
<Compressed Sparse Row sparse matrix of dtype 'float64'
	with 8 stored elements and shape (8, 6)>
```

```python
print(result)
```

```text
<Compressed Sparse Row sparse matrix of dtype 'float64'
	with 8 stored elements and shape (8, 6)>
  Coords	Values
  (0, 0)	1.0
  (1, 1)	1.0
  (2, 4)	1.0
  (3, 5)	1.0
  (4, 3)	1.0
  (5, 3)	1.0
  (6, 2)	1.0
  (7, 2)	1.0
```

희소 행렬은 `(행, 열) 값` 형태로 1이 있는 위치만 저장한다. 8행 6열 48칸 중 8칸만 기록했다.

```python
result.toarray() # ndarray로 변환.
```

```text
array([[1., 0., 0., 0., 0., 0.],
       [0., 1., 0., 0., 0., 0.],
       [0., 0., 0., 0., 1., 0.],
       [0., 0., 0., 0., 0., 1.],
       [0., 0., 0., 1., 0., 0.],
       [0., 0., 0., 1., 0., 0.],
       [0., 0., 1., 0., 0., 0.],
       [0., 0., 1., 0., 0., 0.]])
```

```python
ohe.get_feature_names_out()
# one hot encoding된 각 열(컬럼)이 어떤 class(고유값)을 나타내는지 조회.
```

```text
array(['x0_TV', 'x0_냉장고', 'x0_믹서', 'x0_선풍기', 'x0_전자렌지', 'x0_컴퓨터'],
      dtype=object)
```

컬럼 이름이 정렬된 고유값 순서이고, 앞의 `x0`은 첫 번째 입력 컬럼이라는 뜻이다. DataFrame을 넘기면 `x0` 대신 컬럼명이 붙는다.

```python
## 학습대상과 변환대상이 같은 경우 - fit_transform()
ohe2 = OneHotEncoder(sparse_output=False)  # ndarray로 결과를 반환.
result2  = ohe2.fit_transform(items)
result2
```

```text
array([[1., 0., 0., 0., 0., 0.],
       [0., 1., 0., 0., 0., 0.],
       [0., 0., 0., 0., 1., 0.],
       [0., 0., 0., 0., 0., 1.],
       [0., 0., 0., 1., 0., 0.],
       [0., 0., 0., 1., 0., 0.],
       [0., 0., 1., 0., 0., 0.],
       [0., 0., 1., 0., 0., 0.]])
```

### Adult 데이터셋: 원핫 인코딩 적용

- 1994년 미국 인구조사 데이터베이스에서 추출한 성인 소득 데이터셋 ([UCI](https://archive.ics.uci.edu/ml/datasets/adult))
- target은 `income`. 연 수입이 \$50,000 이하인지 초과인지 두 클래스
- 범주형 feature는 **원핫 인코딩**, 출력인 `income`은 **레이블 인코딩**해서 y로 뺀다

```python
import pandas as pd
import numpy as np
```

```python
cols = ['age', 'workclass','fnlwgt','education', 'education-num', 'marital-status', 'occupation','relationship', 'race', 'gender','capital-gain','capital-loss', 'hours-per-week','native-country', 'income']
category_columns = ['workclass','education','marital-status', 'occupation','relationship','race','gender','native-country']
number_columns = ['age','fnlwgt', 'education-num','capital-gain','capital-loss','hours-per-week']
target = "income"
```

#### 데이터 로딩

```python
import pandas as pd

data = pd.read_csv(
    'data/adult.data',
    header=None,      # 첫번째 라인부터 데이터일 경우. (컬럼명이 없을 경우)
    names=cols,       # header(컬럼명) 지정
    na_values='?',    # 결측치로 읽을 값 설정. '?'를 결측치로 읽어야 함
    skipinitialspace=True # 값 앞의 공백을 제거하고 읽는다. , abc -> ' abc', 'abc'
)
data.shape
```

```text
(32561, 15)
```

```python
data.info()
```

```text
<class 'pandas.core.frame.DataFrame'>
RangeIndex: 32561 entries, 0 to 32560
Data columns (total 15 columns):
 #   Column          Non-Null Count  Dtype 
---  ------          --------------  ----- 
 0   age             32561 non-null  int64 
 1   workclass       30725 non-null  object
 2   fnlwgt          32561 non-null  int64 
 3   education       32561 non-null  object
 4   education-num   32561 non-null  int64 
 5   marital-status  32561 non-null  object
 6   occupation      30718 non-null  object
 7   relationship    32561 non-null  object
 8   race            32561 non-null  object
 9   gender          32561 non-null  object
 10  capital-gain    32561 non-null  int64 
 11  capital-loss    32561 non-null  int64 
 12  hours-per-week  32561 non-null  int64 
 13  native-country  31978 non-null  object
 14  income          32561 non-null  object
dtypes: int64(6), object(9)
memory usage: 3.7+ MB
```

```python
# 문자형 컬럼들이 대부분 범주형
# int는 수치형 데이터
```

```python
data.isnull().sum()
```

```text
age                  0
workclass         1836
fnlwgt               0
education            0
education-num        0
marital-status       0
occupation        1843
relationship         0
race                 0
gender               0
capital-gain         0
capital-loss         0
hours-per-week       0
native-country     583
income               0
dtype: int64
```

결측치가 있는 세 컬럼은 모두 범주형이다. 값 분포를 본다.

```python
### 결측치 있는 범주형 값들 조회
data['workclass'].value_counts()
```

```text
workclass
Private             22696
Self-emp-not-inc     2541
Local-gov            2093
State-gov            1298
Self-emp-inc         1116
Federal-gov           960
Without-pay            14
Never-worked            7
Name: count, dtype: int64
```

```python
data['occupation'].value_counts()
```

```text
occupation
Prof-specialty       4140
Craft-repair         4099
Exec-managerial      4066
Adm-clerical         3770
Sales                3650
Other-service        3295
Machine-op-inspct    2002
Transport-moving     1597
Handlers-cleaners    1370
Farming-fishing       994
Tech-support          928
Protective-serv       649
Priv-house-serv       149
Armed-Forces            9
Name: count, dtype: int64
```

```python
data['native-country'].value_counts()
```

```text
native-country
United-States                 29170
Mexico                          643
Philippines                     198
Germany                         137
Canada                          121
                              ...  
Outlying-US(Guam-USVI-etc)       14
Honduras                         13
Hungary                          13
Scotland                         12
Holand-Netherlands                1
Name: count, Length: 41, dtype: int64
```

#### 결측치 처리

범주형이니 최빈값으로 채운다.

```python
data.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 15열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>age</th><th>workclass</th><th>fnlwgt</th><th>education</th><th>education-num</th><th>marital-status</th><th>occupation</th><th>relationship</th><th>race</th><th>gender</th><th>capital-gain</th><th>capital-loss</th><th>hours-per-week</th><th>native-country</th><th>income</th></tr></thead><tbody><tr><th class="idx">0</th><td>39</td><td>State-gov</td><td>77516</td><td>Bachelors</td><td>13</td><td>Never-married</td><td>Adm-clerical</td><td>Not-in-family</td><td>White</td><td>Male</td><td>2174</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">1</th><td>50</td><td>Self-emp-not-inc</td><td>83311</td><td>Bachelors</td><td>13</td><td>Married-civ-spouse</td><td>Exec-managerial</td><td>Husband</td><td>White</td><td>Male</td><td>0</td><td>0</td><td>13</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">2</th><td>38</td><td>Private</td><td>215646</td><td>HS-grad</td><td>9</td><td>Divorced</td><td>Handlers-cleaners</td><td>Not-in-family</td><td>White</td><td>Male</td><td>0</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">3</th><td>53</td><td>Private</td><td>234721</td><td>11th</td><td>7</td><td>Married-civ-spouse</td><td>Handlers-cleaners</td><td>Husband</td><td>Black</td><td>Male</td><td>0</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">4</th><td>28</td><td>Private</td><td>338409</td><td>Bachelors</td><td>13</td><td>Married-civ-spouse</td><td>Prof-specialty</td><td>Wife</td><td>Black</td><td>Female</td><td>0</td><td>0</td><td>40</td><td>Cuba</td><td>&lt;=50K</td></tr></tbody></table></div></div>

```python
# 결측치를 최빈값으로 대체
from sklearn.impute import SimpleImputer

df = data.copy() # 데이터 복사

imputer = SimpleImputer(strategy="most_frequent") #최빈값으로 설정
df[['workclass', 'occupation','native-country']] = imputer.fit_transform(df[['workclass', 'occupation','native-country']])

df.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 15열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>age</th><th>workclass</th><th>fnlwgt</th><th>education</th><th>education-num</th><th>marital-status</th><th>occupation</th><th>relationship</th><th>race</th><th>gender</th><th>capital-gain</th><th>capital-loss</th><th>hours-per-week</th><th>native-country</th><th>income</th></tr></thead><tbody><tr><th class="idx">0</th><td>39</td><td>State-gov</td><td>77516</td><td>Bachelors</td><td>13</td><td>Never-married</td><td>Adm-clerical</td><td>Not-in-family</td><td>White</td><td>Male</td><td>2174</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">1</th><td>50</td><td>Self-emp-not-inc</td><td>83311</td><td>Bachelors</td><td>13</td><td>Married-civ-spouse</td><td>Exec-managerial</td><td>Husband</td><td>White</td><td>Male</td><td>0</td><td>0</td><td>13</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">2</th><td>38</td><td>Private</td><td>215646</td><td>HS-grad</td><td>9</td><td>Divorced</td><td>Handlers-cleaners</td><td>Not-in-family</td><td>White</td><td>Male</td><td>0</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">3</th><td>53</td><td>Private</td><td>234721</td><td>11th</td><td>7</td><td>Married-civ-spouse</td><td>Handlers-cleaners</td><td>Husband</td><td>Black</td><td>Male</td><td>0</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">4</th><td>28</td><td>Private</td><td>338409</td><td>Bachelors</td><td>13</td><td>Married-civ-spouse</td><td>Prof-specialty</td><td>Wife</td><td>Black</td><td>Female</td><td>0</td><td>0</td><td>40</td><td>Cuba</td><td>&lt;=50K</td></tr></tbody></table></div></div>

```python
df.isnull().sum()
```

```text
age               0
workclass         0
fnlwgt            0
education         0
education-num     0
marital-status    0
occupation        0
relationship      0
race              0
gender            0
capital-gain      0
capital-loss      0
hours-per-week    0
native-country    0
income            0
dtype: int64
```

#### 인코딩 처리

- Target(`income`): Label Encoding
- Feature 중 범주형: OneHot Encoding

```python
df['income'].value_counts()
```

```text
income
<=50K    24720
>50K      7841
Name: count, dtype: int64
```

```python
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 32561행 × 15열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>age</th><th>workclass</th><th>fnlwgt</th><th>education</th><th>education-num</th><th>marital-status</th><th>occupation</th><th>relationship</th><th>race</th><th>gender</th><th>capital-gain</th><th>capital-loss</th><th>hours-per-week</th><th>native-country</th><th>income</th></tr></thead><tbody><tr><th class="idx">0</th><td>39</td><td>State-gov</td><td>77516</td><td>Bachelors</td><td>13</td><td>Never-married</td><td>Adm-clerical</td><td>Not-in-family</td><td>White</td><td>Male</td><td>2174</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">1</th><td>50</td><td>Self-emp-not-inc</td><td>83311</td><td>Bachelors</td><td>13</td><td>Married-civ-spouse</td><td>Exec-managerial</td><td>Husband</td><td>White</td><td>Male</td><td>0</td><td>0</td><td>13</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">2</th><td>38</td><td>Private</td><td>215646</td><td>HS-grad</td><td>9</td><td>Divorced</td><td>Handlers-cleaners</td><td>Not-in-family</td><td>White</td><td>Male</td><td>0</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">3</th><td>53</td><td>Private</td><td>234721</td><td>11th</td><td>7</td><td>Married-civ-spouse</td><td>Handlers-cleaners</td><td>Husband</td><td>Black</td><td>Male</td><td>0</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">4</th><td>28</td><td>Private</td><td>338409</td><td>Bachelors</td><td>13</td><td>Married-civ-spouse</td><td>Prof-specialty</td><td>Wife</td><td>Black</td><td>Female</td><td>0</td><td>0</td><td>40</td><td>Cuba</td><td>&lt;=50K</td></tr><tr><td class="ellipsis" colspan="16">⋯</td></tr><tr><th class="idx">32556</th><td>27</td><td>Private</td><td>257302</td><td>Assoc-acdm</td><td>12</td><td>Married-civ-spouse</td><td>Tech-support</td><td>Wife</td><td>White</td><td>Female</td><td>0</td><td>0</td><td>38</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">32557</th><td>40</td><td>Private</td><td>154374</td><td>HS-grad</td><td>9</td><td>Married-civ-spouse</td><td>Machine-op-inspct</td><td>Husband</td><td>White</td><td>Male</td><td>0</td><td>0</td><td>40</td><td>United-States</td><td>&gt;50K</td></tr><tr><th class="idx">32558</th><td>58</td><td>Private</td><td>151910</td><td>HS-grad</td><td>9</td><td>Widowed</td><td>Adm-clerical</td><td>Unmarried</td><td>White</td><td>Female</td><td>0</td><td>0</td><td>40</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">32559</th><td>22</td><td>Private</td><td>201490</td><td>HS-grad</td><td>9</td><td>Never-married</td><td>Adm-clerical</td><td>Own-child</td><td>White</td><td>Male</td><td>0</td><td>0</td><td>20</td><td>United-States</td><td>&lt;=50K</td></tr><tr><th class="idx">32560</th><td>52</td><td>Self-emp-inc</td><td>287927</td><td>HS-grad</td><td>9</td><td>Married-civ-spouse</td><td>Exec-managerial</td><td>Wife</td><td>White</td><td>Female</td><td>15024</td><td>0</td><td>40</td><td>United-States</td><td>&gt;50K</td></tr></tbody></table></div></div>

범주형 feature 8개를 원핫 인코딩한다.

```python
# 범주형 feature 원핫인코딩
df[category_columns]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 32561행 × 8열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>workclass</th><th>education</th><th>marital-status</th><th>occupation</th><th>relationship</th><th>race</th><th>gender</th><th>native-country</th></tr></thead><tbody><tr><th class="idx">0</th><td>State-gov</td><td>Bachelors</td><td>Never-married</td><td>Adm-clerical</td><td>Not-in-family</td><td>White</td><td>Male</td><td>United-States</td></tr><tr><th class="idx">1</th><td>Self-emp-not-inc</td><td>Bachelors</td><td>Married-civ-spouse</td><td>Exec-managerial</td><td>Husband</td><td>White</td><td>Male</td><td>United-States</td></tr><tr><th class="idx">2</th><td>Private</td><td>HS-grad</td><td>Divorced</td><td>Handlers-cleaners</td><td>Not-in-family</td><td>White</td><td>Male</td><td>United-States</td></tr><tr><th class="idx">3</th><td>Private</td><td>11th</td><td>Married-civ-spouse</td><td>Handlers-cleaners</td><td>Husband</td><td>Black</td><td>Male</td><td>United-States</td></tr><tr><th class="idx">4</th><td>Private</td><td>Bachelors</td><td>Married-civ-spouse</td><td>Prof-specialty</td><td>Wife</td><td>Black</td><td>Female</td><td>Cuba</td></tr><tr><td class="ellipsis" colspan="9">⋯</td></tr><tr><th class="idx">32556</th><td>Private</td><td>Assoc-acdm</td><td>Married-civ-spouse</td><td>Tech-support</td><td>Wife</td><td>White</td><td>Female</td><td>United-States</td></tr><tr><th class="idx">32557</th><td>Private</td><td>HS-grad</td><td>Married-civ-spouse</td><td>Machine-op-inspct</td><td>Husband</td><td>White</td><td>Male</td><td>United-States</td></tr><tr><th class="idx">32558</th><td>Private</td><td>HS-grad</td><td>Widowed</td><td>Adm-clerical</td><td>Unmarried</td><td>White</td><td>Female</td><td>United-States</td></tr><tr><th class="idx">32559</th><td>Private</td><td>HS-grad</td><td>Never-married</td><td>Adm-clerical</td><td>Own-child</td><td>White</td><td>Male</td><td>United-States</td></tr><tr><th class="idx">32560</th><td>Self-emp-inc</td><td>HS-grad</td><td>Married-civ-spouse</td><td>Exec-managerial</td><td>Wife</td><td>White</td><td>Female</td><td>United-States</td></tr></tbody></table></div></div>

```python
from sklearn.preprocessing import OneHotEncoder

ohe = OneHotEncoder()

cate_features = ohe.fit_transform(df[category_columns])
```

```python
# cate_features에 수치형 컬럼(feature)의 값을 붙인다.
df.shape
```

```text
(32561, 15)
```

인코딩한 범주형 컬럼 뒤에 수치형 컬럼 6개를 붙여 X를 만든다.

```python
ohe.get_feature_names_out()
# (32561, 99) (32561, 6)
# df[number_columns].values
X = np.concatenate([cate_features.toarray(), df[number_columns].values], axis=1)
X.shape

pd.DataFrame(X)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 32561행 × 105열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th><th>12</th><th>13</th><th>14</th><th>15</th><th>16</th><th>17</th><th>18</th><th>19</th><th>20</th><th>21</th><th>22</th><th>23</th><th>24</th><th>25</th><th>26</th><th>27</th><th>28</th><th>29</th><th>30</th><th>31</th><th>32</th><th>33</th><th>34</th><th>35</th><th>36</th><th>37</th><th>38</th><th>39</th><th>40</th><th>41</th><th>42</th><th>43</th><th>44</th><th>45</th><th>46</th><th>47</th><th>48</th><th>49</th><th>50</th><th>51</th><th>52</th><th>53</th><th>54</th><th>55</th><th>56</th><th>57</th><th>58</th><th>59</th><th>60</th><th>61</th><th>62</th><th>63</th><th>64</th><th>65</th><th>66</th><th>67</th><th>68</th><th>69</th><th>70</th><th>71</th><th>72</th><th>73</th><th>74</th><th>75</th><th>76</th><th>77</th><th>78</th><th>79</th><th>80</th><th>81</th><th>82</th><th>83</th><th>84</th><th>85</th><th>86</th><th>87</th><th>88</th><th>89</th><th>90</th><th>91</th><th>92</th><th>93</th><th>94</th><th>95</th><th>96</th><th>97</th><th>98</th><th>99</th><th>100</th><th>101</th><th>102</th><th>103</th><th>104</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>39.0</td><td>77516.0</td><td>13.0</td><td>2174.0</td><td>0.0</td><td>40.0</td></tr><tr><th class="idx">1</th><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>50.0</td><td>83311.0</td><td>13.0</td><td>0.0</td><td>0.0</td><td>13.0</td></tr><tr><th class="idx">2</th><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>38.0</td><td>215646.0</td><td>9.0</td><td>0.0</td><td>0.0</td><td>40.0</td></tr><tr><th class="idx">3</th><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>53.0</td><td>234721.0</td><td>7.0</td><td>0.0</td><td>0.0</td><td>40.0</td></tr><tr><th class="idx">4</th><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>28.0</td><td>338409.0</td><td>13.0</td><td>0.0</td><td>0.0</td><td>40.0</td></tr><tr><td class="ellipsis" colspan="106">⋯</td></tr><tr><th class="idx">32556</th><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>27.0</td><td>257302.0</td><td>12.0</td><td>0.0</td><td>0.0</td><td>38.0</td></tr><tr><th class="idx">32557</th><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>40.0</td><td>154374.0</td><td>9.0</td><td>0.0</td><td>0.0</td><td>40.0</td></tr><tr><th class="idx">32558</th><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>58.0</td><td>151910.0</td><td>9.0</td><td>0.0</td><td>0.0</td><td>40.0</td></tr><tr><th class="idx">32559</th><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>22.0</td><td>201490.0</td><td>9.0</td><td>0.0</td><td>0.0</td><td>20.0</td></tr><tr><th class="idx">32560</th><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>52.0</td><td>287927.0</td><td>9.0</td><td>15024.0</td><td>0.0</td><td>40.0</td></tr></tbody></table></div></div>

범주형 8개 컬럼이 99개로 늘어나고, 수치형 6개를 더해 feature가 105개가 됐다.

노트북에서는 이 다음 셀에서 `y`를 찾지 못해 `NameError`가 났다. 위 설명대로 `income`을 레이블 인코딩해 `y`로 만드는 셀이 빠져 있었다. 그 뒤 셀에서 `y[0]`이 `0`으로 나오는 걸 보면 따로 만들어 실행한 것으로 보여, 그 과정을 채워 넣었다.

```python
# 보충: target(income) 레이블 인코딩 → y
from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
y = le.fit_transform(df[target])
print(le.classes_)
X.shape, y.shape
```

```text
['<=50K' '>50K']
```

```text
((32561, 105), (32561,))
```

```python
y[0], X[0]
```

```text
(np.int64(0), array([0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 1.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 1.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 1.0000e+00, 0.0000e+00,
       0.0000e+00, 1.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 1.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       1.0000e+00, 0.0000e+00, 1.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00, 0.0000e+00,
       0.0000e+00, 1.0000e+00, 0.0000e+00, 0.0000e+00, 3.9000e+01,
       7.7516e+04, 1.3000e+01, 2.1740e+03, 0.0000e+00, 4.0000e+01]))
```

#### 모델링: train / validation / test 분리

```python
# fit (X_train)으로 학습시킨 데이터를 가지고 전처리
# holdup 방법으로 분리

from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size = 0.2,
    stratify=y,
    random_state=0
)

X_train, X_val, y_train, y_val = train_test_split(
    X_train,
    y_train,
    test_size = 0.25,
    stratify=y_train,
    random_state=0
)
```

> **보충** 주석의 "holdup"은 **Hold-out**이다. 두 번째 분할에서 `test_size=0.25`를 준 건 남은 80%의 25%, 즉 전체의 20%를 validation으로 쓰기 위해서다. 결과적으로 6:2:2로 나뉜다.

#### 모델 생성 → 학습 → 검증

`max_depth`를 3부터 15까지 바꿔 가며 train과 validation 정확도를 비교한다.

```python
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

max_depth_list = [3,4,5,6,7,8,9,10,11,12,13,14,15]

result_train = [] #train set 정확도 검증값들을 저장할 빈 리스트
result_val = [] #validation set 정확도 검증값들을 저장할 빈 리스트

for max_depth in max_depth_list:
    #모델생성
    model = DecisionTreeClassifier(max_depth=max_depth,random_state=0)
    #학습(fit)
    model.fit(X_train, y_train)
    #검증
    pred_train = model.predict(X_train)
    pred_val = model.predict(X_val)
    result_train.append(accuracy_score(y_train, pred_train))
    result_val.append(accuracy_score(y_val, pred_val))


result_train,
print(result_val)
```

```text
[0.8416769041769042, 0.8421375921375921, 0.8482800982800983, 0.851044226044226, 0.8518120393120393, 0.8541154791154791, 0.8542690417690417, 0.8541154791154791, 0.8504299754299754, 0.8468980343980343, 0.8430589680589681, 0.8419840294840295, 0.8386056511056511]
```

```python
import pandas as pd


result_df = pd.DataFrame(
    {"train_acc":result_train, "val_acc": result_val}
    , index=max_depth_list
)
result_df.rename_axis("max_depth", inplace=True)
result_df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 13행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>max_depth</th><th>train_acc</th><th>val_acc</th></tr></thead><tbody><tr><th class="idx">3</th><td>0.846284</td><td>0.841677</td></tr><tr><th class="idx">4</th><td>0.847052</td><td>0.842138</td></tr><tr><th class="idx">5</th><td>0.8556</td><td>0.84828</td></tr><tr><th class="idx">6</th><td>0.859388</td><td>0.851044</td></tr><tr><th class="idx">7</th><td>0.862664</td><td>0.851812</td></tr><tr><th class="idx">8</th><td>0.866503</td><td>0.854115</td></tr><tr><th class="idx">9</th><td>0.8707</td><td>0.854269</td></tr><tr><th class="idx">10</th><td>0.875512</td><td>0.854115</td></tr><tr><th class="idx">11</th><td>0.880989</td><td>0.85043</td></tr><tr><th class="idx">12</th><td>0.886671</td><td>0.846898</td></tr><tr><th class="idx">13</th><td>0.895936</td><td>0.843059</td></tr><tr><th class="idx">14</th><td>0.903051</td><td>0.841984</td></tr><tr><th class="idx">15</th><td>0.91078</td><td>0.838606</td></tr></tbody></table></div></div>

```python
result_df.plot(figsize=(5,3))
plt.show()
```

![그래프 출력](/images/ml/ml-preprocessing-2.png)

깊이가 깊어질수록 train 정확도는 계속 오르지만, validation 정확도는 9 근처에서 정점을 찍고 내려간다. 그 뒤로는 train에만 맞춰지는 과적합 구간이다.

#### 최종 평가

```python
# Val_acc가 가장 좋은 점을 찾아야 함
# 트레이닝셋과 벨류데이션 셋의 차이가 크면 안됌
# max_depth = '9'fh wogkrtmq
best_model = DecisionTreeClassifier(max_depth=9, random_state=0)
best_model.fit(X_train, y_train)

pred_test = best_model.predict(X_test)
result_test = accuracy_score(y_test, pred_test)

print("테스트셋 최종 평가 결과 정확도:" , result_test)
```

```text
테스트셋 최종 평가 결과 정확도: 0.8529095654844158
```

> **보충** 세 번째 줄 주석의 `'9'fh wogkrtmq`는 한/영 전환을 깜빡하고 친 "9로 재학습"이다.

#### 서비스: 새 데이터 예측

서비스에서는 원본 형태의 14개 feature를 입력받아 **학습 때와 똑같은 전처리**를 거친 뒤 모델에 넣는다. 원본 데이터 4행을 새 입력이라고 가정했다.

```python
#####서비스
# 14개의 feature를 입력받는다. -> 동일한 전처리 -> 모델에 입력
df.columns
new_input = df.iloc[3:7, 0:-1]
new_input.shape
```

```text
(4, 14)
```

```python
new_input.isnull().sum()
# 만약 결측치가 있다면 처리해야 함 => 트레닝셋에서 바꿔준 값으로 똑같이 바꿔야 함
# new_input = SimpleImputer.transform(new_input['workclass', 'occupatation', 'native-country']) //위에서 한 것과 동일하게 하면 됌
```

```text
age               0
workclass         0
fnlwgt            0
education         0
education-num     0
marital-status    0
occupation        0
relationship      0
race              0
gender            0
capital-gain      0
capital-loss      0
hours-per-week    0
native-country    0
dtype: int64
```

> **보충** 주석의 코드를 실제로 쓰려면 클래스(`SimpleImputer`)가 아니라 학습 때 `fit`한 **객체**(`imputer`)의 `transform`을 써야 하고, 컬럼 목록은 대괄호를 두 번 써서 `new_input[['workclass', 'occupation', 'native-country']]`로 넘긴다. 새로 `fit`하면 새 데이터의 최빈값으로 채워져 학습 때와 달라진다.

```python
# 범주형 컬럼 ohe - 전처리에서 학습한 OneHotEncoder 객체를 동일하게 이용해야 함
new_input_cate_ohe = ohe.transform(new_input[category_columns])
new_input_cate_ohe.shape
```

```text
(4, 99)
```

```python
new_input_data = np.concatenate(
    [new_input_cate_ohe.toarray(), new_input[number_columns].values],
    axis=1
)

# 확인
print(new_input_data.shape)
```

```text
(4, 105)
```

```python
final_input = np.concatenate(
    [new_input_cate_ohe.toarray(), new_input[number_columns].values],
    axis=1
)

# 2. 예측 (변수명 'final_input'을 그대로 전달)
pred = best_model.predict(final_input)

# 3. 결과 확인
print(f"예측 결과: {pred}")
```

```text
예측 결과: [0 0 1 0]
```

학습 때 `fit`한 `ohe`로 `transform`만 했기 때문에 새 데이터 4행도 똑같이 105개 컬럼이 됐다. 예측값 0, 1은 `le.classes_` 순서대로 `<=50K`, `>50K`다.

## 수치형 데이터 전처리: Feature Scaling

연속형 데이터는 정해진 범위 안의 모든 실수가 값이 될 수 있다.

- 각 feature의 값 범위(척도, Scale)가 다를 때 이를 일정한 범위로 맞추는 작업
- 트리 계열을 제외한 대부분의 알고리즘이 feature 간 척도 차이에 영향을 받는다. 선형 모델, SVM, 신경망
- **Scaling은 train set으로 fitting한다. test set이나 예측할 새 데이터는 train set으로 fitting한 scaler로 변환만 한다**

```python
# KNN -> 거리를 가지로 계산을 함
# 어떤 알고리즘이든 feature 스케일링을 해야 함
# ex) km/m/cm/kg/age 등 단위를 맞춰줘야 함
```

> **보충** "어떤 알고리즘이든"은 조금 넓다. 트리 계열은 "값이 기준보다 큰가"만 보기 때문에 스케일링해도 결과가 거의 같다. KNN처럼 **거리**를 계산하거나, 선형 모델·SVM·신경망처럼 feature에 가중치를 곱하는 모델에서 효과가 크다. 몸무게(kg, 50~100)와 연봉(원, 수천만)을 그대로 쓰면 거리 계산이 연봉에 끌려간다.

종류는 두 가지를 배운다.

- **표준화**(Standardization): `StandardScaler`
- **Min-Max Scaling**: `MinMaxScaler`

| 메소드 | 하는 일 |
|---|---|
| `fit()` | 어떻게 변환할지 학습. 2차원 배열의 0축(DataFrame이면 컬럼) 기준 |
| `transform()` | 변환 |
| `fit_transform()` | 학습과 변환을 한 번에 |
| `inverse_transform()` | 변환된 값을 원래 값으로 복원 |

### StandardScaler (표준화)

feature 값들이 **평균 0, 표준편차 1**이 되도록 변환한다. 0을 중심으로 모인다.

$$
x_{new} = \frac{x_i - \mu}{\sigma} \quad (\mu: \text{평균},\ \sigma: \text{표준편차})
$$

```python
import numpy as np
data = np.array([[10], [2], [30]])  # ndarray 생성.
print(data.shape)
data
```

```text
(3, 1)
```

```text
array([[10],
       [ 2],
       [30]])
```

공식대로 직접 계산해 본다.

```python
# 평균, 표준편차 계산
m = data.mean() # 평균
s = data.std()  # 표준편차
print(m, s, sep=" --- ")
```

```text
14.0 --- 11.775681155103795
```

```python
# Standard Scaling
result = (data - m)/s
result
```

```text
array([[-0.33968311],
       [-1.01904933],
       [ 1.35873244]])
```

```python
print(result.mean(), result.std())
```

```text
0.0 1.0
```

`StandardScaler`로 하면 같은 결과가 나온다.

```python
from sklearn.preprocessing import StandardScaler
# 객체 생성
s_scaler = StandardScaler()
# 어떻게 변환할지 학습
s_scaler.fit(data) # 입력 데이터는 2차원, 0번 축 기준(컬럼) 단위로 계산해야 한다.
# 변환
result2 = s_scaler.transform(data)
# result3 = s_scaler.fit_transform(data) # 학습/변환 대상이 같은 경우.
result2
```

```text
array([[-0.33968311],
       [-1.01904933],
       [ 1.35873244]])
```

### MinMaxScaler

모든 값을 **0(최솟값)과 1(최댓값) 사이**로 변환한다.

$$
x_{new} = \frac{x_i - \min(X)}{\max(X) - \min(X)}
$$

```python
# 왜 MINMAXSCALER를 사용하는지, 각 값이 어떤 값으로 이뤄지는지 이해 필요
```

```python
data = np.array([[10], [2], [30]])
data
```

```text
array([[10],
       [ 2],
       [30]])
```

```python
minimum = data.min() #axis=0) # 원칙적으로는 0번 축 기준으로 계산을 해야 함
maximum = data.max()
print(minimum, maximum)
```

```text
2 30
```

```python
# 변환
result = (data - minimum) / (maximum - minimum)
result

# 최소값은 0이 되고, 최대값은 1이 됌
# 중간 값인 10은 그 사이의 비율로 변환 됌
# -> MINMAXSCALER()로 해결
# FIT => 최소/최대값을 찾음
# TRANSFORM=>각 최소/최대값을 0,1롤 나머지를 비율로 바꿈
# 그렇게 되면, 각 피쳐는 0~1사이의 값으로 차이가 줄어듬 => 성능이 향상 됌
```

```text
array([[0.28571429],
       [0.        ],
       [1.        ]])
```

```python
from sklearn.preprocessing import MinMaxScaler

# 객체 생성
mm_scaler = MinMaxScaler()
# 학습
mm_scaler.fit(data)
# 변환
result2 = mm_scaler.transform(data)
# result3 = mm_scaler.fit_transform(data)  # 학습/변환 대상이 같은 경우.
result2
```

```text
array([[0.28571429],
       [0.        ],
       [1.        ]])
```

`inverse_transform()`으로 원래 값을 되돌린다.

```python
mm_scaler.inverse_transform(result2)
```

```text
array([[10.],
       [ 2.],
       [30.]])
```

### 위스콘신 유방암 데이터셋으로 Scaling

- 위스콘신 대학교에서 제공한 유방암 진단 결과 데이터 ([UCI](https://archive.ics.uci.edu/dataset/15/breast+cancer+wisconsin+original))
- Feature: 종양 측정값 30개. 모두 **연속형**이다
- target: 악성(malignant), 양성(benign)
- scikit-learn toy dataset으로 제공된다: `load_breast_cancer()`

```python
# 피쳐들이 전부다 수치형 컬럼
```

```python
from sklearn.datasets import load_breast_cancer # 연습용 더미 데이터를 불러옴

data = load_breast_cancer() # TYPE(DIC)
feature = data['data']   # 속성 - 종양 검사 기록
target = data['target']   # 타겟 - 악성/양성 종양 여부.

feature.shape, target.shape
```

```text
((569, 30), (569,))
```

```python
data['feature_names']
data['target_names']
```

```text
array(['malignant', 'benign'], dtype='<U9')
```

컬럼마다 값의 범위가 얼마나 다른지 평균으로 확인한다.

```python
# 보충: 컬럼별 평균 — 척도 차이 확인
np.set_printoptions(precision=3, suppress=True)
print(feature.mean(axis=0)[:10])
```

```text
[ 14.127  19.29   91.969 654.889   0.096   0.104   0.089   0.049   0.181
   0.063]
```

0.1 안팎인 컬럼부터 600이 넘는 컬럼까지 척도가 제각각이다. 표준화하면 모든 컬럼이 평균 0, 표준편차 1이 된다.

```python
##### Standard Scaling Dataset

from sklearn.preprocessing import StandardScaler



# 객체 생성
s_scal = StandardScaler()

# 어떻게 변환할지 학습
ss_feature = s_scal.fit_transform(feature) # 입력 데이터는 2차원, 0번 축 기준(컬럼) 단위로 계산해야 한다.

ss_feature.mean(axis=0)
ss_feature.std(axis=0)
```

```text
array([1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1.,
       1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1.])
```

```python
## Min Max Scaling

from sklearn.preprocessing import MinMaxScaler

# 1. 객체 생성 (이름: m_scal)
m_scal = MinMaxScaler()

# 2. 학습 및 변환 (생성한 객체 이름 사용)
# 변수명에 점(.)을 찍으면 속성으로 인식되니, 보통 언더바(_)를 사용합니다.
mm_feature = m_scal.fit_transform(feature)
```

> **보충** 위 두 셀은 전체 데이터로 `fit`해서 스케일링이 어떻게 되는지만 확인한 것이다. 실제 모델링에서는 아래처럼 **나눈 뒤 train으로만** `fit`해야 한다.

### 스케일링과 모델 학습

스케일링 전후로 SVM 모델 성능을 비교한다.

```python
# 모델 학습
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score
```

```python
X, y = load_breast_cancer(return_X_y=True) #Dataset 로딩 (true값을 주면 X, y값만 줌)
print(X.shape, y.shape)
print(np.unique(y, return_counts=True))
```

```text
(569, 30) (569,)
(array([0, 1]), array([212, 357]))
```

```python
# MM => min, max 값을 각 피쳐별로 구해야 함(fit-과정) - x_train을 기준
# 데이터셋을 나누고, feature scaling을 함
```

```python
#train/test set을 분리
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=0)
X_train.shape, X_test.shape
```

```text
((455, 30), (114, 30))
```

train으로 `fit_transform`, test는 `transform`만 한다.

```python
# feature scaling
# trainset을 기준으로 학습(fit)
# 그것을 바탕으로 train, test, validation set을 반환한다.


from sklearn.preprocessing import StandardScaler, MinMaxScaler

s_scaler = StandardScaler()
X_train_scaled1 = s_scaler.fit_transform(X_train)
X_test_scaled1 = s_scaler.transform(X_test) # 만약 validation set이 있다면 같이 함(예제라 없음)

m_scaler = MinMaxScaler()
X_train_scaled2 = m_scaler.fit_transform(X_train)
X_test_scaled2 = m_scaler.transform(X_test)
```

```python
X_train_scaled1.mean(axis=0) #다 0임
X_train_scaled1.std(axis=0) #다 1임

X_test_scaled1.mean(axis=0) # 다양한 값
X_test_scaled1.std(axis=0) # train_set을 가준으로 평균, 표준편차를 구하고 train_test를 확인했기 때문에 다른 0, 1과는 다른 값, 오차가 발생함
```

```text
array([0.889, 0.932, 0.893, 0.835, 1.061, 1.068, 1.167, 0.986, 1.058,
       1.054, 0.852, 0.875, 0.787, 0.731, 0.86 , 1.202, 1.663, 1.1  ,
       0.951, 1.658, 0.912, 0.936, 0.907, 0.858, 1.019, 1.055, 1.118,
       0.931, 1.096, 1.091])
```

test set은 train의 평균·표준편차로 변환했기 때문에 정확히 0, 1이 나오지 않는다. 이게 정상이다.

```python
X_train_scaled2.max(axis=0)
X_train_scaled2.min(axis=0)

X_test_scaled2.max(axis=0)
X_test_scaled2.min(axis=0) # train_set을 가준으로 최솟값, 최대값을 구하고 train_test를 확인했기 때문에 다른 값, 오차가 발생함

# 원칙적으로 train_set을 기준으로 fit해야함 => 다른 셋을 활용하면 데이터 누수현상이 발생하기 떄문
# 데이터 누수현상(Data Leakage): 학습시점에 알 수 없는 데이터(정보)를 활용해서 모델을 학습하여 모델의 성능이 떨어지는 현상
# Train set 검증에는 좋은 성능을 보여주지만 validation, test set에는 성능이 낮음
# 모델에 대한 정확한 평가/검증을 못하는 효과발생
# 즉 학습단계에서는 train set으로 전처리를 하고/ 학습을 시킴 그 후 모델의 평가를 위해 vaildation, test셋으로 검증
# train set (fit_transform) => vaildation, test set (transform) # 전처리는 train set을 기준
# 데이터셋 3개를 나눈 후 전처리해야 함
```

```text
array([-0.035,  0.083, -0.029, -0.012,  0.15 ,  0.022,  0.   ,  0.   ,
        0.054,  0.006,  0.014,  0.008,  0.011,  0.006,  0.053,  0.018,
        0.   ,  0.   ,  0.037,  0.003, -0.027,  0.075, -0.021, -0.01 ,
        0.09 ,  0.018,  0.   ,  0.   ,  0.048,  0.001])
```

MinMax도 test set에는 0보다 작은 값이 나온다. train의 최솟값보다 작은 값이 test에 있었다는 뜻이다.

> **보충** 데이터 누수의 결과는 메모와 반대 방향이다. 학습 시점에 알 수 없는 정보(test set의 평균, 최댓값 등)가 학습에 섞이면 **validation·test 점수가 실제보다 좋게** 나온다. 문제는 그 점수를 믿고 배포하면 진짜 새 데이터에서 성능이 떨어진다는 것이다. "train에서는 좋고 validation·test에서 낮다"는 건 과적합의 모습이다. 메모 끝의 결론, **나눈 뒤 train 기준으로 전처리한다**는 그대로 맞다.

이제 SVM으로 비교한다.

```python
##############################################################################################################
#
# 사이킷런(scikit-learn) 라이브러리에서 SVC는 Support Vector Classification의 약자입니다.
# 이는 머신러닝 모델 중 하나인 서포트 벡터 머신(SVM, Support Vector Machine)을 분류(Classification) 문제에 활용할 수 있도록 구현한 클래스입
# C=규제(Regularization) 매개변수입니다. 값이 작을수록 마진을 넓히는 데 집중(오차 허용)하고, 값이 클수록 마진을 좁히더라도 오차를 줄이는 데 집중합니다.
# gamma=하나의 데이터 샘플이 미치는 영향의 범위를 결정합니다. 값이 크면 영향력이 좁아져 모델이 복잡해집니다.
#
```

스케일링하지 않은 데이터:

```python
######## scaling 안한 데이터로 모델링(모델 학습, 검증)#######################################################

svc1 = SVC(C=0.1, gamma=0.1, random_state=0)

svc1.fit(X_train, y_train)

pred_train1 = svc1.predict(X_train)
pred_test1 = svc1.predict(X_test)

acc_train1 = accuracy_score(y_train, pred_train1)
acc_test1 = accuracy_score(y_test, pred_test1)

print(acc_test1, acc_train1)
```

```text
0.631578947368421 0.6263736263736264
```

Standard Scaling한 데이터:

```python
##### Standard Scaling 한 데이터로 모델링
svc2 = SVC(C=0.1, gamma=0.1, random_state=0)

svc2.fit(X_train_scaled1, y_train)

pred_train2 = svc2.predict(X_train_scaled1)
pred_test2 = svc2.predict(X_test_scaled1)

acc_train2 = accuracy_score(y_train, pred_train2)
acc_test2 = accuracy_score(y_test, pred_test2)

print(acc_test2, acc_train2)
```

```text
0.9122807017543859 0.9692307692307692
```

Min-Max Scaling한 데이터:

```python
### Min Max Scaling 한 데이터로 모델링
svc3 = SVC(C=0.1, gamma=0.1, random_state=0)


svc3.fit(X_train_scaled2, y_train)

pred_train3 = svc3.predict(X_train_scaled2)
pred_test3 = svc3.predict(X_test_scaled2)

acc_train3 = accuracy_score(y_train, pred_train3)
acc_test3 = accuracy_score(y_test, pred_test3)

print(acc_test3, acc_train3)
```

```text
0.9035087719298246 0.9252747252747253
```

| 데이터 | test 정확도 | train 정확도 |
|---|---|---|
| 스케일링 안 함 | 0.632 | 0.626 |
| StandardScaler | 0.912 | 0.969 |
| MinMaxScaler | 0.904 | 0.925 |

> **보충** 스케일링하지 않은 모델의 0.63은 사실상 다수 클래스(양성, 357/569 ≈ 0.627)를 전부 찍은 수준이다. SVM의 RBF 커널은 데이터 사이 거리로 계산하는데, 척도가 큰 컬럼(수백~수천 단위)이 거리를 독차지해 제대로 학습하지 못했다. 같은 모델, 같은 하이퍼파라미터인데 스케일링만으로 정확도가 0.6에서 0.9대로 올랐다.

## 모델 저장: pickle

학습이 끝난 **전처리 객체와 모델 객체를 모두** 저장한다. 서비스에서 새 데이터를 받으면 저장한 scaler로 변환하고 저장한 모델로 예측해야 하기 때문이다.

```python
# 학습된 모델을 저장함
# dir 생성
# model를 저장할때, 전처리한 객체(결측치, 이상치 등), 모델 객체 모두 저장해야 함.
# import os
# 파일/디렉토리 경로를 str로 생성
# a/b/c/d.txt=>경로를 문자열로 다 써줘야함
# join("a", "b", "c", "d", "txt") 사용하면 경로를 자동으로 생성
```

```python
import os
# 저장할 경로 생성
save_dir = "saved_model/wisconsin_breast_cancer"
os.makedirs(save_dir, exist_ok=True)

scaler_path = os.path.join(save_dir, 'standard_scaler.pkl')
model_path = os.path.join(save_dir, 'svm_model.pkl')
print(scaler_path, model_path)
```

```text
saved_model/wisconsin_breast_cancer/standard_scaler.pkl saved_model/wisconsin_breast_cancer/svm_model.pkl
```

> **보충** 노트북(Windows)에서는 `saved_model/wisconsin_breast_cancer\standard_scaler.pkl`처럼 구분자가 `\`로 붙었다. `os.path.join()`은 실행하는 OS에 맞는 구분자를 쓰기 때문에, 이 글을 실행한 Linux에서는 `/`로 나온다. 경로를 문자열로 직접 이어 붙이지 않고 `join()`을 쓰는 이유다. 메모의 `join("a", "b", "c", "d", "txt")`는 `a/b/c/d/txt`가 되니, 파일명은 `"d.txt"`처럼 한 덩어리로 넘긴다.

```python
### StandardScaler 저장
import pickle # 피클로 저장

with open(scaler_path, 'wb') as fw_scaler: # 객체명
    pickle.dump(s_scaler, fw_scaler)  # StandardScaler 학습 끝난 것을 # fw_scaler이 경로에 저장
```

```python
### 모델 저장
with open(model_path, 'wb') as fw_model:
    pickle.dump(svc2, fw_model)
```

저장한 객체를 다시 불러온다. 바이너리로 저장했으니 `'rb'`로 연다.

```python
# Scaler 모델 불러오기
with open(scaler_path, 'rb') as fr_scaler: #'rb'로 읽어옴
    saved_scaler = pickle.load(fr_scaler)

with open(model_path, 'rb') as fr_model:
    saved_svc = pickle.load(fr_model)
```

불러온 scaler와 모델로 test set을 추론하면 저장 전 `svc2`와 같은 정확도가 나온다.

```python
# Loading 한 전처리기(scaler)와 모델을 이용해서 Test set 추론 및 평가
x_test_scaled = saved_scaler.transform(X_test)
result = saved_svc.predict(x_test_scaled)
accuracy_score(y_test, result)
```

```text
0.9122807017543859
```

> **보충** scikit-learn 공식 문서는 `pickle` 대신 큰 numpy 배열을 더 효율적으로 저장하는 `joblib.dump()` / `joblib.load()`도 안내한다. 어느 쪽이든 저장할 때와 불러올 때의 **scikit-learn 버전이 같아야** 안전하고, 출처를 모르는 pickle 파일은 열면 안 된다(불러올 때 임의 코드가 실행될 수 있다).

## 정리

- 전처리는 모델 성능에 가장 큰 영향을 주는 단계다. **Garbage in, garbage out**
- **결측치**: 구조적 결측인지 관측 결측인지 먼저 구분하고, 서비스까지 생각하면 삭제보다 **대체**가 기본이다. `SimpleImputer`(평균·중앙값·최빈값), `KNNImputer`(비슷한 행 기준)
- **이상치**: 표준편차나 IQR 기준으로 찾고, 제거·윈저화·대체로 처리한다
- **범주형**: 트리 계열은 레이블 인코딩, 선형 계열은 원핫 인코딩. 정답(y)은 레이블 인코딩
- **수치형**: 거리·가중치를 쓰는 모델은 `StandardScaler`나 `MinMaxScaler`로 척도를 맞춘다
- 모든 전처리기는 **train으로 `fit`**, validation·test·새 데이터는 **`transform`만** 한다
- 서비스를 위해 학습한 **전처리기와 모델을 함께** 저장한다
