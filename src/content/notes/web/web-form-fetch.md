---
title: "폼과 Fetch API: 서버와 데이터 주고받기"
description: "HTML form의 요청 파라미터와 method·action·enctype, submit 이벤트와 FormData·form.elements·체크박스·라디오 읽기, 입력값 검증, 동기·병렬·비동기의 차이와 async/await, fetch로 GET·POST 요청과 HTTP 상태·오류 처리, AJAX와 SPA까지 실습 파일을 직접 실행한 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'Web Frontend'
series: 'HTML·CSS·JavaScript'
seriesOrder: 4
originalNotebook: "12_web_front/Javascript (02_JavaScript.md 18~20장, 실습_2/18·19, 필기.md)"
tags: ["Web Frontend","JavaScript"]
date: 2026-07-25T10:00:00+09:00
thumbnail: '../../../assets/images/notes/web/web-form-fetch.webp'
---

> SKN31 웹 프론트엔드 수업 자료 `02_JavaScript.md`(18~20장), 실습 파일(`실습_2/18_form_handling`, `19_fetch_api`), 수업 필기를 바탕으로 정리했습니다.
> 폼 실습은 Node.js(v22) + jsdom으로 입력과 제출을 흉내 내어 **직접 실행**했습니다. Fetch 실습이 쓰는 JSONPlaceholder(`jsonplaceholder.typicode.com`)는 실행 환경에서 접속할 수 없어서, 같은 경로(`/users`, `/posts`, 그 외 404)에 같은 형태로 응답하는 **로컬 모의 서버**를 띄우고 내 `19_fetch_api.js`를 주소만 바꿔 실행했습니다. 사용자 데이터는 3명으로 줄였습니다.

## 이 글에서 다루는 것

- HTML form: 요청 파라미터, `method`, `action`, `enctype`
- submit 이벤트와 `FormData`, `form.elements`
- 체크박스·라디오 값 읽기
- 입력값 검증
- 동기·병렬·비동기, `async`/`await`
- `fetch`로 GET·POST 요청, HTTP 상태 확인, 오류 처리
- AJAX와 SPA

[지난 글](/notes/web/web-javascript-dom-events)에서 submit의 기본 동작을 `preventDefault()`로 막았다. 이번 글은 그 다음이다. 막아 놓은 폼에서 **값을 꺼내 검사하고, 페이지를 바꾸지 않은 채 서버로 보낸다.**

## HTML form 기본

JavaScript 없이도 폼은 서버로 값을 보낼 수 있다. 수업은 이 기본 동작부터 짚었다. 아래는 수업 필기다.

```text
## HTML FORM
- 요청 파라미터
- name=value, 값이 여러개일때 => name=value&name=value

- <form tag>에 login정보의 규격 => 서버
- 주요 속성 => method(get, post), action
=> 중요한 것들 post(대부분)/ default=get

- enctype 속성 = 서버로 전송할 값의 encoding 값 => 기본 or 파일업로드

- 공통속성 name, value(사용자가 입력 or checkbox형식)

- tag => input, select, textarea
=> 특정 2가지를 제외하곤 대부분 input
```

필기에 예시로 붙여 둔 구글 검색 주소가 요청 파라미터 형식을 그대로 보여 준다(뒤쪽 추적용 파라미터는 생략).

```text
https://www.google.co.kr/search?q=python+symbol&source=hp&...
```

`?` 뒤가 요청 파라미터고, `name=value` 쌍을 `&`로 잇는다. 검색창 `<input name="q">`에 "python symbol"을 입력하고 제출하면 `q=python+symbol`이 된다(공백은 `+`로 인코딩).

| 속성 | 의미 | 값 |
|---|---|---|
| `action` | 값을 보낼 주소 | 생략하면 현재 페이지 |
| `method` | HTTP 방식 | `get`(기본), `post` |
| `enctype` | 값의 인코딩 | 기본 `application/x-www-form-urlencoded`, 파일 업로드는 `multipart/form-data` |
| `name` | 입력 요소의 **키** | 없으면 전송되지 않음 |

GET은 값을 **주소에 붙이고**, POST는 요청 **본문(body)에 담는다.** 검색처럼 주소를 공유해도 되는 조회는 GET, 로그인·가입처럼 값이 주소에 남으면 안 되거나 서버 상태를 바꾸는 요청은 POST다. 필기의 "post(대부분)"가 이 뜻이다.

> **보충**: POST도 HTTPS가 아니면 본문이 그대로 노출된다. POST는 "주소창·기록에 안 남는다"는 의미지 암호화가 아니다.

