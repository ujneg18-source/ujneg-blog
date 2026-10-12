---
title: "View와 Template: 설문 앱 화면 만들기"
description: "설문 목록·설문 폼·투표 처리·결과 화면을 함수형 View와 Template으로 구현하며 path parameter와 쿼리 스트링, request.GET·POST, CSRF 토큰, render와 redirect의 차이, reverse와 url 태그, 쿠키로 중복 투표 막기까지 설문 앱 코드를 직접 요청한 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Django'
series: 'Django'
seriesOrder: 3
originalNotebook: "13_django/mypoll (polls/views.py, polls/templates)"
tags: ["Django"]
date: 2026-07-28T10:00:00+09:00
thumbnail: '../../../assets/images/notes/django/django-polls-views.webp'
---

> SKN31 Django 수업에서 만든 설문 앱 `polls`의 코드와 필기를 바탕으로 정리했습니다.
> 출력은 프로젝트 사본을 Django 테스트 클라이언트로 요청해 **직접 실행**한 결과입니다(Django 5.2.18, 수업은 6.0.7). 화면은 응답 HTML에서 태그를 걷어 낸 텍스트로 보여 줍니다.

## 이 글에서 다루는 것

- 설문 앱의 화면 흐름
- 목록: Model 조회 → Template 반복 출력
- 설문 폼: path parameter와 `choice_set`
- 투표: POST 요청, `request.POST`, CSRF
- `render`와 `redirect`의 차이, `reverse`
- 쿠키로 중복 투표 막기
- 결과: `get_object_or_404`

[지난 글](/notes/django/django-model-orm)에서 `Question`·`Choice` 모델과 ORM을 만들었다. 이제 View와 Template으로 화면을 붙인다.

## 화면 흐름

| URL | View | 방식 | 응답 |
|---|---|---|---|
| `/polls/list` | `vote_list` | GET | 목록 화면 |
| `/polls/vote_form/<질문id>` | `vote_form` | GET | 보기 선택 화면 |
| `/polls/vote` | `vote` | POST | 성공 시 결과 화면으로 **redirect** |
| `/polls/vote_result/<질문id>` | `vote_result` | GET | 결과 화면 |

View 함수마다 위에 "요청 URL / View 함수 / Template"을 먼저 주석으로 적고 구현했다. 이 표가 그 주석들을 모은 것이다.

## 목록: 조회해서 넘기고, 반복해서 그린다

```python
##################################
# 1. 설문 목록 조회 함수
# => 전체 question들을 조회해서 목록으로 출력
# => 요청 url: polls/list
# => veiw 함수: vote_list
# => template: polls/vote_list.html
#################################

def vote_list_backup(request):
    """
    veiw 함수
    1. request:HttpRequest 객체(HTTP 요청정보)를 받는 변수 (필수)
    2. path 파라미터를 받기위한 변수들 (옵션)

    """
        # 1. Model에서 데이터 조회
    questions_list = Question.objects.all().order_by("pub_date")
    
    # 2. Template에 데이터 넘겨서 응답
    return render(
        request,
        "polls/vote_list.html",
        {"questions_list": questions_list}
    )
```

View의 일은 **조회 → context로 전달**이 전부다. 템플릿은 `{% for %}`로 돌며 링크를 만든다. 처음 만든 템플릿이다.

```html
<!-- templates/polls/vote_list.html -->
{# Django Template 한줄 주석 #}
{% comment %}
블록 주석
주석
주석 
{% endcomment %}
<!-- HTML 주석 --> 
...
    <h1>설문 질문 목록</h1>
    <ul>
        {# question_list: QuerySet[Question] - Iterable #}
        {% for question in question_list %}
            <li>
                <a href="/polls/vote_form/{{question.pk}}">
                    {{question.pk}}. {{question.question_text}}
                </a>
            </li>
        {% endfor %}
    </ul>
```

