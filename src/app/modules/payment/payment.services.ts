import { Request, Response } from "express";
import { PaymentStatus, Prisma } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
import { stripe } from "../../config/stripe";
import { envVars } from "../../config";
import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import httpStatus from "http-status";
import { GetPaymentsQuery } from "./payment.validation";
import Stripe from "stripe";
import { meetingQueue } from "../../utils/queues";

const markPaymentAsPaidAndQueueMeeting = async (
  appointmentId: string,
  paymentId: string,
  paymentGatewayData: Prisma.InputJsonValue,
) => {
  const paymentMatchesAppointment = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: { appointmentId: true },
    });

    if (!payment || payment.appointmentId !== appointmentId) {
      return false;
    }

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { paymentStatus: PaymentStatus.PAID },
    });

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paymentGatewayData,
      },
    });

    return true;
  });

  if (!paymentMatchesAppointment) {
    throw new Error(
      `Stripe payment does not match appointment ${appointmentId}`,
    );
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

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status !== "paid") {
        break;
      }

      const appointmentId = session.metadata?.appointmentId;
      const paymentId = session.metadata?.paymentId;

      if (!appointmentId || !paymentId) {
        console.error("Missing appointment or payment metadata", session.id);
        return res.status(400).send("Missing appointment or payment metadata");
      }

      await markPaymentAsPaidAndQueueMeeting(appointmentId, paymentId, {
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
                    postal_code: session.customer_details.address.postal_code,
                    state: session.customer_details.address.state,
                  }
                : null,
            }
          : null,
        method: session.payment_method_types,
      });

      break;
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const appointmentId = paymentIntent.metadata.appointmentId;
      const paymentId = paymentIntent.metadata.paymentId;

      if (!appointmentId || !paymentId) {
        console.error(
          "Missing appointment or payment metadata",
          paymentIntent.id,
        );
        return res.status(400).send("Missing appointment or payment metadata");
      }

      await markPaymentAsPaidAndQueueMeeting(appointmentId, paymentId, {
        paymentIntentId: paymentIntent.id,
        currency: paymentIntent.currency,
        method: paymentIntent.payment_method_types,
      });

      break;
    }
    case "payment_intent.payment_failed":
    case "charge.refunded":
      console.info(`Received Stripe event: ${event.type}`);
      break;
    default:
      console.info(`Unhandled Stripe event type: ${event.type}`);
  }
  res.json({ received: true });
};

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

  const paymentsall = await prisma.payment.findMany();

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
      paymentsall,
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

export const paymentServices = {
  getPatientPaymentsService,
  getDoctorEarningsService,
  getAllPaymentsService,
};
