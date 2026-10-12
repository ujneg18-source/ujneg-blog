---
title: "화면 설계와 테이블 정의서 작성법"
description: "서비스의 화면을 계층으로 정리하는 메뉴 구조도, 디자인 전에 뼈대를 잡는 와이어프레임(화면 설계서)과 기능 명세, ERD에 다 담지 못하는 컬럼·제약조건·인덱스를 정리하는 테이블 정의서를 다루고, 설문 프로젝트의 메뉴 구조도와 실제 DB에서 뽑은 테이블 정의서를 작성합니다."
category: 'Tech'
subcategory: 'SW Engineering'
series: '소프트웨어 공학'
seriesOrder: 3
originalNotebook: "15_sw_engineering (3-1.화면설계.md, 3-2.메뉴구조도예.md, 4.테이블정의서 예.md)"
tags: ["SW Engineering"]
date: 2026-08-07T10:00:00+09:00
thumbnail: '../../../assets/images/notes/swe/swe-screen-table.webp'
---

> SKN31 소프트웨어 공학 수업 자료(`3-1.화면설계.md`, `3-2.메뉴구조도예.md`, `4.테이블정의서 예.md`)와 테이블 정의서 파일에 남긴 메모를 바탕으로 정리했습니다.
> 설문 프로젝트의 테이블 정의서는 프로젝트의 마이그레이션을 `sqlmigrate`로 SQL로 뽑아 **직접 확인**한 내용으로 작성했습니다(SQLite 기준).

## 이 글에서 다루는 것

- 메뉴(정보) 구조도
- 화면 설계서(와이어프레임)와 기능 명세
- ERD와 테이블 정의서의 차이
- 테이블 정의서 항목
- 설문 프로젝트의 메뉴 구조도와 테이블 정의서

[지난 글](/notes/swe/swe-usecase)까지가 분석이었다. 이번 글은 설계다. 화면 쪽(메뉴 구조도 → 화면 설계서)과 데이터 쪽(ERD → 테이블 정의서)을 함께 본다.

## 메뉴 구조도

메뉴(정보) 구조도는 서비스의 화면과 메뉴를 **계층(depth)** 으로 정리한 표다. 화면 설계보다 먼저 만든다. 어떤 화면이 몇 개 있고 어디서 어디로 가는지가 정해져야 화면을 그릴 수 있기 때문이다. 레벨은 1~N단계로 정의하는데 보통 6단계 안으로 정한다.

강의 자료의 쇼핑몰 예시 일부다.

| 레벨 1 | 레벨 2 | 레벨 3 | 레벨 4 | 레벨 5 |
|---|---|---|---|---|
| 관리자 | 상품 관리 | 상품 등록 | - | - |
| | | 상품 목록 | 상품 상세 | 상품정보 수정 / 상품 삭제 |
| | 주문 관리 | 주문 목록 | 주문 상세 / 배송 상태 변경 | - |
| 사용자 | 상품 카테고리 | 의류 | 남성 의류 | 티셔츠 / 셔츠 |
| | 마이 페이지 | 회원 정보 | 정보 수정 / 비밀번호 변경 | - |
| | 고객 센터 | 1:1 문의 | 문의 작성 / 문의 내역 | 문의 상세 |

레벨 1을 **사용자 유형**(관리자·사용자)으로 나눈 것이 핵심이다. 같은 서비스라도 누가 쓰느냐에 따라 전혀 다른 메뉴 트리를 가진다.

### 설문 프로젝트의 메뉴 구조도

[Django 6편](/notes/django/django-auth)의 메뉴바와 `urls.py`를 보고 정리했다.

| 레벨 1 | 레벨 2 | 레벨 3 | URL |
|---|---|---|---|
| 공통 | 홈 | - | `/polls/welcome` |
| | 설문 목록 | 설문 폼(투표) → 투표 결과 | `/polls/list`, `/polls/vote_form/<id>`, `/polls/vote_result/<id>` |
| | AI 채팅 | - | `/chat/` |
| 비회원 | 가입 | - | `/account/create` |
| | 로그인 | - | `/account/login` |
| 회원 | 설문 등록 | - | `/polls/vote_create` |
| | 내 정보 | 정보 수정 / 비밀번호 변경 / 탈퇴 | `/account/detail`, `/update`, `/password_change`, `/delete` |
| | 로그아웃 | - | `/account/logout` |
| 관리자 | 관리자 화면 | 질문·보기·회원 관리 | `/admin/` |

