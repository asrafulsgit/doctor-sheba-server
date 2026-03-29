import * as z from "zod";

const getAiSuggestedDoctorsValidationSchema = z.object({
  body: z.object({
    text: z.string().min(1, { message: "Input is required" }), 
  }),
});
 
export const doctorValidators = {
  getAiSuggestedDoctorsValidationSchema
};
