import { z } from "zod";

const paramValidation = z.object({
  params: z.object({
    id: z.string().trim().uuid("Invalid medical report ID."),
  }),
});

export const patientValidators = {
  paramValidation,
};
