---
title: "함수: Parameter·Argument·Return 이해하기"
description: "함수를 정의하고 호출하는 방법부터 매개변수, 반환값, 일급 함수와 Lambda까지 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Python 기초'
seriesOrder: 5
originalNotebook: "05_함수.ipynb"
tags: ["Python","Function","Lambda"]
date: 2026-04-16
---

> SKN31 Python 과정 노트북 `05_함수.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 Python 3.13에서 순서대로 다시 실행한 결과입니다. 노트북 출력이 코드와 맞지 않던 셀은 해당 위치에 적어 두었고, `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 함수의 정의와 호출, 선언부와 구현부
- parameter, argument, return value
- 기본값 parameter, positional·keyword argument
- 가변인자 `*args`, `**kwargs`와 parameter 순서
- 지역변수와 전역변수
- 일급 시민으로서의 함수, callback, lambda
- `sorted`, `filter`, `map`에 함수 넘기기
- docstring과 타입 힌트

## 함수란

하나의 작업·기능·동작을 처리하는 **사용자 정의 연산자**다.

- 값을 **입력(Input)** 받아 **처리**하고 결과를 **출력(Output)** 하는 과정을 정의한 것이다.
- 한 번 만들면 같은 작업이 필요할 때마다 재사용한다.
- 함수를 만들어 실행환경에 등록하는 것을 **정의(define)**, 정의된 함수를 사용하는 것을 **호출(call)** 이라고 한다.
- Python의 함수는 **일급 시민 객체(First Class Object)** 다. 뒤에서 다룬다.

### 함수 정의 구문

```python
def 함수이름(매개변수, 매개변수, ...):  # 선언부(Header)
    # 구현부(Body)
    실행구문1
    실행구문2
    return 결과값                        # 결과가 없으면 생략
```

| 부분 | 내용 |
|---|---|
| 선언부(Header) | 함수 이름과, 입력값을 받을 변수(**Parameter, 매개변수**)를 지정한다. 끝에 `:` |
| 구현부(Body) | 호출됐을 때 실행할 구문. 들여쓰기(보통 공백 4칸)로 묶는다 |
| `return` | 처리 결과가 있으면 넣는다. 없으면 생략할 수 있다 |

- Parameter는 0개 이상 선언할 수 있다.
- 함수 이름은 보통 **동사형**, **snake_case**(소문자 + `_`)로 짓는다.

### 입력도 반환도 없는 함수

```python
def greet():  # 선언부
    # 구현부 - 함수가 실행할 구문
    print("안녕하세요.")
    print("반갑습니다.")

greet()  # 함수 호출: [변수 = ]함수이름([전달값])
greet()
```

```text
안녕하세요.
반갑습니다.
안녕하세요.
반갑습니다.
```

### 입력이 있는 함수

```python
def greet2(name, address):
    print(f"{address}에 사는 {name}님 안녕하세요. 반갑습니다.")

greet2("이순신", "서울")
greet2("홍길동", "인천")
```

```text
서울에 사는 이순신님 안녕하세요. 반갑습니다.
인천에 사는 홍길동님 안녕하세요. 반갑습니다.
```

parameter 개수만큼 값을 넘기지 않으면 에러가 난다.

```python
greet2()
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: greet2() missing 2 required positional arguments: &#x27;name&#x27; and &#x27;address&#x27;</div></div>

```python
greet2("홍길동")
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: greet2() missing 1 required positional argument: &#x27;address&#x27;</div></div>

### 입력과 반환이 있는 함수

`print()`는 화면에 보여 주고 끝나지만, `return`한 값은 **호출한 곳에서 다시 쓸 수 있다.**

```python
def greet3(name, address):
    value = f"{address}에 사는 {name}님 안녕하세요. 반갑습니다."
    return value

greet_value = greet3("유관순", "광주")
print(greet_value)
print(greet_value, "를 파일에 저장")
```

