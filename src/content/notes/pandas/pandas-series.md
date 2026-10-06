---
title: "Series: 인덱싱·원소 단위 연산·결측치"
description: "Pandas의 1차원 자료구조 Series를 만들고, index와 index 이름으로 조회·슬라이싱하고, 원소 단위 연산과 boolean 인덱싱, 기술통계량, 결측치 처리까지 정리합니다."
category: 'Tech'
subcategory: 'Data Analysis'
series: 'Pandas'
seriesOrder: 1
originalNotebook: "01_Pandas_Series.ipynb"
tags: ["Python","Pandas","Series"]
date: 2026-04-29
---

> SKN31 데이터 분석 실습 노트북 `01_Pandas_Series.ipynb`의 필기를 바탕으로 정리했습니다.
> 노트북은 셀을 여러 번 오가며 실행해서 변수 내용이 섞이거나 출력이 비어 있는 곳이 있었습니다. 그래서 필기 코드를 순서대로 정리한 뒤 **pandas 3.0.2에서 처음부터 다시 실행한 결과**를 실었습니다. 정리하면서 일부 변수 이름을 바꿨고, `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- Pandas가 무엇이고 Series와 DataFrame이 어떤 관계인지
- Series 만들기와 index 이름
- `loc`, `iloc`으로 조회하기(indexing, fancy indexing, slicing)
- 원소 단위 연산과 boolean 인덱싱
- 주요 메소드와 정렬
- 변수의 유형과 기술통계량
- 결측치 확인과 처리

## Pandas 개요

- 데이터 분석 기능을 제공하는 Python 패키지다. 데이터셋으로 다양한 통계 처리를 할 수 있다.
- **표 형태의 데이터**를 다루는 데 특화돼 있다. "엑셀 기능을 제공하는 Python 모듈"이라고 생각하면 이해가 쉽다.
- 표를 다루기 위한 두 클래스를 제공한다.
  - **Series**: 1차원 자료구조
  - **DataFrame**: 2차원 행렬 구조의 표(table)
- R, SQL, 엑셀처럼 표에서 원하는 데이터를 가져오고 통계치를 만들어 낸다.

```bash
pip install pandas --upgrade
```

노트북 메모에 수업에서 들은 도구별 역할을 적어 두었다.

- **Pandas**: SQL·엑셀처럼 데이터를 표로 정리하는 도구
- **Matplotlib**: 데이터를 시각화하는 도구
- **머신러닝**: 표 데이터에서 패턴을 찾는 데 특화
- **딥러닝**: 이미지, 자연어, 음성 같은 비정형 데이터를 다루는 데 특화 (LLM 챗봇 등)

```python
import pandas as pd
import numpy as np

