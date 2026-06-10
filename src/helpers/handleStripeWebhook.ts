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



  let event: any;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Webhook signature verification failed: ${err.message || err}`
    );
  }

  const eventType = event.type;
  const data = event.data.object;



  try {
    switch (eventType) {
      case "customer.subscription.created":
     
        await handleSubscriptionCreated(data);
        break;

      case "customer.subscription.updated":

        await handleSubscriptionUpdated(data);
        break;

      case "customer.subscription.deleted":

        await handleSubscriptionDeleted(data);
        break;

      default:
        console.warn(`⚠️ Unhandled event: ${eventType}`);
        logger.warn(colors.yellow(`Unhandled event: ${eventType}`));
        break;
    }

  } catch (error: any) {
    console.error("❌ Webhook handler error:", error);

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Webhook handler error: ${error.message || error}`
    );
  }


  return res.status(200).json({ received: true });
};

export default handleStripeWebhook;