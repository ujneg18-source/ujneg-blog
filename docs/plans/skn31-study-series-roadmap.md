# SKN31 학습 기록 시리즈 로드맵

`SKN31_JY` 폴더의 챕터 순서를 그대로 블로그 시리즈로 옮기기 위한 목차와 작성 규칙입니다.
블로그 구조(Notes 컬렉션, frontmatter 스키마, 시리즈 이전/다음 탐색)는 그대로 두고 글만 추가합니다.

## 1. 작성 규칙

### 제목
- `대제목: 소제목`
  - 대제목: 원본 노트북의 주제 (`함수`, `JOIN`, `RAG 평가`)
  - 소제목: 그 글을 읽고 할 수 있게 되는 것 또는 핵심 키워드 묶음 (`여러 테이블을 합쳐 조회하기`)
- 기초 문법 챕터는 키워드 나열형(`List·Tuple·Dictionary·Set 정리`)도 허용, 뒤쪽 챕터일수록 동작형 소제목을 쓴다.

### 시리즈 단위
- SKN31 폴더 하나 = 시리즈 하나. `series`에 시리즈 이름, `seriesOrder`에 순서.
- 원칙은 노트북 1개 = 글 1편.
  - 너무 작은 노트북은 앞뒤 글에 합친다 (예: `03_탄력적IP` → EC2 글).
  - 200셀이 넘는 노트북은 실제 분량을 보고 둘로 나눈다 (예: `02_Pandas_DataFrame`).

### 본문 구성 (SQL 시리즈부터 적용)
1. 안내 인용: 원본 파일명, 실행 환경, `보충` 표기 규칙
2. `## 이 글에서 다루는 것`: 3~5개
3. 개념 → 구문 → 예제(문제 문장 굵게 + 필기 코드) → 실행 결과
4. 필기의 인라인 주석은 코드에 그대로 두고, 의미 있는 주석은 본문에서 한 번 더 풀어 쓴다
5. 원본에 없는 내용은 섹션 제목이나 문장에 `보충`을 붙인다
6. 원본 코드의 실수는 원본을 남기고 고친 버전을 나란히 둔다 (예: SQL DML 글의 `<=` / `<`)
7. `## 정리`: 표나 구문 요약

### 쓰지 않는 것
- 실제로 하지 않은 경험을 1인칭으로 쓰지 않는다 ("예제마다 주석으로 구분했다" 류)
- 모든 글에 같은 템플릿 문단을 반복하지 않는다
- `TODO` 같은 작업용 제목을 공개 글에 남기지 않는다

### 실행 결과
- Streamlit: 실습 파일을 그대로 실행해 화면을 캡처하고 `public/images/streamlit/`에 webp로 넣는다
- Pandas: 필기 코드를 순서대로 정리해 pandas 3.0.2에서 처음부터 다시 실행하고, DataFrame은 HTML 표(`df-result`)로 붙인다
- SQL: 실습용 테이블 스크립트(`table생성/*.sql`)를 MariaDB에 올려 쿼리를 다시 실행하고 HTML 표로 붙인다
- 노트북 챕터: 노트북에 저장된 출력이 있으면 그 출력을, 없으면 다시 실행한 결과를 짧게 붙인다
- `now()`처럼 실행 시점에 따라 달라지는 값은 "정리 시점 기준"이라고 밝힌다

## 2. Notes 카테고리 매핑

| SKN31 챕터 | category / subcategory | 비고 |
|---|---|---|
| 01 Python, Streamlit | Tech / Python | 기존 |
| 02 SQL | Tech / SQL | 이번에 subcategory 목록에 추가 |
| 03 웹 크롤링 | Tech / Data Engineering | 기존 |
| 04 Pandas, 05 시각화 | Tech / Data Analysis | Pandas 시리즈 때 추가 |
| 06 머신러닝, 07 딥러닝 | Tech / Machine Learning | 머신러닝 시리즈 때 추가 |
| 08 NLP, 09 Hugging Face | Tech / NLP | 추가 필요 |
| 10 AI Agent, 11 sLLM | Tech / LLM | 추가 필요 |
| 12 웹 프론트, 13 Django | Tech / Backend | 기존 (프론트는 Etc (Tech)도 가능) |
| 14 AWS, Docker 입문 | Infra / Cloud | 기존 |
| 15 SW 엔지니어링 | Tech / Etc (Tech) | 기존 |

subcategory 추가는 `src/pages/notes/[...slug].astro`의 목록 두 곳에 이름을 넣는 한 줄 작업이다.

## 3. 시리즈 목차

