---
title: "LangGraph 기초: State, Node, Edge로 Agent 그리기"
description: "LCEL의 선형 흐름을 넘어 분기와 반복을 다루는 LangGraph의 핵심 개념(State, Node, Edge, Reducer)을 정리하고, 정보 저장 예제로 StateGraph의 실행과 stream 모드를 확인한 뒤, 조건부 엣지로 tool을 부르고 돌아오는 챗봇 Agent를 직접 만들며 Command와 Send까지 살펴봅니다."
category: 'Tech'
subcategory: 'LLM'
series: 'Agent·LangGraph'
seriesOrder: 2
originalNotebook: "12_Agent_langgraph_1.ipynb"
tags: ["LLM","Agent"]
date: 2026-07-07T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-langgraph-basics.webp'
---

> SKN31 AI Agent 과정 노트북 `12_Agent_langgraph_1.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과입니다. stream 모드 비교와 Command·Send 예제는 수업 노트북에 실행 결과가 없어 LLM 없이 돌아가는 부분만 **직접 실행**(langgraph 1.2.14)해 붙였고, 챗봇 그래프 일부는 **강사님 노트북의 실행 결과**로 보완했습니다. 각각 해당 위치에 표시했습니다.

## 이 글에서 다루는 것

- LangGraph란: LangChain(LCEL)과 무엇이 다른가
- 핵심 구성: State, Node, Edge, StateGraph
- 상태 관리: 덮어쓰기와 Reducer(`add_messages`)
- 첫 그래프: 노드 4개를 일렬로 연결하고 `invoke`, `stream`
- 조건부 엣지로 tool을 부르는 챗봇 Agent 만들기
- 노드에 무엇을 넘길까: `messages[-1]`의 함정
- Command와 Send

지난 글에서 Agent의 핵심은 "tool이 필요하면 부르고, 결과를 넣어 다시 묻는" **반복**이었다. 그 반복을 `while` 루프로 직접 짰고, `create_agent()`가 그걸 대신해 줬다. 이번 글은 그 `create_agent()`의 바탕인 **LangGraph**로 흐름을 직접 그린다.

## LangGraph란

**LangGraph는 그래프 구조로 워크플로우와 에이전트를 만드는 런타임 프레임워크**다. 가장 큰 특징은 **사이클(순환)** 을 지원한다는 것이다. 검색 결과가 부족하면 다시 검색하고, 답변 품질이 낮으면 다시 생성하는 식의 흐름을 만들 수 있다.

```python
# 비선형적 => 반복문 or 조건문

# LCEL 식은 선형적이기 때문에 일직선으로 밖에 워크플로우를 만들지 못함

# 랭그래프는 state(공유저장소-모든 NODE(TOOL)들이 공유)를 활용해서 비선형적으로 활용함 (ex.상태유지 or 장기실행 등)

# State (저장되는 것들 예시)

