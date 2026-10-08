---
title: "부스팅: Gradient Boosting과 XGBoost"
description: "약한 학습기를 순서대로 이어 앞 모델의 오차를 보완하는 부스팅의 원리를 Gradient Boosting의 잔차 학습 과정으로 따라가고, learning_rate·n_estimators의 관계, 보스턴 집값 그리드 서치, scikit-learn 래퍼로 쓰는 XGBoost까지 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 12
originalNotebook: "10_앙상블_부스팅.ipynb"
tags: ["Python","scikit-learn","Boosting","Gradient Boosting","XGBoost"]
date: 2026-05-26
---

> SKN31 머신러닝 과정 노트북 `10_앙상블_부스팅.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7, XGBoost 3.2에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 부스팅(Boosting)이란
- Gradient Boosting의 학습·추론 과정: 잔차를 학습하는 트리들
- 주요 하이퍼파라미터: `learning_rate`, `n_estimators`
- 유방암 데이터 분류, 보스턴 집값 회귀
- XGBoost

## Boosting

부스팅은 **단순하고 약한 학습기(Weak Learner)** 들을 결합해 정확하고 강력한 학습기(Strong Learner)를 만드는 방식이다.

정확도가 낮은 모델 하나를 학습시킨 뒤, 그 모델의 **예측 오류를 두 번째 모델이 보완**한다. 둘을 합치면 처음보다 정확해진다. 합쳐진 모델의 오류는 다시 다음 모델이 보완하고, 이 과정을 반복한다.

**각 학습기는 앞 학습기가 만든 오류를 줄이는 방향으로 학습한다.**

## GradientBoosting

- 개별 모델로 **Decision Tree**를 쓴다
- **깊지 않은 트리**를 많이 연결해서 이전 트리의 오차를 보정해 나간다
- 각 트리가 데이터의 일부를 잘 예측하도록 하고, 그 트리들이 모여 전체 성능을 높인다
- 분류와 회귀를 모두 지원한다 (`GradientBoostingClassifier`, `GradientBoostingRegressor`)
- 훈련 시간이 오래 걸리고, 트리 기반이라 희소한 고차원 데이터에서는 성능이 좋지 않다

```python
# depth를 깊게 하지않는다 5이하
# 모델이 복잡하면 안됌
# 오차를 줄여가는 방안으로 함
```

## 학습·추론 과정 따라가기

키, 좋아하는 색, 성별로 **몸무게**를 예측하는 회귀 예제다.

![학습 데이터: 키·좋아하는 색·성별로 몸무게 예측](/images/ml/fig-gb-1.png)

**1단계**: 첫 예측은 **몸무게의 평균**(71.2)이다. 실제값에서 평균을 빼서 **잔차(Residual)** 를 구한다.

![평균으로 예측하고 잔차를 계산한다](/images/ml/fig-gb-2.png)

**2단계**: 첫 번째 트리는 실제 몸무게가 아니라 **잔차**를 예측하도록 학습한다.

![첫 번째 트리는 잔차를 학습한다](/images/ml/fig-gb-3.png)

**3단계**: 평균에 트리가 예측한 잔차를 더하면 예측이 실제값에 가까워진다. 그대로 더하면 train 데이터를 100% 맞히지만 과대적합이 된다.

![잔차를 그대로 더하면 train 데이터에 딱 맞는다](/images/ml/fig-gb-4.png)

**4단계**: 그래서 잔차 예측에 **학습률(learning rate)** 을 곱해 조금씩만 더한다.

![학습률 0.1을 곱해 조금만 보정한다](/images/ml/fig-gb-5.png)

**5단계**: 새 예측으로 다시 잔차를 구하고, 다음 트리가 그 잔차를 학습한다. 이걸 반복하며 트리를 계속 이어 붙인다.

![트리를 계속 이어 붙여 잔차를 줄여 나간다](/images/ml/fig-gb-6.png)

**추론**: 새 데이터는 평균에서 출발해 모든 트리가 예측한 잔차 × 학습률을 차례로 더한다.

![새 데이터 예측: 평균 + 각 트리의 보정값](/images/ml/fig-gb-7.png)

*이미지 참조: [StatQuest - Gradient Boost](https://www.youtube.com/watch?v=3CC4N4z3GJc&list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF&index=49)*

수업 중 적은 메모다.

```python
# 1번째 (평균 - 예측 값) = 오차
# 2번째 (평균 + 오차) - 예측값 = 오차
#
#
# 언젠가 오차가 없음



