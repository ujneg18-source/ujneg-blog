---
title: "과적합과 일반화: 그리드 서치와 파이프라인"
description: "일반화·과대적합·과소적합의 개념과 규제 하이퍼파라미터, 결정 트리 시각화로 보는 과적합의 원인, GridSearchCV·RandomizedSearchCV로 하이퍼파라미터 튜닝 자동화, Pipeline·make_pipeline·ColumnTransformer로 전처리와 모델을 하나로 묶는 방법까지 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 8
originalNotebook: "06_과적합_일반화_그리드서치_파이프라인.ipynb"
tags: ["Python","scikit-learn","Overfitting","GridSearchCV","Pipeline"]
date: 2026-05-20
---

> SKN31 머신러닝 과정 노트북 `06_과적합_일반화_그리드서치_파이프라인.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 일반화, 과대적합(Overfitting), 과소적합(Underfitting)
- 규제 하이퍼파라미터와 모델 복잡도
- 결정 트리 시각화로 과적합 원인 확인하기
- `GridSearchCV`, `RandomizedSearchCV`로 하이퍼파라미터 튜닝 자동화
- `Pipeline`, `make_pipeline`으로 전처리와 모델 묶기
- `ColumnTransformer`로 컬럼별로 다른 전처리 적용하기

노트북 첫 셀의 한 줄 요약이다.

```python
# 그리드 서치 => 최적의 파라미터
# 파이프라인 => 전처리 + 검증 + 평가를 한꺼번에 연결
```

## 일반화 모델과 과적합 모델

### 일반화(Generalization)

- 모델이 **새로운 데이터(테스트 데이터)에 대해서도 높은 정확도로 예측**하면 일반화되었다고 한다
- 학습한 샘플(train)에만 국한되지 않고 **그 데이터 전체의 일반적인 특성**을 잘 학습한 상태다
- train 성능과 test 성능의 **차이가 거의 없고**, test에서도 **우수한 성능**을 보이면 잘 일반화된 모델이다

수업에서 초등학생 예시로 이해한 내용을 길게 적어 뒀다.

```python
# 일반화 모델 : 우수한 모델
# 예시) 일반적인 특성(정상범위 값=데이터)을 잘 학습함
# 예시) 초등학생인지 아닌지 -> 초등학교, 만화, 놀이, 포켓몬 등의 일반적인 특성 (90%이상이 가지는 특성)(10%는 학습을 하지 않음)
# "예외적 특성은 지나치게 중요하게 여기지 않는다"

# 과적합 모델 : 복잡한 모델, 너무 단순한 모델 (복잡도가 높거나 낮음)
# 예시) 과대적합 => 초등학생 -> 나머지 10%까지 학습한 경우 (영재)
# 예시) 과소적합 => 초등학생 -> 90%까지 학습하지 못하고 일부만 학습한 경우  (초등학교)

# 과대적합의 문제 => 일반화된 특성의 학습이 하락함 -> 정상범주 외에 것들이 일반화되기 때문
# 과소적합의 문제 => 초등학생 뭐 좋아해? -모름

# 평가할때 어떤 모델인지 평가해야 함

# 트레인셋, 벨리데이션셋을 구분 짓는 이유


# 일반화 모델 = 트레인셋(성능good) == 벨리데이션셋(성능good) (차이가 크지 않음)

# 과소적합 모델 = 트레인셋(성능bad) == 벨리데이션셋(성능bad) (차이가 크지 않음)

# 과대적합 모델 = 트레인셋(성능good) =/ 벨리데이션셋(성능bad) (차이가 큼)
# 새로운 데이터에 대한 예측이 낮아짐
# 새로운 데이터는 일반화적인 데이터인 확률이 높기 때문임

# 과대적합 => 트레인셋의 성능을 낮춰야 함
# 과소적합 => 트레인셋의 성능을 높여야 함


# 디시젼트리
# x->y를 보고 y값이 나오는 일반적인 질문을 만듦 ()

# 단, 그 질문에 통하지 않는 이상값이 존재함

# 그 이상치에 맞는 새로운 질문을 만듦 => 트레인셋은 계속해서 질문생성 가능

# 그러면 일반적인 대상들이 안맞게 됌
```

"초등학생이 좋아하는 것"을 배우는데 **소수의 영재 이야기까지 다 외우면** 과대적합, **초등학교라는 단어 하나만 알면** 과소적합이다. 메모 아래쪽 표가 핵심이다.

| | train 성능 | validation 성능 | 차이 |
|---|---|---|---|
| 일반화 | 좋음 | 좋음 | 작음 |
| 과소적합 | 나쁨 | 나쁨 | 작음 |
| 과대적합 | 좋음 | 나쁨 | **큼** |

> **보충** "과대적합이면 train 성능을 낮춰야 한다"는 결과를 보고 한 말이다. 목표는 train 점수를 일부러 떨어뜨리는 게 아니라 **validation 점수를 올리는 것**이고, 모델을 단순하게 만들면 그 과정에서 train 점수가 같이 내려간다.

### Overfitting (과대적합)

- 모델이 **훈련 데이터에 지나치게 맞춰져** 학습된 상태. 훈련 데이터에서는 성능이 높지만 새 데이터에서는 크게 낮다
  - 훈련 데이터의 **노이즈나 이상치 같은 일반적이지 않은 패턴까지 학습**해서, 정작 일반적인 패턴을 놓친다
- 데이터 양에 비해 **너무 복잡한 모델**(파라미터가 너무 많은 모델)을 쓰거나, feature가 너무 많을 때 생긴다
- **train 성능이 validation 성능보다 많이 좋으면** 과대적합을 의심한다
- 과대적합 모델을 "**복잡도가 높다**"고 말한다

### Underfitting (과소적합)

- 모델이 **훈련 데이터조차 제대로 학습하지 못한** 상태
- 데이터에 비해 **너무 단순한 모델**을 쓰거나 **feature가 부족**할 때 생긴다
- **train, validation 모두 성능이 낮으면** 과소적합을 의심한다
- 과소적합 모델을 "**복잡도가 낮다**"고 말한다

![회귀와 분류에서의 과소적합, 적합, 과대적합](/images/ml/fig-under-over-fitting.png)

### 원인과 해결

**과대적합**: 데이터 양에 비해 모델이 너무 복잡하다.

- 데이터 양을 늘린다. 시간과 돈이 들어 현실적으로 어렵다
- 모델을 더 단순하게 만든다. 복잡도가 낮은 모델로 바꾸거나, **규제 하이퍼파라미터**를 조절한다

```python
# 모델을 단순하게 만듦
# 예시) 딥러닝 모델 사용에서 -> 머신러닝으로 대체 (모델변경 2순위)
# 예시) 하이퍼 파라미터를 조절함(1순위) max depth가 낮을 수록 결정트리 모델은 단순해짐
```

**과소적합**: 데이터 양에 비해 모델이 너무 단순하다.

- 더 복잡한 모델을 쓴다
- 규제 하이퍼파라미터를 조절한다

```python
# 모델을 복잡하게 만듦
# 예시) 머신러닝 모델 사용에서 -> 딥러닝으로 대체 (모델변경 2순위)
# 예시) 하이퍼 파라미터를 조절함(1순위) max depth가 낮을 수록 결정트리 모델은 단순해짐
```

> **보충** 과소적합 쪽 마지막 줄은 위 셀을 복사해 온 것 같다. 과소적합이면 모델을 복잡하게 만들어야 하니 `max_depth`를 **높인다**.

### 모델 복잡도에 따른 성능 변화

![모델 복잡도가 높아질수록 train 오차는 계속 줄고 test 오차는 줄다가 다시 커진다](/images/ml/fig-error-complexity.png)

*출처: [vitalflux.com](https://vitalflux.com/overfitting-underfitting-concepts-interview-questions/)*

복잡도가 올라가면 train 오차는 계속 내려간다. test 오차는 내려가다가 어느 지점부터 다시 올라간다. 그 바닥(Best Fit)을 찾는 게 튜닝이다.

## 규제 하이퍼파라미터

- 모델의 복잡도를 조절하는 하이퍼파라미터. 과대적합이나 과소적합이 났을 때 조정해서 모델이 일반화되도록 돕는다
- 모든 머신러닝 모델이 가지고 있다

| | 의미 | 언제 |
|---|---|---|
| **규제를 강하게** | 모델의 복잡도를 **낮춘다** | 과대적합 |
| **규제를 약하게** | 모델의 복잡도를 **높인다** | 과소적합 |

```python
# 모델의 복잡도 높음 => 데이터 간에 편차 多, 개성
# 규제를 강하게 하면 복잡도가 내려감
```

> **하이퍼파라미터**: 모델 생성 시 사람이 직접 지정하는 값. **하이퍼파라미터 튜닝**: 성능을 가장 높이는 하이퍼파라미터를 찾는 작업. **파라미터**: 모델이 데이터 학습으로 직접 찾는 값.

## DecisionTree 시각화로 과적합 원인 확인

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split

data = load_breast_cancer()
X, y = data.data, data.target

# test size 생략 0.25
X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=0)
```

학습과 평가를 함수로 만들어 둔다.

