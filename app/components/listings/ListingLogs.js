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
import { ipcRenderer } from 'electron';
import Modal from '@material-ui/core/Modal';
import Grid from '@material-ui/core/Grid';
import Pagination from '@material-ui/lab/Pagination';
import Backdrop from '@material-ui/core/Backdrop';
import Fab from '@material-ui/core/Fab';
import DeleteIcon from '@material-ui/icons/Delete';
import Tooltip from '@material-ui/core/Tooltip';

import Timeline from '@material-ui/lab/Timeline';
import TimelineItem from '@material-ui/lab/TimelineItem';
import TimelineSeparator from '@material-ui/lab/TimelineSeparator';
import TimelineConnector from '@material-ui/lab/TimelineConnector';
import TimelineContent from '@material-ui/lab/TimelineContent';
import TimelineOppositeContent from '@material-ui/lab/TimelineOppositeContent';
import TimelineDot from '@material-ui/lab/TimelineDot';
import Typography from '@material-ui/core/Typography';

import ErrorIcon from '@material-ui/icons/Error';
import InfoIcon from '@material-ui/icons/Info';
import WarnIcon from '@material-ui/icons/Update';

import Util from '../../functions/core/util/Util';

const useStyles = makeStyles(() => ({
  modal: {
    position: 'absolute',
    width: 800,
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
    fontSize: '18px',
    fontWeight: 700,
    textAlign: 'center',
    paddingTop: '20px'
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
  backdrop: {
      zIndex: 1000,
  },
  timeLineItemRoot: {
      minHeight: '90px',
      justifyContent: 'space-around',
  }
}));

const ListingLogs = (props) => {
    const classes = useStyles();
    const [logsChunked, setLogsChunked] = React.useState([]);
    const [logsPage, setLogsPage] = React.useState(0);

    React.useEffect(() => {
        if (props.listing.logs.length > 0) {
            const logsChunkedLocal = Util.splitArrayInChunks(props.listing.logs.slice(0).reverse(), 10);
            setLogsChunked([...logsChunkedLocal]);

        }
    }, [props.listing.logs]);

    const handlePaginationChange = (event, value) => {
        setLogsPage(value-1);
    }

    const clearLogs = () => {
        ipcRenderer.send('delete-listing-logs', props.listing);
        props.closeModal();
    }

    return (
        <React.Fragment>
            {props.listing !== undefined ? (
                <Backdrop className={classes.backdrop} open={props.open}>
                    <Modal
                        aria-labelledby="listing-logs-modal"
                        aria-describedby="listing-logs-modal"
                        className={classes.modal}
                        BackdropProps={{ invisible: true }}
                        disableAutoFocus
                        disableEnforceFocus
                        open={props.open}
                        onClose={props.closeModal}
                    >
                        <Grid container>
                            <Tooltip title="Delete all logs">
                                <Fab style={{ position: 'fixed', bottom: 40, right: 40, zIndex: 2 }} onClick={clearLogs}>
                                    <DeleteIcon />
                                </Fab>
                            </Tooltip>
                            <Grid item xs={12}>
                            <h2 className={classes.orderLogH2}>{props.listing.item_name}</h2>
                            {logsChunked.length > 0 ? (
                                <Timeline align="alternate">
                                    {logsChunked[logsPage].map((value, index) => {
                                        return (
                                            <TimelineItem key={`timelineitem-${index}`} classes={{ root: classes.timeLineItemRoot }}>
                                                <TimelineOppositeContent>
                                                    <Typography color="textSecondary">{value.time}</Typography>
                                                </TimelineOppositeContent>
                                                <TimelineSeparator style={{ paddingLeft: '20px', paddingRight: '20px' }}>
                                                    <TimelineDot style={{ backgroundColor: 'transparent', boxShadow: 'none', padding: '0px' }}>
                                                    {value.level === 'error' ? (
                                                        <ErrorIcon style={{ color: '#ff0000', fontSize: '32px' }} />
                                                    ) : value.level === 'warn' ? (
                                                        <WarnIcon style={{ color: 'yellow', fontSize: '32px' }} />
                                                    ) : (
                                                        <InfoIcon style={{ color: '#333', fontSize: '32px' }} />
                                                    )}
                                                    </TimelineDot>
                                                    <TimelineConnector />
                                                </TimelineSeparator>

                                                <TimelineContent><Typography color="textSecondary" style={{ background: '#e7e7e7', borderRadius: '5px', padding: '10px', color: '#000' }}>{decodeURI(value.log)}</Typography></TimelineContent>
                                                
                                            </TimelineItem>

                                        );
                                    })}
                                </Timeline>
                            ) : <p style={{ textAlign: 'center', fontSize: '14px' }}>This listing has no logs yet.</p>}
                            
                            </Grid>

                            {logsChunked.length > 1 ? (
                                <Grid item xs={12}>
                                    <Pagination 
                                    count={logsChunked.length} 
                                    style={{ paddingBottom: 20 }} 
                                    color="primary" 
                                    onChange={handlePaginationChange}
                                    />
                                </Grid>
                            ) : null}
                            
                        </Grid>
                    </Modal>
                </Backdrop>
            ) : null}
        </React.Fragment>
    );
};

export default ListingLogs;
