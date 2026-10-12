---
title: "프롬프트 엔지니어링: Prompt Template과 멀티모달 입력"
description: "프롬프트 엔지니어링의 원칙(명확성, 역할, 출력 형식, 맥락, 예시, 구조화, 제약 조건, 점진적 개선)과 컨텍스트·하네스 엔지니어링을 정리하고, LangChain의 PromptTemplate, ChatPromptTemplate, MessagesPlaceholder로 프롬프트를 만든 뒤 이미지·PDF를 Base64로 넣는 멀티모달 프롬프트까지 실습합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'LangChain 기초'
seriesOrder: 3
originalNotebook: "03_Prompt.ipynb"
tags: ["LLM","LangChain"]
date: 2026-06-23T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-prompt.webp'
---

> SKN31 AI Agent 과정 노트북 `03_Prompt.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과이고, 마지막 PDF 요약 하나만 강의 자료의 실행 결과를 가져왔습니다. LLM 응답은 실행할 때마다 달라집니다.

## 이 글에서 다루는 것

- 프롬프트 엔지니어링이란, 그리고 컨텍스트·하네스 엔지니어링
- 좋은 프롬프트의 8가지 원칙
- `PromptTemplate`: 문자열 템플릿, `format`과 `invoke`
- `prompt | model`: 첫 번째 Chain
- `ChatPromptTemplate`: system / user / ai 역할 메시지
- `MessagesPlaceholder`: 대화 이력 넣기
- 멀티모달 프롬프트: Base64 인코딩, 이미지, URL, PDF

## 프롬프트 엔지니어링

- **프롬프트**는 생성형 AI 모델에 작업을 요청하거나 지시하기 위해 입력하는 정보다. 보통 자연어지만 이미지, 음성, 동영상도 될 수 있다
- **프롬프트 엔지니어링**은 원하는 결과를 안정적으로 얻도록 **지시문, 입력 정보, 출력 형식, 예시, 제약 조건을 설계하는 작업**이다
  - OpenAI의 정의: "모델이 요구사항을 만족하는 콘텐츠를 **일관되게 생성하도록** 효과적인 지시를 작성하는 과정"
  - LLM 출력은 비결정적이지만 역할, 예시, 평가를 써서 구체화하면 더 일관된 결과를 얻는다

```python
# 프롬프트엔지니어링 
# 입력 값 마다 다르게 나옴 (일관적으로, 안정적으로 출력값이 나오게 입력값을 작성하는 과정)

# 요새는 프롬프트 가이드가 나옴

# 원래는 자연어만 입력값으로 받음 => 지금은 멀티모달로 여러 형태로 입력이 됌

# llm은 입력은 여러 형태로 받지만 출력은 text로만

# 답변이 안정적으로 나오는지 확인해야 함 (문맥이 일정해야함, 글의 구조)

# open ai => 모델이 요구하는 콘텐츠를 일관되게 생성하는 것
```

같은 요청도 이렇게 쓰면 들쭉날쭉하고,

```text
프롬프트 엔지니어링 설명해줘.
```

이렇게 쓰면 안정적이다.

```text
너는 AI를 초보자에게 가르치는 강사이다.
프롬프트 엔지니어링을 초보자에게 설명하라.

조건:
- 먼저 한 문장으로 정의한다.
- 그다음 원칙 5개를 표로 정리한다.
- 마지막에 좋은 프롬프트와 나쁜 프롬프트 예시를 비교한다.
- 한국어로 작성한다.
```

프롬프트 엔지니어링은 AI에게 막연히 질문하는 기술이 아니라, **원하는 작업을 수행하도록 명세서를 쓰는 기술**이다.

```python
# ex)
# 너는 어린이 문제를 생성하는 조교이다.
# 유저의 {나이}와 {수준}의 맞게 문제를 생성해라  ===> 페르소나(role)를 지정

# 조건: 
# = 문제

# 질문보다는 작업을 어떻게 할지 정하는 명세서
```

이 예시에 이번 글의 내용이 거의 다 들어 있다. "조교"는 역할(Persona)이고, `{나이}`와 `{수준}`은 실행할 때마다 바뀌는 **변수**다. 고정된 지시문에 변수만 갈아 끼우는 구조가 뒤에 나오는 Prompt Template이다.

### 프롬프트 → 컨텍스트 → 하네스 엔지니어링

| 구분 | 핵심 질문 | 주요 대상 |
|---|---|---|
| **프롬프트 엔지니어링** | 모델에게 **어떻게 지시**할 것인가? | 지시문, 역할, 형식, 예시 |
| **컨텍스트 엔지니어링** | 모델에게 **어떤 정보를 제공**할 것인가? | RAG, 검색 결과, 도구 결과, 메모리, 대화 이력 |
| **하네스 엔지니어링** | 모델을 어떤 시스템 안에서 **실행·검증·통제**할 것인가? | 가드레일, 에이전트 피드백 루프, 코딩 표준, 아키텍처 규칙, 도구, 권한, 테스트, 로깅 |

```python
# 프롬프트 엔지니어링 + 컨텍스트 엔지니어링 + 하네스 엔지니어링 => 프롬프트 잘만들자.
```

```python
# 바이브코딩에서 하네스 엔지니어링이 중요해짐 (설계)
```

```python
# 프롬프트 => 프롬프트를 잘쓰자 (명확하고 구체적으로는 대원칙)

# 컨텍스트 엔지니어링 => 프롬프트를 설계하는 단계
 
