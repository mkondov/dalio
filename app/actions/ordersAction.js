/* eslint import/prefer-default-export: 0 */
// @flow
import { GET_ORDERS, SET_EBAY_ORDER_SYNC_STATUS, TOGGLE_ORDERS_WARNING, SET_AMAZON_ORDER_SYNC_STATUS } from '../reducers/types';

// TYPES
import type { Order } from '../types/OrdersTypes';

export const getOrders = (orders: Array<Order>) => ({
  type: GET_ORDERS,
  orders
});

export const setEbayOrderSyncStatus =  (payload: { status: boolean, started_at: string }) => ({
  type: SET_EBAY_ORDER_SYNC_STATUS,
  payload
});

export const toggleOrdersWarningAction = (value: boolean = false, count: number = 0) => ({
  type: TOGGLE_ORDERS_WARNING,
  value,
  count
});

export const setAmazonOrderSyncStatus = (payload: { status: boolean, started_at: string }) => ({
  type: SET_AMAZON_ORDER_SYNC_STATUS,
  payload
});
