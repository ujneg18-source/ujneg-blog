---
title: "모델 저장과 문제 유형별 모델: 회귀·다중 분류·이진 분류"
description: "torch.save로 모델 전체와 state_dict를 저장하고 불러오는 방법, checkpoint, torchinfo summary, 그리고 Boston Housing 회귀·Fashion MNIST 다중 분류·유방암 이진 분류 MLP를 직접 학습시키며 출력층·활성 함수·손실 함수가 문제 유형에 따라 어떻게 달라지는지 정리합니다. 학습 중 best model 저장과 조기 종료도 다룹니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '딥러닝'
seriesOrder: 7
originalNotebook: "07_모델저장_문제 유형별 모델 생성.ipynb"
tags: ["Python","PyTorch","state_dict","Early Stopping","MLP"]
date: 2026-06-10
---

> SKN31 딥러닝 과정 노트북 `07_모델저장_문제 유형별 모델 생성.ipynb`를 바탕으로 정리했습니다.
> 코드는 PyTorch 2.5, CPU 4코어 환경에서 실행한 결과입니다. 가중치 초기값과 데이터 섞는 순서가 난수라 loss와 정확도는 노트북과 조금 다릅니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 학습된 모델 저장하기: 모델 전체 vs 파라미터(`state_dict`)만, 그리고 checkpoint
- `torchinfo.summary`로 모델 구조와 파라미터 수 보기
- 문제 유형별 MLP: **회귀**(Boston Housing), **다중 분류**(Fashion MNIST), **이진 분류**(위스콘신 유방암)
- 학습 도중 가장 좋은 모델 저장하기와 **조기 종료(Early Stopping)**
- 유형별로 출력층 unit 수, 활성 함수, 손실 함수를 어떻게 고르는지

지난 글까지는 학습하고 끝이었다. 학습한 모델을 파일로 남겨야 나중에 이어서 학습하거나 예측 서비스에 쓸 수 있다. 그리고 지금까지 MNIST 분류만 해 봤는데, 같은 MLP라도 풀려는 문제가 바뀌면 끝단이 바뀐다.

## 학습된 모델 저장

- 학습이 끝난 모델을 파일로 저장해 두면, 이후 추가 학습이나 예측 서비스에 쓸 수 있다
- PyTorch는 두 가지 방식을 제공한다
  - **모델의 구조와 파라미터를 모두 저장**
  - **모델의 파라미터만 저장**
- 저장 함수: `torch.save(저장할 객체, 저장 경로)`
- 확장자는 보통 `.pt`나 `.pth`를 쓴다

| 방식 | 저장 | 불러오기 | 특징 |
|---|---|---|---|
| 모델 전체 | `torch.save(model, path)` | `torch.load(path, weights_only=False)` | pickle로 직렬화. 불러오는 쪽에도 **클래스 정의가 있어야** 한다 |
| 파라미터만 | `torch.save(model.state_dict(), path)` | 모델을 먼저 만들고 `model.load_state_dict(torch.load(path))` | 구조는 코드로, 값만 파일로. 권장 방식 |
| checkpoint | `torch.save({...dict...}, path)` | dict에서 꺼내 각각 load | optimizer 상태, epoch 등 이어서 학습할 정보까지 |

간단한 모델로 확인한다.

```python
# 간단한 모델 정의
import torch
import torch.nn as nn

class MyModel(nn.Module):

    def __init__(self):
        super().__init__()
        self.lr1 = nn.Linear(3, 4) # 3 X 4 + 4 
        self.lr2 = nn.Linear(4, 2)
        self.relu = nn.ReLU() # activation함수->파라미터가 없는 단순 계산함수. relu(X) = max(X, 0)
    def forward(self, X):
        X = self.lr1(X)
        X = self.relu(X)
        X = self.lr2(X)
        return X
```

```python
# 모델 생성
model = MyModel()
model
```

```text
MyModel(
  (lr1): Linear(in_features=3, out_features=4, bias=True)
  (lr2): Linear(in_features=4, out_features=2, bias=True)
  (relu): ReLU()
)
```

```python
################################################
#  모델에 Layer들을 조회. 모델.instance변수명
################################################
lr_layer = model.lr1
lr_layer
```

```text
Linear(in_features=3, out_features=4, bias=True)
```

```python
################################################
#  Layer의 파라미터(weight/bias) 조회
################################################
lr1_weight = lr_layer.weight
lr1_bias = lr_layer.bias
lr1_weight
```

```text
Parameter containing:
tensor([[-0.0043,  0.3097, -0.4752],
        [-0.4249, -0.2224,  0.1548],
        [-0.0114,  0.4578, -0.0512],
        [ 0.1528, -0.1745, -0.1135]], requires_grad=True)
```

```python
lr1_bias
```

```text
Parameter containing:
tensor([-0.5516, -0.3824, -0.2380,  0.0214], requires_grad=True)
```

### 모델 전체 저장 및 불러오기

```python
import os
os.makedirs("saved_models", exist_ok=True)
```

```python
################################################
#  모델을 저장
################################################
torch.save(model, "saved_models/my_model.pt")
```

```python
################################################
#  저장된 모델 Load
################################################
load_model = torch.load("saved_models/my_model.pt", weights_only=False)
load_model
```

```text
MyModel(
  (lr1): Linear(in_features=3, out_features=4, bias=True)
  (lr2): Linear(in_features=4, out_features=2, bias=True)
  (relu): ReLU()
)
```

```python
load_model.lr1.weight
```

```text
Parameter containing:
tensor([[-0.0043,  0.3097, -0.4752],
        [-0.4249, -0.2224,  0.1548],
        [-0.0114,  0.4578, -0.0512],
        [ 0.1528, -0.1745, -0.1135]], requires_grad=True)
```

저장 전 `model.lr1.weight`와 값이 같다.

> **보충** PyTorch 2.6부터 `torch.load`의 `weights_only` 기본값이 `True`로 바뀌었다. 이 상태에서는 tensor, dict 같은 안전한 타입만 풀 수 있어서, 모델 객체 전체를 저장한 파일은 `weights_only=False`를 줘야 열린다. pickle은 파일 안의 코드를 실행할 수 있으므로, 출처를 모르는 `.pt` 파일에는 `weights_only=False`를 쓰지 않는다. 이 점에서도 `state_dict` 저장 방식이 더 안전하다.

### 모델의 파라미터만 저장: state_dict

- 모델을 구성하는 파라미터만 저장한다
- 구조는 저장하지 않기 때문에, 불러올 때 **모델을 먼저 생성하고 그 모델에 불러온 파라미터를 덮어씌운다**
- **state_dict**: 파라미터 Tensor들을 레이어 단위로 나눠 담은 OrderedDict. `모델객체.state_dict()`로 조회한다

```python
######################################################
# 모델의 파라미터들(weight들, bias들)만 저장/불러오기
######################################################
state_dict = model.state_dict()
state_dict
```

```text
OrderedDict([('lr1.weight', tensor([[-0.0043,  0.3097, -0.4752],
        [-0.4249, -0.2224,  0.1548],
        [-0.0114,  0.4578, -0.0512],
        [ 0.1528, -0.1745, -0.1135]])), ('lr1.bias', tensor([-0.5516, -0.3824, -0.2380,  0.0214])), ('lr2.weight', tensor([[ 0.1977,  0.3000, -0.3390, -0.2177],
        [ 0.1816,  0.4152, -0.1029,  0.3742]])), ('lr2.bias', tensor([-0.0806,  0.0529]))])
```

```python
state_dict.keys()
```

```text
odict_keys(['lr1.weight', 'lr1.bias', 'lr2.weight', 'lr2.bias'])
```

key는 `인스턴스변수명.weight`, `인스턴스변수명.bias` 형식이다. 파라미터가 없는 `relu`는 없다.

```python
###################
# state_dict 저장
################### 

torch.save(state_dict, "saved_models/my_model_parameter.pt")
```

```python
#####################
# state_dict load
#####################
sd = torch.load("saved_models/my_model_parameter.pt")  #weight_only=True (default)
sd.keys()
```

```text
odict_keys(['lr1.weight', 'lr1.bias', 'lr2.weight', 'lr2.bias'])
```

새로 만든 모델은 초기값이 다르다.

```python
# load한 state_dict를 모델 파라미터에 적용(덮어 씌운다.)
new_model = MyModel()
new_model.state_dict()["lr1.weight"]
```

