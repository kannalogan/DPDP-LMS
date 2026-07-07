import { z } from "zod";

export const certificateIdSchema = z.object({
  certificateId: z.string().uuid()
});

export const verificationCodeSchema = z.object({
  verificationCode: z.string().trim().min(24).max(256)
});

export const certificateDownloadSchema = z.object({
  certificateId: z.string().uuid(),
  requestId: z.string().trim().min(8).max(160)
});

export const certificateIssueSchema = z.object({
  certificateNumber: z.string().trim().min(6).max(80),
  eligibilityRecordId: z.string().uuid(),
  publicToken: z.string().trim().min(32).max(256),
  templateVersionId: z.string().uuid()
});

export const certificateRevokeSchema = z.object({
  certificateId: z.string().uuid(),
  evidence: z.record(z.string(), z.unknown()).default({}),
  reason: z.string().trim().min(2).max(500),
  reasonCode: z
    .string()
    .trim()
    .regex(/^[a-z0-9_.-]{2,80}$/)
});
