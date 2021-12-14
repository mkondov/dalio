/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint eqeqeq: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-restricted-globals: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint no-unused-vars: 0 */

import React from 'react';
import { ipcRenderer } from 'electron';
import { compose } from 'redux';
import { withRouter, Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import InputAdornment from '@material-ui/core/InputAdornment';
import MoneyIcon from '@material-ui/icons/AttachMoney';
import Icon from '@material-ui/core/Icon';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Switch from '@material-ui/core/Switch';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import Checkbox from '@material-ui/core/Checkbox';
import ArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import ClientsIcon from '@material-ui/icons/LibraryAdd';
import { store } from 'react-notifications-component';
import routes from '../../constants/routes.json';

import SandboxCalculatorAll from '../dashboard/repricers/SandboxCalculatorAll';

import AmazonLogo from '../../media/logos/amazon-logo.svg';
import EbayLogo from '../../media/logos/ebay-logo.svg';
import WalmartLogo from '../../media/logos/walmart-logo.svg';
import AliExpressLogo from '../../media/logos/aliexpress-logo.svg';
import HomeDepotLogo from '../../media/logos/home-depot-logo.svg';
import VidaXLLogo from '../../media/logos/vidaxl-logo.svg';

const AdapterLink = React.forwardRef((props, ref) => (
  <Link innerRef={ref} {...props} />
));

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
    width: '100%'
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
  useProfitPercentageLabel: {
    fontSize: '9px'
  }
}));

