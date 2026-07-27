---
title: 'FastAPI와 Uvicorn의 관계, ASGI'
category: 'Tech'
subcategory: 'Backend'
tags: ['Python', 'Backend', '웹']
date: 2026-06-16
thumbnail: '../../assets/images/notes/dummy-1/thumb.png'
---

Python Web Server 및 Application Framework의 개념에 대해서 공부하면서 헷갈렸던 개념들을 정리하고자 한다. 현재 회사에서 운영 과정에서 발생하는 수동 업무들을 시스템화하고자 간단한 스택으로 FastAPI와 Uvicorn 조합을 선택했다.

## ASGI란 무엇인가?

ASGI(Asynchronous Server Gateway Interface)는 비동기 파이썬 웹 서버와 애플리케이션 간의 표준 인터페이스 규격이다. 기존의 WSGI가 동기적인 요청 처리만 지원했던 것과 달리, ASGI는 웹소켓(WebSocket)과 HTTP/2, 비동기 처리를 기본적으로 지원한다.

### ASGI와 WSGI의 결정적 차이점

WSGI는 단일 요청을 동기식으로 처리하기 때문에 I/O 바운드 작업이 많을 경우 스레드가 대기 상태에 빠지며 전체 성능이 저하된다. 반면 ASGI는 이벤트 루프 기반으로 작동하여 대규모 비동기 연결을 효율적으로 처리할 수 있다.

## FastAPI와 Uvicorn의 역할 분담

FastAPI는 이 ASGI 규격을 따르는 프레임워크이고, Uvicorn은 이를 실행하는 고속 ASGI 서버 역할을 한다. 이 글에서는 이 두 요소가 어떻게 데이터를 주고받는지 심층적으로 분석한다.

### Uvicorn은 왜 빠른가?

Uvicorn은 uvloop와 httptools를 기반으로 구현된 고성능 ASGI 서버이다. uvloop는 Node.js에서 사용하는 libuv를 파이썬용 C 확장으로 적용하여 기존 asyncio의 기본 이벤트 루프보다 2~4배 빠른 속도를 제공한다.

## 실제 배포 환경 구성 팁

운영 환경에서는 Uvicorn을 직접 단독으로 노출시키기보다, Gunicorn이나 Nginx를 앞단에 두고 여러 Uvicorn 워커 프로세스를 띄워 멀티코어를 온전히 활용하는 구성이 권장된다. 이를 통해 안정적인 로드 밸런싱과 고가용성을 보장받을 수 있다.
