export type RankingInput = {
  boost?: number;
  clicks?: number;
  exactTitle?: boolean;
  lexical: number;
  popularity?: number;
  prefixTitle?: boolean;
  updatedAt?: string;
};
export function calculateSearchRank(input: RankingInput) {
  const recency = input.updatedAt
    ? Math.max(
        0,
        1 - (Date.now() - new Date(input.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 365)
      )
    : 0;
  return (
    input.lexical * 10 +
    (input.exactTitle ? 8 : 0) +
    (input.prefixTitle ? 4 : 0) +
    Math.log1p(input.popularity ?? 0) +
    Math.log1p(input.clicks ?? 0) +
    recency +
    (input.boost ?? 1)
  );
}
export function stableSearchSort<
  T extends { entityId: string; entityType: string; rankScore: number }
>(items: T[]) {
  return [...items].sort(
    (a, b) =>
      b.rankScore - a.rankScore ||
      a.entityType.localeCompare(b.entityType) ||
      a.entityId.localeCompare(b.entityId)
  );
}
