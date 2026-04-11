import { z } from "zod";

export const githubConfigSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  baseBranch: z.string().min(1).default("main"),
  webhookSecret: z.string().optional(),
});

export const deployConfigSchema = z.object({
  url: z.string().url().optional(),
  healthEndpoint: z.string().optional(),
});

export const mergeConfigSchema = z.object({
  method: z.enum(["squash", "merge", "rebase"]).default("squash"),
  deleteSourceBranch: z.boolean().default(true),
});

export const environmentConfigSchema = z.object({
  github: githubConfigSchema.optional(),
  deploy: deployConfigSchema.optional(),
  merge: mergeConfigSchema.optional(),
});

export const createProjectEnvironmentSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  isDefault: z.boolean().optional().default(false),
  config: environmentConfigSchema.optional().default({}),
});

export const updateProjectEnvironmentSchema = createProjectEnvironmentSchema.partial();

export type CreateProjectEnvironment = z.infer<typeof createProjectEnvironmentSchema>;
export type UpdateProjectEnvironment = z.infer<typeof updateProjectEnvironmentSchema>;
export type EnvironmentConfig = z.infer<typeof environmentConfigSchema>;
