---
title: "sLLM 파인튜닝 실습: kanana-2.1B를 LoRA로 학습하기"
description: "카카오 kanana-nano-2.1b-instruct 모델을 불러 chat template과 generate()로 응답을 생성해 보고, 뉴스 종목 분석 데이터셋을 chat 형식 학습 프롬프트로 바꾼 뒤 정답 부분만 학습하도록 라벨을 마스킹하는 Data Collator를 만듭니다. LoraConfig·SFTConfig·SFTTrainer로 학습하고, Hub에 올린 어댑터를 PeftModel로 붙여 파인튜닝된 모델의 출력을 검토합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'sLLM 파인튜닝'
seriesOrder: 3
originalNotebook: "3_Fine_tuning.ipynb"
tags: ["LLM","Fine-tuning"]
date: 2026-07-22T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/sllm-finetuning-lab.webp'
---

> SKN31 sLLM 파인튜닝 과정 노트북 `3_Fine_tuning.ipynb`를 바탕으로 정리했습니다.
> 수업 때 실행한 환경은 CPU 전용 PyTorch여서 모델 로딩과 짧은 생성, 데이터 준비까지만 실행됐습니다. 학습 로그와 파인튜닝 모델의 응답은 **강사님 노트북(GPU)의 실행 결과**입니다. 생성 결과는 샘플링이라 실행마다 달라집니다.

## 이 글에서 다루는 것

- 베이스 모델 로딩과 chat template, `generate()`
- 학습 데이터를 모델의 chat 형식으로 바꾸기
- Data Collator: 정답 부분만 학습하도록 라벨 마스킹
- `LoraConfig`, `SFTConfig`, `SFTTrainer`로 학습
- 어댑터를 붙여 추론하기, 결과 검토

[지난 글](/notes/llm/sllm-dataset)에서 뉴스 기사에 "영향 받는 종목·이유·요약" 라벨을 붙인 데이터셋을 만들었다. 이번 글에서 그 데이터로 작은 한국어 모델을 학습시켜, **긴 시스템 프롬프트와 GPT 없이도** 같은 형식의 분석을 내게 만든다.

## 환경

```python
%pip install transformers==5.3 datasets accelerate trl peft hf_transfer langchain python-dotenv

# 설치 후 Reload
```

```python
import torch
torch.__version__
```

```text
'2.13.0+cpu'
```

**`+cpu`** 다. GPU(CUDA)용 PyTorch가 아니라서 이 환경에서는 학습을 돌릴 수 없다. 2.1B 모델을 CPU로 학습하면 한 스텝에 수 분 이상 걸린다.

```python
import transformers, trl, peft
print(transformers.__version__)
print(trl.__version__)
print(peft.__version__)
```

```text
4.46.3
1.8.0
0.19.1
```

첫 셀에서 `transformers==5.3`을 설치했는데 실제로 import된 건 **4.46.3**이다. 설치 후 커널을 재시작하지 않았거나, 다른 가상환경에 설치됐다는 뜻이다. 주석의 "설치 후 Reload"가 이 얘기다. 이 차이는 뒤에서 `torch_dtype`/`dtype` 인자 이름 같은 형태로 드러난다.

> **보충**: 노트북에서 패키지를 설치한 뒤에는 `import 패키지; 패키지.__version__`으로 **실제로 불러와진 버전**을 확인하는 습관이 좋다. `!pip`은 노트북 커널과 다른 파이썬에 설치될 수 있으므로 `%pip`(현재 커널 기준)을 쓰는데, 그래도 이미 import된 모듈은 커널을 재시작해야 바뀐다. GPU용 PyTorch는 `pip install torch --index-url https://download.pytorch.org/whl/cu124`처럼 CUDA 버전에 맞는 인덱스에서 받아야 한다.

## 데이터 불러오기

```python
import os
from huggingface_hub import login
from dotenv import load_dotenv

print(load_dotenv(".env", override=True))

login(os.getenv('HUGGINGFACE_API_KEY'))
```

```python
from datasets import load_dataset

user_id = "ujneg18"  # !!!!! 본인 Huggingface ID 입력 !!!!!
data_id = f"{user_id}/naver_economy_news_stock_instruct_dataset-100_samples"
dataset = load_dataset(data_id)

dataset
```

```text
DatasetDict({
    train: Dataset({
        features: ['date', 'category', 'press', 'title', 'document', 'link', 'summary', 'label'],
        num_rows: 90
    })
    test: Dataset({
        features: ['date', 'category', 'press', 'title', 'document', 'link', 'summary', 'label'],
        num_rows: 10
    })
})
```

지난 글에서 만든 **100건 데이터셋을 내 계정으로 올린 것**을 받았다. 학습은 90건으로 한다.

## 베이스 모델

한국어를 충분히 학습한 작은 모델로 카카오의 [kanana-nano-2.1b-instruct](https://github.com/kakao/kanana)를 쓴다. Llama 계열 구조다.

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "kakaocorp/kanana-nano-2.1b-instruct"

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="auto",
    torch_dtype=torch.bfloat16,
    attn_implementation="eager" 
)

