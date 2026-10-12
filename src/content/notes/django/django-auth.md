---
title: "사용자 인증: 회원 가입·로그인과 쿠키·세션"
description: "AbstractUser로 사용자 모델을 확장하고 UserAdmin·UserCreationForm을 커스터마이징한 뒤, 가입·로그인·로그아웃·정보 수정·비밀번호 변경·탈퇴를 함수형 View로 구현합니다. HTTP 무상태와 쿠키·세션, login_required와 next, 그리고 열린 리다이렉트 같은 허점까지 실제 요청 결과로 정리합니다."
category: 'Tech'
subcategory: 'Django'
series: 'Django'
seriesOrder: 6
originalNotebook: "13_django (Django2.pdf, mypoll/account, readme.md)"
tags: ["Django"]
date: 2026-07-31T10:00:00+09:00
thumbnail: '../../../assets/images/notes/django/django-auth.webp'
---

> SKN31 Django 수업 자료(`Django2.pdf`)와 `mypoll`의 회원 앱(`account`), 필기를 바탕으로 정리했습니다.
> 출력은 프로젝트 사본에 테스트 클라이언트로 가입·로그인 요청을 보내 **직접 실행**한 결과입니다(Django 5.2.18, 수업은 6.0.7).

## 이 글에서 다루는 것

- HTTP 무상태와 쿠키·세션
- `AbstractUser`로 사용자 모델 확장
- 관리자 화면 커스터마이징(`UserAdmin`)
- `UserCreationForm`·`UserChangeForm`으로 가입·수정 폼
- 로그인(`authenticate`, `login`)과 로그아웃
- `login_required`와 `next`
- 비밀번호 변경과 탈퇴

[지난 글들](/notes/django/django-pagination)에서 누구나 설문을 등록할 수 있었다. 이번 글은 "누가" 요청했는지 알아보고, 로그인한 사용자만 설문을 등록하게 한다.

## 무상태와 세션

필기다.

```text
### HTTP: => statess : 무상태 = (클라이언트의 상태 정보을 유지x) 

# 연결 -> 요청(protocol) -> 응답 -> HTTP달기
- 갖고 있는 문서를 요청 (한번의 요청과 응답)
- web-application
- web이 복잡해짐에 따라(반복작업이 필요) 한번의 요청으로는 유지불가, client의 정보를 유지하는게 중요해짐 
- 그걸 위해 session 관리가 필요 = transaction(DB작업)
- session = (모든작업의 시작과 끝을 위함, 한번의 요청으로 끝x)
- session 관리=>(사용자의 작업 정보(data)를 유지, 작업후 삭제)
- client 별(각 user)로 data를 유지 => how => client(browser-cookie)단에서 저장 or server(session)에서 저장

# cookie 
- browser cookie에 계속 기록, 서버에 session-id를 받음
# session
- session-id-30을 줌 각 아이디별로 memory에 순서대로 저장, 
```

(첫 줄의 `statess`는 stateless, "HTTP달기"는 "HTTP 닫기"다.)

HTTP는 요청이 끝나면 클라이언트를 잊는다. 로그인은 "이 사람이 아까 그 사람"임을 요청마다 알아야 하므로 상태를 어딘가에 보관해야 한다.

| | 쿠키 | 세션 |
|---|---|---|
| 저장 위치 | 브라우저 | 서버 |
| 동작 | 서버가 응답에 실어 보내면 브라우저가 저장, 요청마다 자동으로 다시 보냄 | 서버가 클라이언트별 저장 공간을 만들고 그 ID만 쿠키로 보냄 |
| 장점 | 서버 부담 없음, 오래 보관 가능 | 값이 브라우저에 노출되지 않음 |
| 단점 | 크기 제한, 사용자가 보고 고칠 수 있음 | 사용자가 많으면 서버 저장 공간 부담 |
| Django | `request.COOKIES`, `response.set_cookie()` | `request.session["키"]` |

[3편](/notes/django/django-polls-views)의 중복 투표 방지가 쿠키였다. 로그인은 세션을 쓴다. 로그인 직후 응답과 서버에 저장된 내용을 직접 확인했다.

직접 실행(로그인 POST의 응답 쿠키와, 그 세션 ID로 서버 DB에서 찾은 세션 데이터):

