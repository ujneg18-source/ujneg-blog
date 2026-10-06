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

> 이 글은 SKN31 학습 과정에서 작성한 Jupyter Notebook을 바탕으로 정리했습니다.
> 당시 작성한 Markdown 필기와 코드 주석은 보존하고, 글의 흐름을 위해 도입·보충 설명·학습 정리를 덧붙였습니다.
> 원본 노트북: `05_함수.ipynb`

## 이 글에서 확인할 내용



- 반복되는 로직을 함수로 분리하고 호출하는 방법을 익힌다.

- Parameter와 Argument, Return value의 역할을 구분한다.

- 기본값, 위치·키워드 인자, `*args`, `**kwargs`를 사용한다.

- 함수를 값처럼 전달하고 Lambda, `map`, `filter`, `sorted`에 활용한다.



## 필기를 다시 읽으며 잡은 핵심



함수를 공부하면서 가장 중요했던 점은 입력과 처리, 반환을 분리하는 것이었다. 값을 출력하는 함수와 결과를 반환하는 함수는 겉으로 비슷해도 재사용 가능성에서 차이가 크다. 그래서 예제마다 입력값과 반환값의 유무를 주석으로 구분했다.

매개변수 실습에서는 기본값이 없는 매개변수를 먼저 선언해야 하는 규칙, 위치 인자와 키워드 인자의 차이, 자료구조를 `*` 또는 `**`로 풀어서 전달하는 방법을 확인했다. `*args`는 Tuple, `**kwargs`는 Dictionary 형태로 함수 내부에 전달된다는 점이 핵심이다.

일급 함수와 Lambda 부분에서는 함수를 다른 함수의 인자로 전달하고 정렬 기준이나 필터 조건으로 사용하는 과정을 실습했다. 구구단, 구간 합계, BMI 판정, 양수 필터링 등의 연습 문제로 함수의 경계를 직접 설계했다.

---

## 함수란

-   프로그램에서 함수란 하나의 작업, 기능, 동작을 처리하기 위한 사용자 정의 연산자라고 할 수 있다.
    -   함수는 값을 **입력(Input)을** 받아서 **처리 후** 처리결과를 **출력(Output)하는** 일련의 과정을 정의한 것을 말한다.
    -   만들어진 함수는 동일한 작업이 필요할 때 마다 재사용될 수 있다.
    -   함수를 구현해 파이썬 실행환경에 등록하는 것을 **함수를 정의(define)한다** 라고 한다.
    -   정의된 함수를 사용하는 것을 **함수를 호출(call)한다** 라고 한다.
    -   파이썬에서 함수는 일급 시민 객체(First Class Citizen/First Class Object)이다.

> -   **일급 시민 객체 란**  
>      – **변수에 할당할 수 있고, 함수의 입력값으로 전달할 수 있고, 함수의 반환 값으로 반환할 수 있는 객체를 말한다.**
>
> -   일급시민객체는 일급시민 이란 말에서 유래된 용어이다.
>
>          - 일급 시민이란 자유롭게 거주하며 일을 할 수 있고, 출입국의 자유를 가지며 투표의 자유를 가지는 시민을 의미한다.
>          - 일급 시민 객체란 적용 가능한 연산을 모두 지원하는 객체를 뜻한다.

### 함수 만들기

-   함수의 정의
    -   새로운 함수를 만드는 것을 함수의 정의라고 한다.
    -   함수를 구현하고 그것을 파이썬 실행환경에 새로운 기능으로 등록하는 과정을 말한다.

-   함수 구현
    -   함수의 선언부와 구현부로 나누어진다
        -   함수의 선언부(Header) : 함수의 이름과 입력값을 받을 변수(Parameter, 매개변수)를 지정한다.
        -   함수의 구현부(Body) : 함수가 호출 되었을 때 실행할 실행문들을 순서대로 작성한다.

