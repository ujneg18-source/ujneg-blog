---
title: "RAG 개요: 문서 로드와 Chunking"
description: "RAG의 개념과 파인튜닝과의 차이, 인덱싱(Load → Split → Embed → Store)과 검색·생성 단계를 정리하고, LangChain Document Loader(TextLoader, PDF, WebBaseLoader, RecursiveUrlLoader, arxiv, Docling)로 문서를 읽은 뒤 Text Splitter(Character, Recursive, 토큰 기준, Markdown Header)로 나누는 방법을 실습합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'RAG'
seriesOrder: 1
originalNotebook: "06_RAG_개요_문서로드_분할.ipynb"
tags: ["LLM","RAG"]
date: 2026-06-26T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-rag-load-split.webp'
---

> SKN31 AI Agent 과정 노트북 `06_RAG_개요_문서로드_분할.ipynb`를 바탕으로 정리했습니다.
> Document Loader까지는 수업 때 실행한 결과입니다. 수업 노트북에서 Docling과 Chunking(문서 분할) 부분은 실행 기록이 없어서, 그 부분의 코드와 출력은 강의 자료의 것을 가져왔습니다.

## 이 글에서 다루는 것

- RAG란 무엇이고 파인튜닝과 무엇이 다른가
- RAG의 두 단계: 인덱싱(Load → Split → Embed → Store), 검색·생성
- Document Loader: 텍스트, PDF, 웹 페이지, 웹사이트 전체, arXiv 논문, Docling
- Text Splitter: CharacterTextSplitter, RecursiveCharacterTextSplitter, 토큰 기준 분할, MarkdownHeaderTextSplitter

## RAG

**RAG**(Retrieval-Augmented Generation)는 **검색 기반 생성** 기법이다.

- 질문과 관련된 문서를 자체 DB나 외부 DB에서 **검색**해서, 질문과 함께 LLM에 넘긴다
- LLM은 함께 받은 문서를 바탕으로 답한다
- 그래서 LLM이 학습하지 않은 내용도 다룰 수 있고, 할루시네이션이 줄어든다

LangChain 기초 1편의 "문서 + 질문" 프롬프트, 2편과 허깅페이스 시리즈의 knowledge cutoff 문제가 여기서 만난다. 모델이 모르는 최신 정보나 사내 문서를 **검색해서 프롬프트에 넣어 주는 시스템**이 RAG다.

### RAG vs 파인튜닝

| 항목 | 파인튜닝 | RAG |
|---|---|---|
| 방법 | 사전학습 모델에 도메인 데이터를 **추가 학습** | 모델은 그대로, 외부 지식을 **검색해서** 프롬프트에 넣기 |
| 도메인 최적화 | 가능 | 제한적 |
| 최신 정보 반영 | 불가능 (다시 학습해야 함) | 가능 (문서만 바꾸면 됨) |
| 구현 난이도 | 높음 (시간·자원) | 보통 (검색 시스템 구축 필요) |
| 유연성 | 낮음 | 높음 |
| 약점 | 재학습 비용 | 검색된 문서 품질에 답이 좌우됨 |

```python
# 옛날에는 파인튜닝이 가능했음 
# 모델이 작았기 때문에 로컬 gpu, 메모리 환경에서도 가능했음
# 지금은 모델이 너무 크기 때문에 
# 그리고 학습량이 적으면 오버튜닝 됌.
# 이제는 llm 쪽에서 파인튜닝하는 것이 쉽지 않음
```

```python
# RAG는 항상 최신 정보를 반영할 ㅅ ㅜ있다.

# 파인튜닝은 데이터셋 잘 만드는게 중요 
```

```python
# 파인튜닝 => 바뀌는 것에 대한 유연성이 없다. (유동성에 대한 대처가 어려움) 재학습을 해야 함
```

RAG는 기술 지원, 뉴스, 법률처럼 정보가 자주 바뀌는 분야에 맞고, 정적인 정보에서 높은 정확도가 필요하면 파인튜닝이 낫다. 실무에서는 둘 중 하나가 아니라, 말투와 형식은 파인튜닝으로 맞추고 지식은 RAG로 넣는 식으로 섞어 쓰기도 한다(11번 파인튜닝 시리즈에서 다룬다).

## RAG 작동 단계

크게 **정보 저장(인덱싱)** 과 **검색·생성** 두 단계다.

```python
# DB에 검색할 내용을 저장
# 일반 RDBS를 쓰는게 아니라, 백터 데이터베이스 혹은 그래픽 데이터베이스를 사용함

# 벡터데이터베이스 : 유사한 걸 찾는거
# 예를 들어, 관계형데이터베이스는 테이블을 만들고 컬럼안에 데이터를 저장.  where절에서 내용이라는 컬럼을 이퀄 like로 찾음
# 내가 찾는 조건과 일치해야함 (유사한건?) 단, db에는 질문이 없기때문에 질문에 일치하는 데이터를 찾을 수 없음
# QA 시스템에서는 어울리지 않음
# 사용자의 질문과 유사한 걸 찾아야 함
# 유사도 기반으로 찾는 것이 벡터데이터베이스

# vectorDB
# 내용을 => embedding model에 넣어줌
# embedding vector로 바뀜
# 유사도 기반 
# 물론 저장할 때는 내용 + 임베딩값을 함
# KNN 알고리즘을 사용
# 
# 질문에 대한 임베딩모델이랑 저장에 대한 임베딩모델은 똑같은 걸 써야 함
```

이 메모가 RAG 검색의 핵심을 다 담고 있다. SQL 시리즈의 `WHERE 내용 LIKE '%연차%'`는 **글자가 일치**해야 찾는다. 그런데 사용자는 "휴가 며칠 쓸 수 있어?"라고 묻고 문서에는 "연차 유급휴가 15일"이라고 적혀 있다. 글자는 안 맞지만 **의미는 가깝다**. 그래서 문장을 임베딩 벡터(NLP 시리즈의 Word2Vec을 문장 단위로 확장한 것)로 바꿔 두고, 질문 벡터와 **가까운** 것을 찾는다. 이것이 벡터 데이터베이스다. 질문과 문서를 **같은 임베딩 모델**로 바꿔야 같은 공간에서 거리를 잴 수 있다.

### 1. 정보 저장 (인덱싱)

| 단계 | 하는 일 |
|---|---|
| **Load** | 답변할 때 참조할 데이터를 불러온다 |
| **Split / Chunking** | 긴 텍스트를 작은 덩어리(chunk)로 나눈다. 검색과 생성의 정확도가 올라간다 |
| **Embedding** | 각 조각을 의미를 담은 **임베딩 벡터**로 바꾼다. 질문과 비슷한 문서를 찾는 인덱스가 된다 |
| **Store** | 벡터를 **벡터 데이터베이스**에 저장한다 |

![RAG 인덱싱: Load, Split, Embed, Store](/images/llm/fig-rag1.png)

