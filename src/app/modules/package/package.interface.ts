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
    userType: 'Player' | 'Manager' | 'Club' | 'Referee' | 'Other';
    duration: '1 month' | '3 months' | '6 months' | '1 year'; 
    paymentType: 'Monthly' | 'Yearly';
    packageType?: 'Semi Pro' | 'Professional' | 'Other';
    canViewOtherPlayers?: boolean;
    canRedeemPoints?: boolean;
    canViewOtherPlayerStats?: boolean;
    canEarnPoints?: boolean;
    productId?: string;
    credit: number;
    loginLimit: number;
    paymentLink?: string;
    features?: IPackageFeature[];
    status: 'Active' | 'Delete';
};

export type PackageModel = Model<IPackage, Record<string, unknown>>;