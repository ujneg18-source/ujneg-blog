---
title: "Matplotlib 주요 그래프: 선·산점도·막대·파이·히스토그램·상자"
description: "삼성전자·삼성바이오로직스 주가로 선 그래프와 이중 Y축을, 다이아몬드 데이터로 산점도와 상관계수를, 강수량·브라우저 점유율·팁 데이터로 막대·파이·히스토그램·상자 그래프를 그려 보며 그래프마다 언제 쓰는지 정리합니다."
category: 'Tech'
subcategory: 'Data Analysis'
series: '데이터 시각화'
seriesOrder: 2
originalNotebook: "02_matplotlib_주요그래프.ipynb"
tags: ["Python","Matplotlib","Visualization"]
date: 2026-05-07
---

> SKN31 데이터 분석 실습 노트북 `02_matplotlib_주요그래프.ipynb`의 필기를 바탕으로 정리했습니다.
> 노트북은 엑셀 파일을 읽는 셀에서 `openpyxl`이 없어 멈춘 뒤로 실행되지 않은 셀이 많았습니다. 그래서 필기 순서대로 다시 실행한 결과를 실었습니다(matplotlib 3.10, pandas 2.3). `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

| 그래프 | 함수 | 언제 쓰나 |
|---|---|---|
| 선 그래프 | `plot()` | 시간에 따른 **변화**(시계열) |
| 산점도 | `scatter()` | 두 변수의 **상관관계**, 군집 |
| 막대 그래프 | `bar()`, `barh()` | 범주별 **수량 비교** |
| 파이 차트 | `pie()` | 전체에서 각 범주가 차지하는 **비율** |
| 히스토그램 | `hist()` | 연속형 값의 **분포**(구간별 빈도) |
| 상자 그래프 | `boxplot()` | 분포 요약과 **이상치** |

## 선 그래프 (Line plot)

- 점과 점을 선으로 연결한 그래프다(꺾은선 그래프).
- 시간의 흐름에 따른 **변화**를 표현할 때 많이 쓴다(시계열).
- `plot([x], y)`
  - 1번 인수는 x값(생략 가능), 2번 인수는 y값이다.
  - 인수가 하나면 y값으로 쓰고, x는 `0 ~ len(y)-1`이 된다.
  - x와 y의 원소 개수는 같아야 한다.
- 한 axes에 여러 선을 그리려면 `plot()`을 여러 번 호출한다.
- 선 스타일은 `linestyle`로 바꾼다. ([선 스타일 목록](https://matplotlib.org/stable/gallery/lines_bars_and_markers/linestyles.html))

```python
# 선스타일
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(1, 10, num=10)
plt.figure(figsize=(8, 6))
plt.plot(x, x + 3, linestyle="--")
plt.plot(x, x + 2, linestyle="-.")
plt.plot(x, x + 1, linestyle=":")
plt.plot(x, x, marker=".")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-1.png)

### 활용: 주식 가격 변화

삼성전자, 삼성바이오로직스의 2024~2025년 일별 주가 데이터다.

```python
import pandas as pd

convert_int_cols = ["Close", "High", "Low", "Open"]
# dict: {값 변경할 컬럼: 변경 처리 함수}
converters = {
    col: lambda x: int(float(x)) if x not in ("", "NaN") else pd.NA
    for col in convert_int_cols
}
df_electron = pd.read_csv(
    "data/samsung_electronics_2024-2025.csv",
    parse_dates=["Date"],  # Date 컬럼을 날짜 형식으로 변환
    index_col="Date",      # Date 컬럼을 index로 지정
    converters=converters,
)
df_bio = pd.read_csv(
    "data/samsung_biologics_2024-2025.csv",
    parse_dates=["Date"],
    index_col="Date",
    converters=converters,
)
df_electron.shape, df_bio.shape
```

```text
((434, 5), (434, 5))
```

`converters`는 컬럼을 읽을 때 값마다 함수를 적용한다. 원본 CSV의 가격이 `76984.0` 같은 실수 문자열이라 정수로 바꾸고, 빈 값은 결측치로 둔다.

