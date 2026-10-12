---
title: "Form과 FormSet: 입력 검증 자동화하기"
description: "설문 등록 화면을 request.POST를 직접 검증하는 방식으로 먼저 만들고, Django Form·clean 메서드·FormSet으로 바꾸며 무엇이 자동화되는지 비교합니다. transaction.atomic, ModelForm, management_form과 JavaScript로 입력칸을 늘릴 때의 함정까지 실제 요청 결과로 정리합니다."
category: 'Tech'
subcategory: 'Django'
series: 'Django'
seriesOrder: 4
originalNotebook: "13_django/mypoll (polls/forms.py, polls/views.py, readme.md)"
tags: ["Django"]
date: 2026-07-29T10:00:00+09:00
thumbnail: '../../../assets/images/notes/django/django-form-formset.webp'
---

> SKN31 Django 수업의 설문 등록 기능(`vote_create_old`, `vote_create`)과 `forms.py`, 필기(`readme.md`)를 바탕으로 정리했습니다.
> 출력은 프로젝트 사본에 테스트 클라이언트로 폼 값을 보내 **직접 실행**한 결과입니다(Django 5.2.18, 수업은 6.0.7). JavaScript 동작은 응답 HTML을 jsdom에 올려 확인했습니다.

## 이 글에서 다루는 것

- 요청 파라미터를 직접 검증하는 방식과 한계
- `transaction.atomic`으로 질문·보기를 한 번에 저장
- Django Form: 입력 폼 생성 + 검증 + 정리된 값
- `clean_필드명` 사용자 정의 검증
- FormSet으로 같은 입력 여러 개 다루기
- ModelForm
- FormSet과 JavaScript 입력칸 추가의 함정

[지난 글](/notes/django/django-polls-views)의 투표는 "보기 하나를 골랐는가"만 확인하면 됐다. 설문 **등록**은 질문 하나와 보기 여러 개를 받아야 하고 확인할 것도 많다.

## 1단계: request.POST를 직접 검증

처음 버전은 템플릿에 `<input>`을 직접 쓰고, View에서 값을 꺼내 하나씩 검사했다.

```html
<form action="{% url 'polls:vote_create' %}" method="post">
    {% csrf_token %} {#다른 사람이 똑같은 pages를 만들어서 공격하는 것을 대비해줌, 고유값을 생성#}
    <label for="question_text">질문:</label>
    <input type="text" id="question_text" name="question_text" size="50" value="{{question_text}}">
    
    <h2>보기</h2>
    <div id="choice-layer">
        {% if not choice_list %}
            <div>
                <input type="text" name="choice_text">
            </div>
            <div>
                <input type="text" name="choice_text">
            </div>
        {% else %}
            <!-- vote_create view에서 요청파라미터 검증 실패 후 호출된 경우 기존 입력을 출력 -->
            {% for choice in choice_list %}      
                <div>
                    <input type="text" name="choice_text" value="{{choice}}">
                </div>
            {% endfor %}
        {% endif %}
    </div>
    ...
</form>
```

보기 입력칸은 모두 `name="choice_text"`로 같다. 같은 이름이 여러 개면 서버에 `choice_text=봄&choice_text=여름`처럼 전송되고, View는 `getlist()`로 리스트를 받는다.

```python
#######################################
# 5. 설문 질문 등록
# 요청 URL: /polls/vote_create
# Veiw 함수: vote_create
# (1)method => 
# 요청 방식이 GET면 등록 폼을 응답, 
# 요청 방식이 POST면 등록 처리 
# (2)응답
#  응답: GET면 polls/vote_create.html (template)
#        POST면 redirect => vote_list View를 요청 (질문 목록으로 이동)
#
#######################################
# HTTP 요청방식을 조회: request.method(GET, POST, ...)
# 
#######################################

def vote_create_old(request):
    # GET: 등록 폼 출력
    http_method = request.method
    print(">>>>>>>Vote:", http_method)
    if http_method == 'GET':
        return render(request, "polls/vote_create.html")

    elif http_method == 'POST':
        # 등록처리
        ## 1. 요청 파라미터들 조회, 검증
        ## 2. 처리 DB insert
        ## 3. 응답 

        # 요청 파라미터 조회 - request.GET, request.POST dictionary 구현체
        ## 조회 메소드 get(이름) - 조회결과가 개인의 경우. return:str 
        ##            getlist(이름) 하나의 이름으로 여러개 값이 넘어오는 경우 return:list[str]
        question_text = request.POST.get('question_text') # str
        choice_list = request.POST.getlist('choice_text') # list
        print(">>>>>>>choice_list:", choice_list)
        # 요청 파라미터 검증
        ## question_text로 넘어온 값이 없거나 빈 문자열이라면,
        if not question_text or (question_text and not question_text.strip()):
            return render(
                request, 
                "polls/vote_create.html",
                {
                    "error_message" : "질문은 한글자 이상 입력하세요",
                    "question_text" : question_text,
                    "choice_list" : choice_list,
                }
            )

        ## 보기 요청 파라미터 검증 - 보기가 두개미만 이라면
        if not choice_list or len([c for c in choice_list if c.strip()]) < 2:
            return render(
                request,
                "polls/vote_create.html",
                {
                    "error_message": "보기는 2개 이상 입력하세요.",
                    "question_text": question_text,
                    "choice_list": choice_list,
                }
            )
        # ... (저장은 아래에서)
```

