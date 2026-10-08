---
title: "신경망 구조: 레이어·활성 함수·손실 함수·역전파"
description: "신경망의 구성요소인 유닛과 레이어, 은닉층에 비선형성을 주는 활성 함수(Sigmoid·Tanh·ReLU·Leaky ReLU·Softmax), 문제 유형별 출력층과 손실 함수, 계산 그래프와 연쇄 법칙으로 이해하는 역전파, 미니배치 경사하강법과 Adam 등 옵티마이저를 정리하고, Universal Approximation Theorem을 직접 실험합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '딥러닝'
seriesOrder: 5
originalNotebook: "05_신경망 구조.ipynb, 05_Universal_Approximation_Theorem.ipynb"
tags: ["Python","PyTorch","Activation Function","Backpropagation","Optimizer"]
date: 2026-06-08
---

> SKN31 딥러닝 과정 노트북 `05_신경망 구조.ipynb`와 `05_Universal_Approximation_Theorem.ipynb`를 바탕으로 정리했습니다.
> 코드는 PyTorch 2.5(CPU)에서 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 신경망의 구성요소: 모델, 손실 함수, 옵티마이저
- 유닛(Unit)과 레이어(Layer), 모델(Network)
- 활성 함수: Sigmoid, Tanh, ReLU, Leaky ReLU, Softmax
- Universal Approximation Theorem 실험
- 문제 유형별 출력층 활성 함수와 손실 함수
- 계산 그래프, 연쇄 법칙, 역전파
- 배치 경사하강법과 미니배치, 주요 옵티마이저

앞 글의 MNIST 코드에서 "일단 이렇게 쓴다"고 넘어간 것들(`ReLU`, `CrossEntropyLoss`, `Adam`, `backward()`)이 이 글에서 하나씩 설명된다.

## 신경망 구성요소

![학습 프로세스: 입력 → 모델 → 예측 → 손실 함수 → 옵티마이저가 파라미터 업데이트](/images/dl/fig-train-process.png)

| 구성요소 | 역할 |
|---|---|
| **Model / Network** | 데이터의 패턴을 학습해 새 데이터를 추론하는 함수. 딥러닝 모델은 Network라고도 한다 |
| **Loss Function** (손실 함수) | 모델의 추론 결과와 정답(Ground truth) 사이의 손실(오차)을 계산한다 |
| **Optimizer** (옵티마이저) | 손실이 줄어들도록 모델의 파라미터(weight)를 업데이트한다 |

## 유닛 / 노드 / 뉴런 (Unit, Node, Neuron)

- 데이터에서 추출한 **특성 하나**와, 그 특성을 추출하는 함수를 유닛이라고 한다
- 입력 feature들에 weight를 곱하고 bias를 더한 결과를 **활성 함수(Activation function)** 에 넣어 비선형성을 더한 뒤 출력한다

![유닛: 입력 × 가중치 + 편향 → 활성 함수 → 출력](/images/dl/fig-unit.png)

$$
z = w_1 x_1 + w_2 x_2 + w_3 x_3 + b = \mathbf{w}^T \mathbf{x} + b, \qquad a = \sigma(z)
$$

선형 회귀 글의 Unit에 활성 함수 $\sigma$ 하나가 더해졌다.

## 레이어 / 층 (Layer)

- 하나의 입력에서 추출한 여러 유닛을 묶은 것이 Layer다
  - 유닛 하나는 특성 하나다. 정확한 추론을 위해서는 많은 특성을 추출해야 해서, 유닛을 만드는 함수들을 묶어 한 입력에서 여러 특성을 뽑는다
  - 모델은 Layer 단위로 정의한다

| Layer | 역할 |
|---|---|
| **Input Layer** (입력층) | 모델에 들어가는 입력 데이터의 feature들 |
| **Hidden Layer** (은닉층) | 입력층과 출력층 사이. 정답을 추론하기 위해 추출한 특성값들(feature vector). 한 번에 찾지 않고 여러 단계에 걸쳐 찾는다 |
| **Output Layer** (출력층) | 모델의 최종 예측 결과 유닛들 |

- Layer들을 연결한 것이 **딥러닝 모델(Network)** 이다. 딥러닝은 Layer를 **깊게** 쌓은 것이다
- 목적에 따라 다양한 Layer가 있다

