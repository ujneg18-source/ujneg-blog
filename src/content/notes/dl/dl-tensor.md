---
title: "Tensor 다루기: 생성·조회·연산"
description: "PyTorch의 기본 자료구조인 Tensor를 생성하고, dtype·shape·device를 다루고, 인덱싱·reshape·축 추가와 제거·합치기·transpose/permute, element-wise 연산과 행렬곱, 기술통계 함수, 그리고 autograd로 gradient를 자동 계산하는 방법까지 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Machine Learning'
series: '딥러닝'
seriesOrder: 2
originalNotebook: "02. tensor 다루기.ipynb"
tags: ["Python","PyTorch","Tensor","autograd"]
date: 2026-06-03
---

> SKN31 딥러닝 과정 노트북 `02. tensor 다루기.ipynb`를 바탕으로 정리했습니다.
> 코드는 PyTorch 2.5(CPU)에서 실행한 결과입니다. 난수를 쓰는 셀은 값이 노트북과 다릅니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- Tensor 생성: `tensor`, 타입별 생성, `zeros`/`ones`/`full`, `arange`/`linspace`, 난수
- dtype, shape, device 다루기와 ndarray 변환
- 인덱싱, reshape/view, 축 추가·제거, 합치기, transpose/permute
- element-wise 연산, 행렬곱, 기술통계 함수
- autograd: 자동 미분과 `no_grad`, gradient 초기화

NumPy 시리즈에서 다룬 ndarray와 거의 같아서, 이 글은 **NumPy와 다른 점**과 **딥러닝에서 왜 필요한지** 위주로 본다.

## Tensor 생성

- 파이토치에서 데이터를 저장하는 자료구조
- ndarray와 성격, 사용법이 비슷하다

> **PyTorch의 tensor는 숫자 데이터 타입만 지원한다.** 문자열을 담을 수 있는 ndarray와 다른 점이다.

**생성**

- `torch.tensor(자료구조[, dtype])`: 지정한 dtype의 Tensor를 만든다
- 타입별 클래스로 직접 만들 수도 있다: `torch.FloatTensor`(float32), `torch.LongTensor`(int64), `BoolTensor`, `CharTensor`(int8), `ShortTensor`(int16), `IntTensor`(int32), `DoubleTensor`(float64)

**상태 조회**

| 속성/메소드 | 내용 |
|---|---|
| `shape`, `size([축번호])` | shape |
| `dtype`, `type()` | `dtype`은 데이터 타입, `type()`은 **Tensor 클래스 타입** |
| `ndim`, `dim()` | 차원 수 |
| `numel()` | 전체 원소 개수 |

```python
import torch
import numpy as np
```

```python
print('torch Data types')
print("float", torch.float16, torch.float32, torch.float64, torch.float, torch.double)
print("int:", torch.int8, torch.int16, torch.int32, torch.int64, torch.short, torch.int, torch.long)
print("uint:", torch.uint8, torch.uint16, torch.uint32, torch.uint64)
print("bool:", torch.bool)
```

```text
torch Data types
float torch.float16 torch.float32 torch.float64 torch.float32 torch.float64
int: torch.int8 torch.int16 torch.int32 torch.int64 torch.int16 torch.int32 torch.int64
uint: torch.uint8 torch.uint16 torch.uint32 torch.uint64
bool: torch.bool
```

`torch.float`는 float32, `torch.double`은 float64, `torch.long`은 int64의 별칭이다. 딥러닝에서는 실수는 **float32**, 정수(클래스 번호 등)는 **int64(long)** 를 주로 쓴다.

```python
a = torch.tensor([[1,2],[3,4]], dtype=torch.float32)


print("shape:", a.shape, a.size())
print("0축 크기:", a.shape[0], a.size(0))
print("type:", a.type(), a.dtype)  # type(): Tensor 객체 타입. dtype: data type => 둘은 좀 다르다.
print('차원크기:', a.dim(), a.ndim)
print('원소개수:', a.numel())
print("device:", a.device)  # tensor를 다루는 processor(메모리위치) - cpu, cuda(gpu)
```

```text
shape: torch.Size([2, 2]) torch.Size([2, 2])
0축 크기: 2 2
type: torch.FloatTensor torch.float32
차원크기: 2 2
원소개수: 4
device: cpu
```

```python
aa = torch.tensor(range(10))
print(aa)
aa.type()
```

```text
tensor([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
```

```text
'torch.LongTensor'
```

정수로 만들면 기본이 int64(`LongTensor`)다.

```python
#Float, Double(32, 64bit 실수)/Int, Long(32, 64 bit 정수) type Tensor
b = torch.FloatTensor([1,3,7])  #float32
print(b.dtype)
c = torch.IntTensor([10,20,30])    # int32
print(c.dtype)
d = torch.DoubleTensor([1, 2, 3])  # float64
print(d.dtype)
e = torch.LongTensor([10, 20, 30]) # int64
print(e.dtype)
```

```text
torch.float32
torch.int32
torch.float64
torch.int64
```

### 같은 값으로 채운 Tensor

- `torch.zeros(*size)`, `zeros_like(텐서)`: 0으로 채운다
- `torch.ones(*size)`, `ones_like(텐서)`: 1로 채운다
- `torch.full(size, fill_value)`, `full_like(텐서, fill_value)`: 지정한 값으로 채운다
- `zeros`, `ones`는 축별 크기를 가변인자로 순서대로, `full`은 tuple/list로 shape을 넘긴다

```python
a = torch.zeros(3,2,3) # 3 x 2 x 3
a.dtype
torch.ones(2,3)  # 2 X 3
torch.full([3,2], fill_value=100) # 3 x 2
```

```text
tensor([[100, 100],
        [100, 100],
        [100, 100]])
```

```python
# 특정 배열과 동일한 shape의 tensor 생성.
a = torch.tensor([[1, 2],[3, 4]]) # 2 x 2

print(a.shape)
b = torch.zeros_like(a)  # a와 같은 shape, dtype 으로 생성.
b = torch.ones_like(a)
b = torch.full_like(a, 20)
print(b.shape, b.dtype)
b
```

