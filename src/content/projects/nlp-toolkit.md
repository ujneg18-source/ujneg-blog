---
title: "Korean NLP Toolkit"
period: "2023.01 - 2023.05"
description: "한국어 NLP 연구 및 실험 도구 모음. KoNLPy 형태소 분석기 래퍼 클래스 및 PyTorch 기반 딥러닝 모델 학습 파이프라인."
techStack: ["Python", "KoNLPy", "PyTorch"]
thumbnail: ../../assets/images/projects/nlp-toolkit/1.jpg
status: "Completed"
---

## 1. 프로젝트 배경 및 필요성
Korean NLP Toolkit은 한국어 자연어 처리 연구 및 프로젝트를 가속화하기 위해 사내 및 연구용으로 구축한 **통합 전처리·임베딩·모델 파인튜닝 프레임워크**입니다. 파편화된 다수의 한국어 형태소 분석기(Mecab, Okt, Kkma, Hannanum 등)를 하나의 일관된 인터페이스로 통제하고, PyTorch와 직접적으로 연동되는 데이터 로더를 제공합니다.

*※ 참고: 본 프로젝트는 연구 계약 및 사유 모듈 보안 정책으로 인해 외부 오픈소스 GitHub 저장소 접속이 비활성화(Private Repository)되어 있습니다.*

### 주요 모듈 구성
- **Unified Analyzer Interface**: 다목적 형태소 분석기의 입출력 인터페이스 100% 규격화 및 동적 교체 모듈
- **Data Augmentation Unit**: 한국어 특화 증강 기법(역번역, 문이해 보강 단어 대체 등) 패키징

---

## 2. KoNLPy 래퍼 클래스와 메모리 최적화
Python에서 Java 기반의 KoNLPy를 실행할 때 상시 파생되는 JVM 초기화 부하 및 Out-Of-Memory(OOM) 이슈를 탈피하기 위해 차별화된 아키텍처를 적용했습니다.

### JVM Singleton Worker 패턴
- 스크립트 실행 때마다 불필요하게 JVM 인스턴스가 생성되는 폐단을 근절하기 위해 싱글턴 패턴의 공유 workerpool 아키텍처 구현
- 100만 문장 대용량 코퍼스 형태소 처리 시 CPU 멀티코어 병렬화 프로세싱을 통해 기존 속도 대비 4.5배 우수한 런타임 효율성 기록

---

## 3. PyTorch 기반 실험 스크립트 규격화
다양한 하이퍼 파라미터(Learning Rate, Batch Size, Dropout Rate) 하에서 BERT, KoElectra 등 pre-trained Transformer 모델의 파인튜닝 실험 결과를 획일적인 JSON 및 WandB 로그로 저장하는 러너 스크립트를 구현했습니다.

### 트러블슈팅: 한글 데이터 정렬 및 Tokenizing 시 메모리 누수
- **문제 현상**: 대형 한국어 Corpus(약 15GB 텍스트)를 PyTorch Custom Dataset으로 적재할 때 Ram 메모리가 가라앉지 않고 고갈되는 크래시 발생
- **해결 방안**: 파이썬 리스트에 텍스트를 모두 올려두는 대신, 메모리 맵(`mmap`) 방식의 인덱스 오프셋 독해 기법과 Huggingface Tokenizer의 온디맨드 스트리밍 적재를 결합하여 물리적 RAM 소유량을 고유 2GB 안팎으로 획기적으로 고정시켰습니다.
