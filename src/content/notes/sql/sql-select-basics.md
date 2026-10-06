---
title: "SELECT 기본: 컬럼 조회·WHERE 조건·ORDER BY 정렬"
description: "SELECT로 원하는 컬럼을 조회하고, 연산자와 별칭으로 결과를 가공하고, WHERE로 행을 고르고, ORDER BY로 정렬하는 방법을 정리합니다."
category: 'Tech'
subcategory: 'SQL'
series: 'SQL 기초'
seriesOrder: 3
originalNotebook: "02_basic_select.sql"
tags: ["SQL","MySQL","SELECT","WHERE"]
date: 2026-04-22
---

> SKN31 SQL 실습 파일 `02_basic_select.sql`의 필기를 바탕으로 정리했습니다.
> 예제는 수업 실습용 `emp` 테이블로 MariaDB 10.11(MySQL 호환)에서 다시 실행했고, 결과가 긴 경우 앞쪽 일부 행만 표시했습니다.

## 이 글에서 다루는 것

- `SELECT ... FROM`으로 컬럼을 고르고, `DISTINCT`로 중복을 없애는 방법
- 산술 연산자, `concat()`, 별칭(`AS`)으로 조회 결과를 가공하는 방법
- `WHERE`에서 쓰는 비교·`BETWEEN`·`IN`·`LIKE`·`IS NULL` 연산자
- 조건이 여러 개일 때 `AND`·`OR`의 우선순위
- `ORDER BY`로 정렬하는 방법

## 실습 데이터: emp 테이블

`testdb`에 만든 직원 테이블이다. 직원 107명의 정보가 들어 있다.

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `emp_id` | `INT` (PK) | 직원 ID |
| `emp_name` | `VARCHAR(20)` | 직원 이름 |
| `job` | `VARCHAR(35)` | 담당 업무 |
| `mgr_id` | `INT` | 상사 ID |
| `hire_date` | `DATE` | 입사일 |
| `salary` | `DECIMAL(7,2)` | 월급 |
| `comm_pct` | `DECIMAL(2,2)` | 커미션 비율 |
| `dept_name` | `VARCHAR(30)` | 부서 이름 |

```sql
select * from emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_name</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>AD_PRES</td><td><span class="sql-null">NULL</span></td><td>2003-06-17</td><td>24000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr><tr><td>101</td><td>Neena</td><td>AD_VP</td><td>100</td><td>2005-09-21</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr><tr><td>102</td><td>Lex</td><td>AD_VP</td><td>100</td><td>2001-01-13</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr></tbody></table></div></div>

## SELECT 기본 구문

```sql
SELECT 컬럼명, 컬럼명 [, ...]   -- 조회할 컬럼 지정. * 는 모든 컬럼
FROM   테이블명;                -- 조회할 테이블 지정
```

- SQL은 대소문자를 구분하지 않는다.
- `USE`로 DB를 지정하지 않았다면 `testdb.emp`처럼 `DB이름.테이블이름`으로 쓴다.

```sql
-- EMP 테이블의 모든 컬럼의 모든 항목을 조회 (전 직원 정보 조회)
select * from testdb.emp;

use testdb;
select * from emp;
```

**EMP 테이블의 직원 ID(emp_id), 직원 이름(emp_name), 업무(job) 컬럼의 값을 조회**

```sql
select emp_id,
       emp_name,
       job
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>AD_PRES</td></tr><tr><td>101</td><td>Neena</td><td>AD_VP</td></tr><tr><td>102</td><td>Lex</td><td>AD_VP</td></tr><tr><td>103</td><td>Alexander</td><td>IT_PROG</td></tr><tr><td>104</td><td>Bruce</td><td>IT_PROG</td></tr></tbody></table></div></div>

### DISTINCT: 중복 제거

`distinct 컬럼명`은 중복된 결과를 하나만 남긴다.

**EMP 테이블의 업무(job)가 어떤 값들로 구성되었는지 조회. 동일한 값은 하나씩만 조회**

