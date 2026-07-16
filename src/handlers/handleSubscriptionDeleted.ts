import { StatusCodes } from 'http-status-codes';
import ApiError from '../errors/ApiErrors';
import stripe from '../config/stripe';
import { User } from '../app/modules/user/user.model';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { sendNotification } from '../helpers/notificationsHelper';
import { NOTIFICATION_TYPE } from '../app/modules/notification/notification.interface';

export const handleSubscriptionDeleted = async (data: any) => {

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(data.id);

    // Find the current active subscription
    const userSubscription = await Subscription.findOne({
        customerId: subscription.customer,
        status: 'active',
    });

    if (userSubscription) {

        // Cancel the subscription
        await Subscription.findByIdAndUpdate(
            userSubscription._id,
            { status: 'cancel' },
            { new: true }
        );
    
        // Find the user associated with the subscription
        const existingUser = await User.findById(userSubscription?.user);
    
        if (existingUser) {
            await User.findByIdAndUpdate(
                existingUser._id,
                { hasAccess: false },
                { new: true },
            );

            // 🔔 Send notification to User about subscription cancellation
            await sendNotification({
                receiver: existingUser._id.toString(),
                title: "Subscription Cancelled",
                message: "Your subscription has been cancelled/deleted. You no longer have access to premium features.",
                type: NOTIFICATION_TYPE.SUBSCRIPTION_CANCELLED,
            });

        } else {
            throw new ApiError(StatusCodes.NOT_FOUND, `User not found.`);
        }
    } else {
        throw new ApiError(StatusCodes.NOT_FOUND, `Subscription not found.`);
    }
}