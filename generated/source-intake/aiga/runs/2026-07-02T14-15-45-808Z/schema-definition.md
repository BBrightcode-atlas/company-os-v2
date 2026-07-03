# 스키마 정의서(Schema Definition) - Aiga

## 1. 전체 ERD(Mermaid Entity Relationship Diagram)

```mermaid
erDiagram
  users 1:1 doctor_profiles
  users 1:N admin_audit_logs
  guest_usage_counters N:1 users
  doctor_profiles 1:1 users
  doctor_profiles 1:N doctor_reviews
  doctor_profiles 1:N doctor_profile_change_requests
  doctor_profile_change_requests N:1 doctor_profiles
  doctor_profile_change_requests N:1 users
  doctor_verification_requests N:1 users
  doctor_verification_requests N:1 doctor_profiles
  community_posts N:1 community_communities
  community_posts N:1 users
  community_posts 1:N community_comments
  community_posts 1:N community_votes
  community_posts 1:N community_reports
  community_comments N:1 community_posts
  community_comments N:1 users
  community_comments 1:N community_comments
  community_comments 1:N community_votes
  community_comments 1:N community_reports
  community_votes N:1 users
  community_votes N:1 community_posts
  community_votes N:1 community_comments
  doctor_reviews N:1 doctor_profiles
  doctor_reviews N:1 users
  doctor_reviews 1:N comment_comments
  doctor_reviews 1:N medical_visit_verifications
  medical_visit_verifications N:1 users
  medical_visit_verifications N:1 community_posts
  medical_visit_verifications N:1 doctor_reviews
  home_curation_items N:1 doctor_profiles
  home_curation_items N:1 community_posts
  community_reports N:1 community_communities
  community_reports N:1 users
  community_reports N:1 community_posts
  community_reports N:1 community_comments
  community_reports 1:N community_mod_logs
  admin_audit_logs N:1 users
  admin_audit_logs N:1 community_reports
  operational_policies N:1 users
  operational_policies 1:N community_posts
  operational_policies 1:N community_comments
  operational_policies 1:N doctor_reviews
  ai_chat_sessions N:1 users
  ai_chat_sessions N:M doctor_profiles
  content_safety_rules 1:N community_reports
  content_safety_rules N:1 admin_audit_logs
  support_contents N:1 users
  support_contents 1:N admin_audit_logs
  community_communities 1:N community_posts
  community_communities 1:N community_reports
  community_communities 1:N community_mod_logs
  comment_comments N:1 users
  comment_comments N:1 doctor_reviews
  comment_comments 1:N comment_comments
  saved_doctors N:1 users
  saved_doctors N:1 doctor_profiles
  files N:1 users
  files 1:N medical_visit_verifications
  analytics_events N:1 users
  admin_mfa_factors N:1 users
  content_safety_logs N:1 content_safety_rules
  content_safety_logs N:1 users
  integration_call_logs N:1 users
  integration_call_logs N:1 files
  content_edit_histories N:1 users
  %% SCH-001 회원 계정과 등급
  users {
    text id PK "회원 식별자; 기본값: base users.id"
    text email UK "통합 이메일; 기본값: 없음 (필수 입력)"
    text nickname "일반 회원 표시 닉네임; 기본값: 없음 (필수 입력)"
    text memberGrade "guest/member/verified_doctor 등급; 기본값: member"
    text status "active/withdrawn/suspended 상태; 기본값: active"
    text kakaoProviderId UK "카카오 OAuth 식별자; 기본값: null"
    text naverProviderId UK "네이버 OAuth 식별자; 기본값: null"
    timestamp rejoinBlockedUntil "탈퇴 후 24시간 재가입 제한 종료 시각; 기본값: null"
  }
  %% SCH-002 비회원 사용량 한도
  guest_usage_counters {
    uuid id PK "카운터 식별자; 기본값: defaultRandom()"
    text subjectKey "익명 세션, IP hash, device id 조합 키; 기본값: 없음 (필수 입력)"
    text action "search/profile_view/post_detail_view 한도 유형; 기본값: 없음 (필수 입력)"
    date usageDate UK "KST 기준 사용 일자; 기본값: current_date(KST)"
    integer consumedCount "차감 횟수; 기본값: 0"
    jsonb dedupeKeys "동일 검색어/즉시 재로딩 중복 차감 방지 키; 기본값: null"
  }
  %% SCH-003 의사 프로필 마스터
  doctor_profiles {
    uuid id PK "의사 프로필 식별자; 기본값: defaultRandom()"
    text linkedUserId UK "인증 완료된 회원 계정 id; 기본값: null"
    text realName "실명 표시명; 기본값: 없음 (필수 입력)"
    text licenseNumberHash "면허번호 해시; 기본값: null"
    text hospitalName "대표 소속 병원; 기본값: null"
    text department "진료과/전문 분야; 기본값: null"
    text representativePhone "대표 전화번호; 기본값: null"
    text reservationUrl "예약 URL; 기본값: null"
    text introduction "의사 소개 문구; 기본값: null"
    text_array specialties "세부 전문 분야 배열; 기본값: []"
    jsonb clinicHours "요일별 진료 시간 구조; 기본값: {}"
    jsonb careerItems "경력 항목 배열; 기본값: []"
    jsonb educationItems "학력 항목 배열; 기본값: []"
    jsonb paperItems "논문/학술 활동 배열; 기본값: []"
    uuid profileImageFileId FK "프로필 이미지 파일 id; 기본값: null"
    text exposureStatus "검색/추천 노출 상태; 기본값: visible"
    numeric averageRating "후기 평균 별점 캐시; 기본값: 0"
    integer reviewCount "후기 수 캐시; 기본값: 0"
    text verificationStatus "none/pending/approved/cancelled 인증 상태; 기본값: none"
    timestamp verificationCancelledAt "인증 취소 시각; 기본값: null"
    text verificationCancelReason "인증 취소 사유; 기본값: null"
  }
  %% SCH-004 의사 정보 수정 요청
  doctor_profile_change_requests {
    uuid id PK "요청 식별자; 기본값: defaultRandom()"
    uuid doctorProfileId FK "수정 대상 의사 프로필; 기본값: 없음 (필수 입력)"
    text requesterUserId FK "요청 회원; 기본값: 없음 (필수 입력)"
    text status "pending/approved/rejected/dev_handoff/done 상태; 기본값: pending"
    jsonb requestedChanges "편집 가능 필드와 변경 요청 값; 기본값: {}"
    text adminMemo "운영자 메모; 기본값: null"
    timestamp resolvedAt "처리 완료 시각; 기본값: null"
  }
  %% SCH-005 의사 인증 요청
  doctor_verification_requests {
    uuid id PK "의사 인증 요청 식별자; 기본값: defaultRandom()"
    text userId FK "인증 요청 회원; 기본값: 없음 (필수 입력)"
    uuid doctorProfileId FK "매칭된 의사 프로필; 기본값: null"
    text identityProvider "PASS/kakao/naver 본인확인 채널; 기본값: 없음 (필수 입력)"
    text licenseNumberHash "면허번호 해시; 기본값: 없음 (필수 입력)"
    integer attemptCount "계정/IP 기준 일일 시도 횟수; 기본값: 0"
    text status "created/identity_verified/license_verified/approved/failed/limited 상태; 기본값: created"
    timestamp approvedAt "승인 완료 시각; 기본값: null"
  }
  %% SCH-006 커뮤니티 게시글
  community_posts {
    uuid id PK "게시글 식별자; 기본값: defaultRandom()"
    uuid communityId FK "부모 커뮤니티; 기본값: 없음 (필수 입력)"
    text authorId FK "작성자 회원; 기본값: 없음 (필수 입력)"
    text title "게시글 제목; 기본값: 없음 (필수 입력)"
    text content "게시글 본문; 기본값: null"
    text type "text/link/image/video/poll 게시글 유형; 기본값: text"
    jsonb mediaUrls "첨부 이미지/미디어 URL 배열; 기본값: []"
    uuid_array imageFileIds "첨부 이미지 파일 id 배열; 기본값: []"
    text status "published/hidden/removed/deleted 상태; 기본값: published"
    text originalContentHash "최초 본문 무결성 확인 hash; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    integer upvoteCount "공감 수 캐시; 기본값: 0"
    integer downvoteCount "비공감 수 캐시; 기본값: 0"
    integer voteScore "투표 점수 캐시; 기본값: 0"
    integer commentCount "댓글 수 캐시; 기본값: 0"
    doublePrecision hotScore "인기 정렬 점수; 기본값: 0"
    timestamp lastActivityAt "마지막 활동 시각; 기본값: now()"
    text diseaseName "Aiga 질환 필터 값; 기본값: null"
    text department "Aiga 진료과 필터 값; 기본값: null"
    boolean hospitalVerified "병원 방문 인증 뱃지 여부; 기본값: false"
  }
  %% SCH-007 커뮤니티 댓글
  community_comments {
    uuid id PK "댓글 식별자; 기본값: defaultRandom()"
    uuid postId FK "부모 게시글; 기본값: 없음 (필수 입력)"
    text authorId FK "작성자 회원; 기본값: 없음 (필수 입력)"
    uuid parentId "부모 댓글 id; 기본값: null"
    text content "댓글 내용; 기본값: 없음 (필수 입력)"
    integer depth "0 댓글, 1 대댓글; 기본값: 0"
    boolean isDeleted "사용자 삭제 placeholder 여부; 기본값: false"
    boolean isRemoved "운영자 삭제 여부; 기본값: false"
    boolean isEdited "수정 여부; 기본값: false"
    text originalContentHash "최초 댓글 무결성 확인 hash; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    timestamp editedAt "수정 시각; 기본값: null"
    integer upvoteCount "공감 수 캐시; 기본값: 0"
    integer replyCount "대댓글 수 캐시; 기본값: 0"
    boolean isHidden "키워드/운영 숨김 여부; 기본값: false"
  }
  %% SCH-008 커뮤니티 투표
  community_votes {
    uuid id PK "투표 식별자; 기본값: defaultRandom()"
    text userId FK "액션 수행 회원; 기본값: 없음 (필수 입력)"
    text targetType "post/comment 대상 유형; 기본값: 없음 (필수 입력)"
    uuid targetId "투표 대상 id; 기본값: 없음 (필수 입력)"
    integer vote "투표 값; 기본값: 없음 (필수 입력)"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
  %% SCH-009 의사 후기
  doctor_reviews {
    uuid id PK "후기 식별자; 기본값: defaultRandom()"
    uuid doctorProfileId FK "후기 대상 의사; 기본값: 없음 (필수 입력)"
    text authorId FK "작성 회원; 기본값: 없음 (필수 입력)"
    integer rating "별점; 기본값: 없음 (필수 입력)"
    text body "후기 본문; 기본값: 없음 (필수 입력)"
    uuid_array imageFileIds "첨부 이미지; 기본값: []"
    boolean hospitalVerified "병원 방문 인증 여부; 기본값: false"
    timestamp editableUntil "수정/삭제 가능 종료 시각; 기본값: null"
    text status "published/hidden/deleted 상태; 기본값: published"
    text originalBody "최초 작성 본문 보관 값; 기본값: null"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    timestamp lastEditedAt "마지막 수정 시각; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
  }
  %% SCH-010 병원 방문 인증
  medical_visit_verifications {
    uuid id PK "증빙 인증 식별자; 기본값: defaultRandom()"
    text userId FK "증빙 제출 회원; 기본값: 없음 (필수 입력)"
    text targetType "community_post/doctor_review; 기본값: 없음 (필수 입력)"
    uuid targetId FK "증빙 연결 대상; 기본값: 없음 (필수 입력)"
    uuid fileId FK "업로드 증빙 파일; 기본값: 없음 (필수 입력)"
    text status "pending/verified/failed/manual_review/rejected 상태; 기본값: pending"
    jsonb ocrResult "병원명/진료일/금액 OCR 결과; 기본값: null"
    text reviewStatus "관리자 수동 검토 상태; 기본값: null"
  }
  %% SCH-011 홈 큐레이션
  home_curation_items {
    uuid id PK "홈 노출 항목 식별자; 기본값: defaultRandom()"
    text slot "banner/popular_doctor/recommended_post; 기본값: 없음 (필수 입력)"
    text targetType "banner_image/doctor_profile/community_post/disease; 기본값: 없음 (필수 입력)"
    uuid targetId "대상 id; 기본값: null"
    integer sortOrder "수동 정렬 순서; 기본값: 0"
    text status "draft/active/scheduled/ended 상태; 기본값: draft"
    timestamp startsAt "노출 시작; 기본값: null"
    timestamp endsAt "노출 종료; 기본값: null"
  }
  %% SCH-012 커뮤니티 신고와 운영 로그
  community_reports {
    uuid id PK "신고 식별자; 기본값: defaultRandom()"
    uuid communityId FK "부모 커뮤니티; 기본값: 없음 (필수 입력)"
    text reporterId FK "신고자 회원; 기본값: 없음 (필수 입력)"
    text targetType "post/comment/user 대상 유형; 기본값: 없음 (필수 입력)"
    uuid targetId "신고 대상 id; 기본값: 없음 (필수 입력)"
    text reason "신고 사유; 기본값: 없음 (필수 입력)"
    text description "신고 상세 설명; 기본값: null"
    text status "pending/reviewing/resolved/dismissed 상태; 기본값: pending"
    text resolvedBy FK "처리 운영자; 기본값: null"
    timestamp resolvedAt "처리 시각; 기본값: null"
    text actionTaken "삭제/경고/반려 등 조치; 기본값: null"
    text severity "심각도; 기본값: medium"
  }
  %% SCH-013 어드민 감사 로그
  admin_audit_logs {
    uuid id PK "감사 로그 식별자; 기본값: defaultRandom()"
    text actorId FK "운영자 계정 id; 기본값: 없음 (필수 입력)"
    text action "login/view/edit/delete/reject/close 등 행위; 기본값: 없음 (필수 입력)"
    text targetType "행위 대상 유형; 기본값: 없음 (필수 입력)"
    text targetId "행위 대상 id; 기본값: null"
    jsonb beforeAfter "변경 전후 diff; 기본값: null"
    text ipHash "운영자 접속 IP 해시; 기본값: null"
    timestamp createdAt "로그 생성 시각; 기본값: now()"
  }
  %% SCH-014 운영 정책 설정
  operational_policies {
    uuid id PK "정책 식별자; 기본값: defaultRandom()"
    text policyKey UK "edit_delete_window 등 정책 키; 기본값: 없음 (필수 입력)"
    text targetGroup "post/comment/review 정책 대상; 기본값: 없음 (필수 입력)"
    jsonb value "수정 불가/N일/무제한 모드와 기간 값; 기본값: {}"
    integer version "정책 버전; 기본값: 1"
    text updatedById FK "변경 운영자; 기본값: 없음 (필수 입력)"
    timestamp appliedAt "정책 적용 시각; 기본값: now()"
  }
  %% SCH-015 외부 AI 채팅 REST 세션
  ai_chat_sessions {
    uuid id PK "채팅 세션 식별자; 기본값: defaultRandom()"
    text userId FK "사용자 회원 id; 기본값: null"
    text externalSessionId "외부 REST API 세션 id; 기본값: null"
    text status "active/failed/closed 상태; 기본값: active"
    text lastErrorCode "마지막 외부 API 오류 코드; 기본값: null"
    jsonb recommendedDoctorIds "응답에 포함된 추천 의사 id 목록; 기본값: []"
    timestamp lastRequestedAt "마지막 REST 호출 시각; 기본값: null"
  }
  %% SCH-016 콘텐츠 안전 규칙과 차단 로그
  content_safety_rules {
    uuid id PK "규칙 식별자; 기본값: defaultRandom()"
    text ruleType "blocked_word/whitelist/combination/image_label; 기본값: 없음 (필수 입력)"
    text pattern "규칙 패턴 또는 외부 API label; 기본값: 없음 (필수 입력)"
    text category "광고/욕설/허위정보/의료법 위반 등 카테고리; 기본값: 없음 (필수 입력)"
    boolean isActive "활성 여부; 기본값: true"
    integer hitCount "차단 또는 통과 집계; 기본값: 0"
    text provider "외부 이미지 안전 API provider id; 기본값: null"
    timestamp lastMatchedAt "마지막 매칭 시각; 기본값: null"
    text costUnit "호출 비용 단위; 기본값: null"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
  %% SCH-017 고객지원과 정책 콘텐츠
  support_contents {
    uuid id PK "콘텐츠/의견 식별자; 기본값: defaultRandom()"
    text contentType "notice/terms/privacy/feedback; 기본값: 없음 (필수 입력)"
    text title "제목; 기본값: 없음 (필수 입력)"
    text body "본문 또는 의견 내용; 기본값: 없음 (필수 입력)"
    text status "draft/published/scheduled/ended/pending/closed 상태; 기본값: draft"
    text submittedById FK "의견 제출 회원; 기본값: null"
    text adminMemo "운영자 내부 메모; 기본값: null"
    timestamp publishedAt "공개 시각; 기본값: null"
  }
  %% SCH-018 커뮤니티 공간
  community_communities {
    uuid id PK "커뮤니티 식별자; 기본값: defaultRandom()"
    text name UK "커뮤니티 이름; 기본값: 없음 (필수 입력)"
    text slug UK "URL/식별용 slug; 기본값: 없음 (필수 입력)"
    text description "커뮤니티 설명; 기본값: 없음 (필수 입력)"
    text ownerId FK "커뮤니티 소유자; 기본값: 없음 (필수 입력)"
    text type "public/restricted/private 유형; 기본값: public"
    boolean isOfficial "공식 커뮤니티 여부; 기본값: false"
    boolean allowImages "이미지 첨부 허용 여부; 기본값: true"
    integer memberCount "회원 수 캐시; 기본값: 0"
    integer postCount "게시글 수 캐시; 기본값: 0"
    jsonb rules "운영 규칙 배열; 기본값: []"
    jsonb automodConfig "자동 moderation 설정; 기본값: {}"
    text_array bannedWords "금칙어 배열; 기본값: []"
  }
  %% SCH-019 리뷰 댓글
  comment_comments {
    uuid id PK "댓글 식별자; 기본값: defaultRandom()"
    text content "댓글 내용; 기본값: 없음 (필수 입력)"
    text authorId FK "작성자 회원; 기본값: 없음 (필수 입력)"
    text targetType "doctor_review 대상 유형; 기본값: doctor_review"
    uuid targetId FK "리뷰 id; 기본값: 없음 (필수 입력)"
    uuid parentId "부모 댓글 id; 기본값: null"
    integer depth "0 댓글, 1 대댓글; 기본값: 0"
    text status "visible/hidden/deleted 상태; 기본값: visible"
    boolean isEdited "수정 여부; 기본값: false"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
    jsonb mentions "멘션 사용자 id 배열; 기본값: []"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
  %% SCH-020 파일 업로드와 스토리지
  files {
    uuid id PK "파일 식별자; 기본값: defaultRandom()"
    text name "저장 파일명; 기본값: 없음 (필수 입력)"
    text originalName "원본 파일명; 기본값: 없음 (필수 입력)"
    text mimeType "MIME 타입; 기본값: 없음 (필수 입력)"
    integer size "파일 크기 byte; 기본값: 없음 (필수 입력)"
    text url "스토리지 내부 URL; 기본값: 없음 (필수 입력)"
    text bucket "스토리지 bucket; 기본값: files"
    text path "bucket 내부 path; 기본값: 없음 (필수 입력)"
    text publicUrl "공개 URL 또는 CDN URL; 기본값: null"
    text uploadedById FK "업로드 회원 id; 기본값: 없음 (필수 입력)"
    text purpose "profile_image/post_image/review_image/receipt/banner 목적; 기본값: 없음 (필수 입력)"
    text scanStatus "pending/passed/blocked/failed 이미지 안전 검사 상태; 기본값: pending"
    jsonb scanResult "외부 이미지 안전 검사 결과 요약; 기본값: null"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
  %% SCH-021 저장한 의료진
  saved_doctors {
    uuid id PK "저장 식별자; 기본값: defaultRandom()"
    text userId FK "저장한 회원 id; 기본값: 없음 (필수 입력)"
    uuid doctorProfileId FK "저장 대상 의사 프로필 id; 기본값: 없음 (필수 입력)"
    timestamp createdAt "저장 시각; 기본값: now()"
  }
  %% SCH-022 분석 이벤트
  analytics_events {
    uuid id PK "이벤트 식별자; 기본값: defaultRandom()"
    text userId FK "로그인 회원 id; 기본값: null"
    text anonymousId "비회원/익명 식별자 hash; 기본값: null"
    text eventName "이벤트명; 기본값: 없음 (필수 입력)"
    text screenName "화면명; 기본값: 없음 (필수 입력)"
    text actionName "액션명; 기본값: 없음 (필수 입력)"
    text targetType "대상 리소스 타입; 기본값: null"
    text targetId "대상 리소스 id 또는 hash; 기본값: null"
    text resultStatus "success/failure/error 결과; 기본값: null"
    text errorCode "실패/오류 코드; 기본값: null"
    jsonb properties "PII 제거 후 속성; 기본값: {}"
    timestamp createdAt "수집 시각; 기본값: now()"
  }
  %% SCH-023 어드민 2FA 요소
  admin_mfa_factors {
    uuid id PK "2FA 요소 식별자; 기본값: defaultRandom()"
    text userId FK "운영자 사용자 id; 기본값: 없음 (필수 입력)"
    text factorType "totp/recovery_code 요소 유형; 기본값: totp"
    text secretHash "TOTP secret 암호화/hash 값; 기본값: 없음 (필수 입력)"
    text recoveryCodeHash "복구 코드 hash 묶음; 기본값: null"
    text status "pending/active/disabled 상태; 기본값: pending"
    timestamp lastVerifiedAt "마지막 OTP 검증 시각; 기본값: null"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp disabledAt "비활성화 시각; 기본값: null"
  }
  %% SCH-024 콘텐츠 안전 로그
  content_safety_logs {
    uuid id PK "안전 검사 로그 식별자; 기본값: defaultRandom()"
    uuid ruleId FK "매칭된 안전 규칙 id; 기본값: null"
    text userId FK "요청 회원 id; 기본값: null"
    text targetType "post/comment/review/image 대상 유형; 기본값: 없음 (필수 입력)"
    uuid targetId "대상 리소스 id; 기본값: null"
    text action "block/pass/review 결과; 기본값: 없음 (필수 입력)"
    text category "차단 카테고리; 기본값: 없음 (필수 입력)"
    text matchedRuleType "blocked_word/whitelist/combination/image_label; 기본값: null"
    text provider "외부 이미지 안전 API provider; 기본값: null"
    jsonb labels "외부 API label/score 요약; 기본값: {}"
    numeric costAmount "외부 API 호출 비용; 기본값: 0"
    boolean blocked "게시 차단 여부; 기본값: false"
    timestamp createdAt "검사 시각; 기본값: now()"
  }
  %% SCH-025 외부 연동 호출 로그
  integration_call_logs {
    uuid id PK "외부 호출 로그 식별자; 기본값: defaultRandom()"
    text provider "ocr/image_safety/external_ai provider id; 기본값: 없음 (필수 입력)"
    text purpose "medical_visit_ocr/image_moderation/ai_chat 목적; 기본값: 없음 (필수 입력)"
    text targetType "연결 대상 리소스 타입; 기본값: null"
    uuid targetId "연결 대상 리소스 id; 기본값: null"
    uuid fileId FK "파일 id; 기본값: null"
    text userId FK "요청 회원 id; 기본값: null"
    text status "success/failure/timeout 상태; 기본값: 없음 (필수 입력)"
    text requestId "provider request id; 기본값: null"
    text errorCode "provider 오류 코드; 기본값: null"
    integer latencyMs "호출 지연 시간 ms; 기본값: null"
    numeric costAmount "호출 비용; 기본값: 0"
    timestamp createdAt "호출 시각; 기본값: now()"
  }
  %% SCH-026 콘텐츠 수정 이력
  content_edit_histories {
    uuid id PK "수정 이력 식별자; 기본값: defaultRandom()"
    text targetType "community_post/community_comment/doctor_review/review_comment; 기본값: 없음 (필수 입력)"
    uuid targetId "대상 콘텐츠 id; 기본값: 없음 (필수 입력)"
    text actorId FK "수정/삭제 수행자 id; 기본값: 없음 (필수 입력)"
    text editAction "create/update/delete/restore/admin_hide 액션; 기본값: 없음 (필수 입력)"
    text previousBody "변경 전 본문; 기본값: null"
    text nextBody "변경 후 본문; 기본값: null"
    text originalBody "최초 작성 본문 snapshot; 기본값: null"
    text reason "수정/삭제/운영 처리 사유; 기본값: null"
    timestamp createdAt "이력 생성 시각; 기본값: now()"
  }
```

