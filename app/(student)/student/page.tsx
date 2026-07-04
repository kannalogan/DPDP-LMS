import { Award, Bookmark, CalendarDays, Download, Target } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import {
  ContinueLearningCard,
  LearningStats,
  QuickActionCard,
  RecommendationCard,
  StudentEmpty,
  StudentPermissionError,
  StudentSection,
  StudentServiceNotice,
  WelcomeHeader,
  quickActionIcons
} from "@/features/student/components";
import { averageProgress, continueLearning, dueCourses } from "@/features/student/selectors";
import { requireStudentWorkspace } from "@/features/student/server";
import { CertificateCard } from "@/shared/components/learning";
import { Button } from "@/shared/ui/button";
import { MetricCard } from "@/shared/ui/data-display";

export default async function StudentHomePage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  const continuing = continueLearning(data.courses);
  const upcoming = dueCourses(data.courses, new Date());
  return (
    <div className="student-workspace">
      <WelcomeHeader profile={data.profile} />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      <LearningStats
        activeCourses={data.courses.filter((course) => course.status === "in_progress").length}
        completion={averageProgress(data.courses)}
        studyMinutes={data.progress.studyMinutes}
      />
      <div className="student-home-grid">
        <StudentSection
          action={<Link href={"/student/learning" as Route}>My learning</Link>}
          title="Continue learning"
        >
          {continuing.length ? (
            continuing
              .slice(0, 2)
              .map((course) => <ContinueLearningCard course={course} key={course.courseId} />)
          ) : (
            <StudentEmpty
              description="Courses you start will stay within easy reach here."
              title="Nothing in progress"
            />
          )}
        </StudentSection>
        <StudentSection
          action={<Link href={"/student/goals" as Route}>Manage goals</Link>}
          title="Today's goals"
        >
          {data.goals.filter((goal) => goal.period === "today").length ? null : (
            <StudentEmpty
              description="Set a daily learning target when goal services become available."
              title="No goals"
            />
          )}
        </StudentSection>
      </div>
      <StudentSection
        action={<Link href={"/student/calendar" as Route}>Open calendar</Link>}
        title="Upcoming activities"
      >
        {upcoming.length ? null : (
          <StudentEmpty
            description="Upcoming lessons, assessments, and deadlines will appear here."
            title="Nothing scheduled"
          />
        )}
      </StudentSection>
      <div className="student-progress-grid" aria-label="Learning momentum">
        <MetricCard label="Learning streak" value="—" />
        <MetricCard
          label="Weekly progress"
          value={
            data.progress.weeklyActiveMinutes === null
              ? "—"
              : `${data.progress.weeklyActiveMinutes} min`
          }
        />
        <MetricCard
          label="Monthly progress"
          value={
            data.progress.monthlyActiveMinutes === null
              ? "—"
              : `${data.progress.monthlyActiveMinutes} min`
          }
        />
      </div>
      <StudentSection title="Quick actions">
        <div className="student-quick-grid">
          <QuickActionCard
            description="Review enrolled courses"
            href="/student/learning"
            icon={quickActionIcons.learning}
            title="My learning"
          />
          <QuickActionCard
            description="Plan your next session"
            href="/student/calendar"
            icon={quickActionIcons.calendar}
            title="Calendar"
          />
          <QuickActionCard
            description="Review learning targets"
            href="/student/goals"
            icon={quickActionIcons.target}
            title="Goals"
          />
          <QuickActionCard
            description="Return to saved items"
            href="/student/bookmarks"
            icon={<Bookmark />}
            title="Bookmarks"
          />
          <QuickActionCard
            description="Access saved resources"
            href="/student/downloads"
            icon={<Download />}
            title="Downloads"
          />
          <QuickActionCard
            description="Review earned recognition"
            href="/student/achievements"
            icon={<Award />}
            title="Achievements"
          />
        </div>
      </StudentSection>
      <div className="student-home-grid">
        <StudentSection title="Recommended next">
          {data.recommendations.length ? (
            data.recommendations.map((item) => (
              <RecommendationCard item={item} key={item.recommendationId} />
            ))
          ) : (
            <StudentEmpty
              description="Recommendations will be grounded in your assigned courses and verified progress."
              title="No recommendations yet"
            />
          )}
        </StudentSection>
        <StudentSection title="Recent certificates">
          {data.certificates.length ? (
            data.certificates
              .slice(0, 2)
              .map((item) => (
                <CertificateCard
                  credential={item.status}
                  issuedAt={item.issuedAt}
                  key={item.certificateId}
                  title={item.courseTitle}
                />
              ))
          ) : (
            <StudentEmpty
              actionHref="/student/learning"
              actionLabel="View learning"
              description="Certificates will appear after eligible course completions."
              title="No certificates"
            />
          )}
        </StudentSection>
      </div>
      <Button asChild variant="ghost">
        <Link href={"/student/activity" as Route}>
          <CalendarDays />
          Review recent activity
        </Link>
      </Button>
      <span className="sr-only">
        <Target />
        Student learning home
      </span>
    </div>
  );
}
