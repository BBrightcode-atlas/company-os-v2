import { randomUUID } from "node:crypto";
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import {
  ACTION,
  DATA,
  DEFAULT_EUL,
  T_CONTRACTS,
  T_COMMENTS,
  generationChannel,
  commentsChannel,
  isAllowedCompany,
  type ContractData,
  type ContractInput,
  type ContractRecord,
  type EulInfo,
  type QuoteComment,
} from "./contract.js";
import { GENERATOR_INSTRUCTIONS } from "./agent/contract-instructions.js";
import {
  buildGeneratePrompt,
  buildReplyPrompt,
  parseContractData,
  parseReplyDecision,
} from "./lib/generation.js";
import { renderContractHtml } from "./template/contract-template.js";

// 생성은 vibeproxy(Anthropic 호환 게이트웨이)에 직접 호출(견적 플러그인과 동일 이유:
// host managed-agent 프롬프트 유실 + ctx.http SSRF 가드). worker raw fetch.
const LLM_BASE = (process.env.ANTHROPIC_BASE_URL || "http://localhost:8317").replace(/\/+$/, "");
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "no-key-required";
const LLM_MODEL = process.env.CONTRACT_GENERATOR_MODEL || "claude-opus-4-8";

const SYSTEM_GUARD = [
  "너는 계약 데이터를 JSON 으로만 출력하는 순수 함수다. 대화형 에이전트가 아니다.",
  "너에게는 파일시스템·도구·웹·AGENTS.md 가 전혀 없다. 무엇을 찾거나 읽으려 하지 마라.",
  "필요한 모든 입력은 user 메시지 안에 전부 들어있다. 그것만으로 즉시 산출하라.",
  "출력은 유효한 JSON 객체 하나뿐. 첫 글자 '{', 마지막 글자 '}'. 서론·설명·마크다운·코드펜스·도구호출 금지.",
].join("\n");