**하나의 URL이 GET이면 빈 폼, POST면 처리**를 맡는다. 검증에 실패하면 입력했던 값을 context로 돌려줘서 사용자가 처음부터 다시 쓰지 않게 했다.

직접 실행(`/polls/vote_create_old`로 POST):

```text
== POST old {'question_text': '  ', 'choice_text': ['봄', '여름']} 200 ['질문은 한글자 이상 입력하세요'] | 다시 채운 값: ['  ', '봄', '여름']
== POST old {'question_text': '계절?', 'choice_text': ['봄', '  ']} 200 ['보기는 2개 이상 입력하세요.'] | 다시 채운 값: ['계절?', '봄', '  ']
== POST old {'question_text': '좋아하는 계절은?', 'choice_text': ['봄', '여름', '가을']} 302 /polls/list
  저장: 좋아하는 계절은? ['봄', '여름', '가을']
```

검증은 잘 된다. 그런데 공백 보기가 섞여 있으면 이렇다.

```text
== 빈 보기 섞어 제출 302 ['1', '  ', '2']
```

"내용 있는 보기가 2개 이상인가"만 검사하고, 저장할 때는 `choice_list`를 **그대로** 넣어서 공백뿐인 보기 `'  '`도 저장됐다. 검사할 때 쓴 `[c for c in choice_list if c.strip()]`를 저장에도 써야 한다. 직접 검증 방식에서는 이렇게 "검사한 값"과 "쓰는 값"이 어긋나기 쉽다.

필기에도 이 방식이 정리되어 있다.

```python
# 지금 방식 - views.py에서 직접 로직으로 검증
if not question_text or not question_text.strip():
    return render(request, 'vote_create.html', {'error_message': '질문을 입력하세요.'})

if len(choice_list) < 2:
    return render(request, 'vote_create.html', {'error_message': '보기는 2개 이상.'})
```

### 함께 저장하기: transaction

질문을 저장한 뒤 보기를 저장하다 실패하면 **보기 없는 질문**만 남는다. 둘을 한 작업 단위로 묶는다.

```python
        ## 질문/보기 등록처리
        ## transaction 처리를 할거임 => 질문과 보기가 모두 insert 되거나 실패하면 모두 insert 안되도록 보장
        try:
            with transaction.atomic(): # transaction의 시작
                # with block을 정상적으로 실행하고 나오면 commit을 실행
                # with block 실행 중 오류 발생하면 rollback 실행 (DB 작업 시작 전)

                q = Question(question_text=question_text)
                q.save()

                ## question + choice가 둘다 insert가 되어야하는데 중간에 exception이 되면 보기가 입력이 안됌
                ## 하나의 작업단위로 묶어줘야함 => transaction

                for choice_text in choice_list:
                    choice = Choice(choice_text=choice_text, question=q) # id/vote는 자동 입력
                    choice.save()

            # 여기서 자동으로 transaction 끝 (commit or rollback)
        
        except Exception as e:
            return render(request, "polls/error.html", {"error_message": "설문을 저장하는 도중에 에러가 발생했습니다."})

#### 응답: redirect 방식으로 => 설문 목록으로 이동

    return redirect(reverse('polls:vote_list'))
```

`with` 블록이 정상 종료되면 COMMIT, 예외가 나면 블록 안의 작업 전체를 ROLLBACK한다. [SQL 시리즈의 트랜잭션](/notes/sql/sql-dml)을 파이썬 문법으로 쓴 것이다.

