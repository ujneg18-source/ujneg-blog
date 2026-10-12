---
title: "Cypher 심화: 경로 탐색, 집계, WITH, 제약조건과 인덱스"
description: "소셜 네트워크 그래프를 만들어 가변 길이 경로(*1..3)와 shortestPath로 '친구의 친구'를 찾고, 집계 함수와 암묵적 GROUP BY, WITH로 단계별 쿼리를 구성하는 방법을 정리합니다. 중복을 막는 제약조건(UNIQUE, NOT NULL, NODE KEY, 타입)과 조회를 빠르게 하는 인덱스의 종류도 함께 다룹니다."
category: 'Tech'
subcategory: 'LLM'
series: 'GraphRAG'
seriesOrder: 3
originalNotebook: "GraphRAG/02_Neo4jGraph와 Cypher_쿼리_2.ipynb"
tags: ["LLM","GraphRAG"]
date: 2026-07-11T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-cypher-advanced.webp'
---

> SKN31 AI Agent 과정 노트북 `GraphRAG/02_Neo4jGraph와 Cypher_쿼리_2.ipynb`(실행본은 `_code` 노트북)와 이론 자료 `05_GraphDB 제약조건과 인덱스.md`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과입니다. `SHOW CONSTRAINTS` 결과와 마지막 예제 하나는 **강사님 노트북의 실행 결과**입니다.

## 이 글에서 다루는 것

- 소셜 네트워크 데이터 모델과 제약조건
- 경로 쿼리: `*1..3`, `*2`, `*`, 리스트 컴프리헨션
- 최단 경로: `shortestPath()`
- 집계 함수와 암묵적 GROUP BY
- WITH: 단계별 쿼리와 HAVING
- 조합 예제: 친구의 친구, 공통 관심사
- 제약조건과 인덱스

지난 글의 CREATE·MATCH는 한 단계 관계만 다뤘다. 그래프 DB가 진짜 쓸모 있는 건 **여러 단계를 건너가는 질문**이다. "친구의 친구 중 같은 취미를 가진 사람"을 SQL로 쓰면 JOIN이 줄줄이 붙지만, Cypher는 패턴 한 줄로 끝난다.

## 데이터 모델

| 노드 레이블 | 속성 | 의미 |
|---|---|---|
| `Person` | name, age, gender | 사용자 |
| `Interest` | name | 관심사 (영화, 음악, 스포츠...) |
| `Location` | name | 장소 |
| `City` | name, population | 도시 |

| 관계 | 방향 | 속성 |
|---|---|---|
| `KNOWS` | Person → Person | since: 언제부터 알았는지 |
| `LIKES` | Person → Interest | rating: 관심 정도 |
| `VISITED` | Person → Location | date, rating |
| `LIVES_IN` | Person → City | since |
| `LOCATED_IN` | Location → City | |

```python
def reset_database(graph):
    ...
    print("데이터베이스가 초기화되었습니다.")

# 데이터베이스 초기화
reset_database(graph)
```

```text
데이터베이스가 초기화되었습니다.
```

### 제약조건 먼저

데이터를 넣기 전에 **중복을 막는 제약조건**을 만든다.

```python
constraints = [
    # Person 중복 방지 (이름 + 나이 복합키)
    """
    CREATE CONSTRAINT constraint_person_name_age IF NOT EXISTS
    FOR (p:Person)
    REQUIRE (p.name, p.age) IS UNIQUE
    """,
    # Interest 중복 방지
    """
    CREATE CONSTRAINT constraint_interest_name IF NOT EXISTS
    FOR (i:Interest)
    REQUIRE i.name IS UNIQUE
    """,
    # City 중복 방지
    """
    CREATE CONSTRAINT constraint_city_name IF NOT EXISTS
    FOR (c:City)
    REQUIRE c.name IS UNIQUE
    """,
    # Location 중복 방지
    """
    CREATE CONSTRAINT constraint_location_name IF NOT EXISTS
    FOR (l:Location)
    REQUIRE l.name IS UNIQUE
    """,
]

for constraint in constraints:
    graph.query(constraint)

print("제약조건 생성 완료")
```

```text
제약조건 생성 완료
```

Person은 동명이인이 있을 수 있어서 **이름 + 나이** 조합을 유일하게 했다. 강사님 노트북의 `SHOW CONSTRAINTS` 결과다.

```text
[{'name': 'constraint_city_name',
  'type': 'NODE_PROPERTY_UNIQUENESS',
  'entityType': 'NODE',
  'labelsOrTypes': ['City'],
  'properties': ['name'],
  'ownedIndex': 'constraint_city_name', ...},
 ...
 {'name': 'constraint_person_name_age',
  'type': 'NODE_PROPERTY_UNIQUENESS',
  'labelsOrTypes': ['Person'],
  'properties': ['name', 'age'],
  'ownedIndex': 'constraint_person_name_age', ...}]
```

