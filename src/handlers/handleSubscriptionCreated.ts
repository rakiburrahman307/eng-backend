import Stripe from "stripe";
import ApiError from "../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import stripe from "../config/stripe";

import { User } from "../app/modules/user/user.model";
import { Package } from "../app/modules/package/package.model";
import { Subscription } from "../app/modules/subscription/subscription.model";
import { UserDetails } from "../app/modules/user/userDetails.model";
import { sendNotification } from "../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../app/modules/notification/notification.interface";

export const handleSubscriptionCreated = async (data: any) => {


  const subscription = await stripe.subscriptions.retrieve(data.id);

  

  const customer = (await stripe.customers.retrieve(
    subscription.customer as string
  )) as any;


  if (!customer?.email) {
    console.error("❌ Missing customer email");
    throw new ApiError(400, "Customer email not found");
  }

  const alreadyExists = await Subscription.findOne({
    subscriptionId: subscription.id,
  });


  if (alreadyExists) {

    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;



  const invoice = subscription.latest_invoice
    ? await stripe.invoices.retrieve(subscription.latest_invoice as string)
    : null;



  const trxId = (invoice as any)?.payment_intent || null;


  const currentPeriodStart = new Date(
    subscription.current_period_start * 1000
  ).toISOString();

  const currentPeriodEnd = new Date(
    subscription.current_period_end * 1000
  ).toISOString();



  const user = await User.findOne({ email: customer.email });

 

  if (!user) {
    console.warn(`⚠️ handleSubscriptionCreated: User not found for email "${customer.email}". Will rely on checkout.session.completed event for activation.`);
    return;
  }

  const pkg = await Package.findOne({
    stripePriceId: priceId
    });



  if (!pkg) {
    console.error("❌ Package not found for priceId:", priceId);
    throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
  }

  const active = await Subscription.findOne({
    user: user._id,
    status: "active",
  });



  if (active) {

    return;
  }



  const newSub = await Subscription.create({
    customerId: customer.id,
    price: subscription.items.data[0]?.price?.unit_amount
      ? subscription.items.data[0].price.unit_amount / 100
      : 0,
    user: user._id,
    package: pkg._id,
    trxId,
    subscriptionId: subscription.id,
    currentPeriodStart,
    currentPeriodEnd,
    remaining: 0,
    status: "active",
  });



  await User.findByIdAndUpdate(user._id, {
    isSubscribed: true,
    hasAccess: true,
  });



  await UserDetails.findOneAndUpdate(
    { userId: user._id },
    { status: "APPROVED" },
    { new: true }
  );





  // 🔔 Send notification to User about subscription activation
  await sendNotification({
    receiver: user._id.toString(),
    title: "Subscription Activated! 🚀",
    message: `Your subscription for package "${pkg.title}" is now active. Enjoy all premium features!`,
    type: NOTIFICATION_TYPE.SUBSCRIPTION_ACTIVATED,
  });

  return newSub;
};