입력 태그는 `input`, `select`, `textarea` 셋이고, 필기의 "특정 2가지"가 `select`(드롭다운)와 `textarea`(여러 줄)다. 나머지 입력은 전부 `<input type="...">`의 `type`만 바꿔 만든다.

## submit 이벤트와 FormData

실습 폼의 구조다(줄바꿈만 줄였다).

```html
<form id="signup-form">
  <p><label>이름 <input name="name" type="text"></label></p>
  <p><label>나이 <input name="age" type="number"></label></p>
  <p><label><input name="agree" type="checkbox"> 약관 동의</label></p>
  <p>
    취미(여러 개 선택 가능):
    <label><input name="hobby" type="checkbox" value="reading"> 독서</label>
    <label><input name="hobby" type="checkbox" value="music"> 음악</label>
    <label><input name="hobby" type="checkbox" value="sports"> 운동</label>
  </p>
  <p>
    수준(하나만 선택):
    <label><input name="level" type="radio" value="beginner"> 초급</label>
    <label><input name="level" type="radio" value="advanced"> 고급</label>
  </p>
  <button type="submit">가입</button>
</form>
```

처리 함수 전체(내 파일)다. 강사님 파일과 다른 검증 부분은 다음 절에서 따로 본다.

```javascript
// 18.1 폼 제출 + 18.2 FormData + 18.4 체크박스 + 18.5 라디오 버튼
function handleSignupSubmit(event) {
  event.preventDefault(); // 기본 전송(새로고침)을 막는다.

  submitResult.innerHTML = "";

  // 입력값 검증(name)
  if (!validateName()) {
    return;
  }
  //(검증통과하면) 서버로 전송
  console.log("user가 폼을 제출했습니다.")
  // signupForm.submit(); // form 객체. submit()전송.reset 입력값 초기화 

  const formData = new FormData(signupForm);

  // get(): 해당 이름의 첫 번째 값을 반환한다. 값이 없으면 null.
  const name = formData.get("name"); //name의 입력값 조회
  const age = formData.get("age"); //age의 입력값 조회 => 숫자의 up and down키는 브라우저 기능
  appendResultLine(`이름: ${name}`);
  appendResultLine(`나이: ${age} (숫자로 변환: ${Number(age)})`);

  // 18.4 체크박스: 선택 여부는 checked로 확인한다. (boolean)
  const agreeChecked = signupForm.elements.agree.checked;
  const agreeValue = formData.get("agree");
  appendResultLine(`약관 동의 여부(checked): ${agreeChecked}`);
  appendResultLine(`약관 동의 값(value): ${agreeValue}`);
  

  // getAll(): 같은 이름을 가진 모든 값을 배열로 반환한다.
  const hobbies = formData.getAll("hobby");
  appendResultLine(`선택한 취미(getAll): ${hobbies.length > 0 ? hobbies.join(", ") : "(없음)"}`);

  // 18.5 라디오 버튼: 선택된 항목의 value를 반환한다. 없으면 null.
  const level = formData.get("level");
  appendResultLine(`선택한 수준: ${level === null ? "(선택 안 함)" : level}`);

  // entries()를 일반 객체로 변환해 전체 데이터를 콘솔에서 확인한다.
  const data = Object.fromEntries(formData.entries());
  console.log("폼 전체 데이터(Object.fromEntries):", data);
}

signupForm.addEventListener("submit", handleSignupSubmit);
```

결과 줄을 추가하는 `appendResultLine`은 지난 글의 `createElement` + `append` 그대로다.

```javascript
// 결과 목록에 한 줄을 추가한다.
function appendResultLine(text) {
  const item = document.createElement("li");

  item.textContent = text; //<li>text</li>
  submitResult.append(item); // 자식 노드로 추가
}
```

직접 실행(이름 `" 홍길동 "`(앞뒤 공백), 나이 20, 약관 체크, 취미 독서·음악, 수준 초급):

```text
[console] user가 폼을 제출했습니다.
[console] 폼 전체 데이터(Object.fromEntries): {"name":" 홍길동 ","age":"20","agree":"on","hobby":"music","level":"beginner"}
message: 입력값이 올바릅니다. | result: [
  '이름:  홍길동 ',
  '나이: 20 (숫자로 변환: 20)',
  '약관 동의 여부(checked): true',
  '약관 동의 값(value): on',
  '선택한 취미(getAll): reading, music',
  '선택한 수준: beginner'
]
```

출력에서 읽을 것이 많다.

