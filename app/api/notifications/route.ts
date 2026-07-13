import { NextResponse } from "next/server";
import { canAccessNotifications, getNotificationWorkspace } from "@/features/notifications/server";
export async function GET() {
  if (!(await canAccessNotifications()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getNotificationWorkspace());
}
