---
title: "KNN: 가까운 이웃으로 예측하기"
description: "K-최근접 이웃(KNN)이 분류와 회귀에서 추론하는 방식, 하이퍼파라미터 K와 거리 측정 방식(유클리디안·맨하탄), 스케일링이 필수인 이유를 정리하고, 유방암 데이터 분류와 보스턴 집값 회귀에 GridSearchCV로 K와 p를 찾는 과정을 실행 결과와 함께 다룹니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 10
originalNotebook: "08_최근접이웃.ipynb"
tags: ["Python","scikit-learn","KNN"]
date: 2026-05-22
---

> SKN31 머신러닝 과정 노트북 `08_최근접이웃.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- KNN의 추론 방식: 분류와 회귀
- 하이퍼파라미터 K와 거리 측정 방식
- KNN의 장단점
- 유방암 데이터 분류: K에 따른 성능 변화
- 보스턴 집값 회귀: GridSearchCV로 K, p 찾기

## K-최근접 이웃 (K-Nearest Neighbors, KNN)

- **분류**와 **회귀**를 모두 지원한다
- 예측하려는 데이터와 train set 데이터들 사이의 **거리**를 재서, 가장 가까운 **K개** 데이터의 레이블을 참고해 추론한다
- 학습할 때는 train set을 **저장만** 하고, 예측할 때 거리를 계산한다
  - 그래서 학습은 빠르지만 예측에 시간이 많이 걸린다

```python
# 결측치 추측, 벡터db => knn알고리즘 이용
```

전처리 글의 `KNNImputer`가 이 알고리즘으로 결측치를 채웠다. 벡터 DB에서 질문과 비슷한 문서를 찾는 것도 같은 원리(가장 가까운 벡터 K개 찾기)다.

## 추론 방식

### 분류

![물음표 데이터는 주변 이웃을 보고 분류한다](/images/ml/fig-knn-1.png)

```python
# 거리 계산을 통해 정답을 찾아냄 (다수결)
# k = 갯수, nearlist=가장 가까운 neighbors 이웃
```

K는 새로운 데이터를 분류할 때 확인할 이웃의 개수를 정하는 **하이퍼파라미터**다.

![K=1이면 삼각형, K=4면 원으로 판단이 바뀐다](/images/ml/fig-knn-2.png)

같은 데이터라도 K=1이면 가장 가까운 하나(삼각형)를 따르고, K=4면 4개 중 다수(원)를 따른다.

```python
# k 값이 작을 때 복잡도가 높음 => 규제가 작음
# k 값이 커질 때 복잡도가 낮음 => 규제가 높음
```

### 회귀

![회귀는 가까운 이웃들의 y값 평균으로 예측한다](/images/ml/fig-knn-regression.png)

- **분류**: 가까운 K개 데이터의 y 중 **다수의 class**로 추론한다
- **회귀**: 가까운 K개 데이터의 y값 **평균**으로 추론한다
- K가 너무 작으면 과대적합, 너무 크면 과소적합이 생길 수 있다

## 주요 하이퍼파라미터

분류는 `sklearn.neighbors.KNeighborsClassifier`, 회귀는 `KNeighborsRegressor`를 쓴다.

**이웃 수: `n_neighbors` (= K)**

- K가 작을수록 이상치에 반응할 가능성이 커져 **과대적합**이 될 수 있다
- K가 너무 크면 너무 많은 데이터를 바탕으로 추론해서 **과소적합**이 될 수 있다
- 과대적합이면 K를 **크게**, 과소적합이면 K를 **작게** 잡는다
- K는 feature 수의 제곱근 정도로 지정하면 성능이 좋은 것으로 알려져 있다

```python
# feature 수의 제곱근 16개면 => 4개
# 하나의 값을 맞추기 위해서 모든 데이터의 거리를 계산해야 함
```

> **보충** 흔히 쓰이는 경험칙은 feature 수가 아니라 **train 샘플 수의 제곱근**(√n)이다. 이 경험칙도 출발점일 뿐이고, 결국 교차 검증으로 정한다. 이진 분류에서는 동점을 피하려고 **홀수**를 쓰기도 한다.

**거리 재는 방법: `p`**

- `p=2`: 유클리디안 거리 (기본값, L2 Norm)
- `p=1`: 맨하탄 거리 (L1 Norm)

### 유클리디안 거리 (Euclidean distance)

![두 점 사이의 직선 거리](/images/ml/fig-euclidean.png)

$$
d = \sqrt{(a_1 - b_1)^2 + (a_2 - b_2)^2 + \cdots + (a_n - b_n)^2}
$$

같은 축의 값끼리 빼서 제곱해 더한 뒤 제곱근을 씌운다. 두 점 사이의 **직선 거리**다.

### 맨하탄 거리 (Manhattan distance)

![축을 따라 이동한 거리](/images/ml/fig-manhattan.png)

$$
d = |a_1 - b_1| + |a_2 - b_2| + \cdots + |a_n - b_n|
$$

축마다 차이의 절댓값을 더한다. 바둑판 같은 맨하탄 거리를 따라 **블록을 돌아가는 거리**라서 이런 이름이 붙었다.

```python
# 직선거리, 축별거리
# 서비스할때 적합한 모델은 아님, 추론시간이 오래걸림-> 계산이 많기 때문에
```

## 요약

- 이해하기 쉽고 튜닝할 하이퍼파라미터가 적어 빠르게 만들 수 있다
- 서비스 모델보다는 복잡한 알고리즘을 적용하기 전 **확인용, base line을 잡는 모델**로 쓴다
- train set이 크면(feature나 샘플이 많으면) 거리 계산량이 늘어 **예측이 느려진다**
- feature 간 단위가 다르면 단위가 큰 feature에 거리가 좌우되므로 **Feature Scaling**이 필요하다
- feature가 너무 많거나, 대부분이 0인 **희소(sparse)** 데이터셋에서는 성능이 아주 나쁘다

```python
# feature scaling이 필수 / 안그러면 단위가 다르기때문에 거리계산이 어려움 (단위 큰거에 영향을 받음)
# 희소 spars (대부분의 값이 0으로 구성된 데이터셋) 거리계산이 안되서 구분이 안됌 -> One hot encoding으로 하면 안좋나,,,
```

> **보충** 메모 끝의 질문에 답하면, 범주가 아주 많은 컬럼을 원핫 인코딩하면 0이 대부분인 컬럼이 잔뜩 생기고, 그만큼 KNN의 거리 계산이 의미를 잃는다. 범주 몇 개짜리 컬럼이라면 원핫 인코딩을 써도 괜찮다. feature가 많을수록 모든 점 사이의 거리가 비슷비슷해지는 현상을 **차원의 저주**라고 부른다.

## KNN 모델링

데이터 전처리

- 범주형: One Hot Encoding
- 숫자형: Feature Scaling

### 분류 모델

```python
from sklearn.datasets import load_breast_cancer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=0)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

