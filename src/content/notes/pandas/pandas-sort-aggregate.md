---
title: "정렬과 집계: sort·agg·groupby·pivot_table·cut·apply"
description: "DataFrame을 index와 값으로 정렬하고, 기술통계 메소드와 agg로 집계하고, groupby·pivot_table로 그룹별 집계를 내고, cut으로 수치를 범주로 나누고, apply로 값을 일괄 변환하는 방법을 항공 운항 데이터로 정리합니다."
category: 'Tech'
subcategory: 'Data Analysis'
series: 'Pandas'
seriesOrder: 5
originalNotebook: "03_Pandas_정렬_집계.ipynb"
tags: ["Python","Pandas","groupby","pivot_table"]
date: 2026-05-06
---

> SKN31 데이터 분석 실습 노트북 `03_Pandas_정렬_집계.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 **pandas 3.0.2에서 다시 실행한 결과**를 실었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- `sort_index()`, `sort_values()`로 정렬하기
- 기술통계 메소드와 `agg()`로 한 번에 여러 집계하기
- `groupby()`로 "~별 집계"하기, 집계 결과에서 조건으로 거르기
- 사용자 정의 집계 함수
- `pivot_table()`로 두 기준 이상의 집계를 표로 보기
- `cut()`으로 수치형을 범주형으로 바꾸기
- `apply()`, `map()`으로 값을 일괄 변환하기

## 정렬

### index 이름·컬럼 이름 기준: sort_index()

```python
sort_index(axis=0, ascending=True, inplace=False)
```

| 매개변수 | 값 |
|---|---|
| `axis` | `0`(기본): 행 이름 기준 / `1`: 컬럼 이름 기준 |
| `ascending` | `True`(기본): 오름차순 / `False`: 내림차순 |
| `inplace` | `False`(기본): 정렬된 복사본 반환 / `True`: 원본 변경 |

```python
import pandas as pd
import numpy as np

df = pd.read_csv("data/movie.csv", index_col="movie_title")
df.shape
```

```text
(4916, 27)
```

```python
df.sort_index(axis=1).iloc[:, :4]  # 컬럼 이름 기준 정렬 (앞의 4개 열만 표시)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 4열 (앞뒤 3행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>actor_1_facebook_likes</th><th>actor_1_name</th><th>actor_2_facebook_likes</th><th>actor_2_name</th></tr></thead><tbody><tr><th class="idx">Avatar</th><td>1000.0</td><td>CCH Pounder</td><td>936.0</td><td>Joel David Moore</td></tr><tr><th class="idx">Pirates of the Caribbean: At World&#x27;s End</th><td>40000.0</td><td>Johnny Depp</td><td>5000.0</td><td>Orlando Bloom</td></tr><tr><th class="idx">Spectre</th><td>11000.0</td><td>Christoph Waltz</td><td>393.0</td><td>Rory Kinnear</td></tr><tr><td class="ellipsis" colspan="5">⋯</td></tr><tr><th class="idx">A Plague So Pleasant</th><td>0.0</td><td>Eva Boehnke</td><td>0.0</td><td>Maxwell Moody</td></tr><tr><th class="idx">Shanghai Calling</th><td>946.0</td><td>Alan Ruck</td><td>719.0</td><td>Daniel Henney</td></tr><tr><th class="idx">My Date with Drew</th><td>86.0</td><td>John August</td><td>23.0</td><td>Brian Herzlinger</td></tr></tbody></table></div></div>

```python
df.sort_index()[["director_name"]]  # 행 이름(영화 제목) 기준 정렬
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 1열 (앞뒤 3행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>director_name</th></tr></thead><tbody><tr><th class="idx">#Horror</th><td>Tara Subkoff</td></tr><tr><th class="idx">10 Cloverfield Lane</th><td>Dan Trachtenberg</td></tr><tr><th class="idx">10 Days in a Madhouse</th><td>Timothy Hines</td></tr><tr><td class="ellipsis" colspan="2">⋯</td></tr><tr><th class="idx">xXx</th><td>Rob Cohen</td></tr><tr><th class="idx">xXx: State of the Union</th><td>Lee Tamahori</td></tr><tr><th class="idx">Æon Flux</th><td>Karyn Kusama</td></tr></tbody></table></div></div>

오름차순에서 `#`·숫자로 시작하는 제목이 먼저, 그다음 대문자, 소문자 순으로 나온다. 문자 코드 순서이기 때문이다.

메소드는 이어서 호출할 수 있다(method chain). 행 이름과 컬럼 이름을 한 번에 정렬한다.