```python
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

def tree_modeling(X, y, max_depth=None):
    """X, y 를 받아서 DecisionTree를 학습시키는 함수
    Parameter
        X: ndarray - features
        y: ndarray - label
        max_depth: int - DecisionTree의 규제하이퍼 파라미터.
    Return
        DecisionTreeClassifier: 학습한 D.Tree 모델 객체.
    """
    tree = DecisionTreeClassifier(max_depth=max_depth, random_state=0)
    tree.fit(X, y)
    return tree

def tree_accuracy(X, y, model, title):
    pred = model.predict(X)
    acc = accuracy_score(y, pred)
    print(f"{title}: {acc}")
```

`max_depth`를 1, 2, 3, 5로 바꿔 본다.

```python
tree1 = tree_modeling(X_train, y_train, 1)
print("max depth: 1")
tree_accuracy(X_train, y_train, tree1, "Train set")
tree_accuracy(X_test, y_test, tree1, "Test set")
```

```text
max depth: 1
Train set: 0.9295774647887324
Test set: 0.8881118881118881
```

```python
tree2 = tree_modeling(X_train, y_train, 2)
print("max depth 2")
tree_accuracy(X_train, y_train, tree2, "Trainset")
tree_accuracy(X_test, y_test, tree2, "Testset")
```

```text
max depth 2
Trainset: 0.931924882629108
Testset: 0.8881118881118881
```

```python
tree3 = tree_modeling(X_train, y_train, 3)
print("max depth 3")
tree_accuracy(X_train, y_train, tree3, "Trainset")
tree_accuracy(X_test, y_test, tree3, "Testset")
```

```text
max depth 3
Trainset: 0.9765258215962441
Testset: 0.916083916083916
```

```python
tree5 = tree_modeling(X_train, y_train, 5)
print("max depth 5")
tree_accuracy(X_train, y_train, tree5, "Trainset")
tree_accuracy(X_test, y_test, tree5, "Testset")
```

```text
max depth 5
Trainset: 1.0
Testset: 0.9020979020979021
```

깊이 5에서 train은 1.0이 됐는데 test는 깊이 3보다 오히려 떨어졌다. 트리 구조를 그려서 이유를 본다.

### 트리 구조 시각화: graphviz

