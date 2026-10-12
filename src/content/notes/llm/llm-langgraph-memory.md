---
title: "LangGraph 메모리와 HITL: Checkpointer, Store, interrupt"
description: "상태가 없는 LLM에 대화를 기억시키는 방법으로 Checkpointer(단기 메모리)와 thread_id, create_agent에 메모리 붙이기, 긴 대화를 요약해 줄이는 SqliteSaver 챗봇, 사용자 정보를 namespace/key로 저장하는 Store(장기 메모리)를 정리하고, interrupt와 Command(resume)로 실행 중간에 사람의 입력을 받는 Human-in-the-Loop까지 다룹니다."
category: 'Tech'
subcategory: 'LLM'
series: 'Agent·LangGraph'
seriesOrder: 3
originalNotebook: "13_Agent_langgraph_2.ipynb"
tags: ["LLM","Agent"]
date: 2026-07-08T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-langgraph-memory.webp'
---

> SKN31 AI Agent 과정 노트북 `13_Agent_langgraph_2.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 실행한 결과입니다. 셀을 여러 번 다시 실행한 흔적이 있어 흐름이 이어지는 출력만 골랐습니다. HITL의 마지막 단계는 **강사님 노트북의 실행 결과**로, interrupt 동작 확인은 LLM 없이 **직접 실행**(langgraph 1.2.14)한 결과로 보완했고 해당 위치에 표시했습니다.

## 이 글에서 다루는 것

- LLM은 왜 기억하지 못하나: 메모리 관리란
- 단기 메모리: Checkpointer와 `thread_id`
- `create_agent()`에 Checkpointer 붙이기
- 긴 대화 다루기: 자르기, 삭제, 요약 (SqliteSaver로 요약 챗봇 만들기)
- 장기 메모리: Store의 namespace / key / value
- Human-in-the-Loop: `interrupt()`와 `Command(resume=)`

지난 글 마지막에 "내가 아까한 질문에 대해 좀더 자세히 알려줘"라고 하자 그래프는 "아까 한 질문의 내용이 보이지 않는다"고 답했다. `invoke`가 끝나면 State가 사라지기 때문이다. 이번 글은 그 State를 **남기는** 방법이다.

## 메모리 관리

LLM API는 호출할 때마다 **완전히 독립적으로** 동작한다. 직전에 무슨 대화가 오갔는지 모른다. 이를 **stateless**라고 한다. "내 이름은 밥이야" 다음 턴에 "내 이름이 뭐였지?"라고 물으면 답할 수 없다. 챗봇이 기억하는 것처럼 보이는 건, 애플리케이션이 **과거 대화를 보관했다가 매 요청마다 함께 넣어 주기** 때문이다.

메모리 관리는 이 대화 내역을 다루는 일이고, 세 가지를 정해야 한다.

- **무엇을** 전달할까 (전체 대화? 일부?)
- **얼마나** 전달할까 (컨텍스트 윈도는 무한하지 않다)
- **어떻게** 전달할까 (원문? 요약? 추출한 사실?)

```python
# state = agent가 한번 일할때 (Invoke까지) 기억하는 데이터 (관리되는)

# 용도에 따라 단기기억만, or 대화가 끝나더라고 유지되는 저장소가 필요 (기본적으로 DB를 사용)

# 저장하는 방법은 2가지 
# 단기메모리DB(ex.대화창-하나의 질의가 아니라 대화가 끝날때까지 유지하는 데이터) or 장기메모리DB(사용자의 특화된 데이터-모든질의에 공통적으로 사용해야하는 것)
```

| | 단기 메모리 | 장기 메모리 |
|---|---|---|
| 범위 | 하나의 대화(스레드) | 모든 대화에서 공유 |
| 내용 | 메시지 히스토리, 업로드 파일, 검색 문서, 중간 산출물 | 사용자 정보·선호, 과거 작업 사례, 실행 지침 |
| 수명 | 대화가 끝나면 더 참조하지 않음 | 명시적으로 지울 때까지 |
| 질문 | "지금 이 대화에서 무슨 일이 일어나고 있나" | "이 사용자에 대해 알게 된 것은 무엇인가" |
| LangGraph | **Checkpointer** | **Store** |

```python
# 단기메모리=> 문맥유지
# 장기메모리=> 모든 값을 저장할 필요는 없음(프로젝트 정보, 작업이력 같은거 ㅇㅋ)
```

## 단기 메모리: Checkpointer

LangGraph는 단기 메모리를 **스레드(thread)** 단위로 나눈다. 스레드는 채팅창 하나의 연속된 대화다.

- State는 그래프가 한 번 실행되면(START ~ END) 사라진다.
- 이 State를 **저장하고 다시 불러오는 저장소가 Checkpointer**다. 저장된 상태 하나하나는 **Checkpoint**라고 한다.
- 체크포인터는 마지막에 한 번이 아니라 **노드가 실행될 때마다** State를 저장한다. 그래서 중간에 멈춰도 그 지점부터 이어갈 수 있다.

사용법은 세 단계다.

1. 저장소(Checkpointer)를 만든다.
2. **compile할 때** 연결한다.
3. **호출할 때** `thread_id`를 config로 넘긴다. 같은 `thread_id`면 이전 State를 복원하고, 다르면 별개의 대화가 된다.

```python
from typing import Annotated
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI

from langgraph.checkpoint.memory import InMemorySaver # 단기기억들을 메모리에 저장.

# 000saver가 단기메모리를 저장해주는 친구들

from dotenv import load_dotenv
from pprint import pprint


load_dotenv()
```

```python
class State(TypedDict):
    messages: Annotated[list, add_messages] # add_messages => message를 계속해서 추가

model = ChatOpenAI(model="gpt-5.4-mini")
def chatbot(state: State):
    return {"messages":[model.invoke(state["messages"])]} # 단순한 챗봇 => return값으로 ai message받음 => 이걸 단기메모리에 저장

workflow = StateGraph(State)

workflow.add_node("chatbot", chatbot)

workflow.add_edge(START, "chatbot")
workflow.add_edge("chatbot", END)

