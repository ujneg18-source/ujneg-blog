---
title: "Matplotlib 개요: Figure·Axes와 두 가지 그리기 방식"
description: "데이터 시각화가 왜 필요한지 앤스컴 4분할 그래프로 확인하고, Matplotlib의 한글 설정, Figure·Axes 구조, pyplot 함수 방식과 객체지향 방식, 색상과 스타일 지정을 정리합니다."
category: 'Tech'
subcategory: 'Data Analysis'
series: '데이터 시각화'
seriesOrder: 1
originalNotebook: "01_matplotlib 개요.ipynb"
tags: ["Python","Matplotlib","Visualization"]
date: 2026-05-06
---

> SKN31 데이터 분석 실습 노트북 `01_matplotlib 개요.ipynb`의 필기를 바탕으로 정리했습니다.
> 노트북에는 실행하지 않은 셀이 많아서, 필기 순서대로 다시 실행한 결과를 실었습니다(matplotlib 3.10). 글의 그래프는 한글 글꼴로 Noto Sans CJK를 썼습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 데이터 시각화가 필요한 이유와 앤스컴 4분할 그래프
- 파이썬 시각화 라이브러리
- Matplotlib 설치와 한글 처리
- 그래프 구성요소: Figure, Axes, Axis, Ticks, Title, Legend
- 그래프를 그리는 두 가지 방식: pyplot 함수, Figure·Axes 객체
- 색상과 스타일

## 데이터 시각화의 개념과 필요성

**데이터 시각화**는 데이터 분석 결과를 쉽게 이해하고 판단할 수 있도록 시각적으로 표현해 전달하는 과정이다.

**필요성**

- 많은 양의 데이터를 **한눈에 파악**할 수 있다. 시각적 요소로 데이터를 요약한다.
- 데이터 분석 지식이 없어도 누구나 데이터를 인지하고 활용할 수 있다.
  - 사람이 감각기관으로 얻는 정보의 80%는 시각에서 온다.
  - 시각적인 입력은 다른 어떤 방법보다 빠르고 쉽게 이해된다.
  - 형태, 요소, 위치, 색 등으로 패턴이나 인사이트(의미 있는 정보)를 끌어내고 표현할 수 있다.
- 단순 요약이나 통계 분석 결과보다 **정확한** 분석 결과를 끌어낼 수 있다.
  - 패턴, 추세, 데이터 간 비교처럼 표(Table)로는 알아보기 어려운 것을 쉽게 확인할 수 있다.

### 앤스컴 4분할 그래프 (Anscombe's quartet)

