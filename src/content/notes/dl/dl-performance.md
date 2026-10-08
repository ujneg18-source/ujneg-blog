---
title: "성능 개선: 모델 크기·Dropout·Batch Normalization·학습률 스케줄러"
description: "과대적합과 과소적합을 구분하고, MNIST에서 작은 모델·큰 모델·Dropout 모델·Batch Normalization 모델을 같은 조건으로 학습시켜 train/validation 곡선을 비교합니다. 학습 함수를 모듈로 분리하는 방법과 StepLR·CosineAnnealingLR·CosineAnnealingWarmRestarts 학습률 스케줄러도 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '딥러닝'
seriesOrder: 8
originalNotebook: "08_1_딥러닝모델_성능개선.ipynb, 08_2_딥러닝모델_성능개선_예제.ipynb"
tags: ["Python","PyTorch","Overfitting","Dropout","BatchNorm","LR Scheduler"]
date: 2026-06-11
---

> SKN31 딥러닝 과정 노트북 `08_1_딥러닝모델_성능개선.ipynb`, `08_2_딥러닝모델_성능개선_예제.ipynb`를 바탕으로 정리했습니다.
> 코드는 PyTorch 2.5, CPU 4코어 환경에서 실행한 결과입니다. 노트북에서는 큰 모델·Dropout·Batch Normalization 학습 셀을 실행하지 않아 결과가 없었고, 이 글의 결과는 모두 새로 실행한 것입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 최적화와 일반화, **과대적합(Overfitting)**과 **과소적합(Underfitting)**
- 각각을 개선하는 방법과 Epoch 수의 관계
- 모델 크기에 따른 성능 변화: 작은 모델 vs 큰 모델
- **Dropout**과 **Batch Normalization**
- **학습률 스케줄러**: StepLR, CosineAnnealingLR, CosineAnnealingWarmRestarts
- 학습·검증 함수를 `.py` 모듈로 분리해서 재사용하기

지난 글에서 Boston 모델은 train loss가 계속 줄어드는데 validation loss는 다시 올라갔다. 이번 글은 그런 상태를 무엇이라 부르고, 어떻게 다루는지에 대한 내용이다.

## 최적화와 일반화

- **최적화(Optimization)**: train data에서 최고의 성능을 얻도록 모델 파라미터를 조정하는 과정. 모델을 학습하는 과정이 곧 최적화 과정이다
- **일반화(Generalization)**: 훈련된 모델이 **처음 보는 데이터**에 대해서도 잘 추론하는 상태. 학습을 통해 일반화된 특징을 잘 찾은 상태다

우리가 원하는 건 일반화인데, 학습으로 직접 할 수 있는 건 최적화뿐이다. 그래서 둘 사이가 어긋나는 두 가지 상태가 생긴다.

| | 과대적합 (Overfitting) | 과소적합 (Underfitting) |
|---|---|---|
| 검증 결과 | Train 성능은 좋은데 Validation 성능이 안 좋다 | Train, Validation 둘 다 안 좋다 |
| 상태 | 학습을 **과하게** 해서 쓸데없는 패턴까지 외웠다 | 학습이 **덜** 돼서 특징을 다 찾지 못했다 |
| 주 원인 | Train dataset 크기에 비해 모델이 **너무 복잡** | Train dataset 크기에 비해 모델이 **너무 단순** |

보통 "과적합"이라고 하면 Overfitting을 말한다.

![과소적합, 적정, 과대적합](/images/dl/fig-over-underfitting.png)

**모델 복잡도에 따른 train/test set 성능 변화**

![모델 복잡도에 따른 성능 변화](/images/dl/fig-epoch-complex.png)

### 과소적합(Underfitting) 개선

- **모델의 복잡도를 높인다**
  - 네트워크 크기를 키운다: Layer나 Unit 수를 늘린다
- 데이터셋 종류에 맞는 Feature 추출 Layer를 hidden layer에 쓴다 (Convolution layer, Recurrent layer 등)
- **Epoch(또는 Step) 수를 늘려 더 학습시킨다**
  - Train/Validation 성능이 계속 좋아지는 중에 끝났다면 더 학습시킨다

### 과대적합(Overfitting) 개선

- **더 많은 data를 수집한다**
  - 추가 수집은 시간과 돈이 많이 들어서 보통 어렵다
  - 다양한 Upsampling(데이터 증식) 기법으로 늘린다
- **모델의 복잡도를 낮춰 단순한 모델을 만든다**
  - 네트워크 크기를 작게 만든다
  - 모델의 학습을 규제하는 기법을 적용한다
- **Epoch(또는 step) 수를 줄인다**
  - Validation 성능 지표가 가장 좋았던 Epoch까지만 학습시킨다

**과대적합을 막기 위한 규제 방식은 모두 모델의 복잡도를 낮추는 방법이다.**

### Epoch과 과적합

- 같은 데이터셋을 여러 번 반복 학습하면 **초반에는** train, validation 성능이 모두 좋아진다
- **계속 반복하면** train 성능은 계속 좋아지지만, 어느 시점부터 Overfitting이 생겨 **validation 성능은 나빠진다**
- Validation 성능이 나빠지기 전의 반복 횟수를 최적의 Epoch으로 고른다. 지난 글의 **조기 종료**가 이걸 자동으로 하는 장치다

## DNN 모델 크기 변경

- Layer나 Unit 수가 많을수록 복잡한 모델이다
- Overfitting이면 모델을 작게, Underfitting이면 크게 만든다
- 큰 모델에서 시작해 layer나 unit 수를 줄여 가며 validation loss의 감소 추세를 관찰한다 (또는 반대로)

| 데이터에 비해 작은 모델 | 데이터에 비해 큰 모델 |
|---|---|
| Train/Validation 성능 개선 속도가 느리다 | Train 성능이 빠르게 좋아진다 |
| 반복 횟수가 부족하면 학습이 덜 된 채 끝날 수 있다 | Validation 성능이 학습 초반부터 나빠진다 |
| Underfitting 가능성이 크다 | Overfitting 가능성이 크다 |

## Dropout

Dropout layer는 과적합을 막기 위한 규제(regularization) 기법 중 하나다.

1. **기본 개념**: 학습 중 무작위로 일정 비율의 뉴런을 비활성화(drop)해서, 네트워크가 특정 뉴런에 과도하게 의존하지 않게 한다
2. **작동 방식**
   - **학습 시**: 각 학습 반복(step)마다 지정한 확률(예: 0.5)로 뉴런을 무작위로 제외한다. `model.train()` 모드에서 적용된다
   - **추론/테스트 시**: 모든 뉴런을 활성화한다. `model.eval()` 모드에서 적용된다
3. **효과**
   - **앙상블 효과**: 매번 다른 네트워크 구조로 학습하는 효과가 있어 앙상블과 비슷한 결과를 얻는다. 노이즈가 있는 데이터에도 더 잘 대응한다
   - **상호 의존성(co-adaptation) 감소**: 예를 들어 A 노드는 코, B 노드는 눈의 특징을 감지한다고 하자. co-adaptation이 생기면 A는 B가 눈을 감지했을 때만 코를 감지하는 식으로 서로 과하게 의존한다. Dropout은 이걸 완화해 각 뉴런이 더 견고한 특성을 배우게 한다
   - **모델 복잡도 감소**: 효과적으로 복잡도를 줄여, 훈련 데이터의 노이즈까지 학습하지 않는 일반적인 모델을 만든다
4. **하이퍼파라미터: Dropout 비율(p)**
   - 비활성화할 뉴런 비율. 보통 0.2~0.5
   - Fully connected Layer에는 0.5, Convolution Layer에는 0.2나 0.3을 주로 쓴다

![Dropout](/images/dl/fig-dropout1.png)

![Dropout 동작](/images/dl/fig-dropout2.gif)

