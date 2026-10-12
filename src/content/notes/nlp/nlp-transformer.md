---
title: "Transformer: Self-Attention과 모델 계열"
description: "RNN 없이 Attention만으로 Encoder–Decoder를 만든 Transformer의 구조를 정리합니다. Positional Encoding, Query·Key·Value와 Scaled Dot-Product Attention, Multi-Head Attention, padding·causal Mask, Position-wise FFN, Residual Connection을 작은 텐서로 직접 계산해 확인하고, BERT·GPT·T5 같은 Encoder-Only·Decoder-Only·Encoder-Decoder 계열을 정리합니다."
category: 'Tech'
subcategory: 'NLP'
series: '자연어 처리'
seriesOrder: 11
originalNotebook: "12_transformer.ipynb"
tags: ["NLP"]
date: 2026-06-20T10:00:00+09:00
thumbnail: '../../../assets/images/notes/nlp/nlp-transformer.webp'
---

> SKN31 자연어 처리 과정 노트북 `12_transformer.ipynb`를 바탕으로 정리했습니다.
> 노트북은 개념 설명과 수업 메모로 되어 있고 실습 셀은 비어 있어서, 계산을 직접 확인하는 코드는 `보충`으로 넣었습니다. 코드는 PyTorch 2.5(CPU)에서 실행한 결과입니다.

## 이 글에서 다루는 것

- Seq2Seq의 두 가지 문제와 Transformer
- Transformer 구조: Encoder, Decoder, Residual Connection, Layer Normalization
- **Positional Encoding**
- **Self-Attention**: Query, Key, Value, Scaled Dot-Product Attention
- **Multi-Head Attention**
- **Masked Self-Attention**: padding mask, causal mask
- **Position-wise FFN**
- Transformer 기반 모델 계열: Encoder-Only, Decoder-Only, Encoder-Decoder

## Transformer

