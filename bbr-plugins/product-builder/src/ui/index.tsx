import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  useHostLocation,
  useHostNavigation,
  usePluginAction,
  usePluginData,
  usePluginToast,
  type PluginPageProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import {
  ACTION,
  DATA,
  DEFAULT_DOMAIN_FEATURES,
  DEFAULT_FEATURE_SELECTION,
  DEFAULT_INTAKE,
  DOMAIN_FEATURE_SURFACES,
  PAGE_ROUTE,
  TASK_SURFACE_LABELS,
  buildProductBuilderTasks,
  mergeFeatureSelection,
  type ProductBuilderBlueprint,
  type ProductBuilderBuildSummary,
  type ProductBuilderDomainFeature,
  type ProductBuilderFeatureSelection,
  type ProductBuilderIntake,
  type ProductBuilderOverview,
  type ProductBuilderTask,
  type TaskDecision,
  type TaskSurface,
} from "../contract.js";

const sidebarItemBase =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";

const C = {
  page: {
    padding: "1.25rem",
    display: "grid",
    gap: "1rem",
    color: "inherit",
  } as CSSProperties,
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.75rem",
  } as CSSProperties,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
    gap: "1rem",
    alignItems: "start",
  } as CSSProperties,
  panel: {
    border: "1px solid var(--border, #d4d8df)",
    borderRadius: 8,
    padding: "0.9rem",
    background: "var(--card, transparent)",
  } as CSSProperties,
  input: {
    width: "100%",
    padding: "0.5rem 0.6rem",
    border: "1px solid var(--border, #d4d8df)",
    borderRadius: 6,
    background: "transparent",
    color: "inherit",
    fontSize: 13,
    boxSizing: "border-box",
  } as CSSProperties,
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  } as CSSProperties,
  muted: {
    fontSize: 12,
    opacity: 0.72,
    lineHeight: 1.45,
  } as CSSProperties,
  row: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    alignItems: "center",
  } as CSSProperties,
  checkRow: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "flex-start",
    fontSize: 13,
    lineHeight: 1.35,
  } as CSSProperties,
  btn: {
    padding: "0.48rem 0.8rem",
    border: "1px solid var(--border, #d4d8df)",
    borderRadius: 6,
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    fontSize: 13,
  } as CSSProperties,
  workflowButton: {
    display: "grid",
    gap: "0.25rem",
    width: "100%",
    padding: "0.65rem 0.7rem",
    border: "1px solid var(--border, #d4d8df)",
    borderRadius: 8,
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13,
  } as CSSProperties,
  primaryBtn: {
    padding: "0.5rem 0.9rem",
    border: "1px solid #0f766e",
    borderRadius: 6,
    background: "#0f766e",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  } as CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  } as CSSProperties,
  th: {
    textAlign: "left",
    padding: "0.45rem",
    borderBottom: "1px solid var(--border, #d4d8df)",
    opacity: 0.72,
  } as CSSProperties,
  td: {
    padding: "0.5rem 0.45rem",
    borderBottom: "1px solid color-mix(in srgb, var(--border, #d4d8df) 70%, transparent)",
    verticalAlign: "top",
  } as CSSProperties,
};

const decisionLabels: Record<TaskDecision, string> = {
  NEW: "NEW",
  EXTEND: "EXTEND",
  REUSE: "REUSE / SKIP",
  "N/A": "N/A / SKIP",
};

