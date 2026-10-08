---
title: "NumPy 배열 다루기: 인덱싱·형태 변경·벡터 연산"
description: "NumPy 배열에서 인덱싱·팬시 인덱싱·슬라이싱·boolean 인덱싱으로 원소를 조회하고, reshape·newaxis·squeeze·transpose로 형태를 바꾸고, 벡터 연산·내적·행렬곱·기술통계·브로드캐스팅까지 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 2
originalNotebook: "00_2_Numpy_배열 원소 조회_배열 형태변경_연산.ipynb"
tags: ["Python","NumPy","Broadcasting"]
date: 2026-05-12
---

> SKN31 머신러닝 과정 노트북 `00_2_Numpy_배열 원소 조회…ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 NumPy 2.2에서 다시 실행한 결과입니다. 이 노트북에는 수업 중에 적은 주석이 특히 많아서, 코드 셀의 주석은 거의 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 인덱싱, 팬시 인덱싱, 슬라이싱으로 조회·변경하기
- boolean 인덱싱, `np.where`, `np.any`, `np.all`
- 형태 변경: `reshape`, 차원 늘리기(`newaxis`, `expand_dims`), 줄이기(`squeeze`, `flatten`)
- 축 바꾸기: `T`, `transpose`
- 벡터 연산, 내적, 행렬곱
- 기술통계 함수와 `axis`
- 브로드캐스팅

## 인덱싱 (Indexing)

| 용어 | 뜻 |
|---|---|
| **index** | 배열 안 원소를 구분하는 식별자. 양수(앞에서 0, 1, 2…)와 음수(뒤에서 -1, -2…) 두 가지가 붙는다 |
| **indexing** | index로 원소 조회. `[ ]` 사용 |
| 다차원 | `,`로 축을 구분해 축별 index를 쓴다. `배열[0축 index, 1축 index, …]` |
| **팬시(fancy) 인덱싱** | 여러 원소를 한 번에 조회할 때 index들을 **리스트**로 넘긴다 |

팬시 인덱싱에서 `arr[[0, 3], [1, 4]]`는 헷갈리기 쉬워서 노트북에 풀어서 적어 뒀다.

```python
# `arr[[0,3], [1,4]]`는 다음과 같이 작동합니다
# 1. 첫 번째 리스트 [0,3]은 행 인덱스 → 0번째 행과 3번째 행
# 2. 두 번째 리스트 [1,4]는 열 인덱스 → 1번째 열과 4번째 열
# 3. 따라서 0번째 행의 1번째 열과, 3번째 행의 4번째 열에 위치한 원소들을 선택합니다.
```

**행 2개 × 열 2개 = 4칸**이 아니라, 리스트에서 같은 자리끼리 짝지은 **(0, 1), (3, 4) 두 칸**이다.

```python
import numpy as np

a = np.arange(30).reshape(5, 6)  # shape을 변경. (30,) -> (5, 6) 순서대로
a
```

```text
array([[ 0,  1,  2,  3,  4,  5],
       [ 6,  7,  8,  9, 10, 11],
       [12, 13, 14, 15, 16, 17],
       [18, 19, 20, 21, 22, 23],
       [24, 25, 26, 27, 28, 29]])
```

```python
print(a[0])      # (0축: 5, 1축: 6) => 0축 기준 첫 번째 값을 조회
print(a[1, 3])   # a[0축 index, 1축 index]
print(a[[1, 1, 3], [1, 4, 4]])  # [1,1], [1,4], [3,4]
print(a[[1, 2, 3], 2])          # [1,2], [2,2], [3,2]
print(a[1, [1, 2, 3]])          # [1,1], [1,2], [1,3]
print(a[-1, [1, 2, 3]])
```

```text
[0 1 2 3 4 5]
9
[ 7 10 22]
[ 8 14 20]
[7 8 9]
[25 26 27]
```

`a[0]`처럼 index를 0축 하나만 주면 그 **행 전체**가 나온다.

**값 변경**: 조회한 자리에 대입한다.

```python
a[0, 0] = 100
a[1, [1, 2, 3]] = 3232               # 여러 원소에 같은 값을 한 번에
a[1, [1, 2, 3]] = [1000, 2000, 3000] # 여러 원소에 각각 다른 값을
a
```

```text
array([[ 100,    1,    2,    3,    4,    5],
       [   6, 1000, 2000, 3000,   10,   11],
       [  12,   13,   14,   15,   16,   17],
       [  18,   19,   20,   21,   22,   23],
       [  24,   25,   26,   27,   28,   29]])
```

## 슬라이싱

- 원소들을 **범위**로 조회한다. `배열[start : stop : step]`
  - start 기본 0, **stop은 포함하지 않는다**(기본 끝까지), step 기본 1
- 다차원은 축마다 슬라이싱을 쓰고 `,`로 구분한다. `arr[0축 slicing, 1축 slicing, …]`
- 슬라이싱과 인덱싱은 같이 쓸 수 있다.

```python
a[0:-3]  # 0축만 지정
```

```text
array([[ 100,    1,    2,    3,    4,    5],
       [   6, 1000, 2000, 3000,   10,   11]])
