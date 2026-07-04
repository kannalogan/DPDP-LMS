import { updateProfile } from "@/features/profile/actions";
import { ServerActionForm } from "@/features/auth/components/server-action-form";
import type { Profile, ThemePreference } from "@/types/identity";

export function ProfileCompletionForm({
  profile,
  settings
}: {
  profile: Profile;
  settings?: { accessibility?: unknown; learning?: unknown; theme?: ThemePreference } | null;
}) {
  const accessibility = (settings?.accessibility ?? {}) as {
    highContrast?: boolean;
    reduceMotion?: boolean;
  };
  const learning = (settings?.learning ?? {}) as { emailNotifications?: boolean };
  return (
    <ServerActionForm
      action={updateProfile}
      fields={[
        {
          defaultValue: profile.display_name,
          label: "Display name",
          name: "displayName",
          required: true
        },
        { defaultValue: profile.timezone, label: "Timezone", name: "timezone", required: true },
        { defaultValue: profile.locale, label: "Language", name: "locale", required: true },
        {
          defaultValue: settings?.theme ?? "system",
          label: "Theme",
          name: "theme",
          options: [
            { label: "Use system setting", value: "system" },
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" }
          ],
          required: true,
          type: "select"
        },
        {
          defaultValue: String(accessibility.highContrast ?? false),
          label: "Use high contrast",
          name: "highContrast",
          type: "checkbox"
        },
        {
          defaultValue: String(accessibility.reduceMotion ?? false),
          label: "Reduce motion",
          name: "reduceMotion",
          type: "checkbox"
        },
        {
          defaultValue: String(learning.emailNotifications ?? true),
          label: "Account email notifications",
          name: "emailNotifications",
          type: "checkbox"
        }
      ]}
      submitLabel="Save profile"
    />
  );
}
