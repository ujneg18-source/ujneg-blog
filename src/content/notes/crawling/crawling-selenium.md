---
title: "Selenium: 브라우저를 움직여 동적 페이지 수집하기"
description: "requests로 받을 수 없는 동적 페이지를 Selenium으로 수집하는 방법을 정리합니다. WebDriver 생성, 요소 조회와 입력·클릭, headless 모드, 대기, 무한 스크롤 처리까지 다룹니다."
category: 'Tech'
subcategory: 'Data Engineering'
series: '데이터 수집'
seriesOrder: 3
originalNotebook: "03_Selenium.ipynb"
tags: ["Python","Crawling","Selenium"]
date: 2026-04-27
---

> SKN31 웹 크롤링 실습 노트북 `03_Selenium.ipynb`의 필기를 바탕으로 정리했습니다.
> 실제 브라우저를 띄우는 예제라서 실행 결과는 **노트북에 저장된 출력(2026년 4월 실행)** 을 그대로 실었습니다. 사이트 구조가 바뀌면 같은 결과가 나오지 않을 수 있습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- requests로 수집하기 어려운 페이지와 Selenium이 필요한 이유
- WebDriver를 만들고 페이지를 이동하는 방법
- WebDriver의 주요 메소드: `page_source`, 스크린샷, 창 크기, `execute_script`
- `find_element`로 요소를 찾고 입력·클릭하는 방법
- 창을 띄우지 않는 headless 모드
- 로딩을 기다리는 Implicit Wait와 Explicit Wait
- 무한 스크롤 페이지 끝까지 내리기

## requests의 한계

노트북 첫머리에 수업 내용을 이렇게 메모했다.

- HTML, CSS, JavaScript는 웹 브라우저 환경에서 돌아가는 언어다.
- requests로 받으면 **처음 눈에 보이는 메인 페이지 분량**만 온다. 스크롤하거나 버튼을 눌러야(동적) 나머지 내용이 생긴다.
- 예를 들어 지도 앱의 지하철 도착 정보는 페이지가 열린 뒤 JavaScript가 데이터 서버(지하철 운영 기관의 Open API 등)에서 따로 불러온다. 이런 비동기 요청을 **AJAX**라고 한다.

정리하면 requests로는 다음 두 경우가 어렵다.

1. JavaScript(AJAX)로 데이터를 나중에 불러오는 페이지
2. 로그인해야 볼 수 있는 페이지

Selenium을 쓰면 둘 다 처리할 수 있다.

## Selenium

**웹 브라우저 제어 도구**다. 원래는 웹 애플리케이션을 자동으로 테스트하려고 만든 프레임워크로, 프로그램으로 웹 브라우저를 조작할 수 있다. 브라우저가 실제로 페이지를 열고 JavaScript까지 실행하므로, 사람이 보는 화면과 같은 HTML을 얻을 수 있다.

노트북 첫 줄 메모가 장단점을 요약한다. "**범용성이 좋은데, 느림**". 브라우저를 통째로 띄우고 페이지가 그려질 때까지 기다려야 하기 때문이다.

```bash
pip install selenium
```

| | requests | Selenium |
|---|---|---|
| 동작 | HTTP 요청만 보낸다 | 실제 브라우저를 조작한다 |
| JavaScript 실행 | 안 됨 | 됨 |
| 클릭·입력·스크롤 | 안 됨 | 됨 |
| 속도 | 빠르다 | 느리다 |

## Driver

**Driver**는 웹 브라우저를 제어하는 프로그램이다. 브라우저마다 따로 제공된다(크롬은 ChromeDriver). Python 코드는 Selenium의 `WebDriver` 객체를 통해 Driver에 명령하고, Driver가 브라우저를 움직인다.

수업에서는 브라우저 버전에 맞는 Driver를 자동으로 내려받아 주는 `webdriver-manager`를 썼다.

```bash
pip install webdriver-manager
```

```python
from webdriver_manager.chrome import ChromeDriverManager

# driver를 다운받고 그 경로(path)를 반환
driver_path = ChromeDriverManager().install()
driver_path
```

```text
'C:\\Users\\Playdata\\.wdm\\drivers\\chromedriver\\win64\\147.0.7727.117\\chromedriver-win32/chromedriver.exe'
```

설치된 크롬 버전(147)에 맞는 ChromeDriver가 받아졌다.

> **보충:** Selenium 4.6부터는 Selenium Manager가 포함되어 `webdriver.Chrome()`만 호출해도 Driver를 자동으로 찾아 준다. `webdriver-manager` 없이도 동작하지만, 수업 코드는 Driver 경로를 직접 지정하는 방식을 썼다.

## WebDriver 생성과 페이지 이동

