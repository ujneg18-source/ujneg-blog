import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = process.argv[2];

if (!sourceDir) {
  console.error('Usage: npm run content:import:python -- <01_python directory>');
  process.exit(1);
}

const posts = [
  {
    source: '01_개요.ipynb',
    slug: 'python-overview-repl',
    title: 'Python 개요: 프로그램과 REPL 실행 방식',
    description: '프로그램과 프로그래밍 언어의 의미를 살펴보고 Python의 특징, REPL과 Script 실행 방식을 정리합니다.',
    date: '2026-04-14',
    tags: ['Python', 'REPL', 'Programming'],
  },
  {
    source: '02_변수와 데이터타입.ipynb',
    slug: 'python-variables-data-types',
    title: '변수와 데이터 타입: 객체, 할당, 연산 이해하기',
    description: 'Python의 변수와 객체 관계를 이해하고 주요 데이터 타입과 연산 방법을 예제로 정리합니다.',
    date: '2026-04-13',
    tags: ['Python', 'Variable', 'Data Type'],
  },
  {
    source: '03_자료구조.ipynb',
    slug: 'python-data-structures',
    title: '자료구조: List·Tuple·Dictionary·Set 정리',
    description: 'Python의 대표 자료구조를 생성하고 조회·변경·변환하는 방법을 비교하며 정리합니다.',
    date: '2026-04-13',
    tags: ['Python', 'List', 'Tuple', 'Dictionary', 'Set'],
  },
  {
    source: '04_제어문_컴프리헨션.ipynb',
    slug: 'python-control-flow-comprehension',
    title: '제어문과 Comprehension: 조건·반복·간결한 표현',
    description: '조건문과 반복문으로 실행 흐름을 제어하고 Comprehension, range, enumerate를 활용하는 방법을 정리합니다.',
    date: '2026-04-14',
    tags: ['Python', 'Control Flow', 'Comprehension'],
  },
  {
    source: '05_함수.ipynb',
    slug: 'python-functions',
    title: '함수: Parameter·Argument·Return 이해하기',
    description: '함수를 정의하고 호출하는 방법부터 매개변수, 반환값, 일급 함수와 Lambda까지 정리합니다.',
    date: '2026-04-16',
    tags: ['Python', 'Function', 'Lambda'],
  },
  {
    source: '06_객체지향프로그래밍.ipynb',
    slug: 'python-object-oriented-programming',
    title: '객체지향 프로그래밍: 클래스·상속·특수 메서드',
    description: '클래스와 인스턴스의 관계부터 self, 생성자, 상속, 오버라이딩과 특수 메서드까지 정리합니다.',
    date: '2026-04-16',
    tags: ['Python', 'OOP', 'Class', 'Inheritance'],
  },
  {
    source: '07_패키지_모듈_import.ipynb',
    slug: 'python-modules-packages-import',
    title: 'Module과 Package: import, pip, uv 사용법',
    description: 'Python 모듈과 패키지의 구조, import 방식과 pip·uv를 이용한 의존성 관리 방법을 정리합니다.',
    date: '2026-04-20',
    tags: ['Python', 'Module', 'Package', 'pip', 'uv'],
  },
  {
    source: '08_예외처리 (Exception Handling).ipynb',
    slug: 'python-exception-handling',
    title: '예외 처리: 오류를 다루고 사용자 정의 예외 만들기',
    description: 'Python 오류의 종류와 try·except 흐름을 이해하고 사용자 정의 예외를 만드는 방법을 정리합니다.',
    date: '2026-04-20',
    tags: ['Python', 'Exception', 'Error Handling'],
  },
  {
    source: '09_입출력.ipynb',
    slug: 'python-io-serialization',
    title: '입출력: 파일, bytes, 객체 직렬화',
    description: '파일 입출력과 with 문, bytes 타입, 객체 직렬화의 기본 사용법을 정리합니다.',
    date: '2026-04-21',
    tags: ['Python', 'IO', 'Serialization'],
  },
];

