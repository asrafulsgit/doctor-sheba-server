import * as z from "zod";

const loginValidation = z.object({
  body: z.object({
    password: z.string().nonempty("Passoword is required"),
    email: z.string().email({ message: "Invalid email format" }),
  }),
});

const emailValidation = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email format" }),
  }),
});

const otpVerificationValidation = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email format" }),
    otp: z.string().length(6, "Verification code must be 6 digits"),
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
  emailValidation,
  otpVerificationValidation
};
