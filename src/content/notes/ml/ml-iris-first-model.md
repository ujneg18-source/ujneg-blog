---
title: "첫 번째 머신러닝: Iris로 보는 예측 모델의 흐름"
description: "머신러닝의 Hello World인 Iris 데이터셋으로 scikit-learn 내장 데이터셋(Bunch) 구조를 살펴보고, 규칙 기반 조회와 결정 트리 모델을 비교한 뒤 train/test 분할, 정확도, 혼동행렬로 모델을 평가하는 전체 흐름을 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 4
originalNotebook: "02_첫번째 머신러닝 분석 - Iris_분석.ipynb"
tags: ["Python","scikit-learn","Decision Tree","Iris"]
date: 2026-05-14
---

> SKN31 머신러닝 과정 노트북 `02_첫번째 머신러닝 분석 - Iris_분석.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- Iris 데이터셋과 scikit-learn 내장 데이터셋(Bunch)의 구조
- DataFrame으로 바꿔서 살펴보기
- 규칙 기반으로 품종 찾아보기
- 결정 트리(Decision Tree)로 모델 만들기: import → 생성 → 학습 → 예측
- train/test 분할과 정확도, 혼동행렬로 평가하기

## Iris 데이터셋: 머신러닝의 Hello World

Iris(붓꽃) 데이터셋은 통계학자 로널드 피셔(Ronald Fisher)가 1936년 논문에서 사용한 데이터다. 붓꽃 세 품종 **Setosa, Versicolor, Virginica**를 꽃받침(Sepal)과 꽃잎(Petal)의 길이·너비로 분류한다.

![Iris 세 품종](/images/ml/fig-iris-species.png)

```python
# petal width, species 등 알고 싶은 것들을 뭐든 가능
```

## 데이터셋 확인하기

scikit-learn은 모델을 연습해 볼 수 있는 작은 데이터셋(Toy dataset)을 제공한다. `sklearn.datasets` 패키지의 `load_xxxx()` 함수로 불러온다.

불러온 데이터셋은 딕셔너리 구조의 **Bunch** 객체이고, 구성은 이렇다.

| key | 내용 |
|---|---|
| `data` | Feature(입력 변수) |
| `target` | Label(출력 데이터) |
| `feature_names` | 입력 변수 각 항목의 이름 |
| `target_names` | 예측하려는 값(class)의 이름 |
| `DESCR` | 데이터셋 설명 |

```python
from sklearn.datasets import load_iris
iris = load_iris()
print(type(iris))
```

```text
<class 'sklearn.utils._bunch.Bunch'>
```

```python
iris.keys() # Dataset 구성 key값들 조회
```

```text
dict_keys(['data', 'target', 'frame', 'target_names', 'DESCR', 'feature_names', 'filename', 'data_module'])
```

입력 변수부터 본다.

```python
# 입력변수 조회
iris.data # 데이터의 형태 확인
# iris['data']
iris.data.shape # 데이터의 행과 열의 갯수 확인
# (150, 4) # 150개의 데이터, 4개의 피처(입력변수) 2차원 배열, 1
```

```text
(150, 4)
```

```python
# 입력변수명 조회
iris['feature_names']  # 4개의 피처명 조회 #변수명은 내장 변수로 저장되어 있음
type(iris['feature_names']) # 리스트 형태로 저장되어 있음
```

```text
<class 'list'>
```

> **보충** 셀의 마지막 줄만 출력되기 때문에 `type()` 결과인 `list`만 보인다. 피처명 자체는 이렇다.

```python
iris['feature_names']
```

```text
['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)']
```

출력 변수(정답)다.

```python
# 출력변수 조회
print(iris['target']) # 0, 1, 2로 구성된 1차원 배열, 150개의 데이터 3개의 클래스(품종)로 구성된 출력변수
# iris['target'].shape
# 0: setosa, 1: versicolor, 2: virginica

type(iris['target']) # numpy.ndarray 형태로 저장되어 있음 입력변수는 2차원 배열, 출력변수는 1차원 배열
# 입력변수는 150개의 행 데이터와 4개의 컬럼(피처)로 구성
```

```text
[0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 0 0 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 2 2 2 2 2 2 2 2 2 2 2
 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2
 2 2]
