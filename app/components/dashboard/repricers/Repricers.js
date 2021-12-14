/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint arrow-body-style: 0 */

import React from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import AmazonDashboardModule from './amazon/AmazonDashboardModule';
import EbayDashboardModule from './ebay/EbayDashboardModule';

const useStyles = makeStyles(theme => ({
  paper: {
    width: '60%',
    margin: 'auto',
    padding: '10px'
  }
}));

const Repricers = () => {
  const classes: Object = useStyles();

  return (
    <Paper elevation={0} className={classes.paper}>
      <EbayDashboardModule />
      {/* <AmazonDashboardModule /> */}
    </Paper>
  );
};

export default Repricers;
