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

> 이 글은 SKN31 학습 과정에서 작성한 Jupyter Notebook을 바탕으로 정리했습니다.
> 당시 작성한 Markdown 필기와 코드 주석은 보존하고, 글의 흐름을 위해 도입·보충 설명·학습 정리를 덧붙였습니다.
> 원본 노트북: `09_입출력.ipynb`

## 이 글에서 확인할 내용



- 절대 경로와 상대 경로, 현재 작업 디렉터리의 관계를 이해한다.

- 파일 모드와 Encoding을 지정해 텍스트 파일을 읽고 쓴다.

- `with` 문으로 파일 자원을 안전하게 닫는다.

- Text와 bytes를 구분하고 객체 직렬화의 목적을 이해한다.



## 필기를 다시 읽으며 잡은 핵심



파일 입출력은 코드보다 실행 위치와 경로를 이해하는 것이 먼저였다. Windows와 Linux/macOS의 절대 경로 표기, 현재 디렉터리를 기준으로 한 상대 경로, `.`과 `..`의 의미를 주석으로 정리하고 실제 작업 디렉터리를 조회했다.

쓰기·추가·읽기 모드를 각각 실행하고 `read`, `readlines`, 한 줄씩 읽기, 반복문을 이용한 읽기를 비교했다. 직접 `close()`하는 방식 뒤에 `with` 문을 사용해, 예외가 발생하더라도 파일 연결이 정리되는 구조를 확인했다.

후반에는 Text mode와 Binary mode의 입출력 타입 차이를 확인하고 정수를 bytes로 변환했다. 객체 직렬화에서는 Python 객체를 파일에 저장하고 복원하는 흐름을 실습했다. 단, `pickle`은 신뢰할 수 없는 파일을 역직렬화하면 임의 코드 실행 위험이 있으므로 외부 입력에는 사용하지 않아야 한다.

---

## 입출력 (IO)

### 입출력이란
- 프로그램이 사용하려는 외부 자원을 연결하여 데이터를 입력 받거나 출력하는 작업을 IO라고 한다.
- **외부 자원**
    - 파일, 원격지 컴퓨터(Network으로 연결된 컴퓨터의 자원), 데이터베이스 등 프로그램이 사용하는 외부 데이터를 말한다.
- **Stream**
    - 입출력 시 **데이터의 흐름을 stream** 이라고 한다.
  - **InputStream** 
      - Program이 외부로 부터 데이터를 읽어 들이는 흐름.
  - **OutputStream** 
      - Program이 외부로 데이터를 써주는 흐름.


![io](/images/python/ch09_01.png)

### IO 코딩 순서
![순서](/images/python/ch09_02.png)

#### 파일 열기(연결)
- open() 함수 사용
    - 연결된 파일과 입출력 메소드를 제공하는 객체(Stream)를 리턴
- 구문
    - `open(file, mode='r', encoding=None)`
    - 함수 주요 매개변수
        - file : 연결할 파일 경로
        - encoding 
            - 입출력 대상이 **텍스트 파일일 경우** 인코딩 방식 설정
            - 생략하면  **os 기본 encoding방식을 따른다.**
                - Windows: cp949/euckr
                - Linux, Unix: utf-8
        - mode : 열기 모드
            - mode는 목적, 데이터종류를 조합한 문자열을 사용한다.

            |mode타입|mode문자|설명|
            |:-|-|-|
            |목적|r|읽기 모드-목적의 기본 모드|
            ||w|새로 쓰기 모드|
            ||a|이어 쓰기 모드|
            ||x|새로 쓰기모드-연결하려는 파일이 있으면 Exception발생|
            |데이터종류|b|binary 모드|
            ||t|Text모드-text데이터 입출력시 사용|

#### 출력 메소드

- write(출력할 Data)
    - 연결된 파일에 `출력할 Data` 출력한다.
- writelines(문자열을 가진 컬렉션)
    - 리스트, 튜플, 집합이 원소로 가진 문자열들을 한번에 출력한다.
    - text 출력일 경우에만 사용가능.
    - 원소에 문자열 이외의 타입의 값이 있을 경우 TypeError 발생

````python
# 파일경로 -> 디렉토리경로/파일경로
#   - 절대경로: root directory부터 경로를 설정.
#        - win: "c:\a\b\c.txt"
#        - linux/macos: "/a/b/c.txt"
#   - 상대경로: 현재 working direcotry에서부터 시작하는 경로로 설정.
#        - Root 경로(디렉토리)로 시작하지 않으면 상대경로임.
#        - `.` : 현재 디렉토리
#        - `..` : 상위 디렉토리
````

````python
# 현재 working directory 조회
import os
wd = os.getcwd()
print(wd, type(wd))
````

````python
os.makedirs(r"c:\a\b\c\e") # 절대경로
````

````python
os.makedirs(r"a\b\c\e") # 상대경로
````

