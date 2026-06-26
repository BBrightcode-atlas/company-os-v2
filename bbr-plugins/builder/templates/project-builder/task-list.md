# 전체 Task 목록(Full Task List) - {{productName}}

이 문서는 Product Builder가 생성한 BuildPlan을 사람이 검토할 수 있도록 펼친 전체 작업 목록이다. 실제 실행 기준은 생성된 Paperclip 이슈와 그 차단 관계다.

## 1. 요약(Summary)

| 항목(Item) | 값(Value) |
| --- | --- |
| 제품명(Product Name) | {{productName}} |
| 총 기능 수(Feature Count) | {{featureCount}} |
| 실행 대상 작업(Executable Tasks) | {{executableTaskCount}} |
| REUSE 작업(Reuse Tasks) | {{reuseTaskCount}} |
| N/A 작업(N/A Tasks) | {{naTaskCount}} |
| 통합 QA(Integration QA) | {{integrationQaStatus}} |
| Release | {{releaseStatus}} |

## 2. 공통 작업(Shared Work)

| 작업(Task) | 판정(Decision) | 담당(Owner) | 차단 관계(Blockers) | 산출물(Output) |
| --- | --- | --- | --- | --- |
| {{sharedTaskTitle}} | {{decision}} | {{owner}} | {{blockers}} | {{output}} |

## 3. 기능별 작업(Feature Tasks)

### {{featureName}}

| 단계(Stage) | 작업(Task) | 판정(Decision) | 담당(Owner) | 차단 관계(Blockers) | 완료 기준(Done Criteria) |
| --- | --- | --- | --- | --- | --- |
| BE(Backend) | {{taskTitle}} | {{decision}} | {{owner}} | {{blockers}} | {{doneCriteria}} |
| BE QA(Backend QA) | {{taskTitle}} | {{decision}} | {{owner}} | {{blockers}} | {{doneCriteria}} |
| FE(Frontend) | {{taskTitle}} | {{decision}} | {{owner}} | {{blockers}} | {{doneCriteria}} |
| FE QA(Frontend QA) | {{taskTitle}} | {{decision}} | {{owner}} | {{blockers}} | {{doneCriteria}} |
| 전체 QA(Full QA) | {{taskTitle}} | {{decision}} | {{owner}} | {{blockers}} | {{doneCriteria}} |

## 4. 통합 작업(Integration Tasks)

| 작업(Task) | 담당(Owner) | 시작 조건(Entry Condition) | 완료 기준(Done Criteria) |
| --- | --- | --- | --- |
| 통합 QA(Integration QA) | QA Agent | 모든 기능의 전체 QA 완료 | 핵심 플로우, 회귀, 운영 준비 검증 통과 |
| 통합 Release | Platform Agent | 통합 QA 완료 | main merge, release tag, 배포 확인 |

## 5. 실행 제외 작업(Non-executable Records)

| 작업(Task) | 판정(Decision) | 사유(Reason) | 근거(Evidence) |
| --- | --- | --- | --- |
| {{taskTitle}} | REUSE | {{reason}} | {{evidence}} |
| {{taskTitle}} | N/A | {{reason}} | {{evidence}} |
