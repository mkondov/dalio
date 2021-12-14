/* eslint no-restricted-syntax: 0 */
/* eslint use-isnan: 0 */
/* eslint no-shadow: 0 */
/* eslint radix: 0 */
/* eslint no-restricted-globals: 0 */
/* eslint no-lonely-if: 0 */
/* eslint eqeqeq: 0 */
/* eslint operator-assignment: 0 */
/* eslint no-new: 0 */
/* eslint no-plusplus: 0 */
/* eslint no-await-in-loop: 0 */

import moment from 'moment';
import { ipcMain } from 'electron';
import isOnline from 'is-online';
import Amazon from '../amazon/Amazon';
import Ebay from '../ebay/Ebay';
import Listings from './Listings';
import Walmart from '../suppliers/Walmart';
import AmazonSupplier from '../suppliers/AmazonSupplier';
import AliExpress from '../suppliers/AliExpress';
import HomeDepot from '../suppliers/HomeDepot';
import VidaXL from '../suppliers/VidaXL';

import Util from '../../core/util/Util';

class RepricerHelper {

  getPriceQueue = [];

  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.walmart = new Walmart(this);
    this.amazonSupplier = new AmazonSupplier(this);
    this.aliExpress = new AliExpress(this);
    this.homeDepot = new HomeDepot(this);
    this.vidaXL = new VidaXL(this);
    this.listingsClass = new Listings(this);

    this.instantiateDependantClasses();
    /*
     * Listen for the get-stats call from the renderer process -> query the rows from the DB -> send them back
     */
    ipcMain.on('get-repricer-stats', async event => {
      global.knex
        .select()
        .from('tbl_repricer_stats')
        .then(rows => {
          if (rows.length > 0) {
            event.sender.send('get-repricer-stats', rows);
          }
          return null;
        }).catch(error => global.appLog.error(`${error} - IpcListeners.js get-repricer-stats`));
    });

    // TESTS
    ipcMain.on('check-prices', async () => {
      const connectionStatus = await isOnline();
      if (connectionStatus) {
        this.getPrices();
      } else {
        global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
      }
    });

    ipcMain.on('refactor-prices', async () => {
      this.refactorPrices();
    });

