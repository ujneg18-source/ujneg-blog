---
title: "최적화: 경사하강법"
description: "머신러닝에서 최적화의 의미와 손실함수(Loss Function), 미분값(gradient)의 부호로 가중치를 움직이는 경사하강법의 원리와 학습률의 역할을 정리하고, 가상의 손실함수로 경사하강법을 직접 구현해 학습률에 따라 수렴과 발산이 어떻게 달라지는지 확인합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 13
originalNotebook: "11_최적화-경사하강법.ipynb"
tags: ["Python","Optimization","Gradient Descent","Loss Function"]
date: 2026-05-27
---

> SKN31 머신러닝 과정 노트북 `11_최적화-경사하강법.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 머신러닝에서 최적화란
- 손실함수(Loss Function)
- 경사하강법(Gradient Descent)의 원리
- 학습률(Learning rate)
- 경사하강법 직접 구현하기

다음 글부터 다룰 선형 회귀와 로지스틱 회귀, 그리고 딥러닝이 모두 이 방법으로 학습한다.

## 머신러닝에서 최적화 (Optimization)

- 최적화는 주어진 문제에서 **가장 좋은 결과**를 낼 수 있도록 처리하는 과정이다. 목표를 최대화 또는 최소화하는 방법을 찾는다
- **머신러닝에서 최적화**는 **손실함수를 최소화**하는 모델(파라미터)을 찾는 것이다

수업 중 정리한 큰 그림이다.

```python
# 모델의 최적화 방법 2가지

# 1) 정규방정식(해석적 방법)
#    -> 수학 공식으로 한 번에 최적의 w 계산

# 2) 모델 학습(반복 학습 방식)
#    ├─ 손실함수(loss function)
#    │    -> 모델의 예측값과 실제 정답이 얼마나 다른지 지표(점수)로 나타내는 함수
#    │    -> 오차가 클수록 손실 함수의 결괏값(Loss)은 커지고, 잘 맞출수록 0에 가까워집니다.
#    │    -> ex) MSE, Cross-Entropy 등
#    │
#    │
#    └─ 최적화 함수(optimizer)
#         -> 손실 함수가 계산한 오차 값을 바탕으로, 가중치(Weight)를 수정(=loss를 줄이도록 w 수정)
#         -> 기울기(Gradient)를 이용해 손실 함수 값이 최소가 되는 방향과 보폭(학습률)을 계산
#         -> ex) 경사하강법(Gradient Descent) = 여러번 반복 계산, Adam 등




# (1) 최적화 함수   => 최적의 모델의 파라미터를 찾아주는 것 (ex. 선형회귀의 기울기 a, 절편b) = optimizer
# (2) 경사 하강법   => 오차(loss)가 작아지는 방향으로 w를 수정  //기울기(gradient)
#  ex. w 10 => 11 / 오차 20 -> 21

## 경사 하강법을 위해 W를 값을 변경하는 공식을 만들어야 함 ##

## 선형적 ##
# y=2x+b
# 2 = w (기울기)

## 선형 ##

# y=w1x2+w2x+b 이런 곡선 형태가 됨.

# 여기서 w는?

# → 여전히 “가중치(weight)” 파라미터인데,
# → 단순한 직선 기울기 하나로 해석하긴 어려움.

# 왜냐면:
# 위치마다 기울기가 달라짐
# 곡선은 한 개의 고정 기울기가 없음