```python
# chunk
# embedding -> metadata
```

### 2. 검색, 생성

| 단계 | 하는 일 |
|---|---|
| **Retrieve** | 질문을 임베딩해서, 비슷한 벡터를 벡터 DB에서 찾는다 |
| **Query** | 찾은 문서 조각과 질문을 프롬프트로 묶어 LLM에 넘긴다 |
| **Generation** | LLM이 답을 생성한다 |

![RAG 검색과 생성](/images/llm/fig-rag2.png)

```python
#1-> 검색해서 prompt에 추가
#llm이 답을 잘하려면 참조문서가 좋아야함
# system을 구현하는 것은 쉬움
# 잘찾게 구현하는 것은 어려움
```

"시스템 구현은 쉽고, 잘 찾게 만드는 건 어렵다"가 RAG 묶음 6편의 큰 줄기다. 이번 글은 재료를 잘 읽고 잘 자르는 법, 다음 글들은 잘 저장하고(임베딩, 벡터 DB), 잘 찾고(Retriever, Advanced RAG), 잘 찾았는지 재는 법(평가)이다.

## Document Loader

LLM에 함께 넘길 데이터를 먼저 읽어 온다(Load). 데이터는 로컬 파일(CSV, Excel, JSON, TXT, PDF), 데이터베이스, 인터넷(API, 웹 페이지, 클라우드 스토리지) 등 여러 곳에 있다.

![Document Loader](/images/llm/fig-rag-load.png)

- 형식마다 읽는 라이브러리가 다른데, LangChain은 **같은 사용법**(`loader.load()`)으로 쓸 수 있게 감싸 둔 Document Loader를 제공한다
- 반환 타입은 **`list[Document]`**
  - `page_content`: 문서 내용
  - `metadata`: 문서 정보 dict (선택)
  - `id`: 고유 id (선택)
- LangChain의 Loader를 **꼭 써야 하는 건 아니다.** 다른 라이브러리로 읽어서 Document를 만들어도 된다

```python
# vectordb에서만 조회하는게 아니라
# 일반db에서도 조회함
# web검색 등
# 판단하면 agent까지
```

```python
# tool를 이용해서 웹검색까지

# 문서를 읽어주는 라이브러리를 제공해줌

# 라이브러리를 잘 이용하면 pdf 뷰어도 만들 수 있음

# pypdf

# 근데 랭체인에서는 도큐먼트로더를 통해서 로드 가능함
```

```python
# 인테그레이션스=>이미 있는 라이브러리를 랭체인에서 쓸 수 있게 도와줌

# 리스트(도큐먼트-페이지컨텐트, 메타데이터, 아이디)
```

```python
!uv pip install langchain-community -U
```

### TextLoader

```python
from langchain_community.document_loaders import TextLoader

path = "data/olympic.txt"

with open(path,"rt", encoding="utf-8") as f:
    print(f.read()[:1000])

#객체 생성 읽을 파일의 경로를 지정
loader = TextLoader(path, encoding="utf-8")

docs = loader.load() # 데이터를 바로 로드
docs - loader.lazy_load() # 데이터를 읽을 때 로드

print(type(docs), len(docs)) # 데이터의 타입 및 길이
print(docs[0])

for doc in docs:
    print(type(docs[0]))
```

```text
올림픽
올림픽(영어: Olympic Games, 프랑스어: Jeux olympiques)은 전 세계 각 대륙 각국에서 모인 수천 명의 선수가 참가해 여름과 겨울에 스포츠 경기를 하는 국제적인 대회이다. … (파일 앞 1000자, 생략) …
<class 'list'> 1
page_content='올림픽\n올림픽(영어: Olympic Games, 프랑스어: Jeux olympiques)은 … (생략) … 국가 올림픽 위원회(NOC)와 방송사에서는 자국의 메달 현황을 실시간으로 전달하기도 한다.' metadata={'source': 'data/olympic.txt'}
<class 'langchain_core.documents.base.Document'>
```

텍스트 파일 하나가 Document **하나**가 되었고, 메타데이터에는 Loader가 넣은 `source`(파일 경로)만 있다.

코드의 `docs - loader.lazy_load()`는 `=` 자리에 `-`(빼기)가 들어간 오타라서, 지금 코드 그대로 다시 실행하면 이 줄에서 TypeError가 난다. 의도는 `docs = loader.lazy_load()`다. `load()`는 전부 읽어서 list로, `lazy_load()`는 하나씩 읽는 generator로 돌려준다. 파일이 아주 많을 때 메모리를 아끼려고 `lazy_load()`를 쓴다.

`Document`에는 메타데이터를 추가할 수 있다.

```python
doc.metadata['category'] = "sports"
doc.metadata['tag'] = ["올림픽","IOC","동계올림픽", "하계올림픽"]

doc.metadata
```

```text
{'source': 'data/olympic.txt',
 'category': 'sports',
 'tag': ['올림픽', 'IOC', '동계올림픽', '하계올림픽']}
```

```python
doc = docs[0]
print({"문서정보: doc.metadata"})
# 메타데이터의 키는 사전에 설계가 필요함.
print(doc.metadata)
# 필요한 정보들을 추가할 수 있다. LLM의 입력값(프롬프트)에 추가할 것들 , 검색할 때 사용할 정보들을 넣어둠
```

```text
{'문서정보: doc.metadata'}
{'source': 'data/olympic.txt', 'category': 'sports', 'tag': ['올림픽', 'IOC', '동계올림픽', '하계올림픽']}
```

첫 줄은 `print({"문서정보: doc.metadata"})`가 문자열 하나를 담은 **set**을 출력한 것이다. `print("문서정보:", doc.metadata)`처럼 쉼표로 나눠야 의도대로 나온다.

`source`는 Loader가 자동으로 넣은 값이고, `category`와 `tag`는 직접 추가한 값이다. 메모대로 메타데이터 키는 **미리 설계**해야 한다. 나중에 "스포츠 문서에서만 찾기"처럼 **검색 필터**로 쓰고, 답변에 "출처: olympic.txt"를 붙이는 데도 쓴다.

```python
print("문서식별자")
print(doc.id)
doc.metadata
```

```text
문서식별자
None

{'source': 'data/olympic.txt',
 'category': 'sports',
 'tag': ['올림픽', 'IOC', '동계올림픽', '하계올림픽']}
```

`id`는 Loader가 만들어 주지 않는다. 벡터 DB에 저장할 때 붙는다.

### PDF

| Loader | 기반 라이브러리 | 특징 |
|---|---|---|
| `PyPDFLoader` | pypdf | 텍스트를 빠르게 추출. 가볍고 큰 파일도 효율적 |
| `PyMuPDFLoader` | PyMuPDF | 텍스트 외에 이미지, 주석 추출 성능이 좋다 |
| `PDFPlumberLoader` | pdfplumber | 표처럼 복잡한 구조에 강하다 |

