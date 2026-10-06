---
title: "입출력: 파일, bytes, 객체 직렬화"
description: "파일 입출력과 with 문, bytes 타입, 객체 직렬화의 기본 사용법을 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Python 기초'
seriesOrder: 9
originalNotebook: "09_입출력.ipynb"
tags: ["Python","IO","Serialization"]
date: 2026-04-21
---

> SKN31 Python 과정 노트북 `09_입출력.ipynb`와 `simple_memo.py`를 바탕으로 정리했습니다.
> 코드는 빈 `text` 폴더에서 Python 3.13으로 순서대로 다시 실행한 결과입니다. Windows 전용 경로(`c:\...`)를 쓰는 셀은 코드만 실었고, `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 입출력(IO)과 Stream
- 파일 경로: 절대경로와 상대경로
- `open()`과 mode, encoding
- 쓰기(`write`, `writelines`)와 읽기(`read`, `readline`, `readlines`, for문)
- `with` 블록
- bytes와 `pickle`을 이용한 객체 직렬화
- 실습: CLI 메모장

## 입출력이란

프로그램이 **외부 자원**과 연결해 데이터를 입력받거나 출력하는 작업을 IO라고 한다.

- **외부 자원**: 파일, 원격 컴퓨터(네트워크로 연결된 컴퓨터의 자원), 데이터베이스 등 프로그램이 쓰는 외부 데이터
- **Stream**: 입출력할 때 **데이터의 흐름**
  - **InputStream**: 프로그램이 외부에서 데이터를 읽어 들이는 흐름
  - **OutputStream**: 프로그램이 외부로 데이터를 써 주는 흐름

![io](/images/python/ch09_01.png)

## IO 코딩 순서

1. **파일 열기(연결)**
2. 데이터를 파일에 **쓰기 / 읽기**
3. **파일 닫기(연결 끊기)**

### 파일 열기: open()

```python
open(file, mode="r", encoding=None)
```

연결된 파일과, 입출력 메소드를 제공하는 객체(**Stream**)를 반환한다.

| 매개변수 | 설명 |
|---|---|
| `file` | 연결할 파일 경로 |
| `encoding` | **텍스트 파일**일 때 인코딩 방식. 생략하면 **OS 기본 인코딩**을 따른다 (Windows: cp949/euc-kr, Linux·Unix: utf-8) |
| `mode` | 열기 모드. **목적 + 데이터 종류**를 조합한 문자열 |

| mode 타입 | 문자 | 설명 |
|---|---|---|
| 목적 | `r` | 읽기 (기본) |
| | `w` | 새로 쓰기. 파일이 있으면 **내용을 지우고** 새로 쓴다 |
| | `a` | 이어 쓰기. 기존 내용 뒤에 붙인다 |
| | `x` | 새로 쓰기. 파일이 **이미 있으면 Exception** |
| 데이터 종류 | `t` | Text 모드 (기본) |
| | `b` | binary 모드 |

예: `"rt"` 텍스트 읽기, `"wt"` 텍스트 새로 쓰기, `"wb"` 바이너리 쓰기

### 파일 경로

```python
# 파일경로 -> 디렉토리경로/파일경로
#   - 절대경로: root directory부터 경로를 설정.
#        - win: "c:\a\b\c.txt"
#        - linux/macos: "/a/b/c.txt"
#   - 상대경로: 현재 working directory에서부터 시작하는 경로로 설정.
#        - Root 경로(디렉토리)로 시작하지 않으면 상대경로임.
#        - `.` : 현재 디렉토리
#        - `..` : 상위 디렉토리
```

상대경로의 기준인 현재 working directory는 `os.getcwd()`로 확인한다. 수업 PC에서는 노트북이 있는 폴더가 나왔다.

```python
# 현재 working directory 조회
import os
wd = os.getcwd()
print(wd, type(wd))
```

```text
c:\Documents\SKN31_JY\SKN31\01_python <class 'str'>
```

디렉토리는 `os.makedirs()`로 만든다. 중간 경로가 없으면 같이 만든다.

```python
os.makedirs(r"c:\a\b\c\e")  # 절대경로
os.makedirs(r"a\b\c\e")     # 상대경로
```

```python
import os  # 내장모듈. os 명령어를 파이썬 함수로 제공하는 모듈

