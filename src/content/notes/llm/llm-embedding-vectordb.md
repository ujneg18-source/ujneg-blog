---
title: "Embedding과 Vector DB: 의미로 검색하기"
description: "문서를 임베딩 벡터로 바꾸는 embed_documents와 embed_query, 코사인 유사도 계산, 벡터 데이터베이스의 종류(Qdrant, Pinecone, Chroma, FAISS 등)를 정리하고, InMemoryVectorStore로 올림픽 문서를 인덱싱한 뒤 similarity_search, 유사도 점수 기준 필터, RAG 프롬프트로 답변을 생성하고 MMR 검색과 비교합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'RAG'
seriesOrder: 2
originalNotebook: "07_0_RAG_Embedding_VectorDB.ipynb"
tags: ["LLM","RAG"]
date: 2026-06-29T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-embedding-vectordb.webp'
---

> SKN31 AI Agent 과정 노트북 `07_0_RAG_Embedding_VectorDB.ipynb`를 바탕으로 정리했습니다.
> 벡터 스토어 실습부터는 수업 때 실행한 결과입니다. 임베딩 모델을 직접 호출하는 앞부분은 수업 노트북에 실행 기록이 없어서 강의 자료의 코드와 출력을 가져왔습니다.

## 이 글에서 다루는 것

- 임베딩: `embed_documents`와 `embed_query`
- 코사인 유사도로 직접 검색해 보기
- 벡터 데이터베이스란, 그리고 종류
- LangChain VectorStore: `InMemoryVectorStore`
- 인덱싱 → 검색 → 프롬프트 → 답변까지 RAG 한 바퀴
- `similarity_search_with_score`와 점수 기준 필터
- MMR: 비슷한 문서만 몰리지 않게 검색하기

## Embedding

![Embedding](/images/llm/fig-rag-embedding.png)

분할된 텍스트를 **임베딩 벡터**로 바꾼다. LangChain은 OpenAI, Hugging Face 등 여러 임베딩 모델을 같은 사용법으로 감싼다.

| 메소드 | 입력 | 쓰임 |
|---|---|---|
| `embed_documents(texts)` | 문자열 리스트 | 저장할 문서(context)를 벡터로 |
| `embed_query(text)` | 문자열 하나 | 사용자 질문(query)을 벡터로 |

```python
# 여러 개의 문서가 있으면 청크를 통해 문서를 나눠서 한다.
```

```python
# 메서드에 문자열을 넣으면 임베딩 벡터를 줌 
```

```python
# 도큐먼트=> 리스트 => (내 데이터에 대해)
# 쿼리 => 텍스트로 받아서 텍스트(하나의 질문) : 운영(질문에 대해)
```

메모처럼 `embed_documents`는 **준비 단계**에서 내 데이터 전체에 한 번, `embed_query`는 **운영 단계**에서 질문이 올 때마다 쓴다.

```python
docs = [
        "나는 고양이와 개 중 반려동물로 개를 키우고 싶습니다.",
        "이 강아지 품종은 진도개 입니다. 국제 표준으로 중대형견으로 분류되며 다리가 길어 체고가 높은 편에 속합니다.",
        "日本の市内バスの運賃は主に距離によって決まり、地域やバス会社によって異なる場合があります",                 # 일본의 시내버스 요금은 주로 거리에 따라 결정되며, 지역 및 버스 회사에 따라 다를 수 있습니다.
        "Bus fares in the United States vary from city to city, but are generally around $2.90 for a regular bus.", # 미국의 버스 요금은 도시마다 다르지만, 일반적으로 정기 버스의 경우 2.90달러 정도입니다.
        "광역버스 요금은 일반 3000원, 청소년은 1800원, 어린이 1500원 입니다.", 
]
```

반려동물 두 문장, 그리고 한국어·일본어·영어로 된 버스 요금 문장 셋이다. 다국어 임베딩 모델이라면 언어가 달라도 **주제가 같은** 버스 요금끼리 가까워야 한다.

아래부터 이 절의 코드와 출력은 강의 자료다. OpenAI 임베딩 대신 Hugging Face의 오픈소스 임베딩 모델을 썼다.

```python
from langchain_openai import OpenAIEmbeddings

model_name = "text-embedding-3-small"
model_name = "text-embedding-3-large"
e_model = OpenAIEmbeddings(model=model_name)
```

