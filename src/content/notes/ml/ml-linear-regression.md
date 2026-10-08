---
title: "선형 회귀: 다항 회귀와 Ridge·Lasso 규제"
description: "선형 회귀 모델의 가중치와 절편의 의미, LinearRegression으로 보스턴 집값 예측, PolynomialFeatures로 feature를 늘리는 다항 회귀와 과대적합, L2 규제(Ridge)·L1 규제(Lasso)·ElasticNet으로 가중치를 제한하는 방법을 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 14
originalNotebook: "12_선형모델_선형회귀.ipynb"
tags: ["Python","scikit-learn","Linear Regression","Ridge","Lasso"]
date: 2026-05-28
---

> SKN31 머신러닝 과정 노트북 `12_선형모델_선형회귀.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 선형 회귀 모델: 가중치(weight)와 편향(bias)
- `LinearRegression`으로 보스턴 집값 예측
- 다항 회귀(`PolynomialFeatures`)와 과대적합
- 규제: Ridge(L2), Lasso(L1), ElasticNet

## 선형 회귀 개요

선형 회귀(Linear regression)는 종속 변수 y와 한 개 이상의 독립 변수 X의 **선형 상관관계**를 모델링하는 회귀분석 기법이다. ([위키백과](https://ko.wikipedia.org/wiki/%EC%84%A0%ED%98%95_%ED%9A%8C%EA%B7%80))

### 선형 회귀 모델

- 각 feature에 **가중치(Weight)** 를 곱하고 **편향(bias)** 을 더해 예측한다
- weight와 bias가 학습으로 최적화하는 **파라미터**다
  - 가중치는 각 feature가 target에 미치는 **영향도**다
  - 양수 가중치는 target을 증가시키고, 음수는 감소시킨다. 0에서 멀수록 영향이 크고, 0에 가까울수록 연관성이 적다
  - bias는 모든 feature가 0일 때의 target 값이다

$$
\hat{y}_i = w_1 x_{i1} + w_2 x_{i2} + \cdots + w_p x_{ip} + b
$$

$\hat{y}_i$: 예측값, $x$: feature, $w$: 가중치(회귀계수), $b$: 절편, $p$: p번째 feature, $i$: i번째 샘플

```python
# bias 편향 (절편)
```

```python
# 회기 모델 LRm Ridge Lasso EN
# 분류 모델 Logistic Regresstion 선형회귀모델을 기반으로 한 분류모델
```

이 글에서 다룰 회귀 모델(LinearRegression, Ridge, Lasso, ElasticNet)과 다음 글의 로지스틱 회귀다. "회기"는 회귀다.

```python
# 범죄율, 학원, 평수, 화장실
# → 집값에 영향을 주는 변수들 (feature)
# w = 각 feature가 집값에 미치는 영향의 크기(가중치)

# 범죄율 ↑ → 집값 ↓
# → w1 = 음수

# 학원 많음 ↑ → 집값 ↑
# → w2 = 양수

# 평수 ↑ → 집값 ↑
# → w3 = 양수
```

## 실습: 보스턴 집값

```python
import pandas as pd
from sklearn.model_selection import train_test_split

# Load data, x,y 분리
df = pd.read_csv("data/boston_dataset.csv")
X = df.drop(columns='MEDV')
y = df['MEDV']

# train/test set 분리
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)
X_train.shape, X_test.shape, y_train.shape, y_test.shape
```

```text
((404, 13), (102, 13), (404,), (102,))
```

## LinearRegression

- 가장 기본적인 선형 회귀 모델. feature의 **가중합**으로 y를 추론한다
- 학습 결과 속성
  - **`coef_`**: 각 feature에 곱하는 가중치
  - **`intercept_`**: y절편. 모든 feature가 0일 때 예측값

**전처리**

- 범주형: 원핫 인코딩
- 연속형: Feature Scaling으로 단위를 맞춘다. StandardScaler를 쓸 때 성능이 더 잘 나오는 경향이 있다

```python
# 전처리
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

```python
from sklearn.linear_model import LinearRegression
lr = LinearRegression()
lr.fit(X_train_scaled, y_train)
```

```text
LinearRegression()
```

학습으로 찾은 weight와 bias를 본다.

```python
## 학습을 통해 찾은 weights 와 bias 조회
print("weights")
print(lr.coef_)
```

```text
weights
[-0.97082019  1.05714873  0.03831099  0.59450642 -1.8551476   2.57321942
 -0.08761547 -2.88094259  2.11224542 -1.87533131 -2.29276735  0.71817947
 -3.59245482]
```

```python
import pandas as pd
pd.Series(lr.coef_, index=X_train.columns)
```

```text
CRIM      -0.970820
ZN         1.057149
INDUS      0.038311
CHAS       0.594506
NOX       -1.855148
RM         2.573219
AGE       -0.087615
DIS       -2.880943
RAD        2.112245
TAX       -1.875331
PTRATIO   -2.292767
B          0.718179
LSTAT     -3.592455
dtype: float64
```

메모의 예상대로 범죄율(CRIM)은 음수, 방 개수(RM)는 양수다. 절댓값이 가장 큰 건 하위계층 비율(LSTAT, -3.59)이다. 스케일링을 했기 때문에 가중치끼리 크기를 비교할 수 있다.

