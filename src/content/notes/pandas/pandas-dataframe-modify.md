---
title: "DataFrame 다루기: 기본 정보·이름 변경·행과 열 추가 삭제"
description: "shape·info·describe로 데이터셋을 처음 파악하고, 컬럼과 행 이름을 바꾸고, set_index·reset_index, drop·drop_duplicates, 열·행 추가와 파생변수 만들기를 정리합니다."
category: 'Tech'
subcategory: 'Data Analysis'
series: 'Pandas'
seriesOrder: 3
originalNotebook: "02_Pandas_DataFrame.ipynb (2)"
tags: ["Python","Pandas","DataFrame"]
date: 2026-04-30
---

> SKN31 데이터 분석 실습 노트북 `02_Pandas_DataFrame.ipynb`의 중간 부분(기본 정보 조회부터 파생변수까지)을 바탕으로 정리했습니다.
> 노트북은 셀을 오가며 실행해서 변수 상태가 섞인 곳이 있어, 코드를 순서대로 정리한 뒤 **pandas 3.0.2에서 처음부터 다시 실행한 결과**를 실었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 새 데이터셋을 받았을 때 먼저 보는 것: `shape`, `head`, `info`, `isnull().sum()`, `describe`
- 컬럼 이름·행 이름 조회와 변경
- 컬럼을 index로 보내고(`set_index`) 되돌리기(`reset_index`)
- 행·열 삭제와 중복 행 제거
- 열 추가, 열 삽입, 행 추가
- 기존 열로 새 열을 만드는 파생변수

## 데이터셋 기본 정보 조회

새 데이터를 받으면 다음 순서로 훑어본다.

| 메소드·속성 | 확인하는 것 |
|---|---|
| `shape` | 몇 행 몇 열인지 |
| `head()`, `tail()` | 앞·뒤 몇 행의 실제 값 |
| `info()` | 컬럼별 타입과 결측치 아닌 값의 개수 |
| `isnull().sum()` | 컬럼별 결측치 개수 |
| `describe()` | 숫자형은 기술통계, 문자열은 개수·고유값·최빈값 |

실습 데이터는 영화 4,916편의 정보가 담긴 `movie.csv`다.

```python
import pandas as pd
import numpy as np

df = pd.read_csv("data/movie.csv")
df.shape  # (행 수, 열 수) - tuple
```

```text
(4916, 28)
```