| 값 | 결과 | 이유 |
|---|---|---|
| `get("age")` | `"20"` | 폼 값은 **모두 문자열**. 숫자는 `Number()` |
| `get("agree")` | `"on"` | `value`를 안 준 체크박스의 기본값. 체크 안 하면 `null` |
| `elements.agree.checked` | `true` | 체크 여부는 `checked`로 본다 |
| `getAll("hobby")` | `["reading","music"]` | 같은 name의 값 전부 |
| `fromEntries(...).hobby` | `"music"` | 객체 키는 하나라 **마지막 값만** 남음 |
| `get("level")` | `"beginner"` | 선택된 라디오의 `value` |

`Object.fromEntries`로 바꾸면 취미가 하나로 줄어든다. 같은 name이 여러 개인 폼은 `getAll`로 따로 읽어야 한다.

> **보충**: 나이를 비워 두면 `get("age")`는 `""`이고 `Number("")`는 `0`이다. "입력 안 함"과 "0세"가 구분되지 않으므로 빈 문자열을 먼저 확인해야 한다.

`form.elements`로 입력 요소를 name으로 바로 꺼낼 수도 있다.

```javascript
// 18.3 폼 요소 접근 (form.elements)
function readFormElements() {
  const nameInput = signupForm.elements.name;
  const agreeInput = signupForm.elements.agree;

  elementsResult.textContent =
    `이름 입력값: "${nameInput.value}" / 약관 동의: ${agreeInput.checked}`;
  console.log("form.elements.name.value:", nameInput.value);
  console.log("form.elements.agree.checked:", agreeInput.checked);
}
```

```text
[console] form.elements.name.value:  홍길동 
[console] form.elements.agree.checked: true
```

| | `FormData` | `form.elements` |
|---|---|---|
| 얻는 것 | 이름-값 쌍(전송될 데이터) | 입력 **요소** 자체 |
| 체크 안 된 체크박스 | 빠짐 | 요소는 있고 `checked`가 `false` |
| 쓰임 | 서버로 보낼 값 모으기 | 개별 값 검사, `focus()` |

## 입력값 검증

강사님 파일의 검증은 "비어 있으면 안 된다" 하나다. 수업 중 3글자 이상 조건을 주석으로 시험해 본 흔적이 남아 있다.

```javascript
// 강사님 파일
function validateName() {
  const name = signupForm.elements.name.value.trim();//<input name="name"> trim():좌우공백제거

  if (!name) {
  // if (name.length < 2) { // 이름이 3글자이상.
    validationMessage.textContent = "이름을 입력하세요."; //세글자 이상 입력하세요. 
    signupForm.elements.name.focus(); // 노드.focus() -> 포커스 이동.
    return false;
  }
  // ...
}
```

내 파일은 조건을 셋으로 늘렸다.

```javascript
// <input name = "name"> trim()은 좌우공백제거
// 18.6 입력값 검증: 이름이 비어 있으면 false를 반환하고 포커스를 이동한다.
function validateName() { 
  const name = signupForm.elements.name.value.trim(); 

  // 1. 문자열이 아니거나
  // 2. 길이가 3글자 미만이거나 (코드에서 3글자 이상으로 수정하셨으므로 3으로 맞춤)
  // 3. 이름에 숫자가 포함되어 있는 경우 (/\d/은 숫자가 포함되어 있음을 뜻함)
  if (typeof name !== 'string' || name.length < 3 || /\d/.test(name)) {
    validationMessage.textContent = "이름은 숫자를 제외하고 3글자 이상 입력하세요.";
    signupForm.elements.name.focus();
    return false;
  }
  
  validationMessage.textContent = "입력값이 올바릅니다.";
  return true;
}
```

직접 실행(이름 칸에 공백만 / "홍길" / "홍길동1"을 넣고 제출):

```text
== name="  "
message: 이름은 숫자를 제외하고 3글자 이상 입력하세요. | result: []
focus on name: true
== name="홍길"
message: 이름은 숫자를 제외하고 3글자 이상 입력하세요. | result: []
focus on name: true
== name="홍길동1"
message: 이름은 숫자를 제외하고 3글자 이상 입력하세요. | result: []
focus on name: true
```

세 경우 모두 막히고 포커스가 이름 칸으로 간다. 공백만 넣은 경우는 `trim()` 후 길이 0이라 `length < 3`에 걸리므로 "비어 있음" 검사도 함께 된다. 다만 두 가지는 짚어 둘 만하다.