```python
def 함수이름( [변수, 변수, ..]):  # 선언 부(Header)
    # 구현 부(body)
    실행구문1
    실행구문2
    실행구문3
    …
    [return [결과값]]
```

-   함수 선언 마지막에는 `:` 을 넣어 구현부와 구분한다.
-   Parameter(매개변수)는 argument(호출하는 곳에서 전달하는 함수의 입력값)를 받기 위한 변수로 0개 이상 선언할 수 있다.
-   함수의 실행구문은 코드블록으로 들여쓰기로 블록을 묶어준다.
    -   들여쓰기는 보통 공백 4칸을 사용한다.
-   함수의 처리 결과값이 있을 경우 **return 구문**을 넣고 없을 경우 return은 생략할 수 있다.
-   **함수이름 관례**
    -   함수이름은 보통 동사형으로 만든다.
    -   Snake 표기법사용: 모두 소문자로 하고 여러단어로 구성할 경우 각 단어들을 `_`로 연결한다. (변수와 동일)

````python
# 입력값(Input)/파라미터(parameter) : 없는 함수
# 반환값(return value) : 없는 함수 (구현부에 `return 값` 있어야 함.)  return None 
def greet():   # 선언부
    # 구현부 - 함수가 실행할 구문
    print("안녕하세요.")
    print("반갑습니다.")
````

````python
# 함수 호출
## [변수 = ]함수이름([전달값])
greet()
````

````python
greet()
````

````python
# 입력값이 있는(2개인) 함수 
# 출력값: 없음.
def greet2(name, address):
    print(f"{address}에 사는 {name}님 안녕하세요. 반갑습니다.")
````

````python
greet2("이순신", "서울")
greet2("홍길동", "인천")
````

````python
greet2()
````

````python
greet2("홍길동")
````

````python
# input 값이 있는 함수
# return 값이 있는 함수
def greet3(name, address):
    value = f"{address}에 사는 {name}님 안녕하세요. 반갑습니다."
    return value
````

````python
greet_value = greet3("유관순", "광주")
print(greet_value)
````

````python
print(greet_value)
````

````python
print(greet_value, "를 파일에 저장")
````

````python
def int(num_str):
    # num_str -> 정수로 변환하는 코드
    result = "변환한 값"
    return result
````

````python
v1 = int("30")
v2 = int("50")
v3 = v1 + v2
print(v3)
greet()
````

### 함수 parameter와 return value

-   **parameter:** 함수가 호출하는 곳으로 부터 입력받는 값을 저장하는 변수.
    -   **argument:** 호출할 때 파라미터에 전달하는 값
-   **return value:** 함수의 처리결과로 호출하는 곳에 전달(반환)하는 값.

#### return value(반환값)

-   함수가 호출받아 처리한 결과값으로 호출한 곳으로 반환하는 값이다.
-   함수 구현부에 return \[값\] 구문을 사용해 반환한다.
    -   **return**
        -   함수가 정상적으로 끝났고 호출한곳으로 돌아간다.
        -   보통은 함수 구현의 마지막에 넣지만 경우에 따라 중간에 올 수 있다.
    -   return 반환값
        -   호출한 곳으로 값을 가지고 돌아간다. (반환한다)
        -   반환값이 없을 경우 None을 반환한다.
        -   함수에 return 구문이 없을 경우 마지막에 return None이 실행된다.
-   여러개의 값을 return 하는 경우 자료구조로 묶어서 전달해야한다.
    -   함수는 한개의 값만 반환할 수 있다.

````python
# def test():

#     if 종료 조건:
#         return
    
#     실행구문
````

````python
def calc(num1, num2):
    # 두 수의 사칙연산 결과를 반환.
    v1 = num1 + num2
    v2 = num1 - num2
    v3 = num1 * num2
    v4 = num1 / num2
    # return [v1, v2, v3, v4]
    return v1, v2, v3, v4  # return v1, v2.. 값 나열 => 튜플로 반환.
````

````python
result = calc(10, 5)
print(result)
````

