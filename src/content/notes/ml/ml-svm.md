---
title: "SVM: 마진과 커널"
description: "서포트 벡터 머신(SVM)의 결정경계와 마진, Hard/Soft Margin과 규제 하이퍼파라미터 C, 커널 트릭과 RBF 커널의 gamma를 정리하고, 유방암 데이터로 C·gamma 변화에 따른 성능과 GridSearchCV로 커널·C·gamma 최적 조합을 찾는 과정을 실행 결과와 함께 다룹니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 9
originalNotebook: "07_SVM.ipynb"
tags: ["Python","scikit-learn","SVM","Kernel"]
date: 2026-05-21
---

> SKN31 머신러닝 과정 노트북 `07_SVM.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- SVM의 목표: 최대 마진을 가진 결정경계
- Support Vector와 margin
- Hard Margin, Soft Margin과 하이퍼파라미터 `C`
- 커널 트릭과 비선형 SVM, 하이퍼파라미터 `gamma`
- C와 gamma 변화에 따른 성능 변화
- GridSearchCV로 커널·C·gamma 찾기

## Support Vector Machine (SVM)

- 딥러닝 이전에 분류에서 뛰어난 성능으로 많이 쓰였던 모델
- **중간 크기**의 데이터셋과 **feature가 많은 복잡한** 데이터셋에서 성능이 좋은 것으로 알려져 있다

```python
# 중간 크기 => deeplearning 보다 적지만 큼
# 복잡한 데이터셋 => 비정형 데이터 처리 유리
# support vector machine 지지백터 머신
# 클래스(그룹)안에서 가장 선에 가까운 데이터(서포트 백터)를 결정경계선과의 마진을 구함
# 서포트 백터는 여러 개 일 수도 있음
```

> **보충** "복잡한 데이터셋"은 비정형 데이터라기보다 **feature 수가 많은 표 데이터**에 가깝다. SVM은 데이터 사이의 거리(커널)로 계산하기 때문에, 샘플 수가 수십만 이상으로 커지면 학습 시간이 급격히 늘어난다. 그래서 "딥러닝보다는 적은 중간 크기"에 강하다.

## 선형(Linear) SVM

```python
# # SVM은 데이터와 결정 경계 사이의 거리를 계산한다.

# 그 거리(마진)를 최대화하는 최적의 경계선을 찾는다.

# 분류할 때는 데이터끼리의 거리를 일일이 재는 게 아니라,

# 학습된 경계선의 어느 방향에 있는가를 보고 빠르게 분류한다.
```

**선 (1)과 (2) 중 어떤 선이 최적의 분류선일까?**

![두 클래스를 나누는 후보 경계선 (1), (2)](/images/ml/fig-svm-margin0.png)

```python
# (2)가 최적의 경계선 => 각 클래스별 데이터 간의 거리가 가장 넓기 때문
```

(2)가 최적이다. 각 클래스에서 경계에 가장 가까운 데이터 사이의 거리가 가장 넓기 때문이다. 넓다는 건 겹치는 부분이 적다는 뜻이라, 새 데이터를 예측할 때 모호함이 줄어 맞을 확률이 높아진다.

### SVM의 목표: support vector 사이의 margin이 가장 넓은 결정경계 찾기

- **Support Vector**: 결정경계를 기준으로 양 클래스에서 경계와 **가장 가까이 있는** 데이터들
- **Margin**: 두 support vector 사이의 너비
- SVM은 **최대 마진**을 만드는 결정경계를 찾는다

> **결정경계(Decision boundary)**: 분류 문제에서 클래스를 구분하는 기준. 분류 모델은 학습할 때 train 데이터로 결정경계를 찾는다.

![최대 마진을 만드는 결정경계와 support vector](/images/ml/fig-svm-margin.png)

수업 중 정리한 두 가지 문제와 해결 방법이다.

```python
# 개념: 각 백터를 점(1차원), 선(2차원), 면(3차원)으로 나눔

