import * as z from "zod";

const createPatientValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Invalid email format" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
  }),
});

const GenderEnum = z.enum(["MALE", "FEMALE"]);

const createDoctorValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"), 
    contactNumber: z.string().min(11, "Contact number is too short"),
    address: z.string().min(3, "Address is required"),
    experience: z
      .number()
      .int()
      .nonnegative("Experience cannot be negative")
      .optional(),
    registrationNumber : z.string().min(6, "Registration number is too short"),
    gender: GenderEnum,
    appointmentFee: z.number().int().nonnegative("Fee cannot be negative"),
    currentWorkingPlace: z.string().min(2, "Current working place is required"),
    designation: z.string().min(2, "Designation is required"),
    qualification: z.string().min(2, "Qualification is required"),
    specialties: z.array(z.string()).optional(),
  }),
});

export const userValidators = {
  createPatientValidationSchema,
  createDoctorValidationSchema
};
