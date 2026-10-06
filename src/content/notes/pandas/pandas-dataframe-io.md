---
title: "DataFrame 만들기: 직접 생성과 파일·DB 입출력"
description: "딕셔너리와 2차원 리스트로 DataFrame을 만들고, CSV·엑셀·DB 테이블·pickle·HTML·JSON으로 저장하고 다시 읽어 오는 방법과 read_csv의 주요 옵션을 정리합니다."
category: 'Tech'
subcategory: 'Data Analysis'
series: 'Pandas'
seriesOrder: 2
originalNotebook: "02_Pandas_DataFrame.ipynb (1)"
tags: ["Python","Pandas","DataFrame","CSV"]
date: 2026-04-30
---

> SKN31 데이터 분석 실습 노트북 `02_Pandas_DataFrame.ipynb`의 앞부분(생성과 입출력)을 바탕으로 정리했습니다. 노트북이 길어서 생성·입출력, 기본 정보·변경, 조회의 세 글로 나눴습니다.
> 코드는 **pandas 3.0.2에서 다시 실행한 결과**를 실었습니다. DB 예제는 MySQL 대신 호환되는 MariaDB에, 위키백과 예제는 외부 접속이 필요해서 노트북에 저장된 출력을 실었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- DataFrame의 구조: 행·열, 순번과 이름
- 딕셔너리, 2차원 리스트로 DataFrame 만들기
- CSV, 엑셀, DB 테이블, pickle, HTML, JSON으로 저장하기
- `read_csv()`의 `index_col`, `header`, `names`, `sep`, `na_values` 옵션
- DB 조회 결과와 웹 페이지의 표를 DataFrame으로 읽기

## DataFrame 개요

- **표(table, 행렬)** 를 다루는 Pandas 타입이다. DB 테이블이나 엑셀 표와 같은 역할을 하고, 분석할 데이터를 담는 Pandas의 핵심 클래스다.
- **행(row)과 열(column)** 으로 구성된다.
- 행과 열은 Series처럼 두 종류의 식별자를 가진다.
  - **순번**: 양수·음수 index. 열도 내부적으로는 순번이 있지만 조회에 직접 쓸 수는 없다.
  - **이름**: 행 이름은 **index name**, 열 이름은 **column name**이라고 한다. 둘 다 **중복될 수 있고**, 지정하지 않으면 양수 순번이 이름이 된다.
- 하나의 행, 하나의 열은 각각 **Series**다.
- 값을 직접 넣어 만들거나, 파일(CSV, 엑셀, DB 등)에서 읽어 만든다.

## 직접 생성

```python
pd.DataFrame(data [, index=None, columns=None])
```

| 매개변수 | 내용 |
|---|---|
| `data` | 2차원 배열(Series, list, ndarray를 담은 것) 또는 `{컬럼이름: 값들}` 딕셔너리 |
| `index` | 행 이름으로 쓸 값들 |
| `columns` | 열 이름으로 쓸 값들 |

### 딕셔너리로 만들기

key가 **컬럼 이름**, value가 그 컬럼에 들어갈 값들이다. value들의 길이는 같아야 한다.

```python
import pandas as pd

d = {
    "id": ["id-" + str(i) for i in range(1, 6)],
    "korean": [100, 50, 70, 60, 90],
    "english": [90, 80, 100, 100, 40]
}
grade = pd.DataFrame(d)
grade
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

왼쪽 열(0~4)이 index name(행 이름), 맨 위 행(`id`, `korean`, `english`)이 column name(컬럼명)이다.

### 2차원 리스트로 만들기

안쪽 리스트 하나가 **한 행**이 된다.

```python
l = [
    [10, 20, 30, 40],
    [100, 200, 300, 400],
    range(1000, 4001, 1000),
]
pd.DataFrame(l)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>0</th><th>1</th><th>2</th><th>3</th></tr></thead><tbody><tr><th class="idx">0</th><td>10</td><td>20</td><td>30</td><td>40</td></tr><tr><th class="idx">1</th><td>100</td><td>200</td><td>300</td><td>400</td></tr><tr><th class="idx">2</th><td>1000</td><td>2000</td><td>3000</td><td>4000</td></tr></tbody></table></div></div>

