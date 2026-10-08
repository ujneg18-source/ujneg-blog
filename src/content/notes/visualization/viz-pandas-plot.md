---
title: "Pandas 시각화: plot()으로 바로 그리는 그래프"
description: "Series와 DataFrame의 plot()으로 막대·누적 막대·파이·히스토그램·KDE·상자·산점도·선 그래프를 그리고, 상관계수 행렬을 imshow()로 히트맵처럼 그리는 방법을 팁·다이아몬드·강수량 데이터로 정리합니다."
category: 'Tech'
subcategory: 'Data Analysis'
series: '데이터 시각화'
seriesOrder: 3
originalNotebook: "03_Pandas 시각화.ipynb"
tags: ["Python","Pandas","Matplotlib","Visualization"]
date: 2026-05-08
---

> SKN31 데이터 분석 실습 노트북 `03_Pandas 시각화.ipynb`의 필기를 바탕으로 정리했습니다.
> 필기 순서대로 다시 실행한 결과를 실었습니다(pandas 2.3, matplotlib 3.10). `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- `plot()`과 `kind`로 그래프 종류 고르기
- 막대·누적 막대, 파이, 히스토그램·KDE, 상자, 산점도, 선 그래프
- 상관계수 행렬을 `imshow()`로 시각화하기

## Pandas 시각화

- Pandas는 matplotlib을 기반으로 한 시각화 기능을 자체적으로 지원한다.
- Series나 DataFrame에 `plot()` 함수 또는 plot accessor(`.plot.bar()` 등)를 쓴다.
- 그린 뒤 matplotlib으로 설정을 더 할 수 있다.
- [pandas 시각화 문서](https://pandas.pydata.org/docs/user_guide/visualization.html)

### plot()

`kind` 매개변수로 그래프 종류를 정한다.

| kind | 그래프 |
|---|---|
| `'line'` | 선 그래프 (기본값) |
| `'bar'` / `'barh'` | 수직 / 수평 막대 |
| `'hist'` | 히스토그램 |
| `'box'` | 상자 그래프 |
| `'kde'` | 커널 밀도 추정(KDE) 그래프 |
| `'pie'` | 파이 차트 |
| `'scatter'` | 산점도 |

- **x축은 index, y축은 Series의 값**을 놓고 그린다.
- DataFrame으로 그리면 하나의 subplot에 **컬럼별로** 각각 그린다.

matplotlib으로 그릴 땐 x와 y를 따로 넘겼지만, pandas는 index와 값이 이미 짝지어져 있어서 `plot()` 한 번이면 된다.

## 막대 그래프

index가 무슨 값인지 알려 주는 축(라벨)으로 쓰인다.

```python
import pandas as pd
import matplotlib.pyplot as plt

tips = pd.read_csv("data/tips.csv")
tips.shape
```

```text
(244, 7)
```

```python
tips["sex"].value_counts()
# Series를 기준으로 그림을 그림
```

```text
sex
Male      157
Female     87
Name: count, dtype: int64
```

`value_counts()`의 결과가 index(성별)와 값(인원)을 가진 Series라서 그대로 막대그래프가 된다.

```python
# 성별 고객수
v = tips["sex"].value_counts()
v.plot(kind="bar", rot=0, grid=True)

# pandas는 내부적으로 matplotlib을 사용해서 그래프를 그린다.
# 그래서 추가 설정은 plot()의 파라미터로 전달 또는 matplotlib의 함수를 사용할 수 있다.
plt.title("성별 고객수")
plt.ylabel("수량")
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-1.png)

`rot=0`은 x축 눈금 글자의 회전 각도다. 막대그래프는 기본이 90도로 세워져 있다.

같은 그래프를 plot accessor로도 그릴 수 있다.

```python
v.plot.bar(grid=True)
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-2.png)

`plot(kind="bar")`와 `plot.bar()`는 같다. 어떤 파라미터가 있는지는 `help(v.plot)`으로 본다(주피터에서는 `v.plot?`도 된다).

설정을 `plot()`의 파라미터로 한 번에 넘길 수도 있다.

```python
v.plot(kind="barh", title="성별 고객수", ylabel="개수", figsize=(5, 4), color="green")
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-3.png)

