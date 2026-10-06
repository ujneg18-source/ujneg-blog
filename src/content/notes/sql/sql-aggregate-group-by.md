---
title: "집계 함수와 GROUP BY: 그룹별 집계와 HAVING"
description: "sum·avg·count 같은 집계 함수가 NULL을 다루는 방식, GROUP BY로 그룹별 집계를 내는 방법, HAVING으로 집계 결과를 거르는 방법을 정리합니다."
category: 'Tech'
subcategory: 'SQL'
series: 'SQL 기초'
seriesOrder: 5
originalNotebook: "04_aggregateFunction_groupby.sql"
tags: ["SQL","MySQL","GROUP BY","Aggregation"]
date: 2026-04-22
---

> SKN31 SQL 실습 파일 `04_aggregateFunction_groupby.sql`의 필기를 바탕으로 정리했습니다.
> 예제는 `emp` 테이블로 MariaDB 10.11(MySQL 호환)에서 다시 실행했습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 집계 함수(다중행 함수)의 종류와 NULL 처리 규칙
- `count(*)`, `count(컬럼)`, `count(distinct 컬럼)`의 차이
- `GROUP BY`로 "~별 집계"를 만드는 방법
- `HAVING`으로 그룹을 거르는 방법과 `WHERE`와의 차이

## 집계 함수

여러 행을 묶어 하나의 값으로 계산하는 함수다. 집계 함수, 그룹 함수, 다중행 함수라고 부른다. 인수로는 컬럼을 넣는다.

| 함수 | 결과 |
|---|---|
| `sum()` | 합계 |
| `avg()` | 평균 |
| `min()`, `max()` | 최솟값, 최댓값 |
| `stddev()`, `variance()` | 표준편차, 분산 |
| `count(컬럼)` | NULL을 제외한 값의 개수 |
| `count(*)` | 전체 행 수. NULL과 관계없이 센다 |
| `count(distinct 컬럼)` | 고유값의 개수 |

필기에서 가장 강조한 규칙은 **NULL 처리**다.

- `count(*)`를 제외한 모든 집계 함수는 **NULL을 제외하고** 집계한다.
- 그래서 `avg()`, `variance()`, `stddev()`는 전체 행 수가 아니라 **NULL이 아닌 값들**의 평균·분산·표준편차가 된다.
- NULL을 0으로 보고 계산하려면 `avg(ifnull(컬럼, 0))`처럼 먼저 바꿔야 한다.

타입에 따라 쓸 수 있는 함수도 다르다.

- 문자열·일시 타입은 `max()`, `min()`, `count()`만 쓸 수 있다.
- 문자열의 `max()`는 사전순으로 가장 마지막 값, `min()`은 가장 첫 값이다.
- 일시 타입은 오래된 값일수록 작은 값이다.

### 전체 집계

**급여(salary)의 총합계, 평균, 최솟값, 최댓값, 표준편차, 분산을 조회**

```sql
select sum(salary),
       avg(salary),
       min(salary),
       max(salary),
       stddev(salary),
       variance(salary)
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>sum(salary)</th><th>avg(salary)</th><th>min(salary)</th><th>max(salary)</th><th>stddev(salary)</th><th>variance(salary)</th></tr></thead><tbody><tr><td>695416.00</td><td>6499.214953</td><td>2100.00</td><td>24000.00</td><td>3877.982497</td><td>15038748.243515</td></tr></tbody></table></div></div>

107행이 한 행으로 요약된다. `GROUP BY` 없이 집계 함수를 쓰면 테이블 전체가 하나의 그룹이 된다.

### count의 세 가지 형태

```sql
select count(*), count(emp_id) from emp; -- 총 행 수 조회: count(*), count(primary key 컬럼)
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>count(*)</th><th>count(emp_id)</th></tr></thead><tbody><tr><td>107</td><td>107</td></tr></tbody></table></div></div>

PK 컬럼은 NULL이 없으므로 `count(emp_id)`도 전체 행 수와 같다.

**부서(dept_name)의 개수를 조회**

