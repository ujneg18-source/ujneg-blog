---
title: "Output Parser: LLM 응답을 구조화하기"
description: "LLM의 텍스트 응답을 프로그램에서 쓸 수 있는 형태로 바꾸는 Output Parser(StrOutputParser, CommaSeparatedListOutputParser, JsonOutputParser, PydanticOutputParser)와 get_format_instructions, Pydantic 스키마 설계, 모델에 출력 형식을 붙이는 with_structured_output, 그리고 stream 응답을 정리합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'LangChain 기초'
seriesOrder: 4
originalNotebook: "04_output_parser.ipynb"
tags: ["LLM","LangChain"]
date: 2026-06-24T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-output-parser.webp'
---

> SKN31 AI Agent 과정 노트북 `04_output_parser.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과이고, 출력이 남아 있지 않은 두 곳(스키마 없는 JsonOutputParser, 스키마 지침 문구)은 강의 자료의 실행 결과로 보충했습니다. LLM 응답은 실행할 때마다 달라집니다.

## 이 글에서 다루는 것

- Output Parser가 필요한 이유와 `parse`, `get_format_instructions`, `invoke`
- `StrOutputParser`: 메시지에서 문자열만
- `CommaSeparatedListOutputParser`: 쉼표 구분 → 리스트
- `JsonOutputParser`: JSON → dict, 스키마가 있을 때와 없을 때
- `PydanticOutputParser`: JSON → Pydantic 객체
- `with_structured_output`: 모델 자체에 출력 형식 붙이기
- `stream` 응답 처리

## Model I/O 다시 보기

```python
# ollama
# lm studio
# ui 기반 챗봇시스템을 줌

# 랭체인 시스템을 연결할 수 있음 (서버에 올려두고) api 통신

# llm api를 쓸 수 있는 서비스와 라이브러리를 제공한다.

# model를 llm 이고
# 그걸 받는 최소한의 입출력단위를 model io라고 함


# 모델한테 주는 것
# 프롬프트 템플릿을 이용


# 모델한테 받는 것
# 아웃풋 파서를 사용해서 관리

# 출력물은 보통 json형태로 받음
```

```python
# ai 랭체인을 연결할 때는 외부와 연결해야할 때가 많음 integrath

# core는 langchain 과 연결 (uv pip install langchain-openai)

# core 외에 다른 필요한 라이브러리는 따로 설치해야 함 

# qu(q-콰이어트, u-업그레이드)
```

2편이 모델, 3편이 **모델에 주는 것**(프롬프트 템플릿)이었다면 이번 글은 **모델에서 받는 것**(출력 파서)이다. `pip install -qU`의 `q`는 quiet(설치 로그 줄이기), `U`는 upgrade(최신 버전으로)다.

> **보충** 메모 첫 줄의 Ollama와 LM Studio는 오픈소스 LLM을 내 컴퓨터에 설치해 돌리는 도구다. 로컬에서 OpenAI와 비슷한 API 서버를 띄워 주기 때문에, LangChain에서 `ChatOllama` 같은 클래스로 상용 모델과 같은 방식으로 연결할 수 있다. 2편의 `HuggingFacePipeline`보다 설정이 간단하다.

```python
#######0623#######

# model IO
# output

# LLM의 출력결과를 적절한 형식으로 변환하는 도구
```

## Output Parser

**Output Parser**는 LLM의 출력을 **애플리케이션에서 쓸 수 있는 형식으로 변환**하는 도구다. LLM은 텍스트로 답하지만 프로그램은 리스트, dict, 객체가 필요하다. 키워드 리스트를 뽑거나 JSON으로 정보를 정리할 때 쓴다.

| 파서 | 변환 | 예 |
|---|---|---|
| **StrOutputParser** | AIMessage → 문자열 | `AIMessage(content="…")` → `"…"` |
| **CommaSeparatedListOutputParser** | 쉼표 구분 텍스트 → list | `"사과, 바나나, 포도"` → `["사과", "바나나", "포도"]` |
| **JsonOutputParser** | JSON 텍스트 → dict | `'{"name": "이순신"}'` → `{"name": "이순신"}` |
| **PydanticOutputParser** | JSON 텍스트 → Pydantic 객체 | → `PersonInfo(name="이순신", …)` |

| 메소드 | 하는 일 |
|---|---|
| `parse(text)` | 문자열 응답을 정해진 구조로 변환한다 |
| `get_format_instructions()` | "이런 형식으로 답하라"는 **프롬프트용 지침 문구**를 돌려준다. 이것을 프롬프트에 넣어야 LLM이 그 형식으로 답한다 |
| `invoke(입력)` | Runnable 공통 메소드. 내부에서 `parse`를 호출한다. 문자열도, AIMessage도 받는다 |

2편에서 본 Model I/O 그림의 "파서가 프롬프트에 가이드를 준다"가 `get_format_instructions()`다. 파서는 응답을 **받는 쪽**이면서, 동시에 응답 형식을 **요청하는 문장**도 만든다.

## StrOutputParser

Chat 모델은 응답을 AIMessage 객체로 돌려준다. StrOutputParser는 거기서 `content` 문자열만 꺼낸다.

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

load_dotenv()
```

