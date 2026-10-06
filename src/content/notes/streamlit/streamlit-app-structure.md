---
title: "Streamlit 앱 구조: 레이아웃·캐시·사이드바·멀티 페이지"
description: "columns로 화면을 나누는 레이아웃, 다시 실행될 때마다 반복되는 작업을 막는 cache_data와 cache_resource, 조건 입력용 sidebar, pages 폴더와 page_link로 여러 페이지 앱을 만드는 방법을 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Streamlit'
seriesOrder: 3
originalNotebook: "streamlit/04_layout_cache.py, 05_sidebar.py, 06_paging.py"
tags: ["Python","Streamlit","Cache"]
date: 2026-04-21
---

> SKN31 Python 과정의 Streamlit 실습 파일 `04_layout_cache.py`, `05_sidebar.py`, `06_paging.py`와 `pages__` 폴더를 바탕으로 정리했습니다.
> 화면 캡처와 캐시 동작 확인은 실습 코드를 Streamlit 1.65에서 다시 실행해 얻은 결과입니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- `st.columns()`로 한 행을 여러 열로 나누기
- Streamlit의 재실행 구조와 캐시(`@st.cache_data`, `@st.cache_resource`)
- 조건 입력을 모으는 `st.sidebar`
- `pages` 폴더와 `st.page_link()`로 여러 페이지 앱 만들기

## 레이아웃: st.columns()

`st.columns(나눌 개수)`는 행을 여러 열로 나누고, 각 열을 **컨테이너 객체**로 돌려준다. `st.` 대신 `열객체.`으로 함수를 호출하면 그 열 안에 출력된다.

```python
import streamlit as st
import pandas as pd

st.set_page_config(page_title="Layout&Cache", layout="wide")

col1, col2 = st.columns(2)
col11, col12 = col1.columns(2)  # col1을 다시 두 열로 나눔

col11.title("제목")
col11.header("중제목")
col11.subheader("소제목")
col11.text("일반 글1")
col11.text("일반 글2")
col11.markdown("**볼드체**")

col12.write("# 제목")
col12.write("## 중제목")
col12.write("### 소제목")
col12.write("일반글")
```

열 안에서 다시 `columns()`를 호출해 **중첩**할 수 있다. 위 코드는 화면을 반으로 나눈 뒤 왼쪽 절반을 다시 반으로 나눴다. 그래서 내용이 화면의 왼쪽 1/4, 2/4 칸에만 나오고 오른쪽 절반(`col2`)은 비어 있다.

`col11`(title·header 함수)과 `col12`(마크다운 `#`)의 출력이 같은 크기로 나온다는 점도 확인할 수 있다.

**환율 정보를 네 칸에 나란히**

```python
st.divider()
st.title("환율")
col1, col2, col3, col4 = st.columns(4)
col1.metric(label="달러USD", value="1,228 원", delta="-12.00 원")
col2.metric(label="유럽연합EUR", value="1,335.82 원", delta="11.44 원")
col3.metric(label="중국CNY", value="191.90 원", delta="0.0 원")
col4.metric(label="일본JPY(100엔)", value="958.63 원", delta="-7.44 원")
```

`metric`처럼 작은 요소는 열로 나란히 놓아야 대시보드처럼 보인다.

![columns 중첩, 환율 metric, 캐시된 데이터 표](/images/streamlit/st-03-columns-cache.webp)

`delta="0.0 원"`은 변화가 없다는 뜻인데 초록 위 화살표가 붙었다. `-`로 시작하지 않으면 오름으로 처리하기 때문이다. (`보충`: 0을 중립 색으로 보이게 하려면 `delta_color="off"`를 준다.)

## 캐시: 다시 실행되는 구조 다루기

필기에 정리한 Streamlit의 동작 방식이다.

- Streamlit은 사용자가 상호작용할 때마다(버튼 클릭, 데이터 입력) **전체 코드를 다시 실행**한다.
- 다시 실행할 때마다 함수를 다시 호출하고 데이터를 다시 만든다.
- 다시 호출할 필요가 없는 함수, 다시 만들 필요가 없는 데이터에는 데코레이터를 붙여 막는다.

