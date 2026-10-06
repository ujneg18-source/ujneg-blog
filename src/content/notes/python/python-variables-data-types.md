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

> SKN31 Python 과정 노트북 `02_변수와 데이터타입.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 Python 3.13에서 순서대로 다시 실행한 결과이고, `input()`이 있는 셀은 입력값을 정해서 실행했습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 프로그램이 하는 일과 표현식(Expression)
- 변수 만들기, 이름 규칙, 대입, 삭제
- `print()`와 `input()`
- 데이터 타입: None, 숫자, bool, 문자열
- 연산자: 산술, 대입, 비교, 논리, 조건
- 문자열 indexing·slicing, 포맷 문자열, 주요 메소드
- 형변환과 동적 타입, 타입 힌트

## 프로그램이 하는 일

> 프로그램은 **정보(데이터)를 처리**한다.

| 프로그램이 하는 일 | 코드로 표현하는 방법 |
|---|---|
| 정보(데이터) | **변수(Variable)와 값(Value)** |
| 처리한다 | **연산자(Operator)와 함수(Function)** |

**표현식(Expression)** 은 값으로 평가되는 구문이다. 두 가지가 있다.

- 평가(eval)해서 새 값을 만드는 경우: 연산(`10 + 10`), 변수 호출, 함수 호출
- **리터럴(Literal)**: 표현식 자체가 값인 경우. `10`, `20.56`, `"A"`

## 변수 (Variable)

- 프로그램이 실행 중에 쓸 **값을 저장하는 메모리 공간**이다.
- 하나의 변수는 하나의 값만 가진다. 여러 값을 저장하려면 객체나 자료구조로 모아서 저장한다.
- 변수는 **이름(식별자, Identifier)** 으로 관리한다. 메모리 공간마다 주소가 있지만 코드에서 주소를 직접 쓸 수 없으니, 이름으로 값을 넣고 꺼낸다.
- 이름은 저장할 값의 의미를 알 수 있게 짓는다.

### 선언과 초기화

```python
변수명 = 값
```

- 변수는 **만들면서 반드시 값을 대입**해야 한다.
- 넣을 값이 아직 없으면 `None`을 대입한다. (`address = None`)

### 식별자 규칙

- 사용할 수 있는 문자: **일반 문자**(영어뿐 아니라 한글, 한자 등 모든 일반 문자), **숫자**, 특수문자는 **`_`(underscore)만**
- 숫자는 **두 번째 글자부터** 쓸 수 있다.
- **예약어(keyword)** 는 쓸 수 없다.
- **대소문자를 구별**한다.

Python 키워드는 이렇다. 직접 확인할 수도 있다.

```python
import keyword

print(len(keyword.kwlist))
print(keyword.kwlist)
```

```text
35
['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']
```

> **보충** 필기에는 35개가 있었는데 Python 3.13 기준으로도 35개다. `match`, `case`, `type`처럼 특정 문맥에서만 키워드로 쓰이는 "soft keyword"는 여기에 없고 `keyword.softkwlist`에 따로 있다. 이것들은 변수 이름으로 쓸 수 있다.

### 이름 짓는 관례

| 표기법 | 규칙 | 예 | Python에서 쓰는 곳 |
|---|---|---|---|
| **Snake** | 모두 소문자, 단어 사이 `_` | `user_name`, `sale_price` | **변수, 함수** |
| Camel | 소문자로 시작, 이어지는 단어 첫 글자만 대문자 | `userName`, `bankAccount` | (Java, JavaScript 관례) |
| Pascal | 모든 단어 첫 글자 대문자 | `UserName`, `BankAccount` | 클래스 |

### 변수 만들고 쓰기

```python
# 변수를 생성하고 값을 대입(할당-assign)
name = "홍길동"
age = 30
address = None
```

```python
# 변수의 값을 사용 - 변수이름
name
```

```text
'홍길동'
```

```python
age + 5
```

```text
35
```

Jupyter는 셀의 **마지막 줄 값만** 보여 준다. 셀에 변수 세 개를 나열하면 `address`만 평가돼 표시되는데, `address`는 `None`이라 아무것도 안 나온다.

```python
name
age
address
```

여러 값을 보려면 `print()`를 쓴다.

#### print() 함수

- `( )` 안에 전달한 값(Argument)을 문자열로 바꿔 화면(터미널)에 출력한다. 끝에 엔터를 붙인다.
- 여러 값을 나열해서 전달할 수 있다. 구분자는 공백이 기본이고, 바꾸려면 `sep=구분자`를 준다.
- 끝에 엔터 대신 다른 문자열을 붙이려면 `end=붙일문자열`을 준다.

```python
print(name)
print(age)
print(address)
```

```text
홍길동
30
None
```

```python
print(name, age, address, 10000)
print(name, age, address, 10000, sep=",")  # 구분자로 공백 대신 sep의 값을 사용
```

```text
홍길동 30 None 10000
홍길동,30,None,10000
```

```python
print(name, end="-")  # 뒤에 엔터 대신에 end의 값을 사용
print(age)
```

```text
홍길동-30
```

```python
print(Name)  # 변수명 대소문자 구분
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · NameError: name &#x27;Name&#x27; is not defined</div></div>