- [Attention Is All You Need (2017)](https://arxiv.org/pdf/1706.03762) 논문에서 제시한 모델로, **RNN 없이 Attention 모듈로만 구성한 Encoder–Decoder 구조의 seq2seq 모델**이다
  - RNN → RNN + Attention → Transformer
- 이후 자연어 사전학습 모델 대부분이 Transformer의 Encoder나 Decoder를 변형하거나 층을 깊게 쌓는 방식으로 성능을 올렸다
  - Google **BERT**(Bidirectional Encoder Representations from Transformers): Transformer의 **Encoder**로 구현
  - OpenAI **GPT**(Generative Pre-trained Transformer): Transformer의 **Decoder**로 구현

```text
## Transformer => LLM 발전
## 기존: seq2seq(main-rnn) + attention 
## 발전: rnn을 사용하지 않음-장기기억소실(LSTM도 token이 길어지면 사용이 불가함)+병렬처리가 안됌. attention의 컨셉만 사용.(seq2seq유지)
# OpenAi => DECODER 구조를 가지고 와서 만듬
# BERT => ENCODER 구조를 가지고 와서 만듬

# Attention 로직 사용

# X => layer => o => X+o => layer2 => o => X+o+o => layer3
# 잔차 


# rnn을 사용하지 않고 병렬처리하다보니 순서가 사라지게 됌

# 첫번째 단어냐 두번째 단어냐가 사라짐 

# 그래서 임베딩 과정에서 + 순서값을 더해줌

# 그게 positional encoding 
```

이 메모에 이번 글의 핵심이 다 들어 있다. RNN을 빼서 병렬 처리가 가능해졌고, 대신 사라진 **순서** 정보를 Positional Encoding으로 더해 주고, 층을 깊게 쌓으려고 **잔차(Residual) 연결**을 쓴다.

## Seq2Seq의 문제와 Transformer

| Seq2Seq의 문제 | 내용 | 해결 |
|---|---|---|
| **장기 기억 소실** (long term dependency) | sequence가 길어지면 초기 time step의 정보가 점점 사라진다 | Attention (지난 글) |
| **병렬 처리 불가** | time step을 **순서대로** 처리해야 해서 연산 효율이 낮다 | RNN을 Attention 모듈로 교체 → Transformer |

![Transformer의 장점](/images/nlp/fig-transformer-advantage.gif)

```text
# 의미의 직접 연결: RNN은 1번 단어와 100번 단어를 연결하려면 100번의 연산이 필요하지만, 
# Transformer는 단 한 번의 연산으로 1번과 100번을 직접 연결합니다. 

# (데이터 간의 물리적 거리가 사라짐)

# 행렬 연산의 마법: 모든 단어를 병렬로 처리하니, GPU를 사용하여 수천 개의 연산을 한 번에 때려부을 수 있습니다. 
# 속도가 RNN과는 비교도 안 되게 빠릅니다.
```

## Transformer Architecture

- Encoder–Decoder 구조다
  - **Encoder** 한 층: **Self-Attention + Position-wise FFN**
  - **Decoder** 한 층: **Masked Self-Attention → Encoder–Decoder Cross-Attention → FFN**
- 각 층은 **Residual Connection**(Skip Connection)과 **Layer Normalization**으로 깊게 쌓을 수 있게 한다

![Encoder와 Decoder의 구조](/images/nlp/fig-transformer-architecture1.png)

![Transformer의 다층 구조](/images/nlp/fig-transformer-architecture2.png)

> **보충** 메모의 "X → layer → o → X+o"가 Residual Connection이다. 층의 출력을 입력에 **더해서** 다음 층으로 넘긴다($x + \text{Sublayer}(x)$). 층이 할 일이 "입력을 통째로 바꾸기"에서 "입력에 고칠 부분만 더하기"로 바뀌어 학습이 쉬워지고, 덧셈 덕분에 gradient가 깊은 층까지 잘 흐른다. LSTM의 cell state가 덧셈으로 기억을 전달하던 것과 같은 아이디어다. Layer Normalization은 성능 개선 글에서 본 것처럼 샘플(토큰) 단위로 정규화한다.

## Positional Encoding

- RNN을 쓰지 않으니 입력 토큰들에 **순서 정보가 없다**. 한꺼번에 처리하면 "나는 너를 좋아해"와 "너는 나를 좋아해"를 구분할 수 없다
- 각 토큰의 embedding vector에 **그 토큰의 위치 정보를 담은 값**을 더해 준다
- sin/cos 주기 함수로 계산한다

$$
PE_{(pos,2i)}=\sin\left(\dfrac{pos}{10000^{2i/d_{model}}}\right), \quad PE_{(pos,2i+1)}=\cos\left(\dfrac{pos}{10000^{2i/d_{model}}}\right)
$$

- $pos$: 시퀀스에서 토큰의 index
- $i$: 0부터 $d_{model}/2 - 1$까지. 차원 쌍 $(2i, 2i+1)$을 만들고 앞은 sin, 뒤는 cos를 써서 같은 위치에 두 값을 만든다. 두 함수를 함께 써야 위치가 겹치지 않는다. 예) 차원 (0, 1)의 $i$는 0, (2, 3)의 $i$는 1
- $d_{model}$: 임베딩 차원 수

```python
# 보충: Positional Encoding 계산
import torch

def positional_encoding(max_len, d_model):
    pe = torch.zeros(max_len, d_model)
    pos = torch.arange(max_len).unsqueeze(1)                     # (max_len, 1)
    i2 = torch.arange(0, d_model, 2)                             # 2i = 0, 2, 4, ...
    div = 10000 ** (i2 / d_model)
    pe[:, 0::2] = torch.sin(pos / div)                           # 짝수 차원: sin
    pe[:, 1::2] = torch.cos(pos / div)                           # 홀수 차원: cos
    return pe

pe = positional_encoding(max_len=50, d_model=128)
print(pe.shape)
print("pos 0, 앞 6차원:", pe[0, :6])
print("pos 1, 앞 6차원:", pe[1, :6])
```

```text
torch.Size([50, 128])
pos 0, 앞 6차원: tensor([0., 1., 0., 1., 0., 1.])
pos 1, 앞 6차원: tensor([0.841, 0.540, 0.762, 0.648, 0.682, 0.732])
```

