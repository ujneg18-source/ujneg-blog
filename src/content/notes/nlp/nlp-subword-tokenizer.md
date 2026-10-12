---
title: "Subword 토크나이저: BPE·WordPiece·Unigram"
description: "형태소 기반 토큰화가 신조어와 OOV에 약한 이유, 어휘 사전과 OOV, 서브워드 토큰화의 원리와 장점, BPE·WordPiece·Unigram 알고리즘의 병합 기준을 정리하고, 청와대 국민청원 말뭉치로 Hugging Face tokenizers의 세 알고리즘을 직접 학습시켜 같은 문장을 어떻게 나누는지 비교합니다."
category: 'Tech'
subcategory: 'NLP'
series: '자연어 처리'
seriesOrder: 4
originalNotebook: "05_Subword_Tokenizer.ipynb"
tags: ["NLP"]
date: 2026-06-11T10:00:00+09:00
thumbnail: '../../../assets/images/notes/nlp/nlp-subword-tokenizer.webp'
---

> SKN31 자연어 처리 과정 노트북 `05_Subword_Tokenizer.ipynb`를 바탕으로 정리했습니다.
> 코드는 Hugging Face tokenizers 0.23에서 실행한 결과입니다. 노트북에서 tokenizers로 토크나이저를 학습하는 셀들은 비어 있어서, 그 부분은 `보충`으로 직접 학습시켜 채웠습니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다.

## 이 글에서 다루는 것

- 형태소 분석 기반 토큰화의 한계
- 어휘 사전(Vocabulary)과 OOV(Out Of Vocabulary)
- 서브워드 토큰화의 정의와 장점
- **BPE**: 가장 자주 나오는 글자 쌍을 병합
- **WordPiece**: 점수(확률) 기준으로 병합
- **Unigram**: 모든 후보에서 시작해 불필요한 서브워드를 제거
- Korpora로 말뭉치 받기, Hugging Face `tokenizers`로 세 알고리즘 학습하고 비교하기

## 형태소 분석 기반 토큰화의 문제

- 형태소 분석기는 **"이미 알고 있는 단어"**를 중심으로 판단한다. 그래서 오탈자, 띄어쓰기 실수, 신조어, 외래어, 고유어에 약하다
- 이 때문에 생길 수 있는 문제
  - **어휘 사전이 불필요하게 커진다**: 형태소 분석이 안 된 같은 의미의 단어가 여러 개 등록된다. 예) 신조어 `돈쭐`을 모르면 `"돈쭐내러"`, `"돈쭐나"`, `"돈쭐냄"`이 각각 등록된다
  - **OOV에 대응하기 어렵다**: 어근은 같은데 조사 등이 바뀐 신조어를 모르는 단어(OOV)로 처리한다

```text
# 형태소 분석 토큰화 => 신조어/외래어/고유어에 대해 취약함, OOV의 문제 발생
```

지난 글에서 Okt가 "마이닝"을 "마" + "이닝"으로, Kiwi가 등록 전의 "박새로이"를 "박" + "새로이"로 자른 것이 이 문제다.

## 어휘 사전과 OOV

- **어휘 사전(Vocabulary, Vocab)**: 토크나이저가 쓰는 모든 토큰의 집합. **각 토큰을 고유한 정수 ID에 매핑**한 사전이다
  - 텍스트를 토큰 ID 시퀀스로 바꿀 때 기준이 되고, 모델은 이 숫자를 입력으로 받는다

```text
{
    "자연어": 0,
    "처리": 1,
    "는": 2,
    "재미있다": 3,
    "공부": 4,
}
```

- **OOV(Out Of Vocabulary)**: 어휘 사전에 없는 토큰. 모델이 처리할 수 없어서 보통 `[UNK]` 같은 특별 토큰으로 바꾼다. `[UNK]`로 바뀌는 순간 그 단어의 정보는 사라진다

## 서브워드 토큰화

- 단어를 더 작은 단위(**subword**)로 나눠 토큰화한다. subword는 한 단어를 구성하는 조각이다. (coworker: co, work, er)
- 자주 나오는 단어의 일부는 공통 토큰으로 만들고, 희귀하거나 복합적인 단어는 작은 조각으로 나눈다
- 단어를 통째로 쓰지 않고 쪼개서 쓰기 때문에 새 단어나 미등록 단어(OOV) 문제가 줄어든다

