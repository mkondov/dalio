/* eslint react/destructuring-assignment: 0 */
/* eslint react/prop-types: 0 */
// @flow
import React from 'react';
import { connect } from 'react-redux';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import Skeleton from '@material-ui/lab/Skeleton';

import ListingsTable from './ListingsTable';
import ListingsAccountCheck from './ListingsAccountCheck';
import { getListingsAction, toggleListingsWarningAction } from '../../actions/listingsAction';

// TYPES
import type { Listing } from '../../types/ListingsTypes';

const useStyles = makeStyles(() => ({
  skeletonRect: {
    marginTop: 10,
    marginBottom: 10
  },
}));

type Props = { getListingsAction: Function, toggleListingsWarningAction: Function, ...};

const Listings = (props: Props) => {

  const classes = useStyles();
  const [loader, setLoader] = React.useState(true);

  React.useEffect(() => {
    ipcRenderer.on('send-listings', (event: SyntheticEvent<>, listings: Array<Listing>, showWarning: boolean) => {
      props.getListingsAction(listings);
      props.toggleListingsWarningAction(showWarning);
      setLoader(false);
    });
    
    ipcRenderer.send('request-listings');
    // Cleanup the listener events so that memory leaks are avoided.
    return function cleanup() {
      ipcRenderer.removeAllListeners('send-listings');
    };
  }, []);

  if (loader) {
    return (
      // Return a loading progress if the listings are not yet loaded
      <div
        style={{
          marginTop: 150,
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
  return (
    <div style={{ textAlign: 'center', marginTop: '80px' }}>
      <ListingsAccountCheck />
      <ListingsTable />
    </div>
  );
};

const mapStateToProps = state => ({
  ...state
});

export default connect(
  mapStateToProps,
  { getListingsAction, toggleListingsWarningAction }
)(Listings);
