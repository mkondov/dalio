import React from 'react';
import { Switch, Route } from 'react-router';
import routes from './constants/routes';
import App from './containers/App';
import HomePage from './containers/HomePage';
import ListingsPage from './containers/ListingsPage';
import AddListingPage from './containers/AddListingPage';
import AddListingsVariationPage from './containers/AddListingsVariationPage';
import EditListingPage from './containers/EditListingPage';
import LogsPage from './containers/LogsPage';
import RepricerStatisticsPage from './containers/RepricerStatisticsPage';
import LoginPage from './containers/LoginPage';
import AutoorderPage from './containers/AutoorderPage';
import EditOrderPage from './containers/EditOrderPage';
import TestPage from './containers/TestPage';

export default () => (
  <App>
    <Switch>
      <Route exact path={routes.HOME} component={HomePage} />
      <Route path={routes.LISTINGS} component={ListingsPage} />
      <Route path={routes.ADD_LISTING} component={AddListingPage} />
      <Route path={routes.ADD_LISTING_VARIATION} component={AddListingsVariationPage} />
      <Route path={routes.EDIT_LISTING} component={EditListingPage} />
      <Route path={routes.LOGS} component={LogsPage} />
      <Route path={routes.REPRICER_STATISTICS} component={RepricerStatisticsPage} />
      <Route path={routes.LOGIN} component={LoginPage} />
      <Route path={routes.AUTOORDER} component={AutoorderPage} />
      <Route path={routes.EDIT_ORDER} component={EditOrderPage} />
      <Route path={routes.TEST} component={TestPage} />
    </Switch>
  </App>
);
