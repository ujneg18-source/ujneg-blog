---
title: "LSTM 감성 분석: 네이버 영화 댓글 분류"
description: "nn.Embedding의 lookup table 구조, Korpora NSMC 데이터 로딩, Kiwi 형태소 분석 후 BPE 서브워드 토큰화, 패딩을 넣는 Dataset과 DataLoader, Embedding → 양방향 LSTM → Linear + Sigmoid 감성 분류 모델을 만들어 학습시키고 새 댓글을 추론합니다. 노트북에서 막혔던 패딩 누락, LSTM input_size 누락, 학습·평가 함수의 버그를 원본과 수정본으로 함께 정리합니다."
category: 'Tech'
subcategory: 'NLP'
series: '자연어 처리'
seriesOrder: 8
originalNotebook: "09_LSTM_감성분석.ipynb"
tags: ["NLP"]
date: 2026-06-17T10:00:00+09:00
thumbnail: '../../../assets/images/notes/nlp/nlp-lstm-sentiment.webp'
---

> SKN31 자연어 처리 과정 노트북 `09_LSTM_감성분석.ipynb`를 바탕으로 정리했습니다.
> 노트북은 모델 정의까지 진행됐고, 학습 셀은 "COLAB에서 학습돌리기" 메모와 함께 비어 있습니다. 학습·저장·추론 부분은 `보충`으로 채웠고, CPU에서 돌리느라 **3 epoch만** 학습했습니다. 코드는 PyTorch 2.5, tokenizers 0.23, kiwipiepy 0.24에서 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다.

## 이 글에서 다루는 것

- `nn.Embedding`: 단어 index → embedding vector를 찾는 lookup table
- NSMC 데이터 로딩, 형태소 분석 + BPE 토큰화
- 패딩을 넣는 Dataset, DataLoader
- Embedding → 양방향 LSTM → Linear + Sigmoid 감성 분류 모델
- 학습, 평가, 저장, 새 댓글 추론

지난 글의 RNN 구조 중 **Many to One**이다. 댓글(토큰 sequence)을 넣으면 긍정일 확률 하나가 나온다. 앞선 TF-IDF + 로지스틱 회귀(정확도 약 85%)와 같은 데이터를 쓰니 결과를 비교할 수 있다.

## PyTorch의 nn.Embedding

- Word2Vec처럼 word embedding vector를 찾는 **Lookup Table**이다
  - 단어의 **정수 index**가 들어오면 Embedding Layer의 **그 index 행의 vector**를 출력한다
- 모델이 학습되는 동안 **풀려는 문제에 맞게** embedding vector가 업데이트된다
- Word2Vec이 따로 하던 embedding 학습을, `nn.Embedding`은 자신이 포함된 모델을 학습하는 과정에서 같이 한다고 보면 된다

```python
import torch

import torch.nn as nn
embedding_year = nn.Embedding(
    num_embeddings=20_000,
    embedding_dim=100,
    padding_idx=0
)

# 20000 x 100 자리 임베딩 vector를 생성
```

```text
# 딥러닝은 데이터 구성이 중요
```

```python
w = embedding_year.weight
print(w.shape)
```

```text
torch.Size([20000, 100])
```

```python
# 3번 토큰 단어의 embedding vector를 조회
w[3][:10]
```

```text
tensor([ 1.4628, -0.6204,  0.9884, -0.4322, -0.6232, -0.2162, -0.4887,  0.7870,
         0.1076, -1.0715], grad_fn=<SliceBackward0>)
```

```python
w[0][:10]
```

```text
tensor([0., 0., 0., 0., 0., 0., 0., 0., 0., 0.], grad_fn=<SliceBackward0>)
```

`padding_idx=0`으로 지정한 0번은 **0 벡터로 고정**되고 학습 중에도 업데이트되지 않는다. 길이를 맞추려고 채워 넣는 `<pad>` 토큰이 결과에 영향을 주지 않게 하는 장치다.

> **보충** 노트북에서는 `w[3]`, `w[0]`으로 100개 값을 전부 출력했다. 여기서는 앞 10개만 보였다. 변수명 `embedding_year`는 수업 예제의 이름 그대로다.

```python
# 보충: Embedding에 index를 넣으면 해당 행을 꺼낸다
idx = torch.tensor([[3, 0, 3]])           # (batch 1, seq_len 3)
out = embedding_year(idx)
print(out.shape)                           # (1, 3, 100)
print(torch.equal(out[0, 0], w[3]), torch.equal(out[0, 1], w[0]))
```

```text
torch.Size([1, 3, 100])
True True
```

입력 `(batch, seq_len)`의 정수가 `(batch, seq_len, embedding_dim)`의 실수 벡터가 된다. 지난 Word2Vec 글의 "one-hot × $W_{in}$ = 행 조회"를 레이어로 만든 것이다.

## 감성 분석 (Sentiment Analysis)

입력 텍스트가 **긍정적인** 글인지 **부정적인** 글인지(또는 중립인지) 분석하는 것이다. 기업이 고객의 제품·서비스에 대한 의견을 파악하는 데 쓴다.

## 데이터 로딩: Korpora NSMC

