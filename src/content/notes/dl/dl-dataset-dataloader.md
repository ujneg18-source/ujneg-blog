---
title: "Dataset과 DataLoader: 데이터를 모델에 공급하기"
description: "torchvision 내장 데이터셋(MNIST, CIFAR10)과 transform(ToTensor, Normalize, Compose), DataLoader의 batch·shuffle·drop_last, __len__과 __getitem__으로 만드는 Custom Dataset, 메모리 데이터를 감싸는 TensorDataset, Subset과 random_split으로 train/validation 나누기까지 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '딥러닝'
seriesOrder: 6
originalNotebook: "06_Dataset과 DataLoader.ipynb"
tags: ["Python","PyTorch","Dataset","DataLoader","torchvision"]
date: 2026-06-09
---

> SKN31 딥러닝 과정 노트북 `06_Dataset과 DataLoader.ipynb`를 바탕으로 정리했습니다.
> 코드는 PyTorch 2.5, torchvision 0.20에서 실행한 결과입니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- torchvision 내장 데이터셋 불러오기: MNIST, CIFAR10
- `transform`으로 전처리: `ToTensor`, `Normalize`, `Resize`, `Compose`
- `DataLoader`: batch, shuffle, drop_last
- Custom Dataset 만들기: `__len__`, `__getitem__`
- `TensorDataset`: 메모리에 있는 데이터를 Dataset으로
- `Subset`, `random_split`으로 데이터셋 나누기

MNIST 글에서 `datasets.MNIST`와 `DataLoader`를 그냥 썼는데, 이번에는 이 둘이 어떻게 생겼는지, 내 데이터로는 어떻게 만드는지 본다.

## Built-in Dataset