```

```text
<class 'numpy.ndarray'>
```

입력은 `(150, 4)` 2차원 배열, 출력은 `(150,)` 1차원 배열이다. 정답은 품종 이름이 아니라 0, 1, 2 숫자로 들어 있고, 숫자가 무슨 품종인지는 `target_names`에 있다.

```python
# 출력 변수의 class의 의미 조회
iris['target_names']
```

```text
array(['setosa', 'versicolor', 'virginica'], dtype='<U10')
```

`DESCR`에는 데이터셋 설명이 들어 있다. 길어서 앞부분만 출력했다.

```python
print("--- IRIS Dataset 설명 ---")  # Dataset이란 무엇인지, 어떤 데이터로 구성되어 있는지 설명
print(iris['DESCR'][:560]) # descr = iris['DESCR'] # Dataset 설명 조회
```

```text
--- IRIS Dataset 설명 ---
.. _iris_dataset:

Iris plants dataset
--------------------

**Data Set Characteristics:**

:Number of Instances: 150 (50 in each of three classes)
:Number of Attributes: 4 numeric, predictive attributes and the class
:Attribute Information:
    - sepal length in cm
    - sepal width in cm
    - petal length in cm
    - petal width in cm
    - class:
            - Iris-Setosa
            - Iris-Versicolour
            - Iris-Virginica

:Summary Statistics:

============== ==== ==== ======= ===== ====================
                Min  Max   Mean    SD 
```

## DataFrame으로 구성하기

배열 상태로는 보기 불편하니 판다스 DataFrame으로 만든다.

> - **DataFrame/Series.apply(함수)**
>   - (DataFrame) 함수에 DataFrame의 컬럼(Series)을 전달해서 처리된 값들을 모아 반환
>   - (Series) 함수에 원소들을 전달해서 처리된 값들을 모아서 반환
>   - 일괄 처리할 때 쓰는 메소드

```python
import pandas as pd

df = pd.DataFrame(
    iris['data'], # 입력변수 데이터로 DataFrame 생성
    columns=iris['feature_names'] # 입력변수명으로 컬럼명 지정
)
df['품종'] = iris['target'] # target은 0, 1, 2로 구성된 숫자이므로 품종이라는 컬럼명으로 바꿔줌

df.head(90) # 150개의 데이터 중 앞에서 90개 데이터 조회, 50개는 setosa, 50개는 versicolor, 50개는 virginica로 구성되어 있음
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 90행 × 5열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>sepal length (cm)</th><th>sepal width (cm)</th><th>petal length (cm)</th><th>petal width (cm)</th><th>품종</th></tr></thead><tbody><tr><th class="idx">0</th><td>5.1</td><td>3.5</td><td>1.4</td><td>0.2</td><td>0</td></tr><tr><th class="idx">1</th><td>4.9</td><td>3.0</td><td>1.4</td><td>0.2</td><td>0</td></tr><tr><th class="idx">2</th><td>4.7</td><td>3.2</td><td>1.3</td><td>0.2</td><td>0</td></tr><tr><th class="idx">3</th><td>4.6</td><td>3.1</td><td>1.5</td><td>0.2</td><td>0</td></tr><tr><th class="idx">4</th><td>5.0</td><td>3.6</td><td>1.4</td><td>0.2</td><td>0</td></tr><tr><td class="ellipsis" colspan="6">⋯</td></tr><tr><th class="idx">85</th><td>6.0</td><td>3.4</td><td>4.5</td><td>1.6</td><td>1</td></tr><tr><th class="idx">86</th><td>6.7</td><td>3.1</td><td>4.7</td><td>1.5</td><td>1</td></tr><tr><th class="idx">87</th><td>6.3</td><td>2.3</td><td>4.4</td><td>1.3</td><td>1</td></tr><tr><th class="idx">88</th><td>5.6</td><td>3.0</td><td>4.1</td><td>1.3</td><td>1</td></tr><tr><th class="idx">89</th><td>5.5</td><td>2.5</td><td>4.0</td><td>1.3</td><td>1</td></tr></tbody></table></div></div>

숫자 품종을 이름으로 바꾼 `품종2` 컬럼을 `apply`로 추가한다.

