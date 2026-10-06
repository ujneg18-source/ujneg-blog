---
title: "DDL: 계정·데이터베이스·테이블과 제약조건 만들기"
description: "MySQL에서 사용자 계정과 권한, 데이터베이스, 테이블을 만들고 데이터 타입과 제약조건으로 저장 규칙을 정하는 방법을 정리합니다."
category: 'Tech'
subcategory: 'SQL'
series: 'SQL 기초'
seriesOrder: 2
originalNotebook: "01_DDL.sql"
tags: ["SQL","MySQL","DDL","Constraint"]
date: 2026-04-21
---

> SKN31 SQL 실습 파일 `01_DDL.sql`의 필기를 바탕으로 정리했습니다.
> 예제는 MySQL과 호환되는 MariaDB 10.11에서 다시 실행했습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용을 블로그로 옮기며 덧붙인 것입니다.

## 이 글에서 다루는 것

- 사용자 계정을 만들고 권한을 부여하는 방법 (`CREATE USER`, `GRANT`)
- 데이터베이스를 만들고 선택하는 방법 (`CREATE DATABASE`, `USE`)
- 테이블을 만들고 확인·삭제하는 방법 (`CREATE TABLE`, `DESC`, `DROP TABLE`)
- 문자열·숫자·날짜 데이터 타입
- `PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`가 실제 INSERT에 미치는 영향

## 사용자 계정 생성

MySQL을 설치하면 관리자 계정 `root`가 만들어진다. 실습할 때는 root를 그대로 쓰지 않고 별도 계정을 만들어 사용했다.

```sql
CREATE USER 'username'@'host' IDENTIFIED BY 'password';
```

- `username`과 `host`는 **따로** 작은따옴표로 묶는다.
- `host`에는 접속을 허용할 위치를 쓴다.
  - `localhost`: 서버가 설치된 컴퓨터에서만 접속하는 계정
  - `%`: 다른 컴퓨터에서 원격 접속하는 계정

같은 이름이라도 host가 다르면 다른 계정이다. 그래서 로컬용과 원격용을 각각 만들었다.

```sql
-- local 접속 계정
create user 'playdata'@'localhost' identified by '1111';

-- 원격 접속 계정
create user 'playdata'@'%' identified by '1111';

-- 등록된 사용자 계정 조회
select user, host from mysql.user;
```

계정을 지울 때는 `DROP USER 'playdata'@'localhost';`처럼 host까지 지정한다.

## 계정에 권한 부여

계정을 만든 것만으로는 테이블을 만들거나 조회할 수 없다. 권한을 부여해야 한다.

```sql
GRANT 부여할권한 ON 데이터베이스.테이블 TO 계정@host;
```

- 데이터베이스와 테이블 자리에 `*`를 쓰면 모든 DB와 테이블에 적용된다. `*.*`는 "모든 DB의 모든 테이블"이다.
- 주요 권한

| 범위 | 권한 |
|---|---|
| 전체 | `all privileges` |
| 테이블의 데이터 관리 | `select`, `insert`, `update`, `delete` |
| DB 객체 관리 | `create`, `drop`, `alter` |
| 사용자 관리 | `create user`, `drop user`, `grant option` |

```sql
grant all privileges on *.* to 'playdata'@'localhost';
grant all privileges on *.* to 'playdata'@'%';
```

부여된 권한은 `SHOW GRANTS`로 확인한다. 결과에 `GRANT ALL PRIVILEGES ON *.* TO 'playdata'@'localhost'` 같은 문장이 나오면 권한이 들어간 것이다.

```sql
-- user 권한 조회
show grants for 'playdata'@'localhost';
show grants for 'playdata'@'%';
```

## 데이터베이스 생성과 선택

```sql
-- 생성
create database testdb;

-- 확인
show databases;

-- 사용할 DB 지정
use testdb;
```

`USE`는 "앞으로 데이터베이스 이름을 생략하면 이 DB를 쓰겠다"는 설정이다. `USE testdb;`를 실행한 뒤에는 `testdb.emp` 대신 `emp`라고만 써도 된다.

## 테이블 생성

```sql
CREATE TABLE 테이블이름 (
    컬럼이름  데이터타입  [제약조건],
    컬럼이름  데이터타입  [제약조건],
    [제약조건]
);
```

테이블·컬럼 이름에는 영문자, 숫자, `_`만 쓸 수 있고 첫 글자는 영문자여야 한다.

### 데이터 타입

수업 자료에서 정리한 주요 타입이다.

**문자열**

