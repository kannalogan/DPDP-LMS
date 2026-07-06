"use client";

import { ErrorState } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";

export default function CoursesError({ reset }: { error: Error; reset(): void }) {
  return (
    <ErrorState
      action={<Button onClick={reset}>Try again</Button>}
      description="The learning catalog could not be loaded safely."
      title="Courses unavailable"
    />
  );
}
