import { RefundStatus } from "@prisma/client";
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

const getRefundsValidation = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    status: z.enum(RefundStatus).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});
 

export type GetPaymentsQuery = z.infer<
  typeof getPaymentsValidation
>["query"];
export type GetRefundsQuery = z.infer<
  typeof getRefundsValidation
>["query"];

export const paymentValidators = {
   getPaymentsValidation,
   getRefundsValidation
};
