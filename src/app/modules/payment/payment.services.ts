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
            currency : session.currency,
            customer_details : session.customer_details,
            method : session.payment_method_types
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

  const paymentsall = await prisma.payment.findMany( );

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
      paymentsall
    },
    meta: {
      total,
      page: Number(query.page) || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const paymentServices = {
  getPatientPaymentsService,
};
