import { describe, expect, it } from "vitest";
import { pluginManifestV1Schema } from "@paperclipai/shared";
import manifest from "../src/manifest.js";
import { BUILD_WATCHDOG_JOB_KEY } from "../src/build-watchdog.js";
import { BUILDER_MANAGED_AGENT_HEARTBEAT } from "../src/managed-resources.js";

describe("builder manifest", () => {
  it("호스트 매니페스트 스키마를 통과한다 (jobs.schedule/issues.wakeup 포함)", () => {
    const result = pluginManifestV1Schema.safeParse(manifest);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 1));
    }
    expect(result.success).toBe(true);
  });

  it("watchdog job이 선언돼 있고 필요한 capability를 가진다", () => {
    const jobKeys = (manifest.jobs ?? []).map((job) => job.jobKey);
    expect(jobKeys).toContain(BUILD_WATCHDOG_JOB_KEY);
    expect(manifest.capabilities).toContain("jobs.schedule");
    expect(manifest.capabilities).toContain("issues.wakeup");
  });

  it("모든 관리 에이전트가 순차 실행 heartbeat 정책을 선언한다", () => {
    const agents = manifest.agents ?? [];
    expect(agents.length).toBeGreaterThanOrEqual(9);
    for (const agent of agents) {
      const heartbeat = (agent.runtimeConfig as { heartbeat?: Record<string, unknown> } | undefined)?.heartbeat;
      expect(heartbeat, `agent ${agent.agentKey} missing heartbeat runtimeConfig`).toBeDefined();
      expect(heartbeat).toMatchObject({ ...BUILDER_MANAGED_AGENT_HEARTBEAT });
    }
  });
});
