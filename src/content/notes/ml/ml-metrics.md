---
title: "평가지표: 정확도·정밀도·재현율·PR/ROC 곡선"
description: "불균형 데이터에서 정확도의 한계를 확인하고, 혼동행렬·재현율·정밀도·F1 점수, 임계값 변경에 따른 정밀도·재현율 변화, PR 곡선과 AP 점수, ROC 곡선과 AUC 점수, 회귀 평가지표 MSE·RMSE·R²까지 MNIST와 유방암·보스턴 데이터로 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '머신러닝'
seriesOrder: 7
originalNotebook: "05_평가지표.ipynb"
tags: ["Python","scikit-learn","Metrics","Precision","Recall","ROC"]
date: 2026-05-19
---

> SKN31 머신러닝 과정 노트북 `05_평가지표.ipynb`와 수업 중 만든 `metrics.py` 모듈을 바탕으로 정리했습니다.
> 코드는 scikit-learn 1.7에서 다시 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 분류와 회귀의 평가지표 목록
- 정확도(Accuracy)와 불균형 데이터에서의 한계
- 혼동행렬, 재현율, 정밀도, F1 점수
- 평가 함수를 모아 둔 `metrics.py` 모듈 만들기
- 임계값(Threshold) 변경과 정밀도·재현율의 관계
- PR 곡선과 AP 점수, ROC 곡선과 AUC 점수
- 회귀 평가지표: MSE, RMSE, R²

## 모델 평가

모델 성능 평가는 모델링 중 현재 모델을 확인하는 **검증** 단계와 마지막 **최종 평가**에서 한다. 어떤 문제를 푸는지, 모델의 어떤 면을 확인하려는지에 따라 평가 방법이 달라진다.

| 분류 평가지표 | 회귀 평가지표 |
|---|---|
| 정확도 (Accuracy) | MSE (Mean Squared Error) |
| 정밀도 (Precision) | RMSE (Root Mean Squared Error) |
| 재현율 (Recall) | R² (결정계수) |
| F1 점수 (F1 Score) | |
| PR Curve, AP score | |
| ROC Curve, ROC-AUC score | |

```python
# 기본적으로 이진분류용 => 얼마나 대상을 잘맞추는지를 확인하는 지표
```

```python
# mse, rmse => 얼마나 오답률이 나오는지
# r2(알스퀘어) => 평균 값으로 예측

# R^2 = 1: 모델이 실제 데이터를 완벽하게 예측했을 때 (오차가 0).
# R^2 = 0: 모델의 성능이 그냥 평균값으로 찍는 것과 다를 바 없을 때.
# R^2 < 0: 모델이 평균값으로 예측하는 것보다도 성능이 더 나쁠 때 => (이런 경우 모델 설정이나 데이터에 심각한 문제가 있다는 뜻입니다).
```

평가 함수는 `sklearn.metrics` 모듈에 있다. 문자열 이름 목록은 [scikit-learn 문서](https://scikit-learn.org/stable/modules/model_evaluation.html#scoring-parameter)에 정리되어 있다.

## 분류(Classification) 평가 지표

분류는 데이터가 어떤 범주(class)에 속하는지 맞히는 문제다.

- **다중 분류**: 클래스가 여러 개이고 각 샘플은 그중 하나에만 속한다. 이미지가 고양이/개/새 중 무엇인지, 뉴스 기사가 정치/경제/스포츠 중 어디인지
- **이진 분류**: 특정 클래스인지 아닌지를 분류한다. 환자인지 아닌지, 스팸인지 아닌지

이진 분류에서는 **양성(Positive)** 과 **음성(Negative)** 을 구분한다.

| | 뜻 | 표기 | 예: 환자 찾기 | 예: 스팸 찾기 |
|---|---|---|---|---|
| **양성** | 찾으려는 대상 | 1 | 환자 | 스팸 메일 |
| **음성** | 찾으려는 대상이 아닌 것 | 0 | 정상 | 정상 메일 |

```python
# 찾으려는 대상이 positive 대상이 됌(문제가 있는 것을 찾음=이진분류)
```

"양성"은 좋다·나쁘다가 아니라 **찾으려는 쪽**이라는 뜻이다. 그래서 문제가 있는 쪽(환자, 스팸, 사기)이 보통 양성이 된다.

## 정확도 (Accuracy)

분류 문제의 대표 평가지표다.

$$
\text{정확도} = \frac{\text{맞게 예측한 건수}}{\text{전체 예측 건수}}
$$

`accuracy_score(정답, 모델예측값)`으로 계산한다.

```python
# 파라미터는 항상_동일
```

scikit-learn의 분류 평가 함수는 모두 `(정답, 예측값)` 순서로 받는다.

### 정확도의 한계

- 전체를 기준으로 평가하기 때문에 **클래스별 성능을 알 수 없다**
- 이진 분류에서 양성만의 성능, 음성만의 성능을 따로 볼 수 없다
- 특히 **불균형 데이터**에서 정확도만으로는 성능을 판단하기 어렵다. 양성:음성이 1:9인 데이터에서 모두 음성이라고 예측해도 정확도가 90%다

```python
# 개별적인 클래스의 정확도는 알 수가 없음
```

### MNIST 데이터셋으로 확인하기

> **MNIST**: 미국 국립표준연구소(NIST)가 수집한 손글씨 숫자(0~9) 데이터셋을 수정한 이미지 데이터셋이다. 원본은 28×28 크기에 train 60,000장, test 10,000장이고, scikit-learn은 8×8 크기 축소판을 제공한다.

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits

digits = load_digits()
X = digits.data
y = digits.target

X.shape, y.shape, X.dtype
```

```text
((1797, 64), (1797,), dtype('float64'))
```

feature는 64개 픽셀이다.

```python
digits.feature_names[:10]
```

```text
['pixel_0_0', 'pixel_0_1', 'pixel_0_2', 'pixel_0_3', 'pixel_0_4', 'pixel_0_5', 'pixel_0_6', 'pixel_0_7', 'pixel_1_0', 'pixel_1_1']
```

```python
digits.target_names
```

```text
array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
```

```python
X[10]
```

```text
array([ 0.,  0.,  1.,  9., 15., 11.,  0.,  0.,  0.,  0., 11., 16.,  8.,
       14.,  6.,  0.,  0.,  2., 16., 10.,  0.,  9.,  9.,  0.,  0.,  1.,
       16.,  4.,  0.,  8.,  8.,  0.,  0.,  4., 16.,  4.,  0.,  8.,  8.,
        0.,  0.,  1., 16.,  5.,  1., 11.,  3.,  0.,  0.,  0., 12., 12.,
       10., 10.,  0.,  0.,  0.,  0.,  1., 10., 13.,  3.,  0.,  0.])
```

```python
# y의 클래스(고유값), 개수 조회
np.unique(y, return_counts=True)
```

```text
(array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), array([178, 182, 177, 183, 181, 182, 181, 179, 174, 180]))
```

이미지 한 장은 64개 값이 1차원으로 펼쳐져 있다. 8×8로 다시 접으면 숫자 모양이 보인다.

```python
# X(image)를 2차원(image 형태)로 reshape
print(y[1])
X[1].reshape(8, 8) #pixcel값: 색의 농도 0:농도 -0, 최댓값(15): 농도 최대치
# 회색조(흑백) 0: 흑, 15:백
```

```text
1
```

```text
array([[ 0.,  0.,  0., 12., 13.,  5.,  0.,  0.],
       [ 0.,  0.,  0., 11., 16.,  9.,  0.,  0.],
       [ 0.,  0.,  3., 15., 16.,  6.,  0.,  0.],
       [ 0.,  7., 15., 16., 16.,  2.,  0.,  0.],
       [ 0.,  0.,  1., 16., 16.,  3.,  0.,  0.],
       [ 0.,  0.,  1., 16., 16.,  6.,  0.,  0.],
       [ 0.,  0.,  1., 16., 16.,  6.,  0.,  0.],
       [ 0.,  0.,  0., 11., 16., 10.,  0.,  0.]])