```text
tensor([[ 0.5228, -0.5356, -0.3635],
        [-0.1462, -0.2251,  0.4988],
        [-0.3742, -0.2658, -0.4034],
        [-0.5407, -0.3370,  0.4963]])
```

```python
new_model.load_state_dict(sd)
```

```text
<All keys matched successfully>
```

```python
new_model.state_dict()["lr1.weight"]
```

```text
tensor([[-0.0043,  0.3097, -0.4752],
        [-0.4249, -0.2224,  0.1548],
        [-0.0114,  0.4578, -0.0512],
        [ 0.1528, -0.1745, -0.1135]])
```

`load_state_dict` 후에는 저장한 모델과 같은 값이 된다.

> **보충** `load_state_dict`는 기본적으로 key가 하나라도 다르면 에러를 낸다(`strict=True`). 레이어 이름을 바꾸거나 층을 추가했다면 저장 파일과 맞지 않는다. 일부만 불러오고 싶을 때는 `strict=False`를 주면 맞는 key만 덮어쓰고, 반환값에 빠진 key(`missing_keys`)와 남은 key(`unexpected_keys`)를 알려 준다.

### Checkpoint 저장 및 불러오기

- 학습이 끝나지 않은 모델을 저장했다가 이어서 학습하려면, 모델 파라미터뿐 아니라 optimizer 상태, epoch 등 학습에 필요한 값도 함께 저장해야 한다
- 딕셔너리에 key-value로 담아 `torch.save()`로 저장한다

```python
# 저장
torch.save({
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'loss': train_loss
}, "저장경로")

# 불러오기
model = MyModel()
optimizer = optim.Adam(model.parameters())

# 불러온 checkpoint를 이용해 이전 학습 상태 복원
checkpoint = torch.load("저장경로")
model.load_state_dict(checkpoint['model_state_dict'])
optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
epoch = checkpoint['epoch']
loss = checkpoint['loss']
```

> **보충** optimizer도 `state_dict`가 있다. Adam은 파라미터마다 gradient의 이동 평균(momentum 등)을 들고 있어서, 모델만 불러오고 optimizer를 새로 만들면 이 값이 0부터 다시 시작한다. 이어서 학습할 때 optimizer 상태까지 저장하는 이유다.

### torchinfo: 모델 구조 조회

`torchinfo`는 모델의 레이어 구성과 파라미터 수를 표로 보여 주는 패키지다. (`pip install torchinfo`)

```python
from torchinfo import summary
summary(model)
```

```text
=================================================================
Layer (type:depth-idx)                   Param #
=================================================================
MyModel                                  --
├─Linear: 1-1                            16
├─Linear: 1-2                            10
├─ReLU: 1-3                              --
=================================================================
Total params: 26
Trainable params: 26
Non-trainable params: 0
=================================================================
```

`lr1`의 파라미터 16개는 weight 3×4=12개 + bias 4개다.

```python
# input data 의 shape을 지정하면 각 Layer의 output shape을 출력한다.
summary(model, (100, 3))

# p = model(X)  X의 shape
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
MyModel                                  [100, 2]                  --
├─Linear: 1-1                            [100, 4]                  16
├─ReLU: 1-2                              [100, 4]                  --
├─Linear: 1-3                            [100, 2]                  10
==========================================================================================
Total params: 26
Trainable params: 26
Non-trainable params: 0
Total mult-adds (M): 0.00
==========================================================================================
Input size (MB): 0.00
Forward/backward pass size (MB): 0.00
Params size (MB): 0.00
Estimated Total Size (MB): 0.01
==========================================================================================
```

입력 shape을 주면 레이어마다 출력 shape이 붙는다. `(100, 3)` → `(100, 4)` → `(100, 2)`.

## 문제 유형별 MLP 네트워크

- 해결하려는 문제 유형에 따라 **출력 Layer의 구조**가 바뀐다
- 딥러닝 구조에서 **Feature를 추출하는 Layer들을 Backbone**, **추론하는 Layer들을 Head**라고 한다

> - MLP(Multi Layer Perceptron), DNN(Deep Neural Network), ANN(Artificial Neural Network)
>   - Fully Connected Layer(`nn.Linear`)로 구성된 딥러닝 모델
>   - input feature들 모두에 대응하는 weight들(가중치)을 사용한다

세 문제를 차례로 풀어 본다. Backbone(은닉층)은 비슷하고, Head(출력층)와 손실 함수가 달라지는 것을 보면 된다.

## 회귀: Boston Housing

보스턴 주택가격 데이터셋은 다음 속성으로 해당 타운 주택 가격의 중앙값을 예측하는 문제다.

| 컬럼 | 의미 |
|---|---|
| CRIM | 범죄율 |
| ZN | 25,000 평방피트당 주거지역 비율 |
| INDUS | 비소매 상업지구 비율 |
| CHAS | 찰스강 인접 여부(인접:1, 아니면:0) |
| NOX | 일산화질소 농도(단위: 0.1ppm) |
| RM | 주택당 방의 수 |
| AGE | 1940년 이전에 건설된 주택의 비율 |
| DIS | 5개의 보스턴 직업고용센터와의 거리(가중 평균) |
| RAD | 고속도로 접근성 |
| TAX | 재산세율 |
| PTRATIO | 학생/교사 비율 |
| B | 흑인 비율 |
| LSTAT | 하위 계층 비율 |
| **MEDV** (Target) | 타운의 주택가격 중앙값(단위: 1,000달러) |

```python
import torch
import torch.nn as nn 
from torch.utils.data import TensorDataset, DataLoader
from torchinfo import summary

from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

import pandas as pd
import matplotlib.pyplot as plt

device = "cuda" if torch.cuda.is_available() else "cpu"
print(device)
```

```text
cpu
```

```python
boston = pd.read_csv('data/boston_dataset.csv')
X_boston = boston.drop(columns='MEDV').values
y_boston = boston['MEDV'].values.reshape(-1, 1)  # (506, ) -> (506, 1)
X_boston.shape, y_boston.shape
```

```text
((506, 13), (506, 1))
```

> **보충** scikit-learn 1.2부터 `load_boston()`이 삭제돼서 수업에서는 CSV 파일을 썼다. 노트북에는 `fetch_openml(name="boston", version=1)`로 인터넷에서 받는 셀도 있는데, 결과 shape은 같다. 삭제된 이유는 `B` 컬럼(흑인 비율)이 인종을 집값 변수로 쓰는 윤리 문제 때문이다. 연습용으로는 캘리포니아 주택 데이터(`fetch_california_housing`)가 대신 많이 쓰인다.

y를 `(506, 1)`로 바꾸는 이유는 모델 출력 shape이 `(batch, 1)`이기 때문이다. `MSELoss`에 `(batch,)`와 `(batch, 1)`을 넣으면 broadcasting으로 엉뚱한 값이 계산된다.

```python
X_train, X_test, y_train, y_test = train_test_split(
    X_boston, y_boston, test_size=0.2, random_state=0
)
```

```python
# Feature Scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

```python
X_train_scaled.dtype, y_train.dtype
```

```text
(dtype('float64'), dtype('float64'))
```

numpy는 float64인데 모델 파라미터는 float32라 Tensor로 만들 때 맞춰 준다.

```python
# Dataset 생성
trainset_boston = TensorDataset(
    torch.tensor(X_train_scaled, dtype=torch.float32),
    torch.tensor(y_train, dtype=torch.float32) #dtype은 모델의 dtype인 float32로 설정.
)
testset_boston = TensorDataset(
    torch.tensor(X_test_scaled, dtype=torch.float32),
    torch.tensor(y_test, dtype=torch.float32)
)

len(trainset_boston), len(testset_boston)
```

```text
(404, 102)
```

```python
# 모델 class 정의
## 회귀 - Output Layer의 unit 수: y의 개수 (K, 1)
##      - Output Layer의 Activation 함수 - 보통은 주지 않는다.

class BostonModel(nn.Module):

    def __init__(self):
        super().__init__()
        self.lr1 = nn.Linear(13, 32) # input layer 처리 
        self.lr2 = nn.Linear(32, 16)
        # output layer
        self.lr3 = nn.Linear(16, 1)
        self.relu = nn.ReLU()

    def forward(self, X):
        out = self.lr1(X)
        out = self.relu(out)
        out = self.lr2(out)
        out = self.relu(out)
        output = self.lr3(out)
        return output