pd.__version__
```

```text
'3.0.2'
```

## Series

- **1차원** 자료구조다.
- DataFrame(표)의 **한 행**이나 **한 열**을 표현한다.
- 각 원소는 **index(순번)** 와 **index 이름**을 가진다.
- **벡터화 연산(element-wise 연산)** 을 지원한다. Series에 연산을 하면 각 원소에 연산이 적용된다.

### Series 만들기

`pd.Series(1차원 iterable)`로 만든다. list, tuple, ndarray 등을 넣는다.

```python
data = [0, 10, 20, 30, 40, 50]  # 리스트 = 1차원 형태
s1 = pd.Series(data)
s1
```

```text
0     0
1    10
2    20
3    30
4    40
5    50
dtype: int64
```

출력의 왼쪽이 **index 이름**, 오른쪽이 **원소 값**, 마지막 줄 `dtype`은 원소들의 데이터 타입이다.

- **index 이름**: 딕셔너리의 key 역할을 한다. 지정하지 않으면 양수 순번이 index 이름이 된다.
- **dtype**: NumPy 타입을 쓴다. `int64`는 "정수(int)이고 값 하나를 64bit에 저장"한다는 뜻이다.

index 이름은 `index=`로 직접 지정할 수 있다.

```python
subject = pd.Series(
    [70, 100, 80, 95, 75],
    index=["국어", "국어", "수학", "과학", "국사"]  # 각 값의 index 이름 (값 개수와 같아야 한다)
)
subject
```

```text
국어     70
국어    100
수학     80
과학     95
국사     75
dtype: int64
```

딕셔너리의 key와 달리 **index 이름은 중복될 수 있다**. `국어`가 두 번 들어갔다.

```python
# Series 객체의 속성
print("Series의 shape:", subject.shape)
print("Series의 타입:", subject.dtype)
print("Series의 총원소개수:", subject.size)
print("Series의 index이름 조회:", subject.index)
```

```text
Series의 shape: (5,)
Series의 타입: int64
Series의 총원소개수: 5
Series의 index이름 조회: Index(['국어', '국어', '수학', '과학', '국사'], dtype='str')
```

### index 이름 바꾸기

```python
# 한 번에 변경: index 속성에 새 리스트를 대입
s1.index = list("ABCDEF")
s1
```

```text
A     0
B    10
C    20
D    30
E    40
F    50
dtype: int64
```

```python
# 개별 변경: rename()에 {기존이름: 새이름} 딕셔너리 전달
s1.rename({"A": "기역"}, inplace=True)
s1
```

```text
기역     0
B     10
C     20
D     30
E     40
F     50
dtype: int64
```

`inplace=True`를 주면 새 Series를 만들지 않고 원본을 바꾼다.

## 원소 조회: Indexing과 Slicing

Series의 원소는 두 종류의 식별자를 가진다.

| 식별자 | 설명 |
|---|---|
| **index (순번)** | 자동으로 붙는 순번. 리스트·튜플의 index와 같다. 앞에서부터 0, 1, 2… 뒤에서부터 -1, -2… |
| **index 이름** | 명시적으로 붙인 이름. 딕셔너리의 key 역할. 중복될 수 있다. 생략하면 양수 순번이 이름이 된다 |

출력에 보이는 것은 index 이름이다. 순번은 Pandas 내부에서 관리된다. DataFrame도 같은 구조다.

### Indexing

| 방법 | 기준 |
|---|---|
| `s.iloc[순번]` | index(순번) |
| `s.loc[index이름]`, `s[index이름]` | index 이름 |
| `s.index이름` | 이름이 Python 식별자 규칙에 맞을 때만 `.` 표기법 |
| `s.loc[[이름, 이름, ...]]` | **fancy indexing**: 여러 원소를 리스트로 한 번에 |

```python
s = pd.Series(range(20))  # index 이름이 0~19 인 Series
v = s.loc[3]  # index 이름으로 조회
print(type(v), v)
```

```text
<class 'numpy.int64'> 3
```

꺼낸 값의 타입은 Python `int`가 아니라 NumPy의 `numpy.int64`다. Python 값으로 바꾸려면 `v.item()`을 쓴다.

```python
print(s.iloc[3])    # 양수 순번
print(s.iloc[-3])   # 음수 순번: 뒤에서 3번째
```

```text
3
17
```

```python
s.loc[[3, 10, 2, 6, 15]]  # fancy indexing: 원하는 순서대로
```

```text
3      3
10    10
2      2
6      6
15    15
dtype: int64
```

```python
s.iloc[[1, 5, 7, -1, -3]]
```

```text
1      1
5      5
7      7
19    19
17    17
dtype: int64
```

이름이 문자열이면 문자열로 조회한다.

```python
subject.loc["과학"]
```

```text
np.int64(95)
```

```python
subject.loc["국어"]  # 이름이 중복되면 해당 원소 모두를 Series로 반환
```

```text
국어     70
국어    100
dtype: int64
```

### Slicing

`s[start : stop : step]` 형식이다.

- start 생략: 처음부터, stop 생략: 끝까지, step 생략: 1씩
- start > stop이고 step이 음수면 역순으로 조회한다.
- **stop 포함 여부가 기준에 따라 다르다.**
  - **순번(`iloc`)**: stop을 **포함하지 않는다.** (리스트와 같다)
  - **이름(`loc`)**: stop을 **포함한다.**

```python
s.loc[3:10]  # index 이름으로 slicing: stop(10) 포함
```

```text
3      3
4      4
5      5
6      6
7      7
8      8
9      9
10    10
dtype: int64
```

```python
s.iloc[3:10]  # 순번으로 slicing: stop(10) 미포함
```

```text
3    3
4    4
5    5
6    6
7    7
8    8
9    9
dtype: int64
```

이름으로 slicing할 때 stop을 포함하는 이유는 이름에는 "다음 순번"이라는 개념이 없기 때문이다. `'수학':'국사'`라고 하면 사람은 국사까지라고 생각한다.

```python
subject.loc["수학":"국사"]
```

```text
수학    80
과학    95
국사    75
dtype: int64
```

```python
subject.loc["국사":"수학":-1]  # 역순
```

```text
국사    75
과학    95
수학    80
dtype: int64
```

```python
print(s.iloc[:10:2].tolist())  # start 생략 = 0
print(s.iloc[10::2].tolist())  # stop 생략 = 끝까지
print(s.iloc[-5:].tolist())    # 뒤에서 5개
```

```text
[0, 2, 4, 6, 8]
[10, 12, 14, 16, 18]
[15, 16, 17, 18, 19]
```

### 보충: s[정수]는 무엇을 기준으로 하나

필기에 남긴 주석은 "index 연산자(`[]`)에 정수로 slicing하면 순번 기준으로 처리된다"였다.

```python
s[3:10]  # [] 안의 정수 slicing → 순번 기준 (10 미포함)
```

```text
3    3
4    4
5    5
6    6
7    7
8    8
9    9
dtype: int64
```

`s[3]`처럼 `[]` 하나로 쓰면 이름인지 순번인지 헷갈리기 쉽다. 의도를 분명히 하려면 이름은 `loc`, 순번은 `iloc`을 명시하는 편이 안전하다.

### Slicing 결과를 바꾸면 원본도 바뀔까

필기에는 다음과 같이 적혀 있다.

- Slicing 결과는 원본의 **참조(View)** 를 반환한다.
- Slicing 결과의 원소를 바꾸면 원본도 같이 바뀐다.
- 원본을 지키려면 `slicing결과.copy()`로 복사한 뒤 바꿔야 한다.

노트북에서는 이 셀들의 출력이 남아 있지 않아 다시 실행해 확인했다.

```python
result = subject.loc["수학":"국사"]
result.loc["국사"] = 100   # slicing 결과의 값을 변경
result
```

```text
수학     80
과학     95
국사    100
dtype: int64
```

```python
subject  # 원본
```

```text
국어     70
국어    100
수학     80
과학     95
국사     75
dtype: int64
```

**원본이 바뀌지 않았다.** pandas 3.0부터 **Copy-on-Write**가 항상 켜져 있기 때문이다. slicing 결과를 고치는 순간 복사본이 만들어지므로 원본에 영향을 주지 않는다. 필기 내용은 pandas 2.x 이전의 동작이다. (`보충`)

그래도 `copy()`는 여전히 의미가 있다. "이 객체는 원본과 별개로 쓰겠다"는 의도를 코드에 드러내고, pandas 2.x 환경에서도 같은 결과를 보장한다.

```python
result2 = subject.loc["국어":"수학"].copy()  # 명시적으로 복사
result2.loc["국어"] = 0
result2
```

```text
국어     0
국어     0
수학    80
dtype: int64
```

`국어`라는 이름이 두 개라서 `loc["국어"]`에 대입하면 두 원소가 모두 바뀐다.

### 정리: 상황별 조회 방법

| 상황 | 방법 |
|---|---|
| 원소 하나 | indexing |
| 여러 원소를 골라서 | fancy indexing |
| 범위로 | slicing |
| 조건에 맞는 원소들 | boolean indexing (아래) |

## 원소 단위 연산 (Element-wise)

Pandas의 Series·DataFrame은 연산하면 **원소 단위**로 계산한다. **벡터화(vectorization)** 라고도 한다.

- Series와 값(스칼라)의 연산: 각 원소와 그 값을 연산한다.
- Series끼리의 연산: **index 이름이 같은 원소끼리** 연산한다. (순번이 아니라 이름 기준)

```python
index_name = ["국어", "영어", "수학", "과학"]
s1 = pd.Series([80, 90, 100, 50], index=index_name)
s2 = pd.Series([100, 50, 80, 100], index=index_name)
s3 = pd.Series([1, 2, 3, 4])

