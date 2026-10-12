---
title: "RAG 평가: RAGAS로 검색과 답변 측정하기"
description: "RAG 시스템을 검색 단계와 생성 단계로 나눠 평가하는 방법과 RAGAS의 4가지 지표(Faithfulness, Answer Relevancy, Context Precision, Context Recall)의 계산 방식을 정리하고, TestsetGenerator로 올림픽 문서에서 질문·정답 데이터셋을 합성한 뒤 RAG 체인을 실제로 평가해 문항별 점수를 해석합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'RAG'
seriesOrder: 6
originalNotebook: "10_RAG_evaluation.ipynb"
tags: ["LLM","RAG"]
date: 2026-07-03T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-rag-evaluation.webp'
---

> SKN31 AI Agent 과정 노트북 `10_RAG_evaluation.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과입니다. 평가 데이터셋은 LLM이 무작위로 뽑은 문서로 생성하므로 실행할 때마다 질문과 점수가 달라집니다.

## 이 글에서 다루는 것

- RAG 평가: 무엇을, 어떻게 평가하나
- RAGAS 지표 4가지와 계산 방법
- TestsetGenerator로 평가용 질문·정답 합성하기
- 평가할 RAG 체인에서 답변과 검색 문서를 함께 받기
- `evaluate`로 점수 내고 문항별로 해석하기

지난 글에서 Rerank, HyDE, MultiQuery를 써 보며 "결과가 더 나아진 것 같다"고 눈으로 판단했다. Rerank는 오히려 중요한 섹션을 빼기도 했다. 기법을 바꿀 때마다 좋아졌는지 나빠졌는지를 **숫자로** 확인하는 방법이 이번 글이다.

## RAG 평가

RAG 평가는 시스템이 질문에 대해 **관련 정보를 얼마나 잘 찾고**, 그것으로 **정확한 답을 얼마나 잘 만드는지** 측정하는 과정이다.

| 평가 대상 | 질문 |
|---|---|
| **검색 단계** | 찾아온 문서가 질문과 관련 있고 정확한가 |
| **생성 단계** | 답변이 좋은가, 정확한가 |

| 평가 방법 | 내용 |
|---|---|
| **오프라인** | 미리 준비한 데이터셋으로 측정 |
| **온라인** | 실제 사용자 트래픽과 피드백으로 측정 |
| **정량적** | 자동화된 지표로 점수화 |
| **정성적** | 전문가나 사용자가 직접 판단 |

이번 실습은 **오프라인 + 정량적** 평가다.

## RAGAS

[RAGAS](https://www.ragas.io/)는 RAG 파이프라인을 정량적으로 평가하는 오픈소스 프레임워크다.

```bash
uv pip install ragas rapidfuzz
```

![RAGAS 지표](/images/llm/fig-ragas-score.png)

| 구분 | 지표 | 무엇과 무엇을 비교하나 | 질문 |
|---|---|---|---|
| **Generation** | **Faithfulness** (신뢰성) | 답변 ↔ 검색 문서 | 답이 context에 근거했나 (할루시네이션) |
| | **Answer Relevancy** (답변 적합성) | 답변 ↔ 질문 | 답이 질문에 맞나 |
| **Retrieval** | **Context Precision** (문맥 정밀도) | 검색 문서 순위 ↔ 질문 | 관련 문서가 **상위에** 있나 |
| | **Context Recall** (문맥 재현율) | 검색 문서 ↔ 정답 | 정답에 필요한 정보를 **빠짐없이** 찾았나 |

![RAGAS 지표 관계](/images/llm/fig-ragas-score2.png)

### Faithfulness

답변이 검색 문서(context)를 얼마나 충실히 반영했는지, 즉 **할루시네이션** 평가다. 범위 0~1.

1. 답변에서 **주장(claim)** 을 뽑는다
   - 질문: 한국의 수도는 어디이고 인구는 얼마나 되나요?
   - 답변: 한국의 수도는 서울이고 인구수는 3000만명이다
   - 주장: ① 한국의 수도는 서울이다 ② 인구수는 3000만명이다
2. 각 주장을 context에서 추론할 수 있는지 판단한다
   - context: "…한국의 수도는 서울이다. … 한국의 인구는 5000만명이고…"
   - ①은 추론 가능, ②는 불가능
3. 점수 = 추론 가능한 주장 / 전체 주장 = 1/2 = 0.5

$$
\text{Faithfulness} = \frac{\text{context에서 추론할 수 있는 주장 수}}{\text{전체 주장 수}}
$$

주장을 뽑고 판단하는 일은 **LLM이** 한다(LLM-as-a-judge).

### Answer Relevancy

답변이 질문에 얼마나 맞는지. 답변으로 **질문을 거꾸로 만들어 보고**, 원래 질문과 비교한다.

1. 답변 "한국의 수도는 서울이고 인구수는 3000만명이다"로 질문을 생성한다: "한국의 수도는 어디이고 인구는?", "한국의 수도는?", "한국의 인구는?"
2. 생성된 질문들과 실제 질문의 코사인 유사도 평균이 점수다

$$
\text{Answer Relevancy} = \frac{1}{N} \sum_{i=1}^{N} \cos(q_{\text{user}}, q_{\text{generated}_i})
$$

답이 질문과 딴소리를 하면 거꾸로 만든 질문도 딴소리가 된다. 답이 **사실인지는 보지 않는다**(그건 Faithfulness의 몫이다).

### Context Precision

검색된 문서 중 관련 있는 것들이 얼마나 **상위**에 있는지. 범위 0~1. 지난 글의 "관련 정보는 상위에 있어야 한다"를 수치로 잰다.

$$
\text{Context Precision@K} = \frac{\sum_{k=1}^{K} (\text{Precision@k} \times v_k)}{\text{상위 K개 중 관련 문서 수}}
$$

$v_k$는 k번째 문서가 관련 있으면 1, 없으면 0이다. 예를 들어 상위 5개 중 1, 3, 4번째가 관련 있다면:

| k | 관련($v_k$) | Precision@k |
|---|---|---|
| 1 | 1 | 1/1 = 1.0 |
| 2 | 0 | 1/2 = 0.5 |
| 3 | 1 | 2/3 ≈ 0.67 |
| 4 | 1 | 3/4 = 0.75 |
| 5 | 0 | 3/5 = 0.6 |

$$
\frac{1.0 + 0.67 + 0.75}{3} \approx 0.81
$$

관련 문서가 1, 2, 3위에 있었다면 1.0이 된다. 관련 문서 **개수**가 같아도 **위치**가 뒤로 밀리면 점수가 떨어진다.

### Context Recall

검색된 문서가 **정답**(ground truth)의 정보를 얼마나 담고 있는지. 범위 0~1.

1. 정답 "한국의 수도는 서울이고 인구수는 5000만명이다"에서 주장을 뽑는다: ① 수도는 서울 ② 인구는 5000만명
2. 각 주장을 검색 문서에서 찾을 수 있는지 판단한다. context가 "…한국의 수도는 서울이다"뿐이면 ①만 찾을 수 있다
3. 점수 = 1/2 = 0.5

$$
\text{Context Recall} = \frac{\text{정답의 주장 중 context에서 찾을 수 있는 수}}{\text{정답의 전체 주장 수}}
$$

Faithfulness는 **답변**의 주장을, Context Recall은 **정답**의 주장을 context와 대조한다. 그래서 Context Recall에는 **정답(reference)이 있는 데이터셋**이 필요하다.

## 실습 1: 평가할 RAG 체인

```python
# !uv pip install ragas rapidfuzz
# 설치 후 커널 재시작
```

```python
# docker run -p 6333:6333 -p 6334:6334   -v qdrant_storage:/qdrant/storage   qdrant/qdrant
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