```

> **보충** 이 데이터의 픽셀 값은 0~16 범위다. `cmap='gray'`로 그리면 0이 검정, 최댓값이 흰색이 된다.

```python
# 모델은 픽셀값을 주고, 예측모델을 학습
```

```python
# image 확인
img_index = 0  # 확인할 image index
plt.figure(figsize=(2, 2))
img = X[img_index].reshape(8, 8)
plt.imshow(img, cmap='gray')  # imshow(): image 출력 함수. cmap="gray": grayscale color map으로 최소값: black ~ 최대값: white 로 출력.
plt.title(y[img_index])
plt.axis('off')
plt.show()
```

![그래프 출력](/images/ml/ml-metrics-1.png)

### 불균형 데이터셋으로 만들기

0~9를 분류하는 문제를 **"이 숫자가 9인가?"** 를 묻는 이진 분류로 바꾼다.

- Positive(1): 9
- Negative(0): 0~8

```python
y = np.where(y==9, 1, 0) # True: y==9는 1로, False=0으로 치환
```

```python
v = np.unique(y, return_counts=True)
print(v)
print(v[1]/y.size)
```

```text
(array([0, 1]), array([1617,  180]))
[0.89983306 0.10016694]
```

음성 90%, 양성 10%인 불균형 데이터가 됐다. 학습 없이 **모두 0(9가 아님)** 이라고 답하면 어떻게 될까.

```python
# 모든 값을 0(다수 클래스)로 예측 하면?
y_hat = np.zeros_like(y) # 값은 0으로 다 채움
```

```python
# 정확도 평가
# y와 y_hat을 비교
from sklearn.metrics import accuracy_score
accuracy_score(y, y_hat)
```

```text
0.8998330550918197
```

9를 하나도 찾지 못하는 "모델"인데 정확도가 약 0.9다. 정확도만 봐서는 안 되는 이유다.

## 혼동 행렬(Confusion Matrix)

- 실제 값(정답)과 예측 값을 표로 만든 평가표. 몇 개나 맞고 틀렸는지 확인한다
- `confusion_matrix(정답, 모델예측값)`
- **0번 축**: 실제(정답) class, **1번 축**: 예측 class, **값**: 개수

```python
# 모델이 어떤 라벨을 어떤 라벨로 헷갈려는지
```

![혼동행렬의 TN, FP, FN, TP 위치](/images/ml/fig-confusion-matrix.png)

```python
# 예측은 1, 실제 0값이 나왔을 경우 NP
# 예측은 1, 실제 1값이 나왔을 경우 TP
# 예측은 0, 실제 0값이 나왔을 경우 TN
# 예측은 0, 실제 1값이 나왔을 경우 FN
```

> **보충** 첫 줄의 `NP`는 **FP**(False Positive)다. 이름 읽는 법을 알면 헷갈리지 않는다. 뒤 글자(P/N)는 **모델이 예측한 것**, 앞 글자(T/F)는 **그 예측이 맞았는지**다. FP는 "양성이라고 예측했는데(P) 틀렸다(F)", 즉 실제로는 음성이다.

| | 뜻 |
|---|---|
| **TP** (True Positive) | 양성으로 예측했는데 맞음 |
| **TN** (True Negative) | 음성으로 예측했는데 맞음 |
| **FP** (False Positive) | 양성으로 예측했는데 틀림. 음성을 양성으로 예측 |
| **FN** (False Negative) | 음성으로 예측했는데 틀림. 양성을 음성으로 예측 |

## 이진 분류 평가지표

![혼동행렬로 계산하는 평가지표](/images/ml/fig-metrics-table.png)

**정확도**는 전체 중 맞게 예측한 비율로, 이진 분류뿐 아니라 모든 분류의 기본 평가 방식이다.

### 양성(Positive) 예측력 지표

**재현율(Recall) / 민감도(Sensitivity)**: 실제 양성 중 양성으로 예측한 비율. **TPR**(True Positive Rate)이라고도 한다.

$$
\text{Recall} = \frac{TP}{TP + FN}
$$

예: 실제 스팸 중 스팸으로 잡아낸 비율, 실제 금융사기 중 사기로 잡아낸 비율

```python
# 재현률/민감도 = True positive rate = TPR = 정답이 Postive인걸 모델이 얼마나 잘 맞췄는지에 대한 점수
# 예시 스팸메일 1000개 중 실제 스팸메일이 500개 그 중에 500개를 맞췄으면=> 1/1
```

**정밀도(Precision)**: 양성으로 예측한 것 중 실제 양성인 비율. **PPV**(Positive Predictive Value)라고도 한다.

$$
\text{Precision} = \frac{TP}{TP + FP}
$$

예: 스팸으로 분류한 메일 중 진짜 스팸의 비율

```python
# PPR = Positive Predictive Value
# 정밀도 = 모델이 Positive로 예측한것 중 Positive인 것
# 예시 스팸메일 1000개 중 모델이 스팸메일이 800개라고 예측했음 => 그중에서 500개를 맞췄으면 5/8
```

> **보충** 약자는 **PPV**다. 두 예시를 이어 보면 차이가 선명하다. 실제 스팸이 500개인데 모델이 800개를 스팸이라고 해서 그중 500개를 맞혔다면, 스팸은 다 잡았으니 **재현율 500/500 = 1.0**이고, 스팸이라고 한 것 중 300개는 정상 메일이었으니 **정밀도 500/800 = 0.625**다. 재현율은 **정답 기준**(실제 양성 중), 정밀도는 **예측 기준**(양성이라고 한 것 중)이다.

**F1 점수**: 정밀도와 재현율의 **조화평균**이다. 둘이 비슷할수록 높고, 한쪽만 높으면 낮게 나온다. F1이 높다는 건 둘 다 고르게 좋다는 뜻이다.

$$
F1 = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}
$$

```python
#  F1= TPR + PPR 이 조합평균을 낸것이 F1 스코어
```

> **보충** 더한 값이 아니라 **조화평균**이다. 산술평균이면 정밀도 1.0, 재현율 0.0일 때 0.5가 나오지만, 조화평균은 0이 된다. 한쪽이 무너지면 점수도 무너지게 만든 지표다.

### 음성(Negative) 예측력 지표

- **특이도(Specificity)**: 실제 음성 중 음성으로 맞게 예측한 비율. **TNR**(True Negative Rate)
- **위양성률(Fall-out)**: 실제 음성 중 양성으로 잘못 예측한 비율. `1 - 특이도`. **FPR**(False Positive Rate)

$$
\text{FPR} = \frac{FP}{TN + FP}
$$

## 평가 함수

| 함수 | 반환 |
|---|---|
| `confusion_matrix(y, pred)` | 혼동행렬. `ConfusionMatrixDisplay`로 시각화 |
| `recall_score(y, pred)` | 재현율 (TPR) |
| `precision_score(y, pred)` | 정밀도 (PPV) |
| `f1_score(y, pred)` | F1 점수 |
| `classification_report(y, pred)` | 클래스별 recall, precision, f1과 accuracy를 문자열로 |

재현율과 정밀도를 시험 점수에 빗대 적어 둔 메모도 있다.

```python
# 실제 시험 점수 100점 만점 80점 8/10 "실제 시험 점수 중 내가 몇점을 맞았지?"
```

```python
# 실제 시험 점수를 예측, 얼마나 똑같은지 90점 나올거 같음 80점 8/9 "90점이라고 했는데 그 중에 내 점수는 몇점이지?"
```

**재현율은 "실제 정답 중 몇 개를 맞혔나"**, **정밀도는 "내가 맞다고 한 것 중 몇 개가 진짜인가"** 라는 질문 구조를 시험에 옮긴 것이다.

### 다중 분류에서 recall / precision / f1

이 셋은 원래 이진 분류 지표다. 다중 분류에 쓰려면 `average` 파라미터를 지정한다.

| `average` | 계산 방식 |
|---|---|
| `"binary"` (기본) | 이진 분류만 평가 |
| `"micro"` | 클래스 구분 없이 전체 기준으로 계산. 다중 분류에서는 정확도와 같다 |
| `"macro"` | 클래스별로 계산한 뒤 평균 |
| `"weighted"` | 클래스별로 계산한 뒤 데이터 수에 따라 가중 평균 |

```python
from sklearn.metrics import (
        confusion_matrix,
        ConfusionMatrixDisplay, # confusion matrix 시각화클래스
        accuracy_score,
        recall_score,
        precision_score,
        f1_score,
        classification_report
) #여러줄에 걸쳐서 할 때 () 묶어줌
```

## 모델로 학습해서 평가하기

`DecisionTreeClassifier`와 `RandomForestClassifier`로 "9인가"를 학습시켜 평가한다.

```python
# RandomForestClassifier(앙상블 모델) = DecisionTreeClassifier 多
# 성능이 더 우수함
```

```python
# X, y-MNIST 9와 나머지를 분류
# 9 (1-pos), 나머지(0-neg)
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, test_size=0.25, random_state=0)
X_train.shape, X_test.shape
```

```text
((1347, 64), (450, 64))
```

### DecisionTree

```python
##### DecisionTreeClassifier
from sklearn.tree import DecisionTreeClassifier

# 모델 생성
tree = DecisionTreeClassifier(max_depth=3, random_state=0)

# 학습
tree.fit(X_train, y_train)

# 추론
pred_train_tree = tree.predict(X_train)
pred_test_tree = tree.predict(X_test)
```

> **보충** 노트북에는 `random_state`가 없어서 실행할 때마다 결과가 조금씩 달라질 수 있다. 재현을 위해 `random_state=0`을 추가했다.

```python
# Confusion Matrix
cm_train = confusion_matrix(y_train, pred_train_tree)
cm_test =  confusion_matrix(y_test, pred_test_tree)

print(f"train set\n{cm_train}")
print("-"* 20)
print(f"test set\n{cm_test}")
```

```text
train set
[[1167   45]
 [  27  108]]
--------------------
test set
[[394  11]
 [ 11  34]]
```

`ConfusionMatrixDisplay`로 그림을 그린다. 두 개를 나란히 놓으려고 subplot을 썼다.

```python
# 시각화 - matplotlib 를 이용해 plotting
import matplotlib.pyplot as plt

fig = plt.figure(figsize=(10, 5))
ax1 = fig.add_subplot(1, 2, 1)
ax2 = fig.add_subplot(1, 2, 2)

disp_train = ConfusionMatrixDisplay(
    cm_train, #confusion matrix
    display_labels=['Not 9', '9']       # [음성레이블, 양성레이블]
)
disp_train.plot(cmap='Blues', ax=ax1)    # 출력