```python
df['품종2'] = df['품종'].apply(lambda i : iris['target_names'][i])
 # 품종 컬럼의 숫자 데이터를 품종명으로 바꿔주는 작업,
 # lambda 함수로 품종 컬럼의 각 데이터에 대해 iris['target_names'] 리스트에서 해당 인덱스의 값을 가져와서 품종2 컬럼에 저장
print(df['품종2'].value_counts()) # 품종2 컬럼의 각 품종명별 데이터 갯수 조회
print(df['품종2'].unique()) # 품종2 컬럼의 고유한 값 조회
print(df.shape) # DataFrame의 행과 열의 갯수 조회
```

```text
품종2
setosa        50
versicolor    50
virginica     50
Name: count, dtype: int64
[np.str_('setosa') np.str_('versicolor') np.str_('virginica')]
(150, 6)
```

세 품종이 50개씩 같은 수로 들어 있다. 데이터가 품종 순서대로 정렬되어 있어서, 경계인 40~59행을 보면 setosa에서 versicolor로 바뀐다.

```python
df.iloc[40:60, 5] # 품종2 컬럼의 40번째부터 59번째 데이터 조회, 20개의 데이터가 versicolor로 구성되어 있음
```

```text
40        setosa
41        setosa
42        setosa
43        setosa
44        setosa
45        setosa
46        setosa
47        setosa
48        setosa
49        setosa
50    versicolor
51    versicolor
52    versicolor
53    versicolor
54    versicolor
55    versicolor
56    versicolor
57    versicolor
58    versicolor
59    versicolor
Name: 품종2, dtype: object
```

> **보충** 주석에는 "20개가 versicolor"라고 적었는데, 결과를 보면 40~49행 10개는 **setosa**, 50~59행 10개가 versicolor다. 이 정렬 상태는 뒤에서 데이터를 나눌 때 섞어야 하는 이유가 된다.

## 머신러닝을 이용한 예측

### 문제 정의

> 내가 발견한 Iris 꽃받침(Sepal)의 길이(length)와 폭(width)이 각각 5cm, 3.5cm이고 꽃잎(Petal)의 길이와 폭은 각각 1.4cm, 0.25cm였다. 이 꽃은 Iris의 무슨 종일까?

![측정한 붓꽃의 꽃잎·꽃받침 크기](/images/ml/fig-iris-question.png)

### 규칙 기반으로 찾아보기

먼저 사람이 직접 조건을 걸어 비슷한 데이터를 찾아본다.

```python
df[(df['sepal length (cm)'] == 5) & (df['sepal width (cm)'] ==  3.5)]
# sepal length가 5이고 sepal width가 3.5인 데이터 조회, 1개의 데이터가 setosa로 구성되어 있음
# 이 알고리즘은 사람이 패턴을 찾고 그 패턴을 이용해서 예측하는 알고리즘
# #단, 사람이 패턴을 찾기 어려운 경우에는 성능이 좋지 않을 수 있음
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 6열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>sepal length (cm)</th><th>sepal width (cm)</th><th>petal length (cm)</th><th>petal width (cm)</th><th>품종</th><th>품종2</th></tr></thead><tbody><tr><th class="idx">40</th><td>5.0</td><td>3.5</td><td>1.3</td><td>0.3</td><td>0</td><td>setosa</td></tr><tr><th class="idx">43</th><td>5.0</td><td>3.5</td><td>1.6</td><td>0.6</td><td>0</td><td>setosa</td></tr></tbody></table></div></div>

> **보충** 주석에는 1개라고 적었지만 결과는 40번, 43번 **2개**이고 둘 다 setosa다. 그리고 꽃받침 두 값이 정확히 일치하는 행이 없었다면 이 방법은 아무 답도 내지 못한다. 규칙 기반의 한계가 여기서 바로 보인다.

### 머신러닝 적용

**프로그래머가 직접 규칙(패턴)을 만드는 대신, 컴퓨터가 데이터를 학습해 규칙을 자동으로 만들도록 하는 것**이 머신러닝으로 하려는 일이다.

수업에서 알고리즘 종류를 한 번 정리했다.

```python
# 지도학습 - 입력변수와 출력변수가 모두 존재하는 데이터로 학습하는 알고리즘
# 비지도학습 - 입력변수만 존재하는 데이터로 학습하는 알고리

