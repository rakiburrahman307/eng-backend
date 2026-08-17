import mongoose from "mongoose";
import { Package } from "../app/modules/package/package.model";

export const isPremiumPlayerPackage = async (
  pkgInput: any,
): Promise<boolean> => {
  if (!pkgInput) return false;

  let pkg: any = pkgInput;

  // 1. Resolve package if only ID/ObjectId/unpopulated object is provided
  if (
    typeof pkgInput === "string" ||
    pkgInput instanceof mongoose.Types.ObjectId
  ) {
    if (!mongoose.Types.ObjectId.isValid(pkgInput)) {
      return false;
    }

    pkg = await Package.findById(pkgInput).lean();
  } else if (
    typeof pkgInput === "object" &&
    !pkgInput.packageType &&
    (pkgInput._id || pkgInput.id)
  ) {
    const pkgId = pkgInput._id || pkgInput.id;

    if (mongoose.Types.ObjectId.isValid(pkgId)) {
      pkg = await Package.findById(pkgId).lean();
    }
  }

  if (!pkg) return false;

  // 2. Normalize userType
  const userTypeUpper = (pkg.userType || "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "_");

  // 3. Tournament Player
  // Tournament Player has only one package.
  // Any active subscription for this user type is Premium.
  if (userTypeUpper === "TOURNAMENT_PLAYER") {
    return true;
  }

  // 4. Trial Player / Other Club
  // These user types have only one package.
  // Any active subscription is Premium.
  if (
    userTypeUpper === "TRIAL_PLAYER" ||
    userTypeUpper === "OTHER_CLUBS" ||
    userTypeUpper === "OTHER_CLUB" ||
    userTypeUpper === "CLUB"
  ) {
    return true;
  }

  // 5. Regular Player packages
  // For regular Players, Premium depends on package price.
  const playerPackages = await Package.find({
    $or: [{ userType: "Player" }, { userType: "PLAYER" }],
    status: "Active",
  })
    .sort({ price: 1 })
    .lean();

  // 6. No active Player packages found
  if (playerPackages.length === 0) {
    return false;
  }

  // 7. If only one Player package exists,
  // that package is Premium.
  if (playerPackages.length === 1) {
    return true;
  }

  // 8. Multiple Player packages exist.
  // The package with the highest price is Premium.
  const currentPrice = Number(pkg.price) || 0;

  const maxPrice = Math.max(
    ...playerPackages.map((playerPackage) => Number(playerPackage.price) || 0),
  );

  return currentPrice === maxPrice;
};