```sql
select distinct job from emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 19행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>job</th></tr></thead><tbody><tr><td>AD_PRES</td></tr><tr><td>AD_VP</td></tr><tr><td>IT_PROG</td></tr><tr><td>FI_MGR</td></tr><tr><td>FI_ACCOUNT</td></tr></tbody></table></div></div>

컬럼을 두 개 이상 쓰면 **행 기준**으로 중복을 판단한다. `job`과 `dept_name`의 **조합**이 같은 행만 하나로 합쳐진다.

```sql
select distinct job, dept_name from emp; -- 행 기준 중복
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 22행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>job</th><th>dept_name</th></tr></thead><tbody><tr><td>AD_PRES</td><td>Executive</td></tr><tr><td>AD_VP</td><td>Executive</td></tr><tr><td>IT_PROG</td><td>IT</td></tr><tr><td>FI_MGR</td><td>Finance</td></tr><tr><td>FI_ACCOUNT</td><td>Finance</td></tr></tbody></table></div></div>

### 별칭(AS)

```sql
컬럼명 [AS] 별칭
```

- 조회 결과의 컬럼 이름을 별칭으로 바꿔서 반환한다.
- `as`는 생략할 수 있다.
- 별칭에 공백이나 특수문자처럼 컬럼명에 못 쓰는 문자가 들어가면 큰따옴표(`" "`)로 감싼다.

**emp_id는 직원ID, emp_name은 직원이름, hire_date는 입사일, salary는 급여, dept_name은 소속부서 별칭으로 조회**

```sql
select emp_id    as "직원 ID",    -- as 는 생략 가능
       emp_name  as "직원 이름",  -- 별칭에 공백이 들어가면 " " 로 묶어준다
       hire_date as 입사일,
       salary    as 급여,
       dept_name as 소속부서
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>직원 ID</th><th>직원 이름</th><th>입사일</th><th>급여</th><th>소속부서</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>2003-06-17</td><td>24000.00</td><td>Executive</td></tr><tr><td>101</td><td>Neena</td><td>2005-09-21</td><td>17000.00</td><td>Executive</td></tr><tr><td>102</td><td>Lex</td><td>2001-01-13</td><td>17000.00</td><td>Executive</td></tr></tbody></table></div></div>

## 연산자

| 종류 | 연산자 |
|---|---|
| 산술 연산 | `+`, `-`, `*`, `/`, `%`, `mod`, `div`(몫) |
| 문자열 합치기 | `concat(값, 값, ...)` |

- 연산은 그 컬럼의 **모든 값에 일률적으로** 적용된다.
- 같은 컬럼을 여러 번 조회할 수 있다.
- 피연산자가 `NULL`이면 결과도 `NULL`이다.

```sql
select salary, salary * 12, salary * 24 from emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>salary</th><th>salary * 12</th><th>salary * 24</th></tr></thead><tbody><tr><td>24000.00</td><td>288000.00</td><td>576000.00</td></tr><tr><td>17000.00</td><td>204000.00</td><td>408000.00</td></tr><tr><td>17000.00</td><td>204000.00</td><td>408000.00</td></tr></tbody></table></div></div>

**직원의 이름(emp_name), 급여(salary), 급여를 연봉으로 조회 (곱하기 12)**

```sql
select emp_name,
       salary,
       salary * 12 as 연봉
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_name</th><th>salary</th><th>연봉</th></tr></thead><tbody><tr><td>Steven</td><td>24000.00</td><td>288000.00</td></tr><tr><td>Neena</td><td>17000.00</td><td>204000.00</td></tr><tr><td>Lex</td><td>17000.00</td><td>204000.00</td></tr></tbody></table></div></div>

**직원의 이름(emp_name), 급여(salary)를 조회하는데 급여 앞에 '$'를 붙여서 조회**

```sql
select emp_name,
       concat('$', salary, '원') as salary
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_name</th><th>salary</th></tr></thead><tbody><tr><td>Steven</td><td>$24000.00원</td></tr><tr><td>Neena</td><td>$17000.00원</td></tr><tr><td>Lex</td><td>$17000.00원</td></tr></tbody></table></div></div>