**1. 첫 번째 조건은 항상 거짓이다.** `input.value`는 언제나 문자열이고 `trim()`도 문자열을 돌려주므로 `typeof name !== 'string'`이 참이 될 일이 없다. 빼도 동작은 같다.

**2. 검사한 값과 보내는 값이 다르다.** 검증은 `trim()`한 값으로 했는데, 제출 처리에서는 `FormData`로 **원래 값**을 다시 읽는다. 위 실행 결과의 `"name":" 홍길동 "`처럼 공백이 그대로 서버로 간다. 검증에 쓴 값을 그대로 보내거나 입력칸 값을 정리해 두는 편이 맞다.

```javascript
// 고친 예: 정리한 값을 입력칸에 되돌려 놓으면 FormData도 같은 값을 읽는다
const name = signupForm.elements.name.value.trim();
signupForm.elements.name.value = name;
```

> **보충**: 간단한 조건은 HTML 속성만으로도 된다. `<input name="name" required minlength="3" pattern="[^0-9]*">`로 두면 브라우저가 제출 전에 막고 말풍선으로 안내한다. 이 경우 브라우저 검증이 먼저 실패해서 submit 이벤트 자체가 발생하지 않는다. 어느 쪽이든 **최종 검증은 서버에서 다시 한다.** 브라우저의 JavaScript는 사용자가 개발자 도구로 끄거나 우회할 수 있기 때문이다.

주석 처리된 `signupForm.submit()`은 검증을 통과했을 때 **기본 방식으로 전송**하는 메서드다. 이 메서드는 submit 이벤트를 다시 발생시키지 않으므로 무한 반복에 빠지지 않는다. 실습은 서버가 없어서 전송 대신 `console.log`로 표시만 했다. 실제로는 다음 절의 `fetch`로 보낸다.

## 비동기: 왜 await가 필요한가

`fetch`는 네트워크로 요청을 보내고 응답을 기다린다. 이 기다림이 수업에서 비동기를 설명한 출발점이다. 필기는 이렇게 정리되어 있다.

```text
Fetch API -> 비동기 함수 (동시성 프로그램)
=> java랑 python이랑 비슷함
=> event roof형식
=> fetch (url) 요청 중 =i/o작업, api 요청 등 (네트워크 작업)
=> 이 시간이 길면 cpu는 길게 놀고있기 때문에 이 과정에서 비동기적으로 cpu사용
=> fetch 작업 중에는 cpu가 다른 작업을 할 수 있게끔 제작됌 
```

```text
- promise 호출 다음 단의 코드를 실행하는 것을 약속함 await으로 대기 시켜줘야 호출완료되기 전에 두번째 단의 코드가 실행됌 한 로직의 실행흐름은 동기적으로 처리하되 await 시간 동안은 다른 프로세스를 cpu로 처리가 가능하게 해줌. 

- 동기적 처리: 순차적으로 진행되는 일
- 병렬 처리: 3가지 일 cpu가 3개여서 동시에 처리
- 비동기 처리: 1개의 cpu를 번갈아가면서 3가지 일 처리 (I/O가 일할때)

- 대표적인 (I/O) => 사용자 입력, 화면의 출력, 네트워크 작업, 

- A 1,2,3(i/o) => B 1,2,3(i/o) => A4

+++ I/O 작업에는 await을 붙여야 함 (I/O작업을 먼저 파악할 것)
```

| | 일꾼(CPU) | 방식 | 이득을 보는 작업 |
|---|---|---|---|
| 동기 | 1 | 하나 끝나면 다음 | - |
| 병렬 | 여러 개 | 진짜 동시에 | 계산이 무거운 작업 |
| 비동기 | 1 | 기다리는 동안 **다른 일로 전환** | 기다림이 긴 I/O 작업 |

필기의 "A 1,2,3(i/o) => B 1,2,3(i/o) => A4"를 그대로 코드로 옮겨 보면 이렇다. A와 B가 각각 요청을 보내고, 응답을 기다리는 동안 다른 코드가 실행된다.

```javascript
async function task(name) {
  console.log(`${name} 1: 요청 보냄`);
  const res = await fetch(URL);             // 여기서 기다리는 동안 다른 일 가능
  console.log(`${name} 2: 응답 받음 ${res.status}`);
  await res.json();
  console.log(`${name} 3: 끝`);
}

const p1 = task("A");
const p2 = task("B");
console.log("C: 기다리지 않고 다음 줄 실행");
await Promise.all([p1, p2]);
```

직접 실행(로컬 모의 서버):

