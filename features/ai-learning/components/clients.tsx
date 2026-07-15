"use client";
import {
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Pin,
  RotateCcw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  createAiLearningSession,
  recordAiLearningFeedback,
  recordAiQuizAttempt,
  setAiLearningSessionState,
  updateAiLearningPreferences
} from "@/features/ai-learning/actions";
import type {
  AiFlashcardDto,
  AiFlashcardSetDto,
  AiLearningMessageDto,
  AiLearningPlanDto,
  AiLearningPreferencesDto,
  AiLearningSessionDto,
  AiQuizDto,
  AiQuizQuestionDto
} from "@/features/ai-learning/dtos";
import type { AiLearningGenerationKind } from "@/features/ai-learning/types";
import { calculateQuizScore } from "@/features/ai-learning/quiz";
import { useAiLearningRequest } from "@/features/ai-learning/hooks";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/data-display";
import { Badge, ErrorState, LoadingState, Progress } from "@/shared/ui/feedback";
import { SearchInput, Select, Switch, Textarea } from "@/shared/ui/forms";
import { Input } from "@/shared/ui/input";

type LiveResult = {
  costEstimateMinor: number | null;
  executionId: string;
  model: string;
  outputText: string;
  outputTokens: number;
  provider: string;
  totalTokens: number;
};
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "X-Request-Id": crypto.randomUUID() },
    method: "POST"
  });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed.");
  return payload;
}
export function ConversationSidebar({ sessions }: { sessions: AiLearningSessionDto[] }) {
  const [query, setQuery] = useState("");
  const filtered = sessions.filter((session) =>
    session.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
  return (
    <aside className="ail-conversation-sidebar" aria-label="Conversation history">
      <SearchInput
        aria-label="Search conversations"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search conversations"
        value={query}
      />
      <div className="ail-conversation-list">
        {filtered.map((session) => (
          <div className="ail-conversation-row" key={session.id}>
            <Link href={{ pathname: "/student/assistant/chat", query: { session: session.id } }}>
              <strong>{session.title}</strong>
              <span>{new Date(session.lastActiveAt).toLocaleDateString()}</span>
            </Link>
            {session.isPinned ? <Pin aria-label="Pinned" /> : null}
          </div>
        ))}
      </div>
    </aside>
  );
}
export function AiMarkdownRenderer({ content }: { content: string }) {
  const blocks = content.split(/```/);
  return (
    <div className="ail-markdown">
      {blocks.map((block, index) => {
        if (index % 2 === 1) {
          const [language = "text", ...lines] = block.split("\n");
          return (
            <SyntaxHighlightedCode code={lines.join("\n")} key={index} language={language.trim()} />
          );
        }
        return block
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((paragraph, paragraphIndex) => (
            <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>
          ));
      })}
    </div>
  );
}
export function SyntaxHighlightedCode({ code, language }: { code: string; language: string }) {
  const tokens = code.split(
    /(\b(?:const|let|function|return|select|from|where|true|false|null)\b|"[^"]*"|'[^']*'|\b\d+\b)/gi
  );
  return (
    <div className="ail-code-block">
      <header>
        <span>{language || "text"}</span>
        <CopyButton value={code} />
      </header>
      <pre>
        <code>
          {tokens.map((token, index) => (
            <span
              className={
                /^['"]|^\d|^(const|let|function|return|select|from|where|true|false|null)$/i.test(
                  token
                )
                  ? "ail-token"
                  : undefined
              }
              key={index}
            >
              {token}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      aria-label="Copy response"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      }}
      size="icon"
      variant="ghost"
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
export function AiStreamingRenderer({ content }: { content: string }) {
  return (
    <div aria-live="polite">
      <AiMarkdownRenderer content={content} />
    </div>
  );
}
export function TypingIndicator() {
  return (
    <div aria-label="Assistant is responding" className="ail-typing" role="status">
      <span />
      <span />
      <span />
    </div>
  );
}
export function AiChatWindow({
  available,
  initialMessages,
  session
}: {
  available: boolean;
  initialMessages: AiLearningMessageDto[];
  session: AiLearningSessionDto;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [message, setMessage] = useState("");
  const [liveResult, setLiveResult] = useState<LiveResult | null>(null);
  const execute = useCallback(
    (input: { idempotencyKey: string; message: string; sessionId: string }) =>
      postJson<LiveResult>("/api/ai/chat", input),
    []
  );
  const request = useAiLearningRequest(execute);
  const submit = async () => {
    const value = message.trim();
    if (!value) return;
    const optimistic: AiLearningMessageDto = {
      content: value,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
      role: "user",
      sequenceNo: messages.length + 1
    };
    setMessages((items) => [...items, optimistic]);
    setMessage("");
    const result = await request.run({
      idempotencyKey: crypto.randomUUID(),
      message: value,
      sessionId: session.id
    });
    if (result) {
      setLiveResult(result);
      setMessages((items) => [
        ...items,
        {
          content: result.outputText,
          createdAt: new Date().toISOString(),
          id: result.executionId,
          role: "assistant",
          sequenceNo: items.length + 1
        }
      ]);
    }
  };
  return (
    <Card className="ail-chat-window">
      <header className="ail-chat-header">
        <div>
          <span>AI tutor</span>
          <h2>{session.title}</h2>
        </div>
        <div className="ail-toolbar">
          <Button
            aria-label={session.isPinned ? "Unpin conversation" : "Pin conversation"}
            onClick={() =>
              setAiLearningSessionState({
                isPinned: !session.isPinned,
                sessionId: session.id,
                status: session.status
              })
            }
            size="icon"
            variant="ghost"
          >
            <Pin />
          </Button>
          <Button
            aria-label="Archive conversation"
            onClick={() =>
              setAiLearningSessionState({
                isPinned: session.isPinned,
                sessionId: session.id,
                status: "archived"
              })
            }
            size="icon"
            variant="ghost"
          >
            <Archive />
          </Button>
        </div>
      </header>
      <div className="ail-message-list" role="log">
        {messages.map((item) => (
          <article className={`ail-message ail-message-${item.role}`} key={item.id}>
            <header>
              <strong>{item.role === "assistant" ? "SYRA Assistant" : "You"}</strong>
              <CopyButton value={item.content} />
            </header>
            {item.role === "assistant" ? (
              <AiStreamingRenderer content={item.content} />
            ) : (
              <p>{item.content}</p>
            )}
          </article>
        ))}
        {request.state === "submitting" ? <TypingIndicator /> : null}
      </div>
      {request.error ? <ErrorState description={request.error} /> : null}
      {liveResult ? (
        <div className="ail-usage-strip">
          <Badge tone="info">{liveResult.provider}</Badge>
          <span>{liveResult.totalTokens} tokens</span>
          <span>
            {liveResult.costEstimateMinor === null
              ? "Cost unavailable"
              : `${liveResult.costEstimateMinor} minor units`}
          </span>
          <ResponseRating executionId={liveResult.executionId} sessionId={session.id} />
        </div>
      ) : null}
      <div className="ail-chat-composer">
        <Textarea
          aria-label="Ask a learning question"
          disabled={!available || request.state === "submitting"}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Ask a question about your approved learning content"
          rows={3}
          value={message}
        />
        <Button
          aria-label="Send message"
          disabled={!available || !message.trim()}
          onClick={submit}
          size="icon"
        >
          <Send />
        </Button>
      </div>
      <p className="ail-disclaimer">
        AI output may be incomplete or incorrect. Verify important information against approved
        course material.
      </p>
    </Card>
  );
}
function ResponseRating({ executionId, sessionId }: { executionId: string; sessionId: string }) {
  const [rated, setRated] = useState(false);
  const submit = async (helpful: boolean) => {
    await recordAiLearningFeedback({
      comment: "",
      helpful,
      rating: helpful ? 5 : 2,
      reasonCodes: [],
      sessionId,
      subjectId: executionId,
      subjectType: "execution"
    });
    setRated(true);
  };
  return rated ? (
    <span>Feedback recorded</span>
  ) : (
    <span className="ail-rating">
      <Button
        aria-label="Helpful response"
        onClick={() => submit(true)}
        size="icon"
        variant="ghost"
      >
        <ThumbsUp />
      </Button>
      <Button
        aria-label="Unhelpful response"
        onClick={() => submit(false)}
        size="icon"
        variant="ghost"
      >
        <ThumbsDown />
      </Button>
    </span>
  );
}
export function LearningSessionStarter({ organizationId }: { organizationId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <Card className="ail-panel">
      <h2>Start a learning session</h2>
      <form
        className="ail-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await createAiLearningSession(form);
            setMessage(
              result.success
                ? (result.message ?? "Session created.")
                : (result.error ?? "Session unavailable.")
            );
            if (result.success) location.assign("/student/assistant/chat");
          });
        }}
      >
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Session title
          <Input maxLength={160} name="title" placeholder="DPDP revision" required />
        </label>
        <label>
          Mode
          <Select defaultValue="tutor" name="sessionType">
            <option value="tutor">AI tutor</option>
            <option value="explanation">Concept explanation</option>
            <option value="summary">Summary</option>
            <option value="flashcards">Flashcards</option>
            <option value="quiz">Quiz</option>
            <option value="study_plan">Study plan</option>
            <option value="revision">Revision</option>
          </Select>
        </label>
        <input name="retentionDays" type="hidden" value="30" />
        <Button loading={pending} type="submit">
          <Sparkles /> Start session
        </Button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </Card>
  );
}
export function LearningGenerator({
  kind,
  sessions
}: {
  kind: AiLearningGenerationKind;
  sessions: AiLearningSessionDto[];
}) {
  const [sessionId, setSessionId] = useState(
    sessions.find((item) => item.status === "open")?.id ?? ""
  );
  const [sourceType, setSourceType] = useState("lesson");
  const [sourceId, setSourceId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [difficulty, setDifficulty] = useState("adaptive");
  const execute = useCallback(
    (input: Record<string, unknown>) =>
      postJson<{ artifactCount?: number; artifactId?: string; result: LiveResult }>(
        endpoint(kind),
        input
      ),
    [kind]
  );
  const request = useAiLearningRequest(execute);
  return (
    <Card className="ail-panel">
      <header className="ail-panel-heading">
        <div>
          <span>Controlled generation</span>
          <h2>{label(kind)}</h2>
        </div>
        <Sparkles />
      </header>
      <div className="ail-form">
        <label>
          Learning session
          <Select onChange={(event) => setSessionId(event.target.value)} value={sessionId}>
            <option value="">Select a session</option>
            {sessions
              .filter((item) => item.status === "open")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
          </Select>
        </label>
        <div className="ail-form-row">
          <label>
            Source type
            <Select onChange={(event) => setSourceType(event.target.value)} value={sourceType}>
              <option value="lesson">Lesson</option>
              <option value="module">Module</option>
              <option value="course">Course</option>
            </Select>
          </label>
          <label>
            Approved source ID
            <Input
              onChange={(event) => setSourceId(event.target.value)}
              placeholder="UUID"
              value={sourceId}
            />
          </label>
        </div>
        <label>
          Learning goal
          <Textarea
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what you want to understand or practice"
            rows={4}
            value={prompt}
          />
        </label>
        <label>
          Difficulty
          <Select onChange={(event) => setDifficulty(event.target.value)} value={difficulty}>
            <option value="adaptive">Adaptive</option>
            <option value="introductory">Introductory</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </label>
        <Button
          disabled={!sessionId || !sourceId || !prompt.trim() || request.state === "submitting"}
          loading={request.state === "submitting"}
          onClick={() =>
            request.run({
              count: 12,
              difficulty,
              idempotencyKey: crypto.randomUUID(),
              kind,
              prompt,
              sessionId,
              sourceId,
              sourceType
            })
          }
        >
          <Sparkles /> Generate
        </Button>
      </div>
      {request.error ? <ErrorState description={request.error} /> : null}
      {request.result ? (
        <div className="ail-success" role="status">
          <Check /> Generation completed and saved.
        </div>
      ) : null}
    </Card>
  );
}
function endpoint(kind: AiLearningGenerationKind) {
  if (kind === "flashcards") return "/api/ai/flashcards";
  if (kind === "quiz") return "/api/ai/quizzes";
  if (kind === "learning_plan" || kind === "revision_plan") return "/api/ai/plans";
  if (kind === "recommendations" || kind === "insights") return "/api/ai/recommendations";
  return "/api/ai/chat";
}
function label(kind: AiLearningGenerationKind) {
  return kind
    .split("_")
    .map((item) => item[0]?.toUpperCase() + item.slice(1))
    .join(" ");
}
export function FlashcardViewer({ sets }: { sets: AiFlashcardSetDto[] }) {
  const [setId, setSetId] = useState(sets[0]?.id ?? "");
  const [cards, setCards] = useState<AiFlashcardDto[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = async (id: string) => {
    setSetId(id);
    setLoading(true);
    setIndex(0);
    setFlipped(false);
    const response = await fetch(`/api/ai/flashcards?setId=${encodeURIComponent(id)}`);
    setCards(response.ok ? ((await response.json()) as AiFlashcardDto[]) : []);
    setLoading(false);
  };
  const card = cards[index];
  return (
    <Card className="ail-panel">
      <div className="ail-toolbar">
        <Select
          aria-label="Flashcard set"
          onChange={(event) => load(event.target.value)}
          value={setId}
        >
          <option value="">Select a set</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.title}
            </option>
          ))}
        </Select>
        <Button disabled={!setId} onClick={() => load(setId)} variant="secondary">
          <RotateCcw /> Load set
        </Button>
      </div>
      {loading ? (
        <LoadingState label="Loading flashcards" />
      ) : card ? (
        <div className="ail-flashcard-stage">
          <button
            aria-label="Flip flashcard"
            className="ail-flashcard"
            onClick={() => setFlipped((value) => !value)}
            type="button"
          >
            <span>{flipped ? card.back : card.front}</span>
            <small>{flipped ? card.explanation : card.category}</small>
          </button>
          <div className="ail-player-controls">
            <Button
              aria-label="Previous card"
              disabled={index === 0}
              onClick={() => {
                setIndex((value) => value - 1);
                setFlipped(false);
              }}
              size="icon"
              variant="secondary"
            >
              <ChevronLeft />
            </Button>
            <span>
              {index + 1} / {cards.length}
            </span>
            <Button
              aria-label="Next card"
              disabled={index >= cards.length - 1}
              onClick={() => {
                setIndex((value) => value + 1);
                setFlipped(false);
              }}
              size="icon"
              variant="secondary"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : (
        <p className="ail-muted">Choose a generated set to begin review.</p>
      )}
    </Card>
  );
}
export function QuizPlayer({ quizzes }: { quizzes: AiQuizDto[] }) {
  const [quizId, setQuizId] = useState(quizzes[0]?.id ?? "");
  const [questions, setQuestions] = useState<AiQuizQuestionDto[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [review, setReview] = useState(false);
  const [startedAt, setStartedAt] = useState(new Date().toISOString());
  const load = async (id: string) => {
    setQuizId(id);
    setReview(false);
    setAnswers({});
    setStartedAt(new Date().toISOString());
    const response = await fetch(`/api/ai/quizzes?quizId=${encodeURIComponent(id)}`);
    setQuestions(response.ok ? ((await response.json()) as AiQuizQuestionDto[]) : []);
  };
  const correctIds = useMemo(
    () =>
      new Set(
        questions
          .filter(
            (question) =>
              answers[question.id]?.trim().toLocaleLowerCase() ===
              question.answer.trim().toLocaleLowerCase()
          )
          .map((question) => question.id)
      ),
    [answers, questions]
  );
  const score = calculateQuizScore(correctIds.size, questions.length);
  return (
    <Card className="ail-panel">
      <div className="ail-toolbar">
        <Select
          aria-label="Practice quiz"
          onChange={(event) => load(event.target.value)}
          value={quizId}
        >
          <option value="">Select a quiz</option>
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.id}>
              {quiz.title}
            </option>
          ))}
        </Select>
        <Button disabled={!quizId} onClick={() => load(quizId)} variant="secondary">
          Load quiz
        </Button>
      </div>
      {questions.map((question) => (
        <fieldset className="ail-question" key={question.id}>
          <legend>
            {question.sequenceNo}. {question.prompt}
          </legend>
          {question.options.length ? (
            question.options.map((option) => (
              <label key={option}>
                <input
                  checked={answers[question.id] === option}
                  name={question.id}
                  onChange={() => setAnswers((items) => ({ ...items, [question.id]: option }))}
                  type="radio"
                />{" "}
                {option}
              </label>
            ))
          ) : (
            <Input
              onChange={(event) =>
                setAnswers((items) => ({ ...items, [question.id]: event.target.value }))
              }
              value={answers[question.id] ?? ""}
            />
          )}
          {review ? (
            <div
              className={correctIds.has(question.id) ? "ail-answer-correct" : "ail-answer-review"}
            >
              <strong>{correctIds.has(question.id) ? "Correct" : "Review"}</strong>
              <p>{question.explanation}</p>
            </div>
          ) : null}
        </fieldset>
      ))}
      {questions.length ? (
        <div className="ail-player-footer">
          <Progress label="Score" value={review ? score : 0} />
          <Button
            onClick={async () => {
              setReview(true);
              await recordAiQuizAttempt({
                correctCount: correctIds.size,
                incorrectQuestionIds: questions
                  .filter((question) => !correctIds.has(question.id))
                  .map((question) => question.id),
                quizId,
                responses: answers,
                scorePercent: score,
                startedAt
              });
            }}
          >
            Check answers
          </Button>
        </div>
      ) : (
        <p className="ail-muted">Choose a generated quiz to begin.</p>
      )}
    </Card>
  );
}
export function StudyPlanner({ plans }: { plans: AiLearningPlanDto[] }) {
  const [selected, setSelected] = useState(plans[0]?.id ?? "");
  const plan = plans.find((item) => item.id === selected);
  return (
    <Card className="ail-panel">
      <Select
        aria-label="Study plan"
        onChange={(event) => setSelected(event.target.value)}
        value={selected}
      >
        <option value="">Select a plan</option>
        {plans.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </Select>
      {plan ? (
        <>
          <header className="ail-plan-header">
            <div>
              <span>{plan.planType}</span>
              <h2>{plan.title}</h2>
            </div>
            <Badge tone="info">{plan.status}</Badge>
          </header>
          <p>{plan.overview}</p>
          <ol className="ail-plan-steps">
            {plan.steps.map((step) => (
              <li key={step.id}>
                <span>{step.sequenceNo}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                  <small>{step.estimatedMinutes} minutes</small>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="ail-muted">Generated daily, weekly, and revision plans appear here.</p>
      )}
    </Card>
  );
}
export function LearningPreferencesForm({
  organizationId,
  preferences
}: {
  organizationId: string;
  preferences: AiLearningPreferencesDto | null;
}) {
  const initial = preferences ?? {
    allowLearningMemory: true,
    explanationDepth: "balanced",
    flashcardBatchSize: 12,
    learningStyle: "adaptive",
    preferredDifficulty: "adaptive" as const,
    quizQuestionTypes: ["mcq", "true_false"],
    sessionMinutes: 30
  };
  const [memory, setMemory] = useState(initial.allowLearningMemory);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <Card className="ail-panel">
      <h2>Learning preferences</h2>
      <form
        className="ail-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await updateAiLearningPreferences({
              allowLearningMemory: memory,
              contentFormats: ["text", "examples", "steps"],
              explanationDepth: form.get("explanationDepth"),
              flashcardBatchSize: Number(form.get("flashcardBatchSize")),
              learningStyle: form.get("learningStyle"),
              organizationId,
              preferredDifficulty: form.get("preferredDifficulty"),
              quizQuestionTypes: ["mcq", "true_false", "short_answer"],
              sessionMinutes: Number(form.get("sessionMinutes"))
            });
            setMessage(
              result.success ? (result.message ?? "Saved.") : (result.error ?? "Unavailable.")
            );
          });
        }}
      >
        <div className="ail-form-row">
          <label>
            Learning style
            <Select defaultValue={initial.learningStyle} name="learningStyle">
              <option value="adaptive">Adaptive</option>
              <option value="visual">Visual</option>
              <option value="reading">Reading</option>
              <option value="practice">Practice</option>
              <option value="mixed">Mixed</option>
            </Select>
          </label>
          <label>
            Difficulty
            <Select defaultValue={initial.preferredDifficulty} name="preferredDifficulty">
              <option value="adaptive">Adaptive</option>
              <option value="introductory">Introductory</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </label>
        </div>
        <div className="ail-form-row">
          <label>
            Session minutes
            <Input
              defaultValue={initial.sessionMinutes}
              max={240}
              min={5}
              name="sessionMinutes"
              type="number"
            />
          </label>
          <label>
            Flashcard batch
            <Input
              defaultValue={initial.flashcardBatchSize}
              max={100}
              min={1}
              name="flashcardBatchSize"
              type="number"
            />
          </label>
        </div>
        <label>
          Explanation depth
          <Select defaultValue={initial.explanationDepth} name="explanationDepth">
            <option value="concise">Concise</option>
            <option value="balanced">Balanced</option>
            <option value="detailed">Detailed</option>
          </Select>
        </label>
        <Switch
          checked={memory}
          label="Remember learning preferences"
          onCheckedChange={setMemory}
        />
        <Button loading={pending} type="submit">
          Save preferences
        </Button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </Card>
  );
}