```text
광주에 사는 유관순님 안녕하세요. 반갑습니다.
광주에 사는 유관순님 안녕하세요. 반갑습니다. 를 파일에 저장
```

### 내장 함수와 같은 이름으로 정의하면

노트북에 `int`라는 이름으로 함수를 정의해 본 셀이 있다.

```python
def int(num_str):
    # num_str -> 정수로 변환하는 코드
    result = "변환한 값"
    return result

v1 = int("30")
v2 = int("50")
v3 = v1 + v2
print(v3)
```

```text
변환한 값변환한 값
```

> **보충 · 내장 함수가 가려진다**
> 노트북에는 이 셀의 출력이 `80`으로 남아 있었는데, 그건 `def int`를 실행하기 **전에** 돌린 결과다. 정의한 뒤에는 Python 내장 `int()` 대신 방금 만든 함수가 불려서 `"변환한 값"` 두 개가 이어 붙는다.
> 같은 이름으로 정의하면 **나중 것이 앞의 것을 가린다.** `int`, `list`, `sum`, `id`, `type` 같은 이름을 변수나 함수 이름으로 쓰면 이후 코드가 엉뚱하게 동작한다. 실수로 가렸다면 `del`로 지우면 내장 함수가 다시 보인다.

```python
del int
print(int("30") + int("50"))
```

```text
80
```

## parameter와 return value

| 용어 | 뜻 |
|---|---|
| **parameter**(매개변수) | 호출하는 곳에서 넘겨준 값을 저장하는 **변수** |
| **argument**(전달인자) | 호출할 때 parameter에 전달하는 **값** |
| **return value**(반환값) | 처리 결과로 호출한 곳에 돌려주는 값 |

### return

- `return`: 함수를 정상적으로 끝내고 호출한 곳으로 돌아간다. 보통 마지막에 두지만 중간에 올 수도 있다.
- `return 값`: 값을 가지고 돌아간다.
- 반환값이 없거나 `return` 구문이 없으면 **`None`** 을 반환한다.

```python
def test():
    if 종료조건:
        return    # 여기서 바로 끝낸다
    실행구문
```

```python
result = greet()
print(result)
```

```text
안녕하세요.
반갑습니다.
None
```

`greet()`에는 `return`이 없으니 `None`이 반환됐다.

### 여러 값 반환

함수는 **값을 하나만** 반환할 수 있다. 여러 값은 자료구조로 묶는다. `return a, b`처럼 나열하면 **튜플**로 묶여 나간다.

```python
def calc(num1, num2):
    # 두 수의 사칙연산 결과를 반환
    v1 = num1 + num2
    v2 = num1 - num2
    v3 = num1 * num2
    v4 = num1 / num2
    return v1, v2, v3, v4  # 값 나열 → 튜플로 반환

result = calc(10, 5)
print(result)

a, b, c, d = calc(100, 20)  # 튜플 대입으로 받기
print(a, b, c, d)
```

```text
(15, 5, 50, 2.0)
120 80 2000 5.0
```

## Parameter

### 기본값이 있는 parameter

- parameter에 값을 대입해 두면, 호출할 때 argument가 없을 때 그 **기본값**을 쓴다.
- 기본값 없는 parameter와 있는 parameter를 같이 쓸 수 있다. 단 **기본값 없는 것을 먼저** 선언한다.

```python
# name: 필수 파라미터. 반드시 값을 전달해야 한다
def greet4(name):
    return f"{name}님 안녕하세요."

def greet5(name=None):
    if name:
        return f"{name}님 안녕하세요."
    else:
        return "안녕하세요."

print(greet4("홍길동"))
print(greet5("이순신"))  # argument를 전달하면 그 값이 대입된다
print(greet5())          # 안 넘기면 기본값이 대입된다
```

```text
홍길동님 안녕하세요.
이순신님 안녕하세요.
안녕하세요.
```

순서를 거꾸로 쓰면 정의할 때부터 문법 오류다.

