---
title: "Django 배포: EC2에 NGINX · Gunicorn · RDS로 올리기"
description: "Streamlit을 nohup으로 띄우는 간단한 배포부터, Django 설문·채팅 프로젝트를 NGINX + Gunicorn + RDS MySQL 구성으로 EC2에 올리는 과정을 정리합니다. 운영용 settings.py, collectstatic, systemd 서비스 등록, NGINX 리버스 프록시와 SSE 스트리밍 설정, 그리고 실제 배포 설정 파일에서 찾은 함정까지 다룹니다."
category: 'Infra'
subcategory: 'AWS'
series: 'AWS'
seriesOrder: 4
originalNotebook: "14_AWS (06_EC2에서 Streamlit_Django 서비스.ipynb, Django_AWS_Config), mypoll/django_setting.md"
tags: ["AWS","Django"]
date: 2026-08-06T11:00:00+09:00
thumbnail: '../../../assets/images/notes/aws/aws-django-deploy.webp'
---

> SKN31 AWS 수업 자료(`06_EC2에서 Streamlit_Django 서비스.ipynb`)와 설정 파일(`Django_AWS_Config/`), 직접 배포하며 정리한 필기(`mypoll/django_setting.md`)를 바탕으로 정리했습니다.
> systemd 설정 검사는 Ubuntu 가상 머신에서 `systemd-analyze verify`로 **직접 실행**했습니다.

## 이 글에서 다루는 것

- Streamlit을 EC2에서 띄우기
- NGINX · Gunicorn · Django의 역할 분담
- 운영용 `settings.py`: `DEBUG`, `ALLOWED_HOSTS`, static·media, RDS 연결
- Gunicorn을 systemd 서비스로 등록
- NGINX 리버스 프록시와 SSE 스트리밍 설정
- 배포 설정 파일에서 찾은 함정들

[지난 글](/notes/aws/aws-ec2-dev-rds)까지 EC2와 RDS를 준비했다. 이제 [Django 시리즈](/notes/django/django-sse-chat)의 `mypoll`(설문·회원·채팅)을 올린다.

## 먼저 간단한 경우: Streamlit

Streamlit 앱은 서버에서 실행만 해 두면 된다.

1. 앱 코드와 `requirements.txt`를 GitHub에 올린다. **OpenAI API 키처럼 비용이 드는 설정은 올리지 않는다.**
2. EC2에서 clone → 가상 환경 → 설치
3. 보안 그룹에 Streamlit 포트(기본 8501) 인바운드 규칙 추가. 다른 포트로 띄우면(`--server.port 포트`) 그 포트를 연다.
4. 실행

```bash
nohup streamlit run app.py &
```

`&`는 백그라운드 실행, `nohup`은 SSH 연결을 끊어도(hangup 신호) 프로세스가 죽지 않게 한다. 출력은 `nohup.out` 파일에 쌓인다. (수업 자료에는 `streamlait`으로 오타가 나 있어 그대로 치면 명령을 찾지 못한다.)

이 방식은 간단하지만 서버가 재부팅되면 다시 띄워야 하고, 죽어도 아무도 모른다. Django는 아래처럼 정식 구성으로 올린다.

## NGINX · Gunicorn · Django

![NGINX와 Gunicorn 구성](/images/aws/fig-aws-nginx-gunicorn.png)

[Django 1편](/notes/django/django-getting-started)에서 본 세 층을 실제로 세운다.

| 층 | 프로그램 | 하는 일 |
|---|---|---|
| 웹 서버 | NGINX | 80번 포트로 요청 수신, **static·media 파일 직접 응답**, 나머지는 Gunicorn으로 전달 |
| WSGI 서버 | Gunicorn | 파이썬 앱 실행 환경. 워커 프로세스 여러 개로 Django를 돌림 |
| 앱 | Django | View 실행, DB(RDS) 조회 |

`runserver`는 개발용이라 한 번에 많은 요청을 처리하거나 보안 공격을 견디도록 만들어지지 않았다. 운영에서는 웹 서버와 WSGI 서버를 따로 둔다.

필기의 파일 위치 정리다.

