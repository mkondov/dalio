// @flow
import { SET_EBAY_REPRICER_SWITCH, SET_EBAY_AUTOORDER_SWITCH, SET_EBAY_PRODUCT_SYNC_STATUS, SET_EBAY_REPRICER_STATUS } from './types';

type State = {
  running: boolean,
  status: string
};

type Action = {
  type: string,
  value: State
};

type ProductSyncStatusState = {
  value: boolean
};

type ProductSyncStatusAction = {
  type: string,
  value: boolean
};

export const ebayRepricerSwitch = (state: State = { running: false, status: '' }, action: Action): State => {
  const { value } = action;
  switch (action.type) {
    case SET_EBAY_REPRICER_SWITCH:
      return { ...state, ...value };
    default:
      return state;
  }
}

export const ebayAutoorderSwitch = (state: State = { running: false, status: '' }, action: Action): State => {
  const { value } = action;
  switch (action.type) {
    case SET_EBAY_AUTOORDER_SWITCH:
      return { ...state, ...value };
    default:
      return state;
  }
}

export const ebayProductSyncStatus = (state: ProductSyncStatusState = { value: false }, action: ProductSyncStatusAction): ProductSyncStatusState => {
  switch (action.type) {
    case SET_EBAY_PRODUCT_SYNC_STATUS:
      return {
        value: action.value
      };
    default:
      return state;
  }
};

export const ebayRepricerStatus = (state = { status: false, started_at: '' }, action) => {
  const { payload } = action;

  switch (action.type) {
    case SET_EBAY_REPRICER_STATUS:
      return { ...state, ...payload };
    default:
      return state;
  }
};
