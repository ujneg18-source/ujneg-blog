---
title: "GraphRAG Agent: 벡터 DB와 그래프 DB를 도구로"
description: "Qdrant의 올림픽 문서 검색과 Neo4j의 영화 GraphCypherQAChain을 각각 tool로 만들어 create_agent에 붙이고, 질문에 따라 Agent가 도구를 골라 쓰거나 조합하는 과정을 확인합니다. 연결된 DB 스키마가 달라 도구가 '모르겠다'를 돌려줄 때 Agent가 자기 지식으로 답해 버리는 문제와 그 대책까지 정리합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'GraphRAG'
seriesOrder: 6
originalNotebook: "GraphRAG/07_Agent.ipynb"
tags: ["LLM","GraphRAG"]
date: 2026-07-14T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-graphrag-agent.webp'
---

> SKN31 AI Agent 과정 노트북 `GraphRAG/07_Agent.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과이고, 놀란 감독 질의와 두 도구를 함께 쓴 실행은 **강사님 노트북의 실행 결과**입니다. LLM 출력은 실행마다 달라집니다.

## 이 글에서 다루는 것

- Qdrant retriever를 tool로: 올림픽 정보 검색
- `GraphCypherQAChain`을 tool로: 영화 정보 검색
- `create_agent`로 두 도구를 쓰는 Agent 만들기
- 도구가 빈손으로 돌아왔을 때 Agent가 하는 일
- 두 도구를 조합하는 질문

LangChain 기초부터 RAG·Agent까지 만든 것들이 이 글에서 합쳐진다. RAG 글들의 Qdrant 올림픽 컬렉션, Agent 글의 `create_retriever_tool`과 `@tool`, `create_agent`, 그리고 GraphRAG 묶음의 Text2Cypher다.

| 도구 | 저장소 | 검색 방식 | 맡는 질문 |
|---|---|---|---|
| `search_olympic_info` | Qdrant (`olympic_info_wiki`) | 벡터 유사도 | 올림픽 문서 내용 |
| `search_movie_info_tool` | Neo4j (영화 그래프) | Text2Cypher | 영화·배우·감독 관계, 집계 |

## 올림픽 검색 도구 (Qdrant)

[RAG 평가 글](/notes/llm/llm-rag-evaluation)까지 쓰던 올림픽 위키 컬렉션이다.

```python
from langchain_qdrant import QdrantVectorStore
from langchain_openai import OpenAIEmbeddings

from qdrant_client import QdrantClient

from dotenv import load_dotenv

load_dotenv(override=True)
```

```python
################################################
# QDrant olympic-wiki Collectio 연동 tool
################################################
from langchain_core.tools.retriever import create_retriever_tool

COLLECTION_NAME = "olympic_info_wiki"
VECTOR_SIZE = 3072

client = QdrantClient(url="http://localhost:6333")

embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

vectorstore = QdrantVectorStore(
    client=client,
    embedding=embeddings, 
    collection_name=COLLECTION_NAME 
    # ,vector_name="dense"
)

# VectorStore 를 Retriever로 변환
retriever = vectorstore.as_retriever(
    search_kwargs={"k": 7}
)

# Tool로 변환 
search_olympic_info_tool = create_retriever_tool(
    retriever=retriever,
    name="search_olympic_info",
    description="VectorDB의 Olympic 정보를 유사도 검색을 통해 조회하는 도구"
)
```

컬렉션을 3072차원(`text-embedding-3-large`)으로 만들었으므로 검색할 때도 같은 모델을 써야 한다. 다른 모델로 질문을 임베딩하면 차원이 달라 에러가 나거나, 차원이 같더라도 엉뚱한 결과가 나온다.

## 영화 검색 도구 (Neo4j)

지난 글의 `GraphCypherQAChain`을 그대로 쓰고, 이름을 영어로 바꾸는 규칙을 예시와 함께 넣었다.

```python
#####################################################################
# 영화 정보를 제공하는 GraphDB 연동 RAG tool
#####################################################################
from langchain_core.tools import tool
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_neo4j import GraphCypherQAChain
from langchain_neo4j import Neo4jGraph
from langchain_neo4j.chains.graph_qa.cypher import CYPHER_GENERATION_PROMPT