```python
# 컬럼명 변경 - 소문자로
df_electron.columns = [col.lower() for col in df_electron.columns]
df_bio.columns = [col.lower() for col in df_bio.columns]
df_electron.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 5열</div><div class="sql-result-scroll"><table><thead><tr><th>Date</th><th>close</th><th>high</th><th>low</th><th>open</th><th>volume</th></tr></thead><tbody><tr><th class="idx">2024-01-02 00:00:00</th><td>76984</td><td>77177</td><td>75630</td><td>75630</td><td>17142847</td></tr><tr><th class="idx">2024-01-03 00:00:00</th><td>74469</td><td>76210</td><td>74469</td><td>75920</td><td>21753644</td></tr><tr><th class="idx">2024-01-04 00:00:00</th><td>74082</td><td>74759</td><td>73599</td><td>73599</td><td>15324439</td></tr><tr><th class="idx">2024-01-05 00:00:00</th><td>74082</td><td>74566</td><td>73889</td><td>74179</td><td>11304316</td></tr><tr><th class="idx">2024-01-08 00:00:00</th><td>73986</td><td>74953</td><td>73889</td><td>74469</td><td>11088724</td></tr></tbody></table></div></div>

```python
df_bio.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 5열</div><div class="sql-result-scroll"><table><thead><tr><th>Date</th><th>close</th><th>high</th><th>low</th><th>open</th><th>volume</th></tr></thead><tbody><tr><th class="idx">2024-01-02 00:00:00</th><td>789000</td><td>800000</td><td>756000</td><td>760000</td><td>199238</td></tr><tr><th class="idx">2024-01-03 00:00:00</th><td>787000</td><td>793000</td><td>776000</td><td>782000</td><td>87350</td></tr><tr><th class="idx">2024-01-04 00:00:00</th><td>770000</td><td>784000</td><td>759000</td><td>782000</td><td>77785</td></tr><tr><th class="idx">2024-01-05 00:00:00</th><td>756000</td><td>769000</td><td>753000</td><td>765000</td><td>60943</td></tr><tr><th class="idx">2024-01-08 00:00:00</th><td>749000</td><td>763000</td><td>746000</td><td>763000</td><td>60440</td></tr></tbody></table></div></div>

```python
## 삼성전자 날짜별 종가의 변화
plt.figure(figsize=(15, 5))
plt.plot(df_electron.index, df_electron["close"])

# 눈금(ticks) 지정 - xticks(): X축 눈금, yticks(): Y축 눈금
plt.yticks(
    range(50000, 100001, 5000),                                   # 눈금의 위치
    labels=[format(v, ",") for v in range(50000, 100001, 5000)],  # 눈금 Label 값
)
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-2.png)

`yticks()`의 첫 인수는 눈금을 놓을 **위치**, `labels`는 그 자리에 쓸 **글자**다. `format(v, ",")`로 천 단위 쉼표를 넣었다.

> **보충** 필기의 주석은 "종가의 변화율"이었는데 그린 건 종가 자체다. 변화율(전날 대비 %)을 그리려면 `df_electron["close"].pct_change() * 100`을 그린다.

시가와 종가를 같이 그린 셀이다.

```python
plt.figure(figsize=(15, 4))
plt.plot(df_electron.index, df_electron["open"], label="시가")
plt.plot(df_electron.index, df_electron["close"], label="종가", alpha=0.5)

plt.title("황사 주의보, 경보 발령횟수 변화 흐름")
plt.legend()
# plt.xlim(pd.Timestamp("2024-01-01"), pd.Timestamp("2024-03-31"))  # x축의 범위 지정
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-3.png)

> **보충** 제목이 주가 그래프와 맞지 않는다. `data` 폴더에 있는 `서울시 연도별 황사 경보발령 현황.csv` 예제를 그리던 코드를 복사해 와서 제목을 안 바꾼 것으로 보인다. `plt.title("삼성전자 시가와 종가")`가 맞다. 아래 필기의 "최대농도와 관측일수"도 같은 황사 예제에서 남은 말이다.

### 값의 범위가 다른 두 데이터를 한 그래프에

선 그래프는 축의 범위를 데이터의 최소값~최대값에 맞춰 자동으로 잡는다. 범위 차이가 큰 두 데이터를 한 subplot에 그리면 **범위가 작은 쪽은 거의 직선처럼** 보인다.

