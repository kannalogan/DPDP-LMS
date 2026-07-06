import Link from "next/link";
import type { Route } from "next";
import { ContinueLearningBanner, CourseCatalogView } from "@/features/learning-delivery/components";
import { courseCatalogFiltersSchema } from "@/features/learning-delivery/schemas";
import {
  canAccessLearningDelivery,
  getContinueLearningTarget,
  getStudentCourseCatalog
} from "@/features/learning-delivery/server";
import { StudentPageHeader, StudentPermissionError } from "@/features/student/components";
import { Button } from "@/shared/ui/button";

export default async function CoursesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = courseCatalogFiltersSchema.safeParse({
    category: raw.category,
    query: raw.q,
    status: raw.status,
    track: raw.track
  });
  const filters = parsed.success ? parsed.data : {};
  if (!(await canAccessLearningDelivery())) return <StudentPermissionError />;
  const [courses, continueTarget] = await Promise.all([
    getStudentCourseCatalog(filters),
    getContinueLearningTarget()
  ]);
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Browse published learning available to your organization."
        eyebrow="Learning catalog"
        title="Courses"
      />
      {continueTarget ? (
        <ContinueLearningBanner>
          <Button asChild>
            <Link
              href={
                `/student/courses/${continueTarget.courseSlug}/lessons/${continueTarget.lessonSlug}` as Route
              }
            >
              Continue
            </Link>
          </Button>
        </ContinueLearningBanner>
      ) : null}
      <CourseCatalogView courses={courses} filters={filters} />
    </div>
  );
}
