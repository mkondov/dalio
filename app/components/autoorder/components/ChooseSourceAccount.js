/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint arrow-body-style: 0 */
/* eslint no-nested-ternary: 0 */

import React from 'react';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';


const useStyles = makeStyles(() => ({
  root: {
    flexGrow: 1,
  },

  textField: {
    width: "400px"
  },
  gridItem: {
    padding: 10
  }, 
  p: {
    fontSize: 14
  }
}));


const ChooseSourceAccount = props => {
  const classes = useStyles();
  const [loginAccountState, setLoginAccountState] = React.useState({
    supplier: '',
    supplier_country: '',
  });


  const handleSupplierSelect = e => {
    setLoginAccountState({
      ...loginAccountState,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Grid container>
        <Grid item xs={12}>
        <FormControl required className={classes.textField}>
            <InputLabel htmlFor="supplier">Choose a sourcing platform</InputLabel>
            <Select
            value={loginAccountState.supplier}
            onChange={handleSupplierSelect}
            inputProps={{
                name: 'supplier',
                id: 'supplier'
            }}
            fullWidth
            required
            >
            {/* <MenuItem value="ebay">Ebay</MenuItem> */}
            <MenuItem value="amazon">Amazon</MenuItem>
            </Select>
        </FormControl>
        </Grid>
        <Grid className={classes.gridItem} item xs={12}>

        {loginAccountState.supplier === 'amazon' ? (
        <FormControl required className={classes.textField}>
            <InputLabel htmlFor="supplier_country">Choose Amazon domain</InputLabel>
            <Select
            value={loginAccountState.supplier_country}
            onChange={handleSupplierSelect}
            inputProps={{
                name: 'supplier_country',
                id: 'supplier_country'
            }}
            fullWidth
            required
            >
            <MenuItem value="US">USA</MenuItem>
            <MenuItem value="UK">United Kingdom</MenuItem>
            </Select>
        </FormControl>
        ) : null}
        </Grid>

        {loginAccountState.supplier !== '' && loginAccountState.supplier_country !== '' ? (
        <Grid item className={classes.gridItem} xs={12}>
            <Button
            variant="contained"
            color="primary"
            style={{ marginTop: 20, width: 400, margin: 'auto' }}
            onClick={() => ipcRenderer.send('login-autoorder', loginAccountState )}
            >
            Login
            </Button>
        </Grid>
        ) : null}
    </Grid>
  );
};

export default ChooseSourceAccount;


               