# 하네스트 엔지니어링 => 일할 수 있는 환경(어디 뭘 업데이트하고 참고해라 등등)
```

하네스(harness)는 말에 채우는 마구다. 힘센 말(LLM)이 엉뚱한 데로 달리지 않게 방향을 잡아 주는 장치라는 뜻이다. 바이브코딩으로 비유하면, 프롬프트는 "로그인 기능 만들어 줘"라는 요청이고, 컨텍스트는 함께 넘기는 기존 코드와 문서이고, 하네스는 "이 폴더 구조를 따르고, 테스트가 통과해야 끝난 것으로 본다" 같은 작업 환경과 규칙이다. 결국 셋 다 **모델이 받는 입력을 잘 만드는 일**이라는 점에서 메모의 결론("프롬프트 잘 만들자")으로 모인다.

## 좋은 프롬프트의 8가지 원칙

| # | 원칙 | 핵심 |
|---|---|---|
| 1 | **목표를 명확하고 구체적으로** | 무엇을, 누구를 위해, 어떤 수준으로, 어떤 형식으로. 수행할 작업, 결과 형식, 대상 독자, 분량, 제약 조건을 적는다 |
| 2 | **역할(Persona) 지정** | 연기가 아니라 답변 기준, 용어 선택, 예시 수준, 판단 기준을 좁히는 장치다 |
| 3 | **출력 형식 지정** | 자동화 시스템에서는 특히 중요하다. JSON이면 예시 구조까지 준다 |
| 4 | **배경 정보(Context) 제공** | 모델은 사용자의 상황을 모른다. 사내 문서, 검색 결과, DB 조회 결과를 넣으면 할루시네이션도 줄어든다 |
| 5 | **예시 제공** | 입출력 예시가 0개면 Zero-shot, 1개면 One-shot, 여러 개면 Few-shot |
| 6 | **구조화** | 역할, 지시, 맥락, 출력 형식을 **태그**(`<context>`)나 **마크다운**(`##`)으로 구획을 나눈다 |
| 7 | **제약 조건 명시** | 하지 말아야 할 것도 쓴다. 정확성이 중요한 영역은 출처, 기준 시점, 불확실성 처리 방법을 넣는다 |
| 8 | **점진적 개선** | 테스트 질문·기대 답변·평가 기준을 정해 두고, **모델 버전을 고정**한 채 프롬프트만 바꿔 가며 측정한다 |

1번의 나쁜 예와 좋은 예:

```text
머신러닝 설명해줘.
```

```text
머신러닝을 처음 배우는 비전공자를 대상으로 설명해줘.
머신러닝의 정의, 지도학습/비지도학습 차이, 실제 활용 예시를 포함하고, 마지막에 5문장으로 요약해줘.
```

4번, 맥락을 주는 예:

```text
우리는 월 20%의 고객 이탈률을 겪고 있는 구독 기반 온라인 교육 서비스이다.   
주요 고객층은 30대 직장인이고, 이탈 주요 원인은 콘텐츠 부족과 동기 저하이다.   
이탈률을 줄이기 위한 실질적인 전략을 제안해줘.
```

5번, 답변 형식을 예시로 보여 주는 One-shot:

```text
예시:
질문: "과적합이란 무엇인가요?"
답변:
    - 정의: 학습 데이터에는 잘 맞지만 새로운 데이터에는 성능이 낮아지는 현상
    - 비유: 문제집 답을 외웠지만 새로운 문제를 못 푸는 상황
    - 예시: 훈련 정확도 99%, 테스트 정확도 70%
```

```python
# zero shot => 예시x, one shot =>1, few shot=>여러 개
```

6번, 태그로 구획을 나눈 프롬프트:

```xml
<instructions>
다음 뉴스 기사를 읽고 핵심 내용을 요약하라.
</instructions>

<context>
사용자는 바쁜 직장인으로, 전체 기사를 읽을 시간이 없다. 핵심 정보만 빠르게 파악하고 싶어한다.
</context>

<input_data>
[기사 원문]
오늘 오전, 서울 강남구 일대에 시간당 80mm가 넘는 집중호우가 내려 도로 일부가 침수되고, 차량 통제가 이루어졌다. ...
</input_data>

<output_format>
한 문단(3줄 이내)으로 요약하라. 일반인이 쉽게 이해할 수 있는 문장을 사용하라.
</output_format>

<constraints>
- 전문 용어에는 반드시 쉬운 설명을 덧붙일 것
- 분량은 500자 이내 한다.
- 한국어로 작성한다.
</constraints>
```

```python
# 항목을 구조화해서 프롬프트를 나눠서 쓴다. <> tag를 사용 아니면 ## markdown 사용

# f-string으로 동적으로 사용
```

7번, 제약 조건:

```text
주의:
- 모르는 내용은 추측하지 말고 모른다고 말한다.
- 현재 날짜 2XXX 년 10월 20일을 기준으로 최신정보를 제공한다.
- 코드는 Python 3.12 기준으로 작성한다.
```

```python
# 부정적인 말보다 긍정적인 말을 했을 때, 더 정확도가 좋음
# 프롬프트를 고정
# llm입장에서도 생각
# 점진적으로 개선
```

"부정보다 긍정"은 "장황하게 쓰지 마"보다 "세 문장으로 써"처럼 **해야 할 일**로 지시하라는 뜻이다. 금지만 있으면 모델은 무엇을 해야 하는지 추측해야 한다. 8번의 "모델 버전 고정"은 결과가 바뀌었을 때 프롬프트 탓인지 모델 탓인지 가리기 위해서다.

```python
# 출력형식을 명확하게 해야 함
# json
# output parser를 명확하게 해야함
```

## Prompt Template

프롬프트 템플릿은 LLM에 넣을 **프롬프트를 만드는 재사용 가능한 틀**이다. 변수를 넣어 템플릿으로 만들면 입력값이 달라도 같은 구조의 프롬프트가 나온다. 문자열이니 f-string으로도 만들 수 있지만, LangChain의 템플릿 클래스는 변수 관리와 체인 연결을 도와준다.

| 목적 | 내용 |
|---|---|
| 재사용성 | 입력값이 달라져도 같은 구조를 다시 쓴다 |
| 유지보수 | 구조와 변수 값을 분리해서 관리한다 |
| 자동화 | 사용자 입력, DB 조회, 웹 검색 결과를 템플릿에 주입한다 |
| 일관성 | 같은 형식의 프롬프트가 계속 나와 응답 품질이 안정된다 |

```python
# 지침은 일관성있게 고정
# 변하는 부분은 f-string으로 조절
# 모델 품질을 일정하게 유지
```

| 클래스 | 만드는 것 | 쓰임 |
|---|---|---|
| **PromptTemplate** | 문자열 하나 | 텍스트 완성 방식, 단순 지시형 프롬프트 |
| **ChatPromptTemplate** | 역할(system, human, ai)이 있는 메시지 리스트 | 채팅 모델. GPT, Claude, Gemini, Qwen 등 요즘 LLM은 대부분 채팅 기반이라 이쪽을 주로 쓴다 |

```python
# 챗봇=> role 기반
```

사용법:

- 변수는 `{변수명}`으로 표시한다. 예: `"{country}의 수도는 어디인가요?"`
- 중괄호 자체를 넣으려면 `{{`, `}}`로 이스케이프한다. 예: `{{"이름": "{name}"}}`

```python
# {country}: 프롬트프의 변수 그냥 중가로를 넣고 싶을 때는 {{}} 2겹으로 만들어야 함
```