```python
# 보충: 위치(세로) × 차원(가로) 시각화
plt.figure(figsize=(9, 4))
plt.imshow(pe.numpy(), cmap="RdBu", aspect="auto")
plt.xlabel("embedding 차원")
plt.ylabel("토큰 위치 (pos)")
plt.colorbar()
plt.title("Positional Encoding (d_model=128)")
plt.show()
```

![그래프 출력](/images/nlp/nlp-transformer-1.png)

- pos 0은 sin(0)=0, cos(0)=1이라 `0, 1, 0, 1, ...`이고, pos 1부터 값이 달라진다
- 그림의 **왼쪽(앞쪽 차원)**은 위치가 바뀔 때마다 빠르게 진동하고, **오른쪽(뒤쪽 차원)**은 주기가 길어서 50개 위치 안에서는 거의 변하지 않는다. 시계의 초침·분침·시침처럼 빠른 차원과 느린 차원을 섞어서, 위치마다 겹치지 않는 고유한 패턴이 생긴다
- 값이 항상 -1~1 사이라 embedding에 더해도 단어 정보를 덮어 버리지 않는다

## Self-Attention

- Attention을 **자기 자신에게** 적용한다는 뜻이다
  - Seq2Seq의 Attention: Decoder가 **Encoder**의 hidden state 중 어디에 집중할지 찾는다
  - Self-Attention: **같은 문장 안에서** 단어들이 서로 어떤 관계인지 찾는다

![Self-Attention 예시](/images/nlp/fig-transformer-self-attention-it.png)

- "The animal didn't cross the street because **it** was too tired."의 `it`을 인코딩한다고 하자
- `it`을 문맥에 맞게 표현하려면 이 문장에서 `it`이 무엇을 가리키는지 알아야 한다
- 그 답을 다른 문서가 아니라 `it`이 있는 **같은 문장의 다른 단어들**과의 관계에서 찾는다
- 의미를 파악하려는 문서와 의미를 찾는 문서가 같아서 **self**-attention이다

```text
# 자기가 자기를 참조해서 it의 의미를 파악함
# 사전적의미가 아닌
# it -> 이 문맥에서 어떤 것과 가장 연관성이 있는지 찾는다. (병렬적으로) (RNN처럼 순차적으로 hidden_state(x))
```

RNN 글에서 "Contextualized Word Embedding"이라고 부른 것을, Transformer는 Self-Attention으로 만든다.

### Self-Attention 과정

![Self-Attention 과정](/images/nlp/fig-transformer-self-attention.png)

$$
\text{Attention}(Q,K,V) = \text{softmax}\left(\cfrac{QK^T}{\sqrt{d_k}}\right)V
$$

Q: Query, K: Key, V: Value, $d_k$: Key의 차원 수

```text
# Query : Key : Value (토큰화+임베딩 => 하나의 문맥을 3개를 복사해서 만듬)

# KV cash (Key : Value  -memory)

# 쿼리(사용자가 물어보는 것)  + 바로 벨류를 찾는게 어려우니, 쿼리와 가장 유사한 키를 먼저 찾고 벨류값을 얻어냄

# 3가지를 가지고 계산을 함

# (1) Q-K 내적(행렬곱)의 유사도 계산(matmul) --solfmax->-V 내적 유사도 계산(matmul) => 최종 유사도 값을 값으로 씀  

# solf max = 비율계산
```

**1. Query, Key, Value 생성**

| | 역할 | 비유 (메모의 검색) |
|---|---|---|
| **Query (Q)** | 현재 위치가 "**무엇을 찾고 있는지**" | 검색어 |
| **Key (K)** | 각 위치가 "**어떤 정보를 가지고 있는지**". Query와 맞춰 attention score를 계산하는 기준 | 문서의 제목·색인 |
| **Value (V)** | 실제로 "**전달할 정보의 내용**". attention weight와 가중합해 최종 출력(context vector)이 된다 | 문서의 본문 |

Self-Attention은 Q, K, V를 **모두 같은 입력 X**에서 만든다. 각각의 weight(Linear)를 곱한다.

$$
Q = X W_q, \quad K = X W_k, \quad V = X W_v
$$

![Query, Key, Value](/images/nlp/fig-transformer-qkv.png)

**2. Attention Score**: Query와 Key를 내적해 유사도를 계산하고, $\sqrt{d_k}$로 나눠 정규화한다 (Scaled Dot-Product)

