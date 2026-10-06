---
title: "DataFrame 조회: 열 선택·loc·iloc·boolean indexing·query"
description: "DataFrame에서 열을 고르는 방법(이름, fancy indexing, select_dtypes, filter)과 행을 고르는 loc·iloc, 조건으로 행을 고르는 boolean indexing과 query()를 영화 데이터 실습과 함께 정리합니다."
category: 'Tech'
subcategory: 'Data Analysis'
series: 'Pandas'
seriesOrder: 4
originalNotebook: "02_Pandas_DataFrame.ipynb (3)"
tags: ["Python","Pandas","DataFrame","loc","query"]
date: 2026-05-04
---

> SKN31 데이터 분석 실습 노트북 `02_Pandas_DataFrame.ipynb`의 뒷부분(행·열 조회)을 바탕으로 정리했습니다.
> 코드는 **pandas 3.0.2에서 다시 실행한 결과**를 실었습니다. 노트북의 TODO 실습(영화 데이터 문제)도 필기 답안을 그대로 실행했고, 답안에서 고칠 부분이 있으면 원본과 고친 버전을 함께 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 열 조회: `df["열"]`, fancy indexing, 순번으로 열 고르기
- 타입·이름 패턴으로 열 고르기: `select_dtypes()`, `filter()`
- 행 조회: `loc`(이름), `iloc`(순번), 행과 열 동시 지정
- 조건으로 행 고르기: boolean indexing
- 문자열로 조건 쓰기: `query()`

## 조회의 기본 규칙

| 대상 | 방법 |
|---|---|
| 열 | `df["열이름"]`, `df[["열1", "열2"]]` |
| 행 | `df.loc[이름]`, `df.iloc[순번]` |
| 행 + 열 | `df.loc[행이름, 열이름]`, `df.iloc[행순번, 열순번]` |

- 열은 `[]`로 이름 indexing만 된다. **열 slicing은 안 된다.**
- 행은 indexing과 slicing이 모두 된다.

실습용 성적표를 다시 만든다.

```python
import pandas as pd
import numpy as np

grade = pd.read_csv("saved_data/grade2.csv").set_index("id")
grade.loc["id-6"] = [70, 100]
grade.insert(1, "korean2", 90)
grade["math"] = 80
grade["math2"] = [90, 80, 100, 65, 70, 100]
grade["history"] = [100, 90, 95, 80, 70, 95]
grade["총점"] = grade.sum(axis=1)
grade["평균"] = round(grade["총점"] / 6, 2)
grade
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>90</td><td>80</td><td>90</td><td>100</td><td>550</td><td>91.67</td></tr><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr><tr><th class="idx">id-4</th><td>60</td><td>90</td><td>100</td><td>80</td><td>65</td><td>80</td><td>475</td><td>79.17</td></tr><tr><th class="idx">id-5</th><td>90</td><td>90</td><td>40</td><td>80</td><td>70</td><td>70</td><td>440</td><td>73.33</td></tr><tr><th class="idx">id-6</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr></tbody></table></div></div>

## 열 조회

### 한 열: Series

```python
result = grade["평균"]  # index name: 행 이름, value: 그 열의 값
print(result.name, result.dtype)
result
```

```text
평균 float64
```

```text
id
id-1    91.67
id-2    78.33
id-3    89.17
id-4    79.17
id-5    73.33
id-6    89.17
Name: 평균, dtype: float64
```

한 열을 조회하면 **Series**가 나온다. Series의 `name`이 컬럼 이름이다. 열 이름이 Python 식별자 규칙에 맞으면 `grade.평균`처럼 `.` 표기법도 쓸 수 있다.

### 여러 열: DataFrame

```python
grade[["평균", "총점"]]  # fancy indexing: 열 이름 리스트 → DataFrame
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>평균</th><th>총점</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>91.67</td><td>550</td></tr><tr><th class="idx">id-2</th><td>78.33</td><td>470</td></tr><tr><th class="idx">id-3</th><td>89.17</td><td>535</td></tr><tr><th class="idx">id-4</th><td>79.17</td><td>475</td></tr><tr><th class="idx">id-5</th><td>73.33</td><td>440</td></tr><tr><th class="idx">id-6</th><td>89.17</td><td>535</td></tr></tbody></table></div></div>

괄호가 두 겹이다. 바깥 `[]`는 조회 연산자, 안쪽 `[]`는 열 이름 리스트다. `grade[["평균"]]`처럼 하나만 넣어도 결과는 DataFrame(열 1개짜리 표)이다.

### 열 slicing을 하면?

필기에 적은 주의 사항이다. `[]` 안에서 slicing을 하면 **열이 아니라 행이 잘린다.**

```python
grade[1:3]  # 열 slicing이 아니라 행 slicing
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr></tbody></table></div></div>

순번이나 범위로 열을 고르고 싶으면 `columns` 속성을 slicing해서 그 이름 목록으로 조회한다.

```python
grade[grade.columns[:3]]  # 앞의 3개 열
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>90</td></tr><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td></tr><tr><th class="idx">id-4</th><td>60</td><td>90</td><td>100</td></tr><tr><th class="idx">id-5</th><td>90</td><td>90</td><td>40</td></tr><tr><th class="idx">id-6</th><td>70</td><td>90</td><td>100</td></tr></tbody></table></div></div>

### 특정 셀 하나

```python
grade["korean"]["id-2"]  # 열 조회 → 그 Series에서 행 조회
```

```text
np.int64(50)
```

```python
grade[["korean", "math"]].loc["id-3"]
```

```text
korean    70
math      80
Name: id-3, dtype: int64
```

### TODO: movie 데이터로 열 조회

```python
df = pd.read_csv("data/movie.csv")

# 1. director_name 컬럼의 값들 조회
df["director_name"].head()
```

```text
0        James Cameron
1       Gore Verbinski
2           Sam Mendes
3    Christopher Nolan
4          Doug Walker
Name: director_name, dtype: str
```

