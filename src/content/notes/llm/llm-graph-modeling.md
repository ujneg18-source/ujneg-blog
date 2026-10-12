---
title: "그래프 모델링: LLM으로 스키마 초안 만들고 영화 데이터 적재하기"
description: "무엇을 Node로, Relationship으로, Property로 둘지 판단하는 기준과 GraphRAG용 좋은 스키마의 조건을 정리하고, LLM에게 기업 소개 문서를 주어 스키마·CREATE·제약조건·인덱스 초안을 생성해 검토합니다. 이어서 TMDB 영화 CSV 4,803편을 GraphDocument로 변환해 Neo4j에 Movie·Person·Genre 그래프로 적재합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'GraphRAG'
seriesOrder: 4
originalNotebook: "GraphRAG/03_LLM을 이용한 그래프디비 설계.ipynb, 04_movie_datatase구성.ipynb"
tags: ["LLM","GraphRAG"]
date: 2026-07-12T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-graph-modeling.webp'
---

> SKN31 AI Agent 과정 이론 자료 `04_GraphRAG를위한그래프모델링.md`와 노트북 `03_LLM을 이용한 그래프디비 설계.ipynb`, `04_movie_datatase구성.ipynb`를 바탕으로 정리했습니다.
> 두 노트북의 출력은 **강사님 노트북의 실행 결과**입니다. LLM 출력은 실행할 때마다 달라집니다.

## 이 글에서 다루는 것

- Node, Relationship, Property를 나누는 기준
- 좋은 스키마와 나쁜 스키마: LLM이 Cypher를 만들기 쉬운 구조
- LLM으로 문서에서 스키마·Cypher 초안 생성하고 검토하기
- 영화 CSV를 그래프로: 설계 명세, 제약조건·인덱스, `GraphDocument` 적재

Cypher를 익혔으니 이제 **무엇을 어떤 모양으로 저장할지** 정할 차례다. Vector RAG에서는 청크 크기와 오버랩을 고민했다면, GraphRAG에서는 스키마가 그 자리에 있다. 모델링이 잘못되면 Cypher가 복잡해지고, LLM이 만드는 Cypher의 품질도 떨어진다.

## 무엇을 Node로 만드나

**Node는 독립적으로 존재하거나 다른 개체가 참조할 수 있는 엔티티**다.

- 여러 관계의 중심이 되는가
- 다른 개체에서 독립적으로 참조될 수 있는가
- 그 자체를 직접 검색하거나 탐색의 시작점이 되는가

| 후보 (영화 도메인) | 판단 | 이유 |
|---|---|---|
| 영화 | Node ✅ | 독립 개체, 여러 관계의 중심 |
| 감독 | Node ✅ | 여러 영화와 연결 |
| 장르 | Node ✅ | 여러 영화가 공유, 직접 검색 대상 |
| 상영 시간 | Property | 영화의 속성값, 단독 참조 안 됨 |
| 평점 | Property | 영화의 속성값 |

## 무엇을 Relationship으로 만드나

**Relationship은 두 노드 사이의 행위, 역할, 연관**이다.

- 방향이 있거나 의미 있는 연결인가
- 연결 자체에 속성(언제, 어느 정도, 어떤 역할)이 붙을 수 있는가 → Relationship + Property

이름 규칙은 **대문자 SNAKE_CASE 동사(구)** 다. `DIRECTED`, `ACTED_IN`, `WORKS_FOR`. 모호한 이름은 피한다. `RELATED_TO`는 "관계가 있다"는 것 말고는 아무것도 말해 주지 않는다. `COLLABORATED_WITH`처럼 어떤 관계인지 드러나야 한다.

```cypher
(배우)-[:ACTED_IN {role: "주인공"}]->(영화)          // 역할
(인물)-[:WORKS_FOR {start: 2019, end: 2023}]->(회사)  // 재직 기간
```

## 무엇을 Property로 두나

**Property는 노드나 관계의 세부 값**이다. 스칼라 값(문자열, 숫자, 불리언, 날짜)이고, 여러 개체가 공유하지 않으며, 탐색의 시작점이 될 필요가 없다.