## 딥러닝 ##
# y=σ(wx+b)
# w = 가중치
# σ = 활성화 함수(sigmoid, ReLU 등)
```

> **보충** 두 번째 "선형" 제목 아래 `y = w1·x² + w2·x + b`는 x 기준으로는 곡선이지만, **w 기준으로는 여전히 일차식**이라 선형 모델이다. 다음 글의 다항 회귀가 정확히 이 구조다. 여기서 헷갈리기 쉬운 두 "기울기"도 구분해 두자. 직선 `y = 2x + b`의 2는 **x에 대한 y의 기울기**(= 가중치 w)이고, 경사하강법에서 말하는 기울기(gradient)는 **w에 대한 loss의 기울기**(미분값)다.

## Loss Function (손실함수)

- 모델이 예측한 값과 실제값(정답)의 차이(오차)를 **수치화**하는 함수
- 모델을 최적화할 때, 성능을 판단할 때 쓴다
  - 학습의 목표는 손실함수 값을 **최소화**해서 모델이 정답에 가까운 예측을 하게 만드는 것이다
- Cost Function(비용함수), Objective Function(목적함수), Error Function(오차함수)라고도 부른다

| 문제 | 주요 손실함수 |
|---|---|
| 다중 분류 | Cross-Entropy (교차 엔트로피) |
| 이진 분류 | Binary Cross-Entropy (이진 교차 엔트로피) |
| 회귀 | MSE (Mean Squared Error) |

```python
# 오차를 감소하는 함수
# 정답(y)과 모델이 예측한 값// 모델이 예측한 값 f(X)=pred_y
```

```python
# (분류) => log (모델이 예측한 정답클래스의 확률) = 오차
# 정답의 클래스만 가지고는 실제 오차의 확률을 알수었음
# a.정답51%, 정답x49%
# b.정답99%, 정답x 1%

# (회귀)
# mse , log 차이 => 집값 예측같은건 확률로 표현하기가 어려움
# # MSE(평균제곱오차)를 사용함
```

a와 b는 둘 다 정답을 맞혔지만 확신의 정도가 다르다. 맞았냐 틀렸냐(정확도)만 보면 둘이 같아서 무엇을 고쳐야 할지 알 수 없다. 그래서 분류의 손실함수는 **정답 클래스에 매긴 확률**에 log를 씌워 51%짜리 정답에 99%짜리보다 큰 손실을 준다. 이 내용은 로지스틱 회귀 글에서 다시 나온다.

## Gradient Descent (경사하강법)

- 다양한 문제에서 최적의 해법을 찾는 **일반적인 최적화 알고리즘**. 머신러닝·딥러닝의 대표 최적화 알고리즘이다
- 손실함수를 최소화하는 파라미터를 찾기 위해 **기울기(gradient)를 따라 반복해서 이동**한다
  1. 파라미터 W에 대한 손실함수의 gradient(경사, 변화율, 미분값)를 계산한다
  2. gradient가 감소하는 방향으로 W를 바꾼다
  3. gradient가 **0**이 될 때까지 1, 2를 반복한다
- gradient의 부호에 따라
  - **양수**면 loss와 weight가 비례 관계 → loss를 줄이려면 weight를 **줄인다**
  - **음수**면 반비례 관계 → loss를 줄이려면 weight를 **키운다**

```python
# 미분값=>순간변화률(기울기, 경사)
# loss(정답, f(x) ) (입출력값은 고정-그러면 f(x)식을 바꿔야 함 그 안에 있는게 파라미터=기울기, 절편)
# 파라미터가 변경되면 오차가 변경
# y1->y2/x1->x2
```

```python
# 음수: y변화/x변화 (증감이 다르다는 이야기)(양수/음수. 음수/양수) (-,+)
# 양수: y변화/x변화 (증감이 같다는 이야기) (양수/양수, 음수/음수)
# weight = w(파라미터) loss에따라 증감여부 결정하는 건 결국 변화률 계산이랑 같음 즉 미분을 해야 함
# 미분의 값을 보고 양수면 줄이고, 음수면 키워야 함 양수면 w를 줄여야 함, 음수면 w을 키워야 함

# 미분값(기울기) = loss가 w에 대해 변하는 방향

# dL/dw > 0 : w를 증가시키면 loss 증가 → w 감소시키는 방향으로 이동
# dL/dw < 0 : w를 증가시키면 loss 감소 → w 증가시키는 방향으로 이동

# 즉, 항상 loss가 줄어드는 방향으로 w를 업데이트함
# 이 과정이 경사하강법
```

입력과 정답은 데이터라 바꿀 수 없다. 바꿀 수 있는 건 모델 안의 파라미터(w, b)뿐이고, w를 바꿨을 때 loss가 어느 쪽으로 움직이는지가 미분값이다.

![Cost-Weight 그래프: 랜덤한 시작점에서 기울기를 따라 최솟값으로 내려간다](/images/ml/fig-gradient-descent.jpeg)

```python
# cost(오차), weight(가중) 그래프
# 가장 낮은 곳이 오차가 가장 적은 W
# 기울기(변화량)가 양수일 때는 w를 줄이고
# 기울기(변화량)가 음수일 때는 w를 키우고

