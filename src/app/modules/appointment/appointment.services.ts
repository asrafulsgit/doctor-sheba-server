import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { createPaymentSession } from "../../utils/paymentSession";
import QueryBuilder from "../../utils/queryBuilder";
import { AppointmentStatus, PaymentStatus, UserRole } from "@prisma/client";

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
      paymentId: payment.id,
      appointmentFee: payment.amount,
      docotorName: doctor.name,
    };

    const paymentSession = await createPaymentSession(sessionData);
    return { session_url: paymentSession.url };
  });

  return newAppointment;
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

const getAppointmentsService = async (query: Record<string, any>) => {
  const { startDate, endDate } = query;
  const { where, options } = new QueryBuilder(query)
    .sort()
    .filter()
    .pagination()
    .build();

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
  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: appointmentId,
    },
    include: {
      doctor: true,
    },
  });

  if (user?.role === UserRole.DOCTOR) {
    if (!(user?.email === appointmentData.doctor.email))
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This is not your appointment",
      );
  }

  return await prisma.appointment.update({
    where: {
      id: appointmentId,
    },
    data: {
      status,
    },
  });
};


const cancelUnpaidAppointmentsService = async () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    const unPaidAppointments = await prisma.appointment.findMany({
        where: {
            createdAt: {
                lte: thirtyMinAgo
            },
            paymentStatus: PaymentStatus.UNPAID
        }
    })

    const appointmentIdsToCancel = unPaidAppointments.map(appointment => appointment.id);

    await prisma.$transaction(async (tnx) => {
         
        await tnx.appointment.updateMany({
            where: {
                id: {
                    in: appointmentIdsToCancel
                }
            },
            data: {
                status: AppointmentStatus.CANCELED
            }
        })

         
        await tnx.payment.deleteMany({
            where: {
                appointmentId: {
                    in: appointmentIdsToCancel
                }
            }
        })

        // Free up doctor schedules
        for (const unPaidAppointment of unPaidAppointments) {
            await tnx.doctorSchedules.update({
                where: {
                    doctorId_scheduleId: {
                        doctorId: unPaidAppointment.doctorId,
                        scheduleId: unPaidAppointment.scheduleId
                    }
                },
                data: {
                    isBooked: false
                }
            })
        }
    })
}
export const appointmentServices = {
  createAppointmentService,
  myAppointmentsService,
  getAppointmentsService,
  updateAppointmentStatusService,
  cancelUnpaidAppointmentsService
};
