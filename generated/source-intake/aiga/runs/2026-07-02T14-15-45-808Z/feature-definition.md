# 기능정의서 - Aiga

## FEA-001 회원 등급 및 권한 정책

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 3단계 회원 권한 모델 | 비회원, 일반 회원, 의사 인증 회원을 기준으로 열람, 작성, 수정, 삭제, 공감, 댓글, 리뷰, 신고, 병원 방문 인증 가능 여부를 서버 정책으로 판정한다. |  |
| server | 의사 인증 회원 예외 권한 | 의사 인증 회원은 일반 회원 권한을 유지하되 본인 프로필 리뷰 작성 제한, 의사 뱃지 표시, 실명 작성, 본인 프로필 관리 진입점 같은 예외 정책을 적용한다. |  |
| site | 등급별 액션 노출 제어 | 사용자 사이트의 버튼, 메뉴, CTA를 회원 등급에 맞게 활성, 비활성, 숨김 처리하고 비회원에게는 가입 후 가능한 기능을 노출해 전환을 유도한다. |  |
| site | 권한 차이 안내 | 마이페이지, 프로필, 커뮤니티, 리뷰 진입점에서 비회원, 일반 회원, 의사 인증 회원의 기능 차이를 일관된 문구와 상태로 보여준다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site | `packages/core/auth`, `packages/drizzle/src/schema/core/auth.ts`, `packages/drizzle/src/schema/core/profiles.ts`, `packages/drizzle/src/schema/core/role-permission/user-roles.ts` | 사용자 세션, 프로필, 권한 가드, role/permission 스키마 패턴 | 비회원/일반/의사 인증 3단계 등급, 콘텐츠 액션별 권한, 의사 인증 예외 정책 |  |

## FEA-002 인증, 로그인, 세션, SNS 계정 통합

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | SNS 로그인 계정 통합 | 카카오와 네이버 인증 식별자를 저장하고 동일 이메일 또는 동일 식별자로 판단되는 계정을 하나의 회원 계정으로 병합해 세션, 권한, 닉네임, 활동, 저장 목록을 서버 기준으로 일치시킨다. |  |
| server | 세션 및 탈퇴 후 재가입 제한 | 세션 만료와 복원을 처리하고 탈퇴 계정 식별자는 탈퇴 시점부터 24시간 동안 재가입을 차단한다. |  |
| site | 로그인 및 최초 가입 플로우 | 카카오, 네이버 로그인, 필수 약관 동의, 가입 완료 화면, 홈 또는 원래 액션 복귀까지 사용자 사이트 공통 로그인 플로우를 구현한다. |  |
| site | 로그인 실패 및 세션 만료 처리 | OAuth 실패, 서버 장애, 사용자 취소, 401 세션 만료를 구분해 토스트, 재시도, 로그인 화면 이동을 처리한다. |  |
| site | pendingAction 자동 수행 | 비회원이 즐겨찾기, 공감, 댓글, 리뷰 작성 같은 회원 전용 기능을 시도한 뒤 로그인하면 저장된 pendingAction으로 원래 액션을 자동 재개한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | server, site | `apps/site/src/modules/auth`, `packages/core/auth`, `apps/admin/src/features/auth` | auth modal, session helper, auth headers, 기본 로그인/가입 화면 패턴 | 카카오/네이버 로그인, SNS 계정 통합, pendingAction 복귀, 탈퇴 후 재가입 제한 |  |

## FEA-003 비회원 제한, 한도, 로그인 유도

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 비회원 사용량 한도 정책 | 비회원의 검색, 의사 프로필 조회, 게시글 상세 열람 한도를 일 단위로 관리하고 동일 검색어 재입력, 필터 변경, 즉시 재로딩 같은 중복 차감 예외를 처리한다. |  |
| server | 게시글 상세 열람 차감 | 커뮤니티 목록 노출은 차감하지 않고 게시글 상세 진입 시점에만 차감하며, 같은 세션의 즉시 재로딩은 중복 차감하지 않는다. |  |
| site | LoginRequiredToast | 비회원이 권한 없는 기능을 누르면 중앙 카드형 로그인 필요 모달을 띄우고 진입 기능명에 맞는 안내 문구와 카카오, 네이버 CTA를 표시한다. |  |
| site | GuestLimitModal과 한도 배너 | 검색, 프로필 조회, 게시글 열람 한도가 소진되면 한도 유형별 모달을 표시하고 잔여 횟수가 낮을 때는 경고 배너를 노출한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site | `apps/site/src/components/gated-cta.tsx`, `packages/core/auth/guards`, `packages/core/rate-limit` | 인증 필요 CTA, auth guard, rate-limit 적용 패턴 | 비회원 일일 검색/프로필/게시글 열람 카운터와 한도 초과 모달 문구 |  |

