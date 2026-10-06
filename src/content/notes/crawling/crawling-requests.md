---
title: "requests: 웹 요청을 보내고 응답 데이터 받기"
description: "HTTP 요청 방식과 요청 파라미터·헤더의 개념을 정리하고, requests로 웹 페이지와 이미지를 받아 BeautifulSoup으로 파싱한 뒤 CSV로 저장하는 흐름을 다룹니다."
category: 'Tech'
subcategory: 'Data Engineering'
series: '데이터 수집'
seriesOrder: 2
originalNotebook: "02_requests.ipynb"
tags: ["Python","Crawling","requests","HTTP"]
date: 2026-04-24
---

> SKN31 웹 크롤링 실습 노트북 `02_requests.ipynb`의 필기를 바탕으로 정리했습니다.
> 실제 사이트에 요청하는 예제라서 실행 결과는 **노트북에 저장된 출력(2026년 4월 24일 실행)** 을 그대로 실었습니다. 사이트 구조가 바뀌면 같은 코드로 같은 결과가 나오지 않을 수 있습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- HTTP 요청 방식(GET, POST 등)과 requests의 요청 함수
- 요청 파라미터(querystring)와 요청 헤더(User-Agent)
- `Response` 객체로 응답 상태와 내용을 확인하는 방법
- 웹 페이지 받아서 BeautifulSoup으로 파싱하기
- 이미지 같은 binary 파일 내려받기
- 수집 결과를 CSV로 저장하기
- Open API로 데이터 받기

## requests

HTTP 요청과 응답을 처리하는 Python 패키지다. GET·POST 요청을 모두 지원하고, 요청할 때 필요한 헤더와 쿠키 설정 등 HTTP 요청에 필요한 기능을 제공한다.

```bash
pip install requests
```

### HTTP 요청 방식

HTTP는 클라이언트가 서버에 요청하는 **목적**에 따라 방식을 나눈다.

| 방식 | 목적 | CRUD |
|---|---|---|
| `GET` | 서버가 가진 데이터를 요청한다. 기본 방식 | Retrieve |
| `POST` | 클라이언트의 데이터를 서버에 전송(저장)한다 | Create |
| `PUT` | 서버 데이터를 보낸 데이터로 **전체** 변경한다 | Update |
| `PATCH` | 서버 데이터의 **일부**를 변경한다 | Update |
| `DELETE` | 서버 데이터를 삭제한다 | Delete |

이 밖에 `HEAD`, `OPTIONS`, `TRACE`, `CONNECT`가 있다. 전통적인 웹 페이지는 GET과 POST를 쓰고, RESTful API는 GET·POST·PUT·PATCH·DELETE를 쓴다. (필기에는 `HEADER`, `CONECT`로 적혀 있었는데 정식 이름은 `HEAD`, `CONNECT`다.)

### 크롤링 코딩 패턴

1. `requests.get()` / `requests.post()`에 URL을 넣어 서버에 요청한다.
2. 응답받은 내용을 처리한다.
   - 텍스트(HTML)는 BeautifulSoup으로 원하는 내용을 추출한다.
   - binary 파일(이미지, 동영상 등 텍스트가 아닌 모든 파일)은 파일 출력으로 로컬에 저장한다.

## 요청 함수

### requests.get(URL)

GET 방식 요청. 클라이언트가 자원을 **달라고** 하는 것이 목적이다.

| 매개변수 | 내용 |
|---|---|
| `params` | 요청 파라미터를 dictionary로 전달 |
| `headers` | HTTP 요청 헤더를 dictionary로 전달. `User-Agent`, `Referer` 등 |
| `cookies` | 쿠키 정보 전달 |

### requests.post(URL)

POST 방식 요청. 클라이언트가 자기 자원을 서버로 **보내는** 것이 목적이다.

| 매개변수 | 내용 |
|---|---|
| `data` | 요청 파라미터를 dictionary로 전달 |
| `files` | 업로드할 파일을 dictionary로 전달 (key: 이름, value: 열어 둔 파일 객체) |
| `headers`, `cookies` | GET과 같다 |

> **보충: 매개변수 이름.** 필기에는 POST 요청 파라미터 매개변수가 `datas`로 적혀 있었다. requests 문서 기준으로는 `data`다. JSON 본문을 보낼 때는 `json=` 매개변수를 쓴다.