| 메소드 | 하는 일 |
|---|---|
| `from_template(문자열)` | 문자열로 템플릿 생성 (PromptTemplate, ChatPromptTemplate 모두) |
| `from_messages(메시지 리스트)` | 역할 메시지로 템플릿 생성 (ChatPromptTemplate) |
| `format(변수=값)` | 변수를 채운 문자열을 만든다 |
| `format_messages(변수=값)` | 변수를 채운 메시지 리스트를 만든다 (ChatPromptTemplate) |
| `invoke(dict)` | dict로 값을 받아 `PromptValue` 객체를 만든다. **Runnable 공통 메소드**라서 체인의 다음 단계로 바로 넘어간다 |

```python
# from_template => 문자열기반 + chat

# from_messages => chat(롤기반)


# => 프롬프트를 만들어서 저장해둔다. 
```

```python
# format => 변수에 어떤 값을 넣을 지 가변인자로 넣어줌
# 잘 안씀

# 대부분 invoke를 씀
```

`invoke`는 프롬프트 템플릿만의 메소드가 아니다. 2편의 모델(`model.invoke`)도, 4편의 출력 파서도, 5편의 체인도 모두 `invoke`로 실행한다. 이 공통 인터페이스를 **Runnable**이라고 하고, 그래서 서로를 `|`로 이어 붙일 수 있다.

### PromptTemplate

```python
from dotenv import load_dotenv
load_dotenv()
```

```text
True
```

```python
# import os
# os.getenv("OPEN_API_KEY")
# => 확인하고 항상 주석처리 혹은 지워야 함
```

키가 잘 들어왔는지 확인하려고 `os.getenv`로 출력해 보는 경우가 많은데, 그 출력이 노트북에 남은 채 GitHub에 올라가면 키가 노출된다. 확인 후 바로 지우는 습관이 필요하다.

```python
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
```

```python
# input_variables ({변수명}-{country}) => 나중에 채울값
template = "{country}의 수도는 어디인가요?"
prompt = PromptTemplate.from_template(
    template=template
)
prompt
```

```text
PromptTemplate(input_variables=['country'], input_types={}, partial_variables={}, template='{country}의 수도는 어디인가요?')
```

`{country}`를 찾아서 `input_variables`로 등록했다.

```python
print(prompt.template)
print(prompt.input_variables)
```

```text
{country}의 수도는 어디인가요?
['country']
```

```python
# promt 생성 -> input_variables에 값을 할당
p_str = prompt.format(country="한국") 
print(p_str)
p_str2 = prompt.format(country="미국")
print(p_str2)
```

```text
한국의 수도는 어디인가요?
미국의 수도는 어디인가요?
```

```python
p_str3 = prompt.invoke({"country":"독일"}) # 가변인자로 dic으로 줌
print(p_str3)
```

```text
text='독일의 수도는 어디인가요?'
```

`format`은 문자열을, `invoke`는 `text='…'`를 담은 **PromptValue 객체**를 돌려준다.

#### 템플릿 → 모델

```python
# Prompt -> Model

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

# 프롬프트 템플릿을 생성
prompt = PromptTemplate.from_template(template="{country}의 수도를 알려주세요.")

# 모델 생성
model = ChatOpenAI(model = "gpt-5.4-nano")

# 프폼프트 템플릿의 iput_variavles에 값을 넣어서 프롬프트 생성
query = prompt.invoke({"country":"한국"}) # prompt.format(country=한국)

# 모델에 프롬프트를 입력해서 질의 요청
response = model.invoke(query)


# 템플릿: 실제 프롬프트를 일관성, 범용성 있게 생성하기 위한 템플릿 안에 가변인자를 구성해 설계한다.
```

```python
response #  응답: AIMessage 타입 , 토큰 얼마나 썼는지 모델이름
```

```text
AIMessage(content='한국의 수도는 **서울**입니다.', additional_kwargs={'refusal': None}, response_metadata={'token_usage': {'completion_tokens': 12, 'prompt_tokens': 13, 'total_tokens': 25, … }, 'model_provider': 'openai', 'model_name': 'gpt-5.4-nano-2026-03-17', … 'finish_reason': 'stop', … })
```

```python
print(response.content)
```

```text
한국의 수도는 **서울**입니다.
```

```python
query2 = prompt.invoke({"country":"영국"})

response2 = model.invoke(query2)

print(response2.content)
```

```text
영국의 수도는 **런던(London)** 입니다.
```

템플릿 하나로 반복 질의를 해 본다.

```python
while True:
    country = input("수도를 알고 싶은 나라이름을 입력하세요:")
    if country =="!q":
        break
    query = prompt.invoke({"country":country})
    response = model.invoke(query)
    print(f"질문: {query}")
    print(f"답변: {response.content}")
```

```text
질문: text='호주의 수도를 알려주세요.'
답변: 호주의 수도는 **캔버라(Canberra)** 입니다.
질문: text='의 수도를 알려주세요.'
답변: 어떤 나라의 **수도**를 말씀하시는 걸까요? 나라 이름을 알려주시면 바로 답해드릴게요.
질문: text='의 수도를 알려주세요.'
답변: “의 수도”가 **어떤 나라**를 말하는 건가요?  
예: 한국, 일본, 미국, 프랑스 같은 나라명을 알려주시면 그 나라의 수도를 바로 말씀드릴게요.
```

입력 없이 Enter를 치자 `'의 수도를 알려주세요.'`라는 빈 프롬프트가 그대로 모델에 갔다. 템플릿은 빈 값도 그대로 채워 넣으므로, **입력 검증은 템플릿 앞에서** 해야 한다. 그대로 두면 의미 없는 요청에도 토큰 비용이 나간다.

#### 첫 번째 Chain: `prompt | model`

`prompt.invoke` → `model.invoke`를 매번 두 줄로 쓰는 대신 `|`로 잇는다.

```python
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

# 프롬프트 템플릿을 생성
prompt = PromptTemplate.from_template(template="{country}의 수도를 알려주세요.")

# 모델 생성
model = ChatOpenAI(model = "gpt-5.4-nano")
```

```python
###
# prompt template --[query]--->model

chain = prompt | model # 위에 했던 작업을 chain으로 알아서 호출해줌

res = chain.invoke({"country":"프랑스"}) #prompt에 전달할 값을 입력
res.content
```

```text
'프랑스의 수도는 **파리(Paris)** 입니다.'
```

`chain.invoke({"country": "프랑스"})`가 프롬프트를 만들고, 그 결과를 모델에 넘기고, AIMessage를 돌려준다. 앞의 단계 출력이 다음 단계 입력이 되는 이 연결이 5편에서 다룰 **LCEL**이다.

변수가 여러 개인 템플릿:

```python
# input variable이 여러개인 프롬프트 템플릿
prompt2 = PromptTemplate.from_template(
    template="{place1}, {place2} 간의 거리는 얼마나 되는지 KM로 알려주세요."
)
print(prompt2.input_variables)
```

```text
['place1', 'place2']
```

```python
# format 사용
print(prompt2.format(place1="서울", place2="런던"))

# invoke 사용 (딕셔너리 문법 수정: = -> :)
print(prompt2.invoke({"place1": "부산", "place2": "서울"}))
```

```text
서울, 런던 간의 거리는 얼마나 되는지 KM로 알려주세요.
text='부산, 서울 간의 거리는 얼마나 되는지 KM로 알려주세요.'
```

두 메소드는 값을 넘기는 문법이 다르다. `format`은 키워드 인자(`place1="부산"`), `invoke`는 dict(`{"place1": "부산"}`)다. 주석의 "= → :"가 이 차이다. dict 안에 `=`를 쓰면 SyntaxError가 난다.

```python
# 1. 올바른 딕셔너리 문법으로 invoke 호출
query3 = prompt2.invoke({"place1": "부산", "place2": "서울"})

# 2. 올바른 변수명으로 모델 호출
res = model.invoke(query3)

# 3. 결과 확인
print(res.content)
```

```text
부산–서울 **직선거리**는 대략 **325km** 정도입니다.  
반면 **기차/도로 이동 기준(도로 거리)**은 보통 **약 430~450km** 범위로 잡힙니다. (교통/경로에 따라 달라져요)

원하시면 **어느 이동수단(기차/자가용)** 기준으로 계산해드릴까요?
```

### ChatPromptTemplate

```python
##################################


#### ChatPromptTemplate ###############
# Chatting 형식의 Message를 지원
# chatting 형식: Role - content(메세지)로 구성

# 01 Langchain 방식 구성
[
    ("role", "content"), ("role", "content"), ...
]
#
# 02 OpenAI 방식 구성
[
    {"role":"작성자 ROLE", "content": "작성메세지"},...
]
#######################################################################
#
# Langchain은 2가지 방식을 지원함. 아무 방식이나 사용 가능 
#
#### Role #############################################################
#
# user/human : 사용자 메세지
# ai/assistant: LLM 메세지 (사용자가 작성할 일은 없음, 받는 메세지)
# system : 전체 대화에서 공통적으로 적용될 규칙이나 지침을 지정하는 메세지.
#
########################################################################
# tool(ToolMessage) : Tool calling에서 Tool의 처리 결과를 담은 메세지
########################################################################
```

| role | 메시지 객체 | 내용 |
|---|---|---|
| `system` | SystemMessage | 대화 전체에 적용할 규칙·지침·페르소나 |
| `user` / `human` | HumanMessage | 사용자 입력 |
| `ai` / `assistant` | AIMessage | 모델의 응답 (대화 이력으로 다시 넣을 때 쓴다) |
| `tool` | ToolMessage | 도구 실행 결과 (Agent 묶음에서 다룬다) |

```python
from langchain_core.prompts import ChatPromptTemplate

messages = [
    ("system","당신은 {domain} 전문 assistant입니다. 모든 답변은 {word_length}개 단어 이하로 답해주세요. "), # 페르소나/제약조건 = 지침(Role-system message)
    ("user", "{query}") #입력(Role-user/human message)
]

# 보통 chatbot은 일정한 질문을 반복하는 것이 아니기 때문에 user_message는 query로 줌

# domain
# word_length

prompt = ChatPromptTemplate.from_messages( #method: 템플릿 생성
    messages=messages
)

print(prompt.input_variables)
print(prompt.messages)
```

```text
['domain', 'query', 'word_length']
[SystemMessagePromptTemplate(prompt=PromptTemplate(input_variables=['domain', 'word_length'], input_types={}, partial_variables={}, template='당신은 {domain} 전문 assistant입니다. 모든 답변은 {word_length}개 단어 이하로 답해주세요. '), additional_kwargs={}), HumanMessagePromptTemplate(prompt=PromptTemplate(input_variables=['query'], input_types={}, partial_variables={}, template='{query}'), additional_kwargs={})]
```

system 메시지에는 분야와 길이 제한이라는 **지침**을, user 메시지에는 매번 바뀌는 **질문**을 둔다. ChatPromptTemplate은 메시지마다 PromptTemplate을 하나씩 들고 있다.

```python
query1 = prompt.format_messages(domain="AI", word_length=30, query="Agent는 무엇인가요?")
query1
# role: system => SystemMessage객체
# role: user/human => HumanMessage객체
# role: LLM => AIMessage객체
# 공통 content 속성에 messages가 저장됨.
```

```text
[SystemMessage(content='당신은 AI 전문 assistant입니다. 모든 답변은 30개 단어 이하로 답해주세요. ', additional_kwargs={}, response_metadata={}),
 HumanMessage(content='Agent는 무엇인가요?', additional_kwargs={}, response_metadata={})]
```

```python
res = model.invoke(query1)
res.content
```

```text
'에이전트(Agent)는 목표를 위해 환경을 관찰하고, 계획하며, 행동을 선택해 작업을 수행하는 자율 소프트웨어/시스템을 말합니다.'
```

```python
# text - f-string 가능
# chatbot f-string (x)
```

```python
query2 = prompt.invoke({"domain": "와인", "word_length":20, "query":"해산물에 어울리는 와인을 소개해줘"})
query2
```

```text
ChatPromptValue(messages=[SystemMessage(content='당신은 와인 전문 assistant입니다. 모든 답변은 20개 단어 이하로 답해주세요. ', additional_kwargs={}, response_metadata={}), HumanMessage(content='해산물에 어울리는 와인을 소개해줘', additional_kwargs={}, response_metadata={})])
```

```python
res = model.invoke(query2)
res.content
```

```text
'굴·조개엔 샤블리, 새우엔 드라이 리슬링, 생선엔 미네랄 샴페인, 문어엔 화이트 피노그리조.'
```

"20개 단어 이하"를 지켜서 짧게 답했다. 이어서 질문해 본다.

```python
# 연결질문
res = model.invoke("추천한 와인에 대해서 좀 더 자세 히설명해줘.")
print(res.content)
```

```text
물론이죠! 다만 지금 대화에 **어떤 와인을 “추천”했는지 정보가 없어서** 정확히 그 와인을 기준으로 자세히 설명드리기가 어려워요.

아래 중 하나만 알려주시면, 그 와인에 맞춰 **품종/스타일, 맛과 향(바디·산도·탄닌·당도 포함), 음식 페어링, 추천 마시는 온도, 보관법, 어떤 사람에게 잘 맞는지**까지 정리해서 자세히 설명해드릴게요.
… (생략)
```