## FEA-004 커뮤니티 피드, 글쓰기, 상세, 임시저장

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 커뮤니티 게시글 모델 | 질환, 진료과, 제목, 본문, 이미지, 작성자, 인증 상태, 공감 수, 댓글 수, 수정 이력, soft delete 상태를 저장하고 목록과 상세 조회 값을 제공한다. |  |
| server | 커뮤니티 필터 및 정렬 | 질환별, 진료과별, 작성자별, 최신순, 인기순 필터를 서버 쿼리로 처리하고 총 건수와 커서 기반 페이지네이션 데이터를 반환한다. |  |
| site | 커뮤니티 피드 화면 | 헤더, 카테고리 필터, 질환 검색 칩, 배너, 총 건수, 정렬, 유저 필터, 게시글 카드 목록, 빈 상태, 글쓰기 CTA를 구현한다. |  |
| site | 게시글 상세 화면 | 커뮤니티 피드, 홈 추천글, 통합검색 결과에서 게시글 상세를 열고 본문, 이미지, 공감, 댓글, 더보기 메뉴, 신고, 수정, 삭제 동선을 제공한다. |  |
| site | 글쓰기와 수정 화면 | 회원 글쓰기와 수정 화면에서 질환명, 제목 50자 제한, 본문, 이미지 최대 10장, 병원 진료 인증 옵션, 자동저장 상태, 게시와 수정 완료 동작을 처리한다. |  |
| site | 로컬 임시저장 | 새 글과 수정 글 초안을 분리 저장하고 3초 입력 정지 후 자동 저장, 이어쓰기 배너, 복원 다이얼로그, 손상 초안 자동 삭제를 처리한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | server, site | `packages/features/community`, `apps/app/src/features/community`, `packages/drizzle/src/schema/features/community/index.ts` | 게시글 CRUD, 목록/상세, 정렬, 이미지 첨부, community UI/API 패턴 | 질환/진료과 필터, 병원 인증 옵션, 의사 인증 표시, Aiga 글쓰기 정책, site 이식 |  |

## FEA-005 댓글, 대댓글, 공감 인터랙션

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 댓글 및 대댓글 모델 | 게시글과 리뷰에 연결되는 댓글, 대댓글, 공감 수, 작성자 등급, 수정 이력, 삭제 placeholder 상태를 저장하고 1뎁스 대댓글 구조를 유지한다. |  |
| server | 댓글 수정 삭제 정책 | 댓글과 대댓글의 수정, 삭제 가능 기간을 운영 정책 설정값으로 판정하고 대댓글이 남은 댓글은 "삭제된 댓글입니다" placeholder로 유지한다. |  |
| site | 댓글 작성과 답글 UI | 회원에게 댓글 입력, 답글 입력, 하트 공감, 들여쓰기, 상대 시간, 수정됨 표시를 제공하고 비회원에게는 입력 비활성 및 로그인 유도 UX를 제공한다. |  |
| site | 삭제 댓글 렌더링 | 삭제된 댓글의 하위 대댓글 존재 여부에 따라 placeholder 유지 또는 노드 제거를 결정하고 커뮤니티와 리뷰 댓글에서 동일하게 렌더링한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | server, site | `packages/features/comment`, `packages/widgets/src/comment`, `packages/features/reaction`, `packages/widgets/src/reaction` | 댓글/대댓글 API, comment widget, reaction button/count 패턴 | 리뷰 댓글 공통화, 의사 뱃지 작성자 표시, 삭제 placeholder와 기간 정책 |  |

## FEA-006 의사 리뷰와 후기 작성

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 리뷰 권한과 평점 산출 | 리뷰 작성, 수정, 삭제, 본인 프로필 리뷰 금지, 타 의사 프로필 리뷰 허용, 별점 변경 시 의사 평점 재계산을 서버 정책으로 처리한다. |  |
| server | 리뷰 데이터 모델 | 별점 1에서 5점, 본문 최소 50자, 이미지 최대 10장, 병원 방문 인증, 댓글, 대댓글, 신고, soft delete, 원본 보관 상태를 저장한다. |  |
| site | 리뷰 작성 화면 | 의사 프로필 위 중첩 화면에서 별점, 본문, 이미지, 병원 진료 인증 옵션, 저장 버튼 활성 조건, 닫기 자동저장, 재진입 복원을 제공한다. |  |
| site | 리뷰 카드와 이미지 뷰어 | 의사 프로필, 마이페이지 후기 탭, 후기 관리 화면에서 리뷰 카드, 이미지 그리드, 이미지 확대 보기, 빈 상태, 후기 삭제 확인을 일관되게 표시한다. |  |
| site | 리뷰 작성 안내 정합성 | 리뷰 본문 작성 시 병원 진료 인증은 선택 사항으로 표시하고 데모 문구가 필수처럼 보이지 않도록 커뮤니티 글쓰기와 동일한 톤으로 통일한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site | `packages/drizzle/src/schema/core/reviews.ts`, `packages/widgets/src/comment` | review schema 일부, 이미지/댓글 렌더링 패턴 | 의사 프로필 후기 모델, 별점 산출, 병원 방문 인증, 본인 프로필 리뷰 제한 |  |

