/* eslint object-shorthand: 0 */
/* eslint react/prop-types: 0 */
/* eslint no-unused-vars: 0 */

import React from 'react';
import { ipcRenderer, shell } from 'electron';
import { makeStyles } from '@material-ui/core/styles';
import { compose } from 'redux';
import { withRouter } from 'react-router-dom';
import CircularProgress from '@material-ui/core/CircularProgress';

import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import TextField from '@material-ui/core/TextField';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import Container from '@material-ui/core/Container';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';

import LockIcon from '@material-ui/icons/Https';
import IconButton from '@material-ui/core/IconButton';

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    alignItems: 'center'
  },
  wrapper: {
    marginTop: 20,
    position: 'relative'
  },
  buttonProgress: {
    color: 'green',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12
  },
  errorPaper: {
    background: 'red',
    color: '#fff',
    padding: 20,
    marginTop: 10,
    marginBottom: 10
  },
  errorH5: {
    fontWeight: 700,
    fontSize: 18
  },
  errorP: {
    fontWeight: 500,
    fontSize: 14
  }
}));

const Login = props => {
  const classes = useStyles();

  const [state, setState] = React.useState({
    email: '',
    password: '',
    showPassword: false
  });
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState(false);

  const handleClickShowPassword = () => {
    setState({ ...state, showPassword: !state.showPassword });
  };

  const handleChange = prop => event => {
    setState({ ...state, [prop]: event.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();

    if (!loading) {
      setLoading(true);
    }

    const { email, password } = state;

    ipcRenderer.send('login-dalio', { email: email, pass: password });
  };

  React.useEffect(() => {
    ipcRenderer.on('login-dalio', (event, result) => {
      setLoading(false);
      const { history } = props;
      setMessage(result.message);

      if (result.status === 5 || result.status === 8) {
        setMessage(result.message);
      } else {
        history.push('/');
      }
    });
    return () => {
      ipcRenderer.removeAllListeners('login-dalio');
    };
  }, []);

  const createAccount = () => {
    shell.openExternal('http://dalio.io/my-account');
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: 100 }}>
      <Paper elevation={0}>
        <Typography
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          variant="h5"
          component="h5"
        >
          <LockIcon />
          LOGIN
        </Typography>
        {message && (
          <Paper className={classes.errorPaper}>
            <Typography component="p" className={classes.errorP}>
              {message}
            </Typography>
          </Paper>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            id="email"
            label="Email"
            value={state.email}
            onChange={handleChange('email')}
            type="email"
            margin="normal"
            required
            fullWidth
          />
          <FormControl required fullWidth>
            <InputLabel htmlFor="adornment-password">Password</InputLabel>
            <Input
              id="adornment-password"
              type={state.showPassword ? 'text' : 'password'}
              value={state.password}
              onChange={handleChange('password')}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Toggle password visibility"
                    onClick={handleClickShowPassword}
                  >
                    {state.showPassword ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
          <div className={classes.wrapper}>
            <Button
              variant="contained"
              color="primary"
              disabled={loading}
              type="submit"
              fullWidth
            >
              Login
            </Button>
            {loading && (
              <CircularProgress size={24} className={classes.buttonProgress} />
            )}
          </div>
          <p style={{ textAlign: 'center' }}>- or -</p>
          <Button
            variant="contained"
            color="default"
            style={{ marginTop: 20 }}
            onClick={createAccount}
            fullWidth
          >
            Create an account
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default compose(withRouter)(Login);
