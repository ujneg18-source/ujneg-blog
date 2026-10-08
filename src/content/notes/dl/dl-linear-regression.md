---
title: "PyTorch 선형 회귀: 직접 구현에서 nn.Linear까지"
description: "온도·강수량·습도로 사과와 오렌지 수확량을 예측하는 다중 입력·다중 출력 선형 회귀를 PyTorch로 구현합니다. weight와 bias를 tensor로 직접 만들고 autograd로 학습시킨 뒤, 같은 모델을 nn.Linear·MSELoss·SGD optimizer로 다시 만들어 학습 루프의 5단계를 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '딥러닝'
seriesOrder: 3
originalNotebook: "03_pytorch_linear_regression.ipynb"
tags: ["Python","PyTorch","Linear Regression","nn.Linear","Optimizer"]
date: 2026-06-04
---

> SKN31 딥러닝 과정 노트북 `03_pytorch_linear_regression.ipynb`를 바탕으로 정리했습니다.
> 코드는 PyTorch 2.5(CPU)에서 실행한 결과입니다. 가중치 초기값이 난수라 loss 값은 노트북과 다릅니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 선형 회귀 모델을 tensor와 autograd로 직접 구현하기
- 다중 입력·다중 출력, Unit과 Layer
- 학습 루프 5단계: 추론 → loss → backward → update → gradient 초기화
- `nn.Linear`, `MSELoss`, `optim.SGD`로 같은 모델 만들기

머신러닝 시리즈에서 `LinearRegression().fit()` 한 줄로 끝냈던 일을, 이번에는 안에서 무슨 일이 일어나는지 직접 구현한다.

## 선형 회귀 (Linear Regression)

- feature들의 **가중합**으로 target을 추정한다
- feature에 곱하는 가중치(weight)는 그 feature가 target에 주는 **영향도**다. 음수면 target을 줄이고 양수면 늘린다. 0에서 멀수록 영향이 크다
- 학습 과정에서 가장 적절한 가중치를 찾는다

$$
\hat{y} = W \cdot X + b \quad (\hat{y}: \text{추정값},\ W: \text{가중치},\ X: \text{입력},\ b: \text{편향})
$$

**Train 데이터셋 구성**

- feature(input)와 target(output)을 각각 **행렬**로 만든다
- feature 행렬의 행은 관측치(개별 데이터), 열은 feature다
- target 행렬의 행은 관측치, 열은 예측할 항목이다
- 한 데이터의 입력과 출력은 **같은 index**에 둔다

### 가장 단순한 예: 공부 시간 → 점수

| 공부시간 | 점수 |
|---|---|
| 1 | 20 |
| 2 | 40 |
| 3 | 60 |

> **보충** 노트북에서는 이 예제 셀들이 비어 있어서, 아래 다중 입력 예제와 같은 방식으로 채웠다. 답은 눈으로도 보이는 $\hat{y} = 20x$다.

```python
# 보충: 입력 1개, 출력 1개 선형 회귀
X = torch.tensor([[1.], [2.], [3.]])     # (3, 1): 데이터 3개, feature 1개
y = torch.tensor([[20.], [40.], [60.]])  # (3, 1): 데이터 3개, 출력 1개

w = torch.randn(1, 1, requires_grad=True)
b = torch.randn(1, requires_grad=True)

for epoch in range(2000):
    pred = X @ w + b
    loss = torch.mean((pred - y) ** 2)
    loss.backward()
    with torch.no_grad():
        w -= 0.05 * w.grad
        b -= 0.05 * b.grad
    w.grad = None
    b.grad = None

print(f"w = {w.item():.3f}, b = {b.item():.3f}, loss = {loss.item():.6f}")
print("4시간 공부하면:", (torch.tensor([[4.]]) @ w + b).item())
```

```text
w = 20.000, b = 0.000, loss = 0.000000
4시간 공부하면: 79.99996948242188
```

w는 20, b는 0에 가까워졌다. 이 반복문 안의 다섯 줄이 딥러닝 학습의 뼈대다.

### 학습 루프

1. 모델로 추정한다: `pred = model(input)`
2. loss를 계산한다: `loss = loss_fn(pred, target)`
3. loss를 파라미터로 미분한 gradient를 각 파라미터에 저장한다: `loss.backward()`
4. optimizer로 파라미터를 업데이트한다: `optimizer.step()`
5. 파라미터의 gradient를 0으로 초기화한다: `optimizer.zero_grad()`

