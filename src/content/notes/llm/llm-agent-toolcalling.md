---
title: "AI Agent와 Tool Calling: 도구를 쥔 LLM"
description: "AI Agent의 개념과 Workflow와의 차이, 싱글·멀티 에이전트, ReAct 패턴을 정리하고, Tavily·Exa 검색 도구로 bind_tools → tool_calls → ToolMessage로 이어지는 Tool Calling 흐름을 직접 따라간 뒤, @tool·as_tool·retriever tool로 사용자 정의 도구를 만들어 create_agent로 메뉴 추천 에이전트를 완성하고 MCP 연동까지 살펴봅니다."
category: 'Tech'
subcategory: 'LLM'
series: 'Agent·LangGraph'
seriesOrder: 1
originalNotebook: "11_Agent_개요-ToolCalling.ipynb"
tags: ["LLM","Agent"]
date: 2026-07-06T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-agent-toolcalling.webp'
---

> SKN31 AI Agent 과정 노트북 `11_Agent_개요-ToolCalling.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과입니다. 수업 노트북에서 비어 있던 뒷부분(web_agent 루프, 위키백과 tool, 메뉴 검색 tool, create_agent, MCP)은 **강사님 노트북의 실행 결과**로 채웠고, 해당 위치에 따로 표시했습니다. 검색 결과는 실행 시점마다 달라집니다.

## 이 글에서 다루는 것

- AI Agent란: Workflow와의 차이, 주요 특징
- 싱글 에이전트 vs 멀티 에이전트
- ReAct 패턴
- Tool이 필요한 이유와 Tool Calling 3단계
- Built-in tool(Tavily, Exa)로 Tool Calling 흐름 따라가기
- 도구 결과를 다시 LLM에 넣는 web_agent 루프
- 사용자 정의 tool: `@tool`, `as_tool()`, retriever tool
- `create_agent()`로 Agent 만들기
- MCP 연동

지금까지는 LLM이 **답을 생성**하는 쪽이었다. RAG도 결국 "검색을 먼저 하고 그 결과를 넣어서 답한다"는 **고정된 순서**였다. 이번 글부터는 LLM이 **무엇을 할지 스스로 고르는** 구조로 넘어간다.

## AI Agent란?

**AI Agent는 사용자의 목표를 달성하기 위해 LLM을 추론과 의사결정의 중심으로 두고, 계획 → 실행 → 관찰 → 판단을 반복하며 자율적으로 작업을 수행하는 시스템**이다.

일반적인 LLM 사용은 한 번 묻고 한 번 답하는 구조다.

```text
사용자 질문 → LLM → 답변
```

Agent는 답만 만드는 게 아니라 목표를 이해하고 필요한 작업을 스스로 판단해 실행한다.

```text
목표 이해 → 계획 수립 → 도구 실행 → 결과 관찰 → 다음 행동 결정
```

| 단계 | 하는 일 |
|---|---|
| 목표 이해 | 요청 문장 뒤의 실제 목표를 파악 |
| 작업 계획 | 어떤 순서로 무엇을 할지 단계를 나눔 |
| 외부 도구 사용 | 검색, API, DB, 파일 시스템, 계산기, 코드 실행 등 호출 |
| 관찰 후 결정 | 결과가 충분한지, 추가 작업이 필요한지 판단 |
| 반복 | 목표가 달성될 때까지 위 과정을 반복 |

예를 들어 "최근 AI 반도체 시장 동향을 조사해서 요약해줘"라는 요청이면 다음처럼 움직인다.

```text
1. 목표 파악: AI 반도체 시장 동향 조사
2. 계획 수립: 주요 기업, 시장 규모, 최근 이슈, 전망을 조사
3. 도구 사용: 웹 검색, 데이터베이스 조회
4. 결과 관찰: 수집한 자료가 충분한지 판단
5. 추가 실행: 부족한 정보가 있으면 추가 검색
6. 최종 답변: 조사 결과를 정리해 사용자에게 제공
```

수업 중 적어 둔 한 줄 요약은 이렇다.

```python
# MCP => AI AGENT 표준화 (클로드)
# MCP => 툴을 만드는 방법을 표준화

# AI AGENT => LLM에 TOOL를 붙이는 것. (LLM - 계획 & 판단 & 실행)
```

MCP는 글 마지막에 다시 나온다.

## Workflow와 Agent

```python
# WORK FLOW => 미리 정해진 절차에 따라 실행된다.

# AGENT => 스스로 판단하면서 결정한다.
```

| 구분 | Workflow | Agent |
|---|---|---|
| 실행 순서 | 사전에 고정 | 상황에 따라 결정 |
| 도구 선택 | 코드가 정함 | LLM이 정함 |
| 적합한 작업 | 반복적·정형화된 작업 | 중간 결과에 따라 다음 행동이 달라지는 작업 |
| 예 | 지난 글들의 RAG 체인 | 검색할지, 몇 번 할지, 무엇으로 할지를 LLM이 결정 |

```python
# LLM 자체만으로는 아무것도 못함 + TOOL(도구)를 붙여줘야 함