```text
Set-Cookie: sessionid=jbr3r2...; expires=Thu, 22 Oct 2026 08:54:02 GMT; HttpOnly; Max-Age=1209600; Path=/; SameSite=Lax
서버 django_session 행: {'_auth_user_id': '3', '_auth_user_backend': 'django.contrib.auth.backends.ModelBackend', '_auth_user_hash': 'd4bc1b40b100...'}
```

- 브라우저가 받은 것은 **의미 없는 ID(`sessionid`)뿐**이다. 누가 로그인했는지(`_auth_user_id: 3`)는 서버 DB(`django_session` 테이블)에 있다.
- 브라우저는 다음 요청부터 `sessionid`를 보내고, Django는 그 ID로 세션을 찾아 `request.user`에 사용자 객체를 넣어 준다.
- `HttpOnly`라 JavaScript(`document.cookie`)로 읽을 수 없고, 기본 만료가 2주(`Max-Age=1209600`초)다.

> **보충**: 필기의 "memory에 순서대로 저장"은 Django 기본 설정과 다르다. 기본 세션 저장소는 **DB**(`django_session` 테이블)라서 서버를 재시작해도 로그인이 유지된다. 메모리나 Redis 캐시에 두도록 바꿀 수도 있다.

## 사용자 모델 확장

Django의 기본 `User` 모델에는 `username`, `password`, `email`, `first_name`, `last_name`, `is_staff`, `is_active`, `is_superuser`, `last_login`, `date_joined`가 있다. 이름(한 칸)과 생일을 더 받으려면 확장한다.

| 방법 | 내용 |
|---|---|
| `AbstractUser` 상속 | 기본 필드를 그대로 두고 **추가** |
| `AbstractBaseUser` 상속 | 필드와 기능을 **처음부터** 정의 |

```python
from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.

# AbstractUser는 기존 UserModel을 사용할 수있도록 제공하는 클래스
# 1.AbstractUser 상속
# 2.기존 Field들에 **추가할 Field들을 정의** (name, birthday)

class CustomUser(AbstractUser):
    name = models.CharField(
        max_length=100,
        verbose_name="이름", # Form관련 설정 = modelForm과 연결할 model의 경우.
    )
    birthday = models.DateField( # DB: data타입, python: datetime.date
        null=True, # Nullble(Null허용) 컬럼 (default: False - Not Null)
        blank=True, # Form 설정 () - required=False
        verbose_name="생일", #form 설정
    )

    def __str__(self):
        return f"{self.pk}. {self.username}-{self.name}" # 1. mylid-홍길동
```

그리고 Django에게 "기본 User 대신 이것을 써라"라고 알린다.

```python
# config/settings.py
AUTH_USER_MODEL = 'account.CustomUser'
```

필기에 순서를 정리해 두었다.

```text
# account APP구현(사용자 관리)
- APP 생성
    - python manage.py startapp account
    - config/settings.py에 'INSTALLED_APPS'에 등록 ("account")
    - url config에 account URL 매핑설정
        - config/urls.py (ROOT URLConfig)에 account -> account/url.py 호출하도록 설정
        - account/urls.py 생성

    - template 디렉토리 생성
        -'account/templates/account'

# 사용자 관리 구현 => 1. model 정의

- Model 정의 : AbstracUser 상속
    - Django의 기존 User Model의 Fiedl들을 이용
    - 기존 Model Field들을 상속해서 수정(추가)

- config/settings에 사용자 관리시 사용할 모델로 등록
    - admin app에서 사용하는 기존 Usermodel를 우리가 정의한 Usermodel로 변경하는 작업
    - settings.py => AUTH_USER_MODEL ='account.CustomerUser'

-account/admin.py 에 CustomUser 모델을 등록 -> 관리자앱에서 관리가 가능

- DB에 적용
    - db.sqlite 삭제 => why 기존 model과 충돌 null 값등
    - 'python .\manage.py makemigrations'
    - 'python .\manage.py migrate'
    - 'python .\manage.py createsuperuser' (admin/****)
```

(필기의 `'account.CustomerUser'`는 오타이고, 실제 설정은 `'account.CustomUser'`다.)

