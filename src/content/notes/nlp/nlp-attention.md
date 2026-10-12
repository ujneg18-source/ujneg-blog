---
title: "Attention: Seq2Seq의 병목 해결하기"
description: "고정된 Context Vector 하나에 문장 전체를 담는 Seq2Seq의 한계와, Decoder가 단어를 만들 때마다 Encoder 출력 중 필요한 부분에 집중하는 Attention의 아이디어를 정리하고, Luong 방식의 Attention Decoder(Attention Weight → Attention Value → Combine → GRU → 단어 예측)로 챗봇을 구현해 학습합니다. 학습된 모델이 어느 입력 토큰에 집중했는지 attention weight를 시각화합니다."
category: 'Tech'
subcategory: 'NLP'
series: '자연어 처리'
seriesOrder: 10
originalNotebook: "11_seq2seq_attention_chatbot.ipynb"
tags: ["NLP"]
date: 2026-06-19T10:00:00+09:00
thumbnail: '../../../assets/images/notes/nlp/nlp-attention.webp'
---

> SKN31 자연어 처리 과정 노트북 `11_seq2seq_attention_chatbot.ipynb`를 바탕으로 정리했습니다.
> 노트북에서는 학습을 `n_iters = 1`로만 실행해 보고 끝나서, 결과 확인 셀들이 실행되지 않았습니다. 이 글에서는 CPU에서 **24,000쌍**(원래 설정 110,000쌍)으로 줄여 학습한 결과를 실었습니다. 코드는 PyTorch 2.5(CPU), tokenizers 0.23에서 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- Seq2Seq의 문제: 고정된 Context Vector 하나
- Attention의 아이디어
- 질문·답변을 한 쌍씩 학습하는 Dataset (`[EOS]` 토큰)
- Encoder, Luong 방식의 Attention Decoder
- Attention Weight → Attention Value → Combine → GRU → 단어 예측
- 학습, 저장, 평가, attention weight 시각화

## Seq2Seq 모델의 문제점

Seq2Seq는 Encoder가 입력 시퀀스의 특성을 **하나의 고정된 context vector**로 압축해 Decoder에 넘기고, Decoder는 그 벡터 하나로 출력 시퀀스를 만든다.

1. 고정된 크기의 벡터 하나에 입력 전체를 넣다 보니 **정보 손실**이 생긴다
2. Decoder는 모든 출력 토큰을 **같은 context vector**로 만든다. 그런데 출력 토큰마다 입력에서 참고해야 할 부분이 다르다. "나는 학생이다 → I am a student"에서 "student"를 만들 때는 "학생"을, "I"를 만들 때는 "나는"을 봐야 한다. Seq2Seq는 Encoder의 마지막 hidden state 하나만 받으니 이 차이를 반영하지 못한다

## Attention Mechanism 아이디어

- Decoder가 출력 단어를 예측하는 **매 time step마다 Encoder의 입력 문장을 다시 참고**하자
- 이때 입력 단어들을 같은 비율로 보지 않고, 지금 예측할 단어와 **연관 있는 부분에 더 집중(attention)**해서 참고하자
- 어느 부분에 얼마나 집중할지를 계산하는 방식에 따라 여러 Attention이 있다
  - `dot attention` (Luong), `scaled dot attention` (Vaswani), `general attention` (Luong), `concat attention` (Bahdanau)

> **보충** 마지막의 Vaswani가 다음 글 Transformer 논문("Attention Is All You Need")의 저자다. 이 글의 Attention은 RNN에 붙인 보조 장치지만, Transformer는 RNN을 빼고 Attention만으로 모델을 만든다.

## Data Loading

```python
import os
import pandas as pd
import requests

os.makedirs("data", exist_ok=True)
url = "https://raw.githubusercontent.com/songys/Chatbot_data/refs/heads/master/ChatbotData.csv"
res = requests.get(url)
if res.status_code == 200:
    with open("data/chatbot_data.csv", "wt", encoding="utf-8") as fw:
        fw.write(res.text)
else:
    print(f"불러오지 못함: {url}")
```

> **보충** 지난 글과 같은 챗봇 데이터다. 다운로드 셀은 받아 둔 파일로 대신했다.

```python
import os
import pandas as pd

df = pd.read_csv('data/chatbot_data.csv')
df.drop(columns='label', inplace=True)
df.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Q</th><th>A</th></tr></thead><tbody><tr><th class="idx">0</th><td>12시 땡!</td><td>하루가 또 가네요.</td></tr><tr><th class="idx">1</th><td>1지망 학교 떨어졌어</td><td>위로해 드립니다.</td></tr><tr><th class="idx">2</th><td>3박4일 놀러가고 싶다</td><td>여행은 언제나 좋죠.</td></tr><tr><th class="idx">3</th><td>3박4일 정도 놀러가고 싶다</td><td>여행은 언제나 좋죠.</td></tr><tr><th class="idx">4</th><td>PPL 심하네</td><td>눈살이 찌푸려지죠.</td></tr></tbody></table></div></div>

## 토큰화

```python
question_texts = df['Q']
answer_texts = df['A']
all_texts = list(question_texts + " "+answer_texts)
len(question_texts), len(answer_texts), len(all_texts)
```

```text
(11823, 11823, 11823)
```

```python
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.pre_tokenizers import Whitespace
from tokenizers.trainers import BpeTrainer

