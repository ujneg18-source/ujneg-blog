---
title: "SSE 스트리밍 채팅: 정적 파일과 StreamingHttpResponse"
description: "static 파일을 앱별로 두고 {% static %}으로 불러오는 방법과 collectstatic·STATIC_ROOT의 역할을 짚은 뒤, StreamingHttpResponse와 브라우저 EventSource로 LLM 답변을 토큰 단위로 흘려보내는 채팅 앱을 만듭니다. 세션에 대화 기록을 저장하고 trim_messages로 자르는 흐름을 가짜 모델로 직접 실행한 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Django'
series: 'Django'
seriesOrder: 7
originalNotebook: "13_django (Django2.pdf, chat_project_streaming/SSE.md, mypoll/chat)"
tags: ["Django"]
date: 2026-08-03T10:00:00+09:00
thumbnail: '../../../assets/images/notes/django/django-sse-chat.webp'
---

> SKN31 Django 수업 자료(`Django2.pdf`의 static 부분, `SSE.md`)와 `mypoll`의 채팅 앱(`chat`)을 바탕으로 정리했습니다.
> 실행 환경에서 OpenAI API를 쓸 수 없어서, 채팅 View의 LLM 체인만 **LangChain의 가짜 채팅 모델(`GenericFakeChatModel`)로 바꿔 끼워** 직접 실행했습니다. 응답 문장은 그 가짜 모델에 넣은 문장이고, 스트리밍 형식·세션 저장은 실제 View 코드가 만든 결과입니다(Django 5.2.18, 수업은 6.0.7).

## 이 글에서 다루는 것

- static 파일: 앱별 저장, `{% static %}`, `collectstatic`
- 서버가 먼저 보내야 하는 서비스: 폴링, WebSocket, SSE
- SSE 메시지 형식
- `StreamingHttpResponse`와 제너레이터
- 브라우저 `EventSource`
- 세션에 대화 기록 저장과 `trim_messages`

[지난 글](/notes/django/django-auth)까지 설문 앱과 회원 기능을 만들었다. 마지막으로 이 프로젝트에 [LLM 시리즈](/notes/llm/llm-langgraph-memory)에서 만들던 챗봇을 붙인다. 답변이 다 만들어질 때까지 기다리지 않고 **글자가 생기는 대로 화면에 흘려보내는** 것이 목표다.

## static 파일

HTML이 불러다 쓰는 이미지, CSS, JavaScript 파일을 static(정적) 파일이라 한다. 필기다.

```text
## HTML
- 이미지, 동영상, 음악
- css
- js
- 로 구성됌 (정적파일-static파일)
```

| 종류 | 내용 | 저장 위치 |
|---|---|---|
| static | 개발자가 만든 이미지·CSS·JS | 앱별 `앱/static/`, 공통은 `STATICFILES_DIRS` |
| media | 사용자가 업로드한 파일(`FileField`, `ImageField`) | `MEDIA_ROOT` |

채팅 화면은 스크립트를 `chat/static/js/chat.js`로 분리하고 템플릿에서 `static` 태그로 부른다.

```html
{% load static %}
<script src="{% static 'js/chat.js' %}"></script>
```

```python
# settings.py
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]
STATIC_URL = '/static/'
```

`{% static '경로' %}`는 `STATIC_URL` + 경로를 만든다. 개발 서버는 앱의 `static` 폴더와 `STATICFILES_DIRS`를 뒤져 파일을 찾아 준다.

직접 실행:

```text
$ python manage.py findstatic js/chat.js
Found 'js/chat.js' here:
  mypoll/chat/static/js/chat.js

/chat/ 응답의 스크립트 태그: ['<script src="/static/js/chat.js"']
```

[1편](/notes/django/django-getting-started)의 템플릿과 같은 이유로, static도 **모든 앱의 `static` 폴더를 한 공간처럼 합쳐서** 찾는다. 다른 앱에도 `static/js/chat.js`가 생기면 먼저 찾은 것이 쓰인다. 강사님 프로젝트가 `polls/static/polls/js/script.js`처럼 앱 이름 폴더를 한 번 더 둔 이유다. 채팅 앱도 `chat/static/chat/js/chat.js` + `{% static 'chat/js/chat.js' %}`로 두는 편이 안전하다.