## FEA-007 병원 방문 인증과 증빙 뱃지

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 외부 OCR 증빙 판독 연동 | 게시글과 리뷰 작성 또는 수정 시 영수증 이미지를 받아 외부 OCR API로 병원명, 진료일, 금액을 판독하고 성공 시 인증 뱃지를 부여한다. |  |
| server | 인증 상태 변경 규칙 | 게시글 질환명 또는 병원 구조화 값 변경, 재인증 시도, 게시글 또는 리뷰 삭제에 따라 인증 초기화, 재인증, 인증 데이터 삭제를 처리한다. |  |
| server | OCR 실패 fallback 상태 | 외부 OCR 판독 실패, 타임아웃, 지원 불가 파일을 구분하고 인증 없이 계속 작성 가능한 상태와 관리자 검토 대상 상태를 분리한다. |  |
| admin | 병원 진료 인증 검토 | OCR 실패 또는 수동 검토 대상 증빙을 운영자가 확인하고 승인, 반려, 재업로드 요청 상태를 관리한다. |  |
| site | 증빙 업로드와 실패 안내 | 글쓰기와 리뷰 작성 화면에서 선택형 영수증 업로드 영역을 제공하고 OCR 성공 시 뱃지, 실패 시 재업로드 또는 인증 없이 계속 작성 동선을 제공한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| new-implementation | server, admin, site | `packages/features/identity-verification`, `packages/core/storage`, `apps/admin/src/features/identity-verification` | feature-level hard copy 없음; 파일 업로드, 검증 상태, admin review 패턴만 참고 | 영수증/처방전 증빙, 외부 OCR API 연동, 병원 진료 인증 뱃지, 수동 검토 fallback |  |

## FEA-008 의사 인증 플로우와 면허번호 검증

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 의사 프로필과 계정 연결 | AIGA 의사 프로필 DB와 일반 회원 계정을 분리 관리하고 인증 절차 성공 시 특정 계정과 의사 프로필을 1대1로 연결한다. |  |
| server | 본인인증 채널 연동 | PASS, 카카오, 네이버 본인확인 결과를 받아 인증 세션을 생성하고 Step 2 면허번호 검증 요청과 같은 사용자 주체인지 확인한다. |  |
| server | 면허번호 검증 정책 | 베타 기준으로 면허번호 숫자 4자리 이상 포맷을 검증해 자동 승인하되, 보건복지부 조회나 OCR 검증 요구가 확정되면 외부 검증 단계로 교체 가능하게 계약을 분리한다. |  |
| server | 재시도 한도와 미승인 이력 | 계정 단위와 IP 단위 일일 5회 한도를 자정 기준으로 리셋하고 한도 초과 시 계정, IP, 시도 시간, 시도 횟수, 면허번호 해시를 90일 보관한다. |  |
| site | VerificationFlow | Step 1 본인인증 채널 선택과 약관 동의, Step 2 면허번호 입력과 약관 동의, 인증 완료 화면, 오류 인라인 메시지, 뒤로가기와 닫기를 구현한다. |  |
| site | 인증 버튼 노출 매트릭스 | 일반회원, 비회원, 의사 인증 회원과 대상 의사 인증 상태 조합에 따라 의료진 인증 버튼을 active, disabled, 미노출 상태로 표시한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | server, site | `packages/features/identity-verification`, `apps/kcb-identity-server`, `apps/admin/src/features/identity-verification` | 본인확인 요청/결과 처리, 검증 상태 관리 패턴 | 의료 면허번호 입력, 포맷 검증 자동 승인, 재시도 한도, 의사 프로필 1:1 연결 |  |

## FEA-009 의사 인증 표시와 실명 전환

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 작성자 표시 일괄 갱신 | 의사 인증 승인 트랜잭션에서 해당 계정의 과거 게시글, 댓글, 대댓글, 리뷰 작성자 표시를 닉네임에서 실명과 의사 인증 뱃지로 일괄 전환한다. |  |
| server | 인증 후 닉네임 잠금 | 의사 인증 회원은 닉네임 수정 기능을 잠그고 실명, 면허번호, 소속 병원 같은 인증 정보는 직접 수정하지 못하도록 정책을 적용한다. |  |
| site | 의사 콘텐츠 디자인 토큰 | 게시글 카드, 댓글 말풍선, 리뷰 답글, 아바타, 의사 인증 뱃지에 동일한 doctor surface 토큰을 적용해 모든 화면에서 인증 의사 콘텐츠를 일관되게 강조한다. |  |
| site | 탭별 의사 인증 표시 | 홈 추천글, 명의 찾기 결과, 커뮤니티 목록과 상세, 마이페이지, 리뷰 영역에서 의사 인증 뱃지와 실명 표시 규칙을 적용한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site | `packages/drizzle/src/schema/core/profiles.ts`, `packages/features/community`, `packages/features/comment`, `packages/drizzle/src/schema/core/reviews.ts` | 프로필/작성자 필드, 게시글/댓글/리뷰 author join 패턴 | 인증 승인 후 실명 전환, 과거 작성물 일괄 갱신, 의사 인증 뱃지 디자인 토큰 |  |