vocab_size = 10_000
min_frequency = 5

tokenizer = Tokenizer(BPE(unk_token="[UNK]"))
tokenizer.pre_tokenizer = Whitespace()
trainer = BpeTrainer(
    vocab_size=vocab_size,
    min_frequency=min_frequency,
    continuing_subword_prefix='##',
    special_tokens=["[PAD]", "[UNK]", "[SOS]", "[EOS]"],
    # [SOS]: 문장의 시작을 의미하는 토큰. [EOS]: 문장이 끝난 것을 표시.
    show_progress=False,
)

tokenizer.train_from_iterator(all_texts, trainer=trainer)
print("총 어휘수:", tokenizer.get_vocab_size())
```

```text
총 어휘수: 7045
```

지난 글과 달리 `min_frequency=5`로 5번 미만 나온 쌍은 병합하지 않아서 사전이 7천 개 정도로 작다. 그리고 문장 끝을 표시하는 **`[EOS]`**가 추가됐다. 답변을 어디서 멈출지 모델이 스스로 정하게 하려는 토큰이다.

```python
dir_path = "saved_model/chatbot_attn"
os.makedirs(dir_path, exist_ok=True)
vocab_path = os.path.join(dir_path, "chatbot_attn_bpe.json")
tokenizer.save(vocab_path)
vocab_path
```

```text
'saved_model/chatbot_attn/chatbot_attn_bpe.json'
```

## Dataset 생성

- **한 문장(질문-답변 한 쌍) 단위로 학습**하므로 DataLoader를 만들지 않고 Dataset에서 index로 꺼내 학습한다
- 그래서 패딩도 필요 없다. 대신 문장 끝에 `[EOS]`를 붙인다

```python
import random
import os
import time
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset

device = "cuda" if torch.cuda.is_available() else "cpu"
device
```

```text
'cpu'
```

```python
class ChatbotDataset(Dataset):

    """
    Attribute
        max_length
        tokenizer: Tokenizer
        vocab_size: int - Tokenizer에 등록된 총 어휘수
        SOS: int - [SOS] 문장의 시작 토큰 id
        EOS: int = [EOS] 문장의 끝 토큰 id
        question_squences: list - 모든 질문 str을 token_id_list(token sequence) 로 변환하여 저장한 list
        answser_sequences: list - 모든 답변 str을 token_id_list(token sequence) 로 변환하여 저장한 list.
    """
    def __init__(self, question_texts, answer_texts, tokenizer, min_length=2, max_length=20):
        """
        question_texts: list[str] - 질문 texts 목록. 리스트에 질문들을 담아서 받는다. ["질문1", "질문2", ...]
        answer_texts: list[str] - 답 texts 목록. 리스트에 답변들을 담아서 받는다.     ["답1",   "답2",   ...]
        tokenizer: Tokenizer
        min_length=2: int - 최소 토큰 개수. 질문과 답변의 token수가 min_length 이상인 것만 학습한다.
        max_length=20:int 개별 댓글의 token 개수. 모든 댓글의 토큰수를 max_length에 맞춘다.
        """
        self.min_length = min_length
        self.max_length = max_length
        self.tokenizer = tokenizer

        self.vocab_size = tokenizer.get_vocab_size()
        self.SOS = self.tokenizer.token_to_id('[SOS]')
        self.EOS = self.tokenizer.token_to_id('[EOS]')

        self.question_sequences = []
        self.answer_sequences = []
        for q, a in zip(question_texts, answer_texts): # (질문1, 답변 1)
            q_token = self.__process_sequence(q)
            a_token = self.__process_sequence(a) 
            
            if len(q_token) > min_length and len(a_token) > min_length:
                self.question_sequences.append(q_token)
                self.answer_sequences.append(a_token)

    def __add_special_tokens(self, token_sequence):
        """
        질문/답변 토큰 리스트 맨 뒤에 문장의 끝을 표시하는 [EOS] 토큰 추가.
        [EOS] Token을 붙이고 max_length 보다 토큰수가 많으면 안된다.
        Args:
            token_sequence (list[int]) - EOS 토큰을 추가할 문서 token id sequence
        """
        # max_length-1개 조회 후 [EOS] 토큰을 마지막에 추가. 총개수를 max_length로 맞춘다.
        token_id_list = token_sequence[:self.max_length-1]
        token_id_list.append(self.EOS)

        return token_id_list

    def __process_sequence(self, text):
        """
        한 문장 string을 받아서 encoding 한 뒤 [EOS] token을 추가한 token_id 리스트(list)를 생성 해서 반환한다.
        Args:
            text (str) - token id 리스트로 변환할 대상 String.
        """

        encode = self.tokenizer.encode(text)
        token_ids = self.__add_special_tokens(encode.ids) #[200, 1100, 238, ...EOS]
        return token_ids

    def __len__(self):
        
        return len(self.question_sequences)

    def __getitem__(self, index):

        q = torch.tensor(self.question_sequences[index], dtype=torch.int64).unsqueeze(1)
        a = torch.tensor(self.answer_sequences[index], dtype=torch.int64).unsqueeze(1)
        return q, a