| 후보 | Property | Node | 판단 기준 |
|---|---|---|---|
| 영화 개봉연도 | ✅ | | 영화의 속성값 |
| 장르 이름 | | ✅ | 여러 영화가 공유, 직접 검색 대상 |
| 사람의 나이 | ✅ | | 특정 사람의 속성값 |
| 기술 스택 (Python, Java) | | ✅ | 여러 인물·회사가 공유, 탐색 중심 가능 |
| 관계의 시작일 | ✅ | | 관계의 부가 정보 |

판단이 애매할 때는 "**이 값으로 다른 것을 찾고 싶은가?**"를 물으면 된다. "Python을 쓰는 회사"를 찾고 싶다면 Python은 노드다. "개봉연도가 2010년인 영화"는 속성 필터로 충분하니 연도는 속성이다.

## 좋은 스키마와 나쁜 스키마

**나쁜 스키마**: 다른 엔티티를 문자열로 박아 넣었다.

```cypher
(회사:Company {
  name: "카카오",
  ceo: "홍길동",                       // ← CEO를 문자열로 저장함.
  products: "카카오톡, 카카오맵",         // ← 제품 목록을 문자열로 저장함.
  tech_stack: "Python, Java, Kotlin"   // ← 기술을 문자열로 저장함
})
```

**좋은 스키마**: 노드로 분리하고 관계로 연결했다.

```cypher
CREATE (kakao:Company {name: "카카오", founded: 2010})
CREATE (hong:Person {name: "홍길동", title: "대표이사"})
CREATE (kakao_talk:Product {name: "카카오톡", launched: 2010})
CREATE (python:Technology {name: "Python"})

CREATE (hong)-[:CEO_OF]->(kakao)
CREATE (kakao_talk)-[:MADE_BY]->(kakao)
CREATE (kakao)-[:USES]->(python)
```

> **보충**: 수업 자료의 좋은 스키마 예시에는 노드 변수가 `kakao_talk`인데 관계에서는 `kakaotalk`으로 적혀 있다. CREATE에서 처음 보는 변수는 **새 노드**로 만들어지므로, 그대로 실행하면 레이블도 속성도 없는 빈 노드가 하나 생기고 거기에 MADE_BY가 걸린다. 위에서는 `kakao_talk`으로 맞췄다. Cypher는 이런 오타를 에러로 잡아 주지 않는다.

이 차이가 GraphRAG에서 결정적인 이유는 **LLM이 실제 데이터를 모르고 스키마만 보고 Cypher를 만들기 때문**이다. "Python을 쓰는 회사의 CEO는?"을 물으면:

```text
좋은 스키마일 때:
MATCH (c:Company)-[:USES]->(:Technology {name:"Python"})
      <-[:CEO_OF]-(p:Person)
RETURN c.name, p.name

나쁜 스키마일 때:
MATCH (c:Company)
WHERE c.tech_stack CONTAINS "Python"   ← 부분 문자열 검색이라 부정확
RETURN c.name, c.ceo                   ← CEO가 문자열이라 더 탐색할 수 없음
```

`CONTAINS "Python"`은 "MicroPython"이나 "Python 2만 쓰다 그만둠" 같은 문자열에도 걸린다. 그리고 CEO가 문자열이면 "그 CEO가 다른 어떤 회사의 이사인가?"로 이어지는 질문이 불가능하다.

순서도 중요하다. **스키마를 먼저 만들고 질문을 끼워 맞추는 게 아니라, 자주 물을 질문을 먼저 정하고 그 질문이 Cypher 패턴으로 자연스럽게 표현되는지 확인한다.**

### 모델링 체크리스트