## 2. 기능별 ERD(Feature ERD)

### 계정, 권한, 비회원 한도

- 관련 기능: FEA-001 회원 등급 및 권한 정책, FEA-002 인증, 로그인, 세션, SNS 계정 통합, FEA-003 비회원 제한, 한도, 로그인 유도, FEA-012 마이페이지, 내 활동, 고객지원, 회원탈퇴, FEA-022 개인정보, 접근성, 분석 이벤트
- 스키마: SCH-001 `users`, SCH-002 `guest_usage_counters`, SCH-013 `admin_audit_logs`

```mermaid
erDiagram
  users 1:1 doctor_profiles
  users 1:N admin_audit_logs
  guest_usage_counters N:1 users
  admin_audit_logs N:1 users
  admin_audit_logs N:1 community_reports
  %% SCH-001 회원 계정과 등급
  users {
    text id PK "회원 식별자; 기본값: base users.id"
    text email UK "통합 이메일; 기본값: 없음 (필수 입력)"
    text nickname "일반 회원 표시 닉네임; 기본값: 없음 (필수 입력)"
    text memberGrade "guest/member/verified_doctor 등급; 기본값: member"
    text status "active/withdrawn/suspended 상태; 기본값: active"
    text kakaoProviderId UK "카카오 OAuth 식별자; 기본값: null"
    text naverProviderId UK "네이버 OAuth 식별자; 기본값: null"
    timestamp rejoinBlockedUntil "탈퇴 후 24시간 재가입 제한 종료 시각; 기본값: null"
  }
  %% SCH-002 비회원 사용량 한도
  guest_usage_counters {
    uuid id PK "카운터 식별자; 기본값: defaultRandom()"
    text subjectKey "익명 세션, IP hash, device id 조합 키; 기본값: 없음 (필수 입력)"
    text action "search/profile_view/post_detail_view 한도 유형; 기본값: 없음 (필수 입력)"
    date usageDate UK "KST 기준 사용 일자; 기본값: current_date(KST)"
    integer consumedCount "차감 횟수; 기본값: 0"
    jsonb dedupeKeys "동일 검색어/즉시 재로딩 중복 차감 방지 키; 기본값: null"
  }
  %% SCH-013 어드민 감사 로그
  admin_audit_logs {
    uuid id PK "감사 로그 식별자; 기본값: defaultRandom()"
    text actorId FK "운영자 계정 id; 기본값: 없음 (필수 입력)"
    text action "login/view/edit/delete/reject/close 등 행위; 기본값: 없음 (필수 입력)"
    text targetType "행위 대상 유형; 기본값: 없음 (필수 입력)"
    text targetId "행위 대상 id; 기본값: null"
    jsonb beforeAfter "변경 전후 diff; 기본값: null"
    text ipHash "운영자 접속 IP 해시; 기본값: null"
    timestamp createdAt "로그 생성 시각; 기본값: now()"
  }
```

