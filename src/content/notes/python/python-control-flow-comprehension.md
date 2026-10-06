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

> 이 글은 SKN31 학습 과정에서 작성한 Jupyter Notebook을 바탕으로 정리했습니다.
> 당시 작성한 Markdown 필기와 코드 주석은 보존하고, 글의 흐름을 위해 도입·보충 설명·학습 정리를 덧붙였습니다.
> 원본 노트북: `04_제어문_컴프리헨션.ipynb`

## 이 글에서 확인할 내용



- 조건문으로 상황에 따라 다른 코드를 실행한다.

- 반복문과 종료 조건을 이용해 같은 처리를 반복한다.

- `range`와 `enumerate`로 반복 범위와 순번을 함께 다룬다.

- Comprehension으로 변환과 필터링 결과를 새로운 자료구조에 저장한다.



## 필기를 다시 읽으며 잡은 핵심



제어문 필기에서는 학점 계산, 사칙연산 계산기, 월별 날짜 수, 아이디 검증처럼 조건이 여러 갈래로 나뉘는 예제를 직접 구성했다. 조건의 순서가 결과에 영향을 주기 때문에 넓은 범위보다 구체적인 조건을 어디에 배치할지도 함께 확인했다.

반복문에서는 리스트 전체에 같은 연산을 적용하고, 사용자 입력을 종료 조건까지 계속 받으며, 양수와 음수를 나누어 저장하는 흐름을 연습했다. `break`와 `continue`는 단순 문법이 아니라 반복을 끝내거나 현재 회차만 건너뛰는 제어 도구로 이해했다.

Comprehension 부분은 기존 반복문과 비교하는 방식으로 기록되어 있다. 결과가 단순한 변환·필터링이면 표현이 명확하지만, 중첩 조건이 많아지면 일반 반복문이 더 읽기 좋다는 기준도 함께 가져가는 것이 중요하다.

---

## 제어문(Control flow statement)
기본적으로 프로그램은 순차구조를 가진다. 즉 작성한 순서대로 실행이 된다.  
이런 실행흐름을 다른 순서로 제어하기 위한 구문을 만드는 문법이 제어문이다.  
제어문은 **조건문** 과 **반복문** 두가지 문법이 있다.
- **조건문**
    - if 문
- **반복문**
    - while 문
    - for in 문

## 조건문/분기문 (conditional statement)
- 프로그램이 명령문들을 실행하는 도중 특정 순서에서 **조건에 따라 흐름의 나눠져야 하는 경우 사용한다**
- 파이썬은 조건문으로 **if문**이 있다.

![조건문](/images/python/ch03_01.png)

<center>입력 받은 a 의 값이 0인지 여부에 따라 두가지 흐름으로 분기된다.</center>

### 구문

- 조건이 True일 경우만 특정 구문들을 실행 하는 조건문.
```python
if 조건:    # 조건은 bool 표현식을 기술한다. 조건선언 다음에 : 으로 선언해서 코드블록을 구분한다.
    명령문1  # 조건이 True이면 실행할 구문들을 코드블럭에 기술한다.
    명령문2  # 코드 블록은 들여쓰기를 이용해 묶어준다. 보통 공백 4칸으로 들여쓰기를 한다.
    ...
```
> ### 파이썬의 코드블록(code block)  
> 코드블록이란 **여러 명령문들을 묶어놓은 것을** 말한다. 코드블록으로 묶이면 실행시 같이 다 실행되고 실행이 안되면 같이 다 실행이 안된다.    
> 파이썬에서는 코드블록을 작성할 때 **들여쓰기를 이용해 묶어준다.**   
> 같은 칸만큼 들여쓰기를 한 명령문들이 같은 블록으로 묶인다.
> 들여쓰기는 관례적으로 **공백 4칸을** 사용한다. 