"db.sqlite 삭제"가 중요하다. 이미 기본 User로 `migrate`한 DB에서 `AUTH_USER_MODEL`을 바꾸면, 관리자 기록 등 기존 테이블이 옛 `auth_user`를 가리키고 있어 마이그레이션이 꼬인다. 개발 초기라 DB를 지우고 새로 만든 것이다. Django 공식 문서도 **프로젝트를 시작할 때 처음부터 사용자 정의 모델을 두라**고 권한다. 당장 추가할 필드가 없어도 `class CustomUser(AbstractUser): pass`로 시작해 두면 나중에 필드만 추가하면 된다.

> **보충**: 다른 모델에서 사용자를 참조할 때(`ForeignKey`)는 `CustomUser`를 직접 import하지 않고 `settings.AUTH_USER_MODEL`을 쓴다. 사용자 모델이 바뀌어도 코드를 고치지 않아도 된다.

## 관리자 화면 커스터마이징

`admin.site.register(CustomUser)`만 하면 추가 필드가 관리자 화면에 어색하게 나온다. 기본 `UserAdmin`을 상속해 어떤 필드를 어디에 보일지 정한다.

```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser
# 사용자 정의 USER ADMIN 정의
## 관리자 앱에서 User의 어떤 항목(Field)들을 관리할지 정의
## UserAdmin을 상속받아서 구현하며, register()에 UserModel과 함께 전달.


### Class 변수로 Field들을 정의
### list_display:list - 사용자 메인화면에서 보여줄 항목들
### add_fieldsets:tuple - 등록화면에 나올 필드들
### fieldsets: tuple = 수정화면에 나올 항목들을 정의
class CustomUserAdmin(UserAdmin):
    list_display = ["username","name","email"] #field들
    # ("카테고리이름", {})
    add_fieldsets = (
        ("인증정보", {"fields":("username", "password1", "password2")}),
        ("개인정보", {"fields":("name", "email", "birthday")}),
        ("권한", {"fields":("is_staff", "is_active")}),
    )
    fieldsets = (
        ("인증정보", {"fields":("username", "password")}),
        ("개인정보", {"fields":("name", "email", "birthday")}),
        ("권한", {"fields":("is_staff", "is_active", "is_superuser")}),
    )
    

admin.site.register(CustomUser, CustomUserAdmin)
```

등록 화면은 비밀번호를 두 번(`password1`, `password2`) 받고, 수정 화면은 `password`(암호화된 값과 변경 링크)를 보여 준다. 비밀번호는 암호화해 저장하기 때문에 "수정"이 아니라 별도 "변경" 절차를 거친다.

## 가입·수정 폼: ModelForm 상속

[4편](/notes/django/django-form-formset)의 ModelForm을 Django가 회원용으로 미리 만들어 둔 것이 있다.

| 폼 | 용도 |
|---|---|
| `UserCreationForm` | 가입: `username` + `password1`·`password2`(일치 검사, 암호화 저장) |
| `UserChangeForm` | 정보 수정 |
| `AuthenticationForm` | 로그인: `username`, `password` |
| `PasswordChangeForm` | 비밀번호 변경: 기존 + 새 비밀번호 2번 |

기본 폼은 기본 User 기준이라 추가한 `name`, `birthday`가 없다. 상속해서 `Meta`를 바꾼다.