```python
# 2. actor_1_name, actor_2_name, actor_3_name 컬럼의 값들
df[["actor_1_name", "actor_2_name", "actor_3_name"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 3열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>actor_1_name</th><th>actor_2_name</th><th>actor_3_name</th></tr></thead><tbody><tr><th class="idx">0</th><td>CCH Pounder</td><td>Joel David Moore</td><td>Wes Studi</td></tr><tr><th class="idx">1</th><td>Johnny Depp</td><td>Orlando Bloom</td><td>Jack Davenport</td></tr><tr><td class="ellipsis" colspan="4">⋯</td></tr><tr><th class="idx">4914</th><td>Alan Ruck</td><td>Daniel Henney</td><td>Eliza Coupe</td></tr><tr><th class="idx">4915</th><td>John August</td><td>Brian Herzlinger</td><td>Jon Gunn</td></tr></tbody></table></div></div>

```python
# 3. 1, 3, 4, 7 번 컬럼 조회
df[df.columns[[1, 3, 4, 7]]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 4열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>director_name</th><th>duration</th><th>director_facebook_likes</th><th>actor_1_facebook_likes</th></tr></thead><tbody><tr><th class="idx">0</th><td>James Cameron</td><td>178.0</td><td>0.0</td><td>1000.0</td></tr><tr><th class="idx">1</th><td>Gore Verbinski</td><td>169.0</td><td>563.0</td><td>40000.0</td></tr><tr><td class="ellipsis" colspan="5">⋯</td></tr><tr><th class="idx">4914</th><td>Daniel Hsia</td><td>100.0</td><td>0.0</td><td>946.0</td></tr><tr><th class="idx">4915</th><td>Jon Gunn</td><td>90.0</td><td>16.0</td><td>86.0</td></tr></tbody></table></div></div>

```python
# 4. 1 ~ 5 번 컬럼 조회
cols = df.columns
df[cols[1:6]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 5열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>director_name</th><th>num_critic_for_reviews</th><th>duration</th><th>director_facebook_likes</th><th>actor_3_facebook_likes</th></tr></thead><tbody><tr><th class="idx">0</th><td>James Cameron</td><td>723.0</td><td>178.0</td><td>0.0</td><td>855.0</td></tr><tr><th class="idx">1</th><td>Gore Verbinski</td><td>302.0</td><td>169.0</td><td>563.0</td><td>1000.0</td></tr><tr><td class="ellipsis" colspan="6">⋯</td></tr><tr><th class="idx">4914</th><td>Daniel Hsia</td><td>14.0</td><td>100.0</td><td>0.0</td><td>489.0</td></tr><tr><th class="idx">4915</th><td>Jon Gunn</td><td>43.0</td><td>90.0</td><td>16.0</td><td>16.0</td></tr></tbody></table></div></div>

4번 답안에서 필기는 먼저 `df[1:6]`을 써 보고 "행 조회로 바뀜"이라고 메모한 뒤 `columns`를 slicing하는 방법으로 바꿨다. 또 필기 답안은 `cols[1:7]`이었는데 1~5번 컬럼이면 `cols[1:6]`이다. slicing의 stop은 포함되지 않는다.

## 타입이나 이름 패턴으로 열 고르기

### select_dtypes(): 데이터 타입으로

```python
df.select_dtypes(include=[타입, ...], exclude=[타입, ...])
```

```python
grade3 = grade.reset_index()
grade3["english"] = grade3["english"].astype("int8")
grade3["korean2"] = grade3["korean2"].astype("int16")
grade3.dtypes
```

```text
id             str
korean       int64
korean2      int16
english       int8
math         int64
math2        int64
history      int64
총점           int64
평균         float64
dtype: object
```

```python
grade3.select_dtypes(include=["int16", "int8"])
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>korean2</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>90</td><td>90</td></tr><tr><th class="idx">1</th><td>90</td><td>80</td></tr><tr><th class="idx">2</th><td>90</td><td>100</td></tr><tr><th class="idx">3</th><td>90</td><td>100</td></tr><tr><th class="idx">4</th><td>90</td><td>40</td></tr><tr><th class="idx">5</th><td>90</td><td>100</td></tr></tbody></table></div></div>

```python
grade3.select_dtypes(include="number").head(2)  # 수치형 전체 (정수 + 실수)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">0</th><td>100</td><td>90</td><td>90</td><td>80</td><td>90</td><td>100</td><td>550</td><td>91.67</td></tr><tr><th class="idx">1</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr></tbody></table></div></div>

```python
grade3.select_dtypes(exclude=["str", "int64"])  # 문자열과 int64를 제외
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>korean2</th><th>english</th><th>평균</th></tr></thead><tbody><tr><th class="idx">0</th><td>90</td><td>90</td><td>91.67</td></tr><tr><th class="idx">1</th><td>90</td><td>80</td><td>78.33</td></tr><tr><th class="idx">2</th><td>90</td><td>100</td><td>89.17</td></tr><tr><th class="idx">3</th><td>90</td><td>100</td><td>79.17</td></tr><tr><th class="idx">4</th><td>90</td><td>40</td><td>73.33</td></tr><tr><th class="idx">5</th><td>90</td><td>100</td><td>89.17</td></tr></tbody></table></div></div>

`include="number"`처럼 큰 분류로 지정할 수도 있다. 문자열 컬럼을 고를 때 주의할 점이 있다.

```python
grade3.select_dtypes(include=["object"])
```

<div class="sql-result sql-result-warn"><div class="sql-result-meta">경고 · Pandas4Warning: For backward compatibility, &#x27;str&#x27; dtypes are included by select_dtypes when &#x27;object&#x27; dtype is specified. This behavior is deprecated and will be removed in a future version. Explicitly pass &#x27;str&#x27; to `include` to select them, or to `exclude` to remove them and silence this warning.</div></div>

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 1열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td></tr><tr><th class="idx">1</th><td>id-2</td></tr><tr><th class="idx">2</th><td>id-3</td></tr><tr><th class="idx">3</th><td>id-4</td></tr><tr><th class="idx">4</th><td>id-5</td></tr><tr><th class="idx">5</th><td>id-6</td></tr></tbody></table></div></div>

pandas 3.0부터 문자열 컬럼의 타입이 `object`에서 `str`로 바뀌었다. 아직은 호환을 위해 `object`로 지정해도 문자열 컬럼이 포함되지만, 위처럼 앞으로 동작이 바뀐다는 경고가 나온다. 노트북에서도 같은 `Pandas4Warning`이 출력됐다. 문자열 컬럼은 `include="str"`로 쓰면 된다.

### filter(): 이름 패턴으로

| 매개변수 | 조회 방식 |
|---|---|
| `items=[이름, ...]` | 목록과 일치하는 열. **없는 이름은 무시**하고 에러가 나지 않는다 |
| `like="문자열"` | 이름에 그 문자열이 **포함된** 열 |
| `regex="정규표현식"` | 이름이 정규표현식과 일치하는 열 |

세 방식 중 한 번에 하나만 쓸 수 있다.

```python
grade3.filter(like="math")  # 이름에 math가 들어간 열
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>math</th><th>math2</th></tr></thead><tbody><tr><th class="idx">0</th><td>80</td><td>90</td></tr><tr><th class="idx">1</th><td>80</td><td>80</td></tr><tr><th class="idx">2</th><td>80</td><td>100</td></tr><tr><th class="idx">3</th><td>80</td><td>65</td></tr><tr><th class="idx">4</th><td>80</td><td>70</td></tr><tr><th class="idx">5</th><td>80</td><td>100</td></tr></tbody></table></div></div>

```python
grade3.insert(3, "korean3", 80)
grade3.filter(regex=r"\d$")  # 숫자로 끝나는 이름
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>korean2</th><th>korean3</th><th>math2</th></tr></thead><tbody><tr><th class="idx">0</th><td>90</td><td>80</td><td>90</td></tr><tr><th class="idx">1</th><td>90</td><td>80</td><td>80</td></tr><tr><th class="idx">2</th><td>90</td><td>80</td><td>100</td></tr><tr><th class="idx">3</th><td>90</td><td>80</td><td>65</td></tr><tr><th class="idx">4</th><td>90</td><td>80</td><td>70</td></tr><tr><th class="idx">5</th><td>90</td><td>80</td><td>100</td></tr></tbody></table></div></div>

```python
grade3.filter(regex=r"^\w{4}$")  # 정확히 4글자인 이름
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 1열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>math</th></tr></thead><tbody><tr><th class="idx">0</th><td>80</td></tr><tr><th class="idx">1</th><td>80</td></tr><tr><th class="idx">2</th><td>80</td></tr><tr><th class="idx">3</th><td>80</td></tr><tr><th class="idx">4</th><td>80</td></tr><tr><th class="idx">5</th><td>80</td></tr></tbody></table></div></div>

| 정규표현식 | 의미 |
|---|---|
| `\d` | 숫자 1개 |
| `\w` | 글자·숫자·밑줄(`_`) 1개 |
| `^`, `$` | 시작, 끝 |
| `{n}` | 앞의 패턴이 n번 |

필기 주석에는 `\w`를 "정수 또는 글자 또는 공백"이라고 적었는데 공백은 포함되지 않는다. 공백은 `\s`다. `^\w{4}$`에 `math`만 걸리고 `id`, `총점`이 빠진 것도 이 규칙대로다. (한글도 `\w`에 포함된다. `총점`은 2글자라서 빠졌다.)

```python
grade3.filter(items=["math", "math2", "music"]).sum()  # 없는 열(music)은 무시
```

```text
math     480
math2    505
dtype: int64
```

`grade3[["math", "music"]]`처럼 `[]`로 없는 열을 조회하면 `KeyError`가 난다. 있을 수도 없을 수도 있는 열을 다룰 때는 `filter(items=)`가 안전하다.

### TODO: movie 데이터로 열 고르기

```python
# 1. 정수형(int64) 컬럼만 조회
df.select_dtypes(include=["int64"])
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 3열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>num_voted_users</th><th>cast_total_facebook_likes</th><th>movie_facebook_likes</th></tr></thead><tbody><tr><th class="idx">0</th><td>886204</td><td>4834</td><td>33000</td></tr><tr><th class="idx">1</th><td>471220</td><td>48350</td><td>0</td></tr><tr><td class="ellipsis" colspan="4">⋯</td></tr><tr><th class="idx">4914</th><td>1255</td><td>2386</td><td>660</td></tr><tr><th class="idx">4915</th><td>4285</td><td>163</td><td>456</td></tr></tbody></table></div></div>

```python
# 2. 정수형(int64)과 실수형(float64)을 제외한 컬럼들만 조회
df.select_dtypes(exclude=["int64", "float64"])
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 12열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>color</th><th>director_name</th><th>actor_2_name</th><th>genres</th><th>actor_1_name</th><th>movie_title</th><th>actor_3_name</th><th>plot_keywords</th><th>movie_imdb_link</th><th>language</th><th>country</th><th>content_rating</th></tr></thead><tbody><tr><th class="idx">0</th><td>Color</td><td>James Cameron</td><td>Joel David Moore</td><td>Action|Adventure|Fantasy|Sci-Fi</td><td>CCH Pounder</td><td>Avatar</td><td>Wes Studi</td><td>avatar|future|marine|native|paraplegic</td><td>http://www.imdb.com/title/tt0499549/?ref_=fn_tt_tt_1</td><td>English</td><td>USA</td><td>PG-13</td></tr><tr><th class="idx">1</th><td>Color</td><td>Gore Verbinski</td><td>Orlando Bloom</td><td>Action|Adventure|Fantasy</td><td>Johnny Depp</td><td>Pirates of the Caribbean: At World&#x27;s End</td><td>Jack Davenport</td><td>goddess|marriage ceremony|marriage proposal|pirate|singapore</td><td>http://www.imdb.com/title/tt0449088/?ref_=fn_tt_tt_1</td><td>English</td><td>USA</td><td>PG-13</td></tr><tr><td class="ellipsis" colspan="13">⋯</td></tr><tr><th class="idx">4914</th><td>Color</td><td>Daniel Hsia</td><td>Daniel Henney</td><td>Comedy|Drama|Romance</td><td>Alan Ruck</td><td>Shanghai Calling</td><td>Eliza Coupe</td><td><span class="sql-null">NaN</span></td><td>http://www.imdb.com/title/tt2070597/?ref_=fn_tt_tt_1</td><td>English</td><td>USA</td><td>PG-13</td></tr><tr><th class="idx">4915</th><td>Color</td><td>Jon Gunn</td><td>Brian Herzlinger</td><td>Documentary</td><td>John August</td><td>My Date with Drew</td><td>Jon Gunn</td><td>actress name in title|crush|date|four word title|video ca...</td><td>http://www.imdb.com/title/tt0378407/?ref_=fn_tt_tt_1</td><td>English</td><td>USA</td><td>PG</td></tr></tbody></table></div></div>

```python
# 3. actor_1_facebook_likes, actor_1_name 컬럼 조회
df.filter(like="actor_1")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 2열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>actor_1_facebook_likes</th><th>actor_1_name</th></tr></thead><tbody><tr><th class="idx">0</th><td>1000.0</td><td>CCH Pounder</td></tr><tr><th class="idx">1</th><td>40000.0</td><td>Johnny Depp</td></tr><tr><td class="ellipsis" colspan="3">⋯</td></tr><tr><th class="idx">4914</th><td>946.0</td><td>Alan Ruck</td></tr><tr><th class="idx">4915</th><td>86.0</td><td>John August</td></tr></tbody></table></div></div>

```python
# 4. movie가 들어가는 컬럼들 조회
df.filter(like="movie")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4916행 × 3열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>movie_title</th><th>movie_imdb_link</th><th>movie_facebook_likes</th></tr></thead><tbody><tr><th class="idx">0</th><td>Avatar</td><td>http://www.imdb.com/title/tt0499549/?ref_=fn_tt_tt_1</td><td>33000</td></tr><tr><th class="idx">1</th><td>Pirates of the Caribbean: At World&#x27;s End</td><td>http://www.imdb.com/title/tt0449088/?ref_=fn_tt_tt_1</td><td>0</td></tr><tr><td class="ellipsis" colspan="4">⋯</td></tr><tr><th class="idx">4914</th><td>Shanghai Calling</td><td>http://www.imdb.com/title/tt2070597/?ref_=fn_tt_tt_1</td><td>660</td></tr><tr><th class="idx">4915</th><td>My Date with Drew</td><td>http://www.imdb.com/title/tt0378407/?ref_=fn_tt_tt_1</td><td>456</td></tr></tbody></table></div></div>

## 행 조회: loc과 iloc

| | `loc` | `iloc` |
|---|---|---|
| 기준 | index **이름** | 행 **순번** |
| 한 행 | `df.loc["id-1"]` | `df.iloc[0]` |
| 여러 행 | `df.loc[["id-1", "id-4"]]` | `df.iloc[[0, 3]]` |
| slicing | `df.loc["id-2":"id-4"]` (끝 **포함**) | `df.iloc[1:4]` (끝 **미포함**) |
| 행 + 열 | `df.loc["id-2", "math2"]` (둘 다 이름) | `df.iloc[1, 4]` (둘 다 순번) |

Series에서 정리한 규칙이 그대로 적용된다.

### loc: 이름으로

```python
grade.loc["id-1"]  # 한 행 → Series. 이 Series의 index 이름은 컬럼명
```

```text
korean     100.00
korean2     90.00
english     90.00
math        80.00
math2       90.00
history    100.00
총점         550.00
평균          91.67
Name: id-1, dtype: float64
```

한 행을 조회해도 Series가 나온다. 이때 Series의 이름표는 컬럼명이다. 모든 값이 한 Series에 들어가면서 정수였던 점수들이 `평균`의 실수 타입에 맞춰 `float64`가 됐다.

```python
grade.loc[["id-1", "id-4", "id-2"]]  # 여러 행 → DataFrame
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>90</td><td>80</td><td>90</td><td>100</td><td>550</td><td>91.67</td></tr><tr><th class="idx">id-4</th><td>60</td><td>90</td><td>100</td><td>80</td><td>65</td><td>80</td><td>475</td><td>79.17</td></tr><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr></tbody></table></div></div>

```python
grade.loc["id-2":"id-4"]  # 끝(id-4) 포함
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr><tr><th class="idx">id-4</th><td>60</td><td>90</td><td>100</td><td>80</td><td>65</td><td>80</td><td>475</td><td>79.17</td></tr></tbody></table></div></div>

```python
grade.loc["id-4":"id-1":-1]  # 역순
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-4</th><td>60</td><td>90</td><td>100</td><td>80</td><td>65</td><td>80</td><td>475</td><td>79.17</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>90</td><td>80</td><td>90</td><td>100</td><td>550</td><td>91.67</td></tr></tbody></table></div></div>

```python
grade.loc["id-2":"id-4", ["korean", "math", "history"]]  # 행 범위 + 열 목록
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>math</th><th>history</th></tr></thead><tbody><tr><th class="idx">id-2</th><td>50</td><td>80</td><td>90</td></tr><tr><th class="idx">id-3</th><td>70</td><td>80</td><td>95</td></tr><tr><th class="idx">id-4</th><td>60</td><td>80</td><td>80</td></tr></tbody></table></div></div>

```python
grade.loc["id-2", "korean":"math2"]  # loc에서는 열도 이름으로 slicing 가능
```

```text
korean     50.0
korean2    90.0
english    80.0
math       80.0
math2      80.0
Name: id-2, dtype: float64
```

`[]`로는 열을 slicing할 수 없지만, `loc`의 열 자리에서는 이름 범위로 slicing할 수 있다.

### iloc: 순번으로

```python
grade.iloc[[1, 4, 2]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr><tr><th class="idx">id-5</th><td>90</td><td>90</td><td>40</td><td>80</td><td>70</td><td>70</td><td>440</td><td>73.33</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr></tbody></table></div></div>

```python
grade.iloc[1:3]  # 끝(3) 미포함
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr></tbody></table></div></div>

```python
grade.iloc[1, 6]  # 1번 행, 6번 열 (둘 다 순번)
```

```text
np.int64(470)
```

```python
grade.iloc[[0, 3], 2:6]  # 0·3번 행, 2~5번 열
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>english</th><th>math</th><th>math2</th><th>history</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>90</td><td>80</td><td>90</td><td>100</td></tr><tr><th class="idx">id-4</th><td>100</td><td>80</td><td>65</td><td>80</td></tr></tbody></table></div></div>

### TODO: movie 데이터로 행 조회

영화 제목을 index로 쓰면 제목으로 행을 찾을 수 있다.

```python
movie = pd.read_csv("data/movie.csv", index_col="movie_title")
movie.head(3)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 27열</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>color</th><th>director_name</th><th>num_critic_for_reviews</th><th>duration</th><th>director_facebook_likes</th><th>actor_3_facebook_likes</th><th>actor_2_name</th><th>actor_1_facebook_likes</th><th>gross</th><th>genres</th><th>actor_1_name</th><th>num_voted_users</th><th>cast_total_facebook_likes</th><th>actor_3_name</th><th>facenumber_in_poster</th><th>plot_keywords</th><th>movie_imdb_link</th><th>num_user_for_reviews</th><th>language</th><th>country</th><th>content_rating</th><th>budget</th><th>title_year</th><th>actor_2_facebook_likes</th><th>imdb_score</th><th>aspect_ratio</th><th>movie_facebook_likes</th></tr></thead><tbody><tr><th class="idx">Avatar</th><td>Color</td><td>James Cameron</td><td>723.0</td><td>178.0</td><td>0.0</td><td>855.0</td><td>Joel David Moore</td><td>1000.0</td><td>760505847.0</td><td>Action|Adventure|Fantasy|Sci-Fi</td><td>CCH Pounder</td><td>886204</td><td>4834</td><td>Wes Studi</td><td>0.0</td><td>avatar|future|marine|native|paraplegic</td><td>http://www.imdb.com/title/tt0499549/?ref_=fn_tt_tt_1</td><td>3054.0</td><td>English</td><td>USA</td><td>PG-13</td><td>237000000.0</td><td>2009.0</td><td>936.0</td><td>7.9</td><td>1.78</td><td>33000</td></tr><tr><th class="idx">Pirates of the Caribbean: At World&#x27;s End</th><td>Color</td><td>Gore Verbinski</td><td>302.0</td><td>169.0</td><td>563.0</td><td>1000.0</td><td>Orlando Bloom</td><td>40000.0</td><td>309404152.0</td><td>Action|Adventure|Fantasy</td><td>Johnny Depp</td><td>471220</td><td>48350</td><td>Jack Davenport</td><td>0.0</td><td>goddess|marriage ceremony|marriage proposal|pirate|singapore</td><td>http://www.imdb.com/title/tt0449088/?ref_=fn_tt_tt_1</td><td>1238.0</td><td>English</td><td>USA</td><td>PG-13</td><td>300000000.0</td><td>2007.0</td><td>5000.0</td><td>7.1</td><td>2.35</td><td>0</td></tr><tr><th class="idx">Spectre</th><td>Color</td><td>Sam Mendes</td><td>602.0</td><td>148.0</td><td>0.0</td><td>161.0</td><td>Rory Kinnear</td><td>11000.0</td><td>200074175.0</td><td>Action|Adventure|Thriller</td><td>Christoph Waltz</td><td>275868</td><td>11700</td><td>Stephanie Sigman</td><td>1.0</td><td>bomb|espionage|sequel|spy|terrorist</td><td>http://www.imdb.com/title/tt2379713/?ref_=fn_tt_tt_1</td><td>994.0</td><td>English</td><td>UK</td><td>PG-13</td><td>245000000.0</td><td>2015.0</td><td>393.0</td><td>6.8</td><td>2.35</td><td>85000</td></tr></tbody></table></div></div>

```python
# 1. 행 이름이 Avatar인 행의 감독
movie.loc["Avatar", "director_name"]
```

```text
'James Cameron'
```

```python
# 2. 행 이름이 Spider-Man 3, The Avengers, Titanic인 행
movie.loc[["Spider-Man 3", "The Avengers", "Titanic"], ["director_name", "title_year", "imdb_score"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>director_name</th><th>title_year</th><th>imdb_score</th></tr></thead><tbody><tr><th class="idx">Spider-Man 3</th><td>Sam Raimi</td><td>2007.0</td><td>6.2</td></tr><tr><th class="idx">The Avengers</th><td>Joss Whedon</td><td>2012.0</td><td>8.1</td></tr><tr><th class="idx">Titanic</th><td>James Cameron</td><td>1997.0</td><td>7.7</td></tr></tbody></table></div></div>

```python
# 3. 행 이름 Spectre ~ Robin Hood 까지 범위로 조회
movie.loc["Spectre":"Robin Hood", ["director_name"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 21행 × 1열 (앞뒤 3행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>director_name</th></tr></thead><tbody><tr><th class="idx">Spectre</th><td>Sam Mendes</td></tr><tr><th class="idx">The Dark Knight Rises</th><td>Christopher Nolan</td></tr><tr><th class="idx">Star Wars: Episode VII - The Force Awakens</th><td>Doug Walker</td></tr><tr><td class="ellipsis" colspan="2">⋯</td></tr><tr><th class="idx">The Hobbit: The Battle of the Five Armies</th><td>Peter Jackson</td></tr><tr><th class="idx">The Amazing Spider-Man</th><td>Marc Webb</td></tr><tr><th class="idx">Robin Hood</th><td>Ridley Scott</td></tr></tbody></table></div></div>

```python
# 4. John Carter의 감독 이름
movie.loc["John Carter", "director_name"]
```

```text
'Andrew Stanton'
```

```python
# 5. 1번 행 (앞의 5개 값만)
movie.iloc[1].head()
```

```text
color                               Color
director_name              Gore Verbinski
num_critic_for_reviews              302.0
duration                            169.0
director_facebook_likes             563.0
Name: Pirates of the Caribbean: At World's End, dtype: object
```

```python
# 6. 마지막 행 (앞의 5개 값만)
movie.iloc[-1].head()
```

```text
color                         Color
director_name              Jon Gunn
num_critic_for_reviews         43.0
duration                       90.0
director_facebook_likes        16.0
Name: My Date with Drew, dtype: object
```

한 행을 조회한 Series는 숫자와 문자열이 섞여 있어서 dtype이 `object`다.

```python
# 7. 1, 2, 5, 6, 9번 행의 감독 이름
movie.iloc[[1, 2, 5, 6, 9], [1]]  # iloc에서는 컬럼도 순번으로
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 1열</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>director_name</th></tr></thead><tbody><tr><th class="idx">Pirates of the Caribbean: At World&#x27;s End</th><td>Gore Verbinski</td></tr><tr><th class="idx">Spectre</th><td>Sam Mendes</td></tr><tr><th class="idx">John Carter</th><td>Andrew Stanton</td></tr><tr><th class="idx">Spider-Man 3</th><td>Sam Raimi</td></tr><tr><th class="idx">Harry Potter and the Half-Blood Prince</th><td>David Yates</td></tr></tbody></table></div></div>

```python
# 8. 10 ~ 20번 행
movie.iloc[10:21, :3]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 11행 × 3열 (앞뒤 3행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th>movie_title</th><th>color</th><th>director_name</th><th>num_critic_for_reviews</th></tr></thead><tbody><tr><th class="idx">Batman v Superman: Dawn of Justice</th><td>Color</td><td>Zack Snyder</td><td>673.0</td></tr><tr><th class="idx">Superman Returns</th><td>Color</td><td>Bryan Singer</td><td>434.0</td></tr><tr><th class="idx">Quantum of Solace</th><td>Color</td><td>Marc Forster</td><td>403.0</td></tr><tr><td class="ellipsis" colspan="4">⋯</td></tr><tr><th class="idx">Pirates of the Caribbean: On Stranger Tides</th><td>Color</td><td>Rob Marshall</td><td>448.0</td></tr><tr><th class="idx">Men in Black 3</th><td>Color</td><td>Barry Sonnenfeld</td><td>451.0</td></tr><tr><th class="idx">The Hobbit: The Battle of the Five Armies</th><td>Color</td><td>Peter Jackson</td><td>422.0</td></tr></tbody></table></div></div>

2번 문제는 필기에서 모든 열을 조회했는데, 블로그에서는 표가 너무 넓어서 열 3개만 골라 실행했다. 8번도 앞의 3개 열만 남겼다.

## Boolean indexing: 조건으로 행 고르기

SQL의 `WHERE`절과 같은 역할이다. 조건이 True인 행만 조회한다.

| 방법 | 형식 |
|---|---|
| 행만 | `df[조건]`, `df.loc[조건]` |
| 행 + 열 | `df.loc[조건, 열]` |

조건을 묶을 때는 `&`, `|`, `~`를 쓰고 각 조건을 괄호로 감싼다. Series와 같다.

```python
grade[[True, True, False, False, True, False]]  # True인 위치의 행
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>90</td><td>80</td><td>90</td><td>100</td><td>550</td><td>91.67</td></tr><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr><tr><th class="idx">id-5</th><td>90</td><td>90</td><td>40</td><td>80</td><td>70</td><td>70</td><td>440</td><td>73.33</td></tr></tbody></table></div></div>

```python
grade.loc[grade["korean"] > 80, "평균"]
# SELECT 평균 FROM grade WHERE korean > 80
```

```text
id
id-1    91.67
id-5    73.33
Name: 평균, dtype: float64
```

필기에 SQL로 같은 뜻을 적어 두었다. `loc[조건, 열]`은 `WHERE` + `SELECT 컬럼`이다.

```python
grade.loc[grade["korean"] > 80].mean()  # 조건에 맞는 행들의 열별 평균
```

```text
korean      95.0
korean2     90.0
english     65.0
math        80.0
math2       80.0
history     85.0
총점         495.0
평균          82.5
dtype: float64
```

```python
grade[(grade["korean"] > 70) & (grade["평균"] >= 90)]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 1행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>90</td><td>80</td><td>90</td><td>100</td><td>550</td><td>91.67</td></tr></tbody></table></div></div>

### TODO: movie 데이터로 조건 조회

```python
movie = pd.read_csv("data/movie.csv")
# 상영시간(duration)이 300 이상인 영화들의 제목과 감독 이름
movie.loc[movie["duration"] >= 300, ["movie_title", "director_name"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>movie_title</th><th>director_name</th></tr></thead><tbody><tr><th class="idx">1134</th><td>Heaven&#x27;s Gate</td><td>Michael Cimino</td></tr><tr><th class="idx">1487</th><td>Blood In, Blood Out</td><td>Taylor Hackford</td></tr><tr><th class="idx">1694</th><td>Trapped</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">2436</th><td>Carlos</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">3254</th><td>The Legend of Suriyothai</td><td>Chatrichalerm Yukol</td></tr></tbody></table></div></div>

필기 답안은 다음과 같았다.

```python
movie.loc[movie["duration"] >= 300], ["movie_title", "director_name"]
```

닫는 대괄호 `]`가 조건 바로 뒤에 있어서, Python은 이것을 `(조건 조회 결과, 열 이름 리스트)`라는 **튜플**로 해석했다. 그래서 노트북에는 DataFrame과 리스트가 괄호로 묶인 이상한 출력이 남아 있다. 열 목록은 `loc[ ]` **안에** 쉼표로 넣어야 한다.

## query(): 문자열로 조건 쓰기

Boolean indexing을 문자열 조건식으로 쓸 수 있게 한 메소드다. SQL `WHERE`절처럼 읽힌다.

| | 장점 | 단점 |
|---|---|---|
| `query()` | 읽기 쉽다. 문자열이라 조건을 동적으로 만들기 좋다 | boolean indexing보다 느리다 |

- 조건 구문: `"컬럼명 연산자 비교값"`
- 문자열 값은 따옴표로 감싼다.
- 외부 변수는 `@변수명`으로 쓴다. f-string으로 문자열을 만들어도 된다.

| 연산 | query 안에서 |
|---|---|
| 비교 | `==`, `>`, `>=`, `<`, `<=`, `!=` |
| 논리 | `and`, `or`, `not` (또는 `&`, `\|`, `~`). 괄호 없어도 된다 |
| 포함 | `in`, `not in` (값은 리스트) |
| 결측치 | `컬럼.isna()`, `컬럼.notna()` |
| index 이름 | `index` |
| 문자열 부분 검색 | `컬럼.str.contains()`, `.str.startswith()`, `.str.endswith()` |

```python
data_dict = {
    "name": ["김영수", "박영희", "오준호", "조민경", "박영희", "김영수"],
    "age": [23, 17, 28, 31, 23, 17],
    "email": ["kys@gmail.com", "pyh@gmail.com", "ojh@daum.net",
              "cmk@naver.com", "pyh@daum.net", np.nan],
}
df = pd.DataFrame(data_dict)
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영수</td><td>23</td><td>kys@gmail.com</td></tr><tr><th class="idx">1</th><td>박영희</td><td>17</td><td>pyh@gmail.com</td></tr><tr><th class="idx">2</th><td>오준호</td><td>28</td><td>ojh@daum.net</td></tr><tr><th class="idx">3</th><td>조민경</td><td>31</td><td>cmk@naver.com</td></tr><tr><th class="idx">4</th><td>박영희</td><td>23</td><td>pyh@daum.net</td></tr><tr><th class="idx">5</th><td>김영수</td><td>17</td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

```python
df.query("age >= 25")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">2</th><td>오준호</td><td>28</td><td>ojh@daum.net</td></tr><tr><th class="idx">3</th><td>조민경</td><td>31</td><td>cmk@naver.com</td></tr></tbody></table></div></div>

```python
df.query("name == '김영수'")  # 문자열 값은 따옴표로
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영수</td><td>23</td><td>kys@gmail.com</td></tr><tr><th class="idx">5</th><td>김영수</td><td>17</td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

```python
df.query("email.isna()")  # 결측치인 행
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 1행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">5</th><td>김영수</td><td>17</td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

```python
df.query("not (age > 25)")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영수</td><td>23</td><td>kys@gmail.com</td></tr><tr><th class="idx">1</th><td>박영희</td><td>17</td><td>pyh@gmail.com</td></tr><tr><th class="idx">4</th><td>박영희</td><td>23</td><td>pyh@daum.net</td></tr><tr><th class="idx">5</th><td>김영수</td><td>17</td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

```python
df.query("name == '박영희' and age > 20")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 1행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">4</th><td>박영희</td><td>23</td><td>pyh@daum.net</td></tr></tbody></table></div></div>

```python
df.query("age in [17, 20, 23]")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영수</td><td>23</td><td>kys@gmail.com</td></tr><tr><th class="idx">1</th><td>박영희</td><td>17</td><td>pyh@gmail.com</td></tr><tr><th class="idx">4</th><td>박영희</td><td>23</td><td>pyh@daum.net</td></tr><tr><th class="idx">5</th><td>김영수</td><td>17</td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

```python
a = [1, 5]
df.query("index == @a")  # index 이름으로, 외부 변수 사용
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">1</th><td>박영희</td><td>17</td><td>pyh@gmail.com</td></tr><tr><th class="idx">5</th><td>김영수</td><td>17</td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

```python
df.query("name.str.startswith('김')")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영수</td><td>23</td><td>kys@gmail.com</td></tr><tr><th class="idx">5</th><td>김영수</td><td>17</td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

### 결측치가 있는 컬럼의 문자열 검색

필기 주석에는 "부분일치 → 결측치가 있는 행으로 조회하면 예외 발생 (3.0.2 버전에서는 발생 안 함)"이라고 적혀 있다. 실제로 확인했다.

```python
df.query("email.str.endswith('com')")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영수</td><td>23</td><td>kys@gmail.com</td></tr><tr><th class="idx">1</th><td>박영희</td><td>17</td><td>pyh@gmail.com</td></tr><tr><th class="idx">3</th><td>조민경</td><td>31</td><td>cmk@naver.com</td></tr></tbody></table></div></div>

```python
df["email"].str.endswith("com")
```

```text
0     True
1     True
2    False
3     True
4    False
5    False
Name: email, dtype: bool
```

pandas 3.0부터 문자열 컬럼이 `str` 타입이 되면서 결측치에 대한 `str.endswith()` 결과가 `False`로 나온다. pandas 2.x에서는 `object` 타입이라 결측치 자리에 `NaN`이 나왔고, True/False가 아닌 값이 섞인 조건으로는 행을 고를 수 없어서 에러가 났다. 2.x에서는 필기처럼 결측치를 먼저 거른 뒤 검색해야 한다.

```python
df.query("email.notna()").query("email.str.endswith('com')")  # 2.x에서도 안전한 방법
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영수</td><td>23</td><td>kys@gmail.com</td></tr><tr><th class="idx">1</th><td>박영희</td><td>17</td><td>pyh@gmail.com</td></tr><tr><th class="idx">3</th><td>조민경</td><td>31</td><td>cmk@naver.com</td></tr></tbody></table></div></div>

### 외부 변수로 조건 만들기

노트북에서는 `age = input()`으로 나이를 입력받아 `df.query("age == @age")`를 실행하려다 에러가 났다. 두 가지를 같이 고쳐야 한다.

- `input()`은 문자열을 반환하므로 숫자 컬럼과 비교하려면 `int()`로 바꿔야 한다.
- `age`라는 변수 이름이 컬럼 이름 `age`와 같으면 헷갈린다. `@`가 붙은 쪽이 변수지만, 이름을 다르게 두는 편이 읽기 쉽다.

```python
target_age = 23  # 원래는 int(input())
df.query("age == @target_age")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영수</td><td>23</td><td>kys@gmail.com</td></tr><tr><th class="idx">4</th><td>박영희</td><td>23</td><td>pyh@daum.net</td></tr></tbody></table></div></div>

```python
name = "김영수"
df.query(f"name == '{name}'")  # f-string으로 조건 문자열 만들기
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>name</th><th>age</th><th>email</th></tr></thead><tbody><tr><th class="idx">0</th><td>김영수</td><td>23</td><td>kys@gmail.com</td></tr><tr><th class="idx">5</th><td>김영수</td><td>17</td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

### TODO: movie 데이터로 query

```python
df = pd.read_csv("data/movie.csv")
# 1. 상영시간이 300분 이상인 영화
df.query("duration >= 300")[["movie_title", "duration"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>movie_title</th><th>duration</th></tr></thead><tbody><tr><th class="idx">1134</th><td>Heaven&#x27;s Gate</td><td>325.0</td></tr><tr><th class="idx">1487</th><td>Blood In, Blood Out</td><td>330.0</td></tr><tr><th class="idx">1694</th><td>Trapped</td><td>511.0</td></tr><tr><th class="idx">2436</th><td>Carlos</td><td>334.0</td></tr><tr><th class="idx">3254</th><td>The Legend of Suriyothai</td><td>300.0</td></tr></tbody></table></div></div>

```python
# 2. 상영시간이 250분 ~ 300분인 영화
df.query("duration >= 250 and duration <= 300")[["movie_title", "duration"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 9행 × 2열 (앞뒤 3행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>movie_title</th><th>duration</th></tr></thead><tbody><tr><th class="idx">874</th><td>Gods and Generals</td><td>280.0</td></tr><tr><th class="idx">1150</th><td>Cleopatra</td><td>251.0</td></tr><tr><th class="idx">1556</th><td>Apocalypse Now</td><td>289.0</td></tr><tr><td class="ellipsis" colspan="3">⋯</td></tr><tr><th class="idx">2687</th><td>The Company</td><td>286.0</td></tr><tr><th class="idx">2922</th><td>Das Boot</td><td>293.0</td></tr><tr><th class="idx">3254</th><td>The Legend of Suriyothai</td><td>300.0</td></tr></tbody></table></div></div>

```python
# 3. 컬러 영화가 아닌 영화
df.query("color != 'Color'")[["movie_title", "color"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 223행 × 2열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>movie_title</th><th>color</th></tr></thead><tbody><tr><th class="idx">4</th><td>Star Wars: Episode VII - The Force Awakens</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">111</th><td>Pearl Harbor</td><td>Black and White</td></tr><tr><td class="ellipsis" colspan="3">⋯</td></tr><tr><th class="idx">4895</th><td>Stories of Our Lives</td><td>Black and White</td></tr><tr><th class="idx">4901</th><td>Tin Can Man</td><td>Black and White</td></tr></tbody></table></div></div>

```python
df.query("color != 'Color'")["color"].value_counts(dropna=False)
```

```text
color
Black and White    204
NaN                 19
Name: count, dtype: int64
```

3번은 흑백 영화만 나올 것 같지만 `color`가 결측치인 영화도 포함된다. 결측치는 `'Color'`와 같지 않기 때문이다. 흑백만 원하면 `color == 'Black and White'`로 쓴다. (`보충`)

```python
# 4. 감독 이름에 James가 들어가는 영화
df.query("director_name.str.contains('James')")[["movie_title", "director_name"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 89행 × 2열 (앞뒤 2행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>movie_title</th><th>director_name</th></tr></thead><tbody><tr><th class="idx">0</th><td>Avatar</td><td>James Cameron</td></tr><tr><th class="idx">26</th><td>Titanic</td><td>James Cameron</td></tr><tr><td class="ellipsis" colspan="3">⋯</td></tr><tr><th class="idx">4797</th><td>Yesterday Was a Lie</td><td>James Kerwin</td></tr><tr><th class="idx">4883</th><td>Pink Narcissus</td><td>James Bidgood</td></tr></tbody></table></div></div>

## 정리

| 하고 싶은 일 | 방법 |
|---|---|
| 열 하나 / 여러 개 | `df["열"]` (Series) / `df[["열1", "열2"]]` (DataFrame) |
| 순번으로 열 | `df[df.columns[1:6]]` |
| 타입으로 열 | `select_dtypes(include=, exclude=)` |
| 이름 패턴으로 열 | `filter(items=, like=, regex=)` |
| 이름으로 행 | `loc[이름]`, `loc[시작:끝]` (끝 포함) |
| 순번으로 행 | `iloc[순번]`, `iloc[시작:끝]` (끝 미포함) |
| 조건으로 행 | `df.loc[(조건1) & (조건2), 열들]` |
| 문자열 조건 | `df.query("age >= 25 and name == '김영수'")` |

- `df[1:6]`은 열이 아니라 행을 자른다.
- `loc[조건], [열]`처럼 쓰면 튜플이 된다. 열은 `loc[조건, 열]` 안에 넣는다.
- `!=` 조건에는 결측치도 걸린다.
- pandas 3.0부터 문자열 타입은 `str`이고, 결측치에 대한 문자열 검색 결과는 `False`다.
