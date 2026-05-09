import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { Response } from "express";
import { envVars } from "../config";

export const generateToken = (
  payload: JwtPayload,
  secret: Secret,
  expiresIn: string,
) => {
  const token = jwt.sign(payload, secret, { expiresIn } as SignOptions);
  return token;
};


export const clearTokens = (res: Response) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: envVars.NODE_ENV === "production",
    sameSite: "none",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: envVars.NODE_ENV === "production",
    sameSite: "none",
  });
};