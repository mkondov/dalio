/* eslint camelcase: 0 */
/* eslint object-shorthand: 0 */

import React from 'react';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ErrorIcon from '@material-ui/icons/Error';
import CheckIcon from '@material-ui/icons/Done';
import DeleteIcon from '@material-ui/icons/Clear';

const useStyles = makeStyles(theme => ({
  root: {
    width: '60%',
    margin: 'auto',
    marginTop: 20,
    marginBottom: 20,
    padding: 20
    // backgroundColor: '#F5F5F5'
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: 800,
    paddingLeft: 10
  },
  h2: {
    fontSize: 22
  },
  p: {
    fontSize: 16
  },
  checkIcon: {
    color: '#32CD32'
  },
  errorIcon: {
    color: '#ffa500'
  }
}));

const Onboarding = () => {
  const classes = useStyles();

  const [onboardingShow, setOnboardingShow] = React.useState(false);
  const [onboardingSignInAmazon, setOnboardingSignInAmazon] = React.useState(false);
  const [onboardingSignInEbay, setOnboardingSignInEbay] = React.useState(false);
  const [onboardingAddFirstListing, setOnboardingAddFirstListing] = React.useState(false);

  const stopOnboarding = () => {
    setOnboardingShow(false);

    ipcRenderer.send('onboarding', {
      action: 'change-settings',
      settings: { show: false }
    });
  };

  React.useEffect(() => {
    ipcRenderer.on('onboarding', (event, settings) => {
      const { show, sign_in_amazon, sign_in_ebay, add_first_listing } = settings;
      if (show !== undefined) {
        setOnboardingShow(show);
      }
      
      if (sign_in_amazon !== undefined) {
        setOnboardingSignInAmazon(sign_in_amazon);

      }

      if (sign_in_ebay !== undefined) {
        setOnboardingSignInEbay(sign_in_ebay);
      }

      if (add_first_listing !== undefined) {
        setOnboardingAddFirstListing(add_first_listing);
      }
    });

    ipcRenderer.on('check-amazon-login', (event, marketplaces) => {
      if (
        (marketplaces.US === false || marketplaces.US === null) &&
        (marketplaces.CA === false || marketplaces.CA === null) &&
        (marketplaces.UK === false || marketplaces.UK === null) &&
        (marketplaces.DE === false || marketplaces.DE === null) &&
        (marketplaces.FR === false || marketplaces.FR === null) &&
        (marketplaces.IT === false || marketplaces.IT === null) &&
        (marketplaces.ES === false || marketplaces.ES === null)
      ) {
        setOnboardingSignInAmazon(false);
      } else {
        setOnboardingSignInAmazon(true);
      }
    });

    ipcRenderer.on('check-ebay-login', (event, marketplaces) => {
      if (
        (marketplaces.US !== undefined && marketplaces.US !== false) ||
        (marketplaces.UK !== undefined && marketplaces.UK !== false) ||
        (marketplaces.DE !== undefined && marketplaces.DE !== false) ||
        (marketplaces.CA !== undefined && marketplaces.CA !== false) ||
        (marketplaces.IT !== undefined && marketplaces.IT !== false)
        ) {
        setOnboardingSignInEbay(true);
      } else {
        setOnboardingSignInEbay(false);
      }
    });

    ipcRenderer.send('onboarding', { action: 'get-settings' });

    // Specify how to clean up after this effect:
    return function cleanup() {
      ipcRenderer.removeAllListeners('onboarding');
      ipcRenderer.removeAllListeners('check-amazon-login');
      ipcRenderer.removeAllListeners('check-ebay-login');
    };
  }, []);

  if (onboardingShow) {
    return (
      <Paper className={classes.root} elevation={0}>
        <Grid container spacing={0}>
          <Grid item xs={11}>
            <h2 className={classes.h2}>What to do now?</h2>
          </Grid>
          <Grid item xs={1}>
            <Tooltip disableFocusListener title="Don`t show me again">
              <IconButton
                style={{ padding: 7 }}
                aria-label="Dalio onboarding"
                onClick={() => stopOnboarding()}
              >
                <DeleteIcon style={{ color: '#ff0000' }} fontSize="small" />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>

        <p className={classes.p}>
          Congratulations! You have taken your first step into automating your
          e-commerce business.
        </p>
        <Accordion elevation={0}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            {onboardingSignInAmazon || onboardingSignInEbay ? (
              <CheckIcon className={classes.checkIcon} />
            ) : (
              <ErrorIcon className={classes.errorIcon} />
            )}
            <Typography className={classes.heading}>
              Sign in with your Ebay account
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              In order to sign-in, click on an Ebay icon below. A browser will open and navigate you to a sign-in page. You just need to enter your username and password, click &apos;Remember me&apos; and then go through your 2FA (Two Factor Authenticaton) process (if available). That`s it. Dalio will be able to sign into your Ebay accounts and automate everything for you.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion elevation={0}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel2a-content"
            id="panel2a-header"
          >
            {onboardingAddFirstListing ? (
              <CheckIcon className={classes.checkIcon} />
            ) : (
              <ErrorIcon className={classes.errorIcon} />
            )}
            <Typography className={classes.heading}>
              Add a listing in your &apos;Listings&apos; tab.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Dalio is designed to do the dirty work for you. In order to do
              that, you will need to provide it with at least one listing, so
              the software can work its magic.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Paper>
    );
  }
  return null;
};

export default Onboarding;
