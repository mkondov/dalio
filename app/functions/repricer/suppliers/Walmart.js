/* eslint no-restricted-syntax: 0 */
/* eslint no-await-in-loop: 0 */
/* eslint no-loop-func: 0 */
/* eslint no-param-reassign: 0 */
/* eslint no-shadow: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint no-plusplus: 0 */
/* eslint guard-for-in: 0 */
/* eslint no-else-return: 0 */
/* eslint object-shorthand: 0 */
/* eslint no-unused-vars: 0 */

import Util from '../../core/util/Util';

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality -> makes puppeteer not as easily detectable
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth')();

puppeteer.use(pluginStealth);

class Walmart {
  walmartProducts = [];

  walmartBrowser = false;

  walmartSingleListingSupplierBrowser = false;

  constructor (repricerHelper) {
    this.repricerHelper = repricerHelper;
  }

  getPrices = async () => {
    try {
      // Track that the price check interval is running
      global.walmartPriceCheckIntervalIsRunning = true;
      // Select the listings which have 'Walmart' as a supplier
      global
        .knex('tbl_listings')
        .where({ supplier: 'walmart' })
        .whereNot({ is_deleted: '1' })
        .then(walmartListings => {
          // If there are Walmart-supplier listings
          if (walmartListings.length !== 0) {
            // Filter the parent listings that contain variations -> they should not be a part of the price check process as they are only containers for the variations
            walmartListings = walmartListings.filter(e => e.has_variations === '0');
            // Run the price-checker
            this.checkPrices(walmartListings).then(() => {

                if (this.walmartProducts.length > 0) {
                  // Iterate through all of them
                  for (const product of this.walmartProducts) {
                    // Select the first row in the database that has a specific Walmart ID
                    global
                      .knex('tbl_listings')
                      .where({ supplier_id: product.supplier_id })
                      .first()
                      .then(row => {
                        // Skips the 'undefined' results returned when there is no match
                        if (row !== undefined) {
                          // Check if the new price of a product is different from the one in the database

                          let currentPrice = row.new_price;
                          let newPrice = product.new_price;

                          if (typeof currentPrice === 'number') {
                            currentPrice = currentPrice.toFixed(2);
                          }

                          if (typeof newPrice === 'number') {
                            newPrice = newPrice.toFixed(2);
                          }

                          if (currentPrice !== newPrice) {
                            if (newPrice !== "") {
                              // let escapedLog = encodeURI(`${product.item_name} with Walmart # ${product.supplier_id} has a new price. The old price was ${currentPrice}. The new price is ${newPrice}`);
                              let escapedLog = `Has a new source price. The old price was ${currentPrice}. The new price is ${newPrice}`;

                              if (currentPrice == null) {
                                // escapedLog = encodeURI(`${product.item_name} with Walmart # ${product.supplier_id} has a price of ${newPrice}`);
                                escapedLog = `Has a price of ${newPrice}`;
                              }

                              // global.log.warn(escapedLog);
                              Util.insertListingLog(product, escapedLog, 'info');

                              // If yes, update the price in the database
                              global
                              .knex('tbl_listings')
                              .where({ supplier_id: product.supplier_id })
                              .update({ new_price: newPrice })
                              .catch(error => global.appLog.error(`${error} - walmart.getPrices - line 74`));
                            }
                          }

                          let currentAvailability = row.product_availability;
                          let newAvailability = product.product_availability;

                          if (typeof currentAvailability === 'number') {
                            currentAvailability = currentAvailability.toString();
                          }

                          if (typeof newAvailability === 'number') {
                            newAvailability = newAvailability.toString();
                          }

                          // Check if the new availability of a product is different from the one in the database
                          if (currentAvailability !== newAvailability) {
                            // let escapedLog = encodeURI(`${product.item_name} with Walmart # ${product.supplier_id} is ${newAvailability}`);
                            let escapedLog = `Has a new availability - ${newAvailability}`;

                            if (currentAvailability === 'OUT_OF_STOCK' && newAvailability === 'IN_STOCK') {
                              // escapedLog = encodeURI(`${product.item_name} with Walmart # ${product.supplier_id} is back in stock again.`);
                              escapedLog = `Is back in stock.`;
                            } else if (currentAvailability === 'IN_STOCK' && newAvailability === 'OUT_OF_STOCK') {
                              // escapedLog = encodeURI(`${product.item_name} with Walmart # ${product.supplier_id} is now out of stock.`);
                              escapedLog = `Is out of stock.`;
                            }

                            // global.log.warn(escapedLog);
                            Util.insertListingLog(product, escapedLog, 'info');
                            // If yes, update the availability in the database
                            global.knex('tbl_listings')
                              .where({ supplier_id: product.supplier_id })
                              .update({ product_availability: newAvailability})
                              .catch(error => global.appLog.error(`${error} - walmart.getPrices - line 89`));
                          }
                        }
                        global.walmartPriceCheckIntervalIsRunning = false;
                        return null;
                      })
                      .catch(error => global.appLog.error(`${error} - get walmart listing by a Walmart # - line 109`));
                    
                  }
                  
                  this.walmartProducts.length = 0;
                } else {
                  global.log.info('Your Walmart listings` prices are all up-to-date.');
                  global.walmartPriceCheckIntervalIsRunning = false;
                }
                return null;
              })
              .catch(error => global.appLog.error(`${error} - walmart.checkPrices - line 102`));
            return null;
          }

          global.walmartPriceCheckIntervalIsRunning = false;
          return null;
        })
        .catch(error => global.appLog.error(`${error} - walmart.getPrices - line 110`));
    } catch (error) {
      global.appLog.error(`${error} - catch block of walmart.getPrices - line 112`);
    }
  };

