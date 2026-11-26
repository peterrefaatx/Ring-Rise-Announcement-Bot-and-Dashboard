import { z } from "zod";
import {
  MAX_ANNOUNCEMENT_NAME_LENGTH,
  validateAnnouncementTemplate,
} from "./template";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(80),
  password: z.string().min(1, "Password is required").max(200),
  rememberMe: z.boolean().optional().default(false),
});

export const createCallerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username may only contain letters, numbers, ., _, and -"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  role: z.enum(["ADMIN", "CALLER"]).default("CALLER"),
  announcementName: z
    .string()
    .trim()
    .min(1)
    .max(MAX_ANNOUNCEMENT_NAME_LENGTH)
    .optional(),
});

export const updateCallerSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  username: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username may only contain letters, numbers, ., _, and -")
    .optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "CALLER"]).optional(),
  status: z.enum(["ACTIVE", "DEACTIVATED"]).optional(),
  announcementName: z.string().trim().min(1).max(MAX_ANNOUNCEMENT_NAME_LENGTH).optional(),
  announcementTemplate: z
    .string()
    .superRefine((val, ctx) => {
      const check = validateAnnouncementTemplate(val);
      if (!check.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: check.error || "Invalid announcement template",
        });
      }
    })
    .optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const updateProfileSchema = z.object({
  announcementName: z
    .string()
    .trim()
    .min(1, "Announcement name is required")
    .max(MAX_ANNOUNCEMENT_NAME_LENGTH, `Max ${MAX_ANNOUNCEMENT_NAME_LENGTH} characters`),
  announcementTemplate: z.string().superRefine((val, ctx) => {
    const check = validateAnnouncementTemplate(val);
    if (!check.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: check.error || "Invalid announcement template",
      });
    }
  }),
});

export const createCampaignSchema = z.object({
  name: z.string().trim().min(2, "Campaign name is required").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  dailyTarget: z.coerce
    .number()
    .int("Daily target must be a whole number")
    .min(1, "Daily target must be at least 1")
    .max(100000),
  status: z.enum(["ACTIVE", "PAUSED"]).default("ACTIVE"),
});

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  dailyTarget: z.coerce.number().int().min(1).max(100000).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});

export const announceLeadSchema = z.object({
  campaignId: z.string().trim().min(1, "Please select an active campaign"),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, "Invalid request key")
    .max(128),
});

export const updateSettingsSchema = z.object({
  brandName: z.string().trim().min(1).max(80).optional(),
  brandTagline: z.string().trim().max(120).optional(),
  brandPrimaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Primary color must be a valid hex color (e.g. #1D4ED8)")
    .optional(),
  brandLogoUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (val) =>
        val === "" ||
        val.startsWith("/") ||
        val.startsWith("https://") ||
        val.startsWith("http://"),
      "Logo URL must be a relative path or http(s) URL"
    )
    .optional(),
  telegramChatId: z.string().trim().max(100).optional(),
  telegramBotToken: z.string().trim().max(200).optional(),
  clearTelegramBotToken: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
});
