/* eslint react/prop-types: 0 */
/* eslint camelcase: 0 */

// @flow
import React from 'react';
import { ipcRenderer } from 'electron';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'connected-react-router';
import { store as notificationStore } from 'react-notifications-component';
import type { Store } from '../reducers/types';
import Routes from '../Routes';
import { setAccountStatus } from '../actions/accountStatusAction';
import { setAppUpdateStatus } from '../actions/appUpdateAction';
import { setAmazonProductSyncStatus, setAmazonRepricerSwitch, setAmazonPriceUpdaterStatus } from '../actions/amazonRepricerActions';
import { setAmazonAutoorderPaymentMethodsFetchStatus } from '../actions/amazonAutoorderActions';
import { setEbayProductSyncStatus, setEbayRepricerSwitch, setEbayRepricerStatus } from '../actions/ebayActions'; // setEbayAutoorderSwitch
import { setEbayOrderSyncStatus, toggleOrdersWarningAction, setAmazonOrderSyncStatus } from '../actions/ordersAction';
import { toggleListingsWarningAction, setListingsInfoAction, setManualPriceUpdaterStatus } from '../actions/listingsAction';

type Props = {
  store: Store,
  history: Array<string>
};

type Payload = { 
  running: boolean, 
  status: string 
};


const Root = (props: Props) => {
    const { store, history } = props;

    React.useEffect(() => {
      document.addEventListener('keydown', (event: SyntheticKeyboardEvent<>) => {
        if (event.keyCode === 80 && event.shiftKey && event.ctrlKey) {
          history.push('/test');
        }
      });

      // Deal with the update notification here -> when the main process establishes that an update is ready it will prompt the user to 'Update now'
      ipcRenderer.on('update-ready', (event: SyntheticEvent<>, info: boolean): void => {
        store.dispatch(setAppUpdateStatus(info));
      });

      ipcRenderer.on('amazon-product-sync-status', (event: SyntheticEvent<>, status: boolean): void => {
        store.dispatch(setAmazonProductSyncStatus(status));
      });

      ipcRenderer.on('update-amazon-repricer-time', (event: SyntheticEvent<>, payload): void => {
        store.dispatch(setAmazonRepricerSwitch(payload));
      });

      ipcRenderer.on('update-amazon-price-checker-notification', (event: SyntheticEvent<>, payload: { status: boolean, current_listing: number, total_listings: number, item_name: string, started_at: string }): void => {
         store.dispatch(setAmazonPriceUpdaterStatus(payload));
      });

      ipcRenderer.on('update-manual-price-checker-notification', (event: SyntheticEvent<>, payload: { status: boolean, item_name: string, total_listings: number, supplier: string }): void => {
        store.dispatch(setManualPriceUpdaterStatus(payload));
     });

      ipcRenderer.on('ebay-product-sync-status', (event: SyntheticEvent<>, status: boolean): void => {
        store.dispatch(setEbayProductSyncStatus(status));
        if (!status) {
          notificationStore.addNotification({
            title: 'Ebay product sync finished',
            message: 'Dalio has finished the product sync.',
            type: 'info',
            insert: 'bottom',
            container: 'bottom-right',
            animationIn: ['animated', 'fadeIn'],
            animationOut: ['animated', 'fadeOut'],
            dismiss: {
              duration: 5000,
              onScreen: true
            }
          });
        }
      });

      ipcRenderer.on('ebay-order-sync-status', (event: SyntheticEvent<>, payload: { status: boolean, started_at: string }): void => {
        store.dispatch(setEbayOrderSyncStatus(payload));
        if (!payload.status) {
          notificationStore.addNotification({
            title: 'Ebay order sync finished',
            message: 'Dalio has finished the order sync.',
            type: 'info',
            insert: 'bottom',
            container: 'bottom-right',
            animationIn: ['animated', 'fadeIn'],
            animationOut: ['animated', 'fadeOut'],
            dismiss: {
              duration: 5000,
              onScreen: true
            }
          });
        }
      });

      ipcRenderer.on('update-ebay-repricer-time', (event: SyntheticEvent<>, payload: Payload): void => {
        store.dispatch(setEbayRepricerSwitch(payload));
      });

      ipcRenderer.on('update-ebay-repricer-notification', (event: SyntheticEvent<>, payload: { status: boolean, started_at: string }): void => {
        store.dispatch(setEbayRepricerStatus(payload));
     });

      ipcRenderer.on('amazon-autoorder-payment-methods-fetch-status', (event: SyntheticEvent<>, status: boolean): void => {
        store.dispatch(setAmazonAutoorderPaymentMethodsFetchStatus(status));
      });

      ipcRenderer.on('ebay-login-error', (): void => {
        notificationStore.addNotification({
          title: 'Login error',
          message: 'Ebay login failed. Please try again.',
          type: 'danger',
          insert: 'bottom',
          container: 'bottom-right',
          animationIn: ['animated', 'fadeIn'],
          animationOut: ['animated', 'fadeOut'],
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });
      });

      ipcRenderer.on('get-dalio-account-status', (event, payload) => {
        store.dispatch(setAccountStatus(payload));
      });

      ipcRenderer.on('check-tracking-funds', (event, payload) => {
        store.dispatch(setAccountStatus(payload));
      });

      ipcRenderer.on('toggle-listings-warning', (event: SyntheticEvent<>, toggle: boolean, count: number): void => {
        store.dispatch(toggleListingsWarningAction(toggle, count));
      });

      ipcRenderer.on('toggle-orders-warning', (event: SyntheticEvent<>, toggle: boolean, count: number): void => {
        store.dispatch(toggleOrdersWarningAction(toggle, count));
      });

      ipcRenderer.on('repriceable-listings-count', (event: SyntheticEvent<>, repriceableListings: number, totalListings: number): void => {
        store.dispatch(setListingsInfoAction(repriceableListings, totalListings));
      });

      ipcRenderer.on('tracking-converted', (event, order): void => {
        notificationStore.addNotification({
          title: 'Tracking converted',
          message: `Tracking ${order.tracking_number} has been successfuly converted to a Bluecare Express tracking`,
          type: 'success',
          insert: 'bottom',
          container: 'bottom-right',
          animationIn: ['animated', 'fadeIn'],
          animationOut: ['animated', 'fadeOut'],
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });
      });

      ipcRenderer.on('amazon-order-sync-status', (event: SyntheticEvent<>, payload: { status: boolean, started_at: string }): void => {
        store.dispatch(setAmazonOrderSyncStatus(payload));
      });
      // Specify how to clean up after this effect:
      return () => {
        ipcRenderer.removeAllListeners('update-ready');
        ipcRenderer.removeAllListeners('amazon-product-sync-status');
        ipcRenderer.removeAllListeners('update-manual-price-checker-notification');
        ipcRenderer.removeAllListeners('update-amazon-price-checker-notification');
        ipcRenderer.removeAllListeners('update-amazon-repricer-time');
        ipcRenderer.removeAllListeners('ebay-product-sync-status');
        ipcRenderer.removeAllListeners('ebay-order-sync-status');
        ipcRenderer.removeAllListeners('update-ebay-repricer-time');
        ipcRenderer.removeAllListeners('update-ebay-repricer-notification');
        ipcRenderer.removeAllListeners('amazon-autoorder-payment-methods-fetch-status');
        ipcRenderer.removeAllListeners('ebay-login-error');
        ipcRenderer.removeAllListeners('get-dalio-account-status');
        ipcRenderer.removeAllListeners('check-tracking-funds');
        ipcRenderer.removeAllListeners('toggle-listings-warning');
        ipcRenderer.removeAllListeners('toggle-orders-warning');
        ipcRenderer.removeAllListeners('repriceable-listings-count');
        ipcRenderer.removeAllListeners('tracking-converted');
        ipcRenderer.removeAllListeners('amazon-order-sync-status');
      };
    }, []);

  return (
    <Provider store={store}>
      <ConnectedRouter history={history}>
        <Routes />
      </ConnectedRouter>
    </Provider>
  );
}

export default Root;