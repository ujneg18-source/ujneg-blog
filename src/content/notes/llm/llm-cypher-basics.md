---
title: "Cypher 기초: CREATE, MATCH, MERGE, SET, DELETE"
description: "Neo4j의 쿼리 언어 Cypher의 기본 표기법(노드·관계·속성)과 CRUD 구문을 LangChain Neo4jGraph로 직접 실행하며 정리합니다. CREATE로 노드와 관계를 만들고, MATCH·WHERE·ORDER BY·OPTIONAL MATCH로 조회하고, MERGE·SET·DELETE·REMOVE로 수정·삭제하며 CREATE의 중복 생성 문제와 MERGE의 매칭 규칙을 확인합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'GraphRAG'
seriesOrder: 2
originalNotebook: "GraphRAG/01_Neo4jGraph와 Cypher_쿼리_1.ipynb"
tags: ["LLM","GraphRAG"]
date: 2026-07-10T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-cypher-basics.webp'
---

> SKN31 AI Agent 과정 노트북 `GraphRAG/01_Neo4jGraph와 Cypher_쿼리_1.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과입니다. 셀을 여러 순서로 다시 실행해서 DB 상태가 출력마다 조금씩 다르고, 비어 있던 SET·레이블·삭제 일부는 **강사님 노트북의 실행 결과**로 채웠습니다.

## 이 글에서 다루는 것

- Cypher 표기법: `()` 노드, `[]` 관계, `{}` 속성
- CREATE: 노드, 관계, 한 번에 만들기
- MATCH / RETURN / WHERE / ORDER BY / SKIP / LIMIT
- OPTIONAL MATCH
- MERGE와 `ON CREATE SET` / `ON MATCH SET`
- SET, DELETE / DETACH DELETE, REMOVE

지난 글에서 Neo4j에 연결했다. 이번 글은 그래프에 데이터를 넣고 꺼내는 언어인 **Cypher**다. SQL을 알면 대응 관계가 보이지만, 핵심은 **그래프 패턴을 그림처럼 쓴다**는 점이다.

## 표기법

```cypher
(n)                     // 모든 노드
(p:Person)              // Person 레이블의 노드를 조회하고 변수 p에 할당
(m {name: "Neo4j"})     // name 속성이 "Neo4j"인 노드들을 변수 m에 할당
(p:Person {age: 30})    // Person 레이블의 age 속성이 30인 노드들을 변수 p에 할당
-[r:KNOWS]->            // 변수 r에 KNOWS 관계들을 할당
```

```python
# (n) 모든 노드
# (p:Person)
```

| 기호 | 의미 |
|---|---|
| `()` | 노드 |
| `[]` | 관계 |
| `{}` | 속성 |
| `:` | 레이블(노드) 또는 타입(관계) |
| `->`, `<-` | 관계 방향. CREATE에서는 방향이 반드시 있어야 한다 |
| `//`, `/* */` | 한 줄 / 여러 줄 주석 |

관계는 이렇게 쓴다.

```cypher
-->                         // 모든 관계
-[r:KNOWS]->                // 관계 타입 지정. KNOWS 타입의 관계 
-[r:LIKES {since: 2020}]->  // 속성을 가진 관계
<-[r:FOLLOWS]-              // 방향이 반대인 관계
-[r:FRIENDS|KNOWS]->        // 여러 타입의 관계(OR 조건)
```

## CREATE

새 노드와 관계를 만든다. **같은 노드가 이미 있어도 또 만든다.** 중복을 막으려면 제약조건(constraint)을 걸거나 MERGE를 쓴다.

```cypher
// 노드 생성
CREATE (변수:라벨 {속성키: 속성값, ...})

// 관계 생성 (양 노드가 이미 존재할 때)
MATCH (a), (b)
WHERE 조건
CREATE (a)-[:관계타입 {속성}]->(b)

// 노드와 관계 한 번에 생성
CREATE (a:Label1 {...})-[:REL_TYPE]->(b:Label2 {...})
```

### 노드 만들기

```python
#############################################################
# Neo4j 데이터베이스에 노드 생성하기 (CREATE 구문 사용)
# CREATE 구문은 새로운 노드나 관계를 생성할 때 사용한다.
#############################################################

cypher_query = """
/*
노드 레이블 : Person (사람을 나타내는 레이블)
노드 속성 정의:
  - name: "홍길동" (이름)
  - age: 30 (나이)
  - email: "hong@abc.com" (이메일 주소)
*/
// p는 생성된 노드를 참조하는 변수명.
CREATE (:Person {name: "홍길동", age: 30, email: "hong@abc.com"})
"""


graph.query(cypher_query)
```

```text
[]
```

```python
# 노드를 재활용할 거면 변수명을 부여하고 쓰지 않을거면 변수명 부여 굳이 할 필요 없음
```

`RETURN`이 없으니 결과는 빈 리스트다. 주석에는 "p는 변수명"이라고 되어 있지만 실제 쿼리는 `(:Person ...)`으로 변수를 생략했다. 메모대로 뒤에서 다시 쓸 게 아니면 변수가 필요 없다.

여러 노드를 한 번에 만든다.

