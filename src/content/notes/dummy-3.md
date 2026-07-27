---
title: 'Spark Join Strategy 로컬에서 확인해보기'
category: 'Tech'
subcategory: 'Data Engineering'
tags: ['Data Engineering', 'Spark']
date: 2025-09-10
thumbnail: '../../assets/images/notes/dummy-3/thumb.png'
---

금일 포스팅에선 Spark의 몇가지 조인 전략에 대해 어떤 상황에서 사용하면 좋은지 실습을 하며 확인한 과정을 공유하고자 한다. 

Shuffle Hash Join, Broadcast Hash Join, Sort Merge Join 세 가지 주요 조인 전략을 로컬 환경의 스파크 클러스터에서 테스트해보고, Spark UI의 DAG 실행 계획을 통해 각 조인이 물리적으로 어떻게 실행되는지 비교 분석해보았습니다. 대용량 데이터 처리 파이프라인 설계 시 이 전략들을 올바르게 선택하는 것이 성능에 미치는 영향은 매우 큽니다.
