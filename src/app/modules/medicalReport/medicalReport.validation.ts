import { z } from "zod";

const createMedicalReportValidation = z.object({
  body: z.object({
    reportName: z
      .string()
      .trim()
      .min(2, "Report name must be at least 2 characters")
      .max(200, "Report name cannot exceed 200 characters"),
  }),
});

const getMyMedicalReportsValidation = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.string().optional(),
  }),
});

const medicalReportParamValidation = z.object({
  params: z.object({
    id: z.string().trim().uuid("Invalid medical report ID."),
  }),
});

const updateMedicalReportValidation = z.object({
  params: z.object({
    id: z.string().trim().uuid("Invalid medical report ID."),
  }),
  body: z.object({
    reportName: z
      .string()
      .trim()
      .min(2, "Report name must be at least 2 characters")
      .max(200, "Report name cannot exceed 200 characters")
      .optional(),
  }),
});

export type CreateMedicalReportInput = z.infer<
  typeof createMedicalReportValidation
>["body"];

export type UpdateMedicalReportInput = z.infer<
  typeof updateMedicalReportValidation
>["body"];

export type GetMyMedicalReportsQuery = z.infer<
  typeof getMyMedicalReportsValidation
>["query"];

export const medicalReportValidators = {
  createMedicalReportValidation,
  getMyMedicalReportsValidation,
  medicalReportParamValidation,
  updateMedicalReportValidation,
};
