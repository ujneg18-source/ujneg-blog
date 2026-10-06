---
title: "객체지향 프로그래밍: 클래스·상속·특수 메서드"
description: "클래스와 인스턴스의 관계부터 self, 생성자, 상속, 오버라이딩과 특수 메서드까지 정리합니다."
category: 'Tech'
subcategory: 'Python'
series: 'Python 기초'
seriesOrder: 6
originalNotebook: "06_객체지향프로그래밍.ipynb"
tags: ["Python","OOP","Class","Inheritance"]
date: 2026-04-16
---

> SKN31 Python 과정 노트북 `06_객체지향프로그래밍.ipynb`의 필기를 바탕으로 정리했습니다.
> 코드는 Python 3.13에서 순서대로 다시 실행한 결과입니다. 노트북 출력이 코드와 맞지 않던 셀은 해당 위치에 적어 두었고, `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 객체지향 프로그래밍, 클래스와 객체(instance)
- instance 변수와 생성자(`__init__`)
- instance 메소드와 `self`
- 상속, Method Overriding, `super()`
- `isinstance()`, `__dict__`
- 특수 메소드: `__call__`, `__str__`, 연산자 재정의
- class 변수와 class 메소드

## 객체지향 프로그래밍 (OOP)

현실 세계의 개체(Object)를 소프트웨어의 객체로 모델링해서, **데이터(속성)와 그 데이터를 처리하는 동작(메소드)을 하나로 묶어** 프로그램을 구성하는 방식이다.

- 프로그램을 구성하는 객체들을 찾고, 각 객체의 데이터와 메소드를 독립된 단위로 정의한다.
- 객체지향 언어에서는 먼저 객체를 어떻게 구성할지 **클래스**로 정의하고, 그 클래스로 **객체(instance)** 를 만들어 쓴다.

## 클래스와 객체

**클래스**는 객체를 어떻게 구성할지 정의한 **설계도(템플릿)** 다. 두 가지를 정의한다.

| 정의하는 것 | 의미 | 예 |
|---|---|---|
| **Attribute(Property)** | 객체의 속성·상태 값을 저장하는 변수. **instance 변수**라고 한다. 객체마다 따로 가진다 | 고객: ID, 이름, email, 포인트 / 제품: 번호, 이름, 가격, 재고 |
| **Method** | attribute 값을 처리하는 함수. **instance 메소드**라고 한다. 모든 객체가 같은 메소드로 자기 값을 처리한다 | 포인트 적립, 재고 차감 |

- **클래스는 데이터 타입이고, instance는 값**이다. `int`가 타입이고 `30`이 값인 것과 같다.
- Python에서는 instance 변수와 메소드를 합쳐 **Attribute**라고 부른다.
- 클래스 이름은 **파스칼 표기법**(단어마다 첫 글자 대문자)으로 짓는다. 예: `Person`, `HighSchoolStudent`

```python
class 클래스이름:  # 선언부
    # 클래스 구현: 메소드들을 정의
```

객체는 `변수 = 클래스이름()`으로 만든다.

```python
class Person:  # 선언부
    pass       # 구현부

p1 = Person()
p2 = Person()
print(type(p1))
print(type(30))
```

```text
<class '__main__.Person'>
<class 'int'>
```

`p1`의 타입이 `Person`이다. 직접 만든 클래스도 `int` 같은 타입과 똑같이 취급된다.

## instance 변수

객체의 데이터다. 값을 저장하므로 변수이고, 객체마다 따로 가지므로 instance 변수라고 한다.

| 방법 | 설명 |
|---|---|
| **생성자(`__init__`)에서 추가** | 객체가 처음 가질 attribute를 정의한다. 이걸 **초기화**라고 한다 |
| `객체.속성명 = 값` | 추가 또는 변경 |
| 메소드에서 변경 | 초기화한 attribute를 바꾼다 |
| `객체.속성명` | 조회 |
| `객체.__dict__` | 객체가 가진 attribute를 dict로 반환 |

### 객체에 직접 추가하기

```python
class Person:
    pass

p1 = Person()
p1.name = "홍길동"  # 객체 p1에 attribute 추가
p1.age = 20
p1.address = "서울"
print(p1.name, p1.age + 5, p1.address)

