---
title: "Docker 입문: 이미지, 컨테이너, 그리고 Qdrant 띄우기"
description: "'내 PC에서는 되는데 서버에서는 안 된다'를 해결하는 Docker의 개념(이미지·컨테이너·Docker Hub)과 VM과의 차이, Windows의 WSL2와 Docker Desktop 설치를 정리하고, search·pull·run·ps·stop·rm 기본 명령어와 run 옵션(-d, -p, --name, -v)을 nginx와 Qdrant 벡터 DB 실행 예로 익힙니다."
category: 'Infra'
subcategory: 'Docker'
tags: ["Docker"]
date: 2026-06-30T11:00:00+09:00
thumbnail: '../../../assets/images/notes/devops/docker-basics.webp'
---

> SKN31 AI Agent 과정에서 Qdrant를 띄우기 전에 다룬 Docker 자료(`Docker_입문.md`)와 수업 메모(`docker.ipynb`)를 바탕으로 정리했습니다.
> 명령어 출력 예시는 수업 자료의 예시입니다. 버전과 이미지 ID는 환경마다 다릅니다.

## 이 글에서 다루는 것

- Docker가 해결하는 문제와 VM과의 차이
- 이미지, 컨테이너, Docker Hub
- Windows(WSL2)·macOS 설치와 확인
- 기본 명령어: `search`, `pull`, `images`, `run`, `ps`, `stop`, `rm`, `logs`
- `docker run` 옵션과 포트 연결
- Docker로 Qdrant 벡터 DB 띄우기

[Qdrant 글](/notes/llm/llm-qdrant)에서 벡터 DB 서버를 명령어 한 줄로 띄웠다. 그 한 줄이 Docker였다. DB나 웹 서버처럼 설치가 복잡한 소프트웨어를 **설치하지 않고 실행**하는 도구다.

## Docker란

**Docker는 애플리케이션을 컨테이너라는 독립된 실행 환경에 패키징해 어디서든 같게 실행하게 해 주는 오픈소스 플랫폼**이다. "내 PC에서는 되는데 서버에서는 안 된다"는 문제를 풀기 위해 나왔다. 개발자 PC, 테스트 서버, 운영 서버가 OS도 라이브러리 버전도 다를 때, 앱과 그 환경을 통째로 묶어서 옮긴다.

```python
# 독허브: 이미지를 만들어두면 어디서든 받아볼 수 있음
# 이미지: 애플리케이션을 실행하는 데 필요한 모든 환경(코드, 라이브러리, 환경 변수, 설정 파일 등)을 모아놓은 읽기 전용 파일(Snapshot)
# 앱개발에 일관성을 위해 사용함
```

### 세 가지 핵심 개념

| 개념 | 비유 | 설명 |
|---|---|---|
| **이미지** (Image) | 설계도, 틀 | 실행에 필요한 코드·라이브러리·설정을 묶은 **읽기 전용** 스냅샷. `ubuntu`, `nginx`, `mysql`, `python` 등 |
| **컨테이너** (Container) | 설계도로 지은 집 | 이미지를 **실행한 인스턴스**. 한 이미지로 여러 컨테이너를 띄울 수 있고, 프로세스처럼 시작·중지·삭제한다 |
| **Docker Hub** | GitHub의 이미지 버전 | 이미지를 저장·공유하는 중앙 저장소(Registry). <https://hub.docker.com> |

```python
# container = images가 실행된 것
```

파이썬으로 치면 이미지는 **클래스**, 컨테이너는 **객체**다. 클래스 하나로 객체를 여러 개 만들듯, `nginx` 이미지 하나로 웹 서버 컨테이너를 여러 개 띄울 수 있다. 컨테이너 안에서 파일을 바꿔도 이미지는 그대로다(읽기 전용).

### VM과의 차이

| 항목 | 가상 머신 (VM) | Docker 컨테이너 |
|---|---|---|
| 운영체제 | OS 전체를 포함 (수 GB) | 호스트 OS **커널을 공유** (수 MB~) |
| 시작 시간 | 수 분 | 수 초 |
| 리소스 | 무거움 | 가벼움 |
| 격리 수준 | 완전히 독립된 OS | 프로세스 수준 격리 |

VM은 하드웨어를 흉내 내고 그 위에 OS를 통째로 올린다. 컨테이너는 OS를 새로 띄우지 않고, 호스트 커널 위에서 **격리된 프로세스**로 돈다. 그래서 가볍고 빠르다.

