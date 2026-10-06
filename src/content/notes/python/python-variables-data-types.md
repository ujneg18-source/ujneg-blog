---
title: "변수와 데이터 타입: 객체, 할당, 연산 이해하기"
description: "Python의 변수와 객체 관계를 이해하고 주요 데이터 타입과 연산 방법을 예제로 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Python 기초'
seriesOrder: 2
originalNotebook: "02_변수와 데이터타입.ipynb"
tags: ["Python","Variable","Data Type"]
date: 2026-04-13
---

> 이 글은 SKN31 학습 과정에서 작성한 Jupyter Notebook을 바탕으로 정리했습니다.
> 당시 작성한 Markdown 필기와 코드 주석은 보존하고, 글의 흐름을 위해 도입·보충 설명·학습 정리를 덧붙였습니다.
> 원본 노트북: `02_변수와 데이터타입.ipynb`

## 이 글에서 확인할 내용



- 변수 생성과 할당이 객체를 이름에 연결하는 과정임을 이해한다.

- 식별자 규칙과 읽기 좋은 변수 이름의 관례를 익힌다.

- 숫자, 논리값, 문자열 등 주요 데이터 타입의 연산을 실습한다.

- 문자열 인덱싱·슬라이싱·포매팅과 사용자 입력을 다룬다.



## 필기를 다시 읽으며 잡은 핵심



이 노트북에서는 값을 외우기보다 변수에 값을 할당하고 다시 조회하는 과정을 반복해서 확인했다. 특히 “변수 안에 값이 들어간다”는 표현보다, 이름이 메모리의 객체를 참조한다고 이해하는 것이 이후 자료구조와 함수의 동작을 설명하기 편했다.

문자열 실습에서는 `str`과 `int`를 바로 더할 수 없는 경우, 앞뒤 공백 제거, 여러 줄 문자열, 인덱싱과 슬라이싱, 포매팅을 직접 비교했다. 마지막 연습 문제들은 주민번호 일부 조회, 문자열 반복, 글자 수와 포함 여부, 입력값 형 변환처럼 자주 사용하는 조작을 한 번에 복습하도록 구성했다.

---

## 변수와 함수/연산자

<strong style='color:red;font-size:1.5em'>프로그램이 하는 일</strong>
<p>
<span style="font-size:1.2em">- 정보(데이터)를 처리한다.</span>

- <b style='font-size:1.2em'>정보(데이터)</b>: **변수(Variable)와 값(Value)** 로 프로그램에 표현한다.
- <b style='font-size:1.2em'>처리한다</b>: **연산자(Operator)와 함수(Function)** 으로 프로그램에 표현한다.
    
> **표현식(Expression)**
>    - 값(Value)으로 평가되는 구문(Statement)를 말한다.
>    - **표현식의 두가지**
>        - 평가(eval)되어 새로운 값을 생성하는 모든 경우.
>            - 연산: 10 + 10
>            - 변수 호출
>            - 함수 호출
>        - **리터럴(Literal)**: 표현식 자체가 값인 경우
>             - 10, 20.56, "A"
>

## 변수 (Variable)
- 프로그램이 작업을 수행중에 사용할 **값을 저장하는 메모리 공간이다.**
- 사용하려는 값이 어떤 값인지를 표현한다.
- 하나의 변수는 하나의 값만 가질 수 있다.
    - 하나의 변수에 여러개의 값을 저장해야 하는 경우 객체나 자료구조를 이용해 값들을 모아서 저장한다.
- 변수는 이름(식별자)으로 관리된다.
    - 각 변수 메모리 공간은 주소를 가지지만 프로그램 상에서 직접 그 주소를 사용할 수 없다. 대신 그 변수를 식별할 수 있는 이름을 이용해 변수에 값을 넣거나 조회할 수 있다. 이 변수의 이름을 **식별자(Identifier)** 라고 한다.
    - 변수 이름(식별자)는 거기에 저장될 값의 의미를 알수 있도록 만든다.
    