### 01. Python 기초 — 완료 (9편)
1. Python 개요: 프로그램과 REPL 실행 방식
2. 변수와 데이터 타입: 객체, 할당, 연산 이해하기
3. 자료구조: List·Tuple·Dictionary·Set 정리
4. 제어문과 Comprehension: 조건·반복·간결한 표현
5. 함수: Parameter·Argument·Return 이해하기
6. 객체지향 프로그래밍: 클래스·상속·특수 메서드
7. Module과 Package: import, pip, uv 사용법
8. 예외 처리: 오류를 다루고 사용자 정의 예외 만들기
9. 입출력: 파일, bytes, 객체 직렬화

**Streamlit 미니 시리즈** (`01_python/streamlit`) — 초안 완료 (3편)
1. Streamlit 시작하기: 실행 방법과 출력 함수
2. Streamlit 화면 요소: 표·metric·입력 위젯
3. Streamlit 앱 구조: 레이아웃·캐시·사이드바·멀티 페이지

### 02. SQL 기초 — 초안 완료 (9편)
1. 데이터베이스 개요: DBMS·관계형 데이터베이스·SQL 분류
2. DDL: 계정·데이터베이스·테이블과 제약조건 만들기
3. SELECT 기본: 컬럼 조회·WHERE 조건·ORDER BY 정렬
4. 단일행 함수: 문자·숫자·날짜·조건 처리
5. 집계 함수와 GROUP BY: 그룹별 집계와 HAVING
6. JOIN: 여러 테이블을 합쳐 조회하기
7. 서브쿼리: 쿼리 안에서 다른 쿼리 결과 활용하기
8. DML: INSERT·UPDATE·DELETE로 데이터 바꾸기
9. PyMySQL: Python에서 MySQL 연동하기

### 03. 데이터 수집 — 초안 완료 (3편)
1. 데이터 수집과 BeautifulSoup: HTML에서 원하는 정보 찾기
2. requests: 웹 요청을 보내고 응답 데이터 받기
3. Selenium: 브라우저를 움직여 동적 페이지 수집하기

### 04. Pandas — 초안 완료 (6편)
1. Series: 인덱싱·원소 단위 연산·결측치
2. DataFrame 만들기: 직접 생성과 파일·DB 입출력
3. DataFrame 다루기: 기본 정보·이름 변경·행과 열 추가 삭제
4. DataFrame 조회: 열 선택·loc·iloc·boolean indexing·query
5. 정렬과 집계: sort·agg·groupby·pivot_table·cut·apply
6. DataFrame 합치기: concat·join·merge

### 05. 데이터 시각화 (3편) — 초안 완료 (`visualization/`, series '데이터 시각화')
1. Matplotlib 개요: Figure·Axes와 두 가지 그리기 방식
2. Matplotlib 주요 그래프: 선·산점도·막대·파이·히스토그램·상자
3. Pandas 시각화: plot()으로 바로 그리는 그래프

### 06. 머신러닝 (16편) — 초안 완료 (`ml/`, series '머신러닝', subcategory 'Machine Learning'): 1~16 초안 완료
1. NumPy 기초: ndarray 생성과 파일 저장
2. NumPy 배열 다루기: 인덱싱·형태 변경·벡터 연산
3. 머신러닝 개요: 지도·비지도 학습과 개발 절차
4. 첫 번째 머신러닝: Iris로 보는 예측 모델의 흐름
5. 데이터셋 나누기와 모델 검증: Hold-out·KFold·교차 검증
6. 데이터 전처리: 결측치·이상치·인코딩·스케일링
7. 평가지표: 정확도·정밀도·재현율·PR/ROC 곡선
8. 과적합과 일반화: 그리드 서치와 파이프라인
9. SVM: 마진과 커널
10. KNN: 가까운 이웃으로 예측하기
11. 결정 트리와 랜덤 포레스트: 트리 모델과 앙상블
12. 부스팅: Gradient Boosting과 XGBoost
13. 최적화: 경사하강법
14. 선형 회귀: 다항 회귀와 Ridge·Lasso 규제
15. 로지스틱 회귀: 확률로 분류하기
16. 군집: K-Means와 실루엣 점수

### 07. 딥러닝 (8편) — 초안 완료: 1~8 초안 완료
1. 딥러닝 개요: 머신러닝과의 차이와 PyTorch 설치
2. Tensor 다루기: 생성·조회·연산
3. PyTorch 선형 회귀: 직접 구현에서 nn.Linear까지
4. 첫 번째 딥러닝: MLP로 MNIST 분류하기
5. 신경망 구조: 레이어·활성 함수·손실 함수·역전파 (+ Universal Approximation Theorem)
6. Dataset과 DataLoader: 데이터를 모델에 공급하기
7. 모델 저장과 문제 유형별 모델: 회귀·이진 분류·다중 분류
8. 성능 개선: Dropout·Batch Normalization·학습률 조정 (08_1 + 08_2)

