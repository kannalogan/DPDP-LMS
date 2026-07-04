import {
  LearningLibrary,
  StudentPageHeader,
  StudentPermissionError,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function MyLearningPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Find assigned, active, completed, bookmarked, and recently viewed learning."
        eyebrow="Library"
        title="My learning"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      <LearningLibrary courses={data.courses} />
    </div>
  );
}
