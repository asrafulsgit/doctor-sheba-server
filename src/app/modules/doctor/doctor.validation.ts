import * as z from "zod";

const getAiSuggestedDoctorsValidationSchema = z.object({
  body: z.object({
    text: z.string().min(1, { message: "Input is required" }),
  }),
});

const getDoctorsQueryValidation = z.object({
  query: z.object({
    designation: z.string().optional(),
    minFee: z.string().optional(),
    maxFee: z.string().optional(),
    gender: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortOrder: z.string().optional(),
    sortBy: z.string().optional(),
    specialty: z.string().optional(),
  }),
});

export const doctorValidators = {
  getAiSuggestedDoctorsValidationSchema,
  getDoctorsQueryValidation
};