```python
# - `pip install pypdf -qU`
# - `pip install pymupdf -qU`
# - `pip install pdfplumber -qU`
```

```python
from langchain_community.document_loaders import PyPDFLoader, PyMuPDFLoader, PDFPlumberLoader

path = "data/novel/한국민속문학사전_설화_1권.pdf"
# Document loader 생성
loader = PDFPlumberLoader(path)

# 읽기
docs = loader.load() #list[Document]
print(len(docs))
```

```text
230
```

```python
from pprint import pprint
doc = docs[0]
pprint(doc.metadata)
# doc.metadata['author'] = '김유정'
```

```text
{'CreationDate': 'D:20220324133816',
 'Creator': 'PDFium',
 'Producer': 'PDFium',
 'file_path': 'data/novel/한국민속문학사전_설화_1권.pdf',
 'page': 0,
 'source': 'data/novel/한국민속문학사전_설화_1권.pdf',
 'total_pages': 230}
```

PDF Loader는 **페이지 하나를 Document 하나**로 만든다. 230쪽이라 Document 230개다. 메타데이터의 `page`가 있어서 "몇 쪽에서 찾았는지"를 답변에 붙일 수 있다.

### 웹 문서: WebBaseLoader

`requests`로 페이지를 받고 `BeautifulSoup`으로 파싱해서 Document로 만든다. 3번 웹 크롤링 시리즈에서 직접 하던 일을 Loader 하나로 한다.

| 파라미터 | 내용 |
|---|---|
| `web_paths` | 크롤링할 URL (str 또는 list) |
| `requests_kwargs` | `requests.get()`에 넘길 값 (headers, cookies, verify 등) |
| `header_template` | HTTP 헤더 |
| `bs_kwargs` | `BeautifulSoup()`에 넘길 값. 특히 **`parse_only`**에 `SoupStrainer`를 주면 페이지의 원하는 부분만 파싱한다 |
| `bs_get_text_kwargs` | `get_text()`에 넘길 값. RAG용이면 **`separator`와 `strip=True`를 꼭 준다** |

먼저 `get_text()`의 옵션 차이:

```python
!uv pip install beautifulsoup4 requests
```

```python
from bs4 import BeautifulSoup


### 웹페이지에서 가져온 정보 형식

html_txt ="""<html> 
<boby> 
<p><b>제목</b> <span>내용</span></p>
<p>다음 문단</p>
<div>다음 내용</div>
</boby>
<html>
"""

soup = BeautifulSoup(html_txt)
txt1 =soup.get_text()#태그내의 text(content)만 추출한다.
txt2 =soup.get_text(strip=True)# tag사이의 공백(' ', 엔터, tab)을 제거
txt3 =soup.get_text(strip=True, separator="\n")
#separator는 각 태그내의 text들을 지정한 구분자로 나눠서 반환 ' separator '


print("-----" * 21) 
print(txt1)
print("-----" * 10, "strip", "-----" * 10) 
print(txt2)
print("-----" * 10, "strip/separator", "-----" * 8) 
print(txt3)
print("-----" * 21) 
```

```text
---------------------------------------------------------------------------------------------------------


제목 내용
다음 문단
다음 내용



-------------------------------------------------- strip --------------------------------------------------
제목내용다음 문단다음 내용
-------------------------------------------------- strip/separator ----------------------------------------
제목
내용
다음 문단
다음 내용
---------------------------------------------------------------------------------------------------------
```

| 옵션 | 결과 | 문제 |
|---|---|---|
| 기본 | 줄바꿈·공백이 그대로 섞여 나온다 | 빈 줄이 많다 |
| `strip=True` | 공백을 다 지워서 붙는다 | "제목내용다음 문단"처럼 **단어가 붙는다** |
| `strip=True, separator="\n"` | 태그마다 줄을 나눈다 | 문단 구조가 살아 있다 → RAG용으로 적합 |

`strip=True`만 주면 단어가 붙어서 임베딩과 검색 품질이 떨어진다. 그래서 둘을 같이 쓴다.

`SoupStrainer`는 원하는 태그만 파싱하게 한다.

```python
from bs4 import SoupStrainer

strainer = SoupStrainer("p") # <span> 태그들만 parsing함 + 하위 태그들도 가지고 옴
soup2 = BeautifulSoup(html_txt, parse_only=strainer)
soup2
```

```text
<p><b>제목</b> <span>내용</span></p><p>다음 문단</p>
```

`<p>`와 그 안의 하위 태그만 남고 `<div>`는 빠졌다(주석의 `<span>`은 `<p>`를 잘못 적은 것이다).

이제 실제 뉴스 기사를 Loader로 읽는다. 옵션 없이 읽으면:

```python
# 랭체인 방식

from langchain_community.document_loaders import WebBaseLoader

loader = WebBaseLoader(
    "https://m.sports.naver.com/wbaseball/article/003/0014028024"
)

docs = loader.load()

pprint(docs[0].page_content)
```

```text
("'홍명보호 응원' 이정후, 이틀 연속 멀티히트…수비선 팀 구한 슈퍼캐치본문 바로가기NAVER스포츠뉴스엔터메뉴북중미 "
 '월드컵홈야구해외야구축구해외축구농구배구N골프일반e스포츠아웃도어NEW뉴스영상일정순위포토홈 바로가기NAVER스포츠뉴스엔터스포츠북중미 '
 '월드컵야구해외야구축구해외축구농구배구N골프일반e스포츠아웃도어콘텐츠오늘의 경기승부예측연재이슈톡대학스포츠랭킹기타고객센터공식 블로그메뉴 '
 "닫기'홍명보호 응원' 이정후, 이틀 연속 멀티히트…수비선 팀 구한 슈퍼캐치입력2026.06.25. 오후 1:46수정2026.06.25. "
 '오후 1:47기사원문공감좋아요0슬퍼요0화나요0팬이에요0후속기사 원해요0텍스트 음성 변환 서비스본문 듣기를 종료하였습니다.글자 크기 '
 … (생략)
```

기사 본문 앞에 "바로가기NAVER스포츠뉴스엔터메뉴북중미 월드컵홈야구해외야구…" 같은 **메뉴와 버튼 텍스트**가 줄줄이 붙어 있다. 이대로 벡터 DB에 넣으면 "야구" 검색에 모든 기사가 걸린다. 본문 영역만 골라야 한다.

```python
# lxml은 설치후에 kernerl 재시작
```