```text
# 파일명
- **gunicorn systemd 등록 파일 경로**
  - "/etc/systemd/system/mypoll_chat-wsgi.service"
- **nginx 설정파일 경로**
  - "/etc/nginx/sites-available/mypoll_chat"
- **socket file 디렉토리 경로**
  - "/run/mypoll_chat"
  - 소유: ubuntu:www-data
- **static, media Root 경로**
  - '/var/www/mypoll_chat/static'
  - '/var/www/mypoll_chat/media'
  - 소유: ubuntu:ubuntu
```

NGINX와 Gunicorn은 TCP 포트 대신 **유닉스 소켓 파일**(`/run/mypoll_chat/gunicorn.sock`)로 통신한다. 같은 서버 안의 프로세스끼리라 네트워크를 거치지 않고, 외부에서 Gunicorn에 직접 접근할 수도 없다.

## 1. 운영용 settings.py

필기에 정리한 순서다. 로컬에서 고쳐 GitHub에 올리고 EC2에서 받는다.

```text
## settings.py  수정

- `ALLOWED_HOST = ["*"]` 로 설정
- DEBUG=False
- STATIC_ROOT = '/var/www/mypoll_chat/static'
- MEDIA_ROOT = '/var/www/mypoll_chat/media'
```

```python
DATABASES = {
    'sqlite3': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    },
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DATABASE_NAME'),
        'USER': os.getenv('DATABASE_USER'),
        'PASSWORD': os.getenv('DATABASE_PASSWORD'),
        'HOST': os.getenv('DATABASE_HOST'),
        'PORT': '3306',
    }
}
```

| 설정 | 값 | 이유 |
|---|---|---|
| `DEBUG` | `False` | 에러 페이지에 코드·설정이 노출되지 않게 |
| `ALLOWED_HOSTS` | 서비스할 IP·도메인 | `DEBUG=False`면 필수. 목록에 없는 Host로 온 요청은 400 |
| `STATIC_ROOT` | `/var/www/mypoll_chat/static` | `collectstatic`이 모으는 곳, NGINX가 서빙 |
| `MEDIA_ROOT` | `/var/www/mypoll_chat/media` | 업로드 파일 저장소 |
| `DATABASES['default']` | MySQL(RDS) | Django는 `default`를 기본 DB로 쓴다 |

로컬 `settings.py`는 `default`가 SQLite, `mysql`이 RDS였다. 배포에서는 **이름을 바꿔** RDS를 `default`로 올렸다. DB 접속 정보는 `os.getenv()`로 `.env`에서 읽는다. `.env`는 `.gitignore`에 있어서 GitHub에 올라가지 않으므로 **EC2에서 직접 만들어야** 한다.

짚을 것이 세 가지다.

**필기의 `ALLOWED_HOST`는 `ALLOWED_HOSTS`다.** Django는 모르는 이름의 설정을 에러 없이 무시한다. 오타 난 채로 `DEBUG=False`를 켜면 진짜 `ALLOWED_HOSTS`는 빈 리스트라서 **모든 요청이 400 Bad Request**가 된다. `["*"]`는 아무 Host나 허용한다는 뜻이라 동작은 하지만, 실제 서비스에서는 EC2 IP나 도메인을 적는다.

**`SECRET_KEY`도 `.env`로 옮긴다.** 수업 자료의 권장 예시다.

```python
DEBUG = False
ALLOWED_HOSTS = ['*']
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
```

키 값은 `.env`에만 두고, 저장소에는 [Django 1편](/notes/django/django-getting-started)의 `.env.example`처럼 항목 이름만 올린다.

**수업 자료의 "DEBUG=False면 코드 변경시 자동 적용되지 않는다"는 원인이 다르다.** 코드를 바꿔도 반영되지 않는 것은 Gunicorn이 시작할 때 코드를 한 번 읽어 두기 때문이다. `DEBUG`와 관계없이, 코드를 바꾸면 Gunicorn 서비스를 재시작해야 한다(아래 "변경 반영").

### MySQL 드라이버

```bash
uv pip install django django-bootstrap5 pillow langchain langchain-openai python-dotenv gunicorn mysqlclient
```

