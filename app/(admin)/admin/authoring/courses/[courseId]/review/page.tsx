import {
  ApprovalPanel,
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  ReviewComments,
  WorkflowTimeline
} from "@/features/course-authoring/components";
import {
  canAccessAuthoringWorkspace,
  getAuthoringCourse,
  getAuthoringWorkspace
} from "@/features/course-authoring/server";

export default async function CourseReviewPage({
  params
}: {
  params: Promise<{ courseId: string }>;
}) {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  const { courseId } = await params;
  const [course, data] = await Promise.all([getAuthoringCourse(courseId), getAuthoringWorkspace()]);
  if (!data) return <AuthoringPermissionDenied />;
  return (
    <>
      <AuthoringPageHeader
        description="Review assignments, decision history, comments and approval state."
        title="Course review"
      />
      <div className="authoring-grid">
        <WorkflowTimeline course={course} />
        <ApprovalPanel reviews={data.reviews} />
        <ReviewComments reviews={data.reviews} />
      </div>
    </>
  );
}