# 지도학습 > 분류하기 위한 공식 - 분류 알고리즘
# 지도학습 > 예측하기 위한 공식 - 회귀 알고리즘
# 비지도학습 > 군집화하기 위한 공식 - 군집화 알고리즘
# 비지도학습 > 차원축소하기 위한 공식 - 차원축소 알고리즘
# 강화학습 > 최적의 행동을 찾기 위한 공식 - 강화학습 알고리즘
# 딥러닝 > 인공신경망을 이용한 알고리즘 - 딥러닝 알고리즘

# 결정트리란 입력변수의 특정값을 기준으로 데이터를 분할하는 방식으로 학습하는 알고리즘,
# 트리구조로 표현되는 알고리즘, 분류와 회귀 모두에 사용될 수 있음
# 즉, 범용 알고리즘
```

## 결정 트리(Decision Tree)로 분류하기

결정 트리는 **독립 변수의 조건에 따라 종속 변수를 분리**하는 알고리즘이다.

![결정 트리 예시](/images/ml/fig-decision-tree.png)

*[참조] www.packtpub.com*

```python
# 20고개 - 20개의 질문으로 정답을 맞추는 게임, 결정트리 알고리즘의 예시,
# 각 질문은 입력변수의 특정값을 기준으로 데이터를 분할하는 방식으로 이루어짐, 최종적으로 정답을 맞추는 것이 목표

# 2진으로 분할하는 결정트리 알고리즘 - 각 질문이 2개의 답변으로 이루어지는 결정트리 알고리즘
# 예시) "입력변수1의 값이 5보다 큰가?" 라는 질문이 있을 때, "예" 또는 "아니오"로 답변하는 방식
```

```python
# Q1 : "sepal length (cm) 컬럼의 값이 5보다 작은가?" 라는 질문이 있을 때, "예" 또는 "아니오"로 답변하는 방식
# Q2 : "sepal width (cm) 컬럼의 값이 3보다 큰가?" 라는 질문이 있을 때, "예" 또는 "아니오"로 답변하는 방식
# 이런 질문을 사이킷런 라이브러리의 DecisionTreeClassifier 클래스를 이용해서 자동으로 만들어주는 알고리즘이 결정트리 알고리즘임
# 사용자는 컨셉만 이해하면 되고, 알고리즘이 알아서 최적의 질문을 만들어주는 방식임
```

스무고개처럼 "이 값이 기준보다 작은가?" 같은 예/아니오 질문을 이어 가며 데이터를 나눈다. 어떤 컬럼을 어떤 기준값으로 물을지를 사람이 아니라 알고리즘이 데이터에서 찾는다.

결정 트리 모델로 머신러닝을 구현하는 순서는 네 단계다.

1. import 모델
2. 모델 생성
3. 모델 학습시키기
4. 예측

### 1. import 모델

```python
# import 모델이란 머신러닝 알고리즘이 구현된 클래스를 불러오는 작업
# 사이킷런 라이브러리에서 제공하는 모델을 사용하기 위해서는 해당 모델이 구현된 클래스를 import 해야 함

from sklearn.tree import DecisionTreeClassifier # CLassifier = 분류하기 위한 모델, Regressor = 회기/예측하기 위한 모델
```

> **보충** 주석의 "회기"는 **회귀**(Regression)다. scikit-learn은 같은 알고리즘이라도 분류용은 `~Classifier`, 회귀용은 `~Regressor`로 이름을 나눈다.

### 2. 모델 생성

```python
model = DecisionTreeClassifier() # 모델 객체 생성, 모델 객체는 모델이 구현된 클래스의 인스턴스, 모델 객체를 이용해서 학습과 예측을 수행할 수 있음
```

### 3. 모델 학습시키기

```python
# 모델 학습 시키는 방법 - fit() 메서드 이용, 모델 객체.fit(입력변수 데이터, 출력변수 데이터) 형태로 사용
model.fit(iris['data'], iris['target']) # 모델 학습, 입력변수 데이터와 출력변수 데이터를 이용해서 모델을 학습시키는 작업
# fit은 모델 객체의 메서드, 모델 객체.fit() 형태로 사용, fit() 메서드는 입력변수 데이터와 출력변수 데이터를 각각 주어야 함
# 입력-출력간의 관계를 찾는 작업
# 범용적인 소스이기 때문에 모든 데이터에서 사용할 수 있지만 다 fit한 것은 아님
# 내장되어있는 파라미터를 통해 데이터와 정합성을 확인하는 작업이 필요함

