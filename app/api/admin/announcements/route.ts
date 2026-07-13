import { NextResponse } from "next/server";
import { canAccessNotifications, getNotificationWorkspace } from "@/features/notifications/server";
export async function GET() {
  if (!(await canAccessNotifications(true)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await getNotificationWorkspace(true);
  return NextResponse.json(data?.announcements ?? []);
}
