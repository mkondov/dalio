/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint arrow-body-style: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint jsx-a11y/click-events-have-key-events: 0 */
/* eslint jsx-a11y/no-noninteractive-element-interactions: 0 */

// @flow

import React from 'react';
import { ipcRenderer } from 'electron';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import LinearProgress from '@material-ui/core/LinearProgress';

import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import AttachMoneyIcon from '@material-ui/icons/AttachMoney';
import GiftcardIcon from '@material-ui/icons/CardGiftcard';
import CreditCardIcon from '@material-ui/icons/CreditCard';
import WarningIcon from '@material-ui/icons/Warning';
import AddNewAccountIcon from '@material-ui/icons/PersonAdd';

import type { Account } from '../../../types/AccountsTypes';

const useStyles = makeStyles(() => ({
  root: {
    flexGrow: 1,
  },
  containerMaxWidth: {
    width: "450px",
    margin: 'auto',
    marginTop: 10
  },
  textField: {
    width: "400px"
  },
  gridItem: {
    padding: 0
  }, 
  p: {
    fontSize: 12,
    textAlign: 'left'
  },
  pAlert: {
    fontSize: 14,
    "&:hover": {
      textDecoration: 'underline',
      cursor: 'pointer'
    }
  },
  cardsDiv: {
    display: 'flex', 
    justifyContent: 'flex-start', 
    alignItems: 'center'
  },
  cardIcons: {
    fontSize: 18, 
    marginRight: 5
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
  }
}));

type Props = {
  account: Account,
  amazonAutoorderPaymentMethodsFetchStatus: {
    value: boolean
  },
  removeAccountFromState: () => void,
  toggleAddNewSourceAccount: () => void
};