- [Graphviz](https://graphviz.org/) 툴 설치
- 파이썬 라이브러리 설치: `pip install graphviz`

```python
from sklearn.tree import export_graphviz
from graphviz import Source

# src에 그래프비즈의 코드를 만들어준다
src = export_graphviz(
    tree5,                               # 시각화할 DecisionTree 모델.
     feature_names=data['feature_names'],   # Feature들의 이름을 지정.
     class_names=['악성', '양성'],          # 각 클래스들(0, 1)의 클래스 이름(악성, 양성)을 지정. #타겟변수의 이름을 지정해줌 *(정답레이블 들)
     filled=True,                           # 다수 클래스의 색을 box를 배경색으로 채운다.
     rounded=True,                          # box모양(모서리 둥글게.)
 )
graph = Source(src)
graph

# worst perimeter <= 106.1  = Question (True or Falase)
# box = 노드

#                  < 노드의 상태>
#
# x[22] <= 106.1                           #[22] 피쳐(컬럼) 네임
# gini = 0.468                             # 지니계수: 불순도율을 계산한 값 = > 각 클래스별 데이터가 얼마나 섞여있는지  ( 0 ~ 0.5)
# samples = 426                            # 견본 수 (데이터 갯수)
# value = [159, 267]                       # y 0인 친구가 159개, 1인 친구가 267 = 426개 (0:159, 1:267)


# gini 값이 0 => leaf_node (가장 낮은 노드)
# gini 값이 0이되면 성능이 너무 높아짐
# max_depth = n    :  노드가 root node에서 n씩 내려감
# max_depth 외에도 unit단위로 조절하는 파라미터도 존재 but max_depth로 일괄처리해도 성능이 유지됌
```

![max_depth=5 결정 트리](/images/ml/ml-gridsearch-pipeline-tree5.png)

노드 하나를 읽는 법은 이렇다.

```text
worst perimeter <= 106.1   # 현재 데이터셋(box안의 데이터들)을 분류하기 위한 질문
-----------------------------------------------------------
### 현재 데이터셋의 상태
gini = 0.468               # 지니계수: 불순도율을 계산한값.(각 클래스의 값들이 얼마나 섞여 있는지)
sample = 426               # 데이터 개수
value = [159, 267]         # 클래스별 데이터 개수. 0: 159, 1: 267
class = 양성               # 다수 클래스의 클래스이름.
```

노드 안의 클래스 비율을 직접 계산해 봤다.

```python
import numpy as np
np.array([11, 248])/259
```

```text
array([0.04247104, 0.95752896])
```

```python
np.array([1, 239])/240
```

```text
array([0.00416667, 0.99583333])
```

> **보충** 지니 불순도는 $1 - \sum p_i^2$로 계산한다. 한 클래스만 있으면 0, 두 클래스가 반반이면 0.5다(이진 분류 기준). 트리는 지니가 가장 많이 줄어드는 질문을 고른다. 메모의 "gini가 0이 되면 성능이 너무 높아짐"은, 깊은 트리가 train 데이터를 **한두 개짜리 노드까지 쪼개** 지니를 0으로 만들어 버린다는 뜻이다. 위 그림 아래쪽에 `samples = 1`, `samples = 2` 같은 노드들이 그 흔적이다. 이 노드들이 이상치 하나를 맞히려고 만든 질문이고, train 정확도 1.0과 test 성능 하락의 원인이다.

깊이 2짜리 트리는 훨씬 단순하다.

```python
src = export_graphviz(
    tree2,
    feature_names=data['feature_names'],
    class_names=['악성', '양성'],
    filled=True,
    rounded=True,
)
graph = Source(src)
graph
```

![max_depth=2 결정 트리](/images/ml/ml-gridsearch-pipeline-tree2.png)

```python
# leaf_nodes 더 이상 내려가지 않는 노드
```

> **보충** 그림은 한글 클래스 이름이 깨지지 않도록 `fontname`에 한글 폰트를 지정해서 따로 저장했다.

### Decision Tree의 규제 파라미터

- 질문 단계가 내려갈수록 모델이 복잡해지고, 복잡해지면 과대적합이 생긴다
- 규제 하이퍼파라미터는 **노드 생성을 중간에 멈추게** 하는 값들이다

| 하이퍼파라미터 | 뜻 | 규제를 강하게 하려면 |
|---|---|---|
| `max_depth` | 트리의 최대 깊이 | 작게 |
| `max_leaf_nodes` | 리프 노드 최대 개수 | 작게 |
| `min_samples_leaf` | 리프 노드가 되기 위한 최소 샘플 수 | 크게 |

## 최적의 max_depth 찾기

```python
# max_depth 는 작을 수록 규제를 강하게 한다.
## "규제를 강하게 한다." 의미: 모델의 복잡도를 낮추는 방향으로 학습시키는 것.

# max_depth 후보군
max_depth_list = range(1, 7)

# 검증 결과를 저장할 리스트
train_acc_list, test_acc_list = [], []

# max_depth 후보군들을 넣어 DecisionTree 모델을 학습/검증하여 최적의 max_depth를 찾는다.
for max_depth in max_depth_list:
    model = DecisionTreeClassifier(max_depth=max_depth, random_state=0)
    model.fit(X_train, y_train)

    pred_train = model.predict(X_train)
    pred_test = model.predict(X_test)

    train_acc_list.append(accuracy_score(y_train, pred_train))
    test_acc_list.append(accuracy_score(y_test, pred_test))
```

```python
import pandas as pd

result_df = pd.DataFrame({
    "max depth": max_depth_list,
    "train acc": train_acc_list,
    "test acc": test_acc_list
})
result_df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>max depth</th><th>train acc</th><th>test acc</th></tr></thead><tbody><tr><th class="idx">0</th><td>1</td><td>0.929577</td><td>0.888112</td></tr><tr><th class="idx">1</th><td>2</td><td>0.931925</td><td>0.888112</td></tr><tr><th class="idx">2</th><td>3</td><td>0.976526</td><td>0.916084</td></tr><tr><th class="idx">3</th><td>4</td><td>0.985915</td><td>0.909091</td></tr><tr><th class="idx">4</th><td>5</td><td>1.0</td><td>0.902098</td></tr><tr><th class="idx">5</th><td>6</td><td>1.0</td><td>0.902098</td></tr></tbody></table></div></div>

```python
result_df.set_index('max depth').plot();
```

![그래프 출력](/images/ml/ml-gridsearch-pipeline-1.png)

깊이 1~2는 train도 낮은 과소적합 쪽, 5 이상은 train 1.0인 과대적합 쪽이다. 깊이 3에서 test가 가장 높다. 위 복잡도 그래프와 같은 모양이다.

> **보충** 여기서는 수업 흐름대로 test set으로 비교했지만, 앞 글에서 정리했듯 하이퍼파라미터는 validation(또는 교차 검증)으로 골라야 한다. 아래 GridSearchCV가 그 일을 해 준다.

## Grid Search로 하이퍼파라미터 튜닝 자동화

모델 성능을 가장 높이는 하이퍼파라미터를 찾는 자동화 방법이다. 후보들을 하나씩 넣어 보며 가장 좋은 값을 찾는다.

1. **Grid Search**: `GridSearchCV`. 지정한 하이퍼파라미터의 **모든 조합**에 대해 교차 검증해 가장 좋은 조합을 찾는다. 조합이 많아지면 시간이 너무 오래 걸린다
2. **Random Search**: `RandomizedSearchCV`. 사용법은 같고, 모든 조합 대신 **임의로 몇 개만** 테스트한다

```python
# 너무 많은 시간이 걸릴 경우 랜덤서치 방법을 사용함 예를 들어 조합수가 10만개가 넘어갈 경우 60개만 서치함
```

```python
# ex) DT => max-depth(5개), max-I-n(4개), min-s-l(3개) 한 모델에 성능에 영향을 주는 다양한 하이퍼 파라미터가 존재함
# 각 값을 조회하는 모든 경우의 수의 객체를 자동으로 생성해줌
# 총 60개 중 가장 성능 높은 조합을 찾아냄
# 각 하이퍼 파라미터를 표처럼(greed)해서 성능 좋은 것을 찾아내서 gread search임
```

```python
# Grid search => 기존 max depth / for in문을 자동화한 scikitlearn class, 메소드
```

후보를 **격자(grid)** 처럼 펼쳐 모든 칸을 다 해 본다는 뜻이다. 메모의 `max-I-n`은 `max_leaf_nodes`, `min-s-l`은 `min_samples_leaf`다. 5 × 4 × 3 = 60개 조합이다.

### GridSearchCV

**생성자 매개변수**

| 매개변수 | 뜻 |
|---|---|
| `estimator` | 모델 객체 |
| `param_grid` | 하이퍼파라미터 후보. `{'파라미터명': [후보 list]}` 딕셔너리 |
| `scoring` | 평가 지표. 생략하면 분류는 accuracy, 회귀는 R². 여러 개면 리스트 |
| `refit` | best 파라미터를 정할 때 쓸 지표. scoring이 여러 개면 반드시 지정 |
| `cv` | 교차 검증 fold 수 |
| `n_jobs` | 사용할 CPU 코어 수. `-1`이면 전부 |

```python
# estimator - 알고리즘 모델 객체(변수) 지정
# paran_grid => list로
# scoring => 평가지표가 여러개일 경우 list / cross vall(상세 지표이기 때문에)
# cv => fold 갯수
# 평가지표가 여러개일 경우 best 파라미터, 즉 순위를 지정할때, refit을 활용해서, 어떤 평가 지표가 우선순위인지 설정해야 함
```

**메소드**: `fit(X, y)` 학습, `predict(X)` / `predict_proba(X)`는 가장 좋은 모델로 추론

```python
# 그리드 서치가 찾은 베스트 모델을 갖고 다시 학습함.
# but 굳이 그리드서치 메소드로 하지말고 그 모델을 빼서 다시 학습시키는게 더 나음
```

> **보충** `refit`이 기본값(True)이면 GridSearchCV는 탐색이 끝난 뒤 **가장 좋은 조합으로 train 전체를 다시 학습**해 `best_estimator_`에 넣어 둔다. 그래서 `best_estimator_`를 꺼내 바로 써도 되고, 다시 학습시킬 필요는 없다. `gs.predict()`도 내부적으로 `best_estimator_.predict()`를 부르니 결과가 같다(아래에서 확인).

**결과 조회 속성** (fit 후 사용)

| 속성 | 내용 |
|---|---|
| `cv_results_` | 조합별 평가 결과 (dict) |
| `best_params_` | 가장 좋은 조합 |
| `best_estimator_` | 가장 좋은 조합으로 학습한 모델 |
| `best_score_` | 가장 좋은 점수 |

```python
# 사이킷런 attribute 뒤에 '_'를 꼭 붙인다.
```

scikit-learn은 **학습(fit)을 해야 생기는 속성**에 이름 끝 `_`를 붙인다.

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split

data = load_breast_cancer()
X, y = data.data, data.target

X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=0)
```

```python
from sklearn.model_selection import GridSearchCV
from sklearn.tree import DecisionTreeClassifier

#  하이퍼파라미터를 찾을 모델
model = DecisionTreeClassifier(random_state=0)

# 하이퍼 파라미터 후보 설정: dict[hp 이름, 후보들] #딕션너리 각 변수는 리스트로 매핑 혹은 range로
params = {
    "max_depth":[1, 2, 3, 4, 5], # iterable: range(1, 6)
    "max_leaf_nodes": range(3, 11)
}

gs = GridSearchCV(    # cross vaildation score 교차검증까지 해줌.
    estimator=model,    # 대상 모델
    param_grid=params,  # 하이퍼파라미터 후보들
    scoring='accuracy', # 평가 지표 (이 평가지표가 가장 높은 하이퍼파라미터를 찾는다.) # default값 = accuracy
    cv=4,      # Cross validation의 fold개수.
    n_jobs=-1, # 병렬연산(처리) -> 모든 프로세서(CPU)를 다 사용해라.
)
```

```python
# 실수형 타입의 하이퍼파라미터의 경우 1,2,3,4,5로 나눈 뒤 성능이 좋은 3,4 사이에서 다시 쪼개서 함
# 범위를 좁혀가면서
```

```python
gs.fit(X_train, y_train) # 최적의 하이퍼파라미터를 찾는다.
```

```text
GridSearchCV(cv=4, estimator=DecisionTreeClassifier(random_state=0), n_jobs=-1,
             param_grid={'max_depth': [1, 2, 3, 4, 5],
                         'max_leaf_nodes': range(3, 11)},
             scoring='accuracy')
```

5 × 8 = 40개 조합을 각각 4-fold로, 총 160번 학습했다.

```python
#### 가장 성능 좋은 hyper parameter 조합
gs.best_params_
```

```text
{'max_depth': 2, 'max_leaf_nodes': 4}
```

```python
#### 가장 좋은 성능의 하이퍼파라미터를 사용했을때 성능점수(정확도)
gs.best_score_
```

```text
np.float64(0.9248809733733028)
```

`best_score_`는 test 점수가 아니라 **교차 검증 평균 점수**다.

```python
### 모든 조합에 대한 평가 결과
# gs.cv_results_ #원래 결과는 cross-vall처럼 dict으로 넘겨줌 => 각 조합에 대한 스코어를 줌 (but아래 처럼 df에 넣어서 보는게 편함)
import pandas as pd
result_df = pd.DataFrame(gs.cv_results_).sort_values('rank_test_score')
a=gs.cv_results_
print(result_df.shape)
print(type(a))
result_df[['rank_test_score', 'param_max_depth', 'param_max_leaf_nodes', 'mean_test_score']].head(10)
```

```text
(40, 14)
<class 'dict'>
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 10행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>rank_test_score</th><th>param_max_depth</th><th>param_max_leaf_nodes</th><th>mean_test_score</th></tr></thead><tbody><tr><th class="idx">11</th><td>1</td><td>2</td><td>6</td><td>0.924881</td></tr><tr><th class="idx">15</th><td>1</td><td>2</td><td>10</td><td>0.924881</td></tr><tr><th class="idx">14</th><td>1</td><td>2</td><td>9</td><td>0.924881</td></tr><tr><th class="idx">13</th><td>1</td><td>2</td><td>8</td><td>0.924881</td></tr><tr><th class="idx">12</th><td>1</td><td>2</td><td>7</td><td>0.924881</td></tr><tr><th class="idx">9</th><td>1</td><td>2</td><td>4</td><td>0.924881</td></tr><tr><th class="idx">10</th><td>1</td><td>2</td><td>5</td><td>0.924881</td></tr><tr><th class="idx">26</th><td>8</td><td>4</td><td>5</td><td>0.922567</td></tr><tr><th class="idx">34</th><td>8</td><td>5</td><td>5</td><td>0.922567</td></tr><tr><th class="idx">17</th><td>10</td><td>3</td><td>4</td><td>0.922522</td></tr></tbody></table></div></div>

> **보충** 1위가 여러 개 동점이다. 이때 GridSearchCV는 동점 중 **조합 순서상 먼저 나온 것**을 `best_params_`로 고른다. 노트북에서 조회한 `rank_test_score`, `mean_test_score` 두 컬럼에 파라미터 컬럼을 더해 보면, `max_depth=2`에서 `max_leaf_nodes`가 4~10이면 모두 같은 점수라는 게 보인다. 깊이 2면 리프가 최대 4개라 `max_leaf_nodes`를 4 이상으로 줘도 차이가 없기 때문이다.

```python
##### 가장 좋은 하이퍼파라미터로 학습한 모델을 조회
print (type(gs.best_estimator_)) # 가장 좋은 하이퍼 파라미터를 값으로 가진 베스트 모델을 추출함
best_model = gs.best_estimator_
best_model
```

```text
<class 'sklearn.tree._classes.DecisionTreeClassifier'>
```

```text
DecisionTreeClassifier(max_depth=2, max_leaf_nodes=4, random_state=0)
```

best model로 test set을 최종 평가한다.

```python
pred_test = best_model.predict(X_test)
accuracy_score(y_test, pred_test)
```

```text
0.8881118881118881
```

```python
pred_test2 = gs.predict(X_test)  # gs.best_estimator_.predict()
accuracy_score(y_test, pred_test2)
```

```text
0.8881118881118881
```

### 여러 성능지표 확인하기

- 여러 지표를 볼 수는 있지만 최적의 파라미터는 **하나의 지표**로 고른다
- `scoring`에 지표들을 리스트로, `refit`에 순위 기준 지표를 지정한다

```python
model = DecisionTreeClassifier(random_state=0)
params = {
    "max_depth": range(1, 5),
    "min_samples_leaf": [10, 20, 30, 40, 50]
}
gs2 = GridSearchCV(
    model, params,
    scoring= ["accuracy", "recall", "precision"], # 평가지표가 여러개이면 리스트로 묶어서 전달.
    refit="recall",   # 순위의 기준이 되는 평가 지표를 지정.
    cv=4,
    n_jobs=-1
)
gs2.fit(X_train, y_train)
```

```text
GridSearchCV(cv=4, estimator=DecisionTreeClassifier(random_state=0), n_jobs=-1,
             param_grid={'max_depth': range(1, 5),
                         'min_samples_leaf': [10, 20, 30, 40, 50]},
             refit='recall', scoring=['accuracy', 'recall', 'precision'])
```

```python
gs2.best_params_
```

```text
{'max_depth': 1, 'min_samples_leaf': 10}
```

```python
gs2.best_score_   # recall(refit에 지정한 평가지표 점수)
```

```text
np.float64(0.9252035278154681)
```

```python
gs2.best_estimator_
```

```text
DecisionTreeClassifier(max_depth=1, min_samples_leaf=10, random_state=0)
```

```python
result_df2 = pd.DataFrame(
    gs2.cv_results_
)
```

```python
result_df2.columns
```

```text
Index(['mean_fit_time', 'std_fit_time', 'mean_score_time', 'std_score_time', 'param_max_depth',
       'param_min_samples_leaf', 'params', 'split0_test_accuracy', 'split1_test_accuracy',
       'split2_test_accuracy', 'split3_test_accuracy', 'mean_test_accuracy', 'std_test_accuracy',
       'rank_test_accuracy', 'split0_test_recall', 'split1_test_recall', 'split2_test_recall',
       'split3_test_recall', 'mean_test_recall', 'std_test_recall', 'rank_test_recall',
       'split0_test_precision', 'split1_test_precision', 'split2_test_precision',
       'split3_test_precision', 'mean_test_precision', 'std_test_precision',
       'rank_test_precision'],
      dtype='object')
```

결과 컬럼이 지표마다 `split0_test_recall`, `mean_test_recall`, `rank_test_recall`처럼 붙는다. recall 순위 → accuracy 순위로 정렬해 본다.

```python
pd.options.display.max_columns=30
result_df2.sort_values(["rank_test_recall", "rank_test_accuracy"])[
    ['param_max_depth', 'param_min_samples_leaf', 'mean_test_recall', 'mean_test_accuracy', 'mean_test_precision']
].head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 5열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>param_max_depth</th><th>param_min_samples_leaf</th><th>mean_test_recall</th><th>mean_test_accuracy</th><th>mean_test_precision</th></tr></thead><tbody><tr><th class="idx">0</th><td>1</td><td>10</td><td>0.925204</td><td>0.887388</td><td>0.899623</td></tr><tr><th class="idx">1</th><td>1</td><td>20</td><td>0.925204</td><td>0.887388</td><td>0.899623</td></tr><tr><th class="idx">2</th><td>1</td><td>30</td><td>0.925204</td><td>0.887388</td><td>0.899623</td></tr><tr><th class="idx">3</th><td>1</td><td>40</td><td>0.925204</td><td>0.887388</td><td>0.899623</td></tr><tr><th class="idx">4</th><td>1</td><td>50</td><td>0.925204</td><td>0.887388</td><td>0.899623</td></tr></tbody></table></div></div>

> **보충** recall 기준으로 고르니 **깊이 1**짜리 가장 단순한 트리가 뽑혔다. 질문 하나로 대부분을 양성(1)으로 판정하면 양성을 놓치지 않으니 재현율이 높게 나온다. 대신 정확도·정밀도는 깊은 트리보다 낮다. 어떤 지표로 고르느냐에 따라 "최적" 모델이 완전히 달라진다.

## RandomizedSearchCV

생성자 매개변수는 GridSearchCV와 거의 같다. 차이는 두 가지다.

- `param_distributions`: 하이퍼파라미터 후보 딕셔너리 (`param_grid` 대신)
- **`n_iter`**: 전체 조합 중 **몇 개를 테스트할지**

메소드와 결과 조회 속성은 GridSearchCV와 같다.

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split

data = load_breast_cancer()
X, y = data.data, data.target

X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=0)
```

```python
5*27*10 # 이 조합의 갯수 중에서 60개만 조회할 거임 (n_iter=60)
```

```text
1350
```

```python
from sklearn.model_selection import RandomizedSearchCV #
import numpy as np

