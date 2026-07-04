import {
  StudentEmpty,
  StudentPageHeader,
  StudentPermissionError,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function BookmarksPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Return to saved lessons and resources without searching again."
        eyebrow="Library"
        title="Bookmarks"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      {data.bookmarks.length ? null : (
        <StudentEmpty
          description="Bookmarks you create in future lesson and resource experiences will appear here."
          title="No bookmarks"
        />
      )}
    </div>
  );
}
