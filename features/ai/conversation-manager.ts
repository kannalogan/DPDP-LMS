const transitions: Record<string, readonly string[]> = {
  open: ["closed", "archived"],
  closed: ["archived"],
  expired: ["archived"],
  archived: []
};
export function canTransitionConversation(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}