```text
□ 자주 묻는 질문을 Cypher로 표현할 수 있는가?
□ Node Label은 명사 단수형인가? (Person, Company, Product)
□ Relationship 이름은 동사 대문자인가? (DIRECTED, WORKS_FOR)
□ 다른 Node로 분리해야 할 대상을 문자열이나 문자열 배열로 저장하지 않았는가?
  (Movie {actor: '전지현, 구교환, 지창욱'} → Movie와 Actor로 분리하고 관계 연결)
□ Relationship에 부가 정보가 있다면 Property로 추가했는가?
□ LangChain의 graph.schema 출력이 사람이 읽기 쉬운가?
```

## LLM으로 스키마 초안 만들기

문서가 많으면 사람이 스키마를 다 설계하기 어렵다. LLM에게 문서를 주고 **노드·관계·속성 설계, CREATE 쿼리, 제약조건, 인덱스, 설계 근거**까지 한 번에 만들게 한다. 단, 결과는 **초안**이다. 중복, 관계 방향, 이름 규칙, 식별자를 사람이 검토해야 한다.

입력 문서는 구글, 네이버, 카카오, 아마존, 엔비디아, 메타 6개 기업의 소개문이다.

```python
DOCUMENTS = [
    "구글은 1995년 스탠퍼드대에서 만난 래리 페이지와 세르게이 브린이 ...",
    "네이버는 이해진이 삼성SDS 사내벤처에서 출발해 1999년 6월 설립한 ...",
    ...
    "메타는 마크 저커버그가 더스틴 모스코비츠, 크리스 휴스, 에두아르도 세버린과 함께 2004년 2월 4일 하버드에서 Facebook을 시작하며 출발했다. 처음에는 대학생용 소셜 네트워크였지만 빠르게 일반 대중으로 확장했고, 이후 Instagram, WhatsApp, Oculus를 인수했다. 2021년에는 사명을 Meta로 바꾸고 소셜미디어와 광고, 메신저, 메타버스, AI, AR·VR 기기로 사업을 넓혔다. 현재 주력은 Facebook, Instagram, Messenger, WhatsApp을 포함한 Family of Apps 광고 사업이다. 2025년 총매출은 2,009억 달러였다."
]
```

문서가 길면 한 번에 다 시키기보다 **단계로 나누는** 편이 품질이 높다(노드·관계 추출 → 제약조건 → 인덱스 → 명세서, 각각 Prompt | Model | Parser 체인). 이 예제는 문서가 짧아서 한 번에 처리한다.

프롬프트는 앞의 모델링 기준을 그대로 규칙으로 옮겼다. 핵심만 추리면:

```text
당신은 Neo4j 그래프 데이터베이스 스키마 설계 전문가이다.
...
## 1. 노드(Noe) 설계 규칙
- 문서에서 독립적으로 식별 가능한 주요 개체를 노드로 설계한다.
- 노드 Label은 PascalCase로 작성한다.
- 하나의 노드는 최소 하나 이상의 식별 속성을 가져야 한다.
- 문서에 명시되지 않은 정보는 임의로 만들지 않는다.
- 같은 의미의 개체는 하나의 Label로 통합한다. (기업, 회사, 업체 → Company)

## 2. 관계(Relationship) 설계 규칙
- 관계 타입은 동사 또는 동사구로, 대문자 SNAKE_CASE로 작성한다.
- 관계는 의미상 자연스러운 방향으로 설정한다.
- 단순히 함께 등장했다는 이유만으로 관계를 만들지 않는다.

## 3. 속성(Property) 설계 규칙
- 속성명은 camelCase로 작성한다.
- 속성값은 문서에 있는 내용만 사용한다.
...
## 7. 출력 형식
# 1. 추출된 그래프 스키마 요약
# 2. 노드 스키마 (표)
# 3. 관계 스키마 (표)
# 4. Cypher CREATE 쿼리
# 5. 제약조건 생성 쿼리
# 6. Index 생성 쿼리
# 7. 설계 근거
```

