---
title: "HTML·CSS와 Bootstrap 그리드 레이아웃"
description: "웹이 동작하는 기반(클라이언트·서버, URL, HTTP 요청과 응답)을 짚고, HTML 문서 구조와 주요 태그·시맨틱 태그, CSS 적용 방법과 선택자를 정리한 뒤 Bootstrap의 유틸리티 클래스(margin·padding)와 12컬럼 그리드 시스템, 브레이크포인트로 반응형 3단 레이아웃을 만듭니다."
category: 'Tech'
subcategory: 'Web Frontend'
series: 'HTML·CSS·JavaScript'
seriesOrder: 1
originalNotebook: "12_web_front/Bootstrap (HTML_CSS.pdf, bootstrap_grid_system.md, 01~03.html, layout.html)"
tags: ["Web Frontend","Bootstrap"]
date: 2026-07-22T11:00:00+09:00
thumbnail: '../../../assets/images/notes/web/web-html-css-bootstrap.webp'
---

> SKN31 웹 프론트엔드 수업 자료(`HTML_CSS.pdf`, `bootstrap_grid_system.md`)와 실습 파일(`01_css_basic.html`, `02_container.html`, `03_grid.html`, `layout.html`)을 바탕으로 정리했습니다.

## 이 글에서 다루는 것

- 웹의 기초: 프론트엔드·백엔드, 클라이언트·서버, URL, HTTP
- HTML 문서 구조와 주요 태그, 시맨틱 태그
- CSS 적용 방법 3가지와 선택자
- Bootstrap: 유틸리티 클래스와 12컬럼 그리드, 반응형 브레이크포인트

AI 파트에서 만든 모델과 Agent는 지금까지 노트북과 Streamlit 안에서만 동작했다. 서비스로 만들려면 사용자가 브라우저에서 쓰는 화면(프론트엔드)과 요청을 처리하는 서버(백엔드)가 필요하다. 이 시리즈는 프론트엔드의 기본, 다음 Django 시리즈는 백엔드다.

## 웹의 기초

| 구분 | 하는 일 | 사람 |
|---|---|---|
| **Front End** | 사용자가 보고 상호작용하는 부분 (브라우저·앱에서 실행) | UX/UI 디자이너, 프론트엔드 개발자 |
| **Back End** | 사용자 요청을 처리하는 서버 부분 (API, 인증, 비즈니스 로직, 데이터) | 서버 개발자, DBA, DevOps |
| **Full Stack** | 둘 다 | |

### 클라이언트, 서버, URL

- **서버**는 서비스 제공자, **클라이언트**는 서비스 요청자다. 웹에서는 웹 서버(nginx, Apache)와 웹 브라우저.
- **IP 주소**는 인터넷에 연결된 컴퓨터의 주소, **포트**는 그 컴퓨터 안에서 서비스 프로그램을 구분하는 번호(0~65535)다. 웹 서버 80, HTTPS 443, MySQL 3306, FTP 21. [Docker 글](/notes/devops/docker-basics)의 `-p 8080:80`이 이 포트다.
- **URL**은 자원의 위치를 나타내는 전체 주소다.

```text
scheme://user:password@host:port/path?query#fragment

https://www.google.com/search?q=파이썬
  scheme: https  host: www.google.com  path: /search  query: q=파이썬
```

### HTTP

**HTTP**(HyperText Transfer Protocol)는 HTML 문서를 주고받기 위해 만든 TCP/IP 기반 프로토콜이다. 동영상, 이미지 등 다른 자원도 MIME 타입으로 구분해 주고받는다.

가장 중요한 특징은 **Stateless(무상태)** 다. 연결 → 요청 → 응답 → 연결 종료로 끝나고, 서버는 클라이언트의 상태를 기억하지 않는다. 로그인 상태를 유지하려면 쿠키·세션 같은 별도 장치가 필요한 이유다([LangGraph 메모리 글](/notes/llm/llm-langgraph-memory)의 "LLM API는 stateless"와 같은 문제다).