K를 1부터 10까지 바꿔 성능을 본다.

```python
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score

k_list = range(1, 11)
train_acc_list, test_acc_list = [], []

for k in k_list:
    # k값 넣어서 모델 생성
    knn = KNeighborsClassifier(n_neighbors=k)
    # 학습
    knn.fit(X_train_scaled, y_train)
    # 검증 -> 검증결과 LIST에 추가.
    train_acc_list.append(accuracy_score(y_train, knn.predict(X_train_scaled)))
    test_acc_list.append(accuracy_score(y_test, knn.predict(X_test_scaled)))
```

```python
import pandas as pd
df = pd.DataFrame({
    "train":train_acc_list,
    "test":test_acc_list
}, index=k_list)
df.rename_axis(index="K갯수", columns="Dataset", inplace=True) #rename_axis인덱스에 이름을 줌 (축에 이름을 줌) 아주 편리함
df

# 1로 갈 수록 복잡도가 낮아짐
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 10행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>K갯수</th><th>train</th><th>test</th></tr></thead><tbody><tr><th class="idx">1</th><td>1.0</td><td>0.951049</td></tr><tr><th class="idx">2</th><td>0.983568</td><td>0.93007</td></tr><tr><th class="idx">3</th><td>0.985915</td><td>0.951049</td></tr><tr><th class="idx">4</th><td>0.981221</td><td>0.965035</td></tr><tr><th class="idx">5</th><td>0.978873</td><td>0.951049</td></tr><tr><th class="idx">6</th><td>0.976526</td><td>0.951049</td></tr><tr><th class="idx">7</th><td>0.976526</td><td>0.958042</td></tr><tr><th class="idx">8</th><td>0.978873</td><td>0.951049</td></tr><tr><th class="idx">9</th><td>0.974178</td><td>0.951049</td></tr><tr><th class="idx">10</th><td>0.976526</td><td>0.951049</td></tr></tbody></table></div></div>

> **보충** 마지막 줄은 반대다. K가 **1로 갈수록 복잡도가 높아진다**. 위에 적어 둔 메모("k 값이 작을 때 복잡도가 높음")가 맞다. K=1에서 train 정확도가 1.0인 이유도 이것이다. train 데이터로 예측하면 가장 가까운 이웃이 **자기 자신**이라 무조건 맞힌다.

```python
df.plot();
```

![그래프 출력](/images/ml/ml-knn-1.png)

### 회귀 모델

```python
import pandas as pd