```

> **보충** 노트북 주석에는 "0, 1, 2행 조회"라고 적었는데 결과는 **0, 1행 두 줄**이다. 행이 5개라 `-3`은 2번 행을 가리키고, stop은 포함하지 않으니 0~1행까지다. 0~2행은 `a[:3]` 또는 `a[:-2]`다.

```python
print(a[:, 2])    # 0축: 전체, 1축: 2번 열 조회
print(a[:, 2:5])  # 0축: 전체, 1축: 2번 열부터 4번 열까지
print(a[:, [2, 4]])     # 슬라이싱 + 팬시 인덱싱: 2번, 4번 열
print(a[1:4, 1:5])      # 0축: 1~3, 1축: 1~4
```

```text
[   2 2000   14   20   26]
[[   2    3    4]
 [2000 3000   10]
 [  14   15   16]
 [  20   21   22]
 [  26   27   28]]
[[   2    4]
 [2000   10]
 [  14   16]
 [  20   22]
 [  26   28]]
[[1000 2000 3000   10]
 [  13   14   15   16]
 [  19   20   21   22]]
```

`a[:, 2]`는 1차원 `(5,)`, `a[:, 2:5]`는 2차원 `(5, 3)`이다. **index로 고른 축은 사라지고, 슬라이싱한 축은 남는다.**

## boolean 인덱싱

- 원하는 **조건의 값들만** 조회할 때 쓴다. masking이라고도 한다.
- ndarray는 **element-wise 연산**을 지원해서, 배열에 비교 연산을 하면 원소마다 True/False인 배열이 나온다. 그걸 index로 쓴다.

**NumPy의 논리 연산자**

| 연산 | 연산자 |
|---|---|
| and | `&` |
| or | `\|` |
| not | `~` |

파이썬의 `and`, `or`, `not`은 쓸 수 없고, 피연산자는 `( )`로 묶어야 한다.

```python
a > 20
```

```text
array([[ True, False, False, False, False, False],
       [False,  True,  True,  True, False, False],
       [False, False, False, False, False, False],
       [False, False, False,  True,  True,  True],
       [ True,  True,  True,  True,  True,  True]])
```

```python
a[a > 20]
```

```text
array([ 100, 1000, 2000, 3000,   21,   22,   23,   24,   25,   26,   27,
         28,   29])
```

결과는 조건이 True인 값들만 모은 **1차원** 배열이다. 원래의 행·열 위치 정보는 사라진다.

```python
np.random.seed(0)
b = np.random.randint(1000, size=(5, 6, 7))
print(b.shape)
print(b[b < 100])
# b[(b >= 100) and (b <= 200)]  → ValueError
print(b[(b >= 100) & (b <= 200)])
```

```text
(5, 6, 7)
[ 9 70 87 72 99 28 53 42 57 82 91 84 47 95 23 98 41 58 36 86 43 11 80 32
 94 19]
[192 174 115 177 147 151 183 128 128 119 131 180 143 169 197 130 123 148
 182 128 174 184]
```

`and`로 쓰면 이런 에러가 난다.

```python
b[(b >= 100) and (b <= 200)]
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()</div></div>

배열 전체가 True인지 False인지 하나로 판단할 수 없다는 에러다. `and`는 값 하나씩 비교하는 게 아니라 양쪽을 **통째로** bool로 바꾸려고 하기 때문이다.

### np.where()

| 사용법 | 결과 |
|---|---|
| `np.where(boolean 배열)` | **True의 index**. 축별 index 배열을 튜플로 묶어 반환 |
| `np.where(boolean 배열, True 대체값, False 대체값)` | True/False를 **다른 값으로 바꾼** 배열 |

```python
score = np.array([40, 70, 55, 90, 30])
# 60점 이상이면 'Pass', 아니면 'Fail'로 바꾸기
result = np.where(score >= 60, "Pass", "Fail")
print(result)
```

```text
['Fail' 'Pass' 'Fail' 'Pass' 'Fail']
```

```python
r1 = np.where([
    [True, False, False],
    [True, False, True],
])
r1
```

```text
(array([0, 1, 1]), array([0, 0, 2]))
```

True 위치는 (0, 0), (1, 0), (1, 2)다. 결과 튜플은 **0축 index들**과 **1축 index들**로 나뉘어 있어서, 같은 자리끼리 짝지어 읽는다.

```python
r2 = np.where(b < 100)
# r2[0] # 0축의 index들
# r2[1] # 1축의 index들
# r2[2] # 2축의 index들
for i1, i2, i3 in list(zip(r2[0], r2[1], r2[2]))[:5]:
    print(f"b[{i1}, {i2}, {i3}] = {b[i1, i2, i3]}")
```

