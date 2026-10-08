---
title: "NumPy 기초: ndarray 생성과 파일 저장"
description: "머신러닝 데이터의 기본 자료구조인 NumPy 배열(ndarray)의 축·랭크·shape 개념을 정리하고, array·zeros·ones·full·arange·linspace·난수 함수로 배열을 만들고 npy·npz·csv로 저장하고 불러오는 방법을 실행 결과와 함께 다룹니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 1
originalNotebook: "00_1_Numpy개요_배열생성.ipynb"
tags: ["Python","NumPy","ndarray"]
date: 2026-05-11
---

> SKN31 머신러닝 과정 노트북 `00_1_Numpy개요_배열생성.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 NumPy 2.2에서 다시 실행한 결과입니다. 난수 셀은 실행할 때마다 값이 달라서 노트북과 숫자가 다릅니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- NumPy와 데이터 구조: 스칼라, 벡터, 행렬, 텐서
- 축(axis), 랭크(rank), 형태(shape), 크기(size)
- ndarray 만들기: `array`, `zeros`/`ones`/`full`, `arange`, `linspace`
- 데이터 타입(dtype)과 `astype`
- 난수 배열: `seed`, `rand`, `normal`, `randint`, `choice`
- 배열을 파일로 저장하고 불러오기

노트북 첫 셀에 적어 둔 메모다. 머신러닝을 시작하면서 NumPy를 왜 먼저 배우는지가 들어 있다.

```python
# ML => DATASET(패턴) = 과거 -> 미래 예측
# pytorch(tensor 포함)
# ndarray
# tensorflow
```

머신러닝은 과거 데이터에서 패턴을 찾아 미래를 예측하는 일이고, 그 데이터를 담는 그릇이 ndarray다. PyTorch의 tensor도 같은 개념이다.

## NumPy

- [numpy.org](https://numpy.org) · **Num**erical **Py**thon
- 벡터, 행렬 연산을 위한 **수치해석용** 파이썬 라이브러리
  - 강력한 다차원 배열(array) 지원
  - 벡터화 연산, 브로드캐스팅 등으로 다차원 배열과 행렬 연산에 필요한 다양한 함수 제공
  - 파이썬 List보다 **더 많은 데이터를 더 빠르게** 처리
- 많은 과학 연산 라이브러리의 기반이다: scipy, matplotlib, pandas, scikit-learn, statsmodels 등
- 선형대수, 난수 생성, 푸리에 변환 기능 지원

### NumPy의 데이터 구조

| 구조 | 뜻 | 다른 이름 |
|---|---|---|
| **스칼라** (Scalar) | 값 하나 | 0D |
| **벡터** (Vector) | 값들을 순서대로 모은 것 (데이터 레코드) | 1D Tensor, 1차원 배열 |
| **행렬** (Matrix) | 벡터들을 모은 것. 2개의 방향으로 값을 관리 | 2D Tensor, 2차원 배열 |
| **텐서** (Tensor) | 같은 크기의 행렬(텐서)들을 모은 것. N개의 방향 | ND Tensor, 다차원 배열 |

### 용어

| 용어 | 뜻 |
|---|---|
| **축** (axis) | 값들의 나열 방향. 하나의 축은 하나의 범주(분류, Category)다 |
| **랭크** (rank) | 축의 개수. **차원**(dimension)이라고도 한다 |
| **형태** (shape) | 축별 데이터의 개수 |
| **크기** (size) | 배열 안 원소의 총 개수 |

노트북에 표 데이터로 예를 적어 뒀다.

```python
# ex) df.shape => (행, 열) => (100, 10)
#   => 100개의 패턴(데이터)이 존재, 10개의 feature가 존재, 데이터셋의 크기는 1000개
# 0축: data 개수, 1축: feature 개수
```

머신러닝에서 2차원 데이터의 **0축은 데이터(샘플) 개수, 1축은 feature 개수**로 쓰는 관례가 여기서 시작된다.

> **차원(dimension)이라는 말의 두 가지 뜻**
> - **벡터에서 차원**: 원소의 개수. `[1, 2, 3]`은 "3차원 벡터"
> - **NumPy 배열에서 차원**: 축의 개수. `[1, 2, 3]`은 "1차원 배열"
>
> 같은 `[1, 2, 3]`이 문맥에 따라 3차원도 되고 1차원도 된다.

## ndarray

- NumPy가 제공하는 **N차원 배열** 객체다.
- **같은 타입의 값만** 가질 수 있다.
- 축별 데이터 개수가 모두 같다. (행마다 열 개수가 다를 수 없다)
- 빠르고 메모리를 효율적으로 쓰며, 벡터 연산과 브로드캐스팅을 제공한다.

## 배열 생성 함수

### array(iterable, dtype)

- Iterable의 원소로 배열을 만든다. **원하는 값들로** 배열을 만들 때 쓴다.
- 다차원 배열은 각 축의 size가 같도록 한다.

```python
import numpy as np

