import * as z from "zod";

const getAiSuggestedDoctorsValidationSchema = z.object({
  body: z.object({
    text: z.string().min(1, { message: "Input is required" }),
  }),
});

const updateDoctorValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ error: "Full name is required" })
      .min(1, "Full name is required")
      .max(100, "Full name must be at most 100 characters")
      .optional(),

    contactNumber: z
      .string()
      .min(10, "Contact number must be at least 10 digits")
      .max(20, "Contact number must be at most 20 characters")
      .optional(),

    address: z
      .string()
      .min(5, "Address must be at least 5 characters")
      .max(255, "Address must be at most 255 characters")
      .optional(),

    experience: z
      .number()
      .int("Experience must be a whole number")
      .min(0, "Experience cannot be negative")
      .max(60, "Experience cannot exceed 60 years")
      .optional(),

    gender: z
      .enum(["MALE", "FEMALE"], {
        error: "Gender is required",
      })
      .optional(),

    registrationNumber: z
      .string()
      .min(5, "Registration number must be at least 5 characters")
      .max(50, "Registration number must be at most 50 characters")
      .optional(),

    currentWorkingPlace: z
      .string({ error: "Current working place is required" })
      .min(2, "Current working place must be at least 2 characters")
      .max(150, "Current working place must be at most 150 characters")
      .optional(),

    designation: z
      .string({ error: "Designation is required" })
      .min(2, "Designation must be at least 2 characters")
      .max(100, "Designation must be at most 100 characters")
      .optional(),

    qualification: z
      .string({ error: "Qualification is required" })
      .min(2, "Qualification must be at least 2 characters")
      .max(255, "Qualification must be at most 255 characters")
      .optional(),
  }),
});

const paramValidation = z.object({
  params: z.object({
    id: z.string().trim().uuid("Invalid medical report ID."),
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

export type UpdateDoctorInput = z.infer<
  typeof updateDoctorValidationSchema
>["body"];

export const doctorValidators = {
  updateDoctorValidationSchema,
  getAiSuggestedDoctorsValidationSchema,
  getDoctorsQueryValidation,
  paramValidation,
};
