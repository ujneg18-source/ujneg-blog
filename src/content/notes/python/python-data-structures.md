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

> SKN31 Python 과정 노트북 `03_자료구조.ipynb`의 필기를 바탕으로 정리했습니다.
> 노트북은 셀을 오가며 실행해서 출력이 코드와 맞지 않는 곳이 있었습니다. 그래서 필기 코드를 순서대로 정리해 Python 3.13에서 처음부터 다시 실행한 결과를 실었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 자료구조가 필요한 이유와 네 가지 자료구조
- List: 조회·변경, 연산자, 중첩 리스트, 메소드
- Tuple: 바꿀 수 없는 List
- Dictionary: key로 값을 찾는 구조
- Set: 중복 없는 집합과 집합 연산
- 자료구조를 이용한 대입, 자료구조 변환

## 자료구조란

**여러 개의 값을 모아서 관리**하는 데이터 타입이다.

- 변수 하나는 값 하나만 가진다. 그런데 여러 값을 하나로 관리해야 할 때가 있다.
  - 고객 한 명의 정보는 이름, 나이, 주소, 전화번호가 모여 하나가 된다.
  - 한 반 학생들의 이름은 여러 이름으로 이뤄진다.
- 자료구조를 이루는 개별 값을 **원소(element, 요소, 성분)** 라고 한다. `len(자료구조)`는 원소 개수를 반환한다.

Python은 모으는 방식에 따라 네 가지를 제공한다.

| 자료구조 | 생성 | 순서 | 중복 | 원소 변경 | 원소 식별 |
|---|---|---|---|---|---|
| **List** | `[1, 2, 3]` | O | O | **O** | index |
| **Tuple** | `(1, 2, 3)` | O | O | **X** | index |
| **Dictionary** | `{"a": 1}` | O ※ | key는 X | O | key |
| **Set** | `{1, 2, 3}` | X | **X** | 추가·삭제만 | 없음 |

> **보충** ※ Dictionary는 Python 3.7부터 **넣은 순서를 유지**한다. 그래도 순서(index)로 조회하는 구조는 아니고, key로 조회한다.

## List

- 값을 **순서대로** 모아서 관리한다. 각 원소를 index(순번)로 식별하기 때문에 **순서가 중요하다.** 같은 값이라도 순서가 바뀌면 안 된다.
- index는 문자열처럼 양수 index(앞에서부터)와 음수 index(뒤에서부터)를 둘 다 가진다.
- **index만으로 각 원소의 의미를 알 수 있으면** List나 Tuple을 쓴다.
- 중복된 값을 저장할 수 있다.
- 원소들의 타입이 달라도 되지만, 보통은 같은 타입을 모은다.
- **원소를 추가, 삭제, 변경할 수 있다.** 이게 Tuple과의 차이다.

```python
l = [10, 20, 30, 40, 50]
l2 = [10, 5.6, "안녕하세요", True, [1, 2, 3], 3]
print(l2)
print(l2[4][1])       # 4번 원소(리스트)의 1번 원소
print(len(l), len(l2))
```

```text
[10, 5.6, '안녕하세요', True, [1, 2, 3], 3]
2
5 6
```

### Indexing과 Slicing

| 구문 | 동작 |
|---|---|
| `리스트[index]` | index의 원소 조회 |
| `리스트[index] = 값` | index의 원소 변경 |
| `리스트[시작:종료:간격]` | 시작 ~ 종료-1 범위 조회. 규칙은 문자열 slicing과 같다 |
| `리스트[시작:종료] = 값들` | 범위의 원소를 한 번에 변경 |

```python
l = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
print(l[0], l[-10])
l[2] = 1010  # 변경
print(l)
```

```text
0 0
[0, 1, 1010, 3, 4, 5, 6, 7, 8, 9]
```