```python
plt.figure(figsize=(15, 4))
plt.plot(df_electron.index, df_electron["close"], label="삼성전자")
plt.plot(df_bio.index, df_bio["close"], label="삼성 바이오")
plt.legend()
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-4.png)

```python
format(df_electron["close"].max().item(), ","), format(df_bio["close"].max().item(), ",")
```

```text
('97,900', '1,185,000')
```

삼성전자 최고가는 10만 원이 안 되고 삼성바이오로직스는 100만 원이 넘는다. y축이 0~120만 원으로 잡혀서 삼성전자 선은 바닥에 깔린 직선이 됐다.

> 한 axes에 여러 데이터를 그리면, 둘을 **합친** 최소값과 최대값을 기준으로 축의 범위를 잡는다.

**두 데이터의 변화 추이(Trend)를 비교하는 게 목적**이라면 양쪽 축을 따로 쓰면 된다.

| 상황 | 메소드 | 만드는 것 |
|---|---|---|
| X축 공유, Y축 두 개 | `ax.twinx()` | 같은 X축을 쓰는 **오른쪽 Y축** |
| Y축 공유, X축 두 개 | `ax.twiny()` | 같은 Y축을 쓰는 **위쪽 X축**. 시간·구간 단위가 다른 데이터를 비교할 때 |

```python
# X 축을 공유하고 y축은 따로 생성
plt.figure(figsize=(15, 4))

ax1 = plt.gca()    # 그래프를 그릴 Axes 객체 (y: 왼쪽)
ax2 = ax1.twinx()  # ax1과 x축을 같이 쓰는 Axes 객체 (y: 오른쪽)

ax1.plot(df_electron.index, df_electron["close"], label="삼성전자")
ax1.set_xlabel("년도")
ax1.set_ylabel("가격(원)")
ax1.legend(bbox_to_anchor=(1.02, 1.01), loc="upper left")

ax2.plot(df_bio.index, df_bio["close"], color="red", label="삼성바이오")
ax2.set_ylabel("가격(원)")
ax2.legend(bbox_to_anchor=(1.02, 0.94), loc="upper left")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-5.png)

이제 두 선의 움직임이 다 보인다. 대신 **왼쪽 축은 삼성전자, 오른쪽 축은 삼성바이오** 기준이라, 두 선이 겹치는 위치는 실제 가격이 같다는 뜻이 아니다. 축 레이블을 둘 다 "가격(원)"으로 쓰면 헷갈리니 "삼성전자(원)", "삼성바이오(원)"처럼 구분해 주는 게 좋다.

### 범례(Legend) 위치

`legend()`로 설정한다.

**1. axes 안쪽의 정해진 위치**

| 위/아래 | 좌/우 | 그 밖 |
|---|---|---|
| `upper`, `center`, `lower` | `left`, `center`, `right` | `center`(정가운데), `best`(알아서 최적의 위치) |

`"upper right"`처럼 위아래와 좌우를 조합한다.

**2. 원하는 위치**

- `bbox_to_anchor=(x, y)`: 범례 상자(bbox)를 놓을 위치. axes 기준 상대 좌표로, 왼쪽 아래가 `(0, 0)`, 오른쪽 위가 `(1, 1)`이다.
- `loc="위아래 좌우"`: 범례 상자의 **어느 꼭짓점**을 그 위치에 맞출지.
  - 예: `bbox_to_anchor=(1.02, 1.01), loc="upper left"` → 범례 상자의 좌상단을 axes 오른쪽 바깥(x=1.02) 맨 위에 맞춘다. 위 그래프에서 범례가 그래프 밖 오른쪽에 붙은 이유다.

## 산점도 (Scatter Plot)