이름을 주지 않아서 행·열 이름이 모두 0부터 붙었다. 딕셔너리는 **열 단위**로, 2차원 리스트는 **행 단위**로 값을 넣는다는 차이를 기억해 두면 좋다.

```python
df2 = pd.DataFrame(
    l,
    columns=["col1", "col2", "col3", "col4"],  # 컬럼명 지정
    index=["row1", "row2", "row3"]             # 행 이름 지정
)
df2
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 3행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>col1</th><th>col2</th><th>col3</th><th>col4</th></tr></thead><tbody><tr><th class="idx">row1</th><td>10</td><td>20</td><td>30</td><td>40</td></tr><tr><th class="idx">row2</th><td>100</td><td>200</td><td>300</td><td>400</td></tr><tr><th class="idx">row3</th><td>1000</td><td>2000</td><td>3000</td><td>4000</td></tr></tbody></table></div></div>

## 파일로 저장하기

기본 구문은 `DataFrame객체.to_저장형식()`이다.

```python
import os
os.makedirs("saved_data", exist_ok=True)  # 저장할 디렉토리 생성
```

### CSV

```python
DataFrame객체.to_csv(파일경로, sep=",", index=True, header=True)
```

| 매개변수 | 내용 |
|---|---|
| `sep` | 값 구분자 (기본 `,`) |
| `index` | index name 저장 여부 |
| `header` | column name 저장 여부 |

**CSV(Comma Separated Values)** 는 표를 텍스트 파일로 저장하는 형식이다. 한 줄에 데이터(행) 하나를 쓰고, 값은 `,`로 구분한다.

```python
grade.to_csv("saved_data/grade1.csv")                # 기본: index, header 모두 저장
grade.to_csv("saved_data/grade2.csv", index=False)   # index name은 저장 안 함
grade.to_csv("saved_data/grade3.csv",
             index=False,   # index name 저장 안 함
             header=False)  # column name 저장 안 함
grade.to_csv("saved_data/grade4.csv", sep="\t", index=False)  # 탭으로 구분

for name in ["grade1", "grade2", "grade3", "grade4"]:
    print(f"--- {name}.csv")
    print(open(f"saved_data/{name}.csv", encoding="utf-8").read())
```

```text
--- grade1.csv
,id,korean,english
0,id-1,100,90
1,id-2,50,80
2,id-3,70,100
3,id-4,60,100
4,id-5,90,40

--- grade2.csv
id,korean,english
id-1,100,90
id-2,50,80
id-3,70,100
id-4,60,100
id-5,90,40

--- grade3.csv
id-1,100,90
id-2,50,80
id-3,70,100
id-4,60,100
id-5,90,40

--- grade4.csv
id	korean	english
id-1	100	90
id-2	50	80
id-3	70	100
id-4	60	100
id-5	90	40
```

`grade1.csv` 맨 앞에 이름 없는 열(`,id,...`)과 0~4가 붙은 것이 index다. 지금처럼 index가 자동으로 붙은 순번일 때는 저장할 이유가 없으므로 `index=False`를 주는 경우가 많다.

### 엑셀

```python
DataFrame객체.to_excel(파일경로, index=True, header=True)
```

```python
grade.to_excel("saved_data/grade1.xlsx")
grade.to_excel("saved_data/grade2.xlsx", index=False, header=False)
```

노트북에서는 처음 실행할 때 `ModuleNotFoundError: No module named 'openpyxl'`이 났다. Pandas가 엑셀 파일을 쓰고 읽을 때 쓰는 엔진이 별도 패키지라서 `pip install openpyxl`로 설치해야 한다.

### DB 테이블

SQLAlchemy로 DB 연결 엔진을 만들고 `to_sql()`로 저장한다.

```bash
pip install sqlalchemy pymysql cryptography
```

```python
from sqlalchemy import create_engine

