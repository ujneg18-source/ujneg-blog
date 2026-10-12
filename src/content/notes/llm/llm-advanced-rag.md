---
title: "Advanced RAG: 검색 품질을 높이는 기법들"
description: "기본 RAG의 한계와 Advanced RAG의 고도화 지점을 정리하고, 올림픽 위키 문서로 Cross-encoder Rerank(ContextualCompressionRetriever), HyDE, MultiQueryRetriever, MapReduce 문서 선별, SelfQueryRetriever를 직접 구현해 기본 검색과 결과를 비교합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'RAG'
seriesOrder: 5
originalNotebook: "09_AdvancedRAG.ipynb"
tags: ["LLM","RAG"]
date: 2026-07-02T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-advanced-rag.webp'
---

> SKN31 AI Agent 과정 노트북 `09_AdvancedRAG.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 Docker로 띄운 Qdrant 서버에서 실행한 결과입니다. 검색 결과는 Document 전체 대신 섹션 헤더만 정리해서 실었습니다.

## 이 글에서 다루는 것

- 기본 RAG(Naive RAG)의 문제와 Advanced RAG의 고도화 지점
- **Rerank**: Cross-encoder로 검색 결과 순위 다시 매기기
- **HyDE**: 가상의 답변으로 검색하기
- **MultiQuery**: 질문을 여러 개로 바꿔 검색하기
- **MapReduce**: LLM으로 관련 문서만 골라내기
- **Self-Query**: 질문에서 메타데이터 필터를 자동으로 뽑기

## Advanced RAG

**기본 RAG**(Naive RAG)는 실무에서 이런 문제가 생긴다.

- "비슷한 것"은 찾는데 **정답 근거**는 못 찾는다
- 근거가 있어도 LLM이 할루시네이션을 섞거나 근거와 다르게 답한다
- 문서가 길고 복잡해서 정답에 필요한 부분을 LLM이 못 찾는다

**Advanced RAG**는 이 문제를 **DB 구축, 검색 전, 검색 후, 생성** 단계에서 고도화하는 설계 패턴이다. 기본 RAG가 "대충 찾아 준 참고자료로 글을 쓰는 것"이라면, Advanced RAG는 "사서(검색) + 편집자(정제) + 팩트체커(검증) + 작가(생성)"의 협업이다.

| 단계 | 기법 |
|---|---|
| **검색 품질** | 하이브리드 검색(BM25 + 벡터), 쿼리 재작성·멀티 쿼리, 메타데이터 필터, **리랭킹** |
| **Chunking·인덱싱** | 구조 기반 분할(헤더·섹션·표·코드), 계층형 인덱스(요약 → 섹션 → chunk, Parent-Child), 앞뒤 문맥 윈도우 확장 |
| **정제·조립** | 중복·노이즈 제거, 관련 부분만 발췌, 질문 관점으로 재구성 |
| **생성 신뢰성** (가드레일) | 근거 없으면 "모른다", 인용·근거 표시, 답한 뒤 근거와 모순 없는지 자기검증, 애매하면 되묻기 |

필요한 경우는 문서가 많고 구조가 복잡할 때(매뉴얼, 규정, 기술 문서), 질문이 비교·조건·절차를 요구할 때, 정확성이 중요할 때(정책, 금융, 의료, 보안), 그리고 **근거 있는 답**이 필수일 때다.

이 시리즈에서 이미 쓴 것도 있다. 하이브리드 검색과 메타데이터 필터(3편), 구조 기반 분할(1편의 MarkdownHeaderTextSplitter), "모르면 모른다"와 각주(2편)다. 이번 글은 나머지 검색 단계 기법들이다.

## 준비

```python
###############################################################
# VectorStore, Retriever 준비
###############################################################
from dotenv import load_dotenv

load_dotenv()
```

```python
from langchain_text_splitters import MarkdownHeaderTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from langchain_openai import ChatOpenAI
from langchain_qdrant import FastEmbedSparse, QdrantVectorStore, RetrievalMode
from qdrant_client import QdrantClient, models
from qdrant_client.models import Distance, SparseVectorParams, VectorParams
from langchain_openai import OpenAIEmbeddings
```

지난 글과 같은 하이브리드 컬렉션을 함수로 묶었다.

```python
# ##############################################################
# 데이터 준비
##############################################################

def load_and_split_olympic_data(file_path="data/olympic_wiki.md"):
    """
    올림픽.MD 문서를 읽어와서 마크다운 해더를 이용해서 분할
    """
    with open(file_path, "r", encoding="utf-8") as fr:
        olympic_text = fr.read()

    # Split
    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
        ],
        # strip_headers=False, # 문서에 header 포함 여부(default: True - 제거)
    )

    return splitter.split_text(olympic_text)
```

```python
#################################################################
# Vector DB 연결
# retriever 생성
#################################################################

# collection 삭제후 생성 (데이터 넣지는 않음)
def get_vectorstore(collection_name: str = "olympic_info_wiki"):

    #######################################
    # Qdrant Collection 생성 (sparse + dense)
    #######################################
    dense_embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
    sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")

    client = QdrantClient(host="localhost", port=6333)

    #삭제후 생성
    if client.collection_exists(collection_name):
        result = client.delete_collection(collection_name=collection_name)

    client.create_collection(
        collection_name=collection_name,
        vectors_config={"dense": VectorParams(size=3072, distance=Distance.COSINE)},
        sparse_vectors_config={ 
            "sparse": SparseVectorParams()
        },
    )

    ######################################
    # VectorStore 생성 (Hybrid 모드)
    ######################################
    vector_store = QdrantVectorStore(
        client=client,
        collection_name=collection_name,
    
        embedding=dense_embeddings,
        
        sparse_embedding=sparse_embeddings,
        retrieval_mode=RetrievalMode.HYBRID,
    
        vector_name="dense",
        sparse_vector_name="sparse",
    )
    
    ######################################
    # Document들 추가
    ######################################
    documents = load_and_split_olympic_data()
    vector_store.add_documents(documents=documents)

    return vector_store


