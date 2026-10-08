---
title: "데이터셋 나누기와 모델 검증: Hold-out·KFold·교차 검증"
description: "Train·Validation·Test 데이터셋의 역할과 하이퍼파라미터 개념, train_test_split을 이용한 Hold-out 분리, KFold·StratifiedKFold를 이용한 K-겹 교차 검증, cross_val_score·cross_validate 함수까지 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 5
originalNotebook: "03_데이터셋 나누기와 모델검증.ipynb"
tags: ["Python","scikit-learn","Cross Validation","KFold"]
date: 2026-05-15
---

> SKN31 머신러닝 과정 노트북 `03_데이터셋 나누기와 모델검증.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- Train / Validation / Test 데이터셋의 역할
- Hold-out 방식: `train_test_split()`으로 세 세트 나누기
- 하이퍼파라미터와 파라미터
- K-겹 교차 검증: `KFold`, `StratifiedKFold`, 그리고 generator
- 교차 검증 함수: `cross_val_score()`, `cross_validate()`

## 데이터셋(Dataset)의 역할

노트북 첫 셀에 수업 내용을 시험에 빗대 적어 뒀다.

```python
# 학습시킬 데이터 = train set


# 검증시킬 데이터 = validation set (기출)
# 검증과 평가의 차이 => 정확도 0.9인 모델을 목표할 때 검증 후 0.7이 나오면, 모델을 튜닝하고 다시 학습 후 같은 데이터로 검증
# 즉 검증은 모델을 완성하는 과정에서 모델의 정확성을 판단하기 위한 데이터셋
# 평가는 최종적으로 모델의 성능을 확일할때 사용
# 튜닝 = 파라미터를 수동으로 맞추는 작업
# 수동으로 파라미터를 자동으로 맞춰야하는 경우가 존재함 => 하이퍼 파라미터


# 평가할 데이터 = test set (모고) => 정확한 평가를 위함
# 테스트 이후엔 모델의 사용여부 결정
```

validation set은 몇 번이고 풀어 보는 **기출문제**, test set은 마지막에 한 번 보는 **모의고사**다.

> **보충** 하이퍼파라미터 줄은 반대로 적었다. **사람이 직접 정해 주는 설정값**이 하이퍼파라미터이고, **학습으로 자동으로 찾아지는 값**이 파라미터다. 뒤쪽 셀에서는 바르게 정리했다. 튜닝은 이 하이퍼파라미터를 바꿔 가며 성능을 올리는 작업이다.

| 데이터셋 | 용도 |
|---|---|
| **Train** (훈련/학습) | 모델을 학습시킬 때 사용 |
| **Validation** (검증) | 하이퍼파라미터를 튜닝할 때 모델 성능 검증에 사용 |
| **Test** (평가) | 모델 성능을 최종적으로 측정. **마지막에 한 번만 사용**한다 |

왜 test set을 한 번만 써야 할까. 원하는 성능이 나올 때까지 설정 변경 → 훈련 → 검증을 반복하면, 설정을 바꾸는 이유 자체가 **검증 데이터 결과를 좋게 만들기 위해서**가 된다. 그러면 모델이 검증 데이터에 맞춰 훈련된 것과 같은 효과가 난다. train과 test 두 개만 쓰면 test 점수가 실제보다 좋게 나와 성능을 제대로 평가할 수 없다. 그래서 train과 validation으로 훈련·검증을 반복해 모델을 완성한 뒤, 마지막에 test로 최종 평가를 한다.

## Hold-out: 데이터 분리 방식 1

![Hold-out 방식: train / validation / test로 분리](/images/ml/fig-holdout.png)

- 데이터셋을 Train, Validation, Test set으로 나눈다
- `sklearn.model_selection.train_test_split()`을 쓴다. 하나의 데이터셋을 **2분할**하는 함수라, 세 개로 나누려면 두 번 쓴다

```python
from sklearn.datasets import load_iris # load_xxxxx()

X, y = load_iris(return_X_y=True)  # iris.data와 iris.target값만 추출.  (X, y)
X.shape, y.shape

# X = feature (Df + N) => 이름/나이/근무기간/초과근무/만족도
# y = target => 퇴사여부
```

```text
((150, 4), (150,))
```

`return_X_y=True`를 주면 Bunch 대신 `(X, y)` 튜플만 받는다.

### Train / Test set 분리

```python
from sklearn.model_selection import train_test_split