## FEA-010 의사 프로필, 명의 찾기, 정보 수정 요청

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 의사 검색 결과 우선순위 | 명의 찾기에서 동일 이름 의사가 여러 명이면 AIGA 인증 의사를 우선 노출하고 본인 프로필에는 본인 마커와 자기 자신 저장, 리뷰 작성 차단 상태를 반환한다. |  |
| server | 의사 프로필 운영 데이터 | 의사 프로필의 경력, 학력, 논문, 전문 분야, 소개, 진료 시간, 예약 URL, 노출 여부, 평점과 후기 수를 조회하고 편집 가능 영역과 불가 영역을 구분한다. |  |
| site | DoctorProfile 상세 | 홈, 명의 찾기, 커뮤니티, 외부 AI 추천 결과에서 재사용하는 의사 프로필 상세를 제공하고 리뷰, 소셜 리뷰, 즐겨찾기, 리뷰쓰기, 이미지, 특수 상태를 표시한다. |  |
| site | 본인 프로필 수정 진입 | 인증 의사가 자기 프로필을 열면 내 프로필 수정 버튼과 인증 완료 상태를 표시하고 프로필 편집 또는 정보 수정 요청 화면으로 이동한다. |  |
| admin | 의사 정보 수정 요청 처리 | 사용자가 제출한 의사 정보 수정 요청을 검토하고 편집 가능 영역은 의사 관리 편집 모달로 처리하며 식별 정보 변경 요청은 개발팀 전달 후 완료 또는 반려 처리한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site, admin | `packages/drizzle/src/schema/core/profiles.ts`, `packages/drizzle/src/schema/core/reviews.ts`, `apps/admin/src/features/profile`, `packages/features/_common/service/user-profile.service.ts` | 프로필 조회/편집 폼, profile service, 리뷰 집계 패턴 | 의사 마스터, 병원/진료과/경력/논문 필드, 명의 찾기 검색, 정보 수정 요청 처리 |  |

## FEA-011 통합 검색, 명의 찾기 검색, 입력 보안

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 검색 API 입력 검증 | 검색어 trim, 50자 제한, 허용 문자 검증, SQL Injection 방어, 공백 검색 차단, 파라미터 바인딩을 적용하고 초과 입력은 400 또는 검증 오류로 처리한다. |  |
| server | 검색 결과 페이지네이션 | 명의, 병원, 커뮤니티 탭별 결과를 커서 기반으로 20개 단위 로드하고 최신 요청만 반영되도록 이전 요청 취소 또는 무시 정책을 지원한다. |  |
| server | 명의 찾기 예외 정책 | 검색어 변경 기준 한도 차감, 카테고리 필터 차감 제외, GPS 타임아웃 후 기본 좌표 폴백, 0건 문구 분기, 정렬 변경 기준을 서버 응답 정책으로 제공한다. |  |
| site | GlobalSearch | 홈, 명의 찾기, 커뮤니티 우상단 검색 진입점에서 통합 검색 화면을 열고 섹션별 결과, 더 보기, 빈 상태, 탭별 스크롤 보존을 구현한다. |  |
| site | 명의 찾기 결과 탐색 | 검색 결과 목록, 카테고리 필터, 정렬, 무한 스크롤, 프로필 상세 연결, 본인 프로필 차단 상태를 사용자 사이트에서 처리한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site | `packages/features/community`, `apps/app/src/features/community/hooks`, `packages/api-client`, `packages/core/error` | 목록 검색, 정렬, 커서/페이지네이션, API client/error 패턴 | 통합 검색 섹션, 의사/병원/커뮤니티 탭, GPS fallback, 비회원 한도 차감 연계 |  |

## FEA-012 마이페이지, 내 활동, 고객지원, 회원탈퇴

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 마이페이지 데이터 집계 | 프로필, 이메일, 닉네임, 내 게시글, 내 댓글, 내 후기, 저장한 의료진, 고객지원 메뉴, 회원탈퇴 가능 상태를 회원 등급에 맞게 집계한다. |  |
| server | 닉네임 유효성 및 중복 검사 | 닉네임 2자에서 10자, 한글, 영문, 숫자, 밑줄만 허용하고 중복 여부를 서버에서 검사해 저장 가능 상태를 판단한다. |  |
| server | 회원탈퇴 처리 | 탈퇴 요청 시 계정 식별 정보, 세션, 저장 목록을 정리하고 작성 콘텐츠 작성자는 탈퇴 사용자로 마스킹하며 24시간 재가입 제한을 적용한다. |  |
| site | 마이페이지 프로필과 내 활동 | 비회원 로그인 유도, 회원 프로필 요약, 닉네임 수정, 게시글, 댓글, 후기, 저장 탭의 카운트와 최신순 목록, 상세 연결, 빈 상태를 표시한다. |  |
| site | 고객지원과 약관 화면 | 공지사항 목록, 공지 상세, 의견 보내기, 이용약관, 개인정보처리방침 상세 화면을 제공하고 표 가로 스크롤과 최신순 목록을 처리한다. |  |
| site | 회원탈퇴 화면 | 체크 필수 안내 2개, 탈퇴 버튼 활성 조건, 탈퇴 완료 팝업, 비로그인 상태 전환, 탈퇴 후 복구 불가와 24시간 재가입 제한 안내를 구현한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site | `packages/drizzle/src/schema/core/profiles.ts`, `packages/drizzle/src/schema/core/user-preferences.ts`, `packages/drizzle/src/schema/core/terms.ts`, `packages/features/feedback` | 프로필/환경설정/약관 데이터 구조와 feedback 접수 패턴 | 내 게시글/댓글/후기/저장 의료진 집계, 회원탈퇴 마스킹, Aiga 고객지원 메뉴 |  |

