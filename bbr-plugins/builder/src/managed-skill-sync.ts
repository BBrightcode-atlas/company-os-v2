type ManagedSkillResolution = {
  defaultDrift?: {
    changedFiles?: unknown[];
  } | null;
};

type ManagedSkillClient = {
  skills: {
    managed: {
      reconcile(skillKey: string, companyId: string): Promise<ManagedSkillResolution>;
      reset(skillKey: string, companyId: string): Promise<ManagedSkillResolution>;
    };
  };
};

export async function reconcileManagedSkillResettingDrift<TContext extends ManagedSkillClient>(
  ctx: TContext,
  skillKey: string,
  companyId: string,
): Promise<ManagedSkillResolution> {
  const resolved = await ctx.skills.managed.reconcile(skillKey, companyId);
  if ((resolved.defaultDrift?.changedFiles ?? []).length > 0) {
    return ctx.skills.managed.reset(skillKey, companyId);
  }
  return resolved;
}
