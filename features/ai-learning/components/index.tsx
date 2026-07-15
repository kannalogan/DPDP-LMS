import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  Brain,
  CalendarClock,
  ChartNoAxesCombined,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Target
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type {
  AiLearningAnalyticsDto,
  AiLearningDashboardDto,
  AiLearningRecommendationDto,
  AiLearningSessionDto,
  AiMentorStudentInsightDto,
  AiQuizDto,
  AiFlashcardSetDto
} from "@/features/ai-learning/dtos";
import { rankLearningRecommendations } from "@/features/ai-learning/recommendations";
import { selectAtRiskLearners } from "@/features/ai-learning/selectors";
import { Card, MetricCard, Table, Timeline } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, SkeletonState } from "@/shared/ui/feedback";
import "@/features/ai-learning/ai-learning.css";

export * from "@/features/ai-learning/components/clients";
export function AiLearningHeader({ description, title }: { description: string; title: string }) {
  return (
    <header className="ail-header">
      <div>
        <span>Enterprise AI learning</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Brain />
    </header>
  );
}
export function AiLearningSubnav({ access }: { access: "student" | "mentor" | "admin" }) {
  const links =
    access === "student"
      ? [
          ["/student/assistant", "Overview"],
          ["/student/assistant/chat", "Tutor"],
          ["/student/assistant/history", "History"],
          ["/student/assistant/flashcards", "Flashcards"],
          ["/student/assistant/quizzes", "Quizzes"],
          ["/student/assistant/plans", "Plans"],
          ["/student/assistant/recommendations", "Recommendations"],
          ["/student/assistant/settings", "Settings"]
        ]
      : access === "mentor"
        ? [
            ["/mentor/ai/students", "Students"],
            ["/mentor/ai/interventions", "Interventions"],
            ["/mentor/ai/insights", "Insights"]
          ]
        : [
            ["/admin/ai/learning", "Overview"],
            ["/admin/ai/learning/analytics", "Analytics"],
            ["/admin/ai/learning/prompts", "Prompts"],
            ["/admin/ai/learning/recommendations", "Recommendations"]
          ];
  return (
    <nav aria-label="AI learning workspace" className="ail-subnav">
      {links.map(([href, label]) => (
        <Link href={href as Route} key={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function AiLearningPermissionDenied() {
  return (
    <section className="ail-state">
      <ShieldAlert />
      <h1>Permission required</h1>
      <p>Your current organization role does not allow access to this AI learning workspace.</p>
    </section>
  );
}
export function AiLearningUnavailable({ reason }: { reason: string }) {
  return (
    <Card className="ail-notice">
      <AlertTriangle />
      <div>
        <strong>AI learning is unavailable</strong>
        <p>{reason}</p>
      </div>
    </Card>
  );
}
export function AiLearningLoading() {
  return (
    <div className="ail-workspace">
      <SkeletonState rows={5} />
    </div>
  );
}
export function AiLearningError({ description }: { description: string }) {
  return <ErrorState description={description} title="AI learning could not load" />;
}
export function AiLearningEmpty({ description, title }: { description: string; title: string }) {
  return <EmptyState description={description} title={title} />;
}
export function AiLearningDashboard({ dashboard }: { dashboard: AiLearningDashboardDto }) {
  return (
    <div className="ail-metrics">
      <MetricCard label="Open sessions" value={String(dashboard.openSessions)} />
      <MetricCard label="Cards due" value={String(dashboard.cardsDue)} />
      <MetricCard label="Active plans" value={String(dashboard.activePlans)} />
      <MetricCard label="Recommendations" value={String(dashboard.activeRecommendations)} />
    </div>
  );
}
export function ConversationTimeline({ sessions }: { sessions: AiLearningSessionDto[] }) {
  if (!sessions.length)
    return (
      <AiLearningEmpty
        description="Start a tutor, summary, quiz, or planning session to build history."
        title="No AI learning history"
      />
    );
  return (
    <Card className="ail-panel">
      <h2>Conversation timeline</h2>
      <Timeline
        items={sessions.map((session) => ({
          content: (
            <p>
              {session.sessionType.replace("_", " ")} · {session.status}
            </p>
          ),
          time: new Date(session.lastActiveAt).toLocaleString(),
          title: session.title
        }))}
      />
    </Card>
  );
}
export function LearningRecommendationCards({ items }: { items: AiLearningRecommendationDto[] }) {
  const ranked = rankLearningRecommendations(items);
  if (!ranked.length)
    return (
      <AiLearningEmpty
        description="Recommendations appear only after approved learning evidence is available."
        title="No recommendations"
      />
    );
  return (
    <div className="ail-card-grid">
      {ranked.map((item) => (
        <Card className="ail-recommendation" key={item.id}>
          <header>
            <Target />
            <Badge tone="info">Priority {item.priority}</Badge>
          </header>
          <h2>{item.title}</h2>
          <p>{item.reason}</p>
          <footer>
            <span>{item.recommendationType.replaceAll("_", " ")}</span>
            {item.confidence !== null ? (
              <span>{Math.round(item.confidence * 100)}% confidence</span>
            ) : null}
          </footer>
        </Card>
      ))}
    </div>
  );
}
export function FlashcardSetTable({ sets }: { sets: AiFlashcardSetDto[] }) {
  return (
    <Card className="ail-panel">
      <h2>Flashcard sets</h2>
      <Table
        caption="Generated flashcard sets"
        emptyMessage="No generated flashcards"
        rows={sets}
        columns={[
          { key: "title", header: "Set", render: (row) => <strong>{row.title}</strong> },
          { key: "cards", header: "Cards", render: (row) => row.cardCount },
          { key: "due", header: "Due", render: (row) => row.dueCount },
          { key: "known", header: "Known", render: (row) => row.knownCount },
          { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> }
        ]}
      />
    </Card>
  );
}
export function QuizLibrary({ quizzes }: { quizzes: AiQuizDto[] }) {
  return (
    <Card className="ail-panel">
      <h2>Quiz library</h2>
      <Table
        caption="AI-generated practice quizzes"
        emptyMessage="No generated quizzes"
        rows={quizzes}
        columns={[
          { key: "title", header: "Quiz", render: (row) => <strong>{row.title}</strong> },
          { key: "questions", header: "Questions", render: (row) => row.questionCount },
          { key: "attempts", header: "Attempts", render: (row) => row.attemptCount },
          {
            key: "score",
            header: "Best score",
            render: (row) => (row.bestScore === null ? "Not attempted" : `${row.bestScore}%`)
          },
          { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> }
        ]}
      />
    </Card>
  );
}
export function MentorAiInsights({ insights }: { insights: AiMentorStudentInsightDto[] }) {
  const atRisk = selectAtRiskLearners({
    analytics: [],
    dashboard: {
      activeGoals: 0,
      activePlans: 0,
      activeRecommendations: 0,
      cardsDue: 0,
      lastActiveAt: null,
      openSessions: 0,
      pinnedSessions: 0
    },
    flashcardSets: [],
    mentorInsights: insights,
    plans: [],
    preferences: null,
    quizzes: [],
    recommendations: [],
    sessions: []
  });
  return (
    <div className="ail-workspace">
      <div className="ail-metrics">
        <MetricCard label="Learners with AI activity" value={String(insights.length)} />
        <MetricCard label="Intervention review" value={String(atRisk.length)} />
      </div>
      <Card className="ail-panel">
        <h2>Student AI insights</h2>
        <Table
          caption="Authorized learner AI insights"
          emptyMessage="No assigned learner AI evidence"
          rows={insights}
          columns={[
            {
              key: "learner",
              header: "Learner reference",
              render: (row) => <code>{row.profileId.slice(0, 8)}</code>
            },
            { key: "sessions", header: "Sessions", render: (row) => row.sessionCount },
            { key: "weaknesses", header: "Open gaps", render: (row) => row.openWeaknesses },
            {
              key: "risk",
              header: "Highest risk",
              render: (row) => (
                <Badge tone={row.highestRisk >= 0.65 ? "warning" : "neutral"}>
                  {Math.round(row.highestRisk * 100)}%
                </Badge>
              )
            },
            {
              key: "activity",
              header: "Last active",
              render: (row) =>
                row.lastActiveAt ? new Date(row.lastActiveAt).toLocaleDateString() : "No activity"
            }
          ]}
        />
      </Card>
    </div>
  );
}
export function AiLearningAnalytics({ analytics }: { analytics: AiLearningAnalyticsDto[] }) {
  const totals = analytics.reduce(
    (result, item) => ({
      events: result.events + item.eventCount,
      learners: Math.max(result.learners, item.learnerCount),
      sessions: result.sessions + item.sessionCount
    }),
    { events: 0, learners: 0, sessions: 0 }
  );
  return (
    <div className="ail-workspace">
      <div className="ail-metrics">
        <MetricCard label="Learning events" value={String(totals.events)} />
        <MetricCard label="Active learners" value={String(totals.learners)} />
        <MetricCard label="Session activity" value={String(totals.sessions)} />
      </div>
      <Card className="ail-panel">
        <h2>AI learning usage</h2>
        <Table
          caption="Redacted AI learning analytics"
          emptyMessage="No AI learning events"
          rows={analytics}
          columns={[
            {
              key: "date",
              header: "Day",
              render: (row) => new Date(row.activityDay).toLocaleDateString()
            },
            { key: "event", header: "Event", render: (row) => row.eventType },
            { key: "count", header: "Events", render: (row) => row.eventCount },
            { key: "learners", header: "Learners", render: (row) => row.learnerCount },
            { key: "sessions", header: "Sessions", render: (row) => row.sessionCount }
          ]}
        />
      </Card>
    </div>
  );
}
export function AiLearningPromptPerformance({
  analytics
}: {
  analytics: AiLearningAnalyticsDto[];
}) {
  const generations = analytics.filter((item) => item.eventType.startsWith("generation."));
  return (
    <Card className="ail-panel">
      <header className="ail-panel-heading">
        <div>
          <span>Execution-backed evidence</span>
          <h2>Learning prompt performance</h2>
        </div>
        <ChartNoAxesCombined />
      </header>
      {generations.length ? (
        <div className="ail-activity-list">
          {generations.map((item) => (
            <div key={`${item.activityDay}-${item.eventType}`}>
              <Activity />
              <span>{item.eventType.replace("generation.", "").replaceAll("_", " ")}</span>
              <strong>{item.eventCount}</strong>
            </div>
          ))}
        </div>
      ) : (
        <AiLearningEmpty
          description="Generation performance appears after approved executions complete."
          title="No prompt activity"
        />
      )}
    </Card>
  );
}
export function LearningCapabilityGrid() {
  return (
    <div className="ail-capability-grid">
      <Card>
        <MessageSquareText />
        <strong>AI tutor</strong>
        <span>Multi-turn, context-aware learning support</span>
      </Card>
      <Card>
        <BookOpenCheck />
        <strong>Study artifacts</strong>
        <span>Explanations, summaries, flashcards, and quizzes</span>
      </Card>
      <Card>
        <CalendarClock />
        <strong>Planning</strong>
        <span>Daily, weekly, revision, and goal plans</span>
      </Card>
      <Card>
        <Sparkles />
        <strong>Recommendations</strong>
        <span>Advisory next steps grounded in learning evidence</span>
      </Card>
    </div>
  );
}