```python
# 여러개의 노드를 만듦

# 노드 레이블 
# -person
# -city

# person property : name(str), age(int), gender(str)
# city property : name(str), population(int)

# CREATE 구문을 사용하여 여러 노드를 한 번에 생성할 수 있다.
# CREATE => person/City=(노드이름), {dict}=(노드레이블) 

cypher_query = """
/* 
노드 레이블 정의:
  - Person: 사람을 나타내는 레이블
  - City: 도시를 나타내는 레이블

Person 노드 속성 정의:
  - name: 사람의 이름 (문자열)
  - age: 사람의 나이 (숫자)
  - gender: 성별 (문자열)
City 노드 속성 정의:
  - name: 도시 이름 (문자열)
  - population: 인구수 (숫자)
*/

CREATE 
  (:Person {name: "김영수", age: 25, gender: "남성"}),  
  (:Person {name: "최영희", age: 28, gender: "여성"}),
  (:City {name: "서울", population: 9700000}),
  (:City {name: "부산", population: 3200000}),
  (:City {name: "인천", population: 3050000})
"""

# "Neo4j에서는 미리 컬럼(속성)을 정의할 필요가 없으며, 필요한 속성만 넣어서 노드를 생성할 수 있다."/ 성별 모르면 안넣고, 이메일 없으면 안넣고

# RDBS
# CREATE TABLE Person (
#     name VARCHAR(30),
#     age INT,
#     gender VARCHAR(10),
#     email VARCHAR(100)             #관계형 데이터베이스는 미리 속성을 정해두고 데이터베이스를 설계했음 
# );

graph.query(cypher_query)
```

> **보충**: 메모의 `CREATE => person/City=(노드이름), {dict}=(노드레이블)`은 용어가 바뀌어 있다. `Person`, `City`가 **레이블**이고, `{...}`는 **속성**(property)이다. 노드 자체에는 이름이 없고, 앞에 붙이는 `p` 같은 것은 쿼리 안에서만 쓰는 **변수**다.

메모의 RDB 비교가 핵심이다. 테이블은 컬럼을 미리 정해야 하지만, 그래프 DB의 노드는 **속성을 미리 정의하지 않는다.** 홍길동에게는 email이 있고 김영수에게는 gender가 있어도 된다. 대신 같은 레이블의 노드가 서로 다른 속성을 가질 수 있으니, 꼭 있어야 하는 속성은 제약조건으로 강제해야 한다(다음 글).

### 관계 만들기

이미 있는 노드 사이에 관계를 만들려면 **MATCH로 찾고 CREATE로 연결**한다.

```python
#########################################
# 기존 노드 사이에 관계 생성하기
########################################

# Person과 Person끼리의 관계를 연결
# Person -[:KNOWS {since: 년도}]-> Person

cypher_query = """
/*
관계 레이블 : KNOWS (알고 있다는 관계를 나타냄)
관계 속성 : 관계도 속성을 가질 수 있다. {name: value, ...} 형태로 설정
관계 방향 : a -> b (홍길동이 김영수를 알고 있는 방향성)
관계 속성 값 : since = 2024 (2024년부터 관계가 시작됨)
*/

// MATCH 구문으로 두 개의 기존 노드를 찾음
MATCH
    (a:Person {name: "홍길동"}),
    (b:Person {name: "김영수"})

// CREATE 구문으로 두 노드 사이에 방향성 있는 관계 생성
CREATE
    (a)-[r1:KNOWS {since: 2024}]->(b)

CREATE
    (b)-[r2:KNOWS {since: 2024}]->(a)

// RETURN 구문으로 노드와 관계 정보 반환
RETURN a, b, r1, r2
"""

graph.query(cypher_query)
```

```text
[{'a': {'name': '홍길동', 'age': 30, 'email': 'hong@abc.com'},
  'b': {'gender': '남성', 'name': '김영수', 'age': 25},
  'r1': ({'name': '홍길동', 'age': 30, 'email': 'hong@abc.com'},
   'KNOWS',
   {'gender': '남성', 'name': '김영수', 'age': 25}),
  'r2': ({'gender': '남성', 'name': '김영수', 'age': 25},
   'KNOWS',
   {'name': '홍길동', 'age': 30, 'email': 'hong@abc.com'})}]
```

관계에는 방향이 하나뿐이라 "서로 안다"를 표현하려고 `r1`, `r2` 두 개를 만들었다. `Neo4jGraph.query()`는 관계를 `(시작 노드, 타입, 끝 노드)` 튜플로 돌려준다.

> **보충**: "서로 안다"처럼 대칭인 관계는 보통 **하나만 저장하고 조회할 때 방향을 빼서**(`(a)-[:KNOWS]-(b)`) 양방향으로 찾는다. 두 개를 저장하면 데이터가 두 배가 되고, 한쪽만 지우는 실수가 생기기 쉽다. 반대로 "팔로우"처럼 한쪽만 성립할 수 있는 관계는 방향별로 따로 저장해야 의미가 맞다.

```python
######################################################
#  기존에 생성된 노드들 사이에 관계를 추가하는 Cypher 쿼리
######################################################

# Person - [LIVES_IN{since:년도}] -> City

cypher_query = """
// MATCH 구문으로 두 개의 기존 노드를 찾음
MATCH 
  (a:Person {name: "홍길동"}),  // Person 레이블을 가진 이름이 이영희인 노드를 찾아 변수 a에 할당
  (c:City {name: "서울"})       // City 레이블을 가진 이름이 서울인 노드를 찾아 변수 c에 할당

// MATCH로 조회한 노드를 이용해 CREATE 구문으로 두 노드 사이에 방향성 있는 관계 생성한다.
CREATE (a)-[r:LIVES_IN {since: 2024}]->(c)  // a에서 c로 향하는 LIVES_IN 타입의 관계 r 생성, since 속성 추가

// RETURN 구문으로 노드와 관계 정보 반환
RETURN a, c, r  // 생성된 관계와 연결된 두 노드 정보를 함께 반환
"""
graph.query(cypher_query)
```