# 0. 파일을 저장할 디렉토리 생성
os.makedirs("text", exist_ok=True)
# exist_ok=True: 없으면 만들고 있으면 만들지 않는다.
#   default: False - 있으면 Exception 발생
```

> **보충** `exist_ok`를 빼고 이미 있는 디렉토리를 다시 만들면 이렇게 된다.

```python
os.makedirs("text")
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · FileExistsError: [Errno 17] File exists: &#x27;text&#x27;</div></div>

## 출력 (쓰기)

| 메소드 | 설명 |
|---|---|
| `write(데이터)` | 연결된 파일에 데이터를 출력한다 |
| `writelines(문자열 컬렉션)` | 리스트·튜플·집합의 문자열들을 한 번에 출력한다. text 출력에만 쓸 수 있고, 문자열 아닌 원소가 있으면 `TypeError` |

```python
# 1. 파일 연결
# fw = open("text/a.txt", mode="wt", encoding="utf-8")
# fw = open("text/a.txt", mode="at", encoding="utf-8")
try:
    fw = open("text/a.txt", mode="xt", encoding="utf-8")
    # fw: 연결된 파일에 텍스트(t)를 출력(w)하는 메소드를 제공하는 객체를 반환

    # 2. 쓰기(w), 읽기(r)
    fw.write("안녕하세요.\n")  # write(str: "t")
    fw.write("반갑습니다.")

    str_list = ["\n\n\n", "aaaaaa", "bbbbbb", "cccccc"]
    fw.writelines(str_list)  # writelines(list[str]): list 안의 str들을 한 번에 출력

    # 3. 연결 닫기(끊기)
    fw.close()
except:
    pass
```

`writelines()`는 원소 사이에 줄바꿈을 넣어 주지 않는다. `aaaaaa`, `bbbbbb`, `cccccc`가 한 줄로 붙는다.

> **보충 · `x` 모드 + `except: pass`**
> 같은 셀을 한 번 더 실행하면 `a.txt`가 이미 있어서 `open()`이 `FileExistsError`를 내는데, `except: pass`가 조용히 넘긴다. 아무 일도 안 일어나고 아무 메시지도 없다. 의도한 동작이라도 `except FileExistsError: print("이미 있는 파일")`처럼 알려 주는 게 낫다.
> 노트북에서 읽은 `a.txt` 내용이 네 번 반복돼 있던 건, 이 셀을 `"at"`(이어 쓰기) 모드로 여러 번 실행했기 때문이다. 여기서는 빈 폴더에서 한 번만 실행해서 한 벌만 있다.

```python
fw2 = open(r"c:\temp\new_txt.txt", "wt", encoding="utf-8")  # 텍스트 쓰기모드 연결
fw2.write("AAAAA\nBBBBB\nCCCCC\n")
fw2.write("안녕하세요.")
fw2.close()
```

## 입력 (읽기)

| 메소드 | 반환 | 설명 |
|---|---|---|
| `read()` | str (text) / bytes (binary) | 파일 내용을 **한 번에 모두** 읽는다 |
| `readline()` | str / bytes | **한 줄만** 읽는다. 더 읽을 줄이 없으면 **빈 문자열** |
| `readlines()` | list | 한 번에 다 읽고 각 줄을 리스트 원소로 담는다 |

Text Input Stream은 **Iterable**이라서 for문으로 한 줄씩 읽을 수 있다.

```python
# 1. 파일 연결
fr = open("text/a.txt", "rt", encoding="utf-8")
# 2. 읽기 (input: r모드)
txt = fr.read()  # 한 번에 다 읽는다
# 3. 연결 끊기
fr.close()

print(type(txt))
print(txt)
```

```text
<class 'str'>
안녕하세요.
반갑습니다.


aaaaaabbbbbbcccccc
```

### 인코딩을 생략하면