```text
b[0, 1, 1] = 9
b[0, 2, 0] = 70
b[0, 3, 1] = 87
b[0, 4, 1] = 72
b[0, 5, 5] = 99
```

```python
# 조건이 True인 값은 2번째 인수값으로, False인 값은 3번째 인수값으로 변환
r3 = np.where(b < 500, "500미만", "500이상")
r3[0, :2]
```

```text
array([['500이상', '500이상', '500이상', '500미만', '500이상', '500이상', '500이상'],
       ['500미만', '500미만', '500이상', '500미만', '500이상', '500이상', '500이상']],
      dtype='<U5')
```

> **보충** 노트북에는 `"500이하"`라고 썼는데 조건이 `b < 500`이라 500은 "이상" 쪽으로 간다. 라벨을 "미만"으로 고쳤다.

### np.any(), np.all()

| 함수 | True가 되는 경우 | 쓰임 |
|---|---|---|
| `np.any(boolean 배열)` | True가 **하나라도** 있으면 | 조건을 만족하는 값이 하나 이상 있는지 |
| `np.all(boolean 배열)` | **모두** True이면 | 모든 값이 조건을 만족하는지 |

```python
print(np.any([False, False, False, True]))  # 자료구조 안에 True가 있냐?
print(np.all([True, True, False]))          # 자료구조의 모든 값이 True냐?

b = np.random.randint(1000, size=(5, 6, 7))
if np.any(b < 0):  # b 안에 음수가 있냐?
    print("b 안에는 음수가 있습니다.")
else:
    print("b 안에는 음수가 없습니다.")

print(np.all(b >= 0))  # b의 모든 값이 0 이상인가?
b[0, 0, 0] = -1
print(np.all(b >= 0))
```

```text
True
False
b 안에는 음수가 없습니다.
True
False
```

필기에 정리한 표다.

| 하고 싶은 것 | 쓰는 것 |
|---|---|
| 조건이 True인 **값들** 조회 | boolean 인덱싱 |
| 조건이 True인 값들의 **index** | `np.where()` |
| 조건을 만족하는 값이 **하나라도** 있는지 | `np.any()` |
| **모든** 값이 조건을 만족하는지 | `np.all()` |

## 배열의 형태(shape) 변경

**원소 개수를 유지하는 상태에서** shape을 바꿀 수 있다.
예) `(16,)` → `(4, 4)` → `(2, 2, 4)` → `(2, 2, 2, 2)` → `(4, 4, 1)` → `(1, 16)`

```python
np.random.seed(0)  # 시드값이 같으면 같은 난수 생성
r1 = np.random.randint(0, 100, size=16)
print(r1)
print(r1.reshape(4, 4))
```

```text
[44 47 64 67 67  9 83 21 36 87 70 88 88 12 58 65]
[[44 47 64 67]
 [67  9 83 21]
 [36 87 70 88]
 [88 12 58 65]]
```

### reshape()

- `np.reshape(a, newshape)` 또는 `배열.reshape(newshape)`
- 원소 개수가 같은 shape으로만 바꿀 수 있다.
- 한 축의 크기를 **-1**로 주면 나머지로 알아서 계산한다. (전체 size ÷ 지정한 축 size들의 곱)
- 바꾼 결과를 새 배열로 반환한다.
- `np.reshape()` 함수는 list, tuple도 받아서 배열로 반환한다.

```python
x = np.arange(20)
print(x.reshape(2, 10).shape)
print(x.reshape(2, 2, 5).shape)
print(x.reshape(4, 5).shape)
print(x.reshape(1, 1, 1, 20).shape)
```

```text
(2, 10)
(2, 2, 5)
(4, 5)
(1, 1, 1, 20)
```

```python
x.reshape(3, 4)  # x 원소 수: 20 != 변환 후 원소 수: 12. 개수가 맞지 않아 오류 발생
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: cannot reshape array of size 20 into shape (3,4)</div></div>

```python
# -1로 지정한 축은 계산해서 결정한다. 변경할 shape 중 하나는 -1로 지정할 수 있다.
r5 = x.reshape(2, 5, -7)
r5.shape
```

```text
(2, 5, 2)
```

> **보충** 노트북은 `-7`을 넣었는데 동작했다. NumPy가 음수면 크기를 알아서 계산하는 자리로 보기 때문이다. 다만 문서에 약속된 값은 `-1`이고 다른 음수는 버전에 따라 막힐 수 있으니 `-1`을 쓴다.

```python
# 다른 타입의 자료구조를 reshape할 경우 reshape() 함수 사용. 결과는 ndarray로 반환
l = [1, 2, 10, 20, 30, 40]
np.reshape(l, (2, 3))
```

```text
array([[ 1,  2, 10],
       [20, 30, 40]])
