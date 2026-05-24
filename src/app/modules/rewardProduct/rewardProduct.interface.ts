import { Types } from 'mongoose';

export interface IRewardProduct {
  image?: string | null;

  brand: string;

  point: number;

    status: 'publish' | 'unpublish';
    productType: 'nonCoffee' | 'Coffee';

  createdBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}