s1 ** 2
```

```text
국어     6400
영어     8100
수학    10000
과학     2500
dtype: int64
```

```python
s1 > 50
```

```text
국어     True
영어     True
수학     True
과학    False
dtype: bool
```

비교 연산의 결과는 bool 값의 Series다. 여러 조건을 묶을 때는 Python의 `and`, `or`, `not`을 쓸 수 없다.

| Pandas | 의미 |
|---|---|
| `&` | and |
| `\|` | or |
| `~` | not |

각 조건은 반드시 `( )`로 묶는다. `&`가 비교 연산자보다 먼저 계산되기 때문이다.

```python
(s1 >= 50) & (s1 <= 80)
```

```text
국어     True
영어    False
수학    False
과학     True
dtype: bool
```

```python
s1 - s2  # 같은 index 이름끼리 연산
```

```text
국어   -20
영어    40
수학    20
과학   -50
dtype: int64
```

```python
s1 + s3  # 같은 index 이름이 하나도 없으면?
```

```text
0    NaN
1    NaN
2    NaN
3    NaN
과학   NaN
국어   NaN
수학   NaN
영어   NaN
dtype: float64
```

`s1`의 이름은 과목명, `s3`의 이름은 0~3이라 짝이 맞는 원소가 없다. 짝이 없는 원소는 결과가 `NaN`(결측치)이 되고, 양쪽 이름이 모두 결과에 남는다. 값이 `NaN`이 섞여서 dtype도 `float64`로 바뀌었다.

## Boolean 인덱싱

`[]` 안에 bool 리스트(또는 bool Series)를 넣으면 **True인 위치의 원소만** 조회한다. 원하는 조건의 값을 고를 때 쓴다.

```python
s1[[False, True, False, True]]  # True인 순번의 값만
```

```text
영어    90
과학    50
dtype: int64
```

조건식의 결과가 bool Series이므로, 조건식을 그대로 `[]`에 넣으면 된다.

```python
s1[s1 >= 90]
```

```text
영어     90
수학    100
dtype: int64
```

```python
s1[(s1 >= 80) & (s1 <= 90)]
```

```text
국어    80
영어    90
dtype: int64
```

```python
s1[(s1 < 80) | (s1 > 90)]
```

```text
수학    100
과학     50
dtype: int64
```

```python
s1[~((s1 >= 80) & (s1 <= 90))]  # 위 조건의 반대
```

```text
수학    100
과학     50
dtype: int64
```

범위 조건은 `between()`으로 짧게 쓸 수 있다. 양 끝값을 포함한다.

```python
s1[s1.between(80, 90)]
```

```text
국어    80
영어    90
dtype: int64
```

## 주요 메소드와 속성

```python
s = pd.Series(range(100))
print("원소개수:", s.size, s.shape)
print("타입:", s.dtype)
s.head()   # 앞에서 N개 (기본 5)
```

```text
원소개수: 100 (100,)
타입: int64
```

```text
0    0
1    1
2    2
3    3
4    4
dtype: int64
```

```python
s.tail(3)  # 뒤에서 N개
```

```text
97    97
98    98
99    99
dtype: int64
```

### 타입 변환: astype()

```python
s.astype("int8").dtype
```

```text
dtype('int8')
```

| 종류 | 타입 |
|---|---|
| 정수 | `int8`, `int16`, `int32`, `int64` |
| 실수 | `float16`, `float32`, `float64` |

크기를 늘리는 변환은 문제없지만, **줄일 때는 원소 값이 그 타입 범위에 들어가는지** 확인해야 한다.

```python
s4 = pd.Series([1_000_000, 50_000_000])
s4.astype("int8")  # int8: -128 ~ 127
```

```text
0     64
1   -128
dtype: int8
```

경고도 에러도 없이 엉뚱한 값(`64`, `-128`)이 나왔다. 범위를 넘는 값이 잘려서 저장된 것이다. 메모리를 줄이려고 타입을 낮출 때 가장 조심해야 하는 부분이다. 필기 주석에는 int8 범위를 `-127 ~ 128`로 적었는데 정확히는 `-128 ~ 127`이다.

### 값 검사와 개수 세기

```python
s.isin([0, 1, 2]).head()  # 원소가 목록 안에 있는지
```

```text
0     True
1     True
2     True
3    False
4    False
dtype: bool
```

```python
langs = pd.Series(["python", "c++", "python", "java", "java", "python"])
langs.value_counts()  # 고유값별 개수
```

```text
python    3
java      2
c++       1
Name: count, dtype: int64
```

```python
langs.value_counts(normalize=True)  # 전체 대비 비율
```

```text
python    0.500000
java      0.333333
c++       0.166667
Name: proportion, dtype: float64
```

```python
langs.nunique()  # 고유값의 개수
```

```text
3
```

### 정렬

| 메소드 | 기준 |
|---|---|
| `sort_index()` | index 이름 |
| `sort_values()` | 값 |

- `ascending=False`: 내림차순 (기본 `True`: 오름차순)
- `inplace=True`: 원본을 정렬. 기본 `False`면 정렬된 새 Series를 반환
- 결측치(`NaN`)는 정렬 방식과 상관없이 **마지막**에 나온다.

```python
s1 = pd.Series([80, 90, 100, 50], index=["국어", "영어", "수학", "과학"])
s1.sort_index()  # index 이름 오름차순
```

```text
과학     50
국어     80
수학    100
영어     90
dtype: int64
```

```python
s1.sort_values(ascending=False)  # 값 내림차순
```

```text
수학    100
영어     90
국어     80
과학     50
dtype: int64
```

필기에는 `# 정렬방식 - 내림차순` 주석 아래 `ascending=True`라고 적혀 있어 오름차순 결과가 나왔다. 내림차순은 `False`다.