# 문제: 분류하는 과정에서 과적합이 날 수 있음
# 해결방안
# : hard margin (오차를 줄이고 완벽하게 분리하는 방법)
# : soft margin (오차와 상관없이 공간을 넓히는게 중요함)
# : 규제 파라미터 => C (default = 1), margin의 거리를 조절함


# 문제2: 분류하는 과정에서 곡선적으로 분류해야하는 과정이 필요함/선형적으로 분리할 수밖에 없음
# 해결방안
# : kernerl svm (선형으로 분리되지 않을 경우, 비선형으로 그림)
# : ㅁㅁㅁ -- ㅇㅇㅇ --- ㅁㅁㅁ (1차원) => 이 경우 ㅁ,ㅇ 분리를 위해 점 2개를 써야 함 but svm은 안됌
# : 2, 3차원으로 변형해서 선형적으로 구분 후 => 다시 원래 차원으로 그려진 선이 비선형적으로 됌
# : 규제파라미터 = gamma
```

첫 줄은 경계의 모양이다. 데이터가 1차원이면 경계는 점, 2차원이면 선, 3차원이면 면이 된다.

## Hard Margin과 Soft Margin

- SVM의 목적은 데이터를 잘 분리하면서 margin을 **최대화**하는 것이다
  - 이때 가장 문제가 되는 게 **이상치(Outlier)** 다. train set의 이상치는 과대적합의 주 원인이 된다
- 이상치를 얼마나 무시할지에 따라 Hard margin과 Soft margin으로 나뉜다

| | Hard Margin | Soft Margin |
|---|---|---|
| 이상치 | 무시하지 않음. 어떤 데이터도 경계를 침범하지 못하게 한다 | 일부 무시. 잘못 분류되는 것을 허용한다 |
| margin | 매우 좁아질 수 있다 | 넓힐 수 있다 |
| 위험 | 선형 분리가 안 되면 **과대적합** | 무시 비율이 너무 크면 **과소적합** |

![C 값에 따른 margin 차이](/images/ml/fig-svm-c.png)

### 하이퍼파라미터 C

- SVM의 **규제 하이퍼파라미터**. 잘못 분류되는 것을 허용하는 정도를 정한다. 기본값 1
- **값이 클수록** 오분류를 덜 허용 → **규제가 약해진다**(Hard margin 쪽). 너무 크면 과대적합
- **값이 작을수록** 오분류를 더 허용 → **규제가 강해진다**(Soft margin 쪽). 너무 작으면 과소적합
- **과대적합이면 C를 작게, 과소적합이면 크게** 조정한다

> 규제를 강하게 한다 == 모델의 복잡도를 낮춘다 → 과대적합일 때
> 규제를 약하게 한다 == 모델의 복잡도를 높인다 → 과소적합일 때

## Kernel SVM (비선형 SVM)

선형으로 분리가 안 되는 데이터는 어떻게 할까?

![1차원에서 선형으로 나눌 수 없는 데이터](/images/ml/fig-kernel-svm1.png)

다항식 특성을 추가해 차원을 늘리면 선형으로 분리할 수 있게 된다. 아래는 $x_2 = x_1^2$ 항을 추가해 2차원으로 바꾼 모습이다.

![x² 축을 추가하면 직선 하나로 나뉜다](/images/ml/fig-kernel-svm2.png)

그 직선을 원래 공간으로 되돌리면, 원래 차원에서는 점 두 개로 나누는 비선형 경계가 된다.

![원래 공간으로 되돌린 경계](/images/ml/fig-kernel-svm3.png)

메모에 적은 `ㅁㅁㅁ -- ㅇㅇㅇ --- ㅁㅁㅁ`이 바로 이 그림이다.

참고 영상: [youtube.com/watch?v=3liCbRZPrZA](https://www.youtube.com/watch?v=3liCbRZPrZA)

### 커널 트릭(Kernel trick)

- 비선형 데이터를 선형으로 분리하려면 차원을 바꿔야 하는데, 이때 쓰는 함수를 **커널(Kernel)**, 차원을 바꾸는 것을 **커널 트릭**이라고 한다
- 대표적인 커널: **Radial kernel(RBF)**, Polynomial kernel, Sigmoid kernel

```python
# svc => radial keranl
# 하이퍼파라미터 gamma
```

> **보충** "트릭"인 이유는 실제로 고차원 좌표를 계산하지 않기 때문이다. SVM 계산에는 데이터 사이의 **내적**만 필요한데, 커널 함수는 고차원에서의 내적값을 원래 공간에서 바로 계산해 준다. RBF 커널은 이론상 **무한 차원**으로 보낸 것과 같은 효과를 내는데도 계산량은 그대로다.

### 비선형 SVM의 하이퍼파라미터

**C**: Soft / Hard margin 정도

**gamma**: 결정경계를 얼마나 **구불구불하게** 만들지 정한다. 선형 SVM에서는 영향이 없다.

- **개별 데이터 포인트 하나가 결정경계에 얼마나 영향을 미치는지**, 즉 각 포인트의 **영향 반경**을 정한다
- 데이터 포인트가 전구라면 gamma는 그 전구가 비추는 빛의 범위다

| | gamma가 크면 | gamma가 작으면 |
|---|---|---|
| 영향 반경 | 좁다. 자기 주변에만 영향 | 넓다. 멀리까지 영향 |
| 결정경계 | 데이터 하나하나를 따라다닌다 | 부드럽고 단순하다 |
| 위험 | 이상치에 민감 → **과대적합** | 패턴을 못 잡음 → **과소적합** |
| 튜닝 | 과대적합이면 **작게** | 과소적합이면 **크게** |

![gamma 값에 따른 결정경계 형태](/images/ml/fig-svm-gamma.png)

## SVM 모델링

데이터 전처리

- 연속형(수치형): **Feature scaling**
- 범주형: **One Hot Encoding**

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=1)
```