def get_retriever(vector_store, k: int = 5):
    retriever = vector_store.as_retriever(
        search_kwargs={"k": k}
    )
    return retriever
```

(주석은 "데이터 넣지는 않음"인데 함수 끝에서 `add_documents`로 문서를 넣는다. 주석과 실제 동작이 다르니 주의한다.)

```python
vector_store = get_vectorstore()
basic_retriever = get_retriever(vector_store, k=5)
basic_retriever.invoke("근대 올림픽은 언제 시작했나요?")
```

```text
H1 올림픽 (개요)
H1 올림픽 > H2 고대 올림픽
H1 올림픽 > H2 근대 올림픽 > H3 하계 올림픽
H1 올림픽 > H2 근대 올림픽 > H3 동계 올림픽
H1 올림픽 > H2 논란 > H3 폭력 및 전쟁
```

(검색된 Document 5개의 헤더만 정리했다.) "1896년 아테네에서 제1회"는 1위인 개요 섹션에 있다.

## Rerank

```python
# 이 순위를 다시 정하는 것이 rerank
# 질문에 대한 답변에 관한 유사도를 다시 계산함 (더 유사한 순위로)
# 이 때 사용하는 것이 cross-encoder 모델
```

- RAG의 정확도는 관련 정보가 context에 **있느냐**보다 **어디에 있느냐**가 중요하다. 관련 정보가 **상위**에 있을 때 답이 좋다
- **Rerank**는 1차 검색으로 뽑은 후보들의 순위를 더 정밀한 모델(Cross-encoder, LLM)로 **다시 매긴다**

```python
# 상위권에 있는 컨텍스트일 수록 좋은 답변을 올릴 수 있음
# 프롬프트 작성시, 두괄식으로 작성해야 좋음.
```

### Bi-encoder vs Cross-encoder

![Bi-encoder와 Cross-encoder](/images/llm/fig-bi-cross-encoder.png)

\[출처: https://aws.amazon.com/ko/blogs/tech/korean-reranker-rag/\]

| | Bi-encoder | Cross-encoder |
|---|---|---|
| 입력 | 질문과 문서를 **따로** 인코딩 | 질문과 문서를 **한 쌍으로 함께** 입력 |
| 출력 | 각자의 임베딩 벡터 → 코사인 유사도 | 둘의 관련성 점수 하나 |
| 장점 | 문서 벡터를 미리 계산해 둘 수 있어 **빠르다** | 두 문장을 같이 보며(Self-Attention) 판단해 **정확하다** |
| 단점 | 질문과 문서의 상호작용을 못 본다 | 질문마다 문서 쌍을 전부 다시 계산해 **느리다** |
| 쓰임 | 1차 검색 (벡터 DB) | 2차 재정렬 (후보 수십 개) |

NLP 시리즈의 Transformer로 보면, Bi-encoder는 두 문장을 각각 Encoder에 넣는 것이고 Cross-encoder는 `[질문] [SEP] [문서]`를 한 입력으로 넣어 Attention이 질문과 문서 사이를 오가게 하는 것이다. 그래서 정확하지만 문서를 미리 계산해 둘 수 없다. 둘을 **빠른 1차 검색(넉넉히) → 정밀한 2차 재정렬(상위 n개)** 으로 나눠 쓴다. LLM에게 순위를 매기게 하는 LLM 기반 Rerank도 있는데, 더 정확하지만 비싸고 느리다.

### ContextualCompressionRetriever

검색된 문서에 질문과 관련 없는 것이 섞이면 답이 나빠지고 비용도 든다. **Contextual Compression**(맥락적 압축)은 검색 결과를 질문 맥락으로 압축한다. 각 문서에서 핵심 문장만 남기는 **내용 압축**과, 관련 없는 문서를 버리는 **문서 필터링**이 있다. **Rerank는 문서 필터링 방식**이다. 기본 Retriever로 넉넉히 찾고, 압축기(Reranker)로 순위를 다시 매겨 상위 n개만 남긴다.

```python
from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder

retriever = get_retriever(vector_store, k=10) # Rerank를 사용할 경우에는 문서 검색 개수를 크게 한다.

# reranker 모델을 Hugging Face에서 제공하는 cross-encoder 모델을 사용 => 모델 중에서 id에 reranker가 있는 모델들

reranker_model_id = "BAAI/bge-reranker-v2-m3"

reranker = HuggingFaceCrossEncoder(model_name=reranker_model_id)
```

```text
config.json:   0%|          | 0.00/795 [00:00<?, ?B/s]
model.safetensors:   0%|          | 0.00/2.27G [00:00<?, ?B/s]
… (생략)
```

`bge-reranker-v2-m3`는 BAAI가 공개한 다국어 Cross-encoder로 2.27GB다. 로컬에서 돌아가서 API 비용은 없다.

```python
# 압축기 - ReRanker 모델을 이용한 압축기
compressor = CrossEncoderReranker(model=reranker, top_n=5)
compressor_retriever = ContextualCompressionRetriever(
    base_retriever=retriever, # 기본 retriever => bi-encoder 모델을 이용하여 검색된 문서
    base_compressor=compressor)  #기본 retriever 검색한 문서들을 압축기 모델을 이용하여 재정렬