```sql
select count(dept_name)                    "NULL 제외 값의 개수",
       count(distinct dept_name)           "부서(고유값) 개수",
       count(distinct ifnull(dept_name, 'a')) "NULL도 하나로 셈"
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>NULL 제외 값의 개수</th><th>부서(고유값) 개수</th><th>NULL도 하나로 셈</th></tr></thead><tbody><tr><td>104</td><td>11</td><td>12</td></tr></tbody></table></div></div>

- `count(dept_name)`은 부서명이 있는 직원 수다. 부서가 없는 3명이 빠진다.
- `count(distinct dept_name)`은 서로 다른 부서명의 개수다. NULL은 세지 않는다.
- NULL도 하나의 값으로 세고 싶으면 `ifnull`로 아무 값(`'a'`)으로 바꾼 뒤 센다.

**커미션 비율(comm_pct)이 있는 직원의 수를 조회**

```sql
select count(comm_pct) from emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>count(comm_pct)</th></tr></thead><tbody><tr><td>35</td></tr></tbody></table></div></div>

### NULL이 평균에 미치는 영향

**comm_pct의 평균은?**

```sql
select avg(comm_pct),            -- comm_pct가 있는 35명 기준 평균 (null을 제외하고 평균 계산)
       avg(ifnull(comm_pct, 0))  -- 전체 직원에 대한 평균 (null -> 0 변경한 뒤 평균을 계산)
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>avg(comm_pct)</th><th>avg(ifnull(comm_pct, 0))</th></tr></thead><tbody><tr><td>0.222857</td><td>0.072897</td></tr></tbody></table></div></div>

같은 컬럼의 평균인데 값이 세 배 넘게 차이 난다. 앞의 값은 "커미션을 받는 직원들의 평균 비율"이고, 뒤의 값은 "전체 직원 기준 평균 비율"이다. 질문이 무엇을 묻는지에 따라 골라 써야 한다.

### 문자열·일시 컬럼 집계

**가장 최근 입사일과 가장 오래된 입사일을 조회**

```sql
select max(hire_date), min(hire_date) from emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>max(hire_date)</th><th>min(hire_date)</th></tr></thead><tbody><tr><td>2008-04-21</td><td>2001-01-13</td></tr></tbody></table></div></div>

**최고 급여액과 최저 급여액, 그 둘의 차액을 출력**

```sql
select min(salary), max(salary), max(salary) - min(salary)
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>min(salary)</th><th>max(salary)</th><th>max(salary) - min(salary)</th></tr></thead><tbody><tr><td>2100.00</td><td>24000.00</td><td>21900.00</td></tr></tbody></table></div></div>

**가장 긴 직원 이름이 몇 글자인지 조회**

필기에는 시행착오가 그대로 남아 있다. 처음에는 `max(emp_name)`을 썼다.

```sql
select max(emp_name) from emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>max(emp_name)</th></tr></thead><tbody><tr><td>Winston</td></tr></tbody></table></div></div>

문자열의 `max()`는 **사전순으로 가장 마지막** 이름을 돌려줄 뿐, 가장 긴 이름이 아니다. 글자 수를 먼저 구한 뒤 그 값에 `max()`를 적용해야 한다.

```sql
select max(char_length(emp_name))
from   emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>max(char_length(emp_name))</th></tr></thead><tbody><tr><td>11</td></tr></tbody></table></div></div>

단일행 함수(`char_length`)의 결과를 집계 함수(`max`)에 넣을 수 있다.

## GROUP BY: 그룹별 집계

"업무**별** 급여 평균", "부서-업무**별** 급여 합계", "성**별** 나이 평균"처럼 **~별 ~에 대한 집계**에서 "~별"에 해당하는 컬럼을 지정하는 구문이다.

```sql
SELECT   기준컬럼, 집계함수(컬럼)
FROM     테이블
[WHERE   행 조건]
GROUP BY 기준컬럼 [, 기준컬럼]
[ORDER BY ...];
```

- 지정한 기준 컬럼의 값이 **같은 행끼리** 같은 그룹으로 묶이고, 그룹마다 집계한다.
- 기준 컬럼은 부서, 업무, 성별처럼 **범주형** 컬럼을 쓴다.
- `GROUP BY`는 `WHERE` 다음에 쓴다.
- SELECT절에 쓴 기준 컬럼은 순번(1부터)으로도 지정할 수 있다.
- **SELECT절에는 GROUP BY에 쓴 기준 컬럼과 집계 함수만 올 수 있다.**

마지막 규칙이 중요하다. 업무별로 묶었는데 SELECT에 `emp_name`을 쓰면, 한 그룹 안의 여러 이름 중 무엇을 보여줄지 정할 수 없다.

### 보충: 규칙을 어기면

```sql
select job, emp_name, avg(salary)
from   emp
group by job;
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">실행 결과 · 에러 1055: &#x27;testdb.emp.emp_name&#x27; isn&#x27;t in GROUP BY</div></div>

