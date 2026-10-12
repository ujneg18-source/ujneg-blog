---
title: "테스트 케이스와 시스템 구성도 작성법"
description: "단위·통합·인수 테스트와 좋은 테스트의 조건, 테스트 케이스의 항목(ID·입력·전제 조건·기대 결과·실제 결과)을 정리하고, 설문 프로젝트의 테스트 케이스 19개를 실제로 실행해 Pass/Fail을 채웁니다. Django TestCase로 자동화한 결과와, 3-tier 구조와 AWS 배포를 담은 시스템 구성도 작성법까지 다룹니다."
category: 'Tech'
subcategory: 'SW Engineering'
series: '소프트웨어 공학'
seriesOrder: 4
originalNotebook: "15_sw_engineering (5-1.테스트설계.md, 5-2.테스트설계_예시.md, 6.시스템아키텍처.md)"
tags: ["SW Engineering"]
date: 2026-08-08T10:00:00+09:00
thumbnail: '../../../assets/images/notes/swe/swe-test-architecture.webp'
---

> SKN31 소프트웨어 공학 수업 자료(`5-1.테스트설계.md`, `5-2.테스트설계_예시.md`, `6.시스템아키텍처.md`)를 바탕으로 정리했습니다.
> 설문 프로젝트의 테스트 케이스는 프로젝트 사본에 요청을 보내 **직접 실행**한 결과로 실제 결과와 Pass/Fail을 채웠습니다(Django 5.2.18, 수업은 6.0.7). 채팅(TC-18)은 OpenAI 대신 가짜 모델로 실행했습니다.

## 이 글에서 다루는 것

- 테스트의 목적과 종류
- 좋은 테스트의 조건
- 테스트 케이스 항목
- 설문 프로젝트 테스트 케이스와 실행 결과
- Django `TestCase`로 자동화
- 시스템 구성도

[1편](/notes/swe/swe-requirements)의 요구사항 명세서 오른쪽 칸에 `TC-01~19`를 적어 두었다. 이번 글에서 그 테스트들을 실제로 만들고 돌린다.

## 테스트 설계

테스트의 목적은 결함을 찾아 고치고, 소프트웨어가 **요구사항을 만족하며 사용자가 믿을 수 있게 동작하는지** 확인하는 것이다.

| 종류 | 범위 | 예 |
|---|---|---|
| 단위 테스트 | 함수·모듈 하나 | `clean_question_text`가 4글자를 거부하는가 |
| 통합 테스트 | 여러 모듈의 결합 | 폼 제출 → View → DB 저장 → redirect |
| 인수 테스트 | 최종 사용자 요구 충족 | 회원이 설문을 등록하고 목록에서 확인할 수 있는가 |

| 좋은 테스트의 조건 | 의미 |
|---|---|
| 완전성 | 모든 요구사항을 커버 |
| 반복 가능성 | 몇 번을 돌려도 같은 결과 |
| 독립성 | 다른 테스트의 결과·순서에 의존하지 않음 |
| 재사용성 | 다시 쓸 수 있게 설계 |

반복 가능성과 독립성은 [Django 2편](/notes/django/django-model-orm)에서 이미 봤다. 노트북에서 INSERT 셀을 두 번 실행해 보기가 36개가 된 것이 "실행 순서와 횟수에 따라 결과가 달라지는" 상태다. 테스트는 매번 같은 초기 상태에서 시작해야 한다.

### 테스트 케이스 항목

| 항목 | 내용 |
|---|---|
| ID | 고유 식별자(`TC-01`) |
| 이름 | 목적이 드러나는 짧은 이름 |
| 입력 데이터 | 실행할 때 넣는 값 |
| 전제 조건 | 실행 전에 만족해야 할 상태 |
| 기대 결과 | 입력에 따라 나와야 하는 결과 |
| 실제 결과 | 실행해서 관측한 결과 |
| Pass 여부 | 기대 = 실제이면 Pass |

강의 예시(사용자 인증)의 일부다.

| ID | 이름 | 입력 데이터 | 전제 조건 | 기대 결과 |
|---|---|---|---|---|
| TC02 | 잘못된 비밀번호 | ID: user1, PW: wrongpass | 계정 활성화 | "비밀번호가 틀렸습니다" |
| TC05 | 비활성화 계정 | ID: user2, PW: pass5678 | 계정 비활성화 | "계정이 비활성화 상태입니다" |
| TC10 | 5회 실패 후 잠금 | ID: user1, PW: wrongpass | 5회 연속 실패 | "계정이 잠겼습니다" |

정상 입력보다 **잘못된 입력, 경계값, 상태 조건**이 많다는 점이 눈에 띈다. 결함은 대부분 그쪽에 있다.

