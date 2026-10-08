---
title: "군집: K-Means와 실루엣 점수"
description: "비지도 학습인 군집(Clustering)의 쓰임새와 K-Means 알고리즘의 동작 방식, 스케일링이 필요한 이유를 정리하고, Iris 데이터로 KMeans 학습, inertia로 적정 군집 수 찾기, 실루엣 계수로 군집 결과를 평가하는 과정을 실행 결과와 함께 다룹니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 16
originalNotebook: "14 군집_Clustering.ipynb"
tags: ["Python","scikit-learn","Clustering","K-Means","Unsupervised Learning"]
date: 2026-06-01
---

> SKN31 머신러닝 과정 노트북 `14 군집_Clustering.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 군집(Clustering)과 쓰임새
- K-Means 알고리즘과 특징
- Iris 데이터로 KMeans 학습하기
- inertia로 적정 군집 수 판단하기
- 실루엣 점수로 군집 평가하기

시리즈의 마지막 글이다. 지금까지는 정답(y)이 있는 지도학습이었고, 이번에는 정답 없이 데이터만으로 그룹을 찾는 **비지도 학습**이다.

## 군집 (Clustering)

데이터 포인트들을 **비슷한 특성을 가진 그룹끼리 묶어 주는** 비지도 학습 기법이다.

**적용 예**

- **비슷한 데이터 분류**: feature를 바탕으로 비슷한 특징을 가진 데이터를 묶어 성향을 파악한다. 고객 세분화가 대표적이다
- **이상치 탐지**: 어떤 군집에도 잘 묶이지 않는 데이터는 이상치일 가능성이 높다
- **준지도학습**: 레이블이 없는 데이터에 군집으로 레이블을 만들어 지도학습을 하거나, 기존 레이블을 더 세분화한다

```python
# k는 군집 클러스터 갯수
```

## K-Means (K-평균)

- 가장 널리 쓰이는 군집 알고리즘 중 하나
- 데이터셋을 **K개의 군집**으로 나눈다. K는 사용자가 지정하는 하이퍼파라미터다
- 군집의 중심이 될 것 같은 임의의 지점(**Centroid**)을 정하고, 그 중심에 가까운 포인트들을 묶는다

### 알고리즘

![K-Means: 중심 랜덤 선택 → 가까운 점 할당 → 중심 이동 → 반복](/images/ml/fig-kmeans.png)

*출처: [ai-times.tistory.com/158](http://ai-times.tistory.com/158)*

```python
# 랜덤으로 center를 설정
# center를 기준으로 가까운 애를 묶어줌
# 반복
# 원형으로 만들어짐
#
```

1. K개의 중심을 랜덤하게 정한다
2. 각 데이터를 가장 가까운 중심의 군집에 할당한다
3. 각 군집에 속한 데이터들의 **평균 위치**로 중심을 옮긴다 (그래서 K-"평균"이다)
4. 중심이 더 움직이지 않을 때까지 2~3을 반복한다

### 특징

- 군집을 **원 모양**으로 간주한다
- 모든 feature가 같은 scale이어야 한다. **Feature Scaling이 필요하다**
- **이상치에 취약하다**

> **보충** 거리로 묶기 때문에 KNN처럼 단위가 큰 feature가 결과를 좌우한다. 이상치에 약한 이유는 중심을 **평균**으로 옮기기 때문이다. 멀리 떨어진 점 하나가 평균을 끌어당겨 중심이 엉뚱한 곳으로 간다.

### KMeans

- `sklearn.cluster.KMeans`
- 하이퍼파라미터: `n_clusters` - 몇 개의 군집으로 나눌지
- 속성: `labels_` - 데이터 포인트별 군집 번호

## Iris 데이터로 군집하기

정답(품종)은 쓰지 않고 4개 feature만으로 묶는다. 정답은 나중에 결과와 비교하는 용도로만 쓴다.

```python
import numpy as np

from sklearn.datasets import load_iris