```python
def print_info(name, age=0, address, tall, weight):
    print(name, age, address, tall, weight)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · SyntaxError: parameter without a default follows parameter with a default</div></div>

```python
def print_info(name, address, tall=0.0, weight=0.0, age=0):
    print(name, address, tall, weight, age)

print_info("이순신", "서울")
print_info("이순신", "서울", 190.2)
```

```text
이순신 서울 0.0 0.0 0
이순신 서울 190.2 0.0 0
```

`print()`의 `sep`, `end`도 기본값이 있는 parameter다. 그래서 평소엔 생략하고, 바꿀 때만 넘긴다.

### Positional argument와 Keyword argument

| | Positional argument | Keyword argument |
|---|---|---|
| 형식 | `f(값1, 값2)` | `f(parameter이름=값)` |
| 대응 기준 | **순서** | **이름** |
| 좋은 점 | 짧다 | 순서 상관없음. 뒤쪽 parameter만 골라서 넘길 수 있다 |

```python
print_info("이순신", "서울시", 184.2)  # positional
print_info(name="유관순", weight=62.1, tall=175.4, age=20, address="인천")  # keyword
```

```text
이순신 서울시 184.2 0.0 0
유관순 인천 175.4 62.1 20
```

parameter가 많고 대부분 기본값이 있을 때 keyword argument가 특히 편하다.

```python
def print_info2(name=None, address=None, tall=0.0, weight=0.0, age=0):
    print(name, address, tall, weight, age)

print_info2(None, None, 0.0, 0.0, 30)  # age만 바꾸려는데 앞을 다 채워야 한다
print_info2(age=30)                    # 이름으로 바로
```

```text
None None 0.0 0.0 30
None None 0.0 0.0 30
```

## 가변인자 (Variable Length Argument)

함수를 정의할 때 argument 개수를 정해 두지 않고, **호출할 때 개수를 정해서** 넘길 수 있게 하는 방법이다.

| 종류 | 선언 | 받는 것 | 함수 안에서의 타입 |
|---|---|---|---|
| 위치 가변인자 | `*args` | 여러 개의 positional argument | **tuple** |
| 키워드 가변인자 | `**kwargs` | 여러 개의 keyword argument | **dict** |

`*`, `**` 뒤 이름은 아무거나 써도 되지만 관례적으로 `args`, `kwargs`를 쓴다.

### *args

리스트 하나를 받는 함수와 비교하면 차이가 보인다.

```python
# 나이 여러 개를 받아서 출력 - 리스트로 받기
def print_ages(ages):
    for a in ages:
        print(a, end=" ")

print_ages([10, 20, 30, 40])
```

```text
10 20 30 40 
```

```python
def print_ages2(*ages):
    print(type(ages), ages)

print_ages2(32, 30, 10, 60, 50, 40, 43)
print_ages2()           # 빈 튜플
print_ages2(10)         # 원소 하나짜리 튜플
print_ages2([10, 20, 30])  # 리스트 하나가 원소 하나로 들어간다
```

```text
<class 'tuple'> (32, 30, 10, 60, 50, 40, 43)
<class 'tuple'> ()
<class 'tuple'> (10,)
<class 'tuple'> ([10, 20, 30],)
```

자료구조의 원소를 **풀어서** 넘기려면 호출할 때 `*`를 붙인다.

```python
l = [32, 34, 53, 21, 30]
print_ages2(*l)  # print_ages2(32, 34, 53, 21, 30)와 같다
```

```text
<class 'tuple'> (32, 34, 53, 21, 30)
```

### **kwargs

```python
def print_info(**info):
    print(type(info), info)

