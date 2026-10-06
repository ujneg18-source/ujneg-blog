---
title: "JOIN: 여러 테이블을 합쳐 조회하기"
description: "Foreign Key로 연결된 테이블을 INNER JOIN, Self JOIN, OUTER JOIN으로 합쳐 조회하는 방법과 각 조인이 어떤 행을 남기는지 정리합니다."
category: 'Tech'
subcategory: 'SQL'
series: 'SQL 기초'
seriesOrder: 6
originalNotebook: "05_join.sql"
tags: ["SQL","MySQL","JOIN","Foreign Key"]
date: 2026-04-23
---

> SKN31 SQL 실습 파일 `05_join.sql`의 필기를 바탕으로 정리했습니다. Foreign Key 부분은 수업 자료(`SQL.pdf`) 내용을 함께 정리했습니다.
> 예제는 수업 실습용 `hr_join` 데이터베이스로 MariaDB 10.11(MySQL 호환)에서 다시 실행했습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 테이블 사이의 관계를 만드는 Foreign Key
- 조인의 종류: INNER, OUTER, CROSS
- 같은 값끼리 합치는 조인(equi join)과 범위로 합치는 조인(non-equi join)
- 하나의 테이블을 두 번 쓰는 Self JOIN
- 조인 조건에 맞지 않는 행도 남기는 OUTER JOIN

## 실습 데이터: hr_join

SELECT 기본 글의 `emp` 테이블은 부서 이름을 직원 테이블에 직접 넣었다. `hr_join`은 부서·업무 정보를 별도 테이블로 나누고 ID로 연결했다.

![hr_join ERD](/images/sql/emp_join_erd.png)

| 테이블 | 내용 | 주요 컬럼 |
|---|---|---|
| `emp` | 직원 (107행) | `emp_id`(PK), `job_id`(FK), `mgr_id`(FK), `dept_id`(FK), `salary` |
| `dept` | 부서 (27행) | `dept_id`(PK), `dept_name`, `loc` |
| `job` | 업무 (19행) | `job_id`(PK), `job_title`, `min_salary`, `max_salary` |
| `salary_grade` | 급여 등급 (5행) | `grade`, `low_sal`, `high_sal` |

`emp.mgr_id`는 같은 `emp` 테이블의 `emp_id`를 가리킨다. 상사도 직원이기 때문이다.

## 테이블 간의 관계: Foreign Key

**Foreign Key(외래키)** 는 다른 테이블의 PK 값만 가질 수 있는 컬럼이다. 테이블 사이의 연관관계를 표현한다.

- **부모 테이블**: 참조되는 테이블 (`dept`)
- **자식 테이블**: 참조하는 테이블 (`emp`)
- 직원 한 명은 부서 하나를 참조하고, 부서 하나는 직원 0명 ~ N명에게 참조될 수 있다.

```sql
CONSTRAINT 제약조건이름 FOREIGN KEY(컬럼) REFERENCES 부모테이블(PK컬럼) [ON 설정]
```

기본적으로 자식 테이블이 참조하고 있는 부모 테이블의 행은 삭제·수정할 수 없다. `ON DELETE` / `ON UPDATE`로 이 동작을 바꾼다.

| 설정 | 부모 행을 삭제·수정하면 |
|---|---|
| (설정 없음) | 막는다 |
| `CASCADE` | 참조하던 자식 행도 같이 삭제·수정한다 |
| `SET NULL` | 참조하던 자식 행의 FK 컬럼을 `NULL`로 바꾼다 |

`hr_join`의 `emp`는 세 FK 모두 `ON DELETE SET NULL`로 만들어져 있다.

```sql
CONSTRAINT fk_emp_dept FOREIGN KEY(dept_id) REFERENCES dept(dept_id) ON DELETE SET NULL,
CONSTRAINT fk_emp_job  FOREIGN KEY(job_id)  REFERENCES job(job_id)   ON DELETE SET NULL,
CONSTRAINT fk_emp_mgr  FOREIGN KEY(mgr_id)  REFERENCES emp(emp_id)   ON DELETE SET NULL
```

자식 테이블이 있는 부모 테이블을 `DROP`하려면 FK 검사를 잠시 끈다.

```sql
set foreign_key_checks = 0;  -- foreign key 해제
drop table 삭제할테이블;
set foreign_key_checks = 1;  -- foreign key 다시 적용
```

## 조인이란