# 첫번째 예측 = 평균 (=target, y들의 평균)

# 실제값(y) - 첫번째 예측(평균) = 첫번째 오차


## 중요 ##  2번째 학습에서는 실제값을 사용하는게 아닌 첫번째오차를 활용해 학습함
#
# 두번째 예측 = 첫번째 예측(평균) + 첫번째 오차 x 0.1 # 예측된 오차를 그대로 사용하면 100% 맞겠지만 새로운 값에는 효용성이 없음
#

# learning rate = 0.1를 오차에 곱함


# 실제값(y) - 두번째 예측 = 두번째 오차


# 반복
```

> **보충** 정확히는 "첫 번째 오차 × 0.1"이 아니라 "**트리가 예측한** 첫 번째 오차 × 0.1"이다. 실제 오차를 그대로 쓰면 새 데이터에서는 오차를 알 수 없으니 쓸 수 없다. 트리가 "이런 feature면 오차가 이 정도"라는 규칙을 배워 두었기 때문에 새 데이터에도 보정값을 줄 수 있다.

과정을 코드로 직접 따라가 본다.

```python
# 보충: 잔차 학습을 직접 반복해 보기
import numpy as np
from sklearn.tree import DecisionTreeRegressor

rng = np.random.default_rng(0)
X_demo = rng.uniform(-3, 3, size=(100, 1))
y_demo = X_demo[:, 0]**2 + rng.normal(0, 0.5, size=100)

pred = np.full_like(y_demo, y_demo.mean())   # 1단계: 평균으로 예측
lr = 0.1
for step in range(1, 51):
    residual = y_demo - pred                  # 잔차
    t = DecisionTreeRegressor(max_depth=2, random_state=0).fit(X_demo, residual)  # 잔차를 학습
    pred = pred + lr * t.predict(X_demo)      # 학습률만큼 보정
    if step in (1, 2, 5, 10, 50):
        print(f"트리 {step:2d}개  MSE: {np.mean((y_demo - pred)**2):.3f}")
```

```text
트리  1개  MSE: 7.373
트리  2개  MSE: 6.234
트리  5개  MSE: 3.878
트리 10개  MSE: 1.878
트리 50개  MSE: 0.152
```

트리가 늘어날수록 오차가 꾸준히 줄어든다. 이게 `GradientBoostingRegressor`가 안에서 하는 일이다.

### 주요 파라미터

- **Decision Tree의 가지치기 매개변수**: 각 트리가 복잡해지지 않도록 한다
- **learning_rate**: 이전 트리의 오차를 얼마나 강하게 보정할지. 기본값 0.1
  - 크면 보정을 강하게 해서 복잡한 모델이 된다. train 정확도는 오르지만 과대적합될 수 있다
  - 작으면 보정을 약하게 해서 복잡도가 줄어든다. 과대적합은 줄지만 성능 자체가 낮아질 수 있다
- **n_estimators**: 트리 개수. 많을수록 복잡한 모델이 된다
- **n_iter_no_change, validation_fraction**: `validation_fraction` 비율의 검증 데이터로 `n_iter_no_change`번 동안 점수가 좋아지지 않으면 **조기 종료**한다
- 보통 `max_depth`를 5 이하로 낮게 두고, `n_estimators`를 시간·메모리가 허락하는 만큼 크게 잡은 뒤 적절한 `learning_rate`를 찾는다

## 유방암 데이터 분류

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
X, y = load_breast_cancer(return_X_y=True)

X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=0)
```