```python
# 3age = 30  → 숫자로 시작하면 SyntaxError
my_name = 30  # 특수문자는 _ 만 가능 (위치는 상관없다)
print(my_name)
```

```text
30
```

### 대입(할당)

- `=` 왼쪽은 변수, 오른쪽은 대입할 값이다. 오른쪽에는 리터럴, 다른 변수, 연산식이 올 수 있다.
- **처음 대입하면 초기화, 그 뒤 대입하면 변경**이다. 문법은 같다.

```python
a = b = c = d = 50  # 여러 변수에 같은 값
print(a, b, c, d)

i, j, k = 1.5, 2.3, 3.4  # 여러 변수에 다른 값을 한 구문으로
print(i, j, k)
```

```text
50 50 50 50
1.5 2.3 3.4
```

**대입 연산자**는 변수의 값을 "그 변수와 다른 값을 연산한 결과"로 바꾼다.

| 연산자 | 예 | 같은 연산 |
|---|---|---|
| `+=` | `x += 1` | `x = x + 1` |
| `-=` | `x -= 1` | `x = x - 1` |
| `*=` | `x *= 1` | `x = x * 1` |
| `/=` | `x /= 1` | `x = x / 1` |
| `%=` | `x %= 1` | `x = x % 1` |
| `//=` | `x //= 1` | `x = x // 1` |
| `**=` | `x **= 1` | `x = x ** 1` |

> **보충** 필기에는 표만 있고 실행 셀이 비어 있어서 예를 붙였다.

```python
x = 10
x += 5
print(x)
x //= 4
print(x)
x **= 3
print(x)
```

```text
15
3
27
```

### 변수 삭제

`del 변수명`으로 메모리에서 변수를 지운다.

```python
print(name)
del name
```

```text
홍길동
```

```python
print(name)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · NameError: name &#x27;name&#x27; is not defined</div></div>

## 데이터 타입

값의 형태에 따라 종류를 나눈 것이다. 타입마다 **값을 표현하는 방법**과 **쓸 수 있는 연산자**를 익힌다.

### None

아무 값도 없음을 나타내는 값이다.

### 숫자형: int, float

| 타입 | 표현 | 예 |
|---|---|---|
| 정수 `int` | 10진수 | `10`, `-20`, `0` |
| | 16진수 (`0x`로 시작) | `0xAF32` |
| | 8진수 (`0o`로 시작) | `0o32` |
| 실수 `float` | 소수점 | `20.1`, `0.123411` |
| | 지수 표기 | `5e7` = 5.0×10⁷, `3e-7` = 3×10⁻⁷ |

```python
print(0xAF32, 0o32)
print(5e3, 3.2e3, 5e-2, 5e-10)
print(100_000_000 + 200)  # _는 자릿수 구분용. 값에는 영향 없음
```

```text
44850 26
5000.0 3200.0 0.05 5e-10
100000200
```

`5e3`은 `5000`이 아니라 `5000.0`이다. 지수 표기는 항상 **float**이 된다.

**산술 연산자**

| 연산자 | 설명 | 예 |
|---|---|---|
| `+` `-` `*` | 덧셈, 뺄셈, 곱셈 | `x + y` |
| `/` | 나눗셈 | `x / y` |
| `%` | 나머지 (Modulus) | `x % y` |
| `//` | 몫 (Floor division) | `x // y` |
| `**` | 거듭제곱 | `x ** y` |

