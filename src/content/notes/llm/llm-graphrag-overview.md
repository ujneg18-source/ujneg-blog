---
title: "GraphRAG 입문: Vector RAG의 한계와 그래프 DB"
description: "Vector RAG가 관계·다단계 질문에 약한 이유에서 출발해 지식 그래프와 그래프 DB의 구성 요소(Node, Relationship, Property), RDB·VectorDB·GraphDB의 차이, GraphRAG의 인덱싱·질의 흐름과 적합한 상황을 정리하고, Neo4j를 설치해 LangChain의 Neo4jGraph로 연결하는 과정까지 다룹니다."
category: 'Tech'
subcategory: 'LLM'
series: 'GraphRAG'
seriesOrder: 1
originalNotebook: "GraphRAG/이론, 01_Neo4jGraph와 Cypher_쿼리_1.ipynb"
tags: ["LLM","GraphRAG"]
date: 2026-07-09T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-graphrag-overview.webp'
---

> SKN31 AI Agent 과정의 GraphRAG 이론 자료(`GraphRAG/이론/01~07`)와 `01_Neo4jGraph와 Cypher_쿼리_1.ipynb`의 연결 부분을 바탕으로 정리했습니다.

## 이 글에서 다루는 것

- Vector RAG가 잘 못하는 질문들
- 지식 그래프와 그래프 DB: Node, Relationship, Property
- RDB, VectorDB, GraphDB 비교
- GraphRAG의 흐름과 Vector RAG와의 차이
- GraphRAG를 쓰기 좋은 경우와 아닌 경우
- Neo4j 설치와 LangChain `Neo4jGraph` 연결

지금까지의 RAG는 문서를 청크로 자르고 임베딩해서 **질문과 비슷한 청크**를 찾았다. Agent로 넘어오며 검색을 도구로 쓰게 됐지만, 검색 자체는 여전히 "비슷한 것 찾기"였다. 이번 묶음은 데이터를 **관계**로 저장하고 관계를 따라가며 찾는 GraphRAG다.

## Vector RAG의 한계

Vector RAG의 구조를 다시 보면 이렇다.

```text
정보저장
문서 → 청크 분할 → 임베딩 → VectorDB 저장

답변생성
질문 → 임베딩 → 유사도 검색 → 상위 K개 청크(+질문)
                                  ↓
                                 LLM → 답변 생성
```

**질문과 내용이 비슷한 문서**는 잘 찾지만 다음 질문들에서 약하다.

| 약점 | 예시 질문 | 왜 어려운가 |
|---|---|---|
| **관계 기반 질문** | "A 프로젝트에 참여한 직원들의 소속 부서는?" | 직원 → 프로젝트 → 부서를 따라가야 하는데, "A 프로젝트" 청크와 "부서" 청크는 서로 유사도가 낮을 수 있다 |
| **다단계 추론** | "B가 만든 제품을 구매한 고객 중 재구매율이 높은 고객은?" | `제조사 -[생산]-> 제품 <-[구매]- 고객` 같은 여러 단계를 청크 검색으로는 따라가기 어렵다 |
| **넓은 범위 작업** | "이 회사의 전체 제품 라인업을 요약해줘" | 정보가 여러 청크에 흩어져 있어 어떤 청크가 걸리느냐에 따라 결과가 달라진다 |
| **희소한 정보** | — | 관련 정보가 다른 용어나 맥락으로 쓰여 있으면 유사도 검색에서 빠진다 |

지난 글들에서도 이 모양을 몇 번 봤다. 레스토랑 메뉴에 면요리가 없는데 벡터 검색은 트러플 피자와 레몬 타르트를 가져왔고, "아까 추천한 두 번째"를 검색어로 넣자 검색 결과의 두 번째가 답이 됐다. 벡터 검색은 **무엇이 무엇과 연결되어 있는지** 모른다.

GraphRAG는 데이터 안의 엔티티와 **관계**를 기준으로 검색한다.

| 상황 | 예시 |
|---|---|
| 엔티티 간 관계 추적 | "A가 B를 통해 C와 어떻게 연결되는가?" |
| 다단계 연결 탐색 | "이 약의 부작용이 있는 성분을 포함한 다른 약은?" |
| 전체 구조 파악 | "이 논문이 인용한 논문들의 공통 저자는?" |
| 조건이 있는 경로 탐색 | "서울에서 부산까지 환승 2회 이하인 경로는?" |

**Vector RAG는 "내용이 얼마나 비슷한가"를, GraphRAG는 "엔티티가 어떻게 연결되어 있는가"를 본다.** 자료의 첫 줄에 적어 둔 메모가 이 관계를 요약한다. 둘은 **상호보완적인 관계**다.