```

```python
MAX_LENGTH = 20
MIN_LENGTH = 2
dataset = ChatbotDataset(question_texts, answer_texts, tokenizer, MIN_LENGTH, MAX_LENGTH)
print(len(dataset))
```

```text
11713
```

```python
# 보충: 한 쌍 확인
q, a = dataset[0]
print(q.shape, a.shape)
print(tokenizer.decode(q.flatten().tolist(), skip_special_tokens=False))
print(tokenizer.decode(a.flatten().tolist(), skip_special_tokens=False))
```

```text
torch.Size([6, 1]) torch.Size([6, 1])
1 ##2 ##시 땡 ! [EOS]
하루가 또 가 ##네요 . [EOS]
```

질문과 답변 모두 끝에 `[EOS]`가 붙고, shape은 `(토큰 수, 1)`이다. 토큰 수가 2 이하인(`[EOS]` 포함) 짧은 쌍은 걸러져서 11,823쌍 중 일부가 빠졌다.

## 모델

### Encoder

- Seq2Seq와 같은 구조다
- 다만 `forward()`가 **토큰 하나씩** 처리한다. 바깥에서 for 문으로 질문 토큰을 하나씩 넣으며 매 step의 출력을 모아 둔다. 그 출력들이 Attention이 참고할 대상이다

![Encoder](/images/nlp/fig-attn-encoder.png)

```python
class Encoder(nn.Module):

    def __init__(self, vocab_size, hidden_size, embedding_dim, num_layers):
        """
        Args:
            vocab_size: int - 총 어휘수
            hidden_size: int - GRU의 hidden size
            embedding_dim: int - Embedding vector의 차원수
            num_layers: int - GRU의 layer수
        """
        super().__init__()
        self.vocab_size = vocab_size
        self.hidden_size = hidden_size
        
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        
        self.gru = nn.GRU(
            input_size=embedding_dim, hidden_size=hidden_size, num_layers=num_layers
        )

    def forward(self, x, hidden):
        """
        질문의 token한개의 토큰 id를 입력받아 hidden state를 출력

        Args:
            x: 한개 토큰. shape-[1]
            hidden: hidden state (이전 처리결과). shape: [1, 1, hidden_size]
        Returns:
            tuple: (output, hidden) - output: [1, 1, hidden_size],  hidden: [1, 1, hidden_size]
        """
        
        embedded = self.embedding(x).unsqueeze(0) # (1: batch, embedding_dim)-> (1: batch, 1:seq_len, embedding_dim)
        out, hidden = self.gru(embedded, hidden)

        return out, hidden

    def init_hidden(self, device):
        """
        처음 timestep에서 입력할 hidden_state.
        값: 0
        shape: (Bidirectional(1) x number of layers(1), batch_size: 1, hidden_size)
        """
        
        return torch.zeros(1, 1, self.hidden_size, device=device)
