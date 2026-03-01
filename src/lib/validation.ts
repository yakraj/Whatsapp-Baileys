import { z } from "zod";

const mobileNumberRegex = /^\+?[1-9]?\d{9,14}$/;
const customerIdRegex = /^[a-zA-Z0-9_-]{3,64}$/;

export const requestConnectionSchema = z.object({
  customerId: z
    .string()
    .trim()
    .regex(
      customerIdRegex,
      "Use letters, numbers, underscore, or hyphen (3-64 chars)",
    ),
  customerName: z.string().trim().min(2).max(80),
  websiteUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const sendMessageSchema = z.object({
  mobileNumber: z
    .string()
    .trim()
    .regex(mobileNumberRegex, "Use a valid international number"),
  message: z.string().trim().min(1).max(2000),
  fileUrl: z.string().trim().url().optional().or(z.literal("")),
  fileName: z.string().trim().min(1).max(180).optional(),
  fileType: z.string().trim().max(120).optional(),
  fileSize: z.number().int().positive().optional(),
  connectionId: z.string().trim().uuid().optional().or(z.literal("")),
});

export const requestConnectionFormSchema = requestConnectionSchema.extend({
  websiteUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const sendMessageFormSchema = z.object({
  mobileNumber: z
    .string()
    .trim()
    .regex(mobileNumberRegex, "Use a valid international number"),
  message: z.string().trim().min(1).max(2000),
  connectionId: z.string().trim().uuid("Select a valid connection"),
  fileUrl: z.string().trim().url().optional().or(z.literal("")),
  file: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= 10 * 1024 * 1024,
      "Attachment must be <= 10MB",
    ),
});

export type RequestConnectionFormValues = z.infer<
  typeof requestConnectionFormSchema
>;
export type SendMessageFormValues = z.infer<typeof sendMessageFormSchema>;
