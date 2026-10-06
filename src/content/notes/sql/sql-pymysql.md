---
title: "PyMySQL: Python에서 MySQL 연동하기"
description: "PyMySQL로 MySQL에 연결해 SQL을 실행하는 기본 절차, Parameterized Query와 executemany, fetch 메소드로 조회 결과를 받는 방법을 정리합니다."
category: 'Tech'
subcategory: 'SQL'
series: 'SQL 기초'
seriesOrder: 9
originalNotebook: "pymysql을 이용해 mysql연동.ipynb"
tags: ["SQL","MySQL","Python","PyMySQL"]
date: 2026-04-24
---

> SKN31 SQL 실습 노트북 `pymysql을 이용해 mysql연동.ipynb`의 필기를 바탕으로 정리했습니다.
> 노트북에서 `input()`으로 값을 받던 셀은 값을 직접 넣어 다시 실행했고, 실행 결과는 블로그 정리 시점에 MariaDB 10.11(MySQL 호환)에서 실행한 값입니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- PyMySQL로 DB에 연결하고 SQL을 실행하는 5단계
- `with` 문으로 연결을 자동으로 닫는 방법
- Python 타입과 SQL 데이터 타입의 대응
- DML 실행 후 `commit()`이 필요한 이유
- `%s` placeholder를 쓰는 Parameterized Query와 `executemany()`
- `fetchall()`, `fetchone()`, `fetchmany()`, `DictCursor`

## PyMySQL

