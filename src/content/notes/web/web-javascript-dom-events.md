---
title: "이벤트와 DOM: 화면을 바꾸는 JavaScript"
description: "addEventListener와 이벤트 객체(target·currentTarget), input·change 이벤트, submit의 기본 동작을 막는 preventDefault, 이벤트 버블링과 위임, DOM 트리와 querySelector·NodeList, textContent와 innerHTML, 속성·classList·style·dataset 변경, 요소 생성·삽입·삭제·교체까지 실습 파일을 jsdom으로 실행한 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Web Frontend'
series: 'HTML·CSS·JavaScript'
seriesOrder: 3
originalNotebook: "12_web_front/Javascript (02_JavaScript.md 15~17장, 실습_2/15·17_x)"
tags: ["Web Frontend","JavaScript"]
date: 2026-07-24T10:00:00+09:00
thumbnail: '../../../assets/images/notes/web/web-javascript-dom-events.webp'
---

> SKN31 웹 프론트엔드 수업 자료 `02_JavaScript.md`(15~17장)와 실습 파일(`실습_2/15_event_handling`, `17_1~17_3`)을 바탕으로 정리했습니다.
> 브라우저 대신 Node.js(v22) + jsdom으로 실습 HTML·JS를 불러와 버튼 클릭과 입력을 흉내 내어 **직접 실행**했습니다. 글의 `[console]` 출력은 그 결과이며, 화면 렌더링(색, 크기)은 확인할 수 없어서 DOM 상태(속성값, innerHTML)로 대신 보여 줍니다.

## 이 글에서 다루는 것

- 이벤트 등록(`addEventListener`)과 이벤트 객체(`target`, `currentTarget`)
- `input`과 `change`의 차이
- `preventDefault()`로 submit 기본 동작 막기
- 이벤트 버블링과 이벤트 위임
- DOM 트리와 요소 선택(`querySelector`, `querySelectorAll`, `NodeList`)
- 내용 바꾸기: `textContent` vs `innerHTML`
- 속성·클래스·스타일·`dataset` 변경
- 요소 생성·삽입·삭제·교체

[지난 글](/notes/web/web-javascript-basics)이 문법이었다면 이번 글부터 JavaScript가 **화면을 건드린다.** 흐름은 항상 같다.

1. `querySelector`로 요소를 찾는다.
2. `addEventListener`로 "이 일이 생기면 이 함수를 실행해"라고 등록한다.
3. 함수 안에서 DOM을 바꾼다.

실습 파일도 모두 이 구조다. 위에서 요소를 찾고 함수를 정의한 뒤, 맨 아래에서 이벤트를 몰아서 등록한다. 스크립트는 `<head>`에 `defer`로 들어가 있어서 HTML 분석이 끝난 뒤 실행된다.

```html
<script src="./scripts/15_event_handling.js" defer></script>
```

## 이벤트 등록

이벤트는 클릭, 입력, 문서 로딩처럼 브라우저에서 일어나는 동작이다.

| 이벤트 | 발생 시점 |
|---|---|
| `click` | 요소 클릭 |
| `input` | 입력값이 바뀔 때마다 |
| `change` | 입력이 끝나고 포커스를 잃을 때(값 확정) |
| `focus` / `blur` | 포커스를 얻을 때 / 잃을 때 |
| `keydown` / `keyup` | 키를 누를 때 / 뗄 때 |
| `submit` | 폼 제출 |
| `DOMContentLoaded` | HTML 분석 완료 |

`요소.addEventListener(이벤트명, 처리함수)`로 등록한다. 처리 함수는 **호출하지 않고 함수 자체를 넘긴다**(`showClickMessage()`가 아니라 `showClickMessage`).

```javascript
// 15.1 이벤트 등록
const confirmButton = document.querySelector("#confirm-button");
const clickResult = document.querySelector("#click-result");

let clickCount = 0;

function showClickMessage() {
  clickCount = clickCount + 1;
  clickResult.textContent = `버튼을 ${clickCount}번 클릭했습니다.`;
  console.log("클릭 횟수:", clickCount);
}

// ...
confirmButton.addEventListener("click", showClickMessage);
```

> **인라인 이벤트 처리**: `<button onclick="checkValue();">`처럼 태그의 `on이벤트` 속성에 코드를 넣는 옛 방식도 동작한다. 현대 웹 개발에서는 권장하지 않고 `addEventListener()`를 쓴다. HTML(구조)과 JS(동작)가 섞이고, 한 이벤트에 함수를 여러 개 붙일 수 없기 때문이다.

### 이벤트 객체

처리 함수의 첫 번째 매개변수로 **이벤트 객체**가 들어온다. 파이썬 콜백과 달리 받을지 말지는 선택이다(위 `showClickMessage`는 안 받았다).