```

### Attention 적용 Decoder

![Seq2Seq + Attention](/images/nlp/fig-attn-outline.png)

- Attention은 Decoder가 다음 단어를 만드는 **모든 단계에서** Encoder 출력 중 연관 있는 부분에 집중하게 한다
- 여러 기법 중 **Luong attention** 방식은 다음과 같다

![Attention Decoder](/images/nlp/fig-attn-decoder.png)

**1. Attention Weight**

Decoder가 현재 단어를 만들 때 Encoder 출력 중 **어느 토큰에 더 집중할지**를 나타내는 가중치다. 합이 1이 되도록 Softmax를 거친다.

![Attention Weight](/images/nlp/fig-attn-weight.png)

**2. Attention Value**

현재 time step에서 쓸 Context Vector다. Encoder 출력들에 Attention Weight를 곱해 더한다(가중합). 집중해야 할 토큰의 정보가 크게, 아닌 토큰은 작게 들어간다.

![Attention Value](/images/nlp/fig-attn-value.png)

**3. Feature Extraction (Combine)**

Decoder의 embedding vector(**이전 step에서 예측한 단어 = 현재 입력**)와 Attention Value를 합쳐 GRU의 입력을 만든다. Linear + ReLU로 GRU의 `input_size`에 맞춘다. 어떻게 맞출지도 학습시키려고 Linear를 쓴다.

![Attention Combine](/images/nlp/fig-attn-combine.png)

**4. 단어 예측**

GRU의 출력을 어휘 수만큼의 unit을 가진 Linear에 넣어 **다음 단어**를 추론한다. 추론한 단어는 다음 step의 입력이 되고, GRU의 hidden은 다음 step의 hidden state가 된다.

```python
class AttentionDecoder(nn.Module):

    def __init__(self, vocab_size, hidden_size, embedding_dim, dropout_p, max_length):
        

        # attential(attn) r
        super().__init__()
        self.vocab_size = vocab_size # 총 어휘수 
        self.hidden_size = hidden_size # gru의 hidden_size
        self.max_length = max_length

     
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
     
        # Attential(attn) weight를 계산할때 사용할 Linnear
        # input의 크기: hidden_size(GRU의 hidden사이즈 개수) + embedding vector의 개수
        # output의 크기: Encorder token 개수) + attential value 비율값
     
        self.attn = nn.Linear(hidden_size+embedding_dim, max_length)

        # 가정: hidden_state=200. embedding_dim: 100, max_lenght: 26
        # hidden_state와 embedding_vector를 합친다.
        # (1, 200+100) =attn=> (1, 26) =softmax=> (1, 26) : attential weight
        # attetial value = (어텐션 가중치) × (인코더의 히든 스테이트)의 가중 합
        # (1, 26) * (26, 200) =matmul=> (1, 200) : attention_value (context_vector)



        # input: attential value(1, hedden_size) + embedding vector(1,embedding_dim)
        # out: gru 입력 개수로 우리가 정한다 ->hidden size
        self.attn_combine = nn.Linear(embedding_dim+hidden_size, hidden_size)
        
        self.dropout = nn.Dropout(dropout_p)
        self.gru = nn.GRU(hidden_size, hidden_size)

        self.classifier = nn.Linear(hidden_size, vocab_size)

    def forward(self, x, hidden, encoder_outputs):
        """
        Args:
            x: 현재 timestep의 입력 토큰(단어) id
            hidden: 이전 timestep 처리결과 hidden state
            encoder_outputs: Encoder output들.(모든 토큰의 hidden_state)
            
        Returns:
            tuple: (output, hidden, attention_weight)
                output: 단어별 다음 단어일 확률.  shape: [vocab_size]
                hidden: hidden_state. shape: [1, 1, hidden_size]
                atttention_weight: Encoder output 중 어느 단어에 집중해야하는 지 가중치값. shape: [1, max_length]

        현재 timestep 입력과 이전 timestep 처리결과를 기준으로 encoder_output와 계산해서, 
        encoder_output에서 집중(attention)해야할 attention value를 계산한다.
        attention value와 현재 timestep 입력을 기준으로 단어를 추론(생성) 한다.
        """

        embedding = self.embedding(x).unsqueeze(0)
        embedding = self.dropout(embedding)

        attn_in = torch.concat((embedding[0], hidden[0]), dim=1)
        attn_score = self.attn(attn_in)

        attn_weight = nn.Softmax(dim=-1)(attn_score)

        # bmm-batch matrix ml
        # (5,1,26) @ (5,26,200) = (5, 1, 200)
        attn_value = torch.bmm(
            attn_weight.unsqueeze(0),
            encoder_outputs.unsqueeze(0),
        )
        
        attn_combine_in = torch.concat(
            [attn_value[0], embedding[0]], 
            dim=1
        )
        gru_in = self.attn_combine(attn_combine_in)
        gru_in = gru_in.unsqueeze(0)
        gru_in = nn.ReLU()(gru_in)
        
        out, hidden_state = self.gru(gru_in, hidden)

        last_out = self.classifier(out[0])
        
        return last_out[0], hidden_state, attn_weight