```text
A 1: 요청 보냄
B 1: 요청 보냄
C: 기다리지 않고 다음 줄 실행
A 2: 응답 받음 200
A 3: 끝
B 2: 응답 받음 200
B 3: 끝
```

A가 `await`에 도달하자 B가 시작되고, B도 `await`에 도달하자 그 아래 C가 먼저 찍혔다. A와 B **각각의 안에서는** 1 → 2 → 3 순서가 지켜진다. 필기의 "한 로직의 실행흐름은 동기적으로 처리하되 await 시간 동안은 다른 프로세스를 cpu로 처리"가 이 모습이다. A와 B 중 누구의 응답이 먼저 오는지는 네트워크 사정에 따라 달라질 수 있다.

`await`를 빠뜨리면 응답 대신 **Promise**(나중에 값을 주겠다는 약속 객체)가 변수에 들어간다. 아래 셀은 에러가 나는 것이 정상이다.

```javascript
const r = fetch(URL);   // await 없음
console.log(r);
await r.json();
```

```text
Promise { <pending> }
TypeError: r.json is not a function
```

`<pending>`은 아직 결과가 없다는 뜻이다. 그래서 필기의 결론이 "I/O 작업에는 await을 붙여야 함"이다. `fetch()`도, 본문을 읽는 `response.json()`도 Promise를 돌려주므로 둘 다 `await`가 필요하다. 그리고 `await`는 `async` 함수 안에서만 쓸 수 있다(모듈 최상단은 예외).

> **보충**: 파이썬의 `asyncio`(`async def`, `await`, 이벤트 루프)와 구조가 같다. 차이는 JavaScript는 브라우저가 처음부터 이벤트 루프 위에서 돌아서 `asyncio.run()` 같은 시작 코드가 필요 없다는 점이다. 필기의 "event roof"는 event loop다.

## Fetch API: GET 요청

실습은 연습용 무료 API인 JSONPlaceholder를 쓴다. 가짜 사용자·게시글 데이터를 JSON으로 돌려주는 서버다.

```javascript
// 연습용 무료 API 서버 주소
const API_BASE_URL = "https://jsonplaceholder.typicode.com";

// 19.1 GET 요청 + 19.2 HTTP 상태 확인 + 19.5 응답 객체
async function fetchUsers() {
  const response = await fetch(`${API_BASE_URL}/users`);

  // 19.5 응답 객체의 주요 속성 확인
  console.log("response.ok:", response.ok);
  console.log("response.status:", response.status);

  if (!response.ok) {
    throw new Error(`HTTP 오류: ${response.status}`);
  }

  return response.json(); // json(문자열) =  javascript object 
}

async function loadUsers() {
  getStatus.textContent = "불러오는 중...";
  userList.innerHTML = ""; // 기존 목록(<ul>)을 비우기.

  try {
    const users = await fetchUsers(); // [user, user, ....]

    users.forEach(user => {
      const item = document.createElement("li");

      item.textContent = `${user.id}. ${user.name} (${user.email})`;
      userList.append(item);
    });

    getStatus.textContent = `사용자 ${users.length}명을 불러왔습니다.`;
    console.log("조회한 사용자 목록:", users);
  } catch (error) {
    getStatus.textContent = "사용자 조회에 실패했습니다.";
    console.error("오류 메시지:", error.message);
  }
}

getUsersButton.addEventListener("click", loadUsers);
```

함수를 둘로 나눈 것이 핵심이다. `fetchUsers`는 **데이터만** 가져오고 실패하면 `throw`한다. `loadUsers`는 그 결과로 **화면을 그리고**, 실패하면 `catch`에서 메시지를 보여 준다.

직접 실행(로컬 모의 서버, "사용자 조회" 클릭):

```text
== GET
직후 get-status: 불러오는 중...
  (server) GET /users content-type=- body=-
[console] response.ok: true
[console] response.status: 200
[console] 조회한 사용자 목록: [{"id":1,"name":"Leanne Graham","email":"Sincere@april.biz"},{"id":2,"name":"Ervin Howell","email":"Shanna@melissa.tv"},{"id":3,"name":"Clementine Bauch","email":"Nathan@yesenia.net"}]
get-status: 사용자 3명을 불러왔습니다.
user-list: [
  '1. Leanne Graham (Sincere@april.biz)',
  '2. Ervin Howell (Shanna@melissa.tv)',
  '3. Clementine Bauch (Nathan@yesenia.net)'
]
```