- [Korpora](https://github.com/ko-nlp/Korpora), [NSMC](http://github.com/e9t/nsmc/)
- 입력: 영화 댓글 / 출력: 0(부정), 1(긍정)

| API | 반환 |
|---|---|
| `Korpora.load('nsmc')` | corpus |
| `corpus.get_all_texts()` | 전체 text tuple |
| `corpus.get_all_labels()` | 전체 label list |
| `corpus.train`, `corpus.test` | train(15만)/test(5만)로 나눈 `LabeledSentenceKorpusData`. `.texts`, `.labels`로 조회 |

```python
from Korpora import Korpora
corpus = Korpora.load("nsmc")

#X값
all_text = corpus.get_all_texts()
all_label = corpus.get_all_labels()

all_text[:5]
```

```text
('아 더빙.. 진짜 짜증나네요 목소리',
 '흠...포스터보고 초딩영화줄....오버연기조차 가볍지 않구나',
 '너무재밓었다그래서보는것을추천한다',
 '교도소 이야기구먼 ..솔직히 재미는 없다..평점 조정',
 '사이몬페그의 익살스런 연기가 돋보였던 영화!스파이더맨에서 늙어보이기만 했던 커스틴 던스트가 너무나도 이뻐보였다')
```

```python
all_label[:5]
```

```text
[0, 1, 0, 0, 1]
```

```python
corpus.train #corpus에서 trainset을 제공함
```

```text
NSMC.train: size=150000
  - NSMC.train.texts : list[str]
  - NSMC.train.labels : list[int]
```

> **보충** Korpora 다운로드 셀은 노트북 실행 결과를 옮겼다. 아래 전처리 결과는 노트북이 pickle로 저장해 둔 파일을 불러와 이어서 실행했다.

## 토큰화

1. **형태소 단위 토큰화**: Kiwi로 형태소 분석한 뒤 원형(lemma)을 공백으로 이어 다시 한 문장으로 만든다
2. 1의 결과를 **BPE**로 다시 토큰화한다

형태소로 먼저 자르면 BPE가 조사·어미 경계를 넘어서 병합하지 않는다. "재미는"이 `재미` + `는`으로 갈라진 상태에서 서브워드를 학습하는 셈이다.

### 형태소 단위 전처리

```python
import torch
import torch.nn as nn
from kiwipiepy import Kiwi
import re

kiwi = Kiwi()

def text_preprocessing(text):
    """
    1. 영문 -> 소문자로 변환
    2. 한글, 영어, 숫자, 공백을 제외한 특수문자/구두점 제거
    3. Kiwi 형태소 기반 토큰화 및 원형(Lemma) 추출
    4. 다음 단어 임베딩 단계를 위해 공백(Space)을 넣어 하나의 문자열로 결합
    """
    # 1. 소문자 변환
    text = text.lower()
    
    # 2. 구두점 및 특수문자 제거
    text = re.sub(r"[^가-힣a-zA-Z0-9 ]", " ", text)
    
    # 3. 형태소 분석 후 원형(Lemma) 추출
    # 예: '놀아나다는' -> '놀아나다'
    lemmas = [token.lemma for token in kiwi.tokenize(text)]
    
    # 4. 띄어쓰기를 구분자로 묶어서 반환 (중요!)
    return " ".join(lemmas)
```

```python
sample = "나름 심오한 뜻도 있는 듯. 그냥 학생이 선생과 놀아나는 영화는 절대 아님"   # all_text[20]
print(sample)
text_preprocessing(sample)
```

```text
나름 심오한 뜻도 있는 듯. 그냥 학생이 선생과 놀아나는 영화는 절대 아님
```

```text
'나름 심오 하 ᆫ 뜻 도 있다 는 듯 그냥 학생 이 선생 과 놀아나다 는 영화 는 절대 아니다 ᆷ'
```

> **보충** `[^가-힣a-zA-Z0-9 ]`는 완성형 한글만 남겨서 `ㅋㅋ`, `ㅠㅠ`, `ㅡㅡ` 같은 자모도 지운다. TF-IDF 글에서 `ㅡㅡ`가 부정 단어 15위였던 걸 생각하면 감성 분석에는 손해일 수 있는 선택이다. 남기려면 패턴에 `ㄱ-ㅎㅏ-ㅣ`를 추가한다.

```python
## 전처리 진행
# 1. fot -> for 오타 수정
# 2. test 데이터는 corpus.test에서 가져오도록 수정

train_inputs = [text_preprocessing(txt) for txt in corpus.train.texts]
test_inputs = [text_preprocessing(txt) for txt in corpus.test.texts]

train_labels = corpus.train.labels
test_labels = corpus.test.labels
```

```python
# 피클로 저장
import os

os.makedirs("data/nsmc", exist_ok=True)

train_data = {"text": train_inputs, "label": train_labels} 
test_data = {"text": test_inputs, "label": test_labels} 

import pickle
with open("data/nsmc/preprocssing_train.pkl", "wb") as fo:
    pickle.dump(train_data,fo)
with open("data/nsmc/preprocssing_test.pkl", "wb") as fo:
    pickle.dump(test_data,fo)
```

20만 건 형태소 분석은 시간이 걸려서 결과를 pickle로 저장해 두었다. 이후에는 이 파일만 불러오면 된다.

```python
# 보충: 저장해 둔 전처리 결과 불러오기
import pickle
with open("data/nsmc/preprocssing_train.pkl", "rb") as fi:
    train_data = pickle.load(fi)
with open("data/nsmc/preprocssing_test.pkl", "rb") as fi:
    test_data = pickle.load(fi)

train_inputs, train_labels = train_data["text"], train_data["label"]
test_inputs, test_labels = test_data["text"], test_data["label"]
print(len(train_inputs), len(test_inputs))
print(train_inputs[3])
```

```text
150000 50000
교도소 이야기 이다 구먼 솔직히 재미 는 없다 다 평점 조정
```

### BPE 토큰화

- Hugging Face `tokenizers`의 BPE를 쓴다 ([quicktour](https://huggingface.co/docs/tokenizers/quicktour))
- 글자 단위로 나눈 뒤 가장 자주 나오는 글자 쌍을 합쳐 사전에 추가한다 (Subword 글 참고)

```python
# 토큰화를 위해서 text를 병합
all_inputs = train_inputs + test_inputs
```

```python
from tokenizers import Tokenizer
from tokenizers.models import BPE  # 1. WordLevel 대신 BPE 모델 임포트
from tokenizers.pre_tokenizers import Whitespace
from tokenizers.trainers import BpeTrainer

vocab_size = 30000

tokenizer = Tokenizer(BPE(unk_token="<unk>"))

tokenizer.pre_tokenizer = Whitespace()
trainer = BpeTrainer(
    vocab_size=vocab_size,
    min_frequency=5,
    special_tokens=["<unk>", "<pad>"],
    continuing_subword_prefix="##",
    show_progress=False,
)
# 학습데이터가 list(doc)
tokenizer.train_from_iterator(all_inputs, trainer=trainer)
# 학습데이터가 파일: tokenozer.train([파일경로])
```

- `min_frequency=5`: 5번 미만 나온 쌍은 병합하지 않는다
- `special_tokens`: `<unk>`(모르는 토큰)가 0번, `<pad>`(패딩)가 1번이 된다
- `continuing_subword_prefix="##"`: 단어 중간 조각에 `##`를 붙인다

```python
total_tokens = tokenizer.get_vocab_size()

total_tokens
```

```text
23755
```

사전 크기 30,000을 목표로 했지만 `min_frequency=5`를 넘는 병합이 더 없어서 23,759개에서 멈췄다. 노트북은 23,756개로, tokenizers 버전 차이로 3개가 다르다. 아래 결과에서 "안간힘"이 `안 ##간 ##힘`으로 나뉜 것처럼, 드문 단어는 `##` 조각으로 쪼개진다.

> **보충** 학습 데이터로 test set까지 합쳐서(`all_inputs`) 사전을 만들었다. 정답(label)을 쓰지는 않지만, 엄밀하게는 test 문장의 어휘를 미리 본 셈이다. 실제 서비스라면 train만으로 사전을 만들고, test의 처음 보는 조각은 `<unk>`나 더 작은 서브워드로 처리되게 둔다.

```python
import os
os.makedirs("saved_model/nsmc/lstm", exist_ok=True)
tokenizer.save("saved_model/nsmc/lstm/bpe_tokenizer.json")
```

```python
idx = 120
print(all_inputs[idx])
encoding = tokenizer.encode(all_inputs[idx])

#encoding
print("토큰 ID")
print(encoding.ids)
print("토큰 문자열")
print(encoding.tokens)
```

```text
중국인 특유 의 과장 허풍 있다 어 보이다 려고 안간힘 쓰다 ᆫ 노력 은 가상 하 나 고증 과 현실감 떨어지다 는 설정 이 거북 스럽 다 도대체 그 들 은 왜 이렇다 게 까지 스스로 를 과대 포장 하 는 것 이다 ᆫ지
토큰 ID
[8343, 5339, 1677, 5858, 16610, 4460, 1507, 4542, 4733, 1466, 2760, 3524, 4572, 41, 5277, 1663, 8189, 2342, 342, 7178, 154, 6562, 4766, 450, 4845, 1680, 6405, 4564, 475, 4836, 202, 588, 1663, 1594, 4547, 112, 4515, 5944, 813, 6924, 5550, 2342, 450, 106, 4454, 4532]
토큰 문자열
['중국인', '특유', '의', '과장', '허풍', '있다', '어', '보이다', '려고', '안', '##간', '##힘', '쓰다', 'ᆫ', '노력', '은', '가상', '하', '나', '고증', '과', '현실감', '떨어지다', '는', '설정', '이', '거북', '스럽', '다', '도대체', '그', '들', '은', '왜', '이렇다', '게', '까지', '스스로', '를', '과대', '포장', '하', '는', '것', '이다', 'ᆫ지']
```

## Dataset, DataLoader 생성

댓글마다 토큰 수가 다르다. 배치로 묶으려면 길이를 `max_length`로 맞춰야 한다. 짧으면 `<pad>`를 채우고, 길면 자른다.

```python
import torch
from torch.utils.data import Dataset, DataLoader

class NSMCDataset(Dataset):
    def __init__(self, texts, labels, max_length, tokenizer):
        """
        texts: list - 댓글 리스트. 리스트에 댓글들을 담아서 받는다. ["댓글", "댓글", ...]
        labels: list - Label 리스트. (댓글의 긍부정 여부 - 긍정: 1, 부정: 0)
        max_length: int: 개별 댓글의 최대 token 개수. 모든 댓글의 토큰수를 max_length에 맞춘다.
        tokenizer: tokenizers.Tokenizer
        """
        self.max_length = max_length
        self.tokenizer = tokenizer
        self.labels = labels

        self.texts = [ self.tokenizer.encode(txt).ids for txt in texts]

    ###########################################################################################
    # id로 구성된 개별 문장 token list를 받아서 패딩 추가 [20, 2, 1] => [20, 2, 1, 0, 0, 0, ..]
    ############################################################################################
    def __pad_token_sequences(self, token_sequences):
        """
        token id로 구성된 개별 문서(댓글)의 token_id list를 받아서 max_length 길이에 맞추는 메소드
        max_length 보다 토큰수가 적으면 Padding 토큰 추가, 많으면 max_length 크기로 줄인다.
            ex) max_length=5 이고 pad토큰 id가 0이라면
                [20, 2, 1] => [20, 2, 1, 0, 0]
                [20, 21, 30, 34, 60, 17, 21, 33] -> [20, 21, 30, 34, 60]
        """

        #1 <pad> 토큰 id를 조회
        pad_token_id = self.tokenizer.token_to_id("<pad>")
        #2 입력 문서의 토큰 수
        seq_len = len(token_sequences)
        #3 max_length 길이에 토큰수를 맞추기.
        if self.max_length < seq_len: # 많은 경우
            result = token_sequences[:self.max_length]
        else: # 모자란 경우
            result = token_sequences + ([pad_token_id] * (self.max_length - seq_len)
)

        return result
        
    def __len__(self):
        """총 데이터 수를 반환. len(dataset) 호출시 반환 값"""
        return len(self.labels)


    def __getitem__(self, idx):
        """
        idx 번째 text와 label을 학습 가능한 type으로 변환해서 반환
        Parameter
            idx: int 조회할 index
        Return
            tuple: (torch.LongTensor, torch.FloatTensor) 
            - X: 댓글 토큰_id 리스트, LongTensor(int64), y:  정답 Label을 FloatTensor(float32)
        """
        X = torch.tensor(self.texts[idx], dtype=torch.int64)
        y = torch.tensor(self.labels[idx], dtype=torch.float32).unsqueeze(-1)


        return X, y
```

```python
max_length = 30
trainset = NSMCDataset(train_inputs, train_labels, max_length,tokenizer)
testset = NSMCDataset(test_inputs, test_labels, max_length,tokenizer)

len(trainset), len(testset)
```

```text
(150000, 50000)
```

```python
c , l = trainset[3]
print(c, c.shape)
print(l)
tokenizer.decode(list(c))
```

```text
tensor([10788,  4577,  4454,  8136,  4698,  4466,   450,  4461,   475,  4493,
         7357]) torch.Size([11])
tensor([0.])
```

```text
'교도소 이야기 이다 구먼 솔직히 재미 는 없다 다 평점 조정'
```

`max_length=30`인데 토큰이 11개뿐이고 패딩이 없다. 패딩 메소드 `__pad_token_sequences`를 만들어 두고 **어디서도 호출하지 않았기** 때문이다. 이 상태로 DataLoader를 만들면 길이가 다른 텐서를 한 배치로 쌓지 못한다. 아래 셀은 에러가 나는 것이 정상이다.

```python
## data loader
batch_size = 100
train_loader = DataLoader(trainset, batch_size=batch_size, shuffle=True, drop_last=True)
test_loader = DataLoader(testset, batch_size=batch_size)

len(train_loader), len(test_loader)
X_batch, y_batch = next(iter(train_loader))   # 보충: 첫 배치를 꺼내 보면
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · RuntimeError: stack expects each tensor to be equal size, but got [24] at entry 0 and [58] at entry 1</div></div>

> **보충** `len(train_loader)`는 데이터 개수만 보고 계산해서 (1500, 500)이 정상으로 나온다. 노트북도 여기까지만 실행해서 문제가 드러나지 않았다. 배치를 실제로 꺼내는 순간 `torch.stack`이 길이가 다른 텐서를 쌓지 못해 에러가 난다. `__init__`에서 인코딩할 때 패딩까지 해 두면 된다.

```python
# 보충: 패딩을 적용한 Dataset
class NSMCDataset(Dataset):
    def __init__(self, texts, labels, max_length, tokenizer):
        self.max_length = max_length
        self.tokenizer = tokenizer
        self.labels = labels
        # 인코딩 + 패딩까지 미리 해 둔다
        self.texts = [self.__pad_token_sequences(self.tokenizer.encode(txt).ids) for txt in texts]

    def __pad_token_sequences(self, token_sequences):
        pad_token_id = self.tokenizer.token_to_id("<pad>")
        seq_len = len(token_sequences)
        if self.max_length < seq_len:
            return token_sequences[:self.max_length]
        return token_sequences + [pad_token_id] * (self.max_length - seq_len)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        X = torch.tensor(self.texts[idx], dtype=torch.int64)
        y = torch.tensor(self.labels[idx], dtype=torch.float32).unsqueeze(-1)
        return X, y

trainset = NSMCDataset(train_inputs, train_labels, max_length, tokenizer)
testset = NSMCDataset(test_inputs, test_labels, max_length, tokenizer)
c, l = trainset[3]
print(c)
tokenizer.decode(list(c))
```

```text
tensor([10788,  4577,  4454,  8136,  4698,  4466,   450,  4461,   475,  4493,
         7357,     1,     1,     1,     1,     1,     1,     1,     1,     1,
            1,     1,     1,     1,     1,     1,     1,     1,     1,     1])
```

```text
'교도소 이야기 이다 구먼 솔직히 재미 는 없다 다 평점 조정'
```

뒤쪽이 `<pad>`의 id인 1로 채워졌다. `decode`는 특수 토큰을 빼고 보여 준다.

```python
## data loader
batch_size = 100
train_loader = DataLoader(trainset, batch_size=batch_size, shuffle=True, drop_last=True)
test_loader = DataLoader(testset, batch_size=batch_size)

X_batch, y_batch = next(iter(train_loader))
print(len(train_loader), len(test_loader))
print(X_batch.shape, X_batch.dtype, y_batch.shape, y_batch.dtype)
```

```text
1500 500
torch.Size([100, 30]) torch.int64 torch.Size([100, 1]) torch.float32
```

입력은 `(100, 30)`의 int64, 정답은 `(100, 1)`의 float32다. Embedding은 정수 index를, `BCELoss`는 float 정답을 받는다.

> **보충** 노트북의 Embedding 예제는 `padding_idx=0`이었지만 여기서 `<pad>`의 id는 **1**이다(`special_tokens=["<unk>", "<pad>"]` 순서). 아래 모델의 `nn.Embedding`에는 `padding_idx`를 주지 않아서 `<pad>` 벡터도 학습된다. `padding_idx=tokenizer.token_to_id("<pad>")`를 주면 패딩이 0 벡터로 고정된다.

## 모델링

- **Embedding Layer**로 word embedding vector를 만든다
- **LSTM**으로 feature를 추출한다
- **Linear + Sigmoid**로 댓글이 긍정일 확률을 출력한다

![모델 개요](/images/nlp/fig-rnn-rnn-outline.png)

### 모델 정의

처음 작성한 모델은 `nn.LSTM`에 입력 크기 `input_size`를 주지 않았다. 아래 셀에서 모델을 생성하면 에러가 나는 것이 정상이다.

```python
# 모델정의 / sigmoid 
# 순전파: embedding layer -> LSTM Layer (문서-댓글에 대한 feature->Linear+sigmoid(분류기))

import torch.nn as nn

class NSMCClassifier(nn.Module):

    def __init__(self,
                 vocab_size,
                 embedding_dim,
                 hidden_size,
                 num_layers=1,
                 bidirectional=True,
                 dropout=0.2):

        super().__init__()
        #  토큰들(Tensor[int]-[20,30,1278,39,....])
        #  -> embedding -> 출력 tensor shape: [batch, seq_len, embedding_dim]

        self.embedding = nn.Embedding(
            num_embeddings = vocab_size, # 어휘사전의 크기
            embedding_dim = embedding_dim, # Embedding Vector의 차원수
        )

        self.lstm= nn.LSTM(
            # num_embeddings = vocab_size, # 어휘사전의 크기
            hidden_size= hidden_size, # Embedding Vector의 차원수
            num_layers = num_layers,
            bidirectional = bidirectional,
            dropout=0.0 if num_layers==1 else dropout
        )

   # 3. Linear Classifier
        # 오타 수정 및 이진 분류를 위해 out_features=1 설정
        self.classifier = nn.Linear(
            in_features=hidden_size * 2 if bidirectional else hidden_size,
            out_features=1 
        )
        
        # 4. Activation Function
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        pass
        # X: 인력문서 - 토큰리스트[batch_size, seq_len, embedding_dim]
        # X=>Embedding
        embeddimg_vector = self.embedding(x)

        # embedding vectordml batch와 seq len index 위치를 변경
        embedding_vector = embedding_vector.transpose(1,0) #[seq_len, batch, emdim]

        # embedding_vector -> LSTM
        out, _ = self.lstm(embedding_vector)

        # out shape: [seq_len, batch, hidden_size *bidirectional]
        output = self.classifer(out[-1])
        last_output = self.sigmoid(output)

        return last_output
```

```python
NSMCClassifier(vocab_size=1000, embedding_dim=100, hidden_size=60)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: RNNBase.__init__() missing 1 required positional argument: &#x27;input_size&#x27;</div></div>

> **보충** 이 첫 버전에는 문제가 세 개 더 있었다. `forward`의 `embeddimg_vector` 오타(다음 줄의 `embedding_vector`가 정의되지 않음), `self.classifer` 오타, 그리고 `forward` 맨 앞의 `pass`(뒤의 코드는 실행되지만 의미 없는 줄)다. 아래가 고친 버전이다.

```python
import torch
import torch.nn as nn

class NSMCClassifier(nn.Module):

    def __init__(self,
                 vocab_size,
                 embedding_dim,
                 hidden_size,
                 num_layers=1,
                 bidirectional=True,
                 dropout=0.2):

        super().__init__()

        # 1. Embedding Layer
        self.embedding = nn.Embedding(
            num_embeddings=vocab_size, 
            embedding_dim=embedding_dim, 
        )

        # 2. LSTM Layer (input_size 추가)
        self.lstm = nn.LSTM(
            input_size=embedding_dim,       # 발생한 TypeError 해결을 위해 추가!
            hidden_size=hidden_size, 
            num_layers=num_layers,
            bidirectional=bidirectional,
            dropout=0.0 if num_layers == 1 else dropout
        )

        # 3. Linear Classifier
        self.classifier = nn.Linear(
            in_features=hidden_size * 2 if bidirectional else hidden_size,
            out_features=1 
        )
        
        # 4. Activation Function
        self.sigmoid = nn.Sigmoid()

    def forward(self, X):
        # x shape: [batch_size, seq_len]
        
        # [batch_size, seq_len, embedding_dim]
        embedding_vector = self.embedding(X)

        # [seq_len, batch_size, embedding_dim] 로 변환
        embedding_vector = embedding_vector.transpose(1, 0)

        # LSTM 통과 (h_n을 받아 마지막 hidden state를 활용합니다)
        out, (h_n, c_n) = self.lstm(embedding_vector)

        # 양방향일 경우 순방향/역방향의 마지막 hidden state를 추출해 결합
        if self.lstm.bidirectional:
            # h_n shape: [num_layers * num_directions, batch_size, hidden_size]
            # 마지막 레이어의 순방향(-2)과 역방향(-1)을 꺼내서 feature 차원(-1)으로 concat
            hidden = torch.cat((h_n[-2], h_n[-1]), dim=-1)
        else:
            hidden = h_n[-1]

        # hidden shape: [batch_size, hidden_size * (2 if bidirectional else 1)]
        
        # 최종 분류기 + 시그모이드 (오타 수정: classifer -> classifier)
        output = self.classifier(hidden)
        last_output = self.sigmoid(output)

        return last_output
```

- `transpose(1, 0)`: Embedding 출력은 `(batch, seq_len, emb)`인데 `nn.LSTM`의 기본(`batch_first=False`)은 `(seq_len, batch, emb)`라 축을 바꾼다. LSTM에 `batch_first=True`를 주면 이 줄이 필요 없다
- **Many to One**이라 모든 time step 출력(`out`)이 아니라 **마지막 hidden state**(`h_n`)를 쓴다
- 양방향이면 `h_n[-2]`(마지막 층 정방향)와 `h_n[-1]`(마지막 층 역방향)을 이어 붙여 `hidden_size × 2`가 된다

> **보충** 첫 버전처럼 `out[-1]`을 쓰면 양방향에서 문제가 된다. `out[-1]`의 정방향 절반은 문장 끝까지 읽은 결과지만, **역방향 절반은 마지막 토큰 하나만 읽은 결과**다(역방향은 끝에서 시작하니까). 수정본처럼 `h_n`을 쓰면 두 방향 모두 문장 전체를 읽은 결과를 쓴다. 다만 뒤쪽이 `<pad>`로 채워져 있으면 정방향의 마지막 hidden이 패딩까지 읽은 상태가 된다는 점은 남는다. 이걸 피하는 방법이 `nn.utils.rnn.pack_padded_sequence`다.

```python
# 하이퍼 파라미터 정의

device = "cuda" if torch.cuda.is_available() else "cpu"
vocab_size = tokenizer.get_vocab_size()
embedding_dim = 100
hidden_size = 60
num_layers = 1
bidirectional = True
```

### 모델 생성

```python
model = NSMCClassifier(
    vocab_size=vocab_size,
    embedding_dim=embedding_dim,
    hidden_size=hidden_size,
    num_layers = 1,
    bidirectional = bidirectional
    ).to(device)
```

```python
from torchinfo import summary
# summary(모델, 입력데이터shape) -> 입력데이터의 타입: float32
# model의입력 데이터 타입: int64(LongTensor)
dummy_input = torch.randint(1, 10, (batch_size, max_length))
summary(model, input_data=dummy_input, device=device)
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
NSMCClassifier                           [100, 1]                  --
├─Embedding: 1-1                         [100, 30, 100]            2,375,500
├─LSTM: 1-2                              [30, 100, 120]            77,760
├─Linear: 1-3                            [100, 1]                  121
├─Sigmoid: 1-4                           [100, 1]                  --
==========================================================================================
Total params: 2,453,381
Trainable params: 2,453,381
Non-trainable params: 0
Total mult-adds (M): 470.84
==========================================================================================
Input size (MB): 0.02
Forward/backward pass size (MB): 5.28
Params size (MB): 9.81
Estimated Total Size (MB): 15.12
==========================================================================================
```

파라미터의 **97%가 Embedding**(23,759 × 100 = 2,375,900)이다. 양방향 LSTM은 77,760개, Linear는 121개(120 + bias 1)뿐이다. 텍스트 모델에서 어휘 사전 크기가 모델 크기를 좌우하는 이유다.

`summary(model, (100, 30))`처럼 shape만 주면 torchinfo가 float32 텐서를 만들어 넣어서 Embedding에서 에러가 난다. 그래서 정수 텐서를 직접 만들어 `input_data`로 넘겼다.

## 학습

### Train / 평가 함수

처음 작성한 학습 함수다. `for` 문 아래가 들여쓰기되지 않아서 정의하는 순간 에러가 난다. 아래 셀은 에러가 나는 것이 정상이다.

```python
def train(model, dataloader, loss_fn, optimizer, device="cpu"):
    #1 모델을 train 모드
    model.train()
    #2 모델을 device이동
    model = model.to(device)
    
    #3 1에폭 학습

    for X, y in dataloader:
    # X,y를 device로 이동
    X, y = X.to(device), y.to(device)
    # 추론
    pred=model(X)
    #loss계산
    loss=loss_fn(pred, y)
    #grad계산
    loss.backword()
    #파라미터 업데이트
    optimizer.step()
    #파라미터 grad 초기화
    optimizer.zero_grad()
    #loss값 누적
    train_loss += loss.item()

    return train_loss / len(dataloader)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · SyntaxError: expected an indented block after &#x27;for&#x27; statement on line 9</div></div>

> **보충** 들여쓰기 외에도 `loss.backword()`(→ `backward()`) 오타와, `train_loss`를 0으로 만들지 않고 `+=` 하는 문제가 있다. 들여쓰기만 고치면 이번엔 `AttributeError`, 그다음엔 `UnboundLocalError`가 차례로 난다.

평가 함수는 정의는 되지만 호출하면 첫 줄에서 에러가 난다. 아래 셀도 에러가 나는 것이 정상이다.

```python
# 평가함수
@torch.no_grad
def eval(model, dataloader, loss_fn, device="cpu"):
    # 모델 평가/ 검증시 사용
    #1. eval 모드로 변경
    model.eval()
    model = model.to(device)

    eval_loss, eval_acc = 0.0
    for X, y in dataloader:
        #X,y를이동
        X,y = X.to(device), y.to(device)
        #추론
        pred_proba = model(X) #양성일 확률
        pred_class = (pred_proba > 0.5).type(torch.int32) #True: 1, False: 0 => Label

        #평가
        eval_loss += loss_fn(pred_proba, y).item()
        eval_acc += (pred_class == y).sum().item()
    
    return eval_loss / len(dataloader), eval_acc / len(dataloader.dataset)
```

```python
eval(model, test_loader, nn.BCELoss())
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: cannot unpack non-iterable float object</div></div>

`eval_loss, eval_acc = 0.0`은 0.0 하나를 두 변수에 풀어 넣으려는 코드라 에러가 난다. `eval_loss, eval_acc = 0.0, 0.0`이어야 한다.

> **보충** 함수 이름 `eval`은 파이썬 내장 함수 `eval()`을 덮어쓴다. 동작에는 지장이 없지만 헷갈리니 `evaluate` 같은 이름이 낫다. 정확도 계산의 `pred_proba > 0.5`는 이 모델이 **Sigmoid를 거친 확률**을 내기 때문에 맞다. 모델 저장 글의 유방암 예제(logit 출력)와 다른 점이다.

고친 두 함수다.

```python
# 보충: 고친 학습/평가 함수
def train(model, dataloader, loss_fn, optimizer, device="cpu"):
    model.train()
    model = model.to(device)
    train_loss = 0.0
    for X, y in dataloader:
        X, y = X.to(device), y.to(device)
        pred = model(X)
        loss = loss_fn(pred, y)
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
        train_loss += loss.item()
    return train_loss / len(dataloader)


@torch.no_grad()
def evaluate(model, dataloader, loss_fn, device="cpu"):
    model.eval()
    model = model.to(device)
    eval_loss, eval_acc = 0.0, 0.0
    for X, y in dataloader:
        X, y = X.to(device), y.to(device)
        pred_proba = model(X)
        pred_class = (pred_proba > 0.5).type(torch.int32)
        eval_loss += loss_fn(pred_proba, y).item()
        eval_acc += (pred_class == y).sum().item()
    return eval_loss / len(dataloader), eval_acc / len(dataloader.dataset)
```

### Train (보충)

```text
# COLAB에서 학습돌리기
```

노트북은 여기서 Colab으로 넘어가 학습 셀이 비어 있다. CPU에서 epoch 하나에 1분 남짓 걸려서, 한 epoch씩 돌리며 test 성능을 확인한다. 학습 전 상태부터 본다.

```python
# 보충: loss, optimizer
loss_fn = nn.BCELoss()                       # Sigmoid 출력 + 이진 분류
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

print("학습 전 test (loss, acc):", evaluate(model, test_loader, loss_fn, device))
history = []
```

```text
학습 전 test (loss, acc): (0.6945954977273942, 0.50866)
```

```python
# 보충: 1 epoch
import time
s = time.time()
train_loss = train(model, train_loader, loss_fn, optimizer, device)
test_loss, test_acc = evaluate(model, test_loader, loss_fn, device)
history.append((train_loss, test_loss, test_acc))
print(f"[1] train loss {train_loss:.4f} | test loss {test_loss:.4f} | test acc {test_acc:.4f} | {time.time() - s:.0f}초")
```

```text
[1] train loss 0.4305 | test loss 0.3716 | test acc 0.8328 | 61초
```

```python
# 보충: 2 epoch
s = time.time()
train_loss = train(model, train_loader, loss_fn, optimizer, device)
test_loss, test_acc = evaluate(model, test_loader, loss_fn, device)
history.append((train_loss, test_loss, test_acc))
print(f"[2] train loss {train_loss:.4f} | test loss {test_loss:.4f} | test acc {test_acc:.4f} | {time.time() - s:.0f}초")
```

```text
[2] train loss 0.3241 | test loss 0.3445 | test acc 0.8486 | 70초
```

```python
# 보충: 3 epoch
s = time.time()
train_loss = train(model, train_loader, loss_fn, optimizer, device)
test_loss, test_acc = evaluate(model, test_loader, loss_fn, device)
history.append((train_loss, test_loss, test_acc))
print(f"[3] train loss {train_loss:.4f} | test loss {test_loss:.4f} | test acc {test_acc:.4f} | {time.time() - s:.0f}초")
```

```text
[3] train loss 0.2771 | test loss 0.3378 | test acc 0.8548 | 65초
```

- 학습 전 test 정확도는 52.4%로 찍는 수준이다
- 1 epoch만에 83.3%, 2 epoch 84.9%, 3 epoch **85.5%**까지 올랐다. test loss도 0.372 → 0.345 → 0.338로 아직 줄고 있어서 몇 epoch 더 학습할 여지가 있다
- 대신 train loss(0.277)와 test loss(0.338)의 차이가 epoch마다 벌어지고 있다. 더 돌리면 곧 과대적합 구간에 들어설 것이다

> **보충** 지난 글의 패턴대로라면 validation set을 따로 떼어 best model 저장과 조기 종료를 해야 한다. 여기서는 3 epoch만 돌려서 test로 바로 확인했다. 더 길게 학습할 때는 train에서 validation을 나누고, test는 마지막에 한 번만 쓴다.

```text
#DEEP => 특징 추출기(Linear/cnn/grn/lstm) + 분류기(linear)


# <단어를 나누는 과정 + 전처리하는 과정>
# tokenize =>konlp

# <특성추출>
# TF-IDF/DTM : 모델링(ml만 사용하는 것은 아님 )
# <특성추출, 자연어처리>
# Word Embedding(Word2vec, Fast text)
# RNN - LSTM, GRN + 순차데이터(time-step)

# Ex. 분류(감성분분류): Rnn(LSTM)-> Linear
```

학습 셀 자리에 남아 있던 메모가 이 모델을 그대로 설명한다. Embedding(특성 추출) → LSTM(순차 데이터 특징 추출) → Linear(분류기)다.

## 모델 저장 (보충)

노트북에서 비어 있던 부분이다. 모델은 `state_dict`로, 토크나이저는 위에서 `bpe_tokenizer.json`으로 저장했다. 서비스에서는 이 둘과 **같은 전처리 함수**가 함께 있어야 한다.

```python
# 보충: 모델 저장
torch.save(model.state_dict(), "saved_model/nsmc/lstm/nsmc_lstm.pt")
```

## 서비스: 새 댓글 추론

### 전처리 함수들

```python
from kiwipiepy import Kiwi
import string
import re

kiwi = Kiwi()
def text_preprocessing(text):
    """
    1. 영문 -> 소문자로 변환
    2. 구두점 제거
    3. 형태소 기반 토큰화
    4. 형태소로 토큰화 한 뒤 다시 하나의 문자열로 묶어서 반환.
    """
    text = text.lower()
    text = re.sub(rf"[{string.punctuation}]", ' ', text) # 구두점(특수문자)들을 ' '으로 변환.
    text = [token.lemma for token in kiwi.tokenize(text)] # [a, b, c,]
    return ' '.join(text)
```

> **보충** 학습 데이터 전처리는 `[^가-힣a-zA-Z0-9 ]`(한글·영문·숫자·공백 **외 전부** 제거)였는데, 서비스용은 `string.punctuation`(**구두점만** 제거)이다. 서비스 쪽에서는 `ㅋㅋ`나 이모지가 남아서, 학습 때는 본 적 없는 토큰이 모델에 들어간다. **학습과 추론의 전처리는 같은 함수여야** 한다. 아래 추론에서는 학습 때 쓴 함수로 맞췄다.

```python
def pad_token_sequences(token_sequences, max_length):
    """padding 처리 메소드."""
    pad_token = tokenizer.token_to_id('<pad>')  
    seq_length = len(token_sequences)
    if seq_length > max_length:                 
        result = token_sequences[:max_length]
    else:                                            
        result = token_sequences + ([pad_token] * (max_length - seq_length))
    return result
```

노트북에서 `pass`로 남아 있던 함수를 채웠다.

```python
# 보충: predict_data_preprocessing 구현 - 학습 때와 같은 전처리
def train_text_preprocessing(text):
    text = text.lower()
    text = re.sub(r"[^가-힣a-zA-Z0-9 ]", " ", text)
    return " ".join(token.lemma for token in kiwi.tokenize(text))

def predict_data_preprocessing(text_list):
    """
    모델에 입력할 수있는 input data를 생성
    Parameter:
        text_list: list - 추론할 댓글리스트
    Return
        torch.LongTensor - 댓글 token_id tensor
    """
    ids = [pad_token_sequences(tokenizer.encode(train_text_preprocessing(t)).ids, max_length)
           for t in text_list]
    return torch.tensor(ids, dtype=torch.int64)
```

### 추론

```python
comment_list = ["아 진짜 재미없다.", "여기 식당 먹을만 해요", "이걸 영화라고 만들었냐?", "기대 안하고 봐서 그런지 괜찮은데.", "이걸 영화라고 만들었나?", "아! 뭐야 진짜.", "재미있는데.", "연기 짱 좋아. 한번 더 볼 의향도 있다.", "뭐 그럭저럭"]
```

```python
# 보충: 저장한 모델을 새로 불러와 추론
loaded = NSMCClassifier(vocab_size, embedding_dim, hidden_size, num_layers, bidirectional)
loaded.load_state_dict(torch.load("saved_model/nsmc/lstm/nsmc_lstm.pt", weights_only=True))
loaded.eval()

X_new = predict_data_preprocessing(comment_list)
with torch.no_grad():
    proba = loaded(X_new).squeeze(-1)

for text, p in zip(comment_list, proba):
    label = "긍정" if p > 0.5 else "부정"
    print(f"{label} ({p.item():.3f})  {text}")
```

```text
부정 (0.003)  아 진짜 재미없다.
긍정 (0.584)  여기 식당 먹을만 해요
부정 (0.013)  이걸 영화라고 만들었냐?
긍정 (0.822)  기대 안하고 봐서 그런지 괜찮은데.
부정 (0.013)  이걸 영화라고 만들었나?
부정 (0.121)  아! 뭐야 진짜.
긍정 (0.923)  재미있는데.
긍정 (0.958)  연기 짱 좋아. 한번 더 볼 의향도 있다.
부정 (0.024)  뭐 그럭저럭
```

- "아 진짜 재미없다", "이걸 영화라고 만들었냐?"는 확률 0.01 이하로 확실한 부정이다. "만들었냐"와 "만들었나"처럼 어미가 달라도 같은 판단이다
- "기대 안하고 봐서 그런지 괜찮은데."는 부정어 "안"이 들어 있지만 0.82로 긍정이다. 단어 하나가 아니라 문장 흐름을 보고 판단한 결과다
- "뭐 그럭저럭"은 0.02로 강한 부정이 나왔다. 사람에게는 중립에 가까운 표현인데, NSMC에는 중립 라벨이 없어서 모델이 둘 중 하나로 몰아간다
- "여기 식당 먹을만 해요"는 0.58로 애매한 긍정이다. 영화 댓글로만 학습해서 식당 리뷰는 판단 근거가 약하다

## TF-IDF + 로지스틱 회귀 vs LSTM

| | TF-IDF + 로지스틱 회귀 | Embedding + BiLSTM |
|---|---|---|
| 순서 정보 | n-gram 범위만큼만 | 문장 전체 순서 |
| 단어 의미 | 단어마다 독립된 열 | 비슷한 단어는 비슷한 벡터로 학습 |
| 학습 시간 (CPU) | 몇 초 | epoch당 1분 남짓 |
| 해석 | 단어 가중치로 바로 읽힌다 | 어렵다 |
| 이 시리즈의 test 정확도 | 84.4% | 85.5% (3 epoch) |

LSTM이 1%p 남짓 앞서지만, 짧은 댓글 분류에서는 TF-IDF 기준선이 생각보다 강하다. 딥러닝 모델을 만들기 전에 기준선부터 잡아 두면, 모델이 실제로 얼마나 나아졌는지 판단할 수 있다.

## 정리

- `nn.Embedding`은 index로 행을 꺼내는 lookup table이고, 모델과 함께 학습된다. `padding_idx`로 지정한 행은 0으로 고정된다
- 형태소 분석 → BPE 토큰화 → id 변환 → **패딩으로 길이 맞추기**까지가 데이터 준비다. 패딩을 빠뜨리면 DataLoader가 배치를 만들지 못한다
- 감성 분석은 **Many to One**이라 LSTM의 마지막 hidden state를 분류기에 넣는다. 양방향이면 정방향·역방향 마지막 hidden을 이어 붙인다
- 학습·추론의 **전처리는 같은 함수**를 써야 하고, 모델(`state_dict`)과 토크나이저를 함께 저장해야 서비스에서 같은 입력을 만들 수 있다