## train_test_split(): 2개 dataset 으로 분리해주는 사이킷런 라이브러리 함수
X_train, X_test, y_train, y_test = train_test_split(
    X, # input
    y, # output
    test_size=0.2, # testset의 비율. default: 0.25
    stratify=y, # 분류 데이터셋에만 적용. (y(target)이 범주형) 원본의 클래스들 비율과 동일한 비율로 나누기.
    random_state=0 # random seed값. 나누기 전에 shuffle(섞기)을 먼저 하는 데 그때 일정하게 섞이게 하기 위해 seed값 지정.'
    # stratify => 비율을 유지해주는 파라미터 ex) 참/거짓 정답 비율이 7:3일때, 나눠진 각각의 데이터셋도 7:3의 비율을 갖게됌
    #random_state=0 시드값을 고정해주는 역할 (각 데이터셋을 담기전에 셔플을 먼저진행하는데, 바뀌지 않도록 고정해주는 역할)
)
X_train.shape, X_test.shape
```

```text
((120, 4), (30, 4))
```

클래스 비율이 유지됐는지는 `np.unique(..., return_counts=True)`로 확인한다. 고유값과 각각의 개수를 돌려준다.

```python
import numpy as np
np.unique([1, 1, 2, 1, 2], return_counts=True)
```

```text
(array([1, 2]), array([3, 2]))
```

```python
import numpy as np
# y의 class별 개수
unique_values, unique_values_cnt = np.unique(y, return_counts=True)
print(unique_values, unique_values_cnt, sep='\n')
# class별 비율 계산
print(unique_values_cnt / y.size)
```

```text
[0 1 2]
[50 50 50]
[0.33333333 0.33333333 0.33333333]
```

```python
# y_train의 class별 개수
unique_values_train, unique_values_cnt_train = np.unique(y_train, return_counts=True)
print(unique_values_train, unique_values_cnt_train, sep='\n')
print(unique_values_cnt_train/y_train.size)
```

```text
[0 1 2]
[40 40 40]
[0.33333333 0.33333333 0.33333333]
```

```python
unique_values_test, unique_values_cnt_test = np.unique(y_test, return_counts=True)
print(unique_values_test, unique_values_cnt_test, sep='\n')
print(unique_values_cnt_test/y_test.size)
```

```text
[0 1 2]
[10 10 10]
[0.33333333 0.33333333 0.33333333]
```

원본, train, test 모두 클래스 비율이 1/3씩으로 같다.

### Train / Validation / Test set 분리

train set을 한 번 더 나눠서 하나는 train, 다른 하나는 validation으로 쓴다.

```python
### Train set을 두개로 나눠서 하나는 train, 다른 하나는 validation set으로 사용.
X_train, X_val, y_train, y_val = train_test_split(
    X_train, y_train,
    test_size=0.2,
    stratify=y_train,   # stratify=output(y값=target=label) 지정.
    random_state=0)

X_train.shape, X_test.shape, X_val.shape
```

```text
((96, 4), (30, 4), (24, 4))
```

```python
# train_test_split을 2번 사용해서 최종적으로 trainset, valset, testset으로 나눔
```

150개가 train 96 / validation 24 / test 30으로 나뉘었다. 전체 대비 64% / 16% / 20%다.

### 모델 생성과 검증

```python
# 하이퍼 파라미터 = 명시적으로 넣어줘야 하는 값 => 무작위로 넣어서 성능이 좋아지는 것을 찾아내야 함
# 파라미터 = 학습에 의해서 찾아지는 값
```

- **하이퍼파라미터(Hyper Parameter)**: 모델의 성능에 영향을 주는 값으로 **사람이 직접 설정**하는 값
- **파라미터(Parameter)**: 사람이 입력하는 게 아니라 **학습을 통해 찾는** 모델의 가중치 값

`DecisionTreeClassifier`의 `max_depth`(트리 최대 깊이, 1 이상의 정수)가 하이퍼파라미터의 예다. 값을 바꿔 가며 validation 성능을 확인했다.

```python
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

# 모델 생성
## max_depth: DecisionTree의 하이퍼 파라미터 중 하나.
# 모델의 성능에 영향을 줌
# 어떤 값을 줄 수 있는지 (1 이상의 정수)



# max_depth = 1 #0.68
# max_depth = 2
# max_depth = 3
# max_depth = 4  --- 4 이상은 계속 똑같은 값만 나오나
# max_depth = 5

max_depth = 6
tree = DecisionTreeClassifier(max_depth=max_depth, random_state=0) # 랜덤값.사용.시드값(재현성을 위함)

# 모델 학습 - trainset
tree.fit(X_train, y_train)

# 모델 검증 - validation set /train set
## 1. 예측(추론)
pred_val = tree.predict(X_val)
pred_train = tree.predict(X_train)

## 2. 평가(검증) ==> 정확도
train_acc = accuracy_score(y_train, pred_train)
val_acc = accuracy_score(y_val, pred_val)
```

```python
## max_depth(하이퍼파라미터) 별 평가 결과
print(f"max_depth: {max_depth}")
print("Train accuracy:", train_acc)
print("Validation accuracy:", val_acc)
```

```text
max_depth: 6
Train accuracy: 1.0
Validation accuracy: 1.0
```

노트북에서는 위 셀의 `max_depth`를 1부터 6까지 바꿔 가며 같은 출력 셀을 여러 번 실행했는데, 저장된 출력이 전부 마지막 값(6)으로 덮여 있었다. 반복문으로 한 번에 다시 확인했다.

```python
# 보충: max_depth별 결과를 한 번에 비교
for d in range(1, 7):
    t = DecisionTreeClassifier(max_depth=d, random_state=0).fit(X_train, y_train)
    print(f"max_depth={d}  train={accuracy_score(y_train, t.predict(X_train)):.4f}  "
          f"val={accuracy_score(y_val, t.predict(X_val)):.4f}")