```python
l[20]  # 없는 index 조회
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · IndexError: list index out of range</div></div>

```python
print(l[3:8])   # 간격 1
print(l[:8])    # 시작 생략: 0부터
print(l[8:])    # 끝 생략: 끝까지
print(l[3:20])  # 범위를 넘어도 있는 데까지
```

```text
[3, 4, 5, 6, 7]
[0, 1, 1010, 3, 4, 5, 6, 7]
[8, 9]
[3, 4, 5, 6, 7, 8, 9]
```

```python
l[3:6] = 300, 400, 500  # index 3, 4, 5를 각각 변경
print(l)
```

```text
[0, 1, 1010, 300, 400, 500, 6, 7, 8, 9]
```

필기에는 "slicing된 원소 개수와 같은 개수의 값을 대입한다"고 적었다.

> **보충** 실제로는 개수가 달라도 된다. 그 범위를 **통째로 갈아 끼우는** 동작이라서, 개수가 다르면 리스트 길이가 바뀐다. 의도치 않게 길이가 바뀔 수 있으니 주의한다.

```python
nums = [0, 1, 2, 3, 4, 5]
nums[1:4] = ["A"]       # 3개 자리에 1개
print(nums)
nums[1:2] = [7, 8, 9]   # 1개 자리에 3개
print(nums)
```

```text
[0, 'A', 4, 5]
[0, 7, 8, 9, 4, 5]
```

### List 연산자

| 연산 | 결과 |
|---|---|
| 리스트 `+` 리스트 | 두 리스트의 원소를 합친 **새** 리스트 |
| 리스트 `*` 정수 | 원소를 정수번 반복한 **새** 리스트 |
| 값 `in` / `not in` 리스트 | 원소로 있는가 / 없는가 |
| `len(리스트)` | 원소 개수 |

```python
a = [1, 2, 3]
b = [10, 20, 30, 40]
c = a + b
print(a, b, c)
print(a * 3)
print(2 in a, 10 in a)
print(2 not in a, 10 not in a)
```

```text
[1, 2, 3] [10, 20, 30, 40] [1, 2, 3, 10, 20, 30, 40]
[1, 2, 3, 1, 2, 3, 1, 2, 3]
True False
False True
```

`+`는 새 리스트를 만들고 `a`는 그대로다. 반면 `extend()`는 **a 자체를 바꾼다.**

```python
a.extend(b)
print(a)
print(b)
```

```text
[1, 2, 3, 10, 20, 30, 40]
[10, 20, 30, 40]
```

> **보충** 노트북에서는 `a.extend(b)`를 실행한 다음 셀에서 `a * 3` 결과로 `[1, 2, 3, ...]`이 나와 있었다. extend 이전 상태에서 실행한 출력이다. 순서대로 실행하면 a는 이미 7개짜리가 돼 있다.

### 중첩 리스트 (Nested List)

List도 값이니 다른 자료구조의 원소가 될 수 있다.

```python
nl = [[1, 2, 3], [4, 5, 6]]
print(len(nl), type(nl[0]))
print(nl[0][0])
nl[1][2] = 1000
print(nl)
print(nl[1][0:2])
```

```text
2 <class 'list'>
1
[[1, 2, 3], [4, 5, 1000]]
[4, 5]
```

여러 줄로 쓸 때는 마지막 원소 뒤에 `,`가 있어도 된다.

```python
nl2 = [
    [1, 2, 3, 4,],
    [10, 20, 30, 40],
    [2, 3, 4],
]
nl2
```

```text
[[1, 2, 3, 4], [10, 20, 30, 40], [2, 3, 4]]
```

### List 주요 메소드

| 메소드 | 설명 |
|---|---|
| `append(값)` | 값 하나를 끝에 추가 |
| `extend(리스트)` | 리스트의 원소들을 끝에 추가 |
| `insert(index, 값)` | index 위치에 삽입 |
| `sort(reverse=False)` | 오름차순 정렬. `reverse=True`면 내림차순 |
| `remove(값)` | 값과 같은 원소 삭제 |
| `pop(index)` | index의 값을 **반환하면서** 삭제. 생략하면 마지막 값 |
| `index(값, 시작index)` | 값의 index 반환 |
| `count(값)` | 값이 몇 개 있는지 |
| `clear()` | 모든 원소 삭제 |

```python
l = [1, 2, 3]
l.append(10)
l.append(20)
print(l)
l.extend([100, 200, 300, 400, 500])  # 한 번에 여러 개 추가
print(l)
l.insert(2, -1000)
print(l)
```

```text
[1, 2, 3, 10, 20]
[1, 2, 3, 10, 20, 100, 200, 300, 400, 500]
[1, 2, -1000, 3, 10, 20, 100, 200, 300, 400, 500]
```

```python
l.sort()              # 오름차순(기본)
print(l)
l.sort(reverse=True)  # 내림차순
print(l)
```

```text
[-1000, 1, 2, 3, 10, 20, 100, 200, 300, 400, 500]
[500, 400, 300, 200, 100, 20, 10, 3, 2, 1, -1000]
```

```python
l.remove(300)         # 값으로 삭제
l.extend([2, 2, 2, 2])
print(l)
l.remove(2)           # 여러 개 있으면 가장 앞의 하나만 삭제
print(l)
```

```text
[500, 400, 200, 100, 20, 10, 3, 2, 1, -1000, 2, 2, 2, 2]
[500, 400, 200, 100, 20, 10, 3, 1, -1000, 2, 2, 2, 2]
```

```python
print(l.pop())        # 마지막 값 삭제하고 반환
print(l.pop(3))       # 3번 index 삭제하고 반환
a = l.pop(2)
print(a)
print(l)
```

```text
2
100
200
[500, 400, 20, 10, 3, 1, -1000, 2, 2, 2]
```

```python
print(l.index(20))
print(l.index(2))
print(l.index(2, 8))  # 2를 찾는데 8번 index부터 찾아라
print(l.count(2))
l.clear()
print(l)
```

```text
2
7
8
3
[]
```

> **보충 · `append`와 `extend`의 차이**
> 리스트를 `append`하면 리스트 **하나가 원소로** 들어간다.

```python
x = [1, 2]
x.append([3, 4])
y = [1, 2]
y.extend([3, 4])
print(x, len(x))
print(y, len(y))
```

```text
[1, 2, [3, 4]] 3
[1, 2, 3, 4] 4
```

## Tuple

- List처럼 순서대로 관리하지만 **원소를 바꿀 수 없다.**
- 위치(index)마다 정해진 의미가 있고, 한 번 정하면 바뀌지 않는 값에 쓴다. 바뀌지 않으니 안전하다.

### 생성

- `(값, 값, 값)`. 소괄호는 생략할 수 있다.
- 원소가 하나면 `(값,)` 또는 `값,`처럼 **뒤에 `,`를 붙인다.** 안 붙이면 `( )`가 연산 우선순위 괄호가 된다.

```python
t = (1, 2, 3, 4, 5)
t2 = 1, 2, 3, 4, 5, 6
t3 = 1, 2.3, True, "aaaaa", [1, 2, 3], (1, 2, 3)
print(t, type(t))
print(t2, type(t2))
print(t3)
```

```text
(1, 2, 3, 4, 5) <class 'tuple'>
(1, 2, 3, 4, 5, 6) <class 'tuple'>
(1, 2.3, True, 'aaaaa', [1, 2, 3], (1, 2, 3))
```

```python
t4 = (10,)
t5 = 10,
t6 = (10)
print(type(t4), type(t5), type(t6))
```

```text
<class 'tuple'> <class 'tuple'> <class 'int'>
```

`(10)`은 그냥 정수 10이다.

### 조회

List와 같다. 단 조회만 되고 바꿀 수 없다.

```python
print(t[0], t[-2])
```

```text
1 4
```

```python
t[0] = 100
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: &#x27;tuple&#x27; object does not support item assignment</div></div>

