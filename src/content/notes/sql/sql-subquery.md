---
title: "서브쿼리: 쿼리 안에서 다른 쿼리 결과 활용하기"
description: "WHERE·FROM·SELECT절에 들어가는 서브쿼리를 위치, 결과 행 수, 동작 방식으로 나눠 정리하고 IN·ANY·ALL로 여러 행 결과와 비교하는 방법을 다룹니다."
category: 'Tech'
subcategory: 'SQL'
series: 'SQL 기초'
seriesOrder: 7
originalNotebook: "06_subquery.sql"
tags: ["SQL","MySQL","Subquery"]
date: 2026-04-23
---

> SKN31 SQL 실습 파일 `06_subquery.sql`의 필기를 바탕으로 정리했습니다.
> 예제는 `hr_join` 데이터베이스로 MariaDB 10.11(MySQL 호환)에서 다시 실행했습니다. 테이블 구성은 [JOIN 글](/notes/sql/sql-join)에 정리했습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 서브쿼리의 세 가지 분류 기준: 위치, 결과 행 수, 동작 방식
- 단일행 서브쿼리와 비교 연산자
- 여러 컬럼을 한 번에 비교하는 방법
- FROM절 서브쿼리(인라인 뷰)
- 다중행 서브쿼리와 `IN`, `ANY`, `ALL`

## 서브쿼리란

쿼리 안에서 `SELECT` 쿼리를 사용하는 것이다. 바깥 쿼리를 **메인 쿼리**, 안쪽 쿼리를 **서브쿼리**라고 한다. 서브쿼리는 메인 쿼리가 쓸 값을 미리 조회해 주는 역할을 한다.

- 서브쿼리는 반드시 괄호 `( )`로 묶는다.
- `SELECT`절, `FROM`절, `WHERE`절, `HAVING`절에 쓸 수 있다.

### 분류

**어느 절에 쓰였는지**

| 이름 | 위치 | 특징 |
|---|---|---|
| 스칼라 서브쿼리 | `SELECT`절 | 결과가 반드시 1행 1열(값 하나). 0행이면 `NULL` |
| 인라인 뷰 | `FROM`절 | 서브쿼리 결과가 테이블 역할을 한다 |
| (일반) 서브쿼리 | `WHERE`, `HAVING`절 | 조건에 쓸 값을 제공한다 |

**결과 행 수**

| 이름 | 결과 |
|---|---|
| 단일행 서브쿼리 | 결과가 한 행 |
| 다중행 서브쿼리 | 결과가 여러 행 |

**동작 방식**

| 이름 | 특징 |
|---|---|
| 비상관 서브쿼리 | 서브쿼리에 메인 쿼리의 컬럼을 쓰지 않는다. 서브쿼리가 먼저 실행되어 메인 쿼리에 값을 제공한다 |
| 상관 서브쿼리 | 서브쿼리에서 메인 쿼리의 컬럼을 쓴다. 메인 쿼리가 읽은 행마다 서브쿼리로 조건을 확인한다 |

## 단일행 서브쿼리

서브쿼리 결과가 한 행이면 `=`, `>`, `<` 같은 일반 비교 연산자로 비교할 수 있다.

**직원 ID가 120번인 직원과 같은 업무(job_id)를 하는 직원의 ID, 이름, 업무, 급여 조회**

필기에서는 서브쿼리를 먼저 따로 실행해 값을 확인하고, 그다음 메인 쿼리에 넣었다.

```sql
select job_id from emp where emp_id = 120;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>job_id</th></tr></thead><tbody><tr><td>ST_MAN</td></tr></tbody></table></div></div>

```sql
select emp_id, emp_name, job_id, salary
from   emp
where  job_id = (select job_id from emp where emp_id = 120);
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>salary</th></tr></thead><tbody><tr><td>120</td><td>Matthew</td><td>ST_MAN</td><td>8000.00</td></tr><tr><td>121</td><td>Adam</td><td>ST_MAN</td><td>8200.00</td></tr><tr><td>122</td><td>Payam</td><td>ST_MAN</td><td>7900.00</td></tr><tr><td>123</td><td>Shanta</td><td>ST_MAN</td><td>6500.00</td></tr><tr><td>124</td><td>Kevin</td><td>ST_MAN</td><td>5800.00</td></tr></tbody></table></div></div>