### collectstatic과 STATIC_ROOT

배포 서버에서는 Django가 아니라 웹 서버(NGINX)가 static 파일을 직접 응답한다. 여러 앱에 흩어진 파일을 한 폴더로 모으는 명령이 `collectstatic`이고, 모을 위치가 `STATIC_ROOT`다. 내 설정에는 `STATIC_ROOT`가 없다.

직접 실행:

```text
$ python manage.py collectstatic --noinput
django.core.exceptions.ImproperlyConfigured: You're using the staticfiles app without having set the STATIC_ROOT setting to a filesystem path.
```

개발 중에는 필요 없어서 문제가 드러나지 않다가, 배포 때 설정한다. 이 프로젝트의 배포 메모(`django_setting.md`)에 `STATIC_ROOT = '/var/www/mypoll_chat/static'`이 들어가 있다. 배포 과정은 AWS 시리즈에서 다룬다.

> **보충**: 업로드 파일(media)은 `settings.py`에 `MEDIA_ROOT`(저장 폴더)와 `MEDIA_URL`(요청 경로)을 두고, Model에 `ImageField(upload_to="images/profile")`처럼 선언한다. 업로드 폼은 `<form method="post" enctype="multipart/form-data">`여야 하고, View에서는 `Form(request.POST, request.FILES)`로 받는다. 지금까지 View마다 붙어 있던 `request.FILES`가 이 자리다. 개발 서버는 media를 자동으로 서빙하지 않아서 `urls.py`에 `urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)`를 추가한다. 강사님 프로젝트에는 회원 프로필 사진·첨부 파일 필드로 이 부분이 들어가 있고, 내 프로젝트에는 빠져 있다.

## 서버가 먼저 보내야 할 때

HTTP는 **항상 클라이언트의 요청으로 시작**한다. 그런데 채팅 수신, 실시간 시세, 배송 상태처럼 "값이 바뀌면 바로" 받아야 하는 서비스는 언제 요청해야 할지 알 수 없다. 수업 자료(`SSE.md`)의 정리다.

| 방식 | 동작 | 문제·특징 |
|---|---|---|
| 폴링(Polling) | 클라이언트가 일정 간격으로 계속 요청 | 변화가 없어도 요청(서버 부하), 간격만큼 지연, 접속자 수만큼 요청 폭증 |
| WebSocket | 연결을 열어 두고 **양방향** 실시간 통신 | `ws://` 별도 프로토콜, 텍스트+바이너리 |
| SSE(Server-Sent Events) | HTTP 연결 하나를 유지하며 서버 → 클라이언트 **단방향** 스트리밍 | HTTP 그대로, 브라우저 `EventSource`, 텍스트만 |

LLM 답변 스트리밍은 "질문 한 번 → 답변이 조각조각 도착"이라 단방향이면 충분하다. 그래서 SSE다.

### SSE 메시지 형식

응답 헤더는 `Content-Type: text/event-stream`이고, 메시지 하나는 `data: 내용`으로 시작해 **빈 줄(`\n\n`)로 끝난다.**

```text
data: 안녕하세요\n\n
data: 두 번째 메시지입니다\n\n
```

브라우저는 `\n\n`을 만날 때마다 메시지 하나를 꺼내 `event.data`로 전달한다.

## 서버: StreamingHttpResponse

`HttpResponse`는 응답을 **전부 만든 뒤** 한 번에 보낸다. `StreamingHttpResponse`는 iterable(대개 제너레이터)을 받아 **값이 나올 때마다** 보낸다. 제너레이터를 주석으로 정리해 두었다.

