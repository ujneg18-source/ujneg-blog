---
title: "Retriever: 검색 방식 비교와 RAG 체인"
description: "VectorStore와 Retriever의 차이, 다양한 Retriever 전략(ParentDocument, MultiVector, SelfQuery, ContextualCompression, MultiQuery, Ensemble)을 정리하고, Qdrant 하이브리드 VectorStore를 as_retriever()로 바꿔 LCEL RAG 체인을 만든 뒤 similarity_score_threshold, mmr, payload filter, configurable_fields로 검색 설정을 바꿔 봅니다."
category: 'Tech'
subcategory: 'LLM'
series: 'RAG'
seriesOrder: 4
originalNotebook: "08_RAG_Retriever.ipynb"
tags: ["LLM","RAG"]
date: 2026-07-01T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-retriever.webp'
---

> SKN31 AI Agent 과정 노트북 `08_RAG_Retriever.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 Docker로 띄운 Qdrant 서버에서 실행한 결과입니다.

## 이 글에서 다루는 것

- Retriever란, VectorStore와 무엇이 다른가
- 검색 성능을 높이는 Retriever 전략 7가지
- `as_retriever()`로 Retriever 만들기
- Retriever로 LCEL RAG 체인 완성하기
- `search_type`과 `search_kwargs`: threshold, mmr, filter
- `configurable_fields`로 호출할 때 설정 바꾸기

## Retriever

```python
# RAG 자체의 플로우를 짜는 코딩은 쉽다
# 근데 문서를 잘찾아내는, 내가 원하는 답변을 얻어내기 위한 알고리즘을 짜는 것은 힘들가
# 그걸 랭체인에서 구현하는 것을 Retriever임
# retriever => 사람들이 연구한 다양한 방법을 클래스로 제공해줌
# 랭체인 안에 들어간다. (랭체인객체임)
```

**Retriever**는 질문(문자열)을 받아 관련 문서 리스트를 돌려주는 인터페이스다. 벡터 스토어, 그래프 DB, 관계형 DB 등 어떤 검색 시스템이든 "질문 → 문서 리스트"라는 같은 모양으로 감싼다.

![RAG 검색과 생성](/images/llm/fig-rag2.png)

```python
# vectorstore => 벡터화된 문서들을 저장하는 공간 (자체적으로 검색, 조회, 저장, 삭제, 추가, 필터링, 등 다양한 기능을 제공)
# retriever => 벡터화된 문서들을 검색하는 알고리즘, runnable 타입 (객체=파라미터를 설정=고정적)
```

| | VectorStore | Retriever |
|---|---|---|
| 역할 | 벡터 데이터 **관리 + 검색** (저장, 삭제·수정, 인덱싱, 유사도 검색) | **검색 요청을 어떻게 할지**만 정해 둔 실행 모듈 |
| 저장·인덱싱 | 한다 | 안 한다 |
| 설정 | 호출할 때마다 (`similarity_search(k=…, filter=…)`) | **만들 때 고정** (k, 필터, 검색 방식, 재랭킹 등) |
| Runnable | 아니다 | 맞다 → **체인에 넣을 수 있다** |

## Retriever 전략

기본 검색만으로는 원하는 문서를 못 찾을 때가 많아서, 여러 확장 전략이 연구되어 있다.

| Retriever | 아이디어 | 언제 |
|---|---|---|
| **VectorStore Retriever** | 청크 임베딩과 질문 임베딩의 유사도 | 기본 |
| **ParentDocumentRetriever** | 작은 청크로 찾고, 그 청크가 속한 **원본(부모) 문서 전체**를 돌려준다 | 찾을 때는 정밀하게, 답할 때는 문맥을 넓게 |
| **MultiVectorRetriever** | 문서마다 요약, 가상 질문 등으로 **여러 개의 벡터**를 만든다 | 문서가 길거나 핵심이 일부에 몰려 있을 때 |
| **SelfQueryRetriever** | LLM이 질문을 **검색어 + 메타데이터 필터**로 바꾼다 | "1900년 이전 작품"처럼 속성 조건이 섞인 질문 |
| **ContextualCompressionRetriever** | 검색 후 문서에서 **질문과 무관한 부분을 덜어낸다** | LLM에 넘길 길이를 줄일 때 |
| **MultiQueryRetriever** | LLM이 질문을 **여러 표현으로 바꿔** 각각 검색하고 합친다 | 질문 표현에 따라 결과가 달라질 때 |
| **EnsembleRetriever** | BM25, 벡터 등 **여러 Retriever 결과를 가중치로** 합친다 | 서로 다른 장점을 결합할 때 |

다음 글(Advanced RAG)에서 이 중 몇 가지를 직접 써 본다.

## 준비: 올림픽 문서를 하이브리드 컬렉션에

```python
# Retriver 생성
## vectorstore.as_retriver()
```

```python
#######################################
# data/olympic.md 저장 -> 검색
#######################################
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import MarkdownHeaderTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore, FastEmbedSparse, RetrievalMode

