---
title: "토큰화: 형태소 분석기 Kiwi·KoNLPy와 WordCloud"
description: "토큰화의 개념과 단어·형태소·서브워드 방식의 차이, 한국어에 형태소 단위 토큰화가 필요한 이유, Kiwi의 tokenize·analyze·space·split_into_sents·사용자 사전·불용어 처리, KoNLPy Okt의 morphs·nouns·pos와 원형 복원·정규화, 그리고 대한민국 헌법 말뭉치로 WordCloud를 그리는 과정까지 실행 결과와 함께 정리합니다."
category: 'Tech'
subcategory: 'NLP'
series: '자연어 처리'
seriesOrder: 3
originalNotebook: "04_토큰화개념_형태소기반 토큰화.ipynb"
tags: ["NLP"]
date: 2026-06-10T10:00:00+09:00
thumbnail: '../../../assets/images/notes/nlp/nlp-tokenization.webp'
---

> SKN31 자연어 처리 과정 노트북 `04_토큰화개념_형태소기반 토큰화.ipynb`를 바탕으로 정리했습니다. 같은 노트북의 다른 사본에 있던 메모도 함께 옮겼습니다.
> 코드는 kiwipiepy 0.24, KoNLPy 0.6(Java 21)에서 실행한 결과입니다. 노트북에서 쓴 kiwipiepy 0.23과 버전이 달라 일부 토큰화 결과가 다를 수 있습니다. 코드 셀의 주석은 수업 중에 적은 그대로 두었습니다. `보충`으로 표시한 부분은 원본 필기에 없던 내용입니다.

## 이 글에서 다루는 것

- 토큰화란, 단어·형태소·서브워드 기반 토큰화의 차이
- 한국어에 형태소 단위 토큰화가 필요한 이유
- **Kiwi(kiwipiepy)**: 토큰화, 상세 분석, 띄어쓰기 교정, 문장 분리, 사용자 사전, 불용어
- **KoNLPy(Okt)**: 형태소 토큰화, 명사 추출, 품사 부착, 원형 복원, 정규화
- **WordCloud**로 단어 빈도 시각화

## 토큰화란

**토큰화(tokenization)**는 자연어를 **모델이 다룰 수 있는 기본 단위(Token)**로 나누는 과정이다. 나누는 단위는 설계에 따라 문장, 어절, 형태소, 서브워드, 문자, 자모/알파벳 등 여러 가지다.

```text
원문: "자연어 처리는 재미있다"
토큰화: ["자연어", "처리", "는", "재미있다"]
```

```text
# 토큰화 하는 방법
# 단어=> 어절/형태소/서브워드 등
# 서브워드 => 붙어있는 글자의 빈도수 => 알고리즘은 bpe/wordpiece, Unigram로 계산 / 어휘사전의 최적화 (o)
# 서브워드는 주로 LLM에서 사용
# 한국어는 주로 형태소를 기준으로 분리함 / 영어는 주로 어절 단위로 분리함
# why? 교착어이기 때문
# 조사에 따라 의미가 달라짐
# 형태-1/형태를-2/형태의-3 (형태가,형태는-미등록, 다시 등록필요).... 낭비가 심함
# 형태-1/(를-2,의-3)인 식으로 토큰화진행
```

### 단어 기반 토큰화 (Word-Level)

- 어절(공백 기준) 또는 형태소 단위로 나누는 전통적인 방식이다
- **한국어는 교착어**라서 한 단어에 여러 조사·어미가 붙는다. 어절 단위로 나누면 어휘 사전이 기하급수적으로 커진다
  - 예) "학교", "학교가", "학교를", "학교에", "학교에서", "학교로", "학교의", ...
- 그 결과 미등록 어휘(OOV, Out of Vocabulary)가 늘고, 같은 의미의 단어가 사전에 중복 등록되고, 메모리가 낭비되고, 학습 효율이 떨어진다
- 그래서 **한국어는 형태소 단위 토큰화**가 필요하다

> **형태소**: 뜻을 가진 가장 작은 말의 단위. 더 나누면 의미를 잃는 최소한의 언어 단위다.

```text
# 교착어라 어절 단위로 쪼개면 문제가 생김
# 학교/학교에/학교의/학교에 => 다 다른 단어로 생각해야함
# BUT 학교라는 단어는 하나임
# 토큰이 너무 많이 생김

# 어휘 사전

# ex) 학교 = 5번/ 단어 = 10번 (유니크) 

#but 어절 단위로하면 학교-5번, 학교는-6번/학교에서, 학교의 등 또 새로운 번호 부여 => 사전이 너무 커짐 + 미등록 단어들이 많아짐

# 교착어라 형태소 단위로 함
# 이해 중심일때는 조사를 제거하기도 함

# 새로운 문서가 들어올 때는 미리 토큰화된 어휘사전을 기반으로 형태소를 분리함
```

### 서브워드 기반 토큰화 (Subword-Level): BPE, WordPiece, Unigram

- Transformer 기반 모델(BERT, GPT, LLaMA 등)의 표준 방식이다
- 단어가 아니라 **문자(character)와 단어(word)의 중간 수준인 서브워드** 단위로 나눈다
- **동작 원리**: 자주 나오는 문자열 조합을 하나의 토큰으로 만든다. 빈도가 높은 단어는 토큰 하나로, 드문 단어는 여러 서브워드로 쪼갠다

```text
입력: "나는 밥을 먹었습니다. 나는 어제 밥을 했습니다."

서브워드 토큰화 결과 (예시):
["나는", "밥", "을", "먹", "었", "습니다", ".", "나는", "어제", "밥", "을", "하", "었", "습니다", "."]
```

```text
# coworker => co/work/er 로 나누는 게 서브워드 자주 붙어있고, 등장하는 문자열의 조합
# 이런 빈도수의 계산을 알고리즘화한 것이 크게 3가지
```

