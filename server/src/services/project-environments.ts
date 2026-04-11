import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { projectEnvironments } from "@paperclipai/db";
import { notFound, conflict } from "../errors.js";

export function projectEnvironmentService(db: Db) {
  function isSlugConflict(error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    const constraint =
      typeof error === "object" && error !== null && "constraint" in error
        ? (error as { constraint?: string }).constraint
        : typeof error === "object" && error !== null && "constraint_name" in error
          ? (error as { constraint_name?: string }).constraint_name
          : undefined;
    return code === "23505" && constraint != null && constraint.includes("project_environments");
  }

  return {
    list: async (companyId: string, projectId: string) => {
      return db
        .select()
        .from(projectEnvironments)
        .where(
          and(
            eq(projectEnvironments.companyId, companyId),
            eq(projectEnvironments.projectId, projectId),
          ),
        )
        .orderBy(projectEnvironments.createdAt);
    },

    getById: async (companyId: string, envId: string) => {
      const row = await db
        .select()
        .from(projectEnvironments)
        .where(
          and(
            eq(projectEnvironments.companyId, companyId),
            eq(projectEnvironments.id, envId),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (!row) throw notFound("Project environment not found");
      return row;
    },

    findByWebhookRepo: async (owner: string, repo: string) => {
      const all = await db.select().from(projectEnvironments);
      return all.filter((env) => {
        const gh = env.config?.github;
        return gh?.owner === owner && gh?.repo === repo;
      });
    },

    create: async (
      companyId: string,
      projectId: string,
      data: Omit<typeof projectEnvironments.$inferInsert, "id" | "companyId" | "projectId" | "createdAt" | "updatedAt">,
    ) => {
      return db.transaction(async (tx) => {
        if (data.isDefault) {
          await tx
            .update(projectEnvironments)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(
              and(
                eq(projectEnvironments.companyId, companyId),
                eq(projectEnvironments.projectId, projectId),
                eq(projectEnvironments.isDefault, true),
              ),
            );
        }
        try {
          const rows = await tx
            .insert(projectEnvironments)
            .values({ ...data, companyId, projectId })
            .returning();
          return rows[0];
        } catch (error) {
          if (isSlugConflict(error)) {
            throw conflict(`Environment slug "${data.slug}" is already taken in this project`);
          }
          throw error;
        }
      });
    },

    update: async (
      companyId: string,
      envId: string,
      data: Partial<Omit<typeof projectEnvironments.$inferInsert, "id" | "companyId" | "projectId" | "createdAt" | "updatedAt">>,
    ) => {
      return db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(projectEnvironments)
          .where(
            and(
              eq(projectEnvironments.companyId, companyId),
              eq(projectEnvironments.id, envId),
            ),
          )
          .then((rows) => rows[0] ?? null);
        if (!existing) throw notFound("Project environment not found");

        if (data.isDefault) {
          await tx
            .update(projectEnvironments)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(
              and(
                eq(projectEnvironments.companyId, companyId),
                eq(projectEnvironments.projectId, existing.projectId),
                eq(projectEnvironments.isDefault, true),
              ),
            );
        }

        try {
          const rows = await tx
            .update(projectEnvironments)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(projectEnvironments.id, envId))
            .returning();
          return rows[0] ?? null;
        } catch (error) {
          if (isSlugConflict(error)) {
            throw conflict(`Environment slug "${data.slug}" is already taken in this project`);
          }
          throw error;
        }
      });
    },

    remove: async (companyId: string, envId: string) => {
      const rows = await db
        .delete(projectEnvironments)
        .where(
          and(
            eq(projectEnvironments.companyId, companyId),
            eq(projectEnvironments.id, envId),
          ),
        )
        .returning();
      if (!rows[0]) throw notFound("Project environment not found");
      return rows[0];
    },
  };
}
