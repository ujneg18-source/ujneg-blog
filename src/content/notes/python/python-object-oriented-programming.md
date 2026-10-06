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

> 이 글은 SKN31 학습 과정에서 작성한 Jupyter Notebook을 바탕으로 정리했습니다.
> 당시 작성한 Markdown 필기와 코드 주석은 보존하고, 글의 흐름을 위해 도입·보충 설명·학습 정리를 덧붙였습니다.
> 원본 노트북: `06_객체지향프로그래밍.ipynb`

## 이 글에서 확인할 내용



- Class와 Instance의 관계를 이해한다.

- `self`와 `__init__`을 이용해 객체의 상태를 초기화한다.

- 상속, Method Overriding, `super()`의 역할을 실습한다.

- 특수 메서드와 클래스 변수·클래스 메서드를 구분한다.



## 필기를 다시 읽으며 잡은 핵심



객체지향 부분은 클래스를 단순한 문법이 아니라 상태와 기능을 함께 정의하는 설계도로 이해하는 데 초점을 맞췄다. 객체를 생성하면 메모리에 공간이 만들어지고, `__init__`이 현재 생성 중인 객체를 `self`로 받아 초기 상태를 설정하는 흐름을 주석으로 단계별 기록했다.

Person과 Student 형태의 예제에서는 상위 클래스의 속성을 재사용하면서 하위 클래스만의 속성을 추가했다. `super()`와 Method Overriding을 통해 중복을 줄이되, 하위 클래스가 필요한 동작을 다시 정의하는 과정을 확인했다.

`__dict__`, `__str__`, 비교·연산 관련 특수 메서드까지 실행하면서 Python 문법이 내부적으로 메서드 호출과 연결된다는 점도 살펴봤다. 마지막에는 모든 객체가 공유하는 클래스 변수와 인스턴스마다 독립적인 인스턴스 변수를 비교했다.

---

## 객체지향 프로그래밍 (Object Oriented Programming)

- 객체 지향 프로그래밍(Object-Oriented Programming, OOP)은 현실 세계의 개체(Object)를 소프트웨어의 객체로 모델링하여, 데이터(속성)와 그 데이터를 처리하는 동작(메서드)을 하나의 단위로 묶어 프로그램을 구성하는 프로그래밍 패러다임이다.
- 전체 프로그램을 구성하는 객체들을 식별하고, 각 객체가 가지는 데이터(속성)과 이를 처리하는 함수(메서드)를 하나의 독립된 단위로 정의한 뒤, 이 단위들을 서로 분리된 모듈로 설계하고 개발한다.
- 일반적으로 객체 지향 언어에서는 먼저 객체를 어떻게 구성할지 클래스를 정의하고, 그 클래스로부터 객체(Instance)를 생성하여 사용한다.

### Class(클래스) 정의

-   객체지향 언어에서 데이터인 **객체(instance)** 를 어떻게 구성할지 정의한 설계도/템플릿을 **클래스** 라고 한다.
-   Class에는 다음 두가지를 정의한다.
    1. **Property/Attribute**
        - 객체의 속성, 상태 값을 저장할 변수
        - 보통 class로 정의하는 data는 여러개의 값들로 구성된다. 이 값들을 저장하는 변수를 property/attribute 라고 한다.
            - **고객**: 고객ID, 패스워드, 이름, email, 주소, 전화번호, point ...
            - **제품**: 제품번호, 이름, 제조사, 가격, 재고량
        - Instance 변수라고 한다.
        - 개별 객체는 각각의 instance변수를 가진다.
    2. **Method**
        - 객체의 property/attribute 값을 처리하는 함수.
        - instance method 라고 한다.
        - 개별 객체(instance)들은 동일한 instance 메소드를 이용해 자신의 instance 변수의 값들을 처리한다.
-   객체지향 프로그래밍이란 Data와 Data를 처리하는 함수를 분리하지 않고 하나로 묶어 모듈로 개발하는 방식이다. 그래서 어떤 값들과 어떤 함수를 묶을 것인지를 class로 정의한다. 그리고 그 class로 부터 **객체(instance)** 를 생성(instantiate)해서 사용한다.
-   **class는 Data type이고 instance는 value 이다.**
    > 파이썬에서는 class에 정의된 instance변수와 method를 합쳐 **Attribute** 라고 표현한다.

