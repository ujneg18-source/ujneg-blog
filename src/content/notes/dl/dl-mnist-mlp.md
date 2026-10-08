---
title: "첫 번째 딥러닝: MLP로 MNIST 분류하기"
description: "PyTorch 개발 프로세스(데이터 준비 → 모델 정의 → 학습 → 평가)를 따라 손글씨 숫자 MNIST를 분류하는 MLP를 만듭니다. Dataset과 DataLoader, ToTensor 전처리, nn.Module로 모델 정의, CrossEntropyLoss와 Adam, epoch·step·batch 개념, 학습·검증 루프, 모델 저장과 새 이미지 추론까지 실행 결과와 함께 다룹니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '딥러닝'
seriesOrder: 4
originalNotebook: "04_첫번째 딥러닝-MLP 구현.ipynb"
tags: ["Python","PyTorch","MLP","MNIST","Classification"]
date: 2026-06-05
---

> SKN31 딥러닝 과정 노트북 `04_첫번째 딥러닝-MLP 구현.ipynb`를 바탕으로 정리했습니다.
> 코드는 PyTorch 2.5, CPU 4코어 환경에서 실행한 결과입니다. 가중치 초기값과 데이터 섞는 순서가 난수라 loss와 정확도는 노트북과 조금 다릅니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- PyTorch 개발 프로세스
- MNIST 데이터셋과 `ToTensor` 전처리
- `DataLoader`와 batch, step, epoch
- `nn.Module`로 MLP 모델 정의하기
- `CrossEntropyLoss`, `Adam`으로 학습하고 매 epoch 검증하기
- 모델 저장, 불러오기, 새 이미지 추론

## PyTorch 개발 프로세스

1. **데이터 준비**: Dataset 준비, DataLoader 생성
2. **모델 정의**: 입력과 출력을 연결하는 Layer들로 이뤄진 네트워크를 정의한다
   - **Sequential 방식**: Layer를 순서대로 쌓아 만든다. 간단한 모델이나 Layer 블록을 정의할 때 쓴다
   - **Subclass 방식**: 네트워크를 정의하는 클래스를 구현한다. 다양한 구조를 만들 수 있다. `__init__`에서 Layer들을 만들고, `forward(self, X)`에 순전파 계산을 구현한다
3. **학습(train)**: train 함수, test 함수 정의
4. **test set 최종 평가**

## MNIST 이미지 분류