클릭 **직후**에는 "불러오는 중..."이고 응답이 온 뒤에 목록이 채워진다. `await` 동안 화면이 멈추지 않기 때문에 이런 로딩 표시가 가능하다. `(server)` 줄은 모의 서버가 받은 요청을 찍은 것이다.

> **보충**: 실제 JSONPlaceholder의 `/users`는 사용자 10명을 돌려준다. 여기서는 응답 모양만 같게 3명으로 줄였다.

## HTTP 상태와 오류 처리

수업에서 강조한 부분은 **404여도 `fetch`는 실패하지 않는다**는 점이다.

```javascript
// 19.2 HTTP 상태 확인 + 19.3 오류 처리
async function requestWrongUrl() {
  errorResult.textContent = "요청 중...";

  try {
    // 존재하지 않는 주소이므로 404 응답이 온다.
    const response = await fetch(`${API_BASE_URL}/wrong-address`);

    console.log("404여도 fetch 자체는 성공한다. response.ok:", response.ok);

    if (!response.ok) {
      // 상태 코드를 확인해서 직접 오류를 발생시킨다.
      throw new Error(`HTTP 오류: ${response.status}`);
    }

    errorResult.textContent = "요청이 성공했습니다.";
  } catch (error) {
    errorResult.textContent = `오류 발생: ${error.message}`;
    console.error("catch에서 처리한 오류:", error.message);
  }
}
```

직접 실행:

```text
== 404
  (server) GET /wrong-address content-type=- body=-
[console] 404여도 fetch 자체는 성공한다. response.ok: false
[console.error] catch에서 처리한 오류: HTTP 오류: 404
error-result: 오류 발생: HTTP 오류: 404
```

서버가 "그런 주소 없음(404)"이라고 **응답을 했으니** 통신 자체는 성공이다. `if (!response.ok) throw`가 없으면 404 응답 본문(`{}`)을 정상 데이터로 착각하고 넘어간다.

반대로 **응답을 아예 못 받으면** `fetch`가 실패한다. 모의 서버를 끄고 다시 사용자 조회를 눌렀다.

```text
== 서버 꺼짐
[console.error] 오류 메시지: fetch failed
get-status: 사용자 조회에 실패했습니다.
```

| 상황 | `fetch` 결과 | 잡는 방법 |
|---|---|---|
| 200번대 | 성공, `ok: true` | - |
| 404, 401, 500 | **성공**, `ok: false` | `if (!response.ok) throw` |
| 서버 꺼짐, 인터넷 끊김, CORS | 실패(reject) | `try...catch` |

메시지 `fetch failed`는 Node.js 표현이고 Chrome에서는 `Failed to fetch`로 나온다.

필기에 적어 둔 상태 코드다.

```text
500, 404-url없음, 401-권한이 없음
```

| 코드 | 의미 | 누구 문제 |
|---|---|---|
| 200 / 201 | 성공 / 생성됨 | - |
| 400 | 잘못된 요청(값 형식 오류) | 클라이언트 |
| 401 | 인증 필요(로그인 안 함) | 클라이언트 |
| 403 | 권한 없음(로그인했지만 금지) | 클라이언트 |
| 404 | 주소 없음 | 클라이언트 |
| 500 | 서버 내부 오류 | 서버 |

> **보충**: 필기의 "401-권한이 없음"은 엄밀히는 **인증**이 없는 경우다. 로그인은 했지만 권한이 부족한 경우는 403으로 구분한다. 4xx는 요청한 쪽, 5xx는 서버 쪽 문제라고 기억하면 된다.

## Fetch API: POST 요청

데이터를 **보낼** 때는 두 번째 인수에 옵션 객체를 준다.

```javascript
// 19.4 POST 요청
async function createPost(post) {
  const response = await fetch(`${API_BASE_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(post), // 객체를 JSON 문자열로 변환
  });

  // const formNode = document.querySelector("#input-form");
  // const formData = FormData(formNode);
  // fetch(URL, {method:"post", body:formData})


  if (!response.ok) {
    throw new Error(`HTTP 오류: ${response.status}`);
  }

  return response.json();
}

async function handleCreatePost() {
  postResult.textContent = "등록 중...";

  const newPost = {
    title: titleInput.value,
    body: "실습용 본문입니다.",
    userId: 1,
  };

  try {
    const result = await createPost(newPost);

    postResult.textContent = `등록 성공! 서버가 부여한 글 번호: ${result.id}`;
    console.log("서버 응답 결과:", result);
  } catch (error) {
    postResult.textContent = "글 등록에 실패했습니다.";
    console.error("오류 메시지:", error.message);
  }
}
```

필기는 옵션 세 줄을 각각 설명해 두었다.

```text
### method: "POST"