const DisplayAccounts = (props: Props) => {
  const classes = useStyles();
  const { account, removeAccountFromState, toggleAddNewSourceAccount } = props;
  const [cardsInfo, setCardsInfo] = React.useState([]);
  const [cardInfoIndex, setCardInfoIndex] = React.useState(0);
  const [cardNumber, setCardNumber] = React.useState('');
  const [showCardNumberError, setShowCardNumberError] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const [currencySymbol, setCurrencySymbol] = React.useState('$');

  const logout = (): void => {
    ipcRenderer.send('logout-amazon-autoorder', account);
    removeAccountFromState();
  }

  const handleCardNumberChange = (event: SyntheticEvent<>): void => {
    setShowCardNumberError(false);
    setCardNumber(event.target.value);
  };

  const handleDialogOpen = (cardIndex): void => {
    setCardInfoIndex(cardIndex);
    setCardNumber(cardsInfo[cardIndex].card_number);
    setDialogOpen(true);
  }

  const handleDialogClose = (): void => {
    setDialogOpen(false);
  }

  const saveCardNumber = (): void => {
    if (cardNumber !== '') {
      const allCardsArrayCopy = [...cardsInfo];
      allCardsArrayCopy[cardInfoIndex].card_number = cardNumber;
      handleDialogClose();
      ipcRenderer.send('save-amazon-credit-card-info', allCardsArrayCopy, account);
    } else {
      setShowCardNumberError(true);
    }
  }

  React.useEffect(() => {
    setCardsInfo([...account.settings.payment_methods.credit_cards]);

    if (account.country === 'UK') {
      setCurrencySymbol('£');
    } else if (account.country === 'DE' || account.country === 'IT' || account.country === 'FR' || account.country === 'ES') {
      setCurrencySymbol('€');
    }
  }, [account.settings]);

  return (
    
    <React.Fragment>
        <Grid container className={classes.containerMaxWidth} style={{ flexWrap: 'wrap' }}>
          <Grid item xs={12}>
            <div className={classes.cardsDiv} style={{ fontSize: '12px' }}><GiftcardIcon className={classes.cardIcons} /> Gift card balance: {account.settings.payment_methods.gift_card_balance === '' ? 'N/A' : `${currencySymbol}${account.settings.payment_methods.gift_card_balance}`}</div>
          </Grid>

          {cardsInfo.length === 0 ? (
            <Grid item xs={12}>
              <div className={classes.cardsDiv}><CreditCardIcon className={classes.cardIcons} />Credit cards: N/A
              </div>
            </Grid>
          ) : (

            cardsInfo.map((value, index) => {
              return <Grid item xs={12} key={value.display_name + value.expiry_date}>{value.card_number === "" ? (
                <div className={classes.flexColumn}>
                  <div className={classes.cardsDiv} style={{ color: '#f89e37' }}><CreditCardIcon className={classes.cardIcons} /> 
                    <p className={classes.pAlert} id={index} onClick={() => handleDialogOpen(index)}>{value.display_name} {value.number_tail} &nbsp;expires {value.expiry_date}</p> <WarningIcon style={{ color: 'red', fontSize: 16, marginLeft: 5 }} />
                  </div>
                  <p style={{ fontSize: 12, textAlign: 'left', marginTop: 0 }}>Please verify this credit card by entering the card number. It will be used to pass Amazon security checks during order.</p>
                </div>
               ) : (
                <div className={classes.cardsDiv}><CreditCardIcon className={classes.cardIcons} /> 
                  <p className={classes.p} id={index} onClick={() => handleDialogOpen(index)} style={{ cursor: 'pointer' }}>{value.display_name} {value.number_tail} &nbsp;expires {value.expiry_date} <span style={{ fontSize: 10, fontWeight: 900, color: 'green', border: '1px solid green', padding: 3 }}>VERIFIED</span></p>
                </div>
               )}
            </Grid>
            }))}

        </Grid>
        <Grid container style={{ marginTop: 20 }}>
          <Grid item className={classes.gridItem} xs={12}>
            <ButtonGroup>
              {!props.amazonAutoorderPaymentMethodsFetchStatus.value ? (
                <Button
                  variant="contained"
                  color="warning"
                  style={{ backgroundColor: '#f1f1f1', color: '#000', fontSize: 12 }}
                  startIcon={<AttachMoneyIcon />}
                  onClick={() => ipcRenderer.send('update-autoorder-account-payment-methods')}
                  >
                  Update payment methods`
                </Button>
              ) : (
                <Button
                  variant="contained"
                  style={{ fontSize: 12 }}
                  disabled
                  startIcon={<AttachMoneyIcon />}
                  >
                  Updating...
                </Button>

              )}
              <Button
                  variant="contained"
                  color="primary"
                  style={{ fontSize: 12 }}
                  startIcon={<AddNewAccountIcon />}
                  onClick={toggleAddNewSourceAccount}
                  >
                  Add new account
                </Button>
              <Button
                variant="outlined"
                style={{ marginTop: 20, margin: 'auto', border: '1px solid #ff0000', color: '#ff0000', fontSize: 12 }}
                onClick={() => logout()}
                >
                Logout
              </Button>
            </ButtonGroup>
          </Grid>
        </Grid>
    

        <Dialog open={dialogOpen} onClose={handleDialogClose} aria-labelledby="enter-credit-card-number">
        <DialogTitle id="form-dialog-title">Enter your card`s number</DialogTitle>
        <DialogContent>
          <DialogContentText>
            It will be used for payment verification required by Amazon
          </DialogContentText>
          {showCardNumberError ? (
            <TextField
              autoFocus
              error
              helperText="Please enter your card number"
              margin="dense"
              id="card-number"
              label="Card number"
              type="number"
              value={cardNumber}
              onChange={handleCardNumberChange}
              fullWidth
            />
          ) : (
            <TextField
              autoFocus
              margin="dense"
              id="card-number"
              label="Card number"
              type="number"
              value={cardNumber}
              onChange={handleCardNumberChange}
              fullWidth
            />
          )}
          
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={saveCardNumber} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
          
  );
};

const mapStateToProps = state => ({
  ...state
});

export default compose(
  withRouter,
  connect(mapStateToProps, {})
)(DisplayAccounts);
