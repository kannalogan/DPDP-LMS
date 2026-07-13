const token = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;
export function renderNotificationTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return template.replace(token, (_, key: string) => String(values[key] ?? ""));
}
export function templateVariables(template: string) {
  return [...template.matchAll(token)]
    .map((match) => match[1])
    .filter((value, index, all) => all.indexOf(value) === index);
}
