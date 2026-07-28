import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { IPackage } from "./package.interface";
import { Package } from "./package.model";
import mongoose from "mongoose";
import { createSubscriptionProduct } from "../../../helpers/createSubscriptionProductHelper";
import stripe from "../../../config/stripe";

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
    payload.paymentLink = product.paymentLink;
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
// GET CHECKOUT URL — automatically appends client_reference_id + prefilled_email from logged-in user
const getCheckoutUrlFromDB = async (packageId: string, userId: string, userEmail: string): Promise<{ checkoutUrl: string }> => {
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid package ID');
    }

    if (!userEmail) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User email is required');
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Package not found');
    }

    if (!pkg.paymentLink) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Package does not have a payment link');
    }

    // Append client_reference_id + prefilled_email — user never has to touch it
    const checkoutUrl = `${pkg.paymentLink}?client_reference_id=${userId}&prefilled_email=${encodeURIComponent(userEmail)}`;

    return { checkoutUrl };
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