disp_test = ConfusionMatrixDisplay(
    cm_test, #confusion matrix
    display_labels=['Not 9', '9'])
disp_test.plot(cmap='pink', ax=ax2)

ax1.set_title("Train set Confusion Matrix")
ax2.set_title("Test set Confusion Matrix")
plt.tight_layout()
plt.show()
```

![그래프 출력](/images/ml/ml-metrics-2.png)

지표별로 계산한다.

```python
# 정확도
print("DecisionTree 정확도(Accuracy)")
print(f"Trainset : {accuracy_score(y_train, pred_train_tree)}, Testset: {accuracy_score(y_test, pred_test_tree)}")
```

```text
DecisionTree 정확도(Accuracy)
Trainset : 0.9465478841870824, Testset: 0.9511111111111111
```

```python
print("DecsionTree 정밀도(Precision) - 1기준")
print(f"Trainset : {precision_score(y_train, pred_train_tree)}, Testset: {precision_score(y_test, pred_test_tree)}")
```

```text
DecsionTree 정밀도(Precision) - 1기준
Trainset : 0.7058823529411765, Testset: 0.7555555555555555
```

```python
print("DecisionTree 재현율(Recall)")
print(f"Trainset : {recall_score(y_train, pred_train_tree)}, Testset: {recall_score(y_test, pred_test_tree)}")
```

```text
DecisionTree 재현율(Recall)
Trainset : 0.8, Testset: 0.7555555555555555
```

```python
print("DecisionTree F1 score")
print(f"Trainset : {f1_score(y_train, pred_train_tree)}, Testset: {f1_score(y_test, pred_test_tree)}")
```

```text
DecisionTree F1 score
Trainset : 0.75, Testset: 0.7555555555555555
```

정확도는 0.95 근처로 높지만, 9를 찾는 성능인 정밀도·재현율·F1은 0.7대다. 정확도가 가리고 있던 부분이다.

`classification_report`는 클래스별로 한 번에 보여 준다.

```python
print("---------------Train set Classification Report---------------")
print(classification_report(y_train, pred_train_tree))
```

```text
---------------Train set Classification Report---------------
              precision    recall  f1-score   support

           0       0.98      0.96      0.97      1212
           1       0.71      0.80      0.75       135

    accuracy                           0.95      1347
   macro avg       0.84      0.88      0.86      1347
weighted avg       0.95      0.95      0.95      1347
```

```python
# class => 0를 기준
# class => 1를 기준
```

```python
print("---------------Test set Classification Report---------------")
print(classification_report(y_test, pred_test_tree))
```

```text
---------------Test set Classification Report---------------
              precision    recall  f1-score   support

           0       0.97      0.97      0.97       405
           1       0.76      0.76      0.76        45

    accuracy                           0.95       450
   macro avg       0.86      0.86      0.86       450
weighted avg       0.95      0.95      0.95       450
```

0번 줄은 "9가 아님"을 양성으로 놓고 계산한 값, 1번 줄은 "9"를 양성으로 놓고 계산한 값이다. 우리가 찾으려는 건 1번 줄이다. `macro avg`는 두 줄의 단순 평균, `weighted avg`는 데이터 수(support)로 가중한 평균이라 다수 클래스인 0에 끌려가 높게 나온다.

### RandomForest

```python
###### RandomForestClassifier
from sklearn.ensemble import RandomForestClassifier

# 모델 생성
rfc = RandomForestClassifier(n_estimators=200, max_depth=6, random_state=0) #n_estimators = Decision tree 200개 만듦

# 학습
rfc.fit(X_train, y_train)

## 추론
pred_train_rfc = rfc.predict(X_train)
pred_test_rfc =  rfc.predict(X_test)
```

```python
# Confusion Matrix
cm_train_rfc = confusion_matrix(y_train, pred_train_rfc)
cm_train_rfc
```

```text
array([[1212,    0],
       [   7,  128]])
```

```python
## Confusion Matrix Display
# 시각화 - matplotlib 를 이용해 plotting
### Trainset Confusion Matrix만 시각화.
cm_display2 = ConfusionMatrixDisplay(cm_train_rfc, display_labels=["9 이외 숫자", "9"]) # 객체생성할때, 어떤 값을 넣을지
cm_display2.plot(cmap="Greens") # plot => 그림의 옵션 어떤색, 등
plt.title("Random Forest Train set", fontsize=20) # 그릴 때, 타이틀 붙임/plt.으로 추가적으로 설정가능
plt.show()
```

![그래프 출력](/images/ml/ml-metrics-3.png)

## 평가 모듈 만들기: metrics.py

test set 지표를 구하려니 같은 코드를 또 써야 한다. 수업에서는 평가 함수들을 `metrics.py` 파일로 모아 모듈로 만들었다. 노트북에서 `%%writefile metrics.py`로 파일을 쓰고, 기능을 늘려 가며 버전을 1.0 → 1.1 → 1.2로 올렸다. 아래는 최종 1.2 버전이다.

```python
###### 평가 모듈 -> 다양한 평가지표들을 계산/출력하는 함수들가지는 모듈
import matplotlib.pyplot as plt
from sklearn.metrics import (confusion_matrix, ConfusionMatrixDisplay,
                             recall_score, precision_score, f1_score, accuracy_score,
                             PrecisionRecallDisplay, average_precision_score, precision_recall_curve,
                             RocCurveDisplay, roc_auc_score, roc_curve,
                             mean_squared_error, root_mean_squared_error, r2_score)

__version__ = 1.2

def plot_precision_recall_curve(y_proba, pred_proba, estimator_name=None, title=None):
    """Precision Recall Curve 시각화 함수"""
    # ap score 계산
    ap_score = average_precision_score(y_proba, pred_proba)
    # thresh 변화에 따른 precision, recall 값들 계산.
    precision, recall, _ = precision_recall_curve(y_proba, pred_proba)
    # 시각화
    disp = PrecisionRecallDisplay(
        precision, recall,
        average_precision=ap_score,
        estimator_name=estimator_name
    )
    disp.plot()
    if title:
        plt.title(title)
    plt.show()

def plot_roc_curve(y_proba, pred_proba, estimator_name=None, title=None):
    """ROC Curve 시각화"""
    ## ROC-AUC score 계산
    auc_score = roc_auc_score(y_proba, pred_proba)
    ## Thresh 변화에 따른 TPR(Recall) 과 FPR(위양성율) 계산
    fpr, tpr, _ = roc_curve(y_proba, pred_proba)
    ### 시각화
    disp = RocCurveDisplay(
        fpr=fpr, tpr=tpr,
        estimator_name=estimator_name,
        roc_auc=auc_score
    )
    disp.plot()
    if title:
        plt.title(title)
    plt.show()

def plot_confusion_matrix(y, pred, title=None):
    """Confusion matrix 시각화 함수"""
    cm = confusion_matrix(y, pred)
    disp = ConfusionMatrixDisplay(cm)
    disp.plot(cmap="Blues")
    if title:
        plt.title(title)
    plt.show()

def print_binary_classification_metrics(y, pred, proba=None, title=None):
    """정확도, 재현율, 정밀도, f1 점수를 계산해서 출력하는 함수
    만약 모델이 추정한 양성의 확률을 전달 받은 경우 average_precision과  roc-auc score도 출력"""
    if title:
        print(title)
    print("정확도:", accuracy_score(y, pred))
    print("재현율:", recall_score(y, pred))
    print("정밀도:", precision_score(y, pred))
    print("F1 점수:", f1_score(y, pred))
    if proba is not None:
        print("Average Precision:", average_precision_score(y, proba))
        print("ROC-AUC Score:", roc_auc_score(y, proba))

def print_regression_metrcis(y, pred, title=None):
    """회귀 평가지표를 출력하는 함수"""
    if title:
        print(title)
    print("MSE:", mean_squared_error(y, pred))
    print("RMSE:", root_mean_squared_error(y, pred))
    print("R Squared:", r2_score(y, pred))
