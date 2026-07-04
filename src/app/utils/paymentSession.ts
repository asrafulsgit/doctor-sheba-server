import { stripe } from "../config/stripe";

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
}: IPaymentSession) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    success_url: `${process.env.STRIPE_SUCCESS_URL}?appointmentId=${appointmentId}&paymentId=${paymentId}`,
    cancel_url: `${process.env.STRIPE_CANCEL_URL}?appointmentId=${appointmentId}&paymentId=${paymentId}`,
    metadata: {
      appointmentId,
      paymentId
    },

    line_items: [
      {
        price_data: {
          currency: "bdt",

          product_data: {
            name: `Appointment with ${docotorName}`,
          },
          unit_amount: appointmentFee * 100,
        },

        quantity: 1,
      },
    ],
  });

  return session;
};