```

### 차원 늘리기 (확장)

**dummy axis**(크기가 1인 축)를 추가한다. 원소 수는 그대로다.

| 방법 | 위치 |
|---|---|
| `reshape()` | 원하는 곳 어디든 |
| `배열[np.newaxis, ...]` / `배열[..., np.newaxis]` | 맨 앞 / 맨 뒤 |
| `np.expand_dims(배열, axis=위치)` | 지정한 축 |

`...`(Ellipsis)는 "나머지 축은 그대로"라는 뜻이다.

```python
x = np.arange(30)
# 1 -> 2차원 (dummy 축 늘려서)
y = x.reshape(1, -1)
print(y.shape)

x2 = np.arange(30).reshape(3, 5, 2)
y2 = x2.reshape(1, x2.shape[0], x2.shape[1], -1)  # (3, 5, 2) -> (1, 3, 5, 2)
print(y2.shape)
```

```text
(1, 30)
(1, 3, 5, 2)
```

```python
print(x.shape)
print(x[np.newaxis, ...].shape)
print(x[..., np.newaxis].shape)
print(x[np.newaxis, ..., np.newaxis, np.newaxis].shape)

print(x2[np.newaxis, ...].shape)  # (3, 5, 2) -> (1, 3, 5, 2)
print(x2[..., np.newaxis].shape)  # (3, 5, 2) -> (3, 5, 2, 1). np.newaxis는 가장 뒤에 추가됨
```

```text
(30,)
(1, 30)
(30, 1)
(1, 30, 1, 1)
(1, 3, 5, 2)
(3, 5, 2, 1)
```

차원을 늘리는 이유를 노트북에 적어 뒀다.

```python
# 더미데이터를 추가하는 이유는 차원을 늘리기 위함.
# 예를 들어, 2차원 배열을 3차원으로 만들 때, 새로운 차원에 대한 크기를 1로 설정하여
# 원래 데이터의 구조를 유지하면서 차원을 확장할 수 있습니다.
# 이렇게 하면 데이터의 형태를 변경하면서도 원래의 정보는 그대로 보존됩니다.
```

> **보충** 실제로 자주 마주치는 경우는 이렇다. 모델이 **2차원 입력 `(샘플 수, feature 수)`** 을 요구하는데 feature가 하나라 데이터가 1차원 `(100,)`일 때 `x[..., np.newaxis]`로 `(100, 1)`을 만든다. 딥러닝에서는 이미지 한 장 `(28, 28)`을 "1장짜리 묶음" `(1, 28, 28)`으로 만들어 모델에 넣을 때 쓴다.

```python
print(np.expand_dims(x, axis=0).shape)    # (30,) -> (1, 30). 0축에 새로운 차원 추가
print(np.expand_dims(x2, axis=-1).shape)  # (3, 5, 2) -> (3, 5, 2, 1). 가장 뒤에 추가
print(np.expand_dims(x2, axis=1).shape)   # (3, 5, 2) -> (3, 1, 5, 2). 1축에 추가
```

```text
(1, 30)
(3, 5, 2, 1)
(3, 1, 5, 2)
```

### 차원 줄이기 (축소)

**`np.squeeze(배열, axis=None)` / `배열.squeeze(axis=None)`**

- 지정한 dummy 축을 제거해 차원을 줄인다. 제거할 축의 크기는 **1이어야** 한다.
- 축을 지정하지 않으면 크기가 1인 축을 **모두** 제거한다. `(3, 1, 1, 2)` → `(3, 2)`

```python
r30 = np.array([20, 39, 20, 39])
print(r30.shape)
r30 = r30.reshape(1, 2, 1, 2, 1, 1)
print(r30.shape)
```

```text
(4,)
(1, 2, 1, 2, 1, 1)
```

> **보충** 노트북 주석에 "(4,)로 생성, 뒤에 `,`가 붙으면 (4, 1)로 생성"이라고 적었는데, `(4,)`의 쉼표는 원소가 하나인 **튜플**이라는 표시일 뿐이다. `(4, 1)`은 2차원이라 shape이 다르다.

```python
print(r30.squeeze().shape)              # 모든 dummy axis 제거
print(r30.squeeze(axis=2).shape)        # 제거할 축 index를 지정
print(r30.squeeze(axis=(0, 2, 4, 5)).shape)  # 여러 축 지정 -> tuple로 (list는 안 됨)
print(np.squeeze([[[[1, 2]]]]).shape)   # list, tuple도 가능. 이때는 함수를 사용
```

```text
(2, 2)
(1, 2, 2, 1, 1)
(2, 2)
(2,)
```

> **보충** `squeeze(axis=2)` 셀의 주석은 "(1,2,1,2,1,1) -> (1,2,2)로 변환"이었는데, 실제 결과는 2번 축 하나만 빠진 `(1, 2, 2, 1, 1)`이다. `(1, 2, 2)`가 되려면 2, 4, 5번 축을 같이 지정해야 한다.

크기가 1이 아닌 축을 지정하면 에러다.

```python
r30.squeeze(axis=1)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: cannot select an axis to squeeze out which has size not equal to one</div></div>

