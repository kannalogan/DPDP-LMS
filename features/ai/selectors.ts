import type { AiWorkspaceDto } from "@/features/ai/dtos";
export const selectActiveAiProviders = (workspace: AiWorkspaceDto) =>
  workspace.providers.filter((provider) => provider.status === "configured");
export const selectAiUsageTotals = (workspace: AiWorkspaceDto) =>
  workspace.usage.reduce(
    (totals, row) => ({
      costMinor: totals.costMinor + row.costMinor,
      events: totals.events + row.eventCount,
      units: totals.units + row.inputUnits + row.outputUnits
    }),
    { costMinor: 0, events: 0, units: 0 }
  );