### 변수 선언및 초기화
- 변수명 = 값
    - 변수는 반드시 선언하면서 값을 대입 해야 한다.
    - 선언시 대입할 값이 없으면 None을 대입 (`name = None`)

  
#### 식별자 규칙과 변수이름 주는 관례

##### 식별자 규칙
- 식별자란 파이썬에서 사용하는 것들을 구분하기 위해 주는 이름을 말한다. 
- 사용할 수 있는 문자는 **일반 문자**(영어 알파벳 뿐 만 아니라 한글 한자 등 모든 일반 문자를 사용할 수 있다.), **숫자, 특수 문자는  _(underscore) 만** 가능.
- 숫자는 **두번째 글자** 부터 사용할 수 있다.
- **예약어(keyword, reserved word)** 는 사용할 수 없다.
- 대소문자를 구별한다.

> <b style='font-size:1.2em'>파이썬 키워드</b>
> ```python
> False      await      else       import     pass
> None       break      except     in         raise
> True       class      finally    is         return
> and        continue   for        lambda     try
> as         def        from       nonlocal   while
> assert     del        global     not        with
> async      elif       if         or         yield
> ```

##### 변수이름 관례
- 모든 글자를 소문자로 한다.
- 여러 단어를 조합할 경우 `_` 로 구분한다.
    - 이런 표기법을 **스네이크 표기법** 이라고 한다.
- 예: `name`, `age`, `customer_name`, `product_id`, `sale_price`

#### 변수이름 관례 종류
- Snake 표기법
    모든 글자를 소문자로 한다. 여러 단어를 조합할 경우 `_` 로 구분한다.
    - user_name, bank_account, save_data
- Camel 표기법
    - 소문자로 시작하고 여러 단어를 조합할 경우 각 단어의 첫글자를 대문자로 한다.
    - userName, bankAccount, saveData
- 파스칼 표기법
    - 소문자를 기본으로 하되 여러 단어를 조합할 경우 각 단어의 첫글자를 대문자로 한다.
    - UserName, BankAccount, SaveData

````python
age = 20
````

````python
# 변수를 생성하고 값을 대입(할당-assign)
name = "홍길동"
````

````python
age = 30
````

````python
address = None
````

````python
# 변수의 값을 사용 - 변수이름
name
````

````python
age
````

````python
age + 5
````

````python
name
age
address
````

> **print()함수**
> - ( ) 안에 전달해주는 값(Argument)을 문자열로 변환 후 화면(Teminal)에 출력하는 함수
>     - 값에 엔터를 붙인뒤 출력한다.
> - 여러개의 값을 출력할 경우 나열해서 전달하면 된다.
> - 여러개의 값을 출력할 경우 구분자는 공백을 기본값으로 한다. 다른 구분자를 사용할 경우 `sep=구분자문자열`를 전달한다.
> - 뒤에 엔터 대신 다른 값을 붙일 경우 `end=붙일문자열` 을 전달한다.

````python
print(name)
print(age)
print(address)
````

````python
print(name, age, address, 10000)
print(name, age, address, 10000, sep=",") # 구분자로 공백대신 sep의 값을 사용
````

````python
print(name, end="-")  # 뒤에 엔터대신에 end의 값을 사용
print(age)
````

````python
print(Name) # 변수명 대소문자 구분
````

````python
age3 = 20
````

````python
# control + / : 주석 단축키
# 3age = 30
my_name = 30 # 특수문자는 _ 만 가능. (위치는 상관없다.)
askjdlfkajsdlasdjlkasdjlkasdjlksadjlasdfkjasldfkjasd = 2
print(askjdlfkajsdlasdjlkasdjlkasdjlksadjlasdfkjasldfkjasd)
````

### 변수 사용
- 변수를 사용하는 것은 변수에 값을 변경(대입)과 변수가 가진 값을 조회하는 두가지가 있다.

