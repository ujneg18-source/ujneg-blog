---
title: "Chain과 LCEL: Runnable로 처리 흐름 만들기"
description: "프롬프트·모델·파서를 하나의 처리 흐름으로 잇는 Chain을 기존 LLMChain 방식과 LCEL(파이프 연산자) 방식으로 비교하고, 공통 인터페이스 Runnable과 RunnableSequence, RunnableLambda, RunnablePassthrough(assign), RunnableParallel, itemgetter, @chain 데코레이터, 체인끼리 연결하기, LLM 캐시까지 정리합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'LangChain 기초'
seriesOrder: 5
originalNotebook: "05_Chain_LCEL.ipynb"
tags: ["LLM","LangChain"]
date: 2026-06-25T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-chain-lcel.webp'
---

> SKN31 AI Agent 과정 노트북 `05_Chain_LCEL.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과이고, 체인 연결 결과 하나는 강의 자료의 실행 결과로 보충했습니다. LLM 응답은 실행할 때마다 달라집니다.

## 이 글에서 다루는 것

- 수동 조립 vs Chain: 왜 체인으로 묶는가
- 기존 방식(`LLMChain`)과 LCEL(`prompt | model | parser`)
- Runnable: 모든 컴포넌트의 공통 인터페이스 (`invoke`, `batch`, `stream`)
- `RunnableSequence`, `RunnableLambda`, `RunnablePassthrough`, `RunnableParallel`
- 체인과 체인 연결하기, `itemgetter`
- `@chain` 데코레이터: 분기가 필요한 흐름
- LLM 캐시: `SQLiteCache`

## 수동 조립 vs Chain

4편까지는 단계마다 `invoke`를 따로 불렀다.

```python
### 원래에 방식
# 1. prompt 생성
# query = prompt.invoke({"query":"세종대왕에 대해 알려주세요."})

# # 2. model에게 요청
# res = model.invoke(query)
# print(type(res), res)

# # 3. 응답을 응답 포멧에 맞게 parsing
# final_answer = parser.invoke(res)

# print(type(final_answer), final_answer)

# ex) def pipline(query): ~~return final_answer

# 이런 형식으로 만들었을 것임 하지만 이걸 langchain을 사용하면 하나 안에다 여러 프레임워크를 연결시킬거임
# 왜 이런 방식? 범용성이 좋고, 융통성이 좋음 랭체인 하나의 부품을 쉽게 예를들어 파서를 바꾸고 싶으면 그렇게 바꾸면됌

## 랭체인 방식
```

```python
################################################################################
# [ 1. 기존 방식: 수동 조립형 (Manual Implementation) ]
################################################################################
# - 프로세스: [프롬프트] -> [모델 호출] -> [결과 저장] -> [파서 호출]
# - 특징: 각 단계를 함수로 직접 호출하고, 변수를 넘겨주는 '절차적' 방식.
# - 단점: 단계가 많아질수록 코드의 의존성이 커져 수정이 어렵고 가독성이 저하됨.
#
#   def pipeline(query):
#       res = model.invoke(prompt.invoke({"query": query}))
#       return parser.invoke(res)
#
################################################################################
# [ 2. 랭체인 방식: LCEL 파이프라인 (LangChain Expression Language) ]
################################################################################
# - 프로세스: chain = prompt | model | parser
# - 특징: 부품을 파이프(|)로 연결하여 데이터가 흐르는 '선언적' 방식.
# - 장점: 부품 단위로 로직이 독립되어 있어 유지보수와 교체가 비약적으로 쉬움.
#
#   chain = prompt | model | parser
#   result = chain.invoke({"query": "세종대왕"})
#
################################################################################
```

| | 수동 조립 (절차적) | Chain (선언적) |
|---|---|---|
| 코드 | 단계마다 `invoke`를 부르고 결과를 변수로 넘긴다 | `prompt \| model \| parser`로 한 번에 정의한다 |
| 부품 교체 | 관련 코드를 찾아 고친다 | 파이프 안의 부품 하나만 바꾼다 |
| 실행 | 함수를 직접 만든다 | `chain.invoke`, `chain.stream`, `chain.batch`가 바로 된다 |

## Chain

**Chain**은 여러 컴포넌트를 정해진 순서대로 연결해 **복잡한 작업을 단계별로 자동화**하는 구조다.

- 각 컴포넌트는 이전 단계의 결과를 입력으로 받아 처리하고 다음 단계로 넘긴다
- LLM 호출 하나에 그치지 않고 여러 LLM 호출, 도구 실행을 순서대로 이을 수 있다. 예: 질문 → 검색 → 요약 → 응답 생성
- 작업 흐름이 명확해지고 재사용, 유지보수, 확장이 쉬워진다

```python
# 순차(단계)별 흐름 (장점이자 단점, 한계임)
```

### 두 가지 구성 방식

| 방식 | 내용 | 상태 |
|---|---|---|
| **Off-the-shelf Chains** (클래식) | `LLMChain`, `SequentialChain` 같은 **미리 만든 Chain 클래스**에 구성 요소를 넘긴다 | deprecated. `langchain-classic` 패키지로 분리 |
| **LCEL** (LangChain Expression Language) | 컴포넌트를 `\|` 연산자로 연결하는 **선언적 파이프라인** | 현재 방식 |

LCEL의 특징은 선형적 흐름, 간결하고 선언적인 문법, 코드만 봐도 보이는 구조, 높은 확장성이다. LCEL을 이루는 모든 컴포넌트는 **Runnable**이라는 공통 인터페이스를 따른다.

| 공통 메소드 | 하는 일 |
|---|---|
| `invoke()` | 입력 하나를 처리 |
| `batch()` | 입력 여러 개를 묶어 한 번에 처리 |
| `stream()` | 스트리밍으로 응답 |
| `ainvoke()`, `abatch()`, `astream()` | 비동기 버전 |

```python
# 체인은 각각에 일을 담당하는 (컴포넌트)들이 있고, 파이프연산자를 이용해서 연결함