```python
df.head()  # 앞에서 N행 (기본 5)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 28열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>color</th><th>director_name</th><th>num_critic_for_reviews</th><th>duration</th><th>director_facebook_likes</th><th>actor_3_facebook_likes</th><th>actor_2_name</th><th>actor_1_facebook_likes</th><th>gross</th><th>genres</th><th>actor_1_name</th><th>movie_title</th><th>num_voted_users</th><th>cast_total_facebook_likes</th><th>actor_3_name</th><th>facenumber_in_poster</th><th>plot_keywords</th><th>movie_imdb_link</th><th>num_user_for_reviews</th><th>language</th><th>country</th><th>content_rating</th><th>budget</th><th>title_year</th><th>actor_2_facebook_likes</th><th>imdb_score</th><th>aspect_ratio</th><th>movie_facebook_likes</th></tr></thead><tbody><tr><th class="idx">0</th><td>Color</td><td>James Cameron</td><td>723.0</td><td>178.0</td><td>0.0</td><td>855.0</td><td>Joel David Moore</td><td>1000.0</td><td>760505847.0</td><td>Action|Adventure|Fantasy|Sci-Fi</td><td>CCH Pounder</td><td>Avatar</td><td>886204</td><td>4834</td><td>Wes Studi</td><td>0.0</td><td>avatar|future|marine|native|paraplegic</td><td>http://www.imdb.com/title/tt0499549/?ref_=fn_tt_tt_1</td><td>3054.0</td><td>English</td><td>USA</td><td>PG-13</td><td>237000000.0</td><td>2009.0</td><td>936.0</td><td>7.9</td><td>1.78</td><td>33000</td></tr><tr><th class="idx">1</th><td>Color</td><td>Gore Verbinski</td><td>302.0</td><td>169.0</td><td>563.0</td><td>1000.0</td><td>Orlando Bloom</td><td>40000.0</td><td>309404152.0</td><td>Action|Adventure|Fantasy</td><td>Johnny Depp</td><td>Pirates of the Caribbean: At World&#x27;s End</td><td>471220</td><td>48350</td><td>Jack Davenport</td><td>0.0</td><td>goddess|marriage ceremony|marriage proposal|pirate|singapore</td><td>http://www.imdb.com/title/tt0449088/?ref_=fn_tt_tt_1</td><td>1238.0</td><td>English</td><td>USA</td><td>PG-13</td><td>300000000.0</td><td>2007.0</td><td>5000.0</td><td>7.1</td><td>2.35</td><td>0</td></tr><tr><th class="idx">2</th><td>Color</td><td>Sam Mendes</td><td>602.0</td><td>148.0</td><td>0.0</td><td>161.0</td><td>Rory Kinnear</td><td>11000.0</td><td>200074175.0</td><td>Action|Adventure|Thriller</td><td>Christoph Waltz</td><td>Spectre</td><td>275868</td><td>11700</td><td>Stephanie Sigman</td><td>1.0</td><td>bomb|espionage|sequel|spy|terrorist</td><td>http://www.imdb.com/title/tt2379713/?ref_=fn_tt_tt_1</td><td>994.0</td><td>English</td><td>UK</td><td>PG-13</td><td>245000000.0</td><td>2015.0</td><td>393.0</td><td>6.8</td><td>2.35</td><td>85000</td></tr><tr><th class="idx">3</th><td>Color</td><td>Christopher Nolan</td><td>813.0</td><td>164.0</td><td>22000.0</td><td>23000.0</td><td>Christian Bale</td><td>27000.0</td><td>448130642.0</td><td>Action|Thriller</td><td>Tom Hardy</td><td>The Dark Knight Rises</td><td>1144337</td><td>106759</td><td>Joseph Gordon-Levitt</td><td>0.0</td><td>deception|imprisonment|lawlessness|police officer|terrori...</td><td>http://www.imdb.com/title/tt1345836/?ref_=fn_tt_tt_1</td><td>2701.0</td><td>English</td><td>USA</td><td>PG-13</td><td>250000000.0</td><td>2012.0</td><td>23000.0</td><td>8.5</td><td>2.35</td><td>164000</td></tr><tr><th class="idx">4</th><td><span class="sql-null">NaN</span></td><td>Doug Walker</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>131.0</td><td><span class="sql-null">NaN</span></td><td>Rob Walker</td><td>131.0</td><td><span class="sql-null">NaN</span></td><td>Documentary</td><td>Doug Walker</td><td>Star Wars: Episode VII - The Force Awakens</td><td>8</td><td>143</td><td><span class="sql-null">NaN</span></td><td>0.0</td><td><span class="sql-null">NaN</span></td><td>http://www.imdb.com/title/tt5289954/?ref_=fn_tt_tt_1</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>12.0</td><td>7.1</td><td><span class="sql-null">NaN</span></td><td>0</td></tr></tbody></table></div></div>

컬럼이 28개라 표가 옆으로 길다. 화면에서 좌우로 스크롤해서 볼 수 있다.

```python
df.info()
```

```text
<class 'pandas.DataFrame'>
RangeIndex: 4916 entries, 0 to 4915
Data columns (total 28 columns):
 #   Column                     Non-Null Count  Dtype  
---  ------                     --------------  -----  
 0   color                      4897 non-null   str    
 1   director_name              4814 non-null   str    
 2   num_critic_for_reviews     4867 non-null   float64
 3   duration                   4901 non-null   float64
 4   director_facebook_likes    4814 non-null   float64
 5   actor_3_facebook_likes     4893 non-null   float64
 6   actor_2_name               4903 non-null   str    
 7   actor_1_facebook_likes     4909 non-null   float64
 8   gross                      4054 non-null   float64
 9   genres                     4916 non-null   str    
 10  actor_1_name               4909 non-null   str    
 11  movie_title                4916 non-null   str    
 12  num_voted_users            4916 non-null   int64  
 13  cast_total_facebook_likes  4916 non-null   int64  
 14  actor_3_name               4893 non-null   str    
 15  facenumber_in_poster       4903 non-null   float64
 16  plot_keywords              4764 non-null   str    
 17  movie_imdb_link            4916 non-null   str    
 18  num_user_for_reviews       4895 non-null   float64
 19  language                   4902 non-null   str    
 20  country                    4911 non-null   str    
 21  content_rating             4616 non-null   str    
 22  budget                     4432 non-null   float64
 23  title_year                 4810 non-null   float64
 24  actor_2_facebook_likes     4903 non-null   float64
 25  imdb_score                 4916 non-null   float64
 26  aspect_ratio               4590 non-null   float64
 27  movie_facebook_likes       4916 non-null   int64  
