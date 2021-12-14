/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint arrow-body-style: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint eqeqeq: 0 */
/* eslint operator-assignment: 0 */

import React from 'react';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import HelpIcon from '@material-ui/icons/Help';
import InputAdornment from '@material-ui/core/InputAdornment';
import MoneyIcon from '@material-ui/icons/AttachMoney';
import Icon from '@material-ui/core/Icon';

import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';

import Util from '../../../functions/core/util/Util';

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

const SandboxCalculatorAll = props => {
  const classes = useStyles();
  const { data } = props;
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
    add_amazon_fee: '0',
    amazon_fee_percentage: 15,
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


  const sandboxChange = name => event => {
    const value = event.target.value;

    if (name === 'source_price') {
      if (props.setSourcePriceFunc !== undefined) {
        props.setSourcePriceFunc(event.target.value);
      }
    }
    
    // Update the settings state object
    setSandboxCalculator(prevState => {
      return { ...prevState, [name]: value }
    });
  };


  React.useEffect(() => {
    setSettings(prevState => {
      return {...prevState, ...props.data.local_refactor_settings }
    });

    if (props.price !== undefined) {
      const { price } = props;
      if (price !== null && price !== '') {
        setSandboxCalculator(prevState => {
          return { ...prevState, source_price: price }
        });
      }
    }

  }, [data]);

  React.useLayoutEffect(() => {

    if (sandboxCalculator.source_price !== '') {
      calculateSandboxTargetPrice(sandboxCalculator.source_price, settings);
    }

  }, [settings, sandboxCalculator.source_price]);


  const calculateSandboxTargetPrice = async (sourcePriceParam, formulaSettings) => {
    const calculatedValues = await Util.calculateSalePrice(sourcePriceParam, formulaSettings);

    setSandboxCalculator(prevState => {
      return { ...prevState, ...calculatedValues }
    });
  }

  return (
    <div style={{ background: '#f5f5f5', padding: 10 }}>
        <Grid container>
            <Grid item xs>
                <p style={{ fontSize: 12, fontWeight: 800 }}>Sandbox calculator</p>
            </Grid>
            <Grid item xs={12}>
              <p style={{ fontSize: 10 }}>The &apos;Product Source price&apos; in the field below is set to the listing`s source price. <br/><b>IMPORTANT</b> - if the listing is new and Dalio has not yet fetched its price, the value in the &apos;Product Source price&apos; will default to 10. Changing this value will not affect the listing`s source price.</p>  
            </Grid>
        </Grid>

        <Grid container>
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

          {settings.add_ebay_fee == '1' ? (
            <Grid item xs={4} className={classes.padding5}>
              <p className={classes.pGrossProfit}>Calculated eBay fee <span className={classes.spanPrice}>{sandboxCalculator.calculated_ebay_fee}
              </span></p> 
            </Grid>
          ) : null}


          {settings.add_paypal_fee == '1' ? (
            <Grid item xs={4} className={classes.padding5}>
              <p className={classes.pGrossProfit}>Calculated Paypal fees <span className={classes.spanPrice}>{sandboxCalculator.calculated_paypal_fees}
              </span></p> 
            </Grid>
          ) : null}


          <Grid item xs={4} className={classes.padding5}>
            <p className={classes.pGrossProfit}>Calculated profit <span className={classes.spanPrice}>{sandboxCalculator.calculated_profit}
            </span></p> 
          </Grid>

        </Grid>
    </div>
  );
};

export default SandboxCalculatorAll;