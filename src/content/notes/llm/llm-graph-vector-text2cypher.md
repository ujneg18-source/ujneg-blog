---
title: "그래프 검색 두 가지: Neo4j 벡터 검색과 Text2Cypher"
description: "영화 노드에 제목·태그라인·줄거리 임베딩을 저장하고 Neo4j 벡터 인덱스와 SEARCH 절로 의미 기반 검색을 구현한 뒤, LLM이 스키마를 보고 자연어 질문을 Cypher로 바꾸는 Text2Cypher를 직접 구현하고 GraphCypherQAChain으로 정리합니다. top_k, return_intermediate_steps, return_direct, LLM 분리 옵션과 생성된 쿼리가 틀리는 경우를 함께 봅니다."
category: 'Tech'
subcategory: 'LLM'
series: 'GraphRAG'
seriesOrder: 5
originalNotebook: "GraphRAG/05_vector_search.ipynb, 06_text2cypher.ipynb"
tags: ["LLM","GraphRAG"]
date: 2026-07-13T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-graph-vector-text2cypher.webp'
---

> SKN31 AI Agent 과정 노트북 `GraphRAG/05_vector_search.ipynb`, `06_text2cypher.ipynb`를 바탕으로 정리했습니다.
> 벡터 검색은 수업 때 영화 데이터가 없는 DB에서 실행되어 결과가 비어 있었고, 그 부분과 Text2Cypher 전체는 **강사님 노트북의 실행 결과**입니다. LLM이 생성하는 Cypher는 실행마다 달라질 수 있습니다.

## 이 글에서 다루는 것

- 노드에 임베딩 저장하기: 벡터 인덱스와 `setNodeVectorProperty`
- `SEARCH` 절로 의미 기반 검색
- Text2Cypher 직접 구현: 스키마 + 질문 → Cypher
- `GraphCypherQAChain`: Cypher 생성 → 실행 → 답변
- 옵션: `top_k`, `return_intermediate_steps`, `return_direct`, `cypher_llm`/`qa_llm`
- 생성된 Cypher가 틀리는 경우

지난 글에서 영화 4,803편을 Movie·Person·Genre 그래프로 넣었다. 이 그래프에서 검색하는 방법은 두 갈래다.

| | 벡터 검색 | Text2Cypher |
|---|---|---|
| 질문 예 | "꿈속에서 벌어지는 심리 스릴러" | "톰 행크스가 출연한 평점 상위 3편" |
| 무엇으로 찾나 | 줄거리 임베딩의 유사도 | 레이블·관계·속성 조건 |
| 강점 | 표현이 달라도 의미가 비슷하면 찾음 | 정확한 조건, 관계 탐색, 집계 |
| 약점 | 관계·집계 불가 | 스키마에 없는 개념은 못 찾음 |

## 노드에 임베딩 저장하기

Neo4j의 기본 검색은 키워드 기반이다. 제목에 "Inception"이 있는 노드는 찾지만, "꿈속에서 벌어지는 심리 스릴러"로는 못 찾는다. 그래서 노드에 **임베딩 벡터를 속성으로** 저장하고 **벡터 인덱스**를 건다.

필요한 것은 세 가지다.

| 항목 | 이번 예제 |
|---|---|
| 임베딩할 텍스트 | 제목 + 태그라인 + 줄거리 |
| 임베딩 모델 | OpenAI `text-embedding-3-small` (1536차원). Neo4j는 벡터를 직접 만들지 않는다 |
| 벡터를 저장할 속성 | `Movie.content_embedding` |

### 벡터 인덱스

```cypher
CREATE VECTOR INDEX <인덱스명>
FOR (n:<레이블>) ON (n.<속성명>)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: <차원수>,
    `vector.similarity_function`: '<유사도함수>'   // 'cosine' 또는 'euclidean'
  }
}
```

`vector.dimensions`는 임베딩 모델의 출력 차원과 **반드시 같아야** 한다(`text-embedding-3-small` 1536, `-large` 3072). 벡터 인덱스는 ANN(Approximate Nearest Neighbor)으로 모든 노드와 비교하지 않고 가까운 벡터를 빠르게 찾는다. Qdrant에서 컬렉션을 만들 때 `VectorParams(size=1536, distance=COSINE)`를 준 것과 같은 일이다.

```python
##########################################################################################
# 벡터 인덱스 생성 - content_embedding 속성에 대한 Vector Index 생성
##########################################################################################
create_vector_index_query = """
CREATE VECTOR INDEX movie_content_embeddings IF NOT EXISTS 
FOR (m:Movie) ON m.content_embedding 
OPTIONS {
  indexConfig: {
    `vector.dimensions`: $size,
    `vector.similarity_function`: 'cosine'
  }
}
"""
graph.query(create_vector_index_query, params={"size":1536})
```

