import { z } from "zod";

export const createHealthTipValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title cannot exceed 200 characters"),

    category: z
      .string()
      .trim()
      .min(2, "Category is required")
      .max(100, "Category cannot exceed 100 characters"),

    excerpt: z.string().trim().max(500, "Excerpt cannot exceed 500 characters"),

    content: z
      .string()
      .trim()
      .min(50, "Content must be at least 50 characters"),

    icon: z.string(),

    isPublished: z.boolean().optional(),
  }),
});

export const getHealthTipValidationQuery = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    category: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortOrder: z.string().optional(),
    sortBy: z.string().optional(),
  }),
});

export type CreateHealthTipInput = z.infer<
  typeof createHealthTipValidationSchema
>["body"];

export type GetHealthTipsQuery = z.infer<
  typeof getHealthTipValidationQuery
>["query"];

export const healthTibValidators = {
  createHealthTipValidationSchema,
  getHealthTipValidationQuery,
};
