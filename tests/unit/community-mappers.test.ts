import { describe, expect, it } from "vitest";
import {
  mapChatConversation,
  mapChatMessage,
  mapCommunitySpace,
  mapDiscussionPost,
  mapDiscussionTopic,
  mapLiveSession,
  mapModerationReport,
  mapOfficeHour,
  mapStudyGroup
} from "@/features/community/mappers";
describe("community DTO mapping", () => {
  it("maps community aggregate counts", () => {
    expect(
      mapCommunitySpace({ member_count: "8", name: "Privacy", space_id: "s", topic_count: 3 })
    ).toMatchObject({ id: "s", memberCount: 8, topicCount: 3 });
  });
  it("maps topic and solved state", () => {
    expect(
      mapDiscussionTopic({
        author_profile_id: "p",
        id: "t",
        is_pinned: true,
        solved_post_id: "answer"
      })
    ).toMatchObject({ id: "t", isPinned: true, solvedPostId: "answer" });
  });
  it("maps nested discussion posts", () => {
    expect(
      mapDiscussionPost({
        author_profile_id: "p",
        body: "Body",
        id: "post",
        parent_post_id: "root"
      })
    ).toMatchObject({ body: "Body", parentPostId: "root" });
  });
  it("maps conversation unread and archive state", () => {
    expect(
      mapChatConversation({
        archived_at: "2026-01-01",
        channel_type: "direct",
        id: "c",
        unread_count: "4"
      })
    ).toMatchObject({ archived: true, type: "direct", unreadCount: 4 });
  });
  it("maps message evidence", () => {
    expect(
      mapChatMessage({ body: "Hello", id: "m", is_pinned: true, sender_profile_id: "p" })
    ).toMatchObject({ body: "Hello", isPinned: true, senderId: "p" });
  });
  it("maps live session aggregates", () => {
    expect(
      mapLiveSession({ attended_count: 7, participant_count: 9, provider: "zoom", session_id: "l" })
    ).toMatchObject({ attendedCount: 7, id: "l", participantCount: 9 });
  });
  it("maps office hours and study groups", () => {
    expect(mapOfficeHour({ capacity: 2, id: "o", meeting_provider: null })).toMatchObject({
      capacity: 2,
      provider: null
    });
    expect(mapStudyGroup({ capacity: 10, id: "g", name: "Peers" })).toMatchObject({
      id: "g",
      name: "Peers"
    });
  });
  it("maps moderation targets without leaking rows", () => {
    expect(mapModerationReport({ id: "r", post_id: "post", reason: "spam" })).toMatchObject({
      targetId: "post",
      reason: "spam"
    });
  });
});