```python
# 벡터 인덱스 확인
vector_indexes = graph.query("SHOW VECTOR INDEXES")
for index in vector_indexes:
    # 벡터 인덱스 정보 출력
    print(f"Index Name: {index['name']}")
    print(f"Type: {index['type']}")    
    print(f"Property Key: {index['properties']}")
    print("-" * 40)
```

```text
Index Name: movie_content_embeddings
Type: VECTOR
Property Key: ['content_embedding']
----------------------------------------
```

`$size`처럼 쿼리에 파라미터를 쓰고 `params=`로 값을 넘겼다. 문자열 포맷팅으로 값을 끼워 넣는 것보다 안전하다(Cypher 인젝션 방지).

### 임베딩 만들어 저장하기

```python
#######################################################################################
# content_embedding 에 영화 제목과 줄거리, 태그라인을 결합하여 임베딩 생성 후 저장
#######################################################################################
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

movies_query = """
MATCH (m:Movie)
WHERE m.title IS NOT NULL
RETURN m.id AS id, m.title AS title, m.overview AS overview, m.tagline AS tagline
"""
movies = graph.query(movies_query) # list[dict]
```

강사님 노트북의 `movies[:3]`:

```text
[{'id': 'movie-4257', 'title': '#Horror',
  'overview': 'Inspired by actual events, a group of 12 year old girls face a night of horror ...',
  'tagline': 'Death is trending.'},
 {'id': 'movie-3339', 'title': '(500) Days of Summer', ...},
 {'id': 'movie-3556', 'title': '10 Cloverfield Lane', ...}]
```

100편씩 묶어 임베딩하고, `UNWIND`로 한 번에 저장한다.

```python
BATCH_SIZE = 100

##################################################
#  임베딩 생성 및 저장 (배치 처리)
##################################################
for i in range(0, len(movies), BATCH_SIZE):
    batch = movies[i:i+BATCH_SIZE]
    batch_texts = []
    batch_ids = []
    
    # 배치 데이터 준비
    for movie in batch:
        # title, overview, tagline을 "\n\n"으로 결합.
        content_text = f"{movie['title']}"
        if movie['tagline']:
            content_text += f"\n\n{movie['tagline']}"
        if movie['overview']:
            content_text += f"\n\n{movie['overview']}"
        
        if content_text.strip():
            batch_texts.append(content_text)
            batch_ids.append(movie['id'])
    
    try:
        if batch_texts:
            batch_embeddings = embeddings.embed_documents(batch_texts)
            
            # UNWIND를 사용한 배치 업데이트
            batch_data = [{"id": article_id, "embedding": embedding_vector} 
                         for article_id, embedding_vector in zip(batch_ids, batch_embeddings)]
            # list[dict[id:영화ID, embedding:EV]]
            # [dict, dict, dict, dict, .....]
            batch_update_query = """
            // UNWIND를 사용하여 배치 데이터를 개별 행으로 변환
            UNWIND $batch AS item

            // 영화 ID로 해당 Movie 노드 찾기
            MATCH (m:Movie {id: item.id})

            // db.create.setNodeVectorProperty 프로시저를 호출하여 벡터 속성 설정
            // 첫 번째 인자: 대상 노드, 두 번째 인자: 속성 이름, 세 번째 인자: 벡터 값
            CALL db.create.setNodeVectorProperty(m, 'content_embedding', item.embedding)

            // 업데이트된 노드 수 반환
            RETURN count(m) as updated
            """
            
            result = graph.query(batch_update_query, params={"batch": batch_data})
            print(f"배치 처리 완료: {i+1}~{min(i+len(batch_texts), len(movies))} / {len(movies)}, 업데이트됨: {result[0]['updated']}")
            
    except Exception as e:
        print(f"배치 임베딩 생성 실패 (배치 인덱스 {i}): {str(e)}")

print(f"영화 임베딩 업데이트 완료!! 총 {len(movies)}개 처리")
```

수업 때 실행한 결과는 이랬다.

```text
영화 임베딩 업데이트 완료!! 총 0개 처리
```

**0개.** 에러 없이 끝났지만 아무것도 하지 않았다. 원인은 연결된 DB다. 이 노트북은 환경변수의 `NEO4J_DATABASE=example`에 연결되어 있었는데, 영화 데이터는 강사님 실습처럼 `movie-info` DB에 넣어야 했다. `example` DB에는 Movie 노드가 없으니 `movies`가 빈 리스트였고, for문이 한 번도 돌지 않았다.