```javascript
// 15.2 이벤트 객체
function showEventInfo(event) {
  console.log("이벤트 이름(event.type):", event.type);
  console.log("이벤트가 시작된 요소(event.target):", event.target);
  console.log("처리 함수가 등록된 요소(event.currentTarget):", event.currentTarget);

  eventInfoResult.textContent = `이벤트 이름: ${event.type} / 발생 한 소스 노드: ${event.target.tagName}`;
}
```

직접 실행(버튼 클릭):

```text
[console] 이벤트 이름(event.type): click
[console] 이벤트가 시작된 요소(event.target): <button id="event-info-button" type="button">이벤트 정보 보기</button>
[console] 처리 함수가 등록된 요소(event.currentTarget): <button id="event-info-button" type="button">이벤트 정보 보기</button>
```

| 속성 | 의미 |
|---|---|
| `event.type` | 이벤트 이름(`"click"`) |
| `event.target` | 이벤트가 **실제로 시작된** 요소 |
| `event.currentTarget` | 지금 실행 중인 처리 함수가 **등록된** 요소 |

버튼에 직접 등록했으니 둘이 같다. 둘이 달라지는 경우는 아래 버블링에서 본다.

### input과 change

```javascript
// 15.3 입력 이벤트
function showCurrentInputValue(event) {
  const currentValue = event.target.value;
  
  inputResult.textContent = `현재 입력값: ${currentValue}`;
  console.log("현재 입력값:", currentValue);
}

nameInput.addEventListener("input", showCurrentInputValue);
```

직접 실행("홍" → "홍길" 입력):

```text
[console] 현재 입력값: 홍
[console] 현재 입력값: 홍길
```

`input`은 글자가 바뀔 때마다 발생한다. 강사님 파일은 수업 중 이 줄을 `"change"`로 바꿔서 비교했는데, `change`로 등록하면 타이핑 중에는 아무 일도 없다가 **입력창 밖을 클릭해 포커스를 잃을 때 한 번** 실행된다.

| | `input` | `change` |
|---|---|---|
| 발생 | 값이 바뀔 때마다 | 값이 확정될 때(포커스 아웃) |
| 쓰임 | 실시간 검색, 글자 수 표시 | 최종 값 검증, select·checkbox |

> **보충**: `value`는 `type="number"`인 입력창에서도 **문자열**이다. 계산하려면 `Number()`로 바꾸거나 `event.target.valueAsNumber`를 쓴다.

## 기본 동작 막기 (중요! = submit)

링크를 누르면 이동하고, 폼을 제출하면 페이지가 새로 요청된다. 이런 **브라우저 기본 동작**을 `event.preventDefault()`로 취소한다. 수업에서 "중요"라고 강조한 이유는 폼 때문이다. 폼의 기본 동작은 입력값을 `action` 주소로 보내고 **페이지 전체를 새로 고치는 것**이라, 그대로 두면 JavaScript가 입력값을 검사하거나 비동기로 보낼 틈이 없다.

강사님 HTML은 이걸 눈으로 보이려고 폼에 `action="https://www.naver.com"`을 달아 두었다. `preventDefault()`를 빼면 제출 버튼을 누르는 순간 네이버로 이동한다.

```html
<!-- 강사님 파일 -->
<form id="simple-form" action="https://www.naver.com">
```

```javascript
// 15.4 기본 동작 막기
function handleFormSubmit(event) {
  event.preventDefault(); // 페이지 새로고침(기본 동작)을 막는다.
  
  submitResult.textContent = `제출된 메시지: ${messageInput.value}`;
  console.log("폼 제출을 JavaScript에서 처리했습니다. 메시지:", messageInput.value);
}

simpleForm.addEventListener("submit", handleFormSubmit);
```

직접 실행("안녕" 입력 후 submit 이벤트 발생):

```text
[console] 폼 제출을 JavaScript에서 처리했습니다. 메시지: 안녕
defaultPrevented: true
```

두 가지를 기억하면 된다.

- 등록 대상은 **버튼의 click이 아니라 form의 submit**이다. 엔터 키로 제출해도 submit은 발생하지만 버튼 click은 아니다.
- `preventDefault()`는 함수 **맨 앞**에 둔다. 중간에 에러가 나면 그 아래 줄은 실행되지 않아 페이지가 그대로 넘어가 버린다.

내 HTML에서는 입력창을 `<label>`로 감싸면서 그 안에 `<label for>`를 또 넣었다.

```html
<form id="simple-form">
  <label>
    <label for="message-input">메세지</label>
    <input id="message-input" name="message" type="text">
  </label>
  <button type="submit">제출</button>
</form>
```

> **보충**: `<label>` 안에 `<label>`을 넣는 것은 HTML 규칙 위반이다(화면은 똑같이 보인다). 레이블은 `<label>이름 <input></label>`처럼 감싸거나 `<label for="id">` + `<input id="id">`로 연결하거나 **둘 중 하나**만 쓴다.

