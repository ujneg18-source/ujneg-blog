---
title: "결정 트리와 랜덤 포레스트: 트리 모델과 앙상블"
description: "결정 트리의 분기 원리와 가지치기 하이퍼파라미터, feature 중요도, 회귀 트리의 노드 읽는 법을 정리하고, 앙상블(배깅·보팅·부스팅)의 개념과 부트스트랩 샘플링 기반 랜덤 포레스트를 와인·보스턴 데이터로 실습합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 11
originalNotebook: "09_결정트리와 랜덤포레스트.ipynb"
tags: ["Python","scikit-learn","Decision Tree","Random Forest","Ensemble"]
date: 2026-05-25
---

> SKN31 머신러닝 과정 노트북 `09_결정트리와 랜덤포레스트.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 결정 트리 알고리즘 개요와 용어
- 결정 트리의 과적합과 가지치기 하이퍼파라미터
- feature 중요도(`feature_importances_`)
- 와인 색 분류, 보스턴 집값 회귀 트리
- 앙상블: 배깅, 보팅, 부스팅
- 랜덤 포레스트

## 의사결정나무(Decision Tree)

앞 글들에서 여러 번 썼던 모델을 이번에 제대로 정리한다.

- 정답을 잘 예측할 수 있는 질문을 던지며 대상을 좁혀 가는 방식으로, **스무고개**와 비슷하다
- 분기하는 구조가 이진 트리와 같아서 Decision Tree라고 한다. 하위 노드는 **Yes/No 두 개**로 나뉜다
- **분기 기준**
  - **분류**: 불순도를 가장 많이 낮추는 조건을 찾아 분기한다
  - **회귀**: 오차가 가장 적어지는 조건을 찾아 분기한다
- 머신러닝 모델 중 결과를 해석할 수 있는 몇 안 되는 **White-box 모델**이다
- **과대적합이 발생하기 쉽다**
- 랜덤 포레스트와 여러 부스팅 모델의 **기반 알고리즘**이다

> **순도(Purity)/불순도(Impurity)**: 서로 다른 클래스의 값이 섞여 있는 정도. 한 클래스가 많을수록 순도가 높고 불순도는 낮다.
>
> **White box / Black box 모델**: 추론 결과의 이유를 확인할 수 있으면 white box, 확인할 수 없으면 black box 모델이다.

```python
# 디시젼 트리의 회기는 leaf node의 y들의 평균으로 예측
# 예측했더니 오차가 나옴 => 그걸 기준으로 데이터를 나눔
# 디시젼트리는 해석이 가능한 모델 (피쳐의 중요도) //다른 알고리즘은 해답의 이유를 얻기 힘듦
# 단순하게 볼 수 있음 tree형태로 (도메인지식만 있다면 해석 가능)

# overfitting이 발생하기 쉬움 => 앙상블 기반 알고리즘인 랜덤포레스트와 여러부스팅 모델의 기반의 알고리즘 (실제 디시젼트리보다 이런 모델들이 많이쓰임)
```

### 용어

- **Root Node**: 시작 노드
- **Decision Node** (Intermediate Node): 중간 노드
- **Leaf Node** (Terminal Node): 트리의 끝에 있는 노드. 최종 결과를 가진다

### Decision Tree의 과대적합 문제

- 분류는 불순도가 0이 될 때까지, 회귀는 MSE가 0이 될 때까지 분기해 나간다
- 하위 노드가 많아질수록 이상치에 민감해지고 모델이 복잡해져 과대적합이 생긴다
- 적당한 시점에 하위 노드가 더 생기지 않도록 막는 것을 **가지치기(Pruning)** 라고 한다

```python
# 오버피팅을 방지하기 위한 규제파라미터가 많이 있음.
# 질문을 하지 않게 하기 위함 = 가지치기
```

### 하이퍼파라미터

| 하이퍼파라미터 | 뜻 | 기본값 |
|---|---|---|
| `max_depth` | 트리의 최대 깊이(질문 단계) | None (완벽히 나뉠 때까지) |
| `max_leaf_nodes` | 리프 노드 최대 개수 | None (제한 없음) |
| `min_samples_leaf` | 리프 노드가 가져야 할 최소 샘플 수. 정수(개수) 또는 실수(비율) | 1 |
| `min_samples_split` | 분할하려면 필요한 최소 샘플 수 | 2 |
| `max_features` | 분기할 때마다 사용할 feature 수 | None (전체) |
| `criterion` | 분기 기준 계산 방식. 분류 `"gini"`(기본), `"entropy"` / 회귀 `"squared_error"`(기본) 등 | |

`max_features`는 정수(개수), 0~1 실수(비율), `"sqrt"`, `"log2"`를 받는다. feature가 25개면 `"sqrt"`는 5개, `"log2"`는 log₂25 ≈ 4.64라서 5개를 쓴다.

## Feature 중요도

- **`feature_importances_`** 속성: 학습 결과를 바탕으로 각 feature의 중요도를 반환한다
- 전처리 단계에서 중요한 feature를 고를 때 결정 트리를 쓰기도 한다

## Wine 데이터셋: 색 분류

- [UCI Wine Quality](https://archive.ics.uci.edu/ml/datasets/Wine+Quality)
- feature: 와인 화학 성분 11개(고정 산도, 휘발성 산도, 시트르산, 잔류 당분, 염화물, 자유/총 이산화황, 밀도, pH, 황산염, 알코올)와 등급 `quality`(A > B > C)
- target: `color` (0: white, 1: red)

```python
import pandas as pd
wine = pd.read_csv("data/wine.csv")
wine.shape
```

```text
(6497, 13)
```

```python
wine.info()
```

```text
<class 'pandas.core.frame.DataFrame'>
RangeIndex: 6497 entries, 0 to 6496
Data columns (total 13 columns):
 #   Column                Non-Null Count  Dtype  