```python
##########################################
# 지식 그래프로 변환
##########################################
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
load_dotenv()


model = ChatOpenAI(model="gpt-5.5")

chain = graph_schema_prompt | model

def convert_to_graph_doc(docs:list[str], labels: list[str]=None, relationship:list[str]=None) -> list[str]:
    """문서들을 받아서 db schema(index, constraint) 와 data 생성(Node, Relationship) 생성 cypher query 만드는 함수
    ...
    """
    graph_docs = []
    for doc in docs:
        result = chain.invoke(
                {
                    "labels": labels if labels else "None",
                    "relationship": relationship if relationship else "None",
                    "document": doc
                }
        )
        graph_docs.append(result)
    
    return graph_docs

graph_docs = convert_to_graph_doc(DOCUMENTS)
print(graph_docs[5].content)
```

> **보충**: 함수는 `labels`와 `relationship`을 받아 체인에 넘기지만, 프롬프트 템플릿에는 `{labels}`, `{relationship}` 변수가 없다. 그래서 이 인자들은 **조용히 무시된다.** "Company, Person만 뽑아라"처럼 추출 대상을 제한하려면 프롬프트에 `추출할 Label: {labels}` 같은 자리를 만들어야 한다. 반환 타입 힌트도 `list[str]`이지만 실제로는 `AIMessage` 리스트다.

메타 문서에 대한 결과(일부)다.

```text
# 1. 추출된 그래프 스키마 요약

- **Meta**는 독립적으로 조회되는 중심 개체이므로 `Company` 노드로 설계
- **마크 저커버그 등 창업자**는 `Person` 노드로 설계
- **Facebook, Instagram, WhatsApp, Oculus, Messenger**는 회사가 운영하거나 인수한 주요 서비스/제품이므로 `Product` 노드로 설계
- **하버드**는 Facebook이 시작된 장소이므로 `Location` 노드로 설계
- **소셜미디어, 광고, 메신저, 메타버스, AI, AR·VR 기기**는 Meta의 사업 영역이므로 `BusinessArea` 노드로 설계
- **Family of Apps 광고 사업**은 현재 주력 사업 단위이므로 `BusinessSegment` 노드로 설계
- **2025년 총매출 2,009억 달러**는 연도와 금액이 있는 재무 정보이므로 `FinancialMetric` 노드로 설계

# 2. 노드 스키마 예

| Label | 설명 | 주요 속성 | 고유 식별 속성 |
|---|---|---|---|
| Company | 기업 | name, aliases, formerName, renamedYear | name |
| Person | 사람 | name | name |
| Product | 서비스, 앱, 제품 | name, initialAudience, expandedAudience | name |
| Location | 장소 | name | name |
| BusinessArea | 사업 영역 | name | name |
| BusinessSegment | 사업 부문 | name, description | name |
| FinancialMetric | 재무 지표 | id, metricType, year, amount, currency, unit, originalAmountText | id |

# 4. Cypher CREATE 쿼리
CREATE
  (meta:Company {name: 'Meta', aliases: ['메타'], formerName: 'Facebook', renamedYear: 2021}),
  (mark:Person {name: '마크 저커버그'}),
  ...
  (revenue2025:FinancialMetric {
    id: 'Meta-totalRevenue-2025', metricType: 'totalRevenue', year: 2025,
    amount: 200.9, currency: 'USD', unit: 'billion', originalAmountText: '2,009억 달러'
  })
CREATE
  (mark)-[:FOUNDED {date: date('2004-02-04'), foundingEntity: 'Facebook'}]->(meta),
  ...
  (meta)-[:ACQUIRED]->(instagram),
  (meta)-[:ACQUIRED]->(whatsapp),
  (meta)-[:ACQUIRED]->(oculus),
  (meta)-[:EXPANDED_INTO {year: 2021}]->(socialMedia),
  ...
  (meta)-[:REPORTED_METRIC]->(revenue2025);

# 7. 설계 근거
...
## 정보 부족으로 확정하기 어려운 부분
- Instagram, WhatsApp, Oculus의 인수 연도와 인수 금액은 문서에 없으므로 관계 속성으로 추가하지 않았다.
- 하버드는 문서에서 단순히 "하버드"라고만 언급되므로 `University`가 아니라 `Location`으로 모델링했다.
- Oculus가 구체적으로 AR·VR 기기 사업과 직접 연결된다는 정보는 문서에 명시적으로 나오지 않으므로 관계는 만들지 않았다.
- 2025년 총매출 2,009억 달러는 `200.9` billion USD로 저장하고, 원문 표현은 `originalAmountText`에 보존했다.
```