```text
[{'a': {'name': '홍길동', 'age': 30, 'email': 'hong@abc.com'},
  'c': {'name': '서울', 'population': 9700000},
  'r': ({'name': '홍길동', 'age': 30, 'email': 'hong@abc.com'},
   'LIVES_IN',
   {'name': '서울', 'population': 9700000})}]
```

### 노드와 관계를 한 번에

```python
########################################
# 노드와 관계를 한 번에 생성하는 Cypher 쿼리
########################################

cypher_query = """
// 노드 레이블 : Person, Team, City (각각 사람, 팀, 도시를 나타내는 레이블)

// CREATE 구문으로 노드 생성
CREATE
    (p1:Person {name: "손흥민", age: 35, gender: "남성"}),
    (p2:Person {name: "홍명보", age: 57, gender: "남성"}),
    (t:Team {name: "LAFC"}),
    (c:City {name: "LA"})

// CREATE 구문으로 관계 생성
CREATE
    (p1)-[r:PLAY_FOR]->(t),
    (p1)-[h:LIVES_IN {since: 2025}]->(c),
    (p1)-[m:MANAGER]->(p2)

// RETURN 구문으로 생성된 노드와 관계 정보 반환
RETURN
    p1 AS Player,
    t AS Team,
    c AS City,
    p2 AS Manager,
    r AS PlayFor,
    h AS LivesIn,
    m AS ManagerRelation
"""

graph.query(cypher_query)
```

```text
[{'Player': {'gender': '남성', 'name': '손흥민', 'age': 35},
  'Team': {'name': 'LAFC'},
  'City': {'name': 'LA'},
  'Manager': {'gender': '남성', 'name': '홍명보', 'age': 57},
  'PlayFor': ({...'손흥민'...}, 'PLAY_FOR', {'name': 'LAFC'}),
  'LivesIn': ({...'손흥민'...}, 'LIVES_IN', {'name': 'LA'}),
  'ManagerRelation': ({...'손흥민'...}, 'MANAGER', {...'홍명보'...})}]
```

같은 쿼리 안에서 만든 노드는 변수(`p1`, `t`)로 바로 연결할 수 있다. `RETURN ... AS`로 결과 key 이름도 바꿨다.

> **보충**: `(손흥민)-[:MANAGER]->(홍명보)`는 "손흥민이 홍명보를 관리한다"로 읽힌다. 의도는 "홍명보가 손흥민의 감독"일 테니 `(홍명보)-[:MANAGES]->(손흥민)` 또는 `(손흥민)-[:MANAGED_BY]->(홍명보)`로 쓰는 편이 맞다. 앞 글의 결재권자 예처럼, 관계 이름은 **화살표 방향으로 읽었을 때 문장이 되도록** 짓는다.

### CREATE는 중복을 만든다

이번엔 기존 손흥민 노드를 MATCH하고 홍길동을 CREATE로 붙였다.

```python
cypher_query = """
MATCH (s:Person {name: "손흥민"})

CREATE
    (h:Person {name: "홍길동"}),
    (h)-[:KNOWS {since: 2024}]->(s)

RETURN h, s
"""

graph.query(cypher_query)
```

```text
[{'h': {'name': '홍길동'}, 's': {'gender': '남성', 'name': '손흥민', 'age': 35}}]
```

반환된 홍길동에는 age도 email도 없다. 기존 홍길동을 찾은 게 아니라 **이름만 있는 홍길동을 새로 하나 더 만든** 것이다. 홍길동이 이제 두 명이다. 있는 노드에 연결하려면 MATCH로 찾아야 하고, "있으면 쓰고 없으면 만들기"는 MERGE의 일이다.

### 스키마 확인

```python
######################
# schema 조회
######################
graph.refresh_schema()
print(graph.schema)
# LLM에 관계구조를 설계할떄 스키마 정보를 주면 됌
```

```text
Node properties:
Person {age: INTEGER, name: STRING, gender: STRING}
City {name: STRING}
Team {name: STRING}
Relationship properties:
KNOWS {since: INTEGER}
LIVES_IN {since: INTEGER}
The relationships:
(:Person)-[:LIVES_IN]->(:City)
(:Person)-[:PLAY_FOR]->(:Team)
(:Person)-[:MANAGER]->(:Person)
(:Person)-[:KNOWS]->(:Person)
```

메모대로 이 스키마 텍스트가 나중에 LLM이 Cypher를 만들 때 넘겨주는 정보가 된다. 어떤 레이블이 어떤 속성을 가지고 어떤 관계로 이어지는지가 한눈에 보인다.

## MATCH와 RETURN

MATCH는 그래프에서 패턴을 **조회**한다. SQL의 SELECT에 해당하고, 결과를 보려면 RETURN이 함께 있어야 한다.

```cypher
// 기본구문
MATCH 패턴
[WHERE 조건1 AND/OR 조건2 ...]
RETURN ...
[ORDER BY 정렬기준컬럼 ASC|DESC]

MATCH (n) RETURN n;                                    // 모든 노드
MATCH (m:Movie) RETURN m;                              // 특정 라벨
MATCH (m:Movie {title: '기생충'}) RETURN m;            // 속성 조건
MATCH (p:Person)-[r:DIRECTED]->(m:Movie) RETURN p, r, m;  // 관계 패턴
MATCH path = (:Person)-[:DIRECTED]->(:Movie) RETURN path  // 경로 전체를 변수로
```

RETURN에는 노드(`n`), 속성(`n.name`), 관계(`r`), 계산식(`n.born + 10`), 문자열 결합, 리스트(`[n.name, n.born]`)를 쓸 수 있고 `AS`로 별칭, `DISTINCT`로 중복 제거를 한다.