---  ------                --------------  -----  
 0   fixed acidity         6497 non-null   float64
 1   volatile acidity      6497 non-null   float64
 2   citric acid           6497 non-null   float64
 3   residual sugar        6497 non-null   float64
 4   chlorides             6497 non-null   float64
 5   free sulfur dioxide   6497 non-null   float64
 6   total sulfur dioxide  6497 non-null   float64
 7   density               6497 non-null   float64
 8   pH                    6497 non-null   float64
 9   sulphates             6497 non-null   float64
 10  alcohol               6497 non-null   float64
 11  quality               6497 non-null   object 
 12  color                 6497 non-null   int64  
dtypes: float64(11), int64(1), object(1)
memory usage: 660.0+ KB
```

결측치는 없다.

```python
wine.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 13열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>fixed acidity</th><th>volatile acidity</th><th>citric acid</th><th>residual sugar</th><th>chlorides</th><th>free sulfur dioxide</th><th>total sulfur dioxide</th><th>density</th><th>pH</th><th>sulphates</th><th>alcohol</th><th>quality</th><th>color</th></tr></thead><tbody><tr><th class="idx">0</th><td>7.4</td><td>0.7</td><td>0.0</td><td>1.9</td><td>0.076</td><td>11.0</td><td>34.0</td><td>0.9978</td><td>3.51</td><td>0.56</td><td>9.4</td><td>C</td><td>1</td></tr><tr><th class="idx">1</th><td>7.8</td><td>0.88</td><td>0.0</td><td>2.6</td><td>0.098</td><td>25.0</td><td>67.0</td><td>0.9968</td><td>3.2</td><td>0.68</td><td>9.8</td><td>C</td><td>1</td></tr><tr><th class="idx">2</th><td>7.8</td><td>0.76</td><td>0.04</td><td>2.3</td><td>0.092</td><td>15.0</td><td>54.0</td><td>0.997</td><td>3.26</td><td>0.65</td><td>9.8</td><td>C</td><td>1</td></tr><tr><th class="idx">3</th><td>11.2</td><td>0.28</td><td>0.56</td><td>1.9</td><td>0.075</td><td>17.0</td><td>60.0</td><td>0.998</td><td>3.16</td><td>0.58</td><td>9.8</td><td>B</td><td>1</td></tr><tr><th class="idx">4</th><td>7.4</td><td>0.7</td><td>0.0</td><td>1.9</td><td>0.076</td><td>11.0</td><td>34.0</td><td>0.9978</td><td>3.51</td><td>0.56</td><td>9.4</td><td>C</td><td>1</td></tr></tbody></table></div></div>

전처리 원칙을 다시 정리해 둔다.

> - **트리 계열**: 범주형은 Label Encoding, 연속형은 Feature Scaling을 **하지 않는다**
> - **선형 계열** (모든 feature를 한 연산에 넣어 예측하는 모델): 범주형은 One Hot Encoding, 연속형은 Feature Scaling을 **한다**

