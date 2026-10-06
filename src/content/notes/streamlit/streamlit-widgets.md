---
title: "Streamlit 화면 요소: 표·metric·입력 위젯"
description: "DataFrame을 표로 보여주는 dataframe·data_editor·table, 값의 등락을 보여주는 metric, 텍스트·숫자·날짜·버튼·선택·파일 업로드 같은 입력 위젯과 버튼이 클릭 상태를 기억하지 않는 이유를 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Streamlit'
seriesOrder: 2
originalNotebook: "streamlit/02_table_metric.py, 03_input_widget.py"
tags: ["Python","Streamlit","Widget"]
date: 2026-04-21
---

> SKN31 Python 과정의 Streamlit 실습 파일 `02_table_metric.py`, `03_input_widget.py`를 바탕으로 정리했습니다.
> 화면 캡처는 실습 코드를 그대로 Streamlit 1.65에서 다시 실행해 찍었고, 입력 위젯은 실제로 값을 넣고 클릭한 상태입니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- DataFrame을 출력하는 세 가지 방법: `st.dataframe`, `st.data_editor`, `st.table`
- 값의 등락을 보여주는 `st.metric`
- 위젯과 컨테이너의 차이
- 텍스트·숫자·슬라이더·날짜 입력
- 버튼, 선택 상자, 체크박스
- 파일 업로드와 다운로드
- 위젯을 조작할 때마다 스크립트 전체가 다시 실행된다는 것

## 표 출력

**DataFrame**은 Pandas의 표(테이블) 자료구조다. `pip install pandas`로 설치한다. Pandas는 다음 시리즈에서 자세히 다루고, 여기서는 Streamlit에 표를 띄우는 방법만 본다.

```python
import streamlit as st
import pandas as pd

df = pd.DataFrame({
    'column1': [1, 2, 3, 4],
    'column2': [10, 20, 30, 40],
})

# st.dataframe(): interactive viewer
st.subheader('st.dataframe()')
st.dataframe(df)

# st.data_editor(): 값을 수정할 수 있는 표. 바뀔 때마다 변경된 DataFrame을 반환
st.subheader('st.data_editor()')
change_df = st.data_editor(df)
print(change_df)

# st.table(): interactive 기능 없이 표만 출력 (static)
st.subheader('st.table()')
st.table(df)
```

![dataframe, data_editor, table, metric 출력 결과](/images/streamlit/st-02-table-metric.webp)

| 함수 | 특징 |
|---|---|
| `st.dataframe(df)` | 크기 조절, 컬럼명 클릭으로 오름차순·내림차순 정렬 등 상호작용 가능 |
| `st.data_editor(df)` | 사용자가 셀 값을 고칠 수 있다. 고친 결과를 DataFrame으로 반환 |
| `st.table(df)` | 정적인 표. 상호작용 없음 |

화면에서 `data_editor`의 컬럼명 옆에는 편집 가능 표시 아이콘이 붙는다.

`print(change_df)`는 브라우저가 아니라 **`streamlit run`을 실행한 터미널**에 출력된다. 화면에 보이려면 `st.write`를 써야 한다. 다시 실행했을 때 터미널에 다음이 찍혔다.

```text
   column1  column2
0        1       10
1        2       20
2        3       30
3        4       40
```

필기에는 표 너비 옵션도 적어 두었다.

```python
# use_container_width=False: 값의 크기에 맞춰 너비. True: 전체 화면 너비
st.dataframe(df, use_container_width=True)
st.dataframe(df, width=640)
```

> **보충:** 최근 Streamlit 버전에서는 `use_container_width` 대신 `width="stretch"`(전체 너비) 또는 `width="content"`(내용에 맞춤)를 쓰도록 바뀌고 있다. 옛 옵션을 쓰면 경고가 나올 수 있으니 설치된 버전의 문서를 확인한다.

## st.metric(): 값의 등락

```python
st.header('값의 등락 출력 - st.metric()')

st.metric(
    label=":blue[온도 ]",  # 제목. 마크다운, 이모지 shortcode, LaTeX, 색 지정 지원
    value="10°C",          # 출력할 값
    delta="1.2°C"          # 등락 크기(옵션). +로 시작하거나 생략하면 오름, -로 시작하면 내림
)
st.metric(label="삼성전자**", value="60,600원", delta="-700원 (-1.14%)")
```

위 캡처 아래쪽처럼 `delta`가 `-`로 시작하면 빨간 아래 화살표, 아니면 초록 위 화살표가 붙는다. `delta`는 문자열이어도 앞 부호로 방향을 판단한다.

두 번째 `label`의 `삼성전자**`는 굵게 하려던 것으로 보이는데 여는 `**`가 없어서 `**`가 글자 그대로 나왔다. 마크다운 강조는 `**삼성전자**`처럼 앞뒤를 모두 감싸야 한다.

## 위젯과 컨테이너

필기 첫머리에 두 용어를 구분해 두었다.

