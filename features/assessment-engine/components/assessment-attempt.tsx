"use client";

import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Send,
  X
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  abandonAssessment,
  clearAnswer,
  markForReview,
  saveAnswer,
  submitAssessment,
  unmarkForReview
} from "@/features/assessment-engine/actions";
import { QuestionRenderer } from "@/features/assessment-engine/components/question-renderer";
import type {
  AssessmentQuestion,
  CurrentAssessmentAttempt
} from "@/features/assessment-engine/types";
import { formatRemainingTime } from "@/features/assessment-engine/selectors";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/overlays";
import { Progress } from "@/shared/ui/feedback";

export function AssessmentTimer({ expiresAt }: { expiresAt: string | null }) {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : null
  );
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  if (remaining === null)
    return (
      <span className="assessment-timer">
        <Clock3 />
        Untimed
      </span>
    );
  const seconds = Math.floor(remaining / 1000);
  const value = formatRemainingTime(remaining);
  return (
    <span
      aria-live={seconds <= 60 ? "polite" : "off"}
      className={seconds <= 300 ? "assessment-timer is-urgent" : "assessment-timer"}
      role="timer"
    >
      <Clock3 />
      {value}
    </span>
  );
}

export function QuestionProgress({ answered, total }: { answered: number; total: number }) {
  return (
    <Progress
      label={`${answered} of ${total} answered`}
      value={total ? Math.round((answered / total) * 100) : 0}
    />
  );
}

export function QuestionNavigator({
  current,
  onSelect,
  questions
}: {
  current: number;
  onSelect(index: number): void;
  questions: AssessmentQuestion[];
}) {
  return (
    <nav aria-label="Question navigator" className="assessment-palette">
      {questions.map((question, index) => {
        const answered = Object.keys(question.response).some((key) => key !== "markedForReview");
        const marked = question.response.markedForReview === true;
        return (
          <button
            aria-current={index === current ? "step" : undefined}
            aria-label={`Question ${index + 1}${answered ? ", answered" : ""}${marked ? ", marked for review" : ""}`}
            className={`${answered ? "is-answered" : ""} ${marked ? "is-marked" : ""}`}
            key={question.attemptItemId}
            onClick={() => onSelect(index)}
            type="button"
          >
            {index + 1}
          </button>
        );
      })}
    </nav>
  );
}

export function AssessmentToolbar({
  expiresAt,
  title
}: {
  expiresAt: string | null;
  title: string;
}) {
  return (
    <header className="assessment-toolbar">
      <div>
        <span className="student-eyebrow">Active assessment</span>
        <strong>{title}</strong>
      </div>
      <AssessmentTimer expiresAt={expiresAt} />
    </header>
  );
}

export function AssessmentSidebar({
  current,
  onSelect,
  questions
}: {
  current: number;
  onSelect(index: number): void;
  questions: AssessmentQuestion[];
}) {
  const answered = questions.filter((question) =>
    Object.keys(question.response).some((key) => key !== "markedForReview")
  ).length;
  return (
    <aside className="assessment-sidebar">
      <QuestionProgress answered={answered} total={questions.length} />
      <QuestionNavigator current={current} onSelect={onSelect} questions={questions} />
      <div className="assessment-legend">
        <span>
          <i className="is-answered" />
          Answered
        </span>
        <span>
          <i className="is-marked" />
          Review
        </span>
      </div>
    </aside>
  );
}

function AutosaveQuestion({
  assessmentId,
  attemptId,
  onLocalResponse,
  question
}: {
  assessmentId: string;
  attemptId: string;
  onLocalResponse(value: Record<string, unknown>): void;
  question: AssessmentQuestion;
}) {
  const [draft, setDraft] = useState(question.response);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(
      () =>
        startTransition(async () => {
          const form = new FormData();
          form.set("assessmentId", assessmentId);
          form.set("attemptId", attemptId);
          form.set("attemptItemId", question.attemptItemId);
          form.set("clientVersion", String(Math.floor(Date.now() / 1000)));
          form.set("response", JSON.stringify(draft));
          const result = await saveAnswer(form);
          setMessage(result.message ?? result.error ?? "");
          if (result.success) {
            setDirty(false);
            onLocalResponse(draft);
          }
        }),
      700
    );
    return () => window.clearTimeout(timer);
  }, [assessmentId, attemptId, dirty, draft, onLocalResponse, question.attemptItemId]);
  return (
    <section className="assessment-question">
      <header>
        <span>Question {question.position}</span>
        <span>{question.points} points</span>
      </header>
      <h1>{question.prompt}</h1>
      <QuestionRenderer
        onResponse={(value) => {
          setDraft((current) => ({ ...current, ...value }));
          setDirty(true);
          setMessage("");
        }}
        question={{ ...question, response: draft }}
      />
      <div aria-live="polite" className="assessment-save-status" role="status">
        {pending ? (
          <>
            <LoaderCircle className="ui-spin" />
            Saving
          </>
        ) : message ? (
          <>
            <Check />
            {message}
          </>
        ) : question.savedAt ? (
          "Saved"
        ) : (
          "Not answered"
        )}
      </div>
    </section>
  );
}