> **보충**: 위 View는 `questions_list`(s 붙음)로 넘기고 템플릿은 `question_list`를 돈다. Django 템플릿은 **없는 변수를 에러 없이 빈 값으로 처리**하므로, 이런 이름 불일치는 화면에 "아무것도 안 나옴"으로만 나타난다. 지금 쓰는 페이징 버전(`vote_list`)은 `question_list`로 맞춰져 있어서 문제가 없고, 이 `_backup` 함수는 URL에 연결되어 있지 않다.

최종 템플릿은 레이아웃을 상속하고 링크를 `url` 태그로 만든다.

```html
{% for question in question_list %}
    <a href="{% url 'polls:vote_form' question.pk %}" 
       class="list-group-item list-group-item-action text-dark">
        {{ question.pk }}. {{ question.question_text }}
        <small class="text-muted ms-2">{{ question.pub_date }}</small>
    </a>
{% empty %}
    <div class="list-group-item">등록된 설문이 없습니다.</div>
{% endfor %}
```

| | 하드코딩 | `url` 태그 |
|---|---|---|
| 코드 | `/polls/vote_form/{{question.pk}}` | `{% url 'polls:vote_form' question.pk %}` |
| URL이 바뀌면 | 템플릿을 전부 찾아 고침 | `urls.py`만 고침 |

`'polls:vote_form'`은 `app_name:name`이고, 뒤의 값은 path parameter 자리에 들어간다. `{% empty %}`는 목록이 비었을 때 나온다.

## 설문 폼: path parameter

어떤 질문의 폼인지 서버에 알려 줘야 한다. 필기에 두 가지 방법을 비교해 두었다.

```text
client => 서버

요청 => 값

1. 요청 파라미터 (get 방식=name=value)
2. path 파라미터 //api 만들때, rest


                    <a href="/polls/vote_form/{{question.pk}}"">{{ question.pk }}. {{ question.question_text }}</a>
                                        경로상에서 보내는 방법
                                        get 방식은
                    <a href="/polls/vote_form?{{question.pk}}"">{{ question.pk }}. {{ question.question_text }}</a>
```

| | 쿼리 스트링 | path parameter |
|---|---|---|
| 모양 | `/polls/vote_form?question_id=3` | `/polls/vote_form/3` |
| View에서 받기 | `request.GET.get("question_id")` (문자열) | 함수 매개변수 `question_id` (변환된 값) |
| 주로 쓰는 곳 | 검색어, 페이지 번호 같은 선택 값 | 자원 식별(몇 번 글) |

필기의 GET 예시 `?{{question.pk}}`는 이름 없이 값만 붙어 있어서 서버가 읽을 수 없다. 쿼리 스트링은 `?question_id={{question.pk}}`처럼 `name=value`여야 한다. (두 예시 모두 `""`로 따옴표가 하나 더 붙어 있는 것도 오타다.)

path parameter는 `urls.py`에서 `<타입:이름>`으로 선언한다.

```python
path('vote_form/<int:question_id>', views.vote_form, name="vote_form"),
# path parameter 설정 <type: 변수명>
# type: 어떤 타입으로 읽을지, 변수명: 값을 받을 view의 파라미터를 지정.
# <int:question_id> 지정한 자리의 값을 int로 변환해서 view함수의 question_id의 파라미터로 전달
```

```python
######################################
# 2. 설문폼 페이지를 담당하는 view 함수
# 요청 URL: /polls/vote_form/question_id
# view 함수: vote_form
# template: polls/vote_form.html
# question_id로 질문과 그 질문의 보기를 조회
# question_id를 Path Parameter로 받는다.
# Path Parameter: url 경로를 이용해서 클라이언트가 서버에 값을 전달하는 방식
# view에 2번째 파라미터부터 path parameter를 받을 변수들
# url conf에서 path parameter와 변수를 연결 
######################################
def vote_form(request, question_id):
    # 질문 조회 - 없으면 404
    try: 
        question = Question.objects.get(pk=question_id)
        choice_list = question.choice_set.all() # model class
        return render(request, "polls/vote_form.html", {"question": question,  "choice_list": choice_list})
    except:
        return render(request, "polls/error.html",{"error_messages":f"{question_id}는 없는 질문입니다."})
```

