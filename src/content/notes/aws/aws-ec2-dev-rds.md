---
title: "EC2 개발 환경과 RDS: 원격 개발 환경 구성과 DB 분리"
description: "EC2 Ubuntu에 uv로 파이썬 환경을 만들고 VSCode Remote-SSH로 원격 개발하는 방법, EC2에 Docker를 설치해 Qdrant를 띄우는 과정을 정리합니다. DB를 EC2가 아닌 RDS에 두는 이유와 가용성 옵션, RDS MySQL 생성·EC2 연결, 데이터베이스와 전용 계정 만들기까지 다룹니다."
category: 'Infra'
subcategory: 'AWS'
series: 'AWS'
seriesOrder: 3
originalNotebook: "14_AWS (04_EC2_Python개발환경_구성.ipynb, 05_RDS.ipynb), mypoll/django_setting.md"
tags: ["AWS"]
date: 2026-08-05T11:00:00+09:00
thumbnail: '../../../assets/images/notes/aws/aws-ec2-dev-rds.webp'
---

> SKN31 AWS 수업 자료(`04_EC2_Python개발환경_구성.ipynb`, `05_RDS.ipynb`)와 배포 필기(`mypoll/django_setting.md`)를 바탕으로 정리했습니다.

## 이 글에서 다루는 것

- uv로 파이썬 환경 만들기
- VSCode Remote-SSH로 EC2에서 개발하기
- EC2에 Docker 설치하고 Qdrant 띄우기
- DB를 RDS로 분리하는 이유
- RDS MySQL 만들기와 EC2에서 접속
- 프로젝트용 데이터베이스·계정 만들기

[지난 글](/notes/aws/aws-ec2)에서 EC2 인스턴스를 만들고 SSH로 들어갔다. 이제 그 서버를 작업할 수 있는 상태로 만든다.

## 파이썬과 uv

Ubuntu AMI에는 파이썬이 이미 있다.

```bash
python3 --version
```

패키지 관리자는 수업 내내 쓴 uv를 설치한다.

```bash
curl -Ls https://astral.sh/uv/install.sh | bash
source ~/.bashrc
```

설치 스크립트가 `~/.bashrc`(bash 셸 설정 파일)에 PATH를 추가하는데, 이미 열려 있는 셸은 그 파일을 다시 읽지 않는다. `source`로 다시 읽어야 `uv` 명령을 바로 쓸 수 있다(또는 재접속).

## VSCode Remote-SSH

터미널로만 작업하면 불편하다. VSCode의 **Remote-SSH** 확장은 EC2에 접속해 **원격 서버의 파일을 로컬처럼** 열고 편집·실행하게 해 준다.

1. VSCode 확장에서 **Remote - SSH** 설치
2. 왼쪽 아래 **원격 창 열기** 아이콘 → **Connect to Host...(호스트에 연결)**
3. **SSH 호스트 구성** → `사용자홈\.ssh\config` 선택
4. 접속 정보 작성(지난 글의 ssh config와 같다)

```text
Host 설정이름
    HostName <EC2 퍼블릭 IP>
    User ubuntu
    IdentityFile ssh private key 파일 경로
```

5. 다시 **Connect to Host...** → 등록한 이름 선택 → OS는 **Linux** → **계속**
6. 원격 창에서 **Python**, **Jupyter** 확장을 설치한다. 확장은 로컬과 별개로 **원격 서버에 따로** 설치된다.

연결할 때 VSCode가 EC2에 서버 프로그램(VS Code Server)을 설치해 돌리기 때문에 메모리를 꽤 쓴다. 지난 글에서 `t3.medium` 이상을 권한 이유다. 프리티어 사양에서는 연결이 끊기거나 멈추기 쉽다.

## EC2에 Docker 설치

[Docker 입문](/notes/devops/docker-basics)에서 PC에 Docker Desktop을 설치했다. 서버(Ubuntu)는 Docker 공식 저장소를 등록해서 설치한다.

