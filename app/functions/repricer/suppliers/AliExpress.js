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

class AliExpress {
  aliExpressBrowser = false;

  aliExpressSingleListingSupplierBrowser = false;

  aliExpressProducts = [];

  constructor(repricerHelper) {
    this.repricerHelper = repricerHelper;
  }

  // This array will hold the information about all products fetched on a price-check run and will later be used to update the DB

  getPrices = async () => {
    try {
      // Track that the price check interval is running
      global.aliExpressPriceCheckIntervalIsRunning = true;
      // Select the listings which have 'Walmart' as a supplier - 1
      global
        .knex('tbl_listings')
        .where({ supplier: 'aliexpress' })
        .whereNot({ is_deleted: '1' })
        .then(aliExpressListings => {
          // If there are Amazon-supplier listings
          if (aliExpressListings.length !== 0) {
            // Filter the parent listings that contain variations -> they should not be a part of the price check process as they are only containers for the variations
            aliExpressListings = aliExpressListings.filter(e => e.has_variations === '0');
            // Run the price-checker
            this.checkPrices(aliExpressListings).then(() => {

                // If there are Amazon products with fetched information
                if (this.aliExpressProducts.length > 0) {
                  // Iterate through all of them
                  for (const product of this.aliExpressProducts) {
 
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
                              // let escapedLog = encodeURI(`${product.item_name} with AliExpress # ${product.supplier_id} has a new price. The old price was ${product.currency}${currentPrice}. The new price is ${product.currency}${newPrice}`);
                              let escapedLog = `Has a new source price. The old price was ${product.currency}${currentPrice}. The new price is ${product.currency}${newPrice}`;

                              if (currentPrice == null) {
                                // escapedLog = encodeURI(`${product.item_name} with AliExpress # ${product.supplier_id} has a price of ${product.currency}${newPrice}`);
                                escapedLog = `Has a price of ${product.currency}${newPrice}`;
                              }

                              // global.log.warn(escapedLog);
                              Util.insertListingLog(product, escapedLog, 'info');

                              // If yes, update the price in the database
                              global
                                .knex('tbl_listings')
                                .where({ supplier_id: product.supplier_id })
                                .update({ new_price: newPrice })
                                .catch(error => global.appLog.error(`${error} - AliExpress.getPrices - line 74`));
                            }
                          }

                          let currentAvailability = row.product_availability;
                          let newAvailability = product.product_availability;
                          // Check if the new price of a product is different from the one in the database

                          if (typeof currentAvailability === 'number') {
                            currentAvailability = currentAvailability.toString();
                          }

                          if (typeof newAvailability === 'number') {
                            newAvailability = newAvailability.toString();
                          }

                          // Check if the new availability of a product is different from the one in the database
                          if (currentAvailability !== newAvailability) {
                            // let escapedLog = encodeURI(`${product.item_name} with AliExpress # ${product.supplier_id} has new product availability - ${newAvailability}`);
                            let escapedLog = `Has new product availability - ${newAvailability}`;

                            // Log a message when the listing is 'In Stock'
                            if (currentAvailability == null && newAvailability !== 'OUT_OF_STOCK' && newAvailability !== '0' && newAvailability !== null) {
                              // escapedLog = encodeURI(`${product.item_name} with AliExpress # ${product.supplier_id} is in stock.`);
                              escapedLog = `Is in stock.`;
                            } else if (currentAvailability !== null && currentAvailability !== '0' && currentAvailability !== 'OUT_OF_STOCK' && (newAvailability === 'OUT_OF_STOCK' || newAvailability === '0')) {
                              // Log a message when the listing goes 'Out of stock'
                              // escapedLog = encodeURI(`${product.item_name} with AliExpress # ${product.supplier_id} has gone out of stock. Its selling price will be increased multiple times in order to prevent customers from buying it.`);
                              escapedLog = `Has gone out of stock.`;
                            } else if (currentAvailability !== null && (currentAvailability === '0' || currentAvailability === 'OUT_OF_STOCK') && newAvailability !== null && newAvailability !== '0' && newAvailability !== 'OUT_OF_STOCK') {
                              // Log a message when the listing comes back 'In Stock'
                              // escapedLog = encodeURI(`${product.item_name} with AliExpress # ${product.supplier_id} is back in stock. Its selling price will be lowered to the one you have specified in your settings.`);
                              escapedLog = `Is back in stock.`;
                            }

                            // global.log.warn(escapedLog);
                            Util.insertListingLog(product, escapedLog, 'info');

                            // If yes, update the availability in the database
                            global.knex('tbl_listings')
                              .where({ supplier_id: product.supplier_id })
                              .update({ product_availability: newAvailability })
                              .catch(error => global.appLog.error(`${error} - AliExpress.getPrices - line 89`));
                          }
                        }
                        global.aliExpressPriceCheckIntervalIsRunning = false;
                        return null;
                      })
                      .catch(error => global.appLog.error(`${error} - get aliexpress listing by a AliExpress # - line 109`));
                    
                  }

                  this.aliExpressProducts.length = 0;
                } else {
                  global.log.info('Your AliExpress listings` prices are all up-to-date.');
                  global.aliExpressPriceCheckIntervalIsRunning = false;
                }
                return null;
              }).catch(error => global.appLog.error(`${error} - AliExpress.checkPrices - line 102`));
            return null;
          }

          global.aliExpressPriceCheckIntervalIsRunning = false;
          return null;
        }).catch(error => global.appLog.error(`${error} - AliExpress.getPrices - line 110`));
    } catch (error) {
      global.appLog.error(`${error} - catch block of AliExpress.getPrices - line 112`);
    }
  };

  checkPrice = async aliExpressListing => {
    try {
      global.aliExpressSinglePriceCheckerIsRunning = true;
      // Start the amazon price-checker specific browser
      this.aliExpressSingleListingSupplierBrowser = await puppeteer.launch({
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

      await this.iterateListingsAndGetData(this.aliExpressSingleListingSupplierBrowser, [aliExpressListing]);
      
      await this.aliExpressSingleListingSupplierBrowser.close();

      global.aliExpressSinglePriceCheckerIsRunning = false;

      this.repricerHelper.getPrice();
      return null;
    } catch (error) {
      global.aliExpressSinglePriceCheckerIsRunning = false;
      global.appLog.error(`${error} - inside aliExpress.checkPrice - line 184`);
      this.aliExpressSingleListingSupplierBrowser.close();
      this.repricerHelper.getPrice();
    }
  }

  checkPrices = async aliExpressListings => {
    try {
      this.aliExpressBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        slowMo: 100,
        devtools: false,
        defaultViewport: null,
        args: [
          '--disable-webgl'
        ],
      });

      const aliExpressListingsShuffled = Util.shuffleArray(aliExpressListings);

      const aliExpressChunks = Util.splitArrayInResizedChunks(aliExpressListingsShuffled);

      const promises = [];
      if (aliExpressChunks.length > 1) {
        for (let i = 0; i < aliExpressChunks.length; i++) {
          promises.push(this.iterateListingsAndGetData(aliExpressChunks[i]));
        }
      } else {
        promises.push(this.iterateListingsAndGetData(aliExpressChunks[0]));
      }

      await Promise.all(promises);
      

      await this.aliExpressBrowser.close();

      //   await this.aliExpressBrowser.close();
      if (this.aliExpressProducts.length !== 0) {
        return Promise.resolve(true);
      }

      return Promise.resolve(false);
    } catch (error) {
      global.appLog.error(`${error} - inside AliExpress.checkprices - line 226`);
      this.aliExpressBrowser.close();
    }
  }

  iterateListingsAndGetData = async aliExpressListings => {
    const page = await this.aliExpressBrowser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    if (global.proxyUsername !== '' && global.proxyPassword !== '') {
      await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
    }
    
    // Iterate through all AliExpress Listings that have been pulled out of the database
    for (const listing of aliExpressListings) {
      try {
        if (listing.supplier_url.includes('.aliexpress.')) {
          await page.goto(listing.supplier_url, { waitUntil: 'networkidle0', timeout: 0 });

          const productData = await page.evaluate(() => {
            const scriptTags = document.querySelectorAll('script');
            let price;
            let quantity;

            for (const tag of scriptTags) {
                if (tag.innerHTML.includes('"priceModule"')) {

                  const priceModule = tag.innerHTML.substring(
                      tag.innerHTML.lastIndexOf('"priceModule":{') + 14, 
                      tag.innerHTML.lastIndexOf(',"quantityModule"')
                  );

                  const quantityModule = tag.innerHTML.substring(
                      tag.innerHTML.lastIndexOf('"quantityModule":{') + 17, 
                      tag.innerHTML.lastIndexOf(',"recommendModule"')
                  );

                  price = JSON.parse(priceModule);
                  quantity = JSON.parse(quantityModule);
                }
            }
            return { price, quantity };
          });

          listing.new_price = productData.price.maxActivityAmount.value;
          listing.currency = productData.price.maxActivityAmount.currency;
          listing.product_availability = productData.quantity.totalAvailQuantity;

          this.aliExpressProducts.push(listing);
        } else {
          // const escapedLog = encodeURI(
          //   `Listing '${listing.item_name}' does not have a valid ${listing.supplier} URL. Please change it so Dalio can perform a price check.`
          // );
          const escapedLog = `Does not have a valid ${listing.supplier} URL. Please change it so Dalio can perform a price check.`;
          // global.log.error(escapedLog);
          Util.insertListingLog(listing, escapedLog, 'error');
        }
      }  
      catch (e) {   
        global.appLog.error(`${e} - inside AliExpress.iterateListingsAndGetData() line 237`);
      } 
    }

    // await page.close();
  }
}

export default AliExpress;