### 커뮤니티 base 재사용

- 관련 기능: FEA-004 커뮤니티 피드, 글쓰기, 상세, 임시저장, FEA-005 댓글, 대댓글, 공감 인터랙션, FEA-014 신고, 블라인드, 운영 처리, FEA-015 콘텐츠 안전 자동 차단, FEA-016 홈 운영과 사용자 홈 노출, FEA-021 운영 정책 설정
- 스키마: SCH-018 `community_communities`, SCH-006 `community_posts`, SCH-007 `community_comments`, SCH-008 `community_votes`, SCH-012 `community_reports`, SCH-014 `operational_policies`, SCH-016 `content_safety_rules`

```mermaid
erDiagram
  community_communities 1:N community_posts
  community_communities 1:N community_reports
  community_communities 1:N community_mod_logs
  community_posts N:1 community_communities
  community_posts N:1 users
  community_posts 1:N community_comments
  community_posts 1:N community_votes
  community_posts 1:N community_reports
  community_comments N:1 community_posts
  community_comments N:1 users
  community_comments 1:N community_comments
  community_comments 1:N community_votes
  community_comments 1:N community_reports
  community_votes N:1 users
  community_votes N:1 community_posts
  community_votes N:1 community_comments
  community_reports N:1 community_communities
  community_reports N:1 users
  community_reports N:1 community_posts
  community_reports N:1 community_comments
  community_reports 1:N community_mod_logs
  operational_policies N:1 users
  operational_policies 1:N community_posts
  operational_policies 1:N community_comments
  operational_policies 1:N doctor_reviews
  content_safety_rules 1:N community_reports
  content_safety_rules N:1 admin_audit_logs
  %% SCH-018 커뮤니티 공간
  community_communities {
    uuid id PK "커뮤니티 식별자; 기본값: defaultRandom()"
    text name UK "커뮤니티 이름; 기본값: 없음 (필수 입력)"
    text slug UK "URL/식별용 slug; 기본값: 없음 (필수 입력)"
    text description "커뮤니티 설명; 기본값: 없음 (필수 입력)"
    text ownerId FK "커뮤니티 소유자; 기본값: 없음 (필수 입력)"
    text type "public/restricted/private 유형; 기본값: public"
    boolean isOfficial "공식 커뮤니티 여부; 기본값: false"
    boolean allowImages "이미지 첨부 허용 여부; 기본값: true"
    integer memberCount "회원 수 캐시; 기본값: 0"
    integer postCount "게시글 수 캐시; 기본값: 0"
    jsonb rules "운영 규칙 배열; 기본값: []"
    jsonb automodConfig "자동 moderation 설정; 기본값: {}"
    text_array bannedWords "금칙어 배열; 기본값: []"
  }
  %% SCH-006 커뮤니티 게시글
  community_posts {
    uuid id PK "게시글 식별자; 기본값: defaultRandom()"
    uuid communityId FK "부모 커뮤니티; 기본값: 없음 (필수 입력)"
    text authorId FK "작성자 회원; 기본값: 없음 (필수 입력)"
    text title "게시글 제목; 기본값: 없음 (필수 입력)"
    text content "게시글 본문; 기본값: null"
    text type "text/link/image/video/poll 게시글 유형; 기본값: text"
    jsonb mediaUrls "첨부 이미지/미디어 URL 배열; 기본값: []"
    uuid_array imageFileIds "첨부 이미지 파일 id 배열; 기본값: []"
    text status "published/hidden/removed/deleted 상태; 기본값: published"
    text originalContentHash "최초 본문 무결성 확인 hash; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    integer upvoteCount "공감 수 캐시; 기본값: 0"
    integer downvoteCount "비공감 수 캐시; 기본값: 0"
    integer voteScore "투표 점수 캐시; 기본값: 0"
    integer commentCount "댓글 수 캐시; 기본값: 0"
    doublePrecision hotScore "인기 정렬 점수; 기본값: 0"
    timestamp lastActivityAt "마지막 활동 시각; 기본값: now()"
    text diseaseName "Aiga 질환 필터 값; 기본값: null"
    text department "Aiga 진료과 필터 값; 기본값: null"
    boolean hospitalVerified "병원 방문 인증 뱃지 여부; 기본값: false"
  }
  %% SCH-007 커뮤니티 댓글
  community_comments {
    uuid id PK "댓글 식별자; 기본값: defaultRandom()"
    uuid postId FK "부모 게시글; 기본값: 없음 (필수 입력)"
    text authorId FK "작성자 회원; 기본값: 없음 (필수 입력)"
    uuid parentId "부모 댓글 id; 기본값: null"
    text content "댓글 내용; 기본값: 없음 (필수 입력)"
    integer depth "0 댓글, 1 대댓글; 기본값: 0"
    boolean isDeleted "사용자 삭제 placeholder 여부; 기본값: false"
    boolean isRemoved "운영자 삭제 여부; 기본값: false"
    boolean isEdited "수정 여부; 기본값: false"
    text originalContentHash "최초 댓글 무결성 확인 hash; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    timestamp editedAt "수정 시각; 기본값: null"
    integer upvoteCount "공감 수 캐시; 기본값: 0"
    integer replyCount "대댓글 수 캐시; 기본값: 0"
    boolean isHidden "키워드/운영 숨김 여부; 기본값: false"
  }
  %% SCH-008 커뮤니티 투표
  community_votes {
    uuid id PK "투표 식별자; 기본값: defaultRandom()"
    text userId FK "액션 수행 회원; 기본값: 없음 (필수 입력)"
    text targetType "post/comment 대상 유형; 기본값: 없음 (필수 입력)"
    uuid targetId "투표 대상 id; 기본값: 없음 (필수 입력)"
    integer vote "투표 값; 기본값: 없음 (필수 입력)"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
  %% SCH-012 커뮤니티 신고와 운영 로그
  community_reports {
    uuid id PK "신고 식별자; 기본값: defaultRandom()"
    uuid communityId FK "부모 커뮤니티; 기본값: 없음 (필수 입력)"
    text reporterId FK "신고자 회원; 기본값: 없음 (필수 입력)"
    text targetType "post/comment/user 대상 유형; 기본값: 없음 (필수 입력)"
    uuid targetId "신고 대상 id; 기본값: 없음 (필수 입력)"
    text reason "신고 사유; 기본값: 없음 (필수 입력)"
    text description "신고 상세 설명; 기본값: null"
    text status "pending/reviewing/resolved/dismissed 상태; 기본값: pending"
    text resolvedBy FK "처리 운영자; 기본값: null"
    timestamp resolvedAt "처리 시각; 기본값: null"
    text actionTaken "삭제/경고/반려 등 조치; 기본값: null"
    text severity "심각도; 기본값: medium"
  }
  %% SCH-014 운영 정책 설정
  operational_policies {
    uuid id PK "정책 식별자; 기본값: defaultRandom()"
    text policyKey UK "edit_delete_window 등 정책 키; 기본값: 없음 (필수 입력)"
    text targetGroup "post/comment/review 정책 대상; 기본값: 없음 (필수 입력)"
    jsonb value "수정 불가/N일/무제한 모드와 기간 값; 기본값: {}"
    integer version "정책 버전; 기본값: 1"
    text updatedById FK "변경 운영자; 기본값: 없음 (필수 입력)"
    timestamp appliedAt "정책 적용 시각; 기본값: now()"
  }
  %% SCH-016 콘텐츠 안전 규칙과 차단 로그
  content_safety_rules {
    uuid id PK "규칙 식별자; 기본값: defaultRandom()"
    text ruleType "blocked_word/whitelist/combination/image_label; 기본값: 없음 (필수 입력)"
    text pattern "규칙 패턴 또는 외부 API label; 기본값: 없음 (필수 입력)"
    text category "광고/욕설/허위정보/의료법 위반 등 카테고리; 기본값: 없음 (필수 입력)"
    boolean isActive "활성 여부; 기본값: true"
    integer hitCount "차단 또는 통과 집계; 기본값: 0"
    text provider "외부 이미지 안전 API provider id; 기본값: null"
    timestamp lastMatchedAt "마지막 매칭 시각; 기본값: null"
    text costUnit "호출 비용 단위; 기본값: null"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
```

