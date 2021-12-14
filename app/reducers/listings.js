// @flow
import { 
  GET_LISTINGS, 
  TOGGLE_LISTINGS_WARNING, 
  SET_LISTINGS_INFO, 
  SET_LISTINGS_PAGE_ROW_SIZE,
  SET_MANUAL_PRICE_UPDATER_STATUS
} from './types';

// TYPES
import type { Listing } from '../types/ListingsTypes';

type State = {
  value: boolean,
  count: number
};

type ListingsInfoState = {
  repriceable_listings: number,
  total_listings: number
};

type Action = {
  type: string,
  listings: Array<Listing>
};

type ActionToggle = {
  type: string,
  value: boolean,
  count: number
};

type ListingsInfoAction = {
  type: string,
  repriceable_listings: number,
  total_listings: number
};

export const listings = (state: Array<[]> = [], action: Action): Array<any> => {
  switch (action.type) {
    case GET_LISTINGS:
      return action.listings;
    default:
      return state;
  }
}

export const toggleListingsWarning = (state: State = { value: false, count: 0 }, action: ActionToggle) => {
  switch (action.type) {
    case TOGGLE_LISTINGS_WARNING:
      return {
        value: action.value,
        count: action.count
      };
    default:
      return state;
  }
};

export const listingsInfo = (state: ListingsInfoState = { repriceable_listings: 0, total_listings: 0 }, action: ListingsInfoAction) => {
  switch (action.type) {
    case SET_LISTINGS_INFO:
      return {
        repriceable_listings: action.repriceable_listings,
        total_listings: action.total_listings
      };
    default:
      return state;
  }
};

export const listingsPageRowSize = (size: number = 20, action) => {
  switch (action.type) {
    case SET_LISTINGS_PAGE_ROW_SIZE:
      return action.size;
    default:
      return size;
  }
}

export const manualPriceUpdater = (state = { status: false, item_name: '', total_listings: 0, supplier: '' }, action) => {
  const { payload } = action;

  switch (action.type) {
    case SET_MANUAL_PRICE_UPDATER_STATUS:
      return { ...state, ...payload };
    default:
      return state;
  }
};
