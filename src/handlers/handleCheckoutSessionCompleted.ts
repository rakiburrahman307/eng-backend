import ApiError from '../errors/ApiErrors';
import { StatusCodes } from 'http-status-codes';
import stripe from '../config/stripe';
import { User } from '../app/modules/user/user.model';
import { Package } from '../app/modules/package/package.model';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { NOTIFICATION_TYPE } from '../app/modules/notification/notification.interface';
import { NotificationQueueHelper } from '../helpers/bullMQ/bullHelper';
import { USER_ROLES } from '../enums/user';

export const handleCheckoutSessionCompleted = async (session: any) => {
  const userId = session.client_reference_id as string | null;
  const subscriptionId = session.subscription as string | null;
  const customerId = session.customer as string | null;

  // If no client_reference_id, we can't reliably find the user — skip
  if (!userId) {
    console.warn('⚠️ checkout.session.completed received without client_reference_id — skipping');
    return;
  }

  if (!subscriptionId) {
    console.warn('⚠️ checkout.session.completed received without subscriptionId — skipping');
    return;
  }

  // Find user directly by MongoDB ID — no email matching needed
  const user = await User.findById(userId);
  if (!user) {
    console.error(`❌ User not found in DB for client_reference_id: ${userId}`);
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Check if subscription already exists (idempotency guard)
  const alreadyExists = await Subscription.findOne({ subscriptionId });
  if (alreadyExists) {
    
    return;
  }

  // Check if user already has an active subscription
  const activeSubscription = await Subscription.findOne({
    user: user._id,
    status: 'active',
  });
  if (activeSubscription) {
    return;
  }

  // Retrieve full subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;

  // Get invoice for trxId
  const invoice = subscription.latest_invoice
    ? await stripe.invoices.retrieve(subscription.latest_invoice as string)
    : null;

  const trxId = (invoice as any)?.payment_intent || subscriptionId;

  const currentPeriodStart = new Date(
    subscription.current_period_start * 1000
  ).toISOString();

  const currentPeriodEnd = new Date(
    subscription.current_period_end * 1000
  ).toISOString();

  const price = subscription.items.data[0]?.price?.unit_amount
    ? subscription.items.data[0].price.unit_amount / 100
    : 0;

  // Find package by stripePriceId
  const pkg = await Package.findOne({ stripePriceId: priceId });
  if (!pkg) {
    console.error(`❌ Package not found for priceId: ${priceId}`);
    throw new ApiError(StatusCodes.NOT_FOUND, `Package not found for Stripe Price ID: ${priceId}`);
  }

  // Create subscription in DB
  const newSub = await Subscription.create({
    customerId: customerId || subscription.customer,
    price,
    user: user._id,
    package: pkg._id,
    trxId,
    subscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
    remaining: 0,
    status: 'active',
  });

  // Activate user access and add package credit to coin (engCoine)
  // ⚠️ status (APPROVED/REJECTED) is NOT changed here — admin must approve separately
  const creditToAdd = Number(pkg.credit) || 0;
  const marketValueToAdd = creditToAdd * 100;

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

  // Queue push + in-app notification
  await NotificationQueueHelper.sendNotification(
    user._id.toString(),
    `Your subscription for package "${pkg.title}" is now active. Enjoy all premium features!`,
    'Subscription Activated! 🚀',
    NOTIFICATION_TYPE.SUBSCRIPTION_ACTIVATED
  );

  return newSub;
};