# 장점은 1|2|3 순서대로 일함

# 단점은 순서대로 밖에 일하지 못함

# 선형적이다, 순차적이다. 

# lcel로 chain구성이되는 컴포넌트는 상위클래스의 구조가 runnable임
```

"장점은 순서대로 일함, 단점은 순서대로밖에 못 함"이 이 글 전체의 결론이다. 마지막의 `@chain`과 다음 묶음의 LangGraph가 이 한계를 푸는 방법이다.

## LLMChain vs LCEL

```python
!uv pip install langchain-classic
```

```python
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

load_dotenv()
prompt = ChatPromptTemplate.from_template(
    template="{item}에 어울리는 브랜드 이름 {count}개를 만들어 주세요."
)
model = ChatOpenAI(model="gpt-5-mini")
parser = StrOutputParser()
```

먼저 기존 방식이다.

```python
############################################################
# 기존의 Off the shell 방식 - langchain-classic 설치 필요
############################################################
from langchain_classic import LLMChain
# chain을 구성하는 요소들을 넣어서 생성.
# prompt_template - [prompt] -> -[응답] -> output parser -> 최종결과
chain = LLMChain(
    prompt=prompt,
    llm=model,
    output_parser=parser
)

res = chain.invoke({"item":"가방", "count":3})
print(res)
```

```text
{'item': '가방', 'count': 3, 'text': '가방 브랜드 이름 3개 제안드립니다.\n\n1. 루미아 (Lumia) — 고급스럽고 세련된 느낌의 가죽·프리미엄 라인에 어울림.  \n2. 모노벨 (Monobel) — 미니멀하고 도시적인 디자인, 모노톤 컬렉션에 적합.  \n3. 소요 (Soyo) — 가볍고 편안한 일상·여행용 가방(에코백, 캔버스)에 잘 어울리는 이름.'}
```

결과가 입력값(`item`, `count`)과 응답(`text`)을 함께 담은 dict다. 정해진 틀이라 이 모양을 바꾸기 어렵다.

같은 일을 LCEL로:

```python
##############################
#  LCEL
##############################
chain2 = prompt | model | parser # 파이프로 연결
print(type(chain2))
res2 = chain2.invoke({"item":"TV 브랜드", "count":3}) 
```

```text
<class 'langchain_core.runnables.base.RunnableSequence'>
```

```python
# RunnableSequence
# 체인 구조를 구성하는 것
```

```python
print(res2)
```

```text
다음 세 가지 이름을 제안합니다. 각 이름 옆에 발음과 간단한 콘셉트도 적어뒀습니다.

1) 루멘트 (Lument) — 발음: 루-멘트  
   콘셉트: 밝기·화질(루멘)과 첨단 이미징을 강조하는 프리미엄 라인에 적합.

2) 시네아 (Cinea) — 발음: 시-네-아  
   콘셉트: 시네마틱한 화질과 사운드를 내세운 홈시어터형 TV 브랜드에 어울림.

3) 넥스뷰 (NexView / 넥스뷰) — 발음: 넥스-뷰  
   콘셉트: 스마트 연결성과 미래 지향적 UX를 강조하는 모던한 라인에 적합.
```

결과가 마지막 단계(StrOutputParser)의 출력, 즉 문자열이다. `|`로 이은 결과물의 타입은 **RunnableSequence**다.

## Runnable

```python
from langchain_core.runnables import Runnable
isinstance(model, Runnable), isinstance(prompt, Runnable), isinstance(parser, Runnable), isinstance(chain2, Runnable)
```

```text
(True, True, True, True)
```

모델, 프롬프트, 파서, 그리고 그것들을 이은 체인까지 전부 Runnable이다. 체인도 Runnable이니 체인을 다른 체인의 부품으로 쓸 수 있다.

```python
# 랭체인에서 클래스가 제 각각인 컴포넌트면 메서드가 다르기 때문에 클래스가 같아야 함.
# 즉 호출, 사용방식을 통일해야함
# 그 통일이 runnable 형식임 -> Runnable = Init signature
# Runnable 상속, 타입을 통일함
# ex. pydantic => basemodel를 상속

# ?Runnable
```

```text
Init signature: Runnable()
Docstring:     
A unit of work that can be invoked, batched, streamed, transformed and composed.

Key Methods
===========

- `invoke`/`ainvoke`: Transforms a single input into an output.
- `batch`/`abatch`: Efficiently transforms multiple inputs into outputs.
- `stream`/`astream`: Streams output from a single input as it's produced.
- `astream_log`: Streams output and selected intermediate results from an
    input.

Built-in optimizations:

- **Batch**: By default, batch runs invoke() in parallel using a thread pool
    executor. Override to optimize batching.