`ownedIndex`를 보면 유일성 제약조건마다 **같은 이름의 인덱스가 자동으로** 생긴다. 유일한지 검사하려면 값을 빨리 찾아야 하기 때문이다.

### 데이터 넣기

Person 8명, Interest 5개, City 6개, Location 4개를 만들고 관계를 건다. 쿼리 하나에 모든 CREATE를 넣어 변수(`p1`, `i1`...)로 바로 연결한다.

```python
# 데이터 모델 정의 
cypher_query =  """
// Person 노드 생성
CREATE (p1:Person {name: '홍길동', age: 35, gender:'남성'})
CREATE (p2:Person {name: '김철수', age: 28, gender:'남성'})
CREATE (p3:Person {name: '이영희', age: 32, gender:'여성'})
CREATE (p4:Person {name: '박지성', age: 40, gender:'남성'})
CREATE (p5:Person {name: '최민수', age: 45, gender:'남성'})
CREATE (p6:Person {name: '정소라', age: 29, gender:'여성'})
CREATE (p7:Person {name: '강대호', age: 33, gender:'남성'})
CREATE (p8:Person {name: '윤미래', age: 27, gender:'여성'})

// 관심분야 노드 생성
CREATE (i1:Interest {name: '영화'})
...

// KNOWS 관계 생성 (사람들 간의 친구 관계)
CREATE (p1)-[:KNOWS {since: 2010}]->(p2)
CREATE (p1)-[:KNOWS {since: 2015}]->(p3)
CREATE (p1)-[:KNOWS {since: 2012}]->(p7)
CREATE (p2)-[:KNOWS {since: 2018}]->(p6)
CREATE (p3)-[:KNOWS {since: 2017}]->(p4)
CREATE (p3)-[:KNOWS {since: 2020}]->(p5)
CREATE (p4)-[:KNOWS {since: 2019}]->(p5)
CREATE (p6)-[:KNOWS {since: 2016}]->(p8)
CREATE (p7)-[:KNOWS {since: 2014}]->(p3)
CREATE (p7)-[:KNOWS {since: 2021}]->(p8)
CREATE (p8)-[:KNOWS {since: 2019}]->(p4)

// LIKES 관계 생성 (사람과 관심분야 간의 관계)
CREATE (p1)-[:LIKES {rating: 5}]->(i1)
...
// VISITED, LIVES_IN, LOCATED_IN 관계 생성
...
"""

graph.query(cypher_query)
```

아래 출력은 에러다. 이 셀이 한 번 더 실행됐을 때 난 것이다.

```text
ConstraintError: {neo4j_code: Neo.ClientError.Schema.ConstraintValidationFailed}
{message: Node(0) already exists with label `Person` and properties `name` = '홍길동', `age` = 35}
```

첫 실행에서 데이터가 들어갔고, 같은 CREATE를 다시 실행하자 제약조건이 막았다. 지난 글에서는 CREATE를 두 번 하면 홍길동이 두 명이 됐는데, 제약조건이 있으니 **DB 차원에서 거부**한다. 쿼리 전체가 하나의 트랜잭션이라 일부만 들어가지도 않는다.

```python
graph.refresh_schema()
print(graph.schema)
```

```text
Node properties:
Person {name: STRING, age: INTEGER, gender: STRING}
Interest {name: STRING}
City {name: STRING, population: INTEGER}
Location {name: STRING}
Relationship properties:
KNOWS {since: INTEGER}
LIKES {rating: INTEGER}
VISITED {rating: INTEGER, date: STRING}
LIVES_IN {since: INTEGER}
The relationships:
(:Person)-[:KNOWS]->(:Person)
(:Person)-[:LIKES]->(:Interest)
(:Person)-[:VISITED]->(:Location)
(:Person)-[:LIVES_IN]->(:City)
(:Location)-[:LOCATED_IN]->(:City)
```

`KNOWS` 관계만 정리하면 이렇다.

| 출발 | → 아는 사람 (since) |
|---|---|
| 홍길동 | 김철수(2010), 이영희(2015), 강대호(2012) |
| 김철수 | 정소라(2018) |
| 이영희 | 박지성(2017), 최민수(2020) |
| 박지성 | 최민수(2019) |
| 정소라 | 윤미래(2016) |
| 강대호 | 이영희(2014), 윤미래(2021) |
| 윤미래 | 박지성(2019) |

## 경로 쿼리

관계에 `*`를 붙여 **몇 단계(hop)** 를 건널지 지정한다.

```cypher
MATCH (a)-[:REL*1..3]->(b)   // 1~3 hop
MATCH (a)-[:REL*2]->(b)      // 정확히 2 hop
MATCH (a)-[:REL*]->(b)       // 1 이상, 제한 없음 (주의!)

MATCH path = (a)-[:REL*1..3]->(b)
RETURN path, length(path), nodes(path), relationships(path);
// length(path): 관계 개수(hop 수), nodes(path): 노드 리스트, relationships(path): 관계 리스트
```

