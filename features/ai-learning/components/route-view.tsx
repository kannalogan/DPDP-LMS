import {
  AiChatWindow,
  AiLearningAnalytics,
  AiLearningDashboard,
  AiLearningHeader,
  AiLearningPermissionDenied,
  AiLearningPromptPerformance,
  AiLearningSubnav,
  AiLearningUnavailable,
  ConversationSidebar,
  ConversationTimeline,
  FlashcardSetTable,
  FlashcardViewer,
  LearningCapabilityGrid,
  LearningGenerator,
  LearningPreferencesForm,
  LearningRecommendationCards,
  LearningSessionStarter,
  MentorAiInsights,
  QuizLibrary,
  QuizPlayer,
  StudyPlanner
} from "@/features/ai-learning/components";
import {
  canAccessAiLearning,
  getAiLearningAvailability,
  getAiLearningOrganizationId,
  getAiLearningSession,
  getAiLearningWorkspace
} from "@/features/ai-learning/server";
import type { AiLearningAccess, AiLearningRouteMode } from "@/features/ai-learning/types";

const copy: Record<AiLearningRouteMode, { description: string; title: string }> = {
  dashboard: {
    title: "AI learning assistant",
    description:
      "Tutor conversations, study tools, plans, and recommendations grounded in approved learning content."
  },
  chat: {
    title: "AI tutor",
    description: "Ask follow-up questions in a private, multi-turn learning session."
  },
  history: {
    title: "Conversation history",
    description: "Continue, pin, archive, and review your previous AI learning sessions."
  },
  flashcards: {
    title: "AI flashcards",
    description: "Generate and review encrypted flashcards with spaced-repetition readiness."
  },
  quizzes: {
    title: "Practice quizzes",
    description: "Generate source-grounded practice questions, explanations, and review attempts."
  },
  plans: {
    title: "Study plans",
    description: "Create daily, weekly, roadmap, and revision schedules around your learning goals."
  },
  recommendations: {
    title: "Learning recommendations",
    description: "Review advisory next steps grounded in your approved activity and goals."
  },
  settings: {
    title: "Assistant settings",
    description: "Control learning style, difficulty, memory, session length, and study formats."
  },
  students: {
    title: "Student AI insights",
    description: "Review AI learning evidence only for learners in your assigned scope."
  },
  interventions: {
    title: "Suggested interventions",
    description: "Prioritize tentative knowledge gaps for human mentor review."
  },
  insights: {
    title: "Learning trend analysis",
    description: "Inspect learner strengths, gaps, activity, and recommendation signals."
  },
  analytics: {
    title: "AI learning analytics",
    description:
      "Monitor redacted organization usage, recommendation activity, and learning events."
  },
  prompts: {
    title: "Prompt performance",
    description: "Review execution-backed generation activity without exposing learner content."
  }
};
export async function AiLearningRouteView({
  access,
  mode,
  sessionId
}: {
  access: AiLearningAccess;
  mode: AiLearningRouteMode;
  sessionId?: string;
}) {
  if (!(await canAccessAiLearning(access))) return <AiLearningPermissionDenied />;
  const [workspace, organizationId, availability] = await Promise.all([
    getAiLearningWorkspace(access),
    getAiLearningOrganizationId(access),
    access === "student"
      ? getAiLearningAvailability()
      : Promise.resolve({ available: true, reason: null })
  ]);
  if (!workspace || !organizationId) return <AiLearningPermissionDenied />;
  const selectedId = sessionId ?? workspace.sessions.find((item) => item.status === "open")?.id;
  const selected = mode === "chat" && selectedId ? await getAiLearningSession(selectedId) : null;
  let content;
  if (mode === "dashboard")
    content = (
      <>
        <AiLearningDashboard dashboard={workspace.dashboard} />
        <LearningCapabilityGrid />
        <div className="ail-grid">
          <LearningGenerator kind="explanation" sessions={workspace.sessions} />
          <LearningGenerator kind="summary" sessions={workspace.sessions} />
        </div>
      </>
    );
  else if (mode === "chat")
    content = selected ? (
      <div className="ail-chat-layout">
        <ConversationSidebar sessions={workspace.sessions} />
        <AiChatWindow
          available={availability.available}
          initialMessages={selected.messages}
          session={selected.session}
        />
      </div>
    ) : (
      <LearningSessionStarter organizationId={organizationId} />
    );
  else if (mode === "history")
    content = (
      <div className="ail-grid">
        <ConversationSidebar sessions={workspace.sessions} />
        <ConversationTimeline sessions={workspace.sessions} />
      </div>
    );
  else if (mode === "flashcards")
    content = (
      <>
        <div className="ail-grid">
          <LearningGenerator kind="flashcards" sessions={workspace.sessions} />
          <FlashcardViewer sets={workspace.flashcardSets} />
        </div>
        <FlashcardSetTable sets={workspace.flashcardSets} />
      </>
    );
  else if (mode === "quizzes")
    content = (
      <>
        <div className="ail-grid">
          <LearningGenerator kind="quiz" sessions={workspace.sessions} />
          <QuizPlayer quizzes={workspace.quizzes} />
        </div>
        <QuizLibrary quizzes={workspace.quizzes} />
      </>
    );
  else if (mode === "plans")
    content = (
      <>
        <div className="ail-grid">
          <LearningGenerator kind="learning_plan" sessions={workspace.sessions} />
          <LearningGenerator kind="revision_plan" sessions={workspace.sessions} />
        </div>
        <StudyPlanner plans={workspace.plans} />
      </>
    );
  else if (mode === "recommendations")
    content = (
      <>
        <LearningGenerator kind="recommendations" sessions={workspace.sessions} />
        <LearningRecommendationCards items={workspace.recommendations} />
      </>
    );
  else if (mode === "settings")
    content = (
      <LearningPreferencesForm
        organizationId={organizationId}
        preferences={workspace.preferences}
      />
    );
  else if (access === "mentor") content = <MentorAiInsights insights={workspace.mentorInsights} />;
  else if (mode === "prompts")
    content = <AiLearningPromptPerformance analytics={workspace.analytics} />;
  else content = <AiLearningAnalytics analytics={workspace.analytics} />;
  return (
    <>
      <AiLearningHeader {...copy[mode]} />
      <AiLearningSubnav access={access} />
      <main className="ail-workspace">
        {!availability.available && availability.reason ? (
          <AiLearningUnavailable reason={availability.reason} />
        ) : null}
        {workspace.sessions.length === 0 &&
        access === "student" &&
        mode !== "chat" &&
        mode !== "settings" ? (
          <LearningSessionStarter organizationId={organizationId} />
        ) : (
          content
        )}
      </main>
    </>
  );
}
