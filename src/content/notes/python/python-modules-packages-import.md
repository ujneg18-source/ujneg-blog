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

> SKN31 Python 과정 노트북 `07_패키지_모듈_import.ipynb`와 실습 파일(`calc.py`, `run.py`, `run2.py`, `run3.py`, `my_package/`, `src/`)을 바탕으로 정리했습니다.
> 스크립트 실행 결과는 실습 폴더 구조 그대로 Python 3.13에서 다시 실행한 것입니다. `sys.path` 출력은 수업 PC(Windows, Python 3.14)의 노트북 출력을 그대로 실었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 모듈과 패키지
- `import` 구문 세 가지 형태와 namespace
- 모듈을 찾는 경로 `sys.path`
- 메인 모듈과 `__name__`
- `python 파일.py`와 `python -m 모듈`의 차이
- pip, uv로 3rd party 라이브러리 설치

## 모듈 (Module)

독립적인 기능을 가진, **재사용 가능한 프로그램 단위**다.

- Python에서 모듈은 재사용할 변수, 함수, 클래스를 작성한 **`.py` 파일**이다.
- 다른 Python 프로그램에서 모듈의 함수나 클래스를 쓰려면 먼저 **`import`** 해야 한다.
- 모듈을 모아 두면 라이브러리가 된다.

| 종류 | 설명 |
|---|---|
| 표준 모듈 | Python에 내장된 모듈 (`sys`, `random`, `math` 등) |
| 사용자 정의 모듈 | 개발자가 재사용하려고 직접 만든 모듈 |
| 3rd party 모듈 | 개발업체나 개발자가 만들어 배포한 모듈. 내가 만든 모듈도 배포돼 다른 곳에서 쓰이면 3rd party가 된다 |

> **Python 파일의 두 역할**
> - **script 파일**: 처리할 것을 실행 순서대로 작성한 실행 파일
> - **module 파일**: 재사용할 함수, 클래스를 작성한 라이브러리 파일

## 패키지 (Package)

**모듈을 모아 둔 디렉토리**다. 재사용 가능한 모듈을 모은 것이라서 Python에서는 **라이브러리를 패키지라고도 부른다.**

- Python 3.3 이전에는 패키지 디렉토리에 `__init__.py` 파일이 반드시 있어야 했다. 3.3부터는 없어도 되고, 패키지 import 관련 설정이 필요할 때만 둔다.
- **Root Package**: 라이브러리의 모든 모듈을 담은 최상위 패키지. 그 안의 패키지는 모두 **sub package**다.

실습 폴더 구조는 이렇다.

```text
01_python/
├─ calc.py              # 모듈
├─ run.py, run2.py, run3.py
├─ my_package/          # 패키지 (__init__.py 있음)
│   ├─ __init__.py
│   └─ greet.py
└─ src/                 # 패키지 (__init__.py 없음, 3.3+라서 가능)
    ├─ common/
    │   └─ utils.py
    └─ test/
        └─ app.py
```

```python
# calc.py
__version__ = 0.1  # 변수

def plus(num1, num2):
    return num1 + num2

def minus(num1, num2):
    return num1 - num2

def multiply(num1, num2):
    return num1 * num2

def divide(num1, num2):
    return num1 / num2
```

## import

### 함수, 클래스 정의란

1. 함수, 클래스를 구현한다.
2. 구현한 것을 Python 실행환경에 **등록**한다. 등록은 메모리에 올리는(loading) 작업이고, 그러려면 구현한 코드를 실행해서 실행환경이 읽게 해야 한다.

실행환경에 **등록된 함수와 클래스만** 호출할 수 있다.

### import란

다른 모듈에 정의된 변수, 함수, 클래스를 쓰기 위해 **실행환경에 등록하는 작업**이다.

- 모듈을 import하면 **모듈의 코드가 실행되면서** 그 안의 정의들이 등록된다.
- 등록할 때 **모듈별로 namespace**를 만든다. 지금 실행 중인 모듈(main module)의 namespace와 import한 모듈의 namespace가 나뉜다.