from dotenv import load_dotenv

load_dotenv()
```

이번에는 하이브리드가 아니라 **Dense만** 쓰는 기본 RAG를 평가한다. 지난 글과 같은 올림픽 위키 문서를 헤더로 나눠 넣는다.

```python
# ##############################################################
# 데이터 준비
##############################################################

def load_and_split_olympic_data(file_path="data/olympic_wiki.md"):
    with open(file_path, "r", encoding="utf-8") as fr:
        olympic_text = fr.read()

    # Split
    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[
            ("#", "H1"),
            ("##", "H2"),
            ("###", "H3"),
        ],
    )

    return splitter.split_text(olympic_text)
```

```python
#################################################################
# Vector DB 연결
# retriever 생성
#################################################################

def get_vectorstore(collection_name: str = "olympic_info_wiki"):


    dense_embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

    client = QdrantClient(url="http://localhost:6333")

    # 컬렉션 삭제
    if client.collection_exists(collection_name):
        result = client.delete_collection(collection_name=collection_name)

    # 컬렉션 생성
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=3072, distance=Distance.COSINE),
      
    )

    vectorstore = QdrantVectorStore(
        client=client,
        collection_name=collection_name,    
        embedding=dense_embeddings
    )
    
    ######################################
    # Document들 추가
    ######################################
    documents = load_and_split_olympic_data()
    vectorstore.add_documents(documents=documents)

    return vectorstore


