import { Request, Response } from "express";
import { stripe } from "../../config/stripe";
import { prisma } from "../../shared/prisma";
import { PaymentStatus } from "@prisma/client";
import { envVars } from "../../config";

export const stripeWebhook = async (req : Request, res : Response) => {
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
