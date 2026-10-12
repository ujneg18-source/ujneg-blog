---
title: "Model I/O: 여러 LLM 모델 호출하기"
description: "LangChain의 Model I/O(프롬프트 템플릿, 언어 모델, 출력 파서) 구조를 정리하고, OpenAI 라이브러리와 LangChain의 ChatOpenAI, ChatAnthropic, ChatGoogleGenerativeAI, HuggingFacePipeline으로 같은 방식의 invoke 호출을 해 봅니다. temperature, max_tokens, reasoning, stream도 다룹니다."
category: 'Tech'
subcategory: 'LLM'
series: 'LangChain 기초'
seriesOrder: 2
originalNotebook: "02_model.ipynb"
tags: ["LLM","LangChain"]
date: 2026-06-22T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-model-io.webp'
---

> SKN31 AI Agent 과정 노트북 `02_model.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과입니다(일부는 강의 자료의 실행 결과로 보충). LLM 응답은 실행할 때마다 달라지고, 긴 응답은 중간을 생략했습니다. API 결제·키 발급 화면 안내는 줄였습니다.

## 이 글에서 다루는 것

- Model I/O: 프롬프트 템플릿 → 언어 모델 → 출력 파서
- Chatbot 서비스와 LLM API의 차이
- OpenAI 라이브러리로 직접 호출하기 vs LangChain `ChatOpenAI`
- 주요 파라미터: `temperature`, `max_tokens`, `reasoning`
- `invoke`와 `stream`
- Claude(`ChatAnthropic`), Gemini(`ChatGoogleGenerativeAI`), Hugging Face 로컬 모델(`HuggingFacePipeline`)
- 메시지 형식: 문자열, dict, 튜플

## Model I/O

- **Model I/O**는 언어 모델에 입력을 전달하고, 생성된 출력을 처리하는 과정과 그 구성 요소를 말한다
- LangChain에서는 **프롬프트 템플릿**(Prompt Template), **언어 모델**(Language Model), **출력 파서**(Output Parser)로 구성한다

![Model I/O](/images/llm/fig-model-io.jpg)

| 구성 요소 | 하는 일 | 이 시리즈 |
|---|---|---|
| **프롬프트 템플릿** | 고정된 틀과 사용자 입력을 결합해 일관된 형식의 프롬프트를 만든다 | 3편 |
| **언어 모델** | 프롬프트를 받아 텍스트를 생성한다. LangChain은 GPT, Claude, Gemini 등의 연동 API를 제공한다 | 이번 글 |
| **출력 파서** | 모델 출력을 원하는 형식(JSON, Pydantic 객체 등)으로 바꾸고 후처리한다 | 4편 |

```python
# 프롬프트 템플릿 => prompt를 만드는 라이브러리 
# why use? 동일한 프롬프트 값이 필요한 것이 있고, 변형되어야 할부분이 있음.
# 이런 역할을 하는 것이 프롬프트 템플릿임

# LLM -> LLM을 호출해서 정답을 생성해주는 것. 연동되는 api를 제공한다. 

# 출력파서 -> 내가 받는 출력물의 형식을 정의하는 것. (답변의 형식, and 파이썬인지 마크다운인지 js인지 등의 파일형식까지 )
```

```python
# 프롬프트 나머지는 고정 {X}, {Y}는 바뀜 - Parse(의 가이드도 받아야 함)

# 모델라이브러리를 이용해서 LLM을 호출하고 생성함

# 생성한 걸 Parse를 통해 답변출력물을 만들어냄/ Parse
```

"Parse의 가이드도 받아야 함"이 중요하다. JSON으로 받고 싶으면 프롬프트에 "이런 형식으로 답하라"는 지시가 들어가야 하고, 그 지시문을 출력 파서가 만들어 준다. 그래서 세 요소는 따로 놀지 않고 프롬프트 ← 파서 → 출력으로 맞물린다.

## Chatbot 서비스 vs LLM API

| 구분 | Chatbot 서비스 (ChatGPT, Claude 앱) | LLM API |
|---|---|---|
| 대상 | 일반 사용자 | 개발자 |
| 목적 | AI를 바로 사용 | AI를 **서비스에 내장** |
| 인터페이스 | 웹/앱 | 프로그래밍 코드 |
| 비용 | 구독료 (Plus, Pro 등) | 사용량(토큰) 기반 과금 |
| 시스템 프롬프트 | 일부만 가능 (사용자 지침 정도) | 완전 제어 |
| 외부 시스템 연동 | 제한적 | 자유롭게 가능 |

```python
# chatbot => service
# llm api => ai를 내장한 service 제작을 위한 것 

