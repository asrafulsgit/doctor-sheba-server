import { Worker, Job } from "bullmq";
import Stripe from "stripe";
import { stripe } from "../config/stripe";
import { bullmqConnectionOptions } from "../config/redis";
import { PaymentStatus, RefundStatus } from "@prisma/client";
import { RefundJobData } from "../utils/queues";
import { prisma } from "../shared/prisma";
import AppError from "../errorHelpers/appError";
import statusCode from "http-status";

const processRefund = async (job: Job<RefundJobData>) => {
  const { refundId } = job.data;

  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      payment: {
        include: {
          appointment: true,
        },
      },
    },
  });

  if (!refund) {
    throw new AppError(statusCode.NOT_FOUND, `Refund ${refundId} not found`);
  }

  const payment = refund.payment;

  if (!payment.stripePaymentIntentId) {
    throw new AppError(statusCode.NOT_FOUND,`Payment ${payment.id} has no Stripe PaymentIntent`);
  }

  if (refund.status === RefundStatus.SUCCEEDED) {
    return;
  }

  let stripeRefund: Stripe.Refund;

  if (refund.stripeRefundId) {
    stripeRefund = await stripe.refunds.retrieve(refund.stripeRefundId);
  } else {
    stripeRefund = await stripe.refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        metadata: {
          refundId: refund.id,
          paymentId: payment.id,
          appointmentId: payment.appointmentId,
        },
      },
      {
        idempotencyKey: `doctor-sheba-refund-${refund.id}`,
      },
    );
  }

  // Synchronize Stripe's response.
  await syncRefundResult(refund.id, stripeRefund);

  console.info("Stripe refund synchronized", {
    refundId: refund.id,
    stripeRefundId: stripeRefund.id,
    stripeStatus: stripeRefund.status,
  });
};

const syncRefundResult = async (
  refundId: string,
  stripeRefund: Stripe.Refund,
) => {
  await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUniqueOrThrow({
      where: { id: refundId },
      include: {
        payment: true,
      },
    });

    // Map Stripe's actual refund status.
    if (stripeRefund.status === "succeeded") {
      await tx.refund.update({
        where: { id: refundId },
        data: {
          stripeRefundId: stripeRefund.id,
          status: RefundStatus.SUCCEEDED
        },
      });

      await tx.payment.update({
        where: { id: refund.paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      await tx.appointment.update({
        where: { id: refund.payment.appointmentId },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });

      return;
    }

    if (
      stripeRefund.status === "failed" ||
      stripeRefund.status === "canceled"
    ) {
      await tx.refund.update({
        where: { id: refundId },
        data: {
          stripeRefundId: stripeRefund.id,
          status: RefundStatus.FAILED,
          failureReason: stripeRefund.failure_reason ?? "Stripe refund failed",
        },
      });

      await tx.payment.update({
        where: { id: refund.paymentId },
        data: {
          status: PaymentStatus.REFUND_FAILED,
        },
      });

      await tx.appointment.update({
        where: { id: refund.payment.appointmentId },
        data: {
          paymentStatus: PaymentStatus.REFUND_FAILED,
        },
      });

      return;
    }

    // pending or requires_action
    await tx.refund.update({
      where: { id: refundId },
      data: {
        stripeRefundId: stripeRefund.id,
        status: RefundStatus.PENDING,
      },
    });

    await tx.payment.update({
      where: { id: refund.paymentId },
      data: {
        status: PaymentStatus.REFUND_PENDING,
      },
    });

    await tx.appointment.update({
      where: { id: refund.payment.appointmentId },
      data: {
        paymentStatus: PaymentStatus.REFUND_PENDING,
      },
    });
  });
};

export const refundWorker = new Worker<RefundJobData>(
  "appointment-refunds",
  processRefund,
  {
    connection: bullmqConnectionOptions,
  },
);

refundWorker.on("ready", () => {
  console.info("Refund queue worker is ready");
});

refundWorker.on("completed", (job) => {
  console.info(`Refund queue completed: ${job.id}`);
});

refundWorker.on("failed", (job, error) => {
  console.error(`Refund queue failed: ${job?.id}`, error);
});

refundWorker.on("error", (error) => {
  console.error("Refund queue error:", error);
});