- x, y 좌표평면에 관측값을 점으로 찍는 그래프다(산포도).
- 변수(Feature) 간의 **상관관계**나 관측값들의 **군집**을 확인할 수 있다.
- `scatter(x, y)`: x와 y를 **모두** 넘겨야 하고, 원소 수가 같아야 한다.
  - `c`/`color`: 색. x, y와 같은 개수의 Iterable을 넣으면 점마다 색을 다르게 줄 수 있다.
  - `s`: 점 크기
  - `marker`: 점 모양 ([marker 목록](https://matplotlib.org/stable/api/markers_api.html))

```python
df = pd.read_csv("data/diamonds.csv")
print(df.shape)
df.head()
```

```text
(53940, 10)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 10열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>carat</th><th>cut</th><th>color</th><th>clarity</th><th>depth</th><th>table</th><th>price</th><th>x</th><th>y</th><th>z</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.23</td><td>Ideal</td><td>E</td><td>SI2</td><td>61.5</td><td>55.0</td><td>326</td><td>3.95</td><td>3.98</td><td>2.43</td></tr><tr><th class="idx">1</th><td>0.21</td><td>Premium</td><td>E</td><td>SI1</td><td>59.8</td><td>61.0</td><td>326</td><td>3.89</td><td>3.84</td><td>2.31</td></tr><tr><th class="idx">2</th><td>0.23</td><td>Good</td><td>E</td><td>VS1</td><td>56.9</td><td>65.0</td><td>327</td><td>4.05</td><td>4.07</td><td>2.31</td></tr><tr><th class="idx">3</th><td>0.29</td><td>Premium</td><td>I</td><td>VS2</td><td>62.4</td><td>58.0</td><td>334</td><td>4.2</td><td>4.23</td><td>2.63</td></tr><tr><th class="idx">4</th><td>0.31</td><td>Good</td><td>J</td><td>SI2</td><td>63.3</td><td>58.0</td><td>335</td><td>4.34</td><td>4.35</td><td>2.75</td></tr></tbody></table></div></div>

다이아몬드 53,940개의 캐럿(carat), 가격(price) 등이 들어 있다.

```python
plt.scatter(
    df["carat"],  # x축에 들어갈 값
    df["price"],  # y축에 들어갈 값. x, y의 같은 index 위치에 점을 찍는다
    alpha=0.1,    # 투명도. (투명) 0 ~ 1 (농도 100%)
)
plt.xlabel("가격")
plt.ylabel("캐럿")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-6.png)

점이 5만 개가 넘어서 `alpha=0.1`로 투명하게 했다. 점이 많이 겹친 곳일수록 진하게 보여서 어디에 데이터가 몰려 있는지 알 수 있다.

> **보충 · 축 이름이 바뀌어 있다**
> x에 `carat`, y에 `price`를 넣었는데 레이블은 x가 "가격", y가 "캐럿"이다. 둘을 바꿔야 한다. 산점도는 축 레이블이 틀리면 해석이 정반대가 되니 주의한다.

```python
plt.scatter(df["carat"], df["price"], alpha=0.1, s=5)
plt.xlabel("캐럿(carat)")
plt.ylabel("가격(price, $)")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-7.png)

캐럿이 클수록 가격이 오르는 **양의 상관관계**가 보인다. 숫자로 확인하려면 상관계수를 계산한다.

```python
# 상관계수 계산
df[["price", "carat"]].corr()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>price</th><th>carat</th></tr></thead><tbody><tr><th class="idx">price</th><td>1.0</td><td>0.921591</td></tr><tr><th class="idx">carat</th><td>0.921591</td><td>1.0</td></tr></tbody></table></div></div>

> **상관계수**
> 두 변수 간의 상관관계(비례/반비례)를 수치로 계산한 값이다. -1 ~ 1 사이다.
> - 양의 상관관계: 0 ~ 1 (비례), 음의 상관관계: -1 ~ 0 (반비례)
> - 절대값이 1에 가까울수록 강하고 0에 가까울수록 약하다.
>
> | 절대값 | 해석 |
> |---|---|
> | 0.7 ~ 1 | 아주 강한 상관관계 |
> | 0.3 ~ 0.7 | 강한 상관관계 |
> | 0.1 ~ 0.3 | 약한 상관관계 |
> | 0 ~ 0.1 | 관계없다 |

carat과 price는 0.92로 아주 강한 양의 상관관계다. depth(깊이)와 table(윗면 너비)은 어떨까.

```python
plt.scatter(df["depth"], df["table"], alpha=0.1)
plt.xlabel("depth")
plt.ylabel("table")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-8.png)

```python
df[["depth", "table"]].corr()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>depth</th><th>table</th></tr></thead><tbody><tr><th class="idx">depth</th><td>1.0</td><td>-0.295779</td></tr><tr><th class="idx">table</th><td>-0.295779</td><td>1.0</td></tr></tbody></table></div></div>

-0.30으로 약한~강한 경계의 **음의** 상관관계다. 그래프에서도 depth가 커질수록 table이 조금 작아지는 경향이 흐릿하게 보인다.

## 막대 그래프 (Bar plot)

- 수량이나 값의 **크기를 비교**하려고 막대로 나타낸 그래프다.
- 범주형 데이터의 class별 개수를 확인할 때 쓴다.

| 함수 | 방향 | 1번 인수 | 2번 인수 |
|---|---|---|---|
| `bar(x, height)` | 수직 | 분류값(x) | 막대 높이(수량) |
| `barh(y, width)` | 수평 | 분류값(y) | 막대 너비(수량) |

```python
x = ["귤", "사과", "배"]
y = [100, 40, 70]

plt.figure(figsize=(10, 4))
plt.subplot(1, 2, 1)  # 수직 막대그래프
plt.bar(x, y)
plt.ylabel("수량")

plt.subplot(1, 2, 2)  # 수평 막대그래프
plt.barh(x, y)
plt.xlabel("수량")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-9.png)

### 계절별 강수량

엑셀 파일을 읽으려면 `openpyxl`이 필요하다. 노트북에서는 이게 설치돼 있지 않아 에러가 났다.

```text
ImportError: `Import openpyxl` failed.  Use pip or conda to install the openpyxl package.
```

```bash
pip install openpyxl   # .xlsx 파일
pip install xlrd       # .xls 파일 (옛 엑셀 형식)
```

```python
df = pd.read_excel("data/강수량.xlsx", index_col="계절")
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 9열</div><div class="sql-result-scroll"><table><thead><tr><th>계절</th><th>2009</th><th>2010</th><th>2011</th><th>2012</th><th>2013</th><th>2014</th><th>2015</th><th>2016</th><th>2017</th></tr></thead><tbody><tr><th class="idx">봄</th><td>231.3</td><td>302.9</td><td>256.9</td><td>256.5</td><td>264.3</td><td>215.9</td><td>223.2</td><td>312.8</td><td>118.6</td></tr><tr><th class="idx">여름</th><td>752.0</td><td>692.6</td><td>1053.6</td><td>770.6</td><td>567.5</td><td>599.8</td><td>387.1</td><td>446.2</td><td>609.7</td></tr><tr><th class="idx">가을</th><td>143.1</td><td>307.6</td><td>225.5</td><td>363.5</td><td>231.2</td><td>293.1</td><td>247.7</td><td>381.6</td><td>172.5</td></tr><tr><th class="idx">겨울</th><td>142.3</td><td>98.7</td><td>45.6</td><td>139.3</td><td>59.9</td><td>76.9</td><td>109.1</td><td>108.1</td><td>75.6</td></tr></tbody></table></div></div>

컬럼 이름이 문자열 `"2009"`가 아니라 **정수** `2009`라서 `df[2009]`로 조회한다.

```python
plt.bar(df.index, df[2009])
plt.plot(df.index, df[2009], color="red")  # 선그래프: 변화 흐름(추세)
plt.title("2009년 계절별 강수량 비교")         # 막대그래프: 단순 수량적 비교

# 막대의 값들을 출력 - text(x위치, y위치, str): (x, y) 위치에 str을 쓴다
for x, y in enumerate(df[2009]):
    plt.text(x - 0.1, y + 5, str(y))
plt.ylim(0, 900)
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-10.png)

막대의 x 위치는 범주 순서대로 0, 1, 2, 3이다. 그래서 `enumerate()`로 받은 순번을 `text()`의 x로 썼다. `-0.1`, `+5`는 글자가 막대 정중앙 위에 오도록 살짝 옮긴 값이다.

> **보충** matplotlib 3.4부터는 `bar()`가 반환한 막대에 `plt.bar_label(막대)`를 쓰면 위치 계산 없이 값을 붙일 수 있다.

```python
bars = plt.bar(df.index, df[2009])
plt.bar_label(bars)
plt.title("2009년 계절별 강수량")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-11.png)

