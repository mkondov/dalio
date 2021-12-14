/* eslint import/prefer-default-export: 0 */
/* eslint camelcase: 0 */

// @flow
import { SET_ACCOUNT_STATUS } from '../reducers/types';

export const setAccountStatus = ( payload: { value: string | number, email: string, payment_url: string, order_amount: string, tracking_funds: number }) => ({
  type: SET_ACCOUNT_STATUS,
  payload
});
