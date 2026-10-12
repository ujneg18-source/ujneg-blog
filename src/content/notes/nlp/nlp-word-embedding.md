---
title: "Word Embedding: Word2Vec과 FastText"
description: "희소 표현(one-hot)과 밀집 표현(embedding)의 차이, 분포 가설과 분산 표현, Word2Vec의 CBOW와 Skip-gram 데이터셋 구성과 모델 구조, 은닉층 계산이 가중치 행렬의 행을 꺼내는 lookup이 되는 이유, subword로 OOV에 강한 FastText를 정리하고, 네이버 영화 리뷰로 gensim Word2Vec·FastText를 직접 학습시켜 유사 단어를 확인합니다."
category: 'Tech'
subcategory: 'NLP'
series: '자연어 처리'
seriesOrder: 6
originalNotebook: "07_Text_to_Vector_word_embedding.ipynb"
tags: ["NLP"]
date: 2026-06-15T10:00:00+09:00
thumbnail: '../../../assets/images/notes/nlp/nlp-word-embedding.webp'
---

> SKN31 자연어 처리 과정 노트북 `07_Text_to_Vector_word_embedding.ipynb`를 바탕으로 정리했습니다.
> 노트북은 개념 설명과 수업 메모만 있고 실행 코드가 없어서, gensim으로 직접 학습시켜 보는 부분은 `보충`으로 채웠습니다. 코드는 gensim 4.4, kiwipiepy 0.24에서 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다.

## 이 글에서 다루는 것

- Word Embedding이란: 희소 표현 vs 밀집 표현
- 분포 가설과 분산 표현
- **Word2Vec**: CBOW와 Skip-gram, 데이터셋 구성, 모델 구조
- 은닉층 계산이 **lookup**이 되는 이유
- **FastText**: subword로 OOV에 대응
- 실습(보충): 네이버 영화 리뷰로 Word2Vec·FastText 학습

지난 글의 TF-IDF는 "최고"와 "명작"이 비슷한 말이라는 걸 모른다. 둘은 서로 다른 열일 뿐이다. 단어 자체에 **의미**를 담은 벡터를 주는 게 이번 글의 Word Embedding이다.

## Word Embedding이란

**워드 임베딩(word embedding)**은 단어를 기호나 정수 ID 대신 **의미·특성 정보를 담은 실수 밀집 벡터(dense vector)**로 표현하는 기술이다. 단어를 고정 길이의 실수 벡터에 매핑해서, 컴퓨터가 **단어 의미의 유사성**을 계산할 수 있게 한다. 이렇게 만든 벡터를 **임베딩 벡터(embedding vector)**라고 한다.

- **고정 길이**: 특성(feature)의 개수
- **의미의 유사성이 반영된다**: 비슷한 의미의 단어는 비슷한 값들로 구성되도록 한다
- 단순히 숫자로 바꾸는 방식(one-hot 등)은 단어의 의미나 특성을 담지 못한다. 임베딩은 이 문제를 풀려고 나왔다

| | 희소(sparse) 표현 | 밀집(dense) 표현 |
|---|---|---|
| 대표 | one-hot encoding | word embedding |
| 모양 | 단어 사전 크기만큼의 차원에서 index 하나만 1, 나머지는 0 | 고정 차원(50, 100, 700 등)의 실수 벡터 |
| 예: "먹다" (사전 10,000개) | `[0,0,0,...,1,...,0]` 10,000차원 | `[0.12, -0.83, 0.05, ...]` 100차원 |
| 차원 | 단어가 늘수록 선형으로 증가 | 단어 수와 무관하게 고정 |
| 의미 | 단어를 **구분**만 한다. 모든 단어 사이의 거리가 같다 | 의미의 유사성이 벡터의 **방향과 거리**로 표현된다 |

![one-hot vector](/images/nlp/fig-onehotvector.png)

```text
# 희소벡터



# 밀집벡터(= 워드 임베딩)
```

```python
# 보충: one-hot 벡터끼리는 의미 비교가 안 된다
words = ["밥", "빵", "자동차"]
onehot = np.eye(len(words))
cos = lambda a, b: a @ b / (np.linalg.norm(a) * np.linalg.norm(b))
print("밥-빵   :", cos(onehot[0], onehot[1]))
print("밥-자동차:", cos(onehot[0], onehot[2]))
```

```text
밥-빵   : 0.0
밥-자동차: 0.0
```

one-hot에서는 어떤 두 단어를 골라도 코사인 유사도가 0이다. "밥"과 "빵"이 "밥"과 "자동차"보다 가깝다는 정보가 전혀 없다.

