import { describe, expect, it } from "vitest";
import {
  mapAiLearningDashboard,
  mapAiLearningMessage,
  mapAiLearningRecommendation,
  mapAiLearningSession,
  mapAiMentorStudentInsight
} from "@/features/ai-learning/mappers";
const decrypt = async (value: string) => `plain:${value}`;
describe("AI learning DTO mapping", () => {
  it("decrypts session titles without leaking raw rows", async () => {
    const dto = await mapAiLearningSession(
      {
        conversation_id: "c",
        expires_at: "x",
        id: "s",
        is_pinned: true,
        last_active_at: "l",
        session_type: "tutor",
        started_at: "a",
        status: "open",
        title_ciphertext: "cipher"
      },
      decrypt
    );
    expect(dto.title).toBe("plain:cipher");
    expect(dto).not.toHaveProperty("title_ciphertext");
  });
  it("maps encrypted conversation messages", async () => {
    await expect(
      mapAiLearningMessage(
        {
          content_ciphertext: "secret",
          created_at: "now",
          id: "m",
          role: "assistant",
          sequence_no: 2
        },
        decrypt
      )
    ).resolves.toMatchObject({ content: "plain:secret", role: "assistant", sequenceNo: 2 });
  });
  it("maps empty dashboard values safely", () => {
    expect(mapAiLearningDashboard()).toEqual({
      activeGoals: 0,
      activePlans: 0,
      activeRecommendations: 0,
      cardsDue: 0,
      lastActiveAt: null,
      openSessions: 0,
      pinnedSessions: 0
    });
  });
  it("maps recommendation confidence and encrypted copy", async () => {
    await expect(
      mapAiLearningRecommendation(
        {
          confidence: "0.8",
          created_at: "now",
          id: "r",
          priority: 10,
          reason_ciphertext: "reason",
          recommendation_type: "revision",
          status: "active",
          target_id: null,
          target_type: "course",
          title_ciphertext: "title"
        },
        decrypt
      )
    ).resolves.toMatchObject({ confidence: 0.8, reason: "plain:reason", title: "plain:title" });
  });
  it("maps mentor insight metadata without learner content", () => {
    expect(
      mapAiMentorStudentInsight({
        active_recommendations: 2,
        highest_risk: "0.75",
        last_active_at: null,
        open_weaknesses: 3,
        profile_id: "p",
        session_count: 4
      })
    ).toEqual({
      activeRecommendations: 2,
      highestRisk: 0.75,
      lastActiveAt: null,
      openWeaknesses: 3,
      profileId: "p",
      sessionCount: 4
    });
  });
});
