/* eslint-disable compat/compat */
/* eslint global-require: off */
/* eslint promise/catch-or-return: 0 */
/* eslint arrow-body-style: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint no-await-in-loop: 0 */
/* eslint no-shadow: 0 */
/* eslint no-unused-vars: 0 */
/* eslint no-plusplus: 0 */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker } from 'electron';
import { autoUpdater } from 'electron-updater';
import DalioHelper from './functions/core/helper/DalioHelper';

let powerSaveBlockerId = false;

// Import the Nucleus Library in the renderer process - enough to start tracking
const Nucleus = global.nucleus = require("nucleus-nodejs");

Nucleus.init("5d8286e317e38000e863bfd4", {
	disableInDev: true,
  autoUserId: true,
	debug: true
})

Nucleus.appStarted();

let mainWindow: Object = {};

export default class AppUpdater {
  constructor() {
    autoUpdater.logger = global.appLog;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

if (process.env.NODE_ENV === 'production') {
  // If the software is run in production environment -> all chromium instances will be opened headlessly
  global.headless = true;
  powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  // If the software is run in development environment -> all chromium instances will be opened headfully
  global.headless = false;
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

// When the user presses the 'Update now' button, the app will quit and install
ipcMain.on('update-app', async () => {
  autoUpdater.quitAndInstall();
});

// When there is an update ready -> send an event to Root.js which will show a notification on the front-end
autoUpdater.on('update-downloaded', async () => {
  mainWindow.webContents.send('update-ready', true);
});

// Lock Dalio app with a single instance -> does not allow opening multiple Dalio instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('ready', async () => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
      await installExtensions();
    }
    let numberOfLogins = 0;

    mainWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 728,
      minWidth: 1000,
      minHeight: 700,
      // resizable: false,
      webPreferences: {
        devTools: true,
        enabled: false,
        nodeIntegration: true
      }
    });

    mainWindow.loadURL(`file://${__dirname}/app.html`);

    app.on('login', (event, webContents, details, authInfo, callback) => {
      // Electron prevents basic authentication by default -> prevent the default behavior
      event.preventDefault();
      // Start tracking how many auth attempts have been made (they happen all the time until the proxy is authenticated)
      numberOfLogins++;
      if (authInfo.isProxy) {
        // If the global proxy credentials are set -> use them for authentication
        if (global.proxyUsername !== '' && global.proxyPassword !== '') {
          callback(global.proxyUsername, global.proxyPassword);
        } else {
          // Else authenticate with empty strings -> no particular reason to do that, apart from the fact that it speeds up the auth attempts and provide a smoother experience in the front-end
          callback('', '');
        }
      }
      
      // If this is not the first login attempt (auth is required) -> send an event to the renderer process asking for the proxy auth credentials
      if (numberOfLogins > 0) {
        mainWindow.webContents.send('request-proxy-credentials', authInfo);
      }
    });

    // Listen for the event which carries the proxy credentials given by the user -> update the global values which will be used for basic authentication and for puppeteer (chromium proxy auth)
    ipcMain.on('request-proxy-credentials', async (event, credentials) => {
      if (credentials.username !== null && credentials.username !== '' && credentials.password !== null && credentials.password !== '') {
        global.proxyUsername = credentials.username;
        global.proxyPassword = credentials.password;
      }
    });

    mainWindow.webContents.on('did-finish-load', () => {
      if (!mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      if (process.env.START_MINIMIZED) {
        mainWindow.minimize();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Remove the default windows/mac specific menu 
    mainWindow.removeMenu();

    // Show a dialog when the user tries to exit the app
    // mainWindow.on('close', e => {
    //   console.log('e', e);
    //   const choice = dialog.showMessageBox(null,
    //       {
    //         type: 'question',
    //         buttons: ['Yes', 'No'],
    //         title: 'Confirm',
    //         message: 'Are you sure you want to quit?',
    //         detail: 'Dalio will stop functioning completely.'
    //     });
    //     if(choice === 1){
    //       e.preventDefault();
    //     }
    //   });

    // Initiate Dalio`s core functions
    const dalio: DalioHelper = new DalioHelper(mainWindow);
    dalio.setup();   

    // Deal with auto-updates
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line
      new AppUpdater();

      // It will create an hourly interval that checks for Dalio updates -> if there are -> download it and send update notificiations
      const checkForUpdatesInterval: IntervalID = setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 3600000); // 1 hour
    }
  });

  app.on('before-quit', (event) => {
    // console.log('before-quit event', event);
    if (powerSaveBlockerId) {
      powerSaveBlocker.stop(powerSaveBlockerId);
    }
  });
}