import { UserRole } from "@prisma/client";
import { envVars } from "../../config";
import { prisma } from "../../shared/prisma";
import { IDoctor, IPatient } from "./user.interfaces";
import bcrypt from "bcryptjs";
import QueryBuilder from "../../utils/queryBuilder";

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
const createDoctorService = async (payload: IDoctor) => {
  const password = await bcrypt.hash(
    payload.password as string,
    Number(envVars.BCRYPT_SALT),
  );

  const newDoctor = await prisma.$transaction(async (tnx) => {
    await tnx.user.create({
      data: {
        email: payload.email,
        password,
        role: UserRole.DOCTOR,
      },
    });
    return await tnx.doctor.create({
      data: {
        name: payload.name,
        email: payload.email,
        contactNumber: payload.contactNumber,
        address: payload.address,
        gender: payload.gender,
        appointmentFee: payload.appointmentFee,
        currentWorkingPlace: payload.currentWorkingPlace,
        designation: payload.designation,
        qualification: payload.qualification,
      },
    });
  });

  return newDoctor;
};
const createAdminService = async (payload: IPatient) => {
  const password = await bcrypt.hash(
    payload.password as string,
    Number(envVars.BCRYPT_SALT),
  );

  const newAdmin = await prisma.$transaction(async (tnx) => {
    await tnx.user.create({
      data: {
        email: payload.email,
        password,
        role: UserRole.ADMIN,
      },
    });
    return await tnx.admin.create({
      data: {
        email: payload.email,
        name: payload.name,
      },
    });
  });

  return newAdmin;
};

const getAllUserService = async (query: Record<string, any>) => {
  const queryBuilder = new QueryBuilder(query)
    .search(["email"])
    .filter()
    .sort()
    .pagination()
    .build();

  const users = await prisma.user.findMany({
    ...queryBuilder,
    select: {
      id: true,
      email: true,
      role: true,
      needPasswordChange: true,
      status: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return users;
};

export const userServices = {
  createPatientService,
  createDoctorService,
  createAdminService,
  getAllUserService,
};