#### class 정의

```python
class 클래스이름:  #선언부
    #클래스 구현
    #메소드들을 정의
```

-   **클래스 이름의 관례**
    -   **파스칼 표기법** 사용-각 단어의 첫글자는 대문자 나머진 소문자로 정의한다.
    -   ex) Person, Student, HighSchoolStudent

### Instance(객체)

-   class로 부터 생성된 값(value)로 클래스에서 정의한 attribute를 behavior를 이용해 처리한다.

#### 클래스로부터 객체(Instance) 생성

```python
변수 = 클래스이름()
```

````python
class Person:  # 선언부
    pass       # 구현부
````

````python
p1 = Person()
````

````python
p2 = Person()
p3 = Person()
p4 = Person()
````

````python
print(type(p1))
type(p1)
````

````python
print(type(30))
````

````python
class Car:
    pass
````

````python
c1 = Car()
c2 = Car()
c3 = Car()
````

### Property/Attribute(속성) - instance 변수

-   Property/attribute는 객체의 데이터, 객체를 구성하는 값들, 객체의 속성값들을 말한다.
-   값을 저장하므로 변수로 정의한다. 그래서 **instance 변수** 라고 한다.

#### 객체에 속성을 추가, 조회

-   **객체의 속성 추가(값 변경)**
    1. Initializer(생성자)를 통한 추가
        - 객체에 처음 attribute를 정의한다. 이것을 **초기화** 라고 한다.
    2. 객체.속성명 = 값 (추가/변경)
    3. 메소드를 통한 추가/변경
        - 2, 3번 방식은 initializer에서 초기화한 attribute를 변경한다.
-   **속성 값 조회**
    -   `객체.속성명`
-   `객체.___dict__`
    -   객체가 가지고 있는 Attribute들을 dictionary로 반환한다.

#### 생성자(Initializer)

-   객체를 생성할 때 호출되는 특수메소드로 attribute들 초기화에 하는 코드를 구현한다.
    -   Initializer를 이용해 초기화하는 Attribute들이 그 클래스에서 생성된 객체들이 가지는 Attribute가 된다.
    -   객체 생성후 새로운 attribute들을 추가 할 수 있지만 하지 않는 것이 좋다.
-   구문

```python
def __init__(self [,매개변수들 선언]):  #[ ] 옵션.
    # 구현 -> attribute(instance변수) 초기화
    self.속성명 = 값
```

> 변수 초기화: 처음 변수 만들어서 처음 값 대입하는 것.

````python
class Person:
    pass
````

````python
p1 = Person() # 객체를 생성
# 객체 p1에 attribute 변수를 추가
p1.name = "홍길동"
p1.age = 20
p1.address = "서울"
````

````python
print(p1.name)
print(p1.age + 5)
print(p1.address)
````

````python
p2 = Person()
p2.name = "이순신"
p2.blood_type = "B"
p2.home_town = "한산도"
````

````python
print(p2.name, p1.name)
# attribute 변경
p1.name = "유관순"
print(p2.name, p1.name)
````

````python
# initializer를 가지는 클래스
class Person:
    
    def __init__(self, name:str, age:int, address:str=None):
        # self.변수명 : instance 변수
        self.name = name # instance 변수 name(self.name) = 파라미터 name
        self.age = age
        self.address = address
        self.blood_type = None
````

````python
p1 = Person("이순신", 30, "서울")
# 1. 생성되는 객체의 변수들을 저장할 수있는 공간이 메모리(Heap)에 생성
# 2. __init__() 메소드를 호출
#     - init의 첫번째 파라미터에 현재 생성중인 객체를 전달
#     - 두번째 파라미터 부터는 생성하는 쪽에서 전달한 arguments들이 전달.
# 3. __init__()이 종료 -> 객체 생성이 완료
````

````python
p1.name, p1.age, p1.address, p1.blood_type
````

````python
p2 = Person("유관순", 22, "부산")
p2.name, p2.age, p2.address, p2.blood_type
````

````python
p3 = Person("홍길동")
````

````python
class Book:

    def __init__(self, title, publisher, author, price):
        self.title = title
        self.publisher = publisher
        self.author = author
        self.price = price
````

````python
b = Book("랭체인 실전 가이드", "루비페이퍼", "윤성재", 26000)
````