```python
###############################
# 모든 노드 조회
###############################

cypher_query = """
// 모든 노드를 조회
MATCH (n)

// 노드와 레이블을 함께 반환
RETURN
    n,
    labels(n) AS Labels
"""

graph.query(cypher_query)
```

```text
[{'n': {'gender': '남성', 'name': '손흥민', 'age': 35}, 'Labels': ['Person']},
 {'n': {'gender': '남성', 'name': '홍명보', 'age': 57}, 'Labels': ['Person']},
 {'n': {'name': 'LAFC'}, 'Labels': ['Team']},
 {'n': {'name': 'LA'}, 'Labels': ['City']},
 {'n': {'name': '홍길동'}, 'Labels': ['Person']}]
```

노드 자체를 반환하면 속성 dict만 오고 레이블은 빠진다. 레이블은 `labels(n)`으로 따로 꺼낸다. 노드 하나가 레이블을 여러 개 가질 수 있어서 리스트로 온다.

```python
######################################
# 특정 Label의 노드 조회 및 특정 속성 출력
######################################
cypher_query = """

MATCH (p:Person) // Person Label의 노드들만 조회
RETURN p

"""
graph.query(cypher_query)
```

```text
[{'p': {'gender': '남성', 'name': '손흥민', 'age': 35}},
 {'p': {'gender': '남성', 'name': '홍명보', 'age': 57}},
 {'p': {'name': '홍길동'}}]
```

관계를 조회할 때는 패턴에 변수를 붙이고 `type(r)`로 관계 타입을 꺼낸다.

```python
###############################################################
# 노드와 노드간의 관계를 조회
# (Person 레이블을 가진 노드와 City 레이블을 가진 노드 사이의 관계 조회)
###############################################################

cypher_query = """
MATCH (n)-[r]->(m)

RETURN
    type(r) AS 관계정보,

    n.name AS 선수명,

    m.name AS 타겟노드
"""

result = graph.query(cypher_query)

for row in result:
    pprint(row)
    print("-" * 50)
```

```text
{'관계정보': 'LIVES_IN', '선수명': '손흥민', '타겟노드': 'LA'}
--------------------------------------------------
{'관계정보': 'PLAY_FOR', '선수명': '손흥민', '타겟노드': 'LAFC'}
--------------------------------------------------
{'관계정보': 'MANAGER', '선수명': '손흥민', '타겟노드': '홍명보'}
--------------------------------------------------
{'관계정보': 'KNOWS', '선수명': '홍길동', '타겟노드': '손흥민'}
--------------------------------------------------
```

`(n)-[r]->(m)`은 레이블도 타입도 지정하지 않은 패턴이라 **DB의 모든 관계**가 나온다.

### WHERE와 collect()

속성이 정확히 일치하는 조건은 패턴 안 `{}`에 쓰고, 비교 조건은 WHERE에 쓴다.

```python
# 속성이 일치하는 노드들 조회ㅏ
cypher_query = """

MATCH (p:Person {age:35}) // Person 라벨의 노드 중 age=35 것인 을 조회
Return p

"""
```

```text
{'p': {'age': 35, 'gender': '남성', 'name': '손흥민'}}
```

```python
# WHERE 사용
# 결과ㅓ가 여러개일 때 list로 묶어서 반환 ==> 내장함수 collect()
cypher_query = """

MATCH (p:Person) // Person 라벨의 노드 중 age=35 것인 을 조회
WHERE p.age > 30
Return collect(p.name) AS NAME

"""
```

```text
{'NAME': ['손흥민', '홍명보']}
```

`collect()`는 여러 행을 **리스트 하나로** 묶는 집계 함수다. 결과가 행 2개가 아니라 리스트를 가진 행 1개로 왔다.

```python
graph.query("""
MATCH (n)
RETURN collect(n.name) AS names
""")
```

```text
[{'names': ['손흥민', '홍명보', 'LAFC', 'LA', '홍길동']}]
```

| 연산자 | 의미 | 예 |
|---|---|---|
| `=`, `<>` | 같다 / 다르다 | `WHERE n.age = 30` |
| `<`, `<=`, `>`, `>=` | 범위 비교 | `WHERE n.age > 30` |
| `IN [...]` | 리스트 포함 | `WHERE n.age IN [20, 30, 40]` |
| `STARTS WITH`, `ENDS WITH`, `CONTAINS` | 문자열 검색 | `WHERE n.name STARTS WITH '손'` |
| `=~` | 정규식 | `WHERE n.email =~ '.*@gmail.com'` |
| `IS NULL`, `IS NOT NULL` | 속성 존재 여부 | `WHERE n.email IS NOT NULL` |
| `AND`, `OR`, `NOT` | 논리 연산 | |

```python
###############################################################
# 조건 지정 (WHERE 구문)
# WHERE 구문은 MATCH로 찾은 패턴에 추가 조건을 적용할 때 사용
###############################################################
cypher_query = """
// Person 레이블을 가진 노드 중에서 age 속성이 20 이상인 사람 조회
MATCH (p:Person)
WHERE p.age >= 20

RETURN collect(p.name) AS 이름
"""

# WHERE p.email IS NOT NULL => 이메일이 있는지 없는지 CHECK
# WHERE p.name STARS IN 손 

graph.query(cypher_query)
```

```text
[{'이름': ['손흥민', '홍명보']}]
```

새로 만든 홍길동은 age가 없어서 `p.age >= 20`이 null이 되고 결과에서 빠졌다. 속성이 없는 노드는 비교 조건에 걸리지 않는다.