````python
a, b, c, d = calc(100, 20)
print(a, b, c, d)
````

### Parameter (매개변수)

#### 기본값이 있는 Parameter

-   매개변수에 값을 대입하는 구문을 작성하면 호출할 때 argument 가 넘어오지 않으면 대입해놓은 기본값을 사용한다.
-   함수 정의시 기본값 없는 매개변수, 있는 매개변수를 같이 선언할 수 있다.
    -   **이때 기본값 없는 매개변수들을 선언하고 그 다음에 기본값 있는 매개변수들을 선언한다.**

````python
# name: 필수 파라미터. greet4를 호출하려면 반드시 값을 전달해야한다.
def greet4(name):
    return f"{name}님 안녕하세요."
````

````python
greet4("홍길동")
greet4()
````

````python
def greet5(name=None):
    if name:
        return f"{name}님 안녕하세요."
    else:
        return "안녕하세요."
````

````python
greet5("이순신") # 파라미터에 argument를 전달하면 그 값이 대입된다.
````

````python
greet5()  # 파라미터에 값을 안넘기면 default이 대입되서 실행된다.
````

````python
# 기본값 없는 파라미터들을 먼저 선언, 기본값 있는 파라미터 선언
def print_info(name, age=0, address, tall, weight):
    print(name, age, address, tall, weight)
````

````python
def print_info(name, address, tall=0.0, weight=0.0, age=0):
    print(name, age, address, tall, weight)
````

````python
print_info("이순신", "서울")
````

````python
print_info("이순신", "서울", 190.2)
````

````python
print("안녕", end='\t')
print("hello")
````

#### Positional argument와 Keyword argument

-   Argument는 함수/메소드를 호출할 때 전달하는 입력값을 말한다.
    -   Argument는 전달하는 값이고 Parameter는 그 값을 저장하는 변수
-   Positional argument
    -   함수 호출 할때 argument(전달인자)를 Parameter 순서에 맞춰 값을 넣어서 호출.
-   keyword argument
    -   함수 호출할 때 argument를 `Parameter변수명 = 전달할값` 형식으로 선언해서 어떤 parameter에 어떤 값을 전달할 것인지 지정해서 호출.
    -   순서와 상관없이 호출하는 것이 가능.
    -   parameter가 많고 대부분 기본값이 있는 함수 호출 할 때 뒤 쪽에 선언된 parameter에만 값을 전달하고 싶을 경우 유용하다.

````python
def print_info(name, address, tall=0.0, weight=0.0, age=0):
    print(name, address, tall, weight, age)
````

````python
print_info("이순신", "서울시", 184.2) # positional args
````

````python
# keyword args
print_info(name="유관순", weight=62.1, tall=175.4, age=20, address="인천")
````

````python
def print_info2(name=None, address=None, tall=0.0, weight=0.0, age=0):
    print(name, address, tall, weight, age)
````

````python
print_info2(None, None, 0.0, 0.0, 30)
````

````python
print_info2(age=30)
````

#### 가변인자(Variable Length Argument)
##### 가변인자란 무엇인가
- 가변인자(Variable Length Argument)는 함수 정의 시 argument의 개수를 미리 지정하지 않고, 호출할 때 그 개수를 정해서 인자를 전달할 수 있도록 하는 방법이다.
##### 가변인자의 종류
###### 위치 가변 인자 (`*args`)
- 여러 개의 **위치 기반 인자(Positional argument)**를 하나의 튜플로 받아 처리한다.  
- 함수 정의 시 `*args` 형태로 사용하며, 호출 할 때 전달할 값들을 위치 기반 인자(Positional argument)로 전달한다.
- `*` 뒤의 변수명은 아무거나 사용 가능하지만 관례적으로 `args`를 사용한다.
###### 키워드 가변 인자 (`**kwargs`)
- 여러 개의 **키워드 인자**를 하나의 딕셔너리로 받아 처리한다.  
- 함수 정의 시 `**kwargs` 형태로 사용하며, 호출 시 `key=value` 형태로 전달한다.  
- `**` 뒤의 변수명은 아무거나 사용 가능하지만 관례적으로 `kwargs`를 사용한다.  
###### 위치
- 하나의 함수에 위치 가변 인자와 키워드 가변 인자를 하나씩만 선언 할 수있다.
  - 위치 가변 인자와 키워드 가변 인자를 동시에 사용할 수 있으며, 각각 하나씩만 선언할 수 있다.
  - 같이 선언할 경우 위치 인자 `*args`를 먼저 선언하고, 키워드 인자 `**kwargs`를 나중에 선언해야 한다.  