| Docker를 쓰는 이유 | 내용 |
|---|---|
| 환경 일관성 | 개발·테스트·운영을 같은 환경으로 |
| 빠른 시작 | DB, 웹 서버를 명령어 한 줄로 실행 |
| 이식성 | OS에 관계없이 같은 동작 |
| 업계 표준 | 배포·DevOps의 기본 도구 |

## 설치

Docker Desktop은 Windows와 macOS에서 **GUI와 CLI를 함께** 제공하는 공식 패키지다.

```python
# WSL => window라는 os 안에서 Linux, macOS같이 다양한 운영체제를 사용할 수 있음
# Docker는 기본적으로 Linux기반임. 그래서 WSL이 필요함
# Win -> Linux(Docker)

# Docker를 실행하려면 GUI-docker desktop이 실행되어 있어야 함 => GUI환경이나, CLI 환경에서 사용
```

> **보충**: WSL(Windows Subsystem for Linux)은 Windows 안에서 **리눅스**를 실행하는 기능이다. macOS는 돌릴 수 없다. 메모의 핵심은 맞다. 컨테이너는 호스트 커널을 공유하는데 Docker 이미지 대부분은 **리눅스 커널**을 전제로 하므로, Windows에서는 WSL2가 제공하는 리눅스 커널 위에서 컨테이너가 돈다. macOS도 커널이 리눅스가 아니어서 Docker Desktop이 내부에 작은 리눅스 VM을 두고 그 위에서 컨테이너를 실행한다.

### Windows

| 항목 | 요구사항 |
|---|---|
| OS | Windows 10 64-bit (1903 이상) 또는 Windows 11 |
| WSL2 | 활성화 필요 |
| 가상화 | BIOS에서 Virtualization 활성화 |
| RAM | 최소 4GB (8GB 권장) |

1. <https://www.docker.com/products/docker-desktop> 에서 **Download for Windows**
2. 설치 마법사에서 **"Use WSL 2 instead of Hyper-V"** 체크
3. 설치 후 재시작, Docker Desktop 실행

WSL2 관련 오류가 나면 PowerShell을 **관리자 권한**으로 열고:

```powershell
wsl --install
wsl --set-default-version 2
```

### macOS

Apple Silicon(M1/M2/M3)과 Intel 중 맞는 버전을 받아 `Docker.dmg`를 열고 Applications로 옮긴 뒤 실행한다. 이미지에도 CPU 아키텍처(arm64 / amd64)가 있어서, Apple Silicon에서 amd64 전용 이미지를 받으면 느리게 에뮬레이션되거나 실행되지 않을 수 있다.

### 설치 확인

```bash
# Docker 버전 확인
docker --version

# Docker 정상 동작 확인 (Hello World 실행)
docker run hello-world
```

```text
Docker version 26.1.0, build a72a000
...
Hello from Docker!
```

`hello-world` 이미지가 없으면 Hub에서 자동으로 받아 컨테이너로 실행한다. "Hello from Docker!"가 보이면 설치 완료다. Docker Desktop이 **실행 중이어야** CLI 명령이 동작한다(메모의 마지막 줄).

## 기본 명령어

모든 명령어는 `docker`로 시작한다. 흐름은 이렇다.

```text
Docker Hub
    │
    ├─ 이미지 검색      docker search
    ├─ 이미지 다운로드   docker pull
    ├─ 컨테이너 실행    docker run
    ├─ 목록 확인        docker ps
    ├─ 컨테이너 중지    docker stop
    └─ 삭제            docker rm / docker rmi
```

```python
# docker search nginx
# 공용 저장소인 'Docker Hub'에서 'nginx'라는 이름이 포함된 이미지들을 검색
# STARS 인기 많은 순

# docker pull (받고 싶은 거)

# docker images (pull된 설계도 확인)

# docker rmi (이름 or id)=> 이미지 삭제 

# container = images가 실행된 것

# docker run [옵션] 이미지 이름
```

### 이미지

```bash
docker search nginx          # Hub에서 검색. STARS가 높을수록 많이 쓰이는 검증된 이미지
docker pull nginx            # 최신 버전(latest) 다운로드
docker pull nginx:1.25       # 특정 버전
docker pull ubuntu:22.04
docker images                # 로컬 이미지 목록
docker rmi nginx             # 이미지 삭제 (이름 또는 IMAGE ID)
```

```text
REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
nginx        latest    a6bd71f48f68   2 weeks ago    187MB
ubuntu       22.04     52882761a72a   4 weeks ago    77.9MB
```

