export const CUSTOM_ERROR = {
  // Authentication / custom errors
  CUSTOM_ERROR: 1000,

  // Authentication errors
  TOKEN_NOT_FOUND: 1001,
  USER_NOT_FOUND: 1002,
  USER_NOT_VERIFIED: 1003,
  USER_BLOCKED: 1004,
  USER_INACTIVE: 1005,
  USER_DELETED: 1006,
  ROLE_FORBIDDEN: 1007,

  // Mongoose / DB errors
  DUPLICATE_KEY: 2001, // Duplicate field in DB
  CAST_ERROR: 2002, // Invalid MongoDB ObjectId
  VALIDATION_ERROR: 2003, // Mongoose validation

  // Zod / Validation library
  ZOD_ERROR: 2004,

  // Server errors
  SERVER_ERROR: 5000, // Internal server error
} as const;

export type ErrorCodeType = (typeof CUSTOM_ERROR)[keyof typeof CUSTOM_ERROR];