## 이벤트 전파 (개념 확인)

중첩된 요소에서 이벤트가 나면 시작된 안쪽 요소부터 **바깥쪽 조상으로 차례로 전달**된다. 이것이 **버블링**이다. `div > ul > li > span` 구조에 모두 click 처리 함수를 달고 `span`을 클릭해 보면 순서가 보인다.

```javascript
const log = (name) => e =>
  console.log(`${name}: target=${e.target.tagName}, currentTarget=${e.currentTarget.id || e.currentTarget.tagName}`);

li.addEventListener("click", log("li"));
ul.addEventListener("click", log("ul"));   // id="list"
div.addEventListener("click", log("div")); // id="outer"

span.click();
```

직접 실행:

```text
li: target=SPAN, currentTarget=LI
ul: target=SPAN, currentTarget=list
div: target=SPAN, currentTarget=outer
```

`target`은 끝까지 클릭한 `SPAN`이고, `currentTarget`만 올라가면서 바뀐다. 중간에서 `event.stopPropagation()`을 호출하면 거기서 멈춘다.

```text
--- li에서 stopPropagation
li: target=SPAN, currentTarget=LI
```

| 메서드 | 막는 것 |
|---|---|
| `preventDefault()` | 브라우저 **기본 동작**(이동, 제출) |
| `stopPropagation()` | 조상으로의 **전파** |

둘은 서로 관계가 없다. `preventDefault()`를 해도 버블링은 계속되고, `stopPropagation()`을 해도 폼은 제출된다.

### 이벤트 위임

버블링 덕분에 자식마다 처리 함수를 달 필요 없이 **부모 하나에 등록하고 `event.target`으로 어떤 자식인지 구분**할 수 있다. 이것이 이벤트 위임이다.

```html
<ul id="user-list">
  <li data-user-id="1">홍길동</li>
  <li data-user-id="2">이순신</li>
  <li data-user-id="3">강감찬</li>
</ul>
```

```javascript
// 15.5 이벤트 전파(이벤트 위임)
function showClickedUser(event) {
  const item = event.target.closest("li");

  if (!item) {
    return;
  }

  delegationResult.textContent = `선택한 사용자: ${item.textContent} (id: ${item.dataset.userId})`;
  console.log("클릭한 사용자 id:", item.dataset.userId);
}

userList.addEventListener("click", showClickedUser);
```

직접 실행(두 번째 `li` 클릭):

```text
[console] 클릭한 사용자 id: 2
```

- `closest("li")`는 자기 자신부터 부모 방향으로 올라가며 선택자에 맞는 첫 요소를 찾는다. `li` 안에 `<span>`이나 아이콘이 있어서 `target`이 그 안쪽 요소여도 `li`를 잡는다.
- `ul`의 빈 여백을 클릭하면 `li`가 없으니 `null`이고, 그래서 `if (!item) return;`이 필요하다.
- 가장 큰 장점은 **나중에 추가된 자식에도 그대로 동작**한다는 것이다. 이 장점은 아래 할 일 목록 실습에서 직접 쓴다.

## DOM 기초

DOM(Document Object Model)은 브라우저가 HTML을 분석해 만든 **객체 트리**다. 태그는 Element 노드, 태그 안의 글자는 Text 노드가 되고, 부모·자식 관계로 연결된다.

```html
<html>
  <head></head>
  <body>
    <h1>제목</h1>
    <p>내용</p>
  </body>
</html>
```

```text
Document
└─ html (Element)
   ├─ head (Element)
   └─ body (Element)
      ├─ h1 (Element)
      │  └─ "제목" (Text)
      └─ p (Element)
         └─ "내용" (Text)
```

JavaScript가 바꾸는 것은 HTML 파일이 아니라 이 트리다. 트리가 바뀌면 브라우저가 화면을 다시 그린다. 새로고침하면 파일에서 트리를 다시 만들기 때문에 JavaScript로 바꾼 내용은 사라진다.

> **보충**: 위 그림은 단순화한 것이다. 실제 트리에는 태그 사이의 **줄바꿈·들여쓰기도 Text 노드로 들어간다.** 이 차이는 아래 요소 삭제에서 실제로 드러난다.

## 요소 선택

CSS 선택자 문법 그대로 찾는다. [첫 글](/notes/web/web-html-css-bootstrap)의 선택자가 여기서 다시 쓰인다.

| 메서드 | 반환 | 못 찾으면 |
|---|---|---|
| `querySelector(선택자)` | 첫 번째 Element | `null` |
| `querySelectorAll(선택자)` | 모든 Element의 `NodeList` | 길이 0인 `NodeList` |

