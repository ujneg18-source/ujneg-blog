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

> 이 글은 SKN31 학습 과정에서 작성한 Jupyter Notebook을 바탕으로 정리했습니다.
> 당시 작성한 Markdown 필기와 코드 주석은 보존하고, 글의 흐름을 위해 도입·보충 설명·학습 정리를 덧붙였습니다.
> 원본 노트북: `08_예외처리 (Exception Handling).ipynb`

## 이 글에서 확인할 내용



- Syntax Error와 실행 중 발생하는 Exception을 구분한다.

- `try`, `except`, `else`, `finally`의 실행 흐름을 이해한다.

- 예외 종류별로 다른 복구 로직을 작성한다.

- `raise`와 사용자 정의 Exception으로 잘못된 상태를 명확히 표현한다.



## 필기를 다시 읽으며 잡은 핵심



예외 처리는 오류를 숨기는 문법이 아니라, 예상 가능한 실패를 정상적인 프로그램 흐름 안에서 다루는 방법이다. 모든 예외를 같은 방식으로 처리하는 코드와 예외 종류마다 다르게 처리하는 코드를 나누어 실행 순서를 주석으로 기록했다.

구체적인 예외를 먼저 처리하면 사용자에게 더 정확한 원인과 대응 방법을 제공할 수 있다. 반대로 넓은 `Exception`만 사용하는 방식은 예상하지 못한 문제까지 감출 수 있어 마지막 안전망 정도로 사용하는 것이 좋다.

월과 일의 범위를 검증하는 예제에서는 잘못된 상태를 발견한 위치에서 직접 예외를 발생시키고, 의미를 드러내는 사용자 정의 Exception 클래스로 전달했다. 입력 검증과 도메인 규칙을 코드로 표현하는 연습이었다.

---

````python
a = 1 / 0
b = 10 + 20
c = 30 - 1
````

## 오류

- 함수나 메소드가 처리 도중 다음 명령문을 실행할 수 없는 상황 오류라고 한다.
- 오류 중 처리해서 정상화 하는 것이 가능한 것을 **Exception**(**예외**)이 라고 한다. 
- 발생한 예외를 처리하는 것을 **Exception Handling** 이라고 한다.

### 친구를 만난다()
- 메인 흐름
  1. 약속시간 1시간 전에 집에서 나온다.
  2. 버스 정류장으로 이동한다.
  3. 약속 장소에 가는 300번 버스를 탄다.
  4. 약속 장소 근처 정류장에서 내린다.
  5. 약속장소로 간다.
  6. 친구를 만난다.
- 예외 상황
  - 3에서 버스가 오지 않아 약속시간에 맞출 수 없다. (예외)
    - 택시를 탄다. (예외 처리)

### 오류의 종류
- **처리가능 한 오류**
    - 코드 상의 문제가 아니라 실행 환경의 문제로 발생하는 오류
        - 사용자가 매뉴얼대로 실행하지 않았거나 잘못된 환경에서 실행한 경우.
    - 코드작성 할 때는 실행시 Exception 발생 할지 여부를 알 수 없다.
    - 예외 처리를 통해 발생 했을 때 정상화 한다.
- **코드를 수정해야 하는 오류**
    - 코드 상 100% 발생하는 오류
    - 보통 언어차원의 문법, 규칙을 어겨서 발생한다.
    - 예외 처리가 아닌 **코드 수정의 대상**이다.

### Exception handling
Exception이 발생되어 프로그램이 더 이상 실행될 수 없는 상황을 처리(handling)해서 정상화 시키는 작업을 말한다.  
try - except 구문을 이용해 처리한다.

####  try, except 구문

```python
try:
    Exception 발생가능한 정상흐름의 코드 블록
except [Exception클래스 이름 [as 변수]] :
    처리 코드   
```

- **try block**
    - 정상흐름의 코드에서 Exception 발생 가능성 있는 코드와 그 코드와 연결된 코드들을 블록으로 묶는다.
        - 연결된 코드란 Exception이 발생 안해야만 실행되는 코드를 말한다.
- **except block**
    - 발생한 Exception을 처리하는 코드 블록을 작성한다.
        - try block의 코드를 실행하다 exception이 발생하면 except block이 실행된다. Exception이 발생하지 않으면 실행되지 않는다.
    - try block에서 발생한 모든 Exception을 처리하는 경우 `except:` 로 선언한다.
    - try block에서 발생한 특정 Exception만 따로 처리할 경우 `except Exception클래스 이름` 을 선언한다.
        - 모든 Exception들은 클래스로 정의 되어 있다. 그 클래스 이름을 적어준다.
        - **Exception 들 별로 각각 처리할 수 있으면 이 경우 except 구문(처리구문)을 연속해서 작성하면 된다.**
    - try block에서 발생한 특정 Exception만 따로 처리하고 그 Exception이 왜 발생했는지 등의 정보를 사용할 경우 `except Exception 클래스 이름 as 변수명` 으로 선언하고 변수명을 이용해 정보를 조회한다.

````python
10 / 0
````

````python
int("ABC")
````

````python
################################################ 
# 어떤 Exception이 발생하든 동일한 방식으로 처리
# 1->2->3->4->5 : 정상흐름.
################################################ 

print("시작")  # 1번째

try:
    num = int(input("정수:")) # 2번째 - Exception가능성있는 코드 (ABC입력)
    result = 10 / num         # 3번째 - Exception가능성있는 코드 (0 입력)
    print(result)             # 4번째
except:
    print("예외발생함. 계산 실패")