```

`forward` 한 번의 계산을 shape으로 따라가면 (hidden 200, embedding 256, max_length 20)

| 단계 | 계산 | shape |
|---|---|---|
| 입력 단어 | `embedding(x)` | (1, 1, 256) |
| Attention Score | `attn([embedding; hidden])` | (1, 456) → (1, 20) |
| Attention Weight | Softmax | (1, 20), 합 1 |
| Attention Value | `bmm(weight, encoder_outputs)` | (1, 1, 20) @ (1, 20, 200) → (1, 1, 200) |
| Combine | `attn_combine([value; embedding])` + ReLU | (1, 456) → (1, 200) |
| GRU | 이전 hidden과 함께 | (1, 1, 200) |
| 단어 예측 | `classifier` | (vocab_size,) |

> **보충** 엄밀히 말하면 이 구현의 attention weight는 Encoder 출력을 **보고** 계산하지 않는다. `attn` Linear가 Decoder의 현재 입력과 hidden만 받아 **20개 위치에 대한 점수**를 바로 낸다. "지금 상태라면 몇 번째 위치를 봐야 하는지"를 위치 기준으로 배우는 셈이다(PyTorch 공식 튜토리얼의 방식). Luong의 dot/general attention은 Decoder hidden과 각 Encoder 출력의 **내적**으로 점수를 매겨서, 입력 내용에 따라 집중할 곳이 바뀐다. 다음 글 Transformer의 Query·Key가 이 내적 방식이다.

## Training

```python
SOS_TOKEN = dataset.tokenizer.token_to_id("[SOS]")
EOS_TOKEN = dataset.tokenizer.token_to_id("[EOS]")
print(SOS_TOKEN, EOS_TOKEN)
```

```text
2 3
```

질문-답변 **한 쌍**을 학습하는 함수다.

```python
# 한개 question-answer 쌍을 받아서 학습
def train(
        input_tensor,
        target_tensor,
        encoder,
        decoder,
        encoder_optimizer,
        decoder_optimizer,
        loss_fn,
        device,
        max_length,
        teacher_forcing_ratio=0.9):


    input_tensor, target_tensor = input_tensor.to(device), target_tensor.to(device)
    loss = 0.0 # loss값 저장할 변수.

    #Encorder/Decorder의 파라미터의 grad값 초기
    encoder_optimizer.zero_grad()
    decoder_optimizer.zero_grad()

    # Encoder 처리
    encoder_hidden = encoder.init_hidden(device)

    # 질문/답변의 length(토큰수)를 조회
    input_length = input_tensor.shape[0]
    output_length = target_tensor.shape[0]

    # encoder hidden state들을 저장할 tensor를 정의
    encoder_outputs = torch.zeros(max_length, encoder.hidden_size, device=device)
    for e_idx in range(input_length):
        encoder_out, encoder_hidden = encoder(input_tensor[e_idx], encoder_hidden)
        encoder_outputs[e_idx] = encoder_out


    decoder_input = torch.tensor([SOS_TOKEN], device=device)
    decoder_hidden = encoder_hidden
    
    # teacher_forcing 여부
    teacher_forcing = True if teacher_forcing_ratio > random.random() else False

    for d_idx in range(output_length):
        # 반환값: decoder_output 다음 단어 예측값(단어별 다음 단어일 확률)
        #         decoder_hidden - hidden state 
        #         attn_weight - 계산된 attention weight
        decoder_out, decoder_hidden, attn_weight = decoder(decoder_input,
                                                           decoder_hidden,
                                                           encoder_outputs)
        
        loss += loss_fn(decoder_out.unsqueeze(0), target_tensor[d_idx])

        if teacher_forcing:
            decoder_input = target_tensor[d_idx]
        else:
            output_token = decoder_out.argmax(dim=-1).unsqueeze(0)
            decoder_input = output_token.detach() # Tensor.detach(): gradient 계산그래프에서 제외.

        teacher_forcing_ratio *= 0.99

        if decoder_input == EOS_TOKEN:
            break
    
    # 순전파가 완료 (질문 -> 답변) ==> 역전파 gradient 계산->파라미터 업데이트
    loss.backward()
    encoder_optimizer.step()
    decoder_optimizer.step()

    # loss 평균 반환
    return loss.item() / output_length
```

1. Encoder에 질문 토큰을 하나씩 넣고, 매 step의 출력을 `encoder_outputs`(max_length × hidden)에 모은다. 질문이 20토큰보다 짧으면 나머지 행은 0이다
2. Decoder는 `[SOS]`와 Encoder의 마지막 hidden으로 시작한다
3. 매 step마다 Decoder가 `encoder_outputs` 전체를 보며 다음 단어를 예측하고, loss를 누적한다
4. `[EOS]`가 나오면 멈춘다

> **보충** `teacher_forcing` 여부를 문장마다 **한 번** 정하고 나서 루프 안에서 `teacher_forcing_ratio *= 0.99`를 곱한다. 그런데 이 값은 루프 안에서 다시 쓰이지 않아서 아무 효과가 없다. 지난 글의 Seq2Seq처럼 step마다 다시 뽑으려면 `random.random()` 비교를 루프 안으로 옮겨야 한다.

여러 쌍을 무작위로 뽑아 반복 학습하는 함수다.

```python
def train_iterations(
        encoder, decoder, n_iters,
        dataset, device, log_interval=1000, learning_rate=0.001):
        
        # encoder/decoder 모델을 train 모드로 변환
        encoder.train()
        decoder.train()
        print_loss = 0.0

        # 옵티마이저 생성
        encoder_optimizer = torch.optim.Adam(encoder.parameters(), lr=learning_rate)
        decoder_optimizer = torch.optim.Adam(decoder.parameters(), lr=learning_rate)
        
        #loss 함수
        loss_fn = nn.CrossEntropyLoss()

        # 학습 시킬 데이터를 sampling
        data_length = len(dataset)
        train_data = [dataset[random.randint(0, data_length-1)]   for i in range(n_iters)]

        # 학습-train
        s = time.time()
        for idx in range(n_iters):
            input_tensor, target_tensor = train_data[idx]
            loss = train(input_tensor, target_tensor, encoder, decoder,
                         encoder_optimizer, decoder_optimizer, loss_fn,
                         device, max_length=MAX_LENGTH
                        )
            print_loss += loss
            if (idx+1) % log_interval == 0:
                print(f"{idx+1}개 QA상 학습: loss - {print_loss/log_interval:.5f}")
                print_loss = 0.0

        e = time.time()
        print(f'학습에 걸린 시간: {e-s}초')
