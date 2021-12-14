/* eslint import/prefer-default-export: 0 */
// @flow
import { SET_AMAZON_AUTOORDER_PAYMENT_METHODS_FETCH_STATUS } from '../reducers/types';
  
  export const setAmazonAutoorderPaymentMethodsFetchStatus = (value: boolean) => ({
    type: SET_AMAZON_AUTOORDER_PAYMENT_METHODS_FETCH_STATUS,
    value
  });

  