```python
df.sort_index().sort_index(axis=1).iloc[:, :3]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 3열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>actor_1_facebook_likes</th><th>actor_1_name</th><th>actor_2_facebook_likes</th></tr></thead><tbody><tr><th class="idx">#Horror</th><td>501.0</td><td>Timothy Hutton</td><td>418.0</td></tr><tr><th class="idx">10 Cloverfield Lane</th><td>14000.0</td><td>Bradley Cooper</td><td>338.0</td></tr><tr><td class="ellipsis" colspan="4">⋯</td></tr><tr><th class="idx">xXx: State of the Union</th><td>287.0</td><td>Sunny Mabrey</td><td>233.0</td></tr><tr><th class="idx">Æon Flux</th><td>9000.0</td><td>Charlize Theron</td><td>460.0</td></tr></tbody></table></div></div>

### 정렬 후 앞글자로 범위 조회

필기에 정리한 활용법이다. **index 이름을 정렬해 두면 앞의 몇 글자만으로 slicing**할 수 있다. 단, index 이름에 결측치가 있으면 안 된다.

```python
df2 = df.sort_index()
df2.loc["A":"Jb", ["director_name"]]  # A로 시작 ~ "Jb" 앞까지
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 1855행 × 1열 (앞뒤 3행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>director_name</th></tr></thead><tbody><tr><th class="idx">A Beautiful Mind</th><td>Ron Howard</td></tr><tr><th class="idx">A Beginner&#x27;s Guide to Snuff</th><td>Mitchell Altieri</td></tr><tr><th class="idx">A Better Life</th><td>Chris Weitz</td></tr><tr><td class="ellipsis" colspan="2">⋯</td></tr><tr><th class="idx">Jaws 2</th><td>Jeannot Szwarc</td></tr><tr><th class="idx">Jaws: The Revenge</th><td>Joseph Sargent</td></tr><tr><th class="idx">Jay and Silent Bob Strike Back</th><td>Kevin Smith</td></tr></tbody></table></div></div>

`"Jb"`라는 제목은 없지만, 정렬된 상태에서는 "Jb"가 들어갈 위치까지를 잘라 준다. 그래서 `Ja`로 시작하는 `Jay and Silent Bob Strike Back`까지 나오고, `Je…`로 시작하는 제목부터는 빠진다. 정렬하지 않은 상태에서 이렇게 조회하면 에러가 난다.

### 값 기준: sort_values()

```python
sort_values(by, ascending=True, inplace=False)
```

- `by`: 정렬 기준 컬럼. 여러 개면 리스트
- `ascending`: 여러 컬럼이면 정렬 방식도 리스트로
- 결측치는 정렬 방식과 상관없이 마지막에 나온다.

```python
df.sort_values(by="duration")[["duration"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 1열 (앞뒤 3행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>duration</th></tr></thead><tbody><tr><th class="idx">Shaun the Sheep</th><td>7.0</td></tr><tr><th class="idx">The Touch</th><td>7.0</td></tr><tr><th class="idx">Robot Chicken</th><td>11.0</td></tr><tr><td class="ellipsis" colspan="2">⋯</td></tr><tr><th class="idx">Destiny</th><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">Romantic Schemer</th><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">The Naked Ape</th><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

```python
df.sort_values("director_name", ascending=False)[["director_name"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 1열 (앞뒤 3행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>director_name</th></tr></thead><tbody><tr><th class="idx">Bizarre</th><td>Étienne Faure</td></tr><tr><th class="idx">Sur le seuil</th><td>Éric Tessier</td></tr><tr><th class="idx">Mambo Italiano</th><td>Émile Gaudreault</td></tr><tr><td class="ellipsis" colspan="2">⋯</td></tr><tr><th class="idx">Revolution</th><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">Happy Valley</th><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">The Following</th><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

내림차순 맨 위가 `Étienne Faure`, `Éric Tessier`다. 악센트가 붙은 `É`가 영문 알파벳보다 문자 코드가 커서 Z보다 뒤로 간 것이다.

```python
# 상영시간 오름차순, 같으면 페이스북 좋아요 내림차순
df.sort_values(by=["duration", "movie_facebook_likes"],
               ascending=[True, False])[["duration", "movie_facebook_likes"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 2열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>duration</th><th>movie_facebook_likes</th></tr></thead><tbody><tr><th class="idx">Shaun the Sheep</th><td>7.0</td><td>834</td></tr><tr><th class="idx">The Touch</th><td>7.0</td><td>30</td></tr><tr><th class="idx">Robot Chicken</th><td>11.0</td><td>1000</td></tr><tr><th class="idx">Vessel</th><td>14.0</td><td>14</td></tr><tr><th class="idx">Wal-Mart: The High Cost of Low Price</th><td>20.0</td><td>0</td></tr><tr><td class="ellipsis" colspan="3">⋯</td></tr><tr><th class="idx">Dil Jo Bhi Kahey...</th><td><span class="sql-null">NaN</span></td><td>9</td></tr><tr><th class="idx">Barfi</th><td><span class="sql-null">NaN</span></td><td>2</td></tr><tr><th class="idx">The Naked Ape</th><td><span class="sql-null">NaN</span></td><td>2</td></tr><tr><th class="idx">Star Wars: Episode VII - The Force Awakens</th><td><span class="sql-null">NaN</span></td><td>0</td></tr><tr><th class="idx">Romantic Schemer</th><td><span class="sql-null">NaN</span></td><td>0</td></tr></tbody></table></div></div>

상영시간이 7분으로 같은 두 영화는 좋아요가 많은 `Shaun the Sheep`(834)이 먼저 나왔다.

**상영시간이 250분을 넘는 영화를 긴 순서로**

```python
df.query("duration > 250").sort_values("duration", ascending=False)[["duration", "director_name"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 13행 × 2열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>duration</th><th>director_name</th></tr></thead><tbody><tr><th class="idx">Trapped</th><td>511.0</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">Carlos</th><td>334.0</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">Blood In, Blood Out</th><td>330.0</td><td>Taylor Hackford</td></tr><tr><th class="idx">Heaven&#x27;s Gate</th><td>325.0</td><td>Michael Cimino</td></tr><tr><th class="idx">The Legend of Suriyothai</th><td>300.0</td><td>Chatrichalerm Yukol</td></tr><tr><td class="ellipsis" colspan="3">⋯</td></tr><tr><th class="idx">Gods and Generals</th><td>280.0</td><td>Ron Maxwell</td></tr><tr><th class="idx">Gettysburg</th><td>271.0</td><td>Ron Maxwell</td></tr><tr><th class="idx">Arn: The Knight Templar</th><td>270.0</td><td>Peter Flinth</td></tr><tr><th class="idx">Cleopatra</th><td>251.0</td><td>Joseph L. Mankiewicz</td></tr><tr><th class="idx">Once Upon a Time in America</th><td>251.0</td><td>Sergio Leone</td></tr></tbody></table></div></div>

조회(`query`) → 정렬(`sort_values`) → 열 선택을 이어서 썼다.

## flights.csv: 항공기 운항 기록

| 컬럼 | 의미 |
|---|---|
| `MONTH`, `DAY`, `WEEKDAY` | 비행 월, 일, 요일(1 월요일 ~ 7 일요일) |
| `AIRLINE` | 항공사 코드 |
| `ORG_AIR`, `DEST_AIR` | 출발 공항, 도착 공항 |
| `SCHED_DEP`, `SCHED_ARR` | 출발·도착 예정 시각 |
| `DEP_DELAY`, `ARR_DELAY` | 출발·도착 지연 시간(분) |
| `AIR_TIME`, `DIST` | 비행 시간(분), 비행 거리(마일) |
| `DIVERTED`, `CANCELLED` | 회항 여부, 취소 여부 (1: True, 0: False) |

```python
df = pd.read_csv("data/flights.csv")
df.shape
```

```text
(58492, 14)
```

```python
df.isnull().sum()[lambda s: s > 0]  # 결측치가 있는 컬럼만
```

```text
DEP_DELAY     833
AIR_TIME     1018
ARR_DELAY    1018
dtype: int64
```

필기에서는 `df.isnull().sum()` 전체를 봤는데, 컬럼이 14개라 결측치가 있는 것만 남겼다. `[ ]` 안에 `lambda`를 넣으면 "자기 자신에 대한 조건"으로 거를 수 있다. (`보충`)

범주형 컬럼은 `value_counts()`로 어떤 값이 몇 개씩 있는지 먼저 본다.

```python
df["MONTH"].value_counts().sort_index()
```

```text
MONTH
1     5003
2     4608
3     5485
4     5326
5     5545
6     5672
7     5754
8     5635
9     5235
11    5098
12    5131
Name: count, dtype: int64
```

10월이 없다. 데이터에서 빠진 달이라는 것을 여기서 알 수 있다.

```python
df["AIRLINE"].value_counts().sort_index().head()
```

```text
AIRLINE
AA     8900
AS      768
B6      543
DL    10601
EV     5858
Name: count, dtype: int64
```

```python
df["ORG_AIR"].value_counts().sort_index()
```

```text
ORG_AIR
ATL    10413
DEN     5857
DFW     7121
IAH     4384
LAS     4019
LAX     5889
MSP     3410
ORD     8394
PHX     4603
SFO     4402
Name: count, dtype: int64
```

출발 공항은 10개뿐이고, 도착 공항은 271개다. 큰 공항 10곳에서 출발한 항공편을 모은 데이터라는 뜻이다.

## 기술통계 메소드로 집계

| 메소드 | 설명 |
|---|---|
| `sum()`, `mean()`, `median()` | 합계, 평균, 중위수 |
| `mode()`, `quantile()` | 최빈값, 분위수 |
| `std()`, `var()` | 표준편차, 분산 |
| `count()` | 결측치를 제외한 개수 |
| `min()`, `max()`, `idxmin()`, `idxmax()` | 최솟값, 최댓값, 그 위치 |
| `unique()`, `nunique()` | 고유값, 고유값 개수 |

`value_counts()`는 Series에만 있다.

- DataFrame에 쓰면 **컬럼별로** 계산한다.
- `sum`, `mode`, `max`, `min`, `idxmax`, `idxmin`, `unique`, `nunique`, `count`는 문자열에도 쓸 수 있다.

| 공통 매개변수 | 설명 |
|---|---|
| `skipna=True` | 결측치를 빼고 계산 (False면 결측치가 있을 때 결과도 결측치) |
| `axis` | `0`: 컬럼별(기본) / `1`: 행별 |
| `numeric_only` | `True`면 숫자형 컬럼만 계산 |

```python
df.select_dtypes(include="str").mode()  # 문자열 컬럼들의 최빈값
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 1행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>AIRLINE</th><th>ORG_AIR</th><th>DEST_AIR</th></tr></thead><tbody><tr><th class="idx">0</th><td>DL</td><td>ATL</td><td>LAX</td></tr></tbody></table></div></div>

가장 많은 항공사는 DL, 가장 많은 출발 공항은 ATL, 가장 많은 도착 공항은 LAX다.

## agg(): 여러 집계를 한 번에

```python
agg(func, axis=0, *args, **kwargs)  # aggregate()와 같다
```

| `func` 형태 | 의미 |
|---|---|
| `"sum"` 또는 `["min", "max"]` | 모든 컬럼에 같은 집계. Pandas 제공 함수는 문자열로 |
| `{"컬럼": "집계", ...}` | 컬럼마다 다른 집계 |
| 함수 객체 | 사용자 정의 집계 함수 |

```python
df[["DEP_DELAY", "ARR_DELAY"]].agg(["min", "max", "mean", "sum"])
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>DEP_DELAY</th><th>ARR_DELAY</th></tr></thead><tbody><tr><th class="idx">min</th><td>-24.0</td><td>-60.0</td></tr><tr><th class="idx">max</th><td>1194.0</td><td>1185.0</td></tr><tr><th class="idx">mean</th><td>10.921192</td><td>5.812315</td></tr><tr><th class="idx">sum</th><td>629705.0</td><td>334057.0</td></tr></tbody></table></div></div>

```python
d = {
    "DEP_DELAY": "sum",
    "ARR_DELAY": ["min", "max"],
    "DIST": ["mean", "min", "max", "sum"],
}
df.agg(d)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>DEP_DELAY</th><th>ARR_DELAY</th><th>DIST</th></tr></thead><tbody><tr><th class="idx">sum</th><td>629705.0</td><td><span class="sql-null">NaN</span></td><td>51057671.0</td></tr><tr><th class="idx">min</th><td><span class="sql-null">NaN</span></td><td>-60.0</td><td>67.0</td></tr><tr><th class="idx">max</th><td><span class="sql-null">NaN</span></td><td>1185.0</td><td>4502.0</td></tr><tr><th class="idx">mean</th><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>872.900072</td></tr></tbody></table></div></div>

딕셔너리로 컬럼마다 다른 집계를 하면, 해당 집계를 하지 않은 칸은 `NaN`으로 채워진다.

## groupby(): ~별 집계

특정 열의 **값이 같은 행끼리 묶어서** 그룹별로 집계한다. 성별, 직급별, 등급별처럼 "~별 집계"에 쓴다. 기준 열은 범주형이다. SQL의 `GROUP BY`와 같다.

```python
df.groupby("기준컬럼")["집계할컬럼"].집계함수()
```

- `groupby()`는 어떤 행끼리 묶였는지 정보를 가진 `DataFrameGroupBy` 객체를 반환한다.
- 기준이 여러 개면 리스트로 준다. 집계할 컬럼이 여러 개여도 리스트로 준다.
- 여러 집계를 같이 볼 때, 사용자 정의 함수를 쓸 때, 컬럼마다 다른 집계를 할 때는 `agg()`를 붙인다.

```python
df_gb = df.groupby("AIRLINE")  # AIRLINE 값이 같은 행끼리 묶는다
type(df_gb)
```

```text
<class 'pandas.api.typing.DataFrameGroupBy'>
```

```python
df.groupby("AIRLINE")["DEP_DELAY"].mean().sort_values(ascending=False).head()
# SELECT airline, avg(dep_delay) FROM df GROUP BY airline ORDER BY 2 DESC
```

```text
AIRLINE
NK    19.514401
UA    16.210485
F9    14.310398
B6    14.287823
WN    12.639366
Name: DEP_DELAY, dtype: float64
```

출발 지연 평균이 가장 긴 항공사는 NK(약 19.5분)다. 필기에는 같은 내용을 SQL로 주석에 적어 두었다.

```python
df.groupby("AIRLINE")[["DEP_DELAY", "ARR_DELAY"]].max().head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>AIRLINE</th><th>DEP_DELAY</th><th>ARR_DELAY</th></tr></thead><tbody><tr><th class="idx">AA</th><td>835.0</td><td>858.0</td></tr><tr><th class="idx">AS</th><td>338.0</td><td>344.0</td></tr><tr><th class="idx">B6</th><td>348.0</td><td>331.0</td></tr><tr><th class="idx">DL</th><td>755.0</td><td>741.0</td></tr><tr><th class="idx">EV</th><td>672.0</td><td>669.0</td></tr></tbody></table></div></div>

### 여러 열을 기준으로

```python
df.groupby(["MONTH", "WEEKDAY"])["DEP_DELAY"].mean()
```

```text
MONTH  WEEKDAY
1      1          15.068079
       2           6.828526
       3           6.915254
       4          10.086575
       5          10.483832
                    ...    
12     3          15.086560
       4          10.527160
       5           8.347496
       6          10.973064
       7          13.697306
Name: DEP_DELAY, Length: 77, dtype: float64
```

기준이 두 개면 결과의 index가 **두 단계(MultiIndex)** 가 된다. 1월-1(월요일), 1월-2(화요일)… 순서로 77개(11개월 × 7요일) 조합이 나왔다.

### 집계 결과에서 조건으로 거르기

SQL의 `HAVING`에 해당한다. 집계한 뒤 boolean indexing을 한다.

```python
# 취소 건수가 100건 이상인 항공사
result = df.groupby("AIRLINE")["CANCELLED"].sum()
result[result > 100]
```

```text
AIRLINE
AA    154
EV    146
MQ    152
OO    142
Name: CANCELLED, dtype: int64
```

`CANCELLED`가 1(취소)과 0이라서 합계가 곧 취소 건수다.

## 사용자 정의 집계 함수

- 첫 번째 매개변수로 **Series(컬럼 또는 행)** 를 받는다. 다른 값이 필요하면 매개변수를 더 둔다.
- 집계 결과 값 **하나**를 반환한다.

```python
def min_max_diff(column: pd.Series) -> int | float:
    """컬럼 값을 받아서 최댓값과 최솟값의 차이를 계산해서 반환"""
    return column.max() - column.min()

min_max_diff(df["AIR_TIME"])
```

```text
np.float64(569.0)
```

```python
df["AIR_TIME"].agg(["min", "max", min_max_diff])  # 직접 만든 함수는 따옴표 없이
```

```text
min               8.0
max             577.0
min_max_diff    569.0
Name: AIR_TIME, dtype: float64
```

```python
df.groupby("MONTH")["AIR_TIME"].agg(["min", "max", min_max_diff]).head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th>MONTH</th><th>min</th><th>max</th><th>min_max_diff</th></tr></thead><tbody><tr><th class="idx">1</th><td>14.0</td><td>566.0</td><td>552.0</td></tr><tr><th class="idx">2</th><td>14.0</td><td>501.0</td><td>487.0</td></tr><tr><th class="idx">3</th><td>14.0</td><td>554.0</td><td>540.0</td></tr><tr><th class="idx">4</th><td>15.0</td><td>560.0</td><td>545.0</td></tr><tr><th class="idx">5</th><td>14.0</td><td>507.0</td><td>493.0</td></tr></tbody></table></div></div>

Pandas가 제공하는 집계는 문자열로, 직접 만든 함수는 **함수 객체 그대로** 넣는다. 결과 컬럼 이름에는 함수 이름이 쓰인다. 노트북에서는 함수를 정의하기 전에 이 셀을 먼저 실행해서 `NameError: name 'min_max_diff' is not defined`가 났었다.

## pivot_table()

엑셀의 피벗 테이블 기능이다. 그룹으로 묶을 컬럼들을 **행과 열에 배치**하고 집계 값을 칸에 채운다. `groupby()`와 하는 일은 같지만, 기준 컬럼이 두 개 이상일 때 결과를 **읽기가 훨씬 편하다.**

> `pivot()`은 다른 함수다. `pivot()`은 집계 없이 index와 column의 형태만 바꾸는 reshape 함수다.

| 매개변수 | 의미 |
|---|---|
| `index` | 결과의 **행**에 올 기준 컬럼 |
| `columns` | 결과의 **열**에 올 기준 컬럼 |
| `values` | 집계할 컬럼 |
| `aggfunc` | 집계 함수 (기본: `"mean"`) |
| `fill_value` | 집계 결과가 NaN일 때 채울 값 |
| `margins`, `margins_name` | 전체 합계 행·열 추가 여부와 그 이름 (기본 `All`) |

### 두 컬럼으로 그룹 집계

**항공사·출발 공항별 취소 총수**를 groupby와 pivot_table로 각각 구했다.

```python
df.groupby(["AIRLINE", "ORG_AIR"])["CANCELLED"].sum()
```

```text
AIRLINE  ORG_AIR
AA       ATL         3
         DEN         4
         DFW        86
         IAH         3
         LAS         3
                    ..
WN       LAS         7
         LAX        32
         MSP         1
         PHX         6
         SFO        25
Name: CANCELLED, Length: 114, dtype: int64
```

```python
df.pivot_table(
    index="AIRLINE",      # 행에 올 기준 컬럼
    columns="ORG_AIR",    # 열에 올 기준 컬럼
    values="CANCELLED",
    aggfunc="sum",
    margins=True,         # 전체 합계 추가
    margins_name="Total", # 합계 행·열 이름 (기본 All)
    fill_value=0,         # 집계할 데이터가 없는 칸
)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 15행 × 11열 (앞뒤 7행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>AIRLINE</th><th>ATL</th><th>DEN</th><th>DFW</th><th>IAH</th><th>LAS</th><th>LAX</th><th>MSP</th><th>ORD</th><th>PHX</th><th>SFO</th><th>Total</th></tr></thead><tbody><tr><th class="idx">AA</th><td>3</td><td>4</td><td>86</td><td>3</td><td>3</td><td>11</td><td>3</td><td>35</td><td>4</td><td>2</td><td>154</td></tr><tr><th class="idx">AS</th><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><th class="idx">B6</th><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>1</td></tr><tr><th class="idx">DL</th><td>28</td><td>1</td><td>0</td><td>0</td><td>1</td><td>1</td><td>4</td><td>0</td><td>1</td><td>2</td><td>38</td></tr><tr><th class="idx">EV</th><td>18</td><td>6</td><td>27</td><td>36</td><td>0</td><td>0</td><td>6</td><td>53</td><td>0</td><td>0</td><td>146</td></tr><tr><th class="idx">F9</th><td>0</td><td>2</td><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td><td>4</td><td>0</td><td>0</td><td>10</td></tr><tr><th class="idx">HA</th><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td class="ellipsis" colspan="12">⋯</td></tr><tr><th class="idx">NK</th><td>1</td><td>1</td><td>6</td><td>0</td><td>1</td><td>1</td><td>3</td><td>10</td><td>2</td><td>0</td><td>25</td></tr><tr><th class="idx">OO</th><td>3</td><td>25</td><td>2</td><td>10</td><td>0</td><td>15</td><td>4</td><td>41</td><td>9</td><td>33</td><td>142</td></tr><tr><th class="idx">UA</th><td>2</td><td>9</td><td>1</td><td>23</td><td>3</td><td>6</td><td>2</td><td>25</td><td>3</td><td>19</td><td>93</td></tr><tr><th class="idx">US</th><td>0</td><td>0</td><td>2</td><td>2</td><td>1</td><td>0</td><td>0</td><td>6</td><td>7</td><td>3</td><td>21</td></tr><tr><th class="idx">VX</th><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>3</td><td>0</td><td>0</td><td>0</td><td>3</td><td>6</td></tr><tr><th class="idx">WN</th><td>9</td><td>13</td><td>0</td><td>0</td><td>7</td><td>32</td><td>1</td><td>0</td><td>6</td><td>25</td><td>93</td></tr><tr><th class="idx">Total</th><td>69</td><td>61</td><td>187</td><td>74</td><td>17</td><td>70</td><td>24</td><td>259</td><td>32</td><td>88</td><td>881</td></tr></tbody></table></div></div>

같은 114개 숫자가 groupby에서는 긴 세로 목록이었다면, pivot_table에서는 항공사 × 공항 표가 됐다. 행과 열 끝에 `Total`이 붙었다.

필기에서는 `fill_value="Error"`로 문자열을 넣었다. 노트북에도 `Pandas4Warning: Using a fill_value that cannot be held in the existing dtype is deprecated and will raise in a future version.` 경고가 남아 있다. 숫자 컬럼에 문자열을 채우면 열 전체가 숫자로 계산할 수 없는 타입이 되기 때문이다. 취소 건수처럼 "데이터가 없으면 0"인 집계는 `fill_value=0`이 맞다.

`fill_value`가 채우는 칸은 **그 조합의 운항 기록이 아예 없는** 경우다. 예를 들어 HA(하와이안항공)는 ATL에서 출발한 기록이 없다. 취소가 0건인 것과는 다르다. 둘을 구분해야 한다면 `fill_value`를 주지 않고 `NaN`으로 남겨 두는 것이 정확하다. (`보충`)

### 세 컬럼 이상

**항공사·월·출발 공항별 취소 총수**

```python
df.pivot_table(
    index="MONTH",
    columns=["AIRLINE", "ORG_AIR"],
    values="CANCELLED",
    aggfunc="sum",
).T  # 열이 너무 많아서 행과 열을 바꿔서 보기
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 114행 × 11열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>AIRLINE / ORG_AIR</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>11</th><th>12</th></tr></thead><tbody><tr><th class="idx">AA / ATL</th><td>0.0</td><td>2.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">AA / DEN</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>2.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td></tr><tr><th class="idx">AA / DFW</th><td>8.0</td><td>33.0</td><td>13.0</td><td>4.0</td><td>8.0</td><td>7.0</td><td>1.0</td><td>2.0</td><td>1.0</td><td>3.0</td><td>6.0</td></tr><tr><th class="idx">AA / IAH</th><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">AA / LAS</th><td>0.0</td><td>2.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><td class="ellipsis" colspan="12">⋯</td></tr><tr><th class="idx">WN / LAS</th><td>1.0</td><td>1.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>1.0</td><td>0.0</td><td>1.0</td><td>1.0</td></tr><tr><th class="idx">WN / LAX</th><td>3.0</td><td>2.0</td><td>3.0</td><td>2.0</td><td>1.0</td><td>0.0</td><td>9.0</td><td>4.0</td><td>3.0</td><td>3.0</td><td>2.0</td></tr><tr><th class="idx">WN / MSP</th><td>1.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">WN / PHX</th><td>0.0</td><td>2.0</td><td>1.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>0.0</td></tr><tr><th class="idx">WN / SFO</th><td>4.0</td><td>5.0</td><td>0.0</td><td>2.0</td><td>2.0</td><td>6.0</td><td>0.0</td><td>2.0</td><td>2.0</td><td>2.0</td><td>0.0</td></tr></tbody></table></div></div>

열에 두 컬럼을 넣으면 열 이름이 두 단계가 된다. 조합이 많아 옆으로 너무 길어지면 `.T`로 뒤집어 본다.

## cut(): 수치형을 범주형으로

연속된 숫자를 구간으로 나눠 범주로 바꾼다. 나이 → 나이대, 점수 → 등급 같은 변환이다.

```python
pd.cut(x, bins, right=True, labels=None)
```

| 매개변수 | 의미 |
|---|---|
| `x` | 바꿀 1차원 데이터 (Series, 리스트 등) |
| `bins` | 정수면 **그 개수로 등분**, 리스트면 **구간 경계값** |
| `right` | `True`(기본)면 구간의 오른쪽 끝을 포함, `False`면 왼쪽 끝을 포함 |
| `labels` | 각 구간의 이름. 생략하면 `(10, 20]` 같은 범위가 이름이 된다 |

구간 표기법: `(`·`)`는 포함하지 않음, `[`·`]`는 포함. `(100, 200]`은 100 초과 200 이하다.

```python
np.random.seed(0)  # 항상 같은 난수가 나오게 고정
d = {
    "age": np.random.randint(1, 100, size=30),               # 1~99 정수 30개
    "tall": np.round(np.random.normal(170, 10, size=30), 2), # 평균 170, 표준편차 10 정규분포
}
df = pd.DataFrame(d)
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 30행 × 2열 (앞뒤 3행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>age</th><th>tall</th></tr></thead><tbody><tr><th class="idx">0</th><td>45</td><td>168.18</td></tr><tr><th class="idx">1</th><td>48</td><td>184.1</td></tr><tr><th class="idx">2</th><td>65</td><td>166.26</td></tr><tr><td class="ellipsis" colspan="3">⋯</td></tr><tr><th class="idx">27</th><td>81</td><td>162.24</td></tr><tr><th class="idx">28</th><td>70</td><td>179.96</td></tr><tr><th class="idx">29</th><td>80</td><td>150.67</td></tr></tbody></table></div></div>

> **정규분포 난수**: `np.random.normal(평균, 표준편차, size=개수)`. 정규분포는 평균을 중심으로 좌우 대칭인 종 모양 분포다. 평균 ± 표준편차 안에 약 68%, ± 2표준편차 안에 약 95%, ± 3표준편차 안에 약 99.7%가 들어간다. 위 키 데이터라면 160~180cm에 약 68%, 150~190cm에 약 95%다. (필기에는 70%, 95%, 99%로 어림해 적었다.)

### 개수로 등분

```python
나이대 = pd.cut(
    df["age"],
    bins=3,       # 범위를 3등분
    right=False,  # 구간의 왼쪽 끝 포함
    labels=["청년층", "장년층", "노년층"],
)
나이대.value_counts()
```

```text
age
노년층    17
장년층     7
청년층     6
Name: count, dtype: int64
```

`bins=3`은 **값의 범위**(최솟값~최댓값)를 똑같은 폭으로 3등분한다. 각 구간의 **개수**가 같아지는 것이 아니다. 그래서 노년층이 17명으로 몰렸다. 개수를 같게 나누려면 `pd.qcut()`(분위수 기준)을 쓴다. (`보충`)

### 원하는 경계로 나누기

```python
l = [1, 5, 20, 40, 50, 100]  # 최솟값, 나누는 지점들, 최댓값
result = pd.cut(df["age"], bins=l, labels=["유아", "청소년", "청년", "장년", "노년"])
df.insert(1, "나이대", result)
df["키크기"] = pd.cut(df["tall"], bins=3, labels=["소", "중", "대"])
df.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>age</th><th>나이대</th><th>tall</th><th>키크기</th></tr></thead><tbody><tr><th class="idx">0</th><td>45</td><td>장년</td><td>168.18</td><td>중</td></tr><tr><th class="idx">1</th><td>48</td><td>장년</td><td>184.1</td><td>대</td></tr><tr><th class="idx">2</th><td>65</td><td>노년</td><td>166.26</td><td>중</td></tr><tr><th class="idx">3</th><td>68</td><td>노년</td><td>172.75</td><td>중</td></tr><tr><th class="idx">4</th><td>68</td><td>노년</td><td>160.39</td><td>소</td></tr></tbody></table></div></div>

경계가 `[1, 5, 20, 40, 50, 100]`이면 구간은 `(1, 5]`, `(5, 20]`, … `(50, 100]`이다. `right=True`(기본)라서 **첫 경계인 1은 어느 구간에도 들어가지 않는다.** 이번 데이터에는 나이 1이 없어서 문제가 없었지만, 있었다면 `NaN`이 됐을 것이다. 확인해 봤다. (`보충`)

```python
pd.cut([1, 5, 6], bins=[1, 5, 20], labels=["유아", "청소년"])
```

```text
[NaN, '유아', '청소년']
Categories (2, str): ['유아' < '청소년']
```

첫 경계값을 포함하려면 `include_lowest=True`를 주거나, 경계를 `0`부터 시작하면 된다.

범주로 만든 열은 groupby 기준으로 쓸 수 있다.

```python
df.groupby("나이대")["tall"].mean().round(2)
```

```text
나이대
청소년    173.55
청년     168.17
장년     170.50
노년     171.34
Name: tall, dtype: float64
```

## apply(): 값 일괄 처리

반복문 없이 행·열·원소마다 같은 함수를 적용한다.

| 대상 | 함수에 전달되는 것 |
|---|---|
| `Series.apply(함수)` | 원소 하나씩 |
| `DataFrame.apply(함수, axis=0)` | 열(Series) 하나씩 |
| `DataFrame.apply(함수, axis=1)` | 행(Series) 하나씩 |

함수에 추가 인자가 필요하면 `args=(값, ...)` 튜플이나 키워드 인자로 넘긴다.

**요일 숫자(1~7)를 요일 이름으로 바꾸기**

```python
df = pd.read_csv("data/flights.csv")

def convert_weekday(value):
    if pd.isna(value):
        return np.nan
    return "월화수목금토일"[int(value) - 1] + "요일"

df["WEEKDAY"].apply(convert_weekday)[150:155]
```

```text
150    금요일
151    금요일
152    금요일
153    금요일
154    금요일
Name: WEEKDAY, dtype: str
```

필기 주석의 설명이다. 컬럼에 결측치가 하나라도 있으면 그 컬럼은 float 타입이 되고, 문자열 indexing에는 정수만 쓸 수 있어서 `int()`로 바꿔야 한다. 결측치 자체는 먼저 걸러서 그대로 `NaN`으로 돌려준다. `pd.isna(값)`은 값 하나가 결측치인지 확인하는 **함수**다. Series의 `isna()` **메소드**와 구분한다.

간단한 변환은 `lambda`로 한 줄에 쓸 수 있다.

```python
df.insert(3, "WEEKDAY_STR", df["WEEKDAY"].apply(lambda x: "월화수목금토일"[x - 1] + "요일"))
df[["WEEKDAY", "WEEKDAY_STR"]].head(3)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>WEEKDAY</th><th>WEEKDAY_STR</th></tr></thead><tbody><tr><th class="idx">0</th><td>4</td><td>목요일</td></tr><tr><th class="idx">1</th><td>4</td><td>목요일</td></tr><tr><th class="idx">2</th><td>4</td><td>목요일</td></tr></tbody></table></div></div>

노트북에서는 이 셀을 두 번 실행해서 `ValueError: cannot insert WEEKDAY_STR, already exists`가 났다. `insert()`는 같은 이름의 열이 이미 있으면 에러가 난다. `df["열"] = 값`은 덮어쓰기라서 여러 번 실행해도 괜찮다.

### map(): 딕셔너리로 바꾸기

값 → 값의 대응표가 있으면 `map()`이 더 간단하다.

```python
weekday_map = {1: "월요일", 2: "화요일", 3: "수요일", 4: "목요일",
               5: "금요일", 6: "토요일", 7: "일요일"}
df["WEEKDAY_KOR"] = df["WEEKDAY"].map(weekday_map)
df[["WEEKDAY", "WEEKDAY_KOR"]].head(3)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>WEEKDAY</th><th>WEEKDAY_KOR</th></tr></thead><tbody><tr><th class="idx">0</th><td>4</td><td>목요일</td></tr><tr><th class="idx">1</th><td>4</td><td>목요일</td></tr><tr><th class="idx">2</th><td>4</td><td>목요일</td></tr></tbody></table></div></div>

딕셔너리에 없는 값은 `NaN`이 된다.

## 정리

| 하고 싶은 일 | 방법 |
|---|---|
| 이름으로 정렬 | `sort_index(axis=0 또는 1)` |
| 값으로 정렬 | `sort_values(by=[...], ascending=[...])` |
| 여러 집계 한 번에 | `agg(["min", "max"])`, `agg({"열": "sum"})` |
| ~별 집계 | `groupby("기준")["열"].집계()` |
| 집계 후 거르기 | `result[result > 100]` |
| 두 기준 집계를 표로 | `pivot_table(index=, columns=, values=, aggfunc=)` |
| 수치 → 범주 | `pd.cut(x, bins=, labels=)`, 개수 균등은 `pd.qcut` |
| 값 변환 | `apply(함수)`, `map(딕셔너리)` |

- 정렬된 index는 앞글자 범위로 slicing할 수 있다.
- groupby 기준이 둘 이상이면 pivot_table이 읽기 쉽다.
- `pivot_table`의 `fill_value`는 집계 대상이 없는 칸을 채운다. 숫자 열에는 숫자로 채운다.
- `cut(bins=정수)`는 범위를 등분한다. 첫 경계값은 기본으로 포함되지 않는다.
