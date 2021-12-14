/* eslint import/prefer-default-export: 0 */
// @flow
import { SET_APP_UPDATE_STATUS } from '../reducers/types';

export const setAppUpdateStatus = (value: boolean) => ({
  type: SET_APP_UPDATE_STATUS,
  value
});