$$
\text{Attention Score} = \cfrac{Q K^T}{\sqrt{d_k}}
$$

![Q · K^T](/images/nlp/fig-transformer-qk-matmul.png)

**3. Attention Weight**: score에 Softmax를 적용해 0~1 비율로 바꾼다

**4. Attention Value**: Attention Weight를 Value에 곱해(가중합) 만든다. 이게 입력 sequence의 **context vector**다

![Attention Value](/images/nlp/fig-transformer-attention-value.png)

작은 텐서로 이 네 단계를 그대로 계산해 본다.

```python
# 보충: Scaled Dot-Product Self-Attention을 직접 계산
import torch.nn as nn
import torch.nn.functional as F

seq_len, d_model = 4, 8                      # 토큰 4개, embedding 8차원
X = torch.randn(seq_len, d_model)            # (embedding + positional encoding)이라고 하자

W_q = nn.Linear(d_model, d_model, bias=False)
W_k = nn.Linear(d_model, d_model, bias=False)
W_v = nn.Linear(d_model, d_model, bias=False)

Q, K, V = W_q(X), W_k(X), W_v(X)             # 1. 같은 X에서 Q, K, V
score = Q @ K.T / d_model ** 0.5             # 2. (4, 4): 토큰 i가 토큰 j를 얼마나 보는지
weight = torch.softmax(score, dim=-1)        # 3. 행마다 합 1
value = weight @ V                           # 4. (4, 8): 문맥이 섞인 새 표현

print("attention weight (행: Query 토큰, 열: Key 토큰)\n", weight.detach())
print("행 합:", weight.sum(dim=-1).detach())
print("출력 shape:", value.shape)
```

```text
attention weight (행: Query 토큰, 열: Key 토큰)
 tensor([[0.343, 0.207, 0.264, 0.187],
        [0.249, 0.255, 0.213, 0.283],
        [0.242, 0.234, 0.272, 0.252],
        [0.244, 0.274, 0.223, 0.259]])
행 합: tensor([1.000, 1.000, 1.000, 1.000])
출력 shape: torch.Size([4, 8])
```

```python
# 보충: PyTorch 내장 함수와 같은 결과인지
builtin = F.scaled_dot_product_attention(Q.unsqueeze(0), K.unsqueeze(0), V.unsqueeze(0))
torch.allclose(value, builtin[0], atol=1e-6)
```

```text
True
```

> **보충** $\sqrt{d_k}$로 나누는 이유: 차원이 크면 내적값의 분산이 차원 수만큼 커진다. 값이 커지면 Softmax가 한 칸에 1을 몰아주는 극단적인 분포가 되고, 그 상태에서는 gradient가 거의 0이라 학습이 안 된다. $\sqrt{d_k}$로 나누면 내적값의 분산이 1 근처로 돌아온다.

```python
# 보충: 차원이 클 때 나누지 않으면
d = 512
q, k = torch.randn(10, d), torch.randn(10, d)
raw = q @ k.T
print("나누기 전 score 표준편차:", raw.std().item())
print("나눈 후   score 표준편차:", (raw / d ** 0.5).std().item())
print("나누기 전 softmax 행별 최댓값 평균:", torch.softmax(raw, -1).max(-1).values.mean().item())
print("나눈 후   softmax 행별 최댓값 평균:", torch.softmax(raw / d ** 0.5, -1).max(-1).values.mean().item())
```

```text
나누기 전 score 표준편차: 24.481157302856445
나눈 후   score 표준편차: 1.081924557685852
나누기 전 softmax 행별 최댓값 평균: 0.9758345484733582
나눈 후   softmax 행별 최댓값 평균: 0.3475419878959656
```

512차원에서 나누지 않으면 score 표준편차가 약 24로 커져서, Softmax의 행별 최댓값이 평균 0.98이 된다. 한 토큰에만 거의 100% 집중하는 상태라 다른 토큰 쪽으로는 gradient가 흐르지 않는다. $\sqrt{512}$로 나누면 표준편차가 약 1로 돌아오고 최댓값도 0.35로 고르게 퍼진다.