api 서비스 => client가 server 데이터를 보내는게 (post) 요청하는게 (get)

### headers: {
      "Content-Type": "application/json",
    },
post (json 형태로 데이터를 보냄)

###  body: JSON.stringify(user),
post에 전송할 값(데이터)은 body에 넣어서 보내주면 됌 
```

직접 실행(제목 "첫 글" 입력 후 등록):

```text
== POST
  (server) POST /posts content-type=application/json body={"title":"첫 글","body":"실습용 본문입니다.","userId":1}
[console] 서버 응답 결과: {"title":"첫 글","body":"실습용 본문입니다.","userId":1,"id":101}
post-result: 등록 성공! 서버가 부여한 글 번호: 101
```

서버가 받은 본문이 JSON **문자열**이고 `Content-Type`이 `application/json`이다. 이 헤더가 서버에게 "본문을 JSON으로 해석하라"고 알려 준다. 모의 서버는 JSONPlaceholder처럼 받은 값에 `id: 101`을 붙여 돌려주게 만들었다.

> **보충**: JSONPlaceholder는 연습용이라 POST가 성공 응답만 흉내 내고 실제로 저장하지는 않는다. 같은 글을 다시 조회해도 나오지 않는다.

### 주석 속 FormData 전송

`createPost` 안의 주석 세 줄은 수업 중 언급된 **폼을 통째로 보내는** 방법이다. 그런데 둘째 줄에 `new`가 빠져 있어서 주석을 풀면 바로 에러가 난다. 아래 셀은 에러가 나는 것이 정상이다.

```javascript
const formData = FormData(formNode);
```

```text
TypeError: Class constructor _FormData cannot be invoked without 'new'
```

(Node.js에서 직접 실행한 메시지다. Chrome에서는 `Failed to construct 'FormData': Please use the 'new' operator`로 나온다.) 고치면 이렇게 된다.

```javascript
const formNode = document.querySelector("#input-form");
const formData = new FormData(formNode);
fetch(URL, { method: "POST", body: formData });   // Content-Type은 지정하지 않는다
```

`FormData`를 `body`에 넣으면 브라우저가 `multipart/form-data` 형식과 경계 문자열(boundary)을 알아서 붙인다. 이때 `Content-Type`을 직접 쓰면 boundary가 빠져서 서버가 본문을 해석하지 못하므로 **헤더를 비워 두는 것**이 규칙이다. 파일 업로드도 이 방식으로 한다.

| 보내는 것 | `body` | `Content-Type` |
|---|---|---|
| JS 객체 | `JSON.stringify(obj)` | `application/json` 직접 지정 |
| 폼 전체·파일 | `new FormData(form)` | 지정하지 않음(자동) |

### 응답 본문은 한 번만 읽는다

`response.json()`, `text()`, `blob()`은 본문 스트림을 읽어 소비한다. 두 번 읽으면 에러다. 아래 셀은 에러가 나는 것이 정상이다.

```javascript
const res = await fetch(URL);
await res.json();
await res.text();
```

```text
TypeError: Body is unusable: Body has already been read
```

(직접 실행, Node.js 메시지) 디버깅하느라 `console.log(await res.text())`를 찍은 다음 `res.json()`을 부르면 이 에러를 만난다. 한 번 읽은 값을 변수에 담아 쓴다.

## AJAX와 SPA

수업 마지막에 왜 이렇게까지 하는지를 짚었다. 필기다.

```text
// js front단에서 api를 요청할 수 없었을 때, 백엔드에서 html 형식으로 줘야했음 reload형식만 존재 - multi page

// 지금은 js 단에서 요청을 하면 바로 data 형식으로 받을 수 있음 AJAX(비동기적xml로받기) - single page application  

// 바닐라 js => js로 웹어플리케이션 풀로만들기

