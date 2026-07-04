import {
  LearningTimelineList,
  StudentEmpty,
  StudentPageHeader,
  StudentPermissionError,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function TimelinePage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Completed lessons, upcoming lessons, assessment dates, certificates, and reminders in one sequence."
        eyebrow="Journey"
        title="Learning timeline"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      {data.activities.length ? (
        <LearningTimelineList activities={data.activities} />
      ) : (
        <StudentEmpty
          description="Your learning events will form a chronological record here."
          title="No activity"
        />
      )}
    </div>
  );
}
