import { CalendarClock, CheckCircle2, Clock3, FileQuestion, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type {
  AssessmentCatalogItem,
  AssessmentDetails,
  AssessmentResultSummary
} from "@/features/assessment-engine/types";
import { Button } from "@/shared/ui/button";
import { Card, MarkdownRenderer } from "@/shared/ui/data-display";
import { Badge, EmptyState } from "@/shared/ui/feedback";

function formatDuration(seconds: number | null) {
  if (!seconds) return "Untimed";
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

export function AssessmentCatalog({ assessments }: { assessments: AssessmentCatalogItem[] }) {
  if (!assessments.length)
    return (
      <EmptyState
        description="Assigned assessments will appear here when they are published and available to your enrollment."
        title="No assessments"
      />
    );
  return (
    <div className="assessment-catalog">
      {assessments.map((item) => (
        <Card className="assessment-card" key={item.assignmentId}>
          <div className="student-card-heading">
            <span className="student-eyebrow">{item.kind}</span>
            <Badge
              tone={
                item.availability === "available"
                  ? "success"
                  : item.availability === "expired"
                    ? "danger"
                    : "warning"
              }
            >
              {item.availability}
            </Badge>
          </div>
          <h2>{item.title}</h2>
          <p>{item.courseTitle}</p>
          <div className="assessment-meta">
            <span>
              <Clock3 />
              {formatDuration(item.durationSeconds)}
            </span>
            <span>
              <FileQuestion />
              {item.questionCount} questions
            </span>
          </div>
          <Button asChild variant={item.availability === "available" ? "primary" : "secondary"}>
            <Link href={`/student/assessments/${item.assessmentId}` as Route}>View assessment</Link>
          </Button>
        </Card>
      ))}
    </div>
  );
}

export function AssessmentDetailsView({
  details,
  startControl
}: {
  details: AssessmentDetails;
  startControl: React.ReactNode;
}) {
  return (
    <div className="assessment-details">
      <header>
        <div>
          <span className="student-eyebrow">{details.kind}</span>
          <h1>{details.title}</h1>
          <p>{details.courseTitle}</p>
        </div>
        <Badge tone={details.availability === "available" ? "success" : "warning"}>
          {details.availability}
        </Badge>
      </header>
      <div className="assessment-details-layout">
        <main>
          <section>
            <h2>Instructions</h2>
            {details.instructionsMarkdown ? (
              <MarkdownRenderer content={details.instructionsMarkdown} />
            ) : (
              <p>Read each question carefully and save your response before submission.</p>
            )}
          </section>
          <section>
            <h2>Rules</h2>
            {details.rules.length ? (
              <ul>
                {details.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            ) : (
              <p>No additional rules are published for this assessment.</p>
            )}
          </section>
          <AttemptHistory attempts={details.attempts} />
        </main>
        <aside>
          <Card className="assessment-summary">
            <h2>Attempt summary</h2>
            <dl>
              <div>
                <dt>Questions</dt>
                <dd>{details.questionCount}</dd>
              </div>
              <div>
                <dt>Time limit</dt>
                <dd>{formatDuration(details.durationSeconds)}</dd>
              </div>
              <div>
                <dt>Passing score</dt>
                <dd>{details.passingScore}%</dd>
              </div>
              <div>
                <dt>Attempt limit</dt>
                <dd>{details.attemptLimit}</dd>
              </div>
            </dl>
            {details.availability === "available" ? (
              startControl
            ) : (
              <div className="assessment-lock-state">
                <Lock />
                <span>
                  {details.availability === "expired"
                    ? "This assessment window has closed."
                    : details.availability === "upcoming"
                      ? "This assessment is not open yet."
                      : "This assessment is locked."}
                </span>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function AttemptHistory({ attempts }: Pick<AssessmentDetails, "attempts">) {
  return (
    <section>
      <h2>Attempt history</h2>
      {attempts.length ? (
        <ol className="assessment-history">
          {attempts.map((attempt) => (
            <li key={attempt.attemptId}>
              <span>Attempt {attempt.attemptNumber}</span>
              <Badge
                tone={
                  attempt.status === "evaluated"
                    ? "success"
                    : attempt.status === "voided"
                      ? "danger"
                      : "neutral"
                }
              >
                {attempt.status}
              </Badge>
              <span>{attempt.score === null ? "Score pending" : `${attempt.score}%`}</span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          description="Your completed and active attempts will be listed here."
          title="No attempts"
        />
      )}
    </section>
  );
}

export function ResultsPending({ result }: { result: AssessmentResultSummary }) {
  return (
    <section className="assessment-result">
      <CalendarClock />
      <span className="student-eyebrow">Attempt {result.attemptNumber}</span>
      <h1>{result.status === "released" ? "Result released" : "Results pending"}</h1>
      <p>
        {result.status === "released"
          ? "Your verified result is ready."
          : "Your submission is locked and awaiting the approved evaluation workflow."}
      </p>
      {result.status === "released" ? (
        <div className="assessment-result-score">
          <CheckCircle2 />
          <strong>{result.score ?? 0}%</strong>
          <span>{result.passed ? "Passed" : "Not passed"}</span>
        </div>
      ) : null}
      <Button asChild variant="secondary">
        <Link href="/student/assessments">
          <RotateCcw />
          Back to assessments
        </Link>
      </Button>
    </section>
  );
}

export {
  AssessmentAttemptView,
  AssessmentSidebar,
  AssessmentTimer,
  AssessmentToolbar,
  QuestionNavigator,
  QuestionProgress,
  ReviewPanel,
  SubmitDialog
} from "@/features/assessment-engine/components/assessment-attempt";
export {
  EssayQuestion,
  FileUploadQuestion,
  MatchingQuestion,
  MCQQuestion,
  MultipleChoiceQuestion,
  OrderingQuestion,
  QuestionRenderer,
  ShortAnswerQuestion,
  TrueFalseQuestion
} from "@/features/assessment-engine/components/question-renderer";