> **보충**: `except`에서 넘기는 키는 `error_message`인데, 지난 글에서 본 대로 `error.html`은 `error_messages`를 출력한다. 저장 중 에러가 나면 에러 페이지의 메시지 자리가 비어 나온다.

## 2단계: Django Form

강의 자료의 Form 역할 세 가지 옆에, 수업 중 이렇게 적어 두었다.

```text
id :
password:

등 입력값 만드는 것과 요청을 받고 할 때 백단에서 django에서 요청파라미터를 관리해줌

1. HTML input 태그 자동 생성
2. 요청 파라미터 읽어서 검증
```

| Form이 하는 일 | 직접 하던 일 |
|---|---|
| HTML 입력 폼 생성 | 템플릿에 `<input>` 직접 작성 |
| 요청 파라미터 읽기 + 검증 | `request.POST.get()` + `if` 문 |
| 검증된 값을 딕셔너리로 제공(`cleaned_data`) | 검사한 값을 다시 정리 |
| 실패 시 에러 메시지 + 입력값 유지 | context로 직접 되돌려 줌 |

필기의 요약이다.

```python
# Form 모듈 사용 - 검증 자동
class QuestionForm(forms.Form):
    question_text = forms.CharField(
        max_length=200,
        required=True,          # 빈칸 검증
        error_messages={'required': '질문을 입력하세요.'}
    )

# views.py
form = QuestionForm(request.POST)
if form.is_valid():  # 위 검증 다 자동으로 해줌
    ...
else:
    # form.errors에 에러 메시지 담겨있음
    return render(request, 'vote_create.html', {'form': form})
```

### forms.py

`forms.py`는 앱에 자동으로 생기지 않아 직접 만든다. 이해한 내용을 주석으로 길게 남겨 두었다.

```python
# polls/forms.py
from django import forms

# Form 클래스 정의 - forms.form을 상속
## 입력 폼들을 모아서 정의한 클래스
## 입력 폼들 - (Form) Field: 개별 입력(input) 폼
## 일반적으로 <form> 안의 입력 폼들을 Form 클래스로 정의

# 원래는 하나의 양식에 form 클래스 1개(여러개의 입력폼 정의) => 지금은 질문, 보기 2개 각각 1개씩 
# form tag => 입력(form-form class로 전부다 정의하거나 일부 정의하여 관리함)받는 모든 양식 
# </form> tag에 들어가는 입력받는 양식 conponent의 클래스
# form class => 요청파라미터를 조회하고 검증하는 작업 
# 입력양식만들기(template단-input 태그 생성) + 조회,검증(view단) 

# 요청 파라미터를 정의 => <input type="", name = "">
# 변수명 = name (요청 파라미터)

# django에 form에는 field class 객체들이 정의 필요한 거를 상속
# 어떤 input에 어떤 검증을 하는지 정의 => 검증이 실패하면 exception 발생
# input tag의 속성들도 많음=> max length 등
# widget => 화면에서 보이는 것. => default가 아닌 다른 걸 입력받고 싶을 때
# 
# formset 동일한 종류의 입력을 받을 때 사용. ex) 질문의 보기
# question_text는 instance 변수

#######################################################
#               설문 질문 등록 폼                      # 
#######################################################
class QuestionForm(forms.Form):
    # Form Field 정의
    ## 변수명(요청파라미터 name) = FormField(): 입력형식
    question_text = forms.CharField( #문자열 입력 폼=<input type=text> (default)
        label="", # 입력 폼에 대한 label 설정
        max_length=200, # 최대 200글자 <input max text=200>
        widget=forms.TextInput(attrs={"class":"form-control"}), #ex passwordinput으로 하면 글자 가려줌 
        help_text="200글자 이내로 작성해주세요.",
        # strip=False => required 가 True인게 걸림/ 기본 파라미터로 strip제공 default 값은 True
    )
```

| 설정 | 결과 |
|---|---|
| 클래스 변수 이름 `question_text` | `<input name="question_text">` |
| `forms.CharField` | `<input type="text">` + 문자열 검증 |
| `max_length=200` | `maxlength="200"` 속성 + 길이 검증 |
| `required`(기본 True) | `required` 속성 + 빈 값 검증 |
| `widget=forms.TextInput(attrs={...})` | 태그 모양 지정(`class` 등). `PasswordInput`이면 글자 가림 |
| `help_text` | 입력칸 위 안내 문구 |

