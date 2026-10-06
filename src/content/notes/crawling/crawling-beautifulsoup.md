---
title: "데이터 수집과 BeautifulSoup: HTML에서 원하는 정보 찾기"
description: "공개 데이터를 찾는 곳과 크롬 개발자 도구의 쓰임을 정리하고, BeautifulSoup으로 HTML을 파싱해 find·select로 원하는 태그와 값을 꺼내는 방법을 다룹니다."
category: 'Tech'
subcategory: 'Data Engineering'
series: '데이터 수집'
seriesOrder: 1
originalNotebook: "01_데이터수집 개요_BeautifulSoup.ipynb"
tags: ["Python","Crawling","BeautifulSoup","CSS Selector"]
date: 2026-04-24
---

> SKN31 웹 크롤링 실습 노트북 `01_데이터수집 개요_BeautifulSoup.ipynb`의 필기를 바탕으로 정리했습니다.
> 예제는 실습용 HTML 파일(`example.html`)로 다시 실행했고, 노트북에 저장된 출력과 같은 결과가 나오는 것을 확인했습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 데이터를 구하는 두 가지 경로와 공개 데이터 사이트
- 크롤링 전에 크롬 개발자 도구로 확인해야 하는 것
- 파싱(parsing)의 의미와 BeautifulSoup 객체 만들기
- `find()`·`find_all()`로 태그 이름과 속성으로 찾기
- `select()`·`select_one()`으로 CSS 선택자로 찾기
- `Tag` 객체에서 텍스트와 속성값 꺼내기

## 데이터를 구하는 경로

노트북 첫 셀에 적은 메모는 `데이터 => 파일, api(url 제공, 코드사용)`였다. 정리하면 데이터를 얻는 길은 크게 두 가지다.

1. **파일로 받기**: 공개 데이터 사이트에서 CSV·엑셀 파일을 내려받는다.
2. **코드로 가져오기**: 제공되는 API URL에 요청하거나, 웹 페이지에서 직접 수집(크롤링)한다.

먼저 1번을 확인하고, 없을 때 2번으로 간다. 수업에서 소개한 공개 데이터 사이트는 다음과 같다.

| 사이트 | 주소 | 특징 |
|---|---|---|
| 국가통계포털(KOSIS) | kosis.kr | 통계청이 관리하는 국가 통계 데이터 |
| 공공데이터포털 | data.go.kr | 행정안전부의 정부 데이터 포털. Open API도 제공 |
| Kaggle | kaggle.com | 데이터 과학 경진대회 플랫폼. 다양한 데이터셋 |
| 구글 데이터셋 검색 | datasetsearch.research.google.com | 키워드로 데이터셋 검색 |
| AI Hub | aihub.or.kr | 국내 AI 학습용 데이터셋 |

분야별로는 지자체(서울 열린데이터광장, 경기데이터드림), 금융(한국거래소, 금융통계정보시스템), 영화(영화진흥위원회), 대중교통(국가교통DB, 교통카드 빅데이터), 관광(한국관광 데이터랩), 날씨(기상청 기상자료개방포털) 데이터도 있다.

## 크롬 개발자 도구

`F12`를 누르거나 페이지에서 우클릭 → `검사`를 선택하면 열린다. 엣지 브라우저에도 같은 도구가 있다.

| 탭 | 기능 |
|---|---|
| 요소(Elements) | HTML 구조, CSS 스타일, 선택자 확인 |
| 콘솔(Console) | JavaScript 실행, 오류 메시지 확인 |
| 소스(Sources) | JavaScript 코드 확인, 중단점 디버깅 |
| 네트워크(Network) | 요청·응답 내용 분석, 성능 측정 |
| 성능(Performance) | 로딩·렌더링 시간 분석 |
| 애플리케이션(Application) | 쿠키, 로컬·세션 스토리지 확인 |

크롤링은 원하는 데이터가 HTML의 **어느 위치에, 어떤 태그와 속성으로** 있는지 알아야 시작할 수 있다. 개발자 도구가 필요한 이유를 다섯 가지로 정리했다.

