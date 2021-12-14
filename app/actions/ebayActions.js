/* eslint import/prefer-default-export: 0 */
// @flow
import { SET_EBAY_REPRICER_SWITCH, SET_EBAY_AUTOORDER_SWITCH, SET_EBAY_PRODUCT_SYNC_STATUS, SET_EBAY_REPRICER_STATUS } from '../reducers/types';

type Value = {
  running: boolean,
  status: string
};

export const setEbayRepricerSwitch = (value: Value) => ({
  type: SET_EBAY_REPRICER_SWITCH,
  value
});

export const setEbayAutoorderSwitch = (value: Value) => ({
  type: SET_EBAY_AUTOORDER_SWITCH,
  value
});

export const setEbayProductSyncStatus = (value: boolean) => ({
  type: SET_EBAY_PRODUCT_SYNC_STATUS,
  value
});

export const setEbayRepricerStatus = (payload: { status: boolean }) => ({
  type: SET_EBAY_REPRICER_STATUS,
  payload
});