2개 이상의 테이블에 있는 컬럼을 합쳐서 **가상의 테이블**을 만들어 조회하는 방식이다.

- **소스 테이블**: 내가 먼저 읽어야 한다고 생각하는 테이블. 조회하려는 주(main) 정보를 가진다.
- **타겟 테이블**: 소스를 읽은 뒤 거기에 붙일 대상. 보조(sub) 정보를 가진다.

각 테이블을 어떻게 합칠지 정하는 것을 **조인 연산**이라고 한다. 조인 연산이 `=`이면 equi join, 그 외(범위 비교 등)면 non-equi join이다.

| 종류 | 남는 행 |
|---|---|
| INNER JOIN | 양쪽 테이블에서 조인 조건을 만족하는 행만 |
| OUTER JOIN | 한쪽(소스) 테이블의 행은 모두, 다른 쪽은 조건을 만족하는 행만. 짝이 없으면 `NULL`을 붙인다 |
| CROSS JOIN | 두 테이블의 곱집합 (모든 조합) |

## INNER JOIN

```sql
FROM 테이블a [INNER] JOIN 테이블b ON 조인조건
```

`INNER`는 생략할 수 있다. 테이블에 별칭(`e`, `d`)을 붙이고 `별칭.컬럼`으로 어느 테이블의 컬럼인지 밝힌다.

**직원의 ID, 이름, 입사년도, 소속 부서 이름(dept.dept_name)을 조회**

```sql
select e.emp_id, e.emp_name, e.hire_date, d.dept_name
from   emp e join dept d on e.dept_id = d.dept_id;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 102행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>hire_date</th><th>dept_name</th></tr></thead><tbody><tr><td>200</td><td>Jennifer</td><td>2003-09-17</td><td>Administration</td></tr><tr><td>201</td><td>Michael</td><td>2004-02-17</td><td>Marketing</td></tr><tr><td>202</td><td>Pat</td><td>2005-08-17</td><td>Marketing</td></tr><tr><td>114</td><td>Den</td><td>2002-12-07</td><td>Purchasing</td></tr><tr><td>115</td><td>Alexander</td><td>2003-05-18</td><td>Purchasing</td></tr></tbody></table></div></div>

```sql
select count(*) from emp e join dept d on e.dept_id = d.dept_id;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>count(*)</th></tr></thead><tbody><tr><td>102</td></tr></tbody></table></div></div>

직원은 107명인데 102행만 나온다. `dept_id`가 `NULL`인 직원 5명은 `dept`와 짝을 이룰 수 없어서 INNER JOIN 결과에서 빠졌다. 이 5명을 살리는 방법이 뒤에 나오는 OUTER JOIN이다.

**커미션을 받는 직원들의 ID, 이름, 급여, 커미션 비율, 소속 부서 이름, 부서 위치를 조회. 직원 ID 내림차순 정렬**

```sql
select e.emp_id, e.emp_name, e.salary, e.comm_pct, d.dept_name, d.loc
from   emp e join dept d on e.dept_id = d.dept_id
where  e.comm_pct is not null
order by e.emp_id desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 33행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>comm_pct</th><th>dept_name</th><th>loc</th></tr></thead><tbody><tr><td>179</td><td>Charles</td><td>6200.00</td><td>0.10</td><td>Sales</td><td>New York</td></tr><tr><td>177</td><td>Jack</td><td>8400.00</td><td>0.20</td><td>Sales</td><td>New York</td></tr><tr><td>176</td><td>Jonathon</td><td>8600.00</td><td>0.20</td><td>Sales</td><td>New York</td></tr><tr><td>174</td><td>Ellen</td><td>11000.00</td><td>0.30</td><td>Sales</td><td>New York</td></tr><tr><td>173</td><td>Sundita</td><td>6100.00</td><td>0.10</td><td>Sales</td><td>New York</td></tr></tbody></table></div></div>

조인한 결과에도 `WHERE`, `ORDER BY`를 그대로 쓴다.

**직원 ID가 100인 직원의 ID, 이름, 입사년도, 소속 부서 이름을 조회**

```sql
select e.emp_id, e.emp_name, e.hire_date, d.dept_name
from   emp e join dept d on e.dept_id = d.dept_id
where  e.emp_id = 100;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>hire_date</th><th>dept_name</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>2003-06-17</td><td>Executive</td></tr></tbody></table></div></div>

### 세 개 이상의 테이블

`JOIN ... ON ...`을 이어 붙인다.

