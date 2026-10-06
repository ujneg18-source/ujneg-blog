---
title: "제어문과 Comprehension: 조건·반복·간결한 표현"
description: "조건문과 반복문으로 실행 흐름을 제어하고 Comprehension, range, enumerate를 활용하는 방법을 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Python 기초'
seriesOrder: 4
originalNotebook: "04_제어문_컴프리헨션.ipynb"
tags: ["Python","Control Flow","Comprehension"]
date: 2026-04-14
---

> SKN31 Python 과정 노트북 `04_제어문_컴프리헨션.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 Python 3.13에서 순서대로 다시 실행한 결과이고, `input()`이 있는 셀은 입력값을 정해서 실행했습니다. 노트북 출력이 코드와 맞지 않던 셀이 몇 개 있어서 해당 위치에 적어 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 제어문: 조건문(`if`)과 반복문(`while`, `for in`)
- 코드블록과 들여쓰기, `pass`
- `continue`, `break`
- `range()`, `enumerate()`, `zip()`
- 컴프리헨션으로 리스트·딕셔너리·셋 만들기

## 제어문

프로그램은 기본적으로 **순차 구조**다. 작성한 순서대로 실행된다. 이 흐름을 다른 순서로 바꾸는 문법이 **제어문**이다.

| 종류 | 문법 | 하는 일 |
|---|---|---|
| 조건문 | `if` | 조건에 따라 흐름을 나눈다 |
| 반복문 | `while` | 조건이 True인 동안 반복한다 |
| | `for in` | Iterable의 값을 하나씩 꺼내며 반복한다 |

## 조건문: if

실행 도중 **조건에 따라 흐름이 나눠져야 할 때** 쓴다.

![조건문](/images/python/ch03_01.png)

입력받은 a의 값이 0인지에 따라 두 흐름으로 갈린다.

### 코드블록과 들여쓰기

> **코드블록(code block)** 은 여러 명령문을 묶어 놓은 것이다. 묶인 명령문은 같이 실행되거나 같이 실행되지 않는다.
> Python은 **들여쓰기로 코드블록을 묶는다.** 같은 칸만큼 들여 쓴 명령문이 한 블록이고, 관례적으로 **공백 4칸**을 쓴다.

> **pass**
> 제어문이나 함수의 body는 비워 둘 수 없다. 명령문이 최소 하나는 있어야 한다. 아직 쓸 내용이 없을 때 `pass`(또는 `...`)를 넣는다.

### if

조건이 True일 때만 블록을 실행한다.

```python
if 조건:     # 조건은 bool 표현식. 끝에 : 을 붙여 코드블록을 시작한다
    명령문1  # 조건이 True면 실행할 구문
    명령문2
```

```python
print("숫자를 입력받습니다.")  # 1번
num = int(input("숫자:"))      # 2번
if num == 0:                   # 3번: 조건문의 선언부
    print("0입니다.")          # 3-1
    print("Zero")              # 3-2
print("종료")                  # 4번
```

```text
숫자를 입력받습니다.
숫자:0
0입니다.
Zero
종료
```

```python
print("숫자를 입력받습니다.")
num = int(input("숫자:"))
if num == 0:
    pass  # 할 일이 없어도 블록은 비울 수 없다
print("종료")
```

```text
숫자를 입력받습니다.
숫자:5
종료
```

실행할 명령문이 하나면 `if num == 0: print("Zero")`처럼 한 줄에 써도 된다.

### if - else

```python
if 조건:
    명령문1  # 조건이 True일 때
else:
    명령문2  # 조건이 False일 때
```

```python
num = 10
if num == 0:
    print("0입니다.")
    print("Zero")
else:  # num == 0 이 False인 경우 할 일
    print("0이 아닙니다.")
    print("Not Zero")
print("종료")
```

```text
0이 아닙니다.
Not Zero
종료
```

### if - elif - else

조건이 여러 개면 `elif`를 쓴다. **위에서부터 차례로** 비교하다가 처음 True인 블록 하나만 실행한다. `else`는 생략할 수 있다.

```python
num1, num2 = 10, 20
oper = "X"  # 원래는 input("사칙연산자(+, -, *, /):").strip()

if oper == "+":
    result = num1 + num2
elif oper == "-":
    result = num1 - num2