user = "playdata"
password = "1111"
host = "127.0.0.1"
port = 3306
database = "hr_join"
# mysql+pymysql://id:password@ip:port/database
conn_str = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
engine = create_engine(conn_str)  # DB 연결

grade.to_sql(
    name="grade",        # 테이블명
    con=engine,          # 연결
    if_exists="append",  # 테이블이 있으면 데이터 추가
    index=False          # DataFrame의 index는 저장 안 함
)
```

```text
5
```

반환값 `5`는 저장된 행 수다.

| `if_exists` | 테이블이 이미 있으면 |
|---|---|
| `"fail"` (기본) | 에러 |
| `"replace"` | 테이블을 지우고 다시 만든다 |
| `"append"` | 기존 테이블에 행을 추가한다 |

테이블이 없으면 DataFrame의 컬럼과 타입에 맞춰 테이블을 만들어 준다. 노트북에서는 같은 셀을 두 번 실행해서 `grade` 테이블에 같은 5행이 두 번 들어갔다. `append`는 실행할 때마다 쌓인다는 점을 주의해야 한다.

### 기타 형식

```python
grade.to_pickle("saved_data/grade.pickle")  # Python 객체 그대로 저장
grade.to_html("saved_data/grade.html")      # <table> 태그
grade.to_json("saved_data/grade.json")      # JSON
print(open("saved_data/grade.json", encoding="utf-8").read())
```

```text
{"id":{"0":"id-1","1":"id-2","2":"id-3","3":"id-4","4":"id-5"},"korean":{"0":100,"1":50,"2":70,"3":60,"4":90},"english":{"0":90,"1":80,"2":100,"3":100,"4":40}}
```

**pickle**은 DataFrame 객체를 타입 정보까지 그대로 저장한다. 다시 읽으면 dtype이나 index가 바뀌지 않는다는 장점이 있고, 대신 Python(Pandas)에서만 읽을 수 있다.

## 파일에서 읽어 오기: read_csv()

```python
pd.read_csv(파일경로, sep=",", header=0, index_col=None, na_values=None)
```

| 매개변수 | 내용 |
|---|---|
| `sep` | 값 구분자 (기본 `,`) |
| `header` | 컬럼 이름으로 쓸 행 번호. 기본은 첫 행(0). `None`이면 헤더가 없다고 보고 0부터 이름을 붙인다 |
| `names` | 컬럼 이름을 직접 지정 |
| `index_col` | index name으로 쓸 컬럼 (이름 또는 순번). 생략하면 0부터 순번 |
| `na_values` | 결측치로 읽을 문자열 목록 |

### index_col

```python
pd.read_csv("saved_data/grade1.csv")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Unnamed: 0</th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>0</td><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>1</td><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>2</td><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>3</td><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>4</td><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

index까지 저장한 `grade1.csv`를 그냥 읽으면 저장됐던 index가 `Unnamed: 0`이라는 일반 컬럼이 된다.

```python
pd.read_csv("saved_data/grade1.csv", index_col=0)  # 0번 컬럼을 index로
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

```python
pd.read_csv("saved_data/grade2.csv", index_col="id")  # 컬럼 이름으로 지정
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 2열</div><div class="sql-result-scroll"><table><thead><tr><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">id-1</th><td>100</td><td>90</td></tr><tr><th class="idx">id-2</th><td>50</td><td>80</td></tr><tr><th class="idx">id-3</th><td>70</td><td>100</td></tr><tr><th class="idx">id-4</th><td>60</td><td>100</td></tr><tr><th class="idx">id-5</th><td>90</td><td>40</td></tr></tbody></table></div></div>

`id`처럼 행을 구분하는 값을 가진 컬럼을 index로 쓰면 이후 `loc["id-3"]`처럼 이름으로 행을 조회할 수 있다.

### header와 names