**직원 ID가 200인 직원의 ID, 이름, 급여, 담당 업무명(job.job_title), 소속 부서 이름을 조회**

```sql
select e.emp_id, e.emp_name, e.salary, j.job_title, d.dept_name
from   emp e join job j  on e.job_id = j.job_id
             join dept d on e.dept_id = d.dept_id
where  e.emp_id = 200;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>job_title</th><th>dept_name</th></tr></thead><tbody><tr><td>200</td><td>Jennifer</td><td>4400.00</td><td>Administration Assistant</td><td>Administration</td></tr></tbody></table></div></div>

**부서 ID가 30인 부서의 이름, 위치, 그 부서에 소속된 직원의 이름을 조회**

```sql
select d.dept_name, d.loc, e.emp_name
from   dept d join emp e on d.dept_id = e.dept_id
where  d.dept_id = 30;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 6행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_name</th><th>loc</th><th>emp_name</th></tr></thead><tbody><tr><td>Purchasing</td><td>Seattle</td><td>Den</td></tr><tr><td>Purchasing</td><td>Seattle</td><td>Alexander</td></tr><tr><td>Purchasing</td><td>Seattle</td><td>Shelli</td></tr><tr><td>Purchasing</td><td>Seattle</td><td>Sigal</td></tr><tr><td>Purchasing</td><td>Seattle</td><td>Guy</td></tr><tr><td>Purchasing</td><td>Seattle</td><td>Karen</td></tr></tbody></table></div></div>

이 문제는 부서 정보가 주(main)라서 `dept`를 소스 테이블로 먼저 썼다. INNER JOIN은 순서를 바꿔도 결과가 같다.

### Non-equi JOIN: 범위로 합치기

`salary_grade`는 등급별 급여 범위(`low_sal` ~ `high_sal`)를 가진다. 직원의 급여가 어느 범위에 들어가는지로 조인한다.

```sql
select * from salary_grade;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 5행</div><div class="sql-result-scroll"><table><thead><tr><th>grade</th><th>low_sal</th><th>high_sal</th></tr></thead><tbody><tr><td>1</td><td>0.00</td><td>5000.00</td></tr><tr><td>2</td><td>5001.00</td><td>10000.00</td></tr><tr><td>3</td><td>10001.00</td><td>15000.00</td></tr><tr><td>4</td><td>15001.00</td><td>20000.00</td></tr><tr><td>5</td><td>20001.00</td><td>99999.00</td></tr></tbody></table></div></div>

**직원의 ID, 이름, 급여, 급여 등급(salary_grade.grade)을 조회**

```sql
select e.emp_id, e.emp_name, e.salary, concat(s.grade, '등급') "Grade"
from   emp e join salary_grade s on e.salary between s.low_sal and s.high_sal;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>Grade</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>24000.00</td><td>5등급</td></tr><tr><td>101</td><td>Neena</td><td>17000.00</td><td>4등급</td></tr><tr><td>102</td><td>Lex</td><td>17000.00</td><td>4등급</td></tr><tr><td>103</td><td>Alexander</td><td>9000.00</td><td>2등급</td></tr><tr><td>104</td><td>Bruce</td><td>6000.00</td><td>2등급</td></tr></tbody></table></div></div>

조인 조건에 `=` 대신 `between`을 썼다. 조인 조건은 "두 행을 붙일지 말지 판단하는 식"이면 무엇이든 될 수 있다.

### 조인 + 집계

**부서별 급여 평균을 조회. 부서 이름과 급여 평균을 출력하고 급여 평균이 높은 순서로 정렬**