> **보충**: 강의의 계산기 예시에는 기대 결과 "5", 실제 결과 "5"처럼 **모든 케이스가 Pass**로 채워져 있다. 실제 결과 칸은 실행하기 전에는 비워 둬야 하는 칸이다. 설계 단계의 테스트 케이스와 실행 후의 테스트 결과서를 구분하는 이유다.

## 설문 프로젝트 테스트 케이스

[2편](/notes/swe/swe-usecase)의 유즈케이스 예외 흐름을 그대로 테스트 케이스로 옮겼다. 실제 결과는 Django 시리즈를 쓰며 실행한 결과다.

| ID | 이름 | 입력 데이터 | 전제 조건 | 기대 결과 | 실제 결과 | Pass |
|---|---|---|---|---|---|---|
| TC-01 | 목록 첫 페이지 | `/polls/list` | 질문 402개 | 최신 10개, 1~10 페이지 링크 | 같음 | Pass |
| TC-02 | 목록 마지막 페이지 | `?page=41` | 질문 402개 | 2개, 다음·» 비활성 | 같음 | Pass |
| TC-03 | 잘못된 페이지 값 | `?page=abc` | - | 1페이지 표시 | **500**(`ValueError`) | **Fail** |
| TC-04 | 정상 투표 | 보기 선택 후 투표 | 처음 투표 | 득표 +1, 결과 화면 이동 | 같음 | Pass |
| TC-05 | 보기 미선택 투표 | 선택 없이 투표 | - | "보기를 선택해주세요." | 같음 | Pass |
| TC-06 | 없는 설문 | `/polls/vote_form/999` | - | 404 | 오류 화면, 상태 **200** | **Fail** |
| TC-07 | 재투표 | 같은 설문에 두 번째 투표 | 첫 투표 완료 | "이미 투표한 질문입니다.", 득표 그대로 | 같음 | Pass |
| TC-08 | 결과 조회 | `/polls/vote_result/1` | 투표 1회 | 보기별 득표 표시 | 같음 | Pass |
| TC-09 | 비로그인 등록 | `/polls/vote_create` | 로그아웃 | 로그인 화면(`next` 포함) | 같음 | Pass |
| TC-10 | 짧은 질문 | 질문 "짧은질" | 로그인 | "질문은 5글자 이상 입력하세요." | 같음 | Pass |
| TC-11 | 빈 보기 | 보기 "봄", "" | 로그인 | 오류 메시지, 저장 안 됨 | **500**(`KeyError`) | **Fail** |
| TC-12 | 보기 추가 | "보기 추가" 후 3개 입력 | 로그인 | 보기 3개 저장 | **2개만 저장** | **Fail** |
| TC-13 | 짧은 이름 가입 | 이름 "홍" | - | "이름은 두 글자 이상 입력하세요." | 같음 | Pass |
| TC-14 | 비밀번호 불일치 | 비밀번호 확인 다르게 | - | "비밀번호가 일치하지 않습니다." | 같음 | Pass |
| TC-15 | 로그인 실패 | 틀린 비밀번호 | 가입 완료 | 오류 메시지, 아이디 유지 | 메시지 O, **아이디 지워짐** | **Fail** |
| TC-16 | 로그인 후 원래 페이지 | `?next=/account/detail` | 가입 완료 | `/account/detail`로 이동 | 같음 | Pass |
| TC-17 | 외부 next 차단 | `?next=https://evil.example.com/` | 가입 완료 | 외부로 이동하지 않음 | **외부로 이동** | **Fail** |
| TC-18 | 채팅 맥락 유지 | "안녕" → "내가 처음에 뭐라고 했지?" | 같은 브라우저 | 두 번째 요청에 첫 대화 포함 | 같음 | Pass |
| TC-19 | CSRF 없는 POST | 토큰 없이 투표 | - | 403 | 403 | Pass |

19개 중 **6개 Fail**이다. 모두 화면을 정상적으로 눌러서는 드러나지 않고, 입력을 비우거나 주소를 고치거나 예외 상황을 일부러 만들 때 드러났다. 기능을 만들면서 확인한 것은 TC-04처럼 "되는 경로"였기 때문이다.

Fail을 요구사항 명세서와 연결하면 이렇다.

| Fail | 요구사항 | 원인(어디서 다뤘나) |
|---|---|---|
| TC-03 | REQ-001 | `int()` 변환 예외 → `get_page()` ([Django 5편](/notes/django/django-pagination)) |
| TC-06 | REQ-002 | `try/except`로 에러 화면만 render ([Django 3편](/notes/django/django-polls-views)) |
| TC-11, 12 | REQ-005 | FormSet 빈 폼, JS 이름·`TOTAL_FORMS` ([Django 4편](/notes/django/django-form-formset)) |
| TC-15, 17 | REQ-007 | 빈 폼 반환, `next` 미검증 ([Django 6편](/notes/django/django-auth)) |