# ✅ 사용자 질문
# ✅ LLM이 추출한 정보
# ✅ Tool 실행 결과
# ✅ 검색 결과
# ✅ 반복 횟수
# ✅ 최종 답변
# ✅ 이전 대화 정보
```

> **그래프**: 데이터를 **노드**(Node)와 노드 사이의 관계인 **엣지**(Edge)로 표현하는 자료구조다. LangGraph에서는 **노드가 작업을 수행하고, 엣지가 작업의 흐름**을 정한다.
>
> **런타임 프레임워크**: 프로그램이 실행되는 동안 필요한 공통 기능(상태 저장, 재개 등)을 대신 처리해 주는 프레임워크다.

```python
# 그래프연산식 (node-edge-node) (:Person - :LIVE_IN -> :Seoul)
# 그래프DB
```

같은 "그래프"라는 말을 쓰지만, 뒤에 나올 GraphRAG의 그래프 DB(Neo4j)는 **데이터**를 노드와 관계로 저장하는 것이고, LangGraph의 그래프는 **실행 흐름**을 노드와 엣지로 그린 것이다.

### 핵심 개념

| 개념 | 내용 |
|---|---|
| 그래프 기반 실행 | 실행 흐름을 노드와 엣지로 표현해 분기·병렬·반복을 자연스럽게 다룸 |
| 상태 유지 (stateful) | 런타임이 상태를 관리. 중단/재개해도 유지 |
| 장기 실행 (durable) | 서버 재시작, 장시간 실행에도 워크플로우를 이어감 |
| 멀티 에이전트 | 여러 에이전트가 협력하는 구조 지원 |

### LangChain과의 관계

LangGraph는 LangChain의 구성 요소(모델 호출, 도구 등)를 **low level에서 제어**할 수 있게 확장한 프레임워크다. 모델 호출과 도구 실행의 순서, 조건 분기를 개발자가 직접 구성한다. 반대로 LangChain 에이전트를 LangGraph의 노드 하나로 넣을 수도 있는 상호 보완 관계다.

| 비교 | LangChain | LangGraph |
|---|---|---|
| 실행 흐름 | 선형/순차 중심 | 그래프 기반 (분기·루프·상태 흐름) |
| 상태 관리 | 기본 메모리/세션 중심 | 지속 상태(durable), 런타임 저장·복원 |
| 추상화 수준 | LCEL 고수준 API | 저수준 실행 제어 |
| 적합한 용도 | 간단한 에이전트 & 워크플로우 | 복잡한 흐름의 멀티 에이전트, 상태 기반 시스템 |

## 기본 구조

### Node와 Edge

**노드**는 그래프의 처리 단위로, 실제 작업을 하는 Python 함수다. 현재 상태를 입력받아 작업하고 업데이트할 값을 반환한다.

```python
# 노드는 python 함수로 특정 로직 담당
# 특수 노드 START(필수), END => 상수로 사용
```

특수 노드 `START`(시작점)와 `END`(종료점)는 `langgraph.graph`의 상수다. 일반 노드와 달리 실행 함수가 없고, State를 처리하지 않고, `add_node()`로 등록하지 않는다.

**엣지**는 노드 사이의 연결로, 다음에 어떤 노드를 실행할지 정한다. 조건부 엣지를 쓰면 분기와 반복이 가능해진다.

### State

**State는 그래프가 실행되는 동안 유지되는 값들의 저장소**다. 모든 노드가 State를 조회하고, 각 노드는 작업 결과를 State에 업데이트한다. 실행 중에는 dict로 관리되며, 어떤 key를 둘지는 **State Schema**로 먼저 정의한다.

- Schema는 `TypedDict` 또는 `pydantic.BaseModel`을 상속한 클래스로 정의한다.
- Schema에 정의된 key만 State에 저장된다.

State의 역할은 세 가지다.

| 역할 | 내용 |
|---|---|
| 컨텍스트 유지 | 여러 단계에 필요한 정보를 한 곳(dict)에서 관리 |
| 노드 간 정보 공유 | 한 노드의 결과를 다른 노드가 읽어서 사용 |
| 진행 상황 추적 | 완료된 작업, 다음 노드, 사용자 승인(HITL) 여부 등을 기록해 분기에 활용 |

### StateGraph

`StateGraph`는 State Schema를 받아 그래프를 정의하는 핵심 클래스다. 각 노드가 반환한 dict는 StateGraph의 규칙에 따라 기존 State와 **병합**되어 다음 노드로 넘어간다.

### 상태 관리: 덮어쓰기와 Reducer

| 방식 | 동작 | 언제 |
|---|---|---|
| **완전 재정의** (기본) | 같은 key에 새 값이 오면 **덮어씀** | 이름, 점수, 최종 답변처럼 최신 값 하나만 필요할 때 |
| **업데이트** (Reducer) | 기존 값과 새 값을 **합치는 함수**로 병합 | 대화 메시지처럼 계속 쌓아야 할 때 |

Reducer는 `Annotated[타입, reducer함수]`로 지정한다. 채팅 메시지 누적에는 `add_messages`를 쓴다.

## 첫 그래프 만들기

```bash
pip install langgraph
```

구현 순서는 **State 설계 → Node 함수 → StateGraph에 노드와 엣지 등록 → compile → invoke/stream**이다.

```python
from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict
```

### 1. State Schema

```python
# 1.state schema 설계 -> state에 어떤 값들(Field) 저장할 수 있는지 설계

class State(TypedDict): # State를 만드는 것이 아님. 설계하는 것.
    save_path: str # key - value의 타입
    name: str
    age: int
    address: str
    result: str
```

### 2. Node 함수

```python
# node함수의 return값은 state에 저장될 거
```

```python
# 2.Node 구현 (Node가 호출할 함수)
# 함수로 구현: 파라미터 state(dict)를 만드는 것이 아님. 설계하는 것
# 반환값(return):dict - {key:value}: State에 저장할 Field
def add_name(state:State):
    print("--------add_name 노드 실행---------", type(state))
    print("add_name에서 state값:", state)
    # return {"name":"이순신"} #state에 "name-이순신"이 추가
    return {"name":"이순신", "name2":"유관순", "name3":"강감찬"} 
    # name (스키마에 있는 key(필드이름), name2, name3은 스키마에 없는 key)

def add_age(state:State):
    print("------add_age 노드 실행 -----------")
    print("add_age에서 state값", state)
    return {"age":30}

def add_address(state:State):
    print("------add_address 노드 실행 -----------")
    print("add_address에서 state값", state)
    return {"address":"서울시 금천구 독산동"}

def save_info(state:State):
    """add_xxxx 노드들이 만든 값들을 save_path에 저장"""
    # state에서 필요한 정보들을 조회
    print(state)
    try:
        save_path = state['save_path']
        name = state['name']
        age = state['age']
        address = state['address']
        print(f"{save_path}에 {name}, {age}, {address}를 저장합니다.")
        # State에 추가할 값이 없으면 return None
    except: 
        return {"result":"Fail"} #result schema 추가
```

`add_name`은 일부러 Schema에 없는 key(`name2`, `name3`)도 반환한다. `save_info`는 추가할 값이 없으면 `None`을 반환하고, 필요한 값이 없으면 `result`에 "Fail"을 남긴다.

### 3. StateGraph 구성과 compile

```python
# 3. StateGraph 생성 => StateGraph에 Node와 Edge를 정의
# graph
workflow = StateGraph(State) # 설계도 Steate schema를 넣고 생성

# 3-1 node 설정 (함수, 등 node를 정의해줌)
# Node 추가 - 노드이름-함수
workflow.add_node("add_name", add_name)
workflow.add_node("add_age", add_age)
workflow.add_node("add_address", add_address)
workflow.add_node("save_info", save_info)

# 3-1 Edge 설정 - Node와 Node의 흐름
# START -> add_name -> add_age -> add_address -> END
workflow.add_edge(START, "add_name") # START=상수, 출발지노드에서 다음 노드로 지정
workflow.add_edge("add_name", "add_age")
workflow.add_edge("add_age", "add_address")
workflow.add_edge("add_address", "save_info")
workflow.add_edge("save_info", END)

