"use client";
import { useState } from "react";
export function useCommunityDraft(initialValue = "") {
  const [value, setValue] = useState(initialValue);
  return { clear: () => setValue(""), isDirty: value !== initialValue, setValue, value };
}