| 타입 | 설명 |
|---|---|
| `CHAR(n)` | 고정 길이. 글자 수가 모자라면 공백으로 채운다. 최대 255 |
| `VARCHAR(n)` | 가변 길이. `n`은 최대 글자 수이고, 저장 크기는 실제 글자 수에 따라 달라진다 |
| `TEXT` 계열 | `TINYTEXT`, `TEXT`, `MEDIUMTEXT`, `LONGTEXT`. 최대 길이를 지정하지 않는 긴 문자열 |

- `(n)`을 생략하면 길이 1로 설정된다.
- 문자열 값은 작은따옴표로 감싼다. 큰따옴표는 값으로 쓰지 않는다.

**숫자**

| 타입 | 크기 | 설명 |
|---|---|---|
| `TINYINT` | 1 byte | -128 ~ 127 |
| `BOOLEAN` | 1 byte | `TINYINT(1)`로 저장된다. `TRUE`/`FALSE`로 넣고 조회하면 `1`/`0`이 나온다 |
| `SMALLINT` | 2 byte | -32,768 ~ 32,767 |
| `INT` | 4 byte | 약 ±21억 |
| `BIGINT` | 8 byte | 약 ±922경 |
| `DECIMAL(M, N)` | | 고정 소수점. `M`은 전체 자릿수, `N`은 소수 자릿수. 금액처럼 정확해야 하는 실수에 쓴다 |
| `FLOAT`, `DOUBLE` | 4, 8 byte | 부동 소수점 |

**날짜·시간**

| 타입 | 형식 | 특징 |
|---|---|---|
| `DATE` | `YYYY-MM-DD` | 날짜 |
| `TIME` | `hh:mm:ss` | 시간 |
| `DATETIME` | `YYYY-MM-DD hh:mm:ss` | 입력한 일시가 서버 time zone과 상관없이 고정된다 |
| `TIMESTAMP` | `YYYY-MM-DD hh:mm:ss` | 서버 time zone을 바꾸면 조회되는 일시도 바뀐다. 범위는 1970년 ~ 2038년 |

값이 없음을 뜻하는 결측치는 `NULL`이다. 없는 값, 모르는 값, 수집되지 않은 값을 모두 `NULL`로 표현한다.

### 제약조건

컬럼이 가질 수 있는 값에 규칙을 거는 것이 제약조건이다.

| 제약조건 | 의미 |
|---|---|
| `PRIMARY KEY` (PK) | 한 행을 대표하는 컬럼. `NOT NULL` + `UNIQUE`를 함께 만족한다 |
| `FOREIGN KEY` (FK) | 다른 테이블의 컬럼을 참조하는 연결 관계. JOIN 글에서 다룬다 |
| `UNIQUE` (UK) | 모든 행이 서로 다른 값을 가져야 한다. `NULL`은 예외 |
| `NOT NULL` (NN) | 반드시 값이 있어야 한다 |
| `CHECK` (CK) | 들어갈 값의 조건을 지정한다. 주로 업무 규칙을 넣는다 |
| `AUTO_INCREMENT` | 행이 추가될 때마다 1씩 증가하는 정수 컬럼 (MySQL) |
| `DEFAULT` | 값을 넣지 않았을 때 사용할 기본값 |

### 실습: 회원(member) 테이블

수업에서 받은 명세를 테이블로 옮겼다.

| 컬럼 | 타입 | 조건 |
|---|---|---|
| `id` | `varchar(10)` | primary key |
| `password` | `varchar(10)` | not null |
| `name` | `varchar(30)` | not null |
| `point` | `int` | nullable, 기본값 0 |
| `email` | `varchar(100)` | unique key |
| `gender` | `char(1)` | not null, `'m'`, `'f'`만 허용 |
| `age` | `int` | 양수만 허용 |
| `join_date` | `timestamp` | not null, 기본값은 저장 시점 일시 |