#### 변수에 값 대입/할당 (assignment)
1. 변수명 = 값
    - `=`을 기준으로 왼쪽은 변수, 오른쪽은 대입할 값
    - 대입할 값으로 다음이 올 수 있다.
        - Literal 값(값 표현식)
        - 다른 변수
        - 연산식
    - 변수 초기화와 변수값 변경의 파이썬 구문은 동일하다. 변수를 처음 만들고 값을 대입하면 초기화이고 그 이후 할당하는 것들은 변경이 된다.

2. 여러 변수에 동일 한 값 대입
    - a = b = c = 30

3. 여러 변수에 다른 값 대입을 한 구문으로 처리
    - `a, b, c = 10, 20, 30`

````python
a = b = c = d = 50
print(a, b, c, d)
````

````python
i, j, k = 1.5, 2.3, 3.4
print(i, j, k)
````

4. 대입(할당) 연산자(Assignment operator)

- 변수의 값을 그 변수와 다른 값을 연산한 결과로 변경한다.
  
|연산자|예|동일연산|
|:-|-|-|
|=|x = 1||
|+=|x += 1|x = x + 1|	
|-=|x -= 1|x = x - 1|	
|*=|x *= 1|x = x * 1|	
|/=|x /= 1|x = x / 1|	
|%=|x %= 1|x = x % 1|	
|//=|x //= 1|x = x // 1|	
|\*\*=|x \*\*= 1|x = x \*\* 1|

#### 변수값 조회
- 값을 사용해야 하는 자리에 변수명을 표현하면된다.
    - 변수명을 쓰면 그 변수가 가진 값을 조회해 사용한다.

### 변수를 메모리에서 제거

메모리에서 변수(데이터 저장공간)을 제거할 때는 `del 변수명` 명령어를 사용한다.

````python
print(name)
````

````python
del name
````

````python
print(name)
````

## 데이터 타입 (Data Type)

- 값들의 형태(type)에 따라 종류를 분류한 것
- 데이터타입은 값을 표현하는 방식과 관련 연산자들을 익히도록 한다.

### None 값
- 아무 값도 없음을 나타내는 값

````python
age = None
````

### 숫자형(Numeric) - 정수, 실수

- 정수(int)와 실수(float) 형이 있다.
    - **정수 표현식**
        - 10, 20, -1, -20, 0
        - 16진수 표기
            - 0x 로 시작 (0xAF29)
        - 8진수 표기
            - 0O 으로 시작 (0o71)
    - **실수**
        - 20.1, 0.123411, 15.2321598
        - 지수표기법
            - $5e7$ -> $5.0\times10^7$
            - $3e-7$ -> $3\times10^{-7}$

````python
0xAF32
0o32
5e3
3.2e3
5e-2
5e-10
````

````python
100_000_000 + 200
````

#### 연산자
<b style='font-size:1.2em'>산술연산자</b>

|Operator(연산자)|설명|예|
|-|-|-|
|+|덧셈|x + y|
|-|뺄셈|x - y|
|*|곱셈|x * y|
|/|나눗셈|x / y|
|%|Modulus(나머지 나누기 연산자)|x % y|
|//|Floor division(몫 나누기 연산자)|x // y|
|**|제곱연산|x ** y|

````python
10 / 4
10 / 3
10 % 3 # 나머지
10 // 3 # 몫
````

````python
3 * 5
3 ** 5
````

### 논리형(bool)
- **참(True)과 거짓(False)을** 표현하는 데이터 타입
    - 제어문에서 많이 사용된다.
- 값 표현식
    - True, False
- bool 값이 들어가야 하는 구문에 다른 타입의 값을 작성하면 자동적으로 bool 타입으로 변환된다. (묵시적 형변환이라 한다.)
    - **0글자의 문자열, 숫자 0, None, 원소가 하나도 없는 자료구조는** False로 변환되고 그 이외는 True로 변환된다.

````python
# bool(값) 값을 논리형으로 바꿔주는 함수
bool(30)
bool(-20)
bool(0)
bool(None)
bool("aaaa")
bool("")
bool(" ")
````