View에서 `QuestionForm()` 객체를 넘기고 템플릿에서 `{{ q_form }}`만 쓰면 아래 HTML이 만들어진다.

직접 실행(GET 응답에서 질문 부분):

```html
<div>
<div class="helptext" id="id_question_text_helptext">200글자 이내로 작성해주세요.</div>
<input type="text" name="question_text" class="form-control" maxlength="200" required aria-describedby="id_question_text_helptext" id="id_question_text">
</div>
```

### clean 메서드: 업무 규칙 검증

`required`, `max_length` 같은 **기본 검증**을 통과한 값은 `self.cleaned_data`에 들어간다. 그 위에 "5글자 이상" 같은 **업무 규칙**은 `clean_필드명()` 메서드로 추가한다.

```python
    # 요청 파라미터 검증 메서드 => 업무 규칙(사용자 정의 규칙)을 검증
    ## - clean_field이름: ex) clean_question_text() - 특정 필드의 입력값을 검증할 때 사용
    ## - clean() 모든 field들의 입력 값을 검증 할 수 있음
    ## 호출: Form의 각 field들의 기본 검증을 하고 다 통과하면 호출 clean 메소드들을 호출한다.
    ### 기본검증을 통과한 값들은 self.cleaned_data에 dict구현체로 저장되어있음.
    #### 기본 검증 예) EmailField - 이메일 형식인지 검증, IntegerField 정수인지 검증


    # 검증 메소드는 이름의 규칙이 필요함 => clean(=전체검증)2, clean_xxx(변수명)
    # exception은 validationError를 발생시킴
    # 
    # 검증 메소드는 따로 관리하는게 편함 => 로직이 복잡해지기 때문
    #  
    # 기본적인 검증이 끝나면 dict 형태로 갖고 있음 => clean_data에 저장해둠 (기본 검증 통과한 값)
    # 
    # 이제 그걸 갖고 있는  메소드로 2번 검증,,,  로직은 간단하게 if문 xxx맞음? 아니면 exception => validastionError

    def clean_question_text(self):
        """
        question_text 필드 검증 메서드
        빈 문자열 검증
        앞뒤 공백만 입력한 경우 검증
        """
        txt = self.cleaned_data['question_text'].strip()
        if len(txt) < 5:
            # 검증 실패 => ValidationError를 발생
            raise forms.ValidationError("질문은 5글자 이상 입력하세요.") # 나중에 사용자 화면에 띄워줄 messages 

        return txt
```

규칙은 세 가지다.

1. 실패하면 `ValidationError`를 **raise**한다. 메시지는 해당 필드의 에러로 화면에 표시된다.
2. 성공하면 값을 **return**한다. 반환한 값이 `cleaned_data`의 새 값이 된다(여기서는 `strip()`한 값).
3. 여러 필드를 함께 봐야 하면(비밀번호 확인 등) `clean()`에서 `self.add_error("필드", "메시지")`로 모은다.

직접 실행(질문만 바꿔 제출):

```text
== POST q='   ' choices=['a', 'b']
   200  ['필수 항목입니다.']
== POST q='짧은질' choices=['a', 'b']
   200  ['질문은 5글자 이상 입력하세요.']
```

![질문이 5글자 미만일 때의 설문 등록 화면](/images/django/fig-django-create-error.png)

에러 메시지가 해당 입력칸 아래에 붙고, 입력했던 값이 그대로 남아 있다. 값과 에러를 품은 Form 객체를 다시 넘긴 결과다.


공백만 넣은 경우는 `clean_question_text`까지 가지 않고 `필수 항목입니다.`가 나왔다. 주석에 적어 둔 `strip` 때문이다. `CharField`는 `strip=True`가 기본이라 **기본 검증 단계에서 이미 앞뒤 공백을 잘라** `''`이 되고, `required` 검증에 걸린다. 강사님 코드는 `strip=False`를 줘서 공백을 남긴 채 `clean_`에서 직접 걸렀고, 내 코드는 기본값을 써서 `required`가 먼저 걸리는 것이다. 어느 쪽이든 공백 질문은 막힌다.

## 3단계: FormSet

보기는 같은 입력이 여러 개다. 같은 Form을 여러 개 묶은 것이 FormSet이다.

