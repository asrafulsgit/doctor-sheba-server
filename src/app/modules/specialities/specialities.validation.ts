import * as z from "zod";

const createSpecialityValidationSchema = z.object({
  body: z.object({
    title: z.string({
      error: "Title is required!",
    }),
  })
});

export const specialitiesValidators = {
  createSpecialityValidationSchema,
};