# 자동으로 확인하는 방법은? 데이터의 형태와 모델이 요구하는 데이터의 형태가 일치하는지 확인하는 방법이 있음
# 모델이 요구하는 데이터의 형태는 모델 객체의 get_params() 메서드를 이용해서 확인할 수 있음
# --- IGNORE ---
# 범용 알고리즘 예시-> y = x + 1 (x), y = x + n(o)
# n(=파라미터)의 값은 모델이 알아서 찾아주는 방식 => iris 데이터셋에서 찾아줌

model.get_params() # 모델이 요구하는 데이터의 형태 확인, 모델 객체의 get_params() 메서드를 이용해서 모델이 요구하는 데이터의 형태를 확인할 수 있음
type(model)
```

```text
<class 'sklearn.tree._classes.DecisionTreeClassifier'>
```

`y = x + n`에서 `n`을 데이터로 찾는다는 메모가 학습의 핵심이다. 알고리즘(`y = x + n`이라는 틀)은 범용이고, 데이터에 맞는 `n`(파라미터)을 찾아 넣는 과정이 `fit()`이다.

> **보충** `get_params()`는 "모델이 요구하는 데이터의 형태"를 알려 주지 않는다. 돌려주는 것은 모델을 만들 때 정하는 설정값, 즉 **하이퍼파라미터** 목록이다. 아래처럼 `max_depth`, `criterion` 같은 값이 나온다. 학습된 모델이 기대하는 입력 형태는 `n_features_in_`(feature 개수) 같은 속성으로 확인한다.

```python
# 보충: get_params()가 실제로 돌려주는 것
print(model.get_params())
print("학습한 feature 수:", model.n_features_in_)
```

```text
{'ccp_alpha': 0.0, 'class_weight': None, 'criterion': 'gini', 'max_depth': None, 'max_features': None, 'max_leaf_nodes': None, 'min_impurity_decrease': 0.0, 'min_samples_leaf': 1, 'min_samples_split': 2, 'min_weight_fraction_leaf': 0.0, 'monotonic_cst': None, 'random_state': None, 'splitter': 'best'}
학습한 feature 수: 4
```

노트북에서는 `fit()`을 한 번 더 실행했다. `fit()`은 모델 객체 자신을 돌려주기 때문에 셀 결과로 모델이 표시된다.

```python
model.fit(iris['data'], iris['target'])
```

```text
DecisionTreeClassifier()
```

### 4. 예측

내가 본 꽃의 꽃받침·꽃잎 길이와 너비를 재서 넣으면 품종을 예측한다. `predict()`에 입력 데이터를 넣으면 label이 나온다.

```python
import numpy as np

new_data = np.array([
    [5, 3.5, 1.4, 0.25],
    [2, 2.2, 5.3, 2.2],
    [1.2, 5, 3.2, 7.6]
])
result = model.predict(new_data) # predict(input Data) -> label 출력
print(result)
```

```text
[0 2 1]
```

```python
for label in result:
    print (label, iris.target_names[label])
