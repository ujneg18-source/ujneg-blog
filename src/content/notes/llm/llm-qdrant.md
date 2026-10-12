---
title: "Qdrant: 구조 이해와 LangChain 연동"
description: "벡터 DB Qdrant의 구조(Collection, Point, Payload, WAL)를 정리하고, Docker로 띄운 Qdrant 서버에 qdrant-client로 컬렉션 생성·upsert·유사도 검색·Payload 필터링·scroll·삭제·수정을 실습한 뒤, LangChain QdrantVectorStore로 SF 소설 데이터를 Dense, Sparse(BM25), Hybrid 방식으로 검색해 결과를 비교합니다."
category: 'Tech'
subcategory: 'LLM'
series: 'RAG'
seriesOrder: 3
originalNotebook: "07_1_Qdrant_api.ipynb, 07_2_Qdrant_langchain.ipynb"
tags: ["LLM","RAG"]
date: 2026-06-30T10:00:00+09:00
thumbnail: '../../../assets/images/notes/llm/llm-qdrant.webp'
---

> SKN31 AI Agent 과정 노트북 `07_1_Qdrant_api.ipynb`, `07_2_Qdrant_langchain.ipynb`를 바탕으로 정리했습니다.
> 출력은 수업 때 Docker로 띄운 Qdrant 서버에서 실행한 결과입니다.

## 이 글에서 다루는 것

- Qdrant의 특징과 구조: Collection, Point, Payload, WAL
- 설치와 연결: 메모리, 파일, Docker 서버, Cloud
- qdrant-client로 CRUD: 컬렉션 생성, upsert, `query_points`, 필터, `scroll`, 삭제, 수정
- LangChain `QdrantVectorStore`로 연동
- 검색 방식 세 가지: Dense(의미), Sparse(BM25 키워드), Hybrid

## Qdrant

Qdrant는 고성능 벡터 검색용 오픈소스 벡터 DB다. 지난 글의 `InMemoryVectorStore`와 달리 서버로 띄워 데이터를 **영구 저장**하고, 메타데이터 필터를 정교하게 걸 수 있다.

| 특징 | 내용 |
|---|---|
| 고성능 검색 | **HNSW** 기반 ANN 알고리즘 |
| Payload 필터링 | 메타데이터(나이, 태그 등) 조건을 벡터 검색과 결합 |
| 분산 | 샤딩, 레플리카로 확장 |
| 다양한 언어 | Python, JavaScript, Rust, Java 등 |
| API | REST, gRPC |
| 영속성 | 스냅샷과 WAL로 백업·복구 |
| 라이선스 | Apache 2.0 (기업에서도 자유롭게 사용·수정) |

| 항목 | Qdrant | FAISS | Milvus | Weaviate |
|---|---|---|---|---|
| 검색 방식 | HNSW, Flat | Flat, IVF, HNSW | IVF, HNSW, DiskANN | HNSW |
| 필터링 | ✅ (Boolean + Nested) | ❌ | ✅ | ✅ |
| REST API | ✅ | ❌ | ✅ | ✅ |
| 벡터 + 메타데이터 통합 | ✅ | ❌ | ✅ | ✅ |
| 클라우드 | ✅ (Qdrant Cloud) | ❌ | ✅ | ✅ |

FAISS는 DB가 아니라 **검색 라이브러리**라서 필터링, API, 저장 관리가 없다.

### 구조

| 구성 요소 | 역할 |
|---|---|
| **Search Engine** | HNSW 기반 유사도 탐색 |
| **Segment** | 내부 저장·검색 단위. 하나의 Collection이 여러 Segment로 나뉘고 각자 인덱스와 저장 공간을 가진다 |
| **Index Manager** | 인덱스 생성, 설정, 최적화 |
| **WAL** (Write-Ahead Log) | 변경(삽입·수정·삭제)을 **디스크에 먼저 기록**한 뒤 메모리에 적용. 장애가 나면 WAL을 다시 적용해 복구 |

### 핵심 개념

| Qdrant | 뜻 | SQL에 비유하면 |
|---|---|---|
| **Collection** | 같은 차원의 벡터와 payload를 묶는 저장 단위. 이름, 벡터 차원(`size`), 거리 방식(`distance`: Cosine, Dot, Euclid)을 정한다 | 테이블 |
| **Point** | 데이터 하나. `id`(정수 또는 UUID) + `vector` + `payload` | 행(row) |
| **Payload** | Point의 메타데이터(JSON). string, number, boolean, array, nested object | 나머지 컬럼 |

Payload의 개별 key-value를 **Field**라고 하고, 검색 필터에 쓴다. `user.age`처럼 중첩 객체 안의 필드에도 조건을 걸 수 있다.

### 설치와 연결

```bash
pip install qdrant-client
```

| 방식 | 코드 | 용도 |
|---|---|---|
| 메모리 | `QdrantClient(":memory:")` | 테스트 |
| 로컬 파일 | `QdrantClient(path="path/to/db")` | 빠른 프로토타입 |
| Docker 서버 | `QdrantClient(url="http://localhost:6333")` | 실제 서버 구조 |
| Qdrant Cloud | `QdrantClient(url=url, api_key=api_key)` | 관리형 (무료 1GB) |

Docker로 서버를 띄운다(6333: REST, 6334: gRPC). `-v`로 볼륨을 붙이면 컨테이너를 지워도 데이터가 남는다.

```bash
docker pull qdrant/qdrant
docker run -p 6333:6333 -p 6334:6334 -v "qdrant_storage:/qdrant/storage:z" qdrant/qdrant
```

`http://localhost:6333/dashboard`로 들어가면 웹 화면에서 컬렉션과 데이터를 볼 수 있다.

## qdrant-client 실습

### 연결, 컬렉션 생성

```python
!uv pip install qdrant-client
```