def get_retriever(vectorstore, k: int = 5):
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": k}
    )
    return retriever
```

평가하려면 RAG 체인이 **답변만이 아니라 검색한 문서도** 돌려줘야 한다. Faithfulness와 Context 지표가 검색 문서를 보기 때문이다.

```python
################################################################################
# 평가할 RAG Chain
################################################################################

from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough 
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from operator import itemgetter

vectorstore = get_vectorstore()
retriever = get_retriever(vectorstore)

prompt_txt = """<instruction>
당신은 정보제공을 목적으로하는 유능한 AI Assistant 입니다.
주어진 context의 내용을 기반으로 질문에 답변을 합니다.
Context에 질문에 대한 명확한 정보가 있는 경우 그것을 바탕으로 답변을 합니다.
Context에 질문에 대한 명확한 정보가 없는 경우 "정보가 부족해 답을 할 수 없습니다." 라고 답합니다.
절대 추측이나 일반 상식을 바탕으로 답을 하거나 Context 없는 내용을 만들어서 답변해서는 안됩니다.
</instruction>
<context>
{context}
</context>
<question>
{query}
</question>
"""
prompt = ChatPromptTemplate.from_template(
    template=prompt_txt
)

model = ChatOpenAI(model="gpt-5.4-mini")
parser = StrOutputParser()

def format_doc_to_str(documents:list[Document])->list[str]:
    """
    VectorStore에 조회한 문서들(list[Document])에서 내용(page_content)만 추출해서 list[str] 로 반환.
    RAGAS 평가시 context는 각 검색한 문서를 list[str] 로 받기 때문에 이렇게 처리.
    
    Args:
        documents(list[Document]): [Document(..), Document(...), ..]}
    Returns:
        list[str]: 각 문서의 내용만 추출해서 리스트에 담는다.
    """
    return [doc.page_content for doc in documents]