MySQL 8의 기본 설정(`ONLY_FULL_GROUP_BY`)에서는 위처럼 에러가 난다. (위 메시지는 같은 설정을 켠 MariaDB의 에러 문구라 MySQL과 표현이 다를 수 있다.)

### 예제

**업무(job)별 급여의 총합계, 평균, 최솟값, 최댓값, 표준편차, 분산, 직원 수를 조회**

```sql
select job,
       sum(salary),
       avg(salary),
       min(salary),
       max(salary),
       stddev(salary),
       variance(salary),
       count(*)
from   emp
group by job;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 19행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>job</th><th>sum(salary)</th><th>avg(salary)</th><th>min(salary)</th><th>max(salary)</th><th>stddev(salary)</th><th>variance(salary)</th><th>count(*)</th></tr></thead><tbody><tr><td>AC_ACCOUNT</td><td>8300.00</td><td>8300.000000</td><td>8300.00</td><td>8300.00</td><td>0.0</td><td>0.0</td><td>1</td></tr><tr><td>AC_MGR</td><td>12008.00</td><td>12008.000000</td><td>12008.00</td><td>12008.00</td><td>0.0</td><td>0.0</td><td>1</td></tr><tr><td>AD_ASST</td><td>4400.00</td><td>4400.000000</td><td>4400.00</td><td>4400.00</td><td>0.0</td><td>0.0</td><td>1</td></tr><tr><td>AD_PRES</td><td>24000.00</td><td>24000.000000</td><td>24000.00</td><td>24000.00</td><td>0.0</td><td>0.0</td><td>1</td></tr><tr><td>AD_VP</td><td>34000.00</td><td>17000.000000</td><td>17000.00</td><td>17000.00</td><td>0.0</td><td>0.0</td><td>2</td></tr></tbody></table></div></div>

**입사 연도별 직원들의 급여 평균**

```sql
select year(hire_date), avg(salary)
from   emp
group by year(hire_date)
order by 1;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 8행</div><div class="sql-result-scroll"><table><thead><tr><th>year(hire_date)</th><th>avg(salary)</th></tr></thead><tbody><tr><td>2001</td><td>17000.000000</td></tr><tr><td>2002</td><td>9830.857143</td></tr><tr><td>2003</td><td>8416.666667</td></tr><tr><td>2004</td><td>8600.000000</td></tr><tr><td>2005</td><td>6824.137931</td></tr><tr><td>2006</td><td>5045.833333</td></tr><tr><td>2007</td><td>4994.736842</td></tr><tr><td>2008</td><td>5381.818182</td></tr></tbody></table></div></div>

기준 컬럼 자리에 함수를 적용한 값도 쓸 수 있다. `hire_date`를 연도로 바꾼 값이 같은 행끼리 묶였다.

**부서명이 'Sales'이거나 'Purchasing'인 직원들의 업무별 직원 수를 조회. 직원 수가 많은 순서대로 정렬**