```python
class ChoiceForm(forms.Form):
    # input type=text, name = choice_text, class = 'form-control'
    choice_text = forms.CharField(
        label="",
        max_length=200,
        widget=forms.TextInput(attrs={"class":"form-control mt-2"}),
    )
    def clean_choice_text(self):
        txt = self.cleaned_data['choice_text'].strip()
        if len(txt) < 1:
            raise forms.ValidationError("보기는 1글자 이상 입력하세요.")
        return txt

# FormSet을 정의
# Form + set: Form들의 집합

# 동일한 입력값일 때,
# 일단 Form class에서 하나의 객체를 생성 그걸 formset에 넣고 자가복제
# formset_factory
# formset이라는 class가 생김

# formset_factory(Form, extra=개수) : FormSet 클래스를 생성
# 동일한 input을 여러개 관리할 때 사용.
# extra=2   →  처음에 input 2개 보여줌
# JS로 추가  →  3개, 4개... 동적으로 늘어남
# 제출 시    →  입력된 것 전부 formset이 처리해줌

# formset이 choice_text-0, choice_text-1, choice_text-2... 이런 식으로 자동으로 인덱스 붙여서 관리해줘요.

ChoiceFormset = forms.formset_factory(
ChoiceForm, # Form 클래스 
extra=2, # Form 클래스의 field들을 extra개수 만큼 반복해서 가진다.
)

## set으로 묶어서 처리할 때 내부적으로 name에서는 번호를 붙여주고 id라는 파라미터를 생성 0,1,2,3,4,5 => 이런식으로 index를 붙여줌
## 자료구조 []라 생각하면 될 듯
```

주석의 `choice_text-0`은 실제로는 `form-0-choice_text`다(`접두어-번호-필드명`). 템플릿에는 FormSet이 몇 개의 폼을 관리하는지 알려 주는 숨은 입력(`management_form`)을 반드시 함께 출력한다.

```html
<form method="post">
    {% csrf_token %}
    {{ c_formset.management_form }} 
        {% comment%} 
            c_formset.management_form 출력: formset을 이용할 경우 반드시 출력해야 한다.
            <input type=hidden>으로 FormSet이 생성한 태그들에 대한 정보를 생성.
            이 값이 넘어가야 View에서 입력된 값을 제대로 처리할 수 있다.
            # 생성하는 값 
            - TOTAL_FORM: formset이 관리하는 입력의 개수       
            - INITIAL_FORM: 처음 생성한 입력의 개수 (원래 있던 값을 가지고 있으면서 생성되는 input = 수정관련된)  
            - MIN_NUM_FORM: 최소 허용 입력의 개수       
            - MAX_NUM_FORM: 최대 허용 입력의 개수       
        {% endcomment%}        
    
    <h2>질문</h2>
    {{q_form}}

    <h3>보기</h3>    
    <div id="choice-layer" class="mt-3">
        <!-- formset: form들의 집합 => for in 문을 실행하면 form이 반환 -->
        <!-- input의 이름: prefix(form)-index-Field이름 (form-0-choice_text ...) -->
        {% for c_form in c_formset %}
            {{c_form}}
        {% endfor %}
    </div>
    ...
</form>
```

직접 실행(GET 응답에서 FormSet 부분):

```html
<input type="hidden" name="form-TOTAL_FORMS" value="2" id="id_form-TOTAL_FORMS"><input type="hidden" name="form-INITIAL_FORMS" value="0" id="id_form-INITIAL_FORMS"><input type="hidden" name="form-MIN_NUM_FORMS" value="0" id="id_form-MIN_NUM_FORMS"><input type="hidden" name="form-MAX_NUM_FORMS" value="1000" id="id_form-MAX_NUM_FORMS">
...
<input type="text" name="form-0-choice_text" class="form-control mt-2" maxlength="200" id="id_form-0-choice_text">
<input type="text" name="form-1-choice_text" class="form-control mt-2" maxlength="200" id="id_form-1-choice_text">
```

질문 입력에는 `required`가 붙었는데 보기 입력에는 없다. FormSet의 추가 폼(`extra`)은 "비워 두면 없는 셈 치는" 폼이라서 그렇다. 이 성질이 아래 버그의 원인이 된다.

### Form을 쓰는 View

