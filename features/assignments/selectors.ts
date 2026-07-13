export function assignmentStatusTone(status: string) {
  if (["published", "finalized", "released", "graded"].includes(status)) return "success" as const;
  if (["returned", "resubmission_requested", "under_review"].includes(status))
    return "warning" as const;
  if (["archived", "rejected"].includes(status)) return "danger" as const;
  return "info" as const;
}
export function formatAssignmentDate(value: string | null) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}