function decisionStyle(decision: TaskDecision): CSSProperties {
  const colors: Record<TaskDecision, { bg: string; fg: string; border: string }> = {
    NEW: { bg: "oklch(0.28 0.06 250)", fg: "oklch(0.86 0.1 250)", border: "oklch(0.46 0.12 250)" },
    EXTEND: { bg: "oklch(0.28 0.07 70)", fg: "oklch(0.86 0.1 70)", border: "oklch(0.5 0.13 70)" },
    REUSE: { bg: "oklch(0.27 0.06 145)", fg: "oklch(0.86 0.1 145)", border: "oklch(0.45 0.12 145)" },
    "N/A": { bg: "oklch(0.25 0.02 250)", fg: "oklch(0.78 0.03 250)", border: "oklch(0.38 0.04 250)" },
  };
  const c = colors[decision];
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: `1px solid ${c.border}`,
    background: c.bg,
    color: c.fg,
    padding: "0.12rem 0.45rem",
    fontSize: 11,
    fontWeight: 700,
  };
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label style={{ display: "block" }}>
      <span key="label" style={C.label}>{label}</span>
      {multiline ? (
        <textarea
          key="textarea"
          style={{ ...C.input, minHeight: 82, resize: "vertical" }}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input key="input" style={C.input} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function FeatureCheckbox({
  label,
  checked,
  onChange,
  disabled,
  note,
}: {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <label style={{ ...C.checkRow, opacity: disabled ? 0.62 : 1 }}>
      <input
        key="input"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        style={{ marginTop: 2 }}
      />
      <span key="text" style={{ display: "grid", gap: 2 }}>
        <span key="label" style={{ fontWeight: 650 }}>{label}</span>
        {note ? <span key="note" style={C.muted}>{note}</span> : null}
      </span>
    </label>
  );
}

function FeatureSelector({
  features,
  onChange,
}: {
  features: ProductBuilderFeatureSelection;
  onChange: (features: ProductBuilderFeatureSelection) => void;
}) {
  const selectAllFeatures = () => {
    onChange(mergeFeatureSelection({
      auth: {
        enabled: true,
        email: true,
        oauthGoogle: true,
        oauthKakao: true,
        oauthNaver: true,
      },
      payment: {
        enabled: true,
        oneTime: true,
        subscription: true,
        polar: true,
        inicis: true,
      },
      notification: {
        emailResend: true,
        alimtalk: true,
      },
      community: {
        enabled: true,
      },
      fileUpload: {
        vercelBlob: true,
      },
      videoLecture: {
        cloudflareStream: true,
      },
      identityVerification: {
        kcb: true,
      },
      admin: {
        userManagement: true,
        paymentManagement: true,
      },
    }));
  };

  const clearOptionalFeatures = () => {
    onChange(mergeFeatureSelection({
      auth: {
        enabled: true,
        email: true,
        oauthGoogle: false,
        oauthKakao: false,
        oauthNaver: false,
      },
      payment: {
        enabled: false,
        oneTime: false,
        subscription: false,
        polar: false,
        inicis: false,
      },
      notification: {
        emailResend: true,
        alimtalk: false,
      },
      community: {
        enabled: false,
      },
      fileUpload: {
        vercelBlob: true,
      },
      videoLecture: {
        cloudflareStream: false,
      },
      identityVerification: {
        kcb: false,
      },
      admin: {
        userManagement: true,
        paymentManagement: false,
      },
    }));
  };

  const setAuth = (patch: Partial<ProductBuilderFeatureSelection["auth"]>) => {
    const nextAuth = { ...features.auth, ...patch, enabled: true, email: true };
    const hasMethod = nextAuth.email || nextAuth.oauthGoogle || nextAuth.oauthKakao || nextAuth.oauthNaver;
    nextAuth.enabled = Boolean(nextAuth.enabled && hasMethod);
    onChange(mergeFeatureSelection({ ...features, auth: nextAuth }));
  };

  const setPayment = (patch: Partial<ProductBuilderFeatureSelection["payment"]>) => {
    const nextPayment = { ...features.payment, ...patch };
    const hasPaymentType = nextPayment.oneTime || nextPayment.subscription;
    nextPayment.enabled = Boolean(nextPayment.enabled && hasPaymentType);
    onChange(mergeFeatureSelection({ ...features, payment: nextPayment }));
  };

  const setNotification = (patch: Partial<ProductBuilderFeatureSelection["notification"]>) => {
    onChange(mergeFeatureSelection({
      ...features,
      notification: { ...features.notification, ...patch },
    }));
  };

  const setCommunity = (patch: Partial<ProductBuilderFeatureSelection["community"]>) => {
    onChange(mergeFeatureSelection({
      ...features,
      community: { ...features.community, ...patch },
    }));
  };

  const setVideoLecture = (patch: Partial<ProductBuilderFeatureSelection["videoLecture"]>) => {
    onChange(mergeFeatureSelection({
      ...features,
      videoLecture: { ...features.videoLecture, ...patch },
    }));
  };

  const setIdentityVerification = (patch: Partial<ProductBuilderFeatureSelection["identityVerification"]>) => {
    onChange(mergeFeatureSelection({
      ...features,
      identityVerification: { ...features.identityVerification, ...patch },
    }));
  };

  return (
    <div style={C.panel}>
      <div key="heading-wrap" style={{ ...C.header, marginBottom: "0.75rem" }}>
        <div key="title">
          <h2 key="heading" style={{ margin: "0 0 0.25rem", fontSize: 16 }}>Feature 선택</h2>
          <div key="note" style={C.muted}>선택값은 고정 task를 없애지 않고 관련 task의 기본 판정값을 바꿉니다.</div>
        </div>
        <div key="bulk-actions" style={C.row}>
          <button key="select-all" type="button" style={C.btn} onClick={selectAllFeatures}>전체 선택</button>
          <button key="clear" type="button" style={C.btn} onClick={clearOptionalFeatures}>전체 해제</button>
        </div>
      </div>

      <div key="groups" style={{ display: "grid", gap: "0.85rem" }}>
        <section key="auth" style={{ display: "grid", gap: "0.45rem" }}>
          <FeatureCheckbox
            key="auth-master"
            label="인증"
            checked={features.auth.enabled}
            disabled
            note="필수. 아래에서 인증 방식을 고릅니다."
          />
          <div key="auth-methods" style={{ display: "grid", gap: "0.35rem", paddingLeft: "1.35rem" }}>
            <div key="auth-methods-title" style={{ fontSize: 12, fontWeight: 700, opacity: 0.78 }}>인증 방식</div>
            <FeatureCheckbox key="auth-email" label="email" checked={features.auth.email} disabled note="필수" />
            <FeatureCheckbox key="auth-google" label="OAuth-google" checked={features.auth.oauthGoogle} disabled={!features.auth.enabled} onChange={(checked) => setAuth({ oauthGoogle: checked })} />
            <FeatureCheckbox key="auth-kakao" label="OAuth-kakao" checked={features.auth.oauthKakao} disabled={!features.auth.enabled} onChange={(checked) => setAuth({ oauthKakao: checked })} />
            <FeatureCheckbox key="auth-naver" label="OAuth-naver" checked={features.auth.oauthNaver} disabled={!features.auth.enabled} onChange={(checked) => setAuth({ oauthNaver: checked })} />
            <div key="auth-pattern-title" style={{ paddingTop: "0.25rem", fontSize: 12, fontWeight: 700, opacity: 0.78 }}>웹서비스 인증 패턴</div>
            <FeatureCheckbox
              key="auth-modal-pattern"
              label="보호 기능 로그인 모달"
              checked
              disabled
              note="필수. 공개 페이지 진입은 막지 않고, 저장/구매/이용 시작/개인화 같은 보호 액션에서 로그인/회원가입 모달을 엽니다."
            />
          </div>
        </section>

        <section key="payment" style={{ display: "grid", gap: "0.45rem" }}>
          <FeatureCheckbox
            key="payment-master"
            label="결제"
            checked={features.payment.enabled}
            note="결제 선택 시 사용자 인증과 관리자 결제 관리가 함께 켜집니다."
            onChange={(checked) => {
              onChange(mergeFeatureSelection({
                ...features,
                payment: checked
                  ? { ...features.payment, enabled: true, oneTime: true, polar: true }
                  : { enabled: false, oneTime: false, subscription: false, polar: false, inicis: false },
              }));
            }}
          />
          <div key="payment-types" style={{ display: "grid", gap: "0.35rem", paddingLeft: "1.35rem" }}>
            <FeatureCheckbox key="one-time" label="단건결제" checked={features.payment.oneTime} disabled={!features.payment.enabled} onChange={(checked) => setPayment({ oneTime: checked })} />
            <FeatureCheckbox key="subscription" label="구독결제" checked={features.payment.subscription} disabled={!features.payment.enabled} note="월간/연간 플랜 기본" onChange={(checked) => setPayment({ subscription: checked })} />
            <FeatureCheckbox key="payment-polar" label="Polar.sh provider" checked={features.payment.polar} disabled={!features.payment.enabled} note="Flotter 결제 기능 재사용/확장 후보" onChange={(checked) => setPayment({ polar: checked })} />
            <FeatureCheckbox key="payment-inicis" label="KG이니시스(INICIS) provider" checked={features.payment.inicis} disabled={!features.payment.enabled} note="상점 계약/심사/모바일 표준결제/가상계좌/환불 task 포함" onChange={(checked) => setPayment({ inicis: checked })} />
          </div>
        </section>

        <section key="notification" style={{ display: "grid", gap: "0.45rem" }}>
          <div key="notification-title" style={{ fontSize: 13, fontWeight: 700 }}>알림</div>
          <div key="notification-items" style={{ display: "grid", gap: "0.35rem", paddingLeft: "1.35rem" }}>
            <FeatureCheckbox
              key="notification-email-resend"
              label="Email(Resend)"
              checked={features.notification.emailResend}
              disabled
              note="필수. 템플릿 관리와 시스템 발송 기능 포함"
            />
            <FeatureCheckbox
              key="notification-alimtalk"
              label="알림톡"
              checked={features.notification.alimtalk}
              note="카카오 비즈채널, 템플릿 승인, SMS 대체발송 정책 포함"
              onChange={(checked) => setNotification({ alimtalk: checked })}
            />
          </div>
        </section>

        <section key="file-upload" style={{ display: "grid", gap: "0.45rem" }}>
          <div key="file-upload-title" style={{ fontSize: 13, fontWeight: 700 }}>파일 업로드</div>
          <div key="file-upload-items" style={{ display: "grid", gap: "0.35rem", paddingLeft: "1.35rem" }}>
            <FeatureCheckbox
              key="file-upload-vercel-blob"
              label="Vercel Blob"
              checked={features.fileUpload.vercelBlob}
              disabled
              note="기본 제공. BLOB_READ_WRITE_TOKEN/env, client upload, metadata, 삭제/권한/QA task 포함"
            />
          </div>
        </section>

        <section key="video-lecture" style={{ display: "grid", gap: "0.45rem" }}>
          <FeatureCheckbox
            key="video-lecture-cloudflare"
            label="온라인 영상 강의"
            checked={features.videoLecture.cloudflareStream}
            note="Cloudflare Stream provider. 영상 업로드, 처리 webhook, signed playback, player, 진행률, 관리자/QA task 포함"
            onChange={(checked) => setVideoLecture({ cloudflareStream: checked })}
          />
        </section>

        <section key="identity-verification" style={{ display: "grid", gap: "0.45rem" }}>
          <FeatureCheckbox
            key="identity-verification-kcb"
            label="[KCB] 본인확인"
            checked={features.identityVerification.kcb}
            note="KCB/Ok-name 계약, JAR/JVM adapter(Railway 후보), 세션 생성, callback 검증, 최소 개인정보 저장, 보호 액션 UI, 관리자/QA task 포함"
            onChange={(checked) => setIdentityVerification({ kcb: checked })}
          />
        </section>

        <section key="community" style={{ display: "grid", gap: "0.45rem" }}>
          <FeatureCheckbox
            key="community-master"
            label="커뮤니티"
            checked={features.community.enabled}
            note="게시글, 댓글, 리액션, 신고, 작성자 차단, 숨김, 필터, 관리자 모더레이션. Apple/Google UGC 가이드라인 대응 포함"
            onChange={(checked) => setCommunity({ enabled: checked })}
          />
        </section>

        <section key="admin" style={{ display: "grid", gap: "0.45rem" }}>
          <div key="admin-title" style={{ fontSize: 13, fontWeight: 700 }}>관리자</div>
          <div key="admin-items" style={{ display: "grid", gap: "0.35rem", paddingLeft: "1.35rem" }}>
            <FeatureCheckbox key="admin-users" label="사용자 관리" checked={features.admin.userManagement} disabled note="기본 포함" />
            <FeatureCheckbox key="admin-payment" label="결제 관리" checked={features.admin.paymentManagement} disabled note={features.admin.paymentManagement ? "결제 선택으로 포함" : "결제 미선택으로 N/A"} />
          </div>
        </section>
      </div>
    </div>
  );
}

function DomainFeaturePanel({
  features,
  onChange,
}: {
  features: ProductBuilderDomainFeature[];
  onChange: (features: ProductBuilderDomainFeature[]) => void;
}) {
  const updateFeature = (index: number, patch: Partial<ProductBuilderDomainFeature>) => {
    onChange(features.map((feature, itemIndex) => (itemIndex === index ? { ...feature, ...patch } : feature)));
  };

  const toggleSurface = (index: number, surface: TaskSurface, checked: boolean) => {
    const feature = features[index];
    if (!feature) return;
    const next = checked
      ? [...new Set([...feature.surfaces, surface])]
      : feature.surfaces.filter((item) => item !== surface);
    updateFeature(index, { surfaces: next.length > 0 ? next : ["app"] });
  };

  const addFeature = () => {
    const nextNumber = features.length + 1;
    onChange([
      ...features,
      {
        id: `feature-${nextNumber}`,
        title: "새 도메인 기능",
        description: "",
        surfaces: ["app", "admin"],
        decision: "NEW",
        mvp: true,
        notes: "",
      },
    ]);
  };

  return (
    <div style={C.panel}>
      <div key="heading-wrap" style={{ ...C.header, marginBottom: "0.75rem" }}>
        <div key="title">
          <h2 key="heading" style={{ margin: "0 0 0.25rem", fontSize: 16 }}>도메인 기능</h2>
          <div key="note" style={C.muted}>기획에서 확정된 기능 카드가 DATA/API/화면/Admin/AI/QA issue로 확장됩니다.</div>
        </div>
        <button key="add" type="button" style={C.btn} onClick={addFeature}>추가</button>
      </div>

      <div key="cards" style={{ display: "grid", gap: "0.7rem" }}>
        {features.map((feature, index) => (
          <div
            key={feature.id || index}
            style={{
              border: "1px solid color-mix(in srgb, var(--border, #d4d8df) 78%, transparent)",
              borderRadius: 8,
              padding: "0.7rem",
              display: "grid",
              gap: "0.55rem",
            }}
          >
            <div key="top" style={{ ...C.header, gap: "0.5rem" }}>
              <label key="title" style={{ display: "block", flex: "1 1 220px" }}>
                <span key="label" style={C.label}>기능명</span>
                <input
                  key="input"
                  style={C.input}
                  value={feature.title}
                  onChange={(event) => updateFeature(index, { title: event.target.value })}
                />
              </label>
              <label key="decision" style={{ display: "block", width: 132 }}>
                <span key="label" style={C.label}>판정</span>
                <select
                  key="select"
                  style={C.input}
                  value={feature.decision}
                  onChange={(event) => updateFeature(index, { decision: event.target.value as TaskDecision })}
                >
                  {(["NEW", "EXTEND", "REUSE", "N/A"] as TaskDecision[]).map((decision) => (
                    <option key={decision} value={decision}>{decisionLabels[decision]}</option>
                  ))}
                </select>
              </label>
            </div>

            <label key="description" style={{ display: "block" }}>
              <span key="label" style={C.label}>설명</span>
              <textarea
                key="textarea"
                style={{ ...C.input, minHeight: 68, resize: "vertical" }}
                value={feature.description}
                onChange={(event) => updateFeature(index, { description: event.target.value })}
              />
            </label>

            <div key="surfaces" style={{ display: "grid", gap: "0.35rem" }}>
              <div key="label" style={C.label}>영역</div>
              <div key="checks" style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem 0.8rem" }}>
                {DOMAIN_FEATURE_SURFACES.map((surface) => (
                  <label key={surface} style={{ ...C.checkRow, alignItems: "center" }}>
                    <input
                      key="input"
                      type="checkbox"
                      checked={feature.surfaces.includes(surface)}
                      onChange={(event) => toggleSurface(index, surface, event.target.checked)}
                    />
                    <span key="label">{TASK_SURFACE_LABELS[surface]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div key="bottom" style={C.header}>
              <label key="mvp" style={{ ...C.checkRow, alignItems: "center" }}>
                <input
                  key="input"
                  type="checkbox"
                  checked={feature.mvp}
                  onChange={(event) => updateFeature(index, { mvp: event.target.checked })}
                />
                <span key="label">MVP</span>
              </label>
              <button
                key="remove"
                type="button"
                style={C.btn}
                onClick={() => onChange(features.filter((_, itemIndex) => itemIndex !== index))}
              >
                제거
              </button>
            </div>
          </div>
        ))}
        {features.length === 0 ? <div key="empty" style={C.muted}>확정된 도메인 기능 카드가 없습니다.</div> : null}
      </div>
    </div>
  );
}

function WorkflowSelector({
  blueprints,
  selectedId,
  onSelect,
}: {
  blueprints: ProductBuilderOverview["blueprints"];
  selectedId: string;
  onSelect: (blueprint: ProductBuilderOverview["blueprints"][number]) => void;
}) {
  return (
    <div style={C.panel}>
      <div key="heading-wrap" style={{ marginBottom: "0.75rem" }}>
        <h2 key="heading" style={{ margin: "0 0 0.25rem", fontSize: 16 }}>큰 워크플로우</h2>
        <div key="note" style={C.muted}>먼저 온라인 서비스 / 웹 어플리케이션 서비스 중 하나를 고르고, 아래에서 기능을 켭니다.</div>
      </div>
      <div key="items" style={{ display: "grid", gap: "0.5rem" }}>
        {blueprints.map((entry) => {
          const selected = entry.id === selectedId;
          return (
            <button
              key={entry.id}
              type="button"
              style={{
                ...C.workflowButton,
                borderColor: selected ? "#0f766e" : "var(--border, #d4d8df)",
                background: selected ? "color-mix(in srgb, #0f766e 12%, transparent)" : "transparent",
              }}
              onClick={() => onSelect(entry)}
            >
              <span key="name" style={{ fontWeight: 750 }}>{entry.displayName}</span>
              <span key="class" style={C.muted}>{entry.productClass}</span>
              <span key="counts" style={C.muted}>
                task {entry.taskCount} · 실행 {entry.implementationCount} · SKIP {entry.skippedCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductBuilderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path key="top" d="m12 3 8 4.5-8 4.5-8-4.5Z" />
      <path key="middle" d="m20 12-8 4.5L4 12" />
      <path key="bottom" d="m20 16.5-8 4.5-8-4.5" />
    </svg>
  );
}

export function ProductBuilderSidebarItem(_props: PluginSidebarProps) {
  const nav = useHostNavigation();
  const loc = useHostLocation();
  const active = new RegExp(`(^|/)${PAGE_ROUTE}(/|$)`).test(loc.pathname);
  const cls = `${sidebarItemBase} ${
    active
      ? "bg-accent text-foreground"
      : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
  }`;
  return (
    <a
      {...nav.linkProps(`/${PAGE_ROUTE}`)}
      className={cls}
      aria-current={active ? "page" : undefined}
      onClick={(event) => {
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          nav.navigate(`/${PAGE_ROUTE}`);
        }
      }}
    >
      <ProductBuilderIcon key="icon" />
      <span key="label" className="flex-1 truncate">Product Builder</span>
    </a>
  );
}

function featureSummaryRows(features: ProductBuilderFeatureSelection) {
  const authMethods = [
    features.auth.email ? "email" : null,
    features.auth.oauthGoogle ? "Google" : null,
    features.auth.oauthKakao ? "Kakao" : null,
    features.auth.oauthNaver ? "Naver" : null,
  ].filter((item): item is string => Boolean(item));
  const paymentTypes = [
    features.payment.oneTime ? "단건" : null,
    features.payment.subscription ? "구독" : null,
  ].filter((item): item is string => Boolean(item));
  const paymentProviders = [
    features.payment.polar ? "Polar" : null,
    features.payment.inicis ? "INICIS" : null,
  ].filter((item): item is string => Boolean(item));
  const notificationTypes = [
    features.notification.emailResend ? "Email" : null,
    features.notification.alimtalk ? "알림톡" : null,
  ].filter((item): item is string => Boolean(item));

  return [
    { key: "auth", label: "인증", value: authMethods.join(", "), active: features.auth.enabled },
    {
      key: "payment",
      label: "결제",
      value: features.payment.enabled
        ? `${paymentTypes.join(", ") || "결제"} / ${paymentProviders.join(", ") || "provider 미정"}`
        : "N/A",
      active: features.payment.enabled,
    },
    { key: "notification", label: "알림", value: notificationTypes.join(", "), active: notificationTypes.length > 0 },
    { key: "file", label: "파일 업로드", value: "Vercel Blob", active: features.fileUpload.vercelBlob },
    { key: "video", label: "영상 강의", value: features.videoLecture.cloudflareStream ? "Cloudflare Stream" : "N/A", active: features.videoLecture.cloudflareStream },
    { key: "identity", label: "본인확인", value: features.identityVerification.kcb ? "KCB" : "N/A", active: features.identityVerification.kcb },
    { key: "community", label: "커뮤니티", value: features.community.enabled ? "포함" : "N/A", active: features.community.enabled },
    {
      key: "admin",
      label: "관리자",
      value: `사용자${features.admin.paymentManagement ? ", 결제" : ""}`,
      active: features.admin.userManagement,
    },
  ];
}

function groupTasksByPhase(tasks: ProductBuilderTask[]) {
  const groups: Array<{ phase: string; tasks: ProductBuilderTask[] }> = [];
  for (const task of tasks) {
    const current = groups[groups.length - 1];
    if (current?.phase === task.phase) {
      current.tasks.push(task);
    } else {
      groups.push({ phase: task.phase, tasks: [task] });
    }
  }
  return groups;
}

const issuePreviewRowClass =
  "group flex items-start gap-2 border-b border-border py-2.5 pl-2 pr-3 text-sm text-inherit transition-colors last:border-b-0 hover:bg-accent/50 sm:items-center sm:py-2 sm:pl-1";

function PreviewGroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center py-1.5 pl-1 pr-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-semibold uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}

function PreviewStatusSlot({ muted = false }: { muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        borderRadius: 999,
        border: "1px solid var(--muted-foreground, #6b7280)",
        opacity: muted ? 0.35 : 0.72,
      }}
    />
  );
}

function PreviewIssueRow({
  identifier,
  title,
  mobileMeta,
  trailing,
  depth = 0,
  muted = false,
}: {
  identifier: string;
  title: string;
  mobileMeta?: string;
  trailing?: ReactNode;
  depth?: number;
  muted?: boolean;
}) {
  return (
    <div style={depth > 0 ? { paddingLeft: `${depth * 16}px` } : undefined}>
      <div
        className={issuePreviewRowClass}
        data-preview-row-key={identifier}
        style={muted ? { opacity: 0.68 } : undefined}
      >
        <span key="mobile-status" className="flex shrink-0 items-center gap-1 pt-px sm:hidden">
          <PreviewStatusSlot muted={muted} />
        </span>
        <span key="body" className="flex min-w-0 flex-1 flex-col gap-1 sm:contents">
          <span key="title" className="line-clamp-2 text-sm sm:order-2 sm:min-w-0 sm:flex-1 sm:truncate sm:line-clamp-none">
            {title}
          </span>
          <span key="meta" className="flex items-center gap-2 sm:order-1 sm:shrink-0">
            <span key="desktop-status" className="hidden shrink-0 items-center gap-1 sm:inline-flex">
              <PreviewStatusSlot muted={muted} />
            </span>
            <span key="identifier" className="shrink-0 font-mono text-xs text-muted-foreground">
              {identifier}
            </span>
            {mobileMeta ? [
                <span key="mobile-separator" className="text-xs text-muted-foreground sm:hidden" aria-hidden="true">
                  &middot;
                </span>,
                <span key="mobile-meta" className="text-xs text-muted-foreground sm:hidden">{mobileMeta}</span>,
              ] : null}
          </span>
        </span>
        {trailing ? (
          <span key="trailing" className="ml-auto hidden shrink-0 items-center gap-3 sm:order-3 sm:flex">
            {trailing}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function IssuePreviewSidebar({
  blueprint,
  tasks,
  productName,
  features,
  onChange,
}: {
  blueprint: ProductBuilderBlueprint;
  tasks: ProductBuilderTask[];
  productName: string;
  features: ProductBuilderFeatureSelection;
  onChange: (taskKey: string, decision: TaskDecision) => void;
}) {
  const phaseGroups = groupTasksByPhase(tasks);
  const rows = featureSummaryRows(features);

  return (
    <aside style={{ position: "sticky", top: "0.75rem", maxHeight: "calc(100vh - 1.5rem)", overflow: "auto", minWidth: 0 }}>
      <div key="header" className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h2 key="heading" className="min-w-0 truncate text-base font-semibold">{blueprint.displayName}</h2>
        <span key="count" className="shrink-0 text-xs text-muted-foreground">{tasks.length} issues</span>
      </div>

      <section key="feature-summary" className="pt-3">
        <PreviewGroupHeader key="label" label="Feature" />
        {rows.map((row) => (
          <PreviewIssueRow
            key={row.key}
            identifier={`FEAT-${row.key.toUpperCase()}`}
            title={row.label}
            mobileMeta={row.value || (row.active ? "포함" : "N/A")}
            muted={!row.active}
            trailing={<span key="feature-value" className="text-xs text-muted-foreground">{row.value || (row.active ? "포함" : "N/A")}</span>}
          />
        ))}
      </section>

      <section key="issue-tree" className="pt-4">
        <PreviewGroupHeader key="issues-label" label="Issues" />
        <PreviewIssueRow
          key="root"
          identifier="ROOT"
          title={`[Product Builder] ${productName}`}
          mobileMeta={blueprint.shortName}
          trailing={<span key="root-blueprint" className="text-xs text-muted-foreground">{blueprint.shortName}</span>}
        />

        {phaseGroups.map((group) => (
          <div key={`${group.phase}-${group.tasks[0]?.key ?? "empty"}`}>
            <PreviewGroupHeader key="phase" label={group.phase} />
            <div key="tasks">
              {group.tasks.map((task) => (
                <PreviewIssueRow
                  key={task.key}
                  identifier={task.key}
                  title={task.title}
                  depth={1}
                  muted={task.decision === "N/A"}
                  trailing={(
                    <select
                      key="select"
                      aria-label={`${task.key} decision`}
                      style={{
                        width: 92,
                        border: "1px solid var(--border, #d4d8df)",
                        borderRadius: 6,
                        background: "transparent",
                        color: "inherit",
                        padding: "0.25rem 0.35rem",
                        fontSize: 12,
                      }}
                      value={task.decision}
                      onChange={(event) => onChange(task.key, event.target.value as TaskDecision)}
                    >
                      {(["NEW", "EXTEND", "REUSE", "N/A"] as TaskDecision[]).map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </aside>
  );
}

function LastBuild({ build }: { build: ProductBuilderBuildSummary | null }) {
  if (!build) {
    return (
      <div style={C.panel}>
        <h2 key="heading" style={{ margin: "0 0 0.5rem", fontSize: 16 }}>최근 생성</h2>
        <div key="empty" style={C.muted}>아직 이 회사에서 생성한 Product Builder build가 없습니다.</div>
      </div>
    );
  }
  return (
    <div style={C.panel}>
      <h2 key="heading" style={{ margin: "0 0 0.5rem", fontSize: 16 }}>최근 생성</h2>
      <div key="counts" style={C.row}>
        <span key="implementation" style={decisionStyle("NEW")}>실행 {build.counts.implementation}</span>
        <span key="reuse" style={decisionStyle("REUSE")}>재사용 {build.counts.reuse}</span>
        <span key="skipped" style={decisionStyle("N/A")}>SKIP {build.counts.skipped}</span>
      </div>
      <div key="summary" style={{ ...C.muted, marginTop: 8 }}>
        {build.productName} · root issue <code key="root-issue">{build.rootIssueId}</code>
      </div>
      <div key="issues" style={{ marginTop: 10, display: "grid", gap: 6 }}>
        {build.issues.slice(0, 8).map((issue) => (
          <div key={issue.issueId} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <span key="decision" style={decisionStyle(issue.decision)}>{issue.decision}</span>
            <span key="title" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {issue.title}
            </span>
          </div>
        ))}
        {build.issues.length > 8 ? <div key="more" style={C.muted}>외 {build.issues.length - 8}개 issue 생성</div> : null}
      </div>
    </div>
  );
}

export function ProductBuilderPage({ context }: PluginPageProps) {
  const companyId = context?.companyId ?? "";
  const toast = usePluginToast();
  const { data: overview, loading: overviewLoading, error: overviewError, refresh } = usePluginData<ProductBuilderOverview>(
    DATA.overview,
    companyId ? { companyId } : undefined,
  );
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("online-service-standard");
  const blueprintId = overview?.blueprints.some((entry) => entry.id === selectedBlueprintId)
    ? selectedBlueprintId
    : overview?.blueprints[0]?.id ?? "online-service-standard";
  const { data: blueprint, loading: blueprintLoading, error: blueprintError } = usePluginData<ProductBuilderBlueprint>(
    DATA.blueprint,
    { blueprintId },
  );
  const instantiate = usePluginAction(ACTION.instantiateBuild);
  const [intake, setIntake] = useState<ProductBuilderIntake>(DEFAULT_INTAKE);
  const [featureSelection, setFeatureSelection] = useState<ProductBuilderFeatureSelection>(DEFAULT_FEATURE_SELECTION);
  const [domainFeatures, setDomainFeatures] = useState<ProductBuilderDomainFeature[]>(DEFAULT_DOMAIN_FEATURES);
  const [manualOverrides, setManualOverrides] = useState<Record<string, TaskDecision>>({});
  const [busy, setBusy] = useState(false);

  const previewTasks = useMemo<ProductBuilderTask[]>(() => {
    if (!blueprint) return [];
    return buildProductBuilderTasks(blueprint, {
      featureSelection,
      domainFeatures,
      overrides: manualOverrides,
    });
  }, [blueprint, featureSelection, domainFeatures, manualOverrides]);

  const counts = useMemo(() => {
    if (!blueprint) return { implementation: 0, reuse: 0, skipped: 0, total: 0 };
    const decisions = previewTasks.map((task) => task.decision);
    return {
      total: decisions.length,
      implementation: decisions.filter((decision) => decision === "NEW" || decision === "EXTEND").length,
      reuse: decisions.filter((decision) => decision === "REUSE").length,
      skipped: decisions.filter((decision) => decision === "N/A").length,
    };
  }, [blueprint, previewTasks]);

  const set = (patch: Partial<ProductBuilderIntake>) => setIntake((current) => ({ ...current, ...patch }));

  function changeFeatureSelection(next: ProductBuilderFeatureSelection) {
    setFeatureSelection(next);
    setManualOverrides({});
  }

  function selectWorkflow(entry: ProductBuilderOverview["blueprints"][number]) {
    setSelectedBlueprintId(entry.id);
    setIntake(entry.defaultIntake);
    setFeatureSelection(entry.defaultFeatureSelection);
    setDomainFeatures(entry.defaultDomainFeatures);
    setManualOverrides({});
  }

  async function createBuild() {
    if (!companyId) {
      toast({ tone: "error", title: "회사 컨텍스트가 필요합니다." });
      return;
    }
    setBusy(true);
    try {
      const result = await instantiate({
        companyId,
        blueprintId,
        intake,
        featureSelection,
        domainFeatures,
        decisionOverrides: manualOverrides,
      }) as ProductBuilderBuildSummary;
      toast({
        tone: "success",
        title: `Product Builder issue ${result.issues.length + 1}개 생성`,
      });
      await refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: error instanceof Error ? error.message : "Product Builder 실행 실패",
      });
    } finally {
      setBusy(false);
    }
  }

  if (overviewLoading || blueprintLoading) return <div style={C.page}>Product Builder 로딩중...</div>;
  if (overviewError || blueprintError) {
    return <div style={C.page}>Product Builder 오류: {(overviewError ?? blueprintError)?.message}</div>;
  }
  if (!blueprint || !overview) return <div style={C.page}>Product Builder blueprint를 찾을 수 없습니다.</div>;

  return (
    <div style={C.page}>
      <div key="header" style={C.header}>
        <div key="title">
          <h1 key="heading" style={{ margin: 0, fontSize: 22 }}>Product Builder</h1>
          <div key="subtitle" style={C.muted}>큰 워크플로우를 고른 뒤 고정 제작 템플릿 전체를 생성하고, 해당 없는 단위는 REUSE/N/A SKIP 기록으로 닫습니다.</div>
        </div>
        <div key="actions" style={C.row}>
          <span key="workflow" style={decisionStyle("EXTEND")}>{blueprint.displayName}</span>
          <span key="implementation" style={decisionStyle("NEW")}>실행 {counts.implementation}</span>
          <span key="reuse" style={decisionStyle("REUSE")}>재사용 {counts.reuse}</span>
          <span key="skipped" style={decisionStyle("N/A")}>SKIP {counts.skipped}</span>
          <button key="create" style={C.primaryBtn} disabled={busy} onClick={() => void createBuild()}>
            {busy ? "생성중..." : "Build Issues 생성"}
          </button>
        </div>
      </div>

      <div key="body" style={C.grid}>
        <div key="left" style={{ display: "grid", gap: "1rem" }}>
          <WorkflowSelector
            key="workflow"
            blueprints={overview.blueprints}
            selectedId={blueprintId}
            onSelect={selectWorkflow}
          />

          <div key="intake" style={C.panel}>
            <h2 key="heading" style={{ margin: "0 0 0.75rem", fontSize: 16 }}>Intake / 기획 브리프</h2>
            <div key="fields" style={{ display: "grid", gap: "0.75rem" }}>
              <Field key="productName" label="제품명" value={intake.productName} onChange={(productName) => set({ productName })} />
              <Field key="customerName" label="고객명" value={intake.customerName} onChange={(customerName) => set({ customerName })} />
              <Field key="referenceService" label="참고 서비스" value={intake.referenceService} onChange={(referenceService) => set({ referenceService })} />
              <Field key="productSummary" label="제품 요약" value={intake.productSummary} onChange={(productSummary) => set({ productSummary })} multiline />
              <Field key="targetUsers" label="타겟 사용자" value={intake.targetUsers} onChange={(targetUsers) => set({ targetUsers })} multiline />
              <Field key="customNotes" label="추가 조건" value={intake.customNotes} onChange={(customNotes) => set({ customNotes })} multiline />
            </div>
          </div>

          <FeatureSelector key="features" features={featureSelection} onChange={changeFeatureSelection} />

          <DomainFeaturePanel key="domain-features" features={domainFeatures} onChange={setDomainFeatures} />

          <div key="stack" style={C.panel}>
            <h2 key="heading" style={{ margin: "0 0 0.5rem", fontSize: 16 }}>고정 환경</h2>
            <div key="items" style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <div key="base">Base: <strong key="value">{blueprint.baseRepository.name}</strong></div>
              <div key="base-status" style={C.muted}>{blueprint.baseRepository.readinessGate}</div>
              <div key="web">Web: <strong key="value">{blueprint.defaultStack.web}</strong></div>
              <div key="api">API: <strong key="value">{blueprint.defaultStack.api}</strong></div>
              <div key="db">DB: <strong key="value">{blueprint.defaultStack.database}</strong></div>
              <div key="deploy">Deploy: <strong key="value">{blueprint.defaultStack.deploy}</strong></div>
              <div key="contract">Contract: <strong key="value">{blueprint.defaultStack.contract}</strong></div>
              {blueprint.defaultStack.ai ? (
                <div key="ai">AI: <strong key="value">{blueprint.defaultStack.ai}</strong></div>
              ) : null}
            </div>
          </div>

          <LastBuild key="last-build" build={overview.lastBuild} />
        </div>

        <IssuePreviewSidebar
          key="issue-preview"
          blueprint={blueprint}
          tasks={previewTasks}
          productName={intake.productName}
          features={featureSelection}
          onChange={(taskKey, decision) => setManualOverrides((current) => ({ ...current, [taskKey]: decision }))}
        />
      </div>
    </div>
  );
}