> ### pass 키워드(예약어)
> - 빈 구현부를 만들때 사용
>     - 제어문, 함수의 body 코드블럭은 비울 수 없다. 반드시 명령문을 한개 이상 작성해야한다. 
>     - 작성할 내용이 없을 경우 사용하는 키워드로 `pass`를 사용한다. 
>     - `...` 을 대신 사용할 수 있다.

````python
print("숫자를 입력받습니다.")  # 1번
num = int(input("숫자:"))     # 2번
# 3번째
if num == 0: # 조건문의 선언부
    print("0입니다.") # 3-1
    print("Zero")     # 3-2
print("종료")   # 4번
````

````python
print("숫자를 입력받습니다.")  # 1번
num = int(input("숫자:"))     # 2번
# 3번째
if num == 0: 
    pass
print("종료")
````

````python
print("숫자를 입력받습니다.")  # 1번
num = int(input("숫자:"))     # 2번
# 3번째
if num == 0 : print("Zero") 
   #True일 때 실행할 명령문이 1개일때는 한줄에 작성가능. if 조건 : 명령문
    
print("종료")
````

- **조건이 True일때 실행할 구문과 False일때 실행하는 조건문.**
```python
if 조건:     
    명령문1_1 # 조건이 True일 경우 실행할 구문들
    명령문1_2
    ...
else:
    명령문2_1 # 조건이 False일 경우 실행할 구문들
    명령문2_2
    ...
```

````python
num = 10  # 1번 - 숫자 입력받기
# 2. 
if num == 0:
    print("0입니다.")
    print("Zero")
else: # num == 0 이 False인 경우 할일
    print("0이 아닙니다.")
    print("Not Zero")

print("종료") # 3
````

- **조건이 여러 개인 조건문.**
```python
if 조건1:
    명령문1_1  # 조건1이 True일 경우 실행할 코드블록. 
    명령문1_2
    ...
elif 조건2:    # 다음 조건으로 앞의 조건들이 모드 False일 경우 비교한다.
    명령문2_1  # 조건2가 True일 경우 실행할 코드블록.
    명령문2_2
    ...
elif 조건3 :
    명령문3_1
    명령문3_2
    ...
else:         # 위의 모든 조건이 False일 경우 실행하는 코드블록. 생략 가능하다.
    명령문4
```

````python
# 1 숫자 입력
num1, num2 = 10, 20
# 연산자 입력
# oper = input("사칙연산자(+, -, *, /):").strip()
oper = 'X'
# 연산 -> 연산자에 따라서 다른 연산 실행
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
# print(f"{num1} {oper} {num2} = {result}")
````

````python
month_str = input("월:")
if month_str.isdigit():  # 문자열이 정수 형태인지?
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
````

````python
if []:
    print("A")

print("종료")
````

````python
cust_id = ""  # ID를 입력
# if len(cust_id) > 0:   # 만약에 ID를 입력받았다면 가입처리
if cust_id:  # 0 글자: False, 1글자 이상: True
    print("가입처리")
````

## 반복문 (Loop statement)

특정 구문들을 반복해서 실행할 때 사용한다. 동일한 코드를 여러번 반복하거나 값이 일정하게 변하는 코드를 반복할 경우 사용한다.  
단순 반복을 처리하는 **while문**과 iterable객체가 제공하는 값들을 반복 조회하는 **for in문** 두가지 문법이 있다.

![반복문](/images/python/ch03_02.png)
<center>count의 값이 limit의 값보다 크거나 같을때 까지 count의 값을 1증가 후 출력하는 구문을 반복한다. </center>

### while문
- 조건이 True인 동안 구문을 반복해서 실행한다.

#### 구문
```python
while 조건:       # 조건은 bool 표현식을 기술한다. 조건선언 다음에 : 으로 선언해서 코드블록을 구분한다
    반복할 구문1  # 반복할 구문을 코드블록으로 작성한다.  
    반복할 구문2
    ...
```

````python
limit = int(input("정수:"))  # 1번
count = 0                    # 2번
# 3번: count가 limit 보다 작은 동안 반복
while count < limit:
    print(count, "번 라인")
    count += 1  #  count = count + 1