1. **데이터 위치 파악**: 요소 탭에서 화면 요소를 클릭하면 그 태그와 class, id가 바로 보인다. `find()`, `select()`에 넣을 태그명과 선택자를 여기서 얻는다.
2. **동적으로 생성된 데이터 확인**: 요즘 페이지는 JavaScript로 데이터를 나중에 불러온다. `Ctrl+U`로 보는 원본 소스에는 없는 데이터도, 요소 탭에는 JavaScript 실행 후의 최종 HTML이 보인다.
3. **네트워크 요청 분석**: 검색 결과나 무한 스크롤처럼 따로 불러오는 데이터는 네트워크 탭에서 요청 URL, 방식(GET/POST), 파라미터, 응답(주로 JSON)을 볼 수 있다. HTML을 파싱하지 않고 그 API에 직접 요청하는 방법도 가능해진다.
4. **선택자 복사**: 요소 탭에서 태그를 우클릭 → `Copy > Copy selector` 또는 `Copy XPath`로 바로 복사할 수 있다.
5. **쿠키·인증 정보 확인**: 로그인이 필요한 페이지는 애플리케이션 탭과 네트워크 탭에서 쿠키와 헤더를 확인해 요청에 넣는다.

2번은 다음 글의 requests와 그다음 글의 Selenium을 나누는 기준이 된다. 요청 한 번으로 받은 HTML에 데이터가 없으면 requests만으로는 수집할 수 없다.

## 파싱과 마크업 언어

노트북에 적어 둔 메모를 정리하면 다음과 같다.

- HTML은 **마크업 언어**다. `<태그>`로 내용을 감싸 "이 부분은 제목이다", "이 부분은 링크다"처럼 의미를 표시한다. 예) `<중요>...</중요>`, `<설명 주제="음악">...</설명>`. 여기서 `주제="음악"`이 **속성(attribute)** 이다.
- 웹 브라우저는 이 표시를 읽어 화면을 그린다.
- 하지만 Python 입장에서 받아 온 HTML은 그냥 **긴 문자열**이다.

**파싱(Parsing)** 은 이런 문자열을 분석해서 구조화된 형태로 바꾸는 과정이다. `<h1>Hello</h1>`라는 문자열을 "태그: `h1`, 내용: `Hello`"라는 구조로 바꾸는 것이다.

## BeautifulSoup

BeautifulSoup은 HTML·XML 문서를 파싱해 원하는 데이터를 쉽게 꺼낼 수 있게 해 주는 라이브러리다.

- 복잡한 HTML을 **트리 구조**로 바꿔 다룬다. 노트북 메모로는 "Tag별로 쪼개서 내용을 가지고 있다".
- 웹 요청 기능은 없다. 그래서 보통 `requests`처럼 HTTP 요청을 하는 라이브러리와 함께 쓴다.

```bash
pip install beautifulsoup4 lxml
```

### 코딩 패턴

1. 조회할 HTML 문자열을 전달해 `BeautifulSoup` 객체를 만든다.
2. 객체의 메소드로 필요한 정보를 찾는다.
   - 태그 이름과 속성으로 찾기 (`find`, `find_all`)
   - CSS 선택자로 찾기 (`select`, `select_one`)
   - `.` 표기법으로 트리 순서대로 탐색하기

### 객체 생성

```python
BeautifulSoup(html문자열 [, 파서])
```

| 파서 | 특징 |
|---|---|
| `html.parser` | 기본 파서. 설치가 필요 없다 |
| `lxml` | 매우 빠르다. HTML과 XML 모두 파싱 가능(XML은 lxml만 가능). `pip install lxml` 후 커널 재시작 |

### 실습 문서: example.html

수업에서 받은 동물원 소개 페이지다. 구조만 추리면 다음과 같다.