> **보충**: 이런 "조용한 실패"를 막으려면 무거운 작업 전에 대상이 있는지 확인한다. `assert len(movies) > 0, "Movie 노드가 없습니다. NEO4J_DATABASE를 확인하세요"` 한 줄이면 0개 처리로 넘어가지 않는다. Neo4j Desktop은 DB를 여러 개 만들 수 있어서, 노트북마다 어느 DB를 보고 있는지 헷갈리기 쉽다. 브라우저에서는 `:use DB이름`으로 DB를 바꾼다.

강사님 노트북의 결과다.

```text
배치 처리 완료: 1~100 / 4803, 업데이트됨: 100
배치 처리 완료: 101~200 / 4803, 업데이트됨: 100
...
배치 처리 완료: 4801~4803 / 4803, 업데이트됨: 3
영화 임베딩 업데이트 완료!! 총 4803개 처리
```

| 구문 | 역할 |
|---|---|
| `UNWIND $batch AS item` | 파이썬에서 넘긴 리스트를 한 행씩 펼친다. 100편을 쿼리 하나로 처리 |
| `db.create.setNodeVectorProperty(node, 속성명, 벡터)` | 벡터를 노드 속성으로 저장. 일반 `SET`보다 저장 공간 면에서 효율적인 형식으로 저장한다 |

## 의미 기반 검색: SEARCH 절

```cypher
[OPTIONAL] MATCH (조회할 노드)
SEARCH 노드 IN (
    VECTOR INDEX vector_index_name
    FOR embedding_vector      // query vector
    [WHERE 필터조건]           // 인덱스 안에서 속성 필터 (옵션)
    LIMIT 조회개수             // 필수: top_k
)
[SCORE AS 별칭]                // 유사도 점수 (옵션)
```

SEARCH는 독립된 절이 아니라 MATCH에 붙는 서브절이다. 예전에는 `CALL db.index.vector.queryNodes('인덱스', k, 벡터) YIELD node, score`를 썼는데 deprecated 됐다.

```python
def semantic_movie_search(search_text:str, top_k:int=5)-> list:
    """
    텍스트 쿼리를 받아 의미적으로 가장 유사한 영화를 반환합니다.
    """
    # 검색 텍스트의 임베딩 생성 (OpenAI API를 사용하여 텍스트를 벡터로 변환)
    query_embedding = embeddings.embed_query(search_text)
    
    # Neo4j 벡터 검색 쿼리 실행
    vector_search_query = """
    MATCH (m:Movie)

    SEARCH m IN (
        VECTOR INDEX movie_content_embeddings
        FOR $query_embedding
        LIMIT $top_k
    )
    SCORE AS similarity
    
    RETURN m.title AS title,
           m.released AS released,
           m.rating AS rating,
           similarity
    
    ORDER BY similarity DESC;
    """

    results = graph.query(
        vector_search_query,
        params={"top_k": top_k, "query_embedding": query_embedding}
    )
    
    return results
```

```python
from pprint import pprint

# 임베딩 기반 의미 검색
# query = "a Drama movie about artificial intelligence and reality"
query = "인공지능과 현실에 관한 SF 영화"
# query = "두 남녀의 아름다운 사랑을 그린 영화"
results = semantic_movie_search(query)
for result in results:

    pprint(f"{result['title']} - 유사도: {result['similarity']:.4f}, " +
          f"평점: {result['rating']}, 개봉: {result['released']}")
```

DB에 영화가 없어서 이 셀은 아무것도 출력하지 않았다. 강사님 노트북은 세 번째 질문("두 남녀의 아름다운 사랑을 그린 영화")으로 실행했다.

```text
Endless Love - 유사도: 0.7217, 평점: 6.7, 개봉: 2014-02-12T00:00:00.000000000
Crazy/Beautiful - 유사도: 0.7180, 평점: 6.6, 개봉: 2001-06-29T00:00:00.000000000
The Incredibly True Adventure of Two Girls In Love - 유사도: 0.7104, 평점: 5.7, 개봉: 1995-06-16T00:00:00.000000000
All the Real Girls - 유사도: 0.7038, 평점: 5.9, 개봉: 2003-08-01T00:00:00.000000000
Bandits - 유사도: 0.7007, 평점: 6.2, 개봉: 2001-10-12T00:00:00.000000000
```

한국어 질문으로 영어 줄거리의 로맨스 영화를 찾았다. 임베딩 모델이 다국어를 같은 공간에 놓기 때문이다. 다만 "두 남녀"라고 했는데 3위는 두 여성의 사랑 이야기다. "사랑"이라는 의미에 끌려간 것이다. 벡터 검색은 이런 **조건**(성별, 연도, 평점)을 정확히 지키지 못한다. 연도 같은 조건은 SEARCH 안의 `WHERE m.released >= 2000`처럼 속성 필터로 걸어야 한다.

