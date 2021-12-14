import {
  SET_AMAZON_REPRICER_SWITCH,
  SET_AMAZON_INVENTORY_MANAGEMENT_SWITCH,
  SET_AMAZON_PRODUCT_SYNC_STATUS,
  SET_AMAZON_PRICE_UPDATER_STATUS
} from './types';

export const amazonRepricerSwitch = (state = { running: false, status: '' }, action) => {
  const { value } = action;

  switch (action.type) {
    case SET_AMAZON_REPRICER_SWITCH:
      return { ...state, ...value };
    default:
      return state;
  }
};

export const amazonInventoryManagementSwitch = (state = { value: false }, action) => {
  switch (action.type) {
    case SET_AMAZON_INVENTORY_MANAGEMENT_SWITCH:
      return {
        value: action.value
      };
    default:
      return state;
  }
};

export const amazonProductSyncStatus = (state = { value: false }, action) => {
  switch (action.type) {
    case SET_AMAZON_PRODUCT_SYNC_STATUS:
      return {
        value: action.value
      };
    default:
      return state;
  }
};

export const amazonPriceUpdater = (state = { status: false, current_listing: 0, total_listings: 0, item_name: '', started_at: '' }, action) => {
  const { payload } = action;

  switch (action.type) {
    case SET_AMAZON_PRICE_UPDATER_STATUS:
      return { ...state, ...payload };
    default:
      return state;
  }
};