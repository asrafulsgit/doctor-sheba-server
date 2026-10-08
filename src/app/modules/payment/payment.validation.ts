import { z } from "zod";

 

const getPaymentsValidation = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    status: z.string().optional(),
    startDate : z.string().optional(),
    endDate : z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.string().optional(),
  }),
});
 

export type GetPaymentsQuery = z.infer<
  typeof getPaymentsValidation
>["query"];

export const paymentValidators = {
   getPaymentsValidation
};
