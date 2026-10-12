---
title: "페이징: Paginator로 목록 나누기"
description: "Paginator와 Page 객체로 데이터를 페이지 단위로 나누고, 이전·다음 페이지 확인과 페이지 그룹(1~10, 11~20) 계산을 노트북으로 익힌 뒤, 설문 목록 View와 템플릿에 페이지 번호 링크를 붙입니다. 잘못된 page 값에서 생기는 500 에러와 get_page까지 실제 요청 결과로 정리합니다."
category: 'Tech'
subcategory: 'Django'
series: 'Django'
seriesOrder: 5
originalNotebook: "13_django/mypoll (Painging_exam.ipynb, polls/views.py vote_list)"
tags: ["Django"]
date: 2026-07-30T10:00:00+09:00
thumbnail: '../../../assets/images/notes/django/django-pagination.webp'
---

> SKN31 Django 수업의 `Painging_exam.ipynb`와 설문 목록 View(`vote_list`)를 바탕으로 정리했습니다.
> 노트북 출력은 **내 노트북의 실행 결과**이고, 출력이 없는 셀은 강사님 노트북의 실행 결과 또는 **직접 실행**한 결과로 표시했습니다. 목록 화면은 질문 402개를 넣은 프로젝트 사본에 요청해 직접 실행했습니다(Django 5.2.18, 수업은 6.0.7).

## 이 글에서 다루는 것

- `Paginator`와 `Page` 객체
- 이전·다음 페이지 확인
- 페이지 그룹(1~10, 11~20) 계산
- 설문 목록 View와 템플릿에 적용
- 잘못된 `page` 값 처리

[지난 글](/notes/django/django-form-formset)까지 설문을 등록할 수 있게 됐다. 설문이 수백 개가 되면 목록 한 화면에 다 띄울 수 없다.

## Paginator와 Page

수업 노트의 정리다.

```text
# 페이징 처리
-  대량의 데이터를 여러 페이지로 나눠서 출력하는 것.
-  Django에서는 Paginator와 Page 클래스를 통해 처리한다.
  
## Paginator 클래스
- 전체 페이징 처리를 관리하는 클래스
- 전체 데이터관련 정보, 각 페이지당 보여줄 데이터의 정보 등을 제공

## Page 클래스
- 한페이지에대한 데이터를 관리
- Paginator를 통해서 생성.
    - `Pagenator객체.page(페이지 번호)`
- iterable 타입. 페이지에 속한 데이터들을 제공
- Page객체.object_list 속성: 페이지가 가진 데이터들을 List로 반환
```

연습 데이터는 내 이름 세 글자를 앞에 붙인 문자 65개다.

```python
from django.core.paginator import Paginator

data_list = list("유진영0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
print(len(data_list))
data_list[:5]
```

```text
65

['유', '진', '영', '0', '1']
```

```python
# Paginator 객체 생성
pn = Paginator(data_list, 5) # 전체데이터, 몇페이지씩 나눠서 보여줄지.
# 전체데이터(iterable): QuerySet -lazy loading (실제 값을 사용할 때 DB에 조회해온다.)
# 한번에 모든 데이터를 읽는 것이 아니라 페이지에서 보여주기 위해 필요한 데이터만 그때 그때 읽어온다.
```

```python
print("전체 데이터개수:", pn.count)
print("총 페이지수:", pn.num_pages)
print("시작페이지번호 ~ 끝페이지번호의 범위:", pn.page_range)
```

```text
전체 데이터개수: 65
총 페이지수: 13
시작페이지번호 ~ 끝페이지번호의 범위: range(1, 14)
```

`Paginator(전체, 페이지당 개수)`의 두 번째 인자는 주석의 "몇 페이지씩"이 아니라 **한 페이지에 몇 개씩**이다. 65개를 5개씩 → 13페이지.

주석의 lazy loading이 Paginator를 QuerySet과 쓰는 이유다. QuerySet을 넘기면 Paginator는 `COUNT` 한 번과 **해당 페이지 범위만 `LIMIT/OFFSET`으로** 조회한다. 40만 건이어도 한 페이지에 10건만 읽는다.