출처: [Implementing Dropout in PyTorch With Example (W&B)](https://wandb.ai/authors/ayusht/reports/Implementing-Dropout-in-PyTorch-With-Example--VmlldzoxNTgwOTE)

```python
# 보충: train 모드와 eval 모드에서 Dropout 출력 비교
import torch
import torch.nn as nn
torch.manual_seed(0)
drop = nn.Dropout(p=0.5)
x = torch.ones(10)

drop.train()
print("train:", drop(x))
drop.eval()
print("eval :", drop(x))
```

```text
train: tensor([0., 0., 2., 0., 0., 0., 2., 2., 0., 2.])
eval : tensor([1., 1., 1., 1., 1., 1., 1., 1., 1., 1.])
```

> **보충** train 모드에서 살아남은 값이 1이 아니라 2.0이다. PyTorch의 Dropout은 학습 때 남은 값을 `1 / (1 - p)`배로 키운다(inverted dropout). 절반을 꺼도 다음 층에 들어가는 값의 기대치가 그대로 유지되도록 하는 것이고, 그래서 추론 때는 아무것도 하지 않고 그대로 통과시키면 된다. `model.eval()`을 빼먹으면 추론할 때도 뉴런이 무작위로 꺼져서, 같은 입력에 매번 다른 결과가 나온다.

## Batch Normalization (배치 정규화)

- 각 Layer의 출력값을 평균 0, 표준편차 1로 정규화해서 **각 Layer의 입력 분포를 균일하게 만든다**
- Batch 단위로 정규화한다
  - Fully Connected Layer: feature별로, 배치의 모든 샘플에 대해 계산
  - Convolutional Layer: 채널별로, 배치의 모든 샘플과 모든 위치(height × width)에 대해 계산
- 보통 4차원 이미지 데이터(N, C, H, W)를 다루는 CNN 모델에 쓴다
- 정규화 단위에 따라 **Layer Normalization**도 있다. 샘플(데이터 포인트) 단위로 정규화하며 자연어 처리 모델(Transformer, RNN)에서 쓴다

### 정규화가 필요한 이유: Internal Covariate Shift (내부 공변량 변화)

![Internal Covariate Shift](/images/dl/fig-ics.png)

- 학습 중에 각 층을 통과할 때마다 입력 데이터 분포가 달라지는 현상이다
- 입력 데이터가 정규분포를 따르더라도, 레이어를 지나면서 분포가 바뀌어 성능이 떨어진다
- 레이어를 통과할 때마다 분포를 정규화해서 성능을 올린다

![Batch Normalization 계산](/images/dl/fig-bn.png)

- $\gamma$: scaling 파라미터, $\beta$: shift 파라미터
  - 항상 똑같은 분포로만 나오지 않도록 $\gamma$와 $\beta$로 분포에 변화를 준다
  - $\gamma$와 $\beta$는 학습 과정에서 최적화되는 값이다
- 입력과 가중치의 가중합 결과에 적용한 뒤, 그 결과를 Activation 함수에 전달한다

![Batch Normalization 위치](/images/dl/fig-bn2.png)

**효과**

- 랜덤하게 생성되는 초기 가중치의 영향력을 줄인다
- 학습하는 동안 과대적합 규제 효과를 준다
- Gradient Vanishing, Gradient Exploding을 막아 준다

```python
# 보충: BatchNorm1d 통과 전후의 평균, 표준편차
torch.manual_seed(0)
bn = nn.BatchNorm1d(3)
x = torch.randn(64, 3) * torch.tensor([1., 10., 100.]) + torch.tensor([0., 50., -30.])
y = bn(x)
print("입력 평균:", x.mean(dim=0))
print("입력 표준편차:", x.std(dim=0))
print("출력 평균:", y.mean(dim=0))
print("출력 표준편차:", y.std(dim=0))
print("γ(weight):", bn.weight.data, "β(bias):", bn.bias.data)
```

```text
입력 평균: tensor([ 1.9499e-02,  4.7482e+01, -3.1901e+00])
입력 표준편차: tensor([  0.8982,   8.8984, 105.0210])
출력 평균: tensor([ 1.4901e-08, -3.7625e-07, -7.4506e-09], grad_fn=<MeanBackward1>)
출력 표준편차: tensor([1.0079, 1.0079, 1.0079], grad_fn=<StdBackward0>)
γ(weight): tensor([1., 1., 1.]) β(bias): tensor([0., 0., 0.])
```

feature마다 크기가 100배씩 다른 입력이 평균 0, 표준편차 1 근처로 맞춰진다. $\gamma$는 1, $\beta$는 0에서 시작해 학습되면서 바뀐다.

Batch Normalization은 batch 안의 샘플들로 평균과 표준편차를 구하기 때문에, 학습 모드에서 batch에 샘플이 하나뿐이면 계산할 수 없다. 아래 셀은 에러가 나는 것이 정상이다.

```python
# 보충: train 모드에서 batch size 1
bn.train()
bn(torch.randn(1, 3))
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: Expected more than 1 value per channel when training, got input size torch.Size([1, 3])</div></div>

> **보충** 그래서 BatchNorm이 있는 모델은 학습용 DataLoader에 `drop_last=True`를 주는 게 안전하다. 데이터 개수가 batch size로 나눠떨어지지 않아 마지막 batch가 1개만 남으면 이 에러가 난다. 추론(`model.eval()`) 때는 학습 중에 쌓아 둔 이동 평균(`running_mean`, `running_var`)을 쓰므로 한 장씩 넣어도 된다.

## 학습률(Learning Rate) 조정

![Learning rate 크기에 따른 학습](/images/dl/fig-lr.png)

- Learning rate가 너무 크거나 너무 작으면 최적의 파라미터를 찾지 못할 수 있다. 모델 성능과 밀접한 아주 중요한 Hyper Parameter다
- 고정된 하나의 값을 쓸 수도 있지만, **학습이 반복되는 동안 학습률을 바꿔서 성능을 높일 수 있다**
  - 학습 도중 학습률을 어떻게 바꿀지에 대한 여러 알고리즘이 있다 (아래 실습에서 다룬다)

## Hyper Parameter Tuning

| 구분 | 의미 | 예 |
|---|---|---|
| **Parameter** | 모델이 학습해서 데이터에 가장 맞는 값을 찾아내는 것 | Weight, Bias |
| **Hyper parameter** | 모델 구조나 최적화 방법을 정하는 값. 개발자가 직접 설정한다 | Optimizer 종류, learning rate($\alpha$), Hidden layer 수, Layer별 unit 수, Activation 함수 종류, Epoch 수, Mini batch size, 규제(Regularization), dropout rate |

다양한 조합을 시도해서 loss가 빠르게 줄어드는 hyper parameter를 찾아야 한다.

## 실습: 학습 함수를 모듈로 분리

지금까지는 노트북마다 학습 루프를 새로 썼다. 반복되는 학습·검증·시각화 코드를 `.py` 파일로 빼 두고 import해서 쓴다. 노트북에서는 `%%writefile 파일경로` 매직 명령으로 셀 내용을 파일로 저장했다.

```python
import os

os.makedirs("module", exist_ok=True)
```

### module/train.py

모델 학습과 검증 함수를 정의한다.

```python
%%writefile module/train.py

import torch
import time

def test_multi_classification(dataloader, model, loss_fn, device="cpu") -> tuple:
    """
    다중 분류 검증/평가 함수
    
    Args:
        dataloader: DataLoader - 검증할 대상 데이터로더
        model: 검증할 모델
        loss_fn: 모델 추정값과 정답의 차이를 계산할 loss 함수.
        device: str - 연산을 처리할 장치. default-"cpu", gpu-"cuda"
    Returns:
        tuple: (loss, accuracy)
    """
    model.to(device)
    model.eval() 
    size = len(dataloader.dataset)
    num_steps = len(dataloader)
    
    test_loss, test_accuracy = 0., 0.
    
    with torch.no_grad():
        for X, y in dataloader:
            X, y = X.to(device), y.to(device)
            pred = model(X)
            test_loss += loss_fn(pred, y).item()
            # 정확도 계산
            pred_label = torch.argmax(pred, axis=-1)
            test_accuracy += torch.sum(pred_label == y).item()
            
        test_loss /= num_steps
        test_accuracy /= size
    return test_loss, test_accuracy

def test_binary_classification(dataloader, model, loss_fn, device="cpu") -> tuple:
    """
    이진 분류 검증/평가 함수
    
    Args:
        dataloader: DataLoader - 검증할 대상 데이터로더
        model: 검증할 모델
        loss_fn: 모델 추정값과 정답의 차이를 계산할 loss 함수.
        device: str - 연산을 처리할 장치. default-"cpu", gpu-"cuda"
    Returns:
        tuple: (loss, accuracy)
    """
    model.to(device)
    model.eval() # 모델을 평가모드로 변환
    size = len(dataloader.dataset)
    num_steps = len(dataloader)
    
    test_loss, test_accuracy = 0., 0.
    
    with torch.no_grad():
        for X, y in dataloader:
            X, y = X.to(device), y.to(device)
            pred = model(X)
            test_loss += loss_fn(pred, y).item()
            ## 정확도 계산
            pred_label = (pred >= 0.5).type(torch.int32)
            test_accuracy += (pred_label == y).sum().item() 
            
        test_loss /= num_steps
        test_accuracy /= size   #전체 개수로 나눈다.
    return test_loss, test_accuracy    

def train(dataloader, model, loss_fn, optimizer, device="cpu", mode:"binary or multi"='binary'):
    """
    모델을 1 epoch 학습시키는 함수

    Args:
        dataloader: DataLoader - 학습데이터셋을 제공하는 DataLoader
        model - 학습대상 모델
        loss_fn: 모델 추정값과 정답의 차이를 계산할 loss 함수.
        optimizer - 최적화 함수
        device: str - 연산을 처리할 장치. default-"cpu", gpu-"cuda"
        mode: str - 분류 종류. binary 또는 multi
    
    Returns:
        tuple: 학습후 계산한 Train set에 대한  train_loss, train_accuracy
    """
    model.train()
    size = len(dataloader.dataset) # 총 데이터포인트 개수

    for X, y in dataloader:
        # 1. DEVICE로 이동동
        X, y = X.to(device), y.to(device)\
        # 2. 모델 추정
        pred = model(X)
        # 3. loss 계산
        loss = loss_fn(pred, y)
        # 4. gradient 초기화
        optimizer.zero_grad()
        # 5. gradient 계산
        loss.backward()
        # 6. 파라미터 업데이트트
        optimizer.step()
        
    if mode == 'binary':
        train_loss, train_accuracy = test_binary_classification(dataloader, model, loss_fn, device)
    else:
        train_loss, train_accuracy = test_multi_classification(dataloader, model, loss_fn, device)
    return train_loss, train_accuracy



def fit(train_loader, val_loader, model, loss_fn, optimizer, epochs, save_best_model=True, 
        save_model_path=None, early_stopping=True, patience=10, device='cpu',  mode:"binary or multi"='binary',
        lr_scheduler=None):
    """
    모델을 학습시키는 함수

    Args:
        train_loader (Dataloader): Train dataloader
        test_loader (Dataloader): validation dataloader
        model (Module): 학습시킬 모델
        loss_fn (_Loss): Loss function
        optimizer (Optimizer): Optimizer
        epochs (int): epoch수
        save_best_model (bool, optional): 학습도중 성능개선시 모델 저장 여부. Defaults to True.
        save_model_path (str, optional): save_best_model=True일 때 모델저장할 파일 경로. Defaults to None.
        early_stopping (bool, optional): 조기 종료 여부. Defaults to True.
        patience (int, optional): 조기종료 True일 때 종료전에 성능이 개선될지 몇 epoch까지 기다릴지 epoch수. Defaults to 10.
        device (str, optional): device. Defaults to 'cpu'.
        mode(str, optinal): 분류 종류. "binary(default) or multi
        lr_scheduler: Learning Rate Scheduler 객체. default: None, Epoch 단위로 LR 를 변경.
    
    Returns:
        tuple: 에폭 별 성능 리스트. (train_loss_list, train_accuracy_list, validation_loss_list, validataion_accuracy_list)
    """

    train_loss_list = []
    train_accuracy_list = []
    val_loss_list = []
    val_accuracy_list = []
    
        
    if save_best_model:
        best_score_save = torch.inf

    ############################
    # early stopping
    #############################
    if early_stopping:
        trigger_count = 0
        best_score_es = torch.inf
    
    # 모델 device로 옮기기
    model = model.to(device)
    s = time.time()
    for epoch in range(epochs):
        train_loss, train_accuracy = train(train_loader, model, loss_fn, optimizer, device=device, mode=mode)
        
        ############ 1 epoch 학습 종료 -> Learning Rate 를 변경 ###########
        if lr_scheduler is not None:
            current_lr = lr_scheduler.get_last_lr()[0]  # log용
            lr_scheduler.step()
            new_lr = lr_scheduler.get_last_lr()[0] # log용
            if current_lr != new_lr: # LR가 변경되었으면
                print(f">>>>>>Learning Rate가 {current_lr}에서 {new_lr}로 변경됨<<<<<<")

        
        if mode == "binary":
            val_loss, val_accuracy = test_binary_classification(val_loader, model, loss_fn, device=device)
        else:
            val_loss, val_accuracy = test_multi_classification(val_loader, model, loss_fn, device=device)

        train_loss_list.append(train_loss)
        train_accuracy_list.append(train_accuracy)
        val_loss_list.append(val_loss)
        val_accuracy_list.append(val_accuracy)
        
        print(f"Epoch[{epoch+1}/{epochs}] - Train loss: {train_loss:.5f} Train Accucracy: {train_accuracy:.5f} || Validation Loss: {val_loss:.5f} Validation Accuracy: {val_accuracy:.5f}")
        print('='*100)
        
        # 모델 저장
        if save_best_model:
            if val_loss < best_score_save:
                torch.save(model, save_model_path)
                print(f"저장: {epoch+1} - 이전 : {best_score_save}, 현재: {val_loss}")
                best_score_save = val_loss
        
        # early stopping 처리            
        if early_stopping:
            if val_loss < best_score_es: 
                best_score_es = val_loss  
                trigger_count = 0
                                
            else:
                trigger_count += 1                
                if patience == trigger_count:
                    print(f"Early stopping: Epoch - {epoch}")
                    break
            
    e = time.time()
    print(e-s, "초")
    return train_loss_list, train_accuracy_list, val_loss_list, val_accuracy_list
```

지난 글에서 노트북마다 따로 쓰던 학습 루프가 세 함수로 나뉘었다.

| 함수 | 하는 일 |
|---|---|
| `test_multi_classification` / `test_binary_classification` | eval 모드로 데이터로더 전체를 돌며 평균 loss와 accuracy를 반환 |
| `train` | 1 epoch 학습한 뒤, 학습이 끝난 모델로 train set을 다시 평가해 loss와 accuracy를 반환 |
| `fit` | epoch 반복, 스케줄러 step, 검증, best model 저장, 조기 종료까지 묶은 전체 학습 |

> **보충** `train()`이 반환하는 train loss/accuracy는 학습하면서 쌓은 값이 아니라, 1 epoch 학습이 끝난 뒤 eval 모드로 train set 전체를 **한 번 더 돌려서** 잰 값이다. 그래서 Dropout이 꺼진 상태의 train 성능이 나오고 validation과 같은 조건에서 비교할 수 있다. 대신 epoch마다 train set 추론이 한 번 더 들어가 시간이 더 걸린다.

> **보충** `test_binary_classification`의 `pred >= 0.5`는 모델이 sigmoid를 거친 **확률**을 낼 때 맞는 기준이다. 지난 글처럼 `BCEWithLogitsLoss`를 쓰고 logit을 내는 모델이라면 `pred >= 0`이어야 한다. 또 `X, y = X.to(device), y.to(device)\` 끝의 `\`는 줄 이음 문자라 다음 줄 주석과 이어지는데, 다음 줄이 주석뿐이라 우연히 에러 없이 동작한다.

### module/data.py

dataset 생성 함수를 제공한다.

```python
%%writefile module/data.py

from torchvision import datasets, transforms
from torch.utils.data import DataLoader

def load_mnist_dataset(root_path, batch_size, is_train=True):
    """
    mnist dataset dataloader 제공 함수
    Args:
        root_path: str|Path - 데이터파일 저장 디렉토리
        batch_size: int
        is_train: bool = True - True: Train dataset, False - Test dataset
    
    Returns:
        DataLoader 
    """
    transform = transforms.Compose([
        transforms.ToTensor()
    ])
    dataset = datasets.MNIST(root=root_path, train=is_train, download=True, transform=transform)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=is_train)  # shuffle: train이면 True, test면 False 할 것이므로 is_train을 넣음.
    
    return dataloader

