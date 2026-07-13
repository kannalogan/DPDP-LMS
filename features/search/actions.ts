"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Route } from "next";
import {
  boostRuleSchema,
  recommendationEventSchema,
  recommendationRuleSchema,
  recentItemSchema,
  reindexSchema,
  savedSearchIdSchema,
  saveSearchSchema,
  searchClickSchema,
  synonymSchema
} from "@/features/search/schemas";
import { canManageSearch } from "@/features/search/permissions";
import { resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";
const invalid = (parsed: { error: { flatten(): { fieldErrors: Record<string, string[]> } } }) =>
  ({ fieldErrors: parsed.error.flatten().fieldErrors, success: false }) satisfies ActionResult;
const refresh = () => {
  for (const path of [
    "/search",
    "/search/saved",
    "/search/history",
    "/student/discover",
    "/student/recommendations",
    "/mentor/discover",
    "/admin/search"
  ])
    revalidatePath(path);
};
async function client(action: string) {
  await enforceServerActionSecurity(action, 30);
  return createSupabaseServerClient();
}
async function authorize(organizationId: string) {
  const identity = await resolveIdentityContext();
  return Boolean(
    identity?.organizationId === organizationId && (await canManageSearch(organizationId))
  );
}
async function savedMutation(
  formData: FormData,
  rpc: "delete_saved_search" | "pin_search" | "unpin_search",
  message: string
): Promise<ActionResult> {
  const parsed = savedSearchIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client(`search-${rpc}`)
  ).rpc(rpc, { p_saved_search_id: parsed.data.savedSearchId });
  if (error) return { error: "Saved search could not be updated.", success: false };
  refresh();
  return { message, success: true };
}
export async function saveSearch(formData: FormData): Promise<ActionResult> {
  const parsed = saveSearchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const identity = await resolveIdentityContext();
  if (identity?.organizationId !== parsed.data.organizationId)
    return { error: "Active organization required.", success: false };
  let filters: unknown = {};
  try {
    filters = JSON.parse(parsed.data.filters);
  } catch {
    return { error: "Search filters are invalid.", success: false };
  }
  const { error } = await (
    await client("search-save")
  ).rpc("save_search", {
    p_filters: filters,
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId,
    p_query: parsed.data.query,
    p_sort: parsed.data.sort
  });
  if (error) return { error: "Search could not be saved.", success: false };
  refresh();
  return { message: "Search saved.", success: true };
}
export const deleteSavedSearch = async (data: FormData) =>
  savedMutation(data, "delete_saved_search", "Saved search archived.");
export const pinSavedSearch = async (data: FormData) =>
  savedMutation(data, "pin_search", "Search pinned.");
export const unpinSavedSearch = async (data: FormData) =>
  savedMutation(data, "unpin_search", "Search unpinned.");
export async function openSearchResult(formData: FormData) {
  const parsed = searchClickSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await (
    await client("search-click")
  ).rpc("record_click", {
    p_result_position: parsed.data.position ?? null,
    p_search_document_id: parsed.data.documentId,
    p_search_history_id: parsed.data.historyId
  });
  redirect(parsed.data.routePath as Route);
}
export async function recordRecentItem(formData: FormData): Promise<ActionResult> {
  const parsed = recentItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const identity = await resolveIdentityContext();
  if (identity?.organizationId !== parsed.data.organizationId)
    return { error: "Active organization required.", success: false };
  const { error } = await (
    await client("search-recent")
  ).rpc("record_recent_item", {
    p_interaction_type: parsed.data.interactionType,
    p_organization_id: parsed.data.organizationId,
    p_search_document_id: parsed.data.documentId
  });
  return error
    ? { error: "Recent item could not be recorded.", success: false }
    : { message: "Recent item recorded.", success: true };
}
export async function recordRecommendationEvent(formData: FormData) {
  const parsed = recommendationEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await (
    await client("search-recommendation-event")
  ).rpc("record_recommendation_event", {
    p_event_type: parsed.data.eventType,
    p_recommendation_result_id: parsed.data.recommendationId
  });
  refresh();
  if (parsed.data.routePath && parsed.data.eventType === "opened")
    redirect(parsed.data.routePath as Route);
}
export async function reindexModule(formData: FormData): Promise<ActionResult> {
  const parsed = reindexSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "Search administration permission required.", success: false };
  const { error } = await (
    await client("search-reindex")
  ).rpc("reindex_module", {
    p_module_key: parsed.data.moduleKey,
    p_organization_id: parsed.data.organizationId
  });
  if (error) return { error: "Module reindex could not be queued.", success: false };
  refresh();
  return { message: "Module reindex version created.", success: true };
}
export async function saveSynonym(formData: FormData): Promise<ActionResult> {
  const parsed = synonymSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "Search administration permission required.", success: false };
  const { error } = await (
    await client("search-synonym")
  ).rpc("save_search_synonym", {
    p_locale: parsed.data.locale,
    p_organization_id: parsed.data.organizationId,
    p_synonyms: parsed.data.synonyms
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    p_term: parsed.data.term
  });
  if (error) return { error: "Synonym could not be saved.", success: false };
  refresh();
  return { message: "Synonym saved.", success: true };
}
export async function saveBoostRule(formData: FormData): Promise<ActionResult> {
  const parsed = boostRuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "Search administration permission required.", success: false };
  const { error } = await (
    await client("search-boost")
  ).rpc("save_search_boost_rule", {
    p_boost: parsed.data.boost,
    p_condition: {},
    p_entity_type: parsed.data.entityType ?? "",
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId
  });
  if (error) return { error: "Boost rule could not be saved.", success: false };
  refresh();
  return { message: "Boost rule saved.", success: true };
}
export async function saveRecommendationRule(formData: FormData): Promise<ActionResult> {
  const parsed = recommendationRuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "Search administration permission required.", success: false };
  const { error } = await (
    await client("search-recommendation-rule")
  ).rpc("save_recommendation_rule", {
    p_conditions: {},
    p_key: parsed.data.key,
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId,
    p_priority: parsed.data.priority,
    p_recommendation_type: parsed.data.recommendationType
  });
  if (error) return { error: "Recommendation rule could not be saved.", success: false };
  refresh();
  return { message: "Recommendation rule saved.", success: true };
}
