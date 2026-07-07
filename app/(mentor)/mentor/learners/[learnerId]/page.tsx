import { notFound } from "next/navigation";
import {
  ActivityFeed,
  LearnerProfilePanel,
  MentorPageHeader,
  MentorPermissionError
} from "@/features/mentor/components";
import { learnerRouteSchema } from "@/features/mentor/schemas";
import {
  canAccessMentorWorkspace,
  getMentorLearner,
  getMentorWorkspace
} from "@/features/mentor/server";

export default async function MentorLearnerPage({
  params
}: {
  params: Promise<{ learnerId: string }>;
}) {
  if (!(await canAccessMentorWorkspace())) return <MentorPermissionError />;
  const parsed = learnerRouteSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const [learner, data] = await Promise.all([
    getMentorLearner(parsed.data.learnerId),
    getMentorWorkspace()
  ]);
  if (!learner) notFound();
  return (
    <>
      <MentorPageHeader
        description="Mentor-safe learner profile with progress, risk, assessment and certificate summaries."
        title={learner.learnerDisplayName}
      />
      <LearnerProfilePanel learner={learner} />
      <ActivityFeed
        learners={data?.learners.filter((item) => item.learnerId === learner.learnerId) ?? []}
      />
    </>
  );
}
