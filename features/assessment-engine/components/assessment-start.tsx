"use client";

import { LoaderCircle, Play, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState, useTransition } from "react";
import { resumeAssessment, startAssessment } from "@/features/assessment-engine/actions";
import { Button } from "@/shared/ui/button";

export function AssessmentStartControl({
  assessmentId,
  assignmentId,
  currentAttemptId
}: {
  assessmentId: string;
  assignmentId: string;
  currentAttemptId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="assessment-start-control">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const form = new FormData();
            form.set("assessmentId", assessmentId);
            if (currentAttemptId) form.set("attemptId", currentAttemptId);
            else {
              form.set("assignmentId", assignmentId);
              form.set("idempotencyKey", crypto.randomUUID());
            }
            const result = await (currentAttemptId
              ? resumeAssessment(form)
              : startAssessment(form));
            if (result.success)
              router.push(`/student/assessments/${assessmentId}/attempt` as Route);
            else setError(result.error ?? "Unable to continue.");
          })
        }
      >
        {pending ? (
          <LoaderCircle className="ui-spin" />
        ) : currentAttemptId ? (
          <RotateCcw />
        ) : (
          <Play />
        )}
        {currentAttemptId ? "Resume attempt" : "Start assessment"}
      </Button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