```sql
select d.dept_id, d.dept_name, format(avg(e.salary), 2) "급여평균"
from   emp e join dept d on e.dept_id = d.dept_id
group by d.dept_id, d.dept_name
order by 3 desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 11행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_id</th><th>dept_name</th><th>급여평균</th></tr></thead><tbody><tr><td>20</td><td>Marketing</td><td>9,500.00</td></tr><tr><td>80</td><td>Sales</td><td>8,960.61</td></tr><tr><td>100</td><td>Finance</td><td>8,601.33</td></tr><tr><td>40</td><td>Human Resources</td><td>6,500.00</td></tr><tr><td>60</td><td>IT</td><td>5,760.00</td></tr></tbody></table></div></div>

> **주의:** `format()`은 **문자열**을 돌려준다. 그래서 `order by 3`은 숫자 크기가 아니라 문자열 순서로 정렬된다. 위 결과에서 `9,500.00`이 `19,333.33`보다 위에 있는 이유다. 숫자 기준으로 정렬하려면 `order by avg(e.salary) desc`처럼 포맷하기 전 값으로 정렬해야 한다. (`보충`: 필기에는 없던 내용으로, 결과를 다시 확인하다 발견했다.)

```sql
-- 보충: 숫자 기준 정렬
select d.dept_id, d.dept_name, format(avg(e.salary), 2) "급여평균"
from   emp e join dept d on e.dept_id = d.dept_id
group by d.dept_id, d.dept_name
order by avg(e.salary) desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 11행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_id</th><th>dept_name</th><th>급여평균</th></tr></thead><tbody><tr><td>90</td><td>Executive</td><td>19,333.33</td></tr><tr><td>110</td><td>Accounting</td><td>10,154.00</td></tr><tr><td>70</td><td>Public Relations</td><td>10,000.00</td></tr><tr><td>20</td><td>Marketing</td><td>9,500.00</td></tr><tr><td>80</td><td>Sales</td><td>8,960.61</td></tr></tbody></table></div></div>

**직원의 ID, 이름, 업무명, 급여, 급여 등급, 소속 부서명을 조회**

```sql
select e.emp_id,
       e.emp_name,
       j.job_title,
       e.salary,
       s.grade,
       d.dept_name
from   emp e join job j          on e.job_id = j.job_id
             join salary_grade s on e.salary between s.low_sal and s.high_sal
             join dept d         on e.dept_id = d.dept_id;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 96행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_title</th><th>salary</th><th>grade</th><th>dept_name</th></tr></thead><tbody><tr><td>206</td><td>William</td><td>Public Accountant</td><td>8300.00</td><td>2</td><td>Accounting</td></tr><tr><td>205</td><td>Shelley</td><td>Accounting Manager</td><td>12008.00</td><td>3</td><td>Accounting</td></tr><tr><td>200</td><td>Jennifer</td><td>Administration Assistant</td><td>4400.00</td><td>1</td><td>Administration</td></tr><tr><td>100</td><td>Steven</td><td>President</td><td>24000.00</td><td>5</td><td>Executive</td></tr><tr><td>101</td><td>Neena</td><td>Administration Vice President</td><td>17000.00</td><td>4</td><td>Executive</td></tr></tbody></table></div></div>

## Self JOIN

물리적으로 하나의 테이블을 **두 개의 테이블처럼** 조인하는 것이다. 별칭으로 역할을 나눈다. 여기서는 `e`가 직원, `m`이 상사(manager)다.

**직원 ID가 101인 직원의 ID, 이름, 상사 이름을 조회**

필기에 남긴 쿼리는 다음과 같다.

```sql
select e.emp_id,
       e.emp_name "직원이름",
       m.emp_name "상사이름"
from   emp e join emp m on e.mgr_id = m.emp_id;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 106행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>직원이름</th><th>상사이름</th></tr></thead><tbody><tr><td>101</td><td>Neena</td><td>Steven</td></tr><tr><td>102</td><td>Lex</td><td>Steven</td></tr><tr><td>103</td><td>Alexander</td><td>Lex</td></tr><tr><td>104</td><td>Bruce</td><td>Alexander</td></tr><tr><td>105</td><td>David</td><td>Alexander</td></tr></tbody></table></div></div>

문제는 101번 직원만 묻는데 `where`가 빠져서 상사가 있는 모든 직원이 조회됐다. 정리하면서 조건을 붙여 다시 실행했다.

