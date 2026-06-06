import { USER_ROLES } from "../../../enums/user";
import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";



// GET ALL USERS
const getAllUsersFromDB = async (query: Record<string, any>) => {
  const userQuery = new QueryBuilder(
    User.find({
      role: { $ne: USER_ROLES.SUPER_ADMIN },
    }).select('userName role profile verified'),
    query
  )
    .search(['userName', 'email', 'location'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};
// TOGGLE VERIFIED
const toggleVerifiedToDB = async (id: string) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error('User not found');
  }

  const result = await User.findByIdAndUpdate(
    id,
    {
      verified: !user.verified,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return result;
};

// DELETE USER
const deleteUserFromDB = async (id: string) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error('User not found');
  }

  return await User.findByIdAndDelete(id);
};


const getAllRefereesFromDB = async () => {
  const result = await User.aggregate([
    {
      $match: {
        role: USER_ROLES.REFEREE,
      },
    },

    {
      $lookup: {
        from: "userdetails",
        localField: "_id",
        foreignField: "userId",
        as: "details",
      },
    },

    {
      $unwind: {
        path: "$details",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 1,
        userName: 1,
        firstName: {
          $ifNull: ["$details.firstName", null],
        },
        lastName: {
          $ifNull: ["$details.lastName", null],
        },

      },
    },
  ]);

  return result;
};


export const UserManagementService = {
  getAllUsersFromDB,
  toggleVerifiedToDB,
    deleteUserFromDB,
  getAllRefereesFromDB
};