## 분산 표현 (Distributed Representation)

**분포 가설**을 바탕으로 단어의 의미를 밀집 벡터로 표현하는 방법이다.

> **분포 가설(Distributional Hypothesis)**: "비슷한 맥락(context)에 등장하는 단어는 비슷한 의미를 가진다."

즉 **단어의 의미는 그 주변 단어들의 분포로 파악할 수 있다.**

- 나는 **밥을** 먹는다.
- 나는 **빵을** 먹는다.
- 나는 **국수를** 먹는다.

세 문장 모두 '나는'과 '먹는다' 사이에 밥/빵/국수가 나온다. 주변 단어(맥락)가 비슷하니 **밥–빵–국수는 벡터 공간에서 가까운 위치**에 놓이도록 학습된다. Word2Vec, FastText가 이 원리로 만든 대표 모델이다.

```text
# 나는 밥을 먹는다
# 나는 빵을 먹는다
# 나는 국수를 먹는다


# 밥, 빵, 국수 -> 중심단어 
# 나는+먹는다 (주변단어-입력) => 밥을/빵을/국수를(출력)

#CBOW -> 나머지를 가지고 중심단어를 맞춤
#Skip-gram -> 중심단어를 가지고 나머지 단어를 맞춤

# 분산표현의 방식
```

## Word2Vec

- 딥러닝 기반 word embedding 방식이다. 모델은 `입력층 - 은닉층 - 출력층`의 단순한 Fully connected 구조다
- **학습이 끝나면 Fully connected layer의 weight를 embedding vector로 쓴다**. 예측 자체가 목적이 아니라, 예측하도록 학습시키는 과정에서 생긴 가중치가 목적이다

### CBOW와 Skip-gram

두 방식 모두 분포 가설에 따라 **주변 단어와 중심 단어의 관계**를 학습한다.

| | CBOW (Continuous Bag of Words) | Skip-gram |
|---|---|---|
| 입력 → 출력 | 주변 단어들 → **중심 단어** | 중심 단어 → **주변 단어들** |
| 빈칸 문제 | 나는 어제 ___ 함께 학교에 갔다. | ____ 밥을 _____ |

![CBOW와 Skip-gram](/images/nlp/fig-word2vec-cbow-skipgram-outline.png)

> - **중심 단어**: target 단어, 기준 단어
> - **주변 단어**: target 주위의 단어. context(맥락) 또는 window라고 한다
> - **window size**: 주변 단어를 몇 개로 할지. N이면 중심 단어 **좌우로 N개씩**

```text
# 주변단어 갯수 => window size 
```

### CBOW

**데이터셋 구성**

- CBOW·Skip-gram 학습 데이터는 모든 토큰이 one-hot encoding되어 있어야 한다 (열: 모든 단어, 행: 개별 단어)

![one-hot vector 데이터셋](/images/nlp/fig-word2vec-dataset-onehot.png)

- window size를 정한 뒤 중심 단어를 한 칸씩 뒤로 옮기며 (중심 단어, 주변 단어) 쌍을 뽑는다. 이렇게 정한 크기만큼 이동하며 작업하는 방식을 **sliding window**라고 한다
- window size 2로 데이터셋을 구성한 예

![CBOW sliding window](/images/nlp/fig-word2vec-cbow-sliding-window.png)

**모델 구조**: 주변 단어들의 one-hot vector가 **입력**, 중심 단어의 one-hot vector가 **출력**이다.

- vocab size(총 단어 수): 10,000
- window size: 2
- embedding 차원: 100
- 입력: 주변 단어 one-hot vector 4개 (window size × 2)
- 출력: 전체 단어 각각이 중심 단어일 확률 (**다중 분류 문제**)

![CBOW 모델 구조](/images/nlp/fig-word2vec-cbow.png)

### 은닉층 계산 = lookup

입력이 one-hot vector라 단어 index 자리만 1이다. 이 벡터와 가중치 행렬 $W_{in}$을 곱하면, **$W_{in}$에서 그 단어 index의 행을 꺼내는 것**과 같다.

$$
\begin{bmatrix} 0 & 0 & 1 & 0 \end{bmatrix} \cdot
\begin{bmatrix}
0.1 & 0.1 & 0.1 \\
0.2 & 0.2 & 0.2 \\
0.3 & 0.3 & 0.3 \\
0.4 & 0.4 & 0.4
\end{bmatrix} =
\begin{bmatrix} 0.3 & 0.3 & 0.3 \end{bmatrix}
$$