    ipcMain.on('check-price', async (event, listing) => {
      this.getPrice(listing);
    });
  }

  instantiateDependantClasses = () => {
    new Amazon(this);
    new Ebay(this);
  }

  getPrices = async () => {
    global.appLog.info(`Source price checking started.`);

    const promises = [];

    if (!global.walmartPriceCheckIntervalIsRunning) {
      promises.push(this.walmart.getPrices());
    }

    if (!global.amazonPriceCheckIntervalIsRunning) {
      promises.push(this.amazonSupplier.getPrices());
    }

    if (!global.aliExpressPriceCheckIntervalIsRunning) {
      promises.push(this.aliExpress.getPrices());
    }

    if (!global.homeDepotPriceCheckIntervalIsRunning) {
      promises.push(this.homeDepot.getPrices());
    }

    if (!global.vidaXLPriceCheckIntervalIsRunning) {
      promises.push(this.vidaXL.getPrices());
    }

    await Promise.all(promises);
    await this.refactorPrices();
    await this.listingsClass.sendListingsToFrontEnd();

    global.nucleus.track("REPRICER-CHECKED-SOURCE-PRICES", {
      description: 'The user`s source prices` check has been performed.',
      email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
    });
  };

  getPrice = async (listing) => {
    // Check if a listing is passed (if yes, probably a new listing will be added to the queue, if not, it is probably a call to finish the rest of the queu)
    if (listing !== undefined) {
      let listingIsInTheQueue = false;

      // Check if the current listing is queued in the getPriceQueue
      if (this.getPriceQueue.length > 0) {
        for (let i = 0; i < this.getPriceQueue.length; i++) {
          if (this.getPriceQueue[i].store_id === listing.store_id) {
            listingIsInTheQueue = true;
          }
        }
      } 

      if (!listingIsInTheQueue) {
        this.getPriceQueue.push(listing);
      }
    }

    if (this.getPriceQueue.length > 0) {

      this.mainWindow.webContents.send('update-manual-price-checker-notification', { total_listings: this.getPriceQueue.length });

      if (this.getPriceQueue[0].supplier === 'amazon') {
        this.mainWindow.webContents.send('update-manual-price-checker-notification', { status: true, total_listings: this.getPriceQueue.length - 1, supplier: 'amazon' });

        if (!global.amazonSinglePriceCheckerIsRunning) {
          const queueListing = JSON.parse(JSON.stringify(this.getPriceQueue[0]));
          this.mainWindow.webContents.send('update-manual-price-checker-notification', { item_name: this.getPriceQueue[0].item_name });

          this.getPriceQueue.shift();
          await this.amazonSupplier.checkPrice(queueListing);
          await this.listingsClass.sendListingsToFrontEnd();
        }
      } else if (this.getPriceQueue[0].supplier === 'walmart') {
        this.mainWindow.webContents.send('update-manual-price-checker-notification', { status: true, total_listings: this.getPriceQueue.length - 1, supplier: 'walmart' });

        if (!global.walmartSinglePriceCheckerIsRunning) {
          const queueListing = JSON.parse(JSON.stringify(this.getPriceQueue[0]));
          this.mainWindow.webContents.send('update-manual-price-checker-notification', { item_name: this.getPriceQueue[0].item_name });

          this.getPriceQueue.shift();
          await this.walmart.checkPrice(queueListing);
          await this.listingsClass.sendListingsToFrontEnd();
        }
      } else if (this.getPriceQueue[0].supplier === 'vidaxl') {
        this.mainWindow.webContents.send('update-manual-price-checker-notification', { status: true, total_listings: this.getPriceQueue.length - 1, supplier: 'vidaxl' });

        if (!global.vidaXLSinglePriceCheckerIsRunning) {
          const queueListing = JSON.parse(JSON.stringify(this.getPriceQueue[0]));
          this.mainWindow.webContents.send('update-manual-price-checker-notification', { item_name: this.getPriceQueue[0].item_name });

          this.getPriceQueue.shift();
          await this.vidaXL.checkPrice(queueListing);
          await this.listingsClass.sendListingsToFrontEnd();
        }
      } else if (this.getPriceQueue[0].supplier === 'homedepot') {
        this.mainWindow.webContents.send('update-manual-price-checker-notification', { status: true, total_listings: this.getPriceQueue.length - 1, supplier: 'homedepot' });

        if (!global.homeDepotSinglePriceCheckerIsRunning) {
          const queueListing = JSON.parse(JSON.stringify(this.getPriceQueue[0]));
          this.mainWindow.webContents.send('update-manual-price-checker-notification', { item_name: this.getPriceQueue[0].item_name });

          this.getPriceQueue.shift();
          await this.homeDepot.checkPrice(queueListing);
          await this.listingsClass.sendListingsToFrontEnd();
        }
      } else if (this.getPriceQueue[0].supplier === 'aliexpress') {
        this.mainWindow.webContents.send('update-manual-price-checker-notification', { status: true, total_listings: this.getPriceQueue.length - 1, supplier: 'aliexpress' });

        if (!global.walmartSinglePriceCheckerIsRunning) {
          const queueListing = JSON.parse(JSON.stringify(this.getPriceQueue[0]));
          this.mainWindow.webContents.send('update-manual-price-checker-notification', { item_name: this.getPriceQueue[0].item_name });

          this.getPriceQueue.shift();
          await this.aliExpress.checkPrice(queueListing);
          await this.listingsClass.sendListingsToFrontEnd();
        }
      }
    } else {
      this.mainWindow.webContents.send('update-manual-price-checker-notification', { status: false });

    }

    // if (!global.walmartPriceCheckIntervalIsRunning) {
    //   promises.push(this.walmart.getPrices());
    // }

    // if (!global.amazonPriceCheckIntervalIsRunning) {
    //   promises.push(this.amazonSupplier.getPrices());
    // }

    // if (!global.aliExpressPriceCheckIntervalIsRunning) {
    //   promises.push(this.aliExpress.getPrices());
    // }

    // if (!global.homeDepotPriceCheckIntervalIsRunning) {
    //   promises.push(this.homeDepot.getPrices());
    // }

    // if (!global.vidaXLPriceCheckIntervalIsRunning) {
    //   promises.push(this.vidaXL.getPrices());
    // }

    // await Promise.all(promises);

  };

  refactorPrices = async () => {
    global.refactorPricesIntervalIsRunning = true;

    const dalioAccountRow = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(row => row)
    .catch(error => global.appLog.error(`${error} - in repricerHelper.refactorPrices - line 74`));


    if (dalioAccountRow !== undefined) {
      if (dalioAccountRow.settings !== null) {
        const settings = JSON.parse(dalioAccountRow.settings);

        const listings = await global.knex('tbl_listings')
        .select()
        .then(listings => listings)
        .catch(error => global.appLog.error(`${error} - in repricerHelper.refactorPrices - line 69`));


        if (listings.length !== 0) {
          // If yes, iterate through all of them
          // eslint-disable-next-line
          for (const listing of listings) {  
            // Do not refactor prices if they are null or empty strings (this is a case if he listing is not yet connected to a source)
            if (listing.new_price !== null && listing.new_price !== "") {
              let refactoredPrice = parseFloat(listing.new_price);
              const localRefactorSettings = JSON.parse(listing.local_refactor_settings);

              // If the product is OUT of stock -> increase the price dramatically in order to prevent users from buying it
              if ((listing.product_availability === 'OUT_OF_STOCK' || listing.product_availability === '0' || listing.product_changed !== 0 || listing.force_oos == '1') && settings.ebay_inventory_manager.out_of_stock_action == '1') {
                
                // If the price is less than $10 -> increase the price 8x
                if (refactoredPrice < 10) {

                  refactoredPrice = (refactoredPrice + refactoredPrice * (400/100));
                } else if (refactoredPrice >= 10 && refactoredPrice < 50) {

                  // Else if the price is between $10 and $50 -> increase the price 5x
                  refactoredPrice = (refactoredPrice + refactoredPrice * (300/100));
                } else if (refactoredPrice >= 50) {

                  // Else if the price is greater than $50 -> increase the price 3x
                  refactoredPrice = (refactoredPrice + refactoredPrice * (150/100));
                }
              } else {
                /* 
                * Else if the product is IN of stock -> continue with normal repricing
                */ 

                if (settings.amazon === undefined || settings.ebay === undefined) {
                  return null;
                }

                const repriceResults = await Util.calculateSalePrice(listing.new_price, listing.use_global_refactor_settings == '0' ? localRefactorSettings : settings.ebay);

                await global
                .knex('tbl_listings')
                .where({ store_id: listing.store_id })
                .update({ reprice_breakdown: JSON.stringify(repriceResults) })
                .catch(err => global.appLog.error(err));

                refactoredPrice = parseFloat(repriceResults.target_price);
      
              }

              // console.log('product availability', listing.product_availability);
              // console.log('refactored price', refactoredPrice);
              // console.log(listing.id, ' - ', listing.refactored_price, '->', refactoredPrice, ', use refactor percentage - ', settings.ebay.use_refactor_percentage);

              const currentRefactoredPrice = parseFloat(listing.refactored_price);
              
              // Check if the listing has a minimum price under which the repricer should not go
              if (listing.use_minimum_price == '1') {
                const minimumPrice = parseFloat(localRefactorSettings.minimum_price);
                // If there is a minimum price and the repricer is trying to go below it -> make the refactoredPrice the minimum price
                if (!isNaN(minimumPrice) && !isNaN(refactoredPrice)) {
                  if (refactoredPrice < minimumPrice) {
                    refactoredPrice = minimumPrice;
                  }
                }
              }

              // Check if the listing has a maximum price above which the repricer should not go
              if (listing.use_maximum_price == '1') {
                const maximumPrice = parseFloat(localRefactorSettings.maximum_price);
                // If there is a maximum price and the repricer is trying to go above it -> make the refactoredPrice the maximum price
                if (!isNaN(maximumPrice) && !isNaN(refactoredPrice)) {
                  if (refactoredPrice > maximumPrice) {
                    refactoredPrice = maximumPrice;
                  }
                }
              }

              // console.log('refactored price', typeof refactoredPrice, refactoredPrice);
              // console.log('current refactored price', typeof currentRefactoredPrice, currentRefactoredPrice)

              // Check if the price is a number when parsed
              if (!isNaN(refactoredPrice)) {
                // Check if the refactored price is not equal to the current refactored price of the listing or is not equal to its current price
                if (refactoredPrice.toFixed(2) !== currentRefactoredPrice) {
                  // Make sure that the refactored price is not 0 or less
                  if (refactoredPrice >= 0) {
                    // add it
                    await global
                    .knex('tbl_listings')
                    .where({ store_id: listing.store_id })
                    .update({ refactored_price: refactoredPrice.toFixed(2) })
                    .catch(err => global.appLog.error(err));
                  } else {
                    const escapedLog = encodeURI(`Cannot reprice '${listing.item_name}' to ${refactoredPrice.toFixed(2)}. The reprice amount must be greater than 0. Please, revise your reprice formula.`);
                    global.log.error(escapedLog);
                  }
                }
              }
            }
          }
        }

      }
    }

    this.listingsClass.sendListingsToFrontEnd();

    global.refactorPricesIntervalIsRunning = false;

    global.nucleus.track("REPRICER-REFACTOR-SOURCE-PRICES", {
      description: 'The user`s source prices` had been refactored.',
      email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
    });

    global.appLog.info(`Source prices have been refactored.`);

  };

  handleStats = async (action, number) => {
    // Get the current date so it can be used to check whether stats have been tracked for today
    const currentDate = moment().format('DD/MM/YYYY');

    // Switch statement tracks which action has to be handled
    switch (action) {
      case 'increase-total-reprices':
        // Query the stats table for a 'repricer' table entry that has today`s date
        global.knex
          .select()
          .from('tbl_repricer_stats')
          .where('created_at', '=', currentDate)
          .first()
          .then(row => {
            const currentDate = moment().format('DD/MM/YYYY');
            // If there is no stat entry from today`s date
            if (row === undefined) {
              global.knex
                .select()
                .from('tbl_repricer_stats')
                .then(rows => {
                  // If there are still no rows in the stats table
                  if (rows.length === 0) {
                    // There shouldn`t be such a case as there needs to be at least one listing in order to reprice anything
                    global
                      .knex('tbl_repricer_stats')
                      .insert({
                        total_listings: 0,
                        total_reprices: number,
                        created_at: currentDate
                      })
                      .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 108`));
                  } else {
                    // If  there are other rows, get the total listings count from the last stats` row
                    const totalListings = parseInt(
                      rows[rows.length - 1].total_listings
                    );

                    // Add it back to the DB together with the number specified for total_reprices
                    global
                      .knex('tbl_repricer_stats')
                      .insert({
                        total_listings: totalListings,
                        total_reprices: number,
                        created_at: currentDate
                      })
                      .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 123`));
                  }
                  return null;
                })
                .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 127`));
            } else {
              // If there is -> parse the string into an integer and manipulate the required data
              let totalReprices = parseInt(row.total_reprices);
              totalReprices += number;

              // Save the stats JSON back to the 'stats' table
              global
                .knex('tbl_repricer_stats')
                .where('created_at', '=', currentDate)
                .update({
                  total_reprices: totalReprices
                })
                .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 140`));
            }
            return null;
          })
          .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 144`));
        break;
      case 'increase-total-listings':
        // Query the stats table for a 'repricer' table entry that has today`s date
        global.knex
          .select()
          .from('tbl_repricer_stats')
          .where('created_at', '=', currentDate)
          .first()
          .then(row => {
            const currentDate = moment().format('DD/MM/YYYY');
            // If there is no stats entry from today
            if (row === undefined) {
              // Query all rows
              global.knex
                .select()
                .from('tbl_repricer_stats')
                .then(rows => {
                  // If there are still no rows in the stats table
                  if (rows.length === 0) {
                    // Insert a row with 'total_listings' value of the number provided above
                    global
                      .knex('tbl_repricer_stats')
                      .insert({
                        total_listings: number,
                        total_reprices: 0,
                        created_at: currentDate
                      })
                      .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 172`));
                  } else {
                    // If  there are other rows, get the total listings count from the last stats` row
                    let totalListings = parseInt(rows[rows.length - 1].total_listings);
                    // Add the specified number of listings to the total number until now
                    totalListings += number;
                    // Add it back to the DB
                    global
                      .knex('tbl_repricer_stats')
                      .insert({
                        total_listings: totalListings,
                        total_reprices: 0,
                        created_at: currentDate
                      })
                      .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 188`));
                  }
                  return null;
                })
                .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 192`));
            } else {
              // If there is a stats entry from today -> parse its 'total_listings' value into an integer and manipulate it
              let totalListings = parseInt(row.total_listings);
              // Add the provided number to the total_listings count
              totalListings += number;
              // Save the stats back to the 'repricer_stats' table
              global
                .knex('tbl_repricer_stats')
                .where('created_at', '=', currentDate)
                .update({
                  total_listings: totalListings
                })
                .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 205`));
            }
            return null;
          })
          .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 209`));
        break;
      case 'decrease-total-listings':
        // Query the stats table for a 'repricer' table entry that has today`s date
        global.knex
          .select()
          .from('tbl_repricer_stats')
          .where('created_at', '=', currentDate)
          .first()
          .then(row => {
            const currentDate = moment().format('DD/MM/YYYY');
            // If there is no stats entry from today
            if (row === undefined) {
              // Query all rows
              global.knex
                .select()
                .from('tbl_repricer_stats')
                .then(rows => {
                  // If there are still no rows in the stats table
                  if (rows.length === 0) {
                    // Insert a row with zero values as there should be no 'total_listings' at all
                    global
                      .knex('tbl_repricer_stats')
                      .insert({
                        total_listings: 0,
                        total_reprices: 0,
                        created_at: currentDate
                      })
                      .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 237`));
                  } else {
                    // If there are other rows, get the total listings count from the last stats` row
                    let totalListings = parseInt(rows[rows.length - 1].total_listings);

                    // Check if the total listings count is not zero as we cannot sutbract from 0
                    if (totalListings > 0) {
                      // Subtract the total listings count by the value provided
                      totalListings -= number;
                      // Add it back to the DB
                      global
                        .knex('tbl_repricer_stats')
                        .insert({
                          total_listings: totalListings,
                          total_reprices: 0,
                          created_at: currentDate
                        })
                        .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 256`));
                    }
                  }
                  return null;
                })
                .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 261`));
            } else {
              // If there is stats entry from today
              let totalListings = parseInt(row.total_listings);
              // Check if the total listings count is not zero as we cannot sutbract from 0
              if (totalListings > 0) {
                // Subtract the total listings count by the value provided
                totalListings -= number;
                // Add it back to the DB
                global
                  .knex('tbl_repricer_stats')
                  .where('created_at', '=', currentDate)
                  .update({
                    total_listings: totalListings
                  })
                  .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 276`));
              }
            }
            return null;
          })
          .catch(error => global.appLog.error(`${error} - in repricerHelper.handleStats - line 281`));
        break;
      default:
      // do nothing
    }
  };
}

export default RepricerHelper;
