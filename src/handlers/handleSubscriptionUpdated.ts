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

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(data.id);

    // Retrieve the customer associated with the subscription
    const customer = (await stripe.customers.retrieve(
        subscription.customer as string
    )) as any;

    // Extract price ID from subscription items
    const priceId = subscription.items.data[0]?.price?.id;

    // Retrieve the invoice to get the transaction ID and amount paid
    const invoice = subscription.latest_invoice
      ? await stripe.invoices.retrieve(subscription.latest_invoice as string)
      : null;

    const trxId = invoice?.payment_intent || null;
    const amountPaid = invoice?.total ? invoice.total / 100 : 0;

    if (customer?.email) {
        // Find the user by email
        const existingUser = await User.findOne({ email: customer?.email });
    
        if (existingUser) {
            // Find the package by stripePriceId
            const pkg = await Package.findOne({ stripePriceId: priceId });
    
            if (pkg) {
                // Find the current active subscription
                const currentActiveSubscription = await Subscription.findOne({ user: existingUser?._id, status: 'active'}).populate('package');
        
                if (currentActiveSubscription) {
                    const activePkg = currentActiveSubscription.package as any;
                    if (
                        activePkg?.stripePriceId !==
                        priceId
                    ) {

                        // Cancel the old subscription
                        await Subscription.findByIdAndUpdate( currentActiveSubscription._id, { status: 'cancel' }, { new: true });
            
                        // Create new subscription parameters
                        const currentPeriodStart = new Date(
                            subscription.current_period_start * 1000
                        ).toISOString();

                        const currentPeriodEnd = new Date(
                            subscription.current_period_end * 1000
                        ).toISOString();

                        // Create a new subscription
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

                        // Add package credit to user's coin (engCoine)
                        const creditToAdd = Number(pkg.credit) || 0;
                        const updateData: any = {};
                        if (existingUser.role === USER_ROLES.PLAYER) {
                            updateData.blueTick = true;
                        }
                        await User.findByIdAndUpdate(existingUser._id, {
                            $set: updateData,
                            $inc: { engCoine: creditToAdd },
                        });

                        // 🔔 Queue push + in-app notification to User about subscription update
                        await NotificationQueueHelper.sendNotification(
                            existingUser._id.toString(),
                            `Your subscription has been successfully updated to package "${pkg.title}".`,
                            "Subscription Updated",
                            NOTIFICATION_TYPE.SUBSCRIPTION_ACTIVATED
                        );
                    }
                } else {

                    // If no active subscription found, check for a cancelled one
                    const cancelledSubscription = await Subscription.findOne({
                        user: existingUser._id,
                        status: 'cancel',
                    });
            
                    if (cancelledSubscription) {
                        await Subscription.findByIdAndUpdate(
                            cancelledSubscription._id,
                            { status: 'active' },
                            { new: true }
                        );

                        const creditToAdd = Number(pkg.credit) || 0;
                        const updateData: any = {};
                        if (existingUser.role === 'PLAYER') {
                            updateData.blueTick = true;
                        }
                        await User.findByIdAndUpdate(existingUser._id, {
                            $set: updateData,
                            $inc: { engCoine: creditToAdd },
                        });

                        // 🔔 Queue push + in-app notification to User about reactivation
                        await NotificationQueueHelper.sendNotification(
                            existingUser._id.toString(),
                            `Your subscription for package "${pkg.title}" has been reactivated.`,
                            "Subscription Reactivated",
                            NOTIFICATION_TYPE.SUBSCRIPTION_ACTIVATED
                        );
                    }
                }
            } else {
                // Package not found — log warning, checkout.session.completed will handle this
                console.warn(`⚠️ handleSubscriptionUpdated: Package with Stripe Price ID "${priceId}" not found — skipping`);
                return;
            }
        } else {
            // User not found by email — checkout.session.completed handles this via client_reference_id
            console.warn(`⚠️ handleSubscriptionUpdated: User with email "${customer.email}" not found — skipping`);
            return;
        }
    } else {
        console.warn('⚠️ handleSubscriptionUpdated: No email found for the customer — skipping');
        return;
    }
}