```sql
select e.emp_id,
       e.emp_name "직원이름",
       m.emp_name "상사이름"
from   emp e join emp m on e.mgr_id = m.emp_id
where  e.emp_id = 101;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>직원이름</th><th>상사이름</th></tr></thead><tbody><tr><td>101</td><td>Neena</td><td>Steven</td></tr></tbody></table></div></div>

`e.mgr_id = m.emp_id`가 핵심이다. 직원 행의 상사 ID와 **같은 테이블** 다른 행의 직원 ID를 맞붙인다.

## OUTER JOIN

조인 조건을 만족하지 않는 행도 포함해서 합친다. "불충분 조인"이라고도 부른다.

```sql
FROM 테이블a {LEFT | RIGHT} [OUTER] JOIN 테이블b ON 조인조건
```

| 종류 | 소스 테이블 |
|---|---|
| `LEFT OUTER JOIN` | 구문상 왼쪽 테이블 |
| `RIGHT OUTER JOIN` | 구문상 오른쪽 테이블 |
| `FULL OUTER JOIN` | 양쪽 모두. MySQL은 지원하지 않아 `UNION`으로 구현한다 |

`OUTER`는 생략할 수 있다. 소스 테이블의 행은 **모두** 나오고, 타겟 테이블에 짝이 없으면 타겟 쪽 컬럼은 `NULL`이 된다.

**직원의 ID, 이름, 급여, 부서명, 부서 위치를 조회. 부서가 없는 직원의 정보도 나오도록 조회하고 dept_name 내림차순 정렬**

```sql
select e.emp_id, e.emp_name, e.salary, d.dept_name, d.loc
from   emp e left join dept d on e.dept_id = d.dept_id
order by d.dept_name desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>dept_name</th><th>loc</th></tr></thead><tbody><tr><td>138</td><td>Stephen</td><td>3200.00</td><td>Shipping</td><td>San Francisco</td></tr><tr><td>140</td><td>Joshua</td><td>2500.00</td><td>Shipping</td><td>San Francisco</td></tr><tr><td>142</td><td>Curtis</td><td>3100.00</td><td>Shipping</td><td>San Francisco</td></tr><tr><td>144</td><td>Peter</td><td>2500.00</td><td>Shipping</td><td>San Francisco</td></tr><tr><td>180</td><td>Winston</td><td>3200.00</td><td>Shipping</td><td>San Francisco</td></tr></tbody></table></div></div>

```sql
select count(*) from emp e left join dept d on e.dept_id = d.dept_id;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>count(*)</th></tr></thead><tbody><tr><td>107</td></tr></tbody></table></div></div>

INNER JOIN에서는 102행이었는데 이번에는 107행이 모두 나왔다. 부서가 없는 5명은 `dept_name`, `loc`가 `NULL`로 붙어 내림차순 정렬의 맨 뒤에 있다.

### ON에 조건을 넣는 경우

**모든 직원의 ID, 이름, 부서 ID를 조회하는데, 부서 ID가 80인 직원들은 부서명과 부서 위치도 같이 출력 (80이 아니면 null)**

```sql
select e.emp_id, e.emp_name, e.dept_id, d.dept_name, d.loc
from   emp e left join dept d on e.dept_id = d.dept_id and d.dept_id = 80
order by d.dept_id;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 107행 중 8행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>dept_id</th><th>dept_name</th><th>loc</th></tr></thead><tbody><tr><td>105</td><td>David</td><td>60</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>201</td><td>Michael</td><td>20</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>137</td><td>Renske</td><td>50</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>186</td><td>Julia</td><td>50</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>122</td><td>Payam</td><td>50</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>139</td><td>John</td><td>50</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>107</td><td>Diana</td><td>60</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr><tr><td>203</td><td>Susan</td><td>40</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td></tr></tbody></table></div></div>

`order by d.dept_id` 오름차순에서는 `NULL`이 먼저 오기 때문에 앞쪽 행은 부서 정보가 모두 `NULL`이다. 80번 부서 직원 33명은 결과 맨 뒤에 부서명 `Sales`, 위치 `New York`이 붙은 채로 나온다. 원래 부서가 50번(`Jean`)이거나 90번(`Lex`)인 직원도 부서 정보가 `NULL`이 된 것에 주목한다.

조건을 `WHERE`가 아니라 `ON`에 넣었다는 점이 중요하다.

- `ON`에 넣으면: "부서를 **붙일지 말지**"의 조건이 된다. 직원 107명은 모두 남고, 80번 부서 직원에게만 부서 정보가 붙는다.
- `WHERE`에 넣으면: 조인이 끝난 결과에서 "**행을 남길지 말지**"의 조건이 된다. 80번 부서 직원만 남는다.

```sql
-- 보충: 같은 조건을 WHERE에 넣으면
select count(*) "ON에 조건" from emp e left join dept d on e.dept_id = d.dept_id and d.dept_id = 80;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>ON에 조건</th></tr></thead><tbody><tr><td>107</td></tr></tbody></table></div></div>

```sql
select count(*) "WHERE에 조건" from emp e left join dept d on e.dept_id = d.dept_id where d.dept_id = 80;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>WHERE에 조건</th></tr></thead><tbody><tr><td>33</td></tr></tbody></table></div></div>