두 함수 모두 응답 결과를 담은 `Response` 객체를 반환한다.

### 요청 파라미터(Request Parameter)

서버가 일하기 위해 클라이언트에게서 받아야 하는 값이다. `name=value` 형식이고, 여러 개면 `&`로 잇는다. 예) `page=1&keyword=test`

- **GET 요청**: URL 뒤에 `?`를 붙이고 파라미터를 이어 쓴다. 이 부분을 **querystring**이라고 한다.
  - 예) `https://search.naver.com/search.naver?sm=top_hty&fbm=1&ie=utf8&query=python`
  - `?`가 URL과 요청 파라미터를 나누는 구분자다.
  - requests에서는 두 방법이 있다.
    1. URL 뒤에 querystring으로 직접 붙인다.
    2. dictionary로 만들어 `params`에 전달한다.
- **POST 요청**: 요청 정보의 body에 넣어 보낸다. requests에서는 dictionary를 `data`에 전달한다.

### 요청 헤더(Request Header)

웹 브라우저가 요청을 보낼 때 클라이언트에 대한 부가 정보를 key-value 형식으로 함께 보낸다.

| 헤더 | 내용 |
|---|---|
| `accept` | 클라이언트가 처리할 수 있는 콘텐츠 타입 (MIME type) |
| `accept-language` | 클라이언트가 지원하는 언어 (예: `ko`, `en-US`) |
| `host` | 요청한 호스트 |
| `user-agent` | 웹 브라우저 종류 |
| `referer` | 어느 페이지에서 왔는지 |

크롤링할 때 필요한 헤더는 개발자 도구의 **Network 탭**에서 실제 요청을 열어 확인한다. 내 브라우저의 User-Agent는 개발자 도구 콘솔에서 `navigator.userAgent`를 실행하거나, 구글에서 "my user agent"로 검색하면 알 수 있다.

## Response 객체

| 속성 | 내용 |
|---|---|
| `url` | 응답한 서버의 URL |
| `status_code` | HTTP 응답 상태 코드 |
| `headers` | 응답 헤더 (dictionary) |
| `text` | 응답 내용을 `str`로. HTML일 때 사용 |
| `content` | 응답 내용을 `bytes`로. 이미지·동영상 등 binary일 때 사용 |
| `json()` | 응답이 JSON이면 dictionary로 변환해 반환 |

### HTTP 응답 상태 코드

서버가 요청을 어떻게 처리했는지 알려 주는 세 자리 숫자다.

| 범위 | 의미 | 대표 코드 |
|---|---|---|
| 2XX | 성공 | `200` OK |
| 3XX | 다른 주소로 이동 | 자동으로 이동해 주므로 크롤링 때 다룰 일이 적다 |
| 4XX | 클라이언트 오류 (요청한 쪽 잘못) | `403` 권한 없음, `404` 없는 주소, `405` 잘못된 요청 방식 (POST만 받는 페이지에 GET으로 요청 등) |
| 5XX | 서버 오류 | `500` 서버 내부 오류, `503` 서비스 불가 |

그래서 크롤링 코드는 `status_code == 200`인지 먼저 확인하고 응답을 처리한다.

## 예제 1: 네이버 검색 결과 받기

```python
import requests

url = "https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query={}"
keyword = input("keyword:")
url = url.format(keyword)
print(f"요청 URL: {url}")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/147.0.0.0 Safari/537.36",
    "Referer": "www.naver.com"
}
res = requests.get(url, headers=headers)

print(res.status_code)
if res.status_code == 200:  # 200이면 요청한 문서를 받은 것. 아니면 에러
    print(type(res))
    print(type(res.text), len(res.text))  # 응답받은 HTML 내용
    print(res.text[:1000])
else:
    print("응답을 받지 못함.", res.status_code)
```

```text
요청 URL: https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=ㄴ
200
<class 'requests.models.Response'>
<class 'str'> 696508
<!doctype html> <html lang="ko"><head> <meta charset="utf-8"> ...
<title>ㄴ : 네이버 검색</title> ...
```

실행할 때 검색어로 `ㄴ`을 넣었다. 응답 HTML이 약 70만 글자다. `<title>`에 검색어가 들어간 것으로 검색 결과 페이지를 제대로 받았는지 확인할 수 있다.