```python
print(10 / 4, 10 / 2)   # / 는 나누어떨어져도 결과가 float
print(10 % 3, 10 // 3)  # 나머지, 몫
print(3 * 5, 3 ** 5)
```

```text
2.5 5.0
1 3
15 243
```

### 논리형: bool

- **참(`True`)과 거짓(`False`)** 을 표현한다. 제어문에서 많이 쓴다.
- bool 값이 와야 할 자리에 다른 타입이 오면 자동으로 bool로 바뀐다(**묵시적 형변환**).
  - **0글자 문자열, 숫자 0, `None`, 원소가 없는 자료구조**는 `False`, 나머지는 모두 `True`다.

```python
# bool(값): 값을 논리형으로 바꿔주는 함수
print(bool(30), bool(-20), bool(0), bool(None))
print(bool("aaaa"), bool(""), bool(" "))
```

```text
True True False False
True False True
```

`" "`(공백 한 칸)은 0글자가 아니니 `True`다.

#### input() 함수

- 사용자에게 값을 입력받는다. 엔터를 칠 때까지 기다렸다가 입력한 값을 반환한다.
- 무엇을 입력받을지 안내 문구(label)를 전달할 수 있다.
- **반환값은 항상 문자열(`str`)** 이다.

```python
name = input("이름:")
name
```

```text
이름:홍길동
```

```text
'홍길동'
```

**비교 연산자**: 결과가 bool이고, 기준은 왼쪽 피연산자다.

| 연산자 | 설명 |
|---|---|
| `==` / `!=` | 같은가? / 같지 않은가? |
| `>` / `<` | x가 큰가? / x가 작은가? |
| `>=` / `<=` | x가 크거나 같은가? / 작거나 같은가? |

```python
print(10 == 20, 30 == 30, "ABC" == "ABC")
print(10 != 20, 10 != 10)
print(30 > 20, 30 > 30, 30 >= 30)
print(30 < 40, 30 < 30, 30 <= 30)
```

```text
False True True
True False
True False True
True False True
```

입력받은 나이로 성인인지 확인하는 셀이다. 비교 연산자를 `if`문과 같이 썼다.

```python
age_str = input("나이:")  # 사용자로부터 입력받은 값을 문자열로 반환.
age = int(age_str)        # 입력받은 값을 정수로 변환

if age > 20:
    print("성인입니다.")
else:
    print("미성년자 입니다.")
```

```text
나이:17
미성년자 입니다.
```

**논리 연산자**: 피연산자와 결과가 모두 bool이다.

| 연산자 | 설명 | 예 |
|---|---|---|
| `and`, `&` | 모두 True면 True | `x > 5 and x < 10` |
| `or`, `\|` | 하나라도 True면 True | `x > 5 or x < -4` |
| `^` | XOR. 피연산자가 다르면 True | `(x > 5) ^ (x < 4)` |
| `not` | True ↔ False 뒤집기 | `not (x < 5)` |

```python
print(True and True and True, False and True)
print(False or False, True or True)
print(True ^ False, True ^ True)
```

```text
True False
False True
True False
```

`&`, `|`, `^`를 쓸 때는 **비교식을 괄호로 묶어야** 한다.