```python
# HuggingFace의 OpenSource 임베딩 모델 사용.
from langchain_huggingface import HuggingFaceEmbeddings

model_id = "codefuse-ai/F2LLM-v2-1.7B" 
e_model = HuggingFaceEmbeddings(model=model_id)
```

```python
# 문서들 임베딩 처리(Embedding Vector로 변환)
embedded_docs = e_model.embed_documents(docs)
print(type(embedded_docs), len(embedded_docs))  # 변환된 문서 타입, 개수
print(type(embedded_docs[0]), len(embedded_docs[0]))

# text-embedding-3-small 모델 ->  1536차원 embedding vector로 변환.
# text-embedding-3-large 모델 ->  3072차원 embedding vector로 변환.
```

```text
<class 'list'> 5
<class 'list'> 2048
```

문장 5개가 각각 **2,048개 숫자**로 된 벡터가 됐다. 차원 수는 모델마다 고정이다(OpenAI small 1,536, large 3,072). 문장 길이와 상관없이 같은 길이의 벡터가 나오므로 서로 비교할 수 있다.

```python
embedded_docs[0][:10]
```

```text
[0.003387451171875,
 -0.039306640625,
 -0.000278472900390625,
 0.0169677734375,
 0.03662109375,
 -0.0732421875,
 0.0029296875,
 0.03564453125,
 0.00982666015625,
 0.0654296875]
```

### 코사인 유사도로 직접 검색

```python
#############################
# 질문과 유사한 문서들을 검색
# 유사도 계산
# - 거리기반: 유클리디안 거리, 맨하단 거리
# - 방향기반: 코사인 유사도. -1(cos180) ~ 0(cos90) ~ 1(cos0)

import numpy as np

# 코사인유사도 = 두 벡터간의 내적 / 각 벡터의 크기의 곱
def cosin_similarity(vector1, vector2):
    """vector1과 vector2의 코사인 유사도 계산"""
    v1 = np.array(vector1)
    v2 = np.array(vector2)
    return (v1 @ v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
```

```python
# 질문 또한 임베딩 벡터로 변환
# 디비의 5개의 문서의 임베딩 벡터와 질문의 임베딩 벡터의 유사도를 측정
# 이때 사용하는 유사도 계산
# - 거리 기반: 유클리디안 거리, 맨하단 거리
# - 방향 기반: 코사인 유사도.  

# 유사도 높은 것을 찾아서 디비 안에서 대답함
```

```python
# 거리기반 => 가까울수록 좋음
# 코사인 => 1에 가까울 수록 유사도가 큼
```

$$
\text{cos}(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\lVert \mathbf{a} \rVert \, \lVert \mathbf{b} \rVert}
$$

| 기준 | 계산 | 해석 |
|---|---|---|
| 유클리드·맨해튼 거리 | 두 점 사이의 거리 | **작을수록** 비슷하다 |
| 코사인 유사도 | 두 벡터 사이 각도의 cos | -1 ~ 1, **1에 가까울수록** 비슷하다. 벡터 길이(문장 길이)의 영향을 받지 않는다 |

NLP 시리즈의 Word2Vec 글에서 단어 사이의 유사도를 잴 때 쓴 것과 같은 공식이다.

```python
query = "개와 고양이중 무엇을 더 좋아하나요?"
# query = "요새 시내버스 요금 얼마에요?"
# query = "월드컵 망한거 같아요."

# 질문은 embedding vector로 변환
query_vector = e_model.embed_query(query)

search_list = []
for i, doc_vector in enumerate(embedded_docs):
    print(f"{i+1}. {cosin_similarity(doc_vector, query_vector)}")
    search_list.append((i, cosin_similarity(doc_vector, query_vector)))
```

```text
1. 0.04060875017624152
2. 0.06703019415465114
3. 0.011323142211723761
4. -0.013146870885852736
5. 0.0544407111937877
```

모든 문서와의 유사도가 0.07 이하로 낮다. 강의 자료에서 `query`를 확인해 보면 이 결과는 주석 처리된 셋째 질문 **"월드컵 망한거 같아요."**로 바꿔 실행한 것이다. 다섯 문장 어디에도 월드컵 얘기가 없으니 낮은 게 정상이다. 그래도 검색은 **항상 상위 k개를 돌려준다**. 관련 없는 문서도 "그중 덜 먼" 순서로 나온다는 점이 RAG의 함정이고, 아래 점수 기준 필터가 필요한 이유다.