## FEA-013 공통 UI 상태, 네비게이션, 중복 액션 방지

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 공통 API 오류 계약 | 401, 403, 404, 409, 429, 5xx 오류를 일관된 코드와 메시지로 반환하고 이미 삭제된 데이터, 충돌, 요청 초과, 서버 오류를 구분한다. |  |
| server | 멱등 상태 변경 | 게시, 삭제, 신고, 인증 요청, 탈퇴 같은 상태 변경 요청이 중복 도달해도 한 번만 반영되도록 idempotency 또는 DB 제약을 적용한다. |  |
| site | loading, empty, error 상태 | 모든 조회와 저장 화면에서 loading, success, empty, error 상태를 정의하고 스켈레톤, 빈 상태 CTA, 재시도 버튼, 3회 초과 고객센터 링크를 제공한다. |  |
| site | 반응형 네비게이션과 뒤로가기 | 홈, AIGA, 명의 찾기, 커뮤니티, MY 주요 진입점을 반응형 네비게이션으로 제공하고 재진입, 스크롤 유지, 브라우저 뒤로가기 우선순위를 구현한다. |  |
| site | 중복 제출 방지 | 통신 중 버튼 잠금, 토글 액션 응답 전 재탭 무시, 성공 후 화면 이동, 이미 처리됨 안내를 모든 주요 액션에 적용한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | server, site | `packages/ui`, `packages/core/error`, `packages/core/i18n`, `apps/site/src/components/site-header.tsx`, `apps/site/src/lib/api.ts` | 공통 UI 컴포넌트, 사용자 오류 메시지, API client, site shell/header 패턴 | Aiga 반응형 네비게이션, 화면별 empty/error 문구, 중복 제출 정책 적용 범위 |  |

## FEA-014 신고, 블라인드, 운영 처리

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 신고 접수 정책 | 회원만 타인의 게시글, 댓글, 후기, 후기 댓글을 신고할 수 있게 하고 본인 콘텐츠 신고와 비회원 신고 항목을 차단한다. |  |
| server | 신고 사유와 상태 모델 | 광고, 욕설, 허위 정보, 개인정보, 중복, 도배, 의료법 위반, 기타 같은 사유와 대기, 완료, 반려, 삭제, 숨김 상태를 저장한다. |  |
| site | ReportModal과 신고 완료 UX | 더보기 메뉴에서 신고 모달을 열고 대상별 신고 사유를 선택해 접수한 뒤 완료 토스트를 표시하며 처리 결과 무통보 정책을 따른다. |  |
| admin | 신고 처리 큐 | 신고 처리 화면에서 대기중, 완료 탭, 사유 필터, 행 펼침, 작성자와 신고자 정보, 인증 여부, 첨부 이미지를 확인하고 반려 또는 삭제 처리한다. |  |
| admin | 커뮤니티와 후기 선제 관리 | 커뮤니티 관리와 의사 후기 관리에서 신고 전 명백한 위반 콘텐츠를 삭제, 복원, 신고 누적 추적하고 감사 로그를 보존한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | server, site, admin | `apps/admin/src/features/community/routes/mod-queue-page.tsx`, `apps/admin/src/features/community/hooks/use-moderation.ts`, `packages/features/community`, `packages/drizzle/src/schema/features/community/index.ts` | moderation queue, report/admin list, mod logs, community 관리 패턴 | Aiga 신고 사유, 의료법 위반 처리, 리뷰/댓글 통합 신고, 블라인드 정책 |  |

## FEA-015 콘텐츠 안전 자동 차단

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 금칙어 자동 차단 | 게시글, 리뷰, 댓글, 대댓글 제출 시 서버 검증을 수행하고 매칭 시 게시 거부, DB 미저장, 카테고리별 안내 문구를 반환한다. |  |
| server | 화이트리스트와 조합 매칭 | 의료 용어 오탐을 줄이는 화이트리스트를 금칙어보다 우선 적용하고 의사 리뷰 명예훼손은 호칭 사전과 비방어 사전의 문장 내 거리 조건으로 차단한다. |  |
| server | 외부 이미지 안전 API 연동 | 게시글과 리뷰 업로드 이미지를 외부 이미지 모더레이션 API로 검사하고 유해 레이블이 임계값 이상이면 해당 이미지를 저장하지 않고 게시를 차단한다. |  |
| site | 차단 안내와 재작성 UX | 금칙어, 조합 매칭, 이미지 차단 사유별 안내 문구를 사용자에게 노출하고 안전한 재작성 또는 이미지 재선택 동선을 제공한다. |  |
| admin | 차단 로그와 운영 데이터 | BLOCK 로그, 카테고리별 차단 건수, 화이트리스트 통과 건수, 이미지 API 호출량과 비용, 반복 차단 사용자를 운영 데이터로 확인할 수 있게 한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | server, site, admin | `apps/app/src/features/community/hooks/useProfanityCheck.ts`, `apps/admin/src/features/community/hooks/use-moderation.ts`, `packages/core/integrations/server`, `packages/core/storage` | 금칙어 검사 hook 패턴, moderation/admin 로그, 외부 integration registry, storage 패턴 | AIGA 키워드 명세, 화이트리스트/조합 매칭, 외부 이미지 안전 API, 차단 비용/로그 지표 |  |