```python
# account/forms.py
from django import forms
# modelForm: form.ModelForm을 상속해서 구현.
#     meta class (Inner class로 정의)에서 어떤 model을 이용해서 만들지,
#     그 model의 어떤 field들을 입력 폼으로 사용할지 설정.
#     model에 없는 것을 입력 field로 등록할 경우 class 변수로 설정하면 됌 (Form과 동일)

# Django에서 사용자 관리(등록, 수정)을 위해서 제공하는 modelform들.
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from .models import CustomUser

# 등록화면에서 사용할 Form
class CustomUserCreationForm(UserCreationForm):

    # field를 새롭게 정의하거나 기존 field를 재정의(변경)할 경우
    username = forms.CharField(label="ID", required=True, max_length=30) # => Field classes에 field 정의를 가지고 옮
    # age = forms.IntegerField(label="나이") # Meta.field에 추가

    # inner class 정의
    class Meta:
        model = CustomUser  # 연결할 Model을 지정
        fields = ["username", "password1", "password2", "name", "email", "birthday"] # 입력 양식에 추가할 model의 Field들을 정의 
        # 입력양식에 추가할 모델의 필드들을 정의
        # [Field 선택, ...] form을 만드는데 사용할 필드들을 선택.
        # fields = "__all__" : 모든 필드들을 이용해서 form을 구성
        # exclude = ['필드명'] 지정한 field들 빼고 나머지 field들을 이용
        # 특정 Field들의 widget을 변경하고 싶다. (기존 widget기능을 meta에 적용)
        widgets = {
            "birthday": forms.DateInput(attrs={"type":"date"}), # type date는 날짜 입력 형식으로 받을 수 있게 됌 / 기존 form의 widgets 기능을 field에 적용가능
        }
        
    # 검증 메소드 추가
    def clean_name(self):
        name = self.cleaned_data['name']
        if len(name) < 2:
            raise forms.ValidationError("이름은 두 글자 이상 입력하세요.")
        
        return name


## 사용자 정보 변경 폼
class CustomUserChangeForm(UserChangeForm):
    # 비밀번호 변경 설정이 안나오도록 처리
    password=None
    class Meta:
        model = CustomUser
        fields = ["name", "email", "birthday"]
        widgets = {"birthday": forms.DateInput(attrs={"type":"date"})}

    # 검증 메소드 추가
    def clean_name(self):
        name = self.cleaned_data['name']
        if len(name) < 2:
            raise forms.ValidationError("이름은 두 글자 이상 입력하세요.")
        
        return name
```

- `widgets`로 생일 입력을 `<input type="date">`(달력)로 바꿨다.
- `CustomUserChangeForm`의 `password=None`은 부모 폼에 있는 비밀번호 필드를 **지우는** 문법이다. 정보 수정 화면에 비밀번호 칸이 나오지 않는다.
- 같은 `clean_name`이 두 폼에 반복된다. 함수 하나를 만들어 두 폼에서 부르면 규칙이 바뀔 때 한 곳만 고친다.

> **보충**: 강의 자료는 `class Meta(UserCreationForm.Meta):`처럼 **부모의 Meta를 상속**하라고 되어 있다. 내 코드는 `class Meta:`로 새로 만들었다. 이 프로젝트에서는 `model`·`fields`를 모두 직접 지정해서 차이가 없지만, 부모 Meta의 다른 설정(`field_classes` 등)을 물려받으려면 상속하는 쪽이 안전하다.

템플릿은 `django-bootstrap5`의 `{% bootstrap_form form %}` 한 줄로 Bootstrap 스타일 입력 폼을 그린다.

```html
<form method="post">
    {% csrf_token %}
    {% bootstrap_form form %}  
    <div id="btn-layer" class="mt-3">
        <button type="submit" class="btn btn-primary">가입</button>
        <button type="reset" class="btn btn-secondary">초기화</button>
    </div>
</form>
```

직접 실행(가입 화면의 입력 요소):

```text
[('hidden', 'csrfmiddlewaretoken'), ('text', 'username'), ('password', 'password1'), ('password', 'password2'), ('text', 'name'), ('email', 'email'), ('date', 'birthday')]
```

![회원 가입 화면](/images/django/fig-django-signup.png)

`EmailField`는 `type="email"`, 위젯을 바꾼 생일은 `type="date"`가 됐다.

## 가입

```python
###########################################################
#  가입처리
#  요청 URL: account/create
#  View함수: create
#           - GET: 가입양식 화면 , POST: 가입처리
#  응답 방식:
#           - GET: template/account/create.html 
#           - POST: (redirect) 메인화면 -> (/polls/welcome)
############################################################

def create(request):

    if request.method == "GET":
        # 빈 Form 객체를 context value로 전달
        return render(request, "account/create.html", {"form":CustomUserCreationForm()})

    elif request.method == "POST":
        # 요청 파라미터 조회 + 검증 -> Form
        form = CustomUserCreationForm(request.POST, request.FILES)

        if form.is_valid(): # ValidationError가 발생하지 않았으면(검증 통과)
            # DB에 insert -> modelform은 save()/insert/update를 처리
            user = form.save() # ModelForm을 이용해 Insert나 Update 처리. 처리한 model객체를 반환
            login(request, user)
            print("save 후 user", type(user), user) #user는 insert된 모든 정보를 가지고 있다.
            return redirect(reverse("polls:polls_welcome"))
        
        else: # 검증시 문제가 발생.
            # context value로 검증 실패한 Form을 넘겨준다.
            return render(request, "account/create.html", {"form":form})
```