```python
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

### C 변화에 따른 성능 (선형 SVM)

```python
# SVR: 회귀, SVC: 분류
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score

# Linear SVM - 규제 hyper parameter: C
## 작을 수록 규제 강도가 큼.
C_list = [0.001, 0.01, 0.1, 1, 10, 100] # 0 초과의 값을 지정. 실수. default: 1
train_acc_list = []
test_acc_list = []

for C in C_list:
    svm = SVC(
        kernel="linear", # 커널 함수 지정. 선형SVM: linear, 비선형SVM: rbf(기본), poly, sigmoid
        C=C,             # soft - hard margin 설정. (작을수록 강한 규제)
        random_state=0
    )
    # 학습
    svm.fit(X_train_scaled, y_train)
    # 검증
    ## 추론
    pred_train = svm.predict(X_train_scaled)
    pred_test = svm.predict(X_test_scaled)
    ## 평가
    train_acc_list.append(accuracy_score(y_train, pred_train))
    test_acc_list.append(accuracy_score(y_test, pred_test))
```

C 후보가 10배씩 커지니 `log10`을 씌워 x축 간격을 고르게 했다.

```python
import pandas as pd
import numpy as np
df = pd.DataFrame({
    "C":np.log10(C_list),
    # "C": C_list,
    "Train": train_acc_list,
    "Test": test_acc_list
})
df.set_index("C")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>C</th><th>Train</th><th>Test</th></tr></thead><tbody><tr><th class="idx">-3.0</th><td>0.941315</td><td>0.93007</td></tr><tr><th class="idx">-2.0</th><td>0.974178</td><td>0.972028</td></tr><tr><th class="idx">-1.0</th><td>0.988263</td><td>0.972028</td></tr><tr><th class="idx">0.0</th><td>0.99061</td><td>0.965035</td></tr><tr><th class="idx">1.0</th><td>0.995305</td><td>0.958042</td></tr><tr><th class="idx">2.0</th><td>0.995305</td><td>0.958042</td></tr></tbody></table></div></div>

