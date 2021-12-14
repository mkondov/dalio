/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */

import React from 'react';
// import { makeStyles } from '@material-ui/core/styles';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import IconButton from '@material-ui/core/IconButton';
import AccountCircle from '@material-ui/icons/AccountCircle';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import Avatar from '@material-ui/core/Avatar';
import Tooltip from '@material-ui/core/Tooltip';

// import { setAccountStatus } from '../../actions/accountStatusAction';

// const useStyles = makeStyles(theme => ({
//     root: {
//       flexGrow: 1,
//     },
//     menuButton: {
//       marginRight: theme.spacing(2),
//     },
//     title: {
//       flexGrow: 1,
//     },
// }));

const AccountModule = props => {
  // const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleMenu = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const account = () => {
    props.history.push('/login');
  };

  React.useEffect(() => {
    ipcRenderer.send('get-dalio-account-status');
  }, []);

  return (
    <div>
      {props.accountStatus.email !== undefined && props.accountStatus.email !== null && props.accountStatus.email !== '' ? (
        <Tooltip title={props.accountStatus.email}>
          <Avatar style={{ cursor: 'pointer', background: '#fff', color: '#d5008d' }} onClick={handleMenu}>{props.accountStatus.email[0].toUpperCase()}</Avatar>
        </Tooltip>
      ):(
        <IconButton
          aria-label="Account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenu}
          style={{ color: '#fff' }}
        >
          <AccountCircle />
        </IconButton>
      )}
      
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        open={open}
        onClose={handleClose}
      >
        {props.accountStatus.status !== '0' && props.accountStatus.email !== null && props.accountStatus.email !== '' ? (
          <div>
            {/* <MenuItem onClick={account}>My account</MenuItem> */}
            <MenuItem style={{ paddingLeft: 10, paddingRight: 10}} onClick={() => ipcRenderer.send('logout-dalio')}>
              Log Out
            </MenuItem>
          </div>
        ) : (
          <MenuItem style={{ paddingLeft: 10, paddingRight: 10}} onClick={account}>Login</MenuItem>
        )}
      </Menu>
    </div>
  );
};

const mapStateToProps = state => ({
  ...state
});

export default compose(
  withRouter,
  connect(mapStateToProps)
)(AccountModule);