(행: 단어 4개, 열: embedding 차원 3)

```python
# 보충: 행렬곱과 index 조회가 같은 결과
W_in = np.array([[0.1, 0.1, 0.1],
                 [0.2, 0.2, 0.2],
                 [0.3, 0.3, 0.3],
                 [0.4, 0.4, 0.4]])
x = np.array([0, 0, 1, 0])     # 2번 단어의 one-hot
print("행렬곱   :", x @ W_in)
print("2번 행 조회:", W_in[2])
```

```text
행렬곱   : [0.3 0.3 0.3]
2번 행 조회: [0.3 0.3 0.3]
```

- 그래서 Word2Vec의 학습은 **$W_{in}$의 각 행이 그 단어의 embedding vector가 되도록**, 주변 단어와 중심 단어의 관계로 가중치를 조정하는 일이다
- 학습이 끝나면 $W_{in}$(또는 $W_{out}$)을 word embedding으로 쓴다

> **보충** 실제 구현에서는 10,000차원 one-hot을 만들어 곱하지 않고 index로 행을 바로 꺼낸다. 어휘가 수만 개면 one-hot 행렬곱은 0을 곱하느라 계산을 거의 다 버리기 때문이다. PyTorch의 `nn.Embedding`이 바로 이 "index → 행 조회" 레이어다. 다음 글의 RNN·LSTM 모델 맨 앞에 들어간다.

### Skip-gram

중심 단어로 주변 단어를 예측한다.

**데이터셋 구성**

- CBOW처럼 모든 토큰은 one-hot vector로 만든다
- sliding window로 이동하며 **(중심 단어, 주변 단어) 쌍**으로 데이터셋을 만든다. window size가 n이면 중심 단어 하나에 앞 n개, 뒤 n개가 출력이 된다
- window size 2로 데이터셋을 구성한 예

![Skip-gram sliding window](/images/nlp/fig-word2vec-skipgram-sliding-window.png)

**모델 구조**

![Skip-gram 모델 구조](/images/nlp/fig-word2vec-skipgram.png)

- 입력은 중심 단어의 one-hot vector, 출력은 주변 단어 추론이다. window size가 2면 주변 단어 4개를 추론한다
- 학습할 때는 주변 단어마다 loss를 계산해 **합계를 최종 loss**로 삼아 $W_{in}$과 $W_{out}$을 업데이트한다

```python
# 보충: window size 2로 (중심, 주변) 쌍 만들기
tokens = ["나", "는", "어제", "친구", "와", "학교", "에", "갔다"]
window = 2
for i, center in enumerate(tokens[:4]):
    context = tokens[max(0, i - window):i] + tokens[i + 1:i + 1 + window]
    print(f"중심: {center:3}  주변: {context}")
```

```text
중심: 나    주변: ['는', '어제']
중심: 는    주변: ['나', '어제', '친구']
중심: 어제   주변: ['나', '는', '친구', '와']
중심: 친구   주변: ['는', '어제', '와', '학교']
```

같은 쌍을 CBOW는 "주변 → 중심", Skip-gram은 "중심 → 주변 각각"으로 쓴다. 문장 앞쪽은 왼쪽 주변 단어가 모자라서 쌍이 적다.

### CBOW vs Skip-gram

- 여러 논문의 비교 결과를 보면 대체로 **Skip-gram이 더 좋다**
- 특히 말뭉치가 클수록 저빈도 단어나 유추 문제에서 Skip-gram이 뛰어난 경향이 있다
- Skip-gram은 단어 하나로 주변 단어 **여러 개**를 맞히는, CBOW보다 어려운 문제다. 더 어려운 조건에서 훈련하는 만큼 분산 표현이 더 좋아질 가능성이 크다

## FastText

- Word2Vec 기반의 word embedding 방식이고 모델 구조도 같다
- Word2Vec은 **단어** 단위로 학습하지만, FastText는 단어를 **subword**로 더 나눠서 학습한다
- **장점**: 처음 보는 단어도 subword 벡터를 조합해 표현할 수 있어서 **OOV에 강하다**

> **보충** FastText는 단어 앞뒤에 경계 기호 `<`, `>`를 붙인 뒤 글자 n-gram(기본 3~6글자)으로 쪼갠다. "where"는 `<wh`, `whe`, `her`, `ere`, `re>`, … 와 `<where>` 자체로 나뉘고, 단어 벡터는 이 조각 벡터들의 합이다. 그래서 학습 때 못 본 단어라도 조각이 겹치면 벡터를 만들 수 있다.

