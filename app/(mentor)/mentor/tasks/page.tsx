import { MentorPageHeader, MentorPermissionError, TaskList } from "@/features/mentor/components";
import { canAccessMentorWorkspace, getMentorWorkspace } from "@/features/mentor/server";

export default async function MentorTasksPage() {
  if (!(await canAccessMentorWorkspace())) return <MentorPermissionError />;
  const data = await getMentorWorkspace();
  return (
    <>
      <MentorPageHeader
        description="Follow up learner support actions and open intervention tasks."
        title="Tasks"
      />
      <TaskList tasks={data?.tasks ?? []} />
    </>
  );
}
