---
title: "Seq2Seq 챗봇: Encoder–Decoder 구조"
description: "입력 시퀀스를 Context Vector로 압축하는 Encoder와 그걸로 답변을 한 토큰씩 생성하는 Decoder, Teacher Forcing과 노출 편향을 정리하고, 한국어 챗봇 데이터(11,823쌍)로 BPE 토크나이저·패딩 Dataset·GRU 기반 Encoder/Decoder/Seq2Seq 모델을 구현합니다. 1 epoch 모델과 20 epoch 모델의 답변을 train·test 질문으로 비교하고 새 질문에 답하게 합니다."
category: 'Tech'
subcategory: 'NLP'
series: '자연어 처리'
seriesOrder: 9
originalNotebook: "10_Seq2Seq_chatbot.ipynb"
tags: ["NLP"]
date: 2026-06-18T10:00:00+09:00
thumbnail: '../../../assets/images/notes/nlp/nlp-seq2seq-chatbot.webp'
---

> SKN31 자연어 처리 과정 노트북 `10_Seq2Seq_chatbot.ipynb`를 바탕으로 정리했습니다.
> 노트북의 학습 셀은 실행 기록이 없고, 학습된 모델 파일(1 epoch `model.pth`, 20 epoch `last_epoch_model.pth`)을 불러와 결과를 확인하는 셀이 실행돼 있습니다. 이 글도 같은 모델 파일로 추론했습니다. 코드는 PyTorch 2.5(CPU), tokenizers 0.23에서 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- Encoder–Decoder 구조와 Context Vector
- Seq2Seq로 챗봇 만들기: 데이터, BPE 토크나이저, 패딩 Dataset
- GRU 기반 Encoder, Decoder, Seq2Seq 모델
- Teacher Forcing과 노출 편향
- 학습·평가 함수, 학습된 모델로 대화하기

지난 글의 감성 분석은 문장 → 숫자 하나(Many to One)였다. 이번엔 문장 → **문장**이다. RNN 글에서 본 구조 중 **Seq2Seq**다.

## Encoder–Decoder 구조

- 입력 시퀀스를 받아 **의미를 해석**한 뒤, 새로운 **출력 시퀀스를 생성**하는 거의 모든 AI 문제에 쓰는 구조다
- Encoder와 Decoder 두 모델을 연결해서, **입력을 하나의 표현으로 압축한 뒤 그걸 다시 출력으로 변환**한다

| | Encoder | Decoder |
|---|---|---|
| 역할 | 입력을 해석(이해)한다 | Encoder의 요약으로 출력을 생성한다 |
| 출력 | 입력의 의미를 담은 고정 길이 벡터 | 출력 시퀀스 (한 토큰씩) |

### Seq2Seq (Sequence-to-Sequence)

Encoder–Decoder 구조를 **RNN 계열에 적용한 대표적인 시퀀스 변환 모델**이다. 입력과 출력이 모두 시퀀스라서 이런 이름이 붙었다.

**Encoder: 입력 시퀀스 이해 → Context Vector**

입력 시퀀스 전체를 순서대로 처리한 뒤 그 의미를 **고정 길이 벡터 하나**로 압축한다. 이 벡터가 **Context Vector**다.

- 입력 시퀀스 전체의 의미, 문맥, 핵심 정보를 요약한 벡터
- 기계 번역: 원문에서 번역문을 만드는 데 필요한 핵심 의미 정보
- 챗봇: 질문에서 답변을 만드는 데 필요한 의미 정보

**Decoder: Context Vector → 출력 시퀀스**

Context Vector를 받아 출력 시퀀스를 **한 토큰씩 순서대로** 생성한다. 매 time step마다 **이전에 생성한 단어**와 **Context Vector에 담긴 문맥**을 함께 보고 다음 단어를 예측한다.

![Seq2Seq](/images/nlp/fig-seq2seq.png)

## 챗봇 데이터셋