````python
import os # 내장모듈. os 명령어를 파이썬함수로 제공하는 모듈.
# 0. 파일을 저장할 디렉토리 생성
os.makedirs("text", exist_ok=True)  
# text 디렉토리생성.
# exist_ok=True 없으면 만들고 있으면 만들지 안는다.
#  default: False - 있으면 Exception발생
````

````python
# os.rmdir("text")
````

````python
# 1. 파일 연결. 
# fw = open("text/a.txt", mode="wt", encoding="utf-8")
# fw = open("text/a.txt", mode="at", encoding="utf-8")
try:
    fw = open("text/a.txt", mode="xt", encoding="utf-8")
    # fw: 연결된 파일에 텍스트(t)를 출력(w) 하는 메소드를 제공하는 객체를 반환.
    # 2. 쓰기(w), 읽기(r)
    fw.write("안녕하세요.\n") # write(str:"t")
    fw.write("반갑습니다.")

    str_list = ["\n\n\n", "aaaaaa", "bbbbbb", "cccccc"]
    fw.writelines(str_list) # writelines(list[str]) list안에 str들을 한번에 출력
    # 3. 연결 닫기(끊기)
    fw.close()

except:
    pass
````

````python
fw2 = open(r"c:\temp\new_txt.txt", 'wt', encoding='utf-8') # 텍스트 쓰기모드 연결
fw2.write("AAAAA\nBBBBB\nCCCCC\n")
fw2.write("안녕하세요.")
fw2.close()
````

#### 입력 메소드
- read() : 문자열(text mode), bytes(binary mode) 
    - 연결된 파일의 내용을 한번에 모두 읽어 들인다.
- readline() : 문자열(text mode), bytes(binary mode)
    - 한 줄만 읽는다.
    - text 입력일 경우만 사용가능
    - 읽은 라인이 없으면 **빈문자열**을 리턴한다.
- readlines() : 리스트
    - 한번에 다 읽은 뒤 각각의 라인을 리스트에 원소로 담아 반환한다.
- Text Input Stream (TextIOWrapper, BufferedReader)은 Iterable 타입.
    - for문을 이용한 라인단위 순차 조회할 수 있다.

````python
# 1. 파일 연결
fr = open("text/a.txt", "rt", encoding="utf-8")

# 2. 읽기 (input: r모드)
txt = fr.read() # 한번에 다 읽는다. 

# 3. 연결 끊기
fr.close()
````

````python
print(type(txt))
print(txt)
````

````python
####################################
# 라인 별로 나눠서 읽기 - list로 반환
####################################
fr = open("text/a.txt", mode="rt")   #, encoding="utf-8") # encoding생략-os의 기본인코딩방식
txt_list = fr.readlines() # 라인단위로 잘라서 list로 반환.
print(txt_list)
fr.close()
````

````python
#################################
# 한줄 씩 읽기
#################################
fr = open("text/a.txt", mode="rt", encoding="utf-8")
print(fr.readline()) # 한줄만 읽기 
print(fr.readline()) # 한줄만 읽기 
print(fr.readline()) # 한줄만 읽기 
print(fr.readline()) # 한줄만 읽기 
print(fr.readline()) # 한줄만 읽기 
print('-------')
print(fr.readline()) # 더이상 읽을 것이 없으면 빈문자열을 반환.
print('-------')
fr.close()
````

````python
################################
# for in 을 이용해 한줄 씩 읽기
################################
fr = open("text/a.txt", mode="rt", encoding="utf-8")
print(type(fr))
for linenum, s in enumerate(fr, start=1):
    print(f"{linenum}. {s}", end="")
    
fr.close()
````

### with block

파일과 입출력 작업이 다 끝나면 반드시 연결을 닫아야 한다. 매번 연결을 닫는 작업을 하는 것이 번거롭고 실수로 안 닫을 경우 문제가 생길 수 있다. **with block은 block을 벗어나면 자동으로 연결을 닫아 준다.** 그래서 연결을 닫는 코드를 생략할 수 있다.

- 구문
```python
with open() as 변수: # `변수`는 open()이 반환하는 Stream객체를 참조한다.
    입출력 작업      # 변수를 이용해 입출력 작업을 처리한다.
## with block을 빠져 나오면 close()가 자동으로 실행된다.
```

````python
fr = open("text/a.txt", mode="rt", encoding="utf-8")
print("연결여부확인:", fr.closed)
fr.close()
print("close()후 연결여부확인:", fr.closed)
````

````python
with open("text/a.txt", mode="rt", encoding="utf-8") as fr:
    for linenum, s in enumerate(fr, start=1):
        print(f"{linenum}. {s}")
        print("--------------")
    
    print(fr.closed)
    
print(fr.closed)
````

````python
b_fr = open("text/b.txt", "wt", encoding="utf-8")
````

````python
b_fr.close()
````

````python
with open("text/b.txt", "wt", encoding="utf-8") as fw:
    fw.write("a\n")  # write(str)
    fw.write("b\n")
    fw.write("가\n")
    fw.write("나\n")
    print(fw.closed)

print(fw.closed)
````

````python
# "rt", "wt" : t모드 -> 입출력 타입: str  read(): str, write("str")
# 'rb', 'wb' : b모드 -> 입출력 타입: bytes  read(): bytes, write(bytes)
````