#### Instance 메소드(method)

-   객체가 제공하는 기능
-   객체의 attribute 값을 처리하는 기능을 구현한다.
-   구문

```python
def 이름(self [, 매개변수들 선언]):
    # 구현
    # attribute 사용(조회/대입)
    self.attribute
```

-   self 매개변수 - 메소드를 소유한 객체를 받는 변수 - 호출할 때 전달하는 argument를 받는 매개변수는 두번째 부터 선언한다.<br><br>
    ![self](/images/python/ch06_01.png)
-   **메소드 호출**
    -   `객체.메소드이름([argument, ...])`

#### instance 메소드의 self parameter

-   메소드는 반드시 한개 이상의 parameter를 선언해야 하고 그 첫번째 parameter는 **관례적으로** 변수명을 `self`로 한다.
-   메소드 호출시 그 메소드를 소유한 instance가 self parameter에 할당된다.
    -   메소드 안에서 self는 instance를 가리키며 그 instance에 정의된 attribute나 method를 호출 할 때 사용한다.
-   **Initializer의 self**
    -   현재 만들어 지고 있는 객체를 받는다.
-   **메소드의 self**
    -   메소드를 소유한 객체를 받는다.
-   Caller에서 생성자/메소드에 전달된 argument들을 받을 parameter는 두번째 변수부터 선언한다.

````python
class Person:
    
    def __init__(self, name:str, age:int, address:str=None):
        # self.변수명 : instance 변수
        self.name = name # instance 변수 name(self.name) = 파라미터 name
        self.age = age
        self.address = address
        self.blood_type = None

    # 메소드 정의 - 객체가 제공하는 기능(함수). -> instance 변수를 주로 처리한다.
    def get_info(self) -> str:
        """
        Person 객체의 모든 정보를 반환하는 메소드
        Args:
            self (Person) - 처리할 Person 객체
        Returns:
            str: Person의 이름, 나이, 주소, 혈액형을 하나의 문자열로 합쳐서 반환.
        """
        info = f"이름: {self.name}, 나이: {self.age}, 주소: {self.address}, 혈액형: {self.blood_type}"
        return info
    
    def save_info(self):
        """
        Person 객체의 정보를 파일에 저장하는 메소드.
        Args:
            self(Person): 저장할 정보를 가지고있는 Person객체
        """
        # 같은 객체의 메소드를 호출
        info = self.get_info()
        print(f"다음 내용을 저장했습니다./n{info}")

    def set_age(self, age):
        """
        나이를 변경하는 메소드
        Args:
            age(int): 변경할 값
        """
        if age >= 0:
            self.age = age
        else:
            print("나이는 0이상만 가능")
````

````python
p1 = Person("홍길동", 20, "서울")
# instance변수 blood_type 값을 대입
p1.blood_type = "B"
````

````python
# 메소드 호출 - 객체.메소드이름(파라미터)
info = p1.get_info()
print(info)
````

````python
p1.save_info()
````

````python
p1.set_age(40)
````

````python
p1.age, p1.get_info()
````

````python
p1.set_age(-20)
p1.age
````

````python
s = "aaaa"
s.save_info()  # s: str
````

````python
s = "abc"
s.upper()

s2 = "def"
s2.upper()
````

````python
class str:

    def upper(self):
        self.문자열 -> 대문자
````

### 상속 (Inheritance)

-   기존 클래스를 확장하여 새로운 클래스를 구현한다.
    -   생성된 객체(instance)가 기존 클래스에 정의된 Attribute나 method를 사용할 수있고 그 외의 추가적인 attribute와 method들을 가질 수 있는 클래스를 구현하는 방법.
    -   같은 category의 클래스들을 하나로 묶어주는 역할을 한다.
-   **기반(Base) 클래스, 상위(Super) 클래스, 부모(Parent) 클래스**
    -   물려 주는 클래스.
    -   상속하는 클래스에 비해 더 추상적인 클래스가 된다.
    -   상속하는 클래스의 데이터 타입이 된다.
-   **파생(Derived) 클래스, 하위(Sub) 클래스, 자식(Child) 클래스**
    -   상속하는 클래스.
    -   상속을 해준 클래스 보다 좀더 구체적인 클래스가 된다.
-   상위 클래스와 하위 클래스는 계층관계를 이룬다.
    -   상위 클래스는 하위 클래스 객체의 타입이 된다.