규칙을 꽤 잘 따랐다. 문서에 없는 인수 연도를 지어내지 않았고, 매출을 회사 속성이 아니라 `FinancialMetric` 노드로 빼서 연도별 매출을 쌓을 수 있게 했다. "확정하기 어려운 부분"을 스스로 적어 둔 것도 검토할 때 유용하다.

그래도 사람이 볼 곳이 있다.

| 검토 포인트 | 내용 |
|---|---|
| 관계 속성의 의미 | `EXPANDED_INTO {year: 2021}`을 소셜미디어에도 붙였다. 소셜미디어는 2004년부터 하던 사업이다. 문장 하나에 묶여 있던 정보를 일괄 적용한 것이다 |
| 노드 분류 기준 | "메신저"가 `BusinessArea`에, "Messenger"가 `Product`에 따로 있다. 질의할 때 혼동될 수 있다 |
| 문서 간 통합 | 문서마다 따로 CREATE를 만든다. 구글 문서와 다른 문서에 같은 인물·기술이 나오면 **노드가 중복** 생긴다. 여러 문서를 합칠 때는 MERGE로 바꾸거나 제약조건을 먼저 걸어야 한다 |
| Label 일관성 | 문서마다 LLM이 Label을 따로 정하므로, 한 문서는 `Company`, 다른 문서는 `Organization`처럼 갈릴 수 있다. 앞의 `labels` 인자를 실제로 프롬프트에 넣어 목록을 고정하는 이유다 |

> **보충**: LangChain에는 이 작업을 위한 `LLMGraphTransformer`(`langchain_experimental.graph_transformers`)도 있다. 문서를 받아 `GraphDocument`(노드·관계 객체)로 바로 변환하고, `allowed_nodes`, `allowed_relationships`로 Label과 관계 타입을 제한할 수 있다. 이 노트북은 그 과정을 프롬프트로 직접 풀어 본 것이다.

## 영화 데이터를 그래프로

이번엔 정형 데이터(CSV)다. 비정형 문서와 달리 엔티티와 관계가 컬럼에 이미 들어 있어서 LLM 없이 코드로 변환한다.

### 설계 명세

| Label | 속성 | 식별 |
|---|---|---|
| `Movie` | id, title, released, rating (+ overview, runtime, tagline) | `id` (`"movie-1000"`) |
| `Person` | name | `name` |
| `Genre` | name | `name` |

| 관계 | 방향 | 의미 |
|---|---|---|
| `DIRECTED` | Person → Movie | 감독했다 |
| `ACTED_IN` | Person → Movie | 출연했다 |
| `IN_GENRE` | Movie → Genre | 장르에 속한다 |

감독과 배우를 `Director`, `Actor` 레이블로 나누지 않고 모두 `Person`으로 둔다. 같은 사람이 감독도 하고 출연도 하기 때문이다. 역할은 **관계 타입**(DIRECTED, ACTED_IN)이 말해 준다.

### 제약조건과 인덱스 먼저

```python
###################################################
# 제약조건 구문
###################################################
constraints = [
    "CREATE CONSTRAINT movie_id_unique IF NOT EXISTS FOR (m:Movie) REQUIRE m.id IS UNIQUE",
    "CREATE CONSTRAINT movie_title_exists IF NOT EXISTS FOR (m:Movie) REQUIRE m.title IS NOT NULL",
    "CREATE CONSTRAINT person_name_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE",
    "CREATE CONSTRAINT genre_name_unique IF NOT EXISTS FOR (g:Genre) REQUIRE g.name IS UNIQUE"
]

###################################
# 인덱스 생성 구문 
###################################
indexes = [
    "CREATE INDEX movie_title_index IF NOT EXISTS FOR (m:Movie) ON (m.title)",
    "CREATE INDEX movie_rating_index IF NOT EXISTS FOR (m:Movie) ON (m.rating)",
    "CREATE INDEX movie_release_index IF NOT EXISTS FOR (m:Movie) ON (m.released)",
]

for constraint in constraints:
    graph.query(constraint)
    
for index in indexes:
    graph.query(index)

print("스키마 설정 완료")
```