이 그래프에서 벡터 검색의 장점은 **찾은 노드에서 바로 관계를 따라갈 수 있다**는 것이다. 찾은 영화의 감독이나 출연 배우를 같은 쿼리에서 `MATCH (m)<-[:DIRECTED]-(d:Person)`으로 이어 붙이면 된다. Qdrant였다면 검색 결과를 받아 다른 DB에 다시 물어야 하는 일이다.

## Text2Cypher

**Text2Cypher는 자연어 질문을 Cypher로 바꿔 그래프를 검색하는 기술**이다. 지난 글의 모델링에서 "LLM은 스키마만 보고 Cypher를 쓴다"고 했던 그 과정이다.

### 직접 구현

```python
################
#  직접 구현
################

graph.refresh_schema() # 디비 스키마를 다시 읽어온다.
schema = graph.schema  # str
print(schema)
vector_index = graph.query("SHOW VECTOR INDEXES")
print(vector_index)
```

```text
Node properties:
Movie {id: STRING, title: STRING, rating: FLOAT, released: LOCAL_DATE_TIME, overview: STRING, runtime: INTEGER, tagline: STRING}
Person {id: STRING, name: STRING}
Genre {id: STRING, name: STRING}
Relationship properties:

The relationships:
(:Movie)-[:IN_GENRE]->(:Genre)
(:Person)-[:ACTED_IN]->(:Movie)
(:Person)-[:DIRECTED]->(:Movie)
[]
```

`released`가 `LOCAL_DATE_TIME`이다. pandas Timestamp를 그대로 넣었기 때문인데, 이 타입이 뒤에서 날짜 비교 쿼리에 영향을 준다. `add_graph_documents`가 넣은 `id`가 Person과 Genre에도 속성으로 들어간 것도 보인다.

```python
model = ChatOpenAI(model="gpt-5.4-mini")
prompt_template = PromptTemplate(
    template="""
<instruction>
다음 그래프 스키마를 참고해서 질문에 맞는 cypher 쿼리를 작성하세요.
</instruction>

<input_data>
    <schema>{schema}</schema>
    <question>{query}</question>
</input_data>

<constraint>
- 질문과 schema 가 맞지 않으면 vector-index를 참고해서 vector 검색쿼리를 생성한다.
- 생성한 쿼리만 문자열로 반환한다. 설명과 같은 다른 어떠한 것도 추가로 작성하지 않는다.
- 만약 감독의 이름, 영화제목, 배우이름이 쿼리문에 들어갈 경우 영어로 바꿔서 입력한다.
</constraint>
"""
)

query_chain = prompt_template | model | StrOutputParser()

def text_to_query(question: str, schema: str) -> str:
    """자연어 질의를 cypher query로 변환하는 함수"""
    return query_chain.invoke({"schema":schema, "query":question})
```

"톰 행크스"를 "Tom Hanks"로 바꾸라는 규칙이 중요하다. 데이터가 영어인데 한국어 이름으로 `{name: '톰 행크스'}`를 찾으면 결과가 비어 있다.

> **보충**: 규칙 첫 줄은 "vector-index를 참고하라"인데, 프롬프트에 vector index 정보를 넣는 자리가 없다. 위에서 `vector_index`를 조회해 출력만 하고 체인에 넘기지 않았다(게다가 이 DB에서는 `[]`였다). LLM은 벡터 인덱스 이름도 쿼리 임베딩도 모르므로 벡터 검색 쿼리를 만들 수 없고, 이 규칙은 동작하지 않는다.

```python
query = "톰 행크스가 출연한 영화는?"
query = "톰 행크스가 출연한 영화들의 감독들은 누구인가요?"
# query = "2차 세계대전을 배경으로 치열한 전투를 보여주는 영화의 제목과 그 영화 감독, 배우를 알려줘."

cypher_query = text_to_query(query, schema)
print(cypher_query)

print("생성된 쿼리로 조회")
resp = graph.query(cypher_query)
print("-------------조회결과--------------------")
pprint(resp)
```

저장된 출력은 주석 처리된 세 번째 질문("2차 세계대전을 배경으로...")으로 실행했을 때의 것이다.

```text
MATCH (m:Movie)-[:IN_GENRE]->(g:Genre)
WHERE toLower(m.overview) CONTAINS 'world war ii' OR toLower(m.overview) CONTAINS 'world war 2' OR toLower(m.overview) CONTAINS 'battle' OR toLower(m.tagline) CONTAINS 'world war ii' OR toLower(g.name) CONTAINS 'war'
MATCH (d:Person)-[:DIRECTED]->(m)
MATCH (a:Person)-[:ACTED_IN]->(m)
RETURN m.title AS movie_title, d.name AS director_name, collect(DISTINCT a.name) AS actor_names
생성된 쿼리로 조회
-------------조회결과--------------------
[{'actor_names': ['Robert Taylor', 'Deborah Kerr', 'Leo Genn', 'Peter Ustinov', 'Patricia Laffan'],
  'director_name': 'Mervyn LeRoy',
  'movie_title': 'Quo Vadis'},
 {'actor_names': ['Robert Taylor', 'Deborah Kerr', ...],
  'director_name': 'Anthony Mann',
  'movie_title': 'Quo Vadis'},
 {'actor_names': ['Toshirō Mifune', 'Takashi Shimura', ...],
  'director_name': 'Akira Kurosawa',
  'movie_title': 'Seven Samurai'},
 ...]
```

