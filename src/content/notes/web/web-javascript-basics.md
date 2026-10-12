---
title: "JavaScript 기본 문법: 파이썬과 비교하며 익히기"
description: "브라우저와 Node.js에서 JavaScript를 실행하는 방법(script, defer, module)부터 const·let·var, 데이터 타입과 ==/===, truthy·falsy, 함수와 화살표 함수, 배열 고차 함수(map·filter·reduce), 객체와 this, 구조 분해·전개, JSON과 예외 처리, ES 모듈의 named/default export까지 파이썬과 다른 점 위주로 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Web Frontend'
series: 'HTML·CSS·JavaScript'
seriesOrder: 2
originalNotebook: "12_web_front/Javascript (01_JavaScript.md, 실습_1)"
tags: ["Web Frontend","JavaScript"]
date: 2026-07-23T10:00:00+09:00
thumbnail: '../../../assets/images/notes/web/web-javascript-basics.webp'
---

> SKN31 웹 프론트엔드 수업 자료 `01_JavaScript.md`와 실습 파일(`실습_1/03~14`)을 바탕으로 정리했습니다.
> 실습 파일은 대부분의 예제가 주석 처리되어 있어서, 글의 출력은 예제 코드를 Node.js(v22)로 **직접 실행**한 결과입니다. 모듈 예제는 수업 때 수정한 파일을 그대로 실행했습니다.

## 이 글에서 다루는 것

- JavaScript 실행 환경과 HTML에 넣는 방법 (`<script>`, `defer`, `type="module"`)
- 변수: `const`, `let`, `var`
- 데이터 타입, `==`와 `===`, truthy·falsy, 형 변환
- 제어문과 함수, 화살표 함수
- 배열 메서드와 고차 함수
- 객체와 `this`, 구조 분해, 전개
- JSON과 예외 처리
- ES 모듈: named export와 default export

[지난 글](/notes/web/web-html-css-bootstrap)에서 HTML로 구조를, CSS로 모양을 만들었다. **JavaScript는 문서에 동작을 붙인다.** 버튼 클릭에 반응하고, 입력값을 검사하고, 서버에서 데이터를 받아 화면 일부만 바꾸는 일이다. 이번 글은 문법, 다음 글이 화면(DOM)을 다루는 부분이다.

파이썬을 이미 아는 상태라 같은 개념은 짧게, **파이썬과 다르게 동작해서 실수하기 쉬운 부분**을 길게 다룬다.

## 실행 환경과 작성 위치

| 환경 | 할 수 있는 것 |
|---|---|
| **브라우저** (Chrome, Edge...) | HTML 문서 접근, 사용자 이벤트, 네트워크 요청, 로컬 저장소 |
| **Node.js** | 브라우저 밖 실행: 웹 서버, 명령줄 프로그램, 빌드 도구 |

React·Vue.js·Svelte(UI), Express(Node.js 웹 서버), Electron(데스크톱 앱) 같은 라이브러리·프레임워크가 모두 JavaScript 위에 있다.

수업 자료에서 **"(중요!!!)"** 로 표시해 둔 부분이 코드를 HTML에 넣는 방법이다.

```html
<!-- 1. HTML 안에 직접 -->
<script>
  console.log("안녕하세요.");
</script>

<!-- 2. 외부 파일 (권장). src를 쓴 script 태그 안에는 코드를 쓰지 않는다 -->
<script src="./app.js"></script>

<!-- 3. defer: 문서를 다 읽은 뒤 실행 -->
<head>
  <script src="./app.js" defer></script>
</head>

<!-- 4. 모듈: import/export 사용 가능 -->
<script type="module" src="./main.js"></script>
```

브라우저는 `<script>`를 만나면 **HTML 파싱을 멈추고** 스크립트를 받아 실행한다. 그래서 `<head>`에 둔 스크립트가 `<body>`의 버튼을 찾으면, 아직 버튼이 만들어지지 않아 `null`이 나온다. 해결책은 두 가지다.

- `<script>`를 `</body>` 바로 앞에 둔다.
- `<head>`에 두되 **`defer`** 를 붙인다. 다운로드는 파싱과 동시에 하고, 실행은 문서를 다 읽은 뒤에 한다.

