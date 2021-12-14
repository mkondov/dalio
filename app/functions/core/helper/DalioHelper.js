/* eslint global-require: 0 */
/* eslint no-new: 0 */
/* eslint no-param-reassign: 0 */
/* eslint no-plusplus: 0 */
/* eslint no-else-return: 0 */

// @flow

import fs from 'fs-extra';
import path from 'path';
import sqlite3 from 'sqlite3';
import { ipcMain, app } from 'electron';
import winston from 'winston';
import RepricerHelper from '../../repricer/helper/RepricerHelper';
import AutoorderHelper from '../../autoorder/helper/AutoorderHelper';
import Account from '../Account';
import Util from '../util/Util';
import SendUserData from '../../support/SendUserData';
import ServerCommunications from '../util/ServerCommunications';

// TYPES
import type { HandleOnboardingInfo, AccountRow } from '../../../types/UtilTypes';
import type { Log } from '../../../types/LogsTypes';

require('winston-daily-rotate-file');

class DalioHelper {
  mainWindow: Object = {};

  logPathDir = '';

  errorLogPathDir = '';

  dbPathDir = '';

  amazonCookiePathDir = '';

  ebayCookiePathDir = '';
  
  gmailTokenPathDir = '';

  constructor (mainWindow: Object) {
    this.mainWindow = mainWindow;

    ipcMain.on('onboarding', async (event: SyntheticEvent<>, onboarding: HandleOnboardingInfo): Promise<any> => {
      Util.handleOnboarding(this.mainWindow, onboarding);
    });

    ipcMain.on('request-logs', async (event: SyntheticEvent<>): Promise<any> => {
      // Query options -> if needed
      const options = {
        // from: new Date() - (24 * 60 * 60 * 1000),
        // until: new Date(),
        // limit: 10,
        start: 0,
        order: 'desc'
      };

      type Logs = {
        dailyRotateFile: Array<Log>
      };

      // Retrieve the logs and send them back to the rendered process
      global.log.query(options, (err: string, logs: Logs): void => {
        if (err) {
          global.appLog.error(err);
        }
        event.sender.send('send-logs', logs.dailyRotateFile);
      });
    });

    ipcMain.on('delete-all-logs', async (): Promise<any> => {
      try {
        // await fs.emptyDir(this.logPathDir);
        // this.initiateLogger();

        const logsTransport = await global.log.transports.find(transport => transport.filename === '%DATE%-info.log');

        await global.log.remove(logsTransport);
        await fs.emptyDir(this.logPathDir);
        this.initiateLogger();

      } catch (error) {
        global.appLog.error(`${error} - inside DalioHelper.js - delete-all-logs - line 77`);
      }
    });

    ipcMain.on('get-dalio-settings', async (event) => {
      const settings = await global.knex('tbl_users')
      .where({ account: 'dalio' })
      .first()
      .then(row => JSON.parse(row.settings))
      .catch(e => global.appLog.error(`${e} in DalioHelper - get-dalio-settings at line 93`));

      event.sender.send('get-dalio-settings', settings.app);
    });

    ipcMain.on('save-dalio-settings', async (event, appSettings) => {
      await global.knex('tbl_users')
      .where({ account: 'dalio' })
      .first()
      .then(row => {
        if (row !== undefined) {
          const dbSettings = JSON.parse(row.settings);

          dbSettings.app = JSON.parse(JSON.stringify(appSettings));
          // Update the DB entry with the new setting
          global
            .knex('tbl_users')
            .where({ account: 'dalio' })
            .update({
              settings: JSON.stringify(dbSettings)
            })
            .catch(error => global.appLog.error(`${error} - inside DalioHelper save-dalio-settings - line 116`));
        }

        return null;
      })
      .catch(e => global.appLog.error(`${e} -> DalioHelper save-dalio-settings at line 104`));

      this.systemStartupAction();
    });

    // TESTS
    ipcMain.on('get-headless-browsers-value', async event => {
      event.sender.send('get-headless-browsers-value', global.headless);
    });

    ipcMain.on('toggle-headless-browsers-value', async () => {
      global.headless = !global.headless;
      this.mainWindow.webContents.send('get-headless-browsers-value', global.headless);
    });

    ipcMain.on('send-user-data', async () => {
      SendUserData.send();
    });

    ipcMain.on('backup-user-data', async () => {
      SendUserData.createBackup();
    });

    ipcMain.on('restore-user-data', async () => {
      SendUserData.restoreUserData();
    });

    ipcMain.on('send-listings-to-server', async () => {
      this.sendListingsToServer();
    });

    // Send listings to server every hour
    setInterval(this.sendListingsToServer, 3600000)
  }

  setup = () => {
    this.createDirectories();
    this.initiateGlobalVariables();
    this.initiateDatabase();
    this.instantiateModuleHelperClasses();
  }