- input(\[label\]) 함수
    - 사용자로 부터 값을 입력받을 때 사용한다.
    - 사용자의 입력을 기다렸다 사용자가 값을 입력하고 엔터를 치면 그 입력한 값을 읽어 반환한다.
    - 어떤 값을 입력받을 것인지 Label을 문자열로 전달할 수 있다.

````python
input()
````

````python
name = input("이름:")
````

````python
name
````

|이름|나이|주소|
|:-|:-:|-:|
|a|b|c|
|a|b|c|
|a|b|c|
|a|b|c|

#### 논리형 관련 연산자
<b style='font-size:1.2em'>비교 연산자</b>
- 결과가 bool 타입
- 기준은 왼쪽의 피연산자이다.

|연산자|설명|예|
|-|-|-|
|==|같은가?|x == y|	
|!=|같지 않은가?|x != y|	
|>|x가 큰가?|x > y|
|<|x가 작은가?|x < y|	
|>=|x가 크거나 같은가?|x >= y|
|<=|x가 작거나 같은가?|x <= y|

````python
10 == 20
30 == 30
"ABC" == "ABC"
````

````python
10 != 20
10 != 10
````

````python
30 > 20 # 왼쪽이 오른쪽 값보다 크냐
30 > 30
30 > 40
30 >= 30
````

````python
30 < 20
30 < 40
30 < 30
30 <= 30
````

````python

age_str = input("나이:")  # 사용자로부터 입력받은 값을 문자열로 반환.
age = int(age_str)# 입력받은 값을 정수로 변환

if age > 20:
    print("성인입니다.")
else:
    print("미성년자 입니다.")
````

<b style='font-size:1.2em'>논리 연산자</b>
- 피연산자가 bool 타입이고 결과도 bool 타입이다.
- `&`, `|`, `^` 기호를 연산자로 사용할 때는 피연산자를 ( )로 묶어 줘야 한다.

|연산자|설명|예|
|:-|-|-|
|and, &|피연산자 모두 True이면 True를 하나라도 False이면 False를 반환.|x > 5 and  x < 10|	
|or,  \||피연산자 둘중 하나만 True이면 True를 둘다 False이면 False를 반환.|x > 5 or x < -4|
|^|XOR 연산. 피연산자가 다를 경우 True, 같으면 False를 반환.|(x > 5) ^ (x < 4)|
|not|단항연산자. 결과를 뒤바꾸어 반환. True는 False로 False는 True로 반환.|not(x < 5 and x < 10)|

````python
True and True and True
False and True
````

````python
False or False
True or True
````

````python
True ^ False
True ^ True
````

````python
(30 > 20) & (30 < 50)
````

<b style='font-size:1.2em'>조건 연산자</b>


True일때 결과값 <b style='color:purple'>if</b> 조건식 <b style='color:purple'>else</b> False일때 결과값
- 조건식이 True이면 앞의 값을 False이면 뒤의 값을 연산결과로 반환한다.

````python
age = 10
result = "성년" if age > 20 else "미성년"
print(result)
````

````python
num = 10
num = -20
num = 0
result = "양수" if num > 0 else "음수" if num < 0 else "0입니다"
print(result)
````

````python
나이 = 30
이름 = "홍길동"
print(나이)
````

### 문자열 (string)

- 0글자 이상의 문자열을 표현한다.
- 파이썬 3.0 부터는 유니코드 문자열을 지원하므로 영문자 뿐 아니라 모든 나라의 철자들을 기본으로 사용할 수 있다.
- 문자열 표현식
    - **작은 따옴표 또는 큰 따옴표**로 감싼다.
    - 여러줄 문자열(Multiline string)은 **3개 짜리 작은따옴표 또는 큰따옴표**로 감싼다.
        - 문자열 데이터에 `엔터`가 들어갈 경우 편리하다.
    - Escape 문자
        - 키보드에는 있지만 글자로 표현할 수 없는 문자들을 표현할 때 사용한다. `예) 엔터, Tab, Back space 등`
        - 사용하는 글자가 원래 의미에서 벗어나(escape) 다른 의미로 쓰인다고 해서 escape문자라고 한다.
        - 파이썬 뿐 아니라 모든 프로그래밍 언어에서 사용하는 표준이다.
        - 표현: `\문자`

      
        