쿼리는 문법적으로 맞고 실행도 됐지만 **답은 틀렸다.**

- 첫 결과가 고대 로마 배경의 Quo Vadis, 두 번째가 일본 전국시대의 Seven Samurai다. 조건이 `OR`로 묶여서 줄거리에 "battle"이 있거나 장르 이름에 "war"가 들어가기만 하면 걸렸다. 결과는 316행이고, 그중에는 *Wreck-It Ralph*, *Ice Age: Continental Drift*, *The Notebook* 같은 영화도 섞여 있다.
- Quo Vadis가 두 번 나온 건 감독이 둘이라서다. `d.name`이 그룹 기준이 되어 감독마다 한 행씩 나왔다(지난 글의 암묵적 GROUP BY).

"2차 세계대전을 배경으로"라는 조건은 스키마에 없는 **의미**다. 장르는 `War`까지만 있고 어느 전쟁인지는 줄거리 텍스트에만 있다. 이런 질문은 Text2Cypher보다 앞의 **벡터 검색**이 맞다. 이 둘을 질문에 따라 골라 쓰게 하는 것이 다음 글의 Agent다.

## GraphCypherQAChain

직접 구현은 Cypher를 만들고 실행하는 데서 끝났다. `GraphCypherQAChain`은 조회 결과를 다시 LLM에 넣어 **자연어 답변**까지 만든다.

```text
사용자 자연어 질문
    ↓ [1단계 LLM] 그래프 스키마 참고
Cypher 쿼리 생성
    ↓ Neo4j 실행
쿼리 결과 (컨텍스트)
    ↓ [2단계 LLM] 컨텍스트 + 원래 질문
최종 자연어 답변
```

`from_llm()` 클래스 메서드로 만든다.

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| `graph` | (필수) | `Neo4jGraph` 객체 |
| `allow_dangerous_requests` | (필수) | `True`를 명시해야 생성된다. LLM이 만든 쿼리가 DB를 바꿀 수 있다는 위험에 동의한다는 뜻 |
| `llm` | `None` | Cypher 생성과 답변 생성에 같은 LLM |
| `cypher_llm`, `qa_llm` | `None` | 단계별로 다른 LLM |
| `cypher_prompt`, `qa_prompt` | 기본 프롬프트 | 단계별 프롬프트 교체 |
| `top_k` | `10` | 조회 결과 중 LLM에 넘길 최대 행 수 |
| `return_intermediate_steps` | `False` | 생성된 Cypher와 조회 결과를 함께 반환 |
| `return_direct` | `False` | 답변 단계를 건너뛰고 조회 결과를 그대로 반환 |
| `validate_cypher` | `False` | 관계 방향 오류 등을 자동 교정 |
| `verbose` | `False` | 생성된 Cypher, 컨텍스트 출력 |

### 기본 프롬프트 확인과 수정

```python
# GraphCypherQAChain 이 사용하는 프롬프트 조회
from langchain_neo4j.chains.graph_qa.cypher import (
    CYPHER_GENERATION_PROMPT,   # 기본 Cypher 생성 프롬프트: 자연어 -> cypher 쿼리 생성 프롬프트
    CYPHER_QA_PROMPT,           # 기본 QA 프롬프트 : cypher 결과 -> 자연어로 변환시 사용할 프롬프트
)
print(CYPHER_GENERATION_PROMPT.template)
print("="*50)
print(CYPHER_QA_PROMPT.template)
```

```text
Task:Generate Cypher statement to query a graph database.
Instructions:
Use only the provided relationship types and properties in the schema.
Do not use any other relationship types or properties that are not provided.
Schema:
{schema}
Note: Do not include any explanations or apologies in your responses.
...
The question is:
{question}
==================================================
You are an assistant that helps to form nice and human understandable answers.
The information part contains the provided information that you must use to construct an answer.
The provided information is authoritative, you must never doubt it or try to use your internal knowledge to correct it.
...
If the provided information is empty, say that you don't know the answer.
Information:
{context}

Question: {question}
Helpful Answer:
```