… (생략)
```

Pydantic 스키마가 모두 `BaseModel`을 상속하듯, LangChain 컴포넌트는 모두 `Runnable`을 상속한다. 그래서 무엇이든 `invoke`로 부르고 `|`로 잇는다. 문서에 따르면 `batch`는 기본적으로 스레드 풀로 `invoke`를 **병렬** 실행한다. 질문 여러 개를 처리할 때 반복문보다 빠르다.

| 표준 메소드 | 하는 일 |
|---|---|
| `invoke(input, config)` | 입력 하나 → 결과 |
| `batch(inputs, config)` | 입력 리스트 → 결과 리스트 |
| `stream(input, config)` | 결과를 조각으로 흘려보내는 Iterator |
| `assign(**kwargs)` | 앞 단계 출력(dict)에 새 key-value를 추가해서 다음 단계로 넘긴다 |

```python
# PT -> P -> model -> LLM 응답 
# assign => 각 컴포넌트의 출력값을 유지
```

```python
# runnable은 chain으로 작업할 때, 필수
# 각 컴포넌트는 모듈로 생각하면 됌
# pydantic => outputparser
```

## Runnable 구현체

아래 클래스들은 기능을 제공한다기보다 **체인 구조를 다양하게 짜는** 도구다.

| 클래스 | 하는 일 | LCEL 표기 |
|---|---|---|
| `RunnableSequence` | 순서대로 실행, 앞 출력 → 다음 입력 | `a \| b \| c` |
| `RunnableLambda` | 함수를 Runnable로 | 함수를 그냥 넣어도 자동 변환 |
| `RunnablePassthrough` | 입력을 그대로 다음으로. `.assign()`으로 필드 추가 | |
| `RunnableParallel` | 여러 Runnable을 같은 입력으로 병렬 실행, 결과를 dict로 | `{"k1": a, "k2": b}` |

### RunnableSequence

```python
# RunnableSequence LCEL에 파이프연산자로 만든 것임, 이걸 직접 객체로 만들진 않음
```

```python
from langchain_core.runnables import RunnableSequence
chain = RunnableSequence(prompt, model, parser)
# 이거랑 같은 거 chain = prompt | model | parser
# ?RunnableSequence
type(chain)
```

```text
langchain_core.runnables.base.RunnableSequence
```

```python
print(chain.steps)
```

```text
[ChatPromptTemplate(input_variables=['count', 'item'], … template='{item}에 어울리는 브랜드 이름 {count}개를 만들어 주세요.' …), ChatOpenAI(metadata={'lc_versions': {'langchain-core': '1.4.8', 'langchain': '1.3.10', 'langchain-openai': '1.3.2'}}, output_version=None, profile={'name': 'GPT-5 Mini', 'release_date': '2025-08-07', 'last_updated': '2025-08-07', 'open_weights': False, 'max_input_tokens': 272000, 'max_output_tokens': 128000, 'text_inputs': True, 'image_inputs': True, … 'reasoning_output': True, 'tool_calling': True, 'structured_output': True, 'attachment': True, 'temperature': False, … 'pdf_inputs': True, …}, … model_name='gpt-5-mini', model_kwargs={}, openai_api_key=SecretStr('**********'), …), StrOutputParser()]
```

`steps`에 세 컴포넌트가 순서대로 들어 있다. `ChatOpenAI`가 들고 있는 `profile`도 흥미롭다. 이 모델(GPT-5 mini)의 최대 입력 27만 2천 토큰, 이미지 입력 가능, 추론 출력·도구 호출·구조화 출력 지원 여부가 담겨 있다. `'temperature': False`는 이 추론 모델이 temperature 조절을 지원하지 않는다는 뜻이다. 2편에서 "모델이 지원해야 쓸 수 있다"던 기능을 코드에서 확인할 수 있는 곳이다. API 키는 `SecretStr('**********')`로 가려져 출력된다.

```python
chain.invoke({"item":"물", "count":2})
```

```text
'다음 두 가지 제안드립니다.\n\n1) 물빛 (Mulbit) — 깨끗하고 투명한 이미지를 주는 짧고 기억하기 쉬운 이름. 일상용 생수나 미니멀한 디자인 제품에 잘 어울립니다.  \n2) 청연수 (Cheongyeonsu) — ‘청(맑다) + 연(잇다/흐름) + 수(물)’의 의미로, 자연에서 온 깨끗한 원천수를 강조하는 고급스러운 느낌의 이름입니다.'
```

체인 구조를 그림으로 볼 수도 있다. 그림을 그리는 `grandalf` 패키지가 필요하다. 아래 셀은 에러가 나는 것이 정상이다.

```python
import sys
!{sys.executable} -m pip install grandalf
```

```python
!uv pip install grandalf
```

```python
print(chain.get_graph().print_ascii())
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ImportError: Install grandalf to draw graphs: `pip install grandalf`.</div></div>

두 가지 방법으로 설치했는데도 같은 에러가 난다. 이미 실행 중인 커널은 설치 전에 패키지 목록을 읽어 두기 때문에, 새로 설치한 패키지를 쓰려면 **커널을 재시작**해야 한다. `!uv pip install`은 지금 활성화된 가상환경에 설치하는데, 그 환경이 노트북 커널의 Python과 다르면 재시작해도 안 된다. `!{sys.executable} -m pip`가 커널의 Python에 정확히 설치하는 방법이다.

### RunnableLambda

- 람다식이나 함수를 Runnable로 바꾼다
- 일반 함수는 체인에 그냥 넣어도 자동으로 변환되므로 굳이 감쌀 필요는 없다
- 함수 규칙: **파라미터는 1개**(앞 단계에서 받을 값), **리턴값**은 다음 단계의 입력 형식에 맞춘다

```python
# 람다표현식의 함수로 러너블로 변환할때 사용
# 만들어져있는 컴포넌트만 쓰는게 아니라 로직을 넣어줘야 할 때가 있음
# 그 로직이 간단하게 람다표현식으로 해결할 수 있으면 러너블람다로 함
# 물론 일반 함수도 러너블로 바꿀 수 있음 (chain에 넣으면 바로 람다로 바뀜)
```

```python
from langchain_core.runnables import RunnableLambda

# RunnableLamda(함수)

# 함수-파라미터(1개-> 앞 체인으로 부터 받을 값에 맞춘다. )
#           -리턴값 -> 다음 체인의 입력 타입에 맞게 변환
#
c1 = RunnableLambda(lambda input_data:f"{input_data}를 한 문장으로 설명해줘.")

#type(c1)
c1.invoke("LLM 모델")
```

```text
'LLM 모델를 한 문장으로 설명해줘.'
```

프롬프트 템플릿 대신 람다로 문자열을 만들었다("모델를"처럼 조사는 맞춰 주지 않는다).

```python
chain = c1 | model | parser #c1를 컴포넌트로 넣었음
chain.invoke("LLM 모델") # 반드시 chain 호출시에는 첫번째 컴포넌트에 전달할 값을 넣어서 호출
print(chain.invoke("LLM 모델"))
```

