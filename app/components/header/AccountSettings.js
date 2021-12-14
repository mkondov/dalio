/* eslint arrow-body-style: 0 */
/* eslint no-unneeded-ternary: 0 */

import React from 'react';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import IconButton from '@material-ui/core/IconButton';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Tooltip from '@material-ui/core/Tooltip';

import KeyboardBackspaceIcon from '@material-ui/icons/KeyboardBackspace';
import SettingsIcon from '@material-ui/icons/Settings';
import SaveIcon from '@material-ui/icons/Save';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';

const useStyles = makeStyles({
    drawer: {
        width: '100%'
    },
    settingsButton: {
        color: '#fff'
    },
    closeDrawerButton: {
        marginLeft: '10px',
        marginTop: '10px'
    },
    closeDrawerButtonIcon: {
        fontSize: '32px'
    }
});

export default function AccountSettings() {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState({
    start_dalio_at_system_startup: '0',
    start_repricer_at_app_startup: '1'
  });

  const toggleDrawer = (anchOpen) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }

    setOpen(anchOpen);
  };

  const handleSwitchChange = e => {
    const checked = e.target.checked ? '1' : '0';
    let localState = JSON.parse(JSON.stringify(state));

    setState({ ...state, [e.target.name]: checked });

    localState = { ...localState, [e.target.name]: checked };
    saveSettings(localState);
  }

  const saveSettings = settingsToSave => {
    ipcRenderer.send('save-dalio-settings', settingsToSave);
  }

  React.useEffect(() => {
    ipcRenderer.send('get-dalio-settings');

    ipcRenderer.on('get-dalio-settings', (e, settings) => {
      const settingsCopy = JSON.parse(JSON.stringify(settings));

        setState(prevState => {
            return {...prevState, ...settingsCopy }
        });
    });

    return function cleanup() {
        ipcRenderer.removeAllListeners('get-dalio-settings');
    };
  }, []);

  return (
    <div>
      <React.Fragment>
        <Tooltip title="App settings">
            <IconButton 
                aria-label="open" 
                className={classes.settingsButton} 
                size="medium"
                onClick={toggleDrawer(true)}
            >
                <SettingsIcon />
            </IconButton>
        </Tooltip>
        <Drawer anchor="left" open={open} onClose={toggleDrawer(false)} classes={{ paperAnchorLeft: classes.drawer }}>
            <React.Fragment>
                <Grid container>
                    <Grid item xs={12}>
                        <IconButton 
                            aria-label="close" 
                            size="medium"
                            onClick={toggleDrawer(false)}
                            className={ classes.closeDrawerButton }
                        >
                            <KeyboardBackspaceIcon className={ classes.closeDrawerButtonIcon } />
                        </IconButton>
                    </Grid>

                    <Grid item xs={12}>
                        <h2 style={{ paddingLeft: '15px', fontSize: '18px'}}>App settings</h2>
                    </Grid>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch 
                                    color="primary" 
                                    name="start_dalio_at_system_startup"
                                    checked={state.start_dalio_at_system_startup === '1' ? true : false}
                                    onChange={handleSwitchChange}
                                />
                            }
                            label="Launch Dalio at system startup"
                            labelPlacement="start"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch 
                                    color="primary" 
                                    name="start_repricer_at_app_startup"
                                    checked={state.start_repricer_at_app_startup === '1' ? true : false}
                                    onChange={handleSwitchChange}
                                />
                            }
                            label="Automatically start the repricer when the app starts"
                            labelPlacement="start"
                        />
                    </Grid>
                
                    <Grid item xs={12} style={{ paddingLeft: '10px', paddingTop: '20px' }}>
                    <ButtonGroup color="default" aria-label="outlined primary button group">
                        <Button 
                        startIcon={<SaveIcon />} 
                        style={{ color: '#000' }}
                        onClick={() => ipcRenderer.send('backup-user-data')}
                        >Create backup</Button>
                        <Button 
                        startIcon={<CloudUploadIcon />} 
                        style={{ background: '#d5008d', color: '#fff' }}
                        onClick={() => ipcRenderer.send('restore-user-data')}
                        >Restore from backup</Button>
                    </ButtonGroup>
                    </Grid>
                </Grid>
            </React.Fragment>
        </Drawer>
    </React.Fragment>
    </div>
  );
}