# cypher search 쿼리를 실행하지 못한다.
custom_prompt_str = CYPHER_GENERATION_PROMPT.template+\
"""
<constraint>
- 검색조건이 영화제목, 감독이나 배우이름일 경우 입력값을 영어로 변경해서 검색한다. (예: "영화 '인셉션'의 감독과 개봉일을 알려줘." ->" 영화 'Inception'의 감독과 개봉일을 알려줘.")
- Cypher 쿼리는 NEO4J 5.0 문법에 맞게 작성한다.
</constraint>
"""

graph = Neo4jGraph()
prompt_template = PromptTemplate(template=custom_prompt_str)
cypher_chain = GraphCypherQAChain.from_llm(
    llm=ChatOpenAI(model="gpt-5.5", temperature=0.0), 
    graph=graph, 
    allow_dangerous_requests=True,
    verbose=True,
    cypher_prompt=prompt_template
)
```

첫 줄 주석 "cypher search 쿼리를 실행하지 못한다"는 지난 글에서 본 한계다. 이 체인은 벡터 인덱스를 쓰는 `SEARCH` 쿼리를 만들지 못한다. 스키마 문자열에 벡터 인덱스 정보가 없기 때문이다.

체인만 먼저 확인한다. 강사님 노트북의 결과다.

```python
query = "크리스토퍼 놀란의 영화에 가장 많이 출연한 배우는 누구인가?"
cypher_chain.invoke({"query": query})
```

```text
> Entering new GraphCypherQAChain chain...
Generated Cypher:
MATCH (d:Person {name: 'Christopher Nolan'})-[:DIRECTED]->(m:Movie)<-[:ACTED_IN]-(a:Person)
RETURN a.name AS actor, count(m) AS appearances
ORDER BY appearances DESC
LIMIT 1;
Full Context:
[{'actor': 'Michael Caine', 'appearances': 5}]

> Finished chain.

{'query': '크리스토퍼 놀란의 영화에 가장 많이 출연한 배우는 누구인가?',
 'result': '크리스토퍼 놀란의 영화에 가장 많이 출연한 배우는 Michael Caine이며, 총 5번 출연했습니다.'}
```

"감독 → 영화 ← 배우"를 한 패턴으로 잇고 배우별로 집계했다. 벡터 검색으로는 나올 수 없는 종류의 답이다.

> **보충**: `LIMIT 1`은 공동 1위를 지운다. 출연 횟수가 같은 배우가 여럿이면 그중 하나만 나온다. "가장 많이"를 묻는 질문에는 `WITH max(appearances) AS top ... WHERE appearances = top` 처럼 동률을 모두 돌려주는 쿼리가 더 정확하다. LLM이 만든 쿼리가 맞아 보일수록 이런 경계 조건을 놓치기 쉽다.

체인을 `@tool`로 감싼다.

```python
#################################
# TOOL 로 변환
#################################
@tool
def search_movie_info_tool(query: str) -> str:
    """NEO4J 에서 영화 정보를 검색하는 데 사용하는 도구입니다. 그래프 데이터베이스에 저장된 엔티티 간 관계, 구조적 질의(예: 'A와 연결된 B는?', '몇 개의 관계가 있는가')에 답할 때 사용하세요"""
    response = cypher_chain.invoke({"query": query})
    return response["result"]
```

docstring이 Agent가 이 도구를 고르는 근거다. "엔티티 간 관계", "구조적 질의"라고 써서 올림픽 문서 검색과 역할을 나눴다. 반환은 체인의 최종 답변 문자열이다.

## Agent 만들기

```python
######################################################
# Agent 생성 
# llm + search_movie_info, search_olympic_info_tool 
######################################################
from langchain.agents import create_agent

agent = create_agent(
    model=ChatOpenAI(model="gpt-5.5"),
    tools=[search_movie_info_tool], #search_olympic_info_tool],
    system_prompt="""올림픽와 영화정보를 친절히 설명하는 유능한 Agent입니다. 
영화정보 검색을 위한 search_movie_info, 올림픽관련 정보를 검색하기 위한 search_olympic_info_tool 두개의 tool을 사용할 수 있습니다."""
)

