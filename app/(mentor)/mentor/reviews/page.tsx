import { MentorPageHeader, MentorPermissionError, ReviewQueue } from "@/features/mentor/components";
import { canAccessMentorWorkspace, getMentorWorkspace } from "@/features/mentor/server";

export default async function MentorReviewsPage() {
  if (!(await canAccessMentorWorkspace())) return <MentorPermissionError />;
  const data = await getMentorWorkspace();
  return (
    <>
      <MentorPageHeader
        description="Resolve assigned learner reviews without exposing assessment internals."
        title="Reviews"
      />
      <ReviewQueue reviews={data?.reviews ?? []} />
    </>
  );
}
