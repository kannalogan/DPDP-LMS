import { CommunityRouteView } from "@/features/community/components/route-view";
export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <CommunityRouteView access="student" entityId={sessionId} mode="live-session" />;
}