const AddListing = props => {
  const classes = useStyles();
  const { referrer } = props.location.state;
  const [addListingError, setAddListingError] = React.useState({
    status: false,
    message: {
      title: '',
      body: ''
    }
  });

  const [state, setState] = React.useState({
    item_name: '',
    store_id: '',
    is_variant: '',
    has_variations: '',
    supplier: '',
    supplier_id: '',
    supplier_url: '',
    store: '',
    store_url: '',
    use_global_refactor_settings: '1',
    use_minimum_price: '0',
    use_maximum_price: '0',
    local_refactor_settings: {
      add_state_tax: '0',
      state_tax_percentage: 6,
      add_vat: '0',
      vat_percentage: 20,
      add_amazon_fee: '0',
      amazon_fee_percentage: 15,
      add_ebay_fee: '0',
      ebay_fee: 11,
      add_paypal_fee: '0',
      paypal_fee_percentage: 2.9,
      paypal_fixed_fee: 0.30,
      minimum_price: 0,
      maximum_price: 0,
      use_refactor_percentage: '0',
      refactor_percentage: 15,
      refactor_fixed_sum: 0
    }
  });
  const [sourcePrice, setSourcePrice] = React.useState(0);

  const setSourcePriceFunc = price => {
    setSourcePrice(price);
  }

  const onChange = e => {
    setState({ ...state, [e.target.id]: e.target.value });
  };

  const settingsChange = name => event => {
    const localSettings = JSON.parse(JSON.stringify(state.local_refactor_settings));
    
    if (name === 'minimum_price' || name === 'maximum_price') {
      if (event.target.value >= 0) {
        localSettings[name] = parseFloat(event.target.value);

        setState({ ...state, local_refactor_settings: localSettings });
      }
    } else if (name === 'refactor_fixed_sum' && state.local_refactor_settings.add_vat == '0') {
      localSettings[name] = event.target.value;
      setState({ ...state, local_refactor_settings: localSettings });
    } else {
      if (state.local_refactor_settings.add_vat == '1') {
        let ebayFeePercentage = 0;
        let paypalFeePercentage = 0;
        const vat = parseFloat(state.local_refactor_settings.vat_percentage);
        let refactorPercentage = 0;
        const eventTargetValue = parseFloat(event.target.value);

        if (state.local_refactor_settings.add_ebay_fee == '1') {
          if (name === 'ebay_fee') {
            ebayFeePercentage = eventTargetValue;
          } else {
            ebayFeePercentage = parseFloat(state.local_refactor_settings.ebay_fee);
          }
        }

        if (state.local_refactor_settings.add_paypal_fee == '1') {
          if (name === 'paypal_fee_percentage') {
            paypalFeePercentage = eventTargetValue;
          } else {
            paypalFeePercentage = parseFloat(state.local_refactor_settings.paypal_fee_percentage);
          }
        }

        if (state.local_refactor_settings.use_refactor_percentage == '1') {
          if (name === 'refactor_percentage') {
            refactorPercentage = eventTargetValue;
          } else {
            refactorPercentage = parseFloat(state.local_refactor_settings.refactor_percentage);
          }
        } else {
          // let sourcePrice = parseFloat(sandboxCalculator.source_price);
          if (name === 'refactor_fixed_sum') {
            refactorPercentage = 100*(sourcePrice*(eventTargetValue/100));
          } else {
            refactorPercentage = 100*(sourcePrice*(parseFloat(state.local_refactor_settings.refactor_fixed_sum)/100));
          }
        }

        if (event.target.value >= 0 && event.target.value <= 100 && ((ebayFeePercentage + paypalFeePercentage + vat + refactorPercentage) < 100)) {
          localSettings[name] = parseFloat(event.target.value);
          setState({ ...state, local_refactor_settings: localSettings });
        }

      } else {
        if (event.target.value >= 0 && event.target.value <= 100) {
          localSettings[name] = parseFloat(event.target.value);

          setState({ ...state, local_refactor_settings: localSettings });
        }
      }
    }
  };

  const handleCheckboxToggle = e => {
    const checked = e.target.checked ? '1' : '0';
    const localSettings = state.local_refactor_settings;

    let uncheck = '';

    if (e.target.value === 'add_vat' && e.target.checked) {
      if (state.local_refactor_settings.add_state_tax == '1') {
        uncheck = 'add_state_tax';
      }
    }

    if (e.target.value === 'add_state_tax' && e.target.checked) {
      if (state.local_refactor_settings.add_vat == '1') {
        uncheck = 'add_vat';
      }
    }

    localSettings[e.target.value] = checked;

    if (uncheck !== '') {
      localSettings[uncheck] = '0';
    }

    setState({ ...state, local_refactor_settings: localSettings });
  };

  const handleSupplierSelect = e => {
    setState({ ...state, [e.target.name]: e.target.value });
  };

  const handleSwitchChange = e => {
    setState({ ...state, [e.target.value]: e.target.checked });
  };

  const onSubmit = e => {
    e.preventDefault();
    
    let validNumbers = true;
    const newListing = state;

    newListing.is_variant = '0';
    newListing.has_variations = '0';

    // before submitting the new listing to the DB -> need to make sure that the repricer formula values are valid numbers
    for (const [key, value] of Object.entries(newListing.local_refactor_settings)) {
      if (isNaN(value) || value === '') {
        validNumbers = false;
      } else {
        if (typeof value === 'string') {
          newListing.local_refactor_settings[key] = parseFloat(value);
        }
      }
    }
    if (validNumbers) {
      ipcRenderer.send('add-listing', newListing);
    }
  };

  React.useEffect(() => {
    ipcRenderer.on('add-listing', (event, result) => {
      const { history } = props;

      if (result.status === 'error') {
        if (result.type === 'reached-account-limit') {
          setAddListingError({
            status: true,
            message: {
              title: 'You have reached your listings limit.',
              body: 'Please upgrade your account in order to benefit from Dalio.'
            }
          });
        } else if (result.type === 'listing-already-exists') {
          setAddListingError({
            status: true,
            message: {
              title: 'Listing duplicate!',
              body: 'You already have a listing with the same Selling Platform ID.'
            }
          });
        }
      } else {
        store.addNotification({
          title: 'Success',
          message: `Listing '${result.listing.item_name}' has been successfully added!`,
          type: 'success',
          insert: 'bottom',
          container: 'bottom-right',
          animationIn: ['animated', 'fadeIn'],
          animationOut: ['animated', 'fadeOut'],
          dismiss: {
            duration: 5000,
            onScreen: true
          }
        });

        if (referrer === 'listings_page') {
          history.push(routes.LISTINGS);
        } else if (referrer === 'orders_page') {
          history.push(routes.AUTOORDER);
        }
      }
    });

    // Cleanup the listener events so that memory leaks are avoided.
    return function cleanup() {
      ipcRenderer.removeAllListeners('add-listing');
    };
  }, []);

  return (
    <Container maxWidth="md" style={{ marginTop: 70, marginBottom: 20 }}>
      <Button
        color="primary"
        component={AdapterLink}
        to={referrer == 'listings_page' ? routes.LISTINGS : routes.AUTOORDER}
        className={classes.button}
      >
        <ArrowLeft className={classes.iconLeft} /> Back
      </Button>
      <Paper elevation={0}>
        <Typography className={classes.flex} variant="h6" component="h6">
          <ClientsIcon className={classes.iconLeft} />
          Add a new listing
        </Typography>

        {addListingError.status && (
          <Paper className={classes.errorPaper}>
            <Typography variant="h5" component="h3" className={classes.errorH5}>
              {addListingError.message.title}
            </Typography>
            <Typography component="p" className={classes.errorP}>
              {addListingError.message.body}
            </Typography>
          </Paper>
        )}
        
        <form onSubmit={onSubmit}>
          <TextField
            id="item_name"
            label="Item Name"
            placeholder="e.g Premium Embroidery Floss"
            className={classes.textField}
            value={state.item_name}
            onChange={onChange}
            margin="normal"
            required
            fullWidth
          />
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <FormControl required className={classes.textField}>
                <InputLabel htmlFor="supplier">Sourcing Platform</InputLabel>
                <Select
                  value={state.supplier}
                  onChange={handleSupplierSelect}
                  inputProps={{
                    name: 'supplier',
                    id: 'supplier'
                  }}
                  required
                >
                  <MenuItem value="walmart"><img src={WalmartLogo} style={{ width: '40px', marginRight: 5 }} alt="" />Walmart</MenuItem>
                  <MenuItem value="amazon"><img src={AmazonLogo} style={{ width: '40px', marginRight: 5 }} alt="" />Amazon</MenuItem>
                  <MenuItem value="aliexpress"><img src={AliExpressLogo} style={{ width: '40px', marginRight: 5 }} alt="" />AliExpress</MenuItem>
                  <MenuItem value="homedepot"><img src={HomeDepotLogo} style={{ width: '40px', marginRight: 5 }} alt="" />Home Depot</MenuItem>
                  <MenuItem value="vidaxl"><img src={VidaXLLogo} style={{ width: '40px', marginRight: 5 }} alt="" />VidaXL</MenuItem>
                </Select>
              </FormControl>
              <TextField
                id="supplier_id"
                label="Sourcing platform ID"
                value={state.supplier_id}
                onChange={onChange}
                className={classes.textField}
                margin="normal"
                required
                fullWidth
              />
              <TextField
                id="supplier_url"
                label="Sourcing platform product URL"
                value={state.supplier_url}
                onChange={onChange}
                className={classes.textField}
                margin="normal"
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl required className={classes.textField}>
                <InputLabel htmlFor="store">Selling platform</InputLabel>
                <Select
                  value={state.store}
                  onChange={handleSupplierSelect}
                  inputProps={{
                    name: 'store',
                    id: 'store'
                  }}
                  required
                >
                  {/* <MenuItem value="amazon">Amazon</MenuItem> */}
                  <MenuItem value="ebay"><img src={EbayLogo} style={{ width: '40px', marginRight: 5 }} alt="" />Ebay</MenuItem>
                </Select>
              </FormControl>
              <TextField
                id="store_id"
                label="Selling platform ID"
                value={state.store_id}
                onChange={onChange}
                className={classes.textField}
                margin="normal"
                required
                fullWidth
              />
              <TextField
                id="store_url"
                label="Selling platform product URL"
                value={state.store_url}
                onChange={onChange}
                className={classes.textField}
                margin="normal"
                required
                fullWidth
              />
            </Grid>
          </Grid>

          {state.store !== '' ? (
            <Grid container>
              <Grid item xs={12}>
                <FormControl component="fieldset" style={{ marginTop: 20 }}>
                <FormLabel component="legend" style={{ fontSize: 12 }}>Use global repricer settings</FormLabel>
                  <FormGroup>
                    <FormControlLabel
                      control={<Switch
                        checked={state.use_global_refactor_settings == '0' ? false : true}
                        onChange={handleSwitchChange}
                        value="use_global_refactor_settings"
                        color="primary"
                        />}
                      label={state.use_global_refactor_settings == '0' ? 'No' : 'Yes'}
                    />
      
                  </FormGroup>
                  <FormHelperText>If you choose &apos;Yes&apos;, the reprice settings for this item will be the ones you set in Dalio`s dashboard. Otherwise, you will have to specify custom repricer settings for this item.</FormHelperText>
                </FormControl>
              </Grid>
              
              {state.use_global_refactor_settings == '0' ? (
                <Grid item xs={12}>
                  <Grid container spacing={1}>

                    <Grid item xs={12} justify="center">
                      <FormControl component="fieldset">
                          <FormGroup>
                          <FormControlLabel
                              control={<Checkbox
                                  checked={state.local_refactor_settings.add_state_tax == '0' ? false : true}
                                  onChange={handleCheckboxToggle}
                                  value="add_state_tax"
                                  color="primary"
                                  />}
                              label='US state tax'
                          />
              
                          </FormGroup>
                    </FormControl>

                    <FormControl component="fieldset">
                          <FormGroup>
                          <FormControlLabel
                              control={<Checkbox
                                  checked={state.local_refactor_settings.add_vat == '0' ? false : true}
                                  onChange={handleCheckboxToggle}
                                  value="add_vat"
                                  color="primary"
                                  />}
                              label='VAT registered'
                          />
              
                          </FormGroup>
                    </FormControl>
                  </Grid>

                    {state.local_refactor_settings.add_state_tax == '0' ? null : (
                      <Grid item xs={12}>
                          <TextField
                          id="state_tax_percentage"
                          label="State tax percentage %"
                          className={classes.textField}
                          value={state.local_refactor_settings.state_tax_percentage }
                          onChange={settingsChange('state_tax_percentage')}
                          type="number"
                          InputLabelProps={{
                          shrink: true
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Icon style={{ fontSize: 16 }} className="fa fa-percentage" />
                              </InputAdornment>
                            ),
                          }}
                          margin="normal"
                          variant="outlined"
                      />
                      </Grid>
                    )}

                    {state.local_refactor_settings.add_vat == '0' ? null : (
                      <Grid item xs={12}>
                          <TextField
                          id="vat_percentage"
                          label="VAT percentage %"
                          className={classes.textField}
                          value={state.local_refactor_settings.vat_percentage}
                          onChange={settingsChange('vat_percentage')}
                          type="number"
                          InputLabelProps={{
                          shrink: true
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Icon style={{ fontSize: 16 }} className="fa fa-percentage" />
                              </InputAdornment>
                            ),
                          }}
                          margin="normal"
                          variant="outlined"
                      />
                      </Grid>
                    )}

                    {state.store == 'amazon' ? (
                      <React.Fragment>
                        <Grid item xs={12}>
                          <FormControl component="fieldset" style={{ minWidth: '250px' }}>
                            <FormGroup>
                              <FormControlLabel
                                  control={<Checkbox
                                      checked={state.local_refactor_settings.add_amazon_fee == '0' ? false : true}
                                      onChange={handleCheckboxToggle}
                                      value="add_amazon_fee"
                                      color="primary"
                                      />}
                                  label='Add Amazon fee'
                              />
                            </FormGroup>
                          </FormControl>
                        </Grid>
                        {state.local_refactor_settings.add_amazon_fee == '0' ? null : (
                          <Grid item xs={12}>
                              <TextField
                              id="amazon_fee_percentage"
                              label="Amazon fee percentage %"
                              className={classes.textField}
                              value={state.local_refactor_settings.amazon_fee_percentage}
                              onChange={settingsChange('amazon_fee_percentage')}
                              type="number"
                              InputLabelProps={{
                              shrink: true
                              }}
                              margin="normal"
                              variant="outlined"
                          />
                          </Grid>
                        )}
                      </React.Fragment>
                      ) : null}
                    
                    {state.store == 'ebay' ? (
                      <React.Fragment>
                        <Grid item xs={12}>
                          <FormControl component="fieldset" style={{ minWidth: '250px' }}>
                            <FormGroup>
                              <FormControlLabel
                                  control={<Checkbox
                                      checked={state.local_refactor_settings.add_ebay_fee == '0' ? false : true}
                                      onChange={handleCheckboxToggle}
                                      value="add_ebay_fee"
                                      color="primary"
                                      />}
                                  label='Add Ebay fee'
                              />
                            </FormGroup>
                          </FormControl>
                        </Grid>
                        {state.local_refactor_settings.add_ebay_fee == '0' ? null : (
                          <Grid item xs={12}>
                              <TextField
                              id="ebay_fee"
                              label="Ebay fee percentage"
                              className={classes.textField}
                              value={state.local_refactor_settings.ebay_fee}
                              onChange={settingsChange('ebay_fee')}
                              type="number"
                              InputLabelProps={{
                              shrink: true
                              }}
                              margin="normal"
                              variant="outlined"
                          />
                          </Grid>
                        )}

                        <Grid item xs={12}>
                          <FormControl component="fieldset" style={{ minWidth: '250px' }}>
                            <FormGroup>
                              <FormControlLabel
                                  control={<Checkbox
                                      checked={state.local_refactor_settings.add_paypal_fee == '0' ? false : true}
                                      onChange={handleCheckboxToggle}
                                      value="add_paypal_fee"
                                      color="primary"
                                      />}
                                  label='Add Paypal fee'
                              />
                            </FormGroup>
                          </FormControl>
                        </Grid>
                        {state.local_refactor_settings.add_paypal_fee == '0' ? null : (
                          <Grid item xs={12}>
                            <Grid container>
                              <Grid item xs>
                                <TextField
                                  id="paypal_fee_percentage"
                                  label="Paypal fee percentage"
                                  className={classes.textField}
                                  value={state.local_refactor_settings.paypal_fee_percentage}
                                  onChange={settingsChange('paypal_fee_percentage')}
                                  type="number"
                                  InputLabelProps={{
                                  shrink: true
                                  }}
                                  margin="normal"
                                  variant="outlined"
                                />
                              </Grid>
                              <Grid item xs>
                                <TextField
                                  id="paypal_fixed_fee"
                                  label="Paypal fixed fee"
                                  className={classes.textField}
                                  value={state.local_refactor_settings.paypal_fixed_fee}
                                  onChange={settingsChange('paypal_fixed_fee')}
                                  type="number"
                                  InputLabelProps={{
                                  shrink: true
                                  }}
                                  margin="normal"
                                  variant="outlined"
                                />
                              </Grid>
                            </Grid>     
                          </Grid>
                        )}
                      </React.Fragment>
                      ) : null}

                    <Grid item xs={5}>
                      <TextField
                          id="outlined-number"
                          label="Desired profit margin (fixed sum)"
                          value={state.local_refactor_settings.refactor_fixed_sum}
                          className={classes.textField}
                          onChange={settingsChange('refactor_fixed_sum')}
                          type="number"
                          InputLabelProps={{ shrink: true }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <MoneyIcon style={{ fontSize: 16 }} />
                              </InputAdornment>
                            ),
                          }}
                          margin="normal"
                          variant="outlined"
                          disabled={state.local_refactor_settings.use_refactor_percentage == '0' ? false : true}

                        />
                    </Grid>

                    <Grid item style={{ display: 'flex', alignItems: 'center' }} xs={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={state.local_refactor_settings.use_refactor_percentage == '0' ? false : true}
                            onChange={handleCheckboxToggle}
                            value="use_refactor_percentage"
                            name="use_refactor_percentage"
                            inputProps={{ 'aria-label': 'use refactor percentage switch' }}
                          />
                        }
                        labelPlacement="bottom"
                        classes={{ label: classes.useProfitPercentageLabel }}
                        label={state.local_refactor_settings.use_refactor_percentage == '0' ? 'Fixed profit sum' : 'Profit percentage'}
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                          id="ebay_refactor_percentage"
                          label="Desired profit percentage"
                          value={state.local_refactor_settings.refactor_percentage}
                          className={classes.textField}
                          onChange={settingsChange('refactor_percentage')}
                          type="number"
                          InputLabelProps={{ shrink: true }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Icon style={{ fontSize: 16 }} className="fa fa-percentage" />
                              </InputAdornment>
                            ),
                          }}
                          margin="normal"
                          variant="outlined"
                          required
                          disabled={state.local_refactor_settings.use_refactor_percentage == '0' ? true : false}
                      />
                    </Grid>


                  <Grid item xs={12}>
                    <SandboxCalculatorAll data={state} setSourcePriceFunc={setSourcePriceFunc} />
                  </Grid>    
                </Grid>
              </Grid>
              ) : null}

              <Grid item xs={12}>
                <FormControl component="fieldset" style={{ marginTop: 40 }}>
                  <FormLabel component="legend" style={{ fontSize: 12 }}>Add a minimum price for this listing</FormLabel>
                    <FormGroup>
                      <FormControlLabel
                        control={<Switch
                          checked={state.use_minimum_price == '0' ? false : true}
                          onChange={handleSwitchChange}
                          value="use_minimum_price"
                          color="primary"
                          />}
                        label={state.use_minimum_price == '0' ? 'No' : 'Yes'}
                      />
        
                    </FormGroup>
                    <FormHelperText>If you choose &apos;Yes&apos;, Dalio will not reprice this listing lower than the amount you set manually. This is useful to prevent selling items at a loss if their price drops suddenly.</FormHelperText>
                </FormControl>
              </Grid>
              {state.use_minimum_price == '1' ? (
                <Grid item xs={12}>
                  <TextField
                    id="minimum_price"
                    label="Minimum price"
                    className={classes.textField}
                    value={state.local_refactor_settings.minimum_price}
                    onChange={settingsChange('minimum_price')}
                    type="number"
                    InputLabelProps={{
                    shrink: true
                    }}
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
              ) : null}


              <Grid item xs={12}>
                <FormControl component="fieldset" style={{ marginTop: 40 }}>
                  <FormLabel component="legend" style={{ fontSize: 12 }}>Add a maximum price for this listing</FormLabel>
                    <FormGroup>
                      <FormControlLabel
                        control={<Switch
                          checked={state.use_maximum_price == '0' ? false : true}
                          onChange={handleSwitchChange}
                          value="use_maximum_price"
                          color="primary"
                          />}
                        label={state.use_maximum_price == '0' ? 'No' : 'Yes'}
                      />
        
                    </FormGroup>
                    <FormHelperText>If you choose &apos;Yes&apos;, Dalio will not reprice this listing higher than the amount you set manually. This is useful to prevent showing items at an inflated value if they are OUT OF STOCK.</FormHelperText>
                </FormControl>
              </Grid>
              {state.use_maximum_price == '1' ? (
                <Grid item xs={12}>
                  <TextField
                    id="maximum_price"
                    label="Maximum price"
                    className={classes.textField}
                    value={state.local_refactor_settings.maximum_price}
                    onChange={settingsChange('maximum_price')}
                    type="number"
                    InputLabelProps={{
                    shrink: true
                    }}
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
              ) : null}

            </Grid>
          ) : null}
          

          <Button
            variant="contained"
            color="primary"
            style={{ marginTop: 20 }}
            type="submit"
            fullWidth
          >
            Add listing
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default compose(withRouter)(AddListing);