a1 = np.array([1, 10, 2, 30, 100])
print(type(a1))
print(a1)
a1
```

```text
<class 'numpy.ndarray'>
[  1  10   2  30 100]
```

```text
array([  1,  10,   2,  30, 100])
```

`print()`는 `[  1  10 ...]`, 노트북 출력은 `array([...])`로 보인다. 같은 배열이다.

```python
# ndarray 속성들
print("배열 형태(축별 크기. 튜플):", a1.shape)
print("랭크(차원):", a1.ndim)
print("총 원소 개수:", a1.size)
print("데이터타입:", a1.dtype)
```

```text
배열 형태(축별 크기. 튜플): (5,)
랭크(차원): 1
총 원소 개수: 5
데이터타입: int64
```

1차원 배열의 shape은 `(5,)`다. 원소가 하나인 튜플이라 뒤에 쉼표가 붙는다.

```python
# 다른 타입의 값들을 넣으면 가장 큰 타입으로 통일한다. (타입순서: bool < int < float < str)
a2 = np.array([1, 2, 5, 10, -20, -30, 1.1])
print(a2.dtype)
print(a2)
```

```text
float64
[  1.    2.    5.   10.  -20.  -30.    1.1]
```

정수 사이에 실수 `1.1` 하나가 끼어서 전부 float이 됐다.

```python
# 생성 시 타입 지정
a3 = np.array([1, 2, 3, 4], dtype="int8")   # 문자열로 지정
a4 = np.array([1, 2, 3, 4], dtype=np.int8)  # 상수로 지정
print(a3.dtype, a4.dtype)
```

```text
int8 int8
```

```python
# N차원 배열 생성 - 중첩 iterable로 생성
data = [
    [1, 2, 3],
    [10, 20, 30],
    [100, 200, 300],
    [0.1, 0.2, 0.3],
]
a5 = np.array(data)
print(a5.shape, a5.size, a5.dtype)
```

```text
(4, 3) 12 float64
```

```python
# 배열의 타입 변경
a6 = a5.astype("float32")  # 타입을 바꾼 새로운 배열을 생성
a6.dtype, a5.dtype
```

```text
(dtype('float32'), dtype('float64'))
```

`astype()`은 원본을 바꾸지 않고 **새 배열**을 만든다. a5는 그대로 float64다.

### 데이터 타입

- ndarray는 같은 타입의 데이터만 모아서 관리한다.
- 생성할 때 `dtype`으로 지정하고, `배열.dtype`으로 조회한다.
- `배열.astype(타입)`으로 변환한 새 배열을 받는다.
- 문자열(`"int8"`)이나 NumPy 변수(`np.int8`)로 지정한다. **Pandas도 NumPy의 데이터 타입을 쓴다.**

| 분류 | 문자열 | NumPy 변수 |
|---|---|---|
| 정수형 | `"int8"`, `"int16"`, `"int32"`, `"int64"` | `np.int8` … `np.int64` |
| 부호 없는 정수형 | `"uint8"`, `"uint16"`, `"uint32"`, `"uint64"` | `np.uint8` … `np.uint64` |
| 실수형 | `"float16"`, `"float32"`, `"float64"` | `np.float16` … `np.float64` |
| 논리형 | `"bool"` | `np.bool` |
| 문자열 | `"str"` | `np.str_` |

> **보충** 필기 표에는 `"uint32"` 옆이 `np.int32`, 문자열이 `np.str`로 적혀 있었다. 각각 `np.uint32`, `np.str_`가 맞다. `np.str`은 NumPy 1.24부터 없어져서 쓰면 에러가 난다. 숫자는 비트 수다. `int8`은 -128~127, `uint8`은 0~255만 담는다. 이미지 픽셀 값(0~255)이 `uint8`로 저장되는 이유다.

### 같은 값으로 채운 배열

| 함수 | 채우는 값 | 기본 dtype |
|---|---|---|
| `zeros(shape, dtype)` | 0 (영벡터) | float64 |
| `ones(shape, dtype)` | 1 (일벡터) | float64 |
| `full(shape, fill_value, dtype)` | 원하는 값 | 값에 따라 |

`shape`은 정수(1차원 원소 수)나 튜플(축별 크기)로 준다.

```python
a10 = np.zeros(shape=10)
print(a10.shape, a10.dtype)
a10
```

```text
(10,) float64
```

```text
array([0., 0., 0., 0., 0., 0., 0., 0., 0., 0.])
```

```python
a11 = np.zeros(shape=(1, 2, 2, 3, 2))
print(a11.shape, a11.dtype, a11.ndim)