QA 프롬프트의 "provided information is authoritative, never doubt it"과 "비어 있으면 모른다고 하라"가 RAG의 기본 원칙 그대로다. 조회 결과가 틀려도 LLM은 그것을 믿고 답한다는 뜻이기도 하다.

기본 프롬프트에 규칙을 덧붙여 커스텀 프롬프트를 만든다.

```python
################################################
# 사용자 정의 프롬프트 생성 
# - 기존 프롬프트를 수정하는 방식으로 만든다.
################################################
custom_prompt_str = CYPHER_GENERATION_PROMPT.template+\
"""
<constraint>
- When filtering by date, convert the data to the `date` type for processing.
- 사람이름, 영화제목 등은 쿼리를 생성할 때 영문으로 입력한다.
</constraint>
"""

custom_cypher_template = PromptTemplate(template=custom_prompt_str)
```

날짜 규칙은 `released`가 `LOCAL_DATE_TIME`이라서 넣었다. 날짜 문자열과 바로 비교하면 타입이 달라 결과가 비거나 에러가 난다.

```python
#################################
# CypherChain생성
#################################
from langchain_openai import ChatOpenAI
from langchain_neo4j import GraphCypherQAChain

llm = ChatOpenAI(model="gpt-5.4-mini", temperature=0.0)

cypher_chain = GraphCypherQAChain.from_llm(
    llm=llm, 
    graph=graph, 
    allow_dangerous_requests=True,
    # verbose=True,
    cypher_prompt=custom_cypher_template # PromptTemplate (cypher 쿼리 생성시 사용.)
)
print(cypher_chain.input_key,"/", cypher_chain.output_key)
```

```text
query / result
```

입력은 `{"query": 질문}`, 출력은 `{"query":..., "result": 답변}`이다.

### 실행

```python
answer = cypher_chain.invoke({"query": "영화 'Apollo 13'에 대한 정보를 알려주세요."})
pprint(answer['result'])
```

```text
('Apollo 13는 1995년 6월 30일에 개봉한 드라마 영화입니다. 평점은 7.3이고, 러닝타임은 140분입니다. 태그라인은 '
 '"Houston, we have a problem."이며, 배우는 Kevin Bacon, Ed Harris, Tom Hanks, Bill '
 'Paxton, Gary Sinise가 출연했고, 감독은 Ron Howard입니다. 영화는 1971년 아폴로 13호 달 탐사 임무에서 '
 '발생한 기술적 문제와 이를 해결하려는 승무원과 지상팀의 이야기를 다룹니다.')
```

영화 속성뿐 아니라 배우, 감독, 장르까지 관계를 따라가 모은 답이다.

> **보충**: 답변의 "1971년 아폴로 13호"는 틀렸다. 아폴로 13호는 1970년 4월 임무다. 원본 CSV를 확인해 보면 줄거리 자체가 "...the Apollo 13 lunar mission in 1971..."로 되어 있다. 답변 LLM은 QA 프롬프트의 "주어진 정보를 의심하지 말라"는 지시대로 **데이터의 오류를 그대로 옮겼다.** 이런 경우 원인이 쿼리인지, 데이터인지, 답변 LLM인지를 가르려면 아래의 `return_intermediate_steps`로 컨텍스트를 봐야 한다.

여러 단계 관계를 따라가는 질문도 처리한다. `verbose=True`로 만든 체인의 출력이다.

```python
answer = cypher_chain.invoke({"query":"Apollo 13에 출연한 배우이름과 그들이 출연한 다른 영화들을 조회해 주세요."})
```

```text
> Entering new GraphCypherQAChain chain...
Generated Cypher:
MATCH (p:Person)-[:ACTED_IN]->(m:Movie {title: 'Apollo 13'})
MATCH (p)-[:ACTED_IN]->(other:Movie)
WHERE other.title <> 'Apollo 13'
RETURN p.name AS actorName, collect(DISTINCT other.title) AS otherMovies
Full Context:
[{'actorName': 'Kevin Bacon', 'otherMovies': ['Diner', 'Footloose', 'Tremors', 'Flatliners', 'JFK', ...]}, ...]
```

```text
Kevin Bacon: Diner, Footloose, Tremors, Flatliners, JFK, A Few Good Men, The River Wild, ...
Ed Harris: The Right Stuff, The Abyss, Glengarry Glen Ross, The Firm, Nixon, ...
Tom Hanks: Splash, Big, A League of Their Own, Philadelphia, Forrest Gump, Toy Story, ...
Bill Paxton: Tombstone, True Lies, Twister, A Simple Plan, ...
Gary Sinise: Forrest Gump, Albino Alligator, Ransom, Snake Eyes, ...
```

"Apollo 13 → 배우 → 그 배우의 다른 영화"라는 2단계 탐색이다. Vector RAG로는 답하기 어려운, 이 묶음의 첫 글에서 말한 **관계 기반 질문**이 바로 이런 것이다.

