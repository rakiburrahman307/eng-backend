import Stripe from "stripe";
import ApiError from "../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import stripe from "../config/stripe";

import { User } from "../app/modules/user/user.model";
import { Package } from "../app/modules/package/package.model";
import { Subscription } from "../app/modules/subscription/subscription.model";
import { UserDetails } from "../app/modules/user/userDetails.model";

export const handleSubscriptionCreated = async (data: any) => {
  console.log("========== SUBSCRIPTION CREATED START ==========");
  console.log("Raw data.id:", data.id);

  const subscription = await stripe.subscriptions.retrieve(data.id);

  console.log("📡 Stripe subscription fetched:");
  console.log("Subscription ID:", subscription.id);
  console.log("Customer ID:", subscription.customer);
  console.log("Status:", subscription.status);

  const customer = (await stripe.customers.retrieve(
    subscription.customer as string
  )) as any;

  console.log("👤 Customer fetched:", customer?.id);
  console.log("Customer email:", customer?.email);

  if (!customer?.email) {
    console.error("❌ Missing customer email");
    throw new ApiError(400, "Customer email not found");
  }

  const alreadyExists = await Subscription.findOne({
    subscriptionId: subscription.id,
  });

  console.log("🔍 Existing subscription check:", !!alreadyExists);

  if (alreadyExists) {
    console.log("⚠️ Duplicate webhook ignored");
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;

  console.log("💰 Price ID:", priceId);

  const invoice = subscription.latest_invoice
    ? await stripe.invoices.retrieve(subscription.latest_invoice as string)
    : null;

  console.log("🧾 Invoice fetched:", invoice?.id || null);

  const trxId = (invoice as any)?.payment_intent || null;

  console.log("💳 Transaction ID:", trxId);

  const currentPeriodStart = new Date(
    subscription.current_period_start * 1000
  ).toISOString();

  const currentPeriodEnd = new Date(
    subscription.current_period_end * 1000
  ).toISOString();

  console.log("📅 Period Start:", currentPeriodStart);
  console.log("📅 Period End:", currentPeriodEnd);

  const user = await User.findOne({ email: customer.email });

  console.log("👤 DB User found:", !!user);

  if (!user) {
    console.error("❌ User not found in DB");
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const pkg = await Package.findOne({
    stripePriceId: priceId
    });

  console.log("📦 Package found:", !!pkg);

  if (!pkg) {
    console.error("❌ Package not found for priceId:", priceId);
    throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
  }

  const active = await Subscription.findOne({
    user: user._id,
    status: "active",
  });

  console.log("🔁 Active subscription exists:", !!active);

  if (active) {
    console.log("⚠️ User already has active subscription. Skipping.");
    return;
  }

  console.log("💾 Creating subscription...");

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

  console.log("✅ Subscription created:", newSub._id);

  await User.findByIdAndUpdate(user._id, {
    isSubscribed: true,
    hasAccess: true,
  });

  console.log("👤 User updated to subscribed");

  await UserDetails.findOneAndUpdate(
    { userId: user._id },
    { status: "APPROVED" },
    { new: true }
  );

  console.log("📄 UserDetails updated to APPROVED");

  console.log("========== SUBSCRIPTION CREATED END ==========");

  return newSub;
};