### Document를 넣어 검색: "아이폰" → Apple

```python
from langchain_core.documents import Document

# Upsert(SQL:insert) 할 Document 리스트생성
d1 = Document(id=1, page_content="Apple, Pear, Watermelon", metadata={"category":"fruit"})
d2 = Document(id=2, page_content="Python, Java, C++", metadata={"category":"IT"})
d3 = Document(id=3, page_content="Football, Baseball, BasketBall", metadata={"category":"Sport"})
```

```python
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.vectorstores import InMemoryVectorStore

# 임베딩 모델 생성
embedding_model = HuggingFaceEmbeddings(model="codefuse-ai/F2LLM-v2-1.7B")

# VectorStore를 생성 -> VectorDB와 연결 
#         => 임베딩 모델을 넣어서 생성.(임베딩 벡터로 변환하는 것은 VectorStore가 담당.)
vectorstore = InMemoryVectorStore(embedding_model)

# Upsert - add_documents(list[Document])
#  Document.page_content 를 Embedding Vector로 변환 -> index, Document를 value 저장
vectorstore.add_documents(documents=[d1, d2, d3])
```

```text
['1', '2', '3']
```

```python
# 검색(유사도)
query = "SQL"
query = "Rust"
query = "월드컵"
query = "아이폰"
result = vectorstore.similarity_search_with_score( # 유사도 점수를 포함해서 반환.
    query=query, k=2
)
for doc in result:
    print(doc)
```

```text
(Document(id='1', metadata={'category': 'fruit'}, page_content='Apple, Pear, Watermelon'), 0.27110360286386975)
(Document(id='2', metadata={'category': 'IT'}, page_content='Python, Java, C++'), 0.15742620574336022)
```

"아이폰"으로 검색했더니 1위가 **과일** 문서(Apple)다. 임베딩 모델이 "아이폰"과 "Apple"을 가깝게 놓았는데, 그 Apple이 이 문서에서는 사과라는 문맥까지는 구분하지 못했다. 2위 IT 문서와의 점수 차도 크지 않다. 짧은 키워드 나열 문서는 문맥 정보가 거의 없어서 이런 일이 잦다. 메타데이터(`category: IT`)로 필터를 거는 것이 해결책 중 하나다.

## 벡터 데이터베이스

![Vector Store](/images/llm/fig-rag-vector-store.png)

**벡터 데이터베이스**는 데이터를 고차원 임베딩 벡터로 저장하고, **벡터 사이의 유사도로** 검색·관리하는 데이터베이스다.

- 텍스트, 이미지, 오디오 같은 비정형 데이터를 숫자 벡터로 저장한다
- 코사인 유사도, 유클리드 거리로 검색한다
- **ANN**(Approximate Nearest Neighbor, 근사 최근접 이웃) 알고리즘으로 빠르게 찾는다. 위의 for문처럼 모든 문서와 일일이 비교하면 문서가 백만 개일 때 너무 느리다. ANN은 정확도를 아주 조금 양보하고 대신 훨씬 빨리 찾는다

```python
# 임베딩 => 스토어(저장)
```

```python
# 디비=> 꼭 데이터베이스를 써야 디비는 아님, 하나의 객체에 데이터를 담아서 메모리에 올려둬도 디비임
# 저장이 되어있으면 ! 
```

벡터 DB는 딥러닝과 함께 발전했다. 딥러닝 모델은 학습하면서 데이터의 특징을 뽑는 법(feature vector)을 배우고, 이 벡터를 공간에 놓으면 비슷한 데이터끼리 가까이 모인다. 그 거리를 이용해 검색하는 것이 벡터 DB이고, ChatGPT 이후 RAG가 퍼지면서 크게 주목받았다.

![벡터 데이터베이스 종류](/images/llm/fig-vector-database.png)