print("종료") # 4번
````

### for  in 문
- Iterable 객체를 순환조회하는 구문
    - for in문은 Iterable 타입의 객체가 가지고 있는 값들을 하나씩 처리하는 구문을 작성할 때 사용한다.

> - **Iterable**
>    - 반복가능한 객체. 반복문(for in)을 이용해 일련의 값들을 반복적으로 각각 제공하는 객체를 말한다. 
>    - 대표적으로 List, Tuple, Dictionary, Set, 문자열 등이 있다.

#### 구문
```python
for 변수 in Iterable: # for in 선언후 : 으로 선언부와 구현부를 나눈다.
    반복구문          # Iterable이 반복시 제공하는 값을 가지는 "변수"를 이용해 값들을 처리하는 구문을 코드블록으로 작성한다.
    반복구문
```

````python
# list의 모든 정수에 10을 더한 값을 출력 ==> 일괄처리
l = [ 10, -2, 5, 90]

for value in l: # for 선언부 - value: 조회한 원소를 저장할 변수.
    result = value + 10
    print(result)
````

````python
t = (100, 200, -300)
# t의 원소들 + 10 한 값들(결과들)을 모아서 저장 -> list에 저장.
result = []  # list() 빈리스트
for v in t:
    result.append(v + 10)

print("최종결과:", result)
````

````python
d = dict(a=1, b=2, c=3)
for key in d: # key을 제공
    print(key, d[key])
````

````python
# 중첩 자료 구조. 원소가 자료구조 -> 원소 자료구조의 개수가 모두 동일한 경우
a = [(1, 2), (2, 3), (4, 5), (6, 7)]

# for v in a:
for v1, v2 in a:   # 받은 값이 자료구조 대입(튜플대입)이 가능할 경우 적용할 수있다.
    # print(type(v), v)
    print(v1, v2, v1 + v2)
````

### continue와 break를 이용한 반복문 제어
- **continue**
    - 실행 블록에서 continue가 실행되면 현재 반복을 중단하고 다음 반복을 진행한다.
    - 특정 조건에서 처리를 멈추고 다음 처리를 반복할 때 사용한다.
- **break**
    - 반복문 실행을 중단한다.
    - 특정 조건에서 반복문을 중간에 중지할때 사용한다.
- continue와 break는 특정 조건에서 실행되야 하는 경우가 대부분이므로 if문 안에 작성한다.

````python
l = [1, 2, 3, 'quit', 4, 5]

for v in l:
    print(v)
    if v == 'quit':
        break
````

````python
l = [1, 2, 3, 4, 5, 6, 7, 8]
# 3의 배수만 출력
for v in l:
    if v%3 != 0: # 3의 배수가 아닌조건
        continue

    print(v)
````

````python
# 사용자로 부터 문자열을 계속 입력받는다.
# 사용자가 입력한 문자열 값들 중에서 정수 형태만 저장. !q를 입력받으면 종료
print("종료하려면 '!q'를 입력하세요")

num = input("입력")
result = []

while num != '!q':
    if not num.isdigit():  # 양수가 아니면
        num = input("입력")
        continue

    result.append(num)
    num = input("입력")
````

````python
result
````

````python
from random import randint

# randint(-100, 100)  # -100 ~ 100 사이의 랜덤 정수를 반환
pos = []
neg = []
# -100 ~ 100 사이의 랜덤값을 생성-양수: pos, 음수: neg 에 담기. 0이면 종료

while True:
    v = randint(-100, 100)
    if v > 0:
        pos.append(v)
    elif v < 0:
        neg.append(v)
    else:
        print("0이므로 종료")
        break
````

````python
pos
````

````python
neg
````

### for in 문 연관 내장 함수

