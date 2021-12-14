/* eslint react/prop-types: 0 */
/* eslint radix: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint eqeqeq: 0 */
/* eslint no-nested-ternary: 0 */

import React from 'react';
import { ipcRenderer } from 'electron';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import { store } from 'react-notifications-component';

import clsx from 'clsx';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Modal from '@material-ui/core/Modal';
import Icon from '@material-ui/core/Icon'
import StepConnector from '@material-ui/core/StepConnector';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';

import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';

import EditOrder from './EditOrder';

const ColorlibConnector = withStyles({
  alternativeLabel: {
    top: 22,
  },
  active: {
    '& $line': {
      backgroundImage: 'linear-gradient( 95deg,green 0%,orange 50%,orange 100%)',
    },
  },
  completed: {
    '& $line': {
      background: 'green',
    },
  },
  line: {
    height: 3,
    border: 0,
    backgroundColor: '#eaeaf0',
    borderRadius: 1,
  },
})(StepConnector);

const useColorlibStepIconStyles = makeStyles({
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

function ColorlibStepIcon(props) {
  const classes = useColorlibStepIconStyles();
  const { active, completed } = props;

  const icons = {
    1: <Icon className="fab fa-amazon" />,
    2: <Icon className="fab fa-ebay" style={{ width: 'initial' }} />,
    3: <Icon className="fas fa-shipping-fast" style={{ width: 'initial' }} />,
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

const useStyles = makeStyles((theme) => ({
  root: {
  },
  button: {
    fontSize: '12px',
    border: `1px solid ${theme.palette.primary.main}`
  },
  instructions: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  fullWidthDiv: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', 
    justifyContent: 'center',
    paddingBottom: '20px'
  },
  modal: {
    position: 'absolute',
    overflowY: 'auto',
    margin: 'auto',
    color: '#000',
    backgroundColor: '#fff',
    boxShadow: '0px 2px 5px rgba(0,0,0,0.5)',
    border: '1px solid #fff',
    padding: '20px 30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  backdrop: {
    zIndex: 1000
  }
}));

function getSteps(order) {
  const sourceOrderStatus = order.source_order_status == null && order.status_code == '0' ? 'Order from Amazon' : order.source_order_status == null && order.status_code != '0' && order.tracking_number === null ? 'Ordered from Amazon. Tracking number pending...' : order.source_order_status !== null ? order.source_order_status : null;
  
  const sourceOrderTracking = order.tracking_number !== null && order.source_order_carrier !== null ? `Dispatched by ${order.source_order_carrier.toUpperCase()} - ${order.tracking_number}` : '';

  const proxyTrackingNumber = order.proxy_tracking_number !== null ? `BCE Tracking: ${order.proxy_tracking_number}` : '';


  // `Order from Amazon - ${order.tracking_number !== null ? (
  //   `${order.source_order_carrier} - ${order.tracking_number}`
  // ) : null}`, 


  return [
  <p style={{ fontSize: 14 }}>{sourceOrderStatus} <br/> {sourceOrderTracking} <br/> {proxyTrackingNumber}</p>,
    'Mark as shipped on eBay'
  ];
}

export default function OrderProgress(props) {
  const classes = useStyles();

  const { order, loggedInMarketplaces, localizedMarketplaces, allAccounts, trackingFunds } = props;

  // eslint-disable-next-line
  const [activeStep, setActiveStep] = React.useState(parseInt(props.order.status_code));
  const steps = getSteps(order);

  // eslint-disable-next-line
  const [editOrderStep, setEditOrderStep] = React.useState(false);
  
  const [modalOpen, setModalOpen] = React.useState(false);

  const [windowSize, setWindowSize] = React.useState({
    width: 1200,
    height: 690
  });

  const [convertingTracking, setConvertingTracking] = React.useState(false);

  const markAsShippedNoTracking = () => {
    ipcRenderer.send('mark-ebay-orders-as-dispatched', [JSON.parse(JSON.stringify(props.order))], 'without-tracking');
    store.addNotification({
      title: "Marking as shipped added to queue",
      message: `Marking as shipped order ${order.order_number} has been added to the upload queue.`,
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

  const orderFromAmazon = () => {
    setModalOpen(true);
  }

  const closeModal = () => {
    setModalOpen(false);
    setEditOrderStep(false);
  }

  const convertSingleTracking = () => {
    ipcRenderer.send('send-single-tracking-to-bce', JSON.parse(JSON.stringify(order)));
    setConvertingTracking(true);
  }

  const uploadSingleTracking = () => {
    ipcRenderer.send('upload-single-tracking', JSON.parse(JSON.stringify(order)));

    store.addNotification({
      title: "Tracking upload added to queue",
      message: `Tracking upload for order number ${order.order_number} has been added to the upload queue.`,
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
    window.addEventListener('resize', e => {
      e.preventDefault();
      setWindowSize({ width: e.target.innerWidth, height: e.target.innerHeight })
    });

    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  }, []);

  return (
    <div className={classes.root} style={{ width: windowSize.width }}>
      <Stepper alternativeLabel activeStep={activeStep} connector={<ColorlibConnector />}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <div>
        <div className={classes.fullWidthDiv}>
          {/* <Typography className={classes.instructions}>{getStepContent(activeStep)}</Typography> */}
          <div>
            <ButtonGroup variant="text" color="primary" aria-label="contained primary button group">

              {activeStep == 0 ? (
                order.being_ordered_at_source == '0' ? (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Icon className="fab fa-amazon" />}
                    onClick={orderFromAmazon}
                    className={classes.button}
                  >
                    Order from Amazon
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="default"
                    startIcon={<Icon className="fab fa-amazon" />}
                    className={classes.button}
                    disabled
                  >
                    Ordering... <CircularProgress size={20} style={{ marginLeft: '5px' }} /> 
                  </Button>
                )
              ) : (
                <Button
                  startIcon={<CheckCircleIcon />}
                  style={{ color: '#fff', backgroundColor: 'green', fontSize: '12px' }}
                  disabled
                >
                  Ordered
                </Button>
              )}



              {activeStep == 0 ? (
                <Button
                  variant="outlined"
                  color="default"
                  startIcon={<Icon className="fab fa-ebay" style={{ width: 'initial' }} />}
                  className={classes.button}
                  disabled
                >
                  Mark as shipped (no tracking)
                </Button>
              ) : activeStep == 1 && order.tracking_uploaded == '0' ? (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Icon className="fab fa-ebay" style={{ width: 'initial' }} />}
                  onClick={markAsShippedNoTracking}
                  className={classes.button}
                  disabled={order.being_marked_as_shipped == '1'}
                >
                  Mark as shipped (no tracking)
                </Button>
              ) : (
                <Button
                  startIcon={<CheckCircleIcon />}
                  style={{ color: '#fff', backgroundColor: 'green', fontSize: '12px' }}
                  disabled
                >
                  Marked as shipped
                </Button>
              )}


              {activeStep > 0 && order.tracking_number !== null && order.source_order_carrier !== null && order.proxy_tracking_number === null && order.source_order_html !== null ? (
                convertingTracking ? (
                  <Button
                    variant="outlined"
                    startIcon={<Icon className="fas fa-shipping-fast" style={{ width: 'initial' }} />}
                    className={classes.button}
                  >
                  Converting... <CircularProgress size={20} />
                  </Button>
                ) : (
                  trackingFunds >= 0.04 ? (
                    <Button
                    variant="contained"
                    startIcon={<Icon className="fas fa-shipping-fast" style={{ width: 'initial' }} />}
                    onClick={convertSingleTracking} 
                    className={classes.button}
                    disabled={order.status_code == '3'}
                  >
                    Convert source tracking to BCE tracking
                  </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<ReportProblemIcon />}
                      style={{ border: '1px solid #ff0000', color: '#ff0000' }}
                      className={classes.button}
                    >
                      Convert source tracking to BCE tracking (insufficient funds)
                    </Button>

                  )
                  
                )
              ) : activeStep == 0 || order.tracking_number === null || order.source_order_carrier === null || order.source_order_html === null ? (
                <Button
                  variant="outlined"
                  color="default"
                  startIcon={<Icon className="fas fa-shipping-fast" style={{ width: 'initial' }} />}
                  className={classes.button}
                  disabled
                >
                  Convert source tracking to BCE tracking
                </Button>
              ) : order.proxy_tracking_number !== null ? (
                <Button
                  startIcon={<CheckCircleIcon />}
                  style={{ color: '#fff', backgroundColor: 'green', fontSize: '12px' }}
                  disabled
                >
                  Tracking converted
                </Button>
              ) : null}


              {activeStep > 0 && order.proxy_tracking_number !== null && order.tracking_uploaded !== '1' ? (
                <Button
                  variant="outlined"
                  startIcon={<Icon className="fas fa-truck-loading" style={{ width: 'initial' }} />}
                  onClick={uploadSingleTracking}
                  className={classes.button}
                  disabled={order.being_marked_as_shipped == '1' || order.status_code == '3'}
                >
                  Upload tracking
                </Button>
              ) : activeStep == 0 || order.proxy_tracking_number == null ? (
                <Button
                  variant="outlined"
                  color="default"
                  startIcon={<Icon className="fas fa-truck-loading" style={{ width: 'initial' }} />}
                  className={classes.button}
                  disabled
                >
                  Upload tracking
                </Button>
              ) : null}

              {activeStep >= 1 && order.tracking_uploaded == '1' ? (
                <Button
                  startIcon={<CheckCircleIcon />}
                  style={{ color: '#fff', backgroundColor: 'green', fontSize: '12px' }}
                  disabled
                >
                Tracking uploaded to eBay
                </Button>
              ) : null}

            </ButtonGroup>
          </div>
        </div>
      </div>

      <Backdrop className={classes.backdrop} open={modalOpen}>
        <Modal
          aria-labelledby="edit-order-modal"
          aria-describedby="edit-order-modal"
          className={classes.modal}
          BackdropProps={{ invisible: true }}
          disableAutoFocus
          disableEnforceFocus
          open={modalOpen}
          onClose={closeModal}
          style={{ width: windowSize.width - 200, height: windowSize.height - 200 }}
        >
          <EditOrder order={order} loggedInMarketplaces={loggedInMarketplaces} localizedMarketplaces={localizedMarketplaces} allAccounts={allAccounts} />
        </Modal>
      </Backdrop>
    </div>
  );
}