from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, SparseVectorParams, SparseIndexParams
from dotenv import load_dotenv

load_dotenv()
```

```python
# Data 로드

loader = TextLoader(
    "data/olympic_wiki.md",
    encoding="utf-8"
)

documents = loader.load()

doc_txt = "\n\n".join(
    doc.page_content for doc in documents
)

#  Markdown Header 기준으로 문서 분할
headers_to_split_on = [
    ("#", "H1"),
    ("##", "H2"),
    ("###", "H3"),
]

# splitter 생성
splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=headers_to_split_on
)


# 문서분할
docs = splitter.split_text(doc_txt)

print(len(docs))
```

```text
25
```

```python
# Embedding -> store

# 연결 + collection 생성

COLLECTION_NAME = "OLYMPIC_INFO"
VECTOR_SIZE = 3072

client = QdrantClient(
    url="http://localhost:6333"
)

if client.collection_exists(COLLECTION_NAME):
    client.delete_collection(COLLECTION_NAME)

client.create_collection(
    collection_name=COLLECTION_NAME,

    # Dense Vector 저장소
    vectors_config={
        "dense": VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE
        )
    },

    # Sparse Vector 저장소
    sparse_vectors_config={
        "sparse": SparseVectorParams(
            index=SparseIndexParams(
                on_disk=False
            )
        )
    }
)
```

```python
# 임베딩 모델 생성

# Dense Embedding 모델
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-large"
)

# Sparse Embedding 모델 (BM25)
sparse_embeddings = FastEmbedSparse(
    model_name="qdrant/bm25"
)
```

```python
# 하이브리드 벡터스토어 생성

vectorstore = QdrantVectorStore(
    client=client,
    collection_name=COLLECTION_NAME,

    # 임베딩 모델
    embedding=embeddings,
    sparse_embedding=sparse_embeddings,

    # 벡터저장소 지정
    vector_name="dense",
    sparse_vector_name="sparse",

    # 검색방식 default=dense
    retrieval_mode=RetrievalMode.HYBRID
)
```

```python
# 문서저장 

