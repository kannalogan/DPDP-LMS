import { renderToStaticMarkup } from "react-dom/server";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { Button } from "@/shared/ui/button";

describe("shared button", () => {
  it("renders an asChild link without passing sibling nodes to Radix Slot", () => {
    expect(() =>
      renderToStaticMarkup(
        <Button asChild>
          <Link href="/student/courses">View courses</Link>
        </Button>
      )
    ).not.toThrow();
  });

  it("keeps the loading indicator on native buttons", () => {
    const markup = renderToStaticMarkup(<Button loading>Save</Button>);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("ui-spinner");
  });
});