elif oper == "*":
    result = num1 * num2
elif oper == "/":
    result = num1 / num2
else:
    result = f"{oper} 은 잘못된 연산자 입니다."

print("결과: ", result)
```

```text
결과:  X 은 잘못된 연산자 입니다.
```

### 중첩 if: 월별 일수

월을 입력받아 그 달이 며칠까지 있는지 출력하는 셀이다. 필기의 코드 그대로다.

```python
month_str = input("월:")
if month_str.isdigit():  # 문자열이 숫자로만 돼 있는지
    month = int(month_str)
    # 1, 3, 5, 7, 8, 10, 12 -> 31일
    # 4, 6, 9, 11 -> 30일
    # 2 -> 28/29
    if month in [1, 3, 5, 7, 8, 9, 12]:
        print(f"{month}월 은 31일까지 있습니다.")
    elif month in [4, 6, 9, 11]:
        print(f"{month}월 은 30일까지 있습니다.")
    elif month == 2:
        print(f"{month}월 은 28/29일까지 있습니다.")
    else:
        print(f"{month}는 잘못된 월입니다.")
```

```text
월:10
10는 잘못된 월입니다.
```

> **보충 · 리스트에 10 대신 9가 들어가 있다**
> 주석에는 31일인 달을 `1, 3, 5, 7, 8, 10, 12`로 적었는데 코드에는 `[1, 3, 5, 7, 8, 9, 12]`라고 썼다. 그래서 **10월은 "잘못된 월"** 이 되고, **9월은 31일**이라고 나온다. 9가 30일 리스트에도 있지만 위의 조건이 먼저 걸리기 때문이다. 노트북에는 이 셀의 출력이 `False`로 남아 있어서 드러나지 않았다.

```python
month = int(input("월:"))
if month in [1, 3, 5, 7, 8, 9, 12]:
    print(f"{month}월 은 31일까지 있습니다.")
elif month in [4, 6, 9, 11]:
    print(f"{month}월 은 30일까지 있습니다.")
```

```text
월:9
9월 은 31일까지 있습니다.
```

고친 버전이다. 모든 달을 넣어 확인했다.

```python
for month in [2, 9, 10, 13]:
    if month in [1, 3, 5, 7, 8, 10, 12]:
        print(f"{month}월 은 31일까지 있습니다.")
    elif month in [4, 6, 9, 11]:
        print(f"{month}월 은 30일까지 있습니다.")
    elif month == 2:
        print(f"{month}월 은 28/29일까지 있습니다.")
    else:
        print(f"{month}는 잘못된 월입니다.")
```

```text
2월 은 28/29일까지 있습니다.
9월 은 30일까지 있습니다.
10월 은 31일까지 있습니다.
13는 잘못된 월입니다.
```

### 조건 자리에 bool이 아닌 값

조건 자리에 다른 타입이 오면 bool로 바뀐다. 빈 자료구조, 0글자 문자열, 0, None은 False다.

```python
if []:
    print("A")
print("종료")
```

```text
종료
```

```python
cust_id = ""  # ID를 입력
# if len(cust_id) > 0:  와 같은 의미
if cust_id:  # 0글자: False, 1글자 이상: True
    print("가입처리")
print("끝")
```

```text
끝
```

빈 문자열이라 "가입처리"는 출력되지 않는다.

> **보충** 노트북에는 이 셀 출력이 "가입처리"로 남아 있었다. `cust_id`에 값이 있던 상태로 실행하고 나서 `""`로 바꾼 것으로 보인다.

## 반복문

같은 코드를 여러 번 실행하거나, 일정하게 변하는 값으로 같은 코드를 반복할 때 쓴다.

![반복문](/images/python/ch03_02.png)

count가 limit보다 크거나 같아질 때까지 count를 1씩 늘리며 출력한다.

### while 문

**조건이 True인 동안** 블록을 반복한다.

```python
while 조건:
    반복할 구문1
    반복할 구문2
```

```python
limit = int(input("정수:"))  # 1번
count = 0                    # 2번
while count < limit:         # 3번: count가 limit보다 작은 동안 반복
    print(count, "번 라인")
    count += 1               # count = count + 1
