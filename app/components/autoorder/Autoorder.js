/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint arrow-body-style: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint eqeqeq: 0 */
/* eslint no-shadow: 0 */
/* eslint no-return-assign: 0 */
/* eslint no-unused-expressions: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint no-unused-vars: 0 */
// @flow

import React from 'react';
import { connect } from 'react-redux';
import { ipcRenderer, shell } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Avatar from '@material-ui/core/Avatar';

import PersonPinIcon from '@material-ui/icons/PersonPin';
import SettingsIcon from '@material-ui/icons/Build';
import ShoppingBasketIcon from '@material-ui/icons/ShoppingBasket';
import ShowChartIcon from '@material-ui/icons/ShowChart';
import WarningIcon from '@material-ui/icons/Warning';

import Orders from './orders/Orders';
import ChooseSourceAccount from './components/ChooseSourceAccount';
import DisplayAccounts from './components/DisplayAccounts';
import AutoorderSettings from './components/AutoorderSettings';
import AutoorderOnboarding from './orders/AutoorderOnboarding';
import OrdersAnalytics from './orders/OrdersAnalytics';

import AmazonLogo from '../../media/logos/amazon-logo.svg';

// TYPES
import type { Account } from '../../types/AccountsTypes';

const useStyles = makeStyles(() => ({
  root: {
    flexGrow: 1,
  },
  containerMaxWidth: {
    width: "450px",
    margin: 'auto'
  },
  textField: {
    width: "450px"
  },
  gridItem: {
    padding: 10
  }, 
  p: {
    fontSize: 14
  },
  badgeSuccess: {
    color: 'green'
  },
  badgeWarning: {
    color: 'orange'
  },
  badgeError: {
    color: 'red'
  }
}));

const TabPanel = props => {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box style={{ padding: 0, marginTop: 20}} elevation={0} p={3}>{children}</Box>
    </Typography>
  );
}

