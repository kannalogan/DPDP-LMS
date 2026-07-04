import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Sparkles,
  Target
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import type {
  StudentActivity,
  StudentCourse,
  StudentGoal,
  StudentNotification,
  StudentRecommendation
} from "@/features/student/types";
import { Button } from "@/shared/ui/button";
import { Card, MetricCard, Timeline } from "@/shared/ui/data-display";
import { Badge, Progress, ProgressRing } from "@/shared/ui/feedback";

export function ContinueLearningCard({ course }: { course: StudentCourse }) {
  return (
    <Card className="student-continue-card">
      <div className="student-card-heading">
        <div>
          <span className="student-eyebrow">Continue learning</span>
          <h3>{course.title}</h3>
        </div>
        <ProgressRing label={`${course.title} progress`} size="sm" value={course.progress} />
      </div>
      {course.nextLessonTitle ? <p>Next: {course.nextLessonTitle}</p> : null}
      <Progress label="Course progress" value={course.progress} />
      <Button asChild>
        <Link href={`/student/learning?course=${course.courseId}` as Route}>Continue</Link>
      </Button>
    </Card>
  );
}

export function StudentCourseCard({ course }: { course: StudentCourse }) {
  return (
    <Card className="student-course-card">
      <div className="student-card-heading">
        <span className="student-eyebrow">{course.category ?? "Course"}</span>
        <Badge tone={course.status === "completed" ? "success" : "info"}>
          {course.status.replace("_", " ")}
        </Badge>
      </div>
      <h3>{course.title}</h3>
      <p>{course.description}</p>
      <Progress
        label={`${course.completedLessons} of ${course.totalLessons} lessons`}
        value={course.progress}
      />
      <Button asChild variant="secondary">
        <Link href={`/student/learning?course=${course.courseId}` as Route}>View course</Link>
      </Button>
    </Card>
  );
}

export function GoalCard({ goal }: { goal: StudentGoal }) {
  const value = goal.target ? Math.round((goal.completed / goal.target) * 100) : 0;
  return (
    <Card className="student-goal-card">
      <div className="student-card-heading">
        <Target aria-hidden="true" />
        <Badge>{goal.period}</Badge>
      </div>
      <h3>{goal.label}</h3>
      <Progress label={`${goal.completed} of ${goal.target} ${goal.unit}`} value={value} />
    </Card>
  );
}

export function ActivityCard({ activity }: { activity: StudentActivity }) {
  return (
    <Card className="student-activity-card">
      <CheckCircle2 aria-hidden="true" />
      <div>
        <strong>{activity.title}</strong>
        <time dateTime={activity.occurredAt}>{new Date(activity.occurredAt).toLocaleString()}</time>
      </div>
    </Card>
  );
}

export function ReminderCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Card className="student-reminder-card">
      <CalendarClock aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        {children}
      </div>
    </Card>
  );
}

export function NotificationCard({ notification }: { notification: StudentNotification }) {
  return (
    <Card className="student-notification-card">
      <Bell aria-hidden="true" />
      <div>
        <div className="student-card-heading">
          <strong>{notification.title}</strong>
          {!notification.readAt ? <Badge tone="info">New</Badge> : null}
        </div>
        <p>{notification.summary}</p>
        <time dateTime={notification.createdAt}>
          {new Date(notification.createdAt).toLocaleString()}
        </time>
      </div>
    </Card>
  );
}

export function QuickActionCard({
  description,
  href,
  icon,
  title
}: {
  description: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link className="student-quick-action" href={href as Route}>
      {icon}
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </Link>
  );
}

export function RecommendationCard({ item }: { item: StudentRecommendation }) {
  return (
    <Card className="student-recommendation-card">
      <Sparkles aria-hidden="true" />
      <div>
        <span className="student-eyebrow">Recommended next</span>
        <h3>{item.title}</h3>
        <p>{item.explanation}</p>
      </div>
    </Card>
  );
}

export function LearningStats({
  activeCourses,
  completion,
  studyMinutes
}: {
  activeCourses: number;
  completion: number | null;
  studyMinutes: number | null;
}) {
  return (
    <div className="student-stats" aria-label="Learning summary">
      <MetricCard label="Active courses" value={String(activeCourses)} />
      <MetricCard label="Average progress" value={completion === null ? "—" : `${completion}%`} />
      <MetricCard
        label="Study time"
        value={studyMinutes === null ? "—" : `${Math.round(studyMinutes / 60)}h`}
      />
    </div>
  );
}

export function LearningTimelineList({ activities }: { activities: StudentActivity[] }) {
  return (
    <Timeline
      items={activities.map((activity) => ({
        content: <Badge>{activity.type}</Badge>,
        time: new Date(activity.occurredAt).toLocaleDateString(),
        title: activity.title
      }))}
    />
  );
}

export function CalendarWidget({ dates, month }: { dates: string[]; month: Date }) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const active = new Set(dates.map((date) => date.slice(0, 10)));
  const cells = [
    ...Array.from({ length: firstDay.getDay() }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1)
  ];
  return (
    <Card className="student-calendar">
      <div className="student-card-heading">
        <h3>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
        <Clock3 aria-hidden="true" />
      </div>
      <div className="student-calendar-grid" role="grid">
        {Array.from({ length: 7 }, (_, index) => (
          <span className="student-calendar-label" key={index} role="columnheader">
            {new Date(2026, 5, index).toLocaleDateString(undefined, { weekday: "narrow" })}
          </span>
        ))}
        {cells.map((day, index) => {
          const iso = day
            ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : "";
          return (
            <span
              aria-label={
                day ? `${iso}${active.has(iso) ? ", activity scheduled" : ""}` : undefined
              }
              className={active.has(iso) ? "is-active" : ""}
              key={`${day ?? "blank"}-${index}`}
              role="gridcell"
            >
              {day}
            </span>
          );
        })}
      </div>
    </Card>
  );
}

export const quickActionIcons = {
  calendar: <CalendarClock aria-hidden="true" />,
  learning: <BookOpen aria-hidden="true" />,
  target: <Target aria-hidden="true" />
};
