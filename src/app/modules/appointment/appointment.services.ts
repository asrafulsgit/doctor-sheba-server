import openAi from "../../config/openAi";
import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import { CUSTOM_ERROR } from "../../utils/constants";
import QueryBuilder from "../../utils/queryBuilder";
import httpStatus from "http-status";
import { IUpdateDoctor } from "./appointment.interfaces";
import { JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { createPaymentSession } from "../../utils/paymentSession";

const createAppointmentService = async (
  user: JwtPayload,
  payload: {
    doctorId: string;
    scheduleId: string;
  },
) => {
  const patient = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
      isDeleted: false,
    },
  });

  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: {
      id: payload.doctorId,
      isDeleted: false,
    },
  });

  const doctorSchedule = await prisma.doctorSchedules.findUniqueOrThrow({
    where: {
      doctorId_scheduleId: {
        doctorId: doctor.id,
        scheduleId: payload.scheduleId,
      },
    },
    include: {
      schedule: true,
    },
  });

  if (doctorSchedule.isBooked) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This schedule is already booked",
    );
  }

  const now = new Date();
  if (doctorSchedule.schedule.startDateTime < now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot book appointment for past schedule",
    );
  }

  const videoCallingId = `VC-${uuidv4()}`;

  const newAppointment = await prisma.$transaction(async (tnx) => {
    const appointmentData = await tnx.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        scheduleId: payload.scheduleId,
        videoCallingId,
      },
    });

    await tnx.doctorSchedules.update({
      where: {
        doctorId_scheduleId: {
          doctorId: doctor.id,
          scheduleId: doctorSchedule.scheduleId,
        },
      },
      data: {
        isBooked: true,
      },
    });

    const transactionId = `tnx-${uuidv4()}`;

    const payment = await tnx.payment.create({
      data: {
        appointmentId: appointmentData.id,
        transactionId,
        amount: doctor.appointmentFee,
      },
    });

    const sessionData = {
      appointmentId: appointmentData.id,
      paymentId : payment.id,
      appointmentFee: payment.amount,
      docotorName: doctor.name,
    };

    const paymentSession = await createPaymentSession(sessionData);
    return {session_url : paymentSession.url};
  });

  return newAppointment;
};

export const appointmentServices = {
  createAppointmentService,
};