```text
# self attention은 선형적인 구조임


# point-wise Feed Foward Network(FFN) 비선형을 위함


# linear를 사용하는 것은 각 token x w 구해서 각 선형적이지 않은 문맥에서의 단어가 아닌 각 단어의 의미를 구해옴


# 이후 Relu
```

## Multi-Head Attention

- 입력에 **서로 다른 가중치 행렬**을 적용해 **여러 세트의 Q, K, V**를 만들고, 세트마다 **병렬로** attention을 계산한다
- 나눈 하나하나를 **head**라고 하고, 여러 개를 쓰니 Multi-Head Attention이다

**생성 과정** (embedding 512차원, head 8개)

- 각 head는 입력 전체(512차원)에 서로 다른 weight를 곱해 **64차원(512/8)**의 Q, K, V를 만든다 (Single Head는 512차원 전체로 512차원 Q, K, V)
  - 구현 편의상 보통 `d_model % head 수 == 0`이 되게 정한다
  - 512 × 64 Linear를 head마다 하나씩, Q·K·V 각각 8개 만든다
- 각 head는 **독립적으로**(병렬로) attention을 계산한다
- 모든 head의 출력을 concat하고(8 × 64 = 512), 마지막에 Linear로 원하는 차원에 맞춘다

**장점**

- 같은 문장을 여러 관점(문법적 관계, 의미적 관계 등)에서 동시에 볼 수 있다
- head마다 다른 특성을 배워 더 풍부한 표현이 된다
- head 연산이 병렬이라 GPU에서 빠르다

![Multi-Head Attention](/images/nlp/fig-transformer-multi-head.png)

```python
# 보충: nn.MultiheadAttention - 512차원, head 8개
mha = nn.MultiheadAttention(embed_dim=512, num_heads=8, batch_first=True)
x = torch.randn(2, 10, 512)                       # (batch 2, 토큰 10개, 512차원)
out, attn = mha(x, x, x)                          # Self-Attention: Q, K, V 모두 x
print("출력:", out.shape)
print("attention weight:", attn.shape, "(head 평균)")
out, attn = mha(x, x, x, average_attn_weights=False)
print("head별 attention weight:", attn.shape)
print("파라미터 수:", sum(p.numel() for p in mha.parameters()))
```

```text
출력: torch.Size([2, 10, 512])
attention weight: torch.Size([2, 10, 10]) (head 평균)
head별 attention weight: torch.Size([2, 8, 10, 10])
파라미터 수: 1050624
```

- 출력은 입력과 같은 `(2, 10, 512)`이고, head별 attention weight는 `(batch, head 8, Query 10, Key 10)`이다. head마다 10×10 attention 지도를 따로 가진다
- 파라미터는 1,050,624개 = Q·K·V·출력 Linear 4개 × (512 × 512 + bias 512)다. head를 8개로 나눠도 **파라미터 수는 512차원 single head와 같다**. 차원을 64씩 나눠 쓸 뿐 총량이 늘지 않는다

## Masked Self-Attention

- 순서대로 생성하는 경우, i번째 단어를 만들 때는 그 **뒤의 단어를 아직 모른다**
- 그런데 Attention은 모든 토큰을 한 번에 넣고 score를 구하니, i번째 토큰이 **미래 토큰**과의 유사도까지 계산해 버린다
- 그래서 i번째 토큰의 score는 **i번째까지의 토큰들과만** 계산하도록 가린다(mask). Softmax **전에** 적용한다
- mask를 쓰면 Masked Self-Attention(Masked Multi-Head Attention)이 된다

| mask 종류 | 하는 일 | 사용처 |
|---|---|---|
| **padding mask** | `[PAD]` 토큰이 가중치에 반영되지 않게 한다 | Encoder, Decoder 모두 |
| **causal mask** | 미래 토큰 정보를 차단해 자기 회귀 생성이 가능하게 한다 | Decoder |

![Masked Self-Attention](/images/nlp/fig-transformer-masked.png)

```python
# 보충: causal mask - 위쪽 삼각형을 -inf로 가린 뒤 softmax
causal = torch.triu(torch.ones(seq_len, seq_len, dtype=torch.bool), diagonal=1)
print(causal)
masked_score = score.masked_fill(causal, float("-inf"))
masked_weight = torch.softmax(masked_score, dim=-1)
print(masked_weight.detach())
```