시각화의 중요성을 보여 주는 예다. 4개의 데이터셋은 평균, 표준편차, 상관계수 같은 **통계량이 거의 같다.** 통계량으로는 같은 데이터셋이다. 그런데 그래프로 그리면 전혀 다르다. ([위키백과](https://ko.wikipedia.org/wiki/%EC%95%A4%EC%8A%A4%EC%BB%B4_%EC%BD%B0%EB%A5%B4%ED%85%9F))

> **보충** 필기에는 링크만 있어서 직접 확인했다. 앤스컴이 1973년 논문에 실은 값 그대로다.

```python
import numpy as np
import pandas as pd

x = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5]
quartet = {
    "I":   (x, [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]),
    "II":  (x, [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]),
    "III": (x, [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]),
    "IV":  ([8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]),
}

stats = pd.DataFrame({
    name: {
        "x 평균": np.mean(xs), "y 평균": np.mean(ys),
        "x 분산": np.var(xs, ddof=1), "y 분산": np.var(ys, ddof=1),
        "상관계수": np.corrcoef(xs, ys)[0, 1],
    }
    for name, (xs, ys) in quartet.items()
}).round(2)
stats
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>I</th><th>II</th><th>III</th><th>IV</th></tr></thead><tbody><tr><th class="idx">x 평균</th><td>9.0</td><td>9.0</td><td>9.0</td><td>9.0</td></tr><tr><th class="idx">y 평균</th><td>7.5</td><td>7.5</td><td>7.5</td><td>7.5</td></tr><tr><th class="idx">x 분산</th><td>11.0</td><td>11.0</td><td>11.0</td><td>11.0</td></tr><tr><th class="idx">y 분산</th><td>4.13</td><td>4.13</td><td>4.12</td><td>4.12</td></tr><tr><th class="idx">상관계수</th><td>0.82</td><td>0.82</td><td>0.82</td><td>0.82</td></tr></tbody></table></div></div>

네 데이터셋의 평균, 분산, 상관계수가 소수 둘째 자리까지 같다. 그래프로 그려 보면 이렇다.

```python
fig, axes = plt.subplots(1, 4, figsize=(14, 3.2), sharex=True, sharey=True)
for ax, (name, (xs, ys)) in zip(axes, quartet.items()):
    ax.scatter(xs, ys)
    ax.set_title(name)
plt.tight_layout()
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-1.png)

I은 흩어진 선형 관계, II는 곡선, III은 직선 위에 이상치 하나, IV는 x가 거의 하나의 값이고 점 하나가 상관계수를 만들고 있다. 통계량만 보고 "넷 다 같은 데이터"라고 판단하면 틀린다.

## 대표적인 파이썬 시각화 라이브러리

| 라이브러리 | 필기 |
|---|---|
| **matplotlib** | 자유도가 높다 ↔ 진입장벽이 높다 |
| seaborn | matplotlib 기반. 통계 그래프에 특화 |
| pandas | DataFrame·Series에서 바로 그린다 (matplotlib 기반) |
| plotly | 자바스크립트 기반. 동적인 상호작용이 강하다 |
| folium | 지도 그리기가 목표 |

## Matplotlib

- 데이터 시각화를 위한 파이썬 패키지다. [matplotlib.org](https://matplotlib.org)
- 2차원 그래프용이지만 확장 API로 3D 그래프 등 다양한 형식을 지원한다.
- 다른 파이썬 시각화 패키지의 기본이 된다. Seaborn, Pandas도 Matplotlib을 기반으로 쓴다.

```bash
pip install matplotlib
```

### 한글 처리

matplotlib의 기본 글꼴은 한글을 지원하지 않는다. 그대로 그리면 한글이 네모(□)로 깨진다. 글꼴 설정을 바꾸는 방법은 두 가지다.

| 방법 | 적용 범위 | 언제 |
|---|---|---|
| **설정 파일**(`matplotlibrc`) 수정 | 그 matplotlib을 쓰는 모든 코드 | 항상 적용할 설정 |
| **코드**로 변경 | 그 프로그램이 실행되는 동안만 | 현재 애플리케이션에만 적용할 설정 |

글꼴뿐 아니라 그래프 관련 설정은 모두 이 두 방법으로 바꾼다.

**1. 설정 파일에서 바꾸기**

`matplotlibrc` 파일에서 두 줄을 고친다. matplotlib을 설치한 뒤 한 번만 하면 된다.

```text
font.family: Malgun Gothic
axes.unicode_minus: False
```

`axes.unicode_minus`를 `False`로 하는 건, 한글 글꼴에 유니코드 마이너스 기호가 없어서 음수의 `-`가 깨지기 때문이다.

파일 위치는 이렇게 찾는다.

```python
# matplotlib 설정파일 (matplotlibrc 경로 조회)
import matplotlib as mpl
print(mpl.matplotlib_fname())
```

```text
C:\Documents\SKN31_JY\SKN31\04_Pandas를 이용한 정형데이터 분석\.venv\Lib\site-packages\matplotlib\mpl-data\matplotlibrc
```

> **보충 · 가상환경마다 따로 고쳐야 한다**
> 위 경로를 보면 `matplotlibrc`가 `04_Pandas...` 폴더의 **`.venv` 안**에 있다. 가상환경마다 matplotlib이 따로 설치되니, 설정 파일을 고치는 방법은 가상환경을 새로 만들 때마다 다시 해야 한다. 그리고 `pip install -U matplotlib`으로 업그레이드하면 이 파일이 새로 덮어써질 수 있다. 그래서 실제로는 아래 코드 방식을 노트북 맨 위에 두는 경우가 많다.
> 필기의 `font.famliy`는 `font.family` 오타다. 설정 파일에서 이름이 틀리면 matplotlib이 경고만 하고 무시한다.

**2. 코드로 바꾸기**

```python
import matplotlib.pyplot as plt

plt.rcParams["font.family"] = "malgun gothic"
plt.rcParams["axes.unicode_minus"] = False
```

> **보충 · Mac에서는 맑은 고딕이 없다**
> `Malgun Gothic`은 Windows 글꼴이다. Mac에서는 기본으로 들어 있는 `AppleGothic`을 쓴다. OS에 따라 자동으로 고르게 하면 같은 노트북을 양쪽에서 쓸 수 있다.
>
> ```python
> import platform
> import matplotlib.pyplot as plt
>
> plt.rcParams["font.family"] = "AppleGothic" if platform.system() == "Darwin" else "Malgun Gothic"
> plt.rcParams["axes.unicode_minus"] = False
> ```

설치된 글꼴 중 한글 글꼴의 **이름**을 찾을 때는 `font_manager`를 쓴다. 노트북에서는 이름에 `si`가 들어간 글꼴을 찾아봤다.

```python
# 폰트 경로 조회
import matplotlib.font_manager as fm

font_list = fm.findSystemFonts(fontpaths=None, fontext="ttf")  # ttf, otf
[(font_path, fm.FontProperties(fname=font_path).get_name())
 for font_path in font_list if "si" in font_path.lower()]
```

```text
[('C:\\Windows\\Fonts\\SitkaVF-Italic.ttf', 'Sitka'),
 ('C:\\Windows\\Fonts\\SitkaVF.ttf', 'Sitka'),
 ('C:\\Windows\\Fonts\\timesi.ttf', 'Times New Roman'),
 ('C:\\Windows\\Fonts\\simsun.ttc', 'SimSun'),
 ...]
```

`rcParams`에 넣는 건 파일명(`simsun.ttc`)이 아니라 오른쪽의 **글꼴 이름**(`SimSun`)이다.

### 첫 그래프

노트북 맨 앞의 예제다. 과일별 공급량을 막대그래프로 그렸다.

```python
fig, ax = plt.subplots(figsize=(10, 5))

fruits = ["사과", "블루베리", "체리", "오렌지", "바나나"]
counts = [40, 100, 30, 55, 70]
bar_labels = ["빨강", "파랑", "분홍", "주황", "노랑"]
bar_colors = ["red", "blue", "pink", "orange", "yellow"]

ax.bar(fruits, counts, label=bar_labels, color=bar_colors, width=0.3)

ax.set_ylabel("fruit supply")
ax.set_title("과일 공급량")
ax.legend(title="과일색")
ax.grid(True, linestyle="--", alpha=1)

fig.set_facecolor("white")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-2.png)

`label`에 리스트를 주면 막대마다 이름이 붙어서 범례에 막대별 색이 나온다.

## 그래프 구성요소

![Matplotlib 그래프 구성요소](https://matplotlib.org/stable/_images/anatomy.png)

| 요소 | 설명 |
|---|---|
| **figure** | 전체 그래프가 위치할 기본 틀. 하나의 figure에 여러 그래프를 그릴 수 있다 |
| **axes**(subplot) | figure 안에서 **그래프 하나**를 그리는 공간. figure를 axes 하나 이상으로 구성해 각 axes에 그린다 |
| **axis** | 값을 표시하는 축(x축, y축). 축의 설명은 axis label |
| **ticks** | 축의 값을 알려 주는 눈금. Major tick, Minor tick |
| **title** | 플롯 제목 |
| **legend**(범례) | 한 axes에 여러 그래프를 그렸을 때 각 그래프의 설명 |

이름이 비슷한 **axes**(그래프 공간)와 **axis**(축)를 헷갈리기 쉽다.

노트북에서 구성요소를 하나씩 붙여 본 셀이다.

```python
fig = plt.figure(figsize=(30, 7), facecolor="gray")  # facecolor: figure의 배경색
axes1 = fig.add_subplot(1, 2, 1)

axes1.plot([1, 2, 3, 4, 5], [10, 20, 30, 40, 50], label="line1", color="pink")
axes1.grid(True, linestyle="--", alpha=1)

axes1.set_title("PLOT 1", size=20)
axes1.set_xlabel("X축", size=15)
axes1.set_ylabel("Y축", size=15)
axes1.legend()
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-3.png)

회색이 figure, 그 안의 흰 영역이 axes다. `add_subplot(1, 2, 1)`로 1행 2열 중 첫 칸에만 그려서 오른쪽 절반이 비었다. 주석 처리한 두 번째 axes를 살리면 오른쪽에 그래프가 하나 더 생긴다.

> **보충** `figsize=(30, 7)`은 가로 30인치라서 화면에 맞추면 글자가 아주 작아진다. 보통 `(10, 4)`~`(15, 5)` 정도를 쓴다.

## 그래프 그리기 순서

1. `matplotlib.pyplot` 모듈을 import한다. 2차원 그래프 함수를 제공하는 모듈이고, 관례적으로 `plt`라는 별칭을 쓴다.
2. 그래프를 그린다.
3. 그래프에 필요한 설정을 한다.
4. 화면에 그린다.
   - **지연 렌더링(Deferred rendering)**: 마지막에 `plt.show()`를 호출할 때 실제로 그린다.
   - 주피터 노트북에서는 생략할 수 있다.

## 그래프를 그리는 두 가지 방식

| 방식 | 사용하는 것 | 어울리는 곳 |
|---|---|---|
| pyplot 방식 | `plt.plot()`, `plt.title()` 같은 **pyplot 모듈 함수** | 그래프 하나를 빠르게 그릴 때 |
| 객체지향 방식 | `fig`, `ax` 같은 **Figure·Axes 객체의 메소드** | 그래프 여러 개를 배치하거나 세밀하게 설정할 때 |

### pyplot 모듈로 그리기

pyplot 모듈이 그래프 그리는 함수와 Axes 설정 함수를 제공한다.

```python
# 그래프에 사용할 데이터
x = [1,  2,  3,  4,  5]
y = [10, 5, 30, 30, 50]

# 그래프 그리기 (선그래프)
plt.plot(x, y)

### 그래프에 여러 설정
plt.title("그래프 제목", fontsize="25")
plt.xlabel("X축 Label")
plt.ylabel("Y축 Label")
plt.grid(True, linestyle=":")

# 파일로 저장
plt.savefig("line.png")
# 그래프를 화면에 출력
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-4.png)

`plt.savefig()`는 **`plt.show()`보다 먼저** 호출해야 한다. `show()`가 끝나면 그래프가 비워져서, 뒤에서 저장하면 빈 그림이 저장된다.

**하나의 figure에 여러 그래프**: `plt.subplot(행, 열, 번호)`. 번호는 1부터, 좌→우, 상→하 순서다.

```python
plt.figure(figsize=(10, 5))  # 전체 figure 크기 (좌우너비, 상하높이), 단위: inch

plt.subplot(2, 2, 1)   # (2행, 2열, 첫 번째 위치)
plt.plot(x, y)
plt.scatter(x, x)
plt.title("1번 그래프")

plt.subplot(1, 2, 2)   # (1행, 2열, 두 번째 위치)
plt.plot(y, x)
plt.title("2번 그래프")

plt.subplot(2, 2, 3)   # (2행, 2열, 세 번째 위치)
plt.scatter(x, y)
plt.title("3번 그래프")

plt.tight_layout()
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-5.png)