-   다중상속
    -   하나의 클래스가 여러 클래스를 상속받아 정의 하는 것을 다중상속이라고 하며 **파이썬은 다중상속이 가능하다.**
-   MRO (Method Resolution Order)
    -   다중상속시 메소드 호출할 때 그 메소드를 찾는 순서.
    1. 자기 자신
    2. 상위클래스(하위에서 상위로 올라간다)
        - 다중상속의 경우 먼저 선언한 클래스 부터 찾는다. (왼쪽->오른쪽)
-   MRO 순서 조회
    -   Class이름.mro()
-   `object` class
    -   모든 클래스의 최상위 클래스
    -   상속 하지 않은 클래스는 `object` 를 상속받는다.
    -   special method, special attribute 를 정의 하고 있다.

```python
class Parent1:
    ...

class Parent2:
    ...

class Sub(Parent1, Parent2):
    ...
```

````python
class Person:    
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def get_info(self):
        # 그 사람의 정보를 반환.
        return f"이름: {self.name}, 나이: {self.age}"
    
    def add_age(self, age):
        self.age += age
````

````python
class Student(Person):
    def __init__(self, name, age, grade):
        # self.name = name
        # self.age = age
        # name과 age는 Person의 initializer를 호출해서 설정
        super().__init__(name, age) # super(): 상위클래스 -> 상위클래스(Person)의 __init__()호출

        # grade: Student의 속성
        self.grade = grade

    def add_grade(self, grade):
        self.grade += grade

    # super().상위클래스 메소드(). 상위 instance 변수: self.변수명
    def get_info(self):
        # self.name, self.age, self.grade

        basic_info = super().get_info()  # Person.get_info()를 호출 -> name, age제공
        return f"{basic_info}, 학년: {self.grade}"
````

````python
class Teacher(Person):
    def __init__(self, name, age, subject):
 
        # self.name = name
        # self.age = age
        super().__init__(name, age)
        self.subject = subject

    def change_subject(self, subject):
        self.subject = subject

    def get_info(self):
        return f"{super().get_info()}, 과목: {self.subject}"
````

````python
t = Teacher("김선생", 30, "국어")
print(t.name, t.age, t.subject)
t.change_subject("파이썬")
print(t.name, t.age, t.subject)

t.add_age(5)
print(t.name, t.age, t.subject)

print(t.get_info())
````

````python
s = Student("박학생", 15, 3)
print(s.name, s.age, s.grade)

s.add_grade(5)
print(s.name, s.age, s.grade)

print(s.get_info())
````

````python
s.add_age(-2)
print(s.name, s.age, s.grade)
````

#### Method Overriding (메소드 재정의)

상위 클래스에 정의한 메소드의 구현부를 하위 클래스에서 다시 구현하는 것.
상위 클래스는 모든 하위 클래스들에 적용할 수 있는 추상적인 구현 밖에는 못한다.  
하위 클래스에서 그 기능을 자신에 맞게 좀 더 구체적으로 재구현할 수 있게 해주는 것을 Method Overriding이라고 한다.

-   방법: 메소드 선언은 동일하게 하고 구현부는 새롭게 구현한다.

#### super() 내장함수

-   하위 클래스에서 **상위 클래스의 instance를** 사용할 수있도록 해주는 함수. 상위클래스에 정의된 instance 메소드를 호출할 때 사용한다.
-   구문

```python
super().메소드명()
```

-   상위 클래스의 Instance 메소드를 호출할 때 – super().메소드()
    -   특히 method overriding을 한 하위 클래스에서 상위 클래스의 원본 메소드를 호출 할 경우 반드시 `super().메소드() `형식으로 호출해야 한다.
-   메소드에서
    -   self.xxxx : 같은 클래스에 정의된 메소드나 attribute(instance 변수) 호출
    -   super().xxxx : 부모클래스에 정의된 메소드나 attribute(부모객체의 attribute) 호출

### 객체 관련 유용한 내장 함수, 특수 변수

-   **`isinstance(객체, 클래스이름-datatype)`** : bool
    -   객체가 두번째 매개변수로 지정한 클래스의 타입이면 True, 아니면 False 반환
    -   여러개의 타입여부를 확인할 경우 class이름(type)들을 **튜플(tuple)로** 묶어 준다.
    -   상위 클래스는 하위 클래스객체의 타입이 되므로 객체와 그 객체의 상위 클래스 비교시 True가 나온다.
