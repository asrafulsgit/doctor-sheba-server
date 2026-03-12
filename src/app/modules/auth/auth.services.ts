import { UserStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import AppError from "../../errorHelpers/appError";
import httpStatus from "http-status";
import { getTokens } from "../../utils/getTokens";
import { CUSTOM_ERROR } from "../../utils/constants";

const loginService = async (payload: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid credentials",
      CUSTOM_ERROR.USER_NOT_FOUND,
    );
  }
  if (!user.isVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is not verified`,
      CUSTOM_ERROR.USER_NOT_VERIFIED,
    );
  }
  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is ${user.status}`,
      user.status === UserStatus.DELETED
        ? CUSTOM_ERROR.USER_DELETED
        : CUSTOM_ERROR.USER_INACTIVE,
    );
  }

  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    user.password,
  );
  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid credentials");
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = getTokens(tokenPayload);
  const { password, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    tokens,
  };
};

export const authServices = {
  loginService,
};
