/* eslint react/destructuring-assignment: 0 */
/* eslint react/prop-types: 0 */
/* eslint no-else-return: 0 */

// @flow
import React from 'react';
import { connect } from 'react-redux';

import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import Skeleton from '@material-ui/lab/Skeleton';
import Button from '@material-ui/core/Button';

import OrdersTable from './OrdersTable';
import { getOrders } from '../../../actions/ordersAction';

// TYPES
import type { Account } from '../../../types/AccountsTypes';
import type { Order } from '../../../types/OrdersTypes';

const useStyles = makeStyles(() => ({
  skeletonRect: {
    marginTop: 10,
    marginBottom: 10
  },
}));

type OrdersProps = {
  loggedInMarketplaces: Array<Account>,
  allAccounts: {
    [key: number]: Account
  },
  getOrders: Function,
  ...
};

const Orders = (props: OrdersProps) => {
  const classes = useStyles();
  const { loggedInMarketplaces, allAccounts } = props;

  const [loader, setLoader] = React.useState(true);
  
  React.useEffect(() => {
    ipcRenderer.on('request-orders', (event: SyntheticEvent<>, orders: Array<Order>) => {
      props.getOrders(orders);
      setLoader(false);
    });

    ipcRenderer.send('request-orders');
    // Cleanup the listener events so that memory leaks are avoided.
    return function cleanup() {
      ipcRenderer.removeAllListeners('request-orders');
    };
  }, []);

  if (loader) {
    return (
      // Return a loading progress if the listings are not yet loaded
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div style={{  width: '90%', display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
         <Skeleton variant="text" animation="wave" width="20%"/>
         <Skeleton variant="text" animation="wave" width="20%"/>
        </div>
        <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={40} />
        <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={40} />
        <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={40} />
        <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={40} />
        <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={40} />
        <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={40} />
      </div>
    );
  }

  if (props.orders.length > 0) {
    return (
      <div style={{ textAlign: 'center', padding: 0}}>
        <OrdersTable loggedInMarketplaces={loggedInMarketplaces} allAccounts={allAccounts} />
      </div>
    );
  } else {
    if (!props.ebayOrderSyncStatus.status) {
      return (
        <div style={{ textAlign: 'center', padding: 0}}>
          <p> You have no orders to show yet. Please sync them from your eBay account.</p>
          <Button 
            color="primary"
            onClick={() => ipcRenderer.send('sync-ebay-orders')}
          >
            Sync orders
          </Button>
        </div>
      );
    }
    
    return <p>Syncing your orders... This process may take a few minutes...</p>
  }
  
};

const mapStateToProps = state => ({
  ...state
});

export default connect(
  mapStateToProps,
  { getOrders }
)(Orders);