### 1~3단계

```python
########################################################################
#  홍길동으로부터 1~3단계 KNOWS 관계로 연결된 모든 사람을 찾는다.
# `*1..3`
########################################################################

cypher_query = """
// *1..3 표기법은 1단계부터 3단계까지의 관계를 의미한다.
// - 1단계: 홍길동의 직접적인 친구들
// - 2단계: 홍길동의 친구의 친구들
// - 3단계: 홍길동의 친구의 친구의 친구들
MATCH (p1:Person {name: '홍길동'})-[r:KNOWS*1..3]->(p2:Person)

// 결과를 다음과 같이 반환한다:
// - 시작점: 홍길동의 이름
// - 관계: 경로상의 각 KNOWS 관계에 대해 관계 타입과 since 속성을 결합한 배열
//   (예: ['KNOWS(2012)', 'KNOWS(2014)'])
// - 도착점: 경로의 끝에 있는 사람의 이름
RETURN p1.name AS 시작점, [rel IN r | type(rel) + '(' + rel.since + ')'] AS 관계, p2.name AS 도착점
"""
results = graph.query(cypher_query)
for result in results:
    print(result)
    print("---------------------------------")
```

```text
{'시작점': '홍길동', '관계': ['KNOWS(2010)'], '도착점': '김철수'}
{'시작점': '홍길동', '관계': ['KNOWS(2010)', 'KNOWS(2018)'], '도착점': '정소라'}
{'시작점': '홍길동', '관계': ['KNOWS(2010)', 'KNOWS(2018)', 'KNOWS(2016)'], '도착점': '윤미래'}
{'시작점': '홍길동', '관계': ['KNOWS(2015)'], '도착점': '이영희'}
{'시작점': '홍길동', '관계': ['KNOWS(2015)', 'KNOWS(2017)'], '도착점': '박지성'}
{'시작점': '홍길동', '관계': ['KNOWS(2015)', 'KNOWS(2017)', 'KNOWS(2019)'], '도착점': '최민수'}
{'시작점': '홍길동', '관계': ['KNOWS(2015)', 'KNOWS(2020)'], '도착점': '최민수'}
{'시작점': '홍길동', '관계': ['KNOWS(2012)'], '도착점': '강대호'}
{'시작점': '홍길동', '관계': ['KNOWS(2012)', 'KNOWS(2014)'], '도착점': '이영희'}
{'시작점': '홍길동', '관계': ['KNOWS(2012)', 'KNOWS(2014)', 'KNOWS(2017)'], '도착점': '박지성'}
{'시작점': '홍길동', '관계': ['KNOWS(2012)', 'KNOWS(2014)', 'KNOWS(2020)'], '도착점': '최민수'}
{'시작점': '홍길동', '관계': ['KNOWS(2012)', 'KNOWS(2021)'], '도착점': '윤미래'}
{'시작점': '홍길동', '관계': ['KNOWS(2012)', 'KNOWS(2021)', 'KNOWS(2019)'], '도착점': '박지성'}
```

결과는 사람이 아니라 **경로** 단위다. 최민수는 세 가지 경로로 도달해서 세 번 나온다. 사람만 원하면 `RETURN DISTINCT p2.name`을 쓴다.

가변 길이 관계 변수 `r`은 관계들의 **리스트**다. `[rel IN r | ...]`는 **리스트 컴프리헨션**으로, 파이썬의 `[f(x) for x in list]`와 같다.

> `[변수 IN 리스트 | 반환할_값]` — 리스트의 각 원소로 새 리스트를 만든다. `[변수 IN 리스트 WHERE 조건 | 값]`처럼 필터도 붙일 수 있다.

### 정확히 2단계

```python
########################################################################
# 홍길동으로부터 정확히 2단계 KNOWS 관계로 연결된 사람들만 조회 (친구의 친구)
# `*2`
########################################################################
cypher_query = """
// *2 표기법은 정확히 2단계의 관계만 조회 (1단계나 3단계는 포함하지 않음)
// 예: 홍길동 -> 이영희 -> 최민수 (홍길동의 친구의 친구)
MATCH (p1:Person {name: '홍길동'})-[r:KNOWS*2]->(p2:Person)

RETURN p1.name AS 시작점, [rel IN r | type(rel) + '('+rel.since+')'] AS 관계, p2.name AS 도착점
"""

graph.query(cypher_query)
```

