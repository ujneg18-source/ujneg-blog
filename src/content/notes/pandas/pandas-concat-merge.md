---
title: "DataFrame 합치기: concat·join·merge"
description: "나눠진 데이터를 이어 붙이는 concat과, 연관된 데이터를 같은 값 기준으로 합치는 join·merge를 연도별 보유 주식 데이터로 비교하며 정리합니다."
category: 'Tech'
subcategory: 'Data Analysis'
series: 'Pandas'
seriesOrder: 6
originalNotebook: "04_Pandas_DataFrame_합치기.ipynb"
tags: ["Python","Pandas","merge","concat"]
date: 2026-05-06
---

> SKN31 데이터 분석 실습 노트북 `04_Pandas_DataFrame_합치기.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 **pandas 3.0.2에서 다시 실행한 결과**를 실었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- DataFrame을 합치는 두 방식: 단순 결합과 조인
- `concat()`으로 위아래·옆으로 이어 붙이기, `keys`로 출처 구분하기
- `join()`으로 index 기준 조인하기
- `merge()`로 컬럼 기준 조인하기
- 어떤 상황에 무엇을 쓸지

## 합치는 두 방식

| 방식 | 방향 | 하는 일 | 함수 |
|---|---|---|---|
| **단순 결합** | 수직(행이 늘어남) | 같은 컬럼끼리 위아래로 붙인다. 하나의 데이터를 나눈 것을 다시 합칠 때 | `concat()` |
| | 수평(열이 늘어남) | 같은 행 이름끼리 옆으로 붙인다 | `concat(axis=1)` |
| **조인(JOIN)** | 수평 | **연관된** 데이터를 index나 특정 컬럼의 값이 같은 행끼리 합친다 | `join()`, `merge()` |

조인은 SQL 시리즈의 JOIN과 같은 개념이다. 여러 DataFrame에 흩어진 정보 중 필요한 것을 모아 하나로 본다. Inner, Left Outer, Right Outer, Full Outer 방식이 있다.

## 실습 데이터

| 파일 | 내용 |
|---|---|
| `stocks_2016.csv`, `stocks_2017.csv`, `stocks_2018.csv` | 연도별 보유 주식 (종목, 수량, 최저가, 최고가) |
| `stocks_info.csv` | 종목 정보 (종목 코드, 회사 이름, 설명) |

### glob으로 파일 목록 가져오기

`glob` 모듈은 와일드카드 패턴으로 파일 경로를 찾는다.

| 패턴 | 의미 |
|---|---|
| `*` | 0개 이상의 아무 문자 |
| `**` | 모든 하위 디렉토리 (`recursive=True`일 때) |

```python
import pandas as pd
import numpy as np
from glob import glob

file_names = sorted(glob("data/s*.csv"))  # data 폴더에서 s로 시작하는 csv
file_names
```

```text
['data/stocks_2016.csv', 'data/stocks_2017.csv', 'data/stocks_2018.csv', 'data/stocks_info.csv']
```

```python
stock_2016, stock_2017, stock_2018, stock_info = [pd.read_csv(f) for f in file_names]
stock_2017
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>50</td><td>120</td><td>140</td></tr><tr><th class="idx">1</th><td>GE</td><td>100</td><td>30</td><td>40</td></tr><tr><th class="idx">2</th><td>IBM</td><td>87</td><td>75</td><td>95</td></tr><tr><th class="idx">3</th><td>SLB</td><td>20</td><td>55</td><td>85</td></tr><tr><th class="idx">4</th><td>TXN</td><td>500</td><td>15</td><td>23</td></tr><tr><th class="idx">5</th><td>TSLA</td><td>100</td><td>100</td><td>300</td></tr></tbody></table></div></div>

필기에서는 `glob("data/s*.csv")` 결과를 그대로 네 변수에 나눠 담았다. 노트북을 실행한 Windows에서는 이름순으로 나왔지만, `glob`은 **결과 순서를 보장하지 않는다.** 순서가 바뀌면 `stock_2016`에 다른 연도 파일이 들어가도 에러 없이 진행된다. 그래서 `sorted()`로 감쌌다. (`보충`)