```sql
use testdb;
create table member(
    id         varchar(10)  primary key,
    password   varchar(10)  not null,
    name       varchar(30)  not null,
    point      int          default 0,
    email      varchar(100) unique key,
    gender     char(1)      not null check(gender in ('m', 'f')),
    age        int          check(age > 0),
    join_date  timestamp    not null default current_timestamp
);

-- 테이블 상세정보(컬럼) 조회
desc member;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 8행</div><div class="sql-result-scroll"><table><thead><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr></thead><tbody><tr><td>id</td><td>varchar(10)</td><td>NO</td><td>PRI</td><td><span class="sql-null">NULL</span></td><td></td></tr><tr><td>password</td><td>varchar(10)</td><td>NO</td><td></td><td><span class="sql-null">NULL</span></td><td></td></tr><tr><td>name</td><td>varchar(30)</td><td>NO</td><td></td><td><span class="sql-null">NULL</span></td><td></td></tr><tr><td>point</td><td>int(11)</td><td>YES</td><td></td><td>0</td><td></td></tr><tr><td>email</td><td>varchar(100)</td><td>YES</td><td>UNI</td><td><span class="sql-null">NULL</span></td><td></td></tr><tr><td>gender</td><td>char(1)</td><td>NO</td><td></td><td><span class="sql-null">NULL</span></td><td></td></tr><tr><td>age</td><td>int(11)</td><td>YES</td><td></td><td><span class="sql-null">NULL</span></td><td></td></tr><tr><td>join_date</td><td>timestamp</td><td>NO</td><td></td><td>current_timestamp()</td><td></td></tr></tbody></table></div></div>

`DESC`로 컬럼별 타입, NULL 허용 여부(`Null`), 키(`Key`의 `PRI`, `UNI`), 기본값(`Default`)을 한 번에 확인할 수 있다.

### 테이블 조회와 삭제

```sql
-- 데이터베이스 안의 모든 테이블 조회
show tables;

-- 테이블 삭제
drop table if exists member;
```

`if exists`를 붙이면 테이블이 없을 때 에러 대신 아무 일도 일어나지 않는다. `DROP`은 DDL이라 실행하면 되돌릴 수 없다.

## INSERT로 제약조건 확인하기

테이블을 만든 뒤 바로 행을 넣어 보며 `DEFAULT`와 제약조건이 어떻게 동작하는지 확인했다. INSERT 문법 자체는 DML 글에서 다시 정리한다.

```sql
INSERT INTO 테이블명 (컬럼 [, 컬럼]) VALUES (값 [, 값]);
```

- SQL은 기본적으로 한 번에 한 행씩 추가한다.
- 모든 컬럼에 값을 넣을 때는 컬럼 목록을 생략할 수 있다.

```sql
-- 모든 컬럼 지정
insert into member (id, password, name, point, email, gender, age, join_date)
values ('id-1', '1111', '홍길동', 1000, 'h@a.com', 'm', 20, '2025-10-14 17:25:45');

-- 모든 컬럼에 값을 넣을 때 컬럼 지정 생략
insert into member values ('id-2', '1111', '홍길동', 1000, 'h2@a.com', 'm', 20, '2025-10-14 17:25:45');
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

컬럼을 일부만 지정하면 빠진 컬럼에는 `DEFAULT` 값이 들어간다. 기본값이 없는 컬럼에는 `NULL`이 들어간다.

```sql
-- join_date는 default 값(SQL 실행 일시), point는 0이 insert 됨
insert into member (id, password, name, gender) values ('id-3', '2222', '이순신', 'm');

insert into member (id, password, name, gender, age) values ('id-4', '2222', '유관순', 'f', 20);

insert into member (id, password, name, gender, age, join_date) values ('id-5', '2222', '유관순', 'f', 20, '2000-10-10');

-- default 값이 있는 컬럼에 null을 넣으려면 반드시 명시해야 함
insert into member (id, password, name, gender, age, point) values ('id-6', '1111', '이순신', 'm', null, null);
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

```sql
select * from member;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 6행</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>password</th><th>name</th><th>point</th><th>email</th><th>gender</th><th>age</th><th>join_date</th></tr></thead><tbody><tr><td>id-1</td><td>1111</td><td>홍길동</td><td>1000</td><td>h@a.com</td><td>m</td><td>20</td><td>2025-10-14 17:25:45</td></tr><tr><td>id-2</td><td>1111</td><td>홍길동</td><td>1000</td><td>h2@a.com</td><td>m</td><td>20</td><td>2025-10-14 17:25:45</td></tr><tr><td>id-3</td><td>2222</td><td>이순신</td><td>0</td><td><span class="sql-null">NULL</span></td><td>m</td><td><span class="sql-null">NULL</span></td><td>2026-10-06 14:16:10</td></tr><tr><td>id-4</td><td>2222</td><td>유관순</td><td>0</td><td><span class="sql-null">NULL</span></td><td>f</td><td>20</td><td>2026-10-06 14:16:10</td></tr><tr><td>id-5</td><td>2222</td><td>유관순</td><td>0</td><td><span class="sql-null">NULL</span></td><td>f</td><td>20</td><td>2000-10-10 00:00:00</td></tr><tr><td>id-6</td><td>1111</td><td>이순신</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td><td>m</td><td><span class="sql-null">NULL</span></td><td>2026-10-06 14:16:10</td></tr></tbody></table></div></div>

