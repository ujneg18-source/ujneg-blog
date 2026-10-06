---
title: "예외 처리: 오류를 다루고 사용자 정의 예외 만들기"
description: "Python 오류의 종류와 try·except 흐름을 이해하고 사용자 정의 예외를 만드는 방법을 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Python 기초'
seriesOrder: 8
originalNotebook: "08_예외처리 (Exception Handling).ipynb"
tags: ["Python","Exception","Error Handling"]
date: 2026-04-20
---

> SKN31 Python 과정 노트북 `08_예외처리 (Exception Handling).ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 Python 3.13에서 다시 실행한 결과이고, `input()`이 있는 셀은 입력값을 바꿔 가며 실행했습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 오류와 예외(Exception), 처리 가능한 오류와 코드를 고쳐야 하는 오류
- `try - except`로 예외 처리하기
- `finally`
- Call Stack과 예외가 전달되는 방식
- `raise`로 예외 발생시키기
- 사용자 정의 Exception 클래스

노트북 첫 셀은 일부러 에러를 내는 코드였다.

```python
a = 1 / 0
b = 10 + 20
c = 30 - 1
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ZeroDivisionError: division by zero</div></div>

첫 줄에서 에러가 나면 **그 아래 줄은 실행되지 않는다.** `b`, `c`는 만들어지지 않았다.

## 오류

- 함수나 메소드가 처리 도중 **다음 명령문을 실행할 수 없는 상황**을 오류라고 한다.
- 오류 중에서 처리해서 **정상화할 수 있는 것**을 **Exception(예외)** 이라고 한다.
- 발생한 예외를 처리하는 것을 **Exception Handling**이라고 한다.

필기에 적은 예시다.

> **친구를 만난다()**
> - 메인 흐름
>   1. 약속시간 1시간 전에 집에서 나온다.
>   2. 버스 정류장으로 이동한다.
>   3. 약속 장소에 가는 300번 버스를 탄다.
>   4. 약속 장소 근처 정류장에서 내린다.
>   5. 약속장소로 간다.
>   6. 친구를 만난다.
> - 예외 상황
>   - 3에서 버스가 오지 않아 약속시간에 맞출 수 없다. **(예외)**
>     - 택시를 탄다. **(예외 처리)**

### 오류의 종류

| | 처리 가능한 오류 | 코드를 수정해야 하는 오류 |
|---|---|---|
| 원인 | 코드가 아니라 **실행 환경**의 문제. 사용자가 매뉴얼대로 하지 않았거나 잘못된 환경에서 실행한 경우 | 문법·규칙을 어긴 코드. **100% 발생**한다 |
| 미리 알 수 있나 | 코드 작성할 때는 발생 여부를 알 수 없다 | 실행하면 항상 난다 |
| 대응 | **예외 처리**로 정상화 | **코드 수정** |

```python
10 / 0
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ZeroDivisionError: division by zero</div></div>

```python
int("ABC")
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ValueError: invalid literal for int() with base 10: &#x27;ABC&#x27;</div></div>

`int(input())`에 사용자가 "ABC"를 입력하거나, 나누는 수로 0을 입력하는 건 코드만 봐서는 알 수 없다. 이런 게 예외 처리 대상이다.

## Exception handling

예외가 발생해 프로그램이 더 실행될 수 없는 상황을 처리(handling)해서 **정상화**하는 작업이다. `try - except` 구문을 쓴다.

```python
try:
    Exception 발생 가능한 정상흐름의 코드 블록
except [Exception클래스이름 [as 변수]]:
    처리 코드
```

| 블록 | 작성하는 코드 |
|---|---|
| **try** | 예외가 발생할 수 있는 코드와, 그 코드와 연결된 코드(예외가 안 나야만 실행할 코드)를 묶는다 |
| **except** | 발생한 예외를 처리하는 코드. try에서 예외가 나면 실행되고, 안 나면 실행되지 않는다 |

except 선언 방식은 세 가지다.

| 선언 | 의미 |
|---|---|
| `except:` | try에서 발생한 **모든** 예외를 처리 |
| `except 예외클래스:` | **특정** 예외만 처리. 예외마다 처리 방법이 다르면 except를 **연달아** 쓴다 |
| `except 예외클래스 as 변수:` | 특정 예외를 처리하면서, 왜 발생했는지 정보를 변수로 받아 쓴다 |

모든 예외는 **클래스**로 정의돼 있어서 그 클래스 이름을 적는다.

### 모든 예외를 같은 방식으로 처리

```python
################################################
# 어떤 Exception이 발생하든 동일한 방식으로 처리
# 1->2->3->4->5 : 정상흐름.
################################################
print("시작")  # 1번째

try:
    num = int(input("정수:"))  # 2번째 - Exception 가능성 있는 코드 (ABC 입력)
    result = 10 / num          # 3번째 - Exception 가능성 있는 코드 (0 입력)
    print(result)              # 4번째
except:
    print("예외발생함. 계산 실패")

print("종료")  # 5번째
```

```text
시작
정수:ABC
예외발생함. 계산 실패
종료
```

