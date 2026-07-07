import { notFound } from "next/navigation";
import {
  CohortProgress,
  LearnerList,
  MentorPageHeader,
  MentorPermissionError
} from "@/features/mentor/components";
import { cohortRouteSchema } from "@/features/mentor/schemas";
import {
  canAccessMentorWorkspace,
  getMentorCohort,
  getMentorWorkspace
} from "@/features/mentor/server";

export default async function MentorCohortPage({
  params
}: {
  params: Promise<{ cohortId: string }>;
}) {
  if (!(await canAccessMentorWorkspace())) return <MentorPermissionError />;
  const parsed = cohortRouteSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const [cohort, data] = await Promise.all([
    getMentorCohort(parsed.data.cohortId),
    getMentorWorkspace()
  ]);
  if (!cohort) notFound();
  return (
    <>
      <MentorPageHeader
        description="Cohort progress, roster summaries, intervention load and risk posture."
        title={cohort.cohortName}
      />
      <CohortProgress cohort={cohort} />
      <LearnerList
        learners={data?.learners.filter((item) => item.cohortId === cohort.cohortId) ?? []}
      />
    </>
  );
}
