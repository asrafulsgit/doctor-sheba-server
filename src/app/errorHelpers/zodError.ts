import {
  TErrorSources,
  TGenericErrorResponse,
} from "../interfaces/error.types";
import httpStatus from "http-status";

export const handlerZodError = (err: any): TGenericErrorResponse => {
  const errorSources: TErrorSources[] = [];

  err.issues.forEach((issue: any) => {
    errorSources.push({
      path: issue.path[issue.path.length - 1],
      message: issue.message,
    });
  });

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: "Zod Error",
    errorSources,
  };
};