- Encoder로 질문의 특성을 뽑고, Decoder로 답변을 생성한다
- 데이터: [songys/Chatbot_data](https://github.com/songys/Chatbot_data)
  - Q: 질문, A: 답, label: 일상다반사 0, 이별(부정) 1, 사랑(긍정) 2

![챗봇 데이터셋](/images/nlp/fig-chatbot-dataset.png)

```python
url = "https://raw.githubusercontent.com/songys/Chatbot_data/refs/heads/master/ChatbotData.csv"

import requests
import os

os.makedirs("data/chatbot", exist_ok=True)
res = requests.get(url)
if res.status_code == 200:
    with open("data/chatbot/chatbot_data.csv", "wt", encoding="utf-8") as fw:
        fw.write(res.text)
else:
    print("다운로드 실패 - ", res.status_code)
```

> **보충** 다운로드 셀은 받아 둔 파일로 대신하고 아래부터 실행했다.

```python
import pandas as pd

df = pd.read_csv("data/chatbot/chatbot_data.csv", encoding="utf-8")
df.shape
```

```text
(11823, 3)
```

```python
# label 대화분류 컬럼 -> 제거
df.drop(columns=["label"], inplace=True)
df.head(10)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 10행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Q</th><th>A</th></tr></thead><tbody><tr><th class="idx">0</th><td>12시 땡!</td><td>하루가 또 가네요.</td></tr><tr><th class="idx">1</th><td>1지망 학교 떨어졌어</td><td>위로해 드립니다.</td></tr><tr><th class="idx">2</th><td>3박4일 놀러가고 싶다</td><td>여행은 언제나 좋죠.</td></tr><tr><th class="idx">3</th><td>3박4일 정도 놀러가고 싶다</td><td>여행은 언제나 좋죠.</td></tr><tr><th class="idx">4</th><td>PPL 심하네</td><td>눈살이 찌푸려지죠.</td></tr><tr><th class="idx">5</th><td>SD카드 망가졌어</td><td>다시 새로 사는 게 마음 편해요.</td></tr><tr><th class="idx">6</th><td>SD카드 안돼</td><td>다시 새로 사는 게 마음 편해요.</td></tr><tr><th class="idx">7</th><td>SNS 맞팔 왜 안하지ㅠㅠ</td><td>잘 모르고 있을 수도 있어요.</td></tr><tr><th class="idx">8</th><td>SNS 시간낭비인 거 아는데 매일 하는 중</td><td>시간을 정하고 해보세요.</td></tr><tr><th class="idx">9</th><td>SNS 시간낭비인데 자꾸 보게됨</td><td>시간을 정하고 해보세요.</td></tr></tbody></table></div></div>

```python
df.tail(5)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Q</th><th>A</th></tr></thead><tbody><tr><th class="idx">11818</th><td>훔쳐보는 것도 눈치 보임.</td><td>티가 나니까 눈치가 보이는 거죠!</td></tr><tr><th class="idx">11819</th><td>훔쳐보는 것도 눈치 보임.</td><td>훔쳐보는 거 티나나봐요.</td></tr><tr><th class="idx">11820</th><td>흑기사 해주는 짝남.</td><td>설렜겠어요.</td></tr><tr><th class="idx">11821</th><td>힘든 연애 좋은 연애라는게 무슨 차이일까?</td><td>잘 헤어질 수 있는 사이 여부인 거 같아요.</td></tr><tr><th class="idx">11822</th><td>힘들어서 결혼할까봐</td><td>도피성 결혼은 하지 않길 바라요.</td></tr></tbody></table></div></div>

```python
# 결측치
df.isnull().sum()
```

```text
Q    0
A    0
dtype: int64
```

질문과 답변이 모두 짧은 한두 문장이다. 같은 답변("여행은 언제나 좋죠.")이 비슷한 질문 여러 개에 붙어 있기도 하다.

## Dataset, DataLoader

### 토큰화: Subword

질문과 답변을 합쳐서 BPE 토크나이저를 학습한다. Decoder가 쓸 특수 토큰 `<sos>`(start of sequence, 문장 시작)를 추가한다.

```python
question_texts = df['Q']
answer_texts = df['A']
# 토큰화를 위해서 "질문 + 답변"을 합쳐서 하나의 문서로 만든다.
all_texts = list(question_texts + " " + answer_texts) # 시리즈 + 시리즈 : 원소별 연산.
all_texts[:5]
```

```text
['12시 땡! 하루가 또 가네요.', '1지망 학교 떨어졌어 위로해 드립니다.', '3박4일 놀러가고 싶다 여행은 언제나 좋죠.', '3박4일 정도 놀러가고 싶다 여행은 언제나 좋죠.', 'PPL 심하네 눈살이 찌푸려지죠.']
```

```python
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.pre_tokenizers import Whitespace
from tokenizers.trainers import BpeTrainer

tokenizer = Tokenizer(BPE(unk_token="<unk>"))
tokenizer.pre_tokenizer = Whitespace()

trainer = BpeTrainer(
    vocab_size=30_000,
    min_frequency=2,
    continuing_subword_prefix="##", # 단어 중간에 붙는 subword일 경우 붙이는 접두어. 
    special_tokens=["<unk>", "<pad>", "<sos>"], # <sos> : 문장의 시작을 알리는 토큰. 
    show_progress=False,
)

# 토큰나이저 학습
tokenizer.train_from_iterator(all_texts, trainer=trainer)
tokenizer.get_vocab_size()
```

```text
15582
```

학습된 모델 파일을 쓰려면 **그 모델을 학습할 때 쓴 토크나이저**를 그대로 불러와야 한다. 토큰 id가 하나라도 다르면 모델은 엉뚱한 단어를 보게 된다.

```python
####### 저장된 토크나이저 로드
# 모델이 학습할 때 사용한 것과 같은 토크나이저를 로드.
from tokenizers import Tokenizer

tokenizer = Tokenizer.from_file("chatbot_seq2seq_model/chatbot_bpe.json")
print(tokenizer.get_vocab_size())
```

```text
15582
```

> **보충** 같은 데이터, 같은 설정으로 학습했는데 사전 크기가 다르다(위 결과와 15,582). tokenizers 버전이나 학습 데이터의 미세한 차이로도 사전이 달라진다. 모델을 배포할 때 토크나이저 파일을 모델과 **반드시 같이** 저장하는 이유다.

```python
e = tokenizer.encode("3박4일 정도 놀러가고 싶다")
print(e.tokens)
e.ids
```

```text
['3박4일', '정도', '놀러가고', '싶다']
```

```text
[15123, 2892, 5234, 2331]
```

### Dataset 정의

- DataLoader가 배치를 만들려면 모든 문장의 토큰 수가 같아야 한다
- 최대 길이를 정하고, **짧으면 `<pad>`를 추가**, **길면 자른다**

```python
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split

device = "cuda" if torch.cuda.is_available() else "cpu"
device
```

```text
'cpu'
```

```python
# Dataset 정의
class ChatbotDataset(Dataset):

    def __init__(self, question_texts, answer_texts, max_length, tokenizer):
        """
        Args:
            question_texts: list[str] - 질문 text들. ["질문1", "질문2", ...]
            answer_texts: list[str] - 답변 text들. ["답변1", "답변2", ...]
            max_length: int - 개별 질문, 답변의 토큰 수
            tokenizer: Tokenizer
        """
        self.max_length = max_length
        self.tokenizer = tokenizer
        # [Tensor([토큰 id, ...])]
        # "3박 4일 휴가동안 미국에 여행갈 예정이다." -> [100, 200, 222, 321, ...] : 토큰개수: Max_length
        self.question_texts = [self.__process_sequence(q) for q in question_texts]
        self.answer_texts = [self.__process_sequence(a) for a in answer_texts]
        # list[LongTensor]  # 자료구조 타입힌트 - a:list[str] b:tuple[int]

    def __process_sequence(self, text:str):
        """한 문장을 받아서 max_length 크기의 토큰 tensor로 반환."""
        # 토큰화
        encoding = self.tokenizer.encode(text)
        # max_length 크기에 맞추기 (모자라면 <pad> 추가, 넘치면 잘라내기.)
        tokens = self.__pad_token_sequence(encoding.ids)
        return torch.tensor(tokens, dtype=torch.int64)

    def __pad_token_sequence(self, token_sequence):
        """token sequence: [[토큰 ID, ...], [.....]]을 max_length에 크기를 맞춰준다."""
        pad_token = self.tokenizer.token_to_id("<pad>") # Padding 토큰의 id 조회.
        seq_length = len(token_sequence)
        if seq_length >= self.max_length: # max_length크기로 줄이기
            result = token_sequence[:self.max_length]
        else:
            result = token_sequence + [pad_token] * (self.max_length - seq_length)
        
        return result

    def __len__(self):
        return len(self.question_texts)

    def __getitem__(self, index):
        """ index의 X(question), y(answer)을 튜플로 반환"""

        q = self.question_texts[index]
        a = self.answer_texts[index]
        return q, a
```

지난 글과 달리 이번 Dataset은 `__init__`에서 패딩까지 마친다.

```python
# max_length - QA중에서 가장 긴 토큰으로 맞춘다.
print(max([len(tokenizer.encode(sent).ids) for sent in question_texts]))
print(max([len(tokenizer.encode(sent).ids) for sent in answer_texts]))
```

```text
18
26
```

```python
max_length = 26
dataset = ChatbotDataset(
    question_texts,
    answer_texts,
    max_length,
    tokenizer
)
question_texts[1200], answer_texts[1200]
```

```text
('대리운전 불렀어', '잘했어요.')
```

```python
dataset[1200]
```

```text
(tensor([5317, 1491, 1492,  591, 7691,    1,    1,    1,    1,    1,    1,    1,
           1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
           1,    1]), tensor([4538,    8,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
           1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
           1,    1]))
```

짧은 문장이라 대부분이 `<pad>`(id 1)다.

### Train / Test 나누기 (0.95 : 0.05)

```python
train_size = int(len(dataset) * 0.95)
test_size = len(dataset) - train_size

trainset, testset = random_split(dataset, [train_size, test_size])
len(trainset), len(testset)
```

```text
(11231, 592)
```

```python
train_loader = DataLoader(trainset, batch_size=100, shuffle=True, drop_last=True)
test_loader = DataLoader(testset, batch_size=100)
len(train_loader), len(test_loader)
```

```text
(112, 6)
```

## 모델 정의

### Encoder

Encoder는 **입력 문장의 의미**를 N차원 공간에 담은 벡터 하나를 만든다. 이게 **Context Vector**다.

![Encoder](/images/nlp/fig-seq2seq-encoder.png)

```python
pad_id = tokenizer.token_to_id("<pad>")
class Encoder(nn.Module):
    def __init__(
            self,
            vocab_size: int, # 어휘수. tokenizer의 vocab_size 받는다.
            embedding_dim: int, # Embedding Vector의 차원수.
            hidden_size: int,   # GRU의 hidden 개수 (추출할 특성개수) 
            bidirectional: bool=True, # GRU 양방향여부. Encoder는 문서를 입력받기 때문에 양방향설정을 한다.
            num_layers: int=1, # GRU의 layer stack 수.
            dropout: float=0.2 # Dropout 비율
    ):
        super().__init__()
        ## EmbeddingLayer -> GRU (-> Decoder)
        # Embedding Layer
        self.embedding = nn.Embedding(
            vocab_size, embedding_dim, padding_idx=1
        )
        self.gru = nn.GRU(
            input_size=embedding_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            bidirectional=bidirectional,
            dropout=dropout if num_layers > 1 else 0.0,
            # batch_first=False
        )
        self.vocab_size = vocab_size
        
    def forward(self, X):
        # X.shape: [batch_size:문서개수, seq_length:토큰개수] -> embedding 
        ##       -> embedding_vector.shape: [batch_size, seq_length, embedding_dim]
        embedding_vector = self.embedding(X)
        
        # batch_size 축 <-> seq_length 축 
        ##### (batch_size, seq_length, embedding_dim)->(seq_length, batch_size, embedding_dim)
        embedding_vector = embedding_vector.transpose(1, 0)

        out, hidden = self.gru(embedding_vector)
        #out: 모든 time step의 hidden state들
        #hidden: 마지막 time step의 hidden state
        return out, hidden
```

- Encoder는 질문 문장 **전체**를 한꺼번에 받으니 **양방향**을 쓴다 (Non-Auto Regressive)
- `padding_idx=1`: `<pad>`의 id가 1이라 그 embedding을 0으로 고정한다

```python
from torchinfo import summary
v_size = 1000 # 단어수
e_size = 100  # embedding dim
h_size = 20   # hidden size


dummy_input = torch.randint(1000, size=(256, 26), dtype=torch.int64)  # (batch, 토큰수)
summary(Encoder(v_size, e_size, h_size), input_data=dummy_input)
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
Encoder                                  [26, 256, 40]             --
├─Embedding: 1-1                         [256, 26, 100]            100,000
├─GRU: 1-2                               [26, 256, 40]             14,640
==========================================================================================
Total params: 114,640
Trainable params: 114,640
Non-trainable params: 0
Total mult-adds (M): 123.04
==========================================================================================
Input size (MB): 0.05
Forward/backward pass size (MB): 7.45
Params size (MB): 0.46
Estimated Total Size (MB): 7.97
==========================================================================================
```

출력이 `[26, 256, 40]`이다. 양방향이라 hidden size 20이 40이 됐다.

### Decoder

- Encoder의 출력(Context Vector)을 받아 답변 sequence를 출력한다
- 매 time step의 입력은 **이전 time step에서 예측한 단어**와 **hidden state**다
- hidden state를 Estimator(Linear + Softmax)에 넣어 **다음 단어**를 출력하고, 이 단어가 다음 step의 입력이 된다
- 첫 time step의 입력은 문장 시작을 뜻하는 `<sos>` 토큰, hidden state는 Context Vector(Encoder의 마지막 hidden state)다

![Decoder](/images/nlp/fig-seq2seq-decoder.png)

```python
class Decoder(nn.Module):

    def __init__(
            self,
            vocab_size:int,   # 어휘사전 크기
            embedding_dim:int,# embedding vector 차원수 
            hidden_size:int, # GRU의 hidden state의 크기(hidden_size)
            num_layers:int=1, # GRU의 layer stack 수
            dropout:float=0.2 # GRU의 dropout 비율
    ):
        # Decoder는 자기 회귀(auto regressive)모델 -> bidirectional=False 고정.
        super().__init__()
        # 임베딩 모델
        self.embedding = nn.Embedding(
            vocab_size, embedding_dim, padding_idx=1
        )
        # GRU
        self.gru = nn.GRU(
            input_size=embedding_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0.0,
            # bidirection=False # default: False
            # batch_first=False # default: False 입력 shape:(seq_len, batch, feature)
        )
        # Linear - 다음 단어(토큰)을 추론하는 분류기.
        self.classifier = nn.Linear(
            hidden_size, # 입력: GRU의 출력 hidden state개수
            vocab_size   # 출력: 다중분류 - 어휘사전의 단어들의 다음 단어일 확률.
        )

    def forward(self, X, hidden):
        """
        Args:
            X: 한개 토큰. shape: [batch]. ex) [1000(첫번째 문서의 답변토큰), 2000(두번째 문서), 1231, ..]
            hidden: 이전 timestep까지의 처리 hidden state. 
                    첫번째 timestep일 경우 Encoder의 context vector(encoder의 마지막 timestep의 hidden state)
                    [seq_length: 1, batch_size, hidden_size]
        """
        # 1. X shape: [batch] -> [batch, 1]
        X = X.unsqueeze(1)
        # embedding 처리: [batch, 1: seq_length] -> [batch, 1, embedding_dim]
        embedding_vector = self.embedding(X)
        
        # 1축 <-> 0축
        embedding_vector = embedding_vector.transpose(1, 0) # [1, batch, embeding_dim]

        # gru
        out, hidden = self.gru(embedding_vector, hidden)
        # out(모든 타임스텝) shape: [seq_len(1), batch_size, hidden_size]
        # hidden(마지막 타임스텝) shape: [num_layer * bidirectional(1), batch_size, hidden_size]

        # linear(classifier) => 다음단어 예측기(분류기)
        last_out = self.classifier(out[-1])

        return last_out, hidden
```

- Decoder는 다음 단어를 하나씩 만들어 가는 **자기 회귀(Auto Regressive)** 모델이라 단방향이다
- `forward`는 **토큰 하나**를 받아 **다음 토큰 하나**를 예측한다. 문장 전체 생성은 이걸 반복하는 바깥 for 문(Seq2Seq 모델)이 맡는다
- 출력층은 어휘 사전 전체에 대한 **다중 분류**다

```python
b_size = 256
v_size = 1000
h_size = 20
e_size = 100
dummy_input = torch.randint(v_size, [b_size], dtype=torch.int64)  # 한개 단어
dummy_hidden = torch.randn(size=(1, b_size, h_size), dtype=torch.float32)
dummy_decoder = Decoder(v_size, e_size, h_size)

summary(dummy_decoder, input_data=(dummy_input, dummy_hidden))
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
Decoder                                  [256, 1000]               --
├─Embedding: 1-1                         [256, 1, 100]             100,000
├─GRU: 1-2                               [1, 256, 20]              7,320
├─Linear: 1-3                            [256, 1000]               21,000
==========================================================================================
Total params: 128,320
Trainable params: 128,320
Non-trainable params: 0
Total mult-adds (M): 32.85
==========================================================================================
Input size (MB): 0.02
Forward/backward pass size (MB): 2.29
Params size (MB): 0.51
Estimated Total Size (MB): 2.83
==========================================================================================
```

## Seq2Seq 모델

Encoder와 Decoder를 Layer로 갖고, Encoder로 질문의 feature를 뽑고 Decoder로 답변을 생성한다.

### Teacher Forcing

- RNN 계열이 다음 단어를 예측할 때, 이전 step에서 **예측한 단어** 대신 **실제 정답 단어(ground truth)**를 입력으로 넣는 방법이다
- 학습 초반에는 모델이 엉뚱한 단어를 만들어 내서, 그걸 다음 입력으로 쓰면 오류가 줄줄이 이어져 학습이 느리다

| 장점 | 단점 |
|---|---|
| **수렴 속도 증가**: 정답을 넣으니 빨리 배운다 | **노출 편향(Exposure Bias)**: 실제 추론 때는 정답이 없어서 자기 예측으로 이어 가야 한다. 학습과 추론 조건이 달라 성능이 떨어질 수 있다 |
| **안정적인 학습**: 잘못된 예측이 다음 단계로 전파되지 않는다 | → 그래서 Teacher Forcing을 **확률적으로(random)** 적용한다 |

![Seq2Seq](/images/nlp/fig-seq2seq.png)

```python
import random
sos_token = tokenizer.token_to_id("<sos>")
# sos_token

class ChatbotSeq2Seq(nn.Module):

    def __init__(self, encoder, decoder, device="cpu"):
        super().__init__()
        self.encoder = encoder
        self.decoder = decoder 
        self.device = device

    def forward(self, inputs, outputs, teacher_forcing_rate=0.99):
        """
        Args:
            inputs (tensor): 질문. (batch, seq_length)
            outputs(tensor): 답변 정답. (batch, seq_length), teacher forcing 적용때 사용.
            teacher_forcing_rate(float): teacher forcing이 적용될 확률(랜덤하게 적용.)
        """
        # 1개 문서(데이터)가 입력될 때 1차원으로 들어 올 수있다. 
        # 1차원이면 2차원으로 변환. [seq_length] -> [1, seq_length]
        if inputs.dim() == 1:
            inputs = inputs.unsqueeze(0)
        
        if outputs.dim() == 1:
            outputs = outputs.unsqueeze(0)

        # output_length: 생성하는 답변의 토큰 개수를 정답의 토큰 개수에 맞춘다.
        batch_size, output_length = outputs.shape
        output_vocab_size = self.encoder.vocab_size  # 어휘수
        
        # 모델이 생성한 문서(답변)을 저장할 Tensor
        ## "나는", "소년", "이다"
        # [
        #    [모든 어휘들이 다음단어일 확률 - vocab_size], # "나는" 의 확률에 제일 높을 것.
        #    [모든 어휘들이 다음단어일 확률], - "소년"
        #    [모든 어휘들이 다음단어일 확률] - "이다"
        #]
        predicted_outputs = torch.zeros(
            output_length, # seq_length 
            batch_size,
            output_vocab_size # 모델이 추론한 모든 어휘가 그(다음) 단어일 확률
        ).to(self.device)

        #######################################################
        # 추론
        # 1. encoder를 통해서 context vector 추출. 한번 처리
        # 2. decoder를 통해서 답변 문장(문서) 생성. 하나씩 처리
        #######################################################
        
        # 1. context vector 추출. 
        ##### encoder_out: 모든 타임스텝의 hidden state (seq_length, batch, hidden_size*2)
        encoder_out, _ = self.encoder(inputs)
        
        # Decoder 첫번째 timestep의 입력할 값들을 생성
        ## 첫번째 timestep에 입력할 hidden state (context vector)
        decoder_hidden = encoder_out[-1].unsqueeze(0)  
        ## 첫번째 timestep의 입력값 (<sos> 토큰 ID)
        decoder_input = torch.full([batch_size], fill_value=sos_token, device=self.device)

        # 2. Decoder를 이용해서 한 단어(토큰)씩 생성. - decoder(현재 ts의 토큰, hidden-이전까지특성)
        for t in range(output_length):
            # decoder_out: 다음단어 - 어휘사전의 단어들이 다음 단어일 확률. [batch, voca_size]
            # decoder_hidden: hidden state
            decoder_out, decoder_hidden = self.decoder(decoder_input, decoder_hidden)

            # 다음 timestep의 input을 생성 -> 
            ## 모델이 예측한 단어 if teacher forcing을 안한다면 else 정답(outputs)단어
            teacher_forcing:bool = teacher_forcing_rate > random.random()
            teacher_forcing_rate *= 0.99  # teacher forcing rate 가 True일 확률을 줄여나간다.

            ## 모델이 예측한 다음 단어 토큰 ID를 생성
            top1 = decoder_out.argmax(dim=-1)
            decoder_input = outputs[:, t] if teacher_forcing else top1

            # decoder_out: 어휘사전의 단어들이 다음 단어일 확률.
            predicted_outputs[t] = decoder_out
        
        return predicted_outputs.transpose(1, 0) # seq_length <-> batch
```

흐름을 정리하면

1. Encoder가 질문 전체를 한 번에 읽어 Context Vector를 만든다
2. Decoder의 첫 입력은 `<sos>`, 첫 hidden은 Context Vector다
3. 정답 길이(`output_length`)만큼 for 문을 돌며 한 토큰씩 예측한다
4. 다음 입력은 확률 `teacher_forcing_rate`로 **정답 토큰**, 아니면 **방금 예측한 토큰**이다
5. 매 step의 예측(어휘 전체에 대한 점수)을 모아 `(batch, seq_len, vocab_size)`로 돌려준다

> **보충** 코드를 읽다 걸리는 점 세 가지.
> - Context Vector로 `encoder_out[-1]`을 쓴다. 양방향 GRU에서 `out[-1]`의 역방향 절반은 **마지막 토큰만 읽은** 상태다(지난 글의 LSTM 모델과 같은 문제). 게다가 뒤쪽이 `<pad>`라 정방향 절반도 패딩까지 읽은 값이다. `hidden`(마지막 hidden state)의 정·역방향을 이어 붙이는 쪽이 문장 전체를 담는다
> - `teacher_forcing_rate *= 0.99`가 **time step마다** 곱해진다. 그래서 한 문장 안에서 뒤로 갈수록 teacher forcing 확률이 줄어든다(26 step이면 0.9 → 0.69). 보통은 epoch이 지날수록 줄이는 방식을 쓴다
> - 답변 길이를 정답(`outputs`)에서 가져와서, 정답이 없는 실제 대화에서는 길이를 정할 더미 텐서를 넣어야 한다. 아래 대화 함수에서 그렇게 했다

## 학습

### 모델 생성

```python
# 파라미터 정의
vocab_size = tokenizer.get_vocab_size()
encoder_bidirectional = True
encoder_hidden_size = 200

# Decoder의 첫번째 hidden state == encoder의 마지막 hidden state(context vector)
decoder_hidden_size = encoder_hidden_size * 2 if encoder_bidirectional else encoder_hidden_size

embedding_dim = 256
teacher_forcing_rate = 0.9
```

Encoder가 양방향이면 Context Vector가 400차원이라, Decoder의 hidden size도 400으로 맞춰야 hidden state를 그대로 넘길 수 있다.

```python
encoder = Encoder(
    vocab_size=vocab_size,
    embedding_dim=embedding_dim,
    hidden_size=encoder_hidden_size,
    num_layers=1, 
    bidirectional=encoder_bidirectional
)
decoder = Decoder(
    vocab_size=vocab_size,
    embedding_dim=embedding_dim,
    hidden_size=decoder_hidden_size,
    num_layers=1
)
seq2seq = ChatbotSeq2Seq(encoder, decoder, device)
```

```python
d_input = torch.randint(1000, (100, 26), dtype=torch.int64)
info = summary(seq2seq, input_data=(d_input, d_input))
# 보충: Decoder가 26 step 반복되며 같은 줄이 계속 나와서 앞뒤만 출력
lines = str(info).splitlines()
print("\n".join(lines[:12] + ["..."] + lines[-12:]))
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
ChatbotSeq2Seq                           [100, 26, 15582]          --
├─Encoder: 1-1                           [26, 100, 400]            --
│    └─Embedding: 2-1                    [100, 26, 256]            3,988,992
│    └─GRU: 2-2                          [26, 100, 400]            549,600
├─Decoder: 1-2                           [100, 15582]              --
│    └─Embedding: 2-3                    [100, 1, 256]             3,988,992
│    └─GRU: 2-4                          [1, 100, 400]             789,600
│    └─Linear: 2-5                       [100, 15582]              6,248,382
├─Decoder: 1-3                           [100, 15582]              (recursive)
...
│    └─Linear: 2-80                      [100, 15582]              (recursive)
==========================================================================================
Total params: 15,565,566
Trainable params: 15,565,566
Non-trainable params: 0
Total mult-adds (G): 30.50
==========================================================================================
Input size (MB): 0.04
Forward/backward pass size (MB): 351.40
Params size (MB): 62.26
Estimated Total Size (MB): 413.70
==========================================================================================
```

Decoder가 time step 26번 반복 호출되면서 `(recursive)` 줄이 이어진다. 파라미터는 Encoder Embedding 약 399만, Decoder Embedding 약 399만, 그리고 다음 단어를 고르는 **Decoder Linear(400 → 15,582) 약 625만**이 대부분이다. 어휘 사전 크기가 출력층 크기까지 정한다.

### loss 함수, optimizer

```python
lr = 0.001
model = seq2seq.to(device)
loss_fn = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=lr)
```

다음 단어 예측은 어휘 사전 전체에 대한 다중 분류라 `CrossEntropyLoss`다.

> **보충** 답변의 대부분이 `<pad>`인데 loss에서 빼지 않아서, 모델이 "pad를 잘 맞히는 것"에도 점수를 받는다. `nn.CrossEntropyLoss(ignore_index=pad_id)`로 pad 위치를 loss에서 빼면 실제 단어 예측에 학습이 집중된다.

### train / evaluation 함수

```python
# 1 에폭학습 함수
def train(model, dataloader, optimizer, loss_fn, device, teacher_forcing_rate=0.9):
    model = model.to(device)
    model.train()

    train_loss = 0.0
    for X, y in dataloader:
        # 1. X, y 를 device로 이동 (model과 같은 device에 위치시킨다.)
        X, y = X.to(device), y.to(device)

        # 2. 추론
        pred = model(X, y, teacher_forcing_rate)

        # pred.shape: [batch_size, seq_length, vocab_size] 
        # shape변경  : [batch_size * seq_length, vocab_size] # 2차원으로 변경 ==> loss 계산
        y_hat = pred.reshape(-1, pred.shape[2])
        # 정답 shape: [batch_size, seq_length] -> [batch_size * seq_length] 2차원->1차원
        y = y.reshape(-1)
        # 3. loss 계산
        loss = loss_fn(y_hat, y) # [batch*seq_length, voca_size] , [batch*seq_length]
        # 4. grad 계산
        loss.backward()
        # 5. 파라미터 업데이트
        optimizer.step()
        # 6. grad 초기화
        optimizer.zero_grad()

        train_loss += loss.item()
    
    return train_loss / len(dataloader)
```

`CrossEntropyLoss`는 `(N, 클래스 수)`와 `(N,)`을 받으므로, 배치와 time step 축을 합쳐 2차원·1차원으로 편다. 토큰 하나하나가 분류 문제 하나다.

```python
@torch.no_grad
def eval(model, dataloader, loss_fn, device):
    model = model.to(device)
    model.eval()

    eval_loss = 0.0
    for X, y in dataloader:
        # X, y 를 device로 이동
        X, y = X.to(device), y.to(device)
        # 추론
        pred = model(X, y, teacher_forcing_rate=0.0)
        # loss계산
        y_hat = pred.reshape(-1, pred.shape[-1])
        y = y.reshape(-1)
        eval_loss += loss_fn(y_hat, y)

    return eval_loss / len(dataloader)
```

평가는 실제 대화와 같은 조건이어야 하니 `teacher_forcing_rate=0.0`이다.

### Training

```python
import os
os.makedirs("saved_model/chatbot_seq2seq", exist_ok=True)
```

```python
import time
epochs = 20
epochs = 1

model_save_path = "saved_model/chatbot_seq2seq/model.pth"
# 학습도중 loss가 계선되면 저장
best_loss = torch.inf

s = time.time()
for epoch in range(epochs):
    train_loss = train(model, train_loader, optimizer, loss_fn, device, teacher_forcing_rate)
    eval_loss = eval(model, test_loader, loss_fn)

    if best_loss > eval_loss: # 성능개선
        torch.save(model, model_save_path)
        print(f">>>>>>> {epoch + 1}에서 저장")
        best_loss = eval_loss

    print(f"{epoch + 1} 에폭: {train_loss}, {eval_loss}")

print("걸린시간:", time.time() - s, "초")
```

> **보충** 이 셀은 노트북에서 실행 기록이 없어서 그대로 옮겼다. 실행하면 첫 epoch 학습이 끝난 뒤 `eval(model, test_loader, loss_fn)`에서 `device` 인자가 빠져 `TypeError`가 난다. `eval(model, test_loader, loss_fn, device)`로 고쳐야 한다. `eval`이 돌려주는 `eval_loss`는 `.item()` 없이 더한 텐서라 출력에 `tensor(...)`로 찍히는 점도 고칠 곳이다. 학습된 모델은 아래처럼 수업에서 받은 파일을 썼다.

## 결과 확인

- **Sampler**: DataLoader가 Dataset에서 배치를 만들 때 **index 순서**를 정해 주는 객체
  - 기본은 `SequentialSampler`(순서대로), `shuffle=True`면 `RandomSampler`(무작위)

토큰을 문장으로 되돌릴 때 `##` 조각을 앞 토큰에 붙여 주는 함수다.

```python
def handle_special_tokens(encoded_string):
    # subword 토큰 처리
    # "나는 청 ##소년 이다." -> "나는 청소년 이다"
    tokens = encoded_string.split() # ["나는", "청", "##소년", "이다."]
    new_tokens = []
    for token in tokens:
        if token.startswith("##"):
            if new_tokens: 
                new_tokens[-1] += token[2:]
            else: # new_tokens의 len가 0 => ##XXX 첫번째 토큰
                new_tokens.append(token[2:]) # ##을 지우고 list에 추가.
        else: # 어절의 시작 토큰 -> " "+토큰
            if new_tokens:
                new_tokens.append(" "+token)
            else:
                new_tokens.append(token)
    return "".join(new_tokens)
```

```python
from torch.utils.data import SubsetRandomSampler
# sampler는 "Dataset에서 어떤 순서로 index를 뽑을지 결정하는 객체"이다. 
## DataLoader의 기본 Sampler는 shuffle=True 이면 RandomSampler(index를 섞어서제공)가 사용된다. False이면 SequentialSampler(index 순서대로 제공)가 사용된다.

def random_evaluation(model, dataset, device, n=10):
    """
    Dataset에서 일부 질문-답변 쌍들을 가져다 모델에 질문을 넣어 추론한 결과와 함께 확인.
    Parameter
        model: 학습된 seq2seq 모델
        dataset: 질문-답변 쌍울 추출할 dataset
        device
        n: int - 추출할 질문-답변 쌍 개수 default: 10
    """
    ## 평가할 데이터셋을 만들기
    n_samples = len(dataset)       # Dataset의 총 데이터개수
    # index = list(range(n_samples)) # Dataset의 index만들기.  [0, 1, 2, ...., dataset_length]
    # np.random.shuffle(index)       # 값들을 랜덤하게 섞어준다. [100, 23, 590, 10, ...]
    # sample_index = index[ : n]     # 평가할 데이터 개수만큼 index 생성.

    sample_index = torch.randint(0, n_samples, size=[n])

    # Dataloader 생성
    # SubsetRandomSampler: 지정한 index들 안에서 random한 순서로 제공.
    sampler = SubsetRandomSampler(sample_index)
    sample_loader = DataLoader(dataset, batch_size=n, sampler=sampler)

    ## 추론 후 확인
    model.to(device)
    model.eval()
    with torch.no_grad():
        for X, y in sample_loader:
            X, y = X.to(device), y.to(device)
            output = model(X, y, 0.0) # [batch, seq_len, vocab_size]

            # torch.Tensor -> ndarray : tokenizer decode에 넣기 위해.
            ## tensor를 cpu로 이동후 변환가능.
            ### tensor가 grad를 가지고 있으면(계산그래프에 포함되 있으면) -> tensor.detach().cpu().ndarray()

            pred = output.cpu().numpy()  # X.to("cpu") # 모델 추정한 답변
            X = X.cpu().numpy()   # 정답의 질문
            y = y.cpu().numpy()   # 정답의 답변 (batch, seq_len, vocab)

            for i in range(n):
                q = handle_special_tokens(tokenizer.decode(X[i]))
                a = handle_special_tokens(tokenizer.decode(y[i]))
                p = handle_special_tokens(tokenizer.decode(pred[i].argmax(-1)))
                print(f"질문: {q}")
                print(f"정답: {a}")
                print(f"예측: {p}")
                print('==================================================')
```

## 학습된 모델로 대화

```python
import torch

# 모델 로드
model = torch.load(
    "chatbot_seq2seq_model/model.pth", 
    weights_only=False,
    map_location=device # 저장된 모델을 Load할 때 현재 device에 맞춰서 로드한다.
)

last_model = torch.load(
    "chatbot_seq2seq_model/last_epoch_model.pth",
    weights_only=False,
    map_location=device
)
```

모델 전체를 저장한 파일이라, 위에서 `Encoder`, `Decoder`, `ChatbotSeq2Seq` 클래스를 먼저 정의해 둔 덕분에 불러올 수 있다(모델 저장 글 참고).

**1 epoch 학습 모델**

```python
# 1 에폭 학습 모델
model.device = device
random_evaluation(model, trainset, device, n=5)
```

```text
질문: 찜질방 가면 쌩얼 보여줘야 되나
정답: 찜질방에서 화장은 아닌거 같아요 .
예측: 좋은 . .
==================================================
질문: 별것도 아닌 거 가지고 트집잡는 사람 어떡해 ?
정답: 웃으면서 무시해주세요 .
예측: 잘 지내고 .
==================================================
질문: 남자친구한테 안 설레
정답: 큰일이네요 .
예측: 좋은 . .
==================================================
질문: 엠티 꼭 가야해 ?
정답: 필수는 아니에요 .
예측: 잘 지내고 .
==================================================
질문: 사랑을 표현해줬으면 좋겠어
정답: 표현해 달라고 말해보세요 .
예측: 좋은 . .
==================================================
```

**20 epoch 학습 모델**

```python
# 20 에폭 학습한 모델
last_model.device = device
random_evaluation(last_model, trainset, device, n=5)
```

```text
질문: 어디서 피해자 코스프레임 ?
정답: 분명한 잘못이네요 .
예측: 분명한 잘못이네요 .
==================================================
질문: 난 진짜 쓰레기야
정답: 그런 생각은 버리세요 .
예측: 그런 생각은 버리세요 .
==================================================
질문: 만난지 얼마 안됐는데 키스함 .
정답: 서로의 의사가 존중된 것이라면 괜찮지만 사귀고 난 후가 좋겠어요 .
예측: 서로의 의사가 존중된 것이라면 괜찮지만 사귀고 난 후가 좋겠어요 .
==================================================
질문: 썸남이 너무 진지해서 부담 돼 .
정답: 부담된다면 조심스레 말해 보세요 .
예측: 그건 좀 힘드네요 .
==================================================
질문: 어제 정말 사랑한 그녀와 헤어졌습니다 .
정답: 울어도 돼요 . 잠시 쉬어가요 .
예측: 울어도 돼요 . 잠시 쉬어가요 .
==================================================
```

- **1 epoch 모델**은 질문과 상관없이 "좋은 . ."이나 "잘 지내고 ."만 반복한다. 가장 흔한 토큰 몇 개만 겨우 배운 상태다
- **20 epoch 모델**은 학습 데이터의 답변을 거의 글자 그대로 맞힌다. "썸남이 너무 진지해서 부담 돼"처럼 틀린 경우도 데이터에 있는 다른 답변("그건 좀 힘드네요")을 가져온 것이다

> **보충** 노트북에서는 `n=10`(기본값)으로 출력했다. 여기서는 길이 때문에 5개씩 봤다. 학습 데이터에서 뽑은 질문이라 20 epoch 모델이 잘 맞히는 건 당연할 수 있다. 처음 보는 test set 질문으로도 확인해야 한다.

```python
# 보충: 20 epoch 모델 - test set(학습에 안 쓴 질문)
random_evaluation(last_model, testset, device, n=5)
```

```text
질문: 쉬마려
정답: 화장실 가세요 .
예측: 화장실 가세요 .
==================================================
질문: 낭만이라고는 없어가지구
정답: 낭만적인 거 좋아하시는구나 !
예측: 낭만적인 거 좋아하시는구나 !
==================================================
질문: 잇몸이 시려
정답: 잇몸약 챙겨드시거나 치과 가보세요 .
예측: 잇몸약 챙겨드시거나 치과 가보세요 .
==================================================
질문: 시원한 냉면 먹고 싶어
정답: 생각만 해도 군침이 도네요 .
예측: 생각만 해도 군침이 도네요 .
==================================================
질문: 다들 힘들겠지
정답: 다들 힘들죠 .
예측: 다들 힘들죠 .
==================================================
```

test set 질문도 정답을 그대로 맞혔다. 그런데 이건 일반화 성능이 아니다. 이 모델은 수업 때 **다른 random_split**으로 나눈 train set으로 학습했다. 지금 다시 나눈 `testset`에는 그때 학습에 쓴 질문이 대부분 섞여 있어서, 모델이 외운 답을 꺼낸 것일 가능성이 크다. 모델을 평가하려면 학습할 때의 분할(시드나 index)을 함께 저장해 둬야 한다. 아래처럼 데이터셋에 없는 질문을 넣어 보는 편이 더 정직하다.

### 새 질문에 답하기 (보충)

`ChatbotSeq2Seq.forward`는 정답 길이만큼 생성하므로, 정답 대신 `max_length` 길이의 더미 텐서를 넣고 teacher forcing은 끈다. 생성된 토큰 중 `<pad>`가 나오면 거기서 끊는다.

```python
# 보충: 새 질문 → 답변
def chat(model, question):
    ids = tokenizer.encode(question).ids[:max_length]
    ids = ids + [pad_id] * (max_length - len(ids))
    X = torch.tensor(ids, dtype=torch.int64)
    dummy = torch.zeros(max_length, dtype=torch.int64)       # 길이만 알려 주는 용도
    with torch.no_grad():
        out = model(X, dummy, teacher_forcing_rate=0.0)       # (1, seq_len, vocab)
    pred = out[0].argmax(-1).tolist()
    if pad_id in pred:
        pred = pred[:pred.index(pad_id)]
    return handle_special_tokens(tokenizer.decode(pred))

for q in ["오늘 날씨 좋다", "시험 망했어", "배고파", "여자친구랑 헤어졌어", "주말에 뭐 하지"]:
    print(f"Q: {q}\nA: {chat(last_model, q)}\n")
```

```text
Q: 오늘 날씨 좋다
A: 나들이 가보세요 .

Q: 시험 망했어
A: 얼마 남지 않았어요 .

Q: 배고파
A: 저랑 놀아요 .

Q: 여자친구랑 헤어졌어
A: 조금만 참고 기다려 보세요 .

Q: 주말에 뭐 하지
A: 몸과 마음이 좀 쉬어야 할 것 같아요 .
```

- "오늘 날씨 좋다"는 데이터셋에 없는 문장인데, 비슷한 질문 "오늘 날씨 죽인다"의 답 "나들이 가보세요."를 그대로 꺼냈다
- "주말에 뭐 하지"에는 데이터의 "퇴근하고 뭐 하지"에 붙은 답을, "여자친구랑 헤어졌어"에는 "단수래"·"물이 안나온데"의 답("조금만 참고 기다려 보세요")을 냈다. 앞의 것은 그럴듯하지만 뒤의 것은 맥락이 맞지 않는다
- "배고파"는 데이터셋에 그대로 있는 질문인데("얼른 맛난 음식 드세요", "뭐 좀 챙겨드세요"), 모델은 "저랑 놀아요"라고 답했다. 같은 질문에 답이 여러 개라 학습이 흔들린 경우다
- 이 모델은 새 문장을 지어낸다기보다 **학습한 답변 중 하나를 골라 그대로 재현**한다. 1만여 쌍의 작은 데이터로 20 epoch을 학습한 Seq2Seq의 전형적인 모습이다

## 정리

- **Encoder–Decoder**는 입력을 Context Vector로 압축(이해)하고, 그걸로 출력을 생성한다. RNN 계열로 만든 것이 **Seq2Seq**다
- Encoder는 문장 전체를 보니 양방향, Decoder는 한 토큰씩 생성하는 자기 회귀 모델이라 단방향이다. Decoder의 hidden size는 Context Vector 크기에 맞춘다
- Decoder의 첫 입력은 `<sos>`, 출력층은 어휘 전체에 대한 다중 분류(`CrossEntropyLoss`)다
- **Teacher Forcing**은 학습을 빠르고 안정적으로 만들지만 추론과의 차이(노출 편향)를 만든다. 그래서 확률적으로 섞어 쓴다
- 모델 파일과 **같은 토크나이저**를 써야 하고, train 질문뿐 아니라 test 질문으로 일반화를 확인해야 한다. 고정 길이 Context Vector 하나에 문장 전체를 담는 한계는 다음 글의 **Attention**이 푼다