```text
tensor([[False,  True,  True,  True],
        [False, False,  True,  True],
        [False, False, False,  True],
        [False, False, False, False]])
tensor([[1.000, 0.000, 0.000, 0.000],
        [0.494, 0.506, 0.000, 0.000],
        [0.324, 0.313, 0.364, 0.000],
        [0.244, 0.274, 0.223, 0.259]])
```

- 첫 번째 토큰은 자기 자신만 볼 수 있어서 1.0이다
- 두 번째 토큰은 첫 두 토큰에만 0.494 / 0.506을 나눠 준다
- 마지막 토큰은 모든 토큰을 볼 수 있어서 mask 전과 값이 같다
- `-inf`를 넣으면 $e^{-\infty} = 0$이라 Softmax 후 정확히 0이 되고, 남은 칸끼리 다시 합 1이 된다

## Position-wise Feed-Forward Network (FFN)

- Encoder와 Decoder 안에 **같은 구조로 반복해서 들어가는 비선형 변환 블록**이다
- **각 토큰(position)마다 같은 FFN을 독립적으로** 적용해서, 토큰 간 상호작용 없이 개별 토큰의 표현을 비선형으로 바꾼다

**구조**: 입력 벡터(512) → Linear(512 → 2048) → ReLU → Linear(2048 → 512) → 출력 벡터(512)

- 2층 FFN: **차원 확장 → 비선형 변환 → 차원 복원**
- 모든 토큰이 **같은 가중치를 공유**하며 독립적으로 적용된다 (Point-wise)

| | Self-Attention | FFN |
|---|---|---|
| 하는 일 | 토큰 **간 관계** 학습, 문맥 정보 결합 | 각 토큰 벡터에 **비선형 변환** |
| 결과 | 문맥이 섞인 표현 | 개별 토큰의 표현력 증가 |

- Attention 블록은 기본적으로 **선형 연산**(행렬곱, 가중합)뿐이다. 선형 변환만으로는 복잡한 의미 패턴을 배우기 어렵다
- FFN의 ReLU(또는 GELU)가 **비선형성**을 더해 모델의 표현력을 높인다

```text
# dense layer => 비선형성을 추가해줌
```

> **보충** 엄밀히는 Attention 안에도 Softmax라는 비선형 함수가 있다. 다만 Softmax는 "어디를 얼마나 볼지" 비율을 정하는 데만 쓰이고, 최종 출력은 Value의 **가중합(선형 결합)**이다. 각 토큰의 값 자체를 비선형으로 바꾸는 일은 FFN이 맡는다.

모든 부품을 합친 Encoder 한 층은 PyTorch에 `nn.TransformerEncoderLayer`로 들어 있다.

```python
# 보충: Encoder 한 층 = Multi-Head Self-Attention + FFN + Residual + LayerNorm
layer = nn.TransformerEncoderLayer(d_model=512, nhead=8, dim_feedforward=2048, batch_first=True)
print(layer)
x = torch.randn(2, 10, 512)
print("입력:", x.shape, "→ 출력:", layer(x).shape)
print("파라미터 수:", sum(p.numel() for p in layer.parameters()))
```

```text
TransformerEncoderLayer(
  (self_attn): MultiheadAttention(
    (out_proj): NonDynamicallyQuantizableLinear(in_features=512, out_features=512, bias=True)
  )
  (linear1): Linear(in_features=512, out_features=2048, bias=True)
  (dropout): Dropout(p=0.1, inplace=False)
  (linear2): Linear(in_features=2048, out_features=512, bias=True)
  (norm1): LayerNorm((512,), eps=1e-05, elementwise_affine=True)
  (norm2): LayerNorm((512,), eps=1e-05, elementwise_affine=True)
  (dropout1): Dropout(p=0.1, inplace=False)
  (dropout2): Dropout(p=0.1, inplace=False)
)
입력: torch.Size([2, 10, 512]) → 출력: torch.Size([2, 10, 512])
파라미터 수: 3152384
```