```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
import pywintypes

###############################################################
#
#       1. Qdrant 연결
#       - 메모리
#       - 파일
#       - 서버
# 
#       2. collention 조회 및 생성
#
################################################################

COLLECTION_NAME = "test_collection"

# client = QdrantClient(":memory:") # 메모리에 연결
# client = QdrantClient(path="vector_storage/qdrant")  # Local 파일에 저장

## Qdrant Server를 Docker로 실행 후 연결
# docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
## qdrant dashbord에 접속 = "http://localhost:6333/dashboard"
## GUI환경으로 DB사애를 확인

client = QdrantClient(url="http://localhost:6333")

exist = client.collection_exists(collection_name=COLLECTION_NAME) # 이 이름의 컬랙션이 있는지 여부
print(exist)


# 만약에 있으면 삭제
if exist:
    client.delete_collection(collection_name=COLLECTION_NAME)


# collection 생성
client.create_collection(
    collection_name=COLLECTION_NAME,
    vectors_config=VectorParams( # Dense Vector(embedding vector) 저장소에 대한 설정
        size=4, # embedding vector의 차원수, 사용할 임베딩 모델의 차원수에 맞춰준다 (text=embedding-3-large 3072)
        # 사용할 임베딩 모델의 디멘션을 확인해야함. (허깅페이스-오픈소스, 유료소스 등)
        distance=Distance.COSINE # 유사도 계산 방법 (1.COSINE 유사도, 2.EUCLD 유클리디안, 3.DOT 내적)
    )

)


print(client.get_collections()) #Qdrant DB의 모든 컬렉션들을 조회

client.close()
```

```text
True
collections=[CollectionDescription(name='test_collection')]
```

실습용으로 **4차원** 벡터 컬렉션을 만들었다. `size`는 쓸 임베딩 모델의 차원과 정확히 같아야 한다. 다르면 넣을 때 에러가 난다. 컬렉션이 이미 있으면 지우고 새로 만드는 코드라서, 실제 서비스에서는 이렇게 하면 데이터가 날아간다. (`import pywintypes`는 Windows 전용 모듈이라 다른 OS에서는 지워야 한다.)

### 삽입: upsert

```python
from qdrant_client.models import  PointStruct
# point - 개별 데이터 pointstruct - id, vector, payload

dataset = [
        PointStruct(id=1, vector=[0.05, 0.61, 0.76, 0.74], payload={"city": "Berlin", "country":"Germany", "num":1000}),
        PointStruct(id=2, vector=[0.19, 0.81, 0.75, 0.11], payload={"city": "London", "country":"England", "num":5000}),
        PointStruct(id=3, vector=[0.36, 0.55, 0.47, 0.94], payload={"city": "Moscow", "country":"Russia", "num":6000}),
        PointStruct(id=4, vector=[0.18, 0.01, 0.85, 0.80], payload={"city": "New York", "country":"USA", "num":10000}),
        PointStruct(id=5, vector=[0.28, 0.03, 0.15, 0.10], payload={"city": "LA", "country":"USA", "num":20000}),
        PointStruct(id=6, vector=[0.24, 0.18, 0.22, 0.44], payload={"city": "Beijing", "country":"China", "num":15000}),
        PointStruct(id=7, vector=[0.35, 0.08, 0.11, 0.44], payload={"city": "Mumbai", "country":"India", "num":16000}),
        PointStruct(id=8, vector=[0.49, 0.77, 0.75, 0.31], payload={"city": "Liverpool", "country":"England", "num":17000}),
        PointStruct(id=9, vector=[0.43, 0.72, 0.12, 0.38], payload={"city": "Shanghai", "country":"China", "num":123000}),
]
```

```python
# Qdrant DB와 연결
client = QdrantClient(url="http://localhost:6333")
upsert_info = client.upsert(
    collection_name=COLLECTION_NAME, # 데이터를 저장하는 collection 이름
    points=dataset, # 저장할 데이터셋, list[PointStruct]
    wait=True       # WAL(저장하는 것을 로그로 남기고 저장) True: 완전히 저장 후 응답, False: 로그만 작성하고 응답
)
upsert_info
```

```text
UpdateResult(operation_id=1, status=<UpdateStatus.COMPLETED: 'completed'>)
```

**upsert** = update + insert. 같은 id가 있으면 덮어쓰고 없으면 추가한다. `wait=True`면 실제 적용이 끝난 뒤 응답하고(`COMPLETED`), False면 WAL에 기록만 하고 바로 응답한다.

### 유사도 검색: query_points

```python
# 연결
client = QdrantClient(url="http://localhost:6333")

# 검색 유사도(의미-sementic search) 기반 검색
search_result = client.query_points(
    collection_name = COLLECTION_NAME,
    query=[0.2, 0.1, 0.9, 1.2], # 질문의 embedding vector #pay_load의 메타데이토도 유지해야함
    limit=3, # top-k (몇개를 조회할 지.) # 유사도 높은것들 3개를 줄거임
)
```

```python
search_result # list로 조회

for point in search_result.points:
    print("유사도 점수:",point.score) # 타입은 스코어포인트
    print("문서ID:", point.id)
    print("메타데이터:", point.payload)
    print('-----' * 15)
```

```text
유사도 점수: 0.98368233
문서ID: 4
메타데이터: {'city': 'New York', 'country': 'USA', 'num': 10000}
---------------------------------------------------------------------------
유사도 점수: 0.90634227
문서ID: 6
메타데이터: {'city': 'Beijing', 'country': 'China', 'num': 15000}
---------------------------------------------------------------------------
유사도 점수: 0.892581
문서ID: 3
메타데이터: {'city': 'Moscow', 'country': 'Russia', 'num': 6000}
---------------------------------------------------------------------------
```

질문 벡터 `[0.2, 0.1, 0.9, 1.2]`와 방향이 가장 비슷한 New York(`[0.18, 0.01, 0.85, 0.80]`)이 0.98로 1위다. 결과는 `ScoredPoint` 객체 리스트이고 `score`, `id`, `payload`를 가진다. 기본으로는 벡터 값은 돌려주지 않는다(`vector=None`).

