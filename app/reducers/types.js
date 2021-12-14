/* eslint import/prefer-default-export: 0 */
// @flow
import type { Dispatch as ReduxDispatch, Store as ReduxStore } from 'redux';

export type Action = {
  +type: string
};

export type Dispatch = ReduxDispatch<Action>;

export type Store = ReduxStore<GetState, Action>;

export const GET_LISTINGS: string = 'GET_LISTINGS';

export const TOGGLE_LISTINGS_WARNING: string = 'TOGGLE_LISTINGS_WARNING';

export const SET_LISTINGS_INFO: string = 'SET_LISTINGS_INFO';

export const SET_LISTINGS_PAGE_ROW_SIZE: string = 'SET_LISTINGS_PAGE_ROW_SIZE';

export const GET_ORDERS: string = 'GET_ORDERS';

export const TOGGLE_ORDERS_WARNING: string = 'TOGGLE_ORDERS_WARNING';

export const GET_LOGS: string = 'GET_LOGS';

export const SET_AMAZON_REPRICER_SWITCH: string = 'SET_AMAZON_REPRICER_SWITCH';

export const SET_AMAZON_INVENTORY_MANAGEMENT_SWITCH: string = 'SET_AMAZON_INVENTORY_MANAGEMENT_SWITCH';

export const SET_AMAZON_MARKETPLACES_LOGIN: string = 'SET_AMAZON_MARKETPLACES_LOGIN';

export const SET_AMAZON_PRODUCT_SYNC_STATUS: string = 'SET_AMAZON_PRODUCT_SYNC_STATUS';

export const SET_AMAZON_ORDER_SYNC_STATUS: string = 'SET_AMAZON_ORDER_SYNC_STATUS';

export const SET_AMAZON_PRICE_UPDATER_STATUS: string = 'SET_AMAZON_PRICE_UPDATER_STATUS';

export const SET_MANUAL_PRICE_UPDATER_STATUS: string = 'SET_MANUAL_PRICE_UPDATER_STATUS';
 
export const SET_AMAZON_AUTOORDER_PAYMENT_METHODS_FETCH_STATUS: string = 'SET_AMAZON_AUTOORDER_PAYMENT_METHODS_FETCH_STATUS';

export const SET_EBAY_REPRICER_SWITCH: string = 'SET_EBAY_REPRICER_SWITCH';

export const SET_EBAY_AUTOORDER_SWITCH: string = 'SET_EBAY_AUTOORDER_SWITCH';

export const SET_EBAY_PRODUCT_SYNC_STATUS: string = 'SET_EBAY_PRODUCT_SYNC_STATUS';

export const SET_EBAY_ORDER_SYNC_STATUS: string = 'SET_EBAY_ORDER_SYNC_STATUS';

export const SET_EBAY_REPRICER_STATUS: string = 'SET_EBAY_REPRICER_STATUS';

export const SET_APP_UPDATE_STATUS: string = 'SET_APP_UPDATE_STATUS';

export const SET_ACCOUNT_STATUS: string = 'SET_ACCOUNT_STATUS';

export const ALLOW_TEST_FEATURES: string = 'ALLOW_TEST_FEATURES';