# neo4j에서도 유사도를 얻고 싶을 때, 유사도 툴을 하나더 만들어서 하면 됌
```

수업 때는 올림픽 도구를 주석 처리하고 영화 도구 하나만 붙였다. 그런데 system prompt는 그대로 "두 개의 tool을 사용할 수 있다"고 말한다. 프롬프트와 실제 바인딩된 도구가 어긋난 상태다(tool 이름도 실제는 `search_movie_info_tool`, `search_olympic_info`라 프롬프트와 다르다). [Agent 글](/notes/llm/llm-agent-toolcalling)에서 본 것처럼 프롬프트에는 `tool.name`을 그대로 넣는 편이 안전하다.

### 도구가 빈손으로 돌아오면

```python
# query = "톰 크루즈와 같은 영화에 출연한 배우들은 누가 있나?"
# query = "런던 올림픽이 개최된 년도와 그때 개봉한 영화는 뭐가 있나?"
query = "2차 세계대전을 배경으로 한 영화들을 추천해줘."

res = agent.invoke(
    {"messages": [{"role": "user", "content": query}]},
)
```

```text
> Entering new GraphCypherQAChain chain...
Generated Cypher:
MATCH (p:Person)-[l:LIKES]->(i:Interest)
WHERE toLower(i.name) CONTAINS 'world war ii'
   OR toLower(i.name) CONTAINS 'wwii'
   OR toLower(i.name) CONTAINS 'second world war'
RETURN i.name AS title,
       avg(l.rating) AS averageRating,
       count(p) AS likedByCount
ORDER BY averageRating DESC, likedByCount DESC;
Full Context:
[]

> Finished chain.
```

생성된 Cypher에 Movie가 없다. `Person -[LIKES]-> Interest`는 [Cypher 심화 글](/notes/llm/llm-cypher-advanced)의 **소셜 네트워크 스키마**다. 이 노트북도 `NEO4J_DATABASE=example`에 연결되어 있었고, 그 DB에는 영화가 아니라 사람·관심사 데이터가 들어 있었다. LLM은 스키마만 보고 쿼리를 쓰니, 받은 스키마 안에서 "영화"에 가장 가까운 Interest를 골랐다. 결과는 빈 리스트다.

```python
res['messages']
```

```text
[HumanMessage(content='2차 세계대전을 배경으로 한 영화들을 추천해줘.', ...),
 AIMessage(content='', ... tool_calls ...),
 ToolMessage(content='잘 모르겠습니다.', name='search_movie_info_tool', ...),
 AIMessage(content='물론입니다. 영화 DB 검색에서는 관련 결과가 잘 나오지 않았지만, ...')]
```

QA 프롬프트의 "정보가 비어 있으면 모른다고 하라"대로 도구는 **"잘 모르겠습니다."** 를 돌려줬다. 여기까지는 정직하다. 문제는 그다음이다.

```python
print(res['messages'][-1].content)
```

```text
물론입니다. 영화 DB 검색에서는 관련 결과가 잘 나오지 않았지만, 일반적으로 평가가 좋고 많이 추천되는 **2차 세계대전 배경 영화**들을 장르별로 골라드릴게요.

## 전쟁의 참혹함을 강하게 보여주는 영화

### 1. **라이언 일병 구하기**  
- 감독: 스티븐 스필버그  
- 배경: 노르망디 상륙작전 이후  
...
### 4. **덩케르크**  
- 감독: 크리스토퍼 놀란  
- 배경: 덩케르크 철수 작전  
...
### 6. **다키스트 아워**  
- 주연: 게리 올드만  
...
### 10. **조조 래빗**  
- 감독: 타이카 와이티티  
...
```

Agent는 도구의 "모르겠다"를 받고도 멈추지 않고 **자기 학습 지식으로 열 편을 추천**했다. 첫 줄에서 "DB 검색에서는 결과가 잘 나오지 않았지만"이라고 밝힌 점은 낫지만, 사용자 입장에서는 어디까지가 DB 근거이고 어디부터 모델 기억인지 구분하기 어렵다. 추천 목록 중 *라이언 일병 구하기*, *씬 레드 라인*, *이미테이션 게임*, *쉰들러 리스트*, *피아니스트*는 실제로 영화 DB에 있는 작품이지만, *덩케르크*(2017년 7월), *다키스트 아워*, *조조 래빗*은 DB에 아예 없다(데이터의 마지막 개봉일은 2017년 2월이다). 올바른 DB에 연결됐다면 근거를 갖고 답할 수 있었던 질문이다. 이 답이 맞는지 틀리는지와 별개로, **RAG를 붙인 이유였던 "근거 있는 답"이 무너진 것**이다.

> **보충**: 대책은 두 층이다.
> 1. **원인 쪽**: Agent를 만들 때 연결된 DB를 확인한다. `print(graph.schema)` 한 줄이면 Movie가 없다는 걸 바로 알 수 있다. 도구 안에서도 결과가 비면 "DB에 해당 정보가 없음"처럼 **이유가 드러나는 문자열**을 돌려주는 편이 낫다.
> 2. **Agent 쪽**: system prompt에 "도구 결과에 근거가 없으면 일반 지식으로 답하지 말고, 찾지 못했다고 답하라" 같은 규칙을 넣는다. 지난 글들에서 본 대로 이런 지시도 **강제가 아니라 권고**이므로, 중요한 서비스라면 도구 결과가 비었을 때 그래프 쪽에서 분기해 Agent를 끝내는 구조(LangGraph 조건부 엣지)가 더 확실하다.

같은 질문을 영화 DB에 연결해 실행한 강사님 노트북의 Cypher는 이렇다.

```text
Generated Cypher:
MATCH (m:Movie)
WHERE any(keyword IN ['world war ii', 'world war 2', 'second world war', 'wwii', 'nazi', 'nazis'] WHERE toLower(coalesce(m.overview, '')) CONTAINS keyword OR toLower(coalesce(m.tagline, '')) CONTAINS keyword)
OPTIONAL MATCH (d:Person)-[:DIRECTED]->(m)
OPTIONAL MATCH (m)-[:IN_GENRE]->(g:Genre)
RETURN
  m.title AS title,
  collect(DISTINCT d.name) AS directors,
  m.released.year AS releaseYear,
  ...