```bash
# 1. 시스템 업데이트
sudo apt update
sudo apt upgrade

# 2. 설치에 필요한 패키지
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 3. Docker GPG 키 추가 (패키지가 공식 배포본인지 서명 검증)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 4. Docker 공식 저장소를 APT에 추가 (Ubuntu 기본 저장소에는 최신 버전이 없음)
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Docker Community Edition 설치
sudo apt update
sudo apt install -y docker-ce
```

설치 직후에는 `docker` 명령마다 `sudo`가 필요하다. 현재 사용자를 `docker` 그룹에 넣는다.

```bash
getent group docker            # docker 그룹이 있는지 확인
sudo usermod -aG docker ubuntu # ubuntu 계정을 docker 그룹에 추가. usermod: 사용자 정보 변경 명령어. -aG: 사용자(ubuntu)에게 사용자 그룹(docker) 추가. 
```

그룹 변경은 **다시 로그인해야** 적용된다. SSH를 끊었다 다시 연결한 뒤 확인한다.

```bash
docker --version
```

[RAG 실습](/notes/llm/llm-qdrant)에서 쓴 Qdrant 벡터 DB를 띄운다.

```bash
docker pull qdrant/qdrant
docker run -p 6333:6333 -p 6334:6334 -v "$(pwd)/qdrant_storage:/qdrant/storage:z" qdrant/qdrant
```

`-v`로 데이터를 서버 디스크(`qdrant_storage`)에 저장해 컨테이너를 지워도 데이터가 남는다. 보안 그룹에서 6333, 6334 포트를 열면 `http://<EC2 퍼블릭 IP>:6333/dashboard`로 대시보드에 들어간다.

> **보충**: 위 명령은 터미널을 점유하는 포그라운드 실행이라 SSH를 끊으면 같이 멈출 수 있다. 서버에서는 `-d`(백그라운드)와 `--restart unless-stopped`(서버 재부팅 시 자동 시작)를 붙여 띄운다. 그리고 Qdrant 대시보드 포트를 `0.0.0.0/0`에 열면 인증 없는 DB가 인터넷에 공개되는 것이므로, 소스를 내 IP로 제한하거나 API 키를 설정한다.

## DB를 RDS로 분리하는 이유

EC2에 MySQL을 직접 설치할 수도 있다. 수업 자료는 RDS(Relational Database Service)로 분리하는 이유를 이렇게 정리한다.

| 항목 | RDS | EC2에 직접 설치 |
|---|---|---|
| 관리 | 패치·백업·복구 자동화 | 직접 |
| 고가용성 | 다중 AZ로 장애 시 자동 전환 | 직접 설계 |
| 확장 | 클릭 몇 번으로 사양 변경 | 서버 업그레이드, 중단 발생 |
| 보안 | 암호화·IAM·네트워크 격리 제공 | 직접 설정 |
| 백업 | 자동 스냅샷, 특정 시점 복구 | 직접 |

웹 서버와 DB를 분리하면 웹 서버를 지우거나 늘려도 데이터는 그대로다.

## RDS MySQL 만들기

**RDS 콘솔 → 데이터베이스 생성**. 리전이 EC2와 같은지 먼저 확인하고, **연결할 EC2 인스턴스를 켜 둔 상태**에서 만든다(아래 연결 설정에서 고르기 때문).

1. 생성 방식: **전체 구성**
2. 엔진: **MySQL**
3. 템플릿: **프리 티어**
4. 가용성 및 내구성: 개발용이면 **단일 AZ**

| 옵션 | 구성 | 장애 시 |
|---|---|---|
| 다중 AZ DB 클러스터 | 다른 AZ에 대기 인스턴스 2개. 평소 읽기 쿼리도 처리 | 약 30초 내 승격 |
| 다중 AZ DB 인스턴스 | 다른 AZ에 복사본(스탠바이) 1개 | 1~2분 내 승격 |
| 단일 AZ DB 인스턴스 | 인스턴스 하나. 가장 저렴 | 서비스도 같이 멈춤 |