> **보충**: 메모의 `STARS IN`은 `STARTS WITH`다. "손으로 시작하는 이름"은 `WHERE p.name STARTS WITH '손'`으로 쓴다.

### ORDER BY, SKIP, LIMIT

```python
#################################################
#  나이 순 정렬 - ORDER BY와 LIMIT 사용 예제
#################################################
cypher_query = """
// Person 레이블을 가진 모든 노드를 조회

MATCH (p:Person)

// 찾은 Person 노드 전체를 결과로 반환
RETURN p.name AS 이름, p.age AS 나이

/*
 ORDER BY 절을 사용하여 결과를 정렬
 p.age: Person 노드의 age 속성을 기준으로 정렬
 - 정렬방식
   - ASC: 오름차순 정렬 (작은 값에서 큰 값 순서로 정렬: Default)
   - DESC를 사용하면 내림차순 정렬.
*/
ORDER BY p.age ASC


// LIMIT 절을 사용하여 반환되는 결과의 수를 제한 한다. (LIMIT 개수)
LIMIT 2
"""


result = graph.query(cypher_query)

print("나이 순 정렬 결과:")

for record in result:
    print(record)
```

```text
나이 순 정렬 결과:
{'이름': '손흥민', '나이': 35}
{'이름': '홍명보', '나이': 57}
```

Person이 셋인데 둘만 나왔다. `LIMIT 2` 때문이기도 하지만, age가 없는 홍길동은 오름차순 정렬에서 **맨 뒤**로 간다. Neo4j는 null을 정렬에서 가장 큰 값처럼 다룬다.

### 직접 만든 축구 데이터로 연습

수업 예제를 넘어 선수와 감독, 팀 데이터를 직접 만들어 관계를 걸었다. 선수와 감독 Person 노드를 먼저 만든 뒤, 팀은 MERGE로 만들고 관계를 연결했다.

```python
#######################################
# 선수, 감독, 팀 관계 생성
#######################################

cypher_query = """
// ==============================
// 선수 ↔ 팀 관계
// ==============================

MATCH (lee:Person {name:"이강인"})
MATCH (kim:Person {name:"김민재"})
MATCH (hwang:Person {name:"황희찬"})
MATCH (park:Person {name:"박지성"})
MATCH (cha:Person {name:"차범근"})
MATCH (messi:Person {name:"리오넬 메시"})
MATCH (ronaldo:Person {name:"크리스티아누 호날두"})
MATCH (mbappe:Person {name:"킬리안 음바페"})
MATCH (haaland:Person {name:"엘링 홀란"})
MATCH (bellingham:Person {name:"주드 벨링엄"})
MATCH (vini:Person {name:"비니시우스 주니오르"})
MATCH (salah:Person {name:"모하메드 살라"})
MATCH (kdb:Person {name:"케빈 더브라위너"})

MERGE (psg:Team {name:"파리 생제르맹"})
MERGE (bayern:Team {name:"바이에른 뮌헨"})
MERGE (wolves:Team {name:"울버햄튼"})
MERGE (mancity:Team {name:"맨체스터 시티"})
MERGE (realmadrid:Team {name:"레알 마드리드"})
MERGE (intermiami:Team {name:"인터 마이애미"})
MERGE (alnassr:Team {name:"알 나스르"})
MERGE (liverpool:Team {name:"리버풀"})

MERGE (lee)-[:PLAY_FOR]->(psg)
MERGE (kim)-[:PLAY_FOR]->(bayern)
MERGE (hwang)-[:PLAY_FOR]->(wolves)
MERGE (park)-[:PLAY_FOR]->(mancity)
MERGE (cha)-[:PLAY_FOR]->(bayern)
MERGE (messi)-[:PLAY_FOR]->(intermiami)
MERGE (ronaldo)-[:PLAY_FOR]->(alnassr)
MERGE (mbappe)-[:PLAY_FOR]->(realmadrid)
MERGE (haaland)-[:PLAY_FOR]->(mancity)
MERGE (bellingham)-[:PLAY_FOR]->(realmadrid)
MERGE (vini)-[:PLAY_FOR]->(realmadrid)
MERGE (salah)-[:PLAY_FOR]->(liverpool)
MERGE (kdb)-[:PLAY_FOR]->(mancity)

// ==============================
// 감독 ↔ 팀 관계
// ==============================

MATCH (pep:Person {name:"펩 과르디올라"})
MATCH (ancelotti:Person {name:"카를로 안첼로티"})
MATCH (klopp:Person {name:"위르겐 클롭"})
MATCH (enrique:Person {name:"루이스 엔리케"})
MATCH (tuchel:Person {name:"토마스 투헬"})

MATCH (psg:Team {name:"파리 생제르맹"})
MATCH (bayern:Team {name:"바이에른 뮌헨"})
MATCH (mancity:Team {name:"맨체스터 시티"})
MATCH (realmadrid:Team {name:"레알 마드리드"})
MATCH (liverpool:Team {name:"리버풀"})

MERGE (pep)-[:COACH_OF]->(mancity)
MERGE (ancelotti)-[:COACH_OF]->(realmadrid)
MERGE (klopp)-[:COACH_OF]->(liverpool)
MERGE (enrique)-[:COACH_OF]->(psg)
MERGE (tuchel)-[:COACH_OF]->(bayern)

// ==============================
// 사람 ↔ 사람 관계
// ==============================

MERGE (lee)-[:KNOWS]->(kim)
MERGE (lee)-[:KNOWS]->(hwang)
MERGE (kim)-[:KNOWS]->(park)
MERGE (park)-[:KNOWS]->(cha)
MERGE (messi)-[:KNOWS]->(ronaldo)
MERGE (mbappe)-[:KNOWS]->(vini)
MERGE (haaland)-[:KNOWS]->(kdb)
MERGE (pep)-[:KNOWS]->(klopp)
MERGE (ancelotti)-[:KNOWS]->(enrique)
MERGE (tuchel)-[:KNOWS]->(pep)
"""

result = graph.query(cypher_query)
```