`value_counts()` 결과도 Series라서 정렬하고 바로 그래프로 그릴 수 있다.

```python
langs.value_counts().sort_values().plot(kind="bar")
```

![그래프 출력](/images/pandas/pandas-series-1.png)

## 통계에서 변수의 유형

**변수(variable)** 는 관찰 대상의 특성을 나타내는 데이터의 속성이다. 크게 범주형과 수치형으로 나뉜다.

| 대분류 | 소분류 | 특징 | 예 |
|---|---|---|---|
| **범주형** (Categorical) | 명목형 (Nominal) | 범주 사이에 순서가 없다 | 성별, 혈액형, 지역 |
| | 순서형 (Ordinal) | 순서는 있지만 간격이 일정하지 않다 | 학점, 직급, 만족도 |
| **수치형** (Numeric) | 이산형 (Discrete) | 정수 단위로만 표현 | 방문 고객 수, 판매 개수 |
| | 연속형 (Continuous) | 두 값 사이에 무한히 많은 값 | 키, 몸무게, 온도 |

범주형은 값 사이에 크기나 거리 개념이 없고, 수치형은 사칙연산이 가능하다. 어떤 통계량을 쓸지가 이 구분으로 정해진다. 예를 들어 범주형에는 평균 대신 최빈값을 쓴다.