```text
[{'시작점': '홍길동', '관계': ['KNOWS(2012)', 'KNOWS(2014)'], '도착점': '이영희'},
 {'시작점': '홍길동', '관계': ['KNOWS(2015)', 'KNOWS(2017)'], '도착점': '박지성'},
 {'시작점': '홍길동', '관계': ['KNOWS(2015)', 'KNOWS(2020)'], '도착점': '최민수'},
 {'시작점': '홍길동', '관계': ['KNOWS(2010)', 'KNOWS(2018)'], '도착점': '정소라'},
 {'시작점': '홍길동', '관계': ['KNOWS(2012)', 'KNOWS(2021)'], '도착점': '윤미래'}]
```

이영희는 홍길동의 직접 친구인데도 "친구의 친구"에 나왔다. 강대호를 거치는 2단계 경로도 있기 때문이다. `*2`는 "최단 거리가 2인 사람"이 아니라 "**길이 2인 경로가 있는 사람**"이다. 진짜 친구의 친구만 원하면 직접 친구를 빼야 한다(`WHERE NOT (p1)-[:KNOWS]->(p2)`).

### 단계 제한 없음

```python
cypher_query = """
// [:KNOWS*] 표기법은 KNOWS 관계를 통해 연결된 모든 깊이의 경로를 탐색
// 단계 제한이 없으므로 1단계(직접 친구), 2단계(친구의 친구), 3단계 이상 모두 포함된다.
// 방향성이 있는 -> 연산자를 사용하여 홍길동에서 출발하는 단방향 관계만 조회
MATCH (p1:Person {name: '홍길동'})-[r:KNOWS*]->(p2:Person)

// 같은 사람이 여러 경로로 연결되어 있다면 결과에 중복으로 나타날 수 있다
RETURN p1.name AS 시작점, p2.name AS 도착점, size(r) AS 관계의_수 //size(배열): 원소수
"""

graph.query(cypher_query)
```

```text
[{'시작점': '홍길동', '도착점': '김철수', '관계의_수': 1},
 {'시작점': '홍길동', '도착점': '정소라', '관계의_수': 2},
 {'시작점': '홍길동', '도착점': '윤미래', '관계의_수': 3},
 {'시작점': '홍길동', '도착점': '박지성', '관계의_수': 4},
 {'시작점': '홍길동', '도착점': '최민수', '관계의_수': 5},
 {'시작점': '홍길동', '도착점': '이영희', '관계의_수': 1},
 ...
 {'시작점': '홍길동', '도착점': '최민수', '관계의_수': 4}]
```

8명짜리 그래프에서도 경로가 17개 나왔다. 경로 수는 단계가 늘수록 기하급수로 늘어난다. 실제 데이터에서 `*`를 제한 없이 쓰면 쿼리가 끝나지 않을 수 있어서, 항상 `*..5`처럼 **상한을 두는 것이 원칙**이다.

## 최단 경로

`shortestPath()`는 두 노드 사이의 **가장 짧은 경로 하나**를, `allShortestPaths()`는 같은 길이의 최단 경로를 모두 찾는다.

```python
######################################################
# Person 노드 홍길동과 최민수 사이의 최단 경로 조회
# shortestPath() 함수: 두 노드 간의 가장 짧은 경로를 찾는다
###################################################### 
cypher_query = """

MATCH p=shortestPath((p1:Person {name: '홍길동'})-[*]-(p2:Person {name: '최민수'}))

// [*] 표기법은 모든 유형, 모든 단계의 관계를 고려하며, `<`, `>`가 없으면 방향성 없이 양방향으로 탐색한다

// nodes(p)는 경로 p에 포함된 모든 노드를 배열로 반환한다
// [node IN nodes(p) | node.name] : nodes(p)로 얻은 노드 배열에서 각 노드의 name 속성만 뽑아 새 배열을 만드는 Cypher의 리스트 컴프리헨션(list comprehension) 문법.
// 결과적으로 '홍길동' -> '영화' -> '최민수'와 같은 경로가 반환된다.
RETURN [node IN nodes(p) | node.name] AS 경로
"""

graph.query(cypher_query)
```

```text
[{'경로': ['홍길동', '이영희', '최민수']}]
```

`[*]`는 관계 타입을 가리지 않아서 주석처럼 `홍길동 → 영화 ← 최민수`(둘 다 영화를 좋아함)도 길이 2짜리 후보다. 길이가 같은 경로 중 하나만 돌려주므로 이번엔 이영희를 거치는 경로가 나왔다.

```python
cypher_query = """
/*
KNOWS 관계만 사용하여 홍길동과 최민수 사이의 최단 경로 조회
*/
MATCH p=shortestPath((p1:Person {name: '홍길동'})-[:KNOWS*]-(p2:Person {name: '최민수'}))
RETURN [node IN nodes(p) | node.name] AS 경로
"""
```

```text
[{'경로': ['홍길동', '이영희', '최민수']}]
```