## Binary Data 입출력

### `bytes` type
binary 데이터를 입출력하기 위한 타입.  
파이썬의 하나의 출력함수로 다양한 데이터타입의 값을 출력하기 위해 **bytes 타입으로 변환** 해야 한다. 
또 binary 데이터를 읽을 경우 **bytes 타입**으로 반환한다. 이것을 저장 전 원래 타입으로 쓰기 위해서는 bytes에서 원래 타입으로 변환하는 작업이 필요하다. 

![img](/images/python/ch10_03.png)

### pickle 모듈을 이용한 객체 직렬화
- pickle 모듈: binary data 입출력을 도와주는 표준 라이브러리.

#### 객체 직렬화(Object Serialization)
- 객체의 속성값들을 bytes로 변환해 출력하는 것을 객체 직렬화(Object Serialization) 이라고 한다.
- bytes로 출력된 데이터를 읽어 객체화 하는 것을 객체 역직렬화(Object Deserialization) 이라고 한다.

#### pickle 모듈
- binary 모드로 출력하거나 입력받을 경우 **bytes**  타입으로 입출력을 진행한다.
    - 그런데 각각의 타입이 변환하는 방식이 다르기때문에 입출력 코드가 복잡해 지는 문제가 있다. 이것을 추상화해서 binary 데이터 입출력을 쉽게 처리할 수 있게하는 표준모듈이 pickle이다.
    - 파이썬의 모든 값은 객체 이므로 pickle은 객체 직렬화, 역직렬화를 위한 파이썬 표준모듈이다.

- 저장시 파일 확장자는 보통 `pkl` 이나 `pickle` 로 한다.
- ex)
```python
##### binary mode로 설정한다.
fw = open("data.pkl", "wb") # 객체를 pickle에 저장하기 위한 output stream 생성
fr = open("data.pkl", "rb") # 파일에 저장된 객체를 읽어오기 위한 input stream 생성
```
- **메소드**
    - dump(저장할 객체, fw) : 출력
    - load(fr): 입력 - 읽은 객체를 반환한다.

````python
# f = open("text/int_data.pickle", "wb")
# print(type(f))
# int -> bytes
# f.write("aaaa")
````

````python
import pickle

i = 1000000 # int

with open("text/int_data.pickle", "wb") as fo:
    pickle.dump(i, fo)
    # 1. i -> bytes로 변환, 2. fo를 이용해서 출력
````

````python
with open("text/int_data.pickle", "rb") as fi:
    load_i = pickle.load(fi)

print(type(load_i), load_i+100)
# data: bytes = fi.read()
# int_result = data를 int로 변환
````

````python
person_info = [{
    "이름":"홍길동",
    "나이":20,
    "주소":"서울",
    "혈액형": "A형"
}]
with open("text/person.pickle", "wb") as fo:
    pickle.dump(person_info, fo)
````

````python
with open("text/person.pickle", "rb") as fi:
    new_person_info = pickle.load(fi)

print(type(new_person_info))
new_person_info
````

````python
class Person:

    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __str__(self):
        return f"{self.name}, {self.age}"
````

````python
p1 = Person("홍길동", 30)

with open("text/p.pickle", 'wb') as fo:
    pickle.dump(p1, fo)
````

````python
with open("text/p.pickle", "rb") as fi:
    load_p = pickle.load(fi)
````

````python
print(load_p)
load_p.name, load_p.age,
````

## TODO

- ## 간단한 CLI 기반 메모장
    1. 사용자로부터 파일명을 입력받는다.
    2. 사용자로부터 파일에 저장할 문장을 입력받아서 파일에 저장한다.
        - 한줄씩 입력받는다.
        - 사용자가 !q 를 입력하면 저장후 종료한다.
    3. 사용자가 저장한 파일을 읽어서 출력한다.

````python
# 1. 저장할 파일명 사용자로부터 입력 받기 (input())
file_path = input("저장할 파일명 입력: ")
print("저장할 내용을 입력하세요. 다 입력하면 !q를 입력하세요.")
# 2. 1의 파일과 연결
with open(file_path, mode="wt", encoding="utf-8") as fw:
    # 3. 사용자로부터 저장할 문장을 입력받고 그것을 파일에 출력
    # 4. !q를 입력받을때까지 3을 반복
    line_input = input(">>>")
    while line_input != "!q":
        fw.write(line_input+"\n")
        line_input = input(">>>")
````

````python
with open(file_path, mode="rt", encoding="utf-8") as fr:
    txt = fr.read()

print(txt)
````

---

## 학습 정리



- 상대 경로는 현재 작업 디렉터리를 기준으로 해석된다.

- 텍스트 파일은 Encoding을 명시하고, 파일 자원은 `with` 문으로 관리한다.

- Text mode는 `str`, Binary mode는 `bytes`를 읽고 쓴다.

- 직렬화 형식은 편의성뿐 아니라 호환성과 보안까지 고려해 선택한다.