# 체크포인터 정의 - 체크포인터: 단기메모리들을 저장하는 DB -> 컴파일 할 때 설정
checkpointer = InMemorySaver() # 저장소 만들기
graph = workflow.compile(checkpointer=checkpointer) # 컴파일(graph를 불러옴, 이때 저장소까지 파라미터로 정의)
```

이번 chatbot 노드는 `state["messages"]` **전체**를 모델에 넘긴다. 지난 글처럼 마지막 메시지만 넘기면 Checkpointer가 대화를 복원해 줘도 모델이 볼 수 없다.

```python
# 단기메모리 -> 대화 세션(Thread)에서 유지되는 메모리. -> invoke(), stream() 으로 실행할 때 
#              대화 세션을 구분할 수 있는 식별값을 전달. => Thread-id. RunnableConfig에 넣어서 전달
config = {
    "configurable": {
        "thread_id":"diag-1"   # key: thread_id, value: 대화 식별값
    }
}
```

```python
res = graph.invoke(
    {"messages": [("human", "안녕하세요. 내 이름은 홍길동입니다.")]},
    config=config 
)

# check pointer => 대화별로 저장되어야함 (=대화를 식별할 수 있어야함) #쓰레드 아이디로 구분 (config 에서 설정)
# diag-1 날짜 등 겹치지 않게만
# invoke할때 넣어줌

# state값은 invoke가 끝나면 사라지지만
# ex) check point => diag-1
# 각 node들의 state값도 대화별로 check point 저장 
# invoke할때마다 다시 state값에 저장되어 대화의 맥락을 유지함
```

```python
print(res['messages'][-1].content)
res
```

```text
안녕하세요, 홍길동님! 다시 만나서 반갑습니다. 무엇을 도와드릴까요?

{'messages': [HumanMessage(content='안녕하세요. 내 이름은 홍길동입니다.', ...),
  AIMessage(content='안녕하세요, 홍길동님! 반갑습니다. 무엇을 도와드릴까요?', ...),
  HumanMessage(content='안녕하세요. 내 이름은 홍길동입니다.', ...),
  AIMessage(content='안녕하세요, 홍길동님! 다시 만나서 반갑습니다. 무엇을 도와드릴까요?', ...)]}
```

출력에는 같은 인사가 두 번 쌓여 있다. 이 셀이 두 번 실행됐기 때문인데, 두 번째 답이 **"다시 만나서"** 반갑다고 한 것이 눈에 띈다. 같은 `thread_id`라서 첫 번째 대화가 복원된 것이다. 이름을 묻기도 전에 메모리가 동작하는 게 드러났다.

```python
res = graph.invoke(
    {"messages": [("human", "내 이름이 뭐야?")]},
    config=config
)
print(res['messages'][-1].content)
```

```text
당신의 이름은 홍길동입니다.
```

```python
#### 다음 대화로 넘어감 #########

config2 = {
    "configurable": {"thread_id":"diag-2"}
}
res = graph.invoke(
    {"messages": [("human", "내 이름이 뭐야?")]},
    config=config2
)
# 사실이름은 장기기억에 들어가는게 맞음 
print(res['messages'][-1].content)
```

```text
아직 알려주지 않으셔서 모르겠어요.  
원하시면 이름을 알려주시면 제가 기억하고 그 이름으로 불러드릴게요.
```

`thread_id`가 바뀌니 새 대화다. 주석대로, 이름처럼 **대화가 바뀌어도 알아야 하는 정보**는 단기 메모리가 아니라 장기 메모리에 들어가야 한다.

### create_agent()에 Checkpointer 붙이기

`create_agent()`는 `checkpointer` 파라미터로 바로 받는다. 지난 글의 메뉴 추천 Agent에 붙인다.

```python
from langchain.agents import create_agent
from langchain_tavily import TavilySearch
from tools import search_menu_tool
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from langgraph.checkpoint.memory import InMemorySaver

# 툴들 정의
tavily_search = TavilySearch(max_results=5)
tools = [search_menu_tool, tavily_search]

# 모델 정의
model = ChatOpenAI(model="gpt-5.4-mini")

# Checkpointer 객체 생성
checkpointer = InMemorySaver()

# Agent 생성
agent = create_agent(
    model=model,
    tools=tools, # 모델에 binding할 tools들 
    system_prompt=system_prompt,
    checkpointer=checkpointer   ## 단기메모리 관리를 위해서 checkpointer 설정.
)
```

`system_prompt`는 지난 글의 메뉴 추천 지침과 같다.

```python
config = {"configurable":{"thread_id":"dialog-1"}} # 같은 쓰레드 아이디면 같은 대화로 가게 됌
res = agent.invoke(
    {"messages":[("human", "이태리 요리 중 닭고기 요리를 3개 추천해줘.")]},
    config=config
)
print(res['messages'][-1].content)
```

```text
이탈리안 느낌의 닭고기 요리로는 아래 3개를 추천드릴게요.

1. **뽈로 알라 카치아토라**
   - **가격:** 메뉴판에 없음
   - **주재료:** 닭고기, 토마토, 허브, 올리브오일
   - **특징:** 이탈리아 전통의 "사냥꾼 스타일" 닭요리로, ...

2. **인볼티니 폴로**
   - **가격:** 메뉴판에 없음
   - **주재료:** 닭고기, 치즈, 아스파라거스, 허브 빵가루
   ...

3. **프로방스 치킨**
   - **가격:** 22,000원
   ...
```

메뉴에 이탈리아 닭고기 요리가 부족하자 메뉴 밖 요리 두 개와 메뉴의 프로방스 치킨을 섞어 추천했다.

```python
res = agent.invoke(
    {"messages":[("human", "아까 추천한 요리중 두번째 요리에대해서 조사해줘.")]},
    config=config
)
print(res['messages'][-1].content)
```

```text
물론이죠. 아까 추천드린 **두 번째 요리인 인볼티니 폴로(involtini pollo)** 를 정리해드릴게요.

- **가격:** 메뉴판 기준 정보 없음
- **주재료:** 닭고기, 치즈, 아스파라거스, 허브 빵가루
- **특징:** 닭고기를 돌돌 말아 오븐에 구워 만드는 이탈리아식 요리예요. ...
```

"아까 추천한 두 번째"를 정확히 인볼티니 폴로로 짚었다. 같은 질문을 **다른 스레드**(`config2`)로 보내면 어떻게 될까.

```python
res = agent.invoke(
    {"messages":[("human", "아까 추천한 요리중 두번째 요리에대해서 조사해줘.")]},
    config=config2
)
```

```text
물론이죠! 아까 추천한 요리 중 **두 번째는 부르기뇽 스튜**입니다.