노트북에는 헤더 없이 `requests.get(url)`로 먼저 요청한 줄도 남아 있다. 헤더를 넣지 않으면 requests는 `User-Agent`를 `python-requests/버전`으로 보낸다. 서버 입장에서는 프로그램이 보낸 요청임이 드러나서 차단되거나 다른 페이지가 올 수 있다. 그래서 브라우저의 User-Agent를 복사해 넣는다.

### 보충: params로 보내기

필기에 정리한 두 번째 방법(dictionary → `params`)으로 같은 요청을 쓰면 다음과 같다. 한글 검색어의 URL 인코딩도 requests가 처리한다.

```python
params = {"where": "nexearch", "sm": "top_hty", "fbm": 0, "ie": "utf8", "query": keyword}
res = requests.get("https://search.naver.com/search.naver", params=params, headers=headers)
print(res.url)  # 실제로 요청된 URL (querystring이 붙어 있다)
```

## 예제 2: 받은 HTML을 BeautifulSoup으로 파싱

《전쟁과 평화》 일부가 담긴 연습용 페이지에서 등장인물 이름이 초록색(`<span class="green">`)으로 표시돼 있다. 이 이름들만 모은다.

```python
from bs4 import BeautifulSoup
import requests

url = "http://www.pythonscraping.com/pages/warandpeace.html"
user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"

res = requests.get(url, headers={"user-agent": user_agent})

if res.status_code == 200:
    soup = BeautifulSoup(res.text, "lxml")
    green_list = soup.select("span.green")
    search_names = []
    for tag in green_list:
        search_names.append(tag.text.replace("\n", " "))
else:
    print("실패:", res.status_code)

search_names
```

```text
['Anna Pavlovna Scherer',
 'Empress Marya Fedorovna',
 'Prince Vasili Kuragin',
 'Anna Pavlovna',
 'St. Petersburg',
 'the prince',
 ...
 'Anna Pavlovna']
```

41개가 수집됐다. 지난 글에서 파일로 읽었던 HTML 자리에 `res.text`가 들어갔을 뿐, BeautifulSoup 사용법은 같다. 이름 중간에 줄바꿈이 들어간 경우가 있어서 `replace("\n", " ")`로 공백으로 바꿨다.

결과에는 `Anna Pavlovna`가 9번, `the prince`가 7번 나온다. 중복을 없애려면 `set(search_names)`를 쓰면 된다. 다만 `the prince`와 `The prince`는 대소문자가 달라 다른 값으로 남는다. (`보충`)

## 예제 3: binary 파일 내려받기

이미지 URL에 요청하면 응답 내용이 이미지 데이터 자체다. 텍스트가 아니므로 `content`(bytes)로 받아 `"wb"`(쓰기·바이너리) 모드로 저장한다.

```python
url = "https://species.nibr.go.kr/UPLOAD/digital/species/12000021/120000212946/20180831092453153548.jpg"

res = requests.get(url, headers={"user-agent": user_agent})

if res.status_code == 200:
    file = res.content  # binary 데이터를 bytes 타입으로 반환
    print(type(file))
    with open("tiger.jpg", "wb") as fo:
        fo.write(file)
```

```text
<class 'bytes'>
```

Python 기초 시리즈의 입출력 글에서 정리한 `bytes`와 바이너리 모드 파일 쓰기가 여기서 그대로 쓰였다.

## 예제 4: 다음 뉴스 목록을 CSV로 저장

`news.daum.net`의 기사 목록에서 제목과 상세 기사 URL을 모아 CSV 파일로 저장한다. 노트북에 정리한 크롤링 전 확인 사항은 세 가지다.

1. 요청 URL을 파악한다.
2. 수집할 내용이 어디 있는지 **개발자 도구로** 찾는다.
3. 요청할 때 함께 보낼 헤더·쿠키 정보를 **개발자 도구로** 찾는다.

> **CSV(Comma Separated Values)**: 표 형태의 정형 데이터를 텍스트 파일에 저장하는 형식. 한 행에 데이터 하나를 쓰고, 속성들은 `,`로 구분한다.
> ```text
> 이름,나이,주소
> 홍길동,20,인천
> 이순신,15,서울
> ```