```python
# X, y 분리
X = wine.drop(columns='color').values
y = wine['color'].values
```

```python
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
```

등급 `quality`를 레이블 인코딩한다.

```python
## quality LabelEncoding
from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
le.fit(['A', 'B', 'C'])
X_train[:, -1] = le.transform(X_train[:, -1]) # quality를 조회 변환.
X_test[:, -1] = le.transform(X_test[:, -1])
```

> **보충** 여기서는 등급 순서(A > B > C)와 알파벳 순서가 같아서 0, 1, 2가 순서를 그대로 담는다. 순서가 있는 범주(순위 변수)는 이렇게 순서대로 정수를 매기면 트리가 "B 이상인가" 같은 질문을 할 수 있다.

### DecisionTreeClassifier 학습과 평가

```python
from sklearn.tree import DecisionTreeClassifier
tree = DecisionTreeClassifier(random_state=0)
tree.fit(X_train, y_train)
```

```text
DecisionTreeClassifier(random_state=0)
```

규제 없이 학습시키면 얼마나 깊어지는지 본다.

```python
print("Depth 조회:", tree.get_depth())
print("Leaf nodes의 개수:", tree.get_n_leaves())
```

```text
Depth 조회: 13
Leaf nodes의 개수: 55
```

```python
from metrics import print_binary_classification_metrics
print_binary_classification_metrics(
    y_train,
    tree.predict(X_train),
    tree.predict_proba(X_train)[:, 1],
    "Train set 평가결과"
)
```

```text
Train set 평가결과
정확도: 0.9997947454844006
재현율: 1.0
정밀도: 0.9991666666666666
F1 점수: 0.9995831596498541
Average Precision: 0.9999986099527384
ROC-AUC Score: 0.9999997729299327
```

```python
print_binary_classification_metrics(
    y_test,
    tree.predict(X_test),
    tree.predict_proba(X_test)[:, 1],
    "Test set 평가결과"
)
```

```text
Test set 평가결과
정확도: 0.9858461538461538
재현율: 0.965
정밀도: 0.9772151898734177
F1 점수: 0.9710691823899371
Average Precision: 0.9516280428432327
ROC-AUC Score: 0.9788265306122449
```

> **보충** train은 거의 완벽하고 test도 정확도 0.98이 넘지만, test의 AP(0.95)와 ROC-AUC가 train보다 눈에 띄게 낮다. 깊이 13까지 끝까지 자란 트리는 리프 대부분이 한 클래스만 가진 순수 노드라 확률이 0 아니면 1로만 나온다. 확률을 촘촘하게 매기지 못하니 임계값을 바꿔 가며 보는 지표에서 손해를 본다.

### Feature 중요도 조회

전처리 단계에서 추론에 도움이 안 되는 feature를 찾아낼 때 쓸 수 있다.

```python
### fit() 뒤에 feature 중요도 조회
fi = tree.feature_importances_
fi
```

```text
array([0.00215273, 0.0170795 , 0.00306507, 0.00443252, 0.20950343,
       0.00077958, 0.68631811, 0.05093937, 0.01158388, 0.01314941,
       0.00099639, 0.        ])
```

```python
fi.sum()
```

```text
np.float64(1.0)
```

중요도의 합은 1이다.

```python
import pandas as pd
fi_s = pd.Series(fi, index=wine.columns[:-1]).sort_values(ascending=False)
fi_s
```

```text
total sulfur dioxide    0.686318
chlorides               0.209503
density                 0.050939
volatile acidity        0.017080
sulphates               0.013149
pH                      0.011584
residual sugar          0.004433
citric acid             0.003065
fixed acidity           0.002153
alcohol                 0.000996
free sulfur dioxide     0.000780
quality                 0.000000
dtype: float64
```

```python
fi_s.plot(kind='barh');
```

![그래프 출력](/images/ml/ml-tree-randomforest-1.png)

총 이산화황 하나가 약 70%를 차지하고, 등급(quality)은 0이다. 색을 가르는 데 등급은 전혀 쓰이지 않았다.

## GridSearchCV 적용

가지치기 파라미터를 찾고, best model로 feature 중요도와 구조를 확인한다.

- `max_depth`: 1 ~ 13
- `max_leaf_nodes`: 10 ~ 55
- `min_samples_leaf`: 10 ~ 1000, 50씩
- `max_features`: 1 ~ 12

위의 13과 55는 규제 없는 트리의 깊이와 리프 수를 상한으로 잡은 것이다.