dtypes: float64(13), int64(3), str(12)
memory usage: 2.0 MB
```

필기에 `info()` 출력 읽는 법을 주석으로 정리해 두었다.

| 출력 줄 | 의미 |
|---|---|
| `RangeIndex: 4916 entries, 0 to 4915` | 행 수와 index 이름 범위 |
| `Data columns (total 28 columns)` | 컬럼 수 |
| `Column / Non-Null Count / Dtype` | 컬럼명 / 결측치가 아닌 값의 개수 / 데이터 타입 |
| `dtypes: float64(13), int64(3), str(12)` | 타입별 컬럼 수 |
| `memory usage` | 사용 중인 메모리 |

`Non-Null Count`가 4916보다 작으면 그만큼 결측치가 있다는 뜻이다. pandas 3.0부터 문자열 컬럼의 타입이 `object`가 아니라 `str`로 표시된다. (`보충`)

```python
df.isnull().sum()  # DataFrame.집계함수() → 컬럼별로 집계
```

```text
color                       19
director_name              102
num_critic_for_reviews      49
duration                    15
director_facebook_likes    102
                          ... 
title_year                 106
actor_2_facebook_likes      13
imdb_score                   0
aspect_ratio               326
movie_facebook_likes         0
Length: 28, dtype: int64
```

```python
(df.isnull().mean() * 100).round(2).sort_values(ascending=False).head()  # 컬럼별 결측치 비율(%)
```

```text
gross             17.53
budget             9.85
aspect_ratio       6.63
content_rating     6.10
plot_keywords      3.09
dtype: float64
```

`isnull()`의 True(1)·False(0)를 평균 내면 결측치 비율이 된다. 흥행 수입(`gross`)은 17.5%가 비어 있다. 필기에서는 `df.isnull().mean() * 100`까지 썼고, 많이 비어 있는 컬럼을 보려고 정렬해서 앞의 5개만 남겼다.

```python
df.describe()  # 기본: 수치형 컬럼들의 집계 결과
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 16열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>num_critic_for_reviews</th><th>duration</th><th>director_facebook_likes</th><th>actor_3_facebook_likes</th><th>actor_1_facebook_likes</th><th>gross</th><th>num_voted_users</th><th>cast_total_facebook_likes</th><th>facenumber_in_poster</th><th>num_user_for_reviews</th><th>budget</th><th>title_year</th><th>actor_2_facebook_likes</th><th>imdb_score</th><th>aspect_ratio</th><th>movie_facebook_likes</th></tr></thead><tbody><tr><th class="idx">count</th><td>4867.0</td><td>4901.0</td><td>4814.0</td><td>4893.0</td><td>4909.0</td><td>4054.0</td><td>4916.0</td><td>4916.0</td><td>4903.0</td><td>4895.0</td><td>4432.0</td><td>4810.0</td><td>4903.0</td><td>4916.0</td><td>4590.0</td><td>4916.0</td></tr><tr><th class="idx">mean</th><td>137.988905</td><td>107.090798</td><td>691.014541</td><td>631.276313</td><td>6494.488491</td><td>47644514.53182</td><td>82644.924939</td><td>9579.815907</td><td>1.37732</td><td>267.668846</td><td>36547486.027527</td><td>2002.447609</td><td>1621.923516</td><td>6.437429</td><td>2.222349</td><td>7348.294142</td></tr><tr><th class="idx">std</th><td>120.239379</td><td>25.286015</td><td>2832.954125</td><td>1625.874802</td><td>15106.986884</td><td>67372553.833581</td><td>138322.162547</td><td>18164.31699</td><td>2.023826</td><td>372.934839</td><td>100242679.248947</td><td>12.453977</td><td>4011.299523</td><td>1.127802</td><td>1.40294</td><td>19206.016458</td></tr><tr><th class="idx">min</th><td>1.0</td><td>7.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>162.0</td><td>5.0</td><td>0.0</td><td>0.0</td><td>1.0</td><td>218.0</td><td>1916.0</td><td>0.0</td><td>1.6</td><td>1.18</td><td>0.0</td></tr><tr><th class="idx">25%</th><td>49.0</td><td>93.0</td><td>7.0</td><td>132.0</td><td>607.0</td><td>5019656.25</td><td>8361.75</td><td>1394.75</td><td>0.0</td><td>64.0</td><td>6000000.0</td><td>1999.0</td><td>277.0</td><td>5.8</td><td>1.85</td><td>0.0</td></tr><tr><th class="idx">50%</th><td>108.0</td><td>103.0</td><td>48.0</td><td>366.0</td><td>982.0</td><td>25043962.0</td><td>33132.5</td><td>3049.0</td><td>1.0</td><td>153.0</td><td>19850000.0</td><td>2005.0</td><td>593.0</td><td>6.6</td><td>2.35</td><td>159.0</td></tr><tr><th class="idx">75%</th><td>191.0</td><td>118.0</td><td>189.75</td><td>633.0</td><td>11000.0</td><td>61108412.75</td><td>93772.75</td><td>13616.75</td><td>2.0</td><td>320.5</td><td>43000000.0</td><td>2011.0</td><td>912.0</td><td>7.2</td><td>2.35</td><td>2000.0</td></tr><tr><th class="idx">max</th><td>813.0</td><td>511.0</td><td>23000.0</td><td>23000.0</td><td>640000.0</td><td>760505847.0</td><td>1689764.0</td><td>656730.0</td><td>43.0</td><td>5060.0</td><td>4200000000.0</td><td>2016.0</td><td>137000.0</td><td>9.5</td><td>16.0</td><td>349000.0</td></tr></tbody></table></div></div>