```

```text
max_depth=1  train=0.6667  val=0.6667
max_depth=2  train=0.9583  val=1.0000
max_depth=3  train=0.9583  val=0.9583
max_depth=4  train=1.0000  val=1.0000
max_depth=5  train=1.0000  val=1.0000
max_depth=6  train=1.0000  val=1.0000
```

노트북 주석의 `max_depth = 1 #0.68`은 실제로 0.6667이고, 4 이상은 train·validation 모두 1.0으로 같은 값이 나온다. validation이 24개뿐이라 2, 4, 5, 6이 모두 1.0으로 동점이다. 데이터가 적으면 한 번의 분할로는 하이퍼파라미터를 가려내기 어렵다는 뜻이고, 뒤에서 교차 검증을 배우는 이유이기도 하다.

```python
# Train accuracy: 1.0
# Validation accuracy: 1.0
# 두 정확도의 갭이 적어야 최적의 max_depth임
```

```python
# 평가방법도 여러 가지임
# 목표점수 - 지표, 점수
# 일반적인 (분류) 같은 경우는 0.85이상 나오면 굉장히 높은 정확도
```

> **보충** 기준은 두 가지다. 먼저 **validation 점수가 가장 높은 값**을 찾고, 비슷하다면 train과 validation의 **차이가 작은 값**을 고른다. 차이가 크면 train에만 맞춘 과적합이다. "0.85 이상이면 높다"는 기준도 문제마다 다르다. Iris처럼 쉬운 데이터는 0.95가 넘고, 클래스가 불균형한 데이터는 정확도만으로는 판단하기 어렵다. 평가지표는 다음 글에서 다룬다.

### Test set으로 최종 평가

validation에서 고른 하이퍼파라미터로 모델을 만들고, 마지막에 한 번만 test set으로 평가한다.

```python
max_depth = 4 # validation에서 가장 성능 좋은 하이퍼파라미터 사용.
model = DecisionTreeClassifier(max_depth=max_depth, random_state=0)
model.fit(X_train, y_train)
pred = model.predict(X_test)
test_acc = accuracy_score(y_test, pred)
print("최종 평가결과:", test_acc)
```

```text
최종 평가결과: 0.9666666666666667
```

### Hold-out 방식의 단점

- train/validation/test가 **어떻게 나뉘냐에 따라 결과가 달라진다**
  - 데이터가 충분히 많으면 변동성이 흡수되지만, 적으면 문제가 생긴다
  - 이상치의 영향을 많이 받는다
  - 다양한 패턴을 학습하지 못해 새로운 데이터에 대한 예측 성능이 떨어진다
- **Hold-out은 (다양한 패턴을 가진) 데이터가 많을 때 쓴다**

```python
# 전체 데이터 양이 적을 때, (상/중/하-이상치)에 영향을 많이 받는다//3부분 중 데이터가 한쪽에 쏠림
# 데이터 양이 많으면 데이터가 골고루 번짐
# 데이터의 갯수보다/ 다양한 형태의 데이터가 3부분에 골고루 나눠지는 데이터
# 강아지/고양이 => ex. 앉아 있는 진돗개 100만장 보다 뛰는 말티즈, 앉아 있는 불독 등 (형태의 다양성)이 더 중요
```

데이터의 **개수보다 다양성**이 중요하다는 메모다. 앉아 있는 진돗개 사진 100만 장보다 뛰는 말티즈, 앉아 있는 불독처럼 여러 형태가 세 세트에 골고루 들어가야 한다.

## K-겹 교차 검증(K-Fold Cross Validation): 데이터 분리 방식 2

1. 데이터셋을 K개로 나눈다
2. K개 중 하나를 검증 세트로, 나머지를 훈련 세트로 해서 모델을 학습시키고 평가한다
3. K개 모두가 한 번씩 검증 세트가 되도록 K번 반복한 뒤, 평가지표들을 **평균** 내서 모델 성능으로 삼는다

![K-Fold: 각 반복마다 다른 fold가 검증 세트가 된다](/images/ml/fig-kfold.png)

- 데이터가 충분하지 않을 때 쓴다
- 검증 비율이 2.5:7.5 또는 2:8이 되도록 보통 4개나 5개 fold로 나눈다
- scikit-learn 제공 클래스
  - **KFold**: 회귀 문제의 데이터셋을 나눌 때
  - **StratifiedKFold**: 분류 문제의 데이터셋을 나눌 때

```python
# class가 2개, 함수 2개
```

클래스 2개(`KFold`, `StratifiedKFold`)와 함수 2개(`cross_val_score`, `cross_validate`)를 배운다는 메모다.

### Boston Housing 데이터셋

미국 보스턴의 구역별 집값 데이터셋이다. 회귀 문제 예제로 쓴다.