```python
from langchain_community.document_loaders import WebBaseLoader
import os
os.environ['USER_AGENT'] ="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"

url = ["https://m.sports.naver.com/wbaseball/article/003/0014028024", 
       "https://m.sports.naver.com/volleyball/article/076/0004419230"
       
       ]

loader = WebBaseLoader(
    # web_path=url[1], # 문서 갯수 선택
    web_path=url, # 여러문서를 조화
    # default_parser="lxml", # Beatifulsoup(문서 str, parser(html.parser))
    bs_kwargs={#뷰티풀숲의 객체를 생성할 때 넣어줄 파라미터 설정
        "parse_only":SoupStrainer(name="div", attrs={"class":"_article_content"})
        },
    bs_get_text_kwargs={"strip":True, "separator":"\n\n"}
)
docs = loader.load()
print(len(docs))
pprint(docs[0].page_content)
```

```text
2
('두 차례 호수비…공수 맹활약\n'
 '\n'
 '[샌프란시스코=AP/뉴시스] 샌프란시스코 자이언츠의 이정후가 24일(현지 시간) 미 캘리포니아주 샌프란시스코 오라클 파크에서 열린 '
 '2026 메이저리그 애슬레틱스와 경기 2회 말 우전 2루타를 치고 있다. 이정후는 4타수 2안타를 기록했고, 샌프란시스코는 9회 말 '
 '0-1 상황에서 홈런 두 방으로 2-1 역전승을 거뒀다. 2026.06.25.\n'
 '\n'
 '[서울=뉴시스]김희준 기자 =\n'
 '\n'
 '손흥민\n'
 '\n'
 '(LAFC)의 국가대표 유니폼을 입고 홍명보호 응원에 나섰던\n'
 '\n'
 '이정후\n'
 '\n'
 '(샌프란시스코 자이언츠)가 이틀 연속 멀티히트를 때려냈다.\n'
 … (생략)
```

메뉴 텍스트가 사라지고 **본문만** 남았다. URL 두 개를 넣어 Document도 2개다. `USER_AGENT`는 요청을 보내는 프로그램 이름인데, 지정하지 않으면 LangChain이 경고를 띄우고 일부 사이트는 요청을 막는다. 브라우저처럼 보이게 지정했다.

다만 "손흥민", "이정후"처럼 **링크가 걸린 이름**이 앞뒤 문장과 끊겨 따로 한 줄씩 나왔다. 링크도 하나의 태그라서 separator가 그 앞뒤에 들어갔기 때문이다. 정규식으로 정리한다.

```python
import re

text = docs[0].page_content

# 여러 줄바꿈을 1개로
text = re.sub(r"\n+", "\n", text)

# 여러 공백을 1개로
text = re.sub(r"\s+", " ", text)

pprint(text)
```

```text
('두 차례 호수비…공수 맹활약 [샌프란시스코=AP/뉴시스] 샌프란시스코 자이언츠의 이정후가 24일(현지 시간) 미 캘리포니아주 샌프란시스코 '
 '오라클 파크에서 열린 2026 메이저리그 애슬레틱스와 경기 2회 말 우전 2루타를 치고 있다. 이정후는 4타수 2안타를 기록했고, '
 '샌프란시스코는 9회 말 0-1 상황에서 홈런 두 방으로 2-1 역전승을 거뒀다. 2026.06.25. [서울=뉴시스]김희준 기자 = '
 '손흥민 (LAFC)의 국가대표 유니폼을 입고 홍명보호 응원에 나섰던 이정후 (샌프란시스코 자이언츠)가 이틀 연속 멀티히트를 때려냈다. '
 … (생략)
```

문장이 이어졌다. 다만 `\s`는 줄바꿈도 포함하므로 둘째 정규식이 첫째의 결과까지 공백으로 바꿔서, 문단 구분도 함께 사라졌다. 문단을 살리려면 둘째 줄을 `re.sub(r"[ \t]+", " ", text)`처럼 줄바꿈을 뺀 공백에만 적용한다. NLP 시리즈의 정규 표현식 글이 이런 전처리에 쓰인다.

### 웹사이트 전체: RecursiveUrlLoader

시작 URL에서 페이지 안의 `<a href>` 링크를 **재귀적으로 따라가며** 여러 페이지를 수집한다. WebBaseLoader가 페이지 단위라면 이것은 **사이트 구조 전체**를 크롤링한다.

```text
시작 URL
├─ 내부 링크 1
│   ├─ 내부 링크 1-1
│   └─ 내부 링크 1-2
├─ 내부 링크 2
└─ 내부 링크 3
```

| 파라미터 | 내용 |
|---|---|
| `url` | 시작 URL |
| `max_depth` | 몇 단계 깊이까지 따라갈지 (0: 시작 페이지만, 1: + 1차 링크, 2: + 2차 링크). 사이트 폭주를 막는 안전장치 |
| `exclude_dirs` | 제외할 경로 (`['/login', '/signup']`) |
| `prevent_outside` / `base_url` | True면 base_url 밖의 링크는 따라가지 않는다 |
| `extractor` | 페이지 HTML에서 내용을 뽑는 함수. 기본은 `BeautifulSoup(html).get_text()` |

```python
# 완벽하게 자동화하는 방법은 아직없음 llm이 훨씬 더 잘함

from bs4 import BeautifulSoup
from langchain_community.document_loaders import RecursiveUrlLoader

start_url = "https://docs.python.org/3/"

def extractor(html:str) -> str:
    """RecursiveUrlLoader는 Html문서를 그대로 반환.
    HTML문서를 str로 받아서 원하는 부분만 추출하는 함수
    Args:
         html(str): HTML(웹) 문서
    Returns:
         str: html에서 body의 content(text)만 추출해서 반환.

    """
    soup = BeautifulSoup(html)
    body_element = soup.select_one("div.body") #python doc 사이트 
    return body_element.get_text(strip = True, separator = '\n') if body_element is not None else soup.get_text(strip = True, separator = "\n")
loader = RecursiveUrlLoader( # 동적크롤러를 랭체인에서 툴로 사용
    url = start_url,
    max_depth = 2,
    prevent_outside = True,
    base_url =start_url,
    extractor=extractor
)
docs = loader.load()
docs


# 우리 질문에 대해 사용할 수집할 때, 이런 툴을 사용해서 수집함 => 임베딩
# 실제 rag에 시스템을 만들때, 뷰티풀숲,셀레니움 이 랭체인로직 등을 활용해서 검색하는 시스템을 만들어도 됌
# 데이터를 전처리 가공하는게 제일 중요

# 우리가 배우는 지금 단계 => 여러 리소스를 LOAD하는 법, 다음 단계는 split
```

```text
[Document(metadata={'source': 'https://docs.python.org/3/', 'content_type': 'text/html', 'title': '3.14.6 Documentation', 'description': 'The official Python documentation.', 'language': 'en'}, page_content='Python 3.14.6 documentation\nWelcome! This is the official documentation for Python 3.14.6.\nDocumentation sections:\nWhat\'s new in Python 3.14?\nOr\nall "What\'s new" documents since Python 2.0\nTutorial\nStart here: a tour of Python\'s syntax and features\n … (생략)
```