```javascript
// 17.1.1 querySelector() — 하나의 요소 선택
function selectSingleElements() {
  const title = document.querySelector("h3");            // 태그 선택자
  const paragraph = document.querySelector("#target-paragraph"); // 아이디 선택자
  const firstItem = document.querySelector(".item");     // 클래스 선택자

  console.log("태그 선택자(h3)로 찾은 요소:", title);
  console.log("아이디 선택자(#target-paragraph)로 찾은 요소:", paragraph);
  console.log("클래스 선택자(.item)로 찾은 요소:", firstItem);

  // 일치하는 요소가 없으면 null을 반환한다.
  const missing = document.querySelector("#not-exist");
  console.log("없는 요소를 찾은 결과:", missing);
}
```

직접 실행:

```text
[console] 태그 선택자(h3)로 찾은 요소: <h3>연습용 제목</h3>
[console] 아이디 선택자(#target-paragraph)로 찾은 요소: <p id="target-paragraph">아이디 선택자로 찾을 문단입니다.</p>
[console] 클래스 선택자(.item)로 찾은 요소: <p class="item">클래스가 item인 첫 번째 문단입니다.</p>
[console] 없는 요소를 찾은 결과: null
```

`null`이 돌아온 상태로 `.textContent`나 `.addEventListener`를 호출하면 `TypeError: Cannot read properties of null`이 난다. 선택자 오타(`#`·`.` 빠뜨림)나 `defer` 없이 `<head>`에서 실행한 경우 이 에러를 가장 많이 본다.

> 강사님 HTML에는 `class="item"` 문단이 세 개 있고 내 파일에는 첫 번째만 남아 있다. `querySelector(".item")`은 어차피 첫 번째만 찾으므로 결과는 같다.

### NodeList는 배열이 아니다

```javascript
// 17.1.2 querySelectorAll() — 모든 요소 선택
function selectAllFruits() {
  const fruits = document.querySelectorAll(".fruit");

  console.log("찾은 요소 개수(length):", fruits.length);

  fruits.forEach(fruit => {
    console.log("fruit 항목:", fruit.textContent);
  });
  // ...
}

// 17.1.3 NodeList와 배열의 차이
function checkNodeListType() {
  const fruits = document.querySelectorAll(".fruit");

  console.log("NodeList가 배열인가?", Array.isArray(fruits)); // false

  // 전개 구문으로 NodeList를 새 배열로 변환한다.
  const fruitArray = [...fruits];

  console.log("변환한 결과가 배열인가?", Array.isArray(fruitArray)); // true

  // 배열이 되면 map() 같은 배열 메서드를 사용할 수 있다.
  const fruitNames = fruitArray.map(fruit => fruit.textContent);
  console.log("과일 이름 배열:", fruitNames);
}
```

직접 실행:

```text
[console] 찾은 요소 개수(length): 3
[console] fruit 항목: 사과
[console] fruit 항목: 바나나
[console] fruit 항목: 포도
[console] NodeList가 배열인가? false
[console] 변환한 결과가 배열인가? true
[console] 과일 이름 배열: ["사과","바나나","포도"]
```

`NodeList`는 `length`, `forEach()`, 인덱스 접근은 되지만 `map()`, `filter()`는 없다. 필요하면 `[...nodeList]`나 `Array.from(nodeList)`로 바꾼다.

## 내용 바꾸기: textContent와 innerHTML

```javascript
// 17.2 텍스트 변경 (textContent)
function changeTextContent() {
  // 태그 문자열을 넣어도 HTML로 해석하지 않고 글자 그대로 표시한다.
  textTarget.textContent = "변경된 텍스트 <strong>태그도 글자로 표시</strong>";
  console.log("textContent로 텍스트를 변경했습니다.");
}

// 17.3 HTML 변경 (innerHTML)
function changeInnerHtml() {
  // innerHTML은 문자열의 태그를 실제 요소로 만든다.
  htmlTarget.innerHTML = "<strong>강조된 내용</strong>과 일반 텍스트";
  console.log("innerHTML로 HTML 구조를 변경했습니다.");
}
```

직접 실행 후 두 요소의 내부 HTML:

```text
text-target innerHTML: 변경된 텍스트 &lt;strong&gt;태그도 글자로 표시&lt;/strong&gt;
html-target innerHTML: <strong>강조된 내용</strong>과 일반 텍스트
```

`textContent`에 넣은 `<`는 `&lt;`로 바뀌어 **글자 그대로** 보이고, `innerHTML`은 실제 `<strong>` 요소가 생긴다.

| | `textContent` | `innerHTML` |
|---|---|---|
| 넣은 문자열 | 글자 그대로 | HTML로 해석 |
| 사용자 입력 출력 | 안전 | **XSS 위험** |
| 쓰임 | 대부분의 경우 | 구조를 통째로 만들 때 |