```python
t = (0, 1, 2, 3, 4, 5, 6, 7, 8, 9)
print(t[2:-2:2], t[:-3], t[3:])
print(t[3::2], t[8:2:-2], t[::-1])
```

```text
(2, 4, 6) (0, 1, 2, 3, 4, 5, 6) (3, 4, 5, 6, 7, 8, 9)
(3, 5, 7, 9) (8, 6, 4) (9, 8, 7, 6, 5, 4, 3, 2, 1, 0)
```

### 연산자와 메소드

연산자(`+`, `*`, `in`, `not in`, `len`)는 List와 같고, 결과가 tuple이다. 메소드는 바꾸지 않는 것 두 개뿐이다.

| 메소드 | 설명 |
|---|---|
| `index(값, 시작index)` | 값이 몇 번 index인지 |
| `count(값)` | 값이 몇 개 있는지 |

```python
print(t + t3)  # 둘을 합친 새 튜플
print(t2 * 3)
print(len(t3), 3 in t, 100 not in t)
print(t.index(5))
```

```text
(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2.3, True, 'aaaaa', [1, 2, 3], (1, 2, 3))
(1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6)
6 True True
5
```

`index()`는 찾는 값이 없으면 에러가 난다.

```python
t.index(5, 7)  # index 7부터 5를 찾는다
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: tuple.index(x): x not in tuple</div></div>

```python
try:
    i = t.index(5, 7)
    print(f"찾는 값은 {i}에 있어요.")
