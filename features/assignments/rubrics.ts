export function rubricWeightsAreValid(criteria: Array<{ weight: number }>) {
  return Math.abs(criteria.reduce((sum, item) => sum + item.weight, 0) - 100) < 0.01;
}
export function rubricLevelRangeIsValid(levels: Array<{ min: number; max: number }>) {
  return levels.every((level) => level.min >= 0 && level.max >= level.min);
}