```text
True
```

```python
prompt = ChatPromptTemplate.from_template(
    template="한국의 {topic}에 관련된 속담 {count}개를 알려줘. 목록형식으로 출력해줘!"    
)

model = ChatOpenAI(model="gpt-5.4-nano")
parser = StrOutputParser()

#prompt - [Query] -> model -> [response:AImessages] -> parser - [문자열] -> final_output

query = prompt.invoke({"topic":"호랑이", "count":3})
print(query)
response = model.invoke(query)
response
```

```text
messages=[HumanMessage(content='한국의 호랑이에 관련된 속담 3개를 알려줘. 목록형식으로 출력해줘!', additional_kwargs={}, response_metadata={})]

AIMessage(content='- **호랑이 새끼도 굴에서 놀면 산으로 가는 법**  \n- **호랑이 굴에 들어가야 호랑이 새끼를 잡는다**  \n- **호랑이 잡으려다 맹수(맹랑) 짓 한다**', additional_kwargs={'refusal': None}, response_metadata={'token_usage': {'completion_tokens': 65, 'prompt_tokens': 30, 'total_tokens': 95, … }, 'model_name': 'gpt-5.4-nano-2026-03-17', … }, … usage_metadata={'input_tokens': 30, 'output_tokens': 65, 'total_tokens': 95, …})
```

`ChatPromptTemplate.from_template`으로 문자열 하나만 주면 HumanMessage 하나짜리 채팅 프롬프트가 된다.

```python
# 연습할 때, 토큰 수를 줄이려면 출력값은 밖에 다루면 좋다.

res_str = parser.invoke(response)
print(res_str)
print(response.content)
```

```text
- **호랑이 새끼도 굴에서 놀면 산으로 가는 법**  
- **호랑이 굴에 들어가야 호랑이 새끼를 잡는다**  
- **호랑이 잡으려다 맹수(맹랑) 짓 한다**
- **호랑이 새끼도 굴에서 놀면 산으로 가는 법**  
- **호랑이 굴에 들어가야 호랑이 새끼를 잡는다**  
- **호랑이 잡으려다 맹수(맹랑) 짓 한다**
```

`parser.invoke(response)`와 `response.content`가 같은 결과다. 그런데 왜 파서를 쓸까? 5편에서 `prompt | model | parser`로 체인을 만들면 마지막 단계에서 문자열을 바로 받을 수 있기 때문이다. `.content`는 체인 안에 넣을 수 없다.

메모의 "연습할 때 출력값은 밖에서 다루면 좋다"는 모델 호출(`response = model.invoke(...)`)과 후처리(`parser.invoke(response)`)를 **다른 셀**로 나누라는 뜻이다. 파서를 바꿔 가며 연습할 때 모델을 다시 부르지 않아도 되니 토큰이 들지 않는다.

내용도 볼 필요가 있다. 둘째 "호랑이 굴에 들어가야 호랑이 새끼를 잡는다"는 실제 속담이지만, 첫째와 셋째는 이런 속담이 없다. 형식은 정확히 지켰는데 내용은 지어냈다. 파서는 **형식**을 보장할 뿐 **사실**을 보장하지 않는다.

## CommaSeparatedListOutputParser

쉼표로 구분된 텍스트를 리스트로 바꾼다.

```python
from langchain_core.output_parsers import CommaSeparatedListOutputParser
parser = CommaSeparatedListOutputParser()
txt = "서울,인천,부산,광주,대전,울산"
r1 = parser.parse(txt)
r2 = parser.invoke(txt)

print(r1)
print(r2)
```

```text
['서울', '인천', '부산', '광주', '대전', '울산']
['서울', '인천', '부산', '광주', '대전', '울산']
```

LLM이 이 형식으로 답하게 하려면 지침 문구가 필요하다.