```

batch 없이 한 쌍씩 학습하므로 "epoch" 대신 "몇 쌍을 학습했는가(iteration)"로 센다. 11,700쌍에서 무작위로 뽑으니 같은 쌍이 여러 번 나오기도 하고 한 번도 안 나오기도 한다.

## 모델 생성, 학습

```python
VOCAB_SIZE = tokenizer.get_vocab_size()
HIDDEN_SIZE = 200
EMBEDDING_DIM = 256
DROPOUT_P = 0.2
MAX_LENGTH = 20

encoder = Encoder(VOCAB_SIZE, HIDDEN_SIZE, EMBEDDING_DIM, 1)
decoder = AttentionDecoder(VOCAB_SIZE, HIDDEN_SIZE, EMBEDDING_DIM, DROPOUT_P, MAX_LENGTH)

encoder = encoder.to(device)
decoder = decoder.to(device)
```

```python
# n_iters = 110_000
n_iters = 24_000   # 보충: 노트북은 n_iters = 1로 실행만 확인. CPU라 24,000쌍으로 줄였다
log_interval = 2000
train_iterations(encoder, decoder, n_iters, dataset, device, log_interval)
```

```text
2000개 QA상 학습: loss - 5.64940
4000개 QA상 학습: loss - 5.27431
6000개 QA상 학습: loss - 4.98231
8000개 QA상 학습: loss - 4.69299
10000개 QA상 학습: loss - 4.43495
12000개 QA상 학습: loss - 4.23030
14000개 QA상 학습: loss - 4.05693
16000개 QA상 학습: loss - 3.92742
18000개 QA상 학습: loss - 3.64781
20000개 QA상 학습: loss - 3.57560
22000개 QA상 학습: loss - 3.46236
24000개 QA상 학습: loss - 3.32394
학습에 걸린 시간: 1123.0083620548248초
```

- 24,000쌍(데이터 약 2바퀴)에 약 19분이 걸렸다. 한 쌍씩 학습해서 GPU의 병렬성을 쓰기도 어려운 구조다
- loss는 5.65 → 3.32로 계속 내려가는 중이고 아직 평평해지지 않았다. 원래 설정인 110,000쌍(약 9바퀴)이었다면 훨씬 더 내려갔을 것이다

## 저장

```python
#토크나이저, 인코더, 디코더 저장
root_path = "saved_models/chatbot_attn"
os.makedirs(root_path,  exist_ok=True)

tokenizer_path = os.path.join(root_path, "tokenizer.json")
encoder_path = os.path.join(root_path, "encoder_model.pt")
decoder_path = os.path.join(root_path, "decoder_model.pt")

tokenizer.save(tokenizer_path)
torch.save(encoder, encoder_path)
torch.save(decoder, decoder_path)
```

> **보충** 토크나이저를 위에서는 `saved_model/chatbot_attn/`(단수)에, 여기서는 `saved_models/chatbot_attn/`(복수)에 저장했다. 폴더 이름이 한 글자 달라서 파일이 두 곳에 나뉜다. 모델과 토크나이저는 같은 폴더에 두는 게 안전하다.

## 검증

```python
# 저장된 모델 Load
tokenizer = Tokenizer.from_file(tokenizer_path)
encoder = torch.load(encoder_path, weights_only=False, map_location=device)
decoder = torch.load(decoder_path, weights_only=False, map_location=device)
```

```python
SOS_TOKEN = tokenizer.token_to_id('[SOS]')
EOS_TOKEN = tokenizer.token_to_id('[EOS]')
def evaluate(encoder, decoder, input_tensor, dataset, device, max_length):
    encoder.eval()
    decoder.eval()
    with torch.no_grad():
        input_length = input_tensor.shape[0]
        encoder_hidden = encoder.init_hidden(device)

        # encoder의 hidden state들을 모을 텐서 생성
        encoder_outputs = torch.zeros(max_length, encoder.hidden_size, device=device)

        # encoder 실행
        for e_index in range(input_length):
            encoder_output, encoder_hidden = encoder(input_tensor[e_index], encoder_hidden)
            encoder_outputs[e_index] = encoder_output[0, 0]

        # decoder 실행
        decoder_input = torch.tensor([SOS_TOKEN], device=device)
        decoder_hidden = encoder_hidden

        # 결과를 저장할 리스트
        decoded_words = []
        decoder_attn_weights = []

        for d_index in range(max_length):
            decoder_output, decoder_hidden, attn_weight = decoder(decoder_input,
                                                                  decoder_hidden,
                                                                  encoder_outputs)
            decoder_attn_weights.append(attn_weight.data)

            topv, topi  = decoder_output.data.topk(1)

            if topi.item() == EOS_TOKEN:
                decoded_words.append('[EOS]')
                break
            else:
                decoded_words.append(dataset.tokenizer.id_to_token(topi.item()))
            decoder_input = topi.detach()

    return decoded_words, decoder_attn_weights