model = DecisionTreeClassifier(random_state=0)
params = {
    "max_depth": range(1, 6), # 각 하이퍼 파라미터의 알고리즘(어떤식으로 계산으로 되는지는 이해 X)
    "max_leaf_nodes": range(3, 30), #그래도 각 하이퍼 파라미터들이 어떤 값, 음수, 정수, 실수 등을 받는 지를 확인해야 함/그리고 원하는 성능이 나올때까지 넣어보는 수밖에 없음
    "max_features": np.arange(0.1, 1.1, 0.1), # 학습할 때 사용할 feature(컬럼)의 개수(비율)
}
rs = RandomizedSearchCV(
    model,       # 하이퍼파라미터를 찾을 모델
    params,      # 하이퍼파라미터 후보들 (dict: key-하이퍼파라미터이름, value-후보리스트)
    n_iter=60,   # 테스트할 하이퍼파라미터 조합 개수 (random하게 조합을 선택한다.)
    scoring="accuracy", # 평가지표
    cv=4,        # cross validation fold 개수
    n_jobs=-1,
    random_state=0
)
rs.fit(X_train, y_train)
```

```text
RandomizedSearchCV(cv=4, estimator=DecisionTreeClassifier(random_state=0),
                   n_iter=60, n_jobs=-1,
                   param_distributions={'max_depth': range(1, 6),
                                        'max_features': array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1. ]),
                                        'max_leaf_nodes': range(3, 30)},
                   random_state=0, scoring='accuracy')
```

> **보충** 노트북에는 `random_state`가 없어서 실행할 때마다 다른 60개 조합이 뽑힌다. 결과를 재현하려고 `random_state=0`을 추가했다. 그래서 best 조합은 노트북과 다르다.

```python
print("best parameter:", rs.best_params_)
print("best score:", rs.best_score_)
```

```text
best parameter: {'max_leaf_nodes': 26, 'max_features': np.float64(0.4), 'max_depth': 5}
best score: 0.9530285663904072
```

```python
import pandas as pd
rs_result_df = pd.DataFrame(rs.cv_results_).sort_values('rank_test_score')
a = rs_result_df[['rank_test_score', 'mean_test_score']].head(10)
print(a)
```

```text
    rank_test_score  mean_test_score
53                1         0.953029
37                2         0.950736
25                3         0.943705
39                4         0.941390
45                4         0.941390
58                4         0.941390
24                7         0.941368
15                7         0.941368
20                9         0.941324
31               10         0.938988
```

```python
rs_result_df.shape
```

```text
(60, 15)
```

1,350개 조합 중 60개만 시험했다. 전체를 다 하는 그리드 서치보다 22배 이상 빠르다.

```python
best_model = rs.best_estimator_
accuracy_score(y_test, best_model.predict(X_test))
```

```text
0.9440559440559441
```

```python
accuracy_score(y_test, rs.predict(X_test))
```

```text
0.9440559440559441
```

## 파이프라인 (Pipeline)

일반적으로 파이프라인은 **일련의 작업이 순차적으로 연결되어 진행되는 구조**다. 데이터 처리(수집 → 정제 → 분석 → 시각화), 소프트웨어 개발(코드 → 테스트 → 배포), 공장의 조립 공정 모두 파이프라인이다.

```python
# 학습단계 => 추론단계
# 각 단계별 전처리 후 학습

# X(input), y(output) => 전처리기 => 모델링 등의 하나의 파이프라인 과정을 하나로 정제함
```

### 머신러닝의 파이프라인

- 데이터 전처리 → 모델 학습으로 이어지는 과정을 **묶어서 자동화**한다
- **전처리 파이프라인**: 변환기(Transformer)들로만 구성
- **전체 프로세스 파이프라인**: 마지막에 추정기(Estimator, 모델)를 넣는다

```python
# 일반적인 파이프라인은 2종류 => (1) 전처리(결측치, 스케일링, 인코딩), (2) 전체 프로세스(전처리+학습+추정)
```

### Pipeline 생성

- 작업 순서대로 `(이름, 변환기/추정기 객체)` 튜플을 리스트에 넣어 만든다
- 추정기는 **마지막 단계**에만 올 수 있다

```python
# <1> class의 객체 생성
#       (1) 튜플생성("이름", OHE) = 튜플로 첫 번째 객체는 #프로세스의 이름
#       (2) 객체생성 (튜플,  verbose=True)
# 추정기는 마지막 단계에 넣어 줌
# <2> class를 가지고 동일하게 작업
```

### Pipeline으로 학습·추론하기

- `pipeline.fit()`: 앞 단계 변환기들은 `fit_transform()`을 실행해 결과를 다음 단계로 넘기고, **마지막 단계는 `fit()`만** 한다. 마지막이 추정기일 때 쓴다
- `pipeline.fit_transform()`: 마지막 단계도 `fit_transform()`. 모든 단계가 변환기일 때 쓴다
- 마지막이 추정기면 `predict(X)`, `predict_proba(X)`로 추론한다. 앞 변환기들은 `transform()`만 하고 결과를 다음으로 넘긴다

![Pipeline의 fit과 predict 흐름](/images/ml/fig-pipeline.png)

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split

data = load_breast_cancer()
X, y = data.data, data.target

X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=0)
```

