"use client";

import { ErrorState } from "@/shared/ui/feedback";

export default function Error() {
  return (
    <ErrorState
      description="The certificate workspace could not be loaded. Try again after the service is available."
      title="Certificates unavailable"
    />
  );
}