```python
@login_required 
def vote_create(request):
    if request.method == 'GET':
        # 응답화면 반환

        ## Form을 이용해서 template를 입력양식을 구현할 경우, Form 객체를 생성 
        ## 생성된 객체를 context value로 template에게 전달.
        q_form = QuestionForm()
        # c_form = ChoiceForm() # 보기는 여러개이기 때문에 formset 객체 적용
        c_formset = ChoiceFormset()

        return render(
            request,
            "polls/vote_create_form.html",
            {"q_form":q_form, "c_formset":c_formset}
        )

    elif request.method == 'POST':
        ## 등록처리
        ## 요청 파라미터를 Form을 이용해서 처리. (조회, 검증)
        ## 요청 파라미터를 (request.POST)를 initializer에 넣어서 객체 생성
        ## 요청 파라미터 name-instance 변수에 맞춰서 값을 할당하고 검증(기본,clean)까지 처리.
        ## 요청 파라미터 name을 검증하고 검증 통과한 값들을 cleaned data에 저장 검증(기본, cleaned 2번)
        q_form = QuestionForm(request.POST, request.FILES) #FILES => 파일을 받을 때, 지금은 필요없음
        c_formset = ChoiceFormset(request.POST, request.FILES)
        # 요청 파라미터 검증 성공 여부만 확인하면 됌 - 성공:처리, 실패하면 오류처리페이지로 이동
        ## form.is_valid(): 함수를 실행, bool -> 검증성공 여부 확인
        ## 현재 2개의 값을 받고 있음 (2개 다 검증)
        if q_form.is_valid() and c_formset.is_valid():
            # 요청 파라미터 값들을 FORM에서 조회
            q_text = q_form.cleaned_data['question_text']
            choice_list = []
            for c_form in c_formset:
                choice_list.append(c_form.cleaned_data['choice_text'])
            # 받은 값들을 검증 후에 DB 저장
            try:
                with transaction.atomic():
                    q = Question(question_text=q_text)  #model class로 생성
                    q.save()
                    for choice in choice_list:
                        c = Choice(choice_text=choice, question=q)
                        c.save()
            except Exception as e:
                return render(request, "polls/error.html", {"error_message":"설문 도중에 에러가 발생했습니다."})
            return redirect(reverse("polls:vote_list"))
        else:
            # 검증 실패 -> form 객체를 context value로 해서 다시 vote_create.html로 이동.
            return render(
                request, "polls/vote_create_form.html", {"q_form":q_form, "c_formset":c_formset}) #요청 파라미터 가진 Form들
```

같은 URL에서 GET이면 빈 Form, POST면 `Form(request.POST)`로 채워 `is_valid()`. 실패하면 **값과 에러를 품은 Form 객체**를 그대로 다시 넘기면, 템플릿이 입력값과 에러 메시지를 함께 그린다. 1단계에서 손으로 하던 일이 이 한 줄로 끝난다. `@login_required`는 6편에서 다룬다.

### 보기를 비우면 500 에러

정상 입력은 잘 저장된다. 보기 칸을 비우거나 공백만 넣어 봤다.

직접 실행:

```text
== POST q='좋아하는 과일은?' choices=['사과', '배']
   302 /polls/list []
== POST q='좋아하는 계절은?' choices=['봄', '   ']
   EXCEPTION KeyError 'choice_text'
== POST q='좋아하는 계절은?' choices=['봄', '']
   EXCEPTION KeyError 'choice_text'
== POST q='좋아하는 계절은?' choices=['', '']
   EXCEPTION KeyError 'choice_text'
```

```text
  File ".../polls/views.py", line 398, in vote_create
    choice_list.append(c_form.cleaned_data['choice_text'])
KeyError: 'choice_text'
```

보기가 하나라도 비면 서버 에러(500)다. 원인은 두 가지가 겹친 것이다.

1. `extra`로 만든 폼은 **아무것도 입력하지 않으면 검증을 건너뛰고 통과**한다(`empty_permitted`). 그래서 `is_valid()`가 `True`인데, 그 폼의 `cleaned_data`는 빈 딕셔너리 `{}`다.
2. 공백 `'   '`도 `strip=True` 때문에 `''`이 되어 "입력하지 않은 폼"으로 취급된다. `clean_choice_text`의 "1글자 이상" 검사는 아예 호출되지 않는다.

`{}['choice_text']`가 `KeyError`가 된다. 고치는 방법은 두 가지다.

```python
# 1. 최소 2개는 반드시 입력하도록 FormSet에 지정
ChoiceFormset = forms.formset_factory(
    ChoiceForm,
    extra=0,
    min_num=2,          # 처음 2개는 필수 폼
    validate_min=True,  # 2개 미만이면 검증 실패
)

# 2. 빈 폼은 건너뛰고 값만 모으기
choice_list = [f.cleaned_data["choice_text"] for f in c_formset if f.cleaned_data]
```

