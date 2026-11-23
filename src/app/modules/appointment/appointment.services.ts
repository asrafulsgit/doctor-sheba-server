import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { createPaymentSession } from "../../utils/paymentSession";
import { v4 as uuidv4 } from "uuid";
import QueryBuilder from "../../utils/queryBuilder";
import {
  AppointmentStatus,
  PaymentStatus,
  RefundStatus,
  UserRole,
} from "@prisma/client";
import { refundQueue } from "../../utils/queues";

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
  if (doctorSchedule.schedule.startDateTime <= now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot book appointment for past schedule",
    );
  }

  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      scheduleId: payload.scheduleId,
      status: {
        in: ["INPROGRESS", "SCHEDULED", "COMPLETED"],
      },
    },
  });

  if (existingAppointment) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You already have an active appointment for this schedule.",
    );
  }

  const newAppointment = await prisma.$transaction(async (tnx) => {
    const appointmentData = await tnx.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        scheduleId: payload.scheduleId,
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

    return {
      appointmentId: appointmentData.id,
      paymentId: payment.id,
      amount: payment.amount,
      doctorName: doctor.name,
    };
  });

  const sessionData = {
    appointmentId: newAppointment.appointmentId,
    paymentId: newAppointment.paymentId,
    appointmentFee: newAppointment.amount,
    docotorName: newAppointment.doctorName,
  };

  const paymentSession = await createPaymentSession(
    sessionData,
    `doctor-sheba-checkout-${newAppointment.paymentId}`,
  );
  await prisma.payment.update({
    where: {
      id: newAppointment.paymentId,
    },
    data: {
      stripeCheckoutSessionId: paymentSession.id,
      checkoutSessionUrl: paymentSession.url,
      expiresAt: new Date(paymentSession.expires_at * 1000),
    },
  });
  return { newAppointment, session_url: paymentSession.url };
};

