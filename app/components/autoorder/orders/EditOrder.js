/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint no-unused-vars: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint no-restricted-globals: 0 */
/* eslint camelcase: 0 */
/* eslint react/button-has-type: 0 */
/* eslint react/no-unescaped-entities: 0 */
/* eslint array-callback-return: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint radix: 0 */
// @flow

import React from 'react';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import { store } from 'react-notifications-component';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import ArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import Switch from '@material-ui/core/Switch';
import Checkbox from '@material-ui/core/Checkbox';
import InputAdornment from '@material-ui/core/InputAdornment';
import MoneyIcon from '@material-ui/icons/AttachMoney';
import Icon from '@material-ui/core/Icon';
import Fab from '@material-ui/core/Fab';
import NavigationIcon from '@material-ui/icons/Navigation';
import routes from '../../../constants/routes.json';

// TYPES
import type { Account } from '../../../types/AccountsTypes';
import type { Listing } from '../../../types/ListingsTypes';
import type { Order } from '../../../types/OrdersTypes';

const useStyles = makeStyles(() => ({
  flex: {
    display: 'flex',
    alignItems: 'center'
  },
  button: {
    marginTop: 10,
    marginBottom: 10
  },
  iconLeft: {
    marginRight: 5
  },
  textField: {
    fontWeight: 300,
    marginBottom: 10,
    marginTop: 0
  },
  errorPaper: {
    background: 'red',
    color: '#fff',
    padding: 20,
    marginTop: 10,
    marginBottom: 10
  },
  errorH5: {
    fontWeight: 700,
    fontSize: 18
  },
  errorP: {
    fontWeight: 500,
    fontSize: 14
  },
  p: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 5
  },
  pInfo: {
    fontSize: 13,
    fontWeight: 500
  },
  spanInfo: {
    fontWeight: 400
  },
  editButton: {
    color: '#0000ff',
    fontSize: 12,
    textDecoration: 'underline',
    background: 'none',
    boxShadow: 'none',
    border: 'none',
    cursor: 'pointer'
  }
}));

type EditOrderProps = {
  location: {
    state: {
      allAccounts: {
        [key: number]: Account
      },
      order: Order,
      localizedMarketplaces: Array<Account>,
      loggedInMarketplaces: Array<Account>,
      referrer: string
    },
    ...
  },
  ...
};