```python
print("bias")
lr.intercept_
```

```text
bias
```

```text
np.float64(22.611881188118804)
```

> **보충** bias 22.61은 **train set 집값의 평균**과 같다. 표준화하면 모든 feature의 평균이 0이 되니, "모든 feature가 0" = "모든 feature가 평균인 집"이고, 그 집의 예측값이 평균 집값이 되는 것이다.

### 평가

```python
## 회귀 - mse, rmse, (ma-절대값-e), r2
from metrics import print_regression_metrcis

print_regression_metrcis(y_train, lr.predict(X_train_scaled), title="Transet")
```

```text
Transet
MSE: 19.326470203585725
RMSE: 4.396188144698282
R Squared: 0.7730135569264234
```

```python
print_regression_metrcis(y_test, lr.predict(X_test_scaled), title="Testset")
```

```text
Testset
MSE: 33.44897999767649
RMSE: 5.783509315085132
R Squared: 0.5892223849182514
```

### Pipeline 이용

Scaler → LinearRegression을 파이프라인으로 묶으면 결과가 같다.

```python
from sklearn.pipeline import Pipeline

pl = Pipeline(
    [("scaler", StandardScaler()), ("model", LinearRegression())],
     verbose=True
    )

pl.fit(X_train, y_train)
```

```text
[Pipeline] ............ (step 1 of 2) Processing scaler, total=   0.0s
[Pipeline] ............. (step 2 of 2) Processing model, total=   0.0s
```

```text
Pipeline(steps=[('scaler', StandardScaler()), ('model', LinearRegression())],
         verbose=True)
```

```python
pred = pl.predict(X_test)
```

```python
print_regression_metrcis(y_test, pred)
```

```text
MSE: 33.44897999767649
RMSE: 5.783509315085132
R Squared: 0.5892223849182514
```

정답과 예측을 나란히 그려 본다.

```python
### y_test 정답과 추론값 비교 - 시각화
import matplotlib.pyplot as plt
plt.figure(figsize=(20, 5))
plt.plot(range(y_test.size), y_test, marker="x", label="정답")
plt.plot(range(y_test.size), pred, marker='o', label="예측")
plt.legend()
plt.grid(True, linestyle=":")
plt.show()
```

![그래프 출력](/images/ml/ml-linear-regression-1.png)

대체로 따라가지만, 50(데이터의 최댓값) 근처의 비싼 집들은 크게 못 맞힌다. 이 데이터는 50 이상을 모두 50으로 잘라 기록해서 직선 관계로 설명하기 어렵다.

## 다항회귀 (Polynomial Regression)

- feature가 너무 적어 y를 다 설명하지 못하는 **과소적합**일 때 feature를 늘려 주는 전처리 방식이다
- 각 feature를 **거듭제곱**한 것과 feature끼리 **곱한** 것을 새 feature로 추가한다
  - 파라미터(가중치) 기준으로는 일차식이라 **선형 모델**이다. 입력 기준으로는 N차식이라 **비선형 데이터**를 추론할 수 있다
- `PolynomialFeatures` 변환기를 쓴다

```python
# polymomial Features - 전처리 데이터 수를 늘려서 => 1차식, 2차식, 3차식
```

### 데이터셋 만들기

$y = x^2 + x + 2 + \text{노이즈}$인 데이터를 만든다. 모델이 이 함수를 찾아내야 한다.

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

np.random.seed(0)

# 모델링을 통해 찾아야 하는 함수.
def func(X):
    return X**2 + X + 2 + np.random.normal(0,1, size=(X.size, 1))

m = 100 # 총 데이터 수
X = 6 * np.random.rand(m, 1) - 3
y = func(X)
y = y.flatten()

print(X.shape, y.shape)
```

```text
(100, 1) (100,)
```

```python
import matplotlib.pyplot as plt
plt.scatter(X,  y)
plt.show()
```

![그래프 출력](/images/ml/ml-linear-regression-2.png)

### LinearRegression으로 학습하면

```python
lr = LinearRegression()
lr.fit(X, y)
pred = lr.predict(X)
```

```python
import matplotlib.pyplot as plt
plt.scatter(X,  y, label="y")
plt.scatter(X, pred, label='y hat(예측)')
plt.legend()
plt.show()
```

![그래프 출력](/images/ml/ml-linear-regression-3.png)

```python
lr.coef_, lr.intercept_
```

```text
(array([0.78189543]), np.float64(5.175619278567209))
```

```python
from metrics import print_regression_metrcis
print_regression_metrcis(y, pred)
```

```text
MSE: 7.729204760808937
RMSE: 2.7801447373848966
R Squared: 0.19138252437306003
```

곡선 데이터에 직선을 그었으니 R²가 0.19에 그친다. 과소적합이다.

### PolynomialFeatures로 다항회귀

```python
X.shape
```

```text
(100, 1)
```

```python
from sklearn.preprocessing import PolynomialFeatures
pnf = PolynomialFeatures(
    degree=2,            # 최고차항의 차수. ex) degree=4로 하면: x(원래 컬럼), x^2, x^3, x^4  한 feature추가.
    include_bias=False,  # True(기본값) - 상수항 feature 생성여부. (모든 값이 1인 feature 추가여부)
)                        # wx+b
# pnf.fit(X)
# pnf.transform(X)
X_poly = pnf.fit_transform(X)
```

```python
print(X.shape, X_poly.shape)
```

```text
(100, 1) (100, 2)
```

```python
X[:3]
```

```text
array([[0.29288102],
       [1.2911362 ],
       [0.61658026]])
