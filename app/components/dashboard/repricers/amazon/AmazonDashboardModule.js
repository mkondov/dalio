/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint arrow-body-style: 0 */

import React from 'react';
import clsx from 'clsx';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Collapse from '@material-ui/core/Collapse';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Badge from '@material-ui/core/Badge';
import Icon from '@material-ui/core/Icon';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { ipcRenderer } from 'electron';
import { connect } from 'react-redux';
import { makeStyles } from '@material-ui/core/styles';
import { setAmazonRepricerSwitch, setAmazonInventoryManagementSwitch, setAmazonMarketplaceLogin } from '../../../../actions/amazonRepricerActions';
import AmazonSettingsPanel from './AmazonSettingsPanel';

const useStyles = makeStyles(theme => ({
  gridHeader: {
    backgroundColor: '#505050'
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
    marginTop: '20px',
    marginBottom: '20px',
    background: '#fff'
    // background: '#f5f5f5'
  },
  p: {
    fontSize: '12px',
    fontWeight: 700,
    paddingLeft: '10px',
    paddingRight: '10px'
  },
  messageP: {
    fontSize: '10px',
    fontWeight: 700,
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
  badgePrimary: {
    color: theme.palette.primary.main,
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
  }
}));

const AmazonDashboardModule = props => {
  const classes = useStyles();
  // This state variable will be responsible for deactivating the repricer, syncer and inventory manager buttons if the user didn`t log in in any of the accounts
  const [loggedIn, setLoggedIn] = React.useState(false);
  /* This state object will keep track which of the Amazon marketplaces the user has logged in
  * it is used in the login/logout functions and in to display conditional Amazon buttons
  */
  const [loggedInMarketplaces, setLoggedInMarketplaces] = React.useState({
    US: false,
    CA: false,
    MX: false,
    UK: false,
    DE: false,
    FR: false,
    IT: false,
    ES: false
  });
  // This state object will contain all Amazon account emails the user has used to login
  const [accountEmails, setAccountEmails] = React.useState({
    US: false,
    CA: false,
    MX: false,
    UK: false,
    DE: false,
    FR: false,
    IT: false,
    ES: false
  });
  // This state variable keeps track if the Amazon card is expanded or not
  const [expanded, setExpanded] = React.useState(false);


  // This state variable keeps track whether the dialog asking a user, if he really wants to logout from a marketplace, is open or not
  const [dialogOpen, setDialogOpen] = React.useState(false);
  // This state object keeps track of the dialog`s content
  const [dialog, setDialog] = React.useState({
    target: '',
    message: ''
  });

  // Toggles Amazon card`s expansion
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  React.useEffect(() => {
    // Listen for the Amazon check-login event from the main process
    ipcRenderer.on('check-amazon-login', (event, marketplaces, accounts) => {
      // When received -> update the loggedInMarketplaces object with the new data
      setLoggedInMarketplaces(prevState => {
        return { ...prevState, ...marketplaces };
      });
      // Update the account emails as well
      setAccountEmails(prevState => {
        return { ...prevState, ...accounts };
      });

      // IF the user can no longer login with the cookies -> stop repricing and intervals
      if (
        marketplaces.US === false &&
        marketplaces.CA === false &&
        marketplaces.UK === false &&
        marketplaces.DE === false &&
        marketplaces.FR === false &&
        marketplaces.IT === false &&
        marketplaces.ES === false
      ) {
        setLoggedIn(false);
        // If the repricer is switched ON
        if (props.amazonRepricerSwitch.running) {
          // Send an action to Redux which will update the global Amazon Reprice switch to OFF
          props.setAmazonRepricerSwitch({ running: false, status: ''});
          // Send an event to the main process which will terminate the repricer intervals/functions
          ipcRenderer.send('switch-amazon-repricer', false);
        }

        // If the inventory manager is switched ON
        if (props.amazonInventoryManagementSwitch.value) {
          // Send an action to Redux which will update the global Amazon Inventory Management switch to OFF
          props.setAmazonInventoryManagementSwitch(false);
          // Send an event to the main process which will terminate the inventory manager`s intervals/functions
          ipcRenderer.send('switch-amazon-inventory-management', false);
        }
      } else {
        // Else -> the user has logged in/can still log in
        setLoggedIn(true);
      }
    });

    /* Sends an event to the main process that queries all amazon marketplaces` login statuses
    * the check-amazon-login listener in the beginning of this useEffect handles the response to THIS event
    */
    ipcRenderer.send('check-amazon-login');

    // Create an interval that checks whether we are still logged in Amazon every 10 minutes
    const checkAmazonLoginInterval = setInterval(() => {
      ipcRenderer.send('check-amazon-login');
    }, 600000); // 10 minutes

    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('check-amazon-login');
      clearInterval(checkAmazonLoginInterval);
    };
  }, []);

  const toggleAmazonRepricerChecked = () => {
    props.setAmazonRepricerSwitch({ running: !props.amazonRepricerSwitch.running, status: '' });
    ipcRenderer.send('switch-amazon-repricer', !props.amazonRepricerSwitch.running);
  };

  const toggleAmazonInventoryManagement = () => {
    props.setAmazonInventoryManagementSwitch(!props.amazonInventoryManagementSwitch.value);
    ipcRenderer.send('switch-amazon-inventory-management', !props.amazonInventoryManagementSwitch.value);
  };

  // When a red Amazon icon button is pressed
  const logIn = country => {
    // If the user is not logged in in that marketplace -> start the login process
    if (!loggedInMarketplaces[country]) {
      ipcRenderer.send('login-amazon', country);
    }
  };

  // When a green Amazon icon button is pressed
  const logOut = country => {
    // If the user is logged in in that marketplace -> start the logout process
    if (loggedInMarketplaces[country]) {
      ipcRenderer.send('logout-amazon', country);
      setDialogOpen(false);
      setDialog({
        target: '',
        message: ''
      });
    }
  };

  // Toggle the 'logout' dialog window open/close
  const handleDialogOpen = status => {
    setDialogOpen(status);
  };

  const dialogActions = (action, country) => {
    if (action === 'logout') {
      setDialog({
        target: country,
        message: `Would you like to logout from Amazon ${country}?`
      });

      setDialogOpen(true);
    }
  };

  return (
    <React.Fragment>
      <Card className={classes.card} elevation={1}>
        <Grid container spacing={1}>
          <Grid className={classes.gridHeader} item xs={10}>
            <div className={classes.cardHeader}>
              <h4 className={classes.cardHeaderTitle}>Amazon</h4>
            </div>
          </Grid>
          <Grid className={classes.gridHeader} item xs={2}>
            <Tooltip
                disableFocusListener
                title="Amazon Settings"
              >
              <IconButton
                className={clsx(classes.expand, {
                  [classes.expandOpen]: expanded
                })}
                onClick={handleExpandClick}
                aria-expanded={expanded}
                aria-label="show more"
              >
                <Icon className="fas fa-cog" style={{ color: '#fff', fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
        <Grid container spacing={1} style={{ padding: 10 }}>
          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                {!loggedInMarketplaces.US ? (
                  <Tooltip disableFocusListener title="Log in Amazon US">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon US login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('US')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.US}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'US')}
                    >
                      <Icon className="fab fa-amazon" />
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
                {!loggedInMarketplaces.CA ? (
                  <Tooltip disableFocusListener title="Log in Amazon CA">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon CA login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('CA')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.CA}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon CA login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'CA')}
                    >
                      <Badge variant="dot">
                        <Icon className="fab fa-amazon" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>Canada</p>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                {!loggedInMarketplaces.UK ? (
                  <Tooltip disableFocusListener title="Log in Amazon UK">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon UK login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('UK')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.UK}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon UK login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'UK')}
                    >
                      <Icon className="fab fa-amazon" />
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
                  <Tooltip disableFocusListener title="Log in Amazon DE">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon DE login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('DE')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.DE}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon DE login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'DE')}
                    >
                      <Icon className="fab fa-amazon" />
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
                {!loggedInMarketplaces.FR ? (
                  <Tooltip disableFocusListener title="Log in Amazon FR">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon FR login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('FR')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.FR}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon FR login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'FR')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>France</p>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                {!loggedInMarketplaces.IT ? (
                  <Tooltip disableFocusListener title="Log in Amazon IT">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon IT login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('IT')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.IT}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon IT login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'IT')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>Italy</p>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                {!loggedInMarketplaces.ES ? (
                  <Tooltip disableFocusListener title="Log in Amazon ES">
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon ES login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeRed}
                      onClick={() => logIn('ES')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip
                    disableFocusListener
                    title={`You have logged in with account - ${accountEmails.ES}. Click again to log out.`}
                  >
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon ES login"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      className={classes.badgeGreen}
                      onClick={() => dialogActions('logout', 'ES')}
                    >
                      <Icon className="fab fa-amazon" />
                    </IconButton>
                  </Tooltip>
                )}
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>Spain</p>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid container spacing={1} style={{ padding: 10 }}>
          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                
                  {loggedIn ? (
                    <Tooltip disableFocusListener title="Sync your Amazon products.">
                      {props.amazonProductSyncStatus.value ? (
                        <IconButton
                          style={{ padding: 7, animation: `spin 3s linear infinite` }}
                          aria-label="Amazon product sync"
                          aria-controls="menu-appbar"
                          aria-haspopup="true"
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
                          aria-label="Amazon product sync"
                          aria-controls="menu-appbar"
                          aria-haspopup="true"
                          onClick={() => ipcRenderer.send('sync-amazon-listings')}
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
                      aria-label="Amazon product sync"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
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
                <p className={classes.countryP}>{props.amazonProductSyncStatus.value ? 'Dalio is syncing your listings. It might take 2-3 minutes to complete.' : 'Sync your listings'}</p>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                <Tooltip
                  disableFocusListener
                  title={
                    props.amazonRepricerSwitch.running === true
                      ? 'Stop Amazon repricer'
                      : 'Start Amazon repricer'
                  }
                >
                  {loggedIn ? (
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon repricer automator"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      color="inherit"
                      onClick={() => toggleAmazonRepricerChecked()}
                    >
                      {props.amazonRepricerSwitch.running === false ? (
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
                      aria-label="Amazon repricer automator"
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
                <p className={classes.countryP}>Automate repricer</p>
              </Grid>
              {props.amazonRepricerSwitch.running && (
                props.amazonRepricerSwitch.status !== '' ? (
                  <Grid item xs>
                    <p className={classes.countryP}>Next reprice run: {props.amazonRepricerSwitch.status}</p>
                  </Grid>
                ) : null
              )}
            </Grid>
          </Grid>
          {/* <Grid item xs>
            <Grid container direction="column">
              <Grid item xs>
                <Tooltip
                  disableFocusListener
                  title={
                    props.amazonInventoryManagementSwitch.value === true
                      ? 'Stop inventory management'
                      : 'Start inventory management'
                  }
                >
                  {loggedIn ? (
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon inventory management automator"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      color="inherit"
                      onClick={() => toggleAmazonInventoryManagement()}
                    >
                      {props.amazonInventoryManagementSwitch.value === false ? (
                        <Icon
                          className="fas fa-boxes"
                          style={{ color: '#ff0000', width: 'auto' }}
                        />
                      ) : (
                        <Icon
                          className="fas fa-boxes"
                          style={{ color: '#00ff00', width: 'auto' }}
                        />
                      )}
                    </IconButton>
                  ) : (
                    <IconButton
                      style={{ padding: 7 }}
                      aria-label="Amazon inventory management automator"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      color="inherit"
                      disabled
                    >
                      <Icon
                        className="fas fa-boxes"
                        style={{ width: 'auto' }}
                      />
                    </IconButton>
                  )}
                </Tooltip>
              </Grid>
              <Grid item xs>
                <p className={classes.countryP}>
                  Automate inventory management
                </p>
              </Grid>
            </Grid>
          </Grid> */}
          <Grid item xs={12}>
            {!loggedIn && (
                <p className={classes.p}>
                  You are not logged in Amazon Seller Central. Click the Amazon
                  button above in order to log in.
                </p>
            )}
          </Grid>
        </Grid>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <CardContent style={{ padding: 0 }}>
            <AmazonSettingsPanel/>
          </CardContent>
        </Collapse>
      </Card>
      <Dialog
        open={dialogOpen}
        onClose={() => handleDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Logout of Amazon profile?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Would you like to logout from Amazon {dialog.target}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleDialogOpen(false)} color="primary">
            No
          </Button>
          <Button
            onClick={() => logOut(dialog.target)}
            color="primary"
            autoFocus
          >
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
  {
    setAmazonRepricerSwitch,
    setAmazonInventoryManagementSwitch,
    setAmazonMarketplaceLogin
  }
)(AmazonDashboardModule);
