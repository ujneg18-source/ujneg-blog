---
title: "DML: INSERT·UPDATE·DELETE로 데이터 바꾸기"
description: "INSERT로 행을 추가하고 UPDATE·DELETE로 수정·삭제하는 구문을 정리하고, WHERE로 대상 행을 먼저 확인하는 습관과 COMMIT·ROLLBACK을 다룹니다."
category: 'Tech'
subcategory: 'SQL'
series: 'SQL 기초'
seriesOrder: 8
originalNotebook: "07_DML.sql"
tags: ["SQL","MySQL","DML","Transaction"]
date: 2026-04-23
---

> SKN31 SQL 실습 파일 `07_DML.sql`의 필기를 바탕으로 정리했습니다. INSERT 규칙은 `01_DDL.sql` 실습과 수업 자료(`SQL.pdf`) 내용을 함께 정리했습니다.
> 예제는 `hr_join` 데이터베이스로 MariaDB 10.11(MySQL 호환)에서 다시 실행했습니다. 데이터가 바뀌는 실습이라 블로그용 실행은 트랜잭션 안에서 하고 마지막에 되돌렸습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- `INSERT`로 행을 추가하는 규칙
- `UPDATE`로 컬럼 값을 바꾸는 방법
- `DELETE`로 행을 지우는 방법
- 바꾸기 전에 `SELECT`로 대상 행을 확인하는 습관
- `COMMIT`과 `ROLLBACK`

## DML과 트랜잭션

데이터베이스 개요 글에서 정리했듯이 DML은 실행해도 바로 확정되지 않는다. 트랜잭션 안에서 임시로 적용되고, `COMMIT`으로 확정하거나 `ROLLBACK`으로 취소한다. (MySQL Workbench나 기본 클라이언트는 `autocommit`이 켜져 있어서 문장 하나가 끝날 때마다 자동으로 `COMMIT`된다.)

## INSERT: 행 추가

```sql
INSERT INTO 테이블명 (컬럼 [, 컬럼]) VALUES (값 [, 값]);
```

- 한 번에 한 행(레코드)씩 처리한다.
- 문자열 값은 작은따옴표로 감싼다.
- 날짜는 형식에 맞는 문자열로 넣는다. 날짜는 `-`나 `/`로, 시간은 `:`로 구분한다.
- 결측치는 `null` 키워드로 넣는다.
- 모든 컬럼에 값을 넣을 때는 컬럼 목록을 생략할 수 있다. 이때 값의 순서는 테이블 컬럼 순서와 같아야 한다.

`DEFAULT`와 제약조건이 INSERT에 어떻게 작용하는지는 [DDL 글](/notes/sql/sql-ddl-create-table)에서 직접 확인했다.

### 보충: hr_join에 직원 추가

`hr_join`의 테이블 생성 스크립트 마지막에 남아 있던 실습 문장이다.

```sql
-- (emp_id, emp_name, job_id, mgr_id, hire_date, salary, comm_pct, dept_id)
insert into emp values (500, '김직원', 'IT_PROG', 100, '2025-10-10', 5000, null, 100);
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

```sql
select * from emp where emp_id = 500;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th></tr></thead><tbody><tr><td>500</td><td>김직원</td><td>IT_PROG</td><td>100</td><td>2025-10-10</td><td>5000.00</td><td><span class="sql-null">NULL</span></td><td>100</td></tr></tbody></table></div></div>

`dept_id`, `job_id`, `mgr_id`는 Foreign Key다. 부모 테이블에 없는 값을 넣으면 거부된다.

```sql
-- 보충: 존재하지 않는 부서 999
insert into emp values (501, '박직원', 'IT_PROG', 100, '2025-10-10', 5000, null, 999);
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">실행 결과 · 에러 1452: Cannot add or update a child row: a foreign key constraint fails (`hr_join`.`emp`, CONSTRAINT `fk_emp_dept` FOREIGN KEY (`dept_id`) REFERENCES `dept` (`dept_id`) ON DELETE SET NULL)</div></div>

## UPDATE: 값 수정

```sql
UPDATE 테이블명
SET    변경할컬럼 = 변경할값 [, 변경할컬럼 = 변경할값]
[WHERE 제약조건];
```

| 절 | 역할 |
|---|---|
| `UPDATE` | 변경할 테이블 지정 |
| `SET` | 변경할 컬럼과 값 지정 |
| `WHERE` | 변경할 행 선택 |

필기에서는 매번 **같은 `WHERE`로 먼저 `SELECT`를 실행**해서 어떤 행이 바뀌는지 확인한 뒤 `UPDATE`를 실행했다.

**직원 ID가 200인 직원의 급여를 5000으로 변경**

```sql
select emp_id, emp_name, salary from emp where emp_id = 200;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th></tr></thead><tbody><tr><td>200</td><td>Jennifer</td><td>4400.00</td></tr></tbody></table></div></div>

