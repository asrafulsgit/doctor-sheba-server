import * as z from "zod";

const updateAdminValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(3, { message: "Name must be at least 3 characters long." }),
    contactNumber: z
      .string()
      .min(10, "Contact number must be at least 10 digits")
      .max(20, "Contact number must be at most 20 characters")
      .optional(),
    role: z.enum(["ADMIN", "SUPER_ADMIN"]),
  }),
});

const deleteAdminValidation = z.object({
  body: z.object({
    isDelete: z.boolean(),
  }),
  params: z.object({
    adminId: z.string().trim().uuid("Invalid patient ID."),
  }),
});

export type UpdateAdminInput = z.infer<
  typeof updateAdminValidationSchema
>["body"];

export const adminValidators = {
  updateAdminValidationSchema,
  deleteAdminValidation
};
