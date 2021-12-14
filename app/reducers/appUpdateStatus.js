// @flow
import { SET_APP_UPDATE_STATUS } from './types';

type State = {
  value: boolean
};

type Action = {
  type: string,
  value: boolean
};

export default function(state: State = { value: false }, action: Action) {
  switch (action.type) {
    case SET_APP_UPDATE_STATUS:
      return {
        value: action.value
      };
    default:
      return state;
  }
}