```sql
update emp
set    salary = 5000
where  emp_id = 200;
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

**직원 ID가 200인 직원의 급여를 10% 인상한 값으로 변경**

```sql
update emp
set    salary = salary * 1.1
where  emp_id = 200;
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

```sql
select emp_id, emp_name, salary from emp where emp_id = 200;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th></tr></thead><tbody><tr><td>200</td><td>Jennifer</td><td>5500.00</td></tr></tbody></table></div></div>

`set salary = salary * 1.1`에서 오른쪽 `salary`는 **바뀌기 전** 값이다. 5000의 10% 인상이라 5500이 됐다.

**부서 ID가 100인 직원의 커미션 비율을 0.2로, salary는 3000 인상한 값으로 변경**

```sql
select emp_id, emp_name, salary, comm_pct from emp where dept_id = 100;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 7행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>comm_pct</th></tr></thead><tbody><tr><td>108</td><td>Nancy</td><td>12008.00</td><td><span class="sql-null">NULL</span></td></tr><tr><td>109</td><td>Daniel</td><td>9000.00</td><td><span class="sql-null">NULL</span></td></tr><tr><td>110</td><td>John</td><td>8200.00</td><td><span class="sql-null">NULL</span></td></tr><tr><td>111</td><td>Ismael</td><td>7700.00</td><td><span class="sql-null">NULL</span></td></tr><tr><td>112</td><td>Jose Manuel</td><td>7800.00</td><td><span class="sql-null">NULL</span></td></tr><tr><td>113</td><td>Luis</td><td>6900.00</td><td><span class="sql-null">NULL</span></td></tr><tr><td>500</td><td>김직원</td><td>5000.00</td><td><span class="sql-null">NULL</span></td></tr></tbody></table></div></div>

```sql
update emp
set    comm_pct = 0.2,
       salary   = salary + 3000
where  dept_id = 100;
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 7행 처리됨</div></div>

```sql
select emp_id, emp_name, salary, comm_pct from emp where dept_id = 100;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 7행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>salary</th><th>comm_pct</th></tr></thead><tbody><tr><td>108</td><td>Nancy</td><td>15008.00</td><td>0.20</td></tr><tr><td>109</td><td>Daniel</td><td>12000.00</td><td>0.20</td></tr><tr><td>110</td><td>John</td><td>11200.00</td><td>0.20</td></tr><tr><td>111</td><td>Ismael</td><td>10700.00</td><td>0.20</td></tr><tr><td>112</td><td>Jose Manuel</td><td>10800.00</td><td>0.20</td></tr><tr><td>113</td><td>Luis</td><td>9900.00</td><td>0.20</td></tr><tr><td>500</td><td>김직원</td><td>8000.00</td><td>0.20</td></tr></tbody></table></div></div>

`SET`에 여러 컬럼을 쉼표로 이어 쓰면 한 번에 바뀐다. 위에서 추가한 `김직원`(500번)도 100번 부서라서 함께 바뀌었다. `WHERE`가 행 하나가 아니라 조건에 맞는 **모든 행**을 고른다는 점이 여기서 보인다.

**부서 ID가 100인 직원의 커미션 비율을 null로 변경**

```sql
update emp
set    comm_pct = null
where  dept_id = 100;
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 7행 처리됨</div></div>

`NULL`로 바꿀 때는 `= null`을 쓴다. 비교(`is null`)가 아니라 **대입**이기 때문이다.

## DELETE: 행 삭제

```sql
DELETE FROM 테이블명 [WHERE 제약조건];
```

`WHERE`로 삭제할 행을 고른다. `WHERE`를 빼면 **모든 행**이 삭제된다.

**부서 테이블에서 부서 ID가 200인 부서 삭제**

```sql
select * from dept where dept_id = 200;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>dept_id</th><th>dept_name</th><th>loc</th></tr></thead><tbody><tr><td>200</td><td>Operations</td><td>Seattle</td></tr></tbody></table></div></div>

```sql
delete from dept where dept_id = 200;
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 1행 처리됨</div></div>

**부서 ID가 없는 직원들을 삭제**

```sql
select emp_id, emp_name, dept_id from emp where dept_id is null;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>dept_id</th></tr></thead><tbody><tr><td>175</td><td>Alyssa</td><td><span class="sql-null">NULL</span></td></tr><tr><td>178</td><td>Kimberely</td><td><span class="sql-null">NULL</span></td></tr><tr><td>183</td><td>Girard</td><td><span class="sql-null">NULL</span></td></tr><tr><td>184</td><td>Nandita</td><td><span class="sql-null">NULL</span></td></tr><tr><td>185</td><td>Alexis</td><td><span class="sql-null">NULL</span></td></tr></tbody></table></div></div>