a12 = np.zeros(shape=(2, 3, 2, 3, 2, 3), dtype="float16")
print(a12.shape, a12.dtype, a12.size)
```

```text
(1, 2, 2, 3, 2) float64 5
(2, 3, 2, 3, 2, 3) float16 216
```

```python
a13 = np.ones(shape=(2, 4), dtype="int32")
print(a13.shape, a13.dtype)
a13
```

```text
(2, 4) int32
```

```text
array([[1, 1, 1, 1],
       [1, 1, 1, 1]], dtype=int32)
```

```python
a14 = np.full(shape=(3, 4), fill_value=15)
print(a14.shape, a14.dtype)
a14
```

```text
(3, 4) int64
```

```text
array([[15, 15, 15, 15],
       [15, 15, 15, 15],
       [15, 15, 15, 15]])
```

`_like` 함수는 다른 배열과 **같은 shape**으로 만든다.

```python
a15 = np.zeros_like(a14)  # a14 배열과 같은 shape의 원소가 모두 0인 배열을 생성
a16 = np.ones_like(a14)
a17 = np.full_like(a14, fill_value=99)
print(a15.shape, a16.shape, a17.shape)
a17
```

```text
(3, 4) (3, 4) (3, 4)
```

```text
array([[99, 99, 99, 99],
       [99, 99, 99, 99],
       [99, 99, 99, 99]])
