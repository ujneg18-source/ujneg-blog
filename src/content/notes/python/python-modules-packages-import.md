---
title: "Module과 Package: import, pip, uv 사용법"
description: "Python 모듈과 패키지의 구조, import 방식과 pip·uv를 이용한 의존성 관리 방법을 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Python 기초'
seriesOrder: 7
originalNotebook: "07_패키지_모듈_import.ipynb"
tags: ["Python","Module","Package","pip","uv"]
date: 2026-04-20
---

> 이 글은 SKN31 학습 과정에서 작성한 Jupyter Notebook을 바탕으로 정리했습니다.
> 당시 작성한 Markdown 필기와 코드 주석은 보존하고, 글의 흐름을 위해 도입·보충 설명·학습 정리를 덧붙였습니다.
> 원본 노트북: `07_패키지_모듈_import.ipynb`

## 이 글에서 확인할 내용



- 함수와 클래스를 Module 단위로 분리하는 이유를 이해한다.

- 여러 형태의 import와 Namespace 사용법을 비교한다.

- Script 실행 시 모듈 검색 경로가 어떻게 결정되는지 확인한다.

- `pip`와 `uv`로 외부 패키지와 프로젝트 의존성을 관리한다.



## 필기를 다시 읽으며 잡은 핵심



코드가 길어지면 한 파일에 모든 함수와 클래스를 두기보다 역할에 따라 Module과 Package로 나눠야 한다. 이 노트에서는 직접 만든 모듈을 불러오고 별칭을 지정하면서, import가 단순 복사가 아니라 별도의 Namespace를 통해 정의를 재사용하는 과정임을 확인했다.

Notebook 환경과 `python script.py` 실행은 현재 작업 경로와 모듈 검색 경로가 달라질 수 있다. 파일 경로 기반 실행 예제를 통해 “파일이 있는데 왜 import되지 않는가”라는 문제를 경로 관점에서 이해했다.

마지막에는 `pip`의 설치·삭제·목록·동결 명령과 `uv`의 프로젝트 및 의존성 관리 흐름을 함께 정리했다. 패키지를 설치하는 것뿐 아니라 같은 환경을 다시 만들 수 있도록 의존성 정보를 남기는 것이 목적이다.

---

## 모듈(Module)

- 독립적인 기능을 가지고 재사용 가능한 프로그램 단위를 모듈이라고 한다.
- **파이썬에서 모듈**은 재사용 가능한 변수, 함수, 클래스들을 작성한 소스 파일을 말한다.
    - 함수나 클래스를 작성한 파이썬 파일 (`.py` 파일)이 모듈이 된다.
- 모듈파일에 작성된 함수나 클래스들을 다른 python 프로그램에서 호출 하여 사용할 수 있다.
    - 단 사용하기 위해서는 `import` 를 먼저 해야 한다.
- 이런 모듈들을 모아 놓으면 라이브러리가 된다.
- **모듈의 종류**
    - 표준 모듈
        - 파이썬에 내장된 모듈
    - 사용자 정의 모듈
        - 개발자가 재사용을 위해 직접 만든 모듈 
    - 3rd Party 모듈
        - 특정 개발업체나 개발자들이 만들어 배포하는 모듈
        - 사용자 정의 모듈도 배포되어 다른 곳에서 사용되면 3rd party 모듈이 된다.
     
> ## 파이썬 파일
> - script 파일: 파이썬 실행 파일. 처리할 것을 실행 순서대로 작성한 파이썬 파일.
> - module파일: 파이썬 라이브러리로 재사용가능한 함수, 클래스들을 작성한 파이썬 파일.

## 패키지 (Package)
- 모듈(들)을 저장한 디렉토리를 패키지라고 한다.
    - 그래서 파이썬에서는 **라이브러리를 패키지라고 한다.** (재사용가능한 모듈들을 모아 놓은 것이 패키지이므로)
- 물리적으로는 모듈 파일(.py)들을 모아놓은 디렉토리(폴더)가 패키지이다.  
- python 3.3 이전 버전은 package 디렉토리에 **\_\_init\_\_.py** 파일을 그 디렉토리에 반드시 위치시켜야 한다.
    - 3.3 이후에는 위치시킬 필요는 없지만 package안의 모듈들의 import 관련 설정을 해야 하는 경우에는 `__init__.py`에 작성하고 위치시킨다.