```python
idx = 1
doc = docs[idx]
print(doc.metadata)
```

```text
{'source': 'https://docs.python.org/3/license.html', 'content_type': 'text/html', 'title': 'History and License — Python 3.14.6 documentation', 'description': 'History of the software: Python was created in the early 1990s by Guido van Rossum at Stichting Mathematisch Centrum (CWI, see https://www.cwi.nl) in the Netherlands as a successor of a language ca...', 'language': 'en'}
```

Python 공식 문서 첫 페이지에서 링크를 따라 라이선스 페이지까지 들어갔다. 메타데이터에 페이지 제목과 설명(`<meta>` 태그)이 자동으로 들어간다. `extractor`는 사이트마다 본문을 감싼 태그가 달라서(`div.body`는 Python 문서의 구조) 사이트에 맞게 짜야 하고, 본문 태그가 없는 페이지는 전체 텍스트로 대신한다. "완벽하게 자동화하는 방법은 아직 없다"는 메모처럼 이 부분이 수집의 손이 많이 가는 곳이고, **데이터 전처리가 RAG 품질을 가장 크게 좌우한다**.

### 논문: arxiv

[arXiv](https://arxiv.org/)는 코넬대학교가 운영하는 무료 논문 저장소다(물리, 수학, 컴퓨터 과학, 금융 등). LangChain의 `ArxivLoader`는 arXiv API 변경을 따라가지 못해 동작하지 않아서, `arxiv` 라이브러리로 검색하고 PDF를 직접 받는다.

```python
!uv pip install arxiv
```

```python
# arxiv lib를 이용해서 arxiv.org의 논문을 검색해서 다운로드 or 논문의 주요 정보를 조회한다.
# RAG 문서로 arxiv의 논문들이 필요할 경우 이용할 수 있다.
import arxiv
# 검색 관련 설정
search = arxiv.Search(
    query="Advanced RAG", #검색어 
    max_results=10, # 검색 논문 최대 갯수
    sort_by=arxiv.SortCriterion.Relevance #정렬기준 
)

# 정렬기준
# arxiv.SortCrierion
## Relevance: query와 관련성이 높은 (정확도) 순서
## LastUpdataeDate: 논문이 마지막으로 수정 업데이트 된 날짜.
## SubmiitedDate: 논문이 처음 제출된 날짜
```

```python
# 검색 결과 조회
client = arxiv.Client()

for paper in client.results(search):
    print("=" * 80)
    print(f"제목 : {paper.title}")
    print(f"저자(LIST) : {[author.name for author in paper.authors]}")
    print(f"발행일 : {paper.published}")
    print(f"논문 URL : {paper.entry_id}")
    print(f"PDF URL : {paper.pdf_url}")
    print(f"초록 : {paper.summary[:300]}...")
    print()

# 주요 속성
# paper.title        : 논문 제목
# paper.authors      : 저자 목록
# paper.summary      : 초록(Abstract)
# paper.entry_id     : 논문 상세 페이지 URL
# paper.pdf_url      : PDF 다운로드 URL
# paper.published    : 최초 게시일
# paper.updated      : 최근 수정일
# paper.categories   : 논문 카테고리

# PDF 다운로드
# paper.download_pdf(dirpath="./papers")

# 활용 예시
# 1. 특정 주제의 최신 논문 수집
# 2. 논문 초록(Abstract)만 수집하여 RAG 구축
# 3. PDF 다운로드 후 파싱하여 벡터DB 구축
# 4. 연구 동향 분석 및 논문 추천 시스템 구축
```

```text
================================================================================
제목 : MultiHop-RAG: Benchmarking Retrieval-Augmented Generation for Multi-Hop Queries
저자(LIST) : ['Yixuan Tang', 'Yi Yang']
발행일 : 2024-01-27 11:41:48+00:00
논문 URL : http://arxiv.org/abs/2401.15391v1
PDF URL : https://arxiv.org/pdf/2401.15391v1
초록 : Retrieval-augmented generation (RAG) augments large language models (LLM) by retrieving relevant knowledge, showing promising potential in mitigating LLM hallucinations and enhancing response quality, thereby facilitating the great adoption of LLMs in practice. However, we find that existing RAG sys...

… (나머지 9편 생략)
```

```python
# 웹사이트 -> RecursiveUrlLoader
# PDF 논문 -> arxiv
# 로컬 파일 -> PyPDFLoader, TextLoader
# Youtube -> YoutubeLoader
#
# 다양한 Loader로 데이터를 수집한 뒤
# Chunking -> Embedding -> VectorDB 저장 -> RAG 검색
```

검색 → PDF 다운로드 → PyPDFLoader로 읽기 → 논문 정보를 메타데이터에 넣은 Document 만들기를 함수 하나로 묶었다.

```python
import os
import requests
import arxiv

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document


def load_arxiv_docs(
    query: str,
    top_k: int = 10,
    dirpath: str = "./papers"
) -> list[Document]:
    """
    arXiv에서 논문을 검색한 뒤 PDF를 다운로드하고
    Document 객체 리스트를 반환한다.

    Returns:
        list[Document]
    """

    os.makedirs(dirpath, exist_ok=True)

    search = arxiv.Search(
        query=query,
        max_results=top_k,
        sort_by=arxiv.SortCriterion.Relevance
    )

    client = arxiv.Client()

    documents = []

    for paper in client.results(search):

        # PDF 다운로드
        response = requests.get(paper.pdf_url)
        response.raise_for_status()

        pdf_path = os.path.join(
            dirpath,
            f"{paper.entry_id.split('/')[-1]}.pdf"
        )

        with open(pdf_path, "wb") as f:
            f.write(response.content)

        # PDF 로드
        pdf_docs = PyPDFLoader(pdf_path).load()

        # 페이지 내용 합치기
        paper_content = "\n".join(
            [doc.page_content for doc in pdf_docs]
        )

        # Document 생성
        document = Document(
            page_content=paper_content,
            metadata={
                "title": paper.title,
                "authors": [author.name for author in paper.authors],
                "published": str(paper.published),
                "updated": str(paper.updated),
                "summary": paper.summary,
                "pdf_url": paper.pdf_url,
                "entry_id": paper.entry_id,
                "categories": paper.categories
            }
        )

        documents.append(document)

    return documents
```

```python
docs = load_arxiv_docs(
    query="Advanced RAG",
    top_k=3
)

print(len(docs))
print(docs[0].metadata["title"])
print(docs[0].page_content[:500])
```

```text
3
MultiHop-RAG: Benchmarking Retrieval-Augmented Generation for Multi-Hop Queries
MultiHop-RAG: Benchmarking Retrieval-Augmented Generation for
Multi-Hop Queries
Yixuan Tang and Yi Yang
Hong Kong University of Science and Technology
{yixuantang,imyiyang}@ust.hk
Abstract
Retrieval-augmented generation (RAG) aug-
ments large language models (LLM) by re-
trieving relevant knowledge, showing promis-
ing potential in mitigating LLM hallucinations
and enhancing response quality, thereby facil-
itating the great adoption of LLMs in prac-
tice. However, we find that existing RAG sys-
```

PDF Loader는 페이지마다 Document를 만들지만, 여기서는 페이지를 합쳐 **논문 하나 = Document 하나**로 만들었다. 제목, 저자, 초록이 메타데이터에 들어가서 "2024년 이후 논문만"처럼 필터링할 수 있다. 본문을 보면 "aug-\nments", "re-\ntrieving"처럼 **줄 끝 하이픈으로 단어가 잘려** 있다. 2단 편집 PDF에서 흔한 문제로, 이대로 임베딩하면 "augments"와 "aug-"가 다른 토큰이 된다. 하이픈+줄바꿈을 지우는 전처리가 필요하다.

### Docling

IBM Research의 오픈소스 문서 변환 도구다. PDF, DOCX, PPTX, XLSX, HTML, 이미지를 읽고, PDF의 **레이아웃, 읽기 순서, 표 구조, 코드, 수식**을 분석해서 마크다운·HTML·JSON으로 바꿔 준다. OCR로 스캔본도 읽는다. 강의 자료에서 논문 PDF를 마크다운으로 읽은 결과 일부다.

```python
from langchain_docling import DoclingLoader 
from langchain_docling.loader import ExportType

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption

# 현재 torch와 docling이 사용하는 OCR Lib (RapidOCR) 호환성 문제 때문에 OCR 기능을 끄는 설정을 한다.
pdf_option = PdfPipelineOptions()
pdf_option.do_ocr = False

converter = DocumentConverter(
    format_options={
        InputFormat.PDF: PdfFormatOption(
            pipeline_options=pdf_option
        )
    }
)

path = ["data/papers/2409.03708v2.pdf", "data/papers/transformers/2209.03452v1.pdf"]
loader = DoclingLoader(
    file_path=path,
    export_type=ExportType.MARKDOWN,
    converter=converter
)
docs = loader.load()
print(docs[1].page_content)
```

```text
## AILAB-Udine@SMM4H'22: Limits of Transformers and BERT Ensembles

## Beatrice Portelli

portelli.beatrice@spes.uniud.it University of Udine, Italy University of Naples Federico II , Italy
… (생략) …

## Abstract

This paper describes the models developed by the AILAB-Udine team for the SMM4H'22 Shared Task. We explored the limits of Transformer based models on text classification, entity extraction and entity normalization, tackling Tasks 1, 2, 5, 6 and 10. … (생략)

## 1 Introduction

Transformer-based models are the backbone of state-of-the-art solutions for a lot of NLP tasks. … (생략)
```

PyPDFLoader 결과와 비교하면 차이가 크다. 제목·초록·서론이 `##` 헤더로 구분되고, 줄 끝 하이픈 없이 문단이 이어진다. 이 마크다운은 아래 MarkdownHeaderTextSplitter로 **섹션 단위**로 나눌 수 있다. 대신 레이아웃 분석 모델을 내려받아 돌리므로 느리다.

## Chunking (문서 분할)

![Chunking](/images/llm/fig-rag-split.png)

Load한 문서를 정해진 기준의 덩어리(chunk)로 나눈다. 이 부분은 강의 자료의 코드와 출력이다.

**나누는 이유**

1. **임베딩 모델의 입력 길이 제한**: 모델이 한 번에 처리할 수 있는 토큰 수를 넘으면 처리가 안 된다
2. **검색 정확도**: 100쪽 매뉴얼에서 특정 기능을 물으면 그 기능을 설명한 몇 문단만 찾는 게 낫다. 문서 전체를 넣으면 질문과 무관한 내용이 노이즈가 된다
3. **계산 효율**: 유사도 계산, 임베딩 생성이 작은 단위에서 빠르고 메모리도 덜 쓴다

Splitter의 목표는 **의미 있는 덩어리를 최대한 유지하면서 최대 길이(`chunk_size`)를 넘지 않게** 나누는 것이다.

| Splitter | 기준 | 특징 |
|---|---|---|
| `CharacterTextSplitter` | 구분자 하나 (기본 `"\n\n"`) | 가장 단순. 구분자로 나눈 조각이 chunk_size보다 커도 그대로 둔다 |
| `RecursiveCharacterTextSplitter` | 구분자 여러 개를 순서대로 (`"\n\n"` → `"\n"` → `" "` → `""`) | chunk_size를 넘는 조각만 다음 구분자로 다시 나눈다. **가장 많이 쓴다** |
| `.from_tiktoken_encoder()` / `.from_huggingface_tokenizer()` | 글자 수 대신 **토큰 수** | LLM 입력 제한은 토큰 기준이라 더 정확하다 |
| `MarkdownHeaderTextSplitter` | 마크다운 헤더 (`#`, `##`) | 섹션 단위로 나누고 헤더를 메타데이터로 남긴다 |

주요 파라미터:

- `chunk_size`: 각 조각의 최대 길이
- `chunk_overlap`: 이웃한 조각끼리 겹치는 길이. 경계에서 문맥이 끊기지 않게 앞 조각의 끝부분을 다음 조각 앞에 붙인다
- `separators`: 구분자 목록

메소드는 문자열을 나누는 `split_text(str)`과 Document 리스트를 나누는 `split_documents(list[Document])` 두 가지다.

### CharacterTextSplitter

```python
!uv pip install langchain-text-splitters
```

```python
text = """123456789012345678901234567890123456789012345678901234567890123456789

abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ

가나다라마바사아자차카타파하

아야어여오요우유으이

abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
"""
```

```python
from langchain_text_splitters import CharacterTextSplitter
from langchain_core.documents import Document

splitter = CharacterTextSplitter(
    chunk_size=60,
    chunk_overlap=10,  # default: 200, chunk_overlap이 chunk_size보다 크면 안됨.
    # chunk_overlap은 separator가 빈문자열일때 적용된다.
    # separator="" # 기본: `\n\n` -> "" 변경. "": chunk_size에 맞추겠다.
)

result = splitter.split_text(text) # 입력: str
print(type(result))
print(type(result[0]))
print(len(result))
```

```text
<class 'list'>
<class 'str'>
4
```

```python
for chunk in result:
    print(len(chunk), chunk)
    print("-------------------------------------------------")
```

```text
60 123456789012345678901234567890123456789012345678901234567890
-------------------------------------------------
60 1234567890123456789

abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLM
-------------------------------------------------
60 DEFGHIJKLMNOPQRSTUVWXYZ

가나다라마바사아자차카타파하

아야어여오요우유으이

abcdefg
-------------------------------------------------
55 이

abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
-------------------------------------------------
```

4조각 모두 60자 이하로 잘렸는데, 구분자와 상관없이 **정확히 60자씩** 끊겼다. 첫 줄의 숫자 69자는 앞 60자와 나머지로 갈렸고, 알파벳은 중간(`…KLM` / `DEF…`)에서 끊겼다. 조각 사이는 overlap 10자만큼 겹친다. 첫 조각의 마지막 `1234567890`이 둘째 조각 앞에, 둘째 조각 끝의 `DEFGHIJKLM`이 셋째 조각 앞에 다시 나온다. 이론 설명대로라면 기본 구분자 `"\n\n"`로만 나눠야 하는데 글자 단위로 잘린 걸 보면, 이 버전에서는 구분자로 나눌 수 없을 때 길이 기준으로 자른 것으로 보인다. Splitter 동작은 버전에 따라 달라지니 **결과를 직접 찍어 보고** 쓰는 게 안전하다.

```python
doc = Document(page_content=text)
# 나눈 문서가 Document 객체일때
result_docs = splitter.split_documents([doc])
print(len(result_docs))
print(type(result_docs[0]))
```

```text
4
<class 'langchain_core.documents.base.Document'>
```

`split_documents`는 Document를 받아 Document 리스트로 돌려준다. 원래 문서의 메타데이터가 조각마다 복사된다.

### RecursiveCharacterTextSplitter

```python
text2 = """1234567890123456789012345678901234567890
12345678901234567890123456789

abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRST.UVWXYZ

가나다라마바사아자차카타파하

아야어여오요우유으이

abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ RSTUVWXYZ
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
"""
```

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=50,
    chunk_overlap=10,
    separators=["\n\n", "\n", r"[\.?!,~]", ' ', ''] # 구분자 리스트를 직접 지정
    , is_separator_regex=True  # 구분자에 정규표현식 사용가능 여부.
)
result2 = splitter.split_text(text2)
for txt in result2:
    print(len(txt), txt)
    print('--------------------------------------------')
