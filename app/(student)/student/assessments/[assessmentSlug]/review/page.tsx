import { notFound } from "next/navigation";
import { z } from "zod";
import { ResultsPending, ReviewPanel } from "@/features/assessment-engine/components";
import {
  canAccessAssessments,
  getAssessmentDetails,
  getAssessmentQuestions,
  getAssessmentResultSummary
} from "@/features/assessment-engine/server";
import { StudentPermissionError } from "@/features/student/components";
import { EmptyState } from "@/shared/ui/feedback";

export default async function AssessmentReviewPage({
  params
}: {
  params: Promise<{ assessmentSlug: string }>;
}) {
  const { assessmentSlug } = await params;
  if (!(await canAccessAssessments())) return <StudentPermissionError />;
  if (!z.string().uuid().safeParse(assessmentSlug).success) notFound();
  const details = await getAssessmentDetails(assessmentSlug);
  if (!details) notFound();
  const latest = details.attempts.find((attempt) =>
    ["submitted", "evaluating", "evaluated"].includes(attempt.status)
  );
  if (!latest)
    return (
      <EmptyState
        description="Submit an assessment attempt before opening review."
        title="No submitted attempt"
      />
    );
  const [questions, result] = await Promise.all([
    getAssessmentQuestions(latest.attemptId),
    getAssessmentResultSummary(latest.attemptId)
  ]);
  if (!result) notFound();
  return (
    <div className="student-workspace assessment-review-layout">
      <ResultsPending result={result} />
      <ReviewPanel questions={questions} />
    </div>
  );
}