4편의 Form View와 모양이 같다. 강사님 코드에 없는 `login(request, user)`를 넣어서 **가입하면 바로 로그인된 상태**가 되게 했다.

직접 실행:

```text
== 이름 1글자 200 ['이름은 두 글자 이상 입력하세요.']
== 비밀번호 불일치 200 ['비밀번호가 일치하지 않습니다.']
save 후 user <class 'account.models.CustomUser'> 2. hong-홍길동
== 가입 302 /polls/welcome | 세션 로그인: True
   저장된 password: pbkdf2_sha256$1000000$37QPNClL...
```

비밀번호는 원문이 아니라 `알고리즘$반복횟수$솔트$해시` 형식으로 저장된다. DB가 유출돼도 원래 비밀번호를 바로 알 수 없다.

그런데 이 가입은 비밀번호 `abc`로 통과했다. `settings.py`에서 비밀번호 규칙을 모두 주석 처리했기 때문이다.

```python
AUTH_PASSWORD_VALIDATORS = [
    # {
    #     'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    # },
    # {
    #     'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    # },
    # ... (CommonPasswordValidator, NumericPasswordValidator)
]
```

실습 중 짧은 비밀번호로 계정을 만들려고 끈 것이다. 켜 두면 "8자 이상", "흔한 비밀번호 금지", "숫자로만 구성 금지", "아이디와 비슷한 비밀번호 금지"를 Django가 검사한다. 배포용이라면 주석을 푼다.

## 로그인과 로그아웃

```python
## 로그인/로그아웃
from django.contrib.auth import(
    authenticate, # 사용자 입력 username과 password를 DB에서 조회
    login,        # 로그인 처리. 서버 메모리에 로그인한 사용자의 정보(model)을 저장
    logout,       # 로그아웃 처리. 로그인시 저장한 model을 제거
    get_user,     # 로그인한 사용자의 저장된 정보(model)을 반환하는 함수
    update_session_auth_hash, # 회원정보 수정 후 수정된 정보를 서버 메모리에 update하는 함수
)
from django.contrib.auth.forms import(
    AuthenticationForm,  # 로그인 입력양식, username, password
    PasswordChangeForm,  # 패스워드 변경화면에서 사용할 입력양식
)
from django.contrib.auth.decorators import login_required 
```

import 옆 주석이 함수별 역할 요약이다. 앞의 확인대로 "서버 메모리"는 실제로는 세션 저장소(DB)다.

```python
def user_login(request):

    if request.method == "GET":
        return render(request, "account/login.html", {"form":AuthenticationForm()})

    elif request.method =="POST":
        ## 로그인처리
        username = request.POST['username']
        password = request.POST['password']
        ## 인증 - username/password 확인
        user = authenticate(request, username=username, password=password)
        ### 일치하면 model를 반환 일치하지 않으면 None값
        #authenticate의 역할 => model에서 조회해서 password를 확인하는 작업을 대신해줌
        if user is not None: #일치
            # 로그인 처리 (메모리-session에 로그인한 사용자의 model객체를 저장)
            login(request, user)

            ## 로그인해야 요청할 수 있는 view를 로그인하지 않고 요청한 경우, 로그인 페이지로 이동하면서
            ## next query string을 붙인다. 로그인 후 원래 요청한 페이지로 이동하도록 한다.
            
            
            ## 요약: next query string은 원래 이동하려고 했던 페이지 즉 로그인 후 next page는 원래가려고했던 곳으로 이동한다. 
            ## 단 next_url로 가는 로직은 직접 구현해야한다. 

            next_url = request.GET.get("next") #url?next=/account/detail
            if next_url is not None:
                return redirect(next_url)
            return redirect(reverse("polls:polls_welcome"))
        
        else: # 불일치
            return render(
                request,
                "account/login.html",
                {"form":AuthenticationForm(), "error_message":"아이디나 패스워드를 다시 확인하세요."}
            )
        
def user_logout(request):
    #login() 함수가 처리한 작업을 무효화 (Session에서 user정보를 제거)
    logout(request)
    return redirect(reverse("polls:polls_welcome"))
```