```

### arange(start, stop, step, dtype)

- start에서 stop 범위에서 step 간격의 값들로 배열을 만든다. **1차원만** 만든다.
- start는 포함(기본 0), **stop은 포함하지 않는다**, step 기본 1.

```python
print(np.arange(1, 11, 2))  # 인수 3개: (start, stop(불포함), step)
print(np.arange(1, 10))     # 인수 2개: (start, stop), step 생략: 1
print(np.arange(10))        # 인수 1개: stop. start 생략: 0, step 생략: 1
print(np.arange(10, -10, -2))  # 역순으로 생성: start > stop, step: 음수
print(np.arange(0, 1, 0.1))    # range()와 다르게 실수도 생성 가능
```

```text
[1 3 5 7 9]
[1 2 3 4 5 6 7 8 9]
[0 1 2 3 4 5 6 7 8 9]
[10  8  6  4  2  0 -2 -4 -6 -8]
[0.  0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9]
```

> **보충** 실수 step은 소수점 오차 때문에 끝값이 들어가거나 빠지는 일이 생긴다. 예를 들어 `np.arange(1, 1.3, 0.1)`은 1.3이 포함되기도 한다. 실수 구간을 나눌 땐 다음의 `linspace`가 안전하다.

```python
np.arange(1, 1.3, 0.1)
```

```text
array([1. , 1.1, 1.2, 1.3])
```

### linspace(start, stop, num=50, endpoint=True, retstep=False)

시작과 끝을 **균등하게 나눈** 위치값들로 배열을 만든다. 1차원만 만든다.

| 매개변수 | 뜻 |
|---|---|
| `num` | 나눌 개수. 기본 50 |
| `endpoint` | stop을 포함할지. 기본 True |
| `retstep` | True면 (배열, 간격)을 튜플로 반환 |

```python
a30 = np.linspace(1, 100)  # 1 ~ 100 범위를 같은 간격의 값 50(기본)개로. 1, 100 포함
print(a30.shape)
print(a30[:5])
```

```text
(50,)
[1.         3.02040816 5.04081633 7.06122449 9.08163265]
```

```python
print(np.linspace(1, 20, num=5))                  # 개수 지정
print(np.linspace(1, 20, num=5, endpoint=False))  # stop 포함 안 함
np.linspace(1, 10, num=10, retstep=True)          # (생성된 배열, 간격)
```

```text
[ 1.    5.75 10.5  15.25 20.  ]
[ 1.   4.8  8.6 12.4 16.2]
```

```text
(array([ 1.,  2.,  3.,  4.,  5.,  6.,  7.,  8.,  9., 10.]), np.float64(1.0))
```

`arange`는 **간격**을 정하고, `linspace`는 **개수**를 정한다. 그래프를 매끄럽게 그릴 x값을 만들 때 `linspace`를 많이 쓴다.

```python
# 특정 함수의 그래프
def func(x):
    return x**3 + 2*x**2 + 5*x - 2

x = np.linspace(-5, 5, 1000)
y = func(x)  # element-wise 연산
print(x.shape, y.shape)

plt.plot(x, y)
plt.show()
```

```text
(1000,) (1000,)
```

![그래프 출력](/images/ml/numpy-basics-1.png)

`func(x)`에 배열을 넣으면 **원소마다** 계산된다(element-wise). 반복문 없이 1000개 점의 y값을 한 번에 구했다.

## 난수 배열

NumPy의 하위 패키지 `random`의 함수들로 만든다.

### np.random.seed(시드값)

- 난수 알고리즘이 쓸 **시작값**을 정한다.
- 시드값을 정하면 항상 **같은 순서의 난수**가 나온다.

> 랜덤 함수는 특정 숫자부터 시작하는 수열을 만들어 값을 내준다. 시작 숫자가 실행할 때마다 바뀌어서 다른 값이 나오는데, 시드값으로 시작값을 고정하면 같은 값들이 순서대로 나온다. 매번 같은 순서의 난수가 필요할 때 설정한다.

```python
a = np.random.seed(50)
print(a)
# 난수 생성 시작 -> seed값 설정.
# seed값이 같으면 같은 순서의 난수가 생성된다. (재현성)
print(np.random.rand(5))

np.random.seed(50)
print(np.random.rand(5))  # 시드를 다시 50으로 → 같은 값
```

```text
None
[0.49460165 0.2280831  0.25547392 0.39632991 0.3773151 ]
[0.49460165 0.2280831  0.25547392 0.39632991 0.3773151 ]
```

`seed()`는 반환값이 없어서 `None`이 찍힌다. 두 번째 줄과 네 번째 줄이 같은 게 **재현성**이다. 머신러닝에서 데이터를 섞거나 나눌 때 시드를 고정해야 결과를 다시 재현할 수 있다.

### np.random.rand(axis0, axis1, …)

0~1 사이의 실수(균등분포). 축의 크기를 순서대로 나열한다.

```python
print(np.random.rand())       # 난수 한 개
print(np.random.rand(5))      # 1차원 - 5개
np.random.rand(2, 5)          # 2차원 - (2, 5)
```

```text
0.9965742301546493
[0.4081972  0.77189399 0.76053669 0.31000935 0.3465412 ]
```

```text
array([[0.35176482, 0.14546686, 0.97266468, 0.90917844, 0.5599571 ],
       [0.31359075, 0.88820004, 0.67457307, 0.39108745, 0.50718412]])