> **보충** 수평 막대(`barh`)에서는 가로가 수량축이라, `ylabel="개수"`는 성별이 있는 세로축에 붙는다. 수량에 이름을 붙이려면 `xlabel="개수"`가 맞다.

### DataFrame으로 그리면

DataFrame은 **index가 x축, 컬럼이 막대 하나씩**이 된다.

```python
# 성별-흡연여부별 손님 수
result = tips.pivot_table(index="sex", columns="smoker", values="total_bill", aggfunc="count")
result
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>sex</th><th>No</th><th>Yes</th></tr></thead><tbody><tr><th class="idx">Female</th><td>54</td><td>33</td></tr><tr><th class="idx">Male</th><td>97</td><td>60</td></tr></tbody></table></div></div>

```python
result.plot(kind="bar")
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-4.png)

성별(index)마다 No, Yes(컬럼) 막대가 나란히 생겼다.

**누적 막대 그래프**: `stacked=True`

```python
result.plot(
    kind="bar",
    stacked=True,  # 막대: 전체 개수, smoker별 비율로 나눠 줌
)
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-5.png)

막대 전체 높이가 성별 인원, 색으로 나뉜 부분이 흡연 여부별 인원이다.

```python
result = tips.pivot_table(index="smoker", columns="day", values="total_bill", aggfunc="sum")
result
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th>smoker</th><th>Fri</th><th>Sat</th><th>Sun</th><th>Thur</th></tr></thead><tbody><tr><th class="idx">No</th><td>73.68</td><td>884.78</td><td>1168.88</td><td>770.09</td></tr><tr><th class="idx">Yes</th><td>252.2</td><td>893.62</td><td>458.28</td><td>326.24</td></tr></tbody></table></div></div>

```python
result.plot(kind="bar", stacked=True, rot=0)
plt.legend(bbox_to_anchor=(1, 1), loc="upper left", title="요일")
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-6.png)

흡연 여부별 매출을 요일로 쌓았다. 범례는 그래프 밖 오른쪽으로 뺐다.

## 파이 차트

```python
tips["day"].value_counts()
```

```text
day
Sat     87
Sun     76
Thur    62
Fri     19
Name: count, dtype: int64
```

```python
tips["day"].value_counts().plot(
    kind="pie", autopct="%d%%",
    explode=[0.1, 0, 0, 0], shadow=True,
)
plt.show()
# 인덱스 이름이 라벨로 나옴
```

![그래프 출력](/images/visualization/viz-pandas-plot-7.png)

index(요일)가 조각 라벨이 된다. 왼쪽에 `count`가 세로로 붙는 건 Series 이름이 y축 레이블로 들어가서다. 지우려면 `ylabel=""`을 넘긴다.

## 히스토그램, KDE (밀도 그래프)

```python
tips["total_bill"].plot(
    kind="hist",
    bins=15,  # 리스트로도 지정 가능
    edgecolor="k",
)
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-8.png)

**KDE**(Kernel Density Estimation)는 히스토그램을 부드러운 곡선으로 이은 것처럼 분포를 추정해 그린다. 내부적으로 `scipy`를 쓰니 설치해야 한다.

```bash
uv pip install scipy
```

```python
tips["total_bill"].plot(kind="kde")
plt.xlim(0, 55)
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-9.png)

히스토그램은 구간(bins)을 어떻게 나누느냐에 따라 모양이 달라지는데, KDE는 구간 없이 매끄럽게 그려서 분포의 모양(봉우리 위치, 꼬리)을 보기 좋다. y축은 개수가 아니라 **밀도**다.

DataFrame의 여러 컬럼을 히스토그램으로 그리면 기본은 한 axes에 겹쳐 그린다. `subplots=True`로 컬럼마다 따로 그릴 수 있다.

```python
# subplots=True와 layout 옵션을 함께 사용
tips[["tip", "total_bill"]].plot(
    kind="hist",
    alpha=0.7,
    bins=30,
    subplots=True,
    layout=(1, 2),   # 1행 2열로 배치
    figsize=(12, 5), # 그래프가 겹치지 않게 전체 크기 조절
)
plt.tight_layout()   # 그래프 간 간격을 자동으로 최적화
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-10.png)

