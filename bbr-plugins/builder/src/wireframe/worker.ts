import { randomUUID } from "node:crypto";
import { definePlugin } from "@paperclipai/plugin-sdk";
import {
  ACTION,
  DATA,
  T_WIREFRAMES,
  T_COMMENTS,
  SCREEN_DEFINITIONS_SLOT_KEY,
  STANDARD_PLAN_SLOT_KEY,
  buildWireframeDeliverableSlot,
  generationChannel,
  commentsChannel,
  type ReferenceDoc,
  type WireframeComment,
  type WireframeInput,
  type WireframeProjectSummary,
  type WireframeRecord,
  type WireframeUpstreamSlot,
  type WireframeUpstreamSlots,
} from "./contract.js";
import { generateHtml, reviseAll, stripControlChars, extractScreenSpec } from "./wireframe-prompt.js";
import { hasContent, normalizeScreenDoc, renderScreenDoc } from "./screen-spec.js";

type AnyCtx = Parameters<NonNullable<Parameters<typeof definePlugin>[0]["setup"]>>[0];

function asCompanyId(params: Record<string, unknown>, ctxCompanyId?: string | null): string {
  const v = (params.companyId as string) ?? ctxCompanyId ?? null;
  if (!v) throw new Error("companyId 가 필요합니다.");
  return v;
}