```python
# 질문이 연결이 안됌 (메모리 기능이 없음)
# MessagesPlacehoder를 사용해야 함
# 몇가지 알고리즘이 있음
# 메세지를 다보낼거냐, 줄일거냐, 요약할거냐 등등
```

방금 추천한 와인을 모델이 모른다. 1편에서 정리한 "LLM 자체는 단발성"이 이것이다. 이전 대화를 기억시키려면 **대화 이력을 매번 프롬프트에 넣어서** 보내야 한다.

### MessagesPlaceholder: 대화 이력 넣기

- `ChatPromptTemplate` 안에서 **여러 개의 메시지가 들어갈 자리**를 지정한다
- 대화 이력(Chat History), Few-shot 예제, 에이전트 중간 처리 결과를 넣을 때 쓴다
- 일반 변수 `{variable}`는 값 하나를, `MessagesPlaceholder`는 메시지 리스트를 넣는다
- `ChatPromptTemplate`에서만 쓸 수 있다

| 파라미터 | 내용 |
|---|---|
| `variable_name` | 참조할 변수명. `invoke` 때 같은 이름으로 메시지 리스트를 넘긴다 |
| `optional` | True면 값을 안 넘겨도 에러가 나지 않는다 (첫 대화처럼 이력이 없을 때) |
| `n_messages` | 최근 N개 메시지만 넣는다. 긴 대화의 토큰을 줄인다 |

```python
# 템플릿요소로 사용함 대화이력을 받거나, 퓨삿예제를 받거나, 에이전트 중간처리결과를 추가하거나 

# 일반 프롬프트템플릿에서는 사용할 수 없음.

# 가장 중요한 요소는 메모리시스템인 대화이력을 받는 경우에 사용함

# messages는 리스트 형식으로 넣어줌 n_messags는 몇개의 메세지까지 참고할지 설정
```

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

messages = [
    ("system", "당신은 수학 전문 Assistant입니다."),
    # MessagesPlaceholder(variable_name="history", optional=True ),
    ("placeholder", "{history}"),
    #role : placeholder 대신=> MessagesPlaceholder 사용시 content(history): 변수명, optional: True
    ("user", "{query}")
]

# 지금까지의 대화내역 (DB에 저장 or 변수)
chat_history = [
    ("human", "5+2의 결과는?"),
    ("ai", "7입니다."),

    ("human", "10*5의 결과는?"),
    ("ai", "50입니다."),
    #  AIMessage(content='7입니다) 이런식으로 넣어두 됌
]

query_str = "위 결과의 3제곱을 하면 얼마인가요?"
prompt = ChatPromptTemplate.from_messages(
    messages=messages
)
```

`("placeholder", "{history}")` 튜플은 `MessagesPlaceholder(variable_name="history", optional=True)`의 축약형이다.

```python
query = prompt.invoke({"history":chat_history, "query":query_str}) #  chat_history 기존 대화가 없으면 빈 리스트[] 넣어둬야함

query.messages
```

```text
[SystemMessage(content='당신은 수학 전문 Assistant입니다.', additional_kwargs={}, response_metadata={}),
 HumanMessage(content='5+2의 결과는?', additional_kwargs={}, response_metadata={}),
 AIMessage(content='7입니다.', additional_kwargs={}, response_metadata={}, tool_calls=[], invalid_tool_calls=[]),
 HumanMessage(content='10*5의 결과는?', additional_kwargs={}, response_metadata={}),
 AIMessage(content='50입니다.', additional_kwargs={}, response_metadata={}, tool_calls=[], invalid_tool_calls=[]),
 HumanMessage(content='위 결과의 3제곱을 하면 얼마인가요?', additional_kwargs={}, response_metadata={})]
```

system → 이력 4개 → 새 질문 순서로 펼쳐졌다.

```python
res = model.invoke(query)
print(res.content)
```

```text
앞의 결과는 **50**이고, 이를 **3제곱**하면 **50³ = 125,000** 입니다.
```

"위 결과"가 바로 앞의 50이라는 것을 이력에서 찾아 계산했다. 챗봇의 "기억"은 이렇게 **이력을 매번 다시 보내는 것**이다. 대화가 길어질수록 입력 토큰이 늘어나므로, 메모처럼 전부 보낼지, 최근 N개만 보낼지, 오래된 것은 요약할지를 정해야 한다.

## 멀티모달 프롬프트

- **모달리티**(Modality)는 정보를 표현하는 형태다. "오늘 비가 온다"는 텍스트, 비 오는 사진, 일기예보 음성, 기상 영상으로 표현할 수 있다
- **멀티모달 AI**는 여러 모달리티를 함께 처리한다. 이미지와 "이 이미지를 설명해 줘"를 같이 넣으면 멀티모달 입력이다. 한 가지만 처리하면 유니모달이다
- **멀티모달 프롬프트**는 텍스트와 함께 이미지, 오디오, PDF 등을 넣는 프롬프트다

```python
# text to (text, img, av, tts 등)
```

LangChain에서는 `HumanMessage`의 `content`를 **블록 리스트**로 만들고, 텍스트 블록과 이미지·파일 블록을 함께 넣는다. 모델이 그 모달리티를 지원해야 한다. 이미지·파일은 두 가지로 넘긴다.

- **URL**: 인터넷에 있는 파일 주소
- **Base64**: 파일 바이트를 텍스트로 인코딩해서 직접 넣는다

### Base64

> Base64는 이진(binary) 데이터를 알파벳 대소문자, 숫자, `+`, `/`로 된 텍스트로 바꾸는 인코딩이다. JSON처럼 텍스트만 안전하게 다루는 곳에 바이너리를 넣을 때 쓴다.

```python
# binary 데이터 -> 파이썬 타입:bytes
# base 64 encoding-> bytes -> str
# base 64 decoding-> str -> bytes 
import base64

# Encoding: bytes -> base64 bytes
e = base64.b64encode(b"hello") 
print(type(e), e)

# Decoding: base64 bytes -> str
c = e.decode("utf-8") #bytes 문자열을 utf-8의 str으로 변환 b'aGVsBG8=' -----> b'aGVsBG8='
print(type(c), c)
```

```text
<class 'bytes'> b'aGVsbG8='
<class 'str'> aGVsbG8=
```

여기서 `decode("utf-8")`은 Base64 **디코딩이 아니다**. Base64로 인코딩된 bytes(`b'aGVsbG8='`)를 같은 글자의 str(`'aGVsbG8='`)로 바꿨을 뿐이다. 원래 데이터로 되돌리는 건 `b64decode`다.

```python
# 1. str -> bytes
e2 = c.encode("utf-8")
print(type(e2),e2)