## 기술통계량

데이터셋의 특징을 숫자 하나로 요약한 것이다.

| 통계량 | 설명 |
|---|---|
| **평균** | 합계 ÷ 개수. 대표값으로 쓰지만 이상치(너무 크거나 작은 값)의 영향을 많이 받는다 |
| **중앙값** | 작은 값부터 나열했을 때 가운데 값. 이상치의 영향을 받지 않는다 |
| **분산** | 편차(평균과 각 값의 차이)의 제곱을 평균 낸 값 |
| **표준편차** | 분산의 제곱근. 원래 단위로 되돌린 흩어짐의 정도 |
| **최빈값** | 가장 많이 나온 값. 범주형의 대표값 |
| **분위수** | 크기순으로 정렬해 N등분한 위치의 값. 4분위, 10분위, 100분위 |

```text
평균     = (X1 + X2 + ... + Xn) / n
분산     = ((X1 - 평균)² + (X2 - 평균)² + ... + (Xn - 평균)²) / n
표준편차 = √분산
```

```python
np.random.seed(0)
tmp = np.random.randint(10, 100, size=100)  # 10 ~ 100(불포함) 사이 임의 정수 100개
s10 = pd.Series(tmp, dtype="float32")

s11 = s10.copy()
s11[[0, 1, 2, 3, 4]] = np.nan  # 0~4번에 결측치 넣기

print(s10.count(), s11.count())  # 결측치를 제외한 값의 개수
print(s10.size, s11.size)        # 원소 개수 (결측치도 원소라 포함)
```

