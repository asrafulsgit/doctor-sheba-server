class AppError extends Error {
  public statusCode: number;
  public code?: number;
  constructor(statusCode: number, message: string, code?: number, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.code = code || statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
