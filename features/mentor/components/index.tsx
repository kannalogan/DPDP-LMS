import { AlertTriangle, ClipboardList, Megaphone, Users } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type {
  MentorAnnouncementItem,
  MentorCohortSummary,
  MentorLearnerSummary,
  MentorReviewItem,
  MentorTaskItem,
  MentorWorkspaceData
} from "@/features/mentor/types";
import { completionRate, learnerRiskLabel, riskTone } from "@/features/mentor/selectors";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, LoadingState, Progress } from "@/shared/ui/feedback";

export function MentorPageHeader({ description, title }: { description: string; title: string }) {
  return (
    <header className="student-page-header">
      <div>
        <span className="student-eyebrow">Mentor workspace</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}

export function MentorPermissionError() {
  return (
    <ErrorState
      description="You need an active mentor assignment or mentor workspace permission in the current organization."
      title="Mentor access required"
    />
  );
}

export function MentorDashboard({ data }: { data: MentorWorkspaceData }) {
  return (
    <div className="mentor-shell">
      <StatisticsCards data={data} />
      <div className="mentor-grid">
        <CohortOverview cohorts={data.cohorts.slice(0, 4)} />
        <TaskList tasks={data.tasks.slice(0, 5)} />
        <ReviewQueue reviews={data.reviews.slice(0, 5)} />
        <AnnouncementList announcements={data.announcements.slice(0, 5)} />
      </div>
    </div>
  );
}

export function StatisticsCards({ data }: { data: MentorWorkspaceData }) {
  const stats = [
    ["Assigned learners", data.summary.assignedLearners],
    ["Active cohorts", data.summary.activeCohorts],
    ["Needs attention", data.summary.learnersNeedingAttention],
    ["Pending reviews", data.summary.pendingReviews],
    ["Open tasks", data.summary.openTasks]
  ] as const;
  return (
    <section className="mentor-grid">
      {stats.map(([label, value]) => (
        <Card className="mentor-card mentor-stat" key={label}>
          <span className="student-eyebrow">{label}</span>
          <strong>{value}</strong>
        </Card>
      ))}
    </section>
  );
}

export function LearnerSummaryCard({ learner }: { learner: MentorLearnerSummary }) {
  const rate = completionRate(learner);
  return (
    <Card className="mentor-card">
      <div className="student-card-heading">
        <span className="student-eyebrow">Learner</span>
        <Badge tone={riskTone(learner.activeRiskCount)}>{learnerRiskLabel(learner)}</Badge>
      </div>
      <h2>{learner.learnerDisplayName}</h2>
      <Progress label="Completion" value={rate} />
      <div className="mentor-meta">
        <Badge>{learner.enrollmentCount} enrollments</Badge>
        <Badge>{learner.upcomingAssessments} assessments</Badge>
        <Badge>{learner.certificateCount} certificates</Badge>
      </div>
      <Button asChild variant="secondary">
        <Link href={`/mentor/learners/${learner.learnerId}` as Route}>Open profile</Link>
      </Button>
    </Card>
  );
}

export function LearnerList({ learners }: { learners: MentorLearnerSummary[] }) {
  if (!learners.length)
    return (
      <EmptyState
        description="Assigned learners will appear when cohort membership and mentor assignments are active."
        title="No assigned learners"
      />
    );
  return (
    <div className="mentor-grid">
      {learners.map((learner) => (
        <LearnerSummaryCard key={learner.learnerId} learner={learner} />
      ))}
    </div>
  );
}

export function LearnerProfilePanel({ learner }: { learner: MentorLearnerSummary }) {
  return (
    <Card className="mentor-panel">
      <div className="student-card-heading">
        <span className="student-eyebrow">Learner profile</span>
        <Badge tone={riskTone(learner.activeRiskCount)}>{learnerRiskLabel(learner)}</Badge>
      </div>
      <h2>{learner.learnerDisplayName}</h2>
      <Progress label="Completion" value={completionRate(learner)} />
      <div className="mentor-meta">
        <Badge>{learner.enrollmentCount} enrollments</Badge>
        <Badge>{learner.completedEnrollments} completed</Badge>
        <Badge>{learner.activeRiskCount} active risks</Badge>
      </div>
    </Card>
  );
}

export function CohortOverview({ cohorts }: { cohorts: MentorCohortSummary[] }) {
  if (!cohorts.length)
    return (
      <EmptyState description="Active assigned cohorts will appear here." title="No cohorts" />
    );
  return (
    <Card className="mentor-panel">
      <h2>Cohort overview</h2>
      <div className="mentor-list">
        {cohorts.map((cohort) => (
          <article className="mentor-list-item" key={cohort.cohortId}>
            <div className="student-card-heading">
              <strong>{cohort.cohortName}</strong>
              <Badge tone={riskTone(cohort.learnersNeedingAttention)}>
                {cohort.learnersNeedingAttention} alerts
              </Badge>
            </div>
            <p>{cohort.assignedLearners} learners assigned</p>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/mentor/cohorts/${cohort.cohortId}` as Route}>Open cohort</Link>
            </Button>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function CohortProgress({ cohort }: { cohort: MentorCohortSummary }) {
  return (
    <Card className="mentor-panel">
      <h2>{cohort.cohortName}</h2>
      <div className="mentor-meta">
        <Badge>{cohort.assignedLearners} learners</Badge>
        <Badge tone={riskTone(cohort.learnersNeedingAttention)}>
          {cohort.learnersNeedingAttention} need attention
        </Badge>
        <Badge>{cohort.pendingReviews} reviews</Badge>
      </div>
    </Card>
  );
}

export function TaskList({ tasks }: { tasks: MentorTaskItem[] }) {
  return (
    <Queue
      title="Personal task list"
      empty="No open mentor tasks"
      icon={<ClipboardList />}
      items={tasks.map((task) => ({
        href: `/mentor/learners/${task.learnerId}`,
        meta: task.type,
        title: task.reason
      }))}
    />
  );
}

export function ReviewQueue({ reviews }: { reviews: MentorReviewItem[] }) {
  return (
    <Queue
      title="Review queue"
      empty="No pending reviews"
      icon={<AlertTriangle />}
      items={reviews.map((review) => ({
        href: `/mentor/learners/${review.learnerId}`,
        meta: review.status,
        title: `${review.periodStart} to ${review.periodEnd}`
      }))}
    />
  );
}

export function AnnouncementList({ announcements }: { announcements: MentorAnnouncementItem[] }) {
  return (
    <Queue
      title="Announcements"
      empty="No announcements"
      icon={<Megaphone />}
      items={announcements.map((announcement) => ({
        href: "/mentor/announcements",
        meta: announcement.status,
        title: announcement.title
      }))}
    />
  );
}

function Queue({
  empty,
  icon,
  items,
  title
}: {
  empty: string;
  icon: React.ReactNode;
  items: Array<{ href: string; meta: string; title: string }>;
  title: string;
}) {
  if (!items.length) return <EmptyState description={empty} title={title} />;
  return (
    <Card className="mentor-panel">
      <div className="student-card-heading">
        <h2>{title}</h2>
        {icon}
      </div>
      <div className="mentor-list">
        {items.map((item, index) => (
          <article className="mentor-list-item" key={`${item.title}-${index}`}>
            <strong>{item.title}</strong>
            <Badge>{item.meta}</Badge>
            <Button asChild size="sm" variant="ghost">
              <Link href={item.href as Route}>Open</Link>
            </Button>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function ActivityFeed({ learners }: { learners: MentorLearnerSummary[] }) {
  if (!learners.length)
    return <EmptyState description="No learner activity yet." title="Activity feed" />;
  return (
    <Card className="mentor-panel">
      <h2>Activity feed</h2>
      <div className="mentor-list">
        {learners.slice(0, 8).map((learner) => (
          <article className="mentor-list-item" key={learner.learnerId}>
            <strong>{learner.learnerDisplayName}</strong>
            <p>{learner.lastActivityAt ?? "No recent activity"}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function AnnouncementComposer() {
  return (
    <Card className="mentor-panel">
      <h2>Announcement composer</h2>
      <p>
        Publishing uses the controlled server action and cohort-scoped RPC. Select a cohort before
        composing.
      </p>
    </Card>
  );
}

export function MentorLoading() {
  return <LoadingState label="Loading mentor workspace" />;
}

export function MentorSearchAndFilters() {
  return (
    <Card className="mentor-panel">
      <div className="student-card-heading">
        <h2>Search and filters</h2>
        <Users aria-hidden="true" />
      </div>
      <p>
        Search and pagination controls are wired to repository projections as data volume grows.
      </p>
    </Card>
  );
}