const editorialBySlug = {
  'python-overview-repl': {
    goals: [
      '프로그램, 로직, 알고리즘, 프로그래밍 언어의 관계를 구분한다.',
      '컴파일 방식과 인터프리트 방식의 차이를 큰 흐름에서 이해한다.',
      'Python의 특징과 활용 분야를 정리한다.',
      'REPL 실행과 Script 실행을 상황에 맞게 선택한다.',
    ],
    reflection: [
      '처음에는 Python을 단순히 “코드를 한 줄씩 실행하는 인터프리터 언어”로 이해했다. 필기를 다시 정리하면서 중요한 것은 분류 자체보다 소스 코드가 어떤 과정을 거쳐 실행되는지 설명할 수 있는가라는 점이었다.',
      'CPython은 소스 코드를 바이트코드로 컴파일한 뒤 Python Virtual Machine에서 실행한다. 따라서 컴파일 언어와 인터프리터 언어를 완전히 반대되는 개념으로만 나누기보다는, Python의 일반적인 실행 흐름을 함께 이해하는 편이 정확하다.',
      'REPL은 문법이나 짧은 표현을 즉시 확인하기 좋고, Script 방식은 여러 명령을 재사용 가능한 프로그램으로 남길 때 적합하다. 이후의 모든 실습은 이 두 실행 방식을 오가며 진행했다.',
    ],
    takeaways: [
      '프로그램은 목적을 달성하기 위한 명령과 처리 순서의 집합이다.',
      'Python은 가독성, 풍부한 생태계, 동적 타입이라는 특징을 가진다.',
      'REPL은 빠른 확인에, `.py` Script는 재사용과 관리에 적합하다.',
      'Python 실행 과정은 “소스 코드 → 바이트코드 → Python VM 실행”으로 이해하면 좋다.',
    ],
  },
  'python-variables-data-types': {
    goals: [
      '변수 생성과 할당이 객체를 이름에 연결하는 과정임을 이해한다.',
      '식별자 규칙과 읽기 좋은 변수 이름의 관례를 익힌다.',
      '숫자, 논리값, 문자열 등 주요 데이터 타입의 연산을 실습한다.',
      '문자열 인덱싱·슬라이싱·포매팅과 사용자 입력을 다룬다.',
    ],
    reflection: [
      '이 노트북에서는 값을 외우기보다 변수에 값을 할당하고 다시 조회하는 과정을 반복해서 확인했다. 특히 “변수 안에 값이 들어간다”는 표현보다, 이름이 메모리의 객체를 참조한다고 이해하는 것이 이후 자료구조와 함수의 동작을 설명하기 편했다.',
      '문자열 실습에서는 `str`과 `int`를 바로 더할 수 없는 경우, 앞뒤 공백 제거, 여러 줄 문자열, 인덱싱과 슬라이싱, 포매팅을 직접 비교했다. 마지막 연습 문제들은 주민번호 일부 조회, 문자열 반복, 글자 수와 포함 여부, 입력값 형 변환처럼 자주 사용하는 조작을 한 번에 복습하도록 구성했다.',
    ],
    takeaways: [
      '할당문은 객체와 변수 이름을 연결한다.',
      'Python은 동적 타입 언어지만 현재 객체의 타입에 맞는 연산 규칙을 따라야 한다.',
      '사용자 입력은 문자열이므로 계산 전에 필요한 타입으로 변환해야 한다.',
      '문자열은 변경 불가능한 시퀀스이며 인덱싱과 슬라이싱으로 일부를 조회할 수 있다.',
    ],
  },
  'python-data-structures': {
    goals: [
      'List, Tuple, Dictionary, Set의 저장 방식과 사용 목적을 비교한다.',
      '인덱싱과 슬라이싱이 가능한 자료구조를 구분한다.',
      '각 자료구조의 추가·변경·삭제 메서드를 실습한다.',
      'Unpacking과 자료구조 변환을 통해 데이터를 다른 형태로 다룬다.',
    ],
    reflection: [
      '자료구조는 문법보다 “어떤 데이터를 어떤 방식으로 조회할 것인가”를 기준으로 선택해야 했다. 순서와 중복이 중요하면 List, 변경되지 않는 묶음이면 Tuple, 키를 이용해 의미 있는 값을 찾으면 Dictionary, 중복 제거와 집합 연산이 필요하면 Set이 자연스럽다.',
      '코드 주석에는 존재하지 않는 인덱스 조회, `index()`에서 값을 찾지 못한 경우, Set이 subscriptable하지 않다는 오류를 따로 표시해두었다. 정상 동작만 확인하기보다 실패하는 조건까지 실행해본 기록이라 자료구조별 제약을 이해하는 데 도움이 됐다.',
      '후반 연습에서는 시험 점수 슬라이싱, 중복 제거, Dictionary로 개인 정보 구성, 중첩 값 조회와 수정까지 진행했다. 단순 메서드 암기보다 실제 데이터를 어떤 구조로 표현할지 판단하는 연습에 가깝다.',
    ],
    takeaways: [
      'List와 Tuple은 순서가 있는 시퀀스지만 Tuple은 변경할 수 없다.',
      'Dictionary는 키로 값을 관리하고 Set은 중복 없는 원소와 집합 연산에 적합하다.',
      'Set은 인덱싱할 수 없으며 자료구조마다 지원하는 조회 방식이 다르다.',
      'Unpacking과 변환 함수는 여러 자료구조 사이를 연결하는 기본 도구다.',
    ],
  },
  'python-control-flow-comprehension': {
    goals: [
      '조건문으로 상황에 따라 다른 코드를 실행한다.',
      '반복문과 종료 조건을 이용해 같은 처리를 반복한다.',
      '`range`와 `enumerate`로 반복 범위와 순번을 함께 다룬다.',
      'Comprehension으로 변환과 필터링 결과를 새로운 자료구조에 저장한다.',
    ],
    reflection: [
      '제어문 필기에서는 학점 계산, 사칙연산 계산기, 월별 날짜 수, 아이디 검증처럼 조건이 여러 갈래로 나뉘는 예제를 직접 구성했다. 조건의 순서가 결과에 영향을 주기 때문에 넓은 범위보다 구체적인 조건을 어디에 배치할지도 함께 확인했다.',
      '반복문에서는 리스트 전체에 같은 연산을 적용하고, 사용자 입력을 종료 조건까지 계속 받으며, 양수와 음수를 나누어 저장하는 흐름을 연습했다. `break`와 `continue`는 단순 문법이 아니라 반복을 끝내거나 현재 회차만 건너뛰는 제어 도구로 이해했다.',
      'Comprehension 부분은 기존 반복문과 비교하는 방식으로 기록되어 있다. 결과가 단순한 변환·필터링이면 표현이 명확하지만, 중첩 조건이 많아지면 일반 반복문이 더 읽기 좋다는 기준도 함께 가져가는 것이 중요하다.',
    ],
    takeaways: [
      '조건문의 분기 순서와 반복문의 종료 조건을 명확하게 설계해야 한다.',
      '`range`는 숫자 범위를 만들고 `enumerate`는 값과 순번을 함께 제공한다.',
      'Comprehension은 변환과 필터링이 간단할 때 가장 읽기 좋다.',
      '복잡한 중첩 로직은 짧게 줄이는 것보다 명확하게 작성하는 것이 우선이다.',
    ],
  },
  'python-functions': {
    goals: [
      '반복되는 로직을 함수로 분리하고 호출하는 방법을 익힌다.',
      'Parameter와 Argument, Return value의 역할을 구분한다.',
      '기본값, 위치·키워드 인자, `*args`, `**kwargs`를 사용한다.',
      '함수를 값처럼 전달하고 Lambda, `map`, `filter`, `sorted`에 활용한다.',
    ],
    reflection: [
      '함수를 공부하면서 가장 중요했던 점은 입력과 처리, 반환을 분리하는 것이었다. 값을 출력하는 함수와 결과를 반환하는 함수는 겉으로 비슷해도 재사용 가능성에서 차이가 크다. 그래서 예제마다 입력값과 반환값의 유무를 주석으로 구분했다.',
      '매개변수 실습에서는 기본값이 없는 매개변수를 먼저 선언해야 하는 규칙, 위치 인자와 키워드 인자의 차이, 자료구조를 `*` 또는 `**`로 풀어서 전달하는 방법을 확인했다. `*args`는 Tuple, `**kwargs`는 Dictionary 형태로 함수 내부에 전달된다는 점이 핵심이다.',
      '일급 함수와 Lambda 부분에서는 함수를 다른 함수의 인자로 전달하고 정렬 기준이나 필터 조건으로 사용하는 과정을 실습했다. 구구단, 구간 합계, BMI 판정, 양수 필터링 등의 연습 문제로 함수의 경계를 직접 설계했다.',
    ],
    takeaways: [
      '함수는 하나의 책임을 갖도록 입력·처리·반환을 명확히 구분한다.',
      '출력과 반환은 다르며, 반환값이 있어야 다른 코드에서 결과를 재사용할 수 있다.',
      '`*args`와 `**kwargs`는 유연하지만 함수의 의도가 흐려지지 않도록 사용해야 한다.',
      '함수를 값으로 전달할 수 있다는 특성이 정렬·변환·필터링 API의 기반이 된다.',
    ],
  },
  'python-object-oriented-programming': {
    goals: [
      'Class와 Instance의 관계를 이해한다.',
      '`self`와 `__init__`을 이용해 객체의 상태를 초기화한다.',
      '상속, Method Overriding, `super()`의 역할을 실습한다.',
      '특수 메서드와 클래스 변수·클래스 메서드를 구분한다.',
    ],
    reflection: [
      '객체지향 부분은 클래스를 단순한 문법이 아니라 상태와 기능을 함께 정의하는 설계도로 이해하는 데 초점을 맞췄다. 객체를 생성하면 메모리에 공간이 만들어지고, `__init__`이 현재 생성 중인 객체를 `self`로 받아 초기 상태를 설정하는 흐름을 주석으로 단계별 기록했다.',
      'Person과 Student 형태의 예제에서는 상위 클래스의 속성을 재사용하면서 하위 클래스만의 속성을 추가했다. `super()`와 Method Overriding을 통해 중복을 줄이되, 하위 클래스가 필요한 동작을 다시 정의하는 과정을 확인했다.',
      '`__dict__`, `__str__`, 비교·연산 관련 특수 메서드까지 실행하면서 Python 문법이 내부적으로 메서드 호출과 연결된다는 점도 살펴봤다. 마지막에는 모든 객체가 공유하는 클래스 변수와 인스턴스마다 독립적인 인스턴스 변수를 비교했다.',
    ],
    takeaways: [
      'Class는 객체의 상태와 기능을 정의하고 Instance는 그 설계로 생성된 실제 객체다.',
      '`self`는 현재 메서드를 호출한 객체를 가리킨다.',
      '상속은 공통 동작을 재사용하고 Overriding은 하위 타입의 동작을 구체화한다.',
      '특수 메서드를 구현하면 출력, 비교, 연산과 같은 Python 기본 동작을 객체에 연결할 수 있다.',
    ],
  },
  'python-modules-packages-import': {
    goals: [
      '함수와 클래스를 Module 단위로 분리하는 이유를 이해한다.',
      '여러 형태의 import와 Namespace 사용법을 비교한다.',
      'Script 실행 시 모듈 검색 경로가 어떻게 결정되는지 확인한다.',
      '`pip`와 `uv`로 외부 패키지와 프로젝트 의존성을 관리한다.',
    ],
    reflection: [
      '코드가 길어지면 한 파일에 모든 함수와 클래스를 두기보다 역할에 따라 Module과 Package로 나눠야 한다. 이 노트에서는 직접 만든 모듈을 불러오고 별칭을 지정하면서, import가 단순 복사가 아니라 별도의 Namespace를 통해 정의를 재사용하는 과정임을 확인했다.',
      'Notebook 환경과 `python script.py` 실행은 현재 작업 경로와 모듈 검색 경로가 달라질 수 있다. 파일 경로 기반 실행 예제를 통해 “파일이 있는데 왜 import되지 않는가”라는 문제를 경로 관점에서 이해했다.',
      '마지막에는 `pip`의 설치·삭제·목록·동결 명령과 `uv`의 프로젝트 및 의존성 관리 흐름을 함께 정리했다. 패키지를 설치하는 것뿐 아니라 같은 환경을 다시 만들 수 있도록 의존성 정보를 남기는 것이 목적이다.',
    ],
    takeaways: [
      'Module은 Python 코드 파일이고 Package는 관련 Module을 묶는 구조다.',
      'import 방식에 따라 현재 Namespace에서 사용하는 이름이 달라진다.',
      '모듈 탐색 문제는 현재 작업 경로와 `sys.path`를 함께 확인해야 한다.',
      '의존성 관리는 설치 명령보다 재현 가능한 프로젝트 환경을 만드는 데 의미가 있다.',
    ],
  },
  'python-exception-handling': {
    goals: [
      'Syntax Error와 실행 중 발생하는 Exception을 구분한다.',
      '`try`, `except`, `else`, `finally`의 실행 흐름을 이해한다.',
      '예외 종류별로 다른 복구 로직을 작성한다.',
      '`raise`와 사용자 정의 Exception으로 잘못된 상태를 명확히 표현한다.',
    ],
    reflection: [
      '예외 처리는 오류를 숨기는 문법이 아니라, 예상 가능한 실패를 정상적인 프로그램 흐름 안에서 다루는 방법이다. 모든 예외를 같은 방식으로 처리하는 코드와 예외 종류마다 다르게 처리하는 코드를 나누어 실행 순서를 주석으로 기록했다.',
      '구체적인 예외를 먼저 처리하면 사용자에게 더 정확한 원인과 대응 방법을 제공할 수 있다. 반대로 넓은 `Exception`만 사용하는 방식은 예상하지 못한 문제까지 감출 수 있어 마지막 안전망 정도로 사용하는 것이 좋다.',
      '월과 일의 범위를 검증하는 예제에서는 잘못된 상태를 발견한 위치에서 직접 예외를 발생시키고, 의미를 드러내는 사용자 정의 Exception 클래스로 전달했다. 입력 검증과 도메인 규칙을 코드로 표현하는 연습이었다.',
    ],
    takeaways: [
      '예외는 예상 가능한 실패를 호출자에게 전달하는 수단이다.',
      '가능하면 구체적인 예외 타입을 먼저 처리한다.',
      '`finally`는 성공 여부와 관계없이 정리 작업이 필요할 때 사용한다.',
      '사용자 정의 예외는 업무 규칙에 맞지 않는 상태를 명확하게 표현한다.',
    ],
  },
  'python-io-serialization': {
    goals: [
      '절대 경로와 상대 경로, 현재 작업 디렉터리의 관계를 이해한다.',
      '파일 모드와 Encoding을 지정해 텍스트 파일을 읽고 쓴다.',
      '`with` 문으로 파일 자원을 안전하게 닫는다.',
      'Text와 bytes를 구분하고 객체 직렬화의 목적을 이해한다.',
    ],
    reflection: [
      '파일 입출력은 코드보다 실행 위치와 경로를 이해하는 것이 먼저였다. Windows와 Linux/macOS의 절대 경로 표기, 현재 디렉터리를 기준으로 한 상대 경로, `.`과 `..`의 의미를 주석으로 정리하고 실제 작업 디렉터리를 조회했다.',
      '쓰기·추가·읽기 모드를 각각 실행하고 `read`, `readlines`, 한 줄씩 읽기, 반복문을 이용한 읽기를 비교했다. 직접 `close()`하는 방식 뒤에 `with` 문을 사용해, 예외가 발생하더라도 파일 연결이 정리되는 구조를 확인했다.',
      '후반에는 Text mode와 Binary mode의 입출력 타입 차이를 확인하고 정수를 bytes로 변환했다. 객체 직렬화에서는 Python 객체를 파일에 저장하고 복원하는 흐름을 실습했다. 단, `pickle`은 신뢰할 수 없는 파일을 역직렬화하면 임의 코드 실행 위험이 있으므로 외부 입력에는 사용하지 않아야 한다.',
    ],
    takeaways: [
      '상대 경로는 현재 작업 디렉터리를 기준으로 해석된다.',
      '텍스트 파일은 Encoding을 명시하고, 파일 자원은 `with` 문으로 관리한다.',
      'Text mode는 `str`, Binary mode는 `bytes`를 읽고 쓴다.',
      '직렬화 형식은 편의성뿐 아니라 호환성과 보안까지 고려해 선택한다.',
    ],
  },
};

