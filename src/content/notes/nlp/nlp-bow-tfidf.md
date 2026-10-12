---
title: "BoW와 TF-IDF: 횟수 기반 벡터화와 영화 리뷰 감성 분석"
description: "텍스트를 숫자 벡터로 바꾸는 Text Vectorization의 세 갈래, 빈도 기반 표현인 Bag of Words(DTM/TDM)와 n-gram, 여러 문서에 흔한 단어에 페널티를 주는 TF-IDF를 scikit-learn CountVectorizer·TfidfVectorizer와 Kiwi 토크나이저로 실습하고, 네이버 영화 리뷰(NSMC) 19만 건을 TF-IDF + 로지스틱 회귀로 감성 분석합니다."
category: 'Tech'
subcategory: 'NLP'
series: '자연어 처리'
seriesOrder: 5
originalNotebook: "06_Text_to_Vector_count_base.ipynb, naver.movie_comment/nsmc.ipynb"
tags: ["NLP"]
date: 2026-06-12T10:00:00+09:00
thumbnail: '../../../assets/images/notes/nlp/nlp-bow-tfidf.webp'
---

> SKN31 자연어 처리 과정 노트북 `06_Text_to_Vector_count_base.ipynb`와, 이어서 진행한 실습 노트북 `naver.movie_comment/nsmc.ipynb`를 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7, kiwipiepy 0.24에서 실행한 결과입니다. NSMC 19만 건 토큰화는 렌더링 시간 때문에 같은 Kiwi로 미리 계산해 둔 결과를 불러와 썼습니다. 그래서 `걸린시간` 출력이 노트북(약 300초)보다 짧습니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- Text Vectorization이란: Feature 추출, 활용 분야, 세 가지 방법론
- **Bag of Words**: DTM/TDM, scikit-learn `CountVectorizer`, n-gram
- **TF-IDF**: 개념, 계산식, `TfidfVectorizer`
- 실습: 네이버 영화 리뷰(NSMC) 감성 분석 — Kiwi 토큰화 + TF-IDF + 로지스틱 회귀

지난 두 글로 문장을 토큰으로 자르는 데까지 왔다. 이제 토큰 묶음인 문서를 **숫자 벡터**로 바꿔야 머신러닝 모델에 넣을 수 있다.

## Text to Vector (Text Vectorization)

1. **정의**: 자연어(텍스트)를 컴퓨터가 다룰 수 있는 **숫자 벡터로 변환**하는 과정. 비정형 텍스트를 수치로 표현해서, 단어·문장·문단을 수학적으로 다룰 수 있게 한다

![Text to Vector 개요](/images/nlp/fig-text-to-vector-outline.png)

2. **Feature 추출**
   - 텍스트에서 output을 계산하는 데 필요한 **중요한 특징(feature)**을 뽑는다
   - 의미적·문법적 특성을 수치화하고, 단어나 문장 간의 관계를 벡터 공간에서 표현한다
3. **활용**
   - 분류, 군집화, 감성 분석 같은 머신러닝·딥러닝 작업의 입력
   - 두 텍스트의 **유사도** 비교. 비슷한 문장, 단어, 문서를 찾는다

**세 가지 방법론**

| 방법 | 핵심 | 예 | 이 시리즈 |
|---|---|---|---|
| **Count-Based** | 단어가 나온 **횟수** | Bag of Words, TF-IDF | 이 글 |
| **Word Embedding** | 단어를 **고정된** 벡터로. 문맥과 상관없이 같은 단어는 같은 값 | Word2Vec, FastText, GloVe | 다음 글 |
| **Contextualized Word Embedding** | 문맥에 따라 값이 바뀌는 **동적** 벡터 | ELMo, BERT, GPT-2, RoBERTa | RNN 글 이후 |

## Bag of Words (BoW)

- **단어의 출현 빈도에만 집중**해서 문서를 표현한다. 단어의 **순서는 전혀 고려하지 않는다**
- 생각: **많이 나온 단어가 중요한 단어다**
- 단어를 가방에 쏟아 넣고 개수만 센다는 뜻에서 Bag of Words다

### DTM / TDM

문서마다 각 단어가 몇 번 나왔는지를 행렬로 만든다.

| | 행 | 열 | 값 |
|---|---|---|---|
| **DTM** (Document-Term Matrix) | 문서 | 모든 문서에 나온 단어 | 출현 빈도 |
| **TDM** (Term-Document Matrix) | 단어 | 문서 | 출현 빈도 |

둘은 같은 정보이고 행과 열만 바뀌었다(전치 관계).

| | 단어1 | 단어2 | 단어3 | 단어4 | ... |
|---|---|---|---|---|---|
| 문서1 | 1 | 0 | 3 | 5 | ... |
| 문서2 | 0 | 0 | 2 | 0 | ... |
| 문서3 | 0 | 15 | 20 | 0 | ... |

**구현 순서**

1. 어휘 사전(vocabulary) 생성: 전체 문서의 모든 단어를 모으고 고유 정수 index를 붙인다
2. 문서와 단어의 DTM/TDM 행렬을 만든다

### scikit-learn CountVectorizer

빈도 기반 벡터화를 해 주는 전처리 클래스다.

| 매개변수 | 내용 |
|---|---|
| `stop_words` | 불용어. `"english"`(영어 내장) 또는 리스트 |
| `max_df` | 이 이상 나오는 단어는 무시. int(횟수) 또는 float(비율) |
| `min_df` | 이 이하로 나오는 단어는 무시 |
| `max_features` | 빈도 상위 몇 개 토큰만 쓸지 |
| `ngram_range` | n-gram 범위 튜플. `(1, 2)`면 1개씩, 그리고 연속 2개씩 묶어서도 Feature를 만든다 |
| `tokenizer` | 토큰화 함수 |

| 메소드/속성 | 내용 |
|---|---|
| `fit(X)` | 문서 리스트로 어휘 사전을 만든다. **Train 데이터로만 학습하고, Test는 학습한 변환기로 transform만 한다** |
| `transform(X)` | DTM으로 변환 |
| `fit_transform(X)` | 한 번에 처리 |
| `vocabulary_` | 어휘 사전 `{단어: index}` |

> **n-gram**
> - N개의 토큰을 묶어 하나의 토큰으로 처리하는 방식. uni-gram(n=1), bi-gram(n=2), tri-gram(n=3), 그 이상은 4-gram, 5-gram...
> - BoW에 적용하면 n개 단어 묶음이 하나의 토큰이 된다. 언어 모델에 적용하면 앞뒤 n개 단어로 다음 단어를 유추한다
> - n이 **너무 크면 희소성** 문제가 생긴다. "나는 어제 밥을 먹으러 식당에 가려다가 마음을 바꾸었다" 같은 토큰이 말뭉치에 몇 번이나 나올까
> - n이 **너무 작으면** 단어 간 관계가 표현되지 않는다