function rowToRecord(r: Record<string, unknown>): WireframeRecord {
  const record = {
    id: String(r.id),
    companyId: String(r.company_id),
    projectId: r.project_id == null ? null : String(r.project_id),
    title: String(r.title ?? ""),
    specDoc: String(r.spec_doc ?? ""),
    screenDoc: String(r.screen_doc ?? ""),
    screenModel: normalizeScreenDoc(r.screen_model),
    referenceDocs: Array.isArray(r.reference_docs) ? (r.reference_docs as ReferenceDoc[]) : [],
    html: r.html == null ? null : String(r.html),
    status: (r.status as WireframeRecord["status"]) ?? "draft",
    errorMessage: r.error_message == null ? null : String(r.error_message),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
  return { ...record, deliverableSlot: buildWireframeDeliverableSlot(record) };
}

function commentRow(r: Record<string, unknown>): WireframeComment {
  return {
    id: String(r.id),
    wireframeId: String(r.wireframe_id),
    authorType: (r.author_type as WireframeComment["authorType"]) ?? "user",
    authorUserId: r.author_user_id == null ? null : String(r.author_user_id),
    body: String(r.body ?? ""),
    kind: (r.kind as WireframeComment["kind"]) ?? "comment",
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

async function loadWireframe(ctx: AnyCtx, companyId: string, id: string): Promise<WireframeRecord | null> {
  const rows = await ctx.db.query<Record<string, unknown>>(
    `SELECT * FROM ${T_WIREFRAMES} WHERE company_id=$1 AND id=$2 LIMIT 1`,
    [companyId, id],
  );
  return rows[0] ? rowToRecord(rows[0]) : null;
}

async function loadGeneratingWireframe(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | null,
): Promise<WireframeRecord | null> {
  const rows = projectId
    ? await ctx.db.query<Record<string, unknown>>(
      `SELECT * FROM ${T_WIREFRAMES}
       WHERE company_id=$1 AND project_id=$2 AND status='generating'
       ORDER BY created_at DESC LIMIT 1`,
      [companyId, projectId],
    )
    : await ctx.db.query<Record<string, unknown>>(
      `SELECT * FROM ${T_WIREFRAMES}
       WHERE company_id=$1 AND project_id IS NULL AND status='generating'
       ORDER BY created_at DESC LIMIT 1`,
      [companyId],
    );
  return rows[0] ? rowToRecord(rows[0]) : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function projectSlotReady(status: unknown): boolean {
  return status === "ready" || status === "approved";
}

const UPSTREAM_PREVIEW_CHARS = 600;

/**
 * 입력 페이지 미리보기용 상위 slot 요약. server getContent 는 slot row 가 없으면 null,
 * document 가 없으면 document=null 을 주므로 방어적으로 매핑한다. screenCount 는
 * slot.metadata 에만 저장되므로 document.body 를 파싱하지 않는다.
 */
function toUpstreamSlot(slotKey: string, content: unknown): WireframeUpstreamSlot | null {
  const c = content as
    | {
        slot?: { status?: unknown; title?: unknown; metadata?: Record<string, unknown> | null; updatedAt?: unknown };
        document?: { body?: unknown } | null;
      }
    | null
    | undefined;
  if (!c?.slot) return null;
  const body = typeof c.document?.body === "string" ? c.document.body.trim() : "";
  const hasBody = body.length > 0;
  const metadata = (c.slot.metadata ?? {}) as Record<string, unknown>;
  const rawCount = metadata.screenCount;
  const screenCount = typeof rawCount === "number" && Number.isFinite(rawCount) ? rawCount : null;
  const status = (typeof c.slot.status === "string" ? c.slot.status : "empty") as WireframeUpstreamSlot["status"];
  const updatedAt = c.slot.updatedAt == null
    ? null
    : c.slot.updatedAt instanceof Date
      ? c.slot.updatedAt.toISOString()
      : String(c.slot.updatedAt);
  return {
    slotKey,
    title: typeof c.slot.title === "string" ? c.slot.title : slotKey,
    status,
    updatedAt,
    screenCount,
    bodyPreview: body.slice(0, UPSTREAM_PREVIEW_CHARS),
    hasBody,
    included: projectSlotReady(status) && hasBody,
  };
}

async function projectSlotBodyIfReady(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  slotKey: string,
): Promise<string> {
  const content = await ctx.projects.documentSlots.content(projectId, slotKey, companyId);
  if (!projectSlotReady(content?.slot?.status)) return "";
  return content?.document?.body?.trim() ?? "";
}

async function requiredProjectSlotBody(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  slotKey: string,
  label: string,
): Promise<string> {
  const content = await ctx.projects.documentSlots.content(projectId, slotKey, companyId);
  const body = content?.document?.body?.trim() ?? "";
  if (!projectSlotReady(content?.slot?.status) || !body) {
    throw new Error(`${label} slot(${slotKey})이 ready/approved 상태여야 합니다.`);
  }
  return body;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function setStatus(
  ctx: AnyCtx,
  companyId: string,
  id: string,
  fields: Partial<{ status: string; html: string | null; errorMessage: string | null }>,
): Promise<void> {
  const sets: string[] = ["updated_at = now()"];
  const vals: unknown[] = [];
  let i = 1;
  if (fields.status !== undefined) {
    sets.push(`status = $${i++}`);
    vals.push(fields.status);
  }
  if (fields.html !== undefined) {
    sets.push(`html = $${i++}`);
    vals.push(fields.html);
  }
  if (fields.errorMessage !== undefined) {
    sets.push(`error_message = $${i++}`);
    vals.push(fields.errorMessage);
  }
  vals.push(companyId, id);
  await ctx.db.execute(
    `UPDATE ${T_WIREFRAMES} SET ${sets.join(", ")} WHERE company_id = $${i++} AND id = $${i}`,
    vals,
  );
}

async function importWireframeSlot(ctx: AnyCtx, companyId: string, rec: WireframeRecord, html: string): Promise<void> {
  if (!rec.projectId) return;
  const slot = buildWireframeDeliverableSlot({
    id: rec.id,
    status: "generated",
    html,
    updatedAt: nowIso(),
  });
  await ctx.projects.documentSlots.import(rec.projectId, slot.slotKey, {
    title: slot.title,
    format: "html",
    body: html,
    status: "ready",
    contentType: slot.contentType,
    metadata: {
      ...slot.metadata,
      projectId: rec.projectId,
      wireframeId: rec.id,
      artifactRef: slot.artifactRef,
      documentRefs: slot.documentRefs,
    },
  }, companyId);
}

async function claimGenerating(ctx: AnyCtx, companyId: string, id: string): Promise<boolean> {
  const res = await ctx.db.execute(
    `UPDATE ${T_WIREFRAMES} SET status='generating', error_message=NULL, updated_at=now()
     WHERE company_id=$1 AND id=$2 AND status <> 'generating'`,
    [companyId, id],
  );
  const rowCount = (res as { rowCount?: number })?.rowCount ?? 0;
  return rowCount > 0;
}

async function emitProgress(ctx: AnyCtx, id: string, phase: string, message: string): Promise<void> {
  try {
    await ctx.streams?.emit?.(generationChannel(id), { phase, message, at: nowIso() });
  } catch {
  }
}

function startGenerateJob(ctx: AnyCtx, companyId: string, rec: WireframeRecord): void {
  void (async () => {
    try {
      await emitProgress(ctx, rec.id, "generating", "와이어프레임 생성 중…");
      const html = await generateHtml({
        title: rec.title,
        specDoc: rec.specDoc,
        screenDoc: rec.screenDoc,
        referenceDocs: rec.referenceDocs,
      });
      await setStatus(ctx, companyId, rec.id, { status: "generated", html, errorMessage: null });
      await emitProgress(ctx, rec.id, "generated", "완료");
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      await setStatus(ctx, companyId, rec.id, { status: "error", errorMessage: msg.slice(0, 1000) });
      await emitProgress(ctx, rec.id, "error", msg.slice(0, 300));
    }
  })();
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register(DATA.getCurrent, async (params) => {
      const companyId = asCompanyId(params);
      const projectId = nonEmptyString(params.projectId);
      const rows = projectId
        ? await ctx.db.query<Record<string, unknown>>(
          `SELECT * FROM ${T_WIREFRAMES} WHERE company_id=$1 AND project_id=$2 ORDER BY created_at DESC LIMIT 1`,
          [companyId, projectId],
        )
        : await ctx.db.query<Record<string, unknown>>(
          `SELECT * FROM ${T_WIREFRAMES} WHERE company_id=$1 ORDER BY created_at DESC LIMIT 1`,
          [companyId],
        );
      return rows[0] ? rowToRecord(rows[0]) : null;
    });

    ctx.data.register(DATA.projects, async (params) => {
      const companyId = asCompanyId(params);
      const projects = await ctx.projects.list({ companyId });
      return projects.map((project): WireframeProjectSummary => ({
        id: project.id,
        name: project.name,
        status: project.status ?? null,
      }));
    });

    ctx.data.register(DATA.upstreamSlots, async (params): Promise<WireframeUpstreamSlots> => {
      const companyId = asCompanyId(params);
      const projectId = nonEmptyString(params.projectId);
      if (!projectId) {
        return { projectId: null, screenDefinitions: null, standardPlan: null, ready: false };
      }
      const [screenContent, planContent] = await Promise.all([
        ctx.projects.documentSlots.content(projectId, SCREEN_DEFINITIONS_SLOT_KEY, companyId),
        ctx.projects.documentSlots.content(projectId, STANDARD_PLAN_SLOT_KEY, companyId),
      ]);
      const screenDefinitions = toUpstreamSlot(SCREEN_DEFINITIONS_SLOT_KEY, screenContent);
      const standardPlan = toUpstreamSlot(STANDARD_PLAN_SLOT_KEY, planContent);
      return {
        projectId,
        screenDefinitions,
        standardPlan,
        ready: screenDefinitions?.included === true,
      };
    });

    ctx.data.register(DATA.getWireframe, async (params) => {
      const companyId = asCompanyId(params);
      const id = String(params.id ?? "");
      const wf = await loadWireframe(ctx, companyId, id);
      if (!wf) throw new Error("와이어프레임을 찾을 수 없습니다.");
      return wf;
    });

    ctx.data.register(DATA.listComments, async (params) => {
      const companyId = asCompanyId(params);
      const id = String(params.id ?? "");
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${T_COMMENTS} WHERE company_id=$1 AND wireframe_id=$2 ORDER BY created_at ASC`,
        [companyId, id],
      );
      return rows.map(commentRow);
    });

    ctx.actions.register(ACTION.createWireframe, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const input = params.input as WireframeInput;
      if (!input?.title?.trim()) throw new Error("제목을 입력하세요.");
      const projectId = nonEmptyString(params.projectId) ?? nonEmptyString(input.projectId);
      // Wireframe은 Blueprint 산출물(slot)에서만 생성한다. 프로젝트 선택은 필수.
      if (!projectId) {
        throw new Error("프로젝트를 선택해야 합니다. Blueprint에서 화면정의서를 먼저 만들어 주세요.");
      }
      const generating = await loadGeneratingWireframe(ctx, companyId, projectId);
      if (generating) {
        throw new Error("현재 프로젝트의 와이어프레임이 생성 중입니다. 완료 후 다시 생성하세요.");
      }
      const upstreamStandardPlan = await projectSlotBodyIfReady(ctx, companyId, projectId, "deliverable.standard_plan");
      const upstreamScreenDoc = await requiredProjectSlotBody(ctx, companyId, projectId, "deliverable.screen_definitions", "Blueprint 화면정의서");
      const specDoc = stripControlChars(
        upstreamStandardPlan ? `# Project Slot: deliverable.standard_plan\n\n${upstreamStandardPlan}` : "",
      );
      const screenModel = normalizeScreenDoc(await extractScreenSpec(upstreamScreenDoc));
      if (!hasContent(screenModel)) {
        throw new Error("Blueprint 화면정의서 slot에서 화면 정보를 찾지 못했습니다.");
      }
      const screenDoc = renderScreenDoc(screenModel);
      await ctx.db.execute(
        `DELETE FROM ${T_COMMENTS} WHERE company_id=$1 AND wireframe_id IN (SELECT id FROM ${T_WIREFRAMES} WHERE company_id=$1 AND project_id=$2)`,
        [companyId, projectId],
      );
      await ctx.db.execute(`DELETE FROM ${T_WIREFRAMES} WHERE company_id=$1 AND project_id=$2`, [companyId, projectId]);
      const id = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${T_WIREFRAMES}
           (id, company_id, project_id, title, spec_doc, screen_doc, screen_model, reference_docs, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,'draft')`,
        [
          id,
          companyId,
          projectId,
          stripControlChars(input.title).trim(),
          specDoc,
          screenDoc,
          JSON.stringify(screenModel),
          JSON.stringify([] as ReferenceDoc[]),
        ],
      );
      return { id };
    });

    ctx.actions.register(ACTION.triggerGenerate, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const wf = await loadWireframe(ctx, companyId, id);
      if (!wf) throw new Error("와이어프레임을 찾을 수 없습니다.");
      const claimed = await claimGenerating(ctx, companyId, id);
      if (!claimed) return { ok: false, reason: "이미 생성 중입니다." };
      startGenerateJob(ctx, companyId, { ...wf, status: "generating" });
      return { ok: true };
    });

    // 생성/수정은 fire-and-forget job이라 invocation scope 밖에서 documentSlots.import 를
    // 호출할 수 없다. slot 기록은 동기 액션 컨텍스트(scope 유효)에서 수행한다.
    ctx.actions.register(ACTION.syncDeliverableSlot, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const wf = await loadWireframe(ctx, companyId, id);
      if (!wf) return { ok: false, reason: "not-found" };
      if (!wf.projectId || !wf.html || wf.status !== "generated") {
        return { ok: false, skipped: true };
      }
      await importWireframeSlot(ctx, companyId, wf, wf.html);
      return { ok: true };
    });

    ctx.actions.register(ACTION.updateInputs, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const wf = await loadWireframe(ctx, companyId, id);
      if (!wf) throw new Error("와이어프레임을 찾을 수 없습니다.");
      const title = params.title !== undefined ? stripControlChars(String(params.title)).trim() : wf.title;
      const specDoc = params.specDoc !== undefined ? stripControlChars(String(params.specDoc)) : wf.specDoc;
      const screenModel = params.screenModel !== undefined ? normalizeScreenDoc(params.screenModel) : wf.screenModel;
      const screenDoc = renderScreenDoc(screenModel);
      await ctx.db.execute(
        `UPDATE ${T_WIREFRAMES} SET title=$1, spec_doc=$2, screen_doc=$3, screen_model=$4::jsonb, updated_at=now()
         WHERE company_id=$5 AND id=$6`,
        [title || wf.title, specDoc, screenDoc, JSON.stringify(screenModel), companyId, id],
      );
      return { ok: true };
    });

    ctx.actions.register(ACTION.addComment, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const body = stripControlChars(String(params.body ?? "")).trim();
      if (!body) throw new Error("내용을 입력하세요.");
      const wf = await loadWireframe(ctx, companyId, id);
      if (!wf) throw new Error("와이어프레임을 찾을 수 없습니다.");

      const userCommentId = randomUUID();
      const rawActorId = context.actor?.userId;
      const authorUserId =
        typeof rawActorId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawActorId)
          ? rawActorId
          : null;
      await ctx.db.execute(
        `INSERT INTO ${T_COMMENTS} (id, company_id, wireframe_id, author_type, author_user_id, body, kind)
         VALUES ($1,$2,$3,'user',$4,$5,'comment')`,
        [userCommentId, companyId, id, authorUserId, body],
      );

      if (!wf.html) {
        const sysId = randomUUID();
        await ctx.db.execute(
          `INSERT INTO ${T_COMMENTS} (id, company_id, wireframe_id, author_type, body, kind)
           VALUES ($1,$2,$3,'system',$4,'comment')`,
          [sysId, companyId, id, "아직 생성된 와이어프레임이 없습니다. 먼저 '생성'을 실행하세요."],
        );
        return { ok: true, revised: false };
      }

      const claimed = await claimGenerating(ctx, companyId, id);
      if (!claimed) {
        const busyId = randomUUID();
        await ctx.db.execute(
          `INSERT INTO ${T_COMMENTS} (id, company_id, wireframe_id, author_type, body, kind)
           VALUES ($1,$2,$3,'system',$4,'comment')`,
          [busyId, companyId, id, "이미 생성/수정 중입니다. 완료 후 다시 시도하세요."],
        );
        return { ok: true, revised: false };
      }

      const currentHtml = wf.html;
      void (async () => {
        try {
          const { html, specDoc, screenModel, summary } = await reviseAll(currentHtml, wf.specDoc, wf.screenModel, body);
          const screenDoc = renderScreenDoc(screenModel);
	          await ctx.db.execute(
	            `UPDATE ${T_WIREFRAMES}
	               SET html=$1, spec_doc=$2, screen_doc=$3, screen_model=$4::jsonb, status='generated', updated_at=now()
	             WHERE company_id=$5 AND id=$6`,
	            [html, specDoc, screenDoc, JSON.stringify(screenModel), companyId, id],
	          );
	          const revId = randomUUID();
          await ctx.db.execute(
            `INSERT INTO ${T_COMMENTS} (id, company_id, wireframe_id, author_type, body, kind)
             VALUES ($1,$2,$3,'assistant',$4,'revision')`,
            [revId, companyId, id, summary],
          );
        } catch (e) {
          await setStatus(ctx, companyId, id, { status: "generated" });
          const errId = randomUUID();
          await ctx.db.execute(
            `INSERT INTO ${T_COMMENTS} (id, company_id, wireframe_id, author_type, body, kind)
             VALUES ($1,$2,$3,'system',$4,'comment')`,
            [errId, companyId, id, "수정 실패: " + ((e as Error).message ?? String(e)).slice(0, 300)],
          );
        }
        try {
          await ctx.streams?.emit?.(commentsChannel(id), { wireframeId: id });
        } catch {
        }
      })();

      return { ok: true, queued: true };
    });

    ctx.actions.register(ACTION.deleteWireframe, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const wf = await loadWireframe(ctx, companyId, id);
      if (!wf) return { ok: true };
      if (wf.status === "generating") throw new Error("생성 중인 와이어프레임은 삭제할 수 없습니다.");
      await ctx.db.execute(`DELETE FROM ${T_COMMENTS} WHERE company_id=$1 AND wireframe_id=$2`, [companyId, id]);
      await ctx.db.execute(`DELETE FROM ${T_WIREFRAMES} WHERE company_id=$1 AND id=$2`, [companyId, id]);
      return { ok: true };
    });
  },

  async onHealth() {
    return { status: "ok", message: "wireframe-builder worker running" };
  },
});

export default plugin;