```text
100 95
100 100
```

```python
print("최대값:", s10.max(), " index:", s10.idxmax())
print("최소값:", s10.min(), " index:", s10.idxmin())
print("평균:", s10.mean())
print("표준편차:", s10.std())
print("분산:", s10.var())
print("합계:", s10.sum())
```

```text
최대값: 98.0  index: 11
최소값: 10.0  index: 53
평균: 56.29
표준편차: 26.66943
분산: 711.2585
합계: 5629.0
```

`idxmax()`, `idxmin()`은 최대·최소값이 **어디에** 있는지(index 이름)를 돌려준다.

### 평균은 이상치에 약하다

```python
s12 = s10.copy()
s12[[0, 1]] = 1000  # 극단적으로 큰 값 2개
print("s10 중위수:", s10.median(), " 평균:", s10.mean())
print("s12 중위수:", s12.median(), " 평균:", s12.mean())
```

```text
s10 중위수: 56.5  평균: 56.29
s12 중위수: 57.0  평균: 75.18
```

값 100개 중 2개만 1000으로 바꿨는데 평균은 약 19 올랐고 중앙값은 0.5만 움직였다. 이상치가 있을 수 있는 데이터에서 중앙값을 대표값으로 쓰는 이유다.

> **보충: 표준편차 공식과 pandas 결과.** 필기 공식은 n으로 나누는 모집단 분산이다. pandas의 `std()`, `var()`는 기본이 표본 분산(n-1로 나눔, `ddof=1`)이라 공식으로 직접 계산한 값과 조금 다르다. 모집단 기준이 필요하면 `s10.var(ddof=0)`을 쓴다. 지난 SQL 글의 MySQL `variance()`는 n으로 나눈 값이었다.

### 결측치가 있을 때의 집계

```python
print(s11.sum())               # 기본: 결측치를 빼고 계산
print(s11.sum(skipna=False))   # 결측치를 빼지 않으면 결과도 결측치
```

```text
5290.0
nan
```

### 분위수와 describe()

```python
s10.quantile(q=[0.25, 0.5, 0.75])  # 위치는 0~1 사이로 지정. 0.5 = 중앙값
```

```text
0.25    33.0
0.50    56.5
0.75    79.0
dtype: float64
```

```python
s11.describe()  # 여러 통계량을 한 번에
```

```text
count    95.000000
mean     55.684212
std      27.132952
min      10.000000
25%      32.000000
50%      56.000000
75%      79.500000
max      98.000000
dtype: float64
```

문자열 Series에 `describe()`를 쓰면 다른 통계량이 나온다.

```python
langs.describe()
```

```text
count          6
unique         3
top       python
freq           3
dtype: object
```

| 항목 | 의미 |
|---|---|
| `unique` | 고유값 개수 |
| `top` | 최빈값 |
| `freq` | 최빈값의 빈도 |

## 결측치 (Missing Value)

모르는 값, 수집이 안 된 값, 현재 가지고 있지 않은 값이다. Pandas에서는 `pd.NA`, `None`, `np.nan`으로 표현한다.

```python
a = pd.Series([1, 2, 3, pd.NA])
a.dtype
```

```text
dtype('O')
```

```python
a = pd.Series([1, 2, 3, np.nan])
a.dtype
```

```text
dtype('float64')
```

필기에는 "결측치는 float 타입으로 처리된다"고 적었다. `np.nan`을 넣으면 정수가 모두 실수로 바뀐 `float64`가 된다. 반면 `pd.NA`를 넣으면 `object` 타입이 됐다. 노트북 주석에 `Int64`(대문자 I, 결측치를 허용하는 정수 타입)가 될 거라고 메모했지만, 실제로는 `pd.Series([1, 2, 3, pd.NA], dtype="Int64")`처럼 직접 지정해야 그렇게 된다. (`보충`)