```html
<body>
  <h1>동물목록</h1>
  <div id="animal1" class="animal_info">
    <div class="name">사자</div>
    <div>3마리</div>
  </div>
  <div class="animal_info"> ...호랑이 10마리... </div>
  <div class="animal_info"> ...곰 5마리... </div>
  <div class="animal_info"> ...낙타 6마리... </div>
  우리 동물원에는 <span class="name">기린</span>도 30&nbsp;마리 있습니다.

  <h1>다른 동물원 URL</h1>
  <ul>
    <li><a href="https://grandpark.seoul.go.kr/main/ko.do">서울 대공원</a></li>
    <li><a href="https://www.everland.com/...">에버랜드</a></li>
    <li><a href="https://www.coexaqua.com">코엑스아쿠아리움</a></li>
  </ul>
  <div id="potal">
    <a href="http://www.naver.com">네이버</a>
    <a href="http://www.daum.com">다음</a>
    <a href="http://www.google.com">구글1</a> ... <a href="http://www.google.com">구글4</a>
  </div>
  <img src="https://...jpg" width="500px">
</body>
```

```python
from bs4 import BeautifulSoup

with open("example.html", "rt", encoding="utf-8") as fr:
    html_doc = fr.read()

# 정보를 추출할 웹 문서의 내용을 str로 전달 (인터넷에서 받은 html도 str)
soup = BeautifulSoup(html_doc, "lxml")  # "lxml" 라이브러리 사용, 더 빠름
```

## Tag 객체

조회 메소드가 돌려주는 결과의 타입이다. 하나의 태그(element)를 나타낸다.

- 찾은 요소가 **하나**면 `Tag` 객체를, **여러 개**면 `Tag`를 담은 리스트(`ResultSet`)를 반환한다.
- `Tag` 안에서 다시 조회 메소드를 호출해 하위 요소를 찾을 수 있다.

| 하고 싶은 일 | 방법 |
|---|---|
| 속성값 조회 | `tag.get('속성명')` 또는 `tag['속성명']` |
| 태그 안 텍스트 조회 | `tag.get_text()` 또는 `tag.text` |
| 모든 자식 요소 | `tag.contents` (리스트) |
| 태그 이름 | `tag.name` |

## 태그 이름과 속성으로 찾기: find, find_all

| 메소드 | 반환 |
|---|---|
| `find_all(name=태그명, attrs={속성명: 속성값})` | 조건에 맞는 모든 태그를 `ResultSet`으로 |
| `find(name=태그명, attrs={속성명: 속성값})` | 조건에 맞는 첫 번째 태그 하나 |

- 여러 이름의 태그를 찾을 때는 리스트로 묶어 전달한다. 예) `find_all(["span", "img"])`
- 속성 조건만으로 찾을 때는 태그 이름을 생략할 수 있다. 예) `find_all(attrs={"id": "potal"})`

**class가 animal_info인 div를 모두 찾기**

```python
result = soup.find_all("div", attrs={"class": "animal_info"})  # 조건에 맞는 모든 div를 ResultSet으로 반환
print(len(result))  # 조회 결과 개수
result
```

```text
4
[<div class="animal_info" id="animal1">
 <div class="name">사자</div>
 <div>3마리</div>
 </div>,
 <div class="animal_info">
 <div class="name">호랑이</div>
 <div>10마리</div>
 </div>,
 <div class="animal_info">
 <div class="name">곰</div>
 <div>5마리</div>
 </div>,
 <div class="animal_info">
 <div class="name">낙타</div>
 <div>6마리</div>
 </div>]
```

문서 전체의 `div`는 13개인데 `class` 조건을 걸어 4개만 남았다.

**첫 번째 결과에서 텍스트와 속성 꺼내기**

```python
tag1 = result[0]
print("content:")
print(tag1.text)
print("----------------------")
print(tag1.get_text())
print(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
print("class속성값:", tag1.get("class"), tag1["class"])
```

```text
content:

사자
3마리

----------------------

사자
3마리

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
class속성값: ['animal_info'] ['animal_info']
```

두 가지가 눈에 띈다.

- `text`에는 HTML의 줄바꿈까지 그대로 들어 있다. 앞뒤 공백을 지우려면 `get_text(strip=True)`를 쓴다. 이때 `사자3마리`처럼 붙어 버리므로 `get_text(" ", strip=True)`로 구분자를 주면 `사자 3마리`가 된다. (`보충`)
- `class` 속성값은 문자열이 아니라 **리스트**다. HTML에서 class는 `class="a b"`처럼 여러 개를 가질 수 있기 때문이다.