StandardScaler → SVM 순서로 파이프라인을 만든다.

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler #전처리기
from sklearn.svm import SVC #모델

# 일의 순서에 맞는 객체들을 list에 순서대로 넣어준다.
steps = [
    ("scaler", StandardScaler()),  # ("단계의 이름", 전처리기 객체) #순서가 보장이 되어야해서, dict대신 순서가 고정되어있는 turple로 줌
    ("svm", SVC(random_state=0, probability=True))   # ("단계의 이름", 모델 객체) / probability=> svm모델에서는 proba속성을 사용하지못함 설정으로 가능하게 해줘야 함
]

# 클래스 생성
pipeline = Pipeline(steps=steps, verbose=True) #verbose=True: 각 단계가 학습하는 과정 log(기록)를 출력.
```

> **보충** 순서는 **리스트**가 보장한다. 튜플은 각 단계의 `(이름, 객체)` 한 쌍을 묶는 용도다. SVC는 기본적으로 확률을 계산하지 않아서 `predict_proba()`를 쓰려면 `probability=True`를 줘야 한다. 이 옵션을 켜면 내부에서 교차 검증을 한 번 더 돌려 확률을 보정하기 때문에 학습이 느려진다.

```python
print(pipeline.steps) # 파이프라인에 등록한 객체들을 반환.
print(type(pipeline.steps))
pipeline.steps[0][1]
```

```text
[('scaler', StandardScaler()), ('svm', SVC(probability=True, random_state=0))]
<class 'list'>
```

```text
StandardScaler()
```

```python
pipeline.fit(X_train, y_train) #pipline을 구성하는 모든 요소들(S.Scaler, SVM) fit됌.

################################################ (아래의 작업을 자동화 함)
## step 1:
##     scaler.fit(X_train)
##     X_train_scaled = scaler.transform(X_train)
## step 2:
##     svm.fit(X_train_scaled, y_train)
################################################
```

```text
[Pipeline] ............ (step 1 of 2) Processing scaler, total=   0.0s
[Pipeline] ............... (step 2 of 2) Processing svm, total=   0.0s
```

```text
Pipeline(steps=[('scaler', StandardScaler()),
                ('svm', SVC(probability=True, random_state=0))],
         verbose=True)
```

```python
pred_train = pipeline.predict(X_train)

################################################ (아래의 작업을 자동화 함)
##
## step 1:
##   X_train_scaled = scaler.transform(X_train)  # pipeline.fit() 할 때 학습한 변환기로 변환 작업.
## step 2:
##   return svm.predict(X_train_scaled)   # pipeline.fit() 할 때 학습한 추정기 모델(svm)로 추정 작업
##
################################################

pred_test = pipeline.predict(X_test)
pred_test_proba = pipeline.predict_proba(X_test)
```

```python
pred_test_proba[:5] # 0 or 1 확률
```

```text
array([[3.72905614e-03, 9.96270944e-01],
       [9.99938428e-01, 6.15717823e-05],
       [9.99834002e-01, 1.65998229e-04],
       [1.87012225e-06, 9.99998130e-01],
       [9.99432863e-01, 5.67137106e-04]])
```

앞 글에서 만든 `metrics` 모듈로 평가한다.

```python
from metrics import print_binary_classification_metrics
print_binary_classification_metrics(y_train, pred_train, title="Train set 정확도")
```

```text
Train set 정확도
정확도: 0.9929577464788732
재현율: 0.9962546816479401
정밀도: 0.9925373134328358
F1 점수: 0.994392523364486
```

```python
print_binary_classification_metrics(y_test, pred_test, pred_test_proba[:,1], title="Test set 정확도")
```

```text
Test set 정확도
정확도: 0.958041958041958
재현율: 0.9666666666666667
정밀도: 0.9666666666666667
F1 점수: 0.9666666666666667
Average Precision: 0.9955621797217227
ROC-AUC Score: 0.9926624737945493
```

새 데이터도 `pipeline.predict()` 한 번이면 스케일링부터 예측까지 끝난다.

```python
new_X = X_test[:5]
new_X.shape
```

```text
(5, 30)
```

```python
pred = pipeline.predict(new_X)
print(pred)
```

```text
[1 0 0 1 0]
```

### Pipeline 저장과 불러오기

파이프라인을 저장하면 안에 든 **변환기와 추정기가 함께** 저장된다. 앞 글에서 scaler와 모델을 따로 저장했던 일을 한 번에 한다.

```python
# pipeline을 파일에 저장 -> pipeline을 구성하는 각 단계의 변환기, 추정기 들이 같이 저장.
import pickle
import os
os.makedirs("saved_model", exist_ok=True)

# 저장
with open("saved_model/pipeline_model.pkl", "wb") as fo:
    pickle.dump(pipeline, fo)
```

```python
# load
with open("saved_model/pipeline_model.pkl", "rb") as fi:
    saved_pipeline = pickle.load(fi)
```

```python
saved_pipeline.predict(new_X)
```

```text
array([1, 0, 0, 1, 0])
```

```python
saved_steps = saved_pipeline.steps
print(type(saved_steps))
print(saved_steps)
```

```text
<class 'list'>
[('scaler', StandardScaler()), ('svm', SVC(probability=True, random_state=0))]
```

```python
# 파이프라인은 필수
```

## GridSearch에서 Pipeline 사용하기

- 파이프라인을 GridSearchCV의 `estimator`로 넣는다
- 하이퍼파라미터는 **`단계이름__하이퍼파라미터`** (언더스코어 두 개) 형식으로 지정한다

```python
# pipline의 객체를 Gridsearch 모델에 넣어주면 됌
# 단 어떤 프로세스 중의 하이퍼파라미터인지 넣어줘야 함
```

> **보충** 파이프라인을 그리드 서치에 넣는 진짜 이유는 편리함보다 **데이터 누수 방지**다. 스케일러를 train 전체로 미리 fit해 두고 교차 검증을 하면, 각 fold의 검증 데이터 정보가 스케일러에 이미 섞여 있다. 파이프라인째 넣으면 fold마다 그 fold의 train 부분으로만 스케일러를 fit한다.

### PCA로 차원 축소

이 예제에는 전처리 단계로 PCA가 들어간다. 수업에서 PCA 설명을 길게 적었다.

```python
###############################################################################################################################
# PCA : 전처리-비지도학습 알고리즘중 하나. (전처리 활동 중에서 많이 사용 됌 )
##  PCA: 주성분 분석(Principal Component Analysis): 데이터의 분산을 최대한 보존하면서 축을 재설정해 차원을 축소함. (차원축소)
                                                    # => 분산이 클수록 데이터를 더 잘 표현 = 더 많은 정보를 제공함
                                                    # => 분산이 클수록 데이터의 차이가 나타남
# 차원축소: 고차원 데이터를 저차원 데이터로 변환. (Feature의 개수를 축소한다.)
##  Feature의 개수를 줄이는 이유:
###   모델의 학습속도를 높인다. 메모리 사용량을 줄인다. 노이즈를 제거할 수 있다. 데이터를 시각화할 수 있다. 모델의 성능을 높인다.

## Feature 수 줄이기:
### feature selection(feature를 선택-선택된 feature의 원래값을 유지) # 국어/생물/미술 => 대표 feature를 select
### feature extraction(계산을 통해서 줄이기.-원래 feature의 값이 변경.) #국영수/생화물/미체음 각 feature의 특성을 합쳐서 추출
##
##  PCA는 “정보량이 많은 방향”을 기준으로 feature를 압축하는 기법
##  여기서 정보량 ≈ 분산
##  “분산을 많이 설명하는 주성분”일수록 중요한 feature라고 보는 것
##  분산이 크다 = 예측에 중요하다” 항상 성립하지는 않음
##  y 값을 잘 찾아내는 최소한의 feature가 best          == "y를 가장 잘 설명하는 최소 feature 집합
###############################################################################################################################
```

```python
from sklearn.decomposition import PCA # feature extraction
pca = PCA(n_components=2)             # feature를 몇개로 줄일지 지정
pca.fit(X_train)
t1 = pca.transform(X_train)
t2 = pca.transform(X_test)
print(X_train.shape, t1.shape, X_test.shape, t2.shape)

t1_df = pd.DataFrame(t1)
t1_df.head(10)
```

```text
(426, 30) (426, 2) (143, 30) (143, 2)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 10행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0</th><th>1</th></tr></thead><tbody><tr><th class="idx">0</th><td>-325.281484</td><td>-16.818122</td></tr><tr><th class="idx">1</th><td>463.882487</td><td>61.385307</td></tr><tr><th class="idx">2</th><td>-598.573901</td><td>-9.021318</td></tr><tr><th class="idx">3</th><td>-774.499327</td><td>-54.105029</td></tr><tr><th class="idx">4</th><td>-268.543109</td><td>26.110407</td></tr><tr><th class="idx">5</th><td>-460.408164</td><td>-50.786777</td></tr><tr><th class="idx">6</th><td>-434.031722</td><td>27.568562</td></tr><tr><th class="idx">7</th><td>-696.607943</td><td>-25.774643</td></tr><tr><th class="idx">8</th><td>57.805375</td><td>-31.953384</td></tr><tr><th class="idx">9</th><td>415.398323</td><td>36.611713</td></tr></tbody></table></div></div>