# RAG 체인 -> RAG 평가데이터셋을 만드는 RAG Chain
#          -> 최종응답: LLM의 응답(str), 검색한 문서들(list[str])
chain = RunnablePassthrough() | {
    "context":retriever | format_doc_to_str,
    "query":RunnablePassthrough()
} | { 
    "response": prompt | model | parser,       # LLM 응답
    "retrieved_context": itemgetter("context") # 검색한 문서들
}
# RunnablePassthrough() -> LCEL 체인을 만들려면 구성요소중 하나가 Runnable이어야 하는데 
# 이 체인은 dict | dict 구조기때문에 앞에 추가.
```

| 단계 | 출력 |
|---|---|
| `RunnablePassthrough()` | 질문 그대로 (dict \| dict만으로는 `\|`가 동작하지 않아서, 맨 앞에 Runnable을 하나 둔다) |
| 첫 번째 dict | `{"context": [문서1, 문서2, …], "query": 질문}` |
| 두 번째 dict | `{"response": LLM 답변, "retrieved_context": 검색 문서 리스트}` |

두 번째 dict에서 `response`는 프롬프트 → 모델로 답을 만들고, `retrieved_context`는 `itemgetter`로 앞 단계의 context를 그대로 꺼낸다. LangChain 기초 5편의 RunnableParallel과 itemgetter가 이렇게 쓰인다. context를 문자열로 합치지 않고 **리스트로** 두는 이유는, RAGAS가 Context Precision을 계산할 때 문서별 순위를 봐야 하기 때문이다(프롬프트에는 리스트가 문자열로 바뀌어 들어간다).

```python
res = chain.invoke("올림픽 1회 개최지는 어디였나요?")
print(res.keys())
```

```text
dict_keys(['response', 'retrieved_context'])
```

```python
res['response']
```

```text
'1896년 아테네입니다.'
```

```python
res["retrieved_context"]
```

```text
['고대 올림피아 경기를 제대로 구현한 최초의 시도는 혁명 시대의 프랑스에서 1796년부터 1798년까지 3년동안 실시했던 프랑스 국내 올림픽인 \'공화국 올림픽\'(L\'Olympiade de la République)이었다. … (생략)', … (5개)]
```

## 실습 2: 평가 데이터셋 합성

평가 데이터셋은 네 가지로 구성된다.

| 필드 | 내용 | 누가 만드나 |
|---|---|---|
| `user_input` | 질문 | TestsetGenerator (LLM) |
| `reference` | 정답 | TestsetGenerator (LLM) |
| `retrieved_contexts` | 검색한 문서 | **평가할 RAG** |
| `response` | 답변 | **평가할 RAG** |

질문과 정답을 사람이 직접 만들면 가장 좋지만 비싸다. **TestsetGenerator**는 문서를 주면 그 문서로 답할 수 있는 질문과 정답을 LLM으로 만든다.

> **주의** TestsetGenerator를 import할 때 `No Module named langchain_community.chat_models.vertexai` 에러가 날 수 있다. RAGAS와 langchain-community의 버전 호환 문제로, `langchain_google_vertexai`를 설치하고 `langchain_community/chat_models/vertexai.py`를 만들어 `ChatVertexAI`를 대신 import하게 해서 우회한다.

```python
!uv pip install langchain_google_vertexai
```

```python
# 주피터노트북 환경에서 비동기적 처리 위해
# script(.py) 로 작성할 경우는 필요 없다.

import nest_asyncio
nest_asyncio.apply()
```

RAGAS는 내부적으로 비동기(async)로 여러 LLM 호출을 동시에 보낸다. 주피터는 이미 이벤트 루프가 돌고 있어서 그 안에서 또 루프를 돌리려면 `nest_asyncio`가 필요하다.

질문을 만들 재료 문서를 Qdrant에서 무작위로 5개 뽑는다.

```python
################################
# testset -> Context들(문서들) - [질문 - 정답답변 + (Retriever가찾은문서+LLM 응답: Chain 생성)]
# 1. Context(문서들)을 추출 -TestsetGenerator-> 질문과 정답답변 생성.

import random 
# 데이터셋을 생성할 때 사용할 Context 를 추출. 
client = QdrantClient(url="http://localhost:6333")
COLLECTION_NAME = "olympic_info_wiki"

# 전체 저장된 문서 중에서 K개만 sampling
info = client.get_collection(COLLECTION_NAME)
total_docs = info.points_count #  총 문서개수 조회

results, _ = client.scroll(
    collection_name=COLLECTION_NAME,
    limit=total_docs 
)
# 랜덤하개 K(5)개를 sampling
sample_docs:"list[PointStruct]" = random.sample(results, 5) 
# 리스트에서 랜덤하게 k(5)개를 추출 (k: 데이터셋 개수)

# PointStruct - payload: page_content, metadata
# page_content만 추출해서 list[str]
docs = [point.payload['page_content'] for point in sample_docs]
```

3편의 `scroll`로 전체 문서를 꺼내고 `random.sample`로 5개를 고른다. 아래 결과를 보면 이번 실행에서는 정치 논란, 고대 올림픽, 참가 규모와 선수촌 같은 섹션이 뽑혔다.

```python
# 테스트 셋을 생성
from ragas.testset import TestsetGenerator
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper

from langchain_openai import ChatOpenAI, OpenAIEmbeddings

# TestsetGenerator는 gpt-5 이후버전은 사용할 수 없다.
## Langchain의 LLM  모델과 Embedding 모델 -> RAGAS에서 사용할 수 있도록 변환(Wrapping)
generator_llm = LangchainLLMWrapper(ChatOpenAI(model="gpt-4.1"))
generator_embeddings = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-large"))