```

```python
query = "올림피에서 발생한 다양한 논란들에 대해서 정리해줘"
basic_result = retriever.invoke(query)
rerank_result = compressor_retriever.invoke(query)
```

(질문의 "올림피"는 "올림픽" 오타다.)

| 순위 | 기본 검색 (k=10) | Rerank (상위 5) |
|---|---|---|
| 1 | IOC > 비판 | 개요 |
| 2 | 개요 | 상업화 > 비판 |
| 3 | 논란 > 정치 | 논란 > 폭력 및 전쟁 |
| 4 | 상업화 > 행사 | IOC > 비판 |
| 5 | 상업화 > 비판 | 상업화 > 행사 |
| 6 | 논란 > 폭력 및 전쟁 | |
| 7 | IOC (기구 설명) | |
| 8 | 논란 > 약물 복용 | |
| 9 | 상업화 > 상징 | |
| 10 | 개최지 선정 | |

Reranker가 10개 중 5개를 골라 순서를 다시 매겼다. 1위로 올린 개요 섹션에는 "보이콧, 도핑, 심판 매수, 테러와 같은 수많은 일들"이라는 논란 **요약 문장**이 있어서, 질문 전체와의 관련성으로는 납득이 간다. 다만 **"논란 > 정치"와 "논란 > 약물 복용"이 빠지고 "상업화 > 행사"(개막식 설명)가 남은 것**은 아쉽다. Rerank가 항상 사람의 기대대로 고르지는 않는다. 그래서 1차 검색 품질이 낮으면 효과가 제한적이고, 실서비스에서는 평가 데이터로 효과를 확인하고 써야 한다(다음 글).

## HyDE

**HyDE**(Hypothetical Document Embedding)는 질문으로 **가상의 답변 문서**를 먼저 만들고, 그 가상 답변을 임베딩해서 검색한다.

- "파리는 어떤 도시인가?"(질문)와 "파리는 프랑스의 수도이며…"(문서)는 의미는 관련 있지만 **문장 형태가 달라서** 임베딩 공간에서 멀 수 있다
- 질문 대신 **답변 모양의 문장**으로 검색하면 저장된 문서(역시 답변 모양)와 가까워진다

| 단계 | 하는 일 |
|---|---|
| 1. 가상 문서 생성 | LLM이 질문에 대한 가상 답변을 쓴다 (좋은 모델일수록 좋다) |
| 2. 임베딩 | 가상 답변을 벡터로 |
| 3. 검색 | 그 벡터로 **실제** 문서를 찾는다 |
| 4. 답변 | 찾은 **실제** 문서로 최종 답을 만든다 |

장점은 질문 표현 방식에 덜 민감하다는 것이고, 단점은 가상 문서 품질에 따라 성능이 흔들리고(할루시네이션이 섞일 수 있다) LLM 호출이 한 번 더 든다는 것이다.

```python
# HyDE => 질문이 들어오면 LLM이 먼저 답변을 생성하고, 그 답변을 기반으로 문서 검색을 수행하는 방법

# 그후 다시 LLM에게 질문과 검색된 문서를 함께 입력으로 주어 답변을 생성하는 방법

# 가상답변은 할루시네이션의 문제가 있기 때문에 높은 모델을 사용하는게 좋음
```

```python
# HyDE(파이프라인(체인구성))

model = ChatOpenAI(model="gpt-5.4-mini")
parser = StrOutputParser()

hyde_prompt = ChatPromptTemplate.from_template(
    template= """
    <instruction>
    다음 질문에 대한 완전하고 상세한 답변을 사실에 기반해서 작성해주세요.
    질문과 관련된 내용으로 답변을 작성합니다.
    질문과 직접적인 연관성이 없는 내용은 절대 포함시키지 않습니다.
    답변은 1000글자 이내로 작성합니다.
    </instruction>
    <question>
    {query}
    </question>
    """
)

hyde_chain = hyde_prompt | model | parser
```

```python
# 결과 확인 
query = "올림픽에서 발생한 다양한 논란들에 대해 정리해줘"
hyde_chain.invoke({"query":query})
```

```text
'올림픽에서 발생한 논란은 시대와 종목에 따라 매우 다양하지만, 크게 보면 **정치적 논란, 판정 논란, 도핑·자격 논란, 인권·윤리 논란, 개최 과정의 논란**으로 나눌 수 있습니다. 아래에 관련된 주요 사례들을 사실에 근거해 정리하겠습니다.\n\n---\n\n## 1. 정치적 논란\n\n### 1) 1936년 베를린 올림픽과 나치 선전\n- 독일 나치 정권은 베를린 올림픽을 정권의 선전 수단으로 활용했습니다.\n… (생략) …\n### 2) 냉전 시대의 보이콧\n- **1980 모스크바 올림픽**: 소련의 아프가니스탄 침공에 항의해 미국을 포함한 여러 나라가 보이콧했습니다.\n… (생략)'
```

가상 답변은 LLM이 **자기 지식으로** 쓴 것이다. 나치 선전, 냉전 보이콧, 뮌헨 테러처럼 위키 문서에 실제로 있을 법한 표현이 많이 들어 있어서 검색어로는 좋다. 이 답 자체는 사용자에게 보여 주지 않는다.

```python
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

# 모델 생성
model = ChatOpenAI(model="gpt-5.4-mini", temperature = 0)

# parser 생성
parser = StrOutputParser()


chain = (
    {
        "context": hyde_chain | basic_retriever | format_str,
        "query": RunnablePassthrough(),
    }
    | prompt
    | model
    | parser
)
```

지난 글의 RAG 체인에서 `"context"` 쪽에 `hyde_chain |`만 앞에 붙였다. 질문 → 가상 답변 → (그 답변으로) 검색 → 문자열로 합치기 순서다.

```python
result = chain.invoke({"query":query})
print(result)
```

```text
# 답변
올림픽에서 발생한 다양한 논란은 다음과 같이 정리할 수 있습니다.

