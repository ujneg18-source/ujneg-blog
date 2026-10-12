---
title: "Django 시작하기: 웹 요청의 흐름과 프로젝트·앱·MVT 구조"
description: "HTTP 요청·응답과 GET·POST, 웹 서버와 WSGI의 역할을 짚고, django-admin으로 프로젝트와 앱을 만든 뒤 URLconf·View·Template으로 첫 페이지를 응답하기까지 설문 프로젝트(mypoll)의 실제 코드와 실행 결과로 정리합니다."
category: 'Tech'
subcategory: 'Django'
series: 'Django'
seriesOrder: 1
originalNotebook: "13_django (Django1.pdf, mypoll/readme.md, mypoll/config·polls)"
tags: ["Django"]
date: 2026-07-24T11:00:00+09:00
thumbnail: '../../../assets/images/notes/django/django-getting-started.webp'
---

> SKN31 Django 수업 자료(`Django1.pdf`)와 수업 중 만든 설문 프로젝트 `mypoll`의 코드·필기를 바탕으로 정리했습니다.
> 출력은 프로젝트 사본을 Django 테스트 클라이언트로 요청해 **직접 실행**한 결과입니다. 수업은 Django 6.0.7(Python 3.13)을 썼고, 실행 환경이 Python 3.10이라 Django 5.2.18로 실행했습니다. 이 글의 내용에서는 두 버전의 동작 차이가 없습니다.

## 이 글에서 다루는 것

- 웹 요청의 흐름: HTTP, GET·POST, 요청 파라미터
- 웹 서버·WSGI·Django의 역할
- 프로젝트와 앱 만들기
- URLconf → View → Template 연결
- 템플릿 상속(`extends`, `block`)
- 관리자 앱(admin)

[HTML·CSS·JavaScript 시리즈](/notes/web/web-form-fetch)에서 브라우저가 요청을 **보내는** 쪽을 봤다. 이번 시리즈는 그 요청을 **받아 처리하는** 서버다.

## 웹 요청의 흐름

HTTP는 HTML 문서를 주고받으려고 만든 TCP/IP 위의 프로토콜이다. 한 번의 흐름은 이렇다.

1. 연결 (클라이언트 → 서버)
2. 요청 (클라이언트 → 서버)
3. 응답 (서버 → 클라이언트)
4. 연결 끊기

요청이 끝나면 연결을 끊고 서버는 클라이언트를 기억하지 않는다. 이것이 **무상태(Stateless)** 이고, 로그인처럼 "누가 요청했는지"를 이어 가야 하는 기능은 쿠키·세션이라는 별도 장치가 필요하다(6편).

### 요청과 응답의 모양

요청은 **요청 라인 + 헤더 + 바디**로 이루어진다. 강의 자료의 예시다.

```text
GET 방식
요청라인   GET /member/search?category=title&keyword=python HTTP/1.1
헤더       Host: localhost:8088
           Accept-Encoding: gzip
요청 Body  (비어 있음)

POST 방식
요청라인   POST /member/register HTTP/1.1
헤더       Host: localhost:8088
요청 Body  id=id-111&password=1234&name=김영수&age=20
```

| | GET | POST |
|---|---|---|
| 목적 | 서버의 데이터 **요청**(조회) | 서버에 데이터 **전송**(등록·변경) |
| 요청 파라미터 위치 | URL 뒤 쿼리 스트링 `?name=value&...` | 요청 바디 |
| 보낼 수 있는 것 | 문자열 | 문자열 + 파일 |
| HTML | `<form>` 기본값, 링크 | `<form method="post">` |

요청 파라미터는 사용자가 서버로 보내는 `name=value` 쌍이고 여러 개면 `&`로 잇는다. 지난 시리즈에서 JavaScript로 보던 바로 그 값이다.

응답은 **응답 라인(상태 코드) + 헤더 + 바디**다.

```text
응답라인   HTTP/1.1 200 OK
헤더       Content-Type: text/html;charset=utf-8
응답 Body  <html> ... </html>
```

### 웹 서버, WSGI, Django

동적인 응답(요청마다 프로그램이 처리해서 만드는 응답)을 하려면 세 층이 필요하다.