# chatbot은 지침정도만 넣어둠 (구독료) - 시스템프롬프트 일부만 가능(사용자 설정에 넣어주는 지침), 외부시스템연동=(제한적)

# llm api 제어자유로움 (비용은 토큰단위) - 시스템프롬프트(완전 제어), 외부시스템연동=자유롭게 가능
```

## OpenAI 모델 사용 준비

1. [platform.openai.com](https://platform.openai.com)에서 결제 수단을 등록하고 크레딧을 충전한다 (Settings → Billing). 자동 충전은 꺼 두는 편이 안전하다
2. API Key를 만든다 (Settings → API Keys → Create new secret key)
3. 작업 폴더의 `.env` 파일에 `OPENAI_API_KEY=생성된키`를 넣고 `load_dotenv()`로 환경변수에 등록한다
4. **API Key는 절대 노출하면 안 된다.** `.env`가 GitHub에 올라가지 않도록 `.gitignore`에 넣는다

- [모델 목록](https://platform.openai.com/docs/models), [가격](https://platform.openai.com/docs/pricing), [토크나이저](https://platform.openai.com/tokenizer)에서 모델과 토큰 수를 확인한다
- 사용량은 Settings → Usage에서 본다

```python
# https://developers.openai.com/api/docs/models 모델정보

# knowledge cutoff => 저장되어있는 지식의 최종날짜
```

**knowledge cutoff**는 아래 실행 결과를 읽을 때 중요하다. 모델은 학습 데이터가 끝난 날짜 이후의 일을 모른다.

## OpenAI 라이브러리로 직접 호출

```bash
pip install langchain-openai -qU   # openai 라이브러리도 같이 설치된다
```

```python
# langchain-openai를 연결하는 라이브러리를 사용
```

먼저 LangChain 없이 OpenAI 자체 라이브러리로 호출해 본다.

```python
from dotenv import load_dotenv

load_dotenv()
```

```text
True
```

```python
from openai import OpenAI

client = OpenAI() # 환경변수로 등록안한 경우 API Key를 설정.
response = client.chat.completions.create(
    model="gpt-5.4-nano",
    messages=[{"role":"user", "content":"OpenAI의 LLM 모델 종류는 뭐가 있나요?"}] # 프롬프트입력 대화형식
)
print(response)
```

```text
ChatCompletion(id='chatcmpl-DsLrcS0HDYHSnWiOHw7Yj5SRxprgK', choices=[Choice(finish_reason='stop', index=0, logprobs=None, message=ChatCompletionMessage(content='OpenAI의 LLM(대규모 언어 모델) 라인업은 시기별로 업데이트되지만, … (생략)', refusal=None, role='assistant', annotations=[], audio=None, function_call=None, tool_calls=None))], created=1781846128, model='gpt-5.4-nano-2026-03-17', object='chat.completion', … usage=CompletionUsage(completion_tokens=513, prompt_tokens=19, total_tokens=532, … reasoning_tokens=0 …))
```

응답 객체에서 볼 것은 세 가지다.

- `choices[0].message.content`: 답변 텍스트
- `model`: 실제로 응답한 모델 버전 (`gpt-5.4-nano-2026-03-17`)
- `usage`: 입력 19토큰, 출력 513토큰. **요금은 이 숫자로 매겨진다.** 출력 토큰이 입력보다 비싸므로 답변 길이가 비용을 좌우한다

```python
print(response.choices[0].message.content)
```

```text
OpenAI의 LLM(대규모 언어 모델) 라인업은 시기별로 업데이트되지만, 대표적으로 아래 계열들이 있습니다. (정확한 “종류/이름”은 제품·시점에 따라 달라질 수 있어요.)

## 1) ChatGPT용(대화형) 모델
- **GPT-4 / GPT-4.1 계열**: 고성능 추론·코딩·문서 이해에 강점
- **GPT-4o(omni) 계열**: 텍스트뿐 아니라(제품 설정에 따라) 음성/이미지 등 멀티모달에 초점
- **o1 / o3 계열(Reasoning 중심 모델)**: 문제 해결(추론)에 특화된 계열(지연시간/비용 특성이 다를 수 있음)

## 2) 경량(비용 절감/빠른 응답) 모델
- **GPT-3.5 계열**: 비교적 가볍고 빠른 편(요금/성능이 더 낮을 수 있음)
- **Mini/mini급 변형**: 응답이 빠르거나 비용을 줄이는 용도로 제공되는 경우가 있음