tokenizer = AutoTokenizer.from_pretrained(model_id)
```

```python
# 모델 크기 확인
print(f"Model size: {model.get_memory_footprint():,} bytes, {model.get_memory_footprint()/1024/1024/1024:.3f} GB") 
```

```text
Model size: 4,173,967,104 bytes, 3.887 GB
```

BF16(2바이트) × 약 21억 파라미터 ≈ 3.9GB다. [개요 글](/notes/llm/sllm-finetuning-overview)의 계산대로라면 이 모델을 전체 파인튜닝하면 그래디언트와 옵티마이저 상태까지 수십 GB가 필요하지만, LoRA로 어댑터만 학습하면 이 4GB 위에 약간만 더하면 된다.

`torch_dtype`은 4.x 버전의 인자 이름이다. 5.x에서는 `dtype`으로 바뀌었다. 지난 글의 강사님 코드가 `dtype=`을 쓰는데 이 환경에서 `torch_dtype=`으로 고친 이유가 위의 버전 차이다.

### chat template

Instruct 모델은 학습할 때 쓴 **대화 형식**이 정해져 있다. 그 형식에 맞춰 입력해야 제대로 답한다. `tokenizer.apply_chat_template()`이 `{"role":..., "content":...}` 리스트를 모델 형식의 문자열로 바꿔 준다.

```python
############################################################################################################################################### 
#  입력 프롬프트 생성
#
#  - kanana, Llama 동일한 프롬프트 형식
#    - Instruction 모델이 학습할 때 사용한 prompt 형식에 맞춰 입력데이터를 변환을 해야 한다.
#  - `tokenizer.apply_chat_template()`: 
#       - {"role":"역할", "content":"content"} 구조로 입력을 하면 실제 모델의 모델의 입력 프롬프트 형식으로 변환해 주는 메소드.
###############################################################################################################################################

content = "대한민국의 수도는 어디에요?"

message = [  
        {"role": "system", "content": "당신은 친절한 AI Assistant입니다."},
        {"role": "user", "content": content},
]

# 모델 입력 형식에 맞게 프롬프트 변환.
prompt = tokenizer.apply_chat_template(
    message,
    add_generation_prompt=True,
    tokenize=False
)

print(prompt)
```

```text
<|begin_of_text|><|start_header_id|>system<|end_header_id|>

당신은 친절한 AI Assistant입니다.<|eot_id|><|start_header_id|>user<|end_header_id|>

대한민국의 수도는 어디에요?<|eot_id|><|start_header_id|>assistant<|end_header_id|>


```

| 토큰 | 의미 |
|---|---|
| `<\|begin_of_text\|>` | 시퀀스 시작 |
| `<\|start_header_id\|>역할<\|end_header_id\|>` | 발화자 (system / user / assistant) |
| `<\|eot_id\|>` | 한 발화의 끝 (end of turn) |

`add_generation_prompt=True`가 마지막에 `assistant` 헤더를 붙여 "이제 assistant가 말할 차례"라고 알린다. 모델마다 형식이 다르다.

| 모델 계열 | 형식 |
|---|---|
| Llama / kanana | `<\|start_header_id\|>role<\|end_header_id\|> ... <\|eot_id\|>` |
| Gemma | `<start_of_turn>user ... <end_of_turn>`. system role이 없어 system 지시를 user 내용에 넣는다. assistant 대신 `model` |
| Alpaca | `### Instruction:` / `### Response:` 마크다운 헤더 |

`tokenizer.chat_template`에 jinja2 문법으로 들어 있으니, 직접 문자열을 조립하지 말고 이 메서드를 쓰는 게 안전하다.

### generate()

```python
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
print(inputs)
```

```text
{'input_ids': tensor([[128000, 128000, 128006,   9125, 128007,    271,  65895, ...
            882, 128007,    271, 113760, ... 128009, 128006,  78191, 128007,    271]]),
 'attention_mask': tensor([[1, 1, 1, ...]])}
```

맨 앞에 `128000`(`<|begin_of_text|>`)이 **두 번** 있다. chat template이 이미 시작 토큰을 붙였는데 `tokenizer()`가 기본값(`add_special_tokens=True`)으로 한 번 더 붙였기 때문이다. 뒤의 Data Collator에서는 이걸 피하려고 `add_special_tokens=False`를 쓴다.

```python
################################################### 
# 답변 생성 - 모델에 Prompt 를 입력해서 응답 요청
## 생성모델: model.generate() 메소드 사용
###################################################
import torch

model.eval()
with torch.no_grad():
    output = model.generate(
        **inputs,
        max_new_tokens=50,
        do_sample=True,
        top_p=0.95,
        temperature=0.8
    )
print(tokenizer.decode(output[0]))
```

```text
<|begin_of_text|><|begin_of_text|><|start_header_id|>system<|end_header_id|>

당신은 친절한 AI Assistant입니다.<|eot_id|><|start_header_id|>user<|end_header_id|>

대한민국의 수도는 어디에요?<|eot_id|><|start_header_id|>assistant<|end_header_id|>

대한민국의 수도는 서울입니다. 서울은 대한민국의 정치, 경제, 문화의 중심지로 잘 알려져 있습니다. 필요하신 다른 정보가 있으면 언제든지 물어보세요!<|eot_id|><|eot_id|>system<|eot_id|><|eot_id|>system<|e
```

