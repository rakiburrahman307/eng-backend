import ApiError from "../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import stripe from "../config/stripe";
import { User } from "../app/modules/user/user.model";
import { Package } from "../app/modules/package/package.model";
import { Subscription } from "../app/modules/subscription/subscription.model";
import { NOTIFICATION_TYPE } from "../app/modules/notification/notification.interface";
import { USER_ROLES } from "../enums/user";
import { NotificationQueueHelper } from "../helpers/bullMQ/bullHelper";

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



  const creditToAdd = Number(pkg.credit) || 0;
  const marketValueToAdd = creditToAdd * 100;

  // Activate user access and add coins
  // ⚠️ status (APPROVED/REJECTED) is NOT changed here — admin must approve separately
  const updateData: any = {
    isSubscribed: true,
    hasAccess: true,
  };

  if (user.role === USER_ROLES.PLAYER) {
    updateData.blueTick = true;
  }

  const incData: any = {
    engCoine: creditToAdd,
  };

  if (user.role === USER_ROLES.PLAYER) {
    incData.marketValue = marketValueToAdd;
  }

  await User.findByIdAndUpdate(user._id, {
    $set: updateData,
    $inc: incData,
  });





  // 🔔 Queue push + in-app notification to User about subscription activation
  await NotificationQueueHelper.sendNotification(
    user._id.toString(),
    `Your subscription for package "${pkg.title}" is now active. Enjoy all premium features!`,
    "Subscription Activated! 🚀",
    NOTIFICATION_TYPE.SUBSCRIPTION_ACTIVATED
  );

  return newSub;
};