```python
# Output Parser에 맞는 출력을 LLM 모델이 하도록 프롬프트에 넣을 지침을 조회.
instruction = parser.get_format_instructions()
print(instruction)
```

```text
Your response should be a list of comma separated values, eg: `foo, bar, baz` or `foo,bar,baz`
```

그런데 이 지침을 쓰지 않고 "리스트 형식"이라고만 쓰면:

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_messages(
    messages=[
        ("system", "출력형식: {output_format}"), # 템플릿 문법에 맞게 수정
        ("user", "{query}")
    ]
)

model = ChatOpenAI(model="gpt-4o-mini") # 실행 가능한 모델명으로 수정

# 템플릿에 정의된 모든 키(output_format, query)를 포함해야 에러가 나지 않습니다.
query = prompt.invoke({"output_format": "리스트 형식", "query": "자동차 종류 다섯가지를 알려줘"})
response = model.invoke(query)

print(response.content)
```

```text
1. 세단 (Sedan)
2. SUV (Sport Utility Vehicle)
3. 해치백 (Hatchback)
4. 쿠페 (Coupe)
5. 스테이션 왜건 (Station Wagon)
```

```python
res = parser.invoke(response)
print(res)
```

```text
['1. 세단 (Sedan)', '2. SUV (Sport Utility Vehicle)', '3. 해치백 (Hatchback)', '4. 쿠페 (Coupe)', '5. 스테이션 왜건 (Station Wagon)']
```

모델은 "리스트 형식"을 **번호 목록**으로 이해했고, 줄바꿈으로 구분된 답에는 쉼표가 없다. 쉼표가 없는데도 다섯 개로 나뉜 건, 파서가 내부적으로 텍스트를 CSV처럼 읽어서 줄바꿈을 행 구분으로 처리하기 때문이다. 하지만 `'1. 세단 (Sedan)'`처럼 **번호와 영어가 붙은 채로** 들어갔다. 원하는 결과는 `['세단', 'SUV', …]`였을 것이다. `{output_format}`에 `"리스트 형식"` 대신 `parser.get_format_instructions()`를 넣어야 파서가 기대하는 모양(`세단, SUV, 해치백, …`)으로 답한다. **파서와 지침은 짝으로** 쓴다.

## JsonOutputParser

- JSON 형식의 응답을 dict로 바꾼다
- 어떤 키에 어떤 값을 넣을지 정하려면 **Pydantic으로 스키마**를 정의해 넘긴다. 스키마는 필수가 아니다

```python
"""
json(JavaScript Object Notation)
{'이름':'홍길동','나이':30} # 파이썬하고 자바스크립트 문법이 달라서 서로 데이터를 주고 받을 때, 공통된 문자열로 교환함
json(javascript) = python(dict)

"""
# 자바스크립트에서 객체를 생성하는 방법 (파이썬 클래스만든 것)


# json => 호환성이 좋아서 자주 사용하는 format

a = {"이름":"홍길동"}

a["이름"]
```

```text
'홍길동'
```

JSON은 원래 자바스크립트의 객체 표기법인데, 언어와 상관없이 데이터를 주고받는 **공통 문자열 형식**이 되었다. 파이썬에서는 dict로, 자바스크립트에서는 객체로 바로 바뀐다.

```python
from langchain_core.output_parsers import JsonOutputParser

parser = JsonOutputParser()

print(parser.get_format_instructions())
```

```text
Return a JSON object.
```

```python
# Return a JSON object. Json으로 줘.
```

```python
txt = '{"name":"이순신","age":30, "address":"서울"}'
r1 = parser.parse(txt)
r2 = parser.invoke(txt)

print(type(r1),r1)
print(type(r2),r2)
```

```text
<class 'dict'> {'name': '이순신', 'age': 30, 'address': '서울'}
<class 'dict'> {'name': '이순신', 'age': 30, 'address': '서울'}
```

### 스키마 없이 LLM에 JSON을 요청하면

지침을 프롬프트에 넣을 때는 `.partial()`로 **미리 채워 둘 변수**를 지정한다. 매번 `invoke`에 넣지 않아도 된다.

```python
parser = JsonOutputParser()
prompt = ChatPromptTemplate.from_messages(
    messages=[
        ("system", "output format: {output_format}"),
        ("user", "{query}")
    ]
).partial(output_format=parser.get_format_instructions())

model = ChatOpenAI(model="gpt-4o-mini")

query = prompt.invoke({"query": "이순신 장군에 대해 알려줘"})
res = model.invoke(query)

print(res.content)
final_answer = parser.invoke(res)