| 속성·메서드 | 의미 |
|---|---|
| `pn.count` | 전체 데이터 개수 |
| `pn.num_pages` | 총 페이지 수 |
| `pn.page_range` | `range(1, 총페이지+1)` |
| `pn.page(n)` | n페이지의 `Page` 객체 |

```python
# 특정 Page 객체를 생성
page1 = pn.page(1) # 페이지 번호를 제공
page1
```

```text
<Page 1 of 13>
```

`Page`는 그 페이지의 데이터를 for 문으로 돌 수 있고, 인덱싱도 된다.

```python
for data in page1:
    print(data, end=', ')

# DB에서 조회할 땐, model 객체가 나옴.
```

```text
유, 진, 영, 0, 1, 
```

```python
for data in page13:
    print(data, end=', ')
```

```text
Y, Z, 
```

(강사님 노트북의 실행 결과) 마지막 페이지는 남은 2개만 갖는다.

없는 페이지를 요청하면 `EmptyPage` 예외다.

```python
# 없는 페이지 조회 - EmptyPage 에러 발생
try:
    pn.page(100)
    print("페이지 확인완료")
except:
    print("없는 페이지입니다.")
```

```text
없는 페이지입니다.
```

## 이전·다음 페이지

```python
# 시작 페이지(첫번째) => 페이지가 있는지 없는지, bool형 값으로 줌
print(page1.has_previous())  # 이전 페이지
print(page1.has_next())     # 다음 페이지
```

```text
False
True
```

```python
# 이전페이지번호
print("이전 페이지 번호:", page10.previous_page_number())
print("현재 페이지 번호:", page10.number)
print("다음 페이지 번호:", page10.next_page_number())
```

```text
이전 페이지 번호: 9
현재 페이지 번호: 10
다음 페이지 번호: 11
```

이전·다음이 없는데 번호를 물으면 예외다. 내 노트북에는 이 두 셀의 출력이 남지 않아 직접 실행했다. 아래 셀은 에러가 나는 것이 정상이다.

```python
page13.next_page_number() # 다음 페이지가 없는 경우 => EmptyPage 에러
page1.previous_page_number() # 이전 페이지가 없는 경우 => EmptyPage 에러
```

```text
pn.page(13).next_page_number() → EmptyPage: 해당 페이지에 결과가 없습니다.
pn.page(1).previous_page_number() → EmptyPage: 페이지 번호가 1보다 작습니다.
```

그래서 템플릿에서는 항상 `has_previous`/`has_next`로 먼저 확인하고 번호를 꺼낸다.

```python
if page1.has_previous():
    print("이전:",page1.previous_page_number())

if page1.has_next():
    print("다음:", page1.next_page_number())    
```

```text
다음: 2
```

| 메서드 | 1페이지 | 중간(10) | 마지막(13) |
|---|---|---|---|
| `has_previous()` | False | True | True |
| `has_next()` | True | True | False |

## 페이지 그룹 계산

페이지가 41개면 번호 41개를 다 늘어놓을 수 없다. 10개씩 묶어 현재 페이지가 속한 그룹(1~10, 11~20 ...)만 보여 준다. `page_range`가 `range`라서 슬라이싱으로 자를 수 있다.

```python
range(1,43)[0:10]
range(1,43)[10:20]

# indexing 번호를 뽑아주는 건 없음. 이건 Page계산을 해야함
```

```text
range(11, 21)
```

Django가 그룹 계산은 해 주지 않으니 직접 계산한다. 그룹당 3페이지로 먼저 규칙을 확인했다.

```python
# page group당 3개 페이지씩 묶는 경우

print(list(r[0:3]))  # 현재 page: 1 or 2 or 3 일 경우 그 페이지가 속한 페이지들의 index 조회
print(list(r[3:6]))  # 현재 page: 4 or 5 or 6 일 경우 그 페이지가 속한 페이지들의 index 조회
print(list(r[6:9]))  # 현재 page: 7 or 8 or 9 일 경우 그 페이지가 속한 페이지들의 index 조회
```

```text
[1, 2, 3]
[4, 5, 6]
[7, 8, 9]
```

일반화한 식이다.

```python
current_page = 6
page_group_count = 10 # 페이지 그룹당 페이지 수

start_index = int((current_page - 1)/page_group_count) * page_group_count
end_index = start_index + page_group_count

r = pn.page_range
pg = r[start_index:end_index]
list(pg)
```