```

*(docstring의 Args 설명은 길어서 줄였다.)*

```python
import metrics
from metrics import plot_confusion_matrix, print_binary_classification_metrics
```

```python
metrics.__version__
```

```text
1.2
```

> **보충** 버전을 올리면서 `print_binary_classification_metrics(y, pred, title=None)`이 `(y, pred, proba=None, title=None)`으로 바뀌었다. 1.0 시절처럼 `print_binary_classification_metrics(y_train, pred, "제목")`으로 부르면 제목 문자열이 `proba` 자리로 들어가 에러가 난다. 그래서 아래에서는 `title=`을 이름으로 넘긴다. 함수에 매개변수를 추가할 때는 **맨 뒤에 붙여야** 기존 호출이 깨지지 않는다. 회귀 함수 이름의 `metrcis`는 `metrics` 오타인데, 모듈 안의 이름과 부르는 이름이 같아서 동작은 한다.

```python
###RandomForest 모델 추론 결과
print_binary_classification_metrics(y_train, pred_train_rfc, title="RandomForest Trainset")
```

```text
RandomForest Trainset
정확도: 0.9948032665181886
재현율: 0.9481481481481482
정밀도: 1.0
F1 점수: 0.973384030418251
```

```python
print_binary_classification_metrics(y_test, pred_test_rfc, title="RandomForest Testset")
```

```text
RandomForest Testset
정확도: 0.9644444444444444
재현율: 0.6444444444444445
정밀도: 1.0
F1 점수: 0.7837837837837838
```

test set에서 **정밀도는 1.0인데 재현율은 0.6대**다. 9라고 한 건 다 맞았지만, 실제 9 중 3분의 1 이상을 놓쳤다는 뜻이다.

```python
plot_confusion_matrix(y_train, pred_train_rfc, "Trainset")
```

![그래프 출력](/images/ml/ml-metrics-4.png)

```python
plot_confusion_matrix(y_test, pred_test_rfc, "Testset")
```

![그래프 출력](/images/ml/ml-metrics-5.png)

## 재현율과 정밀도의 관계

분류는 업무에 따라 **정밀도가 중요한 경우**와 **재현율이 중요한 경우**가 있다.

```python
# 업무에 따라 정밀도, 재현율의 중요도가 다름
```

| | 재현율이 더 중요 | 정밀도가 더 중요 |
|---|---|---|
| 피해가 큰 실수 | 실제 양성을 음성으로 판단 (**FN**) | 실제 음성을 양성으로 판단 (**FP**) |
| 낮춰야 하는 것 | FN | FP |
| 예 | 암 환자 판정, 보험 사기 적발 | 스팸 메일 판정 |

암 환자를 정상으로 판정하면 치료 시기를 놓친다. 반대로 중요한 업무 메일을 스팸함으로 보내면 더 곤란하다.

### 분류 모델의 추론 메소드

- `model.predict(X)`: X의 class를 반환
- `model.predict_proba(X)`: X의 **class별 확률**을 반환

```python
rfc.predict_proba(X_test[:3])
# [0.95448565=> 0일 확률, 0.04551435=>1일 확률]
# 클래스 별 확률
# 0일 확률이 높기 때문에 해당 클래스는 0임
```

```text
array([[0.95448565, 0.04551435],
       [0.99599608, 0.00400392],
       [0.89573818, 0.10426182]])
```

## 임계값(Threshold) 변경으로 재현율·정밀도 조정하기

- 분류 모델은 class별 **확률**을 예측하고, 확률이 높은 class를 답으로 정한다
- 이진 분류에서는 **양성일 확률**이 **임계값**(기본 0.5)을 넘으면 양성, 아니면 음성으로 정한다. 이 작업은 **결과 후처리**에서 한다
- 임계값을 바꾸면 재현율과 정밀도가 바뀐다. 단 **하나가 오르면 다른 하나는 떨어진다**
- 그래서 한쪽 점수를 높이려고 임계값을 극단적으로 바꾸면 안 된다. 환자 예측에서 재현율을 너무 올리면 걸핏하면 정상인을 환자로 판정하게 된다

![임계값보다 양성 확률이 높으면 Positive로 예측](/images/ml/fig-threshold.png)

이 부분은 메모가 길다.

```python
# 정밀도, 재현률의 중요도 판단 후 => 더 이상 평가지표를 올릴 수 없을 경우 후처리를 함
# ex) 정밀도를 높이고 싶은 해당 피쳐의 라벨(정답)의 확률를 높임
# 임계점을 기준으로 낮으면 0, 높으면 1로 수정 (임계점의 디폴트 0.5)
# 후처리란 기본(0.5)인 임계점을 수정함
# 임계점을 낮출 경우 Positive 예측이 늘어남 => 정밀도가 낮아짐, 재현률이 올라감
# 임계점을 높일 경우 Positive 예측이 줄어듬 => 정밀도가 올라감, 재현률이 낮아짐

# 예) 0.5 -> 0.2으로 낮출 때 스팸일 확률이 20%만 되어도 다 스팸(1)으로 처리 (Positive 예측 증가) (negative 감소)
# 재현율(Recall) 상승 ⬆️: 그물망을 촘촘하게 던지는 꼴이라 실제 스팸을 거의 다 잡아냅니다. (놓치는 게 줄어듦)
# 정밀도(Precision) 하락 ⬇️: 대충 의심되면 다 스팸이라고 뱉었으니, 그중에는 정상 메일이 대거 섞여 있어 정답률(정밀도)은 낮아짐

# FP + TP  늘어남 #FP이 늘어나며 Precision 감소함
# FN + TF  줄어듬 #FN이 줄어들며 recall 증가함 (답기준이 약해져서 정답은 많이 맞추나 정밀도는 낮아짐)


# 예) 0.5 -> 0.8으로 올릴 때 스팸일 확률이 80%는 되어야 스팸(1)으로 인정 (Positive 예측 감소) (negative 증가)
# 정밀도(Precision) 상승 ⬆️: 확실한 놈들만 1이라고 골라냈기 때문에, 모델이 1이라고 뱉은 것들 중 진짜 정답일 확률(정밀도)은 아주 높아집니다.
# 재현율(Recall) 하락 ⬇️: 너무 깐깐하게 구느라 스팸일 확률이 70%인 애매한 스팸 메일들은 다 놓쳐버리게 됩니다.


# FP + TP  줄어듬 #FP이 줄어들며 Precision 증가함
# FN + TF  늘어남 #FN이 늘어나며 recall 감소감 (답기준이 높아져서 정답은 틀리나 정밀도는 높아짐)


## 결론 : 후처리로는 하나의 스코어 정밀도 혹은 재현률 밖에 올리지 못함 하나는 낮아짐
```

> **보충** `TF`는 **TN**이다. 정리하면 임계값을 낮추면 양성 예측(TP+FP)이 늘어 FP가 많아지니 정밀도가 떨어지고, 음성 예측(TN+FN)이 줄어 FN이 적어지니 재현율이 오른다. 엄밀히는 임계값을 내려도 정밀도가 잠깐 오를 때가 있어서 항상 반대로 움직이는 건 아니지만, 큰 흐름은 메모대로 반비례다.

정리하면:

- **임계값을 낮추면 재현율은 올라가고 정밀도는 낮아진다**
- **임계값을 높이면 재현율은 낮아지고 정밀도는 올라간다**
- 임계값을 바꿀 때 재현율과 **위양성률(FPR)** 은 같은 방향으로 움직인다

### 임계값을 바꿔서 예측하기

```python
# 각 클래스별 확률을 알려줌 예시) 아이리스꽃 품종 0, 1, 2 각각의 확률을 알려줌
```

DecisionTree의 양성 확률을 꺼내 임계값 0.7로 다시 판정한다.

```python
# class 별 확률 조회
pred_tree_proba = tree.predict_proba(X_test)# [[0일확률, 1일확률]]
print(pred_tree_proba[:15]) # 확률로 알려줌
print("바뀌기 전", tree.predict(X_test)[:15])  # 정답 클래스

#1(양성) 일 확률만 조회
pred_tree_pos_proba  = pred_tree_proba[:, 1]
print("양성일 확률", pred_tree_pos_proba[:15]) #양성일 확률=Positive일 확률

# # 임계값 변경 (양성/음성을 나누는 기준이 되는 확률값.) ==> 0.1
thresh = 0.7 #임계점
pred_test_tree2 =  np.where(pred_tree_pos_proba >= thresh, 1, 0)
print("바뀐 확률의 정답", pred_test_tree2[:15])
```

```text
[[0.99173554 0.00826446]
 [0.98695652 0.01304348]
 [0.98695652 0.01304348]
 [0.98695652 0.01304348]
 [0.98695652 0.01304348]
 [0.98695652 0.01304348]
 [0.96       0.04      ]
 [0.98695652 0.01304348]
 [0.98695652 0.01304348]
 [0.98695652 0.01304348]
 [0.98695652 0.01304348]
 [0.98695652 0.01304348]
 [0.98695652 0.01304348]
 [0.25       0.75      ]
 [0.96610169 0.03389831]]
바뀌기 전 [0 0 0 0 0 0 0 0 0 0 0 0 0 1 0]
양성일 확률 [0.00826446 0.01304348 0.01304348 0.01304348 0.01304348 0.01304348
 0.04       0.01304348 0.01304348 0.01304348 0.01304348 0.01304348
 0.01304348 0.75       0.03389831]
바뀐 확률의 정답 [0 0 0 0 0 0 0 0 0 0 0 0 0 1 0]
```

```python
print_binary_classification_metrics(y_test, pred_test_tree, title="임계값: 0.5")
```

```text
임계값: 0.5
정확도: 0.9511111111111111
재현율: 0.7555555555555555
정밀도: 0.7555555555555555
F1 점수: 0.7555555555555555
```

```python
print_binary_classification_metrics(y_test, pred_test_tree2, title=f"임계값: {thresh}")
```

```text
임계값: 0.7
정확도: 0.9488888888888889
재현율: 0.6222222222222222
정밀도: 0.8235294117647058
F1 점수: 0.7088607594936709
```

임계값을 0.5에서 0.7로 올리자 정밀도는 오르고 재현율은 떨어졌다.

### 임계값 변화에 따른 recall / precision 확인

`precision_recall_curve(y_정답, positive_예측확률)`은 임계값을 바꿔 가며 계산한 `(precision 목록, recall 목록, threshold 목록)`을 돌려준다.

```python
# decision tree 모델, test set기준
from sklearn.metrics import precision_recall_curve