| 요청 방식 | 목적 | 값 전달 |
|---|---|---|
| **GET** | 서버의 데이터 요청 (기본) | URL 뒤 QueryString `?name=value&name=value`. 문자열만 |
| **POST** | 서버에 데이터 전송 | 요청 **Body**에 담음. 파일도 가능 |
| PUT / DELETE | 자원 변경 / 삭제 | |

요청과 응답은 정해진 형식의 텍스트다.

```text
[GET 요청]
GET /search?keyword=python HTTP/1.1      ← 요청 라인
Host: localhost:8088                     ← 헤더
User-Agent: ...
                                         ← Body (GET은 비어 있음)

[POST 요청]
POST /member/login HTTP/1.1
Host: localhost:8088
...
custom_id=id-1010&password=pwd1234       ← Body에 요청 파라미터

[응답]
HTTP/1.1 200 OK                          ← 응답 라인 (상태 코드)
Content-Type: text/html;charset=utf-8    ← 헤더
...
<html>...</html>                         ← Body
```

## HTML

**HTML은 웹 문서의 구조와 의미를 기술하는 마크업 언어**다. 지금의 웹 문서는 세 언어로 만든다.

| 언어 | 역할 |
|---|---|
| HTML | 내용과 **구조** |
| CSS | **스타일**(디자인) |
| JavaScript | **동작** |

### 태그와 문서 구조

```html
<tag>내용</tag>           <!-- 여는 태그 + 닫는 태그 -->
<tag 속성="값">내용</tag>  <!-- 속성 -->
<br>                       <!-- 내용이 없는 빈 태그 -->
```

태그 안에 태그가 들어가면 부모-자식 관계가 생기고, 브라우저는 문서 전체를 **트리**로 관리한다. 이것이 다음 글들에서 JavaScript로 다룰 **DOM 트리**다.

```html
<!DOCTYPE html>          <!-- HTML5 문서라고 알림 -->
<html>                   <!-- Root 태그 -->
  <head>                 <!-- 문서 정보: 화면에 안 보임 -->
    <meta charset="UTF-8">
    <title>문서 제목</title>
    <link rel="stylesheet" href="style.css">   <!-- 외부 CSS -->
    <style>...</style>                          <!-- 내부 CSS -->
    <script>...</script>                        <!-- JavaScript -->
  </head>
  <body>                 <!-- 화면에 보이는 내용 -->
  </body>
</html>
```

| 태그 | 용도 |
|---|---|
| `<h1>`~`<h6>` | 제목 |
| `<p>` | 문단 |
| `<br>` | 줄바꿈 (HTML에서는 엔터·여러 공백이 공백 하나로 처리됨) |
| `<b>`, `<strong>` / `<i>`, `<em>` | 굵게 / 기울임 |
| `<a href="url">` | 링크 |
| `<img src="url" alt="설명">` | 이미지 |
| `<table>`, `<tr>`, `<td>`, `<th>` | 표 (`rowspan`, `colspan`으로 셀 병합) |
| `<ul>`, `<ol>`, `<li>` | 순서 없는 / 있는 목록 |
| `<!-- -->` | 주석 |

링크 경로는 세 가지다. 실습 파일의 예가 그대로 보여 준다.

```html
<a href="https://www.naver.net">Naver</a>  <br>
<a href="http://127.0.0.1:5500/css/2_concept.html">2_concept.html로 이동</a><br>
<a href="/css/2_concept.html">2_concept.html로 이동</a>
<a href="2_concept.html">2_concept.html로 이동</a><br>
```

| 형태 | 기준 |
|---|---|
| `http://...` | 전체 경로 (다른 사이트 포함) |
| `/css/...` | **절대 경로**. 도메인 루트(`127.0.0.1:5500/`)부터 |
| `2_concept.html`, `../x.html` | **상대 경로**. 지금 보는 문서가 있는 폴더 기준 |

### block과 inline, 시맨틱 태그

| 구분 | 특징 | 예 |
|---|---|---|
| block | 새 줄에서 시작, 가로를 꽉 채움 | `<h1>`, `<p>`, `<table>`, `<ul>`, `<div>` |
| inline | 줄을 바꾸지 않음 | `<b>`, `<a>`, `<img>`, `<span>` |

