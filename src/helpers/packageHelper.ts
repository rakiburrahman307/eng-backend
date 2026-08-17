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

  // 2. Normalize userType and packageType
  const pkgType = (pkg.packageType || "").toString().trim();
  const pkgTypeUpper = pkgType.toUpperCase().replace(/[\s_-]+/g, "_");
  const userTypeUpper = (pkg.userType || "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "_");

  // 3. Tournament Player, Trial Player / Other Clubs
  if (
    userTypeUpper === "TOURNAMENT_PLAYER" ||
    userTypeUpper === "TRIAL_PLAYER" ||
    userTypeUpper === "OTHER_CLUBS" ||
    userTypeUpper === "OTHER_CLUB" ||
    userTypeUpper === "CLUB"
  ) {
    return true;
  }

  // 4. Check Package Type name
  if (pkgTypeUpper === "SEMI_PRO" || pkgType === "Semi Pro") {
    return false;
  }

  if (
    pkgTypeUpper === "PROFESSIONAL" ||
    pkgType === "Professional" ||
    pkgTypeUpper === "TOURNAMENT_PLAYER" ||
    pkgTypeUpper === "TRIAL_PLAYER" ||
    pkgTypeUpper === "OTHER"
  ) {
    return true;
  }

  // 5. Dynamic price check fallback (case-insensitive status check)
  const playerPackages = await Package.find({
    $or: [{ userType: "Player" }, { userType: "PLAYER" }],
    status: { $in: ["Active", "active"] },
  })
    .sort({ price: 1 })
    .lean();

  if (playerPackages.length <= 1) {
    return true;
  }

  const currentPrice = Number(pkg.price) || 0;
  const maxPrice = Math.max(
    ...playerPackages.map((playerPackage) => Number(playerPackage.price) || 0),
  );

  return currentPrice === maxPrice;
};
