---
title: "파인튜닝 데이터셋 만들기: Datasets와 LLM 라벨링"
description: "Hugging Face Datasets의 Dataset·DatasetDict로 유튜브 댓글 감성 데이터를 불러와 컬럼 정리, map으로 라벨 오타 교정, filter로 불명확 데이터 제거, 층화 분할, Hub 업로드까지 진행합니다. 이어서 네이버 경제 뉴스에 LLM으로 '영향 받는 종목·이유·요약' 라벨을 붙여 파인튜닝용 instruction 데이터셋을 만들고, LLM 라벨에서 생기는 문제를 검토합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'sLLM 파인튜닝'
seriesOrder: 2
originalNotebook: "2_Dataset_생성.ipynb"
tags: ["LLM","Fine-tuning"]
date: 2026-07-21T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/sllm-dataset.webp'
---

> SKN31 sLLM 파인튜닝 과정 노트북 `2_Dataset_생성.ipynb`를 바탕으로 정리했습니다.
> 유튜브 댓글 데이터셋 전처리까지는 수업 때 실행한 결과이고, Hub 업로드 이후와 뉴스 데이터셋 부분은 **강사님 노트북의 실행 결과**입니다(업로드 계정도 강사님 계정입니다). LLM 라벨은 실행마다 달라집니다.

## 이 글에서 다루는 것

- Hugging Face Datasets: `Dataset`과 `DatasetDict`
- 컬럼 정리, `map()`, `filter()`, `class_encode_column()`, 층화 분할
- Hub 업로드(`push_to_hub`)와 로컬 저장(`save_to_disk`), pandas 변환
- 파인튜닝용 데이터: 뉴스 기사 → LLM으로 라벨 생성
- LLM이 만든 라벨에서 확인할 것

지난 글에서 QLoRA로 적은 메모리로 학습할 수 있게 됐다. 남은 재료는 **데이터**다.

```python
# model => 특성추출(adapter) + 추론(transformer)
# PEFT-lora + data set => H.F(생태계)
```

모델(PEFT·LoRA)과 데이터셋 모두 Hugging Face 생태계에서 처리한다. 이번 글은 데이터 쪽이다.

## Hugging Face Datasets

```python
!uv pip install ipykernel ipywidgets datasets langchain langchain-openai python-dotenv
```

```python
import datasets
datasets.__version__
```

```text
'5.0.0'
```

**Datasets는 대규모 데이터셋을 효율적으로 로드·전처리·변환·스트리밍하는 라이브러리**다. Hub에 올라온 데이터셋을 같은 인터페이스로 쓸 수 있고, 내부적으로 Apache Arrow 형식이라 메모리에 다 올리지 않고도(lazy loading, streaming) 큰 데이터를 다룬다.

| 클래스 | 구조 |
|---|---|
| `Dataset` | 하나의 데이터셋. 행 = 샘플, 열 = feature인 테이블 |
| `DatasetDict` | 여러 Dataset을 묶은 dict. `{"train": Dataset, "validation": Dataset, "test": Dataset}` |

![Hugging Face Dataset](/images/llm/fig-sllm-huggingface-dataset.png)

| 불러오는 방법 | 코드 |
|---|---|
| Hub | `load_dataset("imdb")` |
| 로컬 파일 | `load_dataset("csv", data_files={"train": "data/train.csv", ...})` |
| pandas / dict | `Dataset.from_pandas(df)`, `Dataset.from_dict({...})` |

```python
# 목적성에 따른 데이터 전처리가 필요함
```

## 유튜브 댓글 감성 데이터 다루기