ORDER BY m.rating DESC
LIMIT 10;
Full Context:
[{'title': "Schindler's List", 'directors': ['Steven Spielberg'], 'releaseYear': 1993,
  'overview': '... saved over a thousand Jewish lives from the Nazis while they worked as slaves in his factory during World War II.', ...}, ...]
```

지난 글의 직접 구현 버전과 비교하면 훨씬 낫다. "battle"이나 장르 "War" 같은 넓은 조건 대신 2차 세계대전을 가리키는 키워드만 썼고, `coalesce`로 줄거리가 없는 영화도 에러 없이 처리했고, `LIMIT 10`과 평점 정렬로 결과를 추렸다. 프롬프트의 "NEO4J 5.0 문법" 규칙과 모델(gpt-5.5) 차이가 함께 작용한 결과로 보인다. 그래도 여전히 **키워드 매칭**이라, 줄거리에 "World War II"라는 단어가 없는 2차 세계대전 영화는 빠진다. 이 빈틈이 수업 메모에 적은 아이디어로 이어진다.

> **보충**: "neo4j에서도 유사도를 얻고 싶을 때, 유사도 툴을 하나 더 만들면 된다"는 메모를 코드로 옮기면 이런 모양이다. [지난 글](/notes/llm/llm-graph-vector-text2cypher)의 벡터 검색에 관계 탐색을 이어 붙여, 의미로 찾은 영화의 감독과 배우까지 한 번에 가져온다.
>
> ```python
> @tool
> def search_movie_by_meaning(description: str, top_k: int = 5) -> str:
>     """영화의 줄거리·분위기·배경 같은 '의미'로 영화를 찾을 때 사용한다.
>     예: '2차 세계대전을 배경으로 한 영화', '꿈속에서 벌어지는 스릴러'"""
>     vector = embeddings_small.embed_query(description)   # 영화 임베딩과 같은 모델
>     rows = graph.query("""
>         MATCH (m:Movie)
>         SEARCH m IN (VECTOR INDEX movie_content_embeddings FOR $v LIMIT $k)
>         SCORE AS score
>         OPTIONAL MATCH (d:Person)-[:DIRECTED]->(m)
>         RETURN m.title AS title, m.rating AS rating,
>                collect(DISTINCT d.name) AS directors, score
>         ORDER BY score DESC
>     """, params={"v": vector, "k": top_k})
>     return json.dumps(rows, ensure_ascii=False, default=str)
> ```
>
> 이러면 Agent가 "관계·집계 질문은 `search_movie_info_tool`, 의미 질문은 `search_movie_by_meaning`"으로 나눠 쓸 수 있다. 영화 임베딩은 `text-embedding-3-small`로 만들었으므로, 3072차원 올림픽 도구의 `embeddings`와 **다른 임베딩 객체**를 써야 한다.

### 두 도구를 조합하는 질문

강사님 노트북은 두 도구를 모두 붙이고 두 저장소에 걸친 질문을 했다.

```python
agent = create_agent(
    model=ChatOpenAI(model="gpt-5.5"),
    tools=[search_movie_info_tool, search_olympic_info_tool],
    system_prompt="""..."""
)