| 컬럼 | 뜻 |
|---|---|
| CRIM | 지역별 범죄 발생률 |
| ZN | 25,000 평방피트를 초과하는 거주지역의 비율 |
| INDUS | 비상업지역 토지의 비율 |
| CHAS | 찰스강 경계에 위치하면 1, 아니면 0 |
| NOX | 일산화질소 농도 |
| RM | 주택 1가구당 평균 방의 개수 |
| AGE | 1940년 이전에 건축된 소유주택의 비율 |
| DIS | 5개의 보스턴 고용센터까지의 접근성 지수 |
| RAD | 고속도로까지의 접근성 지수 |
| TAX | 10,000달러당 재산세율 |
| PTRATIO | 지역별 교사 한 명당 학생 비율 |
| B | 지역의 흑인 거주 비율 |
| LSTAT | 하위계층의 비율(%) |
| **MEDV** | **Target.** 지역의 주택가격 중앙값 (단위: \$1,000) |

> **보충** 이 데이터셋은 `B` 컬럼처럼 인종 관련 변수를 포함하고 있어 윤리 문제가 제기되었고, scikit-learn 1.2부터 내장 데이터셋에서 빠졌다. 그래서 수업에서도 CSV 파일로 불러온다.

### KFold

- 지정한 개수(K)만큼 분할한다
- 원본 데이터의 **순서를 유지**하면서 나눈다
- **회귀 문제**일 때 쓴다
- `KFold(n_splits=K)`: 몇 개 fold로 나눌지 지정
- `KFold객체.split(데이터셋)`: K개로 나눴을 때 train/test에 들어갈 데이터의 **index**를 돌려주는 **generator**를 만든다

### Generator

> - 연속된 값을 제공(생성)하는 iterable 객체. 값을 만드는 알고리즘을 가지고 있다가 요청이 올 때마다 값을 하나씩 만들어 준다
> - 함수 형식으로 구현하며 `return` 대신 `yield`를 쓴다

```python
def test_generator(start):
    result = start + 10
    # start에 10 더한 값을 첫번째로, 20 더한값을 두번째로 30더한 값을 세번째로 제공하는 제너레이터
    yield result

    result = start + 20
    yield result

    result = start + 30
    yield result

    result = start + 30
    yield result
```

```python
gen = test_generator(5) # generator 객체생성
```

```python
# generator 호출 next(gen객체)
# next(iterlable 객체) -> 값을 하나 제공
print(next(gen))
```

```text
15
```

```python
print(next(gen))
```

```text
25
```

```python
print(next(gen))
```

```text
35
```

```python
print(next(gen))
```

```text
35
```

`next()`를 부를 때마다 다음 `yield`까지 실행되고 그 값이 나온다. `for`문에 넣으면 값이 떨어질 때까지 차례로 꺼낸다.

```python
for v in test_generator(50):
    print(v)
```

```text
60
70
80
80
```

> **보충** 네 번째 `yield` 앞에서 `start + 30`을 한 번 더 계산해서 35, 80이 두 번씩 나왔다. 40씩 더하려던 것이라면 `start + 40`이다. 값을 다 꺼낸 generator에 `next()`를 한 번 더 부르면 `StopIteration` 에러가 난다.

### Boston 데이터 불러오기

```python
####################################
# Boston Housing Dataset Loading
####################################
import pandas as pd
import numpy as np

df = pd.read_csv("data/boston_dataset.csv")
print(df.shape)
df.head()
```

```text
(506, 14)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 14열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>CRIM</th><th>ZN</th><th>INDUS</th><th>CHAS</th><th>NOX</th><th>RM</th><th>AGE</th><th>DIS</th><th>RAD</th><th>TAX</th><th>PTRATIO</th><th>B</th><th>LSTAT</th><th>MEDV</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.00632</td><td>18.0</td><td>2.31</td><td>0.0</td><td>0.538</td><td>6.575</td><td>65.2</td><td>4.09</td><td>1.0</td><td>296.0</td><td>15.3</td><td>396.9</td><td>4.98</td><td>24.0</td></tr><tr><th class="idx">1</th><td>0.02731</td><td>0.0</td><td>7.07</td><td>0.0</td><td>0.469</td><td>6.421</td><td>78.9</td><td>4.9671</td><td>2.0</td><td>242.0</td><td>17.8</td><td>396.9</td><td>9.14</td><td>21.6</td></tr><tr><th class="idx">2</th><td>0.02729</td><td>0.0</td><td>7.07</td><td>0.0</td><td>0.469</td><td>7.185</td><td>61.1</td><td>4.9671</td><td>2.0</td><td>242.0</td><td>17.8</td><td>392.83</td><td>4.03</td><td>34.7</td></tr><tr><th class="idx">3</th><td>0.03237</td><td>0.0</td><td>2.18</td><td>0.0</td><td>0.458</td><td>6.998</td><td>45.8</td><td>6.0622</td><td>3.0</td><td>222.0</td><td>18.7</td><td>394.63</td><td>2.94</td><td>33.4</td></tr><tr><th class="idx">4</th><td>0.06905</td><td>0.0</td><td>2.18</td><td>0.0</td><td>0.458</td><td>7.147</td><td>54.2</td><td>6.0622</td><td>3.0</td><td>222.0</td><td>18.7</td><td>396.9</td><td>5.33</td><td>36.2</td></tr></tbody></table></div></div>

노트북에서는 집값을 원화로 바꾼 컬럼을 하나 만들어 봤다.

```python
df['MEDV_KRW_BN'] = df['MEDV'] * 0.0135
```

> **보충** 이 컬럼을 그대로 두고 아래처럼 `MEDV`만 빼면, `MEDV_KRW_BN`이 feature로 들어간다. 정답(`MEDV`)에 상수를 곱한 값이라 모델 입장에서는 **정답을 입력으로 받는 셈**이고, 성능이 비정상적으로 좋게 나온다. 이렇게 정답 정보가 feature로 새어 들어가는 것을 **데이터 누수(target leakage)** 라고 한다. 노트북의 이후 셀 출력도 feature 13개 기준이라, 여기서 이 컬럼을 지우고 진행한다.

```python
# 보충: 정답에서 파생된 컬럼 제거
df = df.drop(columns="MEDV_KRW_BN")
```

```python
# X, y(MEDV) 를 분리
y = df['MEDV'].values
X = df.drop(columns="MEDV").values
```

```python
X.shape, y.shape
```

```text
((506, 13), (506,))
```

### KFold 예제

```python
from sklearn.model_selection import KFold