```

```text
40 1234567890123456789012345678901234567890
--------------------------------------------
29 12345678901234567890123456789
--------------------------------------------
46 abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRST
--------------------------------------------
7 .UVWXYZ
--------------------------------------------
26 가나다라마바사아자차카타파하

아야어여오요우유으이
--------------------------------------------
43 abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ
--------------------------------------------
9 RSTUVWXYZ
--------------------------------------------
49 abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVW
--------------------------------------------
13 NOPQRSTUVWXYZ
--------------------------------------------
```

조각마다 어느 구분자가 쓰였는지 보인다.

| 조각 | 나뉜 이유 |
|---|---|
| 숫자 40자 / 29자 | `"\n\n"`로 나눈 첫 덩어리(70자)가 50자를 넘어서 `"\n"`으로 다시 나눔 |
| `…QRST` / `.UVWXYZ` | 53자라 `"\n"`도 없어서, 정규식 구분자 `.`에서 나눔 |
| 가나다… + 아야어… | 두 덩어리를 합쳐도 26자라 **합쳐서** 하나로 |
| `…NOPQ` / `RSTUVWXYZ` | 공백 `" "`에서 나눔 |
| `…QRSTUVW` / `NOPQRSTUVWXYZ` | 구분자가 하나도 없어서 마지막 `""`(글자 단위)로 50자 이내에서 자름. 이때만 **overlap 10자**(`NOPQRSTUVW`)가 적용됨 |

자연스러운 경계(문단 → 줄 → 문장부호 → 단어)를 먼저 찾고, 정 안 될 때만 글자 단위로 자른다. 구분자에서 정상적으로 나뉜 곳에는 overlap이 없다. 정규식 구분자 `r"[\.?!,~]"`처럼 문장부호를 넣으면 한국어 문장 경계도 살릴 수 있다.

실제 문서에 적용하면:

```python
## 문서 Load => Split
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