1번을 적용해 직접 실행한 결과다.

```text
['봄', '   ', '']   False  [None, ['필수 항목입니다.'], None]  최소 2개의 양식을 제출하세요.
['봄', '여름', '']  True   ['봄', '여름']
['봄', '여름', '가을'] True ['봄', '여름', '가을']
```

`min_num` 안의 폼은 비우면 `필수 항목입니다.`로 막히고, 그 뒤 추가 칸은 비워도 무시된다. "보기 2개 이상"이라는 업무 규칙을 FormSet 설정으로 표현한 것이다.

## 4단계: JavaScript로 보기 칸 늘리기

"보기 추가" 버튼으로 입력칸을 늘린다. FormSet은 `form-번호-choice_text` 이름과 `TOTAL_FORMS` 값으로 폼을 세기 때문에, JavaScript로 칸을 만들 때 **이 두 가지를 맞춰야** 한다. 내 템플릿의 스크립트다.

```javascript
add_btn.addEventListener("click", ()=>{
    // input[name$='choice_text']: input 태그 중에 name 속성의 값이 choice_text로 끝나는 것
    //^=: 시작하는 것, *=: 포함하는 것, $-: 끝나는 것. =: 일치
    const choice_text_cnt = document.querySelectorAll("input[name]").length;
    const choice_text_input_name = `form-${choice_text_cnt}-choice_text`;
    const div = document.createElement("div");
    div.setAttribute("class", "mt-2");
    const input = document.createElement("input");
    input.setAttribute("type", "text");
    input.setAttribute("name", "choice_text");
    input.setAttribute("id", `id_${choice_text_input_name}` );
    input.setAttribute("required", true);
    input.setAttribute("class", "form-control");
    div.append(input);
    document.querySelector("#choice-layer").append(div); //choice layer에 생성한 div를 추가
    //total_form의 value를 1 증가
    const totalForms = document.querySelector("#id_form-TOTAL-FORMS");
    totalForms.value = parseInt(totalForms.value) + 1;
});
```

1단계(이름이 모두 `choice_text`인 방식)의 스크립트를 FormSet용으로 고치다가 세 군데가 어긋났다. 응답 HTML을 jsdom에 올려 버튼을 눌러 봤다.

직접 실행:

```text
input[name] 개수: 8 / input[name$='choice_text'] 개수: 2
[error] Uncaught [TypeError: Cannot read properties of null (reading 'value')]
[
  'name=form-0-choice_text id=id_form-0-choice_text',
  'name=form-1-choice_text id=id_form-1-choice_text',
  'name=choice_text id=id_form-8-choice_text'
]
TOTAL_FORMS = 2
```

| 위치 | 내 코드 | 결과 | 강사님 `script.js` |
|---|---|---|---|
| 개수 세기 | `input[name]` | csrf·management·질문 입력까지 **8개** | `input[name$='choice_text']` (2개) |
| name | `"choice_text"` | FormSet이 모르는 이름 | `choice_text_input_name` (`form-2-choice_text`) |
| TOTAL_FORMS 선택자 | `#id_form-TOTAL-FORMS` | 없는 id → `null.value` **TypeError** | `#id_form-TOTAL_FORMS` |

주석에는 `$=` 선택자 설명을 적어 놓고 코드에는 `input[name]`을 쓴 것이 첫 번째 원인이다. `name`은 1단계 코드에서 그대로 남았고, id는 `_`(언더스코어)를 `-`로 잘못 썼다.

결과적으로 입력칸은 화면에 생기지만 `TOTAL_FORMS`는 2 그대로이고 이름도 다르다. 그 상태로 세 번째 보기 "가을"을 넣어 제출하면 이렇다.

직접 실행(`form-0`·`form-1` + `choice_text=가을`, `TOTAL_FORMS=2`로 POST):

```text
== JS로 추가한 보기 포함 제출 302 좋아하는 계절은? ['봄', '여름']
```

에러 없이 등록되지만 **"가을"은 조용히 사라진다.** 사용자는 저장된 줄 안다. 위 표의 오른쪽처럼 세 곳을 고치면 된다.