### Payload 필터링

Qdrant의 필터는 **벡터 검색 전에** payload 조건으로 후보를 먼저 거른다. 거른 후보 안에서만 유사도를 계산하니 정확도와 속도가 함께 오른다. 가격, 지역, 카테고리 같은 현실의 조건과 의미 검색을 결합하는 장치다.

| 절 | 의미 | 논리 연산 |
|---|---|---|
| `must` | 모든 조건을 만족 | AND |
| `should` | 하나 이상 만족 | OR |
| `min_should` | should 중 최소 k개 만족 | OR + 최소 개수 |
| `must_not` | 만족하면 안 됨 | NOT |

| 조건 | 예 | SQL에 비유하면 |
|---|---|---|
| `MatchValue(value=…)` | `country == "USA"` | `= 'USA'` |
| `MatchText(text=…)` | city에 "Be"가 들어감 | `LIKE '%Be%'` |
| `Range(gt, gte, lt, lte)` | `10000 < num < 20000` | `BETWEEN` |

```python
from qdrant_client import QdrantClient 
from qdrant_client.models import(
    Filter, #필터식을 만들때 사용
    FieldCondition, # 개별 조건 만들때 사용
    MatchValue, # == 일치 검색 연산
    MatchText,  # 범위(>, <, >=, <=) 검색 연산
    PayloadSchemaType # Payload Field의 인덱스 타입을 제공
)
COLLECTION_NAME = "test_collection"
```

(`MatchText`의 주석은 `Range` 설명이 잘못 붙은 것이다. `MatchText`는 텍스트 포함 검색이다.)

필터에 자주 쓰는 필드에는 **payload 인덱스**를 만든다. RDB의 인덱스와 같은 역할이다.

```python
client = QdrantClient(url="http://localhost:6333")
```

```python
###############################################################
#
# Payload Index 생성
# - Payload Field에 Index를 생성하여
#   Filtering 검색 속도를 향상시킨다.
#
###############################################################

client.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name="num",
    field_schema=PayloadSchemaType.INTEGER
)
```

```text
UpdateResult(operation_id=3, status=<UpdateStatus.COMPLETED: 'completed'>)
```

```python
collection_info = client.get_collection(
    collection_name=COLLECTION_NAME
)  # 지정한 Collection 정보를 반환

# Collection의 인덱스 정보를 조회
print(collection_info.payload_schema)
```

```text
{'num': PayloadIndexInfo(data_type=<PayloadSchemaType.INTEGER: 'integer'>, params=None, points=9)}
```

```python
###############################
# Payload Filtering 조회
# 벡터 유사도 검색 + Payload 필터링
###############################

from qdrant_client.models import Filter, FieldCondition, MatchValue
from qdrant_client.models import Range

search_result = client.query_points(
    collection_name=COLLECTION_NAME,
    query=[0.2, 0.3, 0.9, 1.2],
    limit=3,
    query_filter=Filter(
        must=[ #should (or)의 개념 => 조건 연산자를 클래스로 제공
            #FieldCondition(key="country", match=MatchValue(value="USA")) # payload[country] == 'USA' //// WHERE country = 'USA'랑 같은역할
            # 조건 작성, # 모든 연산자를 클래스로 줌
            # 키값 나라에서 USA를 가진 것
            
            FieldCondition(key="num", range=Range(gt=10000, lt=20000)), # 범위 조회 payload[num] >10000 and payload[num] < 20000
            #gt, lt, gte, lte
            
            FieldCondition(key="city", match=MatchText(text="Be")) #텍스트를 기준으로 조회
        ]
    )
)

for point in search_result.points:
    print(point)
```

```text
id=6 version=1 score=0.9314785 payload={'city': 'Beijing', 'country': 'China', 'num': 15000} vector=None shard_key=None order_value=None
```

`limit=3`인데 결과가 1개다. num이 10000~20000 사이(Beijing, Mumbai, Liverpool)이면서 city에 "Be"가 들어간 것은 Beijing뿐이다. Berlin은 "Be"가 있지만 num이 1000이라 빠졌다. 필터가 먼저 적용되고 그 안에서 유사도로 정렬하기 때문에, 조건이 까다로우면 k개를 못 채울 수 있다.

```python
from qdrant_client.models import Range
from qdrant_client.models import MinShould

search_result = client.query_points(
    collection_name=COLLECTION_NAME,
    query=[0.2, 0.3, 0.9, 1.2],
    limit=3,
    query_filter=Filter(
        min_should=MinShould(
            min_count=2, # 조건들 중에서 최소 2개는 True인 Data Point를 조회 
            conditions=[
                FieldCondition(key="country", match=MatchValue(value="USA")),
                FieldCondition(key="city", match=MatchText(text="Be")),
                FieldCondition(key="num", range=Range(lt=5000)),
                        
            ]

        )
    )
)
for point in search_result.points:
    print(point)
```

```text
id=1 version=1 score=0.93419933 payload={'city': 'Berlin', 'country': 'Germany', 'num': 1000} vector=None shard_key=None order_value=None
```

세 조건(USA / "Be" 포함 / num < 5000) 중 **두 개 이상**을 만족하는 건 Berlin("Be" + 1000)뿐이다. New York·LA는 USA 하나, Beijing은 "Be" 하나만 맞는다.

### 단순 조회: scroll

유사도 없이 데이터를 순서대로 훑는다. 한 번에 다 가져오지 않고 페이지 단위로 받는다(Django 시리즈의 페이징과 같은 개념).

```python
client = QdrantClient(url="http://localhost:6333")

# 반환 (조회결과 dataset:list[Record], 다음에 가져올 시작 Field의 id-nect offset )
result, next_field_id = client.scroll(
    
    collection_name="test_collection",
    limit=3, # 가져올 갯수
    
    
    )

print("다음에 가져올 ID:", next_field_id)
for r in result:
    print(r.id, r.payload)
```

