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
/* eslint no-underscore-dangle: 0 */
/* eslint no-restricted-globals: 0 */
/* eslint no-loop-func: 0 */

// @flow
import fs from 'fs';
import path from 'path';
import { ipcMain } from 'electron';  
import moment from 'moment';
import Util from '../../core/util/Util';

// TYPES
import type { Account, CrediCardObjectType } from '../../../types/AccountsTypes';
import type { Order } from '../../../types/OrdersTypes';

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality -> makes puppeteer not as easily detectable
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
const Client = require('@infosimples/node_two_captcha');

puppeteer.use(pluginStealth());

type AmazonAutoorderAccountsType = {
  US: Array<Account>,
  UK: Array<Account>
};

type LoginAccountStateType = {
  supplier: 'amazon',
  supplier_country: 'US' | 'UK'
};

type ErrorType = {
  status: string,
  message: string
};

class AmazonAutoorder {
  mainWindow: Object = {};

  client: Object = {};

  // Browsers
  orderBrowser: boolean | Object = false;

  amazonAutoorderLoginBrowser: boolean | Object = false;

  checkOrdersBrowser: boolean | Object = false;

  checkPaymentMethodsBrowser: boolean | Object = false;

  sendOrdersToFrontEnd;

  sendOrdersToServer;

  constructor(autoorderHelper) {
    this.mainWindow = autoorderHelper.mainWindow;
    this.sendOrdersToFrontEnd = autoorderHelper.sendOrdersToFrontEnd;
    this.sendOrdersToServer = autoorderHelper.sendOrdersToServer;
    this.fulfilOrders = autoorderHelper.fulfilOrders;

    this.client = new Client('a9c97548d53ee90dc7a64c6728800a94', {
      timeout: 60000,
      polling: 5000,
      throwErrors: false
    });

    ipcMain.on('check-amazon-autoorder-login', async (): Promise<any> => {
      const amazonAutoorderAccounts: AmazonAutoorderAccountsType = await this.canLogIn(false);

      this.mainWindow.webContents.send('check-amazon-autoorder-login', amazonAutoorderAccounts);
    });

    ipcMain.on('login-autoorder', async (event: SyntheticEvent<>, loginAccountState: LoginAccountStateType): Promise<any> => {      
      if (loginAccountState.supplier === 'amazon') {
        const loggedInAmazonAutoorder: boolean = await this.logIn(loginAccountState.supplier_country);

        if (loggedInAmazonAutoorder) {
          const amazonAutoorderAccounts: AmazonAutoorderAccountsType = await this.canLogIn(false);
          this.mainWindow.webContents.send('check-amazon-autoorder-login', amazonAutoorderAccounts);
          await this.checkPaymentMethods();
        }
      }

    });

    ipcMain.on('logout-amazon-autoorder', async (event: SyntheticEvent<>, acc: Account): Promise<any> => {
      // Delete the cookie file for the corresponding marketplace
      await this.deleteCookieFile(acc);
 
      await global.knex('tbl_users')
      .where({ id: acc.id })
      .del()
      .catch(error => global.appLog.error(`${error} - inside AmazonAutoorder - logout-amazon-autoorder - line 866`));

      const amazonAutoorderAccounts: AmazonAutoorderAccountsType = await this.canLogIn(false);
      this.mainWindow.webContents.send('check-amazon-autoorder-login', amazonAutoorderAccounts);
    });

    // Currently not used
    ipcMain.on('query-amazon-autoorder-payment-methods', async (event: SyntheticEvent<>, marketplaces): Promise<any> => {
      let marketplace = '';
      if (marketplaces.US) {
        marketplace = 'autoorder_amazon_us';
      } else if (marketplaces.UK) {
        marketplace = 'autoorder_amazon_uk';
      }
      
      const paymentMethods = await global.knex('tbl_users')
        .where({ account: marketplace })
        .first()
        .then(row => {
          if (row !== undefined) {
            if (row.settings !== null && row.settings !== '') {
              return JSON.parse(row.settings);
            }
          }
          return false;
        });

      if (paymentMethods) {
        this.mainWindow.webContents.send('query-amazon-autoorder-payment-methods', paymentMethods);
      }
    });

    ipcMain.on('update-autoorder-account-payment-methods', async (): Promise<any> => {
      await this.mainWindow.webContents.send('amazon-autoorder-payment-methods-fetch-status', true);
      await this.checkPaymentMethods();

      // After the payment methods have been checked for all logged-in accounts -> query the accounts` info from the DB
      const amazonAutoorderAccounts: AmazonAutoorderAccountsType = await this.canLogIn(false);
      // Send it back to the renderer process which will update the info there
      await this.mainWindow.webContents.send('check-amazon-autoorder-login', amazonAutoorderAccounts);
      await this.mainWindow.webContents.send('amazon-autoorder-payment-methods-fetch-status', false);
    });

    ipcMain.on('save-amazon-credit-card-info', async (event: SyntheticEvent<>, cardsInfo: Array<CrediCardObjectType>, account: Account): Promise<any> => {
      // In order to save a card`s number, we need to figure out which account to save the card number to -> pull it from the DB based on account and email fields
      const accountInfoFromDB: Account | void = await global.knex('tbl_users')
      .where({ account: account.account, email: account.email })
      .first()
      .then(row => row);

      // If there is such an account
      if (accountInfoFromDB !== undefined) {
        // Parse the settings field as it is a JSON
        const accountSettingsParsed = await JSON.parse(accountInfoFromDB.settings);
        
        // If the card number sent from the front-end is not an empty string
        if (cardsInfo.length > 0) {
          // Update the value of the pulled DB entry
          accountSettingsParsed.payment_methods.credit_cards = [...cardsInfo];

          // Update the DB with the updated settings field
          await global.knex('tbl_users')
          .where({ account: account.account, email: account.email })
          .update({ settings: JSON.stringify(accountSettingsParsed) })
          .catch((error) => global.appLog.error(`${error} - in AmazonAutoorder - save-amazon-credit-card-info at line 167`));
        }
      }
    });

    // TESTS
    ipcMain.on('test-check-amazon-orders', async (): Promise<any> => {
      await this.checkOrders();
    });

    ipcMain.on('test-check-amazon-tracking-numbers', async (): Promise<any> => {
      this.checkTrackingData();
    });

    ipcMain.on('automate-product-ordering', async (): Promise<any> => {
      await this.automateProductOrdering();
    });
  }
  
  /*
   * Function that checks if an Amazon cookie file exists
   * if it does exist, it either returns the contents of the cookie file
   * or it checks whether there is a sessionID inside the cookie file, then returns true/false
   * avoids the need of logging in in the background
   */
  canLogIn = async (returnCookies: boolean = false): Promise<AmazonAutoorderAccountsType> => {
    // Will track all autoorder amazon accounts in this object
    const amazonAutoorderAccounts: AmazonAutoorderAccountsType = await this._getAutoorderAccountsFromDB();

    // If there are accounts for either US or UK marketplaces - the arrays will not be empty
    if (amazonAutoorderAccounts.US.length > 0 || amazonAutoorderAccounts.UK.length > 0) {
      const amazonAutoorderAccountsAfterCookieFileCheck = await this.checkIfCookieFileExists(amazonAutoorderAccounts).then(async (checkedAccountsWithCookiesResult: Array<Account>) => {
          const checkedAccountsWithCookies = JSON.parse(JSON.stringify(checkedAccountsWithCookiesResult)); 
          // checkIfCookieFileExists function will return the accounts object with a has_cookie_file property for each accout object
          const deletedUSAccountKeys = [];
          const deletedUKAccountKeys = [];

          // If there are any Amazon US accounts
          if (checkedAccountsWithCookies.US.length > 0) {
            // Iterate through all of them
            for (const [index, account] of (checkedAccountsWithCookies.US).entries()) {
              let keyDeleted = false;

              // If cookie files` content should be returned
              if (returnCookies) {
                // Read each individual account`s cookie file -> and update its properties
                const cookieFileRead: Object | string = await this.readCookieFile(true, account).catch(e => {
                  global.appLog.error(`${e} - AmazonAutoorder.canLogin - lien 205`);

                  // If there is an error thrown -> chances are there is no  cookie file due to unsuccessful login -> just delete the account from DB
                  global.knex('tbl_users')
                  .where({ account: account.account })
                  .del()
                  .catch(e => global.appLog.error(`${e} - AmazonAutoorder.canLogin - line 212`));

                  keyDeleted = true;
                });

                if (!keyDeleted) {
                  checkedAccountsWithCookies.US[index].cookies_content = cookieFileRead.file_content;
                  checkedAccountsWithCookies.US[index].has_valid_cookies = cookieFileRead.has_session_id;
                } else {
                  deletedUSAccountKeys.push(index);
                }
              } else {
                const cookieFileRead: Object | string = await this.readCookieFile(false, account).catch(e => {
                  global.appLog.error(`${e} - AmazonAutoorder.canLogin - lien 217`);

                  // If there is an error thrown -> chances are there is no  cookie file due to unsuccessful login -> just delete the account from DB
                  global.knex('tbl_users')
                  .where({ account: account.account })
                  .del()
                  .catch(e => global.appLog.error(`${e} - AmazonAutoorder.canLogin - line 224`));

                  keyDeleted = true;
                });              
                
                if (!keyDeleted) {
                  checkedAccountsWithCookies.US[index].cookies_content = cookieFileRead.file_content;
                  checkedAccountsWithCookies.US[index].has_valid_cookies = cookieFileRead.has_session_id;
                } else {
                  deletedUSAccountKeys.push(index);
                }
              }
            }
          }

          // If there are any Amazon UK accounts
          if (checkedAccountsWithCookies.UK.length > 0) {
            // Iterate through all of them
            for (const [index, account] of (checkedAccountsWithCookies.UK).entries()) {
              let keyDeleted = false;

              // If cookie files` content should be returned
              if (returnCookies) {
                // Read each individual account`s cookie file -> and update its properties
                const cookieFileRead = await this.readCookieFile(true, account).catch(e => {
                  global.appLog.error(`${e} - AmazonAutoorder.canLogin - lien 261`);

                  // If there is an error thrown -> chances are there is no  cookie file due to unsuccessful login -> just delete the account from DB
                  global.knex('tbl_users')
                  .where({ account: account.account })
                  .del()
                  .catch(e => global.appLog.error(`${e} - AmazonAutoorder.canLogin - line 267`));

                  keyDeleted = true;
                });

                if (!keyDeleted) {
                  checkedAccountsWithCookies.UK[index].cookies_content = cookieFileRead.file_content;
                  checkedAccountsWithCookies.UK[index].has_valid_cookies = cookieFileRead.has_session_id;
                } else {
                  deletedUKAccountKeys.push(index);
                }
                
              } else {
                const cookieFileRead = await this.readCookieFile(false, account).catch(e => {
                  global.appLog.error(`${e} - AmazonAutoorder.canLogin - lien 274`);

                  // If there is an error thrown -> chances are there is no  cookie file due to unsuccessful login -> just delete the account from DB
                  global.knex('tbl_users')
                  .where({ account: account.account })
                  .del()
                  .catch(e => global.appLog.error(`${e} - AmazonAutoorder.canLogin - line 281`));

                  keyDeleted = true;
                });

                if (!keyDeleted) {
                  checkedAccountsWithCookies.UK[index].cookies_content = cookieFileRead.file_content;
                  checkedAccountsWithCookies.UK[index].has_valid_cookies = cookieFileRead.has_session_id;
                } else {
                  deletedUKAccountKeys.push(index);
                }
              }
            }
          }

          if (deletedUSAccountKeys.length > 0) {
            for (let i = 0; i < deletedUSAccountKeys.length; i++) {
              checkedAccountsWithCookies.US.splice(deletedUSAccountKeys[i], 1);
            }
          }
          
          if (deletedUKAccountKeys.length > 0) {
            for (let i = 0; i < deletedUKAccountKeys.length; i++) {
              checkedAccountsWithCookies.UK.splice(deletedUKAccountKeys[i], 1);
            }
          }

          return checkedAccountsWithCookies;
        }
      );
      return amazonAutoorderAccountsAfterCookieFileCheck;
    }

    return amazonAutoorderAccounts;
  };

  logIn = async (country: Account.country) => {
    // Makes sure that the Amazon 'Login browser' is not open already
    if (!this.amazonAutoorderLoginBrowser) {
      try {
        // Track which source account we are logging in
        const sourceAccount = { id: '', account_marketplace: '', country: '', email: '', password: '', new: true};

        this.amazonAutoorderLoginBrowser = await puppeteer.launch({
          headless: false,
          executablePath: Util.getChromiumExecPath(puppeteer),
          slowMo: 100,
          devtools: false,
          defaultViewport: null,
          ignoreDefaultArgs: ['--enable-automation'],
          args: ['--disable-webgl'],
        });

        // When the 'Login browser' closes -> update the tracking variable so that the browser can be opened again
        this.amazonAutoorderLoginBrowser.on('disconnected', () => {
          this.amazonAutoorderLoginBrowser = false;
        });

        const page = await this.amazonAutoorderLoginBrowser.newPage();
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
            request.url() === 'https://www.amazon.co.uk/ap/signin' ||
            request.url() === 'https://www.amazon.com/ap/signin'
          ) {

            // Get the POST request body params
            const params = new URLSearchParams(request.postData());

            // Track which marketplace we are logging in, so the right DB amazon account can be added/updated
            if (request.url() === 'https://www.amazon.com/ap/signin') {
              sourceAccount.account_marketplace = 'autoorder_amazon_us';
            } else if (request.url() === 'https://www.amazon.co.uk/ap/signin') {
              sourceAccount.account_marketplace = 'autoorder_amazon_uk';
            } 

            /*
             * There are two /ap/signin requests - 1 for email and password and 1 for OTP code
             * check that it is not OTP code as we do not need it
             */
            if (params.get('otpCode') === null) {
              const paramsEmail = params.get('email');

              const blankSettings = {
                payment_methods: {
                  gift_card_balance: '',
                  credit_cards: []
                }
              }

              if (paramsEmail !== '') {
                // If there is no account for this particular Amazon marketplace add it, else -> update it
                global
                .knex('tbl_users')
                .where({ account: sourceAccount.account_marketplace })
                .then(rows => {
                  if (rows.length === 0) {
                    // There is no Amazon account for this marketplace -> add it and record the id  of the DB row to the sourceAccount object (it is used later to store the cookies for this account)
                    global
                    .knex('tbl_users')
                    .insert({
                      account: sourceAccount.account_marketplace,
                      email: params.get('email'),
                      country: country,
                      settings: JSON.stringify(blankSettings)
                    })
                    .then(id => { 
                      sourceAccount.id = id[0];
                    })
                    .catch(error => global.appLog.error(`${error} - inside amazon.logInAutoorder - line 453`));
                  } else {

                    // Else there already are Amazon accounts for the same marketplace
                    for (let i = 0; i < rows.length; i++) {
                      // Iterate through all of them and check 
                      if (rows[i].email == params.get('email')) {
                        // If one of them has the same email address -> then the account is not new for the DB
                        sourceAccount.id = rows[i].id;
                        sourceAccount.new = false;
                      }
                    }

                    // If, however, the account is new -> insert it to the DB
                    if (sourceAccount.new) {
                      global
                      .knex('tbl_users')
                      .insert({
                        account: sourceAccount.account_marketplace,
                        email: params.get('email'),
                        country: country,
                        settings: JSON.stringify(blankSettings)
                      })
                      .then(id => {
                        sourceAccount.id = id[0];
                      })
                      .catch(error => global.appLog.error(`${error} - inside amazon.logInAutoorder - line 604`));
                    } else {

                      // The account is not new -> update email/password for it
                      global
                      .knex('tbl_users')
                      .where({ id: sourceAccount.id })
                      .update({
                        email: params.get('email'),
                      })
                      .catch(error => global.appLog.error(`${error} - inside amazon.logInAutoorder - line 615`));
                    }

                  }
                  return null;
                })
                .catch(error => global.appLog.error(`${error} - inside amazon.logInAutoorder request interception - line 466`));
              }

              // Continue the request as the email and password have been saved to the DB
              request
              .continue()
              .catch(error => global.appLog.error(`${error} - inside amazon.logInAutoorder - line 470`));
            } else {
              // Continue as it is not the 'ap/signin' request we are looking for
              request
              .continue()
              .catch(error => global.appLog.error(`${error} - inside amazon.logInAutoorder - line 475`));
            }
          } else {
            // Continue as it is not an 'ap/signin' request at all
            request
            .continue()
            .catch(error => global.appLog.error(`${error} - inside amazon.logInAutoorder - line 481`));
          }
        });
        
        // Check which Amazon Seller Central domain we are logging in -> go to the correct one
        if (country === 'US') {
          await page.goto('https://amazon.com', { waitUntil: 'networkidle0' });
          // await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'CA') {
          await page.goto('https://amazon.ca', { waitUntil: 'networkidle0' });
          // await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'UK') {
          await page.goto('https://amazon.co.uk', { waitUntil: 'networkidle0' });
          // await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'DE') {
          await page.goto('https://amazon.de', { waitUntil: 'networkidle0' });
          // await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'FR') {
          await page.goto('https://amazon.fr', { waitUntil: 'networkidle0' });
          // await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'IT') {
          await page.goto('https://amazon.it', { waitUntil: 'networkidle0' });
          // await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        } else if (country === 'ES') {
          await page.goto('https://amazon.es', { waitUntil: 'networkidle0' });
          // await page.addStyleTag({ content: 'body{opacity:0!important;}'});
        }


        // This try-catch block enables the login process to continue as normal, if the user starts clicking on the page, before Dalio takes him/her to the login page automatically
        try {
          await page.waitForSelector('#nav-link-accountList', { timeout: 10000 });

          // Hover over the account list in the top nav to reveal sign-in/sign out options
          await page.hover('#nav-link-accountList');
  
          // Check if there is no sign out button ? we need to login
          const signInButtonSelector = await page.$('#nav-flyout-ya-signin a');
          if (signInButtonSelector !== null) {
            await signInButtonSelector.click({ waitUntil: 'networkidle0' });
          }
        } catch (e) {
          await global.appLog.error(`${e} - AmazonAutoorder.login - line 506`);
        }

        // Now we wait for the user to enter his email address, click next and for the password input field to appear
        await page.waitForSelector('#ap_password', { timeout: 120000 });

        await page.exposeFunction('capturePassword', async (pass) => {
          sourceAccount.password = pass;
        });

        // After the password field appears, we need to attach a function to the 'Sign in' button click event, which will grab the users password from the field and save it in the DB
        await page.exposeFunction('savePassword', async () => {

          if (sourceAccount.password !== '') {
            const account = await global.knex('tbl_users')
            .where({ account: sourceAccount.account_marketplace })
            .update({
              password: sourceAccount.password
            })
            .catch(e => global.appLog.error(`${e} - AmazonAutoorder - login at line 513`));
          } else {
            // Maybe throw an error here  
          }

        });