pos_proba_test = tree.predict_proba(X_test)[:, 1] #양성의 확률
precisions, recalls, thresholds = precision_recall_curve(y_test, pos_proba_test) # (정답, 양성일 **확률**) # 튜플로 3가지의 값을 줌
print(precisions.shape, recalls.shape, thresholds.shape)


thresholds = np.append(thresholds, 1)
print(precisions.shape, recalls.shape, thresholds.shape) # thresholds가 항상 하나씩 부족함 그래서 shape을 맞추기 위해 1을 추가
```

```text
(8,) (8,) (7,)
(8,) (8,) (8,)
```

> **보충** threshold가 하나 적은 이유는 마지막 점이 "재현율 0, 정밀도 1"이라는 **약속된 끝점**이라 대응하는 임계값이 없어서다. 표로 보려고 1을 붙였다.

```python
import pandas as pd
prc_df = pd.DataFrame({
    "threshold":thresholds,
    "recall": recalls,
    "precision": precisions
})
prc_df.set_index('threshold', inplace=True)
prc_df
# threshold가 커지면 precision이 올라가고 recall은 떨어진다.
# threshold가 작아지면 recall이 올라가고 precision은 떨어진다.
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>threshold</th><th>recall</th><th>precision</th></tr></thead><tbody><tr><th class="idx">0.008264462809917356</th><td>1.0</td><td>0.1</td></tr><tr><th class="idx">0.013043478260869565</th><td>0.977778</td><td>0.107579</td></tr><tr><th class="idx">0.03389830508474576</th><td>0.844444</td><td>0.431818</td></tr><tr><th class="idx">0.04</th><td>0.822222</td><td>0.513889</td></tr><tr><th class="idx">0.14925373134328357</th><td>0.822222</td><td>0.560606</td></tr><tr><th class="idx">0.5454545454545454</th><td>0.755556</td><td>0.755556</td></tr><tr><th class="idx">0.75</th><td>0.622222</td><td>0.823529</td></tr><tr><th class="idx">1.0</th><td>0.0</td><td>1.0</td></tr></tbody></table></div></div>

결정 트리는 깊이 3이라 리프가 8개 이하이고, 같은 리프에 떨어진 샘플은 확률이 같다. 그래서 임계값 후보도 몇 개뿐이다.

```python
prc_df.plot(marker='o');
```

![그래프 출력](/images/ml/ml-metrics-6.png)

## PR Curve와 AP Score

**PR Curve**(Precision Recall Curve, 정밀도-재현율 곡선)는 이진 분류 평가지표다.

- 임계값을 1 → 0으로 바꿔 가며 **X축에 재현율, Y축에 정밀도**를 놓고 선으로 그린다
- 재현율이 변할 때 정밀도가 어떻게 변하는지 보고, **양성에 대한 성능이 얼마나 강건한지** 평가한다
- **AP Score**(Average Precision)는 PR Curve 아래 면적을 하나의 숫자로 계산한 값이다. 높을수록 좋다

![PR 곡선과 AP(곡선 아래 면적)](/images/ml/fig-pr-curve.png)

```python
# AP=> precision_recall_curve => 정밀도, 민감도 반비례 그래프를 보여준 것
# 넓은 수록 스코어가 좋다
# why? 넓을 수록 정밀도의 점수, 민감도의 점수가 둘 다 크기 때문, 사각형은 될 수 없긴함
# 넓을 수록 positive(양성)을 맞추는 성능에 대해 강함
```

> **보충** "사각형은 될 수 없다"고 적었지만 이론상 완벽한 모델은 모든 양성의 확률이 모든 음성보다 높아서, 재현율이 1이 될 때까지 정밀도 1을 유지하는 **사각형**(AP = 1.0)이 된다. 현실의 모델에서 보기 어려울 뿐이다.

```python
##### DecisionTree의 PrecisionRecall 커브 그리기 + AP Score 계산.
from sklearn.metrics import precision_recall_curve, PrecisionRecallDisplay, average_precision_score
import matplotlib.pyplot as plt

# precision_recall_curve 임계값을 바꿔가며 precision_recal 값을 찾아주는 함수
# PrecisionRecallDisplay 커브를 그려주는 함수
# average_precision_score ap스코어를 계산 해줌

# 모델이 추정한 positive 확률을 조회
test_proba_tree = tree.predict_proba(X_test)[:, 1]
test_proba_rfc = rfc.predict_proba(X_test)[:, 1]
```

```python
### ap score 로 모델을 평가
tree_ap = average_precision_score(y_test, test_proba_tree)  # (y정답, 모델이 예측한 양성일 확률)
rfc_ap = average_precision_score(y_test, test_proba_rfc)
print("DecisionTree Average Precision Score:", tree_ap)
print("RandomForest Average Precision Score:", rfc_ap) #랜덤포레스트로 학습시킨게 양성에 대해 더 강건함
```

```text
DecisionTree Average Precision Score: 0.6766948888666132
RandomForest Average Precision Score: 0.9447985949911246
```

```python
### 시각화
precisions1, recalls1, _ = precision_recall_curve(y_test, test_proba_tree) #디시젼트리
precisions2, recalls2, _ = precision_recall_curve(y_test, test_proba_rfc) #랜덤포레스트

### 하나의 Figure 두개 subplot으로 그리기.
fig = plt.figure(figsize=(12, 6))
ax1 = fig.add_subplot(1, 2, 1) # DecisionTree
ax2 = fig.add_subplot(1, 2, 2) # RandomForest


#DecisionTree 그래프

disp_tree = PrecisionRecallDisplay(  #PrecisionRecall Curve를 시각화하는 클래스
    precisions1, # precision값들
    recalls1,    # recall값들
    average_precision=tree_ap  # AP score
)
disp_tree.plot(ax=ax1) # 시각화


# RandomForest 그래프

disp_rfc = PrecisionRecallDisplay(
    precisions2,
    recalls2,
    average_precision=rfc_ap)
disp_rfc.plot(ax=ax2)


ax1.set_title("DecisionTree") #제목
ax2.set_title("Random Forest")
plt.show()
```

![그래프 출력](/images/ml/ml-metrics-7.png)

하나의 축에 겹쳐 그리면 비교가 더 쉽다.

```python
### 하나의 subplot에 같이 그리기.

precisions1, recalls1, _ = precision_recall_curve(y_test, test_proba_tree)
precisions2, recalls2, _ = precision_recall_curve(y_test, test_proba_rfc)

ax = plt.gca()

disp_tree = PrecisionRecallDisplay(
    precisions1,
    recalls1,
    average_precision=tree_ap,
    estimator_name="DecisionTree" # label 지정
)

disp_tree.plot(ax=ax)

disp_rfc = PrecisionRecallDisplay(
    precisions2,
    recalls2,
    average_precision=rfc_ap,
    estimator_name="Random Forest"
)
disp_rfc.plot(ax=ax)

plt.title("Precision Recall Curve")
plt.legend(bbox_to_anchor=(1,1), loc="upper left")
plt.show()
```

![그래프 출력](/images/ml/ml-metrics-8.png)

RandomForest의 곡선이 오른쪽 위로 붙어 있고 면적(AP)이 훨씬 넓다. 임계값을 어떻게 잡든 양성을 찾는 성능이 더 낫다는 뜻이다.

## ROC Curve와 ROC-AUC Score

먼저 두 지표를 다시 본다.

- **FPR(위양성률)**: 실제 음성 중 양성으로 잘못 예측한 비율. `1 - 특이도`. **낮을수록** 좋다. $\frac{FP}{TN+FP}$
- **TPR(재현율)**: 실제 양성 중 양성으로 맞게 예측한 비율. **높을수록** 좋다. $\frac{TP}{FN+TP}$
- 임계값을 바꾸면 **FPR과 TPR은 같은 방향으로** 변한다

**ROC Curve**(Receiver Operating Characteristic Curve)

- 임계값을 1 → 0으로 바꿔 가며 **X축에 FPR, Y축에 TPR**을 놓고 선으로 그린다
- FPR이 변할 때 TPR이 어떻게 변하는지 보고, **양성과 음성 모두**에 대한 성능의 강건함을 평가한다

**ROC-AUC Score**

- ROC Curve 아래 면적. 0~1 사이 값이고 클수록 좋다
- AUC가 크려면 FPR이 작을 때부터 TPR이 커야 한다. 음성은 덜 틀리고 양성은 많이 잡는다는 뜻이다

| ROC-AUC | 평가 |
|---|---|
| 0.9 ~ 1.0 | 아주 좋음 |
| 0.8 ~ 0.9 | 좋음 |
| 0.7 ~ 0.8 | 괜찮은 모델 |
| 0.6 ~ 0.7 | 의미는 있으나 좋은 모델은 아님 |
| 0.5 ~ 0.6 | 좋지 않은 모델 |

![ROC 곡선: A 완벽한 모델, B 좋은 모델, C 무작위 수준](/images/ml/fig-roc-curve.png)

가장 완벽한 점은 FPR 0, TPR 1인 왼쪽 위 모서리다. 대각선(C)은 동전 던지기 수준으로 AUC가 0.5다.

### ROC Curve와 PR Curve, 언제 무엇을 쓸까

