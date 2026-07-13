import "server-only";
import { cache } from "react";
import { parseAiServerConfig } from "@/features/ai/secrets/schema";

export const getAiServerConfig = cache(() => parseAiServerConfig(process.env));