| 데코레이터 | 붙이는 함수 | 예 |
|---|---|---|
| `@st.cache_data` | **데이터**를 반환하는 함수 | Python 값, DataFrame |
| `@st.cache_resource` | **리소스**를 반환하는 함수 | 머신러닝·딥러닝 모델, DB 연결 |

구분 기준은 필기 한 줄로 정리된다. "**DB에 저장할 수 있는 객체면 `cache_data`, 아니면 `cache_resource`**". 데이터는 결과를 복사해서 돌려줘도 되지만, 모델이나 DB 연결은 하나를 만들어 여러 번 같이 써야 하기 때문이다.

필기에는 `@st.cache.resource`로 적혀 있는데 실제 이름은 `@st.cache_resource`(밑줄)다.

```python
# DataFrame 데이터를 제공하는 함수
@st.cache_data
def get_data():
    print("get_data")
    df = pd.read_csv("data/boston_housing.csv")
    return df.head(15)

st.divider()
data = get_data()
st.title("보스톤 지역 주거지역 정보")
btn = st.button("정보 조회")
if btn:
    st.dataframe(data)
```

`get_data()` 안의 `print("get_data")`가 실제로 몇 번 실행되는지 세어 보면 캐시 효과가 보인다. 블로그로 옮기면서 같은 앱을 캐시가 있는 버전과 데코레이터만 주석 처리한 버전으로 띄우고, 페이지를 연 뒤 "정보 조회" 버튼을 세 번 눌러 터미널 출력을 셌다. (`보충`)

| 버전 | `get_data` 출력 횟수 |
|---|---|
| `@st.cache_data` 있음 | **1번** (첫 실행 때만. 이후 실행과 다른 브라우저 탭에서도 저장된 결과 사용) |
| 데코레이터 없음 | **4번** (페이지 로딩 1번 + 버튼 클릭 3번) |

버튼을 누를 때마다 스크립트 전체가 다시 실행되므로, 캐시가 없으면 CSV 파일을 매번 다시 읽는다. 지금은 작은 파일이라 티가 안 나지만 큰 데이터나 모델 로딩이면 클릭할 때마다 몇 초씩 기다리게 된다.

캐시는 **함수의 인자가 같으면** 저장된 결과를 돌려준다. 인자가 바뀌면 새로 실행한다. 저장된 캐시를 비우려면 `streamlit cache clear`를 실행하거나 앱 메뉴의 Clear cache를 쓴다.

## 사이드바: st.sidebar

필기 주석의 원칙은 이렇다.

- **사이드바**에는 검색 조건처럼 **입력** 항목을 넣는다.
- **본 화면**에는 사이드바에서 고른 조건을 **처리한 결과**를 넣는다.

`st.sidebar.함수()`로 호출하면 그 요소가 사이드바 컨테이너에 들어간다.

```python
import streamlit as st

st.set_page_config(page_title="타이틀")

v1 = st.sidebar.slider("X", 1, 10)
st.write("선택된 값: ", f"**{v1}**")

v2 = st.sidebar.text_input("이름")
st.write("이름: " + f"**{v2}**")

v3 = st.sidebar.radio(
    "지역선택",
    ["서울", "인천", "부산"],
    captions=["2020", "2020", "2023"],
    index=None,  # 아무것도 선택되지 않도록 한다
)
st.write(f"선택한 지역: **{v3}**")
```

![사이드바에 입력, 본 화면에 결과](/images/streamlit/st-03-sidebar.webp)

- `radio`는 선택지 중 하나를 고르는 위젯이다. `captions`로 선택지마다 작은 설명을 붙일 수 있다.
- `index=None`이라 처음에는 아무것도 선택되지 않았고, 반환값이 `None`이라 본 화면에 `선택한 지역: None`이 나온다.
- 이름을 입력하기 전에는 `이름: ****`가 그대로 보인다. 빈 문자열을 `**{v2}**`로 감싸면 `****`가 되어 마크다운 굵게 처리가 되지 않기 때문이다. 값이 있을 때만 출력하도록 `if v2:`로 감싸는 편이 낫다.

## 멀티 페이지

### 기본 방식: pages 폴더

`06_paging.py`에 정리한 내용이다.

