import {
  AnnouncementComposer,
  AnnouncementList,
  MentorPageHeader,
  MentorPermissionError
} from "@/features/mentor/components";
import { canAccessMentorWorkspace, getMentorWorkspace } from "@/features/mentor/server";

export default async function MentorAnnouncementsPage() {
  if (!(await canAccessMentorWorkspace())) return <MentorPermissionError />;
  const data = await getMentorWorkspace();
  return (
    <>
      <MentorPageHeader
        description="Publish cohort-scoped mentor announcements through controlled server actions."
        title="Announcements"
      />
      <AnnouncementComposer />
      <AnnouncementList announcements={data?.announcements ?? []} />
    </>
  );
}
