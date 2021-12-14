/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint arrow-body-style: 0 */

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { ipcRenderer, shell } from 'electron';
import { withRouter } from 'react-router-dom';
import { store } from 'react-notifications-component';

import Button from '@material-ui/core/Button';
import Backdrop from '@material-ui/core/Backdrop';
import SpeedDial from '@material-ui/lab/SpeedDial';
import SpeedDialIcon from '@material-ui/icons/DragIndicator';
import SpeedDialAction from '@material-ui/lab/SpeedDialAction';
import FileCopyIcon from '@material-ui/icons/FileCopyOutlined';
import SaveIcon from '@material-ui/icons/Save';
import PrintIcon from '@material-ui/icons/Print';
import ShareIcon from '@material-ui/icons/Share';
import FavoriteIcon from '@material-ui/icons/Favorite';
import ContactSupportIcon from '@material-ui/icons/AssignmentLate';
import TutorialsIcon from '@material-ui/icons/MenuBook';
import AddListingIcon from '@material-ui/icons/AddCircle';

import routes from '../../constants/routes.json';

const useStyles = makeStyles((theme) => ({
  speedDial: {
    position: 'fixed',
    bottom: 40,
    right: theme.spacing(2),
  },
}));

const dashboardActions = [
  { icon: <ContactSupportIcon />, name: `Send error logs`, type: 'send-user-data' },
  { icon: <TutorialsIcon />, name: `View tutorials and documentation`, type: 'view-documentation' },
];

const listingsActions = [
  { icon: <ContactSupportIcon />, name: 'Send error logs', type: 'send-user-data' },
  { icon: <TutorialsIcon />, name: `View tutorials and documentation`, type: 'view-documentation' },
  { icon: <AddListingIcon />, name: 'Add listing', type: 'add-listing' },
];

const SpeedDialActions = (props) => {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const [actionsState, setActionsState] = React.useState([...dashboardActions]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const speedActions = type => {
    if (type === 'send-user-data') {
      sendUserData();
    } else if (type === 'add-listing') {
      props.history.push({
        pathname: routes.ADD_LISTING,
        state: {
          referrer: 'listings_page'
        }
      });
    } else if (type === 'view-documentation') {
      shell.openExternal('https://dalio.io/how-to-install');
    }

    setOpen(false);
  };

  const sendUserData = async () => {
    ipcRenderer.send('send-user-data');
    store.addNotification({
      title: "Thank you!",
      message: "Your error logs have been sent to Dalio`s developers.",
      type: "info",
      insert: "bottom",
      container: "bottom-right",
      animationIn: ["animated", "fadeIn"],
      animationOut: ["animated", "fadeOut"],
      dismiss: {
        duration: 5000,
        onScreen: true
      }
    });
  }

  React.useEffect(() => {
    const { pathname } = props.history.location;

    if (pathname === '/') {
      setActionsState([...dashboardActions]);
    } else if (pathname === '/listings') {
      setActionsState([...listingsActions]);
    }
  }, []);

  return (
    <div>
      <Backdrop style={{ zIndex: 10 }} open={open} />
      <SpeedDial
        ariaLabel="SpeedDial tooltip example"
        className={classes.speedDial}
        hidden={hidden}
        icon={<SpeedDialIcon />}
        onClose={handleClose}
        onOpen={handleOpen}
        open={open}
      >
        {actionsState.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            style={{ staticTooltip: { width: 300 }}}
            tooltipOpen
            onClick={() => speedActions(action.type)}
          />
        ))}
      </SpeedDial>
    </div>
  );
};

export default withRouter(SpeedDialActions);
