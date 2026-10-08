---
title: "로지스틱 회귀: 확률로 분류하기"
description: "선형 회귀의 가중합에 시그모이드(로지스틱) 함수를 씌워 양성일 확률을 추정하는 로지스틱 회귀의 원리, 로그 손실과 Binary Cross Entropy, 주요 하이퍼파라미터를 정리하고 유방암 데이터로 학습·평가와 GridSearchCV까지 실행 결과와 함께 다룹니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 15
originalNotebook: "13_선형모델_로지스틱회귀.ipynb"
tags: ["Python","scikit-learn","Logistic Regression","Cross Entropy"]
date: 2026-05-29
---

> SKN31 머신러닝 과정 노트북 `13_선형모델_로지스틱회귀.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 로지스틱 회귀의 확률 추정 방식
- 로지스틱(시그모이드) 함수
- 손실함수: 로그 손실과 Binary Cross Entropy
- 주요 하이퍼파라미터
- 유방암 데이터 분류와 GridSearchCV

## 로지스틱 회귀 (LogisticRegression)

- **선형 회귀 알고리즘을 이용한 이진 분류 모델**이다. 이름은 회귀지만 분류 모델이다
- 샘플이 특정 클래스에 속할 **확률**을 추정한다

```python
# 로지스틱 회귀
# 분류모델
# y^ = LF(wX+b)
# LF(wX+b) => 0 ~ 1 사이의 실수
# 이 값을 특정 클래스에 대한 0 or 1의 확률로 사용함
```

`LF`는 Logistic Function이다. 선형 회귀의 결과(`wX + b`)는 -∞ ~ +∞ 어떤 값이든 나오는데, 이걸 0 ~ 1 사이로 눌러서 확률처럼 쓴다.

> **보충** scikit-learn의 `LogisticRegression`은 다중 분류도 지원한다. 클래스가 3개 이상이면 시그모이드 대신 **소프트맥스(softmax)** 로 클래스별 확률을 낸다.

## 확률 추정

선형 회귀처럼 feature의 가중합을 계산한 뒤, 그 값에 로지스틱 함수를 적용해 확률을 계산한다.

$$
\hat{p} = \sigma(\mathbf{w}^T \mathbf{X} + b) \quad (\hat{p}: \text{양성일 확률},\ \sigma: \text{로지스틱 함수})
$$

### 로지스틱 함수

- 0과 1 사이의 실수를 반환한다
- S자 형태의 **시그모이드 함수(sigmoid function)** 다

$$
\sigma(x) = \frac{1}{1 + e^{-x}}
$$

확률이 0.5 이상이면 양성(1), 미만이면 음성(0)으로 판정한다.

$$
\hat{y} = \begin{cases} 0 & \hat{p} < 0.5 \\ 1 & \hat{p} \geq 0.5 \end{cases}
$$

```python
import matplotlib.pyplot as plt
import numpy as np

def logistic_func(X):
    return 1 / (1 + np.exp(-X))  # e에 x 제곱한걸 계산해줌

X = np.linspace(-10, 10, 10000)
y = logistic_func(X)

plt.figure(figsize=(13, 6))

plt.plot(X, y, color='b', linewidth=2)

# y 위치에 수평선을 그리는 함수.
# x 위치에 수직선을 그리는 함수(axvline(x=위치))
plt.axhline(y=0.5, color='r', linestyle=':')

plt.ylim(-0.15, 1.15) # y축 범위 지정.
plt.yticks(np.arange(-0.1,1.2,0.1))


# spine 그래프의 사각 선 4개  => 옮길 수 있음

ax = plt.gca()
ax.spines['left'].set_position("center")      # spine의 위치를 변경. - "center": 중앙, "zero": 0 위치
ax.spines['bottom'].set_position("zero")
ax.spines['top'].set_position(("data", 1))    # spin`e의 위치를 지정한 값의 위치로 이동
ax.spines['right'].set_visible(False)         # spine을 안보이게 처리.
plt.show()
```

![그래프 출력](/images/ml/ml-logistic-regression-1.png)

> **보충** 주석의 "e에 x 제곱"은 e의 **-x 제곱**($e^{-x}$)이다. x가 크면 $e^{-x}$가 0에 가까워져 결과가 1에, x가 아주 작으면(음수) $e^{-x}$가 커져 결과가 0에 가까워진다.

```python
# z = wX+b 값이 양수이면
# y값(1 클래스)일 확률이 0.5보다 큼