```text
대규모 언어 모델(LLM)은 방대한 텍스트를 학습한 신경망으로 문맥을 이해해 사람처럼 자연스러운 문장을 생성하거나 질문에 답하는 인공지능입니다.
```

이 셀은 `chain.invoke`를 두 번 불러서 API도 두 번 호출됐다. 첫 줄의 결과는 버려진다.

체인 끝에 후처리를 붙일 수도 있다.

```python
prompt = ChatPromptTemplate(
    messages=[
        ("system", "모든 응답은 100글자 이내로 작성해줘."),
        ("user", "{query}")
    ]
)
model = ChatOpenAI(model="gpt-5.4-mini")
parser = StrOutputParser()
c1 = RunnableLambda(lambda x : (x, len(x)))

# chain구성. chain 응답: LLM 응답 내용, 글자수

chain = prompt | model | parser | c1
res = chain.invoke("AI에 대해 설명해줘")
res
```

```text
('AI는 데이터를 학습해 판단·예측·생성하는 컴퓨터 기술입니다.', 34)
```

```python
def get_value_len(value:str):
    return value, len(value)

c2 = RunnableLambda(get_value_len)


chain2 = prompt | model | parser | c2
# chain2 = prompt | model | parser | get_value_len (그냥 일반 함수를 넣어도 됌)


# 일반함수(callable)를 chain의 구성으로 포함시킬 수 있다
# 내부적으로 Runnable로 변환되서 들어간다.
res = chain2.invoke("산타는 있나?")
res
```

```text
('산타는 상상 속 인물이지만, 선물과 기쁨은 정말 있어요.', 31)
```

"100글자 이내" 지시를 지켰는지 체인 안에서 바로 글자 수를 셌다. 응답 검증 로직을 체인 마지막에 붙이는 패턴이다.

### RunnablePassthrough

입력을 가공하지 않고 그대로 넘긴다. `.assign()`으로 필드를 추가해서 넘길 수도 있다.

```python
from langchain_core.runnables import RunnablePassthrough

rp  = RunnablePassthrough() # 단순히 받은 값을 다음으로 통과시킨다.

result = rp.invoke("안녕하세요")

print(result)
```

```text
안녕하세요
```

```python
# 입력받은 값(딕셔너리)에 item을 추가해서 다음로 전달

r1 = RunnableLambda(lambda x: "서울시 금천구 독산동") # 예시일뿐 실제로는 어떤 처리 로직이 있을 것임
r2 = RunnableLambda(lambda x: "010-1111-2222")

# assign(key = Runnable, ...)
## 입력 받은 딕셔너리에 address와 tel_no key를 추가. value는 Runnable을 호출해서 반환된 값을 설정
rp2 = RunnablePassthrough.assign(
    address = r1,
    tel_no = r2
)

result = rp2.invoke({"name":"홍길동"})
result
```

```text
{'name': '홍길동', 'address': '서울시 금천구 독산동', 'tel_no': '010-1111-2222'}
```

원래 입력 `{'name': '홍길동'}`은 **그대로 두고** `address`, `tel_no`가 추가됐다. 체인은 앞 단계 출력이 다음 입력으로 **바뀌어** 버리는데, 이렇게 하면 앞의 값을 잃지 않는다. RAG에서 "원래 질문"을 유지한 채 "검색 결과"를 추가할 때 이 패턴을 쓴다.

### RunnableParallel

여러 Runnable을 **같은 입력으로 병렬 실행**하고 결과를 dict로 묶는다. LCEL에서는 체인 안에 dict를 쓰면 RunnableParallel이 된다.

```python
# RunnableParallel 한파트의 chain에서 컴포넌트를 병렬로 처리하기 위함

from langchain_core.runnables import RunnableParallel
```

```python
r1 = RunnableLambda(lambda x : x + 10)
r2 = RunnableLambda(lambda x : x - 10)
r3 = RunnableLambda(lambda x : x * 10)
r4 = RunnableLambda(lambda x : 1 if x > 10 else 0)

# c = r1 | r2 | r3 | r4

parallel = RunnableParallel(
    {
        "value1": r1,
        "value2": r2,
        "value3": r3,
        "value4": r4,
        "org_value": RunnablePassthrough() # 받은 값을 그대로 다시 넘겨줌, 원래 passthrough는 이렇게 같이 사용함
    }
)



#chain3 = prompt | model | parallel #(r1~r4)모두 병렬적으로 일한 뒤 dic으로 줌

result = parallel.invoke(200)
result
```

```text
{'value1': 210, 'value2': 190, 'value3': 2000, 'value4': 1, 'org_value': 200}
```

네 람다가 모두 200을 받았다. 주석 처리된 `r1 | r2 | r3 | r4`였다면 200 → 210 → 200 → 2000 → 1처럼 **이어서** 계산됐을 것이다. Parallel은 **나란히**, Sequence는 **이어서**다. `org_value`처럼 Passthrough를 함께 넣어 원래 입력을 보존하는 것이 전형적인 쓰임이다.

```python
################################################################################
# [ RunnableParallel: 병렬 처리의 마법 ]
################################################################################
#
# 1. 역할
#    - 하나의 입력(input)을 여러 개의 체인이나 함수에 동시에 전달합니다.
#    - 모든 작업이 끝나면 각각의 결과를 Key-Value 형태의 딕셔너리로 묶습니다.
#
# 2. 실무 활용 (RAG 파이프라인의 필수 요소)
#    - 보통 "검색(Retriever)"과 "질문(Input)"을 병렬로 처리할 때 가장 많이 씁니다.
#    - 예: 사용자의 질문은 그대로 가져가고(Passthrough), 
#          동시에 질문을 기반으로 DB에서 관련 법령을 검색함(Retriever).
#
################################################################################
```

RAG 체인은 보통 이런 모양이 된다. 다음 묶음에서 직접 만든다.