```python
####################################
# 라인 별로 나눠서 읽기 - list로 반환
####################################
fr = open("text/a.txt", mode="rt")  # , encoding="utf-8") # encoding 생략 - OS의 기본 인코딩 방식
txt_list = fr.readlines()  # 라인 단위로 잘라서 list로 반환
print(txt_list)
fr.close()
```

수업 PC(Windows)에서 실행하면 이 에러가 났다.

```text
UnicodeDecodeError: 'cp949' codec can't decode byte 0xec in position 0: illegal multibyte sequence
```

utf-8로 **저장한** 파일을 Windows 기본값인 cp949로 **읽으려고** 해서 깨진 것이다. 이 글을 실행한 환경은 Linux라 기본값이 utf-8이어서, 같은 상황을 만들려면 cp949를 직접 지정해야 한다.

```python
fr = open("text/a.txt", mode="rt", encoding="cp949")
txt_list = fr.readlines()
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · UnicodeDecodeError: &#x27;cp949&#x27; codec can&#x27;t decode byte 0xec in position 0: illegal multibyte sequence</div></div>

```python
fr = open("text/a.txt", mode="rt", encoding="utf-8")  # 저장할 때와 같은 인코딩
txt_list = fr.readlines()
print(txt_list)
fr.close()
```

```text
['안녕하세요.\n', '반갑습니다.\n', '\n', '\n', 'aaaaaabbbbbbcccccc']
```

각 줄 끝에 `\n`이 붙어 있다. 쓸 때 넣은 `\n`이 그대로 읽힌다. 텍스트 파일은 **쓸 때와 읽을 때 encoding을 같게**, 보통 `utf-8`로 명시한다.

### 한 줄씩 읽기

```python
#################################
# 한줄 씩 읽기
#################################
fr = open("text/a.txt", mode="rt", encoding="utf-8")
print(fr.readline())  # 한줄만 읽기
print(fr.readline())
print(fr.readline())
print(fr.readline())
print(fr.readline())
print("-------")
print(fr.readline())  # 더 이상 읽을 것이 없으면 빈 문자열을 반환
print("-------")
fr.close()
```

```text
안녕하세요.

반갑습니다.





aaaaaabbbbbbcccccc
-------

-------
```

> **보충** 줄 사이에 빈 줄이 하나씩 더 생긴 건, 읽은 줄 끝의 `\n`에 `print()`가 줄바꿈을 한 번 더 붙여서다. `print(line, end="")`나 `line.rstrip("\n")`으로 하나를 빼면 된다.

```python
################################
# for in 을 이용해 한줄 씩 읽기
################################
fr = open("text/a.txt", mode="rt", encoding="utf-8")
print(type(fr))
for linenum, s in enumerate(fr, start=1):
    print(f"{linenum}. {s}", end="")
fr.close()
```

```text
<class '_io.TextIOWrapper'>
1. 안녕하세요.
2. 반갑습니다.
3. 
4. 
5. aaaaaabbbbbbcccccc
```

여기서는 `end=""`를 줘서 줄바꿈이 한 번만 들어갔다.

## with 블록

입출력이 끝나면 **반드시 연결을 닫아야** 한다. 매번 닫기 번거롭고, 실수로 안 닫으면 문제가 생긴다. **with 블록은 블록을 벗어나면 자동으로 연결을 닫아 준다.**

```python
with open() as 변수:  # 변수는 open()이 반환하는 Stream 객체를 참조한다
    입출력 작업       # 변수를 이용해 입출력 작업을 처리한다
# with 블록을 빠져나오면 close()가 자동으로 실행된다
```

연결 상태는 `closed` 속성으로 확인한다.

```python
fr = open("text/a.txt", mode="rt", encoding="utf-8")
print("연결여부확인:", fr.closed)
fr.close()
print("close()후 연결여부확인:", fr.closed)
```

```text
연결여부확인: False
close()후 연결여부확인: True
```

```python
with open("text/a.txt", mode="rt", encoding="utf-8") as fr:
    for linenum, s in enumerate(fr, start=1):
        print(f"{linenum}. {s}")
        print("--------------")
    print(fr.closed)  # 블록 안

