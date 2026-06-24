import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  DEFAULT_FEATURE_SELECTION,
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
import { Button, Card, Input, Label, Select, Textarea } from "../../ui/primitives.js";
import { DATA as BLUEPRINT_DATA, type ProjectSummary } from "../../blueprint/contract.js";
import { ACTION as BUILDER_ACTION } from "../../managed-resources.js";

const sidebarItemBase =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

const pageClass = "grid gap-4 p-5 text-foreground";
const pageStateClass = "p-5 text-sm text-muted-foreground";
const panelClass = "rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm";
const panelHeaderClass = "mb-3 flex flex-wrap items-start justify-between gap-3";
const sectionClass = "grid gap-2 rounded-md border border-border bg-background/40 p-3";
const nestedGroupClass = "ml-6 grid gap-1.5 border-l border-border pl-3";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";
const textControlClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const multilineTextControlClass = `${textControlClass} min-h-20 whitespace-pre-wrap`;
const mutedClass = "text-xs leading-5 text-muted-foreground";
const rowClass = "flex flex-wrap items-center gap-2";
const secondaryButtonClass =
  "inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50";
const primaryButtonClass =
  "inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50";
const workflowSummaryClass =
  "grid w-full gap-1 rounded-md border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground shadow-sm";

const EMPTY_INTAKE: ProductBuilderIntake = {
  productName: "",
  customerName: "",
  referenceService: "",
  productSummary: "",
  targetUsers: "",
  customNotes: "",
};

const decisionLabels: Record<TaskDecision, string> = {
  NEW: "NEW",
  EXTEND: "EXTEND",
  REUSE: "REUSE / SKIP",
  "N/A": "N/A / SKIP",
};

const decisionOptions = (["NEW", "EXTEND", "REUSE", "N/A"] as TaskDecision[]).map((decision) => ({
  value: decision,
  label: decisionLabels[decision],
}));

function decisionClassName(decision: TaskDecision): string {
  switch (decision) {
    case "NEW":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "EXTEND":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "REUSE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "N/A":
      return "border-border bg-muted text-muted-foreground";
  }
}

function DecisionBadge({ decision, children }: { decision: TaskDecision; children?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", decisionClassName(decision))}>
      {children ?? decisionLabels[decision]}
    </span>
  );
}