```text
스키마 설정 완료
```

```python
graph.query("SHOW INDEXES")
```

```text
[{'name': 'genre_name_unique', 'type': 'RANGE', 'labelsOrTypes': ['Genre'],
  'properties': ['name'], 'owningConstraint': 'genre_name_unique', ...},
 {'name': 'index_1b9dcc97', 'type': 'LOOKUP', 'entityType': 'RELATIONSHIP',
  'labelsOrTypes': None, 'properties': None, 'owningConstraint': None, ...},
 {'name': 'index_460996c0', 'type': 'LOOKUP', 'entityType': 'NODE',
  'labelsOrTypes': None, 'properties': None, 'owningConstraint': None, ...},
 {'name': 'movie_id_unique', 'type': 'RANGE', 'owningConstraint': 'movie_id_unique', ...},
 {'name': 'movie_rating_index', 'type': 'RANGE', ...},
 ...]
```

세 종류가 보인다. 유일성 제약조건이 만든 인덱스(`owningConstraint`가 있음), 직접 만든 RANGE 인덱스, 그리고 이름이 `index_xxxx`인 **LOOKUP 인덱스** 두 개다. LOOKUP은 Neo4j가 기본으로 두는 인덱스로, `MATCH (n:Movie)`처럼 **레이블이나 관계 타입으로 찾을 때** 쓴다. `NOT NULL` 제약조건(`movie_title_exists`)은 값을 찾을 필요가 없어서 인덱스를 만들지 않는다(`ownedIndex: None`).

수업 자료의 노드 속성 조회용 프로시저도 함께 정리해 둔다.

| 프로시저 | 용도 |
|---|---|
| `CALL db.schema.visualization()` | Label과 Relationship 구조를 시각적으로 표시 |
| `CALL db.schema.nodeTypeProperties()` | 노드의 속성 조회 |
| `CALL db.schema.relTypeProperties()` | 관계의 속성 조회 |

### CSV 읽기

TMDB와 GroupLens 데이터를 결합한 4,803편의 영화 데이터다.

```python
import pandas as pd
df = pd.read_csv('data/movies_tmdb_small.csv')
print(df.shape)

df.head(5)
```

```text
(4803, 10)

     id    released                title                                             actors        director                  genres  rating ...
0  4592  1916-09-04          Intolerance  Lillian Gish|Mae Marsh|Robert Harron|F.A. Turn...   D.W. Griffith                   Drama     7.4
1  4661  1925-11-05       The Big Parade  John Gilbert|Renée Adorée|Hobart Bosworth|Clai...      King Vidor       Drama|Romance|War     7.0
2  2638  1927-01-10           Metropolis  Brigitte Helm|Alfred Abel|Gustav Fröhlich|Rudo...      Fritz Lang   Drama|Science Fiction     8.0
...
```

`actors`와 `genres`가 `|`로 이어진 문자열이다. 체크리스트의 "문자열로 저장하지 않았는가"에 해당하는 모양이라, 쪼개서 **각각 노드로** 만들어야 한다.

```python
# released (개봉일:yyyy-mm-dd 형식의 문자열) =타입변환=> datetime 타입
df['released'] = pd.to_datetime(df['released'], format='%Y-%m-%d')
```

`df.info()`로 보면 결측치가 있다. actors 43개, director 30개, genres 28개, tagline 844개가 비어 있다. 비어 있는 값으로는 노드를 만들지 않아야 한다.

### GraphDocument로 변환

`langchain_neo4j`의 `Node`, `Relationship`, `GraphDocument`로 그래프를 표현한다.