2번 그래프는 `(1, 2, 2)`라서 **1행 2열의 오른쪽 칸 전체**를 쓴다. 왼쪽은 `(2, 2, …)`로 위아래 두 칸으로 나눴다. 이렇게 칸 나누기를 섞으면 크기가 다른 그래프를 배치할 수 있다. `tight_layout()`은 그래프끼리 제목이 겹치지 않게 간격을 맞춘다.

**하나의 axes에 여러 그래프**: `show()` 전에 그리는 함수를 여러 번 호출하면 같은 axes에 겹쳐 그린다.

```python
# 최종 출력 전에 그래프 그리는 함수들을 호출하면 하나의 axes에 모두 그린다
plt.plot(x, y, label="1번 선")  # label: 그래프의 이름
plt.plot(y, x, label="2번 선")
plt.scatter(y, y, label="1번 점", color="green")
plt.legend()  # 각 그래프의 label로 범례 출력
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-6.png)

### Figure와 Axes 객체로 그리기 (객체지향 방식)

Axes 객체의 메소드로 그래프를 그린다. axes를 만드는 방법은 세 가지다.

| 방법 | 만드는 것 | 언제 |
|---|---|---|
| `plt.gca()` | 지금 그리고 있는 axes 하나 | figure에 axes가 하나일 때 |
| `fig.add_subplot()` | figure를 먼저 만들고 axes를 하나씩 추가 | axes를 따로따로 배치할 때 |
| `plt.subplots()` | figure와 **axes 배열**을 한 번에 | 격자로 여러 개를 만들 때 |

pyplot 함수와 Axes 메소드는 이름이 조금 다르다. 설정 메소드에는 `set_`이 붙는다.

| pyplot | Axes 메소드 |
|---|---|
| `plt.title()` | `ax.set_title()` |
| `plt.xlabel()`, `plt.ylabel()` | `ax.set_xlabel()`, `ax.set_ylabel()` |
| `plt.xlim()`, `plt.xticks()` | `ax.set_xlim()`, `ax.set_xticks()` |
| `plt.plot()`, `plt.legend()`, `plt.grid()` | `ax.plot()`, `ax.legend()`, `ax.grid()` |

**figure에 axes 하나: `plt.gca()`**

```python
axes = plt.gca()  # 그래프를 그릴 Axes 객체를 생성
print(type(axes))