print(fr.closed)      # 블록 밖
```

```text
1. 안녕하세요.

--------------
2. 반갑습니다.

--------------
3. 

--------------
4. 

--------------
5. aaaaaabbbbbbcccccc
--------------
False
True
```

```python
with open("text/b.txt", "wt", encoding="utf-8") as fw:
    fw.write("a\n")  # write(str)
    fw.write("b\n")
    fw.write("가\n")
    fw.write("나\n")
    print(fw.closed)

print(fw.closed)
```

```text
False
True
```

> **보충** 노트북의 `try - except`로 쓴 첫 예제는 `write()`에서 예외가 나면 `close()`까지 가지 못한다. `with`는 블록 안에서 예외가 나도 닫아 주니, 파일은 with로 여는 게 기본이다.

## Binary 데이터 입출력

```python
# "rt", "wt" : t모드 -> 입출력 타입: str    read(): str,   write(str)
# "rb", "wb" : b모드 -> 입출력 타입: bytes  read(): bytes, write(bytes)
```

### bytes 타입

binary 데이터를 입출력하기 위한 타입이다.

- 다양한 타입의 값을 하나의 출력 함수로 내보내려면 **bytes로 변환**해야 한다.
- binary 데이터를 읽으면 **bytes**로 반환된다. 원래 타입으로 쓰려면 bytes에서 다시 변환해야 한다.

![bytes 변환](/images/python/ch10_03.png)

노트북에서 binary 모드에 문자열을 쓰려다 주석 처리한 코드가 있다. 실행하면 이렇게 된다.

```python
f = open("text/test.bin", "wb")
print(type(f))
f.write("aaaa")  # int -> bytes
```

```text
<class '_io.BufferedWriter'>
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: a bytes-like object is required, not &#x27;str&#x27;</div></div>

b 모드 Stream(`BufferedWriter`)은 **bytes만** 받는다. 값마다 bytes로 바꾸는 방법이 달라서 코드가 복잡해지는데, 이걸 대신해 주는 게 pickle이다.

## pickle을 이용한 객체 직렬화

### 객체 직렬화 (Object Serialization)

| | 의미 |
|---|---|
| **직렬화** | 객체의 속성값을 **bytes로 변환해 출력**하는 것 |
| **역직렬화** | bytes로 출력된 데이터를 읽어 **다시 객체로 만드는** 것 |

### pickle 모듈

- binary 데이터 입출력을 쉽게 해 주는 **표준 라이브러리**다. 타입마다 다른 bytes 변환 방식을 추상화해 준다.
- Python의 모든 값은 객체라서 pickle은 객체 직렬화·역직렬화 모듈이다.
- 파일 확장자는 보통 `.pkl`이나 `.pickle`로 한다.
- **binary 모드**로 연다.

```python
fw = open("data.pkl", "wb")  # 객체를 저장하기 위한 output stream
fr = open("data.pkl", "rb")  # 저장된 객체를 읽어 오기 위한 input stream
```

| 메소드 | 설명 |
|---|---|
| `pickle.dump(저장할 객체, fw)` | 출력 |
| `pickle.load(fr)` | 입력. 읽은 객체를 반환 |

```python
import pickle

i = 1000000  # int

with open("text/int_data.pickle", "wb") as fo:
    pickle.dump(i, fo)
    # 1. i -> bytes로 변환, 2. fo를 이용해서 출력
```

```python
with open("text/int_data.pickle", "rb") as fi:
    load_i = pickle.load(fi)

print(type(load_i), load_i + 100)
# data: bytes = fi.read()
# int_result = data를 int로 변환  ← 이 두 단계를 pickle.load가 해 준다
```

```text
<class 'int'> 1000100
```

읽어 온 값이 문자열이 아니라 **int 그대로**라서 바로 계산할 수 있다.

자료구조도 그대로 저장되고 복원된다.