//react/veiwjs 등 라이브러리 => 화면구성
```

| | 전통적인 폼 전송(MPA) | fetch(AJAX, SPA) |
|---|---|---|
| 서버가 주는 것 | 완성된 **HTML 페이지** | **데이터**(JSON) |
| 화면 변화 | 페이지 전체 새로고침 | 필요한 부분만 DOM으로 교체 |
| 화면을 그리는 쪽 | 서버(템플릿) | 브라우저(JavaScript) |
| 예 | 이 강의 다음 Django 템플릿 | 지금 실습, React·Vue |

AJAX(Asynchronous JavaScript And XML)의 X는 옛날에 XML을 주고받던 흔적이고 지금은 거의 JSON이다. 바닐라 JS(라이브러리 없는 순수 JavaScript)로도 SPA를 만들 수 있지만, 화면이 커지면 "데이터가 바뀌면 DOM 어디를 다시 그려야 하나"를 손으로 관리하기 어려워진다. React·Vue(필기의 "veiwjs")는 이 부분을 대신해 주는 라이브러리다.

## 종합 실습: 사용자 검색

강의 자료 20장의 예제는 지금까지 배운 것을 한 화면에 모은다. 배열 `filter`, DOM 생성, `input` 이벤트다.

```javascript
const users = [
  { id: 1, name: "홍길동", age: 20, active: true },
  { id: 2, name: "이순신", age: 25, active: false },
  { id: 3, name: "강감찬", age: 30, active: true },
];

const searchInput = document.querySelector("#searchInput");
const userList = document.querySelector("#userList");

function renderUsers(items) {
  userList.innerHTML = "";

  items.forEach(user => {
    const item = document.createElement("li");

    const status = user.active ? "활성" : "비활성";
    item.textContent = `${user.name} (${user.age}세, ${status})`;

    userList.append(item);
  });
}

function searchUsers(keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return users.filter(user =>
    user.name.toLowerCase().includes(normalizedKeyword)
  );
}

searchInput.addEventListener("input", event => {
  const filteredUsers = searchUsers(event.target.value);

  renderUsers(filteredUsers);
});

renderUsers(users);
```

(JSDoc 주석은 생략) 직접 실행(처음 → "이" → " 강 " → "김" 입력):

```text
[ '홍길동 (20세, 활성)', '이순신 (25세, 비활성)', '강감찬 (30세, 활성)' ]
검색어 "이":
[ '이순신 (25세, 비활성)' ]
검색어 " 강 ":
[ '강감찬 (30세, 활성)' ]
검색어 "김":
[]
```

구조가 앞으로 계속 쓰일 패턴이다. **데이터(`users`)를 바꾸거나 걸러서 → 목록을 통째로 다시 그린다(`renderUsers`).** DOM을 조금씩 고치는 대신 매번 데이터에서 다시 그리면 화면과 데이터가 어긋날 일이 없다. React가 이 방식을 자동화한 것이다.

강의 자료의 확장 과제는 이 흐름에 기능을 붙이는 것이다.

1. 활성 사용자만 표시하는 체크박스 → `checked` + `filter()`
2. 나이순 정렬 버튼 → `sort((a, b) => a.age - b.age)` ([JS(1)](/notes/web/web-javascript-basics)의 비교 함수)
3. 사용자 추가 폼 → `FormData`
4. 사용자 삭제 버튼 → 이벤트 위임
5. `fetch()`로 서버 데이터 조회
6. 로딩 중·오류 메시지 표시

> **보충**: 검색 결과가 없을 때 빈 목록만 남는다(`"김"`). "검색 결과가 없습니다." 한 줄을 넣어 주는 것도 6번과 같은 맥락의 작은 개선이다.

## 정리

| 하고 싶은 것 | 코드 | 주의 |
|---|---|---|
| 폼 가로채기 | form의 `submit` + `preventDefault()` | 버튼 click 아님 |
| 값 모으기 | `new FormData(form)`, `get`, `getAll` | 값은 문자열, 체크 안 된 항목은 빠짐 |
| 요소 다루기 | `form.elements.name` | 체크박스는 `checked` |
| 검증 | `trim()`, 길이·정규식, `focus()` | 검사한 값을 그대로 보내기, 서버에서 재검증 |
| 조회 | `await fetch(url)` → `await res.json()` | `await` 두 번 |
| 상태 확인 | `if (!res.ok) throw` | 404·500은 reject 아님 |
| 오류 | `try...catch` | 네트워크 실패는 여기로 |
| JSON 전송 | `method`, `Content-Type: application/json`, `JSON.stringify` | |
| 폼·파일 전송 | `body: new FormData(form)` | `Content-Type` 쓰지 않기 |

- 비동기는 기다리는 동안 다른 일을 하는 것이다. I/O 앞에는 `await`, `await`는 `async` 함수 안에서.
- 서버가 HTML 대신 데이터를 주고 JavaScript가 화면 일부를 다시 그리는 것이 AJAX이고, 이것을 앱 전체로 넓힌 것이 SPA다.

이것으로 HTML·CSS·JavaScript 시리즈를 마친다. 다음은 반대편, 이 요청을 받아 처리하는 **서버(Django)** 쪽이다.