const outputDir = path.join(repoRoot, 'src', 'content', 'notes', 'python');
const imageOutputDir = path.join(repoRoot, 'public', 'images', 'python');

await mkdir(outputDir, { recursive: true });
await mkdir(imageOutputDir, { recursive: true });

function yamlString(value) {
  return JSON.stringify(value);
}

function cellSource(cell) {
  return Array.isArray(cell.source) ? cell.source.join('') : (cell.source ?? '');
}

function demoteMarkdownHeadings(markdown) {
  return markdown.replace(/^(#{1,5})(\s+)/gm, (_, hashes, whitespace) => `${hashes}#${whitespace}`);
}

function rewriteImagePaths(markdown) {
  return markdown
    .replace(/\((?:\.\/)?images\/([^\s)]+)\)/g, '(/images/python/$1)')
    .replace(/src=(["'])(?:\.\/)?images\/([^"']+)\1/g, 'src=$1/images/python/$2$1');
}

function renderNotebook(notebook) {
  const sections = [];

  for (const cell of notebook.cells ?? []) {
    const source = cellSource(cell).trimEnd();
    if (!source.trim()) continue;

    if (cell.cell_type === 'markdown') {
      sections.push(rewriteImagePaths(demoteMarkdownHeadings(source)));
      continue;
    }

    if (cell.cell_type === 'code') {
      sections.push(`\`\`\`\`python\n${source}\n\`\`\`\``);
    }
  }

  return sections.join('\n\n').replace(/\n{4,}/g, '\n\n\n').trim();
}

function renderEditorialOpening(post) {
  const editorial = editorialBySlug[post.slug];
  if (!editorial) return '';

  return [
    '## 이 글에서 확인할 내용',
    '',
    ...editorial.goals.map((goal) => `- ${goal}`),
    '',
    '## 필기를 다시 읽으며 잡은 핵심',
    '',
    ...editorial.reflection,
  ].join('\n\n');
}

function renderEditorialSummary(post) {
  const editorial = editorialBySlug[post.slug];
  if (!editorial) return '';

  return [
    '## 학습 정리',
    '',
    ...editorial.takeaways.map((takeaway) => `- ${takeaway}`),
  ].join('\n\n');
}

const copiedImages = new Set();

for (const [index, post] of posts.entries()) {
  const notebookPath = path.join(sourceDir, post.source);
  const notebook = JSON.parse(await readFile(notebookPath, 'utf8'));
  const body = renderNotebook(notebook);
  const imageMatches = [...body.matchAll(/\/images\/python\/([^\s)"'>]+)/g)];

  for (const match of imageMatches) {
    const imageName = decodeURIComponent(match[1]);
    if (copiedImages.has(imageName)) continue;

    await copyFile(
      path.join(sourceDir, 'images', imageName),
      path.join(imageOutputDir, imageName),
    );
    copiedImages.add(imageName);
  }

  const frontmatter = [
    '---',
    `title: ${yamlString(post.title)}`,
    `description: ${yamlString(post.description)}`,
    "category: 'Tech'",
    "subcategory: 'Python'",
    "series: 'Python 기초'",
    `seriesOrder: ${index + 1}`,
    `originalNotebook: ${yamlString(post.source)}`,
    `tags: ${JSON.stringify(post.tags)}`,
    `date: ${post.date}`,
    '---',
  ].join('\n');

  const editorialNote = [
    '> 이 글은 SKN31 학습 과정에서 작성한 Jupyter Notebook을 바탕으로 정리했습니다.',
    '> 당시 작성한 Markdown 필기와 코드 주석은 보존하고, 글의 흐름을 위해 도입·보충 설명·학습 정리를 덧붙였습니다.',
    `> 원본 노트북: \`${post.source}\``,
  ].join('\n');

  const opening = renderEditorialOpening(post);
  const summary = renderEditorialSummary(post);
  const output = `${frontmatter}\n\n${editorialNote}\n\n${opening}\n\n---\n\n${body}\n\n---\n\n${summary}\n`;
  await writeFile(path.join(outputDir, `${post.slug}.md`), output, 'utf8');
  console.log(`Created ${path.relative(repoRoot, path.join(outputDir, `${post.slug}.md`))}`);
}

console.log(`Copied ${copiedImages.size} referenced images to public/images/python`);