# learning step 부분은 최초 랜덤값의 기울기(변화량) = # learning step = 한 번 w를 업데이트하는 과정 (조금씩)

# w = before Loss/ before weight * α(learning rate) 그럼 w값은 어떻게 구함?

# loss = 0이 되어가는, w를 찾음, # loss의 미분값으로 w

# 기울기 = “loss가 w에 반응하는 정도”
```

> **보충** 메모 중간의 질문("그럼 w값은 어떻게 구함?")의 답이 바로 아래 공식이다. 그리고 목표는 loss가 **0**이 되는 w가 아니라 loss가 **가장 작아지는** w다. 그 지점에서 0이 되는 건 loss가 아니라 **기울기**다. 아래 예제의 최소 loss도 0이 아니라 2다.

### 모델 파라미터 조정

$$
W_{new} = W - \alpha \frac{\partial}{\partial W} \text{cost}(W) \quad (W: \text{파라미터},\ \alpha: \text{학습률})
$$

1. 현재 파라미터에서 loss를 미분한다
2. 그 값에 learning rate를 곱해서 현재 파라미터에서 뺀다

기울기가 양수면 빼니까 W가 작아지고, 음수면 빼니까(음수를 빼면 더하는 셈) 커진다. 위의 부호 규칙이 공식 하나에 들어 있다.

> **Learning rate (학습률)**
> - 경사하강법의 하이퍼파라미터. 기울기에 곱해서 파라미터를 얼마나 바꿀지 정한다
> - **너무 작으면** 최솟값까지 반복이 많이 필요해 시간이 오래 걸린다
> - **너무 크면** 왔다 갔다 하다가 오히려 값이 커져 **발산**하고 최솟값에 수렴하지 못한다

## 경사하강법 직접 구현하기

가상의 손실함수를 하나 정한다. w = 1일 때 최소이고, 그때 loss는 2다.

```python
# 가상의 loss 함수
def loss(weight):
    # weight에 대한 오차를 반환(가상)
    return (weight-1)**2 + 2
```

```python
loss(0.1)
```

```text
2.81
```

손실함수의 도함수(미분한 함수)다. $(w-1)^2 + 2$를 미분하면 $2(w-1)$이다.

```python
#  위의 loss함수의 도함수(=미분해주는 함수)
def derived_loss(weight):
    return 2*(weight-1)  # 기울기
```

```python
derived_loss(2)
```

```text
2
```

```python
print('w=1, 오차:', loss(1))
print('w=1, 기울기(변화율):', derived_loss(1))
```

```text
w=1, 오차: 2
w=1, 기울기(변화율): 0
```

w = 1에서 loss는 최소(2)이고 기울기는 0이다. 한 번만 업데이트해 본다.

```python
#초기 weight
weight = 5
# 학습율
lr = 0.1

new_weight = weight - lr*derived_loss(weight)
new_weight
```

```text
4.2
```

w = 5에서 기울기는 2 × (5 - 1) = 8(양수)이라, 0.1 × 8 = 0.8만큼 줄어 4.2가 됐다. 최솟값 1 쪽으로 이동했다.

### 반복문으로 gradient가 0이 되는 지점 찾기

```python
import numpy as np
np.random.seed(0) # 처음 weight는 랜덤하게

learning_rate = 0.4
# learning_rate = 0.001
# learning_rate = 10

#최적의 weight를 찾기위한 최대 반복횟수.
max_iter = 100

#첫번째(시작) weight => random하게 잡는다.
weight =  np.random.randint(-2,3)

weight_list = [weight]  # 새로 계산된 weight들을 저장할 리스트
iter_cnt = 0 # 반복횟수를 저장할 변수

