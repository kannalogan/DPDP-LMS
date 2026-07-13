import {
  AssessmentBuilder,
  QuestionBankHeader,
  QuestionPermissionDenied
} from "@/features/question-authoring/components";
import {
  canAccessQuestionAuthoring,
  getQuestionAuthoringWorkspace
} from "@/features/question-authoring/server";

export default async function QuestionTemplatesPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  const data = await getQuestionAuthoringWorkspace();
  if (!data) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Build assessment templates, sections, randomization rules, pools and question ordering."
        title="Assessment templates"
      />
      <AssessmentBuilder templates={data.templates} />
    </>
  );
}