`type="module"`은 기본적으로 defer처럼 동작한다. `console.log()`는 파이썬의 `print()`이고, 브라우저에서는 개발자 도구(F12)의 Console 탭에 찍힌다.

문법의 기본 모양은 파이썬과 다르다. **들여쓰기 대신 중괄호 `{ }`** 로 블록을 만들고, 문장 끝에는 **세미콜론**을 붙이는 것이 권장된다(없어도 자동 삽입되지만 예상 못한 오류가 생길 수 있다). 주석은 `//`와 `/* */`다.

## 변수: const, let, var

| 키워드 | 재할당 | 범위 | 비고 |
|---|---|---|---|
| `const` | 불가 | 블록 | **기본으로 쓴다** |
| `let` | 가능 | 블록 | 값이 바뀌는 변수에만 |
| `var` | 가능 | 함수 | 옛 방식. 쓰지 않는다 |

```javascript
const person = { name: "홍길동", age: 20 };
person.age = 21;
console.log(person);

const PI = 3.14;
PI = 3;          // 재할당
```

```text
{ name: '홍길동', age: 21 }
TypeError: Assignment to constant variable.
```

`const`는 **변수에 다른 값을 다시 대입하는 것**을 막을 뿐, 객체 내부를 바꾸는 것은 막지 않는다. `person.age = 21`은 된다.

```javascript
console.log(typeof hoisted, hoisted);
var hoisted = 1;

console.log(blockLet);
let blockLet = 1;
```

```text
undefined undefined
ReferenceError: Cannot access 'blockLet' before initialization
```

```javascript
{ var v = "var는 블록 밖에서도"; let l = "let은 블록 안에서만"; }
console.log(v);
console.log(l);
```

```text
var는 블록 밖에서도
ReferenceError: l is not defined
```

`var`는 선언 전에 써도 에러 없이 `undefined`가 되고(호이스팅), 블록 `{}`을 무시한다. 이런 동작이 버그를 만들어서 ES6(2015)부터 `let`·`const`가 나왔다. 파이썬도 `if` 블록이 범위를 만들지 않는데, `let`·`const`는 **블록마다 범위가 생긴다**는 점이 다르다.

변수 이름은 **카멜 표기법**(`userName`, `totalPrice`)이 관례다. 파이썬의 스네이크 표기법(`user_name`)과 다르다.

## 데이터 타입

| 원시 타입 | 예 | 파이썬과 다른 점 |
|---|---|---|
| string | `"a"`, `'a'`, `` `${x}` `` | 백틱 템플릿 문자열 = f-string |
| number | `1`, `1.5` | **정수·실수 구분 없음** |
| boolean | `true`, `false` | 소문자 |
| undefined | 값이 정해지지 않음 | 파이썬에 없음 |
| null | 의도적으로 "없음" | 파이썬의 `None` |

객체 타입은 객체(`{}`), 배열(`[]`), 함수다.

```javascript
const name = "홍길동";
console.log(`이름: ${name}`, "총액: " + 10000 * 3 + "원");
console.log(typeof "a", typeof 1, typeof 1.5, typeof true, typeof undefined,
            typeof null, typeof [], typeof {}, typeof function(){});
console.log(0.1 + 0.2, 10 / 0, "abc" * 2, Number.isNaN(NaN), NaN === NaN);
```

```text
이름: 홍길동 총액: 30000원
string number number boolean undefined object object object function
0.30000000000000004 Infinity NaN true false
```

- `typeof null`이 `"object"`다. 언어 초기의 버그가 호환성 때문에 그대로 남은 것이다.
- `typeof []`도 `"object"`다. 배열인지는 `Array.isArray()`로 확인한다.
- `10 / 0`은 에러가 아니라 `Infinity`, `"abc" * 2`는 `NaN`(Not a Number). 파이썬이라면 `ZeroDivisionError`, `TypeError`가 났을 곳이다. JavaScript는 **에러 대신 이상한 값**을 내는 경우가 많다.
- `NaN === NaN`은 `false`다. NaN 확인은 `Number.isNaN()`.

### == 와 ===