def load_fashion_mnist_dataset(root_path, batch_size, is_train=True):
    """
    fashion mnist dataset dataloader 제공 함수
    Args:
        root_path: str|Path - 데이터파일 저장 디렉토리
        batch_size: int
        is_train: bool = True - True: Train dataset, False - Test dataset
    
    Returns:
        DataLoader
    """
    transform = transforms.Compose([
        transforms.ToTensor()
    ])
    dataset = datasets.FashionMNIST(root=root_path, train=is_train, download=True, transform=transform)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=is_train)  # shuffle: train이면 True, test면 False 할 것이므로 is_train을 넣음.
    
    return dataloader
```

### module/utils.py

```python
%%writefile module/utils.py
# 학습 결과를 시각화하는 함수.
import matplotlib.pyplot as plt

def plot_fit_result(train_loss_list, train_accuracy_list, valid_loss_list, valid_accuracy_list):
    """epoch별 학습 결과를 시각화하는 함수
    epoch별 loss와 accuracy를 시각화한다.

    Args:
        train_loss_list (list): Epoch별 train loss
        train_accuracy_list (list): Epoch별 train accuracy
        valid_loss_list (list): Epoch별 validation loss
        valid_accuracy_list (list): Epoch별 validation accuracy
    """
    epoch = len(train_loss_list)
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(range(epoch), train_loss_list, label="train loss")
    plt.plot(range(epoch), valid_loss_list, label="validation loss")
    plt.title("Loss")
    plt.xlabel("epoch")
    plt.ylabel("loss")
    plt.grid(True, linestyle=':')
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(range(epoch), train_accuracy_list, label="train accuracy")
    plt.plot(range(epoch), valid_accuracy_list, label="validation accuracy")
    plt.title("Accuracy")
    plt.xlabel("epoch")
    plt.ylabel("accuracy")
    plt.grid(True, linestyle=':')
    plt.legend()

    plt.tight_layout()
    plt.show()
```

### Import와 하이퍼파라미터

```python
import torch
import torch.nn as nn
from torchinfo import summary

from module.train import fit
from module.data import load_mnist_dataset, load_fashion_mnist_dataset
from module.utils import plot_fit_result
```

```python
device = "cuda" if torch.cuda.is_available() else "cpu"
root_data_path = "datasets"

