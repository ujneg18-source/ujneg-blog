---
title: "Python 개요: 프로그램과 REPL 실행 방식"
description: "프로그램과 프로그래밍 언어의 의미를 살펴보고 Python의 특징, REPL과 Script 실행 방식을 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Python 기초'
seriesOrder: 1
originalNotebook: "01_개요.ipynb"
tags: ["Python","REPL","Programming"]
date: 2026-04-14
---

> SKN31 Python 과정 첫 노트북 `01_개요.ipynb`와 Jupyter 연습 파일 `test.ipynb`의 필기를 바탕으로 정리했습니다.
> 실행 예시는 Python 3.13에서 다시 실행한 결과이고, `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 프로그램, 로직, 프로그래밍 언어라는 용어
- 사람의 코드가 기계어가 되는 두 방식: Compile과 Interpret
- Python의 특징과 쓰임새
- 코드를 실행하는 두 방식: REPL과 Script
- 설치와 Jupyter Notebook 기본 조작

## 프로그래밍 개요

### 프로그램이란

> 컴퓨터에 특정 작업을 실행시키기 위한 처리 방법과 순서를 논리적으로 작성한 **명령문들의 집합**

### 관련 용어

| 용어 | 뜻 |
|---|---|
| 로직(Logic), 알고리즘(Algorithm) | 프로그램이 시작해서 목적한 결과를 낼 때까지 일의 순서, 논리적인 흐름 |
| 프로그래밍(Programming) | 로직을 코드로 작성하는 작업. 코딩이라고도 한다 |
| 프로그래밍 언어 | 프로그램을 작성할 때 쓰는 언어. 범용 언어(Python, Java, C)와 특수 목적 언어(R, SQL)가 있다 |
| Library, API | 자주 반복해 쓰는 코드를 미리 만들어 제공하는 것. Python에서는 **패키지**라고도 부른다 |

언어별 인기 순위는 [TIOBE Index](https://www.tiobe.com/tiobe-index/)에서 볼 수 있다.

### High Level Language와 Low Level Language

프로그램은 **사람이 이해하는 언어로 작성**하고, 실행하려면 **기계가 이해하는 언어로 변환**해야 한다.

- **High Level Language**: 사람이 이해하는 언어. 이 언어로 쓴 코드를 **Source code**라고 한다.
- **Low Level Language(기계어)**: 컴퓨터가 이해하는 언어. 0과 1(on/off)로 된 2진 데이터이고, 기계어로 변환된 코드를 **Binary code**라고 한다.

![기계어](/images/python/ch01_01.png)

### Compile 방식과 Interpret 방식

Source code를 기계어로 바꾸는 방식은 두 가지다. 언어마다 둘 중 하나를 쓴다.

| | Compiled 방식 | Interpreted 방식 |
|---|---|---|
| 변환 시점 | 실행 전에 **한 번에** 변환해 바이너리 파일을 만든다 | 실행하면서 **명령문 하나씩** 변환한다 |
| 변환 주체 | Compiler(컴파일러) | Interpreter(인터프리터)라는 실행환경 |
| 실행하는 것 | 변환된 바이너리 파일 | 소스 코드 |
| 장점 | 실행 속도가 빠르다 | **OS 독립적**이다. 프로그램을 하나만 만들면 된다 |
| 단점 | **OS 종속적**이다. OS별로 따로 만들어야 한다 | 실행 중에 변환하므로 **느리다** |

Python은 **Interpreted 방식**의 언어다. 대신 각 OS에 그 OS용 Interpreter가 설치돼 있어야 한다. 아래 그림처럼 Python 애플리케이션은 OS가 아니라 Python 실행환경 위에서 돈다.

![실행방식](/images/python/ch01_02.png)

> **보충 · Python도 내부적으로는 한 번 변환한다**
> 표준 구현인 CPython은 소스 코드를 먼저 **바이트코드**로 바꾼 뒤, 그 바이트코드를 Python Virtual Machine이 한 줄씩 실행한다. 그래서 "Python = 한 줄씩 해석"은 큰 그림으로는 맞고, 정확히는 "바이트코드로 컴파일 → VM이 해석"이다. `dis` 모듈로 바이트코드를 직접 볼 수 있다.

```python
import dis

