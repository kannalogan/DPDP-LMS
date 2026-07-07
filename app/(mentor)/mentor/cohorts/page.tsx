import {
  CohortOverview,
  MentorPageHeader,
  MentorPermissionError
} from "@/features/mentor/components";
import { canAccessMentorWorkspace, getMentorWorkspace } from "@/features/mentor/server";

export default async function MentorCohortsPage() {
  if (!(await canAccessMentorWorkspace())) return <MentorPermissionError />;
  const data = await getMentorWorkspace();
  return (
    <>
      <MentorPageHeader
        description="Monitor assigned cohorts, roster-level progress, attention signals and review workload."
        title="Cohorts"
      />
      <CohortOverview cohorts={data?.cohorts ?? []} />
    </>
  );
}
