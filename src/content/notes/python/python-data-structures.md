---
title: "자료구조: List·Tuple·Dictionary·Set 정리"
description: "Python의 대표 자료구조를 생성하고 조회·변경·변환하는 방법을 비교하며 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Python 기초'
seriesOrder: 3
originalNotebook: "03_자료구조.ipynb"
tags: ["Python","List","Tuple","Dictionary","Set"]
date: 2026-04-13
---

> 이 글은 SKN31 학습 과정에서 작성한 Jupyter Notebook을 바탕으로 정리했습니다.
> 당시 작성한 Markdown 필기와 코드 주석은 보존하고, 글의 흐름을 위해 도입·보충 설명·학습 정리를 덧붙였습니다.
> 원본 노트북: `03_자료구조.ipynb`

## 이 글에서 확인할 내용



- List, Tuple, Dictionary, Set의 저장 방식과 사용 목적을 비교한다.

- 인덱싱과 슬라이싱이 가능한 자료구조를 구분한다.

- 각 자료구조의 추가·변경·삭제 메서드를 실습한다.

- Unpacking과 자료구조 변환을 통해 데이터를 다른 형태로 다룬다.



## 필기를 다시 읽으며 잡은 핵심



자료구조는 문법보다 “어떤 데이터를 어떤 방식으로 조회할 것인가”를 기준으로 선택해야 했다. 순서와 중복이 중요하면 List, 변경되지 않는 묶음이면 Tuple, 키를 이용해 의미 있는 값을 찾으면 Dictionary, 중복 제거와 집합 연산이 필요하면 Set이 자연스럽다.

코드 주석에는 존재하지 않는 인덱스 조회, `index()`에서 값을 찾지 못한 경우, Set이 subscriptable하지 않다는 오류를 따로 표시해두었다. 정상 동작만 확인하기보다 실패하는 조건까지 실행해본 기록이라 자료구조별 제약을 이해하는 데 도움이 됐다.

후반 연습에서는 시험 점수 슬라이싱, 중복 제거, Dictionary로 개인 정보 구성, 중첩 값 조회와 수정까지 진행했다. 단순 메서드 암기보다 실제 데이터를 어떤 구조로 표현할지 판단하는 연습에 가깝다.

---

## 자료구조란

-   **여러 개의 값들을 모아서 관리**하는 데이터 타입.
    -   한 개의 변수는 한 개의 값 밖에는 가지지 못한다. 그러나 하나의 변수로 여러 개의 값 관리해야 할 경우가 있다.
    -   하나의 값이 여러개의 값들로 구성된 경우
        -   한명의 고객 정보의 경우 이름, 나이, 주소, 전화번호 등 여러개의 값이 모여서 하나의 값이 된다.
        -   한 반의 학생들의 이름들은 여러개의 이름들로 구성된다.
-   파이썬은 데이터를 모으는 방식에 따라 다음과 같이 4개의 타입을 제공한다.
    -   **List:** 순서가 있으며 중복된 값들을 모으는 것을 허용하고 구성하는 값들(원소)을 변경할 수 있다.
    -   **Tuple:** 순서가 있으며 중복된 값들을 모으는 것을 허용하는데 구성하는 값들을 변경할 수 없다.
    -   **Dictionary:** key-value 형태로 값들을 저장해 관리한다.
    -   **Set:** 중복을 허용하지 않고 값들의 순서가 없다.
-   **원소, 성분, 요소, element**
    -   자료구조의 값들을 구성하는 개별 값들을 말한다.
    -   len(자료구조) 함수
        -   자료구조 내의 원소의 개수를 반환한다.

## List (리스트)

-   값들을 순서대로 모아서 관리하는 자료구조. 원소(element)들을 순번을 이용해 식별한다.
    -   각각의 원소가 어떤 값인지를 index(순번)을 가지고 식별하기 때문에 **순서가 있고 그 순서가 매우 중요하다.** 즉 같은 값에 대해 순서가 바뀌면 안된다.
-   각각의 원소들은 index를 이용해 식별한다.
    -   index는 문자열과 마찮가지로 양수 index와 음수 index 두개가 각 값에 생긴다.
    -   양수 index는 앞에서부터 음수 index는 뒤에서 부터 값을 식별할 때 사용하는 것이 편리하다.
    -   **index를 가지고 각 원소값의 의미를 식별할 수 있으면 List나 Tuple을 사용한다.**