| 벡터 DB | 특징 |
|---|---|
| **Qdrant** | Rust로 만든 고성능 검색 엔진. 벡터 검색에 **메타데이터(payload) 필터**를 결합할 수 있다. 다음 글에서 쓴다 |
| **Pinecone** | 클라우드 완전 관리형 서비스. 가장 쉽게 시작할 수 있다 |
| **Chroma** | 오픈소스. AI 애플리케이션용으로 가볍게 쓰기 좋다 |
| **FAISS** | Meta(Facebook AI)의 벡터 검색 **라이브러리**. GPU와 벡터 양자화로 빠르다 |
| **Milvus** | 오픈소스, 분산 아키텍처. 대규모 데이터셋용 |
| **Weaviate** | 오픈소스, GraphQL API. 내장 ML 모듈로 의미 검색 |
| **Elasticsearch** | 기존 검색 엔진에 벡터 검색(HNSW)을 더했다. 키워드 + 벡터 **하이브리드 검색**에 강하다 |
| **PGVector** | PostgreSQL 확장. SQL과 벡터 연산을 함께 쓴다 |

```python
# 임베딩 벡터의 종류는 많음
# 제미나이, 클로드, 허깅페이스 등등
# 랭체인는 각각의 라이브러리를 하나의 방법(인터페이스)으로 제공

# 포문으로 임베딩?
```

## LangChain VectorStore

벡터 DB마다 API가 다른데, LangChain이 지원하는 벡터 DB는 모두 **VectorStore** 인터페이스를 구현한다. 그래서 LangChain에서는 벡터 DB를 Vector Store라고 부른다.

| 연결 방법 | 하는 일 |
|---|---|
| `VectorStore.from_documents(documents, embedding, …)` | 문서를 넣으면서 연결. DB가 없으면 만든다 |
| `VectorStore(embedding, …)` | 연결만 한다. 문서는 `add_documents()`로 넣는다 |

`InMemoryVectorStore`는 LangChain이 제공하는 메모리 기반 벡터 스토어다. dict에 저장하고 검색할 때 코사인 유사도를 계산한다. 서버 설치 없이 실습하기 좋고, 프로그램을 끄면 사라진다.

## 실습: 올림픽 문서로 RAG 한 바퀴

`data/olympic.txt`를 로드 → 분할 → 임베딩해서 저장 → 질문과 비슷한 조각을 찾아 → 답변 생성까지 해 본다.

```python
from langchain_community.document_loaders import TextLoader # 문서로드
from langchain_text_splitters import RecursiveCharacterTextSplitter # Chunking
from langchain_core.vectorstores import InMemoryVectorStore #메모리에 저장
from langchain_openai import OpenAIEmbeddings, ChatOpenAI # 임베딩모델
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from dotenv import load_dotenv
import os
load_dotenv()
```

```text
True
```

### 인덱싱

```python
############################################################
## 정보저장 - INDECXING (vector DB에 저장 )
############################################################

# 문서로드
path = "data/olympic.txt"
loader = TextLoader(path, encoding="utf-8")

# 청킹 (스플릿) = 문서나누기
splitter = RecursiveCharacterTextSplitter(chunk_size = 1000, chunk_overlap=50) #캐릭터, 디폴트, 리퀄시브
docs = loader.load_and_split(splitter)

print("로드 된 문서 갯수", len(docs))
docs[0] # 데이터/문서를 지속적으로 확인 (청킹이 잘 됐는지.)

# 전처리 작업 (예시 = metadata 추가.)


# vector DB에 저장
## embeddig model 및 vector stores 객체 생성 => Document들을 생성
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
# vector스토어 객체 생성 => vector DB와 연결
vectorstore = InMemoryVectorStore(
    embedding=embeddings
)

# chunking한 문서들을 저장 => list[Document] : page_content의 내용을 embedding vector로 변환 후 저장
# 저장하는 전체 로직을 "인덱싱" 한다고 함 => 임베딩의 최종목적은 임베딩 그 자체가 아니라, 가장 유사한 것을 찾기 위함
vectorstore.add_documents(docs) # 
```

```text
로드 된 문서 갯수 28

['35db76de-12ad-4fc8-844e-44d6a426afff',
 'c118f206-f045-4102-88a1-53d6c0eb78e7',
 'db6570f3-1f45-49af-93df-79232a22a9d1',
 … (28개, 생략)
```

1,000자 기준으로 나눠 28조각이 되었고(지난 글의 500자 기준은 61조각), `add_documents`가 조각마다 **UUID**를 붙여 돌려준다. 지난 글에서 `None`이던 Document의 `id`가 여기서 생긴다. 메모의 "임베딩의 최종 목적은 임베딩 자체가 아니라 가장 유사한 것을 찾기 위함"이 인덱싱의 의미다.