```

```python
# 학습
## 모델 생성
boston_model = BostonModel().to(device)
summary(boston_model, (100, 13), device=device)
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
BostonModel                              [100, 1]                  --
├─Linear: 1-1                            [100, 32]                 448
├─ReLU: 1-2                              [100, 32]                 --
├─Linear: 1-3                            [100, 16]                 528
├─ReLU: 1-4                              [100, 16]                 --
├─Linear: 1-5                            [100, 1]                  17
==========================================================================================
Total params: 993
Trainable params: 993
Non-trainable params: 0
Total mult-adds (M): 0.10
==========================================================================================
Input size (MB): 0.01
Forward/backward pass size (MB): 0.04
Params size (MB): 0.00
Estimated Total Size (MB): 0.05
==========================================================================================
```

```python
## 손실함수 - 회귀: MSELoss
loss_fn = nn.MSELoss()
## 옵티마이저 
optimizer = torch.optim.Adam(boston_model.parameters(), lr=0.001) # 모델의 파라미터, learning_rate
```

```python
train_loader_boston = DataLoader(trainset_boston, batch_size=32, shuffle=True)
test_loader_boston = DataLoader(testset_boston, batch_size=32, shuffle=False)
```

한 epoch마다 학습(train)과 검증(validation)을 한 번씩 하고, loss를 리스트에 쌓아 둔다.

```python
epochs = 2000

train_loss_list=[]
val_loss_list=[]

for epoch in range(epochs):
    #######################
    # 학습
    #######################
    boston_model.train()
    train_loss = 0.0
    for X, y in train_loader_boston:
        # 1. X, y 를 device로 이동
        X, y = X.to(device), y.to(device)
        # 2. 추론
        pred = boston_model(X)
        # 3. 오차계산
        loss = loss_fn(pred, y)
        # 4. grad 계산
        loss.backward()
        # 5. 파라미터 업데이트
        optimizer.step()
        # 6. 파라미터의 gradient초기화
        optimizer.zero_grad()

        train_loss += loss.item()

    # 1 epoch loss
    train_loss = train_loss / len(train_loader_boston)

    ########################
    # 검증 - 1 epoch 학습한 것에 대한 검증
    ########################
    boston_model.eval()
    val_loss = 0.0
    with torch.no_grad():
        for X_val, y_val in test_loader_boston:
            #device 이동
            X_val, y_val = X_val.to(device), y_val.to(device)
            # 추론
            pred_val = boston_model(X_val)
            # 검증 = 평가지표 계산
            val_loss += loss_fn(pred_val, y_val).item()
    val_loss /= len(test_loader_boston) # val_loss 평균
    train_loss_list.append(train_loss)
    val_loss_list.append(val_loss)
    if epoch % 100 == 0 or epoch == (epoch -1):
        print(f"[{epoch+1}/{epochs}] train loss: {train_loss}, val_loss: {val_loss}")
```

```text
[1/2000] train loss: 599.920893742488, val_loss: 543.3236236572266
[101/2000] train loss: 8.736463253314678, val_loss: 19.251946806907654
[201/2000] train loss: 6.228284175579365, val_loss: 16.0295991897583
[301/2000] train loss: 5.017985802430373, val_loss: 14.808876514434814
[401/2000] train loss: 3.8446262799776516, val_loss: 13.921155393123627
[501/2000] train loss: 3.2049554769809427, val_loss: 13.412754952907562
[601/2000] train loss: 2.839787327326261, val_loss: 13.535886943340302
[701/2000] train loss: 2.580833380038922, val_loss: 13.589798867702484
[801/2000] train loss: 2.346304013178899, val_loss: 13.567272543907166
[901/2000] train loss: 2.0492882086680484, val_loss: 14.051148295402527
[1001/2000] train loss: 1.9090070724487305, val_loss: 14.512400567531586
[1101/2000] train loss: 1.7206521034240723, val_loss: 15.077734559774399
[1201/2000] train loss: 1.6497032138017507, val_loss: 15.225219070911407
[1301/2000] train loss: 1.505906866146968, val_loss: 15.350881487131119
[1401/2000] train loss: 1.4644619868351862, val_loss: 15.286374241113663
[1501/2000] train loss: 1.3892692510898297, val_loss: 15.493372440338135
[1601/2000] train loss: 1.4200249589406526, val_loss: 15.900639533996582
[1701/2000] train loss: 1.266356273339345, val_loss: 15.914579778909683
[1801/2000] train loss: 1.2673808336257935, val_loss: 15.90526658296585
[1901/2000] train loss: 1.1696392343594477, val_loss: 15.985486507415771
```

> **보충** 마지막 epoch도 찍으려고 넣은 `epoch == (epoch - 1)`은 항상 False다. `epoch == epochs - 1`이어야 한다. 그래서 로그가 1901에서 끝났다.

```python
# 학습 도중 저장한 평가 지표 시각화
plt.plot(range(epochs), train_loss_list, label = "Train Loss")
plt.plot(range(epochs), val_loss_list, label="Validation Loss")
plt.xlabel("Epoch")
plt.ylabel("Loss")

plt.ylim(0,40)
plt.legend()
plt.show()
```

![그래프 출력](/images/dl/dl-model-save-types-1.png)

train loss는 끝까지 줄어드는데, validation loss는 552 epoch에서 13.24로 가장 낮았다가 이후 16 근처로 다시 올라간다. 학습 데이터에만 맞춰지는 과대적합이다. 2000 epoch을 다 돈 모델이 가장 좋은 모델은 아니라는 뜻이다.

```python
# testset 최종 검증

@torch.no_grad() #이 함수는 grad를 대신할 필요가 업슨 함수임을 선언  with torch.no_grad()
def test(model, dataloader, device="cpu"):
    """
    모델의 성능을 평가하고 평균 손실(Loss)을 계산합니다.
    
    """
    boston_model.eval() #검증, 평가, 추론 하는 모델에 설정
    test_loss = 0.0
    with torch.no_grad():
        for X_test, y_test in dataloader:
            #device 이동
            X_test, y_test = X_test.to(device), y_test.to(device)
            # 추론
            pred_test = model(X_test)
            # 검증 = 평가지표 계산
            test_loss += loss_fn(pred_test, y_test).item()
        test_loss /= len(dataloader) # test_loss 평균

    print("최종평가:", test_loss)
```

```python
test(boston_model, train_loader_boston)
test(boston_model, test_loader_boston)
```

```text
최종평가: 1.1032834098889277
최종평가: 16.104075133800507
```

train loss 1.10, test loss 16.10이다. MSE라 단위가 (천 달러)²이고, 제곱근을 씌운 RMSE로 보면 test에서 평균 4.0, 즉 4천 달러 정도 빗나간다.

> **보충** `test()` 함수 안에서 `boston_model.eval()`을 부르고 있다. 매개변수로 받은 `model`이 아니라 바깥의 전역 변수를 eval 모드로 바꾸는 것이라, 다른 모델을 넘기면 그 모델은 train 모드로 평가된다. 이 모델은 Dropout·BatchNorm이 없어서 결과는 같지만 `model.eval()`이 맞다. 또 `@torch.no_grad()` 데코레이터와 `with torch.no_grad():`는 같은 역할이라 하나만 있으면 된다.

학습한 모델을 저장하고 다시 불러와 같은 결과가 나오는지 본다.

```python
# 모델 저장 
## 파라미터만 저장, 모델 전체를 저장
os.makedirs("models", exist_ok=True)
save_path = "models/boston_model.pt"
torch.save(boston_model, save_path)
```

```python
# model로드