## 실습 (보충): 네이버 영화 리뷰로 Word2Vec·FastText 학습

노트북에는 실행 코드가 없어서, 지난 글의 NSMC 데이터로 직접 학습시켜 본다. 라이브러리는 **gensim**(`pip install gensim`)을 쓴다.

```python
# 보충: NSMC 19만 문장을 Kiwi로 토큰화 (원형, 기호 제외)
import pandas as pd
from kiwipiepy import Kiwi

df = pd.read_csv("naver.movie_comment/data/ratings.txt", sep="\t").dropna()
df = df.drop_duplicates(subset=["document"])

kiwi = Kiwi(num_workers=4)            # 여러 문장을 한 번에 넘기면 병렬로 처리한다
sentences = [[t.lemma for t in tokens if not t.tag.startswith("S")]
             for tokens in kiwi.tokenize(df["document"].tolist())]
print(len(sentences), "문장,", sum(map(len, sentences)), "토큰")
print(sentences[0])
```

```text
194543 문장, 3554670 토큰
['어리다', 'ᆯ', '때', '보다', '고', '지금', '다시', '보다', '어도', '재밌다', '어요']
```

> **보충** 지난 글처럼 댓글 하나씩 `kiwi.tokenize(doc)`를 부르면 순서대로 처리해서 느리다. 리스트를 통째로 넘기면 Kiwi가 `num_workers`개의 스레드로 나눠 처리한다.

```python
# 보충: Word2Vec 학습 (Skip-gram)
from gensim.models import Word2Vec

w2v = Word2Vec(
    sentences,
    vector_size=100,   # embedding 차원
    window=3,          # 중심 단어 좌우 3개가 주변 단어
    min_count=5,       # 5번 미만 나온 단어는 버린다
    sg=1,              # 1: Skip-gram, 0: CBOW
    workers=4,
    seed=0,
)
print("어휘 수:", len(w2v.wv))
print("'배우' 벡터 앞 8차원:", w2v.wv["배우"][:8])
```

```text
어휘 수: 14189
'배우' 벡터 앞 8차원: [ 0.396 -0.324 -0.105 -0.736  0.817 -0.202  0.264 -0.545]
```

학습이 끝난 `w2v.wv`가 단어 → 100차원 벡터 사전이다. 이 벡터들이 위에서 말한 $W_{in}$의 행이다.

```python
# 보충: 의미가 가까운 단어
for word in ["배우", "감독", "지루", "최고"]:
    similar = w2v.wv.most_similar(word, topn=6)
    print(f"{word:3} → " + ", ".join(f"{w}({s:.2f})" for w, s in similar))
```

```text
배우  → 연기자(0.82), 여배우(0.78), 출연진(0.73), 조연(0.73), 명배우(0.72), 연기파(0.70)
감독  → 김기덕(0.69), 작가(0.67), 제작진(0.67), 제작자(0.64), 서극(0.62), 박찬욱(0.61)
지루  → 따분(0.84), 루즈(0.84), 졸립다(0.81), 지루하다(0.79), 시시(0.79), 졸리다(0.79)
최고  → 최악(0.75), 단연(0.75), 레전드(0.75), 쵝오(0.73), 최강(0.73), 손꼽히다(0.73)
```

- `배우` 근처에 `연기자`, `여배우`, `출연진`, `조연`이 모였다. TF-IDF에서는 서로 아무 관계 없는 열이던 단어들이다
- `감독` 근처에는 `김기덕`, `서극`, `박찬욱` 같은 **감독 이름**이 왔다. "OOO 감독 작품" 같은 맥락을 공유하기 때문이다
- `지루` 근처의 `루즈`, `따분`, `졸립다`, `시시`는 모두 지루함을 표현하는 말이다
- `최고`의 가장 가까운 이웃이 `최악`(0.75)이다. 분포 가설의 한계다. "이 영화 정말 최고다"와 "이 영화 정말 최악이다"처럼 **반대말도 같은 맥락**에 나와서 벡터가 가까워진다. 감성 분석에 임베딩만 쓰면 이 둘을 구분하기 어렵다
- `쵝오`처럼 맞춤법이 틀린 변형도 맥락이 같아서 `최고`와 가깝게 학습됐다

```python
# 보충: 두 단어의 유사도, 그리고 "하나만 다른 것" 찾기
print("배우-연기자:", round(float(w2v.wv.similarity("배우", "연기자")), 3))
print("배우-팝콘  :", round(float(w2v.wv.similarity("배우", "팝콘")), 3))
print("배우 감독 연기자 여배우 중 하나만 다른 것:", w2v.wv.doesnt_match(["배우", "감독", "연기자", "여배우"]))
```