columns = ['sepal length', 'sepal width', 'petal length', 'petal width']
X, y = load_iris(return_X_y=True)
```

```python
from sklearn.preprocessing import StandardScaler
X_scaled = StandardScaler().fit_transform(X)
```

```python
from sklearn.cluster import KMeans
kmeans = KMeans(n_clusters=3, random_state=0)  # 몇개 군집(cluster)을 나눌지 # 0,1,2는 어떤게 어떤 꽃인지는 알수없고 분류만해준거임
# 0,1,2의 라벨의 실제 명칭은 실제 데이터를 보고 확인해봐야 함 => 순서대로 들어가는게 아니기 때문
kmeans.fit(X_scaled) #  n_clusters 개수의 군집으로 나눔.
```

```text
KMeans(n_clusters=3, random_state=0)
```

`fit()`에 y를 넣지 않는다. 비지도 학습이라 정답이 필요 없다.

```python
print(X.shape, kmeans.labels_.shape)
```

```text
(150, 4) (150,)
```

```python
np.unique(kmeans.labels_, return_counts=True)
```

```text
(array([0, 1, 2], dtype=int32), array([53, 50, 47]))
```

```python
kmeans.labels_
```

```text
array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
       1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
       1, 1, 1, 1, 1, 1, 2, 2, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2,
       0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 2, 2, 2, 0, 2, 2, 2,
       2, 2, 2, 0, 0, 2, 2, 2, 2, 0, 2, 0, 2, 0, 2, 2, 0, 2, 2, 2, 2, 2,
       2, 0, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 2, 0], dtype=int32)
```

정답과 나란히 놓고 본다.

```python
import pandas as pd
df = pd.DataFrame(X, columns=columns)
df['y'] = y  #  정답
df['cluster y'] = kmeans.labels_
```

```python
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 150행 × 6열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>sepal length</th><th>sepal width</th><th>petal length</th><th>petal width</th><th>y</th><th>cluster y</th></tr></thead><tbody><tr><th class="idx">0</th><td>5.1</td><td>3.5</td><td>1.4</td><td>0.2</td><td>0</td><td>1</td></tr><tr><th class="idx">1</th><td>4.9</td><td>3.0</td><td>1.4</td><td>0.2</td><td>0</td><td>1</td></tr><tr><th class="idx">2</th><td>4.7</td><td>3.2</td><td>1.3</td><td>0.2</td><td>0</td><td>1</td></tr><tr><th class="idx">3</th><td>4.6</td><td>3.1</td><td>1.5</td><td>0.2</td><td>0</td><td>1</td></tr><tr><th class="idx">4</th><td>5.0</td><td>3.6</td><td>1.4</td><td>0.2</td><td>0</td><td>1</td></tr><tr><td class="ellipsis" colspan="7">⋯</td></tr><tr><th class="idx">145</th><td>6.7</td><td>3.0</td><td>5.2</td><td>2.3</td><td>2</td><td>2</td></tr><tr><th class="idx">146</th><td>6.3</td><td>2.5</td><td>5.0</td><td>1.9</td><td>2</td><td>0</td></tr><tr><th class="idx">147</th><td>6.5</td><td>3.0</td><td>5.2</td><td>2.0</td><td>2</td><td>2</td></tr><tr><th class="idx">148</th><td>6.2</td><td>3.4</td><td>5.4</td><td>2.3</td><td>2</td><td>2</td></tr><tr><th class="idx">149</th><td>5.9</td><td>3.0</td><td>5.1</td><td>1.8</td><td>2</td><td>0</td></tr></tbody></table></div></div>

```python
df['cluster y'].value_counts()
```

```text
cluster y
0    53
1    50
2    47
Name: count, dtype: int64
```

메모대로 군집 번호 0, 1, 2는 품종 번호와 상관없다. 어느 군집이 어느 품종인지는 교차표로 확인한다.

