import type { LearningDomain } from "@/types/domain";

export interface LearningTrackDefinition {
  slug: LearningDomain;
  name: string;
  description: string;
  regulatory?: boolean;
}

export const learningTrackRegistry: LearningTrackDefinition[] = [
  {
    slug: "dpdp",
    name: "DPDP Compliance",
    description: "India Digital Personal Data Protection Act readiness and operational training.",
    regulatory: true
  },
  {
    slug: "gdpr",
    name: "GDPR",
    description: "EU privacy compliance for global data handling teams.",
    regulatory: true
  },
  {
    slug: "cybersecurity",
    name: "Cybersecurity",
    description: "Security awareness, operational defense, and incident readiness."
  },
  {
    slug: "ai",
    name: "AI",
    description: "Responsible AI, governance, productivity, and technical enablement."
  }
];