- 가변인자와 일반 파라미터들을 같이 선언할 수있다.
  - 기본값이 없는 파라미터의 경우 위치 가변 인자 앞 또는 뒤에 모두 선언할 수 있다. 단 뒤에 선언할 경우 호출할 때 keyword argument 형식으로 호출해야 한다. 
  - 키워드 가변인자 뒤에는 어떤 파라미터들도 선언할 수 없다. (일반 파라미터, 가변인자 모두 포함해서)

````python
# 나이 여러개를 받아서 출력
def print_ages(ages):
    for a in ages:
        print(a)
````

````python
print_ages([10, 20, 30, 40])
````

````python
def print_ages2(*ages):
    print(type(ages), ages)
    for v in ages:
        print(v)
````

````python
print_ages2(32, 30, 10, 60, 50, 40, 43)
````

````python
print_ages2() # 빈 튜플로 전달
````

````python
print_ages2(10)
````

````python
print_ages2([10, 20, 30])
````

````python
# 자료구조에 있는 값들을 가변인자에 전달.
l = [32, 34, 53, 21, 30]
print_ages2(*l) # *리스트/*튜플 -> 가변인자에 리스트의 원소들을 풀어서 전달.
# print_ages2(32, 34, 53, 21, 30) 와 동일
````

````python
# **kwargs: keyword argument들을 여러개 받을 때 사용 -> dict로 처리
def print_info(**info):
    print(type(info))
    print(info)
````

````python
print_info(name="홍길동", age=20, address="서울")
````

````python
print_info()
````

````python
print_info(name="이순신", tall=190)
````

````python
i = {"name":"유관순","age":20}

print_info(**i) # name="유관순", age=20 이렇게 dictionary의 값들을 풀어서 전달.
````

````python
def test(*args, **kwargs):
    pass

test(1, 2, 3, 4, a=1, b=2)
````

#### 파라미터 순서
1. 기본값이 없는 파라미터
2. 기본값이 있는 파라미터
3. *args
4. keyword args 로 값을 전달 받는 파라미터
5. **kwargs

- *args 뒤에 선언된 변수 형태 파라미터는 반드시 keyword args로 값을 전달해야 한다.

````python
def test(a, b, c=None, d=None, *args, e, f=None, **kwargs):
    pass
````

````python
test(10, 20, 30, 40, 1, 2, 3, 4, e=10, f=100, x=20, y=100, z=300)
````

## 변수의 유효범위

-   **지역변수 (local variable)**
    -   함수안에 선언된 변수
    -   선언된 그 함수 안에서만 사용할 수 있다.
-   **전역변수 (global variable)**
    -   함수 밖에 선언 된 변수
    -   모든 함수들이 공통적으로 사용할 수 있다.
    -   하나의 함수에서 값을 변경하면 그 변한 값이 모든 함수에 영향을 주기 때문에 **함부로 변경하지 않는다.**
    -   함수내에서 전역변수에 값을 대입하기 위해서는 global 키워드를 이용해 사용할 것을 미리 선언해야 한다.
        -   global로 선언하지 않고 함수안에서 전역변수와 이름이 같은 변수에 값을 대입하면 그 변수와 동일한 지역변수을 생성한다.
        -   조회할 경우에는 상관없다.
            -   함수에서 변수를 조회할 경우 **먼저 지역변수를 찾고 없으면 전역변수를 찾는다.**