epochs = 100
batch_size = 256
lr = 0.001
```

### Data 준비: MNIST

```python
train_loader = load_mnist_dataset(root_data_path, batch_size)
test_loader = load_mnist_dataset(root_data_path, batch_size, False)

## Fashion Mnist
# train_loader = load_fashion_mnist_dataset(root_data_path, batch_size)
# test_loader = load_fashion_mnist_dataset(root_data_path, batch_size, False)
```

```python
classes = train_loader.dataset.classes
class_to_idx = train_loader.dataset.class_to_idx
```

> **보충** 이 실습은 test set을 validation으로 쓴다. 성능 비교용 실습이라 간단히 한 것이고, 모델을 고르는 데 쓴 데이터로 최종 성능을 재면 낙관적인 값이 나온다는 점은 지난 글과 같다.

## 모델 크기에 따른 성능 변화

네 모델을 같은 데이터, 같은 optimizer(Adam, lr=0.001), 같은 epoch 수로 학습시켜 비교한다.

| 모델 | 구조 |
|---|---|
| SmallModel | 784 → 10 (Linear 하나) |
| BigModel | 784 → 2048 → 1024 → 512 → 256 → 128 → 64 → 32 → 10 |
| DropoutModel | BigModel + 각 블록 끝에 Dropout(0.5) |
| BatchNormModel | BigModel + 각 Linear 뒤 BatchNorm + Dropout(0.5) |

### 작은 모델

```python
class SmallModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.lr = nn.Linear(28*28, 10) # 입력 -> 출력  #  self.lr2 = nn.Linear(16, 10) 만 넣어도 성능이 0.96 정도로 개선됨.

    def forward(self, X):
        X = nn.Flatten()(X)
        out = self.lr(X)
        return out
```

```python
# 모델 생성
small_model = SmallModel().to(device)
summary(small_model, (100, 1, 28, 28), device=device)
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
SmallModel                               [100, 10]                 --
├─Linear: 1-1                            [100, 10]                 7,850
==========================================================================================
Total params: 7,850
Trainable params: 7,850
Non-trainable params: 0
Total mult-adds (M): 0.79
==========================================================================================
Input size (MB): 0.31
Forward/backward pass size (MB): 0.01
Params size (MB): 0.03
Estimated Total Size (MB): 0.35
==========================================================================================
```

은닉층이 없으니 사실상 소프트맥스 회귀(다중 로지스틱 회귀)다. 파라미터는 784×10 + 10 = 7,850개.

```python
loss_fn = nn.CrossEntropyLoss() # 다중분류의 loss 함수
optimizer = torch.optim.Adam(small_model.parameters(), lr=lr)
lr_scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=30, gamma=0.1) # 30 epoch마다 LR을 10%로 감소시키는 스케줄러
```

> **보충** 여기서 만든 `lr_scheduler`는 아래 `fit()`에 넘기지 않아서 실제로는 쓰이지 않는다. 쓰려면 `fit(..., lr_scheduler=lr_scheduler)`로 넘긴다. epochs가 20이라 넘겨도 step_size=30에 닿지 않아 학습률은 바뀌지 않는다.

```python
epochs = 20
train_loss_list, train_acc_list, valid_loss_list, valid_acc_list = fit(
    train_loader, 
    test_loader,
    small_model, 
    loss_fn, 
    optimizer,
    epochs, 
    save_best_model=False,
    device=device,
    mode="multi" 
)
```

```text
Epoch[1/20] - Train loss: 0.48153 Train Accucracy: 0.88222 || Validation Loss: 0.45930 Validation Accuracy: 0.89080
====================================================================================================
Epoch[2/20] - Train loss: 0.37812 Train Accucracy: 0.90013 || Validation Loss: 0.35920 Validation Accuracy: 0.90660
====================================================================================================
Epoch[3/20] - Train loss: 0.33833 Train Accucracy: 0.90963 || Validation Loss: 0.32244 Validation Accuracy: 0.91240
====================================================================================================
Epoch[4/20] - Train loss: 0.31706 Train Accucracy: 0.91297 || Validation Loss: 0.30285 Validation Accuracy: 0.91580
====================================================================================================
Epoch[5/20] - Train loss: 0.30249 Train Accucracy: 0.91705 || Validation Loss: 0.29086 Validation Accuracy: 0.91790
====================================================================================================
Epoch[6/20] - Train loss: 0.29212 Train Accucracy: 0.91883 || Validation Loss: 0.28346 Validation Accuracy: 0.92080
====================================================================================================
Epoch[7/20] - Train loss: 0.28486 Train Accucracy: 0.92102 || Validation Loss: 0.27705 Validation Accuracy: 0.92160
====================================================================================================
Epoch[8/20] - Train loss: 0.27840 Train Accucracy: 0.92258 || Validation Loss: 0.27457 Validation Accuracy: 0.92300
====================================================================================================
Epoch[9/20] - Train loss: 0.27492 Train Accucracy: 0.92422 || Validation Loss: 0.27118 Validation Accuracy: 0.92330
====================================================================================================
Epoch[10/20] - Train loss: 0.26957 Train Accucracy: 0.92560 || Validation Loss: 0.26784 Validation Accuracy: 0.92430
====================================================================================================
Epoch[11/20] - Train loss: 0.26775 Train Accucracy: 0.92528 || Validation Loss: 0.26715 Validation Accuracy: 0.92500
====================================================================================================
Epoch[12/20] - Train loss: 0.26374 Train Accucracy: 0.92678 || Validation Loss: 0.26388 Validation Accuracy: 0.92560
====================================================================================================
Epoch[13/20] - Train loss: 0.26137 Train Accucracy: 0.92757 || Validation Loss: 0.26449 Validation Accuracy: 0.92490
====================================================================================================
Epoch[14/20] - Train loss: 0.25992 Train Accucracy: 0.92743 || Validation Loss: 0.26420 Validation Accuracy: 0.92520
====================================================================================================
Epoch[15/20] - Train loss: 0.25705 Train Accucracy: 0.92842 || Validation Loss: 0.26067 Validation Accuracy: 0.92610
====================================================================================================
Epoch[16/20] - Train loss: 0.25484 Train Accucracy: 0.92923 || Validation Loss: 0.26002 Validation Accuracy: 0.92720
====================================================================================================
Epoch[17/20] - Train loss: 0.25356 Train Accucracy: 0.92955 || Validation Loss: 0.26068 Validation Accuracy: 0.92710
====================================================================================================
Epoch[18/20] - Train loss: 0.25231 Train Accucracy: 0.93068 || Validation Loss: 0.26040 Validation Accuracy: 0.92670
====================================================================================================
Epoch[19/20] - Train loss: 0.25119 Train Accucracy: 0.93080 || Validation Loss: 0.26021 Validation Accuracy: 0.92680
====================================================================================================
Epoch[20/20] - Train loss: 0.24981 Train Accucracy: 0.93082 || Validation Loss: 0.26014 Validation Accuracy: 0.92650
====================================================================================================
109.3623399734497 초
```

```python
# 보충: 작은 모델 학습 곡선
plot_fit_result(train_loss_list, train_acc_list, valid_loss_list, valid_acc_list)
results = {"Small": (train_loss_list, train_acc_list, valid_loss_list, valid_acc_list)}
```

![그래프 출력](/images/dl/dl-performance-1.png)

train과 validation 곡선이 거의 붙어서 같이 움직인다. 15 epoch 이후로는 val loss 0.260, val accuracy 92.7% 근처에서 멈추고, train accuracy도 93.1%에 그친다. 둘 다 더 올라가지 않으니 **과소적합**이다. 데이터에 비해 모델이 너무 단순하다.

### 큰 모델

`nn.Sequential`로 레이어 여러 개를 하나의 블록으로 묶을 수 있다. 넣은 순서대로 실행된다.

```python
# ######  nn.Sequential() -> layer block: 레이어함수들을 묶어놓은 블록
s = nn.Sequential(
    nn.Linear(10, 20),
    nn.ReLU(),
    nn.Linear(20, 30),
    nn.ReLU() 
)
i = torch.randn(5, 10, dtype=torch.float32)
o = s(i)
print(o.shape)
```

```text
torch.Size([5, 30])
```

`(5, 10)` 입력이 `Linear(10, 20)` → `ReLU` → `Linear(20, 30)` → `ReLU`를 차례로 지나 `(5, 30)`이 됐다.

```python
class BigModel(nn.Module):

    def __init__(self):
        super().__init__()
        self.b1 = nn.Sequential(nn.Flatten(), nn.Linear(28*28, 2048), nn.ReLU())
        self.b2 = nn.Sequential(nn.Linear(2048, 1024), nn.ReLU())
        self.b3 = nn.Sequential(nn.Linear(1024, 512), nn.ReLU())
        self.b4 = nn.Sequential(nn.Linear(512, 256), nn.ReLU())
        self.b5 = nn.Sequential(nn.Linear(256, 128), nn.ReLU())
        self.b6 = nn.Sequential(nn.Linear(128, 64), nn.ReLU())
        self.b7 = nn.Sequential(nn.Linear(64, 32), nn.ReLU())
        self.out_block = nn.Linear(32, 10)
        
    def forward(self, X):
        X = self.b1(X)
        X = self.b2(X)
        X = self.b3(X)
        X = self.b4(X)
        X = self.b5(X)
        X = self.b6(X)
        X = self.b7(X)
        return self.out_block(X)
