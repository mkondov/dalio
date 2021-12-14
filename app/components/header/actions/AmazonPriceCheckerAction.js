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

const AmazonPriceCheckerAction = props => {
  const classes = useStyles();
  const { current_listing, total_listings } = props.amazonPriceUpdater;
  const [progressValue, setProgressValue] = React.useState(0);

  React.useEffect(() => {
    if (total_listings > 0) {
      const progress = (current_listing/total_listings) * 100;
      setProgressValue(progress);

    }
  }, [current_listing, total_listings]);
 
  if (props.amazonPriceUpdater.status) {
    return (
      <div className={classes.divWrapper}>
        <Paper elevation={6} variant="elevation" className={classes.paper}>
          <img src={AmazonLogo} className={classes.logo} alt="Amazon logo"/>

          <p>Price checking: {props.amazonPriceUpdater.current_listing}/{props.amazonPriceUpdater.total_listings}</p>
          <p>{props.amazonPriceUpdater.item_name}</p>
          <div className={classes.startedAt}>
            <ScheduleIcon style={{ fontSize: '20px', marginRight: '5px' }} />
            <p style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase' }}>Started at: {props.amazonPriceUpdater.started_at}</p>
          </div>
        </Paper>
        <LinearProgress variant="determinate" color="primary" style={{ width: '845px', margin: 'auto' }} value={progressValue} />
      </div>
    );
  }

  return null;
}

const mapStateToProps = state => ({
  ...state
});

export default connect(mapStateToProps)(AmazonPriceCheckerAction);