load_boston_model = torch.load(save_path, weights_only=False)
load_boston_model = load_boston_model.to(device)
test(load_boston_model, test_loader_boston)
```

```text
최종평가: 16.104075133800507
```

저장 전과 같은 값이다.

## 다중 분류: Fashion MNIST

10개의 범주(category)와 70,000개의 흑백 이미지로 구성된 [Fashion MNIST](https://github.com/zalandoresearch/fashion-mnist) 데이터셋이다. MNIST와 같은 28×28 Gray scale인데, 숫자 대신 옷·신발·가방 이미지다.

| 레이블 | 클래스 | 레이블 | 클래스 |
|---|---|---|---|
| 0 | T-shirt/top | 5 | Sandal |
| 1 | Trouser | 6 | Shirt |
| 2 | Pullover | 7 | Sneaker |
| 3 | Dress | 8 | Bag |
| 4 | Coat | 9 | Ankle boot |

### 학습 도중 모델 저장과 조기 종료

- 학습 도중에 가장 좋은 성능이 나오는 지점이 있을 수 있다. 끝까지 학습한 모델이 제일 좋다는 보장이 없다 (위 Boston의 val loss가 그랬다)
- 학습 도중 모델을 저장하는 방법
  1. 각 에폭이 끝날 때마다 모델을 저장한다
  2. 한 에폭 학습 후 성능 개선이 있으면 저장해서, 가장 성능 좋은 모델만 남긴다
     - 최고 성능 점수(best score)와 현재 에폭의 성능을 비교해, 개선됐으면 저장(덮어쓰기)한다
- **조기 종료(Early Stopping)**: 에폭 수를 충분히 길게 잡고, 정해 둔 횟수(patience) 동안 성능 개선이 없으면 학습을 중간에 끝낸다

```python
# 학습 도중에 가장 좋은 성적을 보이는 지점에서 학습(epoch)을 저장함
# 보통은 10epoch이상 줌
# 성능이 더 이상 개선되지 않으면 학습을 종료
import torch
import torch.nn as nn

from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms 
from torchinfo import summary
```

```python
device = " cuda" if torch.cuda.is_available() else "cpu"
#device
epochs = 100
batch_size = 200
learing_rate = 0.001
```

> **보충** `" cuda"` 앞에 공백이 들어가 있다. 이 환경은 GPU가 없어서 `"cpu"`가 선택돼 문제가 없지만, GPU가 있는 곳에서는 `.to(" cuda")`가 잘못된 장치 문자열이라 에러가 난다.

먼저 transform 없이 불러서 데이터를 본다.

```python
# 연습용
# 2. FashionMNIST 학습용 데이터셋 (Train)
f_trainset = datasets.FashionMNIST(
    root="datasets", 
    train=True, 
    download=True,
    # transform=transform
)

# 3. FashionMNIST 검증용 데이터셋 (Test)
f_testset = datasets.FashionMNIST(
    root="datasets", 
    train=False,  
    download=True,
    # transform=transform
)

len(f_trainset), len(f_testset)
```

```text
(60000, 10000)
```

```python
import random
idx = random.randint(0, 6000)
print(f_trainset[idx][1], f_trainset.classes[f_trainset[idx][1]])
```

```text
0 T-shirt/top
```

> **보충** `random.randint(0, 6000)`은 60,000장 중 앞쪽 6,001장에서만 고른다. 전체에서 고르려면 `random.randrange(len(f_trainset))`이다.

```python
# 보충: 클래스별로 한 장씩 보기
fig, axes = plt.subplots(1, 10, figsize=(15, 2))
for c in range(10):
    i = f_trainset.targets.tolist().index(c)
    axes[c].imshow(f_trainset[i][0], cmap="gray")
    axes[c].set_title(f_trainset.classes[c], fontsize=9)
    axes[c].axis("off")
plt.show()
```

![그래프 출력](/images/dl/dl-model-save-types-2.png)

이번엔 `ToTensor`를 넣어 다시 만들고, train 60,000장을 train 50,000 / validation 10,000으로 나눈다. test set은 마지막 평가에만 쓴다.

```python
# Dataset 생성 + 전처리

# 1. 전처리 정의 (기본적으로 텐서 변환은 필수입니다)
transform = transforms.ToTensor()

# 2. FashionMNIST 학습용 데이터셋 (Train)
f_trainset = datasets.FashionMNIST(
    root="datasets", 
    train=True, 
    download=True,
    transform=transform
)

# 3. FashionMNIST 검증용 데이터셋 (Test)
f_testset = datasets.FashionMNIST(
    root="datasets", 
    train=False,  
    download=True,
    transform=transform
)


# trainset을 trainset과 validationset으로 나눔 5만 1만
f_trainset, f_validset = random_split(f_trainset, [50000, 10000])



len(f_trainset), len(f_testset), len(f_validset)
```

```text
(50000, 10000, 10000)
```

```python
x0 = f_trainset[0][0]
type(x0), x0.size, x0.dtype
```

```text
(<class 'torch.Tensor'>, <built-in method size of Tensor object at 0xe4501c9859e0>, torch.float32)
```

> **보충** `x0.size`는 메소드라 괄호 없이 쓰면 함수 객체가 나온다. `x0.size()` 또는 `x0.shape`로 써야 `torch.Size([1, 28, 28])`이 나온다.

```python
#Dataloaedr 생성
f_train_loader = DataLoader(f_trainset, batch_size=batch_size, shuffle=True, drop_last=True)
f_test_loader = DataLoader(f_testset, batch_size=batch_size)
f_valid_loader = DataLoader(f_validset, batch_size=batch_size)
print(len(f_train_loader), len(f_test_loader), len(f_valid_loader))
```

```text
250 50 50
```

```python
# 데이터셋 장수 역산해보기 (배치 크기가 200일 때)학습 데이터 

# 트레인데이터 (f_train_loader) : 250개 배치
# 250 * 200 = 50000
# drop_last=True로 인해 자투리가 버려졌을 수 있지만, 대략 5만 장의 이미지로 모델을 학습시키게 됩니다.

# 테스트 데이터 (f_test_loader) : 50개 배치
# 50 * 200 = 10,000장

# 검증 데이터 (f_valid_loader) : 50개 배치
# 50 * 200 = 10,000장
# FashionMNIST의 총 데이터 개수인 7만 장(학습용 6만 장 + 테스트용 1만 장)을 아주 이상적인 5:1:1 비율로 깔끔하게 분할
```

50,000은 200으로 나눠떨어져서 이 경우 `drop_last=True`로 버려지는 데이터는 없다.

```python
###모델의 클래스 정의
class FasionMNISTModel(nn.Module):

    def __init__(self):
        super().__init__()
        self.lr1 = nn.Linear(28*28, 512) # (입력Layer, 출력=임의)
        # Hidden Layer - feature vector를 추출
        self.lr2 = nn.Linear(512, 256) 
        self.lr3 = nn.Linear(256, 128) 
        self.lr4 = nn.Linear(128, 64) 
        self.lr5 = nn.Linear(64, 32) 

        #출력층 out_features개수: y의 class개수.
        #                                   정잡이 클래스일 확률을 계산할때 사용값 (logit)
        self.lr6 = nn.Linear(32, 10) 
        # 활성 함수 -> ReLU()
        self.relu = nn.ReLU()
        


    def forward(self, X):
        # X: (1,28,28) => 1차원 (1*28*28) -> Liner
        out = nn.Flatten()(X) #nn.Flatten(): 0축은 놔두고 1축 부터 flatten한다. 

        # 선형(Linear) -> 비선형(ReLU)
        out = self.lr1(out)  # == self.relu(self.lr1(out))
        out = self.relu(out)

        out = self.lr2(out)
        out = self.relu(out)

        out = self.lr3(out)
        out = self.relu(out)

        out = self.lr4(out)
        out = self.relu(out)

        out = self.lr5(out)
        out = self.relu(out)

        #출력 결과
        output = self.lr6(out)
        return output
```

```python
# 모델 생성
f_model = FasionMNISTModel().to(device)
summary(f_model,(batch_size, 1, 28, 28), device=device)
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
FasionMNISTModel                         [200, 10]                 --
├─Linear: 1-1                            [200, 512]                401,920
├─ReLU: 1-2                              [200, 512]                --
├─Linear: 1-3                            [200, 256]                131,328
├─ReLU: 1-4                              [200, 256]                --
├─Linear: 1-5                            [200, 128]                32,896
├─ReLU: 1-6                              [200, 128]                --
├─Linear: 1-7                            [200, 64]                 8,256
├─ReLU: 1-8                              [200, 64]                 --
├─Linear: 1-9                            [200, 32]                 2,080
├─ReLU: 1-10                             [200, 32]                 --
├─Linear: 1-11                           [200, 10]                 330
==========================================================================================
Total params: 576,810
Trainable params: 576,810
Non-trainable params: 0
Total mult-adds (M): 115.36
==========================================================================================
Input size (MB): 0.63
Forward/backward pass size (MB): 1.60
Params size (MB): 2.31
Estimated Total Size (MB): 4.54
==========================================================================================
```

출력층은 class 수인 10개 unit이고 활성 함수를 넣지 않았다. 출력은 class별 **logit**(softmax 전 값)이다. `CrossEntropyLoss`가 내부에서 softmax(정확히는 LogSoftmax)를 하기 때문이다.

```python
# loss 함수 다중분류: CrossEntropyLoss() 모델예측값 X: softmax(), y: OneHotEncoding 변환 후 loss계산
loss_fn = nn.CrossEntropyLoss()
# optimizer
optimizer = torch.optim.Adam(f_model.parameters(), lr=learing_rate)
```

검증과 최종 평가에 같이 쓸 평가 함수를 만든다. loss와 accuracy를 반환한다.

```python
@torch.no_grad()
def f_mnist_test(model, dataloader, device="cpu"):
    """평가함수 loss와 accuracy 계산해서 반환"""
    model = model.to(device)
    model.eval()
    loss = 0.0
    accuracy = 0.0
    for X, y in dataloader:
        #1. X, y를 device로 이동
        X, y = X.to(device), y.to(device)
        #2.추론
        pred = model(X) # pred: class별 logit(확률 계산 전 값)
        pred_label = torch.argmax(pred, dim= -1)


        #3.검증/평가
        loss += loss_fn(pred, y).item()
        accuracy += torch.sum(pred_label == y).item()

    loss /= len(dataloader) # loss/누적횟수 = 평균
    accuracy/=len(dataloader.dataset)
    return loss, accuracy #{"loss":loss, "accuaracy":accuracy}