```python
import pandas as pd
wine = pd.read_csv("data/wine.csv")

X = wine.drop(columns="color")
y = wine['color']
```

```python
from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
le.fit(['A', 'B', 'C'])
X['quality'] = le.fit_transform(X['quality'])
```

```python
from sklearn.model_selection import train_test_split, GridSearchCV
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
```

조합이 13 × 46 × 20 × 12 = 143,520개라 RandomizedSearchCV로 60개만 시험한다.

```python
from sklearn.model_selection import RandomizedSearchCV
from sklearn.tree import DecisionTreeClassifier
params = {
    "max_depth":range(1, 14),
    "max_leaf_nodes": range(10, 56),
    "min_samples_leaf": range(10, 1001, 50),
    "max_features": range(1, 13)
}
# gs = GridSearchCV(
gs = RandomizedSearchCV(
    DecisionTreeClassifier(random_state=0),
    params,
    n_iter=60,
    scoring='accuracy',
    cv=5,
    n_jobs=-1,
    random_state=0
)
gs.fit(X_train, y_train)
```

```text
RandomizedSearchCV(cv=5, estimator=DecisionTreeClassifier(random_state=0),
                   n_iter=60, n_jobs=-1,
                   param_distributions={'max_depth': range(1, 14),
                                        'max_features': range(1, 13),
                                        'max_leaf_nodes': range(10, 56),
                                        'min_samples_leaf': range(10, 1001, 50)},
                   random_state=0, scoring='accuracy')
```

> **보충** 재현을 위해 `random_state=0`을 추가했다. 그래서 best 조합은 노트북과 다르다.

```python
gs.best_score_
```

```text
np.float64(0.9829648817985575)
```

```python
gs.best_params_
```

```text
{'min_samples_leaf': 10, 'max_leaf_nodes': 19, 'max_features': 10, 'max_depth': 5}
```

```python
result_cv = pd.DataFrame(gs.cv_results_).sort_values("rank_test_score")
result_cv[["param_max_depth", "param_max_leaf_nodes", "param_min_samples_leaf", "param_max_features", "mean_test_score"]].head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 5열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>param_max_depth</th><th>param_max_leaf_nodes</th><th>param_min_samples_leaf</th><th>param_max_features</th><th>mean_test_score</th></tr></thead><tbody><tr><th class="idx">9</th><td>5</td><td>19</td><td>10</td><td>10</td><td>0.982965</td></tr><tr><th class="idx">52</th><td>6</td><td>50</td><td>10</td><td>9</td><td>0.982143</td></tr><tr><th class="idx">8</th><td>5</td><td>48</td><td>10</td><td>5</td><td>0.978243</td></tr><tr><th class="idx">24</th><td>3</td><td>42</td><td>60</td><td>11</td><td>0.969622</td></tr><tr><th class="idx">7</th><td>11</td><td>19</td><td>10</td><td>3</td><td>0.963875</td></tr></tbody></table></div></div>

### Best model로 Feature importance 확인

```python
best_model = gs.best_estimator_
fi = pd.Series(best_model.feature_importances_, index=wine.columns[:-1]).sort_values(ascending=False)
fi
```

```text
total sulfur dioxide    0.721843
chlorides               0.110513
volatile acidity        0.094579
sulphates               0.041039
pH                      0.014769
fixed acidity           0.010847
density                 0.006410
citric acid             0.000000
residual sugar          0.000000
free sulfur dioxide     0.000000
alcohol                 0.000000
quality                 0.000000
dtype: float64
```

```python
fi.sort_values().plot(kind="barh");
```

![그래프 출력](/images/ml/ml-tree-randomforest-2.png)

### graphviz로 Best Model 구조 확인

```python
from sklearn.tree import export_graphviz
from graphviz import Source

graph = Source(
    export_graphviz(
        best_model,
        feature_names=wine.columns[:-1],
        class_names = ["White", "Red"],
        filled=True,
        rounded=True
    )
)
graph
```

![와인 색 분류 Best Model 트리](/images/ml/ml-tree-randomforest-wine.png)

## 회귀 트리: DecisionTreeRegressor

```python
import pandas as pd
from sklearn.model_selection import train_test_split

df = pd.read_csv("data/boston_dataset.csv")
X = df.drop(columns='MEDV')
y = df['MEDV']
X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=0)
X_train.shape, X_test.shape
```

```text
((379, 13), (127, 13))
```

```python
from sklearn.tree import DecisionTreeRegressor, export_graphviz
from graphviz import Source
from metrics import print_regression_metrcis

