---
title: "Streamlit 시작하기: 실행 방법과 출력 함수"
description: "Python만으로 데이터 웹앱을 만드는 Streamlit의 특징과 실행 명령어를 정리하고, title·markdown·write 같은 출력 함수와 상태 메시지·그래프 출력을 실제 화면과 함께 다룹니다."
category: 'Tech'
subcategory: 'Python'
series: 'Streamlit'
seriesOrder: 1
originalNotebook: "streamlit/00_streamlit.md, 01_write.py"
tags: ["Python","Streamlit"]
date: 2026-04-20
---

> SKN31 Python 과정에서 정리한 `streamlit/00_streamlit.md`와 실습 파일 `01_write.py`를 바탕으로 정리했습니다.
> 화면 캡처는 실습 코드를 그대로 Streamlit 1.65에서 다시 실행해 찍었습니다. 수업 당시 버전과 디자인이 조금 다를 수 있습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- Streamlit이 무엇이고 언제 쓰는지
- `streamlit run`으로 앱을 실행하는 방법과 주요 옵션
- 제목·텍스트·코드·마크다운·수식·HTML 출력 함수
- 무엇이든 알아서 출력하는 `st.write()`와 Magic
- 상태 메시지와 그래프 출력

## Streamlit이란

**Streamlit**은 데이터 과학자나 머신러닝 엔지니어가 **순수 Python 코드만으로** 대화형(interactive) 웹 애플리케이션을 빠르게 만들고 공유할 수 있게 해 주는 오픈 소스 프레임워크다. 데이터 웹앱이나 대시보드를 만들 때 많이 쓴다. ([공식 문서](https://docs.streamlit.io/))

| 특징 | 내용 |
|---|---|
| Python 중심 | HTML, CSS, JavaScript 없이 Python만으로 앱을 만든다 |
| 간편한 API | 짧은 선언형 코드로 시각화, 위젯, 레이아웃을 구성한다 |
| 빠른 프로토타이핑 | 데이터 스크립트를 몇 분 만에 공유 가능한 웹앱으로 바꾼다 |
| 자동 업데이트 | 코드를 저장하면 앱이 자동으로 갱신된다 |

### 언제 쓰나

| 상황 | 이유 |
|---|---|
| 데이터 분석 결과를 웹으로 공유할 때 | `st.line_chart`, `st.map`, `st.metric` 같은 고수준 API |
| 머신러닝 모델 데모를 빠르게 만들 때 | 예측 함수를 UI에 바로 연결할 수 있다 |
| 대시보드·리포트를 자동화할 때 | Pandas, Matplotlib, Plotly와 자연스럽게 연결된다 |
| 웹 프론트엔드 경험이 적을 때 | Python 스크립트만으로 웹 화면이 완성된다 |
| 사내 공유용 도구를 만들 때 | 로컬 실행, Streamlit Cloud, 내부 서버 배포가 쉽다 |

### 한계

Streamlit은 Django나 Flask 같은 **범용 웹 프레임워크가 아니다**. 로그인, 결제, 게시판 같은 일반적인 웹 서비스를 만들기에는 제약이 많다. 또 기본 구조가 단일 스레드 중심이라 동시 접속자가 수십~수백 명을 넘으면 성능이 떨어진다. 데모, 내부 도구, 분석 결과 공유용으로 쓰고, 서비스 자체는 다른 프레임워크로 만드는 경우가 많다.

## 설치와 실행

```bash
pip install streamlit
```

Streamlit 앱은 평범한 `.py` 파일이다. `python app.py`가 아니라 `streamlit run`으로 실행한다.

```bash
streamlit run <entrypoint file> [options]

# 예
streamlit run my_app.py
```

실행하면 로컬 웹 서버가 켜지고 브라우저에서 `http://localhost:8501`이 열린다. 앱의 시작 파일을 **entrypoint file**이라고 한다.

### 실행 옵션

`--<section>.<option>=<value>` 형식으로 기본 설정을 바꿀 수 있다.

| 옵션 | 예 | 설명 |
|---|---|---|
| `--server.port` | `--server.port 9999` | 실행 포트 (기본값 8501) |
| `--server.address` | `--server.address 0.0.0.0` | 외부 접속 허용 (클라우드·도커 환경) |
| `--server.headless` | `--server.headless true` | 브라우저 자동 실행 끄기 (서버 모드) |
| `--server.fileWatcherType` | `--server.fileWatcherType none` | 코드 변경 감지 끄기 (성능 향상) |
| `--theme.base` | `--theme.base dark` | 기본 테마 (light/dark) |
| `--help` | | 모든 옵션 목록 |

### 기타 명령어

| 명령어 | 설명 |
|---|---|
| `streamlit hello` | 공식 데모 앱 실행. 설치 확인용 |
| `streamlit config show` | 현재 적용된 설정 전체 보기 |
| `streamlit version` | 설치된 버전 확인 |
| `streamlit cache clear` | 디스크에 저장된 캐시 삭제 |

이 글의 캡처는 실습 파일마다 포트를 나눠 `streamlit run 01_write.py --server.port 8601 --server.headless true`처럼 실행해서 찍었다.

## 텍스트 출력 함수

```python
import streamlit as st

# 타이틀
st.title('이것은 타이틀 입니다 👍👍 :streamlit:')
# Header
st.header('헤더를 입력할 수 있어요! :star2:')
# Subheader
st.subheader('이것은 subheader 입니다 :100:')
# 일반 텍스트
st.text('일반 텍스트입니다. 👌👌')
st.text(10)
```

- 크기 순서는 `title` > `header` > `subheader` > `text`다. 마크다운의 `#`, `##`, `###`에 해당한다.
- 이모지는 OS 이모지(`Windows 키 + .`)를 직접 넣거나 `:star2:` 같은 **shortcode**로 쓴다. `:streamlit:`은 Streamlit 로고 아이콘이 된다.
- `st.text(10)`처럼 숫자를 넣어도 문자열로 출력된다.

### 코드, 마크다운, 수식, HTML

```python
st.divider()  # 구분선
st.header("다양한 출력")

# 코드 출력
sample_code = '''
def function():
    print('hello, world~!')
'''
st.code(sample_code, language="python")

# 마크다운 출력
st.markdown('*Streamlit*은 **마크다운 문법을 지원**합니다.')

# 컬러코드: blue, green, orange, red, violet
# :컬러코드[출력할 내용]  예) :blue[안녕하세요.]
st.markdown("컬러코드를 이용해서 텍스트 색을 지정합니다. :green[초록색], **:blue[파란색]**, *:red[빨강색입니다.]*")
st.markdown("1/2 Latax를 이용해 출력할 수식은 \$ \$ 로 감싸줍니다. $\cfrac{1}{2}$, :green[$\sqrt{x^2+y^2}=1$]")

# LaTeX 수식 출력 함수. $ $ 로 감쌀 필요 없다
st.latex('\sqrt{x^2+y^2}=1')

# HTML 출력
st.html("<b>볼드체로 출력합니다.</b>")
st.html("<a href='https://www.naver.com'>네이버</a>")
```

![텍스트·코드·마크다운·수식·HTML 출력 결과](/images/streamlit/st-01-text-output.webp)

| 함수 | 출력 |
|---|---|
| `st.code(문자열, language=)` | 문법 강조된 코드 블록 |
| `st.markdown(문자열)` | 마크다운. `:색이름[텍스트]`로 색 지정, `$...$`로 수식 |
| `st.latex(문자열)` | LaTeX 수식만 가운데 정렬로 출력 |
| `st.html(문자열)` | HTML을 그대로 렌더링 |
| `st.divider()` | 가로 구분선 |

> **보충: 백슬래시가 들어간 문자열은 raw string으로.** 다시 실행해 보니 터미널에 `SyntaxWarning: invalid escape sequence '\s'`, `'\$'` 경고가 나왔다. Python 문자열에서 `\s`, `\$`, `\c`는 정의되지 않은 이스케이프라서다. 지금은 경고로 끝나고 화면도 정상이지만, Python 3.12부터 경고가 강화됐고 이후 버전에서는 에러가 될 예정이다. 수식처럼 `\`가 많은 문자열은 `st.latex(r'\sqrt{x^2+y^2}=1')`처럼 앞에 `r`을 붙인다.

## st.write(): Magic 출력 함수

`st.write()`는 위의 출력 함수들을 하나로 합친 함수다. **전달된 값의 타입을 보고 알맞은 방식으로** 출력한다.

````python
st.title("st.write() 함수 - Magic 출력함수")

# 가변인자로 여러 값을 나열하면 이어서 출력된다
st.write("나이:", str(20), "이름:", "이순신")
st.write(1, 2, 3, 4, 5)
st.write(3.22, 5e-2)
st.write(True, False)

# 문자열은 마크다운으로 출력
st.write("# 제목")
st.write("## 중제목")
st.write("### 소제목")
st.write("""
```python
def function():
    print("Hello World")
```
""")
st.write('[구글](https://www.google.com), [네이버](https://www.naver.com)')

# list, dict는 펼치기/접기가 되는 interactive viewer로 출력
st.write([1, 2, 3, 4, 5])
st.write({'이름': '이순신', '나이': 20})
st.write("<b>안녕</b>", unsafe_allow_html=True)  # HTML 출력
````

![st.write 출력 결과](/images/streamlit/st-01-write.webp)

| 넣은 값 | 출력 방식 |
|---|---|
| 문자열 | 마크다운으로 해석 (`#`은 제목, 코드 블록, 링크 등) |
| 숫자, bool | 값 그대로 (코드 서식) |
| list, dict | 펼치고 접을 수 있는 JSON 뷰어 |
| DataFrame | 표 (다음 글) |
| Matplotlib Figure | 그래프 |

문자열로 HTML을 넣으면 기본적으로 태그가 그대로 글자로 보인다. `unsafe_allow_html=True`를 줘야 HTML로 렌더링된다.

## 상태 메시지 출력

결과의 성격에 따라 배경색이 다른 상자로 출력한다.

```python
st.success("성공")
st.info("정보출력")
st.warning(":warning: 경고 :warning:")
st.error("에러")
st.exception(KeyError("없는 키입니다."))
```

![상태 메시지 출력 결과](/images/streamlit/st-01-status.webp)

`st.exception()`은 예외 객체를 받아 예외 타입과 메시지를 보여 준다. 사용자 입력이 잘못됐거나 처리 중 오류가 났을 때 화면에 알릴 수 있다.

## 그래프 출력

Streamlit은 자체 차트 함수 외에도 Matplotlib, Plotly 같은 Python 시각화 라이브러리를 그대로 지원한다.

```python
import matplotlib.pyplot as plt
import numpy as np

arr = np.random.normal(1, 1, size=100)

fig = plt.figure()
plt.hist(arr, bins=30)
fig            # magic write
st.pyplot(fig) # st.pyplot()으로 출력
```

![히스토그램이 두 번 출력된 화면](/images/streamlit/st-01-chart-twice.webp)

같은 히스토그램이 **두 번** 나왔다. 필기 주석의 `(위에는 magic write)`가 그 이유다.

- **Magic**: Streamlit 앱에서는 변수나 값만 한 줄에 쓰면 `st.write()`로 출력한 것처럼 처리된다. `fig` 한 줄이 `st.write(fig)`가 된 것이다.
- 그다음 줄의 `st.pyplot(fig)`가 같은 그래프를 한 번 더 그렸다.

둘 중 하나만 쓰면 된다. 의도를 분명히 하려면 `st.pyplot(fig)`처럼 함수를 쓰는 편이 읽기 쉽다.

마지막으로 여러 줄 마크다운도 `st.write()` 하나로 출력할 수 있다.

```python
st.write(
"""
# 제목
좋아하는 색

- 파랑색
- 빨강색
"""
)
```

## 정리

| 하고 싶은 일 | 함수 |
|---|---|
| 앱 실행 | `streamlit run app.py [--server.port 9999]` |
| 제목 | `st.title`, `st.header`, `st.subheader` |
| 글 | `st.text`, `st.markdown`, `st.write` |
| 코드·수식·HTML | `st.code`, `st.latex`, `st.html` |
| 상태 메시지 | `st.success`, `st.info`, `st.warning`, `st.error`, `st.exception` |
| 그래프 | `st.pyplot(fig)` |

- Streamlit 앱은 `.py` 파일이고, `streamlit run`으로 실행한다.
- 데모·대시보드·내부 도구용이다. 범용 웹 서비스에는 맞지 않는다.
- `st.write()`는 값의 타입에 맞춰 출력하고, 값만 한 줄에 쓰면 Magic으로 출력된다.
- `\`가 들어간 문자열은 `r'...'`로 쓴다.