필기의 설치 목록에는 `mysqlclient`가 있는데, 수업 자료의 `settings.py` 예시는 다른 드라이버(PyMySQL)를 쓰는 코드다.

```python
import pymysql
pymysql.install_as_MySQLdb()
```

둘 중 **하나만** 쓰면 된다. Django 공식 권장은 `mysqlclient`이고, 이때는 위 두 줄이 필요 없다(지난 글에서 설치한 `libmariadb-dev` 등이 이 패키지 빌드용이다). 순수 파이썬인 PyMySQL을 쓰면 빌드 도구는 필요 없지만 위 두 줄을 넣어야 하고, `pymysql`을 설치하지 않은 채 이 코드만 넣으면 `ModuleNotFoundError`가 난다.

## 2. EC2에 내려받고 준비

```bash
mkdir workspace && cd workspace
git clone <저장소 주소>
cd mypoll
uv venv .venv --python=3.13
source .venv/bin/activate
uv pip install django django-bootstrap5 pillow langchain langchain-openai python-dotenv gunicorn mysqlclient
# .env 작성 (DB 접속 정보, OPENAI_API_KEY, DJANGO_SECRET_KEY)
```

static·media 디렉토리를 만들고 소유자를 현재 사용자로 바꾼다. `/var/www`는 root 소유라 `sudo`로 만들어야 하고, 그대로 두면 Django(ubuntu 계정)가 파일을 쓸 수 없다.

```bash
sudo mkdir -p /var/www/mypoll_chat/static
sudo chown $USER:$USER /var/www/mypoll_chat/static/

sudo mkdir -p /var/www/mypoll_chat/media
sudo chown $USER:$USER /var/www/mypoll_chat/media/
```

> **보충**: 필기의 media 단계는 `sudo mkdir -p /var/www/mypoll_chat/`(상위 폴더만 생성) 뒤에 `media/`의 소유자를 바꾸도록 되어 있다. `media` 폴더가 없어서 `chown`이 "No such file or directory"로 실패한다. 위처럼 `media`까지 만든다.

```bash
python manage.py collectstatic                 # 앱별 static을 STATIC_ROOT로 복사
python manage.py makemigrations polls account chat
python manage.py migrate                       # RDS에 테이블 생성
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000        # 1차 확인 (8000번 인바운드 필요)
```

`0.0.0.0`은 "모든 네트워크 인터페이스에서 받기"다. 기본값(`127.0.0.1`)으로 띄우면 서버 자기 자신만 접속할 수 있다. 확인이 끝나면 Gunicorn으로 넘어간다.

```bash
gunicorn --bind 0.0.0.0:8000 config.wsgi:application
```

`config.wsgi:application`은 [Django 1편](/notes/django/django-getting-started)에서 본 `config/wsgi.py` 안의 `application` 객체다. 이 상태에서는 static 파일이 깨져 보이는데 정상이다. Gunicorn은 static을 서빙하지 않고, 그 일은 NGINX가 한다.

## 3. Gunicorn을 systemd 서비스로

터미널에서 띄운 Gunicorn은 SSH를 끊거나 서버가 재부팅되면 멈춘다. **systemd**는 리눅스에서 서비스(데몬)를 부팅 시 자동 실행하고 관리하는 프로그램이다. 서비스 설정 파일을 만든다.

```bash
sudo nano /etc/systemd/system/mypoll_chat-wsgi.service
```

내 배포에 쓴 설정 파일이다.

```ini
# sudo nano /etc/systemd/system/mypoll_chat-wsgi.service
# control + s (저장) , control + x (종료)

[Unit]
Description=Gunicorn daemon for Django Project
After=network.target

[Service]
User=ubuntu
Group=ubuntu

Environment="PATH=/home/ubuntu/workspace/mypoll/.venv/bin"
Environment="DJANGO_SETTINGS_MODULE=config.settings"

WorkingDirectory=/home/ubuntu/workspace/mypoll   
ExecStart=/home/ubuntu/workspace/mypoll/.venv/bin/gunicorn --workers 3 --bind unix:/run/mypoll_chat/gunicorn.sock config.wsgi:application

[Install]
WantedBy=multi-user.target

[Service]
RuntimeDirectory=mypoll
RuntimeDirectoryMode=0755
```