`<div>`(block)와 `<span>`(inline)은 의미 없이 **구역만** 나눈다. HTML5는 구역에 **의미**를 붙인 시맨틱 태그를 추가했다.

```text
┌──────────── <header> ────────────┐
├──────────── <nav> ───────────────┤
│ <section>             │ <aside>  │
│  <article> <article>  │          │
├──────────── <footer> ────────────┤
```

| 태그 | 의미 |
|---|---|
| `<header>` | 문서·섹션의 머리 (로고, 사이트 소개) |
| `<nav>` | 메뉴 |
| `<section>` | 한 주제의 묶음 |
| `<article>` | 독립적인 글 하나 |
| `<aside>` | 본문과 다른 부가 내용 (사이드바) |
| `<footer>` | 문서·섹션의 하단 (연락처, 저작권) |
| `<figure>` / `<figcaption>` | 이미지와 설명 |

`<div>`로도 같은 화면을 만들 수 있지만, 시맨틱 태그는 검색 엔진과 스크린 리더가 문서 구조를 이해하게 해 준다.

## CSS

**CSS(Cascading Style Sheets)는 HTML 문서를 꾸미는 언어**다. HTML로 구조를, CSS로 모양을 정해 둘을 분리한다.

```css
선택자 { 속성: 값; 속성: 값; }   /* 주석 */

h1 { color: pink; text-decoration: underline; }
```

### 적용 방법 3가지

| 방법 | 위치 | 예 |
|---|---|---|
| Inline | 태그의 `style` 속성 | `<h1 style="color:pink;">` |
| Internal | `<head>` 안 `<style>` | `<style> .box {...} </style>` |
| External | 별도 `.css` 파일을 `<link>`로 | `<link rel="stylesheet" href="style/mystyle.css">` |

실습 파일은 세 가지를 모두 써 본다.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" type="text/css" href="style/mystyle.css"
    <style>
        <!-- .margin-1{
            margin: 100px;
            padding: 100px;
        } 
        .box {
            border: 3px dashed blueviolet ;

        }  -->
    </style>
</head>
<body>
    <h1 style="color:pink;text-decoration: underline;"><b>인사말</b></h1>
    <h2 class="margin-1 box">안녕하세요.</h2>
    <h3 class="margin-1">반갑습니다.</h3>
    <div class ="box">
        Non dolor aliqua qui veniam est id labore aliqua aliqua est.
        ...
    </div>
</body>
</html>
```

```css
/* style/mystyle.css */
.margin-1{
            margin: 100px;
            padding: 100px;
        } 

.box {
            border: 3px dashed blueviolet ;
        }
```

`<style>` 안의 규칙을 외부 파일 `mystyle.css`로 옮기고, 내부 스타일은 주석 처리하려던 것이다. 그런데 두 군데가 어긋났다.

- `<link ... href="style/mystyle.css"` 끝에 **`>`가 빠졌다.**
- `<style>` 안에서 **HTML 주석 `<!-- -->`** 으로 CSS를 주석 처리했다. CSS의 주석은 `/* */`다.

> **보충**: 그래도 화면은 의도대로 나온다. 브라우저는 `>`가 빠진 `<link`를 만나면 **다음 `>`까지**를 같은 태그로 읽는다. 그래서 `<style`까지가 link 태그의 (이상한) 속성이 되고, `<style>`의 `>`에서 link 태그가 닫힌다. link는 정상적으로 `mystyle.css`를 불러오고, `<style>` 요소는 아예 만들어지지 않았으므로 그 아래 `<!-- ... -->`는 진짜 HTML 주석이 된다. 두 실수가 서로를 상쇄한 것이다. 이렇게 HTML은 문법이 틀려도 에러를 내지 않고 최대한 해석해 버려서, 브라우저 개발자 도구(F12)의 Elements 탭에서 실제로 만들어진 구조를 확인하는 습관이 필요하다.

수업 자료는 같은 요소에 여러 방법이 겹치면 **Inline → Internal → External** 순으로 적용된다고 정리한다.

> **보충**: 정확히는 Inline이 가장 우선이고, Internal과 External 사이에는 우선순위 차이가 없다. 둘은 **문서에 나온 순서**대로 적용되어 **나중에 나온 규칙이 이긴다**. 보통 `<link>`를 `<style>`보다 위에 두기 때문에 Internal이 이기는 것처럼 보이는 것이다. 그 외에는 선택자의 **구체성**(id > class > 태그)이 우선순위를 정한다. "Cascading"이 이 규칙들이 계단처럼 겹쳐 적용된다는 뜻이다.

### 선택자

| 선택자 | 의미 | 예 |
|---|---|---|
| `*` | 모든 요소 | |
| `E` | 태그 | `div`, `p` |
| `.C` | class (여러 요소에 공통) | `.box`, `.name1.name2` |
| `#I` | id (요소 하나) | `#nameTF` |
| `E F` | E의 **자손** F | `div p` |
| `E > F` | E의 **자식** F | `div > p` |
| `E + F` / `E ~ F` | 바로 다음 형제 / 뒤의 모든 형제 | `div + p` |
| `E[A]`, `E[A=V]` | 속성 있음 / 값 일치 | `a[target=blank]` |
| `E[A^=V]`, `[A$=V]`, `[A*=V]` | 시작 / 끝 / 포함 | `a[href^="https"]` |
| `:hover`, `:visited` | 마우스 올림, 방문한 링크 | `a:hover` |
| `:first-child`, `:nth-child(n)` | n번째 자식 | `li:nth-child(2n+1)` |
| `:nth-of-type(n)` | 같은 태그 중 n번째 | `p:nth-of-type(2)` |