p2 = Person()
p2.name = "이순신"
p2.blood_type = "B"
p2.home_town = "한산도"

print(p2.name, p1.name)
p1.name = "유관순"  # attribute 변경
print(p2.name, p1.name)
```

```text
홍길동 25 서울
이순신 홍길동
이순신 유관순
```

이렇게 하면 같은 `Person`인데 `p1`과 `p2`가 가진 attribute가 다르다. 그래서 생성자로 attribute를 정해 둔다.

### 생성자 (Initializer)

객체를 생성할 때 호출되는 특수 메소드다. 여기서 초기화한 attribute가 **그 클래스의 모든 객체가 가지는 attribute**가 된다. 객체를 만든 뒤 attribute를 추가할 수는 있지만 하지 않는 게 좋다.

```python
def __init__(self, 매개변수들):
    self.속성명 = 값  # attribute(instance 변수) 초기화
```

```python
class Person:
    def __init__(self, name: str, age: int, address: str = None):
        # self.변수명: instance 변수
        self.name = name  # instance 변수 name(self.name) = 파라미터 name
        self.age = age
        self.address = address
        self.blood_type = None  # 파라미터로 받지 않는 attribute도 만들어 둔다

p1 = Person("이순신", 30, "서울")
p2 = Person("유관순", 22, "부산")
print(p1.name, p1.age, p1.address, p1.blood_type)
print(p2.name, p2.age, p2.address, p2.blood_type)
```

```text
이순신 30 서울 None
유관순 22 부산 None
```

`Person("이순신", 30, "서울")`을 실행하면 이렇게 진행된다.

1. 객체의 변수를 저장할 공간이 메모리(Heap)에 생긴다.
2. `__init__()`이 호출된다. 첫 번째 parameter `self`에는 **지금 만들어지는 객체**가, 두 번째부터는 생성할 때 넘긴 argument가 들어간다.
3. `__init__()`이 끝나면 객체 생성이 완료된다.

생성자도 함수라서 필수 parameter를 빼먹으면 에러다.

```python
p3 = Person("홍길동")
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · TypeError: Person.__init__() missing 1 required positional argument: &#x27;age&#x27;</div></div>

```python
class Book:
    def __init__(self, title, publisher, author, price):
        self.title = title
        self.publisher = publisher
        self.author = author
        self.price = price

b = Book("랭체인 실전 가이드", "루비페이퍼", "윤성재", 26000)
print(b.__dict__)
```

```text
{'title': '랭체인 실전 가이드', 'publisher': '루비페이퍼', 'author': '윤성재', 'price': 26000}
```

## instance 메소드

객체가 제공하는 기능이다. 주로 그 객체의 attribute를 처리한다.

```python
def 이름(self, 매개변수들):
    self.attribute  # attribute 조회/대입
```

호출은 `객체.메소드이름(argument)`로 한다.

### self

- 메소드는 parameter를 **최소 하나** 선언해야 하고, 첫 번째 parameter 이름은 **관례적으로 `self`** 다.
- 메소드를 호출하면 **그 메소드를 소유한 객체**가 `self`에 들어간다. 그래서 메소드 안에서 `self.속성`, `self.메소드()`로 자기 attribute와 메소드를 쓴다.
- 생성자의 `self`는 지금 만들어지는 객체, 메소드의 `self`는 메소드를 소유한 객체다.
- 호출할 때 넘긴 argument는 **두 번째 parameter부터** 받는다.

![self](/images/python/ch06_01.png)

```python
class Person:
    def __init__(self, name: str, age: int, address: str = None):
        self.name = name
        self.age = age
        self.address = address
        self.blood_type = None

    # 메소드: 객체가 제공하는 기능. instance 변수를 주로 처리한다
    def get_info(self) -> str:
        """Person 객체의 이름, 나이, 주소, 혈액형을 하나의 문자열로 반환한다."""
        info = f"이름: {self.name}, 나이: {self.age}, 주소: {self.address}, 혈액형: {self.blood_type}"
        return info

    def save_info(self):
        """Person 객체의 정보를 파일에 저장하는 메소드 (여기선 출력으로 대신)"""
        info = self.get_info()  # 같은 객체의 메소드를 호출
        print(f"다음 내용을 저장했습니다./n{info}")

    def set_age(self, age):
        """나이를 변경하는 메소드. 0 이상만 받는다."""
        if age >= 0:
            self.age = age
        else:
            print("나이는 0이상만 가능")
```

