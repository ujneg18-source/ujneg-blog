---
title: "RNN과 LSTM: 문맥을 담는 임베딩"
description: "같은 단어라도 문맥에 따라 다른 벡터를 만드는 Contextualized Word Embedding, 순서를 기억하는 Recurrent Layer와 hidden state, NLP 문제 유형별 RNN 구조(Many to One, Many to Many, Seq2Seq), 양방향·다층 RNN, PyTorch nn.RNN·nn.LSTM·nn.GRU의 입출력 shape, BPTT와 기울기 소실, LSTM의 세 Gate와 GRU를 정리합니다."
category: 'Tech'
subcategory: 'NLP'
series: '자연어 처리'
seriesOrder: 7
originalNotebook: "08_Text_to_Vector_contextualized_word_embedding_RNN.ipynb"
tags: ["NLP"]
date: 2026-06-16T10:00:00+09:00
thumbnail: '../../../assets/images/notes/nlp/nlp-rnn-lstm.webp'
---

> SKN31 자연어 처리 과정 노트북 `08_Text_to_Vector_contextualized_word_embedding_RNN.ipynb`를 바탕으로 정리했습니다.
> 코드는 PyTorch 2.5(CPU)에서 실행한 결과입니다. 입력이 난수라 출력 값은 노트북과 다르지만 shape은 같습니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- Contextualized Word Embedding: 고정 임베딩과의 차이
- Sequential 데이터와 Recurrent Layer, 메모리 시스템, hidden state
- NLP 문제 유형과 RNN 구조: Many to One, One to Many, Many to Many, Seq2Seq
- 양방향(Bidirectional) RNN, 다층(Stacking) RNN
- PyTorch `nn.RNN`, `nn.LSTM`, `nn.GRU`의 입력·출력 shape
- BPTT와 기울기 소실, LSTM의 Gate, GRU

## Contextualized Word Embedding

**문맥 기반 단어 임베딩**은 단어가 **문장에서 실제로 어떤 의미로 쓰였는지**를 반영해 벡터를 만든다. Word2Vec처럼 단어마다 고정된 벡터 하나를 쓰는 게 아니라, **같은 단어라도 문맥이 바뀌면 다른 벡터**를 만든다.

- 기존 Word Embedding은 **동음이의어**가 같은 벡터가 된다. "**밤**에 만나자"와 "어제 먹은 **밤** 정말 맛있었다"의 '밤'은 뜻이 다른데 Word2Vec에서는 같은 벡터다
- Contextualized Word Embedding은 두 '밤'을 **서로 다른 벡터**로 표현한다. 동음이의어 처리, 문장 의미 분석, 문맥 기반 질의응답의 정확도가 크게 오른다

```text
# 고정된 값은 동음이의어, 다의어 등의 문제가 생겨서 문맥에서 계속해서 다른 벡터값을 나오게 해서 의미의 정확도를 높임
```

```text
# 워드투벡은 단어사전을 기반으로 만들어짐
# 단어 만개 임베딩 벡터의 차원 100개 

# 10000 X 100 의 행렬을 만듦
# 하나의 단어는 여러 뜻이 있어도 한 행렬에서 여러 뜻의 값을 가진 단어가 되버림 -> 문제 -> 문맥에 안에서  벡터값을 다르게해서 학습
```

