/* eslint react/destructuring-assignment: 0 */
/* eslint no-shadow: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/jsx-boolean-value: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint eqeqeq: 0 */
/* eslint arrow-body-style: 0 */
/* eslint object-shorthand: 0 */
/* eslint react/no-array-index-key: 0 */
// @flow

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Modal from '@material-ui/core/Modal';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import Divider from '@material-ui/core/Divider';

import ErrorIcon from '@material-ui/icons/Error';
import CheckIcon from '@material-ui/icons/CheckCircle';
import WarnIcon from '@material-ui/icons/Update';

const useStyles = makeStyles(() => ({
  modal: {
    position: 'absolute',
    width: 600,
    height: 500,
    overflowY: 'auto',
    margin: 'auto',
    color: '#000',
    backgroundColor: '#f5f5f5',
    boxShadow: '0px 2px 5px rgba(0,0,0,0.5)',
    border: '1px solid #fff',
    padding: '20px 30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start'
  },
  listItem: {
    paddingLeft: '0px'
  },
  orderLogH2: {
    fontSize: '16px',
    textAlign: 'center'
  },
  primaryListItemText: {
    fontSize: '14px'
  },
  secondaryListItemText: {
    fontSize: '10px',
    fontWeight: 900
  },
  listItemAvatarRoot: {
    minWidth: '40px'
  },
  avatarRoot: {
    backgroundColor: 'transparent',
    width: '30px', 
    height: '30px',
  },
}));

const OrderLogs = (props) => { 
    const classes = useStyles();

    return (
        <React.Fragment>
            {props.order !== undefined ? (
                <Modal
                    aria-labelledby="order-logs-modal"
                    aria-describedby="order-logs-modal"
                    className={classes.modal}
                    BackdropProps={{ invisible: true }}
                    disableAutoFocus
                    disableEnforceFocus
                    open={props.open}
                    onClose={props.closeModal}
                >
                    <Grid container>
                        <Grid item xs={12}>
                        <h2 className={classes.orderLogH2}>Order logs</h2>
                        {props.order.logs !== null && props.order.logs !== '' ? (
                            <List dense>
                                {props.order.logs.slice(0).reverse().map((value, index) => {
                                    return (
                                        <React.Fragment>
                                            <ListItem key={`log-${index}`} className={classes.listItem}>
                                                <ListItemAvatar classes={{ root: classes.listItemAvatarRoot }}>
                                                    {value.level === 'error' ? (
                                                        <Avatar classes={{ root: classes.avatarRoot }} style={{ color: '#ff0000' }}>
                                                        <ErrorIcon />
                                                        </Avatar>
                                                    ) : value.level === 'warn' ? (
                                                        <Avatar classes={{ root: classes.avatarRoot }} style={{ color: '#ffa500' }}>
                                                        <WarnIcon />
                                                        </Avatar>
                                                    ) : (
                                                        <Avatar classes={{ root: classes.avatarRoot }} style={{ color: '#32CD32' }}>
                                                        <CheckIcon />
                                                        </Avatar>
                                                    )}
                                                </ListItemAvatar>
                                                <ListItemText 
                                                classes={{ 
                                                    primary: classes.primaryListItemText,
                                                    secondary: classes.secondaryListItemText
                                                }} 
                                                primary={decodeURI(value.log)} 
                                                secondary={value.time}
                                                />
                                            </ListItem>
                                            <Divider key={`divider-${index}`} />
                                        </React.Fragment>
                                    );
                                })}
                            </List>
                        ) : <p style={{ textAlign: 'center', fontSize: '14px' }}>This order has no logs yet.</p>}
                        
                        </Grid>
                    </Grid>
                </Modal>
            ) : null}
        </React.Fragment>
    );
};

export default OrderLogs;