CPU에서도 50토큰 생성은 됐다. `generate()`의 결과에는 **입력까지 포함**되어 있으니 답만 보려면 입력 길이만큼 잘라 낸다.

```python
# 답변 부분만 잘라서 디코딩

response = tokenizer.decode(output[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
print(response)
```

```text
대한민국의 수도는 서울입니다. 서울은 대한민국의 정치, 경제, 문화의 중심지로 잘 알려져 있습니다. 필요하신 다른 정보가 있으면 언제든지 물어보세요!systemsystem
```

답 뒤에 `systemsystem`이 붙었다. 모델은 답을 마치고 `<|eot_id|>`를 냈지만 **생성이 멈추지 않고** `max_new_tokens`(50)까지 계속됐다. `generate()`는 모델 설정의 종료 토큰(`<|end_of_text|>`, 128001)에서 멈추는데, 대화형 모델은 발화를 `<|eot_id|>`(128009)로 끝내기 때문이다. `skip_special_tokens=True`가 `<|eot_id|>`는 지웠지만 그 사이에 생성된 일반 텍스트 "system"은 남았다.

> **보충**: `generate(..., eos_token_id=[tokenizer.eos_token_id, tokenizer.convert_tokens_to_ids("<|eot_id|>")])`처럼 종료 토큰에 `<|eot_id|>`를 함께 주면 답이 끝나는 지점에서 멈춘다. 강사님 GPU 환경에서는 같은 코드가 "다른 질문이 있으신가요? 도움을 드릴 수 있는 주제가 있다면 말씀해 주세요"까지 생성하다 50토큰에서 잘렸다. 모델 버전·생성 설정(`generation_config.json`)에 따라 이 동작이 달라질 수 있다. 뒤에서 쓰는 `pipeline`은 chat 입력일 때 이런 종료 처리를 알아서 한다.

## 학습 데이터를 chat 형식으로

학습 데이터도 모델의 chat 형식이어야 한다. 한 샘플을 이렇게 만든다.

```text
system:    (지난 글의 라벨 생성 프롬프트 = 분석 기준 + 출력 스키마 + 예시)
user:      뉴스 제목 + 본문
assistant: 라벨(정답)
```

`InputPromptCreator` 클래스로 정리했다. 시스템 프롬프트는 지난 글의 라벨 생성 프롬프트를 그대로 가져왔고, 스키마의 키는 `positive_reasons`, `negative_reasons`로 맞춰져 있다.

```python
class InputPromptCreator:
    """모델별 형식에 맞춰 입력 프롬프트를 생성한다.
    """
    def __init__(self, tokenizer=None):
        self.tokenizer = tokenizer
        self.system_prompt = '''# Instruction
당신은 금융 뉴스의 핵심 내용을 요약해 설명하고, 뉴스가 특정 상장 종목에 미치는 긍정/부정 영향 여부, 이유, 근거 등을 분석하는 금융 분석 전문가입니다.
...(지난 글의 분석 기준, 출력 스키마, 출력 조건, 예시)...'''

    def create_pipeline_prompt(self, news_title:str, news_document:str) -> list[dict]:
        """파이프라인에 입력할 chat 형식 프롬프트생성한다."""
        news = news_title+"\n\n"+news_document
        message = [
            {"role":"system", "content":self.system_prompt},
            {"role":"user", "content": news}
        ]
        return message

    def create_train_prompt(self, datapoint:dict) -> dict:
        """
        Dataset의 개별 데이터를 입력받아서 모델 학습을 위한 chat 프롬프트 생성.

        - 학습과 추론의 프롬프트 형식을 완전히 동일하게 맞추기 위해 tokenizer.apply_chat_template()을 사용한다.
          (수기로 <|start_header_id|> 등 특수토큰을 조립하면 모델의 실제 chat template과 미세하게 달라질 수 있다.)

        Returns:
            dict: {"train_prompt": 전체 학습 시퀀스, "prompt_only": 입력(정답 제외) 부분}
                - train_prompt : system + user + assistant(정답 label)까지 포함한 전체 학습 시퀀스
                - prompt_only  : system + user 까지(정답 제외, add_generation_prompt=True).
                                 추론 입력과 동일하며, collate_fn() 에서 라벨 마스킹 경계로 사용한다.
        """
        if self.tokenizer is None:
            raise Exception("Tokenizer가 없습니다. create_train_prompt를 사용하려면 모델의 tokenizer가 필요합니다.")

        content = datapoint['title']+"\n"+datapoint['document']
        messages = [
            {"role":"system", "content":self.system_prompt},
            {"role":"user", "content": content},
        ]

        # 입력 부분(정답 없이) - 추론 때 pipeline이 만드는 형식과 동일
        prompt_only = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )

        # prompt_only에 정답(label)까지 포함한 전체 학습 시퀀스
        messages_with_label = messages + [{"role":"assistant", "content": datapoint['label']}]
        train_prompt = self.tokenizer.apply_chat_template(
            messages_with_label,
            tokenize=False
        )

        return {"train_prompt": train_prompt, "prompt_only": prompt_only}
```

두 가지를 함께 만드는 이유는 다음 절의 마스킹 때문이다. `prompt_only`가 "여기까지는 문제", 그 뒤가 "정답"이라는 **경계**가 된다.