| 장점 | 내용 |
|---|---|
| **OOV 문제 해결** | 처음 보는 단어도 서브워드 조합으로 표현할 수 있다 |
| **어휘 사전 크기 최적화** | 단어 단위보다 작고, 문자 단위보다 효율적이다 |
| **다국어 지원** | 언어에 구애받지 않는다 |
| **형태론적 의미 포착** | 접두사, 접미사 같은 의미를 학습할 수 있다 |

| 알고리즘 | 방식 |
|---|---|
| **BPE** (Byte Pair Encoding) | 가장 자주 나오는 연속 바이트/문자 쌍을 반복해서 병합 |
| **WordPiece** | BERT가 사용. BPE와 비슷하지만 likelihood 기준으로 병합 |
| **Unigram** | 확률 모델로 최적의 서브워드 분할을 고른다 |

서브워드는 다음 글에서 직접 학습시켜 본다. 이 글은 형태소 분석기를 다룬다.

## Kiwi (kiwipiepy)

**kiwipiepy**는 C++로 구현한 한국어 형태소 분석기 Kiwi(Korean Intelligent Word Identifier)를 파이썬에서 쓰게 해 주는 라이브러리다. ([GitHub](https://github.com/bab2min/kiwipiepy))

- 빠르고, 최신 품사 체계를 지원하고, 사용자 사전을 확장하기 쉽다
- 최근 가장 널리 쓰이는 한국어 토크나이저 중 하나다
- 설치: `pip install kiwipiepy`

**Kiwi 클래스**: 형태소 분석과 토큰화 기능을 모두 제공하는 핵심 클래스다.

- 품사는 세종 말뭉치 체계를 따른다. 품사 태그의 첫 글자로 큰 분류를 알 수 있다 ([품사 태그 표](https://github.com/bab2min/kiwipiepy?tab=readme-ov-file#%ED%92%88%EC%82%AC-%ED%83%9C%EA%B7%B8))

| 첫 글자 | 품사 | 예 |
|---|---|---|
| `N` | 체언 (명사, 대명사) | NNG 일반명사, NNP 고유명사, NP 대명사 |
| `V` | 용언 (동사, 형용사) | VV 동사, VA 형용사 |
| `M` | 수식언 (관형사, 부사) | MM 관형사, MAG 일반부사 |
| `J` | 관계언 (조사) | JKS 주격, JKO 목적격, JX 보조사 |
| `E` | 어미 | EF 종결어미, EC 연결어미, EP 선어말어미 |
| `S` | 기호 | SF 마침표, SL 외국어 |

| 메소드 | 하는 일 |
|---|---|
| `tokenize(text)` | 형태소 분석 기반 토큰화 |
| `analyze(text)` | tokenize보다 상세한 분석. 여러 후보 결과를 점수와 함께 볼 수 있다 |
| `space(text)` | 띄어쓰기 교정 |
| `split_into_sents(text)` | 문장 단위 분리 |
| `add_user_word(word, pos, score)` | 사용자 사전에 단어 등록 |

```text
# 이미 토큰화된 어휘사전이 존재
# kiwi 클래스를 사용하면 세종말뭉치라는 데이터셋을 기반으로 분석해줌
```

`Kiwi`를 `kw`라는 별칭으로 import하고 `Kiwi()`로 객체를 만들면 이름이 정의되지 않아 에러가 난다. 아래 셀은 에러가 나는 것이 정상이다.

```python
import kiwipiepy
from kiwipiepy import Kiwi as kw
from pprint import pprint

kiwi = Kiwi()
```

<div class="sql-result sql-result-error"><div class="sql-result-meta">에러 · NameError: name &#x27;Kiwi&#x27; is not defined</div></div>

별칭을 쓰려면 `kiwi = kw()`로, 아니면 별칭 없이 import한다.

```python
from kiwipiepy import Kiwi

kiwi = Kiwi()
kiwipiepy.__version__
```

```text
'0.24.0'
```

> **보충** 노트북의 다른 사본에서는 `Kiwi()`를 만들 때 `Exception: Cannot open extract.mdl for WordDetector`가 났다. Kiwi가 모델 파일(`.mdl`)을 읽지 못할 때 나는 에러로, 윈도우에서 파이썬이나 패키지 설치 경로에 한글이 섞여 있을 때 자주 생긴다. 영문 경로에 가상환경을 다시 만들거나, `Kiwi(model_path="영문 경로")`로 모델 위치를 직접 지정해서 해결한다.

### tokenize: 형태소 단위 토큰화

```python
txt = "나는 자연어 처리를 공부합니다.\n자연어처리란 무엇일까요?"
tokens = kiwi.tokenize(txt) # kiwi가 가지고 있는 어휘사전을 기반으로 토큰화 작업을 수행함
tokens # list로 반환해줌
```

```text
[Token(form='나', tag='NP', start=0, len=1), Token(form='는', tag='JX', start=1, len=1), Token(form='자연어 처리', tag='NNP', start=3, len=6), Token(form='를', tag='JKO', start=9, len=1), Token(form='공부', tag='NNG', start=11, len=2), Token(form='하', tag='XSV', start=13, len=1), Token(form='ᆸ니다', tag='EF', start=13, len=3), Token(form='.', tag='SF', start=16, len=1), Token(form='자연어', tag='NNP', start=18, len=3), Token(form='처리', tag='NNG', start=21, len=2), Token(form='란', tag='JX', start=23, len=1), Token(form='무엇', tag='NP', start=25, len=2), Token(form='이', tag='VCP', start=27, len=1), Token(form='ᆯ까요', tag='EF', start=27, len=3), Token(form='?', tag='SF', start=30, len=1)]
```

- 첫 줄의 "자연어 처리"는 띄어 쓴 상태로 고유명사(NNP) 토큰 하나가 됐다. 그런데 둘째 줄의 붙여 쓴 "자연어처리"는 자연어(NNP) + 처리(NNG)로 나뉘었다. 같은 말이어도 띄어쓰기에 따라 토큰이 달라진다
- "공부합니다"는 공부(NNG) + 하(XSV, 동사 파생 접미사) + ᆸ니다(EF, 종결어미)로 나뉜다. "ᆸ"는 받침만 떨어져 나온 형태다

```python
type(tokens)
```

```text
<class 'list'>
```

Token 객체에는 형태 외에도 여러 속성이 있다.

```python
# Token 객체에서 속성값들 조회

for token in tokens[:3]:
    result = (f"토큰 문자열: {token.form}\n"
             f"토큰의 원형: {token.lemma}\n"
             f"품사: {token.tag}\n"
             f"문서내의 시작위치: {token.start}\n"
             f"글자 수: {token.len}\n"
             f"토큰이 있는 행번호: {token.line_number}\n"
             f"토큰이 몇번째 문장에 있는지: {token.sent_position}\n"
             f"토큰이 몇번째 어절인지: {token.word_position}\n") # 각 문장 내에서 몇번째 어절인지
            

    print(result)
```

```text
토큰 문자열: 나
토큰의 원형: 나
품사: NP
문서내의 시작위치: 0
글자 수: 1
토큰이 있는 행번호: 0
토큰이 몇번째 문장에 있는지: 0
토큰이 몇번째 어절인지: 0

토큰 문자열: 는
토큰의 원형: 는
품사: JX
문서내의 시작위치: 1
글자 수: 1
토큰이 있는 행번호: 0
토큰이 몇번째 문장에 있는지: 0
토큰이 몇번째 어절인지: 0

토큰 문자열: 자연어 처리
토큰의 원형: 자연어 처리
품사: NNP
문서내의 시작위치: 3
글자 수: 6
토큰이 있는 행번호: 0
토큰이 몇번째 문장에 있는지: 0
토큰이 몇번째 어절인지: 1
```

> **보충** 노트북에서는 `tokens` 전체를 돌렸다. 여기서는 길이 때문에 앞의 3개만 출력했다. `lemma`는 동사·형용사(VV, VA) 토큰에서 쓸모 있다. "예쁜"을 토큰화하면 `예쁘`(VA)의 lemma가 `예쁘다`, "피었다"의 `피`(VV)는 `피다`로 나온다. "공부합니다"의 `하`는 동사가 아니라 접미사(XSV)라 lemma도 `하` 그대로다.

여러 문서를 한 번에 토큰화하려면 리스트로 넘긴다. 결과는 문서별 토큰 리스트를 하나씩 꺼내는 iterator다.

```python
# 한번에 여러 문서를 토큰화 => list로 묶어서 전달.
txt_list = [txt, "자연어처리는 NLP라고 합니다. 자연어처리는 transformer모델이 성능이 좋아요."]
print(len(txt_list))

tokens_iterable = kiwi.tokenize(txt_list)
for token_list in tokens_iterable: # 문서별로 토큰 리스트를 반환
    print([t.form for t in token_list])
```

```text
2
['나', '는', '자연어 처리', '를', '공부', '하', 'ᆸ니다', '.', '자연어', '처리', '란', '무엇', '이', 'ᆯ까요', '?']
['자연어 처리', '는', 'NLP', '이', '라고', '하', 'ᆸ니다', '.', '자연어 처리', '는', 'transformer', '모델', '이', '성능', '이', '좋', '어요', '.']
```

> **보충** 노트북에서는 `print(token_list)`로 Token 객체를 통째로 출력했다. 여기서는 형태만 보이도록 `t.form`으로 바꿨다. iterator라서 한 번 돌고 나면 비어 있다. 다시 쓰려면 `list()`로 감싸 두어야 한다.

### analyze: 상세 분석

```python
# 상세한 토큰화 분석 - analyze()
print(txt)
result = kiwi.analyze(txt, top_n=3)

for tokens_, score in result:
    print(round(score, 2), [f"{t.form}/{t.tag}" for t in tokens_])
# list[tuple[Token, float: 점수]]

# -64.59104919433594 점수는 0에 가까울수록 좋음, 어떤 식으로 토큰화할지 점수를 매김(어휘사전 수, 미등록 어휘 등)
```

```text
나는 자연어 처리를 공부합니다.
자연어처리란 무엇일까요?
-68.33 ['나/NP', '는/JX', '자연어 처리/NNP', '를/JKO', '공부/NNG', '하/XSV', 'ᆸ니다/EF', './SF', '자연어/NNP', '처리/NNG', '란/JX', '무엇/NP', '이/VCP', 'ᆯ까요/EF', '?/SF']
-76.19 ['나/NP', '는/JX', '자연어/NNP', '처리/NNG', '를/JKO', '공부/NNG', '하/XSV', 'ᆸ니다/EF', './SF', '자연어 처리/NNP', '란/JX', '무엇/NP', '이/VCP', 'ᆯ까요/EF', '?/SF']
-80.26 ['나/NP', '는/JX', '자연어 처리/NNP', '를/JKO', '공부/NNG', '하/XSA', 'ᆸ니다/EF', './SF', '자연어 처리/NNP', '이/VCP', '란/ETM', '무엇/NP', '이/VCP', 'ᆯ까요/EF', '?/SF']
```

`top_n=3`이면 점수가 높은 분석 후보 3개를 준다. `tokenize`는 그중 1등 결과다.

> **보충** 점수는 로그 확률이라 음수다. 0에 가까울수록 그럴듯한 분석이다. 노트북에서는 `pprint(result)`로 통째로 출력했는데, 후보끼리 비교하기 쉽도록 형태/품사만 한 줄씩 찍었다.

### space: 띄어쓰기 교정

```python
# 띄어쓰기 교정
txt = "나는자연어처리를공부합니다자연어처리란무엇일까요"
result = kiwi.space(txt)
result
```

```text
'나는 자연어 처리를 공부합니다 자연어 처리란 무엇일까요'
```

```python
txt_list = (txt, "아버지가방에들어가신다.")
result_list = kiwi.space(txt_list)
result_list # Iterable
for r in result_list:
    print(r)
```

```text
나는 자연어 처리를 공부합니다 자연어 처리란 무엇일까요
아버지가 방에 들어가신다.
```

"아버지가방에"를 "아버지 가방에"가 아니라 "아버지가 방에"로 맞게 띄웠다.

### split_into_sents: 문장 분리

```python
# 문서를 문장 단위로 분리 .split_into_sents

doc = '디 마르지오 기자에 따르면 스완지가 과거 팀에서 주축 공격수로 활약했던 미추와 재회를고려하고있다. 다만 선수는 아니다. 디 마르지오 기자는 "이번엔스포츠 디렉터역할이다. 그는 얼마전 까지 스페인 라리가 부르고스에서 매우 좋은 성과를 거두며 경험을 쌓았다"라고 설명했다.'

sent_list = kiwi.split_into_sents(doc)

for sent in sent_list:
    print(sent.text)
    print(kiwi.space(sent.text))
    print("----------------------")
```

```text
디 마르지오 기자에 따르면 스완지가 과거 팀에서 주축 공격수로 활약했던 미추와 재회를고려하고있다.
디 마르지오 기자에 따르면 스완지가 과거 팀에서 주축 공격수로 활약했던 미추와 재회를 고려하고 있다.
----------------------
다만 선수는 아니다.
다만 선수는 아니다.
----------------------
디 마르지오 기자는 "이번엔스포츠 디렉터역할이다. 그는 얼마전 까지 스페인 라리가 부르고스에서 매우 좋은 성과를 거두며 경험을 쌓았다"라고 설명했다.
디 마르지오 기자는 "이번엔 스포츠 디렉터 역할이다. 그는 얼마 전까지 스페인 라리가 부르고스에서 매우 좋은 성과를 거두며 경험을 쌓았다"라고 설명했다.
----------------------
```

따옴표 안의 "이번엔스포츠 디렉터역할이다."에서 마침표가 나왔지만 인용문 안이라 문장을 끊지 않았다. 띄어쓰기 교정도 "재회를 고려하고 있다", "얼마 전까지"처럼 맞게 고쳤다.

인용문 같은 **안긴 문장**은 `subs`로 따로 나온다.

```python
# 문장 내에 문장이 있는 경우 문장을 분리하고자 함 (인용문을 분리하고자 함=>겹문장을 안긴문장/안은문장으로 구분)
txt = '어제 친구가 "내일 롯데월드에 놀러가자."라고 말했다.'
result = kiwi.split_into_sents(txt)
result
```

```text
[Sentence(text='어제 친구가 "내일 롯데월드에 놀러가자."라고 말했다.', start=0, end=30, tokens=None, subs=[Sentence(text='내일 롯데월드에 놀러가자.', start=8, end=22, tokens=None, subs=None)])]
```

```python
for txt in result:
    print("전체문장:", txt.text)
    if txt. subs:
        print("하위문장: ", end="")
        for sub_txt in txt.subs:
            print(sub_txt.text)
```

```text
전체문장: 어제 친구가 "내일 롯데월드에 놀러가자."라고 말했다.
하위문장: 내일 롯데월드에 놀러가자.
```

### add_user_word: 사용자 사전

신조어나 고유명사가 사전에 없으면 엉뚱하게 쪼개진다. `add_user_word(단어, 품사, score)`로 등록한다.

```python
# 보충: 등록 전
kiwi2 = Kiwi()
[(t.form, t.tag) for t in kiwi2.tokenize("박새로이가 왔다.")]
```

```text
[('박', 'NNP'), ('새로이', 'MAG'), ('가', 'JKS'), ('오', 'VV'), ('었', 'EP'), ('다', 'EF'), ('.', 'SF')]
```

```python
# 사용자 어휘(단어/토큰)을 추가. -add_user_word(추가할 단어, 품사, score)=신조어 등

## score: 토큰화할때그단어의 우선수위를 조절하기 위한 가중치값. 클수록 그단어를 선호하게 된다.
##         0:중립값. 고유명사들은 보통 0을 지정한다.

## 예) 딥러닝:5 /// 딥 + 러닝:10 -> 문장에 딥러닝이 있으면 "딥", "러닝"을 분리하는 것을 더 선호하게 된다. (5점보다 10점이 더 높음)

# 어휘 사전에 박새로이를 추가
kiwi.add_user_word("박새로이", "NNP", 0) # 보통 고유명사는 0으로 둠

txt = "박새로이가 왔다."
kiwi.tokenize(txt)
```

```text
[Token(form='박새로이', tag='NNP', start=0, len=4), Token(form='가', tag='JKS', start=4, len=1), Token(form='오', tag='VV', start=6, len=1), Token(form='었', tag='EP', start=6, len=1), Token(form='다', tag='EF', start=7, len=1), Token(form='.', tag='SF', start=8, len=1)]
```

### 불용어(Stopwords) 처리

```text
# 불용어(Stop words) 처리 -> 사용하지 않을 토큰들을 처리
# 토큰화 후 제거할 토큰들 => 생성보다 이해의 영역 (조사/대명사 등), 영어의 경우 관사/ 대명사/ 전치사/ 접속사

# 제거의 기준? = 모델링

# 관행 => 불용어.txt 로 사전을 만들어 둠
```

kiwipiepy는 불용어 사전 `Stopwords`를 제공한다. (형태, 품사) 쌍으로 들어 있다.

```python
from kiwipiepy.utils import Stopwords #kiwipiepy에서 제공하는 불용어사전

sw = Stopwords()
pprint(len(sw.stopwords))
sorted(sw.stopwords)[:15]
```

```text
100
```

```text
[('ᆫ', 'ETM'), ('ᆫ', 'JX'), ('ᆫ다', 'EF'), ('ᆯ', 'ETM'), ('가', 'JKS'), ('같', 'VA'), ('것', 'NNB'), ('게', 'EC'), ('겠', 'EP'), ('고', 'EC'), ('고', 'JKQ'), ('과', 'JC'), ('과', 'JKB'), ('그', 'MM'), ('그', 'NP')]
```

```python
txt = "나는 자연어처리를 공부한다. 자연어처리는 NLP라고 한다."
# 토큰화
tokens = kiwi.tokenize(txt)
[(t.form, t.tag) for t in tokens]
```

```text
[('나', 'NP'), ('는', 'JX'), ('자연어 처리', 'NNP'), ('를', 'JKO'), ('공부', 'NNG'), ('하', 'XSV'), ('ᆫ다', 'EF'), ('.', 'SF'), ('자연어 처리', 'NNP'), ('는', 'JX'), ('NLP', 'SL'), ('이', 'VCP'), ('라고', 'EC'), ('하', 'VV'), ('ᆫ다', 'EF'), ('.', 'SF')]
```

```python
# 불용어 제거

result = sw.filter(tokens) # tokens에서 불용어를 제거
result
```

```text
[Token(form='자연어 처리', tag='NNP', start=3, len=5), Token(form='공부', tag='NNG', start=10, len=2), Token(form='자연어 처리', tag='NNP', start=16, len=5), Token(form='NLP', tag='SL', start=23, len=3), Token(form='라고', tag='EC', start=26, len=2)]
```

`sw.filter`는 (형태, 품사)가 모두 맞는 토큰만 지운다. 형태만 보고 직접 거를 수도 있다.

```python
stopwords = ["나", "는", "를", "ᆫ다", "."]
result2=[]
for t in tokens:
    # print(t.form)
    if t.form not in stopwords:
        result2.append(t.form)

result2
```

```text
['자연어 처리', '공부', '하', '자연어 처리', 'NLP', '이', '라고', '하']
```

`Stopwords` 객체에 불용어를 추가·삭제할 수도 있다. 인자는 `(형태, 품사)` 튜플이다.

```python
txt = "그 사람의 이름은 박새로이입니다."
result = kiwi.tokenize(txt)
print([(t.form, t.tag) for t in result])
sw.filter(result)
```

```text
[('그', 'MM'), ('사람', 'NNG'), ('의', 'JKG'), ('이름', 'NNG'), ('은', 'JX'), ('박새로이', 'NNP'), ('이', 'VCP'), ('ᆸ니다', 'EF'), ('.', 'SF')]
```

```text
[Token(form='이름', tag='NNG', start=6, len=2), Token(form='박새로이', tag='NNP', start=10, len=4), Token(form='ᆸ니다', tag='EF', start=14, len=3)]
```

```python
# 박새로이 -> sw에 추가
sw.add(("박새로이", "NNP"))
sw.filter(result)
```

```text
[Token(form='이름', tag='NNG', start=6, len=2), Token(form='ᆸ니다', tag='EF', start=14, len=3)]
```

```python
sw.remove(("박새로이", "NNP"))
sw.filter(result)
```

```text
[Token(form='이름', tag='NNG', start=6, len=2), Token(form='박새로이', tag='NNP', start=10, len=4), Token(form='ᆸ니다', tag='EF', start=14, len=3)]
```

> **보충** 주석의 `sw.add("단어", "품사")`처럼 인자 두 개로 넘기면 동작하지 않는다. 실제 코드처럼 `sw.add(("박새로이", "NNP"))` 튜플 하나로 넘겨야 한다.

### 특정 품사만 뽑기

```python
## 특정 품사의 토큰들만 추출
## 명사만 추출 ( 명사 품사 TAG: N으로 시작.)
result = kiwi.tokenize(doc)
token_list = []

for token in result:
    # print(token.tag)
    # if token.tag in ["NNP", "SL", "SSO"]
    if token.tag.startswith("NNP"):
        token_list.append(token)

[(t.form, t.tag, t.oov) for t in token_list]
```

```text
[('디', 'NNP', False), ('마르지오', 'NNP', True), ('스완지', 'NNP', False), ('미추', 'NNP', False), ('디', 'NNP', False), ('마르지오', 'NNP', True), ('스페인', 'NNP', False), ('라리가', 'NNP', True), ('부르고스', 'NNP', False)]
```

`oov=True`는 사전에 없는 말을 Kiwi가 추정해서 고유명사로 붙인 경우다.

> **보충** 주석은 "명사만 추출(N으로 시작)"인데 코드는 `startswith("NNP")`라 **고유명사만** 뽑힌다. 일반명사(NNG)까지 모두 뽑으려면 `startswith("NN")`, 대명사(NP)까지 포함하려면 `startswith("N")`이다.

```python
# 보충: NN으로 바꾸면
[t.form for t in kiwi.tokenize(doc) if t.tag.startswith("NN")]
```

```text
['디', '마르지오', '기자', '스완지', '과거', '팀', '주축', '공격수', '활약', '미추', '재회', '고려', '선수', '디', '마르지오', '기자', '이번', '스포츠', '디렉터', '역할', '얼마', '전', '스페인', '라리가', '부르고스', '성과', '경험', '설명']
```

## KoNLPy

**KoNLPy**는 한국어 자연어 처리 파이썬 라이브러리다. 토큰화, 형태소 분석, 어간 추출, 품사 부착(POS Tagging)을 제공한다. ([공식 문서](http://konlpy.org/ko/latest/))

- 이미 개발된 여러 형태소 분석기를 **같은 인터페이스**로 호출할 수 있게 묶어 준다
- 내부가 Java로 되어 있어서 설치 순서가 있다

| 순서 | 설치 | 메모 |
|---|---|---|
| 1 | Java 실행 환경 | [Oracle JDK](https://www.oracle.com/java/technologies/downloads/). Mac ARM은 ARM64 DMG, Intel은 x64 DMG. `JAVA_HOME`과 `Path`(`설치경로\bin`) 환경변수 설정 |
| 2 | JPype1 | 파이썬에서 Java를 호출하는 연동 패키지. `pip install JPype1` |
| 3 | KoNLPy | `pip install konlpy` |

### KoNLPy가 제공하는 형태소 분석기

| 분석기 | 개발 | 비고 |
|---|---|---|
| Okt (Open Korean Text) | 트위터 | 구어체·SNS 텍스트에 강하다 |
| Hannanum (한나눔) | KAIST Semantic Web Research Center | |
| Kkma (꼬꼬마) | 서울대 IDS 연구실 | 품사 태그가 세밀하다 |
| Komoran (코모란) | Shineware | 오픈소스와 유료 버전 |
| Mecab (메카브) | 일본어 분석기를 한국어용으로 수정 | 빠르지만 윈도우에서 설치가 안 된다 |

**공통 메소드**

| 메소드 | 하는 일 |
|---|---|
| `morphs(string)` | 형태소 단위 토큰화 |
| `nouns(string)` | 명사만 추출 |
| `pos(string)` | 품사 부착. 분석기마다 [품사 태그](https://konlpy-ko.readthedocs.io/ko/v0.5.2/morph/)가 다르다 |
| `tagset` | 그 분석기의 품사 태그 설명 |

윈도우에서 Java 경로를 못 찾을 때는 `jvmpath`로 `jvm.dll` 위치를 직접 지정한다.

```python
import os
from konlpy.tag import Okt

# 제공해주신 경로 내의 jvm.dll 파일 위치 지정
jvm_path = r"C:\Documents\SKN31_JY\jdk-21_windows-x64_bin\jdk-21.0.11\bin\server\jvm.dll"

# jvmpath를 직접 지정하여 Okt 객체 생성
okt = Okt(jvmpath=jvm_path)

# 형태소 분석기 테스트
print(okt.nouns("이제 자바 경로가 정상적으로 인식됩니다."))
```

```text
['이제', '자바', '경로', '정상', '인식']
```

> **보충** 위 셀은 윈도우 경로라 노트북의 실행 결과를 그대로 옮겼다. 맥·리눅스는 `JAVA_HOME`만 잡혀 있으면 `Okt()`로 바로 된다. 아래부터는 그렇게 실행했다.

```python
# 형태소 분석기 객체를 생성
from konlpy.tag import Okt
okt = Okt()
```

```python
# 형태소 기반 토큰화 - morphs()
txt = "나는 예쁜 자연어처리를 새 책으로 ★ 공부한다. 자연어처리는 NLP라고 한다."

result = okt.morphs(txt)

print(result)
```

```text
['나', '는', '예쁜', '자연어', '처리', '를', '새', '책', '으로', '★', '공부', '한다', '.', '자연어', '처리', '는', 'NLP', '라고', '한다', '.']
```

```python
# 명사만 추출
result_noun = okt.nouns(txt)
result_noun
```

```text
['나', '자연어', '처리', '새', '책', '공부', '자연어', '처리']
```

"새 책"의 "새"(관형사)가 명사로 잡혔다. 분석기마다 이런 차이가 있다.

```python
# 품사 부착 (Pos tagging)
result_pos = okt.pos(txt)
print(result_pos) # list[turple["토큰", "품사"]]""
```

```text
[('나', 'Noun'), ('는', 'Josa'), ('예쁜', 'Adjective'), ('자연어', 'Noun'), ('처리', 'Noun'), ('를', 'Josa'), ('새', 'Noun'), ('책', 'Noun'), ('으로', 'Josa'), ('★', 'Foreign'), ('공부', 'Noun'), ('한다', 'Verb'), ('.', 'Punctuation'), ('자연어', 'Noun'), ('처리', 'Noun'), ('는', 'Josa'), ('NLP', 'Alpha'), ('라고', 'Josa'), ('한다', 'Verb'), ('.', 'Punctuation')]
```

```python
# 특정 품사만 필터링
## 구두점, 조사를 뺀 나머지 품사만 추출
result = []
for token, tag in result_pos:
    if tag not in ["Josa","Punctuation"]:
        result.append((token, tag))

print(result)
```

```text
[('나', 'Noun'), ('예쁜', 'Adjective'), ('자연어', 'Noun'), ('처리', 'Noun'), ('새', 'Noun'), ('책', 'Noun'), ('★', 'Foreign'), ('공부', 'Noun'), ('한다', 'Verb'), ('자연어', 'Noun'), ('처리', 'Noun'), ('NLP', 'Alpha'), ('한다', 'Verb')]
```

```python
okt.tagset['Josa']
```

```text
'조사'
```

```python
from konlpy.tag import Kkma
kkma=Kkma()
list(kkma.tagset.items())[:12]
```

```text
[('EC', '연결 어미'), ('ECD', '의존적 연결 어미'), ('ECE', '대등 연결 어미'), ('ECS', '보조적 연결 어미'), ('EF', '종결 어미'), ('EFA', '청유형 종결 어미'), ('EFI', '감탄형 종결 어미'), ('EFN', '평서형 종결 어미'), ('EFO', '명령형 종결 어미'), ('EFQ', '의문형 종결 어미'), ('EFR', '존칭형 종결 어미'), ('EP', '선어말 어미')]
```

Kkma는 품사가 Okt보다 훨씬 세밀하다. 어미만 해도 연결·종결·평서형·의문형 등으로 나뉜다.

### 원형 복원과 정규화

```python
# 활용되어있는 것에 원형으로 복원 가능함 okt의 기능 => 표기를 통일할 수 있음 문장을 이해할 수 있다 즉 이해에서는 가능하나, but 생성은 이렇게 하면 안됌
result = okt.morphs(txt, stem=True)
print(result)
```

```text
['나', '는', '예쁘다', '자연어', '처리', '를', '새', '책', '으로', '★', '공부', '하다', '.', '자연어', '처리', '는', 'NLP', '라고', '하다', '.']
```

`stem=True`면 "예쁜"→"예쁘다", "한다"→"하다"처럼 **원형(어간 + 다)**으로 바꾼다. 지난 글의 "어간/표제어 추출"이 이것이다. 감성 분석 같은 이해 문제에서는 표기가 통일돼서 좋지만, 생성 문제에서는 원래 활용형을 잃어버린다.

```python
# 오타 및 (구어체=>문어체)를 (정규화 - normalization)
txt = "반갑습니당. ㅠㅠㅠ"
okt.morphs(txt, norm=True)
```

```text
['반갑습니다', '.', 'ㅠㅠㅠ']
```

```text
# stopwords는 따로 없지만 list 생성 후 for문으로 not in 해서 제거하면 됌
```

### Kiwi vs Okt

| | Kiwi | Okt (KoNLPy) |
|---|---|---|
| 구현 | C++ (파이썬 바인딩) | Java (JPype로 호출) |
| 설치 | `pip` 하나 | Java + JPype1 + konlpy |
| 품사 체계 | 세종 품사 (NNG, VV, EF ...) | 단순한 영문 태그 (Noun, Verb, Josa ...) |
| 어미 분리 | 어간·어미를 나눈다 (`공부`/`하`/`ᆸ니다`) | 활용형을 통째로 둔다 (`공부`/`한다`) |
| 부가 기능 | 띄어쓰기 교정, 문장 분리, 불용어 사전, 사용자 사전 | 원형 복원(`stem`), 정규화(`norm`) |

## WordCloud

**WordCloud**는 텍스트에서 단어의 등장 빈도를 시각적으로 표현한 그림이다.

- 자주 나오는 단어일수록 글자가 커진다
- 텍스트 전체의 주제와 핵심 키워드를 직관적으로 파악할 수 있어서, 탐색적 데이터 분석(EDA) 단계에서 자주 쓴다
- 설치: `pip install wordcloud`
- 입력 형식은 **딕셔너리 `{단어: 빈도수}`**다

```python
from collections import Counter
import matplotlib.pyplot as plt
from wordcloud import WordCloud
from konlpy.tag import Okt

# 1. 형태소 분석기 초기화
okt = Okt()

# 2. 예시 텍스트
text_data = """
데이터 분석과 인공지능 기술은 현대 사회에서 매우 중요한 역할을 하고 있습니다.
특히 자연어 처리 기술은 챗봇 개발, 감성 분석, 텍스트 마이닝 등 다양한 분야에서 활용됩니다.
파이썬은 데이터 분석을 위한 최고의 언어이며, KoNLPy를 활용하면 한글 형태소 분석을 쉽게 할 수 있습니다.
열심히 공부해서 멋진 데이터 기반의 프로그램과 서비스를 만들어 보고 싶습니다.
데이터를 다루는 일은 정말 흥미롭고 재미있습니다. 파이썬 데이터 분석 화이팅!
"""

# 3. 명사 추출 및 2글자 이상 필터링
nouns = okt.nouns(text_data)
words = [noun for noun in nouns if len(noun) >= 2]

# ★ 4. 빈도수 계산 후 딕셔너리(dict) 형태로 변환 ★
# Counter(words) 결과 예시: Counter({'데이터': 4, '분석': 4, '파이썬': 2, ...})
word_counts = Counter(words)
word_dict = dict(word_counts)  # 최종 dict 형태 변환

print("생성된 딕셔너리 데이터:\n", word_dict)
print("-" * 50)

# 5. 워드 클라우드 설정
font_path = FONT_PATH
wordcloud = WordCloud(
    font_path=font_path,
    background_color="white",
    width=800,
    height=600
)

# ★ 6. generate_from_frequencies() 함수에 딕셔너리 전달 ★
wordcloud = wordcloud.generate_from_frequencies(word_dict)

# 7. 출력
plt.figure(figsize=(10, 8))
plt.imshow(wordcloud, interpolation="bilinear")
plt.axis("off")
plt.show()
```

```text
생성된 딕셔너리 데이터:
 {'데이터': 5, '분석': 5, '인공': 1, '지능': 1, '기술': 2, '현대': 1, '사회': 1, '매우': 1, '역할': 1, '자연어': 1, '처리': 1, '챗봇': 1, '개발': 1, '감성': 1, '텍스트': 1, '이닝': 1, '분야': 1, '활용': 2, '파이썬': 2, '최고': 1, '언어': 1, '한글': 1, '형태소': 1, '공부': 1, '기반': 1, '프로그램': 1, '서비스': 1, '보고': 1, '정말': 1, '흥미': 1, '화이팅': 1}
--------------------------------------------------
```

![그래프 출력](/images/nlp/nlp-tokenization-1.png)

> **보충** 노트북에서는 `jvm_path`로 Okt를 만들고 `font_path="C:/Windows/Fonts/malgun.ttf"`(맑은 고딕)를 썼다. 여기서는 `Okt()`와 Noto Sans CJK 폰트 경로로 바꿔 실행했다. WordCloud는 기본 폰트에 한글이 없어서 `font_path`를 주지 않으면 글자가 네모로 나온다.

"텍스트 마이닝"의 "마이닝"이 "마" + "이닝"으로 잘려서 "이닝"이 명사로 들어갔다. 사전에 없는 외래어는 이렇게 쪼개지기 쉽다. Kiwi의 `add_user_word`처럼 사용자 사전으로 막을 수 있다.

### 대한민국 헌법으로 WordCloud 그리기

KoNLPy에는 연습용 말뭉치가 들어 있다. `kolaw`는 대한민국 헌법이다.

```python
# wordcloud에서 사용할 데이터(헌법)을 조회
from konlpy.corpus import kolaw

kolaw.fileids()
```

```text
['constitution.txt']
```

```python
with kolaw.open('constitution.txt') as f:
    txt = f.read()

print(txt[:200])
```

```text
대한민국헌법

유구한 역사와 전통에 빛나는 우리 대한국민은 3·1운동으로 건립된 대한민국임시정부의 법통과 불의에 항거한 4·19민주이념을 계승하고, 조국의 민주개혁과 평화적 통일의 사명에 입각하여 정의·인도와 동포애로써 민족의 단결을 공고히 하고, 모든 사회적 폐습과 불의를 타파하며, 자율과 조화를 바탕으로 자유민주적 기본질서를 더욱 확고히 하여 정치·경제
```

```python
#wordcloud 입력 형식 - Dictionary {단어: 빈도수}
#{"국민":50, "국가":27}

# 토큰화 nouns 명사만 추출
from konlpy.tag import Okt
okt = Okt()
nouns = okt.nouns(txt)
print(len(nouns))
```

```text
3882
```

빈도는 `collections.Counter`로 센다.

```python
# 1. 말뭉치(텍스트) 가져오기
from konlpy.corpus import kolaw
import pprint
with kolaw.open('constitution.txt') as f:
    txt = f.read()

# 2. 토큰화 nouns 명사만 추출
from konlpy.tag import Okt
okt = Okt()

nouns = okt.nouns(txt)  # 결과: ['대한민국', '헌법', '유구한', '역사', ...]

# 3. 빈도수 계산 및 전처리 (글자 수 제한 등)
from collections import Counter
# 2글자 이상인 명사만 추출하여 빈도수 계산
words = [noun for noun in nouns if len(noun) >= 2]
word_counts = Counter(words)

# 4. wordcloud 입력 형식 - Dictionary {단어: 빈도수}
word_dict = dict(word_counts)
# 결과 예시: {"국민": 69, "헌법": 55, "국회": 55, ...}

# 5. 시각화 (WordCloud)
from wordcloud import WordCloud
import matplotlib.pyplot as plt

wordcloud = WordCloud(font_path=FONT_PATH).generate_from_frequencies(word_dict)

# 6. 화면 출력
top_words = word_counts.most_common(20)

print("=== 대한민국 헌법 고빈도 단어 TOP 20 ===")
pprint.pprint(top_words, compact=True)
print("-" * 50)
plt.figure(figsize=(12, 9))
plt.imshow(wordcloud, interpolation="bilinear")
plt.axis("off")
plt.show()
```

```text
=== 대한민국 헌법 고빈도 단어 TOP 20 ===
[('법률', 127), ('대통령', 83), ('국가', 73), ('국회', 68), ('국민', 61), ('헌법', 53),
 ('모든', 37), ('기타', 26), ('사항', 23), ('권리', 21), ('의원', 21), ('자유', 20),
 ('정부', 20), ('선거', 20), ('임명', 20), ('직무', 19), ('국무총리', 19), ('경제', 18),
 ('의무', 18), ('조직', 18)]
--------------------------------------------------
```

![그래프 출력](/images/nlp/nlp-tokenization-2.png)

"모든", "기타", "사항" 같은 단어가 상위권에 있다. 헌법의 주제와는 상관없이 법조문 형식 때문에 자주 나오는 말이다. 이런 단어를 불용어로 빼면 핵심어가 더 잘 보인다.

### WordCloud 옵션

```python
wc = WordCloud(
    font_path=FONT_PATH,
    max_words=200, # wordcloud에 나올 최대 단어수. (순서: 빈도수)
    min_font_size=10, # 빈도수가 제일 작은 단어의 폰트크기
    relative_scaling=0.5, #빈도수에 따라 상대적으로 폰트의 크기를 기우는데 사용하는 조절 값
                           # 0 ~ 1 사이 실수
                           # 0: 차이를 반영하지 않는다 
                           # 1: 크게 반영한다(적은 것은 더욱더 작게, 많은 것은 더 크게) 
    width=500, # figure사이즈
    height=400,
    background_color='white', #디폴트 black color이름이나 hex code(#ffff)
    prefer_horizontal=0.5 # 가로쓰기 비율, 가로쓰기 50%, 세로쓰기 50%

)
```

```python
# wordcould 생성

top_words_dict = dict(top_words) 

# 2. 딕셔너리 데이터를 워드 클라우드에 투입
wc_img = wc.generate_from_frequencies(top_words_dict)  # <- 변수명 수정!

# 3. 이미지 파일로 저장
wc_img.to_file("constitution_wc.png")

# 보충: 저장한 이미지 확인
plt.figure(figsize=(8, 6))
plt.imshow(wc_img, interpolation="bilinear")
plt.axis("off")
plt.show()
```

![그래프 출력](/images/nlp/nlp-tokenization-3.png)

`to_file()`로 PNG 파일로 저장할 수 있다. 상위 20개 단어만 넣고 세로쓰기를 50%로 줬다.

> **보충** 노트북에서는 맑은 고딕 폰트 경로를 찾으려고 `fm.fontManager.ttflist`에서 "malgun"이 들어간 파일을 검색했다. 같은 방법으로 맥에서는 "AppleGothic", 리눅스에서는 "Noto"나 "Nanum"을 검색해 경로를 찾으면 된다.

## 정리

- 토큰화는 텍스트를 모델이 다룰 기본 단위로 나누는 것이다. 한국어는 교착어라 어절 단위로 나누면 사전이 폭발하므로 **형태소 단위**로 나눈다
- 서브워드는 자주 붙어 나오는 문자열을 하나의 토큰으로 묶는 방식으로, OOV 문제를 풀어서 LLM의 표준이 됐다
- **Kiwi**는 pip 하나로 설치되고 띄어쓰기 교정, 문장 분리, 사용자 사전, 불용어 사전까지 제공한다. 불용어는 (형태, 품사) 쌍으로 다룬다
- **KoNLPy**는 여러 분석기를 같은 인터페이스(`morphs`, `nouns`, `pos`)로 쓰게 해 준다. Okt의 `stem=True`는 원형 복원, `norm=True`는 구어체 정규화다
- **WordCloud**는 `{단어: 빈도}` 딕셔너리를 받아 그린다. 한글은 `font_path`가 필수이고, 의미 없는 고빈도어는 불용어로 빼야 핵심어가 보인다