- **Root Package**
    - 라이브러리를 구성하는 전체 모듈들을 담고 있는 최상위 패키지(디렉토리)
    - 패키지 내의 속한 패키지를 통칭 **sub package** 라고 한다.
    - Root package를 제외한 모든 package들은 다 sub package가 된다.

````python
__version__ = 0.1  #변수

def plus(num1, num2):
    return num1 + num2

def minus(num1, num2):
    return num1 - num2

def multiply(num1, num2):
    return num1 * num2

def divide(num1, num2):
    return num1 / num2
````

````python
result = minus(10, 5)
print(result)
````

## import

### 함수, 클래스 정의란
1. 함수, 클래스를 구현한다.
2. 구현된 함수, 클래스를 파이썬 실행환경에 등록한다.
    - 등록하는 것은 메모리에 올리는(loading) 작업이다.
    - 메모리에 올리기 위해서는 구현된 것을 실행시켜서 파이썬 실행환경이 읽도록 해야 한다.
- 파이썬 실행환경에 등록된 함수와 클래스만 호출해서 사용할 수 있다.

### import 란
- 파이썬 모듈 파일에 정의된 변수, 함수, 클래스들을 사용하기 위해 **파이썬 실행환경에 등록하는 작업**을 말한다.
- 현재 프로그램 모듈의 것들이 아니라 **다른 모듈에 있는 것들은 사용하기 위해 import 작업을 먼저 해야 한다.**
- 모듈을 import 하면 모듈의 내용이 실행되면서 그 안에 정의된 변수, 함수, 클래스들이 파이썬 실행환경 등록된다.
    - import 된 변수, 함수, 클래스들은 모듈별로 namespace를 만들어 각각 등록된다.
        - 현재 실행중인 module(main module) 에 정의된 함수, 클래스, 변수들이 저장되는 namespace와 import 되어 등록된 것들이 저장되는 namespace를 나누어 등록한다.


