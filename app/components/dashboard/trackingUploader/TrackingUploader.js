/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint no-nested-ternary: 0 */

import React from 'react';
import clsx from 'clsx';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Collapse from '@material-ui/core/Collapse';
import Button from '@material-ui/core/Button';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Icon from '@material-ui/core/Icon';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { ipcRenderer } from 'electron';
import { makeStyles } from '@material-ui/core/styles';


const useStyles = makeStyles(theme => ({
  gridHeader: {
    backgroundColor: '#505050'
  },
  gridContainer: {
    padding: '10px'
  },
  cardHeader: {
    width: '100%',
    padding: '10px'
  },
  cardHeaderTitle: {
    color: '#fff',
    fontWeight: 700,
    margin: 0,
    fontSize: '14px'
  },
  card: {
    width: '100%',
    margin: 'auto',
    marginTop: '10px',
    marginBottom: '10px',
    background: '#fff'
  },
  p: {
    fontSize: '12px',
    fontWeight: 700,
    paddingLeft: '10px',
    paddingRight: '10px'
  },
  span: {
    color: theme.palette.primary.main,
  },
  countryP: {
    fontSize: '10px',
    fontWeight: 500
  },
  button: {
    margin: theme.spacing(1)
  },
  input: {
    display: 'none'
  },
  spanPrimaryColor: {
    color: theme.palette.primary.main,
    fontSize: '18px',
    fontWeight: 900
  },
  formControlLabel: {
    margin: 'auto'
  },
  cardActions: {
    justifyContent: 'center'
  },
  typographyWeight: {
    textAlign: 'right',
    fontWeight: 900
  },
  badgeGreen: {
    color: '#00ff00'
  },
  badgeRed: {
    color: '#ff0000'
  },
  expand: {
    transform: 'rotate(0deg)',
    marginLeft: 'auto',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest
    })
  },
  expandOpen: {
    transform: 'rotate(180deg)'
  }
}));

const TrackingUploader = props => {
  const classes = useStyles();
  const [expanded, setExpanded] = React.useState(true);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <React.Fragment>
      <Card className={classes.card} elevation={1}>
        <Grid container spacing={1} className={classes.gridHeader}>
          <Grid item xs={10}>
            <div className={classes.cardHeader}>
              <h4 className={classes.cardHeaderTitle}>Tracking Uploader</h4>
            </div>
          </Grid>
          <Grid item xs={2}>
            <IconButton
              style={{ padding: 6 }}
              className={clsx(classes.expand, {
                [classes.expandOpen]: expanded
              })}
              onClick={handleExpandClick}
              aria-expanded={expanded}
              aria-label="show more"
            >
              <ExpandMoreIcon style={{ color: '#fff' }} />
            </IconButton>
          </Grid>
        </Grid>
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <CardContent style={{ padding: 0 }}>
            <Button
                variant="contained"
                color="primary"
                size="small"
                className={classes.button}
                onClick={() => ipcRenderer.send('gmailOAuth')}
                >
                Connect GMAIL
            </Button>
          </CardContent>
        </Collapse>
      </Card>
    </React.Fragment>
  );
};

export default TrackingUploader;