| 층 | 하는 일 | 예 |
|---|---|---|
| 웹 서버 | 요청을 가장 먼저 받음. 정적 파일은 직접 응답, 동적 요청은 뒤로 넘김 | NGINX, Apache |
| WSGI/ASGI 서버 | 웹 서버와 파이썬 웹 앱 사이의 표준 인터페이스. 파이썬 웹 앱 **실행 환경** | Gunicorn, Uvicorn |
| 웹 애플리케이션 | 요청을 처리해 응답을 만듦 | Django, Flask, FastAPI |

ASGI는 WSGI의 비동기 버전으로 웹소켓 같은 비동기 작업을 지원한다. 개발할 때는 `python manage.py runserver`가 웹 서버 + WSGI 역할을 한꺼번에 하는 테스트 서버를 띄워 준다. 실제 배포에서 NGINX와 Gunicorn을 나눠 세우는 과정은 AWS 시리즈에서 다룬다.

강의 자료 여백에 적어 둔 필기가 프레임워크의 의미를 요약한다.

```text
frame work => 운영-실행까지해주는
web 실행환경=>django
=> 사용자의 요청에 따른 이벤트핸들링
framework => 라이브러리 + 실행환경
app.py 만들때, 규칙에 맞춰 만듦
```

라이브러리는 **내가 호출**하고, 프레임워크는 정해진 규칙대로 코드를 두면 **프레임워크가 내 코드를 호출**한다. Django에서는 "요청이 오면 이 URL에 연결된 함수를 실행한다"가 그 규칙이다.

| 프레임워크 | 성격 |
|---|---|
| Django | "배터리 포함" 풀스택. ORM, 관리자 페이지, 인증, 폼, 세션이 기본 제공 |
| Flask | 핵심만 있는 마이크로 프레임워크. 나머지는 골라서 확장 |
| FastAPI | 타입 힌트 기반 비동기 API 프레임워크. 자동 문서화·검증 |

## MVT 패턴

Django는 코드를 역할에 따라 셋으로 나눈다.

| 구성 요소 | 역할 | 필기 |
|---|---|---|
| Model | 데이터베이스의 데이터를 다룸. ORM으로 SQL 없이 CRUD | model = class |
| View | 요청을 받아 응답까지의 처리 흐름 담당 | view = 함수 |
| Template | 사용자에게 보여 줄 응답 화면 | template = html을 기반으로 함 |

요청 한 번의 흐름은 이렇다.

```text
1. 브라우저 요청 → URLconf가 URL에 맞는 View를 찾음
2. View → Model에 CRUD 요청 → ORM이 SQL로 DB 처리
3. View → Template에 데이터를 넘겨 응답 화면 생성
4. 완성된 HTML을 브라우저에 응답
```

> **보충**: 다른 프레임워크의 MVC(Model-View-Controller)와 이름이 엇갈린다. MVC의 Controller 역할을 Django는 **View**가, MVC의 View(화면) 역할을 **Template**이 맡는다. Django의 View는 화면이 아니라 처리 로직이다.

## 프로젝트와 앱 만들기

**프로젝트**는 웹사이트 전체, **앱**은 그 안에서 특정 기능을 맡는 부품이다. 설문 프로젝트 `mypoll`에는 설문(`polls`), 회원(`account`), 채팅(`chat`) 앱이 들어간다. 앱을 나누는 이유는 재사용성과 유지보수성이다.

수업 필기(`readme.md`)에 정리한 순서 그대로다.

```text
1. mypoll  프로젝트 디렉토리 생성
2. 가상환경을 생성 (mypoll안에서 생성)
    - `uv venv .venv --python=3.13`
    - 활성화
3. django 설치
    -`uv pip install django`

4. 장고 프로젝트 생성
    - `django-admin startproject config .`
    - `config`: 전체 시스템(proejct)의 설정파일들을 저장할 디렉토리 이름
    - `.`: 디렉토리 생성할 위치 (`.`: 현재 디렉토리)
    - `manage.py`: 장고프로젝트를 관리하는 툴(too) 스크립트
5. 개발서버 실행
    - `python manage.py runserver`
    - Web Browser: `http://127.0.0.1:8000` 
    - 서버종료: `control+c`
