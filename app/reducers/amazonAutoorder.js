/* eslint import/prefer-default-export: 0 */
// @flow
import { SET_AMAZON_AUTOORDER_PAYMENT_METHODS_FETCH_STATUS } from './types';

type State = {
  value: boolean
};

type Action = {
  type: string,
  value: boolean
};

export const amazonAutoorderPaymentMethodsFetchStatus = (state: State = { value: false }, action: Action) => {
  switch (action.type) {
    case SET_AMAZON_AUTOORDER_PAYMENT_METHODS_FETCH_STATUS:
      return {
        value: action.value
      };
    default:
      return state;
  }
};
  