tip은 0~10, total_bill은 3~50대라 범위가 달라서, 한 axes에 겹치면 tip이 왼쪽 끝에 몰린다. 그래서 나눠 그리는 게 낫다.

## 상자 그래프 (Box plot)

```python
tips["total_bill"].plot(kind="box", figsize=(4, 3))
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-11.png)

이상치 경계를 직접 계산해 봤다.

```python
q1, q2, q3 = tips["total_bill"].quantile(q=[0.25, 0.5, 0.75])
print(q1, q2, q3)

whis = 1.5  # 범위를 조정하는 파라미터
iqr = q3 - q1
nr1 = q1 - iqr * whis
nr2 = q3 + iqr * whis
nr1, nr2
```

```text
13.3475 17.795 24.127499999999998
```

```text
(-2.8224999999999945, 40.29749999999999)
```

정상 범위가 약 -2.8 ~ 40.3이다. 계산 금액이 음수일 수는 없으니 아래쪽 이상치는 없고, 40.3달러를 넘는 계산만 위쪽 이상치로 찍힌다. 위 그래프의 동그라미들이 그것이다.

> **보충** 실제로 몇 건인지 세어 봤다.

```python
int((tips["total_bill"] > nr2).sum())
```

```text
9
```

`whis`를 0.5로 줄이면 정상 범위가 좁아져 이상치가 늘어난다.

```python
tips["total_bill"].plot(kind="box", whis=0.5, figsize=(4, 3))
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-12.png)

DataFrame은 컬럼마다 상자가 하나씩 생긴다.

```python
tips[["tip", "total_bill"]].plot(kind="box")
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-13.png)

## 산점도 (Scatter plot)

DataFrame에서 x, y로 쓸 **컬럼 이름**을 지정한다.

```python
# df.plot(kind='scatter', x="x축에 놓을 컬럼이름", y="y축에 놓을 컬럼이름")
tips.plot(kind="scatter", x="tip", y="total_bill", alpha=0.5
plt.show()
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · SyntaxError: &#x27;(&#x27; was never closed</div></div>

> **보충** 노트북에 저장된 셀은 `plot(...` 의 닫는 괄호가 빠져 있어서 다시 실행하면 문법 오류가 난다. 그래프 출력은 남아 있는 걸로 봐서, 실행한 뒤에 코드를 고치다 괄호를 지운 것 같다.

```python
tips.plot(kind="scatter", x="tip", y="total_bill", alpha=0.5)
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-14.png)

```python
tips[["tip", "total_bill"]].corr()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>tip</th><th>total_bill</th></tr></thead><tbody><tr><th class="idx">tip</th><td>1.0</td><td>0.675734</td></tr><tr><th class="idx">total_bill</th><td>0.675734</td><td>1.0</td></tr></tbody></table></div></div>

상관계수 0.68로 강한 양의 상관관계다. 계산 금액이 클수록 팁도 크다.

### 컬럼 간 상관계수 시각화

컬럼이 많으면 상관계수 표를 숫자로 읽기 어렵다. 색으로 칠하면 한눈에 보인다.

```python
dia = pd.read_csv("data/diamonds.csv")
v = dia.select_dtypes(include="number").corr()  # 숫자 컬럼끼리 상관계수
v
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 7행 × 7열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>carat</th><th>depth</th><th>table</th><th>price</th><th>x</th><th>y</th><th>z</th></tr></thead><tbody><tr><th class="idx">carat</th><td>1.0</td><td>0.028224</td><td>0.181618</td><td>0.921591</td><td>0.975094</td><td>0.951722</td><td>0.953387</td></tr><tr><th class="idx">depth</th><td>0.028224</td><td>1.0</td><td>-0.295779</td><td>-0.010647</td><td>-0.025289</td><td>-0.029341</td><td>0.094924</td></tr><tr><th class="idx">table</th><td>0.181618</td><td>-0.295779</td><td>1.0</td><td>0.127134</td><td>0.195344</td><td>0.18376</td><td>0.150929</td></tr><tr><th class="idx">price</th><td>0.921591</td><td>-0.010647</td><td>0.127134</td><td>1.0</td><td>0.884435</td><td>0.865421</td><td>0.861249</td></tr><tr><th class="idx">x</th><td>0.975094</td><td>-0.025289</td><td>0.195344</td><td>0.884435</td><td>1.0</td><td>0.974701</td><td>0.970772</td></tr><tr><th class="idx">y</th><td>0.951722</td><td>-0.029341</td><td>0.18376</td><td>0.865421</td><td>0.974701</td><td>1.0</td><td>0.952006</td></tr><tr><th class="idx">z</th><td>0.953387</td><td>0.094924</td><td>0.150929</td><td>0.861249</td><td>0.970772</td><td>0.952006</td><td>1.0</td></tr></tbody></table></div></div>

matplotlib의 `imshow()`로 그린다. 행렬의 값을 색으로 칠해 이미지처럼 보여 주는 함수다.

```python
plt.imshow(v, cmap="Blues", filternorm=True)
plt.colorbar()
plt.xticks(range(0, 7), labels=v.columns)
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-15.png)