```text
다음에 가져올 ID: 4
1 {'city': 'Berlin', 'country': 'Germany', 'num': 1000}
2 {'city': 'London', 'country': 'England', 'num': 5000}
3 {'city': 'Moscow', 'country': 'Russia', 'num': 6000}
```

`scroll`은 `(결과, 다음 시작 id)` 튜플을 돌려준다. 다음 페이지는 그 id를 `offset`으로 넘긴다.

```python
client = QdrantClient(url="http://localhost:6333")

# 반환 (조회결과 dataset:list[Record], 다음에 가져올 시작 Field의 id-nect offset )
result, next_field_id = client.scroll(
    
    collection_name="test_collection",
    limit=6, # 가져올 갯수
    offset=next_field_id # 데이터를 가져올 시작 Field의 ID. 생략: 처음부터
    
    )

print("다음에 가져올 ID:", next_field_id)
for r in result:
    print(r.id, r.payload)
```

```text
다음에 가져올 ID: 7
1 {'city': 'Berlin', 'country': 'Germany', 'num': 1000}
2 {'city': 'London', 'country': 'England', 'num': 5000}
3 {'city': 'Moscow', 'country': 'Russia', 'num': 6000}
4 {'city': 'New York', 'country': 'USA', 'num': 10000}
5 {'city': 'LA', 'country': 'USA', 'num': 20000}
6 {'city': 'Beijing', 'country': 'China', 'num': 15000}
```

`offset=4`가 적용됐다면 4~9번이 나와야 하는데 1번부터 나왔다. 이 셀이 실행될 때 `next_field_id`가 None(처음부터)이었다는 뜻이다. 노트북에서 셀을 위아래로 오가며 실행하면 변수 값이 예상과 달라지는 흔한 경우다. 두 셀을 순서대로 다시 실행하면 4~9번이 나온다.

### 삭제와 수정

```python
client.delete(
    collection_name=COLLECTION_NAME,
    points_selector=[1,3] # 삭제할 포인트의 ID를 제공함 
)
```

```text
UpdateResult(operation_id=2, status=<UpdateStatus.COMPLETED: 'completed'>)
```

id 목록 대신 **필터**로 지울 수도 있다.

```python
# filed filtering 이용해서 삭제
client.delete(
    collection_name=COLLECTION_NAME,
    points_selector=Filter(#Filter객체를 넣으면 field filtering을 조건으로 삭제함
        
        must=[FieldCondition(key='country', match=MatchValue(value='England'))])
)
result = client.scroll(
    collection_name=COLLECTION_NAME,
    limit=200
)

result
```

```text
([Record(id=4, payload={'city': 'New York', 'country': 'USA', 'num': 10000}, vector=None, shard_key=None, order_value=None),
  Record(id=5, payload={'city': 'LA', 'country': 'USA', 'num': 20000}, vector=None, shard_key=None, order_value=None),
  Record(id=6, payload={'city': 'Beijing', 'country': 'China', 'num': 15000}, vector=None, shard_key=None, order_value=None),
  Record(id=7, payload={'city': 'Mumbai', 'country': 'India', 'num': 16000}, vector=None, shard_key=None, order_value=None),
  Record(id=9, payload={'city': 'Shanghai', 'country': 'China', 'num': 123000}, vector=None, shard_key=None, order_value=None)],
 None)
```

1, 3번(id 삭제)과 England인 2, 8번(필터 삭제)이 빠지고 5개가 남았다. 다음 id가 `None`이면 더 가져올 데이터가 없다는 뜻이다.

수정은 같은 id로 다시 upsert한다.

```python
# 데이터 point의 수정은 upsert를 사용하면 된다. 존재하면 ID면 수정, 없는 ID면 추가 

p=PointStruct(
    id=9,
    vector=[1.2,0.3, -0.07, 2.4],
    payload = {"city":"Seoul", "country":"Korea", "num":50000}
)

client.upsert(
    collection_name=COLLECTION_NAME,
    points=[p]
)
```

payload만 바꾸는 메소드는 세 가지다.

```python
#############################
# payload를 수정
#############################
# 특정 Field의 값을 변경 - set_payload()

client.set_payload(collection_name=COLLECTION_NAME, payload={"city":"Shanghai","info":"중국대표도시"}, points=[6] ) # 수정할 데이터포인트의 id 
# 변경(city), 추가(info)할 것을 dict으로 설정
```

```python
#############################
# payload를 자체를 변경 (덮어쓰기)
#############################
client.overwrite_payload(collection_name=COLLECTION_NAME, payload={"도시이름":"인천","나라":"대한민국","정보":"광역시"}, points=[5] )
```

```python
#payload의 특정 field를 제거


client.delete_payload(
    collection_name=COLLECTION_NAME,
    keys=["city", "num"], # 삭제할 key를 지정
    points=[4,6],# 삭제할 페이로드의 아이디

)
```

```python
# payload 자체를 삭제

client.clear_payload(
    collection_name=COLLECTION_NAME,
    points_selector=[7,9],# 삭제할 페이로드의 아이디
)
```

```python
result = client.scroll(
    collection_name=COLLECTION_NAME,
    limit=200
)
result
```

```text
([Record(id=4, payload={'country': 'USA'}, vector=None, shard_key=None, order_value=None),
  Record(id=5, payload={'도시이름': '인천', '나라': '대한민국', '정보': '광역시'}, vector=None, shard_key=None, order_value=None),
  Record(id=6, payload={'info': '중국대표도시', 'country': 'China'}, vector=None, shard_key=None, order_value=None),
  Record(id=7, payload={}, vector=None, shard_key=None, order_value=None),
  Record(id=9, payload={}, vector=None, shard_key=None, order_value=None)],
 None)
```

