import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import {
  ACTION,
  BLUEPRINTS,
  CLOUDFLARE_STREAM_DIRECT_UPLOADS_DOCS_URL,
  CLOUDFLARE_STREAM_DOCS_URL,
  CLOUDFLARE_STREAM_SIGNED_URLS_DOCS_URL,
  CLOUDFLARE_STREAM_TUS_UPLOADS_DOCS_URL,
  CLOUDFLARE_STREAM_WEBHOOKS_DOCS_URL,
  DATA,
  INICIS_BILLING_MANUAL_URL,
  INICIS_STDPAY_PC_MANUAL_URL,
  INITIAL_SUPER_ADMIN_EMAIL,
  INITIAL_SUPER_ADMIN_PASSWORD,
  KCB_OKNAME_SERVICE_URL,
  KCB_SERVICE_INTRO_URL,
  ONLINE_SERVICE_BLUEPRINT,
  PRODUCT_BUILDER_BASE_DEFAULT_BRANCH,
  PRODUCT_BUILDER_BASE_GITHUB_URL,
  PRODUCT_BUILDER_BASE_LOCAL_PATH,
  PRODUCT_BUILDER_BASE_REUSE_SOURCES,
  RAILWAY_JAVA_DEPLOY_DOCS_URL,
  RAILWAY_PRIVATE_NETWORKING_DOCS_URL,
  RAILWAY_VARIABLES_DOCS_URL,
  VERCEL_BLOB_CLIENT_UPLOAD_DOCS_URL,
  VERCEL_BLOB_DOCS_URL,
  VERCEL_BLOB_SERVER_UPLOAD_DOCS_URL,
  WEB_APPLICATION_SERVICE_BLUEPRINT,
  applyDecisionOverrides,
  buildIssueDescription,
  buildProductBuilderTasks,
  buildRootIssueDescription,
  getBlueprint,
  mergeIntake,
  type ProductBuilderBuildSummary,
  type ProductBuilderOverview,
} from "../src/contract.js";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";

