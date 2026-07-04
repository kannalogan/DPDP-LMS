import {
  StudentEmpty,
  StudentPageHeader,
  StudentPermissionError,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function DownloadsPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Access authorized learning resources prepared for offline use."
        eyebrow="Resources"
        title="Downloads"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      {data.downloads.length ? null : (
        <StudentEmpty
          description="Downloadable resources will appear when course delivery is implemented."
          title="No downloads"
        />
      )}
    </div>
  );
}