직접 실행:

```text
== vote_form 200 설문폼🦕 질문: 1. 좋아하는 색은 무엇입니까? 파랑색 검정색 보라색 빨강색 투표 선택해제 목록으로
== vote_form 999 200 설문 홈 설문 목록 요청하신 작업을 처리하지 못했습니다. 에러메세지: 999는 없는 질문입니다.
```

없는 질문이 에러 페이지로 잘 안내된다. 두 가지는 고칠 만하다.

- **주석은 "없으면 404"인데 상태 코드는 200이다.** 사람 눈에는 에러 화면이지만 브라우저·검색엔진·모니터링 도구는 정상 페이지로 받는다. `render(..., status=404)`를 주거나 결과 화면처럼 `get_object_or_404`를 쓴다.
- **`except:`가 모든 예외를 삼킨다.** 템플릿 경로 오타 같은 다른 에러까지 "없는 질문입니다"로 바뀐다. `except Question.DoesNotExist:`로 좁힌다.

에러 템플릿은 `error_messages`(s 붙음)를 출력한다.

```html
<p>
    <b>요청하신 작업을 처리하지 못했습니다.</b><br>
    에러메세지: {{error_messages}}
</p>
```

`vote_form`은 같은 키로 넘겨서 메시지가 나오지만, 다른 View(4편의 설문 등록)는 `error_message`로 넘긴다. 그쪽에서 에러가 나면 메시지 자리가 빈칸이 된다. 위의 `questions_list`와 같은 종류의 실수다.

## 투표: POST와 CSRF

설문 폼 템플릿은 보기를 라디오 버튼으로 그리고, 질문 번호는 숨은 입력으로 함께 보낸다.

```html
<form action="{% url 'polls:vote' %}" method="post">
    {% csrf_token %}
    <input type="hidden" name="question_id" value="{{ question.pk }}">
    
    <div class="list-group mb-3">
        {% for choice in choice_list %}
            <label class="list-group-item list-group-item-action">
                <input type="radio" name="choice" value="{{ choice.pk }}" class="me-2">
                {{ choice.choice_text }}
            </label>
        {% endfor %}
    </div>

    <button type="submit" class="btn btn-dark">투표</button>
    <button type="reset" class="btn btn-outline-secondary">선택해제</button>
</form>
```

- 같은 `name="choice"`인 라디오 중 **선택한 것 하나의 `value`(보기 pk)만** 전송된다. 아무것도 안 고르면 `choice` 자체가 전송되지 않는다.
- `{% csrf_token %}`은 첫 버전 템플릿에 "post 방식요청일 때 필수. CSRF공격을 막기 위한 보안 관련 토큰 생성."이라고 적어 둔 그것이다.

CSRF(사이트 간 요청 위조)는 다른 사이트가 사용자의 로그인 상태를 이용해 우리 서버로 몰래 POST를 보내는 공격이다. Django는 POST 요청마다 폼에 숨겨 둔 토큰을 검사해서, 우리 페이지에서 만든 폼인지 확인한다. 토큰 없이 보내 봤다.

직접 실행(CSRF 검사를 켠 클라이언트로 토큰 없이 POST):

```text
== csrf 토큰 없이 POST 403
```

View는 받은 값을 `request.POST`에서 꺼낸다.

