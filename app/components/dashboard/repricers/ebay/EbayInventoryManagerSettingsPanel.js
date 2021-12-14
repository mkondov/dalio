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

import React from 'react';
import { ipcRenderer } from 'electron';
import { withStyles, makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import Slider from '@material-ui/core/Slider';

const PrettoSlider = withStyles({
  root: {
    color: '#d5008d',
    height: 8,
    width: '90%'
  },
  thumb: {
    height: 24,
    width: 24,
    backgroundColor: '#fff',
    border: '2px solid currentColor',
    marginTop: -8,
    marginLeft: -12,
    '&:focus, &:hover, &$active': {
      boxShadow: 'inherit',
    },
  },
  active: {},
  valueLabel: {
    left: 'calc(-50% + 4px)',
  },
  track: {
    height: 8,
    borderRadius: 4,
  },
  rail: {
    height: 8,
    borderRadius: 4,
  },
})(Slider);

const useStyles = makeStyles(theme => ({
    textField: {
        marginTop: 20, 
        background: '#fff',
        width: 250
    },
    button: {
      width: 250,
      margin: 10
    },
    p: {
      fontSize: 12,
      width: '300px'
    },
    formControl: {
      width: '250px'
    }
}));

const EbayInventoryManagerSettingsPanel = () => {
  const classes = useStyles();

  // This state variable keeps track of all the settings that are relevant to Ebay
  // out_of_stock_action - 0 - no action, 1 - raise prices, 2 - set as 0
  const [settings, setSettings] = React.useState({
    manage_inventory: '0',
    out_of_stock_action: '1',
    lower_quantity_threshold: 1,
    higher_quantity_threshold: 10,
    title_similarity_threshold: 90
  });

  const [settingsCompare, setSettingsCompare] = React.useState({
    manage_inventory: '0',
    out_of_stock_action: '1',
    lower_quantity_threshold: 1,
    higher_quantity_threshold: 10,
    title_similarity_threshold: 90
  });

  const [showSaveButton, setShowSaveButton] = React.useState(false);
  const [error, setError] = React.useState({
    status: false,
    message: ''
  });

  // Changes Amazon settings by sending an event to the main process -> which is then handled and DB updated
  const settingsChange = name => event => {
    if (name === 'higher_quantity_threshold') {
      if (event.target.value > settings.lower_quantity_threshold) {
        setSettings({ ...settings, [name]: event.target.value });
      }
    } else {
      if (event.target.value >= 0 && event.target.value < settings.higher_quantity_threshold) {
        setSettings({ ...settings, [name]: event.target.value });
      }
    }
  };

  React.useEffect(() => {
    // Listening for 'ebay-setting' event coming from the main process
    ipcRenderer.on('ebay-inventory-manager-settings', (event, resSettings) => {
      const resSettingsCopy = JSON.parse(JSON.stringify(resSettings));

      setSettingsCompare(prevState => {
        return {...prevState, ...resSettingsCopy}
      });

      setSettings(prevState => {
        return {...prevState, ...resSettingsCopy }
      });
    });

    ipcRenderer.send('ebay-inventory-manager-settings', { action: 'query-inventory-manager-settings' });

    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('ebay-inventory-manager-settings');
    };
  }, []);

  React.useLayoutEffect(() => {
    if (JSON.stringify(settings) !== JSON.stringify(settingsCompare)) {
      setShowSaveButton(true);
    } else {
      setShowSaveButton(false);
    }
  }, [settings]);


  const handleSwitchChange = e => {
    const checked = e.target.checked ? '1' : '0';
    setSettings({ ...settings, [e.target.value]: checked });
  };

  const handleSliderChange = (e, value) => {
    console.log(value);
    setSettings({ ...settings, title_similarity_threshold: value });
  }

  const handleSelectChange = event => {
    setSettings({ ...settings, out_of_stock_action: event.target.value });
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
      ipcRenderer.send('ebay-inventory-manager-settings', { action: 'change-inventory-manager-settings', value: saveSettingsObject });
    }
  }

  return (
    <div style={{ background: '#f5f5f5' }}>
        <Grid container spacing={1}>

        <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormGroup>
                <FormControlLabel
                    control={<Checkbox
                      checked={settings.manage_inventory == '0' ? false : true}
                      onChange={handleSwitchChange}
                      value="manage_inventory"
                      color="primary"
                      />}
                    label='Manage inventory'
                />
              </FormGroup>
            </FormControl>
            <p style={{ fontSize: 13, fontWeight: 300, padding: '0px 20px', margin: 0 }}>If the inventory manager is turned on, Dalio will check if your listings` quantities go below the lower threshold and will raise them to the higher threshold.</p>
          </Grid>

          <Grid item xs={12}>
            <TextField
              id="lower_quantity_threshold"
              label="Lower product quantity threshold"
              className={classes.textField}
              value={settings.lower_quantity_threshold !== null ? settings.lower_quantity_threshold : 0 }
              onChange={settingsChange('lower_quantity_threshold')}
              type="number"
              InputLabelProps={{
              shrink: true
              }}
              margin="normal"
              variant="outlined"
              disabled={settings.manage_inventory == '0' ? true : false}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              id="higher_quantity_threshold"
              label="Higher product quantity threshold"
              className={classes.textField}
              value={settings.higher_quantity_threshold !== null ? settings.higher_quantity_threshold : 0 }
              onChange={settingsChange('higher_quantity_threshold')}
              type="number"
              InputLabelProps={{
              shrink: true
              }}
              margin="normal"
              variant="outlined"
              disabled={settings.manage_inventory == '0' ? true : false}
            />
          </Grid>
        
          <Grid item xs={12} style={{ padding: '20px 0px' }}>
            <FormControl className={classes.formControl}>
              <InputLabel id="out_of_stock_action_label" style={{ fontSize: 14, fontWeight: 900 }}>What to do with &apos;Out of Stock&apos; products</InputLabel>
              <Select
                labelId="out_of_stock_action_label"
                id="out_of_stock_action"
                style={{ paddingRight: 10 }}
                value={settings.out_of_stock_action}
                onChange={handleSelectChange}
              >
                <MenuItem value='0'>No action</MenuItem>
                <MenuItem value='1'>Raise the price of the item</MenuItem>
                <MenuItem value='2'>Set the item`s stock to 0</MenuItem>
              </Select>
            </FormControl>

            {settings.out_of_stock_action == '2' ? (
              <p style={{ fontSize: 13, fontWeight: 300, padding: '0px 20px' }}>Make sure that you have enabled the &apos;Out of Stock&apos; option from <strong>&apos;Account Settings -&gt; Site Preferences -&gt; Selling Preferences -&gt; Use the out-of-stock-option&apos;</strong>. Otherwise, your out of stock listings will be delisted.</p>
            ) : null}
          </Grid>
          
          <Grid item xs={12}>
            <h4>Amazon title similarity</h4>
            <p style={{ fontSize: 13, fontWeight: 500, padding: '0px 20px' }}>Sometimes Amazon changes the product but keeps the same ASIN and URL which leads to undesired consequences. Dalio will extract the product title at the first Amazon price check and keep it to be compared at each price check after that. If the similarity is less than {settings.title_similarity_threshold}%, Dalio will consider the product to have changed and will take it OUT OF STOCK.</p>
            <p style={{ fontSize: 13, fontWeight: 500, padding: '0px 20px' }}>100% is the strictest comparison - the titles must match exactly each time.</p>
            <p style={{ fontSize: 13, fontWeight: 500, padding: '0px 20px' }}>0% means that this feature is turned OFF.</p>
            <p style={{ fontSize: 13, fontWeight: 900, padding: '0px 20px' }}>RECOMMENDED: 90%.</p>
            <PrettoSlider 
              valueLabelDisplay="auto" 
              aria-label="pretto slider" 
              onChange={handleSliderChange}
              value={settings.title_similarity_threshold}
              step={10}
            />
          </Grid>
          
        </Grid> 
        <Grid container>
          {showSaveButton ? (
            <React.Fragment>
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
    </div>
  );
};

export default EbayInventoryManagerSettingsPanel;