```python
from sklearn.ensemble import GradientBoostingClassifier
gbc = GradientBoostingClassifier(random_state=0)
gbc.fit(X_train, y_train)

pred_train = gbc.predict(X_train)
pred_test = gbc.predict(X_test)
pred_train_proba = gbc.predict_proba(X_train)[:, 1]
pred_test_proba = gbc.predict_proba(X_test)[:, 1]
```

```python
from metrics import print_binary_classification_metrics
print_binary_classification_metrics(y_train, pred_train, pred_train_proba, "Train set")
```

```text
Train set
정확도: 1.0
재현율: 1.0
정밀도: 1.0
F1 점수: 1.0
Average Precision: 1.0
ROC-AUC Score: 1.0
```

```python
print_binary_classification_metrics(y_test, pred_test, pred_test_proba, "Test set")
```

```text
Test set
정확도: 0.958041958041958
재현율: 0.9555555555555556
정밀도: 0.9772727272727273
F1 점수: 0.9662921348314607
Average Precision: 0.9741338688529869
ROC-AUC Score: 0.9776729559748428
```

기본 설정(트리 100개, 깊이 3, 학습률 0.1)에서 train은 모든 지표가 1.0이다. test도 0.95 이상이지만 train과의 차이를 보면 약간 과대적합 쪽이다.

### Feature 중요도

```python
import pandas as pd
fi = pd.Series(gbc.feature_importances_, index=load_breast_cancer().feature_names).sort_values(ascending=False)
fi.head(10)
```

```text
worst perimeter         0.494735
worst concave points    0.162167
worst radius            0.131685
mean concave points     0.075630
worst texture           0.044308
worst area              0.019767
area error              0.013616
mean texture            0.011731
worst concavity         0.009429
concave points error    0.007998
dtype: float64
```

> **보충** 노트북에서는 index 없이 번호로 봤는데, feature 이름을 붙이면 `worst perimeter`(22번), `worst concave points`(27번), `worst radius`(20번)가 상위다. 앞 글들의 결정 트리 그림에서 루트 질문으로 나왔던 feature들이다.

### learning_rate에 따른 성능 변화

학습 시간을 재려고 `time` 모듈을 썼다.

```python
import time
time.time_ns()# time() # 1970/01/01 00:00:00 ~ 실행할 때 까지 몇(나노)초지났는지 반환.
```

```text
1791380030649691589
```

학습률을 0.0001로 아주 작게, 대신 트리를 10,000개로 많이 줬다.

```python
# Learning Rate  변화에 따른 성능 변화
import time

max_depth = 1
n_estimators = 10_000
lr = 0.0001  # 1e-4
# lr = 0.01  # 1e-2

gbc = GradientBoostingClassifier(
    n_estimators=n_estimators, learning_rate=lr, max_depth=max_depth, random_state=0
)
s = time.time()
gbc.fit(X_train, y_train)
e = time.time()

pred_train = gbc.predict(X_train)
pred_test = gbc.predict(X_test)
```

```python
print(f"학습률: {lr}, n_estimators: {n_estimators}, fit 시간: {e-s:.1f}초")
print_binary_classification_metrics(y_train, pred_train, title="============Train set 평가")
print_binary_classification_metrics(y_test, pred_test, title="============Test set 평가")
```

```text
학습률: 0.0001, n_estimators: 10000, fit 시간: 12.7초
============Train set 평가
정확도: 0.9413145539906104
재현율: 0.9887640449438202
정밀도: 0.9230769230769231
F1 점수: 0.9547920433996383
============Test set 평가
정확도: 0.916083916083916
재현율: 0.9888888888888889
정밀도: 0.89
F1 점수: 0.9368421052631579
```

```python
# time.sleep(2) # 2초동안 실행을 멈춘다
# 정확도: 0.916083916083916
# 재현율: 0.9888888888888889
# 정밀도: 0.89
# under 피팅이발생하면 learning rate를 수정
```

트리 10,000개를 학습했는데 train 정확도도 0.94에 그친다. 학습률이 너무 작아 아직 평균 근처에서 크게 움직이지 못한 **과소적합** 상태다. 노트북에 주석으로 남겨 둔 `lr = 0.01`로 바꿔 비교했다.

