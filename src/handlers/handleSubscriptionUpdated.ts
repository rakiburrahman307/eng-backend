import { StatusCodes } from 'http-status-codes';
import ApiError from '../errors/ApiErrors';
import stripe from '../config/stripe';
import { User } from '../app/modules/user/user.model';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { Package } from '../app/modules/package/package.model';
import { NOTIFICATION_TYPE } from '../app/modules/notification/notification.interface';
import { USER_ROLES } from '../enums/user';
import { NotificationQueueHelper } from '../helpers/bullMQ/bullHelper';

export const handleSubscriptionUpdated = async (data: any) => {
  const subscription = await stripe.subscriptions.retrieve(data.id);

  const customer = (await stripe.customers.retrieve(
    subscription.customer as string
  )) as any;

  const priceId = subscription.items.data[0]?.price?.id;

  const invoice = subscription.latest_invoice
    ? await stripe.invoices.retrieve(subscription.latest_invoice as string)
    : null;

  const trxId = (invoice as any)?.payment_intent || subscription.id;
  const amountPaid = invoice?.total ? invoice.total / 100 : 0;

  const userId = subscription.metadata?.userId || customer?.metadata?.userId;
  let existingUser = null;
  if (userId) {
    existingUser = await User.findById(userId);
  }
  if (!existingUser && customer?.email) {
    existingUser = await User.findOne({ email: customer.email });
  }

  if (!existingUser) {
    console.warn(`⚠️ handleSubscriptionUpdated: User not found for customer email ${customer?.email}`);
    return;
  }

  const pkg = await Package.findOne({ stripePriceId: priceId });
  if (!pkg) {
    console.error(`❌ Package not found for priceId: ${priceId}`);
    return;
  }

  const currentPeriodStart = new Date(
    subscription.current_period_start * 1000
  ).toISOString();

  const currentPeriodEnd = new Date(
    subscription.current_period_end * 1000
  ).toISOString();

  // Find sub by subscriptionId or active user sub
  const existingSub = await Subscription.findOne({ subscriptionId: subscription.id });

  if (existingSub) {
    // Update existing subscription timestamps & status
    existingSub.currentPeriodStart = currentPeriodStart;
    existingSub.currentPeriodEnd = currentPeriodEnd;
    existingSub.status = subscription.status === 'active' ? 'active' : existingSub.status;
    if (trxId) existingSub.trxId = trxId;
    await existingSub.save();

    await User.findByIdAndUpdate(existingUser._id, {
      isSubscribed: subscription.status === 'active',
      hasAccess: subscription.status === 'active',
    });
    return existingSub;
  }

  // Handle case where user switches or creates new sub
  await Subscription.updateMany(
    { user: existingUser._id, status: 'active' },
    { status: 'cancel' }
  );

  const newSubscription = new Subscription({
    user: existingUser._id,
    customerId: customer?.id,
    package: pkg._id,
    price: amountPaid || pkg.price,
    status: 'active',
    trxId,
    subscriptionId: subscription.id,
    currentPeriodStart,
    currentPeriodEnd,
    remaining: 0,
  });

  await newSubscription.save();

  const creditToAdd = Number(pkg.credit) || 0;
  const marketValueToAdd = creditToAdd * 100;
  const updateData: any = {
    isSubscribed: true,
    hasAccess: true,
  };
  if (existingUser.role === USER_ROLES.PLAYER) {
    updateData.blueTick = true;
  }
  const incData: any = { engCoine: creditToAdd };
  if (existingUser.role === USER_ROLES.PLAYER) {
    incData.marketValue = marketValueToAdd;
  }
  await User.findByIdAndUpdate(existingUser._id, {
    $set: updateData,
    $inc: incData,
  });

  try {
    await NotificationQueueHelper.sendNotification(
      existingUser._id.toString(),
      `Your subscription has been updated to package "${pkg.title}".`,
      "Subscription Updated 🚀",
      NOTIFICATION_TYPE.SUBSCRIPTION_ACTIVATED
    );
  } catch (err) {
    console.error("Failed to send subscription updated notification:", err);
  }

  return newSubscription;
};