## 지식 그래프와 그래프 DB

### 지식 그래프

**지식 그래프**(Knowledge Graph)는 현실의 정보를 **엔티티와 엔티티 간의 관계**로 연결해 표현한 데이터 구조다.

```text
봉준호 ─[감독했다]─▶ 기생충
송강호 ─[출연했다]─▶ 기생충
기생충 ─[작품상을 수상했다]─▶ 아카데미
```

이 구조면 "봉준호가 감독한 영화에 출연한 배우"를 화살표를 따라가며 찾을 수 있다. 단순한 그래프와 다른 점은 **관계에 의미가 있다**는 것이다. "A와 B가 연결되어 있다"가 아니라 "A가 B를 감독했다"처럼 관계의 타입과 방향을 명시한다.

GraphRAG에서는 문서에서 이 지식 그래프를 만드는 것이 핵심 단계다. LLM으로 텍스트에서 엔티티와 관계를 뽑아 그래프 DB에 저장한다.

### 그래프 DB의 구성 요소

**그래프 DB**는 데이터를 노드와 관계로 저장하는 데이터베이스다. RDB는 테이블에 저장하고 JOIN으로 연결하지만, 그래프 DB는 **연결 자체를 데이터의 핵심 구조**로 다룬다. 연결이 많을수록 탐색에서 유리하다. 대표가 **Neo4j**이고, 쿼리 언어로 **Cypher**를 쓴다.

| 구성 요소 | 의미 | Cypher 표기 |
|---|---|---|
| **Node** | 엔티티(사람, 장소, 개념 등). **Label**로 종류를 구분 | `(:Person {name: "김철수", age: 30})` |
| **Relationship** | 두 노드 사이의 관계. **항상 방향이 있고**, 타입으로 의미를 표현 | `(:Person)-[:ACTED_IN]->(:Movie)` |
| **Property** | 노드나 관계의 Key-Value 속성. **관계도 속성을 가진다** | `{name: "김수영"}`, `{since: 2020}` |

- **노드는 실제 객체, 레이블은 그 타입**이다. "홍길동: 사람"이면 홍길동이 노드, 사람이 레이블이다.
- 관계는 저장할 때 단방향으로 설계하고, 조회할 때는 방향을 무시하고 양방향으로 탐색할 수도 있다.

```cypher
(:Person {name:"김철수"})-[:WORKS_AT {since:2020}]->(:Company {name:"ABC Corp"})
(:Company {name:"ABC Corp"})-[:LOCATED_IN]->(:City {name:"서울"})
```

### RDB, VectorDB, GraphDB

| 구분 | RDB | VectorDB | GraphDB |
|---|---|---|---|
| 저장 구조 | 행·열 (테이블) | 고차원 벡터 | 노드·엣지 (그래프) |
| 데이터 연결 | JOIN | 없음 | 관계(Relationship) |
| 검색 방식 | SQL | 유사도 검색 (ANN) | 그래프 탐색 (패턴 매칭) |
| 강점 | 정형 데이터 관리, 조건 일치 조회 | 의미 기반 유사 검색 | 관계 탐색, 다단계 연결 |
| 약점 | 복잡한 JOIN에서 성능 저하 | 관계 표현이 어려움 | 관계 모델링이 어렵고, 대규모 집계나 단순 조건 검색에는 비효율적 |
| 쿼리 언어 | SQL | 없음 (API) | Cypher, GQL, Gremlin |

세 DB는 경쟁이 아니라 역할이 다르다. GraphRAG에서는 GraphDB와 VectorDB를 함께 쓰는 경우가 많다. Neo4j는 노드에 벡터 인덱스도 걸 수 있어서 한 DB 안에서 둘 다 할 수 있다(뒤의 글에서 다룬다).

## GraphRAG

**GraphRAG는 질문과 관련된 정보를 지식 그래프에서 찾아온 뒤, 그것을 바탕으로 LLM이 답을 생성하는 RAG**다. Vector RAG처럼 인덱싱과 질의 두 단계로 나뉜다.

```text
[인덱싱: 그래프 구축]
원본 문서
    ↓
엔티티·관계 추출 (LLM 또는 NER 모델)
    ↓
그래프 DB(Neo4j)에 노드·엣지로 저장

[질의: 검색 + 생성]
사용자 질문
    ↓
질문에서 핵심 엔티티 파악
    ↓
그래프 DB에서 관련 노드·관계 탐색 (Cypher 쿼리)
    ↓
탐색 결과를 LLM에 전달 → 답변 생성
```

