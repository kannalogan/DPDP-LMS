import {
  ImportWizard,
  QuestionBankHeader,
  QuestionPermissionDenied
} from "@/features/question-authoring/components";
import {
  canAccessQuestionAuthoring,
  getQuestionAuthoringWorkspace
} from "@/features/question-authoring/server";

export default async function QuestionImportPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  const data = await getQuestionAuthoringWorkspace();
  if (!data) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Validate CSV, JSON, and question packages with dry-run reports, duplicate detection and rollback preparation."
        title="Import"
      />
      <ImportWizard jobs={data.importJobs} />
    </>
  );
}