const a11yProps = index => {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

type AllAccounts = {
  [key: number]: Account
};

const Autoorder = props => {
  const classes = useStyles();
  const [value, setValue] = React.useState(0);(value: number)
  const [showLoginFields, setShowLoginFields] = React.useState(false);(showLoginFields: boolean)
  const [accountSelect, setAccountSelect] = React.useState(0);(accountSelect: number)
  const [loggedInEbay, setLoggedInEbay] = React.useState(false);

  /* This state object will keep track which of the Amazon marketplaces the user has logged in
  * it is used in the login/logout functions and in to display conditional Amazon buttons
  */
  const [loggedInMarketplaces, setLoggedInMarketplaces] = React.useState([]);(loggedInMarketplaces: Array<Account>)
  const [allAccounts, setAllAccounts] = React.useState({});(allAccounts: AllAccounts)
  const [trackingFunds, setTrackingFunds] = React.useState(0);
  const [checkingTrackingFundsLoader, setCheckingTrackingFundsLoader] = React.useState(false);

  const handleTabChange = (event: SyntheticEvent<>, newValue: number): void => {
    setValue(newValue);
  };

  const handleAccountSelect = (event: SyntheticEvent<>): void => {
    setAccountSelect(event.target.value);
  };

  const toggleAddNewSourceAccount = (): void => {
    setShowLoginFields(!showLoginFields);
  }

  const removeAccountFromState = (): void => {
    const allAccountsDeepCopied: AllAccounts = JSON.parse(JSON.stringify(allAccounts));
    
    delete allAccountsDeepCopied[accountSelect];
    setAllAccounts(() => {
      return { ...allAccountsDeepCopied };
    });

    const loggedInMarketplacesFiltered: Array<Account> = loggedInMarketplaces.filter((value: Account, index: number, arr: Array<Account>) => {
      return value.id !== accountSelect;
     });
  
     if (loggedInMarketplacesFiltered.length === 0) {
        setAccountSelect(0);
        setShowLoginFields(true);
      } else {
        setAccountSelect(loggedInMarketplacesFiltered[0].id);
      }

      setLoggedInMarketplaces([ ...loggedInMarketplacesFiltered ]);
  }

  React.useEffect(() => {
    type AutoorderAccounts = {
      US: Array<Account>,
      UK: Array<Account>
    };

    // Listen for the Amazon check-login event from the main process
    ipcRenderer.on('check-amazon-autoorder-login', (event: SyntheticEvent<>, autoorderAccounts: AutoorderAccounts) => {
      const accounts: Object = {};
      if (autoorderAccounts.US.length > 0) {
        for (const account of autoorderAccounts.US) {
          accounts[account.id] = account;
          accounts[account.id].settings = JSON.parse(account.settings);
        }
      }

      if (autoorderAccounts.UK.length > 0) {
        for (const account of autoorderAccounts.UK) {
          accounts[account.id] = account;
          accounts[account.id].settings = JSON.parse(account.settings);
        }
      }
      const mergedMarketplaces = [ ...autoorderAccounts.US, ...autoorderAccounts.UK ]

      if (mergedMarketplaces.length === 0) {
        setAccountSelect(0);
        setShowLoginFields(true);
      } else {
        setAccountSelect(mergedMarketplaces[0].id);
        setShowLoginFields(false);
      }


      setLoggedInMarketplaces(prevState => {
        // Combines the two arrays (old marketplaces and new marketplaces) -> compares their id`s and updates the values if necessary (prevents adding the same account twice in the same array)
        const result = [...prevState.concat(mergedMarketplaces).reduce((r, o) => {
            r.has(o.id) || r.set(o.id, {});
            const item = r.get(o.id);
            Object.entries(o).forEach(([k, v]) =>
              item[k] = Array.isArray(item[k]) ? 
                [...new Set([...item[k], ...v])] : v
            );
            return r;
          }, new Map()).values()];
          
        return result;
      });

      setAllAccounts(prevState => {
        return { ...prevState, ...accounts };
      });
    });

    /* Sends an event to the main process that queries all amazon marketplaces` login statuses
    * the check-amazon-autoorder-login listener in the beginning of this useEffect handles the response to THIS event
    */
    ipcRenderer.send('check-amazon-autoorder-login');

    // Create an interval that checks whether we are still logged in Amazon every 10 minutes
    const checkAmazonLoginInterval: IntervalID = setInterval(() => {
      ipcRenderer.send('check-amazon-autoorder-login');
    }, 600000); // 10 minutes

    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('check-amazon-autoorder-login');
      clearInterval(checkAmazonLoginInterval);
    };
  }, []);

  React.useEffect(() => {
    // Listen for the Ebay check-login response from the main process
    ipcRenderer.on('check-ebay-login', (event, marketplaces, accounts) => {
      if (
        marketplaces.US === false &&
        marketplaces.UK === false &&
        marketplaces.DE === false &&
        marketplaces.CA === false &&
        marketplaces.IT === false
      ) {
        setLoggedInEbay(false);
      } else {
        setLoggedInEbay(true);
      }
    });

    /* Sends an event to the main process that queries the Ebay account login status
    * the check-ebay-login listener in the beginning of this useEffect handles the response to THIS event
    */
    if (!loggedInEbay) {
      ipcRenderer.send('check-ebay-login');
    }

    // Check whether we are still logged in Ebay every 10 minutes
    const checkEbayLoginInterval = setInterval(() => {
      ipcRenderer.send('check-ebay-login');
    }, 600000); // 10 minutes

    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('check-ebay-login');
      clearInterval(checkEbayLoginInterval);
    };
  }, []);

  React.useEffect(() => {
    // TODO - add a loader 
    ipcRenderer.send('check-tracking-funds');
    // setCheckingTrackingFundsLoader(true);
  }, []);

  return (
    <div
      style={{
        textAlign: 'center',
        marginTop: '60px'
      }}
      data-testid="home-wrapper"
    >
      <div style={{ display: 'flex', flexDirection: 'row', background: 'orange', justifyContent: 'center', alignItems: 'center' }}>
        <WarningIcon />
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginLeft: '10px' }}>WARNING! DALIO AUTOORDER IS IN BETA TESTING</h3>
      </div>
      <Paper className={classes.root} elevation={0}>
        <Tabs
          value={value}
          onChange={handleTabChange}
          indicatorColor="primary"
          color="primary"
          centered
        >
          <Tab icon={<ShoppingBasketIcon />} label="Your orders" {...a11yProps(0)} />
          <Tab icon={<PersonPinIcon className={clsx(loggedInMarketplaces.length == 0 && classes.badgeError, loggedInMarketplaces.length !== 0 && classes.badgeSuccess)} />} label="Source accounts" {...a11yProps(1)} />
          {/* <Tab icon={<ShowChartIcon />} label="Analytics" {...a11yProps(2)} /> */}
          <Tab icon={<SettingsIcon />} label="Settings" {...a11yProps(3)} disabled />
        </Tabs>
        {checkingTrackingFundsLoader ? (
          <p>Checking your tracking funds.. Please wait..</p>
        ) : (
          <React.Fragment>
            <p>Your tracking number balance: <b>${props.accountStatus.tracking_funds}</b> <span>({props.accountStatus.tracking_funds/0.04} trackings left)</span> <span style={{ display: 'block', fontSize: '12px' }}>You need to top up, if you want to convert your Amazon trackings to Bluecare Express trackings</span></p>
            {props.accountStatus.tracking_funds == 0 ? (
              <Button 
                color="primary" 
                onClick={() => shell.openExternal('https://dalio.io/my-account/tracking-funds/')}
              >
                  Top up tracking funds
              </Button>
            ) : null}
          </React.Fragment>
        )}
        <TabPanel value={value} index={0}>
          {!loggedInEbay || loggedInMarketplaces.length === 0 ? (
            <AutoorderOnboarding loggedInEbay={loggedInEbay} loggedInMarketplaces={loggedInMarketplaces} handleTabChange={handleTabChange} />
          ) : (
            <Orders loggedInMarketplaces={loggedInMarketplaces} setValue={setValue} allAccounts={allAccounts} />
          )}
        </TabPanel>
        <TabPanel value={value} index={1}>
          {loggedInMarketplaces.length !== 0 && !showLoginFields ? (
            <React.Fragment>

              <Grid container direction="row" justifyContent="space-between" alignItems="center" alignContent="center" style={{ width: 450, margin: 'auto', flexWrap: 'nowrap' }}>
                <Grid item xs>
                  {allAccounts[accountSelect] !== undefined ? (
                    <Avatar variant="rounded" style={{ backgroundColor: '#d5008d', marginRight: 7}}>{allAccounts[accountSelect].email[0].toUpperCase()}</Avatar>
                  ) : null}
                  
                </Grid>
                <Grid item xs>
                  <FormControl className={classes.textField}>
                    <InputLabel id="amazon-account">Amazon account</InputLabel>
                    <Select
                      labelId="amazon-account-select"
                      id="amazon-account-select"
                      value={accountSelect}
                      onChange={handleAccountSelect}
                    >
                      {loggedInMarketplaces.map((value, index) => {
                        return <MenuItem value={value.id} key={value.id}>{value.email} - {value.country}</MenuItem>
                      })}

                    </Select>
                  </FormControl>
                  
                </Grid>

              </Grid>

              <Grid container>
                {accountSelect !== 0 && allAccounts[accountSelect] !== undefined ? (
                  <React.Fragment>
                  <Grid item xs={12}>
                    <DisplayAccounts account={allAccounts[accountSelect]} removeAccountFromState=
                    {removeAccountFromState} toggleAddNewSourceAccount={toggleAddNewSourceAccount} />      
                  </Grid>
                  </React.Fragment>
                ) : null}
              </Grid>
            </React.Fragment>
          ) : null}

          {showLoginFields ? (
            <React.Fragment>
              <img src={AmazonLogo} style={{ width: '100px' }} alt="Amazon logo" />
              {loggedInMarketplaces.length == 0 ? (
                <p style={{ fontSize: 14, maxWidth: '450px', padding: '10px', margin: 'auto' }}>You have not logged in a source Amazon account yet. Please choose an Amazon domain and complete the login process.</p>
              ) : null}

              <ChooseSourceAccount />
              {loggedInMarketplaces.length !== 0 ? (
                <Button
                variant="contained"
                style={{ marginTop: 20, width: 400, backgroundColor: "#ff0000", color: "#fff" }}
                onClick={toggleAddNewSourceAccount}
                >
                Cancel
                </Button>
              ) : null}
            </React.Fragment>
          ) : null}

        </TabPanel>
        <TabPanel value={value} index={2}>
          <OrdersAnalytics />
        </TabPanel>
        <TabPanel value={value} index={3}>
          {loggedInMarketplaces.length !== 0 ? (
            <AutoorderSettings accounts={loggedInMarketplaces} />
          ) : (
            <p>Please login with an Amazon source account.</p>
          )}
        </TabPanel>
      </Paper>
    </div>
  );
};

const mapStateToProps = state => ({
  ...state
});

export default connect(mapStateToProps)(Autoorder);