async function callGeneratorLlm(referenceSpec: string, userPrompt: string): Promise<string> {
  const userContent =
    `아래는 계약 생성 방법론(참고자료)과 생성 요청이다. 방법론을 적용해 결과 JSON 을 만들어라.\n\n` +
    `===== 생성 방법론 (참고자료) =====\n${referenceSpec}\n\n` +
    `===== 요청 =====\n${userPrompt}\n\n` +
    `(반드시 JSON 객체 하나만 출력. 첫 글자 '{', 마지막 글자 '}'. 도구 호출·파일 탐색·설명·코드펜스 금지.)`;
  const res = await fetch(`${LLM_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": LLM_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 16000,
      system: SYSTEM_GUARD,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`생성 LLM 호출 실패 (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
  if (!text.trim()) throw new Error("생성 LLM 응답이 비어 있습니다.");
  return text;
}

type AnyCtx = Parameters<NonNullable<Parameters<typeof definePlugin>[0]["setup"]>>[0];

function asCompanyId(params: Record<string, unknown>, ctxCompanyId?: string | null): string {
  const v = (params.companyId as string) ?? ctxCompanyId ?? null;
  if (!v) throw new Error("companyId 가 필요합니다.");
  if (!isAllowedCompany(v)) throw new Error("이 플러그인은 BBR 회사 전용입니다.");
  return v;
}

function dateStr(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function rowToRecord(r: Record<string, unknown>): ContractRecord {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    contractType: (r.contract_type as ContractRecord["contractType"]) ?? "development",
    projectName: String(r.project_name ?? ""),
    gabCompany: String(r.gab_company ?? ""),
    gabCeo: r.gab_ceo == null ? null : String(r.gab_ceo),
    gabBizNo: r.gab_biz_no == null ? null : String(r.gab_biz_no),
    gabAddress: r.gab_address == null ? null : String(r.gab_address),
    projectDesc: String(r.project_desc ?? ""),
    periodStart: dateStr(r.period_start),
    periodEnd: r.period_end == null ? null : String(r.period_end), // text: 날짜 또는 자유문구("완료시까지")
    monthlyAmount: r.monthly_amount == null ? null : Number(r.monthly_amount),
    totalAmount: r.total_amount == null ? null : Number(r.total_amount),
    vatMode: (r.vat_mode as "별도" | "포함") ?? "별도",
    jurisdiction: r.jurisdiction == null ? null : String(r.jurisdiction),
    contractDate: dateStr(r.contract_date),
    useSeal: r.use_seal == null ? true : Boolean(r.use_seal),
    status: (r.status as ContractRecord["status"]) ?? "draft",
    data: (r.data as ContractData | null) ?? null,
    html: r.html == null ? null : String(r.html),
    errorMessage: r.error_message == null ? null : String(r.error_message),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
}

function recordToInput(r: ContractRecord): ContractInput {
  return {
    contractType: r.contractType,
    gabCompany: r.gabCompany,
    gabCeo: r.gabCeo,
    gabBizNo: r.gabBizNo,
    gabAddress: r.gabAddress,
    projectName: r.projectName,
    projectDesc: r.projectDesc,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    monthlyAmount: r.monthlyAmount,
    totalAmount: r.totalAmount,
    vatMode: r.vatMode,
    jurisdiction: r.jurisdiction,
    contractDate: r.contractDate,
  };
}

async function loadContract(
  ctx: AnyCtx,
  companyId: string,
  id: string,
): Promise<ContractRecord | null> {
  const rows = await ctx.db.query<Record<string, unknown>>(
    `SELECT * FROM ${T_CONTRACTS} WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
  return rows.length ? rowToRecord(rows[0]) : null;
}

async function loadEul(ctx: AnyCtx): Promise<EulInfo> {
  let cfg: Record<string, unknown> = {};
  try {
    cfg = (await ctx.config.get()) ?? {};
  } catch {
    cfg = {};
  }
  const pick = (k: string, fallback: string) =>
    typeof cfg[k] === "string" && (cfg[k] as string).trim() ? (cfg[k] as string) : fallback;
  return {
    companyName: pick("eulCompanyName", DEFAULT_EUL.companyName),
    ceo: pick("eulCeo", DEFAULT_EUL.ceo),
    bizNo: pick("eulBizNo", DEFAULT_EUL.bizNo),
    address: pick("eulAddress", DEFAULT_EUL.address),
  };
}

function commentRow(r: Record<string, unknown>): QuoteComment {
  return {
    id: String(r.id),
    quoteId: String(r.contract_id),
    authorType: (r.author_type as QuoteComment["authorType"]) ?? "user",
    authorUserId: r.author_user_id == null ? null : String(r.author_user_id),
    body: String(r.body ?? ""),
    kind: (r.kind as QuoteComment["kind"]) ?? "comment",
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

function wonText(n: number | null | undefined): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${v.toLocaleString("ko-KR")}원`;
}

/** 원자적으로 'analyzing'(=생성중) 상태 선점. 이미 생성중이면 false(중복/경합 차단). */
async function claimGenerating(ctx: AnyCtx, companyId: string, id: string): Promise<boolean> {
  const res = await ctx.db.execute(
    `UPDATE ${T_CONTRACTS} SET status='analyzing', error_message=NULL, updated_at=now()
     WHERE company_id=$1 AND id=$2 AND status<>'analyzing'`,
    [companyId, id],
  );
  return ((res as { rowCount?: number })?.rowCount ?? 0) > 0;
}

/** 신규 계약 생성 잡(fire-and-forget). 전제: 호출측이 claimGenerating() 선점. */
function startGenerationJob(ctx: AnyCtx, companyId: string, contract: ContractRecord): void {
  const id = contract.id;
  const channel = generationChannel(id);
  ctx.streams.open(channel, companyId);
  const emit = (phase: string, message: string) =>
    ctx.streams.emit(channel, { phase, message, at: new Date().toISOString() });

  void (async () => {
    try {
      emit("start", "계약서 생성을 시작합니다…");
      const fresh = (await loadContract(ctx, companyId, id)) ?? contract;
      const input = recordToInput(fresh);
      emit("delegate", "AI 생성 중…");
      const raw = await callGeneratorLlm(GENERATOR_INSTRUCTIONS, buildGeneratePrompt(input));
      emit("parse", "결과 파싱…");
      let data: ContractData;
      try {
        data = parseContractData(raw);
      } catch (pe) {
        const pm = pe instanceof Error ? pe.message : String(pe);
        throw new Error(`${pm} | RAW(0..600)=${raw.slice(0, 600)}`);
      }
      const eul = await loadEul(ctx);
      const html = renderContractHtml(fresh, data, eul);
      await ctx.db.execute(
        `UPDATE ${T_CONTRACTS} SET data=$3::jsonb, html=$4, status='analyzed', updated_at=now() WHERE company_id=$1 AND id=$2`,
        [companyId, id, JSON.stringify(data), html],
      );
      emit("done", "생성 완료");
      ctx.streams.close(channel);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ctx.logger.error("contract generation failed", { id, msg });
      await ctx.db
        .execute(
          `UPDATE ${T_CONTRACTS} SET status='error', error_message=$3, updated_at=now() WHERE company_id=$1 AND id=$2`,
          [companyId, id, msg],
        )
        .catch(() => {});
      emit("error", msg);
      ctx.streams.close(channel);
    }
  })();
}

/**
 * 사용자 댓글 1건을 LLM 에 보내 의도 판단(보완 vs 답변) 후 처리(fire-and-forget).
 * 전제: 호출측이 claimGenerating() 선점 + contract.data 존재.
 */
function startReplyJob(
  ctx: AnyCtx,
  companyId: string,
  contract: ContractRecord,
  opts: { instruction: string; priorStatus: ContractRecord["status"]; sourceCommentId: string },
): void {
  const id = contract.id;
  const channel = generationChannel(id);
  ctx.streams.open(channel, companyId);
  const emit = (phase: string, message: string) =>
    ctx.streams.emit(channel, { phase, message, at: new Date().toISOString() });

  const postAssistant = async (
    body: string,
    kind: "comment" | "revision",
    metadata: Record<string, unknown> | null,
  ) => {
    const cid = randomUUID();
    await ctx.db.execute(
      `INSERT INTO ${T_COMMENTS} (id, company_id, contract_id, author_type, author_user_id, body, kind, metadata)
       VALUES ($1,$2,$3,'assistant',NULL,$4,$5,$6::jsonb)`,
      [cid, companyId, id, body, kind, metadata ? JSON.stringify(metadata) : null],
    );
    ctx.streams.emit(commentsChannel(id), {
      id: cid,
      quoteId: id,
      authorType: "assistant",
      authorUserId: null,
      body,
      kind,
      metadata: null,
      createdAt: new Date().toISOString(),
    });
  };
  const restoreStatus = () =>
    ctx.db
      .execute(`UPDATE ${T_CONTRACTS} SET status=$3, updated_at=now() WHERE company_id=$1 AND id=$2`, [
        companyId,
        id,
        opts.priorStatus,
      ])
      .catch(() => {});

  void (async () => {
    try {
      emit("start", "AI가 댓글을 검토 중…");
      const fresh = (await loadContract(ctx, companyId, id)) ?? contract;
      const prior = fresh.data;
      if (!prior) {
        await restoreStatus();
        await postAssistant("아직 생성 결과가 없어 보완할 수 없습니다. 먼저 생성을 실행해 주세요.", "comment", null);
        emit("done", "완료");
        ctx.streams.close(channel);
        return;
      }
      emit("delegate", "AI 처리 중…");
      const raw = await callGeneratorLlm(GENERATOR_INSTRUCTIONS, buildReplyPrompt(prior, opts.instruction));
      emit("parse", "결과 파싱…");
      const decision = parseReplyDecision(raw);

      if (decision.action === "revise") {
        const data = decision.data;
        const eul = await loadEul(ctx);
        const html = renderContractHtml(fresh, data, eul);
        await ctx.db.execute(
          `UPDATE ${T_CONTRACTS} SET data=$3::jsonb, html=$4, status='analyzed', updated_at=now() WHERE company_id=$1 AND id=$2`,
          [companyId, id, JSON.stringify(data), html],
        );
        const lines = ["🔧 AI 보완 완료", decision.message];
        if (prior.totalAmount !== data.totalAmount)
          lines.push(`· 총액 ${wonText(prior.totalAmount)} → ${wonText(data.totalAmount)}`);
        if (prior.monthlyAmount !== data.monthlyAmount)
          lines.push(`· 월 ${wonText(prior.monthlyAmount)} → ${wonText(data.monthlyAmount)}`);
        await postAssistant(lines.join("\n"), "revision", {
          before: { total: prior.totalAmount, monthly: prior.monthlyAmount },
          after: { total: data.totalAmount, monthly: data.monthlyAmount },
          sourceCommentId: opts.sourceCommentId,
        });
        emit("done", "보완 완료");
      } else {
        await restoreStatus();
        await postAssistant(decision.message, "comment", null);
        emit("done", "답변 완료");
      }
      ctx.streams.close(channel);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ctx.logger.error("contract comment reply failed", { id, msg });
      await restoreStatus();
      await postAssistant(`⚠️ 댓글 처리 실패: ${msg.slice(0, 300)}`, "comment", null).catch(() => {});
      emit("error", msg);
      ctx.streams.close(channel);
    }
  })();
}

const plugin = definePlugin({
  async setup(ctx) {
    // ---- DATA ----
    ctx.data.register(DATA.listContracts, async (params) => {
      const companyId = asCompanyId(params);
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT id, company_id, contract_type, project_name, gab_company, total_amount, monthly_amount, vat_mode, status, created_at, updated_at,
                contract_date, project_desc, period_start, period_end, jurisdiction, gab_ceo, gab_biz_no, gab_address
         FROM ${T_CONTRACTS} WHERE company_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [companyId],
      );
      return rows.map((r) => rowToRecord(r));
    });

    ctx.data.register(DATA.getContract, async (params) => {
      const companyId = asCompanyId(params);
      const id = String(params.id ?? "");
      const c = await loadContract(ctx, companyId, id);
      if (!c) throw new Error("계약을 찾을 수 없습니다.");
      return c;
    });

    ctx.data.register(DATA.eul, async () => loadEul(ctx));

    ctx.data.register(DATA.listComments, async (params) => {
      const companyId = asCompanyId(params);
      const id = String(params.id ?? "");
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${T_COMMENTS} WHERE company_id=$1 AND contract_id=$2 ORDER BY created_at ASC`,
        [companyId, id],
      );
      return rows.map(commentRow);
    });

    // ---- ACTIONS ----
    ctx.actions.register(ACTION.createContract, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const input = params.input as ContractInput;
      if (!input?.gabCompany?.trim()) throw new Error("갑(고객사)을 입력하세요.");
      if (!input?.projectName?.trim()) throw new Error("프로젝트/서비스명을 입력하세요.");
      const id = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${T_CONTRACTS}
           (id, company_id, project_name, gab_company, gab_ceo, gab_biz_no, gab_address, project_desc,
            period_start, period_end, monthly_amount, total_amount, vat_mode, jurisdiction, contract_date, contract_type, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'draft')`,
        [
          id,
          companyId,
          input.projectName.trim(),
          input.gabCompany.trim(),
          input.gabCeo ?? null,
          input.gabBizNo ?? null,
          input.gabAddress ?? null,
          input.projectDesc ?? "",
          input.periodStart || null,
          input.periodEnd || null,
          input.monthlyAmount ?? null,
          input.totalAmount ?? null,
          input.vatMode ?? "별도",
          input.jurisdiction ?? null,
          input.contractDate || null,
          input.contractType ?? "development",
        ],
      );
      return { id };
    });

    // 폼 수정: 입력 컬럼 갱신 + (data 있으면) 직접 매핑 필드만 반영(AI 과업/요약 보존) + html 재렌더.
    ctx.actions.register(ACTION.updateContract, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const input = params.input as ContractInput;
      if (!input?.gabCompany?.trim()) throw new Error("갑(고객사)을 입력하세요.");
      if (!input?.projectName?.trim()) throw new Error("프로젝트/서비스명을 입력하세요.");
      const contract = await loadContract(ctx, companyId, id);
      if (!contract) throw new Error("계약을 찾을 수 없습니다.");

      await ctx.db.execute(
        `UPDATE ${T_CONTRACTS} SET
           project_name=$3, gab_company=$4, gab_ceo=$5, gab_biz_no=$6, gab_address=$7, project_desc=$8,
           period_start=$9, period_end=$10, monthly_amount=$11, total_amount=$12, vat_mode=$13, jurisdiction=$14, contract_date=$15,
           contract_type=$16,
           updated_at=now()
         WHERE company_id=$1 AND id=$2`,
        [
          companyId,
          id,
          input.projectName.trim(),
          input.gabCompany.trim(),
          input.gabCeo ?? null,
          input.gabBizNo ?? null,
          input.gabAddress ?? null,
          input.projectDesc ?? "",
          input.periodStart || null,
          input.periodEnd || null,
          input.monthlyAmount ?? null,
          input.totalAmount ?? null,
          input.vatMode ?? "별도",
          input.jurisdiction ?? null,
          input.contractDate || null,
          input.contractType ?? contract.contractType ?? "development",
        ],
      );

      if (contract.data) {
        const data: ContractData = {
          ...contract.data,
          gabCompany: input.gabCompany.trim(),
          gabCeo: input.gabCeo ?? "",
          gabBizNo: input.gabBizNo ?? "",
          gabAddress: input.gabAddress ?? "",
          projectName: input.projectName.trim(),
          periodStart: input.periodStart ?? "",
          periodEnd: input.periodEnd ?? "",
          monthlyAmount: input.monthlyAmount ?? 0,
          totalAmount: input.totalAmount ?? 0,
          vatMode: input.vatMode ?? "별도",
          jurisdiction: (input.jurisdiction ?? "").trim() || null,
          contractDate: input.contractDate ?? "",
        };
        const fresh = (await loadContract(ctx, companyId, id)) ?? contract;
        const eul = await loadEul(ctx);
        const html = renderContractHtml(fresh, data, eul);
        await ctx.db.execute(
          `UPDATE ${T_CONTRACTS} SET data=$3::jsonb, html=$4, updated_at=now() WHERE company_id=$1 AND id=$2`,
          [companyId, id, JSON.stringify(data), html],
        );
      }
      return { ok: true, hadData: Boolean(contract.data) };
    });

    ctx.actions.register(ACTION.generate, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const contract = await loadContract(ctx, companyId, id);
      if (!contract) throw new Error("계약을 찾을 수 없습니다.");
      const claimed = await claimGenerating(ctx, companyId, id);
      if (!claimed) return { started: false, reason: "이미 생성이 진행 중입니다." };
      startGenerationJob(ctx, companyId, contract);
      return { started: true };
    });

    ctx.actions.register(ACTION.publish, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const contract = await loadContract(ctx, companyId, id);
      if (!contract) throw new Error("계약을 찾을 수 없습니다.");
      if (!contract.data) throw new Error("생성이 완료되지 않았습니다.");
      const eul = await loadEul(ctx);
      const html = renderContractHtml(contract, contract.data, eul);
      await ctx.db.execute(
        `UPDATE ${T_CONTRACTS} SET html=$3, status='published', updated_at=now() WHERE company_id=$1 AND id=$2`,
        [companyId, id, html],
      );
      return { ok: true };
    });

    ctx.actions.register(ACTION.deleteContract, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      await ctx.db.execute(`DELETE FROM ${T_CONTRACTS} WHERE company_id=$1 AND id=$2`, [companyId, id]);
      return { ok: true };
    });

    // 직인 사용여부 토글 + (data 있으면) html 재렌더. 상태는 바꾸지 않는다.
    ctx.actions.register(ACTION.setSeal, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const useSeal = Boolean(params.useSeal);
      const contract = await loadContract(ctx, companyId, id);
      if (!contract) throw new Error("계약을 찾을 수 없습니다.");
      await ctx.db.execute(
        `UPDATE ${T_CONTRACTS} SET use_seal=$3, updated_at=now() WHERE company_id=$1 AND id=$2`,
        [companyId, id, useSeal],
      );
      if (contract.data) {
        const eul = await loadEul(ctx);
        const html = renderContractHtml({ ...contract, useSeal }, contract.data, eul);
        await ctx.db.execute(
          `UPDATE ${T_CONTRACTS} SET html=$3, updated_at=now() WHERE company_id=$1 AND id=$2`,
          [companyId, id, html],
        );
      }
      return { ok: true, useSeal };
    });

    // 댓글 추가. 생성 데이터가 있으면 댓글을 LLM 에 보내 의도 판단(보완/답변)해 처리.
    ctx.actions.register(ACTION.addComment, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? ""); // contractId
      const body = String(params.body ?? "").trim();
      if (!body) throw new Error("내용을 입력하세요.");

      const contract = await loadContract(ctx, companyId, id);
      if (!contract) throw new Error("계약을 찾을 수 없습니다.");

      const actor = (context as { actor?: { actorType?: string; userId?: string | null; actorId?: string } })
        .actor;
      const authorUserId = actor?.userId ?? actor?.actorId ?? null;

      const cid = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${T_COMMENTS} (id, company_id, contract_id, author_type, author_user_id, body, kind)
         VALUES ($1,$2,$3,'user',$4,$5,'comment')`,
        [cid, companyId, id, authorUserId, body],
      );
      ctx.streams.emit(commentsChannel(id), {
        id: cid,
        quoteId: id,
        authorType: "user",
        authorUserId,
        body,
        kind: "comment",
        metadata: null,
        createdAt: new Date().toISOString(),
      });

      let aiStarted = false;
      if (contract.data) {
        const claimed = await claimGenerating(ctx, companyId, id);
        if (claimed) {
          startReplyJob(ctx, companyId, contract, {
            instruction: body,
            priorStatus: contract.status,
            sourceCommentId: cid,
          });
          aiStarted = true;
        } else {
          const note = "⚠️ AI가 직전 댓글을 처리 중입니다. 완료 후 이 댓글을 다시 남겨 주세요.";
          const sid = randomUUID();
          await ctx.db.execute(
            `INSERT INTO ${T_COMMENTS} (id, company_id, contract_id, author_type, author_user_id, body, kind, metadata)
             VALUES ($1,$2,$3,'system',NULL,$4,'comment',NULL::jsonb)`,
            [sid, companyId, id, note],
          );
          ctx.streams.emit(commentsChannel(id), {
            id: sid,
            quoteId: id,
            authorType: "system",
            authorUserId: null,
            body: note,
            kind: "comment",
            metadata: null,
            createdAt: new Date().toISOString(),
          });
        }
      }

      return { id: cid, aiStarted };
    });

    ctx.actions.register(ACTION.deleteComment, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const contractId = String(params.id ?? "");
      const commentId = String(params.commentId ?? "");
      if (!commentId) throw new Error("commentId 가 필요합니다.");
      if (!contractId) throw new Error("id(계약 ID)가 필요합니다.");
      const contract = await loadContract(ctx, companyId, contractId);
      if (!contract) throw new Error("계약을 찾을 수 없습니다.");
      await ctx.db.execute(
        `DELETE FROM ${T_COMMENTS} WHERE company_id=$1 AND contract_id=$2 AND id=$3`,
        [companyId, contractId, commentId],
      );
      ctx.streams.emit(commentsChannel(contractId), {
        id: commentId,
        quoteId: contractId,
        authorType: "user",
        authorUserId: null,
        body: "",
        kind: "comment",
        metadata: null,
        createdAt: new Date().toISOString(),
        _deleted: true,
      });
      return { ok: true };
    });
  },

  async onHealth() {
    return { status: "ok", message: "contract-issuer worker running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
