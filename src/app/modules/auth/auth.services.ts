import { UserStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import AppError from "../../errorHelpers/appError";
import httpStatus from "http-status";
import {
  createAccessTokenFromRefreshToken,
  getTokens,
} from "../../utils/getTokens";
import { CUSTOM_ERROR } from "../../utils/constants";
import jwt, { JwtPayload } from "jsonwebtoken";
import { envVars } from "../../config";
import { sendEmail } from "../../utils/emailSender";

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

const getAccessTokenService = async (token: string) => {
  const newAccessToken = await createAccessTokenFromRefreshToken(token);

  return {
    accessToken: newAccessToken,
  };
};

const changePasswordService = async (
  oldPassword: string,
  newPassword: string,
  userData: JwtPayload,
) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userData.id,
    },
  });

  const isCorrectPassword = await bcrypt.compare(
    oldPassword,
    user?.password as string,
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Password does not match");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(envVars.BCRYPT_SALT),
  );

  await prisma.user.update({
    where: {
      id: userData.id,
    },
    data: {
      password: hashedPassword,
    },
  });
};

// const setPasswordService = async (userId: string, password: string) => {
//   const user = await prisma.user.findUniqueOrThrow({
//     where : {
//       id : userId
//     }
//   });

//   if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

//   if (
//     user.password &&
//     user.auths.some((auth) => auth.provider === "Creadentials")
//   ) {
//     throw new AppError(
//       httpStatusCode.BAD_REQUEST,
//       `You have already setup your password.
//             Please go to your plofile and change your password`,
//     );
//   }

//   const newAuths: IAuthProvider = {
//     provider: "Creadentials",
//     providerId: user.email,
//   };

//   const userAuths: IAuthProvider[] = [newAuths, ...user.auths];

//   const hashedPassword = await bcrypt.hash(password, Number(envs.BCRYPT_SALT));

//   user.password = hashedPassword;
//   user.auths = userAuths;

//   await user.save();
// };

const forgotPasswordService = async (email: string) => {
  const isUserExist = await prisma.user.findFirstOrThrow({
    where: {
      email,
    },
    include: {
      admin: { select: { name: true } },
      patient: { select: { name: true } },
      doctor: { select: { name: true } },
    },
  });

  if (!isUserExist) {
    throw new AppError(httpStatus.BAD_REQUEST, "User does not exist");
  }
  if (!isUserExist.isVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User is not verified",
      CUSTOM_ERROR.USER_NOT_VERIFIED,
    );
  }
  if (
    isUserExist.status === UserStatus.DELETED ||
    isUserExist.status === UserStatus.INACTIVE
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is ${isUserExist.status}`,
      isUserExist.status === UserStatus.DELETED
        ? CUSTOM_ERROR.USER_BLOCKED
        : CUSTOM_ERROR.USER_INACTIVE,
    );
  }
  if (!isUserExist.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "User is deleted");
  }

  const jwtPayload = {
    id: isUserExist.id,
    email: isUserExist.email,
    role: isUserExist.role,
  };

  const resetToken = jwt.sign(jwtPayload, envVars.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: "10m",
  });

  const resetUILink = `${envVars.FRONTEND_URL}/auth/forgot-password/reset?token=${resetToken}`;

  const userName =
    isUserExist.admin?.name ||
    isUserExist.doctor?.name ||
    isUserExist.patient?.name ||
    "";
  await sendEmail({
    to: isUserExist.email,
    subject: "Forgot Password",
    templateName: "forgotPassword",
    templateData: {
      name: userName,
      resetUILink,
    },
  });
};

const resetPasswordService = async (payload: Record<string, any>) => {
  const token = payload.token;
  const tokenPayload = jwt.verify(
    token,
    envVars.JWT_ACCESS_TOKEN_SECRET,
  ) as JwtPayload;

  const isUserExist = await prisma.user.findUniqueOrThrow({
    where: {
      id: tokenPayload.id,
    },
  });

  if (!isUserExist) {
    throw new AppError(401, "User does not exist");
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(envVars.BCRYPT_SALT),
  );

  await prisma.user.update({
    where: {
      id: isUserExist.id,
    },
    data: {
      password: hashedPassword,
    },
  });
};

export const authServices = {
  loginService,
  getAccessTokenService,
  changePasswordService,
  // setPasswordService,
  forgotPasswordService,
  resetPasswordService,
};
