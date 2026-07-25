---
title: 'Pandas groupby 연산 완벽 가이드'
category: 'Tech'
subcategory: 'Python'
tags: ['Python', 'Data Engineering']
date: 2025-07-05
thumbnail: '../../assets/images/note-thumb-1.png'
---

데이터 전처리 과정에서 가장 많이 쓰이는 pandas groupby의 원리와, apply vs transform의 차이점을 실무 예제와 함께 비교합니다.

특히 수백만 건의 데이터를 다룰 때 apply 연산이 병목이 되는 경우가 잦은데, 이때 vectorized 연산이나 Cython 기반의 transform을 적절히 활용하면 속도를 기하급수적으로 끌어올릴 수 있습니다. 데이터를 다루는 엔지니어와 데이터 사이언티스트라면 반드시 숙지해야 할 내용입니다.
