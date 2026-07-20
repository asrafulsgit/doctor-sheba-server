import { z } from "zod";

 

const getPatientPaymentsValidation = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    status: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.string().optional(),
  }),
});
 

export type GetPatientPaymentsQuery = z.infer<
  typeof getPatientPaymentsValidation
>["query"];

export const paymentValidators = {
   getPatientPaymentsValidation
};