| 메소드 | 하는 일 | 결과 |
|---|---|---|
| `set_payload` | 지정한 필드만 변경·추가 | 6번: city가 Shanghai로 바뀌고 info 추가(이후 delete_payload로 city 삭제) |
| `overwrite_payload` | payload 전체를 교체 | 5번: 기존 필드가 다 사라지고 한글 필드 3개만 |
| `delete_payload` | 지정한 필드만 삭제 | 4번: city, num이 빠지고 country만 |
| `clear_payload` | payload를 비움 | 7, 9번: `{}` |

payload를 비워도 Point(벡터)는 남는다. 6번의 payload는 Beijing → Shanghai로 바뀌었는데 벡터는 그대로라서, 데이터 내용과 벡터가 **어긋난 상태**가 됐다. 실제로는 텍스트가 바뀌면 임베딩도 다시 만들어 upsert해야 한다.

## LangChain 연동: QdrantVectorStore

```bash
pip install langchain langchain-qdrant langchain-openai python-dotenv
```

순서는 QdrantClient로 연결 → 컬렉션 생성(없으면) → client, 컬렉션 이름, 임베딩 모델을 넘겨 VectorStore 생성이다.

### 데이터: SF 소설 20권

```python
from uuid import uuid4
from langchain_core.documents import Document

def get_documents(): # 데이터가 dict 형태로 저장되어있음
    data = [
        {
            "name": "The Time Machine",
            "description": "시간 여행자는 미래로 여행을 떠나 인류의 진화와 몰락을 목격하게 된다. 그는 멀리 떨어진 미래 사회에서 인간 문명이 퇴화한 모습을 보고 충격을 받는다. 이 이야기는 인간 문명과 과학기술의 진보가 가져올 결과를 철학적으로 탐구한다.",
            "author": "H.G. Wells",
            "year": 1895
        },
        {
            "name": "Ender's Game",
            "description": "소년 엔더는 외계 종족 '버거'와의 전쟁을 대비해 혹독한 군사 훈련을 받는다. 그는 전략적 천재성을 발휘하여 점차 전쟁의 중심에 서게 된다. 이야기는 어린아이를 도구로 삼는 전쟁의 비인간성과 심리적 고통을 그린다.",
            "author": "Orson Scott Card",
            "year": 1985
        },
        # … Brave New World, Dune, Foundation, Neuromancer 등 20권 (생략)
    ]


    # page_content: embedding vector로 변환할 text를 저장
    # me

    documents = [
        Document(page_content=doc['description'], metadata={key:value for key, value in doc.items() if key != "description"}, id=str(uuid4())) for doc in data
    ]
    return documents


documents = get_documents()
documents
```

```text
[Document(id='4d6bc20a-e1ef-44dd-a491-ccf30fa1e1e6', metadata={'name': 'The Time Machine', 'author': 'H.G. Wells', 'year': 1895}, page_content='시간 여행자는 미래로 여행을 떠나 인류의 진화와 몰락을 목격하게 된다. … (생략)'),
 Document(id='ad3338e7-ec98-42e8-8d8c-c2889c7add3f', metadata={'name': "Ender's Game", 'author': 'Orson Scott Card', 'year': 1985}, page_content="소년 엔더는 외계 종족 '버거'와의 전쟁을 대비해 … (생략)"),
 … (생략)
```

```python
# 랭체인은 하나의 데이터를 기본적으로 document 타입객체로 사용 list(json)
# meta 데이터는 dic형태
# uuid = document id => str이든 int든 => 안하면 uu아이디값(중복되지 않는 아이디)
```

**줄거리(description)만 page_content**로 두고 제목·작가·연도는 메타데이터로 뺐다. 임베딩할 텍스트와 필터에 쓸 정보를 나누는 설계다. id는 `uuid4()`로 겹치지 않게 만든다.

### 컬렉션과 VectorStore 생성

```python
from langchain_qdrant import QdrantVectorStore
from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from dotenv import load_dotenv
load_dotenv()
```

```python
# QudrantDB와 연결, Collection 설정

COLLECTION_NAME = "SF_BOOKS"
VECTOR_SIZE = 3072  # openai text-embedding-3-large의 임베딩 벡터 수

# 연결 - Qdrant DB 실행
client = QdrantClient(url="http://localhost:6333")

# collection이 있으면 삭제하고 새로 생성 (원래는 기존 것에 추가하면서 사용하면 됨.)
if client.collection_exists(COLLECTION_NAME):
    client.delete_collection(COLLECTION_NAME)

# 생성
client.create_collection(
    collection_name=COLLECTION_NAME,
    vectors_config=VectorParams(
        size=VECTOR_SIZE,
        distance=Distance.COSINE
    )
)
```

```python
#####################################################################################
# vector store 생성
#####################################################################################
# 랭체인에서 벡터디비와 연동하는 모듈 -> 벡터디비마다 다른 클래스를 사용 ->같은 방식으로 사용
#####################################################################################



# Qdrant와 연결
client = QdrantClient(url="http://localhost:6333")


# Embedding 모델
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

# VectorStore 생성 = db와 연동
vectorstore = QdrantVectorStore(
    client=client, # 연동할 qdran client를 넣어줌
    embedding=embeddings, # 임베딩 모델(upsert, search할 때 embedding을 처리할 모델)
    collection_name=COLLECTION_NAME
)

# <데이터를 쿼드란트에 주입하는 과정>

# 데이터셋 upsert (필요시)
# vectorstore.add_document(list[Document]) /// Document.page_content: Vetor
ids = vectorstore.add_documents(documents) # upsert한 epdlxjemfdml ide들을 반환

print(ids)

# metadata가 payload에 field로 들어감
```

```text
['4d6bc20a-e1ef-44dd-a491-ccf30fa1e1e6', 'ad3338e7-ec98-42e8-8d8c-c2889c7add3f', 'f2ee8093-ebbb-4946-9eed-f59b3b17f548', … (20개)]
```

