"use client";
import { useCallback, useState } from "react";
import type { AiLearningRequestState } from "@/features/ai-learning/types";

export function useAiLearningRequest<TInput, TResult>(
  execute: (input: TInput) => Promise<TResult>
) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TResult | null>(null);
  const [state, setState] = useState<AiLearningRequestState>("idle");
  const run = useCallback(
    async (input: TInput) => {
      setError(null);
      setState("submitting");
      try {
        const value = await execute(input);
        setResult(value);
        setState("success");
        return value;
      } catch {
        setError("The AI learning request could not be completed.");
        setState("error");
        return null;
      }
    },
    [execute]
  );
  return { error, result, run, state };
}