```text
torch.Size([2, 2])
torch.Size([2, 2]) torch.int64
```

```text
tensor([[20, 20],
        [20, 20]])
```

### 일정한 간격의 값

- `torch.arange(start=0, end, step=1)`
- `torch.linspace(start, end, steps)`: steps는 원소 개수

```python
torch.arange(10)  # end. 0 ~ 10-1 1씩 증가
torch.arange(0, 1, 0.1) # 0 ~ 1-0.1, 0.1
torch.arange(10, 1, -1) # 10 ~ 1-(-1), -1
```

```text
tensor([10,  9,  8,  7,  6,  5,  4,  3,  2])
```

> **보충** 주석의 `10 ~ 1-(-1)`은 "10부터 1 직전까지"다. end는 포함하지 않으니 결과는 10부터 **2**까지다.

```python
torch.linspace(0, 10, 5) # 0 ~ 10, 5개원소
# torch.linspace(0, 1, 11)
```

```text
tensor([ 0.0000,  2.5000,  5.0000,  7.5000, 10.0000])
```

### 빈 Tensor

`torch.empty(*size)`는 메모리만 잡고 **초기화하지 않는다**. 그 메모리에 원래 있던 값이 그대로 들어 있어서, 아래처럼 0이 보일 때도 있고 의미 없는 큰 값이 보일 때도 있다. 바로 다른 값으로 채울 tensor를 만들 때 쓴다.

```python
torch.empty(3,2,7) # 3 X 2 X 7
```

```text
tensor([[[0., 0., 0., 0., 0., 0., 0.],
         [0., 0., 0., 0., 0., 0., 0.]],

        [[0., 0., 0., 0., 0., 0., 0.],
         [0., 0., 0., 0., 0., 0., 0.]],

        [[0., 0., 0., 0., 0., 0., 0.],
         [0., 0., 0., 0., 0., 0., 0.]]])
```

### 난수로 생성

| 함수 | 내용 |
|---|---|
| `torch.rand(*size)` | 0~1 사이 균등분포 실수 |
| `torch.randn(*size)` | 표준정규분포(평균 0, 표준편차 1) 실수 |
| `torch.normal(mean, std, size)` | 정규분포 실수 |
| `torch.randint(low=0, high, size)` | 지정 범위의 정수 |
| `torch.randperm(n)` | 0 ~ n-1을 랜덤하게 섞은 배열 |

```python
torch.manual_seed(0)  # seed 설정
torch.rand(1, 3, 5) # 100 x 3 x 5
# torch.randn(3, 5) # 30 X 3
# torch.randint(1, 100, (3, 3, 6))
# torch.randperm(100) # 0 ~ 99 를 섞어서 구성
```

```text
tensor([[[0.4963, 0.7682, 0.0885, 0.1320, 0.3074],
         [0.6341, 0.4901, 0.8964, 0.4556, 0.6323],
         [0.3489, 0.4017, 0.0223, 0.1689, 0.2939]]])
```

> **보충** 주석의 `100 x 3 x 5`는 이전에 다른 값으로 실행했던 흔적으로, 이 셀은 `1 x 3 x 5`를 만든다. 시드를 고정했기 때문에 결과가 노트북과 같다.

`randperm`은 데이터를 섞을 때 쓴다. 섞인 정수를 index로 쓰면 원본 순서가 섞인다.

```python
a = torch.arange(100)
a
# a 섞기
idx = torch.randperm(100) # 0 ~ 99 섞어서 반환. -> index
idx
b = a[idx]
b[:20]
```

```text
tensor([76, 28, 46, 81, 37, 91, 21, 18, 34, 83, 51, 47, 77,  2,  0, 66, 16, 41,
        13, 20])
```

## Tensor를 GPU/CPU 메모리로 옮기기

- PyTorch는 tensor를 CPU 메모리와 GPU 메모리 사이로 옮길 수 있다. 연산을 어디서 할지에 따라 메모리를 고른다
- 장치는 문자열로 지정한다: `"cpu"`, `"cuda"`(NVIDIA GPU), `"mps"`(Apple Silicon)
- 옮기는 방법: 생성할 때 `device=` 지정, 또는 `tensor.to(device)`
- 확인: `torch.cuda.is_available()`, `torch.backends.mps.is_available()`

```python
torch.cuda.is_available()
torch.backends.mps.is_available() # mps (cpu+gpu => m5) 사용가능 여부
```

```text
False
```

```python
import torch
# device = 'cuda' if torch.cuda.is_available() else 'cpu' # 쿠다(엔비디아 GPU)를 사용할 수 있는지여부를 반환

device = 'mps' if torch.backends.mps.is_available() else 'cpu'
# device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
device
```

```text
'cpu'
```

```python
t = torch.tensor([1, 2, 3], dtype=torch.float32, device=device) #생성할 때 device 지정. # 디바이스를 지정해두지 않으면 디폴트는 cpu
print(t, t.device) # tensor가 어느 device에 있는지 확인
```

```text
tensor([1., 2., 3.]) cpu
```

```python
t2 = t.to("cpu")  # 다른 device로 옮기기.
print(t2, t2.device)
```

```text
tensor([1., 2., 3.]) cpu
```

> **보충** 연산하는 tensor들은 **같은 장치**에 있어야 한다. 모델은 GPU에, 데이터는 CPU에 있으면 `Expected all tensors to be on the same device` 에러가 난다. 그래서 학습 코드에서는 모델과 데이터를 모두 `.to(device)`로 옮긴다.

## Tensor를 파이썬 값으로: item()

`tensor.item()`은 스칼라 또는 원소가 하나인 tensor를 파이썬 값으로 바꾼다. 학습 중 loss 값을 기록할 때 쓴다.

```python
print(torch.tensor(30))
```

```text
tensor(30)
```

```python
a = torch.tensor(10)  # 상수(scalar) => 0차원 Tensor
print(a, a.ndim)
print(a.item())
print(type(a), type(a.item()))
```