````python
num = 10 #  전역변수

def fun1():
    print(f"num: {num}")
    fun1_num = 100 # 지역변수 (함수안에서 선언한 변수)
    print(f"fun1_num: {fun1_num}")
    var = "fun1의 var"
    print(var)

def fun2():
    print(f"num: {num}") 
    # print(f"fun1_num: {fun1_num}")  # fun1()함수의 지역변수는 그 함수안에서만 호출 가능.
    var = "fun2의 var"
    print(var)
````

````python
fun1()
print('------------')
fun2()
````

````python
num = 10
def fun3():
    num = 500  # 전역변수와 이름은 같지만 함수안에서 선언되었으므로 지역변수이다.
    print(num)
````

````python
fun3()
print(num)
````

````python
num = 10
def fun4():
    global num  #사용하는 변수 num은 전역변수다. 선언
    num = 2000 # 전역변수를 변경

fun4()
print(num)
````

````python
a = 30
result = None
if a > 20:
    result = a + 100

print(result)
````

````python
# 반복문, 조건문 block안에 선언된 변수도 밖에 사용할 수있다.
# 반복문이나 조건문이 선언된 block안에서는 사용할 수 있다.
for v in range(1, 5):
    num100 = v
````

````python
print(v)
````

````python
print(num100)
````

## 함수는 일급시민(First class citizen) 이다.

-   일급 시민
    1. 변수에 대입 할 수 있다.
    1. Argument로 사용할 수 있다.
        - **callback 함수**
            - 다른 함수 호출할때 argument로 전달되는 함수.
            - callback 함수는 그 함수를 호출하는 함수가 사용하는 방식에 맞춰서 정의 해야 한다.
    1. 함수나 메소드의 반환값으로 사용 할 수 있다.
-   일급
    -   모든 권리를 다 가진다는 의미
-   시민
    -   프로그래밍 언어를 구성하는 객체를 의미
-   즉 파이썬에서 함수는 일반 값(객체)으로 취급된다.

````python
def hello():
    print("Hello World~!")
````

````python
# 함수 호출(실행시키기)
hello()
````

````python
hello
````

````python
my_hello = hello
````

````python
my_hello()
````

````python
my_hello
````

````python
# calc_func: 함수를 받는 파라미터. 두개의 정수를 입력받아서 처리(계산)를 반환하는 함수.
def calc(calc_func):
    num1, num2 = 10, 20  # input()으로 받았다고 보자. 1번작업
    result = calc_func(num1, num2)       # 2번째: 계산 => 계산함수를 파라미터로 받는다.
    print(result)        # 3번째: 계산결과 출력
````

````python
def plus(n1, n2):
    return n1 + n2

calc(plus)
````

````python
def minus(n1, n2):
    return n1 - n2

calc(minus)
````

### 람다식/람다표현식 (Lambda Expression)

-   함수를 표현식(expression)으로 정의한다.
-   함수를 하나의 식을 이용해서 정의할때 사용하는 표현식(구문).
-   값을 입력받아서 **간단한 처리한 결과**를 반환하는 간단한 함수를 표현식으로 정의할 수 있다.
    -   처리결과를 return 하는 구문을 하나의 명령문으로 처리할 수 있을때 람다식을 사용할 수 있다.
-   구문

```python
lambda 매개변수[, 매개변수, ...] : 명령문(구문)
```

-   명령문(구문)은 하나의 실행문만 가능하다.
-   명령문(구문)이 처리한 결과를 리턴해준다.
-   **람다식은 함수의 매개변수로 함수를 전달하는 일회성 함수를 만들때 주로 사용한다.**

````python
def plus(n1, n2):
    return n1 + n2 

plus(10, 20)


plus_lambda = lambda n1, n2 : n1 + n2
````

````python
plus_lambda(100, 200)
````