**장점**

1. **미등록 단어 처리**: 신조어, 속어, 고유어가 나와도 미리 정의된 subword를 조합해 표현할 수 있다
2. **어휘 크기 축소**: 같은 subword를 여러 단어가 공유해서, 완전한 단어를 쓸 때보다 사전이 작다

```text
# 미등록단어가 나오지 않음 (글자단위로)
# 글자단위로 쪼개 공유하기 때문에 반복되는 수 줄일 수 있음
```

> **보충** 서브워드 사전에는 보통 낱글자가 전부 들어 있다. 그래서 아무리 처음 보는 단어도 최악의 경우 글자 단위로는 쪼갤 수 있고, `[UNK]`가 거의 나오지 않는다. 메모의 "미등록단어가 나오지 않음 (글자단위로)"가 이 뜻이다. 다만 사전에 없는 한자나 이모지처럼 학습 데이터에 한 번도 없던 글자는 여전히 `[UNK]`가 된다. GPT 계열의 Byte-level BPE는 글자 대신 바이트(256개)부터 시작해서 이 문제까지 없앴다.

| 종류 | 병합·선택 기준 | 사용 모델 |
|---|---|---|
| **BPE** (Byte-Pair Encoding) | 자주 나오는 문자 쌍을 반복해서 병합 | OpenAI GPT |
| **WordPiece** | BPE와 비슷하지만 빈도가 아니라 **합쳐질 가능성이 높은** 쌍을 병합 | Google BERT |
| **Unigram** | 빈도 기반 확률 모델로 subword를 선택. BPE보다 유연한 분할 | T5, ALBERT 등 (SentencePiece) |

## BPE (Byte Pair Encoding)

원래는 **텍스트 압축** 알고리즘이다. 자주 같이 나오는 두 글자 쌍을 하나의 기호로 바꾸면서 글자 수를 줄인다. 더 합칠 쌍이 없거나 정해 둔 사전 크기에 닿을 때까지 반복한다.

**압축 예: `abracadabra`**

1. `AracadAra`: 가장 많은 `ab`를 `A`로 치환 (기호는 아무 글자나 쓸 수 있다)
2. `ABcadAB`: 1의 결과에서 가장 많은 `ra`를 `B`로 치환
3. `CcadC`: 2의 결과에서 가장 많은 `AB`를 `C`로 치환 (치환된 기호도 다시 대상이 된다)

```text
# ab br ra ac ca ad da ab br ra
# ab => A
```

### BPE 토크나이저

BPE 토크나이저는 글자 쌍을 다른 기호로 바꾸는 대신, 합친 쌍을 **어휘 사전에 추가**한다.

1. 먼저 1차 토큰화를 한다. 보통 공백 기준이다. 결과가 다음과 같다고 하자
   - 토큰과 빈도: `('low', 5), ('lower', 2), ('newest', 6), ('widest', 3)`
2. 모든 토큰을 글자 단위로 나누고 어휘 사전에 넣는다
   - `('l','o','w', 5), ('l','o','w','e','r', 2), ('n','e','w','e','s','t', 6), ('w','i','d','e','s','t', 3)`
   - 어휘 사전: `['d','e','i','l','n','o','r','s','t','w']`
3. 가장 자주 나오는 글자 쌍을 찾는다. **'es'가 9번**(newest 6 + widest 3)으로 가장 많다. 'es'로 합치고 사전에 추가한다
4. 반복한다. 이번엔 'es' + 't'가 9번이라 'est'를 추가한다
5. 10번 반복하면
   - 빈도 사전: `('low', 5), ('low','e','r', 2), ('newest', 6), ('widest', 3)`
   - 어휘 사전: 처음 10글자 + `'es', 'est', 'lo', 'low', 'ne', 'new', 'newest', 'wi', 'wid', 'widest'`

이렇게 만든 사전으로는 원래 없던 단어도 처리할 수 있다.

- `'newer'` → `'new', 'e', 'r'`
- `'lowest'` → `'low', 'est'`
- `'wider'` → `'wid', 'e', 'r'`

```text
# 어절 단위로 자른다./글자단위로 만든다
# 정한 사전 크기(Vocabulary Size)에 도달했을 때 멈춤

# 엔지니어가 "토큰 사전을 딱 30,000개만 만들어라"라고 컴퓨터에게 명령을 내립니다. 
# 컴퓨터는 합치기를 반복하다가 단어 사전에 등록된 토큰 수가 정확히 30,000개가 되는 순간 모든 작업을 딱 멈춥니다.
```