# z = wX+b 값이 음수이면
# y값(0 클래스)일 확률이 0.5보다 큼
```

그래프에서 x = 0일 때 정확히 0.5다. 그래서 가중합 z의 **부호**만 보면 분류 결과를 알 수 있다.

## LogisticRegression의 손실함수

**로그 손실(log loss)**: 모델이 예측한 **정답의 확률**에 log를 취해 손실값을 구한다. 확률이 틀릴수록 손실을 크게 만들려고 log를 쓴다.

$$
-\log(\text{모델이 예측한 정답에 대한 확률})
$$

```python
# 손실함수 = 오차를 계산하는 함수

# MSE → 회귀 모델에서 사용

# 로그 손실 함수 → 분류 모델
#  - 2진 분류: Binary Cross Entropy
#  - 다중 분류: Cross Entropy (softmax)
```

**Binary Cross Entropy**: 이진 분류용 log loss. 로지스틱 함수는 양성(1)의 확률만 내니까 정답이 0일 때와 1일 때 계산이 다르다. 이를 하나의 식으로 합쳤다.

$$
L(\mathbf{W}) = -\frac{1}{m}\sum_{i=1}^{m}\left[y_i \log(\hat{p}_i) + (1 - y_i)\log(1 - \hat{p}_i)\right]
$$

- 정답 y가 1이면 앞의 $y_i \log(\hat{p}_i)$만 남는다
- 정답 y가 0이면 뒤의 $(1 - y_i)\log(1 - \hat{p}_i)$만 남는다
- 정답에 매긴 확률이 클수록 손실이 작고, 작을수록 크다

log loss와 MSE를 비교해 본다. 정답이 양성이고 모델이 양성 확률을 0.929로 예측했을 때다.

```python
import numpy as np
p = 0.929128 # p = 양성일 확률

-np.log(p).item(), (1-p)**2 # log loss, mse 비교 log를 사용하면, 오차에
```

```text
(0.07350876709754946, 0.005022840384000007)
```

정답에 대한 확률과 손실의 관계를 그래프로 그렸다.

```python
import numpy as np
import matplotlib.pyplot as plt

X = np.linspace(0.000000001, 1, 100)   # 정답의 확률(X값)
y = -np.log(X)                         # 오차(log loss)

plt.figure(figsize=(10,8))
plt.plot(X, y)
plt.axvline(0.5, linestyle=':', linewidth=2, color='r')

plt.xticks(np.arange(0,1.1,0.1))
plt.yticks([0,1,2,3,4,5,10,20])

plt.xlabel("모델이 정답에 대해 예측한 확률값")
plt.ylabel("오차")

plt.gca().spines['bottom'].set_position(("data", 0))
plt.show()
```

![그래프 출력](/images/ml/ml-logistic-regression-2.png)

노트북에서 실행하지 않고 남겨 둔 두 셀이다.

```python
-np.log(1), -np.log(0.500001)
```

```text
(np.float64(-0.0), np.float64(0.6931451805619453))
```

```python
-np.log(0.49999), -np.log(0.1), -np.log(0.01), -np.log(0.000000001)
```

```text
(np.float64(0.693167180759948), np.float64(2.3025850929940455), np.float64(4.605170185988091), np.float64(20.72326583694641))
```

정답 확률이 1이면 손실 0, 0.5면 약 0.69다. 그런데 0.1이면 2.3, 0.01이면 4.6, 0.000000001이면 20.7로 **틀린 쪽으로 확신할수록** 손실이 폭발적으로 커진다. MSE는 아무리 틀려도 최대 1이라 "확신하고 틀린" 예측을 이만큼 강하게 벌주지 못한다. 분류에 log loss를 쓰는 이유다.

## 최적화와 하이퍼파라미터

분류 문제이므로 **binary cross-entropy**를 손실함수로, **경사하강법**으로 최적화한다.

| 하이퍼파라미터 | 뜻 |
|---|---|
| `penalty` | 과대적합을 줄이는 규제 방식. `'l1'`, `'l2'`(기본), `'elasticnet'`, `None` |
| `C` | 규제 강도. 기본 1. **작을수록 규제가 강하다**(단순한 모델) |
| `max_iter` | 최적화 반복 횟수. 기본 100 |

> **보충** C는 Ridge·Lasso의 alpha와 **반대 방향**이다. alpha는 클수록 규제가 강하고, C는 작을수록 규제가 강하다(C ≈ 1/alpha). SVM의 C와 같은 방향이다.

## 예제: 유방암 데이터

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, test_size=0.2, random_state=0)
```

선형 회귀 기반이라 연속형 feature는 Feature scaling, 범주형은 One hot encoding을 한다.

```python
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression

pipeline = Pipeline([
    ("scaler", StandardScaler()), ("model", LogisticRegression(random_state=0))
])

pipeline.fit(X_train, y_train)
```

```text
Pipeline(steps=[('scaler', StandardScaler()),
                ('model', LogisticRegression(random_state=0))])
```

```python
pipeline.steps[1][1]
```