```python
# StreamingHttpResponse를 이용한 서버 전송 이벤트(Server-Sent Events, SSE) 방식으로
# 클라이언트에게 실시간으로 데이터를 전송하는 뷰 함수 

# generator를 이용하여 데이터를 순차적으로 yield하고, StreamingHttpResponse를 통해 클라이언트에게 전송.
# iterable이란 값을 하나씩 제공할 수 있는 객체를 의미합니다.
# 따라서 StreamingHttpResponse는 iterable 객체를 받아서, 그 객체가 값을 제공할 때마다 클라이언트에게 응답을 전송합니다.
# event_stream() 함수는 generator로 정의되어 있으며, 이 함수는 클라이언트에게 전송할 데이터를 순차적으로 yield합니다.
# yield는 함수의 실행을 일시 중단하고, 값을 반환한 후, 다음 호출 시 이전 상태를 유지하며 실행을 재개합니다.
# yield의 뜻은 "생산하다" 또는 "내놓다"라는 의미로, generator 함수에서 사용될 때는 "값을 생성하여 반환하다"라는 의미로 사용됩니다.
```

LLM 체인은 [프롬프트 글](/notes/llm/llm-prompt)에서 쓰던 그대로, 대화 기록 자리(`MessagesPlaceholder`)가 있는 프롬프트에 모델을 잇는다.

```python
# 챗봇 체인 초기화 함수
# view함수에서 챗봇을 부르는 함수, 원래 따로 모듈로 분리하는 것이 좋지만, 여기서는 간단하게 view.py에 포함시킴.
def get_chain():
    """LangChain 체인을 초기화"""

    prompt = ChatPromptTemplate(
        messages=[
            {
                "role": "system", 
                "content": ("당신은 다양한 분야에 대해 전문적인 조언을 할 수 있는 유능한 인공지능 Assistant입니다."
                            "사용자의 질문에 대해 친절한 톤으로 답변해 주세요."
                            ...)
            },
            MessagesPlaceholder(variable_name="history"),
            {"role": "user", "content": "{input}"}
        ]
    )
    chat = ChatOpenAI(model_name="gpt-5.4-mini")
    return prompt | chat
```

스트리밍 View 본체다.

```python
def stream_chat(request):
    message = request.GET.get('message', '')
    if not message:
        # StreamingHttpResponse(iterable/generator, content_type="text/event-stream")
        ## iterable이 값을 제공할 때 마다 응답.
        return StreamingHttpResponse("data: [ERROR] 메세지를 입력하세요.\n\n", content_type='text/event-stream')

    if 'message_history' not in request.session:
        request.session['message_history'] = []
        request.session.modified = True
        request.session.save()

    def event_stream():
        try:
            # Session에서 지금까지의 대화 내역 조회
            message_history = request.session.get('message_history', [])

            chat = get_chain() #llm chain
            ai_message = ""  # LLM 모델이 stream방식으로 출력하는 응답을 모아 저장할 변수
            
            print(f"현재 히스토리: {len(message_history)}개 메시지")
            for chunk in chat.stream({"input": message, "history": message_history}):
                content = chunk.content.replace('\n', '<br>')
                if content:
                    ai_message += content
                    yield f"data: {content}\n\n"
            
            message_history.append(HumanMessage(content=message))
            message_history.append(AIMessage(content=ai_message.replace('<br>', '\n')))

            # 히스토리 메시지 trimming
            # trim_messages() 함수를 이용하여 메시지 히스토리를 최대 토큰 수에 맞게 trimming
            # trim_messages()의 뜻은 "메시지를 잘라내다"라는 의미로, 메시지 히스토리를 최대 토큰 수에 맞게 잘라내는 역할을 합니다.
            # 타입은 list이며, 각 메시지는 HumanMessage 또는 AIMessage 객체로 구성됩니다.
            trimmed_msg = trim_messages(
                message_history,
                max_tokens=20,
                strategy="last",
                token_counter=len,
                start_on="human",
                end_on=("human", "ai"),
                include_system=True
            )
            
            message_history_to_save = []
            for msg in trimmed_msg:
                if isinstance(msg, HumanMessage):
                    message_history_to_save.append({"role": "user", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    message_history_to_save.append({"role": "assistant", "content": msg.content})
            
            request.session['message_history'] = message_history_to_save
            request.session.modified = True
            request.session.save()
            
            print(f"저장된 히스토리: {len(message_history_to_save)}개 메시지")
            yield "data: [DONE]\n\n" # client에게 보내는 답변 완료 flag값. (client가 연결을 close)

        except Exception as e:
            traceback.print_exc() # view단에서 프론트단에 에러를 표시하기 위해 traceback을 출력
            yield f"data: [ERROR] {str(e)}\n\n" # client에게 보내는 ERROR 표시


    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream') # iterableㅌ
    response['Cache-Control'] = 'no-cache'
    # 응답정보의 Head의 Cach-Control을 no-cache 설정. 응답데이터를 웹브라우저가 저장하지 않게 하기.
   
    return response

# 지금 state는 session에 저장되어 있음.
```