이 단계를 반복한다.

## 다중 입력, 다중 출력

- **다중 입력**: feature가 여러 개
- **다중 출력**: 예측할 값이 여러 개

가상 데이터로 사과와 오렌지 수확량을 예측한다. ([참조](https://www.kaggle.com/code/aakashns/pytorch-basics-linear-regression-from-scratch))

| 온도(F) | 강수량(mm) | 습도(%) | 사과(ton) | 오렌지(ton) |
|---|---|---|--:|--:|
| 73 | 67 | 43 | 56 | 70 |
| 91 | 88 | 64 | 81 | 101 |
| 87 | 134 | 58 | 119 | 133 |
| 102 | 43 | 37 | 22 | 37 |
| 69 | 96 | 70 | 103 | 119 |

```
사과수확량  = w11 * 온도 + w12 * 강수량 + w13 * 습도 + b1
오렌지수확량 = w21 * 온도 + w22 * 강수량 + w23 * 습도 + b2
```

- 온도, 강수량, 습도가 사과와 오렌지 수확량에 각각 얼마나 영향을 주는지 가중치를 찾는다
- 사과용 weight 3개, 오렌지용 weight 3개, 총 6개와 bias 2개를 학습으로 찾는다
- **Node / Unit / Neuron**: 과일 하나를 예측하기 위한 `weight들 @ feature들`의 계산 결과
- **Layer**: 두 과일의 Unit들을 묶은 것

```python
# 입력: 온도/강수/습도
# 출력: 사과생산량/오렌지생산량

# weihght의 수 = 3 * 2
# bias의 수 = 2

# 딥러닝 용어
# 사과수확량/오렌지수확량(출력결과) = Node, Unit, Neuron
# 과일의 수확량 = LAYER

# 목적은 최적의 파라미터 w, b 찾기

# X.shape = (N, 3), y.shape=(N,2)
```

![입력 3개(온도·강수량·습도)가 Unit 2개(사과·오렌지)로 연결된 Layer](/images/dl/fig-unit-layer.png)

선 하나하나가 weight다. 입력 3개 × 출력 2개라 선이 6개다.

### Train Dataset

```python
#  input: 생산환경 (temp, rainfall, humidity) : (5, 3)
environs = [
    [73, 67, 43],
    [91, 88, 64],
    [87, 134, 58],
    [102, 43, 37],
    [69, 96, 70]
]

# Targets: 생산량 - (apples, oranges) - (5, 2)
apple_orange_output = [
    [56, 70],
    [81, 101],
    [119, 133],
    [22, 37],
    [103, 119]
]

# pytorch를 쓰기 위해 리스트를 tensor로 바꿔줘야 함
```

```python
import torch
# Dataset을 torch.Tensor로 생성

X = torch.tensor(environs, dtype=torch.float32)
y = torch.tensor(apple_orange_output, dtype=torch.float32)
X.shape, y.shape

# gradient를 구하는 것은 안됌. 이 친구는 전체 데이터셋
# gradient를 구할 것은 w
```

```text
(torch.Size([5, 3]), torch.Size([5, 2]))
```

데이터는 정해진 값이라 미분할 필요가 없다. `requires_grad=True`는 학습으로 바꿀 **파라미터**에만 준다.

### weight와 bias

- **weight**: 각 feature가 생산량에 주는 영향을 나타내는 가중치. 과일이 둘이라 묶음이 두 개다. shape `(3, 2)`
- **bias**: 모든 feature가 0일 때의 생산량. 과일마다 하나씩, shape `(2,)`

모델은 입력과 weight를 행렬곱하고 bias를 더한다.

$$
\underbrace{\begin{bmatrix} 73 & 67 & 43 \\ 91 & 88 & 64 \\ \vdots & \vdots & \vdots \\ 69 & 96 & 70 \end{bmatrix}}_{X\ (5,\,3)}
\cdot
\underbrace{\begin{bmatrix} w_{11} & w_{21} \\ w_{12} & w_{22} \\ w_{13} & w_{23} \end{bmatrix}}_{W\ (3,\,2)}
+
\underbrace{\begin{bmatrix} b_1 & b_2 \end{bmatrix}}_{b\ (2,)}
$$

$w_{11}, w_{12}, w_{13}$은 사과, $w_{21}, w_{22}, w_{23}$은 오렌지 생산량을 계산할 때 곱하는 가중치다. `(5, 3) @ (3, 2)`의 결과는 `(5, 2)`이고, bias `(2,)`는 broadcasting으로 5개 행에 모두 더해진다.

```python
# Weight 값과 bias 값을 만들어야 함
#  Weight shape : (3: feature개수, 2: output의 개수)
weight=torch.randn(3,2,requires_grad=True)
#  Weight shape : (2: output의 개수)
bias=torch.randn(2,requires_grad=True)

def model(X):
    return X @ weight + bias
```

학습 전 랜덤한 weight로 예측해 본다.

```python
y_hat = model (X)
print(y_hat.shape) # (5: 개수, 2:과일생산량(사과,오렌지)
y_hat
```

```text
torch.Size([5, 2])
```

```text
tensor([[-215.0900,  -16.5786],
        [-268.6129,  -18.1188],
        [-312.2058,  -89.7561],
        [-254.6664,   28.4440],
        [-226.9356,  -36.7849]], grad_fn=<AddBackward0>)
```

```python
y
```

```text
tensor([[ 56.,  70.],
        [ 81., 101.],
        [119., 133.],
        [ 22.,  37.],
        [103., 119.]])
```

정답과 전혀 맞지 않는다. 얼마나 틀렸는지 MSE로 계산하는 loss 함수를 정의한다.

```python
# loss함수를 정의
def loss_fn(pred, y):
    """mean_Squared error"""
    return torch.mean((pred - y) ** 2)
```

### 학습

```python
# 학습(trainset을 이용해서 weight, bias를 최적화)


epochs = 5000
lr = 0.00001

for epoch in range(epochs):
    #1 모델을 이용해서 예측
    pred = model(X)
    #2 오차계산
    loss  =loss_fn(pred, y)
    # weightdhk bias의 gradietn를 게싼
    loss.backward()
    #4 weight와 bias 최적화
    weight.data = weight.data - lr * weight.grad
    bias.data = bias.data - lr * bias.grad
    #5 grad값초기화
    weight.grad=None
    bias.grad=None

    # 로그 출력(epoch별 loss출력)
    if epoch % 100 == 0 or epoch == (epochs -1):
        print(f"[{epoch}/{epochs}] - loss: {loss.item():.5f}")
```

```text
[0/5000] - loss: 66270.67188
[100/5000] - loss: 426.40985
[200/5000] - loss: 140.14449
[300/5000] - loss: 56.38619
[400/5000] - loss: 30.03753
[500/5000] - loss: 20.28326
[600/5000] - loss: 15.58774
[700/5000] - loss: 12.64539
[800/5000] - loss: 10.47182
[900/5000] - loss: 8.74362
[1000/5000] - loss: 7.33092
[1100/5000] - loss: 6.16482
[1200/5000] - loss: 5.19905
[1300/5000] - loss: 4.39829
[1400/5000] - loss: 3.73410
[1500/5000] - loss: 3.18308
[1600/5000] - loss: 2.72597
[1700/5000] - loss: 2.34673
[1800/5000] - loss: 2.03211
[1900/5000] - loss: 1.77109
[2000/5000] - loss: 1.55454
[2100/5000] - loss: 1.37489
[2200/5000] - loss: 1.22585
[2300/5000] - loss: 1.10220
[2400/5000] - loss: 0.99961
[2500/5000] - loss: 0.91450
[2600/5000] - loss: 0.84390
[2700/5000] - loss: 0.78532
[2800/5000] - loss: 0.73672
[2900/5000] - loss: 0.69640
[3000/5000] - loss: 0.66295
[3100/5000] - loss: 0.63521
[3200/5000] - loss: 0.61219
[3300/5000] - loss: 0.59309
[3400/5000] - loss: 0.57724
[3500/5000] - loss: 0.56409
[3600/5000] - loss: 0.55319
[3700/5000] - loss: 0.54414
[3800/5000] - loss: 0.53663
[3900/5000] - loss: 0.53040
[4000/5000] - loss: 0.52524
[4100/5000] - loss: 0.52095
[4200/5000] - loss: 0.51739
[4300/5000] - loss: 0.51445
[4400/5000] - loss: 0.51200
[4500/5000] - loss: 0.50997
[4600/5000] - loss: 0.50828
[4700/5000] - loss: 0.50688
[4800/5000] - loss: 0.50572
[4900/5000] - loss: 0.50476
[4999/5000] - loss: 0.50397
```

loss가 수만 단위에서 시작해 한 자릿수까지 내려간다.

> **보충** 파라미터를 업데이트할 때 `weight.data`를 바꾼 이유는 이 계산이 **미분 기록에 남지 않게** 하려는 것이다. `weight = weight - lr * weight.grad`처럼 쓰면 새 tensor가 만들어져 `weight`가 더 이상 학습 대상(leaf tensor)이 아니게 된다. 공부 시간 예제처럼 `with torch.no_grad():` 안에서 `weight -= lr * weight.grad`로 써도 같다. 학습률이 0.00001로 아주 작은 건 입력값이 수십~백 단위로 커서다. 학습률을 키우면 발산한다.

### 새 데이터 예측

새 생산 환경으로 예측해 본다. 노트북의 이 셀은 `torch.float32`를 `torch/float32`로 잘못 써서 실행되지 않았다. **아래 셀은 에러가 나는 것이 정상이다.**

```python
new_X =[[63.2, 121.6, 32.1]]
new_X = torch.tensor(new_X, dtype=torch/float32)
with torch.no_grad():
    new_pred = model(new_X)
    print(new_pred)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · NameError: name &#x27;float32&#x27; is not defined</div></div>

`/`를 `.`으로 고치면 동작한다. 예측에는 gradient가 필요 없으니 `torch.no_grad()` 안에서 실행한다.

```python
new_X =[[63.2, 121.6, 32.1]]
new_X = torch.tensor(new_X, dtype=torch.float32)
with torch.no_grad():
    new_pred = model(new_X)
    print(new_pred)
```

```text
tensor([[ 99.4526, 106.4479]])
```

강수량이 많고 습도가 낮은 환경이다. 학습 데이터에서 강수량이 가장 많았던 세 번째 행(사과 119, 오렌지 133)과 비슷한 방향의 값이 나왔다.

## PyTorch built-in 모델로 구현하기

```python
inputs = torch.tensor(
    [[73, 67, 43],
     [91, 88, 64],
     [87, 134, 58],
     [102, 43, 37],
     [69, 96, 70]], dtype=torch.float32)
```

```python
targets = torch.tensor(
    [[56, 70],
    [81, 101],
    [119, 133],
    [22, 37],
    [103, 119]], dtype=torch.float32)
```

### torch.nn.Linear

- PyTorch는 `torch.nn.Linear` 클래스로 선형 회귀 모델을 제공한다
- 입력 feature 수와 출력 수를 지정하면, 랜덤 값으로 초기화한 weight와 bias를 만들어 모델을 구성한다
- `torch.nn.Linear(input feature의 개수, output 값의 개수)`

### Optimizer와 Loss 함수

- **Optimizer**: 계산된 gradient로 파라미터를 업데이트하는 객체. `torch.optim` 모듈에 있다
- **Loss 함수**: 정답과 예측값의 차이(오차)를 계산한다. 모델을 최적화한다는 건 이 값을 최소화한다는 뜻이다. `torch.nn` 또는 `torch.nn.functional` 모듈에 있다

```python
# 선형회귀 모델을 정의. torch.nn.Linear 클래스
import torch
import torch.nn as nn

model = nn.Linear(3, 2)  # 3: input feature 개수, 2: output 수
```

```python
# loss 함수
loss_fn = torch.nn.MSELoss()  # 클래스
# loss_fn = torch.nn.functional.mse_loss # 함수
```

```python
# optimizer (torch.optim 모듈에 정의): weight.data = weight.data - lr * weight.grad
optimizer = torch.optim.SGD(
    model.parameters(), # 최적화 대상 파라미터들을 model에서 조회해서 전달.
    lr = 0.00001,       # Learning Rage
)
```

`nn.Linear`가 만든 파라미터를 본다.

```python
list(model.parameters())
```

```text
[Parameter containing:
tensor([[ 0.2097,  0.4794, -0.1188],
        [ 0.4320, -0.0931,  0.0611]], requires_grad=True), Parameter containing:
tensor([ 0.5228, -0.5356], requires_grad=True)]
```

> **보충** `nn.Linear(3, 2)`의 weight shape은 `(3, 2)`가 아니라 **`(2, 3)`** 이다. PyTorch는 weight를 `(출력 수, 입력 수)`로 저장하고 계산할 때 `X @ weight.T + bias`로 전치해서 쓴다. 직접 구현한 weight `(3, 2)`와 모양만 다르고 하는 일은 같다. `requires_grad=True`도 자동으로 붙어 있다.

### Model Train

직접 구현했던 2~5단계가 `loss_fn`, `backward()`, `optimizer.step()`, `optimizer.zero_grad()`로 바뀌었다.

```python
epochs = 5000

for epoch in range(epochs):
    # 추론
    pred = model(inputs)
    # loss 계산
    loss = loss_fn(pred, targets) # torch.nn.functional.mse_loss(pred, targets) # (모델추정값, 정답)
    # gradient 계산
    loss.backward()
    # 파라미터 업데이트: optimizer.step()
    optimizer.step()
    # 파라미터 초기화 w.grad=None, b.grad=None
    optimizer.zero_grad()
    # 현재 epoch 학습 결과를 log로 출력
    if epoch % 100 == 0 or epoch == epochs-1:
        print(f"[{epoch+1:04d}/{epochs}] - {loss.item()}") # d는 타입(정수) 앞에 04는
```

```text
[0001/5000] - 3168.80615234375
[0101/5000] - 214.89413452148438
[0201/5000] - 80.08329772949219
[0301/5000] - 38.94678497314453
[0401/5000] - 24.659658432006836
[0501/5000] - 18.37415313720703
[0601/5000] - 14.721824645996094
[0701/5000] - 12.130159378051758
[0801/5000] - 10.103055953979492
[0901/5000] - 8.455836296081543
[1001/5000] - 7.098940849304199
[1101/5000] - 5.975940227508545
[1201/5000] - 5.045061111450195
[1301/5000] - 4.272965431213379
[1401/5000] - 3.632488965988159
[1501/5000] - 3.1011438369750977
[1601/5000] - 2.660334348678589
[1701/5000] - 2.294625997543335
[1801/5000] - 1.9912207126617432
[1901/5000] - 1.7395168542861938
[2001/5000] - 1.5306894779205322
[2101/5000] - 1.3574496507644653
[2201/5000] - 1.213713526725769
[2301/5000] - 1.0944794416427612
[2401/5000] - 0.9955490231513977
[2501/5000] - 0.9134808778762817
[2601/5000] - 0.8453875780105591
[2701/5000] - 0.7888985872268677
[2801/5000] - 0.7420320510864258
[2901/5000] - 0.7031527757644653
[3001/5000] - 0.6708974242210388
[3101/5000] - 0.6441370844841003
[3201/5000] - 0.6219339966773987
[3301/5000] - 0.6035167574882507
[3401/5000] - 0.5882356762886047
[3501/5000] - 0.5755588412284851
[3601/5000] - 0.5650393962860107
[3701/5000] - 0.556316614151001
[3801/5000] - 0.5490759015083313
[3901/5000] - 0.5430700778961182
[4001/5000] - 0.5380879044532776
[4101/5000] - 0.5339537858963013
[4201/5000] - 0.5305241942405701
[4301/5000] - 0.5276801586151123
[4401/5000] - 0.5253180265426636
[4501/5000] - 0.5233598947525024
[4601/5000] - 0.521735429763794
[4701/5000] - 0.5203875303268433
[4801/5000] - 0.5192682147026062
[4901/5000] - 0.518341064453125
[5000/5000] - 0.5175772309303284
```

> **보충** 주석의 `{epoch+1:04d}`는 정수(`d`)를 **4자리**로 맞추고 빈자리를 **0**으로 채우는 포맷이다. 1은 `0001`, 100은 `0100`으로 찍혀 로그가 가지런해진다.

```python
# 추론 => gradient 계산을 할 필요가 없다. ==> grad_fn을 만들 필요가 없다. 그래서 torch.no_grad() 블록에서 추론 작업을 실행한다.
with torch.no_grad():
    pred = model(inputs)
```

정답과 예측을 나란히 놓고 본다.

```python
torch.cat([targets, pred], dim=1)
```

```text
tensor([[ 56.0000,  70.0000,  57.2580,  70.2238],
        [ 81.0000, 101.0000,  82.1056, 100.6873],
        [119.0000, 133.0000, 118.7758, 133.0547],
        [ 22.0000,  37.0000,  21.0977,  37.0495],
        [103.0000, 119.0000, 101.8376, 119.0419]])
```

왼쪽 두 열이 정답(사과, 오렌지), 오른쪽 두 열이 예측이다.

### 학습 로직을 함수로

```python
# 학습 로직을 함수 구현
def train(inputs, targets, epochs, model, loss_fn, optimizer):

    for epoch in range(epochs):
        # 추론
        pred = model(inputs)
        # loss 계산
        loss = loss_fn(pred, targets) # torch.nn.functional.mse_loss(pred, targets) # (모델추정값, 정답)
        # gradient 계산
        loss.backward()
        # 파라미터 업데이트: optimizer.step()
        optimizer.step()
        # 파라미터 초기화 w.grad=None, b.grad=None
        optimizer.zero_grad()
        # 현재 epoch 학습 결과를 log로 출력
        if epoch % 100 == 0 or epoch == epochs-1:
            print(f"[{epoch+1:04d}/{epochs}] - {loss.item()}")
```

학습률을 10배(0.0001)로 키워서 새 모델을 학습시킨다.

```python
model = nn.Linear(3, 2)
optimizer = torch.optim.SGD(model.parameters(), lr=0.0001)
```

```python
train(inputs, targets, 5000, model, nn.functional.mse_loss, optimizer)
```

```text
[0001/5000] - 15499.626953125
[0101/5000] - 7.054776191711426
[0201/5000] - 1.5050462484359741
[0301/5000] - 0.6548291444778442
[0401/5000] - 0.5245340466499329
[0501/5000] - 0.504562258720398
[0601/5000] - 0.5015010833740234
[0701/5000] - 0.5010279417037964
[0801/5000] - 0.5009546279907227
[0901/5000] - 0.5009399056434631
[1001/5000] - 0.5009382367134094
[1101/5000] - 0.5009320974349976
[1201/5000] - 0.5009302496910095
[1301/5000] - 0.5009270906448364
[1401/5000] - 0.5009249448776245
[1501/5000] - 0.5009223222732544
[1601/5000] - 0.5009201765060425
[1701/5000] - 0.5009163618087769
[1801/5000] - 0.5009132027626038
[1901/5000] - 0.5009092092514038
[2001/5000] - 0.500907301902771
[2101/5000] - 0.5009047985076904
[2201/5000] - 0.5009030103683472
[2301/5000] - 0.5008989572525024
[2401/5000] - 0.5008975863456726
[2501/5000] - 0.500891923904419
[2601/5000] - 0.5008898377418518
[2701/5000] - 0.5008859038352966
[2801/5000] - 0.5008823275566101
[2901/5000] - 0.5008807182312012
[3001/5000] - 0.500878095626831
[3101/5000] - 0.5008752346038818
[3201/5000] - 0.5008732080459595
[3301/5000] - 0.5008694529533386
[3401/5000] - 0.5008658170700073
[3501/5000] - 0.5008634328842163
[3601/5000] - 0.5008621215820312
[3701/5000] - 0.5008578300476074
[3801/5000] - 0.5008543133735657
[3901/5000] - 0.500853419303894
[4001/5000] - 0.5008477568626404
[4101/5000] - 0.5008454322814941
[4201/5000] - 0.500843346118927
[4301/5000] - 0.5008394718170166
[4401/5000] - 0.5008398294448853
[4501/5000] - 0.5008333325386047
[4601/5000] - 0.5008321404457092
[4701/5000] - 0.5008296370506287
[4801/5000] - 0.5008258819580078
[4901/5000] - 0.5008237361907959
[5000/5000] - 0.500819981098175
```

학습률을 10배로 키우니 loss가 300 epoch 만에 0.6대까지 내려갔다. 0.00001일 때 5,000 epoch 걸린 지점이다. 다만 0.5 밑으로는 더 내려가지 않는데, 이 데이터가 완벽한 직선 관계가 아니라서 선형 모델로 줄일 수 있는 오차의 바닥이 그 근처이기 때문이다. 학습률을 더 키우면 어느 순간 loss가 `inf`나 `nan`으로 발산한다.

## 정리

- 선형 회귀는 `X @ W + b`다. 입력 3개 → 출력 2개면 weight는 6개, bias는 2개이고, 출력 하나를 계산하는 단위가 **Unit**, Unit들의 묶음이 **Layer**다
- 학습 루프는 **추론 → loss → `backward()` → 파라미터 업데이트 → gradient 초기화**의 반복이다
- 직접 구현하면 업데이트(`w - lr * w.grad`)와 초기화를 손으로 쓰고, PyTorch에서는 `optimizer.step()`과 `optimizer.zero_grad()`가 대신한다
- `nn.Linear(입력 수, 출력 수)`는 weight와 bias를 만들어 주는 레이어다. weight는 `(출력, 입력)` 모양으로 저장된다
- 추론은 `torch.no_grad()` 안에서 한다. 입력 스케일이 크면 학습률을 아주 작게 잡아야 한다