```python
# 벡터스토어에 대한(콜렉션) 정보 조회
print(vectorstore.collection_name)
print(vectorstore.distance)
# 페이지 컨텐츠, 메타데이터가 모두 페이로드로 저장된다.
print(vectorstore.content_payload_key) # page_content payload key값
print(vectorstore.metadata_payload_key)
```

```text
SF_BOOKS
Cosine
page_content
metadata
```

LangChain은 Document를 Point로 바꿀 때 payload를 `{"page_content": 줄거리, "metadata": {name, author, year}}` 구조로 저장한다. 그래서 Qdrant에서 필터를 걸 때 키가 `year`가 아니라 **`metadata.year`**가 된다.

```python
# Payload Index 생성 
from qdrant_client.models import PayloadSchemaType

client2.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name='metadata.year',
    field_schema=PayloadSchemaType.INTEGER
)
client2.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name='metadata.name',
    field_schema=PayloadSchemaType.TEXT
)
client2.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name='metadata.author',
    field_schema=PayloadSchemaType.KEYWORD
)
```

(`client2`는 `vectorstore.client`로 꺼낸 QdrantClient다.) 필드 성격에 따라 인덱스 타입이 다르다. 연도는 범위 검색용 `INTEGER`, 제목은 단어 포함 검색용 `TEXT`(전문 검색), 작가는 정확히 일치하는 값으로 찾는 `KEYWORD`다.

## 검색 방식 세 가지

| 방식 | 벡터 | 찾는 것 | 강점 / 약점 |
|---|---|---|---|
| **Dense** (기본) | 임베딩 벡터 (3072차원, 거의 모든 값이 0이 아님) | **의미**가 비슷한 문서 | 동의어·바꿔 말하기에 강함 / 정확한 키워드를 놓칠 수 있음 |
| **Sparse** | 단어 사전 크기, 대부분 0 (BM25, TF-IDF) | **키워드**가 일치하는 문서 | 고유명사·코드·사번에 강함 / 의미를 모름 |
| **Hybrid** | 둘 다 | 두 결과를 합쳐서 | 둘의 약점을 보완 |

```python
# DTM => 단어를 기준으로 바꿈 어휘사전
# tf-idf
```

NLP 시리즈의 Bag of Words·TF-IDF가 Sparse 벡터다. 어휘 사전 크기만큼의 벡터에 등장한 단어 자리만 값이 있다.

### Dense

```python
# vector store를 이용해서 의미기반 (유사도) 검색
query = "암울한 미래사회를 그린소설을 추천해줘."
result = vectorstore.similarity_search(
    query=query,
    k=5
)
result # document[list]
```

```text
[Document(metadata={'name': 'Brave New World', 'author': 'Aldous Huxley', 'year': 1932, '_id': 'f2ee8093-ebbb-4946-9eed-f59b3b17f548', '_collection_name': 'SF_BOOKS'}, page_content='유전자 조작과 세뇌로 계급이 철저히 나뉘어진 미래 사회가 배경이다. … 디스토피아 속에서 인간 본성과 자유의 의미를 묻는 소설이다.'),
 Document(metadata={'name': 'The Time Machine', 'author': 'H.G. Wells', 'year': 1895, …}, page_content='시간 여행자는 미래로 여행을 떠나 인류의 진화와 몰락을 목격하게 된다. … (생략)'),
 Document(metadata={'name': 'The Caves of Steel', 'author': 'Isaac Asimov', 'year': 1953, …}, … ),
 Document(metadata={'name': 'I, Robot', …}, … ),
 Document(metadata={'name': 'Snow Crash', …}, … )]
```

"암울한 미래사회"라는 단어는 어느 줄거리에도 없는데, 1위가 **디스토피아** 소설 Brave New World, 2위가 문명 퇴화를 그린 The Time Machine이다. 의미 검색이 제 역할을 했다. 메타데이터에는 Qdrant의 `_id`, `_collection_name`이 추가돼 돌아온다.

```python
result = vectorstore.similarity_search_with_score(
    query=query,
    k=5,
    score_threshold=0.45  #score가 0.45 이상인 것만 반환
)

# similarity_search_with_score => 임베딩 (덴스서치)
# 이제 스파스서치를 할 수 있음
result
```

```text
[(Document(metadata={'name': 'The Time Machine', …}, page_content='시간 여행자는 미래로 여행을 떠나 … (생략)'),
  0.47981232),
 (Document(metadata={'name': 'Brave New World', …}, page_content='유전자 조작과 세뇌로 … (생략)'),
  0.47826377)]
```

`score_threshold`로 지난 글에서 for문으로 하던 점수 필터를 검색 단계에서 바로 건다. k=5여도 0.45 이상인 2권만 왔다. (위와 1, 2위 순서가 바뀐 것은 점수 차가 0.0015로 거의 같아서다.)

### Sparse: BM25

**BM25**는 검색 엔진에서 쓰는 키워드 기반 점수 알고리즘이다. TF-IDF를 다듬은 것으로 세 요소를 본다.

| 요소 | 내용 |
|---|---|
| **TF** (단어 빈도) | 검색어가 문서에 많이 나올수록 점수가 오르지만, 너무 많아도 무한정 오르지는 않는다 |
| **IDF** (희소성) | 여러 문서에 흔한 단어는 점수가 낮고, 드문 단어는 높다 |
| **문서 길이 보정** | 같은 횟수라면 짧은 문서에서의 등장을 더 중요하게 본다 |

한계도 분명하다. 의미를 모르고("사과"가 과일인지 사죄인지), 동의어를 모르고("자동차"와 "승용차"), 한국어처럼 조사가 붙는 언어는 형태소 분석이 없으면 약하다.

```python
!uv pip install -qU fastembed
```

```python
# sparse vector Search 단독으로만 사용하는 경우는 없음
# 보완재로 사용함
# 아니면 특정값 => 사번을 조회할때 => 전문 용어, 제품명, 코드명, 사람 이름은 정확히 일치하는 것이 중요하기 때문
```