> **보충 · 괄호를 빼면 무슨 일이 생기나**
> `&`는 비교 연산자보다 먼저 계산되는 비트 연산자다. 괄호를 빼면 엉뚱한 식이 된다.

```python
x = 3
print((x > 5) & (x < 10))  # 의도: 3은 5보다 크지 않으니 False
print(x > 5 & x < 10)      # 실제: x > (5 & x) < 10 → 3 > 1 < 10 → True
```

```text
False
True
```

`5 & 3`이 먼저 계산돼 `1`이 되고, `3 > 1 < 10`은 참이 된다. 오류 없이 틀린 답이 나오니 더 위험하다. bool끼리는 `and`/`or`를 쓰는 게 안전하다.

**조건 연산자 (삼항 연산자)**

```python
True일 때 값 if 조건식 else False일 때 값
```

```python
age = 10
result = "성년" if age > 20 else "미성년"
print(result)
```

```text
미성년
```

```python
num = 0
result = "양수" if num > 0 else "음수" if num < 0 else "0입니다"
print(result)
```

```text
0입니다
```

조건이 셋 이상이면 이어 붙일 수 있지만 읽기 어려워진다. 그럴 땐 `if/elif/else` 문을 쓴다.

변수 이름에 한글도 쓸 수 있다.

```python
나이 = 30
이름 = "홍길동"
print(나이)
```

```text
30
```

## 문자열 (str)

- 0글자 이상의 글자들이다. Python 3는 유니코드를 지원해서 모든 나라 글자를 쓸 수 있다.
- **작은따옴표나 큰따옴표**로 감싼다.
- 여러 줄 문자열은 **따옴표 3개**(`"""` 또는 `'''`)로 감싼다.

```python
s = "첫번째줄\n두번째줄\n세번째줄"
print(s)
```

```text
첫번째줄
두번째줄
세번째줄
```

```python
s2 = """첫번째줄
두번째줄
세번째줄
네번째줄"""
print(s2)
```

```text
첫번째줄
두번째줄
세번째줄
네번째줄
```

```python
s2  # print 없이 값을 보면 줄바꿈이 \n 으로 보인다
```

```text
'첫번째줄\n두번째줄\n세번째줄\n네번째줄'
```

### Escape 문자

키보드에는 있지만 글자로 표현할 수 없는 문자를 `\문자`로 표현한다. 원래 의미에서 벗어나(escape) 다른 의미로 쓰인다는 뜻이다. 모든 프로그래밍 언어의 표준이다.

| Escape 문자 | 의미 |
|---|---|
| `\n` | 엔터 |
| `\t` | Tab |
| `\b` | Backspace |
| `\\` | `\` |
| `\"` / `\'` | `"` / `'` |

```python
print("I'm a boy.\"aaaa\"")
```

```text
I'm a boy."aaaa"
```

**raw string**: 문자열 앞에 `r`을 붙이면 `\`를 escape로 해석하지 않고 그대로 쓴다. Windows 경로에 편하다.

```python
file_path = "c:\\backup\\docs\\note\\a.txt"
print(file_path)