```text
tensor(10) 0
10
<class 'torch.Tensor'> <class 'int'>
```

```python
b = torch.tensor([[20]]) # 원소가 하나인 N차원 배열
print(b, b.dim())
print(b.item()) #원소가 하나인 배열(텐서) 변환 가능
```

```text
tensor([[20]]) 2
20
```

원소가 여러 개면 `item()`을 쓸 수 없다. **아래 셀은 에러가 나는 것이 정상이다.**

```python
c = torch.tensor([1, 10, 100])
print(c)
print(c.item()) #원소가 여러개일 경우 Exception발생
```

```text
tensor([  1,  10, 100])
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · RuntimeError: a Tensor with 3 elements cannot be converted to Scalar</div></div>

GPU에 tensor를 만들려고 하면, GPU가 없는 환경에서는 에러가 난다. **아래 셀도 에러가 나는 것이 정상이다.**

```python
d = torch.tensor([10], device='cuda')
print(d)
print(d.item())
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · AssertionError: Torch not compiled with CUDA enabled</div></div>

## ndarray 호환

- ndarray → tensor: `torch.tensor(ndarray)`, `torch.from_numpy(ndarray)`
- tensor → ndarray: `tensor.numpy()`. GPU에 있으면 CPU로 옮긴 뒤 변환해야 한다

```python
import numpy as np
import torch
```

```python
# ndarray -> tensor
arr = np.arange(1,10)

print(torch.tensor(arr, dtype=torch.float32))
torch.from_numpy(arr)
```

```text
tensor([1., 2., 3., 4., 5., 6., 7., 8., 9.])
```

```text
tensor([1, 2, 3, 4, 5, 6, 7, 8, 9])
```

```python
# tensor -> ndarray
t = torch.randn(3,3)
print(t)
t.to("cpu").numpy()
```

```text
tensor([[-0.0052, -0.0944, -1.1236],
        [-0.6513,  0.5693,  0.1782],
        [ 1.3549, -0.0112,  0.5928]])
```

```text
array([[-0.00522718, -0.09443805, -1.1235938 ],
       [-0.6512634 ,  0.56930697,  0.17822142],
       [ 1.3549144 , -0.01122946,  0.5928014 ]], dtype=float32)
```

> **보충** `torch.from_numpy()`는 원본 ndarray와 **메모리를 공유**한다. ndarray를 바꾸면 tensor도 바뀐다. `torch.tensor()`는 복사본을 만든다.

```python
# 보충: from_numpy는 메모리 공유, tensor는 복사
arr = np.array([1, 2, 3])
t_shared = torch.from_numpy(arr)
t_copy = torch.tensor(arr)
arr[0] = 100
print(t_shared, t_copy)
```

```text
tensor([100,   2,   3]) tensor([1, 2, 3])
```

## 원소 조회와 변경

### indexing / slicing

대부분 NumPy와 같다. 단 **slicing에서 step을 음수로 지정할 수 없다.**

```python
torch.manual_seed(0)
t = torch.randint(-10, 10, (100, ))
t[:20]
```

```text
tensor([ -6,   9,   3, -10,  -7,   9,  -3,  -7,   7,  -7,  -9,  -4,   6,   9,
          8,   6,   6,  -2,   4,   3])
```

```python
t[0]
# t[[1, 5, -1]] # 여러개 조회-> fancy indexing
```

```text
tensor(-6)
```

```python
t[:5]
# t[10:15]
# t[90:]
# t[3:30:3]

####### step 음수 안된다. 그래서 reverse(역순 조회)가 안됨. reverse하려면 flip() 사용
# t[10:1:-2]
# t[1:10:2].flip(dims=(0,)) #reverse
```

```text
tensor([ -6,   9,   3, -10,  -7])
```

```python
t[1:10:2]
```

```text
tensor([  9, -10,   9,  -7,  -7])
```

step을 음수로 주면 어떻게 되는지 확인한다. **아래 셀은 에러가 나는 것이 정상이다.**

```python
t[10:1:-2]
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: step must be greater than zero</div></div>

역순은 `flip()`으로 뒤집는다.

```python
t[1:10:2].flip(dims=(0,)) #reverse
```

```text
tensor([ -7,  -7,   9, -10,   9])
```

### boolean index

논리 연산은 `&`, `|`, `~`를 쓴다.

```python
# boolean index
t[t > 0]
```

```text
tensor([9, 3, 9, 7, 6, 9, 8, 6, 6, 4, 3, 9, 1, 4, 2, 5, 9, 1, 8, 6, 1, 7, 5, 1,
        3, 1, 6, 9, 4, 5, 8, 2, 2, 7, 9, 6, 9, 3, 3, 9, 8, 5, 8, 5, 6, 5, 7, 2])
```

```python
t[(t > 0) & (t < 5)]
```

```text
tensor([3, 4, 3, 1, 4, 2, 1, 1, 1, 3, 1, 4, 2, 2, 3, 3, 2])
```

```python
# boolean index 처리 함수.
t.masked_select(t > 0)
```

```text
tensor([9, 3, 9, 7, 6, 9, 8, 6, 6, 4, 3, 9, 1, 4, 2, 5, 9, 1, 8, 6, 1, 7, 5, 1,
        3, 1, 6, 9, 4, 5, 8, 2, 2, 7, 9, 6, 9, 3, 3, 9, 8, 5, 8, 5, 6, 5, 7, 2])
```

### 2차원 조회와 변경

```python
t = torch.arange(1, 10).reshape(3,3)
t
```

```text
tensor([[1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]])
```

```python
# t[ 0축, 1축 ]
#
print(t[1, 2].item())
t[0, 2].item()
```

```text
6
```

```text
3
```

```python
t[[1,0], [2,2]]  #(1,2), (0,2)
# t[[첫번째값, 두번째값]-0축, [첫번째값, 두번째값]-1축]
```

```text
tensor([6, 3])
```

```python
t[[1, 1, 2] ,[0, 2, 1] ] # 1,0 / 1,2 , 21
```

```text
tensor([4, 6, 8])
```

```python
# 변경
t[0, 0] = 100
t
```

```text
tensor([[100,   2,   3],
        [  4,   5,   6],
        [  7,   8,   9]])