1. **정치적 이용 논란**  
   올림픽은 본래의 이념과 달리 정치나 체제 선전의 장으로 이용된 경우가 있었습니다. 예를 들어 1936년 하계 올림픽에서 나치독일은 자신들의 체제를 미화하고 아리안족의 우월함을 보여주려 했습니다. 또 1968년 멕시코 시티 올림픽에서는 토미 스미스와 존 카를로스가 시상식에서 블랙 파워 설루트를 하며 정치적·사회적 메시지를 표현했습니다.[^1][^2]

2. **상업화와 기업 후원 논란**  
   … (생략) …

3. **개최도시의 비용 부담과 IOC 수익 독점 논란**  
   … (생략) …

4. **보이콧, 도핑, 심판 매수, 테러 등의 문제**  
   올림픽을 둘러싸고 보이콧, 도핑, 심판 매수, 테러 같은 사건들이 발생했으며, 이러한 문제들이 올림픽 논란의 일부로 언급되었습니다.[^6]
… (생략) …

# 참조 내용
… [^7]: “현재 이란 정부는 이스라엘과의 어떤 경기 경쟁이든 피하고 있다. 2008년 하계 올림픽 때 이란의 수영 선수는 이스라엘 수영 선수와 같이 경기한다는 이유로 경기를 포기했으며... (생략)
```

가상 답변에는 판정 논란, 인권 논란처럼 위키 문서에 없는 내용도 있었지만, 최종 답은 **검색된 실제 문서**만 근거로 했다(각주 7개가 모두 위키 원문). HyDE의 할루시네이션 위험은 검색어 단계에 머물고 답변까지 넘어오지 않는다.

> **보충** 이 체인은 `{"query": query}` dict로 호출했는데, `"query": RunnablePassthrough()`는 입력 dict를 **통째로** 넘긴다. 그래서 프롬프트의 `{query}` 자리에는 질문 문자열이 아니라 `{'query': '올림픽에서…'}`라는 dict 표현이 들어간다. LLM이 알아서 읽어 답은 잘 나왔지만, 정확히 하려면 `"query": itemgetter("query")`로 꺼내거나 체인을 문자열로 호출한다.

## MultiQueryRetriever

질문 하나를 **여러 표현의 질문**으로 바꿔 각각 검색하고 합친다. 사용자 질문 하나의 표현 한계를 보완한다.

- 원본: "딥러닝의 장점은 무엇인가?"
- 생성: "딥러닝이 전통적인 머신러닝보다 나은 점은?", "딥러닝을 사용하면 얻을 수 있는 이익은?", "딥러닝의 주요 강점과 특징은?", …

| 단계 | 하는 일 |
|---|---|
| 1. 질문 생성 | LLM이 원본을 3~5개 질문으로 바꾼다 |
| 2. 병렬 검색 | 질문마다 따로 검색한다 |
| 3. 통합 | 결과를 합친다 |
| 4. 중복 제거 | 여러 번 나온 문서는 하나로 |
| 5. 답변 | 합친 문서로 답한다 |

더 포괄적으로 찾지만, LLM 호출과 검색이 여러 번이라 비용·시간이 늘고, 생성된 질문이 엇나가면 노이즈도 늘어난다.

```python
from langchain_classic.retrievers.multi_query import MultiQueryRetriever

mq_retriever = MultiQueryRetriever.from_llm(
    retriever=basic_retriever, # 질문들을 생성한 다음에 문서를 검색할 Retriever
    llm=ChatOpenAI(model="gpt-5.4-mini")
    # prompt = 질문을 만들 때 사용할 PromptTemplate을 직접 넣는다.
)
```

```python
print(query)
dummy_result = mq_retriever.invoke(query)
print(dummy_result)
```

```text
올림픽에서 발생한 다양한 논란들에 대해 정리해줘
```

검색 결과 11개의 헤더:

```text
상업화 > 행사
논란 > 폭력 및 전쟁
올림픽 (개요)
논란 > 정치
논란 > 보이콧
논란 > 약물 복용
IOC > 비판
상업화 > 비판
개최지 선정
고대 올림픽
올림픽 경기 종목 > 아마추어 정신과 프로 선수들의 참가
```

basic_retriever는 k=5인데 **11개**가 나왔다. 생성된 질문 여러 개가 각각 5개씩 찾고, 중복을 뺀 합집합이다. 기본 검색(k=10)과 Rerank에서 빠졌던 **"논란 > 보이콧"이 이번에 들어왔고** "정치", "약물 복용"도 있다. 논란 섹션 4개가 모두 잡혔다. 대신 고대 올림픽, 아마추어 정신처럼 덜 관련된 것도 섞였다.

```python
mq_chain = {
    "context": mq_retriever | format_str,
    "query": RunnablePassthrough(),

} | prompt | model | parser
res = mq_chain.invoke({"query":query})
pprint(res)
```

```text
('# 답변\n'
 '올림픽에서 발생한 다양한 논란들은 크게 다음과 같이 정리할 수 있습니다.\n'
 '\n'
 '1. **정치적 이용과 선전 논란**  \n'
 '   올림픽은 원래 정치와 분리된 평화의 장을 지향했지만, 실제로는 정치나 체제 선전에 이용된 사례가 있었습니다. 예를 들어 1936년 '
 '하계 올림픽에서는 나치독일이 자국 체제의 선전과 아리안족 우월성을 드러내려 했고, … (생략)'
 '3. **개최지 선정과 뇌물 스캔들**  \n'
 … (생략) …
 '[^4]: “올림픽에서 첫 번째 보이콧은 1956년 하계 올림픽에서 시작되었다...” / “1980년과 1984년 올림픽 때는 냉전의 '
 '당사국들이 각각 반대진영에서 개최된 올림픽에 불참했다.”\n'
 '[^5]: “테러도 올림픽에서 공포의 대상이었다. 뮌헨 참사로 알려진 1972년에 ...” / …\n'
 '[^6]: “20세기 초반, 많은 운동 선수들은 기록향상을 위해 약물을 복용하기 시작했다...” / … “1990년대 후반, 여러 뜻있는 '
 '사람들이 도핑과의 전쟁을 선포하면서 1999년에 세계반도핑기구(WADA)를 설립한다.”\n'
 '[^7]: “현재 이란 정부는 이스라엘과의 어떤 경기 경쟁이든 피하고 있다...”\n'
 '[^8]: “쿠베르탱의 생각과는 달리, 올림픽이 세계에 완벽한 평화를 가져다주지는 못했다. … (생략)')
