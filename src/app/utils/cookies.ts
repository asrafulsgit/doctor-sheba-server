import { Response } from "express";
import { envVars } from "../config";

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
}

export const setCookies = (res: Response, tokens: AuthTokens) => {
  if (tokens.accessToken) {
    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: envVars.NODE_ENV === "production",
      sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60,
    });
  }
  if (tokens.refreshToken) {
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: envVars.NODE_ENV === "production",
      sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  }
};

export const clearCookies = (res: Response) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: envVars.NODE_ENV === "production",
    sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: envVars.NODE_ENV === "production",
    sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
  });
};
