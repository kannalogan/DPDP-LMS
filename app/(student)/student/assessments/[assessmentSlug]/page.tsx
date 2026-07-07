import { notFound } from "next/navigation";
import { z } from "zod";
import { AssessmentDetailsView } from "@/features/assessment-engine/components";
import { AssessmentStartControl } from "@/features/assessment-engine/components/assessment-start";
import { canAccessAssessments, getAssessmentDetails } from "@/features/assessment-engine/server";
import { StudentPermissionError } from "@/features/student/components";

export default async function AssessmentDetailsPage({
  params
}: {
  params: Promise<{ assessmentSlug: string }>;
}) {
  const { assessmentSlug } = await params;
  if (!(await canAccessAssessments())) return <StudentPermissionError />;
  if (!z.string().uuid().safeParse(assessmentSlug).success) notFound();
  const details = await getAssessmentDetails(assessmentSlug);
  if (!details) notFound();
  return (
    <div className="student-workspace">
      <AssessmentDetailsView
        details={details}
        startControl={
          <AssessmentStartControl
            assessmentId={details.assessmentId}
            assignmentId={details.assignmentId}
            currentAttemptId={details.currentAttemptId}
          />
        }
      />
    </div>
  );
}