generator = TestsetGenerator(
    llm=generator_llm,
    embedding_model=generator_embeddings,
    llm_context="""
- 사람들이 올림픽에 대해서 궁금해 할 만한 질문들을 생성한다.
- 데이터셋은 반드시 한국어로 작성한다.
- 데이터셋은 JSON 문법을 지켜서 작성한다. 특히 구두점은 꼭 지켜야 한다.
- 생성된 내용이나 Document에 JSON문법에 맞지 않는 표현이 있으면 반드시 수정해서 처리한다.
""" # 질문/답변을 생성할 때 LLM에게 전달할 System Prompt 를 설정.
)
```

LangChain 모델을 RAGAS가 쓸 수 있게 Wrapper로 감싼다. 주석대로 이 시점의 RAGAS에서는 GPT-5 이후 모델을 쓸 수 없어서 GPT-4.1을 쓴다. LangChain 기초 5편에서 본 `'temperature': False`처럼 GPT-5 계열은 일부 파라미터를 받지 않는데, 이런 차이 때문으로 보인다. `llm_context`는 생성용 시스템 프롬프트로, 한국어로 만들라는 지시와 JSON 문법을 지키라는 지시가 들어 있다(RAGAS는 LLM 응답을 JSON으로 파싱하기 때문에 따옴표 하나가 깨지면 실패한다).

```python
testset = generator.generate_with_chunks(
    docs, testset_size=10, # Conext 내용, 테스트셋 개수 (질문-답변 개수)
)
```

```text
Applying SummaryExtractor:   0%|          | 0/5 [00:00<?, ?it/s]
Applying CustomNodeFilter:   0%|          | 0/5 [00:00<?, ?it/s]
Applying EmbeddingExtractor:   0%|          | 0/5 [00:00<?, ?it/s]
Applying ThemesExtractor:   0%|          | 0/5 [00:00<?, ?it/s]
Applying NERExtractor:   0%|          | 0/5 [00:00<?, ?it/s]
Applying CosineSimilarityBuilder:   0%|          | 0/1 [00:00<?, ?it/s]
Applying OverlapScoreBuilder:   0%|          | 0/1 [00:00<?, ?it/s]
Generating personas:   0%|          | 0/3 [00:00<?, ?it/s]
Generating Scenarios:   0%|          | 0/1 [00:00<?, ?it/s]
Generating Samples:   0%|          | 0/10 [00:00<?, ?it/s]
```

진행 로그가 생성 과정을 보여 준다. 문서마다 요약, 주제(Themes), 개체명(NER)을 뽑고, 문서 간 유사도로 관계를 만든 뒤, **페르소나**(질문하는 사람의 유형)와 시나리오를 정해 질문을 만든다.

```python
sample1 = testset.samples[5].eval_sample # 10개중 첫번째 테스트데이터
print("사용자질문:", sample1.user_input)
print("Context:", sample1.reference_contexts)
# 질문과 답변을 만들 때 사용한 context (검색시 찾아야 하는 문서)
print("생성된답변(정답):", sample1.reference)

##### 평가 대상 RAG system을 이용해서 채워 넣어야 한다.
print("평가대상 RAG의 답변:", sample1.response)
print("평가대상 RAG가 검색한 Context:", sample1.retrieved_contexts)
```

```text
사용자질문: 올림픽 선수촌이 뭐에요? 올림픽 선수촌에서 선수들이 어디서 자고, 뭘 먹고, 어떤 시설을 이용할 수 있는지 궁금해요.
Context: ['1896년 대회때는 14개국에서 241명의 선수단이 참가했지만 2008년 하계 올림픽때는 204개국에서 10,500명의 선수가 참가하는 등 … 올림픽이 진행되는 동안 선수와 임직원들은 올림픽 선수촌에서 지낸다. 올림픽 선수촌에는 선수들을 위한 개인실이 있으며 카페테리아, 헬스 클리닉, 종교적인 시설 등 최상의 편의를 위한 시설들이 있다. … (생략)']
생성된답변(정답): 올림픽이 진행되는 동안 선수와 임직원들은 올림픽 선수촌에서 지냅니다. 올림픽 선수촌에는 선수들을 위한 개인실이 있으며 카페테리아, 헬스 클리닉, 종교적인 시설 등 최상의 편의를 위한 시설들이 있습니다.
평가대상 RAG의 답변: None
평가대상 RAG가 검색한 Context: None
```

(주석은 "첫 번째"인데 인덱스 5, 즉 여섯 번째 샘플이다.) 질문, 질문을 만든 문서(`reference_contexts`), 정답이 생겼고, `response`와 `retrieved_contexts`는 비어 있다. 이 둘은 평가할 RAG 체인으로 채워야 한다.

```python
# 생성된 Testset을 Pandas DataFrame으로 변환