# 2. Base64 decoding (b64decode 사용)
v = base64.b64decode(e2)

print(type(v), v)
# 결과: <class 'bytes'> b'hello'

# 3. 만약 'hello' 문자열로 완전히 되돌리고 싶다면
print(v.decode("utf-8"))
# 결과: hello
```

```text
<class 'bytes'> b'aGVsbG8='
<class 'bytes'> b'hello'
hello
```

| 단계 | 함수 | 타입 변화 |
|---|---|---|
| Base64 인코딩 | `base64.b64encode(data)` | bytes → (Base64) bytes |
| 텍스트로 | `.decode("utf-8")` | bytes → str |
| 다시 bytes로 | `.encode("utf-8")` | str → bytes |
| Base64 디코딩 | `base64.b64decode(b)` | (Base64) bytes → 원래 bytes |

```python
# 컨텍스트는 짧을수록 좋다. (최근대화 3~5개, 이전꺼는 전부 다 요약)

# I/O를 기준으로 보면, 원래는 다양한 타입의 데이터가 있지만 bytes(원칙은 이것만)랑 str만 있음

# encoding  +-영문,숫자 => 64글자로 변환

# decoding

# base64 
```

파일 입출력 기준으로 보면 이미지, PDF, 음성도 결국 **bytes**다. 그 bytes를 64개 문자로 표현한 str로 바꿔서 JSON 메시지 안에 넣는 것이 Base64 입력이다. 파일을 읽어 Base64 문자열로 돌려주는 함수를 만든다.

```python
import base64

def encode_to_base64(path: str) -> str:
    """
    입력 받은 경로의 파일을 base64로 인코딩 한 뒤 반환하는 함수
    """
    with open(path, "rb") as f:
        data = f.read()
        encoded_bytes = base64.b64encode(data) #bytes ->bytes(base64로 인코딩)
        encode_str = encoded_bytes.decode("utf-8")
        return encode_str
    
r = encode_to_base64("data/images/graph1.jpg")
r[:100]
```

```text
'/9j/4AAQSkZJRgABAQABLAEsAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0d'
```

JPEG 파일은 Base64로 바꾸면 항상 `/9j/`로 시작한다(JPEG 파일의 시작 바이트 `FF D8 FF`가 이렇게 인코딩된다).

### 이미지 (Base64)

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

# 1. 메시지 템플릿 정의
messages = [
    {
        "role": "system",
        "content": "당신은 멀티모달(Multimodal)을 지원하는 AI assistant입니다."
    },
    {
        "role": "user",
        "content": [
            {
                "type": "text", 
                "text": "{query}"
            },
            {
                "type": "image",
                "source_type": "base64",
                "data": "{img_data}",
                "mime_type": "image/jpg"
            }
        ]
    }
]

# 2. ChatPromptTemplate 생성
prompt = ChatPromptTemplate.from_messages(messages)

# 3. 입력 변수 적용 및 최종 프롬프트 구성
input_text = "첨부한 이미지에 대해 설명해줘"

# 변수명 수정: input_image로 변경하여 직관성 확보
input_image = encode_to_base64("data/images/img1.jpg")
```

| 키 | 값 |
|---|---|
| `type` | `"image"` (PDF 등은 `"file"`) |
| `source_type` | `"base64"` 또는 `"url"` |
| `data` | Base64 문자열. 템플릿에서는 `"{img_data}"`처럼 변수로 둔다 |
| `mime_type` | 실제 파일 형식 (`image/jpeg`, `image/png`, `application/pdf`) |

```python
from langchain_openai import ChatOpenAI

# 1. 모델 설정
model = ChatOpenAI(model='gpt-5.4-nano')

# 2. 데이터 준비
input_text = "첨부한 이미지에 대해 설명해줘"
encoded_image = encode_to_base64("data/images/img1.jpg")

# 3. 쿼리 구성 (prompt 템플릿에 데이터 매핑)
query = prompt.format_messages(
    query=input_text,
    img_data=encoded_image
)

# 4. 모델 호출 및 결과 저장
res = model.invoke(query)

# 결과 확인
print(res.content)
```

```text
이미지에는 야외 한옥/궁궐 건축물의 전경이 담겨 있어요.

- **건물**: 화면 중앙에 **대형 누각형(궁전) 건물**이 정면으로 보이고, 지붕은 **회색 기와**에 **녹색/붉은색 단청(장식 채색)**이 촘촘히 칠해져 있습니다. 처마 끝과 지붕선이 복잡하게 겹치며 장식되어 있어요.  
- **글자**: 건물 상단의 가운데 부분에 **한자(또는 한글)로 보이는 문구**가 장식돼 있습니다(정확한 판독은 어렵지만 장식 글씨 형태입니다).
- **전면 마당**: 건물 앞에는 **돌로 만든 넓은 마당 바닥**이 있고, 중앙으로 이어지는 **계단과 석축(낮은 담/기단)**이 보입니다.
- **주변 환경**: 마당 좌우로 다른 건물의 지붕이 이어져 있고, 멀리에는 **산/언덕 지형**이 보입니다.
- **하늘**: 상단은 **푸른 하늘과 구름**이 넓게 펼쳐져 있어 전체적으로 맑고 밝은 분위기예요.

원하시면, 이 건물이 **어느 장소/어떤 건축물인지**(예: 궁궐 이름)도 추정해서 더 찾아드릴까요?
```

이미지에 대한 텍스트 설명이 나왔다. 글 처음 메모의 "llm은 입력은 여러 형태로 받지만 출력은 text로만"이 이것이다.

이미지 여러 장은 이미지 블록을 여러 개 넣는다.

```python
# 여러개의 이미지를 전송
chart1 = encode_to_base64(r"C:\Documents\SKN31_JY\SKN31\10_AI_Agent\data\images\graph2.jpg")
chart2 = encode_to_base64(r"C:\Documents\SKN31_JY\SKN31\10_AI_Agent\data\images\graph3.png")


# 1. 메시지 템플릿 정의
messages = [
    { # 1-1 페르소나 정의 (시스템 메세지)
        "role": "system",
        "content": "당신은 멀티모달(Multimodal)을 지원하는 AI assistant입니다."
    }, 
    { # 1-2-1 역할부여+입력문자 (유저 메세지)
        "role": "user",
        "content": [
            {
                "type": "text", 
                "text": "{query}"
            },
            # 1-2-2 이미지 타입 정의 (이미지 타입=>문자열변화 후 전달) 
            {
                "type": "image",
                "source_type": "base64",
                "data": chart1,
                "mime_type": "image/jpg"
            },
            {
                "type": "image",
                "source_type": "base64",
                "data": chart2,
                "mime_type": "image/png"
            }
        ]
    }
]

input_text = "첨부한 메세지를 설명해줘"

res = model.invoke(messages)
print(res.content)
```