```python
# 0.01이 가장 좋은 하이퍼파라미터 설정값
```

```python
df.set_index("C").plot;
# log 10 0.01을 몇번 제곱했는지
# 그래프의 변화를 똑같은 간격의 x값으로 보기 위함
```

> **보충** `plot` 뒤에 괄호가 없어서 그래프가 그려지지 않고 아무것도 출력되지 않았다. 메소드를 **호출**하지 않고 이름만 쓴 상태다. 괄호를 붙이면 이렇다. 메모의 "0.01을 몇 번 제곱했는지"는 "10을 몇 번 곱했는지"(지수)다. log10(0.01) = -2.

```python
df.set_index("C").plot();
```

![그래프 출력](/images/ml/ml-svm-1.png)

C가 커질수록 train은 계속 오르고 test는 0.01~0.1에서 가장 높다가 내려간다. C가 클수록 규제가 약해져 과대적합 쪽으로 가는 모습이다.

### gamma 변화에 따른 성능 (RBF SVM)

```python
###############################################################################
# 비선형 SVM. Hyper Parameter - C: soft/hard margin 규제, gamma (기본: 1)
#
# gamma  변경에 따른 성능 변화.
###############################################################################
gamma_list = [0.001, 0.01, 0.1, 1, 5, 10, 100]
train_acc_list = []
test_acc_list = []
for gamma in gamma_list:
    svm = SVC(kernel="rbf", C=1, gamma=gamma)  # kernel기본값: rbf
    svm.fit(X_train_scaled, y_train)
    train_acc_list.append(accuracy_score(y_train, svm.predict(X_train_scaled)))
    test_acc_list.append(accuracy_score(y_test, svm.predict(X_test_scaled)))
```

> **보충** gamma 기본값은 1이 아니라 `'scale'`이다. `1 / (feature 수 × X의 분산)`으로 계산하는데, 30개 feature를 표준화한 이 데이터라면 약 1/30 ≈ 0.033이 된다.

```python
df = pd.DataFrame({
    "gamma":np.log10(gamma_list),
    "Train":train_acc_list,
    "Test":test_acc_list
})
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 7행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>gamma</th><th>Train</th><th>Test</th></tr></thead><tbody><tr><th class="idx">0</th><td>-3.0</td><td>0.950704</td><td>0.958042</td></tr><tr><th class="idx">1</th><td>-2.0</td><td>0.976526</td><td>0.965035</td></tr><tr><th class="idx">2</th><td>-1.0</td><td>0.995305</td><td>0.937063</td></tr><tr><th class="idx">3</th><td>0.0</td><td>1.0</td><td>0.629371</td></tr><tr><th class="idx">4</th><td>0.69897</td><td>1.0</td><td>0.629371</td></tr><tr><th class="idx">5</th><td>1.0</td><td>1.0</td><td>0.629371</td></tr><tr><th class="idx">6</th><td>2.0</td><td>1.0</td><td>0.629371</td></tr></tbody></table></div></div>

```python
df.set_index("gamma").plot(grid=True);
```

![그래프 출력](/images/ml/ml-svm-2.png)

gamma가 1 이상이면 train은 1.0인데 test는 0.63으로 떨어진다. 각 포인트의 영향 반경이 너무 좁아져서, train 데이터는 하나하나 외웠지만 처음 보는 데이터 근처에는 아무 영향도 미치지 못한 결과다. 0.63은 test set의 다수 클래스 비율이라, 사실상 전부 한 클래스로 찍은 것과 같다. 극단적인 과대적합이다.

### ROC AUC score, AP score

```python
from sklearn.metrics import roc_auc_score, average_precision_score