<b style='font-size:1.2em'>주요 Escape 문자</b>

|Escape문자|설명|
|-|-|
|\n|엔터|
|\t|Tab|
|\b|Backspace|
|`\\`|`\`|
|\\\"|"|
|\\\'|'|


>- r-string (raw string)
>  - 문자열 앞에 r 접두어를 붙인다. (raw) 
>  - escape 문자구분자인 \를 무시하여 escape 문자로 변환하지 않고 작성한 그대로 사용한다.
>  - ex) r"c:\test\example\a.txt"

변수는 `num=20` 이렇게 합니다.
```python
s = "첫번째줄\n두번째줄\n세번째줄"
print(s)
```

````python
# 여러줄 짜리 문자열
s = "첫번째줄\n두번째줄\n세번째줄"
print(s)
````

````python
# 여러줄 짜리 문자열
s2 = """첫번째줄
두번째줄
세번째줄
네번째줄"""
print(s2)
````

````python
s2
````

````python
"I'm a boy.\"aaaa\""
````

````python
c
````

````python
file_path = "c:\\backup\\docs\\note\\a.txt"
print(file_path)
````

````python
file_path = r"c:\backup\docs\note\a.txt"
print(file_path)
````

<b style='font-size:1.2em'>문자열 연산자</b>
- 문자열 + 문자열
    - 두 문자열을 합친다.
    - 문자열은 문자열과만 `+` 연산을 할 수 있다. 다른 타입과 합칠 경우 다른 타입을 문자열로 변환한 뒤 연산해야 한다. (str() 함수이용)

````python
name = "홍길동"
age = 30
print("이름:" + name)
# print("나이:" + age)  # str + int (x)
age_str = str(age)
print("나이:" + age_str)
````

- 문자열 * 정수
    - 문자열을 정수번 반복해서 합친다.

````python
"안녕" * 3  # "안녕" + "안녕" + "안녕"
````

````python
print("결과 1")
print("-" * 30)
print("결과 2")
````

- `in`, `not in`
    - 문자열A in 문자열B
        - 문자열A가 문자열B에 **있**으면 True, 없으면 False를 반환
    - 문자열A not in 문자열B
        - 문자열A가 문자열B에 **없**으면 True, 있으면 False를 반환

````python
address = "서울시 금천구 독산동 대륭 17차"

"금천구" in address  # "금천구" 가 address 안에 있는지 여부
"종로구" in address
````

````python
"금천구" not in address  # "금천구" 가 address 안에 없는지 여부
"종로구" not in address
````

- len(문자열)
    - 글자수를 반환한다.

````python
len("abc")
len(address)
````

````python
len("")
````

````python
len("aaa") > 5
````

#### Indexing과 Slicing

- Indexer 연산자
    - `집합형태[식별자]`
        - 여러개의 값이 모여있는 집합 형태의 데이터에서 그 중 일부를 조회할 때 사용하는 연산자.
            - 문자열, 자료구조 등 다양한 데이터타입에 사용한다.
        - 조회하고자 하는 일부를 식별할 수 있는 `식별자`를 \[\] 안에 넣어 조회한다.
- indexing과 slicing
    - **indexing**: 집합내에서 하나의 값을 조회하는 방법
    - **slicing**: 집합내에서 여러개의 값들을 범위로 지정해 조회하는 방법

#### Indexing과 Slicing을 이용해 문자열내의 일부 문자들(sub string) 조회
- **문자열 내의 각 문자들은 식별자로 index를 가진다.**
    - 양수 index
        - 문자열 앞에서 부터 붙여주는 index
        - 0부터 1씩 증가하는 값을 붙여준다.
        - **앞에서 몇번째 글자 식**으로 조회할 때 사용한다.
    - 음수 index
        - 문자열 맨 뒤에서 부터 붙여주는 index
        - -1 에서 1씩 감소하는 값을 붙여준다.
        - **뒤에서 몇번째 글자 식**으로 조회할 때 사용한다.
    - 모든 문자는 양수/음수 index 두개를 가진다.
    ![index](/images/python/ch02_01.png)

##### Indexing
- 문자열\[index\]
    - index의 문자를 조회
    - 변경은 안된다.
        - 문자열 값 안의 일부를 변경할 수 없다.
        - 문자열처럼 내부의 값을 변경할 수 없는 데이터 타입을 불변(Immutable)이라고 한다.

````python
s = "안녕하세요. 반갑습니다."
````

````python
print(s[0], s[-13])
print(s[-1], s[12])
````

````python
# 한번에 여러개 조회는 안됨. 각각 조회
print(s[0], s[3], s[4])
````

````python
s[0] = "가" # 일부값을 변경하는 것은 안됨. ==> Immutable
````

##### Slicing
- 기본구문: **문자열 \[ 시작 index : 종료 index : 간격\]**
    - 시작 index ~ (종료 index – 1)
    - 간격을 지정하면 간격만큼 index를 증/감한다. (생략 시 1이 기본 간격)
- **0번 index 부터 조회 할 경우 시작 index는 생략가능**
    - str_value \[ : 5\] => 0 ~ 4 까지 조회
- **마지막 index까지 (끝까지) 조회 할 경우 종료 index는 생략 가능**
    - str_value\[2 : \] => 2번 index 에서 끝까지
- **명시적으로 간격을 줄 경우**
    - str_value\[ : : 3 \] => 0, 3, 6, 9.. index의 값 조회
    - str_value\[1 : 9 : 2\] => 1, 3, 5, 7 index의 값 조회
- **시작 index > 종료 index, 간격을 음수로 하면 역으로 반환한다.(Reverse)**
    - str_value\[5: 1: -1\] => 5, 4, 3, 2 index의 값 조회
    - str_value\[: : -1\]  => 마지막 index ~ 0번 index 까지 의미. Reverse 한다.

````python
s2 = "0123456789"
````

````python
s2[1:6]
````

````python
s2[1:-1]
````

````python
s2[:5] # 시작생략: 0, 간격: 1
````

````python
s2[5:] # 끝 생략: 마지막까지 다
````

````python
s2[3:8:2]
````

````python
s2[::3]
````

````python
s2[6:1:-2] # 역순
````

````python
s2[::-1]
````

````python
s2[3:40]
````

#### Format string (형식문자열) 생성
- 문자열에 문장 형식/구성/Layout을  미리 만들어 놓고 값은 나중에 대입하는 방식으로 문자열을 만드는 것
    - 여러 문자열이 같은 Layer에 특정 값들만 바뀌는 경우 사용한다.
        - 이름 : XXX 나이 : XXX 성별 : XXX  
        - 기본 형식은 같은데 XXX에 들어갈 값들은 그때 그때 다를 경우 사용
1. format() 함수 이용
    - 문자열을 만들 때 값을 나중에 넣을 위치 { } 로 표시하고 format() 메소드에서 { }에 들어갈 값을 순서대로 넣는다.

> 값을 넣어줄 자리를 지정하는 것을 **placeholder** 라고 한다.

````python
name = "홍길동"
age = 30
address = "서울시 금천구"
tall = 180.3
weight = 87.2
# 위 사람의 정보를 Label을 붙여서 출력을 위해서 하나의 문자열로 만들기
info = "이름: "+name+"\n나이: "+str(age)+"\n주소: "+address + "\n키: "+ str(tall)
print(info)
````

````python
layout = "이름: {}, 나이: {}, 주소: {}, 키: {}, 몸무게: {}"
info2 = layout.format(name, age, address, tall, weight)
print(info2)
````

2. % value 사용
    - 타입을 지정하는 % value를 이용해 값을 넣어줄 자리를 지정한다.
    - format 문자열과 넣어줄 값은 % 로 구분한다.
    
|% value|설명|
|-|-|
|%s|string|
|%d|int-정수|
|%f|float-실수|
|%%|%|

실수는 소수점자릿수를 6자리로 맞추기 때문에 정밀도를 표현하는 표현식을 지정하는 것이 좋다. `ex) %.2f`

````python
info3 = "이름: %s, 나이: %d, 주소: %s, 키: %.2f, 몸무게: %.2f" % (name, age, address, tall, weight)
print(info3)
````

3. f-string (format string)
    - 파이썬 3.6에서 추가된 형식
    - 문자열 앞에 접두어 `f`를 사용한다.
    - 값을 넣을 자리에 {변수명} 을 이용해 변수가 가진 값을 문자열에 추가한다.

````python
info4 = f"이름: {name}, 나이: {age}, 주소: {address}, 키: {tall+10}, 몸무게: {weight}"
print(info4)
````

#### string 주요 메소드

|메소드|설명|
|-|-|
|split(구분문자열)|구분 문자열을 기준으로 나눈다.|
|strip(), lstrip(), rstrip()|앞뒤(strip) 앞(lstrip) 뒤(rstrip) 공백 제거|
|replace('바꿀 문자열', '새문자열')|바꿀 문자열을 새문자열로 변경|
|count('세려는 문자열')|string안에 세려는 문자열이 몇개 있는지 반환|
|index(문자열), find(문자열)|문자열이 몇번째 index에 있는지 반환|
|upper(), lower()|모든 글자를 대문자(upper), 소문자(lower)로 변환|
|capitalize()|문자열의 첫글자를 대문자로 변환|
|islower(), isupper()|문자열이 모두 소문자(islower), 대문자(isupper)이면 True 아니면 False를 반환|
|startswith("문자열"), endswith("문자열")|문자열로 시작하는지/끝나는지 여부 반환|

````python
fruits = "사과 복숭아 수박 귤 참외"
result = fruits.split() #기본: 공백기준으로 나눈다.
print(result)
print(result[0])
````

````python
fruits = "사과,복숭아,수박,귤,참외"
result = fruits.split(",")
print(result)
````

````python
name = "     홍길동    "
# name = name.strip()
# name = name.lstrip()
name = name.rstrip()
print(len(name))
print(name)
````

````python
id = input("ID:")
id = id.strip()
print(f"입력받은 {id}를 저장")
````

````python
s = "   ab    c   d       e    ".strip()
result = s.replace("    ", "")
print(result)
````

````python
url = "www.naver.com"
url.endswith(".com")
url.endswith(".co.kr")
````

````python
url.startswith("http")
url.startswith("www")
````

### 데이터 타입 변환 (형변환) 함수
- 값의 데이터타입을 확인하는 함수
    - type(값)
- 정수로 변환
    - int(value)
- 실수로 변환
    - float(value)
- 문자열로 변환
    - str(value)
- 논리형으로 변환
    - bool(value)

````python
type(3)
type(age)
type(1.77)
type("aaaaa")
````

````python
print(type(True))
````

````python
"30" + "20"
````

````python
int("30") + int("20") # -> 30
````

````python
num1 = input("정수1:") # input() 결과: str
num2 = input("정수2:")
result = int(num1) + int(num2)
print(result)
````

````python
int(3.65) # 실수 -> 정수(내림)
````

````python
int(True)  # True -> 1
int(False) # False -> 0
````

````python
int("30a")
````

````python
float("3.123") + 1
````

````python
float(3)
````

````python
float("abcd")
````

### 동적타입 언어
- 변수가 가질 수 있는 값의 타입을 고정하지 않는다. 그래서 같은 변수에 서로 다른 타입의 값을 저장할 수 있다.
- 자유도는 높지만 프로그램의 규모가 커지면 오류의 원인이 될 수 있다. 
- 파이썬은 동적 타입 언어이다.

> - **정적 타입 언어**
>     - 변수를 선언할 때 그 변수에 저장할 수 있는 값의 타입을 고정시킨다.

````python
age = 30  # int
print(age)

age = 30.1 # 실수
print(age)

age = "서른살" # str
print(age)
````

````python
age + 1
````

````python
int age = 10
````

````python
age = 20
````

````python
age : int = 10
````

````python
age = "서른살"
````

````python
# 타입힌트
# 변수명 : 타입 = 값
````

````python
name:str = "홍길동"
tall:float = 172.3
````

````python
weight:"단위kg" = 30
````

````python
# 하나의 문자열을 여러줄에 걸처서 작성할 때
a = (
    "aaaaaa"
    "bbbbbb"
    "cccccc"
)
print(a)
````

````python
# 한 명령문은 한줄에 작성
# 한 명령문을 여러줄에 걸처 작성할 경우 `\` 를 이용
print("안녕하미ㅏㄴ어리ㅏㅁㄴ어ㅣㄴ멍리ㅏ먼이ㅏ럼ㄴ이ㅏ럼ㄴ이\
ㅏ럼니아러ㅣㅏㅁㄴ어리ㅏㅁㄴ어리ㅏㅁㄴ어ㅣ람너이ㅏ럼ㄴ이ㅏ럼ㄴ이ㅏㅓㄹㅇㅁ남ㄴㅇ러ㅏ")
````

````python
1 +\
3
````

## TODO

````python
control + shift + -
````

````python
#1. 주민번호 "901211-1027213"의 앞 6자리만 조회해서 출력하시오.
jumin = "901211-1027213"
print(jumin[:6])
print(jumin.split('-')[0])
````

````python
#2. "안녕하세요" 를 10번 출력하시오.
print("안녕하세요\n" * 10)
````

````python

#3. 다음 문자열의 글자수를 출력하시오.
str_value = "akdlclkdkdlelql39du7마구0ㅌ" 

len(str_value)
````

````python
#4.
name="TV"
price=300000
maker = "LG"
# 위 변수의 값을 다음과 같은 형태로 출력하시오.
#"제품명 : TV, 가격 : 300000, 제조사 : LG"
info1 = "제품명: {}, 가격: {}원, 제조사: {}".format(name, price, maker)
info2 = f"제품명: {name}, 가격: {price}원, 제조사: {maker}"
info3 = "제품명: %s, 가격: %d원, 제조사: %s" % (name, price, maker)

print(info1)
print(info2)
print(info3)
````

````python
#5.
fruits = "사과 복숭아 귤 배"
# 위 fruits에 "수박"이 있는지 확인하는 코드를 작성하시오.

"수박이 있습니다." if "수박" in fruits else "수박은 없습니다."
````

````python
#6.
str_value="aldkjaldjfalfjlksajfladlkaalalkdjfa"
# str_value 문자열안에 a가 몇개 있는지 출력하시오.

str_value.count('a')
str_value.count('ald')
````

- 함수1(함수2(함수3))  함수안에서 함수를 호출  
    - 가장 안쪽의 함수를 실행하고 그 결과를 이용해서 바깥쪽 함수를 실행

````python
#7. 두개의 정수를 입력받아서 곱한 결과를 출력하는 코드를 작성하세요.
num1 = int(input("정수1:").strip())
num2 = int(input("정수2:"))
result = num1 * num2
print(result)
````

---

## 학습 정리



- 할당문은 객체와 변수 이름을 연결한다.

- Python은 동적 타입 언어지만 현재 객체의 타입에 맞는 연산 규칙을 따라야 한다.

- 사용자 입력은 문자열이므로 계산 전에 필요한 타입으로 변환해야 한다.

- 문자열은 변경 불가능한 시퀀스이며 인덱싱과 슬라이싱으로 일부를 조회할 수 있다.
