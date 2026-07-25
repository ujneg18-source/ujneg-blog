---
title: "Cloud Infra Monitor"
period: "2022.01 - 2022.06"
description: "멀티 클라우드(AWS/GCP) 실시간 리소스 모니터링 및 로드 밸런서를 관리하는 대시보드. (View More 테스트용 더미 프로젝트)"
techStack: ["Go", "Docker", "AWS"]
status: "Completed"
---

## 1. 프로젝트 개요
Cloud Infra Monitor는 여러 리전의 클라우드 컴퓨팅 사용량과 과금 내역, 그리고 Pod 생존 여부를 주기적으로 체크하고 웹훅 알림을 보내는 데브옵스 인프라 관제 서비스입니다.

### 트러블슈팅
- 고주파 메트릭 수집으로 인한 DB 네트워크 과부하 해결을 위해 Go Routines와 채널 버퍼링을 도입했습니다.