# probability=True 설정해야 predict_proba() 사용가능.
svm = SVC(probability=True) # 0 or 1 확률
svm.fit(X_train_scaled, y_train)
pos_proba = svm.predict_proba(X_train_scaled)[:, 1]
print(roc_auc_score(y_train, pos_proba))
print(average_precision_score(y_train, pos_proba))
```

```text
0.997880008479966
0.9985299004450608
```

> **보충** 이 점수는 **train set**으로 계산한 것이라 실제 성능보다 좋게 나온다. 모델 성능을 보려면 test set으로 계산해야 한다.

```python
# 보충: test set으로 계산
pos_proba_test = svm.predict_proba(X_test_scaled)[:, 1]
print(roc_auc_score(y_test, pos_proba_test))
print(average_precision_score(y_test, pos_proba_test))
```

```text
0.9935010482180293
0.996076349627409
```

## GridSearch로 최적의 조합 찾기

- Linear SVC: `C`
- RBF SVC: `C`, `gamma`

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
X, y = load_breast_cancer(return_X_y=True)

X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=1)
```

```python
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GridSearchCV

# SVM : Feature scaling/One Hot Encoding 전처리.
pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("svm", SVC(random_state=0, probability=True))
])

params = {
    "svm__kernel": ["linear", "rbf",  "poly", "sigmoid"],
    "svm__C": [0.01, 0.1, 1, 10, 100], # 꼭 이 단위로 하는 건 아닌데, 따라하면 좋을 듯
    "svm__gamma": [0.01, 0.1, 1, 10, 100],
}

gs = GridSearchCV(
    pipeline,
    params,
    scoring=["accuracy", "roc_auc", "average_precision"],
    refit="accuracy",  # 평가지표가 여러개 일때, 리핏 필수
    cv=4,
    n_jobs=-1
)
gs.fit(X_train, y_train)
```

```text
GridSearchCV(cv=4,
             estimator=Pipeline(steps=[('scaler', StandardScaler()),
                                       ('svm',
                                        SVC(probability=True,
                                            random_state=0))]),
             n_jobs=-1,
             param_grid={'svm__C': [0.01, 0.1, 1, 10, 100],
                         'svm__gamma': [0.01, 0.1, 1, 10, 100],
                         'svm__kernel': ['linear', 'rbf', 'poly', 'sigmoid']},
             refit='accuracy',
             scoring=['accuracy', 'roc_auc', 'average_precision'])
```

4 × 5 × 5 = 100개 조합이다.

```python
gs.best_score_
```

```text
np.float64(0.9836007758772702)
```

```python
gs.best_params_
```

```text
{'svm__C': 10, 'svm__gamma': 0.01, 'svm__kernel': 'rbf'}
```

```python
# LINEAR 일때, 감마값이 의미없음
```

```python
gs.best_estimator_
```

```text
Pipeline(steps=[('scaler', StandardScaler()),
                ('svm',
                 SVC(C=10, gamma=0.01, probability=True, random_state=0))])
```

```python
import pandas as pd
pd.options.display.max_columns = None # 컬럼값 맥스로
```