WebDriver를 만들면 웹 브라우저가 실행되고, 그 브라우저를 WebDriver로 조작한다.

```python
from selenium.webdriver.chrome.service import Service
from selenium import webdriver

service = Service(executable_path=driver_path)
browser = webdriver.Chrome(service=service)  # 웹 브라우저를 제어할 수 있는 Driver 객체 반환

browser.get("https://www.naver.com")  # 페이지 이동
browser.get("https://www.daum.net")
browser.close()                       # 브라우저 끄기
```

`browser.get()`을 실행할 때마다 띄워진 크롬 창이 실제로 그 주소로 이동한다.

## WebDriver 주요 속성과 메소드

| 속성·메소드 | 하는 일 |
|---|---|
| `page_source` | 현재 페이지의 HTML 소스 반환. BeautifulSoup에 넣어 파싱할 수 있다 |
| `get_screenshot_as_file(파일경로)` | 현재 화면을 캡처해 파일로 저장 |
| `set_window_size(width, height)` | 창 크기 조정 |
| `maximize_window()` | 창 최대화 |
| `get_window_size()` | 창 크기 조회 |
| `execute_script("자바스크립트코드")` | JavaScript 코드 실행 |
| `close()`, `quit()` | 브라우저 종료 |

> **보충: close()와 quit()의 차이.** 필기에는 둘 다 "브라우저 종료"로 적었는데 범위가 다르다. `close()`는 **현재 창(탭) 하나**를 닫고, `quit()`은 모든 창을 닫고 **Driver 프로세스까지** 종료한다. 크롤링을 마칠 때는 `quit()`을 쓰는 편이 백그라운드에 Driver가 남지 않아 안전하다.

```python
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

service = Service(executable_path=ChromeDriverManager().install())
browser = webdriver.Chrome(service=service)
browser.get("https://www.naver.com")  # 주소의 페이지로 이동
```

**page_source: 브라우저가 그린 HTML 가져오기**

```python
# BeautifulSoup으로 요소를 찾으려면 page_source를 넣어 BeautifulSoup 객체를 만든다
html = browser.page_source
print(html[:500])  # str 반환
```

```text
<html lang="ko" class="fzoom" data-theme="greenLight"><head><script async="" src="https://ntm.pstatic.net/ex/nlog.js"></script> ... <meta charset="utf-8"> ...
```

requests의 `res.text`와 같은 역할이지만, **JavaScript가 실행된 뒤의** HTML이라는 점이 다르다.

**스크린샷과 창 크기**

```python
browser.get_screenshot_as_file("naver_main.png")  # 스크린샷을 찍어 저장
browser.maximize_window()                          # 창 최대화
size = browser.get_window_size()                   # 창 크기 조회
print(size)
```

```text
True
{'width': 1552, 'height': 832}
```

**JavaScript 실행과 alert 창 닫기**

```python
browser.execute_script("alert('안녕');")  # 자바스크립트 코드 실행

alert_window = browser.switch_to.alert
alert_window.accept()                      # alert의 확인 버튼 누르기
```

`alert` 창이 떠 있는 동안에는 다른 조작이 막힌다. `switch_to.alert`로 alert 창으로 전환한 뒤 `accept()`로 닫아야 다음 명령을 실행할 수 있다.

## 요소 조회: find_element, find_elements

BeautifulSoup 없이 Selenium 자체 기능으로 요소를 찾을 수 있다.

| 메소드 | 반환 |
|---|---|
| `find_element(by, value)` | 조건을 만족하는 첫 번째 요소 (`WebElement`) |
| `find_elements(by, value)` | 조건을 만족하는 모든 요소 (`WebElement` 리스트) |

`by`에는 검색 방식을, `value`에는 검색 조건 문자열을 넣는다.

| by | 검색 기준 |
|---|---|
| `By.ID` | id 속성 |
| `By.CLASS_NAME` | class 이름 |
| `By.TAG_NAME` | 태그 이름 |
| `By.CSS_SELECTOR` | CSS 선택자 |
| `By.XPATH` | XPath |
| `By.LINK_TEXT` | 링크 텍스트 전체 일치 |
| `By.PARTIAL_LINK_TEXT` | 링크 텍스트 일부 일치 |

### WebElement

조회 결과 타입이다. BeautifulSoup의 `Tag`와 달리 **화면의 실제 요소**라서 입력하고 클릭할 수 있다.

| 메소드·속성 | 하는 일 |
|---|---|
| `get_attribute("속성명")` | 속성값 조회 |
| `send_keys("문자열")` | 입력 폼에 문자열 입력 |
| `click()` | 요소 클릭 |
| `submit()` | 폼 전송 |
| `clear()` | 입력 폼의 텍스트 지우기 |
| `find_element()` 등 | 하위 요소 조회 |
| `text` | 태그 안의 텍스트 |
| `tag_name` | 태그 이름 |

