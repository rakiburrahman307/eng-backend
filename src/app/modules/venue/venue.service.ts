import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import QueryBuilder from '../../../util/queryBuilder';
import { IVenue } from './venue.interface';
import { Venue } from './venue.model';

const createVenueToDB = async (payload: Partial<IVenue>): Promise<IVenue> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Venue name is required');
  }
  if (!payload.city || !payload.country) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'City and Country are required for venue');
  }

  const result = await Venue.create(payload);
  return result;
};

const getAllVenuesFromDB = async (query: Record<string, any>) => {
  const venueQuery = new QueryBuilder(Venue.find(), query)
    .search(['name', 'stadiumName', 'city', 'country'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await venueQuery.modelQuery;
  const meta = await venueQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

const getSingleVenueFromDB = async (id: string): Promise<IVenue | null> => {
  const result = await Venue.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Venue not found');
  }
  return result;
};

const updateVenueInDB = async (
  id: string,
  payload: Partial<IVenue>
): Promise<IVenue | null> => {
  const isExist = await Venue.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Venue not found');
  }

  const result = await Venue.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteVenueFromDB = async (id: string): Promise<IVenue | null> => {
  const isExist = await Venue.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Venue not found');
  }

  const result = await Venue.findByIdAndDelete(id);
  return result;
};

export const VenueService = {
  createVenueToDB,
  getAllVenuesFromDB,
  getSingleVenueFromDB,
  updateVenueInDB,
  deleteVenueFromDB,
};