서브쿼리 `(select job_id ...)`가 `'ST_MAN'`으로 바뀐 뒤 메인 쿼리가 실행된다고 생각하면 된다.

**직원들 중 급여가 전체 직원의 평균 급여보다 적은 직원들의 ID, 이름, 급여를 조회**

```sql
select avg(salary) from emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>avg(salary)</th></tr></thead><tbody><tr><td>6517.906542</td></tr></tbody></table></div></div>

```sql
select emp_id, emp_name, salary
from   emp
where  salary < (select avg(salary) from emp)
order by salary desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 57행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th></tr></thead><tbody><tr><td>203</td><td>Susan</td><td>6500.00</td></tr><tr><td>123</td><td>Shanta</td><td>6500.00</td></tr><tr><td>166</td><td>Sundar</td><td>6400.00</td></tr><tr><td>179</td><td>Charles</td><td>6200.00</td></tr><tr><td>167</td><td>Amit</td><td>6200.00</td></tr></tbody></table></div></div>

`WHERE`에는 집계 함수를 쓸 수 없지만(`where salary < avg(salary)`는 에러), 집계 함수를 쓴 **서브쿼리의 결과**는 쓸 수 있다. 집계 함수 글에서 "WHERE에서 집계 결과가 필요하면 서브쿼리를 이용한다"고 정리한 내용의 실제 사용이다.

**업무가 'IT_PROG'인 직원들 중 가장 많은 급여를 받는 직원보다 더 많은 급여를 받는 직원들의 ID, 이름, 급여를 급여 내림차순으로 조회**

```sql
select max(salary) from emp where job_id = 'IT_PROG';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>max(salary)</th></tr></thead><tbody><tr><td>9000.00</td></tr></tbody></table></div></div>

```sql
select emp_id, emp_name, salary
from   emp
where  salary > (select max(salary) from emp where job_id = 'IT_PROG')
order by salary desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 24행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>24000.00</td></tr><tr><td>101</td><td>Neena</td><td>17000.00</td></tr><tr><td>102</td><td>Lex</td><td>17000.00</td></tr><tr><td>145</td><td>John</td><td>14000.00</td></tr><tr><td>146</td><td>Karen</td><td>13500.00</td></tr></tbody></table></div></div>

### 서브쿼리 안의 서브쿼리

**급여를 가장 많이 받는 직원이 속한 부서의 이름, 위치를 조회**

```sql
select dept_id, dept_name, loc
from   dept
where  dept_id = (select dept_id
                  from   emp
                  where  salary = (select max(salary)
                                   from emp)
                 );
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_id</th><th>dept_name</th><th>loc</th></tr></thead><tbody><tr><td>90</td><td>Executive</td><td>Seattle</td></tr></tbody></table></div></div>

안쪽부터 읽는다.

1. 최고 급여를 구한다. → `24000`
2. 급여가 24000인 직원의 부서 ID를 구한다. → `90`
3. 부서 ID가 90인 부서의 이름과 위치를 조회한다.

**Sales 부서의 평균 급여보다 급여가 많은 직원들의 모든 정보를 조회**

```sql
select dept_id from dept where dept_name = 'Sales';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_id</th></tr></thead><tbody><tr><td>80</td></tr></tbody></table></div></div>