- **가격:** 28,000원  
- **주재료:** 쇠고기, 적포도주, 양파, 당근, 베이컨  
- **특징:** 프랑스 부르고뉴 지방의 전통 스튜로, ...
```

이 스레드에는 추천한 적이 없다. 그런데 "모르겠다"고 하지 않고, `search_menu_tool`을 `{'query': '아까 추천한 요리 중 두번째 요리', 'top_k': 5}`로 부른 뒤, 돌아온 결과(트러플 피자, 부르기뇽 스튜, 라따뚜이, 니스 샐러드, 밀라노풍 송아지 커틀렛) 중 **두 번째를 "아까 추천한 두 번째"로 꾸며서** 답했다. 단기 메모리가 없을 때 LLM은 맥락이 없다는 걸 인정하기보다 그럴듯하게 채우는 쪽을 택할 수 있다. 시스템 프롬프트의 "모호하면 정중하게 설명을 요청하라"(지침 6)도 지켜지지 않았다.

### 저장된 State 조회

```python
# checkpointer에 저장된 단기메모리 내용을 조회

from pprint import pprint
cp = agent.get_state(config)
pprint(cp)
cp.values
# cp 에는 human+ai messages 다 저장됌
```

```text
StateSnapshot(values={'messages': [HumanMessage(content='이태리 요리 중 닭고기 요리를 3개 추천해줘.', ...), AIMessage(content='', ...), ToolMessage(...), ..., AIMessage(...)]},
  next=(),
  config={'configurable': {'thread_id': 'dialog-1', 'checkpoint_ns': '', 'checkpoint_id': '1f17bfd9-d06e-602d-8003-2c1bbcec8c94'}},
  metadata={'source': 'loop', 'step': 3, 'parents': {}, 'ls_integration': 'langchain_create_agent'},
  created_at='2026-07-10T01:21:01.661161+00:00',
  parent_config={'configurable': {'thread_id': 'dialog-1', 'checkpoint_ns': '', 'checkpoint_id': '1f17bfd9-b1bb-62a6-8002-cc6d967a7668'}},
  tasks=(), interrupts=())
```

| StateSnapshot 속성 | 의미 |
|---|---|
| `values` | 그 시점의 State. Human/AI/Tool 메시지가 모두 들어 있다 |
| `next` | 다음에 실행할 노드. 빈 튜플이면 실행이 끝난 상태 |
| `config` | `thread_id`와 이 체크포인트의 `checkpoint_id` |
| `metadata` | `step`(몇 번째 스텝인지) 등 |
| `parent_config` | 바로 이전 체크포인트 |
| `tasks`, `interrupts` | 대기 중인 작업과 멈춤 정보 (HITL에서 쓴다) |

`parent_config`로 이전 체크포인트를 가리키므로 체크포인트들은 사슬처럼 이어져 있다. `graph.get_state_history(config)`로 전체 이력을, `checkpointer.delete_thread("1")`로 스레드 삭제를 할 수 있다.

## 대화가 길어질 때

단기 메모리는 대화가 길어질수록 끝없이 커진다. 컨텍스트 윈도를 넘으면 에러가 나고, 넘지 않더라도 길어질수록 응답 품질이 떨어지고 비용과 지연이 늘어난다.

```python
# 단기메모리의 용량이 커지면 토큰값이든 llm이 놓치는 부분이든 단점생김
# 메세지를 요약하거나, 오래된 것 삭제함
```

| 방법 | 동작 | 도구 | 단점 |
|---|---|---|---|
| **자르기** (Trim) | 토큰 수를 세어 오래된 메시지를 모델 입력에서 뺀다 | `trim_messages` | 잘린 내용은 모델이 못 봄 |
| **삭제** (Delete) | State에서 메시지를 영구 제거 | `RemoveMessage` | 정보 손실 |
| **요약** (Summarize) | 오래된 메시지를 요약 한 덩어리로 바꾸고 최근 몇 개만 원문 유지 | 요약 노드, `langmem`의 `SummarizationNode` | 요약 호출 비용, 세부 손실 |

```python
from langchain_core.messages.utils import trim_messages, count_tokens_approximately

def call_model(state: MessagesState):
    messages = trim_messages(
        state["messages"],
        strategy="last",                       # 최신 메시지부터 남김
        token_counter=count_tokens_approximately,
        max_tokens=128,
        start_on="human",
        end_on=("human", "tool"),
    )
    response = model.invoke(messages)
    return {"messages": [response]}
```

`RemoveMessage`는 `add_messages` Reducer를 쓰는 필드에서만 동작한다. 지난 글에서 본 대로 `add_messages`는 id로 메시지를 관리하므로, `RemoveMessage(id=...)`를 반환하면 그 id의 메시지를 지운다. 지운 뒤에도 히스토리가 **유효한 모양**이어야 한다. 첫 메시지가 user여야 하는 모델이 있고, tool_calls를 가진 AIMessage 뒤에는 대응하는 ToolMessage가 있어야 한다.

### Checkpointer 종류

```python
# 인메모리세이버 말고 2가지 db 종류
# sqlite3 and postgreSql

# Checkpointer 종류

# 1. InMemorySaver
# - RAM(메모리)에 저장
# - 프로그램 종료 시 데이터 삭제
# - 개발 및 테스트용

# 2. SqliteSaver
# - SQLite 파일(.db)에 저장
# - 프로그램 종료 후에도 유지
# - 개인 프로젝트, 로컬 개발용

# 3. PostgresSaver
# - PostgreSQL DB에 저장
# - 프로그램 종료 후에도 유지
# - 실무 서비스용
# - 여러 사용자, 대규모 서비스에 적합
```

### 요약 챗봇 만들기 (SqliteSaver)

메시지가 6개를 넘으면 오래된 것을 요약하고 지운 뒤, **요약 + 최근 메시지**로 답하는 챗봇이다.

```python
# Checkpointer로 SQLite3 DB를 사용
!uv pip install langgraph-checkpoint-sqlite
```

```python
##################################################
# 단기메모리의 메세지가 일정개수가 넘어가면 요약한다.
# 요약한 것 + 최신메세지(대화) + 질문까지 더한다음 LLM에게 전달 
####################################################