except ValueError:
    print("찾는 값이 없습니다.")
```

```text
찾는 값이 없습니다.
```

> **보충** 노트북의 이 셀에는 "찾는 값은 5에 있어요."가 출력돼 있었다. 그때 `t`가 `(0, ..., 9)`로 바뀌기 전 값이어서 그렇고, 순서대로 실행하면 7번부터는 5가 없으니 except로 간다. 그리고 `except:`만 쓰면 오타로 생긴 에러까지 삼켜 버리니, 잡을 예외(`ValueError`)를 적어 주는 게 좋다. 예외 처리는 [예외 처리 글](/notes/python/python-exception-handling)에서 다룬다.

> **보충 · Tuple 안의 List는 바뀐다**
> Tuple이 막는 건 "어떤 객체를 가리키는지"를 바꾸는 것이다. 원소가 List라면 그 List 안의 값은 바꿀 수 있다.

```python
t3[4].append(4)
print(t3)
```

```text
(1, 2.3, True, 'aaaaa', [1, 2, 3, 4], (1, 2, 3))
```

## Dictionary

- 값을 **key-value 쌍**으로 묶어 저장한다. List·Tuple의 index 역할을 하는 key를 직접 정한다.
- **의미가 서로 다른 값**을 하나로 묶을 때, 그 의미를 key로 붙일 수 있는 Dictionary를 쓴다. 값의 의미가 같으면 List나 Tuple을 쓴다.
- key-value 쌍 하나를 **item(entry)** 이라고 한다.
- **key는 중복될 수 없고**, value는 중복돼도 된다.

### 생성

1. `{키: 값, 키: 값}`
2. `dict(키=값, 키=값)`: 키를 변수 이름처럼 쓴다.

key로는 **불변(Immutable)** 값(숫자, 문자열, 튜플)만 쓸 수 있다. 보통 문자열을 쓴다.

```python
d1 = {"이름": "홍길동", "나이": 20, "주소": "서울시 금천구"}
print(type(d1), d1)

d2 = {
    "이름": "홍길동",
    "나이": 20,
    "주소": "서울시 금천구",
    "취미": ["독서", "영화감상", "게임"],
}
d3 = {0: "A", 1: "B", 2: "C"}  # 숫자 key
d4 = dict(이름="홍길동", 나이=20, 주소="서울")
print(d4)
```

```text
<class 'dict'> {'이름': '홍길동', '나이': 20, '주소': '서울시 금천구'}
{'이름': '홍길동', '나이': 20, '주소': '서울'}
```

### 조회와 변경

| 구문 | 동작 |
|---|---|
| `딕셔너리[key]` | 조회. 없는 key면 `KeyError` |
| `딕셔너리[key] = 값` | 있는 key면 **변경**, 없는 key면 **추가** |

```python
print(d2["이름"], d2["나이"])
d2["나이"] = 30          # 있는 키 → 변경
d2["혈액형"] = "B형"     # 없는 키 → 추가
d2
```

```text
홍길동 20
```

```text
{'이름': '홍길동', '나이': 30, '주소': '서울시 금천구', '취미': ['독서', '영화감상', '게임'], '혈액형': 'B형'}
```

```python
d2["키"]
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · KeyError: &#x27;키&#x27;</div></div>

### 연산자

`in`, `not in`은 **key**가 있는지를 본다. value를 찾는 게 아니다.

```python
print("홍길동" in d2)  # value라서 False
print("이름" in d2, "이름" not in d2)
print(len(d2))         # item 개수
```

```text
False
True False
5
```

### 주요 메소드