# StateGraph컴파일 => 그래프 구성을 검증하고 최적화 => 실행가능한 상태로 만드는 작업
graph = workflow.compile()
```

```python
?graph
```

```text
Type:            CompiledStateGraph
...
Class docstring:
Pregel manages the runtime behavior for LangGraph applications.
...
Each step consists of three phases:

- **Plan**: Determine which **actors** to execute in this step. ...
- **Execution**: Execute all selected **actors** in parallel, ...
- **Update**: Update the channels with the values written by the **actors** in this step.
```

컴파일된 그래프의 실체는 `Pregel`이다. 매 스텝마다 실행할 노드를 고르고(Plan), 실행하고(Execution), 결과로 State를 갱신한다(Update). 같은 스텝에 고른 노드들은 **병렬로** 실행되고, 그 스텝의 업데이트는 다음 스텝에서야 보인다. 뒤에 나오는 Send의 병렬 처리가 이 구조 덕분이다.

```python
# Graph에 구조를 시각화
from IPython.display import Image, display

display(
    Image(
        graph.get_graph().draw_mermaid_png()
        ))
```

![일렬 그래프](/images/llm/fig-langgraph-linear.png)

### 4. 실행: invoke

```python
# 호출 => state에서 저장/일부는 노드에서 처리해도 state저장
# res = graph.invoke({}) # State에 저장할 값을 dict으로 전달


#res = graph.invoke({}) #원래 랭체인에서는 첫번째 러너블에 줄 값을 넣었음/ 여긴 state에 넣을 값 - 스키마설계 등
# state - dict 형태로 있음 
# state에선 왔다갔다(조회)하면서 각 node들의 return값이 end까지 쌓임

res = graph.invoke({"save_path":r"c:\src"}) #save_path 값

# 스키마에 설계가 안되어져있는 유관순, 강감찬은 key값으로 들어가지 않음
```

```text
--------add_name 노드 실행--------- <class 'dict'>
add_name에서 state값: {'save_path': 'c:\\src'}
------add_age 노드 실행 -----------
add_age에서 state값 {'save_path': 'c:\\src', 'name': '이순신'}
------add_address 노드 실행 -----------
add_address에서 state값 {'save_path': 'c:\\src', 'name': '이순신', 'age': 30}
{'save_path': 'c:\\src', 'name': '이순신', 'age': 30, 'address': '서울시 금천구 독산동'}
c:\src에 이순신, 30, 서울시 금천구 독산동를 저장합니다.
```

```python
res
```

```text
{'save_path': 'c:\\src', 'name': '이순신', 'age': 30, 'address': '서울시 금천구 독산동'}
```

확인할 것 세 가지다.

- `invoke`에 넘긴 dict는 첫 노드의 입력이 아니라 **초기 State**다.
- 노드를 지날 때마다 반환값이 State에 쌓인다. `add_age`는 `name`을, `add_address`는 `name`과 `age`를 볼 수 있다.
- Schema에 없는 `name2`, `name3`은 버려졌다. 저장이 성공했으니 `result`도 없다.

`save_path` 없이 `graph.invoke({})`로 실행하면 `save_info`의 `state['save_path']`에서 KeyError가 나고 except로 빠진다. 강사님 노트북의 실행 결과다.

```text
{'name': '이순신', 'age': 30, 'address': '서울시 금천구 독산동', 'result': 'Fail'}
```

### 5. 실행: stream

`stream`은 노드가 끝날 때마다 이벤트를 하나씩 내보낸다. 무엇을 내보낼지는 `stream_mode`로 정한다.

```python
for event in graph.stream({"save_path":r"c:\src"}, mode="values"): 
    print("EVENT:,event")
    print("-----"*100)