**직원의 ID, 이름, 급여, 커미션 비율(comm_pct), 급여에 커미션 비율을 곱한 값을 조회**

```sql
select emp_id,
       emp_name,
       salary,
       comm_pct,
       salary * comm_pct as "커미션 금액" -- 같은 행의 값끼리 계산
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>comm_pct</th><th>커미션 금액</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>24000.00</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>101</td><td>Neena</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>102</td><td>Lex</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>103</td><td>Alexander</td><td>9000.00</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>104</td><td>Bruce</td><td>6000.00</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr></tbody></table></div></div>

`comm_pct`가 `NULL`인 직원은 `커미션 금액`도 `NULL`이 된다. "피연산자가 NULL이면 결과도 NULL"이 실제로 보이는 예다. NULL을 0으로 바꿔 계산하는 방법은 단일행 함수 글의 `ifnull()`에서 다룬다.

## WHERE: 행 선택

`WHERE`는 조회할 **행**을 고르는 조건이다. `SELECT`뿐 아니라 `UPDATE`, `DELETE`에서도 같은 방식으로 쓴다.

| 연산자 | 의미 |
|---|---|
| `=`, `<>`(`!=`), `>`, `<`, `>=`, `<=` | 비교 |
| `BETWEEN a AND b` | a 이상 b 이하 (a, b 포함) |
| `IN (값, 값, ...)` | 목록 중 하나와 일치 |
| `LIKE` | 문자열 부분 일치. `%`(0글자 이상), `_`(정확히 1글자) |
| `IS NULL` | NULL인 값 |
| `NOT BETWEEN`, `NOT IN`, `NOT LIKE`, `IS NOT NULL` | 위 조건의 반대 |

> **주의: MySQL은 값을 비교할 때도 대소문자를 구분하지 않는다.**
> `where emp_name = 'steven'`으로 조회해도 `Steven`이 나온다. 대소문자를 구분하려면 컬럼명 앞에 `BINARY`를 붙인다.
> 예) `where BINARY emp_name = 'Steven'`

### 비교 연산자

**직원 ID(emp_id)가 110인 직원의 이름(emp_name)과 부서명(dept_name)을 조회**

```sql
select emp_name, dept_name
from   emp
where  emp_id = 110;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_name</th><th>dept_name</th></tr></thead><tbody><tr><td>John</td><td>Finance</td></tr></tbody></table></div></div>

**'Sales' 부서에 속하지 않은 직원들의 ID, 이름, 부서명을 조회**

```sql
select emp_id, emp_name, dept_name
from   emp
where  dept_name <> 'Sales';
-- where dept_name != 'Sales';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 71행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>dept_name</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>Executive</td></tr><tr><td>101</td><td>Neena</td><td>Executive</td></tr><tr><td>102</td><td>Lex</td><td>Executive</td></tr></tbody></table></div></div>

107명 중 71명이 조회됐다. Sales 부서 33명을 빼면 74명이어야 하는데 3명이 모자란다. 부서가 `NULL`인 직원 3명은 `<> 'Sales'` 비교 결과가 참도 거짓도 아닌 `NULL`이 되어 결과에서 빠지기 때문이다. 이 3명은 아래 `IS NULL` 예제에서 확인할 수 있다.

필기에는 `where binary dept_name = 'sales';`도 주석으로 남겨 두었다. `BINARY`를 붙이면 소문자 `'sales'`와 `'Sales'`가 다르게 비교되므로 결과가 없다.

```sql
select count(*) from emp where dept_name = 'sales';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>count(*)</th></tr></thead><tbody><tr><td>33</td></tr></tbody></table></div></div>

```sql
select count(*) from emp where binary dept_name = 'sales';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>count(*)</th></tr></thead><tbody><tr><td>0</td></tr></tbody></table></div></div>

**급여(salary)가 $10,000를 초과하는 직원의 ID, 이름, 급여를 조회**

```sql
select emp_id, emp_name, salary
from   emp
where  salary > 10000;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 15행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>24000.00</td></tr><tr><td>101</td><td>Neena</td><td>17000.00</td></tr><tr><td>102</td><td>Lex</td><td>17000.00</td></tr></tbody></table></div></div>

