import { Request, Response } from "express";
import {
  AppointmentStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
  UserRole,
} from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
import { stripe } from "../../config/stripe";
import { envVars } from "../../config";
import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import httpStatus from "http-status";
import { GetPaymentsQuery, GetRefundsQuery } from "./payment.validation";
import Stripe from "stripe";
import { meetingQueue, refundQueue } from "../../utils/queues";

const getPatientPaymentsService = async (
  user: JwtPayload,
  query: GetPaymentsQuery,
) => {
  const patient = await prisma.patient.findUnique({
    where: { email: user.email },
    select: { id: true },
  });

  if (!patient) {
    throw new AppError(httpStatus.NOT_FOUND, "Patient not found");
  }

  const { where: queryWhere, options } = new QueryBuilder(query)
    .search(["transactionId"])
    .filter()
    .sort()
    .pagination()
    .build();

  const where: any = {
    ...queryWhere,
    appointment: {
      patientId: patient.id,
    },
  };

  const payments = await prisma.payment.findMany({
    where,
    ...options,
    include: {
      appointment: {
        select: {
          id: true,
          status: true,
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePhoto: true,
              designation: true,
              appointmentFee: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.payment.count({ where });
  const paidAmount = payments
    .filter((payment) => payment.status === PaymentStatus.PAID)
    .reduce((sum, payment) => sum + payment.amount, 0);

  const dueAmount = payments
    .filter((payment) => payment.status !== PaymentStatus.PAID)
    .reduce((sum, payment) => sum + payment.amount, 0);

  const limit = Number(query.limit) || 10;

  return {
    data: {
      paid: paidAmount,
      due: dueAmount,
      transactions: payments.length,
      payments,
    },
    meta: {
      total,
      page: Number(query.page) || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getDoctorEarningsService = async (
  user: JwtPayload,
  query: GetPaymentsQuery,
) => {
  const { startDate, endDate, page, limit = 30 } = query;
  const now = new Date();
  const last7Days = new Date(now);
  last7Days.setDate(now.getDate() - 7);
  last7Days.setHours(0, 0, 0, 0);

  const lastMonth = new Date(now);
  lastMonth.setMonth(now.getMonth() - 1);
  lastMonth.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const queryBuilder = new QueryBuilder(query)
    .search(["transactionId"])
    .filter()
    .sort()
    .pagination()
    .build();

  const where: any = {
    ...queryBuilder.where,
    appointment: { doctor: { email: user.email } },
  };

  if (startDate || endDate) {
    where.createdAt = {};

    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [
    totalAgg,
    last7DaysAgg,
    lastMonthAgg,
    sixMonthsPayments,
    recentPayments,
  ] = await Promise.all([
    // Total earnings + count of paid payments
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        appointment: { doctor: { email: user.email } },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Last 7 days
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        createdAt: { gte: last7Days },
        appointment: { doctor: { email: user.email } },
      },
      _sum: { amount: true },
    }),

    // Last month
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        createdAt: { gte: lastMonth },
        appointment: { doctor: { email: user.email } },
      },
      _sum: { amount: true },
    }),

    // For chart
    prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: { gte: sixMonthsAgo },
        appointment: { doctor: { email: user.email } },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    }),

    // Payments with patient data
    prisma.payment.findMany({
      where,
      ...queryBuilder.options,
      select: {
        id: true,
        appointmentId: true,
        amount: true,
        transactionId: true,
        status: true,
        createdAt: true,
        paymentGatewayData: true,
        appointment: {
          select: {
            patient: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePhoto: true,
                contactNumber: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // 3. Build last 6 months chart
  const chartMap = new Map<string, number>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - i);
    const label = d.toLocaleString("en-US", {
      month: "short",
      timeZone: "Asia/Dhaka",
    });
    chartMap.set(label, 0);
  }

  sixMonthsPayments.forEach((p) => {
    const label = p.createdAt.toLocaleString("en-US", {
      month: "short",
      timeZone: "Asia/Dhaka",
    });
    chartMap.set(label, (chartMap.get(label) ?? 0) + p.amount);
  });

  const last6MonthsEarningsChart = Array.from(chartMap.entries()).map(
    ([label, value]) => ({
      label,
      value: Number(value.toFixed(2)),
    }),
  );

  const total = await prisma.payment.count({
    where,
  });

  const limitNumber = Number(limit) || 30;
  return {
    meta: {
      total,
      page: Number(page) || 1,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: {
      totalEarnings: Number((totalAgg._sum.amount ?? 0).toFixed(2)),
      totalPaidPayments: totalAgg._count.id,
      last7DaysEarnings: Number((last7DaysAgg._sum.amount ?? 0).toFixed(2)),
      lastMonthEarnings: Number((lastMonthAgg._sum.amount ?? 0).toFixed(2)),
      last6MonthsEarningsChart,
      payments: recentPayments,
    },
  };
};

const getAllPaymentsService = async (queryParams: GetPaymentsQuery) => {
  const { startDate, endDate, page, limit } = queryParams;
  const queryBuilder = new QueryBuilder(queryParams);

  const { where, options } = queryBuilder.filter().sort().pagination().build();

  const searchTerm = queryParams.searchTerm?.trim();
  const searchCondition = searchTerm
    ? {
        OR: [
          {
            appointment: {
              patient: {
                name: { contains: searchTerm, mode: "insensitive" as const },
              },
            },
          },
          {
            appointment: {
              doctor: {
                name: { contains: searchTerm, mode: "insensitive" as const },
              },
            },
          },
          {
            transactionId: {
              contains: searchTerm,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};
  console.log(startDate);
  if (startDate || endDate) {
    where.updatedAt = where.updatedAt || {};
    where.updatedAt = {};

    if (startDate) {
      where.updatedAt.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.updatedAt.lte = end;
    }
  }

  const finalWhere = {
    AND: [where, searchCondition],
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: finalWhere,
      ...options,

      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true,
            schedule: true,
          },
        },
      },
    }),

    prisma.payment.count({
      where: finalWhere,
    }),
  ]);

  // Current running month
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [paidAmount, unPaidAmount, currentMonthPaidAmount] = await Promise.all([
    // Total paid
    prisma.payment.aggregate({
      where: {
        status: "PAID",
      },
      _sum: {
        amount: true,
      },
    }),

    // Total unpaid
    prisma.payment.aggregate({
      where: {
        status: "UNPAID",
      },
      _sum: {
        amount: true,
      },
    }),

    // Current month's paid amount
    prisma.payment.aggregate({
      where: {
        status: "PAID",
        createdAt: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  return {
    meta: {
      total,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      totalPages: Math.ceil(total / (Number(limit) || 10)),
    },

    data: {
      payments,
      stats: {
        paidAmount: paidAmount._sum.amount ?? 0,
        unPaidAmount: unPaidAmount._sum.amount ?? 0,
        currentMonthPaidAmount: currentMonthPaidAmount._sum.amount ?? 0,
      },
    },
  };
};

const getRefundsService = async (user: JwtPayload, query: GetRefundsQuery) => {
  const isPatient = user.role === UserRole.PATIENT;
  const isDoctor = user.role === UserRole.DOCTOR;

  let ownerId: string | undefined;

  if (isPatient) {
    const patient = await prisma.patient.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (!patient) {
      throw new AppError(httpStatus.NOT_FOUND, "Patient not found");
    }

    ownerId = patient.id;
  }

  if (isDoctor) {
    const doctor = await prisma.doctor.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (!doctor) {
      throw new AppError(httpStatus.NOT_FOUND, "Doctor not found");
    }

    ownerId = doctor.id;
  }

  const { where: queryWhere, options } = new QueryBuilder(query)
    .search(["payment.transactionId"])
    .filter()
    .sort()
    .pagination()
    .build();

  const where: Prisma.RefundWhereInput = {
    ...queryWhere,

    ...(isPatient && {
      payment: {
        appointment: {
          patientId: ownerId,
        },
      },
    }),

    ...(isDoctor && {
      payment: {
        appointment: {
          doctorId: ownerId,
        },
      },
    }),
  };

  const [refunds, total] = await prisma.$transaction([
    prisma.refund.findMany({
      where,
      ...options,
      include: {
        payment: {
          include: {
            appointment: {
              select: {
                id: true,
                status: true,
                patient: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
                doctor: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profilePhoto: true,
                    designation: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.refund.count({ where }),
  ]);

  const limit = Number(query.limit) || 10;
  const page = Number(query.page) || 1;

  return {
    data: refunds,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];

  if (!Buffer.isBuffer(req.body) || typeof signature !== "string") {
    return res.status(400).send("Invalid Stripe webhook request");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      envVars.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return res.status(400).send("Invalid Stripe webhook signature");
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;

        if (session.payment_status !== "paid") {
          break;
        }

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;

        if (!paymentIntentId) {
          console.error("Stripe PaymentIntent ID not found");
          return res.status(400).send("Stripe PaymentIntent ID not found");
        }

        const appointmentId = session.metadata?.appointmentId;
        const paymentId = session.metadata?.paymentId;

        if (!paymentIntentId || !appointmentId || !paymentId) {
          console.error("Missing payment information in Checkout Session", {
            sessionId: session.id,
            appointmentId,
            paymentId,
            paymentIntentId,
          });

          break;
        }

        await markPaymentAsPaidAndQueueMeeting(
          appointmentId,
          paymentId,
          {
            currency: session.currency,
            customer_details: session.customer_details
              ? {
                  name: session.customer_details.name,
                  email: session.customer_details.email,
                  phone: session.customer_details.phone,
                  address: session.customer_details.address
                    ? {
                        city: session.customer_details.address.city,
                        country: session.customer_details.address.country,
                        line1: session.customer_details.address.line1,
                        line2: session.customer_details.address.line2,
                        postal_code:
                          session.customer_details.address.postal_code,
                        state: session.customer_details.address.state,
                      }
                    : null,
                }
              : null,
            method: session.payment_method_types,
          },
          paymentIntentId,
        );

        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object;

        const appointmentId = session.metadata?.appointmentId;
        const paymentId = session.metadata?.paymentId;

        if (!appointmentId || !paymentId) {
          console.error("Missing metadata on failed Checkout Session", {
            sessionId: session.id,
          });
          break;
        }

        await markCheckoutPaymentAsFailed(appointmentId, paymentId);

        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;

        const appointmentId = session.metadata?.appointmentId;
        const paymentId = session.metadata?.paymentId;

        if (!appointmentId || !paymentId) {
          console.error("Missing metadata on expired Checkout Session", {
            sessionId: session.id,
          });
          break;
        }

        await markCheckoutSessionAsExpired(
          appointmentId,
          paymentId,
          session.id,
        );

        break;
      }
      case "refund.created":
      case "refund.updated":
      case "refund.failed": {
        const refund = event.data.object as Stripe.Refund;

        await syncRefundStatus(refund);

        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;

        console.info("Payment attempt failed:", paymentIntent.id);
        break;
      }
      case "charge.refunded": {
        console.info("Charge refunded:", event.data.object.id);
        break;
      }

      default:
        console.info(`Unhandled Stripe event type: ${event.type}`);
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook processing failed (${event.type}):`, error);
    return res.status(500).send("Webhook processing failed");
  }
};

const markPaymentAsPaidAndQueueMeeting = async (
  appointmentId: string,
  paymentId: string,
  paymentGatewayData: Prisma.InputJsonValue,
  paymentIntentId: string,
) => {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        appointmentId: true,
        amount: true,
        refunds: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!payment || payment.appointmentId !== appointmentId) {
      throw new Error(
        `Stripe payment does not match appointment ${appointmentId}`,
      );
    }

    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      select: { status: true },
    });

    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    if (appointment.status === AppointmentStatus.CANCELED) {
      let refund = payment.refunds[0];

      // Create a refund only once for this payment.
      if (!refund) {
        refund = await tx.refund.create({
          data: {
            paymentId: payment.id,
            amount: payment.amount,
            status: RefundStatus.PENDING,
          },
          select: {
            id: true,
            status: true,
          },
        });
      }

      const paymentStatus =
        refund.status === RefundStatus.SUCCEEDED
          ? PaymentStatus.REFUNDED
          : refund.status === RefundStatus.FAILED
            ? PaymentStatus.REFUND_FAILED
            : PaymentStatus.REFUND_PENDING;

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: paymentStatus,
          paymentGatewayData,
          stripePaymentIntentId: paymentIntentId,
        },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { paymentStatus },
      });

      return {
        type: "REFUND" as const,
        refundId: refund.id,
        refundStatus: refund.status,
      };
    }

    // Normal successful payment.
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paymentGatewayData,
        stripePaymentIntentId: paymentIntentId,
      },
    });

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { paymentStatus: PaymentStatus.PAID },
    });

    return {
      type: "MEETING" as const,
      appointmentStatus: appointment.status,
    };
  });

  if (result.type === "REFUND") {
    if (
      result.refundStatus === RefundStatus.PENDING ||
      result.refundStatus === RefundStatus.PROCESSING
    ) {
      const job = await refundQueue.add(
        "process-refund",
        { refundId: result.refundId },
        {
          jobId: `refund-${result.refundId}`,
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        },
      );

      console.info("Queued refund for canceled appointment", {
        appointmentId,
        paymentId,
        refundId: result.refundId,
        jobId: job.id,
      });
    } else {
      console.info("Refund already finalized; no new job queued", {
        appointmentId,
        refundId: result.refundId,
        refundStatus: result.refundStatus,
      });
    }

    return;
  }

  if (result.appointmentStatus !== AppointmentStatus.SCHEDULED) {
    return;
  }

  const job = await meetingQueue.add(
    "create-google-meet",
    { appointmentId },
    {
      jobId: `google-meet-${appointmentId}`,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );

  console.info("Queued meeting creation after successful payment", {
    appointmentId,
    jobId: job.id,
  });
};

const syncRefundStatus = async (stripeRefund: Stripe.Refund) => {
  const internalRefundId = stripeRefund.metadata?.refundId;

  const refund = await prisma.refund.findFirst({
    where: {
      OR: [
        { stripeRefundId: stripeRefund.id },
        ...(internalRefundId ? [{ id: internalRefundId }] : []),
      ],
    },
    include: {
      payment: {
        select: {
          id: true,
          appointmentId: true,
        },
      },
    },
  });

  if (!refund) {
    throw new Error(
      `Refund record not found for Stripe refund: ${stripeRefund.id}`,
    );
  }

  let refundStatus: RefundStatus;
  let paymentStatus: PaymentStatus;

  switch (stripeRefund.status) {
    case "succeeded":
      refundStatus = RefundStatus.SUCCEEDED;
      paymentStatus = PaymentStatus.REFUNDED;
      break;

    case "failed":
    case "canceled":
      refundStatus = RefundStatus.FAILED;
      paymentStatus = PaymentStatus.REFUND_FAILED;
      break;

    case "pending":
    case "requires_action":
    default:
      refundStatus = RefundStatus.PROCESSING;
      paymentStatus = PaymentStatus.REFUND_PENDING;
      break;
  }

  const failureReason =
    stripeRefund.failure_reason ??
    (stripeRefund.status === "canceled" ? "Refund canceled by Stripe" : null);

  return prisma.$transaction(async (tx) => {
    const updatedRefund = await tx.refund.update({
      where: { id: refund.id },
      data: {
        stripeRefundId: stripeRefund.id,
        status: refundStatus,
        failureReason,
      },
    });

    await tx.payment.update({
      where: { id: refund.paymentId },
      data: {
        status: paymentStatus,
      },
    });

    await tx.appointment.update({
      where: { id: refund.payment.appointmentId },
      data: {
        paymentStatus,
      },
    });

    return updatedRefund;
  });
};

const markCheckoutPaymentAsFailed = async (
  appointmentId: string,
  paymentId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    if (payment.appointmentId !== appointmentId) {
      throw new Error("Payment does not belong to this appointment");
    }

    if (payment.status !== PaymentStatus.UNPAID) {
      return payment;
    }

    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentStatus: PaymentStatus.FAILED,
      },
    });

    return updatedPayment;
  });
};

const markCheckoutSessionAsExpired = async (
  appointmentId: string,
  paymentId: string,
  stripeSessionId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: {
        id: paymentId,
      },
      select: {
        id: true,
        appointmentId: true,
        status: true,
        stripeCheckoutSessionId: true,
      },
    });

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    if (payment.appointmentId !== appointmentId) {
      throw new Error("Payment does not belong to this appointment");
    }

    if (payment.stripeCheckoutSessionId !== stripeSessionId) {
      console.warn("Checkout Session ID mismatch", {
        paymentId,
        expected: payment.stripeCheckoutSessionId,
        received: stripeSessionId,
      });

      return { expired: false, reason: "SESSION_MISMATCH" };
    }

    if (payment.status !== PaymentStatus.UNPAID) {
      return {
        expired: false,
        reason: "PAYMENT_ALREADY_PROCESSED",
      };
    }

    const appointment = await tx.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        doctorId: true,
        scheduleId: true,
      },
    });

    if (!appointment) {
      throw new Error(`Appointment not found: ${appointmentId}`);
    }

    // Conditionally transition the payment.
    const paymentUpdate = await tx.payment.updateMany({
      where: {
        id: paymentId,
        appointmentId,
        status: PaymentStatus.UNPAID,
        stripeCheckoutSessionId: stripeSessionId,
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    if (paymentUpdate.count === 0) {
      return {
        expired: false,
        reason: "PAYMENT_ALREADY_PROCESSED",
      };
    }

    const anotherSuccessfulPayment = await tx.payment.findFirst({
      where: {
        appointmentId,
        id: {
          not: paymentId,
        },
        status: {
          in: [
            PaymentStatus.PAID,
            PaymentStatus.REFUND_PENDING,
            PaymentStatus.REFUNDED,
          ],
        },
      },
      select: {
        id: true,
      },
    });

    if (anotherSuccessfulPayment) {
      return {
        expired: true,
        appointmentCancelled: false,
        reason: "ANOTHER_PAYMENT_EXISTS",
      };
    }

    const appointmentUpdate = await tx.appointment.updateMany({
      where: {
        id: appointmentId,
        status: AppointmentStatus.SCHEDULED,
        paymentStatus: PaymentStatus.UNPAID,
      },
      data: {
        status: AppointmentStatus.CANCELED,
        paymentStatus: PaymentStatus.FAILED,
      },
    });

    if (appointmentUpdate.count === 0) {
      return {
        expired: true,
        appointmentCancelled: false,
        reason: "APPOINTMENT_ALREADY_PROCESSED",
      };
    }

    await tx.doctorSchedules.updateMany({
      where: {
        doctorId: appointment.doctorId,
        scheduleId: appointment.scheduleId,
        isBooked: true,
      },
      data: {
        isBooked: false,
      },
    });

    return {
      expired: true,
      appointmentCancelled: true,
    };
  });
};

export const paymentServices = {
  getPatientPaymentsService,
  getDoctorEarningsService,
  getAllPaymentsService,
  getRefundsService
};
