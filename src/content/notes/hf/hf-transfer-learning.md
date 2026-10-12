---
title: "전이 학습과 Hugging Face: 사전 학습 모델과 파인튜닝 전략"
description: "사전 학습 모델(Pretrained Model)을 쓰는 세 가지 방식인 제로샷, 전이 학습, 미세 조정(Fine tuning)과 Backbone·Head 구조, 파인튜닝 전략을 정리하고, Hugging Face가 제공하는 Transformers·Datasets·Tokenizers·PEFT 라이브러리와 Model Hub·Dataset Hub·Spaces를 소개합니다."
category: 'Tech'
subcategory: 'NLP'
series: 'Hugging Face'
seriesOrder: 1
originalNotebook: "01_전이학습_huggingface.ipynb"
tags: ["NLP","Hugging Face"]
date: 2026-06-20T11:00:00+09:00
thumbnail: '../../../assets/images/notes/hf/hf-transfer-learning.webp'
---

> SKN31 Hugging Face 과정 노트북 `01_전이학습_huggingface.ipynb`를 바탕으로 정리했습니다.
> 노트북은 개념 설명과 수업 메모로 되어 있어서, 메모는 코드 블록 그대로 두고 그 아래에 정리를 붙였습니다. Backbone을 고정하는 코드는 `보충`으로 넣었고 PyTorch 2.5(CPU)에서 실행했습니다.

## 이 글에서 다루는 것

- Pretrained Model을 쓰는 세 가지 방식: 제로샷, 전이 학습, 미세 조정
- Backbone과 Head, 전이 학습에서 Backbone을 고정하는 방법
- 파인튜닝 전략
- Hugging Face: 회사와 주요 서비스
- Transformers, Datasets, Tokenizers, PEFT 라이브러리와 Hugging Face Hub

자연어 처리 시리즈에서는 모델을 처음부터 학습시켰다. 네이버 영화 리뷰 LSTM은 15만 건으로 3 epoch, 챗봇은 1만 쌍으로 20 epoch을 돌렸고 결과에도 한계가 있었다. 이번 시리즈는 **이미 대규모 데이터로 학습된 모델을 가져다 쓰는** 방법이다.

## Pretrained Model

- **미리 학습된 모델**이다
- **Pretrained model로 현재 문제를 해결한다.** 새로 모델을 정의하고 학습시키는 것보다 훨씬 좋은 성능을 내는 경우가 많다

**사용 방식**

| 방식 | 하는 일 | 학습하는 파라미터 |
|---|---|---|
| **제로샷 전이 학습** (Zero-shot transfer learning) | 추가 학습 없이 Pretrained 모델을 **그대로** 쓴다 | 없음 |
| **전이 학습** (Transfer learning) | Feature 추출기는 그대로 쓰고 **추론기를 새로 만들어** 학습시킨다 | 새로 붙인 추론기(Head)만 |
| **미세 조정** (Fine tuning) | Pretrained 모델의 **모든 파라미터**를 Custom Dataset으로 재학습시켜, 해당 데이터에 최적화한다 | 전부 |

> **Custom Dataset**(맞춤 데이터셋): Pretrained 모델의 학습 데이터와 구별되는, 특정 문제를 풀기 위한 새로운 학습 데이터

```text
# 미리 학습된 모델 = Pretrained Model


# DL => 분류기 + Feature추출기


# 1)제로샷 =>필요없음
# 2)전이학습 => 특징추출 layer만 가져가서 분류기만 학습시킴
# 3)파인튜닝 => 이미불러온 파라미터를 모든 형태의 학습 
# 4) 커스텀데이터셋 (전이/파인튜닝할때 학습할 데이터셋)
```

메모의 "DL => 분류기 + Feature추출기"는 딥러닝 시리즈의 모델 저장 글에서 본 **Backbone + Head** 구조다. 세 방식은 이 두 부분 중 어디를 학습시키느냐로 갈린다.