```python
######################################
# 3. vote_form에 투표결과를 처리하는 함수
# vote의 값을 1증가 시킴
# 요청 url: /polls/vote
# veiw함수 vote
# 응답 : 정상 polls/vote_result.html    => vote_result View로 redirect 방식으로 이동
#        오류 polls/vote_form.html (보기를 선택하지 않은 경우-제자리)
#
# GET: request.GET: Dictionary로 요청파라미터를 반환
# POST: request.POST: Dictionary로 요청파라미터를 반환
######################################

def vote(request):
    # ... (쿠키 관련 주석은 아래에서)
    choice_id = request.POST.get('choice')
    question_id = request.POST.get('question_id')

    question = Question.objects.get(pk=question_id)
    choice_list = question.choice_set.all()

    voted_question_ids = request.COOKIES.get("voted_question_ids") # value:"1,6,7,10"
    print(voted_question_ids)
    if voted_question_ids:
        if question_id in voted_question_ids.split(","): # 이미 투표한 질문
            # vote_form.html로 이동
            question = Question.objects.get(pk=question_id)
            return render(request, "polls/vote_form.html", {"question":question, "choice_list":choice_list, "error_message":"이미 투표한 질문입니다."})


    if choice_id != None: # 선택된 보기가 넘어온 경우
        choice = Choice.objects.get(pk=choice_id)
        choice.vote +=1
        choice.save() # update 쿼리 실행

        # ... (redirect + 쿠키 저장, 아래에서)

    else:
        return render(request, "polls/vote_form.html", {
            "question": question,
            "choice_list": choice_list,
            "error_message": "보기를 선택해주세요.",
            "error_message2": "적당히 아무거나 골라라"
        })
```

직접 실행(보기를 고르지 않고 제출):

```text
== vote 선택없음 200 설문폼🦕 질문: 1. 좋아하는 색은 무엇입니까? 보기를 선택해주세요. 파랑색 검정색 보라색 빨강색 투표 선택해제 목록으로
```

![보기를 선택하지 않고 투표했을 때의 설문 폼](/images/django/fig-django-vote-error.png)


보기를 안 고르면 같은 폼을 에러 메시지와 함께 다시 보여 준다(`render`). 넘긴 `error_message2`는 템플릿에서 쓰지 않아서 화면에 나오지 않는다.

`request.POST.get(이름)`은 값이 없으면 `None`, 있으면 **문자열**이다. 같은 이름으로 여러 값이 오면 `getlist(이름)`으로 리스트를 받는다(4편).

## render와 redirect

투표에 성공하면 결과 화면을 바로 `render`하지 않고 결과 URL로 **redirect**한다. 코드에 두 방식을 남겨 두었다.

```python
        # return render (request, "polls/vote_result.html", {"question": question,  "choice_list": choice_list})
        # Redirect 방식으로 vote_result view로 이동, Web browser에게 결과를 보여주는 view로 이동 
        # 새로 고침을 하더라도 투표가 다시되는 것을 막는다.

        # 방법01: url = "/polls/vote_result/"+str(question_id) #redirect할 URL
        # return redirect(url) # 응답상태코드가 302인 HttpResponse가 반환된다.

        # 방법02: urls.py 의 설정된 url을 조회 reverse(url mapping 설정이름)
        url = 'polls:vote_result' 
        #return redirect(reverse(url, args=[question_id])) # path parameter:arg에 순서대로 입력
        response = redirect(reverse(url, args=[question_id]))
```

파일 아래쪽의 필기가 이유를 정리한다.

```text
# form submit => DB insert, update, delete를 하는 경우에는 새로고침했을때 다시 submit되게하면 안됌. (무한바뀜)
# solution => form submit작업 / DB insert, update, delete작업을 나눠야함
# redirect()작업
```

`render`로 결과를 바로 보여 주면 브라우저 주소는 여전히 `POST /polls/vote`다. 이 상태에서 새로고침하면 브라우저가 **같은 POST를 다시 보내고**, 표가 또 올라간다. `redirect`는 302 응답으로 "이 주소로 다시 요청하라"고 시키므로 브라우저 마지막 요청이 `GET /polls/vote_result/1`이 되고, 새로고침해도 결과를 다시 조회할 뿐이다. 이 패턴을 PRG(Post/Redirect/Get)라고 한다.

