import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  locale: z.string().regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/),
  timezone: z.string().trim().min(1).max(64),
  theme: z.enum(["system", "light", "dark"]),
  highContrast: z.coerce.boolean().default(false),
  reduceMotion: z.coerce.boolean().default(false),
  emailNotifications: z.coerce.boolean().default(true)
});