## Transfer Learning (전이 학습)

![전이 학습](/images/hf/fig-transfer-learning-1.png)

- 사전에 학습된 딥러닝 모델을 **재사용해서 새 모델의 시작점**으로 삼고, 풀려는 문제에 맞게 다시 학습시킨다
- 전이 학습으로 해결하는 것
  1. **데이터 부족**: 딥러닝은 대용량 학습 데이터가 필요한데, 충분한 데이터를 모으기는 항상 어렵다
  2. **과다한 계산량**: 신경망 학습에는 엄청난 계산 자원이 든다
- 보통 **Pretrained Feature Extractor를 재사용**하고, 목적에 맞는 추론기를 붙여 모델을 만든다
- 학습할 때 Pretrained Feature Extractor의 파라미터는 **학습되지 않도록 고정**하고, 새로 붙인 추론기만 학습시킨다

![전이 학습 구조](/images/hf/fig-transfer-learning-2.png)

> **Backbone, Head**
> - **Backbone network**: 전체 모델에서 특징 추출(Feature Extraction)을 담당하는 network block
> - **Head**: 최종 task의 추론을 담당하는 network block

"파라미터를 고정한다"는 것을 PyTorch로 보면 `requires_grad=False`다.

```python
# 보충: Backbone을 고정하고 Head만 학습시키는 구조
import torch
import torch.nn as nn

class MyModel(nn.Module):
    def __init__(self, backbone, n_classes):
        super().__init__()
        self.backbone = backbone                       # 사전학습된 특징 추출기라고 가정
        self.head = nn.Linear(256, n_classes)          # 새로 붙인 추론기

    def forward(self, x):
        return self.head(self.backbone(x))

backbone = nn.Sequential(nn.Linear(784, 512), nn.ReLU(), nn.Linear(512, 256), nn.ReLU())
model = MyModel(backbone, n_classes=3)

# 전이 학습: Backbone 파라미터 고정
for p in model.backbone.parameters():
    p.requires_grad = False

trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
total = sum(p.numel() for p in model.parameters())
print(f"학습되는 파라미터 {trainable:,} / 전체 {total:,}")

# optimizer에는 학습할 파라미터만 넘긴다
optimizer = torch.optim.Adam([p for p in model.parameters() if p.requires_grad], lr=1e-3)
```

```text
학습되는 파라미터 771 / 전체 534,019
```

```python
# 보충: 한 step 학습 후 Backbone은 그대로, Head만 바뀌는지
x, y = torch.randn(8, 784), torch.randint(0, 3, (8,))
before_b = model.backbone[0].weight.clone()
before_h = model.head.weight.clone()

loss = nn.CrossEntropyLoss()(model(x), y)
loss.backward()
optimizer.step()

print("Backbone 변화:", torch.equal(before_b, model.backbone[0].weight) is False)
print("Head 변화    :", torch.equal(before_h, model.head.weight) is False)
print("Backbone grad:", model.backbone[0].weight.grad)
```

```text
Backbone 변화: False
Head 변화    : True
Backbone grad: None
```

전체 53만 개 중 Head의 771개(256 × 3 + 3, 약 0.14%)만 학습된다. 한 step 뒤 Backbone은 그대로이고 Head만 바뀌었다. 고정한 파라미터는 gradient 자체를 계산하지 않아서(`grad`가 `None`) 메모리와 시간도 아낀다.

## Fine tuning (미세 조정)

- Pretrained 모델을 내 데이터셋(Custom Dataset)으로 **추가 학습**시키는 것이다
- 문제에 더 맞도록 Feature Extractor의 가중치까지 조정한다

### Fine tuning 전략

![Fine tuning 전략](/images/hf/fig-finetuning-1.png)

