import { UserRole, UserStatus } from "@prisma/client";
import { envVars } from "../../config";
import { prisma } from "../../shared/prisma";
import { IDoctor, IPatient } from "./user.interfaces";
import bcrypt from "bcryptjs";
import QueryBuilder from "../../utils/queryBuilder";
import { JwtPayload } from "jsonwebtoken";

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
  const { specialties, password: _password, ...doctorData } = payload;

  await prisma.$transaction(async (tnx) => {
    await tnx.user.create({
      data: {
        email: payload.email,
        password,
        role: UserRole.DOCTOR,
      },
    });
    const doctor = await tnx.doctor.create({
      data: doctorData,
    });

    if (specialties?.length) {
      const doctorSpecialitiesData = specialties.map((specialtyId) => ({
        doctorId: doctor.id,
        specialitiesId: specialtyId,
      }));

      await tnx.doctorSpecialities.createMany({
        data: doctorSpecialitiesData,
      });
    }

    return doctor;
  });
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
  const { where, options } = new QueryBuilder(query)
    .search(["email"])
    .filter()
    .sort()
    .pagination()
    .build();

  const users = await prisma.user.findMany({
    where,
    ...options,
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

  const total = await prisma.user.count({ where });
  const limit = Number(query.limit) || 10;
  return {
    meta: {
      total,
      page: Number(query.page) || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: users,
  };
};

const getMyProfileService = async (user: JwtPayload) => {
  const userInfo = await prisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      email: true,
      needPasswordChange: true,
      role: true,
      status: true,
      isVerified: true,
    },
  });

  let profileData;

  if (userInfo.role === UserRole.PATIENT) {
    profileData = await prisma.patient.findUnique({
      where: {
        email: userInfo.email,
      },
    });
  } else if (userInfo.role === UserRole.DOCTOR) {
    profileData = await prisma.doctor.findUnique({
      where: {
        email: userInfo.email,
      },
    });
  } else if (userInfo.role === UserRole.ADMIN) {
    profileData = await prisma.admin.findUnique({
      where: {
        email: userInfo.email,
      },
    });
  }

  return {
    ...userInfo,
    ...profileData,
  };
};

export const userServices = {
  createPatientService,
  createDoctorService,
  createAdminService,
  getAllUserService,
  getMyProfileService,
};