**`배열.flatten()`**: 다차원 배열을 1차원으로 만든다.

```python
print(x2.shape, x2.flatten().shape)
```

```text
(3, 5, 2) (30,)
```

### 원소 위치(축) 바꾸기

| 방법 | 동작 |
|---|---|
| `배열.T` | 2차원이면 0축 index와 1축 index를 바꾼 위치로 이동(전치) |
| `배열.transpose(새 축 순서)` | 원본의 축들을 지정한 순서로 재배치 |

```python
x = np.arange(12).reshape(3, 4)
print(x)
print(x.T.shape)
x.T  # 원소의 index를 변경. 0축 index <-> 1축 index
# x[1, 2] -> x.T[2, 1]
```

```text
[[ 0  1  2  3]
 [ 4  5  6  7]
 [ 8  9 10 11]]
(4, 3)
```

```text
array([[ 0,  4,  8],
       [ 1,  5,  9],
       [ 2,  6, 10],
       [ 3,  7, 11]])
```

```python
x10 = x2.transpose(1, 2, 0)  # 원본의 1축, 2축, 0축 순서로 새 배열을 만든다
print(x10.shape)             # (3, 5, 2) -> (5, 2, 3)
x2[1, 2, 0], x10[2, 0, 1]
```

```text
(5, 2, 3)
```

```text
(np.int64(14), np.int64(14))
```

`transpose(1, 2, 0)`은 "새 0축 = 원본 1축, 새 1축 = 원본 2축, 새 2축 = 원본 0축"이다. 그래서 원본 `[1, 2, 0]`에 있던 값이 새 배열에서는 `[2, 0, 1]`로 간다.

> **보충** `reshape`과 `transpose`는 shape만 보면 비슷해 보이지만 다르다. `reshape`은 원소를 **순서대로 다시 담고**, `transpose`는 **축을 돌린다.** `(3, 4)`를 `(4, 3)`으로 만들어도 결과가 다르다.

```python
print(x.reshape(4, 3))
print(x.T)
```

```text
[[ 0  1  2]
 [ 3  4  5]
 [ 6  7  8]
 [ 9 10 11]]
[[ 0  4  8]
 [ 1  5  9]
 [ 2  6 10]
 [ 3  7 11]]
```

## 배열 연산

### 벡터화 연산

- 배열과 **스칼라** 연산은 원소마다 계산한다.
- 배열끼리 연산은 **같은 index의 원소끼리** 계산한다(element-wise 연산).
- 배열끼리 연산하려면 **shape이 같아야** 한다. 다르면 브로드캐스팅 조건을 만족할 때만 된다.

$$
10 - \begin{bmatrix} 1 \\ 2 \\ 3 \end{bmatrix} = \begin{bmatrix} 9 \\ 8 \\ 7 \end{bmatrix}
\qquad
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} + \begin{bmatrix} 10 & 20 \\ 30 & 40 \end{bmatrix} = \begin{bmatrix} 11 & 22 \\ 33 & 44 \end{bmatrix}
$$

```python
np.random.seed(0)
x = np.arange(10).reshape(2, 5)                 # 0에서 9까지의 정수로 채운 (2, 5)
y = np.random.randint(-10, 10, size=(2, 5))     # -10 ~ 10 사이 정수 난수 (2, 5)
z = np.arange(8).reshape(2, 4)                  # shape이 다르다
print(x)
print(y)
print(x + y)   # 배열 + 배열 => 같은 index 값 간에 연산
print(x > y)
print(x * 10)  # 배열과 상수 간의 연산 -> 배열의 모든 원소에 상수를 연산
print(y > 0)
```

```text
[[0 1 2 3 4]
 [5 6 7 8 9]]
[[  2   5 -10  -7  -7]
 [ -3  -1   9   8  -6]]
[[ 2  6 -8 -4 -3]
 [ 2  5 16 16  3]]
[[False False  True  True  True]
 [ True  True False False  True]]
[[ 0 10 20 30 40]
 [50 60 70 80 90]]
[[ True  True False False False]
 [False False  True  True False]]
```

