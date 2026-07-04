import {
  CalendarWidget,
  StudentEmpty,
  StudentPageHeader,
  StudentPermissionError,
  StudentSection,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function CalendarPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  const dates = data.activities.map((item) => item.occurredAt);
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="See lessons, assessments, deadlines, reminders, and certificate events by date."
        eyebrow="Plan"
        title="Learning calendar"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      <CalendarWidget dates={dates} month={new Date()} />
      <StudentSection title="Upcoming">
        {dates.length ? null : (
          <StudentEmpty
            description="Scheduled learning activities will appear here."
            title="Nothing scheduled"
          />
        )}
      </StudentSection>
    </div>
  );
}