> **보충** 그림의 전략은 보통 **데이터 크기**와 **사전학습 데이터와의 유사도** 두 축으로 정리된다.
>
> | | 사전학습 데이터와 비슷하다 | 사전학습 데이터와 다르다 |
> |---|---|---|
> | **내 데이터가 적다** | Backbone 고정, Head만 학습 (전이 학습) | Backbone의 앞쪽 일부만 쓰고 나머지 + Head 학습 |
> | **내 데이터가 많다** | 뒤쪽 층 일부 + Head 학습, 또는 전체를 작은 학습률로 미세 조정 | 전체를 미세 조정 |
>
> 앞쪽 층은 글자 조합·기본 문법 같은 일반적인 특징을, 뒤쪽 층은 사전학습 과제에 특화된 특징을 배우는 경향이 있다. 그래서 데이터가 다를수록 뒤쪽부터 다시 학습시킨다. 미세 조정할 때는 사전학습으로 얻은 값을 망가뜨리지 않도록 학습률을 작게(예: 1e-5 ~ 5e-5) 잡는다.

## Hugging Face

[Hugging Face](https://huggingface.co)는 자연어 처리와 대규모 언어 모델(LLM)을 중심으로 **전 세계 AI 오픈소스 생태계를 이끄는 AI 플랫폼 기업**이다. "**AI 모델의 GitHub**"로 불릴 만큼 표준 플랫폼이 됐다.

- 2016년 프랑스에서 설립됐고, 처음에는 10대를 겨냥한 챗봇 서비스 스타트업이었다
- 2018년 이후 BERT, GPT 계열 Transformer 모델이 나오며 NLP 산업이 빠르게 커지자 **AI 오픈소스 플랫폼**으로 방향을 바꿨다
- 대형 언어 모델을 누구나 불러와 실험할 수 있도록 표준화된 라이브러리와 공유 플랫폼을 제공하면서, 연구기관·기업·개인 개발자가 필수로 쓰는 인프라가 됐다
- 모델 제공에 그치지 않고 **개발 → 공유 → 학습 → 추론 → 배포**의 전 과정을 아우른다

```text
# 허깅페이스 가입 - 점심시간

# 파이토치 / 텐서플로우 -DL 옛날에 기업들이 각자 사이트에 올려놔서 정보가 흩어졌있었는데, 지금은 허깅페이스로 이용 가능

# llm도 가능

# 자체 Transformer 라이브러리를 제공해 동일한 인터페이스로 다 사용가능

# 데이터셋도 제공을 해줌
```

### 주요 서비스

| 서비스 | 내용 |
|---|---|
| **AI 라이브러리** | `transformers`, `datasets`, `tokenizers` 등 오픈소스 라이브러리. 서로 다른 모델도 **같은 인터페이스**로 쓸 수 있어 생산성이 높다 |
| **Model Hub & Dataset Hub** | 직접 학습한 모델과 데이터셋을 등록·공유하는 Git 기반 플랫폼. 공개 모델·데이터셋이 수십만 개 이상이고, LLM 실험과 파인튜닝의 사실상 표준 저장소다 |
| **API 및 배포** | 서버에 직접 배포하지 않아도 쓸 수 있는 Inference API와 기업용 배포 서비스. LLM, 이미지 생성, 음성 인식 모델을 빠르게 서비스에 적용할 수 있다 |

### Transformers 라이브러리

언어 모델링, 텍스트 생성, 번역, 감성 분석, 질의응답 같은 작업을 할 수 있게 설계된, NLP에서 가장 널리 쓰이는 라이브러리 중 하나다.

1. **광범위한 모델 지원**: BERT, GPT, RoBERTa, T5 등
2. **PyTorch와 TensorFlow 호환**
3. **사용자 친화적 인터페이스**: 간단한 API로 복잡한 모델을 불러와 빠르게 실험할 수 있다
4. **모델 허브 연동**: Hub에 공유된 모델을 내려받아 바로 추론까지
5. **파이프라인**: `pipeline` API로 몇 줄 만에 다양한 작업을 수행한다 (다음 글)

### 주요 라이브러리 ([문서](https://huggingface.co/docs))

| 라이브러리 | 하는 일 |
|---|---|
| [Transformers](https://huggingface.co/docs/transformers/v4.46.3/ko/index) | Hub의 모델을 쉽게 쓰게 해 준다. 텍스트 생성, 번역, 감성 분석 같은 NLP뿐 아니라 컴퓨터 비전 작업도 지원 |
| [Datasets](https://huggingface.co/docs/datasets/index) | Hub의 데이터셋을 불러오고 관리한다 |
| [Tokenizers](https://huggingface.co/docs/tokenizers/index) | 빠른 토큰화. 자연어 처리 시리즈의 Subword 토크나이저 글에서 BPE·WordPiece·Unigram을 학습시킨 그 라이브러리다 |
| [PEFT](https://huggingface.co/docs/peft/index) | LoRA, Prefix-Tuning, Adapter 같은 **파라미터 효율적 LLM 파인튜닝** 기법 |

> **보충** PEFT(Parameter-Efficient Fine-Tuning)는 위 표의 "전이 학습"과 "미세 조정" 사이에 있다. 수십억 개 파라미터를 전부 학습시키는 대신, 원래 가중치는 고정하고 작은 추가 행렬(LoRA의 경우 원래 행렬의 1% 미만)만 학습시킨다. LLM 파인튜닝 시리즈에서 다시 다룬다.

### Hugging Face Hub

AI 모델과 데이터셋을 공유하고 협업하는 중앙 플랫폼이다. ([huggingface.co](https://huggingface.co/))

![Hugging Face Hub](/images/hf/fig-huggingface-main.png)

| 기능 | 내용 |
|---|---|
| **모델 저장소** | 자연어 처리, 컴퓨터 비전, 음성 인식 등 많은 공개 모델을 제공한다. 검색해서 `transformers`로 내려받아 쓰거나 파인튜닝하고, 파인튜닝한 모델을 다시 올릴 수 있다. 모델 페이지마다 설명, 사용법, 예제 코드(Model Card)가 있다 |
| **데이터셋** | 공개 데이터셋을 `datasets` 라이브러리로 내려받는다. 직접 만든 데이터셋도 공개할 수 있다 |
| **Spaces** | Streamlit이나 Gradio 기반 AI 웹 앱을 쉽게 배포한다. 모델을 실시간으로 테스트·시연할 수 있다 |

## 처음부터 학습 vs 전이 학습 vs 미세 조정, 언제 무엇을

| 상황 | 추천 |
|---|---|
| 풀려는 문제가 사전학습 모델의 원래 과제와 같다 (예: 감성 분석 모델로 감성 분석) | 제로샷: 그대로 쓴다 |
| 데이터가 수백~수천 건이고, 사전학습 모델이 비슷한 언어·도메인을 봤다 | 전이 학습: Backbone 고정 + Head 학습 |
| 데이터가 충분하고 도메인이 특수하다 (법률, 의료, 사내 문서) | 미세 조정 (모델이 크면 PEFT) |
| 맞는 사전학습 모델이 없고 데이터가 아주 많다 | 처음부터 학습 |

## 정리

- **Pretrained Model**은 대규모 데이터로 미리 학습된 모델이다. 그대로 쓰면 **제로샷**, Head만 새로 학습하면 **전이 학습**, 전체를 재학습하면 **미세 조정**이다
- 전이 학습은 데이터 부족과 계산량 문제를 함께 푼다. PyTorch에서는 Backbone 파라미터의 `requires_grad`를 끄고, 학습할 파라미터만 optimizer에 넘긴다
- 파인튜닝 전략은 내 데이터의 크기와 사전학습 데이터와의 유사도로 정한다
- **Hugging Face**는 모델·데이터셋 공유(Hub), 라이브러리(Transformers, Datasets, Tokenizers, PEFT), 배포(Inference API, Spaces)를 제공하는 AI 오픈소스 플랫폼이다
