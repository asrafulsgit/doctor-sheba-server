import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { deleteCloudinaryImage } from "../config/cloudinary";
import { handlerZodError } from "../errorHelpers/zodError";
import { TErrorSources } from "../interfaces/error.types"; 
import { envVars } from "../config";

const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let success = false;
  let message = err.message || "Something went wrong!";
  let error = err;
  let errorSources: TErrorSources[] = [];

  // delete single image when api has error
  if (req.file) {
    await deleteCloudinaryImage(req.file.path);
  }

  // delete multiple images when api has error
  if (req.files && Array.isArray(req.files) && req.files.length) {
    const imageUrls = (req.files as Express.Multer.File[]).map(
      (file) => file.path,
    );
    await Promise.all(imageUrls.map((url) => deleteCloudinaryImage(url)));
  }

  if (err.name === "ZodError") {
    const simplifiedError = handlerZodError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources as TErrorSources[];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    err: envVars.NODE_ENV === "development" ? err : null,
    stack: envVars.NODE_ENV === "development" ? err.stack : null,
  });
};

export default globalErrorHandler;
