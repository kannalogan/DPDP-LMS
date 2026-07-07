import {
  MentorDashboard,
  MentorPageHeader,
  MentorPermissionError
} from "@/features/mentor/components";
import { canAccessMentorWorkspace, getMentorWorkspace } from "@/features/mentor/server";

export default async function MentorDashboardPage() {
  if (!(await canAccessMentorWorkspace())) return <MentorPermissionError />;
  const data = await getMentorWorkspace();
  if (!data) return <MentorPermissionError />;
  return (
    <>
      <MentorPageHeader
        description="Monitor assigned cohorts, learner risk, reviews, interventions, assessments and certificates."
        title="Dashboard"
      />
      <MentorDashboard data={data} />
    </>
  );
}