| | `render()` | `redirect()` |
|---|---|---|
| 응답 | 200 + 완성된 HTML | 302 + `Location` 헤더 |
| 브라우저 요청 횟수 | 1번 | 2번(원래 요청 + 재요청) |
| Template에 값 전달 | 가능 | 불가(새 요청이므로 URL로만) |
| 쓰는 곳 | 조회 화면, 검증 실패 후 폼 다시 보여 주기 | DB를 바꾼 뒤(등록·수정·삭제·투표) |

`reverse('polls:vote_result', args=[question_id])`는 `url` 태그의 파이썬 버전으로, URL 이름에서 실제 경로를 만든다.

직접 실행(검정색에 투표 → redirect 따라가기):

```text
== vote 302 /polls/vote_result/1 | Set-Cookie: Set-Cookie: voted_question_ids=1; Path=/
== result 투표 결과 질문: 1. 좋아하는 색은 무엇입니까? 파랑색 12표 검정색 1표 보라색 0표 빨강색 0표 목록으로
```

![투표 결과 화면](/images/django/fig-django-result.png)


결과 View는 `get_object_or_404`로 없는 질문을 404로 처리한다.

```python
def vote_result(request, question_id):
    question = get_object_or_404(Question, pk=question_id)
    choice_list = question.choice_set.all()  # 추가
    return render(request, "polls/vote_result.html", {
        "question": question,
        "choice_list": choice_list  # 추가
    })
```

`try/except`로 감싼 `vote_form`보다 짧고 상태 코드도 정확하다.

## 쿠키로 중복 투표 막기

한 사람이 같은 질문에 여러 번 투표하지 못하게, 투표한 질문 번호를 **쿠키**에 저장한다. 쿠키는 서버가 응답에 실어 보내면 브라우저가 저장했다가 **같은 사이트에 요청할 때마다 다시 보내 주는** 작은 문자열이다(6편에서 자세히).

```python
    # choice를 조회
    # - 사용자가 이미 투표한 적이 있으면 투표를 못하게 하기-쿠키이용
    # - 예제용 실제는 DB에 저장 (사용자가 어떤 문제들을 투표했는지 DB에 저장 후 검색)
    # 쿠키에 투표한 질문들 question_id들을 저장한다.
    # 현재 투표하려는 질문의 question_id들을 저장한다.
    # 현재 투표하려는 질문의 id가 cookie에 있으면 투표하지 못하게 한다.
    # 쿠키에 현재 질문 ID가 있는지 확인.
```

읽기는 `request.COOKIES`, 쓰기는 **응답 객체**의 `set_cookie()`다.

```python
        response = redirect(reverse(url, args=[question_id]))

        # 쿠키에 투표한 질문 ID 저장
        if voted_question_ids:
            response.set_cookie("voted_question_ids", voted_question_ids + "," + question_id)
        else:
            response.set_cookie("voted_question_ids", question_id)

        return response
```

직접 실행(같은 클라이언트로 한 번 더 투표):

```text
== 재투표 200 설문폼🦕 질문: 1. 좋아하는 색은 무엇입니까? 이미 투표한 질문입니다. 파랑색 검정색 보라색 빨강색 투표 선택해제 목록으로
검정색 vote = 1
```

![같은 설문에 다시 투표했을 때](/images/django/fig-django-vote-again.png)


두 번째 투표는 막히고 표 수는 1 그대로다. 동작은 맞는데, 강사님 코드와 비교하면 차이가 하나 있다.

```python
# 강사님 파일
res.set_cookie("voted_question_ids", voted_question_ids,
                max_age=60*60*24*365   # 쿠키 만료 기간 "초" 설정.
              )
```