### 의사 인증, 프로필, 리뷰

- 관련 기능: FEA-006 의사 리뷰와 후기 작성, FEA-008 의사 인증 플로우와 면허번호 검증, FEA-009 의사 인증 표시와 실명 전환, FEA-010 의사 프로필, 명의 찾기, 정보 수정 요청, FEA-020 어드민 사용자, 의사, 콘텐츠 관리
- 스키마: SCH-003 `doctor_profiles`, SCH-004 `doctor_profile_change_requests`, SCH-005 `doctor_verification_requests`, SCH-009 `doctor_reviews`, SCH-019 `comment_comments`

```mermaid
erDiagram
  doctor_profiles 1:1 users
  doctor_profiles 1:N doctor_reviews
  doctor_profiles 1:N doctor_profile_change_requests
  doctor_profile_change_requests N:1 doctor_profiles
  doctor_profile_change_requests N:1 users
  doctor_verification_requests N:1 users
  doctor_verification_requests N:1 doctor_profiles
  doctor_reviews N:1 doctor_profiles
  doctor_reviews N:1 users
  doctor_reviews 1:N comment_comments
  doctor_reviews 1:N medical_visit_verifications
  comment_comments N:1 users
  comment_comments N:1 doctor_reviews
  comment_comments 1:N comment_comments
  %% SCH-003 의사 프로필 마스터
  doctor_profiles {
    uuid id PK "의사 프로필 식별자; 기본값: defaultRandom()"
    text linkedUserId UK "인증 완료된 회원 계정 id; 기본값: null"
    text realName "실명 표시명; 기본값: 없음 (필수 입력)"
    text licenseNumberHash "면허번호 해시; 기본값: null"
    text hospitalName "대표 소속 병원; 기본값: null"
    text department "진료과/전문 분야; 기본값: null"
    text representativePhone "대표 전화번호; 기본값: null"
    text reservationUrl "예약 URL; 기본값: null"
    text introduction "의사 소개 문구; 기본값: null"
    text_array specialties "세부 전문 분야 배열; 기본값: []"
    jsonb clinicHours "요일별 진료 시간 구조; 기본값: {}"
    jsonb careerItems "경력 항목 배열; 기본값: []"
    jsonb educationItems "학력 항목 배열; 기본값: []"
    jsonb paperItems "논문/학술 활동 배열; 기본값: []"
    uuid profileImageFileId FK "프로필 이미지 파일 id; 기본값: null"
    text exposureStatus "검색/추천 노출 상태; 기본값: visible"
    numeric averageRating "후기 평균 별점 캐시; 기본값: 0"
    integer reviewCount "후기 수 캐시; 기본값: 0"
    text verificationStatus "none/pending/approved/cancelled 인증 상태; 기본값: none"
    timestamp verificationCancelledAt "인증 취소 시각; 기본값: null"
    text verificationCancelReason "인증 취소 사유; 기본값: null"
  }
  %% SCH-004 의사 정보 수정 요청
  doctor_profile_change_requests {
    uuid id PK "요청 식별자; 기본값: defaultRandom()"
    uuid doctorProfileId FK "수정 대상 의사 프로필; 기본값: 없음 (필수 입력)"
    text requesterUserId FK "요청 회원; 기본값: 없음 (필수 입력)"
    text status "pending/approved/rejected/dev_handoff/done 상태; 기본값: pending"
    jsonb requestedChanges "편집 가능 필드와 변경 요청 값; 기본값: {}"
    text adminMemo "운영자 메모; 기본값: null"
    timestamp resolvedAt "처리 완료 시각; 기본값: null"
  }
  %% SCH-005 의사 인증 요청
  doctor_verification_requests {
    uuid id PK "의사 인증 요청 식별자; 기본값: defaultRandom()"
    text userId FK "인증 요청 회원; 기본값: 없음 (필수 입력)"
    uuid doctorProfileId FK "매칭된 의사 프로필; 기본값: null"
    text identityProvider "PASS/kakao/naver 본인확인 채널; 기본값: 없음 (필수 입력)"
    text licenseNumberHash "면허번호 해시; 기본값: 없음 (필수 입력)"
    integer attemptCount "계정/IP 기준 일일 시도 횟수; 기본값: 0"
    text status "created/identity_verified/license_verified/approved/failed/limited 상태; 기본값: created"
    timestamp approvedAt "승인 완료 시각; 기본값: null"
  }
  %% SCH-009 의사 후기
  doctor_reviews {
    uuid id PK "후기 식별자; 기본값: defaultRandom()"
    uuid doctorProfileId FK "후기 대상 의사; 기본값: 없음 (필수 입력)"
    text authorId FK "작성 회원; 기본값: 없음 (필수 입력)"
    integer rating "별점; 기본값: 없음 (필수 입력)"
    text body "후기 본문; 기본값: 없음 (필수 입력)"
    uuid_array imageFileIds "첨부 이미지; 기본값: []"
    boolean hospitalVerified "병원 방문 인증 여부; 기본값: false"
    timestamp editableUntil "수정/삭제 가능 종료 시각; 기본값: null"
    text status "published/hidden/deleted 상태; 기본값: published"
    text originalBody "최초 작성 본문 보관 값; 기본값: null"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    timestamp lastEditedAt "마지막 수정 시각; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
  }
  %% SCH-019 리뷰 댓글
  comment_comments {
    uuid id PK "댓글 식별자; 기본값: defaultRandom()"
    text content "댓글 내용; 기본값: 없음 (필수 입력)"
    text authorId FK "작성자 회원; 기본값: 없음 (필수 입력)"
    text targetType "doctor_review 대상 유형; 기본값: doctor_review"
    uuid targetId FK "리뷰 id; 기본값: 없음 (필수 입력)"
    uuid parentId "부모 댓글 id; 기본값: null"
    integer depth "0 댓글, 1 대댓글; 기본값: 0"
    text status "visible/hidden/deleted 상태; 기본값: visible"
    boolean isEdited "수정 여부; 기본값: false"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
    jsonb mentions "멘션 사용자 id 배열; 기본값: []"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
```

### 방문 인증, 홈, 고객지원, 외부 연동

- 관련 기능: FEA-007 병원 방문 인증과 증빙 뱃지, FEA-017 공지사항과 정책 콘텐츠 관리, FEA-018 의견 보내기와 운영자 종결, FEA-023 외부 AI 채팅 REST API 연동
- 스키마: SCH-010 `medical_visit_verifications`, SCH-011 `home_curation_items`, SCH-015 `ai_chat_sessions`, SCH-017 `support_contents`

```mermaid
erDiagram
  medical_visit_verifications N:1 users
  medical_visit_verifications N:1 community_posts
  medical_visit_verifications N:1 doctor_reviews
  home_curation_items N:1 doctor_profiles
  home_curation_items N:1 community_posts
  ai_chat_sessions N:1 users
  ai_chat_sessions N:M doctor_profiles
  support_contents N:1 users
  support_contents 1:N admin_audit_logs
  %% SCH-010 병원 방문 인증
  medical_visit_verifications {
    uuid id PK "증빙 인증 식별자; 기본값: defaultRandom()"
    text userId FK "증빙 제출 회원; 기본값: 없음 (필수 입력)"
    text targetType "community_post/doctor_review; 기본값: 없음 (필수 입력)"
    uuid targetId FK "증빙 연결 대상; 기본값: 없음 (필수 입력)"
    uuid fileId FK "업로드 증빙 파일; 기본값: 없음 (필수 입력)"
    text status "pending/verified/failed/manual_review/rejected 상태; 기본값: pending"
    jsonb ocrResult "병원명/진료일/금액 OCR 결과; 기본값: null"
    text reviewStatus "관리자 수동 검토 상태; 기본값: null"
  }
  %% SCH-011 홈 큐레이션
  home_curation_items {
    uuid id PK "홈 노출 항목 식별자; 기본값: defaultRandom()"
    text slot "banner/popular_doctor/recommended_post; 기본값: 없음 (필수 입력)"
    text targetType "banner_image/doctor_profile/community_post/disease; 기본값: 없음 (필수 입력)"
    uuid targetId "대상 id; 기본값: null"
    integer sortOrder "수동 정렬 순서; 기본값: 0"
    text status "draft/active/scheduled/ended 상태; 기본값: draft"
    timestamp startsAt "노출 시작; 기본값: null"
    timestamp endsAt "노출 종료; 기본값: null"
  }
  %% SCH-015 외부 AI 채팅 REST 세션
  ai_chat_sessions {
    uuid id PK "채팅 세션 식별자; 기본값: defaultRandom()"
    text userId FK "사용자 회원 id; 기본값: null"
    text externalSessionId "외부 REST API 세션 id; 기본값: null"
    text status "active/failed/closed 상태; 기본값: active"
    text lastErrorCode "마지막 외부 API 오류 코드; 기본값: null"
    jsonb recommendedDoctorIds "응답에 포함된 추천 의사 id 목록; 기본값: []"
    timestamp lastRequestedAt "마지막 REST 호출 시각; 기본값: null"
  }
  %% SCH-017 고객지원과 정책 콘텐츠
  support_contents {
    uuid id PK "콘텐츠/의견 식별자; 기본값: defaultRandom()"
    text contentType "notice/terms/privacy/feedback; 기본값: 없음 (필수 입력)"
    text title "제목; 기본값: 없음 (필수 입력)"
    text body "본문 또는 의견 내용; 기본값: 없음 (필수 입력)"
    text status "draft/published/scheduled/ended/pending/closed 상태; 기본값: draft"
    text submittedById FK "의견 제출 회원; 기본값: null"
    text adminMemo "운영자 내부 메모; 기본값: null"
    timestamp publishedAt "공개 시각; 기본값: null"
  }
```