print_info(name="홍길동", age=20, address="서울")
print_info()
print_info(name="이순신", tall=190)
```

```text
<class 'dict'> {'name': '홍길동', 'age': 20, 'address': '서울'}
<class 'dict'> {}
<class 'dict'> {'name': '이순신', 'tall': 190}
```

딕셔너리를 풀어서 keyword argument로 넘기려면 `**`를 붙인다.

```python
i = {"name": "유관순", "age": 20}
print_info(**i)  # print_info(name="유관순", age=20)과 같다
```

```text
<class 'dict'> {'name': '유관순', 'age': 20}
```

### parameter 선언 순서

1. 기본값이 없는 parameter
2. 기본값이 있는 parameter
3. `*args`
4. keyword argument로만 받는 parameter
5. `**kwargs`

- 가변인자는 종류별로 **하나씩만** 선언할 수 있고, 둘 다 쓸 땐 `*args`가 먼저다.
- `*args` **뒤에** 선언한 parameter는 반드시 keyword argument로 넘겨야 한다. 위치 값은 전부 `*args`가 가져가기 때문이다.
- `**kwargs` 뒤에는 아무것도 선언할 수 없다.

노트북에서는 `pass`로만 확인했는데, 값이 어디에 들어가는지 출력해 봤다.

```python
def test(a, b, c=None, d=None, *args, e, f=None, **kwargs):
    print(f"a={a}, b={b}, c={c}, d={d}")
    print(f"args={args}")
    print(f"e={e}, f={f}")
    print(f"kwargs={kwargs}")

test(10, 20, 30, 40, 1, 2, 3, 4, e=10, f=100, x=20, y=100, z=300)
```

```text
a=10, b=20, c=30, d=40
args=(1, 2, 3, 4)
e=10, f=100
kwargs={'x': 20, 'y': 100, 'z': 300}
```

`e`를 keyword로 넘기지 않으면 에러가 난다.

```python
test(10, 20, 30, 40, 1, 2)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: test() missing 1 required keyword-only argument: &#x27;e&#x27;</div></div>

## 변수의 유효범위

| | 지역변수 (local) | 전역변수 (global) |
|---|---|---|
| 선언 위치 | 함수 **안** | 함수 **밖** |
| 사용 범위 | 그 함수 안에서만 | 모든 함수에서 |

- 함수에서 변수를 **조회**하면 먼저 지역변수를 찾고, 없으면 전역변수를 찾는다.
- 함수 안에서 전역변수와 같은 이름에 **값을 대입**하면 전역변수가 바뀌는 게 아니라 **같은 이름의 지역변수가 새로 생긴다.**
- 전역변수를 바꾸려면 `global 변수명`으로 미리 선언해야 한다.
- 한 함수에서 전역변수를 바꾸면 모든 함수가 영향을 받으니 **함부로 바꾸지 않는다.**

```python
num = 10  # 전역변수

def fun1():
    print(f"num: {num}")
    fun1_num = 100  # 지역변수
    print(f"fun1_num: {fun1_num}")
    var = "fun1의 var"
    print(var)

def fun2():
    print(f"num: {num}")
    # print(fun1_num)  # fun1의 지역변수는 fun1 안에서만 쓸 수 있다
    var = "fun2의 var"  # fun1의 var와 이름만 같은 다른 변수
    print(var)

fun1()
print("------------")
fun2()
```

```text
num: 10
fun1_num: 100
fun1의 var
------------
num: 10
fun2의 var
```

```python
num = 10
def fun3():
    num = 500  # 전역변수와 이름은 같지만 함수 안에서 대입했으니 지역변수
    print(num)

fun3()
print(num)
```

```text
500
10
```

```python
num = 10
def fun4():
    global num  # 사용하는 num은 전역변수라고 선언
    num = 2000  # 전역변수를 변경

fun4()
print(num)
```

```text
2000
```

> **보충 · 조회 후 대입하면 에러**
> 함수 안 어디에서든 `num`에 대입하는 코드가 있으면, Python은 그 함수의 `num`을 **처음부터 지역변수로** 본다. 그래서 대입 전에 조회하면 전역변수를 읽지 않고 에러가 난다.

