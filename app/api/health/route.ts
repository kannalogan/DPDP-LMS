import { apiOk } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export function GET() {
  return apiOk({
    service: "syra-learning-platform",
    status: "ok",
    timestamp: new Date().toISOString()
  });
}
