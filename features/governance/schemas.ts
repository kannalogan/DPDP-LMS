import { z } from "zod";

const uuid = z.string().uuid();
const key = z
  .string()
  .trim()
  .regex(/^[A-Z0-9.-]+$/)
  .max(100);
const title = z.string().trim().min(1).max(200);

export const createControlSchema = z.object({
  category: z.string().trim().min(1).max(100),
  controlKey: key,
  objective: z.string().trim().min(1).max(10000),
  organizationId: uuid,
  title
});
export const startAuditSchema = z.object({
  organizationId: uuid,
  scope: z.string().trim().min(1).max(5000),
  startsAt: z.string().datetime().optional(),
  title
});
export const createPolicySchema = z.object({
  category: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(50000),
  organizationId: uuid,
  policyKey: key,
  title
});
export const createRiskSchema = z.object({
  categoryId: z.union([uuid, z.literal("")]).optional(),
  description: z.string().trim().min(1).max(10000),
  impact: z.coerce.number().int().min(1).max(5),
  likelihood: z.coerce.number().int().min(1).max(5),
  organizationId: uuid,
  title
});
export const privacyRequestSchema = z.object({
  details: z.string().trim().max(10000).optional(),
  organizationId: z.union([uuid, z.literal("")]).optional(),
  requestType: z.enum(["access", "correction", "erasure", "grievance", "consent_withdrawal"])
});
export const policyAcknowledgementSchema = z.object({
  acknowledgementHash: z.string().regex(/^[a-f0-9]{64}$/),
  policyVersionId: uuid
});
export const recordEvidenceSchema = z.object({
  controlId: uuid,
  description: z.string().trim().min(1).max(10000),
  evidenceHash: z.string().regex(/^[a-f0-9]{64}$/),
  evidenceType: z.string().trim().min(1).max(100),
  title
});
export const findingResolutionSchema = z.object({
  findingId: uuid,
  resolutionSummary: z.string().trim().min(1).max(10000)
});
export const retentionJobSchema = z.object({ policyId: uuid });