| 함수 | 하는 일 |
|---|---|
| `authenticate(request, username=, password=)` | DB에서 찾고 비밀번호 해시를 비교. 맞으면 User, 틀리면 `None` |
| `login(request, user)` | 세션에 사용자 ID 저장 + `sessionid` 쿠키 발급 |
| `logout(request)` | 세션 비우기 |
| `get_user(request)` | 지금 로그인한 사용자(`request.user`와 같음) |

### login_required와 next

로그인한 사용자만 쓸 View에는 데코레이터를 붙인다. 설문 등록이 그렇다.

```python
# 로그인 기능을 위한 데코레이터 => 
# 로그인 해야지만 처리할 수 있는 page들을 view단에서 판단 => 로그인이 안된 이용자를 로그인화면으로 이동시킴
# 단, 로그인화면으로 이동시킬 URL은 settings.py에 등록해줘야함
from django.contrib.auth.decorators import login_required 

@login_required 
def vote_create(request):
    ...
```

```python
# settings.py
LOGIN_URL = "/account/login"
```

직접 실행(로그인 전 요청):

```text
== 로그인 전 vote_create 302 /account/login?next=/polls/vote_create
== 로그인 전 detail 302 /account/login?next=/account/detail
```

로그인 화면으로 보내면서 원래 가려던 주소를 `?next=`에 붙인다. 주석대로 **로그인 후 next로 보내는 것은 직접 구현**해야 하고, 위 View가 `request.GET.get("next")`로 그 일을 한다. 로그인 폼에 `action`이 없어서 현재 URL(`?next=...` 포함)로 POST되기 때문에 POST 처리 중에도 `request.GET`에서 `next`를 읽을 수 있다.

직접 실행:

```text
== 로그인 실패 200 ['아이디나 패스워드를 다시 확인하세요.'] | username 유지: False
== 로그인 성공(next) 302 /account/detail
```

![로그인 실패 화면. 아이디 칸이 비어 있다](/images/django/fig-django-login-fail.png)


로그인에 실패하면 빈 `AuthenticationForm()`을 다시 주기 때문에 **입력했던 아이디가 지워진다.** 4편의 원칙대로 값이 든 폼을 돌려주면 아이디가 남는다.

```python
form = AuthenticationForm(request, data=request.POST)
if form.is_valid():              # authenticate()까지 폼이 대신 수행
    login(request, form.get_user())
    ...
else:
    return render(request, "account/login.html", {"form": form})   # 아이디 유지 + 에러 메시지
```

### next에 외부 주소를 넣으면

`next`도 사용자가 고칠 수 있는 값이다. 외부 주소를 넣어 봤다.

직접 실행:

```text
== next에 외부 주소 302 https://evil.example.com/
```

로그인에 성공하자 **다른 사이트로 보내졌다.** 이것이 열린 리다이렉트(Open Redirect)다. 진짜 사이트 로그인 링크에 `?next=가짜사이트`를 붙여 퍼뜨리면, 사용자는 진짜 사이트에서 로그인한 직후 가짜 사이트로 넘어가 "세션이 만료되었습니다, 다시 로그인하세요" 같은 화면에 비밀번호를 다시 입력하게 된다. Django가 확인 함수를 제공한다.

```python
from django.utils.http import url_has_allowed_host_and_scheme

next_url = request.GET.get("next")
if next_url and url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
    return redirect(next_url)
return redirect(reverse("polls:polls_welcome"))
```

Django의 `LoginView`를 쓰면 이 확인이 이미 들어 있다. 함수형 View로 직접 구현할 때 놓치기 쉬운 부분이다.

### 로그아웃은 GET 링크

메뉴의 로그아웃은 일반 링크(GET)다.

```html
<a href="{% url 'account:logout' %}" class="nav-link fw-bold">로그아웃</a>
```

```text
== GET 로그아웃 302 /polls/welcome | 세션 로그인: False
```

동작은 한다. 다만 강의 자료에 "LogoutView는 Django 5.0부터 POST 요청만 처리"라고 되어 있는 이유가 여기 있다. GET으로 로그아웃되면 다른 사이트가 `<img src="우리사이트/account/logout">` 한 줄로 사용자를 로그아웃시킬 수 있다(CSRF). 상태를 바꾸는 요청은 POST + `csrf_token` 폼으로 만드는 것이 원칙이다.

