/* eslint import/prefer-default-export: 0 */
// @flow
import {
  SET_AMAZON_REPRICER_SWITCH,
  SET_AMAZON_INVENTORY_MANAGEMENT_SWITCH,
  SET_AMAZON_MARKETPLACES_LOGIN,
  SET_AMAZON_PRODUCT_SYNC_STATUS,
  SET_AMAZON_PRICE_UPDATER_STATUS
} from '../reducers/types';

export const setAmazonRepricerSwitch = (value: boolean) => ({
  type: SET_AMAZON_REPRICER_SWITCH,
  value
});

export const setAmazonInventoryManagementSwitch = (value: boolean) => ({
  type: SET_AMAZON_INVENTORY_MANAGEMENT_SWITCH,
  value
});

export const setAmazonMarketplaceLogin = (country: string, value: boolean) => ({
  type: SET_AMAZON_MARKETPLACES_LOGIN,
  country,
  value
});

export const setAmazonProductSyncStatus = (value: boolean) => ({
  type: SET_AMAZON_PRODUCT_SYNC_STATUS,
  value
});

export const setAmazonPriceUpdaterStatus = (payload: { status: boolean, current_listing: number, total_listings: number, item_name: string, started_at: string }) => ({
  type: SET_AMAZON_PRICE_UPDATER_STATUS,
  payload
});