  checkPrice = async walmartListing => {
    try {
      global.walmartSinglePriceCheckerIsRunning = true;
      // Start the amazon price-checker specific browser
      this.walmartSingleListingSupplierBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        // slowMo: 100,
        devtools: false,
        ignoreDefaultArgs: ['--enable-automation'],
        ignoreHTTPSErrors: true,
        args: [
          '--disable-webgl',
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--no-sandbox'
        ],
      });

      await this.iterateListingsAndGetData(this.walmarSingleListingSupplierBrowser, [walmartListing]);
      
      await this.walmarSingleListingSupplierBrowser.close();

      global.walmartSinglePriceCheckerIsRunning = false;

      this.repricerHelper.getPrice();
      return null;
    } catch (error) {
      global.walmartSinglePriceCheckerIsRunning = false;
      global.appLog.error(`${error} - inside walmart.checkPrice - line 184`);
      this.walmarSingleListingSupplierBrowser.close();
      this.repricerHelper.getPrice();
    }
  }

  checkPrices = async walmartListings => {
    try {
      // Start the walmart price-checker specific browser
      this.walmartBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        slowMo: 100,
        devtools: false,
        defaultViewport: null,
        args: [
          '--disable-webgl'
        ],
      });

      const walmartListingsShuffled = Util.shuffleArray(walmartListings);

      const walmartChunks = Util.splitArrayInResizedChunks(walmartListingsShuffled);

      const promises = [];
      if (walmartChunks.length > 1) {
        for (let i = 0; i < walmartChunks.length; i++) {
          promises.push(this.iterateListingsAndGetData(walmartChunks[i]));
        }
      } else {
        promises.push(this.iterateListingsAndGetData(walmartChunks[0]));
      }

      await Promise.all(promises);

      await this.walmartBrowser.close();
      if (this.walmartProducts.length !== 0) {
        return Promise.resolve(true);
      }
      
      return Promise.resolve(false);
    } catch (error) {
      global.appLog.error(`${error} - inside walmart.checkprices - line 226`);
      this.walmartBrowser.close();
    }
  };

  iterateListingsAndGetData = async walmartListings => {
    const page = await this.walmartBrowser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    if (global.proxyUsername !== '' && global.proxyPassword !== '') {
      await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
    }

    // Iterate through all Walmart Listings that have been pulled out of the database
    for (const listing of walmartListings) {
      try {
        if (listing.supplier_url.includes('.walmart.')) {
          // Go to the URL of the listing
          await page.goto(listing.supplier_url, { waitUntil: 'networkidle0', timeout: 0 });
          
          const productData = await page.evaluate(() => {
            // Extract the script tag that has the id of 'item'
            if (document.querySelector('#item') !== null) {
              const productInfo = JSON.parse(document.querySelector('#item').innerHTML);
      
              // Destructure the products` values from the item script tag
              const { midasContext, buyBox } = productInfo.item.product;
              
              const price = midasContext.price;
              const itemId = midasContext.itemId;
              const productAvailability = buyBox.products[0].availabilityStatus;
        
              return { price, itemId, productAvailability };
            } 

            return null;
          });

          if (productData !== null) {
            listing.new_price = productData.price;
            listing.product_availability = productData.productAvailability;
            this.walmartProducts.push(listing);
          }
        } else {
          // const escapedLog = encodeURI(`Listing '${listing.item_name}' does not have a valid ${listing.supplier} URL. Please change it so Dalio can perform a price check.`);
          const escapedLog = `Does not have a valid ${listing.supplier} URL. Please change it so Dalio can perform a price check.`;
          await Util.insertListingLog(listing, escapedLog, 'error');
          // global.log.error(escapedLog);
        }
      } catch (e) {   
        global.appLog.error(`${e} - inside Walmart.iterateListingsAndGetData() line 225`);
      } 
    }
    
    // await page.close();
  }
}

export default Walmart;