팀은 `MERGE`라서 여러 번 실행해도 같은 팀이 하나만 생기고, 관계도 `MERGE`라 중복되지 않는다. 같은 정렬 쿼리를 SKIP과 함께 다시 실행하면 데이터가 늘어난 게 보인다.

```python
#######################################
#  SKIP - 조회결과에서 앞 n개를 건너 뛴다.
#######################################
cypher_query = """
// Person 레이블을 가진 모든 노드를 검색.
MATCH (p:Person)

// 찾은 Person 노드 전체를 결과로 반환.
RETURN p.name, p.age

// ORDER BY 절을 사용하여 결과를 정렬한다. 
// p.age: Person 노드의 age 속성을 기준으로 정렬,  ASC: 오름차순 정렬 (작은 값에서 큰 값 순서로 정렬)
ORDER BY p.age ASC

// SKIP 절을 사용하여 결과의 처음 1개를 건너뛴다.
SKIP 1

// LIMIT 절을 사용하여 반환되는 결과의 수를 제한
// ORDER BY p.age ASC, SKIP 1, LIMIT 1 => 두 번째로 나이가 어린 사람만 조회
LIMIT 10
"""
```

```text
나이 순 정렬 결과:
{'p.name': '비니시우스 주니오르', 'p.age': 25}
{'p.name': '이강인', 'p.age': 25}
{'p.name': '엘링 홀란', 'p.age': 26}
{'p.name': '킬리안 음바페', 'p.age': 27}
{'p.name': '김민재', 'p.age': 29}
{'p.name': '황희찬', 'p.age': 30}
{'p.name': '모하메드 살라', 'p.age': 34}
{'p.name': '케빈 더브라위너', 'p.age': 35}
{'p.name': '손흥민', 'p.age': 35}
{'p.name': '리오넬 메시', 'p.age': 39}
```

`SKIP 1`로 가장 어린 1명을 건너뛰고 다음 10명을 가져왔다. 비니시우스와 이강인이 같은 25세라 둘의 순서는 정해져 있지 않다. 같은 값일 때 순서를 고정하려면 `ORDER BY p.age ASC, p.name`처럼 두 번째 기준을 준다. SKIP과 LIMIT은 페이징에 쓴다.

## OPTIONAL MATCH

MATCH는 패턴이 맞지 않는 노드를 **결과에서 뺀다.** OPTIONAL MATCH는 행을 유지하고, 매칭되지 않은 변수를 `null`로 둔다. SQL의 LEFT OUTER JOIN과 같다. 기본 정보는 MATCH로, 부가 정보는 OPTIONAL MATCH로 붙인다.

```python
#############################
# OPTIONAL MATCH
#############################

cypher_query = """

// 모든 Person 노드를 조회한다.
MATCH (p:Person)

// PLAY_FOR 관계가 있으면 Team도 조회하고,
// 없으면 p만 조회한다.
OPTIONAL MATCH (p)-[:PLAY_FOR]->(t:Team)

RETURN p, t

"""

result = graph.query(cypher_query)

for row in result:
    pprint(row)
    print("-" * 50)
```

```text
{'p': {'age': 25, 'gender': '남성', 'name': '이강인', 'role': 'Player'},
 't': {'name': '파리 생제르맹'}}
--------------------------------------------------
{'p': {'age': 29, 'gender': '남성', 'name': '김민재', 'role': 'Player'},
 't': {'name': '바이에른 뮌헨'}}
--------------------------------------------------
...
{'p': {'age': 35, 'gender': '남성', 'name': '손흥민'}, 't': {'name': 'LAFC'}}
--------------------------------------------------
{'p': {'age': 57, 'gender': '남성', 'name': '홍명보'}, 't': None}
--------------------------------------------------
{'p': {'name': '홍길동'}, 't': None}
--------------------------------------------------
...
```

팀이 없는 홍명보와 홍길동도 `t: None`으로 남았다. `OPTIONAL MATCH`를 `MATCH`로 바꾸면 이 둘은 결과에서 사라진다.

## MERGE

**MERGE는 "있으면 찾고(MATCH), 없으면 만든다(CREATE)".** 주의할 점은 MERGE가 **패턴에 쓴 모든 속성**을 매칭 기준으로 쓴다는 것이다. `MERGE (p:Person {name:'홍길동', age: 30})`은 이름이 홍길동이고 나이가 30인 Person을 찾고, 없으면 만든다. 이름이 같아도 나이가 다르면 새로 만든다. 그래서 MERGE에는 식별용 속성만 넣고, 나머지는 `ON CREATE SET`으로 넣는 것이 안전하다.

```cypher
// 노드 MERGE
MERGE (n:Label {key: value})

// 관계 MERGE (보통 양 노드를 먼저 MATCH/MERGE한 뒤)
MATCH (a), (b) WHERE ...
MERGE (a)-[:REL]->(b)

// ON CREATE SET: 생성했을 때 실행
// ON MATCH SET: 조회했을 때 실행
MERGE (n:Label {id: 1})
ON CREATE SET n.createdAt = timestamp(), n.count = 1
ON MATCH SET n.updatedAt = timestamp(), n.count = n.count + 1
```

> **보충**: 수업 자료 설명에 "ON MERGE SET"이라고 된 부분이 있는데, 조회했을 때 실행되는 절의 정확한 이름은 `ON MATCH SET`이다.

