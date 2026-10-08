import * as z from "zod";

const createSpecialityValidationSchema = z.object({
  body: z.object({
    title: z.string({
      error: "Title is required!",
    }),
    icon: z.string({
      error: "Icon is required!",
    }),
  })
});

const updateSpecialityValidationSchema = z.object({
  params: z.object({
    id: z.string().trim().uuid("Invalid speciality ID."),
  }),
  body: z
    .object({
      title: z.string().trim().min(1, "Title cannot be empty").optional(),
      icon: z.string().trim().min(1, "Icon cannot be empty").optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one speciality field must be provided",
    }),
});

export type UpdateSpecialityInput = z.infer<
  typeof updateSpecialityValidationSchema
>["body"];

export const specialitiesValidators = {
  createSpecialityValidationSchema,
  updateSpecialityValidationSchema,
};