```text
올려주신 자료는 서로 다른 주제를 담고 있습니다. 각각 핵심만 요약하면 아래와 같습니다.

## 1) 첫 번째 이미지: “수출과 수입 변환(비율, 실질 달러 등)”
- 시간 흐름(대략 1970~2010년대)을 기준으로 **수출(실질 USD)**, **수입(실질 USD)** 추이가 막대/선 형태로 함께 제시돼 있습니다.
… (생략) …

## 2) 두 번째 이미지: “경제교통지수 추이(1월 기준), 2000~2023” (사실상 도시별 ‘교통’이 아니라 ‘교통지수’라는 제목)
- **2000년 → 2021년 → 2022년 → 2023년**으로 갈수록 막대(전체)가 커지고,
- 구성은 **소비자물가상승률(빨강)** 과 **실업률(주황)** 로 나뉘어 표시됩니다.
… (생략) …

원하시는 게 “두 그래프를 비교해 달라”인지, 아니면 “각 그래프의 결론을 더 자세히”인지 확인하고 싶어요.
```

그래프 두 장을 각각 읽어 설명했다. 그런데 코드에 실수가 하나 있다. 이번에는 템플릿 없이 `messages`를 모델에 **바로** 넣었기 때문에 `"{query}"`가 변수로 채워지지 않고 **문자 그대로** `{query}`가 전달됐다. `input_text`는 만들기만 하고 쓰지 않았다. 질문 없이 그래프만 받은 모델이 "무엇을 원하는지" 되묻는 것으로 끝난 이유다. 템플릿 없이 보낼 때는 `"text": input_text`처럼 실제 값을 넣어야 한다.

또 하나, 경로가 `C:\Documents\…` 절대 경로라 다른 컴퓨터에서는 실행되지 않는다. 앞 셀처럼 `data/images/graph2.jpg` 상대 경로가 낫다.

### 이미지 (URL)

```python
url = "https://entertainimg.kbsmedia.co.kr/cms/uploads/CONTENTS_20230425095757_b457a570577d7444e7cef5c0a6e73bd7.png"

messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text", 
                "text": "첨부한 사진이 누구인지 맞춰줘. 3글자로" 
            },
            {
                "type": "image", #멀티모달리티 타입
                "source_type": "url", # 인터넷 상에 있는 이미지가 분석대상
                "url": url # 분석할 이미지의 주고
            }
        ]
    }
]
```

```python
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()
model = ChatOpenAI(model="gpt-5.4-nano")

# 모델 호출
res = model.invoke(messages)

# 결과 확인
print(res.content)
```

```text
죄송하지만, 사진 속 인물이 **누군지 특정해서 맞추는 것(실명 추측)** 은 도와드릴 수 없어요.  

대신 원하시면 **이미지에서 보이는 특징(헤어스타일/분위기/스타일링)** 이나 **어떤 스타일의 인물 느낌인지**(예: “청순/단정/중성적” 같은 이미지 성격) 같은 쪽으로는 3글자로도 도와드릴게요.  
원하는 방향이 “스타일 3글자”인지 “분위기 3글자”인지 알려주세요.
```

URL 방식은 `source_type: "url"`과 `url` 키만 바꾸면 된다. 결과는 **거절**이다. 상용 LLM은 사진 속 인물이 누구인지 얼굴로 특정하는 요청을 정책상 받지 않는다. 기술적으로 이미지를 못 읽은 게 아니라 안전 정책이 막은 것이고, 앞에서 본 하네스 엔지니어링의 가드레일이 모델 제공사 쪽에 걸려 있는 예다.

### PDF

PDF처럼 이미지가 아닌 파일은 `type: "file"`로 보낸다.

```python
import base64

# 1. 함수 정의 (이 부분을 먼저 실행해야 컴퓨터가 기억함)
def encode_to_base64(path: str) -> str:
    """
    입력 받은 경로의 파일을 base64로 인코딩 한 뒤 반환하는 함수
    """
    with open(path, "rb") as f:
        data = f.read()
        encoded_bytes = base64.b64encode(data)
        return encoded_bytes.decode("utf-8")

# 2. 그 다음, 함수 사용 (이제 정의되었으니 오류가 안 남)
pdf_path = r"C:\Documents\SKN31_JY\SKN31\10_AI_Agent\data\pdf\SPRi AI Brief 7월호 산업동향.pdf"
pdf = encode_to_base64(pdf_path)
```

```python
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text", 
                "text": "첨부한 pdf에 대해 요약해줘. 100글자로" 
            },
            {
                "type": "file", #멀티모달리티 타입
                "source_type": "base64", # 전송할 데이터의 형태
                "data": "pdf",
                "mime_type": "application/pdf", # 전송하는 데이터의 실제 형식을 mime type으로 지정
                "filename": "SPRi AI Brief 7월호 산업동향.pdf" # openai의 특징: file타입 전송시 파일명을 같이 보내야 한다.

            }
        ]
    }
]
model = ChatOpenAI(model="gpt-5.4-nano")
res = model.invoke(messages)
print(res.content)
```

```text
OECD AI 역량지표 공개와 일본·미국·EU 정책 동향, 기업의 차세대 모델·인프라 확대, 에이전트 보안·노동영향 분석.
```

100글자 이내의 그럴듯한 요약이 나왔지만, 코드를 보면 `"data": "pdf"`로 변수 `pdf`가 아니라 **문자열 "pdf"**를 넣었다. 실제 PDF 내용은 전달되지 않았을 가능성이 높다. 그렇다면 이 요약은 파일명("SPRi AI Brief 7월호 산업동향")만 보고 모델이 **그럴듯하게 지어낸 것**일 수 있고, 내용이 맞는지는 원문과 대조해야만 알 수 있다. 에러 없이 자연스러운 답이 나와서 오히려 알아채기 어려운 실수다. 올바른 코드는 `"data": pdf`다.

> **보충** 이런 실수를 잡으려면 응답의 `usage`에서 입력 토큰 수를 본다. PDF가 제대로 들어갔다면 입력 토큰이 수천 개 이상이어야 한다. 프롬프트 몇 줄 수준이면 파일이 안 들어간 것이다.

### 멀티모달 ChatPromptTemplate

