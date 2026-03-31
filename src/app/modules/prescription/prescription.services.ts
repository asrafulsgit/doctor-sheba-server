import { addMinutes, addHours, format } from "date-fns";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import AppError from "../../errorHelpers/appError";
import httpStatus from "http-status";
import { AppointmentStatus, PaymentStatus, UserRole } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";

const createPrescriptionService = async (
  email: string,
  payload: {
    appointmentId: string;
    instructions: string;
    followUpDate: string | Date;
  },
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

  if (appointment.status !== AppointmentStatus.COMPLETED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Appointment is not completed yet",
    );
  }
  if (appointment.paymentStatus !== PaymentStatus.PAID) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Appointment fee is not paid yet",
    );
  }

  if (!(email === appointment.doctor.email)) {
    throw new AppError(httpStatus.BAD_REQUEST, "This is not your appointment");
  }

  const prescription = await prisma.prescription.create({
    data: {
      appointmentId: appointment.id,
      doctorId: appointment.doctor.id,
      patientId: appointment.patient.id,
      instructions: payload.instructions,
      followUpDate: payload.followUpDate,
    },
  });

  return prescription;
};

const getMyPrescriptionsService = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const { page, limit } = query;

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

  const prescriptions = await prisma.prescription.findMany({
    where: {
      ...where,
    },
    ...queryBuilder.options,
    include: {
      appointment : true,
      patient: user.role === UserRole.DOCTOR,
      doctor: user.role === UserRole.PATIENT,
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
  getPrescriptionsService
};