```python
# Document들을 저장하면서 연결
# vectorstore = InMemoryVectorStore.from_documents( #from_document DB연결 후 저장
#     embedding=embeddings,
#     documents=docs
# )
```

### 검색

```python
###############################################################################################
## 검색과 생성 - vector DB에서 질문과 관련된 문서를 조회 -> 프롬프트=질문+찾은 문서들 => LLM -> 응답
################################################################################################

# query = "IOC는 어떤 기관인가요?"
query = "올림픽이 취소된 경우가 있나요? 있다면 몇년도에 열린 몇회 올림픽인지, 그리고 취소 이유가 무엇인지 알려주세요."
result_docs = vectorstore.similarity_search( #similarity_search_with_score (검색결과, 유사도 점수)
    query, # 질문(질문을 emdedding vector로 변환 후 검색까지 처리
    k=5, # 유사도 높은 순서로 k를 반환. 반환할 문서 갯수
)
result_docs
```

```text
[Document(id='b09dc397-3e93-43bb-a9ed-69e018654410', metadata={'source': 'data/olympic.txt'}, page_content='국제 올림픽 위원회\n올림픽 활동이란 많은 수의 국가, 국제 경기 연맹과 협회 • 미디어 파트너를 맺기 • 선수, 직원, 심판, 모든 사람과 기관이 올림픽 헌장을 지키는 것을 말한다. 국제올림픽위원회(IOC)는 모든 올림픽 활동을 통솔하는 단체로서, … (생략)
```

```python
# Document id='b09dc397-3e93-43bb-a9ed-69e018654410', # 저장되면서 생긴 도큐먼트 아이디
# metadata={'source': 'data/olympic.txt'}, # 각 데이터의 고유 데이터 설명
# page_content= 유사도로 찾은 내용
```

`similarity_search`는 질문을 같은 임베딩 모델로 벡터로 바꾸고, 가장 가까운 k개 Document를 돌려준다. 질문 임베딩을 따로 만들 필요가 없다.

점수도 함께 받으려면 `similarity_search_with_score`를 쓴다.

```python
query = "IOC가 뭐야?"
result_docs = vectorstore.similarity_search_with_score( # (검색결과, 유사도 점수)
    query, # 질문(질문을 emdedding vector로 변환 후 검색까지 처리
    k=5, # 유사도 높은 순서로 k를 반환. 반환할 문서 갯수
)
result_docs
```

```text
[(Document(id='b09dc397-3e93-43bb-a9ed-69e018654410', metadata={'source': 'data/olympic.txt'}, page_content='국제 올림픽 위원회\n올림픽 활동이란 … 국제올림픽위원회(IOC)는 모든 올림픽 활동을 통솔하는 단체로서, … (생략)
```

결과가 `(Document, 점수)` 튜플 리스트다. 앞 절에서 본 것처럼 검색은 관련 없는 문서도 k개를 채워 돌려주므로, **점수가 일정 이상인 것만** 프롬프트에 넣는다.

```python
result_context = []
for doc, score in result_docs:
    if score >= 0.4:
        result_context.append(doc)
print(result_context)
```

```text
[Document(id='c5eee5ee-5b0a-4e37-9a57-1c1ee88c77bd', metadata={'source': 'data/olympic.txt'}, page_content='국제 올림픽 위원회\n올림픽 활동이란 많은 수의 국가, … 국제올림픽위원회(IOC)는 모든 올림픽 활동을 통솔하는 단체로서, … (생략)
```

(같은 문서인데 id가 위와 다르다. 인덱싱 셀을 다시 실행하면 같은 조각이 새 UUID로 한 번 더 저장되기 때문으로 보인다. `add_documents`를 반복 실행하면 중복 문서가 쌓이니 주의해야 한다.)

0.4라는 기준은 정해진 값이 아니다. 임베딩 모델마다 점수 분포가 다르므로 질문 몇 개로 점수를 찍어 보고 정한다.

### 생성

```python
# 프롬프트 구성 = 질문 + 검색할 문서들

prompt = ChatPromptTemplate.from_template(
    template = """<instruction>
당신은 친절한 QA Assistant입니다.
질문에 대해 주어진 context를 기반으로 답을 해주세요.
context에 질문과 관련된 내용이 없을 경우 "주어진 정보로는 답을 알 수 없습니다."라고 답을 하세요.
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

예) 
# 답변
최종 답변 내용

# 참조 내용
context에서 참조한 내용
</ouput-format>
"""
)

model = ChatOpenAI(model="gpt-5.4-mini")
chain = prompt | model | StrOutputParser()
```