-   중복된 값들을 저장할 수 있다.
-   각 원소들의 데이터 타입은 달라도 상관없다.
    -   보통은 같은 타입의 데이터를 모은다.
-   리스트를 구성하는 **원소들을 변경할 수 있다.** (추가, 삭제, 변경이 가능)
    -   원소 변경 여부가 List와 Tuple의 차이이다.

### List 생성 구문

```python
[값, 값, 값, ..]
```

````python
l = [10, 20, 30, 40, 50]
````

````python
l2 = [10, 5.6, "안녕하세요", True, [1, 2, 3], 3]
l2
````

````python
l2[4][1]
````

````python
len(l)
len(l2)
````

### Indexing과 Slicing을 이용한 원소(element) 조회 및 변경

#### Indexing

-   하나의 원소를 조회하거나 변경할 때 사용
-   리스트\[index\]
    -   index의 원소를 조회
-   리스트\[index\] = 값
    -   index의 원소를 변경

#### Slicing

-   범위로 조회하거나 그 범위의 값들을 변경한다.
-   기본구문: **리스트\[ 시작 index : 종료 index : 간격\]**
    -   시작 index ~ (종료 index – 1)
    -   간격을 지정하면 간격만큼 index를 증/감한다. (생략 시 1이 기본 간격)
-   **0번 index 부터 조회 할 경우 시작 index는 생략가능**
    -   리스트 \[ : 5\] => 0 ~ 4 까지 조회
-   **마지막 index까지 (끝까지) 조회 할 경우 종료 index는 생략 가능**
    -   리스트\[2 : \] => 2번 index 에서 끝까지
-   **명시적으로 간격을 줄 경우**
    -   리스트\[ : : 3 \] => 0, 3, 6, 9.. index의 값 조회
    -   리스트\[1 : 9 : 2\] => 1, 3, 5, 7 index의 값 조회
-   **시작 index > 종료 index, 간격을 음수로 하면 역으로 반환한다.(Reverse)**
    -   리스트\[5: 1: -1\] => 5, 4, 3, 2 index의 값 조회
    -   리스트\[: : -1\] => 마지막 index ~ 0번 index 까지 의미. Reverse 한다.

##### slicing을 이용한 값 변경

-   slicing 을 이용할 경우 slicing된 원소 개수와 동일한 개수의 값들을 대입한다.
    -   `리스트[1:5] = 10,20,30,40` : index 1, 2, 3, 4의 값을 각각 10, 20, 30, 40 으로 변경

````python
l = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
len(l)
````

````python
# indexing
print(l[0], l[-10])
````

````python
# 없는 index 조회 -> Error 발생
l[20]
````

````python
print(l)
l[2] = 1010 # 변경
print(l)
````

````python
# slicing
l[3:8] # 간격: 1
````

````python
l[:8] # 시작: 0
````

````python
l[8:] # 끝: 끝까지
````

````python
l[3:20]
````

````python
print(l)
l[3:6] = 300, 400, 500
print(l)
````

### List 연산자

-   **리스트 + 리스트**
    -   두 리스트의 원소들을 합친 리스트를 반환한다.
-   **리스트 \* 정수**
    -   같은 리스트의 원소들을 정수번 합친 리스트를 반환한다.
-   **in, not in 연산자**
    -   값 in 리스트
        -   리스트의 원소로 값이 **있으면** True, 없으면 False 반환
    -   값 not in 리스트
        -   리스트의 원소로 값이 **없으면** True, 있으면 False 반환
-   **len(리스트)**
    -   리스트 내의 원소수를 반환.

````python
a = [1, 2, 3]
b = [10, 20, 30, 40]
c = a + b
print(a)
print(b)
print(c)
````

````python
a.extend(b)
print(a)
b
````

````python
d = a * 3
print(a)
print(d)
````

````python
2 in a
10 in a
````

````python
2 not in a
10 not in a
````

### 중첩 리스트 (Nested List)

-   List가 원소로 List를 가지는 것을 말한다.
    -   List를 포함한 모든 자료구조 타입들도 다 값이므로 다른 자료구조의 원소로 들어갈 수 있다.

````python
nl = [[1, 2, 3], [4, 5, 6]]
````

````python
len(nl)
````

````python
type(nl[0])
````

````python
nl[0][0]
````

````python
nl[1][2] =  1000
print(nl)
````

````python
nl[1][0:2]
````

````python
nl2 = [
    [1, 2, 3, 4,],
    [10, 20 , 30, 40],
    [2, 3, 4],
]
````

````python
nl2
````

### List 주요 메소드