```python
chain = {"context": retriever, "question": RunnablePassthrough()} | prompt | model | parser
```

## LCEL 예제

### 레시피 체인

```python
##################################################
# TODO 1
# 음식 이름을 입력하면 그 음식의 레시피를 llm이 출력하는 Chain을 LCEL 을 이용해서 구성한다.
# 입력 : 음식 이름 - recipe_chain.invoke({"food":"김치찌게"})
# 출력 : 음식의 레시피 - 김치찌게 레시피. 

# chain구성: prompt_template -> model(gpt-5-mini) -> StrOutputParser
```

과제는 StrOutputParser였지만, 4편의 Pydantic 파서로 레시피를 항목별로 받게 바꿨다.

```python
from dotenv import load_dotenv

from pydantic import BaseModel, Field

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI

# --------------------------------------------------
# 환경변수 로드
# --------------------------------------------------
load_dotenv()

# --------------------------------------------------
# Pydantic Schema
# --------------------------------------------------
class Recipe(BaseModel):
    food_name: str = Field(description="음식 이름")
    ingredients: list[str] = Field(description="필요한 재료")
    steps: list[str] = Field(description="조리 순서")
    tip: str = Field(description="요리 팁")


# --------------------------------------------------
# Parser
# --------------------------------------------------
parser = PydanticOutputParser(
    pydantic_object=Recipe
)

# --------------------------------------------------
# Prompt
# --------------------------------------------------
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
            당신은 요리 레시피 연구가입니다.

            사용자의 음식에 대한 레시피를 생성하세요.

            반드시 아래 형식으로 출력하세요.

            {format_instructions}
            """
        ),
        (
            "user",
            "{food}"
        )
    ]
).partial(
    format_instructions=parser.get_format_instructions()
)

# --------------------------------------------------
# Model
# --------------------------------------------------
model = ChatOpenAI(
    model="gpt-5.4-mini",
    temperature=0.7
)

# --------------------------------------------------
# LCEL Chain
# --------------------------------------------------
recipe_chain = prompt | model | parser

# --------------------------------------------------
# 실행
# --------------------------------------------------
result = recipe_chain.invoke(
    {
        "food": "김치찌개"
    }
)

print(result)
print(type(result))
```

```text
food_name='김치찌개' ingredients=['신김치 2컵', '돼지고기 앞다리살 또는 목살 200g', '두부 1/2모', '대파 1대', '양파 1/2개', '청양고추 1~2개', '다진 마늘 1큰술', '고춧가루 1큰술', '국간장 1큰술', '설탕 1작은술', '참기름 1작은술', '물 또는 멸치육수 3컵', '소금 약간', '후추 약간'] steps=['김치는 먹기 좋게 썰고, 돼지고기는 한입 크기로 준비한다.', '냄비에 참기름을 두르고 돼지고기를 넣어 중불에서 볶는다.', '고기가 겉면이 익으면 김치, 다진 마늘, 고춧가루, 설탕을 넣고 함께 볶아 김치의 맛을 끌어낸다.', '물 또는 멸치육수를 붓고 끓인다.', '끓기 시작하면 국간장으로 간을 하고, 양파를 넣어 10분 정도 중약불로 끓인다.', '두부, 어슷 썬 대파, 청양고추를 넣고 3~5분 더 끓인다.', '맛을 보고 필요하면 소금과 후추로 마무리 간을 맞춘다.'] tip='신김치를 충분히 사용하면 찌개의 깊은 맛이 살아납니다. 돼지고기 대신 참치나 스팸을 넣어도 맛있고, 마지막에 김치 국물을 조금 넣으면 감칠맛이 더 좋아집니다.'
<class '__main__.Recipe'>
```

```python
print(result.food_name)
print(result.ingredients)
print('-'*20)
print(result.tip)
```

```text
김치찌개
['신김치 2컵', '돼지고기 앞다리살 또는 목살 200g', '두부 1/2모', '대파 1대', '양파 1/2개', '청양고추 1~2개', '다진 마늘 1큰술', '고춧가루 1큰술', '국간장 1큰술', '설탕 1작은술', '참기름 1작은술', '물 또는 멸치육수 3컵', '소금 약간', '후추 약간']
--------------------
신김치를 충분히 사용하면 찌개의 깊은 맛이 살아납니다. 돼지고기 대신 참치나 스팸을 넣어도 맛있고, 마지막에 김치 국물을 조금 넣으면 감칠맛이 더 좋아집니다.
```

`list[str]` 필드 덕분에 재료와 조리 순서가 리스트로 나와서, 화면에서 체크리스트나 단계별 카드로 바로 그릴 수 있다. 2~4편의 프롬프트 템플릿, 모델, Pydantic 파서가 `prompt | model | parser` 한 줄로 합쳐졌다.

### 번역 체인

```python
##############################################################
#  TODO 2
# 번역할 내용, 번역할 언어 를 입력하면 내용을 그 언어로 번역하는 Chain을 LCEL 을 이용해서 구성한다.
#
## 입력: 번역할 내용, 언어.  translate_chain.invoke({"content":"안녕하세요.", "language":"영어"})
## 출력: "번역할 내용"을 "언어" 로 번역한 결과 - "How are you?".

# chain구성: prompt_template -> model(gpt-5-mini) -> StrOutputParser
```

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 1. 모델 설정
# 모델명은 현재 사용 가능한 모델인 gpt-4o-mini로 설정했습니다.
model = ChatOpenAI(model="gpt-5.4-mini")

# 2. 프롬프트 템플릿 구성
template = """
당신은 전문 번역가입니다. 아래의 내용을 {language}(으)로 번역하세요.

내용: {content}
"""
prompt = ChatPromptTemplate.from_template(template)

# 3. Chain 구성 (LCEL)
translate_chain = prompt | model | StrOutputParser()