file_path = r"c:\backup\docs\note\a.txt"
print(file_path)
```

```text
c:\backup\docs\note\a.txt
c:\backup\docs\note\a.txt
```

> **보충** `r`을 빼고 `"c:\backup\new"`처럼 쓰면 `\b`(Backspace)와 `\n`(엔터)이 escape로 해석돼 경로가 깨진다.

```python
print("c:\backup\new")
```

```text
c:ackup
ew
```

### 문자열 연산자

| 연산 | 결과 |
|---|---|
| 문자열 `+` 문자열 | 두 문자열을 합친다. **문자열끼리만** 된다 |
| 문자열 `*` 정수 | 정수번 반복해서 합친다 |
| A `in` B / A `not in` B | A가 B에 있는가 / 없는가 |
| `len(문자열)` | 글자 수 |

```python
name = "홍길동"
age = 30
print("이름:" + name)
# print("나이:" + age)  # str + int (x) → TypeError
print("나이:" + str(age))
```

```text
이름:홍길동
나이:30
```

```python
print("안녕" * 3)  # "안녕" + "안녕" + "안녕"
print("결과 1")
print("-" * 30)
print("결과 2")
```

```text
안녕안녕안녕
결과 1
------------------------------
결과 2
```

```python
address = "서울시 금천구 독산동 대륭 17차"
print("금천구" in address, "종로구" in address)
print("금천구" not in address, "종로구" not in address)
print(len("abc"), len(address), len(""))
```

```text
True False
False True
3 18 0
```

### Indexing과 Slicing

- `집합[식별자]` 형태의 **Indexer 연산자**로 여러 값 중 일부를 조회한다. 문자열, 자료구조 등에 쓴다.
  - **indexing**: 값 하나 조회
  - **slicing**: 범위로 여러 값 조회
- 문자열의 각 글자는 **양수 index**(앞에서부터 0, 1, 2…)와 **음수 index**(뒤에서부터 -1, -2…)를 둘 다 가진다.

![index](/images/python/ch02_01.png)

```python
s = "안녕하세요. 반갑습니다."
print(len(s))
print(s[0], s[-13])   # 같은 글자: 앞에서 0번째 = 뒤에서 13번째
print(s[-1], s[12])
print(s[0], s[3], s[4])  # 한 번에 여러 개 조회는 안 되니 각각 조회
```

```text
13
안 안
. .
안 세 요
```

문자열은 내부 값을 바꿀 수 없다. 이런 타입을 **불변(Immutable)** 이라고 한다.

```python
s[0] = "가"
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: &#x27;str&#x27; object does not support item assignment</div></div>

**Slicing**: `문자열[시작 : 종료 : 간격]`

- 시작 index부터 **종료 index - 1**까지 조회한다. 간격을 생략하면 1이다.
- 시작을 생략하면 처음부터, 종료를 생략하면 끝까지다.
- 간격을 음수로 하면 거꾸로 간다. `[::-1]`은 뒤집기다.

```python
s2 = "0123456789"
print(s2[1:6])    # 1 ~ 5
print(s2[1:-1])   # 1 ~ 뒤에서 2번째
print(s2[:5])     # 시작 생략: 0부터
print(s2[5:])     # 끝 생략: 마지막까지
print(s2[3:8:2])  # 3, 5, 7
print(s2[::3])    # 0, 3, 6, 9
print(s2[6:1:-2]) # 역순: 6, 4, 2
print(s2[::-1])   # 뒤집기
print(s2[3:40])   # 범위를 넘어도 에러 없이 끝까지
```

```text
12345
12345678
01234
56789
357
0369
642
9876543210
3456789
```

indexing은 범위를 넘으면 `IndexError`가 나지만, slicing은 있는 데까지만 잘라 준다.

### 포맷 문자열

문장 형식을 미리 만들어 두고 값만 나중에 넣는 방식이다. "이름: XXX, 나이: XXX"처럼 형식은 같고 값만 바뀔 때 쓴다. 값을 넣을 자리를 **placeholder**라고 한다.

`+`로 이어 붙이면 이렇게 된다. 숫자마다 `str()`을 붙여야 해서 번거롭다.

```python
name = "홍길동"
age = 30
address = "서울시 금천구"
tall = 180.3
weight = 87.2

info = "이름: " + name + "\n나이: " + str(age) + "\n주소: " + address + "\n키: " + str(tall)
print(info)
```

```text
이름: 홍길동
나이: 30
주소: 서울시 금천구
키: 180.3
```

세 가지 방법을 비교하면 이렇다.

```python
# 1. format() 메소드: { } 자리에 순서대로 넣는다
layout = "이름: {}, 나이: {}, 주소: {}, 키: {}, 몸무게: {}"
print(layout.format(name, age, address, tall, weight))

# 2. % 포맷: 자리마다 타입을 지정한다
print("이름: %s, 나이: %d, 주소: %s, 키: %.2f, 몸무게: %.2f" % (name, age, address, tall, weight))

# 3. f-string (Python 3.6~): {변수명}, 안에서 연산도 된다
print(f"이름: {name}, 나이: {age}, 주소: {address}, 키: {tall + 10}, 몸무게: {weight}")
```