# LLM tool calling or function call
```

LLM은 텍스트를 생성할 뿐이라, 실제로 "일"을 하려면 도구가 붙어야 한다. 이 연결 방식을 **Tool Calling**(OpenAI 쪽 옛 이름으로는 Function Calling)이라 부른다.

## Agent의 주요 특징

| 특징 | 내용 |
|---|---|
| **자율성** (Autonomy) | 사전 규칙이 아니라 LLM이 현재 상황을 해석하고 다음 행동을 동적으로 결정 |
| **목표 지향성** (Goal-Oriented) | "이 행동이 목표 달성에 도움이 되는가"를 기준으로 판단하며 목표에 도달할 때까지 반복 |
| **도구 활용** (Tool Utilization) | 최신 정보 검색, 복잡한 계산, 외부 시스템 제어를 도구로 수행. "말만 하는 AI"가 아니라 "일을 처리하는 AI" |
| **인간 개입 최소화** | 사람은 초기 목표 제시, 결과 확인, 최종 승인 정도만 개입 |

## 싱글 에이전트와 멀티 에이전트

**싱글 에이전트**는 하나의 에이전트가 처음부터 끝까지 책임지는 구조다. "인식 → 추론 → 행동 → 관찰"이 모두 **하나의 컨텍스트 안**에서 일어난다. "이 코드의 버그를 찾아 고쳐줘"라면 한 에이전트가 코드를 읽고, 원인을 추론하고, 수정하고, 테스트 결과까지 확인한다.

**멀티 에이전트**는 역할이 나뉜 여러 에이전트가 협력하는 구조다. 보통 **오케스트레이터(슈퍼바이저)** 가 큰 작업을 쪼개 **워커 에이전트**에게 맡기고, 각 워커는 자기만의 컨텍스트에서 일한다. 구성 패턴으로는 슈퍼바이저-워커, 순차 파이프라인, 수평적 협업이 있다.

### 멀티 에이전트가 효과적인 이유

Anthropic이 공개한 멀티에이전트 리서치 시스템 자료에서는 리드 에이전트(Opus)와 서브에이전트(Sonnet)로 구성한 시스템이 단일 에이전트(Opus)보다 내부 평가에서 약 90% 높은 성능을 보였고, 성능 차이의 약 80%가 **토큰 사용량**으로 설명됐다고 한다. 토큰 사용량은 작업을 끝낼 때까지 모델이 읽고 쓴 토큰의 총합(검색 결과, 도구 반환값, 문서, 대화 맥락 + 추론, 도구 호출 명령, 최종 답변)이다. 즉 멀티 에이전트가 강한 이유는 **더 많은 사고량(토큰)을 병렬로 투입할 수 있기 때문**이다.

대가도 크다.

- **조율 비용**: 작업을 나누고 결과를 주고받는 비용
- **토큰·비용 급증**: 같은 자료 기준으로 일반 채팅 대비 단일 에이전트 약 4배, 멀티 에이전트 약 15배
- **오류 전파**: 한 에이전트의 실수가 다음 단계로 번짐
- **디버깅 난이도**: 여러 주체의 비결정적 상호작용을 추적해야 함
- **맥락 단절**: 서브에이전트끼리 맥락을 공유하지 못하면 결과가 서로 모순될 수 있음

### 언제 무엇을

원칙은 **"싱글 에이전트로 단순하게 시작하고, 한계에 부딪히면 멀티 에이전트로 확장한다"** 이다. 처음부터 멀티 에이전트를 고르는 건 과잉 설계가 되기 쉽다.

| 기준 | 싱글 에이전트 | 멀티 에이전트 |
|---|---|---|
| 응답 속도 | ✅ 빠름 | 느림 |
| 비용(토큰) | ✅ 낮음 | 높음 (채팅 대비 ~15배) |
| 디버깅·추적 | ✅ 쉬움 | 어려움 |
| 병렬 처리 | 불가 | ✅ 가능 |
| 전문 영역 분담 | 어려움 | ✅ 가능 |
| 대용량 컨텍스트 | 한계 있음 | ✅ 분산 가능 |
| 맥락이 긴밀히 얽힌 작업 | ✅ 안정적 | 부적합 |

## ReAct 패턴

ReAct는 **Reasoning(추론)** 과 **Acting(행동)** 을 결합한 프롬프팅 패턴으로, Agent 구현의 바탕이 되는 이론이다. 질문을 받으면 바로 답하지 않고 다음 순환을 돈다.

```
질문 → 생각(Thought) → 행동(Action) → 관찰(Observation) → 생각 → 행동 → 관찰 → ... → 답변
```

![ReAct 패턴](/images/llm/fig-agent-react.png)

"현재 서울의 날씨와 미세먼지 농도를 알려줘"라면:

```text
Thought: 날씨 정보를 얻기 위해 날씨 API를 호출해야겠다
Action: WeatherAPI.get_weather("서울")
Observation: 기온 15도, 맑음
Thought: 이제 미세먼지 정보도 필요하다
Action: AirQualityAPI.get_pm("서울")
Observation: PM10 농도 20㎍/㎥, 좋음
Answer: 서울의 현재 날씨는 기온 15도로 맑고, 미세먼지 농도는 20㎍/㎥로 좋은 상태이다
```

> **보충**: 수업 자료의 예시에서는 관찰값이 20㎍/㎥인데 최종 답변에 30㎍/㎥로 적혀 있었다. 위에서는 20으로 맞췄다. 관찰과 답이 어긋나는 것이 바로 ReAct가 줄이려는 환각의 모양이기도 하다.

동작 단계는 5단계다.

| 단계 | 하는 일 | 예 (2024 노벨 물리학상) |
|---|---|---|
| 1. 질문 입력 | 사용자 요청을 받음 | "2024년 노벨 물리학상 수상자와 업적은?" |
| 2. Thought | 문제 분해, 필요한 정보와 도구 결정 | "학습 데이터에 없을 수 있다. 검색해야 한다." |
| 3. Action | 도구 호출 | `검색("2024 노벨 물리학상 수상자")` |
| 4. Observation | 결과 확인 | "John Hopfield, Geoffrey Hinton" |
| 5. 반복/종료 | 부족하면 2번으로, 충분하면 최종 답변 | 업적을 한 번 더 검색한 뒤 `Finish(...)` |

장점은 **투명성**(사고 과정 추적), **정확성**(외부 지식으로 환각 감소), **유연성**(도구 조합), **해석 가능성**이다.

```python
# React => Reasoning 부분의 model은 좋은 걸로
```

어떤 도구를 언제 부를지 판단하는 쪽이 Agent 품질을 좌우하므로, 판단을 맡는 모델은 좋은 것을 쓰는 게 낫다.

## Tool과 Tool Calling

### Tool이란

**Tool은 하나의 기능을 처리하는 함수**다. LLM은 텍스트만 생성하므로 계산, 검색, 파일 처리, DB 조회 같은 실제 작업은 Tool이 대신한다. Agent는 **LLM으로 판단하고 Tool을 호출해서 실행**한다.

### Tool이 필요한 이유

LLM에는 두 가지 본질적 한계가 있다. **외부 세계를 읽지 못하고**(Read 제약), **외부 세계에 영향을 줄 수 없다**(Write/Execute 제약).

| LLM의 한계 | 분류 | Tool의 대응 | 예시 |
|---|---|---|---|
| Knowledge Cutoff | Read | 최신 정보 조회 | Web Search, News API |
| 실시간 데이터 미접근 | Read | 현재 데이터 조회 | DB Query, Weather API |
| 개인·조직 데이터 미접근 | Read | 파일·문서 접근 | File Reader, Email Reader |
| 연산 부정확 | Execute | 정확한 계산 위임 | Calculator, Spreadsheet |
| 코드 실행 불가 | Execute | 코드 실행 | Python REPL, Shell |
| 시스템 연동 불가 | Execute | 외부 시스템 액션 | REST API, 메시지 전송 |
| 상태(state) 비저장 | Read/Write | 영속적 저장소 활용 | Memory Tool, Vector DB |

### Tool Calling 3단계

1. **도구 바인딩**: LLM에 사용 가능한 tool을 등록한다. 함수, 이름, 기능 설명, 입력 파라미터의 타입과 설명을 함께 넘긴다.
2. **LLM이 도구 사용 여부를 판단**한다. 직접 답할 수 있으면 답하고, 도구가 필요하면 **도구를 호출하는 게 아니라 "어떤 tool에 어떤 값을 넣어 호출하라"는 요청 정보**를 응답으로 만든다.
3. **시스템(우리 코드)이 그 요청대로 tool을 실행**하고 결과를 다시 LLM에 전달한다.

![Tool Calling 개념](/images/llm/fig-toolcalling-concept.png)

2번이 핵심이다. LLM은 tool을 실행하지 않는다. 실행은 우리 코드가 한다.

```python
# doc string 잘써놔야함
```

LLM이 2번에서 판단할 근거는 tool의 **이름, 설명, 파라미터 스키마**뿐이다. 함수로 tool을 만들면 docstring이 그대로 설명이 되므로 docstring을 대충 쓰면 LLM이 tool을 못 고른다.

LangChain은 모델마다 다른 tool calling 방식을 표준화해 같은 인터페이스로 제공하고, 미리 구현된 [Built-in tools](https://docs.langchain.com/oss/python/integrations/tools)도 제공한다. Tool calling은 이를 지원하는 모델에서만 쓸 수 있다.

## Built-in Tool로 Tool Calling 이해하기

### Tavily와 Exa

| | Tavily | Exa |
|---|---|---|
| 성격 | LLM·RAG에 최적화된 검색 API | 임베딩(neural) 기반 의미 검색 API |
| 강점 | 키워드/출처 우선, 인용 붙이기 좋음 | 애매한 자연어 설명으로도 관련 페이지를 잘 찾음 |
| 무료 | 월 1,000회 | 가입 시 \$10 크레딧 |
| 패키지 | `pip install langchain-tavily` | `pip install -U langchain-exa` |
| LangChain tool | `TavilySearch` | `ExaSearchResults`, `ExaFindSimilarResults` |
| 환경변수 | `TAVILY_API_KEY` | `EXA_API_KEY` |

Exa는 `type`("neural", "keyword", "auto")으로 검색 방식을, `livecrawl`("always", "fallback", "never")로 실시간 크롤링 여부를 고를 수 있다. `ExaSearchRetriever`는 tool이 아니라 retriever 형태라 RAG 체인에 바로 연결한다.

```python
from langchain_tavily import TavilySearch
from langchain_exa import ExaSearchResults
from pprint import pprint
from dotenv import load_dotenv

load_dotenv(override=True)
```

tool도 Runnable이라 `invoke`로 바로 실행할 수 있다.

```python
query = "2026년 북중미 월드컵에서 한국팀의 성적은?"

tavily_search = TavilySearch( # == runnable 타입
    max_results=5, #검색 결과 수
)

result = tavily_search.invoke(query)