> **보충**: 학습 때는 user 내용을 `title + "\n" + document`로, 추론용 `create_pipeline_prompt`는 `title + "\n\n" + document`로 만든다. 줄바꿈 하나 차이지만 docstring이 강조한 "학습과 추론의 프롬프트 형식을 완전히 동일하게"에서 벗어난다. 작은 모델일수록 이런 차이에 민감할 수 있으니 한 함수로 통일하는 편이 낫다.

```python
llama_input_creator = InputPromptCreator(tokenizer)

trainset = train_set.map(llama_input_creator.create_train_prompt, remove_columns=list(train_set.features))
testset = test_set.map(llama_input_creator.create_train_prompt, remove_columns=list(test_set.features))
trainset
```

```text
Dataset({
    features: ['train_prompt', 'prompt_only'],
    num_rows: 90
})
```

지난 글에서 본 `map()`이 여기서 쓰인다. 반환 dict가 새 컬럼이 되고, `remove_columns`로 원래 컬럼은 지웠다.

## Data Collator: 정답만 학습하기

Data Collator는 Dataset에서 꺼낸 배치를 모델 입력으로 바꾸는 함수다. 만들어야 하는 것은 세 가지다.

```json
{
  "input_ids": 입력 시퀀스의 토큰 ID들,
  "attention_mask": 실제 토큰과 패딩 구분,
  "labels": input_ids에서 답변 부분만 토큰 ID, 나머지는 -100
}
```

핵심은 `labels`다. Causal LM은 "다음 토큰 맞히기"로 학습하는데, 시스템 프롬프트와 뉴스 본문까지 맞히게 하면 **뉴스를 외우는 데** 학습이 낭비된다. 우리가 원하는 건 "이런 입력이 오면 이런 답을 낸다"이므로 **답변 부분만** 오차를 계산한다.

```python
import torch

max_seq_length = 8192

def collate_fn(batch: list[dict]) -> dict[str, torch.Tensor]:
    """모델 학습시 batch를 입력받아 모델 입력에 맞게 처리해서 반환"""

    new_batch = {
        "input_ids": [],
        "attention_mask": [],
        "labels": []
    }

    # row: dict{"train_prompt":"System, "User, Assistant", "prompt_only":"system,user"}

    for row in batch:

        tokenized = tokenizer(
            row['train_prompt'],
            truncation=True,
            max_length=max_seq_length, # max_length 초과하면 잘라낸다. 
            padding=False, # padding은 붙이지 않는다. (뒤에서 직접 붙일 것.)
            return_tensors=None, # 토큰 ID들을 list 반환. "pt": torch.tensor 
            add_special_tokens=False,
        )

        input_ids = tokenized["input_ids"]
        attention_mask = tokenized["attention_mask"]

        ##############################################################################################################################################################################
        # 라벨(답) Tensor 생성
        #  - system, user prompt(prompt_only)를 -100으로 마스킹 한다. 
        #    - -100으로 마스킹 하는 이유는 pytorch의 CrossEntropyLoss() 는 loss 계산시 -100은 오차계산할 때 무시한다. 
        #    - 오차계산은 assistant 의 답변만 비교 해야 하므로 `system`, `user` prompt는 -100으로 마스킹하고 그 이후(정답 label + <|eot_id|>(PAD))만 실제 토큰 ID로 채워 학습 되도로 한다.
        ##############################################################################################################################################################################
        prompt_ids = tokenizer(
            row['prompt_only'], 
            add_special_tokens=False)["input_ids"] # System, User prompt부분 토큰화한 것.

        prompt_len = len(prompt_ids) # 토큰 개수 조회

        labels = [-100] * len(input_ids)
        for j in range(prompt_len, len(input_ids)):
            labels[j] = input_ids[j]

        new_batch["input_ids"].append(input_ids)
        new_batch["attention_mask"].append(attention_mask)
        new_batch["labels"].append(labels)


    ######################################################################################
    #  패딩 처리 - 동적 패딩.
    #  -  배치내 입력중 가장 긴 sample에 길이를 맞춘다.
    #  -  kanana tokenizer는 pad_token(<|end_of_text|>)이 정의돼 있어 그대로 사용한다.
    ######################################################################################
    # 배치안에서 input_ids의 max length를 조회

    max_length = max(len(ids) for ids in new_batch["input_ids"])

    # 배치의 max_length에 맞추는 작업. 뒤에 PAD 추가.
    for i in range(len(new_batch["input_ids"])):
        pad_len = max_length - len(new_batch["input_ids"][i])
        new_batch["input_ids"][i].extend([tokenizer.pad_token_id] * pad_len)
        new_batch["attention_mask"][i].extend([0] * pad_len)
        new_batch["labels"][i].extend([-100] * pad_len)

    # lisat => torch.Tensor
    for k in new_batch:
        new_batch[k] = torch.tensor(new_batch[k])

    return new_batch
```

한 샘플의 labels를 그림으로 보면 이렇다.

```text
input_ids: [system 프롬프트 ...][user 뉴스 ...][assistant 헤더][정답 JSON ...][eot][PAD PAD]
labels:    [-100 ...          ][-100 ...    ][-100          ][정답 JSON ...][eot][-100 -100]
                         prompt_len ─┘
```