사용자가 입력한 문자열을 `innerHTML`에 넣으면, 입력에 `<img src=x onerror="...">` 같은 태그가 섞여 있을 때 그 코드가 실행된다(XSS). **글자를 보여 줄 때는 `textContent`가 기본**이다.

## 속성 바꾸기

```javascript
// 17.4 속성 변경 (setAttribute / getAttribute / removeAttribute)
function changeLinkAttributes() {
  sampleLink.setAttribute("href", "https://naver.com");
  sampleLink.removeAttribute("target");

  const currentHref = sampleLink.getAttribute("href");

  attributeResult.textContent = `현재 href 속성값: ${currentHref} (target 속성은 삭제됨)`;
  console.log("getAttribute로 읽은 href:", currentHref);
  console.log("삭제한 target 속성값:", sampleLink.getAttribute("target")); // null
}
```

직접 실행(원래 링크는 `<a id="sample-link" href="https://www.google.com" target="_blank">`):

```text
[console] getAttribute로 읽은 href: https://naver.com
[console] 삭제한 target 속성값: null
link: <a id="sample-link" href="https://naver.com">연습용 링크</a> | .href= https://naver.com/
```

마지막 줄이 `getAttribute("href")`와 프로퍼티 `link.href`의 차이다. 속성은 HTML에 쓴 문자열 그대로(`https://naver.com`), 프로퍼티는 브라우저가 해석한 절대 주소(`https://naver.com/`, 끝에 `/`)다. 상대 경로(`href="/about"`)라면 차이가 더 커서 프로퍼티는 `https://현재도메인/about`이 된다.

## 클래스 바꾸기: classList

```javascript
// 17.5 클래스 속성 변경 (classList)
function toggleActiveClass() {
  // 클래스가 있으면 제거하고 없으면 추가한다.
  classTarget.classList.toggle("active");

  const hasActive = classTarget.classList.contains("active");

  classResult.textContent = `현재 active 클래스 여부: ${hasActive}`;
  console.log("active 클래스 포함 여부:", hasActive);
}
```

직접 실행(두 번 클릭):

```text
[console] active 클래스 포함 여부: true
[console] active 클래스 포함 여부: false
```

| 메서드 | 동작 |
|---|---|
| `add("a")` | 추가(이미 있으면 무시) |
| `remove("a")` | 제거(없어도 에러 없음) |
| `toggle("a")` | 있으면 제거, 없으면 추가. 결과 존재 여부 반환 |
| `contains("a")` | 존재 여부 |

`.active` 스타일은 HTML의 `<style>`에 정의되어 있고, JavaScript는 클래스 이름만 붙였다 뗐다 한다. 내 파일에서는 강사님 파일의 `yellow`가 `rgb(238, 238, 65)`로 바뀌어 있다.

```css
/* classList 실습에 필요한 최소한의 클래스 */
.active {
  background-color: rgb(238, 238, 65);
}

.hidden {
  display: none;
}
```

## 스타일 바꾸기: style

`요소.style.속성 = 값`은 **인라인 스타일**(`style="..."` 속성)을 바꾼다. CSS의 `font-size`는 `-`를 쓸 수 없어서 `fontSize`처럼 카멜 표기법으로 쓴다.

내 파일에는 강사님이 주석으로 남겨 둔 `setAttribute("style", ...)` 줄이 주석 없이 들어가 있다.

```javascript
// 17.6 스타일 변경 (style)
function changeInlineStyle() {
  // CSS의 font-size는 JavaScript에서 fontSize(카멜 표기법)로 쓴다.
  styleTarget.style.color = "blue";
  styleTarget.style.fontSize = "30px";
  styleTarget.setAttribute("style","font-wieght:bold;border:1px solid blue");
  console.log("인라인 스타일을 변경했습니다. color: blue, fontSize: 20px");
}
```

직접 실행 후 `style` 속성과 각 프로퍼티:

```text
[console] 인라인 스타일을 변경했습니다. color: blue, fontSize: 20px
STYLE ATTR: font-wieght:bold;border:1px solid blue
color= "" fontSize= "" fontWeight= ""
```

결과는 **테두리만** 남는다. 문제가 세 개 겹쳐 있다.

1. `setAttribute("style", ...)`는 `style` 속성 문자열을 **통째로 덮어쓴다.** 바로 위 두 줄에서 넣은 `color: blue; font-size: 30px`가 사라진다.
2. `font-wieght`는 `font-weight` 오타다. CSS는 모르는 속성을 에러 없이 무시하므로 굵게도 적용되지 않는다.
3. 로그 메시지는 `fontSize: 20px`라고 찍지만 실제로 넣은 값은 `30px`다(강사님 파일도 같다). 로그가 실제 값을 직접 찍지 않으면 이런 불일치를 못 잡는다.