## FEA-016 홈 운영과 사용자 홈 노출

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| admin | 홈 상단 배너 관리 | 배너 이미지, 제목, 노출 기간, 링크 URL, 노출 상태, 드래그 순서, 모바일 미리보기, 등록, 수정, 삭제를 관리한다. |  |
| admin | 주요 질환 인기 명의 운영 | 질환 마스터 검색, 질환 추가와 제거, 질환별 의사 추가와 제거, 인증 의사 배지, 수동 또는 자동 정렬, 평점과 후기 수 기반 자동 정렬을 관리한다. |  |
| admin | 추천 게시글 운영 | 홈에 노출할 커뮤니티 게시글을 검색, 필터, 다중 선택, 순서 변경, 제거하고 신고 0건, 좋아요, 최신성, 인증 사용자 기준을 운영한다. |  |
| server | 홈 노출 데이터 API | 노출 중 배너, 주요 질환 인기 명의, 추천 게시글을 노출 기간, 정렬 모드, 콘텐츠 상태, 신고 상태 기준으로 필터링해 사용자 사이트에 제공한다. |  |
| site | 홈 사용자 노출 | 사용자 홈에서 노출 중 배너, 주요 질환 인기 명의, 추천 게시글을 순서대로 표시하고 인증 의사와 인증 사용자 콘텐츠를 뱃지로 구분한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | admin, server, site | `apps/admin/src/features/community/routes/home-feed-page.tsx`, `apps/admin/src/features/community/pages/home-feed.tsx`, `apps/admin/src/features/community/utils/hot-algorithm.ts`, `packages/features/community` | home feed 운영 화면, 게시글 검색 추가, hot algorithm, community post 노출 패턴 | 상단 배너, 주요 질환 인기 명의, 추천 게시글 조건, 의사 인증/평점 기반 정렬 |  |

## FEA-017 공지사항과 정책 콘텐츠 관리

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 공지사항 상태와 노출 기간 | 공지, 점검, 이벤트, 정책 분류와 공개 중, 예약, 종료 상태를 노출 시작일과 종료일 기준으로 자동 분류한다. |  |
| server | 약관과 개인정보처리방침 콘텐츠 | 이용약관, 개인정보처리방침, 정책성 공지의 버전, 공개 상태, 본문 구조, 최종 수정일을 서버에서 관리한다. |  |
| site | 공지사항 목록과 상세 | 마이페이지 고객지원에서 공지사항 최신순 목록, 무한 스크롤, 제목 말줄임, 빈 상태, 공지 상세 화면을 제공한다. |  |
| site | 약관과 개인정보처리방침 상세 | 이용약관과 개인정보처리방침 상세 페이지에서 제목, 소제목, 표, 가로 스크롤, 세로 스크롤을 모바일과 데스크톱 기준으로 안정적으로 렌더링한다. |  |
| admin | 공지 작성과 수정 | 분류, 상단 고정, 중요 표시, 제목, 본문, 노출 기간을 입력하는 공지 작성, 수정 모달과 즉시 종료, 삭제, 미리보기를 제공한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site, admin | `packages/drizzle/src/schema/core/terms.ts`, `apps/site/src/modules/registry.ts`, `packages/ui` | 약관/정책 콘텐츠 구조, site module registry, 기본 form/table UI 패턴 | 공지 분류, 예약/종료 상태, 공지 작성/수정 admin, 고객지원 노출 |  |

## FEA-018 의견 보내기와 운영자 종결

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 의견 접수와 상태 관리 | 사용자가 보낸 자유 텍스트 의견, 접수 시각, 마스킹 가능한 연락 정보, 대기 또는 종결 상태, 운영자 메모를 저장한다. |  |
| site | 의견 보내기 진입 | 마이페이지 고객지원에서 의견 제출 화면 또는 외부 링크로 연결하고 제출 후 사용자에게 접수 상태를 안내한다. |  |
| admin | 의견 상세와 종결 | 의견 보내기 화면에서 의견 미리보기, 상세 모달, 운영자 메모, 종결 처리를 제공하고 베타에서는 사용자 직접 답변 없이 내부 기록만 남긴다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | server, site, admin | `packages/features/feedback`, `packages/features/feedback/controller`, `packages/features/feedback/service` | feedback 접수 API, 상태 모델, service/controller 패턴 | 운영자 상세/메모/종결, 베타 무응답 정책, 개인정보 마스킹 표시 |  |

