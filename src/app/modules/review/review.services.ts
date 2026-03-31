import { addMinutes, addHours, format } from "date-fns";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import AppError from "../../errorHelpers/appError";
import httpStatus from "http-status";
import { AppointmentStatus, PaymentStatus, UserRole } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";

const createReviewService = async (
  user: JwtPayload,
  payload: {
    appointmentId: string;
    rating: number;
    comment: string;
  },
) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user?.email,
    },
  });

  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: payload.appointmentId,
    },
  });

  if (appointmentData.paymentStatus !== PaymentStatus.PAID) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment must be completed before submitting a review",
    );
  }
  if (appointmentData.status !== AppointmentStatus.COMPLETED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Appointment must be completed before submitting a review",
    );
  }

  if (!(patientData.id === appointmentData.patientId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "This is not your appointment!");
  }

  return await prisma.$transaction(async (tx) => {
    const result = await tx.review.create({
      data: {
        appointmentId: appointmentData.id,
        doctorId: appointmentData.doctorId,
        patientId: appointmentData.patientId,
        rating: payload.rating,
        comment: payload.comment,
      },
    });

    const averageRating = await tx.review.aggregate({
      where: { doctorId: result.doctorId },
      _avg: {
        rating: true,
      },
    });

    await tx.doctor.update({
      where: {
        id: result.doctorId,
      },
      data: {
        averageRating: averageRating._avg.rating as number,
      },
    });

    return result;
  });
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
      appointment: true,
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

export const reviewServices = {
  createReviewService,
  getMyPrescriptionsService,
  getPrescriptionsService,
};