## 로그인한 사용자 화면

템플릿에서는 `user` 변수로 현재 사용자를 쓸 수 있다. 로그인 전에는 `AnonymousUser`, 후에는 `CustomUser` 객체다. 레이아웃의 메뉴바가 로그인 여부로 메뉴를 나눈다.

```html
{# 로그인 관련 체크: user란 현재 사용자 정보 (login 전에는 Annoymous_user 후에는 user=model객체)#}
{# 메뉴바 추가 #}
<!--
    로그인과 상관없는 메뉴: 설문목록
    로그인한 사용자 메뉴: 설문등록, 자기정보조회/수정, 로그아웃, 탈퇴
    로그인 안한 사용자메뉴 : 가입, 로그인
-->
...
    {% if user.is_authenticated %}
    <a href="{% url 'polls:vote_list' %}" class="nav-link fw-bold">설문목록</a>
    <a href="{% url 'polls:vote_create' %}" class="nav-link fw-bold">설문등록</a>
    <a href="{% url 'account:detail' %}" class="nav-link fw-bold">내정보</a>
    <a href="{% url 'account:logout' %}" class="nav-link fw-bold">로그아웃</a>
    {% endif %}
    {% if not user.is_authenticated %}
    <a href="{% url 'account:create' %}" class="nav-link fw-bold">가입</a>
    <a href="{% url 'account:login' %}" class="nav-link fw-bold">로그인</a>
    {% endif %}
```

주석에는 "로그인과 상관없는 메뉴: 설문목록"인데 코드에서는 설문목록이 로그인 블록 안에 있다. `vote_list` View에는 `@login_required`가 없어서 주소를 치면 누구나 볼 수 있으니, 메뉴만 숨겨진 상태다. 주석과 코드 중 하나로 맞춘다.

`if` / `if not`을 두 번 쓰는 대신 `{% if %} ... {% else %} ... {% endif %}` 한 번이면 된다.

### 내 정보

```python
@login_required
def detail(request):
    # get_user(request): 로그인한 유저정보를 반환, (model) template: [request.]user 변수
    user = get_user(request)
    print(type(user), user)
    return render(request, "account/detail.html", {"user": user})
```

직접 실행(생일을 입력하지 않은 사용자의 내 정보 화면):

```text
<class 'account.models.CustomUser'> 3. kim-김철수
detail: 200
 아이디 kim 이름 김철수 이메일 생일 None 가입일 2026년 10월 8일 5:54 오후 마지막 로그인 2026년 10월 8일 5:54 오후 
```

![내 정보 화면](/images/django/fig-django-detail.png)


생일 칸에 `None`이 그대로 찍혔다. `null=True`인 필드는 템플릿에서 `{{ user.birthday|default:"-" }}`처럼 기본값 필터를 쓴다. (`user`는 템플릿에 이미 있어서 context로 넘기지 않아도 된다.)

## 정보 수정·비밀번호 변경·탈퇴

```python
@login_required
def update(request):

    if request.method == "GET":
        # 수정폼 생성: 수정할 model 객체를 전달 화면에 기존 데이터가 입력 폼에 나오도록 한다.
        form = CustomUserChangeForm(instance=get_user(request))
        return render(request, "account/update.html", {"form": form})
    
    elif request.method == "POST":
        # 요청파라미터 조회+검증
        form = CustomUserChangeForm(request.POST, request.FILES, instance=get_user(request))
        if form.is_valid():
            user = form.save()  # 업데이트된 모델을 반환
            # session(로그인 된 사용자의 상태값)에 저장된 User Model을 Update된 model로 변경
            update_session_auth_hash(request, user)
            return redirect(reverse('account:detail'))
        else:
            return render(request, "account/update.html", {"form": form})
```

ModelForm에 `instance=`를 주면 GET에서는 기존 값이 채워진 폼, POST에서는 `save()`가 UPDATE가 된다. 4편에서 말한 ModelForm의 장점이 여기서 드러난다.