# stream({}, stream_mode="모드")
# 모드: updates (기본) -> 각 Node가 끝날 때 마다 그 노드가 반환한 state를 반환 {"노드이름": {state}} 
# values -> 각 노드가 종료될때 마다 그 시점의 전체 state를 반환.
# messages -> LLM의 응답 chunk(토큰)을 반환. (chatbot에서 사용)
```

이 셀에는 실수가 두 개 있다.

- `print("EVENT:,event")`는 따옴표가 `event`까지 감싸서 변수가 아니라 **문자열 "EVENT:,event"** 를 찍는다. 그래서 출력에 이벤트 내용이 하나도 안 나왔다. `print("EVENT:", event)`가 맞다.
- 인자 이름은 `mode`가 아니라 **`stream_mode`** 다. 잘못된 이름은 에러 없이 무시되고 기본값 `updates`로 동작한다.

> **보충**: 두 가지를 고쳐 모드별로 직접 실행한 결과다(langgraph 1.2.14, 노드의 print는 한 줄로 줄였다). 잘못 쓴 `mode="values"`는 아래 `updates` 결과와 똑같이 나왔다.

`stream_mode="updates"` — 노드 이름과 **그 노드가 반환한 값**만:

```text
add_name: {'save_path': 'c:\\src'}
EVENT: {'add_name': {'name': '이순신'}}
add_age: {'save_path': 'c:\\src', 'name': '이순신'}
EVENT: {'add_age': {'age': 30}}
add_address: {'save_path': 'c:\\src', 'name': '이순신', 'age': 30}
EVENT: {'add_address': {'address': '서울시 금천구 독산동'}}
c:\src에 이순신, 30, 서울시 금천구 독산동를 저장합니다.
EVENT: {'save_info': None}
```

`stream_mode="values"` — 그 시점의 **전체 State**(스냅샷):

```text
EVENT: {'save_path': 'c:\\src'}
add_name: {'save_path': 'c:\\src'}
EVENT: {'save_path': 'c:\\src', 'name': '이순신'}
add_age: {'save_path': 'c:\\src', 'name': '이순신'}
EVENT: {'save_path': 'c:\\src', 'name': '이순신', 'age': 30}
add_address: {'save_path': 'c:\\src', 'name': '이순신', 'age': 30}
EVENT: {'save_path': 'c:\\src', 'name': '이순신', 'age': 30, 'address': '서울시 금천구 독산동'}
c:\src에 이순신, 30, 서울시 금천구 독산동를 저장합니다.
```

`values`는 노드가 돌기 전에 **초기 State부터** 한 번 내보내고, `save_info`처럼 `None`을 반환해 State가 안 바뀐 스텝은 새 스냅샷을 내지 않았다. `updates`는 `{'save_info': None}`처럼 반환값을 그대로 보여 준다.

| stream_mode | 내보내는 것 | 쓰임 |
|---|---|---|
| `updates` (기본) | `{노드이름: 그 노드의 반환값}` | 어느 노드가 무엇을 바꿨는지 추적 |
| `values` | 그 시점의 전체 State | 상태 변화를 통째로 확인 |
| `messages` | LLM 응답 토큰 chunk와 metadata | 챗봇에서 글자 단위 출력 |

## 다양한 엣지

### 기본 엣지

`add_edge(a, b)`로 연결한다. **항상 같은 다음 노드**로 가므로 흐름을 실행 전에 예측할 수 있다. 위 예제가 기본 엣지만으로 만든 그래프다.

### 조건부 엣지

**조건에 따라 다음 노드를 동적으로 정한다.** 조건문과 반복문을 그래프에 넣는 방법이다.

`add_conditional_edges(source_node, 라우팅_함수, path_map)`

| 인자 | 역할 |
|---|---|
| **source node** | 조건 평가가 시작될 노드. 이 노드가 실행된 뒤의 State로 판단 |
| **라우팅 함수** | State를 보고 **다음 노드의 식별값**(보통 노드 이름)을 반환 |
| **path map** | 식별값 → 이동할 노드. 식별값과 노드 이름이 다르면 dict, 같으면 list |

```python
# 랭그래프 => 조건부 엣지 => node에서 node로 이동할 때 return값에 따라 어떤 노드로 이동할지 골라줌
# ? 조건문이 필요함
# node가 할순없음 => 함수가 하나 필요함 (라우터함수=custom_tool_condition)
```

## Tool을 부르는 챗봇 Agent

지난 글의 web_agent 루프를 그래프로 다시 그린다.

```text
START → chatbot ─(tool_calls 있음)→ tools → chatbot → ... 
                └(tool_calls 없음)→ END
```

```python
from langchain_core.prompts import ChatMessagePromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_tavily import TavilySearch
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

from typing import Annotated
from typing_extensions import TypedDict

from datetime import date
from tools import wikipedia_search_tool
```

### State: messages와 add_messages

```python
# State schema 설계
class State(TypedDict):
    messages: Annotated[list, add_messages] #list에 노드가 반환한 리스트의 값들을 append
    # Annotated[타입, 함수(reducer)] #노드가 반환한 값을 어떻게 State에 저장할지 결정하는 함수 reducer
```

```python
#add_messages([1,2,3],[10,20]) #=> [1,2,3,10,20]
# LIST 2개를 합쳐줌 => 같은 역할 operator.add

add_messages([HumanMessage(content="A")], [HumanMessage(content="B")])

# chatbot형태의 랭그래프를 만들때는 이 메세지가 꼭 들어감
```

```text
[HumanMessage(content='A', additional_kwargs={}, response_metadata={}, id='142eaa99-e2de-4e1a-a926-c776d4643acd'),
 HumanMessage(content='B', additional_kwargs={}, response_metadata={}, id='be3dc25e-9630-46ac-a323-047bf653ca8d')]
```

Reducer가 없으면 노드가 `{"messages": [response]}`를 반환할 때마다 대화 전체가 응답 하나로 **덮어써진다**. `add_messages`는 기존 리스트 뒤에 붙인다.

> **보충**: `add_messages`가 `operator.add`와 "같은 역할"인 건 새 메시지를 추가할 때까지다. 위 출력처럼 `add_messages`는 메시지마다 **id**를 붙이고, 새로 들어온 메시지의 id가 기존 메시지와 같으면 붙이지 않고 **교체**한다. 그래서 `("human", "안녕")` 같은 튜플도 `HumanMessage`로 바꿔 주고, 특정 메시지를 수정하는 것도 가능하다. 단순 리스트 합치기(`operator.add([1,2,3],[10,20,30])` → `[1, 2, 3, 10, 20, 30]`)와는 이 점이 다르다.

### chatbot 노드

```python
system_prompt = """당신은 다양한 지식을 제공하는 AI 어시스턴트입니다. 
주요 목표는 사용자의 요청에 대한 정확한 정보를 이해하기 쉽게 설명하는 것입니다. 

Instruction:
정확한 답변을 위해 웹 검색이 필요하거나 최신 정보를 얻고 싶을 때는 tavily_search 도구를 사용하십시오. 이 도구는 인터넷 검색을 통해 정보를 검색해서 제공합니다.
최신 정보를 제공해야 할 때는 {today} 를 기준으로 합니다.
검색 결과를 기반으로 명확하고 간결한 답변을 제공하십시오.
최종 응답은 챗봇과 같은 대화형 스타일을 유지하세요. 친근하고 쉽고 자연스럽게 답변하되 전문성을 보이는 어조를 유지하세요.

각 도구들을 결합해서 사용자의 요청에 정확한 대답을 하세요.
300글자 내외 한국어로 대답하세요.
항상 가장 최신의 정확한 정보를 제공하기 위해 노력하세요."""