```text
LogisticRegression(random_state=0)
```

학습한 weight와 bias를 본다. feature가 30개라 가중치도 30개다.

```python
## LR - weight와 bias 를 조회
pipeline.steps[1][1].coef_
```

```text
array([[-0.53920598, -0.43121045, -0.48894972, -0.57235136, -0.12651259,
         0.44745113, -0.73727937, -0.96309847,  0.10899318,  0.4314711 ,
        -1.32465716, -0.02190933, -0.65639595, -0.840148  , -0.20475766,
         0.66663119,  0.07494071, -0.4407399 ,  0.4149338 ,  0.62652627,
        -0.98445101, -0.97336912, -0.79832217, -0.8674727 , -0.73559409,
        -0.17872566, -0.76379438, -0.86189751, -0.78119307, -0.6077822 ]])
```

```python
pipeline.steps[1][1].intercept_
```

```text
array([0.34117272])
```

```python
# 평가
pred_train = pipeline.predict(X_train)
pred_test = pipeline.predict(X_test)

pred_train_proba = pipeline.predict_proba(X_train)
pred_test_proba = pipeline.predict_proba(X_test)
```

```python
pred_test[:5]
```

```text
array([0, 0, 0, 1, 0])
```

```python
pred_test_proba[:5]
```

```text
array([[9.89182982e-01, 1.08170177e-02],
       [1.00000000e+00, 1.26256273e-13],
       [9.97962827e-01, 2.03717342e-03],
       [1.49041103e-02, 9.85095890e-01],
       [9.85491396e-01, 1.45086037e-02]])
```

> **보충** `predict_proba()`가 내는 양성 확률이 바로 $\sigma(\mathbf{w}^T\mathbf{X} + b)$다. 직접 계산해서 같은지 확인했다.

```python
# 보충: 가중합 → 시그모이드로 확률 직접 계산
model = pipeline.steps[1][1]
X_test_scaled = pipeline.steps[0][1].transform(X_test[:5])
z = X_test_scaled @ model.coef_[0] + model.intercept_[0]
print("z (가중합):", np.round(z, 3))
print("직접 계산한 확률:", np.round(1 / (1 + np.exp(-z)), 6))
print("predict_proba   :", np.round(pred_test_proba[:5, 1], 6))
```

```text
z (가중합): [ -4.516 -29.7    -6.194   4.191  -4.218]
직접 계산한 확률: [0.010817 0.       0.002037 0.985096 0.014509]
predict_proba   : [0.010817 0.       0.002037 0.985096 0.014509]
```

z가 음수인 샘플은 확률이 0.5 미만이라 0으로, 양수인 샘플은 1로 예측됐다.

```python
from metrics import print_binary_classification_metrics
print_binary_classification_metrics(y_train, pred_train, pred_train_proba[:, 1])
```

```text
정확도: 0.989010989010989
재현율: 0.9929824561403509
정밀도: 0.9895104895104895
F1 점수: 0.9912434325744308
Average Precision: 0.9985893579760078
ROC-AUC Score: 0.9979153766769865
```

```python
print_binary_classification_metrics(y_test, pred_test, pred_test_proba[:, 1])
```

```text
정확도: 0.9824561403508771
재현율: 1.0
정밀도: 0.972972972972973
F1 점수: 0.9863013698630136
Average Precision: 0.9974301219609739
ROC-AUC Score: 0.9957010582010581
```

test 정확도 0.98, ROC-AUC 0.99대다. 단순한 선형 모델이지만 이 데이터에서는 앞에서 써 본 트리·부스팅 모델들과 비슷하거나 더 좋다.

## GridSearchCV로 하이퍼파라미터 탐색

```python
from sklearn.model_selection import GridSearchCV

params = {
    "model__C": [0.01, 0.1, 1, 10], # 작을 수록 강한 규제
    "model__penalty":['l1', 'l2']
}
gs = GridSearchCV(
    pipeline,
    params,
    scoring="accuracy",
    cv=4,
    n_jobs=-1
)
gs.fit(X_train, y_train)
```

<div class="sql-result sql-result-warn"><div class="sql-result-meta">경고 · FitFailedWarning: 16 fits failed out of a total of 32.</div></div>