AZ(가용 영역)는 리전 안의 독립된 데이터 센터다. 한 데이터 센터에 불이 나도 다른 AZ의 복사본으로 넘어가는 것이 다중 AZ다.

5. 설정: **DB 인스턴스 식별자**(이름), **마스터 사용자 이름**과 **마스터 암호**(DB의 root 계정)
6. 인스턴스 구성·스토리지: 기본값
7. 연결: **EC2 컴퓨팅 리소스에 연결** → 앞에서 만든 EC2 선택

7번이 중요하다. 이렇게 하면 RDS는 **퍼블릭 접근 없이** 같은 VPC의 EC2에서만 접속되도록 보안 그룹이 자동으로 짜인다. 내 PC에서 바로 접속하고 싶다면 "연결 안 함" + 퍼블릭 액세스 "예"를 고르는데, DB가 인터넷에 노출되므로 실습용으로만 쓴다.

생성은 5~10분쯤 걸린다(배포 필기에도 "RDS 시간이 좀 걸린다"고 적어 두었다).

## EC2에서 RDS 접속

생성된 DB의 **연결 & 보안** 탭에서 **엔드포인트**(DB 서버 주소)와 포트(3306)를 확인한다. EC2에 MySQL 클라이언트와 빌드 도구를 설치한다.

```bash
sudo apt update
sudo apt upgrade
sudo apt install -y build-essential pkg-config python3-dev libmariadb-dev libmariadb-dev-compat
sudo apt install -y mysql-client
```

앞줄은 다음 글에서 Django가 MySQL에 붙을 때 쓰는 `mysqlclient` 패키지를 **빌드하는 데 필요한** 개발 헤더다. 이것 없이 `pip install mysqlclient`를 하면 컴파일 에러가 난다.

```bash
mysql -u 마스터사용자 -p -h <RDS 엔드포인트>
```

`-p`만 쓰고 비밀번호는 프롬프트에서 입력한다(명령어에 비밀번호를 쓰면 셸 기록에 남는다).

### 프로젝트용 DB와 계정

배포 필기에 정리한 순서다. 마스터 계정을 애플리케이션에 그대로 쓰지 않고 **프로젝트 전용 계정**을 만든다.

```sql
CREATE DATABASE mypoll;

CREATE USER '<앱 계정>'@'%' IDENTIFIED BY '<비밀번호>';
GRANT ALL PRIVILEGES ON mypoll.* TO '<앱 계정>'@'%';
```

필기에는 첫 줄이 `CREATE DATABASES mypoll`로 적혀 있는데, `DATABASES`는 `SHOW DATABASES`에 쓰는 복수형이고 만들 때는 `CREATE DATABASE`다. 그대로 실행하면 문법 오류가 난다.

`'계정'@'%'`의 `%`는 "어느 호스트에서 접속해도"라는 뜻이다. RDS는 이미 보안 그룹으로 EC2에서만 접속되게 막혀 있어서 `%`를 써도 되지만, 권한은 `mypoll.*`(이 DB만)으로 좁혔다. [SQL 시리즈](/notes/sql/sql-database-overview)에서 다룬 DCL(`GRANT`)이 여기서 쓰인다.

## 정리

| 작업 | 명령·설정 |
|---|---|
| 파이썬 환경 | `curl ... uv/install.sh \| bash` → `source ~/.bashrc` |
| 원격 개발 | VSCode Remote-SSH + `~/.ssh/config` |
| Docker | 공식 저장소 등록 → `docker-ce` → `usermod -aG docker` → 재로그인 |
| RDS 생성 | MySQL, 프리 티어, 단일 AZ, **EC2 컴퓨팅 리소스에 연결** |
| RDS 접속 | `mysql -u 계정 -p -h <엔드포인트>` |
| 앱 전용 계정 | `CREATE USER` + `GRANT ... ON mypoll.*` |

다음 글에서는 Django 프로젝트를 이 EC2에 올리고, NGINX와 Gunicorn으로 서비스한다.
