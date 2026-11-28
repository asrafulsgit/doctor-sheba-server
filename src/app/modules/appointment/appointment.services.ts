import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { createPaymentSession } from "../../utils/paymentSession";
import { v4 as uuidv4 } from "uuid";
import QueryBuilder from "../../utils/queryBuilder";
import {
  AppointmentStatus,
  AttendanceStatus,
  PaymentStatus,
  RefundStatus,
  UserRole,
} from "@prisma/client";
import { refundQueue } from "../../utils/queues";
import { format } from "date-fns";

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
const joinAppointmentService = async (
  user: JwtPayload,
  appointmentId: string,
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      schedule: true,
      patient: true,
      doctor: true,
    },
  });

  if (!appointment) {
    throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
  }

  const isDoctor = user.role === UserRole.DOCTOR;

  const isOwner = isDoctor
    ? appointment.doctor.email === user.email
    : appointment.patient.email === user.email;

  if (!isOwner) {
    throw new AppError(httpStatus.BAD_REQUEST, "This is not your appointment");
  }

  if (appointment.paymentStatus !== PaymentStatus.PAID) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Payment status: ${appointment.paymentStatus}`,
    );
  }

  if (appointment.status !== AppointmentStatus.SCHEDULED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Appointment status: ${appointment.status}`,
    );
  }

  const now = new Date();
  const startTime = appointment.schedule.startDateTime;

  const deadline = new Date(startTime.getTime() + 15 * 60 * 1000);

  const formattedStartTime = format(startTime, "dd MMM yyyy, hh:mm a");

  const formattedDeadline = format(deadline, "dd MMM yyyy, hh:mm a");

  if (now < startTime) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `The appointment joining window will start at ${formattedStartTime}. Please try again at the scheduled time.`,
    );
  }

  if (now >= deadline) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `The appointment joining window expired at ${formattedDeadline}.`,
    );
  }

  const result = await prisma.appointment.updateMany({
    where: {
      id: appointmentId,
      status: AppointmentStatus.SCHEDULED,
      paymentStatus: PaymentStatus.PAID,
      ...(isDoctor ? { doctorJoinedAt: null } : { patientJoinedAt: null }),
    },
    data: isDoctor ? { doctorJoinedAt: now } : { patientJoinedAt: now },
  });

  if (result.count === 0) {
    const latestAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        status: true,
        paymentStatus: true,
        doctorJoinedAt: true,
        patientJoinedAt: true,
      },
    });

    const alreadyJoined = isDoctor
      ? latestAppointment?.doctorJoinedAt
      : latestAppointment?.patientJoinedAt;

    if (
      !alreadyJoined ||
      latestAppointment?.status !== AppointmentStatus.SCHEDULED ||
      latestAppointment?.paymentStatus !== PaymentStatus.PAID
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Unable to join this appointment. Please try again.",
      );
    }
  }

  return {
    meetingLink: appointment.videoCallingLink,
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
      [AppointmentStatus.SCHEDULED]: [
        AppointmentStatus.CANCELED,
        AppointmentStatus.INPROGRESS,
      ],
      [AppointmentStatus.INPROGRESS]: [AppointmentStatus.COMPLETED],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.CANCELED]: [],
      [AppointmentStatus.MISSED]: [],
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
            reason: "Doctor cancelled",
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

const checkExpiredAppointmentsAttendanceService = async () => {
  const now = new Date();

  const attendanceDeadline = new Date(now.getTime() - 15 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.SCHEDULED,
      paymentStatus: PaymentStatus.PAID,
      attendanceStatus: AttendanceStatus.NOT_STARTED,
      schedule: {
        is: {
          startDateTime: {
            lte: attendanceDeadline,
          },
        },
      },
    },
    select: {
      id: true,
      doctorJoinedAt: true,
      patientJoinedAt: true,
    },
  });

  if (!appointments.length) return;

  let processed = 0;
  let refunded = 0;

  for (const appointment of appointments) {
    const doctorJoined = !!appointment.doctorJoinedAt;
    const patientJoined = !!appointment.patientJoinedAt;

    let attendanceStatus: AttendanceStatus;

    if (doctorJoined && patientJoined) {
      attendanceStatus = AttendanceStatus.BOTH_PRESENT;
    } else if (!doctorJoined && patientJoined) {
      attendanceStatus = AttendanceStatus.DOCTOR_ABSENT;
    } else if (doctorJoined && !patientJoined) {
      attendanceStatus = AttendanceStatus.PATIENT_ABSENT;
    } else {
      attendanceStatus = AttendanceStatus.BOTH_ABSENT;
    }

    let refundId: string | null = null;
    const finalized = await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.updateMany({
        where: {
          id: appointment.id,
          status: AppointmentStatus.SCHEDULED,
          paymentStatus: PaymentStatus.PAID,
          attendanceStatus: AttendanceStatus.NOT_STARTED,
        },
        data: {
          attendanceStatus,
          ...(attendanceStatus !== AttendanceStatus.BOTH_PRESENT && {
            status: AppointmentStatus.MISSED,
          }),
        },
      });

      if (updated.count === 0) return false;

      if (attendanceStatus === AttendanceStatus.DOCTOR_ABSENT) {
        const payment = await tx.payment.findFirst({
          where: {
            appointmentId: appointment.id,
            status: PaymentStatus.PAID,
          },
        });

        if (!payment) {
          throw new AppError(
            httpStatus.NOT_FOUND,
            "Paid payment record not found",
          );
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.REFUND_PENDING },
        });

        const refund = await tx.refund.create({
          data: {
            paymentId: payment.id,
            amount: payment.amount,
            reason: "Doctor absent",
            status: RefundStatus.PENDING,
          },
        });

        refundId = refund.id;
      }

      return true;
    });

    if (!finalized) continue;

    processed++;

    if (refundId) {
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

      refunded++;
    }
  }

  console.log({
    message: "Appointment attendance check completed",
    totalFound: appointments.length,
    totalProcessed: processed,
    totalRefundsQueued: refunded,
  });

  return {
    totalFound: appointments.length,
    totalProcessed: processed,
    totalRefundsQueued: refunded,
  };
};

export const appointmentServices = {
  createAppointmentService,
  myAppointmentsService,
  getSingleAppointmentService,
  getAppointmentsService,
  joinAppointmentService,
  updateAppointmentStatusService,
  cancelUnpaidAppointmentsService,
  checkExpiredAppointmentsAttendanceService,
};