### 결측치 확인

| 메소드 | 결과 |
|---|---|
| `isna()`, `isnull()` | 원소별로 결측치면 True |
| `notna()`, `notnull()` | 원소별로 결측치가 아니면 True |

```python
a.isna()
```

```text
0    False
1    False
2    False
3     True
dtype: bool
```

bool 값은 산술 연산에서 True=1, False=0으로 바뀐다. 그래서 `isna().sum()`이 결측치 개수다.

```python
print(a.isna().sum(), s11.isna().sum())
```

```text
1 5
```

### 결측치 처리

| 방법 | 메소드 |
|---|---|
| 제거 | `dropna()` |
| 다른 값으로 대체 | `fillna(값)` |

대체할 때는 가장 가능성이 높은 값을 쓴다. 수치형은 평균이나 중앙값, 범주형은 최빈값이다. 결측치가 "없음"처럼 의미를 가진 경우는 그 의미에 맞는 값(예: 0)으로 바꾼다. 필기 메모처럼 머신러닝 모델은 값이 비어 있으면 학습이 돌아가지 않아서 반드시 처리해야 한다.

```python
a.dropna()  # 결측치 제거한 새 Series. index 이름은 그대로
```

```text
0    1.0
1    2.0
2    3.0
dtype: float64
```

```python
a.fillna(100)
```

```text
0      1.0
1      2.0
2      3.0
3    100.0
dtype: float64
```

```python
result = s11.fillna(s11.mean())  # 평균으로 대체
result.head(7)
```

```text
0    55.684212
1    55.684212
2    55.684212
3    55.684212
4    55.684212
5    19.000000
6    93.000000
dtype: float32
```

범주형은 최빈값으로 채운다. `mode()`는 최빈값이 여러 개일 수 있어서 Series를 반환하므로 `iloc[0]`으로 하나를 꺼낸다.

```python
langs2 = pd.Series(["python", "python", "python", "c++", np.nan, "java", "c++", np.nan])
langs2.fillna(langs2.mode().iloc[0])
```

```text
0    python
1    python
2    python
3       c++
4    python
5      java
6       c++
7    python
dtype: str
```

### inplace 매개변수

필기 주석의 정리다.

- Series·DataFrame의 원소를 바꾸는 메소드들은 기본적으로 **원본을 바꾸지 않고** 바뀐 새 객체를 반환한다.
- 이 메소드들은 모두 `inplace=False` 매개변수를 가진다. `True`로 주면 원본 자체를 바꾸고 `None`을 반환한다.

```python
a.fillna(200, inplace=True)
a
```

```text
0      1.0
1      2.0
2      3.0
3    200.0
dtype: float64
```

## 정리

| 하고 싶은 일 | 방법 |
|---|---|
| 만들기 | `pd.Series(값들, index=이름들)` |
| 이름으로 조회 | `s.loc[이름]`, `s.loc[[이름들]]`, `s.loc[시작:끝]` (끝 포함) |
| 순번으로 조회 | `s.iloc[순번]`, `s.iloc[[순번들]]`, `s.iloc[시작:끝]` (끝 미포함) |
| 조건으로 조회 | `s[(조건1) & (조건2)]`, `s[s.between(a, b)]` |
| 개수·비율 | `value_counts(normalize=)`, `nunique()` |
| 통계량 | `mean`, `median`, `std`, `quantile`, `describe` |
| 결측치 | `isna().sum()`, `dropna()`, `fillna()` |

- `loc` slicing은 끝을 포함하고, `iloc` slicing은 포함하지 않는다.
- Series끼리의 연산은 순번이 아니라 **index 이름**이 같은 원소끼리 계산한다.
- 조건을 묶을 때는 `&`, `|`, `~`와 괄호를 쓴다.
- 타입을 줄일 때는 값의 범위를 확인한다. 넘으면 조용히 틀린 값이 된다.
- pandas 3.0부터 slicing 결과를 바꿔도 원본은 바뀌지 않는다.
