/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint arrow-body-style: 0 */
/* eslint eqeqeq: 0 */
/* eslint no-unneeded-ternary: 0 */

import React from 'react';
import { makeStyles } from '@material-ui/styles';
import { connect } from 'react-redux';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import { store } from 'react-notifications-component';
import { ipcRenderer } from 'electron';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import { setAllowTestFeatures } from '../../actions/testFeaturesAction';

const useStyles = makeStyles(theme => ({
  miscButton: {
    backgroundColor: 'green'
  },
  autoorderButton: {
    backgroundColor: '#542e91'
  }
}));

const TestControls = props => {
  const classes = useStyles();
  
  const [headlessBrowsers, setHeadlessBrowsers] = React.useState(false);

  const [pressAmazonOrderButton, setPressAmazonOrderButton] = React.useState(0);

  const handleChange = name => event => {
    if (name === 'allowTestFeatures') {
      props.setAllowTestFeatures(event.target.checked);
    } else if (name === 'headless_browsers') {
      setHeadlessBrowsers(event.target.checked);
      ipcRenderer.send('toggle-headless-browsers-value');
    } else if (name === 'press_amazon_order_button') {
      const checked = event.target.checked ? 1 : 0;
      setPressAmazonOrderButton(checked);
      ipcRenderer.send('autoorder-settings', { action: 'change-test-settings', value: { press_amazon_order_button: checked } });

    }
    
  }

  const testReactNotification = () => {
    store.addNotification({
      title: "Wonderful!",
      message: "Test",
      type: "info",
      insert: "bottom",
      container: "bottom-right",
      animationIn: ["animated", "fadeIn"],
      animationOut: ["animated", "fadeOut"],
      dismiss: {
        duration: 5000,
        onScreen: true
      }
    });
  }

  React.useEffect(() => {
    ipcRenderer.on('get-headless-browsers-value', (event, value) => {
      setHeadlessBrowsers(value);
    });

    ipcRenderer.on('autoorder-settings', (event, resSettings) => {
      setPressAmazonOrderButton(resSettings.press_amazon_order_button);
    });

    ipcRenderer.send('get-headless-browsers-value');
    ipcRenderer.send('autoorder-settings', { action: 'query-autoorder-settings' });

    // Cleanup the listener events so that memory leaks are avoided.
    return function cleanup() {
      ipcRenderer.removeAllListeners('get-headless-browsers-value');
      ipcRenderer.removeAllListeners('autoorder-settings');
    };
  }, []);

  return (
    <div style={{ marginTop: 100 }}>
      <Grid container spacing={1} style={{ margin: '30px auto' }}>
        <Grid item xs>
          <FormControlLabel
            control={
              <Switch color="primary" checked={headlessBrowsers} onChange={handleChange('headless_browsers')} value="headless_browsers" />
            }
            label="Headless browsers"
          />
        </Grid>
        <Grid item xs>
          <FormControlLabel
            control={
              <Switch color="primary" checked={props.allowTestFeatures.value} onChange={handleChange('allowTestFeatures')} value="allowTestFeatures" />
            }
            label="Allow test features"
          />
        </Grid>
      </Grid>
      <Grid container spacing={1} style={{ margin: '30px auto' }}>
        <Grid item xs={12}>
          <h2 style={{ fontSize: '18px', textAlign: 'center', textTransform: 'uppercase' }}>Repricer</h2>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => ipcRenderer.send('reprice-amazon')}
          >
            Reprice Amazon
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => ipcRenderer.send('check-prices')}
          >
            Check all Prices
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => ipcRenderer.send('refactor-prices')}
          >
            Refactor prices
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => ipcRenderer.send('reprice-ebay')}
          >
            Reprice Ebay
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => ipcRenderer.send('manage-ebay-inventory')}
          >
            Manage Ebay Inventory
          </Button>
        </Grid>
      </Grid>
      <Grid container spacing={1} style={{ margin: '30px auto' }}>
        <Grid item xs={12}>
          <h2 style={{ fontSize: '18px', textAlign: 'center', textTransform: 'uppercase' }}>Misc</h2>
        </Grid>
        <Grid item xs>
          <Button
              size="small"
              variant="contained"
              color="primary"
              className={classes.miscButton}
              fullWidth
              onClick={() => ipcRenderer.send('send-user-data')}
            >
              Send user data
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.miscButton}
            fullWidth
            onClick={testReactNotification}
          >
            Test React Notification
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.miscButton}
            fullWidth
            onClick={() => ipcRenderer.send('test-dalio-account-check')}
          >
            Dalio Account Check
          </Button>
        </Grid>     
      </Grid>
      <Grid container spacing={1}>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.miscButton}
            fullWidth
            onClick={() => ipcRenderer.send('send-listings-to-server')}
          >
            Send listings to server
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.miscButton}
            fullWidth
            onClick={() => ipcRenderer.send('send-orders-to-server')}
          >
            Send orders to server
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.miscButton}
            fullWidth
            onClick={() => ipcRenderer.send('sync-listings-from-server')}
          >
            Sync listings from server
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={1}>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.miscButton}
            fullWidth
            onClick={() => ipcRenderer.send('sanny-soft-test')}
          >
            Chromium browser sannysoft test
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={1} style={{ margin: '30px auto' }}>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.miscButton}
            fullWidth
            onClick={() => ipcRenderer.send('backup-user-data')}
          >
            Backup user data
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.miscButton}
            fullWidth
            onClick={() => ipcRenderer.send('restore-user-data')}
          >
            Restore user data
          </Button>
        </Grid>
      </Grid>
      <Grid container spacing={1} style={{ margin: '30px auto' }}>
        <Grid item xs={12}>
          <h2 style={{ fontSize: '18px', textAlign: 'center', textTransform: 'uppercase' }}>Autoorder</h2>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.autoorderButton}
            fullWidth
            onClick={() => ipcRenderer.send('sync-ebay-orders')}
          >
            Sync Ebay Orders
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.autoorderButton}
            fullWidth
            onClick={() => ipcRenderer.send('automate-product-ordering')}
          >
            Automate product ordering
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.autoorderButton}
            fullWidth
            onClick={() => ipcRenderer.send('test-check-amazon-orders')}
          >
            Check Amazon Orders
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.autoorderButton}
            fullWidth
            onClick={() => ipcRenderer.send('test-check-amazon-tracking-numbers')}
          >
            Check Amazon Order`s Tracking Info
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={1}>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.autoorderButton}
            fullWidth
            onClick={() => ipcRenderer.send('mark-ebay-orders-as-dispatched')}
          >
            Mark Ebay orders as dispatched
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.autoorderButton}
            fullWidth
            onClick={() => ipcRenderer.send('send-trackings-to-bce')}
          >
            Send trackings to BCE
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.autoorderButton}
            fullWidth
            onClick={() => ipcRenderer.send('refresh-bce-tracking-data')}
          >
           Refresh BCE trackings
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.autoorderButton}
            fullWidth
            onClick={() => ipcRenderer.send('open-ebay-account-with-cookies')}
          >
            Ebay account with cookies
          </Button>
        </Grid>
        <Grid item xs>
          <Button
            size="small"
            variant="contained"
            color="primary"
            className={classes.autoorderButton}
            fullWidth
            onClick={() => ipcRenderer.send('leave-feedback')}
          >
            Leave feedback
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={1} style={{ margin: '30px auto' }}>
        <Grid item xs>
          <FormControlLabel
            control={
              <Switch color="primary" checked={pressAmazonOrderButton == '0' ? false : true} onChange={handleChange('press_amazon_order_button')} value="press_amazon_order_button" />
            }
            label="Press Amazon order button at the end of order"
          />
        </Grid>
      </Grid>
    </div>
  );
};

const mapStateToProps = state => ({
  ...state
});
  
export default connect(mapStateToProps, { setAllowTestFeatures })(TestControls);