```python
answer = cypher_chain.invoke({"query": "'Tom Hanks'가 출연한, 평점이 가장 높은 영화 3개는 무엇인가요? 영화제목과 평점을 알려주세요."})
```

```text
Generated Cypher:
MATCH (p:Person {name: 'Tom Hanks'})-[:ACTED_IN]->(m:Movie)
RETURN m.title AS title, m.rating AS rating
ORDER BY m.rating DESC
LIMIT 3
Full Context:
[{'title': 'Forrest Gump', 'rating': 8.2}, {'title': 'The Green Mile', 'rating': 8.2}, {'title': 'Saving Private Ryan', 'rating': 7.9}]

'Forrest Gump (8.2), The Green Mile (8.2), Saving Private Ryan (7.9)'
```

날짜 조건이 있는 질문에서 커스텀 규칙이 쓰였다.

```python
answer = cypher_chain.invoke({"query": "2000년 이후 개봉한 'Drama' 장르 영화 중 평점이 높은 순서로 5개를 영화제목, 개봉일자, 평점항목을 알려주세요."})
```

```text
Generated Cypher:
MATCH (m:Movie)-[:IN_GENRE]->(g:Genre)
WHERE g.name = 'Drama'
  AND date(m.released) > date('2000-01-01')
RETURN m.title AS 영화제목, m.released AS 개봉일자, m.rating AS 평점항목
ORDER BY m.rating DESC
LIMIT 5

('Me You and Five Bucks, 2015-07-07T00:00:00, 10.0; Whiplash, '
 '2014-10-10T00:00:00, 8.3; The Visual Bible: The Gospel of John, '
 '2003-09-11T00:00:00, 8.2; The Dark Knight, 2008-07-16T00:00:00, 8.2; Guten '
 'Tag, Ramón, 2013-10-18T00:00:00, 8.1.')
```

`date(m.released)`로 변환해서 비교했다. 쿼리는 맞지만 1위가 평점 10.0의 *Me You and Five Bucks*다. 평가 수가 아주 적은 영화일 가능성이 높다. 이 데이터에는 평가 수(vote count)가 없어서 걸러 낼 수 없다. Text2Cypher의 답은 **스키마와 데이터 품질을 넘을 수 없다.**

### 옵션

**`top_k`**: LLM에 넘길 조회 결과 행 수.

```python
cypher_chain = GraphCypherQAChain.from_llm(
    llm=llm,
    graph=graph, 
    allow_dangerous_requests=True,
    verbose=True,
    
    top_k=5,                         # 최대 5개의 결과만 반환
)

answer = cypher_chain.invoke({"query": "'Tom Hanks' 배우가 출연한 영화를 모두 알려주세요."})
pprint(answer['result'])
```

```text
Generated Cypher:
MATCH (p:Person {name: 'Tom Hanks'})-[:ACTED_IN]->(m:Movie)
RETURN m.title AS title, m.id AS id, m.released AS released, m.rating AS rating, m.runtime AS runtime, m.tagline AS tagline, m.overview AS overview
Full Context:
[{'title': 'Splash', ...}, {'title': 'Big', ...}, {'title': 'A League of Their Own', ...}, {'title': 'Philadelphia', ...}, {'title': 'Forrest Gump', ...}]

'Splash, Big, Philadelphia, Forrest Gump에 출연했습니다.'
```

"**모두**" 알려 달라고 했는데 다섯 편만 컨텍스트로 넘어갔고, 답변은 그중 *A League of Their Own*까지 빠뜨려 네 편만 말했다. 앞의 "Apollo 13 배우들의 다른 영화" 결과에서 톰 행크스는 20편 넘게 나왔다. `top_k`는 **조용히 자르기** 때문에, 사용자는 답이 잘린 줄 모른다. 반대로 Cypher가 overview 같은 긴 속성까지 다 가져오면 컨텍스트가 커지니 `top_k`는 토큰 비용을 지키는 장치이기도 하다.

**`return_intermediate_steps=True`**: 생성된 Cypher와 조회 결과를 함께 받는다.

```python
answer = cypher_chain.invoke({"query": "평점이 8점 이상인 'Action' 장르 영화는 무엇이 있나요?"})
answer.keys()
```

```text
dict_keys(['query', 'result', 'intermediate_steps'])
```

```python
answer['intermediate_steps']
```

```text
[{'query': "MATCH (m:Movie)-[:IN_GENRE]->(g:Genre)\nWHERE g.name = 'Action' AND m.rating >= 8\nRETURN m.title AS title, ..."},
 {'context': [{'title': 'Scarface', 'rating': 8.0, ...},
   {'title': 'The Lord of the Rings: The Fellowship of the Ring', 'rating': 8.0, ...},
   ...]}]
```