- **-100**: PyTorch `CrossEntropyLoss`의 기본 `ignore_index`라 오차 계산에서 빠진다.
- 정답 뒤의 `<|eot_id|>`까지 학습하므로 모델이 **답을 끝내는 법**도 배운다. 앞에서 본 "멈추지 않는 생성" 문제를 학습 데이터 쪽에서 막는 장치다.
- 패딩은 배치에서 가장 긴 샘플에 맞추는 **동적 패딩**이다. 모두 8192에 맞추면 대부분이 PAD가 되어 낭비다. PAD 위치도 labels는 -100, attention_mask는 0이다.

```python
######################
# collate_fn() 확인
######################
example = [trainset[11], trainset[2], trainset[3]]
batch = collate_fn(example)

print("batch:")
print("input_ids 크기:", batch["input_ids"].shape)
print("attention_mask 크기:", batch["attention_mask"].shape)
print("labels 크기:", batch["labels"].shape)
```

```text
batch:
input_ids 크기: torch.Size([3, 2932])
attention_mask 크기: torch.Size([3, 2932])
labels 크기: torch.Size([3, 2932])
```

샘플 하나가 3,000토큰 가까이 된다. 대부분이 시스템 프롬프트(스키마와 예시 포함)와 뉴스 본문이다. 이 긴 입력이 메모리 사용량을 결정한다.

> **보충**: 지금은 학습 데이터에도 긴 시스템 프롬프트를 그대로 넣었다. 파인튜닝의 장점 하나가 "지시를 모델이 배우게 해서 **프롬프트를 짧게** 만드는 것"이다. 짧은 시스템 프롬프트("뉴스를 분석해 종목 영향을 JSON으로 답하라")로 학습하고 추론도 그렇게 하면 입력 토큰이 크게 줄어 학습·추론 비용이 모두 내려간다. 단, 그러려면 학습 데이터의 정답 형식이 충분히 일관되어야 한다.

## 학습 설정

### LoraConfig

| 매개변수 | 의미 | 예 |
|---|---|---|
| `r` | 어댑터 랭크. 2B~7B 모델은 8이 효율이 좋다고 알려져 있다 | 8, 16, 32 |
| `lora_alpha` | 어댑터 출력 배율 $\frac{\alpha}{r}$. $BA$가 작은 값에서 시작해 초반 학습이 느린 것을 보정 | 16, 32, 64 |
| `lora_dropout` | 어댑터에만 적용하는 드롭아웃 | 0.05, 0.1 |
| `bias` | 기존 bias도 학습할지 | `"none"`(권장) |
| `target_modules` | 어댑터를 붙일 층 | `"q_proj"`, `"k_proj"`, `"v_proj"`, `"o_proj"` |
| `task_type` | 문제 유형 | `"CAUSAL_LM"`(생성), `"SEQ_CLS"`(분류) 등 |

```python
# CAUSAL_LM(생성) =>
```

```python
###############################
# Peft(LoRA) 어뎁터 설정
###############################

from peft import LoraConfig
from trl import SFTConfig

peft_config = LoraConfig(
        r=8,
        lora_alpha=32, 
        lora_dropout=0.1,
        bias="none",
        target_modules=["q_proj", "v_proj"], # LLaMA 계열을 query, value에 어뎁터를 추가하고 성능을 본 뒤 확장.
        task_type="CAUSAL_LM", 
)
```

$\alpha / r = 32 / 8 = 4$배로 어댑터 출력을 키웠다. Attention의 query·value 투영에만 어댑터를 붙여 작게 시작하고, 부족하면 k·o나 FFN 층(`gate_proj`, `up_proj`, `down_proj`)으로 넓힌다.

### SFTConfig

TRL의 `SFTConfig`는 Hugging Face `TrainingArguments`에 SFT(Supervised Fine-Tuning)용 옵션을 더한 설정이다.