2번째에서 예외가 나서 3, 4번째는 건너뛰고 except로 갔다. 그다음 5번째로 이어져 프로그램이 정상 종료됐다.

```python
print("시작")
try:
    num = int(input("정수:"))
    result = 10 / num
    print(result)
except:
    print("예외발생함. 계산 실패")
print("종료")
```

```text
시작
정수:0
예외발생함. 계산 실패
종료
```

### 예외마다 다르게 처리

```python
################################################
# 발생한 Exception 종류마다 다른 방식으로 처리
# 1->2->3->4->5 : 정상흐름.
################################################
print("시작")  # 1번째

try:
    num = int(input("정수:"))  # 2번째 - Exception 가능성 있는 코드 (ValueError)
    result = 10 / num          # 3번째 - Exception 가능성 있는 코드 (ZeroDivisionError)
    print(result)              # 4번째
    print(alkjfdajkldf)        # NameError
except ValueError:
    print("ValueError: 정수가 아닌 값이 입력됨")
except ZeroDivisionError:
    print("ZeroDivisionError: 0으로 나눌수없다.")
except:
    print("문제발생")

print("종료")  # 5번째
```

```text
시작
정수:10
1.0
문제발생
종료
```

```python
print("시작")
try:
    num = int(input("정수:"))
    result = 10 / num
    print(result)
    print(alkjfdajkldf)
except ValueError:
    print("ValueError: 정수가 아닌 값이 입력됨")
except ZeroDivisionError:
    print("ZeroDivisionError: 0으로 나눌수없다.")
except:
    print("문제발생")
print("종료")
```

```text
시작
정수:ABC
ValueError: 정수가 아닌 값이 입력됨
종료
```

except는 **위에서부터** 비교해서 처음 맞는 하나만 실행한다. 그래서 모든 예외를 받는 `except:`는 맨 마지막에 둔다.

> **보충 · `except:`가 오타까지 삼킨다**
> 정수를 제대로 입력하면 계산은 되지만 `print(alkjfdajkldf)`에서 `NameError`가 나고, 마지막 `except:`가 받아서 "문제발생"만 찍는다. NameError는 처리할 예외가 아니라 **코드를 고쳐야 하는 오류**인데 감춰진 것이다. 실제 코드에서는 `except:`를 쓰지 말고 처리할 예외를 적거나, 최소한 `except Exception as e:`로 받아서 `e`를 출력해 두는 게 좋다.

```python
try:
    num = int(input("정수:"))
    print(10 / num)
    print(alkjfdajkldf)
except ValueError:
    print("ValueError: 정수가 아닌 값이 입력됨")
except Exception as e:
    print("문제발생:", type(e).__name__, e)
```

```text
정수:10
1.0
문제발생: NameError name 'alkjfdajkldf' is not defined
```

### finally 구문

- 예외 발생 여부, 처리 여부와 **상관없이 무조건 실행**되는 코드 블록이다.
- 반드시 실행돼야 하는 코드를 쓴다. 보통 외부 자원(파일, 네트워크, DB)과 연결해 데이터를 주고받은 뒤 **연결을 종료하는 작업**을 넣는다.
- `finally`는 `except`보다 먼저 올 수 없다. 가능한 순서는 세 가지다.
  1. try - except - finally
  2. try - except
  3. try - finally

```python
num = 0
try:
    i = 1 / num
    print(i)
except ValueError:
    print("except")
finally:
    print("finally")  # 외부자원(파일, 네트워크, ..)과의 연결을 종료(닫기, 끊기)
print("끝")
```

```text
finally
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · ZeroDivisionError: division by zero</div></div>

`ZeroDivisionError`가 났는데 except는 `ValueError`만 받는다. 처리되지 않았지만 **finally는 실행됐고**, 그다음 예외가 그대로 터져서 `print("끝")`은 실행되지 않았다.

## Exception 발생시키기

함수나 메소드가 더 이상 작업을 진행할 수 없는 조건이 되면 예외를 **직접 발생**시킨다.

### Call Stack Mechanism

- 실행환경이 함수 호출을 관리하는 방법이다. **stack 구조**를 쓴다.
- stack은 **First-In Last-Out** 구조다. 함수는 호출된 순서대로 쌓이고, **가장 나중에 호출된 함수가 먼저 끝난다.**

![Call Stack](/images/python/stack.png)

- 실행 중인 함수에서 예외가 나도 마찬가지로 **호출된 반대 순서로** 끝난다.
  - 처리하지 않은 예외는 **caller(호출한 함수)에게 전달된다.**
  - 모든 caller가 처리하지 않으면 결국 Python 실행환경까지 전달돼 프로그램이 **비정상 종료**된다.

> **보충** 필기에는 그림만 있어서 함수 세 개로 확인했다. `func3`에서 난 예외를 `func3`, `func2`는 처리하지 않고, `func1`이 처리한다.

```python
def func1():
    print("func1 시작")
    try:
        func2()
    except ZeroDivisionError as e:
        print("func1에서 처리:", e)
    print("func1 끝")