```text
이름: 홍길동, 나이: 30, 주소: 서울시 금천구, 키: 180.3, 몸무게: 87.2
이름: 홍길동, 나이: 30, 주소: 서울시 금천구, 키: 180.30, 몸무게: 87.20
이름: 홍길동, 나이: 30, 주소: 서울시 금천구, 키: 190.3, 몸무게: 87.2
```

| `%` 값 | 의미 |
|---|---|
| `%s` | 문자열 |
| `%d` | 정수 |
| `%f` | 실수. 기본 소수점 6자리라 `%.2f`처럼 자릿수를 지정하는 게 좋다 |
| `%%` | `%` 글자 자체 |

```python
print("%f" % tall)
print("%.2f" % tall)
```

```text
180.300000
180.30
```

> **보충** 지금은 f-string이 가장 많이 쓰인다. f-string에서도 `{tall:.2f}`처럼 `:` 뒤에 형식을 지정할 수 있다.

```python
print(f"키: {tall:.2f}, 가격: {300000:,}원")
```

```text
키: 180.30, 가격: 300,000원
```

### 문자열 주요 메소드

| 메소드 | 설명 |
|---|---|
| `split(구분문자열)` | 구분 문자열 기준으로 나눠 리스트로 반환. 생략하면 공백 기준 |
| `strip()`, `lstrip()`, `rstrip()` | 앞뒤 / 앞 / 뒤 공백 제거 |
| `replace(바꿀문자열, 새문자열)` | 바꾸기 |
| `count(문자열)` | 몇 개 있는지 |
| `index(문자열)`, `find(문자열)` | 몇 번째 index에 있는지 |
| `upper()`, `lower()` | 모두 대문자 / 소문자로 |
| `capitalize()` | 첫 글자만 대문자로 |
| `isupper()`, `islower()` | 모두 대문자인지 / 소문자인지 |
| `startswith(문자열)`, `endswith(문자열)` | 그 문자열로 시작하는지 / 끝나는지 |

```python
fruits = "사과 복숭아 수박 귤 참외"
result = fruits.split()  # 기본: 공백 기준으로 나눈다
print(result)
print(result[0])

print("사과,복숭아,수박,귤,참외".split(","))
```

```text
['사과', '복숭아', '수박', '귤', '참외']
사과
['사과', '복숭아', '수박', '귤', '참외']
```

```python
name = "     홍길동    "
name = name.rstrip()  # 뒤 공백만 제거
print(len(name))
print(name)
```

```text
8
     홍길동
```

앞 공백 5칸 + `홍길동` 3글자라서 8이다.

사용자 입력은 앞뒤에 공백이 섞이기 쉬워서 `strip()`을 습관처럼 붙인다.

```python
id = input("ID:")
id = id.strip()
print(f"입력받은 {id}를 저장")
```

```text
ID:  ddfddd 
입력받은 ddfddd를 저장
```

```python
s = "   ab    c   d       e    ".strip()
result = s.replace("    ", "")
print(repr(s))
print(result)
```

```text
'ab    c   d       e'
abc   d   e
```

`replace("    ", "")`는 **공백 4칸 덩어리**만 지운다. `ab    c`의 4칸은 사라졌지만, `d       e` 사이 7칸은 4칸만 지워지고 3칸이 남았다.

> **보충** 공백을 모두 없애려면 `replace(" ", "")`, 여러 칸 공백을 한 칸으로 줄이려면 `" ".join(s.split())`을 쓴다.

```python
print(s.replace(" ", ""))
print(" ".join(s.split()))
```

```text
abcde
ab c d e
```

```python
url = "www.naver.com"
print(url.endswith(".com"), url.endswith(".co.kr"))
print(url.startswith("http"), url.startswith("www"))
```