```

각주가 8개로 늘었다. HyDE 답변에서는 "보이콧, 도핑, 심판 매수, 테러" 한 줄로 묶였던 **보이콧(1956년 첫 보이콧, 1980·1984 냉전 보이콧)** 과 **도핑(WADA 설립)** 이 각각 근거를 달고 별도 항목이 되었다. "다양한 논란을 정리해 줘"처럼 **여러 측면을 모아야 하는 질문**에서 MultiQuery가 강하다.

## MapReduce

검색된 문서 하나하나를 LLM에게 "이게 질문에 도움이 되나?" 물어서 **관련 있는 것만** 남긴다.

| 단계 | 하는 일 |
|---|---|
| **Map** | 벡터 검색으로 후보 문서를 찾는다(관련 없는 것도 섞여 있다) |
| **Reduce** | 문서마다 LLM이 관련성을 판단해 걸러 내고 합친다 |
| **Generate** | 남은 문서로 최종 답을 만든다 |

정확도가 높고 노이즈가 줄고 토큰이 아껴지지만, 문서 수만큼 LLM을 더 부르니 비용과 시간이 늘고, 품질이 LLM의 판단력에 달린다.

```python
# map => 연산을 각각 RAG에 맵핑시킨다. 
```

```python
# Reduce Chain: 질문과 문서간의 직접적인 연관성이 있는지를 판단해서 연관된 문서만 반환한다.

reduce_prompt = ChatPromptTemplate.from_template(
    template = """<instruction>
    context의 내용과 질문과 관련성이 있으면 입력된 context를 그대로 반환하고,
    관련성이 없으면 아무것도 출력하지 않는다
    - 관련성 판단기준
    - Context 에 질문에 대한 직접적인 답이니다 답을 위한 단서가 있어야 한다.
    - Context 의 내용이 질문을 해결하는데 도움을 줘야 한다.

</instruction>

# RAG
<context>
{context}
</context>

# INPUT
<query>
{query}
</query>


"""
)


reduce_chain = reduce_prompt | model | parser
```

```python
res = reduce_chain.invoke({"context":"1회 올림픽은 그리스 아테네에서 열렸습니다.", "query":"올림픽 종목에 대해 알려줘."} )
res
```

```text
''
```

1회 올림픽 장소는 종목 질문과 관련이 없으니 **빈 문자열**을 돌려줬다. 관련 있으면 원문을 그대로 돌려준다. 판단 결과를 "예/아니오"가 아니라 **원문 또는 빈 문자열**로 받게 해서, 결과를 이어 붙이기만 하면 걸러진 context가 된다.

```python
from langchain_core.runnables import chain
from langchain_core.documents import Document

@chain
def map_reduce(inputs: dict) -> str:
    """
    retriever가 검색한 문서 list[Document]들과 사용자의 질문을 받아서
    개별 문서와 질문 간의 관련성을 reduce_chain을 이용해 검사한다.
    문서들 중 reduce_chain을 통과하는 내용들만 추려서 반환한다.

    Args:
        inputs (dict[str, Any]): 검색한 문서와 사용자 질문을 묶어서 딕셔너리 형태로 받는다.

    Returns:
        str: 질문과 연관성이 있는 문서들을 문자열로 묶어서 반환한다.
    """

    # 질문과 검색 문서들을 조회
    docs: list[Document] = inputs["documents"]
    query: str = inputs["query"]

    context: str = ""  # 질문과 관련 있는 문서 내용들을 합칠 변수

    for doc in docs: 
        res = reduce_chain.invoke({
            "query": query,
            "context": doc.page_content
        })

        context += res + "\n\n"

    return context.strip()
```

LangChain 기초 5편의 `@chain`이 여기서 쓰인다. 문서마다 반복하는 `for`문은 LCEL만으로는 짤 수 없다.

```python
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

model = ChatOpenAI(model="gpt-5.4-mini")

parser = StrOutputParser()
```

```python
retriever = get_retriever(vector_store, k=10)

map_reduce_chain = (
    {
        "query": RunnablePassthrough(),
        "documents": retriever,
    }
    | map_reduce # 반환 값이 chian의 context가 됌
)
```

```python
query = "국제 올림픽 기구에 대해 설명해줘."

res = map_reduce_chain.invoke(query)
pprint(res)
```

```text
('올림픽 활동이란 많은 수의 국가, 국제 경기 연맹과 협회 • 미디어 파트너를 맺기 • 선수, 직원, 심판, 모든 사람과 기관이 올림픽 '
 '헌장을 지키는 것을 말한다.국제올림픽위원회(IOC)는 모든 올림픽 활동을 통솔하는 단체로서, 올림픽 개최 도시 선정, 계획 감독, 종목 '
 '변경, 스폰서 및 방송권 계약 체결 등의 권리가 있다. 올림픽 활동은 크게 세 가지로 구성된다.  \n'
 '- 국제경기연맹(IF)은 국제적인 규모의 경기를 관리, 감독하는 기구이다. … (생략)')