```text
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

`(현재 페이지 - 1) // 그룹 크기`가 몇 번째 그룹인지(0부터)이고, 거기에 그룹 크기를 곱하면 시작 인덱스다. 6페이지는 0번 그룹 → 인덱스 0~10 → 1~10페이지. 15페이지라면 1번 그룹 → 11~20페이지다. 마지막 그룹은 슬라이싱이 알아서 끝에서 멈춘다(`range(1,14)[10:20]` → 11~13).

> **보충**: `int(a / b)`는 `a // b`와 같다(양수일 때). 정수 나눗셈 연산자를 쓰면 소수 변환을 거치지 않는다.

### 더미 데이터 402개

```python
# Question 402개 추가.
for i in range(1, 403):
    post = Question(question_text=f"질문 - {i}")
    post.save()
```

```python
# 첫번째 데이터의 primary key (id) 조회
start_id = Question.objects.all()[0].pk
start_id
```

```text
8
```

```python
# 각 문제당 보기 4개씩추가.
import random

for i in range(start_id, cnt + start_id):

    # 개별 문제당 Choice 4개를 생성해서 save()
    for j in range(4):
        c = Choice(
            choice_text=f"{j}번 보기입니다.",
            vote=random.randint(1, 100),
            question=Question(pk=i),
        )
        c.save()
```

```text
402
1608
```

앞에서 지운 질문들 때문에 PK가 8부터 시작해서, `range(start_id, cnt + start_id)`로 PK를 계산해 보기를 붙였다. PK가 중간에 비어 있으면(누군가 질문을 지웠다면) 이 계산은 없는 PK에 보기를 붙이려다 실패한다. `for q in Question.objects.all():`로 실제 객체를 돌면 PK를 계산할 필요가 없다.

> **보충**: 1,608번의 `save()`는 INSERT 1,608번이다. `Choice.objects.bulk_create([...])`는 한 번(또는 몇 번)의 INSERT로 넣는다.

## 설문 목록에 적용

요청은 `/polls/list?page=번호`(쿼리 스트링)이고, 생략하면 1페이지다. View 위에 context로 넘길 값을 먼저 정리해 두었다.

```python
######################################
# vote_list: Paging 처리.ver
#
# context value:
## 1. 현재 페이지의 데이터: Page 객체: question_list
## 2. 현재 페이지가 속한 페이지 그룹의 시작/종료 page 번호: page_range
## 3. 페이지 그룹의 시작페이지가 이전페이지가 있는지 여부와 이전페이지 번호: has_previous. previous_page_number
## 4. 페이지 그룹의 마지막페이지가 이전페이지가 있는지 여부와 다음페이지 번호: has_next, next_page_number
## 5. 요청 URL: polls/list?page=페이지번호 (page가 생략되면 첫번째 페이지를 출력)
#######################################

def vote_list(request):
    """
    vote_list paging.ver
    """
    pagenate_by=10  # 한 페이지에 보여줄 데이터의 개수
    page_group_count=10 # 한 페이지그룹에 속한 페이지 개수

    current_page = int(request.GET.get("page")or 1)# 현재 응답할 페이지 // 문자열 반환이기 때문에 int 값으로 변환

    # DB 조회
    q_list = Question.objects.all().order_by("-pk")

    # paginator생성
    pn = Paginator(q_list, pagenate_by)

    # index 값 생성
    start_index = int((current_page-1)/page_group_count) * page_group_count
    end_index = start_index + page_group_count

    page_range = pn.page_range[start_index : end_index]

    # 현재 페이지의 데이터들
    question_list = pn.page(current_page)

    context_value = {
        "page_range": page_range,
        "question_list": question_list, 
    }
    
    # 페이지 그룹의 시작페이지가 이전페이지가 있는지 여부, 만약 있다면 이전페이지 번호를 조회
    # 페이지 그룹의 마지막페이지가 다음페이지가 있는지 여부, 만약 있다면 다음페이지 번호를 조회
    start_page = pn.page(page_range[0])
    end_page = pn.page(page_range[-1])

    if start_page.has_previous():
        context_value['has_previous'] = True
        context_value['previous_page_number'] = start_index - page_group_count + 1
    else:
        context_value['has_previous'] = True  # 첫 그룹도 활성화
        context_value['previous_page_number'] = 1  # 1로 이동

    if end_page.has_next():
        context_value['has_next'] = True
        context_value['next_page_number'] = end_index + 1

    return render(request, "polls/vote_list.html", context_value)
```