def func2():
    print("  func2 시작")
    func3()
    print("  func2 끝")  # 실행 안 됨

def func3():
    print("    func3 시작")
    1 / 0
    print("    func3 끝")  # 실행 안 됨

func1()
```

```text
func1 시작
  func2 시작
    func3 시작
func1에서 처리: division by zero
func1 끝
```

`func3`, `func2`의 "끝"은 출력되지 않았다. 예외가 처리되지 않은 함수는 거기서 바로 끝나고 caller로 넘어가기 때문이다.

### raise 구문

예외를 **강제로** 발생시킨다.

```python
raise Exception객체
```

업무 규칙을 어겼거나 다음 명령문을 실행할 수 없는 조건이 되면, 진행을 멈추고 caller에게 **작업을 처리하지 못했다고 알리며** 돌아간다.

| | return | raise |
|---|---|---|
| 의미 | **정상적으로** 끝나서 돌아간다 | 실행 도중 문제가 생겨 **비정상적으로** 끝나서 돌아간다 |
| 가지고 가는 것 | 처리 결과 값 | 상황 정보를 담은 Exception 객체 |
| caller가 할 일 | 다음 작업을 이어서 한다 | `try - except`로 처리해 정상화하거나, 자기도 caller에게 예외를 발생시킨다 |

```python
def divide(num1, num2):
    """
    함수 설명
    Args:
        파라미터설명
    Returns:
        리턴값 설명
    Raises:
        Exception: 파라미터 num2가 0인 경우 발생.
    """
    if num2 == 0:
        raise Exception("0으로 못나눔")
    return num1 / num2

try:
    result = divide(10, 0)
    result2 = result + 20
    print("최종결과:", result2)
except Exception as e:
    print("계산 실패:", e)

print("종료")
```

```text
계산 실패: 0으로 못나눔
종료
```

`raise`로 넘긴 메시지가 `except ... as e`의 `e`로 들어왔다. docstring의 `Raises:`에 어떤 예외가 언제 나는지 적어 두면 함수를 쓰는 사람이 무엇을 처리해야 하는지 안다.

### 사용자 정의 Exception 클래스

Python은 예외 상황을 **클래스**로 정의해 쓴다. 상황과 관련된 attribute와 메소드를 담은 클래스다.

- **`Exception` 클래스를 상속**받는다.
- 클래스 이름은 예외 상황을 설명하는 이름으로 짓는다. 관례적으로 `~Error`로 끝낸다.

```python
# 잘못된 월(1 ~ 12가 아닌 값)일 때 발생시킬 Exception을 정의
class InvalidMonthValueError(Exception):
    def __init__(self, invalid_month, message):
        self.message = message
        self.invalid_month = invalid_month

    def __str__(self):
        return f"에러메세지: {self.message}, 잘못된 월: {self.invalid_month}"


def save_month(month: int):
    # 월을 저장하는 함수
    if month < 1 or month > 12:
        raise InvalidMonthValueError(month, "잘못된 월입니다.")
    print(f"{month}월을 저장했습니다.")


def save_day(day: int):
    # 일을 저장하는 함수
    print(f"{day}일을 저장했습니다.")
```

```python
try:
    save_month(30)
    save_day(20)
except InvalidMonthValueError as e:
    print("날짜 저장 실패: ", e, e.invalid_month)

print("종료")
```

```text
날짜 저장 실패:  에러메세지: 잘못된 월입니다., 잘못된 월: 30 30
종료
```

`print(e)`는 `__str__()`의 결과를, `e.invalid_month`는 직접 만든 attribute를 보여 준다. `save_month`에서 예외가 나서 `save_day(20)`은 실행되지 않았다.

```python
try:
    save_month(10)
    save_day(20)
except InvalidMonthValueError as e:
    print("날짜 저장 실패: ", e, e.invalid_month)
```

```text
10월을 저장했습니다.
20일을 저장했습니다.
```

> **보충** 처리하지 않고 그대로 터지면 에러 메시지에도 `__str__()`의 결과가 쓰인다. 그래서 `__str__`에 원인을 잘 적어 두면 디버깅이 편하다.

```python
save_month(0)
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · InvalidMonthValueError: 에러메세지: 잘못된 월입니다., 잘못된 월: 0</div></div>

## 정리

- 오류 중 처리해서 정상화할 수 있는 것이 예외다. 실행 환경 때문에 나는 오류는 예외 처리, 코드 때문에 나는 오류는 코드 수정 대상이다.
- try에서 예외가 나면 남은 try 코드를 건너뛰고 맞는 except 하나만 실행한 뒤 이어서 진행한다.
- except는 구체적인 예외부터 쓴다. `except:`는 오타(NameError)까지 감추니 피한다.
- finally는 예외가 처리되지 않아도 실행된다. 자원 정리 코드를 넣는다.
- 처리하지 않은 예외는 Call Stack을 거꾸로 타고 caller에게 전달된다.
- `return`은 정상 종료, `raise`는 비정상 종료를 알린다. 사용자 정의 예외는 `Exception`을 상속해 만든다.
