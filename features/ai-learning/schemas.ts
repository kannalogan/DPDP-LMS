import { z } from "zod";
import {
  aiLearningSessionTypes,
  type AiLearningDifficulty,
  type AiLearningSourceType
} from "@/features/ai-learning/types";

export const aiLearningDifficultySchema = z.enum([
  "introductory",
  "intermediate",
  "advanced",
  "adaptive"
]);
export const aiLearningSourceSchema = z.object({
  sourceId: z.string().uuid(),
  sourceType: z.enum(["lesson", "module", "course", "assignment", "assessment"])
});
export const createLearningSessionSchema = z.object({
  courseId: z.string().uuid().nullable().default(null),
  lessonId: z.string().uuid().nullable().default(null),
  moduleId: z.string().uuid().nullable().default(null),
  organizationId: z.string().uuid(),
  retentionDays: z.coerce.number().int().min(1).max(365).default(30),
  sessionType: z.enum(aiLearningSessionTypes),
  title: z.string().trim().min(1).max(160)
});
export const aiLearningChatSchema = z.object({
  idempotencyKey: z.string().trim().min(16).max(200),
  message: z.string().trim().min(1).max(12000),
  sessionId: z.string().uuid()
});
export const aiLearningGenerationSchema = aiLearningSourceSchema.extend({
  count: z.coerce.number().int().min(1).max(50).default(12),
  difficulty: aiLearningDifficultySchema.default("adaptive"),
  idempotencyKey: z.string().trim().min(16).max(200),
  kind: z.enum([
    "explanation",
    "summary",
    "flashcards",
    "quiz",
    "learning_plan",
    "revision_plan",
    "recommendations",
    "insights"
  ]),
  prompt: z.string().trim().min(1).max(12000),
  sessionId: z.string().uuid()
});
export const aiLearningFeedbackSchema = z.object({
  comment: z.string().trim().max(2000).default(""),
  helpful: z.boolean(),
  rating: z.number().int().min(1).max(5),
  reasonCodes: z
    .array(z.string().regex(/^[a-z][a-z0-9_.-]{0,99}$/))
    .max(10)
    .default([]),
  sessionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  subjectType: z.string().regex(/^[a-z][a-z0-9_.-]{0,99}$/)
});
export const aiLearningPreferencesSchema = z.object({
  allowLearningMemory: z.boolean(),
  contentFormats: z.array(z.enum(["text", "examples", "steps", "visual_outline"])).min(1),
  explanationDepth: z.enum(["concise", "balanced", "detailed"]),
  flashcardBatchSize: z.number().int().min(1).max(100),
  learningStyle: z.enum(["adaptive", "visual", "reading", "practice", "mixed"]),
  organizationId: z.string().uuid(),
  preferredDifficulty: aiLearningDifficultySchema,
  quizQuestionTypes: z
    .array(z.enum(["mcq", "multiple_select", "true_false", "short_answer", "scenario"]))
    .min(1),
  sessionMinutes: z.number().int().min(5).max(240)
});
export const flashcardOutputSchema = z.object({
  cards: z
    .array(
      z.object({
        back: z.string().min(1).max(4000),
        category: z.string().trim().min(1).max(100),
        difficulty: aiLearningDifficultySchema,
        explanation: z.string().max(4000).default(""),
        front: z.string().min(1).max(2000)
      })
    )
    .min(1)
    .max(100),
  title: z.string().min(1).max(160)
});
export const quizOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        answer: z.string().min(1).max(4000),
        difficulty: aiLearningDifficultySchema,
        explanation: z.string().min(1).max(4000),
        options: z.array(z.string().max(2000)).max(12).default([]),
        prompt: z.string().min(1).max(4000),
        questionType: z.enum(["mcq", "multiple_select", "true_false", "short_answer", "scenario"])
      })
    )
    .min(1)
    .max(100),
  title: z.string().min(1).max(160)
});
const planStepSchema = z.object({
  description: z.string().min(1).max(4000),
  estimatedMinutes: z.number().int().min(0).max(1440),
  priority: z.number().int().min(1).max(1000),
  scheduledFor: z.string().datetime().nullable(),
  targetId: z.string().uuid().nullable(),
  targetType: z
    .string()
    .regex(/^[a-z][a-z0-9_.-]{0,99}$/)
    .nullable(),
  title: z.string().min(1).max(300)
});
export const learningPlanOutputSchema = z.object({
  endsOn: z.string().date().nullable(),
  overview: z.string().min(1).max(8000),
  planType: z.enum(["daily", "weekly", "roadmap", "goal"]),
  startsOn: z.string().date().nullable(),
  steps: z.array(planStepSchema).min(1).max(100),
  title: z.string().min(1).max(160)
});
export const revisionPlanOutputSchema = z.object({
  endsOn: z.string().date(),
  rationale: z.string().min(1).max(8000),
  sessions: z
    .array(
      z.object({
        estimatedMinutes: z.number().int().min(0).max(1440),
        focus: z.string().min(1).max(4000),
        scheduledFor: z.string().datetime()
      })
    )
    .min(1)
    .max(100),
  startsOn: z.string().date(),
  title: z.string().min(1).max(160)
});
export const recommendationOutputSchema = z.object({
  recommendations: z
    .array(
      z.object({
        confidence: z.number().min(0).max(1).nullable(),
        expiresAt: z.string().datetime().nullable(),
        priority: z.number().int().min(1).max(1000),
        reason: z.string().min(1).max(4000),
        recommendationType: z.enum([
          "continue_learning",
          "revision",
          "assignment",
          "assessment",
          "certificate",
          "popular",
          "role_based",
          "organization",
          "risk_intervention"
        ]),
        targetId: z.string().uuid().nullable(),
        targetType: z.string().regex(/^[a-z][a-z0-9_.-]{0,99}$/),
        title: z.string().min(1).max(300)
      })
    )
    .max(50)
});
const insightItemSchema = z.object({
  conceptKey: z.string().regex(/^[A-Za-z][A-Za-z0-9_.:-]{0,199}$/),
  confidence: z.number().min(0).max(1),
  evidenceCount: z.number().int().min(1).max(100000).default(1),
  sourceId: z.string().uuid().nullable(),
  sourceType: z
    .string()
    .regex(/^[a-z][a-z0-9_.-]{0,99}$/)
    .nullable()
});
export const insightOutputSchema = z.object({
  strengths: z.array(insightItemSchema.extend({ score: z.number().min(0).max(1) })).max(100),
  weaknesses: z.array(insightItemSchema.extend({ severity: z.number().min(0).max(1) })).max(100)
});

export type AiLearningGenerationInput = z.infer<typeof aiLearningGenerationSchema>;
export type FlashcardOutput = z.infer<typeof flashcardOutputSchema>;
export type QuizOutput = z.infer<typeof quizOutputSchema>;
export type LearningPlanOutput = z.infer<typeof learningPlanOutputSchema>;
export type RevisionPlanOutput = z.infer<typeof revisionPlanOutputSchema>;
export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;
export type InsightOutput = z.infer<typeof insightOutputSchema>;
export type LearningSource = { sourceId: string; sourceType: AiLearningSourceType };
export type LearningDifficulty = AiLearningDifficulty;
