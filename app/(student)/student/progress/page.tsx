import {
  LearningStats,
  StudentEmpty,
  StudentPageHeader,
  StudentPermissionError,
  StudentSection,
  StudentServiceNotice
} from "@/features/student/components";
import { averageProgress } from "@/features/student/selectors";
import { requireStudentWorkspace } from "@/features/student/server";
import { Progress } from "@/shared/ui/feedback";

export default async function ProgressPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Understand course, module, lesson, track, skill, and assessment progress."
        eyebrow="Insights"
        title="Learning progress"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      <LearningStats
        activeCourses={data.courses.filter((item) => item.status === "in_progress").length}
        completion={averageProgress(data.courses)}
        studyMinutes={data.progress.studyMinutes}
      />
      <div className="student-home-grid">
        <StudentSection title="Track and assessment">
          <div className="student-progress-stack">
            <Progress label="Track progress" value={data.progress.trackProgress ?? 0} />
            <Progress label="Assessment progress" value={data.progress.assessmentProgress ?? 0} />
          </div>
        </StudentSection>
        <StudentSection title="Skills">
          {data.progress.skillProgress.length ? (
            data.progress.skillProgress.map((skill) => (
              <Progress key={skill.label} label={skill.label} value={skill.value} />
            ))
          ) : (
            <StudentEmpty
              description="Skill evidence will appear after mapped learning activity."
              title="No skill progress"
            />
          )}
        </StudentSection>
      </div>
      <StudentSection title="Course, module, and lesson progress">
        {data.courses.length ? null : (
          <StudentEmpty
            description="Progress detail becomes available when you begin an enrolled course."
            title="No progress recorded"
          />
        )}
      </StudentSection>
    </div>
  );
}