```sql
select * from emp
where  salary > (
                 select avg(salary)
                 from   emp
                 where  dept_id = (select dept_id from dept where dept_name = 'Sales')
                );
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 28행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>AD_PRES</td><td><span class="sql-null">NULL</span></td><td>2003-06-17</td><td>24000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr><tr><td>101</td><td>Neena</td><td>AD_VP</td><td>100</td><td>2005-09-21</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr><tr><td>102</td><td>Lex</td><td>AD_VP</td><td>100</td><td>2001-01-13</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr><tr><td>103</td><td>Alexander</td><td>IT_PROG</td><td>102</td><td>2006-01-03</td><td>9000.00</td><td><span class="sql-null">NULL</span></td><td>60</td></tr><tr><td>108</td><td>Nancy</td><td>FI_MGR</td><td>101</td><td>2002-08-17</td><td>12008.00</td><td><span class="sql-null">NULL</span></td><td>100</td></tr></tbody></table></div></div>

부서 이름은 `dept`에, 급여는 `emp`에 있다. JOIN 없이 서브쿼리로 이름을 ID로 바꿔서 연결했다.

### NULL을 놓치지 않는 조건

**업무 ID가 'ST_CLERK'인 직원들의 평균 급여보다 적은 급여를 받는 직원들을 조회. 단, 업무 ID가 'ST_CLERK'이 아닌 직원들만**

```sql
select avg(salary) from emp where job_id = 'ST_CLERK'; -- 2817.647059
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>avg(salary)</th></tr></thead><tbody><tr><td>2817.647059</td></tr></tbody></table></div></div>

```sql
select count(*) "ST_CLERK 포함" from emp
where  salary < (select avg(salary) from emp where job_id = 'ST_CLERK');
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>ST_CLERK 포함</th></tr></thead><tbody><tr><td>21</td></tr></tbody></table></div></div>

조건을 하나만 걸면 `ST_CLERK` 본인들도 포함된다. 그래서 업무 조건을 추가했다.

```sql
select * from emp
where  (job_id != 'ST_CLERK' or job_id is null)
and    salary < (select avg(salary) from emp where job_id = 'ST_CLERK');
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 12행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>117</td><td>Sigal</td><td>PU_CLERK</td><td>114</td><td>2005-07-24</td><td>2800.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr><tr><td>118</td><td>Guy</td><td>PU_CLERK</td><td>114</td><td>2006-11-15</td><td>2600.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr><tr><td>119</td><td>Karen</td><td>PU_CLERK</td><td>114</td><td>2007-08-10</td><td>2500.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr><tr><td>130</td><td>Mozhe</td><td><span class="sql-null">NULL</span></td><td>121</td><td>2005-07-16</td><td>2800.00</td><td><span class="sql-null">NULL</span></td><td>50</td></tr><tr><td>131</td><td>James</td><td><span class="sql-null">NULL</span></td><td>121</td><td>2005-02-16</td><td>2500.00</td><td><span class="sql-null">NULL</span></td><td>50</td></tr></tbody></table></div></div>

`job_id != 'ST_CLERK'`만 쓰면 업무가 `NULL`인 직원이 빠진다. `NULL`과의 비교 결과는 참이 아니기 때문이다. SELECT 기본 글에서 `<> 'Sales'` 조건이 부서 없는 직원을 놓쳤던 것과 같은 문제라서 `or job_id is null`을 붙였다. 위 결과의 `Mozhe`, `James`처럼 업무가 없는 직원이 이 조건 덕분에 포함됐다.

## 여러 컬럼을 한 번에 비교

서브쿼리 결과가 한 행·여러 열이면 `(컬럼1, 컬럼2) = (서브쿼리)`로 묶어서 비교할 수 있다.

**직원 ID가 115번인 직원과 같은 업무를 하고 같은 부서에 속한 직원들을 조회**