print(final_answer["answer"])
print(final_answer.keys())
```

수업 노트북에는 이 셀의 출력이 남아 있지 않아서, 같은 코드를 강의 자료에서 실행한 결과를 본다(모델은 `gpt-5.4-mini`).

```text
이순신 장군(1545~1598)은 조선의 명장이자 한국 역사에서 가장 존경받는 인물 중 한 명입니다. 임진왜란 때 조선 수군을 이끌고 일본군을 상대로 큰 승리를 거두며 나라를 지켜낸 인물로 유명합니다.

### 간단한 소개
- **출생**: 1545년, 한양
- **사망**: 1598년, 노량해전 중 전사
… (생략)
```

"Return a JSON object."라는 지침이 있었는데도 **마크다운으로 답했다**. 이대로는 파싱이 실패한다. 다른 실행에서 JSON으로 답한 경우에도 키는 이렇게 나왔다.

```text
dict_keys(['answer'])
```

`{"answer": "긴 설명 문장"}`처럼 키 하나에 전부 몰아넣은 것이다. JSON이긴 하지만 dict로 받는 의미가 없다.

```python
#dict 형태로 뽑으면 이득인 이유가

#llm의 출력물을 항목별로 key-value쌍으로 받기 때문에 각각 조회할 수 있음

#그래서 단순히 json쌍으로 받는게 의미가 있는 것이 아니라

#dict이라는 자료구조에 맞춰서 llm에게 항목별로 세분화해달라고 해야함

#이를 위해서 스키마라는 output format을 위한 설계를 해야함 

#그때 쓰는 라이브러리가 Pydantic임
```

### 스키마 설계: Pydantic

어떤 키에 어떤 값을 넣을지 **스키마**를 Pydantic 클래스로 설계한다. 필드마다 타입(type hint)과 설명(`Field(description=…)`)을 준다. 이 설명이 그대로 LLM에게 가는 지시문이 된다.

```python
"""
1) JSON 형식에 대한 스키마를 설계
 - 어떤 키를 가지며 그 키에 어떤 값을 넣어야 하는지를 설계
 - pydantic 모델을 이용 

"""

from pydantic import BaseModel, Field
class PersonInforSchema(BaseModel):
    """
    인물 정보에 대한 응답을 위한 스키마

    """
# 변수명(key): 결과값의 타입 = Field(description="어떤값을 넣을지 설명")

# 변수명 => 결과값의 타입은 참조 type hint
    name: str = Field(description="조회한 사람의 이름")
    yob: int = Field(description="조회한 사람의 출생년도 모를 경우는 -1를 대입")
    yod: int = Field(description="조회한 사람의 사망년도 모를 경우는 -1를 대입")
    profile: str = Field(description="조회한 사람의 주요 업적 소개")

# parser2 = JsonOutputParser(pydantic_object=PersonInforSchema)
# a=parser2.get_format_instructions()

```

주석 처리된 두 줄이 스키마를 넘겨 파서를 만들고 지침 문구를 받는 코드다. 이 두 줄을 실행한 뒤 출력한다.

```python
print(a)
```

```text
STRICT OUTPUT FORMAT:
- Return only the JSON value that conforms to the schema. Do not include any additional text, explanations, headings, or separators.
- Do not wrap the JSON in Markdown or code fences (no ``` or ```json).
- Do not prepend or append any text (e.g., do not write "Here is the JSON:").
- The response must be a single top-level JSON value exactly as required by the schema (object/array/etc.), with no trailing commas or comments.

The output should be formatted as a JSON instance that conforms to the JSON schema below.

As an example, for the schema {"properties": {"foo": {"title": "Foo", "description": "a list of strings", "type": "array", "items": {"type": "string"}}}, "required": ["foo"]} the object {"foo": ["bar", "baz"]} is a well-formatted instance of the schema. The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.