**태그**는 이미지 이름 뒤 `:` 다음의 버전 표시다. 생략하면 `:latest`다. `python:3.11-slim`처럼 버전과 변형(slim, alpine 등 가벼운 버전)을 함께 나타낸다.

> **보충**: `latest`는 "가장 최신"이라는 보장이 아니라 **태그 이름일 뿐**이다. 받는 시점마다 다른 버전이 올 수 있어서, 운영 환경이나 팀 프로젝트에서는 `nginx:1.25`처럼 버전을 고정하는 편이 환경 일관성이라는 Docker의 목적에 맞다.

### 컨테이너 실행: docker run

```python
# 이미지->컨테이너 실행
# docker run -d -p 8080:80 --name my-nginx nginx

# docker ps => 실행목록 확인
```

```bash
docker run [옵션] <이미지이름> [명령어]

docker run -d -p 8080:80 --name my-nginx nginx
```

| 옵션 | 의미 |
|---|---|
| `-d` | 백그라운드(detached) 실행. 터미널을 점유하지 않는다 |
| `-p 호스트포트:컨테이너포트` | 포트 연결. `-p 8080:80`이면 브라우저 `localhost:8080` → 컨테이너의 80번 |
| `--name 이름` | 컨테이너 이름 (없으면 랜덤 이름) |
| `-it` | 인터랙티브 모드. 컨테이너 안의 셸을 직접 조작할 때 |
| `--rm` | 종료하면 컨테이너 자동 삭제 |
| `-v 볼륨:컨테이너경로` | 데이터를 컨테이너 밖에 저장 (아래 Qdrant에서) |

`-p`가 헷갈리기 쉽다. 컨테이너는 격리된 네트워크를 가지므로, nginx가 컨테이너 안 80번 포트에서 돌아도 밖에서는 보이지 않는다. `-p 8080:80`은 "**내 PC의 8080번으로 들어오는 요청을 컨테이너의 80번으로 넘겨라**"는 뜻이다. 왼쪽이 밖(호스트), 오른쪽이 안(컨테이너)이다.

`docker run`은 이미지가 로컬에 없으면 알아서 `pull`부터 한다.

### 컨테이너 관리

```bash
docker ps                    # 실행 중인 컨테이너
docker ps -a                 # 중지된 것 포함 전체

docker stop my-nginx         # 중지
docker start my-nginx        # 다시 시작
docker restart my-nginx      # 재시작

docker rm my-nginx           # 삭제 (중지 후)
docker rm -f my-nginx        # 실행 중이어도 강제 삭제

docker logs my-nginx         # 로그
docker logs -f my-nginx      # 실시간 로그 (Ctrl+C로 종료)
```

`stop`한 컨테이너는 사라지지 않고 `ps -a`에 남는다. 같은 `--name`으로 다시 `run`하면 "이름이 이미 쓰이고 있다"는 에러가 나는데, 이때는 `start`로 기존 컨테이너를 다시 켜거나 `rm` 후 `run`한다.

| 명령어 | 설명 |
|---|---|
| `docker search <이름>` | Hub에서 이미지 검색 |
| `docker pull <이미지>` | 이미지 다운로드 |
| `docker images` | 로컬 이미지 목록 |
| `docker rmi <이미지>` | 이미지 삭제 |
| `docker run [옵션] <이미지>` | 컨테이너 생성 + 실행 |
| `docker ps` / `ps -a` | 실행 중 / 전체 컨테이너 |
| `docker stop` / `start` | 중지 / 시작 |
| `docker rm <컨테이너>` | 컨테이너 삭제 |
| `docker logs <컨테이너>` | 로그 확인 |

## Docker로 Qdrant 띄우기

수업에서 Docker를 배운 이유는 벡터 DB **Qdrant**를 띄우기 위해서였다.

```python
# docker 6333:6333 qdarant
```

```bash
docker pull qdrant/qdrant
docker run -p 6333:6333 -p 6334:6334 -v "qdrant_storage:/qdrant/storage:z" qdrant/qdrant
```

| 부분 | 의미 |
|---|---|
| `-p 6333:6333` | REST API 포트. 파이썬 `QdrantClient(url="http://localhost:6333")`가 여기로 접속 |
| `-p 6334:6334` | gRPC 포트 |
| `-v qdrant_storage:/qdrant/storage` | 컨테이너 안 데이터 폴더를 Docker **볼륨**(`qdrant_storage`)에 연결 |

