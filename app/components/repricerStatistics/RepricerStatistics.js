/* eslint camelcase: 0 */
/* eslint radix: 0 */

import React from 'react';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import { LineChart } from 'react-chartkick';
import 'chart.js';

const useStyles = makeStyles(() => ({
  div: {
    width: '80%',
    margin: 'auto',
    marginTop: 100
  },
  p: {
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 16
  }
}));

const RepricerStatistics = () => {
  const classes = useStyles();

  const [state, setState] = React.useState([]);
  const total_reprices = {};
  const total_listings = {};

  React.useEffect(() => {
    ipcRenderer.on('get-repricer-stats', (event, stats) => {
      stats.forEach(stat => {
        total_reprices[stat.created_at] = parseInt(stat.total_reprices);
        total_listings[stat.created_at] = stat.total_listings;
      });
      const totalRepricesObject = {
        name: 'Total Reprices',
        data: total_reprices
      };

      const totalListingsObject = {
        name: 'Total Listings',
        data: total_listings
      };
      const arr = [];
      arr.push(totalRepricesObject);
      arr.push(totalListingsObject);
      setState(arr);
    });

    ipcRenderer.send('get-repricer-stats');

    // Cleanup the listener events so that memory leaks are avoided.
    return function cleanup() {
      ipcRenderer.removeAllListeners('get-repricer-stats');
    };
  }, []);

  return (
    <div className={classes.div}>
      {state.length === 0 && (
        <p className={classes.p}>
          You have no data to display yet. Keep using Dalio and come back later.
        </p>
      )}
      <LineChart data={state} />
    </div>
  );
};

export default RepricerStatistics;