```

노트북에 이런 셀도 있었다.

```python
a = np.random.rand(2, 2, 2, 5).astype("int8")
print(a.shape, a.dtype)
print(np.unique(a))
```

```text
(2, 2, 2, 5) int8
[0]
```

> **보충** 0~1 사이 실수를 `int8`로 바꾸면 소수점 아래를 버려서 **전부 0**이 된다. 정수 난수가 필요하면 `randint`를 쓴다.

### np.random.normal(loc=0.0, scale=1.0, size=None)

정규분포를 따르는 난수. `loc`은 평균, `scale`은 표준편차다. 둘 다 생략하면 **표준정규분포**(평균 0, 표준편차 1)다.

> **정규분포 용어**
> - **평균**: 모두 더해서 개수로 나눈 것. 정규분포에서 값이 가장 많이 몰리는 곳이라 대푯값으로 쓴다.
> - **편차**: 각 값이 평균과 얼마나 차이 나는지
> - **표준편차**: 평균으로부터 각 값이 얼마나 떨어져 있는지에 대한 평균적인 크기
> - **분산**: 표준편차의 제곱. 표준편차를 계산하는 중간에 나오는 값
> - **분포**: 값이 흩어져 있는 상태
> - **정규분포**: 종 모양의 연속 확률분포. 평균 근처에 값이 가장 많고, 평균에서 멀어질수록 적다. **1표준편차 범위에 약 68%, 2표준편차에 약 95%, 3표준편차에 약 99.7%** 가 들어간다.
> - **표준정규분포**: 평균 0, 표준편차 1인 정규분포
> - 정규분포는 평균과 표준편차로 표현한다.

> **보충** 필기에는 표준편차를 "편차의 평균"이라고 적었는데, 편차를 그냥 평균 내면 +와 -가 상쇄돼 항상 0이다. 그래서 편차를 **제곱해서 평균 낸 것이 분산**, 분산의 **제곱근이 표준편차**다.

```python
print(np.random.normal())         # 한 개, 표준정규분포
print(np.random.normal(size=5))   # 1차원 - 5개
np.random.normal(size=(2, 5))     # 2차원 - (2, 5)
```

```text
-0.05752120680181562
[-1.00384983  0.57649427  0.05071385  0.7995342   2.51254838]
```

```text
array([[ 0.82556917, -1.12101467,  0.89681217,  0.65061386, -1.76212138],
       [ 1.33898159,  0.56169661,  0.76075785, -0.32623418,  1.12756057]])
```

```python
r = np.random.normal(
    loc=10,   # 평균
    scale=2,  # 표준편차
    size=10,  # 개수/shape
)
print(r)
print(np.mean(r), np.std(r))
```

```text
[10.76402808 13.18555138  6.9384672  11.71710442  7.2452258  13.79466513
  7.93837541 15.9881836  11.69903766  9.99955897]