# 4. 실행 예시
result = translate_chain.invoke({"content": "안녕하세요.", "language": "영어"})
print(result)
# 출력: Hello.
```

```text
Hello.
```

## 체인과 체인 연결

레시피를 만들고 → 그 레시피를 원하는 언어로 번역하는 흐름을 만든다. 먼저 `itemgetter`:

```python
## operator 예제 

from operator import itemgetter

ig = itemgetter("language") # 자료구조에서 값을 조회할 index/key를 넣고 객체를 생성

a = {"language":"영어", "name":"홍길동"}

ig(a) # 자료구조를 넣어주면 생성할때 지정한  index/key 의 값을 조회해서 반환

ig2 = itemgetter(2)
b = [10,20,30,40,50,60]

ig2(b)
```

```text
30
```

```python
# from operator #잡다하게 함수를 모아둔 모듈
```

`itemgetter("language")`는 `lambda x: x["language"]`와 같은 함수를 만든다. 함수이니 체인에 그대로 넣을 수 있다.

체인은 함수처럼 부를 수 없다. 아래 셀은 에러가 나는 것이 정상이다.

```python
translate_chain({"content": "요리레시피", "language":"번역할 언어이름"})
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: &#x27;RunnableSequence&#x27; object is not callable</div></div>

체인은 항상 `translate_chain.invoke({...})`로 실행한다.

두 체인을 dict(RunnableParallel)로 잇는다. 아래 셀은 에러가 나는 것이 정상이다.

```python
# 음식 레시피를 원하는 언어로 출력하는 AI Agent가 필요.

## recipe_chain과 translate_chain을 연결
from langchain_core.runnables import RunnableLambda
from operator import itemgetter
# {}: RunnableParellel를 만듦

chain = {
    "content":recipe_chain,# | model | parser # 필요하면 이 안에서도 체인을 구현할 수 있음.
    "laguage":itemgetter("language")   # 콜러브함수를 그냥 넣음 
    #"language": RunnableLambda(lambda x: x['language'])

} | translate_chain 
res = chain.invoke({"food":"김치찌개", "language":"베트남어"})
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · KeyError: &quot;Input to ChatPromptTemplate is missing variables {&#x27;language&#x27;}.  Expected: [&#x27;content&#x27;, &#x27;language&#x27;] Received: [&#x27;content&#x27;, &#x27;laguage&#x27;]</div></div>

에러 메시지가 원인을 정확히 짚는다. 번역 프롬프트는 `language`를 기다리는데 dict 키가 `laguage`(오타)다. 키를 `"language"`로 고치면 된다.

```python
chain = {
    "content": recipe_chain,
    "language": itemgetter("language")
} | translate_chain

res = chain.invoke({"food":"김치찌개", "language":"베트남어"})
print(res)
```

고친 체인을 강의 자료에서 실행한 결과다(강의 자료의 `recipe_chain`은 StrOutputParser 버전).

```text
# Công thức canh kimchi hầm

## Thông tin cơ bản
- **Độ khó:** Dễ
- **Thời gian nấu:** 30–40 phút
- **Khẩu phần:** 2–3 người

## Nguyên liệu cần chuẩn bị
- 2 cốc kimchi (kimchi đã lên men ngon)
- 150g thịt heo vai hoặc ba chỉ
- 1/2 bìa đậu phụ
… (생략)
```

입력 `{"food": "김치찌개", "language": "베트남어"}` 하나가 dict의 두 갈래로 동시에 들어간다. `content` 쪽은 `food`로 레시피를 만들고, `language` 쪽은 입력에서 언어만 꺼낸다. 두 결과가 `{"content": 레시피, "language": "베트남어"}`로 묶여 번역 체인에 들어간다. 체인도 Runnable이라 다른 체인의 부품이 된다.

## 함수를 Runnable로: @chain

함수를 Runnable로 만드는 방법은 세 가지다.

1. 체인 안에 함수를 그냥 넣는다. 자동으로 Runnable이 된다
2. `RunnableLambda(함수)`로 감싼다. 람다식은 이렇게 해야 한다
3. 함수에 **`@chain` 데코레이터**를 붙인다. 그 함수가 `RunnableLambda`가 된다

```python
# 함수 자체를 넣으면 알아서 runnable 타입을 바뀜
```

먼저 파라미터가 여러 개인 함수를 체인에 넣는 법이다. Runnable 함수는 입력을 **하나**만 받으므로 리스트나 dict 하나로 묶어서 받는다.

```python
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
def plus(n1,n2):
    return n1+n2

# 입력을 단일 객체(리스트나 딕셔너리 등)로 패키징
# 지금 파라미터가 2개임 첫번째 n1은 인풋으로 바로 들어가지만 n2은 옵션으로 설정이 됌
# 그래서 자료구조 1개로 받아서 넘겨줘야함 
chain = RunnablePassthrough() | RunnableLambda(lambda x : plus(x[0], x[1])) # 지금은 list, 만약 dict일경우 딕셔너리 형태로 넘겨줘야함
chain.invoke([1, 2])
```

```text
3
```

```python
def plus(n1, n2):
    return n1 + n2

# 딕셔너리로 받을 경우
chain = RunnableLambda(lambda x: plus(x["n1"], x["n2"]))

# 실행 시 딕셔너리 형태로 전달
result = chain.invoke({"n1": 1, "n2": 2})
print(result) # 3
```

```text
3
```

람다가 dict를 받아 `plus`의 두 인자로 풀어 주는 **어댑터** 역할을 한다. 처음부터 dict 하나를 받도록 함수를 만들면 람다 없이 바로 넣을 수 있다(`def wrap(data): return data["n1"] + data["n2"]`).

### LCEL의 한계와 @chain

LCEL은 순차 실행 구조라서 제어문으로 흐름을 바꿀 수 없다. 이런 경우가 어렵다.

- 조건에 따라 어떤 단계를 실행하거나 건너뛰어야 할 때
- 같은 단계를 반복해야 할 때
- 판단에 따라 실행 경로가 달라지는 agent 구조

이럴 때 흐름 자체를 함수로 직접 짜고 `@chain`을 붙인다. 이런 흐름을 더 구조적으로 정의하려고 만든 것이 **LangGraph**다.

```python
# 랭그래프가 나오기 전까지는 chain decorator를 사용했음.
# 순차적인 흐름에서 가지치기가 되어야 할때, 로직을 직접 함수로 구현해서 연결해야 했음
```

레시피와 번역 결과를 **둘 다** 받고, 한국어 원문은 원할 때만 함께 돌려주는 흐름이다. `if`가 들어가서 LCEL만으로는 만들 수 없다.

```python
# recipe_chain 과 translate_chain을 이용해서 음식레시피를 특정언어로 반환

