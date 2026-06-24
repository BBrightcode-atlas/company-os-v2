# 자료 정리본(Source Material Markdown) - {{projectTitle}}

이 문서는 등록 자료(Source Material)를 후속 산출물 생성 전에 읽기 쉬운 Markdown 기준본으로 정리한 것이다.
요약, 축소, 임의 해석을 하지 않고 등록된 추출 본문 전체를 자료별 경계와 메타데이터와 함께 보존한다.

## 정리 기준(Normalization Rules)

- 등록된 source body 전체를 생략 없이 포함한다.
- PDF/문서/URL/OCR 등 원본 포맷 차이는 자료별 메타데이터로 남긴다.
- 자동 추출 실패, 접근 제한, 빈 본문은 본문 또는 메타데이터에 그대로 드러나게 둔다.
- PRD, 기능 정의서, API 정의서, 화면정의서는 이 정리본을 근거 자료로 사용한다.

## 자료 목록(Source Index)

| Code | Title | Type | Format | Original Ref | Characters |
| --- | --- | --- | --- | --- | --- |
| {{sourceCode}} | {{sourceTitle}} | {{sourceType}} | {{sourceFormat}} | {{originalRef}} | {{characters}} |

## {{sourceCode}}. {{sourceTitle}}

| 항목(Item) | 내용(Description) |
| --- | --- |
| Source ID | {{sourceId}} |
| 자료 유형(Source Type) | {{sourceType}} |
| 추출 포맷(Extracted Format) | {{sourceFormat}} |
| 원본 파일명(File Name) | {{fileName}} |
| 원본 URL(URL) | {{url}} |
| 등록 시각(Created At) | {{createdAt}} |

### 추출 본문 전체(Full Extracted Body)

```text
{{fullBody}}
```