> - **namespace**
>    - 여러개의 객체(존재하는 무언가)를 하나로 묶어 주면서 구분자 역할을 하는 이름을 주는 것을 namespace라고 한다.
>    - namespace를 이용해 각 그룹들의 객체들을 구분할 수 있다. 그래서 같은 이름의 객체들을 사용할 수 있다.
>    - 파이썬에서는 모듈에 정의된 변수, 함수, 클래스 들을 실행환경에 등록할 때 모듈명을 namespace로 묶어서 등록한다.
>    - [위키백과 참고](https://ko.wikipedia.org/wiki/%EC%9D%B4%EB%A6%84%EA%B3%B5%EA%B0%84)

### import 구문
- 기본구문
    - `[from 사용할 것의 경로] import 사용할 것 [as 별칭] [, 사용할 것 [as 별칭], ...]`
        - \[ \] : 생략 가능한 구문
    - 사용할 것
        - 모듈
        - 모듈안에 정의된 변수, 함수, 클래스

<b style='font-size:1.2em'> 1. 모듈 import</b>
```python
import 모듈   # 하나의 모듈 import.
import 모듈 as 별칭 # namespace의 이름을 모듈명이 아니라 별칭으로 지정한다.
import 모듈_1, 모듈_2 # 여러개 모듈 import.','를 구분자로 나열한다.
```
- 모듈을 import 하고 그 안에 함수, 클래스들을 사용할 때는 **모듈명이 namespace 의 이름이** 되므로 `모듈명.함수()`, `모듈명.Class` 구문으로 호출한다.
    - namespace의 이름은 **import 뒤에 지정한 이름으로 설정된다.**
- 별칭(Alias)를 주면 namespace의 이름으로 지정한 별칭을 사용한다.
- **예**
```python
import test_module
import my_module as mm
## test_module의 hello() 함수 호출시
test_module.hello()
## my_module은 mm 별칭을 지정했으므로 mm을 namespace로 사용한다.
p = mm.Person('홍길동', 30) # my_module의 Person 클래스 객체 생성
```

<b style='font-size:1.2em'>2. 모듈내의 특정 항목만 import</b>

```python 
from 모듈 import 함수  # 함수/클래스가 있는 모듈과 함수를 분리해서 import한다.
from 모듈 import 클래스
from 모듈 import 함수_1, 함수_2, 클래스
from 모듈 import *   
```
- 모듈에 정의된 **일부 함수나 클래스만 사용할 경우** 개별적으로 import 할 수있다.
- `from 모듈 import 함수` 구문으로 import 하면 import한 **함수나 클래스들이 현재 실행중인 모듈의 namespace로 들어간다. 그래서 모듈명없이 바로 호출 할 수 있다.**
- `*`를 이용하면 그 모듈의 모든 함수/클래스들을 현재 실행중인 namespace에 추가해 사용할 수 있게 해준다. 이 방식은 **이름 충돌의 가능성이 있기때문에 추천되지 않는다.**

<b style='font-size:1.2em'>3. 패키지에 속한 모듈 import</b>


```python
import 패키지명.모듈
from 패키지명 import 모듈
from 패키지명 import 모듈_1, 모듈_2
from 패키지명.모듈 import 함수
from 패키지명.모듈 import 클래스
from 패키지명.모듈 import 함수_1, 함수_2, 클래스
from Root패키지.Sub패키지1.Sub패키지2 import 모듈        # 패키지가 계층구조로 되있을 경우 `.` 으로 이용해 나열한다.
from Root패키지.Sub패키지1.Sub패키지2.모듈 import 함수
from Root패키지.Sub패키지1.Sub패키지2.모듈 import 클래스
```

- 패키지에 속한 모듈을 import 할 때는 **from 절에 패키지를 import 절에 모듈을** 설정한다.
- **import 가능한 것은 모듈, 변수, 함수, 클래스 들이다.**  <b style='color:red'>패키지는 import 할수 없다.</b>
    - **모듈 안의 변수, 함수, 클래스들을 import 할 때는 `from 모듈 import 함수, 변수, 클래스` 구문을 사용해야 한다.**

````python
import calc

calc.minus(20, 10)
````

### import 된 모듈 찾는 경로 및 PYTHONPATH

- `import 모듈` 구문을 사용하면 파이썬 실행 환경은 모듈을 다음 경로에서 찾는다.
    1. 현재 실행중인 모듈(import 구문을 사용한 모듈)이 있는 경로
    2. 파이썬 실행환경에 등록된 경로
- 모듈을 찾는 순서는 다음에서 확인할 수 있다.

    ```python
    import sys      # 표준모듈 sys
    print(sys.path) # 모듈을 찾는 경로를 저장한 list
    ```
- 위의 경로 이외에 파이썬 모듈이 있을 경우 PYTHONPATH 환경변수에 그 디렉토리 경로를 등록한다.
    1. sys.path 에 추가한다. (사용할 때 마다 추가해야 한다.)
    2. 운영체제 환경변수에 등록한다. (한번만 하면된다.)

````python
import sys
sys.path # 리스트 - PYATHONPATH
````

````python
sys.path.append(r'c:\temp\lib')
sys.path
````

````python
from new_package import new_module
````

````python
new_module.test_func()
````

## 메인 모듈(Main Module)과 하위 모듈(Sub Module)

- **메인 모듈**
    - 현재 실행하고 있는 모듈
        - `python 모듈.py` 로 실행된 모듈을 말한다.
    - application 의 main logic을 처리한다.
- **하위 모듈 (Sub module)**
    - 메인 모듈에서 import 되어 실행되는 모듈
    - 모듈을 import하면 그 모듈을 실행 시킨다. 이때 모듈에 있는 실행코드들도 같이 실행된다. 이것을 방지 하기 위해 모듈이 메인 모듈로 실행되는지 하위 모듈로 실행되는지 확인이 필요하다.
- <b>`__name__`</b> 내장 전역변수
    - 실행 중인 모듈명을 저장하는 내장 전역변수
    - **메인 모듈은 '\_\_main\_\_'** 을 **하위 모듈은 모듈명(파일명)** 이 저장된다.
    - 모듈이 메인 모듈로 시작하는지 여부 확인 할 때 사용한다.
    
```python
if __name__ == '__main__':
    # 메인모듈일 때만 실행할 코드 블록
```

### Python 실행 방식의 차이: 파일 실행 vs 모듈 실행

Python 프로그램은 **파일 경로 기반** 실행과 **모듈 실행** 두가지 방식으로 실행 할 수 있다.

#### 파일 경로 기반 실행 (`python script.py`)
- 구문: `python 파이썬스크립트 경로`
  
    ```bash
    python script.py
    python src/test/app.py
    ```

- 파일 경로는 **상대 경로 / 절대 경로 모두 가능**하다.
- 특징
  - Python은 이 파일이 있는 디렉토리를 **import 기준 경로**로 사용한다. 위 예에서는 `src/test`가 import 기준 경로(최상위 디렉토리)가 된다.
  - 이 때문에 **프로젝트 구조가 깨질 수 있다** 즉 `app.py`에서 상위 디렉토리에 있는 모듈 import 하는 구문이 있을 경우 에러가 발생한다.

- **문제가 생기는 예**

    ```text
        project/
        ├─ src/
        │   ├─ common/
        │   │   └─ utils.py
        │   └─ test/
        │       └─ app.py
    ```

    - 위 프로젝트 구조에서 다음과 같이 실행한 경우

        ```bash
        python src/test/app.py
        ```
- `src/test` 를 **import 기준 최상위 디렉토리**로 인식 한다.
- `app.py` 에서 다음과 같은 import가 실패한다.

    ```python
    from src.common import utils  # ImportError
    ```

#### 모듈 기반 실행 (`python -m`)
- 구문: `python -m 패키지이름.모듈이름`

```bash
python -m app
python -m src.test.app
```

- **파일이 아니라 "모듈 경로"를 기준으로 실행**한다.
  - Python이 `sys.path`를 기준으로 모듈을 **탐색한 뒤 실행** 한다.
- 동작 방식
  - `sys.path`에서 `src.test.app` 이라는 모듈을 찾고 해당 모듈을 **프로젝트 구조 그대로 유지한 채 실행**
  - 프로젝트 구조에서 실행한 경우 현재 디렉토리를 기준으로 `src.test.app`을 찾아서 실행한다.

- 프로젝트 루트 디렉토리가 **import 기준 경로**가 된다
- 패키지 구조가 유지된다
- 상대 import / 절대 import가 안정적으로 동작한다
- 예

    ```text
        project/
        ├─ src/
        │   ├─ common/
        │   │   └─ utils.py
        │   └─ test/
        │       └─ app.py
    ```
    
    - 위 프로젝트 구조에서 다음과 같이 실행한 경우

      ```bash
      python src/test/app.py
      ```

  위 명령어를 실행한 디렉토리(`project`)를 **import 기준 최상위 디렉토리**로 인식한다.
  그래서 app.py의 다음 import 구문이 정상적으로 실행된다.
  
  ```python
  from src.common import utils  # 정상 동작
  ```

## 3rd party library 설치

- 기능을 모아 놓은 것이 **모듈(module)** 이고 모듈을 모아 놓은 것이 **패키지** 이고 그런 패키지들을 모아서 놓은 것이 **Library** 이다.
- **Library** 는 범용적으로 사용할 수있는 기능들을 구현해서 배포한 것을 말한다. 파이썬에서는 라이브러리를 패키지라고도 한다.
- Library는 누구든 만들어서 배포(제공)할 수있다.
    - **1st party library:** 파이썬 실행 환경 설치시 내장되어 있는 library
    - **2nd party library:** Application을 만들면서 필요에 따가 정의한 library (내가 만든 라이브러리)
    - **3rd party library:** 개인이나 회사 또는 단체에서 만들어 배포한 library.
- Python은 3rd party library 생태계가 잘 이루어져 있다.
    - 파이썬은 라이브러리 저장소(repository)를 이용해 라이브러리 작성자들과 사용자들을 연결해 배포와 사용을 쉽게 할 수 있도록 한다.
    - **PyPI:** 파이썬 공식 라이브러리 저장소
        - https://pypi.org/ : 라이브러리 검색 사이트
        - pip tool을 이용해 라이브러리를 관리한다.
    - **Conda Repository:** Anaconda 에서 제공하는 라이브러리 저장소
        - https://anaconda.org/anaconda/repo : 패키지 검색 사이트
        - conda tool 을 이용해 라이브러리를 관리한다.

### Python 패키지 관리자
- **Python 생태계의 다양한 라이브러리(패키지)들을 설치, 업그레이드, 제거등을 쉽게 관리 할 수 있도록 도와 주는 도구**
- **종류**
  - **pip**
    - python 표준 패키지 관리자.
    - PyPI에 등록된 패키지들을 관리한다.
  - **uv**
    - Astral에서 만든 Python 패키지 관리자로 Rust 언어로 구현되어 속도가 매우 빠르다.
    - 패키지 관리, 가상환경관리, 프로젝트 관리 기능을 제공한다.
    - 패키지 관리에서는 pip 명령어를 이용할 수있어 기존 파이썬 사용자들이 쉽게 적응할 수 있다.
  - **conda**
    - Anaconda에서 제공하는 패키지관리자
    - Anaconda에서 관리하는 자체 저장소에 저장된 패키지들을 관리한다.
    - 패키지 관리 뿐아니라 가상환경 관리(생성/삭제등)의 기능도 내장되어있다.
  

#### `pip` 를 이용한 패키지 관리 주요 명령어
- `pip` 은 python 실행환경에 포함되어 있어 추가 설치가 필요 없다.

> #### windows에서 보안설정
> 보안 문제로 안된다고 에러나는 경우
> `windows 보안 > 앱 및 브라우저 컨트롤 > 스마트 앱 컨트롤 > 스마트 앱 컨트롤 : 켬 -> 끄기`

##### 주요 명령어
- `pip --help`
- `pip install 라이브러리[==version]` 
    - Library를 설치한다.
    - version을 지정하면 그 버전으로 지정하지 않으면 최신버전을 설치한다.
    - upgrade나 downgrade는 진행하지 않는다. (이미 설치 된 library가 있으면 다시 설치 하지 않는다.)
    - 관리자 권한일 경우 설치되는 library가 있다. 이 경우 **--user** 옵션을 지정한다.
- `pip install --upgrade 라이브러리[==version]`, \-U \-\-upgrade
    - Library를 upgrade 또는 downgrade한다.
    - Library가 없으면 설치한다.
    - 이미 설치된 Library가 지정한 version과 다르면 다시 설치한다. (version을 생략하면 최신버전)
- `pip install --requirement 파일경로`,  \-r, \-\-requirement
    - 파일경로의 text 파일에 설치할 library이름과 버전을 작성한다. 그리고 작성된 library들을 한번에 설치한다.
- `pip freeze > 파일명.txt`
    - 현재 설치된 library들을 \-\-requirement로 설치할 수 있도록 text 파일에 작성해 준다. 관례적으로 파일명은 **requirements.txt** 로 한다.
- `pip uninstall 패키지명`
    - Library를 local 컴퓨터에서 삭제한다.
- `pip list`: 설치된 모든 library 목록을 출력한다.
  - `pip list --format=freeze` freeze 형식으로 출력한다. `requirements.txt` 파일 생성할 때 이 명령어를 사용하는 것이 좋다.
- `pip show 패키지명`
    - 지정한 패키지(library)의 정보를 출력한다.


#### `uv`를 이용한 패키지 관리 주요 명령어
- https://github.com/astral-sh/uv
  
##### 설치
- **Windows**
  - `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
  - 설치 후 터미널 restart
- **MacOS/Linux**
  - `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - 또는 Mac에서는 `brew install uv` 로도 설치 가능하다.
- **업그레이드**
  - `uv self update`
##### 주요 명령어
- 가상환경 관리
  - **가상환경 생성**
    - `uv venv [가상환경경로] [--python=python버전]`
      - 가상환경 경로 생략하면 `.venv` 디렉토리에 생성한다.
      - 파이썬 버전을 생략하면 설치된 파이썬 버전으로 가상환경을 구성한다.
  - 가상환경 활성화
    - 가상환경 경로아래 `activate` 를 실행한다. 
    - Windows
      - `가상환경경로\Scripts\activate`
    - Mac/Linux
      - `source 가상환경경로/bin/activate`
- **패키지 관리**
  - uv 다음에 pip 명령어를 실행한다.
  - `uv pip install 패키지명`
  - `uv pip uninstall 패키지명`
  - `uv pip list`

````python
import pandas
````

---

## 학습 정리



- Module은 Python 코드 파일이고 Package는 관련 Module을 묶는 구조다.

- import 방식에 따라 현재 Namespace에서 사용하는 이름이 달라진다.

- 모듈 탐색 문제는 현재 작업 경로와 `sys.path`를 함께 확인해야 한다.

- 의존성 관리는 설치 명령보다 재현 가능한 프로젝트 환경을 만드는 데 의미가 있다.