### 실습: 네이버에서 검색하기

**검색창 찾기**

```python
# 페이지 안에서 특정 element를 조회 (BeautifulSoup의 select(), find() 역할)
# find_element(찾는 패턴 기준, "찾는 패턴")
query_textfield = browser.find_element(By.ID, "query")
print(type(query_textfield))

print(query_textfield.tag_name)
print(query_textfield.get_attribute("id"))
print(query_textfield.get_attribute("name"))
```

```text
<class 'selenium.webdriver.remote.webelement.WebElement'>
input
query
query
```

네이버 메인의 검색창은 `id="query"`, `name="query"`인 `<input>` 태그다. id는 개발자 도구에서 확인했다.

**검색어 입력하고 Enter**

```python
query_textfield.send_keys("날씨 예보")
query_textfield.send_keys(Keys.ENTER)  # 키보드의 Enter 키 입력
```

`Keys`에는 Enter, Tab, 방향키처럼 특수 키가 정의돼 있다.

**검색 결과 페이지에서 다시 검색**

```python
query_textfield2 = browser.find_element(By.ID, "nx_query")

query_textfield2.clear()                # 기존 검색어 지우기
query_textfield2.send_keys("미세먼지")
query_textfield2.send_keys(Keys.ENTER)
```

검색 결과 페이지로 넘어가면 검색창의 id가 `nx_query`로 바뀐다. **페이지가 바뀌면 이전 페이지에서 찾은 요소는 더 이상 쓸 수 없다**. 그래서 새 페이지에서 다시 찾았다. 기존 검색어가 남아 있으므로 `clear()`로 먼저 지웠다.

**버튼 클릭으로 검색**

```python
search_btn = browser.find_element(By.CLASS_NAME, "bt_search")
search_btn.click()

browser.close()
```

Enter 대신 검색 버튼을 찾아 `click()`해도 된다. 사람이 하는 조작을 코드로 그대로 옮기는 셈이다.

## headless 모드

**headless 브라우저**는 창을 띄우지 않고 실제 브라우저와 똑같이 동작하는 방식이다.

