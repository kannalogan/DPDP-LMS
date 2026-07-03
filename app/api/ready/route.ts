import { apiOk } from "@/lib/api/response";
import { getEnvironmentStatus } from "@/config/env-status";

export const dynamic = "force-dynamic";

export function GET() {
  const environment = getEnvironmentStatus();

  return apiOk(
    {
      checks: {
        application: "ready",
        environment: environment.ready ? "ready" : "missing_configuration"
      },
      missing: environment.missing,
      status: "ready",
      timestamp: new Date().toISOString()
    },
    { status: environment.ready ? 200 : 503 }
  );
}