```

```text
0 setosa
2 virginica
1 versicolor
```

> **보충** 첫 번째 꽃은 문제에서 잰 값이라 setosa라는 답이 자연스럽다. 두 번째, 세 번째는 꽃받침 길이 1.2cm, 꽃잎 너비 7.6cm처럼 학습 데이터 범위(꽃받침 길이 4.3~7.9cm, 꽃잎 너비 0.1~2.5cm)를 한참 벗어난 값이다. 그래도 모델은 경고 없이 셋 중 하나를 답한다. 분류 모델은 **아는 클래스 중 하나를 고를 뿐** "모르겠다"고 하지 않는다는 점을 기억해 두자. 또 `random_state`를 지정하지 않았기 때문에 이런 범위 밖 입력은 실행할 때마다 다른 답이 나올 수 있다.

## 그런데 이 결과가 맞을까?

- 모델이 추론한 결과가 맞다는 것을 어떻게 보증할 수 있을까?
- 모델을 서비스에 적용하기 전에 **성능을 확인하는 작업**이 필요하다

```python
# DATASET => TRAIN SET 80 / TEST SET 20
# TRAIN 후 TEST검증 얼마나 정확하나에 따라 evaluation
```

### 머신러닝 프로세스

![데이터셋 분리 → 모델 생성 → 학습 → 예측 → 평가](/images/ml/fig-ml-process.png)

### 훈련 데이터셋과 평가(테스트) 데이터셋 분할

- 위에서는 150개 전부로 학습했기 때문에 모델이 좋은지 나쁜지 확인할 데이터가 남아 있지 않다
- 전체 데이터를 둘로 나눠 하나는 **훈련**에, 다른 하나는 **평가**에 쓴다
- 보통 8:2 또는 7:3으로 나누고, 데이터가 충분하면 6:4까지도 나눈다
- **분류 문제는 각 클래스가 같은 비율로 나뉘어야 한다**

`train_test_split()`은 하나의 데이터셋을 두 세트로 나누는 함수다.

```python
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, # x(input data, feature)
    iris.target, # y(output_data, label, target)
    test_size=0.2, #테스트셋의 크기를 비율(0~1 실수) 또는 개수 (정수)
    stratify=iris.target, # 분류일때 지정. 원본의 class별 비율과 동일하게 나눈다.
    random_state=0 # random seed값 지정. 전체 데이터를 랜덤하게 섞은 뒤 분할한다.
                    # 재현성을 위해서 seed를 설정. //# suffle = True 섞어줌 // but 여기서는 일정한 값을 위해 시드값을 지정
                    # why 모델을 수정한 후에 성능을 평가할때, 데이터가 변해서 성능이 올라간 것인지, 모델이 수정해서 올라간 것인지 알 수 없음
                    # 랜덤값이 들어가는 것들은 시드값을 지정해줘야 함


)

X_train.shape, X_test.shape, y_train.shape, y_test.shape
```

```text
((120, 4), (30, 4), (120,), (30,))
```

`random_state`를 정하는 이유를 적어 둔 주석이 중요하다. 매번 다르게 섞이면 성능이 올랐을 때 **모델을 고쳐서인지, 데이터가 달라져서인지** 구분할 수 없다.

원본 target은 품종 순서대로 정렬되어 있다.

```python
iris.target
```

```text
array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
       1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
       1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
       2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
       2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2])
```

나눈 뒤의 `y_train`은 섞여 있다.

```python
y_train
```

```text
array([0, 0, 0, 0, 1, 0, 2, 2, 1, 2, 2, 1, 0, 1, 2, 2, 0, 1, 1, 0, 2, 0,
       0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0, 2, 2, 1, 2, 1, 2, 1, 1, 1, 0, 0,
       1, 1, 2, 2, 1, 0, 2, 2, 0, 0, 1, 1, 0, 0, 1, 2, 0, 0, 1, 1, 2, 1,
       2, 0, 0, 2, 1, 1, 0, 0, 2, 1, 2, 0, 1, 2, 2, 1, 2, 0, 1, 0, 0, 2,
       2, 1, 2, 0, 0, 0, 0, 0, 1, 1, 1, 2, 0, 2, 0, 2, 0, 1, 1, 1, 1, 0,
       2, 2, 0, 1, 1, 2, 0, 2, 2, 2])
```

`stratify`로 나눴으니 클래스별 개수 비율이 원본과 같은지 확인한다.

```python
#trianset의 y의 class
print(np.unique(y_train, return_counts = True))
print(np.unique(y_test, return_counts = True))
print(np.unique(iris.target, return_counts = True))
```

```text
(array([0, 1, 2]), array([40, 40, 40]))
(array([0, 1, 2]), array([10, 10, 10]))
(array([0, 1, 2]), array([50, 50, 50]))
```

원본 50:50:50이 train 40:40:40, test 10:10:10으로 같은 비율을 유지했다.

### 모델 생성과 학습

이번에는 **train set으로만** 학습한다.

```python
# 모델 생성
tree_model = DecisionTreeClassifier()

