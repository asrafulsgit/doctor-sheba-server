import { z } from "zod";

const createAppointmentValidationSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID"),
  scheduleId: z.string().uuid("Invalid schedule ID"),
});

const appointmentIdValidation = z.object({
  params: z.object({
    appointmentId: z.string().trim().uuid("Invalid appointment ID."),
  }),
});

const idValidation = z.object({
  params: z.object({
    id: z.string().trim().uuid("Invalid ID."),
  }),
});

export const appointmentValidations = {
  createAppointmentValidationSchema,
  appointmentIdValidation,
  idValidation,
};