from datetime import date
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt),
        ("human", "{query}")
    ]
)

tools = [TavilySearch(max_results=5)]

model = ChatOpenAI(model="gpt-5.4-mini").bind_tools(tools)

chain = prompt | model


def chatbot_node(state: State):
    """
    LLM 모델을 호출하는 노드함수
    """
    # State에서 사용자가 invoke시 전달한 메세지를 읽어서 llm 호출
    response = chain.invoke(
        {
            "query": state["messages"][-1].content,
            "today": date.today().strftime("%Y년 %m월 %d일")
        }
    )  # 반환 AIMessage

    return {"messages": [response]}
```

State의 **마지막 메시지 내용**을 질문으로 넣어 LLM을 부르고, 응답(AIMessage)을 리스트에 담아 반환한다. `add_messages`가 이걸 State에 이어 붙인다. 이 "마지막 메시지"가 뒤에서 문제를 일으킨다.

### tool 노드: Callable 클래스

노드는 함수뿐 아니라 `__call__`을 가진 객체도 된다. tool 목록을 들고 있어야 하므로 클래스로 만든다.

```python
class CustomToolNode:
    """J
    Node: Callable 클래스로 구현
    Tool을 호출해서 실행하는 노드. 그 결과(ToolMessages)를 State의 messages:list에 추가
    """

    def __init__(self, tools: list):
        #tools: list[StructuedTool] #툴들을 리스트로 받는다.
        self.tools_by_name = {tool.name:tool  for tool in tools} # dict[툴이름:Tool객체]

    # 노드함수
    def __call__(self, state:State):
        messages = state.get('messages', []) #State에서 messages 필드 조회
        if messages:
            message = messages[-1] # 마지막 message를 조회(chatnot_node의 반환값)
        else:
            raise Exception("State에 Message가 없습니다.")
        
        #Tool호출
        outputs = [] # Tool호출결과(ToolMessage)를 담을 리스트
        for tool_call in message.tool_calls:
            
            tool_message = self.tools_by_name[tool_call["name"]].invoke(tool_call)
            outputs.append(tool_message)

        return {"messages": outputs}
    
tool_node = CustomToolNode(tools)
tool_node
```

```text
<__main__.CustomToolNode at 0x295accbd940>
```

지난 글의 web_agent는 `if name == ...: elif ...`로 tool을 골랐는데, 여기서는 `{tool.name: tool}` dict로 바로 찾는다. tool이 늘어도 코드를 고칠 필요가 없다.

### 라우터 함수

```python
def custom_tool_condition(state:State):
    messages = state.get("messages", [])
    if messages:
        message = messages[-1]
    else:
        raise Exception("State에 messages 가 없습니다.")
    


    # concept => 식별값을 통해 TOOL OR END로 분기됌
    # Path Map (router의 리턴값에 따라 어느 노드로 이동할지 결정) => [list로 정의 or dict] 
    # ex = {"tools":"tool_node", END:END} / 식별자와 이동할 노드의 이름이 같을 경우 list형태로 ["tool_node", END]
    # 필요하면 tool를 쓰도록 분기하고 돌아와서 작업을 end로 마무리할수있게


    if message.tool_calls and len(message.tool_calls) > 0: # AIMessage에 tool_call이 있다면. 
        return "tools" # 다음 실행 노드를 식별할 수 있는 값을 반환(보통 node이름)
    else: # AIMessage에 최종 응답(content)이 있는 경우
        return END
```

판단 기준은 지난 글과 같다. **마지막 AIMessage에 `tool_calls`가 있으면 tool로, 없으면 끝.**

### 그래프 조립

```python
# StateGraph 정의 = node 추가, 

workflow = StateGraph(State)

workflow.add_node("chatbot", chatbot_node)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "chatbot")
workflow.add_conditional_edges(      
    "chatbot", # 시작(출발지) 노드
    custom_tool_condition, # router 함수
    {"tools": "tools", END:END} # Path Map (router의 리턴값에 따라 어느 노드로 이동할지 지정)
)
workflow.add_edge("tools", "chatbot")

# 컴파일 
graph = workflow.compile()
```

```python
display(Image(graph.get_graph().draw_mermaid_png()))
```

![챗봇 그래프](/images/llm/fig-langgraph-chatbot.png)

`tools → chatbot` 엣지가 **사이클**을 만든다. 점선은 조건부 엣지다. 노드 이름을 `"tools"`로 지어서 path map의 식별값과 노드 이름이 같아졌으니 `["tools", END]`로 써도 된다.

### 실행

```python
query = "안녕하세요."
response = graph.invoke(
    {"messages":[("human", query)]}
)
response
```

```text
{'messages': [HumanMessage(content='안녕하세요.', ...),
  AIMessage(content='안녕하세요! 반갑습니다.  \n무엇을 도와드릴까요?', ...)]}