- **위젯(Widget)**: 버튼, 텍스트 박스처럼 사용자가 직접 상호작용하는 개별 GUI 요소
- **컨테이너(Container)**: 여러 위젯을 담고 배치(layout)·정렬을 관리하는 GUI 요소. 다음 글의 `columns`, `sidebar`가 여기 속한다

```python
st.set_page_config(page_title="Input Widget", layout="wide")
```

`set_page_config`는 브라우저 탭 제목과 페이지 레이아웃을 정한다. `layout="wide"`는 화면 전체 너비를 쓴다.

## 값 입력 위젯

입력 위젯은 **사용자가 입력한 현재 값을 반환**한다. 그 값을 변수에 받아 바로 쓰면 된다.

```python
st.subheader("text 입력")
name_value = st.text_input("이름")
if name_value != "":
    st.write("이름: " + name_value)

st.subheader("여러줄 텍스트 입력")
info = st.text_area("정보", height=200)  # height: pixel
st.write(info.replace("\n", "<br>"), unsafe_allow_html=True)

st.subheader("Number Input")
num = st.number_input("값")
st.write("입력값:", num)

st.subheader("slide")
v = st.slider("X", min_value=-10, max_value=10, value=0)  # 기본값: min 0, max 100, step 1. value: 시작 값
st.write("선택된 값: ", str(v))
```

![텍스트, 여러 줄 텍스트, 숫자, 슬라이더 입력](/images/streamlit/st-02-input-text.webp)

| 위젯 | 반환값 |
|---|---|
| `st.text_input(라벨)` | 입력한 문자열. 아무것도 없으면 `""` |
| `st.text_area(라벨, height=)` | 여러 줄 문자열 |
| `st.number_input(라벨)` | 숫자. 기본은 `0.0`(float) |
| `st.slider(라벨, min_value, max_value, value)` | 선택한 숫자 |

- 이름 칸에 `이순신`을 입력하고 Enter를 누르자 아래에 `이름: 이순신`이 나왔다.
- `text_area`의 줄바꿈은 `st.write`에서 그대로 보이지 않는다. 필기에서는 `\n`을 `<br>`로 바꾸고 `unsafe_allow_html=True`로 출력했다.

### 날짜와 시간

```python
st.subheader("날짜")
col1, col2 = st.columns(2)
v = col1.date_input("날짜")
col1.write(v)

v = col2.time_input("시간", step=60)  # step 단위: 초
col2.write(v)
```

![날짜·시간 입력](/images/streamlit/st-02-date.webp)

반환값은 Python의 `datetime.date`, `datetime.time` 객체다. 기본값은 오늘 날짜와 현재 시각이다. `st.columns(2)`로 화면을 두 칸으로 나눠 날짜와 시간을 나란히 놓았다. 레이아웃은 다음 글에서 다룬다.

## 버튼

### 일반 버튼

```python
st.subheader("일반 버튼")

# 일반 버튼: 클릭하면 True 반환
bool_value = st.button("인사말 출력")
if not bool_value:
    st.write("아직 클릭 안됨")
else:
    if name_value:
        st.write(f"{name_value}님 안녕하세요.")
    else:
        st.write("이름을 입력하세요.")
```

이름을 넣고 버튼을 누르면 인사말이 나온다.

![버튼을 클릭한 직후](/images/streamlit/st-02-button-clicked.webp)

그런데 이 상태에서 **아래쪽 체크박스를 클릭하면** 인사말이 사라지고 다시 "아직 클릭 안됨"이 나온다.

![다른 위젯을 조작한 뒤](/images/streamlit/st-02-button-reset.webp)

다시 실행해 보며 확인한 Streamlit의 핵심 동작이다.

- Streamlit은 사용자가 위젯을 조작할 때마다 **스크립트 전체를 위에서부터 다시 실행**한다. (다음 글의 캐시 부분 필기에도 적혀 있다.)
- `st.button()`은 **클릭 직후의 그 한 번의 실행**에서만 `True`를 반환한다.
- 체크박스를 누르면 스크립트가 다시 실행되고, 이번 실행에서는 버튼이 눌리지 않았으므로 `False`가 된다.

반면 `text_input`, `checkbox`, `selectbox` 같은 입력 위젯은 다시 실행돼도 **현재 값을 유지**한다. 버튼을 눌렀다는 사실을 계속 유지하려면 `st.session_state`에 저장해야 한다. (`보충`)

```python
# 보충: 클릭 상태를 기억하기
if "greeted" not in st.session_state:
    st.session_state.greeted = False

if st.button("인사말 출력"):
    st.session_state.greeted = True

if st.session_state.greeted:
    st.write(f"{name_value}님 안녕하세요.")
```

### 링크 버튼

```python
# 버튼 클릭 시 지정한 URL로 이동
col1, col2, col3 = st.columns(3)
col1.link_button("Streamlit", "https://streamlit.io/")
col2.link_button("구글", "https://google.co.kr")
col3.link_button("Naver", "https://www.naver.com")
```

## 선택 위젯

