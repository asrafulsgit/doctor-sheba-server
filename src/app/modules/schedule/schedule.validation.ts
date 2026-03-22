import * as z from "zod";


const createScheduleSchema = z.object({
  body : z.object({
    startDate: z
    .string({ error: "Start date is required" })
    .date({ message: "Invalid start date format" }),

  endDate: z
    .string({ error: "End date is required" })
    .date({ message: "Invalid end date format" }),

  startTime: z
    .string({ error: "Start time is required" })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be in HH:mm format"),

  endTime: z
    .string({ error: "End time is required" })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be in HH:mm format"),
  })
});

export const sheludeValidators = {
    createScheduleSchema
}