6. APP생성
    - `python manage.py startapp APP이름`
    - `python manage.py startapp polls`
    - 생성된 APP을 프로젝트에 등록
        - config/settings.py(프로젝트 설정파일) 열기
        - `INSTALLED_APP=[]` 리스트에 APP이름을 추가.
```

`startproject config .`의 마지막 `.`이 중요하다. 생략하면 `mypoll/config/config/`처럼 디렉토리가 한 단계 더 생긴다. 미리 만든 `mypoll` 안에 설정 디렉토리 이름을 `config`로 두면 "설정은 config, 기능은 앱"이 한눈에 보인다.

직접 실행(`django-admin startproject config .` + `python manage.py startapp polls` 직후의 파일):

```text
./manage.py
./config/__init__.py
./config/asgi.py
./config/settings.py
./config/urls.py
./config/wsgi.py
./polls/__init__.py
./polls/admin.py
./polls/apps.py
./polls/migrations/__init__.py
./polls/models.py
./polls/tests.py
./polls/views.py
```

| 파일 | 역할 |
|---|---|
| `manage.py` | 프로젝트 관리 명령 실행(`runserver`, `startapp`, `migrate` ...) |
| `config/settings.py` | 프로젝트 전역 설정 |
| `config/urls.py` | 최상위 URLconf. 요청 URL과 View(또는 앱별 urls.py)를 연결 |
| `config/wsgi.py`, `asgi.py` | WSGI/ASGI 서버가 앱을 불러올 진입점 |
| `앱/models.py` | Model 클래스 |
| `앱/views.py` | View 함수 |
| `앱/admin.py` | 관리자 앱에 등록할 Model |
| `앱/migrations/` | Model 변경 내역(마이그레이션 파일) |

`urls.py`는 앱에 자동으로 생기지 않아 직접 만든다. 앱을 쓰려면 `settings.py`의 `INSTALLED_APPS`에 이름을 넣는다. `mypoll`의 최종 설정이다.

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'polls',
    'account',
    'django_bootstrap5',
    'chat',
]
```

위 6개는 Django가 기본으로 넣어 둔 앱(관리자, 인증, 세션 등)이다.

### settings.py에서 짚을 것

```python
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
DEBUG = True # False로 바꾸면 디버깅 될 때마다 서버가 재시작되는 것을 막음
ALLOWED_HOSTS = []
```

`DEBUG` 옆 주석은 정확하지 않다. 코드를 고칠 때마다 개발 서버가 재시작되는 것은 `runserver`의 자동 리로드 기능이고 `DEBUG`와 관계없다(끄려면 `runserver --noreload`). `DEBUG`가 정하는 것은 이런 것들이다.

| | `DEBUG = True` | `DEBUG = False` |
|---|---|---|
| 에러 발생 시 | 코드·설정값이 보이는 노란 에러 페이지 | 일반 500 페이지 |
| `ALLOWED_HOSTS` | 비어 있어도 localhost 허용 | 반드시 지정 |
| 정적 파일 | `runserver`가 서빙 | 웹 서버(NGINX 등)가 서빙해야 함 |

에러 페이지에 설정과 코드가 노출되므로 **배포 서버에서는 반드시 `False`** 다.

`SECRET_KEY`는 세션·CSRF 토큰 서명에 쓰는 비밀값이다. `startproject`는 이 값을 `settings.py`에 직접 적어 주는데, 그대로 저장소에 올리면 함께 공개된다. 그래서 DB 비밀번호·API 키와 같이 `.env`에 두고 `os.getenv()`로 읽는다. 저장소에는 값을 비운 `.env.example`만 올려 어떤 항목이 필요한지 알린다.

```text
# .env.example
DJANGO_SECRET_KEY=
OPENAI_API_KEY=
DATABASE_NAME=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_HOST=
```

새 키는 `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`로 만든다.

## URLconf: 요청 URL과 View 연결

요청이 오면 Django는 `settings.ROOT_URLCONF`(`config/urls.py`)의 `urlpatterns`를 위에서부터 비교한다. `mypoll`의 최상위 URLconf다.