eval_df = testset.to_pandas()
eval_df.shape
```

```text
(10, 7)
```

```python
eval_df.head(3)
```

```text
                              user_input  \
0            스파르타키아다 뭐야, 올림픽이랑 무슨 관계 있어?   
1                     스파르타키아다에 대해 알려주세요.   
2  고대 그리스에서 올림픽 경기는 어떤 의미와 특징을 가지고 있었나요?   

                                           reference             persona_name  \
0  소련은 1952년 하계 올림픽에 처음 참가하기 전까지 1928년부터 소련이 조직한 ...  Sports History Educator   
1  스파르타키아다는 소련이 1928년부터 참가했던 대회로, 소련이 헬싱키에서 열린 19...  Sports History Educator   
2  고대 그리스에서 올림픽 경기는 여러 도시 국가의 대표선수들이 모여 육상, 격투기, ...  Sports History Educator   

       query_style query_length                       synthesizer_name  
0     POOR_GRAMMAR       MEDIUM  single_hop_specific_query_synthesizer  
1       MISSPELLED       ME…
```

`query_style`이 흥미롭다. **POOR_GRAMMAR**(문법이 엉성한 질문: "스파르타키아다 뭐야, 올림픽이랑 무슨 관계 있어?"), **MISSPELLED**(오타가 있는 질문)처럼 실제 사용자의 말투를 일부러 섞는다. 깔끔한 질문으로만 평가하면 실사용보다 점수가 높게 나오기 때문이다. 페르소나는 "Sports History Educator"(스포츠 역사 교육자)다.

## 실습 3: RAG로 답하고 평가하기

질문 하나로 먼저 확인해 본다.

```python
row_idx = 0
q = eval_df.loc[row_idx, 'user_input'] # 질문 조회
resp = chain.invoke(q) # dict[response, retrieved_context]
resp['response']
```

```text
'스파르타키아다는 소련이 조직한 대회로, 소련은 1928년부터 여기에 참가했습니다.  \n올림픽과의 관계는, 소련이 1952년 헬싱키 하계 올림픽에 처음 참가하기 전까지 올림픽 대신 참가하던 대회였다는 점입니다.'
```

10개 질문 전체에 답변과 검색 문서를 채운다.

```python
# testset의 모든 데이터에 llm 응답과 retriever의 검색결과를 추가.
response_list = [] # LLM 응답들을 저장할 리스트
retrieved_context_list = [] # retriever가 검색한 문서들을 저장할 리스트

for user_input in eval_df['user_input']:
    resp = chain.invoke(user_input)
    response_list.append(resp['response'])
    retrieved_context_list.append(resp['retrieved_context'])
print(len(response_list), len(retrieved_context_list))
```

```text
10 10
```

```python
response_list
```

```text
['정보가 부족해 답을 할 수 없습니다.',
 '정보가 부족해 답을 할 수 없습니다.',
 '고대 그리스에서 올림픽 경기는 **근본적으로 종교적인 중요성**을 띠고 있었습니다. 제우스와 펠롭스를 기리기 위해 **제물 봉헌 의식**이 함께 치러졌고, … (생략)',
 '고대 그리스 올림픽은 보통 **기원전 776년**에 처음 시작된 것으로 인정됩니다. … (생략)',
 '정보가 부족해 답을 할 수 없습니다.',
 '올림픽 선수촌은 올림픽이 진행되는 동안 선수와 임직원들이 지내는 곳입니다. … (생략)',
 … (생략)]