| 항목 | 의미 |
|---|---|
| `After=network.target` | 네트워크가 준비된 뒤 시작 |
| `User`/`Group` | 이 계정 권한으로 실행 |
| `WorkingDirectory` | `manage.py`가 있는 프로젝트 폴더 |
| `ExecStart` | 실행 명령. 워커 3개, 유닉스 소켓으로 바인딩 |
| `WantedBy=multi-user.target` | 일반 부팅 시 자동 시작(`enable`할 때 사용) |
| `RuntimeDirectory` | 서비스 시작 시 `/run/이름` 폴더를 만들어 줌 |

### 함정 1: 줄 끝 주석

수업 자료의 설정 예시는 항목마다 줄 끝에 설명 주석이 달려 있다.

```ini
[Unit]
After=network.target                 # 네트워크가 활성화된 후 시작

[Service]
User=ubuntu                          # 서비스 실행 사용자
```

필기에 "**주석이 있으면 안된다.**"라고 따로 적어 둔 부분이다. systemd 설정은 **줄 맨 앞의 `#`만** 주석으로 인정한다. 줄 끝의 `# ...`는 값의 일부가 된다. 위 두 줄로 만든 파일을 검사해 봤다.

직접 실행(`systemd-analyze verify`):

```text
/tmp/u/t.service:3: Failed to add dependency on #, ignoring: Invalid argument
/tmp/u/t.service:3: Failed to add dependency on 네트워크가, ignoring: Invalid argument
/tmp/u/t.service:3: Failed to add dependency on 활성화된, ignoring: Invalid argument
/tmp/u/t.service:3: Failed to add dependency on 후, ignoring: Invalid argument
/tmp/u/t.service:3: Failed to add dependency on 시작, ignoring: Invalid argument
Accepting user/group name 'ubuntu                          # 서비스 실행 사용자', which does not match strict user/group name rules.
```

`After=`는 주석의 단어 하나하나를 **유닛 이름으로** 읽으려 했고, `User=`는 `ubuntu     # 서비스 실행 사용자` 전체를 사용자 이름으로 받았다. 그런 계정은 없으니 서비스가 시작되지 않는다. 내 설정 파일은 주석을 모두 줄 앞으로 빼서 이 문제가 없다.

### 함정 2: RuntimeDirectory와 소켓 경로

강사님 설정과 내 설정의 차이는 경로 세 곳이다.

```text
< Environment="PATH=/home/ubuntu/workspace/mypoll_chat/.venv/bin"
> Environment="PATH=/home/ubuntu/workspace/mypoll/.venv/bin"
< WorkingDirectory=/home/ubuntu/workspace/mypoll_chat
> WorkingDirectory=/home/ubuntu/workspace/mypoll   
< RuntimeDirectory=mypoll_chat
> RuntimeDirectory=mypoll
```

(`<` 강사님, `>` 내 파일) 프로젝트 폴더 이름이 `mypoll`이라 앞의 두 줄을 바꾼 것은 맞다. 그런데 `RuntimeDirectory`까지 `mypoll`로 바꾸면서 소켓 경로와 어긋났다.

- `RuntimeDirectory=mypoll` → systemd가 만들어 주는 폴더는 `/run/mypoll`
- `ExecStart`의 소켓 → `/run/mypoll_chat/gunicorn.sock`

지금 동작하는 것은 필기의 이 단계 덕분이다.

```bash
sudo mkdir -p /run/mypoll_chat
sudo chown $USER:www-data /run/mypoll_chat
sudo chmod 775 /run/mypoll_chat
```

`/run`은 메모리 위의 임시 파일 시스템이라 **재부팅하면 비워진다.** 서버를 껐다 켜면 `/run/mypoll_chat`이 없어서 Gunicorn이 소켓을 만들지 못하고 서비스가 실패한다. `RuntimeDirectory=mypoll_chat`으로 되돌리면 systemd가 매번 폴더를 만들어 주므로 위 수동 `mkdir`도 필요 없다. 탄력적 IP 없이 인스턴스를 중지했다 켜는 실습 환경에서는 특히 자주 만나는 문제다.