Here is the output schema (shown in a code block for readability only — do not include any backticks or Markdown in your output):
{"description": "인물 정보에 대한 응답을 위한 Schema", "properties": {"name": {"description": "조회한 사람의 이름", "title": "Name", "type": "string"}, "yob": {"description": "조회한 사람의 출생 년도. 모를 경우는 -1을 대입", "title": "Yob", "type": "integer"}, "yod": {"description": "조회한 사람의 사망 년도. 모를 경우는 -1을 대입", "title": "Yod", "type": "integer"}, "profile": {"description": "조회한 사람의 주요 업적 소개", "title": "Profile", "type": "string"}}, "required": ["name", "yob", "yod", "profile"]}
```

(수업 노트북에 남은 출력은 필드가 정의되기 전 시점의 것이라 `properties`가 비어 있어서, 강의 자료의 출력을 실었다. 설명 문구가 조금 다르다.)

스키마 없이는 "Return a JSON object." 한 줄이던 지침이 이렇게 길어졌다. 마크다운으로 감싸지 말 것, 앞뒤에 다른 말을 붙이지 말 것, 그리고 **JSON Schema**(키 이름, 타입, 설명, 필수 여부)까지 들어간다. 클래스 docstring도 스키마의 `description`이 된다.

```python
prompt2 = ChatPromptTemplate.from_messages(
    messages=[
        ("system", "output format: {output_format}"),
        ("user", "{query2}")
    ]
).partial(output_format=parser2.get_format_instructions())

model = ChatOpenAI(model="gpt-5.4-nano")

query2 = prompt2.invoke({"query2": "이순신 장군에 대해 알려줘"})
res2 = model.invoke(query2)

print(res2.content)
```

```text
{"name":"이순신","yob":1545,"yod":1598,"profile":"조선 중기의 무신으로 임진왜란 당시 조선 수군을 이끌어 왜군과의 해전에서 연전연승하며 나라를 구한 인물이다. 특히 거북선과 판옥선 등 전력을 바탕으로 명량해전, 한산도대첩 등 주요 해전을 승리로 이끌며 전쟁의 흐름을 바꾸었다. 사후에도 충무공으로 추앙받으며, 난중일기 등 기록을 통해 전쟁기록과 리더십을 보여준 것으로 평가된다."}
```

같은 질문인데 이번에는 마크다운 없이 **JSON 한 줄**만 왔다. 키도 스키마대로 `name`, `yob`, `yod`, `profile`이다.

```python
answer = parser2.invoke(res2.content)
print(answer['name'])
print(answer['yob'])
print(answer['yod'])
print(answer['profile'])
```

```text
이순신
1545
1598
조선 중기의 무신으로 임진왜란 당시 조선 수군을 이끌어 왜군과의 해전에서 연전연승하며 나라를 구한 인물이다. 특히 거북선과 판옥선 등 전력을 바탕으로 명량해전, 한산도대첩 등 주요 해전을 승리로 이끌며 전쟁의 흐름을 바꾸었다. 사후에도 충무공으로 추앙받으며, 난중일기 등 기록을 통해 전쟁기록과 리더십을 보여준 것으로 평가된다.
```

출생·사망 연도가 **정수**로 따로 나와서 바로 계산하거나 DB 컬럼에 넣을 수 있다. 이것이 메모에서 말한 "항목별로 세분화"다.

## PydanticOutputParser

JsonOutputParser와 같은 방식인데, 결과를 dict가 아니라 **Pydantic 객체**로 돌려준다.

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

parser = PydanticOutputParser(
    pydantic_object=PersonInforSchema
)

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "당신은 초등학교 역사선생님입니다. "
            "다음 출력 형식에 맞춰 답변해주세요.\n\n"
            "<출력형식>{output_format}</출력형식>"
        ),
        ("user", "{query}")
    ]
).partial(
    output_format=parser.get_format_instructions()
)

model = ChatOpenAI(model="gpt-5.4-mini")
```

3편의 원칙대로 역할("초등학교 역사선생님")과 출력 형식을 태그(`<출력형식>`)로 나눠 넣었다.

```python
# 1. prompt 생성
query = prompt.invoke({"query":"세종대왕에 대해 알려주세요."})

# 2. model에게 요청
res = model.invoke(query)
print(type(res), res)
```

```text
<class 'langchain_core.messages.ai.AIMessage'> content='{"name":"세종대왕","yob":1397,"yod":1450,"profile":"조선의 4대 왕으로, 한글 창제를 이끌고 학문과 과학, 농업, 음악, 천문 등 여러 분야의 발전을 크게 이끈 훌륭한 임금입니다. 백성을 사랑하는 정치를 펼쳤으며, 집현전을 통해 학자들을 기용해 나라의 문화와 학문을 크게 발전시켰습니다."}' … usage_metadata={'input_tokens': 339, 'output_tokens': 108, 'total_tokens': 447, …}
```

입력이 339토큰이다. 질문은 한 줄인데 형식 지침이 대부분을 차지한다. 형식을 강제하는 대가로 매 요청마다 이만큼의 입력 토큰을 더 낸다.

```python
# 3. 응답을 응답 포멧에 맞게 parsing
final_answer = parser.invoke(res)

print(type(final_answer), final_answer)
```