30개 feature가 2개로 줄었다. 새 feature(주성분)가 원래 데이터의 분산을 얼마나 설명하는지 본다.

```python
# 새로 만들어진 feature(주성분)이 원래 데이터의 분산을 얼마나 설명하는지 확인.
# 분산의 차이가 성능에 영향을 주지 않을 수도 있음 (도메인지식이 필요함)
# 해보고, 성능이 올라가면 사용
# 차원이 많으면 성능이 좋을 수 없음
pca.explained_variance_ratio_
```

```text
array([0.98233722, 0.01572516])
```

```python
pca.explained_variance_ratio_.sum()
```

```text
np.float64(0.9980623743736445)
```

```python
# 시각화
import matplotlib.pyplot as plt

# class 별 index조회
zero_index = np.where(y_train==0)[0]  # 0: 악성종양
one_index = np.where(y_train==1)[0]   # 1: 양성종양

plt.scatter(t1[zero_index, 0], t1[zero_index, 1], label="악성", alpha=0.5)
plt.scatter(t1[one_index, 0], t1[one_index, 1], label="양성", alpha=0.5)
plt.legend()
plt.show()
```

![그래프 출력](/images/ml/ml-gridsearch-pipeline-2.png)

> **보충** 첫 주성분 하나가 분산의 98%를 설명한다고 나오지만, 이건 정보가 많아서가 아니라 **스케일링을 안 했기 때문**이다. `worst area`처럼 값이 수백~수천 단위인 컬럼 몇 개가 분산을 독차지해서, 첫 주성분이 사실상 "면적" 축이 됐다. 이 글 뒤쪽 `make_pipeline` 셀의 메모(스케일러를 PCA보다 먼저 둔다)가 바로 이 문제다. 그래서 아래 파이프라인은 Scaler → PCA 순서로 만든다.

```python
# 보충: 스케일링 후 PCA
pca_s = PCA(n_components=2).fit(StandardScaler().fit_transform(X_train))
pca_s.explained_variance_ratio_, pca_s.explained_variance_ratio_.sum()
```

```text
(array([0.44481246, 0.18928593]), np.float64(0.6340983905090186))
```

스케일링 후에는 두 주성분이 합쳐서 약 63%를 설명한다. 30개 feature가 고르게 기여하게 된 결과다.

### Pipeline + GridSearchCV

Scaler → PCA → SVM 파이프라인을 만들고, PCA의 주성분 개수와 SVM의 `C`, `gamma`를 함께 찾는다.

```python
from sklearn.decomposition import PCA


steps = [
    ("scaler", StandardScaler()),  # 하이퍼파라미터 없음
    ("pca", PCA()),# 하이퍼 파라미터 존재하는 전처리기?
    ("svm", SVC(random_state=0)) # 하이퍼 파라미터 존재
]
pipeline = Pipeline(steps, verbose=True)
```

```python
params = {
    "pca__n_components": range(2, 31),  #PCA    #PCA라는 프로세스의 하이퍼파라미터임을 명시적으로 써야 함 # 프로세스__하이퍼파라미터 (언어스코어 x 2)
    "svm__C":[0.01, 0.1, 0.5, 1],       #SVC
    "svm__gamma":[0.01, 0.1, 0.5, 1]    #SVC
}
gs = GridSearchCV(
    pipeline,
    params,
    scoring="accuracy",
    cv=4,
    n_jobs=-1
)
```

29 × 4 × 4 = 464개 조합, 4-fold라 1,856번 학습한다.

```python
gs.fit(X_train, y_train)
```

```text
[Pipeline] ............ (step 1 of 3) Processing scaler, total=   0.0s
[Pipeline] ............... (step 2 of 3) Processing pca, total=   0.0s
[Pipeline] ............... (step 3 of 3) Processing svm, total=   0.0s
```

```text
GridSearchCV(cv=4,
             estimator=Pipeline(steps=[('scaler', StandardScaler()),
                                       ('pca', PCA()),
                                       ('svm', SVC(random_state=0))],
                                verbose=True),
             n_jobs=-1,
             param_grid={'pca__n_components': range(2, 31),
                         'svm__C': [0.01, 0.1, 0.5, 1],
                         'svm__gamma': [0.01, 0.1, 0.5, 1]},
             scoring='accuracy')
```

마지막에 찍힌 로그는 best 조합으로 train 전체를 다시 학습(refit)한 것이다. 교차 검증 중의 로그는 병렬 작업자 프로세스에서 찍혀서 여기 나오지 않는다.

```python
gs.best_params_
```

```text
{'pca__n_components': 5, 'svm__C': 1, 'svm__gamma': 0.1}
```

```python
gs.best_score_
```

```text
np.float64(0.9765914300828777)
```

```python
result_df = pd.DataFrame(gs.cv_results_)
result_df.sort_values("rank_test_score")[['param_pca__n_components', 'param_svm__C', 'param_svm__gamma', 'mean_test_score']].head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>param_pca__n_components</th><th>param_svm__C</th><th>param_svm__gamma</th><th>mean_test_score</th></tr></thead><tbody><tr><th class="idx">61</th><td>5</td><td>1.0</td><td>0.1</td><td>0.976591</td></tr><tr><th class="idx">76</th><td>6</td><td>1.0</td><td>0.01</td><td>0.971852</td></tr><tr><th class="idx">60</th><td>5</td><td>1.0</td><td>0.01</td><td>0.971852</td></tr><tr><th class="idx">77</th><td>6</td><td>1.0</td><td>0.1</td><td>0.969582</td></tr><tr><th class="idx">172</th><td>12</td><td>1.0</td><td>0.01</td><td>0.96956</td></tr></tbody></table></div></div>

```python
best_model = gs.best_estimator_
type(best_model)
```

```text
<class 'sklearn.pipeline.Pipeline'>
```

best 모델은 파이프라인 통째다.

```python
best_model.steps
```

```text
[('scaler', StandardScaler()), ('pca', PCA(n_components=5)), ('svm', SVC(C=1, gamma=0.1, random_state=0))]
```

```python
accuracy_score(y_test, best_model.predict(X_test))
```

```text
0.9440559440559441
```

### make_pipeline()

- `make_pipeline(변환기, 변환기, ..., 추정기)`: Pipeline을 만들어 준다
- 단계 이름을 **클래스 이름 소문자**로 자동으로 붙인다

```python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from pprint import pprint

pipeline = make_pipeline( #make_pipeline를 사용하면 프로세스이름__ (생략가능)
    StandardScaler(),  # 전처리
    PCA(n_components=5),  # 전처리 # 전처리기 사이 순서도 중요함// x1=지번/ x2=집값이라고 할떄, 단위가 맞지 않아서 x2의 분산이 훨씬 더 커보임 먼저 scaler를 통해 단위를 맞춰줌
    DecisionTreeClassifier() # 모델
)
pprint(pipeline.steps)

# 전처리기들의 순서도 매우 중요함

# 예시)
# x1 = 지번(값 범위 작음)
# x2 = 집값(값 범위 매우 큼)

# PCA는 분산이 큰 feature를 더 중요하게 판단하기 때문에,
# 스케일링 없이 적용하면 집값(x2)의 영향력이 지나치게 커질 수 있음

# 따라서 먼저 StandardScaler로 feature들의 단위를 맞춘 뒤
# PCA를 적용해야 각 feature를 공정하게 비교할 수 있음
```

```text
[('standardscaler', StandardScaler()),
 ('pca', PCA(n_components=5)),
 ('decisiontreeclassifier', DecisionTreeClassifier())]
```

> **보충** 첫 줄 주석의 "프로세스이름__ 생략 가능"은 아니다. 이름을 **직접 짓는 걸** 생략할 뿐이고, 그리드 서치에서는 자동으로 붙은 이름을 써서 `"pca__n_components"`, `"decisiontreeclassifier__max_depth"`처럼 지정해야 한다.

## ColumnTransformer

```python
# (1) 결측치 처리 (최빈값, 평균값, 중위값 서로 다 다름 feature별로)

# (2) feature engineering
# 범주형 데이터 (OHE)
# 수치형 데이터 (F.Scaling) SS or MM