```python
x > z  # x와 z는 shape이 다르므로 연산 불가
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: operands could not be broadcast together with shapes (2,5) (2,4) </div></div>

### 내적 (Dot product)

- `@` 연산자 또는 `np.dot(a, b)`
- **같은 index의 원소끼리 곱한 뒤 모두 더한다.** 벡터끼리의 내적은 **스칼라**가 된다.
- $x \cdot y$ 또는 $x^T y$로 쓴다.
- 두 벡터의 원소 개수가 같아야 한다. 수학적으로는 앞이 행벡터, 뒤가 열벡터인데, NumPy는 1차원끼리면 알아서 그렇게 처리한다.

$$
x^T y = \begin{bmatrix} 1 & 2 & 3 \end{bmatrix} \begin{bmatrix} 4 \\ 5 \\ 6 \end{bmatrix} = 1 \times 4 + 2 \times 5 + 3 \times 6 = 32
$$

```python
x = np.array([1, 2, 3])
y = np.array([4, 5, 6])
print(np.sum(x * y))  # 원소별 곱을 계산한 후 그 결과를 모두 더함
print(x @ y)          # 사이즈가 같은 1차원 배열끼리만 연산 가능
print(np.dot(x, y))
```

```text
32
32
32
```

세 가지 결과가 같다. 내적은 결국 "원소별 곱의 합"이다.

| 구분 | 결과 |
|---|---|
| 벡터 · 벡터 | 스칼라 |
| 행렬 · 벡터 | 벡터 |
| 행렬 · 행렬 | 행렬 |

### 행렬곱

- 앞 행렬의 **행**과 뒤 행렬의 **열**끼리 내적한다.
- **앞 행렬의 열 수 = 뒤 행렬의 행 수**여야 한다.
- 결과 shape은 **(앞 행렬의 행 수, 뒤 행렬의 열 수)**. 예: `(3 × 2) @ (2 × 5) = (3 × 5)`

$$
A = \begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \end{bmatrix},\quad
B = \begin{bmatrix} 1 & 2 \\ 3 & 4 \\ 5 & 6 \end{bmatrix},\quad
A B = \begin{bmatrix} 1\cdot1 + 2\cdot3 + 3\cdot5 & 1\cdot2 + 2\cdot4 + 3\cdot6 \\ 4\cdot1 + 5\cdot3 + 6\cdot5 & 4\cdot2 + 5\cdot4 + 6\cdot6 \end{bmatrix} = \begin{bmatrix} 22 & 28 \\ 49 & 64 \end{bmatrix}
$$

```python
A = np.arange(1, 7).reshape(2, 3)
B = np.arange(1, 7).reshape(3, 2)
C = A.copy()
A @ B
```

```text
array([[22, 28],
       [49, 64]])
```

노트북 주석으로 결과를 표로 풀어 뒀다.

| | B의 첫 번째 열 | B의 두 번째 열 |
|---|---|---|
| A의 첫 번째 행 | 22 | 28 |
| A의 두 번째 행 | 49 | 64 |

`(2, 3) @ (2, 3)`은 앞의 열 수(3)와 뒤의 행 수(2)가 달라서 안 된다.

```python
A @ C  # (2, 3) @ (2, 3)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)-&gt;(n?,m?) (size 2 is different from 3)</div></div>

같은 shape끼리 곱하고 싶은 거라면 행렬곱이 아니라 원소별 곱 `A * C`다. 아니면 한쪽을 전치해서 `A @ C.T`로 `(2, 3) @ (3, 2)`를 만든다.

### 내적의 예: 가중합

> 가격: 사과 2000, 귤 1000, 수박 10000
> 개수: 사과 10, 귤 20, 수박 2
> 총 가격? 2000×10 + 1000×20 + 10000×2

```python
price = np.array([2000, 1000, 10000])
cnt = np.array([10, 20, 2])
total_price = price @ cnt
print(total_price)
```

```text
60000
```

손님이 여러 명이면 개수를 행렬로 만들어 **한 번에** 계산한다.

```python
cnts = np.array([
    [10, 20, 2],
    [5, 15, 1],
    [100, 200, 20],
    [30, 20, 10],
])
price = price[..., np.newaxis]  # (3,) -> (3, 1)
print(cnts.shape, price.shape)

result = cnts @ price  # (4, 3) @ (3, 1) = (4, 1)
print(result.shape)
print(result)
```

```text
(4, 3) (3, 1)
(4, 1)
[[ 60000]
 [ 35000]
 [600000]
 [180000]]
```

4명의 총액이 한 번에 나왔다. 노트북에 이 계산이 왜 중요한지 적어 뒀다.

```python
# 이러한 내적 연산은 머신러닝에서 가중합을 구할 때 사용되고,
# 딥러닝에서는 신경망의 각 층에서 가중합을 계산하여 다음 층으로 전달하는 과정에서 자주 사용됩니다.
# 예를 들어, 입력 데이터가 (batch_size, input_features) shape의 행렬이고,
# 가중치가 (input_features, output_features) shape의 행렬이라면,
# 입력 데이터와 가중치의 내적을 계산하여 (batch_size, output_features) shape의 행렬을 얻을 수 있습니다.
```

