---
title: "TypeScript 제네릭을 제대로 이해하자"
date: 2023-10-02
category: "JavaScript"
description: "any 타입을 남발하던 습관에서 벗어나 재사용 가능하고 Type Safe한 제네릭 유효성 검사 유틸리티 함수들을 설계하는 팁과 노하우를 알아봅니다. (View More 테스트용 더미 스토리)"
tags: ["TypeScript", "JavaScript", "타입스크립트"]
---

## 1. Why Generics?
우리는 자주 다양한 타입을 수용하면서도 타입 안전성을 유지하는 API나 래퍼 모듈을 설계해야 합니다. 제네릭이 제공하는 놀라운 유연성과 제약 조건(Extends) 활용법을 파해쳐 봅니다.