| 클래스 | 필드 |
|---|---|
| `Node` | `id`(고유 식별자), `type`(레이블), `properties`(dict) |
| `Relationship` | `source`(시작 Node), `target`(끝 Node), `type`(관계 타입), `properties` |
| `GraphDocument` | `nodes`, `relationships` 리스트 |

```python
from langchain_neo4j.graphs.graph_document import GraphDocument, Node, Relationship
from langchain_core.documents import Document
```

```python
##########################################################################
# DataFrame의 내용을 그래프 구조로 변환하기 위해 노드와 관계를 생성한다.
##########################################################################

# 노드 ID를 키로 사용하여 생성된 노드 객체를 저장할 dict
node_dict = {}  # key: node-id value: Node객체

# 관계를 저장할 리스트
relationships = []

batch_size = 100

total_rows = len(df)
for batch_start in range(0, total_rows, batch_size):
    batch_end = min(batch_start + batch_size, total_rows)
    batch_df = df.iloc[batch_start:batch_end]
    
    for _, row in batch_df.iterrows():

        # 영화 정보 처리
        movie_id = f"movie-{row['id']}" # node_dict에 저장할 때 영화 Node의 key
        if movie_id not in node_dict: # 이미 저장된 Node가 아니라면

            movie_properties = {
                "id": movie_id,
                "title": row['title'],
                "released": row['released'],
                "rating": float(row['rating']) if pd.notna(row['rating']) else None
            }
            
            if pd.notna(row.get('overview')):
                movie_properties["overview"] = row['overview']
            ...
            movie_node = Node(
                id=movie_id,
                type="Movie",
                properties=movie_properties
            )
            
            node_dict[movie_id] = movie_node
        
        # 감독 정보 처리 (결측값이 아닌 경우에만)
        if pd.notna(row.get('director')):
            for director in row['director'].split('|'):
                director = director.strip() # 감독이름
                director_id = f"person-{director}"
                
                if director_id not in node_dict:
                    director_node = Node(
                        id=director_id,
                        type="Person",
                        properties={"name": director}
                    )
                    
                    node_dict[director_id] = director_node
                
                relationships.append(
                    Relationship(
                        source=node_dict[director_id],
                        target=node_dict[movie_id],
                        type="DIRECTED",
                        properties={}
                    )
                )
        
        # 배우 정보 처리: 같은 방식으로 person-{배우} 노드 + ACTED_IN
        # 장르 정보 처리: genre-{장르} 노드 + (Movie)-[:IN_GENRE]->(Genre)
        ...
    
    print(f"배치 처리 완료: {batch_start+1}~{batch_end}/{total_rows} 레코드")

# 결과 출력
print(f"총 노드 수: {len(node_dict)}")
print(f"총 관계 수: {len(relationships)}")
```

```text
배치 처리 완료: 1~100/4803 레코드
배치 처리 완료: 101~200/4803 레코드
...
배치 처리 완료: 4801~4803/4803 레코드
총 노드 수: 16528
총 관계 수: 40921
```

핵심은 `node_dict`다. **노드 id를 key로 쓰는 dict**라서 같은 배우가 100편에 나와도 노드는 하나만 만들고, 관계만 100개 쌓인다. CREATE의 중복 문제를 파이썬 쪽에서 막는 셈이다. id에 `movie-`, `person-`, `genre-` 접두어를 붙인 이유는 영화 id(숫자)와 사람·장르 이름이 우연히 겹치지 않게 하기 위해서다.

```python
for i, (k, v) in enumerate(node_dict.items()):
    print(k, v, sep="::")
    if i == 2:
        break
```

```text
movie-4592::id='movie-4592' type='Movie' properties={'id': 'movie-4592', 'title': 'Intolerance', 'released': Timestamp('1916-09-04 00:00:00'), 'rating': 7.4, 'overview': 'The story of a poor young woman, ...
person-D.W. Griffith::id='person-D.W. Griffith' type='Person' properties={'name': 'D.W. Griffith'}
person-Lillian Gish::id='person-Lillian Gish' type='Person' properties={'name': 'Lillian Gish'}
```

