import { CommunityRouteView } from "@/features/community/components/route-view";
export default async function Page({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <CommunityRouteView access="student" entityId={conversationId} mode="conversation" />;
}