```

10개 중 IOC를 설명하는 문서만 남아 이어 붙여졌다. 최종 체인은 이것을 context로 쓴다.

```python
# 최종 CHAIN

chain = {"context": map_reduce_chain, "query":RunnablePassthrough()} | prompt | model | parser
res = chain.invoke(query)
pprint(res)
```

```text
('# 답변\n'
 '국제 올림픽 기구는 **국제올림픽위원회(IOC)**를 말하며, 올림픽 활동을 통솔하는 기구입니다. IOC는 **올림픽 개최 도시 '
 '선정**, **대회 계획 감독**, **종목 변경 결정**, **스폰서 및 방송권 계약 체결** 등의 권한을 가집니다.[^1]\n'
 '\n'
 '또한 올림픽 활동은 크게 **국제경기연맹(IF)**, **국가 올림픽 위원회(NOC)**, **올림픽 조직 위원회(OCOG)**로 '
 '구성됩니다. 이 중 IOC는 전체를 조정하는 중심 기구입니다.[^1][^2]\n'
 '\n'
 'IOC는 올림픽을 주관하면서 **중계권 판매를 통해 이익을 얻고**, 올림픽 운영에도 큰 영향을 미칩니다.[^3]\n'
 '\n'
 '# 참조 내용\n'
 '[^1]: “국제올림픽위원회(IOC)는 모든 올림픽 활동을 통솔하는 단체로서, 올림픽 개최 도시 선정, 계획 감독, 종목 변경, 스폰서 '
 '및 방송권 계약 체결 등의 권리가 있다.”\n'
 '[^2]: “올림픽은 국제경기연맹(IF), 국가 올림픽 위원회(NOC), 각 올림픽의 위원회…로 구성된다.”\n'
 '[^3]: “국제 올림픽 위원회(IOC)는 올림픽을 주관하는 기구로, 중계권 판매를 통해 이익을 얻고 올림픽 운영에 큰 영향력을 '
 '가진다.”')
```

"국제 올림픽 **기구**"라고 물었는데 IOC(위원회)로 정확히 연결했고, 걸러진 context라서 답이 짧고 군더더기가 없다. 다만 이 체인은 질문 하나에 LLM을 **11번**(문서 10개 판단 + 최종 답변) 부른다.

## Self-Query Retriever

사용자의 자연어 질문을 LLM이 **의미 검색어(semantic query)** 와 **메타데이터 필터(metadata filter)** 로 나눠, 벡터 검색과 조건 필터를 동시에 한다. 3편에서 "1900년 이전 작품"을 필터 코드로 직접 썼던 것을 LLM이 질문에서 자동으로 뽑는다.

| 구성 요소 | 역할 |
|---|---|
| **LLM** (Query Constructor) | 자연어 질문 → 구조화된 쿼리 |
| **StructuredQuery** | 의미 검색어 + 필터 조건 |
| **Query Translator** | StructuredQuery를 각 벡터 DB(Qdrant, Chroma…)의 필터 문법으로 번역 |
| **Vector DB** | 벡터 검색 + 필터로 문서 반환 |

![Self-Query Retriever](/images/llm/fig-selfquery-retriever.jpg)

예를 들어 "2023년에 발표된 OpenAI의 GPT 모델 관련 논문을 찾아줘"는 이렇게 바뀐다.

```json
{
    "query": "GPT 모델 논문",
    "filter": {
        "must": [
            {"key": "year", "match": {"value": 2023}},
            {"key": "author", "match": {"value": "OpenAI"}}
        ]
    }
}
```

필요 패키지는 `langchain langchain-community langchain-openai langchain-qdrant lark`다. **Lark**는 정해진 문법으로 텍스트를 해석하는 파싱 라이브러리로, LLM이 문자열로 쓴 필터 조건(`gte("rating", 8)`)을 StructuredQuery의 filter 구조로 바꾸는 데 쓰인다.

```python
from langchain_qdrant import QdrantVectorStore
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from dotenv import load_dotenv

load_dotenv()
```

```python
documents = [
    Document(
        page_content="A bunch of scientists bring back dinosaurs and mayhem breaks loose",
        metadata={"year": 1993, "rating": 7.7, "genre": "science fiction"},
    ),
    Document(
        page_content="Leo DiCaprio gets lost in a dream within a dream within a dream within a ...",
        metadata={"year": 2010, "director": "Christopher Nolan", "rating": 8.2},
    ),
    Document(
        page_content="A psychologist / detective gets lost in a series of dreams within dreams within dreams and Inception reused the idea",
        metadata={"year": 2006, "director": "Satoshi Kon", "rating": 8.6},
    ),
    Document(
        page_content="A bunch of normal-sized women are supremely wholesome and some men pine after them",
        metadata={"year": 2019, "director": "Greta Gerwig", "rating": 8.3},
    ),
    Document(
        page_content="Toys come alive and have a blast doing so",
        metadata={"year": 1995, "genre": "animated"},
    ),
    Document(
        page_content="Three men walk into the Zone, three men walk out of the Zone",
        metadata={
            "year": 1979,
            "director": "Andrei Tarkovsky",
            "genre": "thriller",
            "rating": 9.9,
        },
    ),
]
```

영화 제목 없이 한 줄 소개와 메타데이터(연도, 감독, 평점, 장르)만 있는 6편이다. 메타데이터가 영화마다 다르게 비어 있다는 점도 눈여겨볼 만하다.

```python
# Vector Store 생성

COLLECTION_NAME = "example"
embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

client = QdrantClient(host="localhost", port=6333)

# 기존 컬렉션이 있으면 삭제
if client.collection_exists(COLLECTION_NAME):
    client.delete_collection(COLLECTION_NAME)