describe("Product Builder plugin", () => {
  it("declares the online service blueprint with the fixed stack decisions", () => {
    expect(manifest.displayName).toBe("Product Builder");
    expect(manifest.capabilities).toContain("projects.managed");
    expect(manifest.capabilities).toContain("issues.create");
    expect(manifest.capabilities).toContain("ui.page.register");
    expect(manifest.agents?.map((agent) => agent.agentKey)).toEqual(expect.arrayContaining([
      "product-builder-orchestrator",
      "product-builder-backend",
      "product-builder-frontend",
      "product-builder-platform",
      "product-builder-ai-runtime",
      "product-builder-qa",
    ]));
    expect(BLUEPRINTS.map((entry) => entry.id)).toEqual([
      "online-service-standard",
      "web-application-service-standard",
    ]);

    const blueprint = getBlueprint("online-service-standard");
    expect(blueprint.displayName).toBe("온라인 서비스");
    expect(blueprint.defaultStack.web).toContain("Next.js");
    expect(blueprint.defaultStack.api).toContain("REST");
    expect(blueprint.defaultStack.database).toContain("Neon");
    expect(blueprint.defaultStack.deploy).toContain("Vercel");
    expect(blueprint.defaultStack.contract).toContain("no tRPC");
    expect(blueprint.defaultFeatureSelection.notification.emailResend).toBe(true);
    expect(blueprint.defaultFeatureSelection.notification.alimtalk).toBe(false);
    expect(blueprint.defaultFeatureSelection.community.enabled).toBe(false);
    expect(blueprint.defaultFeatureSelection.fileUpload.vercelBlob).toBe(true);
    expect(blueprint.defaultFeatureSelection.videoLecture.cloudflareStream).toBe(false);
    expect(blueprint.defaultFeatureSelection.identityVerification.kcb).toBe(false);
    expect(blueprint.baseRepository.name).toBe("product-builder-base");
    expect(blueprint.baseRepository.seedSource).toContain(PRODUCT_BUILDER_BASE_GITHUB_URL);
    expect(blueprint.baseRepository.seedSource).toContain(PRODUCT_BUILDER_BASE_LOCAL_PATH);
    expect(blueprint.baseRepository.seedSource).toContain(PRODUCT_BUILDER_BASE_DEFAULT_BRANCH);
    expect(blueprint.tasks.some((task) => task.decision === "REUSE")).toBe(true);
    expect(blueprint.tasks.some((task) => task.decision === "EXTEND")).toBe(true);
    expect(blueprint.tasks.some((task) => task.decision === "NEW")).toBe(true);
    expect(blueprint.tasks.some((task) => task.decision === "N/A")).toBe(true);

    const taskKeys = blueprint.tasks.map((task) => task.key);
    const tasksByKey = new Map(blueprint.tasks.map((task) => [task.key, task]));
    expect(taskKeys).toEqual(expect.arrayContaining([
      "PB-PLAN-001",
      "PB-REUSE-001",
      "PB-BASE-001",
      "PB-REPO-001",
      "PB-FOUND-001",
      "PB-INFRA-001",
      "PB-INFRA-002",
      "PB-API-001",
      "PB-AUTH-001",
      "PB-AUTH-EMAIL-001",
      "PB-AUTH-SIGNUP-POLICY-001",
      "PB-AUTH-OAUTH-GOOGLE-001",
      "PB-AUTH-OAUTH-KAKAO-001",
      "PB-AUTH-OAUTH-NAVER-001",
      "PB-AUTH-003",
      "PB-SET-001",
      "PB-AUTH-PROFILE-READ-001",
      "PB-AUTH-PROFILE-UPDATE-001",
      "PB-AUTH-EMAIL-CHANGE-001",
      "PB-AUTH-PASSWORD-CHANGE-001",
      "PB-AUTH-SESSIONS-LIST-001",
      "PB-AUTH-SESSIONS-REVOKE-001",
      "PB-AUTH-ACCOUNT-DELETE-001",
      "PB-AUTH-QA-001",
      "PB-FILE-001",
      "PB-FILE-DATA-001",
      "PB-FILE-API-CREATE-001",
      "PB-FILE-API-COMPLETE-001",
      "PB-FILE-API-LIST-001",
      "PB-FILE-API-READ-001",
      "PB-FILE-API-UPDATE-001",
      "PB-FILE-API-DELETE-001",
      "PB-FILE-UI-001",
      "PB-FILE-ADMIN-001",
      "PB-FILE-QA-001",
      "PB-VIDEO-001",
      "PB-VIDEO-DATA-001",
      "PB-VIDEO-API-UPLOAD-001",
      "PB-VIDEO-WEBHOOK-001",
      "PB-VIDEO-API-LIST-001",
      "PB-VIDEO-API-READ-001",
      "PB-VIDEO-API-UPDATE-001",
      "PB-VIDEO-API-DELETE-001",
      "PB-VIDEO-API-PLAYBACK-001",
      "PB-VIDEO-API-PROGRESS-001",
      "PB-VIDEO-PLAYER-UI-001",
      "PB-VIDEO-ADMIN-001",
      "PB-VIDEO-QA-001",
      "PB-IDV-KCB-001",
      "PB-IDV-KCB-JAR-001",
      "PB-IDV-KCB-DATA-001",
      "PB-IDV-KCB-API-SESSION-001",
      "PB-IDV-KCB-CALLBACK-001",
      "PB-IDV-KCB-API-STATUS-001",
      "PB-IDV-KCB-UI-001",
      "PB-IDV-KCB-ADMIN-001",
      "PB-IDV-KCB-QA-001",
      "PB-FEAT-001",
      "PB-FEAT-002",
      "PB-FEAT-003",
      "PB-PAY-001",
      "PB-PAY-REUSE-AUDIT-001",
      "PB-PAY-DATA-001",
      "PB-PAY-ONETIME-001",
      "PB-PAY-SUBSCRIPTION-001",
      "PB-PAY-CATALOG-API-LIST-001",
      "PB-PAY-CATALOG-API-CREATE-001",
      "PB-PAY-CATALOG-API-UPDATE-001",
      "PB-PAY-CATALOG-API-DELETE-001",
      "PB-PAY-CHECKOUT-API-001",
      "PB-PAY-WEBHOOK-API-001",
      "PB-PAY-ENTITLEMENT-001",
      "PB-PAY-ORDER-API-001",
      "PB-PAY-REFUND-API-001",
      "PB-PAY-POLAR-001",
      "PB-PAY-POLAR-CHECKOUT-001",
      "PB-PAY-POLAR-WEBHOOK-001",
      "PB-PAY-POLAR-REFUND-001",
      "PB-PAY-INICIS-001",
      "PB-PAY-INICIS-CHECKOUT-001",
      "PB-PAY-INICIS-APPROVAL-001",
      "PB-PAY-INICIS-WEBHOOK-001",
      "PB-PAY-INICIS-CANCEL-001",
      "PB-PAY-INICIS-COMPAT-001",
      "PB-PAY-QA-001",
      "PB-COMM-001",
      "PB-COMM-DATA-001",
      "PB-COMM-SPACE-API-LIST-001",
      "PB-COMM-SPACE-API-CREATE-001",
      "PB-COMM-SPACE-API-UPDATE-001",
      "PB-COMM-SPACE-API-DELETE-001",
      "PB-COMM-MEMBERSHIP-API-001",
      "PB-COMM-MEMBER-API-001",
      "PB-COMM-MODERATOR-API-001",
      "PB-COMM-POST-API-LIST-001",
      "PB-COMM-POST-API-READ-001",
      "PB-COMM-POST-API-CREATE-001",
      "PB-COMM-POST-API-UPDATE-001",
      "PB-COMM-POST-API-DELETE-001",
      "PB-COMM-POST-OPS-API-001",
      "PB-COMM-COMMENT-API-LIST-001",
      "PB-COMM-COMMENT-API-CREATE-001",
      "PB-COMM-COMMENT-API-UPDATE-001",
      "PB-COMM-COMMENT-API-DELETE-001",
      "PB-COMM-COMMENT-OPS-API-001",
      "PB-COMM-REACTION-API-LIST-001",
      "PB-COMM-REACTION-API-SET-001",
      "PB-COMM-REACTION-API-DELETE-001",
      "PB-COMM-POLL-API-001",
      "PB-COMM-FEED-RANKING-API-001",
      "PB-COMM-KARMA-API-001",
      "PB-COMM-REPORT-API-CREATE-001",
      "PB-COMM-BLOCK-API-CREATE-001",
      "PB-COMM-BLOCK-API-DELETE-001",
      "PB-COMM-HIDE-API-CREATE-001",
      "PB-COMM-HIDE-API-DELETE-001",
      "PB-COMM-FILTER-API-001",
      "PB-COMM-RULES-FLAIR-API-001",
      "PB-COMM-MODERATION-API-LIST-001",
      "PB-COMM-MODERATION-API-ACTION-001",
      "PB-COMM-SANCTION-APPEAL-API-001",
      "PB-COMM-TIER-ONBOARDING-API-001",
      "PB-COMM-API-001",
      "PB-COMM-SAFETY-001",
      "PB-COMM-UI-001",
      "PB-COMM-ADMIN-001",
      "PB-COMM-ADMIN-STATS-001",
      "PB-COMM-QA-001",
      "PB-NOTI-001",
      "PB-NOTI-EMAIL-RESEND-001",
      "PB-NOTI-EMAIL-DATA-001",
      "PB-NOTI-EMAIL-TEMPLATE-001",
      "PB-NOTI-EMAIL-API-LIST-001",
      "PB-NOTI-EMAIL-API-CREATE-001",
      "PB-NOTI-EMAIL-API-UPDATE-001",
      "PB-NOTI-EMAIL-API-DELETE-001",
      "PB-NOTI-EMAIL-SEND-001",
      "PB-NOTI-EMAIL-ADMIN-001",
      "PB-NOTI-EMAIL-QA-001",
      "PB-NOTI-ALIMTALK-001",
      "PB-NOTI-ALIMTALK-DATA-001",
      "PB-NOTI-ALIMTALK-API-LIST-001",
      "PB-NOTI-ALIMTALK-API-CREATE-001",
      "PB-NOTI-ALIMTALK-API-UPDATE-001",
      "PB-NOTI-ALIMTALK-API-DELETE-001",
      "PB-NOTI-ALIMTALK-SEND-001",
      "PB-NOTI-ALIMTALK-ADMIN-001",
      "PB-NOTI-ALIMTALK-QA-001",
      "PB-ADMIN-SUPER-ACCOUNT-001",
      "PB-ADMIN-001",
      "PB-ADMIN-USERS-001",
      "PB-ADMIN-USERS-LIST-001",
      "PB-ADMIN-USERS-READ-001",
      "PB-ADMIN-USERS-CREATE-001",
      "PB-ADMIN-USERS-UPDATE-001",
      "PB-ADMIN-USERS-STATUS-001",
      "PB-ADMIN-USERS-DELETE-001",
      "PB-ADMIN-USERS-QA-001",
      "PB-ADMIN-PAY-001",
      "PB-ADMIN-PAY-LIST-001",
      "PB-ADMIN-PAY-READ-001",
      "PB-ADMIN-PAY-REFUND-001",
      "PB-ADMIN-PAY-ENTITLEMENT-001",
      "PB-ADMIN-PAY-REPORT-001",
      "PB-ADMIN-PAY-QA-001",
      "PB-QA-001",
      "PB-OPS-001",
      "PB-DEPLOY-VERIFY-001",
      "PB-LAUNCH-SMOKE-001",
      "PB-PORT-001",
    ]));
    expect(tasksByKey.get("PB-WEB-001")?.surfaces).toEqual(["landing"]);
    expect(tasksByKey.get("PB-WEB-001")?.targetPaths).toContain("apps/web");
    expect(tasksByKey.get("PB-WEB-002")?.surfaces).toEqual(["app"]);
    expect(tasksByKey.get("PB-WEB-002")?.targetPaths).toContain("apps/app");
    expect(tasksByKey.get("PB-ADMIN-USERS-001")?.surfaces).toEqual(["admin"]);
    expect(tasksByKey.get("PB-ADMIN-USERS-001")?.targetPaths).toContain("apps/admin");
    expect(tasksByKey.get("PB-ADMIN-SUPER-ACCOUNT-001")?.priority).toBe("critical");
    expect(tasksByKey.get("PB-ADMIN-SUPER-ACCOUNT-001")?.description).toContain(INITIAL_SUPER_ADMIN_EMAIL);
    expect(tasksByKey.get("PB-ADMIN-SUPER-ACCOUNT-001")?.description).toContain(INITIAL_SUPER_ADMIN_PASSWORD);
    expect(tasksByKey.get("PB-ADMIN-SUPER-ACCOUNT-001")?.acceptanceCriteria.join("\n")).toContain("비밀번호 교체");
    expect(tasksByKey.get("PB-ADMIN-001")?.dependsOn).toContain("PB-ADMIN-SUPER-ACCOUNT-001");
    expect(tasksByKey.get("PB-AUTH-PROFILE-READ-001")?.title).toContain("조회");
    expect(tasksByKey.get("PB-AUTH-SIGNUP-POLICY-001")?.title).toContain("가입 정책");
    expect(tasksByKey.get("PB-AUTH-SIGNUP-POLICY-001")?.acceptanceCriteria.join("\n")).toContain("필수 약관");
    expect(tasksByKey.get("PB-AUTH-002")?.acceptanceCriteria.join("\n")).toContain("guest/user/admin/super_admin");
    expect(tasksByKey.get("PB-AUTH-PROFILE-UPDATE-001")?.title).toContain("수정");
    expect(tasksByKey.get("PB-AUTH-SESSIONS-REVOKE-001")?.title).toContain("해제");
    expect(tasksByKey.get("PB-AUTH-QA-001")?.surfaces).toEqual(["qa"]);
    expect(tasksByKey.get("PB-AUTH-002")?.surfaces).toEqual(["api", "app", "admin"]);
    expect(tasksByKey.get("PB-AUTH-001")?.reuseSource).toBe(PRODUCT_BUILDER_BASE_REUSE_SOURCES.authSessionCore);
    expect(tasksByKey.get("PB-AUTH-EMAIL-001")?.reuseSource).toBe(PRODUCT_BUILDER_BASE_REUSE_SOURCES.authEmail);
    expect(tasksByKey.get("PB-AUTH-003")?.reuseSource).toBe(PRODUCT_BUILDER_BASE_REUSE_SOURCES.authPublicActionModal);
    expect(tasksByKey.get("PB-AUTH-001")?.reuseSource).toContain("product-builder-base:packages/features/auth/session-core@<base-ref>");
    expect(tasksByKey.get("PB-FILE-001")?.reuseSource).toBe(PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadCore);
    expect(tasksByKey.get("PB-FILE-001")?.description).toContain(VERCEL_BLOB_DOCS_URL);
    expect(tasksByKey.get("PB-FILE-001")?.description).toContain(VERCEL_BLOB_CLIENT_UPLOAD_DOCS_URL);
    expect(tasksByKey.get("PB-FILE-001")?.description).toContain(VERCEL_BLOB_SERVER_UPLOAD_DOCS_URL);
    expect(tasksByKey.get("PB-FILE-001")?.acceptanceCriteria.join("\n")).toContain("BLOB_READ_WRITE_TOKEN");
    expect(tasksByKey.get("PB-FILE-DATA-001")?.title).toContain("metadata");
    expect(tasksByKey.get("PB-FILE-API-CREATE-001")?.title).toContain("생성/token API");
    expect(tasksByKey.get("PB-FILE-API-COMPLETE-001")?.title).toContain("완료 확정 API");
    expect(tasksByKey.get("PB-FILE-API-LIST-001")?.title).toContain("목록 조회 API");
    expect(tasksByKey.get("PB-FILE-API-READ-001")?.title).toContain("상세/접근 URL API");
    expect(tasksByKey.get("PB-FILE-API-UPDATE-001")?.title).toContain("수정 API");
    expect(tasksByKey.get("PB-FILE-API-DELETE-001")?.title).toContain("삭제/Blob 정리 API");
    expect(tasksByKey.get("PB-FILE-UI-001")?.surfaces).toEqual(["shared", "app", "admin"]);
    expect(tasksByKey.get("PB-FILE-ADMIN-001")?.surfaces).toEqual(["admin"]);
    expect(tasksByKey.get("PB-FILE-QA-001")?.surfaces).toEqual(["qa", "ops"]);
    expect(tasksByKey.get("PB-FILE-QA-001")?.acceptanceCriteria.join("\n")).toContain("base 구현");
    expect(tasksByKey.get("PB-VIDEO-001")?.reuseSource).toBe(PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureCore);
    expect(tasksByKey.get("PB-VIDEO-001")?.description).toContain(CLOUDFLARE_STREAM_DOCS_URL);
    expect(tasksByKey.get("PB-VIDEO-001")?.description).toContain(CLOUDFLARE_STREAM_DIRECT_UPLOADS_DOCS_URL);
    expect(tasksByKey.get("PB-VIDEO-001")?.description).toContain(CLOUDFLARE_STREAM_TUS_UPLOADS_DOCS_URL);
    expect(tasksByKey.get("PB-VIDEO-001")?.description).toContain(CLOUDFLARE_STREAM_SIGNED_URLS_DOCS_URL);
    expect(tasksByKey.get("PB-VIDEO-001")?.description).toContain(CLOUDFLARE_STREAM_WEBHOOKS_DOCS_URL);
    expect(tasksByKey.get("PB-VIDEO-DATA-001")?.title).toContain("metadata");
    expect(tasksByKey.get("PB-VIDEO-API-UPLOAD-001")?.title).toContain("direct upload");
    expect(tasksByKey.get("PB-VIDEO-WEBHOOK-001")?.title).toContain("webhook");
    expect(tasksByKey.get("PB-VIDEO-API-LIST-001")?.title).toContain("목록 API");
    expect(tasksByKey.get("PB-VIDEO-API-READ-001")?.title).toContain("상세/status API");
    expect(tasksByKey.get("PB-VIDEO-API-UPDATE-001")?.title).toContain("수정 API");
    expect(tasksByKey.get("PB-VIDEO-API-DELETE-001")?.title).toContain("archive/delete API");
    expect(tasksByKey.get("PB-VIDEO-API-PLAYBACK-001")?.description).toContain(CLOUDFLARE_STREAM_SIGNED_URLS_DOCS_URL);
    expect(tasksByKey.get("PB-VIDEO-API-PROGRESS-001")?.title).toContain("진행률");
    expect(tasksByKey.get("PB-VIDEO-PLAYER-UI-001")?.surfaces).toEqual(["landing", "app"]);
    expect(tasksByKey.get("PB-VIDEO-ADMIN-001")?.surfaces).toEqual(["admin"]);
    expect(tasksByKey.get("PB-VIDEO-QA-001")?.surfaces).toEqual(["qa", "ops"]);
    expect(tasksByKey.get("PB-VIDEO-QA-001")?.acceptanceCriteria.join("\n")).toContain("Cloudflare account id");
    expect(tasksByKey.get("PB-IDV-KCB-001")?.reuseSource).toBe(PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationKcbCore);
    expect(tasksByKey.get("PB-IDV-KCB-001")?.description).toContain(KCB_OKNAME_SERVICE_URL);
    expect(tasksByKey.get("PB-IDV-KCB-001")?.description).toContain(KCB_SERVICE_INTRO_URL);
    expect(tasksByKey.get("PB-IDV-KCB-001")?.acceptanceCriteria.join("\n")).toContain("JAR 파일명");
    expect(tasksByKey.get("PB-IDV-KCB-JAR-001")?.reuseSource).toBe(PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationKcbJarBridge);
    expect(tasksByKey.get("PB-IDV-KCB-JAR-001")?.description).toContain(RAILWAY_JAVA_DEPLOY_DOCS_URL);
    expect(tasksByKey.get("PB-IDV-KCB-JAR-001")?.description).toContain(RAILWAY_PRIVATE_NETWORKING_DOCS_URL);
    expect(tasksByKey.get("PB-IDV-KCB-JAR-001")?.acceptanceCriteria.join("\n")).toContain(RAILWAY_VARIABLES_DOCS_URL);
    expect(tasksByKey.get("PB-IDV-KCB-API-SESSION-001")?.dependsOn).toContain("PB-IDV-KCB-JAR-001");
    expect(tasksByKey.get("PB-IDV-KCB-DATA-001")?.title).toContain("결과/동의 데이터 모델");
    expect(tasksByKey.get("PB-IDV-KCB-DATA-001")?.acceptanceCriteria.join("\n")).toContain("주민등록번호");
    expect(tasksByKey.get("PB-IDV-KCB-API-SESSION-001")?.title).toContain("세션 생성 API");
    expect(tasksByKey.get("PB-IDV-KCB-CALLBACK-001")?.title).toContain("callback/결과 검증 API");
    expect(tasksByKey.get("PB-IDV-KCB-API-STATUS-001")?.title).toContain("상태/재시도 API");
    expect(tasksByKey.get("PB-IDV-KCB-UI-001")?.surfaces).toEqual(["landing", "app"]);
    expect(tasksByKey.get("PB-IDV-KCB-ADMIN-001")?.surfaces).toEqual(["admin"]);
    expect(tasksByKey.get("PB-IDV-KCB-QA-001")?.surfaces).toEqual(["qa", "ops"]);
    expect(tasksByKey.get("PB-IDV-KCB-QA-001")?.acceptanceCriteria.join("\n")).toContain("KCB 테스트/운영 site code");
    expect(tasksByKey.get("PB-BASE-001")?.acceptanceCriteria.join("\n")).toContain("tag 또는 commit SHA");
    expect(tasksByKey.get("PB-BASE-001")?.acceptanceCriteria.join("\n")).toContain("출처 path/ref");
    expect(taskKeys.indexOf("PB-FEAT-001")).toBeLessThan(taskKeys.indexOf("PB-BASE-001"));
    expect(taskKeys.indexOf("PB-FEAT-003")).toBeLessThan(taskKeys.indexOf("PB-AUTH-001"));
    expect(taskKeys.indexOf("PB-FILE-001")).toBeGreaterThan(taskKeys.indexOf("PB-DOMAIN-001"));
    expect(taskKeys.indexOf("PB-FILE-QA-001")).toBeLessThan(taskKeys.indexOf("PB-WEB-001"));
    expect(taskKeys.indexOf("PB-VIDEO-001")).toBeGreaterThan(taskKeys.indexOf("PB-FILE-QA-001"));
    expect(taskKeys.indexOf("PB-VIDEO-QA-001")).toBeLessThan(taskKeys.indexOf("PB-WEB-001"));
    expect(taskKeys.indexOf("PB-IDV-KCB-001")).toBeGreaterThan(taskKeys.indexOf("PB-VIDEO-QA-001"));
    expect(taskKeys.indexOf("PB-IDV-KCB-JAR-001")).toBeGreaterThan(taskKeys.indexOf("PB-IDV-KCB-001"));
    expect(taskKeys.indexOf("PB-IDV-KCB-QA-001")).toBeLessThan(taskKeys.indexOf("PB-WEB-001"));
    expect(taskKeys.indexOf("PB-REPO-001")).toBeGreaterThan(taskKeys.indexOf("PB-BASE-001"));
    expect(taskKeys.indexOf("PB-FOUND-001")).toBeGreaterThan(taskKeys.indexOf("PB-REPO-001"));
    expect(taskKeys.indexOf("PB-INFRA-002")).toBeGreaterThan(taskKeys.indexOf("PB-DATA-001"));
    expect(taskKeys.indexOf("PB-DEPLOY-VERIFY-001")).toBeGreaterThan(taskKeys.indexOf("PB-OPS-001"));
    expect(taskKeys.indexOf("PB-LAUNCH-SMOKE-001")).toBeGreaterThan(taskKeys.indexOf("PB-DEPLOY-VERIFY-001"));
    expect(tasksByKey.get("PB-FEAT-002")?.dependsOn).toEqual(["PB-FEAT-001", "PB-REUSE-001", "PB-DECIDE-001"]);
    expect(tasksByKey.get("PB-FEAT-003")?.title).toBe("기능별 issue 확장 결과 검수/락");
    expect(tasksByKey.get("PB-FEAT-003")?.capabilityKey).toBe("domain.feature-issue-lock");
    expect(tasksByKey.get("PB-WEB-001")?.acceptanceCriteria.join("\n")).toContain("비로그인");
    expect(tasksByKey.get("PB-AUTH-003")?.title).toContain("로그인 모달");
    expect(tasksByKey.get("PB-COMM-001")?.description).toContain("리액션");
    expect(tasksByKey.get("PB-COMM-SPACE-API-CREATE-001")?.title).toContain("커뮤니티 생성");
    expect(tasksByKey.get("PB-COMM-SPACE-API-UPDATE-001")?.title).toContain("수정");
    expect(tasksByKey.get("PB-COMM-SPACE-API-DELETE-001")?.title).toContain("삭제");
    expect(tasksByKey.get("PB-COMM-MEMBERSHIP-API-001")?.description).toContain("가입");
    expect(tasksByKey.get("PB-COMM-MODERATOR-API-001")?.description).toContain("모더레이터");
    expect(tasksByKey.get("PB-COMM-POST-API-LIST-001")?.title).toContain("목록");
    expect(tasksByKey.get("PB-COMM-POST-API-CREATE-001")?.title).toContain("생성");
    expect(tasksByKey.get("PB-COMM-POST-API-UPDATE-001")?.title).toContain("수정");
    expect(tasksByKey.get("PB-COMM-POST-API-DELETE-001")?.title).toContain("삭제");
    expect(tasksByKey.get("PB-COMM-COMMENT-API-CREATE-001")?.title).toContain("댓글 생성");
    expect(tasksByKey.get("PB-COMM-POLL-API-001")?.title).toContain("투표");
    expect(tasksByKey.get("PB-COMM-KARMA-API-001")?.title).toContain("karma");
    expect(tasksByKey.get("PB-COMM-RULES-FLAIR-API-001")?.title).toContain("규칙");
    expect(tasksByKey.get("PB-COMM-SANCTION-APPEAL-API-001")?.title).toContain("제재");
    expect(tasksByKey.get("PB-COMM-REACTION-API-SET-001")?.title).toContain("리액션");
    expect(tasksByKey.get("PB-COMM-MODERATION-API-ACTION-001")?.title).toContain("모더레이션 조치");
    expect(tasksByKey.get("PB-COMM-API-001")?.acceptanceCriteria.join("\n")).toContain("list/read/create/update/delete");
    expect(tasksByKey.get("PB-COMM-SAFETY-001")?.description).toContain("Apple/Google");
    expect(tasksByKey.get("PB-COMM-UI-001")?.acceptanceCriteria.join("\n")).toContain("auth modal");
    expect(tasksByKey.get("PB-COMM-ADMIN-001")?.surfaces).toEqual(["admin"]);
    expect(tasksByKey.get("PB-COMM-ADMIN-STATS-001")?.title).toContain("운영 통계");
    expect(tasksByKey.get("PB-COMM-QA-001")?.surfaces).toEqual(["qa"]);
    expect(tasksByKey.get("PB-PAY-REUSE-AUDIT-001")?.reuseSource).toContain("Flotter payment domain");
    expect(tasksByKey.get("PB-PAY-DATA-001")?.capabilityKey).toBe("payment.data-model");
    expect(tasksByKey.get("PB-PAY-CATALOG-API-LIST-001")?.title).toContain("조회 API");
    expect(tasksByKey.get("PB-PAY-CATALOG-API-CREATE-001")?.title).toContain("생성 API");
    expect(tasksByKey.get("PB-PAY-CATALOG-API-UPDATE-001")?.title).toContain("수정 API");
    expect(tasksByKey.get("PB-PAY-CATALOG-API-DELETE-001")?.title).toContain("비활성 API");
    expect(tasksByKey.get("PB-PAY-POLAR-001")?.reuseSource).toContain("Flotter PolarAdapter");
    expect(tasksByKey.get("PB-PAY-POLAR-WEBHOOK-001")?.acceptanceCriteria.join("\n")).toContain("서명 실패");
    expect(tasksByKey.get("PB-PAY-INICIS-001")?.acceptanceCriteria.join("\n")).toContain("계약/심사");
    expect(tasksByKey.get("PB-PAY-INICIS-001")?.description).toContain(INICIS_STDPAY_PC_MANUAL_URL);
    expect(tasksByKey.get("PB-PAY-INICIS-001")?.description).toContain(INICIS_BILLING_MANUAL_URL);
    expect(tasksByKey.get("PB-PAY-INICIS-CHECKOUT-001")?.description).toContain(INICIS_STDPAY_PC_MANUAL_URL);
    expect(tasksByKey.get("PB-PAY-INICIS-APPROVAL-001")?.title).toContain("P_NEXT_URL");
    expect(tasksByKey.get("PB-PAY-INICIS-APPROVAL-001")?.description).toContain(INICIS_STDPAY_PC_MANUAL_URL);
    expect(tasksByKey.get("PB-PAY-INICIS-COMPAT-001")?.description).toContain(INICIS_BILLING_MANUAL_URL);
    expect(tasksByKey.get("PB-PAY-INICIS-COMPAT-001")?.acceptanceCriteria.join("\n")).toContain("일반결제 공식 매뉴얼만 보고 정기결제를 추론하지 않는다");
    expect(tasksByKey.get("PB-PAY-INICIS-COMPAT-001")?.title).toContain("구독/정기결제 gap");
    expect(tasksByKey.get("PB-PAY-QA-001")?.surfaces).toEqual(["qa", "ops"]);
    expect(tasksByKey.get("PB-NOTI-EMAIL-RESEND-001")?.capabilityKey).toBe("notification.email.resend");
    expect(tasksByKey.get("PB-NOTI-EMAIL-DATA-001")?.capabilityKey).toBe("notification.email.data-model");
    expect(tasksByKey.get("PB-NOTI-EMAIL-TEMPLATE-001")?.capabilityKey).toBe("notification.email.template-manager");
    expect(tasksByKey.get("PB-NOTI-EMAIL-API-CREATE-001")?.title).toContain("생성 API");
    expect(tasksByKey.get("PB-NOTI-EMAIL-API-UPDATE-001")?.title).toContain("수정/발행 API");
    expect(tasksByKey.get("PB-NOTI-EMAIL-API-DELETE-001")?.title).toContain("삭제/비활성 API");
    expect(tasksByKey.get("PB-NOTI-EMAIL-ADMIN-001")?.surfaces).toEqual(["admin"]);
    expect(tasksByKey.get("PB-NOTI-EMAIL-QA-001")?.surfaces).toEqual(["qa"]);
    expect(tasksByKey.get("PB-NOTI-ALIMTALK-001")?.capabilityKey).toBe("notification.alimtalk");
    expect(tasksByKey.get("PB-NOTI-ALIMTALK-API-LIST-001")?.title).toContain("조회 API");
    expect(tasksByKey.get("PB-NOTI-ALIMTALK-API-CREATE-001")?.title).toContain("생성 API");
    expect(tasksByKey.get("PB-NOTI-ALIMTALK-API-UPDATE-001")?.title).toContain("수정/승인상태 동기화 API");
    expect(tasksByKey.get("PB-NOTI-ALIMTALK-API-DELETE-001")?.title).toContain("삭제/비활성 API");
    expect(tasksByKey.get("PB-NOTI-ALIMTALK-ADMIN-001")?.surfaces).toEqual(["admin"]);
    expect(tasksByKey.get("PB-NOTI-ALIMTALK-QA-001")?.acceptanceCriteria.join("\n")).toContain("CRUD 4개 API");
    expect(tasksByKey.get("PB-ADMIN-DOMAIN-LIST-001")?.title).toContain("목록");
    expect(tasksByKey.get("PB-ADMIN-DOMAIN-CREATE-001")?.title).toContain("생성");
    expect(tasksByKey.get("PB-ADMIN-DOMAIN-UPDATE-001")?.title).toContain("수정");
    expect(tasksByKey.get("PB-ADMIN-DOMAIN-DELETE-001")?.title).toContain("비활성");
    expect(tasksByKey.get("PB-ADMIN-USERS-LIST-001")?.title).toContain("목록");
    expect(tasksByKey.get("PB-ADMIN-USERS-CREATE-001")?.title).toContain("초대");
    expect(tasksByKey.get("PB-ADMIN-USERS-STATUS-001")?.title).toContain("status");
    expect(tasksByKey.get("PB-ADMIN-PAY-REFUND-001")?.title).toContain("환불");
    expect(tasksByKey.get("PB-ADMIN-PAY-QA-001")?.surfaces).toEqual(["qa"]);
    expect(tasksByKey.get("PB-LAUNCH-SMOKE-001")?.acceptanceCriteria.join("\n")).toContain(INITIAL_SUPER_ADMIN_EMAIL);
    expect(tasksByKey.get("PB-LAUNCH-SMOKE-001")?.acceptanceCriteria.join("\n")).toContain("보호 기능 CTA");

    const taskTemplateText = blueprint.tasks
      .map((task) => `${task.title}\n${task.description}`)
      .join("\n");
    expect(blueprint.defaultIntake.productName).toBe("");
    expect(blueprint.defaultIntake.referenceService).toBe("");
    expect(taskTemplateText).not.toMatch(/기본 intake 예시|참고 서비스 예시/);
  });

  it("declares the web application workflow separately from the online service workflow", () => {
    const blueprint = getBlueprint("web-application-service-standard");
    expect(blueprint.displayName).toBe("웹 어플리케이션 서비스");
    expect(blueprint.productClass).toContain("SPA");
    expect(blueprint.defaultStack.web).toContain("Vite React SPA");
    expect(blueprint.defaultStack.ai).toContain("AI server");
    expect(blueprint.defaultStack.contract).toContain("no tRPC");

    const taskKeys = blueprint.tasks.map((task) => task.key);
    expect(taskKeys.indexOf("PB-AISRV-001")).toBeGreaterThan(taskKeys.indexOf("PB-AI-001"));
    expect(taskKeys.indexOf("PB-AISRV-003")).toBeLessThan(taskKeys.indexOf("PB-QA-001"));
    expect(taskKeys).toEqual(expect.arrayContaining([
      "PB-WEB-001",
      "PB-AISRV-001",
      "PB-AISRV-002",
      "PB-AISRV-003",
      "PB-ADMIN-SUPER-ACCOUNT-001",
      "PB-ADMIN-USERS-001",
      "PB-ADMIN-PAY-001",
    ]));

    const spaTask = blueprint.tasks.find((task) => task.key === "PB-WEB-001");
    const authGateTask = blueprint.tasks.find((task) => task.key === "PB-AUTH-003");
    const qaTask = blueprint.tasks.find((task) => task.key === "PB-QA-002");
    expect(spaTask?.title).toContain("SPA");
    expect(spaTask?.description).not.toMatch(/SEO 공개 페이지/);
    expect(spaTask?.surfaces).toEqual(["app"]);
    expect(spaTask?.targetPaths).toEqual(["apps/app"]);
    expect(authGateTask?.title).toContain("SPA 로그인");
    expect(authGateTask?.surfaces).toEqual(["app"]);
    expect(blueprint.tasks.find((task) => task.key === "PB-AISRV-001")?.surfaces).toEqual(["ai-server"]);
    expect(qaTask?.dependsOn).toContain("PB-AISRV-002");
    expect(blueprint.tasks).toHaveLength(ONLINE_SERVICE_BLUEPRINT.tasks.length + 3);
  });

  it("renders root and child issue descriptions with fixed-workflow decision metadata", () => {
    const intake = mergeIntake({ productName: "표준 온라인 서비스" });
    const task = ONLINE_SERVICE_BLUEPRINT.tasks.find((entry) => entry.key === "PB-API-001");
    const reuseTask = ONLINE_SERVICE_BLUEPRINT.tasks.find((entry) => entry.key === "PB-AUTH-001");
    const inicisTask = ONLINE_SERVICE_BLUEPRINT.tasks.find((entry) => entry.key === "PB-PAY-INICIS-COMPAT-001");
    const fileTask = ONLINE_SERVICE_BLUEPRINT.tasks.find((entry) => entry.key === "PB-FILE-001");
    const videoTask = ONLINE_SERVICE_BLUEPRINT.tasks.find((entry) => entry.key === "PB-VIDEO-001");
    const skippedTask = ONLINE_SERVICE_BLUEPRINT.tasks.find((entry) => entry.key === "PB-PORT-001");
    expect(task).toBeTruthy();
    expect(reuseTask).toBeTruthy();
    expect(inicisTask).toBeTruthy();
    expect(fileTask).toBeTruthy();
    expect(videoTask).toBeTruthy();
    expect(skippedTask).toBeTruthy();

    const root = buildRootIssueDescription({
      blueprint: ONLINE_SERVICE_BLUEPRINT,
      intake,
      buildId: "pb-test",
      tasks: ONLINE_SERVICE_BLUEPRINT.tasks,
    });
    expect(root).toContain("Product Builder Build: 표준 온라인 서비스");
    expect(root).toContain("REST + OpenAPI");
    expect(root).toContain("Neon Postgres");
    expect(root).toContain("product-builder-base");
    expect(root).toContain(PRODUCT_BUILDER_BASE_GITHUB_URL);
    expect(root).toContain(PRODUCT_BUILDER_BASE_LOCAL_PATH);
    expect(root).toContain(PRODUCT_BUILDER_BASE_DEFAULT_BRANCH);
    expect(root).toContain("Feature Selection");
    expect(root).toContain("Domain Features");
    expect(root).toContain("Initial Super Account");
    expect(root).toContain(INITIAL_SUPER_ADMIN_EMAIL);
    expect(root).toContain(INITIAL_SUPER_ADMIN_PASSWORD);
    expect(root).toContain("Delivery Gates");
    expect(root).toContain("PB-LAUNCH-SMOKE-001");
    expect(root).toContain("PB-ADMIN-SUPER-ACCOUNT-001");
    expect(root).toContain("인증: email");
    expect(root).toContain("알림: Email(Resend)");
    expect(root).toContain("파일 업로드: Vercel Blob");
    expect(root).toContain("영상 강의: N/A");
    expect(root).toContain("커뮤니티: N/A");
    expect(root).toContain("fixed 온라인 서비스 task list");
    expect(root).toContain("expands approved domain feature cards");
    expect(root).toContain("completed SKIP decision records");
    expect(root).not.toContain("Commercial model");

    const child = buildIssueDescription({
      blueprint: ONLINE_SERVICE_BLUEPRINT,
      intake,
      task: task!,
      buildId: "pb-test",
    });
    expect(child).toContain("Decision");
    expect(child).toContain("`NEW`");
    expect(child).toContain("Handling");
    expect(child).toContain("Area");
    expect(child).toContain("서버/API");
    expect(child).toContain("apps/api");
    expect(child).toContain("api.rest-openapi");
    expect(child).toContain("Execution Requirements");
    expect(child).toContain("PB-REPO-001");
    expect(child).toContain("tRPC");
    expect(child).not.toContain("Commercial model");

    const reuseChild = buildIssueDescription({
      blueprint: ONLINE_SERVICE_BLUEPRINT,
      intake,
      task: reuseTask!,
      buildId: "pb-test",
    });
    expect(reuseChild).toContain("Reuse Contract");
    expect(reuseChild).toContain("product-builder-base:packages/features/auth/session-core@<base-ref>");
    expect(reuseChild).toContain("base repo URL/path, tag or commit SHA");
    expect(reuseChild).toContain("not a valid REUSE issue");

    const inicisChild = buildIssueDescription({
      blueprint: ONLINE_SERVICE_BLUEPRINT,
      intake,
      task: inicisTask!,
      buildId: "pb-test",
    });
    expect(inicisChild).toContain(INICIS_BILLING_MANUAL_URL);
    expect(inicisChild).toContain(INICIS_STDPAY_PC_MANUAL_URL);
    expect(inicisChild).toContain("일반결제 공식 매뉴얼만 보고 정기결제를 추론하지 않는다");

    const fileChild = buildIssueDescription({
      blueprint: ONLINE_SERVICE_BLUEPRINT,
      intake,
      task: fileTask!,
      buildId: "pb-test",
    });
    expect(fileChild).toContain("Source/Extension Contract");
    expect(fileChild).toContain(PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadCore);
    expect(fileChild).toContain(VERCEL_BLOB_DOCS_URL);
    expect(fileChild).toContain(VERCEL_BLOB_CLIENT_UPLOAD_DOCS_URL);
    expect(fileChild).toContain(VERCEL_BLOB_SERVER_UPLOAD_DOCS_URL);
    expect(fileChild).toContain("BLOB_READ_WRITE_TOKEN");
    expect(fileChild).toContain("base 구현");

    const videoChild = buildIssueDescription({
      blueprint: ONLINE_SERVICE_BLUEPRINT,
      intake,
      task: videoTask!,
      buildId: "pb-test",
    });
    expect(videoChild).toContain("`N/A`");
    expect(videoChild).toContain(PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureCore);
    expect(videoChild).toContain(CLOUDFLARE_STREAM_DOCS_URL);
    expect(videoChild).toContain(CLOUDFLARE_STREAM_DIRECT_UPLOADS_DOCS_URL);
    expect(videoChild).toContain(CLOUDFLARE_STREAM_TUS_UPLOADS_DOCS_URL);
    expect(videoChild).toContain(CLOUDFLARE_STREAM_SIGNED_URLS_DOCS_URL);
    expect(videoChild).toContain(CLOUDFLARE_STREAM_WEBHOOKS_DOCS_URL);
    expect(videoChild).toContain("Cloudflare account id");

    const skippedChild = buildIssueDescription({
      blueprint: ONLINE_SERVICE_BLUEPRINT,
      intake,
      task: skippedTask!,
      buildId: "pb-test",
    });
    expect(skippedChild).toContain("`N/A`");
    expect(skippedChild).toContain("SKIP record");
    expect(skippedChild).toContain("별도 porting workflow");
  });

  it("maps selected features to task decisions without dropping fixed tasks", () => {
    const tasks = applyDecisionOverrides(
      ONLINE_SERVICE_BLUEPRINT,
      {
        "PB-AUTH-OAUTH-NAVER-001": "REUSE",
      },
      {
        auth: {
          enabled: true,
          email: true,
          oauthGoogle: true,
          oauthKakao: false,
          oauthNaver: false,
        },
        payment: {
          enabled: true,
          oneTime: true,
          subscription: false,
        },
        notification: {
          emailResend: true,
          alimtalk: true,
        },
        community: {
          enabled: true,
        },
        videoLecture: {
          cloudflareStream: true,
        },
        identityVerification: {
          kcb: true,
        },
      },
    );
    const byKey = new Map(tasks.map((task) => [task.key, task.decision]));

    expect(tasks).toHaveLength(ONLINE_SERVICE_BLUEPRINT.tasks.length);
    expect(byKey.get("PB-AUTH-EMAIL-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-SIGNUP-POLICY-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-OAUTH-GOOGLE-001")).toBe("EXTEND");
    expect(byKey.get("PB-AUTH-OAUTH-KAKAO-001")).toBe("N/A");
    expect(byKey.get("PB-AUTH-OAUTH-NAVER-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-003")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-PROFILE-READ-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-PROFILE-UPDATE-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-EMAIL-CHANGE-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-PASSWORD-CHANGE-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-SESSIONS-LIST-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-SESSIONS-REVOKE-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-ACCOUNT-DELETE-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-QA-001")).toBe("NEW");
    expect(byKey.get("PB-PAY-REUSE-AUDIT-001")).toBe("EXTEND");
    expect(byKey.get("PB-PAY-DATA-001")).toBe("EXTEND");
    expect(byKey.get("PB-PAY-ONETIME-001")).toBe("NEW");
    expect(byKey.get("PB-PAY-SUBSCRIPTION-001")).toBe("N/A");
    expect(byKey.get("PB-PAY-CATALOG-API-LIST-001")).toBe("NEW");
    expect(byKey.get("PB-PAY-CATALOG-API-CREATE-001")).toBe("NEW");
    expect(byKey.get("PB-PAY-CATALOG-API-UPDATE-001")).toBe("NEW");
    expect(byKey.get("PB-PAY-CATALOG-API-DELETE-001")).toBe("NEW");
    expect(byKey.get("PB-PAY-CHECKOUT-API-001")).toBe("NEW");
    expect(byKey.get("PB-PAY-POLAR-001")).toBe("EXTEND");
    expect(byKey.get("PB-PAY-POLAR-CHECKOUT-001")).toBe("EXTEND");
    expect(byKey.get("PB-PAY-POLAR-WEBHOOK-001")).toBe("EXTEND");
    expect(byKey.get("PB-PAY-POLAR-REFUND-001")).toBe("EXTEND");
    expect(byKey.get("PB-PAY-INICIS-001")).toBe("N/A");
    expect(byKey.get("PB-PAY-INICIS-CHECKOUT-001")).toBe("N/A");
    expect(byKey.get("PB-PAY-INICIS-APPROVAL-001")).toBe("N/A");
    expect(byKey.get("PB-PAY-INICIS-WEBHOOK-001")).toBe("N/A");
    expect(byKey.get("PB-PAY-INICIS-CANCEL-001")).toBe("N/A");
    expect(byKey.get("PB-PAY-INICIS-COMPAT-001")).toBe("N/A");
    expect(byKey.get("PB-PAY-QA-001")).toBe("NEW");
    expect(byKey.get("PB-ADMIN-PAY-LIST-001")).toBe("NEW");
    expect(byKey.get("PB-ADMIN-PAY-READ-001")).toBe("NEW");
    expect(byKey.get("PB-ADMIN-PAY-REFUND-001")).toBe("NEW");
    expect(byKey.get("PB-ADMIN-PAY-ENTITLEMENT-001")).toBe("NEW");
    expect(byKey.get("PB-ADMIN-PAY-REPORT-001")).toBe("NEW");
    expect(byKey.get("PB-ADMIN-PAY-QA-001")).toBe("NEW");
    expect(byKey.get("PB-NOTI-EMAIL-RESEND-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-DATA-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-TEMPLATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-API-UPDATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-SEND-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-ADMIN-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-QA-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-ALIMTALK-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-ALIMTALK-DATA-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-ALIMTALK-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-ALIMTALK-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-ALIMTALK-API-UPDATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-ALIMTALK-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-ALIMTALK-SEND-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-ALIMTALK-ADMIN-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-ALIMTALK-QA-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-DATA-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-SPACE-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-SPACE-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-SPACE-API-UPDATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-SPACE-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-MEMBERSHIP-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-MEMBER-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-MODERATOR-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-POST-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-POST-API-READ-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-POST-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-POST-API-UPDATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-POST-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-POST-OPS-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-COMMENT-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-COMMENT-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-COMMENT-API-UPDATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-COMMENT-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-COMMENT-OPS-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-REACTION-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-REACTION-API-SET-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-REACTION-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-POLL-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-FEED-RANKING-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-KARMA-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-REPORT-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-BLOCK-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-BLOCK-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-HIDE-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-HIDE-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-FILTER-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-RULES-FLAIR-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-MODERATION-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-MODERATION-API-ACTION-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-SANCTION-APPEAL-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-TIER-ONBOARDING-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-API-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-SAFETY-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-UI-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-ADMIN-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-ADMIN-STATS-001")).toBe("EXTEND");
    expect(byKey.get("PB-COMM-QA-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-DATA-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-COMPLETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-READ-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-UPDATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-UI-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-ADMIN-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-QA-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-DATA-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-API-UPLOAD-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-WEBHOOK-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-API-READ-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-API-UPDATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-API-PLAYBACK-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-API-PROGRESS-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-PLAYER-UI-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-ADMIN-001")).toBe("EXTEND");
    expect(byKey.get("PB-VIDEO-QA-001")).toBe("EXTEND");
    expect(byKey.get("PB-IDV-KCB-001")).toBe("EXTEND");
    expect(byKey.get("PB-IDV-KCB-JAR-001")).toBe("EXTEND");
    expect(byKey.get("PB-IDV-KCB-DATA-001")).toBe("EXTEND");
    expect(byKey.get("PB-IDV-KCB-API-SESSION-001")).toBe("EXTEND");
    expect(byKey.get("PB-IDV-KCB-CALLBACK-001")).toBe("EXTEND");
    expect(byKey.get("PB-IDV-KCB-API-STATUS-001")).toBe("EXTEND");
    expect(byKey.get("PB-IDV-KCB-UI-001")).toBe("EXTEND");
    expect(byKey.get("PB-IDV-KCB-ADMIN-001")).toBe("EXTEND");
    expect(byKey.get("PB-IDV-KCB-QA-001")).toBe("EXTEND");
    expect(byKey.get("PB-ADMIN-USERS-001")).toBe("EXTEND");
    expect(byKey.get("PB-ADMIN-USERS-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-ADMIN-USERS-READ-001")).toBe("EXTEND");
    expect(byKey.get("PB-ADMIN-USERS-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-ADMIN-USERS-UPDATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-ADMIN-USERS-STATUS-001")).toBe("EXTEND");
    expect(byKey.get("PB-ADMIN-USERS-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-ADMIN-USERS-QA-001")).toBe("EXTEND");
    expect(byKey.get("PB-ADMIN-PAY-001")).toBe("NEW");
  });

  it("maps payment provider selections to detailed payment issues", () => {
    const defaultTasks = applyDecisionOverrides(ONLINE_SERVICE_BLUEPRINT);
    const selectedTasks = applyDecisionOverrides(ONLINE_SERVICE_BLUEPRINT, undefined, {
      payment: {
        enabled: true,
        oneTime: true,
        subscription: true,
        polar: true,
        inicis: true,
      },
    });
    const defaultByKey = new Map(defaultTasks.map((task) => [task.key, task.decision]));
    const selectedByKey = new Map(selectedTasks.map((task) => [task.key, task.decision]));
    const polarKeys = [
      "PB-PAY-POLAR-001",
      "PB-PAY-POLAR-CHECKOUT-001",
      "PB-PAY-POLAR-WEBHOOK-001",
      "PB-PAY-POLAR-REFUND-001",
    ];
    const inicisKeys = [
      "PB-PAY-INICIS-001",
      "PB-PAY-INICIS-CHECKOUT-001",
      "PB-PAY-INICIS-APPROVAL-001",
      "PB-PAY-INICIS-WEBHOOK-001",
      "PB-PAY-INICIS-CANCEL-001",
      "PB-PAY-INICIS-COMPAT-001",
    ];

    for (const key of [...polarKeys, ...inicisKeys]) {
      expect(defaultByKey.get(key)).toBe("N/A");
    }
    for (const key of polarKeys) {
      expect(selectedByKey.get(key)).toBe("EXTEND");
    }
    for (const key of inicisKeys) {
      expect(selectedByKey.get(key)).toBe("NEW");
    }
    expect(selectedByKey.get("PB-PAY-SUBSCRIPTION-001")).toBe("NEW");

    const root = buildRootIssueDescription({
      blueprint: ONLINE_SERVICE_BLUEPRINT,
      intake: mergeIntake({ productName: "결제 포함 서비스" }),
      featureSelection: {
        payment: {
          enabled: true,
          oneTime: true,
          subscription: true,
          polar: true,
          inicis: true,
        },
      },
      buildId: "pb-payment",
      tasks: selectedTasks,
    });
    expect(root).toContain("결제: 단건결제, 구독결제(월간/연간) / Polar.sh, KG이니시스(INICIS)");
  });

  it("keeps email auth and Email(Resend) template sending mandatory", () => {
    const tasks = applyDecisionOverrides(
      ONLINE_SERVICE_BLUEPRINT,
      undefined,
      {
        auth: {
          enabled: false,
          email: false,
          oauthGoogle: false,
          oauthKakao: false,
          oauthNaver: false,
        },
        notification: {
          emailResend: false,
          alimtalk: false,
        },
        fileUpload: {
          vercelBlob: false,
        },
      },
    );
    const byKey = new Map(tasks.map((task) => [task.key, task.decision]));

    expect(byKey.get("PB-AUTH-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-EMAIL-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-SIGNUP-POLICY-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-003")).toBe("REUSE");
    expect(byKey.get("PB-NOTI-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-RESEND-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-DATA-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-TEMPLATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-SEND-001")).toBe("EXTEND");
    expect(byKey.get("PB-NOTI-EMAIL-ADMIN-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-DATA-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-CREATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-COMPLETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-LIST-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-READ-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-UPDATE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-API-DELETE-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-UI-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-ADMIN-001")).toBe("EXTEND");
    expect(byKey.get("PB-FILE-QA-001")).toBe("EXTEND");
    expect(byKey.get("PB-AUTH-PROFILE-READ-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-PROFILE-UPDATE-001")).toBe("REUSE");
    expect(byKey.get("PB-AUTH-QA-001")).toBe("NEW");
    expect(byKey.get("PB-NOTI-ALIMTALK-001")).toBe("N/A");
    expect(byKey.get("PB-NOTI-ALIMTALK-API-LIST-001")).toBe("N/A");
    expect(byKey.get("PB-NOTI-ALIMTALK-API-CREATE-001")).toBe("N/A");
    expect(byKey.get("PB-NOTI-ALIMTALK-API-UPDATE-001")).toBe("N/A");
    expect(byKey.get("PB-NOTI-ALIMTALK-API-DELETE-001")).toBe("N/A");
    expect(byKey.get("PB-NOTI-ALIMTALK-ADMIN-001")).toBe("N/A");
  });

  it("treats community as an optional selectable reusable feature", () => {
    const defaultTasks = applyDecisionOverrides(ONLINE_SERVICE_BLUEPRINT);
    const selectedTasks = applyDecisionOverrides(ONLINE_SERVICE_BLUEPRINT, undefined, {
      community: {
        enabled: true,
      },
    });
    const defaultByKey = new Map(defaultTasks.map((task) => [task.key, task]));
    const selectedByKey = new Map(selectedTasks.map((task) => [task.key, task]));
    const communityKeys = [
      "PB-COMM-001",
      "PB-COMM-DATA-001",
      "PB-COMM-SPACE-API-LIST-001",
      "PB-COMM-SPACE-API-CREATE-001",
      "PB-COMM-SPACE-API-UPDATE-001",
      "PB-COMM-SPACE-API-DELETE-001",
      "PB-COMM-MEMBERSHIP-API-001",
      "PB-COMM-MEMBER-API-001",
      "PB-COMM-MODERATOR-API-001",
      "PB-COMM-POST-API-LIST-001",
      "PB-COMM-POST-API-READ-001",
      "PB-COMM-POST-API-CREATE-001",
      "PB-COMM-POST-API-UPDATE-001",
      "PB-COMM-POST-API-DELETE-001",
      "PB-COMM-POST-OPS-API-001",
      "PB-COMM-COMMENT-API-LIST-001",
      "PB-COMM-COMMENT-API-CREATE-001",
      "PB-COMM-COMMENT-API-UPDATE-001",
      "PB-COMM-COMMENT-API-DELETE-001",
      "PB-COMM-COMMENT-OPS-API-001",
      "PB-COMM-REACTION-API-LIST-001",
      "PB-COMM-REACTION-API-SET-001",
      "PB-COMM-REACTION-API-DELETE-001",
      "PB-COMM-POLL-API-001",
      "PB-COMM-FEED-RANKING-API-001",
      "PB-COMM-KARMA-API-001",
      "PB-COMM-REPORT-API-CREATE-001",
      "PB-COMM-BLOCK-API-CREATE-001",
      "PB-COMM-BLOCK-API-DELETE-001",
      "PB-COMM-HIDE-API-CREATE-001",
      "PB-COMM-HIDE-API-DELETE-001",
      "PB-COMM-FILTER-API-001",
      "PB-COMM-RULES-FLAIR-API-001",
      "PB-COMM-MODERATION-API-LIST-001",
      "PB-COMM-MODERATION-API-ACTION-001",
      "PB-COMM-SANCTION-APPEAL-API-001",
      "PB-COMM-TIER-ONBOARDING-API-001",
      "PB-COMM-API-001",
      "PB-COMM-SAFETY-001",
      "PB-COMM-UI-001",
      "PB-COMM-ADMIN-001",
      "PB-COMM-ADMIN-STATS-001",
      "PB-COMM-QA-001",
    ];

    for (const key of communityKeys) {
      expect(defaultByKey.get(key)?.decision).toBe("N/A");
      expect(selectedByKey.get(key)?.decision).toBe("EXTEND");
    }

    const safetyTask = selectedByKey.get("PB-COMM-SAFETY-001");
    const uiTask = selectedByKey.get("PB-COMM-UI-001");
    const qaTask = selectedByKey.get("PB-COMM-QA-001");
    expect(safetyTask?.description).toContain("신고");
    expect(safetyTask?.description).toContain("차단");
    expect(safetyTask?.description).toContain("숨김");
    expect(safetyTask?.description).toContain("필터");
    expect(uiTask?.description).toContain("리액션");
    expect(qaTask?.acceptanceCriteria.join("\n")).toContain("Apple/Google");

    const root = buildRootIssueDescription({
      blueprint: ONLINE_SERVICE_BLUEPRINT,
      intake: mergeIntake({ productName: "커뮤니티 선택 서비스" }),
      featureSelection: {
        community: {
          enabled: true,
        },
      },
      buildId: "pb-community",
      tasks: selectedTasks,
    });
    expect(root).toContain("커뮤니티: CRUD/멤버십/게시글/댓글/리액션/투표/피드/karma/신고/차단/숨김/필터/규칙/flair/제재/관리자");
  });

  it("expands project-specific domain feature cards into repeated implementation issues", () => {
    const tasks = buildProductBuilderTasks(ONLINE_SERVICE_BLUEPRINT, {
      domainFeatures: [
        {
          id: "lecture-detail",
          title: "강의 상세 페이지",
          description: "상세 소개, 커리큘럼, 미리보기, 후기, 구매 전환을 연결한다.",
          surfaces: ["landing", "app", "admin"],
          decision: "NEW",
          mvp: true,
        },
      ],
    });
    const keys = tasks.map((task) => task.key);
    const landingTask = tasks.find((task) => task.key === "FEAT-LECTURE-DETAIL-LANDING");
    const adminTask = tasks.find((task) => task.key === "FEAT-LECTURE-DETAIL-ADMIN");

    expect(tasks).toHaveLength(ONLINE_SERVICE_BLUEPRINT.tasks.length + 10);
    expect(keys).toEqual(expect.arrayContaining([
      "PB-FEAT-001",
      "PB-FEAT-002",
      "PB-FEAT-003",
      "FEAT-LECTURE-DETAIL-DATA",
      "FEAT-LECTURE-DETAIL-API-LIST",
      "FEAT-LECTURE-DETAIL-API-READ",
      "FEAT-LECTURE-DETAIL-API-CREATE",
      "FEAT-LECTURE-DETAIL-API-UPDATE",
      "FEAT-LECTURE-DETAIL-API-DELETE",
      "FEAT-LECTURE-DETAIL-LANDING",
      "FEAT-LECTURE-DETAIL-APP",
      "FEAT-LECTURE-DETAIL-ADMIN",
      "FEAT-LECTURE-DETAIL-QA",
    ]));
    expect(landingTask?.surfaces).toEqual(["landing"]);
    expect(landingTask?.targetPaths).toEqual(["apps/web"]);
    expect(landingTask?.dependsOn).toEqual(["FEAT-LECTURE-DETAIL-API-LIST", "FEAT-LECTURE-DETAIL-API-READ", "PB-WEB-001"]);
    expect(adminTask?.surfaces).toEqual(["admin"]);
    expect(adminTask?.targetPaths).toEqual(["apps/admin"]);

    expect(keys.indexOf("FEAT-LECTURE-DETAIL-DATA")).toBe(keys.indexOf("PB-DATA-001") + 1);
    expect(keys.indexOf("FEAT-LECTURE-DETAIL-API-LIST")).toBe(keys.indexOf("PB-DOMAIN-001") + 1);
    expect(keys.indexOf("FEAT-LECTURE-DETAIL-API-READ")).toBeGreaterThan(keys.indexOf("FEAT-LECTURE-DETAIL-API-LIST"));
    expect(keys.indexOf("FEAT-LECTURE-DETAIL-API-CREATE")).toBeGreaterThan(keys.indexOf("FEAT-LECTURE-DETAIL-API-READ"));
    expect(keys.indexOf("FEAT-LECTURE-DETAIL-API-UPDATE")).toBeGreaterThan(keys.indexOf("FEAT-LECTURE-DETAIL-API-CREATE"));
    expect(keys.indexOf("FEAT-LECTURE-DETAIL-API-DELETE")).toBeGreaterThan(keys.indexOf("FEAT-LECTURE-DETAIL-API-UPDATE"));
    expect(keys.indexOf("FEAT-LECTURE-DETAIL-LANDING")).toBe(keys.indexOf("PB-WEB-001") + 1);
    expect(keys.indexOf("FEAT-LECTURE-DETAIL-APP")).toBe(keys.indexOf("PB-WEB-002") + 1);
    expect(keys.indexOf("FEAT-LECTURE-DETAIL-ADMIN")).toBe(keys.indexOf("PB-ADMIN-002") + 1);
    expect(keys.indexOf("FEAT-LECTURE-DETAIL-QA")).toBe(keys.indexOf("PB-QA-001") - 1);
  });

  it("creates a Paperclip issue graph and records the last build", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    await plugin.definition.setup(harness.ctx);
    const expectedTasks = buildProductBuilderTasks(ONLINE_SERVICE_BLUEPRINT, {
      featureSelection: ONLINE_SERVICE_BLUEPRINT.defaultFeatureSelection,
      domainFeatures: ONLINE_SERVICE_BLUEPRINT.defaultDomainFeatures,
    });

    const result = await harness.performAction<ProductBuilderBuildSummary>(ACTION.instantiateBuild, {
      companyId: COMPANY_ID,
      intake: {
        productName: "표준 온라인 서비스",
        customerName: "BBR",
      },
    });

    expect(result.productName).toBe("표준 온라인 서비스");
    expect(result.rootIssueId).toBeTruthy();
    expect(result.counts.total).toBe(expectedTasks.length);
    expect(result.counts.implementation).toBeGreaterThan(0);
    expect(result.counts.reuse).toBeGreaterThan(0);
    expect(result.counts.skipped).toBeGreaterThan(0);
    expect(result.issues).toHaveLength(expectedTasks.length);
    expect(result.issues.map((issue) => issue.taskKey)).toEqual(expect.arrayContaining([
      "PB-FEAT-001",
      "PB-FEAT-002",
      "PB-FEAT-003",
      "FEAT-DOMAIN-DETAIL-DATA",
      "FEAT-DOMAIN-DETAIL-API-LIST",
      "FEAT-DOMAIN-DETAIL-API-READ",
      "FEAT-DOMAIN-DETAIL-API-CREATE",
      "FEAT-DOMAIN-DETAIL-API-UPDATE",
      "FEAT-DOMAIN-DETAIL-API-DELETE",
      "FEAT-DOMAIN-DETAIL-LANDING",
      "FEAT-DOMAIN-DETAIL-APP",
      "FEAT-DOMAIN-DETAIL-ADMIN",
      "FEAT-DOMAIN-DETAIL-QA",
      "PB-FILE-001",
      "PB-FILE-API-CREATE-001",
      "PB-FILE-API-COMPLETE-001",
      "PB-FILE-API-DELETE-001",
      "PB-FILE-QA-001",
      "PB-VIDEO-001",
      "PB-VIDEO-API-UPLOAD-001",
      "PB-VIDEO-API-PLAYBACK-001",
      "PB-VIDEO-QA-001",
      "PB-IDV-KCB-001",
      "PB-IDV-KCB-JAR-001",
      "PB-IDV-KCB-API-SESSION-001",
      "PB-IDV-KCB-CALLBACK-001",
      "PB-IDV-KCB-QA-001",
      "PB-ADMIN-SUPER-ACCOUNT-001",
    ]));
    expect(result.issues.find((issue) => issue.decision === "REUSE")?.status).toBe("done");
    expect(result.issues.find((issue) => issue.decision === "N/A")?.status).toBe("done");
    expect(result.issues.find((issue) => issue.decision === "NEW")?.status).toBe("todo");
    expect(result.issues.find((issue) => issue.taskKey === "PB-AUTH-EMAIL-001")?.decision).toBe("REUSE");
    expect(result.issues.find((issue) => issue.taskKey === "PB-AUTH-QA-001")?.decision).toBe("NEW");
    expect(result.issues.find((issue) => issue.taskKey === "PB-NOTI-EMAIL-RESEND-001")?.decision).toBe("EXTEND");
    expect(result.issues.find((issue) => issue.taskKey === "PB-NOTI-EMAIL-DATA-001")?.decision).toBe("EXTEND");
    expect(result.issues.find((issue) => issue.taskKey === "PB-NOTI-EMAIL-TEMPLATE-001")?.decision).toBe("EXTEND");
    expect(result.issues.find((issue) => issue.taskKey === "PB-NOTI-EMAIL-API-CREATE-001")?.decision).toBe("EXTEND");
    expect(result.issues.find((issue) => issue.taskKey === "PB-NOTI-EMAIL-SEND-001")?.decision).toBe("EXTEND");
    expect(result.issues.find((issue) => issue.taskKey === "PB-FILE-001")?.decision).toBe("EXTEND");
    expect(result.issues.find((issue) => issue.taskKey === "PB-FILE-API-CREATE-001")?.status).toBe("todo");
    expect(result.issues.find((issue) => issue.taskKey === "PB-FILE-QA-001")?.decision).toBe("EXTEND");
    expect(result.issues.find((issue) => issue.taskKey === "PB-VIDEO-001")?.decision).toBe("N/A");
    expect(result.issues.find((issue) => issue.taskKey === "PB-VIDEO-API-UPLOAD-001")?.status).toBe("done");
    expect(result.issues.find((issue) => issue.taskKey === "PB-VIDEO-QA-001")?.decision).toBe("N/A");
    expect(result.issues.find((issue) => issue.taskKey === "PB-IDV-KCB-001")?.decision).toBe("N/A");
    expect(result.issues.find((issue) => issue.taskKey === "PB-IDV-KCB-JAR-001")?.decision).toBe("N/A");
    expect(result.issues.find((issue) => issue.taskKey === "PB-IDV-KCB-API-SESSION-001")?.status).toBe("done");
    expect(result.issues.find((issue) => issue.taskKey === "PB-IDV-KCB-QA-001")?.decision).toBe("N/A");
    expect(result.issues.find((issue) => issue.taskKey === "PB-NOTI-ALIMTALK-001")?.status).toBe("done");
    expect(result.issues.find((issue) => issue.taskKey === "PB-NOTI-ALIMTALK-API-CREATE-001")?.decision).toBe("N/A");
    expect(result.issues.find((issue) => issue.taskKey === "PB-NOTI-ALIMTALK-ADMIN-001")?.status).toBe("done");
    expect(result.issues.find((issue) => issue.taskKey === "PB-COMM-001")?.decision).toBe("N/A");
    expect(result.issues.find((issue) => issue.taskKey === "PB-COMM-UI-001")?.status).toBe("done");
    expect(result.issues.find((issue) => issue.taskKey === "PB-COMM-ADMIN-001")?.status).toBe("done");
    expect(result.issues.find((issue) => issue.taskKey === "PB-PAY-001")?.decision).toBe("N/A");
    expect(result.issues.find((issue) => issue.taskKey === "PB-ADMIN-SUPER-ACCOUNT-001")?.decision).toBe("NEW");
    expect(result.issues.find((issue) => issue.taskKey === "PB-ADMIN-SUPER-ACCOUNT-001")?.status).toBe("todo");
    expect(result.issues.find((issue) => issue.taskKey === "PB-ADMIN-USERS-001")?.decision).toBe("EXTEND");
    expect(result.issues.find((issue) => issue.taskKey === "PB-ADMIN-PAY-001")?.status).toBe("done");

    const overview = await harness.getData<ProductBuilderOverview>(DATA.overview, { companyId: COMPANY_ID });
    expect(overview.lastBuild?.buildId).toBe(result.buildId);
    expect(overview.blueprints[0]?.id).toBe("online-service-standard");
    expect(overview.blueprints[0]?.defaultDomainFeatures[0]?.id).toBe("domain-detail");
    expect(overview.blueprints[0]?.taskCount).toBe(expectedTasks.length);
    expect(overview.blueprints[1]?.id).toBe("web-application-service-standard");
    expect(overview.blueprints[1]?.defaultIntake.productName).toBe(WEB_APPLICATION_SERVICE_BLUEPRINT.defaultIntake.productName);
    expect(overview.blueprints[0]?.skippedCount).toBeGreaterThan(0);
  });

  it("parses community feature selection when instantiating a build", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    await plugin.definition.setup(harness.ctx);

    const result = await harness.performAction<ProductBuilderBuildSummary>(ACTION.instantiateBuild, {
      companyId: COMPANY_ID,
      intake: {
        productName: "커뮤니티 포함 서비스",
        customerName: "BBR",
      },
      featureSelection: {
        community: {
          enabled: true,
        },
      },
    });

    expect(result.issues.find((issue) => issue.taskKey === "PB-COMM-001")?.decision).toBe("EXTEND");
    expect(result.issues.find((issue) => issue.taskKey === "PB-COMM-UI-001")?.status).toBe("todo");
    expect(result.issues.find((issue) => issue.taskKey === "PB-COMM-ADMIN-001")?.decision).toBe("EXTEND");

    const rootIssue = await harness.ctx.issues.get(result.rootIssueId, COMPANY_ID);
    expect(rootIssue?.description).toContain("커뮤니티: CRUD/멤버십/게시글/댓글/리액션/투표/피드/karma/신고/차단/숨김/필터/규칙/flair/제재/관리자");
  });

  it("parses Cloudflare Stream video lecture selection into detailed video issues", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    await plugin.definition.setup(harness.ctx);

    const result = await harness.performAction<ProductBuilderBuildSummary>(ACTION.instantiateBuild, {
      companyId: COMPANY_ID,
      intake: {
        productName: "영상 강의 포함 서비스",
        customerName: "BBR",
      },
      featureSelection: {
        videoLecture: {
          cloudflareStream: true,
        },
      },
    });
    const byKey = new Map(result.issues.map((issue) => [issue.taskKey, issue]));
    const videoKeys = [
      "PB-VIDEO-001",
      "PB-VIDEO-DATA-001",
      "PB-VIDEO-API-UPLOAD-001",
      "PB-VIDEO-WEBHOOK-001",
      "PB-VIDEO-API-LIST-001",
      "PB-VIDEO-API-READ-001",
      "PB-VIDEO-API-UPDATE-001",
      "PB-VIDEO-API-DELETE-001",
      "PB-VIDEO-API-PLAYBACK-001",
      "PB-VIDEO-API-PROGRESS-001",
      "PB-VIDEO-PLAYER-UI-001",
      "PB-VIDEO-ADMIN-001",
      "PB-VIDEO-QA-001",
    ];

    for (const key of videoKeys) {
      expect(byKey.get(key)?.decision).toBe("EXTEND");
      expect(byKey.get(key)?.status).toBe("todo");
    }
    expect(byKey.get("PB-VIDEO-API-PLAYBACK-001")?.title).toContain("signed playback");
    expect(byKey.get("PB-VIDEO-PLAYER-UI-001")?.title).toContain("player UI");

    const rootIssue = await harness.ctx.issues.get(result.rootIssueId, COMPANY_ID);
    expect(rootIssue?.description).toContain("영상 강의: Cloudflare Stream");
  });

  it("parses KCB identity verification selection into detailed identity issues", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    await plugin.definition.setup(harness.ctx);

    const result = await harness.performAction<ProductBuilderBuildSummary>(ACTION.instantiateBuild, {
      companyId: COMPANY_ID,
      intake: {
        productName: "본인확인 포함 서비스",
        customerName: "BBR",
      },
      featureSelection: {
        identityVerification: {
          kcb: true,
        },
      },
    });
    const byKey = new Map(result.issues.map((issue) => [issue.taskKey, issue]));
    const identityKeys = [
      "PB-IDV-KCB-001",
      "PB-IDV-KCB-JAR-001",
      "PB-IDV-KCB-DATA-001",
      "PB-IDV-KCB-API-SESSION-001",
      "PB-IDV-KCB-CALLBACK-001",
      "PB-IDV-KCB-API-STATUS-001",
      "PB-IDV-KCB-UI-001",
      "PB-IDV-KCB-ADMIN-001",
      "PB-IDV-KCB-QA-001",
    ];

    for (const key of identityKeys) {
      expect(byKey.get(key)?.decision).toBe("EXTEND");
      expect(byKey.get(key)?.status).toBe("todo");
    }
    expect(byKey.get("PB-IDV-KCB-API-SESSION-001")?.title).toContain("세션 생성 API");
    expect(byKey.get("PB-IDV-KCB-JAR-001")?.title).toContain("JAR 실행 경계");
    expect(byKey.get("PB-IDV-KCB-CALLBACK-001")?.title).toContain("callback/결과 검증 API");
    expect(byKey.get("PB-IDV-KCB-QA-001")?.title).toContain("개인정보");

    const rootIssue = await harness.ctx.issues.get(result.rootIssueId, COMPANY_ID);
    expect(rootIssue?.description).toContain("본인확인: KCB");
  });

  it("parses alimtalk feature selection into detailed notification issues", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    await plugin.definition.setup(harness.ctx);

    const result = await harness.performAction<ProductBuilderBuildSummary>(ACTION.instantiateBuild, {
      companyId: COMPANY_ID,
      intake: {
        productName: "알림톡 포함 서비스",
        customerName: "BBR",
      },
      featureSelection: {
        notification: {
          alimtalk: true,
        },
      },
    });

    const byKey = new Map(result.issues.map((issue) => [issue.taskKey, issue]));
    const alimtalkKeys = [
      "PB-NOTI-ALIMTALK-001",
      "PB-NOTI-ALIMTALK-DATA-001",
      "PB-NOTI-ALIMTALK-API-LIST-001",
      "PB-NOTI-ALIMTALK-API-CREATE-001",
      "PB-NOTI-ALIMTALK-API-UPDATE-001",
      "PB-NOTI-ALIMTALK-API-DELETE-001",
      "PB-NOTI-ALIMTALK-SEND-001",
      "PB-NOTI-ALIMTALK-ADMIN-001",
      "PB-NOTI-ALIMTALK-QA-001",
    ];

    for (const key of alimtalkKeys) {
      expect(byKey.get(key)?.decision).toBe("EXTEND");
      expect(byKey.get(key)?.status).toBe("todo");
    }

    expect(byKey.get("PB-NOTI-EMAIL-API-CREATE-001")?.decision).toBe("EXTEND");
    const rootIssue = await harness.ctx.issues.get(result.rootIssueId, COMPANY_ID);
    expect(rootIssue?.description).toContain("알림: Email(Resend), 알림톡");
  });

  it("creates the web application workflow issue graph with AI server tasks", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    await plugin.definition.setup(harness.ctx);
    const expectedTasks = buildProductBuilderTasks(WEB_APPLICATION_SERVICE_BLUEPRINT, {
      featureSelection: WEB_APPLICATION_SERVICE_BLUEPRINT.defaultFeatureSelection,
      domainFeatures: WEB_APPLICATION_SERVICE_BLUEPRINT.defaultDomainFeatures,
    });

    const result = await harness.performAction<ProductBuilderBuildSummary>(ACTION.instantiateBuild, {
      companyId: COMPANY_ID,
      blueprintId: "web-application-service-standard",
      intake: {
        productName: "표준 웹 어플리케이션",
        customerName: "BBR",
      },
    });

    expect(result.blueprintId).toBe("web-application-service-standard");
    expect(result.counts.total).toBe(expectedTasks.length);
    expect(result.issues.map((issue) => issue.taskKey)).toEqual(expect.arrayContaining([
      "PB-AISRV-001",
      "PB-AISRV-002",
      "PB-AISRV-003",
      "FEAT-AI-ASSISTED-WORKFLOW-AI",
      "FEAT-AI-ASSISTED-WORKFLOW-QA",
    ]));
    expect(result.issues.find((issue) => issue.taskKey === "PB-AISRV-001")?.status).toBe("todo");

    const rootIssue = await harness.ctx.issues.get(result.rootIssueId, COMPANY_ID);
    expect(rootIssue?.description).toContain(WEB_APPLICATION_SERVICE_BLUEPRINT.defaultIntake.referenceService);
    expect(rootIssue?.description).toContain("fixed 웹 어플리케이션 서비스 task list");
    expect(WEB_APPLICATION_SERVICE_BLUEPRINT.defaultIntake.productName).toBe("");
    expect(WEB_APPLICATION_SERVICE_BLUEPRINT.defaultIntake.referenceService).toBe("");
  });
});