> **보충** BoW가 순서를 무시한다는 건 "개가 사람을 물었다"와 "사람이 개를 물었다"가 거의 같은 벡터가 된다는 뜻이다. bi-gram을 넣으면 "개 사람"과 "사람 개"처럼 순서가 일부 들어간다. n-gram은 BoW에 순서 정보를 조금 되돌려 주는 장치다.

### 실습: 6개 문서로 DTM 만들기

```python
# 문서 리스트
## 각 원소들이 각 문서.
text = ["나는 야구를 좋아합니다. 나는 축구를 좋아하지 않습니다.",  # 한줄당 문서 하나 (원래는 책/논문 등)
        "친구는 야구와 축구를 좋아합니다. 야구보다 축구를 더 좋아합니다.", 
        "나는 축구를 더 좋아합니다. 영국 축구 리그보다 이탈리아 축구 리그를 더 좋아합니다.", 
        "나는 농구를 좋아하지 않습니다. 배구도 좋아하지 않습니다.", 
        "나는 액션영화를 좋아합니다.", 
        "어제 비빕밥을 먹었습니다."]

print("문서개수:", len(text))
stop_words = list('은는이가을를도.,') # 전처리 단계 stop_words
stop_words
```

```text
문서개수: 6
```

```text
['은', '는', '이', '가', '을', '를', '도', '.', ',']
```

토큰화는 지난 글의 Kiwi로 하고, 불용어를 빼고 원형(lemma)만 남긴다.

```python
# 전처리 및 토큰화 -> 형태소기반 토큰화
from kiwipiepy import Kiwi

kiwi = Kiwi()
def tokenizer(doc:str) -> list: 
    """문서를 받아서 형태소 기반으로 토큰화 해서 토큰목록을 반환 """ # 및 전처리(불용어 제거)
    tokens = kiwi.tokenize(doc) # list[Token]
    # 불용어 제외. Token객체서 원형만 추출
    tokens = [token.lemma for token in tokens if token.form not in stop_words]
    return tokens 

tokenizer(text[0])
```

```text
['나', '야구', '좋아하다', 'ᆸ니다', '나', '축구', '좋아하다', '지', '않다', '습니다']
```

"좋아합니다"가 `좋아하다` + `ᆸ니다`로, "않습니다"가 `않다` + `습니다`로 원형이 됐다.

```python
# CountVectorizer를 이용해서 Text to Vector 작업 실행.
## 문서의 의미를 표현하는 숫자 Vector로 변환.

from sklearn.feature_extraction.text import CountVectorizer # 변환기

cv = CountVectorizer(
    # 문서(str)을 받아서 토큰화 하는 함수(callerable)설정. 생략 token_pattern에 설정을 따른다. (기본: 공백/구두점)
    tokenizer=tokenizer, 
    token_pattern=None, # 패턴은 '정규표현식'으로 넣어도 됌
)

# 학습(fit)
cv.fit(text)  # 입력: list[str-문서]. fit()-단어(토큰)들 추출

# 1) 전처리+토큰화
# 2) 벡터화 (ex.DTM-Count 기반)
```

```text
CountVectorizer(token_pattern=None,
                tokenizer=<function tokenizer at 0xe89babb7ca60>)
```

```python
# 어휘사전 확인
print(cv.vocabulary_)
```

```text
{'나': 1, '야구': 12, '좋아하다': 19, 'ᆸ니다': 0, '축구': 21, '지': 20, '않다': 10, '습니다': 9, '친구': 22, '와': 17, '보다': 7, '더': 3, '영국': 15, '리그': 4, '이탈리아': 18, '농구': 2, '배구': 6, '액션': 11, '영화': 16, '어제': 13, '비빕밥': 8, '먹다': 5, '었': 14}
```

```python
cv.get_feature_names_out()
```

```text
array(['ᆸ니다', '나', '농구', '더', '리그', '먹다', '배구', '보다', '비빕밥', '습니다', '않다',
       '액션', '야구', '어제', '었', '영국', '영화', '와', '이탈리아', '좋아하다', '지', '축구',
       '친구'], dtype=object)
```

`get_feature_names_out()`은 index 순서대로 단어를 준다. index는 단어의 정렬 순서(가나다순)다.

> **보충** 6번 문서의 "비빕밥"은 "비빔밥"의 오타다. 노트북(kiwipiepy 0.23)에서는 사전에 없는 말이라 `비`, `빕`, `밥` 세 토큰으로 잘려서 어휘가 25개였다. 이 글의 0.24에서는 `비빕밥`을 모르는 명사 하나로 묶어 어휘가 23개다. 같은 오타가 분석기 버전에 따라 DTM의 열을 바꾼다. 지난 글의 OOV 문제가 그대로 벡터의 모양에 영향을 주는 것이다.

```python
# 변환
dtm = cv.transform(text)
# dtm
arr = dtm.toarray()
print(arr.shape)  # (6: 문서, 25: 단어) # 단어의 빈도수만 가지고 문서의 내용을 판단함
arr
```

```text
(6, 23)
```

```text
array([[1, 2, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 2, 1, 1,
        0],
       [2, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 2, 0, 2,
        1],
       [2, 1, 0, 2, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 2, 0, 3,
        0],
       [0, 1, 1, 0, 0, 0, 1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0,
        0],
       [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0,
        0],
       [0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
        0]])
```

`transform`의 결과는 대부분이 0인 **희소 행렬(sparse matrix)**이라, 눈으로 보려면 `toarray()`로 바꾼다. DataFrame으로 만들면 읽기 쉽다.

```python
# DataFrame으로 확인
import pandas as pd
dtm_df = pd.DataFrame(
    arr, 
    columns=cv.get_feature_names_out(),
    index=[f"{i+1}번 문서" for i in range(arr.shape[0])]
)
dtm_df
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 23열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>ᆸ니다</th><th>나</th><th>농구</th><th>더</th><th>리그</th><th>먹다</th><th>배구</th><th>보다</th><th>비빕밥</th><th>습니다</th><th>않다</th><th>액션</th><th>야구</th><th>어제</th><th>었</th><th>영국</th><th>영화</th><th>와</th><th>이탈리아</th><th>좋아하다</th><th>지</th><th>축구</th><th>친구</th></tr></thead><tbody><tr><th class="idx">1번 문서</th><td>1</td><td>2</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>2</td><td>1</td><td>1</td><td>0</td></tr><tr><th class="idx">2번 문서</th><td>2</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>2</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>2</td><td>0</td><td>2</td><td>1</td></tr><tr><th class="idx">3번 문서</th><td>2</td><td>1</td><td>0</td><td>2</td><td>2</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>1</td><td>2</td><td>0</td><td>3</td><td>0</td></tr><tr><th class="idx">4번 문서</th><td>0</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>2</td><td>2</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>2</td><td>2</td><td>0</td><td>0</td></tr><tr><th class="idx">5번 문서</th><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td></tr><tr><th class="idx">6번 문서</th><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></div></div>

```python
tdm_df = dtm_df.T
tdm_df.head(8)

