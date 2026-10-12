---
title: "Hugging Face Pipeline: 태스크별 모델 바로 쓰기"
description: "Transformers의 pipeline 함수로 전처리·추론·후처리를 한 번에 처리하는 방법을 정리하고, 텍스트 분류, 제로샷 분류, 텍스트 생성, 마스크 채우기, 개체명 인식을 실습한 뒤 Qwen2.5-0.5B-Instruct로 질의응답·요약·번역까지 해 봅니다."
category: 'Tech'
subcategory: 'NLP'
series: 'Hugging Face'
seriesOrder: 2
originalNotebook: "02_HuggingFace_pipeline_withcode.ipynb"
tags: ["NLP","Hugging Face"]
date: 2026-06-20T12:00:00+09:00
thumbnail: '../../../assets/images/notes/hf/hf-pipeline.webp'
---

> SKN31 Hugging Face 과정 노트북 `02_HuggingFace_pipeline_withcode.ipynb`를 바탕으로 정리했습니다.
> 출력은 노트북을 Apple Silicon Mac(Python 3.9, MPS)에서 처음부터 다시 실행한 결과입니다. 텍스트 생성 결과는 실행할 때마다 달라집니다. 경고 메시지는 생략했습니다.

## 이 글에서 다루는 것

- Pipeline: 전처리 → 추론 → 후처리를 묶은 객체
- `pipeline` 함수의 주요 파라미터와 모델 ID
- 텍스트 분류: 기본 모델, 다국어 모델, 한국어 모델 비교
- 제로샷 분류
- 텍스트 생성(GPT-2)과 Chat 모델의 차이
- 마스크 채우기, 개체명 인식(Token Classification)
- 작은 LLM(Qwen2.5-0.5B-Instruct)으로 질의응답·요약·번역

지난 글에서 사전학습 모델을 그대로 쓰는 방식을 **제로샷**이라고 했다. 이번 글은 그 제로샷을 코드 몇 줄로 해 보는 실습이다.

## HuggingFace transformers의 Pipeline

- Pipeline은 Transformers 라이브러리의 가장 기본적인 객체로, **전처리 → 추론 → 후처리**로 이어지는 일련의 과정을 자동화해서 모델을 손쉽게 사용할 수 있게 해 준다
- Task에 따라 다양한 Pipeline 클래스를 제공하며 `pipeline` 함수로 쉽게 생성한다
- **task만 지정**해서 그 task의 기본 모델과 토크나이저를 쓰거나, **사용할 모델과 토크나이저를 직접 지정**해서 생성할 수 있다
  - 토크나이저는 사용할 모델과 같은 ID로 로드해서, **그 모델이 학습할 때 사용한 토크나이저**를 불러온다