서비스 등록과 시작:

```bash
sudo systemctl start mypoll_chat-wsgi      # 서비스로 시작
sudo systemctl enable mypoll_chat-wsgi     # 서버 시작시 자동으로 실행되도록 등록
sudo systemctl status mypoll_chat-wsgi     # 상태확인
```

`status`에 `active (running)`이 보이면 성공이다. 실패하면 `journalctl -u mypoll_chat-wsgi -n 50`으로 로그를 본다. 필기의 메모대로 소켓으로 바인딩했기 때문에 이 단계에서는 브라우저로 확인할 수 없고, NGINX를 붙여야 접속된다.

## 4. NGINX

```bash
sudo apt install nginx
```

설치하면 서비스로 자동 등록되고, `http://<EC2 퍼블릭 IP>`에 NGINX 기본 페이지가 나온다. 사이트 설정 파일을 만든다.

```bash
sudo nano /etc/nginx/sites-available/mypoll_chat
```

```nginx
# sudo nano /etc/nginx/sites-available/mypoll_chat
# server_name을 AWS public ip로 변경한다.
# 챗봇 스트리밍을 위해서 nginx에서 응답시 cache/buffer 사용하지 않게 설정

server {
    listen 80;
    server_name <EC2 퍼블릭 IP>;

    location /static/ {
        alias /var/www/mypoll_chat/static/;
    }

    location /media/ {
        alias /var/www/mypoll_chat/media/; 
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:run/mypoll_chat/gunicorn.sock;
        
        chunked_transfer_encoding on;
        gzip off;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_cache off;
        proxy_read_timeout 30000;
        proxy_send_timeout 30000;
    }
}
```

| 블록 | 하는 일 |
|---|---|
| `location /static/` | `/static/...` 요청을 `STATIC_ROOT`의 파일로 직접 응답 |
| `location /media/` | 업로드 파일 직접 응답 |
| `location /` | 그 밖의 모든 요청을 Gunicorn 소켓으로 전달(리버스 프록시) |
| `include proxy_params` | 원래 Host, 클라이언트 IP 같은 헤더를 Django에 전달 |

`alias`는 `location` 경로를 그 폴더로 **바꿔치기**한다. 수업 자료의 주의 사항대로 `location /static/`과 `alias .../static/`의 끝 `/`를 맞춰야 한다. 한쪽만 빠지면 `/var/www/mypoll_chat/staticjs/chat.js`처럼 경로가 붙어 버려 404가 난다.

### SSE 스트리밍 설정

`location /` 아래 7줄이 [Django 7편](/notes/django/django-sse-chat)의 채팅 스트리밍을 위한 것이다. NGINX는 기본적으로 Gunicorn의 응답을 **모았다가(버퍼링)** 내보내서, 토큰이 하나씩 오는 SSE가 한꺼번에 도착하게 된다.

| 설정 | 효과 |
|---|---|
| `proxy_buffering off` | 응답을 모으지 않고 받는 대로 전달(핵심) |
| `gzip off` | 압축하려고 모으는 것 방지 |
| `proxy_cache off` | 스트림을 캐시하지 않음 |
| `proxy_read_timeout 30000` | 응답이 오래 걸려도 끊지 않음(단위 초, 약 8시간) |

이 설정은 `location /` 전체에 걸려 있어서 설문 화면 같은 일반 페이지까지 버퍼링이 꺼진다. 채팅 스트림 경로만 따로 떼면 범위를 좁힐 수 있다.

```nginx
location /chat/stream/ {
    include proxy_params;
    proxy_pass http://unix:/run/mypoll_chat/gunicorn.sock;
    proxy_buffering off;
    proxy_read_timeout 300;
}
```

또는 Django View에서 응답 헤더에 `X-Accel-Buffering: no`를 넣으면 NGINX가 그 응답만 버퍼링하지 않는다.

