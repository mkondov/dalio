/* eslint-disable compat/compat */
/* eslint arrow-body-style: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint no-await-in-loop: 0 */
/* eslint no-shadow: 0 */
/* eslint promise/catch-or-return: 0 */
/* eslint camelcase: 0 */
/* eslint radix: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint no-unused-vars: 0 */
/* eslint no-plusplus: 0 */
/* eslint import/newline-after-import: 0 */
/* eslint compat/compat: 0 */
/* eslint no-lonely-if: 0 */
/* eslint eqeqeq: 0 */
/* eslint no-useless-escape: 0 */
/* eslint no-underscore-dangle: 0 */
/* eslint lines-between-class-members: 0 */
/* eslint no-restricted-globals: 0 */
/* eslint no-else-return: 0 */

import fs from 'fs';
import { ipcMain, TouchBarSlider } from 'electron';
import moment from 'moment';
import isOnline from 'is-online';
import Util from '../../core/util/Util';
import EbayUtil from '../../core/util/EbayUtil';

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality -> makes puppeteer not as easily detectable
const puppeteer = require('puppeteer-extra');

puppeteer.use(require('puppeteer-extra-plugin-stealth')());
puppeteer.use(require('puppeteer-extra-plugin-anonymize-ua')());

// add recaptcha plugin and provide it your 2captcha token
// 2captcha is the builtin solution provider but others work as well.

const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
puppeteer.use(
  RecaptchaPlugin({
    provider: { id: '2captcha', token: 'a9c97548d53ee90dc7a64c6728800a94' },
    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  })
)

let productsActuallyRepriced = [];
let variantsActuallyRepriced = [];

let productsScraped = [];
let variationsScraped = [];

/*
 * The Ebay class is designed to handle Ebay listings reprice, synchronization and inventory management
 */
class Ebay {
  mainWindow = undefined;
  repricerHelper = undefined;
  listingsCount = 0;

  // Browsers
  repriceBrowser = false;
  inventoryManagerBrowser = false;
  ebayLoginBrowser = false;
  listingsScraperBrowser = false;
  ordersScraperBrowser = false;
  testBrowser = false;

  // Intervals
  priceCheckInterval = undefined;
  priceCheckIntervalTime = 14400000 ; // 4 hours by default 3600000
  refactorPricesInterval = undefined;
  refactorPricesIntervalTime = 1200000 // 20 minutes by default
  ebayRepricerInterval = undefined;
  ebayRepricerIntervalTime = 3600000 // 1 hour by default

  // Timeout
  priceCheckerTimeout = undefined;

