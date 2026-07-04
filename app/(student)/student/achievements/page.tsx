import { AchievementCard } from "@/shared/components/learning";
import {
  ProfileSummary,
  StudentEmpty,
  StudentPageHeader,
  StudentPermissionError,
  StudentSection,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function AchievementsPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Review earned badges, XP, level, rank, and verified achievements."
        eyebrow="Recognition"
        title="Achievements"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      <ProfileSummary profile={data.profile} />
      <StudentSection title="Earned achievements">
        {data.achievements.length ? (
          <div className="student-card-grid">
            {data.achievements.map((item) => (
              <AchievementCard
                description={item.description}
                key={item.achievementId}
                title={item.title}
              />
            ))}
          </div>
        ) : (
          <StudentEmpty
            description="Verified achievements will appear as you meet published criteria."
            title="No achievements"
          />
        )}
      </StudentSection>
    </div>
  );
}