> **namespace**
> 여러 객체를 하나로 묶으면서 구분자 역할을 하는 이름이다. namespace가 다르면 같은 이름의 객체를 함께 쓸 수 있다. Python은 모듈에 정의된 것을 등록할 때 **모듈 이름으로 namespace를 만든다.** ([위키백과: 이름공간](https://ko.wikipedia.org/wiki/%EC%9D%B4%EB%A6%84%EA%B3%B5%EA%B0%84))

### import 구문

```python
[from 사용할 것의 경로] import 사용할 것 [as 별칭] [, 사용할 것 [as 별칭], ...]
```

사용할 것은 **모듈**, 또는 **모듈 안의 변수·함수·클래스**다.

#### 1. 모듈 import

```python
import 모듈            # 모듈 하나
import 모듈 as 별칭    # namespace 이름을 별칭으로
import 모듈1, 모듈2    # 여러 개
```

모듈 이름(또는 별칭)이 namespace가 되므로 `모듈명.함수()`로 호출한다.

```python
# run.py
# calc.py → 모듈 이름은 확장자를 뺀 파일명 calc
import calc as c  # calc 모듈을 c라는 이름으로 사용하겠다

def test():
    pass
test()

result = c.plus(20, 30)  # 모듈이름.함수() 호출
print(result)
print(c.minus(100, 20))
```

#### 2. 모듈 안의 특정 항목만 import

```python
from 모듈 import 함수
from 모듈 import 함수1, 함수2, 클래스
from 모듈 import *
```

- import한 함수·클래스가 **현재 모듈의 namespace로 들어온다.** 그래서 모듈 이름 없이 바로 호출한다.
- `*`는 모듈의 모든 것을 가져오는데, **이름 충돌** 위험이 있어서 권장하지 않는다.

```python
# run2.py
def plus(n1, n2):
    print("안녕")

# calc의 plus, minus 두 함수를 사용. plus는 p라는 이름으로
from calc import plus as p, minus

result1 = p(100, 200)
result2 = minus(200, 300)
print(result1, result2)
```

`run2.py`에 `plus`가 이미 있어서 `calc`의 `plus`를 `p`라는 별칭으로 가져왔다. 별칭 없이 `from calc import plus`를 했다면 앞에 정의한 `plus`를 덮어썼을 것이다. `*`를 권장하지 않는 이유가 이것이다.

#### 3. 패키지에 속한 모듈 import

```python
import 패키지.모듈
from 패키지 import 모듈
from 패키지.모듈 import 함수, 클래스
from Root패키지.Sub패키지1.Sub패키지2 import 모듈   # 계층은 . 으로
from Root패키지.Sub패키지1.Sub패키지2.모듈 import 함수
```

**from 절에 패키지, import 절에 모듈**을 쓴다.

```python
# my_package/greet.py
__version__ = 0.1

def hello_kor():
    print("안녕하세요")

def hello_eng():
    print("How are you.")
```

```python
# run2.py (이어서)
import my_package.greet
my_package.greet.hello_eng()

from my_package import greet
greet.hello_kor()

from my_package import greet as g
g.hello_kor()
print(g.__version__)

# 패키지 → 모듈 → 함수를 import
from my_package.greet import hello_kor, hello_eng
hello_kor()
hello_eng()
```

필기에는 "import 할 수 있는 건 모듈, 변수, 함수, 클래스이고 **패키지는 import할 수 없다**"고 적었다.

> **보충 · 패키지 import는 되지만 모듈은 안 따라온다**
> 정확히는 `import my_package`도 에러 없이 된다. 다만 이때 실행되는 건 `__init__.py`뿐이고, 안에 있는 `greet` 모듈은 **자동으로 import되지 않는다.** 그래서 `my_package.greet`에 접근하면 에러가 난다. 필기의 말은 "패키지만 import해서는 모듈을 쓸 수 없다"는 뜻으로 이해하면 된다.

```text
$ python -c "import my_package; print(my_package); my_package.greet"
<module 'my_package' from 'project/my_package/__init__.py'>
Traceback (most recent call last):
  ...
    import my_package; print(my_package); my_package.greet
AttributeError: module 'my_package' has no attribute 'greet'
```

## 모듈을 찾는 경로: sys.path

`import 모듈`을 하면 Python은 이 순서로 모듈을 찾는다.

1. 지금 실행 중인 모듈(import 구문을 쓴 모듈)이 있는 경로
2. Python 실행환경에 등록된 경로

찾는 경로 목록은 `sys.path`에 있다.

```python
import sys
sys.path  # 모듈을 찾는 경로를 저장한 list
```

```text
['c:\\Users\\Playdata\\AppData\\Local\\Programs\\Python\\Python314\\python314.zip',
 'c:\\Users\\Playdata\\AppData\\Local\\Programs\\Python\\Python314\\DLLs',
 'c:\\Users\\Playdata\\AppData\\Local\\Programs\\Python\\Python314\\Lib',
 'c:\\Users\\Playdata\\AppData\\Local\\Programs\\Python\\Python314',
 '',
 'c:\\Users\\Playdata\\AppData\\Local\\Programs\\Python\\Python314\\Lib\\site-packages']
```

빈 문자열 `''`이 **현재 디렉토리**고, `site-packages`가 pip로 설치한 라이브러리가 들어가는 곳이다.

이 밖의 경로에 모듈이 있으면 **PYTHONPATH**에 그 경로를 등록한다.

| 방법 | 지속 |
|---|---|
| `sys.path.append(경로)` | 실행할 때마다 추가해야 한다 |
| 운영체제 환경변수 `PYTHONPATH`에 등록 | 한 번만 하면 된다 |

```python
# run2.py (끝부분)
import sys
sys.path.append(r"c:\temp\lib")  # new_package가 있는 경로 등록
from new_package import new_module
new_module.test_func()
```

수업 PC에서는 `c:\temp\lib\new_package\new_module.py`를 만들어 두고 실행해서 `new_package.new_module.test_func`가 출력됐다. 그 경로가 없는 곳에서 `run2.py`를 돌리면 앞부분은 다 실행되고 마지막 import에서 멈춘다.

```text
$ python run2.py
calc
300 -100
How are you.
안녕하세요
안녕하세요
0.1
안녕하세요
How are you.
Traceback (most recent call last):
  ...
    from new_package import new_module
ModuleNotFoundError: No module named 'new_package'
```

## 메인 모듈과 `__name__`

| | 메인 모듈 | 하위 모듈 (Sub module) |
|---|---|---|
| 뜻 | 지금 실행하는 모듈. `python 모듈.py`로 실행한 것 | 메인 모듈에서 import돼 실행되는 모듈 |
| 역할 | 애플리케이션의 main logic | 기능 제공 |
| `__name__` 값 | `'__main__'` | 모듈 이름(파일명) |

모듈을 import하면 그 안의 실행 코드도 같이 실행된다. 이걸 막으려면 **메인 모듈로 실행될 때만** 실행되게 감싼다.

```python
if __name__ == "__main__":
    # 메인 모듈일 때만 실행할 코드
```

실습 파일로 확인해 봤다. `calc.py` 끝에는 실행 코드가 있다.

```python
# calc.py (끝부분)
print(__name__)
if __name__ == "__main__":
    result = minus(10, 5)  # 같은 모듈에 정의된 함수 호출
    print(result)
```

```text
$ python calc.py
__main__
5
$ python run.py
calc
50
80
```

`python run.py`의 첫 줄 `calc`는 `run.py`가 아니라 **import된 `calc.py`가 출력한 것**이다. import하면 모듈 코드가 실행되기 때문이다. `calc.py`를 직접 실행하면 `__name__`이 `__main__`이라 `5`까지 나오지만, `run.py`에서 import했을 땐 `__name__`이 `calc`라서 `if` 블록이 실행되지 않았다.

## 파일 실행 vs 모듈 실행

Python 프로그램은 두 방식으로 실행할 수 있다. **import 기준 경로**가 다르다.

| | 파일 경로 실행 | 모듈 실행 |
|---|---|---|
| 구문 | `python src/test/app.py` | `python -m src.test.app` |
| 지정하는 것 | 파일 경로 (상대·절대 모두 가능) | 모듈 경로 (`.`으로 구분, `.py` 없음) |
| import 기준 경로 | **실행한 파일이 있는 디렉토리** (`src/test`) | **명령을 실행한 디렉토리** (프로젝트 루트) |
| 패키지 구조 | 깨질 수 있다 | 유지된다 |

`app.py`는 프로젝트 루트 기준으로 `src.common.utils`를 import한다.

```python
# src/test/app.py
print("app.py 실행")
from src.common import utils
print("app 테스트")
utils.util_func()
```

```text
$ python src/test/app.py
app.py 실행
Traceback (most recent call last):
  ...
    from src.common import utils
ModuleNotFoundError: No module named 'src'
```

```text
$ python -m src.test.app
app.py 실행
app 테스트
utils.util_func 실행
```

파일로 실행하면 `src/test`가 기준이 돼서 그 안에서 `src`를 찾다가 실패한다. `-m`으로 실행하면 명령을 실행한 프로젝트 루트가 기준이라 `src.common`을 찾는다.

> **보충** 필기의 "모듈 기반 실행" 예시에는 실행 명령이 `python src/test/app.py`로 적혀 있었는데, 그 단락은 `-m` 방식을 설명하는 곳이라 `python -m src.test.app`이 맞다. 위 실행 결과가 그 차이다.

루트에 있는 스크립트(`run3.py`)에서 import하면 기준이 루트라서 파일로 실행해도 된다.

```text
$ python run3.py
run3.py
utils.util_func 실행
```

## 3rd party 라이브러리 설치

기능을 모은 게 **모듈**, 모듈을 모은 게 **패키지**, 패키지를 모아 범용으로 배포한 게 **라이브러리**다. Python에서는 라이브러리를 패키지라고도 부른다.

| 구분 | 설명 |
|---|---|
| 1st party | Python을 설치할 때 내장된 라이브러리 |
| 2nd party | 애플리케이션을 만들면서 직접 정의한 라이브러리 |
| 3rd party | 개인·회사·단체가 만들어 배포한 라이브러리 |

라이브러리 저장소가 작성자와 사용자를 이어 준다.

| 저장소 | 검색 | 관리 도구 |
|---|---|---|
| **PyPI** (Python 공식) | [pypi.org](https://pypi.org/) | pip, uv |
| **Conda Repository** (Anaconda) | [anaconda.org](https://anaconda.org/anaconda/repo) | conda |

### 패키지 관리자

| 도구 | 특징 |
|---|---|
| **pip** | Python 표준 패키지 관리자. Python에 포함돼 있어 따로 설치하지 않는다 |
| **uv** | Astral이 Rust로 만들어 **매우 빠르다**. 패키지·가상환경·프로젝트 관리. `uv pip ...`로 pip 명령을 그대로 쓸 수 있다 |
| **conda** | Anaconda 자체 저장소의 패키지 관리 + 가상환경 관리 |

### pip 주요 명령어

| 명령 | 설명 |
|---|---|
| `pip install 라이브러리[==버전]` | 설치. 버전을 생략하면 최신. 이미 설치돼 있으면 아무것도 안 한다 |
| `pip install -U 라이브러리[==버전]` | 업그레이드(또는 다운그레이드). 없으면 설치 |
| `pip install -r requirements.txt` | 파일에 적힌 라이브러리를 한 번에 설치 |
| `pip freeze > requirements.txt` | 설치된 라이브러리 목록을 `-r`로 설치할 수 있는 형식으로 저장 |
| `pip list` | 설치된 라이브러리 목록. `--format=freeze`로 freeze 형식 출력 |
| `pip show 패키지` | 패키지 정보 |
| `pip uninstall 패키지` | 삭제 |

권한 문제로 설치가 안 되면 `--user` 옵션을 붙인다.

> **Windows 보안 설정**
> 보안 문제로 실행이 막힌다는 에러가 나면: `Windows 보안 > 앱 및 브라우저 컨트롤 > 스마트 앱 컨트롤`을 끈다.

> **보충** 노트북에는 `requirements.txt`를 만들 때 `pip list --format=freeze`가 낫다고 적었다. conda 환경 등에서는 `pip freeze`가 버전 대신 `패키지 @ file:///...` 같은 로컬 경로를 적는 경우가 있는데, `pip list --format=freeze`는 항상 `패키지==버전` 형식으로 써서 다른 PC에서도 설치할 수 있기 때문이다.

### uv 주요 명령어

[github.com/astral-sh/uv](https://github.com/astral-sh/uv)

**설치**

```powershell
# Windows (설치 후 터미널 재시작)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
# macOS는 brew install uv 도 된다

# 업그레이드
uv self update
```

**가상환경**

```bash
uv venv [가상환경경로] [--python=버전]   # 경로 생략 시 .venv, 버전 생략 시 설치된 버전

# 활성화
가상환경경로\Scripts\activate           # Windows
source 가상환경경로/bin/activate        # macOS / Linux
```

Windows에서 `activate` 실행이 막히면 [개요 글](/notes/python/python-overview-repl)의 PowerShell 보안 설정(`Set-ExecutionPolicy`)을 먼저 한다.

**패키지 관리**: `uv` 뒤에 pip 명령을 쓴다.

```bash
uv pip install 패키지
uv pip uninstall 패키지
uv pip list
```

## 정리

- 모듈은 `.py` 파일, 패키지는 모듈을 모은 디렉토리다.
- import하면 **모듈 코드가 실행되고**, 정의된 것들이 모듈 이름의 namespace에 등록된다.
- `import 모듈`은 `모듈.함수()`로, `from 모듈 import 함수`는 `함수()`로 쓴다. `import *`는 이름 충돌 위험이 있다.
- 메인 모듈의 `__name__`은 `'__main__'`이다. 테스트 코드는 `if __name__ == "__main__":` 안에 둔다.
- 모듈은 `sys.path` 순서로 찾는다. 파일로 실행하면 그 파일의 디렉토리가, `-m`으로 실행하면 현재 디렉토리가 기준이 된다.
- 라이브러리는 pip나 uv로 설치하고, `requirements.txt`로 목록을 공유한다.