**자식 요소 보기: contents**

```python
tag1.contents
```

```text
['\n', <div class="name">사자</div>, '\n', <div>3마리</div>, '\n']
```

자식 태그 두 개 사이사이에 줄바꿈 문자열 `'\n'`이 끼어 있다. 이 문자열은 `Tag`가 아니라 `NavigableString` 타입이다.

**find: 첫 번째 하나만**

```python
result = soup.find("div")  # 조회 결과 1개만 (여러 개면 첫 번째 것) 반환
print(type(result))
print(result)
```

```text
<class 'bs4.element.Tag'>
<div class="animal_info" id="animal1">
<div class="name">사자</div>
<div>3마리</div>
</div>
```

`find`는 리스트가 아니라 `Tag` 하나를 돌려준다. 그래서 `result.text`, `result["class"]`를 바로 쓸 수 있다.

### 필기의 에러: isinstance 사용법

노트북에서 자식 요소 중 문자열을 걸러내려다 에러가 났다.

```python
from bs4.element import NavigableString

for tag in result.contents:
    print(type(tag))
    if isinstance(tag) == NavigableString:
        pass
    print(tag.content)
```

```text
<class 'bs4.element.NavigableString'>
TypeError: isinstance expected 2 arguments, got 1
```

`isinstance`는 `isinstance(객체, 타입)`처럼 인자를 두 개 받아 `True`/`False`를 돌려주는 함수다. 결과를 `==`로 타입과 비교하는 형태가 아니다. 또 `pass`는 아무것도 하지 않으므로 문자열을 건너뛰려면 `continue`를 써야 하고, `tag.content`는 `contents`나 `text`의 오타다. 정리하면서 고쳐 실행했다.

```python
# 고친 버전
for tag in result.contents:
    if isinstance(tag, NavigableString):  # 줄바꿈 문자열은 건너뛴다
        continue
    print(tag.name, tag.get("class"), tag.text)
```

```text
div ['name'] 사자
div None 3마리
```

`class`가 없는 태그에서 `tag.get("class")`는 `None`을 돌려준다. `tag["class"]`로 접근하면 `KeyError`가 나므로, 없을 수도 있는 속성은 `get()`으로 꺼내는 편이 안전하다.

## CSS 선택자로 찾기: select, select_one

| 메소드 | 반환 |
|---|---|
| `select("CSS 선택자")` | 선택자와 일치하는 모든 태그 (`ResultSet`) |
| `select_one("CSS 선택자")` | 일치하는 첫 번째 태그 하나 |

필기에서 선택자를 하나씩 바꿔 가며 실행해 본 목록이다. 각 선택자의 결과를 다시 실행해서 개수와 함께 정리했다.

| 선택자 | 의미 | 결과 |
|---|---|---|
| `a` | 태그 이름 | a 9개 |
| `a, span, img` | 여러 태그 이름 | 11개 |
| `ul a` | ul의 **자손**인 a | 3개 (대공원, 에버랜드, 아쿠아리움) |
| `ul > a` | ul의 **자식**인 a | **0개** |
| `#animal1` | id가 animal1인 모든 태그 | 사자 div |
| `div#animal1` | div 중 id가 animal1 | 사자 div |
| `ul + div` | ul 바로 다음 형제인 div | `div#potal` |
| `body > div:nth-child(3)` | body의 3번째 자식이면서 div | **호랑이** div |
| `a[href]` | href 속성이 있는 a | 9개 |
| `a[href='http://www.google.com']` | href 값이 정확히 일치 | 구글1~4 |
| `a[href$=".do"]` | href가 `.do`로 끝남 | 서울 대공원 |
| `a[href^="https"]` | href가 `https`로 시작 | 3개 |

다시 실행해 보니 필기 주석과 다르게 동작하는 것이 두 개 있었다.