        const addPasswordChangeEventListener = () => {
          const signInButton = document.querySelector('#ap_password');

          if (signInButton !== null) {
            signInButton.addEventListener('change', e => { 
              e.stopPropagation();
              window.capturePassword(e.target.value);
            });
          } 
        }

        const addSubmitButtonClickEventListener = () => {
          const signInButton = document.querySelector('#signInSubmit');

          if (signInButton !== null) {
            signInButton.addEventListener('click', e => { 
              e.stopPropagation();
              // e.preventDefault();
              window.savePassword();
            });
          } 
        }

        await page.evaluate(addPasswordChangeEventListener);
        await page.evaluate(addSubmitButtonClickEventListener);

        await page.waitForSelector('#nav-link-accountList', { timeout: 120000 });
        await page.hover('#nav-link-accountList');

        const signOutButton = await page.$('#nav-item-signout');

        // If not logged in wait for the user to manually login and then the appearance of logout button
        if (signOutButton !== null) {
          // Save page cookies to a file
          await this.writeCookieFile(page, sourceAccount);

          // Close the login browser
          await this.amazonAutoorderLoginBrowser.close();
          // this.checkPaymentMethods({ [country]: true });

          // return true for successful login
          return true;
        }
        // If the user has valid cookies and is logged in -> close the browser
        await this.amazonAutoorderLoginBrowser.close();
        // this.checkPaymentMethods({ [country]: true });
        // return true for successful login
        return false;
      } catch (error) {
        global.appLog.error(`${error} - inside amazon.logInAutoorder catch-block - line 534`);
        this.amazonAutoorderLoginBrowser.close();
        return false;
      }
    }
  };

  logOut = async (account: Account): Promise<any> => {
    this.deleteCookieFile(account);

    global.knex('tbl_users')
    .where({ account: account.account })
    .del()
    .catch(error => global.appLog.error(`${error} - inside AmazonAutoorder - logOut - line 423`));
  }

  checkIfCookieFileExists = async (amazonAccounts: AmazonAutoorderAccountsType): AmazonAutoorderAccountsType => {
    // Copy the parameter accounts values to a new variable which will be manipulated
    const amazonAccountsExist = amazonAccounts;

    // If there are any Amazon US accounts
    if (amazonAccountsExist.US.length > 0) {
      // Iterate through all of them
      for (const [index, account] of (amazonAccounts.US).entries()) {
        // Check if the account has a cookie file 
        amazonAccountsExist.US[index].has_cookie_file = await new Promise((resolve, reject) => {
          const cookiePath = path.resolve(global.amazonAutoorderCookiePathDir, `${account.id}_US_autoorder_cookies.txt`);

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
      }
    }

    // If there are any Amazon US accounts
    if (amazonAccountsExist.UK.length > 0) {
      // Iterate through all of them
      for (const [index, account] of (amazonAccounts.UK).entries()) {
        // Check if the account has a cookie file 
        amazonAccountsExist.UK[index].has_cookie_file = await new Promise((resolve, reject) => {
          const cookiePath = path.resolve(global.amazonAutoorderCookiePathDir, `${account.id}_UK_autoorder_cookies.txt`);

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
      }
    }

    // Return the accounts object with updated has_cookie_file property for each account
    return amazonAccountsExist;
  };

   /*
   * Delete Amazon cookie file -> logging out of Amazon account
   */
  deleteCookieFile = async (account: Account): Promise<any> => {
    // Assume a path for a US account
    let cookieFilePath: string = path.resolve(global.amazonAutoorderCookiePathDir, `${account.id}_US_autoorder_cookies.txt`);

    // If, however, the account is UK -> change the path to a UK account (can add more later)
    if (account.country === 'UK' || account.account === 'autoorder_amazon_uk') {
      cookieFilePath = path.resolve(global.amazonAutoorderCookiePathDir, `${account.id}_UK_autoorder_cookies.txt`);
    }

    fs.unlink(cookieFilePath, error => {
      if (error) {
        global.appLog.error(`Error while deleting Amazon autoorder ${account.id}-${account.email}-${account.country} cookie file - ${error}`);
        return false;
      }
      return true;
    });
  };

  /*
   * Reads the Amazon Cookie File and either returns the whole contents of the cookie file
   * or returns true/false representing whether the file contains an Amazon sessionID
   */
  readCookieFile = async (returnCookies: boolean = false, autoorderAccount: Account): Object | string => {
    // Query the file content of the specified country`s cookie file
    const fileContent: Object = await new Promise((resolve, reject) => {
      // Default cookie path is US
      let cookieFilePath: string = path.resolve(global.amazonAutoorderCookiePathDir, `${autoorderAccount.id}_US_autoorder_cookies.txt`);

      if (autoorderAccount.country === 'UK') {
        cookieFilePath = path.resolve(global.amazonAutoorderCookiePathDir, `${autoorderAccount.id}_UK_autoorder_cookies.txt`);
      } 

      // This function reads and returns the content of the cookie file -> it is parsed as JSON
      return fs.readFile(cookieFilePath, { encoding: 'utf8' }, (err, data) => {
        if (err) {
          return reject(err);
        }

        return resolve(JSON.parse(data));
      });
    });

    // If returnCookies parameter is false -> just check if the cookie file contains a session id -> return it
    let hasSessionId: boolean = false;

    await fileContent.forEach((item: Object) => {
      if (item.name === 'session-id') {
        hasSessionId = true;
      }
    });

    // If returnCookies parameter is true -> return the whole content of the file
    if (returnCookies) {
      return { file_content: fileContent, has_session_id: hasSessionId }
    }

    return { file_content: '', has_session_id: hasSessionId };
  };

  /*
   * Gets the cookies from the Amazon session and saves/overwrites the cookie file
   */
  writeCookieFile = async (page, sourceAccount): Promise<any> => {
    const amazonAutoorderCookies = {};
    try {
      if (page.url().includes('amazon.com')) {
        amazonAutoorderCookies.US = await page.cookies(
          'https://amazon.com',
          'https://account.amazon.com'
        );

        if (amazonAutoorderCookies.US.length > 0) {
          if (sourceAccount.id !== ''){
            const amazonAutoorderUSCookiePath = path.resolve(global.amazonAutoorderCookiePathDir, `${sourceAccount.id}_US_autoorder_cookies.txt`);

            fs.writeFileSync(amazonAutoorderUSCookiePath, JSON.stringify(amazonAutoorderCookies.US), 'utf-8');
          }
        }
      }

      if (page.url().includes('amazon.co.uk')) {
        amazonAutoorderCookies.UK = await page.cookies(
          'https://amazon.co.uk',
          'https://www.amazon.co.uk',
        );

        if (amazonAutoorderCookies.UK.length > 0) {
          const amazonAutoorderUKCookiePath = path.resolve(global.amazonAutoorderCookiePathDir, `${sourceAccount.id}_UK_autoorder_cookies.txt`);

          fs.writeFileSync(amazonAutoorderUKCookiePath, JSON.stringify(amazonAutoorderCookies.UK), 'utf-8');
        }
      }
    } catch (error) { 
      global.appLog.error(`${error} - inside amazon.writeCookieFile catch block - line 937`);
    }
  };

  orderProduct = async (product: Order) => {
    // product { 
    //   store_id: '184144017065',
    //   auto: false,
    //   buy_for: 13.99,
    //   buyer_email: 'edbuffaloe@unblinkingeye.com',
    //   buyer_phone: '+1 512-626-0139',
    //   date_sold: 'Feb 17, 2020 at 9:24am PST',
    //   image:
    //   'https://i.ebayimg.com/images/i/184144017065-0-1/s-l64/p.jpg',
    //   item_name:
    //   '8 Gun Pistol Rack Gun Safe Black Storage PVC Coated Handgun Secure Organizer USA',
    //   matched_listing_store_id: '184144017065',
    //   order_number: '18-04554-34634',
    //   order_with_account:
    // { account: 'autoorder_amazon_uk',
    //   cookies_content: '',
    //   country: 'UK',
    //   email: 'antonio.iliev94@gmail.com',
    //   has_cookie_file: true,
    //   has_valid_cookies: true,
    //   id: 8,
    //   password: '08Ant1994',
    //   settings: { payment_methods: [Object] },
    //   status: '0' },
    //   pay_with: 'credit-card',
    //   post_to_address_field: '1540 Homewood Cir',
    //   post_to_address_field_2: null,
    //   post_to_city: 'Round Rock',
    //   post_to_country: 'United States',
    //   post_to_name: 'Unblinking Eye',
    //   post_to_postcode: '78665-5636',
    //   post_to_state_province: 'TX',
    //   product_availability: '4',
    //   quantity: '3',
    //   sold_for: '56.67',
    //   status: 'Ship by Feb 20at 11:59pm PST',
    //   supplier: 'amazon',
    //   supplier_id: 'B0198GV5KK',
    //   supplier_url: 'https://www.amazon.co.uk/dp/B0198GV5KK/' 
    // }

    await global.knex('tbl_orders')
    .where({ order_number: product.order_number })
    .update({ being_ordered_at_source: '1' })
    .catch(e => global.appLog.error(`${e} - AmazonAutoorder.orderProduct - line 795`));

    this.sendOrdersToFrontEnd();

    try {
      if (!this.orderBrowser) {
        this.orderBrowser = await puppeteer.launch({
          headless: global.headless,
          executablePath: Util.getChromiumExecPath(puppeteer),
          slowMo: 100,
          devtools: false,
          ignoreDefaultArgs: ['--enable-automation'],
          args: [
            '--disable-webgl'
          ],
        });

        const page = await this.orderBrowser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setDefaultNavigationTimeout(0);

        if (global.proxyUsername !== '' && global.proxyPassword !== '') {
          await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
        }

        // When the 'Order browser' closes -> update the tracking variable so that the browser can be opened again
        this.orderBrowser.on('disconnected', () => {
          this.orderBrowser = false;
        });
        
        global.fulfillingAmazonOrder = true;

        await Util.insertOrderLog(product, 'Began ordering this product...', 'info');

        // 1.  Check what marketplace has to be repriced and login --------------------------------------------------
        let marketplace: string = '';

        // 1.1 Pull the correct cookies and set them to the page
        // 1.1.1 Pull all Amazon autoorder accounts` information from the DB
        const amazonAutoorderAccounts: AmazonAutoorderAccountsType = await this.canLogIn(true);
        let cookies: string = '';

        // 1.1.2 Check what Amazon marketplace account the product has to be ordered with
        if (product.order_with_account.country === 'US') {
          if (amazonAutoorderAccounts.US.length > 0) {
            // If there is no order account chosen by the user -> Dalio will set it to 'first-account' which means the first one pulled from the DB
            if (product.order_with_account.account === 'first-account') {
              // If that first account has cookies and are valid -> choose it
              if (amazonAutoorderAccounts.US[0].has_cookie_file && amazonAutoorderAccounts.US[0].has_valid_cookies) {
                cookies = amazonAutoorderAccounts.US[0].cookies_content;
              }
            } else {
              // The user has chosen a specific account to order with -> iterate through all of the accounts and find out which one the user has chosen
              for (const account of amazonAutoorderAccounts.US) {
                if (account.account === product.order_with_account.account && account.email === product.order_with_account.email) {
                  if (account.has_cookie_file && account.has_valid_cookies) {
                    cookies = account.cookies_content;
                  }
                }
              }
            }
          } else {
            const escapedLog: string = encodeURI(`Error while ordering '${product.item_name}'. It appears that there are no US Amazon accounts to order the product with.`);
            await global.log.error(escapedLog);
            await Util.insertOrderLog(product, 'Error while ordering. It appears that there are no US Amazon accounts to order the product with.', 'error');

            const error: ErrorType = {
              status: 'error',
              message: `Error while ordering '${product.item_name}'. It appears that there are no US Amazon accounts to order the product with.`
            };

            throw error.message;
          }
        } else if (product.order_with_account.country == 'UK') {
          if (amazonAutoorderAccounts.UK.length > 0) {

            if (product.order_with_account.account === 'first-account') {
              if (amazonAutoorderAccounts.UK[0].has_cookie_file && amazonAutoorderAccounts.UK[0].has_valid_cookies) {
                cookies = amazonAutoorderAccounts.UK[0].cookies_content;
              }
            } else {
              for (const account of amazonAutoorderAccounts.UK) {
                if (account.account === product.order_with_account.account && account.email === product.order_with_account.email) {
                  if (account.has_cookie_file && account.has_valid_cookies) {
                    cookies = account.cookies_content;
                  }
                }
              }
            }
          } else {
            const escapedLog: string = encodeURI(`Error while ordering '${product.item_name}'. It appears that there are no UK Amazon accounts to order the product with.`);
            await global.log.error(escapedLog);
            await Util.insertOrderLog(product, 'Error while ordering. It appears that there are no UK Amazon accounts to order the product with.', 'error');

            const error: ErrorType = {
              status: 'error',
              message: `Error while ordering '${product.item_name}'. It appears that there are no UK Amazon accounts to order the product with.`
            }

            throw error.message;
          }
        }

        // 1.1.3 Check if there are valid cookies to login with
        if (cookies === '') {
          const escapedLog: string = encodeURI(`Error while ordering '${product.item_name}'. There are no valid cookies. Please log in again.`);
          await global.log.error(escapedLog);
          await Util.insertOrderLog(product, 'Error while ordering. There are no valid cookies. Please log in again.', 'error');
          
          const error: ErrorType = {
            status: 'error',
            message: `Error while ordering '${product.item_name}'. There are no valid cookies. Please log in again.`
          }

          throw error;
        } else {  
          if (product.supplier_url.includes('amazon.com')) {
            await page.setCookie(...cookies);
            await page.goto('https://amazon.com', { waitUntil: 'networkidle0' });
            marketplace = 'US';
          } else if (product.supplier_url.includes('amazon.co.uk')) {
            await page.setCookie(...cookies);
            await page.goto('https://amazon.co.uk', { waitUntil: 'networkidle0' });
            marketplace = 'UK';
          } else {
            // If the supplier_url is not Amazon US or UK -> close the order browser and stop function execution
            await this.orderBrowser.close();
            return false;
          }
        }

        // await Util.changeAmazonDeliveryAddress(page, product.supplier_url);

        // 1.2 Check if Amazon requests login despite setting the cookies
        const needsToLoginAgain: boolean = await page.evaluate(() => {
          if (document.querySelector('.cvf-widget-form.cvf-widget-form-account-switcher a') !== null) {
            return true;
          }
          return false;
        });
  
        // 1.2.1 If yes, delete the currently saved cookies and throw an error to effectively terminate function execution
        if (needsToLoginAgain) {
          const log: string = `Amazon account ${product.account.country} ${product.account.email} has to be logged in again.`;
          await global.log.error(encodeURI(log));
          await Util.insertOrderLog(product, log, 'error');

          await this.logOut(product.account);
  
          const error: ErrorType = {
            status: 'error',
            message: log
          };

          throw error.message; 
        }

        // 2. Navigate to the cart page and clear any items in the card --------------------------------------
        await this._clearCart(page);

        // 3. Navigate to the current product`s URL, so it can be ordered
        await page.goto(product.supplier_url, { waitUntil: 'networkidle0' });

        // A captcha can appear here -> check for one and solve it
        await this._solveCaptchaIfPresent(page);

        // 3.1 Check what quantity is available for the product to be bought and set the quantity selector
        const productAvailability: ?string = await this._checkProductsAvailability(page);

        if (productAvailability === null) {
          const escapedLogOOS: string = `Product ${product.item_name} cannot be ordered. Please investigate the issue.`;
          const errorOOS: ErrorType = {
            status: 'error',
            message: escapedLogOOS
          }

          await global.log.error(encodeURI(escapedLogOOS));
          await Util.insertOrderLog(product, 'This product cannot be ordered. Please investigate the issue.', 'error');

          throw errorOOS;
        }

        // 3.1.1 Assume available quantity during order of 0
        // eslint-disable-next-line
        let availableQuantityDuringOrder = 0;
        let isAnOffer = false;

        const unescapedLogOOS: string = `Product "${product.item_name}" cannot be ordered. It either does not have sufficient quantity or it is out of stock.`;
        const escapedLogOOS: string = encodeURI(unescapedLogOOS);

        const errorOOS: ErrorType = {
          status: 'error',
          message: `Product ${product.item_name} cannot be bought. It either does not have sufficient quantity or it is out of stock.`
        }

        console.log('productAvailability', typeof productAvailability, productAvailability);
        // If the product availability during order is NOT 'IN_STOCK', 'OUT_OF_STOCK' , '0' or undefined
        if (productAvailability !== 'IN_STOCK' && productAvailability !== undefined && productAvailability !== '0' && productAvailability !== 'OUT_OF_STOCK') {
          // 3.1.2 Set the available quantity during order to the current number
          let availableQuantityDuringOrder = 0;
          if (typeof productAvailability !== 'number') {
            availableQuantityDuringOrder = parseInt(productAvailability);
          } else {
            availableQuantityDuringOrder = productAvailability;
          }

          if (!isNaN(availableQuantityDuringOrder)) {
            // 3.1.3 If the availability during order is greater than or equal to the quantity a client has ordered
            if (parseInt(product.quantity) <= availableQuantityDuringOrder) {

              // Sometimes Amazon offers you to buy a subscription -> if it does -> click the one time buy option
              const oneTimeBuyBox = await page.$('#oneTimeBuyBox a');
  
              const oneTimeBuyBoxUKAlternative = await page.$('#newBuyBoxPrice');
              // id="submit.add-to-cart"
  
              if (oneTimeBuyBox !== null) {
                await oneTimeBuyBox.click();
              } else if (oneTimeBuyBoxUKAlternative !== null) {
                await oneTimeBuyBoxUKAlternative.click();
              }

              const availabilitySelector = await page.$('select#quantity');
              if (availabilitySelector !== null) {
                // 3.1.4 Set the quantity selector
                await page.select('select#quantity', product.quantity);
              } else {
                await global.log.error(escapedLogOOS);
                await Util.insertOrderLog(product, unescapedLogOOS, 'error');
                throw errorOOS.message;
              }
            } else {
              errorOOS.message = encodeURI(`Product "${product.item_name}" cannot be ordered as the available quantity is less than the required quantity.`);
              await global.log.error(errorOOS.message);
              await Util.insertOrderLog(product, unescapedLogOOS, 'error');
              throw errorOOS.message;
            }
          } else {
            await global.log.error(escapedLogOOS);
            await Util.insertOrderLog(product, unescapedLogOOS, 'error');
            throw errorOOS.message;
          }
        } else {

          // Check if the reason for the OOS availability is that there are multiple seller offers
          const bestOfferFound = await this._checkForMultipleSellerOffers(page);
          console.log('bestofferFound', bestOfferFound);

          if (bestOfferFound !== null && bestOfferFound !== undefined) {
            isAnOffer = JSON.parse(JSON.stringify(bestOfferFound));
          } else {
            await global.log.error(escapedLogOOS);
            await Util.insertOrderLog(product, unescapedLogOOS, 'error');
            throw errorOOS.message;
          } 
        }

        console.log('product availability at order', availableQuantityDuringOrder);

        if (isAnOffer) {
          const offerButtons = await page.$$(isAnOffer.add_to_cart_button_selectors);

          if (offerButtons.length > 0) {
            await offerButtons[isAnOffer.add_to_cart_button_number].click();
            await page.waitFor(10000);
          }
        } else {
          await page.click('#add-to-cart-button');
          await page.waitFor(10000);
        }

        // 5. Navigate to the cart, so that the gift option for the order can be checked (sometimes Amazon changes the flow and brings a slide in from the right which has to be closed)

        // #attach-sidesheet-view-cart-button input
        // #attach-close_sideSheet-link

        const sideSheetCloseButton = await page.$('#attach-close_sideSheet-link');

        if (sideSheetCloseButton !== null) {
          await sideSheetCloseButton.click();
          await page.waitFor(5000);
        }

        await page.hover('a#nav-cart');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          page.click('a#nav-cart')
        ]);

        // 5.1 While in the cart page, check if the gift option is available
        const giftOptionAvailable: boolean = await page.evaluate(() => {
          const giftOptionsAvailableSelector = document.querySelector('.sc-list-body');

          if (giftOptionsAvailableSelector.textContent.toLowerCase().includes('gift options not available')) {
            return false;
          }

          return true;
        })

        // 5.1.1 If the gift option is available -> check if the checkbox is checked
        if (giftOptionAvailable) {
          const giftOptionCheckBoxSelectorChecked: boolean = await page.evaluate(() => {
            const giftOptionCheckBoxChecked = document.querySelector('.sc-gift-option label input[type="checkbox"]');
            if (giftOptionCheckBoxChecked !== null) {
              if (giftOptionCheckBoxChecked.checked) {
                return true;
              }

              return false;
            }
          });

          console.log('gift checkbox clicked');
          // 5.1.2 If the checkbox is NOT checked -> check it by clicking on it
          if (!giftOptionCheckBoxSelectorChecked) {
            await page.click(".sc-gift-option label input[type='checkbox']");
            await page.waitFor(2000);
            console.log("checkbox for gift clicked");
          }
        }

        // 6. Click on the 'Continue' button -> starting the checkout process
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          page.click('#sc-buy-box-ptc-button input')
          // page.click('#hlb-ptc-btn-native')
        ]);

        // 7. Sometimes Amazon requires another login just to reaffirm the password -> if it does, login
        await this._loginWithPasswordOnly(page, product.order_with_account.country, 'autoorder');

        console.log("now we are in checkout page");

        // Find out what address layout we are presented with and fill in the details
        await this._enterAddressDetails(page, product, marketplace);

        // 9. Handle payment
        console.log('product.pay-with: ', product.pay_with.type);
        // 9.1 Check whether the order should be paid with credit card
        if (product.pay_with.type === 'credit-card') {
          // 9.1.1 Assume that no card chosen by the user for payment has been found
          let chosenCardFound: boolean = false;

          // 9.1.2 Select all credit card rows
          const creditCardRows = await page.$$('.pmts-credit-card-row');

          console.log('paying with credit card');
          // 9.1.3 Check if there are any credit cards saved on Amazon checkout`s payment step
          if (creditCardRows.length > 0) {
            // 9.1.3.1 Iterate through all presented credit cards
            let cardRowIdFound = null;

            for (let i = 0; i < creditCardRows.length; i++) {
              // 9.1.3.2 Get the ID of the iterated credit card row
              let cardRowId: Object | string = await creditCardRows[i].getProperty('id');        
              cardRowId = cardRowId._remoteObject.value;

              console.log('cardRowId', cardRowId);
              // 9.1.3.3 Get the text content of the div selector using the ID from the previous step
              const cardRowParentDivSelector: string | null = await page.evaluate(cardRowId => {
                const cardRowParentDivSelector = document.querySelector(`div#${cardRowId}`);
                if (cardRowParentDivSelector !== null) {
                  return cardRowParentDivSelector.textContent;
                }

                return null;
              }, cardRowId)

              // 9.1.3.4 If there is text content returned from the previous step
              if (cardRowParentDivSelector !== null) {
                const { display_name, number_tail, expiry_date } = product.pay_with.credit_card;

                // 9.1.3.5 Check if the text content of the selected card includes the data of the chosen by the user payment card -> if yes, mark the chosenCardFound variable to true
                if (cardRowParentDivSelector.includes(display_name) && cardRowParentDivSelector.includes(number_tail) && cardRowParentDivSelector.includes(expiry_date)) {
                  const cardRowRadioButton = await page.$(`div#${cardRowId} input[name="ppw-instrumentRowSelection"]`);
                  console.log('user chosen card found: ', cardRowId);
                  chosenCardFound = true;
                  // 9.1.3.6 If the matching card is not selected -> select it as the payment method
                  if (cardRowRadioButton !== null) {
                    cardRowRadioButton.checked = true;
                    await cardRowRadioButton.click();
                    cardRowIdFound = cardRowId;
                  }
                }
              }
            }

            // 9.1.3.2 If there is no card found matching the one chosen by the user -> handle the error
            if (!chosenCardFound) {
              const log: string = `Product "${product.item_name}" could not be ordered as your payment card could not be found at the Amazon checkout page. Please add it and update your payment information.`;
              global.log.error(encodeURI(log));
              await Util.insertOrderLog(product, log, 'error');


              await this.orderBrowser.close();

              const error: ErrorType = {
                status: 'error',
                message: log
              };

              throw error.message;
            }

            console.log('checking for default card currency radio', cardRowIdFound);  
            // document.querySelector('div#pp-k0PecT-62 .pmts_tfx_preselected_currency_option input[type="radio"]')
            // pmts_tfx_preselected_currency_option 

            const defaultCardCurrencyRadioVisible = await page.$(() => {
              const selector = document.querySelector(`div#${cardRowIdFound} .pmts_tfx_preselected_currency_option input[type="radio"]`);

              if (selector !== null) {
                if (selector.checked) {
                  return false
                }

                return true;
              }

              return null;
            }, cardRowIdFound);

            if (defaultCardCurrencyRadioVisible !== null && defaultCardCurrencyRadioVisible) {
              const defaultCardCurrency = await page.$(`div#${cardRowIdFound} .pmts_tfx_preselected_currency_option input[type="radio"]`);

              if (defaultCardCurrency !== null) {
                if (!defaultCardCurrency.checked) {
                  await defaultCardCurrency.click();
                }
              }
            }

            console.log('confirming payment method selection');

            // 9.1.3.3 Confirm the payment method selection
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
              page.click('#orderSummaryPrimaryActionBtn')
            ]).catch(err => {
              // 9.1.3.3.1 Catch navigation timeout if there is a cc check
              console.log('error on cc check', err);
            });

            console.log('payment method confirmed');

            // 9.1.3.4 check for cc authorization (create separate function probably)
            // .pmts-cc-address-challenge-inline-field-block.apx-add-credit-card-number
            const ccAddressChallenge = await page.$('.pmts-cc-address-challenge-inline-field-block.apx-add-credit-card-number');

            console.log('after ccAdressChallenge check');
            // 9.1.3.5 If CC authorization is required by Amazon
            if (ccAddressChallenge !== null) {
              console.log('ccAddressChallenge not null');
              // 9.1.3.5.1 Get the card which should already be added by the user in Dalio orders` dashboard
              const { credit_card } = product.pay_with;
              // 9.1.3.5.2 If the user has added a credit card number -> type it in the required field
              if (credit_card.card_number !== '') {
                await page.type('.pmts-cc-address-challenge-inline-field-block.apx-add-credit-card-number input', credit_card.card_number, { delay: 100 });
              } else {
                // 9.1.3.5.3 Else, throw an error that the card number is not valid/non existent
                const errorLog = encodeURI(`Product ${product.item_name} could not be ordered. The credit card (${credit_card.display_name} ${credit_card.number_tail}) used for ordering is not validated, please do so.`);
                const orderLog = `This product could not be ordered. The credit card (${credit_card.display_name} ${credit_card.number_tail}) used for ordering is not validated, please do so.`;

                const error = {
                  status: 'error',
                  message: `Product ${product.item_name} could not be ordered. The credit card (${credit_card.display_name} ${credit_card.number_tail}) used for ordering is not validated, please do so.`
                }

                await global.log.error(errorLog);
                await Util.insertOrderLog(product, orderLog, 'error');

                throw new Error(error.message);
              }

              // 9.1.3.5.3 Click the verify button and wait for 5 seconds
              // .pmts-cc-address-challenge-inline-field-block .pmts-button-input button
              await page.click('.pmts-cc-address-challenge-inline-field-block .pmts-button-input button');
              await page.waitFor(5000);

              // 9.1.3.5.4 Check if typed card number has been accepted
              const challengeFormSelector: string | null = await page.evaluate(() => {
                const challengeFormErrorSelector = document.querySelector('.pmts-cc-address-challenge-form');
                if (challengeFormErrorSelector !== null && challengeFormErrorSelector !== undefined) {
                  return challengeFormErrorSelector.textContent;
                }
                return null;
              });

              console.log('challengeFormSelector', challengeFormSelector);
              // 9.1.3.5.5 If it has not been accepted -> log an error and terminate the funcion execution
              if (challengeFormSelector !== null) {
                if (challengeFormSelector.toLowerCase().includes(`card number doesn't match`)) {
                  // throw an error that the card number is not valid/non existent
                  const errorLog = encodeURI(`Product ${product.item_name} could not be ordered. The credit card (${credit_card.display_name} ${credit_card.number_tail}) used for ordering does not have a valid number. Please fix it in the Autoorder dashboard.`);
                  const orderLog = `This product could not be ordered. The credit card (${credit_card.display_name} ${credit_card.number_tail}) used for ordering does not have a valid number. Please fix it in the autoorder dashboard.`;

                  const error = {
                    status: 'error',
                    message: `Product ${product.item_name} could not be ordered. The credit card (${credit_card.display_name} ${credit_card.number_tail}) used for ordering does not have a valid number. Please fix it in the Autoorder dashboard.`
                  }

                  await global.log.error(errorLog);
                  await Util.insertOrderLog(product, orderLog, 'error');

                  throw error.message;
                }
              }

              // 9.1.3.5.6 If the card number has been accepted -> press the 'Continue' button again
              // #orderSummaryPrimaryActionBtn
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click('#orderSummaryPrimaryActionBtn')
              ]);
              
            }

            // 9.1.3.6 If a prime offer upsell shows -> click continue without prime
            // .prime-nothanks-button prime-checkout-continue-link
            const primeNoThanksButton = await page.$('a.prime-nothanks-button');
            if (primeNoThanksButton !== null) {
              primeNoThanksButton.click();
            }
          } else {
            // 9.1.3.2 Handle the error
            const log: string = `Cannot order products with your Amazon ${product.order_with_account.country} (${product.order_with_account.email}) as there are no credit cards saved in your account. Please add at least one, so Dalio can order with this account.`;
            const orderLog: string = `Cannot order this product with your Amazon ${product.order_with_account.country} (${product.order_with_account.email}) as there are no credit cards saved in your account. Please add at least one, so Dalio can order with this account.`;
            
            global.log.error(encodeURI(log));
            await Util.insertOrderLog(product, orderLog, 'error');
            
            const error: ErrorType = {
              status: 'error',
              message: log
            }
          }
        } else if (product.pay_with.type === 'gift-card-balance') {
          // Check if the gift card balance radio button is selected
          const gcRadioButtonSpan = await page.$('.pmts-gc-radio-button');

          if (gcRadioButtonSpan !== null) {

            // Check if the radio button is hidden. If it is, that means there is not enough balance and a checkbox is shown instead
            const gcRadioButtonSpanIsHidden = await page.evaluate(() => {
              const gcRadioButton = document.querySelector('.pmts-gc-radio-button');

              if (gcRadioButton.classList.contains('aok-hidden') || gcRadioButton.classList.contains('a-hidden')) {
                return true;
              }

              return false;
            });

            if (!gcRadioButtonSpanIsHidden) {
              // There is enough gift balance
              const giftBalanceInputSelector = await page.$('.apx-selectable-balance-input input');
  
              const giftBalanceInputChecked = await page.evaluate(() => document.querySelector('.apx-selectable-balance-input input').checked);

              if (!giftBalanceInputChecked) {
                await giftBalanceInputSelector.click();
              }

              await page.waitFor(3000);

              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click('#orderSummaryPrimaryActionBtn')
              ]);

            } else {
              // not enough gift card balance -> probably combine the usage of the remaining balance with a credit card
              const errorLog = `Could not order ${product.item_name} with gift card balance as it is not sufficient. Please top it up.`
              await global.log.error(encodeURI(errorLog));
              await Util.insertOrderLog(product, errorLog, 'error');
  
              throw new Error(errorLog);
            }
          }

        }

        await page.waitFor(8000);

        // Check if Amazon tries to convert the payment to a local currency (e.g BGN) -> choose the marketplace currency instead
        const marketplaceCurrencyChanger = await page.$('#checkoutCurrencyMarketplace input#marketplaceRadio');

        if (marketplaceCurrencyChanger !== null) {
          await marketplaceCurrencyChanger.click();
        }

        console.log('taking the autoorder settings from DB');
        // 10. Place the order
        const dalioAccountRow = await global.knex('tbl_users')
        .where({ account: 'dalio' })
        .first()
        .then(rows => rows)
        .catch(e => global.appLog.error(`${e} - at AmazonAutoorder.orderProduct - line 1644`));
    
        const accountSettings = JSON.parse(dalioAccountRow.settings);

        console.log('press the order button', accountSettings.autoorder.press_amazon_order_button);

        // if (accountSettings.autoorder.press_amazon_order_button == 1) {
          const placeOrderButton = await page.$('#submitOrderButtonId');
          const placeOrderButtonUK = await page.$('#placeYourOrder');

          // submitOrderButtonId
          if (placeOrderButton !== null) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0' }),
              placeOrderButton.click()
            ]);
          } else if (placeOrderButtonUK !== null) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0' }),
              placeOrderButtonUK.click()
            ]);
          } else {
            throw new Error(`Could not order ${product.item_name}. There was a problem locating the order button.`)
          }
        // }

        await page.waitFor(10000);

        // 11. Perform some checks whether the order has been successfully placed
        console.log('product.account: ', product.order_with_account);
        
        // 12. Save fresh page cookies
        await this.writeCookieFile(page, product.order_with_account);
        await this.orderBrowser.close();

        const orderedAt = await moment().format('YYYY-MM-DD HH:mm:ss');

        // Save the ordered_at time to the database and bump the status code to 1 = ordered on Amazon but not marked as shipped on eBay
        await global.knex('tbl_orders')
        .where({ order_number: product.order_number })
        .update({ 
          ordered_at: orderedAt,
          status_code: '1',
          ordered_by: 'dalio',
          being_ordered_at_source: '0'
         })
        .catch(e => global.appLog.error(`${e} - AmazonAutoorder.orderProduct - line 1497`));

        await Util.insertOrderLog(product, 'This product has been ordered successfully.', 'info');

        await this.sendOrdersToFrontEnd();

        // Recheck payment methods after every order where gift card balance was used -> this will help with showing the correct gift card balance`
        // if (product.pay_with.type === 'gift-card-balance') {
        await this.checkPaymentMethods();
        // }

        await this.sendOrdersToServer();

        global.fulfillingAmazonOrder = false;
        this.fulfilOrders();
      }
    } catch (error) {
      let productErrors = 0;

      if (product.errors !== null && product.errors !== '0') {
        productErrors = parseInt(product.errors);
      }

      productErrors++;

      await global.knex('tbl_orders')
      .where({ order_number: product.order_number })
      .update({ errors: productErrors })
      .catch(e => global.appLog.error(`${e} - AmazonAutoorder.orderProduct - line 1496`));

      await this.orderBrowser.close();
      global.appLog.error(`${error} in amazonAutoorder.orderProduct - line 1454`);

      const escapedLog: string = encodeURI(`There has been an unexpected error while ordering '${product.item_name}'.`);
      await Util.insertOrderLog(product, `There has been an unexpected error while ordering '${product.item_name}'.`, 'error');

      await global.knex('tbl_orders')
      .where({ order_number: product.order_number })
      .update({ being_ordered_at_source: '0' })
      .catch(e => global.appLog.error(`${e} - AmazonAutoorder.orderProduct - line 1688`));

      this.sendOrdersToFrontEnd();
      global.fulfillingAmazonOrder = false;
      this.fulfilOrders();
    }
  };

  checkPaymentMethods = async (): Promise<any> => {
    await this.mainWindow.webContents.send('amazon-autoorder-payment-methods-fetch-status', true);

    // Checks what autoorder accounts there are -> if there are none it will return empty array [], otherwise it will return an object with arrays for US/UK and others later
    let amazonAutoorderAccounts: AmazonAutoorderAccountsType = await this.canLogIn(true);

    if (amazonAutoorderAccounts.US.length > 0) {
      for (const account of amazonAutoorderAccounts.US) {
        await this._scrapePaymentMethods(account);
      }
    }

    if (amazonAutoorderAccounts.UK.length > 0) {
      for (const account of amazonAutoorderAccounts.UK) {
        await this._scrapePaymentMethods(account);
      }
    }

    this.mainWindow.webContents.send('amazon-autoorder-payment-methods-fetch-status', false);

    amazonAutoorderAccounts = await this.canLogIn(false);
    this.mainWindow.webContents.send('check-amazon-autoorder-login', amazonAutoorderAccounts);
   
  };

  checkOrders = async () => {
    if (!this.checkOrdersBrowser) {
      const amazonOrderCheckerStartedAt = await moment().format('DD-MM-YYYY HH:mm:ss');
      this.mainWindow.webContents.send('amazon-order-sync-status', { status: true, started_at: amazonOrderCheckerStartedAt });

      try {
        this.checkOrdersBrowser = await puppeteer.launch({
          headless: global.headless,
          executablePath: Util.getChromiumExecPath(puppeteer),
          slowMo: 100,
          devtools: false,
          ignoreDefaultArgs: ['--enable-automation'],
          args: [
            '--disable-webgl'
          ],
        });

        this.checkOrdersBrowser.on('disconnected', () => {
          this.checkOrdersBrowser = false;
        });

        const amazonAutoorderAccounts = await this.canLogIn(true);

        if (amazonAutoorderAccounts.US.length > 0) {
          for (const account of amazonAutoorderAccounts.US) {
            if (account.has_cookie_file && account.has_valid_cookies) {
              const cookies = account.cookies_content;
              await this._scrapeOrders(account, cookies, 'US');
              await this._scrapeTrackingData(account, cookies, 'US');
            }
          }
        } 

        if (amazonAutoorderAccounts.UK.length > 0) {
          for (const account of amazonAutoorderAccounts.UK) {
            if (account.has_cookie_file && account.has_valid_cookies) {
              const cookies = account.cookies_content;
              await this._scrapeOrders(account, cookies, 'UK');
              await this._scrapeTrackingData(account, cookies, 'UK');
            }
          }
        }

        await this.checkOrdersBrowser.close();
        await this.sendOrdersToFrontEnd();
        global.appLog.info('Scraped Amazon orders and their data');
        this.mainWindow.webContents.send('amazon-order-sync-status', { status: false });

      } catch (e) {
        await this.checkOrdersBrowser.close();
        this.mainWindow.webContents.send('amazon-order-sync-status', { status: false });
        global.appLog.error(`${e} - in amazonAutoorder.checkOrders() line 997`);
      }
    }
  };

  checkTrackingData = async () => {
    if (!this.checkOrdersBrowser) {
      const amazonOrderCheckerStartedAt = await moment().format('DD-MM-YYYY HH:mm:ss');

      this.mainWindow.webContents.send('amazon-order-sync-status', { status: true, started_at: amazonOrderCheckerStartedAt });

      try {
        this.checkOrdersBrowser = await puppeteer.launch({
          headless: global.headless,
          executablePath: Util.getChromiumExecPath(puppeteer),
          slowMo: 100,
          devtools: false,
          ignoreDefaultArgs: ['--enable-automation'],
          args: [
            '--disable-webgl'
          ],
        });

        this.checkOrdersBrowser.on('disconnected', () => {
          this.checkOrdersBrowser = false;
        });

        const amazonAutoorderAccounts = await this.canLogIn(true);

        if (amazonAutoorderAccounts.US.length > 0) {
          for (const account of amazonAutoorderAccounts.US) {
            if (account.has_cookie_file && account.has_valid_cookies) {
              const cookies = account.cookies_content;
              await this._scrapeTrackingData(account, cookies, 'US');
            }
          }
        } 

        if (amazonAutoorderAccounts.UK.length > 0) {
          for (const account of amazonAutoorderAccounts.UK) {
            if (account.has_cookie_file && account.has_valid_cookies) {
              const cookies = account.cookies_content;
              await this._scrapeTrackingData(account, cookies, 'UK');
            }
          }
        }

        await this.checkOrdersBrowser.close();

        await this.sendOrdersToFrontEnd();
        this.mainWindow.webContents.send('amazon-order-sync-status', { status: false });

      } catch (e) {
        await this.checkOrdersBrowser.close();
        this.mainWindow.webContents.send('amazon-order-sync-status', { status: false });
        global.appLog.error(`${e} - in amazonAutoorder.checkTrakingNumbers() line 1869`);
      }
    }
  };

  automateProductOrdering = async () => {
    // 1. Get all orders that have status_code 0 (awaiting dispatched and not ordered on Amazon)
    const ordersToShip = await global.knex('tbl_orders')
    .where({ status_code: 0 })
    .then(rows => rows)
    .catch(e => global.appLog.error(`${e} - at AmazonAutoorder.automateProductOrdering.js - line 1455`));

    console.log('ordersToShip', ordersToShip.length);

    // Get the Autoorder settings
    const dalioAccountRow = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(rows => rows)
    .catch(e => global.appLog.error(`${e} - at AmazonAutoorder.automateProductsOrdering.js - line 1467`));

    const accountSettings = JSON.parse(dalioAccountRow.settings);

    // If the user has an account and has no unpaid invoices
    if (dalioAccountRow.status == '1') {
      // Check if there are any orders that need shipping
      if (ordersToShip.length > 0) {

        // If yes, iterate through all of them and prepare them for the orderProduct function
        for (let i = 0; i < ordersToShip.length; i++) {
          try {
            const preparedOrder = await this._prepareProductOrderObject(ordersToShip[i], accountSettings);

            // If theres is an error with preparing the order object -> log it
            if (preparedOrder.error) {
              await global.log.error(encodeURI(preparedOrder.message));
              await global.knex('tbl_orders')
              .where({ id: preparedOrder.id })
              .update({ errors: 1 })
              .catch(error => global.appLog.error(`${error} - AmazonAutoorder.automateProductOrdering - line 1556`));
            } else {
              // Else order the product
              console.log('ordering: ', preparedOrder.order_number);
              await this.orderProduct(preparedOrder);
            }
          } catch (e) {
            global.appLog.error(`${e} -> AmazonAutoorder.automateProductOrdering() -> line 1559`);
          }

        }
        console.log('DONE ORDERING');
        // When done with ordering -> try to get tracking numbers 
      }
    } else {
      if (dalioAccountRow.email !== null) {
        global.log.error('Cannot run the autoorder. Please pay any issued invoices.')
      } else {
        global.log.error('Cannot run the autoorder. Please register an account at dalio.io and login with it.')
      }
    }
  }

  _prepareProductOrderObject = async (order: Order, accountSettings): Promise<any> => {
    console.log('order', order.order_number);

    // 1. Deep copy the passed order prop in order to manipulate the object
    const orderCopy = JSON.parse(JSON.stringify(order));

    // 2. Check if the ordered product has a matching listing in the listings DB table
    if (orderCopy.matched_listing_store_id !== null) {
      console.log(`${order.order_number} has a matching listing store_id ${orderCopy.matched_listing_store_id}`);

      // 2.1 Get the matching listing from the DB
      let matchingListing = await global.knex('tbl_listings')
      .where({ store_id: orderCopy.matched_listing_store_id})
      .then(rows => rows)
      .catch(e => global.appLog.error(`${e} - AmazonAutoorder._prepareProductOrderObject - line 1495`));

      // 2.2 If there is a matching listing
      if (matchingListing.length > 0) {
        console.log(`${order.order_number} matching listing exists in DB`);

        matchingListing = matchingListing[0];

        // 2.2.1 Set the source product buying price and availability and indicate the full automation
        orderCopy.buy_for = matchingListing.new_price;
        orderCopy.product_availability = matchingListing.product_availability;
        orderCopy.auto = true;

        // 2.2.2 Check which Amazon domain the matched source product is relevant to
        if (matchingListing.supplier_url.toLowerCase().includes('amazon.com')) {

          console.log(`${order.order_number} is to be ordered from amazon.com`);

          // 2.2.2.1 Now we need to check if there is a default US Amazon account to be used to order
          let defaultUSAmazonAccount = null;

          // 2.2.2.2 Check the Dalio account settings to find out if a default order account is chosen for the US
          if (Object.keys(accountSettings.autoorder.amazon.us_order_info.account).length > 0) {
            if (accountSettings.autoorder.amazon.us_order_info.account.account !== undefined && accountSettings.autoorder.amazon.us_order_info.account.email !== undefined) {
              // 2.2.2.2.1 If a default account is chosen by the user -> get it from the DB
              defaultUSAmazonAccount = await global.knex('tbl_users')
              .where({
                account: accountSettings.autoorder.amazon.us_order_info.account.account,
                email: accountSettings.autoorder.amazon.us_order_info.account.email
              })
              .first()
              .then(row => row)
              .catch(error => global.appLog.error(`${error} - AmazonAutoorder._prepareProductOrderObject - line 1521`));

              console.log(`${order.order_number} has a default US account.`);

              // 2.2.2.2.2 If the default account cannot be found in the DB -> try to get the first available
              if (defaultUSAmazonAccount === null) {
                console.log(`${order.order_number} has a default US account but anyways getting the first account`);

                defaultUSAmazonAccount = await global.knex('tbl_users')
                .where({ account: 'autoorder_amazon_us' })
                .first()
                .then(row => row)
                .catch(error => global.appLog.error(`${error} - AmazonAutoorder._prepareProductOrderObject - line 1536`));

                // 2.2.2.2.2.1 If there is no US account at all -> return an error
                if (defaultUSAmazonAccount === null) {
                  return {
                    status: 'no-amazon-us-account',
                    message: `Cannot fulfill order ${orderCopy.order_number} as the there is no Amazon US buyer account.`
                  }
                }
              } 

              // 2.2.2.2.3 If there is an Amazon US account -> add it to the order object
              orderCopy.order_with_account = JSON.parse(JSON.stringify(defaultUSAmazonAccount));
            }
          } else {
            console.log(`${order.order_number} getting the first US account`);

            // 2.2.2.3 If there is no default account chosen by the user -> get the first US account
            defaultUSAmazonAccount = await global.knex('tbl_users')
              .where({ account: 'autoorder_amazon_us' })
              .first()
              .then(row => row)
              .catch(error => global.appLog.error(`${error} - AmazonAutoorder._prepareProductOrderObject - line 1535`));

              // 2.2.2.4 There is no such account -> return error
              if (defaultUSAmazonAccount === null) {
                return {
                  status: 'no-amazon-us-account',
                  message: `Cannot fulfill order ${orderCopy.order_number} as the there is no Amazon US buyer account.`
                }
              }

              // 2.2.2.5 If there is an Amazon US account -> add it to the order object
              orderCopy.order_with_account = JSON.parse(JSON.stringify(defaultUSAmazonAccount));
          }

          // 2.2.2.6 Parse the settings of the Amazon US account
          const defaultUSAmazonAccountSettings = JSON.parse(defaultUSAmazonAccount.settings);

          // 2.2.2.7 Check what the payment method for the US account is (if there is one set)
          const { payment_method } = accountSettings.autoorder.amazon.us_order_info;

          // 2.2.2.8 If a payment method is set -> check what it is
          if (payment_method !== '') {
            // 2.2.2.8.1 If it is a credit card
            if (payment_method === 'credit-card') {
              console.log(`${order.order_number} has a default payment method - CREDIT CARD`);
              console.log(`${order.order_number} credit card index - ${accountSettings.autoorder.amazon.us_order_info.credit_card_index}`);

              // 2.2.2.8.1.1 Check if the user selected a specific credit card
              if (accountSettings.autoorder.amazon.us_order_info.credit_card_index !== undefined) {
                console.log(`${order.order_number} has a default payment method - CREDIT CARD - credit card index is chosen`);
                const { credit_card_index } = accountSettings.autoorder.amazon.us_order_info;
                // 2.2.2.8.1.1.1 If the chosen index exists in the credit cards` array -> get the credit card info
                if (credit_card_index <= defaultUSAmazonAccountSettings.payment_methods.credit_cards.length) {
                  orderCopy.pay_with = {
                    type: 'credit-card',
                    credit_card: defaultUSAmazonAccountSettings.payment_methods.credit_cards[credit_card_index]
                  }
                } else {
                  console.log(`${order.order_number} has a default payment method - CREDIT CARD - credit card index is chosen but there is no such credit card in the array`);

                  // 2.2.2.8.1.1.2 No such index in the credit cards array -> get the first credit card
                  if (defaultUSAmazonAccountSettings.payment_methods.credit_cards.length > 0) {
                    orderCopy.pay_with = {
                      type: 'credit-card',
                      credit_card: defaultUSAmazonAccountSettings.payment_methods.credit_cards[0]
                    };
                  } else {
                    // return error, no credit card at all
                    return {
                      id: orderCopy.id,
                      error: true,
                      status: 'no-credit-card-available',
                      message: `Cannot fulfill order ${orderCopy.order_number} as there is no credit card set for the Amazon US account - ${defaultUSAmazonAccount.email}.`
                    }
                  }
                }
              } else {
                console.log(`${order.order_number} has a default payment method - CREDIT CARD - no credit card index is chosen.`);

                // 2.2.2.8.1.2 There is no credit card index set, so try to get the first credit card
                if (defaultUSAmazonAccountSettings.payment_methods.credit_cards.length > 0) {
                  orderCopy.pay_with = {
                    type: 'credit-card',
                    credit_card: defaultUSAmazonAccountSettings.payment_methods.credit_cards[0]
                  };
                } else {
                  // return error, no credit card at all
                  return {
                    id: orderCopy.id,
                    error: true,
                    status: 'no-credit-card-available',
                    message: `Cannot fulfill order ${orderCopy.order_number} as there is no credit card set for the Amazon US account - ${defaultUSAmazonAccount.email}.`
                  }
                }
              }
            } else if (payment_method === 'gift-card-balance') {
              console.log(`${order.order_number} has a default payment method - GIFT CARD BALANCE`);

              // 2.2.2.8.2 If it is gift card balance, determine if the gift card balance is enough to cover the order
              const currentGiftCardBalance = parseFloat(defaultUSAmazonAccountSettings.payment_methods.gift_card_balance);
              const currentBuyPrice = parseFloat(orderCopy.buy_for);

              if (!isNaN(currentBuyPrice) && !isNaN(currentGiftCardBalance)) {
                if (currentGiftCardBalance >= currentBuyPrice) {
                  console.log(`${order.order_number} has a default payment method - GIFT CARD BALANCE - balance is sufficient`);

                  orderCopy.pay_with = {
                    type: 'gift-card-balance',
                    balance: currentGiftCardBalance
                  }
                } else {
                  // return an error -> not enough balance
                  return {
                    id: orderCopy.id,
                    error: true,
                    status: 'not-enough-gift-card-balance',
                    message: `Cannot fulfill order ${orderCopy.order_number} as the gift card balance is not enough.`
                  }
                }
              }  
            }
          } else {
            console.log(`${order.order_number} has NO default payment method`);

            // 2.2.2.9 If a default payment method is not set -> default payment method should be credit card, if present, otherwise gift card balance if enough
            if (defaultUSAmazonAccountSettings.payment_methods.credit_cards.length > 0) {
              console.log(`${order.order_number} has NO default payment method - getting the first credit card`);

              orderCopy.pay_with = {
                type: 'credit-card',
                credit_card: defaultUSAmazonAccountSettings.payment_methods.credit_cards[0]
              };
            } else {
              const currentGiftCardBalance = parseFloat(defaultUSAmazonAccountSettings.payment_methods.gift_card_balance);
              const currentBuyPrice = parseFloat(orderCopy.buy_for);
              if (!isNaN(currentGiftCardBalance) && !isNaN(currentBuyPrice)) {
                if (currentGiftCardBalance >= currentBuyPrice) {
                  orderCopy.pay_with = {
                    type: 'gift-card-balance',
                    balance: currentGiftCardBalance
                  }
                }
              }
            }
          }
        } else if (matchingListing.supplier_url.toLowerCase().includes('amazon.co.uk')) {

          console.log(`${order.order_number} is to be ordered from amazon.co.uk`);

          // 2.2.2.1 Now we need to check if there is a default UK Amazon account to be used to order
          let defaultUKAmazonAccount = null;

          // 2.2.2.2 Check the Dalio account settings to find out if a default order account is chosen for the UK
          if (Object.keys(accountSettings.autoorder.amazon.uk_order_info.account).length > 0) {
            if (accountSettings.autoorder.amazon.uk_order_info.account.account !== undefined && accountSettings.autoorder.amazon.uk_order_info.account.email !== undefined) {
              // 2.2.2.2.1 If a default account is chosen by the user -> get it from the DB
              defaultUKAmazonAccount = await global.knex('tbl_users')
              .where({
                account: accountSettings.autoorder.amazon.uk_order_info.account.account,
                email: accountSettings.autoorder.amazon.uk_order_info.account.email
              })
              .first()
              .then(row => row)
              .catch(error => global.appLog.error(`${error} - AmazonAutoorder._prepareProductOrderObject - line 1845`));

              console.log(`${order.order_number} has a default UK account.`);

              // 2.2.2.2.2 If the default account cannot be found in the DB -> try to get the first available
              if (defaultUKAmazonAccount === null) {
                console.log(`${order.order_number} has a default UK account but anyways getting the first account`);

                defaultUKAmazonAccount = await global.knex('tbl_users')
                .where({ account: 'autoorder_amazon_uk' })
                .first()
                .then(row => row)
                .catch(error => global.appLog.error(`${error} - AmazonAutoorder._prepareProductOrderObject - line 1857`));

                // 2.2.2.2.2.1 If there is no US account at all -> return an error
                if (defaultUKAmazonAccount === null) {
                  return {
                    status: 'no-amazon-uk-account',
                    message: `Cannot fulfill order ${orderCopy.order_number} as the there is no Amazon UK buyer account.`
                  }
                }
              } 

              // 2.2.2.2.3 If there is an Amazon UK account -> add it to the order object
              orderCopy.order_with_account = JSON.parse(JSON.stringify(defaultUKAmazonAccount));
            }
          } else {
            console.log(`${order.order_number} getting the first UK account`);

            // 2.2.2.3 If there is no default account chosen by the user -> get the first UK account
            defaultUKAmazonAccount = await global.knex('tbl_users')
              .where({ account: 'autoorder_amazon_uk' })
              .first()
              .then(row => row)
              .catch(error => global.appLog.error(`${error} - AmazonAutoorder._prepareProductOrderObject - line 1879`));

              // 2.2.2.4 There is no such account -> return error
              if (defaultUKAmazonAccount === null) {
                return {
                  status: 'no-amazon-uk-account',
                  message: `Cannot fulfill order ${orderCopy.order_number} as the there is no Amazon UK buyer account.`
                }
              }

              // 2.2.2.5 If there is an Amazon UK account -> add it to the order object
              orderCopy.order_with_account = JSON.parse(JSON.stringify(defaultUKAmazonAccount));
          }

          // 2.2.2.6 Parse the settings of the Amazon UK account
          const defaultUKAmazonAccountSettings = JSON.parse(defaultUKAmazonAccount.settings);

          // 2.2.2.7 Check what the payment method for the UK account is (if there is one set)
          const { payment_method } = accountSettings.autoorder.amazon.uk_order_info;

          // 2.2.2.8 If a payment method is set -> check what it is
          if (payment_method !== '') {
            // 2.2.2.8.1 If it is a credit card
            if (payment_method === 'credit-card') {
              console.log(`${order.order_number} has a default payment method - CREDIT CARD`);
              console.log(`${order.order_number} credit card index - ${accountSettings.autoorder.amazon.uk_order_info.credit_card_index}`);

              // 2.2.2.8.1.1 Check if the user selected a specific credit card
              if (accountSettings.autoorder.amazon.uk_order_info.credit_card_index !== undefined) {
                console.log(`${order.order_number} has a default payment method - CREDIT CARD - credit card index is chosen`);
                const { credit_card_index } = accountSettings.autoorder.amazon.uk_order_info;
                // 2.2.2.8.1.1.1 If the chosen index exists in the credit cards` array -> get the credit card info
                if (credit_card_index <= defaultUKAmazonAccountSettings.payment_methods.credit_cards.length) {
                  orderCopy.pay_with = {
                    type: 'credit-card',
                    credit_card: defaultUKAmazonAccountSettings.payment_methods.credit_cards[credit_card_index]
                  }
                } else {
                  console.log(`${order.order_number} has a default payment method - CREDIT CARD - credit card index is chosen but there is no such credit card in the array`);

                  // 2.2.2.8.1.1.2 No such index in the credit cards array -> get the first credit card
                  if (defaultUKAmazonAccountSettings.payment_methods.credit_cards.length > 0) {
                    orderCopy.pay_with = {
                      type: 'credit-card',
                      credit_card: defaultUKAmazonAccountSettings.payment_methods.credit_cards[0]
                    };
                  } else {
                    // return error, no credit card at all
                    return {
                      id: orderCopy.id,
                      error: true,
                      status: 'no-credit-card-available',
                      message: `Cannot fulfill order ${orderCopy.order_number} as there is no credit card set for the Amazon UK account - ${defaultUKAmazonAccount.email}.`
                    }
                  }
                }
              } else {
                console.log(`${order.order_number} has a default payment method - CREDIT CARD - no credit card index is chosen.`);

                // 2.2.2.8.1.2 There is no credit card index set, so try to get the first credit card
                if (defaultUKAmazonAccountSettings.payment_methods.credit_cards.length > 0) {
                  orderCopy.pay_with = {
                    type: 'credit-card',
                    credit_card: defaultUKAmazonAccountSettings.payment_methods.credit_cards[0]
                  };
                } else {
                  // return error, no credit card at all
                  return {
                    id: orderCopy.id,
                    error: true,
                    status: 'no-credit-card-available',
                    message: `Cannot fulfill order ${orderCopy.order_number} as there is no credit card set for the Amazon US account - ${defaultUKAmazonAccount.email}.`
                  }
                }
              }
            } else if (payment_method === 'gift-card-balance') {
              console.log(`${order.order_number} has a default payment method - GIFT CARD BALANCE`);

              // 2.2.2.8.2 If it is gift card balance, determine if the gift card balance is enough to cover the order
              const currentGiftCardBalance = parseFloat(defaultUKAmazonAccountSettings.payment_methods.gift_card_balance);
              const currentBuyPrice = parseFloat(orderCopy.buy_for);

              if (!isNaN(currentBuyPrice) && !isNaN(currentGiftCardBalance)) {
                if (currentGiftCardBalance >= currentBuyPrice) {
                  console.log(`${order.order_number} has a default payment method - GIFT CARD BALANCE - balance is sufficient`);

                  orderCopy.pay_with = {
                    type: 'gift-card-balance',
                    balance: currentGiftCardBalance
                  }
                } else {
                  // return an error -> not enough balance
                  return {
                    id: orderCopy.id,
                    error: true,
                    status: 'not-enough-gift-card-balance',
                    message: `Cannot fulfill order ${orderCopy.order_number} as the gift card balance is not enough.`
                  }
                }
              }  
            }
          } else {
            console.log(`${order.order_number} has NO default payment method`);

            // 2.2.2.9 If a default payment method is not set -> default payment method should be credit card, if present, otherwise gift card balance if enough
            if (defaultUKAmazonAccountSettings.payment_methods.credit_cards.length > 0) {
              console.log(`${order.order_number} has NO default payment method - getting the first credit card`);

              orderCopy.pay_with = {
                type: 'credit-card',
                credit_card: defaultUKAmazonAccountSettings.payment_methods.credit_cards[0]
              };
            } else {
              const currentGiftCardBalance = parseFloat(defaultUKAmazonAccountSettings.payment_methods.gift_card_balance);
              const currentBuyPrice = parseFloat(orderCopy.buy_for);
              if (!isNaN(currentGiftCardBalance) && !isNaN(currentBuyPrice)) {
                if (currentGiftCardBalance >= currentBuyPrice) {
                  orderCopy.pay_with = {
                    type: 'gift-card-balance',
                    balance: currentGiftCardBalance
                  }
                }
              }
            }
          }
        } else {
          return {
            id: orderCopy.id,
            error: true,
            status: 'no-matching-supplier-domain',
            message: `Cannot fulfill order ${orderCopy.order_number} as the matched source product is not supplied via a supported Amazon domain.`
          }
        }

        // If everything is fine -> return the built order object
        return orderCopy;
      } else {
        // 2.3 log an error that there is no matching listing or do not return anything
        return {
          id: orderCopy.id,
          error: true,
          status: 'no-matching-listing',
          message: `Cannot fulfill order ${orderCopy.order_number} as you have not added a matching source product.`
        }
      }
    } else {
      // 3. Log an error that there is no matching listing or do not return anything
      return {
        id: orderCopy.id,
        error: true,
        status: 'no-matching-listing',
        message: `Cannot fulfill order ${orderCopy.order_number} as you have not added a matching source product.`
      }
    }
  }

   /*
  * Called in canLogIn()
  */
  _getAutoorderAccountsFromDB = async (): Promise<AmazonAutoorderAccountsType> => {
    const amazonAutoorderAccounts: AmazonAutoorderAccountsType = {
      US: [],
      UK: [],
    };

    // Check the DB for Amazon US login accounts 
    amazonAutoorderAccounts.US = await global.knex('tbl_users')
    .where({ account: 'autoorder_amazon_us' })
    .then((rows: Array<Account | any>) => {
      if (rows.length > 0) {
        return rows;
      }
      return [];
    });

    // Check the DB for Amazon UK login accounts 
    amazonAutoorderAccounts.UK = await global.knex('tbl_users')
    .where({ account: 'autoorder_amazon_uk' })
    .then((rows: Array<Account | any>) => {
      if (rows.length > 0) {
        return rows;
      }
      return [];
    });

    return amazonAutoorderAccounts;
  }

  /*
  * Called in checkPaymentMethods()
  */
  _scrapePaymentMethods = async (account: Account): Promise<any> => {
    try {
      this.checkPaymentMethodsBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        slowMo: 100,
        devtools: false,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--disable-webgl'
        ],
      });
  
      const page = await this.checkPaymentMethodsBrowser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setDefaultNavigationTimeout(0);
  
      if (global.proxyUsername !== '' && global.proxyPassword !== '') {
        await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
      }
    
      if (account.country === 'US' && account.has_cookie_file && account.has_valid_cookies) {
        await page.setCookie(...account.cookies_content);
        await page.goto('https://www.amazon.com/cpe/managepaymentmethods', { waitUntil: 'networkidle0' });
      } else if (account.country === 'UK' && account.has_cookie_file && account.has_valid_cookies) {
        await page.setCookie(...account.cookies_content);
        await page.goto('https://www.amazon.co.uk/cpe/managepaymentmethods', { waitUntil: 'networkidle0' });
      } else {
        await this.checkPaymentMethodsBrowser.close();
        return false;
      }
      
      // Check if login with password only is necessary -> do it
      // await this._loginWithPasswordOnlyAutoorder(page, account);
      await this._loginWithPasswordOnly(page, account.country);

      const needsToLoginAgain: boolean = await page.evaluate(() => {
        if (document.querySelector('.cvf-widget-form.cvf-widget-form-account-switcher a') !== null) {
          return true;
        }

        return false;
      });

      if (needsToLoginAgain) {
        const log: string = `Amazon account ${account.country} ${account.email} has to be logged in again.`;
        await global.log.error(encodeURI(log));

        await this.logOut(account);

        const error: ErrorType = {
          status: 'error',
          message: log
        };

        throw error.message;
      }
  
      const giftCardBalance: string = await page.evaluate((): string => {
        const giftCardBalanceSelector = document.querySelector('.pmts-portal-mpo-gc-balance');
        let giftCardBalance: string = '';

        if (giftCardBalanceSelector !== null) {
          // Extract the gift card balance from the selector with regex
          giftCardBalance = giftCardBalanceSelector.textContent.match(/[\d\.\,]+/g);
        }
        // If the regex matches a gift card balance number -> return it straight away
        if (giftCardBalance !== null && giftCardBalance !== '') {
          return giftCardBalance[0];
        }
  
        // The regex would not have matched and will return null or ''
        return giftCardBalance;
      });
  
      const creditCardsArray: Array<CrediCardObjectType> = await page.evaluate(() => {
        const cardsArray = [];

        // Get the data for all credit cards
        const creditCardDisplayNameSelectors = document.querySelectorAll('.pmts-instrument-display-name');
        const creditCardNumberTailSelectors = document.querySelectorAll('.pmts-instrument-number-tail');
        const creditCardExpiryDateSelectors = document.querySelectorAll('.pmts-account-expiry-date');
  
        // If there are any credit cards on the page
        if (creditCardDisplayNameSelectors.length > 0) {

          // Iterate through all of them
          for (let i = 0; i < creditCardDisplayNameSelectors.length; i++) {
            // Build an object with all the necessary info and add it to the array
            const creditCardObject = {};

            if (creditCardDisplayNameSelectors[i] !== null) {
              creditCardObject.display_name = creditCardDisplayNameSelectors[i].textContent;
            }
      
            if (creditCardNumberTailSelectors[i] !== null) {
              creditCardObject.number_tail = creditCardNumberTailSelectors[i].textContent;
            }
      
            if (creditCardExpiryDateSelectors[i] !== null) {
              creditCardObject.expiry_date = creditCardExpiryDateSelectors[i].textContent;
            }

            creditCardObject.card_number = '';

            if (creditCardObject.display_name !== undefined) {
              cardsArray.push(creditCardObject);
            }
          }
        }
        
  
        return cardsArray;
      });

      // console.log('creditCardsArray', creditCardsArray);

      global.knex('tbl_users')
      .where({ id: account.id })
      .first()
      .then((row: Account | void) => {
        if (row !== undefined) {
          let settings = {};
          
          // If the DB account entry already has settings field -> copy them to the settings object
          if (row.settings !== null && row.settings !== '') {
            settings = JSON.parse(row.settings);
          } else {
            // Else create a starting value for the object
            settings = {
              payment_methods: {
                gift_card_balance: '',
                credit_cards: [] 
              }
            }
          }
          
          // If there is a valid gift card balance returned from the puppeteer run -> update the settings variable
          if (giftCardBalance !== null && giftCardBalance !== '') {
            settings.payment_methods.gift_card_balance = giftCardBalance;
          }

          // Check if there are any credit cards returned from the puppeteer run
          if (creditCardsArray.length > 0) {
            let creditCardAlreadyInDB = false;
            // Iterate through all of them
            for (let i = 0; i < creditCardsArray.length; i++) {
              // Iterate through the settings object to see if any of the retrieved cards overlaps with one already retrieved and in the DB
              if (settings.payment_methods.credit_cards.length > 0) {
                for ( let c = 0; c < settings.payment_methods.credit_cards.length; c++) {
                  if (
                    creditCardsArray[i].display_name === settings.payment_methods.credit_cards[c].display_name &&
                    creditCardsArray[i].number_tail === settings.payment_methods.credit_cards[c].number_tail &&
                    creditCardsArray[i].expiry_date === settings.payment_methods.credit_cards[c].expiry_date
                    ) {
                      creditCardAlreadyInDB = true;
                      settings.payment_methods.credit_cards[c].display_name = creditCardsArray[i].display_name;
                      settings.payment_methods.credit_cards[c].number_tail = creditCardsArray[i].number_tail;
                      settings.payment_methods.credit_cards[c].expiry_date = creditCardsArray[i].expiry_date;
                    }
                }

                // If the credit cards is not already in the DB -> add it
                if (!creditCardAlreadyInDB) {
                  settings.payment_methods.credit_cards.push(creditCardsArray[i]);
                }
              } else {
                // There are no credit cards saved in the DB -> add them one by one
                settings.payment_methods.credit_cards.push(creditCardsArray[i]);
              }
            }
          }
  
          settings = JSON.stringify(settings);
  
          // If the updated object is different from the one pulled from the DB -> update the DB
          if (settings !== row.settings) {
            global.knex('tbl_users')
            .where({ id: account.id })
            .update({ settings: settings })
            .catch(error => global.appLog.error(`${error} - in Amazon.checkPaymentMethods() - line 2437`));
          }
        }
      })
      .catch((error) => global.appLog.error(`${error} in AmazonAutoorder._scrapePaymentMethods - line 1675`));
    
      await this.writeCookieFile(page, account);
      await this.checkPaymentMethodsBrowser.close();
      return true;
    } catch (error) {
      global.appLog.error(`${error} in amazon.checkPaymentMethods - line 2348`);
      this.checkPaymentMethodsBrowser.close();
    }
  }

  /*
  * Called in _scrapePaymentMethods()
  */
  _loginWithPasswordOnlyAutoorder = async (page, account) => {
    // Check if the user has been logged out and only requires the password to be entered
    const clickToSignIntoAccount = await page.evaluate(() => {
        // If Amazon wants password only -> return true
        if (document.querySelector('.cvf-widget-form cvf-widget-form-account-switcher a') !== null) {
          return document.querySelectorAll('.cvf-widget-form.cvf-widget-form-account-switcher')[1];
        }

        return false;
      }).catch(error => global.appLog.error(`${error} - inside amazonAutoorder.loginWithPasswordOnlyAutoorder - line 3167`));

    // Check if 'Amazon' requires password-only verification
    if (clickToSignIntoAccount) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        clickToSignIntoAccount.click()
      ]);

      const passwordToType = await account.password.toString();
      // Type the password in the input field with a delay as if it was a human
      await page.type('#ap_password', passwordToType, { delay: 100 });

      // Check if the 'Remember me' checkbox is checked -> if not then check it
      await page.evaluate(() => {
          if (document.querySelector('input[name=rememberMe]') !== null) {
            const rememberMeCheckbox = document.querySelector('input[name=rememberMe]');
            if (!rememberMeCheckbox.hasAttribute('checked')) {
              rememberMeCheckbox.click();
            }
          }
        }).catch(error => global.appLog.error(`${error} - inside amazonAutoorder.loginWithPasswordOnly - line 1304`));

      // Click the 'Sign in' button
      await page.click('#signInSubmit');

      // Wait for the load to completely finish
      await page.waitFor(3000);

      // Sometimes Amazon shows an account fix-up form which prompts to enter a phone number
      const promptsToEnterPhoneNumber = await page.$('#auth-account-fixup-phone-form');

      // If Amazon prompts to enter a phone number
      if (promptsToEnterPhoneNumber !== null) {
        await page.click('#ap-account-fixup-phone-skip-link');
      }

      await page.waitForSelector('#nav-link-accountList', { timeout: 120000 });
      await page.hover('#nav-link-accountList');
      await page.waitForSelector('#nav-item-signout');
    }
  };

  /*
  * Called in orderProduct()
  */
  _loginWithPasswordOnly = async (page: Object, marketplace: 'US' | 'UK'): Promise<any> => {
  
    // Check if the user has been logged out and only requires the password to be entered
    const requiresOnlyPassword: boolean = await page.evaluate((): Promise<boolean> => {
      let pass: boolean = false;

      // If Amazon wants password only -> return true
      if (document.querySelector('#ap-credential-autofill-hint') !== null) {
        pass = true;
      }
      return Promise.resolve(pass);
    }).catch(error => global.appLog.error(`${error} - inside amazonAutoorder.loginWithPasswordOnly - line 1647`));
  
    
    // If 'Amazon' requires password-only verification
    if (requiresOnlyPassword) {
      let marketplace_account: string = '';
  
      if (marketplace === 'US') {
        marketplace_account = 'autoorder_amazon_us';
      } else if (marketplace === 'CA') {
        marketplace_account = 'autoorder_amazon_ca'; 
      } else if (marketplace === 'UK') {
        marketplace_account = 'autoorder_amazon_uk'; 
      } else if (marketplace === 'DE') {
        marketplace_account = 'autoorder_amazon_de';
      } else if (marketplace === 'FR') {
        marketplace_account = 'autoorder_amazon_fr';
      } else if (marketplace === 'IT') {
        marketplace_account = 'autoorder_amazon_it';
      } else if (marketplace === 'ES') {
        marketplace_account = 'autoorder_amazon_es';
      }

      // Run a DB query that gets the required 'Amazon' password and assign it to the 'passwordToInput' variable
     const passwordToInput: string | null = await global.knex('tbl_users')
      .where({ account: marketplace_account })
      .first()
      .then((row: Account | null) => {
        if (row !== null) {
          return row.password;
        }

        return null;
      })
      .catch(error => global.appLog.error(`${error} - inside amazonAutoorder.loginWithPasswordOnly - line 1285`));
  
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
      }).catch(error => global.appLog.error(`${error} - inside amazonAutoorder.loginWithPasswordOnly - line 1158`));
  
      
      // Click the 'Sign in' button
      await page.click('#signInSubmit');
  
      // Wait for the load to completely finish
      await page.waitFor(3000);

      // Check for an image captcha
      const captchaInput = await page.$('input#auth-captcha-guess');
      if (captchaInput !== null) {
        // If it appears -> get the image url
        const captchaImageURL = await page.evaluate(() => {
          const captchaImageSelector = document.querySelector('img#auth-captcha-image');
          return captchaImageSelector.getAttribute('src');
        });
    
        // Send the image to 2Captcha
        const captchaResponse = await this.client.decode({ url: captchaImageURL }).then((response) => response);
    
        // If the response is NOT OK -> reload the page (the captcha will disappear)
        if (captchaResponse !== undefined) {
          if (captchaResponse._apiResponse !== null && captchaResponse._apiResponse !== undefined) {
            if (!captchaResponse._apiResponse.includes('OK')) {
              await this.orderBrowser.close();

              const errorLog: string = 'Order could not be finished. Please contact an administrator';
              await global.appLog.error(errorLog);

              const error: ErrorType = {
                status: 'error',
                message: errorLog
              };

              throw error.message;
            } else {

              await page.type('#ap_password', passwordToInput.toString(), { delay: 100 });

              // If it is okay -> type the result and click the 'Continue shopping' button
              await page.type('input#auth-captcha-guess', captchaResponse._text.toString(), { delay: 100 });
  
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click('#signInSubmit')
              ]);
            }
          }
        }
      }
  
      // Sometimes Amazon shows an account fix-up form which prompts to enter a phone number
      const promptsToEnterPhoneNumber = await page.$('#auth-account-fixup-phone-form');
  
      // If Amazon prompts to enter a phone number
      if (promptsToEnterPhoneNumber !== null) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          page.click('#ap-account-fixup-phone-skip-link')
        ]);
      }
    }
  }

  /*
  * Called in orderProduct()
  */
  _clearCart = async page => {

    let cartCount = await page.$eval('#nav-cart-count', e => e.innerText);
    console.log('items in cart 1: ', cartCount);
    if (cartCount > 0) {
      await page.waitForSelector('a#nav-cart', { timeout: 60000 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('a#nav-cart')
      ]);
    
      while(cartCount > 0) {
          await page.evaluate(() => {
            const element = document.querySelector('input[name^="submit.delete."]');
            element.click();
          });
    
          await page.waitFor(1000);
    
          cartCount = await page.$eval('#nav-cart-count', e => e.innerText);
      }
    
      console.log('items in cart: ', cartCount);
    } else {
      console.log('cart empty');
    }
   
      
    return true;
  }

   /*
  * Called in orderProduct()
  * Before ordering a product, check its availability
  */
  _checkProductsAvailability = async page => {
    const availabilityText = await page.evaluate(() => {
      const availabilitySelector = document.querySelector('div#availability > span');

      if (availabilitySelector !== null) {
        return availabilitySelector.textContent;
      }

      return null;
    });

    // Problem with the product itself -> prompt the user to investigate further
    if (availabilityText === null) {
      return availabilityText;
    }

    let productAvailability = '0';

    // Sometimes it says that the product ships within... (users requested to make sure that if a product ships later than 4 days, it is out of stock)
    let shipsWithinDaysRegX = availabilityText.match(/Usually ships within (\d+) to (\d+) days/);
    if (shipsWithinDaysRegX == null) {
      // Available to ship in 1-2 days.
      shipsWithinDaysRegX = availabilityText.match(/Available to ship in (\d+)-(\d+) days/);
    }

    let shipsWithinWeeksRegX = availabilityText.match(/Usually ships within (\d+) to (\d+) weeks/);
    if (shipsWithinWeeksRegX == null) {
      shipsWithinWeeksRegX = availabilityText.match(/Available to ship in (\d+)-(\d+) weeks/);
    }

    let shipsWithinMonthsRegX = availabilityText.match(/Usually ships within (\d+) to (\d+) months/);
    if (shipsWithinMonthsRegX == null) {
      shipsWithinMonthsRegX = availabilityText.match(/Available to ship in (\d+)-(\d+) months/);
    }

    const onlyCertainAmountAvailable = availabilityText.match(/Only (\d+) left in stock/);

    if (availabilityText.toLowerCase().includes('in stock.')) {
      console.log('product IS IN STOCK');
      // The product is in stock -> we can get the product availability number
      productAvailability = await page.evaluate(() => {
        let productAvailability = 'IN_STOCK';
        let availabilitySelector = document.querySelector('select#quantity');
        if (availabilitySelector !== null) {
          availabilitySelector = document.querySelectorAll('select#quantity option');
          productAvailability = availabilitySelector.length;
        }

        return productAvailability;
      });

    } else if (onlyCertainAmountAvailable !== null) {
      // There is some left
      productAvailability = onlyCertainAmountAvailable[1];
    } else if (shipsWithinDaysRegX !== null) {
      productAvailability = 'IN_STOCK';
      const firstDayDigit = parseInt(shipsWithinDaysRegX[1]);
      const secondDayDigit = parseInt(shipsWithinDaysRegX[2]);

      if (firstDayDigit > 4) {
        productAvailability = '0';
      } else {
        productAvailability = await page.evaluate(() => {
          let productAvailability = 'IN_STOCK';
          let availabilitySelector = document.querySelector('select#quantity');
          if (availabilitySelector !== null) {
            availabilitySelector = document.querySelectorAll('select#quantity option');
            productAvailability = availabilitySelector.length;
          }

          return productAvailability;
        });
      }

    } else if (shipsWithinWeeksRegX !== null) {
      productAvailability = '0';
    } else if (shipsWithinMonthsRegX !== null) {
      productAvailability = '0';
    } else {
      productAvailability = '0'
    }

    console.log('ABOUT TO RETURN PRODUCT AVAILABILITY: ', productAvailability);
    return productAvailability;
  }

  _checkForMultipleSellerOffers = async page => {
    const seeAllBuyingOptionsButton = await page.$('#buybox-see-all-buying-choices-announce');
    const availableFromTheseSellers = await page.$('div#availability_feature_div div#availability span a');
    // If the 'available from these sellers' link is available -> click it
    if (availableFromTheseSellers !== null || seeAllBuyingOptionsButton !== null) {
      if (seeAllBuyingOptionsButton !== null) {
        await seeAllBuyingOptionsButton.click();
        await page.waitFor(8000);

        // Disable next line for the moment as sometimes Amazon redirects to a page where the old layout is shown
        // await page.waitForSelector('#aod-offer-list');
      } else {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          availableFromTheseSellers.click()
        ]);
      }
    }

    const bestOfferFound = await this._getBestOfferFromMultipleSellers(page);
    return bestOfferFound;

  }

  _getBestOfferFromMultipleSellers = async page => {
    // 1. Assume that the best offer is null
    let bestOffer = null;

    // 2. Scrape offers from the flyout or all sellers page
    const olpScrapedOffers = await page.evaluate(() => {
      // 2.1 Select the first one (on the top)
      const olpOffers = document.querySelectorAll('div.olpOffer');

      if (olpOffers.length !== 0) {
        const allOlpOffers = [];
        const olpOfferListPricesSelectors = document.querySelectorAll('div.olpOffer > div.olpPriceColumn > span.olpOfferPrice');
        const olpShippingCharge = document.querySelectorAll('div.olpOffer > div.olpPriceColumn > p.olpShippingInfo > span');
        const conditionSelectors = document.querySelectorAll('div.olpOffer .olpCondition');
        const deliveryMessageSelectors = document.querySelectorAll('div.olpOffer .olpAvailabilityExpander');

        if (olpOfferListPricesSelectors.length > 0) {
          for (let i = 0; i < olpOfferListPricesSelectors.length; i++) {
            // Build an object with the necessary information which has to be added to the array of all offers
            const singleOfferObject = {
              price_content: olpOfferListPricesSelectors[i].textContent,
              ship_charge_content: olpShippingCharge[i].textContent,
              condition_content: conditionSelectors[i].textContent,
              delivery_content: deliveryMessageSelectors[i] !== undefined ? deliveryMessageSelectors[i].textContent : '',
              add_to_cart_button_selectors: 'div.olpOffer .olpBuyColumn input[type="submit"]',
              add_to_cart_button_number: i
            }

            // 4.6.2 Push the offer object to the array with all offers
            allOlpOffers.push(singleOfferObject);
          }

          return allOlpOffers;
        }
      }

      // 2.3 Return null if no offer is found
      return null;
    });
    
    // 3. If the aod offer list is present -> scrape the offers from there
    const aodScrapedOffers = await page.evaluate(() => {
      // 4.1 In the new version -> there is a list of sellers in a modal flyout on the right -> check for the existence of the whole list
      const aodOfferList = document.querySelector('#aod-offer-list');

      if (aodOfferList !== null) {
        // 4.2 This is a new layout -> a list of sellers flies out from the right (new version)
        const allAodOffers = [];
        // 4.3 Get all the offers` price selectors and shipping charge selectors
        const aodOfferListPricesSelectors = document.querySelectorAll('#aod-offer-list .aod-information-block #aod-offer-price .a-price .a-offscreen');

        const aodShippingCharge = document.querySelectorAll('#aod-offer-list .aod-ship-charge');

        // 4.4 Get all of the condition selectors (if contains 'used' do not bother any longer)
        const conditionSelectors = document.querySelectorAll('#aod-offer-list #aod-offer-heading');

        // 4.5 Get all the delivery message selectors to make sure that the delivery time is not too far away
        const deliveryMessageSelectors = document.querySelectorAll('#aod-offer-list #delivery-message');

        // 4.6 If there are any price selectors -> iterate through all of them
        if (aodOfferListPricesSelectors.length > 0) {
          for (let i = 0; i < aodOfferListPricesSelectors.length; i++) {
            // 4.6.1 Build an object with the necessary information which has to be added to the array of all offers
            const singleOfferObject = {
              price_content: aodOfferListPricesSelectors[i].textContent,
              ship_charge_content: aodShippingCharge[i].textContent,
              condition_content: conditionSelectors[i].textContent,
              delivery_content: deliveryMessageSelectors[i] !== undefined ? deliveryMessageSelectors[i].textContent : '',
              add_to_cart_button: '#aod-offer-list .aod-information-block #aod-offer-price input[type="submit"]',
              add_to_cart_button_number: i
            }

            // 4.6.2 Push the offer object to the array with all offers
            allAodOffers.push(singleOfferObject);
          }

          return allAodOffers;
        }
      }  

      // 4.7 Return null if no offer had been selected/found at all
      return null;
    });

    // 4. Run through all of the aod offers and pick the best one based on price/condition and delivery time
    if (olpScrapedOffers !== null) {
      bestOffer = await this._extractBestOffer(olpScrapedOffers);
    } else if (aodScrapedOffers !== null) {
      bestOffer = await this._extractBestOffer(aodScrapedOffers);
    }

    console.log('best offer in getBestOfferFromMultipleSellers', bestOffer);

    return bestOffer;
  }

  _extractBestOffer = async offersArray => {
     // Make a deep copy of the array parameter as it will be used to manipulate its data
     const offers = [...offersArray];
     let bestOffer = null;

    // 1 Iterate through all scraped offers -> determine the product`s condition -> determine the product`s total price -> determine the product`s delivery date
    for (let i = 0; i < offers.length; i++) {

      // 1.1 Check what the condition of the product is - new/used
      const productIsUsed = await offers[i].condition_content.toLowerCase().includes('used');
      if (productIsUsed) {
        offers[i].is_new = false;
      } else {
        offers[i].is_new = true;
      }

      // 1.2 Get the product price using regex
      const priceMatch = await offers[i].price_content.match(/[\d\.\,]+/g);
      if (priceMatch !== null) {
        const priceMatchRegexed = priceMatch[0].replace(',','');
        offers[i].price_content_match = await parseFloat(priceMatchRegexed);
      }

      // 1.3 If the shipping price container does NOT include the 'free shipping' text -> extract shipping price using regex
      const containsFreeShippingText = await offers[i].ship_charge_content.toLowerCase().includes('free shipping');
      const containsFreeDeliveryText = await offers[i].ship_charge_content.toLowerCase().includes('free delivery');
      if (!containsFreeShippingText && !containsFreeDeliveryText) {
        const shipChargeMatch = await offers[i].ship_charge_content.match(/[\d\.\,]+/g);
        if (shipChargeMatch !== null) {
          const shipChargeMatchRegexed = shipChargeMatch[0].replace(',','');
          offers[i].ship_charge_content_match = await parseFloat(shipChargeMatchRegexed);
        }
      }

      // 1.4 Calculate total price (incl shipping if present)
      const priceContentMatchIsNotANumber = await isNaN(offers[i].price_content_match);        
      if (!priceContentMatchIsNotANumber) {
        if (offers[i].ship_charge_content_match !== undefined) {
          const shipChargeIsNotANumber = await isNaN(offers[i].ship_charge_content_match);
          if (!shipChargeIsNotANumber) {
            offers[i].total_price = offers[i].price_content_match + offers[i].ship_charge_content_match;
          }
        } else {
          offers[i].total_price = offers[i].price_content_match;
        }
      }

      // 1.5 FIND OUT WHAT IS THE EARLIEST DELIVERY DATE
      const monthsArray = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december'
      ];

      const monthsArrayAlternative = [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'june',
        'july',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec'
      ];

      // 1.6 Match if there is a date
      const dateMatch = await offers[i].delivery_content.match(/\d+/g);
      let monthMatch = -1;
      
      // 5.1.7 Check if there is a month match as well
      for (let m = 0; m < monthsArray.length; m++) {
        const deliveryContentIncludesMonth = await offers[i].delivery_content.toLowerCase().includes(monthsArray[m]);
        if (deliveryContentIncludesMonth) {
          monthMatch = m;
          break;
        }
      }

      // 5.1.7.1 Sometimes the months are not written with their full names (check for shortened versions)
      if (monthMatch === -1) {
        for (let m = 0; m < monthsArrayAlternative.length; m++) {
          const deliveryContentIncludesMonth = await offers[i].delivery_content.toLowerCase().includes(monthsArrayAlternative[m]);
          if (deliveryContentIncludesMonth) {
            monthMatch = m;
            break;
          }
        }
      }

      offers[i].delivery_content = '';
      offers[i].month_match = monthMatch;
      offers[i].date_match = dateMatch;

      // 5.1.8 If there is a month and a date match
      if (monthMatch !== -1 && dateMatch.length > 0) {
        // 5.1.8.1 Get the current time
        const now = await moment();
        const currentYear = await moment().year();

        // 5.1.8.2 Normalize the month by adding 1, as it starts from 0 and should start from 1
        let normalizedMonth = await ++monthMatch;

        // 5.1.8.3 If the normalized month is less than 10 a.k.a before October -> turn it into a 2-digit string (9 -> 09)
        if (normalizedMonth < 10) {
          normalizedMonth = `0${normalizedMonth}`;
        }

        let normalizedDate = parseInt(dateMatch[0]);

        if (normalizedDate < 10) {
          normalizedDate = `0${normalizedDate}`;
        }

        const deliveryDateFormat = `${currentYear}-${normalizedMonth}-${normalizedDate}`;
        const deliveryDate = await moment(deliveryDateFormat);
        const deliveryTimePeriod = await deliveryDate.diff(now, 'days');

        // 5.1.8.4 If the delivery time takes more than 7 days -> product is OUT OF STOCK
        if (deliveryTimePeriod > 7) {
          offers[i].has_extended_delivery = '1';
          offers[i].delivery_date = deliveryDateFormat;
          offers[i].delivery_time_period = deliveryTimePeriod;
        }
      }
    }

    // 1.2 Now, after we have everything, we need to check which of the offers have new products, will be shipped less than 7 days and has the lowest price
    let extractedBestOffer = null;

    for (let i = 0; i < offers.length; i++) {

      // 5.2.1 If the iterated offer offers a NEW product
      if (offers[i].is_new) {
        // 5.2.2 If the iterated offer offers a product without an extended delivery
        if (offers[i].has_extended_delivery === undefined) {
          // 5.2.2.1 If the bestOffer variable is not set -> set it to the iterated one
          if (extractedBestOffer === null) {
            extractedBestOffer = await JSON.parse(JSON.stringify(offers[i]));
          } else {
            // 5.2.2.2 If the bestOffer variable is set -> compare with the iterated offer to find out which one has a lower price
            if (offers[i].total_price !== undefined) {
              if (extractedBestOffer.total_price > offers[i].total_price) {
                extractedBestOffer = offers[i];
              }
            }
          }
        }
      }
    }

    // 5.3 If a bestOffer had been found -> return the price and availability
    if (extractedBestOffer !== null) {
      bestOffer = {
        price: extractedBestOffer.total_price,
        productAvailability: 'IN_STOCK',
        add_to_cart_button_selectors: extractedBestOffer.add_to_cart_button_selectors,
        add_to_cart_button_number: extractedBestOffer.add_to_cart_button_number
      }
    }

    return bestOffer;
  }

  /*
  * Called in checkOrders()
  */
  _scrapeOrders = async (account, cookies, marketplace) => {
    const context = await this.checkOrdersBrowser.createIncognitoBrowserContext();
    // Create a new page in a pristine context.
    const page = await context.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultNavigationTimeout(0);
  
    if (global.proxyUsername !== '' && global.proxyPassword !== '') {
      await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
    }
  
    await page.setCookie(...cookies);
  
    let baseURL = 'https://amazon.com';
    if (marketplace == 'US') {
      await page.goto(`${baseURL}/gp/css/order-history`, { waitUntil: 'networkidle0' });
    } else if (marketplace == 'UK') {
      baseURL = 'https://amazon.co.uk';
      await page.goto(`${baseURL}/gp/css/order-history`, { waitUntil: 'networkidle0' });
    }

    await this._loginWithPasswordOnly(page, marketplace);
  
    let scrapeOrders = true;
  
    // Create an array to hold the info for each order
    const scrapedOrdersInfo = [];

    // Get all orders synced in Dalio that have a status_code of 0, so that we can check Amazon, if the user has placed the order already

    const ordersNotFulfilled = await global.knex('tbl_orders')
    .where({ status_code: '0' })
    .then(orders => orders)
    .catch(e => global.appLog.error(`${e} - AmazonAutoorder._scrapeOrders.js - line 2921`));
  
    // console.log('ordersNot fulfilled', ordersNotFulfilled);

    do {
      await Util.autoScroll(page);
  
      // 1. Get all individual links to orders + the Amazon order number  
      const trackingPackageButtons = await page.evaluate(ordersNotFulfilled => {
        // Select the 'Track package' buttons of all orders on the current page
        const buttonSelectorsAll = Array.from(document.querySelectorAll('.order .shipment .track-package-button span a'));
  
        // Select the 'Track package' buttons of all delivered orders on the current page
        const buttonSelectorsDelivered = Array.from(document.querySelectorAll('.order .shipment-is-delivered .track-package-button span a'));
  
        // This array will be used to filter all the orders that are NOT delivered yet
        let ordersNotDelivered = [];
  
        // If there are any 'Track package' buttons on the page
        if (buttonSelectorsAll.length > 0) {
          // Filter out all the buttons of orders that have already been delivered
          ordersNotDelivered = buttonSelectorsAll.filter((buttonSelector, index) => {
            let orderIsNotDelivered = true;
  
            if (buttonSelectorsDelivered.length > 0) {
              for (let i = 0; i < buttonSelectorsDelivered.length; i++) {
                if (buttonSelector.isSameNode(buttonSelectorsDelivered[i])) {
                  orderIsNotDelivered = false;

                  /* 
                  * Now we need to check if an order that has been delivered on Amazon matches and order in the DB that is not yet marked as such
                  * iterate through all of the orders with a status_code of 0
                  * this will mark orders ordered manually to be ordered twice for no reason by Dalio
                  */
                  if (ordersNotFulfilled.length > 0) {
                    // Find all of the spans that contain an address
                    const spansWithPopovers = document.querySelectorAll('.order .recipient span[data-a-popover]');

                    // Iterate through the orders from the DB that have a status_code of 0
                    for (let o = 0; o < ordersNotFulfilled.length; o++) {
                      try {

                        if (spansWithPopovers.length > 0) {
                          const spanPopoverAddress = JSON.parse(spansWithPopovers[index].getAttribute('data-a-popover'));

                          if (spanPopoverAddress.inlineContent.toLowerCase().includes(ordersNotFulfilled[o].post_to_name.toLowerCase().trim()) && spanPopoverAddress.inlineContent.toLowerCase().includes(ordersNotFulfilled[o].post_to_address_field.toLowerCase().trim())) {
                            orderIsNotDelivered = true;  
                          }
                        }
                      } catch (e) {
                        // INDICATE THAT THERE IS A PROBLEM WITH THE SELECTOR
                      }
                    }
                  }
                }
              }
            }
           
            return orderIsNotDelivered;
          });
        }
  
        const ordersNotDeliveredHREFS = ordersNotDelivered.map(order => order.href);
  
        return ordersNotDeliveredHREFS;
      }, ordersNotFulfilled);
  
      // If there are selectors found -> it means there are orders awaiting delivery -> iterate through each one of them
      if (trackingPackageButtons.length > 0) {
        for (let i = 0; i < trackingPackageButtons.length; i++) {
          // Create an empty object to store the order`s data
          const buttonSelectorObject = {};
  
          // Get the link of the button
          // href="/progress-tracker/package/ref=ppx_yo_dt_b_track_package?_encoding=UTF8&itemId=jiskquomknmsuo&orderId=205-2542831-5256348&packageIndex=0&shipmentId=DCx0wCCBM&vt=YOUR_ORDERS"
          buttonSelectorObject.href = trackingPackageButtons[i];
  
          // Regex the order id from each link
          const orderId = await buttonSelectorObject.href.match(/orderId=(\d+)-(\d+)-(\d+)/);
  
          // If the order id is found using regex
          if (orderId !== null) {
            // Combine the three number parts into one
            buttonSelectorObject.source_order_number = `${orderId[1]}-${orderId[2]}-${orderId[3]}`;
          }
  
          // console.log('buttonObject', buttonSelectorObject);
          // Push the currently iterated order object into the holding array
          scrapedOrdersInfo.push(buttonSelectorObject);
        }
  
        // Get the next page button so more orders can be scraped
        const nextPageButtonSelector = await page.$('div.pagination-full .a-pagination .a-last a');
  
        // console.log('nextPageButtonSleector', nextPageButtonSelector);
        // If there is a next order page button -> click it
        if (nextPageButtonSelector !== null) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            nextPageButtonSelector.click()
          ]);
        } else {
          // Else stop the do .. while loop
          scrapeOrders = false;
        }
      } else {
        scrapeOrders = false;
      }
    } while (scrapeOrders);
  
    // If there are any orders scraped -> iterate through all of them
    if (scrapedOrdersInfo.length > 0) {
      for (let i = 0; i < scrapedOrdersInfo.length; i++) {

        const scrapedOrdersCheck = await global.knex('tbl_orders')
        .where({ source_order_url: scrapedOrdersInfo[i].href })
        .then(rows => rows)
        .catch(e => global.appLog.error(`${e} - AmazonAutoorder._scrapeOrders - line 3274`));

        if (scrapedOrdersCheck.length === 0) {
          // Click the 'Track package button' of each
          await page.goto(`${scrapedOrdersInfo[i].href}`, { waitUntil: 'networkidle2' });
    
          await this._loginWithPasswordOnly(page, marketplace);
          // Extract the tracking ID and update it in the scrapedOrdersInfo array
          scrapedOrdersInfo[i].tracking_number = await page.evaluate(() => {
            const trackingIDSelector = document.querySelector('.carrierRelatedInfo-trackingId-text');
            
            if (trackingIDSelector !== null) {
              const trackingID = trackingIDSelector.textContent.match(/Tracking ID: (\S+)/);
              if (trackingID !== null) {
                return trackingID[1];
              }
            }
    
            return null;
          });
    
          // Extract the shipping address which will be used to validate an order
          scrapedOrdersInfo[i].shipping_address = await page.evaluate(() => {
            const shipping_address = document.querySelector('.shippingAddress');
            if (shipping_address !== null) {
              return shipping_address.textContent;
            } 
    
            return shipping_address;
          });
        }
      }
    } else {
      // no open orders found
    }
  
    await context.close();
  
    // 1. Query the DB for orders with status 0 -> not shipped yet
    const ordersNotShipped = await global.knex('tbl_orders')
          .where({ status_code: '0' })
          .orWhere({ status_code: '1' })
          .then(rows => rows);

    // console.log('scrapedOrdersInfo', scrapedOrdersInfo.length);
    // console.log('ordersNotShipped', ordersNotShipped.length);
  
    if (scrapedOrdersInfo.length > 0) {
      // If there are any orders with status - not shipped yet -> iterate through all of them
      if (ordersNotShipped.length > 0) {
        for (let i = 0; i < ordersNotShipped.length; i++) {
          // Iterate through the scraped orders with status - shipped but not delivered - for comparison
          for (let so = 0; so < scrapedOrdersInfo.length; so++) {
            // Transform the scraped shipping address to lower case in order to compare with the current order

            if (scrapedOrdersInfo[so].shipping_address !== undefined) {

              // Make sure all the dots, commas, new lines, spaces, tabs are removed from the comparison string as users can be cunts
              const scrapedOrderShippingAddress = scrapedOrdersInfo[so].shipping_address.toLowerCase().replace(/[ \n\t\r,.]+/g, '');
              const dbOrderName = ordersNotShipped[i].post_to_name.toLowerCase().trim().replace(/[ \n\t\r,.]+/g, '');
              const dbOrderAddress = ordersNotShipped[i].post_to_address_field.toLowerCase().trim().replace(/[ \n\t\r,.]+/g, '');
              const dbOrderPostcode = ordersNotShipped[i].post_to_postcode.toLowerCase().trim().replace(/[ \n\t\r,.]+/g, '');

              // console.log('---------------------------------');
              // console.log('scrapedOrderShippingAddress', scrapedOrderShippingAddress);
              // console.log('dbOrderName', dbOrderName);
              // console.log('scrapedOrderShippingAddress includes dbOrderName', scrapedOrderShippingAddress.includes(dbOrderName));
              // console.log('dbOrderAddress', dbOrderAddress);
              // console.log('scrapedOrderShippingAddress includes dbOrderAddress', scrapedOrderShippingAddress.includes(dbOrderAddress));
              // console.log('------------------------------------');
          
              // If the currently iterated scraped order contains the buyer name and address field of the currently iterated db order -> update the tracking number and source (Amazon) order number
              if (scrapedOrderShippingAddress.includes(dbOrderName) && (scrapedOrderShippingAddress.includes(dbOrderAddress) || scrapedOrderShippingAddress.includes(dbOrderPostcode))) {

                // console.log('there is an order match', scrapedOrderShippingAddress);
      
                if (scrapedOrdersInfo[so].source_order_number !== undefined) {
                  ordersNotShipped[i].source_order_number = scrapedOrdersInfo[so].source_order_number;
                }

                if (scrapedOrdersInfo[so].tracking_number !== undefined) {
                  ordersNotShipped[i].tracking_number = scrapedOrdersInfo[so].tracking_number;
                }

                if (scrapedOrdersInfo[so].href !== undefined) {
                  ordersNotShipped[i].source_order_url = scrapedOrdersInfo[so].href;
                }

                if (ordersNotShipped[i].status_code == '0') {
                  // Update the status code to 1 -> ordered on Amazon but not marked as delivered on Ebay
                  ordersNotShipped[i].status_code = '1';
                }
                
                // console.log('ordersNotShipped[i]', ordersNotShipped[i].tracking_number, ordersNotShipped[i].source_order_number);

                // Update the order in the DB
                await global.knex('tbl_orders')
                .where({ id: ordersNotShipped[i].id })
                .update({
                  source_order_number: ordersNotShipped[i].source_order_number,
                  tracking_number: ordersNotShipped[i].tracking_number,
                  status_code: ordersNotShipped[i].status_code,
                  order_verified_at_source: '1',
                  source_order_url: ordersNotShipped[i].source_order_url,
                  supplier_account: account.email
                });
              }

            }

          }
        }
      }
    }
  }

  /*
  * Called in checkTrackingData()
  */
  _scrapeTrackingData = async (account, cookies, marketplace) => {
    const context = await this.checkOrdersBrowser.createIncognitoBrowserContext();
    // Create a new page in a pristine context.
    const page = await context.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultNavigationTimeout(0);
  
    if (global.proxyUsername !== '' && global.proxyPassword !== '') {
      await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
    }
  
    await page.setCookie(...cookies);

    // Query all orders that are ordered on Amazon, in the correct marketplace and without a tracking number
    const ordersToBeChecked = await global.knex('tbl_orders')
    .where({ 
      status_code: '1',
      store_marketplace: marketplace,
      supplier_account: account.email
    })
    .orWhere({
      status_code: '2',
      store_marketplace: marketplace,
      supplier_account: account.email
    })
    .then(rows => rows)
    .catch(e => global.appLog.error(`${e} - AmazonAutoorder._scrapeTrackingData - line 3384`));

    // Iterate through all of them
    if (ordersToBeChecked.length > 0) {
      for (let i = 0; i < ordersToBeChecked.length; i++) {
        if (ordersToBeChecked[i].source_order_url !== null && ordersToBeChecked.source_order_url !== '') {
        
          await page.goto(ordersToBeChecked[i].source_order_url, { waitUntil: 'networkidle0' });

          const primaryOrderStatus = await page.evaluate(() => {
            const primaryStatusSelector = document.querySelector('#primaryStatus');
    
            if (primaryStatusSelector !== null) {
              return primaryStatusSelector.textContent.trim();
            }

            return null;
          });

          console.log(ordersToBeChecked[i].order_number);

          console.log('primaryOrderStatus', primaryOrderStatus);
  
          // Extract the tracking ID and update it in the scrapedOrdersInfo array
          const trackingNumber = await page.evaluate(() => {
            const trackingIDSelector = document.querySelector('.carrierRelatedInfo-trackingId-text');
            
            if (trackingIDSelector !== null) {
              const trackingID = trackingIDSelector.textContent.match(/Tracking ID: (\S+)/);
              if (trackingID !== null) {
                return trackingID[1];
              }
            }
    
            return null;
          });

          console.log('tracking number', trackingNumber);

          // Extract the tracking ID and update it in the scrapedOrdersInfo array
          const sourceOrderCarrier = await page.evaluate(() => {
            const carrierSelector = document.querySelector('#carrierRelatedInfo-container h1');
            
            if (carrierSelector !== null) {
              const carrierSelectorUS = carrierSelector.textContent.toLowerCase().match(/shipped with (.*)/);
              if (carrierSelectorUS !== null) {
                return carrierSelectorUS[1];
              }

              const carrierSelectorUK = carrierSelector.textContent.toLowerCase().match(/delivery by (.*)/);

              if (carrierSelectorUK !== null) {
                return carrierSelectorUK[1];
              }
            }

            // carrierRelatedInfo-mfn-carrierNameTitle
            const carrierSelectorAlternative = document.querySelector('#carrierRelatedInfo-container h1.carrierRelatedInfo-mfn-carrierNameTitle');

            if (carrierSelectorAlternative !== null) {
              const carrierSelectorAlternativeUSRegex = carrierSelectorAlternative.textContent.toLowerCase().match(/shipped with (.*)/);

              if (carrierSelectorAlternativeUSRegex !== null) {
                return carrierSelectorAlternativeUSRegex[1];
              }

              const carrierSelectorAlternativeUKRegex = carrierSelectorAlternative.textContent.toLowerCase().match(/delivery by (.*)/);

              if (carrierSelectorAlternativeUKRegex !== null) {
                return carrierSelectorAlternativeUKRegex[1];
              }
            }
    
            return null;
          });

          console.log('sourceOrderCarrier', sourceOrderCarrier);

          // If a tracking number has appeared -> add it to the DB
          if (trackingNumber !== null || sourceOrderCarrier !== null) {

            await global.knex('tbl_orders')
            .where({ order_number: ordersToBeChecked[i].order_number })
            .update({ 
              tracking_number: trackingNumber,
              source_order_carrier: sourceOrderCarrier
            })
            .catch(e => global.appLog.error(`${e} - AmazonAutoorder._scrapeTrackingData line 3413`));

          }

          // If a primary order status is delivered -> change it in the DB
          if (primaryOrderStatus !== null && primaryOrderStatus.toLowerCase().includes('delivered')) {
            await global.knex('tbl_orders')
            .where({ order_number: ordersToBeChecked[i].order_number })
            .update({ 
              status_code: '3'
            })
            .catch(e => global.appLog.error(`${e} - AmazonAutoorder._scrapeTrackingData line 3567`));
          }

          const pageHTML = await page.content();

          await global.knex('tbl_orders')
          .where({ order_number: ordersToBeChecked[i].order_number })
          .update({ 
            source_order_html: pageHTML,
            source_order_status: primaryOrderStatus
          })
          .catch(e => global.appLog.error(`${e} - AmazonAutoorder._scrapeTrackingData line 3583`));
        }
      }
    }
  
    await context.close();
  }

  _deleteGiftTextDuringOrder = async page => {
    await page.evaluate(() => {
      // const giftMessageTextAreaSelectors = document.querySelectorAll('.item-gift-message-span textarea');
      const giftMessageTextAreaSelectors = document.querySelectorAll('#giftOptions textarea');
      const giftMessageTextAreaSelectorsUK = document.querySelectorAll('.item-gift-message-span textarea');

      if (giftMessageTextAreaSelectors.length > 0) {
        for (let i = 0; i < giftMessageTextAreaSelectors.length; i++) {
          giftMessageTextAreaSelectors[i].innerHTML = '';
        }
      }

      if (giftMessageTextAreaSelectorsUK.length > 0) {
        for (let i = 0; i < giftMessageTextAreaSelectorsUK.length; i++) {
          giftMessageTextAreaSelectorsUK[i].innerHTML = '';
        }
      }

      // FOR UK MARKET
      const giftCheckboxes = document.querySelectorAll('.includeMessageCheckbox input[type="checkbox"]');
      if (giftCheckboxes.length > 0) {
        for (let i = 0; i < giftCheckboxes.length; i++) {
          giftCheckboxes[i].checked = false;
        }
      }
    });

    await page.waitFor(2000);
  }

  _enterAddressDetails = async (page, product, marketplace) => {
      // Initially, it was normal to have two separate checkout layouts for US and UK. Lately, however, they have been mixed and using them interchangeably
      const addNewAddressButtonSelector = await page.$('#add-new-address-popover-link');

      // Determine the Amazon marketplace (US, UK) and branch out into the correct one
      // If it is the US one - amazon.com
      if (marketplace === 'US' || addNewAddressButtonSelector !== null) {
        // Here, we will be presented with the 'Address' step, where the correct address has to be typed
        // Select the 'Add new address' button

        // Check if it is on the page
        if (addNewAddressButtonSelector !== null) {
          // Click it
          await addNewAddressButtonSelector.click();

          // Just in case, clear the 'Name' and 'Phone number' fields as they might be prepopulated
          await page.evaluate(() => {
            const fullName = document.getElementById("address-ui-widgets-enterAddressFullName");
            const fullNameAlternative = document.getElementById("enterAddressFullName");

            if (fullName !== null) {
              fullName.value = '';
            } else if (fullNameAlternative !== null) {
              fullNameAlternative.value = '';
            }
          });

          await page.evaluate(() => {
            const phoneNumber = document.getElementById("address-ui-widgets-enterAddressPhoneNumber");
            const phoneNumberAlternative = document.getElementById("enterAddressPhoneNumber");

            if (phoneNumber !== null) {
              phoneNumber.value = '';
            } else if (phoneNumberAlternative !== null) {
              phoneNumberAlternative.value = '';
            }
          });

          // TEMPORARILY STOPPED AS IT MESSES WITH CODE EXECUTION
          // 8.1.1.2.4 Select the 'Country' widget to  US (it should already be selected)
          // const shipToCountry: string = 'US';
          // await page.select('#address-ui-widgets-countryCode-dropdown-nativeId', shipToCountry);

          // Check for the presence of the buyer`s info and type it
          if (product.post_to_name !== null && product.post_to_name !== '') {
            console.log('typing name');

            const fullNameField = await page.$('#address-ui-widgets-enterAddressFullName');
            const fullNameAlternativeField = await page.$('#enterAddressFullName');

            if (fullNameField !== null) {
              await fullNameField.type(product.post_to_name, { delay: 50 });
            } else if (fullNameAlternativeField !== null) {
              await fullNameAlternativeField.type(product.post_to_name, { delay: 50 });
            }
          }

          if (product.post_to_address_field !== null && product.post_to_address_field !== '') {
            console.log('typing address');

            const addressLineField = await page.$('#address-ui-widgets-enterAddressLine1');
            const addressLineAlternativeField = await page.$('#enterAddressAddressLine1');

            if (addressLineField !== null) {
              await addressLineField.type(product.post_to_address_field, { delay: 50 });
            } else if (addressLineAlternativeField !== null) {
              await addressLineAlternativeField.type(product.post_to_address_field, { delay: 50 });
            }
          }

          if (product.post_to_address_field_2 !== null && product.post_to_address_field_2 !== '') {
            console.log('typing address 2');

            const addressLine2Field = await page.$('#address-ui-widgets-enterAddressLine2');
            const addressLine2AlternativeField = await page.$('#enterAddressAddressLine2');

            if (addressLine2Field !== null) {
              await addressLine2Field.type(product.post_to_address_field_2, { delay: 50 });
            } else if (addressLine2AlternativeField !== null) {
              await addressLine2AlternativeField.type(product.post_to_address_field_2, { delay: 50 });
            }
          }

          if (product.post_to_city !== null && product.post_to_city !== '') {
            console.log('typing city name');

            const cityField = await page.$('#address-ui-widgets-enterAddressCity');
            const cityFieldAlternative = await page.$('#enterAddressCity');

            if (cityField !== null) {
              await cityField.type(product.post_to_city, { delay: 50 });
            } else if (cityFieldAlternative !== null) {
              await cityFieldAlternative.type(product.post_to_city, { delay: 50 });
            }
          }

          if (product.post_to_state_province !== null && product.post_to_state_province !== '') {
            console.log('typing state/province');

            const stateField = await page.$('#address-ui-widgets-enterAddressStateOrRegion');
            const stateFieldAlternative = await page.$('#enterAddressStateOrRegion');

            if (stateField !== null) {
              await stateField.type(product.post_to_state_province, { delay: 50 });
            } else if (stateFieldAlternative !== null) {
              await stateFieldAlternative.type(product.post_to_state_province, { delay: 50 });
            }
          }
          
          if (product.post_to_postcode !== null && product.post_to_postcode !== '') {
            console.log('typing postcode');

            const postcodeField = await page.$('#address-ui-widgets-enterAddressPostalCode');
            const postcodeFieldAlternative = await page.$('#enterAddressPostalCode');

            if (postcodeField !== null) {
              await postcodeField.type(product.post_to_postcode, { delay: 50 });    
            } else if (postcodeFieldAlternative !== null) {
              await postcodeFieldAlternative.type(product.post_to_postcode, { delay: 50 });    
            }
          }

          if (product.buyer_phone !== null && product.buyer_phone !== '') {
            console.log('typing phone');

            const phoneField = await page.$('#address-ui-widgets-enterAddressPhoneNumber');
            const phoneFieldAlternative = await page.$('#enterAddressPhoneNumber');

            if (phoneField !== null) {
              await phoneField.type(product.buyer_phone, { delay: 100 });
            } else if (phoneFieldAlternative !== null) {
              await phoneFieldAlternative.type(product.buyer_phone, { delay: 100 });
            }
          }

          await this._verifyTypedAddress(page, product);

          // 8.1.1.2.5 Check if the checkbox, which regulates whether the entered address will be used as default address, is checked
          // const useAsBillingAddress: boolean = await page.evaluate(() => {
          //   const useAsBillingAddressChecked = document.querySelector('input#address-ui-widgets-use-as-my-default');

          //   if (useAsBillingAddressChecked !== null) {
          //     if (useAsBillingAddressChecked.checked) {
          //       return true;
          //     }

          //     return false;
          //   }

          //   return null
          // });

          // 8.1.1.2.6 If it is (should NOT be) -> click it to disable it
          // if (useAsBillingAddress) {
          //   console.log('useAsBillingAddress', useAsBillingAddress);
          //   await page.click('input#address-ui-checkout-use-as-my-default');
          // }

          console.log('clicking on the submit button');
          await page.waitFor(5000);
        
          // Go to the next checkout step
          let submitButtonSelector = await page.$('#address-ui-widgets-form-submit-button');

          if (submitButtonSelector === null) {
            submitButtonSelector = await page.$('#address-ui-checkout-submit-button');

            if (submitButtonSelector === null) {
              submitButtonSelector = await page.$('#newAddressUseThisAddressButton');
            }
          }
          
          if (submitButtonSelector === null) {
            const errorLog = `Could not order product - #${product.order_number}. The address submit button could not be located.`;
            await global.appLog.error(errorLog);
            throw new Error(errorLog);
          } else {
            try {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
                submitButtonSelector.click()
              ]);
            } catch (e) {
              const addressSuggestionForm = await page.$('#address-popover-suggestions-form');
              const addressSuggestionFormAlternative = await page.$('#address-ui-checkout-form');

              if (addressSuggestionForm !== null || addressSuggestionFormAlternative !== null) {
                await this._handleAmazonAddressSuggestions(page, product);
              } else {
                const errorLog = `There is a problem with the address for this order. Please investigate the issue.`;
                global.appLog.error(errorLog);
  
                Util.insertOrderLog(product, errorLog, 'error');
                await global.knex('tbl_orders')
                .where({ order_number: product.order_number })
                .update({ being_ordered_at_source: '0' })
                .catch(e => global.appLog.error(`${e} - amazonAutoorder._enterAddressDetails - line 3463`));
                
                // await this.orderBrowser.close();
  
                throw new Error(errorLog);
              }
              
            }

            console.log('waiting for 5 seconds');
            await page.waitFor(5000);
          }


        } else {
          // 8.1.1.3 If it is NOT
          // 8.1.1.3.1 Just in case, clear the 'Name' and 'Phone number' fields as they might be prepopulated
          await page.evaluate(() => document.getElementById("enterAddressFullName").value = "");
          await page.evaluate(() => document.getElementById("enterAddressPhoneNumber").value = "");

          // 8.1.1.3.2 Check for the presence of the buyer`s info and type it
          if (product.post_to_name !== null && product.post_to_name !== '') {
            await page.type('#enterAddressFullName', product.post_to_name, { delay: 50 });
          }

          if (product.post_to_address_field !== null && product.post_to_address_field !== '') {
            await page.type('#enterAddressAddressLine1', product.post_to_address_field, { delay: 50 });
          }

          if (product.post_to_address_field_2 !== null && product.post_to_address_field_2 !== '') {
            await page.type('#enterAddressAddressLine2', product.post_to_address_field_2, { delay: 50 });
          }

          if (product.post_to_city !== null && product.post_to_city !== '') {
            await page.type('#enterAddressCity', product.post_to_city, { delay: 50 });
          }

          if (product.post_to_state_province !== null && product.post_to_state_province !== '') {
            await page.type('#enterAddressStateOrRegion', product.post_to_state_province, { delay: 50 });
          }
          
          if (product.post_to_postcode !== null && product.post_to_postcode !== '') {
            await page.type('#enterAddressPostalCode', product.post_to_postcode, { delay: 50 });    
          }

          // 8.1.1.3.3 Select the 'Country' widget to  US (it should already be selected)
          const shipToCountry: string = 'US';
          await page.select('#enterAddressCountryCode', shipToCountry);
          await page.type('#enterAddressPhoneNumber', product.buyer_phone, { delay: 100 });

          // 8.1.1.3.6 Go to the next checkout step

          try {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0' }),
              page.click('input[name="shipToThisAddress"]')
            ]);
          } catch (e) {
            const addressSuggestionForm = await page.$('#address-popover-suggestions-form');
            const addressSuggestionFormAlternative = await page.$('#address-ui-checkout-form');

            if (addressSuggestionForm !== null || addressSuggestionFormAlternative !== null) {
              await this._handleAmazonAddressSuggestions(page, product);
            } else {
              const errorLog = `There is a problem with the address for this order. Please investigate the issue.`;
              global.appLog.error(errorLog);

              Util.insertOrderLog(product, errorLog, 'error');
              await global.knex('tbl_orders')
              .where({ order_number: product.order_number })
              .update({ being_ordered_at_source: '0' })
              .catch(e => global.appLog.error(`${e} - amazonAutoorder._enterAddressDetails - line 3554`));
              
              await this.orderBrowser.close();

              throw new Error(errorLog);
            }
            
          }
          
        }

        await page.waitFor(3000);

        // 8.1.1.4 There is usually some text in the gift boxes
        await this._deleteGiftTextDuringOrder(page);

        console.log('deteled gift text');
        // 8.1.1.5 Save the gift options and continue to the next step
        // giftOptions
        // const saveGiftOptionsAndContinueButton = await page.$('#orderSummaryPrimaryActionBtn input');
        const saveGiftOptionsAndContinueButton = await page.$('#giftOptions .primary-action-button input[type="submit"]');
        if (saveGiftOptionsAndContinueButton !== null) {
          // go to next page
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            saveGiftOptionsAndContinueButton.click()
          ]);
        }

      } else if (marketplace === 'UK') {
        // 8.2 If it is the UK account - amazon.co.uk
        // 8.2.1 Scroll to bottom of the page
        await Util.autoScroll(page);

        // 8.2.2 Check if GB is selected as a country
        const countryIsUK: boolean = await page.evaluate(() => {
          // Get the country code selector
          const countrySelector = document.querySelector('#enterAddressCountryCode');
          // if the element is found
          if (countrySelector !== null) {
            // Check if its value is 'GB' -> return true
            if (countrySelector.value == 'GB') {
              return true;
            }
          }
          // If selector not found or value not GB -> return false
          return false;
        });

        // 8.2.3 If selected country is not UK -> select it
        if (!countryIsUK) {
          await page.select('#enterAddressCountryCode', 'GB');
        }

        // 8.2.4 Check for the presence of buyer`s info and type it
        if (product.post_to_name !== null && product.post_to_name !== '') {
          await page.type('input#enterAddressFullName', product.post_to_name, { delay: 50 });
        }

        if (product.buyer_phone !== null && product.buyer_phone !== '') {
          await page.type('input#enterAddressPhoneNumber', product.buyer_phone, { delay: 50 });
        }

        if (product.post_to_postcode !== null && product.post_to_postcode !== '') {
          await page.type('input#enterAddressPostalCode', product.post_to_postcode, { delay: 50 });
        }

        if (product.post_to_address_field !== null && product.post_to_address_field !== '') {
          await page.type('input#enterAddressAddressLine1', product.post_to_address_field, { delay: 50 });
        }

        if (product.post_to_address_field_2 !== null && product.post_to_address_field_2 !== '') {
          await page.type('input#enterAddressAddressLine2', product.post_to_address_field_2, { delay: 50 });
        }

        if (product.post_to_city !== null && product.post_to_city !== '') {
          await page.type('input#enterAddressCity', product.post_to_city, { delay: 50 });
        }

        if (product.post_to_state_province !== null && product.post_to_state_province !== '') {
          await page.type('input#enterAddressStateOrRegion', product.post_to_state_province, { delay: 50 });
        }

        // 8.2.5 Navigate to next checkout step
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          page.click('input[name="shipToThisAddress"]')
        ]);

        // 8.2.6 If Amazon does not find an address -> it will show an error
        const addressErrors = await page.evaluate(() => document.querySelector('#addressIMB'));

        // 8.2.7 If there is such an error -> log the error and terminate function execution
        if (addressErrors !== null) {
          const unescapedErrorLog = `Product ${product.item_name} could not be ordered. There was a problem with the address. Please investigate the issue.`;
          const errorLog: string = encodeURI(unescapedErrorLog);

          const error: ErrorType = {
            status: 'error',
            message: `Product ${product.item_name} could not be ordered. There was a problem with the address. Please investigate the issue.`
          }

          await global.log.error(errorLog);
          await Util.insertOrderLog(product, unescapedErrorLog, 'error');
          throw error.message;
        }

        // 8.2.8 If an address is not correct but close to another address -> Amazon will suggest an address that is supposed to be correct (choose it)
        if (await page.$('input[name="useSelectedAddress"]') !== null) {
          // go to next page
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('input[name="useSelectedAddress"]')
          ]);
        }

        await page.waitFor(3000);

        await this._handleAmazonAddressSuggestions(page, product);

        await page.waitFor(3000);

        // 8.2.9 Delete the gift text inside the box
        await this._deleteGiftTextDuringOrder(page);

        // 8.2.10 Save the gift options and go to the next step
        const saveGiftButtonAndContinueSelector = await page.$('.save-gift-button-box');
        if (saveGiftButtonAndContinueSelector !== null) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            saveGiftButtonAndContinueSelector.click()
          ]);
        }

        // 8.2.11 Amazon will present dispatch methods -> choose the first as it is usually the cheapest (Amazon Prime)
        const chooseDispatchMethod: boolean = await page.evaluate(() => {
          const dispatchMethodSelectors = document.querySelectorAll('.shipping-option');

          if (dispatchMethodSelectors.length > 0) {
            dispatchMethodSelectors[0].checked = true;
            return true;
          } 

          return false;
        });
        
        await page.waitFor(1000);

        // 8.2.12 Navigate to the next checkout step
        if (chooseDispatchMethod) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('input[value="Continue"]')
          ]);
        }

        // 8.2.13 Make sure that the prices are hidden for the order
        const hidePricesCheckboxSelector = await page.$('#hidePricesCheckbox');
        if (hidePricesCheckboxSelector !== null) {
          const hidePricesCheckboxChecked: boolean = await page.evaluate(() => {
            const selector = document.querySelector('#hidePricesCheckbox');
            if (selector.checked) {
              return true;
            }
            
            return false;
          });

          if (!hidePricesCheckboxChecked) {
            await hidePricesCheckboxSelector.click();
          }
        }

        const giftMessageCheckboxSelector = await page.$('input#includeMessageCheckbox-0');
        const saveGiftButtonSelector = await page.$('.save-gift-button-box input[type="submit"]');

        if (saveGiftButtonSelector !== null) {
          // await page.click('input#includeMessageCheckbox-0');    
          if (giftMessageCheckboxSelector !== null) {
            await giftMessageCheckboxSelector.click();
          }

          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            saveGiftButtonSelector.click()
          ]);
        }

        // 4. Click place your order button 
        // document.querySelector('#placeYourOrder input')

      }
  }

  _verifyTypedAddress = async (page, product) => {
    if (product.post_to_name !== null && product.post_to_name !== '') {

      const fullNameField = await page.$('#address-ui-widgets-enterAddressFullName');
      const fullNameAlternativeField = await page.$('#enterAddressFullName');

      if (fullNameField !== null) {
        const fullNameValue = await page.evaluate(() => document.querySelector('#address-ui-widgets-enterAddressFullName').value);
        if (fullNameValue === '') {
          await fullNameField.type(product.post_to_name, { delay: 50 });
        }
      } else if (fullNameAlternativeField !== null) {
        const fullNameAlternativeValue = await page.evaluate(() => document.querySelector('#enterAddressFullName').value);

        if (fullNameAlternativeValue === '') {
          await fullNameAlternativeField.type(product.post_to_name, { delay: 50 });
        }
      }
    }

    if (product.post_to_address_field !== null && product.post_to_address_field !== '') {

      const addressLineField = await page.$('#address-ui-widgets-enterAddressLine1');
      const addressLineAlternativeField = await page.$('#enterAddressAddressLine1');

      if (addressLineField !== null) {
        const addressLineValue = await page.evaluate(() => document.querySelector('#address-ui-widgets-enterAddressLine1').value);
        if (addressLineValue === '') {
          await addressLineField.type(product.post_to_address_field, { delay: 50 });
        }
      } else if (addressLineAlternativeField !== null) {
        const addressLineAlternativeValue = await page.evaluate(() => document.querySelector('#enterAddressAddressLine1').value);
        if (addressLineAlternativeValue === '') {
          await addressLineAlternativeField.type(product.post_to_address_field, { delay: 50 });
        }
      }
    }

    if (product.post_to_address_field_2 !== null && product.post_to_address_field_2 !== '') {

      const addressLine2Field = await page.$('#address-ui-widgets-enterAddressLine2');
      const addressLine2AlternativeField = await page.$('#enterAddressAddressLine2');

      if (addressLine2Field !== null) {
        const addressLine2Value = await page.evaluate(() => document.querySelector('#address-ui-widgets-enterAddressLine2').value);
        if (addressLine2Value === '') {
          await addressLine2Field.type(product.post_to_address_field_2, { delay: 50 });
        }
      } else if (addressLine2AlternativeField !== null) {
        const addressLine2AlternativeValue = await page.evaluate(() => document.querySelector('#enterAddressAddressLine2').value);
        if (addressLine2AlternativeValue === '') {
          await addressLine2AlternativeField.type(product.post_to_address_field_2, { delay: 50 });
        }
      }
    }

    if (product.post_to_city !== null && product.post_to_city !== '') {

      const cityField = await page.$('#address-ui-widgets-enterAddressCity');
      const cityFieldAlternative = await page.$('#enterAddressCity');

      if (cityField !== null) {
        const cityFieldValue = await page.evaluate(() => document.querySelector('#address-ui-widgets-enterAddressCity').value);
        if (cityFieldValue === '') {
          await cityField.type(product.post_to_city, { delay: 50 });
        }
      } else if (cityFieldAlternative !== null) {
        const cityFieldAlternativeValue = await page.evaluate(() => document.querySelector('#enterAddressCity').value);

        if (cityFieldAlternativeValue === '') {
          await cityFieldAlternative.type(product.post_to_city, { delay: 50 });
        }
      }
    }

    if (product.post_to_state_province !== null && product.post_to_state_province !== '') {

      const stateField = await page.$('#address-ui-widgets-enterAddressStateOrRegion');
      const stateFieldAlternative = await page.$('#enterAddressStateOrRegion');

      if (stateField !== null) {
        const stateFieldValue = await page.evaluate(() => document.querySelector('#address-ui-widgets-enterAddressStateOrRegion').value);
        if (stateFieldValue === '') {
          await stateField.type(product.post_to_state_province, { delay: 50 });
        }
      } else if (stateFieldAlternative !== null) {
        const stateFieldAlternativeValue = await page.evaluate(() => document.querySelector('#enterAddressStateOrRegion').value);
        if (stateFieldAlternativeValue === '') {
          await stateFieldAlternative.type(product.post_to_state_province, { delay: 50 });
        }
      }
    }
    
    if (product.post_to_postcode !== null && product.post_to_postcode !== '') {

      const postcodeField = await page.$('#address-ui-widgets-enterAddressPostalCode');
      const postcodeFieldAlternative = await page.$('#enterAddressPostalCode');

      if (postcodeField !== null) {
        const postcodeFieldValue = await page.evaluate(() => document.querySelector('#address-ui-widgets-enterAddressPostalCode').value);
        if (postcodeFieldValue === '') {
          await postcodeField.type(product.post_to_postcode, { delay: 50 });
        }
      } else if (postcodeFieldAlternative !== null) {
        const postcodeFieldAlternativeValue = await page.evaluate(() => document.querySelector('#enterAddressPostalCode').value);
        if (postcodeFieldAlternativeValue === '') {
          await postcodeFieldAlternative.type(product.post_to_postcode, { delay: 50 });
        }
      }
    }

    if (product.buyer_phone !== null && product.buyer_phone !== '') {
      const phoneField = await page.$('#address-ui-widgets-enterAddressPhoneNumber');
      const phoneFieldAlternative = await page.$('#enterAddressPhoneNumber');

      if (phoneField !== null) {
        const phoneFieldValue = await page.evaluate(() => document.querySelector('#address-ui-widgets-enterAddressPhoneNumber').value);
        if (phoneFieldValue === '') {
          await phoneField.type(product.buyer_phone, { delay: 50 });
        }
      } else if (phoneFieldAlternative !== null) {
        const phoneFieldAlternativeValue = await page.evaluate(() => document.querySelector('#enterAddressPhoneNumber').value);
        if (phoneFieldAlternativeValue === '') {
          await phoneFieldAlternative.type(product.buyer_phone, { delay: 50 });
        }
      }
    }
  }

  _handleAmazonAddressSuggestions = async (page, product) => {
      // Check if Amazon suggests another address - DO NOT let it choose the other address
      const addressSuggestionForm = await page.$('#address-popover-suggestions-form');
      const addressSuggestionFormAlternative = await page.$('#address-ui-checkout-form');

      if (addressSuggestionForm !== null) {
        const addressInputs = await page.$$('#address-popover-suggestions-form input[type="radio"]');
        if (addressInputs.length > 0) {
          await addressInputs[0].click();

          // document.querySelector('input[name="useSelectedAddress"]')
          const submitSelectedAddressButon = await page.$('input[name="useSelectedAddress"]');
          if (submitSelectedAddressButon !== null) {
            console.log('selecting the sumbit address button');
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0' }),
              submitSelectedAddressButon.click()
            ]);
          } else {
            const errorLog = `Could not order product - ${product.order_number}. Amazon suggested a new address and Dalio could not find the button to select the user typed address.`;

            await global.appLog.error(errorLog);
            throw new Error(errorLog);
          }
        }
      } else if (addressSuggestionFormAlternative !== null) {
        const addressInputs = await page.$$('#address-ui-checkout-form input[type="radio"]');
        if (addressInputs.length > 0) {
          await addressInputs[0].click();

          // document.querySelector('input[name="useSelectedAddress"]')
          const submitSelectedAddressButon = await page.$('input[name="address-ui-widgets-saveOriginalOrSuggestedAddress"]');
          if (submitSelectedAddressButon !== null) {
            console.log('selecting the sumbit address button');
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0' }),
              submitSelectedAddressButon.click()
            ]);
          } else {
            const errorLog = `Could not order product - ${product.order_number}. Amazon suggested a new address and Dalio could not find the button to select the user typed address.`;

            await global.appLog.error(errorLog);
            throw new Error(errorLog);
          }
        }
      }
  }

  _solveCaptchaIfPresent = async page => {
    // Check for an image captcha
    const captchaInput = await page.$('input#captchacharacters');
    if (captchaInput !== null) {
      // If it appears -> get the image url
      const captchaImageURL = await page.evaluate(() => {
        const captchaImageSelector = document.querySelector('img');
        return captchaImageSelector.getAttribute('src');
      });
  
      // Send the image to 2Captcha
      const captchaResponse = await this.client.decode({ url: captchaImageURL }).then((response) => response);
  
      // If the response is NOT OK -> reload the page (the captcha will disappear)
      if (captchaResponse !== undefined) {
        if (captchaResponse._apiResponse !== null && captchaResponse._apiResponse !== undefined) {
          if (!captchaResponse._apiResponse.includes('OK')) {
            await page.reload({ waitUntil: "networkidle0" });
          } else {
            // If it is okay -> type the result and click the 'Continue shopping' button
            await page.type('input#captchacharacters', captchaResponse._text.toString(), { delay: 100 });
            await page.evaluate(() => {
              const submitButton = document.querySelector('button[type="submit"]');
              if (submitButton !== null) {
                submitButton.click();
              }
            });
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
          }
        }
      }
    }
  }
}

export default AmazonAutoorder;
