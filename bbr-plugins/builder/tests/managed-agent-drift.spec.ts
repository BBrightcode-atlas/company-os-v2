import { describe, expect, it, vi } from "vitest";
import {
  BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
  BUILDER_MANAGED_AGENT_HEARTBEAT,
  builderManagedAgentHeartbeatDrift,
  builderManagedAgentRuntimeConfig,
  reconcileBuilderAgentApplyingDrift,
} from "../src/managed-resources.js";

function makeCtx(agent: unknown) {
  const reconcile = vi.fn(async () => ({ agent }));
  const reset = vi.fn(async () => ({ agent: { ...(agent as object), runtimeConfig: builderManagedAgentRuntimeConfig() } }));
  return { ctx: { agents: { managed: { reconcile, reset } } }, reconcile, reset };
}

const COMPLIANT_AGENT = {
  adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
  runtimeConfig: builderManagedAgentRuntimeConfig(),
};

describe("managed agent drift", () => {
  it("선언과 동일한 heartbeat면 drift 아님", () => {
    expect(builderManagedAgentHeartbeatDrift(COMPLIANT_AGENT)).toBe(false);
  });

  it("heartbeat 미설정(레거시 에이전트)이면 drift", () => {
    expect(builderManagedAgentHeartbeatDrift({ runtimeConfig: {} })).toBe(true);
    expect(builderManagedAgentHeartbeatDrift({})).toBe(true);
  });

  it("maxConcurrentRuns가 다르면 drift", () => {
    expect(builderManagedAgentHeartbeatDrift({
      runtimeConfig: { heartbeat: { ...BUILDER_MANAGED_AGENT_HEARTBEAT, maxConcurrentRuns: 20 } },
    })).toBe(true);
  });

  it("drift 없는 에이전트는 reset하지 않는다", async () => {
    const { ctx, reset } = makeCtx(COMPLIANT_AGENT);
    await reconcileBuilderAgentApplyingDrift(ctx, "builder", "company-1");
    expect(reset).not.toHaveBeenCalled();
  });

  it("heartbeat drift 에이전트는 reset해서 선언을 재적용한다", async () => {
    const { ctx, reset } = makeCtx({
      adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
      runtimeConfig: {},
    });
    await reconcileBuilderAgentApplyingDrift(ctx, "builder", "company-1");
    expect(reset).toHaveBeenCalledWith("builder", "company-1");
  });

  it("어댑터 drift도 기존처럼 reset한다", async () => {
    const { ctx, reset } = makeCtx({
      adapterType: "some-other-adapter",
      runtimeConfig: builderManagedAgentRuntimeConfig(),
    });
    await reconcileBuilderAgentApplyingDrift(ctx, "builder", "company-1");
    expect(reset).toHaveBeenCalled();
  });

  it("에이전트가 아직 없으면(신규 생성) reset 없이 통과", async () => {
    const { ctx, reset } = makeCtx(null);
    await reconcileBuilderAgentApplyingDrift(ctx, "builder", "company-1");
    expect(reset).not.toHaveBeenCalled();
  });
});