from langchain_core.messages import HumanMessage,RemoveMessage # RemoveMessage checkpoint에서 message를 삭제
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph.message import add_messages
from typing import Annotated
from dotenv import load_dotenv

load_dotenv()
```

```python
# 01 State 정의 

class State:
    messages: Annotated[list, add_messages] # 대화용 챗봇 필수 ()
    summary: str # 단기메모리에 저장된 메세지들을 요약한 내용

# class State(MessagesState): (이것만 쓸때도 있음)

model = ChatOpenAI(model="gpt-5.4-mini")

# 02 노드, router함수 생성

## 2-1 오래된 메세지들을 요약하는 노드 (한 대화에서 쌓이는 메세지를 요약)
def summarize_conversation(state: State):

    # 기존 요약이 있는지 조회
    summary = state.get("summary")
    if summary:
        summary_prompt = (f"지금까지의 대화 내용:{summary}\n\n위의 새로운 메세지와 지금까지 요약 내용을 합쳐서 전체 대화 내용을 요약해주세요")
    else: 
        summary_prompt = "위 대화 내용을 요약해주세요."

    # 최신 메세지 2개를 남기고 오래된 메세지를 요약
    messages = state['messages'][:-2] + [HumanMessage(content=summary_prompt)]
    response = model.invoke(messages) 

    # 최신 메세지 2개 빼고 오래된 메세지를 삭제 - RemoveMessage(삭제할 message ID => ID의 메세지를 삭제할 것 )
    delete_messages = [RemoveMessage(m.id) for m in state["messages"][:-2]]

    # delete_messagess: 삭제할 메세지들(RemoveMessages)을 모아 놓은 list -> State update 될 때 메세지들이 삭제됌
    return {"summary": response.content, "messages":delete_messages}


# ex) state=> 메세지+요약본 등이 있음 => 모델에 넣어줘야함 

## 2-2 chatbot 노드제작 (메세지 어떻게 받을건지에 대한 로직)
def call_model(state:State):
    # chatbot 모델
    summary = state.get('summary')
    # 요약 summary가 있으면 summary + message, 없으면 messages만

    if summary:
        system_prompt = f"이전 대화내용 요약:{summary}"
        messages = [("system", system_prompt)] + state['messages']
    else: 
        messages = state["messages"]

    response = model.invoke(messages)
    return {"messages":response}
        

## 2-3 라우터 함수 노드제작
def router(state:State):
    # 조건부 엣지에서 사용할 router 함수.
    # state의 messages의 개수가 6개가 넘으면 요약, 안넘으면 바로 call_model로 이동.
    messages = state['messages']
    if len(messages) > 6:
        return "summarize_conversation"
    else:
        return "call_model"
```

| 노드/함수 | 하는 일 |
|---|---|
| `router` | 메시지가 6개 초과면 요약 노드로, 아니면 바로 답변 노드로 |
| `summarize_conversation` | 최근 2개를 뺀 메시지 + "요약해 줘" 요청으로 요약을 만들고, 그 메시지들을 `RemoveMessage`로 삭제 |
| `call_model` | 요약이 있으면 system 메시지로 앞에 붙여서 답변 |

기존 요약이 있으면 "지금까지의 요약 + 새 메시지"를 합쳐 다시 요약한다. 요약이 대화와 함께 굴러가며 갱신되는 구조다.

> **보충**: `class State:`에 `TypedDict` 상속이 빠져 있다(강사님 코드도 같다). 직접 확인해 보니 StateGraph는 클래스의 type hint만 읽어서 Schema를 만들기 때문에 상속 없이도 동작했다. 그래도 노드 안에서 `state.get(...)`처럼 dict로 다루므로 `TypedDict`를 상속해 두는 게 의도가 분명하고 에디터의 타입 검사도 받을 수 있다. 주석의 `class State(MessagesState)`는 `messages: Annotated[list, add_messages]`가 미리 정의된 State를 상속하는 방법이다.

```python
import sqlite3
# 그래프 구성

## STATE, 노드생성
workflow = StateGraph(State)

workflow.add_node("call_model", call_model)
workflow.add_node("summarize_conversation", summarize_conversation)

## 엣지
workflow.add_conditional_edges(
    START, #출발지
    router,
    ["call_model", "summarize_conversation"] # PATH설정 : router 반환 식별값과 노드 이름이 같으면 list로 지정
)

workflow.add_edge("summarize_conversation", "call_model")
workflow.add_edge("call_model", END)

## checkpointer 생성

conn = sqlite3.connect(
    "checkpointer.db", #데이터베이스 파일경로 (로컬에 있음)
    check_same_thread=False, #langraph에서 쓰려면 필요
    isolation_level=None #(AUTO)
) # DB연결
checkpointer = SqliteSaver(conn)
graph = workflow.compile(checkpointer=checkpointer)
```

![요약 챗봇 그래프](/images/llm/fig-langgraph-summary.png)

조건부 엣지의 출발지가 `START`다. 그래프에 들어오자마자 요약이 필요한지 판단한다.

> **보충**: `check_same_thread=False`는 SQLite 연결을 만든 스레드가 아닌 다른 스레드에서도 쓸 수 있게 하는 옵션이다. LangGraph는 노드를 내부 스레드 풀에서 실행할 수 있어서 필요하다. `isolation_level=None`은 autocommit 모드다. 연결을 직접 만들지 않고 `SqliteSaver.from_conn_string("checkpoints.sqlite")`를 `with`로 쓰면 연결과 테이블 생성을 알아서 처리한다.

대화형으로 실행했다.

```python
config = {
    "configurable": {"thread_id":"dialog-1"}
}

print("종료하려면 !quit를 입력하세요")

while True:
    query = input("질문: ")
    if query == "!quit":
        break
    res = graph.invoke(
        {"messages": ("human",query)}, config=config
    )

    print("AI답변: ")
    print(res["messages"][-1].content)
    print("==========================================")