| 메소드                       | 설명                                                                                 |
| :--------------------------- | ------------------------------------------------------------------------------------ |
| append(value)                | value를 추가한다.                                                                    |
| extend(List)                 | List의 원소들을 추가한다.                                                            |
| sort(\[reverse=False\])      | 원소들을 오름차순 정렬한다. reverse=True로 하면 내림차순정렬 한다.                   |
| insert(index, 삽입할값)      | 지정한 index에 '삽입할값'을 삽입한다.                                                |
| remove(삭제할값)             | '삭제할값' 값과 같은 원소를 삭제한다.                                                |
| index(찾을값\[, 시작index\]) | '찾을값'의 index를 반환한다.                                                         |
| pop(\[index\])               | index의 값을 반환하면서 삭제한다. index 생략하면 가장 마지막 값을 반환하며 삭제한다. |
| count(값)                    | '값'이 리스트의 원소로 몇개 있는지 반환한다.                                         |
| clear()                      | 리스트 안의 모든 원소들을 삭제한다.                                                  |

````python
l = [1, 2, 3]
l.append(10)   # 10을 l에 추가
l
````

````python
l.append(20)
l
````

````python
l.extend([100, 200, 300, 400, 500]) # 한번에 여러개의 값을 추가
l
````

````python
l.insert(2, -1000)
````

````python
l
````

````python
# 정렬 - 오름차순(기본), 내림차순
l.sort()
l
````

````python
l.sort(reverse=True)
l
````

````python
# 삭제
## 값으로 삭제
l.remove(300)
l
````

````python
l.extend([2, 2, 2, 2])
l
````

````python
l.remove(2) # 여러개 있을 때는 가장 앞에 있는 것 하나만 삭제
l
````

````python
# index 로 삭제 (삭제한 값을 반환)
l.pop() # 마지막 index값  삭제(기본)
l
````

````python
l.pop(3)
l
````

````python
a = l.pop(2)
print(a)
print(l)
````

````python
l.index(20) # 값의 index를 반환
l.index(2)
l.index(2, 8)  #2를 찾는데 8 index에서부터 찾아라.
````

````python
l.count(2)  # 2가 몇개 있는지 확인
````

````python
l.clear()
l
````

## Tuple (튜플)

-   List와 같이 순서대로 원소들을 관리한다. 단 저장된 원소를 변경할 수 없다.
-   Tuple 은 각 위치(Index) 마다 정해진 의미가 있고 그 값이 한번 설정되면 바뀌지 않는 경우에 사용한다.
    -   Tuple은 값의 변경되지 않으므로 안전하다.

### Tuple 생성

-   `(value, value, value, ...)`
-   소괄호를 생략할 수 있다.
-   원소가 하나인 Tuple 표현식
    -   `(value,)` 또는 `value,`
        -   값 뒤에 `,` 를 붙여준다. `,`를 붙이지 않으면 ( )가 연산자 우선순위 괄호가 된다.

````python
t = (1, 2, 3, 4, 5)
print(t)
type(t)
````

````python
t2 = 1, 2, 3, 4, 5, 6
print(t2)
type(t2)
````

````python
t3 = 1, 2.3, True, "aaaaa", [1, 2, 3], (1, 2, 3)
print(t3)
````

````python
t4 = (10,)
type(t4)
````

````python
t5 = 10,
type(t5)
````

### Indexing과 Slicing을 이용한 원소(element) 조회

-   리스트와 동일하다.
-   단 튜플은 조회만 가능하고 원소를 변경할 수 없다.

````python
t[0], t[-2]
````

````python
t[0] = 100 # 값 변경 못함.
````

````python
t = (0, 1, 2, 3, 4, 5, 6, 7, 8, 9)
t[2 : -2 : 2]
t[:-3]
t[3:]
t[3::2]
t[8:2:-2]
t[::-1]
````

### Tuple 연산자

-   **tuple + tuple**
    -   두 tuple의 원소들을 합친 tuple을 반환한다.
-   **tuple \* 정수**
    -   같은 tuple의 원소들을 정수번 합친 tuple를 반환한다.
-   **in, not in 연산자**
    -   값 in tuple
        -   tuple의 원소로 값이 **있으면** True, 없으면 False 반환
    -   값 not in tuple
        -   tuple의 원소로 값이 **없으면** True, 있으면 False 반환
-   **len(tuple)**
    -   tuple의 원소 개수 반환

````python
t + t3 #둘을 합친 새로운 튜플을 반환
````

