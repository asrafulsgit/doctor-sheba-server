import { z } from "zod";

const createReviewValidation = z.object({
  body: z.object({
    appointmentId: z
      .string({
        error: "Appointment ID is required",
      })
      .uuid("Appointment ID must be a valid UUID"),
    rating: z
      .number({
        error: "Rating is required",
      })
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot be more than 5"),
    comment: z
      .string({
        error: "Comment is required",
      })
      .trim()
      .min(1, "Comment cannot be empty"),
  }),
});

const getMyReviewsQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortOrder: z.string().optional(),
    sortBy: z.string().optional(),
  }),
});

export type CreateReviewInput = z.infer<typeof createReviewValidation>["body"];

export type GetMyReviewsQueryInput = z.infer<
  typeof getMyReviewsQueryValidation
>["query"];

export const reviewValidators = {
  createReviewValidation,
  getMyReviewsQueryValidation,
};
