export function calculateQuizScore(correctCount: number, questionCount: number) {
  if (!Number.isInteger(correctCount) || !Number.isInteger(questionCount) || questionCount <= 0)
    return 0;
  return Number(
    ((Math.max(0, Math.min(correctCount, questionCount)) / questionCount) * 100).toFixed(2)
  );
}
export function retryIncorrectQuestionIds(
  questionIds: readonly string[],
  correctQuestionIds: ReadonlySet<string>
) {
  return questionIds.filter((id) => !correctQuestionIds.has(id));
}