```

```python
X_poly[:3]
```

```text
array([[0.29288102, 0.08577929],
       [1.2911362 , 1.66703268],
       [0.61658026, 0.38017121]])
```

두 번째 컬럼이 첫 번째 컬럼의 제곱이다.

```python
lr2 = LinearRegression()
lr2.fit(X_poly, y)
```

```text
LinearRegression()
```

```python
lr2.coef_, lr2.intercept_
```

```text
(array([0.97906552, 0.94978823]), np.float64(2.3405007562628857))
```

x의 가중치 0.98, x²의 가중치 0.95, 절편 2.34. 데이터를 만든 식 $x^2 + x + 2$의 계수(1, 1, 2)를 거의 그대로 찾아냈다.

```python
X_new = np.linspace(-3, 3, 1000)[..., np.newaxis]  # (1000, ) -> (1000, 1)
X_new_poly = pnf.transform(X_new)
# X_new_poly.shape
y_hat = lr2.predict(X_new_poly)
```

```python
import matplotlib.pyplot as plt
# plt.rcParams['font.family'] = "malgun gothic"
# plt.rcParams['axes.unicode_minus'] = False

plt.scatter(X, y, label="정답")
plt.plot(X_new, y_hat, color='k', linewidth=2, label="Model추정")
plt.plot(X_new, lr.predict(X_new), color="r", linewidth=2, label="Label 전처리전")
plt.legend()
plt.show()
```

![그래프 출력](/images/ml/ml-linear-regression-4.png)

```python
# 평가
from metrics import print_regression_metrcis
print_regression_metrcis(y, lr2.predict(X_poly))
```

```text
MSE: 0.9735576723414219
RMSE: 0.9866902616026074
R Squared: 0.898147898555146
```

R²가 0.19 → 0.90으로 올랐다. RMSE 약 0.99는 데이터를 만들 때 넣은 노이즈(표준편차 1)와 거의 같다.

### degree를 크게 하면

feature가 너무 많으면 과대적합이 생긴다.

```python
pnf3 = PolynomialFeatures(degree=25, include_bias=False)
X_poly3 = pnf3.fit_transform(X)
print(X_poly3.shape)
lr3 = LinearRegression()
lr3.fit(X_poly3, y)
```

```text
(100, 25)
```

```text
LinearRegression()
```

```python
pred3 = lr3.predict(X_poly3)
print_regression_metrcis(y, pred3)
```

```text
MSE: 0.8369908339550262
RMSE: 0.9148720314639781
R Squared: 0.9124353104594468
```

```python
# degree=25 시각화
y_hat = lr3.predict(pnf3.transform(X_new))
plt.scatter(X, y, label="정답")
plt.plot(X_new, y_hat, color='k', linewidth=2, label="Model추정")
plt.legend()
plt.title("degree=25로 전처리한 결과")
# plt.ylim(-5, 20)
plt.show()
```

![그래프 출력](/images/ml/ml-linear-regression-5.png)

train R²는 0.91로 degree 2보다 조금 높지만, 곡선이 데이터 양 끝에서 크게 튄다. 노이즈까지 맞추려고 한 과대적합이다.

### PolynomialFeatures 예제

feature가 두 개일 때는 어떻게 늘어나는지 본다.

```python
import numpy as np
from sklearn.preprocessing import PolynomialFeatures
data = np.arange(12).reshape(6, 2)
data
```

```text
array([[ 0,  1],
       [ 2,  3],
       [ 4,  5],
       [ 6,  7],
       [ 8,  9],
       [10, 11]])
```

```python
pnf = PolynomialFeatures(degree=2, include_bias=False)
poly2 = pnf.fit_transform(data)
poly2.shape
```

```text
(6, 5)
```

```python
# 변환 후 각 feature를 어떻게 계산했는지 조회
pnf.get_feature_names_out()
```

```text
array(['x0', 'x1', 'x0^2', 'x0 x1', 'x1^2'], dtype=object)
```

```python
pd.DataFrame(poly2, columns=pnf.get_feature_names_out())
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 5열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>x0</th><th>x1</th><th>x0^2</th><th>x0 x1</th><th>x1^2</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td></tr><tr><th class="idx">1</th><td>2.0</td><td>3.0</td><td>4.0</td><td>6.0</td><td>9.0</td></tr><tr><th class="idx">2</th><td>4.0</td><td>5.0</td><td>16.0</td><td>20.0</td><td>25.0</td></tr><tr><th class="idx">3</th><td>6.0</td><td>7.0</td><td>36.0</td><td>42.0</td><td>49.0</td></tr><tr><th class="idx">4</th><td>8.0</td><td>9.0</td><td>64.0</td><td>72.0</td><td>81.0</td></tr><tr><th class="idx">5</th><td>10.0</td><td>11.0</td><td>100.0</td><td>110.0</td><td>121.0</td></tr></tbody></table></div></div>