둘 다 임계값을 바꿔 가며 평가하기 때문에, 특정 임계값 하나가 아니라 **모델의 전반적인 성능**을 본다. 이 점이 recall, precision, f1과 다르다.

- **ROC Curve / ROC-AUC**: 양성 탐지와 음성 탐지의 중요도가 비슷할 때
- **PR Curve / AP Score**: 양성 탐지가 음성보다 중요할 때 (암 환자 진단)

> **보충** 불균형 데이터에서는 ROC-AUC가 실제보다 좋아 보이는 경향이 있다. 음성이 아주 많으면 FP가 꽤 늘어도 FPR의 분모(TN+FP)가 커서 잘 움직이지 않기 때문이다. 아래 결과에서도 DecisionTree의 ROC-AUC(약 0.9, "아주 좋음" 경계)와 AP(약 0.68)가 꽤 차이 난다. 양성이 드문 문제라면 PR 곡선을 같이 보는 게 안전하다.

`roc_curve(y, 양성확률)`은 `(FPR, TPR, thresholds)`를, `roc_auc_score(y, 양성확률)`은 AUC 점수를 돌려준다.

```python
# 모델의 양성에 대한 확률
test_proba_tree = tree.predict_proba(X_test) [:, 1]
test_proba_rfc = rfc.predict_proba(X_test) [:, 1]
```

```python
from sklearn.metrics import roc_curve, RocCurveDisplay, roc_auc_score

#### roc-auc score 계산
tree_roc = roc_auc_score(y_test, test_proba_tree)
rfc_roc =roc_auc_score(y_test, test_proba_rfc)

print("Tree:", tree_roc)
print("RFC:", rfc_roc)
```

```text
Tree: 0.8975308641975308
RFC: 0.9876543209876543
```

```python
import pandas as pd
# threshold 변화에 따른 recall, fpr 값의 변화를 조회
fpr1, recall1, thresh1 = roc_curve(y_test, test_proba_tree)
fpr2, recall2, thresh2 = roc_curve(y_test, test_proba_rfc)

print(fpr1.shape, recall1.shape, thresh1.shape)

pd.DataFrame({
    "Thresh": thresh1,
    "FPR":fpr1,
    "Recall":recall1
})
```

```text
(8,) (8,) (8,)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 8행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Thresh</th><th>FPR</th><th>Recall</th></tr></thead><tbody><tr><th class="idx">0</th><td>inf</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">1</th><td>0.75</td><td>0.014815</td><td>0.622222</td></tr><tr><th class="idx">2</th><td>0.545455</td><td>0.02716</td><td>0.755556</td></tr><tr><th class="idx">3</th><td>0.149254</td><td>0.071605</td><td>0.822222</td></tr><tr><th class="idx">4</th><td>0.04</td><td>0.08642</td><td>0.822222</td></tr><tr><th class="idx">5</th><td>0.033898</td><td>0.123457</td><td>0.844444</td></tr><tr><th class="idx">6</th><td>0.013043</td><td>0.901235</td><td>0.977778</td></tr><tr><th class="idx">7</th><td>0.008264</td><td>1.0</td><td>1.0</td></tr></tbody></table></div></div>

임계값이 내려갈수록 FPR과 Recall이 함께 커진다. 첫 줄의 `inf`는 "아무것도 양성으로 예측하지 않는" 시작점이다.

```python
print(fpr2.shape, recall2.shape, thresh2.shape)

pd.DataFrame({
    "Thresh": thresh2,
    "FPR":fpr2,
    "Recall":recall2
})
```

```text
(20,) (20,) (20,)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 20행 × 3열 (앞뒤 6행씩 표시)</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Thresh</th><th>FPR</th><th>Recall</th></tr></thead><tbody><tr><th class="idx">0</th><td>inf</td><td>0.0</td><td>0.0</td></tr><tr><th class="idx">1</th><td>0.92395</td><td>0.0</td><td>0.022222</td></tr><tr><th class="idx">2</th><td>0.485836</td><td>0.0</td><td>0.711111</td></tr><tr><th class="idx">3</th><td>0.449962</td><td>0.002469</td><td>0.711111</td></tr><tr><th class="idx">4</th><td>0.352923</td><td>0.002469</td><td>0.777778</td></tr><tr><th class="idx">5</th><td>0.347556</td><td>0.004938</td><td>0.777778</td></tr><tr><td class="ellipsis" colspan="4">⋯</td></tr><tr><th class="idx">14</th><td>0.13443</td><td>0.069136</td><td>0.955556</td></tr><tr><th class="idx">15</th><td>0.107602</td><td>0.091358</td><td>0.955556</td></tr><tr><th class="idx">16</th><td>0.107054</td><td>0.091358</td><td>0.977778</td></tr><tr><th class="idx">17</th><td>0.043862</td><td>0.279012</td><td>0.977778</td></tr><tr><th class="idx">18</th><td>0.042758</td><td>0.279012</td><td>1.0</td></tr><tr><th class="idx">19</th><td>0.0</td><td>1.0</td><td>1.0</td></tr></tbody></table></div></div>

```python
# FPR = 위양성률, False, Positve => 정답이 negative 인데, 틀린 것.
# 양성으로 잘못 예측한 것
# 낮을 수록 좋음
# FP/ TN + FP
# 임계치가 낮아지면 => 높아짐
# 임계치가 높아지면 => 낮아짐
# 재현률과 비례관계
# 정밀도와 반비례관계
```

```python
# 시각화

ax = plt.gca()
ax.set_title("ROC-AUC Curve")
disp_roc_tree = RocCurveDisplay(
    fpr=fpr1, tpr=recall1,
    roc_auc=tree_roc,
    estimator_name="Decision Tree"
)
disp_roc_tree.plot(ax=ax)

disp_roc_rfc = RocCurveDisplay(
    fpr=fpr2, tpr=recall2,
    roc_auc=rfc_roc,
    estimator_name="Random Forest"
)
disp_roc_rfc.plot(ax=ax)

plt.show()
```

<div class="sql-result sql-result-warn"><div class="sql-result-meta">경고 · FutureWarning: `estimator_name` is deprecated in 1.7 and will be removed in 1.9. Use `name` instead.</div></div>

<div class="sql-result sql-result-warn"><div class="sql-result-meta">경고 · FutureWarning: `estimator_name` is deprecated in 1.7 and will be removed in 1.9. Use `name` instead.</div></div>

![그래프 출력](/images/ml/ml-metrics-9.png)

> **보충** 노트북에서도 같은 `FutureWarning`이 떴다. `estimator_name` 매개변수가 `name`으로 바뀌는 중이라, 새로 쓸 코드에서는 `RocCurveDisplay(..., name="Decision Tree")`처럼 쓰면 된다. `metrics.py`의 두 곡선 함수도 같은 이유로 `name=`으로 바꿔 두는 게 좋다.

## 실습: 유방암 데이터 모델링

수업 TODO로 위스콘신 유방암 데이터에 지금까지의 지표를 모두 적용했다.

1. breast cancer data 로딩
2. train/test set 분리
3. 모델링: `RandomForestClassifier(max_depth=2, n_estimators=200)`
4. 평가: accuracy, recall, precision, f1 score, confusion matrix, PR curve와 AP, ROC curve와 AUC

```python
from sklearn.datasets import load_breast_cancer
dataset = load_breast_cancer()
X, y = dataset['data'], dataset['target']
X.shape, y.shape
```

```text
((569, 30), (569,))
```

```python
# 데이터셋을 train/test set으로 분할
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=10)
```

```python
# 모델 Training
from sklearn.ensemble import RandomForestClassifier
#  모델생성
model = RandomForestClassifier(n_estimators=200, max_depth=2, random_state=10)
#  train(학습)
model.fit(X_train, y_train)
```

```text
RandomForestClassifier(max_depth=2, n_estimators=200, random_state=10)
```

```python
# 모델 평가
from sklearn.metrics import accuracy_score, recall_score, precision_score, f1_score, classification_report
# 평가
pred_train = model.predict(X_train)
pred_test = model.predict(X_test)

# 정확도
print(accuracy_score(y_train, pred_train), accuracy_score(y_test, pred_test))
# recall(재현율)
print(recall_score(y_train, pred_train), recall_score(y_test, pred_test))
# precision(정밀도)
print(precision_score(y_train, pred_train), precision_score(y_test, pred_test))
# f1 score
print(f1_score(y_train, pred_train), f1_score(y_test, pred_test))
print(classification_report(y_test, pred_test))
```

```text
0.9692307692307692 0.9122807017543859
0.9894736842105263 0.9305555555555556
0.962457337883959 0.9305555555555556
0.9757785467128027 0.9305555555555556
              precision    recall  f1-score   support

           0       0.88      0.88      0.88        42
           1       0.93      0.93      0.93        72

    accuracy                           0.91       114
   macro avg       0.91      0.91      0.91       114
weighted avg       0.91      0.91      0.91       114
```

> **보충** 노트북에서는 이 셀과 다음 셀에서 `ValueError`(feature 수, 샘플 수가 맞지 않음)가 났다. 앞에서 `X`, `pred_train` 같은 같은 이름의 변수를 다른 데이터로 덮어쓴 상태에서 셀을 실행했기 때문이다. 처음부터 순서대로 실행하면 정상 동작한다. 한 노트북에서 데이터셋을 바꿀 때는 변수 이름을 구분해 두는 게 안전하다.