```javascript
console.log(1 == "1", 1 === "1", 0 == "", 0 === "", [] == false);
console.log("5" + 3, "5" - 3, "5" * "2", true + 1);
```

```text
true false true false true
53 2 10 2
```

`==`는 비교 전에 **타입을 자동 변환**한다. `0 == ""`, `[] == false`까지 `true`다. **항상 `===`(타입까지 같아야 true)와 `!==`를 쓴다.**

`+`는 한쪽이 문자열이면 문자열 연결이라 `"5" + 3`은 `"53"`, 나머지 산술 연산자는 숫자로 바꿔 `"5" - 3`은 `2`다. 파이썬이었다면 둘 다 `TypeError`다.

### truthy와 falsy

```javascript
for (const x of [0, "", null, undefined, NaN, false, "0", [], {}]) {
  console.log(x, Boolean(x));
}
```

```text
0 false
"" false
null false
undefined false
NaN false
false false
"0" true
[] true
{} true
```

falsy는 `0`, `""`, `null`, `undefined`, `NaN`, `false` 여섯 개뿐이다. **빈 배열 `[]`과 빈 객체 `{}`는 truthy**다. 파이썬에서는 빈 리스트·빈 dict가 False라서 `if items:`로 비었는지 확인하지만, JavaScript에서는 `if (items.length)`로 써야 한다.

```javascript
console.log(0 || "기본값", "" || "기본값", 0 ?? "기본값", null ?? "기본값", "값" && "실행");
```

```text
기본값 기본값 0 기본값 실행
```

`||`는 앞이 falsy면 뒤를 돌려줘서 기본값 지정에 쓴다. 그런데 `0`이나 `""`도 기본값으로 바뀌어 버린다. **`??`(null 병합)** 은 앞이 `null`/`undefined`일 때만 뒤를 쓴다. 0이 유효한 값이면 `??`를 쓴다.

### 형 변환

```javascript
console.log(Number("12.9"), parseInt("12.9"), parseFloat("3.14abc"),
            Number("abc"), String(123) + 1, Number(""), Number(" 42 "));
```

```text
12.9 12 3.14 NaN 1231 0 42
```

`parseFloat`는 앞에서부터 읽을 수 있는 데까지 읽고, `Number`는 전체가 숫자여야 한다. `Number("")`가 `0`인 것도 함정이다. HTML 입력칸의 값은 항상 **문자열**이라, 숫자 계산 전에 반드시 변환해야 한다(다음 글의 폼 처리).

## 제어문

`if`/`else if`/`else`, `switch`, `for`, `while`, `do...while`이 있다. 조건은 괄호로 감싼다.

```javascript
const arr = ["a", "b", "c"];
for (const x of arr) console.log("of", x);
for (const i in arr) console.log("in", i, typeof i);

const obj = { name: "홍길동", age: 20 };
for (const k in obj) console.log(k, obj[k]);
```

```text
of a
of b
of c
in 0 string
in 1 string
in 2 string
name 홍길동
age 20
```

| 반복 | 순회 대상 | 파이썬 대응 |
|---|---|---|
| `for (const x of 배열)` | **값** | `for x in list` |
| `for (const k in 객체)` | **키(속성 이름)** | `for k in dict` |
| `for (let i = 0; i < n; i++)` | 인덱스 | `for i in range(n)` |

파이썬의 `for x in list`에 해당하는 것은 `in`이 아니라 **`of`** 다. 배열에 `for...in`을 쓰면 인덱스가 **문자열**(`"0"`, `"1"`)로 나온다.

## 함수

```javascript
function add(a, b = 10) { return a + b; }          // 선언문
const sub = function (a, b) { return a - b; };     // 함수 표현식
const mul = (a, b) => a * b;                        // 화살표 함수
const sq = x => x * x;                              // 매개변수 하나면 괄호 생략
const mk = () => ({ ok: true });                    // 객체를 반환할 땐 ( )로 감싼다

console.log(add(5), add(5, 1), sub(5, 3), mul(3, 4), sq(5), mk());
console.log(add(1, 2, 3, 4), add());

function sum(...nums) { return nums.reduce((acc, n) => acc + n, 0); }
console.log(sum(1, 2, 3, 4));
```

