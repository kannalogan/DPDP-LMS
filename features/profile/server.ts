import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, ThemePreference } from "@/types/identity";

export async function getProfile(profileId: string) {
  const client = await createSupabaseServerClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    client
      .from("profiles")
      .select("id,display_name,locale,timezone,avatar_object_id,status,version")
      .eq("id", profileId)
      .single(),
    client
      .from("user_settings")
      .select("theme,accessibility,learning,version")
      .eq("profile_id", profileId)
      .single()
  ]);
  return { profile: profile as Profile | null, settings };
}

export async function persistProfile(input: {
  displayName: string;
  emailNotifications: boolean;
  highContrast: boolean;
  locale: string;
  profileId: string;
  reduceMotion: boolean;
  theme: ThemePreference;
  timezone: string;
}) {
  const client = await createSupabaseServerClient();
  const { error: profileError } = await client
    .from("profiles")
    .update({
      display_name: input.displayName,
      locale: input.locale,
      timezone: input.timezone,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.profileId);
  if (profileError) throw profileError;

  const { error: settingsError } = await client.from("user_settings").upsert({
    accessibility: { highContrast: input.highContrast, reduceMotion: input.reduceMotion },
    learning: { emailNotifications: input.emailNotifications },
    profile_id: input.profileId,
    theme: input.theme,
    updated_at: new Date().toISOString()
  });
  if (settingsError) throw settingsError;
}