- [Pipeline tutorial](https://huggingface.co/docs/transformers/pipeline_tutorial)

![Pipeline의 전처리, 추론, 후처리](/images/hf/fig-huggingface-pipeline.png)

```python
# hugging face를 이용해 제로샷 전이학습

# 파이토치로 구현된 모델, 텐서플로로 구현된 모델, 대부분은 파이토치로 구현되어있음

# pytorch

# transformers => pipline 제공 (전처리->모델(추론)->후처리)

# Tokenizer => model => Post Processing
```

NLP 시리즈에서 직접 했던 일을 떠올리면 Pipeline이 무엇을 대신하는지 보인다. 토크나이저로 문장을 id로 바꾸고(전처리), 모델에 넣어 logit을 얻고(추론), softmax를 씌워 라벨과 확률로 바꾸는(후처리) 세 단계를 `pipe("문장")` 한 줄이 처리한다.

## 지원하는 주요 태스크

[전체 task 목록](https://huggingface.co/docs/transformers/main_classes/pipelines#transformers.pipeline.task)

| 분야 | task | 하는 일 |
|---|---|---|
| 자연어 | `text-classification` | 텍스트 분류 (감성 분석 등) |
| 자연어 | `zero-shot-classification` | 학습하지 않은 라벨로 분류 |
| 자연어 | `text-generation` | 텍스트 생성 |
| 자연어 | `translation` | 번역 |
| 자연어 | `fill-mask` | 마스크 토큰 채우기 |
| 자연어 | `token-classification` | 개체명 인식, 품사 태깅처럼 개별 토큰을 분류 |
| 자연어 | `feature-extraction` | 특징 추출 (context vector) |
| 영상 | `image-classification` | 이미지 분류 |
| 영상 | `object-detection` | 이미지 안 객체들의 위치와 class를 찾는다 |
| 영상 | `image-segmentation` | 픽셀 단위로 어떤 객체에 속하는지 분류한다 |

수업 자료에서 `summarization`(요약)과 `question-answering`(질의응답)은 지워져 있었다. 이 글의 후반부에서는 두 작업을 전용 pipeline 대신 **텍스트 생성 모델에 지시문을 주는 방식**으로 실습한다.

## 모델 검색

Hub의 Models 탭에서 왼쪽 Tasks 필터로 원하는 task를 고르고, 언어(Languages)나 다운로드 수로 좁혀서 모델을 찾는다.

![Hugging Face 모델 검색](/images/hf/fig-huggingface-model-search.png)

## pipeline 함수

| 파라미터 | 내용 |
|---|---|
| **task** | 수행하려는 작업 유형을 문자열로 지정한다 |
| **model** | 사용할 사전학습 모델의 이름(ID) 또는 경로. ID는 `[모델소유자이름]/[모델이름]` 형식이다 (예: `google/gemma-2-2b`). 생략하면 **task의 기본 모델**을 로드한다 |
| **tokenizer** | 사용할 토크나이저. 생략하면 모델과 같은 이름의 토크나이저를 쓴다 |
| **framework** | `'pt'`(PyTorch, 기본값) 또는 `'tf'`(TensorFlow) |
| **device** | 실행 디바이스. `"cpu"`, `"cuda:1"`, `"mps"` 같은 문자열이나 GPU 번호(정수) |
| **revision** | 모델의 특정 버전을 지정한다 |
| **trust_remote_code** | 모델 대신 모델을 만드는 **코드**를 내려받아 로컬에서 실행하는 경우, 그 코드 실행을 허용할지 여부 (bool) |
| **use_fast** | Rust로 구현된 빠른 토크나이저를 쓸지 여부. 기본값 True. 지원하지 않는 모델은 True여도 일반 토크나이저를 쓴다 |

```python
# 사용자 계정 \ 모델이름

# tokenizer는 model이쓴 토큰화를 해야 함.

# 보통 tokenizer의 이름이 모델이랑 유사
```

## Task별 pipeline 실습

### 텍스트 분류

```python
from transformers import pipeline
```

모델을 지정하지 않고 task만 넘기면 기본 모델을 내려받는다.

```python
# 처음 사용시 모델/토크 나이저 다운로드: c:\User\<사용자계정>\.cache\huggingface\hub

pipe = pipeline(task="text-classification")
```

```text
No model was supplied, defaulted to distilbert/distilbert-base-uncased-finetuned-sst-2-english and revision 714eb0f (https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english).
Using a pipeline without specifying a model name and revision in production is not recommended.
Device set to use mps:0
```

기본 모델은 영어 영화 리뷰(SST-2)로 파인튜닝한 DistilBERT다. 로그에 "운영 환경에서는 모델 이름과 revision을 지정하라"는 권고가 함께 나온다. 기본 모델은 transformers 버전에 따라 바뀔 수 있기 때문이다.

```python
result = pipe("I am hapyy")
pipe # 긍부정 추론
```

```text
<transformers.pipelines.text_classification.TextClassificationPipeline at 0x114f11a90>
```

```python
result
```

```text
[{'label': 'NEGATIVE', 'score': 0.9345360994338989}]
```

"happy"를 "hapyy"로 잘못 친 문장인데 **NEGATIVE 0.93**이 나왔다. 모델은 "hapyy"를 학습 때 본 적 없는 조각들로 쪼개서 읽기 때문에, 오타가 섞인 입력의 결과는 그대로 믿기 어렵다.

한국어 문장을 넣어 보면:

```python
kor_text =["이 영화가 재밌었어요!",
           "서비스가 우수합니다",
           "제품 품질이 우수합니다.",
           "이건 별로에요",
           "사지마세요"]

result2 = pipe(kor_text)
result2
```

```text
[{'label': 'POSITIVE', 'score': 0.9916683435440063},
 {'label': 'POSITIVE', 'score': 0.662697434425354},
 {'label': 'POSITIVE', 'score': 0.6555735468864441},
 {'label': 'POSITIVE', 'score': 0.9307549595832825},
 {'label': 'POSITIVE', 'score': 0.8969434499740601}]
```

"이건 별로에요", "사지마세요"까지 전부 POSITIVE다. 영어로만 학습한 모델이라 한국어는 대부분 모르는 토큰으로 쪼개지고, 결과는 의미가 없다. 리스트를 넘기면 문장별 결과가 리스트로 나온다는 점만 확인하면 된다.

다국어 감성 분석 모델로 바꾼다. `model`과 `tokenizer`에 같은 ID를 넘긴다.

```python
model = "tabularisai/multilingual-sentiment-analysis"
pipe = pipeline(task = 'text-classification', model=model,tokenizer=model )

result_list = pipe(kor_text)
result_list
```

```text
[{'label': 'Very Positive', 'score': 0.43120646476745605},
 {'label': 'Very Positive', 'score': 0.5743268132209778},
 {'label': 'Positive', 'score': 0.6111968755722046},
 {'label': 'Neutral', 'score': 0.5505725145339966},
 {'label': 'Positive', 'score': 0.34087252616882324}]
```

라벨이 5단계(Very Negative ~ Very Positive)다. "이건 별로에요"는 Neutral, "사지마세요"는 여전히 Positive(0.34)로, 짧은 구어체 부정은 잘 못 잡는다.

#### 변수를 덮어쓰면 생기는 에러

수업 중에 제로샷 분류를 먼저 시험해 보느라 `pipe`가 zero-shot pipeline으로 바뀐 상태에서 영어 문장 분류를 실행했다. 아래 셀은 에러가 나는 것이 정상이다.

```python
data = [ 
    "The project was completed successfully.", 
    "She always brings positive energy to the team.", 
    "I am confident that we will achieve our goals.",
    "The results were not as expected.", 
    "He struggled to meet the deadline.", 
    "The client was dissatisfied with the final product." 
] # 하나의 문서단위
result_list = pipe(data)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: object of type &#x27;NoneType&#x27; has no len()</div></div>

zero-shot pipeline은 `candidate_labels`가 필수인데 없어서 생긴 에러다. 메시지만 보면 원인을 알기 어렵다. 노트북에서 pipeline을 여러 개 만들 때는 `pipe` 하나를 계속 덮어쓰지 말고 `clf_pipe`, `zs_pipe`처럼 이름을 나누는 편이 안전하다. 분류 pipeline을 다시 만들어서 실행한다.

```python
# 특정 모델을 지정해서 사용.
model="distilbert-base-uncased-finetuned-sst-2-english" 

pipe = pipeline(
    task="text-classification", 
    model=model,
    tokenizer=model 
)
pipe(data)
```

```text
[{'label': 'POSITIVE', 'score': 0.9781671762466431},
 {'label': 'POSITIVE', 'score': 0.9998812675476074},
 {'label': 'POSITIVE', 'score': 0.9998470544815063},
 {'label': 'NEGATIVE', 'score': 0.9978100657463074},
 {'label': 'NEGATIVE', 'score': 0.99960857629776},
 {'label': 'NEGATIVE', 'score': 0.9996129870414734}]
```

영어 문장에서는 기본 모델이 6개 모두 맞고 확률도 0.97 이상이다. 원래 하던 일(영어 감성 분석)에서는 제로샷으로 충분하다.

#### 한국어: 모델 3개 비교

```python
kor_texts = [
    "이 영화 정말 재미있어요!",
    "서비스가 별로였어요.",
    "제품 품질이 우수합니다.",
    "따듯하고 부드럽고 제품은 너무 좋습니다. 그런데 배송이 너무 늦네요."  # 애매한 것 0.56 정도 나오네.
]
pipe(kor_texts)
```

```text
[{'label': 'POSITIVE', 'score': 0.9855567812919617},
 {'label': 'POSITIVE', 'score': 0.7425788044929504},
 {'label': 'POSITIVE', 'score': 0.6555735468864441},
 {'label': 'NEGATIVE', 'score': 0.5247909426689148}]
```

한국어 리뷰로 파인튜닝한 KoELECTRA 모델:

```python
model = 'Copycats/koelectra-base-v3-generalized-sentiment-analysis' 
pipe = pipeline(task="text-classification", model=model)
result_list = pipe(kor_texts)
result_list  # 1: 긍정, 0: 부정
```

```text
[{'label': '1', 'score': 0.9897311329841614},
 {'label': '0', 'score': 0.9969298243522644},
 {'label': '1', 'score': 0.9640170335769653},
 {'label': '0', 'score': 0.566911518573761}]
```

```python
pipe("오늘은 날씨가 너무 좋다.")
```

```text
[{'label': '1', 'score': 0.9671919941902161}]
```

라벨이 `'1'`, `'0'`이다. 라벨 이름은 모델을 만든 사람이 정하기 때문에 **모델 카드에서 라벨 뜻을 확인**해야 한다.

다국어 모델로 같은 문장을 넣는다.

```python
from transformers import pipeline

pipe = pipeline("text-classification", model="tabularisai/multilingual-sentiment-analysis") 

pipe("오늘은 날씨가 너무 좋다.")
pipe("날씨 괜찮네.")
pipe("오늘은 된장찌게를 먹습니다.")
pipe("이건 시간낭비야.")
```

```text
[{'label': 'Negative', 'score': 0.45448511838912964}]
```

네 줄을 실행했지만 결과는 하나만 나왔다. 노트북은 **셀의 마지막 표현식만** 출력하기 때문이다. 네 결과를 다 보려면 리스트로 한 번에 넘기거나 `print`로 감싸야 한다.

```python
pipe(kor_texts)
```

```text
[{'label': 'Positive', 'score': 0.7790911793708801},
 {'label': 'Negative', 'score': 0.8723201155662537},
 {'label': 'Positive', 'score': 0.6111968755722046},
 {'label': 'Positive', 'score': 0.4461553692817688}]
```

```python
result_list = pipe(data)
for txt, r in zip(data, result_list):
    print(txt, r)
```

```text
The project was completed successfully. {'label': 'Positive', 'score': 0.4006476402282715}
She always brings positive energy to the team. {'label': 'Positive', 'score': 0.925020158290863}
I am confident that we will achieve our goals. {'label': 'Positive', 'score': 0.3716866672039032}
The results were not as expected. {'label': 'Negative', 'score': 0.8994976282119751}
He struggled to meet the deadline. {'label': 'Negative', 'score': 0.8097541332244873}
The client was dissatisfied with the final product. {'label': 'Negative', 'score': 0.8984758257865906}
```

한국어 네 문장을 세 모델에 넣은 결과를 모으면:

| 문장 | DistilBERT (영어) | KoELECTRA (한국어) | multilingual |
|---|---|---|---|
| 이 영화 정말 재미있어요! | POSITIVE 0.99 | 긍정(1) 0.99 | Positive 0.78 |
| 서비스가 별로였어요. | **POSITIVE 0.74** ✗ | 부정(0) 1.00 | Negative 0.87 |
| 제품 품질이 우수합니다. | POSITIVE 0.66 | 긍정(1) 0.96 | Positive 0.61 |
| 따듯하고 부드럽고 … 배송이 너무 늦네요. | NEGATIVE 0.52 | 부정(0) 0.57 | Positive 0.45 |

- 영어 모델은 "별로였어요"를 긍정으로 틀렸다
- KoELECTRA는 명확한 문장을 확률 0.96 이상으로 맞혔다
- 장점과 단점이 섞인 마지막 문장은 세 모델 모두 확률이 0.5 근처다. 코드 주석의 0.56은 KoELECTRA 결과이고, 이번 실행에서는 0.57이 나왔다

### 제로샷 분류

- 제로샷(Zero-shot)은 개별 작업에 대한 학습 없이 작업을 수행하는 task다
- 입력 텍스트와 함께 **후보 라벨**을 주면 그중에서 고른다
- 모델은 Hub에서 task가 `Zero-Shot`으로 시작하는 것을 검색한다

```python
model = "facebook/bart-large-mnli"

text = ["Python is a programming language.", 
        "I love soccer", 
        "The stock price rose slightly today."]

labels = ["IT", "Sports"]

pipe = pipeline(task="zero-shot-classification", model=model)
result = pipe(text, candidate_labels=labels)
result
```

```text
[{'sequence': 'Python is a programming language.',
  'labels': ['IT', 'Sports'],
  'scores': [0.5758516788482666, 0.4241482615470886]},
 {'sequence': 'I love soccer',
  'labels': ['Sports', 'IT'],
  'scores': [0.9935312867164612, 0.006468657404184341]},
 {'sequence': 'The stock price rose slightly today.',
  'labels': ['IT', 'Sports'],
  'scores': [0.6849504113197327, 0.31504952907562256]}]
```

결과는 확률이 높은 라벨부터 정렬되고, 점수의 합은 1이다. 주식 문장은 맞는 후보가 없어서 둘 중 덜 어색한 IT(0.68)를 골랐다. 후보를 늘리면:

```python
labels = ["business", "programming", "sports", "movie", "education"]
result = pipe(text, candidate_labels=labels)
result
```

```text
[{'sequence': 'Python is a programming language.',
  'labels': ['programming', 'business', 'movie', 'sports', 'education'],
  'scores': [0.9856367707252502,
   0.005072678439319134,
   0.003402337897568941,
   0.002961931750178337,
   0.002926223212853074]},
 {'sequence': 'I love soccer',
  'labels': ['sports', 'programming', 'business', 'movie', 'education'],
  'scores': [0.9952405691146851,
   0.0012840889394283295,
   0.0012676455080509186,
   0.0012649561977013946,
   0.0009426980977877975]},
 {'sequence': 'The stock price rose slightly today.',
  'labels': ['business', 'movie', 'programming', 'sports', 'education'],
  'scores': [0.7462776303291321,
   0.06974838674068451,
   0.0688929557800293,
   0.06450794637203217,
   0.050573110580444336]}]
```

주식 문장이 business(0.75)로 옮겨 갔고, Python 문장도 "IT"(0.58)보다 "programming"(0.99)에서 훨씬 확신이 높다. 제로샷 분류는 **라벨을 어떻게 쓰느냐**가 성능을 좌우한다.

> **보충** `bart-large-mnli`는 문장 쌍의 관계(함의·모순·중립)를 판단하는 NLI 데이터로 학습한 모델이다. zero-shot pipeline은 후보 라벨마다 "This example is {label}." 같은 가설 문장을 만들고, 입력 문장이 그 가설을 **함의**하는 확률을 비교한다. 그래서 학습한 적 없는 라벨로도 분류할 수 있다. 실행 중 나온 dataloader 경고(3개라고 했는데 4, 5, 6개를 가져왔다)도 문장 하나가 라벨 수만큼의 문장 쌍으로 늘어나기 때문에 생긴다.

### 텍스트 생성

```python
pipe = pipeline(task="text-generation")
```

```text
No model was supplied, defaulted to openai-community/gpt2 and revision 607a30d (https://huggingface.co/openai-community/gpt2).
Using a pipeline without specifying a model name and revision in production is not recommended.
Device set to use mps:0
```

기본 모델은 2019년 GPT-2(124M)다. 앞부분을 주면 뒤를 이어 쓴다.

```python
start_text = "Today weather"
sent = pipe(start_text)
print(sent[0]["generated_text"])
```

```text
Today weather conditions are expected to be good for the first time in a decade.

The latest U.S. snowfall totals are out in full force, with the longest running on record for a major winter, in the late 1940s. Many of the snowfall totals will be in the top 10 in the year ahead, says Jim Clark, a meteorologist at the University of California, Berkeley.

The snowfall totals are also expected to continue to increase as snow melts in the coming months.

"The snowfall totals are higher for the first time since the 1930s, when we saw the snowfall totals increase from about 3 inches to 8 inches," Clark says.

The U.S. National Weather Service predicts that temperatures in the Northern Hemisphere will stay below freezing over the next two weeks, with the highest temperatures expected on Friday (May 11).

In New York City, record snow totals will be displayed Wednesday night on the Upper West Side.

Here are the snow totals for the week ending May 15:

Syracuse, NY

Snow totals: 5.5 inches, 5.5 inches, 5.5 inches, 5.5 inches, 5.5 inches, 5.5 inches, 5 inches
```

문법은 자연스럽지만 내용은 지어낸 것이다(가상의 기상학자, 5월의 폭설). 결과는 `[{'generated_text': ...}]` 형태라서 `sent[0]["generated_text"]`로 꺼낸다.

```python
pipe([
    "I am", 
    "Python is", 
    "LLM is"
    ]
)
```

```text
[[{'generated_text': 'I am a man of principle."\n\n"So you can\'t be a man of principle."\n\n"You can\'t be a man of principle."\n\n"You can\'t be a man of principle." … (같은 문장 반복, 이하 생략)'}],
 [{'generated_text': 'Python is a free and open source project that makes it easy and efficient to write and distribute your own code. It is an ideal platform for development, … (이하 생략)'}],
 [{'generated_text': "LLM is our first ever 'coding' project to get you the core library you need to create your own C-style C-style C-style C-style C-style … (이하 생략)"}]]
```

작은 모델은 같은 문장을 **반복**하는 경향이 강하다("a man of principle", "C-style"). 한국어는 더 심하다.

```python
pipe("나는 어제 학교에서")
```

```text
[{'generated_text': '나는 어제 학교에서 었사영 이입니다.\n\nI am so happy that I have learned so much. I am so thankful for all the gifts that I received from other people. … (이하 생략)'}]
```

GPT-2는 영어 웹 문서로 학습해서 한국어는 의미 없는 음절을 만들고 곧 영어로 넘어간다.

#### Chat 형식은 Chat 모델에

요즘 LLM처럼 `role`/`content` 메시지를 넣어 본다. 아래 셀은 에러가 나는 것이 정상이다.

```python
msg = [
    {"role":"user", "content":"LLM에 대해서 한국어로 설명해줘."}
]
result = pipe(msg, max_new_tokens=500)
#  max_new_tokens : 응답 토큰수 설정.
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: Cannot use chat template functions because tokenizer.chat_template is not set and no template argument was passed!</div></div>

메시지 리스트를 모델 입력 문자열로 바꾸는 규칙이 **chat template**인데, GPT-2 토크나이저에는 이것이 없다. GPT-2는 대화용으로 학습한 모델이 아니기 때문이다. 메시지 형식을 쓰려면 이름에 `Instruct`나 `Chat`이 붙은, 지시 따르기로 파인튜닝한 모델을 써야 한다. 아래 질의응답부터 그런 모델을 쓴다.

### 마스크 채우기

`<mask>` 자리에 들어갈 토큰을 예측한다. BERT 계열 모델이 사전학습에서 하는 일 그대로다.

```python
text = "I'm going to <mask> because <mask> am hurt."
model="FacebookAI/xlm-roberta-base"

pipe = pipeline(task="fill-mask", model=model)
result = pipe(text, top_k=2)
result
```

```text
[[{'score': 0.4161933362483978,
   'token': 91190,
   'token_str': 'cry',
   'sequence': "<s> I'm going to cry because<mask> am hurt.</s>"},
  {'score': 0.17671000957489014,
   'token': 68,
   'token_str': 'die',
   'sequence': "<s> I'm going to die because<mask> am hurt.</s>"}],
 [{'score': 0.9929104447364807,
   'token': 87,
   'token_str': 'I',
   'sequence': "<s> I'm going to<mask> because I am hurt.</s>"},
  {'score': 0.006063331384211779,
   'token': 17,
   'token_str': 'i',
   'sequence': "<s> I'm going to<mask> because i am hurt.</s>"}]]
```

마스크가 두 개면 마스크별로 `top_k`개 후보가 나온다. 각 후보는 나머지 마스크를 그대로 둔 채 하나씩 채운 결과다. XLM-RoBERTa는 100개 언어로 학습한 모델이라 한국어도 된다.

```python
text = "오늘 밤은 전국이 흐린 가운데 대부분 지역에 <mask>가 내리겠고, 기온이 내려가면서 점차 <mask>이 오는 곳이 많겠습니다"

pipe = pipeline(task='fill-mask', model=model, top_k=2)
pipe(text)
```

```text
[[{'score': 0.8498729467391968,
   'token': 7091,
   'token_str': '비',
   'sequence': '<s> 오늘 밤은 전국이 흐린 가운데 대부분 지역에 비 가 내리겠고, 기온이 내려가면서 점차<mask> 이 오는 곳이 많겠습니다</s>'},
  {'score': 0.10534835606813431,
   'token': 34565,
   'token_str': '눈',
   'sequence': '<s> 오늘 밤은 전국이 흐린 가운데 대부분 지역에 눈 가 내리겠고, 기온이 내려가면서 점차<mask> 이 오는 곳이 많겠습니다</s>'}],
 [{'score': 0.6368820667266846,
   'token': 34565,
   'token_str': '눈',
   'sequence': '<s> 오늘 밤은 전국이 흐린 가운데 대부분 지역에<mask> 가 내리겠고, 기온이 내려가면서 점차 눈 이 오는 곳이 많겠습니다</s>'},
  {'score': 0.14748413860797882,
   'token': 208400,
   'token_str': '구름',
   'sequence': '<s> 오늘 밤은 전국이 흐린 가운데 대부분 지역에<mask> 가 내리겠고, 기온이 내려가면서 점차 구름 이 오는 곳이 많겠습니다</s>'}]]
```

"비가 내리겠고 → 기온이 내려가면서 → 눈"이라는 문맥을 따라 첫 마스크는 **비**(0.85), 두 번째는 **눈**(0.64)을 골랐다. `top_k`는 이렇게 pipeline을 만들 때 넘겨도 되고, 호출할 때 넘겨도 된다.

### Token별 분류

- task: `token-classification`
  - 개체명 인식(NER), 품사 부착(POS tagging)을 수행한다
  - 개체명 인식은 문장에서 사람 이름, 지명, 조직명 같은 개체명을 식별하는 task다

```python
text = "My name is Sylvain and I work at Hugging Face in Brooklyn."
model = "dbmdz/bert-large-cased-finetuned-conll03-english"

pipe = pipeline(task='token-classification', model=model)
result = pipe(text)
result
```

```text
[{'entity': 'I-PER',
  'score': np.float32(0.99938285),
  'index': 4,
  'word': 'S',
  'start': 11,
  'end': 12},
 {'entity': 'I-PER',
  'score': np.float32(0.99815494),
  'index': 5,
  'word': '##yl',
  'start': 12,
  'end': 14},
 {'entity': 'I-PER',
  'score': np.float32(0.9959072),
  'index': 6,
  'word': '##va',
  'start': 14,
  'end': 16},
 {'entity': 'I-PER',
  'score': np.float32(0.99923277),
  'index': 7,
  'word': '##in',
  'start': 16,
  'end': 18},
 {'entity': 'I-ORG',
  'score': np.float32(0.9738931),
  'index': 12,
  'word': 'Hu',
  'start': 33,
  'end': 35},
 {'entity': 'I-ORG',
  'score': np.float32(0.976115),
  'index': 13,
  'word': '##gging',
  'start': 35,
  'end': 40},
 {'entity': 'I-ORG',
  'score': np.float32(0.9887976),
  'index': 14,
  'word': 'Face',
  'start': 41,
  'end': 45},
 {'entity': 'I-LOC',
  'score': np.float32(0.9932106),
  'index': 16,
  'word': 'Brooklyn',
  'start': 49,
  'end': 57}]
```

| 라벨 | 뜻 | 찾은 개체 |
|---|---|---|
| PER | 사람 | Sylvain |
| ORG | 조직 | Hugging Face |
| LOC | 장소 | Brooklyn |

결과가 **WordPiece 토큰 단위**라서 "Sylvain"이 `S`, `##yl`, `##va`, `##in` 네 개로 나왔다. `##`은 앞 토큰에 이어 붙는 조각이라는 표시다(서브워드 토큰화 글의 WordPiece와 같다). `start`, `end`는 원문 문자열에서의 위치라서 `text[11:18]`로 원래 단어를 꺼낼 수 있다.

> **보충** `pipeline(..., aggregation_strategy="simple")`을 주면 같은 개체에 속한 조각을 합쳐 `{'entity_group': 'PER', 'word': 'Sylvain', ...}`처럼 단어 단위로 돌려준다. 수업 노트북에서는 실행하지 않은 옵션이라 출력은 싣지 않았다.

### 질의 응답

- 문서와 질문을 주면 문서에서 답을 찾아 응답한다
- 여기서는 질의응답 전용 모델 대신, 지시를 따르도록 학습한 작은 LLM **Qwen2.5-0.5B-Instruct**(파라미터 약 5억 개)를 `text-generation` pipeline으로 쓴다

```python
model = "Qwen/Qwen2.5-0.5B-Instruct"
pipe = pipeline(
    task="text-generation",
    model=model,
    device_map="auto"
)
```

`device_map="auto"`는 사용 가능한 장치(GPU, MPS, CPU)에 모델을 알아서 배치하는 옵션이다. 이번 실행에서는 MPS(Mac GPU)에 올라갔다.

```python
question="Where do I work?"
# question="Where is Hugging Face?"
# question="What is a name?"
context="My name is Sylvain and I work at Hugging Face in Brooklyn"

message = [
     {
        "role": "user",
        "content": f"""다음 문서를 참고해서 질문에 답해줘.

문서:
{context}

질문:
{question}
"""
    }
]

result = pipe(message, max_new_tokens=50)
result
```

```text
[{'generated_text': [{'role': 'user',
    'content': '다음 문서를 참고해서 질문에 답해줘.\n\n문서:\nMy name is Sylvain and I work at Hugging Face in Brooklyn\n\n질문:\nWhere do I work?\n'},
   {'role': 'assistant',
    'content': 'Based on the information provided in the text, you can assume that Sylvain works at Hugging Face in Brooklyn. If you need more specific details or additional context about where Sylvain works, please let me know!'}]}]
```

메시지를 넣으면 결과의 `generated_text`도 **메시지 리스트**로 돌아온다. 입력한 user 메시지 뒤에 assistant 메시지가 붙은 형태라서, 답만 꺼내려면 `result[0]["generated_text"][-1]["content"]`를 쓴다. 앞의 GPT-2에서 `generated_text`가 문자열이었던 것과 다르다. 한국어로 물었지만 질문이 영어라 답도 영어로 나왔다.

한국어 기사로 질문 세 개를 한 번에 해 본다.

```python
context = """우리나라 2대 수출 품목인 자동차가 도널드 트럼프 미국 행정부의 관세 여파로 지난달 큰 폭의 수출 감소율을 보이면서 우려가 커지고 있다. 현대차, 기아의 미국 수출 비중이 최대 85%에 이르는 상황에서 자동차 관세 장기화 시 피해는 걷잡을 수 없이 불어날 것이라는 암울한 전망이 나온다.
1일 산업통상자원부가 발표한 5월 수출입 동향에 따르면 지난달 자동차 수출은 작년 동기 대비 4.4% 감소한 62억달러로 집계됐다. 최대 자동차 시장인 미국으로의 수출은 18억4000만달러로 무려 32.0% 급감했다.
4월 미국의 수입산 자동차 25% 관세 부과에 이어 5월부터 일부 자동차 부품에도 25%의 관세가 적용된 결과다. 관세 장기화 시 피해는 더 커질 것이라는 우려가 현실화한 셈이다.
국내 완성차 1·2위 업체인 현대차·기아는 현지 생산 비중을 확대하는 동시에 가격 인상을 검토하고 있다. 관세 여파를 흡수하기 위해서다. 가격 인상이 현실화할 경우 미국 현지 판매는 줄어들 수밖에 없어 수출에는 더 악영향을 미칠 것으로 보인다.
"""

question1 = "현대차 기아의 미국 수출비중은?"
question2 = "자동차 수출이 얼마나 급감했나?"
question3 = "대미 수출 감소에 국내 자동차 업체들의 대응방법은?"
```

```python
message = [
     {
        "role": "user",
        "content": f"""다음 문서를 참고해서 다음 질문들에 대해 질문에 답해줘.

문서:
{context}

질문:
1. {question1}
2. {question2}
3. {question3}
"""
    }
]

result = pipe(message, max_new_tokens=100)
result[-1]["generated_text"]
```

```text
[{'role': 'user',
  'content': '다음 문서를 참고해서 다음 질문들에 대해 질문에 답해줘.\n\n문서:\n우리나라 2대 수출 품목인 자동차가 … (기사 본문 생략) …\n\n질문:\n1. 현대차 기아의 미국 수출비중은?\n2. 자동차 수출이 얼마나 급감했나?\n3. 대미 수출 감소에 국내 자동차 업체들의 대응방법은?\n'},
 {'role': 'assistant',
  'content': '1. 현대차와 기아의 미국 수출 비중은 85%였습니다.\n2. 1958년부터 2019년까지 7년간 미국의 자동차 수출 비중이 크게 떨어졌습니다. 즉, 지난 2018년부터 현재까지 자동차 수출 비중이 크게 감소했습니다.\n3. 현대차와 기아는 현지 생산 비중을'}]
```

- 1번은 맞다 (최대 85%)
- 2번은 **문서에 없는 내용을 지어냈다**. 정답은 "미국 수출 32.0% 급감(전체 자동차 수출은 4.4% 감소)"인데, 1958년, 2019년, 7년간 같은 숫자는 어디에도 없다. "1958~2019년"은 7년도 아니다
- 3번은 `max_new_tokens=100`에 걸려 문장 중간에서 끊겼다

### 문서 요약

```python
message = [
     {
        "role": "user",
        "content": f"""다음 문서의 내용을 100글자 이내로 요약해줘.

문서:
{context}
"""
    }
]

result = pipe(message, max_new_tokens=100)
result
```

```text
[{'generated_text': [{'role': 'user',
    'content': '다음 문서의 내용을 100글자 이내로 요약해줘.\n\n문서:\n우리나라 2대 수출 품목인 자동차가 … (기사 본문 생략) …\n\n'},
   {'role': 'assistant', 'content': '현대차, 기아 자동차 수출 감소폭 4.4%, 관세 장기화 우려 커짐'}]}]
```

길이 조건은 지켰다. 다만 4.4%는 전체 자동차 수출의 감소율이고 현대차·기아의 수치가 아니다. 요약이 짧아질수록 이렇게 주어와 숫자가 엉뚱하게 붙기 쉽다.

### 번역

```python
message = [
     {
        "role": "user",
        "content": f"""다음 문서의 내용을 영어로 번역해줘.

문서:
{context}
"""
    }
]

result = pipe(message, max_new_tokens=100)
result
```

```text
[{'generated_text': [{'role': 'user',
    'content': '다음 문서의 내용을 영어로 번역해줘.\n\n문서:\n우리나라 2대 수출 품목인 자동차가 … (기사 본문 생략) …\n\n'},
   {'role': 'assistant',
    'content': "Here's the English translation of the provided text:\n\nThe country's two major exports – cars – have seen a significant drop in export volumes this month due to the Trump administration’s impact from tariffs on auto imports. The current car market share is at 85%, with total car exports reaching $82 billion, up 32% from last year. \n\nOn April 4th, the Ministry of Industry and Commerce released its May trade statistics showing that car exports fell by 4.4"}]}]
```

영어 문장은 매끄럽지만 내용이 틀렸다. 원문은 "62억 달러, 4.4% 감소"와 "대미 수출 32% 급감"인데 번역은 **"82 billion, up 32%"**로 금액도 방향도 바뀌었다. "1일 발표"는 "April 4th"가 됐다. 0.5B 모델은 문장을 유창하게 만드는 능력에 비해 숫자와 사실을 정확히 옮기는 능력이 약하다. 같은 코드에서 `model`만 더 큰 Instruct 모델로 바꾸면 결과가 좋아지지만, 그만큼 메모리와 시간이 든다.

## 전용 모델 vs 작은 LLM, 언제 무엇을

| 상황 | 추천 | 이번 실습에서 본 근거 |
|---|---|---|
| 감성 분석처럼 라벨이 정해진 분류, 대상 언어의 파인튜닝 모델이 있다 | 해당 task 전용 모델 (예: KoELECTRA 감성 분석) | 한국어 명확한 문장에서 정확도·확률 모두 가장 높았다 |
| 라벨이 자주 바뀌거나 학습 데이터가 없다 | zero-shot-classification | 라벨만 바꿔서 business/programming/sports로 바로 분류했다 |
| 사람 이름·조직·장소 추출 | token-classification (NER 모델) | 조각 단위지만 확률 0.97 이상으로 찾았다 |
| 질의응답·요약·번역처럼 출력이 자유로운 작업 | Instruct LLM (클수록 정확) | 0.5B는 형식은 맞췄지만 숫자를 지어냈다 |
| 메시지(role/content) 형식으로 쓰고 싶다 | 이름에 Instruct/Chat이 붙은 모델 | GPT-2는 chat template이 없어 에러가 났다 |

## 정리

- **Pipeline**은 토크나이저(전처리) → 모델(추론) → 후처리를 묶은 객체다. `pipeline(task=..., model=...)`으로 만들고, 결과는 라벨·점수·생성 텍스트처럼 바로 읽을 수 있는 형태로 나온다
- `model`을 생략하면 task의 기본 모델(분류는 DistilBERT SST-2, 생성은 GPT-2)을 쓴다. 기본 모델은 영어 모델이라 한국어에는 맞지 않는다. 실제로 쓸 때는 **모델 ID를 명시**한다
- 같은 task라도 **모델이 무엇을 학습했느냐**가 결과를 정한다. 라벨 이름(`'1'`/`'0'`, 5단계 등)도 모델마다 달라서 모델 카드를 확인해야 한다
- 제로샷 분류는 NLI 모델로 "문장이 라벨 가설을 함의하는가"를 계산하는 방식이라, 후보 라벨의 표현이 성능을 바꾼다
- 메시지 형식 입력은 chat template이 있는 Instruct 모델에서만 동작하고, 결과도 메시지 리스트로 돌아온다
- 작은 LLM은 유창하지만 숫자와 사실을 지어낼 수 있다. 결과를 원문과 대조해서 확인해야 한다
