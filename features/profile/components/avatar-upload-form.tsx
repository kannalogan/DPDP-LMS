"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { uploadAvatar } from "@/features/profile/actions";
import type { ActionResult } from "@/types/identity";

export function AvatarUploadForm() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const { handleSubmit, register } = useForm<{ avatar: FileList }>();
  return (
    <form
      className="avatar-form"
      encType="multipart/form-data"
      onSubmit={handleSubmit(({ avatar }) => {
        const file = avatar.item(0);
        if (!file) return;
        const data = new FormData();
        data.set("avatar", file);
        startTransition(async () => setResult(await uploadAvatar(data)));
      })}
    >
      <label className="identity-field">
        <span>Profile image</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          required
          type="file"
          {...register("avatar")}
        />
      </label>
      <p className="field-hint">Private JPEG, PNG, or WebP. Maximum 2 MB.</p>
      <div aria-live="polite" className={result?.success ? "identity-success" : "identity-error"}>
        {result?.message ?? result?.error}
      </div>
      <Button disabled={pending} type="submit">
        {pending ? "Uploading" : "Upload avatar"}
      </Button>
    </form>
  );
}
