---
title: "LLM 파인튜닝 개요: 양자화와 LoRA·QLoRA"
description: "파운데이션 모델을 특정 도메인에 맞추는 파인튜닝이 왜 필요하고 왜 어려운지 정리한 뒤, 모델을 작게 만드는 양자화(FP16·BF16, INT8 absmax, NF4)와 일부만 학습하는 PEFT·LoRA·QLoRA의 원리를 숫자 예제로 따라갑니다. BitsAndBytesConfig로 Qwen 모델을 FP32·FP16·INT8·NF4로 불러 메모리 크기를 비교합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'sLLM 파인튜닝'
seriesOrder: 1
originalNotebook: "1_LLM_Finetuning개요.ipynb"
tags: ["LLM","Fine-tuning"]
date: 2026-07-20T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/sllm-finetuning-overview.webp'
---

> SKN31 sLLM 파인튜닝 과정 노트북 `1_LLM_Finetuning개요.ipynb`를 바탕으로 정리했습니다.
> 수업 때 실행한 환경에서는 Qwen 모델 로딩과 INT8 양자화가 라이브러리 버전 문제로 에러가 났습니다. 모델 크기 비교 출력은 **강사님 노트북의 실행 결과**이고, absmax 예제의 수치는 numpy로 **직접 계산**해 확인했습니다.

## 이 글에서 다루는 것

- 파운데이션 모델과 파인튜닝의 필요성, 그리고 문제점
- 양자화: FP32 → FP16/BF16, INT8 absmax, NF4
- `BitsAndBytesConfig`로 양자화 모델 불러오기와 메모리 비교
- PEFT, LoRA, QLoRA

[LangChain·RAG·Agent 시리즈](/notes/llm/llm-langchain-overview)에서는 모델은 그대로 두고 **바깥**을 바꿨다. 프롬프트를 다듬고, RAG로 문서를 넣고, 도구를 붙였다. 이번 시리즈는 **모델 자체**를 바꾸는 파인튜닝이다. [Hugging Face 글](/notes/hf/hf-transfer-learning)에서 BERT 같은 작은 모델을 파인튜닝하는 전략을 봤다면, 여기서는 수억~수십억 파라미터 LLM을 개인 GPU로 파인튜닝하기 위한 기법들이 주제다.

## 파운데이션 모델과 파인튜닝

**파운데이션 모델**은 대규모 데이터로 사전 학습된 범용 모델이다.

| 특징 | 내용 |
|---|---|
| 대규모 데이터로 사전 학습 | 여러 주제·언어에 대한 일반 지식과 언어 패턴을 가짐 |
| 대규모 모델 | 대부분 Transformer 기반, 수십억~수조 파라미터. 클수록 표현력이 높다 |
| 범용성 | 생성, 요약, 번역, 질의응답 등 특정 작업에 국한되지 않음 |
| 프롬프트 기반 실행 | 추가 학습 없이 프롬프트만으로 다양한 태스크 수행 |
| 파인튜닝의 기반 | 기초 능력을 특정 도메인에 맞게 조정할 수 있음 |

수업 자료의 비유가 와닿는다. 파운데이션 모델이 초·중·고에서 폭넓은 기초를 배운 것이라면, 파인튜닝은 그 위에서 대학·대학원 전공(의료, 법률, 금융)을 공부하는 것이다.

### 왜 파인튜닝하나

- **특정 작업·도메인에 최적화**: 의료 기록으로 추가 학습한 의료 모델, 사내 문서로 학습한 사내 QA 모델
- **톤앤매너**: 브랜드 페르소나나 응대 매뉴얼을 학습해 일관된 말투와 형식
- **안전성**: 편향·유해 응답, 민감 정보 노출을 줄이도록 동작 제어

### 왜 어려운가

| 문제 | 내용 |
|---|---|
| 고성능 하드웨어 | 수십억 이상의 파라미터를 학습하려면 GPU 메모리가 많이 필요 |
| 긴 학습 시간 | 전처리, 학습, 평가 모두 오래 걸림 |
| 큰 비용 | 위 두 가지의 결과 |
| 도메인 한정성 | 파라미터가 바뀌며 범용 지식을 덮어쓸 수 있음 (catastrophic forgetting) |

> **보충**: 메모리가 왜 그렇게 많이 드는지 대략 계산해 보면, 파라미터 10억 개(1B) 모델을 FP32로 **전체 파인튜닝**할 때 가중치 4GB, 그래디언트 4GB, Adam 옵티마이저 상태(1차·2차 모멘트) 8GB로 이미 16GB다. 여기에 활성화값이 더해진다. 추론에는 가중치 4GB면 되는 모델이 학습에는 몇 배가 드는 것이다.