**직원 ID가 100, 110, 120, 130, 140인 직원의 ID, 이름, 업무명을 조회. 업무명이 없을 경우 '미배정'으로 조회**

```sql
select e.emp_id, e.emp_name, ifnull(j.job_title, '미배정') "job_title"
from   emp e left join job j on e.job_id = j.job_id
where  e.emp_id in (100, 110, 120, 130, 140);
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_title</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>President</td></tr><tr><td>110</td><td>John</td><td>Accountant</td></tr><tr><td>120</td><td>Matthew</td><td>Stock Manager</td></tr><tr><td>130</td><td>Mozhe</td><td>미배정</td></tr><tr><td>140</td><td>Joshua</td><td>미배정</td></tr></tbody></table></div></div>

OUTER JOIN으로 생긴 `NULL`을 `ifnull`로 바꿔 출력했다.

**부서 ID, 부서 이름과 그 부서에 속한 직원 수를 조회. 직원이 없는 부서는 0이 나오도록 조회하고 직원 수가 많은 부서 순서로 정렬**

```sql
select d.dept_id, d.dept_name, count(emp_id) "직원수"  -- 직원수 → 세려고 하는 테이블의 PK로 count
from   dept d left join emp e on d.dept_id = e.dept_id
group by d.dept_id, d.dept_name
order by 3 desc;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 27행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_id</th><th>dept_name</th><th>직원수</th></tr></thead><tbody><tr><td>50</td><td>Shipping</td><td>42</td></tr><tr><td>80</td><td>Sales</td><td>33</td></tr><tr><td>30</td><td>Purchasing</td><td>6</td></tr><tr><td>100</td><td>Finance</td><td>6</td></tr><tr><td>60</td><td>IT</td><td>5</td></tr></tbody></table></div></div>

필기 주석에 "세려고 하는 테이블의 PK로 count"라고 적어 두었다. 이유는 다음과 같다.

- 직원이 없는 부서도 LEFT JOIN으로 한 행은 남는다. 이때 `emp` 쪽 컬럼은 모두 `NULL`이다.
- `count(*)`는 그 행을 1로 센다. 직원이 0명인 부서가 1명으로 나온다.
- `count(e.emp_id)`는 `NULL`을 세지 않으므로 0이 나온다.

```sql
-- 보충: count(*)로 세면 직원이 없는 부서도 1로 나온다
select d.dept_id, d.dept_name, count(*) "count(*)", count(emp_id) "count(emp_id)"
from   dept d left join emp e on d.dept_id = e.dept_id
group by d.dept_id, d.dept_name
order by 4, 1;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 27행 중 4행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_id</th><th>dept_name</th><th>count(*)</th><th>count(emp_id)</th></tr></thead><tbody><tr><td>120</td><td>Treasury</td><td>1</td><td>0</td></tr><tr><td>130</td><td>Corporate Tax</td><td>1</td><td>0</td></tr><tr><td>140</td><td>Control And Credit</td><td>1</td><td>0</td></tr><tr><td>150</td><td>Shareholder Services</td><td>1</td><td>0</td></tr></tbody></table></div></div>

### Self JOIN + OUTER JOIN

**부서 ID가 90인 모든 직원들의 ID, 이름, 상사 이름, 입사일을 조회. 입사일은 yyyy/mm/dd 형식**

```sql
select e.emp_id,
       e.emp_name "직원이름",
       m.emp_name "상사이름",
       date_format(e.hire_date, '%Y/%m/%d') "hire_date"
from   emp e left join emp m on e.mgr_id = m.emp_id
where  e.dept_id = 90;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>직원이름</th><th>상사이름</th><th>hire_date</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td><span class="sql-null">NULL</span></td><td>2003/06/17</td></tr><tr><td>101</td><td>Neena</td><td>Steven</td><td>2005/09/21</td></tr><tr><td>102</td><td>Lex</td><td>Steven</td><td>2001/01/13</td></tr></tbody></table></div></div>

사장(`Steven`)은 상사가 없다. INNER JOIN이었다면 사장이 결과에서 빠졌을 것이고, LEFT JOIN이라서 상사 이름이 `NULL`인 채로 남았다.

**2003년~2005년 사이에 입사한 모든 직원의 ID, 이름, 업무명, 급여, 입사일, 상사 이름, 상사 입사일, 소속 부서 이름, 부서 위치를 조회**