```python
from django.contrib import admin
from django.urls import path, include
from polls import views
# from chat import views as chat_views
# path():url과 view를 연결하는 설정
# include(): url과 urls.py(app별로 정의한) 연결하는 설정

urlpatterns = [
    path('admin/', admin.site.urls), # 앞에 "http://127.0.0.1:8000/" 는 생략됌
    path('polls/', include('polls.urls')),
    # polls: url이 polls로 시작하면 나머지는 polls/urls.py를 참조해라
    path('', views.main, name='main'),
    path('account/', include('account.urls')),
    path('chat/', include('chat.urls')),
    # # http://127.0.0.1:8000/polls/welcome -> welcome()
    # # 파라미터 1: url, 파라미터 2: 함수, 파라미터3 name=설정이름
    # path('polls/welcome', views.welcome_polls, name="polls_welcome")
]
```

처음에는 맨 아래 주석처럼 `polls/welcome`을 여기에 직접 등록했다가, 앱이 늘어나면서 `include()`로 **앱별 urls.py에 위임**하는 구조로 바꿨다. `polls/`로 시작하는 요청은 앞부분을 떼고 나머지를 `polls/urls.py`에서 찾는다.

```python
# polls/urls.py
## polls app의 url conf 파일. (app별로 url 설정을 따로 하기).

## urlconf: urlpatterns = []를 가지고 있어야한다.
## Root UrlConf에 등록(설정) 

from django.urls import path
from . import views

app_name = "polls" #urls.py를 APP별로 만들 때 식별하기 위한 이름

urlpatterns = [

    # http://127.0.0.1:8000/polls/welcome -> welcome()
    # 파라미터 1: url, 파라미터 2: 함수, 파라미터3 name=설정이름
    # 전역 url에서 poll을 지명해줬기 때문에 
    # 여기서는 welcome부터 url를 설정해주면 됌
    path('welcome', views.welcome_polls, name="polls_welcome"),
    path('list', views.vote_list, name="vote_list"),
    path('vote_form/<int:question_id>', views.vote_form, name="vote_form"),
    # ...
]
```

`path(경로, View 함수, name=이름)`의 `name`과 `app_name`은 URL에 **이름**을 붙이는 것이다. 템플릿과 View에서 주소를 직접 쓰지 않고 `"polls:vote_list"`처럼 이름으로 찾으면, 나중에 주소를 바꿔도 `urls.py` 한 곳만 고치면 된다.

직접 실행(테스트 클라이언트로 요청):

```text
/polls/welcome → 200
/ → 200
/polls/nothing → 404
/polls/vote_form/abc → 404
```

어느 패턴과도 맞지 않으면 404다. 마지막 줄은 `<int:question_id>`가 정수만 받기 때문에 `abc`가 아예 매칭되지 않은 것이다. 이 path parameter는 3편에서 자세히 본다.

## View: 요청을 받아 응답을 반환

View 함수는 첫 번째 매개변수로 **요청 정보(`HttpRequest`)** 를 받고 **`HttpResponse`를 반환**해야 한다. 처음 만든 웰컴 페이지는 HTML 문자열을 직접 만들어 돌려줬다.

```python
# 설문 웰컴 페이지를 응답하는 View함수
def welcome_polls_backup(request):
    now = datetime.now() #실행시점 일시
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    # 응답페이지를 생성
    # html로 사용할 문자열을 생성
    res_html = f"""<!doctype html>            
    <html>
        <head>
            <title>Polls - Welcome </title>
        </head>
        <body>
            <h1>Welcome</h1>
            <p>저희 설문 페이지에 방문해주셔서 감사합니다.</p>
            현재시간: {now_str}       
        </body>
    </html>
    """
    print("polls.welcome 실행")
    return HttpResponse(res_html) # 문자열 => HTML로 변환
```

직접 실행:

```text
polls.welcome 실행
HttpResponse 200 text/html; charset=utf-8
<!doctype html>            
    <html>
        <head>
            <title>Polls - Welcome </title>
        </head>
        <body>
            <h1>Welcome</h1>
            <p>저희 설문 페이지에 방문해주셔서 감사합니다.</p>
            현재시간: 2026-10-08 17:43:24       
        </body>
    </html>
```