```python
import requests
from bs4 import BeautifulSoup

url = "https://news.daum.net"
# 뉴스 제목: <a>의 content, 링크 주소: <a>의 href 속성값
a_selector = r"#\35 8d84141-b8dd-413c-9500-447b39ec29b9 > ul > li> a"

# user-agent: 1. 개발자도구 > 콘솔: navigator.userAgent, 2. 구글에서 my user agent로 검색
user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"

def get_daum_news_list():
    """
    다음 뉴스 기사 목록을 크롤링하는 함수.
    news.daum.net의 기사 목록에서 "제목", "링크"들을 수집.

    return
        list: [제목, 링크] 목록
    raise
        Exception: 처리 실패 시 발생
    """
    # 1. 요청
    res = requests.get(url, headers={"user-agent": user_agent})
    res.encoding = "utf-8"  # 한글 처리

    # 2. 응답 페이지에서 필요한 정보 추출
    if res.status_code == 200:
        soup = BeautifulSoup(res.text, "lxml")
        a_list = soup.select(a_selector)
        result_list = []
        for a_tag in a_list:
            strong_tag = a_tag.select_one("strong.tit_txt")  # Tag.select_one() → 그 Tag의 하위에서 찾는다
            title = strong_tag.text
            link = a_tag.get("href")
            result_list.append([title.strip(), link])
        return result_list
    else:
        raise Exception(f"요청 실패. 응답코드: {res.status_code}")

if __name__ == "__main__":
    result = get_daum_news_list()

    import os
    from datetime import datetime
    import pandas as pd

    # 저장할 디렉토리 생성
    save_dir = "daum_news_list"
    os.makedirs(save_dir, exist_ok=True)

    # 파일명: 주기적으로 크롤링할 경우 실행 날짜·시간으로 만든다
    d = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    file_path = f"{save_dir}/{d}.csv"

    result_df = pd.DataFrame(result, columns=["제목", "링크주소"])
    result_df.to_csv(file_path, index=False)
```

실행 결과로 `daum_news_list/2026-04-24-17-24-01.csv`가 만들어졌다. 기사 9건이 저장됐고 앞부분은 다음과 같다.

```text
제목,링크주소
대전아쿠아리움 아기 백사자 '보문이' 폐사…희소질환이 원인(종합),https://v.daum.net/v/20260424171810502
"與, 계양·연수 공천 하루만에 인천행…시장탈환·보선사수 총력(종합)",https://v.daum.net/v/20260424171217301
"이란, 호르무즈 광케이블 파괴 언급...세계 인터넷망 위협",https://v.daum.net/v/20260424170434035
```

이 예제에서 정리해 둘 점이 네 가지다.

- **`res.encoding = "utf-8"`**: 서버가 응답 헤더에 인코딩을 정확히 알려 주지 않으면 requests가 다른 인코딩으로 추측해 한글이 깨질 수 있다. 직접 지정해 두면 안전하다.
- **`Tag.select_one()`**: `soup`이 아니라 찾은 `a_tag`에서 다시 `select_one`을 호출했다. 문서 전체가 아니라 그 태그 **안에서만** 찾는다.
- **함수와 docstring으로 분리**: 수집 로직을 함수로 만들고 실패하면 예외를 던지게 했다. Python 기초 시리즈에서 정리한 함수·예외 처리·`if __name__ == "__main__":`이 함께 쓰였다.
- **CSV의 따옴표**: 제목에 `,`가 들어 있으면 pandas가 그 값을 `"..."`로 감싸서 저장한다. 값 안의 `"`는 `""`로 두 번 쓴다. 그래야 다시 읽을 때 열이 밀리지 않는다.

### 보충: 이 선택자는 오래 못 간다

`#\35 8d84141-b8dd-...`는 개발자 도구의 `Copy selector`로 복사한 선택자다. 두 가지를 알아 두면 좋다.