```python
from langchain_qdrant import FastEmbedSparse, RetrievalMode, QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, SparseVectorParams, SparseIndexParams
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
load_dotenv()

import os 
from huggingface_hub import login

login(os.getenv("HUGGINGFACE_API_KEY")) #허깅페이스 로그인
```

```python
COLLECTION_NAME = "SF_BOOK_SPARSE"
sparse_embeddings = FastEmbedSparse(model_name='qdrant/bm25')

client = QdrantClient(url='http://localhost:6333')
if client.collection_exists(COLLECTION_NAME):
    client.delete_collection(COLLECTION_NAME)

# 컬렉션 생성 - Sparse Vector 저장소만 가지는 collection을 생성.
client.create_collection(
    collection_name=COLLECTION_NAME,
    sparse_vectors_config={
        "sparse": SparseVectorParams(
            index=SparseIndexParams(on_disk=False)
            # 인덱스로 쓰이는 Sparse Vector(Index)를
            # 메모리(False)에 저장할지, 디스크(True)에 저장할지 선택
        )
    }
)
```

```python
# VectorStore
sparse_vectorstore = QdrantVectorStore(
    client=client,
    collection_name=COLLECTION_NAME, # Spare Vector Index
    sparse_embedding=sparse_embeddings,
    sparse_vector_name="sparse", # Spare Vector 저장소의 이름 Spare Vector_config에 설정한 이름
    retrieval_mode=RetrievalMode.SPARSE
)

# 데이터 upsert
sparse_vectorstore.add_documents(documents=documents)
```

```python
query = "암울한 미래세계에 대한 소설을 추천해줘"

result = sparse_vectorstore.similarity_search_with_score(
    query=query,
    k=5
)
result
```

```text
[(Document(metadata={'name': "The Hitchhiker's Guide to the Galaxy", 'author': 'Douglas Adams', 'year': 1979, …}, page_content='지구 멸망 직후 우주로 탈출한 주인공이 외계 친구와 함께 기상천외한 모험을 시작한다. 우주의 황당한 존재들과 철학적 농담들이 넘치는 코믹 SF다. 우주에 대한 진지한 질문을 유쾌하게 풀어낸 작품이다.'),
  1.5771493),
 (Document(metadata={'name': 'The Left Hand of Darkness', 'author': 'Ursula K. Le Guin', 'year': 1969, …}, page_content='외교관 제너리 아이가 젠더가 유동적인 외계 종족이 사는 행성에 파견된다. 그는 그들과의 문화적 충돌과 이해를 통해 진정한 인간성과 연대를 배워간다. 젠더와 정체성, 타자성에 대한 철학적 탐구가 돋보이는 작품이다.'),
  1.5731844)]
```

결과가 엉뚱하다. 코믹 SF(은하수를 여행하는 히치하이커를 위한 안내서)와 젠더를 다룬 소설이 나왔고, Brave New World는 없다. 두 줄거리의 공통점을 찾으면 이유가 보인다. "우주**에 대한**", "타자성**에 대한**". 질문 "미래세계**에 대한** 소설"과 **'대한'이라는 단어 하나가 일치**한 것이다. BM25는 띄어쓰기로 자른 단어가 같은지만 보니까, 질문의 핵심인 "암울한", "미래세계에"는 줄거리의 "미래 사회가", "디스토피아"와 글자가 달라 점수를 받지 못했다. 한국어에서 형태소 분석 없는 BM25의 한계가 그대로 드러났다. 결과가 5개가 아니라 2개인 것도 '대한'이 들어간 문서가 둘뿐이기 때문이다. 점수(1.57)도 코사인 유사도가 아니라 BM25 점수라 범위가 다르다.

### Hybrid

Dense와 Sparse를 결합한다. 정확한 키워드와 의미적으로 비슷한 문서를 함께 찾는다.

```python
COLLECTION_NAME = "SF_BOOKS_HYBRID"
# 임베딩 모델 - SPARSE/DENSE
sparse_embeddings = FastEmbedSparse(model_name="qdrant/bm25")
dense_embeddings = OpenAIEmbeddings(model_name="text-embedding-3-large")
VECTOR_SIZE = 3072

client = QdrantClient(url='http://localhost:6333')
if client.collection_exists(COLLECTION_NAME):
    client.delete_collection(COLLECTION_NAME)

# Collection 생성 -> Dense, Sparse Index를 모두 사용 (Hybrid Search)

client.create_collection(
    collection_name=COLLECTION_NAME,
    
    # "dense" vector 저장소 설정
    vectors_config={
        "dense": VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE
        )
    },
    
    # "sparse" vector 저장소 설정
    sparse_vectors_config={
        "sparse": SparseVectorParams(
            index=SparseIndexParams(
                on_disk=False
            )
        )
    }
)
```

한 Point에 **이름 붙은 벡터 두 개**("dense", "sparse")를 저장하는 컬렉션이다.

```python
hybrid_vectorstore = QdrantVectorStore(
    client=client,
    collection_name=COLLECTION_NAME,

    # Embedding 모델 설정 (Dense / Sparse)
    embedding=embeddings,
    sparse_embedding=sparse_embeddings,

    # Sparse Vector 저장소 이름
    # Collection 생성 시 sparse_vectors_config에 설정한 이름
    sparse_vector_name="sparse",
    vector_name="dense",  
    
    # 조회방식
    retrieval_mode=RetrievalMode.HYBRID
)

# 데이터 저장
hybrid_vectorstore.add_documents(documents)
```

(위에서 만든 `dense_embeddings`는 쓰이지 않고 앞서 만든 `embeddings`가 들어갔다. 같은 text-embedding-3-large 모델이라 결과는 같다. `OpenAIEmbeddings`의 파라미터 이름도 `model_name`이 아니라 `model`이다.)