# ㅂ니다 : 문서의 구분에 영향을 주지 않음 다 포함되어있기 때문 DTM은 이런 걸 자동으로 확인하지 못함 => TF - IDF (전체 문서서의 빈도수까지)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 6열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>1번 문서</th><th>2번 문서</th><th>3번 문서</th><th>4번 문서</th><th>5번 문서</th><th>6번 문서</th></tr></thead><tbody><tr><th class="idx">ᆸ니다</th><td>1</td><td>2</td><td>2</td><td>0</td><td>1</td><td>0</td></tr><tr><th class="idx">나</th><td>2</td><td>0</td><td>1</td><td>1</td><td>1</td><td>0</td></tr><tr><th class="idx">농구</th><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td></tr><tr><th class="idx">더</th><td>0</td><td>1</td><td>2</td><td>0</td><td>0</td><td>0</td></tr><tr><th class="idx">리그</th><td>0</td><td>0</td><td>2</td><td>0</td><td>0</td><td>0</td></tr><tr><th class="idx">먹다</th><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td></tr><tr><th class="idx">배구</th><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td></tr><tr><th class="idx">보다</th><td>0</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></div></div>

주석이 TF-IDF가 필요한 이유다. `ᆸ니다`, `좋아하다`는 거의 모든 문서에 나와서 문서를 **구분**하는 데는 쓸모가 없는데, DTM에서는 큰 값을 가진다.

### n-gram 적용

```python
# N-Gram
cv2 = CountVectorizer(
    tokenizer=tokenizer,
    token_pattern=None, 
    ngram_range=(1, 3)
)
dtm = cv2.fit_transform(text)
dtm.shape
```

```text
(6, 97)
```

```python
cv2.get_feature_names_out()[:20]
```

```text
array(['ᆸ니다', 'ᆸ니다 나', 'ᆸ니다 나 축구', 'ᆸ니다 야구', 'ᆸ니다 야구 보다', 'ᆸ니다 영국',
       'ᆸ니다 영국 축구', '나', '나 농구', '나 농구 좋아하다', '나 액션', '나 액션 영화', '나 야구',
       '나 야구 좋아하다', '나 축구', '나 축구 더', '나 축구 좋아하다', '농구', '농구 좋아하다',
       '농구 좋아하다 지'], dtype=object)
```

단어 23개가 1~3-gram을 넣자 97개로 늘었다. "나 야구 좋아하다"처럼 순서가 들어간 토큰이 생긴 대신, 대부분이 한 문서에 한 번만 나오는 **희소한** 토큰이다.

```python
dtm.toarray()[0]
```

```text
array([1, 1, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0,
       0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0,
       0, 0, 0, 1, 0, 1, 0, 0, 0])
```

## TF-IDF (Term Frequency – Inverse Document Frequency)

- 개별 문서에 많이 나오는 단어는 높은 값을 주되, **여러 문서에 두루 나오는 단어에는 페널티**를 준다
- 어떤 문서에 특정 단어가 많이 나오면 그 문서를 설명하는 중요한 단어일 수 있다. 그런데 다른 문서에도 많이 나온다면 언어 특성이나 주제상 원래 흔한 단어일 수 있다
- 문서가 길고 많을수록 Count 방식보다 TF-IDF가 더 좋은 성능을 내는 경우가 많다

**계산**

- **TF** (Term Frequency): 단어가 **그 문서에** 몇 번 나오는지
- **DF** (Document Frequency): 단어가 **몇 개의 문서에** 나오는지
- **IDF** (Inverse Document Frequency): DF의 역수

$$
IDF = \cfrac{\text{전체 문서수}}{\text{해당 단어가 나오는 문서수}}
$$

$$
TF\text{-}IDF = TF \times \left(\log \cfrac{\text{전체 문서수}}{\text{해당 단어가 나오는 문서수}} \right)
$$

- 문서 수가 많으면 값이 너무 커지므로 log를 취한다
- scikit-learn은 분모가 0이 되지 않도록 **분모에 1**, $\log(0)$을 피하려고 **분자에도 1**을 더하고, 결과에 **1을 더한다**

$$
TF \times \left(\log \cfrac{\text{전체 문서수} + 1}{\text{해당 단어가 나오는 문서수} + 1} + 1\right)
$$

`TfidfVectorizer`의 매개변수와 메소드는 `CountVectorizer`와 같다.

```python
from sklearn.feature_extraction.text import TfidfVectorizer

tfidf = TfidfVectorizer(
    tokenizer=tokenizer,
)
tfidf.fit(text)
```

<div class="sql-result sql-result-warn"><div class="sql-result-meta">경고 · UserWarning: The parameter &#x27;token_pattern&#x27; will not be used since &#x27;tokenizer&#x27; is not None&#x27;</div></div>

```text
TfidfVectorizer(tokenizer=<function tokenizer at 0xe89babb7ca60>)
```

`token_pattern=None`을 빼먹어서 "tokenizer를 줬으니 token_pattern은 안 쓴다"는 경고가 나왔다. 동작에는 문제없고, `CountVectorizer`처럼 `token_pattern=None`을 같이 주면 사라진다.

```python
tfidf.get_feature_names_out()
```

```text
array(['ᆸ니다', '나', '농구', '더', '리그', '먹다', '배구', '보다', '비빕밥', '습니다', '않다',
       '액션', '야구', '어제', '었', '영국', '영화', '와', '이탈리아', '좋아하다', '지', '축구',
       '친구'], dtype=object)
```