```python
#################################################################
# 최대 3단계 관계 내에서 홍길동과 정소라 사이의 최단 경로 조회
#################################################################
cypher_query = """
/*
[*..3] 표기법으로 홍길동에서 정소라까지 최대 3명의 중간 인물을 거쳐 연결되는 경로만 탐색한다.
*/
MATCH p=shortestPath((p1:Person {name: '홍길동'})-[*..3]-(p2:Person {name: '정소라'}))

RETURN [node IN nodes(p) | node.name] AS 경로
"""
```

```text
[{'경로': ['홍길동', '김철수', '정소라']}]
```

> **보충**: 주석의 "최대 3명의 중간 인물"은 정확히는 "**최대 3개의 관계**"다. `*..3`은 hop 수 상한이라 중간 인물은 최대 2명이다.

## 집계 함수

| 함수 | 설명 |
|---|---|
| `count(x)` | x의 개수 (null 제외) |
| `count(*)` | 행 개수 |
| `sum(x)`, `avg(x)` | 합, 평균 |
| `min(x)`, `max(x)` | 최솟값, 최댓값 |
| `stdev(x)` | 표준편차 |
| `collect(x)` | 리스트로 모으기 |

**Cypher에는 GROUP BY가 없다.** 집계 함수와 함께 RETURN(또는 WITH)에 나온 **다른 컬럼이 자동으로 그룹 기준**이 된다.

```python
#############################
#  전체 Person 노드 수 계산
#############################
cypher_query = """
MATCH (p:Person)

// COUNT(p)는 매칭된 Person 노드의 총 개수를 계산하는 집계 함수
RETURN COUNT(p) AS 전체사람수
"""
```

```text
[{'전체사람수': 8}]
```

```python
########################
# 다양한 집계
########################
cypher_query = """
MATCH (p:Person)
RETURN SUM(p.age) as 나이합계, AVG(p.age) AS 평균나이, STDEV(p.age) AS 나이표준편차,
       MAX(p.age) AS 최고령자, MIN(p.age) AS 최연소자
"""
```

```text
[{'나이합계': 269,
  '평균나이': 33.62500000000001,
  '나이표준편차': 6.2321172737911255,
  '최고령자': 45,
  '최연소자': 27}]
```

`평균나이`의 끝자리 `...0001`은 부동소수점 오차다. 표시할 때는 `round(AVG(p.age), 1)`로 반올림한다. 또 별칭이 `최고령자`인데 값은 이름이 아니라 **나이**다. 최고령자의 이름을 원하면 `ORDER BY p.age DESC LIMIT 1`로 노드를 가져와야 한다.

관계의 속성도 집계할 수 있다.

```python
############################
# 방문자 평점의 평균점수 집계
############################
cypher_query = """
MATCH (p:Person)-[v:VISITED]->(l:Location)

// 관계(Relationship)인 v: VISITED 의 property인 rating의 평균을 계산한다.
RETURN l.name AS 장소, AVG(v.rating) AS 평균평점
ORDER BY 평균평점 DESC
LIMIT 1
"""
```

```text
[{'장소': '경복궁', '평균평점': 4.5}]
```

`l.name`이 집계 함수와 함께 나왔으니 장소별로 그룹이 묶였다. 관계 `VISITED`에 rating이 있으니 "누가 어디를 몇 점으로 방문했나"를 노드를 늘리지 않고 표현할 수 있다.

```python
##################################
# 카테고리별 집계
#  성별(gender) Person 노드 수 계산
#  집계함수와 변수를 같이 사용하면 그 변수를 기준으로 자동 그룹화가 이뤄진다.
################################## 
cypher_query = """
MATCH (p:Person)
RETURN p.gender, COUNT(p) AS 사람수 
ORDER BY 사람수 DESC
"""
```

```text
[{'p.gender': '남성', '사람수': 5}, {'p.gender': '여성', '사람수': 3}]
```

```python
##################################
# 관계(Relationship) 속성별 집계
##################################
cypher_query = """
// MATCH (p:Person)-[:LIKES]->(i:Interest) 로 관계를 찾은 뒤 i를 이용해 group 화하고 p를 count한다.
MATCH (p:Person)-[:LIKES]->(i:Interest)
RETURN i.name AS 관심분야, COUNT(p) AS 사람수

// 사람수 (count(p) 기준 정렬)
ORDER BY 사람수 DESC
"""
```

```text
[{'관심분야': '영화', '사람수': 3},
 {'관심분야': '여행', '사람수': 3},
 {'관심분야': '스포츠', '사람수': 2},
 {'관심분야': '음악', '사람수': 2},
 {'관심분야': '요리', '사람수': 2}]
```

## WITH

**WITH는 쿼리를 단계로 쪼개 앞 단계의 결과를 다음 단계로 넘기는 파이프**다.

