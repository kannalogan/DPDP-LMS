import type { QuestionType } from "@/features/question-authoring/types";
import { questionTypes } from "@/features/question-authoring/workflow";

export function isSupportedQuestionType(type: string): type is QuestionType {
  return questionTypes.includes(type as QuestionType);
}

export function validateQuestionImportRows(rows: Array<Record<string, unknown>>) {
  return {
    duplicates: 0,
    invalid: rows.filter((row) => !isSupportedQuestionType(String(row.type ?? ""))).length,
    total: rows.length,
    valid: rows.filter((row) => isSupportedQuestionType(String(row.type ?? ""))).length
  };
}

export function normalizePromptText(prompt: unknown) {
  if (!prompt || typeof prompt !== "object" || Array.isArray(prompt)) return "";
  const value = (prompt as Record<string, unknown>).text;
  return typeof value === "string" ? value.trim() : "";
}