# 컬렉션 생성
client.create_collection(
    collection_name=COLLECTION_NAME,
    vectors_config=VectorParams(
        size=1536,
        distance=Distance.COSINE
    )
)

# 컬렉션과 Vector Store 연결
vectorstore = QdrantVectorStore(
    client=client,
    collection_name=COLLECTION_NAME,
    embedding=embedding_model
)

# 데이터 추가
vectorstore.add_documents(documents=documents)
```

```python
# SelfQueryRetriever 생성

from langchain_classic.chains.query_constructor.schema import AttributeInfo
from langchain_classic.retrievers.self_query.base import SelfQueryRetriever
from langchain_openai import ChatOpenAI
from langchain_community.query_constructors.qdrant import QdrantTranslator

# Payload 조건 필터링을 위해 메타데이터에 대한 정보를 정의
metadata_field_info = [
    AttributeInfo(
        name="title",  # 메타데이터 필드(속성) 이름
        description="영화의 제목",  # 필드 설명
        type="string",  # 필드값 타입
    ),
    AttributeInfo(
        name="genre",
        description="영화 장르. 다음 중 하나를 가진다. ['science fiction', 'comedy', 'drama', 'thriller', 'romance', 'action', 'animated']",
        type="string",
    ),
    AttributeInfo(
        name="year",
        description="영화 개봉 연도",
        type="integer",
    ),
    AttributeInfo(
        name="rating",
        description="영화의 평점. 1 ~ 10 사이의 실수값을 가진다.",
        type="float",
    ),
]

# 문서 내용(Document.page_content: 의미 기반 검색 대상)에 대한 설명
document_content_description = "영화에 대한 소개글"

# LLM 생성
llm = ChatOpenAI(model="gpt-5.4-mini")

# Self Query Retriever 생성
sq_retriever = SelfQueryRetriever.from_llm(
    llm=llm,
    vectorstore=vectorstore,
    document_contents=document_content_description,  # 의미 기반 검색어를 추출할 때 사용
    metadata_field_info=metadata_field_info,  # 메타데이터 필터링 검색어를 추출할 때 참고할 내용
    structured_query_translator=QdrantTranslator(
        metadata_key=vectorstore.metadata_payload_key
    ),  # Qdrant DB Collection의 metadata payload key
    search_kwargs={"k": 5},
)
```

`AttributeInfo`가 LLM에게 주는 **메타데이터 설명서**다. 필드 이름, 뜻, 타입, 가능한 값(장르 목록, 평점 범위)을 알려 줘야 LLM이 "8점 이상"을 `rating`에 대한 조건으로 바꿀 수 있다. LangChain 기초 4편의 Pydantic `Field(description=…)`와 같은 역할이다. `QdrantTranslator`에 `metadata_key`를 넘기는 건 3편에서 본 `metadata.필드` 구조 때문이다. (`title` 필드는 정의했지만 실제 데이터에는 없다.)

```python
from pprint import pprint

query = "평점이 8점 이상인 영화를 추천해줘."

docs = sq_retriever.invoke(query)

pprint(docs)
```

```text
[Document(metadata={'year': 2010, 'director': 'Christopher Nolan', 'rating': 8.2, …}, page_content='Leo DiCaprio gets lost in a dream within a dream within a dream within a ...'),
 Document(metadata={'year': 2006, 'director': 'Satoshi Kon', 'rating': 8.6, …}, page_content='A psychologist / detective gets lost in a series of dreams within dreams within dreams and Inception reused the idea'),
 Document(metadata={'year': 2019, 'director': 'Greta Gerwig', 'rating': 8.3, …}, …),
 Document(metadata={'year': 1979, 'director': 'Andrei Tarkovsky', 'genre': 'thriller', 'rating': 9.9, …}, …)]
```

```python
# LangSmith

# JSON

# {
#   "query": "영화를 추천해줘",
#   "filter": "gte(\"rating\", 8)"  # 평점이 8 이상인 영화만 조회하도록 필터가 적용됨
# }
```

평점 8.2, 8.6, 8.3, 9.9인 4편만 나왔다. 7.7(쥬라기 공원)과 평점이 없는 토이 스토리는 빠졌다. 메모처럼 LangSmith에서 중간 과정을 열어 보면 LLM이 질문을 `query: "영화를 추천해줘"`, `filter: gte("rating", 8)`로 나눈 것이 보인다. 이 `gte(…)` 문자열을 Lark가 해석하고 QdrantTranslator가 Qdrant의 `Range(gte=8)` 필터로 바꾼다.

RAG 체인으로 연결한다.

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_template(
    template = 
    """ 
    <instruction>
    당신은 영화추천 전문 AI assistant입니다.
    주어진 context를 바탕으로 사용자 질문에 대답합니다.
    Context에 영화가 없거나 질문과 관련된 내용이 없으면 "질문에 대한 정보가 부족합니다"라고 답합니다.
    </instruction>
    
    <context>{context}</context>
    <query>{query}</query>
    
    <output-format>
    - 추천하는 영화의제목과 metadata(개봉년도, 감독이름, 평점, 장르)를 함께 분석합니다.
    - 한국어로 자연스러운 문장으로 답변합니다.
    </output-format>
    """
)

def format_movies(document:list[Document]) -> str:
    """검색된 문서들을 받아서 답변용 context 문자열로 변환해서 반환
    list[Document] -> 각 문서의 page_content값과 metadata를 합쳐서 문자열로 변환
    """
    return "\n\n".join(f"영화 내용: {doc.page_content}\n영화 정보: {doc.metadata}" for doc in documents)

# RAG Chain 생성
chain = (
    {
        "context": sq_retriever | format_movies,
        "query": RunnablePassthrough(),
    }
    | prompt
    | llm
    | parser
)
```

