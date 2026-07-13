import {
  Boxes,
  Braces,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileQuestion,
  FileText,
  GitCompare,
  GripVertical,
  Layers3,
  ListChecks,
  Search,
  Tags,
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import {
  formatQuestionDate,
  questionStateTone,
  questionWorkflowSteps
} from "@/features/question-authoring/selectors";
import type {
  AssessmentTemplateItem,
  QuestionAuthoringItem,
  QuestionAuthoringWorkspace,
  QuestionImportJob
} from "@/features/question-authoring/types";
import { getQuestionPublishReadiness } from "@/features/question-authoring/publishing";
import { Button } from "@/shared/ui/button";
import { Card, MarkdownRenderer, Table, Timeline } from "@/shared/ui/data-display";
import { SearchInput } from "@/shared/ui/forms";
import { Badge, EmptyState, ErrorState, LoadingState, Progress } from "@/shared/ui/feedback";

export function QuestionBankHeader({ description, title }: { description: string; title: string }) {
  return (
    <header className="question-authoring-header">
      <div>
        <span className="student-eyebrow">Question bank</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href={"/admin/question-bank/new" as Route}>
          <FileQuestion />
          New question
        </Link>
      </Button>
    </header>
  );
}

export function QuestionPermissionDenied() {
  return (
    <ErrorState
      description="Your active organization does not grant question authoring access."
      title="Question authoring access required"
    />
  );
}

export function QuestionDashboard({ data }: { data: QuestionAuthoringWorkspace }) {
  return (
    <div className="question-authoring-shell">
      <QuestionMetrics data={data} />
      <div className="question-authoring-grid">
        <QuestionTable questions={data.questions.slice(0, 8)} />
        <AssessmentTemplateBuilder templates={data.templates.slice(0, 6)} />
        <ImportWizard jobs={data.importJobs.slice(0, 6)} />
        <PublishingQueue questions={data.questions.slice(0, 6)} />
      </div>
    </div>
  );
}

export function QuestionMetrics({ data }: { data: QuestionAuthoringWorkspace }) {
  const stats = [
    ["Drafts", data.metrics.draft, <FileQuestion key="draft" />],
    ["In review", data.metrics.review, <ClipboardList key="review" />],
    ["Approved", data.metrics.approved, <CheckCircle2 key="approved" />],
    ["Published", data.metrics.published, <Layers3 key="published" />]
  ] as const;
  return (
    <section className="question-authoring-grid">
      {stats.map(([label, value, icon]) => (
        <Card className="question-authoring-card question-authoring-stat" key={label}>
          <div className="student-card-heading">
            <span className="student-eyebrow">{label}</span>
            {icon}
          </div>
          <strong>{value}</strong>
        </Card>
      ))}
    </section>
  );
}

export function QuestionTable({ questions }: { questions: QuestionAuthoringItem[] }) {
  return (
    <Card className="question-authoring-panel">
      <div className="student-card-heading">
        <h2>Reusable questions</h2>
        <Search aria-hidden="true" />
      </div>
      <QuestionFilters />
      <Table
        caption="Question drafts"
        columns={[
          { header: "Bank", key: "bank", render: (row) => row.bankName },
          { header: "Type", key: "type", render: (row) => row.type },
          {
            header: "State",
            key: "state",
            render: (row) => (
              <Badge tone={questionStateTone(row.workflowState)}>{row.workflowState}</Badge>
            )
          },
          { header: "Bloom", key: "bloom", render: (row) => row.bloomLevel },
          {
            header: "Open",
            key: "open",
            render: (row) => (
              <Button asChild size="sm" variant="ghost">
                <Link href={`/admin/question-bank/${row.questionDraftId}` as Route}>Open</Link>
              </Button>
            )
          }
        ]}
        emptyMessage="No question drafts available"
        rows={questions}
      />
    </Card>
  );
}

export function QuestionEditor({ question }: { question: QuestionAuthoringItem | null }) {
  if (!question)
    return (
      <EmptyState
        description="Select a question draft or create one from an approved question bank."
        title="No question selected"
      />
    );
  const readiness = getQuestionPublishReadiness(question);
  return (
    <div className="question-editor">
      <Card className="question-authoring-panel">
        <div className="student-card-heading">
          <div>
            <span className="student-eyebrow">{question.bankName}</span>
            <h2>{question.type}</h2>
          </div>
          <Badge tone={questionStateTone(question.workflowState)}>{question.workflowState}</Badge>
        </div>
        <QuestionPreview question={question} />
        <ChoiceEditor />
        <AutosaveIndicator />
      </Card>
      <aside className="question-authoring-aside">
        <EditorLockBanner />
        <WorkflowTimeline question={question} />
        <Card className="question-authoring-panel">
          <h2>Publish readiness</h2>
          <Progress label="Validation readiness" value={readiness.ready ? 100 : 50} />
          <div className="question-authoring-list">
            {readiness.rules.map((rule) => (
              <div className="question-authoring-list-item" key={rule.title}>
                <Badge tone={rule.ok ? "success" : "warning"}>
                  {rule.ok ? "ready" : "needs work"}
                </Badge>
                <span>{rule.title}</span>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

export function QuestionPreview({ question }: { question: QuestionAuthoringItem }) {
  return (
    <Card className="question-authoring-panel">
      <h2>Question preview</h2>
      <dl className="question-metadata">
        <div>
          <dt>Difficulty</dt>
          <dd>{question.difficulty}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{question.estimatedSeconds}s</dd>
        </div>
        <div>
          <dt>Outcomes</dt>
          <dd>{question.outcomeCount}</dd>
        </div>
      </dl>
      <MarkdownRenderer content={`Type: ${question.type}\n\nState: ${question.workflowState}`} />
    </Card>
  );
}

export function ChoiceEditor() {
  return (
    <Card className="question-authoring-panel">
      <h2>Choice editor</h2>
      <div className="question-sort-list">
        <div>
          <GripVertical aria-hidden="true" />
          <span>Choices and answer options are saved through `save_question`.</span>
        </div>
      </div>
    </Card>
  );
}

export function MatchingEditor() {
  return <QuestionTypePanel icon={<Boxes />} title="Matching editor" />;
}

export function OrderingEditor() {
  return <QuestionTypePanel icon={<ListChecks />} title="Ordering editor" />;
}

export function EssayEditor() {
  return <QuestionTypePanel icon={<FileText />} title="Essay editor" />;
}

export function ScenarioEditor() {
  return <QuestionTypePanel icon={<Layers3 />} title="Scenario editor" />;
}

export function CodingQuestionEditor() {
  return <QuestionTypePanel icon={<Code2 />} title="Coding question editor" />;
}

export function CaseStudyEditor() {
  return <QuestionTypePanel icon={<Braces />} title="Case study editor" />;
}

function QuestionTypePanel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Card className="question-authoring-panel">
      <div className="student-card-heading">
        <h2>{title}</h2>
        {icon}
      </div>
      <p>Specialized authoring metadata is persisted in the question draft payload.</p>
    </Card>
  );
}

export function AssessmentBuilder({ templates }: { templates: AssessmentTemplateItem[] }) {
  return (
    <div className="question-authoring-grid">
      <AssessmentTemplateBuilder templates={templates} />
      <SectionBuilder />
    </div>
  );
}

export function AssessmentTemplateBuilder({ templates }: { templates: AssessmentTemplateItem[] }) {
  if (!templates.length)
    return (
      <EmptyState
        description="Assessment templates and builder sections will appear after authors create them."
        title="Assessment templates"
      />
    );
  return (
    <Card className="question-authoring-panel">
      <h2>Assessment templates</h2>
      <div className="question-authoring-list">
        {templates.map((template) => (
          <article className="question-authoring-list-item" key={template.assessmentTemplateId}>
            <ClipboardList aria-hidden="true" />
            <div>
              <strong>{template.title}</strong>
              <p>
                {template.sectionCount} sections / {template.questionCount} questions
              </p>
            </div>
            <Badge tone={questionStateTone(template.workflowState)}>{template.workflowState}</Badge>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function SectionBuilder() {
  return (
    <Card className="question-authoring-panel">
      <h2>Section builder</h2>
      <div className="question-sort-list">
        <div>
          <GripVertical aria-hidden="true" />
          <span>Section ordering and pools use `assessment_section_questions`.</span>
        </div>
      </div>
    </Card>
  );
}

export function CollectionManager() {
  return (
    <Card className="question-authoring-panel">
      <h2>Collection manager</h2>
      <p>Reusable question collections group question drafts for templates and review.</p>
    </Card>
  );
}

export function CategoryManager() {
  return (
    <Card className="question-authoring-panel">
      <h2>Category manager</h2>
      <p>Question categories organize reusable bank content inside the organization.</p>
    </Card>
  );
}

export function TagManager() {
  return (
    <Card className="question-authoring-panel">
      <div className="student-card-heading">
        <h2>Tag manager</h2>
        <Tags aria-hidden="true" />
      </div>
      <p>Question tags support filters, collections, and outcome alignment.</p>
    </Card>
  );
}

export function ImportWizard({ jobs }: { jobs: QuestionImportJob[] }) {
  if (!jobs.length)
    return (
      <EmptyState
        description="CSV, JSON, and question package imports will appear after dry-run validation."
        title="Import wizard"
      />
    );
  return (
    <Card className="question-authoring-panel">
      <div className="student-card-heading">
        <h2>Import wizard</h2>
        <UploadCloud aria-hidden="true" />
      </div>
      <div className="question-authoring-list">
        {jobs.map((job) => (
          <article className="question-authoring-list-item" key={job.importJobId}>
            <strong>{job.sourceType}</strong>
            <span>{formatQuestionDate(job.createdAt)}</span>
            <Badge tone={questionStateTone(job.status)}>{job.status}</Badge>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function QuestionTree() {
  return (
    <Card className="question-authoring-panel">
      <h2>Question tree</h2>
      <p>Bank, category, tag, collection and template relationships are shown from projections.</p>
    </Card>
  );
}

export function VersionHistory({ question }: { question?: QuestionAuthoringItem | null }) {
  return (
    <Card className="question-authoring-panel">
      <div className="student-card-heading">
        <h2>Version history</h2>
        <GitCompare aria-hidden="true" />
      </div>
      <p>
        {question?.updatedAt
          ? `Last draft update ${formatQuestionDate(question.updatedAt)}`
          : "Question version history appears after publication."}
      </p>
    </Card>
  );
}

export function WorkflowTimeline({ question }: { question?: QuestionAuthoringItem | null }) {
  const active = question?.workflowState ?? "draft";
  return (
    <Card className="question-authoring-panel">
      <h2>Workflow timeline</h2>
      <Timeline
        items={questionWorkflowSteps().map((step) => ({
          content: <Badge tone={step === active ? "info" : "neutral"}>{step}</Badge>,
          title: step
        }))}
      />
    </Card>
  );
}

export function PublishingQueue({ questions }: { questions: QuestionAuthoringItem[] }) {
  const items = questions.filter((question) =>
    ["approved", "scheduled"].includes(question.workflowState)
  );
  if (!items.length)
    return (
      <EmptyState
        description="Approved and scheduled question drafts will appear here."
        title="Publishing queue"
      />
    );
  return (
    <Card className="question-authoring-panel">
      <h2>Publishing queue</h2>
      <div className="question-authoring-list">
        {items.map((question) => (
          <article className="question-authoring-list-item" key={question.questionDraftId}>
            <FileQuestion aria-hidden="true" />
            <div>
              <strong>{question.type}</strong>
              <p>{question.bankName}</p>
            </div>
            <Badge tone={questionStateTone(question.workflowState)}>{question.workflowState}</Badge>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function ReviewPanel({ questions }: { questions: QuestionAuthoringItem[] }) {
  const reviews = questions.filter((question) => question.workflowState === "review");
  if (!reviews.length)
    return (
      <EmptyState description="Submitted question drafts will appear here." title="Review panel" />
    );
  return <QuestionTable questions={reviews} />;
}

export function ApprovalPanel({ questions }: { questions: QuestionAuthoringItem[] }) {
  return (
    <Card className="question-authoring-panel">
      <h2>Approval panel</h2>
      <p>
        {questions.filter((question) => question.workflowState === "review").length} questions await
        review.
      </p>
    </Card>
  );
}

export function MediaManager() {
  return (
    <Card className="question-authoring-panel">
      <h2>Media manager</h2>
      <p>Images, audio, video, documents and code fixtures attach to question drafts.</p>
    </Card>
  );
}

export function AssetPicker() {
  return (
    <Card className="question-authoring-panel">
      <h2>Asset picker</h2>
      <p>Question assets support starter code, test cases, rubrics and lab references.</p>
    </Card>
  );
}

export function QuestionFilters() {
  return (
    <div className="question-authoring-controls">
      <SearchInput aria-label="Search question bank" placeholder="Search questions" />
      <Button size="sm" variant="secondary">
        Filters
      </Button>
    </div>
  );
}

export function QuestionPagination() {
  return (
    <nav aria-label="Question bank pagination" className="question-authoring-actions">
      <Button size="sm" variant="secondary">
        Previous
      </Button>
      <Button size="sm" variant="secondary">
        Next
      </Button>
    </nav>
  );
}

export function AutosaveIndicator() {
  return (
    <div className="question-autosave">
      <CheckCircle2 aria-hidden="true" />
      <span>Autosave uses `save_question` and immutable question change logs.</span>
    </div>
  );
}

export function ConflictResolution() {
  return (
    <Card className="question-authoring-panel">
      <h2>Conflict resolution</h2>
      <p>Draft ownership, reviewer assignment and immutable logs resolve authoring conflicts.</p>
    </Card>
  );
}

export function EditorLockBanner() {
  return (
    <Card className="question-lock">
      <FileQuestion aria-hidden="true" />
      <span>Question draft writes are controlled by RPCs and organization-scoped permissions.</span>
    </Card>
  );
}

export function QuestionLoading() {
  return <LoadingState label="Loading question bank" />;
}

export function QuestionError() {
  return (
    <ErrorState
      description="The question authoring workspace could not be loaded from the current organization."
      title="Question bank unavailable"
    />
  );
}

export function QuestionEmpty() {
  return (
    <EmptyState
      description="Question drafts, templates, imports and publishing jobs appear after authors begin creating content."
      title="No question bank content"
    />
  );
}