제곱항(`x0^2`, `x1^2`)뿐 아니라 **곱한 항**(`x0 x1`)도 생긴다. degree를 5로 올리면 2개가 20개가 된다.

```python
pnf2 = PolynomialFeatures(degree=5, include_bias=False)
poly_n = pnf2.fit_transform(data)
poly_n.shape, data.shape
```

```text
((6, 20), (6, 2))
```

```python
pnf2.get_feature_names_out()
```

```text
array(['x0', 'x1', 'x0^2', 'x0 x1', 'x1^2', 'x0^3', 'x0^2 x1', 'x0 x1^2',
       'x1^3', 'x0^4', 'x0^3 x1', 'x0^2 x1^2', 'x0 x1^3', 'x1^4', 'x0^5',
       'x0^4 x1', 'x0^3 x1^2', 'x0^2 x1^3', 'x0 x1^4', 'x1^5'],
      dtype=object)
```

### Boston 데이터에 PolynomialFeatures 적용

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import PolynomialFeatures
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from metrics import print_regression_metrcis

df = pd.read_csv('data/boston_dataset.csv')
X = df.drop(columns='MEDV')
y = df['MEDV']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)
```

```python
# 전처리 pipeline
preprocessor = Pipeline([
    ("poly", PolynomialFeatures(degree=2, include_bias=False)),
    ("scaler", StandardScaler()),
])
```

```python
tmp = preprocessor.fit_transform(X_train)
```

```python
X_train.shape
```

```text
(404, 13)
```

```python
tmp.shape
```

```text
(404, 104)
```

feature 13개가 104개(원래 13 + 제곱 13 + 곱 78)가 됐다.

```python
preprocessor.steps[0][1].get_feature_names_out()[:20]
```

```text
array(['CRIM', 'ZN', 'INDUS', 'CHAS', 'NOX', 'RM', 'AGE', 'DIS', 'RAD',
       'TAX', 'PTRATIO', 'B', 'LSTAT', 'CRIM^2', 'CRIM ZN', 'CRIM INDUS',
       'CRIM CHAS', 'CRIM NOX', 'CRIM RM', 'CRIM AGE'], dtype=object)
```

```python
pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", LinearRegression())
])
```

```python
# 학습
pipeline.fit(X_train, y_train)
```

```text
Pipeline(steps=[('preprocessor',
                 Pipeline(steps=[('poly',
                                  PolynomialFeatures(include_bias=False)),
                                 ('scaler', StandardScaler())])),
                ('model', LinearRegression())])
```

```python
pred_train = pipeline.predict(X_train)
pred_test = pipeline.predict(X_test)
```

```python
print_regression_metrcis(y_train, pred_train, "Train set")
```

```text
Train set
MSE: 4.340278052012254
RMSE: 2.0833333991496064
R Squared: 0.9490240966612833
```

```python
print_regression_metrcis(y_test, pred_test, "Test set")
```

```text
Test set
MSE: 31.277814971446887
RMSE: 5.592657237078533
R Squared: 0.6158858584078899
```

```python
# degree = 몇 차항까지 쓸지
# 커질수록 곡선 표현 가능
# 데이터 더 잘 맞춤
# 너무 크면 과적합 위험
# PolynomialFeatures에서 많이 사용
```

train R²는 0.77 → 0.95로 크게 올랐는데 test는 0.59 → 0.62로 거의 그대로다. 404개 샘플에 feature 104개는 너무 많아서 과대적합이 됐다. 이걸 규제로 잡는다.

## 규제 (Regularization)

- 선형 회귀의 과대적합을 해결하려고 **가중치(회귀계수)에 페널티**를 준다
- feature가 너무 많거나, feature 수에 비해 샘플 수가 적으면 모델이 복잡해지면서 과대적합이 생긴다
- 해결 방법
  - 데이터를 더 수집한다
  - Feature selection: 불필요한 feature를 제거한다
  - **규제**: feature에 곱하는 가중치가 커지지 않게(0에 가깝게) 제한한다
    - 학습할 때 계산하는 오차를 일부러 키워서, 오차를 줄이려면 가중치를 작게 만들 수밖에 없게 한다
    - **L1 규제(Lasso)**, **L2 규제(Ridge)**

```python
# feature 수 多 => overfitting => 2가지 규제 공식으로 가중치(weight)를 규제해서 과적합을 막음
# L1 => 아예 w를 0으로 만듦
# L2 => 규제를 w를 강하게 0에 가깝게
```

## Ridge Regression (L2 규제)

- 손실함수에 규제항 $\alpha \sum w_i^2$ (L2 Norm)을 더한다
  - 가중치의 제곱합을 더해 오차를 인위적으로 키운다
  - 오차를 줄이려면 가중치를 줄여야 하므로, 가중치들이 **0에 가까워진다**
  - feature의 영향력이 줄어 모델 복잡도가 낮아지고 일반화 성능이 오른다
- $\alpha$는 규제 강도를 정하는 하이퍼파라미터다
  - 0에 가까울수록 규제가 약해진다. 0이면 LinearRegression과 같다
  - 커질수록 모든 가중치가 작아져, 중요하지 않은 feature의 영향력이 줄어든다

$$
\text{손실함수}(w) = \text{MSE}(w) + \alpha \frac{1}{2}\sum_{i=1}^{n} w_i^2
$$

```python
# 손실함수 = MSE(w)  + 각항의 w**을 다 더함 왜?
# w**의 이유는 양수로 만들기 위함