  createDirectories = () => {
    global.dalioAppDataPathDir =  path.resolve(app.getPath('appData'), 'DalioAppData');
    this.errorLogPathDir = global.errorLogPathDir = path.resolve(app.getPath('appData'), 'DalioAppData', 'errorLogs');
    this.logPathDir = global.logPathDir = path.resolve(app.getPath('appData'), 'DalioAppData', 'logs');

    // Use the appData dir for database file - C:\Users\anton\AppData\Roaming\Dalio\
    this.dbPathDir = global.dbPathDir = path.resolve(app.getPath('appData'), 'DalioAppData', 'database');

    global.cookiesPathDir = path.resolve(app.getPath('appData'), 'DalioAppData', 'cookies');
    this.amazonCookiePathDir = path.resolve(app.getPath('appData'), 'DalioAppData', 'cookies', 'amazon');
    global.amazonAutoorderCookiePathDir = path.resolve(app.getPath('appData'), 'DalioAppData', 'cookies', 'amazon', 'autoorder');

    this.ebayCookiePathDir = path.resolve(app.getPath('appData'), 'DalioAppData', 'cookies', 'ebay');

    this.gmailTokenPathDir = path.resolve(app.getPath('appData'), 'DalioAppData', 'trackingUploader', 'gmail');

    this.initiateLogger();
    this.initiateAppLogger();

    // If database directories do not exist -> create them
    if (!fs.existsSync(this.dbPathDir)) {
      fs.mkdirSync(this.dbPathDir, { recursive: true }, err => global.appLog.error(err));
    }

    // If cookies directories do not exist -> create them
    if (!fs.existsSync(this.amazonCookiePathDir)) {
      fs.mkdirSync(this.amazonCookiePathDir, { recursive: true }, err => global.appLog.error(err));
    }

    // If cookies directories do not exist -> create them
    if (!fs.existsSync(global.amazonAutoorderCookiePathDir)) {
      fs.mkdirSync(global.amazonAutoorderCookiePathDir, { recursive: true }, err => global.appLog.error(err));
    }

    // If cookies directories do not exist -> create them
    if (!fs.existsSync(this.ebayCookiePathDir)) {
      fs.mkdirSync(this.ebayCookiePathDir, { recursive: true }, err => global.appLog.error(err));
    }

    // If cookies directories do not exist -> create them
    if (!fs.existsSync(this.logPathDir)) {
      fs.mkdirSync(this.logPathDir, { recursive: true }, err => global.appLog.error(err));
    }

    if (!fs.existsSync(this.gmailTokenPathDir)) {
      fs.mkdirSync(this.gmailTokenPathDir, { recursive: true }, err => global.appLog.error(err));
    }
  }