- 파라미터 3,152,384개 = Multi-Head Attention 1,050,624 + FFN 2,099,712(512×2048 + 2048×512 + bias) + LayerNorm 2개 2,048이다. **FFN이 전체의 3분의 2**를 차지한다
- 입력과 출력 shape이 `(batch, 토큰 수, 512)`로 같아서 이 층을 그대로 여러 번 쌓을 수 있다. BERT-base는 768차원 Encoder 층을 12개 쌓은 모델이다

## Transformer 모델의 구조적 분류와 대표 모델

| 계열 | 구조 | 대표 모델 | 잘하는 일 |
|---|---|---|---|
| **Encoder-Only** | Transformer Encoder | **BERT**(마스크드 언어 모델 + 다음 문장 예측), **RoBERTa**(더 많은 데이터·큰 배치로 BERT 개선), **ALBERT**(파라미터 공유로 경량화) | 문장 이해: 분류, 개체명 인식, 검색용 임베딩 |
| **Decoder-Only** | Transformer Decoder | **GPT** 시리즈(텍스트 생성, GPT-1~3), **CTRL**(제어 토큰으로 문체 제어), **OPT**(GPT와 비슷한 오픈소스) | 텍스트 생성: 챗봇, 요약, 코드 생성 |
| **Encoder-Decoder** | Transformer 전체 | **T5**(모든 태스크를 텍스트→텍스트로), **BART**(BERT식 Encoder + GPT식 Decoder), **M2M-100**(100개 언어 번역), **BigBird**(긴 시퀀스) | 입력을 다른 시퀀스로 변환: 번역, 요약 |

![Transformer 기반 대표 모델들](/images/nlp/fig-transformer-models.png)

> **보충** 지금 쓰는 대화형 LLM(GPT-4, Claude, Llama 등)은 대부분 **Decoder-Only**다. 다음 토큰을 예측하는 단순한 목표 하나로 대규모 텍스트를 학습시킬 수 있어서 규모를 키우기 쉽기 때문이다. 이 시리즈의 RNN 글에서 본 "Auto Regressive 모델은 단방향"이 그대로 causal mask로 이어진다.

## RNN Seq2Seq vs Seq2Seq + Attention vs Transformer

| | RNN Seq2Seq | + Attention | Transformer |
|---|---|---|---|
| 순서 처리 | 토큰을 하나씩 (순차) | 토큰을 하나씩 (순차) | 한 번에 (병렬), 순서는 Positional Encoding |
| 먼 토큰 연결 | 거리만큼 step을 거친다 | Decoder → Encoder만 직접 연결 | 모든 토큰 쌍을 한 번에 직접 연결 |
| 문맥 표현 | hidden state | hidden state + context | Self-Attention (토큰마다 문맥 표현) |
| 깊게 쌓기 | 어렵다 | 어렵다 | Residual + LayerNorm으로 수십 층 |
| 이 시리즈 | Seq2Seq 챗봇 | Attention 챗봇 | 다음 시리즈(Hugging Face)에서 사전학습 모델로 사용 |

## 정리

- **Transformer**는 RNN을 빼고 Attention만으로 Encoder–Decoder를 만들어 **병렬 처리**가 가능해졌다. 사라진 순서 정보는 **Positional Encoding**(sin/cos)을 embedding에 더해 보충한다
- **Self-Attention**은 같은 입력에서 만든 Query·Key·Value로 $\text{softmax}(QK^T/\sqrt{d_k})V$를 계산해, 각 토큰이 문장 안의 다른 토큰을 참고한 문맥 표현을 만든다
- **Multi-Head Attention**은 차원을 나눈 여러 head가 서로 다른 관점의 attention을 병렬로 계산한다
- **Mask**는 Softmax 전에 score를 `-inf`로 가린다. padding mask는 `[PAD]`를, causal mask는 미래 토큰을 가린다
- **FFN**은 토큰마다 같은 2층 MLP로 비선형성을 더하고, **Residual + LayerNorm**이 층을 깊게 쌓게 해 준다
- Encoder만 쓰면 BERT 계열(이해), Decoder만 쓰면 GPT 계열(생성), 둘 다 쓰면 T5·BART 계열(변환)이다
