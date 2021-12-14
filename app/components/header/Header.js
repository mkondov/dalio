/* eslint no-nested-ternary: 0 */
/* eslint react/prop-types: 0 */
/* eslint no-unused-vars: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint eqeqeq: 0 */

import React from 'react';
import { ipcRenderer, shell } from 'electron';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import { makeStyles, withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Badge from '@material-ui/core/Badge';

// Icons
import ListingsIcon from '@material-ui/icons/Assignment';
import ListingsWarningIcon from '@material-ui/icons/AssignmentLate';
import DashboardIcon from '@material-ui/icons/Dashboard';
import AutoorderIcon from '@material-ui/icons/Shop';
import LogsIcon from '@material-ui/icons/List';
import ChartIcon from '@material-ui/icons/ShowChart';

// Modules
import OfflineDetector from './ОfflineDetector';
import AccountModule from '../auth/AccountModule';
import routes from '../../constants/routes.json';
import ProxyAuthenticationModal from '../auth/ProxyAuthenticationModal';
import AccountSettings from './AccountSettings';
import ActionTracker from './ActionTracker';

const useStyles = makeStyles(() => ({
  toolbar: {
    display: 'flex',
    justifyContent: 'center'
  },
  button: {
    fontSize: 12,
    color: '#fff'
  },
  buttonWhatsNew: {
    textTransform: 'none',
    color: '#fff',
    fontSize: 12
  },
  title: {
    flexGrow: 1
  },
  updateBar: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#32CD32',
    color: '#fff',
    padding: 0,
    fontWeight: 900
  },
  updateBarText: {
    fontSize: 12
  },
  accountModule: {
    marginLeft: 'auto'
  }
}));

const StyledBadgeBeta = withStyles((theme) => ({
  badge: {
    right: 8,
    top: 13,
    background: '#fff',
    color: '#000',
    fontSize: 11,
    width: 40,
    padding: '1px 3px',
    height: 16
  },
}))(Badge);

const StyledBadge = withStyles((theme) => ({
  badge: {
    right: 8,
    top: 13,
    background: '#fff',
    color: '#000',
    fontSize: 11,
    width: 16,
    height: 16,
    padding: '0px',
  },
}))(Badge);

const Header = props => {
  const classes = useStyles();
  const { appUpdateStatus } = props;

  const openChangelog = () => {
    shell.openExternal('https://dalio.io/changelog');
  };

  return (
    <div>
      <AppBar elevation={1} style={{ background: '#d5008d' }} position="fixed">
        <Toolbar className={classes.toolbar}>
          <AccountSettings />
          <ActionTracker />

          <div style={{ margin: 'auto', display: 'flex', flexDirection: 'row' }}>
            <Tooltip disableFocusListener title="Dashboard">
              <Link to={routes.HOME}>
                <IconButton
                  aria-label="Repricer Dashboard"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  color="inherit"
                >
                  <DashboardIcon />
                </IconButton>
              </Link>
            </Tooltip>

            {/* {props.allowTestFeatures.value ? ( */}
              <Tooltip disableFocusListener title={props.toggleOrdersWarning.value ? `${props.toggleOrdersWarning.count} orders cannot be ordered` : 'Order fulfillment'}>
                <Link to={routes.AUTOORDER}>

                  {props.toggleOrdersWarning.count == 0 ? (
                    <StyledBadgeBeta badgeContent="BETA" color="primary">
                    <IconButton
                      aria-label="Orders of current user"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      color="inherit"
                    >
                      <AutoorderIcon />
                    </IconButton>
                  </StyledBadgeBeta>
                  ) : (
                    <StyledBadge badgeContent={props.toggleOrdersWarning.count} color="primary">
                    <IconButton
                      aria-label="Orders of current user"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      color="inherit"
                    >
                      {props.toggleOrdersWarning.value ? <AutoorderIcon style={{ color: 'yellow' }}/> : <AutoorderIcon />}
                    </IconButton>
                  </StyledBadge>
                  )}
                </Link>
              </Tooltip>
            {/* ) : null} */}
            
            <Tooltip disableFocusListener title={props.toggleListingsWarning.value ? `${props.toggleListingsWarning.count} listings require action` : 'Listings'}>
              <Link to={routes.LISTINGS}>
                <StyledBadge badgeContent={props.toggleListingsWarning.count} color="primary">
                  <IconButton
                    aria-label="Listings of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    color="inherit"
                  >
                    {props.toggleListingsWarning.value ? <ListingsWarningIcon style={{ color: 'yellow' }}/> : <ListingsIcon />}
                  </IconButton>
                </StyledBadge>
              </Link>
            </Tooltip>

            <Tooltip disableFocusListener title="Logs">
              <Link to={routes.LOGS}>
                <IconButton
                  aria-label="Logs for current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  color="inherit"
                >
                  <LogsIcon />
                </IconButton>
              </Link>
            </Tooltip>
            {/* <Tooltip disableFocusListener title="Repricer Statistics">
              <Link to={routes.REPRICER_STATISTICS}>
                <IconButton
                  aria-label="Repricer Statistics"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  color="inherit"
                >
                  <ChartIcon />
                </IconButton>
              </Link>
            </Tooltip> */}
          </div>
          <AccountModule className={classes.accountModule} />
        </Toolbar>
        {appUpdateStatus.value && (
          <div className={classes.updateBar}>
            <p className={classes.updateBarText}>
              There is a new update for your app!
            </p>
            <Button
              size="small"
              className={classes.button}
              onClick={() => ipcRenderer.send('update-app')}
            >
              Update now
            </Button>
            <p style={{ marginBottom: 0, marginTop: 7 }}>|</p>
            <Button
              size="small"
              disableRipple
              className={classes.buttonWhatsNew}
              onClick={() => openChangelog()}
            >
              What`s new?
            </Button>
          </div>
        )}
        <OfflineDetector />
        <ProxyAuthenticationModal />
      </AppBar>
    </div>
  );
};

const mapStateToProps = state => ({
  ...state
});

export default connect(mapStateToProps)(Header);