[Korean-YouTube-Comment-Sentiment-Dataset](https://huggingface.co/datasets/LLM-SocialMedia/Korean-YouTube-Comment-Sentiment-Dataset)으로 Datasets의 기본 조작을 익힌다.

```python
####################################################
# DataLoading - load_dataset("Datahub Dataset ID")
####################################################

from datasets import load_dataset

dataset_dict = load_dataset("LLM-SocialMedia/Korean-YouTube-Comment-Sentiment-Dataset")

print(type(dataset_dict))
dataset_dict
```

```text
<class 'datasets.dataset_dict.DatasetDict'>

DatasetDict({
    train: Dataset({
        features: ['cid', 'text', 'time', 'author', 'channel', 'votes', 'replies', 'heart', 'reply', 'time_parsed', 'source_video_id', 'source_video_title', 'text_length', 'is_not_spam', 'votes_norm', 'replies_norm', 'heart_norm', '검수_감정'],
        num_rows: 10035
    })
})
```

train 하나만 있는 DatasetDict다. 분할은 뒤에서 직접 한다.

```python
#####################################
# DatasetDict에서 Dataset 조회
#####################################
dataset = dataset_dict['train']

#################################
# Dataset의 정보 조회
#################################
dataset.features
# key-feature이름, value: 데이터 타입.
```

```text
{'cid': Value('string'),
 'text': Value('string'),
 ...
 'votes': Value('int64'),
 'heart': Value('bool'),
 ...
 '검수_감정': Value('string')}
```

```python
dataset.num_columns # feature개수
dataset.num_rows # 행수 - 데이터개수
```

```text
18
10035
```

### 컬럼 정리

댓글(`text`)과 감정(`검수_감정`)만 남기고 이름을 바꾼다.

```python
##############################
#  Feature 제거
##############################
dataset = dataset.remove_columns(
    ['cid', 'time', 'author', 'channel', 'votes', 'replies', 'heart', 'reply', 'time_parsed', 'source_video_id', 'source_video_title', 'text_length', 'is_not_spam', 'votes_norm', 'replies_norm', 'heart_norm']
)

##############################
#  Feature 이름 변경
##############################
# dict : key-현재이름, value-바꿀이름
dataset = dataset.rename_columns({
    "text":"comment",
    "검수_감정":"labels"
})
dataset
```

```text
Dataset({
    features: ['comment', 'labels'],
    num_rows: 10035
})
```

`remove_columns`, `rename_columns`는 원본을 바꾸지 않고 **새 Dataset을 반환**한다. 그래서 `dataset = ...`으로 다시 받는다.

### 조회

```python
##########################################
# Dataset의 값을 조회(행조회)
# indexing, slicing, fancy indexing
##########################################

# dataset[0]
dataset[:3]
# dataset[[1, 4, 9]]
```

```text
{'comment': ['PERSON_002 예쁘고 귀엽다 언제든지 PERSON_001 응원하고 있을게 화이팅!!!!',
  '팬덤이 계속 보길 원하고, 글로벌적 수요가 분명 타레이블보다 높음에도 경영진의 입맛에 맞지 않다는 이유로 공연을 막고, ...',
  'PERSON_003 데뷔때부터 팬인데 이젠 나도 쉴드못쳐주겟다.. ...'],
 'labels': ['긍정', '긍정', '부정']}
```

슬라이싱 결과가 **행 리스트가 아니라 컬럼별 리스트를 가진 dict**다. Arrow가 컬럼 단위로 저장하기 때문이다. 인명은 `PERSON_00X`로 비식별 처리되어 있다.

두 번째 댓글은 "경영진이 공연을 막는 건 부당하다"는 내용인데 라벨이 **긍정**이다. 화자의 태도로 보면 비판, 즉 부정에 가깝다. 사람이 검수한 라벨에도 이런 애매함이 있다.

```python
# lora 5000개~10000개
# 최소 1000개 이상
```

LoRA 파인튜닝에 필요한 데이터 양에 대한 메모다. 최소 1,000개, 보통 5,000~10,000개를 목표로 한다.

```python
dataset['comment'][[1, 9, -1]]
```

```text
['팬덤이 계속 보길 원하고, ...',
 '와 미춌다!! 울 PERSON_004 넘 이뻐!ㅜㅠ💙🩷💛💚💜🐰🐰🐰🐰🐰',
 '지역 전통축제 망치지말아주세요 지역고유의 음식이 먹고싶습니다.']
```

```python
dataset['labels']
```

```text
Column(['긍정', '긍정', '부정', '건너뛰기', '부정', ...])
```

### 라벨 정리: unique, map, filter

```python
########################################
#  feature 의 고유값(unique 값) 조회
########################################
dataset.unique("labels")
```

```text
['긍정', '부정', '건너뛰기', '중립', '불명확', '', '긍정정', '중립립']
```

3개(긍정·부정·중립)여야 할 라벨이 8가지다. `긍정정`, `중립립`은 검수할 때 생긴 **입력 오타**, `건너뛰기`·`불명확`·`''`은 판단을 포기한 데이터다. 학습 전에 반드시 `unique`로 라벨을 확인해야 하는 이유다.

```python
############################################
# map()을 이용해 일괄 처리
############################################

label_map = {
    "긍정정":"긍정", # key: 현재값, value: 바꿀값 - "긍정정"->"긍정"
    "중립립":"중립",
    "건너뛰기":"불명확"
}

def update_labels(row):
    """Label `긍정정`을 `긍정`, `중립립`을 `중립`, `건너뛰기`를 `불명확`으로 변경"""
    label = row['labels']
    new_label = label_map.get(label, label)
    return {"labels" : new_label} 

dataset = dataset.map(update_labels) 
# dataset의 개별행을 update_labels에 전달. 
#     그 함수가 반환하는 값을 dataset에 업데이트
dataset.unique('labels')
```

```text
['긍정', '부정', '불명확', '중립', '']
```

`map()`은 각 행(dict)을 함수에 넘기고, **반환한 dict로 해당 컬럼을 덮어쓴다**(없던 key면 새 컬럼). `label_map.get(label, label)`은 매핑에 없는 라벨은 그대로 두는 관용구다.

```python
####################################################
# filter()를 이용해 특정 조건의 데이터만 추출 
####################################################
def check_labels(row):
    """Label이 `불명확`, `'' ` 인 행을 제거"""
    flag = row['labels'] != '불명확' and row['labels'] != ''
    return flag

dataset = dataset.filter(check_labels)
dataset
```

```text
Dataset({
    features: ['comment', 'labels'],
    num_rows: 5571
})
```

10,035개 중 **4,464개(44%)가 판단 불가 데이터**였다. 메모의 "최소 1,000개"는 넉넉히 넘지만, 공개 데이터셋을 받아도 절반 가까이를 버려야 할 수 있다.

> **보충**: `map`과 `filter`는 기본적으로 한 행씩 처리한다. `batched=True`를 주면 행 여러 개를 컬럼별 리스트로 묶어 넘기므로 훨씬 빠르다. 토크나이저처럼 배치 입력을 받는 함수와 함께 쓸 때 특히 차이가 크다. 또 결과는 캐시 파일로 저장되어, 같은 함수로 다시 실행하면 재계산 없이 캐시를 읽는다.

### 분할

```python
###############################################
# Dataset 분리
# - shuffle(): 데이터셋을 섞는다.
# - train_test_split(): 데이터셋 분할
###############################################
dataset = dataset.shuffle()

# labels 타입을 Value(string)에서 ClassLabel(범주형) 타입으로 변환.
dataset = dataset.class_encode_column("labels")

dataset_dict = dataset.train_test_split(
    test_size=0.15,
    stratify_by_column="labels" 
    # 지정한 컬럼의 고유값 별 비율에 맞춰서 분할. 지정한 컬럼 타입: ClassLabel타입
)
dataset.features
dataset_dict
```

```text
{'comment': Value('string'), 'labels': ClassLabel(names=['긍정', '부정', '중립'])}

DatasetDict({
    train: Dataset({
        features: ['comment', 'labels'],
        num_rows: 4735
    })
    test: Dataset({
        features: ['comment', 'labels'],
        num_rows: 836
    })
})
```

`stratify_by_column`(층화 분할)은 **ClassLabel 타입만** 받는다. 그래서 먼저 `class_encode_column`으로 문자열 라벨을 범주형(긍정=0, 부정=1, 중립=2)으로 바꿨다. 머신러닝 때 `train_test_split(..., stratify=y)`와 같은 역할이다.

```python
train_set = dataset_dict['train']
test_set = dataset_dict['test']
```

### 저장과 공유

여기부터는 강사님 노트북의 실행 결과다.

```python
####################################################################
# DatasetDict나 Dataset을 huggingface Datahub에 upload 한다.
# - 본인 계정의 Repository에 업로드 하기 때문에 Loging이 필요하다.
#
# Dataset/DatasetDict의 `push_to_hub("Data ID")`
#  - DataID는 "계정/data_id" 로 구성된다.
####################################################################

# 로그인
from huggingface_hub import login
from dotenv import load_dotenv
import os

load_dotenv("env")

hf_token = os.getenv('HUGGINGFACE_API_KEY')

login(hf_token)
```

```python
user_id = "kgmyh"
# 계정ID/저장소ID
dataset_id = f"{user_id}/youtube_comment_sentiment_dataset_preprocessing"
dataset_dict.push_to_hub(dataset_id)
```

```text
CommitInfo(commit_url='https://huggingface.co/datasets/kgmyh/youtube_comment_sentiment_dataset_preprocessing/commit/...', commit_message='Upload dataset', ...)
```

Hub의 데이터셋 저장소는 git 저장소라서 업로드 결과가 **커밋**으로 남는다. 업로드한 데이터는 다른 데이터셋처럼 `load_dataset(dataset_id)`로 받는다. Hub 토큰은 쓰기 권한(write)이 있어야 업로드할 수 있다.

```python
##########################################################
# 로컬 컴퓨터에 저장
# 저장: DatasetDict/Dataset의 save_to_disk("저장 경로")
# 불러오기: load_from_disk("저장경로")
###########################################################
dataset_dict.save_to_disk("data/youtube_comment_dataset") 

# 불러오기
from datasets import load_from_disk
load_dataset_dict2 = load_from_disk("data/youtube_comment_dataset")
```

| 저장 | 불러오기 | 용도 |
|---|---|---|
| `push_to_hub("계정/id")` | `load_dataset("계정/id")` | 공유, 다른 환경(Colab 등)에서 사용 |
| `save_to_disk(경로)` | `load_from_disk(경로)` | 로컬 보관 |
| `to_pandas()`, `to_csv()` | `Dataset.from_pandas()` | 다른 도구로 분석 |

```python
df_train = train_set.to_pandas()
df_train.head()
```

```text
                                comment  labels
0        이민가면 낸거 돌려받을 수 있답니다. 답이 거기 있어요       1
1                      빽햄 킵고잉이여 음음 그래그래       2
2  누가 그러던데 회사에 쓴소리 할 사람이 없다는데.. 정말 이구나.       2
3              니가 더 내고 내가 더 받는다고 하면 ㅋㅋㅋ       1
4     ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ추성훈님 명복을 빕니다.       0
```

pandas로 바꾸면 ClassLabel이 **정수**로 나온다. 마지막 행은 부고 댓글인데 0(긍정)이다. "ㅋㅋㅋ"가 잔뜩 붙은 댓글이라 라벨러가 긍정으로 본 듯하다. 이런 데이터가 모델이 배울 "정답"이 된다는 점을 기억해 두자.

## 파인튜닝용 데이터셋: 뉴스 → 종목 영향 분석

이제 실제 파인튜닝에 쓸 데이터를 만든다. 감성 분류처럼 정답 라벨이 이미 있는 데이터가 아니라, **원하는 출력 형식의 정답을 LLM으로 만든다.**

### 원천 데이터

[Naver 경제·IT 뉴스 요약 데이터셋](https://huggingface.co/datasets/daekeun-ml/naver-news-summarization-ko)(2022년 7월 1~10일 기사).

```python
from datasets import load_dataset

# Hugging Face 데이터셋 로드
dataset = load_dataset("daekeun-ml/naver-news-summarization-ko")
dataset
```

```text
DatasetDict({
    train: Dataset({
        features: ['date', 'category', 'press', 'title', 'document', 'link', 'summary'],
        num_rows: 22194
    })
    validation: Dataset({ ..., num_rows: 2466 })
    test: Dataset({ ..., num_rows: 2740 })
})
```

```python
trainset = dataset['train']
df_train = trainset.to_pandas() # DataFrame으로 변환
df_train['category'].value_counts()
```

```text
category
economy    17088
IT과학        5106
```

```python
# 경제 기사만 조회
df = df_train.query("category=='economy'").reset_index(drop=True)
df.shape
```

```text
(17088, 7)
```

### 무엇을 학습시킬까

| | 내용 |
|---|---|
| **입력** | 뉴스 제목 + 본문 |
| **출력** | ① 주식시장에 영향을 주는 기사인지 ② 부정적 영향을 받는 회사와 이유 ③ 긍정적 영향을 받는 회사와 이유 ④ 요약 |

이 출력(라벨)을 사람이 17,000건에 다 달 수는 없으니 **LLM(gpt-5.4-mini)으로 생성**하고, 결과를 **눈으로 검토**한다. 큰 모델의 출력으로 작은 모델을 학습시키는 방식이라 일종의 **지식 증류**(distillation)다.

### 라벨 생성 체인

프롬프트의 핵심 규칙만 추리면 이렇다.

```text
# Instruction
당신은 금융 뉴스의 핵심 내용을 요약해 설명하고, 뉴스가 특정 상장 종목에 미치는 긍정/부정 영향 여부, 이유, 근거 등을 분석하는 금융 분석 전문가입니다.
...
## 분석 기준
1. 뉴스가 **한국 주식 종목에 영향을 주는지 판단**하세요.
2. 영향을 준다면: "is_stock_related": true, 긍정/부정 회사 이름들, 각 회사에 대한 이유
   - 반드시 **뉴스기사에 언급된 내용 기반으로 작성한다.** ...
   - `None`, 유추, 추정, 일반 논평 금지합니다.
   - **뉴스 내용 요약** (3줄 이내)
3. 영향을 주지 않는다면: "is_stock_related": false, 요약

## 출력 조건:
- 뉴스에 영향을 받은 회사들은 **반드시 한국 증시에 상장된 종목** 이어야 합니다.
- 모든 키(Key)는 출력 지시사항에 명시된 property들과 정확히 일치해야 합니다.
- 오직 유효한 JSON 문자열(UTF-8, RFC8259 준수)만 출력합니다.

## 출력 예시 (Examples)
### 뉴스가 특정 주식종목들에 **긍정적 영향이 주는 경우**:
{{"is_stock_related": true,
 "negative_reasons": [],
 "negative_stocks": [],
 "positive_reasons": [{{"세라젬": "루게릭병 환우 지원 캠페인 후원과 ... 긍정적으로 부각됨"}}],
 "positive_stocks": ["세라젬"],
 "summary": "..."}}
...
```

```python
# Output Parser 정의
class SummarySchema(BaseModel):
    is_stock_related: bool = Field(description="한국 주식 종목과 관련있는 뉴스인지 여부")
    positive_stocks: list[str] = Field(description="뉴스기사에 긍정적인 영향을 받는 회사들의 이름들.")
    positive_reason: list[dict[str,str]] = Field(description='뉴스내용 중 positive_stocks에 있는 각 회사들에 긍정적 영향을 주는 내용. {"회사이름":"긍정적인 이유"}')
    negative_stocks: list[str] = Field(description="뉴스기사에 부정적인 영향을 받는 회사들의 이름들.")
    negative_reason: list[dict[str,str]] = Field(description='뉴스내용 중 negative_stocks에 있는 각 회사들에 부정적 영향을 주는 내용. {"회사이름":"부정적인 이유"}')
    summary: str = Field(description="뉴스 기사 요약")

parser = JsonOutputParser(pydantic_object=SummarySchema)

prompt = ChatPromptTemplate.from_template(
    template=template,
    partial_variables={"format_instructions": parser.get_format_instructions()}
)

# Chain 구성
model_name = "gpt-5.4-mini"
model = ChatOpenAI(model=model_name)
chain = prompt | model | parser
```

[Output Parser 글](/notes/llm/llm-output-parser)의 `JsonOutputParser` + Pydantic 스키마 조합이다. 예시 JSON의 중괄호는 템플릿 변수와 구분하려고 `{{ }}`로 이스케이프했다.

> **보충**: 프롬프트 본문과 예시는 키 이름을 `positive_reasons`, `negative_reasons`(복수)로 쓰는데, Pydantic 스키마는 `positive_reason`, `negative_reason`(단수)이다. `format_instructions`에는 스키마 쪽 이름이 들어가므로 **LLM이 받는 지시 안에서 키 이름이 두 가지**가 된다. 아래 결과를 보면 실제로 어떤 응답은 복수, 어떤 응답은 단수 키를 썼다. `JsonOutputParser`는 JSON 파싱만 하고 스키마 검증은 하지 않아서 이 불일치를 잡지 못한다. 학습 데이터의 출력 형식이 섞이면 파인튜닝된 모델도 두 형식을 섞어 낸다.

### 한 건 테스트

```python
# 입력 형식: title\n뉴스내용

news_idx = 10
sample_news = df['title'].loc[news_idx]+"\n"+df['document'].loc[news_idx]
print(sample_news)
```

```text
글로벌 비즈 가트너 올해 전세계 스마트폰 판매량 7% 감소 전망
경제와이드 모닝벨 글로벌 비즈 임선우 외신캐스터 글로벌 비즈입니다. ◇ 올해 스마트폰 판매 감소 올해 전세계 스마트폰 판매량이 크게 줄어들 것이란 전망이 나왔습니다. ...
```

```python
# Chain 실행을 통해 Label 생성
response = chain.invoke({"input":sample_news})
pprint(response)
```

```text
{'is_stock_related': True,
 'negative_reasons': [{'LG이노텍': '가트너가 올해 전세계 스마트폰 판매량이 7% 감소할 것으로 전망하며 ... 스마트폰 부품 수요에 부정적 영향이 예상됨'},
                      {'삼성전자': '... 스마트폰 사업 관련 부정적 영향이 예상됨'},
                      {'SK하이닉스': '... 메모리 반도체 수요에 부정적 영향이 예상됨'},
                      {'엔비디아': '... 반도체 관련 부정적 영향이 예상됨'},
                      {'TSMC': '... 반도체 위탁생산 관련 부정적 영향이 예상됨'}],
 'negative_stocks': ['LG이노텍', '삼성전자', 'SK하이닉스', '엔비디아', 'TSMC'],
 'positive_reasons': [],
 'positive_stocks': [],
 'summary': '가트너가 올해 전세계 스마트폰 판매량이 7% 감소할 것으로 전망했다. ...'}
```

형식은 잘 지켰지만 내용에 문제가 있다.

- **엔비디아와 TSMC는 한국 증시 상장 종목이 아니다.** "반드시 한국 증시에 상장된 종목"이라는 규칙을 어겼다.
- 기사에는 "애플 등 스마트폰 제조사와 엔비디아, TSMC 같은 반도체 업체"가 언급됐다. LG이노텍, 삼성전자, SK하이닉스는 기사에 없는 **추론**이다. "유추, 추정 금지" 규칙과 충돌한다. 금융 분석으로는 그럴듯하지만, 규칙대로라면 들어가면 안 된다.

이 라벨로 학습하면 작은 모델은 **규칙을 어기는 습관까지 그대로 배운다.** 수업 자료가 "LLM으로 데이터셋을 만든 뒤 반드시 눈으로 검토하라"고 강조하는 이유다.

### 100건 라벨링

```python
# K개 샘플링

sample_nums = 100  
sample_df = df.sample(sample_nums).reset_index(drop=True)

# 뉴스제목(title)과 뉴스기사(document)를 합쳐서 프롬프트를 생성
articles = sample_df['title']+"\n"+sample_df['document']

# LLM에 label 생성 요청
label_list = articles.apply(lambda x : chain.invoke({'input':x}))
```

```python
# 결과 확인
idx = 45
print(articles[idx])
label_list[idx]
```

```text
정부 전력산업 디지털화 추진…발전 빅데이터 플레이스 개소
발전 빅데이터 플레이스 개소식 기념사진. ⓒ산업통상자원부 데일리안 유준상 기자 산업통상자원부는 4일 대전 소재 한전 전력연구원에서 ...

{'is_stock_related': True,
 'positive_stocks': ['한국전력', '두산에너빌리티', '한전KPS'],
 'positive_reasons': [{'한국전력': "산업통상자원부가 한전 전력연구원에서 '발전 빅데이터 플레이스' 개소식을 열고 ..."},
  {'두산에너빌리티': '발전 현장에서 생산되는 데이터를 수집·활용해 발전기 정비와 운영 효율성을 높이고, ...'},
  {'한전KPS': '발전기 정비와 운영 효율성 제고, ... 정비·유지보수 사업과 관련된 ...'}],
 'negative_stocks': [],
 'negative_reasons': [],
 'summary': '산업통상자원부가 한전 전력연구원에서 발전 빅데이터 플레이스를 개소하고 ...'}
```

> **보충**: `articles.apply(lambda x: chain.invoke(...))`는 100건을 **하나씩 순서대로** 호출한다. 한 건 실패하면 전체가 멈추고 그때까지의 결과도 잃는다. 체인의 `batch()`(`chain.batch(inputs, config={"max_concurrency": 5})`)로 병렬 처리하고, `return_exceptions=True`로 실패한 건만 따로 모아 다시 돌리는 편이 실용적이다.

```python
# Label 타입 변환:  Dictionary 를 str로 변환.
label_list_str = label_list.apply(lambda x : str(x))

# Label을 DataFrame에 "label" 컬럼에 추가.
sample_df['label'] = label_list_str
```

> **보충**: `str(dict)`는 `{'is_stock_related': True, ...}`처럼 **작은따옴표와 파이썬 `True`** 로 바뀐다. 이건 JSON이 아니다. 그런데 이 문자열이 그대로 모델이 배울 **정답 출력**이 된다. 프롬프트에서 "유효한 JSON만 출력하라"고 해 놓고 학습 데이터는 파이썬 dict 표기로 만드는 셈이라, 파인튜닝된 모델의 출력을 `json.loads`로 읽을 수 없게 된다. `json.dumps(x, ensure_ascii=False)`로 저장하는 것이 맞다.

### 저장과 업로드

```python
import os
os.makedirs("dataset", exist_ok=True)

output_file = "dataset/sample_df.pkl"
sample_df.to_pickle(output_file)
```

LLM 호출에는 비용이 드니 결과를 바로 파일로 저장해 둔다.

```python
# DataFrame을 Dataset으로 변환
dataset = Dataset.from_pandas(sample_df)

# train/test set으로 분리
dataset_dict = dataset.train_test_split(test_size=0.1)

# 데이터셋을 Huggingface hub 에 업로드.
dataset_id = "naver_economy_news_stock_instruct_dataset-100_samples"
dataset_dict.push_to_hub(dataset_id)
```

```text
DatasetDict({
    train: Dataset({ features: [..., 'summary', 'label'], num_rows: 90 })
    test: Dataset({ features: [..., 'summary', 'label'], num_rows: 10 })
})
```

`push_to_hub`에 계정 없이 이름만 주면 로그인한 계정 아래에 만든다.

수업에서는 같은 방식으로 **1,500건**을 미리 만들어 둔 데이터셋을 받아 다음 글의 학습에 쓴다.

```python
# 1500개 sample 로 만든 데이터 셋 로드

from datasets import load_dataset
d_id = "kgmyh/naver_economy_news_stock_instruct_dataset"
dataset = load_dataset(d_id)
dataset
```

```text
DatasetDict({
    train: Dataset({
        features: ['date', 'category', 'press', 'title', 'document', 'link', 'summary', 'label'],
        num_rows: 1350
    })
    test: Dataset({
        features: ['date', 'category', 'press', 'title', 'document', 'link', 'summary', 'label'],
        num_rows: 150
    })
})
```

```python
trainset[0]['label']
testset[0]['label']
```

```text
"{'is_stock_related': False, 'positive_stocks': [], 'positive_reasons': [], 'negative_stocks': [], 'negative_reasons': [], 'summary': '대전도시공사가 한국서비스품질 우수기업 인증을 획득했다. ...'}"

"{'is_stock_related': True, 'positive_stocks': ['삼성전자'], 'positive_reason': [{'삼성전자': '반도체, 스마트폰, TV 등 주력 사업부에 상반기 성과급을 최대치(기본급 100%)로 지급할 만큼 실적이 우수했음이 ...'}], ...}"
```

앞의 보충에서 말한 것이 실제로 보인다. train 첫 건은 `positive_reasons`, test 첫 건은 `positive_reason`이다. **같은 데이터셋 안에서 키 이름이 섞여 있다.**

## 정리

| 작업 | 메서드 |
|---|---|
| 불러오기 | `load_dataset(id)`, `load_dataset("csv", data_files=...)`, `Dataset.from_pandas()` |
| 컬럼 정리 | `remove_columns()`, `rename_columns()` |
| 값 확인 | `unique()`, `features`, 인덱싱·슬라이싱 |
| 일괄 변환 | `map(fn)` (반환 dict로 컬럼 갱신), `batched=True`로 가속 |
| 거르기 | `filter(fn)` (True인 행만 남김) |
| 분할 | `class_encode_column()` → `train_test_split(stratify_by_column=)` |
| 저장·공유 | `push_to_hub()` / `save_to_disk()` / `to_pandas()` |

| LLM 라벨링 체크리스트 | 이번 데이터에서 |
|---|---|
| 규칙을 지켰나 | 해외 상장사(엔비디아, TSMC)가 들어감 |
| 근거가 기사에 있나 | 기사에 없는 국내 기업을 추론으로 추가 |
| 출력 키가 일관된가 | `positive_reasons` / `positive_reason` 혼재 |
| 저장 형식이 목표 형식과 같은가 | JSON을 원했는데 `str(dict)`로 저장 |

- 공개 데이터셋도 `unique`부터 본다. 라벨 오타와 판단 불가 데이터가 섞여 있다.
- LLM으로 만든 라벨은 **초안**이다. 작은 모델은 라벨의 장점과 함께 **실수도 그대로 배운다.**
- 프롬프트와 스키마의 키 이름을 하나로 맞추고, Pydantic으로 **검증까지** 해서 저장한다.

다음 글에서는 이 데이터로 카카오의 kanana-nano-2.1b 모델을 LoRA 파인튜닝하고, 파인튜닝된 모델의 응답을 확인한다.
