import {
  ActivityCard,
  StudentEmpty,
  StudentPageHeader,
  StudentPermissionError,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function ActivityPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Review recent lessons, progress events, reminders, and certificate activity."
        eyebrow="History"
        title="Recent activity"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      {data.activities.length ? (
        <div className="student-activity-list">
          {data.activities.map((item) => (
            <ActivityCard activity={item} key={item.activityId} />
          ))}
        </div>
      ) : (
        <StudentEmpty
          description="Your verified learning activity will appear here."
          title="No activity"
        />
      )}
    </div>
  );
}