표로 옮기니 두 가지가 보인다.

- **설문 목록의 위치**: 이 표에서는 "공통"이 맞다. `vote_list` View에 로그인 제한이 없기 때문이다. 그런데 실제 메뉴바는 설문 목록 링크를 로그인한 사용자에게만 보여 준다. 구조도를 먼저 정해 두었다면 메뉴바와 View 중 무엇이 틀렸는지 판단 기준이 있었을 것이다.
- **`/` 메인 페이지**(`main.html`)와 **`/polls/vote_create_old`**(옛 등록 화면)는 어느 메뉴에서도 들어가지 않는다. 구조도에 없는 URL은 지우거나 메뉴에 넣거나 둘 중 하나를 결정할 대상이다.

## 화면 설계서(와이어프레임)

와이어프레임은 실제 디자인 전에 화면의 **뼈대**를 잡는 산출물이다. 색과 이미지 없이 텍스트·선·상자·버튼 같은 기본 요소로만 그린다.

| 목적 | 내용 |
|---|---|
| 아이디어 시각화 | 요구사항 명세서의 기능을 화면에 배치 |
| 구조·레이아웃 결정 | 페이지 구조와 정보의 우선순위 |
| 소통 도구 | 디자이너·개발자·이해관계자가 같은 화면을 보며 논의 |

| 중요성 | 내용 |
|---|---|
| UX 개선 | 사용자 흐름을 미리 계획 |
| 비용·시간 절약 | 코드를 짜기 전에 문제 발견. 상자 하나 옮기는 비용은 0에 가깝다 |
| 피드백 수집 | 완성 전에 의견을 받아 반영 |

실무에서는 화면 설계서에 **기능 명세(스토리보드)** 를 붙인다. 화면 위 요소마다 번호를 달고, 옆에 "① 클릭 시 ○○ 화면으로 이동, ② 빈 값이면 △△ 메시지" 같은 동작 설명을 적는 방식이다. 개발자는 이 번호별 설명을 보고 구현한다.

### 설문 폼 화면을 와이어프레임으로

```text
┌──────────────────────────────────────────────┐
│ [홈] [설문목록] [설문등록] [내정보] [로그아웃] [채팅] │  ← 공통 메뉴바(로그인 상태)
├──────────────────────────────────────────────┤
│ 설문폼                                         │
│ 질문: 1. 좋아하는 색은 무엇입니까?               │
│ ┌──────────────────────────────────────────┐ │
│ │ ② 보기를 선택해주세요.                       │ │  ← 오류 시에만 표시
│ └──────────────────────────────────────────┘ │
│  ( ) 파랑색                                    │
│  ( ) 검정색                ① 라디오: 하나만 선택  │
│  ( ) 보라색                                    │
│  ( ) 빨강색                                    │
│                                               │
│ [③ 투표] [④ 선택해제] [⑤ 목록으로]              │
└──────────────────────────────────────────────┘
```

| 번호 | 요소 | 동작 |
|---|---|---|
| ① | 보기 라디오 | 보기 하나만 선택 |
| ② | 오류 메시지 | 미선택 투표 시 "보기를 선택해주세요.", 재투표 시 "이미 투표한 질문입니다." |
| ③ | 투표 | 선택한 보기에 투표 후 결과 화면으로 이동 |
| ④ | 선택해제 | 선택 초기화 |
| ⑤ | 목록으로 | 설문 목록으로 이동 |

지난 글의 유즈케이스 "투표하기"의 흐름 하나하나가 이 표의 동작과 대응한다. 유즈케이스는 **순서**, 화면 설계서는 **배치**를 정한다.

## ERD와 테이블 정의서

테이블 정의서 파일 맨 위에 둘의 차이를 메모해 두었다.

```text
- ERD: 설계도(테이블명, 컬럼(datatype, null여부, default값이 있는지 없는지), KEY=pk-fk, 등: 원칙적으로 3칸씩)=> 설계도에 다 넣을 수 없음
- 테이블 정의서: 설계도에 넣지 못한 데이터의 자세한 설명
```