print("종료")                # 4번
```

```text
정수:5
0 번 라인
1 번 라인
2 번 라인
3 번 라인
4 번 라인
종료
```

`count += 1`을 빼먹으면 조건이 영원히 True라서 끝나지 않는다(무한 루프).

### for in 문

**Iterable**이 가진 값을 하나씩 꺼내 처리한다. Iterable은 List, Tuple, Dictionary, Set, 문자열처럼 값을 하나씩 제공하는 객체다.

```python
for 변수 in Iterable:
    반복구문  # 변수에 이번 차례의 값이 들어 있다
```

```python
# list의 모든 정수에 10을 더한 값을 출력 → 일괄처리
l = [10, -2, 5, 90]
for value in l:  # value: 꺼낸 원소를 저장할 변수
    result = value + 10
    print(result)
```

```text
20
8
15
100
```

결과를 모으려면 반복 전에 빈 리스트를 만들고 `append`한다.

```python
t = (100, 200, -300)
result = []
for v in t:
    result.append(v + 10)
print("최종결과:", result)
```

```text
최종결과: [110, 210, -290]
```

Dictionary를 돌리면 **key**를 준다.

```python
d = dict(a=1, b=2, c=3)
for key in d:
    print(key, d[key])
```

```text
a 1
b 2
c 3
```

원소가 자료구조이고 개수가 모두 같으면, 받는 변수를 여러 개 써서 바로 풀 수 있다(튜플 대입).

```python
a = [(1, 2), (2, 3), (4, 5), (6, 7)]
for v1, v2 in a:
    print(v1, v2, v1 + v2)
```

```text
1 2 3
2 3 5
4 5 9
6 7 13
```

### continue와 break

| 키워드 | 동작 |
|---|---|
| `continue` | **이번 반복**을 중단하고 다음 반복으로 넘어간다 |
| `break` | **반복문 전체**를 중단한다 |

보통 특정 조건에서 실행하므로 `if` 안에 쓴다.

```python
l = [1, 2, 3, "quit", 4, 5]
for v in l:
    print(v)
    if v == "quit":
        break
```

```text
1
2
3
quit
```

```python
l = [1, 2, 3, 4, 5, 6, 7, 8]
# 3의 배수만 출력
for v in l:
    if v % 3 != 0:  # 3의 배수가 아닌 조건
        continue
    print(v)
```

```text
3
6
```

사용자가 `!q`를 입력할 때까지 받으면서, 숫자 형태인 것만 저장하는 예다.

```python
print("종료하려면 '!q'를 입력하세요")
num = input("입력")
result = []

while num != "!q":
    if not num.isdigit():  # 숫자 형태가 아니면
        num = input("입력")
        continue
    result.append(num)
    num = input("입력")

print(result)
```

```text
종료하려면 '!q'를 입력하세요
입력1
입력abc
입력29
입력-5
입력233
입력!q
['1', '29', '233']
```

> **보충** `isdigit()`은 **모든 글자가 숫자인지**를 본다. 그래서 `-5`는 `-` 때문에 False가 돼 저장되지 않았다. 음수까지 받으려면 `int()`로 바꿔 보고 실패하면 건너뛰는 방식(예외 처리)을 쓴다. 또 저장된 값은 여전히 문자열(`'1'`)이다.

`while True`로 무한 반복을 만들고, 조건이 맞을 때 `break`로 빠져나오는 패턴도 많이 쓴다.

```python
from random import randint, seed

seed(8)  # 보충: 글에서 같은 결과가 나오도록 고정. 노트북에는 없다
pos = []
neg = []
# -100 ~ 100 사이 랜덤값 생성. 양수는 pos, 음수는 neg에 담고 0이면 종료
while True:
    v = randint(-100, 100)  # -100 ~ 100 사이의 랜덤 정수
    if v > 0:
        pos.append(v)
    elif v < 0:
        neg.append(v)
    else:
        print("0이므로 종료")
        break

