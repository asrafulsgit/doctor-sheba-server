import * as z from "zod";

const loginValidation = z.object({
  body: z.object({
    password: z
      .string().nonempty("Passoword is required"),
    email: z.string().email({ message: "Invalid email format" }),
  }),
});

export const authValidators = {
  loginValidation,
};