수평 막대로 연도별 여름 강수량을 비교한 셀이다.

```python
# 년도별 여름 강수량 비교
plt.barh(df.columns, df.loc["여름"])
plt.title("년도별 여름 강수량 비교")
plt.yticks(df.columns)
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-12.png)

연도가 정수라 y축이 숫자 축으로 잡혀서 `yticks(df.columns)`로 모든 연도를 눈금에 표시했다. 2011년 여름이 1,000mm를 넘어 가장 많다.

## 파이 차트 (Pie chart)

- 전체에서 각 범주(Category)가 차지하는 **비율**을 나타낸다.
- `pie(x, labels)`
  - `x`: 값. 값들의 합을 100으로 보고 비율을 계산해 크기를 정한다.
  - `labels`: 각 값의 이름
  - `autopct`: 조각 안에 표시할 비율의 형식. `%` 포맷 문자열로 쓴다(`%f` 실수, `%d` 정수, `%%` `%` 기호).
  - `explode`: 조각을 중심에서 떼어 낼 거리. 강조할 때 쓴다.

```python
x = ["귤", "사과", "배"]
y = [100, 40, 70]
plt.pie(
    y, labels=x,
    autopct="%.2f%%",     # 각 조각의 비율 값 출력 형식
    explode=[0, 0.1, 0],  # 사과 조각만 0.1만큼 떼어 낸다
    shadow=True,
)
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-13.png)