```python
# 보충: 같은 트리 수에서 learning_rate만 0.01로
gbc2 = GradientBoostingClassifier(n_estimators=n_estimators, learning_rate=0.01, max_depth=max_depth, random_state=0)
gbc2.fit(X_train, y_train)
print_binary_classification_metrics(y_train, gbc2.predict(X_train), title="============Train set 평가 (lr=0.01)")
print_binary_classification_metrics(y_test, gbc2.predict(X_test), title="============Test set 평가 (lr=0.01)")
```

```text
============Train set 평가 (lr=0.01)
정확도: 1.0
재현율: 1.0
정밀도: 1.0
F1 점수: 1.0
============Test set 평가 (lr=0.01)
정확도: 0.958041958041958
재현율: 0.9555555555555556
정밀도: 0.9772727272727273
F1 점수: 0.9662921348314607
```

학습률과 트리 개수는 서로 맞물린다. 학습률을 10분의 1로 줄이면 트리를 대략 10배 늘려야 비슷한 지점까지 간다.

## 보스턴 집값 회귀: GradientBoostingRegressor

```python
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, GridSearchCV

df = pd.read_csv('data/boston_dataset.csv')
X = df.drop(columns="MEDV")#.values
y = df['MEDV']#.values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=1)
```

```python
model = GradientBoostingRegressor(random_state=0)
param_grid = {
    "n_estimators": [350, 400, 450],
    "learning_rate": [0.04, 0.05, 0.06],
    "max_depth": [3],
    "subsample": [0.75, 0.8, 0.85],
    "min_samples_leaf": [1, 2],
}
gs = GridSearchCV(
    estimator=model,
    param_grid=param_grid,
    scoring=['r2', 'neg_mean_squared_error'],
    refit="r2",
    n_jobs=-1,
    cv=4
)
gs.fit(X_train, y_train)
```

```text
GridSearchCV(cv=4, estimator=GradientBoostingRegressor(random_state=0),
             n_jobs=-1,
             param_grid={'learning_rate': [0.04, 0.05, 0.06], 'max_depth': [3],
                         'min_samples_leaf': [1, 2],
                         'n_estimators': [350, 400, 450],
                         'subsample': [0.75, 0.8, 0.85]},
             refit='r2', scoring=['r2', 'neg_mean_squared_error'])
```

> **보충** `subsample`은 트리 하나를 학습할 때 train 데이터 중 일부(여기선 75~85%)만 랜덤하게 쓰는 옵션이다. 배깅처럼 무작위성을 넣어 과대적합을 줄인다. 1보다 작게 주면 **Stochastic Gradient Boosting**이라고 부른다.

```python
gs_pd = pd.DataFrame(gs.cv_results_).sort_values("rank_test_r2")
gs_pd[["rank_test_r2", "mean_test_r2", "mean_test_neg_mean_squared_error"]].head(10)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 10행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>rank_test_r2</th><th>mean_test_r2</th><th>mean_test_neg_mean_squared_error</th></tr></thead><tbody><tr><th class="idx">42</th><td>1</td><td>0.888363</td><td>-8.964459</td></tr><tr><th class="idx">39</th><td>2</td><td>0.888288</td><td>-8.971212</td></tr><tr><th class="idx">24</th><td>3</td><td>0.888046</td><td>-9.010161</td></tr><tr><th class="idx">36</th><td>4</td><td>0.887889</td><td>-9.004795</td></tr><tr><th class="idx">21</th><td>5</td><td>0.887176</td><td>-9.080117</td></tr><tr><th class="idx">52</th><td>6</td><td>0.886268</td><td>-9.08443</td></tr><tr><th class="idx">18</th><td>7</td><td>0.886199</td><td>-9.161218</td></tr><tr><th class="idx">49</th><td>8</td><td>0.886083</td><td>-9.100212</td></tr><tr><th class="idx">46</th><td>9</td><td>0.885768</td><td>-9.126314</td></tr><tr><th class="idx">53</th><td>10</td><td>0.885748</td><td>-9.137203</td></tr></tbody></table></div></div>

```python
gs.best_params_
```

```text
{'learning_rate': 0.06, 'max_depth': 3, 'min_samples_leaf': 1, 'n_estimators': 450, 'subsample': 0.75}
```

```python
gs.best_score_
```

```text
np.float64(0.8883632396455785)
```

```python
y_pred = gs.predict(X_test)
from sklearn.metrics import r2_score, mean_squared_error