위 예에 대입하면 손님 4명이 batch, 과일 3종이 input feature, 가격이 가중치, 총액이 output이다. 선형 회귀의 예측도 같은 계산이다. `feature × 가중치`의 합.

## 기술통계 함수

- 통계값을 계산해 주는 함수들이다.
- 두 가지 구문을 지원한다.
  1. `np.함수(배열)`: ndarray뿐 아니라 list 같은 다른 자료구조에도 쓸 수 있다. 예: `np.sum(x)`
  2. `배열.메소드()`: 예: `x.sum()`
- 공통 매개변수 `axis=None`: 다차원 배열에서 **어느 축을 따라** 계산할지. None(기본)은 전체를 펼쳐서 계산한다.
- 배열에 **NaN**(Not a Number, 누락된 값)이 있으면 결과도 NaN이 된다. NaN을 무시하는 **안전모드 함수**(`np.nan` + 함수 이름)가 따로 있다.

| 함수 | 계산 | 안전모드 |
|---|---|---|
| `sum` | 합 | `nansum` |
| `mean` | 평균 | `nanmean` |
| `median` | 중앙값 | `nanmedian` |
| `std`, `var` | 표준편차, 분산 | `nanstd`, `nanvar` |
| `min`, `max` | 최솟값, 최댓값 | `nanmin`, `nanmax` |
| `argmin`, `argmax` | 최솟값, 최댓값의 **index** | `nanargmin`, `nanargmax` |
| `percentile`, `quantile` | 백분위수, 분위수 | `nanpercentile`, `nanquantile` |

```python
l = [
    [1, 2, 3],
    [10, 20, 30],
]
# np.함수(): 다양한 자료구조의 값들의 통계량 계산
print(np.std(l))          # 전체
print(np.std(l, axis=0))  # 0축 방향으로 (열별)
print(np.std(l, axis=1))  # 1축 방향으로 (행별)
```

```text
10.708252269472673
[ 4.5  9.  13.5]
[0.81649658 8.16496581]
```

```python
np.random.seed(0)
x = np.random.randint(10, 20, size=(3, 4, 5))
print(x.shape, x.size)
print(x.mean())  # 전체 원소들의 평균 (axis=None)
r = x.mean(axis=0)
print(r.shape)
```

```text
(3, 4, 5) 60
14.433333333333334
(4, 5)
```

**`axis`가 헷갈리는 이유와 노트북의 정리**

노트북에 `axis`를 groupby로 이해하는 방법을 길게 적어 뒀다.

```python
# 3차원 (3,4,2) => 0축: [반], 1축: [학생 번호], 2축: [과목]
# axis는 집계하고 싶은 대상, 나머지 axis는 groupby
# mean(axis=0) = groupby(번호, 과목).mean()과 같은 개념 → 결과 (4, 2)
# mean(axis=1) = groupby(반, 과목).mean()과 같은 개념   → 결과 (3, 2)
# mean(axis=2) = groupby(반, 번호).mean()과 같은 개념   → 결과 (3, 4)
```

핵심은 **지정한 축이 사라진다**는 것이다. `axis=0`을 주면 0축(반)을 따라 값들을 모아 평균 내서 0축이 없어지고, 남은 (번호, 과목)별 결과가 나온다. 같은 노트북에 "mean(axis=0) → 반별 평균"이라는 주석도 있었는데, 이건 반대다. 반별 평균은 반을 **남기고** 나머지를 합쳐야 하니 `mean(axis=(1, 2))`다.

```python
# 보충: 반 3개 × 학생 4명 × 과목 2개 점수로 확인
np.random.seed(1)
scores = np.random.randint(50, 101, size=(3, 4, 2))
print(scores.mean(axis=0).shape)       # (학생 번호, 과목)별 평균: 반을 합침
print(scores.mean(axis=(1, 2)))        # 반별 평균: 학생, 과목을 합침
print(scores.mean(axis=(0, 1)))        # 과목별 평균: 반, 학생을 합침
```

```text
(4, 2)
[67.5  64.   78.25]
[68.83333333 71.        ]
```

**가중평균**

```python
a = np.array([1, 2, 3])
print(a.mean())
print(np.average(a, weights=[3, 2, 5]))  # 가중평균
w = np.array([3, 2, 5])
print(a @ w / np.sum(w))                 # 내적으로 직접 계산
```

```text
2.0
2.2
2.2
```

가중평균도 `가중치와의 내적 ÷ 가중치 합`이라 내적으로 같은 값이 나온다.

**결측치(NaN)**

```python
b = np.array([1, 2, np.nan, 3])
print(np.isnan(b))         # 결측치 확인
print(np.isnan(b).sum())   # 결측치 개수
print(np.isnan(b).mean())  # 결측치 비율
```

```text
[False False  True False]
1
0.25
```

True는 1, False는 0으로 계산되니 `sum()`은 개수, `mean()`은 비율이 된다.