파일도 템플릿으로 만들 수 있다. 멀티모달 블록은 메시지 구조라서 문자열 기반 `PromptTemplate`으로는 만들 수 없고 `ChatPromptTemplate`을 쓴다.

```python
from langchain_core.prompts import ChatPromptTemplate


# 1. 템플릿 정의
messages = [
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "첨부한 pdf에 대해 요약해줘. 100글자로"},
            {
                "type": "file",
                "source_type": "base64",
                "data": "{input_file}",
                "mime_type": "{mime_type}",
                "filename": "{file_name}"
            }
        ]
    }
]

template = ChatPromptTemplate.from_messages(messages)

# 2. 결과 확인 (템플릿에 설정된 변수 목록 출력)
print(template.input_variables)
```

```text
['file_name', 'input_file', 'mime_type']
```

변수가 셋뿐이다. 텍스트 블록이 `"첨부한 pdf에 대해 요약해줘. 100글자로"`로 고정돼 있어서, 아래에서 `"text": input_text`를 넘겨도 쓰이지 않는다.

```python
# 1. 입력 변수 준비
b64_file = encode_to_base64("data/pdf/2206.01062v1.pdf")
input_text = "첨부한 pdf 문서의 내용을 한국어로 요약해줘"
file_name = "2206.01062v1.pdf"
mime_type = "application/pdf"

# 2. 쿼리 구성 (invoke 사용)
query = template.invoke({
    "input_file": b64_file,
    "mime_type": mime_type,
    "file_name": file_name,
    "text": input_text
})

# 3. 모델 호출
res = model.invoke(query)

# 4. 결과 출력
from IPython.display import Markdown
Markdown(res.content)
```

템플릿에 없는 키(`text`)를 넘기면 에러 없이 무시된다. 질문도 변수로 바꾸려면 텍스트 블록을 `{"type": "text", "text": "{query}"}`로 두고 `"query": input_text`로 넘긴다. 그렇게 고친 강의 자료의 실행 결과:

```text
다음은 첨부 PDF 논문 **「DocLayNet: A Large Human-Annotated Dataset for Document-Layout Analysis」(KDD 2022)**의 내용을 한국어로 요약한 것입니다.

## 1) 논문의 핵심 목적
- PDF 문서 **레이아웃 분석(세그멘테이션/탐지)**은 PDF 변환 품질에 핵심인데, 기존 대규모 학습 데이터셋인 **PubLayNet, DocBank**는 주로 과학 논문 저장소에서 자동 생성되어 **레이아웃 다양성(변형/스타일)**이 부족합니다.
- 그 결과 모델이 더 복잡하고 다양한 문서(매뉴얼, 정부 문서, 법률, 특허 등)에 적용될 때 성능이 떨어집니다.
- 이를 해결하기 위해 논문은 **DocLayNet**이라는 새로운 데이터셋을 제안합니다.

## 2) DocLayNet 데이터셋 구성(가장 중요한 기여)
- **COCO 포맷**으로 공개되는 문서 레이아웃 주석 데이터셋.
- 총 **80863개 PDF 페이지**(페이지 단위)로 구성.
- 각 페이지는 **11개 클래스**에 대한 **라벨된 바운딩박스**를 제공:
  - Caption, Footnote, Formula, List-item, Page-footer, Page-header, Picture, Section-header, Table, Text, Title
… (생략)
```

이번에는 논문 제목, 페이지 수(80,863), 클래스 11개처럼 **파일 안에만 있는 구체적인 정보**가 나온다. 앞의 "pdf" 문자열 실수와 비교하면 파일이 실제로 들어갔는지 차이가 분명하다.

```python
# 새채팅하면 유리함(기억이 적어지기 때문에)
# 모델 지피티는 정액제여서 상관은 없지만 (성능적인 면에서는 새채팅하는게 좋음)
# 클로드는 그렇게 새채팅 파는게 유리
```

MessagesPlaceholder에서 본 것처럼 채팅 서비스도 대화가 길어지면 이력 전체를 매번 다시 넣는다. 대화가 길수록 입력 토큰이 늘고, 앞부분 내용은 오히려 덜 반영되기도 한다. 주제가 바뀌면 새 채팅을 여는 편이 비용(사용량 한도)과 답변 품질 모두에 유리하다.

## 무엇을 쓸까

| 상황 | 추천 |
|---|---|
| 질문 하나를 문자열로 만든다, 텍스트 완성 모델 | `PromptTemplate` |
| 역할(system)과 질문을 나눠야 하는 채팅 모델 | `ChatPromptTemplate` |
| 대화 이력, Few-shot 예시처럼 **메시지 여러 개**가 들어갈 자리 | `MessagesPlaceholder` (또는 `("placeholder", "{history}")`) |
| 이미지·PDF를 넣는다 | `ChatPromptTemplate` + content 블록 리스트 (`type: image/file`) |
| 파일이 로컬에 있다 / 인터넷에 있다 | Base64 (`source_type: "base64"`) / URL (`source_type: "url"`) |
| 템플릿 없이 메시지를 바로 보낸다 | `{변수}` 대신 실제 값을 넣는다 (템플릿이 아니면 치환되지 않는다) |

## 정리

- 프롬프트 엔지니어링은 **명세서 쓰기**다. 명확성, 역할, 출력 형식, 맥락, 예시, 구조화, 제약 조건, 점진적 개선의 8가지 원칙을 따른다
- 모델에 **어떻게 지시할지**(프롬프트), **무엇을 같이 줄지**(컨텍스트), **어떤 환경에서 실행·통제할지**(하네스)로 범위가 넓어지고 있다
- **Prompt Template**은 고정된 지시문에 `{변수}`만 바꿔 끼우는 틀이다. `format`은 문자열을, `invoke`는 PromptValue를 돌려주고, `invoke`는 Runnable 공통 메소드라 `prompt | model`처럼 체인으로 이어진다
- **ChatPromptTemplate**은 system / human / ai 역할 메시지로 프롬프트를 만든다. 요즘 채팅 모델에는 이쪽을 쓴다
- LLM은 이전 대화를 기억하지 못한다. **MessagesPlaceholder**로 대화 이력을 매번 넣어 줘야 한다
- 멀티모달 입력은 content를 블록 리스트로 만들고 이미지·파일을 **Base64** 또는 **URL**로 넣는다
- 변수 자리에 문자열을 넣거나(`"pdf"`), 템플릿 없이 `{query}`를 보내도 **에러가 나지 않는다**. 모델은 그럴듯한 답을 만들어 내므로, 입력 토큰 수나 답의 구체성으로 입력이 제대로 들어갔는지 확인해야 한다
