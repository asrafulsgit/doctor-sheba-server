import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../config";
import { decodedToken } from "./decodedToken";
import { generateToken } from "./generateToken";
import { prisma } from "../shared/prisma";
import AppError from "../errorHelpers/appError";
import httpStatus from "http-status";
import { UserStatus } from "@prisma/client";

export const getTokens = (tokenPayload: {
  id: string;
  email: string;
  role: string;
}) => {
  const accessToken = generateToken(
    tokenPayload,
    envVars.JWT_ACCESS_TOKEN_SECRET,
    envVars.JWT_ACCESS_TOKEN_EXPIRESIN,
  );
  const refreshToken = generateToken(
    tokenPayload,
    envVars.JWT_REFRESH_TOKEN_SECRET,
    envVars.JWT_REFRESH_TOKEN_EXPIRESIN,
  );

  return {
    accessToken,
    refreshToken,
  };
};

export const createAccessTokenFromRefreshToken = async (
  refreshToken: string,
) => {
  const verifyToken = decodedToken(
    refreshToken,
    envVars.JWT_REFRESH_TOKEN_SECRET,
  ) as JwtPayload;

  const isUserExist = await prisma.user.findUniqueOrThrow({
    where: {
      id: verifyToken.id,
    },
  });

  if (!isUserExist) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (
    isUserExist.status === UserStatus.DELETED ||
    isUserExist.status === UserStatus.INACTIVE
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is ${isUserExist.status}`,
    );
  }

  if (!isUserExist.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User is not verified`);
  }
  const tokenPayload = {
    id: isUserExist.id,
    email: isUserExist.email,
    role: isUserExist.role,
  };
  const newAccessToken = generateToken(
    tokenPayload,
    envVars.JWT_ACCESS_TOKEN_SECRET,
    envVars.JWT_ACCESS_TOKEN_EXPIRESIN,
  );
  return newAccessToken;
};
