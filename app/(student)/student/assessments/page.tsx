import { AssessmentCatalog } from "@/features/assessment-engine/components";
import { canAccessAssessments, getAssessmentCatalog } from "@/features/assessment-engine/server";
import { StudentPageHeader, StudentPermissionError } from "@/features/student/components";

export default async function AssessmentsPage() {
  if (!(await canAccessAssessments())) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Open assigned exams, quizzes, and practical assessments securely."
        eyebrow="Assessment center"
        title="Assessments"
      />
      <AssessmentCatalog assessments={await getAssessmentCatalog()} />
    </div>
  );
}