### 운영 보완 스키마

- 관련 기능: FEA-007 병원 방문 인증과 증빙 뱃지, FEA-012 마이페이지, 내 활동, 고객지원, 회원탈퇴, FEA-015 콘텐츠 안전 자동 차단, FEA-019 어드민 공통 운영, 권한, 감사 로그, FEA-022 개인정보, 접근성, 분석 이벤트
- 스키마: SCH-020 `files`, SCH-021 `saved_doctors`, SCH-022 `analytics_events`, SCH-023 `admin_mfa_factors`, SCH-024 `content_safety_logs`, SCH-025 `integration_call_logs`, SCH-026 `content_edit_histories`

```mermaid
erDiagram
  files N:1 users
  saved_doctors N:1 users
  saved_doctors N:1 doctor_profiles
  analytics_events N:1 users
  admin_mfa_factors N:1 users
  content_safety_logs N:1 content_safety_rules
  integration_call_logs N:1 files
  content_edit_histories N:1 users
  files {
    uuid id PK "파일 식별자; 기본값: defaultRandom()"
    text purpose "profile_image/post_image/review_image/receipt/banner 목적; 기본값: 없음 (필수 입력)"
    text scanStatus "pending/passed/blocked/failed 이미지 안전 검사 상태; 기본값: pending"
  }
  saved_doctors {
    uuid id PK "저장 식별자; 기본값: defaultRandom()"
    text userId FK "저장한 회원 id; 기본값: 없음 (필수 입력)"
    uuid doctorProfileId FK "저장 대상 의사 프로필 id; 기본값: 없음 (필수 입력)"
  }
  analytics_events {
    uuid id PK "이벤트 식별자; 기본값: defaultRandom()"
    text eventName "이벤트명; 기본값: 없음 (필수 입력)"
    jsonb properties "PII 제거 후 속성; 기본값: {}"
  }
  admin_mfa_factors {
    uuid id PK "2FA 요소 식별자; 기본값: defaultRandom()"
    text factorType "totp/recovery_code 요소 유형; 기본값: totp"
    text status "pending/active/disabled 상태; 기본값: pending"
  }
  content_safety_logs {
    uuid id PK "안전 검사 로그 식별자; 기본값: defaultRandom()"
    text action "block/pass/review 결과; 기본값: 없음 (필수 입력)"
    numeric costAmount "외부 API 호출 비용; 기본값: 0"
  }
  integration_call_logs {
    uuid id PK "외부 호출 로그 식별자; 기본값: defaultRandom()"
    text provider "ocr/image_safety/external_ai provider id; 기본값: 없음 (필수 입력)"
    numeric costAmount "호출 비용; 기본값: 0"
  }
  content_edit_histories {
    uuid id PK "수정 이력 식별자; 기본값: defaultRandom()"
    text targetType "community_post/community_comment/doctor_review/review_comment; 기본값: 없음 (필수 입력)"
    text originalBody "최초 작성 본문 snapshot; 기본값: null"
  }
```

## 3. 기능, 참고, 재사용, 마이그레이션 설명(Feature, Reference, Reuse & Migration Notes)

### 3.1 기능 기준 스키마 매핑(Feature-to-Schema Matrix)

| 기능 ID | 기능명 | 스키마 코드 | 기본 재사용 판단 | 메모 |
| --- | --- | --- | --- | --- |
| FEA-001 | 회원 등급 및 권한 정책 | SCH-001, SCH-013 | EXTEND | users, admin_audit_logs |
| FEA-002 | 인증, 로그인, 세션, SNS 계정 통합 | SCH-001 | EXTEND | users |
| FEA-003 | 비회원 제한, 한도, 로그인 유도 | SCH-001, SCH-002 | EXTEND | users, guest_usage_counters |
| FEA-004 | 커뮤니티 피드, 글쓰기, 상세, 임시저장 | SCH-006, SCH-014, SCH-018, SCH-020, SCH-026 | EXTEND | community_posts, operational_policies, community_communities, files, content_edit_histories |
| FEA-005 | 댓글, 대댓글, 공감 인터랙션 | SCH-007, SCH-008, SCH-014, SCH-019, SCH-026 | EXTEND | community_comments, community_votes, operational_policies, comment_comments, content_edit_histories |
| FEA-006 | 의사 리뷰와 후기 작성 | SCH-009, SCH-014, SCH-019, SCH-020, SCH-026 | EXTEND | doctor_reviews, operational_policies, comment_comments, files, content_edit_histories |
| FEA-007 | 병원 방문 인증과 증빙 뱃지 | SCH-006, SCH-009, SCH-010, SCH-014, SCH-020, SCH-025 | NEW | community_posts, doctor_reviews, medical_visit_verifications, operational_policies, files, integration_call_logs |
| FEA-008 | 의사 인증 플로우와 면허번호 검증 | SCH-003, SCH-005 | EXTEND | doctor_profiles, doctor_verification_requests |
| FEA-009 | 의사 인증 표시와 실명 전환 | SCH-003, SCH-005, SCH-006, SCH-007, SCH-009 | EXTEND | doctor_profiles, doctor_verification_requests, community_posts, community_comments, doctor_reviews |
| FEA-010 | 의사 프로필, 명의 찾기, 정보 수정 요청 | SCH-003, SCH-004, SCH-009, SCH-015, SCH-021 | EXTEND | doctor_profiles, doctor_profile_change_requests, doctor_reviews, ai_chat_sessions, saved_doctors |
| FEA-011 | 통합 검색, 명의 찾기 검색, 입력 보안 | SCH-002, SCH-003, SCH-006 | EXTEND | guest_usage_counters, doctor_profiles, community_posts |
| FEA-012 | 마이페이지, 내 활동, 고객지원, 회원탈퇴 | SCH-001, SCH-009, SCH-017, SCH-021 | EXTEND | users, doctor_reviews, support_contents, saved_doctors |
| FEA-013 | 공통 UI 상태, 네비게이션, 중복 액션 방지 | SCH-013, SCH-014 | NEW | admin_audit_logs, operational_policies |
| FEA-014 | 신고, 블라인드, 운영 처리 | SCH-006, SCH-009, SCH-012, SCH-013, SCH-016, SCH-018 | EXTEND | community_posts, doctor_reviews, community_reports, admin_audit_logs, content_safety_rules, community_communities |
| FEA-015 | 콘텐츠 안전 자동 차단 | SCH-006, SCH-007, SCH-010, SCH-012, SCH-016, SCH-020, SCH-024, SCH-025 | NEW | community_posts, community_comments, medical_visit_verifications, community_reports, content_safety_rules, files, content_safety_logs, integration_call_logs |
| FEA-016 | 홈 운영과 사용자 홈 노출 | SCH-003, SCH-006, SCH-011, SCH-018, SCH-020 | NEW | doctor_profiles, community_posts, home_curation_items, community_communities, files |
| FEA-017 | 공지사항과 정책 콘텐츠 관리 | SCH-017 | EXTEND | support_contents |
| FEA-018 | 의견 보내기와 운영자 종결 | SCH-017 | NEW | support_contents |
| FEA-019 | 어드민 공통 운영, 권한, 감사 로그 | SCH-001, SCH-013, SCH-023 | EXTEND | users, admin_audit_logs, admin_mfa_factors |
| FEA-020 | 어드민 사용자, 의사, 콘텐츠 관리 | SCH-003, SCH-004, SCH-005, SCH-009, SCH-012, SCH-013, SCH-023, SCH-026 | EXTEND | doctor_profiles, doctor_profile_change_requests, doctor_verification_requests, doctor_reviews, community_reports, admin_audit_logs, admin_mfa_factors, content_edit_histories |
| FEA-021 | 운영 정책 설정 | SCH-006, SCH-007, SCH-009, SCH-014 | NEW | community_posts, community_comments, doctor_reviews, operational_policies |
| FEA-022 | 개인정보, 접근성, 분석 이벤트 | SCH-001, SCH-005, SCH-009, SCH-012, SCH-013, SCH-016, SCH-020, SCH-022, SCH-023, SCH-024, SCH-025, SCH-026 | EXTEND | users, doctor_verification_requests, doctor_reviews, community_reports, admin_audit_logs, content_safety_rules, files, analytics_events, admin_mfa_factors, content_safety_logs, integration_call_logs, content_edit_histories |
| FEA-023 | 외부 AI 채팅 REST API 연동 | SCH-003, SCH-015, SCH-025 | EXTEND | doctor_profiles, ai_chat_sessions, integration_call_logs |

### 3.2 Product Builder Base 구성 범위(Component Scope)

| 범위 | base 참조 | Aiga 적용 |
| --- | --- | --- |
| 인증/세션/프로필 | `core/auth.ts`, `core/better-auth.ts`, `core/profiles.ts`, `core/role-permission/*` | 회원, 의사 인증, 운영자 권한 확장 |
| 커뮤니티 | `features/community/index.ts` export `communities`, `communityPosts`, `communityComments`, `communityVotes`, `communityReports`, `communityModLogs` | 부모 `community_communities`까지 포함해 base community schema를 최대한 재사용 |
| 리뷰 댓글 | `features/comment/index.ts` export `comments` | 의사 후기 댓글은 community 댓글과 분리해 generic comments로 처리 |
| 리뷰 | `core/reviews.ts` export `reviews`, `reviewSummary`, `reviewReports` | 의사 프로필 후기, 별점 집계, 후기 신고 |
| 본인인증 | `features/identity-verification/index.ts` | 본인확인과 면허번호 검증 요청 확장 |
| 약관/콘텐츠 | `core/terms.ts`, `packages/features/feedback` | 공지, 약관, 개인정보처리방침, 의견 보내기 |
| 파일/스토리지 | `core/files.ts` export `files` | 게시글/후기 이미지, 증빙, 배너, 프로필 이미지 파일 메타데이터 확장 |
| 외부 연동 | `core/integration-connections.ts` | OCR, 이미지 안전 API, 외부 AI REST 호출 상태와 비용 로그 확장 |
| 분석 | `packages/core/analytics` | sanitize된 이벤트 payload만 저장하고 외부 분석 도구와 분리 |
| 어드민 보안 | `core/better-auth.ts` export `sessions`, `verifications` | 2FA 요소와 30분 inactivity 정책 결합 |