```python
person_info = [{
    "이름": "홍길동",
    "나이": 20,
    "주소": "서울",
    "혈액형": "A형",
}]
with open("text/person.pickle", "wb") as fo:
    pickle.dump(person_info, fo)

with open("text/person.pickle", "rb") as fi:
    new_person_info = pickle.load(fi)

print(type(new_person_info))
new_person_info
```

```text
<class 'list'>
```

```text
[{'이름': '홍길동', '나이': 20, '주소': '서울', '혈액형': 'A형'}]
```

직접 만든 클래스의 객체도 된다.

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __str__(self):
        return f"{self.name}, {self.age}"

p1 = Person("홍길동", 30)
with open("text/p.pickle", "wb") as fo:
    pickle.dump(p1, fo)

with open("text/p.pickle", "rb") as fi:
    load_p = pickle.load(fi)

print(load_p)
load_p.name, load_p.age
```

```text
홍길동, 30
```

```text
('홍길동', 30)
```

> **보충** pickle 파일 안은 사람이 읽을 수 없는 bytes다. 파일 앞부분을 열어 보면 이렇다.

```python
with open("text/person.pickle", "rb") as fi:
    print(fi.read()[:40])
```

```text
b'\x80\x04\x95M\x00\x00\x00\x00\x00\x00\x00]\x94}\x94(\x8c\x06\xec\x9d\xb4\xeb\xa6\x84\x94\x8c\t\xed\x99\x8d\xea\xb8\xb8\xeb\x8f\x99\x94\x8c\x06\xeb'
```

> 그리고 pickle 파일을 `load()`하면 그 안에 담긴 코드가 실행될 수 있어서, **출처를 모르는 pickle 파일은 열면 안 된다.** 객체를 복원할 때 그 클래스(`Person`) 정의도 있어야 한다.

## 실습: 간단한 CLI 기반 메모장

1. 사용자에게 파일명을 입력받는다.
2. 파일에 저장할 문장을 입력받아 저장한다.
   - 한 줄씩 입력받는다.
   - `!q`를 입력하면 저장 후 종료한다.
3. 저장한 파일을 읽어서 출력한다.

```python
# 1. 저장할 파일명 사용자로부터 입력 받기 (input())
file_path = input("저장할 파일명 입력: ")
print("저장할 내용을 입력하세요. 다 입력하면 !q를 입력하세요.")
# 2. 1의 파일과 연결
with open(file_path, mode="wt", encoding="utf-8") as fw:
    # 3. 사용자로부터 저장할 문장을 입력받고 그것을 파일에 출력
    # 4. !q를 입력받을 때까지 3을 반복
    line_input = input(">>>")
    while line_input != "!q":
        fw.write(line_input + "\n")
        line_input = input(">>>")
```

```text
저장할 파일명 입력: text/memo.txt
저장할 내용을 입력하세요. 다 입력하면 !q를 입력하세요.
>>>안녕하세요.
>>>반갑습니다.
>>>또 봐요.
>>>!q
```

```python
with open(file_path, mode="rt", encoding="utf-8") as fr:
    txt = fr.read()

print(txt)
```

```text
안녕하세요.
반갑습니다.
또 봐요.
```

같은 코드를 `simple_memo.py`로도 저장해 두었다. 터미널에서 `python simple_memo.py`로 실행하면 된다.

## 정리

- IO 순서는 **열기 → 쓰기/읽기 → 닫기**. 닫기는 `with` 블록에 맡긴다.
- mode는 목적(`r`, `w`, `a`, `x`) + 종류(`t`, `b`). `w`는 기존 내용을 지우고, `x`는 파일이 있으면 에러다.
- 텍스트 파일은 쓸 때와 읽을 때 encoding을 같게 명시한다. 생략하면 OS마다 달라서 Windows에서 깨진다.
- 읽은 줄에는 `\n`이 붙어 있다. `print`하면 줄바꿈이 두 번 된다.
- b 모드는 bytes만 받는다. 객체를 그대로 저장·복원하려면 `pickle.dump()`, `pickle.load()`.
- 모르는 출처의 pickle 파일은 열지 않는다.