```python
p1 = Person("홍길동", 20, "서울")
p1.blood_type = "B"  # instance 변수에 직접 대입

info = p1.get_info()  # 메소드 호출: 객체.메소드이름()
print(info)
p1.save_info()
```

```text
이름: 홍길동, 나이: 20, 주소: 서울, 혈액형: B
다음 내용을 저장했습니다./n이름: 홍길동, 나이: 20, 주소: 서울, 혈액형: B
```

> **보충** `save_info()`의 출력에 `/n`이 그대로 찍혔다. 줄바꿈 escape 문자는 슬래시가 아니라 **역슬래시** `\n`이다.

```python
p1.set_age(40)
print(p1.age, p1.get_info())
p1.set_age(-20)
print(p1.age)
```

```text
40 이름: 홍길동, 나이: 40, 주소: 서울, 혈액형: B
나이는 0이상만 가능
40
```

`set_age()`를 거치면 음수 나이를 막을 수 있다. 값을 직접 대입(`p1.age = -20`)하지 않고 메소드로 바꾸게 하는 이유다.

메소드는 그 클래스의 객체에만 있다. 문자열 객체에는 `save_info()`가 없고, 대신 `str` 클래스가 정의한 `upper()` 같은 메소드가 있다.

```python
s = "aaaa"
s.save_info()
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · AttributeError: &#x27;str&#x27; object has no attribute &#x27;save_info&#x27;</div></div>

```python
s = "abc"
s2 = "def"
print(s.upper(), s2.upper())  # 같은 메소드가 각자 자기 값을 처리한다
```

```text
ABC DEF
```

노트북에 이걸 의사코드로 적어 뒀다. `str` 클래스 안에 `upper(self)`가 있고, `self`(문자열 객체)의 글자를 대문자로 바꿔 반환하는 식이라는 뜻이다.

```python
class str:
    def upper(self):
        # self의 문자열 → 대문자로 바꿔 반환
        ...
```

## 상속 (Inheritance)

기존 클래스를 **확장해서** 새 클래스를 만든다. 새 클래스의 객체는 기존 클래스의 attribute와 메소드를 그대로 쓰고, 추가로 자기만의 attribute와 메소드를 가질 수 있다. 같은 범주의 클래스를 하나로 묶는 역할도 한다.

| | 물려주는 클래스 | 물려받는 클래스 |
|---|---|---|
| 이름 | 기반(Base), 상위(Super), **부모(Parent)** | 파생(Derived), 하위(Sub), **자식(Child)** |
| 성격 | 더 **추상적** | 더 **구체적** |
| 타입 관계 | 하위 클래스 객체의 타입이 된다 | |

- **다중상속**: 여러 클래스를 상속받을 수 있다. Python은 다중상속을 지원한다.
- **MRO(Method Resolution Order)**: 메소드를 찾는 순서. 자기 자신 → 상위 클래스(아래에서 위로). 다중상속이면 먼저 적은 클래스부터(왼쪽 → 오른쪽). `클래스이름.mro()`로 확인한다.
- **`object`**: 모든 클래스의 최상위 클래스. 아무것도 상속하지 않으면 `object`를 상속한다. 특수 메소드와 특수 attribute가 여기 정의돼 있다.

```python
class Parent1: ...
class Parent2: ...
class Sub(Parent1, Parent2): ...
```

### 예제: Person, Student, Teacher

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def get_info(self):
        return f"이름: {self.name}, 나이: {self.age}"

    def add_age(self, age):
        self.age += age


class Student(Person):
    def __init__(self, name, age, grade):
        # name과 age는 Person의 initializer를 호출해서 설정
        super().__init__(name, age)  # super(): 상위 클래스(Person)의 __init__() 호출
        self.grade = grade           # grade: Student만의 속성

    def add_grade(self, grade):
        self.grade += grade

    def get_info(self):  # Overriding
        basic_info = super().get_info()  # Person.get_info() → 이름, 나이
        return f"{basic_info}, 학년: {self.grade}"


class Teacher(Person):
    def __init__(self, name, age, subject):
        super().__init__(name, age)
        self.subject = subject

    def change_subject(self, subject):
        self.subject = subject

    def get_info(self):  # Overriding
        return f"{super().get_info()}, 과목: {self.subject}"
```

