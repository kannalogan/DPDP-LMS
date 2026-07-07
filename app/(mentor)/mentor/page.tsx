import { redirect } from "next/navigation";
import type { Route } from "next";

export default function MentorIndexPage() {
  redirect("/mentor/dashboard" as Route);
}