위 과정을 파이썬으로 그대로 돌려 본다.

```python
# 보충: BPE 병합 과정을 직접 구현
from collections import Counter

words = {("l","o","w"): 5, ("l","o","w","e","r"): 2,
         ("n","e","w","e","s","t"): 6, ("w","i","d","e","s","t"): 3}

def merge(words, pair):
    a, b = pair
    new_words = {}
    for w, freq in words.items():
        out, i = [], 0
        while i < len(w):
            if i < len(w) - 1 and (w[i], w[i+1]) == pair:
                out.append(a + b); i += 2
            else:
                out.append(w[i]); i += 1
        new_words[tuple(out)] = freq
    return new_words

vocab = sorted({ch for w in words for ch in w})
for step in range(1, 11):
    pairs = Counter()
    for w, freq in words.items():
        for p in zip(w, w[1:]):
            pairs[p] += freq
    best, count = pairs.most_common(1)[0]
    words = merge(words, best)
    vocab.append("".join(best))
    print(f"{step:2}회: {best[0]} + {best[1]} → {''.join(best):7} ({count}번)")

print(words)
print(vocab)
```

```text
 1회: e + s → es      (9번)
 2회: es + t → est     (9번)
 3회: l + o → lo      (7번)
 4회: lo + w → low     (7번)
 5회: n + e → ne      (6번)
 6회: ne + w → new     (6번)
 7회: new + est → newest  (6번)
 8회: w + i → wi      (3번)
 9회: wi + d → wid     (3번)
10회: wid + est → widest  (3번)
{('low',): 5, ('low', 'e', 'r'): 2, ('newest',): 6, ('widest',): 3}
['d', 'e', 'i', 'l', 'n', 'o', 'r', 's', 't', 'w', 'es', 'est', 'lo', 'low', 'ne', 'new', 'newest', 'wi', 'wid', 'widest']
```

강의 자료의 결과와 똑같이 나온다.

> **보충** 빈도가 같은 쌍이 여럿일 때(예: 1회차의 'es'와 'st'는 둘 다 9번) 무엇을 먼저 합칠지는 구현마다 다르다. 위 코드는 먼저 센 쌍을 고른다. 순서가 달라도 최종 사전은 비슷하게 수렴하는 경우가 많지만, 사전 크기를 중간에서 끊으면 결과가 달라질 수 있다.

## WordPiece

- BPE가 **빈도** 기반이라면 WordPiece는 **확률(점수)** 기반으로 병합한다
- 두 글자 쌍의 빈도를 각 글자 빈도의 곱으로 나눈 점수가 가장 높은 쌍부터 묶는다

$$
score = \cfrac{f(x, y)}{f(x)\cdot f(y)}
$$

$f$는 빈도, $x, y$는 병합하려는 하위 단어다.

같은 예로 보면

- 글자 단위로 나눈 상태: `('l','o','w', 5), ('l','o','w','e','r', 2), ('n','e','w','e','s','t', 6), ('w','i','d','e','s','t', 3)`
- 가장 자주 나오는 쌍은 'e','s'로 9번이다. 그런데 'e'는 전체에서 17번, 's'는 9번 나온다. 점수는 $\frac{9}{17 \times 9} \approx 0.06$
- 'i','d'는 3번밖에 안 나오지만 'i'도 3번, 'd'도 3번이다. 점수는 $\frac{3}{3 \times 3} \approx 0.33$
- 빈도는 'es'가 많지만 점수가 높은 **'id'**를 먼저 병합한다

```text
# 분포수가 많아서 많이 합쳐진 애들이 아니라


# 하도 흔하고(하다, 하늘), 이도 흔합니다(이것, 사람이). 각자의 빈도(분모)가 어마어마하게 큽니다.

# 둘이 우연히 붙은 [하이]의 빈도(분자)가 제법 되더라도, 워낙 개별 몸값이 흔한 녀석들이라 점수가 낮게 나옵니다.


# ab100
# a:300, b:300



# ts:5
# t:5/s:5
```