conn.close()
```

```text
종료하려면 !quit를 입력하세요
AI답변: 
알겠습니다. 짧게 답할게요.
==========================================
AI답변: 
네, 독산동이네요.
==========================================
AI답변: 
안양천, 호암산, 금천구청 쪽 있어요.
==========================================
AI답변: 
독산역이 제일 가까워요. 금천구청역도 근처예요.
==========================================
AI답변: 
독산역·금천구청역 쪽에 먹을 곳 꽤 있어요.  
원하시면 **한식 / 고기 / 술집 / 카페** 중으로 바로 골라드릴게요.
==========================================
AI답변: 
**스타벅스 금천구청역점** 있어요.
==========================================
AI답변: 
**봉피양 금천구청점** 추천해요.
==========================================
AI답변: 
천만에요! 또 필요하면 바로 알려드릴게요.
==========================================
```

`input()`으로 받은 질문은 출력에 남지 않아 답만 보인다. 처음에 "짧게 답해 달라"고 한 요청이 대화 끝까지 지켜졌다. 메시지가 6개를 넘은 뒤로 첫 요청 메시지는 지워졌을 텐데도 유지된 건 요약에 그 내용이 들어갔기 때문이다.

```python
pprint(res["summary"])
```

```text
('사용자는 답변을 짧게 원하며 독산동에 있다고 했다.  \n'
 '근처 역으로는 독산역, 금천구청역을 안내했다.  \n'
 '이후 맛집을 물었고, 한식/고기/술집/카페 중으로 나눠 추천하겠다고 했다.  \n'
 '마지막으로 카페를 하나만 알려달라고 요청했다.')
```

요약 첫 줄이 "사용자는 답변을 짧게 원하며"다. 대화 내용뿐 아니라 **응답 스타일 요청**까지 요약에 남아 이후 답변에 반영됐다. 반대로 "안양천, 호암산" 같은 세부 답은 요약에서 빠졌다. 요약 방식의 손실이 이런 모양이다.

> **보충**: `{"messages": ("human", query)}`처럼 리스트가 아닌 튜플 하나를 넣어도 동작한다. `add_messages`가 단일 메시지도 리스트로 감싸 처리하기 때문이다. `call_model`이 `{"messages": response}`로 리스트 없이 반환하는 것도 같은 이유로 동작한다.

## 장기 메모리

장기 메모리는 **여러 대화 세션에 걸쳐 살아남는** 기억이다. 채팅 내용을 통째로 저장하는 게 아니라, 대화에서 **사용자의 중요한 정보를 추출해서** 저장한다.

### 무엇을 저장하나

| 유형 | 예 | 활용 |
|---|---|---|
| **사용자 정보·선호** | "윈도우즈 쓰는 개발자, 답변은 한국어로" → `{"os": "Windows", "occupation": "developer", "preferred_language": "Korean"}` | 모든 새 대화의 system prompt에 추가. "가상환경 만드는 법"을 물으면 Windows 명령어로 한국어 답변 |
| **과거 작업 사례** | `{"task": "SQL 쿼리 속도 개선", "approach": "인덱스 힌트 + EXPLAIN ANALYZE", "outcome": "3.2초 → 0.4초"}` | 비슷한 요청에 few-shot 예제로 추가 |
| **실행 규칙·지침** | 피드백을 받아 "검색 전 핵심어와 제외어를 분리한다"를 지침에 추가 | 에이전트가 자기 system prompt를 갱신 |

```python
# 장기 기억 저장에서 중요한 것은 무엇을 저장시킬지 설계를 잘해야함
```

### 언제 저장하나

| 방식 | 동작 | 장점 | 단점 |
|---|---|---|---|
| **핫 패스** (hot path) | 응답 도중 모델이 "이건 기억하자"고 판단해 즉시 저장 | 다음 턴부터 바로 반영 | 판단 부담이 응답 지연으로 |
| **백그라운드** | 응답과 분리된 별도 작업으로 정리해 저장 | 응답이 느려지지 않음 | 언제 정리할지 정해야 하고, 그사이엔 반영 안 됨 |

### Store: namespace / key / value

LangGraph는 **단기 메모리는 Checkpointer, 장기 메모리는 Store**로 관리한다. Store의 데이터는 스레드에 묶이지 않는다.

| 요소 | 의미 | 파일에 비유 |
|---|---|---|
| namespace | 데이터를 분류하는 계층 경로 (tuple, 길이 제한 없음) | 폴더 경로 |
| key | namespace 안에서 데이터를 구분하는 이름 | 파일 이름 |
| value | 실제 데이터. JSON 직렬화 가능한 값, 보통 dict | 파일 내용 |

```python
store.put(
    ("users", "user_123", "profile"), # namespace
    "basic_info",                     # key
    {                                 # value
        "role": "AI instructor",
        "language": "Korean"
    }
)
```

```text
users/
└── user_123/
    └── profile/
        └── basic_info
            └── {"role": "AI instructor", "language": "Korean"}
```

```python
# store put => 계층적으로 저장되는 장기기억 dict 형태로 넣어둠
```

| 작업 | 메서드 | 비고 |
|---|---|---|
| 저장 | `put(namespace, key, value)` | 없으면 추가, 있으면 갱신 |
| 수정 | `put()` | 같은 namespace + key에 다시 저장 |
| 조회 | `get(namespace, key)` | `Item` 객체 반환, 없으면 `None` |
| 검색 | `search(namespace_prefix, filter=, query=, limit=)` | `filter`는 조건 검색, `query`는 의미 기반 검색(index 필요) |
| 삭제 | `delete(namespace, key)` | |

공식 Store는 `InMemoryStore`(RAM, 테스트용), `SqliteStore`(파일 DB, 소규모), `PostgresStore`(운영 환경) 세 가지다. 뒤의 둘은 `langgraph-checkpoint-sqlite`, `langgraph-checkpoint-postgres` 패키지가 필요하다. 그래프에는 compile 때 연결하고, 보통 Checkpointer와 함께 건다.

```python
graph = builder.compile(checkpointer=checkpointer, store=store)
```

```python
## STORE를 접근하는 방식은 2가지임
```

| 접근 위치 | 방법 |
|---|---|
| Node | 두 번째 파라미터 `runtime: Runtime`을 선언하면 `runtime.store`로 접근 |
| Tool | tool은 Runtime을 받지 않으므로 `langgraph.config.get_store()` |

```python
def answer_node(state: State, runtime: Runtime):
    ...
    runtime.store.get(namespace, key) # 조회
    runtime.store.put(namespace, key, value) # 저장
