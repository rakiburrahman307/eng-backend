import { StatusCodes } from "http-status-codes";
import { IPackage } from "../app/modules/package/package.interface";
import stripe from "../config/stripe";
import ApiError from "../errors/ApiErrors";
import config from "../config";

export const createSubscriptionProduct = async (
    payload: Partial<IPackage>
): Promise<{
    productId: string;
    priceId: string;
} | null> => {

    // Create Product in Stripe
    const product = await stripe.products.create({
        name: payload.title as string,
        description: payload.description as string,
    });

    let interval: 'month' | 'year' = 'month';
    let intervalCount = 1;

    switch (payload.duration) {
        case '1 month':
            interval = 'month';
            intervalCount = 1;
            break;
        case '3 months':
            interval = 'month';
            intervalCount = 3;
            break;
        case '6 months':
            interval = 'month';
            intervalCount = 6;
            break;
        case '1 year':
            interval = 'year';
            intervalCount = 1;
            break;
        default:
            interval = 'month';
            intervalCount = 1;
    }

    // Create Price
    const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Number(payload.price) * 100,
        currency: 'gbp',
        recurring: {
            interval,
            interval_count: intervalCount,
        },
    });

    if (!price) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create price in Stripe");
    }

    return {
        productId: product.id,
        priceId: price.id,
    };
};