```python
df.describe(include=["str"]).T  # 문자열 컬럼 요약. .T: 행과 열을 바꾼다 (transpose)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 12행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>count</th><th>unique</th><th>top</th><th>freq</th></tr></thead><tbody><tr><th class="idx">color</th><td>4897</td><td>2</td><td>Color</td><td>4693</td></tr><tr><th class="idx">director_name</th><td>4814</td><td>2397</td><td>Steven Spielberg</td><td>26</td></tr><tr><th class="idx">actor_2_name</th><td>4903</td><td>3030</td><td>Morgan Freeman</td><td>18</td></tr><tr><th class="idx">genres</th><td>4916</td><td>914</td><td>Drama</td><td>233</td></tr><tr><th class="idx">actor_1_name</th><td>4909</td><td>2095</td><td>Robert De Niro</td><td>48</td></tr><tr><th class="idx">movie_title</th><td>4916</td><td>4916</td><td>Avatar</td><td>1</td></tr><tr><th class="idx">actor_3_name</th><td>4893</td><td>3519</td><td>Steve Coogan</td><td>8</td></tr><tr><th class="idx">plot_keywords</th><td>4764</td><td>4756</td><td>based on novel</td><td>4</td></tr><tr><th class="idx">movie_imdb_link</th><td>4916</td><td>4916</td><td>http://www.imdb.com/title/tt0499549/?ref_=fn_tt_tt_1</td><td>1</td></tr><tr><th class="idx">language</th><td>4902</td><td>46</td><td>English</td><td>4582</td></tr><tr><th class="idx">country</th><td>4911</td><td>65</td><td>USA</td><td>3710</td></tr><tr><th class="idx">content_rating</th><td>4616</td><td>18</td><td>R</td><td>2067</td></tr></tbody></table></div></div>

문자열 컬럼에는 `count`(값 개수), `unique`(고유값 개수), `top`(최빈값), `freq`(최빈값 빈도)가 나온다. 컬럼이 많을 때는 `.T`로 뒤집어 보면 한눈에 들어온다. `color`는 고유값이 2개(컬러/흑백)이고, `movie_title`은 4916개가 모두 달라서 영화를 구분하는 값으로 쓸 수 있다는 것을 알 수 있다.

## 컬럼 이름·행 이름

### 조회

```python
df.columns  # 컬럼 이름
```

```text
Index(['color', 'director_name', 'num_critic_for_reviews', 'duration', 'director_facebook_likes',
       'actor_3_facebook_likes', 'actor_2_name', 'actor_1_facebook_likes', 'gross', 'genres',
       'actor_1_name', 'movie_title', 'num_voted_users', 'cast_total_facebook_likes',
       'actor_3_name', 'facenumber_in_poster', 'plot_keywords', 'movie_imdb_link',
       'num_user_for_reviews', 'language', 'country', 'content_rating', 'budget', 'title_year',
       'actor_2_facebook_likes', 'imdb_score', 'aspect_ratio', 'movie_facebook_likes'],
      dtype='str')