> **보충**: 수업 자료 표에 `nth-type-of`로 적힌 선택자의 정확한 이름은 `:nth-of-type()`이다. 이 선택자 문법은 [웹 크롤링 글](/notes/crawling/crawling-beautifulsoup)에서 BeautifulSoup의 `select()`로 요소를 찾을 때 쓴 것과 같다. 다음 글에서 JavaScript의 `querySelector()`도 같은 문법을 쓴다.

class는 하나의 요소에 **공백으로 여러 개** 줄 수 있다. 위 실습의 `class="margin-1 box"`가 두 규칙을 함께 받는다. 이 패턴이 Bootstrap의 기본 사용법이다.

## Bootstrap

**Bootstrap은 미리 만들어진 CSS(와 JS) 라이브러리**다. CSS를 직접 쓰지 않고 **class 이름만 붙여** 스타일을 입힌다. Tailwind CSS(유틸리티 클래스 조합), Materialize(구글 머티리얼 디자인)도 같은 범주다.

```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" ...>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" ...></script>
```

설치 없이 CDN 주소를 `<head>`에 넣으면 된다.

```html
<!-- 
    container
    padding, margin 설정
    class 주는 패턴. class="btn btn-primary" : 뭘설정하는지. 추가 설정 class
 
-->
```

`btn btn-primary`처럼 **"무엇인지(btn)" + "어떤 변형인지(primary)"** 를 class 여러 개로 조합한다. 강사님 실습 파일의 버튼과 폼이다.

```html
<!-- 
    마진: m{방향}-크기, 패딩: p{방향}-크기
    방향생략: 사방, t: top, b-bottom, s: left, e: right, 조합: x: s+e, y: t+b
    크기: 1 ~ 6 - 1: 4px, 2배씩 증가. (2: 8px)
-->
<div class="container mt-5">
    <div class="mb-3">
        <label for="exampleFormControlInput1" class="form-label">Email address</label>
        <input type="email" class="form-control" id="exampleFormControlInput1" placeholder="name@example.com">
    </div>

    <h1 class="border p-3 mb-5">인사말</h1>
    <a href="https://www.naver.net" class="btn btn-primary">Naver</a>
    <a class="btn btn-danger m-2" href="...">2_concept.html로 이동</a>
    <a class="btn btn-info" href="...">2_concept.html로 이동</a>
</div>
```

| class | 의미 |
|---|---|
| `container` | 가운데 정렬된 고정 폭 영역. `container-fluid`는 화면 전체 폭 |
| `mt-5`, `mb-3`, `m-2` | margin (top 5단계, bottom 3단계, 사방 2단계) |
| `p-3`, `py-3` | padding (사방, 위아래) |
| `border` | 테두리 |
| `btn btn-primary/danger/info` | 버튼 + 색 |
| `form-label`, `form-control` | 폼 라벨, 입력 칸 |

