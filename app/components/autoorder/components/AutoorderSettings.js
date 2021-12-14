/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint arrow-body-style: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint eqeqeq: 0 */
/* eslint no-restricted-globals: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint no-plusplus: 0 */

// @flow

import React from 'react';
import Grid from '@material-ui/core/Grid';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import FormHelperText from '@material-ui/core/FormHelperText';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';

import type { Account } from '../../../types/AccountsTypes';

type AutoorderSettingsProps = {
  accounts: Array<Account>
};

const useStyles = makeStyles(theme => ({
  settingCardsDiv: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  textField: {
    marginTop: 20, 
    background: '#fff',
    width: '350px',
    minWidth: '350px'
  },
  button: {
    width: 250,
    margin: 10
  },
  card: {
    maxWidth: 550,
    background: '#f6f6f6f',
    boxShadow: '0px 0px 5px #D3D3D3'
  },
  saveButton: {
    paddingTop: '20px'
  }
}));

const AutoorderSettings = (props: AutoorderSettingsProps) => {
  const classes = useStyles();
  const { accounts } = props;
  const [allAccounts, setAllAccounts] = React.useState({});
  // This state variable keeps track of all the settings that are relevant to the autoorder
  const [settings, setSettings] = React.useState({
    amazon: {
      us_order_info: {
        account: {}, 
        payment_method: '',
        credit_card_index: 0,
        mark_ordered_products_as_shipped: 0,
        mark_ordered_products_as_shipped_with_proxy_tracking: 0
      },
      uk_order_info: {
        account: {}, 
        payment_method: '',
        credit_card_index: 0,
        mark_ordered_products_as_shipped: 0,
        mark_ordered_products_as_shipped_with_proxy_tracking: 0
      }
    }
  });

  const [settingsCompare, setSettingsCompare] = React.useState({
    amazon: {
      us_order_info: {
        account: {}, 
        payment_method: '',
        credit_card_index: 0,
        mark_ordered_products_as_shipped: 0,
        mark_ordered_products_as_shipped_with_proxy_tracking: 0
      },
      uk_order_info: {
        account: {}, 
        payment_method: '',
        credit_card_index: 0,
        mark_ordered_products_as_shipped: 0,
        mark_ordered_products_as_shipped_with_proxy_tracking: 0
      }
    }
  });

  const [showSaveButton, setShowSaveButton] = React.useState(false);
  const [error, setError] = React.useState({
    status: false,
    message: ''
  });
  const [loggedInAmazonUSAccounts, setLoggedInAmazonUSAccounts] = React.useState([]);
  const [loggedInAmazonUKAccounts, setLoggedInAmazonUKAccounts] = React.useState([]);
  const [USAccountSelect, setUSAccountSelect] = React.useState('');
  const [UKAccountSelect, setUKAccountSelect] = React.useState('');
  const [selectedUSAccountCreditCardIndex, selectUSAccountCreditCardIndex] = React.useState(0);
  const [selectedUKAccountCreditCardIndex, selectUKAccountCreditCardIndex] = React.useState(0);

  React.useEffect(() => {
    // Listening for 'autoorder-setting' event coming from the main process
    ipcRenderer.on('autoorder-settings', (event, resSettings) => {

      // When received -> update the state object with the new data
      setSettingsCompare(prevState => {
        return {...prevState, ...resSettings}
      });

      setSettings(prevState => {
        return {...prevState, ...resSettings }
      });
    });

    /* Sends an event to the main process that queries all autoorder settings
    * the listener in the beginning of this useEffect handles the response to THIS event
    */
    ipcRenderer.send('autoorder-settings', { action: 'query-autoorder-settings' });

    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('autoorder-settings');
    };
  }, []);

  React.useEffect(() => {
    let thereAreAmazonUSAccounts: boolean | Array<Account> = false;
    let thereAreAmazonUKAccounts: boolean | Array<Account> = false;
    const accountsCombined = {};

    // IF there are any Autoorder accounts -> iterate through all of them
    if (accounts.length > 0) {
      for (let i = 0; i < accounts.length; i++) {
        // If the currently iterated account is a US account
        if (accounts[i].country === 'US') {

          // Mark that there is an amazon US account
          if (!thereAreAmazonUSAccounts) {
            thereAreAmazonUSAccounts = accounts[i];
          }

          // If currently, an amazon US account is chosen by the user as the default account to order with
          if (settings.amazon.us_order_info.account.email !== undefined) {
            if (settings.amazon.us_order_info.account.email === accounts[i].email) {
              thereAreAmazonUSAccounts = accounts[i];
              selectUSAccountCreditCardIndex(settings.amazon.us_order_info.credit_card_index);
            }
          }
          setLoggedInAmazonUSAccounts(prevState => [...prevState, accounts[i]]);
        } else if (accounts[i].country === 'UK') {
          if (!thereAreAmazonUKAccounts) {
            thereAreAmazonUKAccounts = accounts[i];
          }
          if (settings.amazon.uk_order_info.account.email !== undefined) {
            if (settings.amazon.uk_order_info.account.email === accounts[i].email) {
              thereAreAmazonUKAccounts = accounts[i];
              selectUKAccountCreditCardIndex(settings.amazon.uk_order_info.credit_card_index);
            }
          }

          setLoggedInAmazonUKAccounts(prevState => [...prevState, accounts[i]]);
        }

        accountsCombined[accounts[i].id] = accounts[i];
      }

      setAllAccounts(prevState => {
        return { ...prevState, ...accountsCombined };
      });
    }

    // If there is no selected Amazon US order account yet
    if (thereAreAmazonUSAccounts && (Object.entries(settings.amazon.us_order_info.account).length === 0 && settings.amazon.us_order_info.account.constructor === Object)) {

      setUSAccountSelect(thereAreAmazonUSAccounts.id);
    } else if (Object.entries(settings.amazon.us_order_info.account).length !== 0 && settings.amazon.us_order_info.account.constructor === Object) {
      if (accounts.length > 0) {
        for (let i = 0; i < accounts.length; i++) {
          if (accounts[i].country === 'US' && accounts[i].email === settings.amazon.us_order_info.account.email) {
            setUSAccountSelect(accounts[i].id);
          }
        }
      }
    }

    // If there is no selected Amazon UK order account yet
    if (thereAreAmazonUKAccounts && (Object.entries(settings.amazon.uk_order_info.account).length === 0 && settings.amazon.uk_order_info.account.constructor === Object)) {
      setUKAccountSelect(thereAreAmazonUKAccounts.id);
    } else if (Object.entries(settings.amazon.uk_order_info.account).length !== 0 && settings.amazon.uk_order_info.account.constructor === Object) {
      if (accounts.length > 0) {
        for (let i = 0; i < accounts.length; i++) {
          if (accounts[i].country === 'UK' && accounts[i].email === settings.amazon.uk_order_info.account.email) {
            setUKAccountSelect(accounts[i].id);
          }
        }
      }
    }
  }, [accounts]);

  React.useLayoutEffect(() => {
    if (JSON.stringify(settings) !== JSON.stringify(settingsCompare)) {
      setShowSaveButton(true);
    } else {
      setShowSaveButton(false);
    }
  }, [settings]); 


  const handleAccountSelect = name => e => {

    // console.log('handle account select', name, e.target.value);
    const settingsDeepCopy = JSON.parse(JSON.stringify(settings));

    if (name === 'amazon-us-account-select') {
      setUSAccountSelect(e.target.value);
      settingsDeepCopy.amazon.us_order_info.account.account = allAccounts[e.target.value].account;
      settingsDeepCopy.amazon.us_order_info.account.email = allAccounts[e.target.value].email;
      settingsDeepCopy.amazon.us_order_info.account.country = allAccounts[e.target.value].country;

      // If the payment method is chosen as 'credit-card'
      if (settingsDeepCopy.amazon.us_order_info.payment_method === 'credit-card') {
        // Need to iterate through all credit cards and choose the first one (if one is not chosen already)
        if (settingsDeepCopy.amazon.us_order_info.credit_card_index === undefined) {
          if (allAccounts[e.target.value].settings.payment_methods.credit_cards.length > 0) {
            settingsDeepCopy.amazon.us_order_info.credit_card_index = 0;
          }
        } else {
          selectUSAccountCreditCardIndex(settingsDeepCopy.amazon.us_order_info.credit_card_index);
        }
      }

      setSettings({ ...settingsDeepCopy });
    } else if (name === 'amazon-uk-account-select') {
      setUKAccountSelect(e.target.value);
      settingsDeepCopy.amazon.uk_order_info.account.account = allAccounts[e.target.value].account;
      settingsDeepCopy.amazon.uk_order_info.account.email = allAccounts[e.target.value].email;
      settingsDeepCopy.amazon.uk_order_info.account.country = allAccounts[e.target.value].country;
      
      // If the payment method is chosen as 'credit-card'
      if (settingsDeepCopy.amazon.uk_order_info.payment_method === 'credit-card') {
        // Need to iterate through all credit cards and choose the first one (if one is not chosen already)
        if (settingsDeepCopy.amazon.uk_order_info.credit_card_index === undefined) {
          if (allAccounts[e.target.value].settings.payment_methods.credit_cards.length > 0) {
            settingsDeepCopy.amazon.uk_order_info.credit_card_index = 0;
          }
        } else {
          selectUKAccountCreditCardIndex(settingsDeepCopy.amazon.uk_order_info.credit_card_index);
        }
      }
            
      setSettings({ ...settingsDeepCopy });
    }
  }

  const handleAccountSettingsChange = (name, type, accountIndex = '') => e => {
    const settingsDeepCopy = JSON.parse(JSON.stringify(settings));
    if (name === 'amazon-us-account') {
      if (type === 'payment-method') {
        settingsDeepCopy.amazon.us_order_info.payment_method = e.target.value;
      } else if (type === 'credit-card-index') {
        settingsDeepCopy.amazon.us_order_info.credit_card_index = e.target.value;
        selectUSAccountCreditCardIndex(e.target.value);
      } else if (type === 'mark-ordered-products-as-shipped') {
        if (e.target.checked) {
          settingsDeepCopy.amazon.us_order_info.mark_ordered_products_as_shipped = 1;
        } else {
          settingsDeepCopy.amazon.us_order_info.mark_ordered_products_as_shipped = 0;
        }
      } else if (type === 'mark-ordered-products-as-shipped-with-proxy-tracking') {
        if (e.target.checked) {
          settingsDeepCopy.amazon.us_order_info.mark_ordered_products_as_shipped_with_proxy_tracking = 1;
        } else {
          settingsDeepCopy.amazon.us_order_info.mark_ordered_products_as_shipped_with_proxy_tracking = 0;
        }
      }

      setSettings({ ...settingsDeepCopy });
    } else if (name === 'amazon-uk-account') {
      if (type === 'payment-method') {
        settingsDeepCopy.amazon.uk_order_info.payment_method = e.target.value;
      } else if (type === 'credit-card-index') {
        settingsDeepCopy.amazon.uk_order_info.credit_card_index = e.target.value;
        selectUKAccountCreditCardIndex(e.target.value);
      } else if (type === 'mark-ordered-products-as-shipped') {
        if (e.target.checked) {
          settingsDeepCopy.amazon.uk_order_info.mark_ordered_products_as_shipped = 1;
        } else {
          settingsDeepCopy.amazon.uk_order_info.mark_ordered_products_as_shipped = 0;
        }
      } else if (type === 'mark-ordered-products-as-shipped-with-proxy-tracking') {
        if (e.target.checked) {
          settingsDeepCopy.amazon.uk_order_info.mark_ordered_products_as_shipped_with_proxy_tracking = 1;
        } else {
          settingsDeepCopy.amazon.uk_order_info.mark_ordered_products_as_shipped_with_proxy_tracking = 0;
        }
      }

      setSettings({ ...settingsDeepCopy });
    }
  }

  const handlePreferredCreditCardIndex = (marketplace, accountSelect) => e => {
    const settingsDeepCopy = JSON.parse(JSON.stringify(settings));

    if (marketplace === 'amazon-us-account') {
      settingsDeepCopy.amazon.us_order_info.credit_card_index = e.target.value;
      setSettings({ ...settingsDeepCopy });
      selectUSAccountCreditCardIndex(e.target.value);
    } else if (marketplace === 'amazon-uk-account') {
      settingsDeepCopy.amazon.uk_order_info.credit_card_index = e.target.value;
      setSettings({ ...settingsDeepCopy });
      selectUKAccountCreditCardIndex(e.target.value);
    }
  }

  const saveSettings = () => {
    const settingsDeepCopy = JSON.parse(JSON.stringify(settings));
    setShowSaveButton(false);
    setSettingsCompare(prevState => {
      return {...prevState, ...settingsDeepCopy}
    });

    ipcRenderer.send('autoorder-settings', { action: 'change-settings', value: settings });
  }

  return (
    <div>
      <div className={classes.settingCardsDiv}>
        {loggedInAmazonUSAccounts.length > 0 ? (
          <Grid container spacing={1} className={classes.card}>
            <Grid item xs={12}>
              <FormControl className={classes.textField}>
                <InputLabel id="amazon-us-account">Amazon US account</InputLabel>
                <Select
                  labelId="amazon-us-account-select"
                  id="amazon-us-account-select"
                  value={USAccountSelect}
                  onChange={handleAccountSelect('amazon-us-account-select')}
                >
                  {loggedInAmazonUSAccounts.map((value, index) => {
                    return <MenuItem value={value.id} key={value.id}>{value.email} - {value.country}</MenuItem>
                  })}

                </Select>
                <FormHelperText>The autoorder will use this account to order products.</FormHelperText>
              </FormControl>
            </Grid>
          
            {USAccountSelect !== '' ? (
              <React.Fragment>
                <Grid item xs={12}>
                  <FormControl className={classes.textField}>
                    <InputLabel id="amazon-us-account-preferred-payment-method-select">Amazon US preferred payment method</InputLabel>
                    <Select
                      labelId="amazon-us-account-preferred-payment-method-select"
                      id="amazon-us-account-preferred-payment-method-select"
                      value={settings.amazon.us_order_info.payment_method}
                      onChange={handleAccountSettingsChange('amazon-us-account', 'payment-method')}
                    >
                      <MenuItem value='credit-card' key='credit-card'>Debit/Credit card</MenuItem>
                      <MenuItem value='gift-card-balance' key='gift-card-balance'>Gift card balance</MenuItem>

                    </Select>
                    <FormHelperText>The autoorder will use this preferred payment method for this account when ordering products.</FormHelperText>
                  </FormControl>
                </Grid>
            
                {settings.amazon.us_order_info.payment_method === 'credit-card' ? (
                  <Grid item xs={12}>
                    <FormControl className={classes.textField}>
                      <InputLabel id={`${USAccountSelect}-amazon-us-account-preferred-credit-card-input-label`}>Preferred credit card for</InputLabel>
                      <Select
                        labelId={`${USAccountSelect}-amazon-uk-account-preferred-credit-card-select`}
                        id={`${USAccountSelect}-amazon-uk-account-preferred-credit-card-select`}
                        value={selectedUSAccountCreditCardIndex}
                        onChange={handleAccountSettingsChange('amazon-us-account', 'credit-card-index', USAccountSelect)}
                      >
                        {allAccounts[USAccountSelect].settings.payment_methods.credit_cards.map((value, index) => {
                          if (value.expiry_date.toLowerCase().includes('expired')) {
                            return <MenuItem value={index} disabled key={value.number_tail}>{value.display_name} {value.number_tail} - <span style={{ color: '#ff0000' }}> EXPIRED</span></MenuItem>
                          }

                          return <MenuItem value={index} key={value.number_tail}>{value.display_name} {value.number_tail}</MenuItem>
                        })}

                      </Select>
                      <FormHelperText>
                        {allAccounts[USAccountSelect].settings.payment_methods.credit_cards[selectedUSAccountCreditCardIndex].card_number === '' ? <span style={{ color: '#ff0000', textAlign: 'center' }}>Please verify this card by adding a card number.</span> : 'Card is verified and can be used for ordering.'}
                      </FormHelperText>
                    </FormControl>
                  </Grid> 
                ) : null}

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.amazon.us_order_info.mark_ordered_products_as_shipped == 1 ? true : false}
                        onChange={handleAccountSettingsChange('amazon-us-account', 'mark-ordered-products-as-shipped')}
                        name="mark_ordered_products_as_shipped"
                        color="primary"
                        fullWidth
                      />
                    }
                    label="Mark ordered products as shipped on eBay"
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.amazon.us_order_info.mark_ordered_products_as_shipped_with_proxy_tracking == 1 ? true : false}
                        onChange={handleAccountSettingsChange('amazon-us-account', 'mark-ordered-products-as-shipped-with-proxy-tracking')}
                        name="mark_ordered_products_as_shipped_with_proxy_tracking"
                        color="primary"
                        fullWidth
                      />
                    }
                    label="Mark ordered products as shipped on eBay only with a proxy tracking (BCE)"
                    fullWidth
                  />
                </Grid>

              </React.Fragment>
            ) : null}
          </Grid>
        ) : null}

        {loggedInAmazonUKAccounts.length > 0 ? (
          <Grid container spacing={1} className={classes.card}>
            <Grid item xs={12}>
              <FormControl className={classes.textField}>
                <InputLabel id="amazon-uk-account">Amazon UK account</InputLabel>
                <Select
                  labelId="amazon-uk-account-select"
                  id="amazon-uk-account-select"
                  value={UKAccountSelect}
                  onChange={handleAccountSelect('amazon-uk-account-select')}
                >
                  {loggedInAmazonUKAccounts.map((value, index) => {
                    // console.log('acc value', value.email);
                    return <MenuItem value={value.id} key={value.id}>{value.email} - {value.country}</MenuItem>
                  })}

                </Select>
                <FormHelperText>The autoorder will use this account to order products.</FormHelperText>
              </FormControl>
            </Grid>
          
            {UKAccountSelect !== '' ? (
              <React.Fragment>
                <Grid item xs={12}>
                  <FormControl className={classes.textField}>
                    <InputLabel id="amazon-uk-account-preferred-payment-method-select">Amazon UK preferred payment method</InputLabel>
                    <Select
                      labelId="amazon-uk-account-preferred-payment-method-select"
                      id="amazon-uk-account-preferred-payment-method-select"
                      value={settings.amazon.uk_order_info.payment_method}
                      onChange={handleAccountSettingsChange('amazon-uk-account', 'payment-method')}
                    >
                      <MenuItem value='credit-card' key='credit-card'>Debit/Credit card</MenuItem>
                      <MenuItem value='gift-card-balance' key='gift-card-balance'>Gift card balance</MenuItem>

                    </Select>
                    <FormHelperText>The autoorder will use this preferred payment method for this account when ordering products.</FormHelperText>
                  </FormControl>
                </Grid>
            
                {settings.amazon.uk_order_info.payment_method === 'credit-card' ? (
                  <Grid item xs={12}>
                    <FormControl className={classes.textField}>
                      <InputLabel id={`${UKAccountSelect}-amazon-uk-account-preferred-credit-card-input-label`}>Preferred credit card for</InputLabel>
                      <Select
                        labelId={`${UKAccountSelect}-amazon-uk-account-preferred-credit-card-select`}
                        id={`${UKAccountSelect}-amazon-uk-account-preferred-credit-card-select`}
                        value={selectedUKAccountCreditCardIndex}
                        onChange={handleAccountSettingsChange('amazon-uk-account', 'credit-card-index', UKAccountSelect)}
                      >
                        {allAccounts[UKAccountSelect].settings.payment_methods.credit_cards.map((value, index) => {
                          if (value.expiry_date.toLowerCase().includes('expired')) {
                            return <MenuItem value={index} disabled key={value.number_tail}>{value.display_name} {value.number_tail} - <span style={{ color: '#ff0000' }}> EXPIRED</span></MenuItem>
                          }

                          return <MenuItem value={index} key={value.number_tail}>{value.display_name} {value.number_tail}</MenuItem>
                        })}

                      </Select>
                      <FormHelperText>
                        {allAccounts[UKAccountSelect].settings.payment_methods.credit_cards[selectedUKAccountCreditCardIndex].card_number === '' ? <span style={{ color: '#ff0000', textAlign: 'center' }}>Please verify this card by adding a card number.</span> : 'Card is verified and can be used for ordering.'}
                      </FormHelperText>
                    </FormControl>
                  </Grid> 
                ) : null}

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.amazon.uk_order_info.mark_ordered_products_as_shipped == 1 ? true : false}
                        onChange={handleAccountSettingsChange('amazon-uk-account', 'mark-ordered-products-as-shipped')}
                        name="mark_ordered_products_as_shipped"
                        color="primary"
                        fullWidth
                      />
                    }
                    label="Mark ordered products as shipped on eBay"
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.amazon.uk_order_info.mark_ordered_products_as_shipped_with_proxy_tracking == 1 ? true : false}
                        onChange={handleAccountSettingsChange('amazon-uk-account', 'mark-ordered-products-as-shipped-with-proxy-tracking')}
                        name="mark_ordered_products_as_shipped_with_proxy_tracking"
                        color="primary"
                        fullWidth
                        disabled={settings.amazon.uk_order_info.mark_ordered_products_as_shipped == 0}
                      />
                    }
                    label="Mark ordered products as shipped on eBay only with a proxy tracking (BCE)"
                    fullWidth
                  />
                </Grid>

              </React.Fragment>
            ) : null}
          </Grid>
        ) : null}

      </div>

      {showSaveButton ? (
        <Grid container className={classes.saveButton}>
          {error.status ? (
            <Grid item xs={12}>
              <p style={{ fontSize: 12, color: 'red' }}>{error.message}</p>  
            </Grid>
          ) : null}
          
          <Grid item xs={12}>               
            <Button
              variant="contained"
              color="primary"
              size="small"
              className={classes.button}
              onClick={saveSettings}
              fullWidth
              >
                Save
            </Button>                
          </Grid>
        </Grid>
      ) : null}
    </div>
  );
};

export default AutoorderSettings;