# 알파는 규제 하이퍼 파라미터 => 0에 가까울 수록 규제가 약해짐
```

```python
# mse + 규제항 (w값이 커짐)

# 손실함수+규제항을 가지고 => 최적화

#
```

```python
# 가중치가 큼 => 피쳐가 y값의 영향을 주는 크기가 큼
```

```python
# w(가중치)
# → 예측값 ŷ 변화
# → 오차(Loss) 변화
# → 미분 = 오차 변화율 계산
```

```python
# 선형회귀 스코어 = 오차의 평균
```

> **보충** 회귀 모델의 `score()`는 오차의 평균(MSE)이 아니라 **R²** 를 돌려준다. 제곱하는 이유는 메모대로 부호를 없애기 위해서이기도 하지만, 큰 가중치에 **더 큰** 페널티를 주기 위해서다. 가중치 3은 9, 0.5는 0.25의 페널티를 받는다. 그래서 Ridge는 큰 가중치를 집중적으로 줄인다.

```python
import pandas as pd
from sklearn.model_selection import train_test_split

df = pd.read_csv('data/boston_dataset.csv')
X = df.drop(columns='MEDV')
y = df['MEDV']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)
```

```python
# 전처리
## Ridge Regression은 LinearRegression 모델과 같은 공식의 모델임. 단지 최적화 방법이 다른 것 뿐이다.
## 그래서 데이터 전처리는 연속형 Feature는 Feature Scaling을 범주형 Feature는 One Hot Encoding을 한다.

from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

> **보충** 규제 모델에서는 스케일링이 성능 문제를 넘어 **필수**다. 규제항은 모든 가중치를 똑같이 다루는데, 단위가 큰 feature는 원래 가중치가 작게 나오고 단위가 작은 feature는 크게 나온다. 스케일을 맞추지 않으면 단위 때문에 어떤 feature는 과하게, 어떤 feature는 거의 규제를 받지 않는다.

### alpha에 따른 weight 변화

```python
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score
from sklearn.metrics import mean_squared_error

alpha_list = [0.001, 0.01, 0.1, 1, 10, 100, 500, 1000]

# alpha에 따른 각 feature 곱해지는 weight들을 저장할 DataFrame
coef_df = pd.DataFrame()
bias_list = [] #bias 들 저장할 리스트

for alpha in alpha_list:
    # 모델 생성 -> hyper parameter alpha 를 설정.
    model = Ridge(alpha=alpha, random_state=0)
    # 학습
    model.fit(X_train_scaled, y_train)
    # 학습 후 찾은 weight와 bias를 저장.
    coef_df[f"{alpha}"] = model.coef_
    bias_list.append(model.intercept_)
    # 검증결과 출력
    pred_train = model.predict(X_train_scaled)
    pred_test = model.predict(X_test_scaled)
    mse_t = mean_squared_error(y_train, pred_train)
    mse = mean_squared_error(y_test, pred_test)

    print(f"Alpha {alpha} - Train: {r2_score(y_train, pred_train):.4f}, Test: {r2_score(y_test, pred_test):.4f}, T_MSE : {mse:.3f}")
```

```text
Alpha 0.001 - Train: 0.7730, Test: 0.5892, T_MSE : 33.449
Alpha 0.01 - Train: 0.7730, Test: 0.5892, T_MSE : 33.450
Alpha 0.1 - Train: 0.7730, Test: 0.5891, T_MSE : 33.458
Alpha 1 - Train: 0.7730, Test: 0.5881, T_MSE : 33.537
Alpha 10 - Train: 0.7720, Test: 0.5792, T_MSE : 34.268
Alpha 100 - Train: 0.7515, Test: 0.5273, T_MSE : 38.494
Alpha 500 - Train: 0.6588, Test: 0.4288, T_MSE : 46.512
Alpha 1000 - Train: 0.5728, Test: 0.3655, T_MSE : 51.665
```

```python
coef_df.index = X_train.columns
```