# (1) 결측치 => (2) feature engineering
# feature 별로 다 다른 전처리기 어떻게 해야할까?
# ColumnTransformer => 컬럼(feature)별로 전처리기를 다르게 해줌
```

- 대부분의 데이터셋은 범주형과 연속형 feature를 같이 가진다. 연속형은 스케일링, 범주형은 인코딩, 결측치 처리 방법도 서로 다르다
- 컬럼을 나눠서 따로 처리하고 합치면 **번거롭고**, **전처리 방식을 저장할 수 없고**, **파이프라인으로 묶을 수 없다**
- `ColumnTransformer`는 **feature별로 어떤 전처리를 할지 정의**해 하나의 변환기로 만든다

`sklearn.compose.ColumnTransformer`

- `transformers`: `(이름, 변환기, 컬럼 목록)` 튜플들의 리스트
- `remainder`: 지정하지 않은 컬럼 처리. `"drop"`(기본, 제거) 또는 `"passthrough"`(그대로 둠)

`make_column_transformer`는 이름 없이 `(변환기, 컬럼 목록)` 튜플만 넘겨 만드는 도우미 함수다.

```python
# dummy dataset
import pandas as pd
import numpy as np
df = pd.DataFrame({
    "gender":['남성', '여성', '여성', '여성', '여성', '여성', '남성', np.nan],
    "tall":[183.21, 175.73, np.nan, np.nan, 171.18, 181.11, 168.83, 193.99],
    "weight":[82.11, 62.45, 52.21, np.nan, 56.32, 48.93, 63.64, 102.38],
    "blood_type":["B", "B", "O", "AB", "B", np.nan, "B", "A"],
})

df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>gender</th><th>tall</th><th>weight</th><th>blood_type</th></tr></thead><tbody><tr><th class="idx">0</th><td>남성</td><td>183.21</td><td>82.11</td><td>B</td></tr><tr><th class="idx">1</th><td>여성</td><td>175.73</td><td>62.45</td><td>B</td></tr><tr><th class="idx">2</th><td>여성</td><td><span class="sql-null">NaN</span></td><td>52.21</td><td>O</td></tr><tr><th class="idx">3</th><td>여성</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>AB</td></tr><tr><th class="idx">4</th><td>여성</td><td>171.18</td><td>56.32</td><td>B</td></tr><tr><th class="idx">5</th><td>여성</td><td>181.11</td><td>48.93</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">6</th><td>남성</td><td>168.83</td><td>63.64</td><td>B</td></tr><tr><th class="idx">7</th><td><span class="sql-null">NaN</span></td><td>193.99</td><td>102.38</td><td>A</td></tr></tbody></table></div></div>

- 결측치: 범주형은 최빈값, 연속형은 평균/중앙값
- 전처리: 범주형은 원핫 인코딩, 연속형은 스케일링

```python
df[['gender', 'blood_type']].mode(axis=0)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 1행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>gender</th><th>blood_type</th></tr></thead><tbody><tr><th class="idx">0</th><td>여성</td><td>B</td></tr></tbody></table></div></div>

```python
df[['tall', 'weight']].mean()
```

```text
tall      179.008333
weight     66.862857
dtype: float64
```

### 단계별로 ColumnTransformer 만들기

먼저 결측치 처리기다.

```python
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer   # 결측치값 대체.
from sklearn.preprocessing import OneHotEncoder, StandardScaler, MinMaxScaler
from sklearn.pipeline import Pipeline

# 전처리별로 생성
### 결측치 처리. - 컬럼별로 다르게 처리
### [("전처리기 이름",  전처리기, 리스트[컬럼index 또는 이름])]
na_transformer = ColumnTransformer([ #결측치 처리에 필요한 처리기 2개의 이름을 부여 #결측치 처리기가 2개 필요함
    ("category_imputer", SimpleImputer(strategy="most_frequent"), [0, 3]), #랭스가 3인 곳
    ("number_imputer", SimpleImputer(strategy="mean"), [1, 2])
])
### 순서대로 변환 하고 단순히 합친다.
na_values = na_transformer.fit_transform(df)

na_values_df=pd.DataFrame(na_values)
na_values_df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0</th><th>1</th><th>2</th><th>3</th></tr></thead><tbody><tr><th class="idx">0</th><td>남성</td><td>B</td><td>183.21</td><td>82.11</td></tr><tr><th class="idx">1</th><td>여성</td><td>B</td><td>175.73</td><td>62.45</td></tr><tr><th class="idx">2</th><td>여성</td><td>O</td><td>179.008333</td><td>52.21</td></tr><tr><th class="idx">3</th><td>여성</td><td>AB</td><td>179.008333</td><td>66.862857</td></tr><tr><th class="idx">4</th><td>여성</td><td>B</td><td>171.18</td><td>56.32</td></tr><tr><th class="idx">5</th><td>여성</td><td>B</td><td>181.11</td><td>48.93</td></tr><tr><th class="idx">6</th><td>남성</td><td>B</td><td>168.83</td><td>63.64</td></tr><tr><th class="idx">7</th><td>여성</td><td>A</td><td>193.99</td><td>102.38</td></tr></tbody></table></div></div>

결과 컬럼 순서가 **변환기 순서대로** 바뀌었다. gender, blood_type, tall, weight다.

```python
# gender, tall, weight, blood_type -> na_transformer -> gender, blood_type, tall, weight
##### 결과 feature 순서: gender, blood_type, tall, weight
##feature 명을 반환할때, 작업순서 때문에 변하기 때문에 그걸 좀 주의 깊게 해서 처리해야 함
### Feature Engineering - 컬럼별로 다르게 처리.
fe_transformer = ColumnTransformer([
    ("category_ohe", OneHotEncoder(), [0, 1]),# feature의 index로 지정.
    ("number_scaler", StandardScaler(), [2]),
    ("number_scaler2", MinMaxScaler(), [3])
])
### DataFrame이 입력일 경우 컬럼명이나 컬럼 index를 지정할 수 있다.
### ndarray가 입력일 경우 컬럼(feature) index를 지정.
fe_values = fe_transformer.fit_transform(na_values) #na_transform 처리 결과를 입력으로 넣어 변환
fe_values
```

```text
array([[ 1.        ,  0.        ,  0.        ,  0.        ,  1.        ,
         0.        ,  0.57840648,  0.62076707],
       [ 0.        ,  1.        ,  0.        ,  0.        ,  1.        ,
         0.        , -0.4512993 ,  0.25294668],
       [ 0.        ,  1.        ,  0.        ,  0.        ,  0.        ,
         1.        ,  0.        ,  0.06136576],
       [ 0.        ,  1.        ,  0.        ,  1.        ,  0.        ,
         0.        ,  0.        ,  0.33550715],
       [ 0.        ,  1.        ,  0.        ,  0.        ,  1.        ,
         0.        , -1.07765777,  0.13826006],
       [ 0.        ,  1.        ,  0.        ,  0.        ,  1.        ,
         0.        ,  0.28931796,  0.        ],
       [ 1.        ,  0.        ,  0.        ,  0.        ,  1.        ,
         0.        , -1.40116159,  0.27521048],
       [ 0.        ,  1.        ,  1.        ,  0.        ,  0.        ,
         0.        ,  2.06239422,  1.        ]])
```

두 단계를 파이프라인으로 묶으면 원본 df를 넣어 한 번에 처리한다.

```python
transformer_pipeline = Pipeline([
    ("step1", na_transformer),
    ("step2", fe_transformer)
])
```

```python
pd.DataFrame(transformer_pipeline.fit_transform(df))
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th></tr></thead><tbody><tr><th class="idx">0</th><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.578406</td><td>0.620767</td></tr><tr><th class="idx">1</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>-0.451299</td><td>0.252947</td></tr><tr><th class="idx">2</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.061366</td></tr><tr><th class="idx">3</th><td>0.0</td><td>1.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.335507</td></tr><tr><th class="idx">4</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>-1.077658</td><td>0.13826</td></tr><tr><th class="idx">5</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.289318</td><td>0.0</td></tr><tr><th class="idx">6</th><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>-1.401162</td><td>0.27521</td></tr><tr><th class="idx">7</th><td>0.0</td><td>1.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>2.062394</td><td>1.0</td></tr></tbody></table></div></div>

### 컬럼 그룹별 파이프라인을 ColumnTransformer로 묶기

위 방식은 첫 단계에서 컬럼 순서가 바뀌어 다음 단계의 index를 다시 계산해야 한다. 그래서 **컬럼 그룹마다 파이프라인**을 만들고, 그 파이프라인들을 ColumnTransformer로 합치는 구조를 더 많이 쓴다.

```python
########### 컬럼별 전처리 프로세스를 pipeline으로 묶기. ### 파이프라인을 2개 만들기
### 수치형 컬럼들에 적용할 전처리 프로세스.
num_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="mean")), # 1. 결측치 처리
    ("scaler", StandardScaler())   # 2. Feature Scaling
])
### 범주형 컬럼들에 적용할 전처리 프로세스
cate_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("ohe", OneHotEncoder(handle_unknown='ignore'))   # handle_unknown='ignore' - 학습할 때 없었던 class는 0으로 처리.
                                                                        # 학습할 때, 없었던 범주 존재 가능성
])

preprocessor = ColumnTransformer([   ### 파이프라인 2개 합치기
    ("category", cate_pipeline, [0, 3]),
    ("number", num_pipeline, [1, 2])
])
```

```python
pd.DataFrame(preprocessor.fit_transform(df))
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th></tr></thead><tbody><tr><th class="idx">0</th><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.578406</td><td>0.925505</td></tr><tr><th class="idx">1</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>-0.451299</td><td>-0.267861</td></tr><tr><th class="idx">2</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>-0.889432</td></tr><tr><th class="idx">3</th><td>0.0</td><td>1.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">4</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>-1.077658</td><td>-0.639954</td></tr><tr><th class="idx">5</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.289318</td><td>-1.088528</td></tr><tr><th class="idx">6</th><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>-1.401162</td><td>-0.195628</td></tr><tr><th class="idx">7</th><td>0.0</td><td>1.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>2.062394</td><td>2.155898</td></tr></tbody></table></div></div>