```

```python
big_model = BigModel().to(device)
summary(big_model, (100, 1, 28, 28), device=device)
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
BigModel                                 [100, 10]                 --
├─Sequential: 1-1                        [100, 2048]               --
│    └─Flatten: 2-1                      [100, 784]                --
│    └─Linear: 2-2                       [100, 2048]               1,607,680
│    └─ReLU: 2-3                         [100, 2048]               --
├─Sequential: 1-2                        [100, 1024]               --
│    └─Linear: 2-4                       [100, 1024]               2,098,176
│    └─ReLU: 2-5                         [100, 1024]               --
├─Sequential: 1-3                        [100, 512]                --
│    └─Linear: 2-6                       [100, 512]                524,800
│    └─ReLU: 2-7                         [100, 512]                --
├─Sequential: 1-4                        [100, 256]                --
│    └─Linear: 2-8                       [100, 256]                131,328
│    └─ReLU: 2-9                         [100, 256]                --
├─Sequential: 1-5                        [100, 128]                --
│    └─Linear: 2-10                      [100, 128]                32,896
│    └─ReLU: 2-11                        [100, 128]                --
├─Sequential: 1-6                        [100, 64]                 --
│    └─Linear: 2-12                      [100, 64]                 8,256
│    └─ReLU: 2-13                        [100, 64]                 --
├─Sequential: 1-7                        [100, 32]                 --
│    └─Linear: 2-14                      [100, 32]                 2,080
│    └─ReLU: 2-15                        [100, 32]                 --
├─Linear: 1-8                            [100, 10]                 330
==========================================================================================
Total params: 4,405,546
Trainable params: 4,405,546
Non-trainable params: 0
Total mult-adds (M): 440.55
==========================================================================================
Input size (MB): 0.31
Forward/backward pass size (MB): 3.26
Params size (MB): 17.62
Estimated Total Size (MB): 21.20
==========================================================================================
```

파라미터가 440만 개로, 작은 모델(7,850개)의 약 560배다.

```python
loss_fn = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(big_model.parameters(), lr=lr)
```

```python
train_loss_list2, train_acc_list2, valid_loss_list2, valid_acc_list2 = fit(
    train_loader, test_loader,
    big_model,
    loss_fn,
    optimizer,
    epochs,
    save_best_model=False,
    patience=5,
    device=device,
    mode="multi"
)
```

```text
Epoch[1/20] - Train loss: 0.14534 Train Accucracy: 0.95713 || Validation Loss: 0.16178 Validation Accuracy: 0.94820
====================================================================================================
Epoch[2/20] - Train loss: 0.07830 Train Accucracy: 0.97792 || Validation Loss: 0.10051 Validation Accuracy: 0.96930
====================================================================================================
Epoch[3/20] - Train loss: 0.05466 Train Accucracy: 0.98417 || Validation Loss: 0.08419 Validation Accuracy: 0.97300
====================================================================================================
Epoch[4/20] - Train loss: 0.03966 Train Accucracy: 0.98822 || Validation Loss: 0.08290 Validation Accuracy: 0.97670
====================================================================================================
Epoch[5/20] - Train loss: 0.03914 Train Accucracy: 0.98833 || Validation Loss: 0.08744 Validation Accuracy: 0.97380
====================================================================================================
Epoch[6/20] - Train loss: 0.02174 Train Accucracy: 0.99383 || Validation Loss: 0.07621 Validation Accuracy: 0.98080
====================================================================================================
Epoch[7/20] - Train loss: 0.02484 Train Accucracy: 0.99227 || Validation Loss: 0.09397 Validation Accuracy: 0.97620
====================================================================================================
Epoch[8/20] - Train loss: 0.01928 Train Accucracy: 0.99402 || Validation Loss: 0.08392 Validation Accuracy: 0.98080
====================================================================================================
Epoch[9/20] - Train loss: 0.02458 Train Accucracy: 0.99322 || Validation Loss: 0.08905 Validation Accuracy: 0.97830
====================================================================================================
Epoch[10/20] - Train loss: 0.01795 Train Accucracy: 0.99455 || Validation Loss: 0.09372 Validation Accuracy: 0.97640
====================================================================================================
Epoch[11/20] - Train loss: 0.02798 Train Accucracy: 0.99127 || Validation Loss: 0.09588 Validation Accuracy: 0.97550
====================================================================================================
Early stopping: Epoch - 10
223.8715159893036 초
```

```python
plot_fit_result(
    train_loss_list2, train_acc_list2, valid_loss_list2, valid_acc_list2
)
results["Big"] = (train_loss_list2, train_acc_list2, valid_loss_list2, valid_acc_list2)
```

![그래프 출력](/images/dl/dl-performance-2.png)

첫 epoch부터 validation accuracy가 94.8%로 작은 모델의 최종 성능을 넘는다. val loss는 6 epoch에서 0.0762로 가장 낮았고, 그 뒤 train accuracy가 99.4%까지 오르는 동안 val loss는 0.084~0.096 사이로 다시 올라갔다. patience=5라 11 epoch에서 멈췄다. 큰 모델의 특징 그대로 train은 빠르게 좋아지고, validation은 일찍부터 나빠지기 시작한다(**과대적합**).

## Dropout 예제

- `nn.Dropout` 객체를 쓴다
- 객체를 만들 때 dropout rate를 정한다: 0.2 ~ 0.5
- Drop시킬 노드를 가진 Layer **뒤에** 추가한다

```python
class DropoutModel(nn.Module):

    def __init__(self, drop_rate=0.2):
        super().__init__()
        self.b1 = nn.Sequential(nn.Flatten(), nn.Linear(28*28, 2048), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b2 = nn.Sequential(nn.Linear(2048, 1024), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b3 = nn.Sequential(nn.Linear(1024, 512), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b4 = nn.Sequential(nn.Linear(512, 256), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b5 = nn.Sequential(nn.Linear(256, 128), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b6 = nn.Sequential(nn.Linear(128, 64), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b7 = nn.Sequential(nn.Linear(64, 32), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.out_block = nn.Linear(32, 10)
        
    def forward(self, X):
        X = self.b1(X)
        X = self.b2(X)
        X = self.b3(X)
        X = self.b4(X)
        X = self.b5(X)
        X = self.b6(X)
        X = self.b7(X)
        return self.out_block(X)
```

```python
dout_model = DropoutModel(drop_rate=0.5).to(device)
summary(dout_model, (100, 1, 28, 28))
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
DropoutModel                             [100, 10]                 --
├─Sequential: 1-1                        [100, 2048]               --
│    └─Flatten: 2-1                      [100, 784]                --
│    └─Linear: 2-2                       [100, 2048]               1,607,680
│    └─ReLU: 2-3                         [100, 2048]               --
│    └─Dropout: 2-4                      [100, 2048]               --
├─Sequential: 1-2                        [100, 1024]               --
│    └─Linear: 2-5                       [100, 1024]               2,098,176
│    └─ReLU: 2-6                         [100, 1024]               --
│    └─Dropout: 2-7                      [100, 1024]               --
├─Sequential: 1-3                        [100, 512]                --
│    └─Linear: 2-8                       [100, 512]                524,800
│    └─ReLU: 2-9                         [100, 512]                --
│    └─Dropout: 2-10                     [100, 512]                --
├─Sequential: 1-4                        [100, 256]                --
│    └─Linear: 2-11                      [100, 256]                131,328
│    └─ReLU: 2-12                        [100, 256]                --
│    └─Dropout: 2-13                     [100, 256]                --
├─Sequential: 1-5                        [100, 128]                --
│    └─Linear: 2-14                      [100, 128]                32,896
│    └─ReLU: 2-15                        [100, 128]                --
│    └─Dropout: 2-16                     [100, 128]                --
├─Sequential: 1-6                        [100, 64]                 --
│    └─Linear: 2-17                      [100, 64]                 8,256
│    └─ReLU: 2-18                        [100, 64]                 --
│    └─Dropout: 2-19                     [100, 64]                 --
├─Sequential: 1-7                        [100, 32]                 --
│    └─Linear: 2-20                      [100, 32]                 2,080
│    └─ReLU: 2-21                        [100, 32]                 --
│    └─Dropout: 2-22                     [100, 32]                 --
├─Linear: 1-8                            [100, 10]                 330
==========================================================================================
Total params: 4,405,546
Trainable params: 4,405,546
Non-trainable params: 0
Total mult-adds (M): 440.55
==========================================================================================
Input size (MB): 0.31
Forward/backward pass size (MB): 3.26
Params size (MB): 17.62
Estimated Total Size (MB): 21.20
==========================================================================================
```

Dropout은 파라미터가 없어서 파라미터 수는 BigModel과 같다.

```python
loss_fn = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(dout_model.parameters(), lr=lr)
```

```python
train_loss_list3, train_acc_list3, valid_loss_list3, valid_acc_list3 = fit(
    train_loader, test_loader,
    dout_model,
    loss_fn,
    optimizer,
    epochs,
    save_best_model=False,
    patience=5,
    device=device,
    mode="multi"
)
```

```text
Epoch[1/20] - Train loss: 0.92340 Train Accucracy: 0.63755 || Validation Loss: 0.95866 Validation Accuracy: 0.63000
====================================================================================================
Epoch[2/20] - Train loss: 0.52782 Train Accucracy: 0.76382 || Validation Loss: 0.56347 Validation Accuracy: 0.76690
====================================================================================================
Epoch[3/20] - Train loss: 0.40526 Train Accucracy: 0.78485 || Validation Loss: 0.42230 Validation Accuracy: 0.78140
====================================================================================================
Epoch[4/20] - Train loss: 0.31289 Train Accucracy: 0.87710 || Validation Loss: 0.35074 Validation Accuracy: 0.86850
====================================================================================================
Epoch[5/20] - Train loss: 0.21676 Train Accucracy: 0.95650 || Validation Loss: 0.27408 Validation Accuracy: 0.94880
====================================================================================================
Epoch[6/20] - Train loss: 0.20021 Train Accucracy: 0.94538 || Validation Loss: 0.23770 Validation Accuracy: 0.94280
====================================================================================================
Epoch[7/20] - Train loss: 0.15319 Train Accucracy: 0.96588 || Validation Loss: 0.20677 Validation Accuracy: 0.95710
====================================================================================================
Epoch[8/20] - Train loss: 0.13000 Train Accucracy: 0.96878 || Validation Loss: 0.18181 Validation Accuracy: 0.96300
====================================================================================================
Epoch[9/20] - Train loss: 0.10998 Train Accucracy: 0.97667 || Validation Loss: 0.16994 Validation Accuracy: 0.97040
====================================================================================================
Epoch[10/20] - Train loss: 0.10445 Train Accucracy: 0.97508 || Validation Loss: 0.15990 Validation Accuracy: 0.96720
====================================================================================================
Epoch[11/20] - Train loss: 0.09801 Train Accucracy: 0.97480 || Validation Loss: 0.16775 Validation Accuracy: 0.96520
====================================================================================================
Epoch[12/20] - Train loss: 0.10480 Train Accucracy: 0.97388 || Validation Loss: 0.19222 Validation Accuracy: 0.96440
====================================================================================================
Epoch[13/20] - Train loss: 0.08299 Train Accucracy: 0.97942 || Validation Loss: 0.15149 Validation Accuracy: 0.97060
====================================================================================================
Epoch[14/20] - Train loss: 0.08851 Train Accucracy: 0.97893 || Validation Loss: 0.17485 Validation Accuracy: 0.96890
====================================================================================================
Epoch[15/20] - Train loss: 0.07038 Train Accucracy: 0.98363 || Validation Loss: 0.15121 Validation Accuracy: 0.97480
====================================================================================================
Epoch[16/20] - Train loss: 0.07043 Train Accucracy: 0.98227 || Validation Loss: 0.17375 Validation Accuracy: 0.97030
====================================================================================================
Epoch[17/20] - Train loss: 0.05740 Train Accucracy: 0.98605 || Validation Loss: 0.17198 Validation Accuracy: 0.97990
====================================================================================================
Epoch[18/20] - Train loss: 0.06359 Train Accucracy: 0.98650 || Validation Loss: 0.17729 Validation Accuracy: 0.97850
====================================================================================================
Epoch[19/20] - Train loss: 0.05056 Train Accucracy: 0.98782 || Validation Loss: 0.18265 Validation Accuracy: 0.97620
====================================================================================================
Epoch[20/20] - Train loss: 0.04682 Train Accucracy: 0.98875 || Validation Loss: 0.16452 Validation Accuracy: 0.97780
====================================================================================================
Early stopping: Epoch - 19
507.4497332572937 초
```

```python
# 보충: Dropout 모델 학습 곡선
plot_fit_result(train_loss_list3, train_acc_list3, valid_loss_list3, valid_acc_list3)
results["Dropout"] = (train_loss_list3, train_acc_list3, valid_loss_list3, valid_acc_list3)
```

![그래프 출력](/images/dl/dl-performance-3.png)

구조는 BigModel과 같은데 초반 학습이 훨씬 느리다. 1 epoch 정확도가 63%이고, 5 epoch에 들어서야 95%를 넘는다. 7개 층마다 뉴런의 절반씩 꺼지니 학습 신호가 약해진 것이다. val loss는 15 epoch에서 0.1512로 가장 낮았고, 이후 5번 개선이 없어 마침 20번째 epoch에서 조기 종료 조건이 걸렸다.

마지막 epoch의 train과 validation accuracy 차이는 1.1%p(98.9% vs 97.8%)로, BigModel의 마지막 epoch(99.1% vs 97.6%, 1.6%p)보다 작다. 다만 val loss 자체는 BigModel보다 높다. p=0.5를 7개 층 전부에 준 것은 이 데이터와 epoch 수에서는 규제가 강한 편이다.

## Batch Normalization 예제

- Linear와 Activation 사이에 넣는다
- `nn.BatchNorm1d(입력 feature 개수)`: Linear 출력이 2048개면 `BatchNorm1d(2048)`

```python
# nn.BatchNorm1d(입력 feature개수)
# Linear -> BatchNorm -> ReLU(Activation)
# Linear -> BatchNorm -> ReLU(Activation) -> Dropout

class BatchNormModel(nn.Module):

    def __init__(self, drop_rate=0.2):
        super().__init__()
        self.b1 = nn.Sequential(nn.Flatten(), nn.Linear(28*28, 2048), nn.BatchNorm1d(2048) ,nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b2 = nn.Sequential(nn.Linear(2048, 1024), nn.BatchNorm1d(1024), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b3 = nn.Sequential(nn.Linear(1024, 512), nn.BatchNorm1d(512), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b4 = nn.Sequential(nn.Linear(512, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b5 = nn.Sequential(nn.Linear(256, 128), nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b6 = nn.Sequential(nn.Linear(128, 64), nn.BatchNorm1d(64), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.b7 = nn.Sequential(nn.Linear(64, 32), nn.BatchNorm1d(32), nn.ReLU(), nn.Dropout(p=drop_rate))
        self.out_block = nn.Linear(32, 10)
        
    def forward(self, X):
        X = self.b1(X)
        X = self.b2(X)
        X = self.b3(X)
        X = self.b4(X)
        X = self.b5(X)
        X = self.b6(X)
        X = self.b7(X)
        return self.out_block(X)
```

```python
bn_model = BatchNormModel(drop_rate=0.5).to(device)
summary(bn_model, (100, 1, 28, 28))
```

```text
==========================================================================================
Layer (type:depth-idx)                   Output Shape              Param #
==========================================================================================
BatchNormModel                           [100, 10]                 --
├─Sequential: 1-1                        [100, 2048]               --
│    └─Flatten: 2-1                      [100, 784]                --
│    └─Linear: 2-2                       [100, 2048]               1,607,680
│    └─BatchNorm1d: 2-3                  [100, 2048]               4,096
│    └─ReLU: 2-4                         [100, 2048]               --
│    └─Dropout: 2-5                      [100, 2048]               --
├─Sequential: 1-2                        [100, 1024]               --
│    └─Linear: 2-6                       [100, 1024]               2,098,176
│    └─BatchNorm1d: 2-7                  [100, 1024]               2,048
│    └─ReLU: 2-8                         [100, 1024]               --
│    └─Dropout: 2-9                      [100, 1024]               --
├─Sequential: 1-3                        [100, 512]                --
│    └─Linear: 2-10                      [100, 512]                524,800
│    └─BatchNorm1d: 2-11                 [100, 512]                1,024
│    └─ReLU: 2-12                        [100, 512]                --
│    └─Dropout: 2-13                     [100, 512]                --
├─Sequential: 1-4                        [100, 256]                --
│    └─Linear: 2-14                      [100, 256]                131,328
│    └─BatchNorm1d: 2-15                 [100, 256]                512
│    └─ReLU: 2-16                        [100, 256]                --
│    └─Dropout: 2-17                     [100, 256]                --
├─Sequential: 1-5                        [100, 128]                --
│    └─Linear: 2-18                      [100, 128]                32,896
│    └─BatchNorm1d: 2-19                 [100, 128]                256
│    └─ReLU: 2-20                        [100, 128]                --
│    └─Dropout: 2-21                     [100, 128]                --
├─Sequential: 1-6                        [100, 64]                 --
│    └─Linear: 2-22                      [100, 64]                 8,256
│    └─BatchNorm1d: 2-23                 [100, 64]                 128
│    └─ReLU: 2-24                        [100, 64]                 --
│    └─Dropout: 2-25                     [100, 64]                 --
├─Sequential: 1-7                        [100, 32]                 --
│    └─Linear: 2-26                      [100, 32]                 2,080
│    └─BatchNorm1d: 2-27                 [100, 32]                 64
│    └─ReLU: 2-28                        [100, 32]                 --
│    └─Dropout: 2-29                     [100, 32]                 --
├─Linear: 1-8                            [100, 10]                 330
==========================================================================================
Total params: 4,413,674
Trainable params: 4,413,674
Non-trainable params: 0
Total mult-adds (M): 441.37
==========================================================================================
Input size (MB): 0.31
Forward/backward pass size (MB): 6.51
Params size (MB): 17.65
Estimated Total Size (MB): 24.48
==========================================================================================
```

BatchNorm1d는 feature마다 $\gamma$, $\beta$ 두 개의 학습 파라미터가 있어서 파라미터가 4,405,546개에서 4,413,674개로 늘었다. (2048 + 1024 + 512 + 256 + 128 + 64 + 32) × 2 = 8,128개다.

```python
loss_fn = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(bn_model.parameters(), lr=lr)

train_loss_list3, train_acc_list3, valid_loss_list3, valid_acc_list3 = fit(
    train_loader, test_loader,
    bn_model,
    loss_fn,
    optimizer,
    epochs,
    save_best_model=False,
    patience=5,
    device=device,
    mode="multi"
)
```

```text
Epoch[1/20] - Train loss: 0.42554 Train Accucracy: 0.93548 || Validation Loss: 0.41915 Validation Accuracy: 0.93460
====================================================================================================
Epoch[2/20] - Train loss: 0.17566 Train Accucracy: 0.95765 || Validation Loss: 0.18621 Validation Accuracy: 0.95380
====================================================================================================
Epoch[3/20] - Train loss: 0.12753 Train Accucracy: 0.96932 || Validation Loss: 0.13924 Validation Accuracy: 0.96670
====================================================================================================
Epoch[4/20] - Train loss: 0.10432 Train Accucracy: 0.97540 || Validation Loss: 0.11954 Validation Accuracy: 0.97090
====================================================================================================
Epoch[5/20] - Train loss: 0.08830 Train Accucracy: 0.98017 || Validation Loss: 0.11108 Validation Accuracy: 0.97640
====================================================================================================
Epoch[6/20] - Train loss: 0.07928 Train Accucracy: 0.98135 || Validation Loss: 0.11322 Validation Accuracy: 0.97390
====================================================================================================
Epoch[7/20] - Train loss: 0.07322 Train Accucracy: 0.98342 || Validation Loss: 0.11129 Validation Accuracy: 0.97470
====================================================================================================
Epoch[8/20] - Train loss: 0.06327 Train Accucracy: 0.98583 || Validation Loss: 0.09767 Validation Accuracy: 0.97820
====================================================================================================
Epoch[9/20] - Train loss: 0.06221 Train Accucracy: 0.98613 || Validation Loss: 0.10039 Validation Accuracy: 0.97770
====================================================================================================
Epoch[10/20] - Train loss: 0.04967 Train Accucracy: 0.98858 || Validation Loss: 0.09366 Validation Accuracy: 0.97980
====================================================================================================
Epoch[11/20] - Train loss: 0.05011 Train Accucracy: 0.98885 || Validation Loss: 0.09503 Validation Accuracy: 0.98000
====================================================================================================
Epoch[12/20] - Train loss: 0.04723 Train Accucracy: 0.98940 || Validation Loss: 0.09808 Validation Accuracy: 0.97950
====================================================================================================
Epoch[13/20] - Train loss: 0.04349 Train Accucracy: 0.98990 || Validation Loss: 0.09153 Validation Accuracy: 0.98090
====================================================================================================
Epoch[14/20] - Train loss: 0.04225 Train Accucracy: 0.99065 || Validation Loss: 0.08640 Validation Accuracy: 0.98180
====================================================================================================
Epoch[15/20] - Train loss: 0.03552 Train Accucracy: 0.99197 || Validation Loss: 0.07927 Validation Accuracy: 0.98340
====================================================================================================
Epoch[16/20] - Train loss: 0.03551 Train Accucracy: 0.99242 || Validation Loss: 0.08268 Validation Accuracy: 0.98320
====================================================================================================
Epoch[17/20] - Train loss: 0.03399 Train Accucracy: 0.99272 || Validation Loss: 0.09117 Validation Accuracy: 0.98210
====================================================================================================
Epoch[18/20] - Train loss: 0.03255 Train Accucracy: 0.99297 || Validation Loss: 0.08218 Validation Accuracy: 0.98270
====================================================================================================
Epoch[19/20] - Train loss: 0.03175 Train Accucracy: 0.99287 || Validation Loss: 0.09224 Validation Accuracy: 0.98100
====================================================================================================
Epoch[20/20] - Train loss: 0.02814 Train Accucracy: 0.99352 || Validation Loss: 0.08766 Validation Accuracy: 0.98200
====================================================================================================
Early stopping: Epoch - 19
552.0507628917694 초
```

결과를 Dropout 모델과 같은 `train_loss_list3` 등에 받아서 Dropout 결과를 덮어쓴다. 비교하려면 이름을 따로 두는 게 낫다. 여기서는 위에서 `results`에 미리 담아 두었다.

```python
# 보충: BatchNorm 모델 학습 곡선
plot_fit_result(train_loss_list3, train_acc_list3, valid_loss_list3, valid_acc_list3)
results["BatchNorm"] = (train_loss_list3, train_acc_list3, valid_loss_list3, valid_acc_list3)
```

![그래프 출력](/images/dl/dl-performance-4.png)

Dropout(0.5)이 똑같이 들어 있는데도 첫 epoch부터 val accuracy 93.5%로 시작한다. 층마다 출력 분포를 맞춰 주니 Dropout만 넣은 모델보다 학습이 훨씬 빠르다. val loss는 15 epoch에서 0.0793으로 가장 낮았고, 이후에도 0.08~0.09 사이를 유지했다.

### 네 모델 비교

```python
# 보충: 모델별 결과 정리
import pandas as pd
rows = []
for name, (tl, ta, vl, va) in results.items():
    best = min(range(len(vl)), key=lambda i: vl[i])
    rows.append({
        "모델": name,
        "학습 epoch": len(vl),
        "best epoch": best + 1,
        "best val loss": round(vl[best], 4),
        "best val acc": round(va[best], 4),
        "최고 val acc": round(max(va), 4),
        "마지막 train acc": round(ta[-1], 4),
        "마지막 val loss": round(vl[-1], 4),
    })
pd.DataFrame(rows).set_index("모델")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 4행 × 7열</div><div class="sql-result-scroll"><table><thead><tr><th>모델</th><th>학습 epoch</th><th>best epoch</th><th>best val loss</th><th>best val acc</th><th>최고 val acc</th><th>마지막 train acc</th><th>마지막 val loss</th></tr></thead><tbody><tr><th class="idx">Small</th><td>20</td><td>16</td><td>0.26</td><td>0.9272</td><td>0.9272</td><td>0.9308</td><td>0.2601</td></tr><tr><th class="idx">Big</th><td>11</td><td>6</td><td>0.0762</td><td>0.9808</td><td>0.9808</td><td>0.9913</td><td>0.0959</td></tr><tr><th class="idx">Dropout</th><td>20</td><td>15</td><td>0.1512</td><td>0.9748</td><td>0.9799</td><td>0.9888</td><td>0.1645</td></tr><tr><th class="idx">BatchNorm</th><td>20</td><td>15</td><td>0.0793</td><td>0.9834</td><td>0.9834</td><td>0.9935</td><td>0.0877</td></tr></tbody></table></div></div>

```python
# 보충: validation loss 곡선 한 장에 겹쳐 보기
plt.figure(figsize=(8, 5))
for name, (tl, ta, vl, va) in results.items():
    plt.plot(range(1, len(vl) + 1), vl, marker="o", markersize=3, label=name)
plt.xlabel("epoch")
plt.ylabel("validation loss")
plt.xticks(range(1, 21))
plt.grid(True, linestyle=":")
plt.legend()
plt.show()
```

![그래프 출력](/images/dl/dl-performance-5.png)

- 최고 validation accuracy는 BatchNorm 98.34% > Big 98.08% > Dropout 97.99% > Small 92.72% 순이다
- 가장 낮은 val loss는 Big(0.0762)이 근소하게 앞서지만 6 epoch 이후 다시 올라간다. BatchNorm은 낮은 val loss를 끝까지 유지한다
- Small은 train과 validation 차이가 작은 대신 성능 자체가 낮다
- 각 모델을 한 번씩만 학습시킨 결과라, Big·Dropout·BatchNorm 사이의 0.3~0.4%p 차이는 시드에 따라 순서가 바뀔 수 있는 크기다

## Learning Rate Decay: 학습률 스케줄러

PyTorch는 `torch.optim.lr_scheduler` 모듈에서 여러 학습률 조정 알고리즘을 제공한다. 사용법은 같다.

1. optimizer를 만들고, 그 optimizer를 넣어 스케줄러를 만든다
2. 학습 루프에서 `optimizer.step()` 다음에 `scheduler.step()`을 부른다. epoch마다 부를지 step(batch)마다 부를지는 정하기 나름이다
3. 현재 학습률은 `scheduler.get_last_lr()`이나 `optimizer.param_groups[0]["lr"]`로 본다

```python
import matplotlib.pyplot as plt

def plot_lr(title, lr_list):
    """Learning 스케쥴러(학습도중 LR를 변경시키는 객체.)에 의해 변화되는 Learning Rate값을 시각화.

    Args:
        title (str): title
        lr_list (list): Learning Rate 스케쥴러에 의해 변경된 learning rate값들을 가지는 list
    """
    plt.figure(figsize=(15, 6))
    plt.plot(range(len(lr_list)), lr_list)

    plt.title(title)
    xticks = [x for x in range(len(lr_list)) if x % 10 == 0]
    plt.xticks(xticks)
    plt.xlabel("Epoch 수 또는 Step 수")
    plt.ylabel("학습률-LR")
    plt.grid(True, linestyle=":")
    plt.show()
```

### StepLR

계단 형태로, 정해진 step마다 정해진 비율로 학습률을 줄인다.

```python
small_model = BatchNormModel() # 위 아마거나 써도 된다.
optim = torch.optim.Adam(small_model.parameters(), lr=0.001)

# optimizer에서 현재 LR을 조회
optim.param_groups[0]["lr"]
```

```text
0.001
```

```python
# LearingRate Scheduler - StepLR - 계단 형태로 Learning Rate를 특정 step마다 특정 비율로 줄여나간다.
steplr_scheduler = torch.optim.lr_scheduler.StepLR(
    optim,        # 학습률을 변경할 옵티마이저.
    step_size=30, # 몇 step/epoch마다 Learning를 변경할지 -> lr_scheduler.step()을 30번 호출하면 변경.
    gamma=0.5,    # 변경할 비율. 
)
# 30 step/epoch 마다 LR를 `현재학습률 * gamma` 로 변경.

# 현재 learning rate를 스케쥴러로 부터 조회
steplr_scheduler.get_last_lr()
```

```text
[0.001]
```

실제 학습 대신 `optim.step()`만 부르는 가짜 루프로 학습률이 어떻게 바뀌는지만 본다.

```python
epochs = 300
step_size = 10 # len(dataloader)
lr_list = []
for epoch in range(epochs):
    
    for step in range(step_size): # for x, y in dataloader:
        # 1 step 학습
        # 1. x, y device로 이동
        # 2. 추론. p = model(x)
        # 3. loss. loss = loss_fn(p, y)
        # 4. grad. loss.backward()
        # 5. 파라미터 update
        optim.step()  
        # 6. grad 초기화
        optim.zero_grad() 
        
        # steplr_scheduler.step() # LR를 변경 요청. 1스텝이 끝나면 요청
        # lr_list.append(steplr_scheduler.get_last_lr()) # step()후 lr를 list에 저장.

    steplr_scheduler.step() # LR를 변경 요청. # 1에폭 끝나면 요청
    lr_list.append(steplr_scheduler.get_last_lr()) # step()후 lr를 list에 저장.
```

```python
plot_lr("Step LR", lr_list)
```

![그래프 출력](/images/dl/dl-performance-6.png)

> **보충** 노트북에서는 그래프 위에 `plt.rcParams['font.family'] = "malgun gothic"`을 넣어 한글 축 이름이 깨지지 않게 했다. 맑은 고딕은 Windows 폰트라 macOS에서는 `"AppleGothic"`, 리눅스·Colab에서는 나눔 폰트 등을 설치해서 지정한다.

0.001에서 시작해 30 epoch마다 절반이 된다. 300 epoch 뒤에는 0.001 × 0.5¹⁰ ≈ 1e-6이다.

### CosineAnnealingLR

cosine 그래프를 그리며 학습률을 바꾸는 방식이다. 최근에는 학습률을 단순히 줄이기보다 줄었다 늘었다를 반복하며 진동하는 방식으로 최적점을 찾아가는 알고리즘을 많이 쓴다. 그중 가장 간단하면서 많이 쓰이는 방법이 CosineAnnealingLR이다.

```python
optim = torch.optim.Adam(small_model.parameters(), lr=0.001)
ca_lr_scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
    optim,
    T_max=10, # 변화주기 step/epoch - 최대(초기LR) ~ 최소(eta_min), 최소 ~ 최대
    eta_min=1e-6, # lr 최소값 지정. 
)
```

```python
lr_list = []
for epoch in range(epochs):
    for step in range(step_size):
        # ... 학습
        optim.step()
        optim.zero_grad()
    
    ca_lr_scheduler.step() # epoch단위로 lr 변경
    lr_list.append(ca_lr_scheduler.get_last_lr())
```

```python
plot_lr("CosineAnnelingLR", lr_list)
```

![그래프 출력](/images/dl/dl-performance-7.png)

`T_max=10`이라 10 epoch 동안 0.001에서 1e-6까지 내려갔다가, 다음 10 epoch 동안 다시 0.001로 올라간다. 내려갔다 올라오는 한 주기가 20 epoch이다.

### CosineAnnealingWarmRestarts

cosine annealing 스케줄에서 cosine 주기의 epoch 수를 점점 늘리거나 줄일 수 있다. (보통 늘린다.)

```python
optim = torch.optim.Adam(small_model.parameters(), lr=0.001)
cawr_lr_scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
    optim,
    T_0=10,   # 변화주기 (step/epoch) 최소(eta_min) <-> 최대(초기 lr)
    T_mult=2, # 새로운 변화주기(T_0) = 현재 T_O * T_mult (한 주기가 끝날때마다 T_O를 다시 계산.)
    eta_min=1e-6 # 0.000001
)
```

```python
lr_list = []
for epoch in range(epochs):

    for step in range(step_size):
        # 학습
        optim.step()
        optim.zero_grad()

    cawr_lr_scheduler.step()
    lr_list.append(cawr_lr_scheduler.get_last_lr())
```

```python
plot_lr("CosineAnnealingWarmRestart", lr_list)
```

![그래프 출력](/images/dl/dl-performance-8.png)

최솟값에 닿으면 천천히 올라오지 않고 바로 0.001로 튀어 오른다(restart). 주기가 10 → 20 → 40 → 80 → 160 epoch으로 두 배씩 길어져서 10, 30, 70, 150 epoch에서 재시작한다.

| 스케줄러 | 모양 | 주요 인자 |
|---|---|---|
| `StepLR` | 계단식으로 감소 | `step_size`(몇 번마다), `gamma`(곱할 비율) |
| `CosineAnnealingLR` | 초기 lr ↔ `eta_min`을 cosine으로 오르내림 | `T_max`(반 주기), `eta_min` |
| `CosineAnnealingWarmRestarts` | 최소에 닿으면 초기 lr로 **바로 튀어 오르고**, 주기가 점점 길어짐 | `T_0`(첫 주기), `T_mult`(주기 배수), `eta_min` |

## 언제 무엇을 쓸까

| 상황 | 먼저 해 볼 것 |
|---|---|
| train, validation 둘 다 성능이 낮다 (과소적합) | 모델을 키운다(layer, unit), epoch을 늘린다, 데이터에 맞는 layer(CNN, RNN)를 쓴다 |
| train은 좋은데 validation이 나빠진다 (과대적합) | 조기 종료, 모델 줄이기, Dropout, 데이터 증강 |
| 깊은 모델이 학습이 잘 안 되거나 초기값에 따라 결과가 들쭉날쭉하다 | Batch Normalization (이미지·CNN), Layer Normalization (자연어·Transformer) |
| loss가 초반에 잘 내려가다 어느 지점에서 정체된다 | 학습률 스케줄러로 후반에 학습률을 낮춘다 |
| 어떤 조합이 좋은지 모르겠다 | 큰 모델 + 조기 종료로 시작해, validation 곡선을 보며 하나씩 바꾼다 |

## 정리

- 학습은 train 성능을 올리는 **최적화**이고, 목표는 처음 보는 데이터에서도 잘 맞히는 **일반화**다
- train과 validation이 둘 다 나쁘면 **과소적합**, train만 좋으면 **과대적합**이다. 과대적합 규제는 모두 모델 복잡도를 낮추는 방법이다
- **Dropout**은 학습 중 뉴런을 무작위로 꺼서 특정 뉴런에 기대지 않게 한다. train/eval 모드에 따라 동작이 달라지므로 `model.eval()`을 꼭 부른다
- **Batch Normalization**은 Linear와 Activation 사이에서 층의 출력을 batch 단위로 정규화한다. 학습 모드에서는 batch에 샘플이 2개 이상 있어야 한다
- **학습률 스케줄러**는 optimizer를 감싸고, `optimizer.step()` 뒤에 `scheduler.step()`을 불러 학습률을 바꾼다
- 반복되는 학습·검증·시각화 코드는 모듈로 빼 두면 모델만 바꿔 가며 비교하기 쉽다