```

학습과 달리 정답이 없으니 매 step 예측한 단어(`topi`)를 다음 입력으로 넣고, `[EOS]`가 나오거나 `max_length`에 닿으면 멈춘다. 매 step의 attention weight도 모아 둔다.

```python
def handle_special_tokens(decoded_string):
    """
    Subword 처리
    subword는 단어의 시작으로 쓰인 것과 중간 부분(연결)에 사용된 두가지 subword가 있다.  연결 subword는 `#`과 같은 특수문자로 시작 한다.
    tokenizer.decode() 결과 문자열은 subword의 특수문자('##')을 처리하지 않는다. 이것을 처리하는 함수
    ex) "이 기회 ##는 내 ##꺼 #야" ==> "이 기회는 내꺼야"

    Parameter
        decoded_string: str - Tokenizer가 decode한 중간 subword의 특수문자 처리가 안된 문자열.
    Return
        str: subword 특수문자 처리한 문자열
    """

    tokens = decoded_string.split()
    new_tokens = []
    for token in tokens:
        if token.startswith("##"):
            if new_tokens:
                
                new_tokens[-1] += token[2:]
            else:
                new_tokens.append(token[2:])
        else:
            new_tokens.append(token)

    return " ".join(new_tokens)
```

```python
def evaluate_randomly(encoder, decoder, dataset, device, n=10):
    # n개 확인.
    for i in range(n):
        idx = random.randint(0, len(dataset))
        x, y = dataset[idx]
        q = dataset.tokenizer.decode(x.flatten().tolist())
        a = dataset.tokenizer.decode(y.flatten().tolist())
        print("질문(정답):", handle_special_tokens(q))
        print("답변(정답):", handle_special_tokens(a))

        # 추론
        output_words, atten_weights = evaluate(encoder, decoder,
                                              x.to(device),
                                              dataset, device, MAX_LENGTH)
        
        output_sentence = ' '.join(output_words[:-1])
        print("답변(예측):", handle_special_tokens(output_sentence))
        print("="*50)
```

> **보충** `random.randint(0, len(dataset))`은 끝값 `len(dataset)`도 포함해서, 드물게 범위를 벗어난 index로 `IndexError`가 난다. `len(dataset) - 1`이어야 한다(MNIST 글의 같은 실수). 또 `output_words[:-1]`은 마지막 `[EOS]`를 떼려는 것인데, `[EOS]` 없이 `max_length`에 닿아 끝난 경우에는 실제 마지막 단어가 잘린다.

```python
evaluate_randomly(encoder, decoder, dataset, device, n=8)
```

```text
질문(정답): 예쁘니까 사랑하는 건가 ?
답변(정답): 사랑하니까 예뻐보이는 걸 수도 있어요 .
답변(예측): 직접적으로 물어보는 게 좋죠 .
==================================================
질문(정답): 마음을 아무리 밀어내도 안돼
답변(정답): 마음은 마음대로 되지 않아요 .
답변(예측): 마음은 좋 되지 않아요 .
==================================================
질문(정답): 사랑하는 거 힘들다
답변(정답): 서로 다른 두 사람이 만나는 거라 더 힘든 것 같아요 .
답변(예측): 서로한게 더 두 것 같아요 .
==================================================
질문(정답): 갑작스러운 이별 .
답변(정답): 이별은 모두 갑작스럽죠 .
답변(예측): 이별은 이별은 예의가 아니네요 .
==================================================
질문(정답): 살 게 없네
답변(정답): 안 사면 그만큼 모으시는거예요 .
답변(예측): 이부터 일이 많아요 .
==================================================
질문(정답): 과일 먹고 자야지
답변(정답): 제철과일이 정말 좋아요 .
답변(예측): 피부관리까지 하시다니 !
==================================================
질문(정답): 썸남이랑 1박 2일로 펜셥 잡고 놀러가는데 고백 없으면 끝 ?
답변(정답): 고백을 안하고 사귀는 경우도 있지만 정확하게 물어보는게 좋아요 . 먼저 얘기를 끄내보세요 .
답변(예측): 그 사람을 위해서는 것도 좋겠죠 .
==================================================
질문(정답): 일이 또 쌓이네
답변(정답): 하나씩 다 할 수 있을 거예요 .
답변(예측): 그래도 해야 하네요 .
==================================================
```

- "마음을 아무리 밀어내도 안돼" → "마음은 좋 되지 않아요"(정답: 마음은 마음대로 되지 않아요)처럼 **문장의 뼈대**는 맞히기 시작했다
- 하지만 대부분은 "서로한게 더 두 것 같아요", "이별은 이별은 예의가 아니네요"처럼 조각을 이어 붙인 수준이다. 같은 단어를 반복하는 것도 학습이 덜 된 생성 모델의 전형적인 증상이다
- 지난 글의 20 epoch Seq2Seq가 학습 답변을 통째로 외웠던 것과 비교하면, 이 모델은 2바퀴만 돌아서 **아직 외우지도 못한 상태**다. 구조의 우열을 비교할 수 있는 조건은 아니다

### Attention Weight 시각화 (보충)

모델이 답변의 각 단어를 만들 때 질문의 어느 위치를 봤는지 그려 본다.

```python
# 보충: 질문 위치(가로) × 생성 단어(세로) attention weight
def show_attention(question):
    ids = tokenizer.encode(question).ids[:MAX_LENGTH - 1] + [EOS_TOKEN]
    x = torch.tensor(ids, dtype=torch.int64).unsqueeze(1)
    words, weights = evaluate(encoder, decoder, x, dataset, device, MAX_LENGTH)
    w = torch.cat(weights, dim=0)[:, :len(ids)].numpy()     # 질문 길이까지만
    q_tokens = [tokenizer.id_to_token(i) for i in ids]

    fig, ax = plt.subplots(figsize=(0.6 * len(q_tokens) + 2, 0.45 * len(words) + 1.5))
    ax.imshow(w, cmap="Blues", vmin=0)
    ax.set_xticks(range(len(q_tokens)), q_tokens, rotation=45, ha="right")
    ax.set_yticks(range(len(words)), words)
    ax.set_xlabel("질문 토큰")
    ax.set_ylabel("생성한 답변 토큰")
    ax.set_title(f"Q: {question}")
    plt.tight_layout()
    plt.show()
    for word, row in zip(words, w):                          # 생성 단어마다 가장 많이 본 질문 토큰
        top = row.argmax()
        print(f"{word:8} → {q_tokens[top]} ({row[top]:.2f}),  질문 위치 전체 합 {row.sum():.2f}")
    return handle_special_tokens(" ".join(words[:-1] if words[-1] == "[EOS]" else words))