```python
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
# test set의 Confusion Matrix
cm = confusion_matrix(y_test, pred_test)
disp = ConfusionMatrixDisplay(confusion_matrix=cm) # 객체생성: 평가점수들을 설정
disp.plot(cmap="Blues"); # 시각화관련(matplotlib) 설정.
```

![그래프 출력](/images/ml/ml-metrics-10.png)

```python
# Precision Recall Curve + Average Precision Score => 모델의 양성에 대한 전체적인 성능
from sklearn.metrics import precision_recall_curve, PrecisionRecallDisplay, average_precision_score

pred_test_proba = model.predict_proba(X_test)[:, 1]         # 양성일 확률
ap_score = average_precision_score(y_test, pred_test_proba) # (정답, 모델이 예측한 양성일 확률)
print("Average Precision Score:", ap_score)

precisions, recalls, thresholds = precision_recall_curve(y_test, pred_test_proba)
disp_pr = PrecisionRecallDisplay(
    precisions, recalls, average_precision=ap_score
)
disp_pr.plot();
```

```text
Average Precision Score: 0.9906744351695248
```

![그래프 출력](/images/ml/ml-metrics-11.png)

```python
# ROC-AUC Curve + ROC-AUC Score => 모델의 양성과 음성에 대한 전체적인 성능
from sklearn.metrics import roc_curve, RocCurveDisplay, roc_auc_score

roc_auc = roc_auc_score(y_test, pred_test_proba)
print("ROC-AUC Score:", roc_auc)

fprs, recalls, thresholds = roc_curve(y_test, pred_test_proba)
disp_roc = RocCurveDisplay(fpr=fprs, tpr=recalls, roc_auc=roc_auc)
disp_roc.plot();
```

```text
ROC-AUC Score: 0.9821428571428571
```

![그래프 출력](/images/ml/ml-metrics-12.png)

> **보충** 이 데이터의 target은 0이 악성(malignant), 1이 양성(benign)이다. scikit-learn은 **1을 Positive**로 계산하니, 위의 재현율은 "양성 종양을 얼마나 찾았나"다. 의료 맥락에서 정말 놓치면 안 되는 건 악성이니, 악성 기준 재현율을 보려면 `recall_score(y_test, pred_test, pos_label=0)`처럼 `pos_label`을 지정한다. 의학 용어 "양성 종양(benign)"과 평가지표의 "양성(Positive)"이 다른 개념이라는 것도 헷갈리기 쉬운 지점이다.

## 회귀(Regression) 평가지표

예측할 값(target)이 연속형 데이터인 지도학습이다.

### MSE (Mean Squared Error)

실제 값과 예측값의 차를 제곱해 평균 낸 것이다. `mean_squared_error()`, 교차검증 문자열은 `'neg_mean_squared_error'`.

$$
MSE = \frac{1}{n}\sum_{i=1}^{n}(y_i - \hat{y}_i)^2 \quad (y_i: \text{실제값},\ \hat{y}_i: \text{예측값})
$$

### RMSE (Root Mean Squared Error)

MSE는 오차를 제곱했기 때문에 실제 오차보다 큰 값이 나오고 단위도 제곱이다. 제곱근을 씌운 게 RMSE다. `root_mean_squared_error()`(1.4 버전에서 추가), 교차검증 문자열은 `'neg_root_mean_squared_error'`.

$$
RMSE = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(y_i - \hat{y}_i)^2}
$$

### R² (결정계수)

- feature(독립변수)들이 target(종속변수)을 **얼마나 설명하는지** 나타낸다
- **평균으로 예측했을 때의 오차보다 모델이 얼마나 나은지**를 비율로 계산한다
- 1에 가까울수록 좋다. `r2_score()`, 교차검증 문자열은 `'r2'`

$$
R^2 = \frac{\sum_{i=1}^{n}(\hat{y}_i-\bar{y})^2}{\sum_{i=1}^{n}(y_i - \bar{y})^2} \quad (\bar{y}: y\text{의 평균})
$$

```python
# MSE, RMSE => 오차 값
# R square => 평균 값
# y = 정답값
# y hat = 모델이 예측한 정답값
# y - = 정답값의 평균
# i = 각 행
```

> **보충** scikit-learn의 `r2_score()`는 위 식이 아니라 $R^2 = 1 - \frac{\sum(y_i-\hat{y}_i)^2}{\sum(y_i-\bar{y})^2}$로 계산한다. "평균으로 찍었을 때의 오차 중 모델이 줄인 비율"이다. 두 식은 선형 회귀를 학습 데이터에 평가할 때만 같고, 일반적으로는 다르다. 노트북 앞쪽 메모의 "R² < 0이면 평균보다 못하다"는 이 두 번째 식에서 나오는 성질이다. 위의 첫 번째 식은 음수가 될 수 없다.

```python
# acc = m.score ()
# 분류
# 회기
```

> **보충** 모델 객체의 `score(X, y)` 메소드는 분류 모델이면 **정확도**, 회귀 모델이면 **R²** 를 돌려준다. 메모의 "회기"는 회귀다.

### Dataset 생성 함수

> - `make_xxxxx()`: 머신러닝 학습용 가짜(dummy) 데이터셋을 원하는 설정으로 만들어 주는 함수
>   - `make_regression()`: 회귀용, `make_classification()`: 분류용
>
> **Noise란**: 같은 feature를 가진 데이터 포인트가 다른 label을 가지는 이유를 노이즈라고 한다. 지금은 그 이유를 모른다. 나이가 같은데 구매량이 다르다면 나이 외에 그 차이를 만드는 feature가 있는데 수집되지 않은 것이다. 그 feature를 찾으면 성능이 오르고, 못 찾으면 모르는 이유로 남아 성능이 떨어진다.

```python
## scikit-learn 제공 데이터셋 종류
# load_xxxxx : 실제 데이터셋. scikit-learn 설치시 같이 데이터파일 저장. # 데이터량이 작음 (이미 저장되어있음)
# fetch_xxxx : 실제 데이터셋. 처음 함수가 호출될 때 데이터파일을 다운로드. # 데이터량이 많음 (다운해야 함)
# make_xxxxx : 가짜 데이터셋을 생성하는 함수. 우리가 원하는 값들을 가지는 데이터를 생성할 때 사용.
```

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_regression  # 회귀문제용 데이터셋을 생성하는 함수
```

```python
X, y = make_regression(
     n_samples=1000,     # 총데이터개수(Data point)
     n_features=1,       # feature의 개수(컬럼수)
     n_informative=1,    # y(Label)에 영향을 주는 feature의 개수. n_features보다 크며 안됨.
     noise=30,           # 모델이 찾을 수 없는 값의 범위. 0 ~ noise 사이 랜덤한 실수 값이 noise로 설정됨.==> 인정할 수 있는 오차 범위.
     random_state=0
)

# 전처리할때, y값의 영향이 없는 피쳐는 빼버린다.
# n_features=1 , n_informative=1 y값에 영향을 주는 피쳐
# noise  = 회귀 데이터를 만들 때 실제 정답값 y에 인위적으로 추가하는 랜덤 오차
# 현실의 데이터는 완벽한 직선 관계를 따르지 않습니다.
# 같은 공부 시간을 가진 학생이라도 컨디션, 문제 난이도, 집중력 등의 영향으로 점수가 달라질 수 있습니다.
# 이러한 예측 불가능한 요소를 noise로 표현합니다.


# 컨디션, 문제 난이도, 집중력 등은 수집하지 못한 값이기 때문에 이런 것을 noise로 가상 설정해서 결과에 반영함
# 회기 데이터일 때 가능
# 부족한 상태에서 30정도면 ok

X.shape, y.shape
```

```text
((1000, 1), (1000,))
```

> **보충** `noise`는 "0 ~ noise 사이 랜덤 값"이 아니라, y에 더하는 **정규분포 오차의 표준편차**다. noise=30이면 평균 0, 표준편차 30인 오차가 붙는다. 그래서 아래에서 아무리 좋은 모델을 써도 RMSE가 30 근처 밑으로는 내려가기 어렵다.

```python
X[:5]
# 전저리 단계에서 어떤 피쳐가 y값에 영향을 줬는지 찾아야 함
```

```text
array([[-2.55298982],
       [ 1.76405235],
       [-1.79132755],
       [-1.2140774 ],
       [-1.4449402 ]])
```

```python
y[:5]
```

```text
array([-226.98542474,  165.24959267, -110.53873999,  -83.35797108,
       -125.77525151])
```

X와 y가 둘 다 연속형이니 산점도로 관계를 본다.

```python
###  X, y 관계를 시각화 (둘다 연속성(수치형) - 산점도, 점수: 상관계수)
plt.scatter(X.flatten(), y, alpha=0.5)
plt.show()
# x1 만 가지고 y값을 추측x 완벽한 선형관계를 이룰 수 없음.
# x2, x3도 필요
# ax+b = 선형회기모델
```

![그래프 출력](/images/ml/ml-metrics-13.png)

```python
# 상관계수  -1 ~ 1 (음수: 반비례, 양수: 비례). 1에 가까울수록 관계가 크다.
# df.corr() => pandas
np.corrcoef([X.flatten(), y])
```

```text
array([[1.        , 0.93856218],
       [0.93856218, 1.        ]])