const myAppointmentsService = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const { startDate, endDate } = query;
  const { where, options } = new QueryBuilder(query)
    .sort()
    .filter()
    .pagination()
    .build();
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

  if (query.searchTerm) {
    const searchTerm = query.searchTerm;

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
          OR: [
            {
              [relationField]: {
                name: { contains: searchTerm, mode: "insensitive" },
              },
            },
            {
              [relationField]: {
                email: { contains: searchTerm, mode: "insensitive" },
              },
            },
          ],
        },
      ];
    }
  }

  if (startDate || endDate) {
    where.schedule = where.schedule || {};
    where.schedule.startDateTime = {};

    if (startDate) {
      where.schedule.startDateTime.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.schedule.startDateTime.lte = end;
    }
  }
  const appointments = await prisma.appointment.findMany({
    where: {
      ...where,
    },
    ...options,
    include: {
      schedule: true,
      patient: user.role === UserRole.DOCTOR,
      doctor: user.role === UserRole.PATIENT,
    },
  });
  const total = await prisma.appointment.count({
    where: {
      ...where,
    },
  });
  const limit = Number(query.limit) || 10;
  return {
    data: appointments,
    meta: {
      total,
      page: Number(query.page) || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSingleAppointmentService = async (user: JwtPayload, id: string) => {
  const where: any = {};
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

  const appointment = await prisma.appointment.findFirstOrThrow({
    where: {
      ...where,
      id,
    },
    include: {
      schedule: true,
      patient: true,
      doctor: true,
      payments: true,
    },
  });

  return appointment;
};

const getAppointmentsService = async (query: Record<string, any>) => {
  const { startDate, endDate } = query;
  const { where, options } = new QueryBuilder(query)
    .sort()
    .filter()
    .pagination()
    .build();

  if (query.searchTerm) {
    const searchTerm = query.searchTerm;

    const relationField = "patient";

    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          {
            [relationField]: {
              name: { contains: searchTerm, mode: "insensitive" },
            },
          },
          {
            [relationField]: {
              email: { contains: searchTerm, mode: "insensitive" },
            },
          },
        ],
      },
    ];
  }

  if (startDate || endDate) {
    where.schedule = where.schedule || {};
    where.schedule.startDateTime = {};

    if (startDate) {
      where.schedule.startDateTime.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.schedule.startDateTime.lte = end;
    }
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      ...where,
    },
    ...options,
    include: {
      schedule: true,
      patient: true,
      doctor: true,
    },
  });

  const total = await prisma.appointment.count({
    where: {
      ...where,
    },
  });

  const limit = Number(query.limit) || 10;
  return {
    data: appointments,
    meta: {
      total,
      page: Number(query.page) || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
const updateAppointmentStatusService = async (
  appointmentId: string,
  status: AppointmentStatus,
  user: JwtPayload,
) => {
  if (!Object.values(AppointmentStatus).includes(status)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid appointment status");
  }

  const isDoctor = user.role === UserRole.DOCTOR;
  const isAdmin =
    user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

  if (!isDoctor && !isAdmin) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to update appointment status",
    );
  }

  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: appointmentId,
    },
    include: {
      doctor: { select: { email: true } },
      payments: true,
    },
  });

  if (isDoctor && user.email !== appointmentData.doctor.email) {
    throw new AppError(httpStatus.FORBIDDEN, "This is not your appointment");
  }

  const currentStatus = appointmentData.status;

  if (currentStatus === status) {
    return appointmentData;
  }

  if (isDoctor) {
    const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.SCHEDULED]: [AppointmentStatus.CANCELED,AppointmentStatus.INPROGRESS],
      [AppointmentStatus.INPROGRESS]: [AppointmentStatus.COMPLETED],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.CANCELED]: [],
    };

    if (!allowedTransitions[currentStatus].includes(status)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot change appointment status from ${currentStatus} to ${status}`,
      );
    }
  }

  const isCancelling = status === AppointmentStatus.CANCELED;
  let refundId: string | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.updateMany({
      where: {
        id: appointmentId,
        status: currentStatus,
      },
      data: {
        status,
      },
    });

    if (updated.count === 0) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Appointment status has already changed",
      );
    }

    if (isCancelling) {
      await tx.doctorSchedules.update({
        where: {
          doctorId_scheduleId: {
            doctorId: appointmentData.doctorId,
            scheduleId: appointmentData.scheduleId,
          },
        },
        data: {
          isBooked: false,
        },
      });

      const payment = await tx.payment.findFirst({
        where: {
          appointmentId,
        },
      });

      const isPaid = payment?.status === PaymentStatus.PAID;
      if (isPaid) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUND_PENDING,
          },
        });

        const refund = await tx.refund.create({
          data: {
            paymentId: payment.id,
            amount: payment.amount,
            reason: "DOCTOR_CANCELLED",
            status: RefundStatus.PENDING,
          },
        });
        refundId = refund.id;
      }
    }

    return tx.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
    });
  });

  if (isCancelling && refundId) {
    await refundQueue.add(
      "process-refund",
      { refundId },
      {
        jobId: `refund-${refundId}`,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    );
  }

  return result;
};

const cancelUnpaidAppointmentsService = async () => {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  const unPaidAppointments = await prisma.appointment.findMany({
    where: {
      createdAt: {
        lte: thirtyMinAgo,
      },
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  const appointmentIdsToCancel = unPaidAppointments.map(
    (appointment) => appointment.id,
  );

  await prisma.$transaction(async (tnx) => {
    await tnx.appointment.updateMany({
      where: {
        id: {
          in: appointmentIdsToCancel,
        },
      },
      data: {
        status: AppointmentStatus.CANCELED,
      },
    });

    await tnx.payment.deleteMany({
      where: {
        appointmentId: {
          in: appointmentIdsToCancel,
        },
      },
    });

    // Free up doctor schedules
    for (const unPaidAppointment of unPaidAppointments) {
      await tnx.doctorSchedules.update({
        where: {
          doctorId_scheduleId: {
            doctorId: unPaidAppointment.doctorId,
            scheduleId: unPaidAppointment.scheduleId,
          },
        },
        data: {
          isBooked: false,
        },
      });
    }
  });
};

export const appointmentServices = {
  createAppointmentService,
  myAppointmentsService,
  getSingleAppointmentService,
  getAppointmentsService,
  updateAppointmentStatusService,
  cancelUnpaidAppointmentsService,
};