```python
coef_df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 13행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0.001</th><th>0.01</th><th>0.1</th><th>1</th><th>10</th><th>100</th><th>500</th><th>1000</th></tr></thead><tbody><tr><th class="idx">CRIM</th><td>-0.970811</td><td>-0.970732</td><td>-0.969942</td><td>-0.962257</td><td>-0.901965</td><td>-0.708783</td><td>-0.543189</td><td>-0.453716</td></tr><tr><th class="idx">ZN</th><td>1.057132</td><td>1.056981</td><td>1.055479</td><td>1.040872</td><td>0.926287</td><td>0.602925</td><td>0.475571</td><td>0.416153</td></tr><tr><th class="idx">INDUS</th><td>0.038283</td><td>0.038034</td><td>0.035549</td><td>0.01168</td><td>-0.157051</td><td>-0.481556</td><td>-0.547926</td><td>-0.504161</td></tr><tr><th class="idx">CHAS</th><td>0.594511</td><td>0.59455</td><td>0.594942</td><td>0.598719</td><td>0.625918</td><td>0.662516</td><td>0.50625</td><td>0.369364</td></tr><tr><th class="idx">NOX</th><td>-1.855112</td><td>-1.85479</td><td>-1.851578</td><td>-1.820134</td><td>-1.560302</td><td>-0.702047</td><td>-0.405744</td><td>-0.374977</td></tr><tr><th class="idx">RM</th><td>2.57323</td><td>2.573329</td><td>2.574308</td><td>2.583786</td><td>2.653906</td><td>2.643872</td><td>1.813405</td><td>1.294925</td></tr><tr><th class="idx">AGE</th><td>-0.087623</td><td>-0.087694</td><td>-0.088395</td><td>-0.095188</td><td>-0.146581</td><td>-0.26332</td><td>-0.317919</td><td>-0.322093</td></tr><tr><th class="idx">DIS</th><td>-2.880909</td><td>-2.880612</td><td>-2.877636</td><td>-2.848263</td><td>-2.58802</td><td>-1.393256</td><td>-0.358183</td><td>-0.078157</td></tr><tr><th class="idx">RAD</th><td>2.112167</td><td>2.111458</td><td>2.104394</td><td>2.036231</td><td>1.533846</td><td>0.322752</td><td>-0.210082</td><td>-0.290222</td></tr><tr><th class="idx">TAX</th><td>-1.875259</td><td>-1.87461</td><td>-1.868146</td><td>-1.806092</td><td>-1.370452</td><td>-0.612679</td><td>-0.519593</td><td>-0.478899</td></tr><tr><th class="idx">PTRATIO</th><td>-2.292758</td><td>-2.29267</td><td>-2.291793</td><td>-2.283191</td><td>-2.209979</td><td>-1.846754</td><td>-1.238416</td><td>-0.912526</td></tr><tr><th class="idx">B</th><td>0.71818</td><td>0.718181</td><td>0.718191</td><td>0.71831</td><td>0.71994</td><td>0.69546</td><td>0.534798</td><td>0.42903</td></tr><tr><th class="idx">LSTAT</th><td>-3.592438</td><td>-3.592289</td><td>-3.590798</td><td>-3.576073</td><td>-3.444268</td><td>-2.710461</td><td>-1.657253</td><td>-1.195766</td></tr></tbody></table></div></div>

alpha가 커질수록 모든 가중치가 0 쪽으로 줄어든다. 하지만 **정확히 0이 되지는 않는다.**

```python
bias_list
```

```text
[np.float64(22.611881188118804), np.float64(22.611881188118804), np.float64(22.611881188118804), np.float64(22.611881188118804), np.float64(22.611881188118804), np.float64(22.611881188118804), np.float64(22.611881188118804), np.float64(22.611881188118804)]
```

bias는 alpha와 관계없이 그대로다. 규제항에 bias는 들어가지 않기 때문이다.

## Lasso Regression (L1 규제)

Lasso는 Least Absolute Shrinkage and Selection Operator의 약자다.

- 손실함수에 규제항 $\alpha \sum |w_i|$ (L1 Norm)을 더한다
  - 가중치 절댓값의 합을 더하면, 모델은 손실을 줄이려고 가중치 중 **일부를 정확히 0**으로 만든다
  - 불필요한 feature의 가중치가 0이 되어 모델에서 빠진다. **feature selection이 자동으로** 일어난다
  - 모델 해석이 쉬워지고, 불필요한 feature의 개입을 막아 일반화 성능이 오른다

$$
\text{손실함수}(w) = \text{MSE}(w) + \alpha \sum_{i=1}^{n} |w_i|
$$

```python
from sklearn.linear_model import Lasso
from sklearn.metrics import r2_score

alpha_list = [0.001, 0.01, 0.1, 1, 10, 100, 500, 1000]

# alpha에 따른 각 feature 곱해지는 weight들을 저장할 DataFrame
coef_df2 = pd.DataFrame()
bias_list2 = [] #bias 들 저장할 리스트

for alpha in alpha_list:
    model = Lasso(alpha=alpha, random_state=0)
    model.fit(X_train_scaled, y_train)
    coef_df2[f"{alpha}"] = model.coef_
    bias_list2.append(model.intercept_)
    # 검증결과 출력
    pred_train = model.predict(X_train_scaled)
    pred_test = model.predict(X_test_scaled)
    print(f"Alpha {alpha} - Train: {r2_score(y_train, pred_train):.4f}, Test: {r2_score(y_test, pred_test):.4f}")
