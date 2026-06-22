import { randomUUID } from "node:crypto";
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import {
  ACTION,
  DATA,
  T_WIREFRAMES,
  T_COMMENTS,
  buildWireframeDeliverableSlot,
  generationChannel,
  commentsChannel,
  type ReferenceDoc,
  type WireframeComment,
  type WireframeInput,
  type WireframeProjectSummary,
  type WireframeRecord,
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

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function projectSlotBody(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  slotKey: string,
): Promise<string> {
  const content = await ctx.projects.documentSlots.content(projectId, slotKey, companyId);
  return content?.document?.body?.trim() ?? "";
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
      await importWireframeSlot(ctx, companyId, rec, html);
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
      const upstreamStandardPlan = projectId
        ? await projectSlotBody(ctx, companyId, projectId, "deliverable.standard_plan")
        : "";
      const upstreamScreenDoc = projectId
        ? await projectSlotBody(ctx, companyId, projectId, "deliverable.screen_definitions")
        : "";
      const specDoc = stripControlChars([
        input.specDoc ?? "",
        upstreamStandardPlan ? `# Project Slot: deliverable.standard_plan\n\n${upstreamStandardPlan}` : "",
      ].filter(Boolean).join("\n\n"));
      let screenModel = normalizeScreenDoc(input.screenModel);
      if (!hasContent(screenModel) && upstreamScreenDoc) {
        screenModel = normalizeScreenDoc(await extractScreenSpec(upstreamScreenDoc));
      }
      if (!specDoc.trim() && !hasContent(screenModel)) {
        throw new Error("기획서 또는 화면 정의서 중 하나는 입력해야 합니다.");
      }
      const screenDoc = renderScreenDoc(screenModel);
      const referenceDocs: ReferenceDoc[] = Array.isArray(input.referenceDocs)
        ? input.referenceDocs
            .filter((d) => d && typeof d.text === "string" && d.text.trim().length > 0)
            .slice(0, 20)
            .map((d) => ({
              filename: stripControlChars(d.filename ?? "첨부").slice(0, 200) || "첨부",
              text: stripControlChars(d.text).slice(0, 200_000),
            }))
        : [];
      if (projectId) {
        await ctx.db.execute(
          `DELETE FROM ${T_COMMENTS} WHERE company_id=$1 AND wireframe_id IN (SELECT id FROM ${T_WIREFRAMES} WHERE company_id=$1 AND project_id=$2)`,
          [companyId, projectId],
        );
        await ctx.db.execute(`DELETE FROM ${T_WIREFRAMES} WHERE company_id=$1 AND project_id=$2`, [companyId, projectId]);
      } else {
        await ctx.db.execute(`DELETE FROM ${T_COMMENTS} WHERE company_id=$1`, [companyId]);
        await ctx.db.execute(`DELETE FROM ${T_WIREFRAMES} WHERE company_id=$1`, [companyId]);
      }
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
          JSON.stringify(referenceDocs),
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
	          await importWireframeSlot(ctx, companyId, { ...wf, specDoc, screenDoc, screenModel, html, status: "generated" }, html);
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
      await ctx.db.execute(`DELETE FROM ${T_COMMENTS} WHERE company_id=$1 AND wireframe_id=$2`, [companyId, id]);
      await ctx.db.execute(`DELETE FROM ${T_WIREFRAMES} WHERE company_id=$1 AND id=$2`, [companyId, id]);
      return { ok: true };
    });

    ctx.actions.register(ACTION.extractScreenModel, async (params) => {
      const text = stripControlChars(String(params.text ?? ""));
      if (!text.trim()) throw new Error("파일에서 추출할 텍스트가 없습니다.");
      const screenModel = normalizeScreenDoc(await extractScreenSpec(text));
      return { screenModel };
    });
  },

  async onHealth() {
    return { status: "ok", message: "wireframe-builder worker running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