pprint(result)
```

```text
{'answer': None,
 'follow_up_questions': None,
 'images': [],
 'query': '2026년 북중미 월드컵에서 한국팀의 성적은?',
 'response_time': 0.0,
 'results': [{'content': '대한민국 역대 성적 총정리! • 1954 스위스 – 2패 (김용식 감독) • 1986 멕시코 '
                         '– 1무 2패 (김정남 감독) ...',
              'score': 0.8763069,
              'title': '2026년 북중미 월드컵 개막 대한민국, 체코에 2-1 짜릿한 역전승!',
              'url': 'https://www.threads.com/@flow.itself/post/...'},
             {'content': '# 한국, 체코에 2-1 역전승…광화문 달군 월드컵 1차전 승리. 대한민국 축구 국가대표팀이 '
                         '2026 북중미 월드컵 조별리그 첫 경기에서 체코를 상대로 역전승을 거두며 ...',
              ...
```

```python
exa_search = ExaSearchResults(
    max_results = 5
)

result = exa_search.invoke(query)

pprint(result)
```

```text
SearchResponse(results=[Result(url='https://www.yna.co.kr/view/AKR20260628020651007',
                               title="[월드컵] 홍명보호, 하늘도 버렸다…사흘 '희망 고문' 끝에 32강행 "
                                     '좌절(종합) | 연합뉴스',
                               published_date='2026-06-28T01:48:49.000Z',
                               author='오명언',
                               text="[월드컵] 홍명보호, 하늘도 버렸다…사흘 '희망 고문' 끝에 32강행 "
                                    '좌절(종합) | 연합뉴스\n'
                               ...
```

같은 질문인데 Tavily는 1차전 승리 소식을, Exa는 32강 좌절 기사를 맨 위에 가져왔다. Tavily는 키워드 일치(소셜 게시물 제목에 "2026년 북중미 월드컵"이 그대로 있음)가 강하게 작용하고, Exa는 의미상 "성적"에 가까운 최종 결과 기사를 골랐다고 볼 수 있다.

### LLM이 보는 tool 정보

```python
# TOOL 정보 확인 - LLM이 TOOL을 사용할지를 결정할 때 판단 근거, 호출할 때 전달할 값을 결정하는 근거

print("도구이름", tavily_search.name, exa_search.name, sep=", ")
print("도구설명", tavily_search.description)


# TOOL 생성 -> 호출 -> 판단

# (1) Built-in TOOL 객체 생성 
# (2) 검색 - TOOL 호출
# (3) LLM이 판단 = TOOL 정보를 확인함 

?tavily_search
```

```text
도구이름, tavily_search, exa_search_results_json
도구설명 A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events. It not only retrieves URLs and snippets, but offers advanced search depths, domain management, time rang...
```

Exa tool의 이름은 객체 변수명과 상관없이 `exa_search_results_json`이다. 뒤에서 tool_calls의 `name`을 비교할 때 이 이름을 쓴다.

```python
# 도구 스키마 - 도구 호출할 때 값을 전달할 파라미터 정보
# 우리가 도구를 만들 떄는 이런식으로 값을 만들어줘야 함
tavily_search.args 
```

```text
{'query': {'description': 'Search query to look up',
  'title': 'Query',
  'type': 'string'},
 'include_domains': {'anyOf': [{'items': {'type': 'string'}, 'type': 'array'},
   {'type': 'null'}],
  'default': [],
  'description': 'A list of domains to restrict search results to.\n\n        Use this parameter when:\n        1. The user explicitly requests information from specific websites (e.g., "Find climate data from nasa.gov")...',
  'title': 'Include Domains'},
 'exclude_domains': {...},
 ...
```

파라미터마다 **언제 이 값을 쓰라는 설명**까지 들어 있다. LLM은 이 설명을 읽고 `include_domains`를 채울지 말지 결정한다. 직접 tool을 만들 때 이 수준으로 써 줘야 한다는 뜻이다.

## LLM Tool Calling 흐름

### 1. Tool binding

`LLM-Model.bind_tools(tools=[tool_1, tool_2, ...])`

```python
# tool-binding이란? 툴 바인딩(Tool Binding)이란, 쉽게 말해 "AI가 사용할 수 있는 도구(Tool)들을 AI 모델에게 공식적으로 등록하여, 
# AI가 상황에 맞춰 적절한 도구를 스스로 선택해 꺼내 쓸 수 있게 연결하는 과정
```

```python
from langchain_openai import ChatOpenAI
from langchain_exa import ExaSearchResults

# tool과 LLM 모델 생성
exa_search = ExaSearchResults(max_result=5)
model = ChatOpenAI(model = "gpt-5.4-mini")

# llm 모델에 tool binding (tool binding)
tool_model = model.bind_tools(tools=[exa_search])

# model: LLM(tool 없음)
# tool_model: LLM + TOOL들 (바인딩된 상태)
```

tool이 필요 없는 질문부터 보자.

```python
# TOOL 호출이 필요없는 질문에 대한 응답
result = tool_model.invoke("안녕하세요")
```

```python
type(result)
print(result.content) # LLM 응답 (: text만)
print(result.tool_calls) # 호출할 TOOL에 대한 정보 (: 어떤 툴을 어떻게 호출할지)
# 응답에는 위 둘 중 하나만 값이 있다.
```

```text
안녕하세요! 무엇을 도와드릴까요?
[]
```

인사에는 tool이 필요 없으니 `content`에 답이 있고 `tool_calls`는 빈 리스트다.

```python
# TOOL 호출이 필요한 질문
result2 = tool_model.invoke("2026년 7월 7일 서울의 날씨는 어떤가요?")
```

```python
print(result2.content)
pprint(result2.tool_calls) # 호출해야하는 것에 대한 query값을 줌 TOOL 호출안함
```

```text

[{'args': {'livecrawl': 'always',
           'num_results': 5,
           'query': '서울 2026년 7월 7일 날씨 예보',
           'summary': True,
           'text_contents_options': {'max_characters': 3000},
           'type': 'fast'},
  'id': 'call_6E6PeBzGE4gPK8y6Jk6B4Krh',
  'name': 'exa_search_results_json',
  'type': 'tool_call'}]
```

이번엔 `content`가 비어 있고 `tool_calls`에 **어떤 tool(`name`)을 어떤 값(`args`)으로** 부를지가 들어 있다. 검색어를 "서울 2026년 7월 7일 날씨 예보"로 다듬고 `livecrawl`, `num_results` 같은 옵션까지 LLM이 스키마를 보고 채웠다. 주석대로 **tool을 호출한 게 아니라 호출 정보만 준 것**이다.

> **보충**: "응답에는 위 둘 중 하나만 값이 있다"는 대체로 맞지만 규칙은 아니다. 모델에 따라 "검색해 볼게요" 같은 문장을 `content`에 넣으면서 동시에 `tool_calls`를 줄 수도 있다. 분기할 때는 `content`가 아니라 **`tool_calls`가 비었는지**로 판단하는 게 안전하다.

질문 하나에 검색이 여러 번 필요하면 tool_call도 여러 개 온다.

```python
result3 = tool_model.invoke("2026년 7월 7일 서울, 런던, 뉴욕의 날씨를 알려줘. 그리고 오늘 월드컵 경기결과들도 알려줘.")
```

```python
print(len(result3.tool_calls)) # LIST 안에 dict 형태로 tool 정보가 들어가 있음 
for r in result3.tool_calls:
    print(r)
    print("------" *50)
```

```text
2
{'name': 'exa_search_results_json', 'args': {'query': '2026-07-07 weather Seoul London New York forecast', 'num_results': 5, 'type': 'fast', 'livecrawl': 'always', 'summary': True}, 'id': 'call_lojvmk9NsuV7hlUdxYE4q4xN', 'type': 'tool_call'}
------------------------------------------------------------...
{'name': 'exa_search_results_json', 'args': {'query': '2026 FIFA World Cup July 7 2026 results today', 'num_results': 10, 'type': 'fast', 'livecrawl': 'always', 'summary': True}, 'id': 'call_lC3yewq0UnHUMSbaWFVqDVaK', 'type': 'tool_call'}
------------------------------------------------------------...
```

날씨 세 도시는 한 번의 검색으로 묶고, 월드컵은 따로 검색하도록 두 개로 나눴다. 월드컵 쪽은 결과가 많을 것 같았는지 `num_results`를 10으로 올렸다.

> **보충**: `ExaSearchResults(max_result=5)`처럼 생성자에 준 값과 상관없이 위 tool_calls에는 LLM이 정한 `num_results`가 들어 있다. 검색 개수는 tool의 **호출 인자**(스키마의 `num_results`)이기 때문이다. 생성자의 `max_result`는 Exa tool의 정식 파라미터 이름이 아니어서 실제로 적용됐는지는 확인이 필요하다.

### 2. Tool 호출

LLM이 tool 사용을 결정하면 `AIMessage.tool_calls`에 호출 정보가 담긴다. 이 dict를 그대로 `tool.invoke()`에 넣으면 된다. 반환 타입은 **`ToolMessage`** 다.

```python
# exa_search 툴을 tool_calls[K](dict)를 전달해서 호출

result3.tool_calls 
```

```python
search_result1 = exa_search.invoke(result3.tool_calls[0]) # 2개중 1번째
search_result2 = exa_search.invoke(result3.tool_calls[1]) # 2개중 2번째
type(search_result1)
# 사람의 입력: HumanMessage
# LLM 응답: AIMessage
# Tool 실행 결과: ToolMessage
```

```text
langchain_core.messages.tool.ToolMessage
```

```python
pprint(search_result1.content)
print("---------"*100)
pprint(search_result2.content)
```

```text
('Title: Seoul, South Korea Weather Today, Jul 7 | 82°F, Light drizzle\n'
 'Title: New York, United States 7-Day Weather Forecast ...
```

tool_call dict 전체를 넘기면 결과가 문자열이 아니라 `ToolMessage`로 온다. 이 `ToolMessage`에는 어떤 tool_call에 대한 응답인지 `tool_call_id`가 붙어 있어서 나중에 LLM에 다시 넣을 수 있다. `args`만 넘기면(`exa_search.invoke(result3.tool_calls[0]["args"])`) 결과 값만 받는다.

| 메시지 타입 | 누가 만드나 |
|---|---|
| `HumanMessage` | 사람의 입력 |
| `AIMessage` | LLM 응답 (답변 또는 tool_calls) |
| `ToolMessage` | Tool 실행 결과 |

같은 tool을 여러 번 호출해야 하면 `batch`로 한 번에 처리한다.

```python
# 툴이 여러개 일 경우
search_result = exa_search.batch(result3.tool_calls) # 같은 툴을 여러번 호출 할 경우 => batch([{}, {}, ...])
```

```python
print(len(search_result))
search_result
```

```text
2

[ToolMessage(content="Title: London, United Kingdom Hourly Weather Forecast | Weather Underground\nURL: https://wu-next-prod-us-east-1-aws.wunderground.com/hourly/gb/london/ILONDO540/date/2026-7-7\n...
```

> **보충**: 주석은 "툴이 여러개 일 경우"인데 실제로는 **tool_call이 여러 개**인 경우다. `batch`는 같은 tool 객체로 여러 입력을 처리하는 것이라 tool_calls 안에 서로 다른 tool이 섞여 있으면 그대로 쓸 수 없다. 그때는 아래 web_agent처럼 `name`으로 분기해야 한다.

### 3. Tool 결과를 LLM에 다시 넣기

`ToolMessage`를 프롬프트에 추가해서 LLM을 다시 호출한다. 이때 순서가 중요하다. **ToolMessage는 반드시 tool_calls를 가진 AIMessage 다음에 와야 한다.**

1. 일반 prompt (system, 대화 history, ..., human)
2. AIMessage: tool calling 정보를 가진 응답
3. ToolMessage: tool 처리 결과

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import chain
from langchain_tavily import TavilyResearch
from langchain_exa import ExaSearchResults

from datetime import date
from dotenv import load_dotenv

load_dotenv(override=True)
```

LLM은 오늘이 며칠인지 모른다. "오늘 월드컵 결과"를 검색하려면 날짜를 프롬프트로 알려 줘야 한다.

```python
prompt_str="""
- 당신은 사용자의 다양한 질문에 답변하는 AI assistant입니다.
- 사용자의 질문에 상대적 시간 표현이 포함되어 있고 절대 날짜가 명시되어 있지 않은 경우, 오늘 날짜를 기준으로 실제 날짜를 계산한 뒤 검색합니다.
    - 상대적 시간 표현 예: 현재, 오늘, 어제, 내일, 이번 주, 지난주, 이번 달, 지난달, 올해, 작년
- 오늘 날짜는 {today}입니다.
- 답변에 필요한 정보가 부족하거나 최신 정보 확인이 필요한 경우, 적절한 tool을 사용해 정보를 수집합니다.
    - 질문에 답변하기 위해 웹 검색 tool을 사용할 때, 질문에 시점 정보가 필요한 경우 계산된 날짜나 시간 범위를 검색 쿼리에 포함해야 합니다.
- 웹 검색이 필요할 경우 binding 된 웹 검색 tool(tavily_search, exa_search_result_json) 을 모두 사용합니다.
- 사용할 수 있는 tool은 다음과 같습니다.
    - tavily_search: 웹 검색 tool
    - exa_search_result_json: 웹 검색 tool
"""
```

```python
# Chain 구성

# 01 모델 생성
model = ChatOpenAI(model="gpt-5.4-mini")

# 02 TOOL 저의
tavily_search = TavilyResearch(max_result=5)
exa_search = ExaSearchResults(max_result=5)

# 03 model - bind - tool 
tool_model = model.bind_tools([tavily_search, exa_search])

today = date.today().strftime('%Y년 %m월 %d일') # date -> str (2026년 07월 07일)

# 04 프롬프트 생성
prompt = ChatPromptTemplate(
    [
        ('system', prompt_str), # SystemMessage
        ('human', "{query}"), # HumanMessage
        MessagesPlaceholder(variable_name="tool_messages", optional=True)
        # Tool 호출결과인 ToolMessage들을 넣을 placehold
        # AIMessage(tool 호출하라는 AI의 응답메세지) -> ToolMessage

    ],

    partial_variables = {'today':today}
)

prompt.invoke({"query":"질문"})
```

`partial_variables`로 오늘 날짜를 미리 채워 두고, `MessagesPlaceholder(optional=True)`로 첫 호출에는 비어 있다가 tool 결과가 생기면 AIMessage + ToolMessage들이 들어갈 자리를 만들었다.

> **보충**: 프롬프트에 적은 tool 이름 두 가지가 실제와 다르다.
> - Exa tool의 실제 이름은 `exa_search_results_json`이다(위에서 `exa_search.name`으로 확인). 프롬프트에는 `results`의 `s`가 빠진 `exa_search_result_json`으로 적혀 있다.
> - Tavily는 이번엔 `TavilySearch`가 아니라 `TavilyResearch`로 만들었는데, 이 tool의 이름은 `tavily_research`다(아래 강사님 실행 결과의 tool_calls에서 확인된다). 프롬프트의 `tavily_search`와 다르다.
>
> LLM은 바인딩된 스키마의 이름으로 호출하므로 실행은 되지만, 프롬프트가 존재하지 않는 tool 이름을 가리키면 판단이 흔들릴 수 있다. 프롬프트에는 `tool.name`을 f-string으로 넣는 편이 안전하다. 또 개수 인자를 `max_result`로 썼는데 강사님 코드는 `max_results`였다.

```python
tool_model_chain = prompt | tool_model

## tool model chain 은 질문이 들어옴 LLM판단: 직접답변가능 => 응답결과(AI_MESSAGE.content에 답이 들어감)
## but LLM이 TOOL 호출을 판단 => 응답결과는 빈 List => TOOL calls(AI_MESSAGE.tool_calls에 tool 정보가 들어감)
```

### web_agent: tool을 부르고 다시 묻는 루프

수업 중에는 docstring까지만 쓰고 끝났다.

```python
@chain
def web_agent(query:str)->tuple[str,list]:
    """
    Agent의 전체 흐름을 처리하는 Runnable
    사용자 질문을 (query) 받아서 tool_model과 tool을 이용해 최종 응답을 생성해 반한다.
    
    """
```

아래는 강사님 노트북의 완성 코드와 실행 결과다.

```python
tavily_search_name = tavily_search.name
exa_search_name = exa_search.name

@chain
def web_agent(query:str)->tuple[str, list]:
    """
    Agent의 전체 흐름을 처리하는 Runnable .
    사용자 질문을(query) 받아서  tool_model과 tool을 이용해 최종 응답을 생성해서 반한다.
    Args:
        query(str): 사용자 질의

    Returns:
        tuple[str, list]: AI의 최종답변(str)과 tool 메세지들(list)
    """
    # 0. ToolMessage들을 저장할 list
    messages = []
    # 1. tool model에 query를 질의
    ai_message = tool_model_chain.invoke(query) # ai_message.content="" 툴요청
    while ai_message.tool_calls: # 빈 리스트가 아니라면-> tool을 호출 [{}, {},{}]
        for tool_call in ai_message.tool_calls:
            if tool_call["name"] == tavily_search_name: 
                messages.append(tavily_search.invoke(tool_call))
            elif tool_call["name"] == exa_search_name:
                messages.append(exa_search.invoke(tool_call))

        # tool 호출완료 -> tool_model_chain(LLM)을 다시호출=> query, ToolMessage들
        messages = [ai_message] + messages 
        # AIMessage(tool calls정보를가진), ToolMessage(tool처리결과)

        ai_message = tool_model_chain.invoke(
            {"query":query, "tool_messages":messages}
        )
    # AI 최종 응답을 한 경우.(end of while)
    messages.append(ai_message) # 마지막 AI 응답을 포함
    return ai_message.content, messages
```

흐름은 ReAct 그대로다.

| 코드 | ReAct 단계 |
|---|---|
| `tool_model_chain.invoke(query)` | Thought: tool이 필요한지 판단 |
| `for tool_call in ai_message.tool_calls` → `tool.invoke(tool_call)` | Action |
| `messages`에 ToolMessage 누적 | Observation |
| `while ai_message.tool_calls` | 부족하면 다시 Thought, 충분하면 종료 |

`tool_calls`가 빈 리스트가 될 때까지, 즉 LLM이 "이제 답할 수 있다"고 판단할 때까지 돈다. 지난 글들의 RAG 체인은 "검색 → 답변"이 고정이었지만, 여기서는 검색을 할지, 몇 번 할지를 LLM이 정한다.

```python
result1 = web_agent.invoke("안녕하세요. 반갑습니다.")
result1
```

```text
('안녕하세요! 반갑습니다 😊  \n무엇을 도와드릴까요?',
 [AIMessage(content='안녕하세요! 반갑습니다 😊  \n무엇을 도와드릴까요?', ... )])
```

인사는 루프를 한 번도 돌지 않고 바로 끝났다.

```python
result2 = web_agent.invoke("북중미 월드컵 현재까지 결과가 어떻게 되는지 조사해서 알려줘.")
result2[1][0].tool_calls
```

```text
[{'name': 'tavily_research',
  'args': {'input': '2026 FIFA World Cup North/Central America (북중미 월드컵) current results as of 2026-07-07: latest standings, group stage or knockout progress, completed matches, qualified teams, and any available official tournament updates. Provide an up-to-date summary in Korean.',
   'model': 'auto',
   'citation_format': 'numbered',
   'stream': False},
  'id': 'call_CToAAg27TtEU9A0kpVGaXI8G',
  'type': 'tool_call'},
 {'name': 'exa_search_results_json',
  'args': {'query': '2026 FIFA World Cup North Central America current results July 7 2026 standings matches qualified teams official FIFA',
   'num_results': 10,
   ...},
  'id': 'call_QD3jHVUdQUKXVEDovmW4pImk',
  'type': 'tool_call'}]
```

"현재까지"라는 상대적 표현을 프롬프트의 지시대로 `as of 2026-07-07`, `July 7 2026`로 바꿔 검색어에 넣었고, "tool을 모두 사용하라"는 지시대로 두 검색 tool을 동시에 불렀다.

```python
print(result2[0])
```

```text
북중미 월드컵(2026 FIFA 월드컵, 캐나다·멕시코·미국 공동 개최) **현재까지 결과**를 공식 FIFA/CONCACAF 자료 기준으로 정리하면 아래와 같습니다.  
기준 시점은 **2026년 7월 7일**입니다.

## 1) 대회 진행 상황
- 2026 월드컵은 **48개국, 104경기** 체제로 진행 중입니다.
- **조별리그는 종료**되었고, 현재는 **토너먼트(32강/16강 이후)** 단계입니다.
- FIFA 공식 페이지에 따르면 대회는 **6월 11일 개막**, **7월 19일 결승** 예정입니다.

## 2) 북중미권 팀들의 성적
### 개최국 3팀
- **캐나다**: 조별리그를 통과해 **토너먼트 진출**
- **멕시코**: 조별리그 3전 전승으로 **조 1위**, 이후 **16강까지 진출**
- **미국**: 조별리그 통과 후 **16강 진출**
...
## 3) 현재까지 확인된 주요 경기 결과
### 조별리그 주요 결과
- **멕시코 2-0 남아공**
- **한국 2-1 체코**
...
### 토너먼트 주요 결과
- **캐나다 1-0 남아공** → 캐나다 16강 진출
- **미국 2-0 보스니아 헤르체고비나** → 미국 16강 진출
- **멕시코 2-0 에콰도르**
- **멕시코 16강에서 잉글랜드에 패배** → 멕시코 탈락
- **미국도 16강에서 진행/탈락 관련 공식 기사 확인**이 있었지만, 제공된 기사 기준으로는 멕시코 탈락 보도가 더 명확합니다.
...
```

검색 결과를 근거로 정리한 답이 나왔다. "제공된 기사 기준으로는…"처럼 근거가 약한 부분을 스스로 구분한 것도 눈에 띈다. 다만 "멕시코 조별리그 3전 전승"과 "멕시코 2-0 남아공"만으로는 세 경기 결과가 확인되지 않는 등, 검색 요약을 옮기는 과정의 정확성은 따로 검증해야 한다.

> **보충**: 이 루프는 tool을 **한 번만** 부르는 경우에는 잘 동작하지만 두 번 이상 돌면 메시지 순서가 어긋난다. `messages = [ai_message] + messages`가 **새 AIMessage를 리스트 맨 앞**에 붙이기 때문이다. 두 번째 바퀴에서는 `[AI②, AI①, Tool①, Tool②]`처럼 되어 "ToolMessage는 자기 tool_calls를 가진 AIMessage 바로 뒤"라는 규칙이 깨진다. 순서를 지키려면 tool을 부르기 전에 `messages.append(ai_message)`를 먼저 하고 그 뒤에 ToolMessage들을 append하면 된다. 이런 메시지 관리를 대신해 주는 것이 뒤에 나오는 `create_agent`다.

## 사용자 정의 Tool

### @tool

함수에 `@tool` 데코레이터(`langchain_core.tools`)를 붙이면 tool(`StructuredTool`)이 된다.

| tool 정보 | 어디서 오나 |
|---|---|
| name | 함수 이름 |
| parameters | 함수 파라미터 + **type hint** |
| description | **docstring** — LLM이 tool을 잘 고르도록 기능을 최대한 구체적으로 |

```python
from langchain_core.tools import tool
# 사칙연산 툴을 정의

@tool
def plus(num1:int|float, num2:int|float) -> int|float: 
    """
    받은 두개의 수를 덧셈하는 툴
    """
    return num1 + num2 

@tool
def minus(num1:int|float, num2:int|float) -> int|float: 
    """
    받은 두개의 수를 뺄셈하는 툴
    """
    return num1 - num2 

@tool
def multiply(num1:int|float, num2:int|float) -> int|float: 
    """
    받은 두개의 수를 곱셈하는 툴
    """
    return num1 * num2  

# 파라미터에 대한 자세한 설명을 해야 하는 경우 Pydantic.BaseModel로 정의
from pydantic import BaseModel, Field
class DivideToolParameter(BaseModel):
    num1: int|float = Field(..., description="나눌 때 사용할 첫번째 값")
    num2: int|float = Field(..., description="나눌 때 사용할 두번째 값. 0은 사용할 수 없다.")

@tool("divide_tool", args_schema=DivideToolParameter)
def divide(num1:int|float, num2:int|float) -> int|float: 
    """
    받은 두개의 수를 나눗셈하는 툴
    """
    return num1 / num2 


type(plus) # 함수가 아닌 StructuredTool
```

```text
langchain_core.tools.structured.StructuredTool
```

```python
print(plus.name)            # 툴 이름
print(plus.description)     # 툴 설명
print(plus.args)            # 파라미터 설명
```

```text
plus
받은 두개의 수를 덧셈하는 툴
{'num1': {'anyOf': [{'type': 'integer'}, {'type': 'number'}], 'title': 'Num1'}, 'num2': {'anyOf': [{'type': 'integer'}, {'type': 'number'}], 'title': 'Num2'}}
```

`plus`는 type hint만 있어서 파라미터에 `description`이 없다. `divide`처럼 `args_schema`에 Pydantic 모델을 주면 파라미터마다 설명이 붙고, `@tool("divide_tool")`로 이름도 바꿀 수 있다. 강사님 노트북의 `divide` 출력이다.

```text
divide_tool
받은 두개의 수를 나눗셈을 하는 툴
{'num1': {'anyOf': [{'type': 'integer'}, {'type': 'number'}],
  'description': '나눌때 사용할 첫번째 값',
  'title': 'Num1'},
 'num2': {'anyOf': [{'type': 'integer'}, {'type': 'number'}],
  'description': '나눌때 사용할 두번째 값. 0은 사용할 수 없다.',
  'title': 'Num2'}}
```

"0은 사용할 수 없다" 같은 제약은 이렇게 파라미터 설명에 써 두면 LLM이 읽는다.

```python
tool_model = ChatOpenAI(model = "gpt-5.4-mini").bind_tools([plus, minus, multiply, divide])
result = tool_model.invoke("30-20의 결과는 얼마야? 계산할 때 툴이 잇으면 툴을 사용해줘.")
result.tool_calls
```

```text
[{'name': 'minus',
  'args': {'num1': 30, 'num2': 20},
  'id': 'call_CpEhvDKQQjKHztDvClJLzZ8o',
  'type': 'tool_call'}]
```

강사님은 연산이 두 번 필요한 식으로 실행했다.

```python
result = tool_model.invoke("30 - 20 * 10 의 결과는 얼마야? 계산할 때 툴이 있으면 툴을 사용해줘.")
result.tool_calls
```

```text
[{'name': 'multiply',
  'args': {'num1': 20, 'num2': 10},
  'id': 'call_kh4yEcvqjG6TA0qYjN5CCxNh',
  'type': 'tool_call'},
 {'name': 'minus',
  'args': {'num1': 30, 'num2': 200},
  'id': 'call_OtuwUSG1rGvTv8c1WMoMwN3R',
  'type': 'tool_call'}]
```

연산 우선순위대로 곱셈을 먼저 골랐다. 그런데 두 번째 호출의 `num2`가 이미 **200**이다. `multiply` 결과를 받기도 전에 LLM이 직접 20×10을 계산해서 넣은 것이다. tool_calls는 **한 번에 병렬로** 나오기 때문에, 앞 tool의 결과에 의존하는 호출을 같이 내면 LLM이 중간값을 스스로 채워 버린다. 이번엔 맞았지만 큰 수였다면 tool을 쓰는 의미가 없어진다. 의존 관계가 있는 계산은 web_agent처럼 **결과를 받고 다시 묻는 루프**로 한 단계씩 진행해야 한다.

> **보충**: OpenAI 계열 모델은 `bind_tools(..., parallel_tool_calls=False)`로 한 번에 하나의 tool_call만 내도록 제한할 수 있다.

### Runnable을 tool로: `as_tool()`

이미 만든 Runnable도 `Runnable객체.as_tool(name=, description=, args_schema=)`로 tool이 된다. 위키백과 검색 Runnable을 만들어 변환해 본다.

```python
!uv pip install wikipedia
```

```python
# 위키백과사전을 검색해서 내용을 크롤링
from langchain_community.document_loaders import WikipediaLoader
from pydantic import BaseModel, Field 
from langchain_core.runnables import chain
import json

# Runnable 구현
@chain
def wikipedia_search(input: dict) -> str:
    """
    사용자의 쿼리를 검색어로 위키백과서전(wikipedia)를 검색하고 그결과 중 K개의 문서내용을 반환한다.

    Args:
        inputs(dict): key-query, max_result. query(str) 검색할 키워드, max_result(int)검색할 결과 수

    Return:
        str - 검색한 결과들을 json 형식의 문자열로 반환.
              형식: {"result":[{검색된 문서정보들}, {검색된 문서정보블}]}
    """

    query = input['query']
    max_result = input.get("max_result", 3)

    loader = WikipediaLoader(
        query=query, #검색어
        load_max_docs=max_result, #검색할 문서 최대 개수
        lang="ko", # 검색할 wokipedia 나라.
    )

    docs = loader.load() #list[document]
    result_list = []
    for doc in docs:
        result_list.append(
            {
                "content":doc.page_content, # 조회내용
                "title":doc.metadata.get("title"),
                "url":doc.metadata.get("url")
            }
        )
    if result_list:
        result = {"result": result_list}
    else:
        result = {"result":"검색된 문서가 없습니다."}

    # List/Dictionary => str(JSON 형식)
    return json.dumps(result, ensure_ascii=False)
```

tool은 결과를 문자열로 돌려주는 게 기본이라 `json.dumps(..., ensure_ascii=False)`로 JSON 문자열을 만든다. `ensure_ascii=False`가 없으면 한글이 `\uXXXX`로 바뀐다.

아래 셀은 에러가 나는 것이 정상이다. 수업 때 실행한 환경에서 그대로 났던 에러다.

```python
type(wikipedia_search)
r = wikipedia_search.invoke({"query":"비빔밥", "max_result":2})
```

```text
TypeError: WikipediaLoader.__init__() got an unexpected keyword argument 'user_agent'
```

코드에는 `user_agent`라는 인자가 없다. 설치된 `langchain_community`의 `WikipediaLoader`가 내부에서 `wikipedia` 라이브러리 쪽에 `user_agent`를 넘기는데, 설치된 버전이 그 인자를 받지 않아 생기는 **라이브러리 버전 불일치**로 보인다. Python 버전을 의심해서 확인해 봤지만 원인은 아니었다.

```python
import sys
print(sys.version)
```

```text
3.13.13 (main, Apr 14 2026, 14:30:19) [MSC v.1944 64 bit (AMD64)]
```

> **보충**: 이런 에러는 traceback의 마지막 몇 줄에서 어느 파일이 `__init__`을 호출했는지 보면 된다. 호출한 쪽(`langchain_community`)과 받는 쪽(`wikipedia` 또는 그 래퍼)의 버전을 맞추면(`uv pip install -U langchain-community wikipedia`) 대부분 해결된다.

강사님 노트북은 같은 함수를 **재시도 루프**로 감쌌다. 위키백과 응답을 파싱하는 단계에서 간헐적으로 예외가 나기 때문이다.

```python
    cnt = 0
    result_list = []
    while True:
        cnt += 1
        print(f"{cnt}번째 시도")
        try:
            docs = loader.load() # list[Document]
            for doc in docs:
                result_list.append(
                    {
                        "content":doc.page_content, # 조회내용
                        "title": doc.metadata.get("title"),
                        "url": doc.metadata.get("source")
                    }
                )
            break # 정상적으로 종료 되면 break(while문 종료)
        except Exception as e: 
            # loader.load()에서 검색한 결과를 parsing할 때 문제가 발생. 발생여부가 불확실
            if cnt == 4: # 4번째 시도에서도 Exception 발생
                break # load 종료
            continue # 4번째가 아니면 다시 시도
```

> **보충**: 내 코드는 URL을 `doc.metadata.get("url")`로 꺼냈는데, 강사님 코드는 `"source"`다. `WikipediaLoader`의 Document는 URL을 `source` 키에 담기 때문에 `"url"`로 꺼내면 `None`이 된다.

Runnable을 tool로 바꾼다. 입력이 dict이므로 `args_schema`로 키와 설명을 알려 준다. 여기부터 강사님 노트북의 실행 결과다.

```python
# Runnable -> Tool
class WikiSearchParameter(BaseModel):
    query: str = Field(..., description="한국어 Wikipedia에서 조회할 검색 keyword")
    max_result: int|None = Field(default=3, description="검색할 문서의 최대 개수. 생략하면 기본값으로 3을 사용")

wikipedia_search_tool = wikipedia_search.as_tool(
    name="search_wikipedia_korea", # 툴이름
    description="""이 도구는 한국 위키백과사전에서 정보를 검색할 때 사용한다.
사용자의 질문과 관련된 내용을 한국 위키백과사전 사이트에서 지정한 개수의 문서만큼 검색해서 반환한다.
일반적인 지식이나 백과사전식 정보가 필요할 때 사용한다.""",
    args_schema=WikiSearchParameter
)
wikipedia_search_tool.args
```

```text
LangChainBetaWarning: This API is in beta and may change in the future.

{'query': {'description': '한국어 Wikipedia에서 조회할 검색 keyword',
  'title': 'Query',
  'type': 'string'},
 'max_result': {'default': 3,
  'description': '검색할 문서의 최대 개수. 생략하면 기본값으로 3을 사용',
  'title': 'Max Result',
  'type': 'integer'}}
```

`as_tool()`은 아직 beta API라 경고가 뜬다.

```python
tool_model = ChatOpenAI(model="gpt-5.4-mini").bind_tools([wikipedia_search_tool])
res = tool_model.invoke("사마귀의 종류에는 어떤 것이 있는지 조사해서 알려줘.")
res.tool_calls
```

```text
[{'name': 'search_wikipedia_korea',
  'args': {'query': '사마귀 종류', 'max_result': 5},
  'id': 'call_sbH8Dy90UCbo0Ign3VK4ibct',
  'type': 'tool_call'}]
```

"종류를 조사"라는 요청에 맞춰 기본값 3 대신 5개를 요청했다.

```python
wikipedia_search_tool.invoke(res.tool_calls[0])
```

```text
------- {'query': '사마귀 종류', 'max_result': 5}
1번째 시도
ToolMessage(content='{"result": [{"content": "사마귀목은 신시하강에 속하는 곤충 목의 하나이다. 바퀴목, 흰개미와 함께 망시류에 포함된다. ...
```

곤충 사마귀를 찾았다. 피부의 사마귀를 물은 거라면 LLM이 검색어를 더 구체적으로 만들도록 질문이 분명해야 한다.

### Vector Store를 tool로

RAG의 retriever도 tool로 만들 수 있다. 그러면 "검색할지 말지"를 LLM이 정하는 **Agentic RAG**가 된다. 방법은 세 가지다.

| 방법 | 특징 |
|---|---|
| `create_retriever_tool()` | 빠르고 간단. 유연성은 낮음 |
| `@tool`로 직접 구현 | 전/후처리, 파라미터를 직접 제어 |
| `vectorstore.as_tool()` | VectorStore도 Runnable이라 바로 변환 가능 |

`create_retriever_tool`의 주요 파라미터:

| 파라미터 | 의미 |
|---|---|
| `retriever` | `vectorstore.as_retriever()` 등으로 만든 Retriever |
| `name` | Agent가 사용할 tool 이름 |
| `description` | Agent가 언제 이 tool을 써야 하는지 판단하는 설명 |
| `document_prompt` | 검색된 각 문서를 문자열로 만들 PromptTemplate. 변수로 `page_content`와 metadata의 key를 쓸 수 있다 |
| `document_separator` | 여러 문서를 합칠 구분자. 기본값 `\n\n` |
| `response_format` | `"content"`(문자열만) 또는 `"content_and_artifact"`(원본 Document까지) |

#### 레스토랑 메뉴 Vector Store

메뉴 텍스트를 메뉴 단위로 잘라 Document로 만들고 Qdrant에 넣는다. 메뉴 이름, 재료, 가격은 정규식으로 뽑아 metadata에 넣는다.

```python
# Split - 메뉴별로 분리하기 위해 직접 처리
from langchain_core.documents import Document
import re
from pprint import pprint

def create_documents(menu_all: str, file_name) -> list[Document]:
    """메뉴별로 분리 한뒤 Document로 변환. 변환된 Document들을 리스트로 반환
    metadata: 메뉴이름, 주요 재료, 가격, source(파일이름)
    """
    menu_list = menu_all.split("\n\n")
    menu_documents = []
    for menu_item in menu_list:

        # 메뉴 이름 추출
        menu_name_pattern = r"(^\d+.\s)([가-힣a-zA-Z\d ]+)"
        menu_name_result = re.search(menu_name_pattern, menu_item)
        menu_name = menu_name_result.group(2).strip()  # 메뉴 이름 추출 # 1은 번호

        # 주요재료 추출 - text로 indexing.
        menu_ingredient_pattern = r"(?<=주요 재료: ).+"
        ingredients = re.search(menu_ingredient_pattern, menu_item).group().strip()
    
        # 가격추출
        price_pattern = r"(?<=가격: )[\d,]+(?=원)"
        price_result = re.search(price_pattern, menu_item)
        price = int(price_result.group().replace(",", ""))

        
        # 메뉴 이름을 제외한 나머지는 메뉴 설명으로 간주
        menu_doc = Document(
            page_content=menu_item,     # 메뉴 설명을 page_content에 넣는다. metadata는 나중에 따로 따로 payload filtering 할 수있기 때문에 
            metadata={
                "menu_name": menu_name, # 메뉴 이름
                "price": price,         # 가격
                "ingredients": ingredients, # 재료 리스트
                "source": file_name     # 메뉴가 저장된 파일 이름
            }
        )
        menu_documents.append(menu_doc)
    return menu_documents


menu_documents = create_documents(menu, menu_file_path)
print(len(menu_documents))
```

| 정규식 | 뜻 |
|---|---|
| `(^\d+.\s)([가-힣a-zA-Z\d ]+)` | (번호. )(메뉴이름) — 2번 그룹이 메뉴 이름 |
| `(?<=주요 재료: ).+` | 긍정 후방탐색: "주요 재료: " 뒤만 가져옴 |
| `(?<=가격: )[\d,]+(?=원)` | "가격: "과 "원" 사이의 숫자와 쉼표 |

여기부터 메뉴 관련 출력은 강사님 노트북의 실행 결과다.

```text
15

1. 라따뚜이
   - 가격: 17,000원
   - 주요 재료: 가지, 호박, 파프리카, 토마토 소스, 올리브 오일
   - 메뉴 설명: 프랑스 남부를 대표하는 전통 요리로, ...

{'menu_name': '라따뚜이',
 'price': 17000,
 'ingredients': '가지, 호박, 파프리카, 토마토 소스, 올리브 오일',
 'source': 'data/restaurant_menu.txt'}
```

Qdrant 컬렉션을 만들고 저장한 뒤, `k`와 `search_type`을 실행 시점에 바꿀 수 있도록 `configurable_fields`를 건 retriever를 만든다(Qdrant 연결 코드는 [Qdrant 글](/notes/llm/llm-qdrant)과 같다).

```python
ids = vectorstore.add_documents(menu_documents)
print(f"저장된 문서 개수: {len(ids)}")

menu_retriever = vectorstore.as_retriever(
    search_kwargs={"k": 3}  # 검색할 결과 개수
)

from langchain_core.runnables import ConfigurableField
retriever = menu_retriever.configurable_fields(
    search_type=ConfigurableField(
        id="search_type"
    ),
    search_kwargs=ConfigurableField(
        id="search_kwargs"
    ),
)
```

```text
저장된 문서 개수: 15
```

```python
result = retriever.invoke("이탈리아 음식을 추천해줘.")
for doc in result:
    print(doc.metadata)
```

```text
{'menu_name': '티라미수', 'price': 10000, 'ingredients': '마스카르포네 치즈, 에스프레소, 코코아 파우더, 사보이아르디', ...}
{'menu_name': '밀라노풍 송아지 커틀렛', 'price': 30000, 'ingredients': '송아지 고기, 빵가루, 파르미지아노 치즈, 루꼴라 샐러드', ...}
{'menu_name': '바질 페스토 뇨끼', 'price': 19000, 'ingredients': '감자 뇨끼, 바질 페스토, 파르미지아노 치즈', ...}
```

#### create_retriever_tool

```python
## create_retriever_tool()을 이용해서 Retriever -> Tool
from langchain_core.tools import create_retriever_tool
from langchain_core.prompts import PromptTemplate

# 검색 결과 문자열을 Document의 page_content와 metadata들을 이용해 내가 원하는 포맷으로 만들려고 할때
## 그 템플릿을 PromptTemplate으로 작성.
## input_variable에 page_content를 넣을 곳은 {page_content}, metadata를 넣을 곳은 {metadata_key}
## 로 설정
return_doc_format = PromptTemplate(
    template="""메뉴이름: {menu_name}
음식재료: {ingredients}
메뉴내용: 
{page_content}"""
)

menu_retriever_tool = create_retriever_tool(
    retriever=retriever, # Tool로 생성할 Retriever, 
    description="이 도구는 VectorStore에 저장된 restaurant menu를 검색하는 tool입니다. \
음식 메뉴에 대한 정보가 필요할 때 사용합니다.", # Tool Description
    name="menu_retriever_tool", # TOOL 이름
    document_prompt=return_doc_format
)
menu_retriever_tool.args
```

```text
{'query': {'description': 'query to look up in retriever',
  'title': 'Query',
  'type': 'string'}}
```

```python
res = menu_retriever_tool.invoke("이탈리아 음식을 추천해줘.") # 찾은 문서의 내용(page_content)을 문자열(str)로 반환
print(res)
```

```text
메뉴이름: 티라미수
음식재료: 마스카르포네 치즈, 에스프레소, 코코아 파우더, 사보이아르디
메뉴내용: 
13. 티라미수
    - 가격: 10,000원
    - 주요 재료: 마스카르포네 치즈, 에스프레소, 코코아 파우더, 사보이아르디
    - 메뉴 설명: 이탈리아를 대표하는 디저트로, ...


메뉴이름: 밀라노풍 송아지 커틀렛
...
```

`document_prompt`대로 문서마다 "메뉴이름 / 음식재료 / 메뉴내용" 형식으로 만들어 `\n\n`로 이어 붙였다.

```python
tool_model = ChatOpenAI(model="gpt-5.4-mini").bind_tools([menu_retriever_tool])
res = tool_model.invoke("토마토를 재료로하는 요리를 추천해줘.")
res.tool_calls
```

```text
[{'name': 'menu_retriever_tool',
  'args': {'query': '토마토를 재료로 하는 요리 추천 메뉴'},
  ...}]
```

검색 결과 1위는 토마토 소스가 들어간 라따뚜이였다.

#### @tool로 직접 구현

`create_retriever_tool`의 스키마는 `query` 하나뿐이다. 검색 개수까지 LLM이 정하게 하려면 직접 만든다.

```python
#### @tool을 이용해서 정의
from pydantic import BaseModel, Field
class SearchMenuToolParameter(BaseModel):
    query:str = Field(..., description="의미기반 검색으로 메뉴를 찾을 query")
    top_k:int = Field(default=3, description="Vector DB에서 조회할 문서 개수. 기본값 3")

@tool(args_schema=SearchMenuToolParameter)
def search_menu_tool(query:str, top_k:int|None=3) -> str:
    """이 도구는 VectorStore에 저장된 restaurant menu를 검색하는 tool입니다. 음식 메뉴에 대한 정보가 필요할 때 사용합니다."""
    result_list = [] # 결과 문서들을 담을 list
    config = {
        "configurable": {
            "search_kwargs": {
                "k": top_k
            }
        }
    }
    docs = retriever.invoke(query, config=config)   
    for doc in docs:
        result_list.append(
            {
                "content":doc.page_content,
                "title":doc.metadata['menu_name'],
                "url": doc.metadata['source']
            }
        )
    if result_list:
        result = {"result": result_list}
    else:
        result = {"result": "검색된 메뉴가 없습니다."}
    
    return json.dumps(result, ensure_ascii=False) # JSON 문자열로 반환.
```

앞에서 걸어 둔 `configurable_fields`가 여기서 쓰인다. LLM이 정한 `top_k`를 `config`로 넘겨 검색 개수를 바꾼다.

```python
tool_model = ChatOpenAI(model="gpt-5.4-mini").bind_tools(tools=[search_menu_tool])
res = tool_model.invoke("식당 메뉴중에 면요리를 추천해줘.")
res.tool_calls
```

```text
[{'name': 'search_menu_tool',
  'args': {'query': '면요리 추천 메뉴 파스타 라면 냉면 우동 국수', 'top_k': 5},
  ...}]
```

```python
res = search_menu_tool.invoke(res.tool_calls[0])
```

검색 결과의 `title`만 추리면 이렇다.

```text
트러플 피자, 라따뚜이, 레몬 타르트, 니스 샐러드, 프렌치 어니언 수프
```

메뉴판에 면요리가 **없어서**, 벡터 검색은 그나마 가까운 것을 5개 가져왔을 뿐이다. 벡터 검색은 "없다"고 말하지 않고 항상 k개를 돌려준다. 결과가 정말 관련 있는지는 LLM이 판단해야 하고, 그 판단을 시키는 게 다음의 system prompt다.

## create_agent()로 Agent 만들기

web_agent에서 직접 짠 "LLM 호출 → tool 실행 → 결과 넣고 다시 호출" 루프를 표준화한 것이 `create_agent()`다. LangChain 1.0에서 도입됐다.

![create_agent 기본 구조](/images/llm/fig-langgraph-basic-flow.png)

0.x 버전까지는 (1) model과 tool로 Agent를 만들고 (2) 그것을 실행할 Executor를 따로 만들어야 했다. `create_agent()`는 이를 한 단계로 줄였고, **middleware**로 Agent 실행 전후, 모델 호출 전후 같은 지점에 동작을 끼워 넣을 수 있다.

설계 철학은 세 줄이다.

1. Agent를 구성하는 모든 실행 단위는 Runnable이다.
2. Agent도 Runnable이다.
3. Agent는 하나의 표준 팩토리 함수로 만든다.

| 파라미터 | 의미 |
|---|---|
| `model` | 모델 이름 문자열 또는 `ChatOpenAI` 같은 BaseChatModel 객체 |
| `tools` | Agent가 쓸 tool 리스트 |
| `system_prompt` | 행동 지침. 문자열 또는 `SystemMessage` |
| `middleware` | 실행 흐름의 hook에 끼울 중간 처리기 목록 |
| `response_format` | 최종 출력을 구조화할 schema |
| `checkpointer` | 단기 메모리(실행 상태) 저장소 |
| `store` | 장기 메모리 저장소 |

`checkpointer`와 `store`는 다음 글들에서 다룬다.

수업 노트북에서 이 부분은 설명만 있고 코드 셀이 비어 있다. 아래는 강사님 노트북의 코드와 실행 결과다. 앞에서 만든 위키백과 tool과 메뉴 검색 tool을 `tools.py`로 옮겨 import했다.

```python
system_prompt  = """
당신은 레스토랑 메뉴 정보와 일반적인 음식 관련 지식을 제공하는 AI 어시스턴트입니다. 
주요 목표는 사용자의 요청에 대한 정확한 정보를 제공하고 메뉴를 추천하는 것입니다.

주요 지침들(guidelines):
1. 레스토랑의 메뉴관련 정보를 확인하려면 search_menu_tool 도구를 사용하십시오. 이 도구는 레스토랑의 메뉴들의 가격, 음식의 특징들에 대한 정보를 제공합니다.
2. 사용자 요청한 음식에 menu에 없을 경우에는 tavily_search 도구를 이용해서 음식을 검색해서 추천합니다. 
3. 음식과 관련없는 요청 중에 최신정보가 필요한 경우에도 tavily_search 도구를 사용해서 정보를 검색해서 제공합니다.
4. 일반적인 음식 정보, 음식의 유래, 문화적 배경에 대한 정보는 search_wikipedia_korea 도구를 사용하십시오. 이 도구는 한국 wikipedia 에서 정보를 검색해서 제공합니다.
5. 검색 결과를 기반으로 명확하고 간결한 답변을 제공하십시오.
6. 요청 받은 질문이 모호하거나 필요한 정보가 부족한 경우 정중하게 설명을 요청하세요.
7. 메뉴 정보를 제공할 때는 가격, 주재료, 특징 순으로 설명하세요.
8. 메뉴를 추천 할 때는 간단하게 추천 이유를 설명해주세요.
9. 최종 응답은 챗봇과 같은 대화형 스타일을 유지하세요. 친근하고 매력적이며 자연스럽게 소통하되 전문성을 보이는 어조를 유지하세요.

- 각 도구의 목적과 기능을 정확하게 이해하고 각 적절한 상황에서 사용하세요.
- 각 도구들을 결합해서 사용자의 요청에 정확한 대답을 하세요.
- 항상 가장 최신의 정확한 정보를 제공하기 위해 노력하세요.
"""
```

system prompt가 **tool 사용 설명서** 역할을 한다. 어떤 상황에 어떤 tool을 쓸지(1~4), 답변 형식(5~9)을 정했다.

```python
from langchain.agents import create_agent
from langchain_tavily import TavilySearch
from tools import wikipedia_search_tool, search_menu_tool
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

# 툴들 정의
tavily_search = TavilySearch(max_results=5)
tools = [wikipedia_search_tool, search_menu_tool, tavily_search]

# 모델 정의
model = ChatOpenAI(model="gpt-5.4-mini")

# Agent 생성
agent = create_agent(
    model=model,
    tools=tools, # 모델에 binding할 tools들 
    system_prompt=system_prompt
)
```

`bind_tools`도, while 루프도, 메시지 순서 관리도 없다. Agent의 입력과 출력은 `{"messages": [...]}` 형태다.

```python
# key: "messages", value: List[BaseMessage] 
#                         BaseMessage->AIMessage, HumanMessage, ToolMessage, SystemMessage
res = agent.invoke(
    {
        "messages": [
            ("human", "파스타 메뉴를 추천해줘. 그리고 파스타의 유래에 대해서 설명해줘.")
        ]
    }
)
```

```text
------- {'query': '파스타', 'max_result': 3}
1번째 시도
```

`res["messages"]`에는 HumanMessage → AIMessage(tool_calls) → ToolMessage(메뉴 검색 결과) → … → 최종 AIMessage가 순서대로 쌓여 있다. 최종 답만 보면:

```python
print(res['messages'][-1].content)
```

```text
물론이죠! 파스타 메뉴와 함께 파스타의 유래도 간단히 설명해드릴게요.

### 추천 파스타 메뉴
현재 확인된 메뉴에는 **파스타 자체 메뉴는 보이지 않아서**, 파스타와 비슷한 분위기로 즐기기 좋은 메뉴를 추천드리면:

1. **트러플 피자**  
   - **가격:** 26,000원  
   - **주재료:** 트러플 오일, 모짜렐라 치즈, 얇은 피자 도우, 루꼴라  
   - **특징:** 고소한 치즈와 향이 진한 트러플 오일, 신선한 루꼴라가 어우러진 고급스러운 메뉴예요. ...

2. **프로방스 치킨**  
   - **가격:** 22,000원  
   ...

3. **토마토 브루스케타**  
   - **가격:** 12,000원  
   ...

### 파스타의 유래
파스타는 **이탈리아의 밀 식품**으로, 주로 **듀럼밀 세몰라**나 밀가루에 물·달걀을 섞어 반죽한 뒤 삶거나 구워 먹는 음식입니다.  
기원은 아주 오래되었는데, **고대 그리스·로마 시대의 반죽 음식**, **중동·아라비아권의 면류**, **시칠리아를 통한 전파** 등 여러 역사적 흐름이 얽혀 있어요.  

즉, 파스타는 "한 번에 딱 누가 발명했다"기보다, **지중해 여러 지역의 면 요리 전통이 이탈리아에서 발전한 음식**으로 보는 게 맞습니다.  
또한 **마르코 폴로가 중국에서 파스타를 가져왔다**는 이야기는 널리 알려졌지만, 현재는 **정설로 보지 않습니다**.
...
```

질문 하나가 두 갈래로 나뉘어 처리됐다. 메뉴 추천은 `search_menu_tool`(지침 1), 유래는 `search_wikipedia_korea`(지침 4, 위 로그의 `{'query': '파스타', ...}`)를 썼다. 앞에서 면요리 검색이 엉뚱한 메뉴를 돌려줬던 것과 달리, 이번엔 LLM이 검색 결과를 보고 **"파스타 자체 메뉴는 보이지 않아서"** 라고 먼저 밝힌 뒤 대안을 추천했다. 벡터 검색의 "항상 k개"라는 한계를 LLM의 판단이 보완한 모습이다.

> **보충**: 지침 2("메뉴에 없을 경우 tavily_search로 검색해서 추천")는 이번 실행에서 지켜지지 않았다. 메뉴에 없다는 걸 알았는데도 웹 검색 대신 메뉴 안의 대안을 골랐다. 같은 질문도 실행할 때마다 tool 선택이 달라질 수 있고, system prompt의 지시는 **강제가 아니라 권고**라는 점을 보여 준다.

## LangChain에서 MCP 연동

### MCP란

**MCP**(Model Context Protocol)는 Anthropic이 2024년 말 발표한 개방형 표준으로, LLM 애플리케이션이 외부 데이터와 도구에 접근하는 방식을 표준화한다. tool을 만드는 방법이 프레임워크마다 달라서 서로 호환되지 않는 문제를 풀기 위해 나왔다. 글 처음의 메모 "MCP => 툴을 만드는 방법을 표준화"가 이 뜻이다.

| 구성 요소 | 역할 |
|---|---|
| **MCP 호스트** | AI 애플리케이션(예: LLM 채팅 앱). 클라이언트를 통해 여러 서버에 연결 |
| **MCP 클라이언트** | 서버와의 연결을 유지하고 서버의 도구/리소스/프롬프트를 LLM에 전달 |
| **MCP 서버** | 외부 데이터나 tool을 제공하는 프로그램. JSON-RPC 2.0으로 통신 |

MCP 서버가 제공하는 것은 세 가지다.

- **Tools**: LLM이 호출할 수 있는 함수 (예: queryDatabase, sendEmail)
- **Resources**: 읽기 전용 데이터 소스 (검색 색인, 파일 시스템, DB)
- **Prompts**: 서버가 제공하는 프롬프트 템플릿

전송 방식은 로컬 프로세스 간 통신용 **STDIO**와 원격 서버용 **Streamable HTTP** 두 가지다. 공개된 서버는 [PulseMCP](https://pulsemcp.com), [MCP 마켓](https://mcpmarket.com/ko), [MCP Servers](https://mcp.so/), [smithery](https://smithery.ai/servers)에서 찾을 수 있다.

### MultiServerMCPClient

LangChain에서는 `langchain-mcp-adapters`의 `MultiServerMCPClient`로 여러 MCP 서버를 한 번에 연결하고, `get_tools()`로 서버의 tool들을 **LangChain Tool 객체로 변환**한다. npx로 실행하는 서버가 많아서 Node.js가 필요하다.

```bash
pip install langchain-mcp-adapters
```

| 설정 key | 의미 | 예 |
|---|---|---|
| `transport` | 통신 방식 | `"stdio"`, `"streamable-http"` |
| `command` | 서버를 실행할 프로그램 | `"python"`, `"npx"` |
| `args` | command에 넘길 인자 리스트 | `["-m", "mcp_server_time"]` |
| `env` | 서버 실행 시 환경변수 (API Key 등) | `{"FIRECRAWL_API_KEY": ...}` |

수업 노트북에서 MCP 코드 셀은 비어 있다. 강사님은 비동기 코드를 `.py` 파일로 써서 터미널에서 실행했다. 시간, 파일 시스템, 브라우저(playwright) 서버 세 개를 연결한 대화형 Agent다.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from dotenv import load_dotenv
import os
import asyncio

load_dotenv()

async def main():
    # MultiServerMCPClient 객체 생성 -> MCP 서버와 연결 + mcp 툴들을 langchain tool로 변환.
    # 연결할 MCP 서버들 설정. dict[str:서버이름, dict]
    client = MultiServerMCPClient(
        {
            "time" : {
                "transport":"stdio",
                "command":"python",
                "args":["-m", "mcp_server_time"]
            },
            "filesystem": {
                "transport":"stdio",
                "command": "npx",
                "args": [
                    "-y",
                    "@modelcontextprotocol/server-filesystem",
                    os.getcwd()  # sever-filesystem이 사용할 수 있는 디렉토리.
                ]
            },
            "playwright": {
                "transport":"stdio",
                "command": "npx",
                "args": [
                    "@playwright/mcp@latest"
                ]
            }
        }
    )
    # Langchain Tool List로 변환
    tools = await client.get_tools()
    print("툴 개수:", len(tools))

    # Agent 생성
    agent = create_agent(
        model=ChatOpenAI(model="gpt-5.4-mini"),
        tools=tools,
        system_prompt="당신은 유능한 AI Assistant입니다. 필요한 경우 등록된 도구들을 이용해서 답변하세요"
    )
    print(">>>>>>>>> 종료하려면 !quit 를 입력하세요.<<<<<<<<")
    while True:
        query = input(">>>질문:")
        if query == '!quit':
            print(">>>종료<<<")
            break

        res = await agent.ainvoke({
            "messages":[
                ("human", query)
            ]
        })
        print("<<<답변:")
        print(res['messages'][-1].content)
        print("---------------------------------------")

if __name__ == "__main__":
    asyncio.run(main())
```

포인트는 세 가지다.

- MCP 클라이언트는 비동기라 `await client.get_tools()`, `await agent.ainvoke()`를 쓴다. 주피터에서 돌리려면 `nest_asyncio.apply()`가 필요하다.
- `server-filesystem`의 마지막 인자는 **이 서버가 접근할 수 있는 디렉터리**다. Agent가 손댈 수 있는 범위를 여기서 제한한다.
- `get_tools()`로 받은 tool은 우리가 `@tool`로 만든 것과 같은 LangChain tool이라 `create_agent`에 그대로 넣는다. tool을 직접 구현하지 않고 남이 만든 서버를 연결만 하면 된다는 게 MCP의 장점이다.

## 정리

| 구현 방식 | 무엇을 하나 | 언제 쓰나 |
|---|---|---|
| `bind_tools` + `tool_calls` | LLM이 호출 정보만 생성, 실행은 내 코드 | 흐름을 이해하거나 세밀하게 제어할 때 |
| 직접 짠 루프 (web_agent) | tool 결과를 넣고 다시 호출 반복 | 학습용. 메시지 순서를 직접 관리해야 함 |
| `create_agent()` | 위 루프를 표준화 + middleware | 실제로 Agent를 만들 때 |

| tool 만드는 법 | 특징 |
|---|---|
| Built-in tool | Tavily, Exa처럼 이미 구현된 것. 객체만 생성 |
| `@tool` | 함수 + type hint + docstring. 세부 설명은 `args_schema` |
| `as_tool()` | 이미 만든 Runnable을 tool로 (beta) |
| `create_retriever_tool()` | retriever를 tool로. 빠르지만 파라미터는 query 하나 |
| MCP | 남이 만든 서버의 tool을 연결해 LangChain tool로 변환 |

- **LLM은 tool을 실행하지 않는다.** 어떤 tool에 어떤 값을 넣을지만 `tool_calls`로 알려 주고, 실행은 코드가 한다.
- LLM이 tool을 고르는 근거는 **이름, 설명, 파라미터 스키마**뿐이다. docstring과 `Field(description=)`을 잘 써야 한다.
- `ToolMessage`는 자신을 요청한 `AIMessage` 바로 뒤에 와야 한다.
- 병렬 tool_calls는 서로 결과를 기다리지 않는다. 의존 관계가 있으면 LLM이 중간값을 직접 채울 수 있다(`30 - 200`).
- 벡터 검색 tool은 관련 없는 결과도 k개를 돌려준다. "없다"는 판단은 LLM과 system prompt의 몫이다.

다음 글에서는 `create_agent`의 내부 구조이기도 한 **LangGraph**로 Agent의 흐름을 그래프로 직접 설계한다.