```sql
select e.emp_id,
       e.emp_name,
       j.job_title,
       e.salary,
       e.hire_date,
       m.emp_name  "상사이름",
       m.hire_date "상사 입사일",
       d.dept_name,
       d.loc
from   emp e left join job j  on e.job_id  = j.job_id
             left join dept d on e.dept_id = d.dept_id
             left join emp m  on e.mgr_id  = m.emp_id
where  year(e.hire_date) between 2003 and 2005;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 44행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_title</th><th>salary</th><th>hire_date</th><th>상사이름</th><th>상사 입사일</th><th>dept_name</th><th>loc</th></tr></thead><tbody><tr><td>100</td><td>Steven</td><td>President</td><td>24000.00</td><td>2003-06-17</td><td><span class="sql-null">NULL</span></td><td><span class="sql-null">NULL</span></td><td>Executive</td><td>Seattle</td></tr><tr><td>101</td><td>Neena</td><td>Administration Vice President</td><td>17000.00</td><td>2005-09-21</td><td>Steven</td><td>2003-06-17</td><td>Executive</td><td>Seattle</td></tr><tr><td>105</td><td>David</td><td>Programmer</td><td>4800.00</td><td>2005-06-25</td><td>Alexander</td><td>2006-01-03</td><td>IT</td><td>San Francisco</td></tr><tr><td>110</td><td>John</td><td>Accountant</td><td>8200.00</td><td>2005-09-28</td><td>Nancy</td><td>2002-08-17</td><td>Finance</td><td>Seattle</td></tr><tr><td>111</td><td>Ismael</td><td>Accountant</td><td>7700.00</td><td>2005-09-30</td><td>Nancy</td><td>2002-08-17</td><td>Finance</td><td>Seattle</td></tr></tbody></table></div></div>

"**모든** 직원"이라는 표현이 있으면 업무·부서·상사가 없는 직원도 빠지면 안 되므로 LEFT JOIN을 이어 붙인다. 필기에는 `d.*`로 부서 테이블의 모든 컬럼을 한 번에 가져오는 방법도 적어 두었다.

```sql
select e.emp_id,
       d.*,  -- dept의 모든 컬럼을 조회
       j.job_title,
       m.emp_name "상사이름"
from   emp e left join job j  on e.job_id  = j.job_id
             left join dept d on e.dept_id = d.dept_id
             left join emp m  on e.mgr_id  = m.emp_id
where  year(e.hire_date) between 2003 and 2005;
```

## 보충: FULL OUTER JOIN 흉내 내기

MySQL은 `FULL OUTER JOIN`을 지원하지 않는다. 수업 자료에서는 LEFT JOIN과 RIGHT JOIN 결과를 `UNION`으로 합쳐 구현했다. `UNION`은 두 결과를 합치면서 중복 행을 없앤다.

```sql
select count(*) "직원 없는 부서 + 부서 없는 직원까지"
from (
    select d.dept_id, d.dept_name, e.emp_name
    from   dept d left join emp e on d.dept_id = e.dept_id
    union
    select d.dept_id, d.dept_name, e.emp_name
    from   dept d right join emp e on d.dept_id = e.dept_id
) t;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>직원 없는 부서 + 부서 없는 직원까지</th></tr></thead><tbody><tr><td>117</td></tr></tbody></table></div></div>

## 정리

| 조인 | 언제 쓰나 | 결과 |
|---|---|---|
| `A join B on ...` | 양쪽에 짝이 있는 데이터만 필요할 때 | 짝이 없는 행은 사라진다 |
| `A left join B on ...` | A를 **모두** 보여줘야 할 때 ("모든 직원", "직원이 없는 부서도") | 짝이 없으면 B 컬럼이 `NULL` |
| `A join A on ...` (self) | 같은 테이블 안의 관계 (직원–상사) | 별칭으로 역할을 나눈다 |
| `join ... on 범위조건` (non-equi) | 값이 범위에 속하는지로 연결할 때 (급여 등급) | 조건을 만족하는 행끼리 |

- 문제에 "**모든**", "**없는 경우도**"가 있으면 OUTER JOIN을 떠올린다.
- LEFT JOIN 결과를 셀 때는 `count(*)`가 아니라 타겟 테이블의 PK로 센다.
- OUTER JOIN에서 조건을 `ON`에 넣는지 `WHERE`에 넣는지에 따라 결과 행 수가 달라진다.