```python
st.subheader("Select Box")
option = st.selectbox(
    "지역을 선택하세요",
    ("서울", "인천", "부산", "광주"),
    # index=None
)
st.write("**선택한 지역**:", option)

st.subheader("Checkbox")
@st.cache_data
def get_data():
    df = pd.read_csv("data/boston_housing.csv").head(10)
    return df

bool_value = st.checkbox("**표를 보시겠습니까?**")  # 체크: True, 해제: False
if bool_value:
    df = get_data()
    st.dataframe(df)
else:
    st.write("데이터가 없습니다.")
```

![selectbox와 체크박스로 표를 연 상태](/images/streamlit/st-02-select-checkbox.webp)

- `selectbox`는 기본으로 첫 번째 항목이 선택돼 있다. 주석 처리한 `index=None`을 켜면 아무것도 선택되지 않은 상태로 시작하고, 그때 반환값은 `None`이다.
- 체크박스를 켜면 보스턴 주택 데이터 앞 10행이 표로 나온다. 데이터를 읽는 함수에 붙은 `@st.cache_data`는 다음 글에서 설명한다.

## 파일 업로드

```python
uploaded_file = col4.file_uploader(
    "이미지 업로드",
    type=["png", "jpg"],         # 업로드 확장자 제한. 생략하면 모든 파일 허용
    accept_multiple_files=False  # True면 여러 파일을 한 번에 업로드
)
```

업로드한 파일은 서버(앱을 실행한 컴퓨터)에 자동 저장되지 않는다. 메모리에 있는 파일 객체를 받아 직접 저장해야 한다.

```python
import os
import io
from PIL import Image

save_dir = "save_files"
os.makedirs(save_dir, exist_ok=True)
if uploaded_file is not None:
    # UploadedFile.getvalue(): 업로드된 파일을 bytes로 반환
    # UploadedFile.name      : 업로드된 파일 이름
    bytes_data = uploaded_file.getvalue()
    save_filepath = os.path.join(save_dir, uploaded_file.name)
    with open(save_filepath, "wb") as fw:
        fw.write(bytes_data)
    st.write(uploaded_file.name)
    st.write("타입:" + str(type(bytes_data)))

    # 업로드 이미지를 화면에 출력 (bytes → PIL.Image)
    data_io = io.BytesIO(bytes_data)
    img = Image.open(data_io)
    st.write(img)
```

- 업로드 전에는 `None`이므로 `if uploaded_file is not None:`으로 확인한다.
- `getvalue()`로 받은 `bytes`를 `"wb"` 모드로 쓰면 저장된다. 웹 크롤링에서 이미지를 저장한 방식과 같다.
- `io.BytesIO`는 bytes를 파일처럼 다룰 수 있게 감싸는 객체다. PIL이 파일 대신 이것을 열어 이미지로 만든다.

### 다중 파일 업로드

```python
upload_file_list = st.file_uploader(
    "다중파일 업로드",
    accept_multiple_files=True,
)
st.write("업로드 파일개수:", len(upload_file_list))
for uploaded_file in upload_file_list:
    bytes_data = uploaded_file.getvalue()
    with open(os.path.join(save_dir, uploaded_file.name), "wb") as fw:
        fw.write(bytes_data)
```

`accept_multiple_files=True`면 반환값이 **리스트**다. 업로드 전에는 `None`이 아니라 빈 리스트라서 `len()`을 바로 쓸 수 있다.

## 다운로드 버튼

```python
down_filepath = "data/boston_housing.csv"
with open(down_filepath, "rb") as fr:
    st.download_button(
        "파일 다운로드",                            # 버튼 라벨
        data=fr.read(),                            # 다운로드시킬 내용 (str 또는 bytes)
        file_name=os.path.basename(down_filepath), # 다운로드될 때 파일명
    )
```

![파일 업로드·다운로드 위젯](/images/streamlit/st-02-upload-download.webp)

`os.path.basename()`은 경로에서 파일 이름만 꺼낸다. `data/boston_housing.csv` → `boston_housing.csv`

## 정리

| 분류 | 함수 | 반환값 |
|---|---|---|
| 표 | `st.dataframe`, `st.table` | 없음 |
| 편집 표 | `st.data_editor` | 수정된 DataFrame |
| 등락 | `st.metric(label, value, delta)` | 없음 |
| 텍스트 | `st.text_input`, `st.text_area` | str |
| 숫자 | `st.number_input`, `st.slider` | 숫자 |
| 날짜·시간 | `st.date_input`, `st.time_input` | date, time |
| 버튼 | `st.button` | 클릭한 그 실행에서만 True |
| 선택 | `st.selectbox`, `st.checkbox` | 선택값, bool |
| 파일 | `st.file_uploader` | UploadedFile 또는 리스트 |
| 다운로드 | `st.download_button` | 클릭 여부 |

- 위젯을 조작하면 스크립트 전체가 다시 실행된다.
- 입력 위젯은 값을 유지하지만 버튼은 유지하지 않는다. 계속 기억해야 하면 `st.session_state`를 쓴다.
- `print()`는 화면이 아니라 터미널에 찍힌다.