```

인사는 `chatbot → END`로 바로 끝났다.

```python
res2 = graph.invoke(
    {"messages":[("human",  "AI의 최근동향에 대해 알려줘.")]}
)
res2['messages']
```

```text
[HumanMessage(content='AI의 최근동향에 대해 알려줘.', ...),
 AIMessage(content='', ... tool_calls ...),
 ToolMessage(content='{"query": "최근 AI 동향 2026년 7월 9일 기준 주요 흐름 생성형 AI 에이전트 멀티모달 오픈소스 규제 반도체", "follow_up_questions": null, "answer": null, "images": [], "results": [{"url": "https://ww...
 ...]
```

`Human → AI(tool_calls) → Tool → ...` 순서로 쌓였다. `{today}` 덕분에 검색어에 "2026년 7월 9일"이 들어갔다.

```python
print(res2['messages'][-1].content)
```

```text
Here are the most relevant **Reuters AI headlines from early July 2026** based on your query:

1. **OpenAI gets US approval for broad GPT-5.6 rollout, Axios reports**  
   - Reuters, **July 8, 2026**  
   ...
2. **Argentina's plan for AI-run companies can't avoid humans**  
   ...

If you want, I can also turn this into a **categorized digest**:
- **AI agents / models**
- **multimodal / open source**
- **regulation / policy**
- **semiconductors / infrastructure**

and summarize each one in 1–2 lines.
```

"300글자 내외 한국어로 대답하세요"라고 했는데 **영어로**, 그것도 "based on your query"라며 기사 제목 목록을 돌려줬다. 원인은 chatbot 노드의 이 줄이다.

```python
"query": state["messages"][-1].content,
```

두 번째로 chatbot 노드가 돌 때 State의 마지막 메시지는 사용자 질문이 아니라 **ToolMessage**다. 그래서 LLM이 받은 "질문"은 `{"query": "최근 AI 동향 2026년 7월 9일 ...", "results": [{"url": ..., "title": ...}]}` 같은 **검색 결과 JSON 문자열**이었다. 원래 질문도, 자기가 tool을 불렀다는 사실도 모른 채 영어 기사 목록을 받았으니 "당신의 query에 맞는 기사들은 이것"이라고 영어로 정리한 것이다.

강사님 노트북은 이 자리에 **메시지 리스트 전체**를 넘겼다.

```python
prompt = ChatPromptTemplate(
    [
        ("system", system_prompt),
        ("human", "{query}")
    ],
    partial_variables={"today": date.today().strftime("%Y년 %m월 %d일")}
)
...
def chatbot_node(state: State):
    """LLM 모델을 호출하는 노드함수."""
    # State에서 사용자가 invoke시 전달한 메세지를 읽어서 llm 호출
    response = chain.invoke({"query":state['messages']}) # 반환: [HM, AI, TM, TM]
    return {"messages":[response]}
```

비슷한 질문의 강사님 실행 결과는 한국어로 제대로 정리됐다.

```python
res2 = graph.invoke({
    "messages":[("human", "AI의 최신동향에 대해서 조사해서 설명해줘.")]
})
print(res2["messages"][-1].content)
```

```text
최근 AI 동향을 한마디로 요약하면, **"생성형 AI를 넘어서 에이전트 AI, 물리적 AI, 기업용 실전 도입"**으로 중심이 이동하고 있습니다.  
아래처럼 정리해드릴게요.

## 1) AI 에이전트(Agentic AI)가 핵심 화두
이제 AI는 질문에 답하는 수준을 넘어, **스스로 계획하고 실행하는 '디지털 동료'**로 진화하고 있습니다.
...
## 4) AI 인프라 경쟁이 더 치열해짐
AI 성능 경쟁은 결국 **GPU, 데이터센터, 전력, 냉각, 네트워크** 경쟁입니다.
...
```

> **보충**: 강사님 방식도 완전하지는 않다. `"{query}"`는 문자열 자리라서 메시지 리스트를 넣으면 리스트가 **문자열로 변환되어**(`[HumanMessage(content=...), AIMessage(...), ToolMessage(...)]` 같은 모양) human 메시지 하나에 들어간다. LLM이 내용을 읽을 수는 있지만 역할 구분이 사라진다. 메시지를 메시지로 넘기려면 지난 글처럼 `MessagesPlaceholder`를 쓴다.
>
> ```python
> prompt = ChatPromptTemplate(
>     [
>         ("system", system_prompt),
>         MessagesPlaceholder(variable_name="messages"),
>     ],
>     partial_variables={"today": date.today().strftime("%Y년 %m월 %d일")}
> )
> 
> def chatbot_node(state: State):
>     response = chain.invoke({"messages": state["messages"]})
>     return {"messages": [response]}
> ```
>
> 이러면 `Human → AI(tool_calls) → Tool` 순서가 그대로 LLM에 전달되어, LLM이 "내가 검색을 요청했고 결과가 왔다"는 맥락을 안다.

### stream_mode="messages"

```python
query = "FIFA 월드컵에 대해 위키백과사전의 내용을 조사해서 정리해줘."
for event in graph.stream(
    {"messages":[("human", query)]}, stream_mode="messages"
):
    print(event[0].content, end="")
```

```text
{"query": "Wikipedia FIFA World Cup summary OR", "follow_up_questions": null, "answer": null, "images": [], "results": [{"url": "https://en.wikipedia.org/wiki/FIFA_World_Cup", "title": "FIFA World Cup - Wikipedia", "content": "(Top)\n 1 History   Tog...
```

LLM 답 대신 **검색 결과 JSON**이 찍혔다. `messages` 모드는 LLM 토큰뿐 아니라 **tool 노드가 만든 ToolMessage도** 내보내기 때문이다. 각 이벤트는 `(메시지 chunk, metadata)` 튜플이고, metadata의 `langgraph_node`로 어느 노드에서 나왔는지 알 수 있다. 강사님 코드는 chatbot 노드의 것만 골라 출력했다.

```python
gen = graph.stream(
    {
        "messages":[("human","러시아 우크라이나 전쟁과 미국 이란 전쟁의 최신 상황을 알려줘.")]
    }, 
    stream_mode="messages" # tuple[응답Chunk, metadata: 어떤 노드의 답인지]
)

for i, event in enumerate(gen):
    if event[1]["langgraph_node"]=="chatbot":   # 응답메세지를 출력하는 Node이름
        print(event[0].content, end="")
```

```text
물론이죠. **2026년 7월 9일 기준**으로, 두 전쟁의 최신 상황을 간단히 정리해드릴게요.

## 1) 러시아-우크라이나 전쟁 최신 상황
- **러시아가 우크라이나 전역, 특히 키이우에 대한 공습을 계속 강화**하고 있습니다.
...
```

또한 위키백과를 조사하라고 했는데 Tavily로 영어 위키백과를 검색했다. `wikipedia_search_tool`을 import만 하고 `tools`에 넣지 않았으니 LLM이 고를 수 있는 건 Tavily뿐이었다.

### 대화 기억은 아직 없다

강사님 노트북 마지막 셀이다.

```python
graph.invoke({
    "messages":[("human", "내가 아까한 질문에 대해 좀더 자세히 알려줘.")]
})
```

```text
{'messages': [HumanMessage(content='내가 아까한 질문에 대해 좀더 자세히 알려줘.', ...),
  AIMessage(content='물론이죠. 그런데 지금 대화만으로는 **"아까 한 질문"의 내용이 보이지 않아서** 어떤 주제를 더 자세히 설명해야 할지 알 수 없어요. ...
```

`invoke`를 부를 때마다 State는 새로 시작한다. 이전 실행의 messages를 이어 쓰려면 State를 저장해 두는 **Checkpointer**가 필요하고, 그게 다음 글의 주제다.

> **보충**: 직접 만든 `CustomToolNode`와 `custom_tool_condition`은 `langgraph.prebuilt`에 `ToolNode`, `tools_condition`으로 이미 있다. `tools_condition`은 `"tools"` 또는 `END`를 반환하므로 tool 노드 이름을 `"tools"`로 등록하면 그대로 맞는다. 흐름을 이해한 뒤에는 이쪽을 쓰면 된다.
>
> ```python
> from langgraph.prebuilt import ToolNode, tools_condition
> workflow.add_node("tools", ToolNode(tools))
> workflow.add_conditional_edges("chatbot", tools_condition)
> ```

## Command: 노드가 직접 다음 노드를 정하기

`Command`는 노드의 반환값으로 **State 업데이트와 다음 이동 노드를 함께** 돌려주는 기능이다. 조건부 엣지는 그래프 정의부에서 흐름을 정하지만, Command는 **노드 내부에서** 정한다.

| 파라미터 | 의미 |
|---|---|
| `update` | State에 반영할 값 (일반 노드의 `return {...}`과 같음) |
| `goto` | 다음에 실행할 노드 이름 |
| `graph` | 이동 대상이 부모 그래프에 있을 때 `Command.PARENT`. 멀티 에이전트에서 서브 에이전트가 슈퍼바이저로 작업을 넘길(handoff) 때 쓴다 |
| `resume` | `interrupt()`로 멈춘 그래프를 재개할 때 전달할 값 |

반환 타입에 `Command[Literal["이동노드", ...]]`로 이동 가능한 노드를 적어 두는 것이 권장된다. 그래프가 이 힌트로 가능한 경로를 안다. 상태 업데이트 없이 라우팅만 필요하면 조건부 엣지가 권장된다.

> **보충**: 수업 자료의 예제를 노드만 채워 직접 실행했다.

```python
from typing import Literal
from langgraph.types import Command

def router_node(state) -> Command[Literal["retrieve", "answer", "__end__"]]:
    question = state["question"]
    if "검색" in question:
        return Command(update={"route": "retrieve"}, goto="retrieve")
    elif "답변" in question:
        return Command(update={"route": "answer"}, goto="answer")
    else:
        return Command(update={"route": "end"}, goto=END)

# retrieve, answer 노드는 print만 하는 함수
# 엣지: START → router_node, retrieve → END, answer → END  (router_node에서 나가는 엣지는 없음)

for q in ["문서를 검색해줘", "답변만 해줘", "안녕"]:
    print(q, "->", graph.invoke({"question": q}))
```

```text
retrieve 노드 실행
문서를 검색해줘 -> {'question': '문서를 검색해줘', 'route': 'retrieve'}
answer 노드 실행
답변만 해줘 -> {'question': '답변만 해줘', 'route': 'answer'}
안녕 -> {'question': '안녕', 'route': 'end'}
```

`router_node`에서 나가는 엣지를 하나도 등록하지 않았는데 분기가 됐다. 그래프를 그리면(`draw_mermaid()`) `router_node -.-> retrieve / answer / __end__` 세 개의 점선이 생기는데, 반환 타입의 `Literal`을 보고 그린 것이다.

| 구분 | Conditional Edge | Command |
|---|---|---|
| 흐름 제어 위치 | 그래프 정의부 | 노드 내부 |
| 상태 업데이트 | 노드 반환값 | `Command(update=...)` |
| 다음 노드 결정 | 라우팅 함수 | 노드가 직접 |
| 적합한 경우 | 흐름 구조를 명확히 분리하고 싶을 때 | 노드 결과에 따라 즉시 분기 |
| 사용 예 | 분류기, 라우터, 반복 조건 | 에이전트 핸드오프, 상태 업데이트 + 이동 |

## Send: 하나의 흐름을 여러 갈래로

일반 엣지와 조건부 엣지는 다음 노드를 **하나** 고른다. `Send`는 같은 노드를 **여러 번, 서로 다른 입력으로** 실행시킨다. 큰 작업을 쪼개 병렬 처리하고(Map) 결과를 합치는(Reduce) **map-reduce** 구조에 쓴다.

- `Send(node, arg)`: `node`는 실행할 노드 이름, `arg`는 그 노드에 넘길 입력. **전체 State Schema에 없는 필드도** 넘길 수 있다.
- 라우팅 함수가 `Send` 리스트를 반환하면 그 개수만큼 노드가 실행된다.

![Send map-reduce](/images/llm/fig-langgraph-send.png)

```python
from typing import Annotated, TypedDict
import operator
from langgraph.types import Send

class State(TypedDict):
    documents: list[str]
    summaries: Annotated[list[str], operator.add] # 병렬처리되어 반환된 결과들을 모을 Field. 여러 노드 실행 결과가 누적되어야 하므로 Reducer가 필요.
    final_summary: str

def send_each_document(state: State):
    return [
        Send("summarize_document", {"document": doc}) # Send로 state를 전달 할 때 State Schema에 없는 Field들을 전달 할 수 있다.
        for doc in state["documents"]
    ]

graph.add_conditional_edges(
    "distribute_node",       # source node 이름
    send_each_document,      # routing function
    ["summarize_document"]   # 가능한 목적지 노드 목록
)
graph.add_edge("summarize_document", "final_summary")
```

> **보충**: 수업 자료의 전체 코드에서 LLM 요약만 "첫 단어 뽑기"로 바꿔 직접 실행했다. `distribute_node`는 문서 3개를 반환한다.

```text
summarize_document 실행: {'document': 'LangGraph는 그래프 기반 런타임이다'}
summarize_document 실행: {'document': 'State는 노드들이 공유하는 저장소다'}
summarize_document 실행: {'document': 'Send는 작업을 여러 갈래로 나눈다'}
{'documents': [...],
 'summaries': ['LangGraph는', 'State는', 'Send는'],
 'final_summary': 'LangGraph는 / State는 / Send는'}
```

`summarize_document`는 문서 수만큼 3번 실행됐고, 각 실행이 받은 state에는 Schema에 없는 `document` 하나만 들어 있다. 세 실행은 같은 스텝에서 병렬로 돌기 때문에 `summaries`에 `operator.add` Reducer가 없으면 결과를 하나로 모을 수 없다. LangGraph는 Reducer 없는 필드를 한 스텝에서 여러 노드가 동시에 업데이트하면 에러를 낸다.

| 구분 | 반복 구조 (조건부 엣지 사이클) | Send |
|---|---|---|
| 목적 | 조건이 만족될 때까지 같은 흐름 반복 | 여러 작업을 나누어 실행 |
| 실행 방식 | 순환 | 분산 / 병렬 (Fan-out) |
| 사용 예 | 답변 재생성, 검색 재시도 | 여러 문서 요약, 여러 쿼리 검색 |
| 결과 처리 | 상태를 갱신하며 반복 | 여러 결과를 Reducer로 병합 |

## 정리

| 구성 요소 | 하는 일 | 만드는 법 |
|---|---|---|
| State | 노드들이 공유하는 저장소 | `TypedDict` / `BaseModel`로 Schema 정의 |
| Reducer | 같은 key의 값을 합치는 규칙 | `Annotated[list, add_messages]`, `operator.add` |
| Node | 작업 단위. State를 받아 업데이트할 dict 반환 | 함수 또는 `__call__` 클래스 |
| Edge | 고정된 다음 노드 | `add_edge(a, b)` |
| 조건부 Edge | State를 보고 다음 노드 결정 | `add_conditional_edges(src, router, path_map)` |
| Command | 노드 안에서 업데이트 + 이동 | `return Command(update=, goto=)` |
| Send | 같은 노드를 여러 입력으로 병렬 실행 | 라우터가 `[Send(node, arg), ...]` 반환 |

- `invoke`에 넘기는 dict는 **초기 State**다. Schema에 없는 key는 버려진다.
- `stream`의 인자는 `stream_mode`다. `updates`는 노드별 반환값, `values`는 전체 State, `messages`는 LLM 토큰과 ToolMessage.
- 챗봇 노드에 `messages[-1]`만 넘기면 tool을 다녀온 뒤엔 **ToolMessage가 질문이 된다**. 메시지 전체를 `MessagesPlaceholder`로 넘긴다.
- 직접 만든 tool 노드와 라우터는 `ToolNode`, `tools_condition`으로 대체할 수 있다.

지금 그래프는 `invoke`가 끝나면 State가 사라진다. 다음 글에서는 Checkpointer로 대화를 이어 가는 **메모리**를 붙인다.