# 그래프 그리기, 설정 메소드 -> Axes
axes.plot(x, y)
axes.set_title("선그래프")
axes.set_xlabel("X축값")
axes.set_ylabel("Y축값")
axes.grid(linestyle=":")
plt.show()
```

```text
<class 'matplotlib.axes._axes.Axes'>
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-7.png)

**여러 axes: `figure.add_subplot()`**

figure 객체에 axes를 추가한다. `(총행수, 총열수, 위치)`를 지정한다.

```python
fig = plt.figure(figsize=(6, 6))  # figure 생성

ax1 = fig.add_subplot(2, 2, 1)  # figure에 axes 추가
ax1.plot(x, y, label="선1")
ax1.plot(y, x, label="선2")
ax1.set_title("1번 그래프")
ax1.legend()

ax2 = fig.add_subplot(2, 2, 3)
ax2.scatter(x, y)
ax2.set_title("2번 그래프")

ax3 = fig.add_subplot(3, 2, 4)
ax3.plot(x, y, color="0.8")
ax3.set_title("3번 그래프")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-8.png)

3번 그래프는 `(3, 2, 4)`, 즉 **3행 2열** 격자의 4번째 칸이다. 다른 두 개는 2행 2열 격자를 기준으로 했으니 3번만 높이가 낮고 오른쪽 가운데 떠 있다. 의도한 게 아니라면 격자 크기를 하나로 맞춘다.

**여러 axes: `plt.subplots()`**

`nrows`, `ncols`로 axes 개수와 위치를 정한다. figure와, axes들을 담은 **ndarray**를 반환한다.

```python
fig, axes = plt.subplots(2, 2, figsize=(7, 7))
print(type(axes), axes.shape)