흐름을 정리하면 이렇다.

1. 세션에서 지난 대화(`message_history`)를 꺼낸다.
2. `chat.stream()`이 토큰 조각을 내놓을 때마다 `data: 조각\n\n`으로 `yield` → 브라우저로 즉시 전송.
3. 다 받으면 이번 질문과 전체 답변을 기록에 붙이고, `trim_messages`로 잘라 세션에 저장.
4. 마지막에 `data: [DONE]\n\n`으로 끝을 알린다. 에러가 나면 `data: [ERROR] ...`.

조각 안의 줄바꿈을 `<br>`로 바꾸는 이유는 SSE 형식 때문이다. 조각에 `\n`이 섞이면 `data:` 줄 형식이 깨지고, `\n\n`이면 메시지가 중간에 끊긴다. 화면에 넣을 때는 `<br>`로, 기록에 저장할 때는 다시 `\n`으로 되돌린다.

### 직접 실행

체인만 가짜 모델로 바꿔 두 번 대화했다. 첫 답변에는 줄바꿈을 넣었다.

```text
== 빈 메시지 text/event-stream 'data: [ERROR] 메세지를 입력하세요.\n\n'
== message='안녕' 200 text/event-stream no-cache
    'data: 안녕하세요!\n\n'
    'data: <br>\n\n'
    'data: 무엇을\n\n'
    'data:  \n\n'
    'data: 도와드릴까요?\n\n'
    'data: [DONE]\n\n'
   모델이 받은 메시지: [('system', '...'), ('human', '안녕')]
   session message_history: [{'role': 'user', 'content': '안녕'}, {'role': 'assistant', 'content': '안녕하세요!\n무엇을 도와드릴까요?'}]
== message='내가 처음에 뭐라고 했지?' 200 text/event-stream no-cache
    'data: 앞에서\n\n'
    'data:  \n\n'
    'data: 인사를\n\n'
    'data:  \n\n'
    'data: 나눴습니다.\n\n'
    'data: [DONE]\n\n'
   모델이 받은 메시지: [('system', '...'), ('human', '안녕'), ('ai', '안녕하세요!\n무엇을 도와드릴까요?'), ('human', '내가 처음에 뭐라고 했지?')]
   session message_history: [{'role': 'user', 'content': '안녕'}, {'role': 'assistant', 'content': '안녕하세요!\n무엇을 도와드릴까요?'}, {'role': 'user', 'content': '내가 처음에 뭐라고 했지?'}, {'role': 'assistant', 'content': '앞에서 인사를 나눴습니다.'}]
```

- 응답이 조각마다 `data: ...\n\n`으로 따로 도착하고 `[DONE]`으로 끝난다.
- 줄바꿈 조각은 `<br>`로 바뀌어 나갔고, 세션에는 `\n`으로 저장됐다.
- 두 번째 요청에서 모델이 **첫 대화를 history로 받았다.** 같은 브라우저(같은 `sessionid`)라 세션에서 기록을 꺼낸 것이다. 6편의 로그인 세션과 같은 저장소를 대화 기억에 쓴 셈이다.
- 세션에는 LangChain 메시지 객체가 아니라 `{"role", "content"}` **딕셔너리**로 저장한다. 세션은 JSON으로 직렬화되는데 `HumanMessage` 객체는 JSON으로 바꿀 수 없기 때문이다. 다음 요청에서 이 딕셔너리 리스트를 그대로 `history`에 넣어도 LangChain이 메시지로 변환해 준다(위 "모델이 받은 메시지").

