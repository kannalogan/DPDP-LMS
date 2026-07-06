import {
  StudentPageHeader,
  StudentPermissionError,
  StudentSearch,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace, searchStudentLearning } from "@/features/student/server";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim().slice(0, 120) ?? "";
  const [data, results] = await Promise.all([
    requireStudentWorkspace(),
    query.length >= 2 ? searchStudentLearning(query) : Promise.resolve([])
  ]);
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Search courses, lessons, resources, bookmarks, and certificates."
        eyebrow="Find"
        title="Search learning"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      <StudentSearch query={query} results={results} />
    </div>
  );
}