```python
# 결측치를 포함해서 계산
print(b.mean())
print(b.max())
print(b.argmax())  # NaN이 있으면 NaN의 위치를 반환

# 결측치 빼고 계산 - 안전모드 (메소드는 없고 함수로만)
print(np.nanmean(b))
print(np.nansum(b))
print(np.nanmax(b))
print(np.nanargmax(b))
```

```text
nan
nan
2
2.0
6.0
3.0
3
```

## 브로드캐스팅 (Broadcasting)

- 사전적 의미: 퍼트린다, 전파한다.
- **shape이 다른 배열끼리 연산할 때** shape을 맞춰 연산이 되게 한다. 모든 경우가 되는 건 아니고 조건이 맞아야 한다.

**조건**

1. 두 배열의 **축 개수가 다르면**, 작은 쪽 shape의 **앞쪽을 1로** 채운다.
   - `(2, 3) + (3,)` → `(2, 3) + (1, 3)`
2. 축 개수가 같고 크기가 다르면, **크기가 1인 쪽**이 상대 크기만큼 늘어난다(원소를 복사).
   - `(2, 3) + (1, 3)` → `(2, 3) + (2, 3)`
   - 1이 아닌 축끼리는 크기가 같아야 한다.

노트북 주석에 3차원 예로 정리해 뒀다.

```python
# a = (3,5,2), b = (2,)
# a와 b의 차원이 다르지만, b의 차원을 a의 차원에 맞춰서 브로드캐스팅이 가능함.
# (3,5,2) + (2,) -> (3,5,2) + (1,1,2) -> (3,5,2)로 브로드캐스팅이 가능함.
# 즉 shape은 큰 차원에 맞춰지고 안의 값은 작은 차원의 값이 반복적으로 들어가서 연산이 가능하게 되는 것.
# 앞쪽을 1로 채워서 차원을 맞춰줌.
```

```python
x = np.arange(3).reshape(3, 1)
y = np.arange(1)
print(x + y)  # (3, 1) + (1,) -> (3, 1) + (1, 1) -> (3, 1)

X = np.arange(12).reshape(3, 4)
Y = np.arange(3).reshape(3, 1)
X + Y  # (3, 4) + (3, 1) -> Y의 열이 4개로 복사
```

```text
[[0]
 [1]
 [2]]
```

```text
array([[ 0,  1,  2,  3],
       [ 5,  6,  7,  8],
       [10, 11, 12, 13]])
```

`Y`의 `[0, 1, 2]`가 각 행에 더해졌다. 0행은 +0, 1행은 +1, 2행은 +2.

> **보충** 실제로 가장 많이 쓰는 브로드캐스팅은 **열별 평균 빼기**다. `(100, 3)` 데이터에서 열별 평균 `(3,)`을 빼면 `(1, 3)`으로 늘어나 모든 행에서 빠진다. 머신러닝 전처리의 표준화(스케일링)가 이 계산이다.

```python
np.random.seed(0)
data = np.random.normal(loc=[10, 50, 100], scale=[1, 5, 10], size=(100, 3))
print(data.mean(axis=0).round(2))
centered = (data - data.mean(axis=0)) / data.std(axis=0)  # (100, 3) - (3,)
print(centered.mean(axis=0).round(2), centered.std(axis=0).round(2))
```

```text
[10.1  50.53 98.76]
[ 0.  0. -0.] [1. 1. 1.]
```

평균이 서로 다른 세 열이 모두 평균 0, 표준편차 1이 됐다.

크기가 1이 아니면서 다른 축이 있으면 안 된다.

```python
z = np.arange(4).reshape(2, 2)
x + z  # (3, 1) + (2, 2): 0축이 3과 2로 다르고 둘 다 1이 아님
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: operands could not be broadcast together with shapes (3,1) (2,2) </div></div>

## 정리

- 인덱싱은 index로 고른 축이 사라지고, 슬라이싱은 축이 남는다. 팬시 인덱싱 `[[행들], [열들]]`은 같은 자리끼리 짝지은 칸만 고른다.
- boolean 인덱싱은 `&`, `|`, `~`와 괄호. 값은 boolean 인덱싱, 위치는 `np.where`, 존재 여부는 `np.any`/`np.all`.
- `reshape`은 원소 순서대로 다시 담기, `transpose`는 축 돌리기. 크기 1인 축은 `newaxis`/`expand_dims`로 늘리고 `squeeze`로 줄인다.
- 내적은 원소별 곱의 합, 행렬곱은 앞 행렬의 열 수 = 뒤 행렬의 행 수. 머신러닝의 가중합이 이 계산이다.
- 통계 함수의 `axis`는 **지정한 축이 사라진다.** NaN이 있으면 `nan` 함수를 쓴다.
- 브로드캐스팅은 shape 뒤쪽부터 맞추고, 크기 1인 축만 늘어난다.