```

```python
print(df.columns[0])
print(df.columns[[1, 6, 7]])  # Index도 indexing, fancy indexing, slicing 가능
```

```text
color
Index(['director_name', 'actor_2_name', 'actor_1_facebook_likes'], dtype='str')
```

```python
df.index  # 행 이름
```

```text
RangeIndex(start=0, stop=4916, step=1)
```

컬럼 이름은 나중에 조회할 때 쓰도록 변수에 저장해 두면 편하다.

### 통째로 바꾸기

`columns`, `index` 속성에 새 리스트를 대입하면 전체가 바뀐다. 하지만 `df.columns[1] = "새이름"`처럼 **일부만 바꾸는 것은 안 된다.**

```python
grade = pd.read_csv("saved_data/grade2.csv")
grade.columns = ["ID", "국어", "영어"]      # 컬럼명 전체 변경
grade.index = [f"{i+1}번" for i in range(5)]  # 행 이름 전체 변경
grade
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>ID</th><th>국어</th><th>영어</th></tr></thead><tbody><tr><th class="idx">1번</th><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">2번</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">3번</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">4번</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">5번</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

### 일부만 바꾸기: rename()

```python
DataFrame객체.rename(index={기존: 새이름}, columns={기존: 새이름}, inplace=False)
```

```python
new_columns = {"ID": "학생 아이디", "국어": "국어1"}
new_index = {"1번": "일번", "3번": "삼번"}

grade.rename(index=new_index, columns=new_columns, inplace=True)
grade
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>학생 아이디</th><th>국어1</th><th>영어</th></tr></thead><tbody><tr><th class="idx">일번</th><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">2번</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">삼번</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">4번</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">5번</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

`columns=`만 주면 컬럼명만, `index=`만 주면 행 이름만 바뀐다. 딕셔너리에 없는 이름은 그대로 둔다.

## 컬럼 ↔ index: set_index, reset_index

| 메소드 | 하는 일 |
|---|---|
| `set_index(컬럼이름)` | 그 컬럼을 **행 이름(index)** 으로 만든다. 컬럼 목록에서는 빠진다 |
| `reset_index()` | index를 **첫 번째 컬럼**으로 되돌리고 0부터 순번 index를 붙인다 |
| `reset_index(drop=True)` | 기존 index를 버리고 순번 index로 바꾼다 |

행을 구분하는 값(학생 아이디, 상품 코드 등)을 가진 컬럼은 index로 빼 두면 `loc["id-3"]`처럼 이름으로 행을 찾을 수 있다.

```python
grade2 = grade.set_index("학생 아이디")
grade2
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>학생 아이디</th><th>국어1</th><th>영어</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td></tr><tr><th class="idx">id-2</th><td>50</td><td>80</td></tr><tr><th class="idx">id-3</th><td>70</td><td>100</td></tr><tr><th class="idx">id-4</th><td>60</td><td>100</td></tr><tr><th class="idx">id-5</th><td>90</td><td>40</td></tr></tbody></table></div></div>

```python
grade2.reset_index()  # index를 컬럼으로 복원
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>학생 아이디</th><th>국어1</th><th>영어</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

```python
grade2.reset_index(drop=True)  # index name을 버린다
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>국어1</th><th>영어</th></tr></thead><tbody><tr><th class="idx">0</th><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>90</td><td>40</td></tr></tbody></table></div></div>

### reset_index(drop=True)가 필요한 순간

행을 골라내면 원래 행 이름이 그대로 따라온다. 순번이 띄엄띄엄해지므로 다시 0부터 매기고 싶을 때 쓴다.

```python
grade3 = grade2.reset_index(drop=True)
grade3.iloc[[0, 3, 4]]  # 골라낸 행: index 0, 3, 4
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>국어1</th><th>영어</th></tr></thead><tbody><tr><th class="idx">0</th><td>100</td><td>90</td></tr><tr><th class="idx">3</th><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>90</td><td>40</td></tr></tbody></table></div></div>

```python
grade3.iloc[[0, 3, 4]].reset_index(drop=True)  # 0, 1, 2로 다시 매김
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>국어1</th><th>영어</th></tr></thead><tbody><tr><th class="idx">0</th><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>60</td><td>100</td></tr><tr><th class="idx">2</th><td>90</td><td>40</td></tr></tbody></table></div></div>