진한 파랑일수록 상관계수가 1에 가깝다. carat, price, x, y, z가 모두 진한 덩어리를 이룬다. 크기 관련 값들이 서로, 그리고 가격과 강하게 연결돼 있다는 뜻이다.

> **보충 · y축 이름과 숫자 넣기**
> 위 그래프는 `xticks`만 지정해서 y축은 0~6 숫자로 나온다. `yticks`도 같이 지정하고, 칸마다 값을 써 주면 표 없이도 읽힌다. 상관계수는 -1 ~ 1이라 `vmin`, `vmax`로 범위를 고정하고, 음수와 양수가 다른 색이 되는 `RdBu` 같은 색상표를 쓰면 음의 상관관계도 구분된다.

```python
fig, ax = plt.subplots(figsize=(7, 6))
im = ax.imshow(v, cmap="RdBu_r", vmin=-1, vmax=1)
fig.colorbar(im)
ax.set_xticks(range(len(v.columns)), labels=v.columns)
ax.set_yticks(range(len(v.index)), labels=v.index)
for i in range(len(v.index)):
    for j in range(len(v.columns)):
        ax.text(j, i, f"{v.iloc[i, j]:.2f}", ha="center", va="center", fontsize=8)
ax.set_title("diamonds 숫자 컬럼 상관계수")
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-16.png)

이제 depth와 table의 -0.30처럼 **음의** 상관관계가 파란색으로 따로 보인다.

`imshow()`는 원래 이미지를 그리는 함수다. 이미지 파일도 결국 숫자 배열이라는 걸 노트북에서 확인했다.

```python
from PIL import Image
import numpy as np

img = np.array(Image.open("image.jpg"))
print(img.shape, img.dtype)
plt.imshow(img)
plt.show()
```

```text
(312, 312, 3) uint8
```

![그래프 출력](/images/visualization/viz-pandas-plot-17.png)

`(높이, 너비, 3)` 모양의 배열이다. 마지막 3은 픽셀마다의 빨강·초록·파랑(RGB) 값이고, 각 값은 0~255 정수다. 상관계수 행렬은 이 배열에서 색 채널이 없는 2차원 버전이라 `cmap`으로 색을 입힌 것이다.

```python
print(img[:2, :3])  # 왼쪽 위 2×3 픽셀의 RGB 값
```

```text
[[[15 18 14]
  [15 18 14]
  [15 18 14]]

 [[15 18 14]
  [15 18 14]
  [15 18 14]]]
```

## 선 그래프

계절별 강수량을 연도가 행이 되도록 전치(`.T`)해서 읽었다.

```python
df = pd.read_excel("data/강수량.xlsx", index_col="계절").T
df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 9행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>봄</th><th>여름</th><th>가을</th><th>겨울</th></tr></thead><tbody><tr><th class="idx">2009</th><td>231.3</td><td>752.0</td><td>143.1</td><td>142.3</td></tr><tr><th class="idx">2010</th><td>302.9</td><td>692.6</td><td>307.6</td><td>98.7</td></tr><tr><th class="idx">2011</th><td>256.9</td><td>1053.6</td><td>225.5</td><td>45.6</td></tr><tr><th class="idx">2012</th><td>256.5</td><td>770.6</td><td>363.5</td><td>139.3</td></tr><tr><th class="idx">2013</th><td>264.3</td><td>567.5</td><td>231.2</td><td>59.9</td></tr><tr><th class="idx">2014</th><td>215.9</td><td>599.8</td><td>293.1</td><td>76.9</td></tr><tr><th class="idx">2015</th><td>223.2</td><td>387.1</td><td>247.7</td><td>109.1</td></tr><tr><th class="idx">2016</th><td>312.8</td><td>446.2</td><td>381.6</td><td>108.1</td></tr><tr><th class="idx">2017</th><td>118.6</td><td>609.7</td><td>172.5</td><td>75.6</td></tr></tbody></table></div></div>

