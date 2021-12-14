/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint eqeqeq: 0 */
/* eslint no-unused-vars: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint no-restricted-globals: 0 */

import React from 'react';
import { ipcRenderer } from 'electron';
import { compose } from 'redux';
import { withRouter, Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
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
import SandboxCalculatorAll from '../dashboard/repricers/SandboxCalculatorAll';
import routes from '../../constants/routes.json';
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

const EditListing = props => {
  const classes = useStyles();
  const { data, referrer } = props.location.state;
  const [updateListingError, setUpdateListingError] = React.useState({
    status: false,
    message: {
      title: '',
      body: ''
    }
  });

  const [settings, setSettings] = React.useState({
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
  });

  const [state, setState] = React.useState({
      id: data.id,
      item_name: data.item_name,
      is_variant: data.is_variant,
      has_variations: data.has_variations,
      image: data.image,
      store: data.store,
      store_id: data.store_id,
      store_url: data.store_url,
      supplier: data.supplier,
      supplier_id: data.supplier_id,
      supplier_url: data.supplier_url,
      refactor_percentage: data.refactor_percentage,
      use_global_refactor_settings: data.use_global_refactor_settings,
      use_minimum_price: data.use_minimum_price,
      use_maximum_price: data.use_maximum_price,
      local_refactor_settings: data.local_refactor_settings
  });

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
          const sourcePrice = data.new_price !== null ? parseFloat(data.new_price) : 10;

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

  const handleSupplierSelect = e => {
    setState({ ...state, [e.target.name]: e.target.value });
  };

  const handleSwitchChange = e => {
    const checked = e.target.checked ? 1 : 0;
    setState({ ...state, [e.target.value]: checked });
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

  const onSubmit = e => {
    e.preventDefault();
    let validNumbers = true;
    const editedListing = state;
    // before submitting the new listing to the DB -> need to make sure that the repricer formula values are valid numbers
    for (const [key, value] of Object.entries(editedListing.local_refactor_settings)) {
      if (isNaN(value) || value === '') {
        validNumbers = false;
      } else {
        if (typeof value === 'string') {
          editedListing.local_refactor_settings[key] = parseFloat(value);
        }
      }
    }
    ipcRenderer.send('update-listing', editedListing);
  };

   React.useEffect(() => {

    if (state.local_refactor_settings == null) {
      if (state.store === 'amazon' || state.store === 'ebay') {
        setState({ ...state, local_refactor_settings: settings });
      }
     } else if (typeof state.local_refactor_settings === 'string') {
       const tempSettings = JSON.parse(state.local_refactor_settings);
       if (tempSettings.minimum_price === undefined) {
         tempSettings.minimum_price = 0;
       }

       if (tempSettings.maximum_price === undefined) {
          tempSettings.maximum_price = 0;
       }

      setState({
        ...state,
        local_refactor_settings: tempSettings
      });

     } else if (typeof state.local_refactor_settings === 'object' && state.local_refactor_settings !== null) {
      const tempSettings = state.local_refactor_settings;
      if (tempSettings.minimum_price === undefined) {
        tempSettings.minimum_price = 0;
      }
      if (tempSettings.maximum_price === undefined) {
        tempSettings.maximum_price = 0;
      }
      setState({
        ...state,
        local_refactor_settings: state.local_refactor_settings
      });
     }

     ipcRenderer.on('update-listing', (event, result) => {
      if (result.status === 'error') {
         if (result.type === 'listing-already-exists') {
          setUpdateListingError({
            status: true,
            message: {
              title: 'Listing duplicate!',
              body: 'You already have a listing with the same Selling Platform ID.'
            }
          });
        }  
      } else {
        if (referrer === 'listings_page') {
          props.history.push(routes.LISTINGS);
        } else if (referrer === 'orders_page') {
          props.history.push(routes.AUTOORDER);
        }
      }
    });

      // Cleanup the listener events so that memory leaks are avoided.
    return function cleanup() {
      ipcRenderer.removeAllListeners('update-listing');
    }

  }, []);

  return (
    <Container maxWidth="md" style={{ marginTop: 80, marginBottom: 20 }}>
      <Button
        color="primary"
        component={AdapterLink}
        to={referrer == 'listings_page' ? routes.LISTINGS : routes.AUTOORDER}
        className={classes.button}
      >
        <ArrowLeft className={classes.iconLeft} /> Back
      </Button>
      <Paper elevation={0}>
        <Typography
          className={classes.flex}
          style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}
          variant="h6"
          component="h6"
        >
          <img style={{ width: '50px', marginRight: 20}} src={state.image} alt=""/>
          {data.item_name}
        </Typography>

        {updateListingError.status ? (
          <Paper className={classes.errorPaper}>
            <Typography variant="h5" component="h3" className={classes.errorH5}>
              {updateListingError.message.title}
            </Typography>
            <Typography component="p" className={classes.errorP}>
              {updateListingError.message.body}
            </Typography>
          </Paper>
        ) : null}

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
                  value={state.supplier !== null ? state.supplier : ''}
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
                value={state.supplier_id !== null ? state.supplier_id : ''}
                onChange={onChange}
                className={classes.textField}
                margin="normal"
                required
                fullWidth
              />
              <TextField
                id="supplier_url"
                label="Sourcing platform product URL"
                value={state.supplier_url !== null ? state.supplier_url : ''}
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
                >
                  <MenuItem value="ebay"><img src={EbayLogo} style={{ width: '40px', marginRight: 5 }} alt="" />Ebay</MenuItem>
                </Select>
              </FormControl>
              <TextField
                id="store_id"
                label="Selling platform ID"
                value={state.store_id !== null ? state.store_id : ''}
                onChange={onChange}
                className={classes.textField}
                margin="normal"
                fullWidth
              />
              <TextField
                id="store_url"
                label="Selling platform product URL"
                value={state.store_url !== null ? state.store_url : ''}
                onChange={onChange}
                className={classes.textField}
                margin="normal"
                fullWidth
              />
            </Grid>
          </Grid>

          <Grid container>
            <Grid item xs={12}>
              <FormControl component="fieldset" style={{ marginTop: 40 }}>
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
                          id="ebay_fee_percentage"
                          label="Ebay fee percentage %"
                          className={classes.textField}
                          value={state.local_refactor_settings.ebay_fee}
                          onChange={settingsChange('ebay_fee')}
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
                            label="Paypal fee percentage %"
                            className={classes.textField}
                            value={state.local_refactor_settings.paypal_fee_percentage}
                            onChange={settingsChange('paypal_fee_percentage')}
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
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <MoneyIcon style={{ fontSize: 16 }} />
                                </InputAdornment>
                              ),
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
                      id="desired-profit-margin"
                      label="Desired profit margin (fixed sum)"
                      value={state.local_refactor_settings.refactor_fixed_sum}
                      className={classes.textField}
                      onChange={settingsChange('refactor_fixed_sum')}
                      type="number"
                      InputLabelProps={{
                        shrink: true
                      }}
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
                      required
                      disabled={state.local_refactor_settings.use_refactor_percentage == '0' ? true : false}
                  />
                </Grid>



                <Grid item xs={12}>
                  <SandboxCalculatorAll data={state} price={data.new_price}/>
                </Grid>
              </Grid>
            </Grid>
            ) : null}

            <Grid item xs={12}>
              <FormControl component="fieldset" style={{ marginTop: 20 }}>
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
              <FormControl component="fieldset" style={{ marginTop: 20 }}>
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
          
          <Button
            variant="contained"
            color="primary"
            style={{ marginTop: 20 }}
            type="submit"
            fullWidth
          >
            Save
          </Button>
        </form>
      
      </Paper>
    </Container>
  );
};

export default compose(withRouter)(EditListing);