```

상관계수 0.94로 강한 양의 관계다. 선형 회귀와 결정 트리로 학습해 비교한다.

```python
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression  # 직선의 방정식을 이용한 모델. (=선형회귀모델) ax+b
from sklearn.tree import DecisionTreeRegressor

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)
X_train.shape, X_test.shape
```

```text
((800, 1), (200, 1))
```

```python
# 모델링
lr = LinearRegression()
tree = DecisionTreeRegressor(max_depth=3, random_state=0)

#  학습
lr.fit(X_train, y_train)
tree.fit(X_train, y_train)
```

```text
DecisionTreeRegressor(max_depth=3, random_state=0)
```

```python
# 평가
## 추정 -> 회귀모델은 predict()로 추정. predict_proba()는 없다.(분류)
pred_train_lr = lr.predict(X_train) # 회기는 proba 확률은 없음
pred_test_lr = lr.predict(X_test)
```

```python
pred_train_tree = tree.predict(X_train)
pred_test_tree = tree.predict(X_test)
```

```python
from sklearn.metrics import mean_squared_error, root_mean_squared_error, r2_score
# 회귀 평가 - 평가함수(정답, 모델추정값)
print("LinearRegression  평가")
print("MSE:", mean_squared_error(y_train, pred_train_lr), mean_squared_error(y_test, pred_test_lr), sep=" , ")
print("RMSE:", root_mean_squared_error(y_train, pred_train_lr), root_mean_squared_error(y_test, pred_test_lr), sep=" , ")
print("R square(결정계수):", r2_score(y_train, pred_train_lr), r2_score(y_test, pred_test_lr), sep=" , ")
```

```text
LinearRegression  평가
MSE: , 899.6108311038803 , 832.1344100029423
RMSE: , 29.993513150411044 , 28.846740023838784
R square(결정계수): , 0.8826629445928171 , 0.8700578135014047
```

```python
print("Decision Tree 평가 결과")
print("MSE:", mean_squared_error(y_train, pred_train_tree), mean_squared_error(y_test, pred_test_tree), sep=" , ")
print("RMSE:", root_mean_squared_error(y_train, pred_train_tree), root_mean_squared_error(y_test, pred_test_tree), sep=" , ")
print("R square(결정계수):", r2_score(y_train, pred_train_tree), r2_score(y_test, pred_test_tree), sep=" , ")
```

```text
Decision Tree 평가 결과
MSE: , 999.7466989529054 , 1057.6377039774145
RMSE: , 31.61877130681876 , 32.521342284374036
R square(결정계수): , 0.8696021326641414 , 0.8348442822143439
```

선형 회귀의 RMSE가 약 29로, 넣어 준 노이즈 30과 거의 같다. 이 데이터에서 찾을 수 있는 건 다 찾았다는 뜻이다.

두 모델이 X에 따라 어떤 값을 예측하는지 그려 본다.

```python
np.linspace(-3.2, 3.2, 1000).reshape(-1, 1).shape
```

```text
(1000, 1)
```

```python
#############################################################
# LinearRegression, DecisionTree 모델이 추청한 결과를 시각화.
#############################################################
## 입력값을 생성
new_X = np.linspace(-3.2, 3.2, 1000).reshape(-1, 1) # 2차원 배열로 바꿈/그래프 그려야 하니까
new_y_lr = lr.predict(new_X)
new_y_tree = tree.predict(new_X)
```

```python
plt.figure(figsize=(8, 6))
plt.scatter(X, y, alpha=0.3)
plt.plot(new_X.flatten(), new_y_lr, label="LinearRegression", color="red", linewidth=3)
plt.plot(new_X.flatten(), new_y_tree, label="DecisionTree", color="greenyellow", linewidth=3)
plt.legend()
plt.show()

# X->y 를 예측할 때 최적의 선 = 선형회귀모델
# X->y 를 예측할 때 -1.6 ~ -1 사이일 때 동일하게 예측함 => 디시젼트리
```

![그래프 출력](/images/ml/ml-metrics-14.png)

> **보충** 노트북에서는 산점도 줄을 주석 처리해 두었는데, 데이터 위에 겹쳐 보면 차이가 더 잘 보여서 살렸다. 선형 회귀는 직선 하나, 결정 트리는 **계단**이다. 트리는 구간마다 같은 값을 예측하기 때문에, 깊이 3이면 계단이 최대 8칸이다.

```python
# 어떤 결과가 나왔고, 그 예측에 따른 어떤 점수가 나왔고 등을 이해할 수 있어야 함
```

## 실습: 보스턴 집값 데이터

수업 TODO다.

- `data/boston_dataset.csv` 로딩
- train/test 분리
- LinearRegression, DecisionTree(max_depth=3)
- MSE, RMSE, R²로 평가

> **보충** TODO에는 `DecisionTreeClassifier`라고 적혀 있었는데, 집값은 연속형이라 회귀용 `DecisionTreeRegressor`를 써야 한다. 실제 코드도 Regressor를 썼다.

```python
import pandas as pd

data = pd.read_csv("data/boston_dataset.csv")
data.shape
```

```text
(506, 14)
```

```python
# Dataset을 train/test set으로 분할
from sklearn.model_selection import train_test_split

y = data['MEDV']
X = data.drop(columns="MEDV")

X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=10) # test_size=0.25 (기본)
X_train.shape, X_test.shape
```

```text
((379, 13), (127, 13))
```

```python
# one-hot incodig 할 때, 0(더미 변수 - 제거), 1, 2, 3
# 통계학에서는 더미 변수 제거가 필수인데, 머신러닝 모델에서는 필수는 아님.
```

선형 회귀를 위해 스케일링한다. train으로만 `fit`한다.

```python
# 전처리
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

```python
# Decision tree외에는 StandardScaler 최적화를 해주는게 좋음
```

```python
# 모델링

# model 생성
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression

tree = DecisionTreeRegressor(max_depth=3, random_state=10)
lr = LinearRegression() # 특별한 파라미터는 없음
```

```python
# 모델 학습
tree.fit(X_train_scaled, y_train)
lr.fit(X_train_scaled, y_train)

pred_train_tree = tree.predict(X_train_scaled)
pred_test_tree = tree.predict(X_test_scaled)

pred_train_lr = lr.predict(X_train_scaled)
pred_test_lr = lr.predict(X_test_scaled)
```

노트북 마지막 셀에서 만들어 둔 `print_regression_metrcis`를 불러오려다 `ImportError`가 났다. 위에서 이미 `import metrics`를 한 뒤에 파일을 1.2로 고쳤기 때문에, 파이썬이 처음 불러온 1.1 버전을 그대로 들고 있었던 것이다. 모듈 파일을 고친 뒤에는 커널을 재시작하거나 `importlib.reload(metrics)`로 다시 불러와야 한다. 여기서는 처음부터 1.2를 불러왔으니 그대로 쓸 수 있다.

```python
from metrics import print_regression_metrcis
print_regression_metrcis(y_train, pred_train_tree, title="Decision Tree Trainset")
print_regression_metrcis(y_test, pred_test_tree, title="Decision Tree Testset")
```

```text
Decision Tree Trainset
MSE: 14.262591874672758
RMSE: 3.7765846839006216
R Squared: 0.816849418670005
Decision Tree Testset
MSE: 21.11234181874955
RMSE: 4.594816842785961
R Squared: 0.7882153262196152
```

```python
print_regression_metrcis(y_train, pred_train_lr, title="Linear Regression Trainset")
print_regression_metrcis(y_test, pred_test_lr, title="Linear Regression Testset")
```

```text
Linear Regression Trainset
MSE: 18.87900085091601
RMSE: 4.344997221048135
R Squared: 0.7575686094674801
Linear Regression Testset
MSE: 32.44253669600674
RMSE: 5.695835030617261
R Squared: 0.6745585065949402
```

이 분할에서는 깊이 3짜리 결정 트리가 선형 회귀보다 test 성능이 좋다. 선형 회귀는 train R² 0.76, test 0.67로 차이가 있는데, 집값과 feature 사이에 직선으로 표현되지 않는 관계가 있다는 신호다.

## 정리

- **정확도**는 불균형 데이터에서 성능을 속인다. 다수 클래스만 찍어도 높게 나온다
- **혼동행렬**의 TP, TN, FP, FN으로 지표를 계산한다. 뒤 글자는 예측, 앞 글자는 맞았는지
- **재현율** = 실제 양성 중 맞힌 비율(FN을 줄인다), **정밀도** = 양성이라고 한 것 중 진짜 비율(FP를 줄인다), **F1** = 둘의 조화평균
- **임계값**을 낮추면 재현율↑ 정밀도↓, 높이면 반대다. 업무에 따라 무엇을 우선할지 정한다
- **PR Curve/AP**는 양성 성능, **ROC Curve/AUC**는 양성·음성 전체 성능을 임계값과 무관하게 본다. 불균형 데이터에선 PR이 더 정직하다
- 회귀는 **MSE·RMSE**(오차, 낮을수록 좋음)와 **R²**(평균 대비 설명력, 1에 가까울수록 좋음)로 평가한다
- 반복해서 쓰는 평가 코드는 **모듈로 만들어** 재사용한다. 고친 모듈은 다시 불러와야 반영된다
