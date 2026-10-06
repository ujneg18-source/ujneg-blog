---
title: "단일행 함수: 문자·숫자·날짜·조건 처리"
description: "행마다 값을 가공하는 단일행 함수를 문자열·숫자·날짜·조건 처리로 나눠 정리하고, IF·IFNULL·CASE로 값에 따라 다른 결과를 내는 방법을 다룹니다."
category: 'Tech'
subcategory: 'SQL'
series: 'SQL 기초'
seriesOrder: 4
originalNotebook: "03_function.sql"
tags: ["SQL","MySQL","Function","CASE"]
date: 2026-04-22
---

> SKN31 SQL 실습 파일 `03_function.sql`의 필기를 바탕으로 정리했습니다.
> 예제는 `emp` 테이블로 MariaDB 10.11(MySQL 호환)에서 다시 실행했습니다. `now()`처럼 실행 시점에 따라 달라지는 결과는 블로그 정리 시점(2026년 10월)에 실행한 값입니다. `보충`으로 표시한 부분은 원본 필기에 없던 예제입니다.

## 이 글에서 다루는 것

- 단일행 함수와 다중행(집계) 함수의 차이
- 문자열 함수: `char_length`, `upper`/`lower`, `lpad`/`rpad`, `format` 등
- 숫자 함수: `round`, `truncate`, `ceil`, `floor`
- 날짜 함수: `now`, `adddate`/`subdate`, `datediff`, `timestampdiff`, `date_format`
- 조건 처리: `ifnull`, `if`, `CASE`

## 단일행 함수와 다중행 함수

| 구분 | 처리 방식 | 사용 위치 |
|---|---|---|
| 단일행 함수 | 행마다 하나씩 처리한다. 입력 행 수 = 결과 행 수 | `SELECT`, `WHERE` |
| 다중행 함수 | 여러 행을 묶어서 한 번에 처리한다. 집계 함수, 그룹 함수라고도 한다 | `SELECT`, `HAVING` |

다중행 함수는 `WHERE`절에 쓸 수 없다. `WHERE`에서 집계 결과가 필요하면 서브쿼리를 이용한다. 다중행 함수는 다음 글에서 다룬다.

함수 안에 함수를 넣어 여러 처리를 한 번에 할 수도 있다. 예) `char_length(concat('A', 'B'))`

## 문자열 함수

| 함수 | 설명 |
|---|---|
| `char_length(v)` | 글자 수 반환 |
| `concat(v1, v2, ...)` | 값들을 합쳐 하나의 문자열로 반환 |
| `format(숫자, 소수부 자릿수)` | 정수부에 `,` 단위 구분자를 넣고 지정한 소수 자리까지 문자열로 반환 |
| `upper(v)`, `lower(v)` | 모두 대문자 / 소문자로 변환 |
| `insert(기준, 위치, 길이, 삽입문자열)` | **위치 기준** 변경. 위치(1부터)에서 길이만큼 지우고 삽입문자열을 넣는다 |
| `replace(기준, 원래문자열, 바꿀문자열)` | **문자열 기준** 변경. 원래문자열을 바꿀문자열로 바꾼다 |
| `left(기준, 길이)`, `right(기준, 길이)` | 왼쪽 / 오른쪽에서 길이만큼 잘라 반환 |
| `substring(기준, 시작위치, 길이)` | 시작위치부터 길이만큼 잘라 반환. 길이를 생략하면 끝까지 |
| `substring_index(기준, 구분자, 개수)` | 구분자로 나눈 뒤 개수만큼 반환. 양수는 앞에서부터, 음수는 뒤에서부터 |
| `ltrim`, `rtrim`, `trim` | 왼쪽 / 오른쪽 / 양쪽 공백 제거. 중간 공백은 유지 |
| `trim(방향 제거할문자열 from 기준)` | 방향(`both`, `leading`, `trailing`)에 있는 문자열 제거 |
| `lpad(기준, 길이, 채울문자열)`, `rpad(...)` | 길이만큼 늘리고 남는 자리를 왼쪽 / 오른쪽에 채운다. 기준 문자열이 더 길면 자른다 |