```

## Reshape

- 원소 개수가 달라지는 shape으로는 바꿀 수 없다
- `tensor.reshape(*shape)` 또는 `view(*shape)`
  - 바꾼 뒤 값을 변경하면 **원본도 같이 바뀐다**
- `tensor.clone()`: tensor를 복제한다

```python
torch.manual_seed(0)
a=torch.rand(24)
print(a)
a2 = a.reshape(6,4)
a3 = a.reshape((3,2,4))
a4 = a.reshape((3,2,-1))  #한 개 axis는 -1로 설정가능하고 그럼 계산해서 알아서 설정해 준다.
print(a.shape, a2.size(), a3.shape, a4.shape)
```

```text
tensor([0.4963, 0.7682, 0.0885, 0.1320, 0.3074, 0.6341, 0.4901, 0.8964, 0.4556,
        0.6323, 0.3489, 0.4017, 0.0223, 0.1689, 0.2939, 0.5185, 0.6977, 0.8000,
        0.1610, 0.2823, 0.6816, 0.9152, 0.3971, 0.8742])
torch.Size([24]) torch.Size([6, 4]) torch.Size([3, 2, 4]) torch.Size([3, 2, 4])
```

```python
a5 = a.view(6,4)
a6 = a.view((3,2,4))
a7 = a.view((3,2,-1))  #한개 axis는 -1로 설정가능
print(a.shape, a5.size(), a6.shape, a7.shape)
```

```text
torch.Size([24]) torch.Size([6, 4]) torch.Size([3, 2, 4]) torch.Size([3, 2, 4])
```

reshape한 결과를 바꾸면 원본 `a`도 바뀌는지 확인한다.

```python
# a5[0, 0] = 12.1
a2[0, 1] = 15.1

print(a2[0])
print(a[:4])
```

```text
tensor([ 0.4963, 15.1000,  0.0885,  0.1320])
tensor([ 0.4963, 15.1000,  0.0885,  0.1320])
```

`a2`의 `[0, 1]`을 바꿨는데 원본 `a`의 1번 원소도 15.1이 됐다. 같은 메모리를 다른 shape으로 보고 있기 때문이다. 독립된 복사본이 필요하면 `clone()`을 쓴다.

```python
# tensor복사: clone() 메소드
r = a.reshape(6, 4).to(torch.float32).clone()
r[0,0] = 100.1
print(a[:4])
print(r[0])
```

```text
tensor([ 0.4963, 15.1000,  0.0885,  0.1320])
tensor([1.0010e+02, 1.5100e+01, 8.8477e-02, 1.3203e-01])
```

> **보충** `view()`는 항상 원본과 메모리를 공유하고, 메모리가 연속적이지 않으면(예: transpose 뒤) 에러가 난다. `reshape()`은 가능하면 공유하고, 안 되면 복사본을 만든다. 그래서 보통은 `reshape()`을 쓰는 게 안전하다.

## 축 늘리기와 줄이기

딥러닝 모델은 입력 shape이 정해져 있어서, 이미지 한 장 `(28, 28)`을 "1장짜리 묶음" `(1, 28, 28)`으로 만들 때처럼 크기 1인 **dummy 축**을 넣고 빼는 일이 잦다.

### dummy 축 늘리기

- `None` 사용 (NumPy의 `newaxis` 대신)
- `unsqueeze(dim=축번호)`

```python
import torch
a = torch.tensor([[10,20],[10,20]])
print(a.shape)

a1, a2 = a[None, :], a.unsqueeze(dim=0) # dim=정수만가능
print(a1.shape, a2.shape)

a3, a4 = a[:, :, None], a.unsqueeze(dim=-1)   # a[:, None] # 0축 :, 1축 None, 2번축 지정안함 -> 원래대로 그래서 (2, 1, 2) 가됨.
print(a3.shape, a4.shape)

a5, a6 = a3[:,None,:,:, None],  a3.unsqueeze(dim=1)  # unsqueeze(): dim=정수만가능 (한번에 dummy축은 하나만 추가가능.)
print(a5.shape, a6.shape)
```

```text
torch.Size([2, 2])
torch.Size([1, 2, 2]) torch.Size([1, 2, 2])
torch.Size([2, 2, 1]) torch.Size([2, 2, 1])
torch.Size([2, 1, 2, 1, 1]) torch.Size([2, 1, 2, 1])
```

`None`은 한 번에 여러 축을 넣을 수 있고, `unsqueeze()`는 한 번에 하나만 넣는다.

### dummy 축 제거

`squeeze([dim=축번호])`

```python
t = torch.rand(3, 1, 4, 1, 5, 1)
print(t.shape)

r1 = t.squeeze()  #축을 명시 하지 않으면 모두 제거
print(r1.shape)

r2 = t.squeeze(dim=1) # 특정 axis 제거
print(r2.shape)

r3 = t.squeeze(dim=[1,3]) # 여러 axis의 dummy 축 제거
print(r3.shape)
```

```text
torch.Size([3, 1, 4, 1, 5, 1])
torch.Size([3, 4, 5])
torch.Size([3, 4, 1, 5, 1])
torch.Size([3, 4, 5, 1])
```

## Tensor 합치기

`torch.cat([tensorA, tensorB, ...], dim=0)`. 합치는 축을 제외한 나머지 축의 크기는 같아야 한다.

```python
a = torch.arange(10).reshape(2,5)
b = torch.arange(10,20).reshape(2,5)
c = torch.arange(20,30).reshape(2,5)
d = torch.arange(10,19).reshape(3,3)
```

```python
torch.cat([a, b, c], dim=0)
```

```text
tensor([[ 0,  1,  2,  3,  4],
        [ 5,  6,  7,  8,  9],
        [10, 11, 12, 13, 14],
        [15, 16, 17, 18, 19],
        [20, 21, 22, 23, 24],
        [25, 26, 27, 28, 29]])