```javascript
// 고친 코드: 덮어쓰지 않고 하나씩 지정
styleTarget.style.color = "blue";
styleTarget.style.fontSize = "30px";
styleTarget.style.fontWeight = "bold";
styleTarget.style.border = "1px solid blue";
console.log("인라인 스타일:", styleTarget.getAttribute("style"));
```

> **보충**: 문자열로 여러 개를 한 번에 넣고 싶으면 `style.cssText += "font-weight:bold;"`처럼 **이어 붙인다.** 다만 스타일 여러 개를 바꿀 일이 생기면 위의 `classList`로 클래스를 바꾸는 쪽이 낫다. 스타일은 CSS 파일에, JavaScript는 상태(클래스)만 담당하게 나누는 것이 일반적이다.

## dataset

`data-*` 속성은 요소에 값을 붙여 두는 용도다. `data-user-id`는 `dataset.userId`로 읽는다(`data-` 떼고, `-` 뒤 글자를 대문자로).

```html
<button id="user-button1" type="button" data-user-id="10">10번 사용자 선택</button>
<button id="user-button2" type="button" data-user-id="20">20번 사용자 선택</button>
```

```javascript
// 17.11 dataset (data-* 속성)
function showUserDataset(event) {
  // data-user-id 속성은 dataset.userId로 접근한다. 값은 문자열이다.
  const userId = event.target.dataset.userId;

  datasetResult.textContent = `data-user-id 값: ${userId} (타입: ${typeof userId})`;
  console.log("dataset.userId 값:", userId);
  console.log("숫자로 변환한 값:", Number(userId));
}
```

직접 실행(10번 버튼):

```text
[console] dataset.userId 값: 10
[console] 숫자로 변환한 값: 10
```

콘솔에서는 둘이 똑같아 보인다. 강사님 파일은 수업 중 여기에 `+1000`을 붙여서 차이를 드러냈다.

```javascript
// 강사님 파일
console.log("dataset.userId 값:", userId+1000);
console.log("숫자로 변환한 값:", Number(userId)+1000);
```

직접 실행(같은 계산):

```text
dataset.userId 값: 101000
숫자로 변환한 값: 1010
```

`"10" + 1000`은 [지난 글](/notes/web/web-javascript-basics)의 `"5" + 3 = "53"`과 같은 문자열 이어 붙이기다. **dataset 값은 항상 문자열**이라 숫자로 쓰려면 `Number()`가 필요하다.

## 요소 만들고 넣기

새 요소는 `document.createElement("태그")`로 만든다. 만든 직후에는 **메모리에만 있고 화면에는 없다.** 삽입 메서드로 트리에 붙여야 나타난다.

```javascript
// 17.7 요소 생성 + 17.8 요소 삽입 (createElement / prepend / append)
// 입력값으로 새 li 요소를 만들어 반환한다.
function createListItem() {
  const item = document.createElement("li");

  item.textContent = itemInput.value;

  return item;
}

function prependListItem() {
  const item = createListItem();

  todoList.prepend(item); // 첫 번째 자식 앞에 삽입
  console.log("목록 맨 앞에 추가했습니다:", item.textContent);
}

function appendListItem() {
  const item = createListItem();

  todoList.append(item); // 마지막 자식 뒤에 삽입
  console.log("목록 맨 뒤에 추가했습니다:", item.textContent);
}
```

강사님 파일은 같은 코드에 생성 단계마다 만들어지는 HTML을 주석으로 달아 두었다.

```javascript
const item = document.createElement("li"); // <li></li>
item.textContent = itemInput.value; //<li>value</li>
```

```javascript
// 17.8 형제 위치 삽입 (before / after)
function insertParagraphBefore() {
  // baseParagraph 앞에 삽입
  const newParagraph = document.createElement("p");
  newParagraph.style.color = "blue";

  newParagraph.textContent = "기준 문단 앞에 삽입된 문단";
  baseParagraph.before(newParagraph);
}
```

직접 실행 후 기준 문단 바로 앞 요소:

```text
<p style="color: blue;">기준 문단 앞에 삽입된 문단</p>
```

| 메서드 | 위치 | 관계 |
|---|---|---|
| `부모.prepend(노드)` | 부모 안 맨 앞 | 자식 |
| `부모.append(노드)` | 부모 안 맨 뒤 | 자식 |
| `기준.before(노드)` | 기준 바로 앞 | 형제 |
| `기준.after(노드)` | 기준 바로 뒤 | 형제 |

이미 트리에 있는 노드를 다시 `append`하면 복사가 아니라 **이동**한다. 같은 요소가 여러 개 필요하면 매번 `createElement`하거나 `cloneNode(true)`로 복제한다.

### 할 일 목록에 삭제 버튼 붙이기