- 프로젝트 폴더(entrypoint 파일이 있는 폴더) 아래에 `pages` 폴더를 만들고 페이지 파일을 넣는다. 예) `pages/page1.py`, `pages/page2.py`
- 사이드바에 페이지 링크가 **자동으로** 생긴다.

```text
streamlit/
├── 06_paging.py      ← streamlit run 06_paging.py
└── pages/
    ├── page1.py
    ├── page2.py
    └── page3.py
```

![pages 폴더가 있을 때 자동으로 생긴 사이드바 메뉴](/images/streamlit/st-03-paging.webp)

사이드바 메뉴의 이름은 파일 이름에서 온다. entrypoint `06_paging.py`는 앞의 숫자와 `_`가 빠져 `paging`으로 표시됐다.

### 명시적으로 링크 넣기: st.page_link()

```python
st.page_link(페이지경로, label="링크 Label", icon="이모지")
```

```python
st.subheader("링크")
# st.page_link("06_paging.py", label="Home", icon='🏠')
st.page_link("pages/page1.py", label="Page 1", icon='👍')
st.page_link("pages/page2.py", label="Page 2")
st.page_link("pages/page3.py", label="Page 3")
```

본문 안 원하는 위치에 페이지 링크를 둘 수 있다. 각 페이지 파일에도 같은 링크 목록을 넣어 서로 오갈 수 있게 했다. Page 1 링크를 누르면 다음처럼 이동하고, 사이드바와 본문 링크 모두 현재 페이지가 강조된다.

![Page 1로 이동한 화면](/images/streamlit/st-03-page1.webp)

### 실습 폴더가 pages__인 이유

실습 폴더에서는 페이지 파일들이 `pages`가 아니라 `pages__` 폴더에 들어 있다. 다시 실행해 보며 이유를 확인했다.

- `pages` 폴더는 entrypoint와 **같은 폴더에 있기만 하면** 자동으로 인식된다.
- 실습 폴더에는 `01_write.py` ~ `06_paging.py`가 모두 같은 위치에 있다. 그래서 `pages` 폴더가 있으면 `01_write.py`를 실행해도 사이드바에 page1~3 메뉴가 생긴다.
- 다른 실습을 할 때는 폴더 이름을 `pages__`로 바꿔 자동 인식을 끈 것이다.

반대로 지금 상태 그대로 `06_paging.py`를 실행하면 `pages/page1.py`가 없어서 `st.page_link`에서 `StreamlitPageNotFoundError: Could not find page: pages/page1.py`가 난다. 두 경우 모두 다시 실행해서 확인했다. 페이지 실습을 할 때는 폴더 이름을 `pages`로 돌려놓아야 한다. 이 글의 캡처도 `06_paging.py`와 `pages` 폴더만 따로 복사한 폴더에서 실행해 찍었다.

필기의 `page3.py`는 `page2.py`를 복사한 뒤 제목을 고치지 않아서 화면 제목이 `Page 2`로 나온다. 파일을 복사해 페이지를 만들 때 자주 생기는 실수라 메모해 둔다.

> **보충:** 최신 Streamlit은 `st.navigation()`과 `st.Page()`로 페이지 목록·이름·아이콘·순서를 코드에서 직접 정의하는 방식도 제공한다. 폴더 이름 규칙에 기대지 않아도 되어서, 페이지가 많아지면 이 방식이 관리하기 쉽다.

## 정리

| 하고 싶은 일 | 방법 |
|---|---|
| 화면 너비 넓게 | `st.set_page_config(layout="wide")` |
| 열 나누기 | `col1, col2 = st.columns(2)` → `col1.write(...)` |
| 데이터 결과 재사용 | `@st.cache_data` |
| 모델·DB 연결 재사용 | `@st.cache_resource` |
| 조건 입력 영역 | `st.sidebar.slider(...)`, `st.sidebar.radio(...)` |
| 여러 페이지 | `pages/` 폴더, `st.page_link()` |

- Streamlit은 상호작용할 때마다 스크립트 전체를 다시 실행한다. 이 구조 때문에 캐시가 필요하다.
- 데이터는 `cache_data`, 모델·연결 같은 리소스는 `cache_resource`다.
- 사이드바에는 입력, 본 화면에는 결과를 둔다.
- `pages` 폴더는 entrypoint와 같은 위치에 있으면 자동으로 인식된다.