df = pd.read_csv("data/boston_dataset.csv")

X = df.drop(columns='MEDV').values
y = df['MEDV'].values
```

```python
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=0)
```

GridSearchCV로 K와 거리 방식(p)을 함께 찾는다.

```python
### GridSearchCV로 최적 K값, p값 찾기
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsRegressor
from sklearn.model_selection import GridSearchCV

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("knn", KNeighborsRegressor())
])
params = {
    "knn__n_neighbors":range(3, 10),
    "knn__p":[1, 2]
}
gs = GridSearchCV(
                    pipeline,
                    params,
                    scoring="neg_mean_squared_error",
                    cv=4,
                    n_jobs=-1
)
gs.fit(X_train, y_train)
```

```text
GridSearchCV(cv=4,
             estimator=Pipeline(steps=[('scaler', StandardScaler()),
                                       ('knn', KNeighborsRegressor())]),
             n_jobs=-1,
             param_grid={'knn__n_neighbors': range(3, 10), 'knn__p': [1, 2]},
             scoring='neg_mean_squared_error')
```

```python
gs.best_params_
```

```text
{'knn__n_neighbors': 3, 'knn__p': 1}
```

```python
-gs.best_score_
```

```text
np.float64(18.73019870598482)
```

```python
df = pd.DataFrame(gs.cv_results_).sort_values('rank_test_score')
df[["param_knn__n_neighbors", "param_knn__p", "mean_test_score"]].head(5)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>param_knn__n_neighbors</th><th>param_knn__p</th><th>mean_test_score</th></tr></thead><tbody><tr><th class="idx">0</th><td>3</td><td>1</td><td>-18.730199</td></tr><tr><th class="idx">2</th><td>4</td><td>1</td><td>-19.758577</td></tr><tr><th class="idx">5</th><td>5</td><td>2</td><td>-19.926287</td></tr><tr><th class="idx">1</th><td>3</td><td>2</td><td>-19.997421</td></tr><tr><th class="idx">3</th><td>4</td><td>2</td><td>-20.38158</td></tr></tbody></table></div></div>

1, 2위가 맨하탄 거리(p=1)이고 K는 작을수록 좋았다. 다만 상위 조합끼리 MSE 차이는 1~2 정도로 크지 않다.

```python
# 최종평가
from metrics import print_regression_metrcis

best_model = gs.best_estimator_

pred = best_model.predict(X_test)
print_regression_metrcis(y_test, pred, "최종평가")
```

```text
최종평가
MSE: 29.62185476815397
RMSE: 5.442596326033557
R Squared: 0.6374270288407293
```

> **보충** 교차 검증 MSE(약 18.7)보다 test MSE(약 29.6)가 꽤 크다. Boston 데이터는 506개뿐이라 어느 행이 test로 가느냐에 따라 점수가 크게 흔들린다. 앞에서 Hold-out 방식의 단점으로 정리한 부분이다.

## 정리

- KNN은 가까운 K개 이웃의 **다수결**(분류) 또는 **평균**(회귀)으로 예측한다
- 학습은 저장만 해서 빠르고, **예측 때 모든 거리를 계산**해서 느리다
- K가 작으면 복잡(과대적합 위험), 크면 단순(과소적합 위험)
- 거리 방식은 `p=2` 유클리디안(기본), `p=1` 맨하탄
- 거리 기반이라 **스케일링 필수**, 희소하고 feature가 많은 데이터에는 약하다. 그래서 주로 **base line** 모델로 쓴다