```text
배우-연기자: 0.817
배우-팝콘  : 0.163
배우 감독 연기자 여배우 중 하나만 다른 것: 감독
```

사전에 없는 단어를 물으면 Word2Vec은 벡터를 만들 방법이 없다. 아래 셀은 에러가 나는 것이 정상이다.

```python
# 보충: 학습 때 못 본 단어
w2v.wv["존잼탱"]
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · KeyError: &quot;Key &#x27;존잼탱&#x27; not present&quot;</div></div>

FastText는 같은 인터페이스로 학습하고, subword 조각으로 OOV 단어의 벡터도 만든다.

```python
# 보충: FastText 학습
from gensim.models import FastText

ft = FastText(sentences, vector_size=100, window=3, min_count=5, sg=1, workers=4, seed=0,
              bucket=200_000)   # subword 조각을 담을 해시 칸 수 (기본 200만)

for word in ["존잼탱", "노잼", "꿀잼영화"]:
    print(f"{word} (사전에 있나: {word in ft.wv.key_to_index})")
    print("   → " + ", ".join(f"{w}({s:.2f})" for w, s in ft.wv.most_similar(word, topn=5)))
```

```text
존잼탱 (사전에 있나: False)
   → 존잼(0.91), 운널사(0.91), 구가의 서(0.89), 잼슴(0.89), 별그대(0.88)
노잼 (사전에 있나: True)
   → 핵노잼(0.90), 씹노잼(0.89), 개노잼(0.87), 하핡(0.78), 핵노답(0.77)
꿀잼영화 (사전에 있나: False)
   → 성인영화(0.92), 계몽영화(0.90), 극영화(0.89), 성룡영화(0.89), 미화영화(0.89)
```

- `존잼탱`은 FastText 사전에도 없지만, 글자 조각(`<존잼`, `존잼탱`, `잼탱>` 등)이 `존잼`과 겹쳐서 벡터가 만들어졌고 가장 가까운 단어로 `존잼`(0.91), `잼슴`이 나왔다. Word2Vec은 같은 단어에서 KeyError를 냈다
- `노잼` 주변에는 `씹노잼`, `핵노잼`, `개노잼`처럼 **"노잼"이 들어간 변형**이 몰렸다. 접두어를 붙인 신조어를 한 덩어리로 묶는 데는 FastText가 확실히 강하다
- 대신 **글자가 겹친다고 뜻이 같지는 않다**. `존잼탱`의 이웃에 `운널사`, `구가의 서`, `별그대` 같은 드라마 줄임말도 섞여 있다. `꿀잼영화`는 "재미있는 영화"라는 뜻인데, 이웃이 `성인영화`, `계몽영화`, `성룡영화`처럼 끝의 "영화" 조각을 공유하는 단어들이다. subword가 의미를 압도하는 경우다

## Word2Vec vs FastText, 언제 무엇을

| 상황 | 추천 |
|---|---|
| 말뭉치가 깨끗하고 어휘가 안정적이다 (뉴스, 문서) | Word2Vec |
| 신조어·오타·변형이 많다 (댓글, SNS) | FastText |
| 서비스 중 처음 보는 단어가 계속 들어온다 | FastText (OOV도 벡터가 나온다) |
| 같은 단어가 문맥마다 다른 뜻이다 ("배가 고프다" / "배를 탔다") | 둘 다 안 된다 → 문맥 임베딩(RNN, BERT) |

## 정리

- **Word Embedding**은 단어를 의미를 담은 저차원 실수 벡터로 표현한다. one-hot은 단어를 구분만 하고, 임베딩은 유사도를 계산할 수 있다
- 근거는 **분포 가설**: 비슷한 맥락에 나오는 단어는 비슷한 의미다
- **Word2Vec**은 CBOW(주변 → 중심) 또는 Skip-gram(중심 → 주변)으로 학습하고, 학습된 가중치 행렬의 각 행을 단어 벡터로 쓴다. one-hot × $W_{in}$은 행 조회(lookup)와 같다
- **FastText**는 단어를 글자 n-gram으로 쪼개 학습해서 OOV 단어에도 벡터를 만든다
- 두 방식 모두 단어마다 **벡터가 하나로 고정**이다. 문맥에 따라 뜻이 바뀌는 단어를 구분하려면 다음 글의 RNN부터 시작하는 문맥 기반 표현이 필요하다
