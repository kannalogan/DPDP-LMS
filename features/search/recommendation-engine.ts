import type { RecommendationDto } from "@/features/search/types";
const labels: Record<string, string> = {
  continue_learning: "Continue learning",
  pending_assignment: "Pending assignment",
  upcoming_assessment: "Upcoming assessment",
  recommended_certificate: "Recommended certificate",
  popular_learning: "Popular learning",
  frequently_viewed: "Frequently viewed",
  recently_updated: "Recently updated",
  role_based: "For your role",
  organization: "Recommended by your organization",
  notification_driven: "From your updates"
};
export const recommendationLabel = (type: string) => labels[type] ?? "Recommended";
export const activeRecommendations = (items: RecommendationDto[]) =>
  [...items].sort((a, b) => b.score - a.score).slice(0, 24);
export const recommendationsByType = (items: RecommendationDto[]) =>
  activeRecommendations(items).reduce<Record<string, RecommendationDto[]>>((groups, item) => {
    (groups[item.recommendationType] ??= []).push(item);
    return groups;
  }, {});