이것이 1편에서 말한 **요구사항 추적**이다. Fail 하나가 어느 요구사항을 깨는지 바로 찾을 수 있다.

## Django TestCase로 자동화

표의 테스트를 손으로 매번 하기는 어렵다. Django는 테스트용 클라이언트와 **테스트 전용 DB**를 제공한다. 몇 개를 코드로 옮겼다.

```python
from django.test import TestCase
from django.urls import reverse
from polls.models import Question, Choice


class VoteTests(TestCase):
    def setUp(self):
        self.q = Question.objects.create(question_text="좋아하는 색은 무엇입니까?")
        self.blue = Choice.objects.create(choice_text="파랑색", question=self.q)
        self.black = Choice.objects.create(choice_text="검정색", question=self.q)

    def test_tc04_vote(self):
        res = self.client.post(reverse("polls:vote"), {"question_id": self.q.pk, "choice": self.blue.pk})
        self.assertRedirects(res, reverse("polls:vote_result", args=[self.q.pk]))
        self.blue.refresh_from_db()
        self.assertEqual(self.blue.vote, 1)

    def test_tc06_unknown_question_404(self):
        res = self.client.get(reverse("polls:vote_form", args=[999]))
        self.assertEqual(res.status_code, 404)

    def test_tc07_vote_twice(self):
        url = reverse("polls:vote")
        self.client.post(url, {"question_id": self.q.pk, "choice": self.blue.pk})
        res = self.client.post(url, {"question_id": self.q.pk, "choice": self.blue.pk})
        self.assertContains(res, "이미 투표한 질문입니다.")
        self.blue.refresh_from_db()
        self.assertEqual(self.blue.vote, 1)

# ... TC-05, TC-11, TC-03, TC-16, TC-17도 같은 방식
```

- `setUp()`은 테스트 메서드마다 **새로** 실행된다. 테스트마다 빈 DB에서 시작하고 끝나면 롤백되므로 독립성·반복 가능성이 보장된다.
- `self.client`는 [Django 시리즈](/notes/django/django-getting-started)에서 출력을 얻을 때 쓴 그 테스트 클라이언트다. 쿠키도 유지해서 TC-07의 재투표를 재현한다.
- `assertRedirects`, `assertContains`가 "기대 결과" 칸을 코드로 쓴 것이다.

### 실행

처음 실행하자 테스트가 시작도 못 했다.

직접 실행(`python manage.py test polls.test_cases`, 아래 셀은 에러가 나는 것이 정상이다):

```text
Found 8 test(s).
...
django.core.exceptions.ImproperlyConfigured: Error loading MySQLdb module.
Did you install mysqlclient?
```

Django 테스트는 `DATABASES`에 등록된 **모든 DB**의 테스트용 사본을 만든다. 로컬 `settings.py`에 RDS용 `mysql` 항목이 함께 등록되어 있어서, MySQL 드라이버가 없는 환경에서는 테스트를 돌릴 수 없다. 테스트 전용 설정을 따로 두었다.

```python
# config/test_settings.py
from .settings import *
DATABASES = {"default": DATABASES["default"]}
```

직접 실행(`python manage.py test polls.test_cases --settings=config.test_settings`, 일부 생략):

```text
Creating test database for alias 'default'...
E.FE..F.
======================================================================
ERROR: test_tc11_empty_choice (polls.test_cases.CreateTests)
  File "mypoll/polls/views.py", line 398, in vote_create
    choice_list.append(c_form.cleaned_data['choice_text'])
KeyError: 'choice_text'
======================================================================
ERROR: test_tc03_invalid_page (polls.test_cases.PagingTests)
  File "mypoll/polls/views.py", line 104, in vote_list
    current_page = int(request.GET.get("page")or 1)# 현재 응답할 페이지 // 문자열 반환이기 때문에 int 값으로 변환
ValueError: invalid literal for int() with base 10: 'abc'
======================================================================
FAIL: test_tc17_next_external (polls.test_cases.LoginTests)
AssertionError: True is not false
======================================================================
FAIL: test_tc06_unknown_question_404 (polls.test_cases.VoteTests)
AssertionError: 200 != 404
----------------------------------------------------------------------
Ran 8 tests in 1.307s
```

`E.FE..F.`는 테스트 8개의 결과를 한 글자씩 찍은 것이다. `.`는 통과, `F`는 기대 결과와 다름(Fail), `E`는 테스트 도중 예외(Error)다. 손으로 채운 표의 Fail과 정확히 일치한다. 코드를 고친 뒤 이 명령 한 줄로 19개를 다시 확인할 수 있다는 것이 자동화의 의미다.