> **보충**: `person-{이름}`을 id로 쓰면 **동명이인이 한 노드로 합쳐진다.** 4,803편 규모에서는 문제가 드물지만, 실제 서비스라면 TMDB의 person id처럼 고유 번호를 써야 한다. 설계 명세에도 "동일 이름 인물을 구분하지 않기 때문에 name을 유일한 값으로 관리할 수 있다"고 이 한계를 적어 두었다. 또 `rating` 결측치를 `None`으로 넣으면 Neo4j에는 그 속성이 아예 저장되지 않는다(null 속성은 저장하지 않는다).

### Neo4j에 저장

```python
nodes = list(node_dict.values())

# GraphDocument 객체 생성
graph_doc = GraphDocument(
    nodes=nodes,
    relationships=relationships
)

# 생성된 GraphDocument를 Neo4j 데이터베이스에 저장
# add_graph_documents 메서드는 GraphDocument 객체 리스트를 받아 데이터베이스에 일괄 저장
graph.add_graph_documents([graph_doc]) # Node, Relationship들을 CREATE 처리.
print("그래프 데이터베이스에 저장 완료")
```

```text
그래프 데이터베이스에 저장 완료
```

> **보충**: 주석에는 "CREATE 처리"라고 되어 있지만, `add_graph_documents`는 내부적으로 노드를 `id`로 **MERGE**한다. 그래서 같은 GraphDocument를 다시 넣어도 노드가 두 배가 되지는 않는다. 다만 관계도 MERGE되므로, 같은 배우가 같은 영화에 두 번 기록된 데이터라도 관계는 하나로 합쳐진다. Neo4j에는 노드 id가 `id` 속성으로 저장된다.

```python
# 노드 개수 확인
graph.query(
    """MATCH (n:Movie)
WITH count(n) AS 영화수
MATCH (p:Person)
WITH 영화수, count(p) AS 사람수
MATCH (g:Genre)
RETURN 영화수, 사람수, count(g) AS 장르수"""
)
```

```text
[{'영화수': 4803, '사람수': 11705, '장르수': 20}]
```

4,803 + 11,705 + 20 = 16,528로 `node_dict` 크기와 정확히 맞는다. 집계를 WITH로 한 번씩 접어 세 레이블의 개수를 한 행으로 받았다. 지난 글에서 본 WITH 패턴이다.

## 정리

| 질문 | 답 |
|---|---|
| 노드인가? | 여러 관계의 중심이거나, 독립적으로 참조되거나, 검색의 시작점이면 |
| 관계인가? | 두 노드 사이의 행위·역할·연관이면. 부가 정보는 관계 속성으로 |
| 속성인가? | 공유되지 않는 스칼라 값이고 그 값으로 다른 걸 찾을 일이 없으면 |
| 이름 규칙 | Label은 PascalCase 단수 명사, 관계는 UPPER_SNAKE 동사, 속성은 camelCase |

| 데이터 | 변환 방법 | 주의 |
|---|---|---|
| 비정형 문서 | LLM으로 스키마·Cypher 초안 생성 (또는 `LLMGraphTransformer`) | 초안이다. 관계 속성의 의미, Label 일관성, 문서 간 중복을 사람이 검토 |
| 정형 CSV | 코드로 `Node`/`Relationship` 생성 → `add_graph_documents` | `\|`로 묶인 값은 쪼개서 노드로. id 설계(동명이인)와 결측치 처리 |

- 스키마는 **자주 할 질문**에서 출발한다. LLM은 스키마만 보고 Cypher를 쓴다.
- 다른 엔티티를 문자열로 넣으면 `CONTAINS` 검색밖에 못 하고 다음 탐색이 끊긴다.
- 대량 적재 전에 **제약조건과 인덱스를 먼저** 건다.

다음 글에서는 이 영화 그래프에 줄거리 임베딩을 넣어 벡터 검색을 하고, LLM이 질문을 Cypher로 바꾸는 Text2Cypher를 다룬다.