```python
pd.read_csv(
    "saved_data/grade3.csv",
    header=None,                 # 파일에 헤더가 없다
    names=["ID", "국어", "영어"]  # 컬럼명 지정
)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>ID</th><th>국어</th><th>영어</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

헤더가 두 줄인 파일은 `header=[0, 1]`로 읽으면 **다중 컬럼(MultiIndex)** 이 된다. 수업에서 직접 만든 `grade5.csv`다.

```python
print(open("saved_data/grade5.csv", encoding="utf-8").read())
```

```text
id,lang,lang,sci,sci
id,korean, english, bio, chemical
id-1,100,90,100,90
id-2,50,80,100,90
id-3,70,100,100,90
id-4,60,100,100,90
id-5,90,40,100,90
```

```python
pd.read_csv("saved_data/grade5.csv", header=[0, 1])
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 5열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id / id</th><th>lang / korean</th><th>lang /  english</th><th>sci /  bio</th><th>sci /  chemical</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td>100</td><td>90</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>id-2</td><td>50</td><td>80</td><td>100</td><td>90</td></tr><tr><th class="idx">2</th><td>id-3</td><td>70</td><td>100</td><td>100</td><td>90</td></tr><tr><th class="idx">3</th><td>id-4</td><td>60</td><td>100</td><td>100</td><td>90</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40</td><td>100</td><td>90</td></tr></tbody></table></div></div>

`lang / korean`, `lang / english`처럼 위·아래 두 단계의 컬럼 이름이 생겼다. 파일의 두 번째 줄에 공백(`, english`)이 있어서 컬럼 이름 앞에도 공백이 들어갔다. (`보충`: 공백까지 이름에 들어가면 `df["english"]`로 찾을 수 없다. `skipinitialspace=True`를 주면 구분자 뒤 공백을 무시한다.)

### sep

```python
pd.read_csv("saved_data/grade4.csv", sep="\t")  # 탭으로 구분된 파일
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

### na_values: 결측치로 읽을 값 지정

현장 데이터에는 빈칸 대신 "모름", "?" 같은 문자열로 결측치를 표시한 경우가 많다. 수업에서 만든 `grade6.csv`다. (현재 폴더의 파일은 이후 다른 내용으로 덮어써져서, 노트북 출력에 맞춰 같은 내용으로 다시 만들었다.)

```python
print(open("saved_data/grade6.csv", encoding="utf-8").read())
```

```text
id,korean,english
id-1,모름,90
id-2,NA,80
결측치,NA,모름
NA,60,100
id-5,90,40
```

```python
df8 = pd.read_csv("saved_data/grade6.csv")
df8
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td>모름</td><td>90</td></tr><tr><th class="idx">1</th><td>id-2</td><td><span class="sql-null">NaN</span></td><td>80</td></tr><tr><th class="idx">2</th><td>결측치</td><td><span class="sql-null">NaN</span></td><td>모름</td></tr><tr><th class="idx">3</th><td><span class="sql-null">NaN</span></td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

```python
df8.isna()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>False</td><td>False</td><td>False</td></tr><tr><th class="idx">1</th><td>False</td><td>True</td><td>False</td></tr><tr><th class="idx">2</th><td>False</td><td>True</td><td>False</td></tr><tr><th class="idx">3</th><td>True</td><td>False</td><td>False</td></tr><tr><th class="idx">4</th><td>False</td><td>False</td><td>False</td></tr></tbody></table></div></div>

`NA` 문자열은 Pandas가 기본으로 결측치로 인식했지만, `모름`과 `결측치`는 그냥 문자열로 읽혔다. 그래서 `korean` 컬럼이 숫자가 아니라 문자열 타입이 됐다.

```python
df9 = pd.read_csv(
    "saved_data/grade6.csv",
    na_values=["모름", "?", "결측치"],  # 지정한 값은 결측치로 읽는다
    keep_default_na=False,              # 기본 결측치 문자열(NA 등)은 데이터로 읽는다
)
df9
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td><span class="sql-null">NaN</span></td><td>90.0</td></tr><tr><th class="idx">1</th><td>id-2</td><td>NA</td><td>80.0</td></tr><tr><th class="idx">2</th><td><span class="sql-null">NaN</span></td><td>NA</td><td><span class="sql-null">NaN</span></td></tr><tr><th class="idx">3</th><td>NA</td><td>60</td><td>100.0</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40.0</td></tr></tbody></table></div></div>

