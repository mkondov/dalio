/* eslint-disable */ 
/* eslint no-new: 0 */
/* eslint no-plusplus: 0 */
/* eslint no-await-in-loop: 0 */
/* eslint lines-between-class-members: 0 */
/* eslint no-else-return: 0 */
/* eslint no-continue: 0 */
/* eslint no-loop-func: 0 */
/* eslint object-shorthand: 0 */
/* eslint eqeqeq: 0 */

import { ipcMain } from 'electron';  
import axios from 'axios';
import https from 'https';
import moment from 'moment';
import AmazonAutoorder from '../amazon/AmazonAutoorder';
import EbayAutoorder from '../ebay/EbayAutoorder';
import Util from '../../core/util/Util';

import ServerCommunications from '../../core/util/ServerCommunications';
import Account from '../../core/Account';

class AutoorderHelper {
  ebayAutoorder;
  amazonAutoorder;

  ordersQueue = [];

  // Intervals
  ebaySyncOrdersInterval = undefined;
  ebaySyncOrdersIntervalTime = 3600000; // 1 hour by default
  amazonProductOrderingInterval = undefined;
  amazonProductOrderingIntervalTime = 7200000 // 2 hours by default
  amazonCheckOrdersInterval = undefined;
  amazonCheckOrdersIntervalTime = 5400000 // 1 hour and a half by default
  markEbayOrdersAsShippedInterval = undefined;
  markEbayOrdersAsShippedIntervalTime = 14400000 // 4 hours by default
  refreshBCEDataInterval = undefined;
  refreshBCEDataIntervalTime = 3600000 // 4 hours by default

  constructor (mainWindow) {
    this.mainWindow = mainWindow;

    this.instantiateDependantClasses();

    // ipcMain.on('switch-ebay-autoorder', async (event, value) => {

      
    // });

    ipcMain.on('autoorder-settings', async (event, info) => {
      this.autoorderSettings(info);
    });

    ipcMain.on('get-listing-data', async (event, matchedListingAsinSku) => {
      if (matchedListingAsinSku !== null && matchedListingAsinSku !== '' && matchedListingAsinSku !== undefined) {
        global.knex
        .from('tbl_listings')
        .select()
        .where({ store_id: matchedListingAsinSku })
        .first()
        .then(row => {
          if (row !== undefined) {
            event.sender.send('get-listing-data', row);
          }
          return null;
        }).catch(error => global.appLog.error(`${error} AutoorderHelper.js get-listing-data - line 27`));
      }
    });

    ipcMain.on('request-orders', async () => {
      this.sendOrdersToFrontEnd();
    });

    ipcMain.on('update-order-logs-status', async (event, order) => {
      let stringifiedLogs = '';

      if (typeof order.logs !== 'string') {
        stringifiedLogs = JSON.stringify(order.logs);
      } else {
        stringifiedLogs = order.logs;
      }

      global.knex('tbl_orders')
        .where({ order_number: order.order_number })
        .update({ logs: stringifiedLogs })
        .catch(e => global.appLog.error(`${e} - Autoorderhelper - update-order-logs-status - line 99`));
    });

    ipcMain.on('order-product', async (event, order) => {
      this.fulfilOrders(order);
    });

    ipcMain.on('send-trackings-to-bce', async () => {
      // Get orders from DB that have tracking_sent_to_bce === '0' and tracking_number !== null
      const orders = await global.knex('tbl_orders')
      .where({ tracking_sent_to_bce: '0' })
      .whereNot({ status_code: '3' })
      .whereNotNull('tracking_number')
      .then(res => res)
      .catch(e => global.appLog.error(`${e} - in AutoorderHelper.sendTrackingsToBCE - line 287`));

      if (orders.length > 0) {
        this.sendTrackingsToBCE(orders);
      } else {
        // Log a message that there are no orders to send
      }
    });

    ipcMain.on('send-single-tracking-to-bce', async (event, order) => {

      const orders = await global.knex('tbl_orders')
      .where({ order_number: order.order_number })
      .where({ tracking_sent_to_bce: '0' })
      .whereNot({ status_code: '3' })
      .whereNotNull('tracking_number')
      .then(res => res)
      .catch(e => global.appLog.error(`${e} - in AutoorderHelper.sendTrackingsToBCE - line 287`));

      if (orders.length > 0) {
        this.sendTrackingsToBCE(orders);
      } else {
        // Log a message that there are no orders to send
      }
    });

    ipcMain.on('refresh-bce-tracking-data', async () => {
      this.sendFreshBCEData();
    });

    ipcMain.on('send-orders-to-server', async () => {
      this.sendOrdersToServer();
    });

    ipcMain.on('check-tracking-funds', async () => {
      Account.check(this.mainWindow);
    });

    setTimeout(this.setup, 5000);
    setInterval(this.sendOrdersToServer, 3600000);
  }

