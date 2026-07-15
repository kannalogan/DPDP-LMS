import { CommunityRouteView } from "@/features/community/components/route-view";
export default async function Page({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  return <CommunityRouteView access="student" entityId={topicId} mode="topic" />;
}