```python
pd.DataFrame(gs.cv_results_).sort_values("rank_test_accuracy")[
    ["param_svm__kernel", "param_svm__C", "param_svm__gamma",
     "mean_test_accuracy", "mean_test_roc_auc", "mean_test_average_precision"]
].head(10)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 10행 × 6열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>param_svm__kernel</th><th>param_svm__C</th><th>param_svm__gamma</th><th>mean_test_accuracy</th><th>mean_test_roc_auc</th><th>mean_test_average_precision</th></tr></thead><tbody><tr><th class="idx">61</th><td>rbf</td><td>10.0</td><td>0.01</td><td>0.983601</td><td>0.997195</td><td>0.998062</td></tr><tr><th class="idx">81</th><td>rbf</td><td>100.0</td><td>0.01</td><td>0.974189</td><td>0.995047</td><td>0.996342</td></tr><tr><th class="idx">40</th><td>linear</td><td>1.0</td><td>0.01</td><td>0.971852</td><td>0.994656</td><td>0.996485</td></tr><tr><th class="idx">56</th><td>linear</td><td>1.0</td><td>100.0</td><td>0.971852</td><td>0.994656</td><td>0.996485</td></tr><tr><th class="idx">44</th><td>linear</td><td>1.0</td><td>0.1</td><td>0.971852</td><td>0.994656</td><td>0.996485</td></tr><tr><th class="idx">52</th><td>linear</td><td>1.0</td><td>10.0</td><td>0.971852</td><td>0.994656</td><td>0.996485</td></tr><tr><th class="idx">48</th><td>linear</td><td>1.0</td><td>1.0</td><td>0.971852</td><td>0.994656</td><td>0.996485</td></tr><tr><th class="idx">32</th><td>linear</td><td>0.1</td><td>10.0</td><td>0.971808</td><td>0.996327</td><td>0.997618</td></tr><tr><th class="idx">20</th><td>linear</td><td>0.1</td><td>0.01</td><td>0.971808</td><td>0.996327</td><td>0.997618</td></tr><tr><th class="idx">36</th><td>linear</td><td>0.1</td><td>100.0</td><td>0.971808</td><td>0.996327</td><td>0.997618</td></tr></tbody></table></div></div>

> **보충** 메모대로 linear 커널은 gamma를 쓰지 않기 때문에, linear 조합은 gamma만 다른 5개가 완전히 같은 점수로 여러 번 나온다. 커널마다 쓰는 하이퍼파라미터가 다를 때는 `param_grid`를 **딕셔너리의 리스트**로 나눠 주면 쓸데없는 조합을 줄일 수 있다.

```python
# 보충: 커널별로 다른 후보 지정
params2 = [
    {"svm__kernel": ["linear"], "svm__C": [0.01, 0.1, 1, 10, 100]},
    {"svm__kernel": ["rbf"], "svm__C": [0.01, 0.1, 1, 10, 100], "svm__gamma": [0.01, 0.1, 1, 10, 100]},
]
gs2 = GridSearchCV(pipeline, params2, scoring="accuracy", cv=4, n_jobs=-1)
gs2.fit(X_train, y_train)
print(len(gs2.cv_results_["params"]), "개 조합")
print(gs2.best_params_, gs2.best_score_)
```

```text
30 개 조합
{'svm__C': 10, 'svm__gamma': 0.01, 'svm__kernel': 'rbf'} 0.9836007758772702
```

30개 조합만으로 같은 결과를 찾았다. 마지막으로 test set 평가다.

```python
from metrics import print_binary_classification_metrics
best = gs.best_estimator_
print_binary_classification_metrics(y_test, best.predict(X_test), best.predict_proba(X_test)[:, 1], title="Best SVM Test set")
```

```text
Best SVM Test set
정확도: 0.972027972027972
재현율: 0.9888888888888889
정밀도: 0.967391304347826
F1 점수: 0.978021978021978
Average Precision: 0.9980094941815976
ROC-AUC Score: 0.9966457023060797
```

## 정리

- SVM은 클래스 사이 **margin이 가장 넓은** 결정경계를 찾는다. 경계에 가장 가까운 점들이 support vector다
- **C**: 클수록 오분류를 덜 허용(규제 약함, 과대적합 위험), 작을수록 더 허용(규제 강함)
- **커널 트릭**으로 차원을 높인 효과를 내서 비선형 경계를 만든다. 기본 커널은 RBF
- **gamma**: 클수록 각 포인트의 영향 반경이 좁아져 경계가 구불구불해진다(과대적합 위험)
- 거리 기반이라 **스케일링이 필수**다. 스케일링 여부로 정확도가 0.6대와 0.9대로 갈렸던 앞 글의 예가 그 이유다
- `predict_proba()`가 필요하면 `probability=True`를 준다