```sql
select job_id, dept_id from emp where emp_id = 115;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>job_id</th><th>dept_id</th></tr></thead><tbody><tr><td>PU_MAN</td><td>30</td></tr></tbody></table></div></div>

```sql
select * from emp
where  (job_id, dept_id) = (select job_id, dept_id from emp where emp_id = 115);
-- 주의: where (job_id, dept_id) = ('PU_MAN', 30); → mysql은 가능, oracle은 안 됨
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 2행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>114</td><td>Den</td><td>PU_MAN</td><td>100</td><td>2002-12-07</td><td>11000.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr><tr><td>115</td><td>Alexander</td><td>PU_MAN</td><td>100</td><td>2003-05-18</td><td>9100.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr></tbody></table></div></div>

필기 주석처럼 값 목록과 직접 비교하는 `(job_id, dept_id) = ('PU_MAN', 30)` 문법은 MySQL에서는 되지만 Oracle에서는 되지 않는다.

**직원 ID가 150인 직원과 업무와 상사가 같은 직원들의 ID, 이름, 업무, 상사 ID를 조회**

```sql
select job_id, mgr_id from emp where emp_id = 150;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>job_id</th><th>mgr_id</th></tr></thead><tbody><tr><td>SA_REP</td><td>145</td></tr></tbody></table></div></div>

```sql
select emp_id,
       emp_name,
       job_id,
       mgr_id
from   emp
where  (job_id, mgr_id) = (select job_id, mgr_id from emp where emp_id = 150);
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 6행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th></tr></thead><tbody><tr><td>150</td><td>Peter</td><td>SA_REP</td><td>145</td></tr><tr><td>151</td><td>David</td><td>SA_REP</td><td>145</td></tr><tr><td>152</td><td>Peter</td><td>SA_REP</td><td>145</td></tr><tr><td>153</td><td>Christopher</td><td>SA_REP</td><td>145</td></tr><tr><td>154</td><td>Nanette</td><td>SA_REP</td><td>145</td></tr></tbody></table></div></div>

## 인라인 뷰: FROM절 서브쿼리

**부서 직원들의 평균 급여가 전체 직원의 평균 이상인 부서의 이름, 평균 급여를 조회. 평균 급여는 소수점 2자리까지 나오고 통화 표시($)와 단위 구분자 출력**

```sql
select dept_id,
       dept_name,
       concat('$', format(급여평균, 2)) "급여평균"
from (
       select d.dept_id,
              d.dept_name,
              avg(salary) "급여평균"
       from   emp e left join dept d on e.dept_id = d.dept_id
       group by d.dept_id, d.dept_name
       having avg(salary) > (select avg(salary) from emp)
       order by 3 desc
     ) tb;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 6행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_id</th><th>dept_name</th><th>급여평균</th></tr></thead><tbody><tr><td>90</td><td>Executive</td><td>$19,333.33</td></tr><tr><td>110</td><td>Accounting</td><td>$10,154.00</td></tr><tr><td>70</td><td>Public Relations</td><td>$10,000.00</td></tr><tr><td>20</td><td>Marketing</td><td>$9,500.00</td></tr><tr><td>80</td><td>Sales</td><td>$8,960.61</td></tr></tbody></table></div></div>

구조를 나눠 보면 다음과 같다.

1. 안쪽 쿼리(`tb`)가 부서별 평균 급여를 계산하고, `HAVING`으로 전체 평균보다 높은 부서만 남긴다. `HAVING`안에 또 하나의 서브쿼리가 들어 있다.
2. 바깥 쿼리는 `tb`를 **테이블처럼** 읽어서 평균 급여에 `$`와 단위 구분자를 붙인다.

인라인 뷰를 쓴 이유는 **숫자 계산과 출력 서식을 분리**하기 위해서다. JOIN 글에서 `format()`이 문자열을 돌려줘서 정렬이 틀어진 문제가 있었는데, 계산은 안쪽에서 숫자로 하고 서식은 바깥에서 입히면 그 문제를 피할 수 있다.

- 인라인 뷰에는 반드시 별칭(`tb`)을 붙인다.
- 안쪽에서 만든 별칭 `급여평균`을 바깥에서 컬럼 이름처럼 쓴다.

> **보충: 인라인 뷰 안의 ORDER BY.** 이번 실행에서는 안쪽 `order by 3 desc` 순서대로 나왔지만, SQL에서 인라인 뷰 안의 정렬은 바깥 쿼리 결과의 순서를 보장하지 않는다. MySQL 문서도 파생 테이블 안의 `ORDER BY`는 무시될 수 있다고 설명한다. 순서가 중요하면 정렬은 바깥 쿼리에 둔다.

```sql
-- 보충: 정렬을 바깥으로 옮긴 버전
select dept_id,
       dept_name,
       concat('$', format(급여평균, 2)) "급여평균"