print(len(pos), len(neg))
print(pos[:10])
```

```text
0이므로 종료
100 112
[80, 29, 2, 64, 17, 24, 16, 26, 46, 3]
```

-100 ~ 100은 201개라서 0이 나올 확률은 매번 1/201이다. 평균 200번쯤 돌아야 끝나니 리스트가 꽤 길어진다. 노트북에서도 양수·음수가 각각 100개 넘게 쌓였다.

## for in 문과 함께 쓰는 내장 함수

### range()

일정한 간격의 연속된 정수를 제공하는 Iterable을 만든다. 값은 모두 정수만 된다.

| 호출 | 제공하는 값 |
|---|---|
| `range(멈춤)` | 0 ~ 멈춤-1 |
| `range(시작, 멈춤)` | 시작 ~ 멈춤-1 |
| `range(시작, 멈춤, 간격)` | 시작 ~ 멈춤-1, 간격만큼 증가. 간격이 음수면 내림차순 |

```python
print(range(20))
for v in range(10, 20, 2):
    print(v, end="\t")
print()
for v in range(10, 20):
    print(v, end="\t")
print()
for v in range(10):
    print(v, end="\t")
```

```text
range(0, 20)
10	12	14	16	18	
10	11	12	13	14	15	16	17	18	19	
0	1	2	3	4	5	6	7	8	9	
```

값을 쓰지 않고 횟수만 반복할 때는 변수 이름을 `_`로 쓰는 관례가 있다.

```python
for _ in range(3):
    print("반복할 내용")
```

```text
반복할 내용
반복할 내용
반복할 내용
```

`range()`도 Iterable이라 리스트나 튜플로 바꿀 수 있다.

```python
print(list(range(1, 101, 5)))
print(tuple(range(10)))
print(list(range(10, 0, -3)))  # 보충: 간격이 음수면 거꾸로
```

```text
[1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71, 76, 81, 86, 91, 96]
(0, 1, 2, 3, 4, 5, 6, 7, 8, 9)
[10, 7, 4, 1]
```

### enumerate()

`enumerate(Iterable, start=0)`: **몇 번째 값인지(index)와 값**을 튜플로 묶어서 준다. `start`로 시작 번호를 정한다.

```python
l = [100, -20, 200, 30, 7]
for v in enumerate(l):  # (몇 번째인지, 값)
    print(v)
```

```text
(0, 100)
(1, -20)
(2, 200)
(3, 30)
(4, 7)
```

```python
for i, v in enumerate(l):  # 튜플 대입으로 받기
    print(f"{i + 1}. {v}")
```

```text
1. 100
2. -20
3. 200
4. 30
5. 7
```

```python
for i, v in enumerate(l, start=100):
    print(f"{i}. {v}")
```

```text
100. 100
101. -20
102. 200
103. 30
104. 7
```

### zip()

`zip(Iterable1, Iterable2, ...)`: 여러 Iterable에서 **같은 index의 값끼리** 튜플로 묶는다. 개수가 다르면 **가장 짧은 것에 맞춘다.**

```python
names = ["홍길동", "이순신", "유관순"]
ages = [20, 30, 40, 50, 60, 70]
addresses = ["서울", "부산", "병천"]

for info in zip(names, ages, addresses):
    print(info)

for name, age, address in zip(names, ages, addresses):
    print(f"이름: {name}, 나이: {age}, 주소: {address}")
```

```text
('홍길동', 20, '서울')
('이순신', 30, '부산')
('유관순', 40, '병천')
이름: 홍길동, 나이: 20, 주소: 서울
이름: 이순신, 나이: 30, 주소: 부산
이름: 유관순, 나이: 40, 주소: 병천
```

`ages`는 6개지만 3개까지만 쓰였다. 남는 값은 **조용히 버려진다.**

> **보충** 개수가 다르면 에러를 내게 하려면 `zip(..., strict=True)`를 준다(Python 3.10~).

```python
list(zip(names, ages, strict=True))
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: zip() argument 2 is longer than argument 1</div></div>

## 컴프리헨션 (Comprehension)

기존 Iterable의 원소로 **새 자료구조를 만드는 구문**이다.

- 원소를 **처리한 결과**나, **조건이 True인 원소**를 새 자료구조에 담을 때 쓴다.
- 만들 자료구조에 따라 리스트, 딕셔너리, 셋 컴프리헨션이 있다. 딕셔너리·셋 컴프리헨션은 Python 3에서 추가됐다.
- 튜플 컴프리헨션은 없고 `tuple()` 함수로 만든다.