#### range()
- 일정한 간격의 연속된 정수를 제공하는 반복가능 객체 생성한다.
- 구문
    - `range([시작값], 멈춤값, [증감값])`
        - 시작값, 멈춤값, 증감값 모두 정수만 가능하다.
        - 시작값 > 멈춤값 이고 증감값이 음수이면 내림차순으로 값을 제공한다.
        1. 전달값이 **1개: 멈춤값**. 
            - 0 ~ (멈춤값-1)까지 1씩 증가하는 정수를 제공
        2. 전달값이 **2개: 시작값, 멈춤값**. 
            - 시작값 ~ (멈춤값-1) 까지 1씩 증가하는 정수 제공
        3. 전달값이 **3개: 시작값, 멈춤값, 증감값(간격)**. 
            - 시작값 ~ (멈춤값-1)까지 증감값만큼 증가하는 정수를 제공.

````python
range(20)
````

````python
for v in range(10, 20, 2):
    print(v, end="\t")
````

````python
for v in range(10, 20):
    print(v, end="\t")
````

````python
for v in range(10):
    print(v, end="\t")
````

````python
for _ in range(5):
    print("반복할 내용")
````

````python
# range() -> iterable 
l = list(range(1, 101, 5))
l
````

````python
tuple(range(10))
````

### enumerate()

- 구문
    - `enumerate(Iterable,  [, start=정수])`
        - 현재 몇번째 값을 제공하는 지(현재 몇번째 반복인지)를 나타내는 **index**와 제공하는 **원소**를 tuple로 묶어서 반환
        - Iterable
            - 값을 제공할 Iterable객체
        - start: 정수
            - index 시작 값. 생략하면 0부터 시작한다.

````python
l = [100, -20, 200, 30, 7]
for v in enumerate(l):   #   (몇번째 제공되는 값인지, value): tuple
    print(v)
````

````python
for i, v in enumerate(l): # 튜플대입으로 받기
    print(f"{i+1}. {v}")
````

````python
for i, v in enumerate(l, start=100): # start 값 부터 시작
    print(f"{i}. {v}")
````

### zip()
- 여러 개의 Iterable 객체를 받아 반복시 같은 index의 값끼리 튜플로 묶어 반환한다.
- 구문
    - `zip(Iterable1, Iterable2, Iterable3 [, .......])`
        - Iterable 2개이상.전달한다.
- 각 Iterable이 제공하는 원소의 개수가가 다를 경우 가장 적은 것의 개수에 맞춰 반복한다.

````python
names = ['홍길동', '이순신', '유관순']
ages = [20, 30, 40, 50, 60, 70]
addresses = ['서울', '부산', '병천']
````

````python
for info in zip(names, ages, addresses): # 같은 index의 값들을 tuple로 묶어서 반환.
    print(info)
````

````python
for name, age, address in zip(names, ages, addresses):
    print(f"이름: {name}, 나이: {age}, 주소: {address}")
````

## 컴프리헨션(Comprehension)

- 기존 Iterable의 원소들을 이용해서 새로운 자료구조(List, Dictionary, Set)를 생성하는 구문.
    - 기존 Iterable의 **원소들을 처리한 결과**나  **특정 조건이 True인 값들을** 새로운 자료구조에 넣을때 사용.
    - 결과를 넣을 새로운 자료구조 타입에 따라 다음 세가지가 있다.
        - 리스트 컴프리헨션
        - 딕셔너리  컴프리헨션
        - 셋  컴프리헨션
- **튜플 컴프리헨션**은 tuple() 함수를 이용해서 만든다.
- **딕셔너리 컴프리헨션**과 **셋 컴프리헨션**은 파이썬 3 에 새로 추가되었다.
-   컴프리헨션 문법은 iterable 을 타입을 넣는 곳에서는 다 적용할 수있다.

````python
l = list(range(1, 11))
l
````

````python
# l의 모든 값들에 * 5 한 것을 다른 list에 추가. -> 일괄처리 후 그 결과를 저장.
result = []
for v in l:
    result.append(v * 5)

print(result)
````

````python
# v * 5 for v in l : 컴프리헨션
result2 = [v * 5 for v in l]
print(result2)
````