| 메소드 | 설명 |
|---|---|
| `get(key, 기본값)` | key의 값 반환. key가 없으면 `None` 또는 기본값 (에러 안 남) |
| `pop(key)` | key의 값을 반환하면서 삭제. 없으면 `KeyError` |
| `del 딕셔너리[key]` | key의 item 삭제 |
| `clear()` | 모든 item 삭제 |
| `keys()` / `values()` / `items()` | key들 / value들 / (key, value) 튜플들 |

```python
print(d2.get("이름"))
print(d2.get("키"))                          # 없는 키 → None
print(d2.get("키", "키는 없는 key입니다."))  # 없는 키 → 기본값
```

```text
홍길동
None
키는 없는 key입니다.
```

```python
print(d2.pop("나이"))  # 삭제하고 value를 반환
del d2["혈액형"]
print(d2)
```

```text
30
{'이름': '홍길동', '주소': '서울시 금천구', '취미': ['독서', '영화감상', '게임']}
```

```python
print(d2.keys())
print(d2.values())
print(d2.items())
```

```text
dict_keys(['이름', '주소', '취미'])
dict_values(['홍길동', '서울시 금천구', ['독서', '영화감상', '게임']])
dict_items([('이름', '홍길동'), ('주소', '서울시 금천구'), ('취미', ['독서', '영화감상', '게임'])])
```

`items()`는 반복문에서 key와 value를 같이 꺼낼 때 많이 쓴다.

```python
for key, value in d2.items():
    print(key, "→", value)
```

```text
이름 → 홍길동
주소 → 서울시 금천구
취미 → ['독서', '영화감상', '게임']
```

## Set

- **중복을 허용하지 않고, 순서가 없다.**
- 원소를 식별할 index가 없으니 indexing과 slicing을 지원하지 않는다.
- `{값, 값, 값}`으로 만든다.

```python
s1 = {1, 2, 3, 4, 10, 20}
s2 = {1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2}
print(s1)
print(s2)  # 중복이 사라진다
```

```text
{1, 2, 3, 4, 20, 10}
{1, 2}
```

빈 자료구조 만들기에서 **`{}`는 빈 Set이 아니라 빈 Dictionary**다.

```python
l = []        # 빈 리스트. list()
t = tuple()   # 빈 튜플. ()
d = {}        # 빈 딕셔너리. dict()
s = set()     # 빈 set은 set()으로만
print(type(d), type(s))
```

```text
<class 'dict'> <class 'set'>
```

```python
s1[-1]  # subscriptable: indexing으로 값을 조회할 수 있는 타입
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: &#x27;set&#x27; object is not subscriptable</div></div>

index로 꺼낼 수 없으니 반복문으로 하나씩 꺼낸다. 순서는 보장되지 않는다.

```python
for i in s1:
    print(i, end=" ")
```

```text
1 2 3 4 20 10 
```

### 연산자와 메소드

`in`, `not in`, `len()`은 다른 자료구조와 같다.

| 메소드 | 설명 |
|---|---|
| `add(값)` | 값 추가 |
| `update(자료구조)` | 자료구조의 원소를 모두 추가 |
| `pop()` | 원소 하나를 반환하고 삭제 (어떤 원소일지 정할 수 없다) |
| `remove(값)` | 값을 찾아 삭제 |

```python
print(1 in s1, 100 in s1)
s1.add(100)
s1.add(1)  # 이미 있으면 변화 없음
print(s1)
s1.update([1, 2, 200, 300, 400])
s1.add(-100)
print(s1)
print(s1.pop())
s1.remove(20)
print(s1)
```

```text
True False
{1, 2, 3, 4, 20, 100, 10}
{1, 2, 3, 4, 200, 10, 400, 20, -100, 100, 300}
1
{2, 3, 4, 200, 10, 400, -100, 100, 300}
```

### 집합 연산

| 연산 | 연산자 | 메소드 |
|---|---|---|
| 합집합 | `A \| B` | `A.union(B)` |
| 교집합 | `A & B` | `A.intersection(B)` |
| 차집합 | `A - B` | `A.difference(B)` |

```python
s1 = {1, 2, 3, 4}
s2 = {3, 4, 5, 6, 7}
print(s1 & s2, s1.intersection(s2))
print(s1 | s2, s1.union(s2))
print(s1 - s2, s1.difference(s2))
```

```text
{3, 4} {3, 4}
{1, 2, 3, 4, 5, 6, 7} {1, 2, 3, 4, 5, 6, 7}
{1, 2} {1, 2}
```

## 자료구조를 이용한 대입

- 리스트, 튜플, 셋의 원소를 각 변수에 나눠 대입한다. 리스트 대입, 튜플 대입, 셋 대입이라고 하고, 리스트·튜플 대입을 많이 쓴다.
- **변수 개수와 원소 개수가 같아야** 한다.

```python
a, b, c = 10, 20, 30           # 튜플 대입
d, e, f, g = [10, 20, 30, 40]  # 리스트 대입
print(a, b, c)
print(d, e, f, g)
```

```text
10 20 30
10 20 30 40
```

개수가 다르면 에러다.

```python
d, e, f, g = [10, 20, 30]
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: not enough values to unpack (expected 4, got 3)</div></div>