```python
epochs = 10

# Hugginface Model-hub에 업로드할 모델 ID
model_id = "kanana-nano-2.1b-instruct-finace_news-finetuning-100"

args = SFTConfig(
    output_dir=model_id,                    # 학습 결과(체크포인트/최종 모델)를 저장할 디렉터리 경로
    save_strategy="steps",                  # 모델 저장 전략("steps": 스텝 간격으로 저장)
    save_steps=50,                          # 얼마나 자주 체크포인트를 저장할지(step 단위)

    num_train_epochs=epochs,                # 전체 데이터셋을 몇 번 반복 학습할지(에포크 수)
    per_device_train_batch_size=2,          # GPU 하나당 학습 배치 크기(micro-batch size)
    gradient_accumulation_steps=4,          # gradient를 몇 스텝 누적해서 업데이트할지(효과적 batch 증가)
    gradient_checkpointing=True,            # 활성값 저장 대신 필요할 때 재계산하여 메모리 절감
                                            # 중간 활성값을 역전파 때 저장하지 않고 필요 시 재계산하여 GPU 메모리를 크게 줄이는 기법

    optim="adamw_torch_fused",              # 옵티마이저 종류(AdamW 변형, PyTorch fused 구현-Fused 구현은 연산이 통합되어 더 빠르고 효율적이다.)
    logging_steps=20,                       # 로깅(손실 등 출력)을 몇 스텝마다 할지
    learning_rate=1e-4,                     # 학습률(learning rate)
    max_grad_norm=0.3,                      # gradient clipping 최대 노름(norm) 값(그래디언트 폭주 방지)
    bf16=True,                              # bfloat16 mixed precision 활성화(메모리/연산 최적화)
    lr_scheduler_type="cosine_with_restarts",  # learning rate scheduler(조정) 유형. cosine_with_restarts: 코사인 곡선으로 lr을 낮추다 주기적으로 재시작.
    warmup_ratio=0.03,                      # warmup 비율(전체 step의 3%를 lr warmup으로 사용).
                                            # 데이터가 적을 때 warmup_steps를 크게(예: 100) 잡으면 전체 스텝의 대부분이 warmup으로 소모되어
                                            # lr이 목표치에 도달하지 못하므로, 절대 스텝수 대신 비율로 지정한다.

    push_to_hub=True,                       # 학습 완료 후 Hugging Face Hub에 업로드 여부
    hub_model_id=f"{user_id}/{model_id}",   # Hub에 업로드할 모델 리포지토리 ID
    hub_token=True,                         # Hub 업로드 시 사용할 토큰 정보

    remove_unused_columns=False,            # 기본적으로 Hugging Face Tokenizer/Trainer는 모델에 필요 없는 컬럼을 제거한다. False면 제거하지 않고 그대로 두며, ...
    dataset_kwargs={"skip_prepare_dataset": True},  # SFTTrainer가 자동으로 데이터 전처리/packing을 수행하는 단계를 건너뛰게 한다.
    max_length=max_seq_length,              # 최대 토큰 길이 제한(max_length)
    label_names=["labels"],                 # loss 계산 시 사용할 레이블 컬럼 이름
    report_to="none"                        # 로깅/모니터링 대상
)
```

설정을 묶어 보면 이렇다.

| 묶음 | 설정 | 효과 |
|---|---|---|
| 배치 | batch 2 × accumulation 4 | 메모리는 배치 2만큼, 업데이트는 배치 8처럼 |
| 메모리 | `gradient_checkpointing`, `bf16` | 활성값 재계산, 16비트 연산 |
| 안정성 | `max_grad_norm=0.3`, `warmup_ratio=0.03` | 그래디언트 폭주 방지, 초반 lr 천천히 |
| 데이터 처리 | `remove_unused_columns=False`, `skip_prepare_dataset=True` | 우리가 만든 `collate_fn`이 처리하도록 Trainer의 자동 처리를 끔 |
| 저장 | `push_to_hub=True` | 학습이 끝나면 **어댑터만** Hub에 업로드 |

`remove_unused_columns=False`가 특히 중요하다. 기본값 True면 Trainer가 모델 `forward()`의 인자 이름(`input_ids` 등)에 없는 컬럼, 즉 `train_prompt`, `prompt_only`를 **collate_fn에 넘기기 전에 지워 버린다.**

## 학습

```python
from trl import SFTTrainer
# Trainer 객체 생성 
trainer = SFTTrainer(
    model=model, # 파인튜닝할 기반 모델
    args=args, # SFTConfig (학습설정)
    train_dataset=trainset, # trainset
    data_collator=collate_fn,
    peft_config=peft_config # Lora
)
```

`peft_config`를 넘기면 SFTTrainer가 모델에 LoRA 어댑터를 붙이고 나머지 파라미터를 동결한다.

```python
#############################
#  학습 시작
#############################
trainer.train()
```

강사님 노트북(GPU)의 결과다.

```text
[120/120 14:21, Epoch 10/10]

Step   Training Loss
20     0.264705
40     0.193929
60     0.137734
80     0.095079
100    0.075187
120    0.063822

TrainOutput(global_step=120, training_loss=0.13840928574403127, metrics={'train_runtime': 869.5065, 'train_samples_per_second': 1.035, 'train_steps_per_second': 0.138, 'total_flos': 2.852718295253299e+16, 'train_loss': 0.13840928574403127, 'epoch': 10.0})
```

- 스텝 수: 90건 ÷ (배치 2 × 누적 4 = 8) ≈ 12스텝/에포크 × 10에포크 = **120스텝**.
- 약 14분 반. 샘플 하나가 3,000토큰 가까이 되는 것을 생각하면 2.1B 모델로 적당한 속도다.
- loss가 0.26에서 0.06까지 꾸준히 내려갔다.

> **보충**: loss가 계속 내려간 것만으로 "잘 학습됐다"고 말할 수는 없다. 90건을 10번 반복했고 **평가셋(eval_dataset)을 주지 않아서** 과적합 여부를 알 수 없다. 0.06은 학습 데이터의 정답 JSON을 거의 그대로 재현한다는 뜻에 가깝다. 테스트셋 10건을 `eval_dataset=testset`으로 넘기고 `eval_strategy="steps"`로 검증 loss를 함께 보면, 검증 loss가 다시 올라가는 지점에서 멈출 수 있다.

## 파인튜닝된 모델 사용

학습 결과로 Hub에 올라간 것은 **LoRA 어댑터(약 7.9MB)** 뿐이다. 4GB 베이스 모델과 합쳐서 쓴다.