## FEA-019 어드민 공통 운영, 권한, 감사 로그

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| admin | 어드민 대시보드 | 신고 처리, 의사 정보 수정 요청, 의견 보내기 대기 큐를 카드로 보여주고 클릭 시 해당 화면으로 이동하며 운영자 매뉴얼 아코디언을 제공한다. |  |
| admin | 어드민 계정 보안 | 베타 단일 운영자 또는 1에서 2명 운영자를 기준으로 이메일, 비밀번호, Google OTP 2FA, 30분 무활동 자동 로그아웃을 적용한다. |  |
| server | 감사 로그 기록 | 삭제, 편집, 등록, 취소, 종결, 반려, 조회, 로그인 등 모든 운영자 행위를 변조 불가 로그로 DB에 기록하고 5년 보관한다. |  |
| server | 어드민 권한 확장 기반 | 베타 단일 권한을 기본으로 하되 정식 런칭 후 Manager, Moderator, Viewer 같은 권한 분리를 도입할 수 있도록 운영자 행위와 리소스를 기록한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| reuse-with-customization | admin, server | `apps/admin/src/layouts/admin-layout.tsx`, `apps/admin/src/features/auth`, `packages/core/nestjs/auth/admin.guard.ts`, `apps/admin/src/pages/admin/dashboard.tsx` | admin layout, sign-in, admin guard, dashboard shell 패턴 | Aiga 운영 메뉴, 2FA/무활동 정책, 감사 로그 보관 기간, 운영자 매뉴얼 |  |

## FEA-020 어드민 사용자, 의사, 콘텐츠 관리

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| admin | 사용자 관리 | 닉네임, 이메일 검색, 정상과 탈퇴 탭, 가입일, 신고 누적, 병원 진료 인증 수, 활동 이력, 의사 인증 사용자 상세, 의사 관리 이동을 제공한다. |  |
| admin | 의사 관리 | 인증 상태, 대표 전화, 예약 URL, 소개, 경력, 학력, 논문, 세부 전공, 노출 ON/OFF를 편집하고 식별 정보는 읽기 전용으로 분리한다. |  |
| admin | 의사 인증 취소 | 의사 관리 편집 모달에서 취소 사유를 필수로 받고 인증 취소를 단방향 처리하며 취소된 의사는 검색과 추천에서 즉시 제외한다. |  |
| admin | 의사 후기 관리 | 의사 프로필 후기와 댓글을 검색, 탭 필터, 행 펼침, 평점, 병원 인증, 첨부 이미지, 신고 이력, 삭제 액션으로 관리한다. |  |
| server | 자동 처리와 직접 처리 경계 | 신규 의사 등록, 의사 마스터 식별 정보 변경, 병원 마스터 변경, 인증 취소 후 재인증은 개발팀 직접 처리로 남기고 평점, 후기 수, 검색 결과, 추천 가중치는 자동 처리로 분리한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | admin, server | `packages/features/_common/service/admin-users.service.ts`, `apps/admin/src/pages/admin/users.tsx`, `apps/admin/src/features/community`, `apps/admin/src/features/profile` | admin users list/detail, community admin, profile edit form/table 패턴 | 의사 마스터, 인증 취소, 의사 후기 관리, 식별 정보 직접 처리 경계 |  |

## FEA-021 운영 정책 설정

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 수정 삭제 기간 정책 SSOT | 게시글, 댓글과 대댓글, 리뷰 3개 그룹별로 수정 불가, N일, 무제한 모드를 서버 정책으로 저장하고 기존 콘텐츠에도 즉시 소급 적용한다. |  |
| server | 정책 변경 캐시 무효화 | 운영 정책 저장 직후 사용자 사이트 캐시를 무효화하고 수정, 삭제, 재인증 가능 여부 판정에 최신 정책값을 사용한다. |  |
| admin | 운영 정책 설정 화면 | 3개 그룹 카드, 모드 선택, N일 입력, 현재 적용값, 저장 버튼, 변경 확인 모달, 최근 변경 이력 20건을 제공한다. |  |
| admin | 정책 변경 영향 안내 | N일 축소로 과거 인증 게시글의 재인증 접근이 차단될 수 있음을 저장 전 확인 모달로 안내하고 모든 변경을 감사 로그에 기록한다. |  |
| site | 정책 기반 액션 노출 | 현재 정책값에 따라 수정, 삭제 메뉴를 숨김 또는 비활성화하고 기간 초과 또는 수정 불가 상태를 토스트로 안내한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| new-implementation | server, admin, site | `packages/ui`, `apps/admin/src/features/community`, `packages/core/error` | feature-level hard copy 없음; form/card/table/error 패턴만 참고 | 게시글/댓글/리뷰 수정삭제 기간 SSOT, 정책 변경 이력, 캐시 무효화, site 액션 노출 |  |