```

```python
torch.cat([a, b, c], axis=1)
```

```text
tensor([[ 0,  1,  2,  3,  4, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24],
        [ 5,  6,  7,  8,  9, 15, 16, 17, 18, 19, 25, 26, 27, 28, 29]])
```

`dim` 대신 `axis`도 쓸 수 있고, `-1`은 마지막 축이다.

```python
torch.cat([a, b], axis=-1)  # -1: 마지막 axis
```

```text
tensor([[ 0,  1,  2,  3,  4, 10, 11, 12, 13, 14],
        [ 5,  6,  7,  8,  9, 15, 16, 17, 18, 19]])
```

1축 크기가 다른 `a (2, 5)`와 `d (3, 3)`을 0축으로 합치면 에러가 난다. **아래 셀은 에러가 나는 것이 정상이다.**

```python
a.shape, d.shape
# 합치는 기준축 이외의 축 size는 같아야 한다.
torch.cat([a, d])  #dim=0, Error  1축 size가 달라서 Error
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · RuntimeError: Sizes of tensors must match except in dimension 0. Expected size 5 but got size 3 for tensor number 1 in the list.</div></div>

## 축 순서 바꾸기: transpose, permute

- `tensor.transpose(axis1, axis2)`: 두 축의 자리만 바꾼다
- `tensor.permute(axis1, axis2, axis3, ...)`: 여러 축의 순서를 한 번에 바꾼다

```python
# 모델이 기대하는 입력 shape가 정해져 있다

# (1) 관습으로 정해둔 축으로 변경/프레임워크별 표준 포맷 통일
# 파이토치 (Batch, Channel, Height, Width)
# 텐서플로우 (Batch, Height, Width, Channel)

# (2) 행렬 곱셈 및 연산 조건 충족

# (3)  고차원 데이터 특징 추출 및 구조 보존


X = torch.arange(24).reshape(2, 3, 4)
print(X.shape)

y = X.transpose(1, 2)
print(y.shape)

z = X.permute(2, 0, 1)
print(z.shape)
```

```text
torch.Size([2, 3, 4])
torch.Size([2, 4, 3])
torch.Size([4, 2, 3])
```

가장 흔한 예가 이미지다. 이미지 파일을 읽으면 보통 `(높이, 너비, 채널)`인데 PyTorch는 `(채널, 높이, 너비)`를 기대한다.

```python
# 보충: 이미지 (H, W, C) -> PyTorch (C, H, W)
img = torch.rand(28, 28, 3)
print(img.shape, "->", img.permute(2, 0, 1).shape)
```

```text
torch.Size([28, 28, 3]) -> torch.Size([3, 28, 28])
```

## Tensor 연산

### element-wise 연산

- tensor와 상수, tensor와 tensor의 연산은 **원소별**로 처리한다
- 행렬곱을 제외하면 피연산자들의 shape이 같아야 한다. 다르면 조건이 맞을 때 **broadcasting** 후 연산한다

```python
import torch

a = torch.arange(10).reshape(2,5)
b = torch.arange(10,20).reshape(2,5)
c = torch.arange(50, 55)

print(a)
print(b)
print(c)
```

```text
tensor([[0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9]])
tensor([[10, 11, 12, 13, 14],
        [15, 16, 17, 18, 19]])
tensor([50, 51, 52, 53, 54])
```

```python
print(a + 100)
print(a < 5)
```

```text
tensor([[100, 101, 102, 103, 104],
        [105, 106, 107, 108, 109]])
tensor([[ True,  True,  True,  True,  True],
        [False, False, False, False, False]])
```

```python
print(a + b)
print(a == b)
```

```text
tensor([[10, 12, 14, 16, 18],
        [20, 22, 24, 26, 28]])
tensor([[False, False, False, False, False],
        [False, False, False, False, False]])
```

```python
# broadcasting
print(a.size(), c.size())
print(a + c)
```

```text
torch.Size([2, 5]) torch.Size([5])
tensor([[50, 52, 54, 56, 58],
        [55, 57, 59, 61, 63]])
```

`(5,)`인 `c`가 `(2, 5)`로 늘어나 행마다 더해졌다.

### 상수: e, pi, nan, inf

```python
torch.e, np.e, torch.pi, np.pi
```

```text
(2.718281828459045, 2.718281828459045, 3.141592653589793, 3.141592653589793)
```

- `nan`: Not a Number. 주로 결측치나 계산 불가능한 결과를 나타낸다
- `inf`: 무한. `torch.inf`는 양의 무한, `-torch.inf`는 음의 무한
- `torch.isnan(tensor)`, `torch.isinf(tensor)`: 원소별 확인

```python
print(torch.inf > 10000000000000000, torch.inf < 10000000000)
print(-torch.inf < -1000000000000000000000, -torch.inf > 10)
```

```text
True False
True False
```

```python
print(torch.log(torch.tensor(-1))) # nan (계산결과가 없으므로-없는값-nan 반환)
print(torch.isnan(torch.tensor([1,2,torch.nan,3,4])))  # nan 여부 확인
print(torch.isinf(torch.tensor([1,2,3,4,torch.inf])))  # inf 여부 확인
```

```text
tensor(nan)
tensor([False, False,  True, False, False])
tensor([False, False, False, False,  True])
```

> **보충** 학습 중 loss가 갑자기 `nan`이 되는 일이 생긴다. 학습률이 너무 커서 값이 발산했거나, `log(0)`처럼 정의되지 않는 계산이 들어간 경우가 많다. 경사하강법 글에서 학습률 10이 발산했던 것과 같은 현상이다.

### 주요 연산 함수