### BETWEEN

**커미션 비율(comm_pct)이 0.2~0.3 사이인 직원의 ID, 이름, 커미션 비율을 조회**

```sql
select emp_id, emp_name, comm_pct
from   emp
where  comm_pct between 0.2 and 0.3;
-- where comm_pct >= 0.2 and comm_pct <= 0.3;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 20행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>comm_pct</th></tr></thead><tbody><tr><td>146</td><td>Karen</td><td>0.30</td></tr><tr><td>147</td><td>Alberto</td><td>0.30</td></tr><tr><td>148</td><td>Gerald</td><td>0.30</td></tr></tbody></table></div></div>

`between 0.2 and 0.3`은 `>= 0.2 and <= 0.3`과 같다. 양 끝 값이 포함된다. 필기에서는 `not between`으로도 바꿔 실행해 보았다.

### IN

**업무(job)가 'IT_PROG'거나 'ST_MAN'인 직원의 ID, 이름, 업무를 조회**

```sql
select emp_id, emp_name, job
from   emp
where  job in ('IT_PROG', 'ST_MAN');
-- where job = 'IT_PROG' or job = 'ST_MAN'
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 10행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th></tr></thead><tbody><tr><td>103</td><td>Alexander</td><td>IT_PROG</td></tr><tr><td>104</td><td>Bruce</td><td>IT_PROG</td></tr><tr><td>105</td><td>David</td><td>IT_PROG</td></tr><tr><td>106</td><td>Valli</td><td>IT_PROG</td></tr><tr><td>107</td><td>Diana</td><td>IT_PROG</td></tr></tbody></table></div></div>

`in`은 같은 컬럼에 대한 `or` 비교를 짧게 쓴 것이다.

### LIKE

| 패턴 | 의미 |
|---|---|
| `'S%'` | S로 시작 |
| `'%en'` | en으로 끝남 |
| `'%eve%'` | eve를 포함 |
| `'__e%'` | 세 번째 글자가 e |

**직원 이름(emp_name)이 S로 시작하는 직원의 ID, 이름을 조회**

```sql
select emp_id, emp_name
from   emp
where  emp_name like 'S%';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 13행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th></tr></thead><tbody><tr><td>100</td><td>Steven</td></tr><tr><td>116</td><td>Shelli</td></tr><tr><td>117</td><td>Sigal</td></tr><tr><td>123</td><td>Shanta</td></tr><tr><td>128</td><td>Steven</td></tr></tbody></table></div></div>

**직원 이름의 세 번째 문자가 "e"인 모든 사원의 이름을 조회**

```sql
select emp_name
from   emp
where  emp_name like '__e%';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 12행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_name</th></tr></thead><tbody><tr><td>Steven</td></tr><tr><td>Neena</td></tr><tr><td>Alexander</td></tr><tr><td>Alexander</td></tr><tr><td>Shelli</td></tr></tbody></table></div></div>

### ESCAPE: %나 _ 자체를 찾을 때

`%`와 `_`는 LIKE에서 특수한 의미를 가진다. 이 문자 자체를 찾으려면 `escape`로 탈출 문자를 지정한다.

**직원의 이름에 '%'가 들어가는 직원의 ID, 이름 조회**

```sql
select emp_id, emp_name
from   emp
where  emp_name like '%$%%' escape '$';
-- escape '문자' → 문자% , 문자_ 는 % 와 _ 를 그대로 비교
-- $% → %
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th></tr></thead><tbody><tr><td>200</td><td>Jenni%fer</td></tr></tbody></table></div></div>

`'%$%%'`를 나눠 읽으면 `%`(아무 글자) + `$%`(진짜 % 문자) + `%`(아무 글자)다.

### IS NULL

`NULL`은 `= null`로 비교할 수 없다. 반드시 `is null` / `is not null`을 쓴다.

**부서명(dept_name)이 null인 직원의 ID, 이름, 부서명을 조회**

```sql
select emp_id, emp_name, dept_name
from   emp
where  dept_name is null;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>dept_name</th></tr></thead><tbody><tr><td>147</td><td>Alberto</td><td><span class="sql-null">NULL</span></td></tr><tr><td>178</td><td>Kimberely</td><td><span class="sql-null">NULL</span></td></tr><tr><td>196</td><td>Alana</td><td><span class="sql-null">NULL</span></td></tr></tbody></table></div></div>

