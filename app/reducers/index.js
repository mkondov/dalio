import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import { listings, toggleListingsWarning, listingsInfo, listingsPageRowSize, manualPriceUpdater } from './listings';
import { 
  ebayOrderSyncStatus, 
  orders, 
  toggleOrdersWarning, 
  amazonOrderSyncStatus 
} from './orders';
import logs from './logs';
import {
  amazonRepricerSwitch,
  amazonInventoryManagementSwitch,
  amazonProductSyncStatus,
  amazonPriceUpdater
} from './amazonRepricer';
import amazonMarketplacesLogin from './amazonMarketplacesLogin';
import { 
  ebayRepricerSwitch,
  ebayAutoorderSwitch,
  ebayProductSyncStatus,
  ebayRepricerStatus
} from './ebayRepricer';
import appUpdateStatus from './appUpdateStatus';
import accountStatus from './accountStatus';
import { amazonAutoorderPaymentMethodsFetchStatus } from './amazonAutoorder';
import { allowTestFeatures } from './allowTestFeatures';

export default function createRootReducer(history: History) {
  return combineReducers({
    router: connectRouter(history),
    listings,
    toggleListingsWarning,
    listingsInfo,
    listingsPageRowSize,
    orders,
    toggleOrdersWarning,
    logs,
    amazonRepricerSwitch,
    amazonInventoryManagementSwitch,
    amazonMarketplacesLogin,
    amazonProductSyncStatus,
    amazonPriceUpdater,
    amazonOrderSyncStatus,
    manualPriceUpdater,
    amazonAutoorderPaymentMethodsFetchStatus,
    ebayRepricerSwitch,
    ebayAutoorderSwitch,
    ebayProductSyncStatus,
    ebayOrderSyncStatus,
    ebayRepricerStatus,
    appUpdateStatus,
    accountStatus,
    allowTestFeatures
  });
}