`format_movies`에 버그가 있다. 파라미터 이름은 `document`인데 본문에서는 `documents`를 쓴다. `documents`는 위에서 만든 **영화 6편 전체 리스트**(전역 변수)라서, 이 함수는 Self-Query가 무엇을 찾든 **항상 6편 전부**를 context로 만든다. 에러가 나지 않아서 알아채기 어렵다. 파라미터 이름을 `docs`로 맞추고 본문도 `docs`로 써야 한다.

```python
query = "2000년대 이후 개봉한 영화중에 평점이 8점 이상인 영화를 추천해주세요."

res = chain.invoke(query)

pprint(res)
```

```text
('2000년대 이후 개봉했고 평점이 8점 이상인 영화로는 다음 작품들을 추천드릴 수 있습니다.\n'
 '\n'
 '1. **인셉션 (Inception)**  \n'
 '   - 개봉년도: 2010년  \n'
 '   - 감독: Christopher Nolan  \n'
 '   - 평점: 8.2  \n'
 … (생략) …
 '2. **퍼펙트 블루 (Perfect Blue)**  \n'
 '   - 개봉년도: 2006년  \n'
 '   - 감독: Satoshi Kon  \n'
 '   - 평점: 8.6  \n'
 '   - 장르: 정보가 부족합니다  \n'
 '\n'
 '   심리와 현실, 꿈의 경계가 흐려지는 스타일의 작품으로, 강렬하고 독창적인 분위기를 원하실 때 잘 맞습니다.\n'
 '\n'
 '3. **작은 아씨들 (Little Women)**  \n'
 '   - 개봉년도: 2019년  \n'
 '   - 감독: Greta Gerwig  \n'
 '   - 평점: 8.3  \n'
 '   - 장르: 정보가 부족합니다  \n'
 … (생략))
```

결과는 2010, 2006, 2019년 3편으로 조건에 맞다. 하지만 위의 버그 때문에 context에는 6편이 다 들어갔으니, 이 조건은 Self-Query 필터가 아니라 **LLM이 context를 읽고 스스로 거른 것**이다. 문서가 6편이라 티가 나지 않았을 뿐, 문서가 수천 개면 전부 프롬프트에 들어가 비용이 터지거나 입력 한도를 넘는다.

두 가지가 더 보인다.

- **제목은 LLM이 지어낸 것이다.** 데이터에는 제목이 없다. "인셉션"(놀런, 2010)과 "작은 아씨들"(거윅, 2019)은 감독·연도로 맞게 추론했지만, 곤 사토시의 2006년 작품은 **파프리카**다. "퍼펙트 블루"는 1997년작이다. 메타데이터의 연도(2006)와 LLM이 붙인 제목이 서로 모순되는데도 그럴듯하게 섞였다
- 장르가 없는 영화는 "정보가 부족합니다"라고 답했다. 프롬프트의 "모르면 모른다"가 메타데이터 단위에서도 지켜졌다

RAG에서 할루시네이션은 context 밖의 지식을 쓰는 순간 생긴다. "제목을 함께 분석"하라고 했는데 context에 제목이 없으니 모델이 자기 지식으로 채운 것이다. 출력 형식에서 요구하는 필드가 **데이터에 실제로 있는지** 확인해야 한다.

## 어떤 기법을 언제

| 문제 | 기법 | 이번 실습에서 본 것 | 비용 |
|---|---|---|---|
| 관련 문서가 상위에 안 온다 | **Rerank** (k를 넉넉히 → 상위 n) | 순서는 바꿨지만 "보이콧·정치"를 뺐다. 효과를 평가로 확인해야 함 | Cross-encoder 연산 (로컬) |
| 질문과 문서의 문장 모양이 다르다 | **HyDE** | 가상 답변의 군더더기는 검색 단계에서 끝나고 답에는 안 넘어왔다 | LLM 1회 추가 |
| 여러 측면을 모아야 하는 질문 | **MultiQuery** | 11개로 넓혀 논란 섹션 4개를 다 잡았다 | LLM 1회 + 검색 여러 번 |
| 관련 없는 문서가 섞인다 | **MapReduce** | 10개 중 IOC 문서만 남겨 답이 간결해졌다 | 문서 수만큼 LLM 호출 |
| 질문에 연도·평점 같은 조건이 섞여 있다 | **Self-Query** | `gte("rating", 8)` 필터를 자동 생성 | LLM 1회 추가 |

## 정리

- **Advanced RAG**는 DB 구축, 검색 전, 검색 후, 생성 단계에서 기본 RAG를 고도화하는 패턴이다
- **Rerank**는 Bi-encoder로 넉넉히 찾고 Cross-encoder로 다시 순위를 매긴다. `ContextualCompressionRetriever` + `CrossEncoderReranker`로 구현한다
- **HyDE**는 가상 답변으로 검색해 질문과 문서의 표현 차이를 메운다. 가상 답변은 검색어로만 쓰고 답은 실제 문서로 만든다
- **MultiQuery**는 질문을 여러 개로 바꿔 검색 범위를 넓힌다. 여러 측면을 정리하는 질문에 강하다
- **MapReduce**는 문서마다 LLM이 관련성을 판단해 걸러 낸다. 정확하지만 호출 수가 문서 수만큼 늘어난다
- **Self-Query**는 `AttributeInfo`(메타데이터 설명서)를 보고 LLM이 질문에서 필터를 뽑는다
- 체인 코드의 작은 버그(`documents` 전역 변수)는 에러 없이 RAG의 필터를 무력화한다. 그리고 출력 형식이 요구하는 정보가 context에 없으면 LLM이 지어낸다(파프리카 → 퍼펙트 블루)
