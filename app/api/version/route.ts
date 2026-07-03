import { apiOk } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export function GET() {
  return apiOk({
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    service: "syra-learning-platform",
    version: process.env.npm_package_version ?? "0.1.0"
  });
}
