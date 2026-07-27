import { z } from "zod";

const medicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Medication name is required.")
    .max(100, "Medication name is too long."),

  dosage: z
    .string()
    .trim()
    .min(1, "Dosage is required.")
    .max(100, "Dosage is too long."),

  frequency: z
    .string()
    .trim()
    .min(1, "Frequency is required.")
    .max(100, "Frequency is too long."),

  duration: z
    .string()
    .trim()
    .min(1, "Duration is required.")
    .max(100, "Duration is too long."),
});

const createPrescriptionValidation = z.object({
  body: z.object({
    appointmentId: z.uuid("Invalid appointment ID."),
    diagnosis: z
      .string()
      .trim()
      .min(3, "Diagnosis must be at least 3 characters.")
      .max(100, "Diagnosis cannot exceed 100 characters."),

    instructions: z
      .string()
      .trim()
      .min(5, "Instructions must be at least 5 characters.")
      .max(1000, "Instructions cannot exceed 1000 characters."),

    followUpDate: z.iso.datetime("Invalid follow-up date.").optional(),

    medications: z
      .array(medicationSchema)
      .min(1, "At least one medication is required.")
      .max(50, "Too many medications."),
  }),
});

const updatePrescriptionValidation = z.object({
  body: z.object({
    appointmentId: z.uuid("Invalid appointment ID.").optional(),
    diagnosis: z
      .string()
      .trim()
      .min(3, "Diagnosis must be at least 3 characters.")
      .max(100, "Diagnosis cannot exceed 100 characters.")
      .optional(),

    instructions: z
      .string()
      .trim()
      .min(5, "Instructions must be at least 5 characters.")
      .max(1000, "Instructions cannot exceed 1000 characters.")
      .optional(),

    followUpDate: z.iso.datetime("Invalid follow-up date.").optional(),

    medications: z
      .array(medicationSchema)
      .min(1, "At least one medication is required.")
      .max(50, "Too many medications.")
      .optional(),
  }),
  params: z.object({
    id: z.string().trim().uuid("Invalid medical report ID."),
  }),
});

const paramValidation = z.object({
  params: z.object({
    id: z.string().trim().uuid("Invalid medical report ID."),
  }),
});

export type CreatePrescriptionInput = z.infer<
  typeof createPrescriptionValidation
>["body"];

export type UpdatePrescriptionInput = z.infer<
  typeof updatePrescriptionValidation
>["body"];

export const prescriptionValidators = {
  createPrescriptionValidation,
  updatePrescriptionValidation,
  paramValidation
};