````python
t2 * 3
````

````python
len(t3)
````

````python
3 in t
100 in t
````

````python
3 not in t
100 not in t
````

### Tuple의 주요 메소드

| 메소드                        | 설명                                |
| :---------------------------- | ----------------------------------- |
| index(찾을값 \[, 시작index\]) | '찾을값'이 몇번 index인지 반환한다. |
| count(값)                     | 원소로 '값'이 몇개 있는지 반환한다. |

````python
t.index(5)
t.index(5, 7) # index 7부터 시작해서 5의 index를 찾는다.
# index() 찾는 값이 없으면 에러 발생.
````

````python
try:
    i = t.index(5, 7)
    print(f"찾는 값은 {i}에 있어요.")
except:
    print("찾는 값이 없습니다.")
````

## Dictionary

-   값을 키(key)-값(value) 쌍으로 묶어서 저장하는 자료구조이다.
    -   리스트나 튜플의 index의 역할을 하는 key를 직접 지정한다.
    -   서로 의미가 다른 값들을 하나로 묶을 때 그 값의 의미를 key로 가질 수 있는 dictionary를 사용한다.
        -   cf) 값의 의미가 같을 경우 List나 Tuple을 사용한다.
    -   key-value 쌍으로 묶은 데이터 한개를 **item 또는 entry**라고 한다.
    -   key는 중복을 허용하지 않고 value는 중복을 허용한다.

### Dictionary 생성

-   구문
    1. `{ 키 : 값, 키 : 값, 키 : 값 }`
    2. dict(key=value, key=value) 함수 이용
    -   키(key)는 불변(Immutable)의 값들만 사용 가능하다. (숫자, 문자열, 튜플) 일반적으로 문자열을 사용한다.
    -   dict() 함수를 사용할 경우 key는 변수로 정의한다

````python
d1 = {"이름":"홍길동", "나이":20, "주소":"서울시 금천구"}
type(d1)
````

````python
print(d1)
````

````python
d2 = {
    "이름":"홍길동", 
    "나이":20, 
    "주소":"서울시 금천구",
    "취미": ["독서", "영화감상", "게임"]
}
````

````python
d3 = {
    0: "A",
    1: "B",
    2: "C"
}
````

````python
d4 = dict(이름="홍길동", 나이=20, 주소="서울")
print(d4)
````

### Dictionary 원소 조회 및 변경

-   조회: index에 key값을 식별자로 지정한다.
    -   dictionary\[ key \]
    -   없는 키로 조회 시 KeyError 발생
-   변경
    -   dictionary\[ key \] = 값
    -   있는 key값에 값을 대입하면 변경이고 없는 key 일 경우는 새로운 item을 추가하는 것이다.

````python
d2['이름'], d2['나이']
````

````python
d2['나이'] = 30  # 변경
d2
````

````python
d2['혈액형']
````

````python
d2['혈액형'] = "B형" # 없는 키 -> 추가
````

````python
d2
````

### Dictionary 연산자

-   **in, not in 연산자**
    -   값 in dictionary
        -   dictionary의 **Key**로 값이 **있으면** True, 없으면 False 반환
    -   값 not in dictionary
        -   dictionary의 **Key**로 값이 **없으면** True, 있으면 False 반환
-   **len(dictionary)**
    -   dictionary의 **Item의 개수** 반환

````python
"홍길동" in d2 # key가 있는지 여부
````

````python
"이름" in d2
````

````python
"이름" not in d2
````

````python
len(d2)
````

### Dictionary 주요 메소드

| 메소드               | 설명                                                                               |
| :------------------- | ---------------------------------------------------------------------------------- |
| get(key\[, 기본값\]) | key의 item의 값을 반환한다. 단 key가 없을 경우 None또는 기본값을 반환한다.         |
| pop(key)             | key의 item의 값을 반환하면서 dictionary에서 삭제한다. 없는 key일 경우 KeyError발생 |
| clear()              | dictionary의 모든 item들을 삭제한다.                                               |
| del dict\[key\]      | key의 item을 제거한다.                                                             |
| items()              | item의 key, value를 튜플로 묶어 모아 반환한다.                                     |
| keys()               | key값들만 모아 반환한다.                                                           |
| values()             | value값들만 모아 반환한다.                                                         |

````python
d2['키']
````

````python
d2.get("이름")
````

````python
result = d2.get("키") #없는 키로 조회하면 default값(None) 반환
print(result)
````

````python
result = d2.get("키", "키는 없는 key입니다.")
print(result)
````