> **보충**: `proxy_pass http://unix:run/...`은 소켓 경로가 `/`로 시작하지 않는 **상대 경로**다(강사님 파일도 같다). NGINX가 루트(`/`) 디렉토리에서 실행되면 `/run/...`으로 해석되어 동작하지만, 작업 디렉토리에 기대는 설정이라 위 예시처럼 `unix:/run/mypoll_chat/gunicorn.sock` 절대 경로로 쓰는 것이 안전하다.

> **보충**: Gunicorn 기본(동기) 워커는 요청 하나가 끝날 때까지 워커 하나를 붙잡는다. `--workers 3`이면 채팅 답변이 스트리밍되는 동안 최대 3명까지만 동시에 처리되고, 네 번째 사용자는 설문 목록조차 기다려야 한다. 채팅 사용자가 많다면 `--worker-class gthread --threads 4`처럼 스레드 워커를 쓰거나 ASGI(Uvicorn)로 옮긴다.

설정을 활성화한다.

```bash
sudo ln -s /etc/nginx/sites-available/mypoll_chat /etc/nginx/sites-enabled/mypoll_chat
sudo nginx -t                       # 설정파일 문법 오류 체크
sudo systemctl reload nginx         # nginx 서버 재시작
```

`sites-available`은 설정 보관소, `sites-enabled`는 실제로 켜진 설정이다. 심볼릭 링크로 켜고 끈다. 보안 그룹에 **80번** 인바운드가 열려 있으면 `http://<EC2 퍼블릭 IP>`로 서비스가 열린다.

## 변경 반영과 로그

```bash
sudo systemctl daemon-reload              # 설정 다시 읽기 (.service 파일을 고쳤을 때)
sudo systemctl restart mypoll_chat-wsgi   # 서비스 재시작 (파이썬 코드를 고쳤을 때)
sudo systemctl status mypoll_chat-wsgi    # 상태확인
sudo systemctl restart nginx              # nginx 설정을 고쳤을 때
```

| 바꾼 것 | 할 일 |
|---|---|
| 파이썬 코드, `settings.py`, 템플릿 | `git pull` → `restart mypoll_chat-wsgi` |
| static 파일 | `collectstatic` (NGINX가 바로 읽음) |
| Model | `makemigrations` → `migrate` → restart |
| `.service` 파일 | `daemon-reload` → restart |
| NGINX 설정 | `nginx -t` → `reload nginx` |

| 증상 | 볼 곳 |
|---|---|
| 502 Bad Gateway | Gunicorn이 죽었거나 소켓 경로 불일치 → `systemctl status`, `journalctl -u 서비스` |
| 400 Bad Request | `ALLOWED_HOSTS` |
| CSS·이미지 깨짐 | `collectstatic`, NGINX `alias` 경로와 `/` |
| 500 | Django 에러. `DEBUG=False`라 화면에는 안 나옴 → Gunicorn 로그 |
| NGINX 자체 문제 | `tail /var/log/nginx/error.log` |

## 정리

```text
브라우저 ─80─▶ NGINX ─┬─ /static/, /media/ → /var/www/mypoll_chat/...
                      └─ 나머지 → unix:/run/mypoll_chat/gunicorn.sock
                                   ▶ Gunicorn(워커 3) ▶ Django ─3306─▶ RDS MySQL
```

| 단계 | 핵심 |
|---|---|
| settings.py | `DEBUG=False`, `ALLOWED_HOSTS`(S!), `STATIC_ROOT`, RDS를 `default`로, 비밀값은 `.env` |
| 준비 | clone → venv → 설치 → `.env` → `collectstatic` → `migrate` |
| Gunicorn | systemd 서비스, **줄 끝 주석 금지**, `RuntimeDirectory`와 소켓 폴더 이름 일치 |
| NGINX | static·media는 직접, 나머지는 소켓으로. SSE는 `proxy_buffering off` |
| 반영 | 코드 수정 후 서비스 restart |

- 개발 서버에서 되던 것이 운영에서 안 되면 대부분 **경로·권한·이름 불일치**다. 이 글의 함정도 모두 그 종류였다.
- 수업이 끝나면 EC2 종료, RDS 삭제, 탄력적 IP 릴리스까지 해야 과금이 멈춘다.

이것으로 AWS 시리즈를 마친다.