| 용도 | 설명 |
|---|---|
| 집계 결과로 필터링 | WHERE에서 집계 함수를 직접 쓸 수 없다. WITH에서 집계하고 그 뒤 WHERE로 거른다 (SQL의 HAVING) |
| 중간 결과 줄이기 | RETURN 직전에만 LIMIT하면 전체를 끝까지 처리한다. WITH로 중간에 줄이고 다음 단계를 진행 |
| 변수 범위 제어 | **WITH 다음에는 WITH에 적은 변수만 쓸 수 있다** |

```python
#########################################################
# WITH 기본 작동 원리
# 20세 이상인 사람 중에서 이름에 '김'이 포함된 사람 찾기
#########################################################
cypher_query = """
// MATCH (p:Person)은 그래프에서 Person 레이블을 가진 모든 노드를 찾아 p 변수에 할당
MATCH (p:Person)

// WHERE p.age >= 20은 p 노드의 age 속성이 20 이상인 노드만 필터링
WHERE p.age >= 20

// WITH p: 이전 단계에서 조회된 결과(p-20세 이상인 사람들)를 다음 쿼리 부분으로 전달
// WITH 절은 쿼리의 중간 결과를 다음 단계로 파이프라인처럼 전달하는 역할을 한다.
WITH p

// WHERE p.name CONTAINS '김'은 p 노드의 name 속성에 '김'이라는 문자열이 포함된 노드만 추가로 필터
WHERE p.name CONTAINS '김'

RETURN p.name AS 이름, p.age AS 나이
"""
```

```text
[{'이름': '김철수', '나이': 28}]
```

이 정도는 `WHERE p.age >= 20 AND p.name CONTAINS '김'` 한 줄과 같다. WITH가 진짜 필요한 건 집계 뒤에 거를 때다.

```python
################################################################
# 집계 결과에 대한 조건 필터링 - SQL의 having
# - WITH 문을 사용해야 한다.
# 
# 성별 평균 나이를 계산한 후, 평균 나이가 35세 이상인 성만 반환
################################################################
cypher_query = """
MATCH (p:Person)

// 1. p.gender 그룹별로 p.age의 평균값을 계산하여 '평균나이'라는 변수에 저장
// 2. 1에서 생성한 중간 결과(성, 성별 평균나이)를 다음 쿼리로 전달
WITH p.gender AS Gender, AVG(p.age) AS 평균나이

// WHERE 평균나이 >= 35는 평균 나이가 35세 이상인 성만 조회
WHERE 평균나이 >= 35

RETURN Gender, 평균나이

ORDER BY 평균나이 DESC
"""
```

```text
[{'Gender': '남성', '평균나이': 36.2}]
```

```python
####################################################################################
#  도시별 사는 사람들의 평균나이를 계산 한 뒤, 평균나이가 30세 이상인 도시만 반환
####################################################################################

cypher_query = """
MATCH (p:Person) -[r:LIVES_IN]-> (c:City)
WITH c.name AS 도시명, AVG(p.age) as 평균나이
WHERE 평균나이 > 30
RETURN 도시명, 평균나이
"""
```

```text
[{'도시명': '서울', '평균나이': 33.333333333333336},
 {'도시명': '인천', '평균나이': 40.0},
 {'도시명': '대전', '평균나이': 45.0}]
```

여러 번 집계할 때는 WITH로 앞 결과를 들고 간다.

```python
#####################################################################################
# 사람별로 방문한 장소 수와 관심분야 수를 계산하여, 둘 다 2개 이상인 사람 찾기
#####################################################################################
cypher_query = """
MATCH (p:Person)

/*
1. 각 사람(p)과 VISITED 관계를 통해 연결된 Location 노드를 조회한다.
2. OPTIONAL MATCH를 사용하여 방문한 장소가 없는 사람도 결과에 포함되며 방문 장소가 없는 사람의 경우 l은 NULL이 된다.
*/
OPTIONAL MATCH (p)-[:VISITED]->(l:Location)

/*
1. 각 사람(p)별로 방문한 고유 장소(l)의 수를 계산
2. DISTINCT를 사용하여 중복 방문은 한 번만 계산
3. 이 중간 결과를 '방문장소수'라는 변수에 저장하고 다음 쿼리로 전달
*/
WITH p, COUNT(DISTINCT l) AS 방문장소수

/*
1. 각 사람(p)에서 LIKES 관계를 통해 연결된 Interest 노드를 조회.
2. OPTIONAL MATCH를 사용하여 관심사가 없는 사람도 결과에 포함시키며 관심사가 없는 사람의 경우 i는 NULL이 된다.
*/
OPTIONAL MATCH (p)-[:LIKES]->(i:Interest)

/*
1. 이전 단계에서 계산한 P와 '방문장소수'를 유지한다.
2. 각 사람별로 관심 있는 고유 분야(i)의 수를 집계한다. DISTINCT를 사용하여 같은 관심사는 한 번만 계산되게 한다.
*/
WITH p, 방문장소수, COUNT(DISTINCT i) AS 관심분야수


// 방문한 장소가 2곳 이상이고 동시에 관심 분야가 2개 이상인 사람만 필터링한다.
WHERE 방문장소수 >= 2 AND 관심분야수 >= 2

RETURN p.name AS 이름, 방문장소수, 관심분야수
"""
```