while True:
    # loss함수에 대한 미분값(기울기)을 구해서 0이면(최소지점) 반복을 멈춘다.
    if derived_loss(weight) == 0:
        break
    if iter_cnt == max_iter: # 현재 반복이 max_iter라면 멈춘다.
        break
    # 새로운 weight값을 계산
    weight = weight - learning_rate * derived_loss(weight)
    weight_list.append(weight)
    iter_cnt += 1
```

```python
iter_cnt
```

```text
23
```

```python
weight
```

```text
1.0
```

```python
loss(weight)
```

```text
2.0
```

```python
weight_list # 러닝레이트에 따른 기울기 변화
```

```text
[2, 1.2, 1.04, 1.008, 1.0016, 1.00032, 1.000064, 1.0000128, 1.00000256, 1.000000512, 1.0000001024, 1.00000002048, 1.000000004096, 1.0000000008192, 1.00000000016384, 1.000000000032768, 1.0000000000065536, 1.0000000000013107, 1.0000000000002622, 1.0000000000000524, 1.0000000000000104, 1.000000000000002, 1.0000000000000004, 1.0]
```

시작점 2에서 1.2 → 1.04 → 1.008 …로 1에 다가가 23번 만에 정확히 1.0이 됐다. 1과의 거리가 매번 1/5로 줄어든다.

> **보충** 실수 계산이라 기울기가 **정확히** 0이 되기는 어렵다. 이 예제는 운 좋게 1.0에 딱 떨어졌지만, 보통은 `abs(기울기) < 1e-6`처럼 **충분히 작으면** 멈추는 조건을 쓴다.

노트북에 주석으로 남겨 둔 다른 학습률(0.001, 10)도 돌려서 비교했다.

```python
# 보충: 학습률에 따른 경사하강법 경로 비교
def gd(lr, w0=2, max_iter=100):
    w, ws = w0, [w0]
    for _ in range(max_iter):
        if abs(derived_loss(w)) < 1e-6:
            break
        w = w - lr * derived_loss(w)
        ws.append(w)
    return ws

for lr in [0.001, 0.4, 0.9, 10]:
    ws = gd(lr)
    print(f"lr={lr:<6} 반복 {len(ws)-1:3d}회  마지막 w={ws[-1]:.4g}")
```

```text
lr=0.001  반복 100회  마지막 w=1.819
lr=0.4    반복  10회  마지막 w=1
lr=0.9    반복  66회  마지막 w=1
lr=10     반복 100회  마지막 w=7.505e+127
```

```python
# 보충: 시각화
w_axis = np.linspace(-3, 5, 200)
fig, axes = plt.subplots(1, 3, figsize=(15, 4))
for ax, lr in zip(axes, [0.001, 0.4, 0.9]):
    ws = np.array(gd(lr, max_iter=30))
    ax.plot(w_axis, loss(w_axis), color="lightgray")
    ax.plot(ws, loss(ws), marker="o", markersize=4)
    ax.set_title(f"learning rate = {lr}")
    ax.set_xlabel("weight"); ax.set_ylabel("loss")
plt.tight_layout()
plt.show()
```

![그래프 출력](/images/ml/ml-gradient-descent-1.png)

- **0.001**: 100번을 돌아도 1에 거의 다가가지 못했다. 너무 작다
- **0.4**: 금방 수렴한다
- **0.9**: 최솟값을 넘어 반대편으로 갔다가 돌아오며 **지그재그**로 수렴한다
- **10**: 한 번 움직일 때마다 반대편으로 더 멀리 튀어서 w가 폭발적으로 커지는 **발산**이다

## 정리

- 머신러닝의 최적화는 **손실함수를 최소화하는 파라미터**를 찾는 일이다
- 손실함수: 회귀는 MSE, 분류는 (Binary) Cross-Entropy
- 경사하강법: loss를 파라미터로 **미분**한 기울기를 보고, 기울기의 **반대 방향**으로 조금씩 이동한다. $W_{new} = W - \alpha \cdot \text{gradient}$
- **학습률**이 너무 작으면 느리고, 너무 크면 발산한다
- 기울기가 0(충분히 작음)이 되는 곳이 loss의 최소 지점이다
