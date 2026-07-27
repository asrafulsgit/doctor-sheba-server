import { addMinutes, addHours, format } from "date-fns";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import AppError from "../../errorHelpers/appError";
import httpStatus from "http-status";
import { AppointmentStatus, PaymentStatus, UserRole } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
import { CreateReviewInput, GetMyReviewsQueryInput } from "./review.validation";

const createReviewService = async (
  user: JwtPayload,
  payload: CreateReviewInput,
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

  await prisma.$transaction(async (tx) => {
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
  });
};

type IStarCount = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

const getMyReviewsService = async (
  user: JwtPayload,
  query: GetMyReviewsQueryInput,
) => {
  const { page, limit } = query;

  const queryBuilder = new QueryBuilder(query).sort().pagination().build();

  const where: any = {
    ...queryBuilder.where,
  };

  if (user.role === UserRole.DOCTOR) {
    where.doctor = {
      email: user.email,
    };
  }
  if (user.role === UserRole.PATIENT) {
    where.patient = {
      email: user.email,
    };
  }

  const aggregateResult = await prisma.review.aggregate({
    where,
    _count: { id: true },
    _avg: { rating: true },
  });

  const totalReviews = aggregateResult._count.id;
  const averageRating = Number((aggregateResult._avg.rating ?? 0).toFixed(2));

  const ratingGroups = await prisma.review.groupBy({
    by: ["rating"],
    where,
    _count: { rating: true },
  });

  const starCounts: IStarCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratingGroups.forEach((group) => {
    const star = Math.min(5, Math.max(1, Math.round(group.rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    starCounts[star] += group._count.rating;
  });

  const reviews = await prisma.review.findMany({
    where,
    ...queryBuilder.options,
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          profilePhoto: true,
        },
      },
    },
  });

  const total = await prisma.review.count({
    where,
  });

  const limitNumber = Number(limit) || 10;

  return {
    meta: {
      total,
      page: Number(page) || 1,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: {
      totalReviews,
      averageRating,
      ratingCounts: {
        "1star": starCounts[1],
        "2star": starCounts[2],
        "3star": starCounts[3],
        "4star": starCounts[4],
        "5star": starCounts[5],
      },
      reviews,
    },
  };
};

export const reviewServices = {
  createReviewService,
  getMyReviewsService,
};