```text
True False
False True
```

## 형변환

| 함수 | 역할 |
|---|---|
| `type(값)` | 값의 타입 확인 |
| `int(값)` | 정수로 |
| `float(값)` | 실수로 |
| `str(값)` | 문자열로 |
| `bool(값)` | 논리형으로 |

```python
print(type(3), type(1.77), type("aaaaa"), type(True))
```

```text
<class 'int'> <class 'float'> <class 'str'> <class 'bool'>
```

```python
print("30" + "20")            # 문자열끼리 + 는 이어 붙이기
print(int("30") + int("20"))  # 숫자로 바꿔야 덧셈
```

```text
3020
50
```

`input()`은 문자열을 반환하므로 계산하려면 바꿔야 한다.

```python
num1 = input("정수1:")  # input() 결과: str
num2 = input("정수2:")
result = int(num1) + int(num2)
print(result)
```

```text
정수1:10
정수2:20
30
```

```python
print(int(3.65))                # 실수 → 정수
print(int(True), int(False))    # True → 1, False → 0
print(float("3.123") + 1, float(3))
```

```text
3
1 0
4.123 3.0
```

> **보충 · `int()`는 내림이 아니라 버림이다**
> 필기에 `int(3.65)`를 "내림"이라고 적었는데, 정확히는 **소수점 이하를 버리는 것(0 쪽으로 자르기)** 이다. 양수에서는 내림과 같지만 음수에서 달라진다.

```python
import math

print(int(-3.65), math.floor(-3.65))
```

```text
-3 -4
```

숫자로 바꿀 수 없는 문자열은 에러가 난다.

```python
int("30a")
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: invalid literal for int() with base 10: &#x27;30a&#x27;</div></div>

```python
float("abcd")
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: could not convert string to float: &#x27;abcd&#x27;</div></div>

## 동적 타입 언어

- 변수가 가질 수 있는 값의 타입을 **고정하지 않는다**. 같은 변수에 다른 타입의 값을 저장할 수 있다.
- 자유롭지만 프로그램이 커지면 오류의 원인이 된다.
- 반대로 **정적 타입 언어**(Java, C 등)는 변수를 선언할 때 타입을 고정한다.

```python
age = 30       # int
print(age)
age = 30.1     # float
print(age)
age = "서른살"  # str
print(age)
```

```text
30
30.1
서른살
```

```python
age + 1  # age가 지금 str이라서 에러
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: can only concatenate str (not &quot;int&quot;) to str</div></div>

정적 타입 언어처럼 `int age = 10`이라고 쓰면 Python에선 문법 오류다.

```python
int age = 10
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · SyntaxError: invalid syntax</div></div>

### 타입 힌트

`변수명: 타입 = 값` 형태로 **어떤 타입을 넣을 의도인지** 적을 수 있다.

```python
age: int = 10
name: str = "홍길동"
tall: float = 172.3
weight: "단위kg" = 30  # 타입 자리에 아무 표현식이나 올 수 있다

age = "서른살"  # 힌트와 다른 타입을 넣어도 실행은 된다
print(age)
```

```text
서른살
```

> **보충** 타입 힌트는 **실행에 아무 영향이 없다**. 힌트와 다른 타입을 대입해도 에러가 나지 않는다. 대신 VS Code나 mypy 같은 도구가 이 힌트를 보고 실수를 미리 경고해 준다. 읽는 사람에게 의도를 알려 주는 문서 역할이다.

## 긴 코드를 여러 줄에 쓰기

```python
# 하나의 문자열을 여러 줄에 걸쳐 작성: 괄호 안에서 문자열을 나열하면 이어 붙는다
a = (
    "aaaaaa"
    "bbbbbb"
    "cccccc"
)
print(a)
```

```text
aaaaaabbbbbbcccccc
```

```python
# 한 명령문을 여러 줄에 걸쳐 작성할 경우 \ 를 이용
print("이 문장은 너무 길어서 \
두 줄로 나눠 썼다")
total = 1 + \
    3
print(total)
```