```python
# 원소별 처리
x=torch.arange(-4, 5).reshape(3,3)
print(x)
print(torch.abs(x)) # 절대값
print(torch.sqrt(torch.abs(x))) #  제곱근
print(torch.exp(x))  # torch.e**x
print(torch.log(torch.abs(x)))
print(torch.log(torch.exp(torch.tensor(1))))  # torch.log() 밑이 e인 로그계산
print(torch.log10(torch.tensor(10)))         # torch.log10() 밑이 10인 로그계산
print(torch.log2(torch.tensor(2)))           # torch.log2() 밑이 2인 로그계산
```

```text
tensor([[-4, -3, -2],
        [-1,  0,  1],
        [ 2,  3,  4]])
tensor([[4, 3, 2],
        [1, 0, 1],
        [2, 3, 4]])
tensor([[2.0000, 1.7321, 1.4142],
        [1.0000, 0.0000, 1.0000],
        [1.4142, 1.7321, 2.0000]])
tensor([[1.8316e-02, 4.9787e-02, 1.3534e-01],
        [3.6788e-01, 1.0000e+00, 2.7183e+00],
        [7.3891e+00, 2.0086e+01, 5.4598e+01]])
tensor([[1.3863, 1.0986, 0.6931],
        [0.0000,   -inf, 0.0000],
        [0.6931, 1.0986, 1.3863]])
tensor(1.0000)
tensor(1.)
tensor(1.)
```

`log(0)`은 `-inf`로 나온다.

```python
torch.manual_seed(0)
y = x + torch.randn((3,3))
print(y)
print(torch.round(y)) # 반올림
print(torch.round(y, decimals=2)) # 소수점 둘째자리 이하에서 반올림
print(torch.floor(y)) # 내림
print(torch.ceil(y)) # 올림
```

```text
tensor([[-2.4590, -3.2934, -4.1788],
        [-0.4316, -1.0845, -0.3986],
        [ 2.4033,  3.8380,  3.2807]])
tensor([[-2., -3., -4.],
        [-0., -1., -0.],
        [ 2.,  4.,  3.]])
tensor([[-2.4600, -3.2900, -4.1800],
        [-0.4300, -1.0800, -0.4000],
        [ 2.4000,  3.8400,  3.2800]])
tensor([[-3., -4., -5.],
        [-1., -2., -1.],
        [ 2.,  3.,  3.]])
tensor([[-2., -3., -4.],
        [-0., -1., -0.],
        [ 3.,  4.,  4.]])
```

### 행렬곱

`@` 연산자 또는 `torch.matmul(tensor1, tensor2)`

```python
x = torch.FloatTensor([[1, 2],[3, 4],[5, 6]])

y = torch.FloatTensor([[1, 2],[1, 2],])
x.size()
```

```text
torch.Size([3, 2])
```

```python
z1 = x @ y
z2 = torch.matmul(x, y)
print(z1.shape, z2.shape)
print(z1)
```

```text
torch.Size([3, 2]) torch.Size([3, 2])
tensor([[ 3.,  6.],
        [ 7., 14.],
        [11., 22.]])
```

`(3, 2) @ (2, 2)` → `(3, 2)`. 앞 tensor의 열 수와 뒤 tensor의 행 수가 같아야 한다. 신경망의 레이어 하나가 바로 이 행렬곱(입력 × 가중치)이다.

**Batch 행렬곱**: `torch.bmm()`은 두 3차원 tensor를 0축(배치)마다 따로 행렬곱한다.

```python
# Batch 행렬곱(Batch matrix muliplication) - bmm()
# 피연산자로 두개의 3차원 tensor를 axis (1, 2)를 기준으로 행렬곱을 처리한다. # 내적 조건이 맞아야 연산이 가능함
import torch
x = torch.FloatTensor(3,4,2)
y = torch.FloatTensor(3,2,5)
z = torch.bmm(x, y)
z.shape
```

```text
torch.Size([3, 4, 5])
```

`(3, 4, 2)`와 `(3, 2, 5)`가 배치 3개마다 `(4, 2) @ (2, 5)`로 곱해져 `(3, 4, 5)`가 된다.

> **보충** `torch.FloatTensor(3, 4, 2)`처럼 **정수 여러 개**를 넘기면 값이 아니라 shape으로 해석해서, `empty`처럼 초기화되지 않은 tensor를 만든다. shape 확인용으로는 괜찮지만 값을 쓰려면 `torch.rand(3, 4, 2)` 등을 써야 한다.

### 기술통계 함수

```python
torch.manual_seed(0)
X=torch.randn(3,4)
print(X)
```

```text
tensor([[ 1.5410, -0.2934, -2.1788,  0.5684],
        [-1.0845, -1.3986,  0.4033,  0.8380],
        [-0.7193, -0.4033, -0.5966,  0.1820]])
```

```python
print(torch.sum(X))  # default: 전체기준으로 계산. dim=None
print(torch.sum(X, dim=1)) #dim/axis 지정: 지정한 axis의 index가 다른 값끼리 계산.
print(torch.sum(X, dim=1, keepdims=True)) # 기술통계함수들을 실행하면 차원이 줄어든다. keepdims=True로 하면 차원유지
```

```text
tensor(-3.1417)
tensor([-0.3628, -1.2417, -1.5372])
tensor([[-0.3628],
        [-1.2417],
        [-1.5372]])
```

```python
print(torch.mean(X))
print(torch.mean(X, dim=0))
print(torch.mean(X, dim=0, keepdims=True))
```

```text
tensor(-0.2618)
tensor([-0.0876, -0.6985, -0.7907,  0.5295])
tensor([[-0.0876, -0.6985, -0.7907,  0.5295]])
```

```python
print(torch.std(X)) # standard deviation 표준 편차
print(torch.var(X)) # variance
print(torch.var(X, dim=0))
```

```text
tensor(1.0346)
tensor(1.0704)
tensor([2.0226, 0.3707, 1.6951, 0.1087])
```

함수 대신 tensor의 메소드로도 쓸 수 있다.

```python
# tensor.메소드()
print(X.sum(dim=1, keepdims=True))
print(X.mean(dim=1, keepdims=True))
print(X.std())
```