## 행·열 삭제

```python
DataFrame객체.drop(index=행이름들, columns=열이름들, inplace=False)
```

```python
grade.drop(index=["일번", "삼번"])  # 행 이름으로 삭제
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>학생 아이디</th><th>국어1</th><th>영어</th></tr></thead><tbody><tr><th class="idx">2번</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">4번</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">5번</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

```python
grade.drop(columns=["국어1"])  # 열 이름으로 삭제
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>학생 아이디</th><th>영어</th></tr></thead><tbody><tr><th class="idx">일번</th><td>id-1</td><td>90</td></tr><tr><th class="idx">2번</th><td>id-2</td><td>80</td></tr><tr><th class="idx">삼번</th><td>id-3</td><td>100</td></tr><tr><th class="idx">4번</th><td>id-4</td><td>100</td></tr><tr><th class="idx">5번</th><td>id-5</td><td>40</td></tr></tbody></table></div></div>

```python
grade.drop(labels=["일번"], axis=0)  # labels + axis 방식. axis=0: 행, axis=1: 열
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>학생 아이디</th><th>국어1</th><th>영어</th></tr></thead><tbody><tr><th class="idx">2번</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">삼번</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">4번</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">5번</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

`drop()`도 기본은 원본을 바꾸지 않는다. 결과를 변수에 받거나 `inplace=True`를 준다.

### 중복 행 제거: drop_duplicates()

모든 컬럼 값이 같은 행 중 **첫 번째 행만** 남긴다. `subset=`으로 중복 판단 기준 컬럼을 정할 수 있다.

```python
d = pd.DataFrame(
    [[1, 1, 1], [2, 2, 2], [1, 1, 1], [1, 3, 2], [2, 2, 1], [1, 1, 1], [1, 1, 5]],
    columns=["c1", "c2", "c3"]
)
d
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 7행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>c1</th><th>c2</th><th>c3</th></tr></thead><tbody><tr><th class="idx">0</th><td>1</td><td>1</td><td>1</td></tr><tr><th class="idx">1</th><td>2</td><td>2</td><td>2</td></tr><tr><th class="idx">2</th><td>1</td><td>1</td><td>1</td></tr><tr><th class="idx">3</th><td>1</td><td>3</td><td>2</td></tr><tr><th class="idx">4</th><td>2</td><td>2</td><td>1</td></tr><tr><th class="idx">5</th><td>1</td><td>1</td><td>1</td></tr><tr><th class="idx">6</th><td>1</td><td>1</td><td>5</td></tr></tbody></table></div></div>

```python
d.drop_duplicates()  # 세 컬럼이 모두 같은 행 제거 → 2, 5번 행 제거
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>c1</th><th>c2</th><th>c3</th></tr></thead><tbody><tr><th class="idx">0</th><td>1</td><td>1</td><td>1</td></tr><tr><th class="idx">1</th><td>2</td><td>2</td><td>2</td></tr><tr><th class="idx">3</th><td>1</td><td>3</td><td>2</td></tr><tr><th class="idx">4</th><td>2</td><td>2</td><td>1</td></tr><tr><th class="idx">6</th><td>1</td><td>1</td><td>5</td></tr></tbody></table></div></div>

```python
d.drop_duplicates(subset=["c1", "c2"])  # c1, c2만 같아도 중복으로 본다
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>c1</th><th>c2</th><th>c3</th></tr></thead><tbody><tr><th class="idx">0</th><td>1</td><td>1</td><td>1</td></tr><tr><th class="idx">1</th><td>2</td><td>2</td><td>2</td></tr><tr><th class="idx">3</th><td>1</td><td>3</td><td>2</td></tr></tbody></table></div></div>

기준을 좁히면 더 많은 행이 중복으로 처리된다. `(1, 1)` 조합은 0번 행만, `(2, 2)` 조합은 1번 행만 남았다.

## 열 추가

| 방법 | 위치 |
|---|---|
| `df["새열이름"] = 값` | 마지막 열로 추가 |
| `df.insert(위치, "새열이름", 값)` | 지정한 위치에 삽입 |

- 값을 하나만 대입하면 모든 행에 같은 값이 들어간다.
- 행마다 다른 값을 넣으려면 행 수와 같은 개수의 값을 리스트로 준다.
- 이미 있는 컬럼 이름에 대입하면 추가가 아니라 **값 변경**이 된다.