| 방법 | 코드 | 특징 |
|---|---|---|
| 베이스 + 어댑터 따로 로드 | `PeftModel.from_pretrained(base_model, lora_id)` | 어댑터만 바꿔 끼우며 여러 태스크에 재사용 |
| 한 번에 로드 | `AutoPeftModelForCausalLM.from_pretrained(lora_id)` | 어댑터 설정에 기록된 베이스 모델을 알아서 받아 붙임 |
| 병합해서 저장 | `model.merge_and_unload()` 후 `save_pretrained` | 어댑터를 가중치에 더해 일반 모델로. 추론이 조금 빠르고 배포가 단순 |

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from peft import PeftModel
import torch

base_model_id = "kakaocorp/kanana-nano-2.1b-instruct"
lora_model_id = f"{user_id}/kanana-nano-2.1b-instruct-finace_news-finetuning-100"

tokenizer = AutoTokenizer.from_pretrained(base_model_id)
llama_input_creator = InputPromptCreator(tokenizer)

# base model 불러오기
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_id,
    device_map="auto",
    torch_dtype=torch.bfloat16  # type= 아니고 torch_dtype=
)

# base model에 LoRA adapter 추가
model = PeftModel.from_pretrained(base_model, lora_model_id)

# 파이프라인 생성
pipe = pipeline(task="text-generation", model=model, tokenizer=tokenizer)
```

```text
adapter_config.json: ...
adapter_model.safetensors:   0%|          | 0.00/7.88M [00:00<?, ?B/s]
```

어댑터 파일(`adapter_model.safetensors`)은 7.88MB다. 이 작은 파일이 4GB 모델의 동작을 바꾼다.

### 학습에 없던 뉴스로 테스트

학습 데이터(2022년 7월)에 없는 최근 기사로 시험한다.

```python
news_title = "'반도체 초호황'…삼성전자 사상 첫 분기 영업익 20조 넘나"
news_document = """삼성전자가 지난해 4분기 사상 첫 분기 영업이익 20조를 달성할 수 있을지 업계와 시장의 이목이 집중되고 있다. ...
이는 삼성전자, SK하이닉스, 마이크론 등 메모리 3사가 AI 시대 들어 수익성이 높은 HBM의 생산 비중을 높이는 와중에 범용 메모리 수요가 갑자기 폭증했기 때문이다. ...
LG전자와 LG에너지솔루션도 각각 9일과 8일 잠정실적을 발표한다. ... LG전자의 실적 컨센서스는 매출 23조5748억원, 영업손실 76억원이다. ...
LG에너지솔루션도 전기차 캐즘 충격파에 부진한 성적표를 받아들 전망이다. 다시 적자로 전환할 게 유력하다. ..."""

message = llama_input_creator.create_pipeline_prompt(news_title=news_title, news_document=news_document)
response = pipe(message, max_new_tokens=1500)
```

아래 셀은 에러가 나는 것이 정상이다. CPU 환경에서 3,000토큰 가까운 입력으로 최대 1,500토큰을 생성하려다 오래 걸려 실행을 중단한 기록이다.

```text
KeyboardInterrupt:
```

강사님 노트북의 결과다.

```python
print(response[0]['generated_text'][-1]["content"])
```

```text
{'is_stock_related': True, 'positive_stocks': ['삼성전자', 'SK하이닉스', '마이크론'], 'positive_reasons': [{'삼성전자': '지난해 4분기 사상 첫 분기 영업이익 20조 달성 가능성이 언급되었고, 메모리 초호황과 압도적인 D램 생산능력이 실적을 견인했다고 기사에 소개됨'}, {'SK하이닉스': '메모리 3사 중 하나로 언급되었고, 서버용DDR5와 HBM3E 간 가격 격차 축소 속 HBM 생산 비중 확대가 수익성 강화 요인으로 거론됨'}, {'마이크론': '메모리 3사 중 하나로 언급되었고, 서버용 DDR5와 HBM3E 간 가격 격차가 축소될 것이라는 트렌드포스의 예상이 HBM 호조의 배경으로 언급됨'}], 'negative_stocks': [], 'negative_reasons': [],'summary': '삼성전자가 4분기 사상 첫 분기 영업이익 20조 달성 가능성이 언급됐다. D램, 낸드플래시 등 범용 메모리 가격 급등과 HBM 호조가 실적을 견인했다. 반면 LG전자와 LG에너지솔루션은 희망퇴직 비용 효율화와 전기차 캐즘 충격으로 부진이 예상됐다.'}
```

2.1B 모델이 학습 형식 그대로 종목·이유·요약을 냈다. 근거도 기사 문장에서 가져왔다. 파인튜닝은 됐다. 이제 검토할 차례다.

| 확인할 것 | 결과 |
|---|---|
| 형식 | `{'is_stock_related': True, ...}` **작은따옴표와 파이썬 `True`**. JSON이 아니다 |
| 한국 상장 종목 규칙 | **마이크론**(미국 상장)이 들어갔다 |
| 긍정/부정 판단 | 요약에는 "LG전자와 LG에너지솔루션은 부진이 예상"이라고 쓰고 `negative_stocks`는 비었다 |
| 근거 | "트렌드포스의 예상"을 마이크론의 근거로 연결했는데, 기사에서 그 문장은 특정 회사 얘기가 아니다 |

**첫 두 줄은 모델이 데이터에서 배운 것**이다. 지난 글에서 본 대로 학습 데이터의 정답이 `str(dict)`로 저장됐고, 라벨을 만든 GPT도 엔비디아·TSMC 같은 해외 기업을 넣었다. 시스템 프롬프트가 "유효한 JSON만", "반드시 한국 증시 상장 종목"이라고 말해도 모델은 **프롬프트보다 학습한 정답을 따른다.** 파인튜닝 데이터의 품질이 곧 모델의 품질이다.

### 한 번에 로드, 그리고 Predict 클래스

```python
#####################################
# Merge된 모델 한번에 받아오기
#####################################