```text
tensor([[-0.3628],
        [-1.2417],
        [-1.5372]])
tensor([[-0.0907],
        [-0.3104],
        [-0.3843]])
tensor(1.0346)
```

**max / min / argmax**: 축을 지정하면 값과 **index**를 함께 돌려준다.

```python
print(torch.max(X)) # 전체 기준 max값 계산.
print(torch.max(X, dim=1))  # 축을 지정하면 return_types.max 타입객체로 반환. max값과 max값의 index를 묶어서 반환
```

```text
tensor(1.5410)
torch.return_types.max(
values=tensor([1.5410, 0.8380, 0.1820]),
indices=tensor([0, 3, 3]))
```

```python
print(torch.argmax(X))
print(torch.argmax(X, dim=0)) # 각 열에서 가장 큰 값의 인덱스
print(torch.argmax(X, dim=1)) # 각 행에서 가장 큰 값의 인덱스
```

```text
tensor(0)
tensor([0, 0, 1, 1])
tensor([0, 3, 3])
```

```python
a = torch.max(X, dim=0)
print(a.values)
print(a.indices)
```

```text
tensor([ 1.5410, -0.2934,  0.4033,  0.8380])
tensor([0, 0, 1, 1])
```

> **보충** `argmax(dim=1)`은 다중 분류 모델에서 가장 자주 쓰는 함수다. 모델이 샘플마다 클래스별 점수 `(샘플 수, 클래스 수)`를 내면, 행마다 가장 큰 점수의 index가 곧 예측 클래스다. 다음 MNIST 글에서 바로 쓴다.

## autograd (자동 미분)

- 자동 미분으로 gradient(미분계수)를 계산하는 PyTorch 시스템
- 딥러닝 모델의 weight, bias(파라미터)는 **역전파(backpropagation)** 로 gradient를 구해 loss가 줄어드는 방향으로 업데이트된다. PyTorch가 이 미분을 자동으로 해 준다
- 미분 대상 tensor는 `requires_grad=True`로 설정한다 (기본 False)

> **미분**: (순간) 변화율을 계산한다. $\frac{\partial y}{\partial x}$는 x에 대한 y의 변화율, 즉 x가 변하면 y가 얼마나 변하는지다.

```python
# 파이토치의 장점
# auto gradient 자동미분  (변화율을 자동으로 계산함)
# why -> 딥러닝 모델의 학습방법 (= 경사하강법)
# y^ = wx+b
# y^ - y = 0 (loss)
#
# 다음 w = w - 학습률*loss/w(변화율=grad)

# 손실함수 => loss = y^ - y 의 오차를 계산하는 함수

# loss/w(변화율=grad) = 미분f(X)

# 순전파 (예측하는 단계) => 입력 -> 예측값 생성
# 역전파 (최적화하는 단계) => loss를 미분하여 gradient 계산
```

경사하강법 공식 $W_{new} = W - \alpha \frac{\partial \text{loss}}{\partial W}$에서 $\frac{\partial \text{loss}}{\partial W}$를 PyTorch가 계산해 준다. 예측하는 계산이 **순전파**, loss에서 거꾸로 미분해 가는 계산이 **역전파**다.

$y = x^2$을 x = 1에서 미분해 본다. 답은 $2x = 2$다.

```python
x = torch.tensor([1.0], requires_grad=True) # gradient가 필요해, 도함수가 필요해, 계산하면서 그때그때만들거여
print("X값의 데이터:", x.data)
print("X의 gradient값:", x.grad)
```

```text
X값의 데이터: tensor([1.])
X의 gradient값: None
```

```python
y = x **2
y
```

```text
tensor([1.], grad_fn=<PowBackward0>)
```

```python
# fn=<PowBackward0> = 도함수
# 함수의 피연사자에 requres_grad-true tensor가 있으면
# 이 함수의 도함수 gradient의 도함수를 생성해서
# 결과를 저장하는 tensor(y)의 grad_fn 속성에 저장한다
```

`requires_grad=True`인 tensor로 계산하면 결과 tensor의 `grad_fn`에 **미분할 때 쓸 함수**가 기록된다.

```python
# gradient를 계산

y.backward() # dy

# 계산된 gradient값을 x(requires_grad=True) grad속성에 저장한다.
x.data, x.grad
```

```text
(tensor([1.]), tensor([2.]))
```

`backward()`를 부르면 기록된 함수를 따라 거꾸로 미분해서, 결과를 `x.grad`에 저장한다. 2가 나왔다.

```python
## 1
# 연산할 때, 배열 맞추기

## 2
#requires_grad=True 미분 필요할때, 도함수 구해두기

## 3
# z.backward()로 저장해두기
```

```python
x = torch.tensor([2.0], requires_grad=True)
y = torch.tensor([3.0])

z= x-y # 결과: z.data x에대한 도함수 z.grad_fn y에 대한 도함수는 없음
z.backward() # x에대한 grad값을 z.grad_fn을 이용해서 계산한뒤 x.grad에 저장
print(z.grad_fn)
x.data, x.grad
```

```text
<SubBackward0 object at 0xf21969609600>
```

```text
(tensor([2.]), tensor([1.]))
```

선형 회귀 모델 $\hat{y} = w \cdot x$에 적용해 본다.

```python
# 선형회귀모델을 대상으로 적용

input_data = torch.tensor([30.2])

weight = torch.tensor([0.2], requires_grad=True) #우리가 나중에 변화율을 구해야하는 weight에 도함수를 지정

y_pred = weight * input_data

print(y_pred)


print(weight, x.grad)


# new weight를 구하려면
# 원래 웨이트에서 -웨이트 변화률을 빼고 학습률을 곱한다.
```

```text
tensor([6.0400], grad_fn=<MulBackward0>)
tensor([0.2000], requires_grad=True) tensor([1.])
```

> **보충** 두 번째 `print`는 `weight.grad`를 보려던 것인데 `x.grad`(앞 셀의 값 1)를 출력했다. 게다가 이 셀에서는 `backward()`를 부르지 않았기 때문에 `weight.grad`는 아직 `None`이다. 마지막 주석도 순서가 반대다. **gradient에 학습률을 곱한 값**을 원래 weight에서 뺀다: `weight - lr * weight.grad`.

