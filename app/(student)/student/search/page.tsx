import {
  StudentPageHeader,
  StudentPermissionError,
  StudentSearch,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function SearchPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Search courses, lessons, resources, bookmarks, and certificates."
        eyebrow="Find"
        title="Search learning"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      <StudentSearch
        bookmarks={data.bookmarks}
        certificates={data.certificates}
        courses={data.courses}
      />
    </div>
  );
}