10.927019765720454 2.8185613899826567
```

10개만 뽑으면 평균과 표준편차가 10, 2에서 꽤 벗어난다. 10만 개를 뽑아 히스토그램을 그리면 종 모양이 나온다.

```python
v = np.random.normal(loc=10, scale=2, size=100000)
print(np.mean(v), np.std(v))
plt.hist(v, bins=50, edgecolor="k")
plt.show()
```

```text
10.005911612979617 1.9993446663373815
```

![그래프 출력](/images/ml/numpy-basics-2.png)

68% 규칙도 확인해 봤다.

```python
# 보충: 평균 ± 1표준편차, 2표준편차 안에 든 비율
print(((v > 8) & (v < 12)).mean())
print(((v > 6) & (v < 14)).mean())
```

```text
0.68234
0.95458
```

같은 분포를 pandas의 KDE(밀도 그래프)로 그리면 매끄러운 곡선이 된다. KDE는 `scipy`가 필요하다.

```python
import pandas as pd
pd.Series(v).plot(kind="kde")
plt.show()
```

![그래프 출력](/images/ml/numpy-basics-3.png)

### np.random.randint(low, high=None, size=None)

임의의 **정수** 배열. low ~ high 사이, **high는 포함하지 않는다.** high를 생략하면 0 ~ low.

```python
print(np.random.randint(10, 20))  # 10 ~ 20(불포함) 사이 랜덤 정수. size 생략: 1개
print(np.random.randint(5))       # 0 ~ 5(불포함). start 생략: 0
print(np.random.randint(0, 100, size=3))
np.random.randint(10, 100, size=(3, 1, 4, 5)).shape
```

```text
17
3
[47 19 66]
```

```text
(3, 1, 4, 5)
```

### np.random.choice(a, size=None, replace=True, p=None)

**샘플링(표본추출)** 함수다.

| 매개변수 | 뜻 |
|---|---|
| `a` | 샘플링 대상. 1차원 배열 또는 정수(0 ~ 정수-1) |
| `size` | 샘플 개수 |
| `replace` | True 복원추출(기본), False 비복원추출 |
| `p` | 각 값이 뽑힐 확률 배열 |

```python
l = [1, 2, 3, 4, 5, 6, 7, 8, 9]
print(np.random.choice(l, size=5))                 # 모집단에서 5개 표본 추출
print(np.random.choice(l, size=5, replace=False))  # 중복되지 않게 (비복원추출)
print(np.random.choice(l, size=20))                # 복원추출이라 모집단보다 많이 뽑을 수 있다
np.random.choice([True, False], size=(3, 5))
```

```text
[8 6 4 9 7]
[4 2 9 7 3]
[1 8 1 8 2 4 7 1 3 4 7 2 7 9 4 4 2 5 9 7]
```

```text
array([[False, False,  True,  True, False],
       [ True, False,  True,  True, False],
       [ True,  True,  True, False,  True]])
```

> **보충** `p`로 확률을 주면 불균형한 데이터를 흉내 낼 수 있다. 예를 들어 불량률 5% 데이터:

```python
s = np.random.choice(["정상", "불량"], size=1000, p=[0.95, 0.05])
np.unique(s, return_counts=True)
```

```text
(array(['불량', '정상'], dtype='<U2'), array([ 55, 945]))
```

> **보충 · 요즘 권장하는 방식**
> `np.random.seed()` + `np.random.함수()`는 프로그램 전체가 시드 하나를 공유하는 옛 방식이다. NumPy는 지금 `rng = np.random.default_rng(시드)`로 생성기를 만들어 `rng.random()`, `rng.integers()`, `rng.normal()`처럼 쓰는 걸 권장한다. scikit-learn 등 수업 코드는 아직 옛 방식이 많아서 둘 다 알아 두면 된다.

## 배열을 파일로 저장하고 불러오기

### 바이너리 파일

| 함수 | 동작 |
|---|---|
| `np.save("경로", 배열)` | 배열 하나를 바이너리로 저장. 확장자 **`.npy`** 가 붙는다 |
| `np.savez("경로", 이름=배열, …)` | 여러 배열을 한 파일에 저장. 확장자 **`.npz`**. 이름으로 구분 |
| `np.load("경로")` | 불러오기. npz는 저장할 때 붙인 이름으로 꺼낸다 |

### 텍스트 파일

| 함수 | 동작 |
|---|---|
| `np.savetxt("경로", 배열, delimiter=" ")` | 텍스트(csv)로 저장. 2차원은 한 줄에 한 행, 1차원은 한 줄에 원소 하나. **1·2차원만** 된다 |
| `np.loadtxt("경로", dtype=float, delimiter=" ")` | 불러오기. 저장할 때와 **같은 delimiter**를 줘야 제대로 읽힌다 |

```python
a = np.arange(10)
b = np.zeros(shape=(3, 10))
c = np.full(shape=(5, 2, 10), fill_value=20)

import os
os.makedirs("saved_dir", exist_ok=True)