dis.dis(compile("num3 = num1 + num2", "<string>", "exec"))
```

```text
  0           RESUME                   0

  1           LOAD_NAME                0 (num1)
              LOAD_NAME                1 (num2)
              BINARY_OP                0 (+)
              STORE_NAME               2 (num3)
              RETURN_CONST             0 (None)
```

`num3 = num1 + num2` 한 줄이 "값 두 개 불러오기 → 더하기 → 저장하기" 명령으로 바뀐 것을 볼 수 있다. 이 바이트코드는 기계어가 아니라 Python VM이 읽는 명령이라서 OS와 상관없이 같다.

## Python

- 1991년 네덜란드 프로그래머 **귀도 반 로섬(Guido van Rossum)** 이 만들었다.
- 평이한 영어처럼 읽히는 코드, 일상 업무에 바로 쓸 수 있고 개발 시간이 짧은 언어를 목표로 했다.
- **Python 3**은 2008년 12월 3일, 2.x와 하위 호환이 안 되는 버전으로 나왔다. Python 2는 2020년 1월 이후 지원이 끝났다.

### Python의 특징

- **가독성이 좋다.** "코드는 작성하는 것보다 읽는 경우가 더 많다"는 생각 아래, 일관된 코딩 스타일을 중시한다.
- **유지보수가 쉽다.** 배우기 쉽고 읽기 쉬우니 고치기도 쉽다.
- **OS 독립적이다.** Interpreted 언어라서 가능하다.
- **확장 구조가 유연하다.** C나 Java로 작성한 함수를 호출할 수 있다.
- **동적 타입(Dynamically typed)이다.** 변수의 타입이 고정되지 않아서, 한 변수에 다른 타입의 값을 넣을 수 있다.
- **라이브러리가 방대하다.** 표준 라이브러리가 강력하고, 여러 집단이 만든 3rd party 라이브러리 생태계가 잘 갖춰져 있다.

### Python으로 할 수 있는 것과 없는 것

| 할 수 있는 것 | 내용 |
|---|---|
| 업무 자동화 | 다른 프로그램이나 시스템을 제어하는 **스크립트**를 작성해 반복 작업을 자동화 |
| 범용 애플리케이션 | GUI 기반 독립형 애플리케이션 |
| 데이터 과학과 머신러닝 | numpy, pandas, scikit-learn 등. Python이 각광받는 가장 큰 이유 |
| 웹 애플리케이션, Open API | Django, Flask, FastAPI 같은 웹 프레임워크 |

| 하기 어려운 것 | 이유 |
|---|---|
| 시스템 프로그래밍 | 하드웨어 드라이버, 펌웨어 등은 C/C++로 한다 |
| 모바일 앱 | kivy 라이브러리로 가능은 하지만 활성화돼 있지 않다 |

## Python 코드 작성과 실행

### REPL 방식

- **Read-Eval-Print Loop**: 명령문 하나를 읽고(Read), 실행하고(Eval), 결과를 출력하고(Print), 다시 입력을 기다린다(Loop).
- 터미널에서 `python`을 실행하면 Python shell이 열린다. ipython shell을 써도 된다.
- 명령문의 처리 결과가 있으면 **`print()` 없이도** 출력해 준다.

```text
$ python
>>> num1 = 10
>>> num2 = 20
>>> num1 + num2
30
>>> print("안녕하세요")
안녕하세요
>>> 1 + 20 * 3
61
>>> exit()
```

### Script 방식

- 실행할 명령문을 텍스트 파일에 순서대로 적은 뒤 **한 번에** 실행한다.
- 이 파일을 **Python script 파일**이라 하고, 확장자는 관례적으로 `.py`를 쓴다.
- `python 파일명.py`로 실행한다. 보통 VS Code나 PyCharm 같은 IDE에서 작성한다.

> **보충 · REPL과 Script의 결과가 다른 경우**
> 위 REPL에 입력한 것과 같은 코드를 `hello.py`로 저장해서 실행해 봤다.
>
> ```python
> # hello.py
> num1 = 10
> num2 = 20
> num1 + num2
> print(num1 + num2)
> ```
>
> ```text
> $ python hello.py
> 30
> ```
>
> `30`이 **한 번만** 나온다. REPL은 식의 결과를 자동으로 보여 주지만, Script는 `print()`로 출력한 것만 보여 준다. 3번째 줄 `num1 + num2`는 계산만 하고 결과를 버린다.

| | REPL | Script |
|---|---|---|
| 실행 단위 | 명령문 하나 | 파일 전체 |
| 결과 출력 | 식의 값을 자동 출력 | `print()`한 것만 출력 |
| 어울리는 곳 | 문법이나 짧은 코드 확인 | 재사용하고 관리할 프로그램 |

### Jupyter Notebook

수업 실습은 대부분 Jupyter Notebook(`.ipynb`)으로 했다. 셀(cell) 단위로 실행하고 마지막 줄의 값을 바로 보여 주니, REPL을 파일로 저장할 수 있게 만든 것에 가깝다. `test.ipynb`에 단축키를 적어 두었다.

| 단축키 | 동작 |
|---|---|
| `Shift + Enter` | 실행하고 다음 셀로 이동 |
| `Ctrl + Enter` | 실행만 |
| `a` / `b` | 위 / 아래에 빈 셀 만들기 |
| `dd` | 셀 삭제 (`x`는 잘라내기) |
| `y` / `m` | 셀을 코드 / Markdown 모드로 바꾸기 |

셀은 **실행한 순서대로** 이어진다. 앞 셀에서 만든 변수를 뒤 셀에서 쓸 수 있다.

```python
num1 = 10
```

```python
num2 = 20
```

```python
num3 = num1 + num2
print(num3)
```

```text
30
```

```python
1 + 20 * 3
```

```text
61
```

Markdown 셀에는 필기를 적는다. `test.md`에 연습한 문법을 정리하면 이렇다.

| 쓰고 싶은 것 | 문법 |
|---|---|
| 제목 | `#` 대제목, `##` 중제목, `###` 소제목 |
| 줄바꿈 | 줄 끝에 공백 두 칸 |
| 목록 | `-` 또는 `*`, 순서 있는 목록은 `1.` (번호는 자동으로 매겨진다) |
| 기울임 / 굵게 / 둘 다 | `*기울임*`, `**굵게**`, `***둘 다***` |
| 링크 | `[내용](url)` |
| 이미지 | `![설명](경로 또는 url)` |

## Python 실행환경 설치

1. [python.org](https://www.python.org/)에서 설치 파일을 내려받는다.
2. 설치 화면에서 **Add python.exe to PATH**를 체크한다.
3. **Install Now**를 누른다.

<img src="/images/python/ch01_install1.png" width="500" alt="Python 설치 화면">

PATH에 추가해야 터미널 어디서든 `python` 명령이 먹힌다.

> **Windows PowerShell 보안 설정**
> PowerShell을 관리자 모드로 열고 아래 명령을 실행한 뒤 PowerShell을 다시 시작한다. 가상환경 활성화 스크립트처럼 로컬 스크립트를 실행하려면 필요하다.
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

## 정리

- 프로그램은 목적을 이루기 위한 명령문과 처리 순서의 집합이다.
- 사람의 코드를 기계어로 바꾸는 방식은 Compile(한 번에, 빠름, OS 종속)과 Interpret(실행하며, 느림, OS 독립)이 있고, Python은 Interpret 쪽이다. 내부적으로는 바이트코드를 거친다.
- Python의 강점은 가독성, 동적 타입, 방대한 라이브러리다.
- REPL은 식의 값을 바로 보여 주고, Script는 `print()`한 것만 보여 준다. Jupyter는 그 중간이다.
