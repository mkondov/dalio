/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint arrow-body-style: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint eqeqeq: 0 */
/* eslint operator-assignment: 0 */
/* eslint no-restricted-globals: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint camelcase: 0 */

import React from 'react';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import InputAdornment from '@material-ui/core/InputAdornment';
import Switch from '@material-ui/core/Switch';
import MoneyIcon from '@material-ui/icons/AttachMoney';
import Icon from '@material-ui/core/Icon';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';

import Util from '../../../../functions/core/util/Util';

const useStyles = makeStyles(theme => ({
  gridHeader: {
    backgroundColor: '#505050'
  },
  textField: {
    marginTop: 20, 
    background: '#fff',
    width: 250
  },
  button: {
    width: 250,
    margin: 10
  },
  useProfitPercentageLabel: {
    fontSize: '9px'
  },
  pGrossProfit: {
    color: '#333',
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 5,
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  spanPrice: {
    display: 'block', 
    textAlign: 'center', 
    marginTop: 5,
    padding: 5, 
    color: '#000',
    background: '#fff',
    border: '1px solid #333'
  },
  padding5: {
    padding: 5
  },
}));

const EbaySettingsPanel = () => {
  const classes = useStyles();

  // This state variable keeps track of all the settings that are relevant to Amazon
  const [settings, setSettings] = React.useState({
    add_state_tax: '0',
    state_tax_percentage: 6,
    add_vat: '0',
    vat_percentage: 20,
    add_ebay_fee: '0',
    ebay_fee: 11,
    add_paypal_fee: '0',
    paypal_fee_percentage: 2.9,
    paypal_fixed_fee: 0.30,
    use_refactor_percentage: '0',
    refactor_percentage: 15,
    refactor_fixed_sum: 0
  });

  const [settingsCompare, setSettingsCompare] = React.useState({
    add_state_tax: '0',
    state_tax_percentage: 6,
    add_vat: '0',
    vat_percentage: 20,
    add_ebay_fee: '0',
    ebay_fee: 11,
    add_paypal_fee: '0',
    paypal_fee_percentage: 2.9,
    paypal_fixed_fee: 0.30,
    use_refactor_percentage: '0',
    refactor_percentage: 15,
    refactor_fixed_sum: 0
  });

  const [sandboxCalculator, setSandboxCalculator] = React.useState({
    show: '0',
    source_price: 10,
    target_price: 11.50,
    calculated_ebay_fee: 0,
    calculated_paypal_fees: 0,
    calculated_purchase_vat: 0,
    calculated_sale_vat: 0,
    calculated_state_tax: 0,
    calculated_profit: 0,
  })

  const [showSaveButton, setShowSaveButton] = React.useState(false);
  const [error, setError] = React.useState({
    status: false,
    message: ''
  });

  const settingsChange = name => event => {
    if (name === 'refactor_fixed_sum' && settings.add_vat == '0') {
      setSettings({ ...settings, [name]: event.target.value });
      // if (!isNaN(event.target.value)) {
      //   const calculatedValues = calculateSandboxTargetPrice(sandboxCalculator.source_price, settings);

      //   setSandboxCalculator(prevState => {
      //     return { ...prevState, ...calculatedValues }
      //   });
      // }
    } else {
      const eventTargetValue = parseFloat(event.target.value);

      if (settings.add_vat == '1') {
        let ebayFeePercentage = 0;
        let paypalFeePercentage = 0;
        const vat = parseFloat(settings.vat_percentage);
        let refactorPercentage = 0;

        if (settings.add_ebay_fee == '1') {
          if (name === 'ebay_fee') {
            ebayFeePercentage = eventTargetValue;
          } else {
            ebayFeePercentage = parseFloat(settings.ebay_fee);
          }
        }

        if (settings.add_paypal_fee == '1') {
          if (name === 'paypal_fee_percentage') {
            paypalFeePercentage = eventTargetValue;
          } else {
            paypalFeePercentage = parseFloat(settings.paypal_fee_percentage);
          }
        }

        if (settings.use_refactor_percentage == '1') {
          if (name === 'refactor_percentage') {
            refactorPercentage = eventTargetValue;
          } else {
            refactorPercentage = parseFloat(settings.refactor_percentage);
          }
        } else {
          const sourcePrice = parseFloat(sandboxCalculator.source_price);
          if (name === 'refactor_fixed_sum') {
            refactorPercentage = 100*(sourcePrice*(eventTargetValue/100));
          } else {
            refactorPercentage = 100*(sourcePrice*(parseFloat(settings.refactor_fixed_sum)/100));
          }
        }

        if (event.target.value <= 100 && ((ebayFeePercentage + paypalFeePercentage + vat + refactorPercentage) < 100)) {
          if ((name === 'paypal_fee_percentage' || name === 'paypal_fixed_fee' || name === 'ebay_fee') && event.target.value < 0) {
            return null;
          }

          if (name === 'vat_percentage' && (event.target.value < 0 || event.target.value > 30)) {
            return null;
          }

          setSettings({ ...settings, [name]: parseFloat(event.target.value) });
          // const calculatedValues = calculateSandboxTargetPrice(sandboxCalculator.source_price, settings);

          // setSandboxCalculator(prevState => {
          //   return { ...prevState, ...calculatedValues }
          // });
        }

      } else {

        let ebayFeePercentage = 0;
        let paypalFeePercentage = 0;
        let refactorPercentage = 0;

        if (settings.add_ebay_fee == '1') {
          if (name === 'ebay_fee') {
            ebayFeePercentage = eventTargetValue;
          } else {
            ebayFeePercentage = parseFloat(settings.ebay_fee);
          }
        }

        if (settings.add_paypal_fee == '1') {
          if (name === 'paypal_fee_percentage') {
            paypalFeePercentage = eventTargetValue;
          } else {
            paypalFeePercentage = parseFloat(settings.paypal_fee_percentage);
          }
        }

        if (settings.use_refactor_percentage == '1') {
          if (name === 'refactor_percentage') {
            refactorPercentage = eventTargetValue;
          } else {
            refactorPercentage = parseFloat(settings.refactor_percentage);
          }
        }

        if (eventTargetValue >= 0 && eventTargetValue <= 100) {
          if ((name === 'refactor_percentage' || name === 'paypal_fee_percentage' || name === 'ebay_fee') && ((paypalFeePercentage + ebayFeePercentage + refactorPercentage) >= 100)) {
            return null;
          }

          setSettings({ ...settings, [name]: parseFloat(event.target.value) });
          // const calculatedValues = calculateSandboxTargetPrice(sandboxCalculator.source_price, settings);

          // setSandboxCalculator(prevState => {
          //   return { ...prevState, ...calculatedValues }
          // });
          
        }
      }
    }
  };

  const sandboxChange = name => event => {
    const value = event.target.value;
    
    // Update the settings state object
    setSandboxCalculator(prevState => {
      return { ...prevState, [name]: value }
    });
  };


  React.useEffect(() => {
    // Listening for 'amazon-setting' event coming from the main process
    ipcRenderer.on('ebay-settings', (event, resSettings) => {
      const resSettingsCopy = JSON.parse(JSON.stringify(resSettings));
      // When received -> update the state object with the new data
      if (typeof resSettings.add_ebay_fee == 'number') {
        resSettingsCopy.add_ebay_fee = resSettings.add_ebay_fee.toFixed();
      }

      if (typeof resSettings.add_paypal_fee == 'number') {
        resSettingsCopy.add_paypal_fee = resSettings.add_paypal_fee.toFixed();
      }

      if (typeof resSettings.add_state_tax == 'number') {
        resSettingsCopy.add_state_tax = resSettings.add_state_tax.toFixed();
      }

      if (typeof resSettings.use_refactor_percentage == 'number') {
        resSettingsCopy.use_refactor_percentage = resSettings.use_refactor_percentage.toFixed();
      }

      setSettingsCompare(prevState => {
        return {...prevState, ...resSettingsCopy}
      });
      setSettings(prevState => {
        return {...prevState, ...resSettingsCopy }
      });
    });

    /* Sends an event to the main process that queries all amazon settings
    * the listener in the beginning of this useEffect handles the response to THIS event
    */
    ipcRenderer.send('ebay-settings', { action: 'query-ebay-settings' });

    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('ebay-settings');
    };
  }, []);

  React.useLayoutEffect(() => {
    // calculateSandboxTargetPrice();

    if (sandboxCalculator.source_price !== '') {
      calculateSandboxTargetPrice(sandboxCalculator.source_price, settings);
    }

    if (JSON.stringify(settings) !== JSON.stringify(settingsCompare)) {
      setShowSaveButton(true);
    } else {
      setShowSaveButton(false);
    }
  }, [settings, sandboxCalculator.source_price]);


  const handleSwitchChange = e => {
    const checked = e.target.checked ? '1' : '0';
    let uncheck = '';

    if (e.target.value === 'add_vat' && e.target.checked) {
      if (settings.add_state_tax == '1') {
        uncheck = 'add_state_tax';
      }
    }

    if (e.target.value === 'add_state_tax' && e.target.checked) {
      if (settings.add_vat == '1') {
        uncheck = 'add_vat';
      }
    }

    if (uncheck !== '') {
      setSettings({ ...settings, [e.target.value]: checked, [uncheck]: '0' });
    } else {
      // console.log(e.target.value, checked, typeof checked);
      setSettings({ ...settings, [e.target.value]: checked });
    }
  };

  const saveSettings = () => {
    let validNumbers = true;
    const saveSettingsObject = JSON.parse(JSON.stringify(settings));
    // before submitting the new listing to the DB -> need to make sure that the repricer formula values are valid numbers
    for (const [key, value] of Object.entries(saveSettingsObject)) {
      if (isNaN(value) || value === '') {
        setError({
          status: true,
          message: 'Make sure that all of your inputs are entered correctly.'
        });
        validNumbers = false;
      } else {
        if (typeof value === 'string') {
          saveSettingsObject[key] = parseFloat(value);
        }
      }
    }
    if (validNumbers) {
      ipcRenderer.send('ebay-settings', { action: 'change-settings', value: saveSettingsObject });
    }
  }

  const toggleSandboxCalculator = () => {
    setSandboxCalculator(prevState => {
      return { ...prevState, show: !sandboxCalculator.show }
    });
  } 

  const calculateSandboxTargetPrice_old = () => {
    const sandboxSourcePrice = parseFloat(sandboxCalculator.source_price);
    const stateTaxPercentage = parseFloat(settings.state_tax_percentage);
    const refactorFixedSum = parseFloat(settings.refactor_fixed_sum);
    let refactorPercentage = parseFloat(settings.refactor_percentage);
    let ebayFeePercentage = parseFloat(settings.ebay_fee);
    let paypalFeePercentage = parseFloat(settings.paypal_fee_percentage);
    let paypalFixedFee = parseFloat(settings.paypal_fixed_fee);

    let result = 0;

    // SupplierPriceFinal = (SupplierPrice + (SupplierPrice * (StateTax / 100))) + ProfitAmount
    // ShopPrice = (SupplierPriceFinal + 0.30) / (1 - ((EbayFee + PaypalFee) / 100)) 
    // SupplierPriceFinal = SupplierPrice + ProfitAmount

    let refactorSum = 0;

    if (settings.use_refactor_percentage == '0') {
      refactorSum = refactorFixedSum;
    } else if (settings.use_refactor_percentage == '1') {
      refactorSum = sandboxSourcePrice * (refactorPercentage/100);
    }

    if (settings.add_vat == '1') {
      let vat = typeof settings.vat_percentage == 'number' ? settings.vat_percentage : parseFloat(settings.vat_percentage);
      ebayFeePercentage = 0;
      paypalFeePercentage = 0;
      paypalFixedFee = 0;

      vat = 1 + (vat/100);

      if (settings.add_ebay_fee == '1') {
        ebayFeePercentage = parseFloat(settings.ebay_fee)/100;
      }

      if (settings.add_paypal_fee == '1') {
        paypalFeePercentage = parseFloat(settings.paypal_fee_percentage)/100;
        paypalFixedFee = parseFloat(settings.paypal_fixed_fee);
      }
      
      if (settings.use_refactor_percentage == '1') {
        refactorPercentage = refactorPercentage/100;
      } else {
        refactorPercentage = refactorFixedSum/sandboxSourcePrice;
      }

      result = -1 * ((sandboxSourcePrice/vat+paypalFixedFee) / (-1/vat+ebayFeePercentage+paypalFeePercentage+refactorPercentage));

      // VAT formula
      // -1*((vendor_price+vendor_shipping)/1.0+0.30)/(-1/1.0+0.10+0.034+0.05)
    } else {

      if (settings.add_state_tax == '0' && settings.add_ebay_fee == '0' && settings.add_paypal_fee == '0') {
        result = (sandboxSourcePrice + refactorSum).toFixed(2);
      } else if (settings.add_state_tax == '1' && settings.add_ebay_fee == '0' && settings.add_paypal_fee == '0') {
        result = ((sandboxSourcePrice + sandboxSourcePrice * (stateTaxPercentage/100)) + refactorSum);
      } else if (settings.add_state_tax == '1' && settings.add_ebay_fee == '1' && settings.add_paypal_fee == '0') {
        result = ((sandboxSourcePrice + sandboxSourcePrice * (stateTaxPercentage/100)) + refactorSum);
        const ebayFeeResult = result * (ebayFeePercentage/100);
        result = result + ebayFeeResult;
        // result = (result / (1 - ((ebayFeePercentage) / 100))).toFixed(2); 
      } else if (settings.add_state_tax == '1' && settings.add_ebay_fee =='1' && settings.add_paypal_fee == '1') {
        result = (sandboxSourcePrice + (sandboxSourcePrice * (stateTaxPercentage/100))) + refactorSum;
        const ebayFeeResult = result * (ebayFeePercentage/100);
        const paypalFeeResult = (result * (paypalFeePercentage/100)) + paypalFixedFee;
        result = result + ebayFeeResult + paypalFeeResult;
        // result = ((result + paypalFixedFee) / (1 - ((ebayFeePercentage + paypalFeePercentage) / 100))).toFixed(2);
      } else if (settings.add_state_tax == '0' && settings.add_ebay_fee == '1' && settings.add_paypal_fee == '1') {
        result = (sandboxSourcePrice + refactorSum);
        const ebayFeeResult = result * (ebayFeePercentage/100);
        const paypalFeeResult = (result * (paypalFeePercentage/100)) + paypalFixedFee;
        result = result + ebayFeeResult + paypalFeeResult;
        // result = ((result + paypalFixedFee) / (1 - ((ebayFeePercentage + paypalFeePercentage) / 100))).toFixed(2);
      } else if (settings.add_state_tax == '0' && settings.add_ebay_fee == '0' && settings.add_paypal_fee == '1') {
        result = (sandboxSourcePrice + refactorSum);
        const paypalFeeResult = (result * (paypalFeePercentage/100)) + paypalFixedFee;
        result = result + paypalFeeResult;
        // result = ((result + paypalFixedFee) / (1 - ((paypalFeePercentage) / 100))).toFixed(2);
      } else if (settings.add_state_tax == '0' && settings.add_ebay_fee == '1' && settings.add_paypal_fee == '0') {
        result = (sandboxSourcePrice + refactorSum);
        const ebayFeeResult = result * (ebayFeePercentage/100);
        result = result + ebayFeeResult;
        // result = ((result)/(1 - ((ebayFeePercentage)/100))).toFixed(2);
      } else if (settings.add_state_tax == '1' && settings.add_ebay_fee == '0' && settings.add_paypal_fee == '1') {
        result = ((sandboxSourcePrice + sandboxSourcePrice * (stateTaxPercentage/100)) + refactorSum);  
        const paypalFeeResult = (result * (paypalFeePercentage/100)) + paypalFixedFee;
        result = result + paypalFeeResult;
        // result = ((result + paypalFixedFee)/(1 - ((paypalFeePercentage)/100))).toFixed(2);
      } 

    }


    result = parseFloat(result).toFixed(2);
    setSandboxCalculator(prevState => {
      return { ...prevState, target_price: result }
    });
  }

  const calculateSandboxTargetPrice = async (sourcePriceParam, formulaSettings) => {
    const calculatedValues = await Util.calculateSalePrice(sourcePriceParam, formulaSettings);

    setSandboxCalculator(prevState => {
      return { ...prevState, ...calculatedValues }
    });
  }

  return (
    <div style={{ background: '#f5f5f5' }}>
        <Grid container spacing={1}>
          <Grid item xs={12}>
              <FormControl component="fieldset">
                  <FormGroup>
                  <FormControlLabel
                      control={<Checkbox
                          checked={settings.add_state_tax == '0' ? false : true}
                          onChange={handleSwitchChange}
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
                          checked={settings.add_vat == '0' ? false : true}
                          onChange={handleSwitchChange}
                          value="add_vat"
                          color="primary"
                          />}
                      label='VAT registered'
                  />
      
                  </FormGroup>
            </FormControl>
          </Grid>

          {settings.add_state_tax == '0' ? null : (
              <Grid item xs={12}>
                  <TextField
                  id="state_tax_percentage"
                  label="State tax percentage %"
                  className={classes.textField}
                  value={settings.state_tax_percentage !== null ? settings.state_tax_percentage : 0 }
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

          {settings.add_vat == '0' ? null : (
              <Grid item xs={12}>
                  <TextField
                  id="vat_percentage"
                  label="VAT percentage %"
                  className={classes.textField}
                  value={settings.vat_percentage !== null ? settings.vat_percentage : 0 }
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

          <Grid item xs={12}>
            <FormControl component="fieldset" style={{ minWidth: '250px' }}>
                <FormGroup>
                <FormControlLabel
                    control={<Checkbox
                        checked={settings.add_ebay_fee == '0' ? false : true}
                        onChange={handleSwitchChange}
                        value="add_ebay_fee"
                        color="primary"
                        />}
                    label='Add Ebay fee'
                />
    
                </FormGroup>
              </FormControl>
          </Grid>
          {settings.add_ebay_fee == '0' ? null : (
            <Grid item xs={12}>
                <TextField
                id="ebay_fee"
                label="Ebay fee percentage %"
                className={classes.textField}
                value={settings.ebay_fee !== null ? settings.ebay_fee : 0 }
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
                        checked={settings.add_paypal_fee == '0' ? false : true}
                        onChange={handleSwitchChange}
                        value="add_paypal_fee"
                        color="primary"
                        />}
                    label='Add Paypal fee'
                />
    
                </FormGroup>
              </FormControl>
          </Grid>
          {settings.add_paypal_fee == '0' ? null : (
            <Grid item xs={12}>
              <Grid container>
                <Grid item xs>
                  <TextField
                    id="paypal_fee_percentage"
                    label="Paypal fee percentage %"
                    className={classes.textField}
                    value={settings.paypal_fee_percentage !== null ? settings.paypal_fee_percentage : 0 }
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
                      label="Paypal fee fixed amount"
                      className={classes.textField}
                      value={settings.paypal_fixed_fee !== null ? settings.paypal_fixed_fee : 0 }
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

          <Grid item xs={5}>
            <TextField
                id="outlined-number"
                label="Desired profit amount"
                value={settings.refactor_fixed_sum}
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
                disabled={settings.use_refactor_percentage == '0' ? false : true}
                required
            />
          </Grid>

          <Grid item style={{ display: 'flex', alignItems: 'center' }} xs={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.use_refactor_percentage == '0' ? false : true}
                  onChange={handleSwitchChange}
                  value="use_refactor_percentage"
                  name="use_refactor_percentage"
                  inputProps={{ 'aria-label': 'use refactor percentage switch' }}
                />
              }
              labelPlacement="bottom"
              classes={{ label: classes.useProfitPercentageLabel }}
              label={settings.use_refactor_percentage == '0' ? 'Fixed profit sum' : 'Profit percentage'}
            />
          </Grid>
          <Grid item xs={5}>
            <TextField
                id="ebay_refactor_percentage"
                label="Desired profit percentage"
                value={settings.refactor_percentage}
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
                disabled={settings.use_refactor_percentage == '0' ? true : false}
            />
          </Grid>

        </Grid>

        <Grid container>
          {showSaveButton ? (
            <React.Fragment>
              {settings.refactor_fixed_sum < 0 || settings.refactor_percentage < 0 ? (
                <Grid item xs={12}>
                  <p style={{ fontSize: 12, color: 'red' }}>Your desired profit margin amount is now negative. Be careful as you will be selling at a loss.</p>  
                </Grid>
              ) : null}
              
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
                  >
                    Save
                </Button>                
              </Grid>
          </React.Fragment>
          ) : null}
          
        </Grid>
        <Grid container>
          <Grid item xs={12}>
            <p style={{ fontSize: 12, textDecoration: 'underline' }}>Sandbox calculator</p>
          </Grid>
          <Grid item xs={12}>
            <p style={{ fontSize: 10 }}>The &apos;Product Source price&apos; in the field below is a random number you can play with in order to get the desired global reprice formula.</p>  
          </Grid>
          <Grid item xs>
            <TextField
            id="source_price"
            label="Product source price"
            className={classes.textField}
            value={sandboxCalculator.source_price !== null ? sandboxCalculator.source_price : 0 }
            onChange={sandboxChange('source_price')}
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
          <Grid item xs>
            <TextField
              id="target_price"
              label="Product target price"
              className={classes.textField}
              value={sandboxCalculator.target_price !== null ? sandboxCalculator.target_price : 0 }
              type="number"
              disabled
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

          <Grid item xs={12}>
            <p style={{ fontSize: 12, textDecoration: 'underline' }}>Breakdown</p>
          </Grid>

          {settings.add_vat == '1' ? (
            <React.Fragment>
              <Grid item xs={6} className={classes.padding5}>
                <p className={classes.pGrossProfit}>Calculated purchase VAT <span className={classes.spanPrice}>{sandboxCalculator.calculated_purchase_vat}
                </span></p> 
              </Grid>
              <Grid item xs={6} className={classes.padding5}>
                <p className={classes.pGrossProfit}>Calculated sale VAT <span className={classes.spanPrice}>{sandboxCalculator.calculated_sale_vat}
                </span></p> 
              </Grid>
      
          </React.Fragment>
          ) : null}

          {settings.add_state_tax == '1' ? (
            <Grid item xs={12} className={classes.padding5}>
              <p className={classes.pGrossProfit}>Calculated US state tax <span className={classes.spanPrice}>{sandboxCalculator.calculated_state_tax}
              </span></p> 
            </Grid>
          ) : null}

          <Grid item xs={4} className={classes.padding5}>
            <p className={classes.pGrossProfit}>Calculated eBay fee <span className={classes.spanPrice}>{sandboxCalculator.calculated_ebay_fee}
            </span></p> 
          </Grid>

          <Grid item xs={4} className={classes.padding5}>
            <p className={classes.pGrossProfit}>Calculated Paypal fees <span className={classes.spanPrice}>{sandboxCalculator.calculated_paypal_fees}
            </span></p> 
          </Grid>

          <Grid item xs={4} className={classes.padding5}>
            <p className={classes.pGrossProfit}>Calculated profit <span className={classes.spanPrice}>{sandboxCalculator.calculated_profit}
            </span></p> 
          </Grid>
          
        </Grid>
    </div>
  );
};

export default EbaySettingsPanel;