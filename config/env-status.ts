import { z } from "zod";

const requiredRuntimeEnv = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url()
});

export function getEnvironmentStatus() {
  const result = requiredRuntimeEnv.safeParse(process.env);

  if (result.success) {
    return {
      missing: [],
      ready: true
    };
  }

  return {
    missing: result.error.issues.map((issue) => issue.path.join(".")),
    ready: false
  };
}