```python
# 보충: 정답과 군집 번호 교차표
pd.crosstab(df['y'], df['cluster y'], rownames=['정답 품종'], colnames=['군집'])
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th>정답 품종</th><th>0</th><th>1</th><th>2</th></tr></thead><tbody><tr><th class="idx">0</th><td>0</td><td>50</td><td>0</td></tr><tr><th class="idx">1</th><td>39</td><td>0</td><td>11</td></tr><tr><th class="idx">2</th><td>14</td><td>0</td><td>36</td></tr></tbody></table></div></div>

setosa(0)는 군집 하나에 50개가 모두 모였다. versicolor(1)와 virginica(2)는 두 군집에 섞여 나뉘었다. 꽃잎 크기가 비슷한 두 품종은 정답 없이 거리만으로는 깔끔하게 가르기 어렵다. Iris 첫 글의 혼동행렬에서도 틀린 건 이 두 품종 사이였다.

### 새로운 데이터 분류

학습한 중심으로 새 데이터가 어느 군집에 속할지 예측한다. 가장 가까운 중심의 군집 번호를 돌려준다.

```python
new_data = X_scaled[100:110]

pred = kmeans.predict(new_data)  # new_data의 원소들이 어느 그룹에 포함될지 반환. # 전처리는 동일하게 해야 함
pred
```

```text
array([2, 0, 2, 2, 2, 2, 0, 2, 2, 2], dtype=int32)
```

## Inertia(응집도)로 적정 군집 수 판단

- **inertia**: 군집 내 데이터들과 중심 사이 거리(의 제곱)의 합. 군집의 **응집도**를 나타낸다
- 작을수록 데이터가 중심에 모여 있다는 뜻이라 군집화가 잘 되었다고 볼 수 있다
- `KMeans`의 `inertia_` 속성으로 조회한다
- K별로 inertia를 구한 뒤, **급격히 떨어지다가 완만해지는 지점**을 적정 군집 수로 판단한다
  - 군집을 많이 나눌수록 inertia는 계속 작아진다
  - 하지만 너무 많이 나누면 중심 근처에 있던 것들을 다시 쪼개는 셈이라, inertia가 줄어드는 폭이 작아진다. **나눌 필요가 없는 걸 나눈 것**이다
  - inertia가 크게 바뀌지 않기 시작하는 지점을 K로 고른다

```python
kmeans.inertia_
```

```text
139.8204963597498
```

```python
k_list = [2, 3, 4, 5, 6, 7]
inertia_list = []
for k in k_list:
    model = KMeans(n_clusters=k, random_state=0)
    model.fit(X_scaled)
    inertia_list.append(model.inertia_)
```

> **보충** 노트북에는 `random_state`가 없어서 K=3의 inertia(140.9)가 바로 위에서 구한 값(139.8)과 달랐다. K-Means는 처음 중심을 랜덤하게 잡기 때문에, 실행할 때마다 조금씩 다른 결과가 나올 수 있다. `random_state=0`을 추가했다.

```python
inertia_list
```

```text
[222.36170496502305, 139.8204963597498, 114.0925469040309, 90.80759161913358, 81.50473906581257, 72.82103962425721]
```

```python
import matplotlib.pyplot as plt

