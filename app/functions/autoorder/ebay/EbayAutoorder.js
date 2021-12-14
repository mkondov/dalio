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
/* eslint no-else-return: 0 */

import fs from 'fs';
import { ipcMain } from 'electron';
import moment from 'moment';
import isOnline from 'is-online';
import Util from '../../core/util/Util';
import EbayUtil from '../../core/util/EbayUtil';
import EbayAuth from './EbayAuth';

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

class EbayAutoorder {
  mainWindow;
  autoorderHelper;
  
  ordersScraperBrowser = false;
  markOrdersAsDispatchedBrowser = false;
  leaveFeedbackBrowser = false;

  ordersScraped = [];
  ordersAwaitingDispatchScraped = [];

  uploadTrackingsQueue = [];
  leaveFeedbackQueue = [];

  constructor (autoorderHelper) {
    this.mainWindow = autoorderHelper.mainWindow;
    this.autoorderHelper = autoorderHelper;

    ipcMain.on('sync-ebay-orders', async () => {
        await this.syncOrders();
        await this.autoorderHelper.amazonAutoorder.checkOrders();
        // await this.autoorderHelper.amazonAutoorder.checkTrackingData();
    });

    ipcMain.on('mark-ebay-orders-as-dispatched', async (event, orders, type) => {
      if (orders !== undefined) {
        if (orders.length > 0) {
          for (let i = 0; i < orders.length; i++) {
            const orderClone = JSON.parse(JSON.stringify(orders[i]));
            orderClone.type = 'without-tracking';

            this.uploadSingleTracking(orderClone);
          }
        }
        // this.markOrdersAsDispatched(orders, 'manual', type);
      } else {
        this.markOrdersAsDispatched();
      }
    });

    ipcMain.on('upload-single-tracking', async (event, order) => {
      const orderClone = JSON.parse(JSON.stringify(order));
      orderClone.type = 'with-tracking';

      this.uploadSingleTracking(orderClone, 'with-tracking');
    });

    ipcMain.on('leave-feedback', async (event, orders = []) => {
      if (orders.length > 0) {
        for (let i = 0; i < orders.length; i++) {
          const orderClone = JSON.parse(JSON.stringify(orders[i]));
          this.leaveSingleBuyersFeedback(orderClone);
        }
      } else {
        this.leaveBuyersFeedback();
      }
    });
  }

  uploadSingleTracking = async order => {
    if (order !== undefined) {
      let orderIsInTheQueue = false;

      // Check if the current order is queued in the ordersQueue
      if (this.uploadTrackingsQueue.length > 0) {
        for (let i = 0; i < this.uploadTrackingsQueue.length; i++) {
          if (this.uploadTrackingsQueue[i].order_number === order.order_number) {
            orderIsInTheQueue = true;
          }
        }
      } 

      if (!orderIsInTheQueue) {
        this.uploadTrackingsQueue.push(order);
      }
    }

    if (this.uploadTrackingsQueue.length > 0) {
      if (!global.markingEbayOrdersAsDispatched) {

        if (this.uploadTrackingsQueue[0].type === 'with-tracking') {
          const orders = await global.knex('tbl_orders')
          .where({ order_number: this.uploadTrackingsQueue[0].order_number })
          .whereNotNull('proxy_tracking_number')
          .then(res => res)
          .catch(e => global.appLog.error(`${e} - in EbayAutoorder - upload-single-tracking - line 287`));
    
          if (orders.length > 0) {
            this.uploadTrackingsQueue.shift();
            await this.markOrdersAsDispatched(orders, 'manual');
          }
        } else if (this.uploadTrackingsQueue[0].type === 'without-tracking') {
            const orderClone = JSON.parse(JSON.stringify(this.uploadTrackingsQueue[0]));
            this.uploadTrackingsQueue.shift();
            await this.markOrdersAsDispatched([orderClone], 'manual', 'without-tracking');             
        }
      }
    }
  }