```python
@login_required
def password_change(request):
    if request.method == "GET":
        form = PasswordChangeForm(user=get_user(request))
        return render(request, "account/password_change.html", {"form": form})
    
    elif request.method == "POST":
        form = PasswordChangeForm(user=get_user(request), data=request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # 로그아웃 방지
            return redirect(reverse('account:detail'))
        else:
            return render(request, "account/password_change.html", {"form": form})
```

직접 실행:

```text
== 정보수정 302 /account/detail 홍길순
== 비번변경 302 /account/detail | 로그인 유지: True
```

`update_session_auth_hash`의 역할은 비밀번호 변경 쪽 주석("로그아웃 방지")이 정확하다. 세션에는 비밀번호 해시에서 만든 값(`_auth_user_hash`)이 들어 있어서, 비밀번호가 바뀌면 기존 세션이 모두 무효가 된다. 다른 기기에 로그인된 세션을 끊는 보안 장치다. 이 함수는 **지금 이 세션만** 새 해시로 갱신해 로그인을 유지한다. 이름·이메일만 바꾸는 `update`에서는 해시가 바뀌지 않으니 호출하지 않아도 된다.

탈퇴는 강사님 코드와 구조가 다르다. 강사님 코드는 탈퇴 링크(GET)를 누르면 바로 삭제한다.

```python
# 강사님 파일
def user_delete(request):
    # 로그인한 사용자의 정보를 DB에서 delete -> logout 처리 -> 응답
    user = get_user(request) # Model객체
    user.delete()
    #로그아웃
    logout(request)
    # 응답
    return redirect(reverse("polls:polls_welcome"))
```

내 코드는 확인 화면(GET)과 실제 삭제(POST)를 나눴다.

```python
##################################################
# 7. 사용자 탈퇴
# 요청 URL: /account/delete
# 응답: GET - 탈퇴 페이지 (account/delete.html)
#       POST - redireact (polls:polls_welcome)
##################################################

@login_required
def delete(request):
    if request.method == "GET":
        return render(request, "account/delete.html")
    
    elif request.method == "POST":
        user = get_user(request) # model 객체 => 로그아웃처리가 되지않으면 ram에는 정보가 남아있음.
        user.delete()     # DB에서 삭제
        logout(request)   # 로그아웃 먼저
        return redirect(reverse('polls:polls_welcome'))
```

```text
== 탈퇴 302 /polls/welcome | 남은 hong: 0 | 세션 로그인: False
```

GET은 확인 화면, POST(+csrf)가 실제 삭제라서 링크 한 번으로 계정이 지워지지 않는다. 위 로그아웃에서 본 GET 요청의 문제를 탈퇴에서는 피한 것이다. (내 정보 화면의 탈퇴 링크에도 `onclick="return confirm(...)"`이 달려 있어서, 확인 창 → 확인 화면으로 두 번 묻는다. 둘 중 하나면 충분하다.)

> **보충**: 탈퇴를 실제 삭제로 처리하면 그 사용자가 쓴 글·투표 기록을 어떻게 할지(`on_delete`)를 같이 정해야 한다. 강의 자료의 `is_active`("탈퇴시 False")처럼 **비활성화**로 처리하면 기록은 남기고 로그인만 막는다.

## 정리

| 기능 | 핵심 코드 |
|---|---|
| 사용자 모델 확장 | `class CustomUser(AbstractUser)` + `AUTH_USER_MODEL` |
| 관리자 화면 | `UserAdmin` 상속, `fieldsets`·`add_fieldsets` |
| 가입 | `UserCreationForm` 상속 → `form.save()` |
| 로그인 | `authenticate()` → `login()` (또는 `AuthenticationForm`) |
| 로그아웃 | `logout()` (POST로) |
| 로그인 필수 | `@login_required` + `LOGIN_URL` |
| 원래 페이지로 | `?next=` + `url_has_allowed_host_and_scheme` 확인 |
| 템플릿 | `user.is_authenticated`, `user.name` |
| 수정 | `ModelForm(instance=user)` |
| 비밀번호 변경 | `PasswordChangeForm` + `update_session_auth_hash` |

- 브라우저에는 세션 ID만, 누가 로그인했는지는 서버에 있다.
- 사용자가 고칠 수 있는 값(`next`, GET 링크)은 공격 경로가 될 수 있다.

다음 글에서는 정적 파일을 정리하고, LLM 답변을 실시간으로 흘려보내는 채팅 앱을 만든다.
