import { notFound } from "next/navigation";
import { ProfileCompletionForm } from "@/features/profile/components/profile-completion-form";
import { AvatarUploadForm } from "@/features/profile/components/avatar-upload-form";
import { getProfile } from "@/features/profile/server";
import { requireVerifiedUser } from "@/features/session/server";

export default async function ProfilePage() {
  const user = await requireVerifiedUser();
  const { profile, settings } = await getProfile(user.id);
  if (!profile) notFound();
  return (
    <section className="account-section" aria-labelledby="profile-title">
      <div>
        <p className="identity-eyebrow">Identity</p>
        <h1 id="profile-title">Profile and preferences</h1>
        <p>
          Keep your account presentation, language, timezone, and accessibility preferences current.
        </p>
      </div>
      <div className="account-form">
        <ProfileCompletionForm profile={profile} settings={settings} />
        <hr className="form-divider" />
        <AvatarUploadForm />
      </div>
    </section>
  );
}