| 형태 | 결과 |
|---|---|
| `[식 for 변수 in Iterable]` | list |
| `{식 for 변수 in Iterable}` | set |
| `{키식: 값식 for 변수 in Iterable}` | dict |
| `(식 for 변수 in Iterable)` | **generator** (tuple 아님) |

### 처리한 결과 담기

```python
l = list(range(1, 11))

# for 문으로: l의 모든 값에 * 5 한 것을 다른 list에 추가
result = []
for v in l:
    result.append(v * 5)
print(result)

# 컴프리헨션으로
result2 = [v * 5 for v in l]
print(result2)
```

```text
[5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
[5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
```

> **보충** 노트북의 `result2` 셀에는 `[1, 2, ..., 10]`이 출력돼 있었다. 이 셀을 `[v for v in l]`로 먼저 실행한 뒤 고친 것으로 보인다. 다시 실행하면 for 문과 같은 결과가 나온다.

```python
result3 = {v * 5 for v in l}              # set
result4 = {f"{v}번": v * 5 for v in l}     # dict {k: v}
print(result3)
print(result4)
```

```text
{35, 5, 40, 10, 45, 15, 50, 20, 25, 30}
{'1번': 5, '2번': 10, '3번': 15, '4번': 20, '5번': 25, '6번': 30, '7번': 35, '8번': 40, '9번': 45, '10번': 50}
```

### 조건에 맞는 것만 담기

```python
# for 문으로: l의 원소 중 짝수만 추출해서 저장
result_even = []
for v in l:
    if v % 2 == 0:
        result_even.append(v)
print(result_even)

# 컴프리헨션으로
result_even2 = [v for v in l if v % 2 == 0]
print(result_even2)
```

```text
[2, 4, 6, 8, 10]
[2, 4, 6, 8, 10]
```

for 문과 컴프리헨션은 이렇게 대응한다.

```python
l2 = []
for v in l:
    if 조건:
        l2.append(v)

l2 = [v for v in l if 조건]
```

### ( )는 튜플이 아니다

```python
(v for v in l)
```

```text
<generator object <genexpr> at 0x7f55da479480>
```

소괄호로 감싸면 튜플이 아니라 **generator**가 나온다. 값을 미리 만들지 않고 요청할 때마다 하나씩 만드는 Iterable이다. 그래서 컴프리헨션 식은 Iterable을 받는 함수에 바로 넣을 수 있다.

```python
print(tuple(v for v in l))  # 튜플 컴프리헨션은 tuple() 함수로
print(list(v * 5 for v in l))
print(sum(v for v in l))    # 보충: 합계처럼 결과를 저장할 필요가 없을 때 유용
```

```text
(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
[5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
55
```

### 중첩 for

for를 두 번 쓰면 바깥 for가 먼저 온다. 아래 주석의 for 문과 같은 순서로 쓰면 된다.

```python
l = [[1, 2], [3, 4]]

# r = []
# for v in l:
#     for value in v:
#         if value > 0:
#             r.append(value)

[value for v in l for value in v if value > 0]
```

```text
[1, 2, 3, 4]
```

## 연습 문제

```python
# (1) 점수 구간에 맞게 학점을 출력하세요.
# 91 ~ 100: A, 81 ~ 90: B, 71 ~ 80: C, 61 ~ 70: D, 60 이하: F
for jumsu in [55, 91, 90, 101]:
    if jumsu < 0 or jumsu > 100:
        print(f"{jumsu}는 잘못된 점수입니다. 0 ~ 100 사이의 점수를 입력하세요.")
    elif jumsu >= 91:
        print(f"{jumsu}: A학점")
    elif jumsu >= 81:
        print(f"{jumsu}: B학점")
    elif jumsu >= 71:
        print(f"{jumsu}: C학점")
    elif jumsu >= 61:
        print(f"{jumsu}: D학점")
    else:
        print(f"{jumsu}: F학점")
```

```text
55: F학점
91: A학점
90: B학점
101는 잘못된 점수입니다. 0 ~ 100 사이의 점수를 입력하세요.
```

경계값(90, 91)과 범위 밖 값을 같이 넣어 확인했다. 범위 검사를 맨 앞에 둬서 `jumsu >= 91`에 101이 걸리지 않게 한 게 포인트다.