from peft import AutoPeftModelForCausalLM
fine_tuned_model = AutoPeftModelForCausalLM.from_pretrained(lora_model_id, device_map="auto", dtype=torch.bfloat16)
pipe2 = pipeline("text-generation", model=fine_tuned_model, tokenizer=tokenizer)

response2 = pipe2(message, max_new_tokens=1500)
print(response[0]['generated_text'][-1]["content"])
```

> **보충**: 마지막 줄이 `response2`가 아니라 **`response`** 를 출력하고 있어서, 강사님 노트북에서도 이 셀의 출력은 앞의 결과와 글자 하나까지 같다. `pipe2`의 실제 결과는 확인되지 않은 상태다. 이름이 비슷한 변수를 이어서 만들 때 흔한 실수다. 또 `AutoPeftModelForCausalLM`은 주석처럼 "Merge된 모델"을 받는 게 아니라, **베이스와 어댑터를 따로 받아 붙이는** 것이다. 실제 병합은 `merge_and_unload()`로 한다.

입력 생성부터 응답 추출까지를 클래스로 묶었다.

```python
class Predict:

    def __init__(self, pipeline):
        self.pipeline = pipeline
        self.prompt_creator = InputPromptCreator(pipeline.tokenizer)

    def __call__(self, title: str, content: str) -> str:
        """뉴스 제목과 뉴스 내용을 받아서 프롬프트 생성 후 pipeline에 전달하여 응답 내용만 추출 해서 반환
        """
        message = self.prompt_creator.create_pipeline_prompt(title, content)
        response = self.pipeline(message)
        return response[0]['generated_text'][-1]['content']

predict = Predict(pipe)
predict(news_title, news_document)
```

강사님 노트북의 결과다.

```text
Both `max_new_tokens` (=256) and `max_length`(=20) seem to have been set. `max_new_tokens` will take precedence. ...

"{'is_stock_related': True, 'positive_stocks': ['삼성전자', 'SK하이닉스', '마이크론'], 'positive_reasons': [{'삼성전자': '... 이익 규모를 늘린 것으로 추정된다고 기사에 적혀 있음'}, {'SK하이닉스': '...'}, {'마이크론': '...'}], 'negative_stocks': ['LG전자', 'LG"
```

이번엔 `negative_stocks`에 LG전자가 들어갔다(샘플링이라 실행마다 판단이 다르다). 그런데 **출력이 중간에 끊겼다.** `__call__`에서 `max_new_tokens`를 주지 않아 기본값 256토큰에서 멈췄기 때문이다. 경고 메시지가 그 사실을 알려 준다. JSON 응답이 끊기면 파싱할 수 없으니, 응답 길이에 맞게 `max_new_tokens`를 넉넉히 주거나 `Predict` 생성자에서 받아 두어야 한다.

## 정리

| 단계 | 핵심 | 이번 실습에서 본 함정 |
|---|---|---|
| 환경 | GPU용 PyTorch, 맞는 transformers 버전 | `+cpu`, 설치한 5.3 대신 4.46.3이 로드됨 |
| 입력 형식 | `apply_chat_template()`로 모델 형식 맞추기 | `tokenizer()`가 BOS를 한 번 더 붙임 |
| 생성 | `generate()` 결과는 입력 포함, 종료 토큰 확인 | eot 토큰 뒤로 생성이 계속됨 |
| 라벨 마스킹 | 프롬프트는 -100, 정답 + eot만 학습 | 학습/추론 프롬프트의 줄바꿈 차이 |
| 학습 | LoRA(q, v, r=8, α=32) + SFTTrainer | 평가셋 없이 loss만 확인 |
| 추론 | 베이스 + 7.9MB 어댑터 | `max_new_tokens` 기본값 256에서 JSON이 끊김 |
| 결과 | 2.1B 모델이 형식에 맞춰 분석 | 데이터의 실수(파이썬 dict 표기, 해외 종목)까지 학습 |

- 파인튜닝은 **형식과 습관을 가르치는 데** 강하다. 같은 이유로 데이터의 나쁜 습관도 그대로 옮긴다.
- 정답만 학습하도록 마스킹하고, 정답 끝의 종료 토큰까지 학습시킨다.
- 학습 loss가 낮아지는 것과 모델이 쓸 만한 것은 다른 문제다. 평가셋과 사람의 검토가 함께 필요하다.

여기까지가 SKN31의 AI 파트다. 다음 시리즈부터는 이 모델과 Agent를 실제 서비스에 올리기 위한 웹 프론트엔드, Django, AWS로 넘어간다.