```text
[{'이름': '홍길동', '방문장소수': 2, '관심분야수': 2}]
```

> **보충**: 두 OPTIONAL MATCH를 WITH 없이 한 번에 쓰면 방문 장소 × 관심사 조합만큼 행이 불어나서 count가 부풀려진다(장소 2 × 관심사 2 = 4행). 첫 번째 집계를 WITH로 **먼저 접어서** 사람당 1행으로 만든 뒤 두 번째 OPTIONAL MATCH를 하기 때문에 정확한 수가 나온다. `DISTINCT`는 그 상황에 대한 이중 안전장치다.

## 조합 예제

같은 관심사를 가진 **친구의 친구**:

```python
cypher_query = """
// 영화에 관심이 있는 사람(p1)을 조회
MATCH (p1:Person)-[:LIKES]->(i:Interest {name: '영화'})

/*
1. 위 MATCH절에서 찾은 영화에 관심이 있는 사람(p1)에서 시작한다.
2. KNOWS 관계를 정확히 2단계 거쳐 연결된 다른 사람(p2)을 조회한다.
3. 그 사람(p2)이 같은 영화 관심사(i)를 가지고 있는지 사람을 찾는다.
*/
MATCH (p1)-[:KNOWS*2]->(p2:Person)-[:LIKES]->(i)

// 자기자신으로 돌아오는 경로를 제외하기 위해 p1과 p2가 서로 다른 사람인지 확인한다.
WHERE p1 <> p2

RETURN p1.name AS 시작사람, p2.name AS 연결된사람, i.name AS 공통관심사
"""
```

```text
[{'시작사람': '홍길동', '연결된사람': '이영희', '공통관심사': '영화'},
 {'시작사람': '홍길동', '연결된사람': '최민수', '공통관심사': '영화'},
 {'시작사람': '이영희', '연결된사람': '최민수', '공통관심사': '영화'}]
```

변수 `i`를 두 번째 패턴에서 다시 써서 "**같은** 관심사 노드"를 강제했다. SQL이었다면 사람-친구 테이블을 두 번 JOIN하고 관심사 테이블을 또 JOIN해야 하는 질문이다.

아는 사이가 **아닌** 사람 중 공통 관심사가 있는 사람:

```python
cypher_query = """
MATCH (p1:Person {name: '홍길동'})-[:LIKES]->(i:Interest)<-[:LIKES]-(p2:Person)
WHERE NOT (p1)-[:KNOWS]-(p2)
RETURN DISTINCT p1.name as 이름1, p2.name AS 이름2, i.name AS 공통관심사
"""
```

```text
[{'이름1': '홍길동', '이름2': '최민수', '공통관심사': '영화'},
 {'이름1': '홍길동', '이름2': '최민수', '공통관심사': '여행'},
 {'이름1': '홍길동', '이름2': '윤미래', '공통관심사': '여행'}]
```

`WHERE NOT (p1)-[:KNOWS]-(p2)`처럼 **패턴 자체를 조건**으로 쓸 수 있다. 친구 추천 기능의 뼈대가 이런 쿼리다. 강사님 노트북에는 홍길동이 직접 모르는 사람을 모두 뽑는 예도 있다.

```python
cypher_query = """
MATCH (p1:Person {name:'홍길동'}), (p2: Person)
WHERE p1 <> p2
  AND NOT (p1)-[:KNOWS]->(p2) // p1과 p2는 KNOWS 관계가 아니다.
RETURN collect(p2.name) AS 모르는사람이름
"""
```

```text
[{'모르는사람이름': ['박지성', '최민수', '정소라', '윤미래']}]
```

최단 거리별 인원 분포:

```python
cypher_query = """
MATCH p=shortestPath((start:Person {name: '홍길동'})-[:KNOWS*]-(other:Person))
WHERE start <> other
WITH other, length(p) AS 거리
RETURN 거리, COUNT(other) AS 사람수
ORDER BY 거리
"""
```

```text
[{'거리': 1, '사람수': 3}, {'거리': 2, '사람수': 4}]
```

홍길동 외 7명이 모두 2단계 안에 있다. 직접 아는 3명(김철수·이영희·강대호)과 친구의 친구 4명(정소라·윤미래·박지성·최민수)이다. 앞의 `*` 쿼리에서 박지성까지 4단계, 최민수까지 5단계 경로도 나왔지만 최단 경로는 그보다 훨씬 짧다.

