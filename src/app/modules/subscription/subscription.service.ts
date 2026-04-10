import { JwtPayload } from "jsonwebtoken";
import { Package } from "../package/package.model";
import { ISubscription } from "./subscription.interface";
import { Subscription } from "./subscription.model";
import stripe from "../../../config/stripe";
import { User } from "../user/user.model";


const subscriptionDetailsFromDB = async (user: JwtPayload): Promise<{ subscription: ISubscription | {} }> => {

    const subscription = await Subscription.findOne({ user: user.id }).populate("package", "title credit").lean();
    if (!subscription) {
        return { subscription: {} }; // Return empty object if no subscription found
    }

    const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId);

    // Check subscription status and update database accordingly
    if (subscriptionFromStripe?.status !== "active") {
        await Promise.all([
            User.findByIdAndUpdate(user.id, { isSubscribed: false }, { new: true }),
            Subscription.findOneAndUpdate({ user: user.id }, { status: "expired" }, { new: true }),
        ]);
    }

    return { subscription };
};

const companySubscriptionDetailsFromDB = async (id: string): Promise<{ subscription: ISubscription | {} }> => {

    const subscription = await Subscription.findOne({ user: id }).populate("package", "title credit").lean();
    if (!subscription) {
        return { subscription: {} }; // Return empty object if no subscription found
    }

    const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId);

    // Check subscription status and update database accordingly
    if (subscriptionFromStripe?.status !== "active") {
        await Promise.all([
            User.findByIdAndUpdate(id, { isSubscribed: false }, { new: true }),
            Subscription.findOneAndUpdate({ user: id }, { status: "expired" }, { new: true }),
        ]);
    }

    return { subscription };
};



const subscriptionsFromDB = async (query: Record<string, unknown>): Promise<ISubscription[]> => {
    const anyConditions: any[] = [];

    const { search, limit, page, paymentType } = query;

    if (search) {
        const matchingPackageIds = await Package.find({
            $or: [
                { title: { $regex: search, $options: "i" } },
                { paymentType: { $regex: search, $options: "i" } },
            ]
        }).distinct("_id");
    
        if (matchingPackageIds.length) {
            anyConditions.push({
                package: { $in: matchingPackageIds }
            });
        }
    }
    
    

    if (paymentType) {
        anyConditions.push({
            package: { $in: await Package.find({paymentType: paymentType}).distinct("_id")  }
        })
    }

    const whereConditions = anyConditions.length > 0 ? { $and: anyConditions } : {};
    const pages = parseInt(page as string) || 1;
    const size = parseInt(limit as string) || 10;
    const skip = (pages - 1) * size;

    const result = await Subscription.find(whereConditions).populate([
        {
            path: "package",
            select: "title paymentType credit description"
        },
        {
            path: "user",
            select: "email name linkedIn contact company website "
        },
    ])
        .select("user package price trxId currentPeriodStart currentPeriodEnd status")
        .skip(skip)
        .limit(size);

    const count = await Subscription.countDocuments(whereConditions);
    
    const data: any = {
        data: result,
        meta: {
            page: pages,
            total: count
        }
    }

    return data;
}

export const SubscriptionService = {
    subscriptionDetailsFromDB,
    subscriptionsFromDB,
    companySubscriptionDetailsFromDB
}