## 3) 임베딩(Embedding) 모델 (LLM “종류”로 같이 쓰이는 경우가 많음)
… (생략)
```

GPT-5.4 nano가 답했는데 자기 계열(GPT-5)은 목록에 없고 GPT-4, GPT-3.5까지만 나온다. 이게 **knowledge cutoff**다. 모델은 자기가 학습된 시점까지의 정보만 알고, 그 뒤에 나온 모델(자기 자신 포함)은 모른다. "최신 정보"를 물어야 하는 서비스라면 검색 도구나 RAG로 정보를 넣어 줘야 한다.

```python
# 랭체인을 통해 유료 api나 huggingface에 있는 무료 오픈소스들도 불러올 수 있음 (방법은 조금 다름)
```

## LangChain으로 OpenAI 호출: ChatOpenAI

- **ChatOpenAI**: 채팅 기반 모델. 입력과 출력이 Message 객체다
- 주요 파라미터

| 파라미터 | 내용 |
|---|---|
| **model** | 사용할 OpenAI 모델 이름 |
| **temperature** | 출력의 무작위성. 0~2, 클수록 다양해진다. 정확한 답변 0.0~0.3, 일반 챗봇 0.5~0.8, 창작 1.0 이상 |
| **max_tokens** | 응답 최대 토큰 수. GPT-5 계열은 추론 과정에도 토큰을 쓰므로 너무 작으면 응답이 비어서 올 수 있다 |
| **api_key** | 직접 넘길 때만. 환경변수에 있으면 생략한다 |
| **reasoning** (GPT-5 계열) | 추론 강도(`effort`: low, medium, high 등. 모델마다 지원 값이 다르다) |
| **verbosity** (GPT-5 계열) | 응답 길이 제어 (low, medium, high) |

- 메소드: **`invoke(message)`** 로 프롬프트를 보내고 응답을 받는다

```python
# 랭체인 서버

from langchain_openai import ChatOpenAI

model=ChatOpenAI(
    model="gpt-5.4-nano", # 모델명
    # api = "api_key" => dotenv활용 os에 환경변수로 등록 / api를 입력해주지 않으면 os 환경변수에서 찾음 그때, 회사이름_API_KEY로 저장해둠
    temperature=1.0, # 

)

response = model.invoke("OpenAI의 LLM 모델 종류는 뭐가 있나요?")
print(response.content)
```

```text
OpenAI에서 서비스(또는 API)로 제공하는 LLM(대규모 언어 모델) 계열은 시기/플랫폼에 따라 이름과 라인업이 조금씩 달라집니다. 다만 “모델 종류”를 큰 분류로 보면 보통 아래처럼 나뉩니다.

## 1) GPT(범용 대화/문서/코딩)
- **GPT-4 계열**: 고성능 추론/글쓰기/코딩에 강점
- **GPT-4o 계열**: 더 빠르고, 이미지/음성 등 **멀티모달**로 확장된 모델로 알려져 있습니다.
- **GPT-3.5 계열**: 상대적으로 가볍고 비용이 낮은 편(목적에 따라 선택)
… (생략)

질문: 지금 “모델 종류”를 **API 기준**으로 원하시나요, 아니면 **ChatGPT에서 보이는 모델** 기준으로 원하시나요?
```

OpenAI 라이브러리는 `messages=[{"role": ..., "content": ...}]` 리스트를 만들어야 했지만, LangChain은 문자열만 넘겨도 user 메시지로 바꿔 준다. 응답도 `response.choices[0].message.content` 대신 `response.content`로 바로 꺼낸다. 같은 질문인데 문장이 조금씩 다른 건 `temperature=1.0`이라 매번 다르게 생성되기 때문이다.

```python
# model은 필수로 설정 default 값이 gpt3.5-turbo
```

```python
# temperature = 0에 가까울수록 작위적인(정확한) 답변이 나옴, 실수로 커질수록 무작위성이 커짐
# 같은 답변보다 더 다양한 답변이 나옴

# max_token은 안하는게 나음=> 20토큰으로 제한을 두면 llm은 답변은 1000자여도 20글자만 잘라서 줌 만약 20글자만 받고 싶으면 프롬프트에서 해야 함

# api_key는 환경변수로두면 안줘도 됌

# gpt 5부턴 추론모델의 성향이 강해짐
# reasoning 추론=> 수학, 코딩, 논리적인 작업이 필요할 때
# verbosity 응답길이 제어

