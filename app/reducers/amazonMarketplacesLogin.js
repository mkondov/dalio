// @flow
import { SET_AMAZON_MARKETPLACES_LOGIN } from './types';

type Marketplaces = {
  US: boolean,
  CA: boolean,
  MX: boolean,
  UK: boolean,
  DE: boolean,
  FR: boolean,
  IT: boolean,
  ES: boolean
};

const marketplaces: Marketplaces = {
  US: false,
  CA: false,
  MX: false,
  UK: false,
  DE: false,
  FR: false,
  IT: false,
  ES: false
};

// type Action = {
//   type: string,
//   [string]: boolean
// };

const amazonMarketplacesLogin = (state: Marketplaces = marketplaces, action) => {
  switch (action.type) {
    case SET_AMAZON_MARKETPLACES_LOGIN:
      return {
        ...state,
        [action.country]: action.value
      };
    default:
      return state;
  }
};

export default amazonMarketplacesLogin;
