import Stripe from "stripe";
import { stripe } from "../config/stripe";
import AppError from "../errorHelpers/appError";
import statusCode from "http-status"
interface IPaymentSession {
  appointmentId: string;
  paymentId : string;
  appointmentFee: number;
  docotorName: string;
}

export const createPaymentSession = async ({
  appointmentId,
  paymentId,
  appointmentFee,
  docotorName,
}: IPaymentSession, idempotencyKey: string): Promise<Stripe.Checkout.Session> => {
  if (!Number.isFinite(appointmentFee) || appointmentFee <= 0) {
    throw new AppError(statusCode.BAD_REQUEST,"Invalid appointment fee");
  }
  const unitAmount = Math.round(appointmentFee * 100);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    success_url: `${process.env.STRIPE_SUCCESS_URL}?appointmentId=${appointmentId}&paymentId=${paymentId}`,
    cancel_url: `${process.env.STRIPE_CANCEL_URL}?appointmentId=${appointmentId}&paymentId=${paymentId}`,
    metadata: {
      appointmentId,
      paymentId
    },
    payment_intent_data: {
      metadata: {
        appointmentId,
        paymentId,
      },
    },

    line_items: [
      {
        price_data: {
          currency: "bdt",

          product_data: {
            name: `Appointment with ${docotorName}`,
          },
          unit_amount: unitAmount,
        },

        quantity: 1,
      },
    ],
  },{idempotencyKey});

  if (!session.url) {
    throw new AppError(statusCode.INTERNAL_SERVER_ERROR,"Stripe Checkout Session URL was not generated");
  }

  return session;
};
