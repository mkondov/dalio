import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { createHashHistory } from 'history';
import { routerMiddleware, routerActions } from 'connected-react-router';
import { createLogger } from 'redux-logger';
import createRootReducer from '../reducers';
import { getListingsAction, toggleListingsWarningAction, setListingsInfoAction, setListingsPageRowSize, setManualPriceUpdaterStatus } from '../actions/listingsAction';
import { 
  getOrders, 
  setEbayOrderSyncStatus, 
  toggleOrdersWarningAction,
  setAmazonOrderSyncStatus
} from '../actions/ordersAction';
import * as getLogs from '../actions/logsAction';
import {
  setAmazonRepricerSwitch,
  setAmazonInventoryManagementSwitch,
  setAmazonMarketplaceLogin,
  setAmazonProductSyncStatus,
  setAmazonPriceUpdaterStatus
} from '../actions/amazonRepricerActions';
import { setAmazonAutoorderPaymentMethodsFetchStatus } from '../actions/amazonAutoorderActions';
import { 
  setEbayRepricerSwitch,
  setEbayAutoorderSwitch,
  setEbayProductSyncStatus,
  setEbayRepricerStatus
} from '../actions/ebayActions';
import * as setAppUpdateStatus from '../actions/appUpdateAction';
import * as setAccountStatus from '../actions/accountStatusAction';
import { setAllowTestFeatures } from '../actions/testFeaturesAction';

const history = createHashHistory();

const rootReducer = createRootReducer(history);

const configureStore = (initialState: {}) => {
  // Redux Configuration
  const middleware = [];
  const enhancers = [];

  // Thunk Middleware
  middleware.push(thunk);

  // Logging Middleware
  const logger = createLogger({
    level: 'info',
    collapsed: true
  });

  // Skip redux logs in console during the tests
  if (process.env.NODE_ENV !== 'test') {
    middleware.push(logger);
  }

  // Router Middleware
  const router = routerMiddleware(history);
  middleware.push(router);

  // Redux DevTools Configuration
  const actionCreators = {
    ...getListingsAction,
    ...toggleListingsWarningAction,
    ...setListingsInfoAction,
    ...setListingsPageRowSize,
    ...getLogs,
    ...getOrders,
    ...toggleOrdersWarningAction,
    ...setAmazonRepricerSwitch,
    ...setAmazonInventoryManagementSwitch,
    ...setAmazonMarketplaceLogin,
    ...setAmazonOrderSyncStatus,
    ...setAmazonProductSyncStatus,
    ...setAmazonPriceUpdaterStatus,
    ...setManualPriceUpdaterStatus,
    ...setAmazonAutoorderPaymentMethodsFetchStatus,
    ...setEbayRepricerSwitch,
    ...setEbayAutoorderSwitch,
    ...setEbayProductSyncStatus,
    ...setEbayOrderSyncStatus,
    ...setEbayRepricerStatus,
    ...setAppUpdateStatus,
    ...routerActions,
    ...setAccountStatus,
    ...setAllowTestFeatures,
  };

  // If Redux DevTools Extension is installed use it, otherwise use Redux compose
  /* eslint-disable no-underscore-dangle */
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        // Options: http://extension.remotedev.io/docs/API/Arguments.html
        actionCreators
      })
    : compose;
  /* eslint-enable no-underscore-dangle */

  // Apply Middleware & Compose Enhancers
  enhancers.push(applyMiddleware(...middleware));
  const enhancer = composeEnhancers(...enhancers);

  // Create Store
  const store = createStore(rootReducer, initialState, enhancer);

  if (module.hot) {
    module.hot.accept(
      '../reducers',
      // eslint-disable-next-line global-require
      () => store.replaceReducer(require('../reducers').default)
    );
  }

  return store;
};

export default { configureStore, history };