model = DecisionTreeRegressor(max_depth=2, random_state=0)
model.fit(X_train, y_train)
```

```text
DecisionTreeRegressor(max_depth=2, random_state=0)
```

```python
## 분기 구조를 시각화
graph = Source(
    export_graphviz(
        model,
        feature_names=X.columns,
        filled=True, rounded=True
    )
)

graph
```

![깊이 2 회귀 트리](/images/ml/ml-tree-randomforest-boston.png)

루트 노드의 `squared_error = 85.308`이 무슨 값인지 직접 계산해 봤다.

```python
((y_train - y_train.mean())**2).mean() #예측하는 방식이 스코어로는 y값 평균의 오차
# 가지가 뻗어나가는건 오차가 0까지 그런데 오차가 0이면 벨리데이션 셋에서는 스코어가 낮을거임
```

```text
np.float64(85.30823553163789)
```

루트 노드는 아직 아무 질문도 안 했으니 **train 전체의 평균**(22.609)으로 예측하고, 그때의 MSE가 85.308이다. 회귀 노드는 이렇게 읽는다.

```text
LSTAT <= 8.13   # 노드를 분기하기 위한 질문 (오차가 가장 적게 나뉘도록 하는 질문)
=============아래: 현재 노드의 상태=================
squared_error = 85.308   # 현재 노드로 추론했을 때(value) 예상 오차(mean squared error)
samples=379                # 현재노드의 데이터(sample) 개수
value = 22.609              # 현재노드로 추론했을때 결과값. (이 노드 y값들의 평균)
```

```python
print(model.get_depth()) # 모델 학습한 depth 크기
print(model.get_n_leaves()) # 리프노드 개수
```

```text
2
4
```

```python
print_regression_metrcis(y_train, model.predict(X_train))
```

```text
MSE: 23.175292750947712
RMSE: 4.814072366608931
R Squared: 0.7283346372537175
```

```python
print_regression_metrcis(y_test, model.predict(X_test))
```

```text
MSE: 33.32551599016633
RMSE: 5.772825650421666
R Squared: 0.5920940318375818
```

```python
fi = pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=False)
fi
```

```text
LSTAT      0.783841
RM         0.216159
CRIM       0.000000
ZN         0.000000
INDUS      0.000000
CHAS       0.000000
NOX        0.000000
AGE        0.000000
DIS        0.000000
RAD        0.000000
TAX        0.000000
PTRATIO    0.000000
B          0.000000
dtype: float64
```

깊이 2짜리 트리는 질문에 쓴 `LSTAT`(하위계층 비율)과 `RM`(방 개수) 두 개만 중요도를 가진다.

## 앙상블(Ensemble)

- 하나의 모델만 쓰지 않고 **여러 모델을 학습시켜 결합**하는 방식
- 여러 모델을 조합해 과대적합을 막고 일반화 성능을 높일 수 있다
- 개별 모델의 성능이 잘 안 나올 때 도움이 된다

```python
# 여러 모델을 가지고 예측 (알고리즘모델을 관리하는 모델)
# 데이터가 단순한 경우 앙상블 모델을 굳이 쓸 필요없음
# ex. feature, data 多
# 개별 모델의 성능이 좋지 못할때 사용
```

### 1. 투표 방식

여러 추정기(Estimator)가 낸 결과를 **투표**해서 최종 결과를 낸다.

- **Bagging**: **같은 알고리즘**을 조합하되, 각각 **다른 데이터**로 학습한다. 랜덤 포레스트가 배깅 기반이다
- **Voting**: **서로 다른 알고리즘**들을 결합한다

수업에서 표로 정리했다.

```python
######################################
## Bagging => 동일한 알고리즘 모델의 값을 통해 결과를 냄 (데이터가 多) => 랜덤포레스트: 다수의 Decisiontree활용
## ***배깅은 데이터셋을 랜덤 복원추출해야 함 (중요)
######################################
##     모델       ##    데이터셋 (1,2,3,4,5)
######################################
## Decision Tree  ## (2,2,3,5,4)
## Decision Tree  ## (1,2,3,4,4)
######################################
## Voting 서로 다른 알고리즘 모델의 값을
## 투표해서 가장 표가 많은 결과를 택함 (알고리즘 多) -> 그 알고리즘이 각각 다른 형태로 답을 도출하는 모델이여야 효과가 좋음
######################################
##      모델	  ##      예측      ##
######################################
## Decision Tree  ##	고양이      ##
##     KNN	      ##    강아지      ##
## Random Forest  ##	고양이      ##
######################################
##      최종 결과 = 고양이          ##
######################################
```

```python
# 완전히 다른 데이터셋을 준비하는 건 아니고
# 원본 데이터에서 랜덤하게 뽑아서
# 조금씩 다른 학습 데이터를 만드는 방식
# 중복가능, 완전빠질수도있음 = 행이 중복되거나 빠짐
#  feature(컬럼)도 랜덤하게 골라서
# Bootstrap Sampling(부트스트랩 샘플링)
```

**복원 추출**이 핵심이다. 원본에서 하나 뽑고 다시 넣고 또 뽑기 때문에, 같은 크기로 뽑아도 `(2,2,3,5,4)`처럼 어떤 행은 두 번 나오고 어떤 행(1)은 빠진다.

```python
# 보충: 부트스트랩 샘플링을 직접 해 보면
import numpy as np
rng = np.random.default_rng(0)
data = np.arange(1, 11)
for i in range(3):
    sample = rng.choice(data, size=data.size, replace=True)  # 복원 추출
    print([int(v) for v in sorted(sample)], "빠진 값:", sorted(int(v) for v in set(data) - set(sample)))
