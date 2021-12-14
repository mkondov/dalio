/* eslint arrow-body-style: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */

import React from 'react';
import { connect } from 'react-redux';
import { makeStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
import Tooltip from '@material-ui/core/Tooltip';

import KeyboardBackspaceIcon from '@material-ui/icons/KeyboardBackspace';
import PendingActionsIcon from '@material-ui/icons/Ballot';

import AmazonPriceCheckerAction from './actions/AmazonPriceCheckerAction';
import ManualPriceCheckerAction from './actions/ManualPriceCheckerAction';
import EbayRepricerNotification from './actions/EbayRepricerNotification';
import AmazonOrderSyncStatusAction from './actions/AmazonOrderSyncStatusAction';
import EbayOrderSyncStatusAction from './actions/EbayOrderSyncStatusAction';


const useStyles = makeStyles({
    drawer: {
        width: '100%'
    },
    pendingActionsButton: {
        color: '#fff',
        zIndex: 2
    },
    closeDrawerButton: {
        marginLeft: '10px',
        marginTop: '10px'
    },
    wrapper: {
        position: 'relative',
    },
    closeDrawerButtonIcon: {
        fontSize: '32px'
    },
    fabProgress: {
        position: 'absolute',
        top: 6,
        left: 6,
        zIndex: 1,
    }
});

const ActionTracker = props => {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [actionsRunning, setActionsRunning] = React.useState(false);

  const toggleDrawer = (anchOpen) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }

    setOpen(anchOpen);
  };

//   React.useEffect(() => {
//       setActionsRunning(true);
//   }, []);

  React.useEffect(() => {
    if ((
        props.amazonPriceUpdater.status || 
        props.manualPriceUpdater.status || 
        props.ebayRepricerStatus.status || 
        props.amazonOrderSyncStatus.status ||
        props.ebayOrderSyncStatus.status
        ) && !actionsRunning) {
        setActionsRunning(true);
    } else if ((
        !props.amazonPriceUpdater.status && 
        !props.manualPriceUpdater.status && 
        !props.ebayRepricerStatus.status && 
        !props.amazonOrderSyncStatus.status &&
        !props.ebayOrderSyncStatus.status
        ) && actionsRunning) {
        setActionsRunning(false);
    }
  }, [props.amazonPriceUpdater.status, props.manualPriceUpdater.status, props.ebayRepricerStatus.status, props.amazonOrderSyncStatus.status, props.ebayOrderSyncStatus.status]);

  return (
    <div>
      <React.Fragment>
        
        <div className={classes.wrapper}>
            <Tooltip title="Actions tracker">
                <IconButton 
                    aria-label="open" 
                    className={classes.pendingActionsButton} 
                    size="medium"
                    onClick={toggleDrawer(true)}
                >
                    <PendingActionsIcon />
                </IconButton>
            </Tooltip>

                {actionsRunning && <CircularProgress size={36} color="default" classes={{ root: classes.fabProgress }} disableShrink />}
        </div>

        <Drawer anchor="left" open={open} onClose={toggleDrawer(false)} classes={{ paperAnchorLeft: classes.drawer }}>
            <React.Fragment>
                <Grid container>
                    <Grid item xs={12}>
                        <IconButton 
                            aria-label="close" 
                            size="medium"
                            onClick={toggleDrawer(false)}
                            className={ classes.closeDrawerButton }
                        >
                            <KeyboardBackspaceIcon className={ classes.closeDrawerButtonIcon } />
                        </IconButton>
                    </Grid>

                    <Grid item xs={12}>
                        <h2 style={{ paddingLeft: '15px', fontSize: '18px', textAlign: 'center' }}>Actions tracker</h2>
                    </Grid> 
                
                    <Grid item xs={12} style={{ padding: '15px'}}>
                        <AmazonPriceCheckerAction />
                        <ManualPriceCheckerAction />
                        <EbayRepricerNotification />
                        <AmazonOrderSyncStatusAction />
                        <EbayOrderSyncStatusAction />
                        {!actionsRunning ? (
                            <p style={{ textAlign: 'center' }}>Currently, there are no actions to display.</p>
                        ) : null}
                    </Grid>
                </Grid>
            </React.Fragment>
        </Drawer>
    </React.Fragment>
    </div>
  );
}

const mapStateToProps = state => ({
    ...state
});

export default connect(mapStateToProps)(ActionTracker);