function TextControl({
  value,
  onChange,
  multiline,
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  if (multiline) {
    return <Textarea className={multilineTextControlClass} value={value} onChange={(event) => onChange(event.target.value)} />;
  }

  return <Input className={textControlClass} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function CheckboxControl({
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
    <Button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      className={cn(
        "flex h-auto w-full items-start justify-start gap-2 rounded-md p-0 text-left text-sm leading-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        disabled ? "cursor-not-allowed opacity-60" : "hover:text-foreground",
      )}
      onClick={() => {
        if (!disabled) onChange?.(!checked);
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
        )}
      >
        {checked ? (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        ) : null}
      </span>
      <span key="text" className="grid gap-0.5">
        <span key="label" className="font-medium text-foreground">{label}</span>
        {note ? <span key="note" className={mutedClass}>{note}</span> : null}
      </span>
    </Button>
  );
}

function SelectControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16" className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </Button>
      {open ? (
        <div role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {options.map((option) => {
            const selectedOption = option.value === value;
            return (
              <Button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selectedOption}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                  selectedOption && "bg-accent text-accent-foreground",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="truncate">{option.label}</span>
                {selectedOption ? (
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="ml-2 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                ) : null}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
    <Label className="block">
      <span key="label" className={labelClass}>{label}</span>
      <TextControl key="control" value={value} onChange={onChange} multiline={multiline} />
    </Label>
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
    <CheckboxControl label={label} checked={checked} disabled={disabled} note={note} onChange={onChange} />
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
    <Card className={panelClass}>
      <div key="heading-wrap" className={panelHeaderClass}>
        <div key="title">
          <h2 key="heading" className="text-base font-semibold">Feature 선택</h2>
          <div key="note" className={mutedClass}>선택값은 고정 task를 없애지 않고 관련 task의 기본 판정값을 바꿉니다.</div>
        </div>
        <div key="bulk-actions" className={rowClass}>
          <Button key="select-all" type="button" className={secondaryButtonClass} onClick={selectAllFeatures}>전체 선택</Button>
          <Button key="clear" type="button" className={secondaryButtonClass} onClick={clearOptionalFeatures}>전체 해제</Button>
        </div>
      </div>

      <div key="groups" className="grid gap-3">
        <Card key="auth" className={sectionClass}>
          <FeatureCheckbox
            key="auth-master"
            label="인증"
            checked={features.auth.enabled}
            disabled
            note="필수. 아래에서 인증 방식을 고릅니다."
          />
          <div key="auth-methods" className={nestedGroupClass}>
            <div key="auth-methods-title" className={labelClass}>인증 방식</div>
            <FeatureCheckbox key="auth-email" label="email" checked={features.auth.email} disabled note="필수" />
            <FeatureCheckbox key="auth-google" label="OAuth-google" checked={features.auth.oauthGoogle} disabled={!features.auth.enabled} onChange={(checked) => setAuth({ oauthGoogle: checked })} />
            <FeatureCheckbox key="auth-kakao" label="OAuth-kakao" checked={features.auth.oauthKakao} disabled={!features.auth.enabled} onChange={(checked) => setAuth({ oauthKakao: checked })} />
            <FeatureCheckbox key="auth-naver" label="OAuth-naver" checked={features.auth.oauthNaver} disabled={!features.auth.enabled} onChange={(checked) => setAuth({ oauthNaver: checked })} />
            <div key="auth-pattern-title" className={cn(labelClass, "pt-1")}>웹서비스 인증 패턴</div>
            <FeatureCheckbox
              key="auth-modal-pattern"
              label="보호 기능 로그인 모달"
              checked
              disabled
              note="필수. 공개 페이지 진입은 막지 않고, 저장/구매/이용 시작/개인화 같은 보호 액션에서 로그인/회원가입 모달을 엽니다."
            />
          </div>
        </Card>

        <Card key="payment" className={sectionClass}>
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
          <div key="payment-types" className={nestedGroupClass}>
            <FeatureCheckbox key="one-time" label="단건결제" checked={features.payment.oneTime} disabled={!features.payment.enabled} onChange={(checked) => setPayment({ oneTime: checked })} />
            <FeatureCheckbox key="subscription" label="구독결제" checked={features.payment.subscription} disabled={!features.payment.enabled} note="월간/연간 플랜 기본" onChange={(checked) => setPayment({ subscription: checked })} />
            <FeatureCheckbox key="payment-polar" label="Polar.sh provider" checked={features.payment.polar} disabled={!features.payment.enabled} note="Flotter 결제 기능 재사용/확장 후보" onChange={(checked) => setPayment({ polar: checked })} />
            <FeatureCheckbox key="payment-inicis" label="KG이니시스(INICIS) provider" checked={features.payment.inicis} disabled={!features.payment.enabled} note="상점 계약/심사/모바일 표준결제/가상계좌/환불 task 포함" onChange={(checked) => setPayment({ inicis: checked })} />
          </div>
        </Card>

        <Card key="notification" className={sectionClass}>
          <div key="notification-title" className="text-sm font-medium">알림</div>
          <div key="notification-items" className={nestedGroupClass}>
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
        </Card>

        <Card key="file-upload" className={sectionClass}>
          <div key="file-upload-title" className="text-sm font-medium">파일 업로드</div>
          <div key="file-upload-items" className={nestedGroupClass}>
            <FeatureCheckbox
              key="file-upload-vercel-blob"
              label="Vercel Blob"
              checked={features.fileUpload.vercelBlob}
              disabled
              note="기본 제공. BLOB_READ_WRITE_TOKEN/env, client upload, metadata, 삭제/권한/QA task 포함"
            />
          </div>
        </Card>

        <Card key="video-lecture" className={sectionClass}>
          <FeatureCheckbox
            key="video-lecture-cloudflare"
            label="온라인 영상 강의"
            checked={features.videoLecture.cloudflareStream}
            note="Cloudflare Stream provider. 영상 업로드, 처리 webhook, signed playback, player, 진행률, 관리자/QA task 포함"
            onChange={(checked) => setVideoLecture({ cloudflareStream: checked })}
          />
        </Card>

        <Card key="identity-verification" className={sectionClass}>
          <FeatureCheckbox
            key="identity-verification-kcb"
            label="[KCB] 본인확인"
            checked={features.identityVerification.kcb}
            note="KCB/Ok-name 계약, JAR/JVM adapter(Railway 후보), 세션 생성, callback 검증, 최소 개인정보 저장, 보호 액션 UI, 관리자/QA task 포함"
            onChange={(checked) => setIdentityVerification({ kcb: checked })}
          />
        </Card>

        <Card key="community" className={sectionClass}>
          <FeatureCheckbox
            key="community-master"
            label="커뮤니티"
            checked={features.community.enabled}
            note="게시글, 댓글, 리액션, 신고, 작성자 차단, 숨김, 필터, 관리자 모더레이션. Apple/Google UGC 가이드라인 대응 포함"
            onChange={(checked) => setCommunity({ enabled: checked })}
          />
        </Card>

        <Card key="admin" className={sectionClass}>
          <div key="admin-title" className="text-sm font-medium">관리자</div>
          <div key="admin-items" className={nestedGroupClass}>
            <FeatureCheckbox key="admin-users" label="사용자 관리" checked={features.admin.userManagement} disabled note="기본 포함" />
            <FeatureCheckbox key="admin-payment" label="결제 관리" checked={features.admin.paymentManagement} disabled note={features.admin.paymentManagement ? "결제 선택으로 포함" : "결제 미선택으로 N/A"} />
          </div>
        </Card>
      </div>
    </Card>
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
    <Card className={panelClass}>
      <div key="heading-wrap" className={panelHeaderClass}>
        <div key="title">
          <h2 key="heading" className="text-base font-semibold">도메인 기능</h2>
          <div key="note" className={mutedClass}>기획에서 확정된 기능 카드가 DATA/API/화면/Admin/AI/QA issue로 확장됩니다.</div>
        </div>
        <Button key="add" type="button" className={secondaryButtonClass} onClick={addFeature}>추가</Button>
      </div>

      <div key="cards" className="grid gap-3">
        {features.map((feature, index) => (
          <div
            key={feature.id || index}
            className="grid gap-3 rounded-md border border-border bg-background/40 p-3"
          >
            <div key="top" className="flex flex-wrap items-start gap-2">
              <Label key="title" className="block min-w-[220px] flex-1">
                <span key="label" className={labelClass}>기능명</span>
                <TextControl
                  key="title-control"
                  value={feature.title}
                  onChange={(title) => updateFeature(index, { title })}
                />
              </Label>
              <Label key="decision" className="block w-36">
                <span key="label" className={labelClass}>판정</span>
                <SelectControl
                  key="decision-control"
                  value={feature.decision}
                  options={decisionOptions}
                  ariaLabel="도메인 기능 판정"
                  onChange={(decision) => updateFeature(index, { decision })}
                />
              </Label>
            </div>

            <Label key="description" className="block">
              <span key="label" className={labelClass}>설명</span>
              <TextControl
                key="description-control"
                value={feature.description}
                multiline
                onChange={(description) => updateFeature(index, { description })}
              />
            </Label>

            <div key="surfaces" className="grid gap-1.5">
              <div key="label" className={labelClass}>영역</div>
              <div key="checks" className="flex flex-wrap gap-x-4 gap-y-2">
                {DOMAIN_FEATURE_SURFACES.map((surface) => (
                  <div key={surface} className="w-auto">
                    <CheckboxControl
                      label={TASK_SURFACE_LABELS[surface]}
                      checked={feature.surfaces.includes(surface)}
                      onChange={(checked) => toggleSurface(index, surface, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div key="bottom" className="flex flex-wrap items-center justify-between gap-2">
              <div key="mvp" className="w-auto">
                <CheckboxControl
                  label="MVP"
                  checked={feature.mvp}
                  onChange={(mvp) => updateFeature(index, { mvp })}
                />
              </div>
              <Button
                key="remove"
                type="button"
                className={secondaryButtonClass}
                onClick={() => onChange(features.filter((_, itemIndex) => itemIndex !== index))}
              >
                제거
              </Button>
            </div>
          </div>
        ))}
        {features.length === 0 ? <div key="empty" className={mutedClass}>확정된 도메인 기능 카드가 없습니다.</div> : null}
      </div>
    </Card>
  );
}

function BlueprintWorkflowPanel({
  blueprints,
  selectedId,
  projectBlueprint,
  upstreamReadiness,
}: {
  blueprints: ProductBuilderOverview["blueprints"];
  selectedId: string;
  projectBlueprint: ProductBuilderOverview["projectBlueprint"];
  upstreamReadiness: ProductBuilderOverview["upstreamReadiness"];
}) {
  const selected = blueprints.find((entry) => entry.id === selectedId) ?? blueprints[0];
  const unreadySlots = upstreamReadiness.slots.filter((slot) => !slot.ready);
  return (
    <Card className={panelClass}>
      <div key="heading-wrap" className="mb-3">
        <h2 key="heading" className="text-base font-semibold">Blueprint 기준 워크플로우</h2>
        <div key="note" className={mutedClass}>
          {projectBlueprint
            ? `Blueprint에서 선택된 ${projectBlueprint.displayName} 기준으로 Build Issues를 생성합니다. 변경은 Blueprint에서 합니다.`
            : "Blueprint 선택값이 없습니다. 제품 유형은 Product Builder가 아니라 Blueprint에서 먼저 선택해야 합니다."}
        </div>
      </div>
      {selected ? (
        <div key="selected" className={cn(workflowSummaryClass, projectBlueprint ? "border-primary bg-primary/10" : "border-amber-500/40 bg-amber-500/10")}>
          <span key="name" className="font-medium">{selected.displayName}</span>
          <span key="class" className={mutedClass}>{selected.productClass}</span>
          <span key="counts" className={mutedClass}>
            task {selected.taskCount} · 실행 {selected.implementationCount} · SKIP {selected.skippedCount}
          </span>
        </div>
      ) : null}
      <div key="readiness" className="mt-3 rounded-md border border-border bg-background/40 p-3">
        <div key="readiness-heading" className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">입력 산출물(Project Deliverables)</span>
          <DecisionBadge decision={upstreamReadiness.ready ? "REUSE" : "N/A"}>
            {upstreamReadiness.ready ? "준비됨" : "대기"}
          </DecisionBadge>
        </div>
        <div key="readiness-note" className={cn(mutedClass, "mt-1")}>
          {upstreamReadiness.projectId
            ? "Blueprint/Wireframe 산출물 slot이 준비되어야 Build Issues를 생성합니다."
            : "고객 Project context에서 실행해야 합니다."}
        </div>
        {unreadySlots.length > 0 ? (
          <div key="unready" className="mt-2 grid gap-1">
            {unreadySlots.slice(0, 5).map((slot) => (
              <div key={slot.slotKey} className="flex min-w-0 items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate">{slot.title}</span>
                <span className="shrink-0 text-muted-foreground">{slot.status}{slot.hasContent ? "" : " · empty"}</span>
              </div>
            ))}
            {unreadySlots.length > 5 ? <div key="more" className={mutedClass}>외 {unreadySlots.length - 5}개 slot 대기</div> : null}
          </div>
        ) : null}
      </div>
    </Card>
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
      <span key="label" className="flex-1 truncate">Project Builder</span>
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
        <span className="truncate text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function PreviewStatusSlot({ muted = false }: { muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-3.5 w-3.5 rounded-full border border-muted-foreground", muted ? "opacity-30" : "opacity-70")}
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
    <div className={depth > 0 ? "pl-4" : undefined}>
      <div
        className={cn(issuePreviewRowClass, muted && "opacity-70")}
        data-preview-row-key={identifier}
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
    <aside className="sticky top-3 min-w-0 max-h-[calc(100vh-1.5rem)] overflow-auto rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm">
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
                    <SelectControl
                      key="decision-control"
                      value={task.decision}
                      options={decisionOptions}
                      ariaLabel={`${task.key} decision`}
                      className="w-28"
                      onChange={(decision) => onChange(task.key, decision)}
                    />
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

const WORKFLOW_STAGE_KO: Record<string, string> = {
  be: "BE",
  "be-qa": "BE QA",
  fe: "FE",
  "fe-qa": "FE QA",
  "full-qa": "전체 QA",
};

type WorkflowIssue = ProductBuilderBuildSummary["issues"][number];

function WorkflowBuildView({ build }: { build: ProductBuilderBuildSummary }) {
  const shared = build.issues.filter((issue) => issue.workflowRole === "shared");
  const parents = build.issues.filter((issue) => issue.taskKey.startsWith("FEATURE:"));
  const integration = build.issues.find((issue) => issue.workflowRole === "integration-qa");
  const release = build.issues.find((issue) => issue.workflowRole === "release");

  const stagesByFeature = new Map<string, WorkflowIssue[]>();
  for (const issue of build.issues) {
    if (issue.workflowRole !== "feature-stage" || !issue.featureId) continue;
    const list = stagesByFeature.get(issue.featureId) ?? [];
    list.push(issue);
    stagesByFeature.set(issue.featureId, list);
  }
  for (const list of stagesByFeature.values()) {
    list.sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0));
  }

  const featureOrder = parents
    .map((parent) => parent.featureId ?? "")
    .filter((featureId) => stagesByFeature.has(featureId));
  const titleByFeature = new Map(
    parents.map((parent) => [parent.featureId ?? "", parent.title.replace(/^\[Feature\]\s*/, "")]),
  );

  return (
    <div key="workflow" className="mt-3 grid gap-3">
      {shared.length > 0 ? (
        <div key="shared">
          <div className={cn(mutedClass, "text-xs font-semibold")}>공통 / Shared</div>
          <div className={cn(rowClass, "mt-1 flex-wrap")}>
            {shared.map((issue) => (
              <DecisionBadge key={issue.issueId} decision={issue.decision}>
                {issue.title.replace(/^\[공통\]\s*/, "")}
              </DecisionBadge>
            ))}
          </div>
        </div>
      ) : null}

      {featureOrder.map((featureId) => (
        <div key={featureId} className="rounded-md border border-border p-2">
          <div className="text-xs font-semibold">{titleByFeature.get(featureId) ?? featureId}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {(stagesByFeature.get(featureId) ?? []).map((stage, index) => (
              <div key={stage.issueId} className="flex items-center gap-1">
                {index > 0 ? <span className={mutedClass}>›</span> : null}
                <DecisionBadge decision={stage.decision}>
                  {WORKFLOW_STAGE_KO[stage.stageSlug ?? ""] ?? stage.stageSlug}
                </DecisionBadge>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div key="gates" className={cn(rowClass, "flex-wrap")}>
        {integration ? (
          <DecisionBadge key="integration" decision={integration.decision}>
            통합 QA
          </DecisionBadge>
        ) : null}
        {integration && release ? <span className={mutedClass}>›</span> : null}
        {release ? (
          <DecisionBadge key="release" decision={release.decision}>
            통합 Release
          </DecisionBadge>
        ) : null}
      </div>
    </div>
  );
}

function LastBuild({ build }: { build: ProductBuilderBuildSummary | null }) {
  if (!build) {
    return (
      <Card className={panelClass}>
        <h2 key="heading" className="text-base font-semibold">최근 생성</h2>
        <div key="empty" className={cn(mutedClass, "mt-2")}>아직 이 회사에서 생성한 Product Builder build가 없습니다.</div>
      </Card>
    );
  }
  const isWorkflow = build.issues.some((issue) => Boolean(issue.workflowRole));
  return (
    <Card className={panelClass}>
      <h2 key="heading" className="text-base font-semibold">최근 생성</h2>
      <div key="counts" className={cn(rowClass, "mt-2")}>
        <DecisionBadge key="implementation" decision="NEW">실행 {build.counts.implementation}</DecisionBadge>
        <DecisionBadge key="reuse" decision="REUSE">재사용 {build.counts.reuse}</DecisionBadge>
        <DecisionBadge key="skipped" decision="N/A">SKIP {build.counts.skipped}</DecisionBadge>
      </div>
      <div key="summary" className={cn(mutedClass, "mt-2")}>
        {build.productName} · root issue <code key="root-issue">{build.rootIssueId}</code>
      </div>
      {isWorkflow ? (
        <WorkflowBuildView build={build} />
      ) : (
        <div key="issues" className="mt-3 grid gap-2">
          {build.issues.slice(0, 8).map((issue) => (
            <div key={issue.issueId} className="flex items-center gap-2 text-xs">
              <DecisionBadge key="decision" decision={issue.decision}>{issue.decision}</DecisionBadge>
              <span key="title" className="min-w-0 truncate">
                {issue.title}
              </span>
            </div>
          ))}
          {build.issues.length > 8 ? <div key="more" className={mutedClass}>외 {build.issues.length - 8}개 issue 생성</div> : null}
        </div>
      )}
    </Card>
  );
}

export function ProductBuilderPage({ context }: PluginPageProps) {
  const companyId = context?.companyId ?? "";
  const hostProjectId = context?.projectId ?? undefined;
  const toast = usePluginToast();
  // Product Builder 페이지는 회사 레벨 라우트라 host context.projectId 가 비어 있다.
  // Blueprint/Wireframe 과 동일하게 대상 프로젝트 선택기를 제공해 projectId 를 결정한다.
  const { data: projects } = usePluginData<ProjectSummary[]>(
    BLUEPRINT_DATA.projects,
    companyId ? { companyId } : undefined,
  );
  const projectList = projects ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const projectId = selectedProjectId || hostProjectId || undefined;
  const { data: overview, loading: overviewLoading, error: overviewError, refresh } = usePluginData<ProductBuilderOverview>(
    DATA.overview,
    companyId ? { companyId, projectId } : undefined,
  );
  const appliedBlueprintRef = useRef<string | null>(null);
  const projectBlueprintId = overview?.projectBlueprint?.blueprintId;
  const blueprintId = overview?.blueprints.some((entry) => entry.id === projectBlueprintId)
    ? projectBlueprintId as string
    : overview?.blueprints[0]?.id ?? "online-service-standard";
  const { data: blueprint, loading: blueprintLoading, error: blueprintError } = usePluginData<ProductBuilderBlueprint>(
    DATA.blueprint,
    { blueprintId },
  );
  const instantiate = usePluginAction(ACTION.instantiateBuild);
  const ensureBuilderResources = usePluginAction(BUILDER_ACTION.ensureBuilderResources);
  const ensuredCompanyRef = useRef<string | null>(null);
  const [intake, setIntake] = useState<ProductBuilderIntake>(EMPTY_INTAKE);
  const [featureSelection, setFeatureSelection] = useState<ProductBuilderFeatureSelection>(DEFAULT_FEATURE_SELECTION);
  const [domainFeatures, setDomainFeatures] = useState<ProductBuilderDomainFeature[]>([]);
  const [manualOverrides, setManualOverrides] = useState<Record<string, TaskDecision>>({});
  const [busy, setBusy] = useState(false);
  const canCreateBuild = Boolean(overview?.projectBlueprint && overview.upstreamReadiness.ready);

  useEffect(() => {
    if (!companyId || ensuredCompanyRef.current === companyId) return;
    ensuredCompanyRef.current = companyId;
    void ensureBuilderResources({ companyId }).catch((error) => {
      ensuredCompanyRef.current = null;
      toast({
        tone: "warn",
        title: error instanceof Error ? error.message : "Builder 에이전트 준비 실패",
      });
    });
  }, [companyId, ensureBuilderResources, toast]);

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

  useEffect(() => {
    if (!overview || appliedBlueprintRef.current === blueprintId) return;
    const entry = overview.blueprints.find((item) => item.id === blueprintId);
    if (!entry) return;
    appliedBlueprintRef.current = blueprintId;
    setFeatureSelection(entry.defaultFeatureSelection);
    setDomainFeatures(entry.defaultDomainFeatures);
    setManualOverrides({});
  }, [blueprintId, overview]);

  function changeFeatureSelection(next: ProductBuilderFeatureSelection) {
    setFeatureSelection(next);
    setManualOverrides({});
  }

  async function createBuild() {
    if (!companyId) {
      toast({ tone: "error", title: "회사 컨텍스트가 필요합니다." });
      return;
    }
    if (!overview?.projectBlueprint) {
      toast({ tone: "error", title: "Blueprint에서 제품 유형을 먼저 선택하세요." });
      return;
    }
    if (!overview.upstreamReadiness.ready) {
      toast({ tone: "error", title: "Blueprint/Wireframe 산출물 slot을 먼저 준비하세요." });
      return;
    }
    setBusy(true);
    try {
      const result = await instantiate({
        companyId,
        projectId,
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

  if (overviewLoading || blueprintLoading) return <div className={pageStateClass}>Product Builder 로딩중...</div>;
  if (overviewError || blueprintError) {
    return <div className={cn(pageStateClass, "text-destructive")}>Product Builder 오류: {(overviewError ?? blueprintError)?.message}</div>;
  }
  if (!blueprint || !overview) return <div className={pageStateClass}>Product Builder blueprint를 찾을 수 없습니다.</div>;

  return (
    <div className={pageClass}>
      <div key="header" className="flex flex-wrap items-start justify-between gap-3">
        <div key="title">
          <h1 key="heading" className="text-xl font-semibold">Product Builder</h1>
          <div key="subtitle" className={mutedClass}>Blueprint에서 확정한 제품 유형 기준으로 고정 제작 템플릿 전체를 생성하고, 해당 없는 단위는 REUSE/N/A SKIP 기록으로 닫습니다.</div>
          <Label key="project-select" className="mt-2 block max-w-xs">
            <span className={labelClass}>대상 프로젝트</span>
            <Select
              value={projectId ?? ""}
              onChange={(event) => setSelectedProjectId(event.target.value)}
            >
              <option value="">(프로젝트 선택)</option>
              {projectList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}{project.status ? ` · ${project.status}` : ""}
                </option>
              ))}
            </Select>
          </Label>
        </div>
        <div key="actions" className={rowClass}>
          <DecisionBadge key="workflow" decision="EXTEND">{blueprint.displayName}</DecisionBadge>
          <DecisionBadge key="implementation" decision="NEW">실행 {counts.implementation}</DecisionBadge>
          <DecisionBadge key="reuse" decision="REUSE">재사용 {counts.reuse}</DecisionBadge>
          <DecisionBadge key="skipped" decision="N/A">SKIP {counts.skipped}</DecisionBadge>
          <Button key="create" className={primaryButtonClass} disabled={busy || !canCreateBuild} onClick={() => void createBuild()}>
            {busy ? "생성중..." : "Build Issues 생성"}
          </Button>
        </div>
      </div>

      <div key="body" className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
        <div key="left" className="grid gap-4">
          <BlueprintWorkflowPanel
            key="workflow"
            blueprints={overview.blueprints}
            selectedId={blueprintId}
            projectBlueprint={overview.projectBlueprint}
            upstreamReadiness={overview.upstreamReadiness}
          />

          <Card key="intake" className={panelClass}>
            <h2 key="heading" className="mb-3 text-base font-semibold">Intake / 기획 브리프</h2>
            <div key="fields" className="grid gap-3">
              <Field key="productName" label="제품명" value={intake.productName} onChange={(productName) => set({ productName })} />
              <Field key="customerName" label="고객명" value={intake.customerName} onChange={(customerName) => set({ customerName })} />
              <Field key="referenceService" label="참고 서비스" value={intake.referenceService} onChange={(referenceService) => set({ referenceService })} />
              <Field key="productSummary" label="제품 요약" value={intake.productSummary} onChange={(productSummary) => set({ productSummary })} multiline />
              <Field key="targetUsers" label="타겟 사용자" value={intake.targetUsers} onChange={(targetUsers) => set({ targetUsers })} multiline />
              <Field key="customNotes" label="추가 조건" value={intake.customNotes} onChange={(customNotes) => set({ customNotes })} multiline />
            </div>
          </Card>

          <FeatureSelector key="features" features={featureSelection} onChange={changeFeatureSelection} />

          <DomainFeaturePanel key="domain-features" features={domainFeatures} onChange={setDomainFeatures} />

          <Card key="stack" className={panelClass}>
            <h2 key="heading" className="text-base font-semibold">고정 환경</h2>
            <div key="items" className="mt-2 grid gap-1.5 text-sm">
              <div key="base">Base: <strong key="value">{blueprint.baseRepository.name}</strong></div>
              <div key="base-status" className={mutedClass}>{blueprint.baseRepository.readinessGate}</div>
              <div key="web">Web: <strong key="value">{blueprint.defaultStack.web}</strong></div>
              <div key="api">API: <strong key="value">{blueprint.defaultStack.api}</strong></div>
              <div key="db">DB: <strong key="value">{blueprint.defaultStack.database}</strong></div>
              <div key="deploy">Deploy: <strong key="value">{blueprint.defaultStack.deploy}</strong></div>
              <div key="contract">Contract: <strong key="value">{blueprint.defaultStack.contract}</strong></div>
              {blueprint.defaultStack.ai ? (
                <div key="ai">AI: <strong key="value">{blueprint.defaultStack.ai}</strong></div>
              ) : null}
            </div>
          </Card>

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