```python
query = "암울한 미래세계에 대한 소설을 추천해줘"
# query = "우주여행과 외계인에 대한 대한 소설을 추천해줘"

result = hybrid_vectorstore.similarity_search_with_score(
    query=query,
    k=5
)
result
```

```text
[(Document(metadata={'name': 'The Time Machine', …}, …), 0.5),
 (Document(metadata={'name': "The Hitchhiker's Guide to the Galaxy", …}, …), 0.5),
 (Document(metadata={'name': 'Snow Crash', …}, …), 0.33333334),
 (Document(metadata={'name': 'The Left Hand of Darkness', …}, …), 0.33333334),
 (Document(metadata={'name': 'I, Robot', …}, …), 0.25)]
```

| 순위 | Dense | Sparse | Hybrid (점수) |
|---|---|---|---|
| 1 | Brave New World | Hitchhiker's Guide | The Time Machine (0.5) |
| 2 | The Time Machine | The Left Hand of Darkness | Hitchhiker's Guide (0.5) |
| 3 | The Caves of Steel | | Snow Crash (0.33) |
| 4 | I, Robot | | The Left Hand of Darkness (0.33) |
| 5 | Snow Crash | | I, Robot (0.25) |

(Dense 열은 위의 "미래사회를 그린소설" 질문 결과라서 질문 문장이 조금 다르다.)

점수가 0.5, 0.33, 0.25로 딱 떨어진다. 하이브리드는 두 검색의 점수를 직접 더하지 않고(코사인과 BM25는 범위가 달라서 더할 수 없다), **순위**로 합친다. Qdrant 기본값은 RRF(Reciprocal Rank Fusion)로, 각 검색에서의 순위 r에 대해 1/(r+1) 같은 값을 더한다. 그래서 1위들은 0.5, 2위들은 0.33처럼 같은 점수가 나온다. Dense 1위(The Time Machine)와 Sparse 1위(Hitchhiker's)가 공동 1위가 된 것이다.

이번 질문에서는 Sparse가 '대한'으로 엉뚱한 문서를 올려서, Hybrid가 Dense보다 오히려 나빠졌다. 하이브리드는 **키워드가 의미 있는 질문**(작품 제목, 작가 이름, 전문 용어)에서 힘을 쓰고, 조사 같은 의미 없는 단어가 걸리면 노이즈가 된다. 한국어라면 형태소 분석기(NLP 시리즈의 Kiwi)로 토큰화한 BM25를 쓰거나 불용어를 걸러야 한다.

### 필터와 함께 검색

```python
#################################################
# Payload Fitering
# 조건 정의 Qdrant Filter 객체를 이용
#################################################

from qdrant_client.models import (
    Filter,
    FieldCondition,
    Range
)

# 1900년 이전 작품만 검색
filter_condition = Filter(
    must=[
        FieldCondition(
            key="metadata.year",
            range=Range(lt=1900)
        )
    ]
)

query = "암울한 미래사회를 그린 소설을 추천해줘"

result = hybrid_vectorstore.similarity_search(
    query=query,
    k=5,
    filter=filter_condition
)

result
```

```text
[Document(metadata={'name': 'The Time Machine', 'author': 'H.G. Wells', 'year': 1895, …}, …),
 Document(metadata={'name': 'The Island of Doctor Moreau', 'author': 'H.G. Wells', 'year': 1896, …}, …),
 Document(metadata={'name': 'The War of the Worlds', 'author': 'H.G. Wells', 'year': 1898, …}, …),
 Document(metadata={'name': 'The Invisible Man', 'author': 'H.G. Wells', 'year': 1897, …}, …)]
```

1900년 이전 작품은 H.G. 웰스의 4권뿐이라 k=5여도 4개가 나왔다. 키가 `metadata.year`인 점에 주의한다. "19세기 작품 중에서"처럼 질문에 조건이 섞여 있으면 이렇게 필터로 걸러야 정확하다. 질문에서 이런 조건을 LLM이 자동으로 뽑아 필터로 바꾸는 것이 다음 글의 Self-Query Retriever다.

## 무엇을 쓸까

| 상황 | 선택 |
|---|---|
| 일반적인 질문, 바꿔 말하기가 많다 | Dense |
| 사번, 제품 코드, 법 조항 번호처럼 정확히 일치해야 한다 | Sparse (단독보다는 Hybrid로) |
| 고유명사와 의미가 섞인 질문 ("아시모프의 로봇 소설") | Hybrid |
| 한국어 문서로 Sparse·Hybrid | 형태소 분석 기반 토큰화, 불용어 처리 필요 |
| 연도·카테고리 같은 조건이 있다 | Payload 필터 + 필드에 payload 인덱스 |
| 테스트 / 프로토타입 / 서비스 | `:memory:` / `path=` / Docker 서버·Cloud |

## 정리

- **Qdrant**는 HNSW 기반 벡터 DB로, Collection(테이블) 안에 Point(id + vector + payload)를 저장하고 WAL로 장애에 대비한다
- `upsert`(있으면 수정, 없으면 추가), `query_points`(유사도 검색), `scroll`(순서대로 페이지 조회), `delete`(id 또는 필터), `set/overwrite/delete/clear_payload`로 CRUD를 한다
- **Payload 필터**는 벡터 검색 전에 후보를 거른다. `must`/`should`/`min_should`/`must_not`과 `MatchValue`/`MatchText`/`Range`를 조합하고, 자주 쓰는 필드에는 인덱스를 만든다
- LangChain `QdrantVectorStore`는 payload를 `page_content`와 `metadata`로 나눠 저장하므로 필터 키는 `metadata.필드명`이다
- **Dense**는 의미, **Sparse(BM25)**는 키워드, **Hybrid**는 순위 결합(RRF)으로 둘을 합친다. 한국어 BM25는 조사('대한') 같은 단어에 걸려 엉뚱한 결과를 낼 수 있다
