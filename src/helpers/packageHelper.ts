import { Package } from "../app/modules/package/package.model";

/**
 * Dynamically determines whether a package is a Premium Player package.
 * Compares current package price against all active Player packages in DB.
 * The package with the lowest price (minPrice) is Cheap/Basic (isPremium = false).
 * Any package priced higher than minPrice is Premium (isPremium = true).
 */
export const isPremiumPlayerPackage = async (pkg: any): Promise<boolean> => {
  if (!pkg) return false;

  const isPlayerPackage = !pkg.userType || pkg.userType === 'Player';
  if (!isPlayerPackage) {
    return false;
  }

  // Fetch all active Player packages from DB sorted by price ascending
  const playerPackages = await Package.find({
    userType: 'Player',
    status: 'Active',
  })
    .sort({ price: 1 })
    .lean();

  if (!playerPackages || playerPackages.length === 0) {
    // Fallback if no packages in DB: check packageType name or features
    const typeStr = (pkg.packageType || '').toLowerCase();
    return typeStr.includes('professional') || typeStr.includes('pro') || pkg.canEarnPoints === true;
  }

  const minPrice = playerPackages[0].price;
  const currentPrice = Number(pkg.price) || 0;
  const hasHigherTier = playerPackages.some((p) => p.price > minPrice);

  // If multiple packages exist and current package has the lowest price -> Cheap / Basic Package
  if (hasHigherTier && currentPrice <= minPrice) {
    return false;
  }

  return true;
};