> **보충** 노트북에는 `d, e, f, g = [10, 20, 30, 40]` 셀에 위 에러가 출력돼 있었다. 처음에 원소를 3개만 넣고 실행했다가 코드를 고친 뒤 다시 실행하지 않은 것으로 보인다. 지금 코드는 정상 동작한다.

Set 대입은 순서가 없어서 **어느 변수에 어떤 값이 들어갈지 알 수 없다.** 그래서 잘 안 쓴다.

```python
i, j = {100, 200}
print(i, j)
```

```text
200 100
```

## 자료구조 변환

| 함수 | 동작 |
|---|---|
| `list(자료구조)` | List로 변환 |
| `tuple(자료구조)` | Tuple로 변환 |
| `set(자료구조)` | Set으로 변환. **중복 제거**할 때 많이 쓴다 |

- Dictionary로 변환하는 함수는 없다. `dict(key=value)`는 생성 함수다.
- 변환 대상이 Dictionary면 **key들만** 모아서 변환한다.

> **Iterable**
> 반복 가능한 객체. 값을 요청할 때마다 하나씩 제공하는 타입이다. 자료구조, 문자열 등이 대표적이고, Iterable의 값을 반복해서 꺼낼 때는 `for in` 문을 쓴다. 위 변환 함수들은 Iterable이면 다 받는다.

```python
print(list("1abc3"))
print(list({1, 2, 3, 4}))
print(tuple("가나다라마바사"))
print(set([1, 2, 2, 2, 3, 3]))
print(list({"이름": "홍길동", "나이": 20}))  # dict → key만
```

```text
['1', 'a', 'b', 'c', '3']
[1, 2, 3, 4]
('가', '나', '다', '라', '마', '바', '사')
{1, 2, 3}
['이름', '나이']
```

문자열을 리스트로 바꾸면 index로 요일을 꺼내는 표를 쉽게 만들 수 있다.

```python
# 월: 0 ~ 일: 6
l = list("월화수목금토일")
l[2], l[0] + "요일"
```

```text
('수', '월요일')
```

## 연습 문제

학생 1번 ~ 10번의 점수가 있다. 학생 번호는 1부터, index는 0부터라서 **번호 - 1 = index**다.

```python
jumsu = [100, 90, 100, 80, 70, 100, 80, 90, 95, 85]

# (1) 7번의 점수를 출력하세요
print(jumsu[6])        # 7번 → index 6 (jumsu[7]은 8번)

# (2) 1번부터 5번까지의 점수를 출력하세요.
print(jumsu[:5])       # index 0 ~ 4

# (3) 4, 5, 6, 7번의 점수를 출력하세요.
print(jumsu[3:7])

# (4) 짝수번째 점수를 출력하세요.
print(jumsu[1::2])     # 2, 4, 6, 8, 10번 → index 1, 3, 5...

# (5) 홀수번째 점수를 출력하세요.
print(jumsu[::2])
```

```text
80
[100, 90, 100, 80, 70]
[80, 70, 100, 80]
[90, 80, 100, 90, 85]
[100, 100, 70, 80, 95]
```

> **보충** (2)번 셀에는 `jumsu[1:6]`도 같이 적혀 있었는데, 이건 index 1~5, 즉 **2번~6번**이다. 1번~5번은 `jumsu[:5]`가 맞다.

