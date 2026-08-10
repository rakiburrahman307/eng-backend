import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { IPackage } from "./package.interface";
import { Package } from "./package.model";
import mongoose from "mongoose";
import { createSubscriptionProduct } from "../../../helpers/createSubscriptionProductHelper";
import stripe from "../../../config/stripe";
import config from "../../../config";
import { User } from "../user/user.model";

const createPackageToDB = async (payload: IPackage): Promise<IPackage | null> => {
    // Set default permissions based on packageType if not explicitly passed
    if (payload.packageType === 'Semi Pro') {
        if (payload.canViewOtherPlayers === undefined) payload.canViewOtherPlayers = false;
        if (payload.canRedeemPoints === undefined) payload.canRedeemPoints = false;
        if (payload.canViewOtherPlayerStats === undefined) payload.canViewOtherPlayerStats = false;
        if (payload.canEarnPoints === undefined) payload.canEarnPoints = true;
    } else if (payload.packageType === 'Professional') {
        if (payload.canViewOtherPlayers === undefined) payload.canViewOtherPlayers = true;
        if (payload.canRedeemPoints === undefined) payload.canRedeemPoints = true;
        if (payload.canViewOtherPlayerStats === undefined) payload.canViewOtherPlayerStats = true;
        if (payload.canEarnPoints === undefined) payload.canEarnPoints = true;
    }

    const productPayload = {
        title: payload.title,
        description: payload.description,
        duration: payload.duration,
        price: Number(payload.price),
    };

    const product = await createSubscriptionProduct(productPayload);

    if (!product) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create subscription product");
    }

    // ✅ FIX: map correctly
    payload.stripeProductId = product.productId;
    payload.stripePriceId = product.priceId;   // 🔥 MUST ADD THIS

    const result = await Package.create(payload);

    if (!result) {
        await stripe.products.del(product.productId);
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Package");
    }

    return result;
};

const updatePackageToDB = async(id: string, payload: IPackage): Promise<IPackage | null>=>{

    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID")
    }

    const existingPackage = await Package.findById(id);
    if (!existingPackage) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
    }

    // Check if price or duration is changed
    const isPriceChanged = payload.price !== undefined && Number(payload.price) !== Number(existingPackage.price);
    const isDurationChanged = payload.duration !== undefined && payload.duration !== existingPackage.duration;

    if (isPriceChanged || isDurationChanged) {
        const stripeProductId = existingPackage.stripeProductId;
        if (!stripeProductId) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Stripe Product ID not found for this package");
        }

        const newPriceVal = payload.price !== undefined ? Number(payload.price) : Number(existingPackage.price);
        const newDuration = payload.duration !== undefined ? payload.duration : existingPackage.duration;

        let interval: 'month' | 'year' = 'month';
        let intervalCount = 1;

        switch (newDuration) {
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

        // Create new Price in Stripe under the existing Product
        const stripePrice = await stripe.prices.create({
            product: stripeProductId,
            unit_amount: newPriceVal * 100,
            currency: 'gbp',
            recurring: {
                interval,
                interval_count: intervalCount,
            },
        });

        if (!stripePrice) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create new price in Stripe");
        }

        payload.stripePriceId = stripePrice.id;
    }

    const result = await Package.findByIdAndUpdate(
        {_id: id},
        payload,
        { new: true } 
    );

    if(!result){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to Update Package")
    }

    return result;
}


const getPackageFromDB = async (
  paymentType: string,
  userType: string
): Promise<IPackage[]> => {

  const query: any = {
    status: "Active",
  };

  if (paymentType) {
    query.paymentType = paymentType;
  }

  if (userType) {
    query.userType = userType;
  }

  const result = await Package.find(query);
  return result;
};

const getPackageDetailsFromDB = async(id: string): Promise<IPackage | null>=>{
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID")
    }
    const result = await Package.findById(id);
    return result;
}

const deletePackageToDB = async(id: string): Promise<IPackage | null>=>{
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID")
    }

    const result = await Package.findByIdAndUpdate(
        {_id: id},
        {status: "Delete"},
        {new: true}
    );

    if(!result){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to deleted Package")
    }

    return result;
}



const togglePackageStatusToDB = async (id: string): Promise<IPackage | null> => {

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID");
    }

    const packageData = await Package.findById(id);

    if (!packageData) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
    }

    const newStatus =
        packageData.status === "Active" ? "Delete" : "Active";

    const result = await Package.findByIdAndUpdate(
        id,
        { status: newStatus },
        { new: true }
    );

    return result;
};

const getActivePackagesFromDB = async (
  filters: { status?: string; userType?: string }
): Promise<IPackage[]> => {
  const query: any = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.userType) {
    query.userType = filters.userType;
  }

  const result = await Package.find(query);

  return result;
};
const getCheckoutUrlFromDB = async (packageId: string, userId: string, userEmail: string, playerId?: string): Promise<{ checkoutUrl: string }> => {
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid package ID');
    }

    if (!userEmail) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User email is required');
    }

    // If playerId provided, verify ownership and APPROVED status
    if (playerId) {
        if (!mongoose.Types.ObjectId.isValid(playerId)) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid player ID');
        }
        const player = await User.findById(playerId);
        if (!player) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Player profile not found');
        }
        if (!player.parentId || player.parentId.toString() !== userId.toString()) {
            throw new ApiError(StatusCodes.FORBIDDEN, 'You can only register players belonging to your account');
        }
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Package not found');
    }

    if (!pkg.stripePriceId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Package does not have a Stripe Price ID');
    }

    // Generate dynamic checkout session using stripe.checkout.sessions.create
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price: pkg.stripePriceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${config.stripe.paymentSuccess || 'http://localhost:3000/success'}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.stripe.paymentSuccess || 'http://localhost:3000/success'}`,
        customer_email: userEmail,
        client_reference_id: userId,
        subscription_data: {
          metadata: {
            userId,
            packageId,
            targetUserId: playerId || userId,
          },
        },
        metadata: {
          userId,
          packageId,
          targetUserId: playerId || userId,
        },
    });

    if (!session.url) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to generate checkout session');
    }

    return { checkoutUrl: session.url };
};

export const PackageService = {
    createPackageToDB,
    updatePackageToDB,
    getPackageFromDB,
    getPackageDetailsFromDB,
    deletePackageToDB,
    togglePackageStatusToDB,
    getActivePackagesFromDB,
    getCheckoutUrlFromDB,
}