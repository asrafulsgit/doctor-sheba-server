import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import {
  TErrorSources,
  TGenericErrorResponse,
} from "../interfaces/error.types";

export const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
): TGenericErrorResponse => {
  const errorSources: TErrorSources[] = [];

  let statusCode: number = httpStatus.BAD_REQUEST;
  let message = "Database Error";

  // Unique constraint failed
  if (err.code === "P2002") {
    statusCode = httpStatus.CONFLICT;
    message = "Duplicate resource";
  }

  // Record not found
  if (err.code === "P2025") {
    statusCode = httpStatus.NOT_FOUND;
    message = "Resource not found";
  }

  // Foreign key constraint
  if (err.code === "P2003") {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Foreign key constraint failed";
  }

  return {
    statusCode,
    message,
    errorSources,
  };
};