```

```text
[1, 1, 1, 2, 3, 4, 6, 7, 9, 9] 빠진 값: [5, 8, 10]
[6, 6, 6, 7, 7, 7, 8, 10, 10, 10] 빠진 값: [1, 2, 3, 4, 5, 9]
[1, 1, 3, 4, 6, 7, 8, 8, 9, 9] 빠진 값: [2, 5, 10]
```

> **보충** n개에서 n번 복원 추출하면 각 행이 한 번도 안 뽑힐 확률은 $(1-\frac{1}{n})^n \approx 0.368$이다. 트리마다 약 37%의 데이터를 못 보고 학습하는 셈이고, 이 안 뽑힌 데이터(OOB, Out-Of-Bag)로 검증할 수도 있다(`oob_score=True`).

### 2. 부스팅(Boosting)

- 약한 학습기(Weak Learner)들을 결합해 정확하고 강력한 학습기(Strong Learner)를 만든다
- 학습기들이 **순서대로** 일하며, 뒤의 학습기는 앞의 학습기가 찾지 못한 부분을 추가로 찾는다

```python
# 대표 => XGBoost / LightGBM / AdaBoost
# 이전 모델의 틀린 문제를
# 다음 모델이 계속 보완하면서 학습하는 방식
```

부스팅은 다음 글에서 자세히 다룬다.

## Random Forest (랜덤 포레스트)

- **Bagging** 방식의 앙상블 모델로, Decision Tree를 기반으로 한다
- N개의 결정 트리를 만들어 각각 추론하게 한 뒤, 가장 많이 나온 결과를 최종 결과로 정한다
- 처리 속도가 빠르고 성능도 높은 모델로 알려져 있다

> - **Random**: 학습할 때 train 데이터를 랜덤하게 샘플링한다
> - **Forest**: 여러 개의 트리 모델을 앙상블한다

![랜덤 포레스트: 여러 트리의 투표로 최종 결과를 정한다](/images/ml/fig-random-forest.png)

**절차**

1. 트리 개수와 트리 하이퍼파라미터를 받아 생성한다. 모든 트리는 같은 하이퍼파라미터를 가진다
2. 학습할 때 트리마다 **부트스트랩 샘플링**으로 데이터셋을 따로 만든다. 크기는 원본과 같지만 일부는 빠지고 일부는 중복된다
3. feature도 **전체 중 일부만** 랜덤하게 쓴다
4. 분류는 트리들의 예측을 모아 **다수결**, 회귀는 **평균**으로 결과를 낸다

```python
# 데이터 多 (데이터수, feature수) => 복잡도 높음 => 모델의 복잡도를 높여야 함
# 데이터는 겹치게 해서 데이터 수는 맞추고, 컬럼(패턴)은 일부만
# 여러 규칙으로 라벨을 찾아냄
```

> **보충** scikit-learn의 랜덤 포레스트는 feature를 **트리마다** 고르는 게 아니라 **분기할 때마다** `max_features`개를 새로 랜덤하게 뽑는다. 트리 하나 안에서도 노드마다 후보 feature가 다르다. 그래서 같은 데이터에서도 트리들이 서로 다른 질문을 하게 되고, 이 다양성이 앙상블의 효과를 만든다.

**주요 하이퍼파라미터**

- `n_estimators`: 결정 트리 개수. 시간과 메모리가 허용하는 범위에서 클수록 좋다
- `max_features`: 각 분기에서 고려할 feature 개수. **작을수록** 트리들이 서로 더 달라지고, 클수록 비슷해진다
- 결정 트리의 하이퍼파라미터: `max_depth`, `min_samples_leaf` 등 과대적합을 막는 파라미터를 그대로 적용한다

> **보충** 노트북 정리에는 `max_features`가 "클수록 트리 간 feature 차이가 크다"고 적혀 있는데 반대다. 각 분기에서 고를 수 있는 feature가 많을수록 트리들이 같은 "가장 좋은" feature를 고르게 되어 서로 비슷해진다. `max_features`를 전체 feature 수로 주면 무작위성은 부트스트랩 샘플링에서만 나온다.

### 와인 색 분류

```python
import pandas as pd
from sklearn.model_selection import train_test_split