### 한국 웹브라우저 점유율

[인터넷 트렌드](https://www.koreanextweb.kr/front/stats/browser/browserUseStats.do)의 브라우저 점유율 데이터다. `.xls`(옛 엑셀 형식)라 `xlrd`가 필요하다.

```python
pd.options.display.max_columns = 22

# date를 string으로 읽기
df = pd.read_excel(
    "data/webbrowser_share.xls",
    dtype={"date": str},  # {"컬럼명": 타입} -> 컬럼을 어떤 타입으로 읽을지 지정
    index_col="date",
)
print(df.shape)
df.iloc[:5, :8]
```

```text
(12, 21)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 8열</div><div class="sql-result-scroll"><table><thead><tr><th>date</th><th>Chrome</th><th>IE</th><th>Edge</th><th>Safari</th><th>Whale Browser</th><th>Firefox</th><th>Opera</th><th>Swing</th></tr></thead><tbody><tr><th class="idx">2018.08</th><td>59.12</td><td>31.06</td><td>2.97</td><td>2.52</td><td>1.36</td><td>1.26</td><td>0.88</td><td>0.39</td></tr><tr><th class="idx">2018.09</th><td>61.95</td><td>27.84</td><td>3.16</td><td>2.19</td><td>1.27</td><td>2.57</td><td>0.4</td><td>0.37</td></tr><tr><th class="idx">2018.10</th><td>62.05</td><td>28.36</td><td>3.35</td><td>2.43</td><td>1.28</td><td>1.36</td><td>0.59</td><td>0.35</td></tr><tr><th class="idx">2018.11</th><td>65.31</td><td>26.29</td><td>3.06</td><td>2.09</td><td>1.16</td><td>1.1</td><td>0.55</td><td>0.26</td></tr><tr><th class="idx">2018.12</th><td>68.34</td><td>22.31</td><td>2.99</td><td>2.02</td><td>1.11</td><td>2.04</td><td>0.63</td><td>0.25</td></tr></tbody></table></div></div>

`date`를 문자열로 읽은 이유는, 그냥 읽으면 `2018.10`이 실수 `2018.1`이 돼서 1월과 구분이 안 되기 때문이다. 날짜 타입으로 읽을 수도 있다.

```python
# date 컬럼을 datetime 타입으로 읽어 오기
df2 = pd.read_excel(
    "data/webbrowser_share.xls",
    parse_dates=["date"],  # 날짜 타입 컬럼 지정
    date_format="%Y.%m",   # 컬럼 값의 형식 지정
    index_col="date",
)
df2.index[:3]
```

```text
DatetimeIndex(['2018-08-01', '2018-09-01', '2018-10-01'], dtype='datetime64[ns]', name='date', freq=None)
```

브라우저가 21개라 작은 것들은 "기타"로 묶는다.

```python
# Chrome ~ Firefox, 나머지는 "기타" 컬럼으로 처리
web_df = df[df.columns[:6]].copy()
web_df["기타"] = df[df.columns[6:]].sum(axis=1)  # 나머지 컬럼들의 합계
web_df.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 7열</div><div class="sql-result-scroll"><table><thead><tr><th>date</th><th>Chrome</th><th>IE</th><th>Edge</th><th>Safari</th><th>Whale Browser</th><th>Firefox</th><th>기타</th></tr></thead><tbody><tr><th class="idx">2018.08</th><td>59.12</td><td>31.06</td><td>2.97</td><td>2.52</td><td>1.36</td><td>1.26</td><td>1.68</td></tr><tr><th class="idx">2018.09</th><td>61.95</td><td>27.84</td><td>3.16</td><td>2.19</td><td>1.27</td><td>2.57</td><td>1.0</td></tr><tr><th class="idx">2018.10</th><td>62.05</td><td>28.36</td><td>3.35</td><td>2.43</td><td>1.28</td><td>1.36</td><td>1.14</td></tr><tr><th class="idx">2018.11</th><td>65.31</td><td>26.29</td><td>3.06</td><td>2.09</td><td>1.16</td><td>1.1</td><td>0.98</td></tr><tr><th class="idx">2018.12</th><td>68.34</td><td>22.31</td><td>2.99</td><td>2.02</td><td>1.11</td><td>2.04</td><td>1.17</td></tr></tbody></table></div></div>

```python
## 막대그래프로 2018.08의 브라우저별 점유율 비교
v = web_df.iloc[0].sort_values()
plt.barh(v.index, v)
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-14.png)

`sort_values()`로 정렬해서 그리면 큰 순서가 한눈에 보인다.

```python
# 파이차트를 이용해 점유율 시각화
plt.pie(
    web_df.iloc[0],
    labels=web_df.columns,
    autopct="%d%%",
    explode=[0.1, 0, 0, 0, 0, 0, 0],
    shadow=True,
)
plt.title("2018년 1월 브라우져 점유율")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-15.png)