`trim_messages`의 `token_counter=len`은 토큰 대신 **메시지 개수**를 센다는 뜻이다. `max_tokens=20`이면 최근 메시지 20개(10턴)만 남긴다. 대화가 길어져도 프롬프트와 세션이 끝없이 커지지 않게 하는 장치다.

> **보충**: 세션은 보통 응답을 보내기 직전에 미들웨어가 저장한다. 스트리밍 응답은 그 시점에 제너레이터가 아직 실행 전이라, 제너레이터 안에서 바꾼 세션은 자동 저장되지 않는다. 코드가 제너레이터 안에서 `request.session.save()`를 직접 호출하는 이유다.

## 클라이언트: EventSource

브라우저는 `EventSource`로 SSE를 받는다. 생성하는 순간 GET 요청을 보내고, 메시지가 올 때마다 `onmessage`가 실행된다.

```javascript
document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.querySelector('#chat-box');
    const chatForm = document.querySelector('#chat-form');
    const messageInput = document.querySelector('#message-input');
    const sendButton = document.querySelector('#send-button');
    
    // 메시지 전송 이벤트 처리
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim(); // 입력 메세지를 읽기.
        if (!message) return;

        appendMessage(message, 'user-message');
        messageInput.value = '';
        toggleForm(true);

        let aiMessageElement = null;
        
        // SSE 요청 -> EventSource(요청 url)
        // encodeURIComponent(str): URL 인코딩 처리.
        // 서버에 요청을 보내고, 서버에서 답변이 올때마다 onmessage 이벤트가 발생.
        // EventSource는 서버에서 보내는 이벤트를 실시간으로 수신할 수 있는 객체. 
        // 모든 data는 encodingURIComponent()로 인코딩되어 전송되므로, 서버에서 수신할 때는 decodeURIComponent()로 디코딩해야 함.
        
        const eventSource = new EventSource(`/chat/stream/?message=${encodeURIComponent(message)}`);

        // EventSource에 Event Hander를 추가.
        // onmessage: 서버에서 답변이 올때마다 호출. 답변은 event.data 
        // onerror: 실행도중 Error가 발생하면 호출
        eventSource.onmessage = (event) => {
            if (event.data === '[DONE]') {
                eventSource.close();
                toggleForm(false);
                return;
            }

            if (!aiMessageElement) {
                aiMessageElement = appendMessage('', 'ai-message');
            }

            if (event.data.startsWith('[ERROR]')) {
                aiMessageElement.innerHTML += `<span style="color: red;">${event.data}</span>`;
                eventSource.close();
                toggleForm(false);
            } else {
                aiMessageElement.innerHTML += event.data;
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        };

        eventSource.onerror = (err) => {
            console.error('EventSource 실패:', err);
            // ... 연결 실패 표시 후 close
            eventSource.close();
            toggleForm(false);
        };
    });

    // 메시지를 채팅 박스에 추가하는 함수
    function appendMessage(content, className) {
        const messageElement = document.createElement('div');
        messageElement.setAttribute("class", `message ${className}`);
        messageElement.innerHTML = content;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }
    // ... toggleForm(): 응답 중 입력창·버튼 비활성화
});
```

[HTML·CSS·JavaScript 시리즈](/notes/web/web-javascript-dom-events)에서 본 것들이 그대로 나온다. form의 `submit` + `preventDefault()`, `createElement` + `appendChild`, 응답 중 버튼 비활성화다.

- `[DONE]`이 오면 **클라이언트가 `close()`** 해야 한다. 서버가 응답을 끝내도 `EventSource`는 연결이 끊기면 자동으로 **재연결**하는 성질이 있어서, 닫지 않으면 같은 질문을 다시 보낸다. 서버가 `[DONE]`이라는 약속된 신호를 보내는 이유다.
- 조각마다 `innerHTML +=`로 이어 붙여 글자가 흘러나오는 효과를 낸다.

짚을 것이 두 가지 있다.

실제 채팅 화면이다(답변은 가짜 모델의 문장).

![SSE 채팅 화면](/images/django/fig-django-chat.png)