df = pd.read_csv('data/wine.csv')
X = df.drop(columns=['color', 'quality'])
y = df['color']

X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=42)

X.shape
```

```text
(6497, 11)
```

```python
from sklearn.ensemble import RandomForestClassifier
rfc = RandomForestClassifier(
    n_estimators=200, # DecisionTree 개수. (최소 200개) 많을수록 안정적이지만 속도는 느려짐
    max_features=10,  # 지정한 feature수 내에서 random하게 feature들을 선택. (1~10개 사이)
    max_depth=5,      # DecisionTree hyper parameter (모든 Decision Tree 모델들은 동일한 하이퍼파라미터를 가진다..)
    random_state=0,
    n_jobs=-1,        # 개별 DecisionTree 학습, 추론시 병렬 처리 할 때 사용할 프로세서 개수.(각 모델은 독립적으로 학습/추정한다. -1 : 모든 프로세서 다 사용)
)
```

> **보충** `max_features=10`은 "1~10개 사이에서 랜덤"이 아니라 **분기마다 정확히 10개**를 랜덤하게 고른다는 뜻이다. feature가 11개뿐이니 매번 하나만 빠지는 셈이라 무작위성이 꽤 약한 설정이다.

```python
# 학습(Train)
rfc.fit(X_train, y_train)

# 검증
## 추론: 클래스 결과과
pred_train = rfc.predict(X_train)
pred_test = rfc.predict(X_test)

## 추론: 클래스별 확률 결과
pred_train_proba = rfc.predict_proba(X_train)
pred_test_proba = rfc.predict_proba(X_test)
```

```python
## 평가
from metrics import print_binary_classification_metrics
print_binary_classification_metrics(
    y_train, pred_train, pred_train_proba[:, 1], "Train set 검증결과"
)
```

```text
Train set 검증결과
정확도: 0.9932266009852216
재현율: 0.9749791492910759
정밀도: 0.9974402730375427
F1 점수: 0.986081822016027
Average Precision: 0.996956055615141
ROC-AUC Score: 0.9981379119136171
```

```python
# 정확도 0.9정도 넘으면 잘 안틀리는 모델임
```

```python
print_binary_classification_metrics(
    y_test, pred_test, pred_test_proba[:, 1], "Test set"
)
```

```text
Test set
정확도: 0.9895384615384616
재현율: 0.9725
정밀도: 0.9848101265822785
F1 점수: 0.9786163522012579
Average Precision: 0.9977918586934834
ROC-AUC Score: 0.9991867346938775
```

깊이 5로 제한했는데도 단일 트리(깊이 13)보다 test의 AP·ROC-AUC가 훨씬 높다. 트리 200개가 낸 확률의 평균이라 확률값이 촘촘해졌기 때문이다.

노트북에서 실행하지 않고 남겨 둔 feature 중요도 셀이다.

```python
fi = pd.Series(rfc.feature_importances_, index=X.columns).sort_values(ascending=False)
fi
```

```text
total sulfur dioxide    0.472350
chlorides               0.421701
volatile acidity        0.036533
density                 0.022475
sulphates               0.013824
fixed acidity           0.013754
pH                      0.008313
residual sugar          0.005273
citric acid             0.002695
alcohol                 0.001865
free sulfur dioxide     0.001218
dtype: float64
```

단일 트리는 총 이산화황 하나에 70%가 몰렸는데, 랜덤 포레스트는 중요도가 여러 feature로 나뉜다. 분기마다 feature가 랜덤하게 빠지니 다른 feature로도 나누는 법을 배운 결과다.

## 보스턴 집값 회귀: RandomForestRegressor

```python
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, GridSearchCV