```python
t = Teacher("김선생", 30, "국어")
print(t.name, t.age, t.subject)
t.change_subject("파이썬")
t.add_age(5)  # Person에서 물려받은 메소드
print(t.name, t.age, t.subject)
print(t.get_info())
```

```text
김선생 30 국어
김선생 35 파이썬
이름: 김선생, 나이: 35, 과목: 파이썬
```

```python
s = Student("박학생", 15, 3)
s.add_grade(5)
print(s.name, s.age, s.grade)
print(s.get_info())
s.add_age(-2)
print(s.name, s.age, s.grade)
```

```text
박학생 15 8
이름: 박학생, 나이: 15, 학년: 8
박학생 13 8
```

`Teacher`, `Student`에는 `add_age()`를 정의하지 않았지만 `Person`에서 물려받아 쓴다.

```python
print(Student.mro())
```

```text
[<class '__main__.Student'>, <class '__main__.Person'>, <class 'object'>]
```

`Student`에서 메소드를 찾고, 없으면 `Person`, 그다음 `object` 순서로 찾는다.

### Method Overriding

상위 클래스의 메소드를 하위 클래스에서 **다시 구현**하는 것이다. 상위 클래스는 모든 하위 클래스에 통하는 추상적인 구현밖에 못 하니, 하위 클래스가 자기에 맞게 구체화한다. **메소드 선언은 같게, 구현부만 새로** 쓴다. 위 예에서 `get_info()`가 그렇다.

### super()

하위 클래스에서 **상위 클래스의 메소드**를 호출할 때 쓴다.

| 메소드 안에서 | 가리키는 것 |
|---|---|
| `self.xxx` | 같은 클래스(자기 자신)의 메소드나 attribute |
| `super().xxx()` | 부모 클래스에 정의된 메소드 |

Overriding한 하위 클래스에서 **원래 상위 클래스 메소드**를 부르려면 반드시 `super().메소드()`로 호출한다. `self.get_info()`라고 쓰면 자기 자신의 `get_info()`를 다시 불러서 끝없이 반복된다.

## 객체 관련 내장 함수와 특수 변수

| 이름 | 반환 |
|---|---|
| `isinstance(객체, 클래스)` | 객체가 그 클래스 타입이면 True. 여러 타입을 볼 땐 튜플로 묶는다. **상위 클래스와 비교해도 True** |
| `객체.__dict__` | 객체의 attribute와 값을 dict로 |

```python
def print_person_info(person: Person):
    """
    Person 타입 객체(Person과 그 하위 클래스로 만든 객체)를 받아서
    get_info()로 정보를 조회해 출력하는 함수.
    """
    if isinstance(person, Person):
        print("정보를 출력합니다.")
        print(person.get_info())
    else:
        print("Person 타입 객체만 처리가능")

t = Teacher("이선생", 40, "수학")
s = Student("오학생", 11, 3)

print_person_info(t)
print("--------------")
print_person_info(s)
print("--------------")
print_person_info("dlkjslkjfdlksjflkjdsf")
```

```text
정보를 출력합니다.
이름: 이선생, 나이: 40, 과목: 수학
--------------
정보를 출력합니다.
이름: 오학생, 나이: 11, 학년: 3
--------------
Person 타입 객체만 처리가능
```

`print_person_info`는 `Person` 하나만 알면 되지만, `Teacher`와 `Student`가 각자 overriding한 `get_info()`가 호출된다.

```python
print(isinstance(t, Person), isinstance(t, Teacher))
print(isinstance(t, Student), isinstance("aaaa", Person))
print(isinstance(t, (Student, Teacher)))  # 둘 중 하나면 True
print(t.__dict__)  # 객체의 instance 변수들을 dict로
```

```text
True True
False False
True
{'name': '이선생', 'age': 40, 'subject': '수학'}
```

## 특수 메소드 (Special method)

Python 실행환경이 객체와 관련된 **특정 상황에서 자동으로 호출**하는 메소드다. 그 상황에서 할 일이 있으면 재정의한다.