```sql
delete from emp where dept_id is null;
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 5행 처리됨</div></div>

### 조건 확인의 중요성

**담당 업무가 'SA_MAN'이고 급여가 12000 미만인 직원들을 삭제**

필기에는 이렇게 적었다.

```sql
select emp_id, emp_name, job_id, salary from emp where job_id = 'SA_MAN' and salary <= 12000;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 3행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>salary</th></tr></thead><tbody><tr><td>147</td><td>Alberto</td><td>SA_MAN</td><td>12000.00</td></tr><tr><td>148</td><td>Gerald</td><td>SA_MAN</td><td>11000.00</td></tr><tr><td>149</td><td>Eleni</td><td>SA_MAN</td><td>10500.00</td></tr></tbody></table></div></div>

정리하면서 다시 보니 문제는 "12000 **미만**"인데 조건을 `<=`(이하)로 썼다. 그래서 급여가 정확히 12000인 `Alberto`까지 삭제 대상에 들어갔다. 필기의 `delete` 문도 같은 `<=` 조건이라 원래 실습에서는 3명이 지워졌을 것이다. 문제대로라면 `<`를 써야 하고, 그러면 `Gerald`, `Eleni` 2명만 삭제된다.

```sql
delete from emp where job_id = 'SA_MAN' and salary < 12000;
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 2행 처리됨</div></div>

**comm_pct가 null이고 job_id가 IT_PROG인 직원들을 삭제**

```sql
select emp_id, emp_name, job_id, comm_pct from emp where comm_pct is null and job_id = 'IT_PROG';
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 전체 6행 중 5행</div><div class="sql-result-scroll"><table><thead><tr><th>emp_id</th><th>emp_name</th><th>job_id</th><th>comm_pct</th></tr></thead><tbody><tr><td>103</td><td>Alexander</td><td>IT_PROG</td><td><span class="sql-null">NULL</span></td></tr><tr><td>104</td><td>Bruce</td><td>IT_PROG</td><td><span class="sql-null">NULL</span></td></tr><tr><td>105</td><td>David</td><td>IT_PROG</td><td><span class="sql-null">NULL</span></td></tr><tr><td>106</td><td>Valli</td><td>IT_PROG</td><td><span class="sql-null">NULL</span></td></tr><tr><td>107</td><td>Diana</td><td>IT_PROG</td><td><span class="sql-null">NULL</span></td></tr></tbody></table></div></div>

```sql
delete from emp where comm_pct is null and job_id = 'IT_PROG';
```

<div class="sql-result sql-result-info"><div class="sql-result-meta">실행 결과 · 6행 처리됨</div></div>

## 보충: ROLLBACK으로 되돌리기

블로그용 실행은 처음에 `start transaction`으로 트랜잭션을 열고 진행했다. 지금까지 바꾼 내용을 확인하고 되돌려 본다.

```sql
select count(*) "삭제 후 직원 수" from emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>삭제 후 직원 수</th></tr></thead><tbody><tr><td>95</td></tr></tbody></table></div></div>

```sql
rollback;
select count(*) "rollback 후 직원 수" from emp;
```

<div class="sql-result"><div class="sql-result-meta">실행 결과 · 1행</div><div class="sql-result-scroll"><table><thead><tr><th>rollback 후 직원 수</th></tr></thead><tbody><tr><td>107</td></tr></tbody></table></div></div>

트랜잭션을 연 뒤의 INSERT·UPDATE·DELETE가 모두 취소되어 처음 상태(107명)로 돌아왔다. `COMMIT`을 실행했다면 확정되어 되돌릴 수 없다. DDL(`DROP TABLE` 등)은 트랜잭션과 관계없이 바로 확정된다는 점과 비교해 두면 좋다.

## 정리

| 하고 싶은 일 | 구문 |
|---|---|
| 행 추가 | `INSERT INTO t (c1, c2) VALUES (v1, v2)` |
| 값 수정 | `UPDATE t SET c1 = v1 [, c2 = v2] WHERE 조건` |
| 행 삭제 | `DELETE FROM t WHERE 조건` |
| 확정 / 취소 | `COMMIT` / `ROLLBACK` |

- `UPDATE`, `DELETE` 전에는 같은 `WHERE`로 `SELECT`를 먼저 실행해 대상 행을 확인한다.
- `WHERE`를 빼면 테이블의 모든 행이 바뀌거나 지워진다.
- 경계값(`<` / `<=`)은 문제 문장과 한 번 더 대조한다.
- Foreign Key가 걸린 컬럼에는 부모 테이블에 있는 값만 넣을 수 있다.