> **보충**: `startapp`이 만든 `tests.py`가 앱마다 비어 있는 채로 있다. Django가 테스트를 넣을 자리를 처음부터 만들어 주는 것이다. `test`로 시작하는 파일 안의 `test_`로 시작하는 메서드를 자동으로 찾아 실행한다.

## 시스템 구성도

시스템 구성도는 서버·DB·네트워크 같은 **구성 요소와 그 사이의 상호작용**을 한눈에 보이게 그린 다이어그램이다. 의존 관계, 데이터 흐름, 보안 경계를 파악하는 데 쓴다.

| 작성 순서 | 내용 |
|---|---|
| 목적·범위 | 누가(개발·운영·관리) 무엇을 보려고 쓰는지 정함 |
| 구성 요소 | 클라이언트, 웹 서버, 앱 서버, DB, 로드밸런서, 외부 API |
| 흐름 | HTTP인지, REST API인지, 메시지 큐인지 화살표와 라벨로 |
| 시각 규칙 | 네트워크 경계는 영역, 서버는 사각형, DB는 원통, 보안 계층은 별도 존 |

도구는 draw.io, Lucidchart, Visio 등이고, AWS를 쓰면 **AWS Architecture Icons**로 그리면 누구나 같은 의미로 읽는다.

기본 틀은 **3-tier** 구조다.

```text
[Tier 1: 프레젠테이션]   [Tier 2: 애플리케이션]   [Tier 3: 데이터]
   브라우저        ──HTTP──▶   웹·앱 서버   ──SQL──▶   데이터베이스
                  ◀─응답───               ◀─결과───
```

### 설문 프로젝트 구성도

[AWS 4편](/notes/aws/aws-django-deploy)에서 올린 배포 구성을 그렸다.

![NGINX와 Gunicorn 구성](/images/aws/fig-aws-nginx-gunicorn.png)

```text
                        ┌────────────── AWS 서울 리전 / VPC ───────────────────────────┐
                        │ ┌── public subnet ─────────────────┐  ┌── private subnet ──┐ │
 사용자 브라우저 ─HTTP:80─┼▶│ [보안그룹: 80, 22(내 IP)]          │  │                    │ │
                        │ │ EC2 (Ubuntu, t3.medium)           │  │  RDS MySQL         │ │
                        │ │  NGINX ─┬ /static, /media → 디스크 │  │  (단일 AZ)          │ │
                        │ │         └ unix socket             │  │                    │ │
                        │ │           ▶ Gunicorn(워커 3)      │  │                    │ │
                        │ │             ▶ Django ─────────────┼──┼▶ 3306              │ │
                        │ └──────────────┬────────────────────┘  └────────────────────┘ │
                        └────────────────┼─────────────────────────────────────────────┘
                                         └─HTTPS──▶ OpenAI API (채팅, 외부)
```

그려 보면 운영상 질문이 바로 나온다.

- **단일 장애점**: EC2 한 대, RDS 단일 AZ다. 어느 하나가 멈추면 서비스가 멈춘다. 학습용으로는 맞지만, 실서비스라면 이 그림에 로드밸런서와 다중 AZ가 추가된다.
- **HTTPS가 없다.** 사용자 ↔ NGINX 구간이 HTTP라서 로그인 비밀번호가 평문으로 오간다. 1편의 REQ-010(보안)이 "일부"인 또 하나의 이유다. 도메인을 연결하고 Let's Encrypt 인증서를 NGINX에 붙이는 것이 다음 단계다.
- **외부 의존**: 채팅은 OpenAI API에 의존한다. API 장애·지연 시 [Django 7편](/notes/django/django-sse-chat)의 `[ERROR]` 처리로 화면이 멈추지 않게 한 것이 이 화살표에 대한 대비다.

## 정리

| 개념 | 핵심 |
|---|---|
| 테스트 종류 | 단위 / 통합 / 인수 |
| 좋은 테스트 | 완전, 반복 가능, 독립, 재사용 |
| 테스트 케이스 | ID·이름·입력·전제 조건·기대 결과 → 실행 후 실제 결과·Pass |
| 케이스 출처 | 유즈케이스의 **예외 흐름**과 경계값 |
| 자동화 | Django `TestCase` + `self.client`, `python manage.py test` |
| 시스템 구성도 | 구성 요소·흐름·경계. 3-tier가 기본 |

- 만든 사람이 눌러 본 경로는 대부분 Pass다. Fail은 일부러 틀리게 넣은 입력에서 나온다.
- 요구사항 → 유즈케이스 → 테스트 케이스 → 코드가 ID로 이어져 있으면, 무엇이 왜 깨졌는지 바로 찾는다.

이것으로 소프트웨어 공학 시리즈를 마친다.
