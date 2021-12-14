/* eslint react/destructuring-assignment: 0 */
/* eslint react/prop-types: 0 */
// @flow
import React from 'react';
import { ipcRenderer } from 'electron';
import Grid from '@material-ui/core/Grid';
import Tooltip from '@material-ui/core/Tooltip';
import Fab from '@material-ui/core/Fab';
import Skeleton from '@material-ui/lab/Skeleton';
import { store } from 'react-notifications-component';

import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import Pagination from '@material-ui/lab/Pagination';

import ErrorIcon from '@material-ui/icons/Error';
import CheckIcon from '@material-ui/icons/CheckCircle';
import WarnIcon from '@material-ui/icons/Update';
import DeleteIcon from '@material-ui/icons/Delete';

import Util from '../../functions/core/util/Util';

// TYPES
import type { Log } from '../../types/LogsTypes'

const useStyles = makeStyles(theme => ({
  root: {
    margin: 'auto'
  },
  primary: {
    fontWeight: 600,
    fonSize: 10
  },
  marginTop: {
    marginTop: 80
  },
  skeletonRect: {
    marginTop: 10,
    marginBottom: 10
  },
}));

const Logs = () => {
  const classes: Object = useStyles();
  const [logsChunked, setLogsChunked] = React.useState([]);
  const [logsPage, setLogsPage] = React.useState(0);
  const [loader, setLoader] = React.useState(true);

  const clearLogs = async (): Promise<any> => {
    ipcRenderer.send('delete-all-logs');
    setLogsChunked([]);
    store.addNotification({
      title: "Success!",
      message: "Logs have been successfuly deleted",
      type: "success",
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
    ipcRenderer.on('send-logs', (event: SyntheticEvent<>, logs: Log) => {
      if (logs.length > 0) {
        const logsChunked = Util.splitArrayInChunks(logs, 10);
        setLogsChunked([...logsChunked]);
      }
      setLoader(false);
    });

    ipcRenderer.send('request-logs');

    // Cleanup the listener events so that memory leaks are avoided.
    return function cleanup() {
      ipcRenderer.removeAllListeners('send-logs');
    };
  }, []);

  const handlePaginationChange = (event: SyntheticEvent<>, value: number) => {
    setLogsPage(value-1);
  }

  if (Array.isArray(logsChunked)) {
    if (logsChunked.length !== 0) {
      return (
        <React.Fragment>
          <Tooltip title="Delete all logs">
            <Fab style={{ position: 'fixed', bottom: 40, right: 10, zIndex: 2 }} onClick={clearLogs} color="primary" aria-label="add">
              <DeleteIcon />
            </Fab>
          </Tooltip>
          <Grid container className={classes.marginTop}>
            <Grid item xs={12}>
              <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 12 }}>
                Each log that has been generated more than 3 days ago will be
                automatically deleted. 
              </p>
            </Grid>

            <Grid item xs={12}>
              <List className={classes.root}>
                {logsChunked[logsPage].map((log, key) => (
                  <ListItem key={key}>
                    <ListItemAvatar>
                      {log.level === 'error' ? (
                        <Avatar style={{ backgroundColor: '#ff0000' }}>
                          <ErrorIcon />
                        </Avatar>
                      ) : log.level === 'warn' ? (
                        <Avatar style={{ backgroundColor: '#ffa500' }}>
                          <WarnIcon />
                        </Avatar>
                      ) : (
                        <Avatar style={{ backgroundColor: '#32CD32' }}>
                          <CheckIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      classes={{ primary: classes.primary }}
                      primary={decodeURI(log.message)}
                      secondary={log.date}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
            
            <Grid item xs={12}>
             <Pagination 
              count={logsChunked.length} 
              style={{ paddingBottom: 20 }} 
              color="primary" 
              onChange={handlePaginationChange}
              />
            </Grid>
          </Grid>
        </React.Fragment>
      );
    }

    if (loader) {
      // Return a loading progress if the listings are not yet loaded
      return (
        <div style={{ marginTop: 80, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="30%" height={10} />
            <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={30} />
            <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={30} />
            <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={30} />
            <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={30} />
            <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={30} />
            <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={30} />
            <Skeleton className={classes.skeletonRect} variant="rect" animation="wave" width="90%" height={30} />
        </div>
      );
    }
    
    return (
      <div className={classes.marginTop}>
        <p style={{ textAlign: 'center', fontWeight: 800 }}>
          You have no logs. They will start appearing as you use Dalio.
        </p>
      </div>
    );
  }
};


export default Logs;