**커미션이 있는(comm_pct가 null이 아닌) 직원들의 모든 컬럼값을 조회**

```sql
select *
from   emp
where  comm_pct is not null;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 35행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_name</th></tr></thead><tbody><tr><td>145</td><td>John</td><td>SA_MAN</td><td>100</td><td>2004-10-01</td><td>14000.00</td><td>0.40</td><td>Sales</td></tr><tr><td>146</td><td>Karen</td><td>SA_MAN</td><td>100</td><td>2005-01-05</td><td>13500.00</td><td>0.30</td><td>Sales</td></tr><tr><td>147</td><td>Alberto</td><td>SA_MAN</td><td>100</td><td>2005-03-10</td><td>12000.00</td><td>0.30</td><td><span class="sql-null">NULL</span></td></tr></tbody></table></div></div>

### 함수와 연산을 조건에 쓰기

**2004년에 입사한 직원들의 ID, 이름, 입사일(hire_date)을 조회**

```sql
select emp_id, emp_name, hire_date
from   emp
where  year(hire_date) = 2004;
-- where hire_date between '2004-01-01' and '2004-12-31';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 10행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>hire_date</th></tr></thead><tbody><tr><td>120</td><td>Matthew</td><td>2004-07-18</td></tr><tr><td>133</td><td>Jason</td><td>2004-06-14</td></tr><tr><td>145</td><td>John</td><td>2004-10-01</td></tr></tbody></table></div></div>

`year()`는 날짜에서 연도만 꺼내는 함수다. 같은 조건을 `between`으로 날짜 범위를 줘서도 쓸 수 있다.

**연봉(salary * 12)이 200,000 이상인 직원들의 모든 정보를 조회**

```sql
select *
from   emp
where  salary * 12 >= 200000;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_name</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>AD_PRES</td><td><span class="sql-null">NULL</span></td><td>2003-06-17</td><td>24000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr><tr><td>101</td><td>Neena</td><td>AD_VP</td><td>100</td><td>2005-09-21</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr><tr><td>102</td><td>Lex</td><td>AD_VP</td><td>100</td><td>2001-01-13</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr></tbody></table></div></div>

## AND와 OR

조건이 여러 개면 `AND`나 `OR`로 묶는다.

- `AND`: 두 조건이 모두 참인 행만 조회
- `OR`: 두 조건 중 하나 이상이 참인 행을 조회
- 우선순위는 `AND`가 `OR`보다 높다.

```sql
where 조건1 and 조건2 or 조건3
-- 1. 조건1 and 조건2 를 먼저 계산
-- 2. 그 결과 or 조건3

where 조건1 and (조건2 or 조건3)
-- or 를 먼저 하려면 괄호로 묶는다
```

**'SA_REP' 업무를 담당하는 직원들 중 급여가 $9,000인 직원들을 조회**

```sql
select *
from   emp
where  job = 'SA_REP' and salary = 9000;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 2행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_name</th></tr></thead><tbody><tr><td>152</td><td>Peter</td><td>SA_REP</td><td>145</td><td>2005-08-20</td><td>9000.00</td><td>0.25</td><td>Sales</td></tr><tr><td>158</td><td>Allan</td><td>SA_REP</td><td>146</td><td>2004-08-01</td><td>9000.00</td><td>0.35</td><td>Sales</td></tr></tbody></table></div></div>

**업무가 'FI_ACCOUNT'거나 급여가 $8,000 이상인 직원들을 조회**