```python
num = 10
def fun5():
    print(num)  # 아직 대입 전인 지역변수 num
    num = 20

fun5()
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · UnboundLocalError: cannot access local variable &#x27;num&#x27; where it is not associated with a value</div></div>

**if문, for문은 유효범위를 만들지 않는다.** 블록 안에서 만든 변수도 블록 밖에서 쓸 수 있다. 유효범위를 나누는 건 함수다.

```python
a = 30
result = None
if a > 20:
    result = a + 100
print(result)

for v in range(1, 5):
    num100 = v
print(v, num100)  # 반복이 끝난 뒤에도 마지막 값이 남아 있다
```

```text
130
4 4
```

## 함수는 일급 시민이다

**일급 시민 객체**란 다음이 모두 되는 객체다. 일급 시민(거주, 이동, 투표의 자유를 다 가진 시민)에서 온 말로, "적용 가능한 연산을 모두 지원하는 객체"라는 뜻이다.

1. **변수에 대입**할 수 있다.
2. **argument로 전달**할 수 있다.
3. 함수의 **반환값**으로 쓸 수 있다.

즉 Python에서 함수는 일반 값처럼 다룰 수 있다.

```python
def hello():
    print("Hello World~!")

hello()        # 함수 호출(실행)
print(hello)   # 괄호 없이 쓰면 함수 객체 자체
my_hello = hello  # 1. 변수에 대입
my_hello()
```

```text
Hello World~!
<function hello at 0x7f55da2aec00>
Hello World~!
```

### callback 함수

다른 함수를 호출할 때 **argument로 전달하는 함수**다. 받는 함수가 어떻게 호출하는지에 맞춰 정의해야 한다. 아래 `calc`는 "정수 두 개를 받아 계산 결과를 반환하는 함수"를 받는다.

```python
# calc_func: 두 정수를 받아 계산 결과를 반환하는 함수를 받는 파라미터
def calc(calc_func):
    num1, num2 = 10, 20             # 1. input()으로 받았다고 보자
    result = calc_func(num1, num2)  # 2. 계산은 전달받은 함수가 한다
    print(result)                   # 3. 결과 출력

def plus(n1, n2):
    return n1 + n2

def minus(n1, n2):
    return n1 - n2

calc(plus)   # 2. argument로 전달
calc(minus)
```

```text
30
-10
```

`calc` 하나로, 넘기는 함수에 따라 다른 계산을 한다.

> **보충** 노트북에는 `calc(plus)`의 출력이 `(10, 20)`으로 남아 있었다. `calc`를 고치기 전 버전으로 실행한 결과다. 지금 코드로는 30이 나온다.

3번(반환값으로 쓰기)은 필기에 예제가 없어서 덧붙인다.

```python
# 보충: 함수를 만들어서 반환하는 함수
def make_multiplier(n):
    def multiply(x):
        return x * n
    return multiply  # 3. 함수를 반환

times3 = make_multiplier(3)
print(times3(10), times3(7))
```

```text
30 21
```

## 람다식 (Lambda Expression)

함수를 **표현식(expression) 하나로** 정의한다. 입력을 받아 간단히 처리한 결과를 반환하는 함수를 짧게 쓸 때 쓴다.

```python
lambda 매개변수, 매개변수: 식
```

- 식은 **하나**만 쓸 수 있고, 그 결과가 자동으로 반환된다(`return`을 쓰지 않는다).
- 주로 **함수의 argument로 넘길 일회용 함수**를 만들 때 쓴다.

```python
def plus(n1, n2):
    return n1 + n2

plus_lambda = lambda n1, n2: n1 + n2  # 위 함수와 같다
print(plus(10, 20), plus_lambda(100, 200))