```python
# 변환
f_vector = tfidf.transform(text)

f_vector_df = pd.DataFrame(
    f_vector.toarray(),
    columns=tfidf.get_feature_names_out(),
    index=[f"{i+1}번 문서" for i in range(f_vector.shape[0])]
)
f_vector_df.round(3)

# 숫자가 크면 많이 나온거임
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 6행 × 23열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>ᆸ니다</th><th>나</th><th>농구</th><th>더</th><th>리그</th><th>먹다</th><th>배구</th><th>보다</th><th>비빕밥</th><th>습니다</th><th>않다</th><th>액션</th><th>야구</th><th>어제</th><th>었</th><th>영국</th><th>영화</th><th>와</th><th>이탈리아</th><th>좋아하다</th><th>지</th><th>축구</th><th>친구</th></tr></thead><tbody><tr><th class="idx">1번 문서</th><td>0.247</td><td>0.493</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.288</td><td>0.341</td><td>0.0</td><td>0.341</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.426</td><td>0.341</td><td>0.288</td><td>0.0</td></tr><tr><th class="idx">2번 문서</th><td>0.368</td><td>0.0</td><td>0.0</td><td>0.254</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.254</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.508</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.31</td><td>0.0</td><td>0.318</td><td>0.0</td><td>0.429</td><td>0.31</td></tr><tr><th class="idx">3번 문서</th><td>0.292</td><td>0.146</td><td>0.0</td><td>0.404</td><td>0.493</td><td>0.0</td><td>0.0</td><td>0.202</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.246</td><td>0.0</td><td>0.0</td><td>0.246</td><td>0.252</td><td>0.0</td><td>0.512</td><td>0.0</td></tr><tr><th class="idx">4번 문서</th><td>0.0</td><td>0.181</td><td>0.306</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.306</td><td>0.0</td><td>0.0</td><td>0.423</td><td>0.501</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.313</td><td>0.501</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">5번 문서</th><td>0.344</td><td>0.344</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.581</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.581</td><td>0.0</td><td>0.0</td><td>0.297</td><td>0.0</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">6번 문서</th><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.472</td><td>0.0</td><td>0.0</td><td>0.472</td><td>0.327</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.472</td><td>0.472</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td></tr></tbody></table></div></div>

DTM과 나란히 보면 차이가 보인다.

```python
# 보충: 1번·3번 문서의 Count vs TF-IDF
compare = pd.DataFrame({
    "1번 Count": dtm_df.loc["1번 문서"], "1번 TF-IDF": f_vector_df.loc["1번 문서"].round(3),
    "3번 Count": dtm_df.loc["3번 문서"], "3번 TF-IDF": f_vector_df.loc["3번 문서"].round(3),
})
compare[(compare["1번 Count"] > 0) | (compare["3번 Count"] > 0)]
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 13행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>1번 Count</th><th>1번 TF-IDF</th><th>3번 Count</th><th>3번 TF-IDF</th></tr></thead><tbody><tr><th class="idx">ᆸ니다</th><td>1</td><td>0.247</td><td>2</td><td>0.292</td></tr><tr><th class="idx">나</th><td>2</td><td>0.493</td><td>1</td><td>0.146</td></tr><tr><th class="idx">더</th><td>0</td><td>0.0</td><td>2</td><td>0.404</td></tr><tr><th class="idx">리그</th><td>0</td><td>0.0</td><td>2</td><td>0.493</td></tr><tr><th class="idx">보다</th><td>0</td><td>0.0</td><td>1</td><td>0.202</td></tr><tr><th class="idx">습니다</th><td>1</td><td>0.288</td><td>0</td><td>0.0</td></tr><tr><th class="idx">않다</th><td>1</td><td>0.341</td><td>0</td><td>0.0</td></tr><tr><th class="idx">야구</th><td>1</td><td>0.341</td><td>0</td><td>0.0</td></tr><tr><th class="idx">영국</th><td>0</td><td>0.0</td><td>1</td><td>0.246</td></tr><tr><th class="idx">이탈리아</th><td>0</td><td>0.0</td><td>1</td><td>0.246</td></tr><tr><th class="idx">좋아하다</th><td>2</td><td>0.426</td><td>2</td><td>0.252</td></tr><tr><th class="idx">지</th><td>1</td><td>0.341</td><td>0</td><td>0.0</td></tr><tr><th class="idx">축구</th><td>1</td><td>0.288</td><td>3</td><td>0.512</td></tr></tbody></table></div></div>

- 3번 문서에서 `리그`와 `좋아하다`는 둘 다 2번 나왔다. 그런데 TF-IDF는 `리그` 0.493, `좋아하다` 0.252로 두 배 가까이 차이 난다. `리그`는 3번 문서에만 나오고, `좋아하다`는 1~5번 다섯 문서에 다 나오기 때문이다
- `ᆸ니다`도 여러 문서에 흔해서 Count 2가 0.292로 깎였다. DTM 주석에서 지적한 문제가 이렇게 줄어든다
- 1번 문서의 `나`(Count 2)가 0.493으로 높게 나온 건, 문서 안에서 많이 나온 데다 6번 문서에는 없어서다. "나"가 정말 중요한 단어는 아니니, 대명사는 불용어로 빼는 편이 낫다

> **보충** 주석의 "숫자가 크면 많이 나온거임"은 반만 맞다. TF-IDF 값이 크다는 건 **그 문서에 많이 나오면서 다른 문서에는 잘 안 나온다**는 뜻이다. 그리고 scikit-learn은 기본으로 각 문서 벡터의 길이를 1로 맞추는 L2 정규화(`norm='l2'`)를 해서, 같은 단어라도 문서 길이에 따라 값이 달라진다.

```text
# text => raw 데이터 
# 모델링을 할 때에는 dtm_df으로 모델링 문서를 (F-V) 과정을 사용함
```

## 실습: 네이버 영화 리뷰 감성 분석

