// @flow
import { SET_ACCOUNT_STATUS } from './types';

type State = {
  value: string,
  email: string
};

type Action = {
  type: string,
  value: string,
  email: string
};

export default (state: State = { status: '0', email: '', payment_url: '', order_amount: '', tracking_funds: 0 }, action: Action) => {
  const { payload } = action;

  switch (action.type) {
    case SET_ACCOUNT_STATUS:
      return { ...state, ...payload };
    default:
      return state;
  }
};
