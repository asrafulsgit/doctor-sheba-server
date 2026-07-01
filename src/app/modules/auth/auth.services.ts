import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
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
import { firebaseAdmin } from "../../config/firebase";
import { redisClient } from "../../config/redis";

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

  if (user?.needPasswordChange) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Please set your password by Forgot Password",
    );
  }

  if (!user.isVerified) {
    throw new AppError(
      httpStatus.FORBIDDEN,
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
    user.password as string,
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
  let profileData;
  if (user.role === UserRole.PATIENT) {
    profileData = await prisma.patient.findUnique({
      where: {
        email: user.email,
      },
    });
  } else if (user.role === UserRole.DOCTOR) {
    profileData = await prisma.doctor.findUnique({
      where: {
        email: user.email,
      },
    });
  } else if (user.role === UserRole.ADMIN) {
    profileData = await prisma.admin.findUnique({
      where: {
        email: user.email,
      },
    });
  }
  const { password, ...userData } = user;
  return {
    tokens,
    data: { ...userData, ...profileData },
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

const setPasswordService = async (userId: string, password: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
  });

  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  if (!user.needPasswordChange) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You have already setup your password. Please go to your profile and change your password`,
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(envVars.BCRYPT_SALT),
  );

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
    },
  });
};

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

  const resetUILink = `${envVars.FRONTEND_URL}/auth/reset-password?token=${resetToken}&email=${isUserExist.email}`;

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

const resetPasswordService = async (
  payload: { password: string },
  query: { token: string },
) => {
  const token = query.token;
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
    payload.password,
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

const OTPExpiresIn = 2 * 60;
const OTPGenerator = (lenth = 6) => {
  const OTP = randomInt(10 ** (lenth - 1), 10 ** lenth).toString();
  return OTP;
};

const verifyEmailOTPSendService = async (email: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      email,
    },
    include: {
      admin: { select: { name: true } },
      patient: { select: { name: true } },
      doctor: { select: { name: true } },
    },
  });

  if (user.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email already verified");
  }

  const otp = OTPGenerator();
  await redisClient.set(`otp:${user.email}`, otp, {
    expiration: {
      type: "EX",
      value: OTPExpiresIn,
    },
  });
  const userName =
    user.admin?.name || user.doctor?.name || user.patient?.name || "";
  await sendEmail({
    to: user.email,
    subject: "Email verification OTP",
    templateName: "verifyEmail",
    templateData: {
      name: userName,
      otp: otp,
      expiryMinutes: "2",
    },
  });
};

const verifyEmailOPTVerificationService = async (
  email: string,
  otp: string,
) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "email already verified");
  }

  const redisKey = `otp:${email}`;

  const savedOtp = await redisClient.get(redisKey);

  if (!savedOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  if (savedOtp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  await Promise.all([
    prisma.user.update({ where: { email }, data: { isVerified: true } }),
    redisClient.del([redisKey]),
  ]);
};

const googleLoginService = async (token: string) => {
  const decodeToken = await firebaseAdmin.auth().verifyIdToken(token);
  const { email, name, picture } = decodeToken;
  let user;
  user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!user) {
    user = await prisma.$transaction(async (tnx) => {
      const newUser = await tnx.user.create({
        data: {
          email: email as string,
          needPasswordChange: true,
        },
      });
      await tnx.patient.create({
        data: {
          email: email as string,
          name: name as string,
        },
      });
      return newUser;
    });
  }
  const tokenPayload = {
    id: user.id,
    role: user.role,
    email: user.email,
  };
  const tokens = getTokens(tokenPayload);
  return tokens;
};

export const authServices = {
  loginService,
  getAccessTokenService,
  changePasswordService,
  setPasswordService,
  forgotPasswordService,
  resetPasswordService,
  verifyEmailOTPSendService,
  verifyEmailOPTVerificationService,
  googleLoginService,
};
