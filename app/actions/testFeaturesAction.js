/* eslint import/prefer-default-export: 0 */

import { ALLOW_TEST_FEATURES } from '../reducers/types';

export const setAllowTestFeatures = value => ({
  type: ALLOW_TEST_FEATURES,
  value
});
