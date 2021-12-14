/* eslint no-unused-vars: 0 */

import React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';
import Root from './containers/Root';
import { configureStore, history } from './store/configureStore';
import './app.global.css';
import 'typeface-roboto/index.css';

// Import the Nucleus Library in the renderer process
// Enough to start tracking

// const Nucleus = require('electron-nucleus')('5d8286e317e38000e863bfd4', {
//   disableInDev: true, // disable module while in development (default: false)
//   autoUserId: true
// });

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#d5008d',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#000000',
      contrastText: '#ffffff'
    }
  },
  overrides: {
    MuiFormControlLabel: {
        label: {
            fontSize: '12px',
        }
    }
}
});

const store = configureStore();

render(
  <ThemeProvider theme={theme}>
    <AppContainer>
      <Root store={store} history={history} />
    </AppContainer>
  </ThemeProvider>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./containers/Root', () => {
    // eslint-disable-next-line global-require
    const NextRoot = require('./containers/Root').default;
    render(
      <ThemeProvider theme={theme}>
        <AppContainer>
          <NextRoot store={store} history={history} />
        </AppContainer>
      </ThemeProvider>,
      document.getElementById('root')
    );
  });
}