print("종료") # 5번째
````

````python
################################################ 
# 발생한 Exception 종류마다 다른 방식으로 처리
# 1->2->3->4->5 : 정상흐름.
################################################ 
print("시작")  # 1번째

try:
    num = int(input("정수:")) # 2번째 - Exception가능성있는 코드(ValueError)
    result = 10 / num         # 3번째 - Exception가능성있는 코드(ZeroDivionError)
    print(result)             # 4번째
    print(alkjfdajkldf) # NameError
except ValueError:
    print("ValueError: 정수가 아닌 값이 입력됨")
except ZeroDivisionError:
    print("ZeroDivisionError: 0으로 나눌수없다.")
except:
    print("문제발생")
     
print("종료") # 5번째
````

#### finally 구문

- 예외 발생여부, 처리 여부와 관계없이 무조건 실행되는 코드블록
    - try 구문에 **반드시 실행되야 하는 코드블록을 작성할때 사용한다.**
    - 보통 프로그램이 외부자원과 연결해서 데이터를 주고 받는 작업을 할때 마지막 연결을 종료하는 작업을 finally 블록에 넣는다.
- finally 는 except 보다 먼저 올 수 없다.
    - 구문순서
        1. try - except - finally
        1. try - except
        1. try - finally

````python
num = 0
try:
    i = 1 / num
    print(i)
except ValueError:
    print("except")
finally:
    print("finally")  # 외부자원(파일, 네트워크, ..)과의 연결을 종료(닫기, 끊기)
print("끝")
````

### Exception 발생 시키기
- 함수나 메소드가 더이상 작업을 진행 할 수 없는 조건이 되면 Exception을 강제로 발생시킨다.

#### Call Stack Mechanism
- 프로그램 실행환경이 함수 호출을 관리하는 방법
- 함수호출을 stack 구조를 이용해 관리한다.
    - stack구조는 first-in last-out 의 구조이다.
    - 함수는 호출되는 순서대로 쌓이고 가장 나중에 호출된 함수가 먼저 종료된다. 
    - ![image.png](/images/python/stack.png)
- 호출되어 실행 중인 함수에서 Exception이 발생해도 마찮가지로 호출된 반대 순서대로 종료된다.
    - 발생한 Exception은 처리를 하지 않으면 caller에게 전달된다.
        - 발생한 Exception에 대한 처리가 모든 caller에서 안되면 결국 파이썬 실행환경까지 전달되어 프로그램은 비정상적으로 종료 되게 된다.

````python
def test():
    
    try:
        Exception 발생
    except:
        xxxx
````

#### raise 구문
- Exception을 강제로 발생시킨다.
    - 업무 규칙을 어겼거나 다음 명령문을 실행할 수 없는 조건이 되면 진행을 멈추고 caller로 요청에게 작업을 처리 못했음을 알리며 돌아가도록 할때 exception을 발생시킨다.
    - 구문
    ```python
        raise Exception객체
    ```
- **raise와 return**
    - 함수나 메소드에서 return과 raise 구문이 실행되면 모두 caller로 돌아간다.
    - return은 정상적으로 끝나서 돌아가는 의미이다. 그래서 처리결과가 있으면 그 값을 가지고 돌아간다.
        - caller는 그 다음작업을 이어서 하면 된다.
    - raise는 실행도중 문제(Exception)가 생겨 비정상적으로 끝나서 돌아가는 의미이다. 그래서 비정상적인 상황 정보를 가지는 Exception객체를 반환값으로 가지고 돌아간다.
        - caller는 try - except구문으로 발생한 exception을 처리하여 프로그램을 정상화 하거나 자신도 caller에게 exception을 발생시키는 처리를 한다.

````python
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
````

````python
try:
    result = divide(10, 0)
    result2 = result + 20
    print("최종결과:", result2)
except Exception as e:
    print("계산 실패:", e)

print("종료")
````


#### 사용자 정의 Exception 클래스 구현

- 파이썬은 Exception 상황을 클래스로 정의해 사용한다.
    - Exception이 발생하는 상황과 관련된 attribute들과 메소드들을 정의한 클래스
    
- 구현
    - `Exception` 클래스를 **상속받는다.**
    - 클래스 이름은 Exception 상황을 설명할 수 있는 이름을 준다.

````python
# 잘못된 월(1 ~ 12가 아닌 값)을때 발생시킬 Exception을 정의
class InvalidMonthValueError(Exception):
    def __init__(self, invalid_month, message):
        self.message = message
        self.invalid_month = invalid_month

    def __str__(self):
        return f"에러메세지: {self.message}, 잘못된 월: {self.invalid_month}"
````

````python
def save_month(month:int):
    # 월을 저장하는 함수
    if month < 1 or month > 12:
        raise InvalidMonthValueError(month, "잘못된 월입니다.")    
    
    print(f"{month}월을 저장했습니다.")


def save_day(day:int):
    # 일을 저장하는 함수
    print(f"{day}일을 저장했습니다.")
````

````python
try:
    save_month(30)
    save_day(20)
except InvalidMonthValueError as e:
    print("날짜 저장 실패: ", e, e.invalid_month)
    
print('종료')
````

---

## 학습 정리



- 예외는 예상 가능한 실패를 호출자에게 전달하는 수단이다.

- 가능하면 구체적인 예외 타입을 먼저 처리한다.

- `finally`는 성공 여부와 관계없이 정리 작업이 필요할 때 사용한다.

- 사용자 정의 예외는 업무 규칙에 맞지 않는 상태를 명확하게 표현한다.