```text
15 6 2 12 25 { ok: true }
3 NaN
10
```

- 화살표 함수는 파이썬 `lambda`와 비슷하지만 여러 줄도 쓸 수 있다(`{ }` + `return`).
- `add(1, 2, 3, 4)`처럼 **인자를 더 넘겨도, `add()`처럼 덜 넘겨도 에러가 없다.** 남는 건 무시되고 모자란 건 `undefined`가 되어 `undefined + 10 = NaN`이 됐다. 파이썬이면 `TypeError`다.
- `...nums`(나머지 매개변수)는 파이썬의 `*args`다.

**콜백 함수**(다른 함수에 인자로 넘기는 함수)는 JavaScript 전체에서 가장 많이 쓰는 패턴이다. 바로 아래의 배열 메서드와 다음 글의 이벤트 처리가 모두 콜백이다.

## 배열

```javascript
const a = [1, 2, 3];
a.push(4);              console.log(a);
const last = a.pop();   console.log(last, a);
a.unshift(0);           console.log(a);
const first = a.shift(); console.log(first, a);
```

```text
[ 1, 2, 3, 4 ]
4 [ 1, 2, 3 ]
[ 0, 1, 2, 3 ]
0 [ 1, 2, 3 ]
```

| 메서드 | 동작 | 파이썬 |
|---|---|---|
| `push(x)` / `pop()` | 끝에 추가 / 끝에서 제거 | `append`, `pop()` |
| `unshift(x)` / `shift()` | 앞에 추가 / 앞에서 제거 | `insert(0, x)`, `pop(0)` |
| `slice(s, e)` | 잘라서 새 배열 | `a[s:e]` |
| `splice(s, n, ...)` | 원본에서 삭제·삽입 | `del a[s:s+n]` |
| `includes(x)` | 포함 여부 | `x in a` |
| `join("-")` | 문자열로 연결 | `"-".join(a)` (방향 반대) |

### 고차 함수

```javascript
const scores = [90, 45, 70, 85, 60];
console.log(scores.map(x => x * 2));
console.log(scores.filter(x => x >= 70));
console.log(scores.find(x => x >= 70), scores.findIndex(x => x >= 70));
console.log(scores.some(x => x < 50), scores.every(x => x >= 50));
console.log(scores.reduce((acc, x) => acc + x, 0));
```

```text
[ 180, 90, 140, 170, 120 ]
[ 90, 70, 85 ]
90 0
true false
350
```

| 메서드 | 반환 | 파이썬 |
|---|---|---|
| `map(fn)` | 변환한 새 배열 | `[f(x) for x in a]` |
| `filter(fn)` | 조건 맞는 것만 | `[x for x in a if cond]` |
| `find(fn)` / `findIndex(fn)` | 첫 번째 값 / 인덱스 | `next(...)` |
| `some(fn)` / `every(fn)` | 하나라도 / 모두 | `any()`, `all()` |
| `reduce(fn, 초기값)` | 누적 결과 하나 | `functools.reduce` |
| `forEach(fn)` | 없음(반복만) | `for` |

메서드를 이어 붙이면(method chaining) 데이터 처리가 한 줄이 된다. pandas의 체이닝과 같은 감각이다.

```javascript
const users = [{ name: "홍길동", age: 20 }, { name: "김철수", age: 17 }, { name: "이영희", age: 25 }];
console.log(users.filter(u => u.age >= 19).map(u => u.name).join(", "));
console.log([10, 1, 5, 100].sort(), [10, 1, 5, 100].sort((a, b) => a - b));
```

```text
홍길동, 이영희
[ 1, 10, 100, 5 ] [ 1, 5, 10, 100 ]
```

> **보충**: `sort()`는 기본적으로 값을 **문자열로 바꿔 사전순**으로 정렬한다. 그래서 숫자 배열이 `[1, 10, 100, 5]`가 된다. 숫자는 반드시 `(a, b) => a - b` 비교 함수를 넘긴다. 또 `sort()`는 파이썬의 `list.sort()`처럼 **원본을 바꾼다.**

## 객체

JavaScript 객체는 파이썬 dict와 비슷하지만 **속성 이름에 따옴표가 필요 없고, 점으로 접근**한다.

