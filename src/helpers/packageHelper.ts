import mongoose from "mongoose";
import { Package } from "../app/modules/package/package.model";

export const isPremiumPlayerPackage = async (pkgInput: any): Promise<boolean> => {
  if (!pkgInput) return false;

  let pkg: any = pkgInput;

  // 1. If pkgInput is string ID, ObjectId, or unpopulated object, fetch full Package from DB
  if (typeof pkgInput === 'string' || pkgInput instanceof mongoose.Types.ObjectId) {
    if (mongoose.Types.ObjectId.isValid(pkgInput)) {
      pkg = await Package.findById(pkgInput).lean();
    } else {
      return false;
    }
  } else if (pkgInput && typeof pkgInput === 'object' && !pkgInput.packageType && (pkgInput._id || pkgInput.id)) {
    const pkgId = pkgInput._id || pkgInput.id;
    if (mongoose.Types.ObjectId.isValid(pkgId)) {
      pkg = await Package.findById(pkgId).lean();
    }
  }

  if (!pkg) return false;

  const pkgType = (pkg.packageType || '').toString().trim();
  const pkgTypeUpper = pkgType.toUpperCase().replace(/[\s_-]+/g, '_');
  const userTypeUpper = (pkg.userType || '').toString().trim().toUpperCase().replace(/[\s_-]+/g, '_');

  // 2. TOURNAMENT_PLAYER role (1 package: 'Tournament Player') -> Always Premium
  if (pkgTypeUpper === 'TOURNAMENT_PLAYER' || userTypeUpper === 'TOURNAMENT_PLAYER') {
    return true;
  }

  // 3. OTHER_CLUBS role (1 package: 'Trial Player') -> Always Premium
  if (pkgTypeUpper === 'TRIAL_PLAYER' || userTypeUpper === 'OTHER_CLUBS' || userTypeUpper === 'OTHER_CLUB' || userTypeUpper === 'CLUB') {
    return true;
  }

  // 4. REGULAR PLAYER Role (2 packages: 'Professional' & 'Semi Pro'):
  const playerPackages = await Package.find({
    $or: [{ userType: 'Player' }, { userType: 'PLAYER' }],
    status: 'Active',
  })
    .sort({ price: 1 })
    .lean();

  if (!playerPackages || playerPackages.length <= 1) {
    if (pkgTypeUpper === 'SEMI_PRO' || pkgType === 'Semi Pro') {
      return false;
    }
    return true;
  }

  const minPrice = Number(playerPackages[0].price) || 0;
  const currentPrice = Number(pkg.price) || 0;
  const hasHigherPricePackage = playerPackages.some((p) => Number(p.price) > minPrice);

  // Lower price package (Semi Pro) -> isPremium = false
  if (hasHigherPricePackage && currentPrice <= minPrice) {
    return false;
  }

  return true;
};
