/* eslint eqeqeq: 0 */
/* eslint radix: 0 */
/* eslint no-nested-ternary: 0 */

import React from 'react';
import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import Modal from '@material-ui/core/Modal';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Grid from '@material-ui/core/Grid';
import CircularProgress from '@material-ui/core/CircularProgress';

import CheckCircleIcon from '@material-ui/icons/CheckCircleOutline';

const useStyles = makeStyles(() => ({
    paper: {
      position: 'absolute',
      width: 580,
      height: 300,
      margin: 'auto',
      color: '#000',
      backgroundColor: '#f7f7f7',
      boxShadow: '0px 0px 5px 0px rgba(0,0,0,0.5)',
      border: '1px solid #fff',
      padding: '20px 30px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    },
    gridItem: {
        padding: '10px'
    }
}));

const CSVImportModal = () => {
    const classes = useStyles();
    const [modalOpen, setModalOpen] = React.useState(false);
    const [csvFile, setCSVFile] = React.useState('');
    const [csvListingsHigherBoundary, setCSVListingsHigherBoundary] = React.useState(1);
    const [state, setState] = React.useState({
        lower_boundary: 1,
        higher_boundary: 1
    });
    const [showLoader, setShowLoader] = React.useState(true);
    const [importedListingsCount, setImportedListingsCount] = React.useState(0);
    const [finishedImporting, setFinishedImporting] = React.useState(false);
    const [errorText, setErrorText] = React.useState(undefined);

    const handleChange = prop => event => {
        const value = parseInt(event.target.value);
        if (prop === 'lower_boundary') {
            if (value >= 1 && value <= csvListingsHigherBoundary && value <= 2000) {
                if (value >= state.higher_boundary) {
                    setState({ lower_boundary: value, higher_boundary: value });
                    if (errorText !== undefined) {
                        setErrorText(undefined);
                    }
                } else {
                    setState({ ...state, [prop]: value });
                    if (errorText !== undefined) {
                        setErrorText(undefined);
                    }
                }
            } else {
                if (value < 1) {
                    setErrorText('The entry point of your CSV file cannot be lower than 1');
                } else if (value > csvListingsHigherBoundary) {
                    setErrorText(`The entry point of your CSV file cannot be higher than ${csvListingsHigherBoundary}`);
                } else if (value > 2000) {
                    setErrorText(`You can import a maximum of 2000 listings at a time`);
                }
            }
        } else if (prop === 'higher_boundary') {
            if (value >= state.lower_boundary && value <= csvListingsHigherBoundary && value <= 2000) {
                setState({ ...state, [prop]: value });
                if (errorText !== undefined) {
                    setErrorText(undefined);
                }
            } else {
                if (value > 2000) {
                    setErrorText('You can import a maximum of 2 000 listings at a time.');
                } else if (value > csvListingsHigherBoundary) {
                    setErrorText('The "entry to" value cannot be greater than the total amount of listings in the CSV file');
                }
            }
        }
    };

    const openModal = () => {
        setModalOpen(true);
      };
    
    const closeModal = () => {
        setModalOpen(false);
        setShowLoader(true);
        setFinishedImporting(false);
    };

    const importCSV = () => {
        ipcRenderer.send('parse-csv-file', state.lower_boundary, state.higher_boundary);
        setShowLoader(true);
    }

    React.useEffect(() => {
        ipcRenderer.on('open-csv-import-modal', (event, count, fileName, loader) => {
            openModal();
            if (!loader) {
                setCSVFile(fileName)
                setCSVListingsHigherBoundary(count);
                setShowLoader(false);
            }
        });

        ipcRenderer.on('parse-csv-file', (event, importedListings) => {
            if (importedListings > 0) {
                setImportedListingsCount(importedListings);
            }
            setFinishedImporting(true);
            setShowLoader(false);
        });

        return function cleanup() {
            ipcRenderer.removeAllListeners('open-csv-import-modal');
            ipcRenderer.removeAllListeners('parse-csv-file');
        };
    }, []);

    return (
        <div>
            <Modal
                aria-labelledby="simple-modal-title"
                aria-describedby="simple-modal-description"
                className={classes.paper}
                BackdropProps={{ invisible: true }}
                disableBackdropClick="true"
                open={modalOpen}
                onClose={closeModal}
                disableEnforceFocus 
                style={{ outline: 0 }}
            >
                {showLoader ? (
                    <React.Fragment>
                        <CircularProgress style={{ outline: 0 }} size={60} />
                        <p>Please wait...</p>
                        <Button variant="outlined" onClick={closeModal}>Cancel</Button>
                    </React.Fragment>
                ) : (
                    !finishedImporting ? (
                        <React.Fragment>
                            <h2 style={{ fontSize: 18, textTransform: 'uppercase' }}>Importing CSV</h2>
                            <p style={{ fontSize: 12 }}>Importing {csvFile}</p>
                            <p style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase' }}>Total listings in CSV file: {csvListingsHigherBoundary}</p>
                            <Grid container>
                                {errorText !== undefined ? (
                                    <Grid item xs={12} style={{ background: '#ff0000', borderRadius: 5, textAlign: 'center', color: '#fff', fontWeight: 700 }}>
                                        <p style={{ fontSize: 14 }}>{errorText}</p>
                                    </Grid>
                                ) : null}
                                
                                <Grid item xs className={classes.gridItem}>
                                    <TextField
                                        id="lower_boundary"
                                        label="From listing entry"
                                        value={state.lower_boundary}
                                        onChange={handleChange('lower_boundary')}
                                        type="number"
                                        margin="normal"
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs className={classes.gridItem}>
                                    <TextField
                                        id="higher_boundary"
                                        label="To listing entry"
                                        value={state.higher_boundary}
                                        onChange={handleChange('higher_boundary')}
                                        type="number"
                                        margin="normal"
                                        required
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                            
                            <ButtonGroup color="primary" aria-label="outlined primary button group">
                                <Button variant="contained" onClick={importCSV}>Import</Button>
                                <Button variant="outlined" onClick={closeModal}>Cancel</Button>
                            </ButtonGroup>
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                            <CheckCircleIcon style={{ color: 'green', fontSize: 54 }} />
                            <p>Successfuly imported {importedListingsCount} listings</p>
                            <Button variant="outlined" onClick={closeModal}>Close</Button>
                        </React.Fragment>
                    )
                )}
            </Modal>
        </div>
  );
};

  
export default CSVImportModal;