메모의 숫자로 계산하면 `ab`는 $\frac{100}{300 \times 300} \approx 0.0011$, `ts`는 $\frac{5}{5 \times 5} = 0.2$다. `ts`는 5번밖에 안 나왔지만 t와 s가 나올 때마다 **항상 붙어 다니니** 하나의 단위로 볼 근거가 강하다. WordPiece는 "얼마나 자주"가 아니라 "얼마나 서로에게 묶여 있는지"를 본다.

```python
# 보충: 첫 병합에서 쌍별 BPE 빈도와 WordPiece 점수
words = {("l","o","w"): 5, ("l","o","w","e","r"): 2,
         ("n","e","w","e","s","t"): 6, ("w","i","d","e","s","t"): 3}
char_freq, pair_freq = Counter(), Counter()
for w, freq in words.items():
    for ch in w:
        char_freq[ch] += freq
    for p in zip(w, w[1:]):
        pair_freq[p] += freq

rows = sorted(pair_freq.items(), key=lambda kv: -kv[1] / (char_freq[kv[0][0]] * char_freq[kv[0][1]]))
for (x, y), f in rows[:6]:
    print(f"{x}{y}: 빈도 {f:2}  점수 {f / (char_freq[x] * char_freq[y]):.3f}")
```

```text
id: 빈도  3  점수 0.333
lo: 빈도  7  점수 0.143
st: 빈도  9  점수 0.111
ow: 빈도  7  점수 0.062
wi: 빈도  3  점수 0.062
er: 빈도  2  점수 0.059
```

점수 1등은 'id'(0.333)다. 빈도 1등이던 'es'(9번)는 점수가 $\frac{9}{17 \times 9} \approx 0.059$로, 표 맨 아래 'er'과 같은 수준까지 밀린다. 'e'가 워낙 여러 단어에 흩어져 있어서다.

## Unigram

빈도 기반 확률 모델로 서브워드를 고르고, 불필요한 서브워드를 **제거**해 가며 최적의 어휘 크기를 찾는다. BPE·WordPiece가 작은 것부터 **합쳐 올라가는** 방식이라면, Unigram은 큰 후보 집합에서 **깎아 내려가는** 방식이다.

1. **초기 어휘 집합 구성**: 모든 단어와 그 부분 문자열을 후보로 넣는다. 예) "hug" → `["h", "u", "g", "hu", "ug", "hug"]`
2. **subword별 확률 계산**: $\cfrac{\text{subword가 나타난 횟수}}{\text{전체 빈도수}}$
3. **가능한 분할의 확률 계산**: 분할 확률은 각 subword 확률의 곱이다
   - "hug"를 나누는 경우
     1. `["h", "u", "g"]`: $P(h) \times P(u) \times P(g)$
     2. `["hu", "g"]`: $P(hu) \times P(g)$
   - **가장 확률이 높은 분할**을 고른다. 1이 0.01, 2가 0.00001이면 1을 선택한다
4. **서브워드 제거**: 빈도가 낮거나 분할에 별 영향이 없는 subword를 지워 가며 목표 크기의 사전을 만든다

## 실습: 말뭉치 준비

```text
# 어휘사전을 만들때에는 대용량의 데이터를 사용해야 함
# 그 모델이 사용하는 문서를 가지고 어휘사전을 만든다.
```

**Korpora**는 다양한 한국어 데이터셋을 제공하는 패키지다. (`pip install korpora`) 청와대 국민청원 데이터를 받는다.

```python
from Korpora import Korpora

# 청와대 국민 청원 데이터셋

corpus = Korpora.load("korean_petitions")
```

```text
    Korpora 는 다른 분들이 연구 목적으로 공유해주신 말뭉치들을
    손쉽게 다운로드, 사용할 수 있는 기능만을 제공합니다.
    ...
    # Description
    Author : Hyunjoong Kim lovit@github
    Repository : https://github.com/lovit/petitions_archive
    ...
[korean_petitions] download petitions_2017-08: 1.84MB [00:00, 14.7MB/s]
[korean_petitions] download petitions_2017-09: 20.4MB [00:02, 9.30MB/s]
...
```

```python
type(corpus)
```

```text
Korpora.korpus_korean_petitions.KoreanPetitionsKorpus
```

```python
petitions = corpus.get_all_texts()
type(petitions), len(petitions)
print(petitions[10010])
```

