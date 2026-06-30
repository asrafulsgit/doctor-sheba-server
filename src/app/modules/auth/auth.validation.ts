import * as z from "zod";

const loginValidation = z.object({
  body: z.object({
    password: z.string().nonempty("Passoword is required"),
    email: z.string().email({ message: "Invalid email format" }),
  }),
});

const forgotPasswordValidation = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email format" }),
  }),
});

const resetPasswordValidation = z.object({
  body: z.object({
    password: z.string().nonempty("Passoword is required"),
  }),
  query: z.object({
    token: z.string().nonempty("token is required"),
  }),
});

export const authValidators = {
  loginValidation,
  resetPasswordValidation,
  forgotPasswordValidation,
};
