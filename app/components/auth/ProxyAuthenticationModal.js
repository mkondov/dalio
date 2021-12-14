import React from 'react';
import { ipcRenderer } from 'electron';
import { Offline } from "react-detect-offline";
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

const ProxyAuthenticationModal = () => {
  const [open, setOpen] = React.useState(false);
  const [credentials, setCredentials] = React.useState({ username: '', password: ''});
  const [proxyInfo, setProxyInfo] = React.useState({ host: '', port: ''});

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const credentialsChange = name => event => {
    setCredentials({ ...credentials, [name]: event.target.value });
  };

  const connectToProxy = () => {
    if (credentials.username !== '' && credentials.password !== '') {
        ipcRenderer.send('request-proxy-credentials', credentials);
        handleClose();
    }
  }

  React.useEffect(() => {
    ipcRenderer.on('request-proxy-credentials', (event, info) => {
        if (!open) {
         handleClickOpen();
         setProxyInfo({ host: info.host, port: info.port });
        }
    });

    return () => {
      ipcRenderer.removeAllListeners('request-proxy-credentials');
    };
  }, []);

  return (
    <Offline>
      <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title">Proxy credentials</DialogTitle>
        <DialogContent>
          <React.Fragment>
            <DialogContentText>
              The proxy connection <b>http://{proxyInfo.host}:{proxyInfo.port}</b> requires username and password. Please enter them in the fields below.
            </DialogContentText>
            <TextField
                autoFocus
                margin="dense"
                id="username"
                label="Username"
                type="username"
                value={credentials.username}
                onChange={credentialsChange('username')}
                fullWidth
            />
            <TextField
                autoFocus
                margin="dense"
                id="password"
                label="Password"
                type="password"
                value={credentials.password}
                onChange={credentialsChange('password')}
                fullWidth
            />
          </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={connectToProxy} color="primary">
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Offline>
  );
}

export default ProxyAuthenticationModal;