```sql
select *
from   emp
where  job = 'FI_ACCOUNT' or salary >= 8000;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 39행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_name</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>AD_PRES</td><td><span class="sql-null">NULL</span></td><td>2003-06-17</td><td>24000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr><tr><td>101</td><td>Neena</td><td>AD_VP</td><td>100</td><td>2005-09-21</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr><tr><td>102</td><td>Lex</td><td>AD_VP</td><td>100</td><td>2001-01-13</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>Executive</td></tr></tbody></table></div></div>

**업무에 'MAN'이 들어가는 직원들 중에서 부서가 'Shipping'이거나 2005년 이후 입사한 직원들을 조회**

```sql
select *
from   emp
where  job like '%MAN%' and (dept_name = 'Shipping' or year(hire_date) > 2005);
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 7행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_name</th></tr></thead><tbody><tr><td>120</td><td>Matthew</td><td>ST_MAN</td><td>100</td><td>2004-07-18</td><td>8000.00</td><td><span class="sql-null">NULL</span></td><td>Shipping</td></tr><tr><td>121</td><td>Adam</td><td>ST_MAN</td><td>100</td><td>2005-04-10</td><td>8200.00</td><td><span class="sql-null">NULL</span></td><td>Shipping</td></tr><tr><td>122</td><td>Payam</td><td>ST_MAN</td><td>100</td><td>2003-05-01</td><td>7900.00</td><td><span class="sql-null">NULL</span></td><td>Shipping</td></tr><tr><td>123</td><td>Shanta</td><td>ST_MAN</td><td>100</td><td>2005-10-10</td><td>6500.00</td><td><span class="sql-null">NULL</span></td><td>Shipping</td></tr><tr><td>124</td><td>Kevin</td><td>ST_MAN</td><td>100</td><td>2007-11-16</td><td>5800.00</td><td><span class="sql-null">NULL</span></td><td>Shipping</td></tr></tbody></table></div></div>

괄호가 없으면 `job like '%MAN%' and dept_name = 'Shipping'`이 먼저 계산되고, 그 결과에 `or year(hire_date) > 2005`가 붙는다. 그러면 업무에 MAN이 없는 2006년 이후 입사자까지 모두 조회된다. 두 쿼리의 행 수를 비교하면 차이가 보인다.

```sql
select count(*) as "괄호 있음" from emp
where  job like '%MAN%' and (dept_name = 'Shipping' or year(hire_date) > 2005);
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>괄호 있음</th></tr></thead><tbody><tr><td>7</td></tr></tbody></table></div></div>

```sql
select count(*) as "괄호 없음" from emp
where  job like '%MAN%' and dept_name = 'Shipping' or year(hire_date) > 2005;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>괄호 없음</th></tr></thead><tbody><tr><td>58</td></tr></tbody></table></div></div>

**업무에 'MAN'이 들어가는 직원들 중에서 'Marketing'이나 'Sales' 부서에 소속된 직원들의 ID, 이름, 업무, 부서를 조회**

