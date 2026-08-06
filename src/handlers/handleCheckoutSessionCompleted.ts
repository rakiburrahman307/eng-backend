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
  const userId = (session.client_reference_id || session.metadata?.userId) as string | null;
  const customerEmail = (session.customer_email || session.customer_details?.email) as string | null;
  const subscriptionId = session.subscription as string | null;
  const customerId = session.customer as string | null;

  if (!subscriptionId) {
    console.warn('⚠️ checkout.session.completed received without subscriptionId — skipping');
    return;
  }

  // 1. Find user by userId, metadata.userId, or customer Email
  let user = null;
  if (userId) {
    user = await User.findById(userId);
  }
  if (!user && customerEmail) {
    user = await User.findOne({ email: customerEmail.trim() });
  }

  if (!user) {
    console.error(`❌ User not found in DB for checkout session: ${session.id}`);
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found for completed checkout session');
  }

  // 2. Check if this exact subscription ID already exists in DB
  const alreadyExists = await Subscription.findOne({ subscriptionId });
  if (alreadyExists) {
    // If it's already active in DB, ensure user has access
    if (alreadyExists.status === 'active' && (!(user as any).isSubscribed || !(user as any).hasAccess)) {
      await User.findByIdAndUpdate(user._id, { isSubscribed: true, hasAccess: true });
    }
    return alreadyExists;
  }

  // 3. Retrieve full subscription details from Stripe
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

  // Find package by priceId
  const pkg = await Package.findOne({ stripePriceId: priceId });
  if (!pkg) {
    console.error(`❌ Package not found for priceId: ${priceId}`);
    throw new ApiError(StatusCodes.NOT_FOUND, `Package not found for Stripe Price ID: ${priceId}`);
  }

  // 4. Cancel any previous active subscription for this user
  await Subscription.updateMany(
    { user: user._id, status: 'active' },
    { status: 'cancel' }
  );

  // 5. Create new active subscription in DB
  const newSub = await Subscription.create({
    customerId: customerId || subscription.customer,
    price: price || pkg.price,
    user: user._id,
    package: pkg._id,
    trxId,
    subscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
    remaining: 0,
    status: 'active',
  });

  // 6. Activate user access and add package credit to coin (engCoine) & marketValue
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

  // 7. Queue push + in-app notification
  try {
    await NotificationQueueHelper.sendNotification(
      user._id.toString(),
      `Your subscription for package "${pkg.title}" is now active. Enjoy all premium features!`,
      'Subscription Activated! 🚀',
      NOTIFICATION_TYPE.SUBSCRIPTION_ACTIVATED
    );
  } catch (notifErr) {
    console.error('Failed to send subscription activation notification:', notifErr);
  }

  return newSub;
};