````python
result3 = {v * 5 for v in l}  
result3
````

````python
result4 = {f"{v}번" : v * 5 for v in l}  # {k : v}
result4
````

````python
# 컴프리헨션 구문(식) ==> iterable 타입
list(v * 5 for v in l)
````

````python
# l의 원소 중에서 짝수만 추출해서 저장.
result_even = []
for v in l:
    if v % 2 == 0:
        result_even.append(v)

result_even
````

````python
result_even2 = [v for v in l if v % 2 == 0]
result_even2
````

````python
# [컴프리헨션]
# {컴프리헨션}
# {k:v 컴프리헨션}
# (컴프리헨션)
````

````python
(v for v in l)
````

````python
# 튜플 컴프리헨션 -> tuple() 함수이용
tuple(v for v in l)
````

````python
for v in l:
    if 조건:
        l2.append(v)

l2 = [v for v in l if 조건]
````

````python
l = [
    [1, 2], [3, 4]
]

# for v in l:
#     for value in v:
#         if value > 0:
#             r.append(value)

[value for v in l for value in v if value > 0]
````

## TODO

````python
#(1) 다음 점수 구간에 맞게 학점을 출력하세요.
# 91 ~ 100 : A학점
# 81 ~ 90 :  B학점
# 71 ~ 80 :  C학점
# 61 ~ 70 :  D학점
# 60이하   :  F학점

jumsu = 55

if jumsu < 0 or jumsu > 100:
    print(f"{jumsu}는 잘못된 점수입니다. 0 ~ 100 사이의 점수를 입력하세요.")
elif jumsu >= 91:
    print(f"{jumsu}: A학점")
elif jumsu >= 81:
    print(f"{jumsu}: B학점")
elif jumsu >= 71:
    print(f"{jumsu}: C학점")
elif jumsu >=61:
    print(f"{jumsu}: D학점")
else:
    print(f"{jumsu}: F학점")
````

````python
#(2) 사용자로 부터 ID를 입력 받은 뒤 입력받은 ID가 5글자 이상이면 "사용할 수 있습니다."를 
# 5글자 미만이면 "사용할 수 없는 ID입니다."를 출력하세요.

cust_id = input("ID:").strip()
if len(cust_id) >= 5:
    print("사용할 수 있습니다.")
else:
    print("사용할 수 없는 ID 입니다.")
````

````python
#(3) 사용자로부터 우리나라 도시명을 입력 받은 뒤 입력받은 도시명이 서울이면 "특별시"를 
# 인천,부산,광주,대구,대전,울산 이면 "광역시"를 나머지는 "특별시나 광역시가 아닙니다."를 출력하세요.

city = input("도시명:")
if city == "서울":
    print(f"{city}는 특별시")
elif city in ["인천","부산","광주","대구","대전","울산"]:
    print(f"{city}는 광역시")
else:
    print(f"{city}는 특별시나 광역시가 아닙니다.")
````

````python
#(4-5)
#(4) 아래 리스트의 평균을 구하시오. 
jumsu = [100, 90, 100, 80, 70, 100, 80, 90, 95, 85]

sum_result = 0
for value in jumsu:
    sum_result = sum_result + value # sum_result += value

print(f"총합: {sum_result}")

avg_result = sum_result / len(jumsu)
print(f"평균점수: {avg_result}")
````

````python
cnt = 1
for v in jumsu:
    print(cnt, "Pass" if v >= avg_result else "Fail")
    cnt += 1
````

````python
#(5) 위 jumsu리스트에서 평균점수이상은 pass, 미만은 fail을 index번호와 함께 출력하시오. 
# (ex: 0-pass, 1-pass, 2-fail)

for idx, v in enumerate(jumsu, start=1):
    print(f"{idx}-{"pass" if v >= avg_result else "fail"} {v}점")
````

````python
#(6) 아래 리스트 값들 중 최대값을 조회해 출력하시오.
jumsu = [60, 90, 80, 80, 70, 55, 80, 90, 95, 85]


