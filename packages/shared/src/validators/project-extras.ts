import { z } from "zod";

export const PROJECT_HEALTH_VALUES = ["on_track", "at_risk", "off_track"] as const;
export type ProjectHealth = (typeof PROJECT_HEALTH_VALUES)[number];

export const MILESTONE_STATUSES = ["planned", "completed"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

// --- Project teams (N:M) ---
export const addProjectTeamSchema = z.object({
  teamId: z.string().uuid(),
});
export type AddProjectTeam = z.infer<typeof addProjectTeamSchema>;

// --- Project members ---
export const addProjectMemberSchema = z.object({
  agentId: z.string().uuid().optional(),
  userId: z.string().optional(),
  role: z.enum(["lead", "member"]).optional().default("member"),
});
export type AddProjectMember = z.infer<typeof addProjectMemberSchema>;

// --- Milestones ---
export const createMilestoneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(), // ISO date
  status: z.enum(MILESTONE_STATUSES).optional().default("planned"),
  sortOrder: z.number().int().optional(),
});
export type CreateMilestone = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = createMilestoneSchema.partial();
export type UpdateMilestone = z.infer<typeof updateMilestoneSchema>;

// --- Project updates (health) ---
export const createProjectUpdateSchema = z.object({
  health: z.enum(PROJECT_HEALTH_VALUES),
  body: z.string().min(1),
});
export type CreateProjectUpdate = z.infer<typeof createProjectUpdateSchema>;