```python
# (6) 9번의 점수를 20으로 변경하고 전체 출력하세요.
jumsu[8] = 20
print(f"변경후: {jumsu}")

# (7) 중복된 점수는 제거하고 하나씩만 나오도록 출력하세요.
print(set(jumsu))
print(list(set(jumsu)))
print(sorted(set(jumsu)))  # 보충: 정렬까지 하려면 sorted()
```

```text
변경후: [100, 90, 100, 80, 70, 100, 80, 90, 20, 85]
{100, 70, 80, 20, 85, 90}
[100, 70, 80, 20, 85, 90]
[20, 70, 80, 85, 90, 100]
```

```python
fruits = ["복숭아", "수박", "딸기"]

# (8) fruits 리스트에 마지막 원소로 "사과", "귤"을 추가하세요.
fruits.extend(["사과", "귤"])
print(fruits)

# (9) fruits 리스트에서 "복숭아"를 제거하세요.
fruits.remove("복숭아")
print(fruits)
```

```text
['복숭아', '수박', '딸기', '사과', '귤']
['수박', '딸기', '사과', '귤']
```

```python
# (10) 이름, 나이, email주소, 취미, 결혼유무를 딕셔너리로 생성. 취미는 2개 이상.
info = {
    "이름": "홍길동",
    "나이": 20,
    "email주소": "a@a.com",
    "취미": ["게임", "음악"],
    "결혼여부": "미혼",
}

# (11) 이름과 email주소를 조회해서 출력하세요.
print(info["이름"], info.get("email주소"))

# (12) 취미 중 두 번째 취미를 조회해서 출력하세요.
print(info["취미"][1])

info["취미"][1] = "영화"      # 딕셔너리 안 리스트의 원소 변경
info["취미"].append("독서")
```

```text
홍길동 a@a.com
음악
```

```python
# (13) 몸무게와 키 항목을 추가하세요.
info["키"] = 172.3
info["몸무게"] = 80

# (14) email 주소를 다른 값으로 변경하세요.
info["email주소"] = "abcde@a.com"

# (15) 나이를 제거하세요.
info.pop("나이")
print(info)
```

```text
{'이름': '홍길동', 'email주소': 'abcde@a.com', '취미': ['게임', '영화', '독서'], '결혼여부': '미혼', '키': 172.3, '몸무게': 80}
```

### pprint: 자료구조를 보기 좋게 출력

```python
from pprint import pprint

pprint(info)
```

```text
{'email주소': 'abcde@a.com',
 '결혼여부': '미혼',
 '몸무게': 80,
 '이름': '홍길동',
 '취미': ['게임', '영화', '독서'],
 '키': 172.3}
```

> **보충 · pprint는 dict의 key를 정렬한다**
> 위 출력을 `print(info)`와 비교하면 key 순서가 다르다. `pprint`는 기본으로 key를 정렬해서 보여 준다. 넣은 순서대로 보려면 `sort_dicts=False`를 준다. 한 줄에 다 들어가면 줄을 나누지 않으니, `width`를 줄여서 확인했다.

```python
pprint(info, sort_dicts=False, width=50)
```

```text
{'이름': '홍길동',
 'email주소': 'abcde@a.com',
 '취미': ['게임', '영화', '독서'],
 '결혼여부': '미혼',
 '키': 172.3,
 '몸무게': 80}
```

## 정리

- 의미가 같은 값의 모음은 **List**(바뀜) / **Tuple**(안 바뀜), 의미가 다른 값의 모음은 **Dictionary**, 중복 없는 모음은 **Set**.
- `+`, `*`는 새 자료구조를 만들고, `append`, `extend`, `sort` 같은 메소드는 원본을 바꾼다.
- Dictionary의 `in`은 key를 찾는다. 없는 key 조회는 `[]`면 에러, `get()`이면 `None`.
- `{}`는 빈 Dictionary다. 빈 Set은 `set()`.
- Set은 순서가 없어서 꺼내는 순서, `pop()`하는 원소, Set 대입 결과를 정할 수 없다.
- 번호와 index가 1 차이 나는 문제는 slicing 범위를 한 번 더 확인한다.
