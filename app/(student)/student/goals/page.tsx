import {
  GoalCard,
  StudentEmpty,
  StudentPageHeader,
  StudentPermissionError,
  StudentSection,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function GoalsPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Keep daily, weekly, monthly, study-hour, and completion targets visible."
        eyebrow="Focus"
        title="Learning goals"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      <StudentSection title="Active goals">
        {data.goals.length ? (
          <div className="student-card-grid">
            {data.goals.map((goal) => (
              <GoalCard goal={goal} key={goal.goalId} />
            ))}
          </div>
        ) : (
          <StudentEmpty
            description="Goal creation will be enabled with the approved study plan service."
            title="No goals"
          />
        )}
      </StudentSection>
    </div>
  );
}