### 08. 자연어 처리 (11편)
1. 자연어 처리 개요: 문제 영역과 처리 단계 (+ 텍스트 전처리)
2. 정규 표현식: 패턴으로 문자열 찾기
3. 토큰화: 형태소 분석기와 WordCloud
4. Subword 토크나이저: BPE·WordPiece·Unigram
5. Text to Vector(1): Bag of Words와 TF-IDF
6. Text to Vector(2): Word2Vec과 FastText
7. RNN과 LSTM: 문맥을 담는 임베딩
8. LSTM 감성 분석: 네이버 영화 댓글 분류
9. Seq2Seq 챗봇: Encoder–Decoder 구조
10. Attention: Seq2Seq의 병목 해결하기
11. Transformer: Self-Attention과 모델 계열

### 09. Hugging Face (2편)
1. 전이 학습과 Hugging Face: 사전 학습 모델과 파인튜닝 전략
2. Hugging Face Pipeline: 태스크별 모델 바로 쓰기

### 10. LLM 애플리케이션 (20편, 네 묶음)

**LangChain 기초**
1. LLM과 LangChain 개요: 구성 요소 한눈에 보기
2. Model I/O: OpenAI·Hugging Face 모델 호출하기
3. 프롬프트 엔지니어링: Prompt Template과 멀티모달 입력
4. Output Parser: LLM 응답을 구조화하기
5. Chain과 LCEL: Runnable로 처리 흐름 만들기
- 부록: Type Hint와 Pydantic / python-dotenv / LangSmith

**RAG**
6. RAG 개요: 문서 로드와 Chunking
7. Embedding과 Vector DB: 의미로 검색하기
8. Qdrant: 구조 이해와 LangChain 연동 (07_1 + 07_2)
9. Retriever: 검색 방식 비교
10. Advanced RAG: Rerank·HyDE·MultiQuery
11. RAG 평가: RAGAS로 검색과 답변 측정하기

**Agent**
12. Agent 개요: ReAct 패턴과 Tool Calling
13. LangGraph(1): State·Node·Edge로 그래프 만들기
14. LangGraph(2): 메모리와 Checkpointer

**GraphRAG**
15. GraphRAG가 필요한 이유: Vector RAG의 한계
16. Graph DB와 Neo4j: 개념과 설치
17. Cypher 쿼리: 기본 문법과 집계 (01 + 02)
18. 그래프 모델링: CSV를 지식 그래프로 바꾸기 (03 + 04)
19. 벡터 검색과 Text2Cypher: 자연어로 그래프 조회하기 (05 + 06)
20. GraphRAG Agent: 도구로 묶어 질문에 답하기

### 11. sLLM 파인튜닝 (3편)
1. LLM 파인튜닝 개요: 양자화·PEFT·LoRA
2. 파인튜닝 데이터셋: HuggingFace Datasets로 만들기
3. 파인튜닝 실습: SFT와 LoRA 모델 사용

### 12. 웹 프론트엔드 (4편)
1. HTML·CSS와 Bootstrap: 그리드 시스템으로 레이아웃 잡기
2. JavaScript(1): 실행 방식과 기본 문법
3. JavaScript(2): 이벤트와 DOM
4. Fetch API와 Form: 서버와 데이터 주고받기

### 13. Django (6편)
1. Django 시작하기: 프로젝트·앱·MTV 구조
2. Form과 ModelForm: 입력 검증 자동화
3. ORM: 조회·집계·JOIN·CRUD
4. 페이징: Paginator로 목록 나누기
5. 사용자 인증: 회원가입과 로그인
6. SSE 스트리밍 채팅: StreamingHttpResponse로 응답 흘려보내기

### 14. AWS (5편) + Docker
1. 클라우드 개요와 AWS 시작하기: 서비스 유형과 계정 보안
2. EC2: VPC·인스턴스 생성과 접속 (+ 탄력적 IP)
3. EC2 개발 환경: uv·VSCode 원격 접속·Docker
4. RDS: 데이터베이스 서버 분리하기
5. 배포: EC2에서 Streamlit·Django 서비스하기 (nginx·Gunicorn)
- 별도: Docker 입문: 이미지·컨테이너 기본 명령어

### 15. 소프트웨어 공학 (6편)
1. 요구사항 분석: 수집 기법과 산출물
2. 유즈케이스: 명세서 작성법
3. 화면 설계: 와이어프레임과 메뉴 구조도
4. 테이블 정의서: 컬럼·제약조건·인덱스 정리
5. 테스트 설계: 테스트 케이스 작성법
6. 시스템 구성도: 아키텍처 다이어그램 그리기

## 4. 범위 밖
- `00_단위프로젝트`, `주유소가격 데이터 분석 실습`, `mypoll`(루트) → 나중에 Projects 컬렉션에서 다룬다
- `SKN31-inst`, `jdk-21_windows-x64_bin`, `새 폴더` → 블로그 대상 아님