### 3.3 기준 코드베이스(Base Drizzle Baseline)

- 기준 저장소: `/Users/bright/Projects/product-builder-base`
- 기준 schema barrel: `packages/drizzle/src/schema/index.ts`
- community 기준 파일: `packages/drizzle/src/schema/features/community/index.ts`
- community 필수 부모: `communities` / physical table `community_communities`
- 제외: `features/character-chat`은 내부 채팅 런타임 기능이므로 Aiga 외부 REST AI 연동 범위에는 직접 재사용하지 않는다.

### 3.4 스키마별 참고/재사용/마이그레이션(Per-Schema Reference & Reuse)

| 코드 | 테이블 | 소유 | 재사용 판단 | base 참조 | 마이그레이션/구현 메모 |
| --- | --- | --- | --- | --- | --- |
| SCH-001 | `users` | server | EXTEND | `users`, `profiles`, `userRoles` | base users/profiles 확장; SNS provider id unique index 추가; 탈퇴/재가입 제한 컬럼 추가 |
| SCH-002 | `guest_usage_counters` | server | EXTEND | `rateLimits` | rateLimits를 그대로 쓰지 않고 Aiga 한도 정책용 counter 테이블 추가 |
| SCH-003 | `doctor_profiles` | server | EXTEND | `profiles`, `reviewSummary` | 의사 마스터 신규 테이블; 기존 profiles와 optional 1:1 연결; 검색/추천용 index 추가 |
| SCH-004 | `doctor_profile_change_requests` | server | NEW | 없음 | 신규 요청 워크플로우 테이블 |
| SCH-005 | `doctor_verification_requests` | server | EXTEND | `identityVerificationRequests`, `identityVerifications` | identity-verification 패턴 확장; 의사 인증 전용 요청 테이블 추가 |
| SCH-006 | `community_posts` | server | EXTEND | `communityPosts` | product-builder-base communityPosts hard-copy/extend; Aiga 질환/진료과/병원 인증 컬럼만 추가 |
| SCH-007 | `community_comments` | server | EXTEND | `communityComments` | product-builder-base communityComments hard-copy/extend; Aiga 삭제 placeholder와 수정 가능 정책은 service/policy로 처리 |
| SCH-008 | `community_votes` | server | REUSE | `communityVotes` | product-builder-base communityVotes 그대로 재사용 |
| SCH-009 | `doctor_reviews` | server | EXTEND | `reviews`, `reviewSummary` | reviews schema 확장; 의사 후기 전용 unique/restriction 추가 |
| SCH-010 | `medical_visit_verifications` | server | NEW | 없음 | 신규 OCR/수동 검토 테이블; files/integration 패턴과 연결 |
| SCH-011 | `home_curation_items` | server | NEW | 없음 | 신규 홈 운영 테이블 |
| SCH-012 | `community_reports` | server | EXTEND | `communityReports`, `communityModLogs`, `reviewReports` | product-builder-base communityReports/communityModLogs hard-copy/extend; Aiga 신고 사유 enum만 의료 도메인에 맞게 확장 |
| SCH-013 | `admin_audit_logs` | server | EXTEND | `roles`, `users` | 신규 append-only 감사 로그; 운영자 권한 확장 기반 |
| SCH-014 | `operational_policies` | server | NEW | 없음 | 신규 정책 SSOT 테이블; 정책 변경 이력 20건 조회 index |
| SCH-015 | `ai_chat_sessions` | server | EXTEND | `integrationConnections` | 외부 REST 연동 상태 테이블 추가; ai-runtime 관련 테이블 제외 |
| SCH-016 | `content_safety_rules` | server | NEW | 없음 | 신규 콘텐츠 안전 규칙 테이블 |
| SCH-017 | `support_contents` | server | EXTEND | `terms` | terms schema 확장; feedback 운영자 종결 상태 신규 저장 |
| SCH-018 | `community_communities` | server | REUSE | `communities` | product-builder-base communities 그대로 재사용; Aiga 공식 커뮤니티 seed 생성 |
| SCH-019 | `comment_comments` | server | EXTEND | `comments` | product-builder-base comments hard-copy/extend; commentTargetType에 doctor_review 추가 |
| SCH-020 | `files` | server | EXTEND | `files` | product-builder-base core files 확장; purpose/scanStatus/scanResult 추가 |
| SCH-021 | `saved_doctors` | server | NEW | 없음 | 저장한 의료진 신규 테이블; user+doctor unique |
| SCH-022 | `analytics_events` | server | NEW | 없음 | 분석 이벤트 서버 수집 계약; PII 제거 payload만 저장 |
| SCH-023 | `admin_mfa_factors` | server | EXTEND | `sessions`, `verifications` | Better Auth 위에 admin Google OTP 2FA 상태 확장 |
| SCH-024 | `content_safety_logs` | server | NEW | 없음 | BLOCK 로그, 차단 통계, 이미지 API label/cost 저장 |
| SCH-025 | `integration_call_logs` | server | EXTEND | `integrationConnections` | OCR, 이미지 안전, 외부 AI REST 호출량/비용/오류 로그 |
| SCH-026 | `content_edit_histories` | server | NEW | 없음 | 게시글/댓글/후기 원본 보관과 수정/삭제 이력 |

### 3.5 Mermaid 스키마 필드 정의(Type, Name, Description, Default)

아래 Mermaid ERD 블록은 구현자가 각 스키마의 필드 타입, 이름, 설명, 기본값을 한 번에 확인할 수 있도록 `type name KEY "설명; 기본값: value"` 형식으로 작성했다.