`<a>` 링크에 `btn` class를 붙이면 링크가 버튼 모양이 된다. 태그는 의미를, class는 모양을 정한다.

> **보충**: 수업 메모의 "1: 4px, 2배씩 증가"는 앞 단계만 맞다. Bootstrap 5의 spacing은 기본값 `$spacer = 1rem(16px)` 기준으로 0=0, 1=0.25rem(4px), 2=0.5rem(8px), 3=1rem(16px), 4=1.5rem(24px), 5=3rem(48px)이다. 3에서 4, 4에서 5로는 2배가 아니다. 그리고 크기 단계는 0~5까지이고, 6은 기본으로는 없다.

### 그리드 시스템

**Grid System은 화면을 행(`row`)과 열(`col`)로 나눠 반응형 레이아웃을 만드는 방식**이다. 한 행을 **12칸**으로 나누고 각 열이 몇 칸을 차지할지 정한다.

```html
<div class="container">
  <div class="row">
    <div class="col-4">4칸</div>
    <div class="col-8">8칸</div>
  </div>
</div>
```

- `.container` → `.row` → `.col-*` 구조를 지킨다.
- 숫자를 안 쓰면(`col`) 남은 폭을 같은 비율로 나눈다.
- 열 안에 다시 `row`와 `col`을 넣어 **중첩**할 수 있다.
- `offset-4`처럼 앞에 빈칸을 둘 수 있다.

```html
<body class="container mt-5">
        
        <!--  동일한 크기 -->
        <div class="row">
            <div class="col-sm">A</div>
            <div class="col-sm">B</div>
            <div class="col-sm">C</div>
        </div>
        <div class="row">
            <div class="col-sm-1">A</div>
            <div class="col-sm-10">B</div>
            <div class="col-sm-1">C</div>
        </div>
        <div class="row">
            <div class="col-sm-5">A</div>
            <div class="col-sm-2">B</div>
            <div class="col-sm-2">C</div>
            <div class="col-sm-2">D</div>
            <div class="col-sm-1">E</div>
        </div>
        <div class="row">
            <div class="col-4 offset-4">가운데 정렬</div>
        </div>
        
</body>
<body>
    <div>
        <p>
            안녕하세요
        </p>
    </div>
</body>
```

| 행 | 칸 배분 | 합 |
|---|---|---|
| 1 | `col-sm` × 3 | 4 + 4 + 4 |
| 2 | 1 + 10 + 1 | 12 |
| 3 | 5 + 2 + 2 + 2 + 1 | 12 |
| 4 | `offset-4` + `col-4` | 4칸 비우고 4칸 → 가운데 |

> **보충**: 이 파일에는 `<body>`가 **두 개** 있다. HTML 문서의 body는 하나뿐이라, 브라우저는 두 번째 `<body>` 태그를 무시하고 그 안의 내용("안녕하세요")을 첫 번째 body 끝에 이어 붙인다. 화면은 깨지지 않지만 의도한 구조는 아니다. 앞의 `<link>`처럼, HTML은 틀려도 조용히 넘어간다.

### 반응형 브레이크포인트

`col-sm-1`의 `sm`이 **브레이크포인트**다. "화면 너비가 이 이상일 때 이 칸 수를 적용하라"는 뜻이다. CSS의 미디어 쿼리를 class로 감싼 것이다.

| 브레이크포인트 | 접두어 | 최소 너비 | 기기 예 |
|---|---|---|---|
| Extra small | `col-` | 없음 | 스마트폰 |
| Small | `col-sm-` | ≥576px | 작은 태블릿 |
| Medium | `col-md-` | ≥768px | 태블릿 |
| Large | `col-lg-` | ≥992px | 노트북 |
| Extra large | `col-xl-` | ≥1200px | 데스크톱 |
| XXL | `col-xxl-` | ≥1400px | 대형 모니터 |