from (
       select d.dept_id,
              d.dept_name,
              avg(salary) "급여평균"
       from   emp e left join dept d on e.dept_id = d.dept_id
       group by d.dept_id, d.dept_name
       having avg(salary) > (select avg(salary) from emp)
     ) tb
order by tb.급여평균 desc;
```

## 다중행 서브쿼리

서브쿼리 결과가 여러 행이면 `=`, `>`로 비교할 수 없다. 대신 다음 연산자를 쓴다.

| 연산자 | 의미 |
|---|---|
| `IN (서브쿼리)` | 결과 중 하나와 같으면 참 |
| `비교연산자 ANY (서브쿼리)` | 결과 중 **하나라도** 비교가 참이면 참 |
| `비교연산자 ALL (서브쿼리)` | 결과 **모두**와 비교가 참이면 참 |

### 보충: 단일행 연산자에 여러 행을 넣으면

```sql
select * from emp
where  mgr_id = (select emp_id from emp where emp_name = 'Alexander');
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">실행 결과 · 에러 1242: Subquery returns more than 1 row</div></div>

이름이 `Alexander`인 직원이 두 명이라 서브쿼리 결과가 두 행이다. `=`는 값 하나와만 비교할 수 있어서 에러가 난다.

### IN

**'Alexander'라는 이름을 가진 관리자의 부하 직원들을 조회**

```sql
select * from emp where emp_name = 'Alexander';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 2행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>103</td><td>Alexander</td><td>IT_PROG</td><td>102</td><td>2006-01-03</td><td>9000.00</td><td><span class="sql-null">NULL</span></td><td>60</td></tr><tr><td>115</td><td>Alexander</td><td>PU_MAN</td><td>100</td><td>2003-05-18</td><td>9100.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr></tbody></table></div></div>

```sql
select * from emp
where  mgr_id in (select emp_id from emp where emp_name = 'Alexander');
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 4행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>104</td><td>Bruce</td><td>IT_PROG</td><td>103</td><td>2007-05-21</td><td>6000.00</td><td><span class="sql-null">NULL</span></td><td>60</td></tr><tr><td>105</td><td>David</td><td>IT_PROG</td><td>103</td><td>2005-06-25</td><td>4800.00</td><td><span class="sql-null">NULL</span></td><td>60</td></tr><tr><td>106</td><td>Valli</td><td>IT_PROG</td><td>103</td><td>2006-02-05</td><td>4800.00</td><td><span class="sql-null">NULL</span></td><td>60</td></tr><tr><td>107</td><td>Diana</td><td>IT_PROG</td><td>103</td><td>2007-02-07</td><td>4200.00</td><td><span class="sql-null">NULL</span></td><td>60</td></tr></tbody></table></div></div>

**부서 위치(dept.loc)가 'New York'인 부서에 소속된 직원의 ID, 이름, 부서 ID를 서브쿼리를 이용해 조회**