# invoke라는 걸로 호출함
```

`max_tokens`는 **짧게 답하라는 지시가 아니라 강제로 자르는 상한**이다. 모델은 긴 답을 쓰다가 상한에서 끊기고, 문장이 중간에 잘린다(허깅페이스 Pipeline 글의 Qwen 질의응답 3번이 그랬다). 짧은 답을 원하면 프롬프트로 "두 문장으로"처럼 요청하고, `max_tokens`는 비용 폭주를 막는 안전장치로만 쓴다. 메모의 "20글자"는 정확히는 20**토큰**이다.

### stream: 토큰 단위로 받기

`invoke`는 답변이 다 만들어진 뒤 한 번에 돌려준다. `stream`은 생성되는 대로 조각(chunk)을 돌려준다. ChatGPT 화면에서 글자가 타이핑되듯 나오는 방식이다.

```python
# 방식으로 응답받기

response = model.stream("langchain은 어떤 framwork인가요?")
response
```

```text
<generator object BaseChatModel.stream at 0x00000140A98C0800>
```

```python
for token in response:
    print(token.content, end="")
```

```text
LangChain은 **LLM(대규모 언어 모델)을 애플리케이션에 쉽게 연결하고, 그 과정(프롬프트/도구/데이터 검색/대화 흐름 등)을 “프레임워크처럼” 구성**하게 해주는 **오픈소스 프레임워크**입니다. 단순히 “챗봇을 만드는 라이브러리”라기보다, **RAG(검색 기반 생성), 에이전트(도구 호출), 워크플로우 구성** 등 LLM 앱 개발에 필요한 여러 구성요소를 조합해주는 역할을 합니다.

… (생략)
```

`stream`은 generator를 돌려주기 때문에 `for`로 돌면서 꺼낸다. `end=""`로 줄바꿈 없이 이어 붙여야 한 문장으로 보인다. 답이 길어도 첫 글자가 바로 나오니 사용자가 체감하는 대기 시간이 짧아진다. Django 시리즈의 SSE 스트리밍 채팅이 이 방식을 웹으로 옮긴 것이다.

```python
# model의 값은 언제든 달라질수있음
# 출력값은 기본은 markdown으로 줌
```

### reasoning: 추론 과정 요약 받기

```python
model = ChatOpenAI(
    model="gpt-5.5",
    reasoning={
        "effort":"medium", "summary":"auto"
    }
)

result = model.invoke("LLM 모델에 대한 설명을 초심자들을 위해 최대한 쉽게 작성해줘.")
result.content
# 단순정보텍스트는 추론이 필요없음(무의미함)
```

```text
[{'id': 'rs_0c8dff0a4bb8778a006a34d804369c8195979e9f6e11933939',
  'summary': [{'text': '**Explaining LLMs in Korean**\n\nI need to present the concept of LLM (Language Model) in an easy way for beginners, and it should be structured. I think saying "LLM 모델" might be a bit redundant, but it’s okay to include it. I’ll aim for moderate verbosity. My focus will be to explain what LLMs are, how they work using an analogy, their capabilities and limitations, along with some examples and key terms. This approach will help make it clear and comprehensible for learners.',
    'type': 'summary_text'}],
  'type': 'reasoning',
  'content': []},
 {'type': 'text',
  'text': '# LLM 모델이란? 초심자를 위한 쉬운 설명\n\nLLM은 **Large Language Model**의 줄임말로, 한국어로는 **대규모 언어 모델**이라고 합니다.  \n쉽게 말하면, **사람의 말을 이해하고 그럴듯한 문장을 만들어내는 인공지능 모델**입니다. … (생략) …',
  'annotations': [],
  'id': 'msg_0c8dff0a4bb8778a006a34d806bedc81958295be20b484859f',
  'phase': 'final_answer'}]
```

`summary`를 켜면 `content`가 문자열이 아니라 **블록 리스트**로 바뀐다. 첫 블록(`type: 'reasoning'`)은 모델이 답을 쓰기 전에 생각한 내용의 요약이고, 두 번째 블록(`type: 'text'`)이 실제 답변이다. 추론 요약을 보면 "초심자용이니 비유를 넣고, 할 수 있는 것과 한계를 나눠 쓰자"고 계획한 뒤 그대로 썼다.

다만 메모처럼, 이런 **설명형 질문에는 추론이 큰 의미가 없다.** 추론 토큰만큼 비용과 시간이 더 들 뿐이다. 수학, 코딩, 여러 조건을 따져야 하는 문제에서 `effort`를 올린다.

### 프롬프트로 형식 지정하기

```python
model = ChatOpenAI(model="gpt-5.4-nano")

prompt = """태양계를 구성하는 행성들에 대해 태양계에서 가까운 순서대로 알려줘.
결과는 다음 답변형식에 맞춰줘.
<답변형식>
- 행성 한국어 이름(영어이름): 간단한 한줄 설명
</답변형식>"""