max_value = jumsu[0]
for v in jumsu:
    if v > max_value:
        max_value = v

print(f"최고점수:{max_value}")
````

````python
#(7) 다음 리스트 중에서 "쥐"와 "토끼" 제외한 나머지를 출력하세요.
str_list = ["쥐", "소", "호랑이", "토끼", "용", "토끼", "뱀", "돼지", "호랑이"]


for v in str_list:
    if v not in ['쥐', '토끼']:
        print(v)
````

````python
#(8) 사용자로부터 정수를 입력받아 그 정수 단의 구구단을 출력하시오. 
# ex) 
# 단을 입력하시오 : 2  
# 2 x 1 = 2
# 2 x 2 = 4
#..
# 2 x 9 = 18

num_str = input("단을 입력하세요:").strip()
if num_str.isdigit(): 
    num = int(num_str)
    for value in range(1, 9): # 1 ~ 9, 1씩 증가
        print(f"{num} X {value} = {num * value}")
else:
    print("단은 정수만 입력하세요.")
````

````python
#컴프리헨션

#(9) 다음 리스트가 가진 값에 두배(* 2)를 가지는 새로운 리스트를 만드시오. (리스트 컴프리헨션 이용)
lst = [10, 10, 10, 30, 70, 5, 120, 700, 1, 35]


result = [v * 2 for v in lst]
print(result)
{v * 2 for v in lst}
````

````python
#(10) 다음 리스트가 가진 값에 10배의 값을 가지는 값을 (원래값, 10배값) 의 튜플 묶음으로 가지는 리스트를 만드시오 (리스트 컴프리헨션 이용)
# Ex) [(10,100), (30,300), .., (35, 350)]
lst = [10, 30, 70, 5, 5, 120, 700, 1, 35, 35]


result = [(v, v * 10) for v in lst]
print(result)
````

````python
#(11) 다음 리스트가 가진 값들 중 3의 배수만 가지는 리스트를 만드시오. (리스트 컴프리헨션 이용)
lst2 = [ 3, 20, 33, 21, 33, 8, 11, 10, 7, 17, 60, 120, 2]


result = [v for v in lst2 if v % 3 == 0]  # 특정 조건의 값들만 선택할 때.
print(result)
````

````python
#(12) 다음 파일이름들을 담은 리스트에서 확장자가 exe인 파일만 골라서 새로운 리스트에 담으시오.(string의 endswith()함수 이용)
file_names=["test.txt", "a.exe", "jupyter.bat", "function.exe", "b.exe", "cat.jpg", "dog.png", "run.exe", "i.dll"]


result = [file_name for file_name in file_names if file_name.endswith(".exe")]
result
````

````python
#(13) 다음 중 10글자 이상인 파일명(확장자포함)만 가지는 리스트를 만드시오.
file_names=["mystory.txt", "a.exe", "jupyter.bat", "function.exe", "b.exe", "cat.jpg", "dog.png", "run.exe", "i.dll"]

# result = [file_name for file_name in file_names if len(file_name)>=10]
result = {file_name:len(file_name) for file_name in file_names if len(file_name)>=10}
result
````

````python
"abcdE".islower()
"abcd".islower()

"ABC".isupper()
"aABC".isupper()
````

````python
#(14) 다음 리스트에서 소문자만 가지는 새로운 리스트를 만드시오.
str_list = ["A", "B", "c", "D", "E", "F", "g", "h", "I", "J", "k"]

result = [v for v in str_list if v.islower()]
result
````

---

## 학습 정리



- 조건문의 분기 순서와 반복문의 종료 조건을 명확하게 설계해야 한다.

- `range`는 숫자 범위를 만들고 `enumerate`는 값과 순번을 함께 제공한다.

- Comprehension은 변환과 필터링이 간단할 때 가장 읽기 좋다.

- 복잡한 중첩 로직은 짧게 줄이는 것보다 명확하게 작성하는 것이 우선이다.
