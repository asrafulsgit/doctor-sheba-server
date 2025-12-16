import config from "../../../config";
import { prisma } from "../../shared/prisma";
import { IPatient } from "./user.interfaces";
import bcrypt from "bcryptjs";

const createPatientService = async (patient: IPatient) => {
  const password = await bcrypt.hash(
    patient.password as string,
    Number(config.BCRYPT_SALT)
  );

//   const result = await prisma.$transaction(async (tx) => {
//     // First, check if user already exists
//     const existingUser = await tx.user.findUnique({
//       where: { email: patient.email },
//     });

//     if (existingUser) {
//       throw new Error("User with this email already exists");
//     }

//     // Create user
//     const user = await tx.user.create({
//       data: {
//         email: patient.email,
//         password: password,
//         role: "PATIENT", // Make sure this is a valid UserRole
//         needPasswordChange: true,
//         status: "ACTIVE",
//       },
//     });

//     const patientRecord = await tx.patient.create({
//       data: {
//         name: patient.name,
//         email: patient.email, // This must match user.email
//         profilePhoto: patient.profilePhoto,
//         contactNumber: patient.contactNumber,
//         address: patient.address,
//       },
//     });

//     return { user, patient: patientRecord };
//   });
};

export const userServices = {
  createPatientService,
};