```python
# 보충: backward 후 weight.grad 확인과 업데이트
y_pred.backward()
print("weight.grad:", weight.grad)          # d(w*x)/dw = x = 30.2
lr = 0.001
with torch.no_grad():
    new_weight = weight - lr * weight.grad
print("업데이트한 weight:", new_weight)
```

```text
weight.grad: tensor([30.2000])
업데이트한 weight: tensor([0.1698])
```

### 편미분

변수가 둘 이상이면 변수별로 따로 미분한다. 한 변수로 미분할 때 나머지는 상수로 본다.

```python
# 편미분
# 하나의 함수에 gradient를 변수가 두개 이상일 경우 변수별로 따로 계산한다
# 하나의 변수에 대한 gradient를 계산시 다른 변수들은 상수로 취급한다

a = torch.tensor([1.0], requires_grad=True)
b = torch.tensor([2.0], requires_grad=True)

result = a * b

result.backward()

print(a.grad, b.grad)
```

```text
tensor([2.]) tensor([1.])
```

$a \times b$를 a로 미분하면 b(=2), b로 미분하면 a(=1)다.

### torch.no_grad()

- `with torch.no_grad():` 블록 안에서는 `requires_grad=True`인 tensor로 계산해도 `grad_fn`을 만들지 않는다. gradient를 계산하지 않는다
- 모델을 **평가하거나 추론할 때**는 gradient가 필요 없으므로 이 구문을 쓴다. 메모리와 시간이 절약된다

```python
x = torch.tensor([1.0], requires_grad=True)
y = x*2
print("결과:", y.data)
print("함수:", y.grad_fn)
```

```text
결과: tensor([2.])
함수: <MulBackward0 object at 0xf2196960aad0>
```

```python
with torch.no_grad(): # 추론 모델에는 필요없음
    y = x * 2
    print(y.data, y.grad_fn) #
```

```text
tensor([2.]) None
```

`no_grad` 안에서 계산한 결과는 `grad_fn`이 `None`이다.

> **보충** 노트북에는 이 셀 결과에 `MulBackward0`가 찍혀 있는데, `with` 블록 없이 실행했던 결과가 남아 있던 것으로 보인다. 다시 실행하면 위처럼 `None`이 나온다.

### gradient 초기화

- `backward()`로 계산한 gradient는 **누적**된다
- 반복 학습할 때는 한 번 업데이트한 뒤 다음 계산 전에 gradient를 **0으로 초기화**해야 한다

```python
# gradient는 backward()할때마다 gradient가 중첩되는 문제가 생긴다
# 따라서 다음 가중치를 구할때에는 값을 초기화하는 작업을 해야한다.
```

초기화를 안 하면 정말 쌓이는지 먼저 확인한다.

```python
# 보충: 초기화하지 않으면 gradient가 누적된다
w = torch.tensor([1.0], requires_grad=True)
for i in range(3):
    loss = (w * 3) ** 2
    loss.backward()
    print(f"{i+1}번째 backward 후 w.grad = {w.grad.item()}")
```

```text
1번째 backward 후 w.grad = 18.0
2번째 backward 후 w.grad = 36.0
3번째 backward 후 w.grad = 54.0
```

$\frac{d}{dw}(3w)^2 = 18w = 18$인데, 18 → 36 → 54로 쌓인다. 이 상태로 업데이트하면 엉뚱한 크기로 움직인다.

```python
import torch

input_data = torch.tensor([30.2])
weight = torch.tensor([0.2], requires_grad=True)
y_true = torch.tensor([10.0])

# --- [1바퀴째 루프] ---
y_pred = weight * input_data
loss = (y_true - y_pred) ** 2
loss.backward()

print(f"1바퀴째 변화율: {weight.grad.item():.4f}") # 정상 계산됨


# --- [★ 2바퀴째 루프 돌기 전 초기화 필수!] ---
# 방법 1: 직접 weight.grad 주머니를 0으로 비우기
if weight.grad is not None:
    weight.grad.zero_()  # _가 붙은 함수는 제자리에서 값을 바꿔버립니다.

print(f"초기화 후 변화율: {weight.grad.item():.4f}") # 0.0000 으로 청소 완료!


# --- [참고] 실전에서 딥러닝 모델(nn.Module)을 쓸 때 쓰는 명령어 ---
# optimizer.zero_grad()
# -> 실전에서는 이 한 줄로 모델 안의 모든 가중치 주머니를 한 번에 싹 청소합니다.
```

```text
1바퀴째 변화율: -239.1840
초기화 후 변화율: 0.0000
```

```python
# x.grad = None 값으로 (초기화방법)
```

`weight.grad = None`으로 지워도 된다. 실제 학습 코드에서는 `optimizer.zero_grad()` 한 줄로 모델의 모든 파라미터 gradient를 초기화한다. 다음 글의 학습 루프에서 쓴다.

## 정리

- Tensor는 NumPy ndarray와 거의 같지만 **숫자만** 담고, **GPU로 옮길 수 있고**, **자동 미분**을 지원한다
- 딥러닝 기본 dtype은 실수 float32, 정수 int64(long). 연산하는 tensor들은 **같은 장치**에 있어야 한다
- slicing에서 음수 step은 안 되고 `flip()`을 쓴다. `reshape`/`view` 결과는 원본과 메모리를 공유하니 독립 복사본은 `clone()`
- `unsqueeze`/`squeeze`로 dummy 축을, `transpose`/`permute`로 축 순서를 바꾼다. 이미지 `(H, W, C)` → `(C, H, W)`
- `@`(matmul)는 신경망 레이어의 기본 연산이고, `argmax(dim=1)`은 분류 결과를 꺼낼 때 쓴다
- `requires_grad=True` → 계산 → `backward()` → `.grad`에 gradient. 추론은 `no_grad()`, 반복 학습 전에는 gradient 초기화