```mermaid
erDiagram
  users 1:1 doctor_profiles
  users 1:N admin_audit_logs
  guest_usage_counters N:1 users
  doctor_profiles 1:1 users
  doctor_profiles 1:N doctor_reviews
  doctor_profiles 1:N doctor_profile_change_requests
  doctor_profile_change_requests N:1 doctor_profiles
  doctor_profile_change_requests N:1 users
  doctor_verification_requests N:1 users
  doctor_verification_requests N:1 doctor_profiles
  community_posts N:1 community_communities
  community_posts N:1 users
  community_posts 1:N community_comments
  community_posts 1:N community_votes
  community_posts 1:N community_reports
  community_comments N:1 community_posts
  community_comments N:1 users
  community_comments 1:N community_comments
  community_comments 1:N community_votes
  community_comments 1:N community_reports
  community_votes N:1 users
  community_votes N:1 community_posts
  community_votes N:1 community_comments
  doctor_reviews N:1 doctor_profiles
  doctor_reviews N:1 users
  doctor_reviews 1:N comment_comments
  doctor_reviews 1:N medical_visit_verifications
  medical_visit_verifications N:1 users
  medical_visit_verifications N:1 community_posts
  medical_visit_verifications N:1 doctor_reviews
  home_curation_items N:1 doctor_profiles
  home_curation_items N:1 community_posts
  community_reports N:1 community_communities
  community_reports N:1 users
  community_reports N:1 community_posts
  community_reports N:1 community_comments
  community_reports 1:N community_mod_logs
  admin_audit_logs N:1 users
  admin_audit_logs N:1 community_reports
  operational_policies N:1 users
  operational_policies 1:N community_posts
  operational_policies 1:N community_comments
  operational_policies 1:N doctor_reviews
  ai_chat_sessions N:1 users
  ai_chat_sessions N:M doctor_profiles
  content_safety_rules 1:N community_reports
  content_safety_rules N:1 admin_audit_logs
  support_contents N:1 users
  support_contents 1:N admin_audit_logs
  community_communities 1:N community_posts
  community_communities 1:N community_reports
  community_communities 1:N community_mod_logs
  comment_comments N:1 users
  comment_comments N:1 doctor_reviews
  comment_comments 1:N comment_comments
  saved_doctors N:1 users
  saved_doctors N:1 doctor_profiles
  files N:1 users
  files 1:N medical_visit_verifications
  analytics_events N:1 users
  admin_mfa_factors N:1 users
  content_safety_logs N:1 content_safety_rules
  content_safety_logs N:1 users
  integration_call_logs N:1 users
  integration_call_logs N:1 files
  content_edit_histories N:1 users
  %% SCH-001 회원 계정과 등급
  users {
    text id PK "회원 식별자; 기본값: base users.id"
    text email UK "통합 이메일; 기본값: 없음 (필수 입력)"
    text nickname "일반 회원 표시 닉네임; 기본값: 없음 (필수 입력)"
    text memberGrade "guest/member/verified_doctor 등급; 기본값: member"
    text status "active/withdrawn/suspended 상태; 기본값: active"
    text kakaoProviderId UK "카카오 OAuth 식별자; 기본값: null"
    text naverProviderId UK "네이버 OAuth 식별자; 기본값: null"
    timestamp rejoinBlockedUntil "탈퇴 후 24시간 재가입 제한 종료 시각; 기본값: null"
  }
  %% SCH-002 비회원 사용량 한도
  guest_usage_counters {
    uuid id PK "카운터 식별자; 기본값: defaultRandom()"
    text subjectKey "익명 세션, IP hash, device id 조합 키; 기본값: 없음 (필수 입력)"
    text action "search/profile_view/post_detail_view 한도 유형; 기본값: 없음 (필수 입력)"
    date usageDate UK "KST 기준 사용 일자; 기본값: current_date(KST)"
    integer consumedCount "차감 횟수; 기본값: 0"
    jsonb dedupeKeys "동일 검색어/즉시 재로딩 중복 차감 방지 키; 기본값: null"
  }
  %% SCH-003 의사 프로필 마스터
  doctor_profiles {
    uuid id PK "의사 프로필 식별자; 기본값: defaultRandom()"
    text linkedUserId UK "인증 완료된 회원 계정 id; 기본값: null"
    text realName "실명 표시명; 기본값: 없음 (필수 입력)"
    text licenseNumberHash "면허번호 해시; 기본값: null"
    text hospitalName "대표 소속 병원; 기본값: null"
    text department "진료과/전문 분야; 기본값: null"
    text representativePhone "대표 전화번호; 기본값: null"
    text reservationUrl "예약 URL; 기본값: null"
    text introduction "의사 소개 문구; 기본값: null"
    text_array specialties "세부 전문 분야 배열; 기본값: []"
    jsonb clinicHours "요일별 진료 시간 구조; 기본값: {}"
    jsonb careerItems "경력 항목 배열; 기본값: []"
    jsonb educationItems "학력 항목 배열; 기본값: []"
    jsonb paperItems "논문/학술 활동 배열; 기본값: []"
    uuid profileImageFileId FK "프로필 이미지 파일 id; 기본값: null"
    text exposureStatus "검색/추천 노출 상태; 기본값: visible"
    numeric averageRating "후기 평균 별점 캐시; 기본값: 0"
    integer reviewCount "후기 수 캐시; 기본값: 0"
    text verificationStatus "none/pending/approved/cancelled 인증 상태; 기본값: none"
    timestamp verificationCancelledAt "인증 취소 시각; 기본값: null"
    text verificationCancelReason "인증 취소 사유; 기본값: null"
  }
  %% SCH-004 의사 정보 수정 요청
  doctor_profile_change_requests {
    uuid id PK "요청 식별자; 기본값: defaultRandom()"
    uuid doctorProfileId FK "수정 대상 의사 프로필; 기본값: 없음 (필수 입력)"
    text requesterUserId FK "요청 회원; 기본값: 없음 (필수 입력)"
    text status "pending/approved/rejected/dev_handoff/done 상태; 기본값: pending"
    jsonb requestedChanges "편집 가능 필드와 변경 요청 값; 기본값: {}"
    text adminMemo "운영자 메모; 기본값: null"
    timestamp resolvedAt "처리 완료 시각; 기본값: null"
  }
  %% SCH-005 의사 인증 요청
  doctor_verification_requests {
    uuid id PK "의사 인증 요청 식별자; 기본값: defaultRandom()"
    text userId FK "인증 요청 회원; 기본값: 없음 (필수 입력)"
    uuid doctorProfileId FK "매칭된 의사 프로필; 기본값: null"
    text identityProvider "PASS/kakao/naver 본인확인 채널; 기본값: 없음 (필수 입력)"
    text licenseNumberHash "면허번호 해시; 기본값: 없음 (필수 입력)"
    integer attemptCount "계정/IP 기준 일일 시도 횟수; 기본값: 0"
    text status "created/identity_verified/license_verified/approved/failed/limited 상태; 기본값: created"
    timestamp approvedAt "승인 완료 시각; 기본값: null"
  }
  %% SCH-006 커뮤니티 게시글
  community_posts {
    uuid id PK "게시글 식별자; 기본값: defaultRandom()"
    uuid communityId FK "부모 커뮤니티; 기본값: 없음 (필수 입력)"
    text authorId FK "작성자 회원; 기본값: 없음 (필수 입력)"
    text title "게시글 제목; 기본값: 없음 (필수 입력)"
    text content "게시글 본문; 기본값: null"
    text type "text/link/image/video/poll 게시글 유형; 기본값: text"
    jsonb mediaUrls "첨부 이미지/미디어 URL 배열; 기본값: []"
    uuid_array imageFileIds "첨부 이미지 파일 id 배열; 기본값: []"
    text status "published/hidden/removed/deleted 상태; 기본값: published"
    text originalContentHash "최초 본문 무결성 확인 hash; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    integer upvoteCount "공감 수 캐시; 기본값: 0"
    integer downvoteCount "비공감 수 캐시; 기본값: 0"
    integer voteScore "투표 점수 캐시; 기본값: 0"
    integer commentCount "댓글 수 캐시; 기본값: 0"
    doublePrecision hotScore "인기 정렬 점수; 기본값: 0"
    timestamp lastActivityAt "마지막 활동 시각; 기본값: now()"
    text diseaseName "Aiga 질환 필터 값; 기본값: null"
    text department "Aiga 진료과 필터 값; 기본값: null"
    boolean hospitalVerified "병원 방문 인증 뱃지 여부; 기본값: false"
  }
  %% SCH-007 커뮤니티 댓글
  community_comments {
    uuid id PK "댓글 식별자; 기본값: defaultRandom()"
    uuid postId FK "부모 게시글; 기본값: 없음 (필수 입력)"
    text authorId FK "작성자 회원; 기본값: 없음 (필수 입력)"
    uuid parentId "부모 댓글 id; 기본값: null"
    text content "댓글 내용; 기본값: 없음 (필수 입력)"
    integer depth "0 댓글, 1 대댓글; 기본값: 0"
    boolean isDeleted "사용자 삭제 placeholder 여부; 기본값: false"
    boolean isRemoved "운영자 삭제 여부; 기본값: false"
    boolean isEdited "수정 여부; 기본값: false"
    text originalContentHash "최초 댓글 무결성 확인 hash; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    timestamp editedAt "수정 시각; 기본값: null"
    integer upvoteCount "공감 수 캐시; 기본값: 0"
    integer replyCount "대댓글 수 캐시; 기본값: 0"
    boolean isHidden "키워드/운영 숨김 여부; 기본값: false"
  }
  %% SCH-008 커뮤니티 투표
  community_votes {
    uuid id PK "투표 식별자; 기본값: defaultRandom()"
    text userId FK "액션 수행 회원; 기본값: 없음 (필수 입력)"
    text targetType "post/comment 대상 유형; 기본값: 없음 (필수 입력)"
    uuid targetId "투표 대상 id; 기본값: 없음 (필수 입력)"
    integer vote "투표 값; 기본값: 없음 (필수 입력)"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
  %% SCH-009 의사 후기
  doctor_reviews {
    uuid id PK "후기 식별자; 기본값: defaultRandom()"
    uuid doctorProfileId FK "후기 대상 의사; 기본값: 없음 (필수 입력)"
    text authorId FK "작성 회원; 기본값: 없음 (필수 입력)"
    integer rating "별점; 기본값: 없음 (필수 입력)"
    text body "후기 본문; 기본값: 없음 (필수 입력)"
    uuid_array imageFileIds "첨부 이미지; 기본값: []"
    boolean hospitalVerified "병원 방문 인증 여부; 기본값: false"
    timestamp editableUntil "수정/삭제 가능 종료 시각; 기본값: null"
    text status "published/hidden/deleted 상태; 기본값: published"
    text originalBody "최초 작성 본문 보관 값; 기본값: null"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    timestamp lastEditedAt "마지막 수정 시각; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
  }
  %% SCH-010 병원 방문 인증
  medical_visit_verifications {
    uuid id PK "증빙 인증 식별자; 기본값: defaultRandom()"
    text userId FK "증빙 제출 회원; 기본값: 없음 (필수 입력)"
    text targetType "community_post/doctor_review; 기본값: 없음 (필수 입력)"
    uuid targetId FK "증빙 연결 대상; 기본값: 없음 (필수 입력)"
    uuid fileId FK "업로드 증빙 파일; 기본값: 없음 (필수 입력)"
    text status "pending/verified/failed/manual_review/rejected 상태; 기본값: pending"
    jsonb ocrResult "병원명/진료일/금액 OCR 결과; 기본값: null"
    text reviewStatus "관리자 수동 검토 상태; 기본값: null"
  }
  %% SCH-011 홈 큐레이션
  home_curation_items {
    uuid id PK "홈 노출 항목 식별자; 기본값: defaultRandom()"
    text slot "banner/popular_doctor/recommended_post; 기본값: 없음 (필수 입력)"
    text targetType "banner_image/doctor_profile/community_post/disease; 기본값: 없음 (필수 입력)"
    uuid targetId "대상 id; 기본값: null"
    integer sortOrder "수동 정렬 순서; 기본값: 0"
    text status "draft/active/scheduled/ended 상태; 기본값: draft"
    timestamp startsAt "노출 시작; 기본값: null"
    timestamp endsAt "노출 종료; 기본값: null"
  }
  %% SCH-012 커뮤니티 신고와 운영 로그
  community_reports {
    uuid id PK "신고 식별자; 기본값: defaultRandom()"
    uuid communityId FK "부모 커뮤니티; 기본값: 없음 (필수 입력)"
    text reporterId FK "신고자 회원; 기본값: 없음 (필수 입력)"
    text targetType "post/comment/user 대상 유형; 기본값: 없음 (필수 입력)"
    uuid targetId "신고 대상 id; 기본값: 없음 (필수 입력)"
    text reason "신고 사유; 기본값: 없음 (필수 입력)"
    text description "신고 상세 설명; 기본값: null"
    text status "pending/reviewing/resolved/dismissed 상태; 기본값: pending"
    text resolvedBy FK "처리 운영자; 기본값: null"
    timestamp resolvedAt "처리 시각; 기본값: null"
    text actionTaken "삭제/경고/반려 등 조치; 기본값: null"
    text severity "심각도; 기본값: medium"
  }
  %% SCH-013 어드민 감사 로그
  admin_audit_logs {
    uuid id PK "감사 로그 식별자; 기본값: defaultRandom()"
    text actorId FK "운영자 계정 id; 기본값: 없음 (필수 입력)"
    text action "login/view/edit/delete/reject/close 등 행위; 기본값: 없음 (필수 입력)"
    text targetType "행위 대상 유형; 기본값: 없음 (필수 입력)"
    text targetId "행위 대상 id; 기본값: null"
    jsonb beforeAfter "변경 전후 diff; 기본값: null"
    text ipHash "운영자 접속 IP 해시; 기본값: null"
    timestamp createdAt "로그 생성 시각; 기본값: now()"
  }
  %% SCH-014 운영 정책 설정
  operational_policies {
    uuid id PK "정책 식별자; 기본값: defaultRandom()"
    text policyKey UK "edit_delete_window 등 정책 키; 기본값: 없음 (필수 입력)"
    text targetGroup "post/comment/review 정책 대상; 기본값: 없음 (필수 입력)"
    jsonb value "수정 불가/N일/무제한 모드와 기간 값; 기본값: {}"
    integer version "정책 버전; 기본값: 1"
    text updatedById FK "변경 운영자; 기본값: 없음 (필수 입력)"
    timestamp appliedAt "정책 적용 시각; 기본값: now()"
  }
  %% SCH-015 외부 AI 채팅 REST 세션
  ai_chat_sessions {
    uuid id PK "채팅 세션 식별자; 기본값: defaultRandom()"
    text userId FK "사용자 회원 id; 기본값: null"
    text externalSessionId "외부 REST API 세션 id; 기본값: null"
    text status "active/failed/closed 상태; 기본값: active"
    text lastErrorCode "마지막 외부 API 오류 코드; 기본값: null"
    jsonb recommendedDoctorIds "응답에 포함된 추천 의사 id 목록; 기본값: []"
    timestamp lastRequestedAt "마지막 REST 호출 시각; 기본값: null"
  }
  %% SCH-016 콘텐츠 안전 규칙과 차단 로그
  content_safety_rules {
    uuid id PK "규칙 식별자; 기본값: defaultRandom()"
    text ruleType "blocked_word/whitelist/combination/image_label; 기본값: 없음 (필수 입력)"
    text pattern "규칙 패턴 또는 외부 API label; 기본값: 없음 (필수 입력)"
    text category "광고/욕설/허위정보/의료법 위반 등 카테고리; 기본값: 없음 (필수 입력)"
    boolean isActive "활성 여부; 기본값: true"
    integer hitCount "차단 또는 통과 집계; 기본값: 0"
    text provider "외부 이미지 안전 API provider id; 기본값: null"
    timestamp lastMatchedAt "마지막 매칭 시각; 기본값: null"
    text costUnit "호출 비용 단위; 기본값: null"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
  %% SCH-017 고객지원과 정책 콘텐츠
  support_contents {
    uuid id PK "콘텐츠/의견 식별자; 기본값: defaultRandom()"
    text contentType "notice/terms/privacy/feedback; 기본값: 없음 (필수 입력)"
    text title "제목; 기본값: 없음 (필수 입력)"
    text body "본문 또는 의견 내용; 기본값: 없음 (필수 입력)"
    text status "draft/published/scheduled/ended/pending/closed 상태; 기본값: draft"
    text submittedById FK "의견 제출 회원; 기본값: null"
    text adminMemo "운영자 내부 메모; 기본값: null"
    timestamp publishedAt "공개 시각; 기본값: null"
  }
  %% SCH-018 커뮤니티 공간
  community_communities {
    uuid id PK "커뮤니티 식별자; 기본값: defaultRandom()"
    text name UK "커뮤니티 이름; 기본값: 없음 (필수 입력)"
    text slug UK "URL/식별용 slug; 기본값: 없음 (필수 입력)"
    text description "커뮤니티 설명; 기본값: 없음 (필수 입력)"
    text ownerId FK "커뮤니티 소유자; 기본값: 없음 (필수 입력)"
    text type "public/restricted/private 유형; 기본값: public"
    boolean isOfficial "공식 커뮤니티 여부; 기본값: false"
    boolean allowImages "이미지 첨부 허용 여부; 기본값: true"
    integer memberCount "회원 수 캐시; 기본값: 0"
    integer postCount "게시글 수 캐시; 기본값: 0"
    jsonb rules "운영 규칙 배열; 기본값: []"
    jsonb automodConfig "자동 moderation 설정; 기본값: {}"
    text_array bannedWords "금칙어 배열; 기본값: []"
  }
  %% SCH-019 리뷰 댓글
  comment_comments {
    uuid id PK "댓글 식별자; 기본값: defaultRandom()"
    text content "댓글 내용; 기본값: 없음 (필수 입력)"
    text authorId FK "작성자 회원; 기본값: 없음 (필수 입력)"
    text targetType "doctor_review 대상 유형; 기본값: doctor_review"
    uuid targetId FK "리뷰 id; 기본값: 없음 (필수 입력)"
    uuid parentId "부모 댓글 id; 기본값: null"
    integer depth "0 댓글, 1 대댓글; 기본값: 0"
    text status "visible/hidden/deleted 상태; 기본값: visible"
    boolean isEdited "수정 여부; 기본값: false"
    timestamp deletedAt "soft delete 시각; 기본값: null"
    integer editHistoryCount "수정 이력 수 캐시; 기본값: 0"
    jsonb mentions "멘션 사용자 id 배열; 기본값: []"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
  %% SCH-020 파일 업로드와 스토리지
  files {
    uuid id PK "파일 식별자; 기본값: defaultRandom()"
    text name "저장 파일명; 기본값: 없음 (필수 입력)"
    text originalName "원본 파일명; 기본값: 없음 (필수 입력)"
    text mimeType "MIME 타입; 기본값: 없음 (필수 입력)"
    integer size "파일 크기 byte; 기본값: 없음 (필수 입력)"
    text url "스토리지 내부 URL; 기본값: 없음 (필수 입력)"
    text bucket "스토리지 bucket; 기본값: files"
    text path "bucket 내부 path; 기본값: 없음 (필수 입력)"
    text publicUrl "공개 URL 또는 CDN URL; 기본값: null"
    text uploadedById FK "업로드 회원 id; 기본값: 없음 (필수 입력)"
    text purpose "profile_image/post_image/review_image/receipt/banner 목적; 기본값: 없음 (필수 입력)"
    text scanStatus "pending/passed/blocked/failed 이미지 안전 검사 상태; 기본값: pending"
    jsonb scanResult "외부 이미지 안전 검사 결과 요약; 기본값: null"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp updatedAt "수정 시각; 기본값: now()"
  }
  %% SCH-021 저장한 의료진
  saved_doctors {
    uuid id PK "저장 식별자; 기본값: defaultRandom()"
    text userId FK "저장한 회원 id; 기본값: 없음 (필수 입력)"
    uuid doctorProfileId FK "저장 대상 의사 프로필 id; 기본값: 없음 (필수 입력)"
    timestamp createdAt "저장 시각; 기본값: now()"
  }
  %% SCH-022 분석 이벤트
  analytics_events {
    uuid id PK "이벤트 식별자; 기본값: defaultRandom()"
    text userId FK "로그인 회원 id; 기본값: null"
    text anonymousId "비회원/익명 식별자 hash; 기본값: null"
    text eventName "이벤트명; 기본값: 없음 (필수 입력)"
    text screenName "화면명; 기본값: 없음 (필수 입력)"
    text actionName "액션명; 기본값: 없음 (필수 입력)"
    text targetType "대상 리소스 타입; 기본값: null"
    text targetId "대상 리소스 id 또는 hash; 기본값: null"
    text resultStatus "success/failure/error 결과; 기본값: null"
    text errorCode "실패/오류 코드; 기본값: null"
    jsonb properties "PII 제거 후 속성; 기본값: {}"
    timestamp createdAt "수집 시각; 기본값: now()"
  }
  %% SCH-023 어드민 2FA 요소
  admin_mfa_factors {
    uuid id PK "2FA 요소 식별자; 기본값: defaultRandom()"
    text userId FK "운영자 사용자 id; 기본값: 없음 (필수 입력)"
    text factorType "totp/recovery_code 요소 유형; 기본값: totp"
    text secretHash "TOTP secret 암호화/hash 값; 기본값: 없음 (필수 입력)"
    text recoveryCodeHash "복구 코드 hash 묶음; 기본값: null"
    text status "pending/active/disabled 상태; 기본값: pending"
    timestamp lastVerifiedAt "마지막 OTP 검증 시각; 기본값: null"
    timestamp createdAt "생성 시각; 기본값: now()"
    timestamp disabledAt "비활성화 시각; 기본값: null"
  }
  %% SCH-024 콘텐츠 안전 로그
  content_safety_logs {
    uuid id PK "안전 검사 로그 식별자; 기본값: defaultRandom()"
    uuid ruleId FK "매칭된 안전 규칙 id; 기본값: null"
    text userId FK "요청 회원 id; 기본값: null"
    text targetType "post/comment/review/image 대상 유형; 기본값: 없음 (필수 입력)"
    uuid targetId "대상 리소스 id; 기본값: null"
    text action "block/pass/review 결과; 기본값: 없음 (필수 입력)"
    text category "차단 카테고리; 기본값: 없음 (필수 입력)"
    text matchedRuleType "blocked_word/whitelist/combination/image_label; 기본값: null"
    text provider "외부 이미지 안전 API provider; 기본값: null"
    jsonb labels "외부 API label/score 요약; 기본값: {}"
    numeric costAmount "외부 API 호출 비용; 기본값: 0"
    boolean blocked "게시 차단 여부; 기본값: false"
    timestamp createdAt "검사 시각; 기본값: now()"
  }
  %% SCH-025 외부 연동 호출 로그
  integration_call_logs {
    uuid id PK "외부 호출 로그 식별자; 기본값: defaultRandom()"
    text provider "ocr/image_safety/external_ai provider id; 기본값: 없음 (필수 입력)"
    text purpose "medical_visit_ocr/image_moderation/ai_chat 목적; 기본값: 없음 (필수 입력)"
    text targetType "연결 대상 리소스 타입; 기본값: null"
    uuid targetId "연결 대상 리소스 id; 기본값: null"
    uuid fileId FK "파일 id; 기본값: null"
    text userId FK "요청 회원 id; 기본값: null"
    text status "success/failure/timeout 상태; 기본값: 없음 (필수 입력)"
    text requestId "provider request id; 기본값: null"
    text errorCode "provider 오류 코드; 기본값: null"
    integer latencyMs "호출 지연 시간 ms; 기본값: null"
    numeric costAmount "호출 비용; 기본값: 0"
    timestamp createdAt "호출 시각; 기본값: now()"
  }
  %% SCH-026 콘텐츠 수정 이력
  content_edit_histories {
    uuid id PK "수정 이력 식별자; 기본값: defaultRandom()"
    text targetType "community_post/community_comment/doctor_review/review_comment; 기본값: 없음 (필수 입력)"
    uuid targetId "대상 콘텐츠 id; 기본값: 없음 (필수 입력)"
    text actorId FK "수정/삭제 수행자 id; 기본값: 없음 (필수 입력)"
    text editAction "create/update/delete/restore/admin_hide 액션; 기본값: 없음 (필수 입력)"
    text previousBody "변경 전 본문; 기본값: null"
    text nextBody "변경 후 본문; 기본값: null"
    text originalBody "최초 작성 본문 snapshot; 기본값: null"
    text reason "수정/삭제/운영 처리 사유; 기본값: null"
    timestamp createdAt "이력 생성 시각; 기본값: now()"
  }
```