const EditOrder = (props: EditOrderProps) => {
  const classes: Object = useStyles();
  const { order, loggedInMarketplaces, localizedMarketplaces, allAccounts } = props;

  console.log('localized marketplaces', localizedMarketplaces);
  const [accountSelect, setAccountSelect] = React.useState<string>('');

  type UpdateListingsErrorType = {
    status: boolean,
    message: {
      title: string,
      body: string
    }
  };

  const [updateListingError, setUpdateListingError] = React.useState<UpdateListingsErrorType>({
    status: false,
    message: {
      title: '',
      body: ''
    }
  });

  const [state, setState] = React.useState({
    item_name: order.item_name,
    image: order.image,
    status: order.status,
    store_id: order.store_id,
    order_number: order.order_number,
    supplier: order.supplier,
    supplier_url: order.supplier_url,
    supplier_id: order.supplier_id,
    matched_listing_store_id: order.matched_listing_store_id,
    date_sold: order.date_sold,
    sold_for: order.sold_for,
    buy_for: '',
    quantity: order.quantity,
    product_availability: '',
    post_to_name: order.post_to_name,
    buyer_email: order.buyer_email,
    buyer_phone: order.buyer_phone,
    post_to_address_field: order.post_to_address_field,
    post_to_address_field_2: order.post_to_address_field_2,
    post_to_city: order.post_to_city,
    post_to_state_province: order.post_to_state_province,
    post_to_country: order.post_to_country,
    post_to_postcode: order.post_to_postcode,
    order_with_account: '',
    pay_with: '',
    pay_with_value: '',
    auto: false,
  });

  const [editState, setEditState] = React.useState({
    post_to_name: false,
    post_to_address_field: false,
    post_to_address_field_2: false,
    post_to_city: false,
    post_to_postcode: false,
    post_to_state_province: false,
    buyer_email: false,
    buyer_phone: false
  });

  const [amounts, setAmounts] = React.useState({
    gift_card_balance: 0.00,
    product_price: 0.00
  });

  const setEditStateFn = (event: SyntheticEvent<>): void => {
    setEditState({ ...editState, [event.target.name]: !editState[event.target.name] });
  };

  const onChange = (event: SyntheticEvent<>): void => {
    setState({ ...state, [event.target.id]: event.target.value });
  };

  const onBlur = (event: SyntheticEvent<>): void => {
    setEditState({ ...editState, [event.target.id]: false });
  };

  const onEnterKey = (event: SyntheticKeyboardEvent<>): void => {
    if (event.key === 'Enter') {
      setEditState({ ...editState, [event.target.id]: false})
    }
  }

  const handleSwitchChange = (event: SyntheticEvent<>): void => {
    setState({ ...state, [event.target.value]: event.target.checked });
  };

  const handleAccountSelect = (event: SyntheticEvent<>): void => {
    // console.log(allAccounts[event.target.value]);
    const selectedAccountDeepCopy: Account = JSON.parse(JSON.stringify(allAccounts[event.target.value]));
    setState({ ...state, order_with_account: selectedAccountDeepCopy });
    setAccountSelect(event.target.value);
  };

  const handlePaymentSelect = (event: SyntheticEvent<>): void => {
    const { name, value } = event.target;
    // console.log(name, value);

    const payWithObject = {};
    // If the value is not 'gift-card-balance', it will be a credit card index
    if (value !== 'gift-card-balance') {
      let creditCardIndex = value;
      if (typeof value !== 'number') {
        creditCardIndex = parseInt(value);
      }
      payWithObject.type = 'credit-card';
      payWithObject.credit_card = allAccounts[accountSelect].settings.payment_methods.credit_cards[creditCardIndex];
    } else {
      payWithObject.type = 'gift-card-balance';
      payWithObject.balance = allAccounts[accountSelect].settings.payment_methods.gift_card_balance;
    }

    setState({ ...state, pay_with: payWithObject, pay_with_value: value });
    // console.log('state', state);
  };

  const orderItem = (event: SyntheticEvent<>): void => {
    event.preventDefault();
    ipcRenderer.send('order-product', state);

    store.addNotification({
      title: "Order added to queue",
      message: `Order with order number ${state.order_number} has been added to the order queue.`,
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
  };

  React.useEffect(() => {
    ipcRenderer.send('get-listing-data', state.matched_listing_store_id);

    ipcRenderer.on('get-listing-data', (event: SyntheticEvent<>, listing: Listing) => {
      // When received -> update the state object with the new data
      setState({ ...state, buy_for: listing.new_price, product_availability: listing.product_availability });
    });
    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('get-listing-data');
    };
  }, []);

  React.useEffect(() => {
    if (accountSelect !== '') {
      let gift_card_balance: number = 0.00;
      let product_price: number = 0.00;
  
      if (allAccounts[accountSelect].settings.payment_methods.gift_card_balance !== '') {
        gift_card_balance = parseFloat(allAccounts[accountSelect].settings.payment_methods.gift_card_balance);
        product_price = parseFloat(state.buy_for);
      }

      if (!isNaN(gift_card_balance) && !isNaN(product_price)) {
        setAmounts({
          gift_card_balance,
          product_price,
        })
      }
    }

  }, [accountSelect]);

  return (
    <Container maxWidth="md" style={{ marginTop: 20, marginBottom: 20 }}>
      <Paper elevation={0}>
        <Typography
          className={classes.flex}
          style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}
          variant="h6"
          component="h6"
        >
          <img style={{ width: '50px', marginRight: 20}} src={order.image} alt=""/>
          {state.item_name}
        </Typography>
        <Grid container>
          <Grid item xs>
              <Grid container>
                  <Grid item xs={12}>
                      <Typography
                      className={classes.flex}
                      style={{ fontSize: 14, textDecoration: 'underline', fontWeight: 800, marginBottom: 20 }}
                      variant="h6"
                      component="h6"
                      >
                      Order details:
                      </Typography>
                  </Grid>
                  <Grid item xs={12}>
                      <p className={classes.p}>Status: <span className={classes.spanInfo}>{state.status}</span></p>
                  </Grid>
                  <Grid item xs={12}>
                      <p className={classes.p}>Order number: <span className={classes.spanInfo}>{state.order_number}</span></p>
                  </Grid>
                  <Grid item xs={12}>
                      <p className={classes.p}>Date sold: <span className={classes.spanInfo}>{state.date_sold}</span></p>
                  </Grid>
                  <Grid item xs={12}>
                      <p className={classes.p}>Buy for: <span className={classes.spanInfo}>{state.buy_for}</span></p>
                  </Grid>
                  <Grid item xs={12}>
                      <p className={classes.p}>Sold for: <span className={classes.spanInfo}>{state.sold_for}</span></p>
                  </Grid>
                  <Grid item xs={12}>
                      <p className={classes.p}>Quantity bought: <span className={classes.spanInfo}>{state.quantity}</span></p>
                  </Grid>
                  <Grid item xs={12}>
                      <p className={classes.p}>Product availability: <span className={classes.spanInfo}>{state.product_availability}</span></p>
                  </Grid>
              </Grid>
          </Grid>
          <Grid item xs>
            <Grid container>
                <Grid item xs={12}>
                    <Typography
                    className={classes.flex}
                    style={{ fontSize: 14, textDecoration: 'underline', fontWeight: 800, marginBottom: 20 }}
                    variant="h6"
                    component="h6"
                    >
                    Buyer details:
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                  {editState.post_to_name ? (
                    <TextField
                      id="post_to_name"
                      label="Buyer name"
                      placeholder="e.g John Doe"
                      className={classes.textField}
                      value={state.post_to_name}
                      onChange={onChange}
                      onBlur={onBlur}
                      onKeyPress={e => onEnterKey(e)}
                      margin="normal"
                      required
                      fullWidth
                      autoFocus
                    />
                  ) : (
                    <React.Fragment>
                      <p className={classes.p}>Name:&nbsp;<span className={classes.spanInfo}>{state.post_to_name}</span><button className={classes.editButton} name="post_to_name" onClick={setEditStateFn}>Edit</button></p>
                    </React.Fragment>
                  )}
                    
                </Grid>
                <Grid item xs={12}>
                    {editState.buyer_email ? (
                      <TextField
                        id="buyer_email"
                        label="Email address"
                        placeholder="e.g johndoe@gmail.com"
                        className={classes.textField}
                        value={state.buyer_email}
                        onChange={onChange}
                        onBlur={onBlur}
                        onKeyPress={e => onEnterKey(e)}
                        margin="normal"
                        required
                        fullWidth
                        autoFocus
                      />
                    ) : (
                      <React.Fragment>
                        <p className={classes.p}>Email address:&nbsp;<span className={classes.spanInfo}>{state.buyer_email}</span><button className={classes.editButton} name="buyer_email" onClick={setEditStateFn}>Edit</button></p>
                      </React.Fragment>
                    )}
                </Grid>
                <Grid item xs={12}>
                  {editState.buyer_phone ? (
                      <TextField
                        id="buyer_phone"
                        label="Phone"
                        placeholder="e.g +44 782 724 222"
                        className={classes.textField}
                        value={state.buyer_phone}
                        onChange={onChange}
                        onBlur={onBlur}
                        onKeyPress={e => onEnterKey(e)}
                        margin="normal"
                        required
                        fullWidth
                        autoFocus
                      />
                    ) : (
                      <React.Fragment>
                        <p className={classes.p}>Phone:&nbsp;<span className={classes.spanInfo}>{state.buyer_phone}</span><button className={classes.editButton} name="buyer_phone" onClick={setEditStateFn}>Edit</button></p>
                      </React.Fragment>
                    )}
                </Grid>
                <Grid item xs={12}>
                    {editState.post_to_address_field ? (
                      <TextField
                        id="post_to_address_field"
                        label="Address 1"
                        placeholder="e.g 4 Lorem street"
                        className={classes.textField}
                        value={state.post_to_address_field}
                        onChange={onChange}
                        onBlur={onBlur}
                        onKeyPress={e => onEnterKey(e)}
                        margin="normal"
                        required
                        fullWidth
                        autoFocus
                      />
                    ) : (
                      <React.Fragment>
                        <p className={classes.p}>Address  1:&nbsp;<span className={classes.spanInfo}>{state.post_to_address_field}</span><button className={classes.editButton} name="post_to_address_field" onClick={setEditStateFn}>Edit</button></p>
                      </React.Fragment>
                    )}
                </Grid>
                <Grid item xs={12}>
                    {editState.post_to_address_field_2 ? (
                      <TextField
                        id="post_to_address_field_2"
                        label="Address 2"
                        placeholder="e.g 4 Lorem street"
                        className={classes.textField}
                        value={state.post_to_address_field_2}
                        onChange={onChange}
                        onBlur={onBlur}
                        onKeyPress={e => onEnterKey(e)}
                        margin="normal"
                        required
                        fullWidth
                        autoFocus
                      />
                    ) : (
                      <React.Fragment>
                        <p className={classes.p}>Address  2:&nbsp;<span className={classes.spanInfo}>{state.post_to_address_field_2}</span><button className={classes.editButton} name="post_to_address_field_2" onClick={setEditStateFn}>Edit</button></p>
                      </React.Fragment>
                    )}
                </Grid>
                <Grid item xs={12}>
                  {editState.post_to_city ? (
                    <TextField
                      id="post_to_city"
                      label="City"
                      placeholder="e.g London"
                      className={classes.textField}
                      value={state.post_to_city}
                      onChange={onChange}
                      onBlur={onBlur}
                      onKeyPress={e => onEnterKey(e)}
                      margin="normal"
                      required
                      fullWidth
                      autoFocus
                    />
                    ) : (
                      <React.Fragment>
                        <p className={classes.p}>City:&nbsp;<span className={classes.spanInfo}>{state.post_to_city}</span><button className={classes.editButton} name="post_to_city" onClick={setEditStateFn}>Edit</button></p>
                      </React.Fragment>
                    )}

                </Grid>
                <Grid item xs={12}>
                    {editState.post_to_state_province ? (
                      <TextField
                        id="post_to_state_province"
                        label="State/province"
                        placeholder="e.g London"
                        className={classes.textField}
                        value={state.post_to_state_province}
                        onChange={onChange}
                        onBlur={onBlur}
                        onKeyPress={e => onEnterKey(e)}
                        margin="normal"
                        required
                        fullWidth
                        autoFocus
                      />
                    ) : (
                      <React.Fragment>
                        <p className={classes.p}>State/province:&nbsp;<span className={classes.spanInfo}>{state.post_to_state_province}</span><button className={classes.editButton} name="post_to_state_province" onClick={setEditStateFn}>Edit</button></p>
                      </React.Fragment>
                    )}

                </Grid>
                <Grid item xs={12}>
                    {editState.post_to_postcode ? (
                      <TextField
                        id="post_to_postcode"
                        label="Postcode"
                        placeholder="e.g EL2 63F"
                        className={classes.textField}
                        value={state.post_to_postcode}
                        onChange={onChange}
                        onBlur={onBlur}
                        onKeyPress={e => onEnterKey(e)}
                        margin="normal"
                        required
                        fullWidth
                        autoFocus
                      />
                    ) : (
                      <React.Fragment>
                        <p className={classes.p}>Postcode:&nbsp;<span className={classes.spanInfo}>{state.post_to_postcode}</span><button className={classes.editButton} name="post_to_postcode" onClick={setEditStateFn}>Edit</button></p>
                      </React.Fragment>
                    )}
                </Grid>
                <Grid item xs={12}>
                    <p className={classes.p}>Country: <span className={classes.spanInfo}>{order.post_to_country}</span></p>
                </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid container>
          {localizedMarketplaces.length > 0 ? (
            <React.Fragment>

              <Grid item xs={12}>
                  <FormControl fullWidth className={classes.textField}>
                    <InputLabel id="amazon-account">Order with account:</InputLabel>
                    <Select
                      labelId="amazon-account-select"
                      id="amazon-account-select"
                      value={accountSelect}
                      onChange={handleAccountSelect}
                    >
                      {loggedInMarketplaces.map((value, index) => {
                        if (state.supplier_url.includes('amazon.com')) {
                          if (value.country === 'US') {
                            return <MenuItem value={value.id} key={value.id}>{value.email} - {value.country}</MenuItem>
                          }
                        } else if (state.supplier_url.includes('amazon.co.uk')) {
                          if (value.country === 'UK') {
                            return <MenuItem value={value.id} key={value.id}>{value.email} - {value.country}</MenuItem>
                          }
                        }
                      })}

                    </Select>
                  </FormControl>
              </Grid>

                {accountSelect !== '' && (allAccounts[accountSelect].settings.payment_methods.gift_card_balance !== '' || allAccounts[accountSelect].settings.payment_methods.credit_cards.length > 0) ? (
                  <Grid item xs={12}>
                  <FormControl required fullWidth className={classes.textField}>
                    <InputLabel htmlFor="pay_with">Pay with</InputLabel>
                    <Select
                      value={state.pay_with_value}
                      onChange={handlePaymentSelect}
                      inputProps={{
                        name: 'pay_with',
                        id: 'pay_with'
                      }}
                      required
                    >
                      {allAccounts[accountSelect].settings.payment_methods.gift_card_balance !== '' && amounts.gift_card_balance > amounts.product_price ? (
                        <MenuItem value="gift-card-balance">Gift card balance - {allAccounts[accountSelect].settings.payment_methods.gift_card_balance}</MenuItem>
                      ) : allAccounts[accountSelect].settings.payment_methods.gift_card_balance !== '' && amounts.gift_card_balance < amounts.product_price ? <MenuItem value="gift-card-balance" disabled>Gift card balance - {allAccounts[accountSelect].settings.payment_methods.gift_card_balance}</MenuItem> : null}

                      {allAccounts[accountSelect].settings.payment_methods.credit_cards.length > 0 ? (
                        allAccounts[accountSelect].settings.payment_methods.credit_cards.map((value, index) => {
                          if (value.expiry_date.toLowerCase().includes('expired')) {
                            return <MenuItem value={index} disabled key={value.number_tail}>{value.display_name} {value.number_tail} - <span style={{ color: '#ff0000' }}> EXPIRED</span></MenuItem>
                          }

                          if (value.card_number === '') {
                            return <MenuItem value={index} disabled key={value.number_tail}>{value.display_name} {value.number_tail} - <span style={{ color: '#ff0000' }}> NOT VALIDATED</span></MenuItem>
                          }

                          return <MenuItem value={index} key={value.number_tail}>{value.display_name} {value.number_tail}</MenuItem>
                        })
                      ) : null}
                    </Select>
                  </FormControl>
                </Grid>
                ) : null}

                {accountSelect !== '' && allAccounts[accountSelect].settings.payment_methods.gift_card_balance === '' && allAccounts[accountSelect].settings.payment_methods.credit_cards.length > 0 ? (
                  <Grid item xs={12}>
                    <p className={classes.pInfo} style={{ color: 'red' }}>Before starting the autoorder, you will need to choose a payment method, by fetching the payment methods from your Amazon source account.</p>
                  </Grid>
                ) : null}     

                <Grid item xs={12}>
                  <p className={classes.pInfo}>For now, Dalio`s order system will run in a semi-auto mode. In the near future it will be fully automated.</p>
                  <p className={classes.pInfo}>When you press the 'Order now' button, a Chromium browser will open and complete the order process for you. It will stop at the last stage and wait for you to review the order and press Amazon`s 'Order' button.</p>
                </Grid>

            </React.Fragment>
          ) : (
            <Grid item xs={12}>
              <p style={{ color: 'red' }}>If you want to use the autoorder feature, you will need to sign in with a sourcing Amazon account.</p>
            </Grid>
          )}
        </Grid>     
      </Paper>
      {accountSelect !== '' && state.pay_with !== '' ? (
        <Fab 
        variant="extended"
        color="primary"
        style={{ position: 'fixed', bottom: 20, right: 20 }}
        onClick={orderItem}
          >
          <NavigationIcon style={{ marginRight: 5}} />
          Place order
        </Fab>
      ) : null}
    </Container>
  );
};


export default EditOrder;