해결 방향은 두 가지다.

1. **모델을 작게** 만든다 → 양자화
2. **학습할 양을 줄인다** → PEFT (LoRA)

## 양자화

**양자화(Quantization)는 파라미터 값의 정보를 가능한 한 보존하면서 데이터 타입의 비트 수를 낮추는 변환**이다. 수업 자료의 비유로, "10시 28분 22초" 대신 "10시 반"이라고 해도 대부분의 상황에서는 충분하다. 학습할 때는 메모리를 줄여 더 큰 모델을 올리고, 추론할 때는 속도를 높이고 서버 비용을 줄인다.

### FP32 → FP16 / BF16

부동소수점은 값을 **지수**(표현 범위)와 **가수**(정밀도)로 나눠 저장한다. 1234 = 1.234 × 10³이면 지수 3, 가수 1.234다(실제로는 2진수).

| 타입 | 부호 | 지수 | 가수 | 특징 |
|---|---|---|---|---|
| FP32 | 1 | 8 | 23 | 기본 |
| FP16 | 1 | 5 | 10 | 크기 1/2. 지수가 줄어 **표현 범위가 좁다** → 큰 값/아주 작은 값에서 정보 손실 |
| BF16 | 1 | 8 | 7 | 크기 1/2. 지수를 FP32와 같게 유지해 **범위는 FP32 수준**, 정밀도는 낮음 |

![부동소수점 타입](/images/llm/fig-sllm-quantize1.png)

BF16(Brain Floating Point)은 Google Brain이 제안했다. 딥러닝에서는 값의 범위를 벗어나는 오버플로가 정밀도 손실보다 치명적이라, 학습에는 BF16이 많이 쓰인다(단, 지원하는 GPU에서).

### INT8: absmax 양자화

INT8은 −128~127의 정수 256개로 값을 표현한다. 가장 단순한 방법이 **absmax**다.

![absmax](/images/llm/fig-sllm-quantize2.png)

1. 텐서에서 **절댓값이 가장 큰 값**을 찾는다.
2. **스케일 팩터** $s = \frac{127}{\max(|W|)}$ 를 계산한다.
3. 각 값에 곱하고 반올림한다. $Q = \text{round}(W \times s)$
4. 계산할 때는 $Q / s$로 **역양자화**해서 FP16/BF16/FP32로 되돌린다.

```text
주어진 텐서: [1.2, -0.5, -4.3, 1.2, -3.1, 0.8, 2.4, 5.4]
최대 절대값: 5.4
스케일 팩터: 127 / 5.4 ≈ 23.5
양자화된 값: [28, -12, -101, 28, -73, 19, 56, 127]
역양자화:   [1.19, -0.51, -4.29, 1.19, -3.10, 0.81, 2.38, 5.40]
```

원래 값과 거의 같다. 8비트로 줄였는데 오차가 0.01 수준이다.

역양자화를 "전체 가중치를 FP16으로 다시 펼쳐 놓고 계산"하는 것은 아니다. GPU의 행렬곱 커널이 INT8 값을 작은 블록 단위로 읽어 그때그때 복원 → 곱셈 → 누산을 한 흐름(**fused operation**)으로 처리한다. 그래서 메모리에는 INT8만 올라가 있다.

**약점은 이상치(outlier)** 다. 값 하나가 크면 스케일 팩터가 작아지고 나머지 값들이 몇 개의 정수에 몰린다.

![absmax 이상치](/images/llm/fig-sllm-quantize3.png)

> **보충**: 위 텐서의 마지막 값 5.4를 54.0으로 바꿔 직접 계산해 보면 이렇다.
>
> ```text
> 스케일 팩터: 127 / 54 ≈ 2.35
> 양자화:     [3, -1, -10, 3, -7, 2, 6, 127]
> 역양자화:   [1.276, -0.425, -4.252, 1.276, -2.976, 0.85, 2.551, 54.0]
> ```
>
> 이상치 하나 때문에 나머지 7개 값이 −10~6 사이 정수 몇 개에 몰렸다. 1.2가 1.276으로, 2.4가 2.551로 오차가 커졌고, −128~127 범위 중 대부분을 쓰지 못하고 비워 두게 된다(공간 낭비).

보완책은 텐서 전체가 아니라 **K개씩 블록으로 묶어** 블록마다 absmax를 구하는 것이다. 이상치는 자기 블록에만 영향을 준다. bitsandbytes의 LLM.int8()은 여기에 더해 이상치 열을 아예 FP16으로 따로 계산한다(`llm_int8_threshold`).

