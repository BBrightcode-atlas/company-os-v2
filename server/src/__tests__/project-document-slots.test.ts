import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  activityLog,
  agents,
  companies,
  createDb,
  documentRevisions,
  documents,
  projectDocumentSlots,
  projects,
  assets,
} from "@paperclipai/db";
import {
  DEFAULT_PROJECT_DOCUMENT_SLOT_KEYS,
  type ProjectDocumentSlot,
} from "@paperclipai/shared";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { errorHandler } from "../middleware/index.js";
import { projectDocumentSlotRoutes } from "../routes/project-document-slots.js";
import { projectDocumentSlotService } from "../services/project-document-slots.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres project document slot tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("project document slots", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-project-document-slots-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(activityLog);
    await db.delete(projectDocumentSlots);
    await db.delete(documentRevisions);
    await db.delete(documents);
    await db.delete(assets);
    await db.delete(projects);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  function appForActor(actor: Express.Request["actor"]) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.actor = actor;
      next();
    });
    app.use("/api", projectDocumentSlotRoutes(db));
    app.use(errorHandler);
    return app;
  }

  async function createCompanyAndProject() {
    const companyId = randomUUID();
    const projectId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(projects).values({
      id: projectId,
      companyId,
      name: "Mission Progress",
      status: "in_progress",
    });
    return { companyId, projectId };
  }

  const boardActor: Express.Request["actor"] = {
    type: "board",
    userId: "board-user",
    companyIds: [],
    source: "local_implicit",
    isInstanceAdmin: true,
  };

  it("creates the fixed source, support, and deliverable slots for a project", async () => {
    const { companyId, projectId } = await createCompanyAndProject();
    const svc = projectDocumentSlotService(db);

    const slots = await svc.listForProject({ id: projectId, companyId });

    expect(slots.map((slot) => slot.slotKey)).toEqual(DEFAULT_PROJECT_DOCUMENT_SLOT_KEYS);
    expect(slots.find((slot) => slot.slotKey === "deliverable.prd")).toEqual(expect.objectContaining({
      slotGroup: "deliverable",
      required: true,
      status: "empty",
      documentId: null,
    }));
    expect(slots.find((slot) => slot.slotKey === "source.customer_originals")).toEqual(expect.objectContaining({
      slotGroup: "source",
      required: false,
    }));

    const persisted = await db.select().from(projectDocumentSlots).where(eq(projectDocumentSlots.projectId, projectId));
    expect(persisted).toHaveLength(DEFAULT_PROJECT_DOCUMENT_SLOT_KEYS.length);
  });

  it("imports extracted body into a slot and returns latest content", async () => {
    const { companyId, projectId } = await createCompanyAndProject();
    const app = appForActor(boardActor);

    const imported = await request(app)
      .post(`/api/projects/${projectId}/document-slots/deliverable.prd/import`)
      .send({
        title: "PRD(Product Requirements Document)",
        body: "# PRD\n\n본문",
        status: "ready",
        metadata: { sourceUrl: "https://example.com/prd" },
      });

    expect(imported.status, JSON.stringify(imported.body)).toBe(200);
    expect(imported.body).toEqual(expect.objectContaining({
      slotKey: "deliverable.prd",
      status: "ready",
      documentId: expect.any(String),
      contentType: "text/markdown",
    } satisfies Partial<ProjectDocumentSlot>));

    const content = await request(app)
      .get(`/api/projects/${projectId}/document-slots/deliverable.prd/content`);

    expect(content.status, JSON.stringify(content.body)).toBe(200);
    expect(content.body.document).toEqual(expect.objectContaining({
      title: "PRD(Product Requirements Document)",
      format: "markdown",
      body: "# PRD\n\n본문",
      latestRevisionNumber: 1,
    }));
    expect(content.body.artifact).toBeNull();

    const activityRows = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.companyId, companyId));
    expect(activityRows.map((row) => row.action)).toContain("project.document_slot_imported");
  });

  it("rejects document links from another company", async () => {
    const { projectId } = await createCompanyAndProject();
    const otherCompanyId = randomUUID();
    const otherDocumentId = randomUUID();
    await db.insert(companies).values({
      id: otherCompanyId,
      name: "Other",
      issuePrefix: `T${otherCompanyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(documents).values({
      id: otherDocumentId,
      companyId: otherCompanyId,
      title: "Other PRD",
      format: "markdown",
      latestBody: "# Other",
    });

    const res = await request(appForActor(boardActor))
      .put(`/api/projects/${projectId}/document-slots/deliverable.prd`)
      .send({ documentId: otherDocumentId, status: "ready" });

    expect(res.status, JSON.stringify(res.body)).toBe(422);
    expect(res.body.error).toBe("Document belongs to another company");
  });

  it("allows same-company agents to read but not write project document slots", async () => {
    const { companyId, projectId } = await createCompanyAndProject();
    const agentId = randomUUID();
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "Blueprint PM Agent",
      role: "pm",
      status: "active",
    });
    const agentActor: Express.Request["actor"] = {
      type: "agent",
      agentId,
      companyId,
      source: "agent_key",
    };
    const app = appForActor(agentActor);

    const read = await request(app).get(`/api/projects/${projectId}/document-slots`);
    expect(read.status, JSON.stringify(read.body)).toBe(200);

    const write = await request(app)
      .post(`/api/projects/${projectId}/document-slots/deliverable.prd/import`)
      .send({ body: "# Agent PRD" });
    expect(write.status, JSON.stringify(write.body)).toBe(403);
    expect(write.body.error).toBe("Agent project document slot writes require producer plugin ownership");
  });
});