`HttpResponse`가 "문자열을 HTML로 변환"하는 것은 아니다. 문자열을 **응답 바디**에 넣고 `Content-Type: text/html`을 붙여 줄 뿐이고, HTML로 해석하는 것은 브라우저다. 문제는 화면이 커지면 파이썬 문자열 안에서 HTML을 관리할 수 없다는 점이다. 그래서 화면은 템플릿으로 분리한다.

## Template: 화면 분리

```python
# template 사용
def welcome_polls(request):
    now = datetime.now() #실행시점 일시
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    # 응답 -> poll/welcome.html 템플릿 호출 => html string
    # template을 호출하는 함수 = render()
    res_html = render(
        request, #request
        "polls/welcome.html", # 템플릿 파일 경로(app/templates 빼고 나머지 경로를 지정해주면 됌)
        {"now":now_str}# context - value를 dictionary 설정 => View가 Template에게 전달하는 값
    )

    print(res_html) # type = HttpResponse
    return res_html
```

```text
<HttpResponse status_code=200, "text/html; charset=utf-8">
```

`render(request, 템플릿 경로, context)`는 템플릿에 context 딕셔너리를 채워 HTML을 만들고 **`HttpResponse`로 감싸서** 돌려준다. 템플릿에서는 `{{ now }}`처럼 context의 키로 값을 꺼낸다. 처음 버전의 템플릿이다.

```html
<!-- 
 polls/templates/polls/welcome.html 
-->
<!doctype html>
<html>
    <head>
        <title>Polls - Welcome</title>
    </head>
    <body>
        <h1>Welcome Template</h1>
        <p>저희 설문 페이지에 방문해 주셔서 감사합니다.</p>
        {# context value 출력 - {{context value key}} #}
        현재 시간: {{now}}
    </body>
</html>
```

| 문법 | 용도 |
|---|---|
| `{{ 변수 }}` | 값 출력 |
| `{% 태그 %}` | 로직(`for`, `if`, `url`, `extends` ...) |
| `{# 주석 #}` | 템플릿 주석(응답 HTML에 남지 않음) |
| `{{ 변수\|필터 }}` | 값 변환(`date:'Y-m-d'`, `default:"없음"`, `length` ...) |

템플릿 파일은 `앱/templates/앱이름/파일.html`에 둔다. `templates` 아래에 앱 이름 폴더를 한 번 더 두는 이유는, Django가 모든 앱의 `templates` 폴더를 **한 공간처럼 합쳐서** 찾기 때문이다. 두 앱에 똑같이 `welcome.html`이 있으면 먼저 찾은 것이 쓰이므로, `polls/welcome.html`처럼 앱 이름으로 구분한다.

> **보충**: `<!-- -->` HTML 주석은 브라우저로 그대로 전송되어 페이지 소스 보기에서 보이지만, `{# #}`는 서버에서 렌더링할 때 사라진다. 내부 메모는 템플릿 주석으로 쓴다.

### 템플릿 상속

필기에 정리한 이유다.

```text
# web pages를 제작할때, html에서 공통적으로 안바뀌는 부분과 각각 바뀌는 부분
- 상속받아서 pages를 제작하면 공통적으로 안바뀌는 부분이 재사용 가능함. => extends, block-tage 사용
```

공통 레이아웃(`main_layout.html`)에 Bootstrap CSS·메뉴바를 두고, 바뀌는 자리만 `block`으로 비워 둔다.

```html
<title>
    {% block title %}my poll{% endblock title %}
</title>
...
<div class="container mt-3">
    {% block contents %}{% endblock contents%} 
    {% block javascript %}{% endblock javascript %}
</div>
```

각 페이지는 `extends`로 레이아웃을 물려받고 `block`만 채운다.

```html
{% extends 'main_layout.html' %}
{% block title %}Welcome{% endblock title %}

{% block contents %}
...
{% endblock contents %}
```

여러 앱이 같이 쓰는 레이아웃은 프로젝트 루트의 `templates` 폴더에 두고 `settings.py`의 `TEMPLATES['DIRS']`에 등록한다.

```python
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "templates" / "layout"],
        'APP_DIRS': True, #app/templates app dir 아래에 있는 template는 자동으로 인식함
        # ...
    },
]
```

