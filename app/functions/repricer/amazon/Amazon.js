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
/* eslint no-lonely-if: 0 */
/* eslint compat/compat: 0 */
/* eslint eqeqeq: 0 */
/* eslint no-return-assign: 0 */
/* eslint no-useless-escape: 0 */
/* eslint promise/always-return: 0 */
/* eslint object-shorthand: 0 */
/* eslint no-else-return: 0 */

import fs from 'fs';
import { ipcMain } from 'electron';
import moment from 'moment';
import Util from '../../core/util/Util';

const isOnline = require('is-online');

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality -> makes puppeteer not as easily detectable
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth')();

puppeteer.use(pluginStealth);

let productsActuallyRepriced = [];
let productsScraped = [];

class Amazon {

  constructor (repricerHelper) {
    this.mainWindow = repricerHelper.mainWindow;
    this.repricerHelper = repricerHelper;

    // Browsers
    this.amazonLoginBrowser = false;
    this.repriceBrowser = false;
    this.inventoryManagerBrowser = false;
    this.listingsScraperBrowser = false;

    // Intervals
    this.amazonRepricerInterval = undefined;
    this.priceCheckInterval = undefined;
    this.refactorPricesInterval = undefined;
    this.amazonInventoryManagementInterval = undefined;


    /*
     * Listen for the check-login event -> if there are cookies saved -> send login status = true to the front end
     * if there are no cookies, open the browser and navigate to the login page ->
     * the user will login manually and the cookies will be saved
     */
    ipcMain.on('check-amazon-login', async () => {
      const marketplaces = await this.canLogIn();
      const amazonAccounts = {
        US: false,
        CA: false,
        UK: false,
        DE: false,
        FR: false,
        IT: false,
        ES: false
      };

      // Check the DB for a specific marketplace`s login details (if absent -> need to login again)
      if (marketplaces.US) {
        amazonAccounts.US = await global.knex('tbl_users')
        .where({ account: 'amazon_us' })
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
        if (amazonAccounts.US === false) {
          marketplaces.US = false;
        }
      }

      if (marketplaces.CA) {
        amazonAccounts.CA = await global.knex('tbl_users')
        .where({ account: 'amazon_ca' })
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
        if (amazonAccounts.CA === false) {
          marketplaces.CA = false;
        }
      }

      if (marketplaces.UK) {
        amazonAccounts.UK = await global.knex('tbl_users')
        .where({ account: 'amazon_uk' })
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
        if (amazonAccounts.UK === false) {
          marketplaces.UK = false;
        }
      }

      if (marketplaces.DE) {
        amazonAccounts.DE = await global.knex('tbl_users')
        .where({ account: 'amazon_de' })
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
        if (amazonAccounts.DE === false) {
          marketplaces.DE = false;
        }
      }

      if (marketplaces.FR) {
        amazonAccounts.FR = await global.knex('tbl_users')
        .where({ account: 'amazon_fr' })
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
        if (amazonAccounts.FR === false) {
          marketplaces.FR = false;
        }
      }

      if (marketplaces.IT) {
        amazonAccounts.IT = await global.knex('tbl_users')
        .where({ account: 'amazon_it' })
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
        if (amazonAccounts.IT === false) {
          marketplaces.IT = false;
        }
      }

      if (marketplaces.ES) {
        amazonAccounts.ES = await global.knex('tbl_users')
        .where({ account: 'amazon_es' })
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
        if (amazonAccounts.ES === false) {
          marketplaces.ES = false;
        }
      }

      // Check if there is at least one condition pair that is true (there are cookies and login details for a marketplace)
      if (
        marketplaces.US ||
        marketplaces.CA ||
        marketplaces.UK ||
        marketplaces.DE ||
        marketplaces.FR ||
        marketplaces.IT ||
        marketplaces.ES
      ) {
        // Call the handle onboarding function as well so that changes in 'sign in' to Amazon marketplace can be reflected
        Util.handleOnboarding(this.mainWindow, {
          action: 'change-settings',
          settings: { sign_in_amazon: true }
        });
      } else {
        // Call the handle onboarding function as well so that changes in 'sign in' to Amazon marketplace can be reflected
        Util.handleOnboarding(this.mainWindow, {
          action: 'change-settings',
          settings: { sign_in_amazon: false }
        });
      }

      this.mainWindow.webContents.send('check-amazon-login', marketplaces, amazonAccounts);
    });

    ipcMain.on('login-amazon', async (event, country) => {
      const loggedInAmazon = await this.logIn(country);

      const amazonAccounts = {};
      // / Check the DB for a specific marketplace`s login details (if absent -> need to login again)
      if (country === 'US') {
        amazonAccounts.US = await global.knex('tbl_users')
        .where({ account: 'amazon_us' })
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
        amazonAccounts.CA = await global.knex('tbl_users')
        .where({ account: 'amazon_ca' })
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
        amazonAccounts.UK = await global.knex('tbl_users')
        .where({ account: 'amazon_uk' })
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
        amazonAccounts.DE = await global.knex('tbl_users')
        .where({ account: 'amazon_de' })
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

      if (country === 'FR') {
        amazonAccounts.FR = await global.knex('tbl_users')
        .where({ account: 'amazon_fr' })
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
        amazonAccounts.IT = await global.knex('tbl_users')
        .where({ account: 'amazon_it' })
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

      if (country === 'ES') {
        amazonAccounts.ES = await global.knex('tbl_users')
        .where({ account: 'amazon_es' })
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

      // Send the country code that we just logged into
      this.mainWindow.webContents.send('check-amazon-login', { [country]: loggedInAmazon }, amazonAccounts);

      global.nucleus.track("AMAZON-LOGIN", {
        description: 'The user has tried to login an Amazon account.',
        [country]: loggedInAmazon
      });
    });

    // If Amazon logout is invoked from the button on the front-end -> do it
    ipcMain.on('logout-amazon', async (event, country) => {
      // Delete the cookie file for the corresponding marketplace
      await this.deleteCookieFile(country);
      // this.mainWindow.webContents.send('check-amazon-login', cookieFileDeleted);
      const marketplaces = await this.canLogIn();

      // Then the DB entry with the credentials has to be deleted -> delete the correct one
      let countryToDeleteCredentials;
      if (country === 'US') {
        countryToDeleteCredentials = 'amazon_us';
      } else if (country === 'CA') {
        countryToDeleteCredentials = 'amazon_ca';
      } else if (country === 'UK') {
        countryToDeleteCredentials = 'amazon_uk';
      } else if (country === 'DE') {
        countryToDeleteCredentials = 'amazon_de';
      } else if (country === 'FR') {
        countryToDeleteCredentials = 'amazon_fr';
      } else if (country === 'IT') {
        countryToDeleteCredentials = 'amazon_it';
      } else if (country === 'ES') {
        countryToDeleteCredentials = 'amazon_es';
      } 

      await global.knex('tbl_users')
      .where({ account: countryToDeleteCredentials })
      .del()
      .catch(error => global.appLog.error(`${error} - inside Amazon - logout-amazon - line 372`));

      this.mainWindow.webContents.send('check-amazon-login', {
        US: marketplaces.US,
        CA: marketplaces.CA,
        UK: marketplaces.UK,
        DE: marketplaces.DE,
        FR: marketplaces.FR,
        IT: marketplaces.IT,
        ES: marketplaces.ES
      });

      global.nucleus.track("AMAZON-LOGOUT", {
        description: 'The user has tried to logout from an Amazon account.',
        country
      });
    });

    /*
     * Listen for the switch-amazon-repricer call from the renderer process -> switch it ON or OFF
     */
    ipcMain.on('switch-amazon-repricer', async (event, value) => {
      // console.log('switch-amazon-repricer', value);
      global.nextAmazonRepricerRun = moment().add(1800000, 'ms').format("DD/MM/YYYY, h:mm:ss a");

      if (value) {

        this.mainWindow.webContents.send('update-amazon-repricer-time', { running: value, status: global.nextAmazonRepricerRun });

        // Run the get prices function 5 minutes after the repricer is started and then every hour
        setTimeout(() => {
          const connectionStatus = isOnline();
          if (connectionStatus) {
            this.repricerHelper.getPrices();
          } else {
            global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
          }
        }, 300000); // 5 minutes

        this.priceCheckInterval = setInterval(() => {
          const connectionStatus = isOnline();
          if (connectionStatus) {
            this.repricerHelper.getPrices();
          } else {
            global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
          }
        }, 3600000); // 1 hour

        this.refactorPricesInterval = setInterval(() => {
          if (!global.refactorPricesIntervalIsRunning) {
            this.repricerHelper.refactorPrices();
          }
        }, 1500000); // 25 minutes

        this.amazonRepricerInterval = setInterval(() => {
          if (!global.amazonRepricerIntervalIsRunning) {
            const connectionStatus = isOnline();
            if (connectionStatus) {
              this.initiateReprice(this.mainWindow);
            } else {
              global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
            }
          }

          global.nextAmazonRepricerRun = moment().add(1800000, 'ms').format("DD/MM/YYYY, h:mm:ss a");
          this.mainWindow.webContents.send('update-amazon-repricer-time', { status: global.nextAmazonRepricerRun });
        }, 1800000); // 30 minutes

        global.nucleus.track("SWITCH_AMAZON_REPRICER_ON", {
          description: 'The user has switched the Amazon Repricer ON.',
          email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
        });

      } else {
        clearInterval(this.priceCheckInterval);
        clearInterval(this.refactorPricesInterval);
        clearInterval(this.amazonRepricerInterval);
        global.nucleus.track("SWITCH_AMAZON_REPRICER_OFF", {
          description: 'The user has switched the Amazon Repricer OFF.',
          email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
        });
      }
    });

    ipcMain.on('switch-amazon-inventory-management', async (event, value) => {
      // console.log('switch-amazon-inventory-management', value);
      if (value) {
        this.amazonInventoryManagementInterval = setInterval(() => {
          if (!global.amazonInventoryManagerIntervalIsRunning) {
            const connectionStatus = isOnline();
            if (connectionStatus) {
              this.manageInventory();
            } else {
              global.appLog.error(
                'There is no internet connection. Dalio`s work will stop until you are connected to the internet.'
              );
            }
          }
        }, 720000); // 12 minutes
      } else {
        clearInterval(this.amazonInventoryManagementInterval);
      }
    });

    ipcMain.on('sync-amazon-listings', async () => {
      this.syncListings();

      global.nucleus.track("SYNC-AMAZON-LISTINGS", {
        description: 'The user has tried to sync his/her Amazon listings.',
        email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
      });
    });

    ipcMain.on('amazon-settings', async (event, info) => {
      this.settingsAction(info);
    });

    // TESTS
    ipcMain.on('reprice-amazon', async () => {
      const connectionStatus = await isOnline();
      if (connectionStatus) {
        this.initiateReprice();
      } else {
        global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
      }
    });

    ipcMain.on('manage-amazon-inventory', async () => {
      const connectionStatus = await isOnline();
      if (connectionStatus) {
        this.manageInventory();
      } else {
        global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
      }
    });
  }

  /*
   * Function that checks if an Amazon cookie file exists
   * if it does exist, it either returns the contents of the cookie file
   * or it checks whether there is a sessionID inside the cookie file, then returns true/false
   * avoids the need of logging in in the background
   */
  canLogIn = async (returnCookies = false, country = 'ALL') => {
    if (country === 'ALL') {
      const cookieFiles = await this.checkIfCookieFileExists().then(async cookieFiles => {
          const marketplaces = {
            US: false,
            CA: false,
            UK: false,
            DE: false,
            FR: false,
            IT: false,
            ES: false
          };

          if (cookieFiles.US) {
            if (returnCookies) {
              const fileContent = this.readCookieFile(true, 'US');
              marketplaces.US = fileContent;
            } else {
              const hasSessionId = await this.readCookieFile(false, 'US');
              marketplaces.US = hasSessionId;
            }
          }

          if (cookieFiles.CA) {
            if (returnCookies) {
              const fileContent = this.readCookieFile(true, 'CA');
              marketplaces.CA = fileContent;
            } else {
              const hasSessionId = await this.readCookieFile(false, 'CA');
              marketplaces.CA = hasSessionId;
            }
          }

          if (cookieFiles.UK) {
            if (returnCookies) {
              const fileContent = this.readCookieFile(true, 'UK');
              marketplaces.UK = fileContent;
            } else {
              const hasSessionId = await this.readCookieFile(false, 'UK');
              marketplaces.UK = hasSessionId;
            }
          }

          if (cookieFiles.DE) {
            if (returnCookies) {
              const fileContent = this.readCookieFile(true, 'DE');
              marketplaces.DE = fileContent;
            } else {
              const hasSessionId = await this.readCookieFile(false, 'DE');
              marketplaces.DE = hasSessionId;
            }
          }

          if (cookieFiles.FR) {
            if (returnCookies) {
              const fileContent = this.readCookieFile(true, 'FR');
              marketplaces.FR = fileContent;
            } else {
              const hasSessionId = await this.readCookieFile(false, 'FR');
              marketplaces.FR = hasSessionId;
            }
          }

          if (cookieFiles.IT) {
            if (returnCookies) {
              const fileContent = this.readCookieFile(true, 'IT');
              marketplaces.IT = fileContent;
            } else {
              const hasSessionId = await this.readCookieFile(false, 'IT');
              marketplaces.IT = hasSessionId;
            }
          }

          if (cookieFiles.ES) {
            if (returnCookies) {
              const fileContent = this.readCookieFile(true, 'ES');
              marketplaces.ES = fileContent;
            } else {
              const hasSessionId = await this.readCookieFile(false, 'ES');
              marketplaces.ES = hasSessionId;
            }
          }

          return marketplaces;
        }
      );

      return cookieFiles;
    }

    const cookieFile = await this.checkIfCookieFileExists().then(async cookieFiles => {
        if (cookieFiles[country]) {
          if (returnCookies) {
            const fileContent = await this.readCookieFile(true, country);
            return fileContent;
          }

          const hasSessionId = await this.readCookieFile(false, country);
          return hasSessionId;
        }
        return false;
      }
    );

    return cookieFile;
  };

  logIn = async country => {
    // Makes sure that the Amazon 'Login browser' is not open already
    if (!this.amazonLoginBrowser) {
      try {
        this.amazonLoginBrowser = await puppeteer.launch({
          headless: false,
          executablePath: Util.getChromiumExecPath(puppeteer),
          slowMo: 100,
          devtools: false,
          defaultViewport: null,
          ignoreDefaultArgs: ['--enable-automation'],
          args: ['--disable-webgl'],
        });

        // When the 'Login browser' closes -> update the tracking variable so that the browser can be opened again
        this.amazonLoginBrowser.on('disconnected', () => {
          this.amazonLoginBrowser = false;
        });

        const page = await this.amazonLoginBrowser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setDefaultNavigationTimeout(0);

        if (global.proxyUsername !== '' && global.proxyPassword !== '') {
          await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
        }

        // Turn on request interception for puppeteer so we can save the user`s username/password
        await page.setRequestInterception(true);

        page.on('request', request => {
          // Check if it is a login POST request
          if (
            request.url() === 'https://sellercentral.amazon.co.uk/ap/signin' ||
            request.url() === 'https://sellercentral.amazon.com/ap/signin' ||
            request.url() === 'https://sellercentral.amazon.ca/ap/signin' ||
            request.url() === 'https://sellercentral.amazon.com.mx/ap/signin' ||
            request.url() === 'https://sellercentral.amazon.de/ap/signin' ||
            request.url() === 'https://sellercentral.amazon.fr/ap/signin' ||
            request.url() === 'https://sellercentral.amazon.it/ap/signin' ||
            request.url() === 'https://sellercentral.amazon.es/ap/signin'
          ) {
            // Get the POST request body params
            const params = new URLSearchParams(request.postData());

            // Track which marketplace we are logging in, so the right DB amazon account can be added/updated
            let accountMarketplace;

            if (request.url() === 'https://sellercentral.amazon.com/ap/signin') {
              accountMarketplace = 'amazon_us';
            } else if (request.url() === 'https://sellercentral.amazon.co.uk/ap/signin') {
              accountMarketplace = 'amazon_uk';
            } else if (request.url() === 'https://sellercentral.amazon.ca/ap/signin') {
              accountMarketplace = 'amazon_ca';
            } else if (request.url() === 'https://sellercentral.amazon.de/ap/signin') {
              accountMarketplace = 'amazon_de';
            } else if (request.url() === 'https://sellercentral.amazon.fr/ap/signin') {
              accountMarketplace = 'amazon_fr';
            } else if (request.url() === 'https://sellercentral.amazon.it/ap/signin') {
              accountMarketplace = 'amazon_it';
            } else if (request.url() === 'https://sellercentral.amazon.es/ap/signin') {
              accountMarketplace = 'amazon_es';
            } else {
              // nothing
            }

            /*
             * There are two /ap/signin requests - 1 for email and password and 1 for OTP code
             * check that it is not OTP code as we do not need it
             */
            if (params.get('otpCode') === null) {
              
              // If there is no account for 'Amazon' add it, else -> update it
              global
                .knex('tbl_users')
                .where({ account: accountMarketplace })
                .then(rows => {
                  if (rows.length === 0) {
                    global
                      .knex('tbl_users')
                      .insert({
                        account: accountMarketplace,
                        email: params.get('email'),
                        password: params.get('password')
                      })
                      .catch(error => global.appLog.error(`${error} - inside amazon.logIn - line 105`));
                  } else {
                    global
                      .knex('tbl_users')
                      .where({ account: accountMarketplace })
                      .update({
                        email: params.get('email'),
                        password: params.get('password')
                      })
                      .catch(error => global.appLog.error(`${error} - inside amazon.logIn - line 114`));
                  }
                  return null;
                })
                .catch(error => global.appLog.error(`${error} - inside amazon request interception - line 133`));
              // Continue the request as the email and password have been saved to the DB
              request
                .continue()
                .catch(error => global.appLog.error(`${error} - inside amazon.logIn - line 119`));
            } else {
              // Continue as it is not the 'ap/signin' request we are looking for
              request
                .continue()
                .catch(error => global.appLog.error(`${error} - inside amazon.logIn - line 122`));
            }
          } else {
            // Continue as it is not an 'ap/signin' request at all
            request
              .continue()
              .catch(error => global.appLog.error(`${error} - inside amazon.logIn - line 26`));
          }
        });

        // Check which Amazon Seller Central domain we are logging in -> go to the correct one
        if (country === 'US') {
          // await page.goto('https://sellercentral.amazon.com', { waitUntil: 'networkidle0' });
          await page.goto('https://sellercentral.amazon.com', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'CA') {
          // await page.goto('https://sellercentral.amazon.ca', { waitUntil: 'networkidle0' });
          await page.goto('https://sellercentral.amazon.ca', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'UK') {
          // await page.goto('https://sellercentral.amazon.co.uk', { waitUntil: 'networkidle0' });
          await page.goto('https://sellercentral.amazon.co.uk', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'DE') {
          // await page.goto('https://sellercentral.amazon.de', { waitUntil: 'networkidle0' });
          await page.goto('https://sellercentral.amazon.de', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'FR') {
          // await page.goto('https://sellercentral.amazon.fr', { waitUntil: 'networkidle0' });
          await page.goto('https://sellercentral.amazon.fr', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'IT') {
          // await page.goto('https://sellercentral.amazon.it', { waitUntil: 'networkidle0' });
          await page.goto('https://sellercentral.amazon.it', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'ES') {
          // await page.goto('https://sellercentral.amazon.es', { waitUntil: 'networkidle0' });
          await page.goto('https://sellercentral.amazon.es', { waitUntil: 'domcontentloaded' });
          await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else {
          // nothing
        }

        // Check if there is no sign out button ? we need to login
        const loggedIn = await page.$('.sc-logout-quicklink');

        // If not logged in wait for the user to manually login and then the appearance of logout button
        if (!loggedIn) {
          await page.waitForSelector('#sign-in-button button', { timeout: 60000 });
          await page.click('#sign-in-button button');
          // Wait for the reload to completely finish
          await page.waitForNavigation({ waitUntil: 'networkidle0' });

          // Check if the user has been logged out and only requires the password to be entered
          const requiresOnlyPassword = await page.evaluate(() => {
            let pass = false;

            // If Amazon wants password only -> return true
            if (document.querySelector('#ap-credential-autofill-hint') !== null) {
              pass = true;
            }
            return Promise.resolve(pass);
          });

          if (requiresOnlyPassword) {
            let passwordToInput;

            // Run a DB query that gets the required 'Amazon' password and assign it to the 'passwordToInput' variable
            const accountMarketplace = `amazon_${country.toLowerCase()}`;

            await global
              .knex('tbl_users')
              .where({ account: accountMarketplace })
              .then(rows => {
                passwordToInput = rows[0].password;
                return null;
              })
              .catch(error => global.appLog.error(`${error} - inside amazon.logIn - line 177`));

            // Type the password in the input field with a delay as if it was a human
            await page.type('#ap_password', passwordToInput.toString(), { delay: 100 });
            
            // Needs to be randomized
            await page.waitFor(2000);
            // Check if the 'Remember me' checkbox is checked -> if not then check it
            await page.evaluate(() => {
              if (document.querySelector('input[name=rememberMe]') !== null) {
                const rememberMeCheckbox = document.querySelector('input[name=rememberMe]');
                if (!rememberMeCheckbox.hasAttribute('checked')) {
                  rememberMeCheckbox.click();
                }
              }
            });

            // Click the 'Sign in' button
            await page.click('#signInSubmit');
          }

          // Here we know that the user has logged in
          await page.waitFor('.sc-logout-quicklink', { timeout: 0 });

          // Save page cookies to a file
          await this.writeCookieFile(page);

          // Close the login browser
          await this.amazonLoginBrowser.close();
          // return true for successful login
          return true;
        }
        // If the user has valid cookies and is logged in -> close the browser
        await this.amazonLoginBrowser.close();
        // return true for successful login
        return true;
      } catch (error) {
        global.appLog.error(`${error} - inside amazon.logIn catch-block - line 217`);
        this.amazonLoginBrowser.close();
        return false;
      }
    }
  };

  /*
   * Checks if an Amazon cookie files exists and returns true/false
   */
  checkIfCookieFileExists = async (type = 'repricer') => {
    const US = await new Promise((resolve, reject) => {
      let cookiePath = global.amazonUSCookiePath;

      if (type === 'autoorder') {
        cookiePath = global.amazonAutoorderUSCookiePath;
      }
      return fs.access(cookiePath, fs.F_OK, err => {
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
      let cookiePath = global.amazonCACookiePath;

      if (type === 'autoorder') {
        cookiePath = global.amazonAutoorderCACookiePath;
      }
      return fs.access(cookiePath, fs.F_OK, err => {
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
      let cookiePath = global.amazonUKCookiePath;

      if (type === 'autoorder') {
        cookiePath = global.amazonAutoorderUKCookiePath;
      }
      return fs.access(cookiePath, fs.F_OK, err => {
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
      let cookiePath = global.amazonDECookiePath;

      if (type === 'autoorder') {
        cookiePath = global.amazonAutoorderDECookiePath;
      }
      return fs.access(cookiePath, fs.F_OK, err => {
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

    const FR = await new Promise((resolve, reject) => {
      let cookiePath = global.amazonFRCookiePath;

      if (type === 'autoorder') {
        cookiePath = global.amazonAutoorderFRCookiePath;
      }
      return fs.access(cookiePath, fs.F_OK, err => {
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
      let cookiePath = global.amazonITCookiePath;

      if (type === 'autoorder') {
        cookiePath = global.amazonAutoorderITCookiePath;
      }
      return fs.access(cookiePath, fs.F_OK, err => {
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

    const ES = await new Promise((resolve, reject) => {
      let cookiePath = global.amazonESCookiePath;

      if (type === 'autoorder') {
        cookiePath = global.amazonAutoorderESCookiePath;
      }
      return fs.access(cookiePath, fs.F_OK, err => {
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

    return { US, CA, UK, DE, FR, IT, ES };
  };

  /*
   * Delete Amazon cookie file -> logging out of Amazon account
   */
  deleteCookieFile = async (country = 'US', type = 'repricer') => {
    let cookieFilePath = global.amazonUSCookiePath;

    if (type === 'autoorder') {
      cookieFilePath = global.amazonAutoorderUSCookiePath;
    }
    if (country === 'CA') {
      if (type === 'autoorder') {
        cookieFilePath = global.amazonAutoorderCACookiePath;
      } else {
        cookieFilePath = global.amazonCACookiePath;
      }
    } else if (country === 'UK') {
      if (type === 'autoorder') {
        cookieFilePath = global.amazonAutoorderUKCookiePath;
      } else {
        cookieFilePath = global.amazonUKCookiePath;
      }
    } else if (country === 'DE') {
      if (type === 'autoorder') {
        cookieFilePath = global.amazonAutoorderDECookiePath;
      } else {
        cookieFilePath = global.amazonDECookiePath;
      }
    } else if (country === 'FR') {
      if (type === 'autoorder') {
        cookieFilePath = global.amazonAutoorderFRCookiePath;
      } else {
        cookieFilePath = global.amazonFRCookiePath;
      }
    } else if (country === 'IT') {
      if (type === 'autoorder') {
        cookieFilePath = global.amazonAutoorderITCookiePath;
      } else {
        cookieFilePath = global.amazonITCookiePath;
      }
    } else if (country === 'ES') {
      if (type === 'autoorder') {
        cookieFilePath = global.amazonAutoorderESCookiePath;
      } else {
        cookieFilePath = global.amazonESCookiePath;
      }
    } else {
      // nothing
    }

    fs.unlink(cookieFilePath, error => {
      if (error) {
        global.appLog.error(`Error while deleting Amazon ${country} cookie file - ${error}`);
        return false;
      }
      return true;
    });
  };

   /*
   * Reads the Amazon Cookie File and either returns the whole contents of the cookie file
   * or returns true/false representing whether the file contains an Amazon sessionID
   */
  readCookieFile = async (returnCookies = false, country = 'US', type = 'repricer') => {
    // Query the file content of the specified country`s cookie file
    const fileContent = await new Promise((resolve, reject) => {
      // Default cookie path is US
      let cookieFilePath = global.amazonUSCookiePath;

      if (type === 'autoorder') {
        cookieFilePath = global.amazonAutoorderUSCookiePath;
      }

      if (country === 'CA') {
        // If CA is specified, change to it
        if (type === 'autoorder') {
          cookieFilePath = global.amazonAutoorderCACookiePath;
        } else {
          cookieFilePath = global.amazonCACookiePath;
        }
      } else if (country === 'UK') {
        if (type === 'autoorder') {
          cookieFilePath = global.amazonAutoorderUKCookiePath;
        } else {
          cookieFilePath = global.amazonUKCookiePath;
        }
      } else if (country === 'DE') {
        if (type === 'autoorder') {
          cookieFilePath = global.amazonAutoorderDECookiePath;
        } else {
          cookieFilePath = global.amazonDECookiePath;
        }
      } else if (country === 'FR') {
        if (type === 'autoorder') {
          cookieFilePath = global.amazonAutoorderFRCookiePath;
        } else {
          cookieFilePath = global.amazonFRCookiePath;
        }
      } else if (country === 'IT') {
        if (type === 'autoorder') {
          cookieFilePath = global.amazonAutoorderITCookiePath;
        } else {
          cookieFilePath = global.amazonITCookiePath;
        }
      } else if (country === 'ES') {
        if (type === 'autoorder') {
          cookieFilePath = global.amazonAutoorderESCookiePath;
        } else {
          cookieFilePath = global.amazonESCookiePath;
        }
      } 

      // This function reads and returns the content of the cookie file -> it is parsed as JSON
      return fs.readFile(cookieFilePath, { encoding: 'utf8' }, (err, data) => {
        if (err) {
          return reject(err);
        }

        return resolve(JSON.parse(data));
      });
    });

    // If returnCookies parameter is true -> return the whole content of the file
    if (returnCookies) {
      return fileContent;
    }

    // If returnCookies parameter is false -> just check if the cookie file contains a session id -> return it
    let hasSessionId = false;

    await fileContent.forEach(item => {
      if (item.name === 'session-id') {
        hasSessionId = true;
      }
    });

    return hasSessionId;
  };

  /*
   * Gets the cookies from the Amazon session and saves/overwrites the cookie file
   */
  writeCookieFile = async page => {
    global.amazonCookies.US = await page.cookies(
      'https://amazon.com',
      'https://sellercentral.amazon.com',
      'https://account.amazon.com'
    );

    global.amazonCookies.CA = await page.cookies(
      'https://amazon.ca',
      'https://sellercentral.amazon.ca'
    );

    global.amazonCookies.MX = await page.cookies(
      'https://amazon.com.mx',
      'https://sellercentral.amazon.com.mx'
    );

    global.amazonCookies.UK = await page.cookies(
      'https://amazon.co.uk',
      'https://sellercentral.amazon.co.uk'
    );

    global.amazonCookies.DE = await page.cookies(
      'https://amazon.de',
      'https://sellercentral.amazon.de'
    );

    global.amazonCookies.FR = await page.cookies(
      'https://amazon.fr',
      'https://sellercentral.amazon.fr'
    );

    global.amazonCookies.IT = await page.cookies(
      'https://amazon.it',
      'https://sellercentral.amazon.it'
    );

    global.amazonCookies.ES = await page.cookies(
      'https://amazon.es',
      'https://sellercentral.amazon.es'
    );

    // Write the cookies in a local file and close the browser
    try {
      if (global.amazonCookies.US.length > 0) {
        fs.writeFileSync(
          global.amazonUSCookiePath,
          JSON.stringify(global.amazonCookies.US),
          'utf-8'
        );
      }

      if (global.amazonCookies.CA.length > 0) {
        fs.writeFileSync(
          global.amazonCACookiePath,
          JSON.stringify(global.amazonCookies.CA),
          'utf-8'
        );
      }

      if (global.amazonCookies.UK.length > 0) {
        fs.writeFileSync(
          global.amazonUKCookiePath,
          JSON.stringify(global.amazonCookies.UK),
          'utf-8'
        );
      }

      if (global.amazonCookies.DE.length > 0) {
        fs.writeFileSync(
          global.amazonDECookiePath,
          JSON.stringify(global.amazonCookies.DE),
          'utf-8'
        );
      }

      if (global.amazonCookies.FR.length > 0) {
        fs.writeFileSync(
          global.amazonFRCookiePath,
          JSON.stringify(global.amazonCookies.FR),
          'utf-8'
        );
      }

      if (global.amazonCookies.IT.length > 0) {
        fs.writeFileSync(
          global.amazonITCookiePath,
          JSON.stringify(global.amazonCookies.IT),
          'utf-8'
        );
      }

      if (global.amazonCookies.ES.length > 0) {
        fs.writeFileSync(
          global.amazonESCookiePath,
          JSON.stringify(global.amazonCookies.ES),
          'utf-8'
        );
      }
    } catch (error) { 
      global.appLog.error(`${error} - inside amazon.writeCookieFile catch block - line 311`);
    }
  };

  initiateReprice = async mainWindow => {
    // Track on a global level that the Amazon Repricer is actually running
    global.amazonRepricerIntervalIsRunning = true;
    mainWindow.webContents.send('update-amazon-repricer-time', { status: 'Running now...'});

    let repriceKnexQuery;

    if (global.accountStatus === '1') {
      // If the user has a paid Dalio subscription -> work with all listings available
      repriceKnexQuery = global.knex.select().from('tbl_listings');
    } else {
      // If the user does not have a paid subscription -> limit repricing to a 100 listings
      repriceKnexQuery = global.knex.select().from('tbl_listings').limit(100);
    }
    // This will be used to track all listings pulled from DB
    const listingsToReprice = {
      US: [],
      CA: [],
      MX: [],
      UK: [],
      DE: [],
      FR: [],
      IT: [],
      ES: []
    };

    return repriceKnexQuery.then(async listings => {
        // Iterate through all of the listings pulled from the DB
        await listings.forEach(listing => {
          // Make sure that we are only working with Amazon listings here
          if (listing.store === 'amazon') {
            /* Do not consider for reprice, listings that are not connected to a source
            * Listings with a new_price equal to null are not yet connected to a source or they have not been price checked yet
            * Some product supplier`s might return a price of empty string - "" if the product is out of stock
            * Do not consider listings without a valid Amazon url (for now check for .amazon.) -> improve later
            */
           if (
             listing.supplier !== null && 
             listing.new_price !== null &&
             listing.supplier_url !== null && 
             listing.new_price !== "" &&
             listing.refactored_price !== "" &&
             listing.store_url.includes('.amazon.')
              ) {
              // Remove parent listings from the process as they are only containers for their variations
              if (listing.has_variations === '0') {
                // Check whether the listing has a discrepancy between the price we are aiming for and the currently listed price
                if (listing.refactored_price !== listing.price) {
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
                      //   `Listing '${listing.item_name}' is out of stock and its price will be increased multiple times in order to prevent customers from ordering it. The source price of the listing is ${listing.new_price}. Current price on Amazon is ${listing.price}. The new price will be ${listing.refactored_price}. ${refactorSettingsMessage}`
                      // );
                      escapedLog = encodeURI(
                        `Is out of stock and its price will be increased multiple times in order to prevent customers from ordering it. The source price of the listing is ${listing.new_price}. Current price on Amazon is ${listing.price}. The new price will be ${listing.refactored_price}. ${refactorSettingsMessage}`
                      );
                    } else {
                      // escapedLog = encodeURI(
                      //   `Listing '${listing.item_name}' will be repriced. The source price of the listing is ${listing.new_price}. Current price on Amazon is ${listing.price}. The new price will be ${listing.refactored_price}. ${refactorSettingsMessage}`
                      // );
                      escapedLog = encodeURI(
                        `Will be repriced soon. The source price of the listing is ${listing.new_price}. Current price on Amazon is ${listing.price}. The new price will be ${listing.refactored_price}. ${refactorSettingsMessage}`
                      );
                    }
                  } else {
                    // escapedLog = encodeURI(
                    //   `Listing '${listing.item_name}' will be repriced for the first time. The source price of the listing is ${listing.new_price}. The price on Amazon will be ${listing.refactored_price}. ${refactorSettingsMessage}`
                    // );
                    escapedLog = encodeURI(
                      `Will be repriced for the first time. The source price of the listing is ${listing.new_price}. The price on Amazon will be ${listing.refactored_price}. ${refactorSettingsMessage}`
                    );
                  }
                  // global.log.warn(escapedLog);
                  Util.insertListingLog(listing, escapedLog, 'info');

                  // Destructure the store_url property from each listing object and use it to determine to which marketplace domain it belongs
                  const { store_url } = listing;
                  if (store_url.includes('amazon.com')) {
                    listingsToReprice.US.push(listing);
                  } else if (store_url.includes('amazon.ca')) {
                    listingsToReprice.CA.push(listing);
                  } else if (store_url.includes('amazon.com.mx')) {
                    listingsToReprice.MX.push(listing);
                  } else if (store_url.includes('amazon.co.uk')) {
                    listingsToReprice.UK.push(listing);
                  } else if (store_url.includes('amazon.de')) {
                    listingsToReprice.DE.push(listing);
                  } else if (store_url.includes('amazon.fr')) {
                    listingsToReprice.FR.push(listing);
                  } else if (store_url.includes('amazon.it')) {
                    listingsToReprice.IT.push(listing);
                  } else if (store_url.includes('amazon.es')) {
                    listingsToReprice.ES.push(listing);
                  } else {
                    // do nothing
                  }
                }
              }
            }
          }
        });

        // Track if there are Amazon listings to be repriced -> assume false
        let repriceCheckStatus = false;

        // Iterate through all of marketplaces` arrays and check if any of them contain listings to reprice
        for (const [marketplace, marketplaceListings] of Object.entries(listingsToReprice)) {
          if (marketplaceListings.length !== 0) {
            // If yes, then call the reprice function
            repriceCheckStatus = true;
            await this.reprice(marketplace, marketplaceListings);
          }
        }

        // If no -> log that there is nothing to reprice
        if (!repriceCheckStatus) {
          const escapedLog = encodeURI(`Amazon reprice check made - there are no listings to reprice.`);
          await global.log.info(escapedLog);
        }

        // The Amazon repricer has finished -> update the global variable, so it can be run again
        global.amazonRepricerIntervalIsRunning = false;
        await mainWindow.webContents.send('update-ebay-repricer-time', { status: global.nextEbayRepricerRun });
        await global.nucleus.track("AMAZON-REPRICER-RAN", {
          description: 'The Amazon repricer ran.',
          email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
        });
        return null;
      })
      .catch(error => global.appLog.error(`${error} - inside amazon.initiateReprice - line 420`));
  };

  /*
   * Reprices the Amazon products
   */
  reprice = async (marketplace, marketplaceListingsArray) => {
    try {
      this.repriceBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        slowMo: 100,
        devtools: false,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--disable-webgl'
        ],
      });

      const page = await this.repriceBrowser.newPage();
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
        // Get the Amazon cookies from the file
        global.amazonCookies.US = await this.canLogIn(true, 'US');
        if (!global.amazonCookies.US) {
          canRepriceThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.US);
          await page.goto('https://sellercentral.amazon.com', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'CA') {
        global.amazonCookies.CA = await this.canLogIn(true, 'CA');
        if (!global.amazonCookies.CA) {
          canRepriceThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.CA);
          await page.goto('https://sellercentral.amazon.ca', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'UK') {
        global.amazonCookies.UK = await this.canLogIn(true, 'UK');
        if (!global.amazonCookies.UK) {
          canRepriceThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.UK);
          await page.goto('https://sellercentral.amazon.co.uk', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'DE') {
        global.amazonCookies.DE = await this.canLogIn(true, 'DE');
        if (!global.amazonCookies.DE) {
          canRepriceThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.DE);
          await page.goto('https://sellercentral.amazon.de', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'FR') {
        global.amazonCookies.FR = await this.canLogIn(true, 'FR');
        if (!global.amazonCookies.FR) {
          canRepriceThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.FR);
          await page.goto('https://sellercentral.amazon.fr', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'IT') {
        global.amazonCookies.IT = await this.canLogIn(true, 'IT');
        if (!global.amazonCookies.IT) {
          canRepriceThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.IT);
          await page.goto('https://sellercentral.amazon.it', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'ES') {
        global.amazonCookies.ES = await this.canLogIn(true, 'ES');
        if (!global.amazonCookies.ES) {
          canRepriceThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.ES);
          await page.goto('https://sellercentral.amazon.es', {
            waitUntil: 'networkidle0'
          });
        }
      }

      // If there are cookies for the current marketplace and can be repriced
      if (canRepriceThisMarketplace) {
        // Check if there is no sign out button ? we need to login
        const loggedIn = await checkIfLoggedIn(page);

        if (!loggedIn) {
          // Login if needed
          await loginWithPasswordOnly(page, marketplace);
        }

        /* Make sure we are in the correct marketplace by clicking the corresponding select value 
        * (sometimes even if the URL is, for example, .co.uk it can be set to any of the other marketplaces)
        */
        await clickMarketplaceSelector(page, marketplace);

        /* Check if credit card info is not showing for the account. If it does then full-acount access is needed
        * if the users` credit card had been declined -> a paywall will show and thus prevent the reprice from doing its job
        */
        const creditCardInfo = await page.$('#go-to-credit-card-info');

        // If there is no paywall
        if (creditCardInfo === null) {
          // Go to inventory page
          await page.click('#sc-navtab-inventory');

          // Wait for the reload to completely finish
          await page.waitForNavigation({ waitUntil: 'networkidle0' });

          // Scroll to bottom of page as the page uses AJAX so that the listings per page button can appear
          await Util.autoScroll(page);

          // Establish whether the '250 products per page' selection is already made -> if not -> make it
          await switchTo250ResultsPerPage(page);

          // Find the total number of productpages in the current marketplace by grabbing the inner html of the number button before 'Next'
          const totalNumberOfProductPages = await getTotalNumberOfProductPages(page);
          /*
           * If there is more than 1 product page in the current Amazon marketplace
           * iterate through all of them and look for matching products to reprice
           */
          if (totalNumberOfProductPages > 1) {
            for (let i = 0; i < totalNumberOfProductPages; i++) {
              await repriceProductsOnSinglePage(page, marketplaceListingsArray, marketplace);
            }
          } else {
            await repriceProductsOnSinglePage(page, marketplaceListingsArray, marketplace);
          }

          if (productsActuallyRepriced.length !== 0) {
            // After the repricing is done on the website, update the DB entries accordingly
            await productsActuallyRepriced.forEach(product => {
              if (product.id !== undefined) {
                let escapedLog = '';
                if (product.price !== null) {
                  // escapedLog = encodeURI(`'${product.item_name}' has been repriced from ${product.price} to ${product.new_price}`);
                  escapedLog = encodeURI(`'Has been repriced from ${product.price} to ${product.new_price}`);
                } else {
                  escapedLog = encodeURI(`Has been repriced for the first time with price ${product.new_price}`);
                }

                // global.log.info(escapedLog);
                Util.insertListingLog(product, escapedLog, 'info');

                global
                  .knex('tbl_listings')
                  .where({ store_id: product.asin })
                  .update({
                    price: product.new_price,
                    last_repriced: global.knex.fn.now()
                  }).catch(error => global.appLog.error(`${error} - inside amazon.reprice - line 682`));
              }
            });
          }
        } else {
          await global.log.error(
            `Amazon reprice could not be finished. Please check the payment method chosen for your Amazon Seller Central ${marketplace} account.`
          );
        }

        // Save the page cookies to a file
        await this.writeCookieFile(page);
      } else {
        const escapedLog = encodeURI(
          `Cannot reprice listings from the ${marketplace} marketplace. Please login in order to reprice the listings.`
        );
        global.log.error(escapedLog);
      }

      // Close the browser
      await this.repriceBrowser.close();

      if (productsActuallyRepriced.length > 0) {
        await this.repricerHelper.handleStats('increase-total-reprices', productsActuallyRepriced.length);
        productsActuallyRepriced = [];
      }
    } catch (error) {
      global.appLog.error(`${error} in amazon.reprice - line 706`);
      this.repriceBrowser.close();
    }
  };

  manageInventory = async () => {
    global.amazonInventoryManagerIntervalIsRunning = true;

    let manageInventoryKnexQuery;
    if (global.accountStatus === '1') {
      // If the user has a paid subscription -> no limit
      manageInventoryKnexQuery = global.knex.select().from('tbl_listings');
    } else {
      // If the user does not have a paid subscription -> limit repricing to a 100 listings
      manageInventoryKnexQuery = global.knex.select().from('tbl_listings').limit(100);
    }

    // Object with empty arrays that will hold all listings of a specific Amazon marketplace
    const listingsToManage = {
      US: [],
      CA: [],
      MX: [],
      UK: [],
      DE: [],
      FR: [],
      IT: [],
      ES: []
    };

    // Query all listings
    return manageInventoryKnexQuery
      .then(async listings => {
        await listings.forEach(listing => {
          const { store_url } = listing;
          // Check which marketplace a listing belongs to and populate the object with empty arrays
          if (store_url.includes('amazon.com')) {
            listingsToManage.US.push(listing);
          } else if (store_url.includes('amazon.ca')) {
            listingsToManage.CA.push(listing);
          } else if (store_url.includes('amazon.com.mx')) {
            listingsToManage.MX.push(listing);
          } else if (store_url.includes('amazon.co.uk')) {
            listingsToManage.UK.push(listing);
          } else if (store_url.includes('amazon.de')) {
            listingsToManage.DE.push(listing);
          } else if (store_url.includes('amazon.fr')) {
            listingsToManage.FR.push(listing);
          } else if (store_url.includes('amazon.it')) {
            listingsToManage.IT.push(listing);
          } else if (store_url.includes('amazon.es')) {
            listingsToManage.ES.push(listing);
          } else {
            // do nothing
          }
        });

        let mustManageListings = false;

        // Check if any of the marketplaces have listings that need inventory managing
        for (const [marketplace, marketplaceListings] of Object.entries(listingsToManage)) {
          if (marketplaceListings.length !== 0) {
            mustManageListings = true;
            await this.loginAndChangeQuantities(marketplace, marketplaceListings);
          }
        }

        if (!mustManageListings) {
          const escapedLog = encodeURI(
            `Amazon inventory management check made - there are no listings to update the quantities of.`
          );
          global.log.info(escapedLog);
        }

        global.amazonInventoryManagerIntervalIsRunning = false;
        return null;
      })
      .catch(error => global.appLog.error(`${error} - inside amazon.manageInventory - line 725`));
  };

  loginAndChangeQuantities = async (marketplace, marketplaceListings) => {
    try {
      this.inventoryManagerBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        slowMo: 100,
        devtools: false,
        defaultViewport: null,
        args: [
          '--disable-webgl'
        ],
      });

      const page = await this.inventoryManagerBrowser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setDefaultNavigationTimeout(0);

      let canManageInventoryInThisMarketplace = true;
      if (marketplace === 'US') {
        // Get the Amazon cookies from the file
        global.amazonCookies.US = await this.canLogIn(true, 'US');
        if (!global.amazonCookies.US) {
          canManageInventoryInThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.US);
          await page.goto('https://sellercentral.amazon.com', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'CA') {
        global.amazonCookies.CA = await this.canLogIn(true, 'CA');
        if (!global.amazonCookies.CA) {
          canManageInventoryInThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.CA);
          await page.goto('https://sellercentral.amazon.ca', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'UK') {
        global.amazonCookies.UK = await this.canLogIn(true, 'UK');
        if (!global.amazonCookies.UK) {
          canManageInventoryInThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.UK);
          await page.goto('https://sellercentral.amazon.co.uk', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'DE') {
        global.amazonCookies.DE = await this.canLogIn(true, 'DE');
        if (!global.amazonCookies.DE) {
          canManageInventoryInThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.DE);
          await page.goto('https://sellercentral.amazon.de', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'FR') {
        global.amazonCookies.FR = await this.canLogIn(true, 'FR');
        if (!global.amazonCookies.FR) {
          canManageInventoryInThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.FR);
          await page.goto('https://sellercentral.amazon.fr', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'IT') {
        global.amazonCookies.IT = await this.canLogIn(true, 'IT');
        if (!global.amazonCookies.IT) {
          canManageInventoryInThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.IT);
          await page.goto('https://sellercentral.amazon.it', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'ES') {
        global.amazonCookies.ES = await this.canLogIn(true, 'ES');
        if (!global.amazonCookies.ES) {
          canManageInventoryInThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.ES);
          await page.goto('https://sellercentral.amazon.es', {
            waitUntil: 'networkidle0'
          });
        }
      }

      if (canManageInventoryInThisMarketplace) {
        // Check if there is no sign out button ? we need to login
        const loggedIn = await page.evaluate(() => {
            let isLoggedIn = false;
            if (document.querySelector('.sc-logout-quicklink') === null) {
              const signInButton = document.querySelector('#sign-in-button button');
              signInButton.click();
            } else {
              isLoggedIn = true;
            }
            return Promise.resolve(isLoggedIn);
          })
          .catch(error => global.appLog.error(`${error} - inside amazon.loginAndChangeQuantities - line 766`));

        if (!loggedIn) {
          await loginWithPasswordOnly(page, marketplace);
        }

        /* Make sure we are in the correct marketplace by clicking the corresponding select value 
        * (sometimes even if the URL is, for example, .co.uk it can be set to any of the other marketplaces)
        */
        await clickMarketplaceSelector(page, marketplace);

        // Check if credit card info is not showing for the account. If it does then the user has an invalid payment method and account access has been limited -> full-acount access is needed
        const creditCardInfo = await page.$('#go-to-credit-card-info');

        if (creditCardInfo === null) {
          // Go to inventory page
          await page.click('#sc-navtab-inventory');

          // Wait for the reload to completely finish
          await page.waitForNavigation({ waitUntil: 'networkidle0' });

          // Scroll to bottom of page as the page uses AJAX so that the listings per page button can appear
          await Util.autoScroll(page);

          // Establish whether the '250 products per page' selection is already made -> if not -> make it
          await switchTo250ResultsPerPage(page);

          // Find the total number of productpages in the current marketplace by grabbing the inner html of the number button before 'Next'
          const totalNumberOfProductPages = await getTotalNumberOfProductPages(page);

          /*
           * If there is more than 1 product page in the current Amazon marketplace
           * iterate through all of them and do inventory management where necessary
           */
          if (totalNumberOfProductPages > 1) {
            for (let i = 0; i < totalNumberOfProductPages; i++) {
              await manageInventoryOnSinglePage(page, marketplaceListings, marketplace);
            }
          } else {
            await manageInventoryOnSinglePage(page, marketplaceListings, marketplace);
          }
        } else {
          await global.log.error(
            `Amazon inventory management could not be finished. Please check the payment method chosen for your Amazon Seller Central ${marketplace} account.`
          );
        }

        // Save the page cookies to a file
        await this.writeCookieFile(page);
      } else {
        const escapedLog = encodeURI(
          `Cannot manage inventories in the Amazon ${marketplace} marketplace. Please login in order to manage the inventory in that marketplace.`
        );
        global.log.error(escapedLog);
      }
      // Close the browser
      await this.inventoryManagerBrowser.close();
    } catch (error) {
      this.inventoryManagerBrowser.close();
      global.appLog.error(`${error} inside amazon.loginAndChangeQuantities at line 965`);
    }
  };

  syncListings = async () => {
    // Track on a global level that the Amazon Listing Syncer is actually running
    global.amazonSyncListingsIsRunning = true;
    // Send an Amazon sync status update to the renderer process -> this will make the button spin and disable it until the sync is over
    await this.mainWindow.webContents.send('amazon-product-sync-status', true);
    
    // Query the DB for amazon accounts
    const amazonAccounts = await global
    .knex
    .select()
    .from('tbl_users')
    .then(rows => {
      const amazonAccounts = {
        US: false,
        CA: false,
        UK: false,
        DE: false,
        FR: false,
        IT: false,
        ES: false
      }
      rows.forEach((row) => {
        if (row.account === 'amazon_us') {
          amazonAccounts.US = true;
        } else if (row.account === 'amazon_ca') {
          amazonAccounts.CA = true;
        } else if (row.account === 'amazon_uk') {
          amazonAccounts.UK = true;
        } else if (row.account === 'amazon_de') {
          amazonAccounts.DE = true;
        } else if (row.account === 'amazon_fr') {
          amazonAccounts.FR = true;
        } else if (row.account === 'amazon_it') {
          amazonAccounts.IT = true;
        } else if (row.account === 'amazon_es') {
          amazonAccounts.ES = true;
        } else {
          // nothing
        }
      });
      return amazonAccounts;
    })
    .catch((error) => global.appLog.error(`${error} - inside amazon.syncListings - line 1645`));

    // Check for corresponding cookie files
    const marketplacesCookies = await this.canLogIn();

    // If there are any -> go to the marketplace -> login and get all listings from each page
    if (amazonAccounts.US && marketplacesCookies.US) {
      await this.loginAndScrapeListings('US');
    }

    if (amazonAccounts.CA && marketplacesCookies.CA) {
      await this.loginAndScrapeListings('CA');
    }

    if (amazonAccounts.UK && marketplacesCookies.UK) {
      await this.loginAndScrapeListings('UK');
    }

    if (amazonAccounts.DE && marketplacesCookies.DE) {
      await this.loginAndScrapeListings('DE');
    }

    if (amazonAccounts.FR && marketplacesCookies.FR) {
      await this.loginAndScrapeListings('FR');
    }

    if (amazonAccounts.IT && marketplacesCookies.IT) {
      await this.loginAndScrapeListings('IT');
    }

    if (amazonAccounts.ES && marketplacesCookies.ES) {
      await this.loginAndScrapeListings('ES');
    }
    
    // Send a confirmation event to the renderer process that the syncing has concluded -> this will terminate the icon from spinning and enable the button again
    await this.mainWindow.webContents.send('amazon-product-sync-status', false);
  }

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
        // Get the Amazon cookies from the file
        global.amazonCookies.US = await this.canLogIn(true, 'US');
        if (!global.amazonCookies.US) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.US);
          await page.goto('https://sellercentral.amazon.com', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'CA') {
        global.amazonCookies.CA = await this.canLogIn(true, 'CA');
        if (!global.amazonCookies.CA) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.CA);
          await page.goto('https://sellercentral.amazon.ca', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'UK') {
        global.amazonCookies.UK = await this.canLogIn(true, 'UK');
        if (!global.amazonCookies.UK) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.UK);
          await page.goto('https://sellercentral.amazon.co.uk', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'DE') {
        global.amazonCookies.DE = await this.canLogIn(true, 'DE');
        if (!global.amazonCookies.DE) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.DE);
          await page.goto('https://sellercentral.amazon.de', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'FR') {
        global.amazonCookies.FR = await this.canLogIn(true, 'FR');
        if (!global.amazonCookies.FR) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.FR);
          await page.goto('https://sellercentral.amazon.fr', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'IT') {
        global.amazonCookies.IT = await this.canLogIn(true, 'IT');
        if (!global.amazonCookies.IT) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.IT);
          await page.goto('https://sellercentral.amazon.it', {
            waitUntil: 'networkidle0'
          });
        }
      } else if (marketplace === 'ES') {
        global.amazonCookies.ES = await this.canLogIn(true, 'ES');
        if (!global.amazonCookies.ES) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.amazonCookies.ES);
          await page.goto('https://sellercentral.amazon.es', {
            waitUntil: 'networkidle0'
          });
        }
      }

      if (canScrapeThisMarketplace) {
        // Check if there is no sign out button ? we need to login : close browser
        const loggedIn = await checkIfLoggedIn(page);

        if (!loggedIn) {
          await loginWithPasswordOnly(page, marketplace);
        }

        await clickMarketplaceSelector(page, marketplace);

        // Check if credit card info is not showing for the account. If it does then full-acount access is needed
        const creditCardInfo = await page.$('#go-to-credit-card-info');

        if (creditCardInfo === null) {
          // Go to inventory page
          await page.click('#sc-navtab-inventory');

          // Wait for the reload to completely finish
          await page.waitForNavigation({ waitUntil: 'networkidle0' });

          // Scroll to bottom of page as the page uses AJAX so that the listings per page button can appear
          await Util.autoScroll(page);

          const noListingsInMarketplaceMessage = await page.$('#zeroRecordsMessage');

          if (noListingsInMarketplaceMessage === null) {
              // Establish whether the '250 products per page' selection is already made
              await switchTo250ResultsPerPage(page);

              // Find the total number of productpages in the current marketplace by grabbing the inner html of the number button before 'Next'
              const totalNumberOfProductPages = await getTotalNumberOfProductPages(page);
              /*
              * If there is more than 1 product page in the current Amazon marketplace
              * iterate through all of them and look for matching products to reprice
              */

              if (totalNumberOfProductPages > 1) {
                for (let i = 0; i < totalNumberOfProductPages; i++) {
                  await scrapeProductsOnSinglePage(page);
                }
              } else {
                await scrapeProductsOnSinglePage(page);
              }
          } else {
            global.log.warn(`You have no products listed in your Amazon ${marketplace} account. You need to add at least one in order for it to be synced by Dalio.`);
          }
          
          if (productsScraped.length !== 0) {

            const productsInDatabase = await global
            .knex('tbl_listings')
            .where({ store: 'amazon' })
            .then(rows => rows)
            .catch(error => global.appLog.error(`${error} - in amazon.loginAndScrapeListings - line 1619`)); 

            // After the repricing is done on the website, update the DB entries accordingly
            await productsScraped.forEach(product => {

              // Check if each of the products is not already in the DB
              let productIsInDatabase = false;
              if (productsInDatabase.length > 0) {
                productsInDatabase.forEach(dbProduct => {
                  if (dbProduct.store_id === product.asin) {
                    productIsInDatabase = true;
                  }
                });
              }
              if (productIsInDatabase) {
                global
                .knex('tbl_listings')
                .where({ store_id: product.asin })
                .update({
                  item_name: product.item_name,
                  store_url: product.store_url,
                  has_variations: product.has_variations,
                  is_variant: product.is_variant,
                  image: product.image,
                  price: product.price,
                  product_availability: product.product_availability,
                })
                .catch(error => global.appLog.error(`${error} - inside amazon.loginAndScrapeListings - line 1644`));
              } else {
                global
                .knex('tbl_listings')
                .insert({
                  item_name: product.item_name,
                  has_variations: product.has_variations,
                  is_variant: product.is_variant,
                  store: 'amazon',
                  store_url: product.store_url,
                  store_id: product.asin,
                  image: product.image,
                  price: product.price,
                  product_availability: product.product_availability,
                  last_repriced: 'Never'
                })
                .catch(error => global.appLog.error(`${error} - inside amazon.loginAndScrapeListings - line 1589`));
              }
            });
          }
        } else {
          await global.log.error(
            `Amazon product sync could not be finished. Please check the payment method chosen for your Amazon Seller Central ${marketplace} account.`
          );
        }

        // Save the page cookies to a file
        await this.writeCookieFile(page);
      } else {
        const escapedLog = encodeURI(
          `Cannot sync listings from the ${marketplace} marketplace. Please login in order to sync your listings.`
        );
        global.log.error(escapedLog);
      }

      // Close the browser
      await this.listingsScraperBrowser.close();

      if (productsScraped.length > 0) {

        global.log.info(`Dalio synced ${productsScraped.length} products from your Amazon ${marketplace} account.`);
        productsScraped = [];
      } 
    } catch (error) {
      global.appLog.error(`${error} in amazon.loginAndScrapeListings - line 1621`);
      this.listingsScraperBrowser.close();
    }
  };

  /*
   * This is the function that is responsible for all Amazon Repricer settings actions
   * if more actions are added later -> add them here
   */
  settingsAction = async info => {
    // Determine what kind of action we need to handle
    switch (info.action) {
      case 'change-settings':
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
              // Change the settings amazon_refactor_percentage value to a new value provided by the rendered process

              settings.amazon = {...settings.amazon, ...info.value};
            
              // Update the DB entry with the new setting
              global
                .knex('tbl_users')
                .where({ account: 'dalio' })
                .update({
                  settings: JSON.stringify(settings)
                }).catch(error => global.appLog.error(`${error} - inside amazon.settingsAction - line 999`));

              this.mainWindow.webContents.send('amazon-settings', settings.amazon);
            }
          }
          return null;
        }).catch(error => global.appLog.error(`${error} - inside amazon.settingsAction - line 1007`));

        break;
      // This action queries all of the Amazon settings and returns them
      case 'query-amazon-settings':
        global
          .knex('tbl_users')
          .where({ account: 'dalio' })
          .first()
          .then(row => {
            if (row !== undefined) {
              if (row.settings !== null) {
                const settings = JSON.parse(row.settings);
                // Check if there is an 'amazon' object key in the settings object
                if (settings.amazon !== undefined) {
                  this.mainWindow.webContents.send('amazon-settings', settings.amazon);
                } else {

                  if (settings.amazon === undefined) {
                    settings.amazon = {};
                  }

                  settings.amazon.refactor_percentage = 15;
                  settings.amazon.add_state_tax = 0;
                  settings.amazon.state_tax_percentage = 6;
                  settings.amazon.add_amazon_fee = 0;
                  settings.amazon.amazon_fee_percentage= 15;
                  settings.amazon.refactor_fixed_sum = 0;
                  
                  global
                  .knex('tbl_users')
                  .where({ account: 'dalio' })
                  .update({
                    settings: JSON.stringify(settings)
                  })
                  .then(() => {
                    this.mainWindow.webContents.send('amazon-settings', settings.amazon);
                    return null;
                  })
                  .catch(error => global.appLog.error(`${error} - inside amazon.settingsAction - line 1589`));
                }
              }
            }
            return null;
          })
          .catch(error => global.appLog.error(`${error} - inside case 'query-amazon-settings' -  amazon.settingsAction - line 1024`));
        break;
      default:
      // do nothing
    }
  };
}

const checkIfLoggedIn = async (page) => {
  const loggedIn = await page.evaluate(() => {
    let isLoggedIn = false;
    if (document.querySelector('.sc-logout-quicklink') === null) {
      const signInButton = document.querySelector('#sign-in-button button');
      signInButton.click();
    } else {
      isLoggedIn = true;
    }
    return Promise.resolve(isLoggedIn);
  });

  return loggedIn;
};

const clickMarketplaceSelector = async (page, marketplace) => {
  if (marketplace === 'US') {
    // Get the first value of the Amazon Seller Central marketplace picker -> it is the .com
    const value = await getCurrentMarketplaceDropdownValuen(page, 'amazon.com');

    // Use it with page.select to select the item and trigger the change event
    await page.select('#sc-mkt-picker-switcher-select', value);
    await page.waitFor(3000);
  } else if (marketplace === 'CA') {
    // Get the value of the second element
    const value = await getCurrentMarketplaceDropdownValuen(page, 'amazon.ca');

    // Use it with page.select to select the item and trigger the change event
    await page.select('#sc-mkt-picker-switcher-select', value);
    await page.waitFor(3000);
  } else if (marketplace === 'MX') {

    const value = await getCurrentMarketplaceDropdownValuen(page, 'amazon.com.mx');
    // Use it with page.select to select the item and trigger the change event
    await page.select('#sc-mkt-picker-switcher-select', value);
    await page.waitFor(3000);
  } else if (marketplace === 'UK') {
    // Get the value of the second element
    const value = await getCurrentMarketplaceDropdownValuen(page, 'amazon.co.uk');

    // Use it with page.select to select the item and trigger the change event
    await page.select('#sc-mkt-picker-switcher-select', value);
    await page.waitFor(3000);
  } else if (marketplace === 'DE') {
    // Get the value of the second element
    const value = await getCurrentMarketplaceDropdownValuen(page, 'amazon.de');

    // Use it with page.select to select the item and trigger the change event
    await page.select('#sc-mkt-picker-switcher-select', value);
    await page.waitFor(3000);
  } else if (marketplace === 'FR') {
    // Get the value of the second element
    const value = await getCurrentMarketplaceDropdownValuen(page, 'amazon.fr');

    // Use it with page.select to select the item and trigger the change event
    await page.select('#sc-mkt-picker-switcher-select', value);
    await page.waitFor(3000);
  } else if (marketplace === 'IT') {
    // Get the value of the second element
    const value = await getCurrentMarketplaceDropdownValuen(page, 'amazon.it');

    // Use it with page.select to select the item and trigger the change event
    await page.select('#sc-mkt-picker-switcher-select', value);
    await page.waitFor(3000);
  } else if (marketplace === 'ES') {
    // Get the value of the second element
    const value = await getCurrentMarketplaceDropdownValuen(page, 'amazon.es');

    // Use it with page.select to select the item and trigger the change event
    await page.select('#sc-mkt-picker-switcher-select', value);
    await page.waitFor(3000);
  } else {
    // do nothing
  }
}

const getCurrentMarketplaceDropdownValuen = async (page, domain) => {
  const value = await page.evaluate((domain) => {
    const marketplaceSelectors = document.querySelectorAll('.sc-mkt-picker-switcher-select-option');

    let marketplaceValue;
    // Iterate through all of the marketplace selectors
    marketplaceSelectors.forEach(marketplace => {
      if (marketplace.text !== undefined) {
        if (marketplace.text.includes(domain)) {
          // Make sure that if domain is amazon.com -> the selector doesn`t choose amazon.com.mx
          // if the domain is amazon.com
          if (domain === 'amazon.com') {
            // Make sure that the current iterated select option is not the Mexico one - amazon.com.mx
            if (!marketplace.text.includes('amazon.com.mx')) {
              // If it is not that means it is the US one - amazon.com --> select it
              marketplaceValue = marketplace.value;
            }
          } else {
            // If it is not amazon.com at all -> just choose it
            marketplaceValue = marketplace.value;
          }
        }
      }
    });

    return marketplaceValue;
  }, domain);

  return value;
}

const repriceProductsOnSinglePage = async (page, marketplaceListingsArray, marketplace) => {
  // Scroll to bottom so everything can be loaded through AJAX
  await Util.autoScroll(page);

  await openParentProducts(page);
  // Scrape the table data, so we can compare what listings are displayed on the current page
  const listedProductsToReprice = await page.evaluate(marketplaceListingsArray => {
      // Create an array of all trs on the page
      const trs = Array.from(document.querySelectorAll('table tr'));

      // Filter out the tr`s that do not have a data-row-data attribute
      let listedProductsToRepriceArray = trs.filter(tr => {
          return tr.getAttribute('data-row-data') !== null;
        })
        .map(tr => {
          const singleProductToRepriceObject = {};
          const trData = JSON.parse(tr.getAttribute('data-row-data'));

          /* Iterate through each of the listings that need a reprice ->
           * match them with the same listed product on Amazon by their SKU
           * populate an object with id, sku, price, new_price and then add it to the array
           * */
          marketplaceListingsArray.forEach(listing => {
            if (listing.store_id === trData.asin) {
              singleProductToRepriceObject.id = tr.getAttribute('id');
              singleProductToRepriceObject.item_name = listing.item_name;
              singleProductToRepriceObject.asin = trData.asin;
              singleProductToRepriceObject.price = listing.price;
              singleProductToRepriceObject.new_price = listing.refactored_price;
              singleProductToRepriceObject.decimal_separator = trData.decimalSeperator;
            }
          });

          // Check if the object is empty -> there is no matching product on the page
          if (
            Object.entries(singleProductToRepriceObject).length === 0 &&
            singleProductToRepriceObject.constructor === Object
          ) {
            return null;
          }

          return singleProductToRepriceObject;
        });
      // Filter out all null values where there is no product matching
      listedProductsToRepriceArray = listedProductsToRepriceArray.filter(product => product !== null);

      return listedProductsToRepriceArray;
    }, marketplaceListingsArray)
    .catch(error => global.appLog.error(`${error} - inside amazon.repriceProductsOnSinglePage - line 1082`));

  /* Iterate through the array with listed products that need repricing
   * simulate user click on each input field
   * type the new product price
   * repeat for all array elements
   */
  if (listedProductsToReprice.length > 0) {
    for (const product of listedProductsToReprice) {
      if (product.id !== undefined) {
        const searchID = `#${product.id}-price-price div span input`;
        const productFound = await page.$(searchID);
        if (productFound !== null) {
          // Check if the products new/refactored price is not null -> then reprice
          if (product.new_price !== null) {
            let productPrice = product.new_price.toString();

            // Check if the product decimal separator is a comma
            if (product.decimal_separator === ',') {
              // If it is -> check if the product price contains a dot
              if(productPrice.includes('.')) {
                // If it does -> replace it with a comma
                productPrice = productPrice.replace(/[,.]/g, m => m === ',' ? '.' : ',');
              }
            } else if (product.decimal_separator === '.') {
              // If the product decimal point is a dot -> check if the product price contains a comma
              if (productPrice.includes(',')) {
                // If it does -> replace it with a dot
                productPrice = productPrice.replace(/[,.]/g, m => m === ',' ? '.' : ',');
              }
            }

            await page.click(searchID, { clickCount: 3 });
            await page.type(searchID, productPrice, { delay: 100 });
            await productsActuallyRepriced.push(product);
          }
        } else {
          const escapedProductName = await encodeURI(product.item_name);
          await global.log.warn(
            `${escapedProductName} with SKU: ${product.asin} could not be found in your Amazon inventory. Please make sure that the SKU of the listing is identical to the one listed on Amazon.`
          );
        }
      }
    }

    // Save all changes
    await page.click('th#saveall span span span a');
    await page.waitFor(3000);
    await Util.autoScroll(page);
  }
  // Check if there is 'Next' button for the products
  await handleNextPageButton(page);
};

const manageInventoryOnSinglePage = async (page, marketplaceListingsArray) => {
  // Scroll to bottom so everything can be loaded through AJAX
  await Util.autoScroll(page);

  // Shows all variations of a 'parent' product
  await openParentProducts(page);

  // Scrape the table data
  const listedProductsToManageInventory = await page.evaluate(marketplaceListingsArray => {
      // Create an array of all trs on the page
      const trs = Array.from(document.querySelectorAll('table tr'));

      // Filter out the tr`s that do not have a data-row-data attribute
      let listedProductsArray = trs
        .filter(tr => tr.getAttribute('data-row-data') !== null)
        .map(tr => {
          const singleProductObject = {};
          const trData = JSON.parse(tr.getAttribute('data-row-data'));

          /* Iterate through each of the listings that need a reprice ->
           * match them with the same listed product on Amazon by their SKU
           * populate an object with id, sku, price, new_price and then add it to the array
           * */
          marketplaceListingsArray.forEach(listing => {
            if (listing.store_id === trData.asin) {
              singleProductObject.id = tr.getAttribute('id');
              singleProductObject.item_name = listing.item_name;
              singleProductObject.asin = trData.asin;
              singleProductObject.price = listing.price;
              singleProductObject.new_price = listing.refactored_price;
              singleProductObject.product_availability = listing.product_availability;
              singleProductObject.product_availability_on_store = trData.quantity;
            }
          });

          // Check if the object is empty -> there is no matching product on the page
          if (
            Object.entries(singleProductObject).length === 0 &&
            singleProductObject.constructor === Object
          ) {
            return null;
          }

          return singleProductObject;
        });
      // Filter out all null values where there is no product matching
      listedProductsArray = listedProductsArray.filter(product => product !== null);
      return listedProductsArray;
    }, marketplaceListingsArray)
    .catch(error => global.appLog.error(`${error} - inside amazon.manageInventoryOnSinglePage - line 1191`));

  /* Iterate through the array with listed products
   * simulate user click on each input field
   * type the new product quantity
   * repeat for all array elements
   */
  if (listedProductsToManageInventory.length > 0) {
    for (const product of listedProductsToManageInventory) {
      if (product.id !== undefined) {
        if (product.product_availability !== null) {
          let quantityToEnter = '20';
          // If a product availability is just 'IN_STOCK' enter a number of 20 (should be chosen by user)
          if (product.product_availability === 'IN_STOCK') {
            quantityToEnter = '20';
          } else if (product.product_availability === 'OUT_OF_STOCK') {
            quantityToEnter = '0';
          } else {
            // If there is a specified quantity -> enter it
            quantityToEnter = product.product_availability;
          }
          // Make sure that the same quantity is not entered twice if it already is set for the product
          if (quantityToEnter !== product.product_availability_on_store) {
            const searchID = `#${product.id}-quantity-quantity div span input`;
            const productFound = await page.$(searchID);
            if (productFound !== null) {
              await page.click(searchID, { clickCount: 3 });
              await page.type(searchID, quantityToEnter, { delay: 100 });
            } else {
              const escapedLog = await encodeURI(
                `${product.item_name} with SKU: ${product.asin} could not be found in your Amazon inventory. Please make sure that the SKU of the listing is identical to the one listed on Amazon.`
              );
              await global.log.warn(escapedLog);
            }
          }
        }
      }
    }

    // Save all changes (think of a better way)
    await page.click('th#saveall span span span a');
    await page.waitFor(3000);
    await Util.autoScroll(page);
  }
 // Check if there is 'Next' button for the products
 await handleNextPageButton(page);
};

const scrapeProductsOnSinglePage = async (page) => {
  // Scroll to bottom so everything can be loaded through AJAX
  await Util.autoScroll(page);

  await openParentProducts(page);
  // Scrape the table data
  const listedProducts = await page.evaluate(() => {
      // Create an array of all trs on the page
      const trs = Array.from(document.querySelectorAll('table tr'));

      // Filter out the tr`s that do not have a data-row-data attribute
      let listedProductsArray = trs.filter(tr => {
          return tr.getAttribute('data-row-data') !== null;
        })
        .map((tr, index) => {
          // console.log('index', index);
          const singleProductObject = {};
          const trData = JSON.parse(tr.getAttribute('data-row-data'));

          // Make sure that the product has no variations as that will be handled elsewhere
          if (trData.parent === '0') {
            singleProductObject.id = tr.getAttribute('id');
            singleProductObject.item_name = trData.title;
            singleProductObject.has_variations = '0';
            if (singleProductObject.id.includes('_expanded_')) {
              singleProductObject.is_variant = '1';
            } else {
              singleProductObject.is_variant = '0';
            }
            singleProductObject.asin = trData.asin;
            singleProductObject.price = trData.price;
            singleProductObject.product_availability = trData.quantity;
            singleProductObject.image = document.querySelector(`td#${singleProductObject.id}-image div a div img`).getAttribute('src');

            const store_url = document.querySelector(`td#${singleProductObject.id}-title div div div a`).getAttribute('href');
            singleProductObject.store_url = store_url.substring(0, store_url.indexOf('?'));


            return singleProductObject;
          }
          
          return null;
        });
      // Filter out all null values where there is no product matching
      listedProductsArray = listedProductsArray.filter(product => product !== null);

      return listedProductsArray;
    })
    .catch(error => global.appLog.error(`${error} - inside amazon.scrapeProductsOnSinglePage - line 2057`));

    productsScraped.push(...listedProducts);

  // Check if there is 'Next' button for the products
  await handleNextPageButton(page);
};

const loginWithPasswordOnly = async (page, marketplace, type = 'repricer') => {
  
  // Check if the user has been logged out and only requires the password to be entered
  const requiresOnlyPassword = await page.evaluate(() => {
      let pass = false;

      // If Amazon wants password only -> return true
      if (document.querySelector('#ap-credential-autofill-hint') !== null) {
        pass = true;
      }
      return Promise.resolve(pass);
    })
    .catch(error => global.appLog.error(`${error} - inside amazon.loginWithPasswordOnly - line 1271`));

  // Check if 'Amazon' requires password-only verification
  if (requiresOnlyPassword) {
    let passwordToInput;

    let marketplace_account;

    if (marketplace === 'US') {
      if (type === 'repricer') {
        marketplace_account = 'amazon_us';
      } else if (type === 'autoorder') {
        marketplace_account = 'autoorder_amazon_us';
      }
    } else if (marketplace === 'CA') {
      if (type === 'repricer') {
        marketplace_account = 'amazon_ca';
      } else if (type === 'autoorder') {
        marketplace_account = 'autoorder_amazon_ca';
      }
    } else if (marketplace === 'UK') {
      if (type === 'repricer') {
        marketplace_account = 'amazon_uk';
      } else if (type === 'autoorder') {
        marketplace_account = 'autoorder_amazon_uk';
      }
    } else if (marketplace === 'DE') {
      if (type === 'repricer') {
        marketplace_account = 'amazon_de';
      } else if (type === 'autoorder') {
        marketplace_account = 'autoorder_amazon_de';
      }
    } else if (marketplace === 'FR') {
      if (type === 'repricer') {
        marketplace_account = 'amazon_fr';
      } else if (type === 'autoorder') {
        marketplace_account = 'autoorder_amazon_fr';
      }
    } else if (marketplace === 'IT') {
      if (type === 'repricer') {
        marketplace_account = 'amazon_it';
      } else if (type === 'autoorder') {
        marketplace_account = 'autoorder_amazon_it';
      }
    } else if (marketplace === 'ES') {
      if (type === 'repricer') {
        marketplace_account = 'amazon_es';
      } else if (type === 'autoorder') {
        marketplace_account = 'autoorder_amazon_es';
      }
    }
    // Run a DB query that gets the required 'Amazon' password and assign it to the 'passwordToInput' variable
    await global
      .knex('tbl_users')
      .where({ account: marketplace_account })
      .first()
      .then(row => {
        if (row !== null) {
          passwordToInput = row.password;
        }
        return null;
      })
      .catch(error => global.appLog.error(`${error} - inside amazon.loginWithPasswordOnly - line 1285`));

    // Type the password in the input field with a delay as if it was a human
    await page.type('#ap_password', passwordToInput.toString(), { delay: 100 });

    // Check if the 'Remember me' checkbox is checked -> if not then check it
    await page.evaluate(() => {
        if (document.querySelector('input[name=rememberMe]') !== null) {
          const rememberMeCheckbox = document.querySelector('input[name=rememberMe]');
          if (!rememberMeCheckbox.hasAttribute('checked')) {
            rememberMeCheckbox.click();
          }
        }
      })
      .catch(error => global.appLog.error(`${error} - inside amazon.loginWithPasswordOnly - line 1304`));

    // Click the 'Sign in' button
    await page.click('#signInSubmit');

    // Wait for the load to completely finish
    await page.waitFor(3000);

    if (type === 'repricer') {
      await page.waitForSelector('#sc-navtab-inventory');
    } 

    
    // Sometimes Amazon shows an account fix-up form which prompts to enter a phone number
    const promptsToEnterPhoneNumber = await page.$('#auth-account-fixup-phone-form');

    // If Amazon prompts to enter a phone number
    if (promptsToEnterPhoneNumber !== null) {
      await page.click('#ap-account-fixup-phone-skip-link');
    }

    if (type === 'repricer') {
      // Here we know that the user has logged in
      await page.waitForSelector('.sc-logout-quicklink');
    } else if (type === 'autoorder') {
      await page.waitForSelector('#nav-link-accountList', { timeout: 120000 });
      await page.hover('#nav-link-accountList');
      await page.waitForSelector('#nav-item-signout');
    }
  }
};

const openParentProducts = async page => {
  // Scrape the table data, so we can open all parent listings in order to manipulate the variations
  const parentProductsToOpen = await page.evaluate(() => {
      // Create an array of all trs on the page
      const trs = Array.from(document.querySelectorAll('table tr'));

      // Filter out the tr`s that do not have a data-row-data attribute
      let listedParentsToOpenArray = trs
        .filter(tr => tr.getAttribute('data-row-data') !== null)
        .filter(tr => tr.classList.contains('mt-variations-row-parent'))
        .map(tr => {
          const singleParentToOpen = {
            id: tr.getAttribute('id')
          };

          return singleParentToOpen;
        });
      // Filter out all null values where there is no product matching
      listedParentsToOpenArray = listedParentsToOpenArray.filter(
        product => product !== null
      );
      return listedParentsToOpenArray;
    })
    .catch(error => global.appLog.error(`${error} - inside amazon.repriceProductsOnSinglePage - line 1366`));

  // Open all parent products, so that variations can be repriced
  if (parentProductsToOpen.length > 0) {
    for (const product of parentProductsToOpen) {
      if (product.id !== undefined) {
        // await console.log('Clicking on parent', product.id);
        await page.click(`tr#${product.id} td#${product.id}-parent a`);
        await page.waitFor(2000);
      }
    }
  }
};

const switchTo250ResultsPerPage = async page => {
  // Establish whether the '250 products per page' selection is already made
  const is250ProductsPerPage = await page.evaluate(() => {
    let is250 = false;
    const productsPerPage = document.querySelector('div.mt-records-per-page input.mt-current-records-per-page');

    if (productsPerPage.value.includes('250')) {
      is250 = true;
    }
    
    return is250;
    })
    .catch(error => global.appLog.error(`${error} - inside amazon.switchTo250ResultsPerPage eval func - line 1993`));

  if (!is250ProductsPerPage) {
    // Click 250 products per page
    await page.select('div.mt-records-per-page span.a-declarative span.a-dropdown-container select', '250');

    // Wait for the reload to completely finish
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Scroll to bottom of page as the page uses AJAX so that all products can appear
    await Util.autoScroll(page);
  }
};

const getTotalNumberOfProductPages = async page => {
  const totalNumberOfProductPages = await page.evaluate(() => {
    const totalNumberOfProductPages = document.querySelector('#myitable-pagination ul li:nth-last-child(2) a');
    if (totalNumberOfProductPages === null) {
      return 1;
    }
    return parseInt(totalNumberOfProductPages.innerHTML);
  })
  .catch(error => global.appLog.error(`${error} - inside amazon.getTotalNumberOfProductPages eval func - line 1995`));

  return totalNumberOfProductPages;
};

const handleNextPageButton = async page => {
  // Check if there is 'Next' button for the products
  const hasNextPageButton = await page.evaluate(() => {
    let hasNextPageButton = false;
    if (document.querySelector('#myitable-pagination ul li:nth-last-child(1) a') !== null
    ) {
      hasNextPageButton = true;
    }
    return hasNextPageButton;
  })
  .catch(error => global.appLog.error(`${error} - inside amazon.handleNextPageButton - line 2166`));

  // If there is -> click it
  if (hasNextPageButton) {
  await page.click('#myitable-pagination ul li:nth-last-child(1) a');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.waitFor(3000);
  }
};

export default Amazon;