```

```text
Alpha 0.001 - Train: 0.7730, Test: 0.5890
Alpha 0.01 - Train: 0.7730, Test: 0.5875
Alpha 0.1 - Train: 0.7677, Test: 0.5664
Alpha 1 - Train: 0.7067, Test: 0.5070
Alpha 10 - Train: 0.0000, Test: -0.0019
Alpha 100 - Train: 0.0000, Test: -0.0019
Alpha 500 - Train: 0.0000, Test: -0.0019
Alpha 1000 - Train: 0.0000, Test: -0.0019
```

```python
coef_df2.index = X_train.columns
```

```python
coef_df2
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 13행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0.001</th><th>0.01</th><th>0.1</th><th>1</th><th>10</th><th>100</th><th>500</th><th>1000</th></tr></thead><tbody><tr><th class="idx">CRIM</th><td>-0.967874</td><td>-0.940302</td><td>-0.663468</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td></tr><tr><th class="idx">ZN</th><td>1.053234</td><td>1.021582</td><td>0.701524</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">INDUS</th><td>0.028566</td><td>-0.0</td><td>-0.130724</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td></tr><tr><th class="idx">CHAS</th><td>0.594814</td><td>0.59484</td><td>0.588934</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">NOX</th><td>-1.848201</td><td>-1.804075</td><td>-1.358749</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td></tr><tr><th class="idx">RM</th><td>2.574014</td><td>2.585398</td><td>2.722754</td><td>2.540098</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">AGE</th><td>-0.085817</td><td>-0.069486</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td></tr><tr><th class="idx">DIS</th><td>-2.874999</td><td>-2.809365</td><td>-2.140932</td><td>-0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">RAD</th><td>2.093952</td><td>1.956109</td><td>0.640853</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td></tr><tr><th class="idx">TAX</th><td>-1.857546</td><td>-1.738284</td><td>-0.658779</td><td>-0.171527</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td></tr><tr><th class="idx">PTRATIO</th><td>-2.2907</td><td>-2.278841</td><td>-2.172217</td><td>-1.784796</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td></tr><tr><th class="idx">B</th><td>0.716796</td><td>0.705484</td><td>0.602666</td><td>0.110959</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">LSTAT</th><td>-3.592545</td><td>-3.596398</td><td>-3.6158</td><td>-3.585324</td><td>-0.0</td><td>-0.0</td><td>-0.0</td><td>-0.0</td></tr></tbody></table></div></div>

alpha = 1에서 이미 여러 가중치가 **정확히 0**이 됐고, alpha = 10부터는 **모두** 0이다. 모든 가중치가 0이면 예측값은 항상 bias(평균)라서 R²가 0이 된다. test R²는 -0.002로 아주 조금 음수인데, 평가지표 글에서 정리했던 "평균으로 찍는 것보다 못한" 경우다. train 평균으로 test를 예측했기 때문이다.

> **보충** 표의 `-0.0`은 부호만 음수로 남은 0이라 0과 같다.

## Polynomial + Ridge, Lasso

feature를 104개로 늘려 과대적합된 보스턴 데이터에 규제를 적용한다.

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler

preprocessor = Pipeline([
    ("poly", PolynomialFeatures(degree=2, include_bias=False)),
    ("scaler", StandardScaler()),
])
```

```python
X_train_poly = preprocessor.fit_transform(X_train)
X_test_poly = preprocessor.transform(X_test)
```

```python
X_train_poly.shape
```

```text
(404, 104)
```

```python
# feature 수 적음 => 늘림 => 유의미한 건만 두고 W를 나머지 0에 가깝거나 0으로
```

**LinearRegression으로 평가** (규제 없음)

```python
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from metrics import print_regression_metrcis

lr = LinearRegression()
lr.fit(X_train_poly, y_train)

print_regression_metrcis(y_train, lr.predict(X_train_poly))
print('-------------------------------------')
print_regression_metrcis(y_test, lr.predict(X_test_poly))
```

```text
MSE: 4.340278052012254
RMSE: 2.0833333991496064
R Squared: 0.9490240966612833
-------------------------------------
MSE: 31.277814971446887
RMSE: 5.592657237078533
R Squared: 0.6158858584078899
```

**Ridge의 alpha에 따른 R²**

```python
from sklearn.metrics import r2_score

alpha_list = [0.001, 0.01, 0.1, 1, 10, 20]
train_r2 = []
test_r2 = []
for alpha in alpha_list:
    ridge = Ridge(alpha=alpha, random_state=0)
    ridge.fit(X_train_poly, y_train)
    train_r2.append(r2_score(y_train, ridge.predict(X_train_poly)))
    test_r2.append(r2_score(y_test, ridge.predict(X_test_poly)))
```

```python
ridge_df = pd.DataFrame({"alpha":alpha_list, "train":train_r2, "test":test_r2})
ridge_df.set_index("alpha", inplace=True)
ridge_df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>alpha</th><th>train</th><th>test</th></tr></thead><tbody><tr><th class="idx">0.001</th><td>0.948809</td><td>0.623663</td></tr><tr><th class="idx">0.01</th><td>0.947669</td><td>0.636538</td></tr><tr><th class="idx">0.1</th><td>0.941685</td><td>0.667476</td></tr><tr><th class="idx">1.0</th><td>0.929584</td><td>0.742633</td></tr><tr><th class="idx">10.0</th><td>0.898313</td><td>0.740306</td></tr><tr><th class="idx">20.0</th><td>0.8812</td><td>0.718677</td></tr></tbody></table></div></div>

```python
ridge_df.plot();
```

![그래프 출력](/images/ml/ml-linear-regression-6.png)

alpha = 1에서 test R²가 0.74까지 올랐다. 규제 없을 때(0.62)보다 크게 좋아졌고, train과의 차이도 줄었다.

**Lasso의 alpha에 따른 R²**

```python
import warnings
warnings.filterwarnings('ignore')
```

```python
alpha_list = [0.001, 0.01, 0.1, 1, 10, 20]
train_r2 = []
test_r2 = []
for alpha in alpha_list:
    lasso = Lasso(alpha=alpha, random_state=0)
    lasso.fit(X_train_poly, y_train)
    train_r2.append(r2_score(y_train, lasso.predict(X_train_poly)))
    test_r2.append(r2_score(y_test, lasso.predict(X_test_poly)))
```