```

학습 루프에 best model 저장과 조기 종료를 넣는다. 기준은 validation loss다.

```python
##### 학습
import time

train_loss_list = []
val_loss_list = []
val_acc_list = []

# 학습 중 성능이 개선이 되면 모델을 저장.
# 지정한 epoch 동안 성능이 개선되지 않으면 학습을 중지(early stopping)

best_score = torch.inf  # 성능개선여부를 validation loss로 모니터링. 시작: 제일큰수(무한)
save_model_path = "saved_models/fashion_mnist_model.pth" # 성능개선된 epoch의 모델을 저장할 경로

# 조기종료
patience = 10 # 몇 epoch동안 성능 개선을 확인할 지.
stop_count = 0 # 성능개선이 안될 때 몇번째 학습중인지 저장할 변수. patience == stop_count 종료

s = time.time()
for epoch in range(epochs):
    ########## train
    f_model.train()
    train_loss = 0.0
    for X_train, y_train in f_train_loader: # batch단위로 학습
        # 1. model과 같은 device로 X, y를 이동
        X_train, y_train = X_train.to(device), y_train.to(device)
        
        # 2. 추론
        pred_train = f_model(X_train) 

        # 3. loss 계산
        loss_train = loss_fn(pred_train, y_train)

        # 4. gradient값 계산
        loss_train.backward()

        # 5. parameter update             # 객체,함수,파라미터를 다 외우기보다/문해력/독해력처럼 뭐하는 건지 알야함
        optimizer.step()

        # 6. parameter grad값 초기화
        optimizer.zero_grad()

        train_loss += loss_train.item() # 현재 step의 loss를 train_loss에 누적

    # 1 epoch 학습한 loss를 계산(평균)
    train_loss /= len(f_train_loader)
    train_loss_list.append(train_loss)

    ########## validation
    f_model.eval()
    val_loss, val_acc = f_mnist_test(
        model=f_model, dataloader=f_valid_loader, device=device
    )
    val_loss_list.append(val_loss)
    val_acc_list.append(val_acc)

    # 현재 epoch 학습 결과 로그 출력
    print(f"[{epoch+1}/{epoch}] train loss: {train_loss}, val loss: {val_loss}, val acc: {val_acc}")

    ## 성능개선시 모델저장, 성능개선 없으면 조기종료 ##
    #성능: validation loss를 기준
    if val_loss < best_score:
        # 저장 베스트 스코어를 발스코어로 변경
        torch.save(f_model, save_model_path)
        # 저장했다는 로그 출력
        print(f">>>>>> {epoch+1}에서 모델 저장 - 이전 score: {best_score}, 개선된 score:{val_loss}")
        best_score = val_loss
        #stop_count를 초기화함
        stop_count = 0

    else:
        stop_count += 1
        if patience == stop_count:
            print(f">>>>>>>> 학습을 조기종료합니다. val loss가 {best_score}에서 개선되지 않았습니다")
            break


e = time.time()
print("걸린시간(초):", round(e-s, 1))
```

```text
[1/0] train loss: 0.8027590898275375, val loss: 0.4981640064716339, val acc: 0.8298
>>>>>> 1에서 모델 저장 - 이전 score: inf, 개선된 score:0.4981640064716339
[2/1] train loss: 0.45912881660461424, val loss: 0.4194665151834488, val acc: 0.8536
>>>>>> 2에서 모델 저장 - 이전 score: 0.4981640064716339, 개선된 score:0.4194665151834488
[3/2] train loss: 0.3939939175248146, val loss: 0.44209388017654416, val acc: 0.839
[4/3] train loss: 0.3529623922109604, val loss: 0.3691943687200546, val acc: 0.8624
>>>>>> 4에서 모델 저장 - 이전 score: 0.4194665151834488, 개선된 score:0.3691943687200546
[5/4] train loss: 0.33466556352376936, val loss: 0.3462729090452194, val acc: 0.877
>>>>>> 5에서 모델 저장 - 이전 score: 0.3691943687200546, 개선된 score:0.3462729090452194
[6/5] train loss: 0.31360305958986284, val loss: 0.3548163431882858, val acc: 0.8734
[7/6] train loss: 0.300512889444828, val loss: 0.3308102175593376, val acc: 0.883
>>>>>> 7에서 모델 저장 - 이전 score: 0.3462729090452194, 개선된 score:0.3308102175593376
[8/7] train loss: 0.28484386295080183, val loss: 0.33061046808958056, val acc: 0.8799
>>>>>> 8에서 모델 저장 - 이전 score: 0.3308102175593376, 개선된 score:0.33061046808958056
[9/8] train loss: 0.2781344845890999, val loss: 0.32290302217006683, val acc: 0.8857
>>>>>> 9에서 모델 저장 - 이전 score: 0.33061046808958056, 개선된 score:0.32290302217006683
[10/9] train loss: 0.26182698547840116, val loss: 0.32614138424396516, val acc: 0.8865
[11/10] train loss: 0.255646219432354, val loss: 0.3405213701725006, val acc: 0.8845
[12/11] train loss: 0.24867808187007903, val loss: 0.3332060238718986, val acc: 0.8847
[13/12] train loss: 0.23908702301979065, val loss: 0.31614359200000763, val acc: 0.8929
>>>>>> 13에서 모델 저장 - 이전 score: 0.32290302217006683, 개선된 score:0.31614359200000763
[14/13] train loss: 0.2250002542734146, val loss: 0.3275075322389603, val acc: 0.8873
[15/14] train loss: 0.21734250289201737, val loss: 0.31323372304439545, val acc: 0.8986
>>>>>> 15에서 모델 저장 - 이전 score: 0.31614359200000763, 개선된 score:0.31323372304439545
[16/15] train loss: 0.2078493147790432, val loss: 0.3216937884688377, val acc: 0.8952
[17/16] train loss: 0.20731111913919448, val loss: 0.30801129430532453, val acc: 0.9003
>>>>>> 17에서 모델 저장 - 이전 score: 0.31323372304439545, 개선된 score:0.30801129430532453
[18/17] train loss: 0.1972264521718025, val loss: 0.31788153350353243, val acc: 0.8919
[19/18] train loss: 0.1922064708173275, val loss: 0.32514287501573563, val acc: 0.8955
[20/19] train loss: 0.18478546315431596, val loss: 0.34500062704086304, val acc: 0.8889
[21/20] train loss: 0.18222034314274788, val loss: 0.33215819239616395, val acc: 0.8967
[22/21] train loss: 0.17666757062077523, val loss: 0.33195248872041705, val acc: 0.8982
[23/22] train loss: 0.16882251620292663, val loss: 0.339517243206501, val acc: 0.8943
[24/23] train loss: 0.16127024856209754, val loss: 0.354490809738636, val acc: 0.8987
[25/24] train loss: 0.16119291579723358, val loss: 0.3457760867476463, val acc: 0.8952
[26/25] train loss: 0.15548547208309174, val loss: 0.36814252376556394, val acc: 0.8918
[27/26] train loss: 0.15456090119481086, val loss: 0.3311988416314125, val acc: 0.9007
>>>>>>>> 학습을 조기종료합니다. val loss가 0.30801129430532453에서 개선되지 않았습니다
걸린시간(초): 106.3
```

val loss는 17 epoch에서 0.3080으로 가장 낮았고, 이후 10 epoch 동안 개선이 없어 27 epoch에서 멈췄다. `epochs = 100`으로 잡았지만 27번만 돌았다. 파일에 남은 모델은 마지막 27 epoch이 아니라 17 epoch의 모델이다.

> **보충** 로그의 `[{epoch+1}/{epoch}]`는 `[{epoch+1}/{epochs}]`의 오타다. 그래서 `[1/0]`, `[2/1]`처럼 찍혔다.

```python
# 학습 결과 시각화
import pandas as pd
train_result = pd.DataFrame({
    "train loss": train_loss_list,
    "valid loss": val_loss_list,
    "val accuracy": val_acc_list  

})