res = model.invoke(prompt)
print(res.content)
```

```text
- 수성(mercury): 태양에 가장 가까운 행성으로, 공전 주기가 가장 짧고 표면이 극심하게 뜨겁고 차갑다.  
- 금성(venus): 두꺼운 대기 때문에 표면 온도가 매우 높고, 크기와 질량이 지구와 비슷한 편이다.  
- 지구(earth): 생명체가 존재하는 것으로 알려진 행성으로, 액체 상태의 물이 풍부하다.  
- 화성(mars): 붉은 빛을 띠는 행성으로, 과거에 물이 있었을 가능성이 크며 생명체 탐사가 활발하다.  
- 목성(jupiter): 태양계에서 가장 큰 행성으로, 거대한 질량과 강한 중력 때문에 많은 위성과 띠를 거느린다.  
- 토성(saturn): 뚜렷한 고리(환)가 특징인 행성으로, 얼음과 암석 조각들이 고리를 이룬다.  
- 천왕성(uranus): 자전축이 크게 기울어 옆으로 누운 듯한 방향으로 공전하며, 차가운 대기로 이루어져 있다.  
- 해왕성(neptune): 바람이 매우 빠른 행성으로 알려져 있고, 태양계 바깥쪽에서 강한 중력을 가진다.
```

`<답변형식>` 태그로 감싼 형식을 그대로 따랐다. 기본 출력은 마크다운인데, 이렇게 프롬프트에서 형식을 지정할 수 있다. 이 "형식 지시문"을 자동으로 만들어 주는 것이 4편의 출력 파서다.

## Hugging Face 로컬 모델: HuggingFacePipeline

- `HuggingFacePipeline`에 모델 ID를 넘기면 transformers로 모델을 받아(없으면 다운로드) LangChain 모델 객체로 감싼다
- NVIDIA GPU가 있으면 CUDA 버전 torch를 먼저 설치해야 한다. 아니면 CPU 버전이 깔린다

```bash
pip install langchain-huggingface transformers -qU
```

```python
# 로컬에 모델을 설치 후 사용
# opensource => 7B, 10B 모델을 사용해서 할 수 있음 물론 컴퓨터사양이 받쳐줘야하고, 상용화할때는 라이센스를 확인해봐야 함

from langchain_huggingface.llms import HuggingFacePipeline

model_id = "Qwen/Qwen2.5-0.5B-Instruct"

model = HuggingFacePipeline.from_model_id(
    task="text-generation",
    model_id=model_id
)
res = model.invoke("HuggingFace를 소개해줘.")
print(res)
```

```text
HuggingFace를 소개해줘. HuggingFace는 TensorFlow와 PyTorch의 합성 모델인 Transformers을 사용하여, 자연어 처리(NLP)에 대한 훈련된 모델을 제공합니다. HuggingFace의 모델은 여러 언어로 훈련되어 있으며, 이를 통해 다양한 NLP 문제를 해결할 수 있습니다. … (생략) …

이제 HuggingFace에서 어떤 기능을 사용하는지 알려주세요. HuggingFace에서 가장常用的 기능은 Transformers 모델입니다. … (생략)
```

허깅페이스 Pipeline 글에서 쓴 Qwen 0.5B다. 세 가지가 보인다.

- **질문이 답 앞에 그대로 붙어 있다.** `text-generation` pipeline은 입력 뒤를 이어 쓰는 방식이라 입력까지 함께 돌려준다
- "TensorFlow와 PyTorch의 합성 모델인 Transformers"는 틀린 설명이다
- "가장**常用的**"처럼 중국어가 섞였다. Qwen은 중국어 데이터를 많이 학습한 모델이라 작은 크기에서 이런 일이 생긴다

```python
res2 = model.invoke("이미지제작도 할 수 있나?")
print(res2)
```

```text
이미지제작도 할 수 있나? - 카페마트
이미지제작도 할 수 있나?
2017. 5. 6. 13:48
그런데, 이미지 제작에 대해 몇 가지 질문을 하면 이해할 수 있을 것 같습니다.
1. 이미지를 쓰고 싶은 내용을 어떻게 정리해야 하는가요?
… (생략)
```

"카페마트", "2017. 5. 6. 13:48"처럼 게시판 글 형식을 흉내 냈다. 질문에 답한 게 아니라 **이 문장 뒤에 올 법한 웹 문서**를 이어 쓴 것이다. 대화형으로 학습한 모델이어도, 채팅 형식(chat template)을 거치지 않고 문자열을 그대로 넣으면 이렇게 문서 이어 쓰기가 된다.

그래서 이미지는 언어 모델이 아니라 이미지 생성 모델(Stable Diffusion)로 따로 시도했다.

```python
from diffusers import StableDiffusionPipeline
import torch