```sql
select job, count(*) "직원수"
from   emp
where  dept_name in ('Sales', 'Purchasing')
group by job
order by 2 desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 4행</div><div class="sql-result-scroll"><table><thead><tr><th>job</th><th>직원수</th></tr></thead><tbody><tr><td>SA_REP</td><td>29</td></tr><tr><td>SA_MAN</td><td>4</td></tr><tr><td>PU_CLERK</td><td>4</td></tr><tr><td>PU_MAN</td><td>2</td></tr></tbody></table></div></div>

`WHERE`로 두 부서의 직원만 남긴 **다음** 업무별로 묶는다.

**부서, 업무별 최대 급여와 최소 급여를 조회**

```sql
select dept_name, job, min(salary), max(salary)
from   emp
group by dept_name, job;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 22행 중 6행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_name</th><th>job</th><th>min(salary)</th><th>max(salary)</th></tr></thead><tbody><tr><td><span class="sql-null">NULL</span></td><td>SA_MAN</td><td>12000.00</td><td>12000.00</td></tr><tr><td><span class="sql-null">NULL</span></td><td>SA_REP</td><td>7000.00</td><td>7000.00</td></tr><tr><td><span class="sql-null">NULL</span></td><td>SH_CLERK</td><td>3100.00</td><td>3100.00</td></tr><tr><td>Accounting</td><td>AC_ACCOUNT</td><td>8300.00</td><td>8300.00</td></tr><tr><td>Accounting</td><td>AC_MGR</td><td>12008.00</td><td>12008.00</td></tr><tr><td>Administration</td><td>AD_ASST</td><td>4400.00</td><td>4400.00</td></tr></tbody></table></div></div>

기준 컬럼이 두 개면 두 값의 **조합**이 같은 행끼리 묶인다.

**급여가 10,000 이하인 직원 수와 10,000 초과인 직원 수 조회**

```sql
select case when salary <= 10000 then '10000이하'
            else '10000초과' end "급여기준",
       count(*) "직원수"
from   emp
group by case when salary <= 10000 then '10000이하'
              else '10000초과' end;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 2행</div><div class="sql-result-scroll"><table><thead><tr><th>급여기준</th><th>직원수</th></tr></thead><tbody><tr><td>10000이하</td><td>92</td></tr><tr><td>10000초과</td><td>15</td></tr></tbody></table></div></div>

테이블에 "급여 구간" 컬럼이 없어도 `CASE`로 만든 값을 기준으로 묶을 수 있다.

**부서명, 업무별 직원 수와 최고 급여를 조회. 부서 이름 오름차순 정렬**

```sql
select dept_name, job, count(*) "직원수", max(salary) "최고급여"
from   emp
group by dept_name, job
order by dept_name;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 22행 중 6행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_name</th><th>job</th><th>직원수</th><th>최고급여</th></tr></thead><tbody><tr><td><span class="sql-null">NULL</span></td><td>SA_MAN</td><td>1</td><td>12000.00</td></tr><tr><td><span class="sql-null">NULL</span></td><td>SA_REP</td><td>1</td><td>7000.00</td></tr><tr><td><span class="sql-null">NULL</span></td><td>SH_CLERK</td><td>1</td><td>3100.00</td></tr><tr><td>Accounting</td><td>AC_ACCOUNT</td><td>1</td><td>8300.00</td></tr><tr><td>Accounting</td><td>AC_MGR</td><td>1</td><td>12008.00</td></tr><tr><td>Administration</td><td>AD_ASST</td><td>1</td><td>4400.00</td></tr></tbody></table></div></div>

부서가 `NULL`인 직원들도 하나의 그룹으로 묶이고, 오름차순 정렬에서 NULL이 가장 먼저 나온다.

**부서별 직원 수를 조회하는데 부서명이 null인 것은 제외**

```sql
select dept_name,
       count(*) "직원수"
from   emp
where  dept_name is not null
group by dept_name;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 11행 중 6행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_name</th><th>직원수</th></tr></thead><tbody><tr><td>Accounting</td><td>2</td></tr><tr><td>Administration</td><td>1</td></tr><tr><td>Executive</td><td>3</td></tr><tr><td>Finance</td><td>6</td></tr><tr><td>Human Resources</td><td>1</td></tr><tr><td>IT</td><td>5</td></tr></tbody></table></div></div>

## HAVING: 그룹 거르기

`GROUP BY`로 나눈 **그룹**을 조건으로 거르는 구문이다.

```sql
SELECT   ...
FROM     ...
WHERE    행 조건
GROUP BY 기준컬럼
HAVING   그룹 조건
ORDER BY ...;
```

- `GROUP BY` 다음, `ORDER BY` 앞에 쓴다.
- 연산자는 `WHERE`와 같은 것을 쓴다.
- 피연산자로 집계 함수의 결과를 쓴다. 예) `having avg(salary) > 5000`

| 구문 | 거르는 대상 | 집계 함수 사용 |
|---|---|---|
| `WHERE` | 행 | 불가 |
| `HAVING` | GROUP BY로 묶인 그룹 | 가능 |

**20명 이상이 입사한 연도와 그해 입사한 직원들의 평균 급여, 직원 수를 조회**

```sql
select year(hire_date),
       avg(salary),
       count(*)
