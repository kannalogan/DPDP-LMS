import type { ReactNode } from "react";
import { requireVerifiedUser } from "@/features/session/server";

export async function ProtectedRoute({ children }: { children: ReactNode }) {
  await requireVerifiedUser();
  return children;
}