# 모델 로드
model_id = "runwayml/stable-diffusion-v1-5"
pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float32)

# CPU로 강제 설정
pipe = pipe.to("cpu")

# 이미지 생성 (CPU에서는 수 분이 걸릴 수 있습니다)
prompt = ""
image = pipe(prompt).images[0]

image.save("result2.png")
```

```text
Loading pipeline components...:   0%|          | 0/7 [00:00<?, ?it/s]
Loading weights:   0%|          | 0/196 [00:00<?, ?it/s]
Loading weights:   0%|          | 0/396 [00:00<?, ?it/s]
  0%|          | 0/50 [00:00<?, ?it/s]
```

`diffusers`의 `StableDiffusionPipeline`은 transformers의 pipeline과 같은 방식으로 이미지 생성 모델을 불러온다. 50 step에 걸쳐 노이즈를 걷어 내며 이미지를 만들고, CPU에서는 몇 분씩 걸린다. 이 셀은 `prompt`가 빈 문자열이라 아무 조건 없이 생성된 이미지가 저장된다.

### 메시지 리스트를 넣으면

```python
messages = [{"role":"user", "content":"서울에서 추천하는 여행지 3곳을 알려줘"}]

res = model.invoke(messages)
print(res)
```

```text
Human: 서출에서 추천하는 여행지 3곳을 알려줘.

Assistant: 도시 이름 : 서울

1. 청바스터 명상당
- 청바스터는 서울의 명상당으로, 흥미로운 자연의 빛과 함께 한강을 관광하는 장소입니다.
- 천명을 바라보며 자연의 풍경을 감상할 수 있습니다.

2. 서울 온천
- 온천은 서울의 자연재료를 기반으로 만들어진 관광지입니다. 
… (생략)
```

"청바스터 명상당", "하늘리 보호관"은 존재하지 않는 장소이고, 3곳을 물었는데 4곳 이상을 나열했다. 출력이 `Human: … Assistant:` 대본 형식이고, 질문 문장의 "서울"도 "서출"로 바뀌어 있다. `HuggingFacePipeline`은 채팅 모델이 아니라 **문자열 입력 LLM**이라, 메시지 리스트를 `Human: …` 형태의 문자열로 펼쳐서 넣는다. 모델은 이것을 대화가 아니라 이어 쓸 대본으로 받아들여 Human/Assistant 대사를 스스로 만들어 낸 것으로 보인다.

> **보충** 로컬 모델을 채팅 모델처럼 쓰려면 `langchain_huggingface`의 `ChatHuggingFace(llm=model)`로 한 번 더 감싼다. 그러면 모델의 chat template이 적용되어 OpenAI 모델과 같은 메시지 형식으로 대화할 수 있다.

같은 메시지를 GPT에 넣으면:

```python
from langchain_openai import ChatOpenAI
gpt = ChatOpenAI(model="gpt-5.4-mini")
res_gpt = gpt.invoke(messages)
print(res_gpt.content)
```

```text
서울에서 가볼 만한 여행지 3곳 추천해드릴게요.

1. **경복궁**
   - 서울의 대표적인 궁궐로, 한국 전통 건축과 역사를 느끼기 좋아요.
   - 한복을 입고 사진 찍기에도 예쁘고, 근처에 **북촌한옥마을**도 함께 둘러보기 좋습니다.

2. **남산서울타워**
   - 서울 시내 전경을 한눈에 볼 수 있는 대표 전망 명소예요.
   - 해 질 무렵이나 야경 시간대에 가면 특히 분위기가 좋습니다.

3. **익선동 한옥거리**
   - 전통 한옥과 감성적인 카페, 맛집이 어우러진 인기 지역이에요.
   - 산책하면서 소소하게 즐기기 좋고, 데이트 코스로도 많이 찾습니다.