df = pd.read_csv('data/boston_dataset.csv')
X = df.drop(columns="MEDV").values
y = df['MEDV'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
```

```python
model = RandomForestRegressor(random_state=42)
param_grid = {
    "n_estimators": [200, 400, 600],
    "max_depth": [None, 3,  6, 10],
    "min_samples_leaf": [1, 2, 4, 6],
}
gs = GridSearchCV(
    estimator=model,
    param_grid=param_grid,
    scoring=['r2', 'neg_mean_squared_error'],
    refit="r2",
    n_jobs=-1,
)
gs.fit(X_train, y_train)
```

```text
GridSearchCV(estimator=RandomForestRegressor(random_state=42), n_jobs=-1,
             param_grid={'max_depth': [None, 3, 6, 10],
                         'min_samples_leaf': [1, 2, 4, 6],
                         'n_estimators': [200, 400, 600]},
             refit='r2', scoring=['r2', 'neg_mean_squared_error'])
```

```python
gs_pd = pd.DataFrame(gs.cv_results_).sort_values("rank_test_neg_mean_squared_error")
gs_pd[['param_n_estimators', 'param_max_depth', 'param_min_samples_leaf', 'mean_test_r2', 'mean_test_neg_mean_squared_error']].head(5)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 5열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>param_n_estimators</th><th>param_max_depth</th><th>param_min_samples_leaf</th><th>mean_test_r2</th><th>mean_test_neg_mean_squared_error</th></tr></thead><tbody><tr><th class="idx">3</th><td>200</td><td><span class="sql-null">None</span></td><td>2</td><td>0.824948</td><td>-14.896407</td></tr><tr><th class="idx">39</th><td>200</td><td>10</td><td>2</td><td>0.825016</td><td>-14.898342</td></tr><tr><th class="idx">0</th><td>200</td><td><span class="sql-null">None</span></td><td>1</td><td>0.824808</td><td>-14.981246</td></tr><tr><th class="idx">1</th><td>400</td><td><span class="sql-null">None</span></td><td>1</td><td>0.824579</td><td>-14.993776</td></tr><tr><th class="idx">2</th><td>600</td><td><span class="sql-null">None</span></td><td>1</td><td>0.824259</td><td>-15.050828</td></tr></tbody></table></div></div>

```python
print(gs.best_params_)
gs.best_score_
```

```text
{'max_depth': 10, 'min_samples_leaf': 2, 'n_estimators': 200}
```

```text
np.float64(0.8250156915728024)
```

```python
y_pred = gs.predict(X_test)
from sklearn.metrics import r2_score, mean_squared_error

r2_score(y_test, y_pred)
```

```text
0.8653729530821214
```

```python
mean_squared_error(y_test, y_pred)
```

```text
9.872710666190338
```

> **보충** `cv`를 지정하지 않으면 기본값 5-fold다. 3 × 4 × 4 = 48개 조합을 5번씩, 트리를 최대 600개씩 학습하니 이 글에서 가장 오래 걸리는 셀이다. 상위 조합들의 점수 차이가 거의 없어서, 실제로는 `n_estimators` 후보를 줄여도 결과는 비슷하다.

## 정리

- 결정 트리는 불순도(분류)나 오차(회귀)를 가장 많이 줄이는 질문으로 데이터를 나눈다. 해석이 쉽지만 **과대적합되기 쉽다**
- 가지치기 하이퍼파라미터(`max_depth`, `max_leaf_nodes`, `min_samples_leaf` 등)로 복잡도를 제한한다
- `feature_importances_`로 어떤 feature가 예측에 쓰였는지 본다
- 앙상블은 **배깅**(같은 알고리즘 + 다른 데이터), **보팅**(다른 알고리즘), **부스팅**(순차적으로 오차 보완)으로 나뉜다
- 랜덤 포레스트는 **부트스트랩 샘플링 + 분기마다 랜덤 feature**로 서로 다른 트리를 많이 만들어 투표한다. 단일 트리보다 안정적이고 확률도 촘촘하다