axes[0, 0].plot(x, y, color="r")
axes[0, 0].set_title("1번")

axes[1, 1].scatter(y, x, color="#E06F93")
axes[1, 1].set_title("2번")
plt.show()
```

```text
<class 'numpy.ndarray'> (2, 2)
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-9.png)

axes가 2차원 배열이라 `axes[행, 열]`로 꺼낸다. 그리지 않은 두 칸도 빈 axes로 남는다.

## 색상과 스타일

### 색 지정

`color` 또는 `c` 매개변수로 지정한다.

| 방법 | 예 |
|---|---|
| 색 이름 또는 약자 | `"red"`, `"r"` |
| HTML Hex code (`#RRGGBB`, `#RRGGBBAA`) | `"#FF0000"`, `"#00FF00FA"` |
| 0 ~ 1 사이 실수(문자열) → 회색조 | `"0"` 검정, `"1"` 흰색, `"0.5"` 회색 |

| 색 | 약자 | 색 | 약자 |
|---|---|---|---|
| blue | `b` | magenta | `m` |
| green | `g` | yellow | `y` |
| red | `r` | black | `k` |
| cyan | `c` | white | `w` |

색 값 찾기: [matplotlib named colors](https://matplotlib.org/stable/gallery/color/named_colors.html), [htmlcolorcodes.com](https://htmlcolorcodes.com/), 구글에서 `color picker` 검색

```python
plt.plot(x, y, color="m")
plt.plot(y, x, c="#4432ba", alpha=0.5)  # alpha: 투명도. 0 ~ 1 실수
plt.plot(x, y, c="0.5")
plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-10.png)

회색조 값은 숫자가 아니라 **문자열** `"0.5"`로 넣어야 한다.

### Style

그래프의 여러 시각 효과를 미리 묶어 둔 설정이다. matplotlib에 여러 스타일이 정의돼 있다([스타일 목록](https://matplotlib.org/stable/gallery/style_sheets/style_sheets_reference.html)).

- `plt.style.available`: 쓸 수 있는 스타일 이름 조회
- `plt.style.use(스타일)`: 스타일 적용

```python
print(len(plt.style.available))
plt.style.available[:8]
```

```text
29
```

```text
['Solarize_Light2', '_classic_test_patch', '_mpl-gallery', '_mpl-gallery-nogrid', 'bmh', 'classic', 'dark_background', 'fast']
```

```python
with plt.style.context("seaborn-v0_8-muted"):
    plt.plot(x, y, label="선1")
    plt.plot(y, x, label="선2")
    plt.title("seaborn-v0_8-muted 스타일")
    plt.legend()
    plt.show()
```

![그래프 출력](/images/visualization/viz-matplotlib-overview-11.png)

> **보충** 노트북은 `plt.style.use("seaborn-v0_8-muted")`를 썼다. `use()`는 그 뒤 **모든 그래프**에 적용되고 한글 글꼴 설정까지 덮어쓸 수 있다. 그래프 몇 개에만 적용하려면 위처럼 `with plt.style.context(...)`로 감싸면 블록이 끝날 때 원래 설정으로 돌아온다. 스타일을 쓴 뒤 한글이 깨지면 글꼴 설정을 다시 해 준다.

## 정리

- 통계량이 같아도 데이터는 전혀 다를 수 있다. 그래서 그려 봐야 한다(앤스컴 4분할).
- 한글은 `font.family`와 `axes.unicode_minus`를 바꿔야 한다. Windows는 Malgun Gothic, Mac은 AppleGothic. 설정 파일은 가상환경마다 따로라 코드로 설정하는 게 편하다.
- **figure**는 전체 틀, **axes**는 그래프 하나가 들어가는 공간, **axis**는 축이다.
- pyplot 함수 방식(`plt.title`)은 간단하고, 객체지향 방식(`ax.set_title`)은 여러 그래프를 다루기 좋다.
- `subplot`의 격자 크기를 섞으면 크기가 다른 배치를 만들 수 있지만, 의도치 않게 섞으면 그래프가 엉뚱한 자리에 생긴다.
- `savefig()`는 `show()`보다 먼저.