원하시면 **“혼자 가기 좋은 곳”**, **“가족 여행지”**, **“맛집 많은 곳”**처럼 목적에 맞춰서도 3곳 추천해드릴게요.
```

입력(`messages`)은 그대로 두고 모델 객체만 바꿨다. 이것이 LangChain의 같은 인터페이스다. 결과 차이는 모델 크기와 학습 방식의 차이다.

## Anthropic Claude: ChatAnthropic

- Claude는 성능 순으로 **Haiku, Sonnet, Opus** 세 가지 모델이 있다
- [console.anthropic.com](https://console.anthropic.com/)에서 가입하고 API Key를 만든 뒤(다시 볼 수 없으니 바로 저장), 결제 정보를 등록한다(최소 5달러)
- 환경변수 이름은 `ANTHROPIC_API_KEY`
- [모델 목록](https://docs.anthropic.com/en/docs/about-claude/models), [가격](https://docs.anthropic.com/en/docs/about-claude/pricing)

```python
! uv pip install langchain-anthropic
```

```python
from langchain_anthropic import ChatAnthropic# , Anthropic 지원하는 모델이 다른 것 같다.
from dotenv import load_dotenv
load_dotenv()
model="claude-sonnet-4-6"
llm = ChatAnthropic(
    model=model,
    temperature=0.2, # 모델별로 공통적으로 들어가는 것/물론 모델별로 달라질 수 있음
    # max_tokens=1024, # 
)
result = llm.invoke("Anthropic의 LLM 모델은 어떤 것이 있는지 알려주고 간단한 설명도 부탁해.")
print(result.content)
```

```text
# Anthropic의 LLM 모델

## 🤖 Claude 시리즈

Anthropic의 주요 AI 모델은 **Claude** 브랜드로 출시되고 있습니다.

---

### 📌 현재 주요 모델 (2024년 기준)

| 모델 | 특징 |
|------|------|
| **Claude 3.5 Sonnet** | 현재 가장 인기 있는 모델, 속도와 성능의 균형 |
| **Claude 3.5 Haiku** | 가장 빠르고 경량화된 모델, 비용 효율적 |
| **Claude 3 Opus** | 가장 강력한 성능, 복잡한 작업에 적합 |

… (생략) …