`-v`가 중요하다. 컨테이너를 지우면 컨테이너 안의 파일도 함께 사라진다. 볼륨에 연결해 두면 데이터는 컨테이너 밖에 남아서, 컨테이너를 지우고 다시 띄워도 저장한 벡터가 그대로 있다. DB처럼 데이터가 쌓이는 컨테이너에는 필수다.

이걸 직접 설치하려면 Qdrant 바이너리를 OS에 맞게 받고 설정 파일과 저장 경로를 잡아야 한다. Docker로는 한 줄이고, 다 쓰면 `docker rm -f`로 흔적 없이 지운다. 같은 방식으로 Neo4j, PostgreSQL 같은 DB도 띄울 수 있다.

수업 메모에는 이렇게 띄운 Qdrant가 무엇인지도 적혀 있다.

```python
# Qdrant: 벡터 전용 DB
# payload Filtering => meta data (유사도) 정확도를 높여줌
# 분산지원 됌

# point란 data point: 하나의 데이터 
# payload는 메타데이터 정보
```

벡터 DB가 빠른 이유를 정리한 메모도 있다. 핵심만 옮긴다.

```python
###########################################################
##            KNN & ANN (유사도 검색 개념)               ##
###########################################################
# 1. KNN (K-Nearest Neighbors):
#    - 질의(Query) 벡터와 가장 가까운 K개의 데이터를 찾는 알고리즘.
#    - 정확한 검색(Exact Search)은 모든 벡터와 거리를 계산하므로
#      데이터가 많아질수록 매우 느려집니다.
#
# 2. ANN (Approximate Nearest Neighbors):
#    - 약간의 오차를 허용하는 대신 검색 속도를 크게 향상시키는 방법.
#    - 대부분의 벡터 DB는 ANN 알고리즘을 사용하여
#      수백만~수억 개의 벡터도 빠르게 검색합니다.
###########################################################
```

| ANN 방식 | 원리 | 쓰는 곳 |
|---|---|---|
| **HNSW** | 비슷한 벡터끼리 그래프로 이어 두고, 위 계층에서 대략 위치를 찾은 뒤 아래 계층으로 내려가며 이웃을 따라 탐색 | **Qdrant 기본 인덱스** |
| **IVF** | K-Means로 벡터를 클러스터로 나눠 두고, 질의와 가까운 클러스터 몇 개(`nprobe`)만 탐색 | FAISS 등 |
| 차원 축소·압축 | PCA, Product Quantization(PQ)으로 벡터를 줄여 메모리·연산 감소 | 대규모 서비스 |

```python
# 3. 바구니는 몇 개를 보는가? (nprobe 설정):
#    - 무조건 1개만 보는 것이 아니라, 'nprobe'라는 설정값에 따라 다릅니다.
#    - nprobe = 1: 가장 가까운 바구니 1개만 검색 (속도 최상, 정확도 낮음)
#    - nprobe = 3: 가장 가까운 바구니 3개를 검색 (속도 준수, 정확도 높음)
#    - 4개 전체를 검색하면? -> 결국 전체 검색(Full Scan)과 다를 게 없어집니다.
```

전부 "정확도를 조금 내주고 속도를 얻는" 거래다. 이 내용은 [Embedding과 Vector DB 글](/notes/llm/llm-embedding-vectordb)과 Qdrant 글에서 이어진다.

## 정리

| 하고 싶은 것 | 명령어 |
|---|---|
| 이미지 받기 | `docker pull 이미지:태그` |
| 백그라운드로 띄우고 포트 열기 | `docker run -d -p 호스트:컨테이너 --name 이름 이미지` |
| 데이터 유지 | `-v 볼륨이름:컨테이너경로` |
| 상태 보기 | `docker ps -a`, `docker logs -f 이름` |
| 정리 | `docker stop 이름` → `docker rm 이름` → `docker rmi 이미지` |

- **이미지는 읽기 전용 설계도, 컨테이너는 실행 중인 인스턴스**다.
- 컨테이너는 호스트 커널을 공유한다. 그래서 가볍고, Windows에서는 리눅스 커널을 주는 WSL2가 필요하다.
- `-p 밖:안`. 왼쪽이 내 PC, 오른쪽이 컨테이너다.
- 컨테이너를 지우면 안의 데이터도 사라진다. DB는 볼륨에 연결한다.
- 태그는 고정해서 쓴다. `latest`는 시점마다 달라진다.

여기서는 남이 만든 이미지를 받아 실행만 했다. 다음 단계는 내 앱을 이미지로 만드는 **Dockerfile**과, 앱·DB 같은 여러 컨테이너를 설정 파일 하나로 함께 띄우는 **Docker Compose**다.