- Python에서 MySQL, MariaDB와 연동하는 기능을 제공하는 모듈이다.
- Python 표준 [DB API 2.0(PEP 249)](https://peps.python.org/pep-0249/)을 따른다. 그래서 다른 DB 연동 모듈도 `connect` → `cursor` → `execute` → `fetch` 흐름이 비슷하다.
- 조건: Python 3.6 이상, MySQL 5.6 이상

```bash
pip install pymysql
```

데이터베이스 개요 글에서 Workbench와 Python은 둘 다 **클라이언트**라고 정리했다. PyMySQL은 Python이 MySQL 서버에 SQL을 보내고 결과를 받는 통로 역할을 한다.

## 기본 작성 절차

1. **Database 연결**: `pymysql.connect()`가 `Connection` 객체를 반환한다.

   ```python
   connection = pymysql.connect(host="DBMS 서버 ip",
                                port=3306,          # 기본값 3306
                                user="계정명",
                                password="비밀번호",
                                db="연결할데이터베이스이름")
   ```

2. **Cursor 생성**: Cursor는 연결된 DB에 SQL문을 전송하고 SELECT 결과를 받아오는 객체다.

   ```python
   cursor = connection.cursor()
   ```

3. **SQL문 실행**: DB 서버로 전송한다.

   ```python
   cursor.execute("sql문")
   ```

4. **SELECT 결과 조회**: SELECT를 실행했다면 fetch 메소드로 결과를 받는다.

   ```python
   result = cursor.fetchall()
   ```

5. **연결 닫기**: cursor, connection 순서로 닫는다.

   ```python
   cursor.close()
   connection.close()
   ```

`Connection`과 `Cursor`는 모두 Context Manager 타입이라 `with` 문으로 쓰면 블록을 빠져나갈 때 `close()`가 자동으로 처리된다.

## 테이블 생성: try-finally로 연결 닫기

먼저 `with` 없이 절차를 하나씩 따라가며 `customer` 테이블을 만들었다.

```python
create_sql = """
create table customer(
  id         int          auto_increment  primary key,
  name       varchar(20)  not null,
  email      varchar(50)  not null unique,
  tall       double,
  birthday   date,
  created_at datetime     not null
)
"""
# sql 문 마지막에 `;` 은 붙이지 않는다.
```

```python
import pymysql

try:
    conn = None  # connection을 저장할 변수

    # 1. Database와 연결
    conn = pymysql.connect(
        host="127.0.0.1",   # DBMS의 ip(host): str
        port=3306,          # DBMS의 port 번호: int
        user="playdata",    # username: str
        password="1111",    # password: str
        db="testdb"         # 연결할 Database 이름: str
    )  # 연결에 성공하면 연결된 DB와 작업할 수 있는 Connection 객체를 반환
    print(type(conn))

    # 2. Connection을 사용해서 Cursor 객체 생성
    #    Cursor: SQL 전송하고 처리 결과를 받을 때까지의 과정을 관리
    cursor = conn.cursor()
    print(type(cursor))

    # 3. SQL 문 전송
    cursor.execute("drop table if exists customer")
    cursor.execute(create_sql)

finally:
    # 4. 연결 닫기
    if conn:
        cursor.close()  # 4-1. cursor 연결 닫기
        conn.close()    # 4-2. connection 연결 닫기
```

```text
<class 'pymysql.connections.Connection'>
<class 'pymysql.cursors.Cursor'>
```

`conn = None`으로 먼저 초기화한 이유는 연결 단계에서 에러가 나면 `conn`이 만들어지지 않기 때문이다. `finally`에서 `if conn:`으로 연결이 있을 때만 닫는다.

> **연결 에러 메모**: MySQL 8의 기본 인증 방식(`caching_sha2_password`)으로 연결하면 `RuntimeError: 'cryptography' package is required for sha256_password or caching_sha2_password auth methods`가 날 수 있다. `pip install cryptography`로 설치하고 VSCode를 재시작해 해결했다.

## Python 타입과 SQL 타입

PyMySQL은 값을 주고받을 때 타입을 자동으로 바꿔 준다.

| Python | SQL |
|---|---|
| `str` | `char`, `varchar`, `text` 등 문자열 |
| `int` | `tinyint`, `int` 등 정수 |
| `float` | `float`, `double` (부동 소수) |
| `decimal.Decimal` | `decimal` (고정 소수) |
| `datetime.date` | `date` |
| `datetime.time` | `time` |
| `datetime.datetime` | `datetime`, `timestamp` |

날짜 값을 다루기 위해 `datetime` 모듈도 같이 정리했다.

```python
from datetime import date, time, datetime

now = datetime.now()                   # 실행 시점
today = date.today()
d1 = date(2000, 10, 2)                 # 특정 날짜
d2 = datetime(1990, 2, 7, 10, 22, 53)  # 특정 일시
t = time(17, 22, 33)                   # 특정 시간
print(now.year, now.month, now.day, now.hour, now.minute, now.second)
```

## DML 실행: INSERT

```python
sql = "insert into customer (name, email, tall, birthday, created_at) " \
      "values('이순신', 'lee1@naver.com', 185.23, '2000-09-20', now())"

# with 문을 이용해 connection, cursor 생성: with 블록을 빠져나올 때 자동으로 close() 처리
# DML(insert/update/delete) 구문은 처리 후 commit을 실행해야 영구적으로 적용된다
with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor() as cursor:
        result = cursor.execute(sql)  # 반환값: 처리 행수
        # if 중지할 조건:
        #     conn.rollback()  # 수행한 DML 작업을 취소
        print("처리 행수:", result)
        conn.commit()
```

```text
처리 행수: 1
```

- `execute()`의 반환값은 처리된 행 수다. INSERT·UPDATE·DELETE는 바뀐 행 수, SELECT는 조회된 행 수다.
- PyMySQL은 `autocommit`이 기본적으로 꺼져 있다. `commit()`을 하지 않고 연결을 닫으면 INSERT가 반영되지 않는다. Workbench에서 바로 반영되던 것과 다른 점이다.
- 문제가 생기면 `conn.rollback()`으로 취소할 수 있다.

## Parameterized Query

SQL문에서 **값**이 들어갈 자리에 `%s` placeholder를 쓰고, `execute()`의 두 번째 인자로 넣을 값을 list나 tuple로 전달한다.

- 같은 쿼리를 값만 바꿔 여러 번 실행할 때 유용하다.
- 값의 타입에 맞게 따옴표 처리를 PyMySQL이 해 준다. 문자열이든 숫자든 placeholder는 모두 `%s`다.

```python
# 노트북에서는 input()으로 받았던 값
name = "홍길동"
email = "hong@a.com"
tall = 172.5
birthday = "1999-03-15"

insert_sql = "insert into customer (name, email, tall, birthday, created_at) " \
             "values (%s, %s, %s, %s, now())"

with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor() as cursor:
        result = cursor.execute(insert_sql, [name, email, tall, birthday])
        conn.commit()
        print("처리 행수:", result)
```

```text
처리 행수: 1
```

> **보충: 왜 문자열 포매팅 대신 `%s`를 쓰나.** `f"... values ('{name}', ...)"`처럼 값을 SQL 문자열에 직접 끼워 넣으면, 사용자가 입력한 값에 `'`나 SQL 구문이 섞여 있을 때 쿼리 자체가 바뀔 수 있다(SQL Injection). placeholder를 쓰면 PyMySQL이 값을 이스케이프해서 넣기 때문에 값은 끝까지 "값"으로만 취급된다. `input()`으로 사용자 입력을 받는 노트북 예제라서 더 중요한 부분이다.

### executemany(): 여러 행을 한 번에

```python
from datetime import datetime, date

datas = [
    ["김인영", "abc312@a.com", 165, date(2005, 1, 12), datetime.now()],
    ["오수철", "def312@a.com", 175, date(1995, 12, 20), datetime.now()],
    ["최유명", "ghi312@a.com", 183, date(1978, 10, 28), datetime.now()],
    ["김명수", "jkl312@abc.com", 177, date(2000, 2, 12), datetime.now()],
    ["이지영", "mno312@abc.com", 163, date(1995, 4, 21), datetime.now()],
    ["박명수", "pqr312@abc.com", 185, date(2002, 7, 5), datetime.now()],
]

insert_sql = "insert into customer(name, email, tall, birthday, created_at) " \
             "values(%s, %s, %s, %s, %s)"

with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor() as cursor:
        cnt = cursor.executemany(insert_sql, datas)
        conn.commit()

print("insert된 총 행수:", cnt)
```

```text
insert된 총 행수: 6
```

`for data in datas: cursor.execute(insert_sql, data)`로 반복해도 되지만, `executemany()`는 값 목록을 한 번에 넘긴다. `date`, `datetime` 객체를 그대로 넣어도 SQL의 `date`, `datetime`으로 바뀐다.

### UPDATE, DELETE

코딩 절차는 INSERT와 같다.

```python
update_sql = "update customer set tall=%s where id=%s"

with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor() as cursor:
        result = cursor.execute(update_sql, [180.0, 2])
        print("처리 행수: ", result)
        conn.commit()
```

```text
처리 행수:  1
```

없는 ID로 UPDATE하면 에러가 아니라 처리 행수 `0`이 나온다. 노트북에서도 한 번 0이 나왔던 기록이 있다.

```python
update_sql = "update customer set email=%s, tall=%s where id=%s"
# ... 같은 방식으로 실행, id=100은 없는 고객
result = cursor.execute(update_sql, ["new@a.com", 170.0, 100])
```

```text
처리 행수:  0
```

```python
delete_sql = "delete from customer where tall > %s"

with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor() as cursor:
        result = cursor.execute(delete_sql, [180])
        print("처리 행수: ", result)
        conn.commit()
```

```text
처리 행수:  3
```

키가 180 초과인 이순신(185.23), 최유명(183), 박명수(185)가 삭제됐다.

## SELECT 결과 조회

`cursor.execute("select문")`을 실행한 뒤 cursor의 **fetch 메소드**로 결과를 받는다.

| 메소드 | 반환 |
|---|---|
| `fetchall()` | 조회한 모든 행 |
| `fetchmany(size=개수)` | 지정한 개수만큼. 다시 호출하면 다음 개수만큼. 더 없으면 빈 튜플 |
| `fetchone()` | 첫 번째 행 하나. 결과가 없으면 `None`. 주로 PK로 조회할 때 쓴다 |

### fetchall()

```python
sql = "select id, birthday, name, tall, created_at from customer"

with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor() as cursor:
        result = cursor.execute(sql)  # result: 조회 행수
        print("조회행수:", result)
        resultset = cursor.fetchall()

print(type(resultset))
resultset[:2]
```

```text
조회행수: 5
<class 'tuple'>
((2, datetime.date(1999, 3, 15), '홍길동', 180.0, datetime.datetime(2026, 10, 6, 14, 14, 48)),
 (3, datetime.date(2005, 1, 12), '김인영', 165.0, datetime.datetime(2026, 10, 6, 14, 14, 48)))
```

결과는 **튜플 안의 튜플**이다. 바깥 튜플의 원소 하나가 한 행이고, 안쪽 튜플이 그 행의 컬럼 값들이다. `date` 컬럼은 `datetime.date`로 돌아온다. 값은 인덱스로 꺼낸다.

```python
resultset[0][1]  # 첫 번째 행의 두 번째 컬럼(birthday)
```

```text
datetime.date(1999, 3, 15)
```

### DictCursor: 결과를 dictionary로

인덱스로 꺼내면 컬럼 순서를 기억해야 한다. `pymysql.cursors.DictCursor`를 쓰면 각 행이 `{컬럼명: 값}` 딕셔너리로 온다. Connection이나 Cursor를 만들 때 지정한다.

```python
sql = "select id as 아이디, name, tall from customer"

with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor(pymysql.cursors.DictCursor) as cursor:
        result = cursor.execute(sql)
        print("조회행수:", result)
        resultset = cursor.fetchall()

print(resultset[:2])
print(resultset[1]['name'], resultset[1]['tall'])
```

```text
조회행수: 5
[{'아이디': 2, 'name': '홍길동', 'tall': 180.0}, {'아이디': 3, 'name': '김인영', 'tall': 165.0}]
김인영 165.0
```

딕셔너리의 key는 SELECT절의 **별칭**을 따른다. `id as 아이디`라고 썼기 때문에 key가 `'아이디'`가 됐다.

### fetchone()

```python
sql = "select * from customer where id = %s"

with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor() as cursor:
        result = cursor.execute(sql, [3])
        print("조회행수:", result)
        resultset = cursor.fetchone()

print(resultset)
```

```text
조회행수: 1
(3, '김인영', 'abc312@a.com', 165.0, datetime.date(2005, 1, 12), datetime.datetime(2026, 10, 6, 14, 14, 48))
```

`fetchone()`은 행 하나를 튜플로 바로 돌려준다. 조회 결과가 없으면 `None`이므로 사용 전에 확인한다.

```python
if resultset:  # 조회 결과가 없으면 None
    print(resultset)
else:
    print("조회결과가 없음.")
```

### fetchmany()

```python
sql = "select id, name from customer"

with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor() as cursor:
        cursor.execute(sql)
        print(cursor.fetchmany(size=2))  # 처음 두 개
        print(cursor.fetchmany(size=2))  # 다음 두 개
        print(cursor.fetchmany(size=2))  # 남은 것만큼
        print(cursor.fetchmany(size=2))  # 모두 조회했으면 빈 튜플
```

```text
((2, '홍길동'), (3, '김인영'))
((4, '오수철'), (6, '김명수'))
((7, '이지영'),)
()
```

cursor는 "어디까지 읽었는지"를 기억한다. 남은 행이 size보다 적으면 남은 만큼만, 다 읽었으면 빈 튜플을 돌려준다.

### cursor는 iterable

SELECT를 실행한 cursor를 `for` 문에 바로 넣으면 한 행씩 꺼낼 수 있다.

```python
sql = "select * from customer"

with pymysql.connect(host="127.0.0.1", port=3306, user="playdata", password="1111",
                     database="testdb") as conn:
    with conn.cursor() as cursor:
        result = cursor.execute(sql)
        print("조회행수:", result)
        # idx, 튜플 → 튜플을 튜플 대입하려면 ( )로 묶어준다
        for idx, (id, name, email, tall, birthday, created_at) in enumerate(cursor):
            print(f"{idx}번", id, name, email, tall, birthday, created_at, sep=" , ")
```

```text
조회행수: 5
0번 , 2 , 홍길동 , hong@a.com , 180.0 , 1999-03-15 , 2026-10-06 14:14:48
1번 , 3 , 김인영 , abc312@a.com , 165.0 , 2005-01-12 , 2026-10-06 14:14:48
2번 , 4 , 오수철 , def312@a.com , 175.0 , 1995-12-20 , 2026-10-06 14:14:48
3번 , 6 , 김명수 , jkl312@abc.com , 177.0 , 2000-02-12 , 2026-10-06 14:14:48
4번 , 7 , 이지영 , mno312@abc.com , 163.0 , 1995-04-21 , 2026-10-06 14:14:48
```

`enumerate(cursor)`는 `(순번, 행튜플)`을 돌려준다. 행 튜플을 컬럼별 변수로 바로 풀려면 `(id, name, ...)`처럼 괄호로 묶어야 한다는 점을 필기에 남겼다.

## DB 연동 코드를 모듈로 나누기

노트북 마지막에는 `customer` 테이블을 다루는 함수를 `customer_db.py` 모듈로 분리하는 구조를 스케치했다. 함수 이름만 잡아 두고 본문은 채우지 않은 상태다.

```python
# customer_db.py: customer 테이블 연동 모듈
def insert_customer(connection, name, email, tall, birthday):
    insert_sql = "insert into customer (name, email, tall, birthday, created_at) " \
                 "values (%s, %s, %s, %s, now())"
    with connection.cursor() as cursor:
        result = cursor.execute(insert_sql, [name, email, tall, birthday])
        # conn.commit()
        print("처리 행수:", result)

def update_customer(cust_id, name, email, tall, birthday): ...
def delete_customer_by_id(cust_id): ...
def delete_customer_by_email(email): ...
def select_customer(): ...                                  # 전체 조회
def select_customer_by_id(cust_id): ...                     # ID로 조회
def select_customer_by_birthday_range(start_date, end_date): ...  # 생일 범위로 조회
```

```python
import customer_db

def 회원가입(name, email, tall, birthday):
    # 입력값 검증

    # DB 등록
    with pymysql.connect(...) as conn:
        customer_db.insert_customer(conn, name, email, tall, birthday)
        # customer_db.update_customer(conn, ...)
        conn.commit()

    # 응답
```

원본에서는 `connection.commit()`으로 적혀 있었는데, `with` 문에서 만든 변수 이름은 `conn`이라 `conn.commit()`으로 고쳐 옮겼다.

이 구조에서 눈여겨본 점은 **`commit()`의 위치**다. `insert_customer` 안의 `conn.commit()`을 주석 처리해 둔 이유이기도 하다.

- DB 함수(`insert_customer`)는 connection을 인자로 받아 SQL만 실행하고 `commit()`은 하지 않는다.
- 호출하는 쪽(`회원가입`)이 connection을 열고, 필요한 DB 함수를 모두 호출한 뒤 마지막에 한 번 `commit()`한다.
- 그러면 "회원 등록 + 다른 테이블 수정"처럼 여러 작업을 **하나의 트랜잭션**으로 묶을 수 있다. 중간에 실패하면 전부 `rollback()`하면 된다.

`update_customer` 등 나머지 함수는 아직 connection 인자를 받지 않는 형태라, 같은 규칙으로 맞춰야 이 구조가 완성된다.

## 정리

```python
with pymysql.connect(host=..., port=3306, user=..., password=..., database=...) as conn:
    with conn.cursor() as cursor:                  # DictCursor도 가능
        cnt = cursor.execute(sql, [값, ...])       # %s placeholder
        rows = cursor.fetchall()                   # SELECT일 때
        conn.commit()                              # DML일 때
```

- 연결 → Cursor → execute → fetch → close. `with` 문을 쓰면 close는 자동이다.
- DML은 `commit()`해야 반영된다. PyMySQL은 autocommit이 기본으로 꺼져 있다.
- 값은 SQL 문자열에 직접 넣지 말고 `%s` placeholder로 전달한다.
- `fetchall()`은 튜플의 튜플, `DictCursor`는 딕셔너리 리스트, `fetchone()`은 튜플 하나 또는 `None`이다.

SQL 기초 시리즈는 여기까지다. Python 기초에서 배운 `with` 문, 튜플 대입, 모듈이 DB 연동 코드에 그대로 쓰였다.