# 모델 학습 - train set으로 학습
tree_model.fit(X_train, y_train)
```

```text
DecisionTreeClassifier()
```

### 평가

머신러닝 평가지표 함수는 `sklearn.metrics` 모듈에 있다. **정확도(accuracy)** 는 전체 예측 중 맞힌 개수의 비율이고, `accuracy_score(정답, 예측값)`으로 계산한다.

```python
from sklearn.metrics import accuracy_score
# 모델의 예츠 결과
pred_train = tree_model.predict(X_train)
pred_test = tree_model.predict(X_test)

acc_train = accuracy_score(y_train, pred_train) # 파라미터 = 정답, 모델예측값
acc_test = accuracy_score(y_test, pred_test) # 파라미터 = 정답, 모델예측값

print(f"Trainset 정확도: {acc_train}, Testset 정확도: {acc_test:.5f}")
```

```text
Trainset 정확도: 1.0, Testset 정확도: 0.96667
```

> **보충** train 정확도는 1.0(100%), test 정확도는 0.96667이다. 학습에 쓴 데이터는 모두 맞히지만 처음 보는 데이터에서는 30개 중 1개를 틀렸다. 학습 데이터 성능이 평가 데이터보다 높은 이 차이가 커지면 **과적합**이다. 과적합은 시리즈 뒤쪽에서 따로 다룬다.

### 혼동행렬 (Confusion Matrix)

정확도는 "몇 개 맞혔나"만 알려 준다. **어떤 클래스를 어떤 클래스로 헷갈렸는지**는 혼동행렬로 본다.

- 모델이 예측한 결과와 실제 정답의 개수를 표로 보여 준다
- 분류의 평가 지표로 쓰인다. `sklearn.metrics.confusion_matrix()`
- 결과 구조
  - axis=0(행) index: **정답(실제)** class
  - axis=1(열) index: **예측 결과** class
  - 값: 개수

```python
from sklearn.metrics import confusion_matrix

cm_train = confusion_matrix(y_train, pred_train)
cm_test = confusion_matrix(y_test, pred_test)
```

```python
cm_train
```

```text
array([[40,  0,  0],
       [ 0, 40,  0],
       [ 0,  0, 40]])
```

```python
pd.DataFrame(cm_train)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0</th><th>1</th><th>2</th></tr></thead><tbody><tr><th class="idx">0</th><td>40</td><td>0</td><td>0</td></tr><tr><th class="idx">1</th><td>0</td><td>40</td><td>0</td></tr><tr><th class="idx">2</th><td>0</td><td>0</td><td>40</td></tr></tbody></table></div></div>

train set은 대각선에만 40씩 있어 모두 맞혔다.

```python
pd.DataFrame(cm_test) # 라벨이 2와 1인 피처간의 혼동되는 값이 존재함 2를 1로 인식
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0</th><th>1</th><th>2</th></tr></thead><tbody><tr><th class="idx">0</th><td>10</td><td>0</td><td>0</td></tr><tr><th class="idx">1</th><td>0</td><td>10</td><td>0</td></tr><tr><th class="idx">2</th><td>0</td><td>1</td><td>9</td></tr></tbody></table></div></div>

test set은 **2행 1열이 1**이다. 정답이 2(virginica)인 꽃 하나를 1(versicolor)로 예측했다는 뜻이다. setosa(0)는 하나도 헷갈리지 않았고, 꽃 크기가 비슷한 versicolor와 virginica 사이에서만 틀렸다.

## 정리

- scikit-learn 내장 데이터셋은 Bunch 객체이고, `data`(X), `target`(y), `feature_names`, `target_names`로 구성된다
- 규칙 기반은 사람이 조건을 만들어야 하고, 정확히 맞는 데이터가 없으면 답을 못 낸다
- scikit-learn 모델은 **import → 생성 → `fit(X, y)` → `predict(X)`** 순서로 쓴다
- 모델을 평가하려면 데이터를 **train/test로 나눠** test set은 학습에 쓰지 않는다. 분류는 `stratify`로 클래스 비율을 유지하고, `random_state`로 결과를 재현한다
- 정확도로 전체 성능을, 혼동행렬로 **어떤 클래스끼리 헷갈리는지**를 본다