```

### SqliteStore 실습

```python
from langgraph.store.sqlite import SqliteStore
from langchain_openai import OpenAIEmbeddings # embedding 사용자의 정보를 의미기반으로 조회하기 위함
import os

os.makedirs('longterm_memory', exist_ok=True)
with SqliteStore.from_conn_string(
    "ltm.db",
    index={ #필수는 아니지만 임베딩으로 의미기반으로 검색할떄는 필요한 값
                "dims": 1536,
                "embed": OpenAIEmbeddings(),
                "fields": ["format"] #의미기반 검색 가능 필드를 선택, 생략-모든 필드들 (선택하는게 좋음 모든걸 임베딩할 필요는 없기 때문에)
            }
) as store:
    store.setup() #DB 처음 연결 후 1번은 반드시 실행 

    # 저장
    store.put(
        ("users", "user_123", "preferences"),
        "response_style",
        {"language": "Korean", "tone": "clear", "format": "markdown", "style": "simple"}
    )

    store.put(
        ("users", "user_123", "information"),
        "basic_info",
        {"name": "이순신", "age": 25, "email": "leess@example.com"}
    )

    store.put(
        ("users", "user_321", "preferences"),
        "response_style",
        {"language": "English", "tone": "kindly", "format": "xml", "style": "simple"}
    )
    store.put(
        ("users", "user_321", "information"),
        "basic_info",
        {"name": "유관순", "age": 33, "email": "ruyks@example.com"}
    )


    ##################################
    # get() - namespace와 key로 검색
    ##################################

    item = store.get(("users", "user_123", "preferences"), "response_style")
    # print(item) # 속성(istance): namespace, key, value
    # if item:
    #     print(item.value)   # {'language': 'Korean', 'tone': 'clear', 'format': 'markdown'} # system prompt 만들때 씀

    ##################################
    #  search() - filter
    ##################################
    result = store.search(
        ("users", "user_123", "preferences"),
        filter={"language":"Korean"} # ==, 여러개 설정하면 AND 조건
    ) 

    #################################
    #  search() - filter 비교 연산 - $eq(=), $ne(not =), $gt(크다), $lt(작다), $gte(크다), $lte(작다)
    #################################
    result = store.search(
        ("users", "user_123", "information"),
        filter={"age":{"$gt":20}} # {"연산자":피연산자}
    )


    ##################################
    #  search() - query (의미기반 검색)
    ##################################
    result = store.search(
        ("users",),
        query="email에 ruy가 들어간 것을 조화해줘.",
        limit=1
    )

    for item in result:
        print(item)
        print(item.value)
```

```text
Item(namespace=['users', 'user_321', 'information'], key='basic_info', value={'name': '유관순', 'age': 33, 'email': 'ruyks@example.com'}, created_at='2026-07-10T05:41:21', updated_at='2026-07-10T05:41:21', score=0.8117895871400833)
{'name': '유관순', 'age': 33, 'email': 'ruyks@example.com'}
```

`search`의 첫 인자는 **namespace의 앞부분(prefix)** 이다. `("users",)`로 주면 모든 사용자의 모든 하위 namespace를 대상으로 찾는다. 의미 검색 결과에는 유사도 `score`가 붙는다.

> **보충**: `"fields": ["format"]`은 임베딩할 필드를 고르는 옵션이라, 이대로라면 `format`이 없는 `basic_info`는 의미 검색에 안 걸려야 할 것 같다. 가짜 임베딩 함수로 무엇이 임베딩되는지 찍어 보니(langgraph-checkpoint-sqlite 3.1.1), `put` 때 `fields`와 상관없이 **value 전체가 JSON 문자열**(`{"email": "ruyks@example.com", "name": "유관순"}`)로 임베딩됐다. 그래서 `basic_info`도 검색 대상이 됐다. 이 옵션의 동작은 버전에 따라 다를 수 있으니 실제로 무엇이 임베딩되는지 확인하고 쓰는 게 안전하다.
>
> 또 "ruy가 들어간 email"처럼 **정확한 문자열 포함 여부는 의미 검색이 보장하지 않는다.** 이번엔 맞았지만, 그런 조건은 `filter`나 일반 DB 쿼리로 처리하는 것이 맞다.

`os.makedirs('longterm_memory', ...)`로 폴더를 만들었지만 DB 경로는 `"ltm.db"`라서 폴더는 쓰이지 않는다. 폴더 안에 두려면 `"longterm_memory/ltm.db"`로 줘야 한다.

## Human-in-the-Loop (HITL)

**HITL은 AI의 의사결정 과정에 사람이 직접 개입해 검증, 승인, 수정, 피드백을 주는 설계 패턴**이다. LangGraph에서는 그래프를 특정 노드에서 **멈추고(pause)**, 사람의 입력을 받아 **다음 방향을 정하거나 State를 바꾼 뒤 재개**한다. 멈춘 지점을 저장해야 하므로 **Checkpointer가 필수**다.

| 쓰는 때 | 예 |
|---|---|
| 결과 승인 | 이메일 발송, 송금, 배포 전 확인 |
| 모호성 해결 | "그거 예약해줘"에서 "그거"가 무엇인지 묻기 |
| 중간 결과 수정 | AI가 쓴 초안을 사람이 고친 뒤 발행 |
| 규제 준수 | 금융·의료·법률 도메인의 필수 검토 |
| 도구 실행 전 확인 | DB 삭제, 결제 실행 |
| 학습 피드백 | 틀린 부분을 사람이 바로잡아 흐름 재조정 |

| API | 역할 |
|---|---|
| `interrupt(value)` | 실행을 멈추고 외부 입력을 기다림. `value`는 사람에게 보여 줄 내용 |
| Checkpointer | 멈춘 지점을 저장 (필수) |
| `Command(resume=...)` | 멈춘 곳에 사람의 입력을 전달하며 재개 |
| `graph.update_state()` | 멈춘 동안 State를 직접 수정 |

멈추는 방식은 노드 안에서 `interrupt()`를 부르는 **Dynamic Interrupt**와, compile 때 `interrupt_before=["노드"]`로 지정하는 **Static Interrupt**가 있다. 최신 버전은 Dynamic 방식을 권장한다.

### 빠진 정보를 사람에게 묻는 그래프

이름, 나이, 키를 받아 인사말을 만드는데, 빠진 값이 있으면 멈추고 물어본다.

```python
from typing import Annotated
from typing_extensions import TypedDict
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import InMemorySaver