train_result.rename_axis(index="Epoch", inplace=True)
train_result.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th>Epoch</th><th>train loss</th><th>valid loss</th><th>val accuracy</th></tr></thead><tbody><tr><th class="idx">0</th><td>0.802759</td><td>0.498164</td><td>0.8298</td></tr><tr><th class="idx">1</th><td>0.459129</td><td>0.419467</td><td>0.8536</td></tr><tr><th class="idx">2</th><td>0.393994</td><td>0.442094</td><td>0.839</td></tr><tr><th class="idx">3</th><td>0.352962</td><td>0.369194</td><td>0.8624</td></tr><tr><th class="idx">4</th><td>0.334666</td><td>0.346273</td><td>0.877</td></tr></tbody></table></div></div>

```python
train_result[["train loss","valid loss"]].plot(ylabel="Loss");
```

![그래프 출력](/images/dl/dl-model-save-types-3.png)

train loss는 계속 내려가지만 valid loss는 0.31~0.37 사이에서 오르내리며 더 내려가지 않는다. 두 선이 벌어지기 시작하는 구간에서 조기 종료가 학습을 끊었다.

저장된 best model을 불러와 test set으로 최종 평가한다.

```python
f_load_model = torch.load(save_model_path, weights_only=False)
test_loss, test_acc = f_mnist_test(
    model=f_load_model, dataloader=f_test_loader, device=device
)
print(test_loss, test_acc)
```

```text
0.327360126376152 0.8883
```

test accuracy는 88.8%로, best epoch의 validation accuracy(90.0%)보다 조금 낮다.

### 이미지 한 장 추론하기

```python
x,y = f_testset[0]
print(x.shape)
x = x.unsqueeze(dim=0) # 축을 하나 늘려서 모델에 넣어줘야 함
print(x.shape)
```

```text
torch.Size([1, 28, 28])
torch.Size([1, 1, 28, 28])
```

모델은 `(batch, 1, 28, 28)`을 받으므로 한 장이어도 batch 축을 만들어 넣는다.

```python
with torch.no_grad():
    p = f_load_model(x)
p
```

```text
tensor([[-6.3383, -7.1909, -8.0105, -7.4623, -8.5470, -2.1125, -7.4832,  0.1782,
         -4.6498,  6.8946]])
```

```python
# 정답 class를 조회하려고 함
p.argmax(dim=1)
```

```text
tensor([9])
```

출력은 logit이라 확률로 보려면 softmax를 한다.

```python
# 정답 확률
print(p.shape)
proba = torch.softmax(p, dim=-1)

print(proba)

m=proba.max()
print("확률:", m.values, "label:", m.indices)
```

```text
torch.Size([1, 10])
tensor([[1.7882e-06, 7.6238e-07, 3.3591e-07, 5.8118e-07, 1.9642e-07, 1.2237e-04,
         5.6911e-07, 1.2092e-03, 9.6774e-06, 9.9865e-01]])
확률: <built-in method values of Tensor object at 0xe44ff4d3acf0> label: <built-in method indices of Tensor object at 0xe44ff4d3acf0>
```

`proba.max()`처럼 `dim` 없이 부르면 전체에서 최댓값 하나만 담은 tensor가 나온다. 이 tensor의 `values`, `indices`는 값이 아니라 메소드라서 위처럼 메소드 객체가 찍힌다. `dim`을 주면 `values`와 `indices`를 함께 돌려준다.

```python
# 보충: dim을 줘야 (values, indices)가 나온다
m = proba.max(dim=-1)
print("확률:", m.values.item(), "label:", m.indices.item(), f_testset.classes[m.indices.item()])
print("정답:", y, f_testset.classes[y])
```

```text
확률: 0.9986544847488403 label: 9 Ankle boot
정답: 9 Ankle boot
```

> **보충** 노트북에서는 이어서 `p.max(dim=-1)`을 실행했는데, `p`는 softmax 전 logit이라 values가 확률이 아니다. 어느 class인지(`indices`)는 logit이든 확률이든 같지만, 확률값은 `proba`에서 꺼내야 한다.

## 이진 분류: 위스콘신 유방암

이진 분류 모델을 만드는 방법은 두 가지다.

| 방식 | 출력층 unit | 출력 활성 함수 | loss | 정답 형태 |
|---|---|---|---|---|
| 1. positive(1)일 확률 하나 출력 | 1 | Sigmoid | Binary crossentropy (`BCELoss`) | 0 / 1 |
| 2. 다중 분류처럼 처리 | 2 | Softmax | Categorical crossentropy (`CrossEntropyLoss`) | class index |

- 위스콘신 대학교에서 제공한 종양의 악성/양성 여부 분류 데이터셋
- Feature: 종양에 대한 다양한 측정값 30개
- Target: 0 - malignant(악성종양), 1 - benign(양성종양)

모델 클래스를 만들다 `nn.Module`을 `nn.mudule`로 잘못 쓰면, 아래처럼 클래스를 정의하는 순간 바로 에러가 난다.

```python
class BCModel(nn.mudule):

    def __init__(self):
        super().__init__()
        self.lr1 = nn.Linear(30,16)
        self.lr2 = nn.Linear(16,8)
        #출력층 - out_features: 1 - 양성(positive)일 확률을 출력
        self.lr3 = nn.Linear(8,1)
        #은닉층의 활성(activation)함수 - Relu

    def forward(self, X):
        pass
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · AttributeError: module &#x27;torch.nn&#x27; has no attribute &#x27;mudule&#x27;</div></div>

`class 이름(부모):`의 부모 부분은 정의할 때 평가되기 때문에, 인스턴스를 만들기 전에 이미 실패한다. 아래는 `nn.Module`을 상속해 다시 만든 버전이다.

```python
from sklearn.datasets import load_breast_cancer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

import numpy as np
import matplotlib.pyplot as plt

device = "cuda" if torch.cuda.is_available() else "cpu"
print(device)
```

```text
cpu
```

```python
# Dataset
X, y = load_breast_cancer(return_X_y=True)
y = y.reshape(-1, 1)
X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, test_size=0.25, random_state=0)
```

```python
# 전처리
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

```python
# Dataset
## 모델의 weight, bias -> float32. X, y는 weight, bias와 계산을 하게 되기 때문에 타입을 맞춰준다.
trainset = TensorDataset(
    torch.tensor(X_train_scaled, dtype=torch.float32),  
    torch.tensor(y_train, dtype=torch.float32)
)
testset = TensorDataset(
    torch.tensor(X_test_scaled, dtype=torch.float32), 
    torch.tensor(y_test, dtype=torch.float32)
)
```

`BCEWithLogitsLoss`는 정답도 float이어야 해서 y를 float32로 만든다. 다중 분류의 `CrossEntropyLoss`는 정답이 정수(int64) class index였던 것과 다르다.

```python
# class name <-> class index
classes = np.array(["악성종양", "양성종양"])
class_to_idx = {"악성종양":0, "양성종양":1}

trainset.classes = classes
trainset.class_to_idx = class_to_idx
```

```python
# DataLoader
train_loader = DataLoader(trainset, batch_size=200, shuffle=True, drop_last=True)
test_loader = DataLoader(testset, batch_size=100)
```

```python
######### 모델 정의
class BreastCancerModel(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        # 선형 레이어 구성 (입력 피처 수 -> 32 -> 16 -> 1)
        self.linear_block = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1) # BCEWithLogitsLoss를 사용할 것이므로 마지막엔 Sigmoid를 적용하지 않습니다.
        )
        
    def forward(self, X):
        return self.linear_block(X)

# 모델 생성 및 디바이스 이동
input_features = X_train_scaled.shape[1] # 30
model = BreastCancerModel(input_features).to(device)

# 손실함수 및 옵티마이저 정의
criterion = nn.BCEWithLogitsLoss() # Sigmoid가 내장되어 역전파 수치 안정성이 높음
optimizer = optim.Adam(model.parameters(), lr=0.005)
```

