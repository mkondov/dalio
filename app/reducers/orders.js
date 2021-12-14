// @flow
import { GET_ORDERS, SET_EBAY_ORDER_SYNC_STATUS, TOGGLE_ORDERS_WARNING, SET_AMAZON_ORDER_SYNC_STATUS } from './types';

// TYPES
import type  { Order } from '../types/OrdersTypes';

type OrdersAction = {
  type: string,
  orders: Array<Order>
};

export const orders = (state: Array<any> = [], action: OrdersAction): Array<Order | any> => {
  switch (action.type) {
    case GET_ORDERS:
      return action.orders;
    default:
      return state;
  }
}

type State = {
  value: boolean,
  count: number
};

type ActionToggle = {
  type: string,
  value: boolean,
  count: number
};

export const ebayOrderSyncStatus = (state = { status: false, started_at: '' }, action) => {
  const { payload } = action;
  switch (action.type) {
    case SET_EBAY_ORDER_SYNC_STATUS:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export const amazonOrderSyncStatus = (state = { status: false, started_at: '' }, action) => {
  const { payload } = action;

  switch (action.type) {
    case SET_AMAZON_ORDER_SYNC_STATUS:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export const toggleOrdersWarning = (state: State = { value: false, count: 0 }, action: ActionToggle) => {
  switch (action.type) {
    case TOGGLE_ORDERS_WARNING:
      return {
        value: action.value,
        count: action.count
      };
    default:
      return state;
  }
};
