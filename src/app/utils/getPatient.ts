import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../shared/prisma";
import AppError from "../errorHelpers/appError";
import httpStatus from "http-status";

export const getPatientByUserEmail = async (user: JwtPayload) => {
  const email = user.email as string;

  const patient = await prisma.patient.findUnique({
    where: { email },
  });

  if (!patient) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Patient profile not found for this account",
    );
  }

  return patient;
};