| Layer | 주 용도 |
|---|---|
| Fully Connected Layer (Dense, `nn.Linear`) | 추론 단계 |
| Convolution Layer | 이미지 특성 추출 |
| Recurrent Layer | 순차(Sequential) 데이터 특성 추출 |
| Embedding Layer | 텍스트 특성 추출 |

API: [pytorch.org/docs/stable/nn.html](https://pytorch.org/docs/stable/nn.html)

앞 글의 MNIST 모델로 보면, 입력층 784(픽셀) → 은닉층 128 → 64 → 32 → 출력층 10(클래스)이다.

## 모델 (Network)

- Layer를 연결한 것이 딥러닝 모델이다
- 각 Layer는 이전 Layer의 Node들을 입력으로 받아 처리한다
- 적절한 구조(architecture)를 찾는 일은 **공학(Engineering)이라기보다 경험(Art)** 에 가깝다

![입력층 - 은닉층 - 출력층으로 연결된 모델 구조](/images/dl/fig-model-structure.png)

MNIST 모델의 128, 64, 32 같은 숫자에 정답이 없다는 뜻이다. 여러 구조를 시도해 보고 검증 성능으로 고른다.

## 활성 함수 (Activation Function)

- 선형 계산 결과(unit)에 **비선형성**을 더하는 함수: $\text{Node} = \text{activation}(X \cdot W + b)$
- Layer 단위로 설정해서 그 Layer의 모든 unit에 같은 함수를 적용한다

**목적**

- **출력층**: 풀려는 문제에 맞춰 정한다
- **은닉층**: **비선형성**을 준다. 비선형 함수를 쓰지 않으면 Layer를 여러 개 쌓는 의미가 없어진다. 주로 **ReLU**를 쓴다

> **보충** 선형 함수를 아무리 겹쳐도 선형 함수다. $W_2(W_1 x + b_1) + b_2 = (W_2 W_1)x + (W_2 b_1 + b_2)$로 정리되니, Linear 100개를 쌓아도 Linear 하나와 표현력이 같다. 그 사이에 비선형 함수가 끼어야 층마다 다른 모양의 특성을 만들 수 있다. 아래 Universal Approximation Theorem 실험에서 직접 확인한다.

주요 활성 함수를 직접 그려 본다.

```python
# 보충: 주요 활성 함수 그래프
import torch.nn as nn
z = torch.linspace(-6, 6, 200)
funcs = {
    "Sigmoid": nn.Sigmoid(),
    "Tanh": nn.Tanh(),
    "ReLU": nn.ReLU(),
    "Leaky ReLU (α=0.1)": nn.LeakyReLU(0.1),
}
fig, axes = plt.subplots(1, 4, figsize=(16, 3.5))
for ax, (name, f) in zip(axes, funcs.items()):
    ax.plot(z, f(z))
    ax.axhline(0, color="gray", linewidth=0.5); ax.axvline(0, color="gray", linewidth=0.5)
    ax.set_title(name); ax.grid(True, linestyle=":")
plt.tight_layout()
plt.show()
```

![그래프 출력](/images/dl/dl-neural-network-1.png)

### Sigmoid (logistic function)

$$
\sigma(z) = \frac{1}{1 + e^{-z}}, \qquad 0 < \sigma(z) < 1
$$

- 초기 딥러닝에서 은닉층 활성 함수로 많이 썼다
- 층을 깊게 쌓으면 **기울기 소실(Gradient Vanishing)** 문제로 학습이 안 된다
- **이진 분류 모델의 출력층** 활성 함수로 쓴다. 양성(1)일 확률을 출력하도록 unit 1개 + sigmoid로 만든다
- 은닉층에는 잘 쓰지 않는다

> **기울기 소실(Gradient Vanishing)**: 최적화 과정에서 gradient가 0에 가까워져 **Bottom Layer**(입력층에 가까운 층)의 가중치가 학습되지 않는 현상. Top Layer는 출력층에 가까운 층이다.

> **보충** sigmoid의 기울기는 최대 0.25(z = 0일 때)다. 역전파는 층마다 기울기를 **곱해** 내려가는데, 0.25보다 작은 값을 10번 곱하면 0.25¹⁰ ≈ 0.000001이 된다. 입력층 쪽 가중치는 거의 움직이지 않게 된다.

### Hyperbolic tangent (Tanh)

$$
\tanh(z) = \frac{e^{z} - e^{-z}}{e^{z} + e^{-z}}, \qquad -1 < \tanh(z) < 1
$$

- sigmoid보다 기울기 소실을 완화한다 (기울기 최대 1)
- RNN의 활성 함수로 쓴다
- 출력값 범위가 -1 ~ 1인 경우 출력층 활성 함수로 쓴다

### ReLU (Rectified Linear Unit)

$$
\text{ReLU}(z) = \max(0, z)
$$

- 기울기 소실 문제를 어느 정도 해결했다. 양수 구간의 기울기가 항상 1이다
- 0 이하 값에서는 출력과 기울기가 0이라 뉴런이 죽는 단점이 있다 (**Dying ReLU**)

### Leaky ReLU

$$
\text{LeakyReLU}(z) = \max(\alpha z, z), \qquad 0 < \alpha < 1
$$

- Dying ReLU를 해결하려고 나온 함수
- 음수를 0으로 만들지 않고 α(0~1 사이 실수)를 곱해 반환한다. 위 그래프의 왼쪽이 0이 아니라 살짝 기울어져 있다

### Softmax

$$
\text{Softmax}(z_j) = \frac{\exp(z_j)}{\sum_{k=1}^{K} \exp(z_k)}, \qquad j = 1, \ldots, K
$$

- **다중 분류 모델의 출력층** 활성 함수로 쓴다. 은닉층에는 쓰지 않는다
- 출력 Node들을 정규화해서 **확률**로 바꾼다. 각 값은 0~1이고 합은 1이다
- 분류 모델 출력을 확률로 바꾸기 전 값을 **logit**이라고 한다

```python
# 보충: logit -> softmax -> 확률
logit = torch.tensor([2.0, 1.0, 0.1, -1.0])
prob = torch.softmax(logit, dim=0)
print("logit:", logit)
print("확률 :", prob, "합:", prob.sum().item())
print("argmax:", logit.argmax().item(), prob.argmax().item())
```

```text
logit: tensor([ 2.0000,  1.0000,  0.1000, -1.0000])
확률 : tensor([0.6381, 0.2347, 0.0954, 0.0318]) 합: 1.0000001192092896
argmax: 0 0
```

softmax를 거쳐도 가장 큰 값의 위치(argmax)는 그대로다. 앞 글에서 logit에 바로 `argmax`를 써도 됐던 이유다.

API: [Non-linear Activations](https://pytorch.org/docs/stable/nn.html#non-linear-activations-weighted-sum-nonlinearity)

## Universal Approximation Theorem

> 비선형 활성 함수가 있는 **은닉층 하나**만 있으면, 신경망으로 **어떤 함수든** 근사할 수 있다는 이론

복잡한 함수 하나를 정하고, 은닉층 하나짜리 신경망이 정말 따라 그릴 수 있는지 실험한다.

```python
import numpy as np
import matplotlib.pyplot as plt

import torch
import torch.nn as nn

device = "cuda" if torch.cuda.is_available() else "cpu"
```

```python
def func(x):
    """
    근사시키려는 함수
    """
    return 7*np.sin(x)*np.cos(x)*(2*x**2+5*x**3+x**2)*np.tan(x)+120
```

```python
x = np.linspace(-10, 10, 100)
y = func(x)
```

```python
plt.plot(x, y)
plt.show()
```

![그래프 출력](/images/dl/dl-neural-network-2.png)

```python
X_train = torch.tensor(x, dtype=torch.float32).unsqueeze(dim=1).to(device)
y_train = torch.tensor(y, dtype=torch.float32).unsqueeze(dim=1).to(device)

X_train.shape, y_train.shape
```

```text
(torch.Size([100, 1]), torch.Size([100, 1]))
```

입력 1개 → 은닉층 10,000 unit + Sigmoid → 출력 1개인 모델이다. Layer를 순서대로 쌓기만 하면 되니 `nn.Sequential`로 만든다.

```python
# 모델
model = nn.Sequential(
    nn.Linear(1, 10000),
    # nn.ReLU(),
    nn.Sigmoid(),
    nn.Linear(10000, 1)
).to(device)

loss_fn = nn.MSELoss()
optimizer = torch.optim.RMSprop(model.parameters(), lr=0.01)
```

```python
# 학습
model.train()
for epoch in range(5000):
    # 추론
    pred = model(X_train)
    # 오차
    loss = loss_fn(pred, y_train)
    # grandient
    loss.backward()
    # 파라미터 업데이트
    optimizer.step()
    # 파라미터 초기화
    optimizer.zero_grad()
print("완료")
```

```text
완료
```

```python
y_pred = model(X_train)
```

```python
# y_pred값을 ndarray로 변환
## 1. device를 cpu로 이동.
## 2. grad_fn 있는 경우 제거.
y_pred_array = y_pred.to("cpu").detach().numpy().flatten()
```

> **보충** `requires_grad`가 있는 tensor는 바로 `.numpy()`로 바꿀 수 없다. `detach()`로 계산 그래프에서 떼어 낸 뒤 변환한다. 처음부터 `with torch.no_grad():` 안에서 추론했다면 `detach()`가 필요 없다.

```python
y_pred_array.shape
```

```text
(100,)
```

```python
plt.plot(x, y, label="정답")
plt.plot(x, y_pred_array, label="추론")
plt.legend()
plt.show()
```

![그래프 출력](/images/dl/dl-neural-network-3.png)

은닉층 하나로 크게 출렁이는 함수를 따라 그렸다.

같은 구조에서 **활성 함수만 빼고** 나란히 비교해 본다.

```python
# 보충: 같은 구조, 활성 함수 유무만 다르게
def fit(model, epochs=5000):
    opt = torch.optim.RMSprop(model.parameters(), lr=0.01)
    for _ in range(epochs):
        loss = loss_fn(model(X_train), y_train)
        loss.backward(); opt.step(); opt.zero_grad()
    with torch.no_grad():
        return model(X_train).numpy().flatten(), loss.item()

torch.manual_seed(0)
linear_only, loss_lin = fit(nn.Sequential(nn.Linear(1, 10000), nn.Linear(10000, 1)))

plt.plot(x, y, label="정답")
plt.plot(x, y_pred_array, label="Sigmoid 있음")
plt.plot(x, linear_only, label="활성 함수 없음")
plt.legend()
plt.show()
print(f"활성 함수 없음 MSE: {loss_lin:.1f}, Sigmoid 있음 MSE: {loss_fn(y_pred, y_train).item():.1f}")
```

```text
활성 함수 없음 MSE: 17490930.0, Sigmoid 있음 MSE: 1968468.1
```

![그래프 출력](/images/dl/dl-neural-network-4.png)

y 값의 범위가 ±15,000 정도라 MSE 숫자 자체는 크지만, 활성 함수가 없으면 오차가 약 9배다. unit이 10,000개여도 활성 함수가 없으면 **직선 하나**밖에 못 그린다. 위 보충에서 정리한 "선형을 겹쳐도 선형"이 그래프로 확인된다.

> **보충** 이론은 "근사할 수 있는 신경망이 **존재한다**"는 것이지, 학습으로 그 가중치를 **찾을 수 있다**거나 처음 보는 x에서도 잘 맞는다는 보장은 아니다. 은닉층 하나에 unit을 엄청 늘리는 것보다, 층을 여러 개 쌓는 편이 같은 파라미터 수로 더 복잡한 패턴을 효율적으로 표현한다. 그래서 "깊은(deep)" 학습이다.

## 손실 함수 (Loss function)

- 모델의 예측값 $\hat{y}^{(i)}$와 정답 $y^{(i)}$ 사이의 **오차를 계산**하는 함수
- 학습하는 동안 손실이 최소화되도록 파라미터를 업데이트한다. 손실 함수가 최적화의 시작점이다
- **문제 종류마다 표준적인 손실 함수가 있다**

### 분류: Cross Entropy (log loss)

$$
-\log(\text{모델이 출력한 정답에 대한 확률})
$$

**이진 분류 (Binary classification)**

- 특정 클래스인지 아닌지 추론한다. 모델은 양성(1)일 확률을 출력하고, 임계값(보통 0.5)과 비교해 0/1로 후처리한다
- 출력층: unit **1개** + **sigmoid**
- 손실 함수: **binary crossentropy**, `nn.BCELoss()`

$$
\text{Loss}(\hat{y}, y) = -y \log(\hat{y}) - (1 - y)\log(1 - \hat{y})
$$

**다중 분류 (Multi-class classification)**

- 여러 클래스 중 하나를 예측한다. 모델은 클래스별 확률을 출력한다
- 손실 함수: **categorical crossentropy**, `nn.CrossEntropyLoss()`

$$
\text{Loss}(\hat{y}, y) = -\sum_{c=1}^{C} y_c \log(\hat{y}_c)
$$

`nn.CrossEntropyLoss()`의 계산 순서

1. 정답을 원핫 인코딩한다. 정답은 **레이블 인코딩** 상태(0, 1, 2, ...)로 넣는다
2. 모델 예측에 softmax를 적용해 확률로 바꾼다. 그래서 모델 출력은 **softmax 적용 전 값(logit)** 으로 넣는다
3. categorical crossentropy 공식으로 오차를 계산한다

```python
# 보충: CrossEntropyLoss = softmax -> 정답 확률에 -log
logit = torch.tensor([[2.0, 1.0, 0.1]])   # 모델 출력 (logit), 샘플 1개
target = torch.tensor([0])                 # 정답: 0번 클래스 (레이블 인코딩)
print("CrossEntropyLoss:", nn.CrossEntropyLoss()(logit, target).item())
print("직접 계산      :", -torch.log(torch.softmax(logit, dim=1)[0, 0]).item())
```

```text
CrossEntropyLoss: 0.4170299470424652
직접 계산      : 0.4170299768447876
```

> **보충** 모델 마지막에 softmax를 또 넣으면 softmax가 두 번 적용돼 학습이 느려지고 성능이 떨어진다. `BCELoss`는 반대로 sigmoid를 **적용한 확률**을 받는다. sigmoid까지 포함한 `nn.BCEWithLogitsLoss()`를 쓰면 출력층에 sigmoid 없이 logit을 넣을 수 있고 수치적으로도 더 안정적이다.

### 회귀: MSE

- 정답이 연속형 수치인 경우 (주가, 집값, 점수)
- **Mean squared error**, `nn.MSELoss()`

$$
\text{Loss}(\hat{y}, y) = \frac{1}{2}(\hat{y} - y)^2
$$

API: [Loss Functions](https://pytorch.org/docs/stable/nn.html#loss-functions)

### 문제별 출력층 활성 함수와 손실 함수

| 문제 | 출력 unit 수 | 출력 활성 함수 | 손실 함수 (PyTorch) |
|---|---|---|---|
| 이진 분류 | 1 | sigmoid | binary crossentropy (`BCELoss`) |
| 다중 분류 | 클래스 수 | softmax | categorical crossentropy (`CrossEntropyLoss`, softmax 내장) |
| 회귀 | 예측할 값 수 | 없음 | MSE (`MSELoss`) |

이 표가 다음다음 글(문제 유형별 모델)의 설계도다.

## Optimizer (최적화)

- 학습할 때 모델이 정답에 가까운 추론을 하도록 파라미터(weight, bias)를 최적화하는 알고리즘
- 딥러닝은 **경사하강법(Gradient Descent)** 과 **오차 역전파(Back Propagation)** 를 기반으로 최적화한다

### 경사하강법

- 손실 함수의 출력을 줄이도록 파라미터를 업데이트하는 과정이 **최적화**다
- 파라미터에 대한 손실 함수의 gradient를 구해, gradient의 **반대 방향**으로 일정 크기만큼 업데이트한다

$$
W_{new} = W - \alpha \frac{\partial \text{Loss}(W)}{\partial W} \quad (\alpha: \text{학습률})
$$

머신러닝 시리즈의 경사하강법 글에서 직접 구현한 공식 그대로다. 다른 점은 파라미터가 수십만 개라는 것이고, 이걸 효율적으로 미분하는 방법이 역전파다.

### 오차 역전파 (Back Propagation)

- 추론의 **역방향**으로 loss를 전달하며 단계적으로 파라미터를 업데이트한다
  - loss에서부터(뒤에서부터) 한 단계씩 미분해 gradient를 구하고, **연쇄 법칙(Chain rule)** 으로 곱해 가며 최적화한다
- 출력에서 입력 방향으로 계산해서 역전파, 추론처럼 입력에서 출력 방향으로 계산하는 건 **순전파(Forward propagation)** 다

### 계산 그래프 (Computational Graph)

- 계산 과정을 **그래프** 자료구조로 표현한 것. 복잡한 계산을 순서대로 나눠 표현한다
- **노드**: 연산, **엣지**: 피연산자 값의 흐름
- **딥러닝 모델은 계산 그래프로 구성된다**

예: 개당 100원인 사과 2개를 사고 부가세 10%가 붙으면 얼마를 낼까?

![사과 100원 × 2개 × 부가세 1.1 = 220원의 계산 그래프](/images/dl/fig-compute-graph.png)

- 계산 그래프로 푸는 절차: 그래프를 구성 → 계산 방향을 정한다
  - 시작에서 결과 방향: **순전파**
  - 결과에서 시작 방향: **역전파**
- 장점
  - **국소적 계산**: 각 노드는 자기와 관계된 입력만으로 계산해 다음으로 넘긴다
  - 복잡한 계산을 단계로 나눠 단순하게 만든다. **딥러닝에서 각 가중치의 미분을 효율적으로 계산할 수 있게 해 준다**
  - 중간 계산 결과를 보관할 수 있다

텐서 글의 `grad_fn`이 바로 이 계산 그래프의 노드다. 순전파하면서 PyTorch가 그래프를 만들어 두고, `backward()`가 그 그래프를 거꾸로 따라간다.

### 합성함수와 연쇄 법칙

**합성함수**: 함수의 결과를 다른 함수의 입력으로 넣는 함수

```python
def f1(x):
    pass

def f2(x):
    pass

r1 = f1(10)
result = f2(r1)

result = f2(f1(x))
```

![집합 X를 함수 f, g를 차례로 거쳐 Z로 보내는 합성함수](/images/dl/fig-composition-function.png)

$$
z = (x + y)^2 \quad\Rightarrow\quad z = t^2,\ \ t = x + y
$$

**연쇄 법칙 (Chain Rule)**: 합성함수의 미분은 구성하는 각 함수의 미분의 **곱**이다.

$$
\frac{\partial z}{\partial x} = \frac{\partial z}{\partial t}\frac{\partial t}{\partial x} = 2t \times 1 = 2(x + y)
$$

![연쇄 법칙을 계산 그래프 위에서 역방향으로 전달](/images/dl/fig-computation-graph.png)

```python
# 보충: autograd로 연쇄 법칙 확인 (x=1, y=2 -> dz/dx = 2(x+y) = 6)
x = torch.tensor(1.0, requires_grad=True)
y = torch.tensor(2.0, requires_grad=True)
t = x + y
z = t ** 2
z.backward()
print("dz/dx:", x.grad.item(), " 공식 2(x+y):", 2 * (1 + 2))
```

```text
dz/dx: 6.0  공식 2(x+y): 6
```

### 딥러닝 네트워크에서의 최적화 예

입력 3개, 은닉층 unit 2개(sigmoid), 출력 1개인 네트워크다.

![입력 3개 → 은닉 2개 → 출력 1개 네트워크](/images/dl/fig-backprop1.png)

$$
\begin{aligned}
z_{11} &= x_1 w_{11} + x_2 w_{12} + x_3 w_{13} \\
a_{11} &= \sigma(z_{11}) = \frac{1}{1 + e^{-z_{11}}} \\
z_2 &= a_{11} w_{21} + a_{12} w_{22} \\
a_2 &= z_2 \\
L &= (y - a_2)^2
\end{aligned}
$$

$w_{11}$을 업데이트하려면 $\frac{\partial L}{\partial w_{11}}$이 필요하다. $L$에서 $w_{11}$까지 거꾸로 따라가며 각 단계의 미분을 곱한다.

![L에서 w11까지 역방향으로 미분을 전달하는 경로](/images/dl/fig-backprop2.png)

$$
\frac{\partial L}{\partial w_{11}} =
\underbrace{\frac{\partial L}{\partial a_2}}_{-2(y - a_2)} \cdot
\underbrace{\frac{\partial a_2}{\partial z_2}}_{1} \cdot
\underbrace{\frac{\partial z_2}{\partial a_{11}}}_{w_{21}} \cdot
\underbrace{\frac{\partial a_{11}}{\partial z_{11}}}_{\sigma(z_{11})(1 - \sigma(z_{11}))} \cdot
\underbrace{\frac{\partial z_{11}}{\partial w_{11}}}_{x_1}
$$

네 번째 항 $\sigma(1-\sigma)$가 sigmoid의 기울기이고 최대 0.25다. 층이 깊어지면 이런 항이 계속 곱해져서 기울기 소실이 생긴다.

- **순전파**: 추론
- **역전파**: 학습할 때 파라미터 업데이트

## 파라미터 업데이트 단위

![배치 경사하강법은 전체 데이터로 1번, 미니배치는 batch마다 업데이트](/images/dl/fig-batch.png)

| | Batch Gradient Descent | Mini Batch Stochastic Gradient Descent |
|---|---|---|
| loss 계산 단위 | **전체** 학습 데이터의 평균 | 지정한 **batch size**만큼 |
| 업데이트 횟수 | epoch당 1번 | epoch당 (데이터 수 / batch size)번 |
| 장점 | 방향이 안정적 | 계산이 빠르고 메모리를 적게 쓴다 |
| 단점 | 계산량이 많아 느리고 메모리가 부족할 수 있다 | 방향이 불안정하다. 반복을 늘리면 배치 방식과 비슷하게 수렴한다 |

> **스텝(Step)**: 파라미터를 한 번 업데이트하는 단위

MNIST 글에서 batch size 256으로 1 epoch에 234번 업데이트한 게 미니배치 경사하강법이다.

## SGD 기반 주요 옵티마이저

| 개선 방향 | 옵티마이저 | 아이디어 |
|---|---|---|
| 방향성 | **Momentum** | 이전 step들의 gradient를 누적해 더한다. 관성처럼 같은 방향으로 계속 가려는 성질 |
| 학습률 | **Adagrad** | 파라미터마다 다른 학습률. 많이 업데이트된 파라미터일수록 학습률을 줄인다 (이전 기울기 제곱 누적의 제곱근 역수를 곱함) |
| 학습률 | **RMSProp** | Adagrad는 누적값이 계속 커져 학습률이 0에 수렴한다. 지수 가중 이동 평균으로 최근 기울기를 더 크게 반영해 해결했다 |
| 방향성 + 학습률 | **Adam** | Momentum + RMSProp |

![옵티마이저 계보: SGD에서 방향(Momentum, NAG)과 학습률(Adagrad, RMSProp) 개선이 Adam으로 합쳐진다](/images/dl/fig-optimizer.png)

*출처: [slideshare.net/yongho/ss-79607172](https://www.slideshare.net/yongho/ss-79607172)*

API: [torch.optim](https://pytorch.org/docs/stable/optim.html)

> **보충** 처음 시작할 때는 **Adam**(lr 0.001 근처)이 무난한 기본값이라, MNIST 글에서도 Adam을 썼다. 위 Universal Approximation 실험은 RMSProp을 썼다. 데이터와 모델에 따라 SGD + Momentum이 최종 성능은 더 좋은 경우도 있어서 결국 실험으로 고른다.

## 정리

- 신경망 학습 = **모델**이 추론 → **손실 함수**가 오차 계산 → **옵티마이저**가 파라미터 업데이트
- 유닛은 `활성함수(가중합 + 편향)`, 유닛을 묶은 게 레이어, 레이어를 쌓은 게 모델이다
- 은닉층에는 **비선형 활성 함수**(주로 ReLU)가 있어야 층을 쌓는 의미가 있다. 활성 함수가 없으면 unit 1만 개도 직선 하나다
- 출력층과 손실 함수는 문제로 정해진다: 이진 분류 sigmoid + BCE, 다중 분류 softmax + CrossEntropy, 회귀 활성 함수 없음 + MSE
- 역전파는 계산 그래프를 거꾸로 따라가며 **연쇄 법칙**으로 미분을 곱한다. sigmoid처럼 기울기가 작은 함수를 깊게 쌓으면 기울기 소실이 생긴다
- 미니배치 단위로 업데이트하고, 옵티마이저는 Adam으로 시작하는 게 무난하다
