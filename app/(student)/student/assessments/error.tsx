"use client";

import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/feedback";

export default function AssessmentsError({ reset }: { error: Error; reset(): void }) {
  return (
    <ErrorState
      action={<Button onClick={reset}>Try again</Button>}
      description="The assessment center could not be loaded safely."
      title="Assessments unavailable"
    />
  );
}
