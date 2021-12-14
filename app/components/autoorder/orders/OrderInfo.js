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
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

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

const OrderInfo = (props: EditOrderProps) => {
  const classes: Object = useStyles();
  const { order } = props;

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
    post_to_postcode: order.post_to_postcode
  });

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
                    <React.Fragment>
                        <p className={classes.p}>Name:&nbsp;<span className={classes.spanInfo}>{state.post_to_name}</span></p>
                    </React.Fragment>   
                </Grid>
                <Grid item xs={12}>
                    <React.Fragment>
                        <p className={classes.p}>Email address:&nbsp;<span className={classes.spanInfo}>{state.buyer_email}</span></p>
                    </React.Fragment>
                </Grid>
                <Grid item xs={12}>
                    <React.Fragment>
                        <p className={classes.p}>Phone:&nbsp;<span className={classes.spanInfo}>{state.buyer_phone}</span></p>
                    </React.Fragment>
                </Grid>
                <Grid item xs={12}>
                    <React.Fragment>
                        <p className={classes.p}>Address  1:&nbsp;<span className={classes.spanInfo}>{state.post_to_address_field}</span></p>
                    </React.Fragment>
                </Grid>
                <Grid item xs={12}>
                    <React.Fragment>
                        <p className={classes.p}>Address  2:&nbsp;<span className={classes.spanInfo}>{state.post_to_address_field_2}</span></p>
                    </React.Fragment>
                </Grid>
                <Grid item xs={12}>
                    <React.Fragment>
                         <p className={classes.p}>City:&nbsp;<span className={classes.spanInfo}>{state.post_to_city}</span></p>
                    </React.Fragment>
                </Grid>
                <Grid item xs={12}>
                    <React.Fragment>
                        <p className={classes.p}>State/province:&nbsp;<span className={classes.spanInfo}>{state.post_to_state_province}</span></p>
                    </React.Fragment>
                </Grid>
                <Grid item xs={12}>

                    <React.Fragment>
                        <p className={classes.p}>Postcode:&nbsp;<span className={classes.spanInfo}>{state.post_to_postcode}</span></p>
                    </React.Fragment>
                </Grid>
                <Grid item xs={12}>
                    <p className={classes.p}>Country: <span className={classes.spanInfo}>{order.post_to_country}</span></p>
                </Grid>
            </Grid>
          </Grid>
        </Grid>
   
      </Paper>
    </Container>
  );
};


export default OrderInfo;
