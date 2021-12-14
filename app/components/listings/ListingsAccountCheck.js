/* eslint react/destructuring-assignment: 0 */
/* eslint react/prop-types: 0 */
/* eslint no-else-return: 0 */
/* eslint no-nested-ternary: 0 */

import React from 'react';
import { connect } from 'react-redux';
import { ipcRenderer, shell } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import ReportIcon from '@material-ui/icons/Report';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';

const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: 20,
    width: '60%',
    margin: 'auto',
    color: '#fff'
  },
  div: {
    padding: 20,
    backgroundColor: theme.palette.primary.main
  },
  divWarning: {
    backgroundColor: '#e7e7e7',
    border: '2px solid red',
    padding: 20
  },
  divSuccess: {
    backgroundColor: '#e7e7e7',
    border: '1px solid green',
    padding: 20
  },
  margin: {
    margin: theme.spacing(1)
  },
  h2: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 500
  },
  divWarningH2: {
    color: '#000',
    fontSize: 18,
  },
  p: {
    fontSize: 12,
    fontWeight: 700
  },
  divWarningP: {
    color: '#000',
    fontSize: 12
  },
  listingsNumberTracker: {
    fontSize: 14
  },
  listingsNumberTrackerWarning: {
    color: '#000',
    fontSize: 14
  },
  button: {
    margin: 10
  }
}));

const ListingsAccountCheck = props => {
  const classes = useStyles();
  const [listingsCount, setListingsCount] = React.useState(props.listingsInfo.total_listings);
  const [showAccountStatus, setShowAccountStatus] = React.useState(false);
  const [typeOfAccountStatusMessage, setTypeOfAccountStatusMessage] = React.useState('free-without-account');

  React.useEffect(() => {
    setShowAccountStatus(true);
    if (props.accountStatus.status === '0') {
      setTypeOfAccountStatusMessage('free-without-account');
    } else if (props.accountStatus.status === '1' || props.accountStatus.status === '3') {
      setTypeOfAccountStatusMessage('paid');
      // setTypeOfAccountStatusMessage('unpaid');
    } else if (props.accountStatus.status === '2') {
      setTypeOfAccountStatusMessage('unpaid');
    } 
  }, [props.accountStatus.status]);

  React.useEffect(() => {
    ipcRenderer.on('count-listings', (event, count) => {
      setListingsCount(count);
    });

    ipcRenderer.send('count-listings');

    // Cleanup the listener events so that memory leaks are avoided.
    return function cleanup() {
      ipcRenderer.removeAllListeners('count-listings');
    };
  }, []);

  if (!showAccountStatus) {
    return null;
  }

  if (typeOfAccountStatusMessage === 'free-without-account' && listingsCount > 100) {
    return (
      <Paper className={classes.root} elevation={2} data-testid="paper">
        <div className={classes.div}>
          <h2 className={classes.h2}>Free listings limit reached</h2>
          <p className={classes.p}>
            In order to gain the full benefits of Dalio sign-in or create an account at <a href="#" onClick={() => shell.openExternal('http://dalio.io/my-account')}>http://dalio.io/my-account</a>
          </p>
          
          {/* <p style={{ display: 'block', fontSize: 12, fontWeight: 600, paddingTop: 10 }}>{listingsCount >= 100 ? 'You have reached Dalio`s maximum listings count. The software will now work with only 100 of your listings.' : null}</p> */}

          {listingsCount > 100 ? (
            <React.Fragment>
            <p
              className={classes.listingsNumberTracker}
              style={{ fontWeight: 900 }}
              data-testid="free-listings-counter"
            >
              LISTINGS NOT BEING TRACKED: <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '38px', fontWeight: 900 }}><ReportProblemIcon style={{ color: 'red', fontSize: '38px' }} /> {props.toggleListingsWarning.count !== 0 && listingsCount <= 100 ? props.toggleListingsWarning.count : listingsCount <= 100 ? 0 : listingsCount - 100}/{listingsCount}</span>
            </p>
            </React.Fragment>
          ) : null}

        </div>
      </Paper>
    );
  } 

  // if ((typeOfAccountStatusMessage === 'free-without-account' && listingsCount <= 100 && props.toggleListingsWarning.count !== 0) || (typeOfAccountStatusMessage === 'paid' && props.toggleListingsWarning.count)) {
  //   return (
  //     <Paper className={classes.root} elevation={2} data-testid="paper">
  //       <div className={classes.div}>
  //         <h2 className={classes.h2}>Some of your listings cannot be tracked by Dalio</h2>
  //         <React.Fragment>
  //         <p
  //           className={classes.listingsNumberTracker}
  //           style={{ fontWeight: 900 }}
  //           data-testid="free-listings-counter"
  //         >
  //           LISTINGS NOT BEING TRACKED: <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '38px', fontWeight: 900 }}><ReportProblemIcon style={{ color: 'yellow', fontSize: '38px' }} /> {props.toggleListingsWarning.count}/{listingsCount}</span>
  //         </p>
  //         </React.Fragment>

  //       </div>
  //     </Paper>
  //   );
  // } 

  if (typeOfAccountStatusMessage === 'unpaid' && listingsCount > 100) {
    return (
      <Paper className={classes.root} elevation={1} data-testid="paper">
        <div className={classes.divWarning}>
          <ReportIcon style={{ color: 'red', fontSize: 52 }} />
          <h2 className={classes.divWarningH2}>You have an unpaid invoice</h2>
          <p className={classes.divWarningP}>
            Dalio will limit you to 100 listings. In order to gain the full benefits
            of Dalio please pay any outstanding invoices at <a href="#" style={{ color: '#000' }} onClick={() => shell.openExternal(props.accountStatus.payment_url)}>http://dalio.io</a>
          </p>
          
          {listingsCount > 100 ? (
              <React.Fragment>
              <p
                  className={classes.listingsNumberTracker}
                  style={{ fontWeight: 900, color: '#000' }}
                  data-testid="free-listings-counter"
              >
                  LISTINGS NOT BEING TRACKED: <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '38px', fontWeight: 900 }}><ReportProblemIcon style={{ color: 'orange', fontSize: '38px' }} /> {listingsCount <= 100 ? 0 : listingsCount - 100}/{listingsCount}</span>
              </p>
              </React.Fragment>
          ) : null}
        </div>
      </Paper>
    );
  }

  return null;
};

const mapStateToProps = state => ({
  ...state
});

export default connect(mapStateToProps)(ListingsAccountCheck);
