import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const routes = [
  "app/(student)/student/assistant/page.tsx",
  "app/(student)/student/assistant/chat/page.tsx",
  "app/(student)/student/assistant/history/page.tsx",
  "app/(student)/student/assistant/flashcards/page.tsx",
  "app/(student)/student/assistant/quizzes/page.tsx",
  "app/(student)/student/assistant/plans/page.tsx",
  "app/(student)/student/assistant/recommendations/page.tsx",
  "app/(student)/student/assistant/settings/page.tsx",
  "app/(mentor)/mentor/ai/students/page.tsx",
  "app/(mentor)/mentor/ai/interventions/page.tsx",
  "app/(mentor)/mentor/ai/insights/page.tsx",
  "app/(admin)/admin/ai/learning/page.tsx",
  "app/(admin)/admin/ai/learning/analytics/page.tsx",
  "app/(admin)/admin/ai/learning/prompts/page.tsx",
  "app/(admin)/admin/ai/learning/recommendations/page.tsx",
  "app/api/ai/chat/route.ts",
  "app/api/ai/flashcards/route.ts",
  "app/api/ai/quizzes/route.ts",
  "app/api/ai/plans/route.ts",
  "app/api/ai/recommendations/route.ts"
];
describe("AI learning route and execution coverage", () => {
  it("implements every Prompt 026 route", () => {
    for (const route of routes) expect(existsSync(join(root, route)), route).toBe(true);
    expect(routes).toHaveLength(20);
  });
  it("protects every learning API with request security", () => {
    for (const route of routes.filter((item) => item.startsWith("app/api/")))
      expect(readFileSync(join(root, route), "utf8")).toContain("enforceServerActionSecurity");
  });
  it("routes all feature execution through Prompt 025", () => {
    const server = readFileSync(join(root, "features/ai-learning/server.ts"), "utf8");
    const service = readFileSync(join(root, "features/ai-learning/service.ts"), "utf8");
    expect(server).toContain("executeAiCapability");
    expect(service).not.toMatch(/adapters\/(openai|anthropic|gemini)|fetch\(/);
  });
  it("keeps provider adapters out of client components", () => {
    const client = readFileSync(join(root, "features/ai-learning/components/clients.tsx"), "utf8");
    expect(client).not.toMatch(
      /OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|features\/ai\/adapters/
    );
  });
  it("implements responsive, permission, unavailable, error, loading and empty states", () => {
    const view = readFileSync(join(root, "features/ai-learning/components/route-view.tsx"), "utf8");
    const components = readFileSync(
      join(root, "features/ai-learning/components/index.tsx"),
      "utf8"
    );
    const css = readFileSync(join(root, "features/ai-learning/ai-learning.css"), "utf8");
    expect(view).toContain("AiLearningPermissionDenied");
    expect(view).toContain("AiLearningUnavailable");
    expect(components).toContain("AiLearningLoading");
    expect(components).toContain("AiLearningError");
    expect(components).toContain("AiLearningEmpty");
    expect(css).toContain("@media (max-width: 640px)");
  });
});
