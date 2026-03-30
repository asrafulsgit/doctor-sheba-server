import Stripe from "stripe";
import { envVars } from ".";

export const stripe = new Stripe(envVars.STRIPE_SECRET_KEY);
