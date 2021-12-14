/* eslint import/prefer-default-export: 0 */
// @flow
import { ALLOW_TEST_FEATURES } from './types';

type State = {
  value: boolean
};

type Action = {
  type: string,
  value: boolean
};

export const allowTestFeatures = (state: State = { value: false }, action: Action) => {
  switch (action.type) {
    case ALLOW_TEST_FEATURES:
      return {
        value: action.value
      };
    default:
      return state;
  }
};
  