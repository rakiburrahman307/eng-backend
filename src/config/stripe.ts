import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const StripeCtor = (Stripe as any).default ?? Stripe;
const stripe = new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export default stripe;