```sql
select * from dept where loc = 'New York';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 4행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_id</th><th>dept_name</th><th>loc</th></tr></thead><tbody><tr><td>20</td><td>Marketing</td><td>New York</td></tr><tr><td>40</td><td>Human Resources</td><td>New York</td></tr><tr><td>70</td><td>Public Relations</td><td>New York</td></tr><tr><td>80</td><td>Sales</td><td>New York</td></tr></tbody></table></div></div>

```sql
select emp_id, emp_name, dept_id
from   emp
where  dept_id in (select dept_id from dept where loc = 'New York');
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 37행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>dept_id</th></tr></thead><tbody><tr><td>201</td><td>Michael</td><td>20</td></tr><tr><td>202</td><td>Pat</td><td>20</td></tr><tr><td>203</td><td>Susan</td><td>40</td></tr><tr><td>204</td><td>Hermann</td><td>70</td></tr><tr><td>145</td><td>John</td><td>80</td></tr></tbody></table></div></div>

**최대 급여(job.max_salary)가 6000 이하인 업무를 담당하는 직원의 모든 정보를 서브쿼리를 이용해 조회**

```sql
select job_id from job where max_salary <= 6000;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 4행</div><div class="sql-result-scroll"><table><thead><tr><th>job_id</th></tr></thead><tbody><tr><td>AD_ASST</td></tr><tr><td>PU_CLERK</td></tr><tr><td>SH_CLERK</td></tr><tr><td>ST_CLERK</td></tr></tbody></table></div></div>

```sql
select * from emp where job_id in (select job_id from job where max_salary <= 6000);
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 39행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>200</td><td>Jennifer</td><td>AD_ASST</td><td>101</td><td>2003-09-17</td><td>4400.00</td><td><span class="sql-null">NULL</span></td><td>10</td></tr><tr><td>116</td><td>Shelli</td><td>PU_CLERK</td><td>114</td><td>2005-12-24</td><td>2900.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr><tr><td>117</td><td>Sigal</td><td>PU_CLERK</td><td>114</td><td>2005-07-24</td><td>2800.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr><tr><td>118</td><td>Guy</td><td>PU_CLERK</td><td>114</td><td>2006-11-15</td><td>2600.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr><tr><td>119</td><td>Karen</td><td>PU_CLERK</td><td>114</td><td>2007-08-10</td><td>2500.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr></tbody></table></div></div>

### ALL과 ANY

**직원 ID가 101, 102, 103인 직원들보다 급여를 많이 받는 직원의 모든 정보를 조회**

```sql
select salary from emp where emp_id in (101, 102, 103);
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 3행</div><div class="sql-result-scroll"><table><thead><tr><th>salary</th></tr></thead><tbody><tr><td>17000.00</td></tr><tr><td>17000.00</td></tr><tr><td>9000.00</td></tr></tbody></table></div></div>

```sql
select * from emp
where  salary > all(select salary from emp where emp_id in (101, 102, 103));
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>AD_PRES</td><td><span class="sql-null">NULL</span></td><td>2003-06-17</td><td>24000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr></tbody></table></div></div>

**직원 ID가 101, 102, 103인 직원들 중 급여가 가장 적은 직원보다 급여를 많이 받는 직원의 모든 정보를 조회**

