export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { parseAiServerConfig } = await import("@/features/ai/secrets/schema");
    parseAiServerConfig(process.env);
  }
}
