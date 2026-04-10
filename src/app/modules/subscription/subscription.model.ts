import { model, Schema } from "mongoose";
import { ISubscription, SubscriptionModel } from "./subscription.interface";


const subscriptionSchema = new Schema<ISubscription, SubscriptionModel>(
    {
        customerId: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        package: {
            type: Schema.Types.ObjectId,
            ref: "Package",
            required: true
        },
        trxId: {
            type: String,
            required: true
        },
        subscriptionId: {
            type: String,
            required: true
        },
        currentPeriodStart: {
            type: String,
            required: true
        },
        currentPeriodEnd: {
            type: String,
            required: true
        },
        remaining: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ["expired", "active", "cancel"],
            default: "active",
            required: true
        },

    },
    {
        timestamps: true
    }
)

export const Subscription = model<ISubscription, SubscriptionModel>("Subscription", subscriptionSchema)