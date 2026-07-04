import { describe, expect, it } from "vitest";
import { motion, radii, spacing, typography } from "@/shared/tokens";
import { cn } from "@/lib/utils/cn";

describe("design system contracts", () => {
  it("uses the frozen 8px spacing scale", () => {
    expect(spacing).toMatchObject({ 1: "8px", 2: "16px", 3: "24px", 4: "32px" });
  });

  it("keeps compact enterprise radii and reduced motion-capable timings", () => {
    expect(radii.md).toBe("8px");
    expect(motion.fast).toBeLessThan(motion.normal);
    expect(motion.normal).toBeLessThan(motion.slow);
  });

  it("publishes the complete semantic typography scale", () => {
    expect(Object.keys(typography)).toEqual([
      "display",
      "title",
      "heading",
      "body",
      "label",
      "caption"
    ]);
  });

  it("merges utility classes without conflicting Tailwind output", () => {
    expect(cn("px-2", "px-4", false && "hidden")).toBe("px-4");
  });
});