from   emp
group by year(hire_date)
having count(*) >= 20;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 2행</div><div class="sql-result-scroll"><table><thead><tr><th>year(hire_date)</th><th>avg(salary)</th><th>count(*)</th></tr></thead><tbody><tr><td>2005</td><td>6824.137931</td><td>29</td></tr><tr><td>2006</td><td>5045.833333</td><td>24</td></tr></tbody></table></div></div>

**평균 급여가 $5,000 이상인 부서의 이름과 평균 급여, 직원 수를 조회**

```sql
select dept_name,
       avg(salary),
       count(*)
from   emp
group by dept_name
having avg(salary) >= 5000
order by 2;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 9행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_name</th><th>avg(salary)</th><th>count(*)</th></tr></thead><tbody><tr><td>IT</td><td>5760.000000</td><td>5</td></tr><tr><td>Human Resources</td><td>6500.000000</td><td>1</td></tr><tr><td><span class="sql-null">NULL</span></td><td>7366.666667</td><td>3</td></tr><tr><td>Finance</td><td>8601.333333</td><td>6</td></tr><tr><td>Sales</td><td>8863.636364</td><td>33</td></tr><tr><td>Marketing</td><td>9500.000000</td><td>2</td></tr><tr><td>Public Relations</td><td>10000.000000</td><td>1</td></tr><tr><td>Accounting</td><td>10154.000000</td><td>2</td></tr><tr><td>Executive</td><td>19333.333333</td><td>3</td></tr></tbody></table></div></div>

**평균 급여가 $5,000 이상이고 소속 직원 수가 열 명 이상인 부서의 이름은?**

```sql
select dept_name, avg(salary), count(*)
from   emp
group by dept_name
having avg(salary) >= 5000 and count(*) >= 10;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_name</th><th>avg(salary)</th><th>count(*)</th></tr></thead><tbody><tr><td>Sales</td><td>8863.636364</td><td>33</td></tr></tbody></table></div></div>

**커미션이 있는 직원들의 입사 연도별 평균 급여를 조회. 단, 평균 급여가 $9,000 이상인 연도만**

```sql
select year(hire_date), avg(salary)
from   emp
where  comm_pct is not null
group by year(hire_date)
having avg(salary) >= 9000;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 2행</div><div class="sql-result-scroll"><table><thead><tr><th>year(hire_date)</th><th>avg(salary)</th></tr></thead><tbody><tr><td>2004</td><td>10700.000000</td></tr><tr><td>2005</td><td>10030.000000</td></tr></tbody></table></div></div>

`WHERE`와 `HAVING`을 함께 쓴 예다. 실행 순서로 보면 다음과 같다.

1. `WHERE`: 커미션이 있는 직원만 남긴다. (행 거르기)
2. `GROUP BY`: 입사 연도별로 묶는다.
3. `HAVING`: 평균 급여가 9,000 이상인 연도만 남긴다. (그룹 거르기)

## 정리

```sql
SELECT   기준컬럼, 집계함수(...)
FROM     테이블
WHERE    행 조건        -- 집계 함수 X
GROUP BY 기준컬럼
HAVING   그룹 조건      -- 집계 함수 O
ORDER BY ...;
```

- `count(*)`만 NULL을 포함해 세고, 나머지 집계 함수는 NULL을 빼고 계산한다.
- `avg(컬럼)`과 `avg(ifnull(컬럼, 0))`은 질문이 다르다. 분모가 "값이 있는 행"인지 "전체 행"인지 확인한다.
- `GROUP BY`를 쓰면 SELECT절에는 기준 컬럼과 집계 함수만 쓴다.
- 행을 거를 때는 `WHERE`, 그룹을 거를 때는 `HAVING`이다.