- 화면이 없는 CLI 기반 OS(리눅스 서버 등)에서 브라우저를 쓰기 위해 만들어졌다.
- 크롬은 버전 60부터 지원한다.
- Selenium에서는 WebDriver 옵션에 headless를 설정한다. ([Browser Options 문서](https://www.selenium.dev/documentation/webdriver/drivers/options/))

```python
from selenium import webdriver
import time

option = webdriver.ChromeOptions()
option.add_argument("--headless")
service = Service(executable_path=ChromeDriverManager().install())

browser = webdriver.Chrome(service=service, options=option)
browser.maximize_window()
browser.get("https://www.daum.net")

time.sleep(1)  # 지정한 초만큼 일시 멈춤
browser.get_screenshot_as_file("daum_main2.png")
browser.close()
print("완료")
```

창은 뜨지 않지만 스크린샷은 저장된다. 브라우저가 화면 밖에서 페이지를 그리고 있다는 뜻이다. 서버에 크롤러를 올려 정기적으로 실행할 때 쓰는 방식이다.

## 대기하기

브라우저가 페이지를 다 그리기 전에 요소를 찾으면 `NoSuchElementException`이 난다. 위 예제의 `time.sleep(1)`처럼 무조건 기다릴 수도 있지만, 너무 짧으면 실패하고 너무 길면 시간이 낭비된다. Selenium은 두 가지 대기 방법을 제공한다.

### Implicit Wait

- 찾는 요소가 아직 없으면 **설정한 시간까지** 로딩을 기다린다.
- 그 안에 요소가 나타나면 바로 대기를 끝낸다.
- 한 번 설정하면 WebDriver가 닫힐 때까지 **모든 조회에** 적용된다.

```python
browser.implicitly_wait(5)
# 요소를 찾을 때 최대 5초까지 기다린다 (찾으면 5초가 되지 않아도 대기를 끝낸다)
```

필기에는 `implicit_wait(5)`로 적혀 있는데 실제 메소드 이름은 `implicitly_wait`다. 아래 무한 스크롤 코드에서는 `implicitly_wait`로 맞게 썼다.

### Explicit Wait

- **특정 조건**을 만족할 때까지 기다린다.
- `WebDriverWait(browser, 초).until(조건)` 형식이다.
- 조건 함수는 `selenium.webdriver.support.expected_conditions` 모듈에 정의돼 있다. ([문서](https://selenium-python.readthedocs.io/api.html#module-selenium.webdriver.support.expected_conditions))

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

try:
    # element가 나타날 때까지 최대 10초 기다린다
    element = WebDriverWait(browser, 10).until(
        EC.presence_of_element_located((By.ID, "myDynamicElement"))
    )
finally:
    browser.quit()
```

| | Implicit Wait | Explicit Wait |
|---|---|---|
| 적용 범위 | 모든 요소 조회에 공통 | 지정한 한 곳 |
| 기다리는 조건 | 요소가 존재할 때까지 | 존재, 클릭 가능, 보임 등 원하는 조건 |
| 설정 | 한 번 | 필요할 때마다 |

(`보충`: 필기 예제에는 `WebDriverWait`의 import 줄이 빠져 있어 추가했다.)

## 무한 스크롤

스크롤을 내릴 때마다 데이터를 더 불러오는 페이지는 끝까지 스크롤한 뒤 `page_source`를 가져와야 전체 데이터가 들어 있다. JavaScript 두 개를 쓴다.

| JavaScript | 의미 |
|---|---|
| `document.documentElement.scrollHeight` | 현재 페이지 전체 높이 (스크롤바가 움직이는 공간의 길이) |
| `window.scrollTo(x, y)` | 스크롤바를 가로 x, 세로 y 위치로 이동 |

**포켓몬 도감 페이지 끝까지 스크롤하기**

```python
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
import random

service = Service(executable_path=ChromeDriverManager().install())
browser = webdriver.Chrome(service=service)

browser.implicitly_wait(5)
browser.maximize_window()

browser.get("https://pokemonkorea.co.kr/pokedex")
time.sleep(2)

scroll_pane_height = browser.execute_script(
    "return document.documentElement.scrollHeight"  # 문서의 height를 반환
)
# scroll_pane_height: 이동 전 높이, new_scroll_pane_height: 이동 후 높이
while True:
    browser.execute_script("window.scrollTo(0, document.documentElement.scrollHeight)")

    time.sleep(random.uniform(1.5, 2.5))  # 1.5 ~ 2.5초 사이의 랜덤한 시간 대기
    new_scroll_pane_height = browser.execute_script(
        "return document.documentElement.scrollHeight"
    )
    # 이동 전과 이동 후 높이가 같다면 종료
    if scroll_pane_height == new_scroll_pane_height:
        break
    scroll_pane_height = new_scroll_pane_height

html = browser.page_source
browser.close()
```

```python
from bs4 import BeautifulSoup

soup = BeautifulSoup(html, "lxml")
h3 = soup.select("a > div.bx-txt > h3")
print(len(h3))
```

```text
1302
```

동작 순서는 다음과 같다.

1. 현재 페이지 높이를 기록한다.
2. 페이지 맨 아래로 스크롤한다. 새 데이터가 로딩되며 페이지가 길어진다.
3. 로딩을 기다린 뒤 높이를 다시 잰다.
4. 높이가 그대로면 더 불러올 데이터가 없다는 뜻이므로 멈춘다. 늘어났으면 2번으로 돌아간다.

끝까지 내린 뒤 받은 HTML에서 포켓몬 이름(`h3`) 1,302개를 찾았다. 수집은 Selenium으로, 파싱은 BeautifulSoup으로 나눠 맡긴 구조다.

정리하면서 고친 부분이 하나 있다. 원본 주석은 `0.5 ~ 1.5의 random한 값 생성`이었지만 코드는 `uniform(1.5, 2.5)`라 주석을 코드에 맞게 고쳤다. 대기 시간을 일정하게 두지 않고 랜덤하게 주는 것은 짧은 간격으로 반복 요청해서 서버에 부담을 주거나 기계적인 요청으로 보이는 것을 줄이기 위해서다.

## 정리

```python
browser = webdriver.Chrome(service=Service(driver_path), options=option)  # headless는 option에
browser.implicitly_wait(5)
browser.get(url)

el = browser.find_element(By.ID, "query")
el.send_keys("검색어"); el.send_keys(Keys.ENTER); el.click()

browser.execute_script("window.scrollTo(0, document.documentElement.scrollHeight)")
html = browser.page_source        # → BeautifulSoup으로 파싱
browser.quit()
```

| 상황 | 도구 |
|---|---|
| 요청 한 번으로 받은 HTML에 데이터가 있다 | requests + BeautifulSoup |
| JavaScript로 나중에 불러오는 데이터, 클릭·입력·스크롤이 필요하다 | Selenium (+ BeautifulSoup) |
| 서비스가 데이터를 API로 제공한다 | Open API |

- Selenium은 범용성이 높지만 느리다. requests로 되는지 먼저 확인한다.
- 페이지가 바뀌면 요소를 다시 찾는다.
- 고정된 `sleep`보다 `implicitly_wait`나 `WebDriverWait`로 필요한 만큼만 기다린다.
- 작업이 끝나면 `quit()`으로 Driver까지 종료한다.
