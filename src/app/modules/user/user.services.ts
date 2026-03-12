import { envVars } from "../../config";
import { prisma } from "../../shared/prisma";
import { IPatient } from "./user.interfaces";
import bcrypt from "bcryptjs";

const createPatientService = async (payload: IPatient) => { 
  const password = await bcrypt.hash(
    payload.password as string,
    Number(envVars.BCRYPT_SALT),
  );

  const newPatient = await prisma.$transaction(async (tnx) => {
    await tnx.user.create({
      data: {
        email: payload.email,
        password,
      },
    });
    return await tnx.patient.create({
      data: {
        email: payload.email,
        name: payload.name,
      },
    });
  });

  return newPatient;
};

export const userServices = {
  createPatientService,
};