-   **`객체.__dict__`**
    -   객체가 가지고 있는 Attribute 변수들과 대입된 값을 dictionary에 넣어 반환

````python
def print_person_info(person:Person):
    """
    Person type의 객체(Person 과 그 하위 클래스들로 부터 생성된 객체)를 받아서
    그 객체의 정보를 조회(get_info())해서 출력하는 함수.
    """
    if isinstance(person, Person):
        info = person.get_info()
        print("정보를 출력합니다.")
        print(info)
    else:
        print("Person 타입 객체만 처리가능")
````

````python
t = Teacher("이선생", 40, "수학")
s = Student("오학생", 11, 3)

print_person_info(t)
print("--------------")
print_person_info(s)
````

````python
print_person_info("dlkjslkjfdlksjflkjdsf")
````

````python
isinstance(t, Person)
isinstance(t, Teacher)
isinstance(t, Student)
isinstance("aaaa", Person)
````

````python
t.__dict__
# 객체(의 instance 변수들)를 dictionary로 변환.
````

### 특수 메소드(Special method)

#### 특수 메소드란

-   파이썬 실행환경(Python runtime)이 객체와 관련해서 특정 상황 발생하면 호출 하도록 정의한 메소드들. 그 특정상황에서 처리해야 할 일이 있으면 구현을 재정의 한다.
    -   객체에 특정 기능들을 추가할 때 사용한다.
    -   정의한 메소드와 그것을 호출하는 함수가 다르다.
        -   ex) `__init__()` => **객체 생성할 때** 호출 된다.
-   메소드 명이 더블 언더스코어로 시작하고 끝난다.
    -   ex) `__init__(), __str__()`
-   매직 메소드(Magic Method), 던더(DUNDER) 메소드라고도 한다.
-   특수메소드 종류
    -   https://docs.python.org/ko/3/reference/datamodel.html#special-method-names

#### 주요 특수메소드

-   **`__init__(self [, …])`**
    -   Initializer
    -   객체 생성시 호출 된다.
    -   객체 생성시 Attribute의 값들을 초기화하는 것을 구현한다.
    -   self 변수로 받은 instance에 Attribute를 설정한다.
-   **`__call__(self [, …])`**
-   객체를 함수처럼 호출 하면 실행되는 메소드
    -   Argument를 받을 Parameter 변수는 self 변수 다음에 필요한대로 선언한다.
    -   처리결과를 반환하도록 구현할 경우 `return value` 구문을 넣는다. (필수는 아니다.)

````python
class Test:

    def __init__(self, num):
        self.num = num

    def __call__(self, num):
        self.num = self.num + num
        print(self.num)
````

````python
t = Test(10)
t(1020)  # __call__()을 정의한 클래스: Callable 타입
````

````python
Test(10)(20)
````

-   **`__str__(self)`**
    -   Instance(객체)의 Attribute들을 묶어서 문자열로 반환한다.
    -   내장 함수 **str(객체)** 호출할 때 이 메소드가 호출 된다.
        -   str() 호출할 때 객체에 `__str__()`의 정의 안되 있으면 `__repr__()` 을 호출한다. `__repr__()`도 없으면 상위클래스에 정의된 `__str__()`을 호출한다.
        -   print() 함수는 값을 문자열로 변환해서 출력한다. 이때 그 값을 str() 에 넣어 문자열로 변환한다.

````python
i = 20
str(i)  # 다른 타입의 값을 문자열로 변환. - 값.__str__()
#
````

````python
class Person:    
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def get_info(self):
        # 그 사람의 정보를 반환.
        return f"이름: {self.name}, 나이: {self.age}"
    
    def add_age(self, age):
        self.age += age

    def __str__(self):
        return f"이름: {self.name}, 나이: {self.age}"
````

````python
p = Person("홍길동", 20)
r = str(p)
print(type(r), r)
print(p)
````

##### 연산자 재정의(Operator overriding) 관련 특수 메소드

-   연산자의 피연산자로 객체를 사용하면 호출되는 메소드들
-   다항연산자일 경우 가장 왼쪽의 객체에 정의된 메소드가 호출된다.
    -   `a + b` 일경우 a의 `__add__()` 가 호출된다.