```python
# (2) ID가 5글자 이상이면 "사용할 수 있습니다." 미만이면 "사용할 수 없는 ID입니다."
cust_id = input("ID:").strip()
if len(cust_id) >= 5:
    print("사용할 수 있습니다.")
else:
    print("사용할 수 없는 ID 입니다.")
```

```text
ID:  python  
사용할 수 있습니다.
```

```python
# (3) 서울이면 "특별시", 인천·부산·광주·대구·대전·울산이면 "광역시", 나머지는 "특별시나 광역시가 아닙니다."
city = input("도시명:")
if city == "서울":
    print(f"{city}는 특별시")
elif city in ["인천", "부산", "광주", "대구", "대전", "울산"]:
    print(f"{city}는 광역시")
else:
    print(f"{city}는 특별시나 광역시가 아닙니다.")
```

```text
도시명:독산
독산는 특별시나 광역시가 아닙니다.
```

```python
# (4) 리스트의 평균을 구하시오.
jumsu = [100, 90, 100, 80, 70, 100, 80, 90, 95, 85]

sum_result = 0
for value in jumsu:
    sum_result = sum_result + value  # sum_result += value
print(f"총합: {sum_result}")

avg_result = sum_result / len(jumsu)
print(f"평균점수: {avg_result}")
print(sum(jumsu) / len(jumsu))  # 보충: 내장 함수 sum()으로 한 줄
```

```text
총합: 890
평균점수: 89.0
89.0
```

```python
# (5) 평균 이상은 pass, 미만은 fail을 번호와 함께 출력하시오. (ex: 0-pass, 1-pass, 2-fail)
for idx, v in enumerate(jumsu, start=1):
    print(f"{idx}-{'pass' if v >= avg_result else 'fail'} {v}점")
```

```text
1-pass 100점
2-pass 90점
3-pass 100점
4-fail 80점
5-fail 70점
6-pass 100점
7-fail 80점
8-pass 90점
9-pass 95점
10-fail 85점
```

> **보충 · f-string 안의 따옴표**
> 노트북에는 `f"{idx}-{"pass" if ...}"`처럼 **바깥과 같은 큰따옴표**를 f-string 안에 썼다. 이건 Python 3.12부터 허용된 문법이라 3.11 이하에서는 SyntaxError가 난다. 안쪽을 작은따옴표로 바꾸면 버전과 상관없이 동작한다.
> 처음 버전은 `cnt` 변수를 직접 1씩 늘렸는데, `enumerate(start=1)`로 바꾸니 번호 관리 코드가 사라졌다.

```python
# (6) 리스트 값들 중 최대값을 조회해 출력하시오.
jumsu = [60, 90, 80, 80, 70, 55, 80, 90, 95, 85]

max_value = jumsu[0]
for v in jumsu:
    if v > max_value:
        max_value = v
print(f"최고점수: {max_value}")
print(max(jumsu))  # 보충: 내장 함수 max()
```

```text
최고점수: 95
95
```

```python
# (7) "쥐"와 "토끼"를 제외한 나머지를 출력하세요.
str_list = ["쥐", "소", "호랑이", "토끼", "용", "토끼", "뱀", "돼지", "호랑이"]
for v in str_list:
    if v not in ["쥐", "토끼"]:
        print(v, end=" ")
```

```text
소 호랑이 용 뱀 돼지 호랑이 
```

```python
# (8) 정수를 입력받아 그 단의 구구단을 출력하시오. (2 x 1 = 2 ... 2 x 9 = 18)
num_str = input("단을 입력하세요:").strip()
if num_str.isdigit():
    num = int(num_str)
    for value in range(1, 9):  # 1 ~ 9, 1씩 증가
        print(f"{num} X {value} = {num * value}")
else:
    print("단은 정수만 입력하세요.")
```

```text
단을 입력하세요:7
7 X 1 = 7
7 X 2 = 14
7 X 3 = 21
7 X 4 = 28
7 X 5 = 35
7 X 6 = 42
7 X 7 = 49
7 X 8 = 56
```

> **보충 · `range(1, 9)`는 8까지다**
> 주석에는 "1 ~ 9"라고 적었지만 `range`는 멈춤값을 포함하지 않으니 **8까지만** 나온다. 위 결과에도 `7 X 9`가 없다. 노트북에는 9줄이 출력돼 있었는데, `range(1, 10)`으로 실행한 뒤 코드를 다시 바꾼 것으로 보인다. 9까지 하려면 `range(1, 10)`이다.