path = "data/olympic.txt"

# load
loader = TextLoader(path, encoding="UTF-8")
docs = loader.load()
print("Load한 문서 개수", len(docs))

# split
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", r"[\.?!,~]", ' ', ''], 
    is_separator_regex=True
)
split_docs = splitter.split_documents(docs)
print("Split후 문서 개수", len(split_docs))
```

```text
Load한 문서 개수 1
Split후 문서 개수 61
```

```python
split_docs[1].page_content
```

```text
'올림픽(영어: Olympic Games, 프랑스어: Jeux olympiques)은 전 세계 각 대륙 각국에서 모인 수천 명의 선수가 참가해 여름과 겨울에 스포츠 경기를 하는 국제적인 대회이다. … (생략) … 이때부터 IOC는 올림픽 운동의 감독 기구가 되었으며, 조직과 활동은 올림픽 헌장을 따른다'
```

약 2만 자짜리 문서 하나가 500자 이내 조각 61개가 되었다. 둘째 조각은 "올림픽 헌장을 따른다"에서 끝난다. 마침표 구분자에서 나뉘어서 마침표가 다음 조각으로 넘어갔다. `loader.load_and_split(splitter)`로 읽기와 나누기를 한 번에 해도 결과(61개)는 같다.

### 토큰 수 기준으로 나누기

LLM의 입력 제한은 **토큰 수**다. 그래서 글자 수보다 토큰 수로 chunk 크기를 정하는 게 정확하다. 토큰 수는 **실제로 쓸 모델의 토크나이저**로 세야 한다(NLP 시리즈의 서브워드 토크나이저 글에서 본 것처럼 토크나이저마다 같은 문장의 토큰 수가 다르다).

| 방법 | 쓰는 경우 | 인코딩 |
|---|---|---|
| `.from_tiktoken_encoder(encoding_name=…)` | OpenAI GPT 모델 | `o200k_base`(GPT-4o 이후), `cl100k_base`(GPT-4·3.5-Turbo), `r50k_base`(GPT-3) |
| `.from_huggingface_tokenizer(tokenizer=…)` | Hugging Face 모델 | 그 모델의 `AutoTokenizer` |

```python
!uv pip install tiktoken
```

```python
from langchain_text_splitters import CharacterTextSplitter, RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader

path = "data/olympic.txt"