- id가 숫자 `5`로 시작해서 CSS에서는 그대로 쓸 수 없다. 그래서 `5`를 유니코드 이스케이프 `\35 `(16진수 35 = 문자 `5`)로 바꿔 쓴 것이다. 문자열 앞에 `r`을 붙여 Python이 `\`를 건드리지 않게 했다.
- 이런 id는 페이지가 만들어질 때마다 생성되는 값일 가능성이 높다. 사이트가 바뀌면 바로 깨진다. 직접 확인한 결과가 아니라 추정이지만, 크롤러를 오래 쓰려면 `strong.tit_txt`처럼 의미 있는 class를 기준으로 선택자를 잡는 편이 낫다.

## Open API로 데이터 받기

**Open API**는 외부 개발자가 서비스나 데이터에 접근할 수 있도록 공개한 프로그래밍 인터페이스다. 보통 RESTful API 형식이다.

| 특징 | 내용 |
|---|---|
| 공개성 | 누구나 쓸 수 있고 문서가 잘 정리돼 있다 |
| 표준화 | HTTP 프로토콜과 JSON·XML 형식을 쓴다 |
| 보안 | API 키나 OAuth로 인증한다 |

사용 예: 공공데이터포털, 구글 맵 API, X(트위터) API, 네이버 개발자 Open API(검색, 검색어 트렌드 등)

크롤링과 비교하면, HTML에서 데이터를 **찾아내는** 대신 서버가 데이터를 **정해진 형식으로 준다**. 사이트 디자인이 바뀌어도 깨지지 않고, 이용 조건이 명확하다. 제공되는 API가 있으면 크롤링보다 먼저 확인할 경로다.

### 공공데이터포털 이용 절차

1. `data.go.kr`에 회원가입 후 로그인한다.
2. 원하는 데이터를 검색한다.
3. 데이터의 **활용신청**을 한다. 승인되면 API 키(서비스키)를 받는다.
4. 신청 현황은 `마이페이지 > 데이터 활용 > Open API > 활용신청 현황`에서 확인한다.
5. 데이터 상세 페이지의 **Open API 명세 확인 가이드**에 맞춰 요청 URL과 파라미터를 구성한다.
6. 코드를 쓰기 전에 `API 목록`에서 미리 요청을 테스트해 볼 수 있다.

노트북에서는 절차까지만 정리하고 실습 셀은 비어 있다. requests로 요청하는 형태는 다음과 같다. (`보충`: URL과 파라미터 이름은 API마다 다르므로 명세를 따른다.)

```python
import requests

url = "https://apis.data.go.kr/.../요청주소"   # API 명세의 요청 주소
params = {
    "serviceKey": "발급받은_서비스키",
    "pageNo": 1,
    "numOfRows": 10,
    "returnType": "json",     # 명세에 따라 type, _type 등 이름이 다르다
}
res = requests.get(url, params=params)
data = res.json()            # JSON 응답 → dictionary
```

### JSON과 json 모듈

**JSON(JavaScript Object Notation)** 은 key-value 형태나 배열 형태의 텍스트다. 자바스크립트의 객체·배열 문법을 이용하고, 서로 다른 시스템끼리 데이터를 주고받을 때 많이 쓴다. Python dictionary·list 표기와 거의 같다.

| 함수 | 하는 일 |
|---|---|
| `json.loads(문자열)` | JSON 문자열 → dictionary |
| `json.dumps(dictionary)` | dictionary → JSON 문자열 |
| `json.load(파일)` | JSON 파일을 읽어 dictionary로 |
| `json.dump(dictionary, 파일)` | dictionary를 JSON 파일로 저장 |

필기에서는 `json.dump()`를 "dictionary를 JSON 문자열로 변환"으로 적은 곳이 있었다. 문자열로 바꾸는 것은 `dumps`, 파일로 쓰는 것은 `dump`다. 끝의 `s`가 string이라고 기억하면 구분된다. requests에서는 `res.json()`이 `json.loads(res.text)`와 같은 일을 해 준다.

## 정리

```python
res = requests.get(url, params={...}, headers={"user-agent": ...})
if res.status_code == 200:
    res.text      # HTML → BeautifulSoup(res.text, "lxml")
    res.content   # 이미지 등 binary → open(..., "wb")
    res.json()    # JSON → dictionary
```

- 요청 전에 개발자 도구로 **URL, 데이터 위치, 필요한 헤더**를 확인한다.
- User-Agent를 넣지 않으면 프로그램이 보낸 요청으로 드러난다.
- `status_code`를 먼저 확인하고, 실패하면 예외로 알린다.
- 한글이 깨지면 `res.encoding`을 지정한다.
- Open API가 있으면 크롤링보다 먼저 쓴다.

requests는 서버가 처음 보내 주는 HTML만 받는다. JavaScript가 나중에 불러오는 데이터나 스크롤해야 나타나는 데이터는 받지 못한다. 다음 글의 Selenium이 이 문제를 다룬다.