from langgraph.types import Command, interrupt  # Command(실행), interrupt(중단)

from dotenv import load_dotenv
load_dotenv()
```

```python
# HITL 이용해서 사용자로부터 추가정보를 입력받는 예제. 
class State:
    messages: Annotated[list, add_messages]
    name: str
    age: int
    tall: float

model = ChatOpenAI(model="gpt-5.4-mini")

# 인삿말을 생성하는 노드
def write_greeting(state: State):
    prompt = f"이름: {state['name']}, 나이: {state['age']}, 키: {state['tall']}\n위의 정보들을 바탕으로 인삿말을 100글자 이내로 작성해줘."
    res = model.invoke(prompt)
    # name, age, tall은 state 초기화 목적이 아니라 checkpointer의 초기화가 목적
    return {"messages": [res], "name": None, "age": None, "tall": None}

def check_info(state:State):
    #이름, 나이, 키 중에서 누락된 정보가 있는지 확인 후에 입력을 받는다.
    name = state.get("name")
    age = state.get("age")
    tall = state.get("tall")
    # 호출할 때 사용자가 전달하지 않는 값이 있으면 일시 멈추고 다시 입력받는다.
    if name is None or name == "":
        name = interrupt({"요청":"이름을 입력하세요."}) # 멈춘 곳에서 사용자에서 보여줄 메세지.
    if age is None:
        age = interrupt({"요청":"나이을 입력하세요."})
    if tall is None:
        tall = interrupt({"요청":"키를 입력하세요."})

    return {"name":name, "age":age, "tall":tall} #여기서 age에서 interrupt()가 발생하면 아직 return까지 도달하지 않았기 때문에 age와 tall은 State에 기록되지 않습니다.
```

`write_greeting`이 끝에 `name`, `age`, `tall`을 `None`으로 돌려놓는 이유가 주석에 있다. 같은 스레드로 다시 실행하면 Checkpointer가 지난 값을 복원하므로, 비워 두지 않으면 다음 사람에게 이전 사람의 정보로 인사하게 된다.

```python
# 그래프를 정의 
workflow = StateGraph(State)
workflow.add_node("check_info", check_info)
workflow.add_node("write_greeting", write_greeting)

workflow.add_edge(START, "check_info")
workflow.add_edge("check_info","write_greeting")
workflow.add_edge("write_greeting",END)

# Checkpointer
memory = InMemorySaver()

graph = workflow.compile(checkpointer=memory)
```

이름만 주고 실행한다.

```python
config = { 
    "configurable":{"thread_id":"dialog-1"}
}

res = graph.invoke({"name":"이순신"}, config=config)
res
# 정상적인 종료가 아니라 interrupt()를 통해 일시 정지 상태로 중단 된 경우
# 그때 까지의 state에 "__interrupt__" field가 포함되어 반환된다.
# "__interrupt__"에는 interrupt({key:value}) key:value가 전달된다.
```

```text
{'messages': [],
 'name': '이순신',
 '__interrupt__': [Interrupt(value={'요청': '나이을 입력하세요.'}, id='c615791a60b4c78c627d9def5f056fc8')]}
```

```python
if res.get("__interrupt__"): # 일시중지
    print(res.get('__interrupt__')[-1].value) # value라는 instance변수에 interrupt요청이 들어가 있음
```

```text
{'요청': '나이을 입력하세요.'}
```

```python
age = 30 # 이 나이를 넣어서 workflow를 재개 => command() 이용
cmd = Command(resume=age) # 멈춘 지점에 전달할 값을 전달해서 재개한다

res2 = graph.invoke(cmd, config=config)
res2
```

```text
{'messages': [],
 'name': '이순신',
 '__interrupt__': [Interrupt(value={'요청': '키를 입력하세요.'}, id='c615791a60b4c78c627d9def5f056fc8')]}
```

재개는 새 입력 dict가 아니라 **`Command(resume=값)`** 을 `invoke`에 넘긴다. 나이를 받았으니 이제 키를 묻는다. 이 상태에서 State를 들여다보면:

아래 셀은 에러가 나는 것이 정상이다.

```python
snapshot = graph.get_state(config)

print(snapshot.values["name"])
print(snapshot.values["age"])
print(snapshot.values["tall"])
```

```text
이순신

KeyError: 'age'
```

나이 30을 넣었는데 State에 `age`가 없다. 앞의 주석 그대로, `check_info`는 키를 묻는 `interrupt()`에서 다시 멈춰 **아직 `return`에 도달하지 못했기** 때문이다. 노드의 반환값만 State에 기록된다.

여기서 중요한 동작이 하나 더 있다. **재개하면 노드는 멈춘 줄부터가 아니라 처음부터 다시 실행된다.**

> **보충**: LLM 대신 문자열로 인사하게 바꿔 직접 실행해 보면, `check_info`는 세 번 호출되고 세 번 모두 같은 State(`{'messages': [], 'name': '이순신'}`)를 받는다. 두 번째 실행에서 첫 `interrupt()`(나이)는 멈추지 않고 resume 값 30을 바로 돌려주고, 그다음 `interrupt()`(키)에서 다시 멈춘다. 세 번째 실행에서는 두 `interrupt()`가 각각 30과 182.3을 돌려주고 `return`까지 간다. `interrupt()`는 **호출 순서대로** resume 값을 짝지어 기억한다. 그래서 interrupt 앞에 있는 코드는 재개할 때마다 반복 실행되므로, 그 앞에 DB 저장이나 메일 발송 같은 부작용이 있으면 여러 번 일어난다.

마지막 키를 넣으면 끝까지 간다. 강사님 노트북의 실행 결과다.

```python
tall = 182.3
cmd2 = Command(resume=tall)
res3 = graph.invoke(cmd2, config=config)
res3
```

```text
{'messages': [AIMessage(content='안녕하세요, 이순신님! 30세의 멋진 나이와 182.3cm의 훤칠한 키가 인상적입니다. 반갑습니다!', ...)],
 'name': None,
 'age': None,
 'tall': None}
