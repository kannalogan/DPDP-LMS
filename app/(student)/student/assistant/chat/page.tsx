import { AiLearningRouteView } from "@/features/ai-learning/components/route-view";
export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const sessionId = (await searchParams).session;
  return <AiLearningRouteView access="student" mode="chat" {...(sessionId ? { sessionId } : {})} />;
}