  instantiateDependantClasses = () => {
    this.amazonAutoorder = new AmazonAutoorder(this);
    this.ebayAutoorder = new EbayAutoorder(this);
  }

  autoorderSettings = async info => {
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
                // Change the settings use_gift_card_balance value to a new value provided by the rendered process
  
                settings.autoorder = {...settings.autoorder, ...info.value};
              
                // Update the DB entry with the new setting
                global
                  .knex('tbl_users')
                  .where({ account: 'dalio' })
                  .update({
                    settings: JSON.stringify(settings)
                  })
                  .catch(error => global.appLog.error(`${error} - inside AutoorderHelper.autoorderSettings - line 759`));
  
                this.mainWindow.webContents.send('autoorder-settings', settings.amazon);
              }
            }
            return null;
          })
          .catch(error => global.appLog.error(`${error} - inside AutoorderHelper.autoorderSettings - line 767`));
  
          break;
        // This action queries all of the Amazon settings and returns them
        case 'query-autoorder-settings':
          global
            .knex('tbl_users')
            .where({ account: 'dalio' })
            .first()
            .then(row => {
              if (row !== undefined) {
                if (row.settings !== null) {
                  const settings = JSON.parse(row.settings);
                  // Check if there is an 'autoorder' object key in the settings object
                  if (settings.autoorder !== undefined) {

                    if (settings.autoorder.amazon.us_order_info.mark_ordered_products_as_shipped === undefined) {
                      settings.autoorder.amazon.us_order_info.mark_ordered_products_as_shipped = 0;
                    }

                    if (settings.autoorder.amazon.us_order_info.mark_ordered_products_as_shipped_with_proxy_tracking === undefined) {
                      settings.autoorder.amazon.us_order_info.mark_ordered_products_as_shipped_with_proxy_tracking = 0;
                    }

                    if (settings.autoorder.amazon.uk_order_info.mark_ordered_products_as_shipped === undefined) {
                      settings.autoorder.amazon.uk_order_info.mark_ordered_products_as_shipped = 0;
                    }

                    if (settings.autoorder.amazon.uk_order_info.mark_ordered_products_as_shipped_with_proxy_tracking === undefined) {
                      settings.autoorder.amazon.uk_order_info.mark_ordered_products_as_shipped_with_proxy_tracking = 0;
                    }

                    if (settings.autoorder.press_amazon_order_button === undefined) {
                      settings.autoorder.press_amazon_order_button = 1;
                    }

                    this.mainWindow.webContents.send('autoorder-settings', settings.autoorder);
                  } else {
                    if (settings.autoorder === undefined) {
                      settings.autoorder = {};
                    }
      
                    settings.autoorder.amazon = {
                      us_order_info: {
                        account: {}, 
                        payment_method: '',
                        credit_card_index: 0,
                        mark_ordered_products_as_shipped: 0,
                        mark_ordered_products_as_shipped_with_proxy_tracking: 0
                      },
                      uk_order_info: {
                        account: {}, 
                        payment_method: '',
                        credit_card_index: 0,
                        mark_ordered_products_as_shipped: 0,
                        mark_ordered_products_as_shipped_with_proxy_tracking: 0
                      }
                    }

                    settings.autoorder.press_amazon_order_button = 1;
                    
                    global
                    .knex('tbl_users')
                    .where({ account: 'dalio' })
                    .update({
                      settings: JSON.stringify(settings)
                    }).then(() => {
                      this.mainWindow.webContents.send('autoorder-settings', settings.autoorder);
                      return null;
                    }).catch(error => global.appLog.error(`${error} - inside AutoorderHelper.autoorderSettings - line 798`));
                  }
                }
              }
              return null;
            }).catch(error => global.appLog.error(`${error} - inside case 'query-autoorder-settings' -  AutoorderHelper.autoorderSettings - line 803`));
          break;
        case 'change-test-settings':
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
                let needsUpdate = false;

                if (info.value.press_amazon_order_button !== undefined) {
                  settings.autoorder.press_amazon_order_button = info.value.press_amazon_order_button;
                  needsUpdate = true;
                }
              
                if (needsUpdate) {
                  // Update the DB entry with the new setting
                  global
                  .knex('tbl_users')
                  .where({ account: 'dalio' })
                  .update({
                    settings: JSON.stringify(settings)
                  })
                  .catch(error => global.appLog.error(`${error} - inside AutoorderHelper.autoorderSettings - line 759`));
                }
  
              }
            }
            return null;
          })
          .catch(error => global.appLog.error(`${error} - inside AutoorderHelper.autoorderSettings - line 767`));
    
            break;
          default:
        // do nothing
      }
  }

  sendOrdersToFrontEnd = async () => {
    const orders = await global.knex
    .select()
    .from('tbl_orders')
    .then(rows => rows)
    .catch(error => global.appLog.error(`${error} AutoorderHelper.js - line 234`));

    if (orders.length > 0) {
      await orders.sort((a, b) => {
        if ((a.matched_listing_store_id === null && a.status_code !== '2' && b.matched_listing_store_id !== null) || (a.errors > 0 && b.errors === 0) || (a.id > b.id)) {
          return -1;
        } else if ((a.matched_listing_store_id !== null && b.matched_listing_store_id === null && b.status_code !== '2') || (a.errors === 0 && b.errors !== 0) || (b.id > a.id)) {              
          return 1;
        } 
        
        return 0;
      });
    }

    this.mainWindow.webContents.send('request-orders', orders);

    Util.showOrderWarnings(this.mainWindow);
  }

  sendOrdersToServer = async () => {
    // Get the current Dalio user information from the DB
    const userRow = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(row => row)
    .catch(error => global.appLog.error(`${error} - in AutoorderHelper.sendOrdersToServer - line 293`));
    
    // If there is an account loggedin -> there will be an email address
    if (userRow.email !== undefined && userRow.email !== null && userRow.email !== '' && userRow.email !== 'godmode@dalio.io' && userRow.status !== 0) {
      // Query all the user`s orders
      const orders = await global.knex('tbl_orders')
      // .where({ send_to_server: '1' })
      .then(rows => rows)
      .catch(error => global.appLog.error(`${error} - in AutoorderHelper.sendOrdersToServer - line 301`));

      // If there are any orders
      if (orders.length > 0) {
        const ordersMapped = orders.map(order => {
          const orderDeepCopy = JSON.parse(JSON.stringify(order));
          // order.time_created = order.created_at;
          // order.store_id = order.store_id;
          // order.user_email = userRow.email;
          orderDeepCopy.logs = null;
          orderDeepCopy.source_order_html = null;
          orderDeepCopy.item_name = order.item_name.replace(/,/g, '');

          return orderDeepCopy;
        });

        ServerCommunications.sendOrders('update', ordersMapped);

        const now = moment();
        for (let i = 0; i < ordersMapped.length; i++) {
          const dateSold = moment(ordersMapped[i].parsed_date_sold);
          const daysDifference = now.diff(dateSold, 'days');

          if (daysDifference > 30) {
            global.knex('tbl_orders')
            .where({ order_number: ordersMapped[i].order_number })
            .update({ send_to_server: '0' })
            .catch(e => global.appLog.error(`${e} - ServerCommunications.sendAllOrderstoServer - line 441`));
          }
        }
      }
    }
  }

  sendTrackingsToBCE = async orders => {
    const account = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(res => res)
    .catch(e => global.appLog.error(`${e} - AutoorderHelper. sendTrackingsToBCE - line 390`));

    // TODO if the user has 0.08 but 3 trackings are to be converted (0.12) an error will be triggered -> FIX IT
    if (account.tracking_funds >= orders.length * 0.04) {
      console.log('SENDING TRACKINGS TO BCE ORDER LENGTH', orders.length);
      // If there are any orders -> start preparing the information to be sent
      if (orders.length > 0) {
        // На https://user.dropshipbeast.com/wappgateway/bce пращаш с post:
        // AddressFormatted е масив с: Name, Line1, Line2, City, State, ZIPCode, Country, Phone
        // address - масив, който ти описах по-горе
        // reference - някакво ID вътрешно, по което да може да намираме поръчката
        // order_id - amazon order id-то
        // shipping_company - куриер от амазон
        // tracking_link - линк към тракинг страницата в амазон
        // tracking_number - тракинг номера от амазон
        // user_id - user id :D

        for (let i = 0; i < orders.length; i++) {
          const trackingInfoData = {};

          const addressFormatted = [];

          if (orders[i].post_to_name !== null) {
            addressFormatted.push({ Name: orders[i].post_to_name });
          }

          if (orders[i].post_to_address_field !== null) {
            addressFormatted.push({ Line1: orders[i].post_to_address_field });
          }

          if (orders[i].post_to_address_field_2 !== null) {
            addressFormatted.push({ Line2: orders[i].post_to_address_field_2 });
          }

          if (orders[i].post_to_city !== null) {
            addressFormatted.push({ City: orders[i].post_to_city });
          }

          if (orders[i].post_to_state_province !== null) {
            addressFormatted.push({ State: orders[i].post_to_state_province });
          }

          if (orders[i].post_to_postcode !== null) {
            addressFormatted.push({ ZIPCode: orders[i].post_to_postcode });
          }

          if (orders[i].post_to_country !== null) {
            addressFormatted.push({ Country: orders[i].post_to_country });
          }

          if (orders[i].buyer_phone !== null) {
            addressFormatted.push({ Phone: orders[i].buyer_phone });
          }

          trackingInfoData.address = addressFormatted;
          trackingInfoData.reference = orders[i].order_number;
          trackingInfoData.order_id = orders[i].source_order_number;
          trackingInfoData.user_id = account.email;

          if (orders[i].source_order_carrier === null) {
            continue;
          } else {
            trackingInfoData.shipping_company = orders[i].source_order_carrier;
          }

          if (orders[i].source_order_url === null) {
            continue;
          } else {
            trackingInfoData.tracking_link = orders[i].source_order_url;
          }

          if (orders[i].tracking_number === null) {
            continue;
          } else {
            trackingInfoData.tracking_number = orders[i].tracking_number;
          }

          // At request level
          const agent = new https.Agent({
            rejectUnauthorized: false
          });

          // global.appLog.error(JSON.stringify(trackingInfoData));
          
          const response = await axios.post('https://user.dropshipbeast.com/wappgateway/bce', JSON.stringify(trackingInfoData), { httpsAgent: agent, timeout: 60000 })
          .then(responseBCE => responseBCE)
          .catch(e => global.appLog.error(`${e} - AutoorderHelper.sendTrackingsToBCE - line 372`));

          console.log('BCE response', response.data);
          if (response.data.length > 0) {
            const { data } = response;

            if (data[0].ErrorMessage !== '') {
              Util.insertOrderLog(orders[i], data[0].ErrorMessage, 'error');
              this.sendOrdersToFrontEnd();
            }

            if (data[0].ExternalReference !== undefined && data[0].ExternalReference !== null) {
              if (data[0].ProxyTrackingReference !== undefined && data[0].ProxyTrackingReference !== null && data[0].ProxyTrackingReference !== '') {
                console.log('there is external reference', data[0].ExternalReference);
                console.log('there is proxy tracking reference', data[0].ProxyTrackingReference);

                await global.knex('tbl_orders')
                .where({ order_number: data[0].ExternalReference })
                .update({
                  proxy_tracking_number: data[0].ProxyTrackingReference,
                  tracking_sent_to_bce: '1'
                })
                .then(() => {
                  this.sendOrdersToFrontEnd();
                  return null;
                })
                .catch(e => global.appLog.error(`${e} -> AutoorderHelper.sendTrackingsToBCE - line 440`));

                Util.insertOrderLog(orders[i], `Tracking number successfuly converted to BCE - ${data[0].ProxyTrackingReference}`, 'info');
                this.mainWindow.webContents.send('tracking-converted', orders[i]);

                console.log('trying to disabled next line');
                const updatedTrackingFunds = await ServerCommunications.decrementFunds(1);
                console.log('updatedTrackingFunds', updatedTrackingFunds);

                if (updatedTrackingFunds !== null) {
                  this.mainWindow.webContents.send('check-tracking-funds', { tracking_funds: updatedTrackingFunds });
                }
              }
            }
          }

          // global.appLog.error(response)
          // MARK THE ORDER AS SENT TO BCE

        }
      }
    } else {
      global.log.error('Insufficient tracking funds. Please top it up in order to continue converting your trackings');
    }
  }

  sendFreshBCEData = async () => {
    // Get orders from DB that have tracking_sent_to_bce === '0' and tracking_number !== null
    const orders = await global.knex('tbl_orders')
    .where({ tracking_sent_to_bce: '1' })
    .whereNot({ status_delivered_sent_to_bce: '1' })
    .then(res => res)
    .catch(e => global.appLog.error(`${e} - in AutoorderHelper.sendTrackingsToBCE - line 287`));

    console.log('ORDER LENGTH', orders.length);
    // If there are any orders -> start preparing the information to be sent
    if (orders.length > 0) {
      // $postData = array(
      //  "TrackingURL" => $TrackingURL,
      //  "TrackingPageHtml" => $TrackingPageHTML
      // );
      // $postJSON = json_encode($postData);
      // Това го пращаш като POST на https://www.bluecare.express/api/AddInfo с Content-Type: application/json

      for (let i = 0; i < orders.length; i++) {
        const trackingInfoData = {};

        if (orders[i].source_order_url === null) {
          continue;
        } else {
          trackingInfoData.TrackingURL = orders[i].source_order_url;
        }

        if (orders[i].source_order_html === null) {
          continue;
        } else {
          trackingInfoData.TrackingPageHtml = orders[i].source_order_html;
        }

        // At request level
        const agent = new https.Agent({
          rejectUnauthorized: false
        });
        
        axios.post('https://www.bluecare.express/api/AddInfo', JSON.stringify(trackingInfoData), { headers: {
          'Content-Type': 'application/json'
        }, httpsAgent: agent, timeout: 60000 })
        .then(response => {
          // BCE refresh response { Success: false,
          //   EmailSent: false,
          //   BluecareExpressTrackingNumber: null,
          //   NonActiveCarrier: false,
          //   NoEvents: false,
          //   Carrier: null,
          //   BillingError: null,
          //   DeliveryStatus: 'Unknown',
          //   Error:
          //    'No tracking events in this tracking. You are either not logged-in to the Account that made this purchase - log in first; or, there are no events yet - try again later.' }
          // BCE refresh response { Success: true,
          //   EmailSent: false,
          //   BluecareExpressTrackingNumber: 'BCEQA0558455199YQ',
          //   NonActiveCarrier: false,
          //   NoEvents: false,
          //   Carrier: null,
          //   BillingError: null,
          //   DeliveryStatus: 'Delivered',
          //   Error: null }
          // BCE refresh response { Success: true,
          //   EmailSent: false,
          //   BluecareExpressTrackingNumber: 'BCEQA0558298285YQ',
          //   NonActiveCarrier: false,
          //   NoEvents: false,
          //   Carrier: null,
          //   BillingError: null,
          //   DeliveryStatus: 'OutForDelivery',
          //   Error: null }

          const { data } = response;
          console.log('BCE refresh response', data);

          if (data.Success) {
            if (data.DeliveryStatus.toLowerCase().includes('delivered')) {
              console.log(`marking ${orders[i].item_name} with BCE ${data.BluecareExpressTrackingNumber} as delivered`);
              global.knex('tbl_orders')
              .where({ order_number: orders[i].order_number })
              .update({ status_delivered_sent_to_bce: '1' })
              .catch(e => global.appLog.error(`${e} - AutoorderHelper.sendFreshBCEData - line 562`));
            }
          }

          return null;
        })
        .catch(e => global.appLog.error(`${e} - AutoorderHelper.sendFreshBCEData - line 528`));

      }
    }
  }

  setup = async () => {
    this.switchAutoorder(true);
  }

  switchAutoorder = value => {
    // If the autoorder cycle is to be switched on
    if (value) {
      // 1. Every hour -> check for new orders waiting for dispatch
      this.ebaySyncOrdersInterval = setInterval(this.ebayAutoorder.syncOrders, this.ebaySyncOrdersIntervalTime, 'awaiting_dispatch');

      // 2. Every hour and a half run through the orders with a status 0 (awaiting dispatch and not ordered yet) and if a payment method is present -> order the products
      // this.amazonProductOrderingInterval = setInterval(this.amazonAutoorder.automateProductOrdering(), this.amazonProductOrderingIntervalTime);

      // 3. Every two hours check Amazon if a product order has been made corresponding to an Ebay order. If yes, mark the order as dispatched on Ebay.
      this.amazonCheckOrdersInterval = setInterval(this.amazonAutoorder.checkOrders, this.amazonCheckOrdersIntervalTime)

      // // Optionally, mark orders as dispatched on eBay
      // this.markEbayOrdersAsShippedInterval = setInterval(this.ebayAutoorder.markOrdersAsDispatched(), this.markEbayOrdersAsShippedIntervalTime);

      this.refreshBCEDataInterval = setInterval(this.sendFreshBCEData, this.refreshBCEDataIntervalTime);

      global.nucleus.track("SWITCH_AUTOORDER_ON", {
        description: 'The user has switched the autoorder ON.',
        email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
      });
    } else {
      clearInterval(this.ebaySyncOrdersInterval);
      // clearInterval(this.amazonProductOrderingInterval);
      clearInterval(this.amazonCheckOrdersInterval);
      global.nucleus.track("SWITCH_AUTOORDER_OFF", {
        description: 'The user has switched the autoorder OFF.',
        email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
      });
    }
  }

  sendTrackingFundsToFrontEnd = async () => {
    const dalioAccountRow = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(row => row)
    .catch(e => global.appLog.error(`${e} - AutoorderHelper.sendTrackingFundsToFrontEnd - line 636`));

    this.mainWindow.webContents.send('check-tracking-funds', { tracking_funds: parseFloat(dalioAccountRow.tracking_funds) });
  }

  fulfilOrders = async order => {

    console.log('fulfilOrders function called', typeof order);
    // Check the Dalio account status and determine if Dalio should start ordering
    const dalioAccountRow = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(rows => rows)
    .catch(e => global.appLog.error(`${e} - at AmazonAutoorder.fulfilOrders - line 657`));

    if (dalioAccountRow.status == '1' && dalioAccountRow.email !== 'godmode@dalio.io') {

      if (order !== undefined) {
        let orderIsInTheQueue = false;
  
        // Check if the current order is queued in the ordersQueue
        if (this.ordersQueue.length > 0) {
          for (let i = 0; i < this.ordersQueue.length; i++) {
            if (this.ordersQueue[i].order_number === order.order_number) {
              orderIsInTheQueue = true;
            }
          }
        } 

        console.log('order is in the queue', orderIsInTheQueue, 'total orders: ', this.ordersQueue.length);
  
        if (!orderIsInTheQueue) {
          this.ordersQueue.push(order);
        }
      }

      if (this.ordersQueue.length > 0) {
        if (this.ordersQueue[0].supplier === 'amazon') {
          if (!global.fulfillingAmazonOrder) {
            const queueOrder = JSON.parse(JSON.stringify(this.ordersQueue[0]));
            this.ordersQueue.shift();
            await this.amazonAutoorder.orderProduct(queueOrder);
          }
        }
      }
    } else {
      if (dalioAccountRow.email !== null) {
        if (dalioAccountRow.email == 'godmode@dalio.io') {
          Util.insertOrderLog(product, 'Cannot order product as you need to register a proper Dalio account and login with it.');
        } else {
          Util.insertOrderLog(product, 'Cannot order product as there is an unpaid invoice. Please pay it to resume autoorder functionality.');
        }
      } else {
        Util.insertOrderLog(product, 'Cannot order product as you need to register a Dalio account and login with it');
      }
    }
  }
}

export default AutoorderHelper;