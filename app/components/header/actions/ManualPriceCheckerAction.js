/* eslint arrow-body-style: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint camelcase: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-nested-ternary: 0 */

import React from 'react';
import { connect } from 'react-redux';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import LinearProgress from '@material-ui/core/LinearProgress';

import AmazonLogo from '../../../media/logos/amazon-logo.svg';
import WalmartLogo from '../../../media/logos/walmart-logo.svg';
import AliExpressLogo from '../../../media/logos/aliexpress-logo.svg';
import HomeDepotLogo from '../../../media/logos/home-depot-logo.svg';
import VidaXLLogo from '../../../media/logos/vidaxl-logo.svg';

const useStyles = makeStyles({
  paper: {
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    border: '1px solid #eee', 
    background: '#F8F8F8', 
    padding: '20px',
    width: '800px',
    margin: 'auto'
  },
  logo: {
    width: '100px', 
    margin: 'auto'
  },
  divWrapper: {
    margin: '20px'
  },
  startedAt: {
    display: 'flex', 
    flexDirection: 'row', 
    alignItems: 'center'
  }
});

const ManualPriceCheckerAction = props => {
  const classes = useStyles();
 
  if (props.manualPriceUpdater.status) {
    return (
      <div className={classes.divWrapper}>
        <Paper elevation={6} variant="elevation" className={classes.paper}>
          <img src={props.manualPriceUpdater.supplier === 'amazon' ? AmazonLogo : props.manualPriceUpdater.supplier === 'aliexpress' ? AliExpressLogo : props.manualPriceUpdater.supplier === 'homedepot' ? HomeDepotLogo : props.manualPriceUpdater.supplier === 'walmart' ? WalmartLogo : VidaXLLogo} className={classes.logo} alt="Supplier logo"/>
          <p style={{ marginBottom: 0 }}>Price checking:</p>
          <p style={{ fontWeight: 900 }}>{props.manualPriceUpdater.item_name}</p>
          <p style={{ marginBottom: 0 }}>Listings in queue: {props.manualPriceUpdater.total_listings}</p>
        </Paper>
        <LinearProgress variant="indeterminate" color="primary" style={{ width: '845px', margin: 'auto' }} />
      </div>
    );
  }

  return null;
}

const mapStateToProps = state => ({
  ...state
});

export default connect(mapStateToProps)(ManualPriceCheckerAction);

