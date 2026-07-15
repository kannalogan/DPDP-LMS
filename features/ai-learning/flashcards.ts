export function scheduleFlashcardReview(
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  current: { easeFactor: number; intervalDays: number; reviewCount: number }
) {
  const easeFactor = Math.max(
    1.3,
    current.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  const intervalDays =
    quality < 3
      ? 1
      : current.reviewCount === 0
        ? 1
        : current.reviewCount === 1
          ? 6
          : Math.max(1, Math.round(current.intervalDays * easeFactor));
  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    learningState: quality < 3 ? "difficult" : quality === 5 ? "known" : "learning",
    nextReviewAt: new Date(Date.now() + intervalDays * 86400000).toISOString()
  };
}
export function shuffleFlashcards<T>(cards: readonly T[], random = Math.random) {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}