```javascript
// xml=tag기반-단점 무거움

// json(문자열)데이터를 교환할 때 사용, 자바스크립트의 객체에서 파생
// json => python dict/js object로 변환하여 조회
```

수업 자료의 객체 절에 적어 둔 메모다. JSON(JavaScript Object Notation)은 이름 그대로 **JavaScript 객체 문법에서 나온 데이터 교환 형식**이다. 태그로 감싸는 XML보다 가볍다. 서버와 주고받을 때는 문자열(JSON)이고, 받은 쪽에서 파이썬은 dict로, JavaScript는 객체로 바꿔 쓴다.

```javascript
const user = {
  name: "홍길동",
  age: 20,
  introduce() { return `저는 ${this.name}입니다.`; },   // 메서드
};
console.log(user.introduce(), user["name"]);
console.log(Object.keys(user), Object.entries({ a: 1, b: 2 }));

const k = "age";
console.log(user[k], user.k);
console.log(user.address, user.address?.city);
```

```text
저는 홍길동입니다. 홍길동
[ 'name', 'age', 'introduce' ] [ [ 'a', 1 ], [ 'b', 2 ] ]
20 undefined
undefined undefined
```

- 속성 이름이 **변수에 들어 있으면** `user[k]`(대괄호)를 쓴다. `user.k`는 이름이 "k"인 속성을 찾는다.
- 없는 속성은 에러(`KeyError`)가 아니라 `undefined`다.
- `?.`(옵셔널 체이닝)은 앞이 `undefined`/`null`이면 에러 없이 `undefined`를 돌려준다. `user.address.city`였다면 `TypeError`다.
- 변수 이름과 속성 이름이 같으면 `{ name, age }`처럼 줄여 쓸 수 있다(속성 단축).

### this

```javascript
const user = {
  name: "홍길동",
  introduce() { console.log(this.name); },
  arrow: () => { console.log(this.name); },
};
user.introduce();
user.arrow();

const f = user.introduce;
f();
```

```text
홍길동
undefined
undefined
```

메서드 안의 `this`는 파이썬의 `self`와 비슷하지만 **호출하는 방식에 따라** 정해진다. `user.introduce()`로 부르면 `this`는 `user`, 같은 함수를 `f()`로 떼어 부르면 `user`가 아니다. 그리고 **화살표 함수는 자기 `this`가 없어서** 바깥의 `this`를 쓴다. 수업 실습 파일의 마지막 예제가 바로 이것이다.

```javascript
{
  const user = {
    name: "홍길동",

    introduce: () => {
      console.log(this, this.name);
    },
  };

  user.introduce(); // undefined
}
```

그래서 **객체의 메서드는 일반 메서드 문법**(`introduce() { }`)으로, **콜백은 화살표 함수**로 쓰는 것이 관례다.

## 구조 분해와 전개

파이썬의 언패킹과 같은 기능이다.

```javascript
const [x, y, ...rest] = [10, 20, 30, 40];
console.log(x, y, rest);

const { name: nm, age, address = "서울" } = user;   // 이름 바꾸기, 기본값
console.log(nm, age, address);

function intro({ name, age }) { return `${name}, ${age}세`; }  // 매개변수에서 바로
console.log(intro(user));

let p = 1, q = 2;
[p, q] = [q, p];        // 값 교환
console.log(p, q);
```

```text
10 20 [ 30, 40 ]
홍길동 20 서울
홍길동, 20세
2 1
```

객체 구조 분해는 **순서가 아니라 이름**으로 꺼낸다. 함수 매개변수에서 `{ name, age }`로 받는 패턴은 React 같은 라이브러리에서 매우 자주 본다.

```javascript
const base = { name: "홍길동", age: 20 };
const copy = { ...base, age: 21, address: "서울" };
console.log(base, copy);
console.log([...[1, 2], ...[3, 4]], Math.max(...[3, 9, 2]));
```

```text
{ name: '홍길동', age: 20 } { name: '홍길동', age: 21, address: '서울' }
[ 1, 2, 3, 4 ] 9
```