ERD는 테이블과 관계를 **그림**으로 보여 준다. 컬럼마다 이름·타입·키 정도만 들어가고 상자가 커지면 읽기 어렵다. 기본값, 제약 조건, 인덱스, 각 컬럼의 의미, 업무 규칙처럼 그림에 넣지 못한 내용을 **표**로 적는 것이 테이블 정의서다. [SQL 시리즈](/notes/sql/sql-ddl-create-table)의 `CREATE TABLE`을 사람이 읽는 문서로 옮긴 것이라 볼 수 있다.

| 테이블 정의서 항목 | 내용 |
|---|---|
| 기본 정보 | 테이블 이름, 설명 |
| 컬럼 정보 | 이름, 데이터 타입, 길이, NULL 허용, 기본값, 설명 |
| 제약 조건 | PK, FK, UNIQUE, CHECK |
| 인덱스 | 이름, 대상 컬럼 |
| 외래 키 정보 | 참조 테이블·컬럼, ON DELETE / ON UPDATE 규칙 |
| 기타 | 예상 레코드 수, 데이터 보존 기간 |

### 강의 예시 수정

강의 자료의 예시는 제목이 "고객(Customer) 테이블 정의서 예"인데 내용은 `ORDERS` 테이블이고, NULL 허용 칸이 `N`으로 적혀 있다. 내 자료에서는 제목을 "주문(Order) 테이블 정의서 예"로, `N`을 `NN`으로 고쳐 두었다. `N`은 "No(허용 안 함)"인지 "Null(허용)"인지 헷갈리기 때문에, 보통 NOT NULL은 `NN`, 허용은 `Y` 또는 빈칸처럼 **약어를 정하고 문서 전체에서 통일**한다.

| 컬럼명 | 데이터 타입 | 길이 | NULL 허용 | 기본값 | 설명 |
|---|---|---|---|---|---|
| ORDER_ID | INT | - | NN | - | 주문 고유 식별자 |
| CUSTOMER_ID | INT | - | NN | - | 주문한 고객의 ID |
| ORDER_DATE | DATETIME | - | NN | CURRENT_TIMESTAMP | 주문 일시 |
| TOTAL_AMOUNT | DECIMAL | (10,2) | NN | 0.00 | 주문 총액 |
| STATUS | VARCHAR | 20 | NN | 'PENDING' | 주문 상태 |

예시의 외래 키 정보가 `ON DELETE: N/A`, `ON UPDATE: CASCADE`다. 고객을 지울 때 주문을 어떻게 할지(같이 삭제? 막기?)가 비어 있는 셈이라, 실제 문서라면 결정해서 적어야 하는 칸이다. 주문 기록은 보존 기간(5년)이 있으니 `RESTRICT`(고객 삭제를 막음)나 고객 정보만 지우는 방식이 맞을 것이다.

## 예시: 설문 프로젝트의 테이블 정의서

Django Model에서 실제로 만들어진 테이블을 `sqlmigrate`로 확인해 정리했다([Django 2편](/notes/django/django-model-orm)).

직접 실행(`python manage.py sqlmigrate polls 0001`, SQLite):

```text
CREATE TABLE "polls_question" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "question_text" varchar(200) NOT NULL, "pub_date" datetime NOT NULL);
CREATE TABLE "polls_choice" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "choice_text" varchar(200) NOT NULL, "vote" integer unsigned NOT NULL CHECK ("vote" >= 0), "question_id" bigint NOT NULL REFERENCES "polls_question" ("id") DEFERRABLE INITIALLY DEFERRED);
CREATE INDEX "polls_choice_question_id_c5b4b260" ON "polls_choice" ("question_id");
```

### polls_question

- **설명**: 설문 질문. 질문 1개에 보기 여러 개(1:N)

| 컬럼명 | 데이터 타입 | 길이 | NULL 허용 | 기본값 | 설명 |
|---|---|---|---|---|---|
| id | BIGINT | - | NN | 자동 증가 | PK |
| question_text | VARCHAR | 200 | NN | - | 질문 문장. 앞뒤 공백 제거 후 5글자 이상(폼 검증) |
| pub_date | DATETIME | - | NN | 등록 시각(앱에서 입력) | 등록 일시. UTC 저장 |

### polls_choice

- **설명**: 설문 보기와 득표 수

