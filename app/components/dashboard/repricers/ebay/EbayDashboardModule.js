/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-nested-ternary: 0 */

import React from 'react';
import clsx from 'clsx';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Collapse from '@material-ui/core/Collapse';
import Button from '@material-ui/core/Button';
import Badge from '@material-ui/core/Badge';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Icon from '@material-ui/core/Icon';
import ListingsIcon from '@material-ui/icons/AssignmentTurnedIn';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';

import { ipcRenderer } from 'electron';
import { connect } from 'react-redux';
import { makeStyles } from '@material-ui/core/styles';
import { setEbayRepricerSwitch, setEbayAutoorderSwitch } from '../../../../actions/ebayActions';
import EbaySettingsPanel from './EbaySettingsPanel';
import EbayInventoryManagerSettingsPanel from './EbayInventoryManagerSettingsPanel';

const useStyles = makeStyles(theme => ({
  gridHeader: {
    backgroundColor: '#505050'
  },
  gridContainer: {
    padding: '10px'
  },
  cardHeader: {
    width: '100%',
    padding: '10px'
  },
  cardHeaderTitle: {
    color: '#fff',
    fontWeight: 700,
    margin: 0,
    fontSize: '14px'
  },
  card: {
    width: '100%',
    margin: 'auto',
    marginTop: '10px',
    marginBottom: '10px',
    background: '#fff'
  },
  listingsCountDiv: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  p: {
    fontSize: '12px',
    fontWeight: 700,
    paddingLeft: '10px',
    paddingRight: '10px'
  },
  span: {
    color: theme.palette.primary.main,
  },
  countryP: {
    fontSize: '10px',
    fontWeight: 500
  },
  button: {
    margin: theme.spacing(1)
  },
  input: {
    display: 'none'
  },
  spanPrimaryColor: {
    color: theme.palette.primary.main,
    fontSize: '18px',
    fontWeight: 900
  },
  formControlLabel: {
    margin: 'auto'
  },
  cardActions: {
    justifyContent: 'center'
  },
  typographyWeight: {
    textAlign: 'right',
    fontWeight: 900
  },
  badgeGreen: {
    color: '#00ff00'
  },
  badgeRed: {
    color: '#ff0000'
  },
  expand: {
    transform: 'rotate(0deg)',
    marginLeft: 'auto',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest
    })
  },
  expandOpen: {
    transform: 'rotate(180deg)'
  },
  flexRow: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    alignContent: 'center'
  }
}));

const defaultProps = {
  // color: 'primary',
  children: <ListingsIcon style={{ color: '#fff' }} />,
};

const warningBadgeProps = {
  color: 'error',
  children: <ReportProblemIcon style={{ color: 'yellow' }} />,
};

