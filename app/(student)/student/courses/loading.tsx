import { Skeleton } from "@/shared/ui/skeleton";

export default function CoursesLoading() {
  return (
    <div aria-label="Loading courses" className="student-workspace delivery-loading" role="status">
      <Skeleton className="h-16" />
      <Skeleton className="h-14" />
      <div className="delivery-course-grid">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
