export function calculateRubricScore(scores: Array<{ score: number; weight: number }>) {
  const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
  return totalWeight === 0
    ? 0
    : Math.round(
        (scores.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight) * 100
      ) / 100;
}
export function gradeIsReleasable(status: string, score: number | null) {
  return status === "finalized" && score !== null && score >= 0;
}