```python
df9.isna()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>False</td><td>True</td><td>False</td></tr><tr><th class="idx">1</th><td>False</td><td>False</td><td>False</td></tr><tr><th class="idx">2</th><td>True</td><td>False</td><td>True</td></tr><tr><th class="idx">3</th><td>False</td><td>False</td><td>False</td></tr><tr><th class="idx">4</th><td>False</td><td>False</td><td>False</td></tr></tbody></table></div></div>

이번에는 반대로 `모름`, `결측치`가 결측치가 되고 `NA`는 문자열로 남았다. `keep_default_na=False` 때문이다. 기본으로 결측치 처리되는 문자열은 `""`, `"NA"`, `"N/A"`, `"NULL"`, `"NaN"`, `"None"`, `"nan"`, `"null"` 등이다. 둘 다 결측치로 읽으려면 `keep_default_na`를 기본값(True)으로 두고 `na_values`만 추가하면 된다.

`english` 컬럼은 `모름`이 결측치가 되면서 숫자만 남아 `float64`가 됐다. 결측치가 섞인 정수 컬럼은 실수 타입이 된다는 Series 글의 내용과 같다.

## DB 테이블에서 읽어 오기

```python
# SQL 쿼리 실행 결과를 DataFrame으로
query = "SELECT * FROM emp e join dept d on e.dept_id = d.dept_id"
df = pd.read_sql(query, con=engine)  # read_sql_query()
df.head()
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 11열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>emp_id</th><th>emp_name</th><th>job_id</th><th>mgr_id</th><th>hire_date</th><th>salary</th><th>comm_pct</th><th>dept_id</th><th>dept_id</th><th>dept_name</th><th>loc</th></tr></thead><tbody><tr><th class="idx">0</th><td>200</td><td>Jennifer</td><td>AD_ASST</td><td>101.0</td><td>2003-09-17</td><td>4400.0</td><td><span class="sql-null">NaN</span></td><td>10</td><td>10</td><td>Administration</td><td>Seattle</td></tr><tr><th class="idx">1</th><td>201</td><td>Michael</td><td>MK_MAN</td><td>100.0</td><td>2004-02-17</td><td>13000.0</td><td><span class="sql-null">NaN</span></td><td>20</td><td>20</td><td>Marketing</td><td>New York</td></tr><tr><th class="idx">2</th><td>202</td><td>Pat</td><td>MK_REP</td><td>201.0</td><td>2005-08-17</td><td>6000.0</td><td><span class="sql-null">NaN</span></td><td>20</td><td>20</td><td>Marketing</td><td>New York</td></tr><tr><th class="idx">3</th><td>114</td><td>Den</td><td>PU_MAN</td><td>100.0</td><td>2002-12-07</td><td>11000.0</td><td><span class="sql-null">NaN</span></td><td>30</td><td>30</td><td>Purchasing</td><td>Seattle</td></tr><tr><th class="idx">4</th><td>115</td><td>Alexander</td><td>PU_MAN</td><td>100.0</td><td>2003-05-18</td><td>9100.0</td><td><span class="sql-null">NaN</span></td><td>30</td><td>30</td><td>Purchasing</td><td>Seattle</td></tr></tbody></table></div></div>

SQL 시리즈의 JOIN 결과가 그대로 DataFrame이 됐다. 두 테이블에 같은 이름의 `dept_id` 컬럼이 있어서 결과에도 `dept_id`가 두 번 나온다. DataFrame은 컬럼 이름이 중복될 수 있기 때문이다.

테이블 이름만 주면 테이블 전체를 읽는다.

```python
dept = pd.read_sql("dept", con=engine)  # read_sql_table()
emp = pd.read_sql("emp", con=engine)
job = pd.read_sql("job", con=engine)
print(dept.shape, emp.shape, job.shape)
```

```text
(27, 3) (107, 8) (19, 4)
```

## 기타 형식 읽기