-   **비교 연산자**
    -   **`__eq__(self, other)`** : self == other
        -   == 로 객체의 내용을 비교할 때 정의 한다.
    -   **`__lt__(self, other)`** : self < other,
    -   **`__gt__(self, other)`**: self > other
        -   min()이나 max()에서 인수로 사용할 경우 정의해야 한다.
    -   **`__le__(self, other)`**: self <= other
    -   **`__ge__(self, other)`**: self >= other
    -   **`__ne__(self, other)`**: self != other

````python
Person(...., "B형", "B", "비형")
````

````python
class Person:    
    def __init__(self, name, age, blood_type):
        self.name = name
        self.age = age
        self.blood_type = blood_type
        self.boold_type_code = ["A","B", ...]
    
    def add_age(self, age):
        self.age += age

    def __str__(self):
        return f"이름: {self.name}, 나이: {self.age}"
    
    def __eq__(self, other):
        # self == other
        print("__eq__")
        result = False
        if isinstance(other, Person):
            if self.name == other.name and self.age == other.age:
                result = True

        return result
    
    def __gt__(self, other):
        # self > other  # self.age와 other.age
        print("__gt__")
        if isinstance(other, Person):
            return self.age > other.age
        elif isinstance(other, (int, float)): # 비교 타입이 여려개일때 tuple로 묶어준다.
            return self.age > other
        
    
    def __mod__(self, other):
        # self % other
        return f"{self.name} % {other.name}"
````

````python
p1 = Person("홍길동", 10)
p2 = Person("홍길동", 10)
p3 = Person("이순신", 30)
p1 == p2     # p1.__eq__(p2)
p1 > p3
p1 > 40
p1 % p2
````

-   **산술 연산자**
    -   **`__add__(self, other)`**: self + other
    -   **`__sub__(self, other)`**: self - other
    -   **`__mul__(self, other)`**: self \* other
    -   **`__truediv__(self, other)`**: self / other
    -   **`__floordiv__(self, other)`**: self // other
    -   **`__mod__(self, other)`**: self % other

## class변수, class 메소드

-   **class변수**
    -   (Intance가 아닌) 클래스 자체의 데이터
    -   Attribute가 객체별로 생성된다면, class변수는 클래스당 하나가 생성된다.
    -   구현
        -   class 블럭에 변수 선언.
-   **class 메소드**
    -   클래스 변수를 처리하는 메소드
    -   구현
        -   @classmethod 데코레이터를 붙인다.
        -   첫번째 매개변수로 클래스를 받는 변수를 선언한다. 이 변수를 이용해 클래스 변수나 다른 클래스 메소드를 호출 한다.

### class 메소드/변수 호출

-   클래스이름.변수
-   클래스이름.메소드()

````python
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
    
    def add_age(self, age):
        self.age += age

    def __str__(self):
        return f"이름: {self.name}, 나이: {self.age}"
    
    def __eq__(self, other):
        # self == other
        print("__eq__")
        result = False
        if isinstance(other, Person):
            if self.name == other.name and self.age == other.age:
                result = True

        return result
    
    def __gt__(self, other):
        # self > other  # self.age와 other.age
        print("__gt__")
        if isinstance(other, Person):
            return self.age > other.age
        elif isinstance(other, (int, float)): # 비교 타입이 여려개일때 tuple로 묶어준다.
            return self.age > other
        
    
    def __mod__(self, other):
        # self % other
        return f"{self.name} % {other.name}"
````

````python
# Class변수 조회/변경 Class이름.변수명
Person.BLOOD_TYPE_A
Person.BLOOD_TYPE_A = "에이형"
Person.BLOOD_TYPE_A
````

````python
p = Person("이순신", 30, Person.BLOOD_TYPE_AB)
p.blood_type
````

````python
Person.get_bloodtype_list()
````

---

## 학습 정리



- Class는 객체의 상태와 기능을 정의하고 Instance는 그 설계로 생성된 실제 객체다.

- `self`는 현재 메서드를 호출한 객체를 가리킨다.

- 상속은 공통 동작을 재사용하고 Overriding은 하위 타입의 동작을 구체화한다.

- 특수 메서드를 구현하면 출력, 비교, 연산과 같은 Python 기본 동작을 객체에 연결할 수 있다.
