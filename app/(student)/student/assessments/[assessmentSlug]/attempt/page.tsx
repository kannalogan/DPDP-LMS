import { z } from "zod";
import { notFound } from "next/navigation";
import { AssessmentAttemptView } from "@/features/assessment-engine/components";
import { canAccessAssessments, getCurrentAttempt } from "@/features/assessment-engine/server";
import { StudentPermissionError } from "@/features/student/components";
import { EmptyState } from "@/shared/ui/feedback";

export default async function AssessmentAttemptPage({
  params
}: {
  params: Promise<{ assessmentSlug: string }>;
}) {
  const { assessmentSlug } = await params;
  if (!(await canAccessAssessments())) return <StudentPermissionError />;
  if (!z.string().uuid().safeParse(assessmentSlug).success) notFound();
  const attempt = await getCurrentAttempt(assessmentSlug);
  if (!attempt)
    return (
      <EmptyState
        description="Start or resume an available assessment from its details page."
        title="No active attempt"
      />
    );
  return <AssessmentAttemptView attempt={attempt} />;
}