`...`(전개)는 파이썬의 `{**base, "age": 21}`, `[*a, *b]`, `f(*args)`다. 뒤에 쓴 속성이 앞을 덮어써서 "복사하면서 일부만 바꾸기"에 쓴다.

> **보충**: 전개 복사는 **얕은 복사**다. `const c = {...nested}`로 복사한 뒤 `c.info.city = "부산"`으로 바꾸면 원본 `nested.info.city`도 "부산"이 된다(직접 실행해서 확인). 안쪽 객체는 같은 것을 가리키기 때문이다. 깊은 복사는 `structuredClone(obj)`를 쓴다.

## JSON과 예외 처리

```javascript
const jsonStr = JSON.stringify({ name: "홍길동", age: 20, ok: true, nothing: null, fn() {}, und: undefined });
console.log(jsonStr, typeof jsonStr);

const back = JSON.parse('{"name":"홍길동","age":20}');
console.log(back.name, typeof back);
```

```text
{"name":"홍길동","age":20,"ok":true,"nothing":null} string
홍길동 object
```

| 변환 | JavaScript | 파이썬 |
|---|---|---|
| 객체 → JSON 문자열 | `JSON.stringify(obj)` | `json.dumps(d)` |
| JSON 문자열 → 객체 | `JSON.parse(str)` | `json.loads(s)` |

함수와 `undefined` 속성은 JSON으로 바꿀 때 **빠진다.** JSON에는 그런 타입이 없기 때문이다.

```javascript
try {
  const result = JSON.parse("잘못된 JSON");
  console.log(result);
} catch (error) {
  console.error("JSON 변환에 실패했습니다.");
  console.error(error.message);
}
```

```text
JSON 변환에 실패했습니다.
Unexpected token '잘', "잘못된 JSON" is not valid JSON
```

`try...catch...finally`는 파이썬의 `try...except...finally`, `throw new Error("...")`는 `raise Exception("...")`이다.

```javascript
function divide(a, b) {
  if (b === 0) {
    throw new Error("0으로 나눌 수 없습니다.");
  }
  return a / b;
}

try {
  const result = divide(10, 0);
  console.log(result);
} catch (error) {
  console.log(error.message);
}
```

```text
0으로 나눌 수 없습니다.
```

`10 / 0`이 에러 없이 `Infinity`가 되는 언어라서, 이렇게 **직접 검사해서 throw하지 않으면** 이상한 값이 조용히 퍼진다.

> **보충**: 지난 글에서 본 [LLM 라벨 데이터](/notes/llm/sllm-dataset)처럼 작은따옴표로 된 `{'a': 1}`은 JSON이 아니다. `JSON.parse("{'a': 1}")`도 `SyntaxError: Expected property name or '}' in JSON at position 1`로 실패한다. JSON은 **반드시 큰따옴표**다.

## 모듈

파일을 기능 단위로 나누고 `export`로 내보내고 `import`로 가져온다. 이것이 표준 모듈 시스템 **ES Modules(ESM)** 다. 파이썬의 `from math import add`와 같은 역할이다.

| 방식 | 내보내기 | 가져오기 | 특징 |
|---|---|---|---|
| **Named export** | `export function add() {}` | `import { add } from "./math.js"` | 한 파일에서 여러 개. **이름이 같아야** 함 (`as`로 바꾸기 가능) |
| **Default export** | `export default class User {}` | `import User from "./User.js"` | 파일당 하나. **가져오는 쪽에서 이름을 마음대로** |

```javascript
// math.js
export function add(a, b) {
  return a + b;
}

export const PI = 3.141592;

function subtract(a, b) {
  return a - b;
}

export { subtract };
```

```javascript
// User.js
export default class User {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
}
```

수업 때 `User` 클래스에 `age`를 추가했다. JavaScript의 `class`와 `constructor`는 파이썬의 `class`와 `__init__`에 해당하고, `this.name`이 `self.name`이다.

```javascript
// node_main.js — 실행: 이 폴더에서 node node_main.js
import User from "./User.js";

const user = new User("홍길동", 25);
console.log(user.name, user.age);

// 기본 내보내기는 가져오는 쪽에서 이름을 자유롭게 정할 수 있다.
import Member from "./User.js";

const member = new Member("Lee");
console.log(member.name);

// 함수나 객체도 기본값으로 내보낼 수 있다.
import log from "./logger.js";
import config from "./config.js";

log("logger.js의 기본 내보내기 함수 실행");
console.log(config);
```