  initiateLogger = () => {
    // This is the logger format (this is how each log line looks inside the log files)
    const loggerFormat = winston.format.printf(({ timestamp, level, message }) => `{"date":"${timestamp}","level":"${level}","message":"${message}"}`);

    // Logs are put in new files every day and are deleted every 14 days
    global.log = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
        loggerFormat
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.DailyRotateFile({
          filename: path.resolve(this.logPathDir, `%DATE%-info.log`),
          datePattern: 'MM-DD-YYYY',
          prepend: true,
          json: true,
          maxFiles: '3',
          level: 'info'
        })
      ]
    });
  }

  initiateAppLogger = () => {
    // This is the logger format (this is how each log line looks inside the log files)
    const loggerFormat = winston.format.printf(({ timestamp, level, message }) => `{"date":"${timestamp}","level":"${level}","message":"${message}"}`);

    // Logs are put in new files every day and are deleted every 14 days
    global.appLog = winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
        loggerFormat
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.DailyRotateFile({
          filename: path.resolve(this.errorLogPathDir, `%DATE%-app.log`),
          datePattern: 'MM-DD-YYYY',
          prepend: true,
          json: true,
          maxFiles: '3',
          level: 'info'
        })
      ]
    });
  }

  initiateGlobalVariables = () => {
    global.proxyUsername = '';
    global.proxyPassword = '';

    global.accountCheckIntervalIsRunning = false;

    global.amazonRepricerIntervalIsRunning = false;
    global.nextAmazonRepricerRun = '';
    global.amazonInventoryManagerIntervalIsRunning = false;
    global.amazonSyncListingsIsRunning = false;
    global.fulfillingAmazonOrder = false;

    global.ebayRepricerIntervalIsRunning = false;
    global.nextEbayRepricerRun = '';
    global.ebayInventoryManagerIntervalIsRunning = false;
    global.ebaySyncListingsIsRunning = false;
    global.ebaySyncOrdersIsRunning = false;
    global.markingEbayOrdersAsDispatched = false;
    global.leavingOrderFeedback = false;

    global.walmartPriceCheckIntervalIsRunning = false;
    global.walmartSinglePriceCheckerIsRunning = false;
    global.amazonPriceCheckIntervalIsRunning = false;
    global.amazonSinglePriceCheckerIsRunning = false;
    global.aliExpressPriceCheckIntervalIsRunning = false;
    global.aliExpressSinglePriceCheckerIsRunning = false;
    global.homeDepotPriceCheckIntervalIsRunning = false;
    global.homeDepotSinglePriceCheckerIsRunning = false;
    global.vidaXLPriceCheckIntervalIsRunning = false;
    global.vidaXLSinglePriceCheckerIsRunning = false;

    global.refactorPricesIntervalIsRunning = false;

    global.dbPath = path.resolve(this.dbPathDir, 'ds-repricer.db');
    // global.gmailTokenPath = path.resolve(gmailTokenPathDir, 'token.json');

    global.amazonUSCookiePath = path.resolve(this.amazonCookiePathDir, 'UScookies.txt');
    global.amazonCACookiePath = path.resolve(this.amazonCookiePathDir, 'CAcookies.txt');
    global.amazonUKCookiePath = path.resolve(this.amazonCookiePathDir, 'UKcookies.txt');
    global.amazonDECookiePath = path.resolve(this.amazonCookiePathDir, 'DEcookies.txt');
    global.amazonFRCookiePath = path.resolve(this.amazonCookiePathDir, 'FRcookies.txt');
    global.amazonITCookiePath = path.resolve(this.amazonCookiePathDir, 'ITcookies.txt');
    global.amazonESCookiePath = path.resolve(this.amazonCookiePathDir, 'EScookies.txt');

    global.amazonPage = 'https://sellercentral.amazon.com';
    global.amazonCookies = {
      US: [],
      CA: [],
      MX: [],
      UK: [],
      DE: [],
      FR: [],
      IT: [],
      ES: []
    };

    global.amazonAutoorderCookies = {
      US: [],
      CA: [],
      MX: [],
      UK: [],
      DE: [],
      FR: [],
      IT: [],
      ES: []
    };

    global.ebayUSCookiePath = path.resolve(this.ebayCookiePathDir, 'UScookies.txt');
    global.ebayUKCookiePath = path.resolve(this.ebayCookiePathDir, 'UKcookies.txt');
    global.ebayDECookiePath = path.resolve(this.ebayCookiePathDir, 'DEcookies.txt');
    global.ebayCACookiePath = path.resolve(this.ebayCookiePathDir, 'CAcookies.txt');
    global.ebayITCookiePath = path.resolve(this.ebayCookiePathDir, 'ITcookies.txt');
    global.ebayPage = 'https://www.ebay.com';
    global.ebayCookies = {
      US: [],
      UK: [],
      DE: [],
      CA: [],
      IT: []
    };
  }

  initiateDatabase = () => {
    // If there is no database -> create it
    fs.stat(global.dbPath, (error, file) => {
      if (file === undefined) {
        try {
          // Create DB -> connect to file
          global.knex = new sqlite3.Database(global.dbPath);
          global.knex = require('knex')({
            client: 'sqlite3',
            connection: {
              filename: global.dbPath
            },
            useNullAsDefault: false
          });

          // Create the new DB schema
          global.knex.schema
            .createTable('tbl_listings', table => {
              table.increments('id').primary();
              table.string('item_name');
              table.string('image');
              table.string('has_variations').defaultTo('0');
              table.string('is_variant').defaultTo('0');
              table.string('parent_listing_id');
              table.string('supplier');
              table.string('supplier_id');
              table.string('supplier_url');
              table.string('supplier_item_name');
              table.string('store_id');
              table.string('store_url');
              table.string('store');
              table.string('store_watches').defaultTo('0');
              table.string('store_page_visits').defaultTo('0');
              table.string('store_items_sold').defaultTo('0');
              table.string('product_availability');
              table.string('use_global_refactor_settings').defaultTo('1');
              table.string('use_minimum_price').defaultTo('0');
              table.string('use_maximum_price').defaultTo('0');
              table.string('product_changed').defaultTo('0');
              table.string('is_deleted').defaultTo('0');
              table.string('local_refactor_settings');
              table.float('new_price');
              table.float('refactored_price');
              table.float('price');
              table.float('gross_profit');
              table.string('reprice_breakdown');
              table.integer('errors_during_price_check').defaultTo(0);
              table.integer('lower_price_count').defaultTo(0);
              table.string('has_extended_delivery').defaultTo('0');
              table.string('pause_listing').defaultTo('0');
              table.string('force_oos').defaultTo('0');
              table.string('last_repriced');
              table.string('logs');
              table.timestamp('created_at').defaultTo(global.knex.fn.now());
            })
            .createTable('tbl_users', table => {
              table.increments('id').primary();
              table.string('account');
              table.string('email');
              table.string('password');
              table.string('status').defaultTo('0');
              table.string('country');
              table.string('settings');
              table.float('tracking_funds').defaultTo(0);
              table.string('order_info');
            })
            .createTable('tbl_repricer_stats', table => {
              table.increments('id').primary();
              table.string('total_listings');
              table.string('total_reprices');
              table.timestamp('created_at').defaultTo(global.knex.fn.now());
            })
            .createTable('tbl_orders', table => {
              table.increments('id').primary();
              table.string('status');
              table.string('status_code');
              table.string('ordered_by');
              table.string('order_number');
              table.string('long_ebay_order_number');
              table.string('source_order_number');
              table.string('source_order_url');
              table.string('store_order_url');
              table.string('source_order_carrier');
              table.string('source_order_html');
              table.string('source_order_status');
              table.string('item_name');
              table.string('image');
              table.string('store');
              table.string('store_marketplace');
              table.string('store_id');
              table.string('store_feedback').defaultTo('0');
              table.string('leaving_store_feedback').defaultTo('0');
              table.string('matched_listing_store_id');
              table.string('tracking_number');
              table.string('tracking_sent_to_bce').defaultTo('0');
              table.string('status_delivered_sent_to_bce').defaultTo('0');
              table.string('proxy_tracking_number');
              table.string('tracking_uploaded').defaultTo('0');
              table.string('date_sold');
              table.string('parsed_date_sold');
              table.string('quantity');
              table.string('sold_for');
              table.string('supplier');
              table.string('supplier_id');
              table.string('supplier_url');
              table.string('supplier_account');
              table.string('buyer_name');
              table.string('buyer_email');
              table.string('buyer_phone');
              table.string('buyer_note');
              table.string('postage_method');
              table.string('post_to_name');
              table.string('post_to_address_field');
              table.string('post_to_address_field_2');
              table.string('post_to_city');
              table.string('post_to_state_province');
              table.string('post_to_country');
              table.string('post_to_postcode');
              table.string('ordered_at');
              table.string('order_verified_at_source').defaultTo('0');
              table.integer('errors').defaultTo(0);
              table.string('being_ordered_at_source').defaultTo('0');
              table.string('being_marked_as_shipped').defaultTo('0');
              table.string('logs');
              table.string('send_to_server').defaultTo('1');
              table.timestamp('synced_at').defaultTo(global.knex.fn.now());
            })
            .createTable('tbl_listing_logs', table => {
              table.increments('id').primary();
              table.integer('listing_id');
              table.string('log');
              table.string('level').defaultTo('info');
              table.string('time_created');
            })
            .createTable('tbl_order_logs', table => {
              table.increments('id').primary();
              table.integer('order_id');
              table.string('log');
              table.string('level').defaultTo('info');
              table.string('time_created');
            })
            .then(() => {
              this.dalioAccountCheck();
              this.getAccountStatus();
              return null;
            })
            .catch(err => global.appLog.error(`${err} - global.knex.schema.createTable function inside DalioHelper constructor`)
            );
        } catch (err) {
          global.appLog.error(`${err} - try/catch block creating the database inside DalioHelper class`);
        }
      } else {
        // Connect to DB
        global.knex = require('knex')({
          client: 'sqlite3',
          connection: {
            filename: global.dbPath
          },
          useNullAsDefault: true
        });

        // ADDED - version 0.1.31 - Due to a duplicate table column bug in 0.1.30, a new user might not have the table
        global.knex.schema.hasTable('tbl_orders').then(exists => {
          if (!exists) {
            global.knex.schema.createTable('tbl_orders', table => {
              table.increments('id').primary();
              table.string('status');
              table.string('status_code');
              table.string('ordered_by');
              table.string('order_number');
              table.string('source_order_number');
              table.string('item_name');
              table.string('image');
              table.string('store_id');
              table.string('matched_listing_store_id');
              table.string('tracking_number');
              table.string('date_sold');
              table.string('quantity');
              table.string('sold_for');
              table.string('store');
              table.string('store_marketplace');
              table.string('supplier');
              table.string('supplier_id');
              table.string('supplier_url');
              table.string('buyer_name');
              table.string('buyer_email');
              table.string('buyer_phone');
              table.string('postage_method');
              table.string('post_to_name');
              table.string('post_to_address_field');
              table.string('post_to_address_field_2');
              table.string('post_to_city');
              table.string('post_to_state_province');
              table.string('post_to_country');
              table.string('post_to_postcode');
              table.string('ordered_at');
              table.string('order_verified_at_source').defaultTo('0');
              table.integer('errors').defaultTo(0);
              table.string('being_ordered_at_source').defaultTo('0');
              table.string('logs');
              table.timestamp('synced_at').defaultTo(global.knex.fn.now());
            })
            .catch(errorCr => global.appLog.error(errorCr));
          }

          return null;
        })
        .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 518`));

        this.normalizeDatabaseColumns();
        this.dalioAccountCheck();
        this.getAccountStatus();
        this.normalizeListingsLocalRefactorSettings();
        this.sendListingsToServer();
        setTimeout(Util.showWarnings, 5000, this.mainWindow);
        setTimeout(Util.showOrderWarnings, 5000, this.mainWindow);
      }
    });
  }

  instantiateModuleHelperClasses = () => {
    new RepricerHelper(this.mainWindow);
    new AutoorderHelper(this.mainWindow);
    new Account(this.mainWindow);
  }

  // Runs a check to see whether the base 'Dalio' user account exists, if it doesn`t -> create it. This account will hold all Dalio related settings. If a new setting needs to be added -> add it here and be careful with support for older versions
  dalioAccountCheck = async () => {
    global
    .knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(row => {
      if (row === undefined) {
        // Account does not exist -> add default settings and account status
        global
        .knex('tbl_users')
        .insert({
          account: 'dalio',
          settings: JSON.stringify({
            amazon: {
              add_state_tax: '0',
              state_tax_percentage: 6,
              add_vat: '0',
              vat_percentage: 20,
              add_amazon_fee: '0',
              amazon_fee_percentage: 15,
              use_refactor_percentage: '0',
              refactor_fixed_sum: 0,
              refactor_percentage: 15,
            },
            ebay: {
              add_state_tax: '0',
              state_tax_percentage: 6,
              add_vat: '0',
              vat_percentage: 20,
              add_ebay_fee: '0',
              ebay_fee: 11,
              add_paypal_fee: '0',
              paypal_fee_percentage: 2.9,
              paypal_fixed_fee: 0.30,
              use_refactor_percentage: '0',
              refactor_percentage: 15,
              refactor_fixed_sum: 0,
            },
            ebay_inventory_manager: {
              manage_inventory: '0',
              out_of_stock_action: '1',
              lower_quantity_threshold: 1,
              higher_quantity_threshold: 10,
              title_similarity_threshold:  90
            },
            onboarding: {
              show: true,
              sign_in_amazon: false,
              sign_in_ebay: false,
              add_first_listing: false
            },
            app: {
              start_dalio_at_system_startup: '0',
              start_repricer_at_app_startup: '1'
            }
          })
        }).catch(err => global.appLog.error(err));
      } else {
        const settingsParsed = JSON.parse(row.settings);  
        let needsUpdate = false;

        if (settingsParsed.ebay_inventory_manager !== undefined) {
          // Check if certain setting keys have been declared (if not -> declare them)
          if (settingsParsed.ebay_inventory_manager.manage_inventory === undefined) {
            settingsParsed.ebay_inventory_manager.manage_inventory = '0';
            needsUpdate = true;
          }

          // Check if certain setting keys have been declared (if not -> declare them)
          if (settingsParsed.ebay_inventory_manager.out_of_stock_action === undefined) {
            settingsParsed.ebay_inventory_manager.out_of_stock_action = '1';
            needsUpdate = true;
          }

          if (settingsParsed.ebay_inventory_manager.lower_quantity_threshold === undefined) {
            settingsParsed.ebay_inventory_manager.lower_quantity_threshold = 1;
            needsUpdate = true;
          }

          if (settingsParsed.ebay_inventory_manager.higher_quantity_threshold === undefined) {
            settingsParsed.ebay_inventory_manager.higher_quantity_threshold = 10;
            needsUpdate = true;
          }

          if (settingsParsed.ebay_inventory_manager.title_similarity_threshold === undefined) {
            settingsParsed.ebay_inventory_manager.title_similarity_threshold = 90;
            needsUpdate = true;
          }

        } else {
          needsUpdate = true;
          settingsParsed.ebay_inventory_manager = {};
          settingsParsed.ebay_inventory_manager.manage_inventory = '0';
          settingsParsed.ebay_inventory_manager.out_of_stock_action = '1';
          settingsParsed.ebay_inventory_manager.lower_quantity_threshold = 1;
          settingsParsed.ebay_inventory_manager.higher_quantity_threshold = 10;
          settingsParsed.ebay_inventory_manager.title_similarity_threshold = 90;
        }

        if (settingsParsed.app !== undefined) {
          if (settingsParsed.app.start_dalio_at_system_startup === undefined) {
            needsUpdate = true;
            settingsParsed.app.start_dalio_at_system_startup = '0';
          }

          if (settingsParsed.app.start_repricer_at_app_startup === undefined) {
            needsUpdate = true;
            settingsParsed.app.start_repricer_at_app_startup = '1';
          }
        } else {
          needsUpdate = true;
          settingsParsed.app = {};
          settingsParsed.app.start_dalio_at_system_startup = '0';
          settingsParsed.app.start_repricer_at_app_startup = '1';
        }

        if (needsUpdate) {
          global
          .knex('tbl_users')
          .where({ account: 'dalio' })
          .update({
            settings: JSON.stringify(settingsParsed)
          })
          .catch(error => global.appLog.error(`${error} - inside dalioHelper.dalioAccountCheck - line 639`));
        }
      }
      return null;
    }).catch(err => global.appLog.error(err));
  };

  // Helper function that returns the main Dalio account status
  getAccountStatus = async () => {
    const accountRow = await global
    .knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(row => row)
    .catch(err => global.appLog.error('getAccountStatus', err));

    if (accountRow !== undefined) {
      global.accountStatus = accountRow.status;
      if (accountRow.status !== 0) {
        global.accountEmail = accountRow.email;
      }

      return accountRow.status;
    }
    
    return null;
  };

  sendListingsToServer = async () => {
    // Get the current Dalio user information from the DB
    const userRow: AccountRow | void = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(row => row)
    .catch(error => global.appLog.error(`${error} - in DalioHelper.sendListingsToServer - line 582`));
    
    // If there is an account loggedin -> there will be an email address
    if (userRow.email !== undefined && userRow.email !== null && userRow.email !== '' && userRow.email !== 'godmode@dalio.io' && userRow.status !== 0) {
      // Query all the user`s listings
      const listings = await global.knex('tbl_listings')
      .then(rows => rows)
      .catch(error => global.appLog.error(`${error} - in DalioHelper.sendListingsToServer - line 587`));

      // If there are any listings
      if (listings.length > 0) {
        const listingsMapped = listings.map(listing => {
          listing.time_created = listing.created_at;
          listing.user_email = userRow.email;
          return listing;
        });

        ServerCommunications.sendListings('update', listingsMapped);
      }
    }
  }

  normalizeListingsLocalRefactorSettings = async () => {
    const listings = await global.knex('tbl_listings')
    .select()
    .then(rows => rows)
    .catch(e => global.appLog.error(`${e} - DalioHelper.normalizeListingsLocalRefactorSettings`));

    if (listings.length > 0) {
      for (let i = 0; i < listings.length; i++) {
        if (listings[i].has_variations === '0' && listings[i].local_refactor_settings !== null) {
          let settings = JSON.parse(listings[i].local_refactor_settings);
          let needsChange = false;

          if (settings.use_refactor_percentage === undefined) {
            settings.use_refactor_percentage = '0';
            needsChange = true;
          }

          if (settings.add_vat === undefined || settings.vat_percentage === undefined) {
            settings.add_vat = '0';
            settings.vat_percentage = '20';
            needsChange = true;
          }

          if (needsChange) {
            settings = JSON.stringify(settings);
            global.knex('tbl_listings')
            .where({ store_id: listings[i].store_id })
            .update({ local_refactor_settings: settings })
            .catch(e => global.appLog.error(`${e} - DalioHelper.normalizeListingsLocalRefactorSettings - line 612`));
          }
        }
      }
    }
  }

  normalizeDatabaseColumns = () => {
    // ADDED - version 0.1.35 - Check if the orders table has a 'ordered_at' and 'errors' columns
    global.knex.schema.hasColumn('tbl_orders', 'ordered_at')
    .then((exists) => {

      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('ordered_at');
          table.integer('errors').defaultTo(0);
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'ordered_at' to tbl_orders) - line 500`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 564`));

    // ADDED - version 0.1.35 - Check if the orders table has a 'ordered_at' and 'errors' columns
    global.knex.schema.hasColumn('tbl_orders', 'order_verified_at_source')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('order_verified_at_source').defaultTo('0');
          table.string('logs');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'order_verified_at_source' to tbl_orders) - line 472`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 476`));

    // ADDED - version 0.1.36 - Check if the listings table has a 'pause_listing' column
    global.knex.schema.hasColumn('tbl_listings', 'pause_listing')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.string('pause_listing').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'pause_listing' to tbl_listings) - line 472`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 476`));

    // table.boolean('product_changed').defaultTo(0);

    // ADDED - version 0.1.36 - Check if the listings table has a 'product_changed' column
    global.knex.schema.hasColumn('tbl_listings', 'product_changed')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.boolean('product_changed').defaultTo(0);
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'product_changed' to tbl_listings) - line 504`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 476`));

    // ADDED - version 0.1.36 - Check if the listings table has a 'supplier_item_name' column
    global.knex.schema.hasColumn('tbl_listings', 'supplier_item_name')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.string('supplier_item_name');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'supplier_item_name' to tbl_listings) - line 519`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 524`));

    // ADDED - version 0.1.45 - Check if the orders table has a 'being_ordered_at_source' column
    global.knex.schema.hasColumn('tbl_orders', 'being_ordered_at_source')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('being_ordered_at_source').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'being_ordered_at_source' to tbl_orders) - line 573`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 578`));

    // ADDED - version 0.1.46 - Check if the listings table has a 'logs' column
    global.knex.schema.hasColumn('tbl_listings', 'logs')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.string('logs');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'logs' to tbl_listings) - line 595`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 524`));

    // ADDED - version 0.1.46 - Create tbl_listing_logs table
    global.knex.schema.hasTable('tbl_listing_logs').then(exists => {
      if (!exists) {
        global.knex.schema.createTable('tbl_listing_logs', table => {
          table.increments('id').primary();
          table.integer('listing_id');
          table.string('log');
          table.string('level').defaultTo('info');
          table.string('time_created');
        })
        .catch(errorCr => global.appLog.error(errorCr));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 631`));

    // ADDED - version 0.1.46 - Create tbl_order_logs table
    global.knex.schema.hasTable('tbl_order_logs').then(exists => {
      if (!exists) {
        global.knex.schema.createTable('tbl_order_logs', table => {
          table.increments('id').primary();
          table.integer('order_id');
          table.string('log');
          table.string('level').defaultTo('info');
          table.string('time_created');
        })
        .catch(errorCr => global.appLog.error(errorCr));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 648`));

    // ADDED - version 0.1.48 - Check if the users table has a 'order_info' column
    global.knex.schema.hasColumn('tbl_users', 'order_info')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_users', table => {
          table.string('order_info');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'order_info' to tbl_users) - line 667`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 524`));

    // ADDED - version 0.1.49 - Check if the orders table has a 'source_order_url' column
    global.knex.schema.hasColumn('tbl_orders', 'source_order_url')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('source_order_url');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'source_order_url' to tbl_orders) - line 684`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 689`));

    // ADDED - version 0.1.49 - Check if the orders table has a 'being_marked_as_shipped' column
    global.knex.schema.hasColumn('tbl_orders', 'being_marked_as_shipped')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('being_marked_as_shipped').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'being_marked_as_shipped' to tbl_orders) - line 573`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 578`));

    // ADDED - version 0.1.49 - Check if the orders table has a 'source_order_html' column
    global.knex.schema.hasColumn('tbl_orders', 'source_order_html')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('source_order_html');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'source_order_html' to tbl_orders) - line 716`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 721`));

    // ADDED - version 0.1.49 - Check if the orders table has a 'proxy_tracking_number' column
    global.knex.schema.hasColumn('tbl_orders', 'proxy_tracking_number')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('proxy_tracking_number');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'proxy_tracking_number' to tbl_orders) - line 731`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 736`));

    // ADDED - version 0.1.49 - Check if the orders table has a 'source_order_carrier' column
    global.knex.schema.hasColumn('tbl_orders', 'source_order_carrier')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('source_order_carrier');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'source_order_carrier' to tbl_orders) - line 747`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 752`));

    // ADDED - version 0.1.49 - Check if the orders table has a 'tracking_sent_to_bce' column
    global.knex.schema.hasColumn('tbl_orders', 'tracking_sent_to_bce')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('tracking_sent_to_bce').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'tracking_sent_to_bce' to tbl_orders) - line 763`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 752`));

    // ADDED - version 0.1.49 - Check if the orders table has a 'source_order_status' column
    global.knex.schema.hasColumn('tbl_orders', 'source_order_status')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('source_order_status');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'source_order_status' to tbl_orders) - line 779`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 784`));

    // ADDED - version 0.1.49 - Check if the orders table has a 'long_ebay_order_number' column
    global.knex.schema.hasColumn('tbl_orders', 'long_ebay_order_number')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('long_ebay_order_number');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'long_ebay_order_number' to tbl_orders) - line 795`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 800`));

    // ADDED - version 0.1.50 - Check if the orders table has a 'status_delivered_sent_to_bce' column
    global.knex.schema.hasColumn('tbl_orders', 'status_delivered_sent_to_bce')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('status_delivered_sent_to_bce').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'status_delivered_sent_to_bce' to tbl_orders) - line 811`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 816`));

    // ADDED - version 0.1.50 - Check if the listings table has a 'force_oos' column
    global.knex.schema.hasColumn('tbl_listings', 'force_oos')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.string('force_oos').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'force_oos' to tbl_listings) - line 828`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 833`));

    // ADDED - version 0.1.52 - Check if the orders table has a 'store_order_url' column
    global.knex.schema.hasColumn('tbl_orders', 'store_order_url')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('store_order_url');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'store_order_url' to tbl_orders) - line 848`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 853`));

    // ADDED - version 0.1.52 - Check if the listings table has a 'reprice_breakdown' column
    global.knex.schema.hasColumn('tbl_listings', 'reprice_breakdown')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.string('reprice_breakdown');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'logs' to reprice_breakdown) - line 864`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 869`));

    // ADDED - version 0.1.55 - Check if the listings table has a 'asin_sku' column
    global.knex.schema.hasColumn('tbl_listings', 'asin_sku')
    .then((exists) => {
      // If it doesn`t -> add it
      if (exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.renameColumn('asin_sku', 'store_id');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor - line 879`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 884`));

    // ADDED - version 0.1.55 - Check if the listings table has a 'matched_listing_asin_sku' column
    global.knex.schema.hasColumn('tbl_orders', 'matched_listing_asin_sku')
    .then((exists) => {
      // If it doesn`t -> add it
      if (exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.renameColumn('matched_listing_asin_sku', 'matched_listing_store_id');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor - line 894`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 899`));

    // ADDED - version 0.1.55 - Check if the orders table has a 'asin_sku' column
    global.knex.schema.hasColumn('tbl_orders', 'asin_sku')
    .then((exists) => {
      // If it doesn`t -> add it
      if (exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.renameColumn('asin_sku', 'store_id');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor - line 1143`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1148`));

    // ADDED - version 0.1.55 - Check if the orders table has a 'store_watches' column
    global.knex.schema.hasColumn('tbl_listings', 'store_watches')
    .then((exists) => {
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.string('store_watches').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper - line 1159`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1164`));

    // ADDED - version 0.1.55 - Check if the listings table has a 'watchers' column
    global.knex.schema.hasColumn('tbl_listings', 'watchers')
    .then((exists) => {
      // If it doesn`t -> add it
      if (exists) {
        global.knex.schema.table('tbl_listings', table => {
          // table.renameColumn('watchers', 'store_watches');
          table.dropColumn('watchers');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor - line 1179`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1184`));

     // ADDED - version 0.1.55 - Check if the orders table has a 'store_watches' column
     global.knex.schema.hasColumn('tbl_listings', 'store_page_visits')
     .then((exists) => {
       if (!exists) {
         global.knex.schema.table('tbl_listings', table => {
           table.string('store_page_visits').defaultTo('0');
         })
         .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper - line 1173`));
       }
 
       return null;
     })
     .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1178`));

    // ADDED - version 0.1.55 - Check if the listings table has a 'page_visits' column
    global.knex.schema.hasColumn('tbl_listings', 'page_visits')
    .then((exists) => {
      // If it doesn`t -> add it
      if (exists) {
        global.knex.schema.table('tbl_listings', table => {
          // table.renameColumn('page_visits', 'store_page_visits');
          table.dropColumn('page_visits');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor - line 1208`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1213`));

    // ADDED - version 0.1.55 - Check if the orders table has a 'tracking_uploaded' column
    global.knex.schema.hasColumn('tbl_orders', 'tracking_uploaded')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('tracking_uploaded').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'tracking_uploaded' to tbl_orders) - line 1189`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 816`));


    // ADDED - version 0.1.55 - Check if the listings table has a 'use_maximum_price' column
    global.knex.schema.hasColumn('tbl_listings', 'use_maximum_price')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.string('use_maximum_price').defaultTo(0);
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'use_maximum_price' to tbl_listings) - line 1205`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1210`));

    // ADDED - version 0.1.55 - Check if the listings table has a 'is_deleted' column
    global.knex.schema.hasColumn('tbl_listings', 'is_deleted')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.string('is_deleted').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'is_deleted' to tbl_listings) - line 1220`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1225`));

    // ADDED - version 0.1.55 - Check if the listings table has a 'store_items_sold' column
    global.knex.schema.hasColumn('tbl_listings', 'store_items_sold')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_listings', table => {
          table.string('store_items_sold').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'store_items_sold' to tbl_listings) - line 1270`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1275`));

    // ADDED - version 0.1.59 - Check if the orders table has a 'supplier_account' column
    global.knex.schema.hasColumn('tbl_orders', 'supplier_account')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('supplier_account');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'supplier_account' to tbl_orders) - line 1288`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1293`));

    // ADDED - version 0.1.59 - Check if the orders table has a 'store_feedback' and 'leaving_store_feedback' column
    global.knex.schema.hasColumn('tbl_orders', 'store_feedback')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('store_feedback').defaultTo('0');
          table.string('leaving_store_feedback').defaultTo('0');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'store_feedback' to tbl_orders) - line 1306`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1311`));

    // ADDED - version 1.0.60 - Check if the orders table has a 'parsed_date_sold' column
    global.knex.schema.hasColumn('tbl_orders', 'parsed_date_sold')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('parsed_date_sold');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'parsed_date_sold' to tbl_orders) - line 1323`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1328`));

    // ADDED - version 1.0.60 - Check if the orders table has a 'buyer_note' column
    global.knex.schema.hasColumn('tbl_orders', 'buyer_note')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('buyer_note');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'buyer_note' to tbl_orders) - line 1338`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1343`));

    // ADDED - version 1.0.60 - Check if the orders table has a 'send_to_server' column
    global.knex.schema.hasColumn('tbl_orders', 'send_to_server')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_orders', table => {
          table.string('send_to_server').defaultTo('1');
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'send_to_server' to tbl_orders) - line 1353`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1358`));

    // ADDED - version 0.1.60 - Check if the users table has a 'tracking_funds' column
    global.knex.schema.hasColumn('tbl_users', 'tracking_funds')
    .then((exists) => {
      // If it doesn`t -> add it
      if (!exists) {
        global.knex.schema.table('tbl_users', table => {
          table.float('tracking_funds').defaultTo(0);
        })
        .catch(error2 => global.appLog.error(`${error2} - inside DalioHelper constructor (add 'tracking_funds' to tbl_users) - line 1370`));
      }

      return null;
    })
    .catch(err => global.appLog.error(`${err} - inside DalioHelper constructor (schema.hasColumn) - line 1375`));
  }

  systemStartupAction = async () => {
    if (process.env.NODE_ENV === 'production') {
      const appInfo = await global.knex('tbl_users')
      .where({ account: 'dalio' })
      .first()
      .then(row => row)
      .catch(e => global.appLog.error(`${e} - at DalioHelper.systemStartupAction - line 743`));

      const settings = JSON.parse(appInfo.settings);

      if (settings.app.start_dalio_at_system_startup === '1') {
        // START APP ON OS STARTUP
          app.setLoginItemSettings({
              openAtLogin: true,
              path: app.getPath("exe")
          });
      
      } else {
        app.setLoginItemSettings({ openAtLogin: false });
      }
    }
  }
}

export default DalioHelper;