| 컬럼명 | 데이터 타입 | 길이 | NULL 허용 | 기본값 | 설명 |
|---|---|---|---|---|---|
| id | BIGINT | - | NN | 자동 증가 | PK |
| choice_text | VARCHAR | 200 | NN | - | 보기 문장 |
| vote | INTEGER | - | NN | 0 | 득표 수. 0 이상(CHECK) |
| question_id | BIGINT | - | NN | - | FK → polls_question.id |

| 제약·인덱스 | 내용 |
|---|---|
| PK | id |
| FK | question_id → polls_question(id), **ON DELETE CASCADE**(질문을 지우면 보기도 삭제) |
| CHECK | vote >= 0 |
| INDEX | polls_choice_question_id_c5b4b260 (question_id) |

### account_customuser

- **설명**: 회원. Django 기본 사용자 테이블을 확장(`AbstractUser`)

| 컬럼명 | 데이터 타입 | 길이 | NULL 허용 | 설명 |
|---|---|---|---|---|
| id | BIGINT | - | NN | PK |
| username | VARCHAR | 150 | NN | 로그인 아이디. **UNIQUE** |
| password | VARCHAR | 128 | NN | 비밀번호 해시(`pbkdf2_sha256$...`) |
| name | VARCHAR | 100 | NN | 이름. 2글자 이상(폼 검증) |
| email | VARCHAR | 254 | NN | 이메일(빈 문자열 허용) |
| birthday | DATE | - | **Y** | 생일(선택 입력) |
| is_active / is_staff / is_superuser | BOOL | - | NN | 활성·관리자 화면 접근·전체 권한 |
| last_login | DATETIME | - | Y | 마지막 로그인 |
| date_joined | DATETIME | - | NN | 가입 일시 |
| first_name / last_name | VARCHAR | 150 | NN | 기본 User 필드(이 프로젝트는 미사용) |

직접 만들면서 테이블 정의서가 왜 필요한지 보였다.

- **`question_text`의 "5글자 이상"은 DB에 없는 규칙**이다. SQL에는 `varchar(200) NOT NULL`뿐이고 규칙은 Django Form에 있다. 관리자 화면이나 다른 프로그램이 직접 넣으면 2글자 질문도 들어간다. 이런 업무 규칙은 ERD에도, SQL에도 드러나지 않아 정의서의 "설명" 칸에 적어야 한다.
- **`pub_date`의 기본값은 DB에 없다.** `auto_now_add`는 Django가 INSERT 직전에 값을 채우는 방식이라 SQL에는 기본값이 없다. 다른 경로로 INSERT하면 NOT NULL 오류가 난다.
- **ON DELETE CASCADE도 SQL에 없다.** Django는 FK 삭제 규칙을 DB가 아니라 **ORM이 처리**한다. 위 SQL의 `REFERENCES`에 `ON DELETE`가 빠져 있는 이유다. DB 도구로 질문을 직접 지우면 보기가 남거나 FK 오류가 난다.
- `first_name`·`last_name`은 쓰지 않는데 테이블에 있다. 기본 User를 확장했기 때문이다. 정의서에 "미사용"을 적어 두면 나중에 보는 사람이 헷갈리지 않는다.

> **보충**: Django에서 DB 수준 기본값이 필요하면 Django 5.0부터 `db_default=` 옵션을 쓸 수 있다(`pub_date = DateTimeField(db_default=Now())`). ORM을 거치지 않는 INSERT에도 기본값이 들어간다.

## 정리

| 산출물 | 무엇을 정하나 | 설문 프로젝트에서 드러난 것 |
|---|---|---|
| 메뉴 구조도 | 화면의 계층과 사용자 유형별 메뉴 | 메뉴바와 View의 로그인 규칙 불일치, 메뉴 없는 URL |
| 화면 설계서 | 화면의 배치 + 요소별 동작(기능 명세) | 유즈케이스 흐름과 1:1 대응 |
| ERD | 테이블과 관계(그림) | - |
| 테이블 정의서 | 컬럼·제약·인덱스·업무 규칙(표) | DB에 없는 규칙(5글자, 기본값, CASCADE) |

- NULL 허용 같은 약어는 문서 전체에서 통일한다(`NN` / `Y`).
- 프레임워크가 처리하는 규칙은 SQL에 보이지 않는다. 정의서에 적어야 다른 사람이 안다.

다음 글에서는 테스트 케이스를 설계해 실제로 실행하고, 시스템 구성도를 그린다.