query = "런던 올림픽이 개최된 년도와 그때 개봉한 영화는 뭐가 있나?"
res = agent.invoke({"messages": [{"role": "user", "content": query}]})
res['messages']
```

```text
[HumanMessage(content='런던 올림픽이 개최된 년도와 그때 개봉한 영화는 뭐가 있나?', ...),
 AIMessage(content='', ... tool_calls ...),
 ToolMessage(content='올림픽 개최지는 해당 올림픽 개최 7년 전에 IOC 위원들의 투표로 결정된다. ...', ...),
 ...]
```

```python
print(res['messages'][-1].content)
```

```text
런던에서 **실제로 개최된 올림픽**은 하계 올림픽 기준으로 총 **3번**입니다.

| 개최 연도 | 올림픽 | 그해 개봉한 영화 예시 |
|---|---|---|
| **1908년** | 1908 런던 하계 올림픽 | 검색된 영화 DB 기준으로는 1908년 개봉작 정보가 확인되지 않았습니다. |
| **1948년** | 1948 런던 하계 올림픽 | *Open Secret*, *Red River*, *The Pirate* |
| **2012년** | 2012 런던 하계 올림픽 | *2016: Obama's America*, *21 Jump Street*, *A Thousand Words*, *Abraham Lincoln: Vampire Hunter*, *Act of Valor* |

참고로 **1944년 하계 올림픽도 런던에서 열릴 예정**이었지만, 제2차 세계대전 때문에 **취소**되어 실제 개최된 올림픽에는 포함하지 않았습니다.
```

ReAct 그대로다. 올림픽 도구로 개최 연도를 찾고(Thought → Action → Observation), 그 연도로 영화 도구를 다시 불렀다(다음 Thought → Action). 질문 하나를 **두 저장소에 걸쳐 두 단계로** 풀었다. 1908년은 DB에 영화가 없다고 명시했고, 1944년 취소 대회를 따로 구분한 것도 좋다.

반면 2012년 영화 목록은 *2016: Obama's America*, *21 Jump Street*, *A Thousand Words*... **알파벳 순서**다. 영화 도구가 만든 Cypher에 정렬 기준이 없거나 제목순이었고, 그 앞부분만 잘려 나온 것으로 보인다. "그때 개봉한 영화"라는 질문에 대표작이 아니라 이름이 숫자·A로 시작하는 영화가 나온 셈이다. 정렬 기준(평점, 인기도)을 질문이나 도구 docstring에서 정해 주지 않으면 LLM이 고른 기준이나 DB 기본 순서를 따른다.

## 정리

| 상황 | 일어난 일 | 교훈 |
|---|---|---|
| 관계·집계 질문 (놀란 감독 최다 출연 배우) | Text2Cypher가 정확한 패턴과 집계를 만듦 | 그래프 도구의 강점. 단, `LIMIT 1`의 동률 누락 같은 경계 조건은 확인 |
| 잘못된 DB에 연결 | 다른 스키마로 쿼리 → 빈 결과 → "모르겠다" | 도구를 만들 때 `graph.schema`를 확인 |
| 도구가 빈손으로 옴 | Agent가 학습 지식으로 답을 지어냄 | 근거 없을 때의 행동을 프롬프트와 그래프 구조로 정한다 |
| 의미 질문 (2차 세계대전 배경) | Cypher는 키워드 매칭에 그침 | 벡터 검색 도구를 따로 둔다 |
| 두 저장소에 걸친 질문 (런던 올림픽 + 영화) | 도구를 순서대로 조합해 해결 | Agent의 핵심 가치. 정렬 기준 같은 세부는 지시가 필요 |

- 벡터 DB와 그래프 DB는 경쟁이 아니라 **역할 분담**이다. 각각을 tool로 만들고 docstring으로 역할을 구분하면 Agent가 질문에 맞게 고른다.
- 도구의 docstring, 프롬프트의 tool 이름, 실제 바인딩된 도구 목록은 **항상 일치**시킨다.
- "도구가 비었다"는 상황은 에러가 아니라서 조용히 지나간다. Agent가 그다음에 무엇을 하는지까지 확인해야 한다.

이것으로 LangChain 기초부터 이어진 RAG·Agent·GraphRAG 흐름이 끝났다. 다음은 모델 자체를 바꾸는 쪽, sLLM 파인튜닝이다.