```python
grade = pd.read_csv("saved_data/grade2.csv")
grade.set_index("id", inplace=True)

grade.loc["id-6"] = [70, 100]  # 행 추가: 없는 index 이름에 대입
grade["math"] = 100                               # 모든 행에 같은 값
grade["history"] = [100, 90, 95, 80, 70, 95]      # 행마다 다른 값
grade
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>english</th><th>math</th><th>history</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>100</td><td>100</td></tr><tr><th class="idx">id-2</th><td>50</td><td>80</td><td>100</td><td>90</td></tr><tr><th class="idx">id-3</th><td>70</td><td>100</td><td>100</td><td>95</td></tr><tr><th class="idx">id-4</th><td>60</td><td>100</td><td>100</td><td>80</td></tr><tr><th class="idx">id-5</th><td>90</td><td>40</td><td>100</td><td>70</td></tr><tr><th class="idx">id-6</th><td>70</td><td>100</td><td>100</td><td>95</td></tr></tbody></table></div></div>

```python
grade["math"] = 80  # 있는 컬럼에 대입 → 전체 값 변경
grade.insert(1, "korean2", 90)                         # 1번 위치에 삽입
grade.insert(4, "math2", [90, 80, 100, 65, 70, 100])
grade
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 6열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>90</td><td>80</td><td>90</td><td>100</td></tr><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td></tr><tr><th class="idx">id-4</th><td>60</td><td>90</td><td>100</td><td>80</td><td>65</td><td>80</td></tr><tr><th class="idx">id-5</th><td>90</td><td>90</td><td>40</td><td>80</td><td>70</td><td>70</td></tr><tr><th class="idx">id-6</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td></tr></tbody></table></div></div>

행 추가도 같은 원리다. `df.loc[없는 index이름] = 값`이면 새 행이 생기고, 있는 이름이면 그 행의 값이 바뀐다.

## 파생변수

**기존 열들의 값으로 만든 새 열**을 파생변수라고 한다. 원소 단위 연산(벡터화)으로 한 번에 계산한다.

```python
grade["총점"] = (grade["korean"] + grade["korean2"] + grade["english"]
                 + grade["math"] + grade["math2"] + grade["history"])
grade["평균"] = round(grade["총점"] / 6, 2)  # round(값, 자릿수): 자릿수 이하에서 반올림
grade
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>총점</th><th>평균</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>90</td><td>80</td><td>90</td><td>100</td><td>550</td><td>91.67</td></tr><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr><tr><th class="idx">id-4</th><td>60</td><td>90</td><td>100</td><td>80</td><td>65</td><td>80</td><td>475</td><td>79.17</td></tr><tr><th class="idx">id-5</th><td>90</td><td>90</td><td>40</td><td>80</td><td>70</td><td>70</td><td>440</td><td>73.33</td></tr><tr><th class="idx">id-6</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr></tbody></table></div></div>

### 행 방향 집계와 axis

과목을 하나하나 더하지 않고 `sum(axis=1)`로 행마다 합칠 수도 있다.

| axis | 집계 방향 |
|---|---|
| `0` (기본) | 열마다 집계 (위에서 아래로) → 결과의 이름이 컬럼명 |
| `1` | 행마다 집계 (왼쪽에서 오른쪽으로) → 결과의 이름이 index |

필기에서 겪은 함정이 하나 있다. `총점`, `평균`을 이미 추가한 상태에서 `sum(axis=1)`을 하면 그 두 열까지 더해진다.

```python
grade.sum(axis=1)  # 총점·평균 열까지 합쳐진다
```

```text
id
id-1    1191.67
id-2    1018.33
id-3    1159.17
id-4    1029.17
id-5     953.33
id-6    1159.17
dtype: float64
```

`id-1`의 과목 합은 550인데 `550 + 550(총점) + 91.67(평균) = 1191.67`이 나왔다. 집계할 열만 남긴 뒤 계산해야 한다.

```python
grade2 = grade.drop(columns=["총점", "평균"])  # 과목 열만 남기기
grade2["total"] = grade2.sum(axis=1)
grade2["avg"] = round(grade2.drop(columns="total").mean(axis=1), 2)
grade2
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>korean2</th><th>english</th><th>math</th><th>math2</th><th>history</th><th>total</th><th>avg</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td><td>90</td><td>80</td><td>90</td><td>100</td><td>550</td><td>91.67</td></tr><tr><th class="idx">id-2</th><td>50</td><td>90</td><td>80</td><td>80</td><td>80</td><td>90</td><td>470</td><td>78.33</td></tr><tr><th class="idx">id-3</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr><tr><th class="idx">id-4</th><td>60</td><td>90</td><td>100</td><td>80</td><td>65</td><td>80</td><td>475</td><td>79.17</td></tr><tr><th class="idx">id-5</th><td>90</td><td>90</td><td>40</td><td>80</td><td>70</td><td>70</td><td>440</td><td>73.33</td></tr><tr><th class="idx">id-6</th><td>70</td><td>90</td><td>100</td><td>80</td><td>100</td><td>95</td><td>535</td><td>89.17</td></tr></tbody></table></div></div>