이번에는 레이어를 `nn.Sequential`로 묶었다. 넣은 순서대로 실행하는 컨테이너라서 `forward`가 한 줄이 된다.

> **보충** 출력층에 Sigmoid를 넣고 `BCELoss`를 쓰는 것과, Sigmoid 없이 logit을 내고 `BCEWithLogitsLoss`를 쓰는 것은 수학적으로 같다. 후자가 sigmoid와 log를 한 번에 계산해서 logit이 아주 크거나 작을 때도 `log(0)` 같은 문제가 없다. 대신 이 모델의 **출력은 확률이 아니라 logit**이라는 점을 추론할 때 기억해야 한다. 아래에서 이걸 놓친 결과가 나온다.

```python
import os

os.makedirs("saved_bc_models", exist_ok=True)  # 폴더 없으면 생성
save_bc_model_path = "saved_bc_models/model.pth"
```

학습 루프는 Fashion MNIST와 같은 구조다. 이번에는 `state_dict`만 저장한다.

```python
######### 학습
import time

EPOCHS = 1000
train_loss_list = []
test_loss_list = []
test_acc_list = []

best_score = torch.inf
patience = 30
stop_count = 0

s = time.time()
for epoch in range(EPOCHS):

    ########## train
    model.train()
    train_loss = 0.0

    for X_batch, y_batch in train_loader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device)

        # 1. 예측
        pred = model(X_batch)

        # 2. loss 계산
        loss = criterion(pred, y_batch)

        # 3. gradient 계산
        loss.backward()

        # 4. 가중치 업데이트
        optimizer.step()

        # 5. gradient 초기화
        optimizer.zero_grad()

        train_loss += loss.item()

    # 1 epoch 평균 train loss
    train_loss /= len(train_loader)
    train_loss_list.append(train_loss)


    ########## test
    model.eval()
    test_loss = 0.0
    correct = 0  # 추가

    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            pred = model(X_batch)
            loss = criterion(pred, y_batch)
            test_loss += loss.item()
            
            # accuracy 계산 추가
            pred_class = (pred > 0.5).type(torch.int32)
            correct += (pred_class.squeeze() == y_batch).sum().item()

    test_loss /= len(test_loader)
    test_acc = correct / len(test_loader.dataset)  # 추가
    test_loss_list.append(test_loss)
    test_acc_list.append(test_acc)

    # 현재 epoch 학습 결과 로그 출력
    if (epoch + 1) % 10 == 0:
        print(f"[{epoch+1}/{EPOCHS}] train loss: {train_loss:.4f} | test loss: {test_loss:.4f} | test acc: {test_acc:.4f}")

    ## 성능 개선 시 모델 저장, 아니면 조기종료 ##
    if test_loss < best_score:
        torch.save(model.state_dict(), save_bc_model_path)
        print(f"{epoch+1}에서 모델 저장 - 이전 score: {best_score:.4f}, 개선된 score: {test_loss:.4f}")
        best_score = test_loss
        stop_count = 0
    else:
        stop_count += 1
        if patience == stop_count:
            print(f">>>>>>>>>학습을 조기종료합니다. test loss가 {best_score:.4f}에서 개선되지 않았습니다.")
            break

e = time.time()
print("걸린시간(초):", round(e - s, 1))
```

```text
1에서 모델 저장 - 이전 score: inf, 개선된 score: 0.6027
2에서 모델 저장 - 이전 score: 0.6027, 개선된 score: 0.5446
3에서 모델 저장 - 이전 score: 0.5446, 개선된 score: 0.4865
4에서 모델 저장 - 이전 score: 0.4865, 개선된 score: 0.4289
5에서 모델 저장 - 이전 score: 0.4289, 개선된 score: 0.3742
6에서 모델 저장 - 이전 score: 0.3742, 개선된 score: 0.3250
7에서 모델 저장 - 이전 score: 0.3250, 개선된 score: 0.2810
8에서 모델 저장 - 이전 score: 0.2810, 개선된 score: 0.2416
9에서 모델 저장 - 이전 score: 0.2416, 개선된 score: 0.2072
[10/1000] train loss: 0.1701 | test loss: 0.1779 | test acc: 43.9510
10에서 모델 저장 - 이전 score: 0.2072, 개선된 score: 0.1779
11에서 모델 저장 - 이전 score: 0.1779, 개선된 score: 0.1546
12에서 모델 저장 - 이전 score: 0.1546, 개선된 score: 0.1366
13에서 모델 저장 - 이전 score: 0.1366, 개선된 score: 0.1232
14에서 모델 저장 - 이전 score: 0.1232, 개선된 score: 0.1140
15에서 모델 저장 - 이전 score: 0.1140, 개선된 score: 0.1082
16에서 모델 저장 - 이전 score: 0.1082, 개선된 score: 0.1055
17에서 모델 저장 - 이전 score: 0.1055, 개선된 score: 0.1051
[20/1000] train loss: 0.0495 | test loss: 0.1086 | test acc: 43.6783
[30/1000] train loss: 0.0338 | test loss: 0.1128 | test acc: 43.8112
[40/1000] train loss: 0.0242 | test loss: 0.1175 | test acc: 43.8112
>>>>>>>>>학습을 조기종료합니다. test loss가 0.1051에서 개선되지 않았습니다.
걸린시간(초): 0.2
```

17 epoch에서 test loss 0.1051이 가장 낮았고, 30 epoch 동안 개선이 없어 47 epoch에서 멈췄다. 데이터가 작아서 0.4초 만에 끝난다. 그런데 로그의 test acc가 43.68, 43.81이다.

accuracy는 0~1 사이여야 하는데 43을 넘는다. 원인은 이 줄이다.

```python
correct += (pred_class.squeeze() == y_batch).sum().item()
```

`pred_class.squeeze()`는 `(100,)`이고 `y_batch`는 `(100, 1)`이다. shape이 다른 두 tensor를 `==`로 비교하면 broadcasting으로 `(100, 100)` 행렬이 만들어져, 모든 예측과 모든 정답을 서로 비교한 개수가 더해진다.

```python
# 보충: shape 확인
X_batch, y_batch = next(iter(test_loader))
with torch.no_grad():
    pred = model(X_batch)
pred_class = (pred > 0.5).type(torch.int32)
print(pred_class.squeeze().shape, y_batch.shape, (pred_class.squeeze() == y_batch).shape)
```

```text
torch.Size([100]) torch.Size([100, 1]) torch.Size([100, 100])
```

> **보충** 고칠 곳은 두 군데다. shape은 squeeze를 빼고 `(pred_class == y_batch)`로 `(100, 1)`끼리 비교한다. 그리고 `pred`는 logit이라 `pred > 0.5`가 아니라 `torch.sigmoid(pred) > 0.5`, 같은 뜻으로 `pred > 0`이어야 한다. sigmoid(0) = 0.5이기 때문이다.

```python
# 보충: 고친 accuracy
model.load_state_dict(torch.load(save_bc_model_path))
model.eval()
correct_wrong, correct_fixed = 0, 0
with torch.no_grad():
    for X_batch, y_batch in test_loader:
        logit = model(X_batch)
        correct_wrong += ((logit > 0.5).int() == y_batch).sum().item()             # shape만 고침
        correct_fixed += ((torch.sigmoid(logit) > 0.5).int() == y_batch).sum().item()  # 둘 다 고침
print("logit > 0.5   :", correct_wrong / len(testset))
print("sigmoid > 0.5 :", correct_fixed / len(testset))
```

```text
logit > 0.5   : 0.9440559440559441
sigmoid > 0.5 : 0.951048951048951
```

logit에 0.5 기준을 쓰면 0.944, sigmoid를 거치면 0.951이다. 143개 중 한 개 차이로, logit이 0과 0.5 사이(확률로는 0.5~0.62)인 샘플이 0으로 분류된 것이다. 이 데이터에서는 차이가 작지만, 기준값이 뜻하는 확률이 0.5가 아니라 0.62로 바뀐 것이다.

```python
# 학습 결과 시각화
plt.plot(train_loss_list, label='Train Loss')
plt.plot(test_loss_list, label='Test Loss')
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()
plt.show()
```

![그래프 출력](/images/dl/dl-model-save-types-4.png)