### NF4: 4-bit NormalFloat

**NF4는 QLoRA 논문에서 제안한 4비트 데이터 타입**이다. 4비트면 값이 16개뿐인데, 그 16개를 **어디에 둘지**가 핵심이다.

신경망 가중치는 대체로 **0 근처에 몰린 정규분포**를 따른다. 그래서 16개의 대표값을 균등 간격이 아니라 **표준정규분포의 분위수**로 정한다. 데이터가 많은 0 근처는 촘촘하게, 드문 양 끝은 넓게.

<img src="/images/llm/fig-sllm-quantize4.png" width="350" alt="NF4 분위수">

1. 표준정규분포를 확률이 같은 16개 구간으로 나눈다.
2. 각 분위수의 x값을 대표값 후보로 삼는다.
3. 가중치에는 0이 매우 많으므로, 코드북에 **정확한 0이 포함되도록** 조정한다.
4. [−1, 1]로 정규화해 16개 대표값(코드북)을 만든다.

| 인덱스 | 4bit | NF4 대표값 |
|---|---|---|
| 0 | 0000 | −1.0000 |
| 1 | 0001 | −0.6962 |
| 2 | 0010 | −0.5251 |
| 3 | 0011 | −0.3949 |
| … | … | … |
| 12 | 1100 | 0.4407 |
| 13 | 1101 | 0.5626 |
| 14 | 1110 | 0.7229 |
| 15 | 1111 | 1.0000 |

실제 양자화는 **블록 단위**(QLoRA는 64개)로 한다. 가중치 6개를 한 블록이라고 하면:

| 원래 값 $w$ | 정규화 $w/1.8$ | 가장 가까운 NF4 값 | 인덱스 | 4bit |
|---:|---:|---:|---:|:---:|
| −1.80 | −1.0000 | −1.000000 | 0 | `0000` |
| −0.90 | −0.5000 | −0.525073 | 2 | `0010` |
| −0.35 | −0.1944 | −0.184773 | 5 | `0101` |
| 0.15 | 0.0833 | 0.079580 | 8 | `1000` |
| 0.80 | 0.4444 | 0.440710 | 12 | `1100` |
| 1.50 | 0.8333 | 0.722957 | 14 | `1110` |

저장하는 것은 인덱스 `[0, 2, 5, 8, 12, 14]`와 블록의 absmax `1.8`뿐이다. 복원은 $\hat{w}_i = s_b \cdot c_{q_i}$ (블록 스케일 × 코드북 값)이다.

```text
복원값: [-1.8, -0.9451, -0.3326, 0.1432, 0.7933, 1.3013]
```

1.5가 1.3013으로 복원된 것처럼 4비트의 오차는 INT8보다 크다. 그래도 학습된 지식의 대부분이 유지된다는 것이 QLoRA 논문의 결과다. **Double Quantization**은 블록마다 저장하는 absmax 값들까지 다시 양자화해 메모리를 더 줄인다.

## BitsAndBytesConfig로 양자화 모델 불러오기

```python
# uv venv .venv --python=3.13
# uv pip install bitsandbytes transformers accelerate hf_xet tqdm ipywidgets  ipykernel
```

| 파라미터 | 설명 |
|---|---|
| `load_in_4bit` | 4비트로 로딩 |
| `load_in_8bit` | INT8로 로딩 (4bit와 동시에 True면 4bit 우선) |
| `bnb_4bit_quant_type` | `"nf4"` 또는 `"fp4"`. LLM에는 nf4가 안정적 |
| `bnb_4bit_compute_dtype` | 계산할 때 역양자화할 타입 (`torch.bfloat16`/`float16`). 생략하면 float32 |
| `bnb_4bit_use_double_quant` | Double Quantization 적용 |
| `bnb_4bit_quant_storage` | 4비트 값을 담을 저장 타입. 메모리는 1바이트 단위로 할당되므로 보통 `uint8`에 4비트 두 개를 붙여 저장 |
| `llm_int8_threshold` | INT8에서 이상치로 판정할 임계값 (기본 6.0). 이상치는 FP16으로 보존 |
| `llm_int8_has_fp16_weight` | 이상치 가중치를 FP16으로 유지할지 |

### FP32 / FP16 / BF16

```python
import torch
from transformers import AutoModelForCausalLM

model_id = 'gpt2'
model_id = "Qwen/Qwen3.5-0.8B"

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    dtype=torch.float32
)

# model.get_memory_footprint(): 현재 모델이 사용하고 있는 메모리양을 바이트 단위로 반환
print(f"Model size: {model.get_memory_footprint():,} bytes, {model.get_memory_footprint()/1024/1024:,} MB") 
```