export function SubmitDialog({
  assessmentId,
  attemptId,
  onClose,
  open,
  unanswered
}: {
  assessmentId: string;
  attemptId: string;
  onClose(): void;
  open: boolean;
  unanswered: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <Dialog
      description={
        unanswered
          ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered.`
          : "Every question has a saved response."
      }
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      open={open}
      title="Submit assessment?"
    >
      <div className="assessment-submit-dialog">
        {unanswered ? (
          <p>
            <AlertTriangle />
            You can submit with unanswered questions, but you cannot edit afterward.
          </p>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className="ui-dialog-actions">
          <Button onClick={onClose} variant="secondary">
            Continue review
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const form = new FormData();
                form.set("assessmentId", assessmentId);
                form.set("attemptId", attemptId);
                const result = await submitAssessment(form);
                if (result.success)
                  router.push(`/student/assessments/${assessmentId}/review` as Route);
                else setError(result.error ?? "Submission failed.");
              })
            }
          >
            <Send />
            Submit now
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function AssessmentAttemptView({ attempt }: { attempt: CurrentAssessmentAttempt }) {
  const [questions, setQuestions] = useState(attempt.questions);
  const [current, setCurrent] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const question = questions[current];
  const answered = useMemo(
    () =>
      questions.filter((item) =>
        Object.keys(item.response).some((key) => key !== "markedForReview")
      ).length,
    [questions]
  );
  if (!question)
    return (
      <div className="assessment-unsupported" role="status">
        <strong>No questions available</strong>
        <p>This attempt has no frozen question items.</p>
      </div>
    );
  const marked = question.response.markedForReview === true;
  const update = (value: Record<string, unknown>) =>
    setQuestions((items) =>
      items.map((item, index) =>
        index === current ? { ...item, response: value, savedAt: new Date().toISOString() } : item
      )
    );
  return (
    <div className="assessment-attempt-shell">
      <AssessmentToolbar expiresAt={attempt.expiresAt} title={attempt.title} />
      <div className="assessment-attempt-layout">
        <AssessmentSidebar current={current} onSelect={setCurrent} questions={questions} />
        <main>
          <AutosaveQuestion
            assessmentId={attempt.assessmentId}
            attemptId={attempt.attemptId}
            key={question.attemptItemId}
            onLocalResponse={update}
            question={question}
          />
          <div className="assessment-question-actions">
            <Button
              disabled={current === 0}
              onClick={() => setCurrent((value) => Math.max(0, value - 1))}
              variant="secondary"
            >
              <ChevronLeft />
              Previous
            </Button>
            <Button
              onClick={() =>
                startTransition(async () => {
                  const form = new FormData();
                  form.set("assessmentId", attempt.assessmentId);
                  form.set("attemptId", attempt.attemptId);
                  form.set("attemptItemId", question.attemptItemId);
                  const result = await (marked ? unmarkForReview(form) : markForReview(form));
                  if (result.success) update({ ...question.response, markedForReview: !marked });
                })
              }
              variant="ghost"
            >
              {marked ? <BookmarkCheck /> : <Bookmark />}
              {marked ? "Marked" : "Mark for review"}
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const form = new FormData();
                  form.set("assessmentId", attempt.assessmentId);
                  form.set("attemptId", attempt.attemptId);
                  form.set("attemptItemId", question.attemptItemId);
                  const result = await clearAnswer(form);
                  if (result.success) update({ markedForReview: marked });
                })
              }
              variant="ghost"
            >
              <X />
              Clear
            </Button>
            {current < questions.length - 1 ? (
              <Button
                onClick={() => setCurrent((value) => Math.min(questions.length - 1, value + 1))}
              >
                Next
                <ChevronRight />
              </Button>
            ) : (
              <Button onClick={() => setSubmitOpen(true)}>
                <Send />
                Review and submit
              </Button>
            )}
          </div>
          <QuestionProgress answered={answered} total={questions.length} />
        </main>
      </div>
      <footer className="assessment-attempt-footer">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const form = new FormData();
              form.set("assessmentId", attempt.assessmentId);
              form.set("attemptId", attempt.attemptId);
              const result = await abandonAssessment(form);
              if (result.success)
                router.push(`/student/assessments/${attempt.assessmentId}` as Route);
            })
          }
          variant="danger"
        >
          Abandon attempt
        </Button>
        <Button onClick={() => setSubmitOpen(true)}>Submit assessment</Button>
      </footer>
      <SubmitDialog
        assessmentId={attempt.assessmentId}
        attemptId={attempt.attemptId}
        onClose={() => setSubmitOpen(false)}
        open={submitOpen}
        unanswered={questions.length - answered}
      />
    </div>
  );
}

export function ReviewPanel({ questions }: { questions: AssessmentQuestion[] }) {
  return (
    <section className="assessment-review-panel">
      <h2>Response review</h2>
      <ol>
        {questions.map((question) => (
          <li key={question.attemptItemId}>
            <span>Question {question.position}</span>
            <strong>
              {Object.keys(question.response).some((key) => key !== "markedForReview")
                ? "Answered"
                : "Unanswered"}
            </strong>
            {question.response.markedForReview === true ? <span>Marked for review</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