```python
stock_2018
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>40</td><td>135</td><td>170</td></tr><tr><th class="idx">1</th><td>AMZN</td><td>8</td><td>900</td><td>1125</td></tr><tr><th class="idx">2</th><td>TSLA</td><td>50</td><td>220</td><td>400</td></tr></tbody></table></div></div>

```python
stock_info[["Symbol", "Name"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Name</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>Apple Inc</td></tr><tr><th class="idx">1</th><td>TSLA</td><td>Tesla Inc</td></tr><tr><th class="idx">2</th><td>WMT</td><td>Walmart Inc</td></tr><tr><th class="idx">3</th><td>GE</td><td>General Electric</td></tr><tr><th class="idx">4</th><td>IBM</td><td>IBM(International Business Machines Co)</td></tr><tr><th class="idx">5</th><td>SLB</td><td>Schlumberger Limited.</td></tr><tr><th class="idx">6</th><td>TXN</td><td>Texas Instruments Incorporated</td></tr><tr><th class="idx">7</th><td>AMZN</td><td>Amazon.com, Inc</td></tr></tbody></table></div></div>

## concat(): 단순 결합

```python
pd.concat(objs, axis=0, join="outer", keys=None, ignore_index=False)
```

| 매개변수 | 의미 |
|---|---|
| `objs` | 합칠 DataFrame들을 리스트로 |
| `axis` | `0`(기본): 수직 결합 / `1`: 수평 결합 |
| `join` | `"outer"`(기본): 한쪽에만 있는 열·행도 포함 / `"inner"`: 양쪽에 다 있는 것만 |
| `keys` | 합친 행들의 출처를 구분할 바깥쪽 index |
| `ignore_index` | `True`면 기존 index를 버리고 0부터 다시 매긴다 |

- **수직 결합**: **컬럼 이름이 같은 열끼리** 합친다. 같은 이름이 없는 열도 결과에 들어간다(full outer).
- **수평 결합**: **index 이름이 같은 행끼리** 합친다. 같은 이름이 없는 행도 들어간다(full outer).

### 수직 결합

```python
pd.concat([stock_2016, stock_2017, stock_2018])  # axis=0 (기본)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 12행 × 4열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>80</td><td>95</td><td>110</td></tr><tr><th class="idx">1</th><td>TSLA</td><td>50</td><td>80</td><td>130</td></tr><tr><th class="idx">2</th><td>WMT</td><td>40</td><td>55</td><td>70</td></tr><tr><th class="idx">0</th><td>AAPL</td><td>50</td><td>120</td><td>140</td></tr><tr><th class="idx">1</th><td>GE</td><td>100</td><td>30</td><td>40</td></tr><tr><td class="ellipsis" colspan="5">⋯</td></tr><tr><th class="idx">4</th><td>TXN</td><td>500</td><td>15</td><td>23</td></tr><tr><th class="idx">5</th><td>TSLA</td><td>100</td><td>100</td><td>300</td></tr><tr><th class="idx">0</th><td>AAPL</td><td>40</td><td>135</td><td>170</td></tr><tr><th class="idx">1</th><td>AMZN</td><td>8</td><td>900</td><td>1125</td></tr><tr><th class="idx">2</th><td>TSLA</td><td>50</td><td>220</td><td>400</td></tr></tbody></table></div></div>

세 연도의 표가 위아래로 붙었다. 그런데 index가 `0, 1, 2, 0, 1, …`처럼 **중복**된다. 각 DataFrame의 index를 그대로 가져왔기 때문이다.

```python
result = pd.concat([stock_2016, stock_2017, stock_2018])
result.loc[[5]]  # index 이름이 5인 행
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 1행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">5</th><td>TSLA</td><td>100</td><td>100</td><td>300</td></tr></tbody></table></div></div>

이 상태에서 `loc[0]`을 하면 세 연도의 첫 행이 모두 나온다. 어느 연도인지 구분이 안 된다. 두 가지 해결 방법이 있다.

```python
pd.concat([stock_2016, stock_2017, stock_2018], ignore_index=True)  # index를 0부터 다시
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 12행 × 4열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>80</td><td>95</td><td>110</td></tr><tr><th class="idx">1</th><td>TSLA</td><td>50</td><td>80</td><td>130</td></tr><tr><th class="idx">2</th><td>WMT</td><td>40</td><td>55</td><td>70</td></tr><tr><th class="idx">3</th><td>AAPL</td><td>50</td><td>120</td><td>140</td></tr><tr><th class="idx">4</th><td>GE</td><td>100</td><td>30</td><td>40</td></tr><tr><td class="ellipsis" colspan="5">⋯</td></tr><tr><th class="idx">7</th><td>TXN</td><td>500</td><td>15</td><td>23</td></tr><tr><th class="idx">8</th><td>TSLA</td><td>100</td><td>100</td><td>300</td></tr><tr><th class="idx">9</th><td>AAPL</td><td>40</td><td>135</td><td>170</td></tr><tr><th class="idx">10</th><td>AMZN</td><td>8</td><td>900</td><td>1125</td></tr><tr><th class="idx">11</th><td>TSLA</td><td>50</td><td>220</td><td>400</td></tr></tbody></table></div></div>

```python
result3 = pd.concat(
    [stock_2016, stock_2017, stock_2018],
    keys=["2016년", "2017년", "2018년"]  # 각 DataFrame을 구분할 바깥 index
)
result3
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 12행 × 4열 (앞뒤 5행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">2016년 / 0</th><td>AAPL</td><td>80</td><td>95</td><td>110</td></tr><tr><th class="idx">2016년 / 1</th><td>TSLA</td><td>50</td><td>80</td><td>130</td></tr><tr><th class="idx">2016년 / 2</th><td>WMT</td><td>40</td><td>55</td><td>70</td></tr><tr><th class="idx">2017년 / 0</th><td>AAPL</td><td>50</td><td>120</td><td>140</td></tr><tr><th class="idx">2017년 / 1</th><td>GE</td><td>100</td><td>30</td><td>40</td></tr><tr><td class="ellipsis" colspan="5">⋯</td></tr><tr><th class="idx">2017년 / 4</th><td>TXN</td><td>500</td><td>15</td><td>23</td></tr><tr><th class="idx">2017년 / 5</th><td>TSLA</td><td>100</td><td>100</td><td>300</td></tr><tr><th class="idx">2018년 / 0</th><td>AAPL</td><td>40</td><td>135</td><td>170</td></tr><tr><th class="idx">2018년 / 1</th><td>AMZN</td><td>8</td><td>900</td><td>1125</td></tr><tr><th class="idx">2018년 / 2</th><td>TSLA</td><td>50</td><td>220</td><td>400</td></tr></tbody></table></div></div>

`keys`를 주면 index가 **두 단계(MultiIndex)** 가 된다. 바깥은 연도, 안쪽은 원래 순번이다. 출처 정보를 남길 수 있어서 `ignore_index`보다 쓸모가 많다.

```python
result3.loc["2017년"]  # 바깥 index로 조회
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>50</td><td>120</td><td>140</td></tr><tr><th class="idx">1</th><td>GE</td><td>100</td><td>30</td><td>40</td></tr><tr><th class="idx">2</th><td>IBM</td><td>87</td><td>75</td><td>95</td></tr><tr><th class="idx">3</th><td>SLB</td><td>20</td><td>55</td><td>85</td></tr><tr><th class="idx">4</th><td>TXN</td><td>500</td><td>15</td><td>23</td></tr><tr><th class="idx">5</th><td>TSLA</td><td>100</td><td>100</td><td>300</td></tr></tbody></table></div></div>

```python
result3.xs(1, level=1)  # 안쪽 index가 1인 행들
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">2016년</th><td>TSLA</td><td>50</td><td>80</td><td>130</td></tr><tr><th class="idx">2017년</th><td>GE</td><td>100</td><td>30</td><td>40</td></tr><tr><th class="idx">2018년</th><td>AMZN</td><td>8</td><td>900</td><td>1125</td></tr></tbody></table></div></div>

`xs(값, level=단계, axis=0)`는 다중 index에서 **특정 단계**의 값으로 조회한다. level은 바깥부터 0, 1, …이다. 각 연도의 두 번째 종목(안쪽 index 1)만 모아 봤다.

### 수평 결합

```python
pd.concat([stock_2016, stock_info[["Symbol", "Name"]]], axis=1)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 6열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th><th>Symbol</th><th>Name</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>80.0</td><td>95.0</td><td>110.0</td><td>AAPL</td><td>Apple Inc</td></tr><tr><th class="idx">1</th><td>TSLA</td><td>50.0</td><td>80.0</td><td>130.0</td><td>TSLA</td><td>Tesla Inc</td></tr><tr><th class="idx">2</th><td>WMT</td><td>40.0</td><td>55.0</td><td>70.0</td><td>WMT</td><td>Walmart Inc</td></tr><tr><th class="idx">3</th><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>GE</td><td>General Electric</td></tr><tr><th class="idx">4</th><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>IBM</td><td>IBM(International Business Machines Co)</td></tr><tr><th class="idx">5</th><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>SLB</td><td>Schlumberger Limited.</td></tr><tr><th class="idx">6</th><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>TXN</td><td>Texas Instruments Incorporated</td></tr><tr><th class="idx">7</th><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>AMZN</td><td>Amazon.com, Inc</td></tr></tbody></table></div></div>

`axis=1`이면 **index 이름(0, 1, 2, …)이 같은 행끼리** 옆으로 붙인다. 종목 코드가 같은지는 보지 않는다. `stock_2016`은 3행, `stock_info`는 8행이라 3~7번 행은 `stock_2016` 쪽이 `NaN`이 됐다. 지금은 우연히 0~2번 행의 종목이 같아서 맞아 보이지만, 연관된 데이터를 값 기준으로 합치려면 조인을 써야 한다.

## join(): index 기준 조인

```python
df_a.join(others, how="left", lsuffix="", rsuffix="")
```

- **조인 기준**: index 이름이 같은 행끼리 (equi-join)
- **기본 방식**: Left Outer Join. 호출한 쪽(`df_a`)의 행은 모두 남는다.
- 여러 DataFrame을 리스트로 넘겨 **한 번에 조인**할 수 있다.
- 두 DataFrame에 **같은 이름의 컬럼이 있으면 에러**가 난다. `lsuffix`, `rsuffix`로 접미어를 붙여 구분한다.

```python
stock_info.join(stock_2016)  # 양쪽에 Symbol 컬럼이 있다
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: columns overlap but no suffix specified: Index([&#x27;Symbol&#x27;], dtype=&#x27;str&#x27;)</div></div>

```python
stock_info.join(stock_2016, lsuffix="_info")[["Symbol_info", "Name", "Symbol", "Shares"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol_info</th><th>Name</th><th>Symbol</th><th>Shares</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>Apple Inc</td><td>AAPL</td><td>80.0</td></tr><tr><th class="idx">1</th><td>TSLA</td><td>Tesla Inc</td><td>TSLA</td><td>50.0</td></tr><tr><th class="idx">2</th><td>WMT</td><td>Walmart Inc</td><td>WMT</td><td>40.0</td></tr><tr><th class="idx">3</th><td>GE</td><td>General Electric</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">4</th><td>IBM</td><td>IBM(International Business Machines Co)</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">5</th><td>SLB</td><td>Schlumberger Limited.</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">6</th><td>TXN</td><td>Texas Instruments Incorporated</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">7</th><td>AMZN</td><td>Amazon.com, Inc</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

에러는 피했지만 이 조인은 종목 코드를 보고 붙인 것이 아니다. 두 DataFrame 모두 index가 0, 1, 2…라서 **index가 같은 행끼리** 붙었다. 두 파일의 앞 세 종목 순서가 우연히 AAPL, TSLA, WMT로 같아서 맞아 보일 뿐이다. 조인 기준을 종목 코드로 하려면 먼저 `Symbol`을 index로 만든다.

```python
stock_info.set_index("Symbol").join(stock_2016.set_index("Symbol"))[["Name", "Shares", "Low", "High"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th>Symbol</th><th>Name</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">AAPL</th><td>Apple Inc</td><td>80.0</td><td>95.0</td><td>110.0</td></tr><tr><th class="idx">TSLA</th><td>Tesla Inc</td><td>50.0</td><td>80.0</td><td>130.0</td></tr><tr><th class="idx">WMT</th><td>Walmart Inc</td><td>40.0</td><td>55.0</td><td>70.0</td></tr><tr><th class="idx">GE</th><td>General Electric</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">IBM</th><td>IBM(International Business Machines Co)</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">SLB</th><td>Schlumberger Limited.</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">TXN</th><td>Texas Instruments Incorporated</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">AMZN</th><td>Amazon.com, Inc</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

이제 종목 코드가 같은 행끼리 붙었다. Left Outer Join이라 2016년에 보유하지 않은 종목(GE, IBM, …)도 남고 주식 정보가 `NaN`이다.

```python
stock_info.set_index("Symbol").join(
    stock_2016.set_index("Symbol"),
    how="inner"  # inner join: 양쪽에 다 있는 종목만
)[["Name", "Shares", "Low", "High"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th>Symbol</th><th>Name</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">AAPL</th><td>Apple Inc</td><td>80</td><td>95</td><td>110</td></tr><tr><th class="idx">TSLA</th><td>Tesla Inc</td><td>50</td><td>80</td><td>130</td></tr><tr><th class="idx">WMT</th><td>Walmart Inc</td><td>40</td><td>55</td><td>70</td></tr></tbody></table></div></div>

| `how` | 남는 행 |
|---|---|
| `"left"` (기본) | 왼쪽(호출한 쪽) 전부 |
| `"right"` | 오른쪽 전부 |
| `"outer"` | 양쪽 전부 |
| `"inner"` | 양쪽에 다 있는 것만 |

### 여러 DataFrame을 한 번에

연도별 표는 컬럼 이름(`Shares`, `Low`, `High`)이 같아서 그대로 조인하면 이름이 겹친다. `add_suffix()`로 모든 컬럼 이름 뒤에 연도를 붙인다.

| 메소드 | 하는 일 |
|---|---|
| `add_suffix(접미어)` | 모든 컬럼 이름 **뒤에** 붙인다 |
| `add_prefix(접두어)` | 모든 컬럼 이름 **앞에** 붙인다 |

```python
s_2016 = stock_2016.set_index("Symbol").add_suffix("_2016")
s_2017 = stock_2017.set_index("Symbol").add_suffix("_2017")
s_2018 = stock_2018.set_index("Symbol").add_suffix("_2018")
s_2018
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th>Symbol</th><th>Shares_2018</th><th>Low_2018</th><th>High_2018</th></tr></thead><tbody><tr><th class="idx">AAPL</th><td>40</td><td>135</td><td>170</td></tr><tr><th class="idx">AMZN</th><td>8</td><td>900</td><td>1125</td></tr><tr><th class="idx">TSLA</th><td>50</td><td>220</td><td>400</td></tr></tbody></table></div></div>

```python
join = stock_info.set_index("Symbol").join([s_2016, s_2017, s_2018])
join.drop(columns="Info")  # 설명 열은 길어서 제외
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 10열</div><div class="sql-result-scroll"><table><thead><tr><th>Symbol</th><th>Name</th><th>Shares_2016</th><th>Low_2016</th><th>High_2016</th><th>Shares_2017</th><th>Low_2017</th><th>High_2017</th><th>Shares_2018</th><th>Low_2018</th><th>High_2018</th></tr></thead><tbody><tr><th class="idx">AAPL</th><td>Apple Inc</td><td>80.0</td><td>95.0</td><td>110.0</td><td>50.0</td><td>120.0</td><td>140.0</td><td>40.0</td><td>135.0</td><td>170.0</td></tr><tr><th class="idx">TSLA</th><td>Tesla Inc</td><td>50.0</td><td>80.0</td><td>130.0</td><td>100.0</td><td>100.0</td><td>300.0</td><td>50.0</td><td>220.0</td><td>400.0</td></tr><tr><th class="idx">WMT</th><td>Walmart Inc</td><td>40.0</td><td>55.0</td><td>70.0</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">GE</th><td>General Electric</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>100.0</td><td>30.0</td><td>40.0</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">IBM</th><td>IBM(International Business Machines Co)</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>87.0</td><td>75.0</td><td>95.0</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">SLB</th><td>Schlumberger Limited.</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>20.0</td><td>55.0</td><td>85.0</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">TXN</th><td>Texas Instruments Incorporated</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>500.0</td><td>15.0</td><td>23.0</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">AMZN</th><td>Amazon.com, Inc</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>8.0</td><td>900.0</td><td>1125.0</td></tr></tbody></table></div></div>

종목 8개 각각의 2016~2018년 보유 현황이 한 표에 모였다. 노트북에서는 `s_2016` 등을 정의하기 전에 이 셀을 실행해서 `NameError`가 났었다. 셀 실행 순서가 꼬이면 생기는 문제라 이 글에서는 정의를 먼저 두었다.

## merge(): 컬럼 기준 조인

```python
df_a.merge(df_b, how="inner", on=None, left_on=None, right_on=None,
           left_index=False, right_index=False, suffixes=("_x", "_y"))
```

- **두 개**의 DataFrame만 조인한다.
- **조인 기준**: 기본은 **이름이 같은 컬럼**의 값이 같은 행끼리. 매개변수로 다양하게 바꿀 수 있다.
- **기본 방식**: Inner Join

| 매개변수 | 의미 |
|---|---|
| `on` | 같은 이름의 컬럼이 여러 개일 때 조인 기준 컬럼 지정 |
| `left_on`, `right_on` | 왼쪽·오른쪽의 기준 컬럼 이름이 다를 때 |
| `left_index`, `right_index` | index를 기준으로 쓸 때 `True` |
| `how` | `"inner"`(기본), `"left"`, `"right"`, `"outer"` |
| `suffixes` | 같은 이름의 컬럼에 붙일 접미어. 생략하면 `_x`, `_y` |

```python
stock_info.merge(stock_2016)[["Symbol", "Name", "Shares", "Low", "High"]]
# 두 DataFrame에서 같은 이름의 컬럼(Symbol) 값이 같은 행끼리, inner join
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 5열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Name</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>Apple Inc</td><td>80</td><td>95</td><td>110</td></tr><tr><th class="idx">1</th><td>TSLA</td><td>Tesla Inc</td><td>50</td><td>80</td><td>130</td></tr><tr><th class="idx">2</th><td>WMT</td><td>Walmart Inc</td><td>40</td><td>55</td><td>70</td></tr></tbody></table></div></div>

`join()`과 달리 `set_index()` 없이도 같은 이름의 컬럼(`Symbol`)을 찾아 바로 조인했다.

**한쪽은 컬럼, 한쪽은 index로 조인**

```python
stock_info.merge(s_2016, left_on="Symbol", right_index=True)[["Symbol", "Name", "Shares_2016"]]
# 왼쪽(stock_info)의 Symbol 컬럼과 오른쪽(s_2016)의 index가 같은 행끼리
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Name</th><th>Shares_2016</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>Apple Inc</td><td>80</td></tr><tr><th class="idx">1</th><td>TSLA</td><td>Tesla Inc</td><td>50</td></tr><tr><th class="idx">2</th><td>WMT</td><td>Walmart Inc</td><td>40</td></tr></tbody></table></div></div>

**기준 컬럼 이름이 서로 다를 때**

```python
s_2018_2 = stock_2018.add_suffix("_2018")  # Symbol도 Symbol_2018이 된다
s_2018_2.merge(stock_info, left_on="Symbol_2018", right_on="Symbol")[["Symbol_2018", "Shares_2018", "Symbol", "Name"]]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol_2018</th><th>Shares_2018</th><th>Symbol</th><th>Name</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>40</td><td>AAPL</td><td>Apple Inc</td></tr><tr><th class="idx">1</th><td>AMZN</td><td>8</td><td>AMZN</td><td>Amazon.com, Inc</td></tr><tr><th class="idx">2</th><td>TSLA</td><td>50</td><td>TSLA</td><td>Tesla Inc</td></tr></tbody></table></div></div>

**같은 이름의 컬럼이 여러 개일 때: on, suffixes**

```python
stock_2016.merge(stock_2018, on="Symbol")  # Symbol만 기준으로
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 7열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares_x</th><th>Low_x</th><th>High_x</th><th>Shares_y</th><th>Low_y</th><th>High_y</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>80</td><td>95</td><td>110</td><td>40</td><td>135</td><td>170</td></tr><tr><th class="idx">1</th><td>TSLA</td><td>50</td><td>80</td><td>130</td><td>50</td><td>220</td><td>400</td></tr></tbody></table></div></div>

`stock_2016`과 `stock_2018`은 `Symbol`, `Shares`, `Low`, `High`가 모두 같은 이름이다. `on` 없이 merge하면 네 컬럼이 **모두 같은** 행만 찾아서 결과가 비어 버린다. `on="Symbol"`로 기준을 하나로 정하고, 나머지 겹치는 컬럼에는 `_x`, `_y`가 붙었다.

```python
stock_2016.merge(stock_2018, on="Symbol", suffixes=["_2016", "_2018"])
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 2행 × 7열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares_2016</th><th>Low_2016</th><th>High_2016</th><th>Shares_2018</th><th>Low_2018</th><th>High_2018</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>80</td><td>95</td><td>110</td><td>40</td><td>135</td><td>170</td></tr><tr><th class="idx">1</th><td>TSLA</td><td>50</td><td>80</td><td>130</td><td>50</td><td>220</td><td>400</td></tr></tbody></table></div></div>

### 보충: on 없이 merge하면

```python
stock_2016.merge(stock_2018)  # Symbol, Shares, Low, High 네 컬럼이 모두 같아야 조인
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 0행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares</th><th>Low</th><th>High</th></tr></thead><tbody></tbody></table></div></div>

### 보충: how로 방식 바꾸기

```python
stock_2016.merge(stock_2018, on="Symbol", how="outer", suffixes=["_2016", "_2018"])
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 7열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Symbol</th><th>Shares_2016</th><th>Low_2016</th><th>High_2016</th><th>Shares_2018</th><th>Low_2018</th><th>High_2018</th></tr></thead><tbody><tr><th class="idx">0</th><td>AAPL</td><td>80.0</td><td>95.0</td><td>110.0</td><td>40.0</td><td>135.0</td><td>170.0</td></tr><tr><th class="idx">1</th><td>AMZN</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td>8.0</td><td>900.0</td><td>1125.0</td></tr><tr><th class="idx">2</th><td>TSLA</td><td>50.0</td><td>80.0</td><td>130.0</td><td>50.0</td><td>220.0</td><td>400.0</td></tr><tr><th class="idx">3</th><td>WMT</td><td>40.0</td><td>55.0</td><td>70.0</td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td><td><span class="sql-null">NaN</span></td></tr></tbody></table></div></div>

`outer`로 바꾸면 2016년에만 있던 WMT, 2018년에만 있는 AMZN도 결과에 남는다.

## 무엇을 쓸까

필기 마지막에 정리한 기준이다.

| 상황 | 함수 |
|---|---|
| 하나의 데이터셋을 행이나 열 기준으로 나눈 것을 다시 합칠 때 | `concat()` |
| 수직 결합 | `concat()` (유일한 방법) |
| 서로 연관된 다른 데이터셋을 합쳐 볼 때 (조인) | `join()`, `merge()` |
| 셋 이상의 DataFrame을 한 번에 조인 | `join()` |
| 두 DataFrame 조인 | `merge()` (기준을 세밀하게 지정하기 쉽다) |

SQL과 짝지으면 다음과 같다.

| SQL | Pandas |
|---|---|
| `UNION ALL` | `pd.concat([a, b])` |
| `a JOIN b ON a.key = b.key` | `a.merge(b, on="key")` |
| `a LEFT JOIN b ON ...` | `a.merge(b, on="key", how="left")` 또는 index 기준 `a.join(b)` |

## 정리

- `concat()`은 이름(컬럼 이름, index 이름)이 같은 것끼리 이어 붙이고, `keys`로 출처를 남길 수 있다.
- `join()`은 index 기준, 기본 left join이다. 기준 컬럼은 `set_index()`로 먼저 index로 만든다.
- `merge()`는 컬럼 기준, 기본 inner join이다. 겹치는 컬럼이 많으면 `on`으로 기준을 정한다.
- 같은 이름의 컬럼은 `join`에서는 에러, `merge`에서는 `_x`, `_y`가 붙는다. `add_suffix`나 `suffixes`로 미리 이름을 정리한다.
- `glob()` 결과는 `sorted()`로 순서를 고정한다.