아래 셀은 에러가 나는 것이 정상이다. 수업 때 실행한 환경의 결과다.

```text
ValueError: The checkpoint you are trying to load has model type `qwen3_5` but Transformers does not recognize this architecture. This could be because of an issue with the checkpoint, or because your version of Transformers is out of date.
```

설치된 transformers가 Qwen3.5 아키텍처보다 오래된 버전이라 모델 구조를 몰랐다. 새 모델이 나오면 transformers도 그 모델 코드를 추가한 버전으로 올려야 한다(`uv pip install -U transformers`).

강사님 노트북의 결과다.

```python
#########################
# FP16 타입으로 로딩
#########################
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    dtype=torch.float16 
    # 모델을 메모리에 loading할때 weight의 타입을 지정한 타입(float16, bfloat16)으로 변환.
)
```

| dtype | 메모리 |
|---|---|
| FP32 | 2,870 MB |
| FP16 | 1,435 MB |
| BF16 | 1,435 MB |

FP16과 BF16은 같은 16비트라 크기가 같고, FP32의 정확히 절반이다. 2,870MB를 4바이트로 나누면 파라미터가 약 7.5억 개(0.75B)다. 모델 이름의 "0.8B"와 맞는다.

### INT8, NF4

```python
import torch 
from transformers import AutoModelForCausalLM

model_id = 'gpt2'

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="auto"
)

print(f"Model size: {model.get_memory_footprint():,} bytes, {model.get_memory_footprint()/1024/1024} MB") 
```

```text
Model size: 510,342,192 bytes, 486.7002410888672 MB
```

수업 때는 gpt2(124M)로 바꿔서 기본 FP32 크기를 확인했다.

```python
##################################################
# INT8 8bit 양자화 적용 후 메모리 크기
##################################################
from transformers import BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_8bit=True, # int 8  양자화
)

model_8bit = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map="auto"
)
```

아래 셀은 에러가 나는 것이 정상이다.

```text
AttributeError: 'frozenset' object has no attribute 'discard'
```

> **보충**: 이 에러는 사용자 코드가 아니라 라이브러리 내부에서 난 것이다. transformers와 bitsandbytes 버전이 서로 맞지 않을 때 이런 형태의 에러가 나는 경우가 많다. bitsandbytes는 CUDA GPU를 전제로 한 라이브러리라 Windows/CPU 환경에서는 지원이 제한적이기도 하다. 두 패키지를 함께 최신으로 맞추고(`uv pip install -U transformers bitsandbytes`), GPU가 잡히는지(`torch.cuda.is_available()`)부터 확인한다.

```python
##################################################
# NF4 4bit 양자화 적용 후 메모리 크기
##################################################

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type='nf4',
    bnb_4bit_compute_dtype=torch.bfloat16,  # 연산시 복원하는 dtype 지정. 생략하면 float32로 복원.
)

model_4bit = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map="auto"
)
print(f"model_4bit Model size: {model_4bit.get_memory_footprint():,} bytes, {model_4bit.get_memory_footprint()/1024/1024:,} MB")
```

강사님 노트북(Qwen3.5-0.8B)의 결과까지 합치면:

| 방식 | 메모리 | FP32 대비 |
|---|---|---|
| FP32 | 2,870 MB | 100% |
| FP16 / BF16 | 1,435 MB | 50% |
| INT8 | 961 MB | 33% |
| NF4 | 723 MB | 25% |

INT8이 이론상 25%, NF4가 12.5%여야 하는데 실제로는 그보다 크다. 양자화하지 않고 남겨 두는 층이 있기 때문이다. 임베딩 층과 출력층(`lm_head`), LayerNorm 같은 층은 정밀도에 민감해서 bitsandbytes가 기본적으로 원래 타입으로 둔다. 0.8B처럼 작은 모델은 전체 중 임베딩이 차지하는 비중이 커서 이 차이가 더 크게 드러난다. 모델이 클수록 실제 비율이 이론값에 가까워진다.

## PEFT와 LoRA

**PEFT(Parameter-Efficient Fine-Tuning)** 는 일부 파라미터만 학습해서, 성능은 유지하면서 계산량과 메모리를 줄이는 방법들의 총칭이다. Adapter Tuning, Prompt Tuning 등이 있고, 가장 널리 쓰이는 것이 **LoRA**다.

### LoRA (Low-Rank Adaptation)

**LoRA는 사전학습 가중치 $W$를 동결하고, 옆에 작은 두 행렬로 된 어댑터 $\Delta W = BA$만 학습한다.**