minus_lambda = lambda n1, n2=100: n1 - n2  # 기본값도 된다
print(minus_lambda(10, 20), minus_lambda(10))
```

```text
30 300
-10 -90
```

```python
# 호출할 때 그 자리에서 정의해서 넘긴다
calc(lambda x, y: x + y)
calc(lambda x, y: x * y)
```

```text
30
200
```

### 함수를 받아 처리하는 Iterable 함수

| 함수 | 하는 일 | 넘기는 함수 |
|---|---|---|
| `sorted(iterable, reverse=False, key=None)` | 정렬해서 **새 리스트** 반환 | `key`: 원소를 받아 **정렬 기준 값**을 반환 |
| `filter(함수, iterable)` | 조건을 만족하는 원소만 걸러냄 | 원소를 받아 **bool** 반환. True인 것만 남는다 |
| `map(함수, iterable)` | 원소를 하나씩 변환 | 원소를 받아 **처리 결과** 반환 |

```python
t = (-10, 100, 20, 7, 90, -22, 321)
result = sorted(t, reverse=True)  # 튜플을 넣어도 결과는 리스트
print(result)

l = ["aaa", "bbbb", "cc", "abbbbb", "dedede", "fedckkkll"]
print(sorted(l, reverse=True))                         # 문자열 기준
print(sorted(l, key=lambda x: len(x), reverse=True))   # 글자 수 기준
print(sorted(l, key=len, reverse=True))                # 이미 있는 함수를 그대로 넘겨도 된다
```

```text
[321, 100, 90, 20, 7, -10, -22]
['fedckkkll', 'dedede', 'cc', 'bbbb', 'abbbbb', 'aaa']
['fedckkkll', 'abbbbb', 'dedede', 'bbbb', 'aaa', 'cc']
['fedckkkll', 'abbbbb', 'dedede', 'bbbb', 'aaa', 'cc']
```

`l.sort()`는 리스트 **자체를** 정렬하고, `sorted(l)`은 **새 리스트**를 만든다. `sorted()`는 튜플처럼 `sort()` 메소드가 없는 것도 정렬할 수 있다.

```python
l = [-10, 100, 20, 7, 90, -22, 321]
print(list(filter(lambda x: x < 0, l)))   # [v for v in l if v < 0]
print(tuple(map(lambda x: x * 10, l)))    # (v * 10 for v in l)
```

```text
[-10, -22]
(-100, 1000, 200, 70, 900, -220, 3210)
```

> **보충 · filter, map은 한 번만 쓸 수 있다**
> 필기에 "filter/map의 반환 타입은 generator"라고 적었는데, 정확히는 `filter`, `map` 객체라는 **iterator**다. generator와 마찬가지로 값을 미리 만들지 않고 꺼낼 때마다 계산한다. 그래서 `list()`로 바꾸기 전에는 내용이 안 보이고, **한 번 다 꺼내면 비어 버린다.**

```python
m = map(lambda x: x * 10, [1, 2, 3])
print(m)
print(list(m))
print(list(m))  # 두 번째는 빈 리스트
```

```text
<map object at 0x7f55da2b6380>
[10, 20, 30]
[]
```

## docstring과 타입 힌트

- **docstring**: 함수 구현부 **첫 줄**에 여러 줄 문자열로 쓰는 함수 설명이다. `help(함수)`로 볼 수 있다.
- **타입 힌트**: `parameter: 타입`, `-> 반환타입`으로 parameter와 반환값의 타입을 적는다.

```python
def calc(num1: int | float, num2: int) -> int:
    """
    함수에 대한 설명

    Args:          # 파라미터 설명 - 변수명 (타입): 설명
        num1 (int|float): 피연산자 1
        num2 (int): 피연산자 2

    Returns:       # 리턴값에 대한 설명 - 타입: 설명
        int: 계산결과

    Raises:        # 발생할 수 있는 오류 - 오류이름: 언제 발생하는지
        TypeError: 숫자가 아닌 argument를 받았을 때
    """
    pass

help(calc)
```

```text
Help on function calc in module __main__:

calc(num1: int | float, num2: int) -> int
    함수에 대한 설명

    Args:          # 파라미터 설명 - 변수명 (타입): 설명
        num1 (int|float): 피연산자 1
        num2 (int): 피연산자 2

    Returns:       # 리턴값에 대한 설명 - 타입: 설명
        int: 계산결과

    Raises:        # 발생할 수 있는 오류 - 오류이름: 언제 발생하는지
        TypeError: 숫자가 아닌 argument를 받았을 때
```

`help()`는 내장 함수에도 쓸 수 있다. `print()`의 `sep`, `end` 기본값이 여기 나온다.

```python
help(print)
```

```text
Help on built-in function print in module builtins:

print(*args, sep=' ', end='\n', file=None, flush=False)
    Prints the values to a stream, or to sys.stdout by default.

    sep
      string inserted between values, default a space.
    end
      string appended after the last value, default a newline.
    file
      a file-like object (stream); defaults to the current sys.stdout.
    flush
      whether to forcibly flush the stream.
```

> **보충** 필기에는 `Raise:`라고 적었는데, 이 형식(Google 스타일 docstring)에서는 `Raises:`가 맞다. 그리고 위 `calc`는 `-> int`라고 해 놓고 `pass`라서 실제로는 `None`을 반환한다. 타입 힌트는 실행할 때 검사되지 않아서 에러가 나지 않는다. VS Code 같은 편집기나 mypy가 이런 불일치를 잡아 준다.

## 연습 문제

```python
# 1. 사용자가 입력한 단의 구구단을 출력하는 함수 (매개변수로 단을 받는다)
def gugudan_print(dan: int):
    """
    입력받은 단의 구구단을 출력하는 함수
    Args:
        dan (int): 출력할 단
    """
    if dan >= 2 and dan <= 9:
        for value in range(1, 10):
            print(f"{dan} X {value} = {dan * value}")
    else:
        print("단은 2 ~ 9 사이 정수를 입력하세요.")

gugudan_print(6)
gugudan_print(12)
```

```text
6 X 1 = 6
6 X 2 = 12
6 X 3 = 18
6 X 4 = 24
6 X 5 = 30
6 X 6 = 36
6 X 7 = 42
6 X 8 = 48
6 X 9 = 54
단은 2 ~ 9 사이 정수를 입력하세요.
```

[제어문 글](/notes/python/python-control-flow-comprehension)의 구구단과 달리 여기선 `range(1, 10)`이라 9까지 나온다.

```python
# 2. 시작 정수, 끝 정수를 받아 그 사이 모든 정수의 합을 반환하는 함수 (끝 포함)
def accumulate(start: int, end: int) -> int:
    """
    파라미터로 받은 정수 범위의 합계를 계산해서 반환.

    Args:
        start (int): 범위의 시작 정수
        end (int): 범위의 끝 정수. 합계를 구할 때 포함한다.
    Returns:
        int: start ~ end 사이 정수의 합계
    """
    result = 0  # 누적합계를 저장할 변수
    for v in range(start, end + 1):  # end를 포함하려고 + 1
        result += v
    return result

print(accumulate(10, 20), accumulate(1, 10))
```

```text
165 55
```

합계, 최대, 최소는 내장 함수가 있다.

```python
print(sum([1, 2, 3, 4]), sum(range(1, 11)))
print(max([1, 2, 2, 3, 3, 4]), min([10, -20, 1, 23]))
```

```text
10 55
4 -20
```

```python
# 3. 2번에서 시작을 안 받으면 0, 끝을 안 받으면 10이 들어가도록 변경
def accumulate2(start: int = 0, end: int = 10) -> int:
    return sum(range(start, end + 1))