답이 이상할 때 **쿼리가 틀렸는지, 데이터가 없는지, 답변 LLM이 틀렸는지**를 가르는 데 꼭 필요하다.

**`return_direct=True`**: 답변 단계를 건너뛰고 조회 결과를 그대로 반환한다.

```python
cypher_chain = GraphCypherQAChain.from_llm(
    llm=llm,
    graph=graph, 
    allow_dangerous_requests=True,
    verbose=True,
    return_direct=True   # LLM 답변 생성 단계 건너뛰기
    , cypher_prompt=custom_cypher_template
)

answer = cypher_chain.invoke({"query": "톰 행크스와 레오나르도 디카프리오가 같이 출연한 영화를 찾아주세요."})
for k, v in answer.items():
    print(f"{k}: {v}")
```

```text
Generated Cypher:
MATCH (p1:Person)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(p2:Person)
WHERE p1.name = "Tom Hanks" AND p2.name = "Leonardo DiCaprio"
RETURN DISTINCT m.title AS title

query: 톰 행크스와 레오나르도 디카프리오가 같이 출연한 영화를 찾아주세요.
result: [{'title': 'Catch Me If You Can'}]
```

한국어 이름을 커스텀 규칙대로 영어로 바꿨다. 결과가 `list[dict]`라 `pd.DataFrame`으로 바로 바꿀 수 있다. 화면에 표로 보여 주거나 다른 처리를 할 때 쓴다.

**`cypher_llm` / `qa_llm` 분리**: 단계별로 다른 모델을 쓴다.

```python
cypher_llm = ChatOpenAI(model="gpt-5.4-mini", temperature=0.0)
qa_llm = ChatOpenAI(model="gpt-5.5", temperature=0.0)

cypher_chain = GraphCypherQAChain.from_llm(
    cypher_llm=cypher_llm,  # Cypher 쿼리 생성용 LLM
    qa_llm=qa_llm,          # 최종 답변 생성용 LLM
    
    graph=graph, 
    allow_dangerous_requests=True,
    verbose=True,
)

answer = cypher_chain.invoke({"query": "배우 'Leonardo DiCaprio'와 감독 'Christopher Nolan'이 함께 작업한 영화가 있나요?"})
```

```text
Generated Cypher:
MATCH (a:Person {name: 'Leonardo DiCaprio'})-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person {name: 'Christopher Nolan'})
RETURN DISTINCT m.title AS title, m.id AS id
Full Context:
[{'title': 'Inception', 'id': 'movie-96'}]

result: 네, 배우 Leonardo DiCaprio와 감독 Christopher Nolan이 함께 작업한 영화는 **Inception**입니다.
```

ACTED_IN과 DIRECTED를 한 영화 노드에서 만나게 하는 패턴을 정확히 만들었다.

> **보충**: 수업 노트북은 Cypher 생성에 작은 모델, 답변에 큰 모델을 썼다. 실무에서는 반대로 하는 경우도 많다. Cypher 생성은 스키마를 정확히 지키는 추론이 필요한 어려운 단계이고, 답변은 조회 결과를 문장으로 옮기는 쉬운 단계이기 때문이다. 앞의 2차 세계대전 쿼리처럼 틀린 Cypher는 좋은 답변 모델로도 고칠 수 없다.

## 정리

| 방식 | 언제 | 주의 |
|---|---|---|
| 벡터 검색 (`SEARCH ... VECTOR INDEX`) | 의미·분위기·줄거리로 찾을 때 | 조건(성별, 연도)을 정확히 못 지킨다. 속성 조건은 WHERE 필터로 |
| Text2Cypher 직접 구현 | 쿼리 생성만 필요할 때, 흐름 이해 | 실행 전에 쿼리를 검증할 장치가 없다 |
| `GraphCypherQAChain` | 질문 → 답변까지 한 번에 | `top_k`가 조용히 자른다. 디버깅은 `return_intermediate_steps` |

- 벡터 인덱스 차원 = 임베딩 모델 차원. 쿼리 값은 `params=`로 넘긴다.
- 무거운 작업 전에 **연결된 DB에 데이터가 있는지** 확인한다. 0개 처리는 에러가 아니다.
- Text2Cypher의 답은 스키마와 데이터를 넘지 못한다. 스키마에 없는 의미("2차 세계대전")는 벡터 검색으로.
- 데이터가 영어면 이름을 영어로 바꾸라는 규칙, 날짜 타입 규칙처럼 **스키마의 특성을 프롬프트에 알려 준다.**

다음 글에서는 벡터 검색과 Text2Cypher를 tool로 만들어, 질문에 따라 Agent가 골라 쓰게 한다.