vectorstore.add_documents(documents=docs)
```

```text
['bea6628497e74e7e8e13096614532497',
 '19c2f5010bc843adbcc7a42231778fcd',
 'b46302642793445f810adac219c0efcb',
 … (25개)
```

1편의 MarkdownHeaderTextSplitter로 섹션 단위 25개를 만들고, 지난 글의 하이브리드 컬렉션에 넣었다. 메타데이터에 `H1`, `H2`, `H3` 헤더가 남는다.

## as_retriever()

```python
# Retriever로 변환

retriever = vectorstore.as_retriever()  # vectorstore에서 Retriver 생성
```

```python
from langchain_core.runnables import Runnable

print(isinstance(vectorstore, Runnable), isinstance(retriever, Runnable))

# vectorstore은 Runnable이 아님
```

```text
False True
```

VectorStore는 Runnable이 아니라서 `|`로 체인에 넣을 수 없다. `as_retriever()`로 바꾸면 Runnable이 되어 `invoke`로 부르고 체인에 넣을 수 있다.

```python
query = "올림픽 논란에 대해 설명해줘."

result = retriever.invoke(query) #invoke 메서드 공유
result
```

```text
[Document(metadata={'H1': '올림픽', 'H2': '국제 올림픽 위원회', 'H3': '비판', '_id': 'd14b41e4-05b8-4c1c-9277-73c321be8e89', '_collection_name': 'OLYMPIC_INFO'}, page_content="국제 올림픽 위원회(이하 IOC로 지칭)는 몇몇 위원들이 한 행위에 대해서 비판을 받고 있다. … (생략)"),
 Document(metadata={'H1': '올림픽', 'H2': '논란', 'H3': '보이콧', …}, …),
 Document(metadata={'H1': '올림픽', 'H2': '논란', 'H3': '폭력 및 전쟁', …}, …),
 Document(metadata={'H1': '올림픽', 'H2': '상업화', 'H3': '비판', …}, …)]
```

기본값으로 4개를 돌려준다. 헤더 메타데이터를 보면 IOC 비판, 보이콧, 폭력과 전쟁, 상업화 비판으로 "논란"이라는 질문에 맞는 섹션이 다 모였다. 헤더 기준 분할 덕분에 조각마다 주제가 분명하다.

## RAG 체인

```python
# 이제 RAG Chain에 연결하기 위해 아래와 같이 chain 생성

# 기본 구성
# retriever | prompt template | LLM | outputparser     # 각 Runnable연결
```

```python
# 모델 생성
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-5.4-mini", temperature = 0)
```

```python
# parser 생성
from langchain_core.output_parsers import StrOutputParser 

parser = StrOutputParser()
```

```python
# 프롬프트 템플릿 생성

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser 
from langchain_core.runnables import RunnablePassthrough # 병렬처리 
from langchain_openai import ChatOpenAI


# prompt 템플릿 구성

prompt = ChatPromptTemplate.from_template(
    template = """<instruction>
당신은 친절한 QA Assistant입니다.
질문에 대해 주어진 context를 기반으로 답을 해주세요.
context에 질문과 관련된 내용이 없을 경우 "주어진 정보로는 답을 알 수 없습니다."라고 답을 하세요.  # 할루시네이션을 방지하기 위함
context에 없는 내용으로 답을 만들지 마세요
</instruction>
<context>
{context}
</context>
<question>
{query}
</question>
<output-format>
- 답변을 context의 어느 부분을 참조하였는지 각주를 달아주세요.
- 답변을 Markdown 형식으로 작성하세요.
- 답변은 example을 참조하세요.

    <example> 
    # 답변
    최종 답변 내용

    # 참조 내용
    context에서 참조한 내용
    </example> 

</ouput-format>
"""
)

def format_str(docs: list) -> str:  #Retriever가 찾아온 Document들을 Prompt에 넣기 위한 문자열로 변환하는 함수
    """
    Retriever가 찾은 문서 리스트(List[Document])에서

    page_content만 추출해서 하나의 문자열로 합쳐 반환하는 함수.

    PromptTemplate의 context에 넣어줄 값을 하나의 문자열(str)로 만든다.
    """

    return "\n\n".join(doc.page_content for doc in docs)
```

프롬프트 안의 `# 할루시네이션을 방지하기 위함`은 문자열 안에 있어서 **파이썬 주석이 아니라 프롬프트의 일부**로 LLM에 전달된다. 이 정도는 문제가 없지만, 프롬프트 안에 메모를 남기려면 템플릿 밖에 두는 게 맞다.

```python
# chain 생성

# 문서검색(retriever) => prompt template => LLM => outputparser
chain = (
    {
        "context": retriever | format_str, #retriever 처리 결과
        "query": RunnablePassthrough() # 입력받은 질문을 전달 
    }
    | prompt
    | model
    | parser
)
```

LangChain 기초 5편에서 "RAG 체인은 보통 이런 모양"이라고 미리 봤던 구조가 실제로 완성됐다.

| 단계 | 하는 일 |
|---|---|
| `{…}` (RunnableParallel) | 질문 하나가 두 갈래로 동시에 들어간다 |
| `"context": retriever \| format_str` | 질문으로 문서를 찾고, Document 리스트를 문자열 하나로 합친다 |
| `"query": RunnablePassthrough()` | 질문을 그대로 넘긴다 |
| `prompt \| model \| parser` | `{context, query}`로 프롬프트를 채워 LLM에 보내고 문자열로 받는다 |

```python
result = chain.invoke(
    "올림픽 논란에 대해 설명해줘"
)

print(result)
```

```text
# 답변
올림픽은 이상적으로는 평화와 스포츠 정신을 상징하지만, 실제로는 여러 가지 논란이 있었습니다.  
주요 논란으로는 **IOC 위원들의 부패·뇌물 의혹**, **국가 간 보이콧**, **전쟁과 테러로 인한 올림픽 취소·피해**, **정치 선전의 도구로 이용된 사례**, 그리고 **선수들의 정치적 표현을 둘러싼 갈등** 등이 있습니다.[^1][^2][^3][^4][^5]

예를 들면, IOC 위원장들이 비판을 받았고, 2002년 솔트레이크 시티 동계 올림픽 유치 과정에서도 뇌물 청탁 폭로가 있었습니다. 또 2004년과 2006년 올림픽 유치 관련해서도 뇌물 의혹 조사가 있었습니다.[^1]

보이콧도 반복되었습니다. 1956년, 1972년, 1976년, 1980년, 1984년 올림픽에서는 여러 나라가 정치적 이유로 참가를 거부했습니다. 2008년에도 보이콧 요구가 있었지만 실제 보이콧은 없었습니다.[^2]

올림픽은 전쟁과 테러의 영향도 받았습니다. 1916년, 1940년, 1944년 올림픽은 세계대전 때문에 취소되었고, 1972년 뮌헨 참사와 1996년 애틀랜타 폭탄 사건도 있었습니다.[^3]

또한 1936년 나치 독일은 올림픽을 체제 선전에 활용하려 했고, 1968년에는 토미 스미스와 존 카를로스가 시상대에서 블랙 파워 설루트를 하며 정치적 메시지를 표출했습니다.[^4][^5]

# 참조 내용
[^1]: “국제 올림픽 위원회(이하 IOC로 지칭)는 몇몇 위원들이 한 행위에 대해서 비판을 받고 있다… 2002년 솔트레이크 시티 동계 올림픽 유치 과정에서… 뇌물청탁… IOC는 사퇴한 IOC위원 4명과 강제 퇴출된 6명에 대한 조사를 했다… (생략)
```

검색된 네 섹션(IOC 비판, 보이콧, 폭력 및 전쟁, 상업화 비판)이 답의 문단과 각주로 그대로 이어진다. 지난 글의 "올림픽이 취소된 적이 있나"라는 질문도 여기서는 "1916년, 1940년, 1944년 올림픽은 세계대전 때문에 취소"로 답의 일부가 되었다. 마크다운 각주 문법(`[^1]`)까지 지켰다.

## Retriever 설정: search_type, search_kwargs

```python
# Retriever를 생성시 다양한 정보를 설정하는 방법
# as_retriever(옵션-파라미터들)

###############################################################
#
# Search Type (Retriever 조회 알고리즘)
#
###############################################################

# 01 similarity -> 유사도가 높은 Top-K 문서를 반환 (기본값)

# 02 similarity_score_threshold -> 유사도 점수가 일정 기준(score_threshold) 이상인 문서만 반환

# 03 mmr (Max Marginal Relevance) 
# -> 유사도와 다양성을 함께 고려하여 문서를 반환 
# -> 비슷한 문서가 여러 개일 경우 중복을 줄여 다양한 문서를 검색

# 04 search_kwargs -> similarity_search() 호출시 지정하는 파라미터들

# search_kwargs={ 아래는 예시, 파라미터 설명

#     "k": 5,                     # 최종적으로 반환할 문서의 개수 (Top-K)

#     "score_threshold": 0.7,     # similarity_score_threshold 방식에서 사용할 최소 유사도 기준
#                                 # 0.7 이상인 문서만 반환

#     "fetch_k": 20,              # MMR 사용 시 먼저 가져올 후보 문서의 개수
#                                 # (이 후보들 중에서 다양성을 고려해 최종 k개를 선택)

#     "lambda_mult": 0.5,         # MMR의 다양성 조절 값 (0 ~ 1)
#                                 # 1에 가까울수록 유사도 우선
#                                 # 0에 가까울수록 다양성 우선

#     "filter": filter_condition  # Payload Filter
#                                 # 메타데이터 조건(author, year 등)에 맞는 문서만 검색
# }
```

| search_type | 동작 | 쓰는 search_kwargs |
|---|---|---|
| `similarity` (기본) | 유사도 Top-k | `k`, `filter` |
| `similarity_score_threshold` | 점수가 기준 이상인 것만 | `k`, `score_threshold`, `filter` |
| `mmr` | 관련성 + 다양성 | `k`, `fetch_k`, `lambda_mult`, `filter` |

### similarity_score_threshold

```python
retriever2 = vectorstore.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={
        "k": 7,
        "score_threshold": 0.7 # 0.7이상 조회
    }
)
query = "동계올림픽에 대해 알려줘."
result = retriever2.invoke(query)
result
```

```text
[Document(metadata={'H1': '올림픽', '_id': 'bea66284-97e7-4e7e-8e13-096614532497', '_collection_name': 'OLYMPIC_INFO'}, page_content='올림픽(영어: Olympic Games, 프랑스어: Jeux olympiques)은 … 올림픽은 2년마다 하계 올림픽과 동계 올림픽이 번갈아 열리며, … (생략)'),
 Document(metadata={'H1': '올림픽', 'H2': '논란', 'H3': '보이콧', …}, …)]
```

k=7인데 2개만 왔고, 정작 **"동계 올림픽" 섹션(H3)이 빠졌다**. 대신 개요와 보이콧 섹션이 나왔다. 이유는 이 VectorStore가 **하이브리드**라는 데 있다. 하이브리드의 점수는 지난 글에서 본 RRF 순위 점수라서, 코사인 유사도처럼 "0.7 이상이면 꽤 비슷하다"는 뜻이 아니다. 두 검색(Dense, Sparse) **모두에서 상위권**이어야 합산 점수가 0.7을 넘는다(예: 둘 다 1위면 0.5 + 0.5). "동계 올림픽" 섹션은 Dense에서는 높았겠지만 BM25에서 "동계올림픽"(붙여 씀)이 섹션의 "동계 올림픽"(띄어 씀)과 다른 토큰이라 순위가 낮았을 것이다. 점수 기준은 **검색 방식에 맞는 척도로** 정해야 한다.

### mmr

```python
retriever3 = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 7,               # 최종 반환할 문서 개수
        "fetch_k": 15,        # 먼저 가져올 후보 문서 개수
        "lambda_mult": 0.5    # 유사도와 다양성의 균형
    }
)
query = "동계 올림픽에 대해 알려줘."
result = retriever3.invoke(query)
pprint(result)
```

결과 7개의 헤더만 정리하면:

```text
H1 올림픽 (개요)
H1 올림픽 > H2 근대 올림픽 > H3 동계 올림픽
H1 올림픽 > H2 논란 > H3 보이콧
H1 올림픽 > H2 국제 올림픽 위원회 > H3 비판
H1 올림픽 > H2 근대 올림픽 > H3 청소년 올림픽
H1 올림픽 > H2 상업화 > H3 상징
H1 올림픽 > H2 개최지 선정
```

이번에는 "동계 올림픽" 섹션이 2위로 들어왔다(질문도 "동계 올림픽"으로 띄어 썼다). MMR이 다양성을 챙기느라 청소년 올림픽, 개최지 선정처럼 주변 주제로 넓게 가져왔다.

### filter

```python
###############################################################
#
# Payload Filter를 이용한 Retriever
#
###############################################################

from qdrant_client.models import (
    Filter,
    FieldCondition,
    MatchValue
)

filter_condition = Filter(
    must=[
        FieldCondition(
            key="metadata.H1",
            match=MatchValue(value="동계 올림픽")
        ),
        FieldCondition(
            key="metadata.H2",
            match=MatchValue(value="동계 올림픽")
        ),
        FieldCondition(
            key="metadata.H3",
            match=MatchValue(value="동계 올림픽")
        )
    ]
)
```

```python
retriever4 = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={
        "k": 5,
        "filter": filter_condition
    }
)

retriever4.invoke(query)

# vectorstore.similarity_search(k=5, filter=filter) 백터스토어는 조회할때, 필터값을 유기적으로 조정가능
# but retriever는 생성시점에 filter값을 고정시켜야함. (retriever는 Runnable이므로, invoke()호출시 파라미터를 바꿀 수 없음)
```

```text
[]
```

빈 리스트가 나왔다. `must`는 AND라서 H1, H2, H3가 **모두** "동계 올림픽"인 섹션을 찾는데, 그런 섹션은 없다. 동계 올림픽 섹션은 `H1: 올림픽, H2: 근대 올림픽, H3: 동계 올림픽`이다. "셋 중 어디든 동계 올림픽"이라는 뜻이면 `should`(OR)를 써야 하고, 이 데이터라면 `metadata.H3`에 조건 하나만 걸면 된다. 필터 조건이 틀리면 에러 없이 **빈 결과**가 오고, RAG 체인이었다면 "주어진 정보로는 답을 알 수 없습니다"가 나왔을 것이다.

### configurable_fields: 호출할 때 설정 바꾸기

메모처럼 Retriever는 만들 때 설정이 고정된다. 질문마다 k나 필터를 바꾸고 싶으면 `configurable_fields`로 바꿀 수 있는 필드를 열어 둔다.

```python
#########################################################################
# search_type이나 search_kwargs를 호톨(invoke)할 때 동적으로 변경하는 방법
##########################################################################
from langchain_core.runnables import ConfigurableField
```

```python
retriever5 = vectorstore.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"score_threshold": 0.5}
)

# 리트리버의 설정값(search_type, search_kwargs)을 invoke() 호출 시 동적으로 변경하고 싶을 때,
# retriever를 생성한 후 configurable_fields()를 호출하면 됨
retriever5 = retriever5.configurable_fields(
    # 바꾸고자 하는 변수 - ConfigurableField() 객체
    search_kwargs=ConfigurableField(
        id="search_kwargs",  # invoke() 호출 시 바꾸고자 하는 key값(변수명)
    )
)

# search_type도 바꾸고 싶으면,
# retriever5 = retriever5.configurable_fields(
#     search_type=ConfigurableField(id="search_type")
# )
# 로 추가하면 됨
```

```python
retriever5.invoke("동계 올림픽 종목에는 무엇이 있나요?") # 기본설정으로 조회
```

```text
H1 올림픽 > H2 근대 올림픽 > H3 동계 올림픽
H1 올림픽 > H2 올림픽 경기 종목
H1 올림픽 (개요)
H1 올림픽 > H2 개최지 선정
```

(Document 4개의 헤더만 정리했다.)

```python
# 바꿀 때, 키값으로 지정한 id값을 딕셔너리 형태로 만들어서 invoke시 파라미터로 전달하면 됌
config = {
    "configurable":{
        "search_kwargs": { #key: ConfigurableField에서 (id="search_kwargs")로 지정한 key값
            "k": 10,
            "score_threshold": 0.2
        }
    }

}

retriever5.invoke("동계 올림픽 종목에는 무엇이 있나요?", config=config) # 바꿀설정값으로 조회

# config: RunnableConfig
# Runnable을 invoke()할 때 전달하는 설정값.
```

```text
H1 올림픽 > H2 근대 올림픽 > H3 동계 올림픽
H1 올림픽 > H2 올림픽 경기 종목
H1 올림픽 > H2 개최지 선정
H1 올림픽 (개요)
H1 올림픽 > H2 근대 올림픽 > H3 오늘날의 올림픽
H1 올림픽 > H2 상업화 > H3 텔레비전의 영향
H1 올림픽 > H2 상업화 > H3 행사
H1 올림픽 > H2 상업화 > H3 상징
H1 올림픽 > H2 올림픽 경기 종목 > H3 아마추어 정신과 프로 선수들의 참가
H1 올림픽 > H2 논란 > H3 폭력 및 전쟁
```

같은 Retriever, 같은 질문인데 `config`로 k=10, 기준 0.2를 주니 4개 → 10개가 되었다. 기준을 낮추면 상업화, 폭력 같은 덜 관련된 섹션까지 들어온다. `config`는 모든 Runnable이 받는 **RunnableConfig**이고, 체인 전체를 invoke할 때 넘겨도 안쪽 Retriever까지 전달된다.

## 어떤 설정을 쓸까

| 상황 | 설정 |
|---|---|
| 처음 만들 때 | `similarity`, k=4~5 |
| 관련 없는 문서가 섞인다 | `similarity_score_threshold` (Dense 기준 척도로 값을 정함) |
| 하이브리드에서 점수 기준을 쓴다 | RRF 점수 척도에 맞춰 낮게 잡거나, Dense로 기준을 정함 |
| 비슷한 섹션이 중복된다 | `mmr` (fetch_k를 k의 2~3배) |
| 카테고리·기간 조건이 정해져 있다 | `filter` (must/should 구분 주의, 키는 `metadata.필드`) |
| 질문마다 k나 필터가 달라야 한다 | `configurable_fields` + `config` |

## 정리

- **Retriever**는 질문을 받아 문서 리스트를 돌려주는 Runnable이다. VectorStore는 저장·관리·검색을 하고 Runnable이 아니며, `as_retriever()`로 바꿔야 체인에 넣을 수 있다
- 검색 품질을 높이는 전략으로 ParentDocument, MultiVector, SelfQuery, ContextualCompression, MultiQuery, Ensemble Retriever가 있다
- RAG 체인은 `{"context": retriever | format_str, "query": RunnablePassthrough()} | prompt | model | parser`다
- `search_type`(similarity / similarity_score_threshold / mmr)과 `search_kwargs`(k, score_threshold, fetch_k, lambda_mult, filter)로 검색을 조정한다
- 하이브리드 검색의 점수는 순위 기반(RRF)이라 코사인 기준(0.7)을 그대로 쓰면 핵심 문서가 빠질 수 있다
- 필터 `must`는 AND라서 조건을 잘못 걸면 에러 없이 빈 결과가 온다
- Retriever 설정은 만들 때 고정되지만, `configurable_fields`로 열어 두면 `invoke(…, config=…)`로 호출마다 바꿀 수 있다