## 4. 해당 없음(N/A)

- `ai-runtime`: 현재 선택 범위에서 제외되었고, Aiga 채팅 응답 생성은 별도 REST API가 담당한다.
- `character-chat` schema: product-builder-base에 존재하지만 내부 채팅 런타임이므로 Aiga 외부 REST AI 연동에는 직접 재사용하지 않는다.
- 순수 UI 상태: loading/empty/error, 반응형 네비게이션, 모달 포커스 같은 화면 상태는 DB 스키마가 아니라 화면 정의서와 구현 규칙에서 다룬다.
- API endpoint 경로: API 정의서 산출물에서 다룬다.

## 5. 최종 개발 산출물 상태(Final Development Artifact Status)

이 문서는 개발 투입 기준의 최종 스키마 정의서다. 자동화/검증용 JSON은 같은 run 디렉터리에 보관하되, 개발자는 우선 이 문서를 기준으로 DB schema, migration, API request/response persistence 범위를 추적한다.

### 커버리지 요약

| 항목 | 결과 |
| --- | --- |
| 선택 영역 | admin, site, server |
| 추가 범위 메모 | AI 채팅관련은 별도로 REST API로 받을 예정이다. 자체 구현은 생략한다. |
| 스키마 수 | 26개 |
| feature mapping | 23/23 features mapped |
| 미매핑 feature | 0개 |
| schema coverage JSON | `schema-coverage.json` |

### 재사용 판단 요약

| 재사용 판정 | schema 수 |
| --- | ---: |
| REUSE | 2 |
| EXTEND | 15 |
| NEW | 9 |

### 검증 및 리뷰 결과

| 항목 | 결과 | 산출 파일 |
| --- | --- | --- |
| 구조 검증 | pass, error 0, warning 0 | `schema-definition.validation.json` |
| 자체 리뷰 | pass, error 0, warning 0, info 1 | `schema-definition.review.json`, `schema-definition-review.md` |
| 보완 루프 | 완료, 남은 허용 warning 없음 | `schema-definition-loop.md` |

### 개발 사용 기준

- 이 문서의 `SCH-###`는 API 정의서와 migration task의 schema mapping 기준이다.
- `community_communities`, `community_posts`, `community_comments`, `community_votes`, `community_reports`는 product-builder-base community schema를 최대한 재사용하는 전제로 설계한다.
- 외부 AI 채팅은 `ai_chat_sessions`의 외부 REST session/error/recommended doctor cache만 다루며 내부 AI runtime schema를 만들지 않는다.
- 파일 업로드, 저장 의료진, 분석 이벤트, 어드민 2FA, 콘텐츠 안전 로그, 외부 연동 호출 로그, 수정 이력은 API 정의서와 함께 구현한다.
- API endpoint 경로와 request/response 계약은 API 정의서에서 확정한다.