> **보충** 앞의 결과와 비교하면 마지막 컬럼(weight)이 MinMaxScaler 대신 StandardScaler로 바뀌어서 값이 다르다. `handle_unknown='ignore'`는 학습 때 없던 범주(예: 혈액형에 새 값)가 들어오면 에러 대신 원핫 컬럼을 모두 0으로 둔다. 앞 글의 LabelEncoder `ValueError` 문제를 여기서 해결한다.

이 전처리기 뒤에 모델을 붙이면 전체 프로세스 파이프라인이 된다.

```python
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.svm import SVC

# 각 클래스 뒤에 괄호()를 붙여서 객체로 전달해야 합니다.
p = Pipeline([
    ("PP", preprocessor),
    ("SVC", SVC())
])
p
```

```text
Pipeline(steps=[('PP',
                 ColumnTransformer(transformers=[('category',
                                                  Pipeline(steps=[('imputer',
                                                                   SimpleImputer(strategy='most_frequent')),
                                                                  ('ohe',
                                                                   OneHotEncoder(handle_unknown='ignore'))]),
                                                  [0, 3]),
                                                 ('number',
                                                  Pipeline(steps=[('imputer',
                                                                   SimpleImputer()),
                                                                  ('scaler',
                                                                   StandardScaler())]),
                                                  [1, 2])])),
                ('SVC', SVC())])
```

## 실습: Adult 데이터셋

수업 TODO다.

- 전처리
  - 범주형: 결측치는 최빈값, 원핫 인코딩
  - 연속형: 결측치는 중앙값, StandardScaling
- 모델: `LogisticRegression(max_iter=2000)`
- Pipeline으로 전처리와 모델을 묶는다

```python
# LogisticRegression
# max_iter=2000 하이퍼 파라미터
```

```python
import pandas as pd
cols = ['age', 'workclass','fnlwgt','education', 'education-num', 'marital-status', 'occupation','relationship', 'race', 'gender','capital-gain','capital-loss', 'hours-per-week','native-country', 'income']
data = pd.read_csv(
    'data/adult.data',
    header=None,
    names=cols,
    na_values='?',
    skipinitialspace=True
)
```

```python
data.isnull().sum()

# <결측치 수>
# native-country     583
# workclass         1836
# occupation        1843
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

```python
# 범주형 Feature
categorical_columns = ['workclass','education','marital-status', 'occupation','relationship','race','gender','native-country']
# 수치형 Feature
numeric_columns = ['age','fnlwgt', 'education-num','capital-gain','capital-loss','hours-per-week']
# 타겟
target = "income"  # 15번째 컬럼[14] ==> y (0,1:LabelEncoder)

categorical_columns_index = [1, 3, 5, 6, 7, 8, 9, 13]
numeric_columns_index = [0, 2, 4, 10, 11, 12]
```

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
```

```python
X = data[categorical_columns + numeric_columns]
y = data[target]

# Target(income) 컬럼 레이블 인코딩 (문자열 -> 0, 1 변환)
le = LabelEncoder()      #레이블 인코딩 객체 생성     # 0 = false, 1=True
y = le.fit_transform(y)

# 데이터 분할 (Train / Test)
X_train, X_test, y_train, y_test = train_test_split(X,
                                                    y,
                                                    test_size=0.2,
                                                    random_state=0,
                                                    stratify=y)
```

```python
y[:5] # 0과 1로 바뀜
```

```text
array([0, 0, 0, 0, 0])
```

전처리기를 만드는 셀은 노트북에서 오타 때문에 실행되지 않았다. **아래 셀은 에러가 나는 것이 정상이다.** 첫 줄 `"imputer,` 뒤에 닫는 따옴표가 빠졌다.

```python
# 1. 수치형 컬럼들에 적용할 전처리 프로세스
num_pipeline = Pipeline([
    ("imputer, SimpleImputer(strategy="median")),
    ("scaler", StandardScaler())   # 2. Feature Scaling
])
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · SyntaxError: unterminated string literal (detected at line 3)</div></div>

따옴표를 고치는 것 말고 하나 더 고칠 게 있다.

> **보충** `categorical_columns_index = [1, 3, 5, ...]`는 **원본 `data`의 컬럼 순서** 기준 index다. 그런데 `X`는 `data[categorical_columns + numeric_columns]`로 **순서를 바꿔** 만들었다. `X`에서 1번은 `education`, 8번은 `age`라서, 이 index를 그대로 쓰면 `age`, `fnlwgt` 같은 수치형 컬럼이 원핫 인코딩되고 `workclass` 같은 문자열 컬럼에 중앙값 대체를 시도하게 된다. DataFrame을 넣을 때는 index 대신 **컬럼 이름 리스트**를 쓰면 이런 실수가 없다.

```python
# 1. 수치형 컬럼들에 적용할 전처리 프로세스
num_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler())   # 2. Feature Scaling
])

# 2. 범주형 컬럼들에 적용할 전처리 프로세스
cate_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")), # 1. 결측치 처리
    ("ohe", OneHotEncoder(handle_unknown='ignore'))   # 2. Feature Scaling
])



# 3. ColumnTransformer로 결합
preprocessor = ColumnTransformer([
    ("category", cate_pipeline, categorical_columns), # 보충: index 대신 컬럼명 전달
    ("number", num_pipeline, numeric_columns)
])
```

```python
# 5. 최종 메인 파이프라인 제작 (전처리기 + 로지스틱 회귀 모델)
pipeline = Pipeline([
    ('PP', preprocessor),
    ('model', LogisticRegression(max_iter=2000))
])


# 6. 실행 및 평가
pipeline.fit(X_train, y_train)

train_score = pipeline.score(X_train, y_train)
test_score = pipeline.score(X_test, y_test)

print(f"훈련 세트 정확도: {train_score}")
print(f"테스트 세트 정확도: {test_score}")
```

```text
훈련 세트 정확도: 0.8532708845208845
테스트 세트 정확도: 0.8450790726239829
```

train과 test 정확도 차이가 작다. 과대적합 없이 일반화된 모델이다.

노트북에는 여기에 그리드 서치를 붙이려고 쓰다 만 셀이 있다. 하이퍼파라미터 이름 쓰는 법을 고민한 흔적이라 그대로 둔다. **이 셀도 에러가 나는 것이 정상이다.**

```python
# gridsearch
## model : C - [0.1, 0.5, 1, 10]
## 수치형 전처리 - imputer : [mean, median]
param = {
        "model" : [0.1, 0.5, 1]
        "processor__number__imputer__strategy" :
}
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · SyntaxError: invalid syntax. Perhaps you forgot a comma?</div></div>

메모의 계획대로 완성하면 이렇다. 이름은 파이프라인 단계 이름을 따라 `PP__number__imputer__strategy`(전처리기 → number 파이프라인 → imputer 단계 → strategy)처럼 바깥에서 안쪽으로 이어 쓴다.

```python
# 보충: 메모의 계획대로 완성한 그리드 서치
from sklearn.model_selection import GridSearchCV
param = {
    "model__C": [0.1, 0.5, 1, 10],
    "PP__number__imputer__strategy": ["mean", "median"],
}
gs_adult = GridSearchCV(pipeline, param, scoring="accuracy", cv=4, n_jobs=-1)
gs_adult.fit(X_train, y_train)
print(gs_adult.best_params_, gs_adult.best_score_)
print("test 정확도:", gs_adult.score(X_test, y_test))
```

```text
{'PP__number__imputer__strategy': 'mean', 'model__C': 0.5} 0.8520039926289926
test 정확도: 0.8458467680024566
```

> **보충** 수치형 결측치가 하나도 없는 데이터라 `mean`과 `median`은 결과가 같고, `C`를 바꿔도 차이가 작다. 이 데이터에서는 로지스틱 회귀의 성능이 하이퍼파라미터보다 **feature 자체**에 더 묶여 있다는 뜻이다.

## 정리

- **일반화**: train과 test 성능이 모두 좋고 차이가 작다. **과대적합**: train만 좋다. **과소적합**: 둘 다 나쁘다
- 과대적합이면 **규제를 강하게**(모델을 단순하게), 과소적합이면 **규제를 약하게** 한다. 결정 트리는 `max_depth`, `max_leaf_nodes`, `min_samples_leaf`
- `GridSearchCV`는 모든 조합을, `RandomizedSearchCV`는 `n_iter`개 조합만 교차 검증한다. 결과는 `best_params_`, `best_score_`, `best_estimator_`. 어떤 지표로 고르느냐(`refit`)에 따라 최적 모델이 달라진다
- `Pipeline`은 전처리와 모델을 묶어 `fit`/`predict` 한 번으로 처리하고, 통째로 저장할 수 있다. 그리드 서치에 넣을 땐 `단계이름__파라미터` 형식
- `ColumnTransformer`는 컬럼 그룹별로 다른 전처리를 적용한다. DataFrame에는 index보다 **컬럼 이름**을 쓰는 게 안전하다
- 전처리 순서도 결과를 바꾼다. PCA 같은 분산 기반 방법은 **스케일링 뒤**에 둔다
