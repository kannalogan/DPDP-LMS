import {
  LearnerList,
  MentorPageHeader,
  MentorPermissionError,
  MentorSearchAndFilters
} from "@/features/mentor/components";
import { canAccessMentorWorkspace, getMentorWorkspace } from "@/features/mentor/server";

export default async function MentorLearnersPage() {
  if (!(await canAccessMentorWorkspace())) return <MentorPermissionError />;
  const data = await getMentorWorkspace();
  return (
    <>
      <MentorPageHeader
        description="Review assigned learner progress, risk indicators, assessment workload and certificate milestones."
        title="Learners"
      />
      <MentorSearchAndFilters />
      <LearnerList learners={data?.learners ?? []} />
    </>
  );
}