```

### 입력 루프 만들기

멈출 때마다 사용자에게 묻고 재개하는 반복문을 직접 짠 코드다.

```python
# 1. 그래프 생성 및 노드 추가
workflow = StateGraph(State)

# 노드 정의
workflow.add_node("check_info", check_info)
workflow.add_node("write_greeting", write_greeting)

# 2. 에지 설정
# check_info 실행 후, 만약 모든 정보가 다 있으면 write_greeting으로, 아니면 계속 대기(interrupt)
workflow.set_entry_point("check_info")

def router(state: State):
    if state.get("name") and state.get("age") and state.get("tall"):
        return "write_greeting"
    return "check_info"

workflow.add_conditional_edges(
    "check_info",
    router,
    {"write_greeting": "write_greeting", "check_info": "check_info"}
)

workflow.add_edge("write_greeting", END)

# 3. 컴파일 (MemorySaver는 interrupt 상태를 저장하기 위해 필수)
memory = InMemorySaver()
app = workflow.compile(checkpointer=memory)
```

```python
thread_config = {"configurable": {"thread_id": "user_1"}}

while True:
    # 1. 그래프 실행
    res = app.invoke({"messages": []}, config=thread_config)
    
    # 2. 상태 확인
    snapshot = app.get_state(thread_config)
    
    # 3. 인터럽트 발생 시 사용자 입력 받기
    if snapshot.tasks and snapshot.tasks[0].interrupts:
        msg = snapshot.tasks[0].interrupts[0].value
        print(f"AI: {msg['요청']}")
        user_input = input("사용자 입력: ")
        
        # 입력값을 전달하여 다음 단계로 진행
        app.invoke(Command(resume=user_input), config=thread_config)
    else:
        # 종료되었거나 인사말이 생성된 경우
        print("최종 응답:", snapshot.values['messages'][-1].content)
        break
```

```text
AI: 이름을 입력하세요.
AI: 이름을 입력하세요.
AI: 이름을 입력하세요.

KeyboardInterrupt: Interrupted by user
```

이름을 입력해도 계속 이름을 물어서 강제로 멈췄다. 원인은 루프 맨 위의 `app.invoke({"messages": []}, ...)`다.

1. 1회차: 새 실행 → 이름이 없으니 "이름" interrupt.
2. 이름을 넣어 `Command(resume=...)`로 재개 → `check_info`가 처음부터 다시 돌며 이름은 받지만 나이에서 다시 멈춘다. **아직 return 전이라 이름은 State에 기록되지 않았다.**
3. 2회차: 루프가 다시 `invoke({"messages": []})`를 부른다. resume이 아니라 **새 입력**이라 멈춰 있던 실행을 버리고 START부터 새로 시작한다. State에 이름이 없으니 다시 "이름" interrupt.

> **보충**: 같은 루프를 LLM 없이 직접 실행하면, 매 회차 resume 직후의 대기 상태는 "나이을 입력하세요."인데 루프가 새로 `invoke`하면서 다시 "이름을 입력하세요."로 돌아가는 것이 그대로 재현된다. 덧붙여 `router`의 `check_info → check_info` 자기 순환도 같은 원리로 문제가 된다. 정보가 빠졌을 때 `check_info`는 return하지 못하고 interrupt에서 멈추므로 router까지 가지 않는다. 즉 "아니면 계속 대기"는 router가 아니라 interrupt가 이미 하고 있다.

고치는 방법은 **처음 한 번만 입력으로 실행하고, 그다음부터는 `Command(resume=)`만** 보내는 것이다. 판단은 반환값의 `"__interrupt__"`로 한다. 강사님 노트북의 코드와 실행 결과다.

```python
# 전체 실행 흐름
config = {"configurable":{"thread_id":"chat-1"}}
res = graph.invoke({"name":"유관순", "age":25}, config=config)
while '__interrupt__' in res: # 일시 정지 응답인 동안.
    human_input = input(res['__interrupt__'][-1].value['요청']+":")
    command = Command(resume=human_input)
    res = graph.invoke(command, config=config)

print(res['messages'][-1].content)
```

```text
안녕하세요, 유관순님! 25세의 멋진 청년으로서 175cm의 당당한 모습이 더욱 돋보입니다. 반갑습니다!
```

이름과 나이를 주고 시작했으니 키만 물었고, 입력 후 바로 인사말이 나왔다. 그래프도 router 없이 `check_info → write_greeting` 일직선 그대로다.

## 정리

| 구분 | 단기 메모리 | 장기 메모리 |
|---|---|---|
| 저장소 | Checkpointer (`InMemorySaver`, `SqliteSaver`, `PostgresSaver`) | Store (`InMemoryStore`, `SqliteStore`, `PostgresStore`) |
| 구분 단위 | `thread_id` | namespace + key |
| 연결 | `compile(checkpointer=)`, `create_agent(checkpointer=)` | `compile(store=)` |
| 저장 시점 | 노드 실행마다 자동 | 직접 `put()` (핫 패스 / 백그라운드) |
| 조회 | `get_state(config)`, `get_state_history(config)` | `get()`, `search(filter=, query=)` |

| 긴 대화 처리 | 언제 |
|---|---|
| `trim_messages` | 모델 입력만 줄이고 기록은 남길 때 |
| `RemoveMessage` | State에서 영구히 지울 때 |
| 요약 노드 | 오래된 맥락을 압축해서라도 유지해야 할 때 |

- LLM은 stateless다. 기억은 **애플리케이션이 저장했다가 다시 넣어 주는 것**이다. 그러려면 노드가 `messages` 전체를 모델에 넘겨야 한다.
- 단기 메모리가 없는 스레드에서 "아까 그거"를 물으면 LLM이 **없는 맥락을 지어낼 수 있다**.
- 요약은 응답 스타일 같은 요청을 오래 유지시키지만 세부 내용은 잃는다.
- `interrupt()`로 멈춘 노드는 return 전이라 그 사이 값이 State에 없다. 재개하면 노드가 **처음부터** 다시 실행된다.
- 재개는 `Command(resume=)`로만 한다. 새 입력으로 `invoke`하면 멈춘 실행을 버리고 처음부터 시작한다.

다음은 Agent의 지식을 문서 조각이 아니라 **관계**로 저장하는 GraphRAG다.
