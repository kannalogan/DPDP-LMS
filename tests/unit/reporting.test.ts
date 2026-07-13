import { describe, expect, it } from "vitest";
import { mapKpi, mapReport } from "@/features/reporting/mappers";
import { calculateRate, groupMetricsByKey } from "@/features/reporting/validation";
import { createReportSchema } from "@/features/reporting/schemas";
describe("reporting foundation", () => {
  it("maps safe DTOs", () =>
    expect(mapReport({ id: "r1", name: "Progress", status: "active", version: 2 })).toEqual({
      id: "r1",
      name: "Progress",
      description: "",
      status: "active",
      updatedAt: "",
      version: 2
    }));
  it("maps KPI values and trends", () =>
    expect(
      mapKpi({
        kpi_key: "completion_rate",
        kpi_value: "87.5",
        trend: "up",
        as_of_date: "2026-07-13"
      }).value
    ).toBe(87.5));
  it("calculates rates without division errors", () => expect(calculateRate(3, 4)).toBe(75));
  it("groups metrics by key", () =>
    expect(
      Object.keys(
        groupMetricsByKey([
          { key: "a", value: 1, date: "x" },
          { key: "a", value: 2, date: "y" }
        ])
      )
    ).toEqual(["a"]));
  it("rejects invalid report definitions", () =>
    expect(createReportSchema.safeParse({ organizationId: "bad", name: "" }).success).toBe(false));
});