```text
<class '__main__.PersonInforSchema'> name='세종대왕' yob=1397 yod=1450 profile='조선의 4대 왕으로, 한글 창제를 이끌고 학문과 과학, 농업, 음악, 천문 등 여러 분야의 발전을 크게 이끈 훌륭한 임금입니다. 백성을 사랑하는 정치를 펼쳤으며, 집현전을 통해 학자들을 기용해 나라의 문화와 학문을 크게 발전시켰습니다.'
```

```python
print(final_answer.name)
print(final_answer.yob)
print(final_answer.yod)
print(final_answer.profile)
```

```text
세종대왕
1397
1450
조선의 4대 왕으로, 한글 창제를 이끌고 학문과 과학, 농업, 음악, 천문 등 여러 분야의 발전을 크게 이끈 훌륭한 임금입니다. 백성을 사랑하는 정치를 펼쳤으며, 집현전을 통해 학자들을 기용해 나라의 문화와 학문을 크게 발전시켰습니다.
```

dict는 `answer['name']`, Pydantic 객체는 `final_answer.name`으로 꺼낸다. 객체 방식은 에디터 자동 완성이 되고, 타입이 맞지 않으면(예: `yob`에 "모름" 문자열) 파싱 단계에서 **검증 에러**가 난다. 잘못된 값이 DB까지 흘러가기 전에 막힌다.

```python
################################################################################
# [Pydantic을 활용한 LLM 구조화 출력(Structured Output)의 핵심]
################################################################################
#
# 1. 도입 이유
#    - LLM은 텍스트 생성기이므로 출력 형식이 불안정할 수 있음.
#    - Pydantic을 통해 데이터 구조를 강제함으로써 '신뢰 가능한 엔진'으로 전환.
#
# 2. 주요 장점
#    - 타입 안정성 (Type Safety): 정의된 타입(int, str, List 등)을 엄격히 준수.
#    - 스키마 강제 (Schema Enforcement): LLM이 해당 구조로만 응답하도록 유도.
#    - 자동 검증 (Validation): 데이터 누락이나 오류 발생 시 즉시 감지.
#    - 코드 직관성: dict 형태가 아닌 객체(result.field)로 접근하여 가독성 및 유지보수 향상.
#
# 3. 활용 가치
#    - 향후 진행할 금융 IT 프로젝트나 노동법 챗봇 등의 비정형 데이터 추출 작업에서,
#      추출 즉시 DB에 적재 가능한 정형 데이터로 변환하는 '데이터 파이프라인'의 필수 요소.
#
################################################################################
```

```python
################################################################################
# [ .get_format_instructions()의 역할 ]
################################################################################
# 
# 1. 역할
#    - 개발자가 만든 Pydantic 클래스(스키마)를 LLM이 이해할 수 있는 
#      '시스템 프롬프트(지침)'로 자동 변환해주는 도구입니다.
#
# 2. 내부 동작
#    - 함수를 호출하면 Pydantic 모델의 구조(필드명, 타입, 설명 등)를 읽어서,
#      LLM에게 "이러한 JSON 형식으로 답변해라"라는 상세한 문장을 생성합니다.
#
# 3. 사용 이유
#    - LLM은 단순히 "JSON으로 답해"라고 하면 오류를 내거나 구조를 틀릴 때가 많습니다.
#    - 이 함수가 출력한 '정밀한 가이드라인'을 프롬프트에 포함시키면,
#      LLM이 구조를 정확히 지켜서 답변할 확률이 비약적으로 상승합니다.
#
################################################################################
```

## with_structured_output: 모델에 출력 형식 붙이기

- Chat 모델의 `with_structured_output(Pydantic 클래스)`로 **모델 자체에** 출력 형식을 설정한다
- OutputParser는 체인에 붙였다 뗐다 할 수 있다. 출력 형식이 항상 같아야 하면 아예 모델에 붙인다