  syncOrders = async (type = 'awaiting_dispatch') => {
    // type 'all' - scrapes ALL orders, including the ones that have been delivered
    // type 'awaiting_dispatch' - scrapes only the ones that have not been dispatched yet

    // Track on a global level that the Ebay Orders Syncer is actually running
    global.ebaySyncOrdersIsRunning = true;

    // Send an Ebay sync status update to the renderer process -> this will make the button spin and disable it until the sync is over
    const ebayOrderCheckerStartedAt = await moment().format('DD-MM-YYYY HH:mm:ss');
    await this.mainWindow.webContents.send('ebay-order-sync-status', { status: true, started_at: ebayOrderCheckerStartedAt });
    
    // Query the DB for Ebay accounts
    const ebayAccounts = await global
    .knex
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
    }).catch((error) => global.appLog.error(`${error} - inside ebay.syncOrders - line 1511`));

    // Check for corresponding cookie files
    const marketplacesCookies = await EbayAuth.canLogIn();

    // If there are any -> go to the marketplace -> login and get all listings from each page
    if (ebayAccounts.US && marketplacesCookies.US) {
      await this._loginAndScrapeOrders('US', type);
    }

    if (ebayAccounts.UK && marketplacesCookies.UK) {
      await this._loginAndScrapeOrders('UK', type);
    }

    if (ebayAccounts.DE && marketplacesCookies.DE) {
      await this._loginAndScrapeOrders('DE', type);
    }

    if (ebayAccounts.CA && marketplacesCookies.CA) {
      await this._loginAndScrapeOrders('CA', type);
    }

    if (ebayAccounts.IT && marketplacesCookies.IT) {
      await this._loginAndScrapeOrders('IT', type);
    }

    // Send a confirmation event to the renderer process that the syncing has concluded -> this will terminate the icon from spinning and enable the button again
    await this.mainWindow.webContents.send('ebay-order-sync-status', { status: false });
    await this.autoorderHelper.sendOrdersToFrontEnd();
  }

  markOrdersAsDispatched = async (orders = [], mode = 'auto', type = 'with-tracking') => {
    if (!this.markOrdersAsDispatchedBrowser) {
      try {
        // Firstly, check if the user has opted to mark his orders as dispatched
        const dalioUser = await global
        .knex('tbl_users')
        .where({ account: 'dalio' })
        .first()
        .then(row => row)
        .catch(e => global.appLog.error(`${e} - ebayAutoorder.markOrdersAsDispatched - line 139`));

        const userSettings = JSON.parse(dalioUser.settings);

        let ordersToBeMarked = [];

        if (orders !== undefined) {
          ordersToBeMarked = [...orders]
        } else {
          // Query the DB and return all Ebay orders with a status_code of 1 - have been ordered from source but not marked as ordered on Ebay
          ordersToBeMarked = await global.knex('tbl_orders')
          .where({ status_code: '1' })
          .then(rows => rows)
          .catch(error => global.appLog.error(`${error} - in ebayAutoorder.markOrdersAsDispatched - line 403`)); 
        }


        console.log('ordersToBeMarked', ordersToBeMarked.length);
        // If there are any orders to be marked as dispatched
        if (ordersToBeMarked.length > 0) {

          const ebayUSOrders = [];
          const ebayUKOrders = [];
          const ebayDEOrders = [];
          const ebayCAOrders = [];

          for ( let i = 0; i < ordersToBeMarked.length; i++ ) {

            await global.knex('tbl_orders')
            .where({ order_number: ordersToBeMarked[i].order_number })
            .update({ being_marked_as_shipped: '1' })
            .catch(e => global.appLog.error(`${e} - EbayAutoorder.markOrdersAsShipped - line 174`));

            await this.autoorderHelper.sendOrdersToFrontEnd();

            if (ordersToBeMarked[i].store_marketplace == 'US') {
              ebayUSOrders.push(ordersToBeMarked[i]);
            } else if (ordersToBeMarked[i].store_marketplace == 'UK') {
              ebayUKOrders.push(ordersToBeMarked[i]);
            } 
            // else if (ordersToBeMarked[i].store_marketplace == 'DE') {
            //   ebayDEOrders.push(ordersToBeMarked[i]);
            // } else if (ordersToBeMarked[i].store_marketplace == 'CA') {
            //   ebayCAOrders.push(ordersToBeMarked[i]);
            // }

          }

          global.markingEbayOrdersAsDispatched = true;

          this.markOrdersAsDispatchedBrowser = await puppeteer.launch({
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
    
          const page = await this.markOrdersAsDispatchedBrowser.newPage();
          await page.setViewport({ width: 1280, height: 800 });
          await page.setDefaultNavigationTimeout(0);

          // Listen for the 'disconnected' -> when the browser closes -> make sure none of the orders remain as being_marked_as_shipped
          this.markOrdersAsDispatchedBrowser.on('disconnected', () => {
            this.markOrdersAsDispatchedBrowser = false;

            global.knex('tbl_orders')
            .where({ being_marked_as_shipped: '1' })
            .then(orders => {
              if (orders.length > 0) {
                for (let i = 0; i < orders.length; i++) {
                  global.knex('tbl_orders')
                  .where({ order_number: orders[i].order_number })
                  .update({ being_marked_as_shipped: '0' })
                  .catch(e => global.appLog.error(`${e} - EbayAutoorder.markOrdersAsDispatched - line 228`));
                }
              }
              
              return null;
            })
            .catch(e => global.appLog.error(`${e} - EbayAutoorder.markOrdersAsDispatched - line 232`));
          });
    
          if (global.proxyUsername !== '' && global.proxyPassword !== '') {
            await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
          }
          
          if (ebayUSOrders.length > 0) {
            // Get the Ebay cookies from the file
            global.ebayCookies.US = await EbayAuth.canLogIn(true, 'US');
            if (global.ebayCookies.US) {

              if (mode === 'manual') {
                if (type === 'with-tracking') {
                  await this._markWithProxyTracking(this.markOrdersAsDispatchedBrowser, ebayUSOrders, 'US');
                } else if (type === 'without-tracking') {
                  await this._mark(this.markOrdersAsDispatchedBrowser, ebayUSOrders, 'US');
                }
              } else if (mode === 'auto') {
                if (
                  userSettings.autoorder.amazon.us_order_info.mark_ordered_products_as_shipped !== undefined && userSettings.autoorder.amazon.us_order_info.mark_ordered_products_as_shipped == '1'
                  ) {

                  if (userSettings.autoorder.amazon.us_order_info.mark_ordered_products_as_shipped_with_proxy_tracking == '1') {
                    await this._markWithProxyTracking(this.markOrdersAsDispatchedBrowser, ebayUSOrders, 'US');
                  } else {
                    await this._mark(this.markOrdersAsDispatchedBrowser, ebayUSOrders, 'US');
                  }
                }
              }

              
            }
          } 
          
          if (ebayUKOrders.length > 0) {
            // Get the Ebay cookies from the file
            global.ebayCookies.UK = await EbayAuth.canLogIn(true, 'UK');
            if (global.ebayCookies.UK) {

              if (mode === 'manual') {
                if (type === 'with-tracking') {
                  await this._markWithProxyTracking(this.markOrdersAsDispatchedBrowser, ebayUKOrders, 'UK');
                } else if (type === 'without-tracking') {
                  await this._mark(this.markOrdersAsDispatchedBrowser, ebayUKOrders, 'UK');
                }
              } else if (mode === 'auto') {
                if (
                  userSettings.autoorder.amazon.uk_order_info.mark_ordered_products_as_shipped !== undefined && userSettings.autoorder.amazon.uk_order_info.mark_ordered_products_as_shipped == '1'
                  ) {

                  if (userSettings.autoorder.amazon.uk_order_info.mark_ordered_products_as_shipped_with_proxy_tracking == '1') {
                    await this._markWithProxyTracking(this.markOrdersAsDispatchedBrowser, ebayUKOrders, 'UK');
                  } else {
                    await this._mark(this.markOrdersAsDispatchedBrowser, ebayUKOrders, 'UK');
                  }
                }
              }

            }
          } 

          await this.markOrdersAsDispatchedBrowser.close();

          // When done -> send all orders to front end
          await this.autoorderHelper.sendOrdersToFrontEnd();
          global.markingEbayOrdersAsDispatched = false;

          this.uploadSingleTracking();
        }

      } catch (e) {
        // Handle error
        global.appLog.error(`${e} - in ebayAutoorder.markOrdersAsDispatched - line 216`);

        if (this.markOrdersAsDispatchedBrowser) {
          await this.markOrdersAsDispatchedBrowser.close();
        }

        global.markingEbayOrdersAsDispatched = false;
        this.uploadSingleTracking();
      }
    } else {
      // TODO - send warning to the front end that an order is already being marked as dispatched
    }
  }

  leaveSingleBuyersFeedback = async order => {
    if (order !== undefined) {
      let orderIsInTheQueue = false;

      // Check if the current order is queued in the ordersQueue
      if (this.leaveFeedbackQueue.length > 0) {
        for (let i = 0; i < this.leaveFeedbackQueue.length; i++) {
          if (this.leaveFeedbackQueue[i].order_number === order.order_number) {
            orderIsInTheQueue = true;
          }
        }
      } 

      // console.log('order to leave feedback is in queue', orderIsInTheQueue, this.leaveFeedbackQueue.length);

      if (!orderIsInTheQueue) {
        this.leaveFeedbackQueue.push(order);
      }
    }

    if (this.leaveFeedbackQueue.length > 0) {
      if (!global.leavingOrderFeedback) {

        const orders = await global.knex('tbl_orders')
        .where({ order_number: this.leaveFeedbackQueue[0].order_number })
        .then(res => res)
        .catch(e => global.appLog.error(`${e} - in EbayAutoorder - leaveSingleBuyerFeedback- line 427`));

        this.leaveFeedbackQueue.shift();
        if (orders.length > 0) {
          await this.leaveBuyersFeedback(orders);
        }
      }
    }
  }

  leaveBuyersFeedback = async (orders = []) => {
    if (!this.leaveFeedbackBrowser) {
      try {
        global.leavingOrderFeedback = true;
        let ordersToLeaveFeedback = [];

        if (orders.length > 0) {
          ordersToLeaveFeedback = [...orders]
        } else {
          ordersToLeaveFeedback = await global.knex('tbl_orders')
          .where({ status_code: '2' })
          .orWhere({ status_code: '3' })
          .andWhere({ store_feedback: '0' })
          .whereNotNull('store_order_url')
          .then(rows => rows)
          .catch(error => global.appLog.error(`${error} - in ebayAutoorder.leaveBuyersFeedback - line 370`)); 
        }

        // If there are any orders to be marked as dispatched
        if (ordersToLeaveFeedback.length > 0) {

          const ebayUSOrders = [];
          const ebayUKOrders = [];
          const ebayDEOrders = [];
          const ebayCAOrders = [];

          for ( let i = 0; i < ordersToLeaveFeedback.length; i++ ) {

            await global.knex('tbl_orders')
            .where({ order_number: ordersToLeaveFeedback[i].order_number })
            .update({ leaving_store_feedback: '1' })
            .catch(e => global.appLog.error(`${e} - EbayAutoorder.leaveFeedback - line 374`));

            await this.autoorderHelper.sendOrdersToFrontEnd();

            if (ordersToLeaveFeedback[i].store_marketplace == 'US') {
              ebayUSOrders.push(ordersToLeaveFeedback[i]);
            } else if (ordersToLeaveFeedback[i].store_marketplace == 'UK') {
              ebayUKOrders.push(ordersToLeaveFeedback[i]);
            } 
          }

          this.leaveFeedbackBrowser = await puppeteer.launch({
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
    
          // const page = await this.leaveFeedbackBrowser.newPage();
          // await page.setViewport({ width: 1280, height: 800 });
          // await page.setDefaultNavigationTimeout(0);

          // Listen for the 'disconnected' -> when the browser closes -> make sure none of the orders remain as being_marked_as_shipped
          this.leaveFeedbackBrowser.on('disconnected', () => {
            this.leaveFeedbackBrowser = false;

            global.knex('tbl_orders')
            .where({ leaving_store_feedback: '1' })
            .update({ leaving_store_feedback: '0' })
            .catch(e => global.appLog.error(`${e} - EbayAutoorder.leaveFeedback - line 420`));
          });
          
          if (ebayUSOrders.length > 0) {
            // Get the Ebay cookies from the file
            global.ebayCookies.US = await EbayAuth.canLogIn(true, 'US');
            if (global.ebayCookies.US) {
              await this._leaveFeedback(this.leaveFeedbackBrowser, ebayUSOrders, 'US');         
            }
          } 
          
          if (ebayUKOrders.length > 0) {
            // Get the Ebay cookies from the file
            global.ebayCookies.UK = await EbayAuth.canLogIn(true, 'UK');
            if (global.ebayCookies.UK) {
              await this._leaveFeedback(this.leaveFeedbackBrowser, ebayUKOrders, 'UK');         
            }
          } 


          await this.leaveFeedbackBrowser.close();

          // When done -> send all orders to front end
          await this.autoorderHelper.sendOrdersToFrontEnd();
        }
        global.leavingOrderFeedback = false;
        this.leaveSingleBuyersFeedback();

      } catch (e) {
        // Handle error
        global.appLog.error(`${e} - in ebayAutoorder.markOrdersAsDispatched - line 216`);
        global.leavingOrderFeedback = false

        if (this.leaveFeedbackBrowser) {
          await this.leaveFeedbackBrowser.close();
        }

        this.leaveSingleBuyersFeedback();
      }
    }
  }

  _leaveFeedback = async (browser, orders, marketplace) => {
    const context = await browser.createIncognitoBrowserContext();
    // Create a new page in a pristine context.
    const page = await context.newPage();
  
    if (global.proxyUsername !== '' && global.proxyPassword !== '') {
      await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
    }

    try {
      if (marketplace == 'US') {
        await page.setCookie(...global.ebayCookies.US);
        // await page.goto(`https://www.ebay.com/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      } else if (marketplace == 'UK') {
        await page.setCookie(...global.ebayCookies.UK);
        // await page.goto(`https://www.ebay.co.uk/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      } else if (marketplace == 'DE') {
        await page.setCookie(...global.ebayCookies.DE);
        // await page.goto(`https://www.ebay.de/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      } else if (marketplace == 'CA') {
        await page.setCookie(...global.ebayCookies.CA);
        // await page.goto(`https://www.ebay.ca/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      } else if (marketplace == 'IT') {
        await page.setCookie(...global.ebayCookies.IT);
        // await page.goto(`https://www.ebay.it/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      }

      // await page.waitFor(5000);
        
      const ordersMarked = [];
      if (orders.length > 0) {
        for (let i = 0; i < orders.length; i++) {
          
          if (orders[i].store_feedback == '0') {

            await page.goto(orders[i].store_order_url, { waitUntil: 'networkidle0' });

            await EbayUtil.loginIfNecessary(page, marketplace);

            // document.querySelectorAll('div.feedback.float-left')
            const feedbackLeftIndicator = await page.$('div.feedback.float-left');

            if (feedbackLeftIndicator !== null) {
              const feedbackLeft = await page.evaluate(() => {
                const feedbackLeftSelector = document.querySelector('div.feedback.float-left');

                if (feedbackLeftSelector !== null) {
                  if (feedbackLeftSelector.classList.contains('enabled')) {
                    return true;
                  } else if (feedbackLeftSelector.classList.contains('disabled')) {
                    return false;
                  }
                }

                return null;
              });

              if (feedbackLeft !== null) {
                if (feedbackLeft) {
                  // Update database as feedback is already left
                  await global.knex('tbl_orders')
                  .where({ order_number: orders[i].order_number })
                  .update({ 
                    store_feedback: '1',
                    leaving_store_feedback: '0' 
                  })
                  .catch(e => global.appLog.error(`${e} - EbayAutoorder._leaveFeedback - line 524`));

                } else {
                  await feedbackLeftIndicator.click();
                  await page.waitForSelector('.feedback-wrapper', { visible: true, timeout: 60000 });
                  
                  // document.querySelector('input[type="radio"][value="STORED"]')
                  const storedFeedbackRadio = await page.$('input[type="radio"][value="STORED"]');

                  if (storedFeedbackRadio !== null) {
                    const storedFeedbackSelected = await page.evaluate(() => document.querySelector('input[type="radio"][value="STORED"]').checked);

                    if (!storedFeedbackSelected) {
                      await storedFeedbackRadio.click();
                    }

                    const leaveFeedbackButton = await page.$('.action-buttons .btn--primary');
                    if (leaveFeedbackButton !== null) {
                      await leaveFeedbackButton.click();
                      await page.waitForSelector('.feedback-wrapper', { hidden: true, timeout: 60000 });

                      // Update database as feedback is already left
                      await global.knex('tbl_orders')
                      .where({ order_number: orders[i].order_number })
                      .update({ 
                        store_feedback: '1',
                        leaving_store_feedback: '0' 
                      })
                      .then(() => Util.insertOrderLog(orders[i], 'Feedback left.', 'info'))
                      .catch(e => global.appLog.error(`${e} - EbayAutoorder._leaveFeedback - line 524`));
                    } else {
                      Util.insertOrderLog(orders[i], 'Cannot leave feedback. Please contact support.', 'error');
                      throw new Error(`Cannot leave feedback for order ${orders[i].order_number} as Dalio cannot find the 'Leave feedback' button`);
                    }
                  } else {
                    Util.insertOrderLog(orders[i], 'Cannot leave feedback. Please contact support.', 'error');
                    throw new Error(`Cannot leave feedback for order ${orders[i].order_number} as Dalio cannot find the stored feedback radio button`);
                  }
                }
              } else {
                Util.insertOrderLog(orders[i], 'Cannot leave feedback. Please contact support.', 'error');
                throw new Error(`Cannot leave feedback for order ${orders[i].order_number} as Dalio cannot determine if the feedback is left or not.`);
              }

            } else {
              Util.insertOrderLog(orders[i], 'Cannot leave feedback. Please contact support.', 'error');
              throw new Error(`Cannot leave feedback for order ${orders[i].order_number} as the feedback button cannot be found!`);
            }
          }
        }
      }
  
      // Close the context browser
      await context.close();
    } catch (e) {
      global.appLog.error(`${e} - inside ebay._leaveFeedback() - line 574`);
      await context.close();

      await global.knex('tbl_orders')
      .where({ leaving_store_feedback: '1' })
      .update({ leaving_store_feedback: '0' })
      .catch(e => global.appLog.error(`${e} -> EbayAutoorder.js - line 584`));
    }
  }

  _loginAndScrapeOrders = async (marketplace: string, type) => {
    try {
      this.ordersScraperBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        slowMo: 100,
        devtools: false,
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
        args: ['--disable-webgl'],
      });

      const page = await this.ordersScraperBrowser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setDefaultNavigationTimeout(0);

      if (global.proxyUsername !== '' && global.proxyPassword !== '') {
        await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
      }
      
      let canScrapeThisMarketplace = true;
      if (marketplace === 'US') {
        // Get the Ebay cookies from the file
        global.ebayCookies.US = await EbayAuth.canLogIn(true, 'US');
        if (!global.ebayCookies.US) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.US);
          // /?filter=status%3AALL_ORDERS&limit=200
          await page.goto(`https://www.ebay.com/sh/ord/?filter=timerange%3ALAST90D%2Cstatus%3AALL_ORDERS&limit=200`, { waitUntil: 'networkidle0' });
        }
      } else if (marketplace === 'UK') {
        global.ebayCookies.UK = await EbayAuth.canLogIn(true, 'UK');
        if (!global.ebayCookies.UK) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.UK);
          await page.goto('https://www.ebay.co.uk/sh/ord/?filter=timerange%3ALAST90D%2Cstatus%3AALL_ORDERS&limit=200', { waitUntil: 'networkidle0' });
        }
      } else if (marketplace === 'DE') {
        global.ebayCookies.DE = await EbayAuth.canLogIn(true, 'DE');
        if (!global.ebayCookies.DE) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.DE);
          await page.goto('https://www.ebay.de/sh/ord/?filter=timerange%3ALAST90D%2Cstatus%3AALL_ORDERS&limit=200', { waitUntil: 'networkidle0' });
        }
      } else if (marketplace === 'CA') {
        global.ebayCookies.CA = await EbayAuth.canLogIn(true, 'CA');
        if (!global.ebayCookies.CA) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.CA);
          await page.goto('https://www.ebay.ca/sh/ord/?filter=timerange%3ALAST90D%2Cstatus%3AALL_ORDERS&limit=200', { waitUntil: 'networkidle0' });
        }
      } else if (marketplace === 'IT') {
        global.ebayCookies.IT = await EbayAuth.canLogIn(true, 'IT');
        if (!global.ebayCookies.IT) {
          canScrapeThisMarketplace = false;
        } else {
          await page.setCookie(...global.ebayCookies.IT);
          await page.goto('https://www.ebay.it/sh/ord/?filter=timerange%3ALAST90D%2Cstatus%3AALL_ORDERS&limit=200', { waitUntil: 'networkidle0' });
        }
      }

      if (canScrapeThisMarketplace) {
        // If the login screen shows -> log in
        await EbayUtil.loginIfNecessary(page, marketplace);
        
        // throw 'WAIT';

        // Represents a user delay -> randomize in the future
        await page.waitFor(3000);
        // await Util.autoScroll(page);

        // Find the total number of productpages in the current marketplace
        const totalNumberOfProductPages = await this._getTotalNumberOfPages(page);

        // If there is more than one page of listings in the marketplace
        if (totalNumberOfProductPages > 1) {
          // Iterate the this._scrapeOrdersOnSinglePage function the amount of times necessary
          for (let i = 0; i < totalNumberOfProductPages; i++) {
            await this._scrapeOrdersOnSinglePage(page, marketplace, type);
            // Check if there is 'Next' button for the orders -> click it
            await this._handleNextPageButton(page);
          }
        } else {
          // If there is only one page of orders -> run the function once
          await this._scrapeOrdersOnSinglePage(page, marketplace, type);
        }
      }

      // When everything has concluded -> close the scraper browser
      await this.ordersScraperBrowser.close(); 

      // Check if the orders actually scraped count is not 0
      if (this.ordersScraped.length !== 0) {

        // Query the DB and return all orders that are on Ebay
        const ordersInDatabase = await global
        .knex('tbl_orders')
        .then(rows => rows)
        .catch(error => global.appLog.error(`${error} - in ebay.loginAndScrapeOrders - line 1626`)); 

        // Query the DB and return all Ebay listings
        const listingsInDatabase = await global
        .knex('tbl_listings')
        .then(rows => rows)
        .catch(error => global.appLog.error(`${error} - in ebay.loginAndScrapeOrders - line 1632`)); 

        // Iterate through the array that holds the scraped orders
        this.ordersScraped.forEach(order => {          
          const orderManipulated = JSON.parse(JSON.stringify(order));

          // Check if each of the orders is not already in the DB -> assume false
          let orderIsInDatabase = false;

          // Track if the order has already been connected to listing source url -> assume false
          let orderConnectedToSupplier = false;

          // Track if the order can be matched to a listing from the DB -> assume false
          let orderIsMatchedToAListing = false;

          // Check if there are any orders in the database
          if (ordersInDatabase.length > 0) {
            // if yes, iterate through each of them
            ordersInDatabase.forEach(dbOrder => {
              // Compare the iterated order from the DB with the iterated order from the array that was just scraped -> if their order numbers equate -> mark the order as existing
              if (dbOrder.order_number == order.order_number) {
                orderIsInDatabase = true;

                // An order can already be ordered from Amazon but not marked as ordered on Ebay -> status 1 - DO NOT override it
                if (orderManipulated.status_code == '0' && dbOrder.status_code !== '0') {
                  orderManipulated.status_code = dbOrder.status_code;
                }
                
                // If the iterated order in the DB has a supplier_url -> mark it as connected to a supplier 
                if (dbOrder.supplier_url !== undefined && dbOrder.supplier_url !== null && dbOrder.supplier_url !== '') {
                  orderConnectedToSupplier = true;
                }
              }
            });
          }

          // Iterate through all of the listings in the DB
          listingsInDatabase.forEach(dbListing => {
            // If the iterated listing`s store_id equates to the store_id of the iterated order from the scraped array 
            if (dbListing.store_id == order.store_id) {
              // Mark the order as matching a listing in the DB
              orderIsMatchedToAListing = true;
              
              if (dbListing.supplier_url !== undefined && 
                  dbListing.supplier_url !== null &&
                  dbListing.supplier !== undefined &&
                  dbListing.supplier !== null &&
                  dbListing.supplier_id !== undefined &&
                  dbListing.supplier_id !== null) {
                orderManipulated.supplier_url = dbListing.supplier_url;
                orderManipulated.supplier = dbListing.supplier;
                orderManipulated.supplier_id = dbListing.supplier_id;
                orderManipulated.matched_listing_store_id = dbListing.store_id;
              }
            }
          });

          if (orderManipulated.status_code !== '2' && (!orderIsMatchedToAListing || 
              orderManipulated.supplier_url == undefined || 
              orderManipulated.supplier_url == null ||
              orderManipulated.supplier == undefined ||
              orderManipulated.supplier == null ||
              orderManipulated.supplier_id == null ||
              orderManipulated.supplier_id == undefined)) {

                orderManipulated.supplier_url = null;
                orderManipulated.supplier = null;
                orderManipulated.supplier_id = null;
                orderManipulated.matched_listing_store_id = null;

                const escapedLog = encodeURI(`Order #${orderManipulated.order_number} with item name (${orderManipulated.item_name}) cannot match to a listing in Dalio. Please make sure that you have added such a listing.`);
                global.log.error(escapedLog);
          }

          // If the current order is already in the DB -> just update some of its data that might have changed
          if (orderIsInDatabase) {

            // If ALL orders are scraped OR (just the orders that are awaiting dispatch AND the currently iterated order status code is 0 (it has not yet been dispatched)) -> update all of its information
            if (type === 'all' || (type === 'awaiting_dispatch' && orderManipulated.status_code === '0')) {
              global
              .knex('tbl_orders')
              .where({ order_number: orderManipulated.order_number })
              .update({
                status: orderManipulated.status,
                status_code: orderManipulated.status_code,
                long_ebay_order_number: orderManipulated.long_ebay_order_number,
                item_name: orderManipulated.item_name,
                matched_listing_store_id: orderManipulated.matched_listing_store_id,
                image: orderManipulated.image,
                date_sold: orderManipulated.date_sold,
                parsed_date_sold: Util.parseEbayDate(orderManipulated.date_sold),
                quantity: orderManipulated.quantity,
                store: 'ebay',
                store_marketplace: marketplace,
                store_order_url: orderManipulated.store_order_url,
                supplier: orderManipulated.supplier,
                supplier_id: orderManipulated.supplier_id,
                supplier_url: orderManipulated.supplier_url,
                buyer_name: orderManipulated.buyer_name,
                buyer_phone: orderManipulated.buyer_phone,
                buyer_email: orderManipulated.buyer_email,
                buyer_note: orderManipulated.buyer_note,
                post_to_name: orderManipulated.post_to_name,
                post_to_address_field: orderManipulated.post_to_address_field,
                post_to_address_field_2: orderManipulated.post_to_address_field_2,
                post_to_city: orderManipulated.post_to_city,
                post_to_state_province: orderManipulated.post_to_state_province,
                post_to_country: orderManipulated.post_to_country,
                post_to_postcode: orderManipulated.post_to_postcode,
                sold_for: orderManipulated.sold_for,
                postage_method: orderManipulated.postage_method
              }).catch(error => global.appLog.error(`${error} - inside ebay.loginAndScrapeOrders - line 1650`));
            } else if (type === 'awaiting_dispatch' && orderManipulated.status_code !== '0') {

              // Else if just the orders that are awaiting dispatch have been deep scraped and the currently iterated order`s status code is NOT 0 -> update the orders information without the buyers information (it has not been scraped)
              global
              .knex('tbl_orders')
              .where({ order_number: orderManipulated.order_number })
              .update({
                status: orderManipulated.status,
                // status_code: orderManipulated.status_code,
                long_ebay_order_number: orderManipulated.long_ebay_order_number,
                matched_listing_store_id: orderManipulated.matched_listing_store_id,
                supplier: orderManipulated.supplier,
                supplier_id: orderManipulated.supplier_id,
                supplier_url: orderManipulated.supplier_url,
                buyer_note: orderManipulated.buyer_note
              }).catch(error => global.appLog.error(`${error} - inside ebay.loginAndScrapeOrders - line 1806`));
            }
          } else {
            // Else if it is not already in the DB -> insert all of its data 
            if (type === 'awaiting_dispatch' && orderManipulated.status_code !== '2') {

              global
              .knex('tbl_orders')
              .insert({
                status: orderManipulated.status,
                status_code: orderManipulated.status_code,
                item_name: orderManipulated.item_name,
                order_number: orderManipulated.order_number,
                long_ebay_order_number: orderManipulated.long_ebay_order_number,
                store_order_url: orderManipulated.store_order_url,
                store_id: orderManipulated.store_id,
                matched_listing_store_id: orderManipulated.matched_listing_store_id,
                image: orderManipulated.image,
                date_sold: orderManipulated.date_sold,
                parsed_date_sold: Util.parseEbayDate(orderManipulated.date_sold),
                quantity: orderManipulated.quantity,
                store: 'ebay',
                store_marketplace: marketplace,
                supplier: orderManipulated.supplier,
                supplier_id: orderManipulated.supplier_id,
                supplier_url: orderManipulated.supplier_url,
                buyer_name: orderManipulated.buyer_name,
                buyer_phone: orderManipulated.buyer_phone,
                buyer_email: orderManipulated.buyer_email,
                buyer_note: orderManipulated.buyer_note,
                post_to_name: orderManipulated.post_to_name,
                post_to_address_field: orderManipulated.post_to_address_field,
                post_to_address_field_2: orderManipulated.post_to_address_field_2,
                post_to_city: orderManipulated.post_to_city,
                post_to_state_province: orderManipulated.post_to_state_province,
                post_to_country: orderManipulated.post_to_country,
                post_to_postcode: orderManipulated.post_to_postcode,
                sold_for: orderManipulated.sold_for,
                postage_method: orderManipulated.postage_method,
                synced_at: global.knex.fn.now()
              }).catch(error => global.appLog.error(`${error} - inside ebay.loginAndScrapeOrders - line 1724`));

              Util.insertOrderLog(orderManipulated, 'Synced from eBay.');
            } else if (type === 'all') {
              global
              .knex('tbl_orders')
              .insert({
                status: orderManipulated.status,
                status_code: orderManipulated.status_code,
                item_name: orderManipulated.item_name,
                order_number: orderManipulated.order_number,
                long_ebay_order_number: orderManipulated.long_ebay_order_number,
                store_order_url: orderManipulated.store_order_url,
                store_id: orderManipulated.store_id,
                matched_listing_store_id: orderManipulated.matched_listing_store_id,
                image: orderManipulated.image,
                date_sold: orderManipulated.date_sold,
                parsed_date_sold: Util.parseEbayDate(orderManipulated.date_sold),
                quantity: orderManipulated.quantity,
                store: 'ebay',
                store_marketplace: marketplace,
                supplier: orderManipulated.supplier,
                supplier_id: orderManipulated.supplier_id,
                supplier_url: orderManipulated.supplier_url,
                buyer_name: orderManipulated.buyer_name,
                buyer_phone: orderManipulated.buyer_phone,
                buyer_email: orderManipulated.buyer_email,
                buyer_note: orderManipulated.buyer_note,
                post_to_name: orderManipulated.post_to_name,
                post_to_address_field: orderManipulated.post_to_address_field,
                post_to_address_field_2: orderManipulated.post_to_address_field_2,
                post_to_city: orderManipulated.post_to_city,
                post_to_state_province: orderManipulated.post_to_state_province,
                post_to_country: orderManipulated.post_to_country,
                post_to_postcode: orderManipulated.post_to_postcode,
                sold_for: orderManipulated.sold_for,
                postage_method: orderManipulated.postage_method,
                synced_at: global.knex.fn.now()
              }).catch(error => global.appLog.error(`${error} - inside ebay.loginAndScrapeOrders - line 1724`));

              Util.insertOrderLog(orderManipulated, 'Synced from eBay.');
            
            }
          }
        });
      }

      console.log('Orders scraped in total: ', this.ordersScraped.length);
      console.log('Orders that are awaiting dispatch: ', this.ordersAwaitingDispatchScraped.length);

      global.log.info(`Dalio synced ${this.ordersAwaitingDispatchScraped.length} orders that are awaiting dispatch from your Ebay ${marketplace} account.`);
      // Reset tracking arrays
      this.ordersScraped = [];
      this.ordersAwaitingDispatchScraped = [];
    } catch (error) {
      global.appLog.error(`${error} in ebay.loginAndScrapeOrders - line 1709`);
      // If an arbitrary error has occurred (sometimes happens) -> close the browser
      this.ordersScraperBrowser.close();
      // Reset tracking arrays
      this.ordersScraped = [];
      this.ordersAwaitingDispatchScraped = [];
      this.mainWindow.webContents.send('ebay-order-sync-status', { status: true });

    }
  };

  _scrapeOrdersOnSinglePage = async (page, marketplace, type) => {
    await EbayUtil.loginIfNecessary(page, marketplace);
    // Scroll to bottom of a page so everything can be loaded
    await Util.autoScroll(page);
  
    // Scrape the listed orders of the page - table data
    const listedOrders = await page.evaluate(marketplace => {
      // Create an array of all table rows (trs) that represent orders on the page
      const trs = Array.from(document.querySelectorAll('tr.order-info'));
      let listedOrdersArray = [];
    
      // Iterate through the created array with orders info and extract specific information
      listedOrdersArray = trs.map(tr => {
        const singleProductObject = {};
    
        singleProductObject.status = tr.children[1].children[0].children[0].textContent;
    
        singleProductObject.status_code = '2';
    
        // Add the order`s status code to be used for filtering
        if ((singleProductObject.status.toLowerCase().includes('ship') && !singleProductObject.status.toLowerCase().includes('shipped')) || (singleProductObject.status.toLowerCase().includes('dispatch') && !singleProductObject.status.toLowerCase().includes('dispatched'))) {
          // An order can already be ordered from Amazon but not marked as ordered on Ebay -> status 1 - DO NOT override it
          // if (singleProductObject.status_code !== undefined && singleProductObject.status_code !== '1') {
            singleProductObject.status_code = '0';
          // }
        }
    
        singleProductObject.order_number = tr.children[2].children[0].children[0].children[0].textContent;
    
        /* Get the order quantity string and run a regex match on it to get the order quantity number
        * assume 1 quantity if a number cannot be parsed
        */
        const orderQuantityTextContent = tr.children[3].children[0].textContent;
        const quantityRegEx = orderQuantityTextContent.match(/\d+/);
        if (quantityRegEx !== null) {
          singleProductObject.quantity = quantityRegEx[0];
        } else {
          singleProductObject.quantity = 1;
        }
    
        // Get the order price string and run a regex match on it to get the order price number
        const soldForRegEx = tr.children[4].textContent.match(/[\d\.\,]+/g);
        if (soldForRegEx !== null) {
          singleProductObject.sold_for = soldForRegEx[0] ;
        } else {
          singleProductObject.sold_for = null;
        }
        
        // Get the date sold field
        singleProductObject.date_sold =  tr.children[6].textContent;
    
        // Will use that to get the next tr -> which holds the item name
        const orderIdNumbers = tr.getAttribute('id').match(/orderid_(\d+)-(\d+)__order-info/);
    
        if(orderIdNumbers !== null) {
          const infoTr = document.querySelector(`#orderid_${orderIdNumbers[1]}-${orderIdNumbers[2]}__item-info_0`);
    
          const itemIdRegEx = document.querySelector(`#orderid_${orderIdNumbers[1]}-${orderIdNumbers[2]}__item-info_0 .item-itemID`).textContent.match(/\d+/);
          if (itemIdRegEx !== null) {
            singleProductObject.store_id = itemIdRegEx[0];
          }

          singleProductObject.long_ebay_order_number = orderIdNumbers[2];

          const buyerNoteSelector = document.querySelector(`#orderid_${orderIdNumbers[1]}-${orderIdNumbers[2]}__buyer-note .buyer-note`);

          singleProductObject.buyer_note = '';
          if (buyerNoteSelector !== null) {
            singleProductObject.buyer_note = buyerNoteSelector.innerText;
          }

          const imageSelector = document.querySelector(`#orderid_${orderIdNumbers[1]}-${orderIdNumbers[2]}__item-info_0 td div.thumb span a div img`);

          if (imageSelector !== null) {
            singleProductObject.image = imageSelector.getAttribute('src');
          }

          singleProductObject.item_name = document.querySelector(`#orderid_${orderIdNumbers[1]}-${orderIdNumbers[2]}__item-info_0 td div.purchase-details p span.item-title a`).textContent;
        }
    
        // This is the link where we get the buyer details from
        const buyerDetailsHREF = tr.children[2].children[0].children[0].children[0].getAttribute('href');

        if (marketplace === 'US') {
          singleProductObject.buyerDetails = `https://ebay.com${buyerDetailsHREF}`;
        } else if (marketplace === 'UK') {
          singleProductObject.buyerDetails = `https://ebay.co.uk${buyerDetailsHREF}`;
        } else if (marketplace === 'DE') {
          singleProductObject.buyerDetails = `https://ebay.de${buyerDetailsHREF}`;
        } else if (marketplace === 'CA') {
          singleProductObject.buyerDetails = `https://ebay.ca${buyerDetailsHREF}`;
        }
        return singleProductObject;
      });  
      
      return listedOrdersArray;
    }, marketplace);
    
    this.ordersScraped.push(...listedOrders);

    // If a scrape of ALL orders is required -> do it
    if (type === 'all') {
      let listedOrdersChunks = [];
      // Split the scraped orders array in chunks to speed up the additional order info scrape
      if (listedOrders.length >= 30 && listedOrders.length <= 100) {
        listedOrdersChunks = Util.splitArrayInChunks(listedOrders, 30);
      } else if (listedOrders.length > 100) {
        listedOrdersChunks = Util.splitArrayInChunks(listedOrders, 50);
      }
  
      const promises = [];
      if (listedOrdersChunks.length > 1) {
        for (let i = 0; i < listedOrdersChunks.length; i++) {
          promises.push(this._scrapeBuyerOrderInfo(listedOrdersChunks[i]));
        }
      } else {
        promises.push(this._scrapeBuyerOrderInfo(listedOrders));
      }
  
      await Promise.all(promises);
    } else if (type === 'awaiting_dispatch') {

      // Filter out all orders that have already been dispatched/canceled etc
      const ordersAwaitingDispatch = await listedOrders.filter(order => order.status_code == '0');
  
      console.log('orders awaiting dispatch', ordersAwaitingDispatch.length);
      // Filter out all orders that are yet to be dispatched
      // const ordersAlreadyDispatched = await listedOrders.filter(order => order.status_code !== '0');

      // If there are any orders that have been dispatched -> update the ordersScraped array -> that way the scraper will not scrape their buyer details again and again which will speed up the process
      // if (ordersAlreadyDispatched.length > 0) {
      //   this.ordersScraped = [...ordersAlreadyDispatched];
      // }

      let ordersAwaitingDispatchChunks = [];
      // Split the scraped orders array in chunks to speed up the additional order info scrape
      if (ordersAwaitingDispatch.length >= 30 && ordersAwaitingDispatch.length <= 100) {
        ordersAwaitingDispatchChunks = Util.splitArrayInChunks(ordersAwaitingDispatch, 30);
      } else if (ordersAwaitingDispatch.length > 100) {
        ordersAwaitingDispatchChunks = Util.splitArrayInChunks(ordersAwaitingDispatch, 50);
      }
  
      const promises = [];
      if (ordersAwaitingDispatchChunks.length > 1) {
        for (let i = 0; i < ordersAwaitingDispatchChunks.length; i++) {
          promises.push(this._scrapeBuyerOrderInfo(ordersAwaitingDispatchChunks[i]));
        }
      } else if (ordersAwaitingDispatchChunks.length <= 1) {
        promises.push(this._scrapeBuyerOrderInfo(ordersAwaitingDispatch));
      }
  
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }

    if (this.ordersScraped.length !== 0) {
      for (let i = 0; i < this.ordersScraped.length; i++) {
        for (let k = 0; k < this.ordersAwaitingDispatchScraped.length; k++) {
          if (this.ordersScraped[i].order_number === this.ordersAwaitingDispatchScraped[k].order_number) {
            this.ordersScraped[i] = JSON.parse(JSON.stringify(this.ordersAwaitingDispatchScraped[k]));
          }
        }
      }
    }
  }

  _scrapeBuyerOrderInfo = async (listedOrdersChunk) => {
    const page = await this.ordersScraperBrowser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultNavigationTimeout(60000); 
  
    const listedOrdersChunkLocal = listedOrdersChunk;
    // Iterate through the created array with partial order information
    for (const [index, order] of listedOrdersChunkLocal.entries()) {
      // Go to the order`s buyer details page, where we can get the buyer info from
      await page.goto(order.buyerDetails, { waitUntil: 'networkidle0' });
      try {
        const buyerDetails = await page.evaluate(() => {
          const buyerDetailsObject = {};
          const purchaseDetailsDL = document.querySelector('.purchase-details dl');
  
          // First get the buyer phone number -> if not present, assume null
          if (document.querySelector('div.phone-field dd .copy-text span.txt-tobe-copied') !== null) {
            buyerDetailsObject.buyer_phone = document.querySelector('div.phone-field dd .copy-text span.txt-tobe-copied').textContent;
          } else {
            buyerDetailsObject.buyer_phone = null;
          }
          
          if (purchaseDetailsDL !== null) {
            if (purchaseDetailsDL.children[1].querySelector('dt.info-label') !== null && purchaseDetailsDL.children[1].querySelector('dt.info-label').textContent.toLowerCase().includes('email')) {
              // Then get the buyer`s email address -> if not present, assume null
              if (purchaseDetailsDL.children[1].querySelector('dd .copy-text span.txt-tobe-copied') !== null) {
                buyerDetailsObject.buyer_email = purchaseDetailsDL.children[1].querySelector('dd .copy-text span.txt-tobe-copied').textContent;
              } else {
                buyerDetailsObject.buyer_email = null;
              }
            } else {
              buyerDetailsObject.buyer_email = null;
            }
          } else {
            buyerDetailsObject.buyer_email = null;
          }
          
          
  
          // Here the shipping details will be parsed from a container
          const addressDetailsSelector = document.querySelector('div.shipping-details dl.info-wrapper');
          
          // Iterate through the total amount of shipping information fields
          for (let i = 0; i < addressDetailsSelector.children.length; i++) {
            const childComponent = addressDetailsSelector.children[i];
  
            // If the iterated child has 'Postage method' or 'Shipping method' parse it
            if (childComponent.children[0] !== undefined && !childComponent.children[0].textContent.toLowerCase().includes('full address') && (childComponent.children[0].textContent.toLowerCase().includes('postage method') || childComponent.children[0].textContent.toLowerCase().includes('shipping method'))) {
  
              buyerDetailsObject.postage_method = childComponent.children[1].textContent;
  
            } else if (childComponent.children[0] !== undefined && !childComponent.children[0].textContent.toLowerCase().includes('full address') && (childComponent.children[0].textContent.toLowerCase().includes('post to') || childComponent.children[0].textContent.toLowerCase().includes('ship to'))) {
  
                buyerDetailsObject.post_to_name = childComponent.children[1].children[0].children[0].children[1].textContent;
  
            } else if (childComponent.children[0] !== undefined && !childComponent.children[0].textContent.toLowerCase().includes('full address') && childComponent.children[0].textContent.toLowerCase().includes('street') && addressDetailsSelector.children[i].classList.contains('street1')) {
  
              buyerDetailsObject.post_to_address_field = childComponent.children[1].children[0].children[0].children[1].textContent;
  
            } else if (childComponent.children[0] !== undefined && !childComponent.children[0].textContent.toLowerCase().includes('full address') && childComponent.children[0].textContent == '' && addressDetailsSelector.children[i].classList.contains('street2')) {
  
              if (!childComponent.children[1].children[0].children[0].children[1].textContent.toLowerCase().includes('ebay')){
                buyerDetailsObject.post_to_address_field_2 = childComponent.children[1].children[0].children[0].children[1].textContent;
              } else {

                // str.replace(/\ebay(.*)/, '');

                buyerDetailsObject.post_to_address_field_2 = childComponent.children[1].children[0].children[0].children[1].textContent.replace(/\ebay(.*)/, '');
              }
              
  
            } else if (childComponent.children[0] !== undefined && !childComponent.children[0].textContent.toLowerCase().includes('full address') && (childComponent.children[0].textContent.toLowerCase().includes('city') || childComponent.children[0].textContent.toLowerCase().includes('city'))) {
  
              buyerDetailsObject.post_to_city = childComponent.children[1].children[0].children[0].children[1].textContent;
  
            } else if (childComponent.children[0] !== undefined && !childComponent.children[0].textContent.toLowerCase().includes('full address') && (childComponent.children[0].textContent.toLowerCase().includes('state/province') || childComponent.children[0].textContent.toLowerCase().includes('state') || childComponent.children[0].textContent.toLowerCase().includes('province'))) {
  
              buyerDetailsObject.post_to_state_province = addressDetailsSelector.children[i].children[1].children[0].children[0].children[1].textContent;
  
            } else if (childComponent.children[0] !== undefined && !childComponent.children[0].textContent.toLowerCase().includes('full address') && (childComponent.children[0].textContent.toLowerCase().includes('postcode') || childComponent.children[0].textContent.toLowerCase().includes('zip code'))) {
  
              buyerDetailsObject.post_to_postcode = addressDetailsSelector.children[i].children[1].children[0].children[0].children[1].textContent;
  
            } else if (childComponent.children[0] !== undefined && !childComponent.children[0].textContent.toLowerCase().includes('full address') && (childComponent.children[0].textContent.toLowerCase().includes('country/region') || childComponent.children[0].textContent.toLowerCase().includes('country') || childComponent.children[0].textContent.toLowerCase().includes('region'))) {
  
              buyerDetailsObject.post_to_country = addressDetailsSelector.children[i].children[1].children[0].children[0].children[1].textContent;
              
            }
          }
  
          return buyerDetailsObject;
        });
  
        // Populate the additional buyer info to every corresponding order
        listedOrdersChunkLocal[index].buyer_phone = buyerDetails.buyer_phone;
        listedOrdersChunkLocal[index].buyer_email = buyerDetails.buyer_email;
        listedOrdersChunkLocal[index].post_to_name = buyerDetails.post_to_name;
        listedOrdersChunkLocal[index].post_to_address_field = buyerDetails.post_to_address_field;
        listedOrdersChunkLocal[index].post_to_address_field_2 = buyerDetails.post_to_address_field_2;
        listedOrdersChunkLocal[index].post_to_city = buyerDetails.post_to_city;
        listedOrdersChunkLocal[index].post_to_state_province = buyerDetails.post_to_state_province;
        listedOrdersChunkLocal[index].post_to_postcode = buyerDetails.post_to_postcode;
        listedOrdersChunkLocal[index].post_to_country = buyerDetails.post_to_country;
        listedOrdersChunkLocal[index].postage_method = buyerDetails.postage_method;
        listedOrdersChunkLocal[index].store_order_url = await page.url();
      } catch (e) {
        global.appLog.error(`${e} - in ebay.this._scrapeBuyerOrderInfo - line 2119`);
      }
    }
  
    this.ordersAwaitingDispatchScraped.push(...listedOrdersChunkLocal);
    await page.close();
  }

  
  _mark = async (browser, orders, marketplace) => {
    const context = await browser.createIncognitoBrowserContext();
    // Create a new page in a pristine context.
    const page = await context.newPage();
  
    try {
      if (marketplace == 'US') {
        await page.setCookie(...global.ebayCookies.US);
        await page.goto(`https://www.ebay.com/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      } else if (marketplace == 'UK') {
        await page.setCookie(...global.ebayCookies.UK);
        await page.goto(`https://www.ebay.co.uk/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      } else if (marketplace == 'DE') {
        await page.setCookie(...global.ebayCookies.DE);
        await page.goto(`https://www.ebay.de/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      } else if (marketplace == 'CA') {
        await page.setCookie(...global.ebayCookies.CA);
        await page.goto(`https://www.ebay.ca/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      } else if (marketplace == 'IT') {
        await page.setCookie(...global.ebayCookies.IT);
        await page.goto(`https://www.ebay.it/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
      }
  
      await EbayUtil.loginIfNecessary(page, marketplace);
  
      const ordersMarked = [];
      console.log('orders length', orders.length);
      if (orders.length > 0) {
        for (let i = 0; i < orders.length; i++) {
          // grid-table-bulk-checkbox_order153662106044-1959114670005 - OLD
          // document.querySelector('.bulk-checkbox-cell input[data-ordernumber="03-05462-16233"]')
          const orderCheckInput = await page.$(`.bulk-checkbox-cell input[data-ordernumber="${orders[i].order_number}"]`);
          if (orderCheckInput !== null) {
            await orderCheckInput.click();
            ordersMarked.push(orders[i]);
          }
        }

        const bulkShippingButton = await page.$('.bulk-shipping button');

        if (bulkShippingButton !== null) {
          await bulkShippingButton.click();
        }

        // Click on mark as shipped
        await page.click('.bulk-shipping #bulkMarkShipped');
  
        // A popup might appear -> confirm marking orders as shipped

        const markingAsShippedPopup = await page.$('#gen-dialog-ok');

        if (markingAsShippedPopup !== null) {
          await markingAsShippedPopup.click();
        }

        await page.waitFor(5000);

        if (ordersMarked.length > 0) {
          for (let i = 0; i < ordersMarked.length; i++) {
            await global.knex('tbl_orders')
            .where({ order_number: ordersMarked[i].order_number })
            .update({ 
              status_code: '2',
              being_marked_as_shipped: '0' 
            })
            .then(() => Util.insertOrderLog(ordersMarked[i], 'Marked as shipped without a tracking number.'))
            .catch(e => global.appLog.error(`${e} -> EbayAutoorder.js - line 895`));
          }
        }
        // @TODO - add support for multiple pages
        // if (orders.length > 200) {
        //   // Go to next page
        // }
  
      }
  
      // Close the context browser
      await context.close();
    } catch (e) {
      global.appLog.error(`${e} - inside ebay.mark() - line 2750`);
      await context.close();

      if (orders.length > 0) {
        for (let i = 0; i < orders.length; i++) {
          await global.knex('tbl_orders')
          .where({ order_number: orders[i].order_number })
          .update({ 
            being_marked_as_shipped: '0' 
          })
          .catch(e => global.appLog.error(`${e} -> EbayAutoorder.js - line 933`));
        }
      }
    }
  }

  _markWithProxyTracking = async (browser, orders, marketplace) => {
    const context = await browser.createIncognitoBrowserContext();
    // Create a new page in a pristine context.
    const page = await context.newPage();
  
    if (marketplace == 'US') {
      await page.setCookie(...global.ebayCookies.US);
      await page.goto(`https://www.ebay.com/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
    } else if (marketplace == 'UK') {
      await page.setCookie(...global.ebayCookies.UK);
      await page.goto(`https://www.ebay.co.uk/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
    } else if (marketplace == 'DE') {
      await page.setCookie(...global.ebayCookies.DE);
      await page.goto(`https://www.ebay.de/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
    } else if (marketplace == 'CA') {
      await page.setCookie(...global.ebayCookies.CA);
      await page.goto(`https://www.ebay.ca/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
    } else if (marketplace == 'IT') {
      await page.setCookie(...global.ebayCookies.IT);
      await page.goto(`https://www.ebay.it/sh/ord/?filter=status:AWAITING_SHIPMENT&limit=200`, { waitUntil: 'networkidle0' });
    }

    await page.waitFor(5000);
    
    await EbayUtil.loginIfNecessary(page, marketplace);

    const ordersMarked = [];
    if (orders.length > 0) {
      for (let i = 0; i < orders.length; i++) {
        try {
          if (orders[i].proxy_tracking_number !== null && orders[i].tracking_uploaded !== '1') {

            await page.goto(orders[i].store_order_url, { waitUntil: 'domcontentloaded' });

            const trackingNumberEntered = await page.$('span.tracking-number');

            if (trackingNumberEntered !== null) {
              // Tracking has been entered, so update the DB accordingly
              await global.knex('tbl_orders')
              .where({ order_number: orders[i].order_number })
              .update({ 
                being_marked_as_shipped: '0',
                status_code: '2',
                tracking_uploaded: '1'
              })
              .catch(e => global.appLog.error(`${e} - EbayAutoorder - _markWithProxyTracking - line 1073`));

            } else {
              const orderAddTrackingButton = await page.$(`div.shipping-details dl div dd a`);

              if (orderAddTrackingButton !== null) {
                // await Promise.all([
                //   page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 180000 }),
                //   orderAddTrackingButton.click()
                // ]);

                const addTrackingURL = await page.evaluate(() => document.querySelector('div.shipping-details dl div dd a').href);

                if (addTrackingURL !== undefined) {
                  await page.goto(addTrackingURL, { waitUntil: 'domcontentloaded' });
                  
                  await EbayUtil.loginIfNecessary(page, marketplace);

                  await page.waitFor(5000);

                  await page.waitForSelector(`#trkNum_${orders[i].store_id}_${orders[i].long_ebay_order_number}_0`);

                  // Look for the tracking number input - trkNum_154028210242_2048447032005_0
                  const trackingNumberInput = await page.$(`#trkNum_${orders[i].store_id}_${orders[i].long_ebay_order_number}_0`);

                  // Look for the carrier input 
                  const carrierInput = await page.$('.trk-row .autocomplete input');

                  if (trackingNumberInput !== null && carrierInput !== null) {
                    await trackingNumberInput.type(orders[i].proxy_tracking_number, { delay: 50 });
                    await carrierInput.type('Bluecare Express', { delay: 50 });

                    await page.waitFor(3000);

                    // SAVE BUTTON
                    const saveButton = await page.$('#mainContent div button.btn--primary');

                    if (saveButton !== null) {
                      await saveButton.click();

                      await page.waitFor(10000);

                      await global.knex('tbl_orders')
                      .where({ order_number: orders[i].order_number })
                      .update({ 
                        being_marked_as_shipped: '0',
                        status_code: '2',
                        tracking_uploaded: '1'
                      })
                      .then(() => Util.insertOrderLog(orders[i], `Marked as shipped with a tracking number - ${orders[i].proxy_tracking_number}`))
                      .catch(e => global.appLog.error(`${e} - EbayAutoorder - _markWithProxyTracking - line 1033`));
                      
                    } else {
                      // THROW AN ERROR
                    }
                  }
                } else {
                  // @TODO something went wrong
                  await Util.insertOrderLog(orders[i], 'Something went wrong while uploading tracking number. Please try again.', 'error');
                }


              } else {
                // @TODO 
                // either the add tracking number selector has changed or the
              }
            }
          }
        } catch (e) {
          await page.screenshot({ path: "tracking-error.jpg", type: "jpeg", fullPage: true });
          global.appLog.error(`${e} - inside ebay.markWithProxyTracking() - line 993`);

          await global.knex('tbl_orders')
          .where({ order_number: orders[i].order_number })
          .update({ being_marked_as_shipped: '0' })
          .catch(e => global.appLog.error(`${e} -> EbayAutoorder.js - line 1412`));

          await Util.insertOrderLog(orders[i], 'Something went wrong while uploading tracking number. Please try again.', 'error');
        }
      }
    }

    // Close the context browser
    await context.close();

  }

  _handleNextPageButton = async page => {
    // Check if there is 'Next' button f
    const hasNextPageButton = await page.evaluate(() => {
      let hasNextPageButton = false;
      // document.querySelectorAll('.pagination .spf-link')
      if (document.querySelector('.pagination li:nth-last-child(1) a') !== null) {
        hasNextPageButton = true;
      }
      return hasNextPageButton;
    })
    .catch(error => global.appLog.error(`${error} - inside ebay.reprice - line 593`));
  
    // If yes, click it
    if (hasNextPageButton) {
      await page.click('.pagination li:nth-last-child(1) a');
      await page.waitFor(5000);
    }
  }

  _getTotalNumberOfPages = async page => {
    const totalNumberOfProductPages = await page.evaluate(() => {
      // document.querySelectorAll('.pagination .spf-link')
      const totalNumberOfProductPagesDiv = document.querySelectorAll('.pagination .spf-link');
  
      if (totalNumberOfProductPagesDiv === null) {
        return 1;
      }
      // Get only the number from the HTML
      const totalNumberOfProductPages = totalNumberOfProductPagesDiv.length;
      return totalNumberOfProductPages;
    })
    .catch(error => global.appLog.error(`${error} - inside ebayAutorder.this._getTotalNumberOfPages eval func - line 1635`));
  
    return totalNumberOfProductPages;
  }
}

export default EbayAutoorder;