내 코드는 `max_age`를 주지 않았다. 위 실행 결과의 `Set-Cookie: voted_question_ids=1; Path=/`에 만료 시간이 없는데, 이런 쿠키는 **브라우저를 닫으면 사라지는 세션 쿠키**다. 브라우저를 껐다 켜면 다시 투표할 수 있다. 내 `vote()` 함수 맨 아래에 `max_age`를 넣은 줄이 남아 있긴 하다.

```python
    else:
        return render(request, "polls/vote_form.html", {...})


# HTTpResponse에 cookie setting #
    response.set_cookie("voted_question_ids", voted_question_ids, max_age=60*60*24*7)
```

들여쓰기상 `vote()` 함수 안이지만, 위의 `if`와 `else`가 모두 `return`하므로 **절대 실행되지 않는 줄**이다. 실제로 쿠키를 만드는 위쪽 `set_cookie` 두 곳에 `max_age=60*60*24*7`을 넣어야 의도대로 일주일간 유지된다.

> **보충**: 주석에 적힌 대로 쿠키 방식은 예제용이다. 쿠키는 사용자가 지우거나 다른 브라우저를 쓰면 그만이다. 실제 서비스는 로그인한 사용자 ID와 질문 ID를 DB에 저장하고 `unique` 제약으로 막는다.

## 남은 허점

정상 흐름은 모두 동작한다. 다만 요청을 직접 조작하면 뚫리는 곳이 있어서 직접 보내 봤다.

```text
== q1에 q2의 보기로 투표 302 ... | 고양이 vote: 1
== POST {} → DoesNotExist: Question matching query does not exist.
== POST {'question_id': 999} → DoesNotExist: Question matching query does not exist.
== GET /polls/vote → DoesNotExist: Question matching query does not exist.
```

- **다른 질문의 보기에도 투표된다.** `Choice.objects.get(pk=choice_id)`가 그 보기가 이 질문의 것인지 확인하지 않는다. 화면에서는 일어나지 않지만 개발자 도구로 `value`를 바꾸면 가능하다. `question.choice_set.get(pk=choice_id)`로 조회하면 다른 질문의 보기는 `DoesNotExist`가 된다.
- **`question_id`가 없거나 틀리면 500 에러다.** 주소창에 `/polls/vote`를 치는 GET 요청도 마찬가지다. `get_object_or_404(Question, pk=question_id)`를 쓰고, POST만 받으려면 `@require_POST` 데코레이터를 붙인다.

> **보충**: `choice.vote += 1` → `save()`는 "읽고, 파이썬에서 더하고, 쓰기"라서 두 사람이 동시에 투표하면 한 표가 사라질 수 있다. `Choice.objects.filter(pk=choice_id).update(vote=F("vote") + 1)`처럼 `F()` 식을 쓰면 DB가 `vote = vote + 1`로 한 번에 처리한다.

## 정리

| 하고 싶은 것 | 코드 |
|---|---|
| URL에서 값 받기 | `path('vote_form/<int:question_id>', ...)` + `def view(request, question_id)` |
| 쿼리 스트링 / 폼 값 읽기 | `request.GET.get(이름)` / `request.POST.get(이름)` (문자열 또는 None) |
| 화면 응답 | `render(request, 템플릿, context)` |
| DB 변경 후 이동 | `redirect(reverse('앱:이름', args=[...]))` |
| 템플릿에서 링크 | `{% url '앱:이름' 값 %}` |
| POST 폼 | `{% csrf_token %}` 필수 |
| 없으면 404 | `get_object_or_404(Model, pk=...)` |
| 쿠키 | 읽기 `request.COOKIES`, 쓰기 `response.set_cookie(키, 값, max_age=초)` |

- View ↔ Template 사이의 context 키 이름이 틀려도 에러가 나지 않는다. 화면이 비면 키 이름부터 본다.
- DB를 바꾸는 POST 뒤에는 redirect.

다음 글에서는 설문을 **등록**하는 화면을 만들며, 입력값 검증을 Django Form에 맡긴다.