plt.plot(k_list, inertia_list, marker='x')
plt.grid(True, linestyle=":")
plt.show()
```

![그래프 출력](/images/ml/ml-clustering-1.png)

K=2 → 3에서 크게 떨어지고, 그 뒤로는 완만하게 줄어든다. 꺾이는 지점이 3이라 K=3이 적당하다. 그래프 모양이 팔꿈치 같아서 이 방법을 **엘보우(Elbow) 방법**이라고도 부른다.

## 군집 평가지표: 실루엣 점수

**실루엣 계수 (silhouette coefficient)**

- 개별 데이터가 **자기 군집 안의 데이터와 얼마나 가깝고**, **가장 가까운 다른 군집과는 얼마나 먼지**를 나타낸다
- -1 ~ 1 사이 값이고 1에 가까울수록 좋다
  - `-1`에 가까우면 잘못된 군집에 할당되어 있다
  - `0`에 가까우면 군집의 경계에 있다
  - `1`에 가까우면 자기 군집 중심 가까이에 있다

![실루엣 계수: a(i)는 같은 군집과의 평균 거리, b(i)는 가장 가까운 다른 군집과의 평균 거리](/images/ml/fig-silhouette.png)

$$
s(i) = \frac{b(i) - a(i)}{\max(a(i),\ b(i))}
$$

- $a(i)$: 같은 군집의 다른 데이터들과의 거리 평균
- $b(i)$: 가장 가까운 다른 군집의 데이터들과의 거리 평균
- 분자 $b(i) - a(i)$: 두 거리의 차이. 분모는 이 값을 -1 ~ 1로 정규화한다
- $a(i) > b(i)$: 다른 군집이 더 가깝다 → 잘못 분류됐다 (음수)
- $a(i) < b(i)$: 자기 군집이 더 가깝다 → 잘 분류됐다 (양수)
- $a(i) = b(i)$: 경계에 있다 (0)

**함수**

- `sklearn.metrics.silhouette_samples()`: 개별 데이터의 실루엣 계수
- `sklearn.metrics.silhouette_score()`: 실루엣 계수들의 평균

**좋은 군집화의 기준**

- 실루엣 계수 평균이 1에 가까울수록 좋다
- 전체 평균과 **개별 군집의 평균** 사이 편차가 크지 않아야 한다

```python
from sklearn.metrics import silhouette_samples, silhouette_score

sil_values = silhouette_samples(X_scaled, kmeans.labels_)
print(sil_values.shape)
sil_values[:10]
```

```text
(150,)
```

```text
array([0.73419485, 0.56827391, 0.67754724, 0.62050159, 0.72847412,
       0.60988485, 0.69838355, 0.73081691, 0.48821004, 0.63154089])
```

```python
sil_values.mean()
```

```text
np.float64(0.45994823920518635)
```

```python
silhouette_score(X_scaled, kmeans.labels_)
```

```text
0.45994823920518635
```

두 번째 기준(군집별 편차)을 확인해 본다.

```python
# 보충: 군집별 실루엣 평균
pd.Series(sil_values).groupby(kmeans.labels_).mean()
```

```text
0    0.393377
1    0.636316
2    0.347392
dtype: float64
```

setosa가 모인 군집은 실루엣 평균이 높고, versicolor·virginica가 섞인 두 군집은 낮다. 전체 평균(0.46)만 보면 가려지는 차이다.

```python
# 보충: K별 실루엣 점수
for k in k_list:
    labels = KMeans(n_clusters=k, random_state=0).fit_predict(X_scaled)
    print(f"K={k}  silhouette={silhouette_score(X_scaled, labels):.3f}")
```

```text
K=2  silhouette=0.582
K=3  silhouette=0.460
K=4  silhouette=0.387
K=5  silhouette=0.346
K=6  silhouette=0.344
K=7  silhouette=0.329
```

> **보충** 실루엣 점수만 보면 K=2가 가장 높다. setosa 하나와 나머지 둘로 나누는 게 "거리상으로는" 가장 깔끔하기 때문이다. 실제 품종은 3개지만, 4개 feature만 보면 versicolor와 virginica는 하나로 붙어 있는 덩어리에 가깝다. 정답 없이 군집하면 데이터의 **모양**을 따라가지, 우리가 원하는 구분을 따라가지 않는다. 그래서 군집 결과는 inertia, 실루엣 점수, 도메인 지식을 함께 보고 판단한다.

## 정리

- 군집은 정답 없이 **비슷한 데이터끼리 묶는** 비지도 학습이다. 고객 세분화, 이상치 탐지, 레이블 생성에 쓴다
- **K-Means**: 중심 K개를 정하고 → 가까운 점을 할당하고 → 중심을 평균 위치로 옮기기를 반복한다
- 거리 기반이라 **스케일링 필수**, 원 모양 군집을 가정하고, 이상치에 약하다. 처음 중심이 랜덤이라 `random_state`를 고정한다
- 군집 번호는 정답 번호와 무관하다. 교차표로 의미를 확인한다
- 적정 K는 **inertia가 꺾이는 지점**(엘보우)과 **실루엣 점수**를 함께 보고 정한다. 실루엣은 군집별 편차도 확인한다