![LoRA](/images/llm/fig-sllm-lora.png)

- $A$: $r \times d_{in}$, $B$: $d_{out} \times r$, $r \ll d$
- 입력을 $W$와 어댑터에 각각 통과시켜 결과를 더한다: $h = Wx + \frac{\alpha}{r} BAx$

$d = 100$이면 $W$는 파라미터 10,000개다. $r = 8$인 어댑터는 $8 \times 100 + 100 \times 8 = 1{,}600$개. 학습할 파라미터가 16%로 줄었다. 실제 LLM의 $d$는 수천이라 비율은 훨씬 더 작아진다($d = 4096, r = 8$이면 0.4%).

> **보충**: "저랭크"라는 이름의 의미는, 파인튜닝으로 생기는 가중치의 **변화량** $\Delta W$가 큰 행렬이어도 실제 정보는 소수의 방향에 몰려 있어서 랭크 $r$짜리 행렬로 충분히 근사된다는 가정이다. LoRA 논문은 $r$이 1~8처럼 작아도 전체 파인튜닝과 비슷한 성능이 나온다는 것을 보였다. 또 $B$를 0으로 초기화하기 때문에 학습 시작 시점의 모델은 원래 모델과 완전히 같다.

모델 전체 파라미터는 어댑터만큼 조금 늘지만, 학습할 때 **그래디언트와 옵티마이저 상태는 어댑터에 대해서만** 필요하다. 앞의 계산에서 16GB 중 12GB가 그래디언트와 옵티마이저였으니, 이 부분이 거의 사라진다.

| 설정 | 의미 |
|---|---|
| `r` | 어댑터 행렬의 랭크. 클수록 표현력과 파라미터가 늘어난다 |
| `alpha` | 어댑터 출력에 곱하는 배율 $\alpha / r$. 클수록 새로 학습한 부분을 크게 반영 ($\alpha=16, r=8$이면 2배) |
| 적용 위치 (`target_modules`) | Transformer의 어느 선형층에 붙일지. Self-Attention의 query·key·value·output, FFN 층 중 일부 또는 전체 |

### QLoRA

**QLoRA는 동결된 베이스 모델을 NF4로 양자화한 뒤, 그 위에서 LoRA 어댑터만 학습**한다.

- 4비트 모델을 통과하며 그래디언트를 흘려보내고, 업데이트는 어댑터에만 일어난다.
- 계산할 때는 `bnb_4bit_compute_dtype`(BF16)로 역양자화해서 정밀도를 확보한다.

| 방식 | 베이스 모델 | 학습 대상 | 메모리 |
|---|---|---|---|
| Full Fine-tuning | FP32/BF16 | 전체 파라미터 | 매우 큼 |
| LoRA | FP16/BF16 (동결) | 어댑터만 | 중간 |
| QLoRA | **NF4** (동결) | 어댑터만 | 작음 |

양자화로 모델을 작게, LoRA로 학습할 양을 적게. 개요의 두 해결 방향을 한 번에 쓴 것이 QLoRA다. 이 시리즈의 실습은 2.1B 모델을 BF16으로 불러 LoRA만 적용한다. 그 정도 크기는 양자화 없이도 GPU 하나에 올라가기 때문이다. 더 큰 모델에서 메모리가 모자라면 `BitsAndBytesConfig`의 NF4 설정을 붙여 QLoRA로 바꾸면 된다.

## 정리

| 기법 | 무엇을 줄이나 | 핵심 |
|---|---|---|
| FP16 / BF16 | 가중치 크기 1/2 | BF16은 범위를 FP32와 같게 유지 |
| INT8 (absmax) | 가중치 크기 1/4 | 이상치에 약함 → 블록 단위, 이상치는 FP16 |
| NF4 | 가중치 크기 1/8 | 정규분포 분위수로 만든 16개 대표값 + 블록 absmax |
| LoRA | 학습할 파라미터 | $W$ 동결, $\Delta W = BA$만 학습 |
| QLoRA | 둘 다 | NF4 베이스 + LoRA 어댑터 |

- 학습 메모리의 대부분은 가중치가 아니라 **그래디언트와 옵티마이저 상태**다. LoRA가 그 부분을 줄인다.
- 양자화 결과는 이론값보다 크다. 임베딩·출력층 같은 민감한 층은 원래 정밀도로 남는다.
- 새 모델 아키텍처는 transformers 버전을, 양자화는 bitsandbytes·GPU 환경을 먼저 확인한다.

다음 글에서는 파인튜닝에 쓸 데이터셋을 Hugging Face Datasets로 만든다.