````python
d2.pop("나이") # 삭제하고 value를 반환
````

````python
d2
````

````python
del d2['혈액형']
````

````python
d2.keys() # key값들만 조회
````

````python
d2.values() # value값들만 조회
````

````python
d2.items()  # item을 튜플로 묶어서 반환 (key, value)
````

## Set

-   Set은 중복되는 값을 허용하지 않고 순서를 신경 쓰지 않는다.
    -   원소를 식별할 수 있는 식별자가 없기 때문에 Set은 indexing과 slicing을 지원하지 않는다

### Set 생성

-   구문
    -   {값, 값, 값 }

> -   빈 Dictionary 만들기
>     -   info = {}
>     -   중괄호만 사용하면 빈 set이 아니라 빈 dictionary를 생성하는 것임.

````python
s1 = {1, 2, 3, 4, 10, 20}
s1
````

````python
s2 = {1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2}
s2
````

````python
l = [] # 빈리스트. l = list()
t = tuple() # 빈 튜플
d = {} # 빈 딕셔너리 d = dict()
s = set() # 빈 set
````

````python
s1[-1]
# TypeError: 'set' object is not subscriptable
# subscriptable: indexing으로 값을 조회할 수 있는 타입
````

````python
for i in s1:
    print(i)
````

### Set 연산자

-   **in, not in 연산자**
    -   값 in Set
        -   Set의 원소로 값이 **있으면** True, 없으면 False 반환
    -   값 not in Set
        -   Set의 원소로 값이 **없으면** True, 있으면 False 반환
-   **len(Set)**
    -   Set의 **원소의 개수** 반환
