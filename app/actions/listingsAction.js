/* eslint import/prefer-default-export: 0 */
// @flow
import { 
  GET_LISTINGS, 
  TOGGLE_LISTINGS_WARNING, 
  SET_LISTINGS_INFO, 
  SET_LISTINGS_PAGE_ROW_SIZE,
  SET_MANUAL_PRICE_UPDATER_STATUS 
} from '../reducers/types';

// TYPES
import type { Listing } from '../types/ListingsTypes';

export const getListingsAction = (listings: Array<Listing>) => ({
  type: GET_LISTINGS,
  listings
});

export const toggleListingsWarningAction = (value: boolean = false, count: number = 0) => ({
  type: TOGGLE_LISTINGS_WARNING,
  value,
  count
});

export const setListingsInfoAction = (repriceable_listings: number = 0, total_listings: number = 0) => ({
  type: SET_LISTINGS_INFO,
  repriceable_listings,
  total_listings
});

export const setListingsPageRowSize = (size: number = 20) => ({
  type: SET_LISTINGS_PAGE_ROW_SIZE,
  size
});

export const setManualPriceUpdaterStatus = (payload: { status: boolean, item_name: string, total_listings: number, supplier: string }) => ({
  type: SET_MANUAL_PRICE_UPDATER_STATUS,
  payload
});