- `order_by("-pk")`: 최신 질문이 1페이지에 오도록 PK 내림차순.
- 그룹의 **첫 페이지에 이전이 있으면** 이전 그룹이 있다는 뜻이고, 그룹의 **마지막 페이지에 다음이 있으면** 다음 그룹이 있다.
- 이전 그룹 버튼은 이전 그룹의 첫 페이지(`start_index - 그룹크기 + 1`)로, 다음 그룹 버튼은 다음 그룹의 첫 페이지(`end_index + 1`)로 보낸다.

강사님 코드와 다른 부분이 두 곳이다.

```python
# 강사님 파일
current_page = int(request.GET.get("page", 1))# 현재 응답할 페이지
...
if start_page.has_previous():
    context_value['has_previous'] = True
    context_value['previous_page_number'] = start_page.previous_page_number()
```

- **`get("page", 1)` vs `get("page") or 1`**: `?page=`(값 없음)로 요청하면 앞쪽은 `""`를 받아 `int("")`에서 에러가 나고, 뒤쪽은 `""`이 falsy라 1이 된다. 내 쪽이 하나 더 안전하다.
- **이전 그룹 번호**: 강사님 코드는 그룹 첫 페이지의 바로 앞 페이지(11 → 10, 이전 그룹의 **마지막**)로, 내 코드는 이전 그룹의 **첫** 페이지(11 → 1)로 보낸다. 둘 다 이전 그룹으로 가는 것은 같고, 도착 페이지가 다르다.
- **첫 그룹에서도 « 활성화**: `else`에서도 `has_previous = True`, 번호 1로 두었다. 첫 그룹에서 «를 누르면 1페이지로 간다. "처음으로" 버튼 역할을 겸하게 한 것이다.

템플릿은 버튼을 네 종류로 나눴다. «·»는 그룹 이동, 이전·다음은 한 페이지 이동이다.

```html
<!-- 페이징 처리 페이지 번호 링크 -->
<ul class="pagination mt-3">

    {# 그룹 이전 #}
    {% if has_previous %}
        <li class="page-item">
            <a class="page-link" href="?page={{ previous_page_number }}">&laquo;</a>
        </li>
    {% else %}
        <li class="page-item">
            <span class="page-link">&laquo;</span>
        </li>
    {% endif %}

    {# 이전페이지 그룹으로 이동#}
    {% if question_list.has_previous%}
        <li class="page-item"> 
            <a href="{% url 'polls:vote_list' %}?page={{question_list.previous_page_number}}" class="page-link">
            이전
            </a>
            
        </li>
    {% else%}
        <li class="page-item disabled">
            <span class="page-link">이전</span>
        </li>
    {% endif %}
    
    {# 현재페이지 그룹의 페이지들 링크#}
    
    {% for page_num in page_range %}
        <li class="page-item {% if page_num == question_list.number %}active{% endif %}">
            <a class="page-link" href="?page={{ page_num }}">{{ page_num }}</a>
        </li>
    {% endfor %}

    {# 다음페이지 그룹으로 이동#}
    {% if question_list.has_next %}
        <li class="page-item">
            <a class="page-link" href="{% url 'polls:vote_list' %}?page={{ question_list.next_page_number }}">다음</a>
        </li>
    {% else %}
        <li class="page-item disabled">
            <span class="page-link">다음</span>
        </li>
    {% endif %}

    {# 그룹 다음 #}
    ...
</ul>
```

`question_list`가 `Page` 객체라서 템플릿에서 `question_list.has_previous`, `question_list.number`를 바로 쓴다. 템플릿에서는 메서드도 괄호 없이 부른다. (주석 `이전페이지 그룹으로 이동`·`다음페이지 그룹으로 이동`은 실제로는 **한 페이지** 이동 버튼 위에 붙어 있다. 버튼을 «·»로 나누면서 주석은 그대로 남은 것이다.)