```python
#Vector Store에서 조회한 결과(list[DOC]) DOC에서 필요한 정보(page_content, metadata)만 추출

context = '\n\n'.join(doc.page_content for doc in result_context)

result = chain.invoke({"query": query, "context":context})
print(result)
```

```text
# 답변
IOC는 **국제올림픽위원회**로, **모든 올림픽 활동을 통솔하는 단체**입니다. 올림픽 개최 도시 선정, 계획 감독, 종목 변경, 스폰서 및 방송권 계약 체결 등의 권리를 가집니다.¹

# 참조 내용
¹ “국제올림픽위원회(IOC)는 모든 올림픽 활동을 통솔하는 단체로서, 올림픽 개최 도시 선정, 계획 감독, 종목 변경, 스폰서 및 방송권 계약 체결 등의 권리가 있다.”
```

LangChain 기초 3편의 원칙이 그대로 들어간 RAG 프롬프트다. 태그로 구획을 나누고(`<instruction>`, `<context>`), "context에 없으면 모른다고 하라"는 제약을 걸고, **참조한 부분을 각주로** 달게 했다. 답의 근거가 context의 한 문장으로 그대로 확인된다. 사용자가 답을 검증할 수 있게 하는 것, 이것이 RAG가 할루시네이션을 줄이는 방식이다.

> **보충** 출력 형식 태그가 `<output-format>`으로 열리고 `</ouput-format>`(t 빠짐)으로 닫혀 짝이 맞지 않는다. LLM은 이 정도는 알아서 해석하지만, 프롬프트 태그도 코드처럼 짝을 맞춰 두는 편이 안전하다.

## MMR: 비슷한 문서만 몰리지 않게

**MMR**(Maximal Marginal Relevance, 최대 한계 관련성)은 검색 결과의 **관련성**과 **다양성**을 함께 고려한다.

```python
# 문제상황
# 유사도를 측정해서 5개의 문서를 가져왔는데 5개의 문서가 똑같은 수준으로 비슷함
# 그럼 1개만 있음 되는데, 5개를 불러오는 손해를 겪음
# 기존에 뽑힌 문서와 유사도가 높을 경우 패널티를 줌 
# 기본적으로 질문과의 유사도로 사용, 기존에 있던 답과의 패널티를 합산해서 사용
# 그래서 비중을 조절해야함
```