print(accumulate2(end=20))   # 0 ~ 20
print(accumulate2(start=5))  # 5 ~ 10
print(accumulate2())         # 0 ~ 10
```

```text
210
45
55
```

```python
# 4. 키(m)와 몸무게(kg)를 받아 BMI = 몸무게 / 키² 로 비만도를 반환하는 함수
# 18.5 미만 저체중, 18.5 이상 25 미만 정상, 25 이상 과체중, 30 이상 비만
def check_bmi(tall: float, weight: float) -> str:
    """
    BMI 지수를 계산해서 비만도를 알려주는 함수.

    Args:
        tall (float): 키. 단위는 미터
        weight (float): 몸무게. 단위는 kg
    Returns:
        str: 비만도(저체중, 정상, 과체중, 비만) 계산 결과
    """
    bmi = weight / tall ** 2
    if bmi < 18.5:
        return "저체중", round(bmi, 2)  # round(반올림할 값, 자릿수)
    elif bmi < 25:
        return "정상", round(bmi, 2)
    elif bmi < 30:
        return "과체중", round(bmi, 2)
    else:
        return "비만", round(bmi, 2)

print(check_bmi(1.83, 243))
print(check_bmi(1.75, 70))
```

```text
('비만', 72.56)
('정상', 22.86)
```

> **보충** 반환값은 `("비만", 72.56)` 같은 **튜플**인데, 타입 힌트와 docstring은 `str`이라고 돼 있다. 비만도와 수치를 같이 돌려주기로 했다면 `-> tuple[str, float]`로 맞추는 게 정확하다.

`round(값, 자릿수)`: 자릿수가 양수면 소수부, 음수면 정수부, 생략하면 정수로 반올림한다.

```python
print(round(2.456), round(2.4567, 2), round(23456.6789, -2))
```

```text
2 2.46 23500.0
```

> **보충 · round()는 사사오입이 아니다**
> Python의 `round()`는 딱 절반(.5)일 때 **짝수 쪽으로** 보낸다(banker's rounding). 그래서 `round(2.5)`는 3이 아니라 2다. 또 `2.675` 같은 실수는 2진수로 정확히 저장되지 않아서 예상과 다르게 나올 수 있다.

```python
print(round(0.5), round(1.5), round(2.5), round(3.5))
print(round(2.675, 2))
```

```text
0 2 2 4
2.67
```

```python
# 5. filter()로 양수만 추출한 리스트
ex1 = [1, -10, -2, 20, 3, -5, -7, 21]
print(list(filter(lambda x: x > 0, ex1)))
```

```text
[1, 20, 3, 21]
```

```python
# 6. filter()와 map()으로 음수만 추출한 뒤 제곱한 리스트
ex2 = [1, -10, -2, 20, 3, -5, -7, 21]
f1 = filter(lambda x: x < 0, ex2)
m = map(lambda x: x ** 2, f1)
print(list(m))

# 한 줄로
print(list(map(lambda x: x ** 2, filter(lambda x: x < 0, ex2))))

# 컴프리헨션으로
print([v ** 2 for v in ex2 if v < 0])
```

```text
[100, 4, 25, 49]
[100, 4, 25, 49]
[100, 4, 25, 49]
```

세 방법의 결과가 같다. 조건 + 변환을 같이 할 때는 컴프리헨션이 가장 읽기 쉽다.

## 정리

- 함수는 **선언부**(이름, parameter)와 **구현부**(실행 구문, return)로 이뤄진다.
- `return`이 없으면 `None`을 반환한다. 여러 값을 반환하면 튜플로 묶인다.
- parameter는 기본값 없는 것 → 있는 것 → `*args` → keyword 전용 → `**kwargs` 순서로 선언한다.
- 함수 안에서 대입한 변수는 지역변수다. 전역변수를 바꾸려면 `global`. if, for는 유효범위를 만들지 않는다.
- 함수는 값처럼 대입하고, 넘기고, 반환할 수 있다. `sorted(key=)`, `filter`, `map`이 이걸 이용한다.
- `int`, `list` 같은 내장 함수 이름으로 정의하면 내장 함수가 가려진다.
- 타입 힌트와 docstring은 실행에 영향이 없다. 실제 반환값과 맞는지는 직접 챙겨야 한다.
