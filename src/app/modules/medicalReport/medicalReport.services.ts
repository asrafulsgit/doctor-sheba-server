import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { deleteCloudinaryImage } from "../../config/cloudinary";
import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import {
  CreateMedicalReportInput,
  UpdateMedicalReportInput,
} from "./medicalReport.interfaces";
import { GetMyMedicalReportsQuery } from "./medicalReport.validation";

const getPatientByUserEmail = async (user: JwtPayload) => {
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

const getMyMedicalReportsService = async (
  user: JwtPayload,
  query: GetMyMedicalReportsQuery,
) => {
  const { where, options } = new QueryBuilder(query as Record<string, any>)
    .search(["reportName"])
    .filter()
    .sort()
    .pagination()
    .build();
  const patient = await getPatientByUserEmail(user);

  const reports = await prisma.medicalReport.findMany({
    where: {
      patientId: patient.id,
      ...where,
    },
    ...options,
  });

  const total = await prisma.medicalReport.count({
    where,
  });

  const limit = Number(query.limit) || 10;

  return {
    meta: {
      total,
      page: Number(query.page) || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: reports,
  };
};

const getMedicalReportService = async (user: JwtPayload, id: string) => {
  const report = await prisma.medicalReport.findUniqueOrThrow({
    where: { id },
  });

  if (user.role === UserRole.PATIENT) {
    const patient = await getPatientByUserEmail(user);

    if (report.patientId !== patient.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not allowed to access this medical report",
      );
    }
  }

  return report;
};

const createMedicalReportService = async (
  user: JwtPayload,
  payload: CreateMedicalReportInput,
  file?: Express.Multer.File,
) => {
  if (!file?.path) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A medical report file is required",
    );
  }

  const patient = await getPatientByUserEmail(user);

  return prisma.medicalReport.create({
    data: {
      patientId: patient.id,
      reportName: payload.reportName,
      reportLink: file.path,
    },
  });
};

const deleteMedicalReportService = async (user: JwtPayload, id: string) => {
  const report = await prisma.medicalReport.findUniqueOrThrow({
    where: { id },
  });

  const patient = await getPatientByUserEmail(user);

  if (report.patientId !== patient.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to delete this medical report",
    );
  }

  if (report.reportLink) {
    await deleteCloudinaryImage(report.reportLink);
  }

  await prisma.medicalReport.delete({
    where: { id },
  });
};

export const medicalReportServices = {
  getMyMedicalReportsService,
  getMedicalReportService,
  createMedicalReportService,
  deleteMedicalReportService,
};