결과에서 확인한 점은 세 가지다.

- `id-3`, `id-4`는 `point`를 생략했으므로 기본값 `0`이 들어갔고, `join_date`에는 INSERT를 실행한 시점의 일시가 들어갔다. (위 결과는 블로그 정리 시점에 다시 실행한 값이다.)
- `id-5`처럼 `join_date`에 날짜만 넣으면 시간은 `00:00:00`이 된다.
- `id-6`의 `point`가 `NULL`인 이유는 `null`을 **명시**했기 때문이다. 생략하면 `0`, 직접 `null`을 쓰면 `NULL`이다.

### 보충: 제약조건 위반

원본 필기에는 정상 입력만 있어서, 정리하면서 규칙을 어기는 값을 넣어 각 제약조건이 실제로 막는지 확인했다. 아래 에러 메시지는 MariaDB 기준이다. MySQL 8에서는 CHECK 위반이 `3819: Check constraint 'member_chk_1' is violated.`처럼 다른 번호와 문구로 나오고, 나머지 세 개는 번호와 내용이 같다.

```sql
-- CHECK: gender는 'm', 'f'만 허용
insert into member (id, password, name, gender) values ('id-7', '1111', '강감찬', 'x');
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">실행 결과 · 에러 4025: CONSTRAINT `member.gender` failed for `testdb`.`member`</div></div>

```sql
-- UNIQUE: 이미 있는 email
insert into member (id, password, name, email, gender) values ('id-8', '1111', '강감찬', 'h@a.com', 'm');
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">실행 결과 · 에러 1062: Duplicate entry &#x27;h@a.com&#x27; for key &#x27;email&#x27;</div></div>

```sql
-- PRIMARY KEY: 이미 있는 id
insert into member (id, password, name, gender) values ('id-1', '1111', '강감찬', 'm');
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">실행 결과 · 에러 1062: Duplicate entry &#x27;id-1&#x27; for key &#x27;PRIMARY&#x27;</div></div>

```sql
-- NOT NULL: name 누락
insert into member (id, password, gender) values ('id-9', '1111', 'm');
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">실행 결과 · 에러 1364: Field &#x27;name&#x27; doesn&#x27;t have a default value</div></div>

## 보충: 테이블 구조 바꾸기(ALTER)

실습 파일에는 없지만 수업 자료에 정리된 `ALTER TABLE` 구문이다. 이미 만든 테이블에 컬럼이나 제약조건을 추가·변경·삭제할 때 쓴다.

```sql
-- 컬럼 추가
ALTER TABLE 테이블이름 ADD COLUMN 컬럼명 데이터타입 [제약조건];

-- 제약조건 추가
ALTER TABLE 테이블이름 ADD CONSTRAINT 제약조건이름 제약조건구문;

-- 컬럼 타입 변경
ALTER TABLE 테이블이름 MODIFY COLUMN 컬럼명 데이터타입 [제약조건];

-- 컬럼 삭제
ALTER TABLE 테이블이름 DROP COLUMN 컬럼명;

-- 제약조건 삭제
ALTER TABLE 테이블이름 DROP CONSTRAINT 제약조건이름;
ALTER TABLE 테이블이름 DROP PRIMARY KEY;
```

데이터가 이미 있는 컬럼의 타입은 바꿀 수 없다. 단, `VARCHAR`·`CHAR`의 크기를 늘리는 변경은 가능하다.

## 정리

| 하고 싶은 일 | 구문 |
|---|---|
| 계정 생성 | `CREATE USER 'id'@'host' IDENTIFIED BY 'pw'` |
| 권한 부여 | `GRANT all privileges ON *.* TO 'id'@'host'` |
| DB 생성·선택 | `CREATE DATABASE db`, `USE db` |
| 테이블 생성 | `CREATE TABLE t (컬럼 타입 제약조건, ...)` |
| 구조 확인 | `SHOW TABLES`, `DESC t` |
| 테이블 삭제 | `DROP TABLE IF EXISTS t` |

- `DEFAULT`는 컬럼을 **생략**했을 때만 적용된다. `null`을 직접 넣으면 `NULL`이 저장된다.
- 제약조건은 잘못된 데이터가 들어오는 것을 DBMS 단계에서 막는다.