- **NSMC**(Naver Sentiment Movie Corpus): 네이버 영화 댓글 20만 건 ([GitHub](https://github.com/e9t/nsmc))
- 입력: 영화 댓글 / 출력: 부정(0), 긍정(1). Korpora로도 받을 수 있다

```text
# 이진 분류/다중 분류이냐에 따라 출력해석이 다름
```

### 데이터 확인

```python
# 데이터셋 다운로드 및 DataFrame 생성

import requests
import pandas as pd
from io import StringIO # (메모리에 있는) String과 입출력 작업을 할 수 있게 하는 객체
# IO객체를 만들기 위함 (함수에 넣기 위해) /  pd.read_csv()


url = "https://raw.githubusercontent.com/e9t/nsmc/refs/heads/master/ratings.txt" # 원격자원

resp = requests.get(url)


if resp.status_code == 200: # HTTP 상태 코드(Status Code) 규약에 따르면, 200은 서버가 요청을 완벽하게 이해하고 성공적으로 처리했다는 표준 신호
    str_io = StringIO(resp.text)

    df = pd.read_csv(str_io, sep='\t')
    print(df.head())

# else :
#     print("실패")

df.shape
```

> **보충** 다운로드 셀은 받아 둔 같은 파일(`data/ratings.txt`)을 읽는 것으로 바꿔 실행했다. 내용은 같다.

```python
import pandas as pd
df = pd.read_csv("naver.movie_comment/data/ratings.txt", sep='\t')
print(df.shape)
df.head() # label(1) = 긍정 / 중립은 없음
```

```text
(200000, 3)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>document</th><th>label</th></tr></thead><tbody><tr><th class="idx">0</th><td>8112052</td><td>어릴때보고 지금다시봐도 재밌어요ㅋㅋ</td><td>1</td></tr><tr><th class="idx">1</th><td>8132799</td><td>디자인을 배우는 학생으로, 외국디자이너와 그들이 일군 전통을 통해 발전해가는 문화산업이 부러웠는데. 사...</td><td>1</td></tr><tr><th class="idx">2</th><td>4655635</td><td>폴리스스토리 시리즈는 1부터 뉴까지 버릴께 하나도 없음.. 최고.</td><td>1</td></tr><tr><th class="idx">3</th><td>9251303</td><td>와.. 연기가 진짜 개쩔구나.. 지루할거라고 생각했는데 몰입해서 봤다.. 그래 이런게 진짜 영화지</td><td>1</td></tr><tr><th class="idx">4</th><td>10067386</td><td>안개 자욱한 밤하늘에 떠 있는 초승달 같은 영화.</td><td>1</td></tr></tbody></table></div></div>

```python
df.isnull().sum()
```

```text
id          0
document    8
label       0
dtype: int64
```

```python
# 결측치를 제거 
df = df.dropna()

# 중복행 확인/제거
duplicate_count = df.duplicated(subset=['document']).sum()
print(f"중복된 리뷰 개수: {duplicate_count}개")
```

```text
중복된 리뷰 개수: 5449개
```

```python
df[df.duplicated(subset=['document'], keep = False)].sort_values("document").head(8)
#keep = False: 모든 중복행등을 True로 반환
#keep = "frist"/"last" : 중복 된 것들에서 frist 첫번째, last 마지막 것만 True(중복된 행의 값만 확인하고자 할때)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>document</th><th>label</th></tr></thead><tbody><tr><th class="idx">136580</th><td>6993402</td><td>!</td><td>0</td></tr><tr><th class="idx">12986</th><td>181912</td><td>!</td><td>1</td></tr><tr><th class="idx">59493</th><td>7448690</td><td>,</td><td>1</td></tr><tr><th class="idx">15611</th><td>7868198</td><td>,</td><td>1</td></tr><tr><th class="idx">101742</th><td>7481337</td><td>,,,</td><td>0</td></tr><tr><th class="idx">166152</th><td>7935083</td><td>,,,</td><td>0</td></tr><tr><th class="idx">146518</th><td>6868999</td><td>,,,</td><td>0</td></tr><tr><th class="idx">31251</th><td>2853697</td><td>,,,</td><td>1</td></tr></tbody></table></div></div>

`!` 하나, `,` 하나 같은 댓글이 긍정·부정 양쪽에 다 있다. 같은 글에 다른 라벨이 붙은 셈이라 학습에 혼란만 준다.

```python
df = df.drop_duplicates(subset=['document']) #하나만 남기고 나머지는 삭제한다.
print(df.shape)
# 중복된 행의 제거로 인한 인덱스의 네임을 초기화
df.reset_index(drop=True, inplace=True)
```

```text
(194543, 3)
```

> **보충** `drop_duplicates`는 첫 번째 것을 남긴다. 그래서 "!"처럼 라벨이 엇갈리는 중복은 먼저 나온 행의 라벨이 남는다. 엄밀하게는 라벨이 서로 다른 중복은 **모두** 지우는 게 낫다.

```python
# 긍정/부정 데이터 개수 및 비율 확인
print("--- 데이터 개수 확인 ---")
print(df['label'].value_counts())

print("\n--- 데이터 비율(%) 확인 ---")
print(df['label'].value_counts(normalize=True))
```

```text
--- 데이터 개수 확인 ---
label
0    97277
1    97266
Name: count, dtype: int64

--- 데이터 비율(%) 확인 ---
label
0    0.500028
1    0.499972
Name: proportion, dtype: float64
```

긍정과 부정이 거의 정확히 반반인 **균형 데이터**다. 정확도(accuracy)를 그대로 평가지표로 써도 된다.

```python
import matplotlib.pyplot as plt
import seaborn as sns

# 2. 그래프 크기 및 스타일 설정
plt.figure(figsize=(6, 5))
sns.set_theme(style="whitegrid")

# 1. 그래프 한글 깨짐 방지 설정 (코랩/기본 환경 기준)
plt.rc('font', family='Noto Sans CJK JP') # 맥북 유저라면 'AppleGothic'으로 변경!
plt.rcParams['axes.unicode_minus'] = False # 마이너스 기호 깨짐 방지

# 3. 카운트플롯 그릴 때 데이터 세팅
# x축은 label(0, 1), 데이터는 우리 데이터프레임 df
ax = sns.countplot(x='label', data=df, hue='label', palette='Set2', legend=False)

# 4. 그래프 제목 및 축 이름 설정
plt.title('NSMC 데이터셋 긍정(1) / 부정(0) 분포', fontsize=14, pad=15)
plt.xlabel('감성 라벨 (Sentiment)', fontsize=12)
plt.ylabel('리뷰 개수 (Count)', fontsize=12)

# x축 눈금 이름 변경 (0->부정, 1->긍정)
ax.set_xticks([0, 1])
ax.set_xticklabels(['부정 (0)', '긍정 (1)'])

# 5. 막대 위에 실제 개수 텍스트 표시하기 (선택 사항, 그래프를 더 직관적으로 만듦)
for p in ax.patches:
    ax.annotate(f'{int(p.get_height()):,}', 
                (p.get_x() + p.get_width() / 2., p.get_height()), 
                ha='center', va='center', 
                xytext=(0, 8), 
                textcoords='offset points',
                fontsize=11)

plt.show()
```

![그래프 출력](/images/nlp/nlp-bow-tfidf-1.png)

> **보충** 노트북 셀에서 세 군데를 고쳤다. (1) `sns.set_theme()`이 폰트 설정을 기본값으로 되돌리기 때문에 한글 폰트 설정을 그 **뒤로** 옮겼다. 원래 순서면 한글이 네모로 나온다. (2) `palette`만 주고 `hue`가 없으면 seaborn 0.14에서 없어질 방식이라는 FutureWarning이 나서 `hue='label', legend=False`를 줬다. (3) 눈금 위치 없이 이름만 바꾸면 경고가 나서 `set_xticks`를 먼저 불렀다. 폰트는 이 환경에 있는 Noto Sans CJK로 바꿨다.

```python
df['length'] =df['document'].str.len()

print("--- 리뷰 길이 통계 ---")

print(df['length'].describe())
```

```text
--- 리뷰 길이 통계 ---
count    194543.000000
mean         36.042345
std          29.497004
min           1.000000
25%          16.000000
50%          27.000000
75%          43.000000
max         142.000000
Name: length, dtype: float64
```

평균 36자, 절반이 27자 이하인 **짧은 글**이다. 최대 142자인 건 당시 네이버 영화 한 줄 평의 글자 수 제한 때문이다.

### 데이터셋 클래스: 다운로드 + 전처리 + 토큰화

```text
# ------------------------------------------------
# 댓글 데이터셋 제공 class
## 1.데이터 다운로드 및 저장
## 2.기본적인 전처리
## 3.형태소 기반 토큰화 진행
```

```python
import os
import requests
import pandas as pd
from kiwipiepy import Kiwi


class NSMCTokenizer:
    
    def __init__(self): 
        # 데이터셋을 저장할 파일 경로
        os.makedirs("data", exist_ok=True)
        self.data_file_path = "data/ratings.txt"
        #Kiwi 객체
        self.kiwi = Kiwi()

        # 토큰화 끝난 Dataset의 DataFrame을 속성으로 저장
        
        ## 1.Dataset download and loading
        df = self.load_nsmc_dataset()

        ## 2.댓글 전처리 + 토큰화
        self.nsmc_df = self.preprocess(df)

    def load_nsmc_dataset(self)-> pd.DataFrame:
        """
        nsmc 데이터셋을 다운받아서 data.ratings.txt로 저장하고 
        Dataframe으로 만들어서 반환.
        Args:
        Return:
            pd.DataFrame: 네이버 영화 댓글 데이터셋.
                            colums: id(댓글번호), document(댓글내용), label(0:부정, 1:긍정)
        Raise:
            Exception: DataFrame 생성과 데이터셋 다운로드 실패 시 발생.
        """
        try:
            # os.path.exist(경로)
            df = pd.read_csv(self.data_file_path, sep="\t", encoding="utf-8")

        except:

            # 다운로드 및 저장 => df생성
            url = "https://raw.githubusercontent.com/e9t/nsmc/refs/heads/master/ratings.txt" 
            resp = requests.get(url)

            if resp.status_code == 200:
                with open(self.data_file_path, "wt", encoding="utf-8") as f:
                    f.write(resp.text)
                #Dataframe 생성
                df = pd.read_csv(self.data_file_path, sep="\t", encoding="utf-8")
            else:
                # 예외를 발생
                raise Exception(f"데이터파일을 다운받지 못했습니다. 에러코드: {resp.status_code}")
        
        return df 
        


    def tokenize(self, doc: str) ->str:
        
        """
        하나의 댓글을 받아서 전처리(띄어쓰기 교정)한 뒤 토큰화한다.
        토큰화 한 것을 다시 하나의 문자열로 만들어서 반환 

        Args:
            doc (str) - 토큰화할 댓글 (document)

        Returns:
            str - 처리결과. (띄어쓰기 교정, 토큰화)

        """
        # 띄어쓰기 교정
        doc = self.kiwi.space(doc)
        # 토큰 리스트 생성
        token_list=[] # 토큰(원형)들 저장
        try:
            for token in self.kiwi.tokenize(doc): #list[Token]
                token_list.append(token.lemma)
        except:    
            pass
        
        return " ".join(token_list)




    def preprocess(self, df:pd.DataFrame) -> pd.DataFrame:
        """
        전체 Dataset을 전처리(결측치 제거, 중복(document)행 제거)
        개별 데이터 토큰화 작업
        Args:
            df(pd.DataFrame) - 전처리 및 토큰화 대상 데이터셋.
        Return:
            pd.DataFrame - 처리결과
        """
        # 결측치 행 제거
        result_df = df.dropna()
        # 중복 행 제거
        result_df = result_df.drop_duplicates(subset=['document'])
        # document (댓글) 컬럼의 값들을 토큰화 처리
        result_df['document'] = result_df['document'].apply(self.tokenize)

        # document의 글자수가 0인 행들을 제거 (불용어 제거 등 전처리 후 글자수가 0이 될 수 있다.)
        drop_row_index = result_df[result_df['document'].str.len() == 0].index #str Accessor
        result_df = result_df.drop(index=drop_row_index)

        return result_df
```

- 파일이 있으면 읽고, 없으면 내려받아 저장한다 (`try`/`except`)
- 댓글마다 **띄어쓰기 교정 → Kiwi 토큰화 → 원형(lemma)을 공백으로 이어 붙인 문자열**로 바꾼다. 문자열로 만들어 두면 `TfidfVectorizer`의 기본 토큰화(공백 기준)를 그대로 쓸 수 있다

```python
import time

s = time.time()

nsmc = NSMCTokenizer()

print(f"걸린시간: {time.time() - s}초")
```

```text
걸린시간: 2.44254994392395초
```

```python
nsmc.nsmc_df.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>document</th><th>label</th></tr></thead><tbody><tr><th class="idx">0</th><td>8112052</td><td>어리다 ᆯ 때 보다 고 지금 다시 보다 어도 재밌다 어요 ㅋㅋ</td><td>1</td></tr><tr><th class="idx">1</th><td>8132799</td><td>디자인 을 배우다 는 학생 으로 , 외국 디자이너 와 그 들 이 일구다 ᆫ 전통 을 통하다 어 발전 하...</td><td>1</td></tr><tr><th class="idx">2</th><td>4655635</td><td>폴리스 스토리 시리즈 는 1 부터 뉴 까지 버리다 ᆯ께 하나 도 없다 음 .. 최고 .</td><td>1</td></tr><tr><th class="idx">3</th><td>9251303</td><td>와 .. 연기 가 진짜 개 쩔다 구나 .. 지루 하 ᆯ 거 이다 라고 생각 하 었 는 데 몰입 하 어서...</td><td>1</td></tr><tr><th class="idx">4</th><td>10067386</td><td>안개 자욱 하 ᆫ 밤하늘 에 뜨다 어 있다 는 초승달 같다 은 영화 .</td><td>1</td></tr></tbody></table></div></div>

```python
nsmc.tokenize("예쁜 새 집에서 어제 맛있었던 짜장면을 중국집에서 먹었습니다")
```

```text
'예쁘다 ᆫ 새 집 에서 어제 맛있다 었 던 짜장면 을 중국집 에서 먹다 었 습니다'
```

> **보충** `preprocess`에서 `result_df['document'] = ...`가 `dropna()`, `drop_duplicates()`로 걸러 낸 DataFrame에 값을 넣는 거라 pandas 버전에 따라 `SettingWithCopyWarning`이 날 수 있다. 앞에서 `.copy()`를 붙이면 확실하다. 또 `tokenize`의 `except: pass`는 에러를 조용히 삼켜서, 토큰화에 실패한 댓글은 빈 문자열이 되고 마지막 단계에서 지워진다. 무엇이 왜 지워졌는지 알 수 없으니 최소한 개수는 로그로 남기는 편이 좋다.

### 모델링: TF-IDF + 로지스틱 회귀

- 데이터 준비 (X, y)
- 모델 생성
- 학습

```python
# 데이터 준비
## x,y 분리
X = nsmc.nsmc_df['document']
y = nsmc.nsmc_df['label']

X.shape, y.shape
```

```text
((194543,), (194543,))
```

```text
# y의 분포
y.value_counts() # 데이터의 탐색이 필요함
# 균형데이터

# 과거 라벨링 = 수작업 (편향존재)
```

train 64%, validation 16%, test 20%로 나눈다.

```python
## Train/Test/Validation set으로 분리.


from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y)
X_train, X_val, y_train, y_val = train_test_split(
    X_train, y_train, test_size=0.2, stratify=y_train)
X_train.shape, X_test.shape,  X_val.shape
```

```text
((124507,), (38909,), (31127,))
```

TF-IDF 변환기와 로지스틱 회귀를 **Pipeline**으로 묶는다. 머신러닝 시리즈에서 본 Pipeline이 그대로다. 변환기는 `fit`할 때 train으로만 어휘 사전을 만들고, validation·test는 그 사전으로 `transform`만 한다.

```python
# 모델 생성
# 전처리 - TfidVectorizer, 모델: LogisticRegression -> Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report

tfidf = TfidfVectorizer(
        ngram_range=(1,2)
) # 튜닝 => ngram_range, max_df, min_df => greedsearch
model = LogisticRegression()
steps = [
    ("ttfidf", tfidf), ("model", model)
]

pipeline = Pipeline(steps=steps, verbose=True)
```

```python
# 학습
pipeline.fit(X_train, y_train);
```

```text
[Pipeline] ............ (step 1 of 2) Processing ttfidf, total=   2.5s
[Pipeline] ............. (step 2 of 2) Processing model, total=   4.4s
```

```python
# 검증
pred_train = pipeline.predict(X_train)
pred_val = pipeline.predict(X_val)

print(
        accuracy_score(y_train, pred_train),
        accuracy_score(y_val, pred_val)
)
```

```text
0.9099568698948654 0.846821087801587
```

```python
pipeline.score(X_test, y_test)
```

```text
0.8435580456963685
```

```python
print(classification_report(y_val, pred_val))
```

```text
              precision    recall  f1-score   support

           0       0.84      0.85      0.85     15564
           1       0.85      0.84      0.85     15563

    accuracy                           0.85     31127
   macro avg       0.85      0.85      0.85     31127
weighted avg       0.85      0.85      0.85     31127
```

train 정확도 91.0%, validation 84.7%, test 84.4%다. train과 6%p 정도 차이가 나는 약한 과대적합이고, 긍정·부정의 precision과 recall이 0.84~0.85로 고르다. 노트북 결과(validation 85.0%, test 84.7%)와 거의 같다. 분할이 무작위라 소수점 아래는 매번 조금씩 다르다.

### 새 댓글 추론

학습 데이터와 똑같이 토큰화한 뒤 넣어야 한다. 그래서 `nsmc.tokenize`를 재사용한다.

```python
# 새로운 데이터를 추론
def predict(*comment):
    #NSMC를 이용해서 token화
    pre_comment = [nsmc.tokenize(doc) for doc in comment]
    pred = pipeline.predict(pre_comment)
    return pred

comments = (
    "이영화진짜별로다", "시간 때루려고 봤는데 엄청 재밌다", "배우들 연기가 미쳤다",
    "내 소중한 시간 돌려줘", "화이팅", "잼 없는 듯 있는 듯 한데 잼은 있는", "식당 인테리어 좋음",
    "오늘은 가지마", "제발", "유잼", "최고"
)
result = predict(*comments)

import numpy as np
idx_to_class = np.array(['부정', '긍정'])
for c, label in zip(comments, idx_to_class[result]):
    print(f"{label}  {c}")
```

```text
부정  이영화진짜별로다
긍정  시간 때루려고 봤는데 엄청 재밌다
긍정  배우들 연기가 미쳤다
부정  내 소중한 시간 돌려줘
긍정  화이팅
긍정  잼 없는 듯 있는 듯 한데 잼은 있는
긍정  식당 인테리어 좋음
부정  오늘은 가지마
부정  제발
부정  유잼
긍정  최고
```

- "이영화진짜별로다"처럼 붙여 써도 `NSMCTokenizer.tokenize`가 띄어쓰기를 먼저 교정해서 부정으로 맞혔다
- "유잼"(재미있다는 뜻의 신조어)은 **부정**으로 틀렸다. 학습 데이터에 드문 말이라 모델이 판단할 근거가 거의 없다
- "식당 인테리어 좋음"은 영화와 상관없는 글인데 `좋다` 하나로 긍정이 됐다. 모델은 단어 빈도만 볼 뿐 무엇에 대한 말인지는 모른다
- "잼 없는 듯 있는 듯 한데 잼은 있는"은 노트북에서는 부정, 여기서는 긍정이다. 이런 애매한 문장은 학습 데이터가 조금만 달라져도 결과가 흔들린다

### 어떤 단어가 긍정·부정을 가르나

로지스틱 회귀는 Feature마다 가중치(coef)를 하나씩 가진다. TF-IDF의 Feature가 단어(n-gram)이니, 가중치를 보면 어떤 단어가 판단에 얼마나 기여했는지 바로 읽힌다.

```python
vocap = tfidf.get_feature_names_out()
vocap.shape
```

```text
(483051,)
```

1-gram과 2-gram을 합쳐 어휘가 수십만 개다.

```python
v = tfidf.transform(["이 영화 진짜 별로다"])
# v.toarray()
print(v)
```

```text
<Compressed Sparse Row sparse matrix of dtype 'float64'
	with 3 stored elements and shape (1, 483051)>
  Coords	Values
  (0, 309424)	0.24722539919536798
  (0, 313016)	0.8540670633031049
  (0, 415707)	0.4576560426493909
```

수십만 차원 중 0이 아닌 값은 몇 개뿐인 희소 벡터다. 그래서 `toarray()`로 펼치지 않고 희소 행렬 그대로 다룬다.

```python
import numpy as np
import pandas as pd

# 1. 파이프라인 내부의 ttfidf 스텝에서 단어 사전(Vocabulary) 추출
vocap = pipeline.named_steps['ttfidf'].get_feature_names_out()

# 2. 파이프라인 내부의 model 스텝에서 로지스틱 회귀의 가중치(Coefficients) 추출
# 로지스틱 회귀는 가중치(가중 벡터)가 곧 단어의 영향력(중요도)입니다.
coefficients = pipeline.named_steps['model'].coef_[0]

# 3. 단어와 가중치를 매칭하여 데이터프레임 생성
coef_df = pd.DataFrame({
    'word': vocap,
    'coefficient': coefficients
})

# 4. 긍정/부정 별 핵심 단어 TOP 20 뽑기
# 가중치가 클수록(양수) 긍정(1)에 기여, 작을수록(음수) 부정(0)에 기여합니다.
top_positive = coef_df.sort_values(by='coefficient', ascending=False).head(15)
top_negative = coef_df.sort_values(by='coefficient', ascending=True).head(15)

pd.concat([top_positive.reset_index(drop=True).add_prefix("긍정_"),
           top_negative.reset_index(drop=True).add_prefix("부정_")], axis=1).round(2)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 15행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>긍정_word</th><th>긍정_coefficient</th><th>부정_word</th><th>부정_coefficient</th></tr></thead><tbody><tr><th class="idx">0</th><td>최고</td><td>11.81</td><td>최악</td><td>-10.65</td></tr><tr><th class="idx">1</th><td>재밌다</td><td>8.52</td><td>아깝다</td><td>-10.55</td></tr><tr><th class="idx">2</th><td>명작</td><td>6.91</td><td>재미없다</td><td>-10.3</td></tr><tr><th class="idx">3</th><td>재미있다</td><td>6.81</td><td>쓰레기</td><td>-9.25</td></tr><tr><th class="idx">4</th><td>감동</td><td>6.8</td><td>지루</td><td>-8.16</td></tr><tr><th class="idx">5</th><td>지루 않다</td><td>6.42</td><td>별로</td><td>-7.12</td></tr><tr><th class="idx">6</th><td>여운</td><td>6.19</td><td>졸작</td><td>-6.51</td></tr><tr><th class="idx">7</th><td>사랑</td><td>6.18</td><td>차라리</td><td>-6.5</td></tr><tr><th class="idx">8</th><td>아깝다 않다</td><td>5.97</td><td>짜증</td><td>-6.34</td></tr><tr><th class="idx">9</th><td>수작</td><td>5.91</td><td>실망</td><td>-6.1</td></tr><tr><th class="idx">10</th><td>너무 좋다</td><td>5.69</td><td>재미 없다</td><td>-6.06</td></tr><tr><th class="idx">11</th><td>아름답다</td><td>5.48</td><td>없다</td><td>-5.71</td></tr><tr><th class="idx">12</th><td>좋다</td><td>5.44</td><td>유치</td><td>-5.7</td></tr><tr><th class="idx">13</th><td>눈물</td><td>5.08</td><td>허접</td><td>-5.59</td></tr><tr><th class="idx">14</th><td>가슴</td><td>5.06</td><td>ㅡㅡ</td><td>-5.58</td></tr></tbody></table></div></div>

- 긍정 쪽은 `최고`, `재밌다`, `명작`, `감동`, 부정 쪽은 `최악`, `아깝다`, `재미없다`, `쓰레기`처럼 사람이 봐도 납득되는 단어가 나왔다
- **2-gram이 부정을 뒤집는다**: `지루`는 부정(-8.16)인데 `지루 않다`는 긍정(+6.42), `아깝다`는 부정(-10.55)인데 `아깝다 않다`는 긍정(+5.97)이다. `ngram_range=(1, 2)`가 없었다면 "지루하지 않다"는 `지루` 때문에 부정 쪽으로 기울었을 것이다
- 부정 15위에 이모티콘 `ㅡㅡ`가 있다. 전처리에서 특수문자나 자모를 지웠다면 사라졌을 신호다. 첫 글에서 "전처리는 문제에 맞게"라고 한 이유다

> **보충** 노트북에서는 TOP 20을 `print(...to_string())`으로 긍정·부정 차례로 출력했다. 여기서는 15개씩 옆으로 붙여서 비교하기 쉽게 바꿨다.

## Count vs TF-IDF, 언제 무엇을

| 상황 | 추천 |
|---|---|
| 문서가 짧고 적다, 단어 개수 자체가 의미 있다 | `CountVectorizer` |
| 문서가 길고 많다, 흔한 단어가 판단을 흐린다 | `TfidfVectorizer` |
| 단어 순서(부정 표현 "재미 없다" 등)가 중요하다 | `ngram_range=(1, 2)` 이상 |
| 어휘가 너무 커서 메모리가 부족하다 | `min_df`로 드문 단어, `max_df`로 너무 흔한 단어를 자르고 `max_features`로 상한 |
| 단어의 **의미적 유사성**(최고 ≈ 명작)까지 담고 싶다 | 빈도 기반으로는 안 된다 → 다음 글의 Word Embedding |

## 정리

- Text Vectorization은 텍스트를 숫자 벡터로 바꾸는 과정이다. 빈도 기반 → 고정 임베딩 → 문맥 임베딩 순으로 발전했다
- **BoW(DTM)**는 문서별 단어 개수를 센다. 순서는 무시하고, n-gram으로 일부 되살린다. 결과는 대부분 0인 희소 행렬이다
- **TF-IDF**는 그 문서에 자주 나오면서 다른 문서에는 드문 단어에 높은 값을 준다. "ᆸ니다" 같은 공통어의 영향이 줄어든다
- 벡터화기는 **train으로만 fit**하고 나머지는 transform만 한다. Pipeline으로 묶으면 자동으로 지켜진다
- NSMC에서 Kiwi 토큰화 + TF-IDF(1~2-gram) + 로지스틱 회귀만으로 정확도 약 85%가 나온다. 로지스틱 회귀의 가중치로 어떤 단어가 긍정·부정을 가르는지 바로 해석할 수 있다