**1. 서버에서 decodeURIComponent는 필요 없다.** 주석에는 서버에서 디코딩해야 한다고 적혀 있지만, View는 `request.GET.get('message')`만 쓴다. Django가 쿼리 스트링을 받을 때 URL 디코딩을 자동으로 하기 때문이다. 위 실행에서 `message='안녕'`이 그대로 들어온 것이 그 결과다. `encodeURIComponent`는 브라우저 쪽에서 `&`, `?`, `#`, 한글 같은 문자가 URL을 깨지 않게 하는 용도다.

**2. innerHTML에 그대로 넣는다.** 사용자 메시지(`appendMessage(message, ...)`)와 모델 답변이 모두 `innerHTML`로 들어간다. [JS(2) 글](/notes/web/web-javascript-dom-events)의 XSS 이야기와 같은 상황이다. 사용자가 `<img src=x onerror=...>`를 입력하면 자기 화면에서 실행되고, 모델이 답변에 HTML 태그를 섞어 내보내도(예: 코드 예시를 요청받았을 때) 태그로 해석된다. 줄바꿈 하나 때문에 `innerHTML`을 쓰는 것이라면, 서버는 `\n`을 다른 기호로 바꿔 보내고 클라이언트에서 `textContent`로 넣은 뒤 CSS `white-space: pre-wrap`으로 줄바꿈을 살리는 방법이 있다.

> **보충**: `EventSource`는 GET만 보낼 수 있어서 질문이 URL에 들어간다. URL은 길이 제한이 있고 웹 서버 접근 로그에 그대로 남는다. 긴 질문이나 민감한 내용을 다룬다면 `fetch()`로 POST를 보내고 `response.body.getReader()`로 스트림을 직접 읽는 방식을 쓴다. 이 경우 Django 쪽 `StreamingHttpResponse`는 그대로다.

## 배포할 때 주의

개발 서버(`runserver`)에서는 잘 되던 스트리밍이 배포 후 "한꺼번에" 도착하는 일이 흔하다.

| 원인 | 대응 |
|---|---|
| NGINX가 응답을 모았다가 보냄(버퍼링) | 응답 헤더 `X-Accel-Buffering: no` 또는 NGINX `proxy_buffering off` |
| Gunicorn 동기 워커 하나가 스트림 하나를 끝까지 붙잡음 | 동시 접속만큼 워커가 필요. 많으면 ASGI(Uvicorn) + 비동기 View |
| 프록시 타임아웃 | 긴 답변이면 `proxy_read_timeout` 연장 |

이 프로젝트를 EC2에 NGINX + Gunicorn으로 올리는 과정은 AWS 시리즈에서 다룬다.

## 정리

| 구분 | 서버(Django) | 클라이언트(JS) |
|---|---|---|
| 연결 | `StreamingHttpResponse(제너레이터, content_type='text/event-stream')` | `new EventSource(url)` |
| 메시지 | `yield f"data: {조각}\n\n"` | `onmessage` → `event.data` |
| 끝 | `yield "data: [DONE]\n\n"` | `[DONE]`이면 `close()` |
| 에러 | `yield "data: [ERROR] ...\n\n"` | `onerror`, `[ERROR]` 처리 |
| 대화 기억 | `request.session`에 딕셔너리 리스트로 저장 + `trim_messages` | 같은 브라우저면 같은 세션 |

| static 설정 | 역할 |
|---|---|
| `앱/static/앱이름/...` | 앱 전용 파일(이름 충돌 방지) |
| `STATICFILES_DIRS` | 프로젝트 공통 파일 |
| `STATIC_URL` | `{% static %}`이 만드는 URL 앞부분 |
| `STATIC_ROOT` + `collectstatic` | 배포 시 한 곳에 모으기 |

- SSE는 HTTP 위의 단방향 스트림이라 Django 기본 기능만으로 만들 수 있다.
- 스트리밍 View에서 바꾼 세션은 직접 `save()`한다.
- 모델 출력도 사용자 입력처럼 다룬다(`innerHTML` 주의).

이것으로 Django 시리즈를 마친다. 설문·회원·채팅 앱이 들어간 이 `mypoll` 프로젝트를 AWS에 배포하는 과정이 다음 시리즈의 마지막 편이다.