**직원의 이름(emp_name)을 모두 대문자, 소문자로 바꾸고 이름 글자 수를 조회**

```sql
select emp_name,
       upper(emp_name)       "대문자 이름",
       lower(emp_name)       "소문자 이름",
       char_length(emp_name) "이름 글자수"
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_name</th><th>대문자 이름</th><th>소문자 이름</th><th>이름 글자수</th></tr></thead><tbody><tr><td>Steven</td><td>STEVEN</td><td>steven</td><td>6</td></tr><tr><td>Neena</td><td>NEENA</td><td>neena</td><td>5</td></tr><tr><td>Lex</td><td>LEX</td><td>lex</td><td>3</td></tr></tbody></table></div></div>

**직원 이름의 자릿수를 15자리로 맞추고, 15자가 안 되는 이름은 공백을 앞에 붙여 조회**

```sql
select lpad(emp_name, 15, ' ') "emp_name",
       rpad(emp_name, 15, ' ') "emp_name2",
       lpad(emp_name, 5, ' ')  "emp_name3",  -- 5글자 이상인 것은 잘라낸다
       char_length(lpad(emp_name, 15, ' '))
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_name</th><th>emp_name2</th><th>emp_name3</th><th>char_length(lpad(emp_name, 15, &#x27; &#x27;))</th></tr></thead><tbody><tr><td>         Steven</td><td>Steven         </td><td>Steve</td><td>15</td></tr><tr><td>          Neena</td><td>Neena          </td><td>Neena</td><td>15</td></tr><tr><td>            Lex</td><td>Lex            </td><td>  Lex</td><td>15</td></tr></tbody></table></div></div>

`emp_name3`을 보면 `Steven`이 `Steve`가 됐다. 5글자보다 긴 이름은 앞 5글자만 남는다. `lpad`는 채우기만 하는 게 아니라 **길이를 맞추는** 함수라는 점을 메모해 두었다.

**이름이 10글자 이상인 직원들의 이름과 글자 수 조회**

```sql
select emp_name, char_length(emp_name) "글자수"
from   emp
where  char_length(emp_name) >= 10;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 2행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_name</th><th>글자수</th></tr></thead><tbody><tr><td>Jose Manuel</td><td>11</td></tr><tr><td>Christopher</td><td>11</td></tr></tbody></table></div></div>

단일행 함수는 `WHERE`에서도 쓸 수 있다.

**급여를 소수 한 자리까지, 단위 구분자와 $ 표시를 붙여 조회**

```sql
select concat('$', format(salary, 1)) "salary"
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>salary</th></tr></thead><tbody><tr><td>$24,000.0</td></tr><tr><td>$17,000.0</td></tr><tr><td>$17,000.0</td></tr></tbody></table></div></div>

### 보충: 필기에 설명만 있던 문자열 함수

필기에 설명만 적고 실행하지 않은 함수들을 한 번에 실행해 보았다.

```sql
select insert('abcdefg', 2, 3, '★')           as "insert",
       replace('abc-abc', 'abc', 'X')         as "replace",
       left('abcdefg', 3)                     as "left",
       substring('abcdefg', 2, 3)             as "substring",
       substring_index('a.b.c.d', '.', 2)     as "index 2",
       substring_index('a.b.c.d', '.', -2)    as "index -2",
       trim(both 'a' from 'aaa안녕aaa')        as "trim";
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>insert</th><th>replace</th><th>left</th><th>substring</th><th>index 2</th><th>index -2</th><th>trim</th></tr></thead><tbody><tr><td>a★efg</td><td>X-X</td><td>abc</td><td>bcd</td><td>a.b</td><td>c.d</td><td>안녕</td></tr></tbody></table></div></div>

`insert`는 2번째 위치부터 3글자(`bcd`)를 지우고 `★`를 넣었고, `replace`는 `abc`라는 **문자열**을 찾아 모두 바꿨다. 위치로 바꾸는지, 내용으로 바꾸는지가 두 함수의 차이다.

## 숫자 함수

| 함수 | 설명 |
|---|---|
| `abs(값)` | 절댓값 |
| `round(값, 자릿수)` | 자릿수 이하에서 반올림. 양수는 소수부, 음수는 정수부 자리. 기본값 0은 정수로 반올림 |
| `truncate(값, 자릿수)` | 자릿수 이하에서 버림. 자릿수 규칙은 `round`와 같다 |
| `ceil(값)` | 소수점 이하를 올린다. 값보다 크거나 같은 정수 중 가장 작은 정수 |
| `floor(값)` | 소수점 이하를 버린다. 값보다 작거나 같은 정수 중 가장 큰 정수 |
| `sign(값)` | 부호를 정수로 반환 (양수 1, 0, 음수 -1) |
| `mod(n1, n2)` | `n1 % n2` |

```sql
select round(12345.12645, 2),   -- 자리 2 이하에서 반올림
       round(12345.12345, -2),  -- 자리 -2 이하에서 반올림
       round(12345.12345);      -- 자리 0 이하에서 반올림(정수)
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>round(12345.12645, 2)</th><th>round(12345.12345, -2)</th><th>round(12345.12345)</th></tr></thead><tbody><tr><td>12345.13</td><td>12300</td><td>12345</td></tr></tbody></table></div></div>

**각 직원의 ID, 이름, 급여, 그리고 15% 인상된 급여를 조회. 인상된 급여는 올림해서 정수로 표시하고 별칭은 "SAL_RAISE"**

```sql
select emp_id,
       emp_name,
       salary,
       salary * 1.15,
       ceil(salary * 1.15)  "SAL_RAISE",  -- 정수로 올림
       floor(salary * 1.15) "SAL_DOWN"    -- 정수로 내림
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>salary * 1.15</th><th>SAL_RAISE</th><th>SAL_DOWN</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>24000.00</td><td>27600.0000</td><td>27600</td><td>27600</td></tr><tr><td>101</td><td>Neena</td><td>17000.00</td><td>19550.0000</td><td>19550</td><td>19550</td></tr><tr><td>102</td><td>Lex</td><td>17000.00</td><td>19550.0000</td><td>19550</td><td>19550</td></tr></tbody></table></div></div>

**위 SQL문에서 인상 급여와 기존 급여의 차액을 추가로 조회**

```sql
select emp_id,
       emp_name,
       salary,
       ceil(salary * 1.15)          "SAL_RAISE",
       ceil(salary * 1.15) - salary "차액"
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>SAL_RAISE</th><th>차액</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>24000.00</td><td>27600</td><td>3600.00</td></tr><tr><td>101</td><td>Neena</td><td>17000.00</td><td>19550</td><td>2550.00</td></tr><tr><td>102</td><td>Lex</td><td>17000.00</td><td>19550</td><td>2550.00</td></tr></tbody></table></div></div>

**커미션이 있는 직원들의 ID, 이름, 커미션 비율, 커미션 비율을 8% 인상한 결과를 조회. 인상한 결과는 소수점 2자리 이하에서 반올림**

```sql
select emp_id,
       emp_name,
       comm_pct,
       comm_pct * 1.08,
       round(comm_pct * 1.08, 2)    as "반올림",
       truncate(comm_pct * 1.08, 2) as "내림"
from   emp
where  comm_pct is not null
order by comm_pct; -- order by 3
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 35행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>comm_pct</th><th>comm_pct * 1.08</th><th>반올림</th><th>내림</th></tr></thead><tbody><tr><td>179</td><td>Charles</td><td>0.10</td><td>0.1080</td><td>0.11</td><td>0.10</td></tr><tr><td>165</td><td>David</td><td>0.10</td><td>0.1080</td><td>0.11</td><td>0.10</td></tr><tr><td>166</td><td>Sundar</td><td>0.10</td><td>0.1080</td><td>0.11</td><td>0.10</td></tr><tr><td>167</td><td>Amit</td><td>0.10</td><td>0.1080</td><td>0.11</td><td>0.10</td></tr><tr><td>164</td><td>Mattea</td><td>0.10</td><td>0.1080</td><td>0.11</td><td>0.10</td></tr></tbody></table></div></div>

셋째 자리가 5 이상일 때 `round`와 `truncate`의 차이가 드러난다. `0.10 * 1.08 = 0.1080`은 반올림하면 `0.11`, 내림하면 `0.10`이다. 반면 `0.15 * 1.08 = 0.1620`은 셋째 자리가 2라서 둘 다 `0.16`이다.

## 날짜 함수

| 함수 | 설명 |
|---|---|
| `now()`, `curdate()`, `curtime()` | 현재 일시 / 날짜 / 시간 |
| `year()`, `month()`, `day()` | 년, 월, 일 추출 |
| `hour()`, `minute()`, `second()`, `microsecond()` | 시, 분, 초, 마이크로초 추출 |
| `date()`, `time()` | 일시에서 날짜 / 시간만 추출 |
| `adddate(일시, INTERVAL 값 단위)`, `subdate(...)` | 일시에 기간을 더하고 / 뺀다 |
| `datediff(날짜1, 날짜2)` | 날짜1 - 날짜2의 일수 |
| `timediff(시간1, 시간2)` | 시간1 - 시간2를 `시:분:초`로 반환 |
| `timestampdiff(단위, 시작일시, 끝일시)` | 끝일시 - 시작일시를 지정한 단위로 계산 |
| `dayofweek(날짜)` | 요일을 정수로 반환 (1: 일요일 ~ 7: 토요일) |
| `date_format(일시, 형식문자열)` | 일시를 원하는 형식의 문자열로 반환 |

`INTERVAL`에 쓰는 단위: `MICROSECOND`, `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH`, `QUARTER`(분기, 3개월), `YEAR`

### 현재 일시와 부분 추출

```sql
select now(), curdate(), curtime();
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>now()</th><th>curdate()</th><th>curtime()</th></tr></thead><tbody><tr><td>2026-10-06 14:16:10</td><td>2026-10-06</td><td>14:16:10</td></tr></tbody></table></div></div>

```sql
select year(now())      "년도",
       month(curdate()) "월",
       day(curdate())   "일",
       date(now()),
       time(now());
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>년도</th><th>월</th><th>일</th><th>date(now())</th><th>time(now())</th></tr></thead><tbody><tr><td>2026</td><td>10</td><td>6</td><td>2026-10-06</td><td>14:16:10</td></tr></tbody></table></div></div>

### 기간 더하고 빼기

```sql
select subdate(curdate(), interval 10 month),
       curdate(),
       adddate(curdate(), interval 10 month);
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>subdate(curdate(), interval 10 month)</th><th>curdate()</th><th>adddate(curdate(), interval 10 month)</th></tr></thead><tbody><tr><td>2025-12-06</td><td>2026-10-06</td><td>2027-08-06</td></tr></tbody></table></div></div>

```sql
select now(),
       adddate(now(), interval 3 week)   "3주후",
       adddate(now(), interval 10 hour)  "10시간 후",
       adddate(now(), interval -10 hour) "10시간 전";
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>now()</th><th>3주후</th><th>10시간 후</th><th>10시간 전</th></tr></thead><tbody><tr><td>2026-10-06 14:16:10</td><td>2026-10-27 14:16:10</td><td>2026-10-07 00:16:10</td><td>2026-10-06 04:16:10</td></tr></tbody></table></div></div>

`adddate`에 음수를 넣으면 `subdate`와 같은 결과가 나온다.

### 날짜·시간 차이

```sql
select datediff(curdate(), '2024-10-10')        "며칠 지났는지",
       timestampdiff(month, '2024-10-10', now()) "몇 달 지났는지",
       timestampdiff(hour, '2024-10-10', now())  "몇 시간 지났는지";
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>며칠 지났는지</th><th>몇 달 지났는지</th><th>몇 시간 지났는지</th></tr></thead><tbody><tr><td>726</td><td>23</td><td>17438</td></tr></tbody></table></div></div>

`datediff`는 **앞에서 뒤를** 빼고, `timestampdiff`는 **뒤에서 앞을** 뺀다. 인자 순서가 반대라서 헷갈리기 쉬운 부분이다.

**부서 이름이 'IT'인 직원들의 '입사일로부터 10일 전', 입사일, '입사일로부터 10일 후' 날짜를 조회**

```sql
select subdate(hire_date, interval 10 day) "입사 10일 전 날짜",
       hire_date,
       adddate(hire_date, interval 10 day) "입사 10일 후 날짜"
from   emp
where  dept_name = 'IT';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 5행</div><div class="sql-result-scroll"><table><thead><tr><th>입사 10일 전 날짜</th><th>hire_date</th><th>입사 10일 후 날짜</th></tr></thead><tbody><tr><td>2005-12-24</td><td>2006-01-03</td><td>2006-01-13</td></tr><tr><td>2007-05-11</td><td>2007-05-21</td><td>2007-05-31</td></tr><tr><td>2005-06-15</td><td>2005-06-25</td><td>2005-07-05</td></tr><tr><td>2006-01-26</td><td>2006-02-05</td><td>2006-02-15</td></tr><tr><td>2007-01-28</td><td>2007-02-07</td><td>2007-02-17</td></tr></tbody></table></div></div>

**각 직원의 이름, 근무 개월 수(입사일부터 현재까지의 달 수)를 계산해 조회. 근무 개월 수 내림차순으로 정렬**

```sql
select emp_name,
       timestampdiff(month, hire_date, curdate()) "근무 개월수"
from   emp
order by 2 desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_name</th><th>근무 개월수</th></tr></thead><tbody><tr><td>Lex</td><td>308</td></tr><tr><td>Shelley</td><td>291</td></tr><tr><td>Susan</td><td>291</td></tr></tbody></table></div></div>

**300개월 이상 근무한 직원들만 조회**

```sql
select * from emp
where  timestampdiff(month, hire_date, curdate()) >= 300;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_name</th></tr></thead><tbody><tr><td>102</td><td>Lex</td><td>AD_VP</td><td>100</td><td>2001-01-13</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr></tbody></table></div></div>

실행 시점 기준이라 결과 행 수는 실행하는 날짜에 따라 달라진다.

### date_format: 원하는 형식으로 출력

| 명시자 | 의미 |
|---|---|
| `%Y` | 연도 4자리 |
| `%m` | 월 2자리 (01 ~ 12) |
| `%d` | 일 2자리 (01 ~ 31) |
| `%H` | 시간 (00 ~ 23) |
| `%i` | 분 2자리 |
| `%s` | 초 2자리 |
| `%p` | AM, PM |
| `%W` | 요일 이름 |

**ID가 200인 직원의 이름, 입사일을 조회. 입사일은 yyyy년 mm월 dd일 형식으로 출력**

```sql
select emp_name,
       date_format(hire_date, '%Y년 %m월 %d일')
from   emp
where  emp_id = 200;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_name</th><th>date_format(hire_date, &#x27;%Y년 %m월 %d일&#x27;)</th></tr></thead><tbody><tr><td>Jenni%fer</td><td>2003년 09월 17일</td></tr></tbody></table></div></div>

```sql
select date_format(now(), '%Y년 %m월 %d일 %H시 %i분 %s초');
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>date_format(now(), &#x27;%Y년 %m월 %d일 %H시 %i분 %s초&#x27;)</th></tr></thead><tbody><tr><td>2026년 10월 06일 14시 16분 10초</td></tr></tbody></table></div></div>

## 조건 처리 함수

| 함수 | 설명 |
|---|---|
| `ifnull(기준값, 기본값)` | 기준값이 `NULL`이면 기본값을, 아니면 기준값을 반환 |
| `if(조건, 참일때값, 거짓일때값)` | 조건이 참이면 앞의 값, 거짓이면 뒤의 값 |

**직원의 ID, 이름, 업무, 부서를 조회. 부서가 없는 경우 '배치 전'을 출력**

```sql
select emp_id, emp_name, job, dept_name,
       ifnull(dept_name, '----배치 전') "dept_name"
from   emp
where  dept_name is null;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>dept_name</th><th>dept_name</th></tr></thead><tbody><tr><td>147</td><td>Alberto</td><td>SA_MAN</td><td><span class="sql-null">NULL</span></td><td>----배치 전</td></tr><tr><td>178</td><td>Kimberely</td><td>SA_REP</td><td><span class="sql-null">NULL</span></td><td>----배치 전</td></tr><tr><td>196</td><td>Alana</td><td>SH_CLERK</td><td><span class="sql-null">NULL</span></td><td>----배치 전</td></tr></tbody></table></div></div>

필기에서는 원래 전체 직원을 조회했고 `where dept_name is null;`을 주석으로 남겨 두었다. 블로그에서는 차이가 보이도록 그 조건을 켜서 실행했다. 원래 `dept_name` 컬럼은 `NULL`, `ifnull`을 적용한 컬럼은 `----배치 전`으로 나온다.

**직원의 ID, 이름, 급여, 커미션(salary * comm_pct)을 조회. 커미션이 없는 직원은 0을 출력**

```sql
select emp_id,
       emp_name,
       salary,
       ifnull(salary * comm_pct, 0) "커미션"
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>커미션</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>24000.00</td><td>0.0000</td></tr><tr><td>101</td><td>Neena</td><td>17000.00</td><td>0.0000</td></tr><tr><td>102</td><td>Lex</td><td>17000.00</td><td>0.0000</td></tr></tbody></table></div></div>

SELECT 기본 글에서 `salary * comm_pct`가 `NULL`로 나왔던 문제를 `ifnull`로 해결한 것이다.

**salary가 10000 이상이면 'A등급', 미만이면 'B등급' 출력**

```sql
select salary,
       if(salary >= 10000, 'A등급', 'B등급') "salary등급"
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>salary</th><th>salary등급</th></tr></thead><tbody><tr><td>24000.00</td><td>A등급</td></tr><tr><td>17000.00</td><td>A등급</td></tr><tr><td>17000.00</td><td>A등급</td></tr></tbody></table></div></div>

## CASE 문

`if`는 경우가 두 가지일 때 쓰기 좋고, 세 가지 이상이면 `CASE`를 쓴다. `CASE`는 두 가지 형태가 있다.

```sql
-- 1. 동등 비교: 컬럼 값이 비교값과 같은지
case 컬럼 when 비교값 then 출력값
         [when 비교값 then 출력값]
         [else 출력값]
end

-- 2. 조건 비교: 조건식이 참인지
case when 조건 then 출력값
     [when 조건 then 출력값]
     [else 출력값]
end
```

- 위에서부터 차례로 확인하고, 처음 만족하는 `when`의 값을 반환한다.
- `else`를 생략했는데 일치하는 `when`이 없으면 `NULL`을 반환한다.

**급여 등급을 10000 이상이면 '1등급', 10000 미만이면 '2등급'으로 조회**

```sql
select salary,
       case when salary >= 10000 then '1등급'
            else '2등급' end "급여 등급"
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>salary</th><th>급여 등급</th></tr></thead><tbody><tr><td>24000.00</td><td>1등급</td></tr><tr><td>17000.00</td><td>1등급</td></tr><tr><td>17000.00</td><td>1등급</td></tr></tbody></table></div></div>

**20000 이상은 '1등급', 10000 미만은 '3등급', 나머지는 '2등급'**

```sql
select salary,
       case when salary >= 20000 then '1등급'
            when salary < 10000  then '3등급'
            else '2등급'  -- when salary between 10000 and 19999.9
       end "급여 등급"
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>salary</th><th>급여 등급</th></tr></thead><tbody><tr><td>24000.00</td><td>1등급</td></tr><tr><td>17000.00</td><td>2등급</td></tr><tr><td>17000.00</td><td>2등급</td></tr><tr><td>9000.00</td><td>3등급</td></tr><tr><td>6000.00</td><td>3등급</td></tr></tbody></table></div></div>

`else`가 "20000 미만이면서 10000 이상"을 맡는다. 위에서 두 조건을 이미 걸렀기 때문에 `else`에 범위를 다시 쓰지 않아도 된다.

**업무(job)가 'AD_PRES'면 '대표', 'FI_ACCOUNT'면 '회계', 'PU_CLERK'면 '구매'로 출력**

```sql
select emp_id,
       emp_name,
       job,
       case job when 'AD_PRES'    then '대표'
                when 'FI_ACCOUNT' then '회계'
                when 'PU_CLERK'   then '구매'
                else job  -- 출력값에 컬럼명을 쓰면 그 행의 원래 값을 출력
       end "job"
from   emp
where  job in ('AD_PRES', 'FI_ACCOUNT', 'PU_CLERK', 'IT_PROG');
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 15행 중 10행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>job</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>AD_PRES</td><td>대표</td></tr><tr><td>103</td><td>Alexander</td><td>IT_PROG</td><td>IT_PROG</td></tr><tr><td>104</td><td>Bruce</td><td>IT_PROG</td><td>IT_PROG</td></tr><tr><td>105</td><td>David</td><td>IT_PROG</td><td>IT_PROG</td></tr><tr><td>106</td><td>Valli</td><td>IT_PROG</td><td>IT_PROG</td></tr><tr><td>107</td><td>Diana</td><td>IT_PROG</td><td>IT_PROG</td></tr><tr><td>109</td><td>Daniel</td><td>FI_ACCOUNT</td><td>회계</td></tr><tr><td>110</td><td>John</td><td>FI_ACCOUNT</td><td>회계</td></tr><tr><td>111</td><td>Ismael</td><td>FI_ACCOUNT</td><td>회계</td></tr><tr><td>112</td><td>Jose Manuel</td><td>FI_ACCOUNT</td><td>회계</td></tr></tbody></table></div></div>

`IT_PROG`는 `when`에 없으므로 `else job`에 걸려 원래 값 `IT_PROG`가 그대로 나온다. `else`에 컬럼명을 쓰면 "해당 없으면 원래 값 유지"가 된다.

**부서 이름과 급여 인상분을 조회. 'IT'는 급여의 10%, 'Shipping'은 20%, 'Finance'는 30%, 나머지는 0**

```sql
select dept_name,
       salary,
       case dept_name when 'IT'       then salary * 0.1
                      when 'Shipping' then salary * 0.2
                      when 'Finance'  then salary * 0.3
                      else 0
       end "급여 인상분"
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_name</th><th>salary</th><th>급여 인상분</th></tr></thead><tbody><tr><td>Executive</td><td>24000.00</td><td>0.000</td></tr><tr><td>Executive</td><td>17000.00</td><td>0.000</td></tr><tr><td>Executive</td><td>17000.00</td><td>0.000</td></tr><tr><td>IT</td><td>9000.00</td><td>900.000</td></tr><tr><td>IT</td><td>6000.00</td><td>600.000</td></tr></tbody></table></div></div>

## 정리

| 목적 | 함수 |
|---|---|
| 글자 수, 대소문자 | `char_length`, `upper`, `lower` |
| 자리 맞추기, 자르기 | `lpad`, `rpad`, `left`, `right`, `substring` |
| 숫자 서식 | `format`, `round`, `truncate`, `ceil`, `floor` |
| 날짜 계산 | `adddate`, `subdate`, `datediff`, `timestampdiff` |
| 날짜 서식 | `date_format` |
| NULL 대체 | `ifnull` |
| 조건 분기 | `if`, `case when ... then ... else ... end` |

- 단일행 함수는 행마다 적용되고, `SELECT`와 `WHERE` 모두에서 쓸 수 있다.
- `datediff(뒤, 앞)`와 `timestampdiff(단위, 앞, 뒤)`는 인자 순서가 반대다.
- `CASE`의 `else`에 컬럼명을 쓰면 해당하지 않는 행은 원래 값이 나온다.