```python
for value in range(1, 10):
    print(f"7 X {value} = {7 * value}")
```

```text
7 X 1 = 7
7 X 2 = 14
7 X 3 = 21
7 X 4 = 28
7 X 5 = 35
7 X 6 = 42
7 X 7 = 49
7 X 8 = 56
7 X 9 = 63
```

### 컴프리헨션 문제

```python
# (9) 값에 두 배(* 2)를 가지는 새로운 리스트를 만드시오.
lst = [10, 10, 10, 30, 70, 5, 120, 700, 1, 35]
print([v * 2 for v in lst])
print({v * 2 for v in lst})  # set으로 하면 중복이 사라지고 순서가 바뀐다
```

```text
[20, 20, 20, 60, 140, 10, 240, 1400, 2, 70]
{2, 70, 10, 140, 240, 20, 1400, 60}
```

```python
# (10) (원래값, 10배값) 튜플 묶음을 가지는 리스트를 만드시오.
lst = [10, 30, 70, 5, 5, 120, 700, 1, 35, 35]
print([(v, v * 10) for v in lst])
```

```text
[(10, 100), (30, 300), (70, 700), (5, 50), (5, 50), (120, 1200), (700, 7000), (1, 10), (35, 350), (35, 350)]
```

```python
# (11) 3의 배수만 가지는 리스트를 만드시오.
lst2 = [3, 20, 33, 21, 33, 8, 11, 10, 7, 17, 60, 120, 2]
print([v for v in lst2 if v % 3 == 0])  # 특정 조건의 값들만 선택할 때
```

```text
[3, 33, 21, 33, 60, 120]
```

```python
# (12) 확장자가 exe인 파일만 골라서 새로운 리스트에 담으시오.
file_names = ["test.txt", "a.exe", "jupyter.bat", "function.exe", "b.exe", "cat.jpg", "dog.png", "run.exe", "i.dll"]
[file_name for file_name in file_names if file_name.endswith(".exe")]
```

```text
['a.exe', 'function.exe', 'b.exe', 'run.exe']
```

```python
# (13) 10글자 이상인 파일명(확장자 포함)만 가지는 리스트를 만드시오.
file_names = ["mystory.txt", "a.exe", "jupyter.bat", "function.exe", "b.exe", "cat.jpg", "dog.png", "run.exe", "i.dll"]
print([f for f in file_names if len(f) >= 10])
print({f: len(f) for f in file_names if len(f) >= 10})  # 글자 수 확인용으로 dict
```

```text
['mystory.txt', 'jupyter.bat', 'function.exe']
{'mystory.txt': 11, 'jupyter.bat': 11, 'function.exe': 12}
```

```python
# (14) 소문자만 가지는 새로운 리스트를 만드시오.
print("abcdE".islower(), "abcd".islower(), "ABC".isupper(), "aABC".isupper())

str_list = ["A", "B", "c", "D", "E", "F", "g", "h", "I", "J", "k"]
[v for v in str_list if v.islower()]
```

```text
False True True False
```

```text
['c', 'g', 'h', 'k']
```

## 정리

- Python은 **들여쓰기로 코드블록**을 만든다. 블록을 비워 둘 땐 `pass`.
- `if-elif`는 위에서부터 처음 맞는 조건 하나만 실행한다. 그래서 조건 순서가 결과를 바꾼다(월별 일수 버그).
- `while`은 조건이 True인 동안, `for in`은 Iterable의 값이 남아 있는 동안 반복한다.
- `range(a, b)`는 b를 포함하지 않는다. 구구단 버그의 원인이다.
- `enumerate()`는 번호를, `zip()`은 같은 index끼리 묶은 값을 준다. `zip()`은 짧은 쪽에 맞추고 나머지를 버린다.
- 컴프리헨션: `[식 for 변수 in Iterable if 조건]`. `( )`로 감싸면 튜플이 아니라 generator다.
- 노트북은 셀 수정 후 다시 실행하지 않으면 **출력이 코드와 어긋난다.** 정리할 때는 처음부터 다시 실행해 보는 게 좋다.