r2_score(y_test, y_pred), mean_squared_error(y_test, y_pred)
```

```text
(0.9259128543782991, 7.321839194749736)
```

test R² 0.92대로, 이 시리즈에서 보스턴 데이터에 쓴 모델 중 가장 높다(분할이 달라 엄밀한 비교는 아니다).

## Gradient Boosting 계열 모델들

- [XGBoost](https://xgboost.readthedocs.io/en/stable/)
- [LightGBM](https://lightgbm.readthedocs.io/en/stable/)
- [CatBoost](https://catboost.ai/)

```python
# Gridiebt Boosting를 기반으로 발전시킨 모델들
# Gridiebt Boosting 과대적합의 문제가 많이 나옴 그걸 해결하는 파라미터
# 그리고 속도를 높임
```

Gradient Boosting을 기반으로 과대적합을 막는 규제를 더하고 속도를 높인 모델들이다.

## XGBoost (eXtreme Gradient Boosting)

- Gradient Boost 알고리즘을 개선해 분산 환경에서도 실행할 수 있게 구현한 모델
- 느린 수행 시간을 해결하고, 과대적합을 제어하는 규제를 제공해 성능을 높였다
- 회귀와 분류를 모두 지원한다
- 캐글 경진대회 상위 입상자들이 쓰면서 유명해졌다
- 개발 방법은 두 가지: [Scikit-learn 래퍼](https://xgboost.readthedocs.io/en/latest/python/python_api.html#module-xgboost.sklearn), [파이썬 래퍼](https://xgboost.readthedocs.io/en/latest/python/python_api.html#module-xgboost.training)
- 설치: `pip install xgboost`

> **보충** 노트북에는 "Extra Gradient Boost"라고 적혀 있는데 공식 이름은 **eXtreme** Gradient Boosting이다.

```python
# 2가지 api를 제공함 하나는 사이킷런 스타일의 라이브러리, 다른건 파이썬 자체 라이브러리
# Scikit - learn을 상속받아 만듦 gs, pipline 쓸수있음
```

노트북에서는 설치 셀이 `No module named pip` 에러로 실패했다. 주석에 `!uv pip install xgboost`가 남아 있는 걸 보면 `uv`로 만든 가상환경이었던 것 같다. uv가 만든 가상환경에는 pip이 들어 있지 않아서, 패키지도 `uv pip install`로 설치해야 한다.

```python
import xgboost
xgboost.__version__
```

```text
'3.2.0'
```

```python
# 요새는 light gbm을 많이 사용함
# 속도가 훨씬 빠르다
```

### Scikit-learn 래퍼 XGBoost

- scikit-learn Estimator와 같은 패턴으로 코드를 작성할 수 있다
- GridSearchCV, Pipeline 같은 scikit-learn 도구를 그대로 쓸 수 있다
- `XGBClassifier`: 분류, `XGBRegressor`: 회귀

주요 매개변수

- `learning_rate`: 학습률. 보통 0.01 ~ 0.2
- `n_estimators`: 트리 개수
- 결정 트리 관련 하이퍼파라미터들

```python
from sklearn.datasets import load_breast_cancer

from sklearn.model_selection import train_test_split
X, y = load_breast_cancer(return_X_y=True)

