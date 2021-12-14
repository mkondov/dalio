/* eslint arrow-body-style: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint camelcase: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */

import React from 'react';
import { connect } from 'react-redux';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import LinearProgress from '@material-ui/core/LinearProgress';
import ScheduleIcon from '@material-ui/icons/Schedule';

import AmazonLogo from '../../../media/logos/amazon-logo.svg';

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
  divWrapper: {
    margin: '20px'
  },
  logo: {
    width: '100px', 
    margin: 'auto'
  },
  startedAt: {
    display: 'flex', 
    flexDirection: 'row', 
    alignItems: 'center'
  }
});

const AmazonOrderSyncStatusAction = props => {
  const classes = useStyles();
 
  if (props.amazonOrderSyncStatus.status) {
    return (
      <div className={classes.divWrapper}>
        <Paper elevation={6} variant="elevation" className={classes.paper}>
          <img src={AmazonLogo} className={classes.logo} alt="Amazon Logo" />

          <p>Checking your Amazon orders...</p>
          <div className={classes.startedAt}>
            <ScheduleIcon style={{ fontSize: '20px', marginRight: '5px' }} />
            <p style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase' }}>Started at: {props.amazonOrderSyncStatus.started_at}</p>
          </div>
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

export default connect(mapStateToProps)(AmazonOrderSyncStatusAction);

