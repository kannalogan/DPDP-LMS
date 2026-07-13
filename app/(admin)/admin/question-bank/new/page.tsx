import {
  AssetPicker,
  CaseStudyEditor,
  CategoryManager,
  ChoiceEditor,
  CodingQuestionEditor,
  EssayEditor,
  MatchingEditor,
  MediaManager,
  OrderingEditor,
  QuestionBankHeader,
  QuestionPermissionDenied,
  ScenarioEditor,
  TagManager
} from "@/features/question-authoring/components";
import { canAccessQuestionAuthoring } from "@/features/question-authoring/server";

export default async function NewQuestionPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Create a question draft with supported types, metadata, media, assets and outcome mapping."
        title="New question"
      />
      <div className="question-authoring-grid">
        <ChoiceEditor />
        <MatchingEditor />
        <OrderingEditor />
        <EssayEditor />
        <ScenarioEditor />
        <CodingQuestionEditor />
        <CaseStudyEditor />
        <MediaManager />
        <AssetPicker />
        <CategoryManager />
        <TagManager />
      </div>
    </>
  );
}