X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=0)
```

노트북에서는 학습률을 극단적으로 작게(0.00001), 트리를 100,000개로 줘 봤다.

```python
from xgboost import XGBClassifier # , XGBRegressor
xgb = XGBClassifier(n_estimators=100000, learning_rate=0.00001, max_depth=1, random_state=0)
xgb.fit(X_train, y_train)
```

```text
XGBClassifier(base_score=None, booster=None, callbacks=None,
              colsample_bylevel=None, colsample_bynode=None,
              colsample_bytree=None, device=None, early_stopping_rounds=None,
              enable_categorical=False, eval_metric=None, feature_types=None,
              feature_weights=None, gamma=None, grow_policy=None,
              importance_type=None, interaction_constraints=None,
              learning_rate=1e-05, max_bin=None, max_cat_threshold=None,
              max_cat_to_onehot=None, max_delta_step=None, max_depth=1,
              max_leaves=None, min_child_weight=None, missing=nan,
              monotone_constraints=None, multi_strategy=None,
              n_estimators=100000, n_jobs=None, num_parallel_tree=None, ...)
```

```python
print_binary_classification_metrics(
    y_train, xgb.predict(X_train), xgb.predict_proba(X_train)[:, 1], "Trainset"
)
```

```text
Trainset
정확도: 0.9483568075117371
재현율: 0.9850187265917603
정밀도: 0.9359430604982206
F1 점수: 0.9598540145985401
Average Precision: 0.9925999200349686
ROC-AUC Score: 0.9914140343438627
```

```python
print_binary_classification_metrics(
    y_test, xgb.predict(X_test), xgb.predict_proba(X_test)[:, 1], "Test set"
)
```

```text
Test set
정확도: 0.9300699300699301
재현율: 0.9888888888888889
정밀도: 0.9081632653061225
F1 점수: 0.9468085106382979
Average Precision: 0.962750539998991
ROC-AUC Score: 0.9627882599580713
```

학습률 × 트리 수가 1 정도라, 위의 GradientBoosting(0.0001 × 10,000)과 비슷하게 아직 덜 학습된 상태다.

```python
pd.Series(xgb.feature_importances_, index=load_breast_cancer().feature_names).sort_values(ascending=False).head(8)
```

```text
worst perimeter         0.228055
worst radius            0.224787
mean concave points     0.203607
worst concave points    0.194842
worst area              0.148710
mean radius             0.000000
concavity error         0.000000
worst symmetry          0.000000
dtype: float32
```

깊이 1짜리 트리는 질문을 하나만 하니, 100,000개를 만들어도 결국 몇 개 feature만 반복해서 쓴다. 중요도가 5개 feature에만 있고 나머지는 0이다.

> **보충** 기본 설정으로 학습하면 이렇다. 학습률 0.3(XGBoost 기본값), 트리 100개, 깊이 6이다.

```python
# 보충: XGBoost 기본 설정
xgb2 = XGBClassifier(random_state=0)
xgb2.fit(X_train, y_train)
print_binary_classification_metrics(y_test, xgb2.predict(X_test), xgb2.predict_proba(X_test)[:, 1], "Test set (기본 설정)")
```

```text
Test set (기본 설정)
정확도: 0.958041958041958
재현율: 0.9666666666666667
정밀도: 0.9666666666666667
F1 점수: 0.9666666666666667
Average Precision: 0.9888112535309234
ROC-AUC Score: 0.9838574423480084
```

## 정리

- 부스팅은 약한 학습기를 **순서대로** 이어, 뒤 모델이 앞 모델의 **오차(잔차)를 학습**한다
- Gradient Boosting: 평균에서 시작해 잔차를 예측하는 얕은 트리를 계속 더한다. 각 트리의 예측에 **learning_rate**를 곱해 조금씩 보정한다
- learning_rate와 n_estimators는 맞물린다. 학습률이 작으면 트리를 많이, 크면 적게. 학습률이 너무 작으면 과소적합, 크면 과대적합
- `subsample`로 데이터 일부만 쓰면 과대적합을 줄일 수 있다
- XGBoost, LightGBM, CatBoost는 Gradient Boosting을 빠르고 규제 가능하게 개선한 모델이고, scikit-learn과 같은 방식으로 쓴다