loader = TextLoader(path, encoding="utf-8")
#from_tiktoken_encoder() -> OpenAI GPT모델을 사용할 경우 사용.
#                           GPT모델명 또는 Encoder(토큰나이저)의 이름
# splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
#     # model_name="gpt-5",
#     encoding_name="o200k_base",
#     chunk_size=500, # 500토큰기준
#     chunk_overlap=50, # 50토큰
# )
splitter = CharacterTextSplitter.from_tiktoken_encoder(
    # model_name="gpt-5",
    encoding_name="o200k_base",
    chunk_size=500, # 500토큰기준
    chunk_overlap=50, # 50토큰
)
docs = loader.load_and_split(splitter)
print(len(docs))
print(len(docs[0].page_content))
```

```text
18
1726
```

같은 문서가 500**자** 기준으로는 61조각, 500**토큰** 기준으로는 18조각이다. 첫 조각이 1,726자이니, 이 한국어 문서에서 GPT 토크나이저는 1토큰에 대략 3.5자 정도다.

```python
# huggingface tokenzier 이용
from transformers import AutoTokenizer
model_id = "google/gemma-3-4b-it"
tokenizer = AutoTokenizer.from_pretrained(model_id)# model_id는 사용할 LLM 모델의 이름 
splitter_hf = RecursiveCharacterTextSplitter.from_huggingface_tokenizer(
    tokenizer=tokenizer, # transformers.Tokenizer객체
    chunk_size=500,
    chunk_overlap=50
)
docs = loader.load_and_split(splitter_hf)
len(docs)
```

```text
35
```

같은 500토큰인데 Gemma 토크나이저로는 35조각이다. GPT(18)의 두 배 가까이 된다. Gemma 토크나이저가 이 한국어 문장을 더 잘게 쪼갠다는 뜻이고, 다른 토크나이저로 세면 chunk 크기가 크게 어긋날 수 있다는 예다(Splitter 종류도 Character와 Recursive로 달라서 단순 비교는 아니다).

### MarkdownHeaderTextSplitter

마크다운 문서를 **헤더 기준**으로 나누고, 헤더를 메타데이터로 남긴다.

```python
text = """
# 대주제1
- 동물

## 중주제1
- 포유류

- 조류

### 소주제1
- 개
- 고양이
- 까치
- 독수리

# 대주제2

## 중주제2
- 기차
- 배
"""
```

```python
from langchain_text_splitters import MarkdownHeaderTextSplitter

# 나눌때 기준이 되는 Header 를 설정. 
# list(tuple(key, value)): key-Header기호, value: 이름 
header_to_split = [
    ("#", "header1"),
    ("##", "header2"),
    # ("###", "header3"),
    # ("####", "header4"),
]
splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=header_to_split,
    # strip_headers=False, #default: True - 구분자 Header(제목)을 내용에 표시할 지 여부. True: 안넣는다.
)

docs = splitter.split_text(text)
docs
```

```text
[Document(metadata={'header1': '대주제1'}, page_content='# 대주제1\n- 동물'),
 Document(metadata={'header1': '대주제1', 'header2': '중주제1'}, page_content='## 중주제1\n- 포유류  \n- 조류  \n### 소주제1\n- 개\n- 고양이\n- 까치\n- 독수리'),
 Document(metadata={'header1': '대주제2'}, page_content='# 대주제2\n… (생략)'),
 Document(metadata={'header1': '대주제2', 'header2': '중주제2'}, page_content='## 중주제2\n- 기차\n- 배')]
```

`#`, `##`만 기준으로 줬기 때문에 `### 소주제1`은 나뉘지 않고 중주제1 조각 안에 들어갔다. 메타데이터에는 **상위 헤더까지 모두** 들어간다(`header1: 대주제1, header2: 중주제1`). 그래서 조각만 봐도 문서의 어느 위치인지 알 수 있고, "대주제2 섹션에서만 찾기"처럼 필터로 쓸 수 있다.

실제 위키 문서에 적용하면:

```python
# olympic.md

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import MarkdownHeaderTextSplitter

path = "data/olympic_wiki.md"
loader =TextLoader(path, encoding="utf-8")
header_to_split = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]
splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=header_to_split
)
docs = loader.load()

# list[Document] -> Document에서 page_content(읽은 text)를 
#                   조회해서 하나의 str로 반환
doc_txt = "\n".join(doc.page_content for doc in docs)

# MarkdownHeaderSplitter는  split_document가 없고 split_text(str)만 제공
split_docs = splitter.split_text(doc_txt)
len(split_docs)
```

```text
25
```

```python
split_docs[0].metadata
```

```text
{'h1': '올림픽'}
```

25개 섹션으로 나뉘었다. 다만 첫 섹션(`h1: 올림픽`)은 개요 여러 문단이 통째로 들어가 매우 길다. 헤더 기준 분할은 섹션 길이를 제한하지 않기 때문에, 실무에서는 **MarkdownHeaderTextSplitter로 섹션을 나눈 뒤 RecursiveCharacterTextSplitter로 다시 자르는** 2단계로 쓴다. 섹션 메타데이터는 그대로 유지된다.

## 어떤 Loader와 Splitter를 쓸까

| 상황 | Loader | Splitter |
|---|---|---|
| 일반 텍스트, 문단 구분이 있는 문서 | `TextLoader` | `RecursiveCharacterTextSplitter` (+ 문장부호 정규식 구분자) |
| 텍스트 위주 PDF | `PyPDFLoader` (빠름) | Recursive, 하이픈 줄바꿈 정리 후 |
| 표가 많은 PDF | `PDFPlumberLoader` 또는 Docling | 표를 마크다운으로 받아 Markdown 분할 |
| 레이아웃이 복잡한 논문·보고서 | Docling (마크다운으로) | `MarkdownHeaderTextSplitter` → Recursive |
| 뉴스 기사 몇 개 | `WebBaseLoader` + `SoupStrainer` + `separator`/`strip` | Recursive |
| 문서 사이트 전체 | `RecursiveUrlLoader` + 사이트별 `extractor`, `max_depth` 제한 | Recursive |
| GPT로 답변 생성 | | `.from_tiktoken_encoder()`로 토큰 기준 |

## 정리

- **RAG**는 질문과 관련된 문서를 검색해서 프롬프트에 함께 넣는 기법이다. 모델을 다시 학습하지 않아 최신 정보 반영이 쉽고, 품질은 **검색된 문서의 품질**에 달려 있다
- RAG는 **인덱싱**(Load → Split → Embed → Store)과 **검색·생성**(Retrieve → Query → Generate) 두 단계다. 의미가 비슷한 것을 찾아야 하므로 SQL의 LIKE가 아니라 벡터 DB를 쓴다
- **Document Loader**는 형식과 상관없이 `load()`로 `list[Document]`(page_content + metadata)를 돌려준다. 메타데이터는 검색 필터와 출처 표시에 쓰이므로 미리 설계한다
- 웹 문서는 그대로 읽으면 메뉴·버튼 텍스트가 섞인다. `SoupStrainer`로 본문만, `separator`와 `strip`으로 문단 구조를 살린다. **전처리가 RAG 품질을 가장 크게 좌우한다**
- **Splitter**는 의미 단위를 유지하면서 chunk_size를 넘지 않게 나눈다. RecursiveCharacterTextSplitter가 문단 → 줄 → 문장부호 → 단어 → 글자 순으로 경계를 찾아 가장 많이 쓰인다
- chunk 크기는 **모델의 토크나이저 기준 토큰 수**로 정하는 게 정확하다. 같은 500토큰도 GPT는 18조각, Gemma는 35조각이었다