```sql
select * from emp
where  salary > any(select salary from emp where emp_id in (101, 102, 103));
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 24행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>AD_PRES</td><td><span class="sql-null">NULL</span></td><td>2003-06-17</td><td>24000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr><tr><td>101</td><td>Neena</td><td>AD_VP</td><td>100</td><td>2005-09-21</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr><tr><td>102</td><td>Lex</td><td>AD_VP</td><td>100</td><td>2001-01-13</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr><tr><td>108</td><td>Nancy</td><td>FI_MGR</td><td>101</td><td>2002-08-17</td><td>12008.00</td><td><span class="sql-null">NULL</span></td><td>100</td></tr><tr><td>114</td><td>Den</td><td>PU_MAN</td><td>100</td><td>2002-12-07</td><td>11000.00</td><td><span class="sql-null">NULL</span></td><td>30</td></tr></tbody></table></div></div>

세 직원의 급여는 17000, 17000, 9000이다.

| 조건 | 같은 의미 | 결과 |
|---|---|---|
| `> all(17000, 17000, 9000)` | `> max(...)` = `> 17000` | 24000을 받는 1명 |
| `> any(17000, 17000, 9000)` | `> min(...)` = `> 9000` | 9000 초과인 직원들 |

`ALL`은 "가장 큰 값보다 크다", `ANY`는 "가장 작은 값보다 크다"로 바꿔 읽으면 헷갈리지 않는다.

**부서 ID가 20인 부서의 모든 직원들보다 급여를 많이 받는 직원들의 정보를 서브쿼리를 이용해 조회**

```sql
select * from emp
where  salary > all(select salary from emp where dept_id = 20);
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>AD_PRES</td><td><span class="sql-null">NULL</span></td><td>2003-06-17</td><td>24000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr><tr><td>101</td><td>Neena</td><td>AD_VP</td><td>100</td><td>2005-09-21</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr><tr><td>102</td><td>Lex</td><td>AD_VP</td><td>100</td><td>2001-01-13</td><td>17000.00</td><td><span class="sql-null">NULL</span></td><td>90</td></tr><tr><td>145</td><td>John</td><td>SA_MAN</td><td>100</td><td>2004-10-01</td><td>14000.00</td><td>0.40</td><td>80</td></tr><tr><td>146</td><td>Karen</td><td>SA_MAN</td><td>100</td><td>2004-10-01</td><td>13500.00</td><td>0.30</td><td>80</td></tr></tbody></table></div></div>

## 보충: 상관 서브쿼리 예

필기에 개념만 있고 예제가 없어서 하나 추가했다. **자기 부서의 평균 급여보다 많이 받는 직원**을 조회한다.

```sql
select e.emp_id, e.emp_name, e.dept_id, e.salary
from   emp e
where  e.salary > (select avg(salary)
                   from   emp
                   where  dept_id = e.dept_id)  -- 메인 쿼리의 e.dept_id를 사용
order by e.dept_id, e.salary desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 37행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>dept_id</th><th>salary</th></tr></thead><tbody><tr><td>201</td><td>Michael</td><td>20</td><td>13000.00</td></tr><tr><td>114</td><td>Den</td><td>30</td><td>11000.00</td></tr><tr><td>115</td><td>Alexander</td><td>30</td><td>9100.00</td></tr><tr><td>121</td><td>Adam</td><td>50</td><td>8200.00</td></tr><tr><td>120</td><td>Matthew</td><td>50</td><td>8000.00</td></tr></tbody></table></div></div>

서브쿼리 안의 `e.dept_id`가 메인 쿼리의 컬럼이다. 메인 쿼리가 직원 한 명을 읽을 때마다 그 직원의 부서 평균을 새로 계산해서 비교한다. 그래서 서브쿼리를 따로 떼어 실행할 수 없다. 이것이 비상관 서브쿼리와의 차이다.

## 정리

| 상황 | 쓰는 방법 |
|---|---|
| 조건에 다른 쿼리의 값 하나가 필요 | `where 컬럼 = (단일행 서브쿼리)` |
| 조건에 집계 결과가 필요 | `where salary > (select avg(salary) ...)` |
| 여러 컬럼을 동시에 비교 | `where (a, b) = (select a, b ...)` |
| 서브쿼리 결과가 여러 행 | `IN`, `> ANY`, `> ALL` |
| 계산 결과를 테이블처럼 다시 가공 | `from (서브쿼리) 별칭` |

- 서브쿼리는 안쪽부터 따로 실행해 결과를 확인하고 메인 쿼리에 넣으면 디버깅이 쉽다.
- `!=` 조건은 `NULL`을 놓친다. 필요하면 `or 컬럼 is null`을 붙인다.
- 인라인 뷰 안의 `order by`에 기대지 말고, 정렬은 바깥 쿼리에서 한다.