- 메소드 이름이 **`__`로 시작하고 끝난다.** 매직 메소드, 던더(dunder, double underscore) 메소드라고도 한다.
- **정의한 메소드와 그걸 부르는 쪽이 다르다.** `__init__()`은 우리가 직접 부르지 않고, 객체를 생성할 때 Python이 부른다.
- 전체 목록: [Python 공식 문서 - 특수 메소드 이름](https://docs.python.org/ko/3/reference/datamodel.html#special-method-names)

| 특수 메소드 | 호출되는 때 |
|---|---|
| `__init__(self, ...)` | 객체를 생성할 때 |
| `__call__(self, ...)` | 객체를 **함수처럼 호출**할 때 `obj()` |
| `__str__(self)` | `str(객체)`, `print(객체)` 할 때 |

### `__call__`

```python
class Test:
    def __init__(self, num):
        self.num = num

    def __call__(self, num):
        self.num = self.num + num
        print(self.num)

t = Test(10)
t(1020)        # __call__을 정의한 클래스의 객체는 함수처럼 호출된다 (Callable)
Test(10)(20)   # 생성하자마자 호출
```

```text
1030
30
```

### `__str__`

- 객체의 attribute를 묶어 **문자열로 반환**한다.
- `str(객체)`를 호출하면 이 메소드가 불린다. `print()`도 값을 `str()`로 바꿔 출력하니 같이 적용된다.
- `__str__()`이 없으면 `__repr__()`을 부르고, 그것도 없으면 상위 클래스(`object`)의 것을 쓴다.

```python
i = 20
print(repr(str(i)))  # 다른 타입의 값을 문자열로 변환 - 값.__str__()

class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

class Person2(Person):
    def __str__(self):
        return f"이름: {self.name}, 나이: {self.age}"

print(Person("홍길동", 20))   # __str__ 없음 → object의 기본 표현
p = Person2("홍길동", 20)
r = str(p)
print(type(r), r)
print(p)
```

```text
'20'
<__main__.Person object at 0x7f55da458830>
<class 'str'> 이름: 홍길동, 나이: 20
이름: 홍길동, 나이: 20
```

`__str__`이 없으면 `<__main__.Person object at 0x...>`처럼 주소만 보인다.

### 연산자 재정의 (Operator overloading)

연산자의 피연산자로 객체를 쓰면 호출되는 메소드다. `a + b`면 **왼쪽 객체** a의 `__add__()`가 호출된다.

| 비교 연산자 | | 산술 연산자 | |
|---|---|---|---|
| `__eq__` | `self == other` | `__add__` | `self + other` |
| `__ne__` | `self != other` | `__sub__` | `self - other` |
| `__lt__` | `self < other` | `__mul__` | `self * other` |
| `__gt__` | `self > other` | `__truediv__` | `self / other` |
| `__le__` | `self <= other` | `__floordiv__` | `self // other` |
| `__ge__` | `self >= other` | `__mod__` | `self % other` |

`__eq__`는 `==`로 객체의 **내용**을 비교하고 싶을 때 정의한다. `__lt__`/`__gt__`는 `min()`, `max()`, `sorted()`에 객체를 넣을 때 필요하다.

노트북 코드는 `__init__`에 `blood_type`을 필수로 받는데, 아래에서는 `Person("홍길동", 10)`처럼 두 개만 넘겨서 다시 실행하면 `TypeError`가 난다. 노트북 출력은 `blood_type`을 추가하기 전 버전의 결과였다. 그래서 `blood_type`에 기본값을 줬고, `...`이 들어 있던 `self.boold_type_code = ["A", "B", ...]` 줄은 쓰이지 않아 뺐다.

```python
class Person:
    def __init__(self, name, age, blood_type=None):
        self.name = name
        self.age = age
        self.blood_type = blood_type

    def __str__(self):
        return f"이름: {self.name}, 나이: {self.age}"

    def __eq__(self, other):  # self == other
        print("__eq__")
        result = False
        if isinstance(other, Person):
            if self.name == other.name and self.age == other.age:
                result = True
        return result

    def __gt__(self, other):  # self > other: 나이로 비교
        print("__gt__")
        if isinstance(other, Person):
            return self.age > other.age
        elif isinstance(other, (int, float)):  # 비교 타입이 여러 개면 tuple로 묶는다
            return self.age > other

    def __mod__(self, other):  # self % other
        return f"{self.name} % {other.name}"
```

```python
p1 = Person("홍길동", 10)
p2 = Person("홍길동", 10)
p3 = Person("이순신", 30)

print(p1 == p2)   # p1.__eq__(p2)
print(p1 > p3)    # p1.__gt__(p3)
print(p1 > 40)
print(p1 % p2)
print(p1 is p2)   # 보충: is는 같은 객체인지를 본다. __eq__와 무관
```

```text
__eq__
True
__gt__
False
__gt__
False
홍길동 % 홍길동
False
```

`p1`과 `p2`는 다른 객체지만 `__eq__`에서 이름과 나이만 비교하니 `==`가 True다.

> **보충 · 처리할 수 없는 타입이면 NotImplemented**
> `__gt__`는 Person도 숫자도 아니면 아무것도 반환하지 않아서 `None`이 나온다. `p1 > "abc"`가 에러 없이 `None`이 되는 셈이다. 이럴 땐 `return NotImplemented`를 하면 Python이 "비교할 수 없다"는 `TypeError`를 내 준다.

```python
print(p1 > "abc")
```

```text
__gt__
None
```

## class 변수와 class 메소드

| | instance 변수 / 메소드 | **class 변수 / 메소드** |
|---|---|---|
| 소속 | 객체 하나하나 | **클래스 자체** |
| 개수 | 객체마다 하나씩 | 클래스당 하나 |
| 정의 | `__init__`에서 `self.변수` | class 블록에 바로 변수 선언 |
| 메소드 | 첫 parameter `self` | `@classmethod`를 붙이고 첫 parameter `cls`(클래스를 받는다) |
| 호출 | `객체.변수`, `객체.메소드()` | `클래스이름.변수`, `클래스이름.메소드()` |

모든 객체가 공유하는 상수(혈액형 종류 등)를 class 변수로 둔다.

```python
class Person:
    BLOOD_TYPE_A = "A형"
    BLOOD_TYPE_B = "B형"
    BLOOD_TYPE_AB = "AB형"
    BLOOD_TYPE_O = "O형"

    @classmethod
    def get_bloodtype_list(cls):
        return [Person.BLOOD_TYPE_A, cls.BLOOD_TYPE_AB, cls.BLOOD_TYPE_B, cls.BLOOD_TYPE_O]

    def __init__(self, name, age, blood_type):
        self.name = name
        self.age = age
        self.blood_type = blood_type

print(Person.BLOOD_TYPE_A)          # Class이름.변수명 으로 조회
Person.BLOOD_TYPE_A = "에이형"      # 변경
print(Person.BLOOD_TYPE_A)

p = Person("이순신", 30, Person.BLOOD_TYPE_AB)
print(p.blood_type)
print(Person.get_bloodtype_list())
```

```text
A형
에이형
AB형
['에이형', 'AB형', 'B형', 'O형']
```

> **보충** 노트북에는 `get_bloodtype_list()` 결과가 `['A형', ...]`으로 남아 있다. 그사이 클래스 정의 셀을 다시 실행해서 `BLOOD_TYPE_A`가 원래 값으로 돌아간 상태였기 때문이다. 순서대로 실행하면 바로 위에서 바꾼 `'에이형'`이 나온다. class 변수는 클래스당 하나라서, 한 곳에서 바꾸면 그 클래스를 쓰는 모든 곳에 반영된다.

## 정리

- 클래스는 **데이터 타입(설계도)**, instance는 그 타입의 **값**이다.
- attribute는 `__init__`에서 `self.변수 = 값`으로 초기화해 모든 객체가 같은 구성을 갖게 한다.
- 메소드의 첫 parameter `self`는 메소드를 소유한 객체다. argument는 두 번째 parameter부터 받는다.
- 상속하면 상위 클래스의 attribute와 메소드를 물려받는다. overriding한 메소드에서 원래 메소드는 `super()`로 부른다.
- `isinstance()`는 상위 클래스 타입에도 True다. 그래서 상위 타입 하나로 하위 객체들을 같이 처리할 수 있다.
- 특수 메소드는 Python이 상황에 맞춰 부른다: 생성 `__init__`, 호출 `__call__`, 문자열 변환 `__str__`, 연산자 `__eq__`, `__gt__`, `__add__` 등.
- class 변수는 클래스당 하나라서 모든 객체가 공유한다.