```python
############################################################
# MERGE: 조회 또는 생성
# 이름이 손흥민인 사람이 있으면 조회하고 없으면 생성한다.
############################################################
cypher_query = """
// 이름이 손흥민인 사람이 있으면 조회하고 없으면 생성한다.
MERGE (p: Person {name:"손흥민"})

// 이름이 손흥민이고 나이가 30인 사람이 있으면 조회하고 없으면 생성한다.
//MERGE (p: Person {name:"손흥민", age: 30})
RETURN p
"""
```

```text
{'p': {'gender': '남성', 'name': '손흥민', 'age': 35}}
```

이미 있는 손흥민(35세)을 찾아서 돌려줬다. 주석 처리된 두 번째 줄로 실행하면 35세 손흥민과 맞지 않으니 **30세 손흥민을 새로 만든다.**

```python
##################################################################################
# 이름이 박지성인 사람이 있으면 조회하고 없으면 생성한다.
## 박지성이 생성되었으면 p.address = '수원' 속성을 추가한다.
## 박지성이 조회되었으면 p.address = '맨체스터' 속성을 추가 또는 변경한다.
##################################################################################
cypher_query = """
MERGE (p: Person {name:"박지성"})
// 박지성이 생성되었으면 p.address = '수원' 속성을 추가한다.
// 박지성이 조회되었으면 p.address = '맨체스터' 속성을 추가 또는 변경한다.
ON CREATE SET p.address = '수원'
ON MATCH SET p.address = '맨체스터'
RETURN p
"""
```

```text
{'p': {'address': '맨체스터', 'role': 'Player', 'gender': '남성', 'name': '박지성', 'age': 44}}
```

축구 데이터에 박지성이 이미 있었으니 `ON MATCH SET`이 실행되어 address가 '맨체스터'가 됐다.

관계도 MERGE할 수 있다.

```python
##########################################################################
# 관계가 있으면 조회하고 없으면 추가한다.
## 김영수와 서울 사이에 LIVES_IN 관계가 있으면 조회하고 없으면 생성한다.
##########################################################################
cypher_query = """

// 이름이 김영수인 사람과 도시 이름이 서울인 노드를 조회한다.
MATCH (p:Person{name:'김영수'}), (c:City {name: '서울'})

// 김영수와 서울 사이에 LIVES_IN 관계가 있으면 조회하고 없으면 생성한다.
MERGE (p) - [:LIVES_IN] -> (c)
RETURN p, c
"""
```

```text
{'p': {'name': '김영수'}, 'c': {'name': '서울'}}
```

> **보충**: `MERGE (a:Person {name:'A'})-[:KNOWS]->(b:Person {name:'B'})`처럼 **노드까지 패턴 전체를 MERGE**하면, 관계가 없을 때 A와 B가 이미 있어도 **노드까지 새로 만든다.** MERGE는 패턴 전체가 있는지 없는지를 보기 때문이다. 그래서 위 예제처럼 노드는 먼저 MATCH(또는 각각 MERGE)하고, 관계만 MERGE한다.

## SET

이미 있는 노드나 관계의 **속성이나 레이블을 추가·변경**한다.

```cypher
MATCH 패턴
SET n.속성 = 값                // 단일 속성 변경/추가
SET n.속성1 = v1, n.속성2 = v2 // 여러 속성
SET n += {key: value, ...}     // map으로 여러 개 병합
SET n = {key: value, ...}      // 전체 교체 (기존 속성 삭제됨)
SET n:NewLabel                 // 라벨 추가
```

```python
#######################################
#  노드 속성 업데이트 (SET 구문 사용)
#######################################
cypher_query = """
// Person 레이블을 가진 노드 중에서 name 속성이 "홍길동"인 노드를 조회
// {name: "홍길동"} 형태로 속성 조건을 지정하여 특정 노드를 선택
MATCH (p:Person {name: "홍길동"})

/*
SET 구문을 사용하여 찾은 노드의 속성을 업데이트
p.age = 35: 'p'로 참조된 노드의 'age' 속성 값을 35로 설정
해당 속성이 이미 존재하면 값을 변경하고, 없으면 새로 생성
*/
SET p.age = 35, p.hobby = "게임"

RETURN p
"""

graph.query(cypher_query)
```

```text
[{'p': {'name': '홍길동', 'age': 35, 'hobby': '게임'}}]
```

`+=`와 `=`의 차이는 강사님 노트북의 결과로 보면 분명하다.

```python
cypher_query = """
MATCH (p:Person {name:"손흥민"})
SET p += {age:36, email:'son@mail.com'}  // age변경, email:추가
RETURN p
"""
```

```text
[{'p': {'gender': '남성', 'name': '손흥민', 'age': 36, 'email': 'son@mail.com'}}]
```

```python
cypher_query = """
MATCH (p:Person {name:"김지성"})
SET p = {name:'김지성', email:'son@mail.com'}  // property 자체를 변경.
RETURN p
"""
# [{'p': {'address': '수원', 'name': '김지성', 'age': 45}}]
```

```text
[{'p': {'name': '김지성', 'email': 'son@mail.com'}}]
```

`+=`는 기존 속성(gender)을 유지하고 병합했지만, `=`는 address와 age를 **지우고** 새 map으로 통째로 바꿨다. 주석의 원래 값과 비교하면 사라진 속성이 보인다.

레이블도 SET으로 붙인다.

```python
############################
#  레이블 추가 및 속성 설정 
############################
cypher_query = """
// 레이블이 없는 노드를 추가
CREATE (p {name:'이강인', age:21})
RETURN p
"""
```