```sql
select emp_id, emp_name, job, dept_name
from   emp
where  job like '%MAN%' and dept_name in ('Marketing', 'Sales');
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>dept_name</th></tr></thead><tbody><tr><td>145</td><td>John</td><td>SA_MAN</td><td>Sales</td></tr><tr><td>146</td><td>Karen</td><td>SA_MAN</td><td>Sales</td></tr><tr><td>148</td><td>Gerald</td><td>SA_MAN</td><td>Sales</td></tr><tr><td>149</td><td>Eleni</td><td>SA_MAN</td><td>Sales</td></tr><tr><td>201</td><td>Michael</td><td>MK_MAN</td><td>Marketing</td></tr></tbody></table></div></div>

## ORDER BY: 정렬

```sql
ORDER BY 정렬기준컬럼 [ASC | DESC] [, 정렬기준컬럼 [ASC | DESC]]
```

- `order by`는 SELECT문의 **마지막**에 온다.
- 정렬 기준은 컬럼 이름이나 **컬럼 순번**(SELECT절에 쓴 순서, 1부터 시작)으로 지정한다.
  - `select salary, hire_date from emp`에서 salary로 정렬하려면 `order by salary` 또는 `order by 1`
- 정렬 방식
  - `ASC`: 오름차순(ascending). 기본값이라 생략할 수 있다.
  - `DESC`: 내림차순(descending)

오름차순일 때 값의 순서는 다음과 같다.

| 타입 | 오름차순 순서 |
|---|---|
| 문자열 | 특수문자 → 숫자 → 대문자 → 소문자 → 한글 (유니코드 순서) |
| 날짜 | 과거 → 미래 |
| NULL | 가장 먼저 나온다 |

`order by salary asc, emp_id desc`처럼 여러 기준을 쓰면 salary로 전체를 정렬하고, salary가 같은 행끼리 emp_id로 다시 정렬한다.

**직원들의 전체 정보를 직원 ID(emp_id)가 큰 순서대로 정렬해 조회**

```sql
select *
from   emp
order by emp_id desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_name</th></tr></thead><tbody><tr><td>206</td><td>William</td><td>AC_ACCOUNT</td><td>205</td><td>2002-06-07</td><td>8300.00</td><td><span class="sql-null">NULL</span></td><td>Accounting</td></tr><tr><td>205</td><td>Shelley</td><td>AC_MGR</td><td>101</td><td>2002-06-07</td><td>12008.00</td><td><span class="sql-null">NULL</span></td><td>Accounting</td></tr><tr><td>204</td><td>Hermann</td><td>PR_REP</td><td>101</td><td>2002-06-07</td><td>10000.00</td><td><span class="sql-null">NULL</span></td><td>Public Relations</td></tr></tbody></table></div></div>

**직원들의 ID, 이름, 업무, 급여를 업무 순서대로(A → Z) 조회하고, 업무가 같은 직원들은 급여가 높은 순서대로 2차 정렬**

```sql
select emp_id, emp_name, job, salary
from   emp
order by 3 asc, 4 desc; -- select절의 컬럼 순번을 사용할 수 있다 (1부터 시작)
-- order by job asc, salary desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 6행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job</th><th>salary</th></tr></thead><tbody><tr><td>206</td><td>William</td><td>AC_ACCOUNT</td><td>8300.00</td></tr><tr><td>205</td><td>Shelley</td><td>AC_MGR</td><td>12008.00</td></tr><tr><td>200</td><td>Jenni%fer</td><td>AD_ASST</td><td>4400.00</td></tr><tr><td>100</td><td>Steven</td><td>AD_PRES</td><td>24000.00</td></tr><tr><td>101</td><td>Neena</td><td>AD_VP</td><td>17000.00</td></tr><tr><td>102</td><td>Lex</td><td>AD_VP</td><td>17000.00</td></tr></tbody></table></div></div>

`AC_ACCOUNT`, `AC_MGR`, `AD_ASST`처럼 업무가 알파벳순으로 나오고, `AD_VP`처럼 같은 업무 안에서는 급여가 높은 순으로 나온다.

**급여가 $5,000을 넘는 직원의 ID, 이름, 급여를 급여가 높은 순서부터 조회**

```sql
select emp_id, emp_name, salary
from   emp
where  salary > 5000
order by salary desc; -- order by 3 desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 59행 중 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>24000.00</td></tr><tr><td>101</td><td>Neena</td><td>17000.00</td></tr><tr><td>102</td><td>Lex</td><td>17000.00</td></tr></tbody></table></div></div>

`where`로 행을 먼저 고르고, 남은 행을 `order by`로 정렬한다.

## 정리

```sql
SELECT   [DISTINCT] 컬럼 [AS 별칭], 연산식, ...
FROM     테이블
WHERE    행 조건 (AND / OR / 괄호)
ORDER BY 컬럼 또는 순번 [ASC | DESC], ...;
```

- `distinct`는 SELECT절 전체 컬럼 조합을 기준으로 중복을 없앤다.
- NULL과의 연산 결과는 NULL이고, NULL 비교는 `is null`로 한다.
- MySQL은 문자열 값 비교에서도 대소문자를 구분하지 않는다. 구분하려면 `BINARY`를 쓴다.
- `AND`가 `OR`보다 먼저 계산되므로, 의도한 순서가 다르면 괄호로 묶는다.