> - **동음이의어**: 발음은 같은데 뜻이 다른 단어. 먹는 "밤"과 해가 진 "밤", 먹는 "배"·타는 "배"·몸의 "배"
> - **동음다의어**: 하나의 단어가 서로 관련된 여러 뜻을 가진 것. "머리를 끄덕이다", "머리가 좋다", "머리가 길다". [네이버 사전](https://ko.dict.naver.com/#/entry/koko/a90afd48126045a09bc9b6c634b7ff54)에는 "머리"에서 파생된 뜻이 11가지 나온다

### 구현 방식

1. **문장 전체를 입력으로 받는다.** 토큰마다 먼저 **초기 임베딩(Embedding Layer)**을 거친다. 이 단계는 Word2Vec처럼 동음이의어도 하나의 벡터인 **정적(static) 임베딩**이다
2. **깊은 신경망을 통과하며 문맥 정보를 섞는다.** RNN은 토큰을 순서대로 처리하고, Transformer는 Self-Attention을 반복해서, 각 토큰이 앞뒤 단어와 문장 구조를 참조하게 만든다
3. **문맥이 반영된 최종 토큰 벡터**(Contextualized Embedding Vector)가 나온다

| 세대 | 모델 유형 | 특징 |
|---|---|---|
| 1세대 | RNN 기반 (LSTM, GRU) | 순차 처리. 긴 문맥 학습이 어렵다. ELMo가 대표 |
| 2세대 | Transformer 기반 | 병렬 처리, 장기 의존성 해결. BERT, GPT 계열이 대표 |

현재는 "Attention Is All You Need"(2017) 논문의 **Self-Attention**을 쓰는 Transformer가 사실상 표준이다.

```python
# 보충: 같은 단어 id → Embedding은 같은 벡터, RNN을 거치면 문맥마다 다른 벡터
import torch
import torch.nn as nn

vocab = {"밤": 0, "에": 1, "만나자": 2, "어제": 3, "먹은": 4, "맛있다": 5}
emb = nn.Embedding(num_embeddings=len(vocab), embedding_dim=4)
rnn = nn.RNN(input_size=4, hidden_size=4, batch_first=True)

s1 = torch.tensor([[vocab[w] for w in ["밤", "에", "만나자"]]])
s2 = torch.tensor([[vocab[w] for w in ["어제", "먹은", "밤", "맛있다"]]])

e1, e2 = emb(s1), emb(s2)
o1, _ = rnn(e1)
o2, _ = rnn(e2)
print("Embedding '밤' (문장1):", e1[0, 0].detach())
print("Embedding '밤' (문장2):", e2[0, 2].detach())
print("RNN 출력  '밤' (문장1):", o1[0, 0].detach())
print("RNN 출력  '밤' (문장2):", o2[0, 2].detach())
```

```text
Embedding '밤' (문장1): tensor([-1.1258, -1.1524, -0.2506, -0.4339])
Embedding '밤' (문장2): tensor([-1.1258, -1.1524, -0.2506, -0.4339])
RNN 출력  '밤' (문장1): tensor([ 0.6311,  0.4439,  0.4266, -0.1284])
RNN 출력  '밤' (문장2): tensor([ 0.3640,  0.3352,  0.5297, -0.5137])
```

학습 전의 무작위 가중치지만 원리는 보인다. `nn.Embedding`은 id로 행을 꺼내는 lookup이라 '밤'은 어느 문장에서든 같은 벡터다. RNN을 거치면 문장 1의 '밤'은 앞에 아무것도 없고, 문장 2의 '밤'은 "어제 먹은"을 기억한 상태에서 계산돼서 서로 다른 벡터가 된다.

## RNN (Recurrent Neural Network)

- Sequential 데이터의 특성을 잘 뽑는 **Recurrent Layer를 Feature Extractor로 쓰는** 딥러닝 모델
- 시계열 데이터, 자연어 처리, 음성 데이터 처리에 많이 쓴다

```text
# 순차데이터로 부터 feature를 추출
# 문서는 순서가 중요한 데이터

# 순서를 기억함 =>
```

```text
# RNN - embeding Layer /ReCurrent-특징추출할때 사용 / 추론(최종)

# 순수 리니어 => DNN

#기존
# x값 -> 알고리즘 -> y값

#RNN
# x값 -> ?값 -> 반복문 -> y값


# 요약하자면
# "과거를 기억하지 못하고 현재 입력만 처리하는 기존 DNN과 달리,"
# " RNN은 임베딩 레이어를 거쳐 입력된 데이터의 문맥(특징)을 과거의 기억(?값)과 함께 버무려 가며 추출하고, "
# "최종 추론을 해내는 모델이다"



#RNN은 순차데이터에만 특화되어있는 모델임 --! (메모리가 주요특성)
```

메모의 `?값`이 아래에 나오는 **hidden state**다.

### Sequential 데이터

- **순서가 있고 그 순서 정보가 중요한** 데이터. 순서가 바뀌면 의미가 바뀌거나 손상된다
- 현재 값을 처리할 때 **이전까지의 처리 결과를 같이 고려**해야 한다 (순서의 흐름 = 문맥)
- 예: 자연어 텍스트, 일정 주기로 샘플링한 영상·음성, 시계열 데이터

> **Time series**: Sequential 데이터 중 순서뿐 아니라 **데이터가 발생한 시점** 정보까지 중요한 데이터

```text
# CNN/DNN/RNN => 특징추출하는 레이어 방식이 다름
```

### RNN의 구조

Feature Extractor로 Recurrent Layer를 쓰고, 그 결과를 Estimator Layer(추론층)에 넘긴다.

![RNN 개요](/images/nlp/fig-rnn-rnn-outline.png)

```text
# word embedding (Vector): 

# word(text=단어,문서) => 원핫인코딩 => [의미-숫자] => feature    == X값

# 빈도, 품사, 글자수, 자모수, 의미 = 단어단위나 문서단위나 각각 가능


# embedding = llm에서 자연어 처리하는게 중요해짐
# llm RAG-embedding db 사용
```

### Recurrent Layer와 메모리 시스템

- Fully Connected Layer나 Convolutional Layer는 **순서를 고려하지 않고** 특성을 뽑는다
- Recurrent Layer는 순서대로 들어오는 데이터를 반복 처리하면서 **순서를 고려한** feature vector를 뽑는다
- 순서를 고려한다는 것은 **이전 순서의 내용을 기억한다**는 것이다. 이것을 **메모리 시스템**이라고 한다
  - **이전 단계의 처리 결과를 기억하고 현재 단계 처리에 사용한다.** Recurrent Layer의 핵심 로직이다

> 순서대로 처리하는 각 단계를 **time step**이라고 한다.

![메모리 시스템](/images/nlp/fig-rnn-01-memory-system.png)

예를 들어 4일간의 주가로 5일째 주가를 예측하려면 4일 치를 순서대로 기억하고 있어야 한다.

### Simple RNN

![Simple RNN](/images/nlp/fig-rnn-02-simplernn.png)

![Simple RNN 펼친 구조](/images/nlp/fig-rnn-03-simplernn-2.png)

- Recurrent Layer는 Linear layer에 **재귀 순환(반복)** 로직이 들어간 것으로 이해할 수 있다
- 한 step은 **현재 시점의 입력 $X_t$**와 **이전 시점까지의 처리 결과 $h_{t-1}$**을 같이 받는다
- 둘에 각각의 weight $W_{xh}$, $W_{hh}$를 곱해 더하고, tanh로 비선형성을 더한 값이 현재 time step의 출력이다

$$
h_t = \tanh(X_t W_{xh} + h_{t-1} W_{hh} + b)
$$

- 이 출력은 **현재 time step의 feature**이자 **다음 time step의 hidden state 입력**이다
- **매 time step마다 같은 weight** $W_{xh}$, $W_{hh}$를 쓴다. time step마다 새 weight가 생기는 게 아니다

> **Hidden state**: 이전 step까지의 처리 결과. **메모리 시스템의 기억**에 해당하고, 현재 입력과 함께 다음 계산에 들어간다.

```python
# 보충: nn.RNN과 위 식을 직접 계산한 결과 비교
rnn = nn.RNN(input_size=3, hidden_size=2, batch_first=True)
x = torch.randn(1, 4, 3)                  # 배치 1, time step 4, feature 3
out, h_last = rnn(x)

W_xh, W_hh = rnn.weight_ih_l0, rnn.weight_hh_l0
b = rnn.bias_ih_l0 + rnn.bias_hh_l0
h = torch.zeros(2)
for t in range(4):
    h = torch.tanh(x[0, t] @ W_xh.T + h @ W_hh.T + b)   # 같은 W를 매 step 재사용
    print(f"t={t}  직접 계산: {h.detach()}  nn.RNN: {out[0, t].detach()}")
```

```text
t=0  직접 계산: tensor([-0.2060, -0.9416])  nn.RNN: tensor([-0.2060, -0.9416])
t=1  직접 계산: tensor([0.9755, 0.9355])  nn.RNN: tensor([0.9755, 0.9355])
t=2  직접 계산: tensor([-0.8684, -0.5689])  nn.RNN: tensor([-0.8684, -0.5689])
t=3  직접 계산: tensor([ 0.3338, -0.0604])  nn.RNN: tensor([ 0.3338, -0.0604])
```

for 문으로 같은 weight를 반복 적용한 값과 `nn.RNN`의 출력이 같다. 메모의 "x값 → ?값 → 반복문 → y값"이 이 for 문이다.

### NLP 문제 유형과 RNN 구조

| 유형 | 입력 → 출력 | 구조 | 응용 |
|---|---|---|---|
| **Many to One** | Sequence → 벡터 1개 | ![many to one](/images/nlp/fig-rnn-04-many-to-one.png) | 텍스트 분류(감성 분석) |
| **One to Many** | 벡터 1개 → Sequence | ![one to many](/images/nlp/fig-rnn-04-one-to-many.png) | 이미지 캡셔닝, 문장 생성 |
| **Many to Many** | Sequence → Sequence (같은 길이) | ![many to many](/images/nlp/fig-rnn-04-many-to-many.png) | 개체명 인식, 품사 태깅 |
| **Seq2Seq** | Many to One + One to Many. Encoder가 특성을 뽑고 Decoder가 그걸로 결과를 생성 | ![seq2seq](/images/nlp/fig-rnn-04-seq2seq.png) | 기계 번역, 챗봇 |

- **텍스트 분류**: 문장을 분류한다. 대표가 감성 분석(긍정·중립·부정)이다
- **이미지 캡셔닝**: 이미지를 설명하는 문장을 만든다
- **개체명 인식(NER)**: 각 단어의 종류를 찾는다. "미국에 사는 톰은 스무살입니다" → 미국: 위치, 톰: 이름, 스무살: 나이
- **품사 태깅**: 각 토큰의 품사를 찾는다
- **챗봇**: Encoder가 질문을 처리하고 Decoder가 답변을 생성한다
- **기계 번역**: Encoder가 원문을 처리하고 Decoder가 번역문을 생성한다

다음 글의 감성 분석이 Many to One, 그다음 챗봇이 Seq2Seq다.

### 양방향 (Bidirectional) RNN

- 같은 정보를 **정방향과 역방향** 두 방향으로 넣어 정확도를 높인다
- **Non-Auto Regressive** 모델에서 권장된다

> - **Auto Regressive 모델**: 이전 time step의 출력을 다음 time step의 입력으로 쓰는 구조. 텍스트 생성이 대표적이다. 앞의 출력에 의존하니 뒤를 미리 볼 수 없어 bidirectional을 쓸 수 없다
> - **Non Auto Regressive 모델**: 현재 상태가 앞뒤 모두에 따라 정해지는 경우. 앞뒤를 다 참조하면 성능이 오르므로 bidirectional을 권장한다

![양방향 RNN](/images/nlp/fig-rnn-08-bidirectional.png)

### 다층 (Stacking) RNN

- Recurrent Layer를 쌓아 **표현 능력(representational capacity)**을 늘린다
- 아래층의 **모든 time step 출력**이 위층의 입력이 된다
- 표현 능력이 늘지만 계산 비용이 커지고 **과대적합**이 생길 수 있다. Dropout을 넣는데, Recurrent Layer에서는 매 time step마다 적용한다

![다층 RNN](/images/nlp/fig-rnn-08-multi-layer-rnn.png)

## PyTorch RNN Layer

[`nn.RNN`](https://pytorch.org/docs/stable/generated/torch.nn.RNN.html)의 주요 파라미터

| 파라미터 | 내용 |
|---|---|
| `input_size` | 입력 데이터의 feature 수 (자연어면 embedding 차원) |
| `hidden_size` | hidden state 크기 (출력 feature 수) |
| `num_layers` | 몇 층으로 쌓을지 |
| `nonlinearity` | 활성 함수. `'tanh'`(기본) 또는 `'relu'` |
| `batch_first` | True면 `(batch, seq_len, feature)`, False(기본)면 `(seq_len, batch, feature)` |
| `dropout` | 층 사이 Dropout 비율 (num_layers가 2 이상일 때) |
| `bidirectional` | 양방향 여부. 기본 False |

### 입력과 출력의 shape

```python
rnn = nn.RNN(...)
out, hidden = rnn(input_data, hidden_state)
```

| | shape (`batch_first=False`) | 의미 |
|---|---|---|
| `input_data` | `(seq_len, batch, input_size)` | PyTorch는 기본으로 sequence 길이가 batch보다 **먼저** 온다 |
| `hidden_state` (입력) | `(D × num_layers, batch, hidden_size)` | 첫 time step에 넣을 hidden state. 생략하면 0 |
| `out` | `(seq_len, batch, D × hidden_size)` | **모든 time step**의 출력. Many to Many에서 쓴다 |
| `hidden` (출력) | `(D × num_layers, batch, hidden_size)` | **마지막 time step**의 출력(층마다). Many to One에서 쓴다 |

D는 양방향이면 2, 아니면 1이다. `batch_first=True`면 `input_data`와 `out`의 앞 두 축만 바뀌고 `hidden`은 그대로다.

- 예) 주가 데이터: feature 4개(시가, 종가, 최고가, 최저가), 100일 치가 하나의 입력, 배치 30 → `(100, 30, 4)`

![입력 shape](/images/nlp/fig-rnn-07-input-shape.png)

- hidden size가 256이면 출력은 `(100, 30, 256)`

![hidden state shape](/images/nlp/fig-rnn-07-hidden-state-shape.png)

```python
import torch
import torch.nn as nn

torch.__version__
```

```text
'2.5.1'
```

```python
# 더미데이터 (X)
## 기준: batch_first: False
## shape: (seq_length, batch_size, feature 수-자연어 처리: Embedding vector 차원)

input_data = torch.randn(30, 100, 4)

# 30개의 토큰 / 1번에 100개-문서 학습/ 각각 4개의 임베딩 = feature 구성

# "4차원짜리 단어 벡터(Feature=4)로 이루어진"
# "30개짜리 단어 길이의 문장(Seq_length=30)들을"
# "한 번에 100개씩 묶어서(Batch_size=100) 동시에 학습시킨다."
```

**단방향, 1층**

```python
# 단방향. layer: 1 
rnn1 = nn.RNN(  # nn.Linear(784, 256)
    input_size=4, # 입력 feature의 수
    hidden_size=256,
)

# 나머진 기본 값
# num_layers=1 # layer의 수
# nonlinearity="tanh" # 활성홤수.("relu")
# bidirectional=False (양방향 여부 - 단방향)
# batch_first=False (seq_len, batch_size, feature)

# rnn을 이용해서 특성(feature) 추출

out1, hidden1 = rnn1(input_data) # (입력데이터, 첫번째 timestep 처리시 입력할 hiddenstate-default: 0)


# batch_frist = True이면 순서가 (batch_frist, seq_length, hiden_size)


# out1: 모든 timestep의 hidden state
# hidden1: 마지막 timestep의 hidden state
print(out1.shape) #torch.Size([30: seq_length, 100: batch_frist, 256:hiden_size])
print(hidden1.shape) #torch.Size([1: 마지막 timestep, 100, 256])
```

```text
torch.Size([30, 100, 256])
torch.Size([1, 100, 256])
```

```python
# 보충: 1층 단방향이면 hidden은 out의 마지막 time step과 같다
torch.equal(out1[-1], hidden1[0])
```

```text
True
```

> **보충** 주석의 `hidden1.shape`의 첫 번째 1은 "마지막 timestep"이 아니라 **D × num_layers**(=1×1)다. 마지막 time step이라는 건 hidden에 담긴 값이 무엇인지에 대한 설명이고, 첫 축의 크기는 층 수와 방향 수로 정해진다. 아래 3층, 양방향 결과에서 이 축이 3, 2, 6으로 바뀐다.

**단방향, 3층**

```python
# 단방향 layer = 3

rnn2 = nn.RNN(  # nn.Linear(784, 256)
    input_size=4, # 입력 feature의 수
    hidden_size=256,
    num_layers=3
    # dropout=0.3  stacked layer의 경우 과적합 방지를 위해 dropout을 설정
)
out2, hidden2 = rnn2(input_data) #최종레이어의 shape, 마지막 학습된 토큰 기준의 shape

print(out2.shape)  # 마지막 인덱스를 조회해서 이걸 사용함
print(hidden2.shape) #layer의 수 만큼의 timestep => 모든 레이어가 있으니까 필요없음
```

```text
torch.Size([30, 100, 256])
torch.Size([3, 100, 256])
```

`out`은 **맨 위층**의 모든 time step, `hidden`은 **층마다** 마지막 time step이다.

**양방향, 1층**

```python
# 양방향, 레이어수: 1

rnn3 = nn.RNN(  # nn.Linear(784, 256)
    input_size=4, # 입력 feature의 수
    hidden_size=256,
    num_layers=1,
    bidirectional=True
)

out3, hidden3 = rnn3(input_data) #최종레이어의 shape, 마지막 학습된 토큰 기준의 shape * 레이어의 수

print(out3.shape)  #  hidden_size=256 *2(정방향+역방향)
print(hidden3.shape) #
```

```text
torch.Size([30, 100, 512])
torch.Size([2, 100, 256])
```

`out`은 정방향 256 + 역방향 256을 이어 붙여 512, `hidden`은 방향별로 하나씩 2개다.

```python
import pandas as pd

# [30, 100, 512] 중에서 "첫 번째 사람(0번 배치)"의 데이터만 쏙 빼기
# 행 자리에 콜론(:)을 넣어서 30일치는 다 가져오고, 열 자리에 0을 박습니다.
first_person_out = out3[:, 0, :]  # shape: [30, 512]

# 이제 깔끔한 2차원이 되었으니 판다스로 변환!
df_out = pd.DataFrame(first_person_out.detach().cpu().numpy())

print("--- batch_first=False 일 때, 1번째 사람의 30일치 데이터 ---")
df_out.iloc[:5, :6].round(3)  # 행 = 0~4일차(시간), 열 = 512개 피처
```

```text
--- batch_first=False 일 때, 1번째 사람의 30일치 데이터 ---
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 6열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody><tr><th class="idx">0</th><td>-0.038</td><td>0.024</td><td>0.096</td><td>0.01</td><td>-0.009</td><td>0.065</td></tr><tr><th class="idx">1</th><td>-0.17</td><td>-0.013</td><td>0.118</td><td>-0.042</td><td>-0.113</td><td>-0.062</td></tr><tr><th class="idx">2</th><td>0.017</td><td>-0.103</td><td>-0.09</td><td>0.086</td><td>-0.021</td><td>0.02</td></tr><tr><th class="idx">3</th><td>0.011</td><td>-0.041</td><td>0.196</td><td>-0.137</td><td>0.137</td><td>0.042</td></tr><tr><th class="idx">4</th><td>-0.233</td><td>0.038</td><td>0.118</td><td>0.141</td><td>-0.13</td><td>-0.071</td></tr></tbody></table></div></div>

> **보충** 노트북에서는 `print(df_out.head())`로 512열을 다 찍었다. 여기서는 앞 6열만 잘라 보였다. `detach()`는 gradient 추적을 끊는 것이고, 그래야 `numpy()`로 바꿀 수 있다.

**양방향, 3층**

```python
# 양방향, 레이어수: 3


rnn4 = nn.RNN(  # nn.Linear(784, 256)

    input_size=4, # 입력 feature의 수
    hidden_size=256,
    num_layers=3,
    bidirectional=True
    # dropout=0.3  stacked layer의 경우 과적합 방지를 위해 dropout을 설정

)

out4, hidden4 = rnn4(input_data) #최종레이어의 shape, 마지막 학습된 토큰 기준의 shape * 레이어의 수

print(out4.shape)  #  hidden_size=256 *2 (정방향+역방향)
print(hidden4.shape) # 6 = layer*2 (정방향+역방향)
```

```text
torch.Size([30, 100, 512])
torch.Size([6, 100, 256])
```

| 설정 | `out` | `hidden` |
|---|---|---|
| 단방향 1층 | (30, 100, **256**) | (**1**, 100, 256) |
| 단방향 3층 | (30, 100, 256) | (**3**, 100, 256) |
| 양방향 1층 | (30, 100, **512**) | (**2**, 100, 256) |
| 양방향 3층 | (30, 100, 512) | (**6**, 100, 256) |

방향은 `out`의 마지막 축을, 층 수와 방향은 `hidden`의 첫 축을 바꾼다.

## BPTT와 Simple RNN의 문제

- RNN의 역전파를 **BPTT(Back Propagation Through Time)**라고 한다
- time step을 거꾸로 거슬러 올라가며 gradient가 chain rule로 계속 곱해진다
- 모든 time step이 같은 weight를 쓰므로, 한 번의 학습 step에서 weight는 time step 수만큼의 gradient를 모아 업데이트된다

**Simple RNN의 문제**

- sequence가 길수록 **기울기 소실(Gradient Vanishing)**이 생겨 초기 time step이 학습되지 않는다
  - tanh의 기울기는 0~1 사이라, 여러 번 곱해지면 0에 가까워진다
- 그 결과 time step이 길어질수록 초기 정보가 hidden state에서 점점 사라지는 **기억력 소실 문제**가 생긴다

![BPTT](/images/nlp/fig-rnn-09-bptt.png)

```python
# 보충: 첫 time step 입력에 도달하는 gradient 크기 (sequence 길이별)
torch.manual_seed(0)
rnn_v = nn.RNN(input_size=4, hidden_size=32)
for seq_len in [5, 20, 50, 100]:
    x = torch.randn(seq_len, 1, 4, requires_grad=True)
    out, h = rnn_v(x)
    h.sum().backward()                     # 마지막 hidden 기준 loss
    print(f"길이 {seq_len:3}: 첫 step 입력의 gradient 크기 = {x.grad[0].norm().item():.2e}")
```

```text
길이   5: 첫 step 입력의 gradient 크기 = 2.72e-01
길이  20: 첫 step 입력의 gradient 크기 = 2.08e-05
길이  50: 첫 step 입력의 gradient 크기 = 1.65e-13
길이 100: 첫 step 입력의 gradient 크기 = 0.00e+00
```

sequence가 5일 때 0.27이던 gradient가 20이면 10만분의 1 수준, 50이면 $10^{-13}$, 100이면 float 정밀도 아래로 내려가 0이 됐다. 문장이 100토큰이면 첫 단어는 마지막 판단을 위한 학습에 사실상 아무 영향을 주지 못한다는 뜻이다.

```text
# RNN 기반
# LSTM => 성능이 좋음
# GRU => 빠름
```

이 문제를 모델 구조로 해결한 것이 **LSTM**과 **GRU**다. Sequence 처리에는 보통 이 둘을 쓴다.

## LSTM (Long Short Term Memory)

- Simple RNN을 개선한 변형 알고리즘
- **오래 기억할 것은 유지하고, 잊어버릴 것은 빨리 잊어버리자**
- 이전 time step의 처리 결과를 **두 개** 받는다

![LSTM](/images/nlp/fig-rnn-09-lstm-layer.png)

| | 의미 |
|---|---|
| **Cell State** | Long term memory. 전체 step에 대한 누적 기억 |
| **Hidden State** | Short term memory. 직전 sequence에 대한 기억 |

### LSTM Gate

- Layer 안의 여러 **Gate 연산**으로 성능을 높인다
- **Sigmoid**(0~1)로 값을 얼마나 통과시킬지 정한다. 문이 열리고 닫히는 것에 비유해서 Gate라고 부른다
- 각 Gate는 hidden state와 입력에 곱하는 자기 weight를 가진다

```text
# sigmoid (0~1) 값을 토대로 gate의 오픈 정도를 정함.
```

![LSTM 전체 구조](/images/nlp/fig-rnn-10-lstm-layer-all.png)

| Gate | 하는 일 | 그림 |
|---|---|---|
| **Forget gate** | 이전 hidden state와 현재 입력을 보고, 장기 기억(cell state)에서 **얼마나 잊을지** 정한다 | ![forget gate](/images/nlp/fig-rnn-11-forget-gate.jpg) |
| **Input gate** | 이전 hidden state와 현재 입력을 cell state에 **얼마나 반영할지** 정한다 | ![input gate](/images/nlp/fig-rnn-12-input-gate.jpg) |
| **Cell state update** | forget gate 결과를 곱해 잊을 만큼 잊고, input gate 결과를 더해 새 정보를 넣는다 | ![update](/images/nlp/fig-rnn-13-cell-state-update.jpg) |
| **Output gate** | 이전 hidden state, 현재 입력, 갱신된 cell state로 출력을 계산한다. **이 결과가 다음 step의 hidden state(단기 기억)** | ![output gate](/images/nlp/fig-rnn-14-output-gate.jpg) |

이미지 출처: [Introduction to LSTM Units in RNN (Pluralsight)](https://www.pluralsight.com/guides/introduction-to-lstm-units-in-rnn)

> **보충** 기울기 소실이 줄어드는 이유는 cell state의 갱신이 **곱셈이 아니라 덧셈**이기 때문이다. $c_t = f_t \odot c_{t-1} + i_t \odot \tilde{c}_t$에서 forget gate $f_t$가 1에 가까우면 이전 기억이 거의 그대로 다음으로 넘어가고, gradient도 이 길을 따라 크게 줄지 않고 흐른다. Simple RNN은 매 step tanh와 weight를 곱하는 길밖에 없다.

### PyTorch LSTM

[`nn.LSTM`](https://pytorch.org/docs/stable/generated/torch.nn.LSTM.html) 파라미터는 `nn.RNN`과 같다(`nonlinearity`만 없다). 입력과 출력에 **cell state**가 추가된다.

```python
out, (hidden, cell) = lstm(input_data, (hidden_state, cell_state))
```

| | shape |
|---|---|
| `input_data` | `(seq_len, batch, input_size)` |
| `out` | `(seq_len, batch, D × hidden_size)` — 모든 time step |
| `hidden` | `(D × num_layers, batch, hidden_size)` — 마지막 time step |
| `cell` | `(D × num_layers, batch, hidden_size)` — 장기 기억 |

`(hidden, cell)`을 생략하면 0이 들어간다.

```text
# 히든사이즈 => 피쳐 수 
# rnn -> tanh
```

```python
import torch
import torch.nn as nn

input_data = torch.randn(30,100,4)
```

```python
lstm1=nn.LSTM(

    input_size=4, # 입력 feature의 수
    hidden_size=256,
    # dropout=0.3  stacked layer의 경우 과적합 방지를 위해 dropout을 설정
)

out1, (hidden1, cell1) = lstm1(input_data)
print(out1.shape)
print(hidden1.shape)
print(cell1.shape)
```

```text
torch.Size([30, 100, 256])
torch.Size([1, 100, 256])
torch.Size([1, 100, 256])
```

```python
lstm2=nn.LSTM(

    input_size=4, # 입력 feature의 수
    hidden_size=256,
    bidirectional=True #양방향
    # dropout=0.3  stacked layer의 경우 과적합 방지를 위해 dropout을 설정
)

out2, (hidden2, cell2) = lstm2(input_data)
print(out2.shape)
print(hidden2.shape)
print(cell2.shape)
```

```text
torch.Size([30, 100, 512])
torch.Size([2, 100, 256])
torch.Size([2, 100, 256])
```

```python
lstm3=nn.LSTM(

    input_size=4, # 입력 feature의 수
    hidden_size=256,
    bidirectional=True, #양방향
    num_layers=3
    # dropout=0.3  stacked layer의 경우 과적합 방지를 위해 dropout을 설정
)

out3, (hidden3, cell3) = lstm3(input_data)
print(out3.shape)
print(hidden3.shape)
print(cell3.shape)
```

```text
torch.Size([30, 100, 512])
torch.Size([6, 100, 256])
torch.Size([6, 100, 256])
```

shape 규칙은 RNN과 같고, `cell`은 `hidden`과 같은 shape이다.

## GRU (Gated Recurrent Units)

- [논문](https://arxiv.org/pdf/1406.1078)
- LSTM은 기억력 소실 문제를 풀어 긴 sequence에서도 성능이 좋지만, 구조가 복잡해 **파라미터가 많고 연산량이 많다**. 데이터가 부족하면 과대적합이 생기고 학습 시간도 길다
- 이를 개선한 변형이 GRU다

**LSTM과 차이**

1. LSTM은 forget·input·output 세 Gate를 쓰고, GRU는 **reset gate와 update gate** 두 개로 흐름을 제어한다
2. LSTM의 Cell State와 Hidden State를 하나로 합쳐 **Hidden State**만 출력한다

GRU는 파라미터와 연산 비용이 적은데도 LSTM과 비슷한 성능을 내는 것으로 알려져 있다.

![GRU cell](/images/nlp/fig-rnn-23-gru-cell.png)

[이미지 출처](https://www.oreilly.com/library/view/advanced-deep-learning/9781789956177/8ad9dc41-3237-483e-8f6b-7e5f653dc693.xhtml)

- **Reset Gate**: 이전 hidden state를 현재 hidden state 계산에 **얼마나 반영할지** 비율을 정한다
  - $r_{t} = \sigma(h_{t-1}\cdot U_{r} + X_{t}\cdot W_{r})$ ($U_r$, $W_r$은 파라미터, $\sigma$는 sigmoid)
- **Update Gate**: 이전 정보 $h_{t-1}$과 현재 정보 $X_t$를 **각각 얼마나 반영할지** 정한다
  - $z_{t} = \sigma(h_{t-1}\cdot U_{z} + X_{t}\cdot W_{z})$
  - $z_t$는 이전 정보를, $1 - z_t$는 현재 정보를 얼마나 반영할지 정한다
- **출력 $h_t$**

$$
h_t = z_{t}\times h_{t-1} + \tanh(r_{t} \times h_{t-1} \cdot U + X_{t}\cdot W)\times(1-z_{t})
$$

- 이전 정보에는 $z_t$를 곱해 $h_t$에 얼마나 더할지 정한다
- 현재 정보 $X_t$에는 reset gate로 걸러 낸 이전 정보를 섞고 tanh를 씌운 뒤 $1 - z_t$를 곱한다

### PyTorch GRU

`nn.GRU`를 쓴다 ([문서](https://pytorch.org/docs/stable/generated/torch.nn.GRU.html)). 입출력은 `nn.RNN`과 같은 형태다(cell state가 없다).

> **보충** 노트북의 GRU 실습 셀은 비어 있어서, 위 RNN·LSTM과 같은 입력으로 채웠다.

```python
# 보충: GRU의 입력·출력 shape
gru = nn.GRU(input_size=4, hidden_size=256, num_layers=3, bidirectional=True)
out_g, hidden_g = gru(input_data)
print(out_g.shape)
print(hidden_g.shape)
```

```text
torch.Size([30, 100, 512])
torch.Size([6, 100, 256])
```

```python
# 보충: 같은 크기의 RNN / GRU / LSTM 파라미터 수
def n_params(m):
    return sum(p.numel() for p in m.parameters())

for cls in [nn.RNN, nn.GRU, nn.LSTM]:
    m = cls(input_size=4, hidden_size=256)
    print(f"{cls.__name__:5} {n_params(m):>8,}  (RNN의 {n_params(m) / n_params(nn.RNN(4, 256)):.0f}배)")
```

```text
RNN     67,072  (RNN의 1배)
GRU    201,216  (RNN의 3배)
LSTM   268,288  (RNN의 4배)
```

Simple RNN은 weight 세트가 1개(후보 hidden 계산), GRU는 3개(reset, update, 후보), LSTM은 4개(forget, input, output, 후보 cell)라서 파라미터가 정확히 1 : 3 : 4다. GRU는 LSTM의 3/4 크기다.

## RNN은 지금도 쓰일까

| 영역 | 현재 |
|---|---|
| 자연어 처리 | 거의 Transformer(GPT, BERT 등)로 대체됐다. RNN은 단어를 하나씩 순서대로 처리해서 **병렬 연산이 안 되고**, 문장이 길면 앞부분 정보가 흐려지는 **장기 의존성 문제**가 남아 있다 |
| 차세대 구조 | 긴 입력에서 Transformer의 연산량이 폭증하는 문제를 겨냥한 Mamba 같은 State Space Model이 나왔다. RNN처럼 가볍게 순차 처리하는 아이디어를 다시 가져온 구조다 |
| 여전히 쓰이는 곳 | 주가·전력 수요·기상처럼 크기가 크지 않은 **정형 시계열 예측**, 스마트폰·센서 같은 **온디바이스·임베디드** 환경 |

그래도 RNN·LSTM을 배우는 이유는 다음 글들의 Seq2Seq와 Attention이 이 위에서 나왔고, Transformer가 무엇을 해결했는지 이해하는 기준점이 되기 때문이다.

## RNN vs LSTM vs GRU, 언제 무엇을

| 상황 | 추천 |
|---|---|
| 짧은 sequence, 구조를 이해하는 실습 | `nn.RNN` |
| 긴 문장, 앞부분 정보가 중요하다 | `nn.LSTM` |
| 데이터가 적거나 학습 속도가 중요하다 | `nn.GRU` (LSTM의 약 3/4 파라미터) |
| 문장 전체를 보고 분류·태깅한다 (Non-Auto Regressive) | `bidirectional=True` |
| 다음 단어를 하나씩 생성한다 (Auto Regressive) | 단방향 |

## 정리

- **Contextualized Word Embedding**은 문맥에 따라 같은 단어에도 다른 벡터를 준다. 정적 임베딩 위에 RNN이나 Transformer를 쌓아 만든다
- **Recurrent Layer**는 현재 입력과 이전 **hidden state**를 같은 weight로 반복 처리한다. hidden state가 메모리 역할을 한다
- PyTorch RNN 계열의 출력은 `out`(모든 time step, 마지막 축 D × hidden)과 `hidden`(마지막 time step, 첫 축 D × num_layers)이다. Many to One은 `hidden`, Many to Many는 `out`을 쓴다
- Simple RNN은 BPTT에서 gradient가 계속 곱해져 **기울기 소실**이 생긴다. **LSTM**은 cell state와 세 Gate로, **GRU**는 두 Gate로 이를 완화한다