필기의 원래 코드는 `total`, `avg`를 먼저 계산해 변수에 담아 두고 나서 열로 추가했기 때문에 결과가 맞았다. 그 뒤에 `round(grade2.mean(axis=1), 2)`를 한 번 더 실행했을 때는 `total`, `avg` 열까지 평균에 들어가 148.96 같은 값이 나왔다. 열을 추가한 뒤의 행 방향 집계는 어떤 열이 포함되는지 확인해야 한다.

### 조건으로 파생변수 만들기

**평균 80 미만이면 False, 이상이면 True인 '통과여부' 열 추가**

```python
grade2["통과여부"] = ~(grade2["avg"] < 80)
grade2[["avg", "통과여부"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>avg</th><th>통과여부</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>91.67</td><td>True</td></tr><tr><th class="idx">id-2</th><td>78.33</td><td>False</td></tr><tr><th class="idx">id-3</th><td>89.17</td><td>True</td></tr><tr><th class="idx">id-4</th><td>79.17</td><td>False</td></tr><tr><th class="idx">id-5</th><td>73.33</td><td>False</td></tr><tr><th class="idx">id-6</th><td>89.17</td><td>True</td></tr></tbody></table></div></div>

`~(평균 < 80)`은 `평균 >= 80`과 같다. 비교 결과(bool Series)를 그대로 열로 넣었다.

**합격·불합격을 문자열로 넣기**

Python의 `"합격" if 조건 else "불합격"`은 값 하나에만 쓸 수 있어서 Series 전체에는 쓸 수 없다. NumPy의 `np.where(조건, 참일때값, 거짓일때값)`을 쓴다.

```python
grade2["합격여부"] = np.where(grade2["avg"] >= 80, "합격", "불합격")
grade2[["avg", "통과여부", "합격여부"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>avg</th><th>통과여부</th><th>합격여부</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>91.67</td><td>True</td><td>합격</td></tr><tr><th class="idx">id-2</th><td>78.33</td><td>False</td><td>불합격</td></tr><tr><th class="idx">id-3</th><td>89.17</td><td>True</td><td>합격</td></tr><tr><th class="idx">id-4</th><td>79.17</td><td>False</td><td>불합격</td></tr><tr><th class="idx">id-5</th><td>73.33</td><td>False</td><td>불합격</td></tr><tr><th class="idx">id-6</th><td>89.17</td><td>True</td><td>합격</td></tr></tbody></table></div></div>

## 정리

| 하고 싶은 일 | 방법 |
|---|---|
| 데이터셋 훑어보기 | `shape`, `head()`, `info()`, `isnull().sum()`, `describe()` |
| 이름 전체 변경 | `df.columns = [...]`, `df.index = [...]` |
| 이름 일부 변경 | `df.rename(columns={...}, index={...})` |
| 컬럼 ↔ index | `set_index("컬럼")`, `reset_index(drop=)` |
| 삭제 | `drop(index=..., columns=...)`, `drop_duplicates(subset=)` |
| 열 추가 | `df["새열"] = 값`, `df.insert(위치, "새열", 값)` |
| 행 추가 | `df.loc["새이름"] = 값들` |
| 조건 파생변수 | `np.where(조건, 참값, 거짓값)` |

- 새 데이터는 `info()`와 `isnull().sum()`으로 타입과 결측치부터 확인한다.
- `axis=0`은 열마다, `axis=1`은 행마다 집계한다.
- 파생변수를 추가한 뒤 행 방향으로 집계하면 그 열까지 들어간다.