> **보충** 이 예제는 조기 종료와 best model 선택을 **test set**의 loss로 했다. 그러면 test set이 모델 선택에 쓰여서, 마지막에 test set으로 잰 성능은 더 이상 처음 보는 데이터에 대한 성능이 아니다. Fashion MNIST처럼 train에서 validation set을 따로 떼어 그걸로 모니터링하고, test set은 마지막 평가에 한 번만 쓰는 게 맞다. 데이터가 569개로 작아서 편의상 이렇게 한 것이다.

### 저장한 모델 불러와 추론하기

`state_dict`로 저장했으니, 모델을 새로 만들고 덮어씌운다.

```python
# 모델 새로 생성 후 저장된 가중치 로드
loaded_model = BreastCancerModel(input_features).to(device)
loaded_model.load_state_dict(torch.load(save_bc_model_path, map_location=device))
loaded_model.eval()
print("모델 로드 완료 및 평가 모드 전환 완료")


########## 추론 함수 ##########
def predict_bc(model, X, device="cpu"):
    model.to(device)
    model.eval()
    X = X.to(device)

    with torch.no_grad():
        pred_proba = model(X)                              # 확률값
        pred_class = (pred_proba > 0.5).type(torch.int32) # 클래스 (0 or 1)

    result = []
    for class_idx, proba in zip(pred_class, pred_proba):
        c = class_idx.item()
        p = proba.item() if c == 1 else (1 - proba).item()
        result.append((c, p))

    return result


########## 추론 실행 ##########
new_data = torch.tensor(X_test_scaled[:5], dtype=torch.float32)
predictions = predict_bc(loaded_model, new_data, device=device)

print("\n[추론 결과 (처음 5개 샘플)]")
for idx, (c, p) in enumerate(predictions):
    class_name = classes[c]
    print(f"샘플 {idx+1}: 예측 결과 = {class_name} ({c}), 확신도 = {p*100:.2f}%")
```

```text
모델 로드 완료 및 평가 모드 전환 완료

[추론 결과 (처음 5개 샘플)]
샘플 1: 예측 결과 = 양성종양 (1), 확신도 = 578.45%
샘플 2: 예측 결과 = 악성종양 (0), 확신도 = 747.15%
샘플 3: 예측 결과 = 악성종양 (0), 확신도 = 605.66%
샘플 4: 예측 결과 = 양성종양 (1), 확신도 = 809.92%
샘플 5: 예측 결과 = 악성종양 (0), 확신도 = 433.67%
```

확신도가 100%를 넘는다. 주석에는 `# 확률값`이라고 적혀 있지만, 모델 출력은 sigmoid를 거치지 않은 logit이다. 샘플 1은 logit이 5.78이라 578%가 됐고, 악성으로 분류된 샘플 2는 `1 - logit`을 계산해 logit -6.47이 747%가 됐다. 추론 함수에서 sigmoid를 한 번 거치면 된다.

```python
# 보충: logit -> sigmoid -> 확률
def predict_bc(model, X, device="cpu"):
    model.to(device)
    model.eval()
    X = X.to(device)

    with torch.no_grad():
        logit = model(X)
        pred_proba = torch.sigmoid(logit)                  # positive(양성종양)일 확률
        pred_class = (pred_proba > 0.5).type(torch.int32)

    result = []
    for class_idx, proba in zip(pred_class, pred_proba):
        c = class_idx.item()
        p = proba.item() if c == 1 else (1 - proba).item()
        result.append((c, p))
    return result

predictions = predict_bc(loaded_model, new_data, device=device)
for idx, (c, p) in enumerate(predictions):
    print(f"샘플 {idx+1}: 예측 결과 = {classes[c]} ({c}), 확신도 = {p*100:.2f}%, 정답 = {classes[y_test[idx, 0]]}")
```

```text
샘플 1: 예측 결과 = 양성종양 (1), 확신도 = 99.69%, 정답 = 양성종양
샘플 2: 예측 결과 = 악성종양 (0), 확신도 = 99.85%, 정답 = 악성종양
샘플 3: 예측 결과 = 악성종양 (0), 확신도 = 99.37%, 정답 = 악성종양
샘플 4: 예측 결과 = 양성종양 (1), 확신도 = 99.97%, 정답 = 양성종양
샘플 5: 예측 결과 = 악성종양 (0), 확신도 = 96.57%, 정답 = 악성종양
```

다섯 개 모두 정답과 같고 확신도는 96~100%다. 샘플 1의 logit 5.78은 sigmoid를 거치면 0.9969, 즉 99.69%다.

## 모델 유형별 구현 정리

**공통**

- Input layer(첫 번째 Layer)의 `in_features`는 입력 데이터의 feature 개수에 맞춘다
- Hidden layer 수는 경험적(art)으로 정한다. Linear를 쓰면 보통 feature 수를 줄여 나간다 (핵심 특성을 추출해 나가는 과정)

| | 회귀 | 다중 분류 | 이진 분류 |
|---|---|---|---|
| 출력층 unit 수 | 정답(y)의 개수. 집값 하나면 1, 아파트·단독·빌라 가격이면 3 | class 개수 | 1 (positive일 확률) |
| 출력층 활성 함수 | 보통 **없음**. 범위가 정해져 있으면 Sigmoid(0~1), Tanh(-1~1) | Softmax | Sigmoid |
| 손실 함수 | `MSELoss` | `CrossEntropyLoss` | `BCELoss` (또는 `BCEWithLogitsLoss`) |
| 정답(y) 형태 | float, `(N, 출력수)` | int64 class index, `(N,)` | float 0/1, `(N, 1)` |
| 평가지표 | MSE, RMSE, $R^2$ | accuracy 등 | accuracy, precision, recall 등 |
| 이 글의 예제 | Boston 13 → 32 → 16 → **1** | Fashion MNIST 784 → … → 32 → **10** | 유방암 30 → 32 → 16 → **1** |

다중 분류의 손실 함수는 이렇게 이어진다.

- **CrossEntropyLoss** = **LogSoftmax**(모델 예측값) + **NLLLoss**(정답)
- **LogSoftmax**: 입력에 Softmax를 계산한 뒤 log를 취한다. NLLLoss에 넣을 예측값을 만들 때 쓴다
- **NLLLoss**: LogSoftmax 처리한 예측값과 one-hot encoding 하지 않은 정답(class index)을 받아 loss를 계산한다

```python
pred = model(input)
loss1 = nn.NLLLoss()(nn.LogSoftmax(dim=-1)(pred), y)
# or
loss2 = nn.CrossEntropyLoss()(pred, y)
```

```python
# 보충: 두 계산이 같은지 확인
pred = torch.randn(4, 10)
y = torch.tensor([3, 0, 9, 1])
loss1 = nn.NLLLoss()(nn.LogSoftmax(dim=-1)(pred), y)
loss2 = nn.CrossEntropyLoss()(pred, y)
loss1.item(), loss2.item()
```

```text
(2.685225009918213, 2.685225009918213)
```

> **보충** 그래서 PyTorch에서는 다중 분류 모델의 출력층에 Softmax를, 이진 분류 모델(`BCEWithLogitsLoss`를 쓸 때)의 출력층에 Sigmoid를 **넣지 않고** logit을 내보내는 게 보통이다. 손실 함수가 안에서 처리한다. 대신 추론해서 확률을 보여 줄 때는 직접 `softmax`나 `sigmoid`를 거쳐야 한다. 이번 글의 940% 확신도가 이걸 빠뜨린 결과다.

## 정리

- 모델 저장은 **`state_dict`** 방식이 기본이다. 구조는 코드로 만들고 값만 `load_state_dict`로 덮어쓴다. 모델 전체 저장은 클래스 정의가 있어야 하고 `weights_only=False`가 필요하다
- 이어서 학습하려면 optimizer 상태와 epoch까지 dict로 묶어 **checkpoint**로 저장한다
- 학습 중 validation 성능이 좋아질 때만 저장하면 best model이 남고, patience 동안 개선이 없으면 **조기 종료**한다
- 문제 유형이 바뀌면 Backbone은 그대로 두고 **Head(출력층)와 손실 함수**를 바꾼다
- PyTorch의 분류 손실 함수는 logit을 받는다. 확률이 필요하면 추론 단계에서 softmax / sigmoid를 직접 적용한다
- 비교 연산 전에 두 tensor의 shape이 같은지 본다. `(N,)`와 `(N, 1)`은 broadcasting으로 `(N, N)`이 된다
