"use client";

import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/feedback";

export default function StudentError({ reset }: { error: Error; reset(): void }) {
  return (
    <ErrorState
      action={<Button onClick={reset}>Try again</Button>}
      description="The student workspace could not be loaded. Your learning records have not been changed."
      title="Workspace unavailable"
    />
  );
}