<div class="sql-result sql-result-warn"><div class="sql-result-meta">경고 · UserWarning: One or more of the test scores are non-finite: [       nan 0.94729079        nan 0.96920121        nan 0.97362599</div></div>

```text
GridSearchCV(cv=4,
             estimator=Pipeline(steps=[('scaler', StandardScaler()),
                                       ('model',
                                        LogisticRegression(random_state=0))]),
             n_jobs=-1,
             param_grid={'model__C': [0.01, 0.1, 1, 10],
                         'model__penalty': ['l1', 'l2']},
             scoring='accuracy')
```

노트북에서도 같은 경고가 떴다. 32번 중 16번이 **실패**했다는 내용이다.

```python
gs.best_score_
```

```text
np.float64(0.9736259897531439)
```

```python
gs.best_params_
```

```text
{'model__C': 1, 'model__penalty': 'l2'}
```

```python
import pandas as pd
df = pd.DataFrame(gs.cv_results_).sort_values('rank_test_score')
df[["param_model__C", "param_model__penalty", "rank_test_score", "mean_test_score"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>param_model__C</th><th>param_model__penalty</th><th>rank_test_score</th><th>mean_test_score</th></tr></thead><tbody><tr><th class="idx">5</th><td>1.0</td><td>l2</td><td>1</td><td>0.973626</td></tr><tr><th class="idx">3</th><td>0.1</td><td>l2</td><td>2</td><td>0.969201</td></tr><tr><th class="idx">7</th><td>10.0</td><td>l2</td><td>3</td><td>0.96041</td></tr><tr><th class="idx">1</th><td>0.01</td><td>l2</td><td>4</td><td>0.947291</td></tr><tr><th class="idx">0</th><td>0.01</td><td>l1</td><td>5</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">2</th><td>0.1</td><td>l1</td><td>5</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">4</th><td>1.0</td><td>l1</td><td>5</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">6</th><td>10.0</td><td>l1</td><td>5</td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

> **보충** `l1` 조합 4개가 전부 `NaN`이다. LogisticRegression의 기본 최적화 방법(`solver='lbfgs'`)은 **L2 규제만 지원**해서, `penalty='l1'`이면 학습 자체가 실패한다. L1을 쓰려면 `solver`를 `'liblinear'`나 `'saga'`로 바꿔야 한다.

```python
# 보충: L1을 지원하는 solver로 다시 탐색
pipeline2 = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(solver="liblinear", random_state=0))
])
gs2 = GridSearchCV(pipeline2, params, scoring="accuracy", cv=4, n_jobs=-1)
gs2.fit(X_train, y_train)
df2 = pd.DataFrame(gs2.cv_results_).sort_values('rank_test_score')
df2[["param_model__C", "param_model__penalty", "rank_test_score", "mean_test_score"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>param_model__C</th><th>param_model__penalty</th><th>rank_test_score</th><th>mean_test_score</th></tr></thead><tbody><tr><th class="idx">3</th><td>0.1</td><td>l2</td><td>1</td><td>0.978031</td></tr><tr><th class="idx">5</th><td>1.0</td><td>l2</td><td>2</td><td>0.973626</td></tr><tr><th class="idx">4</th><td>1.0</td><td>l1</td><td>3</td><td>0.967028</td></tr><tr><th class="idx">2</th><td>0.1</td><td>l1</td><td>4</td><td>0.962622</td></tr><tr><th class="idx">1</th><td>0.01</td><td>l2</td><td>5</td><td>0.962603</td></tr><tr><th class="idx">7</th><td>10.0</td><td>l2</td><td>6</td><td>0.96041</td></tr><tr><th class="idx">6</th><td>10.0</td><td>l1</td><td>7</td><td>0.953831</td></tr><tr><th class="idx">0</th><td>0.01</td><td>l1</td><td>8</td><td>0.923071</td></tr></tbody></table></div></div>

```python
# 보충: L1 규제로 0이 된 가중치 수
l1_model = LogisticRegression(solver="liblinear", penalty="l1", C=0.1, random_state=0)
l1_model.fit(StandardScaler().fit_transform(X_train), y_train)
print("0이 아닌 가중치:", (l1_model.coef_ != 0).sum(), "/", l1_model.coef_.size)
```

```text
0이 아닌 가중치: 8 / 30
```

이제 L1 조합도 점수가 나온다. 선형 회귀의 Lasso처럼, L1 규제를 강하게 걸면 30개 feature 중 일부만 남기고 나머지 가중치를 0으로 만든다.

## 정리

- 로지스틱 회귀는 선형 회귀의 가중합 $z = \mathbf{w}^T\mathbf{X} + b$에 **시그모이드**를 씌워 **양성일 확률**을 낸다. z가 양수면 확률 0.5 이상이라 양성이다
- 손실함수는 **Binary Cross Entropy**(log loss)다. 틀린 쪽으로 확신할수록 손실이 크게 커진다
- 경사하강법으로 최적화하고, 규제는 `penalty`와 `C`로 조절한다. **C는 작을수록 규제가 강하다**
- 선형 계열이라 **스케일링**과 원핫 인코딩이 필요하다
- `penalty='l1'`은 기본 solver(`lbfgs`)에서 안 된다. `liblinear`나 `saga`를 쓴다