- PyTorch는 분야별 공개 데이터셋을 `torchvision`(이미지), `torchtext`(텍스트), `torchaudio`(음성) 모듈로 제공한다
- 모든 내장 데이터셋은 [`torch.utils.data.Dataset`](https://pytorch.org/docs/stable/data.html#torch.utils.data.Dataset)의 하위 클래스다
  - [computer vision datasets](https://pytorch.org/vision/stable/datasets.html), [audio datasets](https://pytorch.org/audio/stable/datasets.html)

**주요 매개변수** (클래스마다 조금씩 다르다)

| 매개변수 | 내용 |
|---|---|
| `root` | 원본 데이터를 저장할 디렉토리 |
| `train` | True면 train set, False면 test set |
| `download` | True면 `root`에 데이터가 없을 때 인터넷에서 내려받는다. 이미 있으면 받지 않는다 |
| `transform` | 불러온 이미지를 변환하는 함수. 정규화나 데이터 증강(augmentation)을 한다 |

```python
import torch
from torchvision import datasets
from torchvision import transforms
from torch.utils.data import Dataset, DataLoader
```

```python
mnist_data_dir = "datasets"
mnist_trainset = datasets.MNIST(
    root=mnist_data_dir, # raw data의 위치.
    download=True,       # root에 지정한 경로에 없을 경우 다운받을지 여부
    train=True,          # True: train set, False: test set
)
```

```python
type(mnist_trainset)
```

```text
<class 'torchvision.datasets.mnist.MNIST'>
```

```python
mnist_trainset
```

```text
Dataset MNIST
    Number of datapoints: 60000
    Root location: datasets
    Split: Train
```

```python
# Dataset의 총 데이터개수를 조회 - len()
len(mnist_trainset)
```

```text
60000
```

```python
# 개별 데이터를 조회 -> indexing
mnist_trainset[0]  # 개별데이터는 x(input)과 y(output)로 구성되어 tuple(x,  y)로 반환된다.
```

```text
(<PIL.Image.Image image mode=L size=28x28 at 0xFC7D6654DAB0>, 5)
```

`transform`을 주지 않으면 이미지는 **PIL Image** 객체 그대로 나온다.

```python
# 첫번째 데이터 조회
x0 = mnist_trainset[0]

# 첫번째 데이터 label 확인
x0[1]
```

```text
5
```

### class index와 class name

```python
######################################################################
# Target class 값 조회
######################################################################
# class index(id) - class name
## class index(class id): 인코딩 된 label의 클래스,
## class name: 실제 class의 이름.
### 0-setosa 의 경우 0: class index, setosa: class name

mnist_trainset.class_to_idx
# dict: key-class name, value: class index
# class name으로 class index를 조회할 수있다.
```

```text
{'0 - zero': 0, '1 - one': 1, '2 - two': 2, '3 - three': 3, '4 - four': 4, '5 - five': 5, '6 - six': 6, '7 - seven': 7, '8 - eight': 8, '9 - nine': 9}
```

```python
mnist_trainset.classes
# list: index-class index, value-class name
# class index로 class 이름을 조회할 수 있다.
```

```text
['0 - zero', '1 - one', '2 - two', '3 - three', '4 - four', '5 - five', '6 - six', '7 - seven', '8 - eight', '9 - nine']
```

| 속성 | 타입 | 방향 |
|---|---|---|
| `class_to_idx` | dict | 이름 → index |
| `classes` | list | index → 이름 |

모델은 index(0, 1, 2…)로 예측하니, 사람이 볼 결과를 만들 때 `classes[예측 index]`로 이름을 꺼낸다.

## transform으로 데이터 전처리

- Dataset을 만들 때 **원본 데이터를 제공하기 전에 수행할 전처리**를 함수(callable)로 지정한다
- 이 함수는 **입력 데이터 하나**를 받아 전처리한 결과를 반환한다

**torchvision의 주요 transform**

| transform | 하는 일 |
|---|---|
| `ToTensor` | PIL Image나 ndarray를 float32 Tensor로 변환, 픽셀값을 [0, 1]로 조정, shape을 `(C, H, W)`로 변경 ([문서](https://pytorch.org/vision/stable/transforms.html)) |
| `Normalize` | 채널별로 평균(mean)을 빼고 표준편차(std)로 나눈다. `ToTensor()`로 변환된 데이터를 받는다 |
| `Compose` | 여러 변환을 순서대로 적용하도록 하나로 묶는다 |

```python
mnist_trainset2 = datasets.MNIST(
    root=mnist_data_dir,
    download=True,
    train=True,
    transform=transforms.ToTensor()  # 전처리 callable 전달.
)
```

```python
x0_2 = mnist_trainset2[0]
```

```python
# ToTensor()의 전처리 작업.
print(x0_2[0].type())  # PIL.Image, np.ndarray -> pytorch Tensor 로 변환
print(x0_2[0].min(), x0_2[0].max()) # 0 ~ 1 사이로 scaling. (MinMaxScaling)
print(x0_2[0].shape) # channel first 로 shape을 변경. (channel, height, width)
```

```text
torch.FloatTensor
tensor(0.) tensor(1.)
torch.Size([1, 28, 28])
```

`Compose`로 Resize → ToTensor → Normalize를 묶어 본다.

```python
# ToTensor() -> Normalize()
transform = transforms.Compose([
    transforms.Resize((14, 14)),  # 14 x 14 이미지를 resize
    transforms.ToTensor(),
    transforms.Normalize(mean=0.5, std=0.5)  # 모든 채널에 동일한 값을 적용: 상수., 채널별로 다른 값 적용: 리스트.
])

mnist_trainset3 = datasets.MNIST(
    root=mnist_data_dir,
    download=True,
    train=True,
    transform=transform
)
```

```python
x0_0 = mnist_trainset3[0][0]
print(x0_0.shape)
print(x0_0.min(), x0_0.max())
```

```text
torch.Size([1, 14, 14])
tensor(-1.) tensor(0.7412)
```

크기가 14 × 14로 줄었고, 값 범위가 [0, 1]에서 [-1, 1] 쪽으로 옮겨졌다. `(x - 0.5) / 0.5`이니 0은 -1, 1은 1이 된다.

> **보충** 최댓값이 1이 아니라 0.74인 건 `Resize`로 이미지를 줄이면서 픽셀들이 섞여(보간) 가장 밝은 값이 낮아졌기 때문이다. `Compose`는 **순서가 중요**하다. `Normalize`는 Tensor를 받으므로 `ToTensor` 뒤에 와야 하고, `Resize`는 PIL Image에도 동작해서 앞에 둘 수 있다. 실무에서는 `mean=0.5, std=0.5` 대신 학습 데이터의 실제 평균·표준편차(MNIST는 약 0.1307, 0.3081)를 쓰기도 한다. 머신러닝 시리즈의 StandardScaler와 같은 역할이다.

### 실습: CIFAR10 Dataset

`datasets.CIFAR10`으로 불러와서 다음을 확인한다.

1. Dataset loading
2. train, test 데이터 개수
3. class index - class name
4. train set 이미지 5장을 label 이름과 함께 출력

```python
from torchvision import datasets
dataset_dir = "datasets/cifar10"

# 1. Dataset 생성
trainset = datasets.CIFAR10(
    root=dataset_dir, train=True, download=True
)
testset = datasets.CIFAR10(
    root=dataset_dir, train=False, download=False
)
```

```text
Files already downloaded and verified
```

```python
print(trainset)
print(testset)
```

```text
Dataset CIFAR10
    Number of datapoints: 50000
    Root location: datasets/cifar10
    Split: Train
Dataset CIFAR10
    Number of datapoints: 10000
    Root location: datasets/cifar10
    Split: Test
```

```python
# 2. 데이터수 확인
len(trainset), len(testset)
```

```text
(50000, 10000)
```

```python
# 3. 정답 class 이름 - index 쌍.
trainset.class_to_idx  # dict: 이름->index
```

```text
{'airplane': 0, 'automobile': 1, 'bird': 2, 'cat': 3, 'deer': 4, 'dog': 5, 'frog': 6, 'horse': 7, 'ship': 8, 'truck': 9}
```

```python
# 4. 이미지 출력
trainset[0]
```

```text
(<PIL.Image.Image image mode=RGB size=32x32 at 0xFC7D4ECD3460>, 6)
```

MNIST와 달리 **RGB 컬러** 32 × 32 이미지다.

```python
# matplotlib
import matplotlib.pyplot as plt
import numpy as np

plt.figure(figsize=(6, 3))
for index in range(5):
    img, label = trainset[index]
    label_str = trainset.classes[label]
    plt.subplot(1, 5, index+1)
    plt.imshow(np.array(img)) # PIL.Image 객체를 ndarray로 변환후 그린다.
    plt.title(label_str)

plt.tight_layout()
plt.show()
```

![그래프 출력](/images/dl/dl-dataset-dataloader-1.png)

> **보충** 여기서는 `transform`이 없어서 PIL Image를 바로 `np.array`로 바꿔 그렸다. `ToTensor()`를 적용한 이미지라면 shape이 `(3, 32, 32)`라서, matplotlib에 넣기 전에 `img.permute(1, 2, 0)`으로 `(32, 32, 3)`으로 돌려야 한다.

## DataLoader

- 모델이 학습하거나 추론할 때 Dataset의 데이터를 **batch size 단위로 모아서** 제공한다

| 매개변수 | 내용 |
|---|---|
| `dataset` | 값을 제공하는 Dataset 객체 |
| `batch_size` | 한 번에 제공할 데이터 개수 |
| `shuffle` | epoch마다 데이터를 섞을지 (기본 False) |
| `drop_last` | 마지막 batch가 batch_size보다 작을 때 버릴지 (기본 False: 제공한다) |

```python
from torch.utils.data import DataLoader

# Train DataLoader: shuffle=True, drop_last=True
mnist_train_loader = DataLoader(mnist_trainset2, batch_size=1000, shuffle=True, drop_last=True)
# Test, Validation DataLoader: shuffle=False, drop_last=False
mnist_test_loader = DataLoader(mnist_trainset2, batch_size=1000)
```

> **보충** 학습용은 섞고(`shuffle=True`) 자투리를 버리고(`drop_last=True`), 검증·평가용은 섞지 않고 전부 쓴다. 학습할 때 섞는 이유는 데이터가 정렬되어 있으면(예: 0이 다 끝나고 1이 나오는 식) 한 batch가 한 클래스로만 채워져 학습이 한쪽으로 쏠리기 때문이다. 평가는 순서와 상관없이 전체를 한 번씩 보면 된다. 위 코드의 `mnist_test_loader`는 예제라 train set으로 만들었는데, 실제로는 test set으로 만든다.

```python
# step 수 조회 (전체 데이터를 몇번에 걸쳐서 제공하는지 조회.)
len(mnist_train_loader)
```

```text
60
```

```python
# DataLoader에 설정된 Dataset 조회
ds = mnist_train_loader.dataset
ds
```

```text
Dataset MNIST
    Number of datapoints: 60000
    Root location: datasets
    Split: Train
    StandardTransform
Transform: ToTensor()
```

DataLoader를 반복하면 batch 단위로 `(X, y)`가 나온다. 60 step을 다 출력하면 길어서 `break`로 첫 batch만 본다.

```python
for X, y in mnist_train_loader:
    print(X.shape, y.shape)
    break
```

```text
torch.Size([1000, 1, 28, 28]) torch.Size([1000])
```

## Custom Dataset 구현

내가 가진 데이터로 Dataset을 만들 수 있다.

1. `torch.utils.data.Dataset`을 상속하는 클래스를 정의한다
2. `__init__(self, ...)`: 데이터 경로, transform 등 필요한 설정을 초기화한다
3. `__len__(self)`: 전체 데이터 개수를 반환한다. DataLoader가 batch를 만들 때 쓴다
4. `__getitem__(self, index)`: index에 해당하는 데이터를 `(X, y)` 튜플로 반환한다. transform이 있으면 적용한 결과를 반환한다

`len()`과 `[]`가 어떤 메소드를 부르는지 먼저 확인한다.

```python
# Subscriptable 타입: indexing이 가능한 객체.
class MySubscriptable:

    def __len__(self):
        print("__len__()")
        return 10

    def __getitem__(self, index):
        print("__getitem__()")
        return index

m = MySubscriptable()
len(m)
print("--------------")
m[500]
```

```text
__len__()
--------------
__getitem__()
```

```text
500
```

`len(m)`은 `__len__()`을, `m[500]`은 `__getitem__(500)`을 부른다. 반환값은 내가 정한다. 그래서 10개라고 해 놓고 500번째를 달라고 해도 에러 없이 500이 나온다.

```python
import torch
from torch.utils.data import Dataset, DataLoader

class MyDataSet(Dataset):
    def __init__(self):
        # 제공할 raw data를 준비.
        self.x_data = torch.FloatTensor([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]])
        self.y_data = torch.FloatTensor([[2], [4], [6], [8], [10], [12]])
        self.len = self.x_data.shape[0]

    def __getitem__(self, index):
        # index의 학습데이터(x, y) 를 loading해서 제공.
        return self.x_data[index], self.y_data[index]

    def __len__(self):
        return self.len





my_dataset = MyDataSet()
len(my_dataset)  # 데이터셋의 총 데이터 개수 조회
```

```text
6
```

```python
my_dataset[0] # my_dataset.__getitem__(0)
```

```text
(tensor([1., 1.]), tensor([2.]))
```

DataLoader에 넣으면 내장 Dataset과 똑같이 batch로 나온다.

```python
dl = DataLoader(my_dataset, batch_size=3)
for X, y in dl:
    print(X)
    print(y)
    print("--------------------")
```

```text
tensor([[1., 1.],
        [2., 2.],
        [3., 3.]])
tensor([[2.],
        [4.],
        [6.]])
--------------------
tensor([[4., 4.],
        [5., 5.],
        [6., 6.]])
tensor([[ 8.],
        [10.],
        [12.]])
--------------------
```

transform을 받는 버전이다.

```python
class MyDataset2(Dataset):

    def __init__(self, x, y, transform=None):
        self.x_data = x
        self.y_data = y
        self.len = self.x_data.shape[0]
        self.transform = transform

    def __getitem__(self, index):
        # return self.x_data[index], self.y_data[index]
        X = self.x_data[index]
        y = self.y_data[index]
        if self.transform != None:
            X = self.transform(X)
        return X, y

    def __len__(self):
        return self.len
```

```python
X = torch.FloatTensor([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]])
y = torch.FloatTensor([[2], [4], [6], [8], [10]])

# my_dataset2 = MyDataset2(X, y)
my_dataset2 = MyDataset2(X, y, transform=lambda x: x / 2)
print(len(my_dataset2))
```

```text
5
```

```python
my_dataset2[0]
```

```text
(tensor([0.5000, 0.5000]), tensor([2.]))
```

입력 X만 2로 나뉘고 y는 그대로다.

```python
# DataLoader 생성
from torch.utils.data import DataLoader

dataloader = DataLoader(my_dataset2, batch_size=2, shuffle=True, drop_last=False)

for data in dataloader:
    print(data)
```

```text
[tensor([[1.5000, 1.5000],
        [0.5000, 0.5000]]), tensor([[6.],
        [2.]])]
[tensor([[2., 2.],
        [1., 1.]]), tensor([[8.],
        [4.]])]
[tensor([[2.5000, 2.5000]]), tensor([[10.]])]
```

5개를 2개씩 나누니 마지막 batch는 1개다. `drop_last=False`라 버리지 않고 제공했다.

> **보충** 실제로는 `__init__`에서 이미지 **파일 경로 목록**만 만들어 두고, `__getitem__`에서 그 index의 파일을 그때 읽는 방식으로 많이 짠다. 이미지 수만 장을 처음에 다 메모리에 올리지 않아도 되기 때문이다. 필요한 데이터를 요청받았을 때 만들어 준다는 점에서 머신러닝 시리즈의 KFold generator와 같은 발상이다.

## TensorDataset: 메모리의 데이터를 Dataset으로

이미 불러온 Tensor 데이터를 Dataset으로 감싼다.

- `torch.utils.data.TensorDataset(input Tensor, output Tensor)`

```python
from sklearn.datasets import load_iris

X, y = load_iris(return_X_y=True)
```

```python
# train/test set 분리
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, test_size=0.2, random_state=0)
```

```python
type(X_train)
```

```text
<class 'numpy.ndarray'>
```

```python
from torch.utils.data import TensorDataset
# (X, y) : X/y는 Tensor 타입
trainset = TensorDataset(
    torch.tensor(X_train), # input
    torch.tensor(y_train), # output
)
testset = TensorDataset(torch.tensor(X_test), torch.tensor(y_test))
```

```python
trainset[0]
```

```text
(tensor([4.8000, 3.0000, 1.4000, 0.3000], dtype=torch.float64), tensor(0))
```

> **보충** 입력이 `float64`로 들어갔다. NumPy의 기본 실수형이 float64라 그대로 변환됐기 때문이다. 모델의 weight는 float32라서 이대로 넣으면 `expected scalar type Float but found Double` 에러가 난다. `torch.tensor(X_train, dtype=torch.float32)`로 만들어야 한다. 반대로 분류 정답은 `CrossEntropyLoss`가 요구하는 int64(long)라 그대로 두면 된다.

내장 Dataset처럼 `classes`와 `class_to_idx`를 붙여 둘 수 있다.

```python
trainset.classes = ["Setosa", "Versicolor", "Virginica"]
testset.classes = ["Setosa", "Versicolor", "Virginica"]
```

```python
trainset.class_to_idx = {"Setosa":0, "Versicolor":1, "Virginica":2}
testset.class_to_idx =  {"Setosa":0, "Versicolor":1, "Virginica":2}
```

## 성능 평가를 위한 데이터셋 분리

| 데이터셋 | 용도 |
|---|---|
| **Train** | 모델을 학습시킨다 |
| **Validation** | 학습 중간에 성능을 검증한다 |
| **Test** | 최종 성능을 측정한다. **마지막에 한 번만** 쓴다 |

설정 변경 → 훈련 → 검증을 원하는 성능이 나올 때까지 반복하는 작업이 **모델링**이다. 이걸 반복하면 검증 데이터에 맞춰 설정을 바꾸게 되니, 검증 데이터에 모델을 맞춰 훈련하는 것과 같은 효과가 난다. 그래서 train과 test 둘만 쓰면 성능을 제대로 평가할 수 없다. 머신러닝 시리즈의 "데이터셋 나누기" 글과 같은 원칙이다.

> - **하이퍼파라미터**: 사람이 직접 정하는 값. 딥러닝에서는 학습률, epoch 수, batch size, optimizer, loss 함수 등
> - **파라미터**: 학습으로 찾는 값. 딥러닝 모델에서는 weight와 bias

## Dataset 분리

### Subset

Dataset의 일부를 가진 부분집합 Dataset을 만든다. 데이터셋을 나눌 때, 일부만 뽑을 때, 특정 클래스만 골라낼 때 쓴다.

```python
import torch
from torch.utils.data import TensorDataset, Subset
```

```python
inputs = torch.arange(1, 11).reshape(5, 2)
outputs = torch.arange(5).reshape(5, 1)
inputs.shape, outputs.shape
```

```text
(torch.Size([5, 2]), torch.Size([5, 1]))
```

```python
dataset = TensorDataset(inputs, outputs)
len(dataset)
```

```text
5
```

```python
# dataset의 5개중에 3개를 골라서 Subset 생성.
sub1 = Subset(dataset, [1, 2, 4])   # (가져올Dataset, 가져올 index들)
sub2 = Subset(dataset, [0, 3]) # index를 지정해줘야함
len(sub1), len(sub2)
```

```text
(3, 2)
```

```python
for i in dataset:
    print(i)
```

```text
(tensor([1, 2]), tensor([0]))
(tensor([3, 4]), tensor([1]))
(tensor([5, 6]), tensor([2]))
(tensor([7, 8]), tensor([3]))
(tensor([ 9, 10]), tensor([4]))
```

```python
for i in sub1:
    print(i)
```

```text
(tensor([3, 4]), tensor([1]))
(tensor([5, 6]), tensor([2]))
(tensor([ 9, 10]), tensor([4]))
```

```python
for i in sub2:
    print(i)
```

```text
(tensor([1, 2]), tensor([0]))
(tensor([7, 8]), tensor([3]))
```

`Subset`은 데이터를 복사하지 않고 **원본 Dataset과 index 목록**만 가지고 있다.

MNIST train 6만 개를 train 5만 / validation 1만으로 나눈다. `randperm`으로 섞은 index를 앞뒤로 자른다.

```python
from torchvision import datasets
trainset = datasets.MNIST("datasets", train=True, download=True)
len(trainset)
```

```text
60000
```

```python
all_index = torch.randperm(len(trainset)) # 0 ~ 지정한정수: 섞어서 반환.
train_index = all_index[:50000]  # 50000, 10000
valid_index = all_index[50000:]
```

```python
m_trainset2 = Subset(trainset, train_index)
m_valid2 = Subset(trainset, valid_index)
len(m_trainset2), len(m_valid2)
```

```text
(50000, 10000)
```

### random_split()

Dataset과 나눌 개수 리스트를 주면, 섞은 뒤 나눠서 Subset들의 리스트로 반환한다. 위 과정을 한 줄로 한다.

```python
from torch.utils.data import random_split
sub1, sub2, sub3, sub4 = random_split(
     trainset, # 나눌대상  Dataset
     [40000, 10000, 5000, 5000], # [몇개씩으로 나눌지 개수]
)
```

```python
len(sub1), len(sub2), len(sub3), len(sub4)
```

```text
(40000, 10000, 5000, 5000)
```

```python
type(sub1)
```

```text
<class 'torch.utils.data.dataset.Subset'>
```

> **보충** 나누는 결과를 재현하려면 `random_split(trainset, [50000, 10000], generator=torch.Generator().manual_seed(0))`처럼 generator에 시드를 준다. 개수 대신 `[0.8, 0.2]` 같은 비율도 받는다. 다만 `random_split`은 **stratify가 없다**. 클래스 비율을 맞춰 나누려면 scikit-learn의 `train_test_split(..., stratify=y)`로 index를 나눈 뒤 `Subset`에 넣는다.

## 정리

- **Dataset**은 데이터를 하나씩 꺼내 주고(`__len__`, `__getitem__`), **DataLoader**는 그걸 batch로 묶어 섞어서 제공한다
- 내장 데이터셋은 `root`, `train`, `download`, `transform`으로 만들고, `classes` / `class_to_idx`로 클래스 이름과 index를 오간다
- `transform`은 데이터 하나를 받는 전처리 함수다. `ToTensor` → `Normalize`를 `Compose`로 묶고, 순서에 주의한다
- 학습용 DataLoader는 `shuffle=True, drop_last=True`, 검증·평가용은 둘 다 False
- 내 데이터는 `Dataset`을 상속해 세 메소드를 구현하거나, 이미 Tensor라면 `TensorDataset`으로 감싼다. 입력은 float32로 맞춘다
- `Subset`(index 지정)이나 `random_split`(개수 지정)으로 train/validation을 나눈다
