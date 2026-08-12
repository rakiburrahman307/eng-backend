import { Model } from "mongoose";

export type IPackageFeature = {
    title: string;
    isIncluded: boolean;
};

export type IPackage = {
    title: string;
    description: string;
    price: number;
    stripeProductId: string;
    stripePriceId: string;
    userType: 'Player' | 'Manager' | 'Club' | 'Referee' | 'Other' | 'Tournament Player' | 'Trial Player' | 'OTHER_CLUBS' | string;
    duration: '1 month' | '3 months' | '6 months' | '1 year' | string; 
    paymentType: 'Monthly' | 'Quarterly' | 'Yearly' | 'One-time' | string;
    packageType?: 'Semi Pro' | 'Professional' | 'Other' | 'Tournament Player' | 'Trial Player' | string;
    canViewOtherPlayers?: boolean;
    canRedeemPoints?: boolean;
    canViewOtherPlayerStats?: boolean;
    canEarnPoints?: boolean;
    productId?: string;
    credit?: number;
    features?: IPackageFeature[];
    status: 'Active' | 'Delete';
};

export type PackageModel = Model<IPackage, Record<string, unknown>>;