```text
홍길동 25
Lee
logger.js의 기본 내보내기 함수 실행
{ apiUrl: 'https://example.com', timeout: 3000 }
```

같은 `User` 클래스를 `User`로도 `Member`로도 가져왔다. 객체를 만들 때는 **`new`** 를 붙인다(파이썬은 `User(...)`만 쓴다). `new Member("Lee")`는 age를 넘기지 않았으니 `member.age`는 `undefined`다.

Node.js에서 `.js` 파일로 `import`를 쓰려면 같은 폴더의 `package.json`에 `"type": "module"`이 있어야 한다.

### named와 default를 섞을 때

`math.js`는 수업 중에 바뀌었다. 강사님 파일은 `export default function add`(기본 내보내기)인데, 수업 때 파일은 `export function add`(이름 있는 내보내기)로 되어 있다. 이 차이로 import 문법이 달라진다. 직접 실행해 확인하면:

```javascript
// math.js가 export default function add 일 때
import { add } from "./math.js";
```

```text
SyntaxError: The requested module './math.js' does not provide an export named 'add'
```

```javascript
// math.js가 export function add (named) 일 때
import add, { PI } from "./math.js";
```

```text
SyntaxError: The requested module './math.js' does not provide an export named 'default'
```

**중괄호 유무가 곧 export 방식**이다. `{ add }`는 named, `add`(중괄호 없음)는 default를 찾는다. 강사님 버전처럼 math.js를 default로 바꾸면 같은 폴더의 `main.js`, `index.html`에 있는 `import { add } from "./math.js"`가 위 첫 번째 에러로 깨진다. 한 파일의 export 방식을 바꾸면 그 파일을 import하는 모든 곳을 같이 바꿔야 한다.

### 브라우저에서 모듈

```html
<button id="calculate">계산</button>
<p id="result"></p>

<script type="module" src="./main.js"></script>
```

```javascript
// main.js
import { add } from "./math.js";

const button = document.querySelector("#calculate");
const result = document.querySelector("#result");

button.addEventListener("click", () => {
  result.textContent = add(10, 20);
});
```

HTML은 시작 모듈(`main.js`) 하나만 불러오고, 나머지는 `import`를 따라 브라우저가 알아서 받는다. 모듈은 HTML 파일을 더블클릭해서(`file://`) 열면 CORS 오류가 나므로, VS Code의 Live Server 같은 웹 서버로 열어야 한다.

`document.querySelector`, `addEventListener`가 다음 글의 주제다.

## 정리

| 파이썬 | JavaScript | 주의 |
|---|---|---|
| 변수 대입 | `const`(기본), `let` | `var` 쓰지 않기 |
| `None` | `null`, `undefined` | 둘 다 있음 |
| `==` | `===` | `==`는 타입 변환 |
| `if items:` | `if (items.length)` | `[]`, `{}`는 truthy |
| `for x in list` | `for (const x of arr)` | `in`은 키/인덱스 |
| `lambda x: ...` | `x => ...` | 화살표 함수는 `this` 없음 |
| `[f(x) for x in a]` | `a.map(f)` | `sort()`는 문자열 정렬 |
| `self` | `this` | 호출 방식에 따라 달라짐 |
| `*args`, `**d` | `...args`, `{...obj}` | 얕은 복사 |
| `json.dumps/loads` | `JSON.stringify/parse` | JSON은 큰따옴표 |
| `raise` | `throw new Error()` | 0 나누기는 에러가 아님 |
| `from m import f` | `import { f } from "./m.js"` | 중괄호 = named, 없음 = default |

- JavaScript는 잘못된 연산에도 **에러 대신 값**(`NaN`, `undefined`, `Infinity`, `"53"`)을 내는 경우가 많다. 결과를 찍어 확인하는 습관이 필요하다.
- `<head>`의 스크립트는 `defer`, 모듈은 웹 서버로 연다.

다음 글에서는 이벤트 처리와 DOM 조작으로 화면을 바꾼다.