내 파일에는 실습 범위 밖의 코드가 더 있다. 목록 항목마다 삭제 버튼을 다는 것이다. HTML의 기존 항목에 버튼이 들어가 있고, 새 항목을 만드는 함수도 버튼을 붙이도록 다시 작성되어 있다.

```html
<ul id="todo-list" style="border: 10px solid gray;">
  <li>기존 항목 1 <button class="delete">삭제</button></li>
  <li>기존 항목 2 <button class="delete">삭제</button></li>
  <li>기존 항목 3 <button class="delete">삭제</button></li>
  <li>기존 항목 4 <button class="delete">삭제</button></li>
  <li>기존 항목 5 <button class="delete">삭제</button></li>
</ul>
```

```javascript
// 각 list의 항목을 삭제

function createListItem() {
  const item = document.createElement("li");
  item.textContent = itemInput.value;

  // 삭제 버튼 추가
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "삭제";
  deleteButton.classList.add("delete");
  item.append(deleteButton);

  return item;
}

// ... (파일 맨 아래)

// 삭제 이벤트 위임
todoList.addEventListener("click", event => {
  if (event.target.classList.contains("delete")) {
    event.target.closest("li").remove();
    console.log("항목 삭제되었습니다"); // 여기서 찍어야 함
  }
});
```

삭제 처리는 버튼마다 달지 않고 `ul` 하나에 **이벤트 위임**으로 걸었다. 그래서 나중에 추가한 항목의 삭제 버튼도 따로 등록 없이 동작한다. `// 여기서 찍어야 함`은 로그를 `if` 안에 둬야 삭제 버튼을 눌렀을 때만 찍힌다는 뜻이다(밖에 두면 목록 아무 데나 눌러도 찍힌다).

직접 실행("우유 사기" 뒤에 추가 → "빵 사기" 앞에 추가 → 첫 항목 삭제):

```text
[console] 목록 맨 뒤에 추가했습니다: 우유 사기삭제
[console] 목록 맨 앞에 추가했습니다: 빵 사기삭제
LIST: <li>빵 사기<button class="delete">삭제</button></li> <li>기존 항목 1 <button class="delete">삭제</button></li> ... <li>우유 사기<button class="delete">삭제</button></li>
[console] 항목 삭제되었습니다
LIST after delete:  <li>기존 항목 1 <button class="delete">삭제</button></li> ... <li>우유 사기<button class="delete">삭제</button></li>
```

동작은 한다. 그런데 두 가지가 눈에 띈다.

**1. `createListItem`이 두 번 선언되어 있다.** 원래 함수를 지우지 않고 아래에 새 버전을 추가했다. 일반 `<script>`에서는 함수 선언이 호이스팅되고 **나중 선언이 앞 선언을 덮어써서** 에러 없이 새 버전이 쓰인다. 위 출력에 버튼이 붙은 것이 그 증거다.

```javascript
function f() { return 1 }
function f() { return 2 }
console.log(f());   // 2
```

하지만 같은 파일을 [지난 글](/notes/web/web-javascript-basics)의 ES 모듈(`type="module"`)로 불러오면 파일 전체가 실행되지 않는다. 아래 셀은 에러가 나는 것이 정상이다.

```bash
node --check 17_3_dom_create_remove.mjs
```

```text
function createListItem() {
^

SyntaxError: Identifier 'createListItem' has already been declared
```

어느 쪽이든 같은 이름 함수가 두 개 있으면 읽는 사람이 어느 것이 쓰이는지 헷갈린다. 원래 함수를 고치는 것이 맞다.

**2. 로그에 "우유 사기삭제"가 찍힌다.** `item.textContent`는 자손의 텍스트를 **전부 이어 붙이므로** 버튼 글자 "삭제"까지 딸려 온다. 항목 텍스트를 따로 읽어야 한다면 `<span>`에 담아 두는 편이 낫다.

```javascript
// 고친 코드
function createListItem() {
  const item = document.createElement("li");

  const text = document.createElement("span");
  text.textContent = itemInput.value;

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "삭제";
  deleteButton.classList.add("delete");

  item.append(text, " ", deleteButton);   // append는 여러 개를 한 번에 받는다
  return item;
}
```

## 요소 삭제와 교체

| 메서드 | 호출 주체 | 반환 |
|---|---|---|
| `요소.remove()` | 지울 요소 자신 | 없음 |
| `부모.removeChild(자식)` | 부모 | 지운 자식 |
| `기존.replaceWith(새것)` | 바뀔 요소 | 없음 |

```javascript
// 17.9 요소 삭제 (remove / removeChild)
function removeAppleItem() {

  const appleItem = document.querySelector("#apple-item");

  if (!appleItem) {
    console.log("사과 항목이 이미 삭제되었습니다.");
    return;
  }

  appleItem.remove(); // 요소 자신을 삭제
  console.log("remove()로 사과 항목을 삭제했습니다.");
}
```

