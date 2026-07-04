"use server";

import { profileSchema } from "@/features/profile/schemas";
import { persistProfile } from "@/features/profile/server";
import { requireVerifiedUser, resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, success: false };
  try {
    const request = await enforceServerActionSecurity("profile-update", 12);
    const user = await requireVerifiedUser();
    await persistProfile({ ...parsed.data, profileId: user.id });
    const context = await resolveIdentityContext();
    const client = await createSupabaseServerClient();
    await client.rpc("syra_record_identity_audit", {
      action: "profile.updated",
      correlation_id: request.correlationId,
      metadata: { fields: ["display_name", "locale", "timezone", "preferences"] },
      organization_id: context?.organizationId ?? null,
      resource_id: user.id,
      resource_type: "profile"
    });
    return { message: "Profile saved.", success: true };
  } catch {
    return { error: "Your profile could not be saved.", success: false };
  }
}

export async function uploadAvatar(formData: FormData): Promise<ActionResult> {
  try {
    await enforceServerActionSecurity("avatar-upload", 6);
    const user = await requireVerifiedUser();
    const context = await resolveIdentityContext();
    if (!context?.organizationId)
      return { error: "Select an organization before uploading an avatar.", success: false };
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0)
      return { error: "Choose an image to upload.", success: false };
    if (file.size > 2_097_152 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return { error: "Use a JPEG, PNG, or WebP image up to 2 MB.", success: false };
    }

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const objectPath = `${context.organizationId}/avatar/${user.id}/${crypto.randomUUID()}.${extension}`;
    const client = await createSupabaseServerClient();
    const { error: uploadError } = await client.storage.from("avatars").upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });
    if (uploadError) return { error: "Avatar upload failed.", success: false };

    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const checksum = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    const { data: object, error: metadataError } = await client
      .from("storage_objects")
      .insert({
        bucket: "avatars",
        bytes: file.size,
        classification: "P2",
        content_type: file.type,
        object_path: objectPath,
        organization_id: context.organizationId,
        owner_profile_id: user.id,
        scan_status: "pending",
        sha256: checksum
      })
      .select("id")
      .single();
    if (metadataError || !object) {
      await client.storage.from("avatars").remove([objectPath]);
      return { error: "Avatar metadata could not be secured.", success: false };
    }

    const { error: profileError } = await client
      .from("profiles")
      .update({ avatar_object_id: object.id })
      .eq("id", user.id);
    if (profileError)
      return { error: "Avatar could not be linked to your profile.", success: false };
    return { message: "Avatar uploaded and queued for security scanning.", success: true };
  } catch {
    return { error: "Avatar upload failed.", success: false };
  }
}