LangChain에서는 `GraphCypherQAChain`이 "자연어 질문 → Cypher 생성 → Neo4j 실행 → 결과로 답변"을 한 번에 처리한다.

| 구분 | Vector RAG | GraphRAG |
|---|---|---|
| 저장 형태 | 텍스트 청크 + 벡터 | 노드 + 엣지 |
| 검색 방식 | 코사인 유사도 | 그래프 탐색 (패턴 매칭) |
| 강점 | 의미 유사성 | 관계·연결 탐색 |
| 약점 | 관계 추론, 다단계 연결 | 구축 비용, 스키마 설계 |
| 적합한 데이터 | 비정형 텍스트 | 구조화된 관계 데이터 |

### 언제 쓰나

| 좋은 경우 | 좋지 않은 경우 |
|---|---|
| 데이터에 명확한 엔티티와 관계가 있다 (의약품-성분-부작용, 인물-조직-사건) | 비정형 텍스트 위주라 엔티티 추출이 어렵다 (감성 분석용 리뷰, 자유 설문) |
| 답이 한 문장에 있지 않고 여러 엔티티를 거쳐야 나온다 ("A의 공급업체가 납품하는 다른 고객사는?") | 단순 내용 검색이다 ("환불 정책이 어떻게 되나요?" 같은 FAQ) |
| 관계의 **방향**이나 속성이 중요하다 | 관계 구조가 단순하거나 없다 |
| 그래프 전체에 대한 요약·집계가 필요하다 ("가장 많이 본 영화는?") | 도메인 지식 없이 스키마를 설계하기 어렵다 |

방향이 왜 중요한지는 결재 예시가 잘 보여 준다. `대리 -[보고한다]-> 부장`, `부장 -[관리한다]-> 대리`에서 방향을 지우면 누가 누구에게 보고하는지, 즉 결재권자가 누구인지 알 수 없다.

## Neo4j 준비

| | Neo4j AuraDB Free | Neo4j Desktop |
|---|---|---|
| 형태 | 클라우드 관리형 | 로컬 GUI 앱 |
| 설치 | 없음 (브라우저) | 다운로드 후 설치, 활성화 키 입력 |
| 제한 | 노드 5만, 관계 17.5만, 약 200MB, 인스턴스 1개 | DB 개수 제한 없음 |
| URI 예 | `neo4j+s://xxxx.databases.neo4j.io` | `neo4j://127.0.0.1:7687` |

AuraDB는 인스턴스를 만들 때 Username/Password/URI가 **한 번만** 표시되므로 바로 저장해야 한다. Desktop은 Projects → New Project → Local DBMS로 DB를 만들고 Start한다.

Desktop을 쓸 때는 DB 인스턴스를 만든 뒤 **APOC 플러그인**을 설치하고, 설정 파일(`neo4j.conf`)에 다음을 추가한다.

```text
dbms.security.procedures.unrestricted=apoc.*,apoc.meta.*
```

> **보충**: APOC는 Neo4j의 확장 프로시저 모음이다. LangChain의 `Neo4jGraph`는 스키마를 읽을 때 `apoc.meta.*` 프로시저를 쓰기 때문에, 이게 없으면 `graph.schema`를 가져오는 단계에서 에러가 난다.

## LangChain으로 Neo4j 연결하기

```bash
pip install langchain-neo4j
```

`Neo4jGraph`는 Neo4j Python 드라이버를 감싼 래퍼다.

| 역할 | 내용 |
|---|---|
| Cypher 실행 | `query()`로 읽기/쓰기 쿼리를 실행하고 결과를 `list[dict]`로 반환 |
| 스키마 조회 | 노드 레이블·관계 타입·속성을 읽어 `schema`에 저장 |
| GraphRAG 연계 | `GraphCypherQAChain`, `LLMGraphTransformer` 등과 결합 |

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| `url` | `None` | 서버 URL (환경변수 `NEO4J_URI`) |
| `username` | `None` | 사용자명 (`NEO4J_USERNAME`) |
| `password` | `None` | 비밀번호 (`NEO4J_PASSWORD`) |
| `database` | `"neo4j"` | 접속할 DB 이름 (`NEO4J_DATABASE`) |
| `refresh_schema` | `True` | 생성 시 스키마 자동 조회 |
| `enhanced_schema` | `False` | DB를 스캔해 속성의 실제 예시값까지 스키마에 포함 |

환경변수에 연결 정보가 있으면 인자 없이 `Neo4jGraph()`만으로 연결된다.