const EbayDashboardModule = props => {

  const classes = useStyles();
  // This state variable will be responsible for deactivating the repricer and syncer buttons if the user didn`t log in in an Ebay account
  const [loggedIn, setLoggedIn] = React.useState(false);
  // This state variable will contain the Ebay account email the user has used to login
  const [account, setAccount] = React.useState(null);
  const [listingsCount, setListingsCount] = React.useState(0);

  /* This state object will keep track which of the Ebay marketplaces the user has logged in
  * it is used in the login/logout functions and in to display conditional Amazon buttons
  */
  const [loggedInMarketplaces, setLoggedInMarketplaces] = React.useState({
    US: false,
    UK: false,
    DE: false,
    CA: false,
    IT: false,
  });
  // This state object will contain all Amazon account emails the user has used to login
  const [accountEmails, setAccountEmails] = React.useState({
    US: false,
    UK: false,
    DE: false,
    CA: false,
    IT: false,
  });

  // This state variable keeps track if the Ebay card is expanded or not
  const [expanded, setExpanded] = React.useState(false);
  // This state variable keeps track of all the settings that are relevant to Ebay -> default is refactor_percentage = 15
  const [settings, setSettings] = React.useState({
    refactor_percentage: 15
  });
  // This state variable keeps track whether the dialog asking a user, if he really wants to logout from Ebay, is open or not
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // This state object keeps track of the dialog`s content
  const [dialog, setDialog] = React.useState({
    target: '',
    message: ''
  });

  const [cardContent, setCardContent] = React.useState('repricer-settings');

  // Changes Ebay settings by sending an event to the main process -> which is then handled and DB updated
  const settingsChange = name => event => {
    // If the refactor percentage`s number is greater than 0
    if (event.target.value > 0) {
      // Update the settings state object
      setSettings({ ...settings, [name]: event.target.value });
      // Send an event to the main process, so the data can be updated in the DB as well
      ipcRenderer.send('ebay-settings', {
        action: name,
        value: event.target.value
      });
    }
  };

  // Toggles Ebay card`s expansion
  const handleExpandClick = element => {
    if (element === cardContent) {
      setExpanded(!expanded);
    } else {
      setExpanded(true);
    }
    
    setCardContent(element);
  };

  React.useEffect(() => {
    // Listen for 'ebay-setting' event coming from the main process
    ipcRenderer.on('ebay-settings', (event, resSettings) => {
      // When received -> update the state object with the new data
      setSettings({
        ...settings,
        refactor_percentage: resSettings.ebay_refactor_percentage
      });
    });

    // Listen for the Ebay check-login response from the main process
    ipcRenderer.on('check-ebay-login', (event, marketplaces, accounts) => {

      // When received -> update the loggedInMarketplaces object with the new data
      setLoggedInMarketplaces(prevState => ({ ...prevState, ...marketplaces }));
      // Update the account emails as well
      setAccountEmails(prevState => ({ ...prevState, ...accounts }));
      // console.log('marketplaces in ebay dahsboard module', marketplaces);
      // IF the user can no longer login with the cookies -> stop repricing and intervals
      if (
        marketplaces.US === false &&
        marketplaces.UK === false &&
        marketplaces.DE === false &&
        marketplaces.CA === false &&
        marketplaces.IT === false
      ) {
        setLoggedIn(false);
        // If the repricer is switched ON
        if (props.ebayRepricerSwitch.running) {
          // Send an action to Redux which will update the global Ebay Reprice switch to OFF
          props.setEbayRepricerSwitch({ running: false, status: ''});
          // Send an event to the main process which will terminate the repricer intervals/functions
          ipcRenderer.send('switch-ebay-repricer', false);
        }

        if (props.ebayAutoorderSwitch.running) {
          // Send an action to Redux which will update the global Ebay Autoorder switch to OFF
          props.setEbayAutoorderSwitch({ running: false, status: ''});
          // Send an event to the main process which will terminate the autoorder intervals/functions
          ipcRenderer.send('switch-ebay-autoorder', false);
        }
      } else {
        // Else -> the user has logged in/can still log in
        setLoggedIn(true);
      }
    });

    /* Sends an event to the main process that queries all Ebay settings
    * the listener in the beginning of this useEffect handles the response to THIS event
    */
    ipcRenderer.send('ebay-settings', { action: 'query-ebay-settings' });

    /* Sends an event to the main process that queries the Ebay account login status
    * the check-ebay-login listener in the beginning of this useEffect handles the response to THIS event
    */
    if (!loggedIn) {
      ipcRenderer.send('check-ebay-login');
    }

    ipcRenderer.on('count-listings', (event, count) => {
      setListingsCount(count);
    });

    ipcRenderer.send('count-listings');

    // Check whether we are still logged in Ebay every 10 minutes
    const checkEbayLoginInterval = setInterval(() => {
      ipcRenderer.send('check-ebay-login');
    }, 600000); // 10 minutes

    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('ebay-settings');
      ipcRenderer.removeAllListeners('check-ebay-login');
      ipcRenderer.removeAllListeners('count-listings');
      clearInterval(checkEbayLoginInterval);
    };
  }, []);

  const toggleEbayRepricerChecked = () => {
    props.setEbayRepricerSwitch({ running: !props.ebayRepricerSwitch.running, status: '' });
    ipcRenderer.send('switch-ebay-repricer', !props.ebayRepricerSwitch.running);
  };

  const toggleEbayAutoorderChecked = () => {
    props.setEbayAutoorderSwitch({ running: !props.ebayAutoorderSwitch.running, status: '' });
    ipcRenderer.send('switch-ebay-autoorder', !props.ebayAutoorderSwitch.running);
  };

  const logIn = country => {
    // If the user is not logged in in that marketplace -> start the login process
    if (!loggedInMarketplaces[country]) {
      ipcRenderer.send('login-ebay', country);
    }
  };

  const logOut = country => {
    // If the user is logged in in that marketplace -> start the logout process
    if (loggedInMarketplaces[country]) {
      ipcRenderer.send('logout-ebay', country);
      setDialogOpen(false);
      setDialog({
        target: '',
        message: ''
      });
    }
  };

  const dialogActions = (action, country) => {
    if (action === 'logout') {
      setDialog({
        target: country,
        message: `Would you like to logout from Ebay ${country}?`
      });

      setDialogOpen(true);
    }
  };
  return (
    <React.Fragment>
      <Card className={classes.card} elevation={1}>
        <Grid container spacing={1} style={{ padding: 0 }} className={classes.gridHeader}>
          <Grid item xs={10}>
            <div className={classes.cardHeader}>
              <Icon className="fab fa-ebay" style={{ color: '#fff', fontSize: 38, width: 'auto' }} />
            </div>
          </Grid>

          <Grid item xs={2} className={classes.flexRow}>
            <Tooltip
              disableFocusListener
              title="eBay listings ready to be repriced"
            >
              <Badge 
                badgeContent={props.listingsInfo.repriceable_listings} 
                showZero
                max={9999}
                color={props.listingsInfo.repriceable_listings > 0 ? "primary": "error"}
                {...defaultProps} />
            </Tooltip>

            {(props.accountStatus.status === '0' || props.accountStatus.status === '2') && listingsCount > 100 ? (
              <Tooltip
                disableFocusListener
                title="Listings not being tracked"
              >
                <Badge 
                  badgeContent={listingsCount - props.toggleListingsWarning.count - 100} 
                  showZero
                  max={9999}
                  {...warningBadgeProps} />
              </Tooltip>
            ) : props.toggleListingsWarning.count > 0 ? (
              <Tooltip
                disableFocusListener
                title="Listings not being tracked"
              >
                <Badge 
                  badgeContent={props.toggleListingsWarning.count} 
                  showZero
                  max={9999}
                  {...warningBadgeProps} />
              </Tooltip>
            ) : null}

          </Grid>

        </Grid>
        
        <Grid container spacing={1} style={{ padding: 10 }}>

          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                {!loggedInMarketplaces.US ? (
                  <Tooltip disableFocusListener title="Log in Ebay US">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay US login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('US')}
                    >
                      <Icon className="fab fa-ebay" style={{ width: 'auto' }} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.US}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'US')}
                    >
                      <Icon className="fab fa-ebay" style={{ width: 'auto' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>USA</p>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                {!loggedInMarketplaces.UK ? (
                  <Tooltip disableFocusListener title="Log in Ebay UK">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay UK login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('UK')}
                    >
                      <Icon className="fab fa-ebay" style={{ width: 'auto' }}/>
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.UK}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay UK login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'UK')}
                    >
                      <Icon className="fab fa-ebay" style={{ width: 'auto' }}/>
                    </IconButton>
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>United Kingdom</p>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                {!loggedInMarketplaces.DE ? (
                  <Tooltip disableFocusListener title="Log in Ebay DE">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay DE login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('DE')}
                    >
                      <Icon className="fab fa-ebay" style={{ width: 'auto' }}/>
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.DE}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay DE login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'DE')}
                    >
                      <Icon className="fab fa-ebay" style={{ width: 'auto' }}/>
                    </IconButton>
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>Germany</p>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                {!loggedInMarketplaces.CA ? (
                  <Tooltip disableFocusListener title="Log in Ebay CA">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay CA login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('CA')}
                    >
                      <Icon className="fab fa-ebay" style={{ width: 'auto' }}/>
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.CA}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay CA login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'CA')}
                    >
                      <Icon className="fab fa-ebay" style={{ width: 'auto' }}/>
                    </IconButton>
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>Canada</p>
              </Grid>
            </Grid>
          </Grid>

        </Grid>

        <Grid container spacing={1} className={classes.gridContainer}>
          <Grid item xs>  
            <Grid container direction="column">
                <Grid item xs>
                {loggedIn ? (
                  <Tooltip disableFocusListener title="Sync your Ebay products.">
                    {props.ebayProductSyncStatus.value ? (
                      <IconButton
                        style={{ padding: 7, animation: `spin 1s linear infinite` }}
                        aria-label="Ebay product sync"
                        disabled
                      >
                        <Icon
                          className="fas fa-sync-alt"
                          style={{ color: '#00ff00', width: 'auto' }}
                        />
                      </IconButton>
                    ) : (
                      <IconButton
                        style={{ padding: 7 }}
                        aria-label="Ebay product sync"
                        onClick={() => ipcRenderer.send('sync-ebay-listings')}
                      >
                        <Icon
                          className="fas fa-sync-alt"
                          style={{ color: '#d5008d', width: 'auto' }}
                        />
                      </IconButton>
                    )}
                    
                </Tooltip>
                ) : (
                  <IconButton
                    style={{ padding: 7 }}
                    aria-label="Ebay product sync"
                    disabled
                  >
                    <Icon
                      className="fas fa-sync-alt"
                      style={{ width: 'auto' }}
                    />
                  </IconButton>
                )}
                </Grid>
                <Grid item xs>
                  <p className={classes.countryP}>{props.ebayProductSyncStatus.value ? 'Dalio is syncing your listings. It might take 2-3 minutes to complete.' : 'Sync your listings from eBay'}</p>
                </Grid>
              </Grid>
          </Grid>       
          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                <Tooltip
                  disableFocusListener
                  title={
                    props.ebayRepricerSwitch.running === true
                      ? 'Stop Ebay repricer'
                      : 'Start Ebay repricer'
                  }
                >
                  {loggedIn && props.listingsInfo.repriceable_listings > 0 ? (
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay repricer automator"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      color="inherit"
                      onClick={() => toggleEbayRepricerChecked()}
                    >
                      {props.ebayRepricerSwitch.running === false ? (
                        <Icon
                          className="fas fa-robot"
                          style={{ color: '#ff0000', width: 'auto' }}
                        />
                      ) : (
                        <Icon
                          className="fas fa-robot"
                          style={{ color: '#00ff00', width: 'auto' }}
                        />
                      )}
                    </IconButton>
                  ) : (
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Ebay repricer automator"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      color="inherit"
                      disabled
                    >
                      <Icon
                        className="fas fa-robot"
                        style={{ width: 'auto' }}
                      />
                    </IconButton>
                  )}
                </Tooltip>
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>Automate price and inventory monitor</p>
              </Grid>
              {props.ebayRepricerSwitch.running && (
                props.ebayRepricerSwitch.status !== '' ? (
                  <Grid item xs>
                    <p className={classes.countryP}>Next check run: {props.ebayRepricerSwitch.status}</p>
                  </Grid>
                ) : null
              )}
            </Grid>
          </Grid>
          
          {/* EBAY AUTOORDER */}
          {/* {props.allowTestFeatures.value ? (
            <Grid item xs>
              <Grid container direction="column">
                <Grid item xs>
                  <Tooltip
                    disableFocusListener
                    title={
                      props.ebayAutoorderSwitch.running === true
                        ? 'Stop Ebay auto order'
                        : 'Start Ebay auto order'
                    }
                  >
                    {loggedIn ? (
                      <IconButton
                        style={{ padding: 7 }}
                        aria-label="Ebay auto order"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        color="inherit"
                        onClick={() => toggleEbayAutoorderChecked()}
                        disabled
                      >
                        {props.ebayAutoorderSwitch.running === false ? (
                          <Icon
                            className="fas fa-shopping-cart"
                            style={{ color: 'grey', width: 'auto' }}
                          />
                        ) : (
                          <Icon
                            className="fas fa-shopping-cart"
                            style={{ color: '#00ff00', width: 'auto' }}
                          />
                        )}
                      </IconButton>
                    ) : (
                      <IconButton
                        style={{ padding: 7 }}
                        aria-label="Ebay auto order"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        color="inherit"
                        disabled
                      >
                        <Icon
                          className="fas fa-shopping-cart"
                          style={{ width: 'auto' }}
                        />
                      </IconButton>
                    )}
                  </Tooltip>
                </Grid>
                <Grid item xs>
                  <p className={classes.countryP}>Auto Order</p>
                </Grid>
              </Grid>
            </Grid>
          ) : null} */}
          

          <Grid item xs={12}>
            {!loggedIn && (
              <p className={classes.p}>
                You are not logged in Ebay Seller Hub. Click the Ebay button
                above in order to log in.
              </p>
            )}
          </Grid>
        </Grid>

        <Grid container style={{ backgroundColor: '#f5f5f5' }} spacing={0}>
          <Grid item xs={6}>
            <Tooltip
                disableFocusListener
                title="Ebay Settings"
              >
                <IconButton
                  style={{ width: '100%', borderRadius: 0 }}
                  onClick={() => handleExpandClick('repricer-settings')}
                  aria-expanded={expanded}
                  aria-label="show more"
                >
                  <Icon className="fas fa-sliders-h" style={{ color: '#000', fontSize: '18px' }} /> <span style={{ fontSize: '14px', fontWeight: 500, paddingLeft: 5, textTransform: 'uppercase' }}>Repricer Settings</span>
                </IconButton>
              </Tooltip>
          </Grid>

          <Grid item xs={6}>
            <Tooltip
                disableFocusListener
                title="Ebay inventory manager settings"
              >
                <IconButton
                  style={{ width: '100%', borderRadius: 0 }}
                  onClick={() => handleExpandClick('inventory-manager-settings')}
                  aria-expanded={expanded}
                  aria-label="show more"
                >
                  <Icon className="fas fa-boxes" style={{ color: '#000', fontSize: '18px', width: '25px' }} /> <span style={{ fontSize: '14px', fontWeight: 500, paddingLeft: 5, textTransform: 'uppercase' }}>Inventory Manager Settings</span>
                </IconButton>
              </Tooltip>
          </Grid>

        </Grid>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <CardContent style={{ padding: 0 }}>
            {cardContent === 'repricer-settings' ? <EbaySettingsPanel/> : <EbayInventoryManagerSettingsPanel />}
          </CardContent>
        </Collapse>
      </Card>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Logout of Ebay profile?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Would you like to logout from Ebay?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)} 
            color="primary">
            No
          </Button>
          <Button 
            onClick={() => logOut(dialog.target)} 
            color="primary" 
            autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
};

const mapStateToProps = state => ({
  ...state
});

export default connect(
  mapStateToProps,
  { setEbayRepricerSwitch, setEbayAutoorderSwitch }
)(EbayDashboardModule);
