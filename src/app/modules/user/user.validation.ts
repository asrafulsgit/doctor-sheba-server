import * as z from "zod";

const createPatientValidation = z.object({
  body: z.object({
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),

    patient: z.object({
      name: z.string().min(1, { message: "Name is required" }),
      email: z.string().email({ message: "Invalid email format" }),
    }),
  }),
});

export const userValidators = {
    createPatientValidation
}
