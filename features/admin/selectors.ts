export function adminStatusTone(status: string) {
  if (["active", "published"].includes(status)) return "success" as const;
  if (["pending", "scheduled", "draft"].includes(status)) return "warning" as const;
  if (["suspended", "revoked", "failed"].includes(status)) return "danger" as const;
  return "neutral" as const;
}

export function formatAdminDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value)
  );
}