# 객체 생성 - k(몇개의  fold로 나눌지 개수)를 지정
kfold = KFold(n_splits=5) # K=5 - 8 : 2 , K=4 - 7.5 : 2.5

#  K개 fold로 나눴을 때 train 데이터와 test 데이터의 index를 반환하는 generator를 생성
gen = kfold.split(X)

type(gen)
```

```text
<class 'generator'>
```

```python
v = next(gen)
type(v)

#튜플: (train set의 index들,   test set의 index들)
```

```text
<class 'tuple'>
```

```python
# 보충: 첫 번째 fold의 index 범위
print("train index:", v[0][:5], "...", v[0][-3:], len(v[0]))
print("test  index:", v[1][:5], "...", v[1][-3:], len(v[1]))
```

```text
train index: [102 103 104 105 106] ... [503 504 505] 404
test  index: [0 1 2 3 4] ... [ 99 100 101] 102
```

첫 번째 fold는 앞쪽 0~101번이 test, 나머지가 train이다. 순서를 유지한 채 앞에서부터 잘랐다. 이 index로 실제 데이터를 꺼낸다.

```python
X_train = X[v[0]]
y_train = y[v[0]]
X_test = X[v[1]]
y_test = y[v[1]]

X_train.shape, y_train.shape, X_test.shape, y_test.shape
```

```text
((404, 13), (404,), (102, 13), (102,))
```

### Boston 데이터를 KFold로 학습

```python
from sklearn.model_selection import KFold
from sklearn.tree import DecisionTreeRegressor # 회기형일때 사용하는 알고리즘
from sklearn.metrics import mean_squared_error # 오차제곱 평균.(회귀 평가지표중 하나.)
import numpy as np

### dataset: X, y (위에서 조회한 값 사용)
mse_list = [] # iteration 별 검증 결과를 저장할 리스트
kfold = KFold(n_splits=5)

# n_splits=5 => 5번에 걸쳐 학습을 함 testset 1,2,3,4,5 (2번을 테스트셋으로 쓰면 나머지 1,3,4,5로 학습)
# 각 값의 평균이 이 모델의 성능

gen = kfold.split(X) # generator는 index들을 제공