```python
################################################################################
# [ with_structured_output(PydanticModel)의 역할 ]
################################################################################
#
# 1. 개념
#    - LLM의 도구 호출(Tool Calling) 기능을 사용하여, 결과값을 강제로 
#      사용자가 지정한 Pydantic 클래스 형식으로 반환하게 만드는 메서드입니다.
#
# 2. .get_format_instructions()와의 차이점
#    - 기존 방식: 프롬프트에 긴 설명서를 추가하고 LLM이 텍스트로 답하면 파싱함.
#    - with_structured_output: 모델 자체의 API 규격(Tool Calling)을 활용하므로 
#      훨씬 더 정확하고 빠르며, 파싱 오류가 거의 없습니다.
#
# 3. 장점
#    - 간결함: 별도의 파서(Parser) 객체를 만들고 프롬프트를 조합할 필요가 없음.
#    - 강력함: 모델이 지원하는 경우, 거의 100% 확률로 정확한 JSON 구조를 보장.
#    - 편리함: 결과값이 자동으로 Pydantic 객체로 변환되어 즉시 사용 가능.
#
################################################################################


# 모델안에 파이단틱으로 파싱된 걸 합쳐놓음
```

> **보충** `ChatOpenAI`의 `with_structured_output`은 최근 버전에서 Tool Calling이 아니라 OpenAI의 **Structured Outputs**(`method="json_schema"`)를 기본으로 쓴다. API 수준에서 스키마를 강제해 응답이 스키마를 벗어날 수 없다. `method="function_calling"`으로 바꾸면 메모의 Tool Calling 방식이 된다. 어느 쪽이든 프롬프트에 긴 지침을 넣지 않아도 된다는 점은 같다.

```python
model_with_output = model.with_structured_output(PersonInforSchema)
res = model_with_output.invoke("세종대왕에 대해서 설명해주세요.")
res
```

```text
PersonInforSchema(name='세종대왕', yob=1397, yod=1450, profile='조선의 제4대 왕으로, 훈민정음을 창제하여 한글의 기반을 마련했으며 과학·천문·음악·농업 등 여러 분야의 발전을 이끈 대표적인 성군이다.')
```

```python
res.name
res.yob
```

```text
1397
```

프롬프트 템플릿도, 파서도 없이 질문 문자열만 넣었는데 바로 Pydantic 객체가 나왔다(셀의 마지막 줄 `res.yob`만 출력되었다).

이 모델에 스키마와 상관없는 질문을 하면:

```python
res = model_with_output.invoke("AI agent의 특징과 장단점에 대해 정리해서 설명해줘")
res
# 위인에 대한 설명이 아니면 양식이 맞지 않게 들어감.

# model_with_output 사용할 때, 일정한 질문, 일정한 답변을 얻고 싶을 때

# 아웃풋 파서를 사용할 때, llm을 가지고, 여러가지 질문을 했을때, 
# 그중에서 예를 들어 위인에 대한 것만 아웃풋을 일정하게 하고 싶을 때, 
```

```text
PersonInforSchema(name='AI agent', yob=-1, yod=-1, profile='AI agent는 사용자의 목표를 이해하고, 필요한 작업을 계획·실행하며, 상황에 맞게 스스로 판단해 행동하는 인공지능 시스템을 말합니다. 특징으로는 자율성, 목표지향성, 환경 인식, 계획 수립, 도구 활용, 그리고 반복적 학습·개선이 있습니다. 장점은 … 단점은 … 있다는 점입니다.')
```

AI agent가 "인물"로 들어갔다. `name='AI agent'`, 출생·사망 연도는 스키마 설명대로 -1, 장단점은 전부 `profile`에 몰렸다. 형식이 강제되니 **어떤 질문이든 이 틀에 억지로 맞춘다**. 그래서 `with_structured_output`은 질문 유형이 정해진 곳에 쓰고, 여러 종류의 질문을 받는 챗봇에서는 필요한 경우에만 파서를 체인에 붙인다.

```python
#Pydantic을 이용해서 객체를 만들어서 파서 형식을 지정해줘야 올바른 출력값을 얻을 수 있다.

# 예시) class 'profile'
# => pydantic으로 프로필 클래스(중요)를 정의해주면
# => 그 안에 있는 것들이 dict 형태로 존재함
# => 요약: 출력물을 pydantic을 통해 class로 관리하자?
```

```python
from pydantic import BaseModel, Field
from typing import List

# 1. Pydantic 클래스 정의 (요구사항을 명확히 명시)
class Profile(BaseModel):
    name: str = Field(description="이름")
    age: int = Field(description="나이")
    skills: List[str] = Field(description="보유 기술 리스트")

# 2. LLM이 이 구조에 맞춰 답변하도록 유도 (Structured Output 기능 활용)
# 예: OpenAI의 response_format 또는 LangChain의 with_structured_output 사용
```

`skills: List[str]`처럼 필드 타입으로 리스트도 쓸 수 있다. 이력서나 공고문에서 기술 스택을 뽑아 리스트로 받는 식이다. 스키마 안에 다른 Pydantic 클래스를 넣으면 중첩 구조도 된다.

