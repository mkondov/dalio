/* eslint react/destructuring-assignment: 0 */
/* eslint react/prop-types: 0 */
/* eslint no-else-return: 0 */
/* eslint no-nested-ternary: 0 */

import React from 'react';
import { connect } from 'react-redux';
import { ipcRenderer, shell } from 'electron';
import { lighten, makeStyles, withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import LinearProgress from '@material-ui/core/LinearProgress';
import ReportIcon from '@material-ui/icons/Report';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';

const BorderLinearProgress = withStyles({
  root: {
    height: 10,
    backgroundColor: lighten('#32CD32', 1)
  },
  bar: {
    borderRadius: 20,
    backgroundColor: '#27ff0a'
  }
})(LinearProgress);

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

const AccountCheckModule = props => {
  const classes = useStyles();
  const [listingsCount, setListingsCount] = React.useState(0);
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

  if (typeOfAccountStatusMessage === 'free-without-account') {
    return (
      <Paper className={classes.root} elevation={2} data-testid="paper">
        <div className={classes.div}>
          <h2 className={classes.h2}>You are using Dalio`s free version.</h2>
          <p className={classes.p}>
            Dalio will always have a free version, however it will be limited to
            as many as 100 listings at a time. In order to gain the full benefits
            of Dalio sign-in or create an account at <a href="#" onClick={() => shell.openExternal('http://dalio.io/my-account')}>http://dalio.io/my-account</a>
          </p>
          <p
            className={classes.listingsNumberTracker}
            data-testid="free-listings-counter"
          >
            Free listings: {listingsCount >= 100 ? 100 : listingsCount}/100
          </p>
          <BorderLinearProgress
            className={classes.margin}
            variant="determinate"
            style={{ borderRadius: 10 }}
            color="secondary"
            value={listingsCount >= 100 ? 100 : listingsCount}
            data-testid="border-linear-progress"
          />
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
          ) : props.toggleListingsWarning.count !== 0 ? (
            <React.Fragment>
              <p
                className={classes.listingsNumberTracker}
                style={{ fontWeight: 900 }}
                data-testid="free-listings-counter"
              >
                LISTINGS NOT BEING TRACKED: <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '38px', fontWeight: 900 }}><ReportProblemIcon style={{ color: 'red', fontSize: '38px' }} /> {props.toggleListingsWarning.count}/{props.listingsInfo.total_listings}</span>
              </p>
            </React.Fragment>
          ) : null}

        </div>
      </Paper>
    );
  } else if (typeOfAccountStatusMessage === 'paid') {
    return (
      <Paper className={classes.root} elevation={2} data-testid="paper">
        <div className={classes.divSuccess}>
          <VerifiedUserIcon style={{ color: 'green', fontSize: 52 }} />
          <h2 className={classes.divWarningH2}>You are all set!</h2>
          <p className={classes.divWarningP}>
            Remember - your first 100 listings are free. You only pay for the listings on top of your first 100.
          </p>
          <p
            className={classes.listingsNumberTrackerWarning}
            data-testid="free-listings-counter"
          >
            Free listings: {listingsCount >= 100 ? 100 : listingsCount}/100
          </p>
          <BorderLinearProgress
            className={classes.margin}
            variant="determinate"
            style={{ borderRadius: 10 }}
            color="secondary"
            value={listingsCount >= 100 ? 100 : listingsCount}
            data-testid="border-linear-progress"
          />

          {listingsCount > 100 ? (
            <React.Fragment>
            <p
                className={classes.listingsNumberTracker}
                style={{ fontWeight: 900, color: '#000' }}
                data-testid="free-listings-counter"
            >
                Listings you pay for: <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '38px', fontWeight: 900 }}>{listingsCount <= 100 ? 0 : listingsCount - 100}/{listingsCount}</span>
            </p>
            </React.Fragment>
          ) : null}

          {props.toggleListingsWarning.count !== 0 ? (
            <React.Fragment>
              <p
                className={classes.listingsNumberTracker}
                style={{ fontWeight: 900, color: '#000' }}
                data-testid="free-listings-counter"
              >
                LISTINGS NOT BEING TRACKED: <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '38px', fontWeight: 900 }}><ReportProblemIcon style={{ color: 'red', fontSize: '38px' }} /> {props.toggleListingsWarning.count}/{props.listingsInfo.total_listings}</span>
              </p>
            </React.Fragment>
          ) : null}
        </div>
      </Paper>
    );
  }

  return (
    <Paper className={classes.root} elevation={1} data-testid="paper">
      <div className={classes.divWarning}>
        <ReportIcon style={{ color: 'red', fontSize: 52 }} />
        <h2 className={classes.divWarningH2}>You have an unpaid invoice</h2>
        <p className={classes.divWarningP}>
          Dalio will limit you to 100 listings. In order to gain the full benefits
          of Dalio please pay any outstanding invoices at <a href="#" style={{ color: '#000' }} onClick={() => shell.openExternal(props.accountStatus.payment_url)}>PAY HERE</a>
        </p>
        <p
          className={classes.listingsNumberTrackerWarning}
          data-testid="free-listings-counter"
        >
          Free listings: {listingsCount >= 100 ? 100 : listingsCount}/100
        </p>
        <BorderLinearProgress
          className={classes.margin}
          variant="determinate"
          style={{ borderRadius: 10 }}
          color="secondary"
          value={listingsCount >= 100 ? 100 : listingsCount}
          data-testid="border-linear-progress"
        />
        
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

};

const mapStateToProps = state => ({
  ...state
});

export default connect(mapStateToProps)(AccountCheckModule);
