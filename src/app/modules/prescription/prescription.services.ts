import { addMinutes, addHours, format } from "date-fns";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import AppError from "../../errorHelpers/appError";
import httpStatus from "http-status";
import { AppointmentStatus, PaymentStatus, UserRole } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
import { CreatePrescriptionInput } from "./prescription.validation";

const createPrescriptionService = async (
  email: string,
  payload: CreatePrescriptionInput,
) => {
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: payload.appointmentId,
    },
    include: {
      doctor: true,
      patient: true,
    },
  });

  if (appointment.status !== AppointmentStatus.INPROGRESS) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Appointment must be inprogress before creating prescription",
    );
  }
  if (appointment.paymentStatus !== PaymentStatus.PAID) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Appointment fee is not paid yet",
    );
  }

  if (email !== appointment.doctor.email) {
    throw new AppError(httpStatus.BAD_REQUEST, "This is not your appointment");
  }

  const prescription = await prisma.prescription.create({
    data: {
      appointmentId: appointment.id,
      doctorId: appointment.doctor.id,
      patientId: appointment.patient.id,
      diagnosis: payload.diagnosis,
      instructions: payload.instructions,
      followUpDate: payload.followUpDate,
      medications: {
        create: payload.medications,
      },
    },
  });

  return prescription;
};

const getMyPrescriptionsService = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const { page, limit, searchTerm } = query;

  const queryBuilder = new QueryBuilder(query).sort().pagination().build();

  const where: any = { ...queryBuilder.where };

  if (user.role === UserRole.PATIENT) {
    where.patient = {
      email: user.email,
    };
  }

  if (user.role === UserRole.DOCTOR) {
    where.doctor = {
      email: user.email,
    };
  }

  if (searchTerm) {
    let relationField: "patient" | "doctor" | null = null;

    if (user.role === UserRole.PATIENT) {
      relationField = "doctor";
    } else if (user.role === UserRole.DOCTOR) {
      relationField = "patient";
    }

    if (relationField) {
      where.AND = [
        ...(where.AND || []),
        {
          [relationField]: {
            name: { contains: searchTerm, mode: "insensitive" },
          },
        },
      ];
    }
  }

  const prescriptions = await prisma.prescription.findMany({
    where: {
      ...where,
    },
    ...queryBuilder.options,
    include: {
      appointment: true,
      patient: user.role === UserRole.DOCTOR,
      doctor: user.role === UserRole.PATIENT,
      medications: true,
    },
  });
  const total = await prisma.prescription.count({
    where: {
      ...where,
    },
  });

  const limitNumber = Number(limit) || 10;
  return {
    meta: {
      total,
      page: Number(page) || 1,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: prescriptions,
  };
};

const getPrescriptionsService = async (query: Record<string, any>) => {
  const { where, options } = new QueryBuilder(query)
    .sort()
    .filter()
    .pagination()
    .build();

  const prescriptions = await prisma.prescription.findMany({
    where: {
      ...where,
    },
    ...options,
    include: {
      appointment: true,
      patient: true,
      doctor: true,
    },
  });

  const total = await prisma.prescription.count({
    where: {
      ...where,
    },
  });

  const limit = Number(query.limit) || 10;
  return {
    data: prescriptions,
    meta: {
      total,
      page: Number(query.page) || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const prescriptionServices = {
  createPrescriptionService,
  getMyPrescriptionsService,
  getPrescriptionsService,
};