```text
안전한 국가. 피해자가 정말로 잊어내고 새출발 할수 있게..도와주는 나라..두려움에 떨지않게 신속하게 대처해주시고 제발..부탁드립니다..
```

```python
import os
os.makedirs("data/petitions", exist_ok=True)
with open("data/petitions/petitions_corpus.txt", "wt", encoding="utf-8") as fw:
    for p in petitions:
        fw.write(p+"\n")

# 파일 크기가 커서 gitignore로 
```

> **보충** 위 다운로드와 저장 셀은 데이터를 수백 MB 다시 받아야 해서 노트북의 실행 결과를 옮겼다. 아래부터는 저장해 둔 파일로 실행했다.

```python
with open("data/petitions/petitions_corpus.txt", "rt", encoding="utf-8") as fr:
    load_petitions = fr.read()
print(len(load_petitions))
```

```text
222421175
```

2억 2천만 글자, 파일로는 약 540MB다. 청원 하나에 줄바꿈이 섞여 있어서 줄 수와 청원 수는 다르다.

## Hugging Face tokenizers

Hugging Face는

- 서브워드 토크나이저를 **학습시킬 수 있는 알고리즘**을 `tokenizers` 라이브러리로 제공한다 (`pip install tokenizers`, [문서](https://huggingface.co/docs/tokenizers/index))
- GPT, BERT 등 LLM에서 쓰인 **사전학습 토크나이저**를 `transformers` 라이브러리로 제공한다

**사용 순서**

1. **Tokenizer 생성**: 토큰화 알고리즘(모델)을 지정해 instance를 만든다
2. **Trainer 생성**: 사전 크기 같은 학습 파라미터를 정한다
3. **학습**: `train(파일경로 리스트)` 또는 `train_from_iterator(문자열 iterator)`

> **보충** 노트북에서는 이 부분의 셀이 비어 있다. 아래는 같은 순서로 세 알고리즘을 학습시켜 비교한 것이다. 전체 말뭉치는 커서 앞쪽 5만 줄만 썼다.

```python
# 보충: 학습 데이터 - 앞쪽 5만 줄
import itertools
with open("data/petitions/petitions_corpus.txt", encoding="utf-8") as f:
    lines = list(itertools.islice(f, 50000))
print(len(lines), "줄,", sum(map(len, lines)), "글자")
```

```text
50000 줄, 19352895 글자
```

```python
# 보충: BPE / WordPiece / Unigram 토크나이저 학습
import time
from tokenizers import Tokenizer, models, trainers, pre_tokenizers

VOCAB_SIZE = 30000
SPECIAL = ["[UNK]", "[PAD]"]

configs = {
    "BPE": (models.BPE(unk_token="[UNK]"),
            trainers.BpeTrainer(vocab_size=VOCAB_SIZE, special_tokens=SPECIAL, show_progress=False)),
    "WordPiece": (models.WordPiece(unk_token="[UNK]"),
                  trainers.WordPieceTrainer(vocab_size=VOCAB_SIZE, special_tokens=SPECIAL, show_progress=False)),
    "Unigram": (models.Unigram(),
                trainers.UnigramTrainer(vocab_size=VOCAB_SIZE, special_tokens=SPECIAL,
                                        unk_token="[UNK]", show_progress=False)),
}

tokenizers_ = {}
for name, (model, trainer) in configs.items():
    s = time.time()
    tok = Tokenizer(model)
    tok.pre_tokenizer = pre_tokenizers.Whitespace()   # 1차 토큰화: 공백·구두점 기준
    tok.train_from_iterator(lines, trainer)
    tokenizers_[name] = tok
    print(f"{name:10} 사전 크기 {tok.get_vocab_size():,}  학습 {time.time() - s:.1f}초")
```

```text
BPE        사전 크기 30,000  학습 3.5초
WordPiece  사전 크기 30,000  학습 3.3초
Unigram    사전 크기 30,000  학습 18.3초
```

| 구성 요소 | 역할 |
|---|---|
| `models.BPE / WordPiece / Unigram` | 토큰화 알고리즘 |
| `pre_tokenizers.Whitespace()` | 1차 토큰화. 이 단위 **안에서만** 서브워드를 만든다 (BPE 설명의 1단계) |
| `trainers.XxxTrainer(vocab_size=...)` | 사전 크기에 닿으면 학습을 멈춘다 (메모의 "30,000개") |
| `special_tokens` | `[UNK]`(모르는 토큰), `[PAD]`(길이 맞추기용) 같은 특수 토큰을 사전 맨 앞에 넣는다 |

노트북에 있던 테스트 문장 세 개로 비교한다. 스포츠 기사, 청원, 식당 리뷰로 분야가 다르다.

```python
# 테스트 문장
sports_txt = "프리미어리그 역대 개인 최다골 기록을 보유하고 있는 시어러가 손흥민의 골 결정력을 재차 극찬했다."
petition_txt = "이 글을 쓴 이유는 다름아닌 '전안법'시행 반대를 주장하기 위해서입니다. 먼저, '전안법'은 전기용품 및 생활용품을 판매하는 업체에서 KC인증마크를 의무적으로 받는 것입니다."
comment_txt = "멋진 식사를 즐기기에 좋은 장소 - 채식 메뉴가 정말 훌륭했습니다. 당근 케이크는 아마도 내가 먹어본 디저트 중 최고였을 거예요."
```

```python
# 보충: 알고리즘별 토큰화 결과
for title, txt in [("스포츠", sports_txt), ("청원", petition_txt), ("리뷰", comment_txt)]:
    print(f"=== {title} ===")
    for name, tok in tokenizers_.items():
        enc = tok.encode(txt)
        print(f"{name:10}({len(enc.tokens):2}개) {' '.join(enc.tokens)}")
    print()
```

```text
=== 스포츠 ===
BPE       (26개) 프리 미 어리 그 역대 개인 최 다 골 기록을 보유하고 있는 시어 러 가 손 흥 민의 골 결정 력을 재차 극 찬 했다 .
WordPiece (27개) 프리 ##미 ##어리 ##그 역대 개인 최 ##다 ##골 기록을 보유하고 있는 시 ##어 ##러 ##가 손 ##흥 ##민의 골 결정 ##력을 재차 극 ##찬 ##했다 .
Unigram   (26개) 프리 미 어리 그 역대 개인 최 다 골 기록 을 보유하고 있는 시어 러 가 손흥민 의 골 결정 력을 재차 극 찬 했다 .

=== 청원 ===
BPE       (40개) 이 글을 쓴 이유는 다름 아닌 ' 전안 법 ' 시행 반대를 주장 하기 위해서 입니다 . 먼저 , ' 전안 법 ' 은 전기 용품 및 생활 용 품을 판매하는 업체에서 KC 인증 마크 를 의무적으로 받는 것입니다 .
WordPiece (40개) 이 글을 쓴 이유는 다름 ##아닌 ' 전안 ##법 ' 시행 반대를 주장 ##하기 위해서 ##입니다 . 먼저 , ' 전안 ##법 ' 은 전기 ##용품 및 생활 ##용품 ##을 판매하는 업체에서 KC ##인증 ##마크 ##를 의무적으로 받는 것입니다 .
Unigram   (36개) 이 글을 쓴 이유는 다름 아닌 ' 전안법 ' 시행 반대를 주장 하기 위해서 입니다 . 먼저 , ' 전안법 ' 은 전기용품 및 생활 용품 을 판매하는 업체에서 KC인증 마크 를 의무적으로 받는 것입니다 .

=== 리뷰 ===
BPE       (31개) 멋진 식사를 즐기 기에 좋은 장소 - 채식 메뉴 가 정말 훌륭 했습니다 . 당 근 케 이크 는 아마도 내가 먹어 본 디 저 트 중 최고 였을 거예요 .
WordPiece (34개) 멋진 식사를 즐 ##기기 ##에 좋은 장소 - 채식 메 ##뉴 ##가 정말 훌륭 ##했습니다 . 당 ##근 케 ##이크 ##는 아마도 내가 먹어 ##본 디 ##저 ##트 중 최고 ##였을 거 ##예요 .
Unigram   (30개) 멋진 식사를 즐기 기에 좋은 장소 - 채식 메뉴 가 정말 훌륭 했습니다 . 당근 케이 크 는 아마도 내가 먹어 본 디 저 트 중 최고 였을 거예요 .
```

- 같은 데이터, 같은 사전 크기인데 나누는 방식이 다르다
- **WordPiece**는 단어 중간에서 이어지는 조각에 `##`를 붙인다. `전안 ##법`은 "전안"으로 시작한 단어가 "법"으로 이어진다는 뜻이라, 나중에 붙여서 원래 단어로 되돌릴 수 있다
- **Unigram**은 "손흥민", "전안법", "전기용품", "KC인증", "당근"처럼 덩어리를 통째로 잡는 경우가 많고 토큰 수도 가장 적다(청원 36개 vs 40개)
- 세 알고리즘 모두 **청원 문장**은 "위해서", "의무적으로", "판매하는"처럼 큰 단위로 자르지만, **스포츠 기사**의 "프리미어리그"는 `프리 미 어리 그`로 잘게 쪼갠다. 청원 말뭉치로 학습했기 때문이다. 메모의 "그 모델이 사용하는 문서를 가지고 어휘사전을 만든다"가 이 뜻이다

`encode`의 결과에는 토큰 문자열(`tokens`)과 정수 ID(`ids`)가 같이 들어 있다. 모델에 들어가는 건 `ids`다.

```python
# 보충: 토큰 → ID → 다시 문자열
enc = tokenizers_["BPE"].encode("손흥민의 골 결정력")
print(enc.tokens)
print(enc.ids)
print(tokenizers_["BPE"].decode(enc.ids))
```

```text
['손', '흥', '민의', '골', '결정', '력']
[2311, 3353, 17232, 1299, 3785, 1863]
손 흥 민의 골 결정 력
```

> **보충** `decode` 결과가 원문 "손흥민의 골 결정력"이 아니라 "손 흥 민의 골 결정 력"이다. 1차 토큰화(`Whitespace`)에서 공백을 버렸고, 토큰끼리 어떻게 붙일지 알려 주는 decoder를 지정하지 않아서 모든 토큰 사이에 공백을 넣었다. 생성 모델은 출력을 원문 그대로 복원해야 하므로 공백 정보를 토큰에 남긴다. WordPiece는 `##`, SentencePiece는 단어 시작에 `▁`, GPT의 Byte-level BPE는 공백을 `Ġ` 문자로 토큰 안에 넣는다.

```text
# Tokenize를 통해 문서를 Token으로 만듦 (tokenize)
# 하나의 문서가 하나의 데이터 


# 생성 = 서브워드 방식을 많이 사용
# 이해 = 형태소 기반

# token으로 나눈 후, 의미를 이해할 수 있는 숫자들로 바꿈 (text to Vector)

# count : 단어의 빈도 수를 가지고 문서의 의미를 표현
```

마지막 메모가 다음 글로 이어진다. 토큰 ID는 아직 이름표일 뿐이라, 이걸 의미를 담은 벡터로 바꾸는 첫 방법이 빈도(count) 기반 표현이다.

## 형태소 vs 서브워드, 언제 무엇을

| 상황 | 추천 | 이유 |
|---|---|---|
| 감성 분석, 문서 분류, 키워드 추출 (이해) | 형태소 (Kiwi, Okt) | 품사 정보로 조사·어미를 걸러 핵심어만 남기기 좋다 |
| 챗봇, 번역, 요약 (생성) | 서브워드 (BPE, Unigram) | 출력 문장을 빠짐없이 다시 조립해야 한다 |
| 신조어·오타·외래어가 많은 데이터 (댓글, SNS) | 서브워드 | 사전에 없는 말도 조각으로 표현된다 |
| 사전학습 모델(BERT, GPT)을 쓸 때 | 그 모델의 토크나이저 그대로 | 모델이 학습한 사전과 달라지면 ID가 어긋난다 |

## 정리

- 형태소 분석기는 아는 단어 중심이라 신조어·외래어·오타에 약하고, 사전이 커지거나 OOV가 생긴다
- 서브워드 토큰화는 단어를 자주 나오는 조각으로 나눠 **OOV를 줄이고 사전 크기를 조절**한다. LLM의 표준이다
- **BPE**는 가장 **자주** 나오는 쌍을, **WordPiece**는 $\frac{f(x,y)}{f(x)f(y)}$ 점수가 가장 **높은** 쌍을 병합한다. **Unigram**은 큰 후보 집합에서 확률이 낮은 조각을 **지워** 나간다
- Hugging Face `tokenizers`는 모델 → 1차 토큰화 → Trainer(사전 크기) → 학습 순서로 쓰고, `encode`로 토큰과 ID를, `decode`로 다시 문장을 얻는다