## 제약조건과 인덱스

### 제약조건 (Constraint)

제약조건은 **반드시 지켜야 하는 규칙**으로, 잘못된 데이터가 들어가지 못하게 DB가 막는다.

```cypher
-- 노드
CREATE CONSTRAINT 이름 [IF NOT EXISTS]
FOR (n:라벨)
REQUIRE 조건;

-- 관계
CREATE CONSTRAINT 이름 [IF NOT EXISTS]
FOR ()-[r:관계타입]-()
REQUIRE 조건;

SHOW CONSTRAINTS;
DROP CONSTRAINT 이름;
```

| 구문 | 의미 | 예 |
|---|---|---|
| `IS UNIQUE` | 값이 중복되지 않음 | `REQUIRE p.email IS UNIQUE` |
| `IS NOT NULL` | 속성이 반드시 있음 | `REQUIRE p.name IS NOT NULL` |
| `IS NODE KEY` / `IS RELATIONSHIP KEY` | 존재 + 유일 | `REQUIRE u.userId IS NODE KEY` |
| `IS :: 타입` | 속성 타입 제한 | `REQUIRE p.price IS :: INTEGER` |
| `(a, b) IS UNIQUE` | 조합이 유일 | `REQUIRE (m.title, m.year) IS UNIQUE` |

지난 글에서 본 것처럼 노드는 속성을 미리 정의하지 않는다. 스키마가 자유로운 대신 **"이 속성은 꼭 있어야 한다", "이 값은 하나뿐이어야 한다"를 제약조건으로 보장**해야 한다.

> **보충**: `IS NOT NULL`, `IS NODE KEY`, 타입 제약조건(`IS ::`)은 Neo4j **Enterprise Edition** 기능이라 Community Edition(무료 서버판)에서는 `IS UNIQUE`만 쓸 수 있다. Neo4j Desktop은 개발용으로 Enterprise 기능을 쓸 수 있다.

### 인덱스 (Index)

인덱스는 **조회를 빠르게 하는 검색 구조**다. `MATCH (p:Person {email: 'a@test.com'})`에서 인덱스가 없으면 모든 Person의 email을 비교해야 한다. 대신 데이터를 쓸 때마다 인덱스도 갱신해야 하므로, **자주 검색하는 속성에만** 만든다.

```cypher
CREATE INDEX person_name_index IF NOT EXISTS
FOR (p:Person) ON (p.name);

CREATE INDEX movie_title_year_index
FOR (m:Movie) ON (m.title, m.year);       -- 복합 인덱스

CREATE INDEX reviewed_rating_index
FOR ()-[r:REVIEWED]-() ON (r.rating);     -- 관계 속성 인덱스

SHOW INDEXES;
DROP INDEX 이름;
```

| 종류 | 용도 |
|---|---|
| Range, Text, Point, Lookup | 일반 조회 성능 향상 |
| Full-text | 전문(키워드) 검색 |
| Vector | 임베딩 유사도 검색 |

마지막 줄의 **Vector 인덱스**가 GraphRAG에서 중요하다. 노드에 임베딩을 저장하고 벡터 인덱스를 걸면, Neo4j 하나로 의미 검색과 관계 탐색을 함께 할 수 있다.

## 정리

| 하고 싶은 것 | Cypher |
|---|---|
| N단계 이내 연결 | `-[:REL*1..N]->` |
| 정확히 N단계 경로 | `-[:REL*N]->` (더 짧은 경로가 있어도 포함) |
| 최단 경로 | `shortestPath((a)-[:REL*..N]-(b))` |
| 경로 안의 노드/관계 | `nodes(p)`, `relationships(p)`, `length(p)` |
| 리스트 변환 | `[x IN list \| x.name]` |
| 그룹별 집계 | `RETURN key, count(x)` (암묵적 GROUP BY) |
| 집계 후 필터 (HAVING) | `WITH key, avg(x) AS a WHERE a > ...` |
| "관계가 없는" 조건 | `WHERE NOT (a)-[:REL]-(b)` |
| 중복 방지 | `CREATE CONSTRAINT ... IS UNIQUE` |
| 조회 가속 | `CREATE INDEX ... ON (n.prop)` |

- 가변 길이 경로는 **경로 단위**로 결과가 나온다. 사람 단위로 보려면 `DISTINCT`.
- `*`에는 항상 상한을 둔다. 경로 수는 단계마다 폭발한다.
- 방향을 빼면(`-[]-`) 거리가 달라진다. 질문의 의미에 맞게 방향을 정한다.
- 여러 번 집계할 때는 WITH로 한 번씩 접는다.
- 유일성 제약조건은 인덱스를 자동으로 만든다.

여기까지가 Cypher다. 다음 글부터는 실제 데이터(영화)로 그래프를 설계하고 LLM으로 질의한다.