- **`ul > a`는 0개다.** `a`는 `ul`의 자식이 아니라 `li`의 자식이다. `>`는 바로 아래 한 단계만 본다. `ul > li > a`로 써야 3개가 나온다. 공백(자손)과 `>`(자식)의 차이가 결과로 드러난 예다.
- **`body > div:nth-child(3)`은 두 번째 div인 호랑이다.** `nth-child`는 태그 종류와 상관없이 **모든 자식 요소** 중 순번을 센다. body의 첫 번째 자식은 `h1`, 두 번째가 사자 div, 세 번째가 호랑이 div다. "세 번째 div"를 원하면 `div:nth-of-type(3)`을 써야 한다. (`보충`)

```python
result = soup.select("ul + div")  # ul의 다음 형제 태그 중 div
pprint(result)
type(result)
```

```text
[<div id="potal">
<a href="http://www.naver.com">네이버</a>
<a href="http://www.daum.com">다음</a>
<a href="http://www.google.com">구글1</a>
<a href="http://www.google.com">구글2</a>
<a href="http://www.google.com">구글3</a>
<a href="http://www.google.com">구글4</a>
</div>]
bs4.element.ResultSet
```

결과가 하나여도 `select`는 `ResultSet`(리스트)을 돌려준다. 하나만 필요하면 `select_one`을 쓴다.

**여러 태그를 찾은 뒤 a 태그만 처리하기**

```python
result = soup.select("a, span, img")

for tag in result:
    if tag.name == "a":
        print(tag.text, tag["href"], tag.name)  # tag객체.name: 태그 이름
```

```text
서울 대공원 https://grandpark.seoul.go.kr/main/ko.do a
에버랜드 https://www.everland.com/web/everland/favorite/zootopia/index.html a
코엑스아쿠아리움 https://www.coexaqua.com a
네이버 http://www.naver.com a
다음 http://www.daum.com a
구글1 http://www.google.com a
구글2 http://www.google.com a
구글3 http://www.google.com a
구글4 http://www.google.com a
```

`select("a, span, img")`의 결과 순서는 선택자에 쓴 순서가 아니라 **문서에 나오는 순서**다. 그래서 `span`(기린)이 맨 앞에 온다.

### 보충: find와 select 비교

같은 요소를 두 방식으로 찾을 수 있다.

| 찾을 것 | find 계열 | select 계열 |
|---|---|---|
| 동물 이름 4개 | `find_all("div", attrs={"class": "name"})` | `select("div.animal_info > div.name")` |
| 기린 span | `find("span", class_="name")` | `select_one("span.name")` |
| 포털 div | `find(attrs={"id": "potal"})` | `select_one("#potal")` |

```python
[t.text for t in soup.select("div.animal_info > div.name")]
```

```text
['사자', '호랑이', '곰', '낙타']
```

계층 조건(누구의 자식인지)이 들어가면 `select`가 짧다. 개발자 도구에서 복사한 선택자를 바로 쓸 수 있다는 점도 `select`를 주로 쓰게 되는 이유다.

## 정리

```python
soup = BeautifulSoup(html문자열, "lxml")

soup.find("태그", attrs={...})          # Tag 하나
soup.find_all("태그", attrs={...})      # ResultSet
soup.select_one("CSS 선택자")           # Tag 하나
soup.select("CSS 선택자")               # ResultSet

tag.text / tag.get_text(strip=True)    # 텍스트
tag.get("속성") / tag["속성"]           # 속성값
tag.name, tag.contents                 # 태그 이름, 자식 목록
```

- 크롤링의 첫 단계는 코드가 아니라 개발자 도구로 **데이터의 위치와 태그 구조**를 확인하는 것이다.
- `select`의 공백(자손)과 `>`(자식)는 결과가 다르다.
- `nth-child`는 태그 종류와 상관없이 순번을 센다.
- 없을 수도 있는 속성은 `tag.get()`으로 꺼낸다.

다음 글에서는 `requests`로 실제 웹 페이지를 받아 와서 여기서 익힌 BeautifulSoup으로 데이터를 꺼낸다.