> ⚠️ **참고:** 저는 **Claude**이며, 제 정확한 버전 정보는 Anthropic 공식 사이트([anthropic.com](https://anthropic.com))에서 최신 정보를 확인하시는 것을 추천드립니다!
```

(이 셀의 출력은 강의 자료의 실행 결과다.)

코드는 `ChatOpenAI`를 `ChatAnthropic`으로, 모델 이름만 바꿨고 `invoke`와 `.content`는 그대로다. 그리고 GPT 때와 똑같이 **knowledge cutoff**가 보인다. Claude Sonnet 4.6이 답했지만 목록은 "2024년 기준"의 Claude 3.5까지다. 모델 스스로도 "정확한 버전은 공식 사이트에서 확인하라"고 덧붙였다.

`temperature`처럼 여러 제공사에 공통인 파라미터는 같은 이름으로 쓰지만, 모델마다 허용 범위나 기본값은 다를 수 있다. 메모의 "Anthropic 지원하는 모델이 다른 것 같다"는 `ChatAnthropic` 옆에 `Anthropic` 클래스도 있는데, 이건 채팅 모델이 아니라 문자열 입력용(위의 `HuggingFacePipeline`과 같은 종류)이라 쓰임이 다르다는 뜻이다. 채팅 모델은 `Chat`으로 시작하는 클래스를 쓴다.

## Google Gemini: ChatGoogleGenerativeAI

- [Google AI Studio](https://aistudio.google.com/api-keys)에서 API Key를 만들고 `GOOGLE_API_KEY` 환경변수에 등록한다
- `pip install langchain_google_genai`
- [모델](https://ai.google.dev/gemini-api/docs/models?hl=ko), [가격](https://ai.google.dev/gemini-api/docs/pricing?hl=ko)

```python
load_dotenv(override=True)

from langchain_google_genai import ChatGoogleGenerativeAI

model = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite")
res=model.invoke("gemini와 gemma model의 차이는 무엇일까요?,gemma는 이미지생성도 돼?")
print(res.text)
```

```text
Google의 **Gemini**와 **Gemma**는 뿌리는 같지만, **지향하는 목적과 배포 방식에서 큰 차이**가 있습니다. 질문하신 내용을 나누어 명확히 설명해 드릴게요.

---

### 1. Gemini vs Gemma 차이점

| 구분 | Gemini (제미나이) | Gemma (젬마) |
| :--- | :--- | :--- |
| **성격** | 구글의 **최상급 폐쇄형 모델** | 구글의 **경량화 오픈 모델** |
| **접근 방식** | API 또는 서비스(웹/앱)로 사용 | 모델 가중치(Weights)를 직접 다운로드 |
| **모델 크기** | 매우 거대함 (Ultra, Pro 등) | 가볍고 효율적 (2B, 7B, 9B, 27B 등) |
| **사용 환경** | 구글 서버에서 구동 | 내 컴퓨터(로컬)나 자체 서버에서 구동 |
| **비유** | 완성된 요리 (식당에서 주문) | 요리 재료와 레시피 (직접 요리) |

… (생략) …

### 2. Gemma는 이미지 생성이 가능한가요?

**결론부터 말씀드리면, Gemma는 기본적으로 '텍스트 기반 모델'이며, 직접적인 이미지 생성 기능은 없습니다.**
… (생략)
```

1편에서 정리한 오픈소스(Gemma) vs 상용(Gemini) 구분을 Gemini가 직접 설명했다. Gemini 응답은 `content`가 블록 리스트로 올 때가 있어서, 텍스트만 꺼낼 때는 `res.text`를 쓴다(위의 reasoning 결과처럼 `content`가 리스트인 경우와 같은 문제다).

## 메시지를 넘기는 세 가지 방법

| 방법 | 예 |
|---|---|
| 문자열 | `model.invoke("질문")` → user 메시지 하나로 바뀐다 |
| dict 리스트 | `[{"role": "user", "content": "질문"}]` (OpenAI 형식) |
| 튜플 리스트 | `[("user", "질문")]` (LangChain 축약 형식) |

dict로 쓸 때는 `role`과 `content`가 **한 dict 안에** 있어야 한다. 아래는 둘을 나눠 쓴 잘못된 형태다.

```python
# 현재 상태
message = [ 
    {"role": "user"}, # <--- 여기에는 'content'가 없음!
    {"content": "나는 4박 5일간 기타큐수로 여행을 갈 예정이야. 일정에 맞춰 스케줄을 짜줘"}
]
```

이렇게 넘기면 첫 메시지에는 내용이 없고, 둘째 메시지에는 역할이 없어서 메시지로 변환할 수 없다. 올바른 형태는 `[{"role": "user", "content": "나는 4박 5일간 …"}]`이다. 더 짧게는 튜플로 쓴다.

```python
# 튜플로 

message = [
    ("user", "3박 4일간 대만 여행을 하려고 한다. 가면 좋을 관광지를 소개해줘.")
]

res = model.invoke(message)

Markdown(res.text)
```

`IPython.display.Markdown`으로 감싸면 노트북에서 응답의 마크다운(제목, 표, 굵게)이 렌더링되어 보인다.

```python
# 랭체인=> chat XXX => 각 모델의 라이브러리를 가져옴 invoke
# 도구도 같은 방식으로 가져옴
# 랭체인=> tool XXX => 도구를 가져옴
```

## 어떤 모델 클래스를, 언제

| 상황 | 클래스 | 이번 실습에서 본 것 |
|---|---|---|
| 품질이 중요하고 API 비용을 낼 수 있다 | `ChatOpenAI`, `ChatAnthropic`, `ChatGoogleGenerativeAI` | 같은 `invoke`로 호출되고, 모델 이름만 바꾸면 된다 |
| 데이터를 외부로 보낼 수 없다, 오프라인이 필요하다 | `HuggingFacePipeline` (+ `ChatHuggingFace`) | 0.5B는 존재하지 않는 장소를 지어냈다. 실사용엔 7B 이상과 GPU가 필요하다 |
| 수학·코딩·조건이 많은 문제 | 추론 모델 + `reasoning` effort 상향 | 설명형 질문에는 비용만 늘어난다 |
| 긴 답을 빠르게 보여 줘야 하는 채팅 화면 | `stream` | 첫 토큰부터 바로 출력된다 |
| 최신 정보가 필요하다 | 모델만으로는 안 됨 → 검색 도구, RAG | GPT·Claude 모두 자기 이전 세대까지만 알았다 |

## 정리

- **Model I/O** = 프롬프트 템플릿 → 언어 모델 → 출력 파서. 출력 형식 지시문은 파서가 만들어 프롬프트에 넣는다
- LLM API는 서비스에 AI를 내장하기 위한 것이고, **토큰 단위로 과금**된다. API Key는 `.env`에 두고 절대 공개하지 않는다
- LangChain의 `ChatOpenAI` / `ChatAnthropic` / `ChatGoogleGenerativeAI`는 **같은 `invoke` 인터페이스**라서 모델 교체가 쉽다
- `temperature`는 다양성, `max_tokens`는 강제 상한(짧게 받고 싶으면 프롬프트로), `reasoning`은 추론 강도를 조절한다
- `stream`은 생성되는 대로 조각을 돌려주는 generator다
- 모델은 **knowledge cutoff** 이후를 모른다. GPT-5.4와 Claude Sonnet 4.6 모두 자기 이전 세대까지만 답했다
- `HuggingFacePipeline`은 문자열 입력 LLM이라 메시지 형식이 그대로 적용되지 않는다. 채팅 형식은 `ChatHuggingFace`로 감싼다