```python
import os
from dotenv import load_dotenv
from pprint import pprint

load_dotenv(override=True)

print("NEO4J_URI:", os.getenv("NEO4J_URI"))
print("NEO4J_USERNAME:", os.getenv("NEO4J_USERNAME"))
print("NEO4J_DATABASE:", os.getenv("NEO4J_DATABASE"))
```

```text
NEO4J_URI: neo4j://127.0.0.1:7687
NEO4J_USERNAME: neo4j
NEO4J_DATABASE: None
```

> **보충**: 비밀번호는 `print`로 확인하지 않는다. 출력이 노트북에 평문으로 저장되기 때문이다. 확인이 필요하면 `print(bool(os.getenv("NEO4J_PASSWORD")))`처럼 존재 여부만 찍는다. `NEO4J_DATABASE`가 `None`이면 기본 DB인 `neo4j`에 붙는다.

```python
from langchain_neo4j import Neo4jGraph
from pprint import pprint
##################################
# 환경변수로 연결설정 정보 저장 후 연결
##################################
graph = Neo4jGraph()

# 연결확인
print(graph.query("RETURN ' helloword neo4j' AS result"))
```

```text
[{'result': ' helloword neo4j'}]
```

`RETURN '문자열' AS 별칭`은 DB의 데이터를 읽지 않고 값만 돌려주는 가장 짧은 Cypher다. 결과가 `list[dict]`로 오는 것도 확인할 수 있다.

```python
graph.query("SHOW DATABASES")
```

```text
[{'name': 'neo4j',
  'type': 'standard',
  'access': 'read-write',
  'address': 'localhost:7687',
  'currentStatus': 'online',
  'default': True,
  'home': True,
  ...},
 {'name': 'system',
  'type': 'system',
  ...}]
```

`neo4j`가 기본(default) DB이고, `system`은 사용자·권한 같은 메타 정보를 관리하는 DB다.

### 실습용 초기화 함수

실습을 반복하려면 DB를 비워야 한다. 노드와 관계, 제약조건, 인덱스를 모두 지운다.

```python
def reset_database(graph):
    """
    데이터베이스 초기화하기
    """
    # 모든 노드와 관계 삭제
    graph.query("MATCH (n) DETACH DELETE n")
    
    # 모든 제약조건 삭제
    constraints = graph.query("SHOW CONSTRAINTS")
    print(type(constraints)) # list[dict]

    for constraint in constraints:
        constraint_name = constraint.get("name")
        if constraint_name:
            graph.query(f"DROP CONSTRAINT {constraint_name}")
    
    # 모든 인덱스 삭제
    indexes = graph.query("SHOW INDEXES")
    print(type(indexes), indexes)
    for index in indexes:
        index_name = index.get("name")
        index_type = index.get("type")
        if index_name and index_type != "CONSTRAINT":
            graph.query(f"DROP INDEX {index_name}")
    
    print("데이터베이스가 초기화되었습니다.")

# 데이터베이스 초기화
reset_database(graph)
```

```text
<class 'list'>
<class 'list'> []
데이터베이스가 초기화되었습니다.
```

`MATCH (n) DETACH DELETE n`은 모든 노드를 찾아 연결된 관계와 함께 지운다. 제약조건을 먼저 지우는 이유는, 유일성 제약조건을 만들면 Neo4j가 그에 딸린 인덱스를 자동으로 만들고 그 인덱스는 `DROP INDEX`로 지울 수 없기 때문이다. 제약조건을 지우면 딸린 인덱스도 함께 사라진다.

LangChain과의 연결은 `graph.query()`로 Cypher를 직접 실행하는 방법과 `GraphCypherQAChain`으로 자연어 질문을 처리하는 방법 두 가지인데, 후자는 Cypher를 알아야 결과를 검증할 수 있다. 다음 글은 Cypher 기본 문법이다.

## 정리

| 질문 | Vector RAG | GraphRAG |
|---|---|---|
| "이 내용과 비슷한 문서는?" | ✅ | △ |
| "A와 연결된 B의 C는?" | ✗ | ✅ |
| "전체에서 가장 많은 것은?" | ✗ | ✅ (집계) |
| "환불 정책은?" (FAQ) | ✅ | 과잉 |

- Vector RAG는 유사도, GraphRAG는 **관계**로 찾는다. 둘은 상호보완적이다.
- 그래프 DB는 **Node(+Label), Relationship(방향·타입), Property**로 데이터를 저장한다. 관계에도 속성이 있다.
- GraphRAG의 핵심 비용은 **그래프 구축과 스키마 설계**다.
- Neo4j Desktop은 APOC 플러그인이 있어야 LangChain에서 스키마를 읽을 수 있다.