## Streaming 응답

- `invoke(input)`: 모델이 응답을 **다 만든 뒤** 한 번에 돌려준다. 배치 처리나 후처리가 중요한 경우에 맞다
- `stream(input)`: 토큰(또는 청크)을 **만드는 즉시** 순서대로 돌려주는 generator를 준다. 대화형 화면, 웹 스트리밍에 맞다

```python
# streaming => generator (for-in문 )
```

```python
model = ChatOpenAI(model="gpt-5.4-nano")
gen = model.stream("서울에 유명한 여행지 세곳을 소개해주세요, 간단한 소개도 해주세요.")

# 이때 모델에 llm에 입력물을 보내는게 아니라 generator를 생성한 것임
```

```python
# 이때부터 generator 형식으로 LLM에 입력물을 토큰 형식으로 입력함
for token in gen:
    print(token.content, end="") # end 빈문자열로 반환
```

```text
서울에서 유명한 여행지 세 곳과 간단한 소개를 드릴게요.

1. **경복궁**
   - 조선 시대의 대표 궁궐로, 서울을 대표하는 역사 관광지입니다.  
   - 근정전, 향원정 같은 아름다운 건축물을 볼 수 있고, 한복을 입고 방문하면 더욱 특별한 분위기를 즐길 수 있습니다.

2. **N서울타워**
   - 남산 정상에 위치한 서울의 랜드마크입니다.  
   - 서울 시내를 한눈에 내려다볼 수 있어 야경 명소로 특히 유명합니다. 연인들의 데이트 코스로도 많이 찾습니다.

3. **명동**
   - 쇼핑과 먹거리가 풍부한 서울의 대표 번화가입니다.  
   - 화장품, 패션, 길거리 음식 등을 즐길 수 있고, 외국인 관광객들에게도 인기가 많습니다.

원하시면 **가족 여행용**, **커플 여행용**, 또는 **하루 코스**로도 추천해드릴게요.
```

메모 두 개가 generator의 핵심이다. `model.stream(...)`을 호출한 순간에는 아무 요청도 가지 않고 generator만 만들어진다. `for`로 처음 값을 꺼낼 때 요청이 시작되고, 토큰이 도착하는 대로 하나씩 출력된다. 한 번 다 꺼낸 generator는 다시 쓸 수 없다.

## 어떤 방식을 쓸까

| 상황 | 추천 | 이번 실습에서 본 것 |
|---|---|---|
| 답을 그대로 화면에 보여 준다 | `StrOutputParser` | `.content`와 같지만 체인 안에 넣을 수 있다 |
| 키워드·태그 목록이 필요하다 | `CommaSeparatedListOutputParser` + 그 지침 | "리스트 형식"이라고만 하면 번호가 붙어 들어왔다 |
| 항목별로 나눠 DB에 넣는다 | `JsonOutputParser(pydantic_object=…)` | 스키마 없이는 마크다운이나 `{"answer": …}` 한 덩어리로 왔다 |
| 타입 검증과 객체 접근이 필요하다 | `PydanticOutputParser` | `final_answer.yob`처럼 꺼내고, 타입이 틀리면 에러로 막힌다 |
| 질문 유형이 하나로 정해져 있다 | `with_structured_output` | 지침 없이도 정확했지만, 무관한 질문도 틀에 억지로 맞췄다 |
| 사용자가 답을 기다리는 채팅 화면 | `stream` | 생성되는 대로 출력된다 |

## 정리

- **Output Parser**는 LLM의 텍스트 응답을 문자열, 리스트, dict, Pydantic 객체로 바꾼다. `invoke`로 실행하고 내부에서 `parse`를 부른다
- 파서는 받기만 하는 게 아니라 `get_format_instructions()`로 **형식 지침**도 만든다. 지침을 프롬프트에 넣어야(`.partial()`) 모델이 그 형식으로 답한다. 파서와 지침은 짝이다
- JSON을 의미 있게 쓰려면 **Pydantic 스키마**로 키·타입·설명을 설계한다. 필드 설명이 곧 LLM에 대한 지시문이다
- 형식 지침은 입력 토큰을 늘린다(한 줄 질문이 339토큰). 형식 강제에는 비용이 든다
- `with_structured_output`은 모델 API 수준에서 형식을 강제해 가장 정확하지만, 모든 질문을 그 틀에 맞춘다
- 파서는 **형식**을 보장할 뿐 **내용**을 보장하지 않는다. 속담 셋 중 둘은 지어낸 것이었다
