import { Types } from 'mongoose';

export interface IRedeemedUser {
  user: Types.ObjectId;
  redeemedAt: Date;
  points?: number;
}

export interface IRewardProduct {
  image?: string | null;

  brand: string;

  point: number;

  status: 'publish' | 'unpublish';
  productType: 'nonCoffee' | 'Coffee';

  rewardToken?: string | null;

  redeemedUsers?: IRedeemedUser[];

  createdBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}