np.save("saved_dir/a.txt", a)  # 확장자 생략 시 .npy 자동으로 붙음
np.save("saved_dir/b", b)
np.save("saved_dir/c.npy", c)
sorted(os.listdir("saved_dir"))
```

```text
['a.txt.npy', 'b.npy', 'c.npy']
```

> **보충 · `a.txt`로 저장하면 `a.txt.npy`가 된다**
> 확장자가 `.npy`가 아니면 NumPy가 뒤에 `.npy`를 **덧붙인다.** 그래서 `"a.txt"`로 저장한 파일은 `a.txt.npy`다. 노트북에서는 바로 다음 셀이 `np.load("saved_dir/a.npy")`였는데 에러가 안 난 건, 그 전에 `a`로 저장한 `a.npy`가 이미 폴더에 있었기 때문이다. 처음부터 실행하면 이렇게 된다.

```python
saved_a = np.load("saved_dir/a.npy")
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · FileNotFoundError: [Errno 2] No such file or directory: &#x27;saved_dir/a.npy&#x27;</div></div>

```python
saved_a = np.load("saved_dir/a.txt.npy")
saved_b = np.load("saved_dir/b.npy")
saved_c = np.load("saved_dir/c.npy")
print(saved_a)
print(saved_b.shape, saved_c.shape)
```

```text
[0 1 2 3 4 5 6 7 8 9]
(3, 10) (5, 2, 10)
```

여러 배열을 한 파일에 저장:

```python
np.savez("saved_dir/all_array.npz", one=a, two=b, three=c)  # 이름=저장할배열

all_array = np.load("saved_dir/all_array.npz")
print(type(all_array))
print(all_array.files)  # 저장된 배열들에 지정된 이름 조회

s_a = all_array["one"]
s_b = all_array["two"]
s_c = all_array["three"]
print(s_a, s_b.shape, s_c.shape)
```

```text
<class 'numpy.lib.npyio.NpzFile'>
['one', 'two', 'three']
[0 1 2 3 4 5 6 7 8 9] (3, 10) (5, 2, 10)
```

텍스트 파일 저장(1·2차원만):

```python
np.savetxt("saved_dir/a.csv", a)
np.savetxt("saved_dir/b.csv", b, delimiter=",")

print(open("saved_dir/a.csv").read()[:75])
print(open("saved_dir/b.csv").readline()[:80])
```

```text
0.000000000000000000e+00
1.000000000000000000e+00
2.000000000000000000e+00

0.000000000000000000e+00,0.000000000000000000e+00,0.000000000000000000e+00,0.000
```

정수 배열 `a`도 텍스트로 저장하면 `0.000000000000000000e+00` 같은 실수 표기가 된다. 기본 형식(`fmt`)이 실수라서다. 그래서 읽어 오면 float이 된다.

```python
a2 = np.loadtxt("saved_dir/a.csv")
print(a2.dtype)
print(a2.astype(np.float32))

b2 = np.loadtxt("saved_dir/b.csv", delimiter=",")
b2.shape
```

```text
float64
[0. 1. 2. 3. 4. 5. 6. 7. 8. 9.]
```

```text
(3, 10)
```

> **보충** 3차원 배열 `c`를 `savetxt`로 저장하려고 하면 에러가 난다. 3차원 이상은 `np.save`를 쓴다.

```python
np.savetxt("saved_dir/c.csv", c)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: Expected 1D or 2D array, got 3D array instead</div></div>

## 정리

- ndarray는 **같은 타입**, **축별 같은 개수**의 N차원 배열이다. 축 개수가 랭크(차원), 축별 개수가 shape이다.
- 머신러닝 데이터는 보통 `(샘플 수, feature 수)` 2차원이다.
- 정해진 값은 `array`, 같은 값은 `zeros`/`ones`/`full`, 범위는 `arange`(간격 기준)/`linspace`(개수 기준).
- `astype`은 새 배열을 만든다. 실수 → 정수 변환은 소수점을 버린다.
- 난수는 `seed`로 재현성을 확보한다. 분포에 따라 `rand`(균등), `normal`(정규), `randint`(정수), `choice`(샘플링).
- `np.save`는 `.npy`가 아니면 확장자를 덧붙인다. 텍스트 저장은 1·2차원만, 기본이 실수 형식이다.