> **보충 · 제목의 날짜가 다르다**
> `web_df.iloc[0]`은 첫 행인 **2018.08**이다(바로 위 막대그래프 주석에도 그렇게 적혀 있다). 제목의 "2018년 1월"은 "2018년 8월"이 맞다.
> 그리고 작은 조각들(Safari, Whale, Firefox)은 라벨과 비율이 겹쳐서 읽기 어렵다. 파이 차트는 범주가 5개 정도를 넘으면 막대그래프가 더 읽기 쉽다. 비율의 **크기 비교**는 사람 눈이 각도보다 길이를 더 정확히 읽기 때문이다.

## 히스토그램 (Histogram)

- **도수분포표**를 그래프로 나타낸 것이다.
  - 도수분포표: 연속형 자료를 특정 구간(**bin**)으로 나눠 그 빈도를 나타낸 표. 빈도나 **분포**를 볼 때 쓴다.
  - x축은 구간(계급), y축은 빈도수다.
- `hist(data, bins=구간 개수)`

```python
tips = pd.read_csv("data/tips.csv")
print(tips.shape)
tips.head()
```

```text
(244, 7)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 7열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>total_bill</th><th>tip</th><th>sex</th><th>smoker</th><th>day</th><th>time</th><th>size</th></tr></thead><tbody><tr><th class="idx">0</th><td>16.99</td><td>1.01</td><td>Female</td><td>No</td><td>Sun</td><td>Dinner</td><td>2</td></tr><tr><th class="idx">1</th><td>10.34</td><td>1.66</td><td>Male</td><td>No</td><td>Sun</td><td>Dinner</td><td>3</td></tr><tr><th class="idx">2</th><td>21.01</td><td>3.5</td><td>Male</td><td>No</td><td>Sun</td><td>Dinner</td><td>3</td></tr><tr><th class="idx">3</th><td>23.68</td><td>3.31</td><td>Male</td><td>No</td><td>Sun</td><td>Dinner</td><td>2</td></tr><tr><th class="idx">4</th><td>24.59</td><td>3.61</td><td>Female</td><td>No</td><td>Sun</td><td>Dinner</td><td>4</td></tr></tbody></table></div></div>

레스토랑 손님 244명의 계산 금액(`total_bill`), 팁, 성별, 흡연 여부, 요일 등이 있다.

```python
plt.hist(tips["tip"], bins=10, edgecolor="white")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-16.png)

```python
pd.cut(tips["tip"], bins=10).value_counts().sort_index()
```

```text
tip
(0.991, 1.9]    41
(1.9, 2.8]      79
(2.8, 3.7]      66
(3.7, 4.6]      27
(4.6, 5.5]      19
(5.5, 6.4]       5
(6.4, 7.3]       4
(7.3, 8.2]       1
(8.2, 9.1]       1
(9.1, 10.0]      1
Name: count, dtype: int64
```