> **보충**: 강사님 프로젝트는 이 스크립트를 `polls/static/polls/js/script.js`로 분리하고 템플릿에서 `<script src="/static/polls/js/script.js">`로 불렀다. 스크립트가 템플릿 안에 있으면 `{{ }}`·`{% %}`와 섞여 읽기 어렵고 브라우저 캐시도 못 쓴다. 정적 파일은 7편에서 본다.

### 남은 옛 화면

1단계 화면(`/polls/vote_create_old`)의 템플릿은 `action="{% url 'polls:vote_create' %}"`, 즉 **새 View로 제출**한다. Form 버전을 만들면서 action을 바꿨기 때문이다.

직접 실행(옛 화면 형식 그대로 `vote_create`에 제출):

```text
== old 화면 action으로 제출 200 ['polls/vote_create_form.html'] <ul class="errorlist nonform"><li>ManagementForm 데이터가 없거나 변경되었습니다. 현재 없는 필드: form-TOTAL_FORMS, form-INITIAL_FORMS. ...</li></ul> | 저장됨? False
```

옛 화면에는 `management_form`이 없으니 FormSet 검증이 실패하고 새 화면으로 튕긴다. 옛 화면은 이제 쓸 수 없는 상태다. 비교용으로 남겨 둘 거라면 action을 `vote_create_old`로 되돌리거나 `action`을 비워 둔다(비우면 현재 URL로 제출).

## ModelForm

필기의 정리다.

```text
# CRUD
C (Create)  →  Form으로 입력받아서 DB insert
R (Read)    →  Form 필요없음 (그냥 조회)
U (Update)  →  Form으로 수정값 받아서 DB update
D (Delete)  →  Form 필요없음 (pk만 있으면 됨)

=> model과의 관계가 깊음
=> model에 있는 field들을 이용해서 form을 제적
= model & form

# modelform 장점
Form        →  Model이랑 별개로 직접 필드 정의
ModelForm   →  Model 필드 그대로 가져다 씀 (중복 없음)
Model    →  DB 구조 정의
Form     →  입력 검증
ModelForm →  둘을 연결 (Model → Form 자동 생성)
```

`QuestionForm`의 `question_text = CharField(max_length=200)`은 Model의 정의를 한 번 더 쓴 것이다. ModelForm은 Model에서 필드를 가져온다.

```python
class QuestionModelForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = ["question_text"]          # 또는 "__all__", exclude = [...]
        widgets = {"question_text": forms.TextInput(attrs={"class": "form-control"})}
```

그리고 **`save()`** 가 생긴다. `form.save()` 한 줄이 `Question(question_text=...)` + `q.save()`를 대신하고, 수정 화면은 `Form(request.POST, instance=기존객체)`로 만든 뒤 `save()`하면 UPDATE가 된다. 6편의 회원 가입·정보 수정이 이 방식이다.

| | Form | ModelForm |
|---|---|---|
| 필드 정의 | 직접 | `Meta.model`, `Meta.fields`로 가져옴 |
| 저장 | `cleaned_data`로 Model을 직접 만들어 저장 | `form.save()` |
| 쓰는 곳 | Model과 1:1이 아닌 입력(검색, 로그인) | Model 등록·수정 |

> **보충**: 질문 + 보기처럼 부모 하나에 자식 여러 개를 함께 등록하는 화면은 `inlineformset_factory(Question, Choice, fields=["choice_text"])`가 있다. 보기 FormSet을 질문과 묶어 주고 `formset.save()`가 FK까지 채워 저장한다. 이 글의 `transaction` + 반복 저장을 Django가 대신해 주는 것이다.

## 정리

| 단계 | 방식 | 남은 문제 |
|---|---|---|
| 1 | `request.POST.get/getlist` + `if` | 검사한 값과 저장 값 불일치, 코드 반복 |
| 2 | `Form` + `is_valid()` + `clean_필드` | 입력 1개짜리에 적합 |
| 3 | `formset_factory` | 빈 추가 폼은 `cleaned_data == {}` → `min_num`·`validate_min` |
| 4 | JS로 칸 추가 | name(`form-N-필드`)과 `TOTAL_FORMS`를 맞춰야 함 |

- 검증 실패 시 **값이 든 Form 객체를 그대로 다시 render**하면 입력값과 에러가 함께 표시된다.
- 여러 테이블에 함께 쓰는 저장은 `transaction.atomic()`으로 묶는다.
- 겉으로 성공한 것처럼 보이는 실패(사라진 "가을")가 에러보다 위험하다.

다음 글에서는 설문 목록에 페이지 나누기를 붙인다.