### recipe_chain의 결과와 translate_chain의 결과 둘을 모두 구현하고 싶음

# 중간 값을 다 받고 싶음

# RunnableLamda(multi_language_recipe_chain)
@chain
def multi_language_recipe_chain(input_data:dict)->dict[str, str]:
    food = input_data['food'] # 음식이름
    language = input_data['language'] # 레시피 언어
    is_korean = input_data['is_korean'] # 한국어 레시피 필요 여부

    korean_recipe = recipe_chain.invoke({"food":food})

    result = translate_chain.invoke({"content": korean_recipe, "language":language})

    final_result = {"Recipe":result}

    if is_korean: # 한국어 레시피도 요청
        final_result["korean recipe"] = korean_recipe

        return final_result
    
type(multi_language_recipe_chain)
```

이 셀은 실행 결과가 없고, 그대로 실행하면 동작하지 않는다. 두 가지를 고쳐야 한다.

- **`@chain` import가 없다.** 이 시점의 `chain`은 바로 위에서 만든 체인 객체라서, `@chain`이 데코레이터가 아니라 그 객체를 함수처럼 부르게 된다. 앞에서 본 `'RunnableSequence' object is not callable` 같은 에러가 난다. `from langchain_core.runnables import chain`이 필요하고, 체인 변수 이름을 `chain`으로 짓지 않는 편이 안전하다
- **`return`이 `if` 안에 들어가 있다.** `is_korean=False`면 아무것도 반환하지 않는다(None). `return`을 `if` 밖으로 내어야 한다

고친 버전(강의 자료):

```python
from langchain_core.runnables import chain

@chain
def multi_language_recipe_chain(input_data: dict) -> dict[str, str]:
    food: str = input_data['food']  # 음식 이름
    language: str = input_data['language'] # 레시피 언어
    is_korean: bool = input_data["is_korean"] # 한국어 레시피 필요 여부. 

    korean_recipe = recipe_chain.invoke({"food":food})

    result = translate_chain.invoke({"content": korean_recipe, "language": language})

    final_result = {"recipe": result}

    if is_korean: # 한국어 레시피도 요청
        final_result["korean_recipe"] = korean_recipe

    return final_result

type(multi_language_recipe_chain)
```

```text
langchain_core.runnables.base.RunnableLambda
```

`@chain`을 붙인 함수가 `RunnableLambda`가 되었다. 이제 `multi_language_recipe_chain.invoke({"food": "돈까스", "language": "중국어", "is_korean": True})`로 부르고, 다른 체인과 `|`로 이을 수도 있다. 함수 안에서는 `if`, `for`, 중간 결과 저장이 자유롭다. 대신 흐름이 함수 안에 숨어서 체인 그림만 보고는 구조를 알 수 없다. 이 단점을 LangGraph가 노드와 엣지로 푼다.

## Cache

같은 질문이 다시 오면 LLM을 부르지 않고 저장된 답을 돌려준다. 속도와 비용을 줄이고, 비슷한 질문이 반복되는 챗봇에 특히 유용하다. 메모리, SQLite 등에 저장한다.

```python
################################################################################
### LangChain LLM Caching (캐싱) 설명
###
### 1. 개요: 
###    동일한 프롬프트(질문)가 다시 들어올 경우, LLM API를 호출하지 않고 
###    이전에 저장해둔 결과값을 즉시 반환하는 기능입니다.
###
### 2. 장점:
###    - 속도 향상: API 통신 지연 없이 즉시 응답 (사용자 경험 개선)
###    - 비용 절감: LLM API 호출 횟수를 줄여 토큰 사용량 및 비용 최적화
###
### 3. 작동 원리:
###    - 프롬프트(질문)와 모델 파라미터를 결합하여 키(Key)를 생성합니다.
###    - 처음 질문 시 결과를 저장하고, 동일한 키가 들어오면 캐시에서 읽어옵니다.
###
### 4. 사용 방법 (예시):
###    from langchain.globals import set_llm_cache
###    from langchain_community.cache import SQLiteCache # 혹은 InMemoryCache
###
###    # 로컬 파일에 결과를 저장하는 SQLite 방식을 가장 많이 사용합니다.
###    set_llm_cache(SQLiteCache(database_path=".langchain.db"))
###
################################################################################

# 실제 사용 예시 코드 (VS Code 셀에 붙여넣어 확인해보세요)
from langchain_core.globals import set_llm_cache
from langchain_community.cache import SQLiteCache
from langchain_openai import ChatOpenAI
import time

# 캐시 설정 (이제 정상적으로 동작할 것입니다)
set_llm_cache(SQLiteCache(database_path=".langchain.db"))

print("캐시 설정이 성공적으로 완료되었습니다.")

# 1. 캐시 설정 (최초 1회 실행)
set_llm_cache(SQLiteCache(database_path=".langchain.db"))

# 2. LLM 초기화
llm = ChatOpenAI()

# 3. 첫 번째 질문 (실제 API 호출 발생 - 시간이 걸림)
start_time = time.time()
response1 = llm.invoke("대한민국의 수도는 어디인가요?")
print(f"첫 번째 응답 시간: {time.time() - start_time:.4f}초")