**모바일 우선**(mobile first)이다. 작은 화면 규칙이 기본이고, 큰 화면 규칙이 그 위에 덧씌워진다. 브레이크포인트보다 좁은 화면에서는 `col-sm-*` 규칙이 적용되지 않아 각 열이 **12칸(한 줄 전체)** 을 차지하며 세로로 쌓인다. 위 실습의 1~3행이 휴대폰에서는 A, B, C가 위아래로 늘어서는 이유다.

### 3단 레이아웃

헤더 / 본문(좌·중·우) / 푸터 구조다.

```html
<!-- 1. Header 영역 -->
<header class="container-fluid bg-light border-bottom">
  <div class="row">
    <div class="col-12 py-3 text-center">
      <h1 class="h4">헤더 영역 (12컬럼)</h1>
    </div>
  </div>
</header>

<!-- 2. Main 영역 (3컬럼) -->
<main class="container my-4" style="min-height:60vh;max-height:70vh">
  <div class="row">

    <!-- 좌측 컬럼 -->
    <!-- col-12: 작은 화면에서는 이게 적용됨. 크기 없으면 가장 작은 것이므로. col-md-3: md에서는 3칸. -->
    <div class="col-12 col-md-3 border p-3">
      <h2 class="h6">좌측 (3컬럼)</h2>
      <p>사이드바, 메뉴, 카테고리 영역에 적합</p>
    </div>

    <!-- 중앙 컬럼 -->
    <div class="col-12 col-md-7 border p-3">
      <h2 class="h6">중앙 (7컬럼)</h2>
      <p>주요 콘텐츠 영역에 적합</p>
    </div>

    <!-- 우측 컬럼 -->
    <div class="col-12 col-md-2 border p-3">
      <h2 class="h6">우측 (2컬럼)</h2>
      <p>광고나 추가 정보 영역에 적합</p>
    </div>

  </div>
</main>

<!-- 3. Footer 영역 -->
<footer class="container-fluid bg-light border-top">
  <div class="row">
    <div class="col-12 py-3 text-center">
      <p class="mb-0 small">푸터 영역 (12컬럼)</p>
    </div>
  </div>
</footer>
```

강사님 파일은 `col-md-3`만 썼는데, 여기에 `col-12`를 더해 **작은 화면 규칙을 명시**했다. 주석에 적은 대로 접두어 없는 `col-12`가 가장 작은 화면부터 적용되고, 768px 이상에서 `col-md-*`가 덮어쓴다.

| 화면 | 좌 | 중앙 | 우 |
|---|---|---|---|
| 768px 미만 (휴대폰) | 12 (한 줄) | 12 (한 줄) | 12 (한 줄) |
| 768px 이상 | 3 | 7 | 2 |

> **보충**: 사실 `col-12`를 빼도 결과는 같다. 브레이크포인트에 해당하지 않는 열은 기본으로 전체 폭(12칸)이 되기 때문이다. 그래도 명시하면 "작은 화면에서는 세로로 쌓인다"는 의도가 코드에 드러난다. 헤더와 푸터는 `container-fluid`로 화면 끝까지, 본문은 `container`로 가운데 고정 폭을 써서 폭을 다르게 했다. 시맨틱 태그(`header`, `main`, `footer`)에 Bootstrap class를 붙인 것도 눈여겨볼 부분이다.

## 정리

| 영역 | 핵심 |
|---|---|
| HTTP | 요청(라인·헤더·Body) / 응답(상태 코드·헤더·Body). Stateless. GET은 URL, POST는 Body |
| HTML | 구조. 태그 트리(DOM). 시맨틱 태그로 의미 부여 |
| CSS | 모양. Inline > (Internal·External은 나중 것이 이김). 선택자 구체성 |
| Bootstrap | class 조합으로 스타일. `container > row > col-*`, 12칸, 모바일 우선 브레이크포인트 |

- HTML은 문법이 틀려도 에러를 내지 않는다. **개발자 도구로 실제 구조를 확인**한다.
- 선택자 문법은 CSS, 크롤링(BeautifulSoup), JavaScript(querySelector)에서 공통으로 쓴다.
- 그리드 한 행의 칸 합은 12. 브레이크포인트 아래에서는 열이 한 줄씩 쌓인다.

다음 글에서는 문서에 동작을 붙이는 JavaScript의 기본 문법을 다룬다.
