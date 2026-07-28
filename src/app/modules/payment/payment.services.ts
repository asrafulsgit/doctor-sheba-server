import { Request, Response } from "express";
import { PaymentStatus } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
import { stripe } from "../../config/stripe";
import { envVars } from "../../config";
import AppError from "../../errorHelpers/appError";
import { prisma } from "../../shared/prisma";
import QueryBuilder from "../../utils/queryBuilder";
import httpStatus from "http-status";
import { GetPatientPaymentsQuery } from "./payment.validation";

export const stripeWebhook = async (req: Request, res: Response) => {
  let event = req.body;
  const endpointSecret = envVars.STRIPE_WEBHOOK_SECRET;

  if (endpointSecret) {
    const signature = req.headers["stripe-signature"] as string;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret,
      );
    } catch (err: any) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error ${err.message}`);
    }
  }

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as any;
      const appointmentId = session.metadata?.appointmentId;
      const paymentId = session.metadata?.paymentId;

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          paymentStatus:
            session.payment_status === "paid"
              ? PaymentStatus.PAID
              : PaymentStatus.UNPAID,
        },
      });
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status:
            session.payment_status === "paid"
              ? PaymentStatus.PAID
              : PaymentStatus.UNPAID,
          paymentGatewayData: {
            currency: session.currency,
            customer_details: session.customer_details,
            method: session.payment_method_types,
          },
        },
      });
      break;
    case "payment_intent.payment_failed":
      const failedIntent = event.data.object as any;
      console.log("Payment failed:", failedIntent.id);
      break;
    case "charge.refunded":
      const refund = event.data.object as any;
      console.log("Refund processed:", refund.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  res.json({ received: true });
};

const getPatientPaymentsService = async (
  user: JwtPayload,
  query: GetPatientPaymentsQuery,
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
  query: Record<string, any>,
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

export const paymentServices = {
  getPatientPaymentsService,
  getDoctorEarningsService,
};
