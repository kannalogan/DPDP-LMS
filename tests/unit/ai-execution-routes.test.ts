import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readAiJsonRequest } from "@/features/ai/execution/http";

const root = process.cwd();
const routes = [
  "app/api/ai/execute/route.ts",
  "app/api/admin/ai/providers/test/route.ts",
  "app/api/admin/ai/health/route.ts"
];

describe("AI execution route coverage", () => {
  it("implements only authenticated controlled execution routes", () => {
    for (const route of routes) {
      expect(existsSync(join(root, route)), route).toBe(true);
      const source = readFileSync(join(root, route), "utf8");
      expect(source).toContain("enforceServerActionSecurity");
      expect(source).toContain('runtime = "nodejs"');
      expect(source).toContain('"Cache-Control": "no-store"');
    }
  });

  it("limits payloads, returns trace identifiers, and maps safe errors", () => {
    const helper = readFileSync(join(root, "features/ai/execution/http.ts"), "utf8");
    expect(helper).toContain("AI_REQUEST_MAX_BYTES = 131072");
    expect(helper).toContain("safeAiErrorResponse");
    expect(helper).not.toContain("error.stack");
  });

  it("enforces the byte limit when content length is omitted", async () => {
    await expect(
      readAiJsonRequest(
        new Request("http://localhost/api/ai/execute", {
          body: JSON.stringify({ value: "x".repeat(131072) }),
          method: "POST"
        })
      )
    ).rejects.toMatchObject({ status: 413 });
  });

  it("keeps provider health and execution controls in the frozen admin workspace", () => {
    const view = readFileSync(join(root, "features/ai/components/route-view.tsx"), "utf8");
    const components = readFileSync(join(root, "features/ai/components/execution.tsx"), "utf8");
    expect(view).toContain("ProviderExecutionStatus");
    expect(view).toContain("ModelRoutingManager");
    expect(components).toContain("KillSwitchManager");
    expect(components).toContain("CostRateManager");
    expect(components).toContain("AI output may be incorrect");
    expect(components).not.toMatch(/api key|secret key/i);
  });
});