for train_idx, test_idx in gen:  # tuple(trainset index: ndarray,  testset index: ndarray)
    X_train, y_train = X[train_idx], y[train_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    # 모델 생성
    model = DecisionTreeRegressor(max_depth=2, random_state=0)
    # model2 = LinearRegressor()
    # model3 =
    # model4 =
    # => 다양한 알고리즘으로 학습 가능 (실제=함수로 한번에 해결)

    # 학습
    model.fit(X_train, y_train)
    # 검증
    pred = model.predict(X_test)
    mse = mean_squared_error(y_test, pred) #mean_squared_error: 회귀의 평가지표 np.mean((정답 - 추정값값)**2)
    mse_list.append(mse)
```

```python
mse_list
```

```text
[19.362900914277557, 25.77734700471067, 58.61675649857523, 63.188138857997195, 41.21802825033429]
```

```python
np.mean(mse_list), np.sqrt(np.mean(mse_list))
# np.mean(mse_list)는 모델의 전반적인 성적을 확인하기 위해 계산하는 거야. 머신러닝에서 성능을 평가할 때 딱 한 번의 결과만 믿지 않고 여러 번 테스트(Cross Validation 등)
```

```text
(np.float64(41.63263430517899), np.float64(6.452335569790136))
```

MSE(평균제곱오차)는 오차를 제곱해서 평균 낸 값이라 단위가 "천 달러의 제곱"이다. 제곱근(RMSE)을 씌우면 약 6.45, 즉 평균적으로 **6,450달러 정도** 빗나간다는 뜻이 된다.

> **보충** fold별 MSE가 19에서 63까지 크게 벌어진다. Boston 데이터는 비슷한 지역끼리 붙어 있어서, 섞지 않고 순서대로 자르면 fold마다 성격이 다른 데이터가 들어가기 때문이다. 하나의 분할만 믿으면 안 된다는 교차 검증의 이유가 그대로 보인다. 순서가 의미 없는 데이터라면 `KFold(n_splits=5, shuffle=True, random_state=0)`처럼 섞어서 나누는 편이 낫다. `LinearRegressor`라는 클래스는 없고, 선형 회귀는 `LinearRegression`이다.

## StratifiedKFold

- **분류 문제**일 때 쓴다
- 전체 데이터셋의 **class별 개수 비율**과 같은 비율로 fold를 나눈다
- `StratifiedKFold(n_splits=K)`: 몇 개 fold로 나눌지 지정
- `StratifiedKFold객체.split(X, y)`: 비율을 맞추려면 정답이 필요하니 **X와 y를 둘 다** 넘긴다

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import StratifiedKFold, KFold
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

X, y = load_iris(return_X_y=True)
```

```python
# k를 지정해서 객체 생성
sf = StratifiedKFold(n_splits=5)
# 나누기
s_gen = sf.split(X, y)  # input, output data 모두 제공.
# generator를 제공함

print(type(s_gen))
train_idx, valid_idx = next(s_gen)  #튜플이 반환이 됌(train_idx, test_idx)
# print(train_idx) # 실제 값은 (x) 인덱스
# print(valid_idx)
print(y[train_idx]), print(np.unique(y[train_idx], return_counts=True))
print(y[valid_idx])
```

```text
<class 'generator'>
[0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
 0 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
 1 1 1 1 1 1 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2
 2 2 2 2 2 2 2 2 2]
(array([0, 1, 2]), array([40, 40, 40]))
[0 0 0 0 0 0 0 0 0 0 1 1 1 1 1 1 1 1 1 1 2 2 2 2 2 2 2 2 2 2]
```

```python
np.unique(y[train_idx], return_counts=True)
np.unique(y[valid_idx], return_counts=True)
```

```text
(array([0, 1, 2]), array([10, 10, 10]))
```

Iris는 클래스 순서대로 정렬되어 있지만 StratifiedKFold는 클래스마다 10개씩 골라 검증 세트를 만든다. 일반 `KFold`로 나눴다면 첫 fold의 검증 세트가 전부 setosa였을 것이다.

```python
# 보충: 같은 데이터를 KFold로 나누면
kf_train_idx, kf_valid_idx = next(KFold(n_splits=5).split(X))
print(y[kf_valid_idx])
```

```text
[0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0]
```

검증 세트가 setosa(0)뿐이라 이 fold의 점수는 의미가 없다. 분류에서는 StratifiedKFold를 써야 하는 이유다.

### StratifiedKFold로 교차 검증

```python
s_kfold = StratifiedKFold(n_splits=4)
s_gen = s_kfold.split(X, y)

# fold별 검증 결과를 저장할 리스트
val_result = []
for train_idx, test_idx in s_gen:

    # data 추출
    X_train, y_train = X[train_idx], y[train_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    # 모델링
    ## 모델 생성
    # max_depth = 1
    max_depth = 5
    # max_depth = 3
    # max_depth = 4
    model = DecisionTreeClassifier(max_depth=max_depth, random_state=0)
    ## 학습
    model.fit(X_train, y_train)
    ## 검증
    pred = model.predict(X_test)
    val_result.append(accuracy_score(y_test, pred))
```

```python
val_result
```

```text
[0.9736842105263158, 0.9473684210526315, 0.9459459459459459, 1.0]
```

```python
import numpy as np
np.mean(val_result)
```

```text
np.float64(0.9667496443812233)
```

노트북에서는 `max_depth`를 1부터 5까지 바꿔 가며 평균을 셀마다 따로 기록했다. 다만 1과 2의 결과가 똑같이 저장되어 있어서(0.6533), 반복문으로 다시 확인했다.

```python
# 보충: max_depth별 4-fold 평균 정확도
for d in range(1, 6):
    scores = []
    for tr, te in StratifiedKFold(n_splits=4).split(X, y):
        m = DecisionTreeClassifier(max_depth=d, random_state=0).fit(X[tr], y[tr])
        scores.append(accuracy_score(y[te], m.predict(X[te])))
    print(f"max_depth={d}  mean={np.mean(scores):.4f}")
```

```text
max_depth=1  mean=0.6533
max_depth=2  mean=0.9467
max_depth=3  mean=0.9600
max_depth=4  mean=0.9600
max_depth=5  mean=0.9667
```

> **보충** `max_depth=1`이면 트리가 질문을 한 번만 해서 둘로밖에 못 나누니, 세 품종 중 하나는 통째로 틀려 0.65 근처가 나온다. `max_depth=2`부터는 셋을 나눌 수 있어 점수가 크게 오른다. 노트북에 2도 0.6533으로 적힌 건 값을 바꾼 뒤 학습 셀을 다시 실행하지 않고 평균 셀만 실행했기 때문으로 보인다.

가장 좋은 하이퍼파라미터로 **전체 데이터**를 다시 학습시킨다.

```python
# 가장 valid 결과가 좋은 하이퍼파라미터로 모델을 만들어서 다시 학습.
final_model = DecisionTreeClassifier(max_depth=5, random_state=0)
final_model.fit(X, y)
```

```text
DecisionTreeClassifier(max_depth=5, random_state=0)
```

```python
type(final_model)



final_model = DecisionTreeClassifier(max_depth=max_depth, random_state=0)
final_model.fit(X_train, y_train)
pred = final_model.predict(X_test)
test_acc = accuracy_score(y_test, pred)
print("최종 평가결과:", test_acc)
```

```text
최종 평가결과: 1.0
```

> **보충** 이 셀의 `X_train`, `X_test`는 반복문이 끝난 뒤 남은 **마지막 fold**의 train/검증 데이터다. 이미 교차 검증에 쓴 데이터라 1.0은 최종 평가가 아니다. 제대로 하려면 Hold-out 때처럼 처음에 test set을 떼어 두고, **남은 데이터로만** 교차 검증을 한 뒤 마지막에 test set으로 평가해야 한다. 아래 `cross_val_score` 예제가 그 순서를 따른다.

## cross_val_score()

위에서 반복문으로 직접 한 교차 검증을 함수 하나로 처리한다.

- 데이터셋을 K개로 나누고 K번 반복하며 평가하는 작업을 처리해 준다
- 평가 지표는 **하나만** 쓸 수 있다
- 주요 매개변수
  - `estimator`: 교차 검증할 모델 객체
  - `X`: feature (input)
  - `y`: label (output)
  - `scoring`: 평가 함수. 문자열(함수 이름) 또는 함수 객체 ([지표 목록](https://scikit-learn.org/stable/modules/model_evaluation.html#scoring-parameter))
  - `cv`: 몇 개 fold로 나눌지. 정수 또는 KFold 객체
- 반환값: 각 반복의 평가 점수 배열

```python
# 위에 사용한 알고리즘을 처리해주는 함수
```

```python
## Boston Dataset
import pandas as pd
df = pd.read_csv('data/boston_dataset.csv')
y = df['MEDV'].values
X = df.drop(columns="MEDV").values
X.shape, y.shape
```

```text
((506, 13), (506,))
```

이번에는 최종 평가용 test set을 먼저 떼어 둔다.

```python
## train/test set 분리 (최종 평가 위해서)
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)
```

```python
## cross validation(교차검증) - cross_val_score() 이용
from sklearn.model_selection import cross_val_score
from sklearn.tree import DecisionTreeRegressor

model = DecisionTreeRegressor(max_depth=2, random_state=0)

val_results = cross_val_score(
    estimator=model, # 교차검증할 모델 #어떤 모델로 검증을 할건지
    X=X_train,       # X-input, features
    y=y_train,       # y-output, target, label
    scoring="neg_mean_squared_error",  # 평가지표함수-문자열, 함수객체
    cv=4,            # fold 수
)
print(val_results) #음수가 나오는 이유 neg음수를 붙였기 때문
print(-val_results) #원래 값을 쓰기 위해 변수에 -를 붙여야 함
```

```text
[-25.325642   -25.07376354 -42.7879561  -42.4207859 ]
[25.325642   25.07376354 42.7879561  42.4207859 ]
```

### neg_mean_squared_error를 쓰는 이유

scikit-learn은 **평가 결과값이 클수록 좋은 모델**로 처리한다. 그런데 MSE는 **낮을수록** 좋은 지표다. 그래서 음수를 붙여 "클수록 좋다"는 scikit-learn 방식에 맞춘다.

```python
# EX) 0.8 < 0.9 == 0.9이 좋음

# EX) 0.8 < 0.9 == 0.8이 좋음 (mean_squared_error = 낮을 수록, 오차범위가 작을 수록 좋음)

# scikit-learn은 숫자가 높을 수록 평가가 좋음 => 기준을 맞춰주기 위해서 -를 붙임

# EX) |- 0.8| > |-0.9| == |-0.8|이 좋음, 원래값을 생각할때에는 절대값
```

`-0.8`이 `-0.9`보다 크니, 음수로 바꾸면 오차가 작은 쪽이 "더 큰 점수"가 된다.

### 하이퍼파라미터 튜닝

`max_depth`를 1~5로 바꿔 가며 교차 검증 점수를 비교한다.

```python
##### 모델링 - 하이퍼파라미터 튜닝을 통해서 가장 성능 좋은 모델을 찾기.
## 하이퍼파라미터 - max_depth
max_depth_list = [1, 2, 3, 4, 5]
# max_depth별 모델의 검증 결과를 저장할 딕셔너리. key: max_depth, scores, mean_score
results = {"max_depth":[], "scores":[], "mean_score":[]}

for max_depth in max_depth_list:

    # 모델을 생성

    model = DecisionTreeRegressor(max_depth=max_depth, random_state=0)

    # 교차검증을 이용해 성능 평가.
    # fit 작업을 함수로 해결

    scores = cross_val_score(
        estimator=model,
        X=X_train,
        y=y_train,
        scoring="neg_mean_squared_error",
        cv=4 #폴더는 4개로 만듦
    )
    # 결과 dictionary에 저장
    results['max_depth'].append(max_depth)
    results['scores'].append(scores)
    results['mean_score'].append(np.mean(scores))

type(results)
```

```text
<class 'dict'>
```

```python
results["mean_score"]
```

```text
[np.float64(-53.23811180112813), np.float64(-33.90203688337762), np.float64(-28.868034772038833), np.float64(-24.759878046646527), np.float64(-24.169052153115132)]
```

> **보충** 주석의 "폴더 4개"는 **fold** 4개다. 결과는 DataFrame으로 보면 비교가 쉽다.

```python
# 보충: 결과를 표로
pd.DataFrame({"max_depth": results["max_depth"], "mean_mse": -np.array(results["mean_score"])})
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>max_depth</th><th>mean_mse</th></tr></thead><tbody><tr><th class="idx">0</th><td>1</td><td>53.238112</td></tr><tr><th class="idx">1</th><td>2</td><td>33.902037</td></tr><tr><th class="idx">2</th><td>3</td><td>28.868035</td></tr><tr><th class="idx">3</th><td>4</td><td>24.759878</td></tr><tr><th class="idx">4</th><td>5</td><td>24.169052</td></tr></tbody></table></div></div>

`max_depth=5`일 때 평균 MSE가 가장 작다(neg 값이 가장 크다). 이 값으로 최종 모델을 만들어 **train set 전체**로 학습하고, 떼어 둔 test set으로 한 번 평가한다.

```python
####### max_depth가 5일 때 검증결과가 가장 좋음.
### 최종 모델을 max_depth=5 해서 만들고 학습.
best_model = DecisionTreeRegressor(max_depth=5, random_state=0)
best_model.fit(X_train, y_train)
```

```text
DecisionTreeRegressor(max_depth=5, random_state=0)
```

```python
### test set으로 최종 평가
from sklearn.metrics import mean_squared_error
pred_test = best_model.predict(X_test)
# best_model(최종모델)에서 예측 (테스트 데이터)
mean_squared_error(y_test, pred_test)
```

```text
32.0407432413041
```

## cross_validate()

- `cross_val_score()`와 같은 일을 하지만 평가 지표를 **여러 개** 쓸 수 있다
- `scoring`에 여러 지표를 **리스트**로 넘긴다
- 반환값: dictionary

```python
## 회귀 평가지표 - mse, r-square
from sklearn.model_selection import cross_validate, cross_val_score, KFold, StratifiedKFold, train_test_split
model2 = DecisionTreeRegressor(max_depth=5)

result_dict = cross_validate(
    estimator=model2, # 모델지정
    X=X_train,
    y=y_train,   # input/output dataset 지정
    scoring=["neg_mean_squared_error", "r2", "neg_mean_absolute_error"], #3가지 평가지표로 점수를 내겠다. # 교차검증 (회기) #np.mean(mse_list)
    cv=4
)
```

```python
result_dict.keys()
# 'fit_time' : 학습할때 걸린 시간
# 'score_time': 검증할 때 걸린 시간
# 'test_neg_mean_squared_error', 'test_r2'   : 검증 결과
```

```text
dict_keys(['fit_time', 'score_time', 'test_neg_mean_squared_error', 'test_r2', 'test_neg_mean_absolute_error'])
```

```python
result_dict
```

```text
{'fit_time': array([0.00114202, 0.00108409, 0.00104403, 0.00124836]), 'score_time': array([0.00056601, 0.00051427, 0.00059247, 0.00068069]), 'test_neg_mean_squared_error': array([-11.13574744, -17.23712794, -54.65855643, -15.25022235]), 'test_r2': array([0.86750332, 0.73043523, 0.37904901, 0.85234701]), 'test_neg_mean_absolute_error': array([-2.61152839, -2.96319701, -3.88536973, -2.68706204])}
```

```python
result_dict['test_neg_mean_squared_error']
```

```text
array([-11.13574744, -17.23712794, -54.65855643, -15.25022235])
```

학습·검증 시간과 함께 지표마다 `test_지표이름` 키로 fold별 점수가 들어 있다. `r2`(결정계수)는 1에 가까울수록 좋은 지표라 neg가 붙지 않는다.

> **보충** `model2`는 `random_state`를 지정하지 않아서 실행할 때마다 점수가 조금씩 달라진다. 이 글의 숫자와 노트북의 숫자가 다른 이유다. 회귀 평가지표(MSE, MAE, R²)는 다음 글에서 자세히 다룬다.

## 정리

- **Train**으로 학습하고, **Validation**으로 하이퍼파라미터를 고르고, **Test**로 마지막에 한 번 평가한다
- **하이퍼파라미터**는 사람이 정하는 값(`max_depth`), **파라미터**는 학습으로 찾는 값이다
- **Hold-out**은 `train_test_split()`을 두 번 써서 나누며, 데이터가 많을 때 적합하다
- **K-Fold**는 K번 돌아가며 검증해 평균을 내서 분할 운의 영향을 줄인다. 회귀는 `KFold`, 분류는 `StratifiedKFold`
- `cross_val_score()`(지표 1개), `cross_validate()`(지표 여러 개)가 교차 검증 반복문을 대신해 준다. 오차 지표는 `neg_`를 붙여 "클수록 좋게" 바꿔 쓴다
- test set은 교차 검증 **전에** 떼어 둬야 최종 평가가 의미 있다
