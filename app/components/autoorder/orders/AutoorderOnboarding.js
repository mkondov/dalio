/* eslint react/prop-types: 0 */
/* eslint arrow-body-style: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint eqeqeq: 0 */

import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import Icon from '@material-ui/core/Icon'
import CheckCircleIcon from '@material-ui/icons/CheckCircle';

import routes from '../../../constants/routes.json';

const useStyles = makeStyles(() => ({
  root: {
    width: '100%',
    maxWidth: '800px',
    margin: 'auto'
  }
}));

const stepperIconsStyles = makeStyles({
    root: {
      backgroundColor: '#ccc',
      zIndex: 1,
      color: '#fff',
      width: 50,
      height: 50,
      display: 'flex',
      borderRadius: '50%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    active: {
      background: 'orange',
      boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
    },
    completed: {
      background:
        'green',
    },
});

const getSteps = () => {
  return ['Sign in to an eBay account to sync your orders from', 'Sign in to an Amazon account to order products from'];
}

const stepperIcons = (props) => {
    const classes = stepperIconsStyles();
    const { active, completed } = props;
  
    const icons = {
      1: <Icon className="fab fa-ebay" style={{ width: 'initial' }} />,
      2: <Icon className="fab fa-amazon" style={{ width: 'initial' }} />,
    };
  
    return (
      <div
        className={clsx(classes.root, {
          [classes.active]: active,
          [classes.completed]: completed,
        })}
      >
        {icons[String(props.icon)]}
      </div>
    );
  }

const AutoorderOnboarding = (props) => {
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const steps = getSteps();

  const handleNext = () => {
    if (activeStep === 0) {
        props.history.push(routes.HOME);
    } else if (activeStep === 1) {
      props.handleTabChange(null, 1);
    }
  };

  React.useEffect(() => {
    if (props.loggedInEbay) {
        setActiveStep(1);
    }

    if (props.loggedInMarketplaces.length > 0) {
        setActiveStep(2);
    }
  }, [props.loggedInEbay, props.loggedInMarketplaces])

  return (
    <div className={classes.root}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel StepIconComponent={stepperIcons}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <div>
        <div>
          <div>
            {activeStep == 0 ? (
              <React.Fragment>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<Icon className="fab fa-ebay" style={{ width: 'initial' }} />}
                  onClick={handleNext}
                  >
                  Sign in to eBay
                </Button>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<Icon className="fab fa-amazon" style={{ width: 'initial' }} />}
                  onClick={handleNext}
                  disabled
                  >
                  Sign in to Amazon
                </Button>
              </React.Fragment>
            ) : (
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<CheckCircleIcon />}
                style={{ color: '#fff', backgroundColor: 'green', fontSize: '14px', border: 'none' }}
                >
                Signed in to eBay successfully
              </Button>,
              activeStep == 1 ? (
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<Icon className="fab fa-amazon" style={{ width: 'initial' }} />}
                  onClick={handleNext}
                  >
                  Sign in to Amazon
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<CheckCircleIcon />}
                  style={{ color: '#fff', backgroundColor: 'green', fontSize: '14px', border: 'none' }}
                  onClick={handleNext}
                  disabled={activeStep > 1 ? true : false}
                  >
                  Signed in to Amazon successfully
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const mapStateToProps = state => ({
    ...state
  });

export default compose(withRouter, connect(mapStateToProps))(AutoorderOnboarding);