````python
minus_lambda = lambda n1, n2=100 : n1 - n2
minus_lambda(10, 20)
minus_lambda(10)
````

````python
# lambda 식 -> 일회용함수를 만들때 사용. argument로 사용할 함수 호출할 때 정의.
calc(lambda x, y : x + y)
````

#### iterable 관련 함수에서 함수를 매개변수로 받아 처리하는 함수들

-   sorted(iterable, reverse=False, key=None)
    -   정렬처리
    -   매개변수
        -   reverse: True - 내림차순, False - 오름차순(기본)
        -   key: 함수
            -   Parameter로 iterable의 각 원소를 받는 함수.
            -   정렬을 할 때 iterable의 원소기준으로 정렬하는 것이 아니라 이 함수가 반환하는 값을 기준으로 정렬
-   filter(함수, Iterable)
    -   Iterable의 원소들 중에서 특정 조건을 만족하는 원소들만 걸러주는 함수
    -   함수
        -   어떻게 걸러낼 것인지 조건을 정의. 매개변수 1개, 반환값 bool
        -   원소 하나 하나를 함수에 전달해 True를 반환하는 것만 반환
-   map(함수, Iterable)
    -   Iterable의 원소들 하나 하나를 처리(변형)해서 그 결과를 반환
    -   함수
        -   원소들을 어떻게 처리할지 정의. 매개변수 1개. 반환값: 처리 결과
-   **filter/map 반환타입**: generator 가 반환 된다.

````python
l = [-10, 100, 20, 7, 90, -22, 321]
t = (-10, 100, 20, 7, 90, -22, 321)
# l.sort()  # l(리스트) 자체를 정렬
# result = sorted(l)
result = sorted(t, reverse=True)
result
````

````python
l = ["aaa", "bbbb", "cc", "abbbbb", "dedede", "fedckkkll"]
sorted(l, reverse=True)
````

````python
# 함수(원소) -> 반환값 반환값들을 기준으로 정렬
sorted(l, key=lambda x : len(x), reverse=True)
````

````python
sorted(l, key=len, reverse=True)
````

````python
# [v for v in l if v > 3]
l = [-10, 100, 20, 7, 90, -22, 321]
list(filter(lambda x : x < 0, l))
# l의 각 원소를 함수에 전달해서 True인 값만 모아서 반환
````

````python
# [v + 10 for v in l]
tuple(map(lambda x : x * 10, l))
````

## docstring

-   함수에 대한 설명
-   함수의 구현부의 첫번째에 여러줄 문자열로 작성한다.
-   함수 매개변수/리턴타입에 대한 힌트(주석)

````python
num: int  = 10
# 변수명:타입
````

````python
def calc(num1:int|float, num2:int) -> int:
    """
    함수에 대한 설명
    Args:          # 파라미터 설명 - 변수명 (타입): 설명
        num1 (int|float): 피연산자 1
        num2 (int): 피연산자 2
    
    Returns:       # 리턴값에 대한 설명 - 타입: 설명
         int: 계산결과

    Raise:         # 발생가능성이 있는 오류(Exception) 오류이름: 설명(언제발생하는지)
        TypeError: 숫자가 아닌 argument를 받았을때
    """
    pass
````

````python
help(calc)
````

````python
help(print)
````

#### pass 키워드(예약어)

-   빈 구현부를 만들때 사용
    -   코드블럭(함수, 제어문)을 하는 일 없이 채울 때 사용
    -   `...` 을 대신 사용할 수 있다.

## TODO

````python
# 1. 사용자가 입력한 단의 구구단을 출력하는 함수를 구현(매개변수로 단을 받는다.)

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
````

````python
gugudan_print(6)
````

````python

