import { Skeleton } from "@/shared/ui/skeleton";

export default function AssessmentsLoading() {
  return (
    <div
      aria-label="Loading assessments"
      className="student-workspace assessment-loading"
      role="status"
    >
      <Skeleton className="h-16" />
      <div className="assessment-catalog">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