```python
df.plot(figsize=(15, 4))
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-18.png)

index(연도)가 x축, 컬럼(계절)이 선 하나씩이 됐다. 여름이 다른 계절보다 훨씬 많고 연도별 변동도 크다.

```python
df["봄"].plot(figsize=(15, 4), marker="o")
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-19.png)

Series 하나만 그리면 선 하나다. `marker="o"`로 연도마다 점을 찍었다. 2017년 봄이 유독 적다.

**전치하면 그래프가 바뀐다.** 무엇을 x축에 놓고 무엇을 선으로 비교할지를 index와 컬럼으로 정하는 셈이다.

```python
df.T
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 9열</div><div class="sql-result-scroll"><table><thead><tr><th>계절</th><th>2009</th><th>2010</th><th>2011</th><th>2012</th><th>2013</th><th>2014</th><th>2015</th><th>2016</th><th>2017</th></tr></thead><tbody><tr><th class="idx">봄</th><td>231.3</td><td>302.9</td><td>256.9</td><td>256.5</td><td>264.3</td><td>215.9</td><td>223.2</td><td>312.8</td><td>118.6</td></tr><tr><th class="idx">여름</th><td>752.0</td><td>692.6</td><td>1053.6</td><td>770.6</td><td>567.5</td><td>599.8</td><td>387.1</td><td>446.2</td><td>609.7</td></tr><tr><th class="idx">가을</th><td>143.1</td><td>307.6</td><td>225.5</td><td>363.5</td><td>231.2</td><td>293.1</td><td>247.7</td><td>381.6</td><td>172.5</td></tr><tr><th class="idx">겨울</th><td>142.3</td><td>98.7</td><td>45.6</td><td>139.3</td><td>59.9</td><td>76.9</td><td>109.1</td><td>108.1</td><td>75.6</td></tr></tbody></table></div></div>

```python
df.T.plot(figsize=(15, 4))
plt.legend(bbox_to_anchor=(1, 1), loc="upper left", title="년도", ncols=2)
plt.show()
```

![그래프 출력](/images/visualization/viz-pandas-plot-20.png)

이번엔 계절이 x축, 연도가 선이 됐다. 선이 9개라 범례를 2열(`ncols=2`)로 그래프 밖에 놓았다.

> **보충** 그런데 계절은 시간 순서가 있긴 해도 "봄→여름→가을→겨울"이 이어지는 연속값은 아니다. 연도별 계절 패턴을 비교하려는 거라면 이 그래프도 되지만, 계절별로 연도 추이를 보려면 앞의 `df.plot()`이 맞다. 같은 데이터라도 **무엇을 비교하고 싶은지**에 따라 축을 정한다.

## 정리

- `Series.plot()`은 index를 x축, 값을 y축으로 그린다. `DataFrame.plot()`은 컬럼마다 선이나 막대를 하나씩 그린다.
- `kind`로 종류를 고르고, `plot.bar()`처럼 accessor로도 같은 그래프를 그린다.
- `value_counts()`, `pivot_table()`로 집계한 결과를 바로 `plot()` 하는 흐름이 가장 많이 쓰인다.
- `stacked=True`는 누적 막대, `subplots=True`는 컬럼별 분리 그래프.
- KDE는 `scipy`가 필요하고, 구간 없이 분포 모양을 보여 준다.
- 상관계수 행렬은 `imshow()`로 색을 입히되, 양쪽 축 이름과 값, -1~1 고정 범위를 넣어야 제대로 읽힌다.
- `.T`로 전치하면 x축과 선이 바뀐다. 비교하려는 대상을 먼저 정하고 축을 정한다.