$$
\text{MMR} = \lambda \cdot \text{Sim}(d, Q) - (1 - \lambda) \cdot \max_{d' \in D'} \text{Sim}(d, d')
$$

- $\text{Sim}(d, Q)$: 문서 $d$와 질문 $Q$의 유사도 (관련성)
- $\max_{d' \in D'} \text{Sim}(d, d')$: 이미 뽑힌 문서들 $D'$ 중 $d$와 가장 비슷한 것과의 유사도 (중복도, **패널티**)
- $\lambda$: 둘의 비중. 1이면 관련성만, 0이면 다양성만 본다

`max_marginal_relevance_search()`의 파라미터:

| 파라미터 | 내용 |
|---|---|
| `k` | 최종으로 고를 문서 수 |
| `fetch_k` | 먼저 유사도로 뽑을 **후보** 수. 이 중에서 MMR로 k개를 고른다 |
| `lambda_mult` | 위 식의 λ |
| `filter` | 메타데이터 조건 |

```python
#### 3. 문서 검색 최적화: 중복 제거 및 다양성 확보 (MMR)

# 단순히 유사한 문서만 가져오면 내용이 겹쳐 비효율적입니다.
# MMR(Maximal Marginal Relevance) 알고리즘을 사용해 
# '질문과의 관련성'은 높이면서 '기존에 뽑힌 문서와는 다른' 문서를 선택합니다.

# k: 최종적으로 가져올 문서 개수
# fetch_k: 후보군을 먼저 뽑을 개수 (후보군이 많을수록 다양성 확보에 유리)
# lambda_mult: 0~1 사이 값 (1에 가까울수록 관련성, 0에 가까울수록 다양성 중시)
docs = vectorstore.max_marginal_relevance_search(
    query="질문 내용 입력", 
    k=3,             
    fetch_k=10,      
    lambda_mult=0.5  
)

# 최종 선택된 문서들의 내용 확인
for i, doc in enumerate(docs):
    print(f"--- 문서 {i+1} ---")
    print(doc.page_content[:200]) # 앞부분 200자만 출력하여 확인
```

```text
--- 문서 1 ---
논란
--- 문서 2 ---
1990년대 후반, 여러 뜻있는 사람들이 도핑과의 전쟁을 선포하면서 1999년에 세계반도핑기구(WADA)를 설립한다. 2000년 하계 올림픽과 2002년 동계 올림픽 때는 약물 양성 반응을 보인 선수들이 급격히 증가했고, 역도와 크로스컨트리에서는 몇몇 선수들이 도핑 테스트에 걸려서 실격되기도 했다. 2006년 동계 올림픽 때는 메달리스트 한 명이 양성반응을
--- 문서 3 ---
선수들의 안전을 보장받지 못한다는 이유로 올림픽에 불참했다. 소련의 한 관계자는 그들이 올림픽 보이콧을 한 것에 대해 다음과 같은 발언을 통해 지지했다.
```

`query`에 자리표시 문구 **"질문 내용 입력"이 그대로** 들어가서, 그 문구와 그나마 가까운 "논란", 도핑, 보이콧 조각이 나왔다. LangChain 기초 3편의 `{query}` 실수처럼 에러 없이 그럴듯한 결과가 나오는 경우다. 1위 조각이 "논란" 두 글자뿐인 것도 보인다. 섹션 제목만 따로 떨어져 나온 조각으로, 분할 단계에서 생긴 **쓸모없는 조각**이다.

실제 질문으로 MMR과 일반 검색을 비교한다.

```python
query = "IOC는 어떤 기관인가요"
result_docs_mmr = vectorstore.max_marginal_relevance_search(
    query=query, k=5, fetch_k=15, # 다양성 계산을 위해서 상위 몇개 문서를 조회할지
    lambda_mult=0.5  # 관련성과 다양성 사이의 비율
)
for doc in result_docs_mmr:
    print(doc.page_content[:50])
    print('-'*100)
```

```text
국제 올림픽 위원회
올림픽 활동이란 많은 수의 국가, 국제 경기 연맹과 협회 • 미디어 파
----------------------------------------------------------------------------------------------------
논란
----------------------------------------------------------------------------------------------------
선수들의 안전을 보장받지 못한다는 이유로 올림픽에 불참했다. 소련의 한 관계자는 그들이 올
----------------------------------------------------------------------------------------------------
국제 올림픽 위원회(이하 IOC로 지칭)는 몇몇 위원들이 한 행위에 대해서 비판을 받고 있
----------------------------------------------------------------------------------------------------
1990년대 후반, 여러 뜻있는 사람들이 도핑과의 전쟁을 선포하면서 1999년에 세계반도핑
----------------------------------------------------------------------------------------------------
```

```python
for doc2 in vectorstore.similarity_search(query=query, k=5):
    print(doc2.page_content[:50])
    print('-'*100)
```

```text
국제 올림픽 위원회
올림픽 활동이란 많은 수의 국가, 국제 경기 연맹과 협회 • 미디어 파
----------------------------------------------------------------------------------------------------
또한 20세기에 올림픽 운동이 발전함에 따라, IOC는 변화하는 세계의 사회 환경에 적응해
----------------------------------------------------------------------------------------------------
2004년 10월과 11월에 IOC는 '올림픽 프로그램 위원회'(Olympic Progra
----------------------------------------------------------------------------------------------------
개최지 선정
올림픽 개최지는 해당 올림픽 개최 7년 전에 IOC 위원들의 투표로 결정된다.
----------------------------------------------------------------------------------------------------
올림픽 경기 종목
올림픽 경기 종목은 총 33개부문 52개 종목에서 약 400개의 경기로 
----------------------------------------------------------------------------------------------------
```

| 순위 | similarity_search | MMR (λ=0.5) |
|---|---|---|
| 1 | IOC 조직 설명 | IOC 조직 설명 |
| 2 | IOC의 변화 적응 | "논란" (제목만 있는 조각) |
| 3 | 올림픽 프로그램 위원회 | 보이콧 |
| 4 | 개최지 선정 (IOC 투표) | IOC 위원 비판 |
| 5 | 경기 종목 | 도핑 |

1위는 같다. 일반 검색은 IOC의 **역할**(변화 적응, 프로그램 위원회, 개최지 선정)에 몰렸고, MMR은 1위와 겹치지 않도록 **논란 쪽**(보이콧, 비판, 도핑)으로 넓혔다. "IOC는 어떤 기관인가"에는 일반 검색 결과가 더 맞고, MMR은 다양성을 위해 관련성이 낮은 "논란" 조각까지 끌어왔다. λ=0.5는 이 질문에는 다양성 쪽으로 너무 기울었다. MMR은 "올림픽의 장단점"처럼 **여러 측면을 모아야 하는 질문**에 맞고, 정의를 묻는 질문에는 λ를 0.7 이상으로 올리거나 일반 검색이 낫다.

## LangSmith로 추적하기

RAG는 단계가 많아서 답이 이상할 때 어디가 문제인지 찾기 어렵다. LangChain 기초 1편에서 소개한 LangSmith는 환경변수만 설정하면 체인 실행 과정을 자동으로 기록한다.

```python
import os

# 환경 변수를 코드에서 즉시, 직접 설정합니다.
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
os.environ["LANGCHAIN_PROJECT"] = "SKN31"

# 이제 확인해보면 None이 아니라 값이 제대로 나올 겁니다.
print("TRACING:", os.environ.get("LANGCHAIN_TRACING_V2"))
print("PROJECT:", os.environ.get("LANGCHAIN_PROJECT"))
```

```text
TRACING: true
PROJECT: SKN31
```

```python
# 랭스미스
# 프로젝트 관리 + 이벨류에이션 하는 곳이었는데, 지금은 기능이 많음

# 프로젝트 생성 api키 발급 => env 복붙
```

```python
# langfuse는 무료
```

API 키(`LANGCHAIN_API_KEY`)는 코드에 쓰지 않고 `.env`에 넣어 둔다. 트레이싱을 켜면 LangSmith 화면에서 질문 → 검색된 문서 → 실제 프롬프트 → 응답 → 토큰·시간이 단계별로 보인다. 위의 "질문 내용 입력" 같은 실수도 검색 단계의 입력을 보면 바로 잡힌다. Langfuse는 같은 일을 하는 오픈소스 대안이다.

## 무엇을 쓸까

| 상황 | 선택 |
|---|---|
| 실습, 프로토타입, 문서 수천 개 이하 | `InMemoryVectorStore` (재시작하면 사라짐) |
| 서비스, 메타데이터 필터가 필요 | Qdrant, Chroma 같은 벡터 DB |
| 이미 PostgreSQL을 쓴다 | PGVector |
| 키워드 일치도 중요하다 (제품 코드, 법 조항 번호) | Elasticsearch 같은 하이브리드 검색 |
| 관련 없는 문서가 끼어든다 | `similarity_search_with_score` + 점수 기준 |
| 비슷한 조각이 중복돼서 나온다 | MMR (`fetch_k` 넉넉히, λ 0.5~0.7) |
| 답이 이상한 원인을 찾는다 | LangSmith / Langfuse 트레이싱 |

## 정리

- **임베딩**은 문장을 고정 길이 벡터로 바꾼다. 문서는 `embed_documents`, 질문은 `embed_query`로, **같은 모델**로 바꿔야 비교할 수 있다
- 유사도는 주로 **코사인 유사도**(1에 가까울수록 비슷)를 쓴다. 검색은 관련 없는 질문에도 항상 k개를 돌려주므로 **점수 기준 필터**가 필요하다
- 임베딩은 문맥이 짧으면 헷갈린다("아이폰" → 과일 Apple). 메타데이터 필터로 보완한다
- **벡터 DB**는 ANN 알고리즘으로 대량의 벡터에서 빠르게 찾는다. LangChain에서는 모두 VectorStore 인터페이스(`add_documents`, `similarity_search`)로 쓴다
- RAG 한 바퀴는 로드 → 분할 → `add_documents` → `similarity_search` → 프롬프트(context + question) → LLM이다. **"context에 없으면 모른다고 하라"와 참조 각주**가 할루시네이션을 줄인다
- **MMR**은 관련성과 다양성을 함께 본다. 여러 측면을 모아야 할 때 쓰고, 정의형 질문에는 일반 검색이 낫다