```python
pd.read_excel("saved_data/grade1.xlsx", index_col=0)
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

```python
pd.read_pickle("saved_data/grade.pickle")
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 3열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

```python
result = pd.read_html("saved_data/grade.html")
# HTML 문서의 모든 <table> 내용을 각각 DataFrame으로 만들어 리스트로 반환
print(type(result), len(result))
result[0]
```

```text
<class 'list'> 1
```

<div class="sql-result df-result"><div class="sql-result-meta">출력 · 5행 × 4열</div><div class="sql-result-scroll"><table><thead><tr><th></th><th>Unnamed: 0</th><th>id</th><th>korean</th><th>english</th></tr></thead><tbody><tr><th class="idx">0</th><td>0</td><td>id-1</td><td>100</td><td>90</td></tr><tr><th class="idx">1</th><td>1</td><td>id-2</td><td>50</td><td>80</td></tr><tr><th class="idx">2</th><td>2</td><td>id-3</td><td>70</td><td>100</td></tr><tr><th class="idx">3</th><td>3</td><td>id-4</td><td>60</td><td>100</td></tr><tr><th class="idx">4</th><td>4</td><td>id-5</td><td>90</td><td>40</td></tr></tbody></table></div></div>

`read_html()`은 HTML 안의 `<table>` 태그를 **모두** 찾아서 DataFrame 리스트로 돌려준다. 표가 하나여도 리스트다. `lxml`이 필요하다.

### 웹 페이지의 표 읽기

웹 페이지 URL을 직접 넣을 수도 있다. 노트북에서는 위키백과 FIFA 월드컵 문서를 읽었다.

```python
from urllib.request import Request, urlopen
import pandas as pd

url = "https://ko.wikipedia.org/wiki/FIFA_%EC%9B%94%EB%93%9C%EC%BB%B5"

# 그냥 요청하면 403 권한 문제 발생 → User-Agent 헤더 설정 (Chrome 브라우저 흉내)
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                         "AppleWebKit/537.36 (KHTML, like Gecko) "
                         "Chrome/118.0 Safari/537.36"}
req = Request(url, headers=headers)

tables = pd.read_html(urlopen(req))
print(len(tables))
tables[1]
```

```text
13
  대륙별 축구 협회  FIFA 월드컵 참가 자격 회원    본선 진출팀 수 (개최국 포함) 본선 진출 회원 비율
0       아시아                 46                8+1⁄3         18%
1      아프리카                 54                9+1⁄3         17%
2    북중미카리브                 35                6+1⁄3         19%
3        남미                 10                6+1⁄3         65%
4     오세아니아                 14                1+1⁄3         14%
5        유럽                 55  16+(1⁄3) * 유럽에서 개최시         29%
6         총                215                   48         23%
```

(노트북에 저장된 출력)

문서 안의 표 13개가 모두 DataFrame이 됐다. 웹 크롤링 시리즈에서 정리한 것처럼 User-Agent가 없으면 403이 나서, `urllib`의 `Request`로 헤더를 넣어 요청했다. 표만 필요하면 BeautifulSoup으로 파싱하지 않고 `read_html()` 한 줄로 끝낼 수 있다.

## 정리

| 하고 싶은 일 | 방법 |
|---|---|
| 열 단위로 만들기 | `pd.DataFrame({"컬럼": [값들], ...})` |
| 행 단위로 만들기 | `pd.DataFrame([[행1], [행2]], columns=[...], index=[...])` |
| 저장 | `to_csv`, `to_excel`, `to_sql`, `to_pickle`, `to_html`, `to_json` |
| 읽기 | `read_csv`, `read_excel`, `read_sql`, `read_pickle`, `read_html` |

- 자동 순번 index는 `to_csv(index=False)`로 저장하지 않는다. 저장했다면 `read_csv(index_col=0)`으로 읽는다.
- 결측치를 문자열로 표시한 파일은 `na_values`로 지정해서 읽는다.
- `to_sql(if_exists="append")`는 실행할 때마다 행이 쌓인다.
- `read_html()`은 페이지의 모든 표를 리스트로 돌려준다.