직접 실행(질문 402개, 페이지당 10개 → 41페이지. 화면의 버튼 상태와 «·이전·다음·»의 이동 대상):

```text
/polls/list         « 이전[disabled] 1[active] 2 3 4 5 6 7 8 9 10 다음 »  | 목록 첫 글 pk=406, 10개
/polls/list?page=10 « 이전 1 2 3 4 5 6 7 8 9 10[active] 다음 »  | 목록 첫 글 pk=316, 10개
/polls/list?page=11 « 이전 11[active] 12 13 14 15 16 17 18 19 20 다음 »  | 목록 첫 글 pk=306, 10개
/polls/list?page=41 « 이전 41[active] 다음[disabled] »[disabled]  | 목록 첫 글 pk=6, 2개

?page=1  ['«→?page=1', '다음→/polls/list?page=2', '»→?page=11']
?page=11 ['«→?page=1', '이전→/polls/list?page=10', '다음→/polls/list?page=12', '»→?page=21']
?page=41 ['«→?page=31', '이전→/polls/list?page=40']
```

화면으로 보면 이렇다(질문 27개, 3페이지 기준).

![설문 목록 1페이지](/images/django/fig-django-list.png)

![설문 목록 마지막 페이지](/images/django/fig-django-list-p3.png)


그룹 계산과 버튼이 의도대로 동작한다. 마지막 41페이지는 그룹에 41 하나만 있고 2개만 나온다.

## 잘못된 page 값

주소창의 `page`는 사용자가 아무 값이나 넣을 수 있다.

직접 실행:

```text
/polls/list?page=0   500
/polls/list?page=999 500
/polls/list?page=abc 500

page=999 → EmptyPage: 해당 페이지에 결과가 없습니다.
page=abc → ValueError: invalid literal for int() with base 10: 'abc'
page=0   → EmptyPage: 페이지 번호가 1보다 작습니다.
```

셋 다 서버 에러(500)다. `int()` 변환과 `pn.page()`가 예외를 그대로 던지기 때문이다. Django는 이런 경우를 위해 `get_page()`를 준다.

직접 실행(위 65글자 Paginator):

```text
pn.page(100)       → EmptyPage: 해당 페이지에 결과가 없습니다.
pn.get_page(100)   → <Page 13 of 13>
pn.get_page('abc') → <Page 1 of 13>
pn.get_page(0)     → <Page 13 of 13>
```

`get_page()`는 숫자가 아니면 1페이지, 범위를 벗어나면 마지막 페이지를 돌려준다. View의 앞부분을 이렇게 바꾸면 된다.

```python
pn = Paginator(q_list, pagenate_by)
question_list = pn.get_page(request.GET.get("page"))   # 잘못된 값도 안전
current_page = question_list.number                     # 보정된 실제 페이지 번호로 그룹 계산
```

> **보충**: 0이 마지막 페이지로 가는 것은 `get_page()`가 "범위 밖 정수"를 모두 마지막 페이지로 처리하기 때문이다. 1 미만은 1페이지로 보내고 싶다면 `max(1, ...)`로 먼저 보정한다.

## 정리

| 대상 | 코드 | 비고 |
|---|---|---|
| 페이지 나누기 | `Paginator(QuerySet, 페이지당 개수)` | QuerySet이면 해당 범위만 조회 |
| 한 페이지 | `pn.page(n)` / `pn.get_page(값)` | `page`는 예외, `get_page`는 보정 |
| 이전·다음 | `has_previous()`, `previous_page_number()` | 확인 없이 번호를 부르면 `EmptyPage` |
| 현재 번호 | `page.number` | |
| 그룹 범위 | `pn.page_range[start:end]` | `start = (현재-1)//그룹 * 그룹` |
| 요청 | `?page=번호` | `request.GET.get("page")`는 문자열 |

- 목록은 **정렬을 먼저 정하고** 나눈다(`order_by("-pk")`). 순서가 없으면 페이지마다 결과가 섞일 수 있다.
- 사용자가 조작할 수 있는 값(`page`)은 항상 잘못 들어올 수 있다.

다음 글에서는 회원 가입·로그인을 붙이고, 로그인한 사용자만 설문을 등록하게 만든다.