직접 실행(두 번 클릭):

```text
[console] remove()로 사과 항목을 삭제했습니다.
[console] 사과 항목이 이미 삭제되었습니다.
```

두 번째 클릭에서는 `querySelector`가 `null`을 돌려주므로 `if (!appleItem)` 확인이 없으면 `TypeError`가 난다.

"모두 삭제"는 자식이 남아 있는 동안 첫 자식을 계속 지운다.

```javascript
function removeAllItem() {

  while (fruitList.hasChildNodes()) {
      // 부모노드.removeChild(삭제할 자식노드);
      fruitList.removeChild(fruitList.firstChild);
  }


  console.log("모든 목록 아이템삭제:", fruitList.children.length);
}
```

강사님 파일에는 여기 쓰인 노드 탐색 프로퍼티가 주석으로 정리되어 있다.

```javascript
// ElementNode.hasChildNodes(): 자식노드가 있는지 여부.
// ElementNode.firstChild/lastChild : 첫번째/마지막 자식 노드 객체를 반환.
// ElementNode.parentNode // 부모노드 반환
// ElementNode.children   // 모든 자식노드들을 Node List로 반환.
```

`li`가 6개인 목록인데 노드 수를 세 보면 다르다.

직접 실행:

```text
childNodes: 13 children: 6
```

`childNodes`(·`firstChild`)는 줄바꿈·들여쓰기 **Text 노드까지** 센다. `li` 6개 사이사이와 앞뒤에 공백 텍스트 7개가 끼어 13개다. `children`은 Element만 센다. 위 `while` 루프는 `firstChild` 기준이라 공백 노드까지 깨끗이 지우고, 끝나면 `children.length`가 0이 된다.

> **보충**: 자식을 전부 비우는 것만이 목적이면 `fruitList.replaceChildren()` 한 줄로 된다. `innerHTML = ""`도 같은 효과지만 앞에서 본 이유로 `innerHTML`은 되도록 피한다.

교체는 새 요소를 만들어 `replaceWith`로 바꿔 끼운다.

```javascript
// 17.10 요소 교체 (replaceWith)
function replaceOldParagraph() {
  const oldParagraph = document.querySelector("#old-paragraph");

  if (!oldParagraph) {
    console.log("이미 교체된 문단입니다.");
    return;
  }

  const newElement = document.createElement("p");//<p></p>
  const strongElement = document.createElement("strong")//<strong></strong>
  newElement.append(strongElement);//<p><strong></strong></p>

  strongElement.textContent = "교체된 새 요소(p strong)";//<p><strong>교체된 새 요소(p strong)</strong></p>
  oldParagraph.replaceWith(newElement);
}
```

(주석은 강사님 파일 기준) `strongElement`를 `newElement`에 붙인 **뒤에** 글자를 넣어도 결과에 반영된다. 붙일 때 복사되는 것이 아니라 같은 객체가 트리에 들어가기 때문이다. 새 문단에는 `id`가 없으므로 두 번째 클릭에서는 "이미 교체된 문단입니다."가 찍힌다(직접 실행으로 확인).

## 정리

| 하고 싶은 것 | 코드 | 주의 |
|---|---|---|
| 요소 찾기 | `querySelector`, `querySelectorAll` | 못 찾으면 `null` / 빈 NodeList |
| 이벤트 등록 | `el.addEventListener("click", fn)` | `fn()` 아니고 `fn` |
| 실시간 입력 | `"input"` 이벤트 | `change`는 포커스 아웃 때 |
| 폼 새로고침 막기 | submit에서 `event.preventDefault()` | 함수 맨 앞에 |
| 여러 자식 처리 | 부모에 등록 + `event.target.closest()` | 새로 추가된 자식도 동작 |
| 글자 바꾸기 | `textContent` | `innerHTML`은 XSS 주의 |
| 속성 | `setAttribute` / `getAttribute` | 프로퍼티는 해석된 값 |
| 스타일 | `classList.toggle` 우선, `style.fontSize` | `setAttribute("style")`는 덮어씀 |
| 값 저장 | `data-user-id` → `dataset.userId` | 항상 문자열 |
| 생성·삽입 | `createElement` + `append/prepend/before/after` | 붙여야 화면에 보임 |
| 삭제·교체 | `remove`, `removeChild`, `replaceWith` | `childNodes`엔 공백 노드 포함 |

- DOM 코드는 **찾고 → 등록하고 → 바꾼다**의 반복이다.
- CSS 속성 오타는 에러 없이 무시되고, 없는 요소는 `null`로 돌아왔다가 나중에 `TypeError`로 터진다. 결과는 콘솔과 개발자 도구 Elements 탭에서 직접 확인한다.

다음 글에서는 폼 입력값을 읽고 검증한 뒤 `fetch`로 서버와 데이터를 주고받는다.