- [MNIST](https://ko.wikipedia.org/wiki/MNIST_%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4) (Modified National Institute of Standards and Technology) database
- 흑백 손글씨 숫자 0~9, 10개 범주
- 이미지 하나는 28 × 28 픽셀
- train 이미지 6만 개, test 이미지 1만 개

머신러닝 평가지표 글에서는 scikit-learn의 8 × 8 축소판(1,797장)을 썼다. 이번에는 원본 크기 7만 장이다.

```python
# 딥러닝과 관련된 데이터의 경우
# 가로width 먼저 그 다음 세로height로 픽셀 단위사이즈를 알려줌
```

> **보충** 이미지 크기를 말할 때는 보통 "가로 × 세로"로 쓰지만, tensor의 shape은 **(세로, 가로)** 순서다. 28 × 28은 같아서 상관없지만, 1920 × 1080 이미지는 shape이 `(1080, 1920)`이 된다.

### import

```python
import torch
import torch.nn as nn  # 다양한 layer/모델 들이 정의된 패키지. (Neural Network)
from torch.utils.data import DataLoader # DataLoader 클래스 -> 모델에 데이터들을 제공하는 역할.
from torchvision import datasets, transforms
# torchvision 패키지(라이브러리): pytorch의 영상상 전용 sub package
## datasets(모듈): Vision(영상)관련 공개개 데이터셋들을 제공하는 모듈
## transforms: 영상 데이터 전처리 기능들을 제공하는 모듈

import matplotlib.pyplot as plt
```

### device 설정

```python
# 어느 Device에서 연산처리를 할지 지정. (cpu, cuda(GPU))
# device = "cpu"
print(torch.cuda.is_available())  # cuda를 사용할 수있는 환경인지 조회
device = "cuda" if torch.cuda.is_available() else "cpu" # 2.0이전: torch.Device("cuda")
print(device)
```

```text
False
cpu
```

### 하이퍼파라미터

```python
lr = 0.001 # 학습률. 0 ~ 1 실수.
batch_size = 256  # 모델이 학습할 때 한 번에 몇 개씩 모델에 제공할지 개수.
epochs = 20
# step: 모델의 파라미터들을 update하는 단위.
#  - 1 step: batch_size(256)개수의 데이터로 파라미터를 한번 update한 것.
# epoch: train set 전체를 학습하는 단위.
#  - 1 epoch: 전체 데이터를 한번 다 학습한 것.
```

| 용어 | 뜻 |
|---|---|
| **batch size** | 한 번에 모델에 넣는 데이터 개수 |
| **step** | 파라미터를 한 번 업데이트하는 단위. 1 step = batch 하나로 학습 |
| **epoch** | train set 전체를 한 번 다 학습하는 단위 |

6만 장을 256개씩 나누면 1 epoch에 약 234 step이다. 20 epoch이면 파라미터를 약 4,680번 업데이트한다.

```python
import os
# 학습이 끝난 모델을 저장할 디렉토리.
saved_dir = "models"
os.makedirs(saved_dir, exist_ok=True)
# Dataset을 저장할 디렉토리
dataset_dir = "datasets/mnist"
os.makedirs(dataset_dir, exist_ok=True)
```

## 데이터 준비

### Dataset

```python
trainset = datasets.MNIST(
    root=dataset_dir, # Dataset을 읽어올 디렉토리.
    download=True,    # root 에 dataset이 없을 경우 다운로드 받을지 여부.
    transform=transforms.ToTensor()
)
testset = datasets.MNIST(
    root=dataset_dir,
    download=True,
    train=False,       # Trainset인지 여부. True(default): train set, False: test set
    transform=transforms.ToTensor()
)
######################################################################################
#  transform=함수 -> input data를 전처리하는 함수를 전달./콜러브타입/인풋데이터를 전처리해줌
######################################################################################
# transforms.ToTensor 가 하는 처리
## ndarray, PIL.Image 객체를 torch.Tensor 로 변환.
## (height, width, channel) 순서를 channel first (channel, height, width) 형태로 변환.
## pixcel값들(0~255 정수)을 0 ~ 1 로 정규화. (Feature Scaling - MinMaxScaling)
```

`transform`에는 데이터를 하나 꺼낼 때마다 적용할 전처리 함수를 넘긴다. `ToTensor()`가 하는 일 세 가지가 전부 텐서 글과 머신러닝 전처리에서 다룬 내용이다.

| 처리 | 연결되는 개념 |
|---|---|
| PIL Image / ndarray → Tensor | Tensor 생성 |
| `(H, W, C)` → `(C, H, W)` | `permute` |
| 0~255 → 0~1 | MinMaxScaling |

```python
testset
```

```text
Dataset MNIST
    Number of datapoints: 10000
    Root location: datasets/mnist
    Split: Test
    StandardTransform
Transform: ToTensor()
```

데이터 하나를 꺼내면 `(이미지, 정답)` 튜플이다.

```python
# 개별데이터 조회
img, label = trainset[1]  # tuple: (input, output) #PIL (필: image), 오픈 cv라이브러리(ndarray) => 2가지 형태로 저장될 수 있음
print(type(img), img.shape, label)
```

```text
<class 'torch.Tensor'> torch.Size([1, 28, 28]) 0
```

```python
trainset[7][1] # 0번은 이미지, 1번은 튜플
```

```text
3
```

> **보충** 주석의 "1번은 튜플"은 "1번은 **정답(label)**"이다. `trainset[7]`이 튜플이고, 그 1번 원소가 정답 숫자다.

`ToTensor()`를 거친 이미지의 상태를 확인한다.

```python
################ transforms.ToTensor() 적용 후 확인################
f1 = trainset[0][0]
print(f1.shape)  # (1:channel-grayscale, 28: height, 28:width)
print(f1.dtype, f1.type())
print(f1.min(), f1.max())
type(f1)

# 그레이 스케일 경우 (더미 축을 늘려서 3차원으로 읽히게 해줘야 함)
# (hwc) 순서면 => (chw)로


# 1차원 (Channel): 색상 축 (흑백은 1, 컬러 RGB는 3)

# 2차원 (Height): 이미지의 세로 픽셀 수 (예: 28)

# 3차원 (Width): 이미지의 가로 픽셀 수 (예: 28)
```

```text
torch.Size([1, 28, 28])
torch.float32 torch.FloatTensor
tensor(0.) tensor(1.)
```

```text
<class 'torch.Tensor'>
```

흑백이라 채널이 1개인 `(1, 28, 28)`이고, 값은 0~1 사이 float32다.

```python
import random

print(len(trainset))
idx = random.randint(0, len(trainset)) #0 ~ 60000 사이 랜덤 정수를 반환.
img, label = trainset[idx]



plt.figure(figsize=(2, 2))
plt.imshow(img.squeeze(), cmap="gray") # (1, 28, 28) -> (28, 28). matplotlib은 이미지를 (h, w, c) 로 전달해야함.
plt.title(f"{idx}\n{label}")
plt.show()
```

```text
60000
```

![그래프 출력](/images/dl/dl-mnist-mlp-1.png)

> **보충** `random.randint(a, b)`는 **b도 포함**한다. 60000이 나오면 index 범위를 넘어 에러가 난다. `random.randint(0, len(trainset) - 1)` 또는 `random.randrange(len(trainset))`이 맞다.

### DataLoader

- **Dataset**: 데이터를 가지고 있고, 하나씩 꺼내 주는 역할
- **DataLoader**: Dataset의 데이터를 **어떻게 모델에 제공할지**(batch 크기, 섞기 등) 정해서 묶음으로 제공하는 역할

```python
# DataLoader: Dataset의 데이터들을 모델에 제공하는 역할. 데이터들을 모델에 어떻게 제공할지 설정해서 생성.
# Dataset: 데이터들을 가지고 있는 역할. 하나씩 조회하는 기능을 제공.
train_loader = DataLoader(
    trainset,              # Dataset
    batch_size=batch_size, # batch size (256)
    shuffle=True,   # 모델에 데이터를 제공하기 전에 섞을지 여부. (default: False) True: 한 epoch 학습 전에 섞는다.
    drop_last=True, # 모델에 제공할 데이터의 개수가 batch_size보다 적으면 제공하지 않는다. (학습에 사용안함)
)

test_loader = DataLoader(testset, batch_size=batch_size)
```

```python
# 전체 데이터 개수.
len(trainset), len(testset)
```

```text
(60000, 10000)
```

```python
# 1 epoch 당 step 수 조회.
len(train_loader), len(test_loader)
```

```text
(234, 40)
```

60000 / 256 = 234.4라서, `drop_last=True`인 train은 마지막 96개를 버리고 234 step, test는 10000 / 256 = 39.1을 올려 40 step이다.

```python
# 보충: DataLoader에서 batch 하나를 꺼내 shape 확인
X_batch, y_batch = next(iter(train_loader))
X_batch.shape, y_batch.shape
```

```text
(torch.Size([256, 1, 28, 28]), torch.Size([256]))
```

이미지 256장이 `(256, 1, 28, 28)`로, 정답 256개가 `(256,)`으로 묶여 나온다.

## 모델 정의

```python
# 만드는 것

# Class로 구현
## - nn.Module 상속한 클래스를 정의.
## - __init__(): 입력값을 추론(순전파 연산)하는데 필요한 layer객체들을 생성.
## - forward(): __init__() 에서 생성한 layer들을 이용해 연산 로직을 정의
```

Linear 4개를 쌓은 **MLP**(Multi-Layer Perceptron)다. 784 → 128 → 64 → 32 → 10.

```python
class MNISTModel(nn.Module):
    def __init__(self):
        super().__init__()  # 상위클래스 nn.Module 을 초기화. # 상위의 객체를 초기화 해야함

        # Linear(input feature 개수, output feature 개수)=> 학습시킬 특성을 추출함 # 앙상블의 개념과 유사(x->LR모델-1차 아웃풋/인풋->LR2모델-2차아웃풋->pred값을 출력)
        # Linear 핵심 컨셉 가중치값을 계산하는 거임
        # layer를 여러겹 쌓아서 만듦 # 중요한 픽쳐를 계속해서 찾아냄
        # 마지막 linear가 예측해줌

        self.lr1 = nn.Linear(784, 128) # (784:(28*28): MNIST 이미지의 pixcel수, 출력: 128) # 저 입출력값 갯수는 하이퍼 파라미터 (자유롭게-많이 넣어봐야함 복잡도를 계산해서)
        self.lr2 = nn.Linear(128, 64)  # (128: lr1의 출력개수, 출력: 64) # 2의 제곱으로 하는 건 걍 관례로 하는거임
        self.lr3 = nn.Linear(64, 32)   # (64:  lr2의 출력개수, 출력: 32)
        self.lr4 = nn.Linear(32, 10)   # (32:  lr3의 출력개수, 출력: 10)
        # 마지막 Linear()의 출력 개수(10) - 분류할 class개수(0 ~ 9)

    def forward(self, X):
        """
        X를 입력 받아서 y를 추론하는 계산로직을 정의
        initializer에서 정의한 Linear들을 이용해서 계산.
        Args:
            X(torch.FloatTensor) - 추론할 MNIST 이미지들. shape: (batch_size, 1, 28, 28)
        """
        # (batch_size, 1, 28, 28) 를 (batch_size, 784) feature들을 1차원으로 변환.
        X = torch.flatten(X, start_dim=1) # 다차원 배열을 1차원 배열로 변환. (start_dim=1, Flatten 시킬 시작 axis지정. 0축은 놔두고 1축 부터 flatten시킨다.)
        #start_dim=1  => 배치 사이즈는 유지 하되 1,28,28은 784로

        X = self.lr1(X)  # Linear: 선형함수
        X = nn.ReLU()(X) # Activation(활성) 함수. 비선형함수. ReLU(x): max(x, 0)

        X = self.lr2(X)
        X = nn.ReLU()(X)

        X = self.lr3(X)
        X = nn.ReLU()(X)


        # ReLU의 알고리즘 음수를 양수로 양수는 그냥 양수로

        output = self.lr4(X)
        return output
```

> **보충** ReLU는 음수를 양수로 바꾸는 게 아니라 **0으로** 만든다: `max(x, 0)`. 각 Linear 사이에 ReLU 같은 **비선형** 함수가 있어야 레이어를 쌓는 의미가 생긴다. 선형 함수만 여러 번 겹치면 결국 Linear 하나와 같아지기 때문이다. 이 내용은 다음 글에서 자세히 다룬다.

입력 이미지 `(batch, 1, 28, 28)`을 `flatten`으로 `(batch, 784)`로 펼쳐서 Linear에 넣는다. 0축(batch)은 유지하고 1축부터 펼친다.

## 학습

### 모델, loss 함수, optimizer 생성

```python
# 모델객체 생성
model = MNISTModel()
# 확인
print(model)
```

```text
MNISTModel(
  (lr1): Linear(in_features=784, out_features=128, bias=True)
  (lr2): Linear(in_features=128, out_features=64, bias=True)
  (lr3): Linear(in_features=64, out_features=32, bias=True)
  (lr4): Linear(in_features=32, out_features=10, bias=True)
)
```

```python
# 보충: 학습할 파라미터 수
sum(p.numel() for p in model.parameters())
```

```text
111146
```

784×128 + 128 (lr1) + 128×64 + 64 + 64×32 + 32 + 32×10 + 10 = 111,146개의 weight와 bias를 학습한다.

```python
# Loss함수 - 학습 할 때 모델이 예측한 값과 정답간의 오차를 계산하는 함수. 이 오차를 줄이는 방향으로 파라미터를 변경한다.
# 다중 분류 문제의 Loss함수: crossentropyloss함수. (이진분류: binary crossentropy, 회귀: mse)
loss_fn = nn.CrossEntropyLoss()  # torch.nn.functional.cross_entropy 함수사용도 가능.
```

```python
# optimizer 정의: 모델의 파라미터들을 업데이트하고 파라미터들의 gradient값을 초기화 한다.
optimizer = torch.optim.Adam(model.parameters(), lr=lr)
```

선형 회귀 글에서는 `SGD`를 썼고, 이번에는 `Adam`이다. 파라미터마다 학습률을 자동으로 조절해 줘서 딥러닝에서 가장 많이 쓰는 optimizer다. 차이는 다음 글에서 정리한다.

```python
# 학습시 계산에 사용되는 값들은 같은 device(cpu or cuda or mps)에 있어야 한다
## device로 이동할 대상: Model객체, X(input), y(output) ###아주 중요 요 변수들은 같은 cpu/gpu/macgpu 중 같은 곳에서 연산되어야 함
```

```python
print(device)
model = MNISTModel().to(device)
loss_fn = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=lr) # 최적화함수/오차변화률에 따른 학습
```

```text
cpu
```

### 학습과 검증

바깥 반복문은 epoch, 안쪽 반복문은 step(batch)이다. epoch마다 train set으로 학습하고, test set으로 검증한다.

```python
import time
# 학습
## 에폭별 검증결과들을 저장할 리스트
train_loss_list = []
valid_loss_list = []
valid_acc_list = []
s = time.time()

# 학습-중첩 반복문: epoch 반복 -> step(batch_size) 에 대한 반복
for epoch in range(epochs):
    ###############################################
    # 모델 Train - 1 epoch : Trainset
    ###############################################
    model.train()  # 모델을 train 모드로 변환.
    train_loss = 0 # 현재 epoch의 train loss를 저장할 변수.

    # batch 단위로 학습: 1 step - 1개 batch의 데이터로 학습.
    for X_train, y_train  in train_loader: # 한번 반복할 때마다 1개 batch 데이터를 순서대로 제공. (X, y) 를 묶어서 제공한다.
        # 1. X, y를 devcie로 이동
        X_train, y_train = X_train.to(device), y_train.to(device)
        # 2. 모델을 이용해 추론
        pred = model(X_train) # Model.forward(X_train) 메소드 호출
        # 3. loss 계산
        loss = loss_fn(pred, y_train)
        # 4. gradient 계산
        loss.backward()
        # 5. 모델의 파라미터들(weight, bias) update
        optimizer.step()
        # 6. gradient 초기화
        optimizer.zero_grad()
        # 학습 결과 저장및 출력을 위해 loss 저장.
        train_loss = train_loss + loss.item()


    train_loss = train_loss / len(train_loader)  # 한 에폭에서 학습한 step별 loss의 평균계산.
    train_loss_list.append(train_loss)

    ###############################################
    # 1 epoch 학습한 결과 검증: Testset
    ###############################################
    model.eval()  # 모델을 evaluation() (추론, 검증) 모드로 변환.
    valid_loss = 0
    valid_acc = 0
    with torch.no_grad(): # 추론만 함 -> gradient 계산할 필요 없음. -> grad_fn 구할 필요없다.
        for X_valid, y_valid in test_loader:
            # 1. device 로 이동
            X_valid, y_valid = X_valid.to(device), y_valid.to(device)
            # 2. 추론
            pred_valid = model(X_valid)
            # 3-1. 검증 -> loss 계산
            valid_loss = valid_loss + loss_fn(pred_valid, y_valid).item()
            # 3-2. 검증 -> accuracy 계산
            ## pred_valid shape: (256, 10: class별 확률) -> 정답 class 추출
            pred_valid_class = pred_valid.argmax(dim=-1) # argmax 구하는 축 지정
            valid_acc = valid_acc + torch.sum(y_valid == pred_valid_class).item()

        # 검증결과 누적값의 평균
        valid_loss = valid_loss / len(test_loader)  # loss는 step수 나눔. /len으로 테스트로더를 세고 그 수로 나눔
        valid_acc = valid_acc / len(testset)        # accuracy는 데이터 개수로 나눔.
        valid_loss_list.append(valid_loss)
        valid_acc_list.append(valid_acc)

        # 검증 결과 출력
        print(f"[{epoch+1:02d}/{epochs}] train_loss: {train_loss}, valid_loss: {valid_loss}, valid_acc: {valid_acc}")

e = time.time()
print('학습에 걸린 시간(초):', e-s)
```

```text
[01/20] train_loss: 0.6376297407680087, valid_loss: 0.25914083174429836, valid_acc: 0.9228
[02/20] train_loss: 0.22383691994552937, valid_loss: 0.17663231412880123, valid_acc: 0.9493
[03/20] train_loss: 0.1620592676803597, valid_loss: 0.14346724848728626, valid_acc: 0.9565
[04/20] train_loss: 0.13066547956222144, valid_loss: 0.12115016358438879, valid_acc: 0.9624
[05/20] train_loss: 0.10676431647923768, valid_loss: 0.11322597055695952, valid_acc: 0.9667
[06/20] train_loss: 0.09020588669575687, valid_loss: 0.09977590080816298, valid_acc: 0.969
[07/20] train_loss: 0.07519700410019638, valid_loss: 0.09467497643781826, valid_acc: 0.9704
[08/20] train_loss: 0.06389822868200448, valid_loss: 0.08680601617670618, valid_acc: 0.9743
[09/20] train_loss: 0.05502280326257659, valid_loss: 0.08773887066636235, valid_acc: 0.9739
[10/20] train_loss: 0.04736435934742037, valid_loss: 0.08200394058658275, valid_acc: 0.9751
[11/20] train_loss: 0.03997944346947484, valid_loss: 0.0826036172977183, valid_acc: 0.975
[12/20] train_loss: 0.03611267193292196, valid_loss: 0.08539751485186571, valid_acc: 0.9763
[13/20] train_loss: 0.032701818499332055, valid_loss: 0.09051873986099963, valid_acc: 0.9755
[14/20] train_loss: 0.026562460461376697, valid_loss: 0.08354534854588565, valid_acc: 0.9777
[15/20] train_loss: 0.022983577301423263, valid_loss: 0.08921946459540778, valid_acc: 0.9748
[16/20] train_loss: 0.020230693441147033, valid_loss: 0.08568168958172465, valid_acc: 0.9777
[17/20] train_loss: 0.017370317009890564, valid_loss: 0.09396280387845764, valid_acc: 0.9763
[18/20] train_loss: 0.015788560742154144, valid_loss: 0.10175120339690694, valid_acc: 0.9747
[19/20] train_loss: 0.013519057921436416, valid_loss: 0.09451646826237266, valid_acc: 0.9772
[20/20] train_loss: 0.012424663758964047, valid_loss: 0.11124116450773727, valid_acc: 0.9751
학습에 걸린 시간(초): 68.09314584732056
```

> **보충** 노트북 셀에는 쓰이지 않는 `transform = transforms.Compose([...])` 정의가 들어 있어서 빼고 실행했다. `Compose`는 전처리 여러 개를 순서대로 묶는 클래스로, 데이터 증강을 다룰 때 쓴다.

정리하면 batch 하나마다 이 순서로 돈다.

| 단계 | 코드 |
|---|---|
| 1. device로 이동 | `X.to(device)`, `y.to(device)` |
| 2. 추론 (순전파) | `pred = model(X)` |
| 3. loss 계산 | `loss = loss_fn(pred, y)` |
| 4. gradient 계산 (역전파) | `loss.backward()` |
| 5. 파라미터 업데이트 | `optimizer.step()` |
| 6. gradient 초기화 | `optimizer.zero_grad()` |

선형 회귀 글의 5단계에 "device로 이동"과 "batch 반복"이 붙었을 뿐이다.

> **보충** 모델 출력 `pred`는 클래스별 **확률이 아니라 logit**(softmax 적용 전 점수)이다. `CrossEntropyLoss`가 안에서 softmax를 계산하기 때문에 모델에는 softmax를 넣지 않는다. 그래도 가장 큰 값의 위치는 softmax 전후가 같아서, 예측 클래스는 `argmax`로 바로 꺼낼 수 있다. `model.train()`과 `model.eval()`은 지금 모델에서는 결과가 같지만, 뒤에서 배울 Dropout과 BatchNorm은 두 모드에서 다르게 동작해서 습관처럼 붙인다.

### 학습 로그 시각화

```python
# train loss, valid loss, valid acc 를 epoch 별로 어떻게 변하는지 시각화.
plt.figure(figsize=(10, 5))
plt.subplot(1, 2, 1)
plt.plot(range(1, epochs+1), train_loss_list, label="train loss")
plt.plot(range(1, epochs+1), valid_loss_list, label="valid loss")
plt.title("Loss")
plt.legend()
plt.grid(True, linestyle=":")

plt.subplot(1, 2, 2)
plt.plot(range(1, epochs+1), valid_acc_list)
plt.title("valid accuracy")

plt.tight_layout()
plt.grid(True, linestyle=":")
plt.show()
```

![그래프 출력](/images/dl/dl-mnist-mlp-2.png)

train loss는 끝까지 내려가는데, valid loss는 중간쯤 바닥을 찍고 다시 올라간다. 머신러닝 시리즈에서 본 **과대적합**이 epoch 축에서 나타난 모습이다. 정확도는 0.97대에서 더 오르지 않는다. 이 문제는 마지막 글(성능 개선)에서 다룬다.

## 모델 저장과 불러오기

```python
import os
# saved_dir = "models"
# os.makedirs(saved_dir, exist_ok=True)

save_path = os.path.join(saved_dir, "mnist_model.pt") # pytorch 의 확장자는 pt나 pth 굳이 피클 안써도 됌
save_path
```

```text
'models/mnist_model.pt'
```

```python
# 모델 저장: 파일 확장자 - pt, pth
torch.save(model, save_path)  #  (저장할 모델, 저장할 파일 경로)
```

```python
# 저장된 모델 load(불러오기)
load_model = torch.load(save_path, weights_only=False)
print(load_model)
```

```text
MNISTModel(
  (lr1): Linear(in_features=784, out_features=128, bias=True)
  (lr2): Linear(in_features=128, out_features=64, bias=True)
  (lr3): Linear(in_features=64, out_features=32, bias=True)
  (lr4): Linear(in_features=32, out_features=10, bias=True)
)
```

> **보충** `torch.save(model)`은 모델 **객체 전체**를 pickle로 저장해서, 불러올 때 `MNISTModel` 클래스 정의가 있어야 한다. PyTorch 2.6부터 `torch.load`의 기본값이 `weights_only=True`로 바뀌어 이 방식은 `weights_only=False`를 명시해야 한다. 그래서 실무에서는 파라미터만 저장하는 `torch.save(model.state_dict(), path)` 방식을 더 많이 쓴다. 문제 유형별 모델 글에서 다룬다.

## 모델 성능 최종 평가

```python
load_model = load_model.to(device)
load_model.eval() # 평가모드

test_loss = test_acc = 0
with torch.no_grad():
    for X_test, y_test in test_loader:
        # device 이동
        X_test, y_test = X_test.to(device), y_test.to(device)
        # 추론
        pred_test = load_model(X_test)
        # 검증 - loss
        loss_test = loss_fn(pred_test, y_test)
        test_loss += loss_test.item()
        # 검증 - accuracy
        ## class
        pred_test_class = pred_test.argmax(dim=-1)
        test_acc += torch.sum(pred_test_class == y_test).item()

    test_loss = test_loss / len(test_loader)
    test_acc = test_acc / len(testset)
```

```python
print(test_loss, test_acc)
```

```text
0.11124116450773727 0.9751
```

마지막 epoch의 검증 결과와 같다. 저장하고 불러와도 모델이 그대로라는 뜻이다.

> **보충** 이 노트북은 test set을 매 epoch 검증에도 쓰고 최종 평가에도 썼다. 머신러닝 시리즈에서 정리한 원칙대로라면 train에서 validation set을 따로 떼어 검증하고, test set은 마지막에 한 번만 써야 한다. 다음 글들의 `random_split`이 그 방법이다.

반복문 마지막 batch로 결과 구조를 확인한다.

```python
print(y_test.shape)
y_test[:20]
```

```text
torch.Size([16])
```

```text
tensor([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6])
```

```python
with torch.no_grad():
    p = load_model(X_test)
p.shape
```

```text
torch.Size([16, 10])
```

```python
p_class = p.argmax(dim=-1)
torch.sum(y_test == p_class).item() # 맞은 것의 개수.
```

```text
16
```

마지막 batch는 10000 - 256 × 39 = 16개다.

## 새로운 데이터 추론

직접 그린 숫자 이미지를 넣어 본다. 학습 데이터와 **같은 전처리**(흑백, 28 × 28, ToTensor)를 해야 한다.

```python
from PIL import Image

def load_data(device="cpu", *path):
    """
    받은 경로의 이미지들을 읽어서 Tensor로 변환해 반환한다.

    1. 전달받은 경로의 이미지 파일들을 읽는다.
    2. 28 x 28 로 resize
    3. torch.Tensor로 변환 + 전처리
    4. devcie로 이동시킨 뒤 반환한다다.
    """
    input_tensors = []
    for p in path:
        img = Image.open(p)
        img = img.convert('L')     # grayscale로 변환.
        img = img.resize((28, 28)) # 모델이 학습한 데이터 size(28, 28)로 변환.
        img = transforms.ToTensor()(img)
        input_tensors.append(img)

    return torch.stack(input_tensors).to(device)
```

```python
def predict(model, inputs, device="cpu"):
    """
    받은 model에 inputs를 추론하여 그 결과 class들을 반환한다.
    """
    with torch.no_grad():
        model = model.to(device)
        model.eval()
        pred = model(inputs)
        pred_class = pred.argmax(dim=-1)
        return pred_class
```

```python
# glob을 이용해 테스트 이미지들의 경로 조회.
from glob import glob
file_list = sorted(glob("test_img/*.png"))
file_list
```

```text
['test_img/eight.png', 'test_img/eight2.png', 'test_img/five.png', 'test_img/four.png', 'test_img/four2.png', 'test_img/one.png', 'test_img/seven.png', 'test_img/seven2.png', 'test_img/seven3.png', 'test_img/three.png', 'test_img/three2.png', 'test_img/two.png', 'test_img/two2.png']
```

```python
r = load_data(device, *file_list)
result_pred = predict(load_model, r)
result_pred
```

```text
tensor([2, 3, 5, 4, 4, 6, 7, 3, 3, 3, 3, 2, 2])
```

```python
# 확인

plt.figure(figsize=(10, 5))
for idx, (path, label) in enumerate(zip(file_list, result_pred)):
    # print(idx, path, label, sep=" , ")
    img = Image.open(path).convert('L')
    plt.subplot(3, 5, idx+1)  #3, 4
    plt.imshow(img, cmap="gray")
    plt.title(f"예측결과: {label}")
    plt.axis("off")

plt.tight_layout()
plt.show()
```

![그래프 출력](/images/dl/dl-mnist-mlp-3.png)

파일 이름이 정답이다. 13장 중 8장을 맞혔다. test set 정확도 97%에 비하면 크게 떨어진다. 8 두 장, 1, 획이 굵거나 짧은 7 두 장을 틀렸다.

> **보충** MNIST는 **검은 배경에 흰 글씨**이고 숫자가 이미지 가운데 일정한 크기로 들어 있다. 새 이미지의 배경색, 굵기, 위치가 다르면 정확도가 test set보다 크게 떨어질 수 있다. MLP는 이미지를 784개 숫자로 펼쳐서 보기 때문에 숫자가 조금만 옮겨져도 완전히 다른 입력으로 받아들인다. 이 약점을 해결하는 게 이미지의 공간 구조를 보는 CNN이다.

## 정리

- PyTorch 개발은 **데이터 준비(Dataset, DataLoader) → 모델 정의(nn.Module) → 학습 → 평가** 순서다
- `ToTensor()`는 Tensor 변환, `(C, H, W)` 순서 변경, 0~1 정규화를 한 번에 한다
- **batch**만큼 묶어 한 번 업데이트하는 게 **step**, train set 전체를 한 번 도는 게 **epoch**다
- 모델은 `nn.Module`을 상속해 `__init__`에 레이어를, `forward`에 계산을 정의한다. 이미지는 `flatten`으로 펼쳐 Linear에 넣는다
- 다중 분류는 출력 unit을 클래스 수로 두고 `CrossEntropyLoss`를 쓴다. 출력은 logit이고 예측 클래스는 `argmax(dim=-1)`
- 학습 루프: device 이동 → 추론 → loss → `backward()` → `step()` → `zero_grad()`. 검증은 `eval()` + `no_grad()`
- epoch별 train/valid loss를 그려 보면 과대적합 시점이 보인다