  constructor (repricerHelper) {

    this.mainWindow = repricerHelper.mainWindow;
    this.repricerHelper = repricerHelper;

    ipcMain.on('check-ebay-login', async () => {
      const marketplaces = await this.canLogIn();
      const ebayAccounts = {
        US: false,
        UK: false,
        DE: false,
        CA: false,
        IT: false,
      };

      // Check the DB for a specific marketplace`s login details (if absent -> need to login again)
      if (marketplaces.US) {
        ebayAccounts.US = await global.knex('tbl_users')
        .where({ account: 'ebay_us' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });

        // If the account does not have a corresponding email and pass in the DB -> need to log in
        if (ebayAccounts.US === false) {
          marketplaces.US = false;
        }
      }

      if (marketplaces.UK) {
        ebayAccounts.UK = await global.knex('tbl_users')
        .where({ account: 'ebay_uk' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });

        // If the account does not have a corresponding email and pass in the DB -> need to log in
        if (ebayAccounts.UK === false) {
          marketplaces.UK = false;
        }
      }

      if (marketplaces.DE) {
        ebayAccounts.DE = await global.knex('tbl_users')
        .where({ account: 'ebay_de' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });

        // If the account does not have a corresponding email and pass in the DB -> need to log in
        if (ebayAccounts.DE === false) {
          marketplaces.DE = false;
        }
      }

      if (marketplaces.CA) {
        ebayAccounts.CA = await global.knex('tbl_users')
        .where({ account: 'ebay_ca' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });

        // If the account does not have a corresponding email and pass in the DB -> need to log in
        if (ebayAccounts.CA === false) {
          marketplaces.CA = false;
        }
      }

      if (marketplaces.IT) {
        ebayAccounts.IT = await global.knex('tbl_users')
        .where({ account: 'ebay_it' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });

        // If the account does not have a corresponding email and pass in the DB -> need to log in
        if (ebayAccounts.IT === false) {
          marketplaces.IT = false;
        }
      }

      if (
        marketplaces.US ||
        marketplaces.UK ||
        marketplaces.DE ||
        marketplaces.CA ||
        marketplaces.IT
        ) {
        
        // Call the handle onboarding function as well so that changes in 'sign in' to Amazon marketplace can be reflected
        Util.handleOnboarding(this.mainWindow, {
          action: 'change-settings',
          settings: { sign_in_ebay: true }
        });
      } else {
        // Call the handle onboarding function as well so that changes in 'sign in' to Amazon marketplace can be reflected
        Util.handleOnboarding(this.mainWindow, {
          action: 'change-settings',
          settings: { sign_in_ebay: false }
        });
      }

      this.mainWindow.webContents.send('check-ebay-login', marketplaces, ebayAccounts);
    });

    // If Ebay login is invoked from the button on the front-end -> do it
    ipcMain.on('login-ebay', async (event, country) => {
      await this.logIn(country).catch(error => {
        this.mainWindow.webContents.send('ebay-login-error');
        global.log.error('Ebay login was unsuccessful. Please try again. It is important to not close the browser after you enter your credentials. Dalio will close it automatically.');
      });

      const loggedInEbay = await this.canLogIn(false, country);
      const ebayAccounts = {};

      // Check the DB for a specific marketplace`s login details (if absent -> need to login again)
      if (country === 'US') {
        ebayAccounts.US = await global.knex('tbl_users')
        .where({ account: 'ebay_us' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });
      }

      if (country === 'UK') {
        ebayAccounts.UK = await global.knex('tbl_users')
        .where({ account: 'ebay_uk' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });
      }

      if (country === 'DE') {
        ebayAccounts.DE = await global.knex('tbl_users')
        .where({ account: 'ebay_de' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });
      }

      if (country === 'CA') {
        ebayAccounts.CA = await global.knex('tbl_users')
        .where({ account: 'ebay_ca' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });
      }

      if (country === 'IT') {
        ebayAccounts.IT = await global.knex('tbl_users')
        .where({ account: 'ebay_it' })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.email !== null) {
              return row.email;
            }
          }
          return false;
        });
      }

      this.mainWindow.webContents.send('check-ebay-login', { [country]: loggedInEbay }, ebayAccounts);

      global.nucleus.track("EBAY-LOGIN", {
        description: 'The user has tried to login an Ebay account.',
        [country]: loggedInEbay
      });
    });

    ipcMain.on('logout-ebay', async (event, country) => {
      await this.logOut(country);

      global.nucleus.track("EBAY-LOGOUT", {
        description: 'The user has tried to logout from an Ebay account.',
        country
      });
    });

     /*
     * Listen for the switch-ebay-repricer call from the renderer process -> switch it ON or OFF
     */
    ipcMain.on('switch-ebay-repricer', async (event, value) => {
      this.switchEbayRepricer(value);
    });

    ipcMain.on('sync-ebay-listings', async () => {
      this.syncListings();
    });

    ipcMain.on('ebay-settings', async (event, info) => {
      this.settingsAction(info);
    });

    ipcMain.on('ebay-inventory-manager-settings', async (event, info) => {
      this.inventoryManagerSettingsAction(info);
    });
    
    // TESTS
    ipcMain.on('reprice-ebay', async () => {
      const connectionStatus = await isOnline();
      if (connectionStatus) {
        this.initiateReprice();
      } else {
        global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
      }
    });

    ipcMain.on('manage-ebay-inventory', async () => {
      const connectionStatus = await isOnline();
      if (connectionStatus) {
        this.manageInventory();
      } else {
        global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
      }
    });

    ipcMain.on('open-ebay-account-with-cookies', async () => {
      try {
        this.testBrowser = await puppeteer.launch({
          headless: global.headless,
          executablePath: Util.getChromiumExecPath(puppeteer),
          slowMo: 100,
          defaultViewport: null,
          devtools: false,
          ignoreDefaultArgs: ['--enable-automation'],
          args: [
            '--disable-webgl'
          ]
        });
  
        const page = await this.testBrowser.newPage();
        /* Make sure a page width is always set for the bot
        * this will make sure that the bot can manipulate the page as expected
        * as no selectors will be hidden due to mobile/tablet media queries
        */
        await page.setViewport({ width: 1280, height: 800 });
        await page.setDefaultNavigationTimeout(0);
        
        const ebayCookies = {};

        const marketplace = 'US';

        if (marketplace === 'US') {
          // Get the Ebay cookies from the file
          ebayCookies.US = await this.canLogIn(true, 'US');
          if (!ebayCookies.US) {
            await this.testBrowser.close();
          } else {
            await page.setCookie(...ebayCookies.US);
            await page.goto(`https://ebay.com/sh/lst/active?limit=200`, { waitUntil: 'networkidle0' });
          }
        } 
      } catch (e) {
        await this.testBrowser.close();
        global.appLog.error(e);
      }
    });

    // Setup the automatic repricer startup with a delay, so the dependency global variables can be loaded properly
    setTimeout(this.setup, 5000);

    // Sync listings in half an hour
    setTimeout(this.syncListings, 1800000);
    // Sync orders every 6 hours
    setInterval(this.syncListings, 21600000);
  }

  setup = async () => {
    const dalioRow = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(row => row)
    .catch(e => global.appLog.error(`${e} - Ebay.setup line 399`));

    if (dalioRow !== undefined) {
      const settings = JSON.parse(dalioRow.settings);

      if (settings.app.start_repricer_at_app_startup === '1') {
        this.switchEbayRepricer(true);
      }
    }
  }

  switchEbayRepricer = async (value) => {
    // 1. When the repricer is switched on initially -> get the total listings count
    await this._updateTotalListingsCount();

    // 2. By checking what the listings count is -> set the different price check timers
    if (this.listingsCount > 200 && this.listingsCount <= 500) {
      this.priceCheckIntervalTime = 14400000; // 4 hours
    } else if (this.listingsCount > 500 && this.listingsCount <= 1000) {
      this.priceCheckIntervalTime = 18000000; // 5 hours
    } else if (this.listingsCount > 1000 && this.listingsCount <= 2000) {
      this.priceCheckIntervalTime = 21600000; // 6 hours
    } else if (this.listingsCount > 2000) {
      this.priceCheckIntervalTime = 28800000; // 8 hours
    } 

    // 2.1 Ebay repricer timer is half an hour less than the price checker
    this.ebayRepricerIntervalTime = this.priceCheckIntervalTime - 1800000; 

    // 2.2 Price refactor timer is then minutes less than the ebay repricer
    this.refactorPricesIntervalTime = this.ebayRepricerIntervalTime - 600000;

    // 3. Add a global variable to track the next Ebay repricer run
    global.nextEbayRepricerRun = moment().add(this.ebayRepricerIntervalTime, 'ms').format("DD/MM/YYYY, h:mm:ss a");

    // 4. If the Ebay repricer cycle is to be switched on
    if (value) {
      // 4.1 Send back to the renderer process that the cycle has started and the next time it will reprice on Ebay
      this.mainWindow.webContents.send('update-ebay-repricer-time', { running: value, status: global.nextEbayRepricerRun });

      // 4.2 Run the get prices function 5 minutes after the repricer is started and then at the specified time
      this.priceCheckerTimeout = setTimeout(() => {
        this._runPriceChecker();
      }, 300000); // 5 minutes

      // 4.3 Start the cycle for all three repricer functions
      this.priceCheckInterval = setInterval(this._handlePriceCheckInterval, this.priceCheckIntervalTime);
      this.ebayRepricerInterval = setInterval(this._handleEbayRepricerInterval, this.ebayRepricerIntervalTime);
      this.refactorPricesInterval = setInterval(this._handleRefactorPricesInterval, this.refactorPricesIntervalTime);

      // 4.4 Update the listings count every 10 minutes
      setInterval(this._updateTotalListingsCount, 600000);

      global.nucleus.track("SWITCH_EBAY_REPRICER_ON", {
        description: 'The user has switched the Ebay Repricer ON.',
        email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
      });

    } else {
      // 5. If the repricer is to be switched off -> clear all intervals
      clearInterval(this.priceCheckInterval);
      clearInterval(this.refactorPricesInterval);
      clearInterval(this.ebayRepricerInterval);
      clearTimeout(this.priceCheckerTimeout);
      global.nucleus.track("SWITCH_EBAY_REPRICER_OFF", {
        description: 'The user has switched the Ebay Repricer OFF.',
        email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
      });
    }
  }

  _updateTotalListingsCount = async () => {
    this.listingsCount = await global.knex('tbl_listings')
      .select()
      .then(rows => rows.length)
      .catch(err => global.appLog.error(err));
  }

  _handlePriceCheckInterval = () => {
    // 1. Run the price checker immediately
    this._runPriceChecker();

    // 2. Check how many listings there are -> if the total number entered in a different count group -> update the timers accordingly
    if (this.listingsCount > 0 && this.listingsCount <= 200) {
      if (this.priceCheckIntervalTime !== 14400000) {
        this.priceCheckIntervalTime = 14400000;
        clearInterval(this.priceCheckInterval);
        this.priceCheckInterval = setInterval(this._handlePriceCheckInterval, this.priceCheckIntervalTime);
      }
    } else if (this.listingsCount > 200 && this.listingsCount <= 500) {
      if (this.priceCheckIntervalTime !== 14400000) {
        this.priceCheckIntervalTime = 14400000;
        clearInterval(this.priceCheckInterval);
        this.priceCheckInterval = setInterval(this._handlePriceCheckInterval, this.priceCheckIntervalTime);
      }
    } else if (this.listingsCount > 500 && this.listingsCount <= 1000) {
      if (this.priceCheckIntervalTime !== 18000000) {
        this.priceCheckIntervalTime = 18000000;
        clearInterval(this.priceCheckInterval);
        this.priceCheckInterval = setInterval(this._handlePriceCheckInterval, this.priceCheckIntervalTime);
      }
    } else if (this.listingsCount > 1000 && this.listingsCount <= 2000) {
      if (this.priceCheckIntervalTime !== 21600000) {
        this.priceCheckIntervalTime = 21600000;
        clearInterval(this.priceCheckInterval);
        this.priceCheckInterval = setInterval(this._handlePriceCheckInterval, this.priceCheckIntervalTime);
      }
    } else if (this.listingsCount > 2000) {
      if (this.priceCheckIntervalTime !== 28800000) {
        this.priceCheckIntervalTime = 28800000;
        clearInterval(this.priceCheckInterval);
        this.priceCheckInterval = setInterval(this._handlePriceCheckInterval, this.priceCheckIntervalTime);
      }
    }
  }

  _handleEbayRepricerInterval = () => {
    // 1. Run the Ebay repricer every time the interval is invoked
    this._runEbayRepricer();

    // 2. Compare the current interval time and the one based on the price check interval -> if there is a difference clear the current interval and create the new one
    const previousEbayRepricerIntervalTime = this.ebayRepricerIntervalTime;
    this.ebayRepricerIntervalTime = this.priceCheckIntervalTime - 1800000;

    if (previousEbayRepricerIntervalTime !== this.ebayRepricerIntervalTime) {
      clearInterval(this.ebayRepricerInterval);
      this.ebayRepricerInterval = setInterval(this._handleEbayRepricerInterval, this.ebayRepricerIntervalTime);
    }
  }

  _handleRefactorPricesInterval = () => {
    // 1. Run the Ebay repricer every time the interval is invoked
    this._runPriceRefactoring();

    // 2. Compare the current interval time and the one based on the ebay repricer interval -> if there is a difference clear the current interval and create the new one
    const previousRefactorPricesIntervalTime = this.refactorPricesIntervalTime;
    this.refactorPricesIntervalTime = this.ebayRepricerIntervalTime - 600000; // -10 minutes

    if (previousRefactorPricesIntervalTime !== this.refactorPricesIntervalTime) {
      clearInterval(this.refactorPricesInterval);
      this.refactorPricesInterval = setInterval(this._handleRefactorPricesInterval, this.refactorPricesIntervalTime);
    }
  }

  _runPriceChecker = () => {
    const connectionStatus = isOnline();
    if (connectionStatus) {
      this.repricerHelper.getPrices();
    } else {
      global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
    }
  }

  _runEbayRepricer = () => {
    if (!global.ebayRepricerIntervalIsRunning) {
      const connectionStatus = isOnline();
      if (connectionStatus) {
        this.initiateReprice();
      } else {
        global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
      }
    }

    global.nextEbayRepricerRun = moment().add(this.ebayRepricerIntervalTime, 'ms').format("DD/MM/YYYY, h:mm:ss a");
    this.mainWindow.webContents.send('update-ebay-repricer-time', { status: global.nextEbayRepricerRun });
  }

  _runPriceRefactoring = () => {
    if (!global.refactorPricesIntervalIsRunning) {
      this.repricerHelper.refactorPrices();
    }
  }

  /*
   * Function that checks if an Ebay cookie file exists
   * if it does exist, it either returns the contents of the cookie file
   * or it checks whether there is a sessionID inside the cookie file, then returns true/false
   * avoids the need of logging in in the background
   */
  canLogIn = async (returnCookies = false, country = 'ALL') => {
    if (country === 'ALL') {
      // Check if the bot can login inside all Ebay marketplaces
      const cookieFiles = await this.checkIfCookieFileExists().then(async cookieFiles => {
          const marketplaces = {
            US: false,
            UK: false,
            DE: false,
            CA: false,
            IT: false,
          };
          // If there is a US cookie file
          if (cookieFiles.US) {
            // Check if the return of the cookie file is requested
            if (returnCookies) {
              // If yes, read US cookie file and return the content of it
              const fileContent = await this.readCookieFile(true, 'US');
              marketplaces.US = fileContent;
            } else {
              // If not, just read US cookie file and make sure there is a session id
              const hasSessionId = await this.readCookieFile(false, 'US');
              marketplaces.US = hasSessionId;
            }
          }

          // If there is a UK cookie file
          if (cookieFiles.UK) {
            // Check if the return of the cookie file is requested
            if (returnCookies) {
              // If yes, read UK cookie file and return the content of it
              const fileContent = await this.readCookieFile(true, 'UK');
              marketplaces.UK = fileContent;
            } else {
              // If not, just read UK cookie file and make sure there is a session id
              const hasSessionId = await this.readCookieFile(false, 'UK');
              marketplaces.UK = hasSessionId;
            }
          }

          // If there is a DE cookie file
          if (cookieFiles.DE) {
            // Check if the return of the cookie file is requested
            if (returnCookies) {
              // If yes, read DE cookie file and return the content of it
              const fileContent = await this.readCookieFile(true, 'DE');
              marketplaces.DE = fileContent;
            } else {
              // If not, just read DE cookie file and make sure there is a session id
              const hasSessionId = await this.readCookieFile(false, 'DE');
              marketplaces.DE = hasSessionId;
            }
          }

          // If there is a CA cookie file
          if (cookieFiles.CA) {
            // Check if the return of the cookie file is requested
            if (returnCookies) {
              // If yes, read DE cookie file and return the content of it
              const fileContent = await this.readCookieFile(true, 'CA');
              marketplaces.CA = fileContent;
            } else {
              // If not, just read DE cookie file and make sure there is a session id
              const hasSessionId = await this.readCookieFile(false, 'CA');
              marketplaces.CA = hasSessionId;
            }
          }

          // If there is a IT cookie file
          if (cookieFiles.IT) {
            // Check if the return of the cookie file is requested
            if (returnCookies) {
              // If yes, read IT cookie file and return the content of it
              const fileContent = await this.readCookieFile(true, 'IT');
              marketplaces.IT = fileContent;
            } else {
              // If not, just read IT cookie file and make sure there is a session id
              const hasSessionId = await this.readCookieFile(false, 'IT');
              marketplaces.IT = hasSessionId;
            }
          }

          return marketplaces;
        }
      );

      return cookieFiles;
    }

    // If it is a specific country whose cookie file is requested -> check for the existence of all of the,
    const cookieFile = await this.checkIfCookieFileExists().then(async cookieFiles => {
        // If the cookie file of the specified country exists
        if (cookieFiles[country]) {
          // Check if the return of the cookie file is requested
          if (returnCookies) {
            // If yes, read the country`s cookie file and return the content of it
            const fileContent = await this.readCookieFile(true, country);
            return fileContent;
          }

          // If not, just read country`s cookie file and make sure there is a session id
          const hasSessionId = await this.readCookieFile(false, country);
          return hasSessionId;
        }
        return false;
      }
    );

    return cookieFile;
  };

  /*
   * Used for all user-driven Ebay logins
   */
  logIn = async country => {
    try {
      // If the this.ebayLoginBrowser is false -> the browser is not currently opened and can be opened safely
      if (!this.ebayLoginBrowser) {
        // this.ebayLoginBrowser is opened via puppeteer.launch and is no longer 'false'
        this.ebayLoginBrowser = await puppeteer.launch({
          headless: false,
          executablePath: Util.getChromiumExecPath(puppeteer),
          slowMo: 100,
          devtools: false,
          defaultViewport: null,
          ignoreDefaultArgs: ['--enable-automation'],
          args: [
            '--disable-webgl'
          ],
        });

        // Listen for the 'disconnected' -> when the browser closes -> update the tracking variable
        this.ebayLoginBrowser.on('disconnected', () => {
          this.ebayLoginBrowser = false;
        });

        const page = await this.ebayLoginBrowser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setDefaultNavigationTimeout(0);

        if (global.proxyUsername !== '' && global.proxyPassword !== '') {
          await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
        }

        // Turn on request interception for the login session, so we can save the user`s username/password
        await page.setRequestInterception(true);
        // Listen for every request that is sent by the browser to a server
        page.on('request', request => {
          // Check if a request is a login POST request
          if (
            request.url() === 'https://www.ebay.com/signin/s' ||
            request.url() === 'https://www.ebay.co.uk/signin/s' ||
            request.url() === 'https://www.ebay.de/signin/s' ||
            request.url() === 'https://www.ebay.ca/signin/s' ||
            request.url() === 'https://www.ebay.it/signin/s'
          ) {
            // Track which marketplace we are logging in, so the right DB ebay account can be added/updated
            let accountMarketplace;

            if (request.url() === 'https://www.ebay.com/signin/s') {
              accountMarketplace = 'ebay_us';
            } else if (request.url() === 'https://www.ebay.co.uk/signin/s') {
              accountMarketplace = 'ebay_uk';
            } else if (request.url() === 'https://www.ebay.de/signin/s') {
              accountMarketplace = 'ebay_de';
            } else if (request.url() === 'https://www.ebay.ca/signin/s') {
              accountMarketplace = 'ebay_ca';
            } else if (request.url() === 'https://www.ebay.it/signin/s') {
              accountMarketplace = 'ebay_it';
            }

            // Get the POST request body params
            const params = new URLSearchParams(request.postData());
            const userid = params.get('userid');
            const pass = params.get('pass');

            // If there is no account for 'Ebay' add it, else -> update it
            global
              .knex('tbl_users')
              .where({ account: accountMarketplace })
              .then(rows => {
                if (rows.length === 0) {
                  global
                    .knex('tbl_users')
                    .insert({
                      account: accountMarketplace,
                      email: userid,
                      password: pass
                    })
                    .catch(error => global.appLog.error(`${error} - inserting Ebay email and password - inside ebay.logIn - line 105`));
                } else {
                  global
                    .knex('tbl_users')
                    .where({ account: accountMarketplace })
                    .update({
                      email: userid,
                      password: pass
                    })
                    .catch(error => global.appLog.error(`${error} - updating Ebay username and password -  inside ebay.logIn - line 118`));
                }
                return null;
              })
              .catch(error => global.appLog.error(`${error} - trying to enter Ebay username and password in the database - inside page.on(request) ebay.logIn - line 123 `));

            // Continue the request as the email and password has been saved to the DB
            request
              .continue()
              .catch(error => global.appLog.error(`${error} - continuing unnecessary requests - inside ebay.logIn - line 130`));
          } else {
            // Continue as it is not a signin post request at all
            request
              .continue()
              .catch(error => global.appLog.error(`${error} - continuing unnecessary requests - inside ebay.logIn - line 130`));
          }
        });        

        // Check which Ebay seller hub domain we are logging in -> go to the correct one
        if (country === 'US') {
          // await page.goto('https://www.ebay.com', { waitUntil: 'networkidle0' });
          await page.goto('https://www.ebay.com', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'UK') {
          // await page.goto('https://www.ebay.co.uk', { waitUntil: 'networkidle0' });
          await page.goto('https://www.ebay.co.uk', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'DE') {
          // await page.goto('https://www.ebay.de', { waitUntil: 'networkidle0' });
          await page.goto('https://www.ebay.de', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'CA') {
          // await page.goto('https://www.ebay.ca', { waitUntil: 'networkidle0' });
          await page.goto('https://www.ebay.ca', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'IT') {
          // await page.goto('https://www.ebay.it', { waitUntil: 'networkidle0' });
          await page.goto('https://www.ebay.it', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        }

        await page.waitForSelector('#gh-ug a', { timeout: 0 });
        // Await for the sign in button to appear on the page
        const signInButton = await page.$('#gh-ug a');
        // Assume the user is not logged in
        let loggedIn = false;

        // If the sign in button is not null -> it exists on the page -> it needs to be clicked
        if (signInButton !== null) {
          await signInButton.click();
          // Wait for the Sign in page to appear by waiting for the 'Sign in' button inside it to appear
          await page.waitForSelector('#sgnBt', { timeout: 0 });
        } else {
          // If there is no sign in button -> the user is already logged in
          loggedIn = true;
        }

        // If not logged in wait for user-driven log in and then the appearance of logout button
        if (!loggedIn) {
          /* Wait for the 'Hello `username` on ebay top bar
          * timeout is 0 as the user might take a while, so the bot needs to wait as long as necessary
          */
          await page.waitForSelector('button#gh-ug', { timeout: 0 });
          // Once it appears, hover over the 'Hello `username` on ebay top bar so that the sign out button can appear
          await page.hover('li#gh-eb-u');
          // If the 'Sign out' button appears -> here we know that the user has logged in - #gh-uo-a is the logout button
          await page.waitForSelector('div#gh-eb-u-o');

          // Save page cookies to a file, so they can be used for logins later
          await this.writeCookieFile(page);

          // Close the login browser as it is not needed anymore
          await this.ebayLoginBrowser.close();
          // Return true as it will be sent back to the renderer process to confirm successful login
          return true;
        }
        // If the user has valid cookies and is logged in -> close the browser
        await this.ebayLoginBrowser.close();
        // Return true as it will be sent back to the renderer process to confirm successful login
        return true;
      }
    } catch (error) {
      global.appLog.error(`${error} - inside ebay.logIn - line 207`);
      this.ebayLoginBrowser.close();
      return false;
    }
  };

  logOut = async country => {
      this.deleteCookieFile(country);
      // this.mainWindow.webContents.send('check-ebay-login', cookieFileDeleted);

      // Then the DB entry with the credentials has to be deleted -> delete the correct one
      let countryToDeleteCredentials;
      if (country === 'US') {
        countryToDeleteCredentials = 'ebay_us';
      } else if (country === 'UK') {
        countryToDeleteCredentials = 'ebay_uk';
      } else if (country === 'DE') {
        countryToDeleteCredentials = 'ebay_de';
      } else if (country === 'CA') {
        countryToDeleteCredentials = 'ebay_ca';
      } else if (country === 'IT') {
        countryToDeleteCredentials = 'ebay_it';
      }

      global.knex('tbl_users')
      .where({ account: countryToDeleteCredentials })
      .del()
      .catch(error => global.appLog.error(`${error} - inside ipcListeners - logout-ebay - line 742`));

      const marketplaces = await this.canLogIn();

      this.mainWindow.webContents.send('check-ebay-login', {
        US: marketplaces.US,
        UK: marketplaces.UK,
        DE: marketplaces.DE,
        CA: marketplaces.CA,
        IT: marketplaces.IT
      });
  };

  /*
   * Checks if an Ebay cookie file exists and returns true/false
   */
  checkIfCookieFileExists = async () => {
    const US = await new Promise((resolve, reject) => {
      return fs.access(global.ebayUSCookiePath, fs.F_OK, err => {
        if (err) {
          if (err && err.code === 'ENOENT') {
            resolve(false);
          } else {
            global.appLog.info(err);
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });

    const UK = await new Promise((resolve, reject) => {
      return fs.access(global.ebayUKCookiePath, fs.F_OK, err => {
        if (err) {
          if (err && err.code === 'ENOENT') {
            resolve(false);
          } else {
            global.appLog.info(err);
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });

    const DE = await new Promise((resolve, reject) => {
      return fs.access(global.ebayDECookiePath, fs.F_OK, err => {
        if (err) {
          if (err && err.code === 'ENOENT') {
            resolve(false);
          } else {
            global.appLog.info(err);
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });

    const CA = await new Promise((resolve, reject) => {
      return fs.access(global.ebayCACookiePath, fs.F_OK, err => {
        if (err) {
          if (err && err.code === 'ENOENT') {
            resolve(false);
          } else {
            global.appLog.info(err);
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });

    const IT = await new Promise((resolve, reject) => {
      return fs.access(global.ebayITCookiePath, fs.F_OK, err => {
        if (err) {
          if (err && err.code === 'ENOENT') {
            resolve(false);
          } else {
            global.appLog.info(err);
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });
   
    return { US, UK, DE, CA, IT };
  };

  /*
   * Delete Ebay cookie file -> logging out of Ebay account
   */
  deleteCookieFile = (country = 'US') => {

    let cookieFilePath = global.ebayUSCookiePath;

    if (country === 'UK') {
      cookieFilePath = global.ebayUKCookiePath;
    } else if (country === 'DE') {
      cookieFilePath = global.ebayDECookiePath;
    } else if (country === 'CA') {
      cookieFilePath = global.ebayCACookiePath;
    } else if (country === 'IT') {
      cookieFilePath = global.ebayITCookiePath;
    }

    try {
       fs.unlinkSync(cookieFilePath, error => {
        if (error) {
          global.appLog.error(`Error while deleting Ebay ${country} cookie file - ${error}`);
          return false;
        }
        return true;
      });
    } catch (error) {
      global.appLog.error(`${error} - inside ebay.deleteCookie - line 371`);
    }
  };

  /*
   * Reads the Ebay Cookie File and either returns the whole contents of the cookie file
   * or returns true/false representing whether the file contains an Ebay DH_HID
   */
  readCookieFile = async (returnCookies = false, country = 'US') => {
    // Query the file content of the specified country`s cookie file
    const fileContent = await new Promise((resolve, reject) => {
      // Default cookie path is US
      let cookieFilePath = global.ebayUSCookiePath;

      if (country === 'UK') {
        // If UK is specified, change to it
        cookieFilePath = global.ebayUKCookiePath;
      } else if (country === 'DE') {
        // If DE is specified, change to it
        cookieFilePath = global.ebayDECookiePath;
      } else if (country === 'CA') {
        // If CA is specified, change to it
        cookieFilePath = global.ebayCACookiePath;
      } else if (country === 'IT') {
        // If CA is specified, change to it
        cookieFilePath = global.ebayITCookiePath;
      }

      // This function reads and returns the content of the cookie file -> it is parsed as JSON
      return fs.readFile(cookieFilePath, { encoding: 'utf8' }, (err, data) => {
          if (err) {
            return reject(err);
          }

          return resolve(JSON.parse(data));
        }
      );
    });

    // If returnCookies parameter is true -> return the whole content of the file
    if (returnCookies) {
      return fileContent;
    }

    // If returnCookies parameter is false -> just check if the cookie file contains a session id -> return it
    let hasSessionId = false;

    await fileContent.forEach(item => {
      if (item.name === 'npii') {
        hasSessionId = true;
      }
    });

    return hasSessionId;
  };

  /*
   * Gets the cookies from the Ebay session and saves/overwrites the cookie file
   */
  writeCookieFile = async page => {
    const pageURL = page.url();

    if (pageURL.includes('ebay.com')) {
      global.ebayCookies.US = await page.cookies(
        'https://ebay.com',
        'https://www.ebay.com',
        'https://signin.ebay.com',
        'https://pages.ebay.com',
        'https://rover.ebay.com',
        'https://gha.ebay.com',
        'https://ocsrest.ebay.com',
        'https://svcs.ebay.com',
        'https://pulsar.ebay.com',
      );

      if (global.ebayCookies.US.length > 0) {
        fs.writeFileSync(
          global.ebayUSCookiePath,
          JSON.stringify(global.ebayCookies.US),
          'utf-8'
        );
      }
    }
    
    if (pageURL.includes('ebay.co.uk')) {
      global.ebayCookies.UK = await page.cookies(
        'https://ebay.co.uk',
        'https://www.ebay.co.uk',
        'https://signin.ebay.co.uk',
        'https://gha.ebay.co.uk',
      );

      if (global.ebayCookies.UK.length > 0) {
        fs.writeFileSync(
          global.ebayUKCookiePath,
          JSON.stringify(global.ebayCookies.UK),
          'utf-8'
        );
      }
    }

    if (pageURL.includes('ebay.de')) {
      global.ebayCookies.DE = await page.cookies(
        'https://ebay.de',
        'https://www.ebay.de',
        'https://signin.ebay.de',
        'https://gha.ebay.de',
      );

      if (global.ebayCookies.DE.length > 0) {
        fs.writeFileSync(
          global.ebayDECookiePath,
          JSON.stringify(global.ebayCookies.DE),
          'utf-8'
        );
      }
    }

    if (pageURL.includes('ebay.ca')) {
      global.ebayCookies.CA = await page.cookies(
        'https://ebay.ca',
        'https://www.ebay.ca',
        'https://signin.ebay.ca',
        'https://gha.ebay.ca',
      );

      if (global.ebayCookies.CA.length > 0) {
        fs.writeFileSync(
          global.ebayCACookiePath,
          JSON.stringify(global.ebayCookies.CA),
          'utf-8'
        );
      }
    }

    if (pageURL.includes('ebay.it')) {
      global.ebayCookies.IT = await page.cookies(
        'https://ebay.it',
        'https://www.ebay.it',
        'https://signin.ebay.it',
        'https://gha.ebay.it',
      );

      if (global.ebayCookies.IT.length > 0) {
        fs.writeFileSync(
          global.ebayITCookiePath,
          JSON.stringify(global.ebayCookies.IT),
          'utf-8'
        );
      }
    }

  };

  /*
   * This is the function that is responsible for all Ebay Repricer settings actions
   * if more actions are added later -> add them here
   */
  settingsAction = async info => {

    const row = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(row => row)
    .catch(error => global.appLog.error(`${error} - inside case 'query-ebay-settings' -  ebay.settingsAction - line 576`));

    // Determine what kind of action we need to handle
    switch (info.action) {
      case 'change-settings': 
        // If there is such an account DB entry
        if (row !== undefined) {
          // If the settings row is not null
          if (row.settings !== null) {
            // Parse the JSON settings value to a JS object
            const settings = JSON.parse(row.settings);
            // Change the settings ebay_refactor_percentage value to a new value provided by the rendered process

            settings.ebay = {...settings.ebay, ...info.value};
            // Update the DB entry with the new setting
            await global
            .knex('tbl_users')
            .where({ account: 'dalio' })
            .update({
              settings: JSON.stringify(settings)
            })
            .catch(error => global.appLog.error(`${error} - inside ebay.settingsAction - line 520`));

            this.mainWindow.webContents.send('ebay-settings', settings.ebay);

            this.repricerHelper.refactorPrices();

          }
        }
      
        break;
      // This action queries all of the Ebay settings and returns them
      case 'query-ebay-settings':
        if (row !== undefined) {
          if (row.settings !== null) {
            const settings = JSON.parse(row.settings);

            // Check if there is an 'ebay' object key in the settings object
            if (settings.ebay !== undefined) {
              let needsUpdate = false;
              // Check if certain setting keys have been declared (if not -> declare them)
              if (settings.ebay.use_refactor_percentage === undefined) {
                settings.ebay.use_refactor_percentage = '0';
                needsUpdate = true;
              }

              if (settings.ebay.add_vat === undefined || settings.ebay.vat_percentage === undefined) {
                settings.ebay.add_vat = '0';
                settings.ebay.vat_percentage = 20;
                needsUpdate = true;
              }

              if (needsUpdate) {
                await global.knex('tbl_users')
                .where({ account: 'dalio' })
                .update({ settings: JSON.stringify(settings) })
                .catch(error => global.appLog.error(`${error} - inside ebay.settingsAction - line 1093`));
              }

              this.mainWindow.webContents.send('ebay-settings', settings.ebay);
            } else {

              if (settings.ebay === undefined) {
                settings.ebay = {};
              }
          
              settings.ebay.refactor_percentage = 15;
              settings.ebay.add_state_tax = '0';
              settings.ebay.add_vat = '0';
              settings.ebay.vat_percentage = 20;
              settings.ebay.state_tax_percentage = 6;
              settings.ebay.add_ebay_fee = '0';
              settings.ebay.ebay_fee = 11;
              settings.ebay.add_paypal_fee = '0';
              settings.ebay.paypal_fee_percentage = 2.9;
              settings.ebay.paypal_fixed_fee = 0.30;
              settings.ebay.refactor_fixed_sum = 0;
              settings.ebay.use_refactor_percentage = 0;

              await global .knex('tbl_users')
              .where({ account: 'dalio' })
              .update({
                settings: JSON.stringify(settings)
              })
              .catch(error => global.appLog.error(`${error} - inside ebay.settingsAction - line 570`));

              this.mainWindow.webContents.send('ebay-settings', settings.ebay);
            }
          }
        }

        break;  
      default:
      // do nothing
    }
  };

  inventoryManagerSettingsAction = async info => {
    // Determine what kind of action we need to handle
    switch (info.action) {
      case 'change-inventory-manager-settings':
        global
        .knex('tbl_users')
        .where({ account: 'dalio' })
        .first()
        .then(row => {
          // If there is such an account DB entry
          if (row !== undefined) {
            // If the settings row is not null
            if (row.settings !== null) {
              // Parse the JSON settings value to a JS object
              const settings = JSON.parse(row.settings);

              settings.ebay_inventory_manager = {...settings.ebay_inventory_manager, ...info.value};
              // Update the DB entry with the new setting
              global
                .knex('tbl_users')
                .where({ account: 'dalio' })
                .update({
                  settings: JSON.stringify(settings)
                })
                .catch(error => global.appLog.error(`${error} - inside ebay.inventoryManagerSettingsAction - line 1177`));

              this.mainWindow.webContents.send('ebay-inventory-manager-settings', settings.ebay_inventory_manager);
            }
          }
          return null;
        })
        .catch(error => global.appLog.error(`${error} - inside ebay.inventoryManagerSettingsAction - line 1185`));
        break;
      // This action queries all of the Ebay settings and returns them
      case 'query-inventory-manager-settings':
        global
          .knex('tbl_users')
          .where({ account: 'dalio' })
          .first()
          .then(row => {
            if (row !== undefined) {
              if (row.settings !== null) {
                const settings = JSON.parse(row.settings);

                // Check if there is an 'ebay_inventory_manager' object key in the settings object
                if (settings.ebay_inventory_manager !== undefined) {
                  let needsUpdate = false;

                  // Check if certain setting keys have been declared (if not -> declare them)
                  if (settings.ebay_inventory_manager.manage_inventory === undefined) {
                    settings.ebay_inventory_manager.manage_inventory = '0';
                    needsUpdate = true;
                  }

                  // Check if certain setting keys have been declared (if not -> declare them)
                  if (settings.ebay_inventory_manager.out_of_stock_action === undefined) {
                    settings.ebay_inventory_manager.out_of_stock_action = '1';
                    needsUpdate = true;
                  }

                  if (settings.ebay_inventory_manager.lower_quantity_threshold === undefined) {
                    settings.ebay_inventory_manager.lower_quantity_threshold = 1;
                    needsUpdate = true;
                  }

                  if (settings.ebay_inventory_manager.higher_quantity_threshold === undefined) {
                    settings.ebay_inventory_manager.higher_quantity_threshold = 10;
                    needsUpdate = true;
                  }

                  if (settings.ebay_inventory_manager.title_similarity_threshold === undefined) {
                    settings.ebay_inventory_manager.title_similarity_threshold = 90;
                    needsUpdate = true;
                  }

                  if (needsUpdate) {
                    global
                    .knex('tbl_users')
                    .where({ account: 'dalio' })
                    .update({
                      settings: JSON.stringify(settings)
                    })
                    .catch(error => global.appLog.error(`${error} - inside ebay.inventoryManagerSettingsAction - line 1224`));
                  }

                  this.mainWindow.webContents.send('ebay-inventory-manager-settings', settings.ebay_inventory_manager);
                } else {

                  if (settings.ebay_inventory_manager === undefined) {
                    settings.ebay_inventory_manager = {};
                  }
             
                  settings.ebay_inventory_manager.manage_inventory = '0';
                  settings.ebay_inventory_manager.out_of_stock_action = '1';
                  settings.ebay_inventory_manager.lower_quantity_threshold = 1;
                  settings.ebay_inventory_manager.higher_quantity_threshold = 10;
                  settings.ebay_inventory_manager.title_similarity_threshold = 90;

                  global
                  .knex('tbl_users')
                  .where({ account: 'dalio' })
                  .update({
                    settings: JSON.stringify(settings)
                  }).then(() => {
                    this.mainWindow.webContents.send('ebay-inventory-manager-settings', settings.ebay_inventory_manager);
                    return null;
                  }).catch(error => global.appLog.error(`${error} - inside ebay.inventoryManagerSettingsAction - line 1247`));
                }
              }
            }
            return null;
          })
          .catch(error => global.appLog.error(`${error} - inside case 'query-inventory-manager-settings' -  ebay.inventoryManagerSettingsAction - line 1256`));
        break;  
      default:
      // do nothing
    }
  };

  initiateReprice = async () => {
    // We track on a global level that the Ebay Repricer is running -> if yes, it will not be started again by the timers
    global.ebayRepricerIntervalIsRunning = true;
    global.appLog.info(`eBay reprice initiated.`);
    const repriceStartedAt = await moment().format('DD/MM/YYYY HH:mm:ss');

    this.mainWindow.webContents.send('update-ebay-repricer-time', { status: 'Running now...'});
    this.mainWindow.webContents.send('update-ebay-repricer-notification', { status: true, started_at: repriceStartedAt });
    
    // This variable will handle SQLite queries of the listings to be repriced -> either all of them or just the first 100
    let repriceKnexQuery;
    // Account status of 1 means paid subscription
    if (global.accountStatus === '1') {
      // If the user has a paid subscription -> no limit
      repriceKnexQuery = global.knex.select().from('tbl_listings');
    } else {
      // If the user does not have a paid subscription -> limit repricing to a 100 listings
      repriceKnexQuery = global.knex.select().from('tbl_listings').limit(100);
    }

    // This empty object will contain all Ebay listings queried -> simple and variants
    const listingsToReprice = {
      US: {
        simple: [],
        variants: {}
      },
      UK: {
        simple: [],
        variants: {}
      },
      DE: {
        simple: [],
        variants: {}
      },
      CA: {
        simple: [],
        variants: {}
      },
      IT: {
        simple: [],
        variants: {}
      }
    };

    // Run the SQLite query defined above
    return repriceKnexQuery.then(async listings => {
        // Iterate through each one of the returned listings from the DB
        await listings.forEach(listing => {
          // Pick the ones that are sold on Ebay
          if (listing.store === 'ebay') {
            /* Do not consider for reprice, listings that are not connected to a source
            * Listings with a new_price equal to null are not yet connected to a source or they have not been price checked yet
            */
            if (listing.supplier !== null && listing.new_price !== null && listing.refactored_price !== null && listing.supplier_url !== null) {
              // Filter out the ones that have variations as they are just containers for their variations and the ones that are paused from repricing
              if (listing.has_variations === '0' && listing.pause_listing !== '1') {
                // If the refactored price (source price + (source price * profit margin)) differs from the price on the selling platform ? work with it : just pass it
                // if (listing.refactored_price !== listing.price) {
                  let escapedLog = '';
                  let refactorSettingsMessage = '';

                  if (listing.use_global_refactor_settings == '0') {
                    refactorSettingsMessage = 'The price is based on the local reprice formula of the listing.'
                  } else {
                    refactorSettingsMessage = 'The price is based on the global reprice formula for all listings.'
                  }

                  if (listing.price !== null) {
                    if (listing.product_availability === 'OUT_OF_STOCK' || listing.product_availability === '0') {
                      // escapedLog = encodeURI(
                      //   `Listing '${listing.item_name}' is out of stock and its price will be increased multiple times in order to prevent customers from ordering it. The source price of the listing is ${listing.new_price}. Current price on Ebay is ${listing.price}. The new price will be ${listing.refactored_price}. ${refactorSettingsMessage}`
                      // );
                      escapedLog = `Is out of stock and action will be taken`;
                    } else {
                      // escapedLog = encodeURI(
                      //   `Listing '${listing.item_name}' will be repriced. The source price of the listing is ${listing.new_price}. Current price on Ebay is ${listing.price}. The new price will be ${listing.refactored_price}. ${refactorSettingsMessage}`
                      // );
                      escapedLog = `Will be repriced. The source price of the listing is ${listing.new_price}. Current price on Ebay is ${listing.price}. The new price will be ${listing.refactored_price}. ${refactorSettingsMessage}`;
                    }
                  } else {
                    // escapedLog = encodeURI(
                    //   `Listing '${listing.item_name}' will be repriced for the first time. The source price of the listing is ${listing.new_price}. The price on Ebay will be ${listing.refactored_price}. ${refactorSettingsMessage}`
                    // );
                    escapedLog = `Will be repriced for the first time. The source price of the listing is ${listing.new_price}. The price on Ebay will be ${listing.refactored_price}. ${refactorSettingsMessage}`;
                  }

                  // global.log.warn(escapedLog);
                  // Util.insertListingLog(listing, escapedLog, 'info');

                  // Destructure these object properties from the 'listing' object
                  const { store_url, is_variant, parent_listing_id } = listing;

                  /* 
                  * If the listing is not a variant
                  * it is a simple listing
                  * check on which Ebay marketplace it is sold on
                  * add it to that corresponding marketplace array
                  */
                  if (is_variant === '0') {
                    if (store_url.includes('ebay.com')) {
                      listingsToReprice.US.simple.push(listing);
                    } else if (store_url.includes('ebay.co.uk')) {
                      listingsToReprice.UK.simple.push(listing);
                    } else if (store_url.includes('ebay.de')) {
                      listingsToReprice.DE.simple.push(listing);
                    } else if (store_url.includes('ebay.ca')) {
                      listingsToReprice.CA.simple.push(listing);
                    } else if (store_url.includes('ebay.it')) {
                      listingsToReprice.IT.simple.push(listing);
                    }

                    // Else if the listing is a variant -> group it with all other variants with the same parent and add it to the object
                  } else if (is_variant === '1') {
                    if (store_url.includes('ebay.com')) {
                      // If there is no other variant array with the same parent id -> create the empty array
                      if (listingsToReprice.US.variants[parent_listing_id] === undefined) {
                        listingsToReprice.US.variants[parent_listing_id] = [];
                      }
                      // Push the variant listing to the appropriate array
                      listingsToReprice.US.variants[parent_listing_id].push(listing);
                    } else if (store_url.includes('ebay.co.uk')) {
                      // If there is no other variant array with the same parent id -> create the empty array
                      if (listingsToReprice.UK.variants[parent_listing_id] === undefined) {
                        listingsToReprice.UK.variants[parent_listing_id] = [];
                      }
                      // Push the variant listing to the appropriate array
                      listingsToReprice.UK.variants[parent_listing_id].push(listing);
                    } else if (store_url.includes('ebay.de')) {
                      // If there is no other variant array with the same parent id -> create the empty array
                      if (listingsToReprice.DE.variants[parent_listing_id] === undefined) {
                        listingsToReprice.DE.variants[parent_listing_id] = [];
                      }
                      // Push the variant listing to the appropriate array
                      listingsToReprice.DE.variants[parent_listing_id].push(listing);
                    } else if (store_url.includes('ebay.ca')) {
                      // If there is no other variant array with the same parent id -> create the empty array
                      if (listingsToReprice.CA.variants[parent_listing_id] === undefined) {
                        listingsToReprice.CA.variants[parent_listing_id] = [];
                      }
                      // Push the variant listing to the appropriate array
                      listingsToReprice.CA.variants[parent_listing_id].push(listing);
                    } else if (store_url.includes('ebay.it')) {
                      // If there is no other variant array with the same parent id -> create the empty array
                      if (listingsToReprice.IT.variants[parent_listing_id] === undefined) {
                        listingsToReprice.IT.variants[parent_listing_id] = [];
                      }
                      // Push the variant listing to the appropriate array
                      listingsToReprice.IT.variants[parent_listing_id].push(listing);
                    }
                  }
                // }
              }
            }
          }
        });

        // To be used to track if there are Ebay listings to be repriced -> assume NO listings
        let repriceCheckStatus = false;

        // Check if any of the marketplaces have simple or variant listings that need repricing
        for (const [marketplace, marketplaceListings] of Object.entries(listingsToReprice)) {
          if (marketplaceListings.simple.length !== 0 || (Object.entries(marketplaceListings.variants).length !== 0 && marketplaceListings.variants.constructor === Object)) {
            // There are listings to be repriced -> either simple or variants
            repriceCheckStatus = true;
            await this.reprice(marketplace, marketplaceListings);
          }
        }

        // If yes, then call the reprice function -> else -> log that there is nothing to reprice
        if (!repriceCheckStatus) {
          const escapedLog = encodeURI(`Ebay reprice check made - there are no listings to reprice.`);
          await global.log.info(escapedLog);
        } 

        // The Ebay Repricer is no longer running -> so update the global variable
        global.ebayRepricerIntervalIsRunning = false;
        await this.mainWindow.webContents.send('update-ebay-repricer-time', { status: global.nextEbayRepricerRun });
        await this.mainWindow.webContents.send('update-ebay-repricer-notification', { status: false });
        await global.nucleus.track("EBAY-REPRICER-RAN", {
          description: 'The Ebay repricer ran.',
          email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
        });
        return null;
      }).catch(error => global.appLog.error(`${error} - inside ebay.initiateReprice - line 420`));
  };

  reprice = async (marketplace, marketplaceListings) => {
    try {
      this.repriceBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        slowMo: 30,
        defaultViewport: null,
        devtools: false,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--disable-webgl'
        ]
      });
      

      const page = await this.repriceBrowser.newPage();
      /* Make sure a page width is always set for the bot
      * this will make sure that the bot can manipulate the page as expected
      * as no selectors will be hidden due to mobile/tablet media queries
      */
      await page.setViewport({ width: 1280, height: 800 });
      await page.setDefaultNavigationTimeout(0);

      if (global.proxyUsername !== '' && global.proxyPassword !== '') {
        await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
      }

      /*
      * Check what marketplace has to be repriced 
      * pull the correct cookies and set them to the page
      */
     let canRepriceThisMarketplace = true;
     if (marketplace === 'US') {
       // Get the Ebay cookies from the file
       global.ebayCookies.US = await this.canLogIn(true, 'US');
       if (!global.ebayCookies.US) {
         canRepriceThisMarketplace = false;
       } else {
         await page.setCookie(...global.ebayCookies.US);
         await page.goto(`https://ebay.com/sh/lst/active?limit=200`, { waitUntil: 'networkidle0' });
       }
     } else if (marketplace === 'UK') {
       global.ebayCookies.UK = await this.canLogIn(true, 'UK');
       if (!global.ebayCookies.UK) {
         canRepriceThisMarketplace = false;
       } else {
         await page.setCookie(...global.ebayCookies.UK);
         await page.goto('https://ebay.co.uk/sh/lst/active?limit=200', { waitUntil: 'networkidle0' });
       }
     } else if (marketplace === 'DE') {
       global.ebayCookies.DE = await this.canLogIn(true, 'DE');
       if (!global.ebayCookies.DE) {
         canRepriceThisMarketplace = false;
       } else {
         await page.setCookie(...global.ebayCookies.DE);
         await page.goto('https://ebay.de/sh/lst/active?limit=200', { waitUntil: 'networkidle0' });
       }
     } else if (marketplace === 'CA') {
      global.ebayCookies.CA = await this.canLogIn(true, 'CA');
      if (!global.ebayCookies.CA) {
        canRepriceThisMarketplace = false;
      } else {
        await page.setCookie(...global.ebayCookies.CA);
        await page.goto('https://ebay.ca/sh/lst/active?limit=200', { waitUntil: 'networkidle0' });
      }
     } else if (marketplace === 'IT') {
      global.ebayCookies.IT = await this.canLogIn(true, 'IT');
      if (!global.ebayCookies.IT) {
        canRepriceThisMarketplace = false;
      } else {
        await page.setCookie(...global.ebayCookies.IT);
        await page.goto('https://ebay.it/sh/lst/active?limit=200', { waitUntil: 'networkidle0' });
      }
    }
     
     // If there are cookies for the current marketplace and can be repriced
     if (canRepriceThisMarketplace) {
        // If the login screen shows -> log in
        await EbayUtil.loginIfNecessary(page, marketplace);

        // Wait a certain amount of time before continuing (should be randomized in future)
        await page.waitFor(3000);

        await this._customizeListingsTable(page);

        const dalioAccount = await global.knex('tbl_users')
        .where({ account: 'dalio' })
        .first()
        .then(row => row)
        .catch(e => global.appLog.error(`${e} - in Ebay.manageInventory - line 1610`));

        const settings = JSON.parse(dalioAccount.settings);
  
        // If there are listings in one of the supported countries -> then go to the specific marketplace domain
        if (marketplaceListings.simple.length > 0) {

          // Find the total number of productpages in the current marketplace
          const totalNumberOfProductPages = await this._getTotalNumberOfPages(page);

          // If the reprice sees more than one page of products
          if (totalNumberOfProductPages > 1) {
            // Iterate the this._repriceProductsOnSinglePage function the amount of times necessary
            for (let i = 0; i < totalNumberOfProductPages; i++) {
              await this._repriceProductsOnSinglePage(page, marketplaceListings, marketplace, settings.ebay_inventory_manager);
              // Check if there is 'Next' button -> if yes, click it
              await this._handleNextPageButton(page);
            }
          } else {
            // If there is only one page of products -> run the function once
            await this._repriceProductsOnSinglePage(page, marketplaceListings, marketplace, settings.ebay_inventory_manager);
          }
        }

        // Check if the current marketplace`s variants object is not empty
        if (Object.entries(marketplaceListings.variants).length !== 0 && marketplaceListings.variants.constructor === Object) {
          // If it is not -> start the variations reprice process for that marketplace
          await this._repriceVariations(page, marketplaceListings, marketplace, settings.ebay_inventory_manager);
        }

        // Save the fresh page cookies to a file
        await this.writeCookieFile(page);

      }
      // Close the browser
      await this.repriceBrowser.close();

      // If there are products that have been repriced
      if (productsActuallyRepriced.length > 0) {
        // Iterate through all of them
        productsActuallyRepriced.forEach(product => {
          if (product.id !== undefined) {
            // let escapedLog = '';

            // if (product.price !== null) {
            //   // escapedLog = encodeURI(`'${product.item_name}' has been repriced from ${product.price} to ${product.new_price}`);
            //   escapedLog = `Repriced on eBay from ${product.price} to ${product.new_price}`;
            // } else {
            //   // escapedLog = encodeURI(`'${product.item_name}' has been repriced for the first time with price ${product.new_price}`);
            //   escapedLog = `Repriced on eBay to ${product.new_price}`;
            // }
            // // global.log.info(escapedLog);
            // Util.insertListingLog(product, escapedLog, 'info');

            // Update the price value for each listing in the DB
            global
              .knex('tbl_listings')
              .where({ store_id: product.id })
              .update({
                price: product.new_price,
                last_repriced: global.knex.fn.now()
              })
              .catch(error => global.appLog.error(`${error} - inside ebay.reprice - line 613`));
          }
        });

        // Reflect the repricer stats
        await this.repricerHelper.handleStats('increase-total-reprices', productsActuallyRepriced.length);

        // Reset the array that tracks the products that are actually repriced
        productsActuallyRepriced = [];
      }

      if (variantsActuallyRepriced.length > 0) {
        // After the repricing is done on the website, update the DB entries accordingly
        variantsActuallyRepriced.forEach(product => {
          if (product.id !== undefined) {
            // let escapedLog = '';
            // if (product.price !== null) {
            //   // escapedLog = encodeURI(`'${product.item_name}' has been repriced from ${product.price} to ${product.refactored_price}`);
            //   escapedLog = `Repriced on eBay from ${product.price} to ${product.refactored_price}`;
            // } else {
            //   // escapedLog = encodeURI(`'${product.item_name}' has been repriced for the first time with price ${product.refactored_price}`);
            //   escapedLog = `Repriced on eBay to ${product.refactored_price}`;
            // }

            // // global.log.info(escapedLog);
            // Util.insertListingLog(product, escapedLog, 'info');

            global
              .knex('tbl_listings')
              .where({ store_id: product.store_id })
              .update({
                price: product.refactored_price,
                last_repriced: global.knex.fn.now()
              })
              .catch(error => global.appLog.error(`${error} - inside ebay.reprice - line 585`));
          }
        });
        // Handle the stats update
        await this.repricerHelper.handleStats('increase-total-reprices', variantsActuallyRepriced.length);

        // Get the 'Variants actually repriced' state back, so that it is clean for the next round
        variantsActuallyRepriced = [];
      }
    } catch (error) {
      global.appLog.error(`${error} in ebay.reprice catch-block - line 679`);
      // Reset everything in the case of an arbitrary error
      productsActuallyRepriced = [];
      variantsActuallyRepriced = []; 
      this.repriceBrowser.close();
      this.mainWindow.webContents.send('update-ebay-repricer-notification', { status: false });
    }
  };

  manageInventory = async () => {
    // We track on a global level that the Ebay Inventory Manager is running -> if yes, it will not be started again by the timers
    global.ebayInventoryManagerIntervalIsRunning = true;

    const dalioAccount = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(row => row)
    .catch(e => global.appLog.error(`${e} - in Ebay.manageInventory - line 1610`));

    const settings = JSON.parse(dalioAccount.settings);

    if (settings.ebay_inventory_manager.manage_inventory == '1') {
      // This variable will handle SQLite queries of the listings that need their inventory managed -> either all of them or just the first 100
      let manageInventoryKnexQuery;
      if (global.accountStatus === '1') {
        // If the user has a paid subscription -> no limit
        manageInventoryKnexQuery = global.knex.select().from('tbl_listings');
      } else {
        // If the user does not have a paid subscription -> limit repricing to a 100 listings
        manageInventoryKnexQuery = global.knex.select().from('tbl_listings').limit(100);
      }

      // This object will contain all Ebay listings queried either simple or variants
      const listingsToManage = {
        US: {
          simple: [],
          variants: {}
        },
        UK: {
          simple: [],
          variants: {}
        },
        DE: {
          simple: [],
          variants: {}
        }, 
        CA: {
          simple: [],
          variants: {}
        }, 
        IT: {
          simple: [],
          variants: {}
        }
      };

      // Run the SQLite query defined above
      const extractedListingsToManage = await manageInventoryKnexQuery
        .then(listings => listings)
        .catch(error => global.appLog.error(`${error} - inside ebay.manageInventory - line 1646`));

      // Reorder the listings pulled from the DB according to their country and variant type inside the listingsToManage object
      if (extractedListingsToManage.length > 0) {
        // Iterate through each one of the listings of the DB
        for (let i = 0; i < extractedListingsToManage.length; i++) {
          // Pick the ones that are sold on Ebay
          if (extractedListingsToManage[i].store === 'ebay') {
            // Filter out the ones that have variations as they are just containers for their variations
            if (extractedListingsToManage[i].has_variations === '0' && extractedListingsToManage[i].pause_listing !== '1') {
              const { store_url, is_variant, parent_listing_id } = extractedListingsToManage[i];

              // If the listing is not a variant -> it is a simple listing -> check for which marketplace domain it is sold on and add it
              if (is_variant === '0') {
                if (store_url.includes('ebay.com')) {
                  listingsToManage.US.simple.push(extractedListingsToManage[i]);
                } else if (store_url.includes('ebay.co.uk')) {
                  listingsToManage.UK.simple.push(extractedListingsToManage[i]);
                } else if (store_url.includes('ebay.de')) {
                  listingsToManage.DE.simple.push(extractedListingsToManage[i]);
                } else if (store_url.includes('ebay.ca')) {
                  listingsToManage.CA.simple.push(extractedListingsToManage[i]);
                } else if (store_url.includes('ebay.it')) {
                  listingsToManage.IT.simple.push(extractedListingsToManage[i]);
                } else {
                  // do nothing
                }
                // Else if the listing is a variant -> group it with all other variants with the same parent and add it to the object
              } else if (is_variant === '1') {
                if (store_url.includes('ebay.com')) {
                  // If there is no other variant array with the same parent id -> create the empty array
                  if (listingsToManage.US.variants[parent_listing_id] === undefined) {
                    listingsToManage.US.variants[parent_listing_id] = [];
                  }

                  // Push the variant listing to the appropriate array
                  listingsToManage.US.variants[parent_listing_id].push(extractedListingsToManage[i]);
                } else if (store_url.includes('ebay.co.uk')) {
                  if (listingsToManage.UK.variants[parent_listing_id] === undefined) {
                    listingsToManage.UK.variants[parent_listing_id] = [];
                  }

                  listingsToManage.UK.variants[parent_listing_id].push(extractedListingsToManage[i]);
                } else if (store_url.includes('ebay.de')) {
                  if (listingsToManage.DE.variants[parent_listing_id] === undefined) {
                    listingsToManage.DE.variants[parent_listing_id] = [];
                  }

                  listingsToManage.DE.variants[parent_listing_id].push(extractedListingsToManage[i]);
                } else if (store_url.includes('ebay.ca')) {
                  if (listingsToManage.CA.variants[parent_listing_id] === undefined) {
                    listingsToManage.CA.variants[parent_listing_id] = [];
                  }

                  listingsToManage.CA.variants[parent_listing_id].push(extractedListingsToManage[i]);
                } else if (store_url.includes('ebay.it')) {
                  if (listingsToManage.IT.variants[parent_listing_id] === undefined) {
                    listingsToManage.IT.variants[parent_listing_id] = [];
                  }

                  listingsToManage.IT.variants[parent_listing_id].push(extractedListingsToManage[i]);
                } else {
                  // do nothing
                }
              }
            }
          }
        }
      }

      // Track if there are Ebay listings to be inventory managed
      let mustManageListings = false;

      // Check if any of the marketplaces have simple or variant listings that need repricing
      for (const [marketplace, marketplaceListings] of Object.entries(listingsToManage)) {
        if (marketplaceListings.simple.length !== 0 || (Object.entries(marketplaceListings.variants).length !== 0 && marketplaceListings.variants.constructor === Object)) {
          mustManageListings = true;
          await this.loginAndChangeQuantities(marketplace, marketplaceListings, settings.ebay_inventory_manager);
        }
      }

      // If yes, then call the loginAndChangeQuantities funnction -> else -> log that there is nothing to reprice
      if (mustManageListings) {

        const currentTime = new Date();
        const escapedLog = encodeURI(`Ebay inventory management performed - ${currentTime.toLocaleString()}`);
        global.log.info(escapedLog);

        await global.nucleus.track("EBAY-INVENTORY-MANAGER-RAN", {
          description: 'The Ebay inventory manager ran.',
          email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
        });
      }

      // The Ebay Inventory Manager is no longer running -> so update the global variable
      global.ebayInventoryManagerIntervalIsRunning = false;
    } else {
      global.ebayInventoryManagerIntervalIsRunning = false;
    }
  };

  syncListings = async () => {
      // Track on a global level that the Amazon Listing Syncer is actually running
      global.ebaySyncListingsIsRunning = true;
      // Send an Ebay sync status update to the renderer process -> this will make the button spin and disable it until the sync is over
      await this.mainWindow.webContents.send('ebay-product-sync-status', true);
      
      // Query the DB for Ebay accounts
      const ebayAccounts = await global.knex
      .select()
      .from('tbl_users')
      .then(rows => {
        const ebayAccounts = {
          US: false,
          UK: false,
          DE: false,
          CA: false,
          IT: false
        }

        rows.forEach((row) => {
          if (row.account === 'ebay_us') {
            ebayAccounts.US = true;
          } else if (row.account === 'ebay_uk') {
            ebayAccounts.UK = true;
          } else if (row.account === 'ebay_de') {
            ebayAccounts.DE = true;
          } else if (row.account === 'ebay_ca') {
            ebayAccounts.CA = true;
          } else if (row.account === 'ebay_it') {
            ebayAccounts.IT = true;
          }
        });

        return ebayAccounts;
      }).catch((error) => global.appLog.error(`${error} - inside ebay.syncListings - line 919`));

      // Check for corresponding cookie files
      const marketplacesCookies = await this.canLogIn();

      // If there are any -> go to the marketplace -> login and get all listings from each page
      if (ebayAccounts.US && marketplacesCookies.US) {
        await this.loginAndScrapeListings('US');
      }

      if (ebayAccounts.UK && marketplacesCookies.UK) {
        await this.loginAndScrapeListings('UK');
      }

      if (ebayAccounts.DE && marketplacesCookies.DE) {
        await this.loginAndScrapeListings('DE');
      }

      if (ebayAccounts.CA && marketplacesCookies.CA) {
        await this.loginAndScrapeListings('CA');
      }

      if (ebayAccounts.IT && marketplacesCookies.IT) {
        await this.loginAndScrapeListings('IT');
      }

      // Send a confirmation event to the renderer process that the syncing has concluded -> this will terminate the icon from spinning and enable the button again
      await this.mainWindow.webContents.send('ebay-product-sync-status', false);
      Util.showWarnings(this.mainWindow);
  };

  loginAndScrapeListings = async marketplace => {
    try {
      this.listingsScraperBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        slowMo: 100,
        devtools: false,
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--disable-webgl'
        ],
      });

      const page = await this.listingsScraperBrowser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setDefaultNavigationTimeout(0);

      if (global.proxyUsername !== '' && global.proxyPassword !== '') {
        await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
      }

      let canScrapeThisMarketplace = true;
      if (marketplace === 'US') {
        // Get the Ebay cookies from the file
        global.ebayCookies.US = await this.canLogIn(true, 'US');
        if (!global.ebayCookies.US) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.US);
          await page.goto(`https://ebay.com/sh/lst/active?limit=200`, { waitUntil: 'networkidle0' });
        }
      } else if (marketplace === 'UK') {
        global.ebayCookies.UK = await this.canLogIn(true, 'UK');
        if (!global.ebayCookies.UK) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.UK);
          await page.goto('https://ebay.co.uk/sh/lst/active?limit=200', { waitUntil: 'networkidle0' });
        }
      } else if (marketplace === 'DE') {
        global.ebayCookies.DE = await this.canLogIn(true, 'DE');
        if (!global.ebayCookies.DE) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.DE);
          await page.goto('https://ebay.de/sh/lst/active?limit=200', { waitUntil: 'networkidle0' });
        }
      } else if (marketplace === 'CA') {
        global.ebayCookies.CA = await this.canLogIn(true, 'CA');
        if (!global.ebayCookies.CA) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.CA);
          await page.goto('https://ebay.ca/sh/lst/active?limit=200', { waitUntil: 'networkidle0' });
        }
      } else if (marketplace === 'IT') {
        global.ebayCookies.IT = await this.canLogIn(true, 'IT');
        if (!global.ebayCookies.IT) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.IT);
          await page.goto('https://ebay.it/sh/lst/active?limit=200', { waitUntil: 'networkidle0' });
        }
      }

      if (canScrapeThisMarketplace) {
        // If the login screen shows -> log in
        await EbayUtil.loginIfNecessary(page, marketplace);

        // Represents a user delay -> randomize in the future
        await page.waitFor(3000);

        await this._customizeListingsTable(page);

        // Find the total number of productpages in the current marketplace
        const totalNumberOfProductPages = await this._getTotalNumberOfPages(page);

        // console.log('total number of pages', totalNumberOfProductPages);
        // If there is more than one page of listings in the marketplace
        if (totalNumberOfProductPages > 1) {
          // Iterate the this._scrapeProductsOnSinglePage function the amount of times necessary
          for (let i = 0; i < totalNumberOfProductPages; i++) {
            await this._scrapeProductsOnSinglePage(page, marketplace, false);
            // Check if there is 'Next' button for the products -> click it
            await this._handleNextPageButton(page);
          }
        } else {
          // If there is only one page of products -> run the function once
          await this._scrapeProductsOnSinglePage(page, marketplace, false);
        }

        
        // After the scraping has ended -> iterate through all of the scraped listings` data
        for (const listing of productsScraped) {
          // If any of the listings has variations (is a parent listing)
          if (listing.has_variations === '1') {
            // Go to the variations group page (in Ebay each variation group has a separate page)
            await page.goto(listing.variations_url, { waitUntil: 'networkidle0' });
            // Should randomize
            await page.waitFor(4000);
            // Scrape the variations` group page
            await this._scrapeProductsOnSinglePage(page, marketplace, true);
          }
        }
      }

      // When everything has concluded -> close the scraper browser
      this.listingsScraperBrowser.close(); 

      // Check if the products actually scraped count is not 0
      if (productsScraped.length !== 0) {
        // Check if the variations actually scraped count is not 0
        if (variationsScraped.length !== 0) {
          // If not -> combine the variations array with the main one
          productsScraped = await productsScraped.concat(variationsScraped);
        }

        // Query the DB and return all listings that are sold on Ebay
        const productsInDatabase = await global
        .knex('tbl_listings')
        .where({ store: 'ebay' })
        .then(rows => rows)
        .catch(error => global.appLog.error(`${error} - in ebay.loginAndScrapeListings - line 945`)); 

        // Iterate through the array that holds the scraped listings
        await productsScraped.forEach(product => {
          // Check if each of the products is not already in the DB
          let productIsInDatabase = false;
          if (productsInDatabase.length > 0) {
            productsInDatabase.forEach(dbProduct => {
              if (dbProduct.store_id === product.id) {
                productIsInDatabase = true;
              }
            });
          }

          // Check if a scraped listing is a variation by checking for the existence of parent_listing_id
          let parentListingId = null;
          if (product.parent_listing_id !== undefined) {
            // If it is a variation -> save the parent_listing_id to a variable
            parentListingId = product.parent_listing_id;
          }

          // If the current product is already in the DB -> just update some of its data that might have changed
          if (productIsInDatabase) {
            global
            .knex('tbl_listings')
            .where({ store_id: product.id })
            .update({
              item_name: product.item_name,
              store_url: product.store_url,
              has_variations: product.has_variations,
              is_variant: product.is_variant,
              parent_listing_id: parentListingId,
              image: product.image,
              price: product.price,
              product_availability: product.product_availability,
              store_watches: product.store_watches !== undefined ? product.store_watches : '0',
              store_page_visits: product.store_page_visits !== undefined ? product.store_page_visits : '0',
              store_items_sold: product.store_items_sold !== undefined ? product.store_items_sold : '0'
            })
            .catch(error => global.appLog.error(`${error} - inside ebay.loginAndScrapeListings - line 1644`));
          } else {
            // Else if it is not already in the DB -> insert all of its data 
            global
            .knex('tbl_listings')
            .insert({
              item_name: product.item_name,
              has_variations: product.has_variations,
              is_variant: product.is_variant,
              parent_listing_id: parentListingId,
              store: 'ebay',
              store_url: product.store_url,
              store_id: product.id,
              image: product.image,
              price: product.price,
              product_availability: product.product_availability,
              store_watches: product.store_watches !== undefined ? product.store_watches : '0',
              store_page_visits: product.store_page_visits !== undefined ? product.store_page_visits : '0',
              store_items_sold: product.store_items_sold !== undefined ? product.store_items_sold : '0',
              last_repriced: 'Never'
            })
            .catch(error => global.appLog.error(`${error} - inside ebay.loginAndScrapeListings - line 1589`));
          }
        });

        // Delete listings that do not correspond with eBay listings
        if (productsInDatabase.length > 0) {
          const productsInDatabaseMapped = productsInDatabase.map((listing) => {
            const listingDeepCopy = JSON.parse(JSON.stringify(listing));

            let marketplace = 'US';
            if (listing.store_url.includes('ebay.co.uk')) {
              marketplace = 'UK'
            } else if (listing.store_url.includes('ebay.ca')) {
              marketplace = 'CA'
            } else if (listing.store_url.includes('ebay.de')) {
              marketplace = 'DE'
            } else if (listing.store_url.includes('ebay.fr')) {
              marketplace = 'FR'
            } else if (listing.store_url.includes('ebay.it')) {
              marketplace = 'IT'
            } else if (listing.store_url.includes('ebay.es')) {
              marketplace = 'ES'
            }

            listingDeepCopy.marketplace = marketplace;
            return listingDeepCopy;
          });

          for (let i = 0; i < productsInDatabaseMapped.length; i++) {
            if (productsInDatabaseMapped[i].marketplace === marketplace) {
              let productIsOnEbay = false;

              for (let p = 0; p < productsScraped.length; p++) {
                if (productsInDatabaseMapped[i].store_id === productsScraped[p].id) {
                  productIsOnEbay = true;
                }
              }

              // If the product is not found on eBay, mark it as deleted
              if (!productIsOnEbay) {
                await global.knex('tbl_listings')
                .where({ store_id: productsInDatabaseMapped[i].store_id })
                .update({ is_deleted: '1' })
                .catch(e => global.appLog.error(`${e} - Ebay.loginAndScrapeListings - line 2221`));
              } else {
                if (productsInDatabaseMapped[i].is_deleted == '1') {
                  await global.knex('tbl_listings')
                  .where({ store_id: productsInDatabaseMapped[i].store_id })
                  .update({ is_deleted: '0' })
                  .catch(e => global.appLog.error(`${e} - Ebay.loginAndScrapeListings - line 2221`));
                }
              }
            }
          }
        }
      }

      // global.log.info(`Dalio synced ${productsScraped.length} products from your Ebay ${marketplace} account.`);

      global.nucleus.track("SYNC-EBAY-LISTINGS", {
        description: `The user synced ${productsScraped.length} Ebay ${marketplace} listings.`,
        email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
      });

      // Reset tracking arrays
      productsScraped = [];
      variationsScraped = [];

    } catch (error) {
      global.appLog.error(`${error} in ebay.loginAndScrapeListings - line 1621`);

      if (error.message.includes('no-custom-label')) {
        global.log.error(encodeURI(`Your eBay account listings page does not appear to have a 'Custom label' field activated. Please do so in order to use Dalio.`));
      }
      // If an arbitrary error has occurred (sometimes happens) -> close the browser
      this.listingsScraperBrowser.close();
      // Reset tracking arrays
      productsScraped = [];
      variationsScraped = [];
    }
  };

  _scrapeProductsOnSinglePage = async (page, marketplace, scrapeVariations = false) => {
    await EbayUtil.loginIfNecessary(page, marketplace);
    // Scroll to bottom of a page so everything can be loaded
    await Util.autoScroll(page);
    // Scrape the listed products of the page - table data
    const listedProducts = await page.evaluate((scrapeVariations, marketplace) => {
    // Create an array of all table rows (trs) that represent listings on the page
    const trs = Array.from(document.querySelectorAll('tr.grid-row'));
    let listedProductsArray = [];

    // Check if this is NOT a variations group page
    if (!scrapeVariations) {
      // Filter out the tr`s that do not have a data-id attribute as they are not what we are looking for
      listedProductsArray = trs.map(tr => {
        // Get the ebayID of each listing on the page
        const trID = tr.getAttribute('data-id');
        const singleProductObject = {};
        // All the data needed for a listing is usually presented as JSON in that 'data-id' attribute
        const listingDataSelector = `tr[data-id="${trID}"] td.shui-dt-column__listingSKU div.inline-editable-pencil button`;

        const listingDataSelected = document.querySelector(listingDataSelector);

        if (listingDataSelected === null) {
          throw new Error(`no-custom-label`);
        }

        const listingData = JSON.parse(listingDataSelected.getAttribute('data'));

        // Every listing (simple or variation) shares the id and item name info
        singleProductObject.id = trID;
        singleProductObject.item_name = listingData.title.texts[0].textSpans[0].text;

        /* Check if the current product has variations by checking the title texts
        * if it has variations there is a small text under the listing`s title that says, for example - 2 Variations
        */
        if (listingData.title.texts.length > 1) {
          singleProductObject.is_variant = '0';
          singleProductObject.has_variations = '1';
          singleProductObject.store_url = listingData.title.texts[0].action.URL;
          singleProductObject.image = listingData.image.URL;

          if (listingData.watchCount !== undefined) {
            singleProductObject.store_watches = listingData.watchCount[0].textSpans[0].text;
          }

          if (listingData.visitCount !== undefined) {
            singleProductObject.store_page_visits = listingData.visitCount[0].textSpans[0].text;
          }

          if (listingData.soldQuantity !== undefined) {
            singleProductObject.store_items_sold = listingData.soldQuantity[0].textSpans[0].text;
          }

          // Check the marketplace the listing is listed on -> make sure the url of it matches that domain
          if (listingData.additionalInfo.marketplace === 'EBAY_US' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_US') {
            singleProductObject.variations_url = `https://ebay.com${listingData.title.texts[1].action.URL}`;
          } else if (listingData.additionalInfo.marketplace === 'EBAY_GB' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_GB') {
            singleProductObject.variations_url = `https://ebay.co.uk${listingData.title.texts[1].action.URL}`;
          } else if (listingData.additionalInfo.marketplace === 'EBAY_DE' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_DE') {
            singleProductObject.variations_url = `https://ebay.de${listingData.title.texts[1].action.URL}`;
          } else if (listingData.additionalInfo.marketplace === 'EBAY_CA' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_CA') {
            singleProductObject.variations_url = `https://ebay.ca${listingData.title.texts[1].action.URL}`;
          } else if (listingData.additionalInfo.marketplace === 'EBAY_IT' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_IT') {
            singleProductObject.variations_url = `https://ebay.it${listingData.title.texts[1].action.URL}`;
          }
        } else {
           // If the listing is NOT a variation
          singleProductObject.is_variant = '0';
          singleProductObject.has_variations = '0';
          singleProductObject.store_url = listingData.title.texts[0].action.URL;
          singleProductObject.image = listingData.image.URL;
          singleProductObject.product_availability = listingData.availableQuantity.content[0].textSpans[0].text;

          if (listingData.additionalInfo.currentPrice !== undefined) {
            singleProductObject.price = listingData.additionalInfo.currentPrice;
          }

          if (listingData.watchCount !== undefined) {
            singleProductObject.store_watches = listingData.watchCount[0].textSpans[0].text;
          }

          if (listingData.visitCount !== undefined) {
            singleProductObject.store_page_visits = listingData.visitCount[0].textSpans[0].text;
          }

          if (listingData.soldQuantity !== undefined) {
            singleProductObject.store_items_sold = listingData.soldQuantity[0].textSpans[0].text;
          }

        }

        if (marketplace === 'US' && (listingData.additionalInfo.marketplace === 'EBAY_US' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_US')) {
          return singleProductObject;
        }

        if (marketplace === 'UK' && (listingData.additionalInfo.marketplace === 'EBAY_GB' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_GB')) {
          return singleProductObject;
        }

        if (marketplace === 'DE' && (listingData.additionalInfo.marketplace === 'EBAY_DE' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_DE')) {
          return singleProductObject;
        }

        if (marketplace === 'CA' && (listingData.additionalInfo.marketplace === 'EBAY_CA' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_CA')) {
          return singleProductObject;
        }

        if (marketplace === 'IT' && (listingData.additionalInfo.marketplace === 'EBAY_IT' || listingData.additionalInfo.marketplace === 'EBAY_MOTORS_IT')) {
          return singleProductObject;
        }

        return null;
      });
      // If the page being scraped IS a variations` group page
    } else {
      // Filter out the tr`s that do not have a data-id attribute as they are not what we are looking for
      listedProductsArray = trs.map(tr => {
        // Get the ebayID of each listing on the page
        const trID = tr.getAttribute('data-id');
        const singleProductObject = {};
        // All the data needed for a listing is usually presented as JSON in that 'data-id' attribute
        const listingDataSelector = `tr[data-id="${trID}"] td.shui-dt-column__listingSKU div.inline-editable-pencil button`;
        const listingData = JSON.parse(document.querySelector(listingDataSelector).getAttribute('data'));

        singleProductObject.id = trID;
        singleProductObject.item_name = listingData.variationTitle[0].textSpans[0].text;
        singleProductObject.is_variant = '1';
        singleProductObject.has_variations = '0';
        singleProductObject.store_url = listingData.variationTitle[0].action.URL;
        singleProductObject.parent_listing_id = listingData.listingEntityId;
        singleProductObject.product_availability = listingData.availableQuantity.content[0].textSpans[0].text;
        singleProductObject.price = listingData.price.content.currentValue;

        if (listingData.image.URL !== undefined) {
          singleProductObject.image = listingData.image.URL;
        }

        if (listingData.watchCount !== undefined) {
          singleProductObject.store_watches = listingData.watchCount[0].textSpans[0].text;
        }

        if (listingData.visitCount !== undefined) {
          singleProductObject.store_page_visits = listingData.visitCount[0].textSpans[0].text;
        }

        if (listingData.soldQuantity !== undefined) {
          singleProductObject.store_items_sold = listingData.soldQuantity[0].textSpans[0].text;
        }

        return singleProductObject;

      });
    }
    

    // Filter out all null values where there is no product matching
    listedProductsArray = listedProductsArray.filter(product => product !== null);

    // This array now has info about all listed products on the page that match some or all of the products we pulled from the DB
    return listedProductsArray;
  }, scrapeVariations, marketplace);

  // If the page being scraped is containing variations -> add them to the variations scraped array
  if (scrapeVariations) {
    variationsScraped.push(...listedProducts);
  } else {
    // Add them to the simple products scraped array
    productsScraped.push(...listedProducts);
  }
  };

  _repriceProductsOnSinglePage = async (page, marketplaceListingsArray, country, ebayInventoryManagerSettings) => {
    // Scroll to bottom of a page so everything can be loaded
    await Util.autoScroll(page);
    // Scrape the listed products of the page - table data
    const listedProductsToReprice = await page.evaluate(marketplaceListingsArray => {
    // Create an array of all table rows (trs) that represent listings on the page
    const trs = Array.from(document.querySelectorAll('tr.grid-row'));
    // Filter out the trs` that do not have a data-id attribute as they are not what we are looking for
    let listedProductsToRepriceArray = trs.map(tr => {
      // Get the ebayID of each listing on the page
      const ebayID = tr.getAttribute('data-id');
      const singleProductToRepriceObject = {};
      /*
      * Iterate through all of the listings that are passed as a parameter to this function
      * these are the ones queried from the DB
      */
      marketplaceListingsArray.simple.forEach(listing => {
        // Check if one of these listings 'Ebay id' matches the ebayID of a listing on that specific page and if it does -> add it to the tracked object
        if (listing.store_id === ebayID) {
          singleProductToRepriceObject.id = ebayID;
          singleProductToRepriceObject.has_variations = listing.has_variations;
          singleProductToRepriceObject.is_variant = listing.is_variant;
          singleProductToRepriceObject.item_name = listing.item_name;
          singleProductToRepriceObject.parent_listing_id = listing.parent_listing_id;
          singleProductToRepriceObject.store_id = ebayID;
          singleProductToRepriceObject.price = listing.price;
          singleProductToRepriceObject.new_price = listing.refactored_price;
          singleProductToRepriceObject.product_availability = listing.product_availability;
          singleProductToRepriceObject.product_changed = listing.product_changed;
          singleProductToRepriceObject.force_oos = listing.force_oos;
          singleProductToRepriceObject.store_watches = listing.store_watches;
          singleProductToRepriceObject.store_page_visits = listing.store_page_visits;
          singleProductToRepriceObject.store_items_sold = listing.store_items_sold;
        }
      });
  
      // Check if the object is empty -> there is no matching product on the page
      if (Object.entries(singleProductToRepriceObject).length === 0 && singleProductToRepriceObject.constructor === Object) {
        return null;
      }
  
      return singleProductToRepriceObject;
  
    });
  
    // Filter out all null values where there is no product matching
    listedProductsToRepriceArray = listedProductsToRepriceArray.filter(product => product !== null);
  
    // This array now has info about all listed products on the page that match some or all of the products we pulled from the DB
    return listedProductsToRepriceArray;
  }, marketplaceListingsArray);
   
  
    /* Iterate through the array with listed products that need repricing
     * simulate user click on each input field
     * type the new product price
     * repeat for all array elements
     */
    if (listedProductsToReprice.length > 0) {
      for (const product of listedProductsToReprice) {
        try {
          await this._changeSingleProductsPrice(page, product);
        } catch(e) {
          await global.appLog.error(`${e} - Ebay._repriceProductsOnSinglePage - line 2599`);
        }

        try {
          if (ebayInventoryManagerSettings.manage_inventory == '1') {
            await this._manageSingleProductsInventory(page, product, ebayInventoryManagerSettings);
          }
        } catch(e) {
          await global.appLog.error(`${e} - Ebay._repriceProductsOnSinglePage - line 2599`);
        }
      }
    }
  };

  _changeSingleProductsPrice = async (page, product) => {
    if (product.id !== undefined) {
        
      // Select the 'Edit' button once it appears
      const searchID = `tr[data-id="${product.id}"] .shui-dt-column__price .inline-editable-pencil button`;
      const productFound = await page.$(searchID);
      
      if (productFound !== null) {

        const listingData = await page.evaluate(product => {
          const listingDataButton = document.querySelector(`tr[data-id="${product.id}"] .shui-dt-column__price .inline-editable-pencil button`);
          const dataAttr = JSON.parse(listingDataButton.getAttribute('data'));
          const singleProductObject = {};
  
          if (dataAttr.watchCount !== undefined) {
            singleProductObject.store_watches = dataAttr.watchCount[0].textSpans[0].text;
          }
  
          if (dataAttr.visitCount !== undefined) {
            singleProductObject.store_page_visits = dataAttr.visitCount[0].textSpans[0].text;
          }
  
          if (dataAttr.soldQuantity !== undefined) {
            singleProductObject.store_items_sold = dataAttr.soldQuantity[0].textSpans[0].text;
          }

          return singleProductObject;
        }, product);

        // Check if the product on the page we just matched with a product from the database has the same price
        const samePrice = await page.evaluate((product) => {
          // Get the JSON that is held by every button, for every listing
          const editPriceButton = document.querySelector(`tr[data-id="${product.id}"] .shui-dt-column__price .inline-editable-pencil button`);
          const dataAttr = JSON.parse(editPriceButton.getAttribute('data'));
          // If the listing`s current price is the same as the one coming from the database -> then the price is the same
          if (dataAttr.additionalInfo.currentPrice === product.new_price) {
            return { status: true, ebay_price: '' };
          }
          return { status: false, ebay_price: dataAttr.additionalInfo.currentPrice };
        }, product);

        // If the price is NOT the same
        if (!samePrice.status) {
          await page.hover(`tr[data-id="${product.id}"] td.shui-dt-column__price`);

          // Check if the products new/refactored price is not null -> then reprice
          if (product.new_price !== null) {
            // await page.waitFor(1000);
            await page.click(searchID);

            const priceInput = `form.inline-edit-price div span input`;
            await page.type(priceInput, product.new_price.toString(), {
              delay: 20
            });

            // Save the reprice change
            await page.click('form.inline-edit-price button[type="submit"]');

            await page.waitFor(priceInput, { hidden: true, timeout: 15000 }).catch(e => global.appLog.error(`${e} - price input element did not disappear in 15 seconds - Ebay._changeSingleProductsprice - line 2577`));

            // Sometimes, when trying to reprice a product, Ebay shows an inline error message -> check for it
            const inlineErrorMessage = await page.$('form .inline-notice--attention');

            // If it appears -> cancel reprice for this product and log an error message
            if (inlineErrorMessage !== null) {
        
              const errorText = await page.evaluate(() => {
                const errorTextSelector = document.querySelector('form .inline-notice--attention .inline-notice__content');

                if (errorTextSelector !== null) {
                  return errorTextSelector.textContent;
                }

                return '';
              });

              // const escapedLogInlineError = encodeURI(`Cannot reprice '${product.item_name}' as there was an error. Try to reprice it manually in order to pinpoint the error.`);
              const escapedLogInlineError = `Cannot reprice the listing due to an error. Try to reprice it manually in order to pinpoint the error - ${errorText}`;
              // await global.log.error(escapedLogInlineError);
              await Util.insertListingLog(product, escapedLogInlineError, 'error');

              await page.click('form.inline-edit-price button[type="reset"]');
              await page.waitFor(3000);
            } else {
              // After the simple listing is repriced -> push a reference to the 'productsActuallyRepriced' array which is used to track how many simple listings have been repriced in total
              productsActuallyRepriced.push(product);

              const log = `Repriced on eBay from ${samePrice.ebay_price} to ${product.new_price}`;
              Util.insertListingLog(product, log, 'info');
            }
          }
        } else {
          // If the refactored price is the same as the one listed on Ebay -> it will not update the 'price' field in the DB if the 'price' field is still null
          if (product.new_price !== product.price) {
            productsActuallyRepriced.push(product);
          }
        }


        let productWatchers = product.store_watches;
        let productPageVisits = product.store_page_visits;
        let productSoldQuantity = product.store_items_sold;

        if (listingData.store_watches !== undefined) {
          productWatchers = listingData.store_watches;
        }

        if (listingData.store_page_visits !== undefined) {
          productPageVisits = listingData.store_page_visits;
        }

        if (listingData.store_items_sold !== undefined) {
          productSoldQuantity = listingData.store_items_sold;
        }

        if (
          product.store_watches !== productWatchers || 
          product.store_page_visits !== productPageVisits ||
          product.store_items_sold !== productSoldQuantity
          ) {
          global.knex('tbl_listings')
          .where({ store_id: product.store_id })
          .update({ 
            store_watches: productWatchers,
            store_page_visits: productPageVisits,
            store_items_sold: productSoldQuantity
          })
          .catch(e => global.appLog.error(`${e} - Ebay._changeSingleProductsPrice - line 2566`));
        }

      } else {
        // Hover over the 'price' column area, so the 'edit' button can be loaded/appear
        await page.hover(`tr[data-id="${product.id}"] td.shui-dt-column__price`);
        const productFoundHovered = await page.$(searchID);

        if (productFoundHovered !== null) {
          // Check if the product on the page we just matched with a product from the database has the same price
          const samePrice = await page.evaluate((product) => {
            // Get the JSON that is held by every button, for every listing
            const editPriceButton = document.querySelector(`tr[data-id="${product.id}"] .shui-dt-column__price .inline-editable-pencil button`);
            const dataAttr = JSON.parse(editPriceButton.getAttribute('data'));
            // If the listing`s current price is the same as the one coming from the database -> then the price is the same
            if (dataAttr.additionalInfo.currentPrice === product.new_price) {
              return { status: true, ebay_price: '' };
            }
            return { status: false, ebay_price: dataAttr.additionalInfo.currentPrice };
          }, product);
  
          // If the price is NOT the same
          if (!samePrice.status) {
            await page.hover(`tr[data-id="${product.id}"] td.shui-dt-column__price`);

            // Check if the products new/refactored price is not null -> then reprice
            if (product.new_price !== null) {
              // await page.waitFor(1000);
              await page.click(searchID);

              const priceInput = `form.inline-edit-price div span input`;
              await page.type(priceInput, product.new_price.toString(), {
                delay: 20
              });

              // Save the reprice change
              await page.click('form.inline-edit-price button[type="submit"]');

              await page.waitFor(priceInput, { hidden: true, timeout: 15000 }).catch(e => global.appLog.error(`${product.item_name} - ${e} - price input element did not disappear in 15 seconds - Ebay._changeSingleProductsPrice - line 2684`));

              // Sometimes, when trying to reprice a product, Ebay shows an inline error message -> check for it
              const inlineErrorMessage = await page.$('form .inline-notice--attention');

              // If it appears -> cancel reprice for this product and log an error message
              if (inlineErrorMessage !== null) {
          
                const errorText = await page.evaluate(() => {
                  const errorTextSelector = document.querySelector('form .inline-notice--attention .inline-notice__content');

                  if (errorTextSelector !== null) {
                    return errorTextSelector.textContent;
                  }

                  return '';
                });

                // const escapedLogInlineError = encodeURI(`Cannot reprice '${product.item_name}' as there was an error. Try to reprice it manually in order to pinpoint the error.`);
                const escapedLogInlineError = `Cannot reprice the listing due to an error. Try to reprice it manually in order to pinpoint the error - ${errorText}`;
                // await global.log.error(escapedLogInlineError);
                await Util.insertListingLog(product, escapedLogInlineError, 'error');

                await page.click('form.inline-edit-price button[type="reset"]');
                await page.waitFor(3000);
              } else {
                // After the simple listing is repriced -> push a reference to the 'productsActuallyRepriced' array which is used to track how many simple listings have been repriced in total
                productsActuallyRepriced.push(product);

                const log = `Repriced on eBay from ${samePrice.ebay_price} to ${product.new_price}`;
                Util.insertListingLog(product, log, 'info');
              }
            }
          } else {
            // If the refactored price is the same as the one listed on Ebay -> it will not update the 'price' field in the DB if the 'price' field is still null
            if (product.new_price !== product.price) {
              productsActuallyRepriced.push(product);
            }
          }
        }

      }
    }
  }

  _manageSingleProductsInventory = async (page, product, ebayInventoryManagerSettings) => {
    if (product.id !== undefined) {
      // Check if the listing is not a variant -> go straight to repricing
      const searchID = `tr[data-id="${product.id}"] .shui-dt-column__availableQuantity .inline-editable-pencil button`;
      const productFound = await page.$(searchID);
      if (productFound !== null) {

        // Extract the current listings quantity
        let currentListingsQuantity = await page.evaluate((product) => {
          // Get the JSON that is held by every button, for every listing - here the listings current quantity can be extracted
          const editQuantityButton = document.querySelector(`tr[data-id="${product.id}"] .shui-dt-column__availableQuantity .inline-editable-pencil button`);
          const dataAttr = JSON.parse(editQuantityButton.getAttribute('data'));
   
          return dataAttr.availableQuantity.content[0].textSpans[0].text;    
        }, product);

        currentListingsQuantity = parseInt(currentListingsQuantity);

        if (!isNaN(currentListingsQuantity)) {
          const lowerQuantityThreshold = typeof ebayInventoryManagerSettings.lower_quantity_threshold === 'number' ? ebayInventoryManagerSettings.lower_quantity_threshold : parseInt(ebayInventoryManagerSettings.lower_quantity_threshold);
          const higherQuantityThreshold = typeof ebayInventoryManagerSettings.higher_quantity_threshold === 'number' ? ebayInventoryManagerSettings.higher_quantity_threshold : parseInt(ebayInventoryManagerSettings.higher_quantity_threshold);

          if ((product.product_availability === 'OUT_OF_STOCK' || product.product_availability === '0' || product.product_changed == '1' || product.force_oos == '1') && currentListingsQuantity !== 0) {
            if (ebayInventoryManagerSettings.out_of_stock_action == '2') {
              await page.hover(`tr[data-id="${product.id}"] td.shui-dt-column__availableQuantity`);

              await page.click(searchID);
              const quantityInput = `form.inline-edit-price div span input`;
              await page.type(quantityInput, '0', { delay: 100 });
  
              // Save the reprice change
              await page.click('form.inline-edit-price button[type="submit"]');

              await page.waitFor(quantityInput, { hidden: true, timeout: 15000 }).catch(e => global.appLog.error(`${e} - quantity input element did not disappear in 15 seconds - Ebay._manageSingleProductsInventory - line 2761`));

              Util.insertListingLog(product, 'Inventory changed to 0.');

            }
          } else if (currentListingsQuantity <= lowerQuantityThreshold && product.product_availability !== 'OUT_OF_STOCK' && product.product_availability !== '0' && product.product_changed == 0) {
              await page.hover(`tr[data-id="${product.id}"] td.shui-dt-column__availableQuantity`);
  
              await page.click(searchID);
              const quantityInput = `form.inline-edit-price div span input`;
              await page.type(quantityInput, higherQuantityThreshold.toString(), { delay: 100 });
  
              // Save the reprice change
              await page.click('form.inline-edit-price button[type="submit"]');

              await page.waitFor(quantityInput, { hidden: true, timeout: 15000 }).catch(e => global.appLog.error(`${e} - quantity input element did not disappear in 15 seconds - Ebay._manageSingleProductsInventory - line 2777`));

              Util.insertListingLog(product, `Inventory changed to ${higherQuantityThreshold.toString()}`);
     
          } 
        }

      }
    }
  }

  _repriceVariations = async (page, marketplaceListingsArray, country, ebayInventoryManagerSettings) => {
    /* 
     * Different variations with the same parent listing are grouped inside an array
     * We start by iterating through all variation groups
     */
    for (const [parent, variants] of Object.entries(marketplaceListingsArray.variants)) {
  
      // The marketplace domain is checked and the variation group page is set according to it
      let variationsPage;
      if (country === 'US') {
        variationsPage = `https://ebay.com/sh/lst/active/${parent}?&ReturnURL=https%3A%2F%2Fwww.ebay.com%2Fsh%2Flst%2Factive`;
      } else if (country === 'UK') {
        variationsPage = `https://ebay.co.uk/sh/lst/active/${parent}?&ReturnURL=https%3A%2F%2Fwww.ebay.co.uk%2Fsh%2Flst%2Factive`;
      } else if (country === 'DE') {
        variationsPage = `https://ebay.de/sh/lst/active/${parent}?&ReturnURL=https%3A%2F%2Fwww.ebay.de%2Fsh%2Flst%2Factive`;
      } else if (country === 'CA') {
        variationsPage = `https://ebay.ca/sh/lst/active/${parent}?&ReturnURL=https%3A%2F%2Fwww.ebay.ca%2Fsh%2Flst%2Factive`;
      } else if (country === 'IT') {
        variationsPage = `https://ebay.it/sh/lst/active/${parent}?&ReturnURL=https%3A%2F%2Fwww.ebay.ca%2Fsh%2Flst%2Factive`;
      }
  
      // Go to the variations group page so that the repricing can happen
      await page.goto(variationsPage, { waitUntil: 'networkidle0' });
  
      // If the authentication form appears - log in automatically
      await EbayUtil.loginIfNecessary(page, country);
  
      // Iterate through each variation in a single group
      for (const variant of variants) {
        
        try {
          await this._repriceSingleVariation(page, variant);
        } catch (e) {
          Util.insertListingLog(variant, 'There was an error while trying to reprice this variation. Ensure that you have entered the correct variation ID.');
          await global.appLog.error(`${e} - Ebay._repriceVariations - line 2861`);
        }

        try {
          await this._manageSingleVariationsInventory(page, variant, ebayInventoryManagerSettings);
        } catch (e) {
          Util.insertListingLog(variant, 'There was an error while trying to change the inventory of this variation. Ensure that you have entered the correct variation ID.');
          await global.appLog.error(`${e} - Ebay._repriceVariations - line 2867`);
        }


      }
    }
  };

  _repriceSingleVariation = async (page, variant) => {
    // Try to find a corresponding listing on the page
    const variantFoundMain = await page.$(`tr[data-id="${variant.store_id}"] td.shui-dt-column__price`);
  
    // If one is found
    if (variantFoundMain !== null) {
      // Hover on the 'Price' box of the variant so that the 'Edit price' button can appear
      await page.hover(`tr[data-id="${variant.store_id}"] td.shui-dt-column__price`);
      const searchID = `tr[data-id="${variant.store_id}"] td.shui-dt-column__price div.inline-editable-pencil button`;
      const variantFound = await page.$(searchID);
      // IF the 'Edit price' button has been found
      if (variantFound !== null) {
        // Get the JSON inside that 'Edit price' button 'data' attribute, so it can be used for comparison with the refactored price of the listing coming from the DB
        const variantObject = await page.evaluate(variantFound => JSON.parse(variantFound.getAttribute('data')),variantFound);

        // This is the current price of the variation on the page
        const variantPrice = variantObject.price.content.currentValue;

        // Check if the products` new/refactored price is not null -> then reprice
        if (variant.refactored_price !== null) {
          // Check if the two prices are the same ? if yes -> skip : if no -> reprice
          if (variant.refactored_price !== variantPrice) {
            // Click the 'Edit price' button
            await page.click(searchID);
            const priceInput = `form.inline-edit-price div span input`;
            // Input the new price
            await page.type(priceInput, variant.refactored_price.toString(), {
              delay: 100
            });

            // Save the reprice change
            await page.click('form.inline-edit-price button[type="submit"]');

            await page.waitFor(priceInput, { hidden: true, timeout: 15000 }).catch(e => global.appLog.error(`${e} - price input element did not disappear in 15 seconds - Ebay._repriceSingleVariation - line 2869`));

            // Add the variant to the array, so a total number can be counted for stats
            await variantsActuallyRepriced.push(variant);
          }
        }
      }
    } else {
      // const escapedLog = encodeURI(
      //   `Product variant - ${variant.item_name} cannot be repriced as it cannot be found. Please make sure that it is correctly added to the parent listing.`
      // );
      const escapedLog = `Cannot be repriced as it cannot be found. Please make sure that it is correctly added to the parent listing.`;
      // global.log.error(escapedLog);
      await Util.insertListingLog(variant, escapedLog, 'error');
    }
  }

  _manageSingleVariationsInventory = async (page, variant, ebayInventoryManagerSettings) => {
    // Hover on the 'Quantity' box of a variant so that the 'Edit quantity' button can appear
    await page.hover(
      `tr[data-id="${variant.store_id}"] td.shui-dt-column__availableQuantity`
    );
    const searchID = `tr[data-id="${variant.store_id}"] td.shui-dt-column__availableQuantity div.inline-editable-pencil button`;
    const variantFound = await page.$(searchID);
    if (variantFound !== null) {

      // Extract the current listings quantity
      let currentListingsVariationQuantity = await page.evaluate((variant) => {
        // Get the JSON that is held by every button, for every listing - here the listings current quantity can be extracted
        const editQuantityButton = document.querySelector(`tr[data-id="${variant.store_id}"] .shui-dt-column__availableQuantity .inline-editable-pencil button`);
        const dataAttr = JSON.parse(editQuantityButton.getAttribute('data'));
 
        return dataAttr.availableQuantity.content[0].textSpans[0].text;    
      }, variant);

      currentListingsVariationQuantity = parseInt(currentListingsVariationQuantity);

      if (!isNaN(currentListingsVariationQuantity)) {
        const lowerQuantityThreshold = typeof ebayInventoryManagerSettings.lower_quantity_threshold === 'number' ? ebayInventoryManagerSettings.lower_quantity_threshold : parseInt(ebayInventoryManagerSettings.lower_quantity_threshold);
        const higherQuantityThreshold = typeof ebayInventoryManagerSettings.higher_quantity_threshold === 'number' ? ebayInventoryManagerSettings.higher_quantity_threshold : parseInt(ebayInventoryManagerSettings.higher_quantity_threshold);

        await page.hover(`tr[data-id="${variant.store_id}"] td.shui-dt-column__availableQuantity`);

        if (currentListingsVariationQuantity <= lowerQuantityThreshold && variant.product_availability !== 'OUT_OF_STOCK' && variant.product_availability !== '0') {

            await page.click(searchID);
            const quantityInput = `form.inline-edit-price div span input`;
            await page.type(quantityInput, higherQuantityThreshold.toString(), { delay: 100 });

            // Save the reprice change
            await page.click('form.inline-edit-price button[type="submit"]');
            await page.waitFor(quantityInput, { hidden: true, timeout: 15000 }).catch(e => global.appLog.error(`${e} - quantity input element did not disappear in 15 seconds - Ebay._manageSingleVariationsInventory - line 2920`));

            Util.insertListingLog(variant, `Inventory changed to ${higherQuantityThreshold.toString()}.`);
   
        } else if ((variant.product_availability === 'OUT_OF_STOCK' || variant.product_availability === '0' || variant.product_changed == '1' || variant.force_oos == '1') && currentListingsVariationQuantity !== 0) {
          if (ebayInventoryManagerSettings.out_of_stock_action == '2') {
            await page.click(searchID);
            const quantityInput = `form.inline-edit-price div span input`;
            await page.type(quantityInput, '0', { delay: 100 });

            // Save the reprice change
            await page.click('form.inline-edit-price button[type="submit"]');
            
            await page.waitFor(quantityInput, { hidden: true, timeout: 15000 }).catch(e => global.appLog.error(`${e} - quantity input element did not disappear in 15 seconds - Ebay._manageSingleVariationsInventory - line 2933`));

            Util.insertListingLog(variant, `Inventory changed to 0.`);
          }
        }

        await page.waitFor(3000);
      }

    }
  }

  _handleNextPageButton = async page => {
    // Check if there is 'Next' button f
    const hasNextPageButton = await page.evaluate(() => {
      let hasNextPageButton = false;

      if (document.querySelector('.pagination a.pagination__next') !== null) {
        hasNextPageButton = true;
      }
      return hasNextPageButton;
    })
    .catch(error => global.appLog.error(`${error} - inside ebay.reprice - line 593`));
  
    // If yes, click it
    if (hasNextPageButton) {
      await page.click('.pagination a.pagination__next');
      await page.waitFor(5000);
    }
  };

  _getTotalNumberOfPages = async page => {
      const totalNumberOfProductPages = await page.evaluate(() => {

      const totalNumberOfProductPagesDiv = document.querySelector('.pagination ul li:nth-last-child(1) a');
      const totalNumberOfProductPagesAlternativeDiv = document.querySelector('.pagination ol li:nth-last-child(1) a');
  
      // Get only the number from the HTML
      if (totalNumberOfProductPagesDiv !== null) {
        const totalNumberOfProductPages = totalNumberOfProductPagesDiv.textContent.replace(/\D/g,'');
        return parseInt(totalNumberOfProductPages);
      } else if (totalNumberOfProductPagesAlternativeDiv !== null) {
        const totalNumberOfProductPages = totalNumberOfProductPagesAlternativeDiv.textContent.replace(/\D/g,'');
        return parseInt(totalNumberOfProductPages);
      }

      return 1;
    })
    .catch(error => global.appLog.error(`${error} - inside ebay.this._getTotalNumberOfPages eval func - line 1635`));
  
    return totalNumberOfProductPages;
  };

  _customizeListingsTable = async page => {
    const listingsPriceTHeader = await page.$('.shui-dt-column__price');
    const listingsAvailableQuantityTHeader = await page.$('.shui-dt-column__availableQuantity');
    const listingsSKUTHeader = await page.$('.shui-dt-column__listingSKU');
    const listingsWatchCountTHeader = await page.$('.shui-dt-column__watchCount');
    const listingsVisitCountTHeader = await page.$('.shui-dt-column__visitCount');
    const listingsSoldQuantityTHeader = await page.$('.shui-dt-column__soldQuantity');

    if (listingsPriceTHeader === null || listingsAvailableQuantityTHeader === null || listingsSKUTHeader === null || listingsWatchCountTHeader === null || listingsVisitCountTHeader === null || listingsSoldQuantityTHeader === null) {

      // console.log('some checkbox is not checked');
      
      const customizeLink = await page.$('.customize-link');

      if (customizeLink !== null) {
        await customizeLink.click();
        await page.waitFor(5000);

        if (listingsPriceTHeader === null) {
          const customizePriceCheckbox = await page.$('#customize-price');

          if (customizePriceCheckbox !== null) {
            await customizePriceCheckbox.click();
          } else {
            await global.appLog.error('Cannot find the "Current price" checkbox when customizing the listings table.');
          }
        }

        if (listingsAvailableQuantityTHeader === null) {
          const customizeAvailableQuantityCheckbox = await page.$('#customize-availableQuantity');

          if (customizeAvailableQuantityCheckbox !== null) {
            await customizeAvailableQuantityCheckbox.click();
          } else {
            await global.appLog.error('Cannot find the "Available quantity" checkbox when customizing the listings table.');
          }
        }

        if (listingsSKUTHeader === null) {
          const customizeSKUCheckbox = await page.$('#customize-listingSKU');

          if (customizeSKUCheckbox !== null) {
            await customizeSKUCheckbox.click();
          } else {
            await global.appLog.error('Cannot find the "Custom label" checkbox when customizing the listings table.');
          }
        }

        if (listingsWatchCountTHeader === null) {
          const customizeWatchCountCheckbox = await page.$('#customize-watchCount');

          if (customizeWatchCountCheckbox !== null) {
            await customizeWatchCountCheckbox.click();
          } else {
            await global.appLog.error('Cannot find the "Watch count" checkbox when customizing the listings table.');
          }
        }

        if (listingsVisitCountTHeader === null) {
          const customizeVisitCountCheckbox = await page.$('#customize-visitCount');

          if (customizeVisitCountCheckbox !== null) {
            await customizeVisitCountCheckbox.click();
          } else {
            await global.appLog.error('Cannot find the "Visit count" checkbox when customizing the listings table.');
          }
        }

        if (listingsSoldQuantityTHeader === null) {
          const customizeSoldQuantityCheckbox = await page.$('#customize-soldQuantity');

          if (customizeSoldQuantityCheckbox !== null) {
            await customizeSoldQuantityCheckbox.click();
          } else {
            await global.appLog.error('Cannot find the "Sold" checkbox when customizing the listings table.');
          }
        }

        const customizeSaveButton = await page.$('#customize-save');

        if (customizeSaveButton !== null) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            customizeSaveButton.click()
          ]);
        } else {
          const customizeCancelButton = await page.$('#customize-cancel');

          if (customizeCancelButton !== null) {
            await customizeCancelButton.click();
            await page.waitFor(5000);
          }
        }
      }
    }
  }
}

export default Ebay;