```

첫 질문(스파르타키아다)이 바로 위에서는 제대로 답했는데, 반복문에서는 **"정보가 부족해 답을 할 수 없습니다"** 가 됐다. 같은 질문, 같은 체인인데 결과가 다르다. LLM 응답이 실행마다 달라서이고, 그래서 평가는 한 번이 아니라 **여러 문항, 여러 번**으로 봐야 한다.

```python
######################################
# eval_df 에 컬럼으로 추가
######################################
eval_df['response'] = response_list
eval_df['retrieved_contexts'] = retrieved_context_list
```

```python
# eval_df 를 RAGAS의 평가데이터셋 타입으로 변환. 
from ragas import EvaluationDataset
eval_dataset = EvaluationDataset.from_pandas(
    eval_df[["user_input", "retrieved_contexts", "response", "reference"]]
)
eval_dataset
```

```text
EvaluationDataset(features=['user_input', 'retrieved_contexts', 'response', 'reference'], len=10)
```

```python
####################
# 평가
####################
from ragas.metrics import  (
    LLMContextRecall, # Context Recall
    LLMContextPrecisionWithReference, # Context Precision
    Faithfulness,
    AnswerRelevancy
)
from ragas import evaluate 
```

```python
# 평가할 때 사용할 LLM, Embedding모델
eval_llm = LangchainLLMWrapper(ChatOpenAI(model="gpt-4.1"))
eval_embeddings = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-large"))