# 2. 시작 정수, 끝 정수를 받아 그 사이의 모든 정수의 합을 구해서 반환하는 함수를 구현
# (ex: 1, 20 => 1에서 20 사이의 모든 정수의 합계)
def accumulate(start:int, end:int)->int:
    """
    파라미터로 받은 정수 범위의 합계를 계산해서 반환.
    
    Args:
        start(int) - 범위의 시작 정수
        end(int) - 범위의 끝 정수. 합계를 구할 때 포함한다.
    Returns:
        int - start ~ end 사이의 정수의 합계.
    """
    result = 0 # 누적합계를 저장할 변수
    for v in range(start, end+1):
        result += v
    return result
````

````python
accumulate(10, 20)
accumulate(1, 10)
````

````python
sum([1, 2, 3, 4]) # 1 + 2 + 3 + 4
list(range(1,10))

sum(range(1, 11))
max([1, 2, 2, 3,3, 4])
min([10, -20, 1, 23])
````

````python
# 3. 2번 문제에서 시작을 받지 않은 경우 0을, 끝 정수를 받지 않으면 10이 들어가도록 구현을 변경

def accumulate2(start:int=0, end:int=10)->int:
    return sum(range(start, end+1))
````

````python
accumulate2(end=20)  # 0 ~ 20
accumulate2(start=5) # 5 ~ 10
````

````python
# 4. 체질량 지수는 비만도를 나타내는 지수로 키가 a미터 이고 몸무게가 b kg일때 b/(a**2) 로 구한다.
# 체질량 지수가
# - 18.5 미만이면 저체중
# - 18.5이상 25미만이면 정상
# - 25이상이면 과체중
# - 30이상이면 비만으로 하는데
# 몸무게와 키를 매개변수로 받아 비만인지 과체중인지 반환하는 함수를 구현하시오.


def check_bmi(tall:float, weight:float)->str:
    """
    BMI 지수를 계산해서 비만도를 알려주는 함수.
    
    Args:
        tall(float) - 키. 단위는 미터
        weight(flaot) - 몸무게. 단위는 Kg
    Returns:
        str - 비만도(저체중, 정상, 과체중, 비만) 계산 결과.
    """
    bmi = weight/tall**2
    if bmi < 18.5:
        return "저체중", round(bmi, 2) # 반올림 (반올림할값, 자릿수)
    elif bmi < 25:
        return "정상", round(bmi, 2)
    elif bmi < 30:
        return "과체중", round(bmi, 2)
    else:
        return "비만", round(bmi, 2)
````

````python
check_bmi(1.83, 243)
````

````python
round(2.456)
round(2.4567, 2) #  반올림할값, 반올림할 위치 (양수-실수부, 음수-정수부, 0: 정수로 반올림-소숫점 첫자리)
round(23456.6789, -2)
````

````python
# 람다식
# 5. filter()를 이용해 다음 리스트에서 양수만 추출해 리스트를 구현
ex1 = [1, -10, -2, 20, 3, -5, -7, 21]

for v in filter(lambda x : x > 0, ex1):
    print(v)
````

````python
list(filter(lambda x : x > 0, ex1))
````

````python
# 6. filter()와 map()을 이용해 다음 리스트에서 1.음수만 추출한 뒤 그 2. 2 제곱한 값들을 가지는 리스트를 구현
ex2 = [1, -10, -2, 20, 3, -5, -7, 21]
f1 = filter(lambda x : x < 0, ex2)
m = map(lambda x : x ** 2, f1)
list(m)
````

````python
[v ** 2 for v in ex2 if v < 0]
````

````python

list(map(lambda x : x ** 2, (filter(lambda x : x < 0, ex2))))
````

---

## 학습 정리



- 함수는 하나의 책임을 갖도록 입력·처리·반환을 명확히 구분한다.

- 출력과 반환은 다르며, 반환값이 있어야 다른 코드에서 결과를 재사용할 수 있다.

- `*args`와 `**kwargs`는 유연하지만 함수의 의도가 흐려지지 않도록 사용해야 한다.

- 함수를 값으로 전달할 수 있다는 특성이 정렬·변환·필터링 API의 기반이 된다.