<div class="sql-result sql-result-warn"><div class="sql-result-meta">경고 · ConvergenceWarning: Objective did not converge. You might want to increase the number of iterations, check the scale of the features or consider increasing regularisation. Duality gap: 1.055e+03, tolerance: 3.440e+00</div></div>

<div class="sql-result sql-result-warn"><div class="sql-result-meta">경고 · ConvergenceWarning: Objective did not converge. You might want to increase the number of iterations, check the scale of the features or consider increasing regularisation. Duality gap: 7.264e+02, tolerance: 3.440e+00</div></div>

> **보충** 노트북에서는 `warnings.filterwarnings('ignore')`로 경고를 껐다. 위에 보이는 `ConvergenceWarning`은 Lasso가 정해진 반복 횟수(`max_iter=1000`) 안에 최적값으로 수렴하지 못했다는 뜻이다. alpha가 작고 feature가 많을 때 잘 생긴다. 끄는 대신 `Lasso(alpha=..., max_iter=10000)`처럼 반복 횟수를 늘리는 게 근본적인 해결이다.

```python
lasso_df = pd.DataFrame({"alpha":alpha_list, "train":train_r2, "test":test_r2})
lasso_df.set_index("alpha", inplace=True)
lasso_df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>alpha</th><th>train</th><th>test</th></tr></thead><tbody><tr><th class="idx">0.001</th><td>0.934216</td><td>0.600479</td></tr><tr><th class="idx">0.01</th><td>0.926367</td><td>0.678741</td></tr><tr><th class="idx">0.1</th><td>0.859929</td><td>0.706008</td></tr><tr><th class="idx">1.0</th><td>0.754489</td><td>0.586474</td></tr><tr><th class="idx">10.0</th><td>0.0</td><td>-0.00189</td></tr><tr><th class="idx">20.0</th><td>0.0</td><td>-0.00189</td></tr></tbody></table></div></div>

```python
# 보충: alpha=0.1일 때 104개 feature 중 살아남은 가중치 수
lasso01 = Lasso(alpha=0.1, random_state=0).fit(X_train_poly, y_train)
print("0이 아닌 가중치:", (lasso01.coef_ != 0).sum(), "/", lasso01.coef_.size)
```

```text
0이 아닌 가중치: 24 / 104
```

Lasso는 alpha = 0.1에서 test R² 0.71이 최고다. 이때 104개 중 일부 가중치만 남기고 나머지를 0으로 만들어 feature를 스스로 골랐다.

## ElasticNet (엘라스틱넷)

- 릿지와 라쏘를 절충한 모델. 규제항에 두 규제항을 모두 더한다
- 혼합 비율 $r$(`l1_ratio`)로 섞는 정도를 조절한다. $r = 0$이면 릿지, $r = 1$이면 라쏘와 같다

$$
\text{손실함수}(w) = \text{MSE}(w) + r\alpha \sum |w_i| + \frac{1-r}{2}\alpha \sum w_i^2
$$

```python
from sklearn.linear_model import ElasticNet

model = ElasticNet(alpha=0.5, l1_ratio=0.3)
model.fit(X_train_poly, y_train)
```

```text
ElasticNet(alpha=0.5, l1_ratio=0.3)
```

```python
print_regression_metrcis(y_train, model.predict(X_train_poly), "==========Trainset")
print_regression_metrcis(y_test, model.predict(X_test_poly), "==========Testset")
```

```text
==========Trainset
MSE: 17.932543567258534
RMSE: 4.234683408149721
R Squared: 0.7893850125389811
==========Testset
MSE: 31.77314113785274
RMSE: 5.636766904693926
R Squared: 0.6098028955989219
```

alpha = 0.5는 이 데이터에 규제가 꽤 강한 편이라 train과 test 모두 Ridge(alpha=1)보다 낮다. ElasticNet도 alpha와 l1_ratio를 그리드 서치로 찾아야 제 성능이 나온다.

## 정리

- 일반적으로 선형 회귀는 **어느 정도 규제가 있을 때** 성능이 좋다
- 기본적으로 **Ridge**를 쓴다
- target에 영향을 주는 feature가 몇 개뿐이면 가중치를 0으로 만드는 **Lasso**를 쓴다
- feature 수가 샘플 수보다 많거나 feature끼리 연관성이 높을 때는 **ElasticNet**을 쓴다

```python
# 대부분의 사황은 L2를 사용하면 됌
# target의 영향력을 주는 feature가 몇개 없을 알면 L1을 쓰면 됌
# 픽쳐가 행보다 많을때
```

- 선형 회귀는 feature의 **가중합 + 절편**이다. 스케일링하면 가중치 크기로 feature 영향력을 비교할 수 있다
- **다항 회귀**는 feature를 거듭제곱·곱해서 늘려 비선형 관계를 표현한다. degree가 너무 크면 과대적합
- **Ridge(L2)** 는 가중치를 0 쪽으로 줄이고, **Lasso(L1)** 는 일부를 정확히 0으로 만든다. alpha가 클수록 규제가 강하다