# 4. 두 번째 질문 (캐시된 데이터 사용 - 거의 즉시 응답)
start_time = time.time()
response2 = llm.invoke("대한민국의 수도는 어디인가요?")
print(f"두 번째 응답 시간: {time.time() - start_time:.4f}초")
```

```text
캐시 설정이 성공적으로 완료되었습니다.
첫 번째 응답 시간: 5.8859초
두 번째 응답 시간: 0.0050초
```

5.9초가 0.005초가 됐다. 약 1,000배 빠르고, 두 번째 호출은 토큰 비용도 없다. 키는 **프롬프트와 모델 파라미터의 조합**이라서 글자 하나만 달라도("대한민국 수도는?") 캐시를 쓰지 못한다. 의미가 같은 질문까지 묶으려면 임베딩 유사도로 찾는 시맨틱 캐시를 쓴다.

```python
################################################################################
### SQLiteCache에 대한 상세 설명 및 활용 이유
###
### 1. SQLite란?
###    - 별도의 서버 설치가 필요 없는 '파일 기반'의 경량 관계형 데이터베이스입니다.
###    - 모든 데이터가 서버가 아닌 .db라는 하나의 파일 안에 저장됩니다.
###
### 2. 왜 LLM 캐싱에 SQLite를 쓰는가? (InMemoryCache와의 비교)
###    - 영속성(Persistence): 프로그램(챗봇)을 껐다 켜도 데이터가 파일에 남아있습니다.
###      즉, 어제 사용자가 질문했던 내용을 오늘 다시 물어봐도 캐시된 답변을 
###      그대로 보여줄 수 있습니다.
###    - 자원 효율성: 메모리(RAM)를 많이 차지하지 않으면서도, 대용량의 질문-답변 
###      쌍을 효율적으로 검색하고 관리할 수 있습니다.
###    - 설정의 간편함: 별도의 DB 서버(MySQL, PostgreSQL 등)를 구축할 필요 없이 
###      라이브러리 호출만으로 바로 사용할 수 있습니다.
###
### 3. 주요 구성 요소
###    - database_path: 캐시 파일이 저장될 경로 (예: "my_chatbot_cache.db")
###
### 4. 실전 적용 팁
###    - 챗봇 서비스화: 나중에 노동법 챗봇 등을 만드실 때, 사용자들의 반복되는 
###      질문(예: "연차 유급휴가 규정이 뭐야?")을 이 파일에 저장해두면 
###      서비스 속도가 훨씬 빨라집니다.
################################################################################

# [참고] 사용 시 설치 명령어 (터미널에서 실행)
# pip install langchain-community

from langchain_community.cache import SQLiteCache
from langchain_core.globals import set_llm_cache

# SQLite는 파일 하나로 관리되므로 경로를 지정해줍니다.
# 이 코드를 실행하면 현재 폴더에 'hr_bot_cache.db' 파일이 자동으로 생성됩니다.
set_llm_cache(SQLiteCache(database_path="hr_bot_cache.db"))

print("SQLite 캐싱 설정이 완료되었습니다.")
```

```text
SQLite 캐싱 설정이 완료되었습니다.
```

| 캐시 | 저장 위치 | 프로그램 재시작 후 |
|---|---|---|
| `InMemoryCache` | 메모리 | 사라진다 |
| `SQLiteCache` | `.db` 파일 | 남는다 |

> **보충** 캐시는 같은 질문에 **항상 같은 답**을 돌려준다는 뜻이기도 하다. `temperature`로 다양한 답을 기대하는 창작형 서비스나, 시간이 지나면 답이 바뀌어야 하는 질문(오늘 날씨, 최신 규정)에는 맞지 않는다. 규정이 개정되면 캐시 파일도 비워야 한다.

## 무엇으로 체인을 짤까

| 상황 | 추천 |
|---|---|
| 프롬프트 → 모델 → 파서처럼 순서가 고정된 흐름 | LCEL `a \| b \| c` |
| 체인 중간에 간단한 가공(글자 수, 형식 변환)이 필요하다 | 함수를 그대로 넣거나 `RunnableLambda` |
| 앞 단계의 값을 잃지 않고 새 값을 추가해야 한다 | `RunnablePassthrough.assign()` |
| 같은 입력으로 여러 작업을 동시에 하고 결과를 묶는다 (RAG의 질문 + 검색) | dict = `RunnableParallel` (+ Passthrough) |
| dict 입력에서 키 하나만 꺼내 넘긴다 | `itemgetter("key")` |
| 조건 분기, 반복, 중간 결과 여러 개 반환 | `@chain` 함수 → 더 복잡하면 LangGraph |
| 같은 질문이 반복된다 | `SQLiteCache` |

## 정리

- **Chain**은 컴포넌트를 순서대로 연결해 작업을 자동화한다. 예전의 `LLMChain` 같은 클래스 방식은 deprecated이고, 지금은 **LCEL**(`prompt | model | parser`)을 쓴다
- 프롬프트, 모델, 파서, 체인 모두 **Runnable**이라서 `invoke`, `batch`, `stream`으로 똑같이 실행하고 `|`로 잇는다. 체인은 함수처럼 부를 수 없고 `invoke`로 실행한다
- `RunnableLambda`는 함수를, `RunnablePassthrough`는 입력 보존을, `RunnableParallel`(dict)은 같은 입력의 병렬 처리를 맡는다
- 체인도 Runnable이라 다른 체인의 부품이 된다. 연결할 때 **키 이름이 다음 프롬프트의 변수와 정확히 맞아야** 한다(`laguage` 오타)
- LCEL은 순차 구조라 분기와 반복을 못 한다. `@chain` 함수로 흐름을 직접 짜고, 더 복잡해지면 **LangGraph**로 간다
- **캐시**는 같은 프롬프트의 응답을 저장해 5.9초를 0.005초로 줄였다. 글자가 하나라도 다르면 쓰지 못한다