show_attention("오늘 날씨가 너무 좋아서 놀러 가고 싶다")
```

```text
저도       → 오늘 (0.19),  질문 위치 전체 합 0.20
데려       → 너무 (0.17),  질문 위치 전체 합 0.22
##이네요    → 놀러 (0.04),  질문 위치 전체 합 0.06
.        → 놀러 (0.00),  질문 위치 전체 합 0.01
[EOS]    → 싶다 (0.01),  질문 위치 전체 합 0.01
```

![그래프 출력](/images/nlp/nlp-attention-1.png)

```text
'저도 데려이네요 .'
```

그래프와 출력을 같이 보면 특이한 점이 있다. 첫 단어 "저도"를 만들 때 질문 토큰들에 준 가중치의 합이 0.20밖에 안 되고, 뒤로 갈수록 0.01까지 떨어진다. 나머지 0.8~0.99는 질문이 끝난 뒤의 **빈 위치**(0으로 채운 `encoder_outputs`의 나머지 행)로 갔다.

앞의 보충에서 말한 대로, 이 Decoder의 `attn`은 Encoder 출력을 보지 않고 **20개 위치에 대한 점수**를 바로 낸다. 질문이 몇 토큰인지 모르니 빈 위치에도 가중치를 주고, 빈 위치의 값은 0이라 Attention Value가 작아질 뿐이다. 실제 구현에서는 질문 길이 밖의 점수를 Softmax 전에 `-inf`로 가리는 **마스킹**을 하고, 점수 자체를 Decoder hidden과 각 Encoder 출력의 내적으로 계산한다. 다음 글의 Transformer가 그 방식(Query·Key 내적 + 마스킹)이다.

## Seq2Seq vs Seq2Seq + Attention

| | Seq2Seq | Seq2Seq + Attention |
|---|---|---|
| Decoder가 보는 입력 정보 | Encoder 마지막 hidden 하나(고정) | 매 step Encoder 출력 전체의 가중합(step마다 다름) |
| 긴 입력 | 앞부분 정보가 흐려진다 | 필요한 위치를 직접 참고한다 |
| 해석 | 어렵다 | attention weight로 어디를 봤는지 볼 수 있다 |
| 남은 한계 | — | RNN이라 여전히 토큰을 하나씩 순서대로 처리한다(병렬 불가) |

마지막 줄이 다음 글의 주제다. Transformer는 RNN을 빼고 Attention만 남겨서 문장 전체를 한 번에 처리한다.

## 정리

- Seq2Seq는 입력 전체를 **고정된 context vector 하나**로 압축해서 정보 손실이 생기고, 출력 단어마다 다른 입력 부분을 참고하지 못한다
- **Attention**은 Decoder가 단어를 만들 때마다 Encoder 출력 전체를 다시 보고, 관련 있는 부분에 더 큰 가중치를 준다
- Luong 방식 Decoder는 **Attention Weight**(Softmax 점수) → **Attention Value**(Encoder 출력의 가중합) → **Combine**(입력 embedding과 합쳐 Linear + ReLU) → **GRU** → **단어 예측** 순으로 계산한다
- 한 쌍씩 학습하는 구조라 패딩 대신 `[EOS]`로 문장 끝을 표시하고, 추론은 `[EOS]`가 나올 때까지 이어진다
- attention weight를 그려 보면 모델이 답의 어느 단어를 만들 때 질문의 어디를 봤는지 확인할 수 있다
