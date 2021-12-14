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

import React from 'react';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import InputAdornment from '@material-ui/core/InputAdornment';
import MoneyIcon from '@material-ui/icons/AttachMoney';
import Icon from '@material-ui/core/Icon';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';

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
  }
}));

const AmazonSettingsPanel = () => {
  const classes = useStyles();

  // This state variable keeps track of all the settings that are relevant to Amazon
  const [settings, setSettings] = React.useState({
    refactor_percentage: 15,
    add_state_tax: 0,
    state_tax_percentage: 6,
    add_amazon_fee: 0,
    amazon_fee_percentage: 15,
    refactor_fixed_sum: 0
  });

  const [settingsCompare, setSettingsCompare] = React.useState({
    refactor_percentage: 15,
    add_state_tax: 0,
    state_tax_percentage: 6,
    add_amazon_fee: 0,
    amazon_fee_percentage: 15,
    refactor_fixed_sum: 0
  });

  const [sandboxCalculator, setSandboxCalculator] = React.useState({
    show: 0,
    source_price: 10,
    target_price: 11.50
  })

  const [showSaveButton, setShowSaveButton] = React.useState(false);

  const [error, setError] = React.useState({
    status: false,
    message: ''
  });

  // Changes Amazon settings by sending an event to the main process -> which is then handled and DB updated
  const settingsChange = name => event => {

    if (name === 'refactor_fixed_sum') {
      setSettings({ ...settings, [name]: event.target.value });
      if (!isNaN(event.target.value)) {
        calculateSandboxTargetPrice();
      }
    } else {
      // If the refactor percentage`s number is greater than 0 or less than 100
      if (event.target.value >= 0 && event.target.value <= 100) {
        // Update the settings state object
        setSettings({ ...settings, [name]: parseFloat(event.target.value) });
        // Send an event to the main process, so the data can be updated in the DB as well
        calculateSandboxTargetPrice();
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
    ipcRenderer.on('amazon-settings', (event, resSettings) => {
      // When received -> update the state object with the new data

      setSettingsCompare(prevState => {
        return {...prevState, ...resSettings}
      });
      setSettings(prevState => {
        return {...prevState, ...resSettings }
      });
    });

    /* Sends an event to the main process that queries all amazon settings
    * the listener in the beginning of this useEffect handles the response to THIS event
    */
    ipcRenderer.send('amazon-settings', { action: 'query-amazon-settings' });

    // calculateSandboxTargetPrice()();
    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('amazon-settings');
    };
  }, []);

  React.useLayoutEffect(() => {
    calculateSandboxTargetPrice();

    if (JSON.stringify(settings) !== JSON.stringify(settingsCompare)) {
      setShowSaveButton(true);
    } else {
      setShowSaveButton(false);
    }
  }, [settings, sandboxCalculator.source_price]);


  const handleSwitchChange = e => {
    const checked = e.target.checked ? 1 : 0;
    setSettings({ ...settings, [e.target.value]: checked });
  };

  const saveSettings = () => {
    let validNumbers = true;
    const saveSettingsObject = settings;
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
      ipcRenderer.send('amazon-settings', { action: 'change-settings', value: saveSettingsObject });
    }
  }

  const toggleSandboxCalculator = () => {
    setSandboxCalculator(prevState => {
      return { ...prevState, show: !sandboxCalculator.show }
    });
  } 

  const calculateSandboxTargetPrice = () => {
    const sandboxSourcePrice = parseFloat(sandboxCalculator.source_price);
    const stateTaxPercentage = parseFloat(settings.state_tax_percentage);
    const refactorFixedSum = parseFloat(settings.refactor_fixed_sum);
    const amazonFeePercentage = parseFloat(settings.amazon_fee_percentage);

    let result = 0;

    if (settings.add_state_tax && !settings.add_amazon_fee) {
      result = ((sandboxSourcePrice + sandboxSourcePrice * (stateTaxPercentage/100)) + refactorFixedSum).toFixed(2);
    } else if (settings.add_state_tax && settings.add_amazon_fee) {
      result = ((sandboxSourcePrice + sandboxSourcePrice * (stateTaxPercentage/100)) + refactorFixedSum);
      result = (result + result * (amazonFeePercentage/100)).toFixed(2);
    } else if (!settings.add_state_tax && settings.add_amazon_fee) {
      result = (sandboxSourcePrice + sandboxSourcePrice * (amazonFeePercentage/100)).toFixed(2);
    } else if (!settings.add_state_tax && !settings.add_amazon_fee) {
      result = (sandboxSourcePrice + refactorFixedSum).toFixed(2);
    } 
    
    setSandboxCalculator(prevState => {
      return { ...prevState, target_price: result }
    });
    
  }

  return (
    <div style={{ background: '#f5f5f5' }}>
        <Grid container>
            <Grid item xs>
                <p style={{ fontSize: 12, fontWeight: 800 }}>Settings</p>
            </Grid>
        </Grid>
        <Grid container spacing={1}>
          <Grid item xs={12}>
              <FormControl component="fieldset" style={{ minWidth: '250px' }}>
                  <FormGroup>
                  <FormControlLabel
                      control={<Checkbox
                          checked={settings.add_state_tax == '0' ? false : true}
                          onChange={handleSwitchChange}
                          value="add_state_tax"
                          color="primary"
                          />}
                      label='Add state tax'
                  />
      
                  </FormGroup>
                  {/* <FormHelperText>If you choose &apos;Yes&apos;, the a state tax percentage will be added to every listings repricing algorithm.</FormHelperText> */}
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

          <Grid item xs={12}>
            <FormControl component="fieldset" style={{ minWidth: '250px' }}>
                <FormGroup>
                <FormControlLabel
                    control={<Checkbox
                        checked={settings.add_amazon_fee == '0' ? false : true}
                        onChange={handleSwitchChange}
                        value="add_amazon_fee"
                        color="primary"
                        />}
                    label='Add Amazon fee'
                />
    
                </FormGroup>
                {/* <FormHelperText>If you choose &apos;Yes&apos;, the a state tax percentage will be added to every listings repricing algorithm.</FormHelperText> */}
              </FormControl>
            </Grid>
            {settings.add_amazon_fee == '0' ? null : (
                <Grid item xs={12}>
                    <TextField
                    id="amazon_fee_percentage"
                    label="Amazon fee percentage %"
                    className={classes.textField}
                    value={settings.amazon_fee_percentage !== null ? settings.amazon_fee_percentage : 0 }
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

          <Grid item xs={12}>
                <TextField
                    id="outlined-number"
                    label="Desired profit margin (fixed sum)"
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
                />
            </Grid>
        </Grid>

        <Grid container>
          {showSaveButton ? (
            <React.Fragment>
              {settings.refactor_fixed_sum < 0 ? (
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
            label="You will sell for"
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
        </Grid>
    </div>
  );
};

export default AmazonSettingsPanel;