`pd.cut()`으로 같은 10구간을 나눠 세 보면 히스토그램 막대 높이와 같다. 팁은 2~3달러대에 몰려 있고 오른쪽으로 꼬리가 길다.

`bins`에 리스트를 주면 구간 경계를 직접 정할 수 있다.

```python
# bin의 간격을 명시적으로 지정
plt.hist(tips["total_bill"], bins=[3, 10, 20, 40, 50, 60], edgecolor="w")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-17.png)

> **보충** 구간 너비가 다르면(10~20은 10, 20~40은 20) 막대 높이만으로 비교하면 넓은 구간이 과장돼 보인다. 너비가 다른 구간을 쓸 땐 `density=True`로 밀도를 그리는 게 정확하다.

두 그룹의 분포를 겹쳐 그려 비교할 수 있다.

```python
# smoker 여부별 total_bill의 분포
y_total = tips.query("smoker=='Yes'")["total_bill"]
n_total = tips.query("smoker=='No'")["total_bill"]

plt.hist(y_total, bins=10, label="yes", alpha=0.5)
plt.hist(n_total, bins=10, label="no", alpha=0.5)
plt.xlabel("total bill")
plt.ylabel("수량")
plt.legend()
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-18.png)

`alpha=0.5`로 반투명하게 해서 겹친 부분이 보이게 했다. 비흡연자가 151명, 흡연자가 93명이라 **인원 수가 달라서** 막대 높이 차이는 분포 차이가 아니라 인원 차이일 수 있다. 모양을 비교하려면 `density=True`를 준다.

## 상자 그래프 (Box plot)

- 데이터의 **4분위수**를 기반으로 연속형 변수의 분포를 요약하고, **이상치**를 표시하는 그래프다.
- 값들의 중심, 퍼짐(분포), 이상치를 한 번에 볼 수 있다.
- `boxplot(x, whis=1.5)`
  - `whis`: 이상치(극단치) 기준을 정하는 값. 기본 1.5.

| 용어 | 뜻 |
|---|---|
| **IQR**(Inter Quartile Range) | 3분위수 - 1분위수. 가운데 50% 값의 범위 |
| 극단적으로 작은 값 | 1분위수 - IQR × whis 보다 작은 값 |
| 극단적으로 큰 값 | 3분위수 + IQR × whis 보다 큰 값 |

```python
# 팁의 4분위수 + 이상치
plt.boxplot(tips["tip"], tick_labels=["TIP"])
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-19.png)

상자의 아래·위 변이 1·3분위수, 가운데 선이 중앙값, 수염(whisker) 끝이 정상 범위 경계, 그 밖의 점이 이상치다.

```python
plt.boxplot(
    tips["tip"],
    tick_labels=["TIP"],
    whis=1,  # 정상 범위 조절값. default: 1.5
)
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-20.png)

`whis`를 1로 줄이면 정상 범위가 좁아져서 이상치로 찍히는 점이 늘어난다.

> **보충** `tick_labels`는 matplotlib 3.9부터 쓰는 이름이다. 그 전 버전에서는 `labels`였다. 블로그나 책의 예제가 `labels`로 돼 있으면 버전 차이다.

두 그룹의 분포를 나란히 비교할 수 있다.

```python
# 성별 tip의 분포
m_tip = tips.query("sex == 'Male'")["tip"]
f_tip = tips.query("sex == 'Female'")["tip"]
plt.boxplot([m_tip, f_tip], tick_labels=["남성", "여성"])
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-charts-21.png)

중앙값은 비슷하고, 남성 쪽이 위로 더 넓게 퍼져 있으며 큰 이상치도 더 많다.

## 정리

- **변화**는 선, **관계**는 산점도, **수량 비교**는 막대, **비율**은 파이, **분포**는 히스토그램과 상자 그래프.
- 범위가 크게 다른 두 데이터의 추세를 비교할 땐 `twinx()`로 Y축을 나눈다. 대신 축 이름을 분명히 쓴다.
- 산점도의 상관관계는 `corr()`로 수치를 같이 확인한다.
- 범주가 많은 비율은 파이보다 정렬한 막대그래프가 읽기 쉽다.
- 인원이나 구간 너비가 다른 히스토그램은 `density=True`로 비교한다.
- 그래프 코드를 복사해 올 때 **제목과 축 이름**까지 바꿨는지 확인한다. 이 노트북에서 틀린 곳이 전부 거기였다.