# Metric(평가지표) 객체를 List로 묶어준다.
## 내가 평가할 지표들만 묶어준다.
metrics = [
    LLMContextRecall(llm=eval_llm),
    LLMContextPrecisionWithReference(llm=eval_llm),
    Faithfulness(llm=eval_llm),
    AnswerRelevancy(llm=eval_llm, embeddings=eval_embeddings)
]
# 평가진행
eval_result = evaluate(dataset=eval_dataset, metrics=metrics)
eval_result
```

```text
{'context_recall': 0.7000, 'llm_context_precision_with_reference': 0.6167, 'faithfulness': 0.5667, 'answer_relevancy': 0.4760}
```

평가도 LLM(GPT-4.1)이 판정한다. 10문항 × 4지표 = 40번의 평가가 돈다. 평균만 보면 답변 적합성 0.48, 신뢰성 0.57로 낮다. 문항별로 펼쳐 봐야 이유가 보인다.

```python
# print(type(eval_result))
## 개별 평가데이터에 대한 평가점수.
result_df = eval_result.to_pandas()
result_df
```

| # | 질문 | RAG 답변 | Recall | Precision | Faithful | Relevancy |
|---|---|---|---|---|---|---|
| 0 | 스파르타키아다 뭐야, 올림픽이랑 무슨 관계 있어? | 정보 부족 | **1.0** | 0.33 | 0.0 | 0.0 |
| 1 | 스파르타키아다에 대해 알려주세요 | 정보 부족 | 0.0 | 0.0 | 0.0 | 0.0 |
| 2 | 고대 그리스 올림픽의 의미와 특징 | 정상 | 1.0 | 1.0 | 1.0 | 0.87 |
| 3 | 고대 올림픽은 언제부터, 어떤 의미 | 정상 | 1.0 | 1.0 | 1.0 | 0.69 |
| 4 | 버뮤다 올림픽 나가도 되나? | 정보 부족 | 0.0 | 0.0 | 0.0 | 0.0 |
| 5 | 올림픽 선수촌이 뭐에요? … | 정상 | 1.0 | 1.0 | 0.67 | 0.82 |
| 6 | 에이버리 브런디지 IOC 위원장 재임 시절 … | 정상 | 1.0 | 1.0 | 1.0 | 0.89 |
| 7 | 올림픽 히스토리안으로서, 올림픽 프로그램이 뭐에요? | 정보 부족 | 0.0 | 0.0 | 0.0 | 0.0 |
| 8 | 리우데자네이루 어디서 올림픽 했는지, 왜 특별한지 | 정상 | 1.0 | 1.0 | 1.0 | 0.50 |
| 9 | IOC의 개최지 선정 역할 | 정상 | 1.0 | 0.83 | 1.0 | 0.99 |

문항별로 보면 결과가 둘로 갈린다.

- **정상 답변 6개**(2, 3, 5, 6, 8, 9): 대부분 1.0이다. 검색도 생성도 잘 됐다
- **"정보 부족" 4개**(0, 1, 4, 7): Faithfulness와 Relevancy가 **0**이다. 답에 주장이 없으니 Faithfulness가 0이고, RAGAS는 "모른다"는 회피형 답변의 Relevancy를 0으로 처리한다. 평균을 끌어내린 건 이 4개다

"정보 부족" 4개도 원인이 같지 않다.

| 문항 | Context Recall | 원인 | 고칠 곳 |
|---|---|---|---|
| 1, 4, 7 | 0.0 | 정답이 담긴 문서를 **검색이 못 찾았다**. "모른다"고 한 건 프롬프트대로 정직하게 답한 것 | **검색**: "버뮤다", "스파르타키아다", "올림픽 프로그램(TOP)" 같은 고유명사는 Dense 검색이 약하다 → 하이브리드(BM25), MultiQuery |
| 0 | **1.0** | 정답 문서를 **찾았는데도** LLM이 모른다고 했다. Precision 0.33으로 그 문서가 하위에 있었다 | **순위·생성**: Rerank로 관련 문서를 위로, 또는 프롬프트의 "명확한 정보가 없으면" 기준이 너무 엄격 |

1번(스파르타키아다에 대해 알려주세요)과 0번(스파르타키아다 뭐야)은 같은 내용을 묻는데 Recall이 0과 1로 갈렸다. 질문 표현 하나로 검색 결과가 달라진다는 것, 지난 글의 MultiQuery가 필요한 이유가 숫자로 보인다.

8번(리우)은 다른 지표가 다 1.0인데 Relevancy만 0.50이다. 답은 개최 연도와 의미를 모두 담았지만, "어디서 했는지, 왜 특별한지"처럼 두 가지를 한 문장에 묻는 질문은 답에서 거꾸로 만든 질문이 원래 질문과 그대로 겹치기 어려워 점수가 낮게 나오기 쉽다. Relevancy는 절대값보다 **같은 질문끼리 비교**할 때 의미가 있다.

## 지표를 보고 어디를 고칠까

| 증상 | 의심할 곳 | 시도할 것 |
|---|---|---|
| Context Recall이 낮다 | 검색이 정답 문서를 못 찾음 | 청크 크기·분할 방식, 임베딩 모델, 하이브리드, MultiQuery, HyDE |
| Recall은 높은데 Precision이 낮다 | 찾긴 했는데 순위가 낮음 | Rerank, k 조정 |
| Faithfulness가 낮다 (답은 했는데) | LLM이 context 밖의 내용을 지어냄 | "context에 없으면 모른다" 강화, 인용 강제, 모델 교체 |
| Faithfulness·Relevancy가 0인 "모른다" 답 | 검색 실패 또는 지나치게 엄격한 프롬프트 | 해당 문항의 Recall을 먼저 확인 |
| Answer Relevancy만 낮다 | 질문의 일부만 답함, 장황함 | 출력 형식 지정, 질문 분해 |

## 정리

- RAG 평가는 **검색**(찾은 문서가 맞나)과 **생성**(답이 맞나)을 나눠 본다
- RAGAS의 **Faithfulness**는 답변의 주장이 context에 근거했는지(할루시네이션), **Answer Relevancy**는 답이 질문에 맞는지, **Context Precision**은 관련 문서가 상위에 있는지, **Context Recall**은 정답의 정보를 다 찾았는지를 잰다
- 판정은 LLM이 하고(LLM-as-a-judge), Context Recall에는 정답(reference)이 필요하다
- **TestsetGenerator**는 문서로 질문과 정답을 합성한다. 페르소나와 POOR_GRAMMAR·MISSPELLED 같은 질문 스타일로 실제 사용자 말투를 흉내 낸다
- 평가할 RAG 체인은 답변과 **검색 문서 리스트**를 함께 돌려줘야 한다
- 평균 점수보다 **문항별 점수**가 중요하다. 이번에는 "모른다" 답 4개가 평균을 끌어내렸고, 그중 3개는 검색 실패, 1개는 찾고도 놓친 경우였다