## FEA-022 개인정보, 접근성, 분석 이벤트

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 개인정보 마스킹과 로그 제한 | 이메일, 전화번호, 신고자, 작성자, 민감 정보는 목적에 맞게 마스킹하고 분석 이벤트와 콘텐츠 안전 로그에는 원문 개인정보를 저장하지 않는다. |  |
| server | 탈퇴 사용자 데이터 보존 | 탈퇴 사용자의 식별 정보는 삭제하고 콘텐츠 작성자는 "탈퇴한 사용자"로 마스킹하며 감사 로그와 법적 보존 대상 데이터는 정책에 맞춰 유지한다. |  |
| site | 접근성 기본 동작 | 아이콘 버튼 스크린리더 라벨, 모달 포커스 이동과 복귀, ESC 닫기 가능한 모달의 키보드 동작, 표 영역 가로 스크롤을 제공한다. |  |
| server | 분석 이벤트 수집 계약 | 탭 진입, 버튼 클릭, 저장, 삭제, 검색, 모달 오픈, 성공과 실패, 오류 코드 이벤트를 화면명과 액션명 중심으로 수집할 수 있는 서버 이벤트 계약을 정의한다. |  |
| admin | 의료 도메인 운영 보안 | PHI 마스킹, 감사 로그, 사용자 상세 조회 기록, 의사 인증 데이터 취급, 외부 분석 도구 분리 원칙을 어드민 운영 화면에 반영한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site, admin | `packages/core/analytics`, `packages/core/i18n/user-facing-error.ts`, `packages/core/logger`, `packages/core/nestjs/auth`, `packages/ui` | analytics hook, user-facing error, logger, auth guard, 접근성 가능한 UI 컴포넌트 패턴 | PHI/의료 정보 마스킹, 사용자 상세 조회 기록, Aiga 이벤트 taxonomy, 감사 로그 정책 |  |

## FEA-023 외부 AI 채팅 REST API 연동

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 외부 AI 채팅 REST 연동 계약 | AI 채팅 응답 생성은 자체 구현하지 않고 별도 REST API를 호출하며, 요청 사용자, 세션, 입력 메시지, 추천 의사 카드 메타데이터, 오류 코드를 내부 서비스 계약으로 정규화한다. |  |
| server | 인증 의사 추천 메타데이터 제공 | 외부 AI 응답에 포함된 의사 식별자를 AIGA 의사 프로필과 매칭하고 인증 여부, 뱃지, 프로필 이동에 필요한 최소 데이터를 사용자 사이트에 반환한다. |  |
| site | AI 채팅 화면 연동 | 사용자 사이트의 AIGA 채팅 화면은 외부 REST API 응답을 표시하고, 추천 의사 카드에 인증 뱃지와 프로필 이동 액션을 제공하되 채팅 모델이나 추천 알고리즘은 구현하지 않는다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| new-implementation | server, site | `packages/api-client`, `apps/site/src/lib/api.ts`, `packages/core/integrations/server` | feature-level hard copy 없음; API client와 external integration 패턴만 참고 | 외부 AI 채팅 REST 계약, 추천 의사 매칭, 인증 뱃지 메타데이터, 오류 normalization |  |

## 최종 개발 산출물 상태(Final Development Artifact Status)

이 문서는 개발 투입 기준의 최종 기능정의서다. 자동화/검증용 JSON은 같은 run 디렉터리에 보관하되, 개발자는 우선 이 문서를 기준으로 feature scope, 재사용 판단, 후속 스키마/API/화면 정의를 추적한다.

### 커버리지 요약

| 항목 | 결과 |
| --- | --- |
| 선택 영역 | admin, site, server |
| 추가 범위 메모 | AI 채팅관련은 별도로 REST API로 받을 예정이다. 자체 구현은 생략한다. |
| 기능 그룹 | 23개 |
| 기능 row | 109개 |
| product-builder-base 재사용 판단 | 23개 feature 모두 포함 |
| source chunk 매핑 | 365/370 chunks mapped |
| 명시 제외 chunk | 6 chunks, `unmappedChunks` 항목 3개(`CH-001..CH-004`, `CH-245`, `CH-265`) |

### 재사용 판단 요약

| 재사용 유형 | feature 수 |
| --- | ---: |
| reuse-with-customization | 10 |
| partial-reuse | 10 |
| new-implementation | 3 |

### 검증 및 리뷰 결과

| 항목 | 결과 | 산출 파일 |
| --- | --- | --- |
| 구조 검증 | pass, error 0, warning 0 | `feature-definition.validation.json` |
| 자체 리뷰 | pass, error 0, warning 0, info 1 | `feature-definition.review.json`, `feature-definition-review.md` |
| 보완 루프 | 완료, 남은 허용 warning 없음 | `feature-definition-loop.md` |

### 개발 사용 기준

- 이 문서의 `FEA-###`는 스키마 정의서와 API 정의서의 feature mapping 기준이다.
- 각 feature의 `product-builder-base 재사용 판단`은 downstream Product Builder에서 feature reuse, customization, new implementation을 결정하는 기준이다.
- `메모` 컬럼은 사용자가 추후 직접 작성하는 영역이므로 비워 둔다.