```text
이 문장은 너무 길어서 두 줄로 나눠 썼다
4
```

> **보충** 노트북에서는 이 셀의 출력이 코드와 다른 이전 실행 결과로 남아 있어서, 짧은 문장으로 바꿔 다시 실행했다. 문자열 안의 `\` 줄바꿈은 다음 줄 앞 공백까지 문자열에 들어가니 괄호 방식이 더 안전하다.

노트북 TODO 칸에 적어 둔 `Ctrl + Shift + -`는 코드가 아니라 **셀을 커서 위치에서 둘로 나누는** Jupyter 단축키다.

## 연습 문제

```python
# 1. 주민번호 "901211-1027213"의 앞 6자리만 조회해서 출력하시오.
jumin = "901211-1027213"
print(jumin[:6])
print(jumin.split("-")[0])
```

```text
901211
901211
```

```python
# 2. "안녕하세요"를 10번 출력하시오.
print("안녕하세요\n" * 10, end="")
```

```text
안녕하세요
안녕하세요
안녕하세요
안녕하세요
안녕하세요
안녕하세요
안녕하세요
안녕하세요
안녕하세요
안녕하세요
```

```python
# 3. 다음 문자열의 글자수를 출력하시오.
str_value = "akdlclkdkdlelql39du7마구0ㅌ"
len(str_value)
```

```text
24
```

```python
# 4. 위 변수의 값을 "제품명 : TV, 가격 : 300000, 제조사 : LG" 형태로 출력하시오.
name = "TV"
price = 300000
maker = "LG"

print("제품명: {}, 가격: {}원, 제조사: {}".format(name, price, maker))
print(f"제품명: {name}, 가격: {price}원, 제조사: {maker}")
print("제품명: %s, 가격: %d원, 제조사: %s" % (name, price, maker))
```

```text
제품명: TV, 가격: 300000원, 제조사: LG
제품명: TV, 가격: 300000원, 제조사: LG
제품명: TV, 가격: 300000원, 제조사: LG
```

```python
# 5. fruits에 "수박"이 있는지 확인하는 코드를 작성하시오.
fruits = "사과 복숭아 귤 배"
"수박이 있습니다." if "수박" in fruits else "수박은 없습니다."
```

```text
'수박은 없습니다.'
```

```python
# 6. str_value 문자열 안에 a가 몇 개 있는지 출력하시오.
str_value = "aldkjaldjfalfjlksajfladlkaalalkdjfa"
print(str_value.count("a"))
print(str_value.count("ald"))  # 여러 글자도 셀 수 있다
```

```text
9
2
```

`함수1(함수2(...))`처럼 함수 안에서 함수를 호출하면 **가장 안쪽부터** 실행하고, 그 결과로 바깥 함수를 실행한다. 7번이 그 예다.

```python
# 7. 두 개의 정수를 입력받아서 곱한 결과를 출력하는 코드를 작성하세요.
num1 = int(input("정수1:").strip())  # input → strip → int 순서로 실행
num2 = int(input("정수2:"))
print(num1 * num2)
```

```text
정수1:10
정수2:20
200
```

## 정리

- 데이터는 **변수와 값**으로, 처리는 **연산자와 함수**로 표현한다.
- 변수는 만들 때 값을 대입하고, 이름은 snake_case로 짓는다.
- 0, `""`, `None`, 빈 자료구조는 `False`로, 나머지는 `True`로 취급된다.
- 문자열은 불변이고, indexing은 범위를 넘으면 에러지만 slicing은 아니다.
- `input()`은 항상 문자열을 돌려주니 계산 전에 형변환한다. `int()`는 버림이다.
- `&`, `|`는 비교식을 괄호로 묶어야 한다. 빼면 에러 없이 틀린 답이 나온다.
- Python은 동적 타입이고, 타입 힌트는 실행에 영향을 주지 않는다.
