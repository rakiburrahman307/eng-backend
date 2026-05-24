import { Request, Response } from "express";
import colors from "colors";
import { StatusCodes } from "http-status-codes";

import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from "../handlers";

import stripe from "../config/stripe";
import config from "../config";
import ApiError from "../errors/ApiErrors";
import { logger } from "../shared/logger";

const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  const webhookSecret = config.stripe.webhookSecret as string;

  console.log("========== STRIPE WEBHOOK START ==========");
  console.log("Headers signature:", signature);
  console.log("Webhook secret exists:", !!webhookSecret);

  let event: any;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    console.log("✅ Webhook event verified successfully");
    console.log("Event type:", event.type);
    console.log("Event ID:", event.id);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Webhook signature verification failed: ${err.message || err}`
    );
  }

  const eventType = event.type;
  const data = event.data.object;

  console.log("📦 Event Data Object:", JSON.stringify(data, null, 2));

  try {
    switch (eventType) {
      case "customer.subscription.created":
        console.log("🚀 Handling subscription CREATED event");
        await handleSubscriptionCreated(data);
        break;

      case "customer.subscription.updated":
        console.log("🔄 Handling subscription UPDATED event");
        await handleSubscriptionUpdated(data);
        break;

      case "customer.subscription.deleted":
        console.log("🗑️ Handling subscription DELETED event");
        await handleSubscriptionDeleted(data);
        break;

      default:
        console.warn(`⚠️ Unhandled event: ${eventType}`);
        logger.warn(colors.yellow(`Unhandled event: ${eventType}`));
        break;
    }

    console.log("✅ Webhook processing completed for:", eventType);
  } catch (error: any) {
    console.error("❌ Webhook handler error:", error);

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Webhook handler error: ${error.message || error}`
    );
  }

  console.log("========== STRIPE WEBHOOK END ==========");
  return res.status(200).json({ received: true });
};

export default handleStripeWebhook;