-   **[집합연산자](#Set의-집합연산-연산자-및-메소드)**

````python
s1
````

````python
1 in s1
100 in s1
````

### Set의 주요 메소드

| 메소드           | 설명                                   |
| ---------------- | -------------------------------------- |
| add(값)          | 집합에 값 추가                         |
| update(자료구조) | 자료구조내의 원소들을 모두 집합에 추가 |
| pop()            | 원소를 반환하고 Set에서 삭제한다.      |
| remove(값)       | 값을 찾아서 Set에서 삭제한다.          |

````python
s1.add(100)
s1
````

````python
s1.add(1)
s1
````

````python
s1.update([1, 2, 200, 300, 400])
s1
````

````python
s1.add(-100)
s1
````

````python
s1.pop()
````

````python
s1
````

````python
s1.remove(20)
````

````python
s1
````

### Set의 집합연산 연산자 및 메소드

-   합집합
    -   집합A | 집합B
    -   집합A.union(집합B)
-   교집합
    -   집합A & 집합B
    -   집합A.intersection(집합B)
-   차집합
    -   집합A - 집합B
    -   집합A.difference(집합B)

````python
s1 = {1, 2, 3, 4}
s2 = {3, 4, 5, 6, 7}

# 교집합
s1 & s2
s1.intersection(s2)
````

````python
# 합집합
s1 | s2
s1.union(s2)
````

````python
s1 - s2
s1.difference(s2)
````

## 자료구조를 이용한 대입

-   리스트, 튜플, 셋의 원소들을 개별 변수에 대입한다. 어느 자료구조에 적용하느냐에 따라 **리스트 대입, 튜플 대입, 셋 대입** 이라고 한다. 이중 리스트대입이나 튜플대입은 많이 사용된다.
-   변수의 개수와 원소의 개수는 동일해야 한다.

````python
a, b, c = 10, 20, 30
print(a, b, c)
````

````python
d, e, f, g = [10, 20, 30, 40]
print(d, e, f, g)
````

````python
i, j = {100, 200}
print(i, j)
````

## 자료구조 변환 함수

-   **list(자료구조)**
    -   대상 자료구조/Iterable을 List로 변환한다.
-   **tuple(자료구조)**
    -   대상 자료구조/Iterable을 Tuple로 변환
-   **set(자료구조)**
    -   대상 자료구조/Iterable을 Set으로 변환
    -   다른 자료구조의 원소 중 중복을 빼고 조회할 때 set()를 이용해 Set으로 변환한다.
-   Dictionary로 변환하는 함수는 없다.
    -   dict(key=value, ..) 는 딕셔너리 생성하는 함수이다.
-   변경 대상이 Dictionary 일 경우에는 key값들만 모아서 변환한다.

> -   **Iterable**
>     -   반복가능한 객체.
>     -   여러개의 값을 요청을 받을 때마다 하나씩 제공해주는 타입을 iterable 이라고 함.
>         -   Iterable이 제공하는 값을 반복문을 이용해 조회할 경우 **for in문**을 사용한다.
>     -   대표적으로 자료구조, 문자열 등이 있다.

````python
list("1abc3")
````

````python
s1
````

````python
list(s1)
````

````python
tuple(s1)
tuple("가나다라마바사")
````

````python
l = [1, 2, 2, 2, 3, 3]
set(l)
````

````python
# 0 ~ 6
# 1 ~ 7
# 일 ~ 토
# 월 ~ 일
````

````python
# 월: 0 ~ 일: 6
l = list("월화수목금토일")
l[2], l[0]+"요일"
````

## TODO

````python
control + shift + -
````

````python
# 문제 1 ~ 7
jumsu = [100, 90, 100, 80, 70, 100, 80, 90, 95, 85] 
# 위 리스트는 학생번호 1번 ~ 10번까지 10명의 시험 점수이다. 

#(1)  7번의 점수를 출력하세요
jumsu[7] # 8번째
jumsu[6]
````

````python
#(2)  1번부터 5번까지의 점수를 출력하세요.

jumsu[1:6]
jumsu[:5]
````

````python
#(3)  4, 5, 6, 7번의 점수를 출력하세요.
jumsu[3:7]
# 4, 5, 7
jumsu[3], jumsu[4], jumsu[6]
````

````python
#(4) 짝수번째 점수를 출력하세요.

jumsu[1::2]
````

````python
#(5) 홀수번째 점수를 출력하세요.

jumsu[::2]
````

````python
#(6) 9번의 점수를 20으로 변경하고 전체 출력하세요.
print(jumsu)
jumsu[8] = 20
print(f"변경후: {jumsu}")
````

````python
#(7) 중복된 점수는 제거하고 하나씩만 나오도록 출력하세요.
set(jumsu)
list(set(jumsu))
````

````python
# 문제 8 ~ 9
fruits = ["복숭아", "수박", "딸기"]

#(8) fruits 리스트에 마지막 원소로 "사과", "귤"을 추가하세요.

fruits.extend(['사과', '귤'])
print(fruits)
````

````python
#(9) fruits 리스트에서 "복숭아"를 제거하세요.

fruits.remove("복숭아")
print(fruits)
````

````python
# 문제 10 ~ 15
#(10)본인의 이름, 나이, email주소, 취미, 결혼유무를 사전(딕셔너리)으로 생성. 
# 취미는 2개 이상의 값을 넣는다..

info = {
    "이름":"홍길동",
    "나이":20,
    "email주소": "a@a.com",
    "취미": ["게임", "음악"],
    "결혼여부":"미혼"
}
info2 = dict(이름="이순신", email주소="l@a.com")
````

````python
#(11) 위 딕셔너리에서 이름과 email주소를 조회해서 출력하세요.
name = info['이름']
email = info.get("email주소")
name, email
````

````python
#(12) 위 딕셔너리에서 취미중 두번째 취미를 조회해서 출력하세요.

info['취미'][1]
````

````python
info['취미'][1] = "영화"
info['취미'].append('독서')
info
````

````python
#(13) 위 딕셔너리에 몸무게와 키 항목을 추가하세요.
info['키'] = 172.3
info['몸무게'] = 80
info
````

````python
#(14) 위 딕셔너리에서 email 주소를 다른 값으로 변경하세요.
info['email주소'] = "abcde@a.com"
info
````

````python
#(15) 위 딕셔너리에서 나이를 제거하세요.
info.pop("나이")
info
````

````python
print(info)
````

````python
l = list('aslkjflkadjflksdjlkdasjlksadjflkasdjflkasdjflkasdfjlasdjflkasdjflkdsajlkdasfkldfas')
print(l)
````

````python
info
````

````python
l
````

````python
# list, tuple, dictionary, set  출력함수. 한줄에 하나의 원소씩 출력
from pprint import pprint
pprint(info)
````

````python
pprint(l)
````

---

## 학습 정리



- List와 Tuple은 순서가 있는 시퀀스지만 Tuple은 변경할 수 없다.

- Dictionary는 키로 값을 관리하고 Set은 중복 없는 원소와 집합 연산에 적합하다.

- Set은 인덱싱할 수 없으며 자료구조마다 지원하는 조회 방식이 다르다.

- Unpacking과 변환 함수는 여러 자료구조 사이를 연결하는 기본 도구다.