```python
cypher_query = """
MATCH (p1 {name:'이강인'}), (p2 {name:'손흥민'})
SET p1:Player, p2:Player, p1.age=30
RETURN p1, p2
"""
```

노드는 레이블을 여러 개 가질 수 있다. `Person`이면서 `Player`인 손흥민은 `MATCH (p:Player)`로도, `MATCH (p:Person)`으로도 찾힌다.

## DELETE와 DETACH DELETE

| 구문 | 동작 |
|---|---|
| `DELETE r` | 관계 삭제 |
| `DELETE n` | 노드 삭제. **관계가 연결된 노드는 삭제할 수 없다** |
| `DETACH DELETE n` | 연결된 관계를 모두 지운 뒤 노드 삭제 |
| `MATCH (n) DETACH DELETE n` | 전체 그래프 초기화 |

```python
#################################################
#  관계가 있는 노드 삭제 (DETACH DELETE 사용)
#################################################
cypher_query = """
// Person 레이블을 가진 노드 중에서 name 속성이 "최영희"인 노드를 찾는다.
MATCH (p:Person {name: "최영희"})


// DETACH DELETE 명령어를 사용하여 노드와 그에 연결된 모든 관계를 함께 삭제한다.
// 이 명령어는 먼저 노드에 연결된 모든 관계를 제거한 후 노드 자체를 삭제한다.


// DELETE r 관계를 삭제
// DETACH DELETE p // p와 연결된 관계들을 모두 삭제한 후 에 p를 삭제

"""

graph.query(cypher_query)
```

```text
[]
```

> **보충**: 이 셀은 `DETACH DELETE p`가 주석 처리되어 있어서 **아무것도 지우지 않았다.** MATCH만 하고 RETURN도 쓰기 절도 없으니 빈 리스트가 나왔을 뿐이다. 실제로 지우려면 주석을 풀어야 한다. Cypher 문자열 안의 `//`는 Cypher 주석이라 파이썬에서는 구분이 잘 안 되니, 실행 결과가 `[]`로 같아 보여도 쓰기가 일어났는지는 따로 확인해야 한다.

```python
################
# 관계를 삭제
################
cypher_query = """
MATCH (:Person{name: '홍길동'}) - [r] - (:Person{name:'손흥민'})
DELETE r

"""
graph.query(cypher_query)
```

방향 없이 `-[r]-`로 쓰면 두 사람 사이의 관계를 **방향에 상관없이** 모두 지운다. 홍길동이 두 명이므로 둘 중 손흥민과 연결된 쪽의 관계만 지워진다.

## REMOVE

속성이나 레이블을 제거한다.

```python
############################################ 
# 속성(Property) 제거 (REMOVE 구문 사용)
############################################  
cypher_query = """
// 삭제할 속성을 가진 노드를 먼저 찾는다. 
// Person 레이블을 가진 노드 중에서 name 속성이 "홍길동"인 노드를 조회
MATCH (p:Person {name: "홍길동"})

/*
REMOVE 명령어를 사용하여 찾은 노드의 age 속성을 제거
이 명령은 노드 자체나 다른 속성은 그대로 유지하고 지정된 속성만 삭제한다.
속성이 존재하지 않는 경우에도 오류 없이 실행된다.
*/
REMOVE p.age, p.hobby // 나이랑 취미 삭제

// 변경된 노드를 결과로 반환하여 출력할 수있게 한다.
RETURN p
"""
graph.query(cypher_query)
```

```text
[{'p': {'name': '홍길동'}}]
```

레이블 제거는 `REMOVE p:Person`이다. `SET p.age = null`도 속성을 지우는 효과가 있다(Neo4j는 null 속성을 저장하지 않는다).

## 정리

| 하고 싶은 것 | Cypher | SQL 대응 |
|---|---|---|
| 노드 만들기 | `CREATE (:Label {k: v})` | INSERT |
| 관계 만들기 | `MATCH (a), (b) CREATE (a)-[:REL]->(b)` | (외래키/JOIN 테이블 INSERT) |
| 있으면 찾고 없으면 만들기 | `MERGE` + `ON CREATE SET` / `ON MATCH SET` | UPSERT |
| 조회 | `MATCH ... WHERE ... RETURN` | SELECT ... WHERE |
| 정렬·페이징 | `ORDER BY`, `SKIP`, `LIMIT` | ORDER BY, OFFSET, LIMIT |
| 없어도 행 유지 | `OPTIONAL MATCH` | LEFT OUTER JOIN |
| 리스트로 묶기 | `collect()` | (GROUP_CONCAT 등) |
| 수정 | `SET n.k = v`, `SET n += {...}`, `SET n:Label` | UPDATE |
| 삭제 | `DELETE r`, `DETACH DELETE n` | DELETE |
| 속성·레이블 제거 | `REMOVE n.k`, `REMOVE n:Label` | (ALTER/UPDATE NULL) |

- **CREATE는 무조건 만든다.** 기존 노드에 연결하려면 MATCH로 찾고, 중복이 걱정되면 MERGE나 제약조건을 쓴다.
- **MERGE는 쓴 속성 전부로 매칭한다.** 식별 속성만 넣고 나머지는 `ON CREATE SET`으로.
- `SET n = {...}`은 기존 속성을 지운다. 병합은 `+=`.
- 관계가 있는 노드는 `DELETE`로 못 지운다. `DETACH DELETE`.
- 속성이 없는 노드는 WHERE 비교에서 빠지고, 정렬에서는 맨 뒤로 간다.

다음 글에서는 경로 탐색, 최단 경로, 집계, WITH, 제약조건과 인덱스를 다룬다.