강사님 프로젝트는 `DIRS`를 `BASE_DIR / "templates"`로 두고 `{% extends 'layout/main_layout.html' %}`로 불렀다. 내 프로젝트는 `layout` 폴더까지 `DIRS`에 넣어서 `{% extends 'main_layout.html' %}`로 부른다. 둘 다 동작한다. 다만 내 방식은 `templates` 바로 아래 다른 폴더를 만들면 `DIRS`에 또 추가해야 하고, 루트의 `main.html`(`/` 메인 페이지)도 `layout` 폴더 안에 들어가 있어 "레이아웃 폴더"라는 이름과 맞지 않게 됐다.

직접 실행(웰컴 페이지 요청 시 사용된 템플릿과 context):

```text
welcome: 200 ['polls/welcome.html', 'main_layout.html'] | now= 2026-10-08 17:43:31 | HTML에 now 포함? False
```

![설문 앱 웰컴 페이지](/images/django/fig-django-welcome.png)

실제 웰컴 화면이다. 타이핑 효과, 시계, 슬라이드는 모두 `{% block javascript %}` 안의 스크립트가 그린다.


`welcome.html`이 `main_layout.html`을 상속해 렌더링됐다. 그런데 마지막 값이 `False`다. 웰컴 페이지를 꾸미면서 시계를 JavaScript(`new Date()`)로 바꿨기 때문에, View가 넘기는 `now`를 템플릿이 더 이상 쓰지 않는다. 화면은 문제없지만 View의 `now` 계산은 버려지는 코드다. View와 Template 중 한쪽을 고치면 다른 쪽에서 쓰는 context 키도 같이 확인해야 한다.

> **보충**: 서버 시간(`{{ now }}`)은 **서버** 시계, `new Date()`는 **사용자 PC** 시계다. 사용자가 다른 시간대에 있으면 둘이 다르게 나온다.

## 관리자 앱

`django.contrib.admin`은 Model만 등록하면 데이터를 조회·추가·수정·삭제하는 화면을 만들어 준다. 필기의 순서다.

```text
7. (Project) 관리자 계정
    - `python manage.py migrate` (관리자를 저장할 수 있는 DB 생성)
    - `python manage.py createsuperuser` (관리자 계정 생성)
        - username: 계정명 (admin)
    - 관리자 app에 접속
        - 서버실행 후 (`python manage.py runserver`)
        -`http://127.0.0.1:8000/admin`
```

```python
# polls/admin.py
# 관리자 앱에서 관리할 모델들을 등록

admin.site.register(models.Question)
admin.site.register(models.Choice)
```

```text
# django admin web

-> 장고는 기본적으로 어드민 앱을 지원함
-> 사용자 DB를 만듦 => 사용자추가를 통해 user를 추가할 수 있음
-> 직접 등록할때는 django admin를 통해서 줄수있음 (사용자관리를 위한 conponent를 줌) => 요약: 상속을 받아서 우리의 사용자관리를 만듦
```

별도 백오피스(내부 관리 화면)를 만들지 않아도 데이터를 넣고 확인할 수 있어서, 개발 중 테스트 데이터 관리에 특히 편하다. Model(`Question`, `Choice`)과 `migrate`는 다음 글에서 다룬다.

## 정리

| 개념 | 내용 |
|---|---|
| HTTP | 요청 → 응답 후 연결 종료. 무상태 |
| GET / POST | 조회(쿼리 스트링) / 전송(바디) |
| WSGI | 웹 서버와 파이썬 웹 앱 사이 표준 인터페이스 |
| 프로젝트 / 앱 | 사이트 전체(`config`) / 기능 단위 부품(`polls`, `account`) |
| URLconf | `path(경로, view, name)`, `include()`로 앱에 위임 |
| View | `request`를 받아 `HttpResponse` 반환 |
| `render()` | 템플릿 + context → `HttpResponse` |
| Template | `{{ }}` 값, `{% %}` 로직, `extends`/`block` 상속 |
| admin | `admin.site.register(Model)`로 관리 화면 자동 생성 |

- Django의 View는 화면이 아니라 처리 로직이고, 화면은 Template이다.
- `DEBUG`는 자동 재시작이 아니라 에러 페이지·호스트 검사를 정한다. 배포 시 `False`.

다음 글에서는 설문 데이터(질문·보기)를 Model로 정의하고 ORM으로 조회·집계한다.
