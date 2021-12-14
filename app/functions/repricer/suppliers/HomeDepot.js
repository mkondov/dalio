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

// let homeDepotBrowser;

class HomeDepot {

  homeDepotProducts = [];

  homeDepotBrowser = false;

  homeDepotSingleListingSupplierBrowser = false;

  constructor(repricerHelper) {
    this.repricerHelper = repricerHelper;
  }

  getPrices = async () => {
    try {
      // Track that the price check interval is running
      global.homeDepotPriceCheckIntervalIsRunning = true;

      // Select the listings which have 'Walmart' as a supplier - 1
      let homeDepotListings = await global
        .knex('tbl_listings')
        .where({ supplier: 'homedepot' })
        .whereNot({ is_deleted: '1' })
        .then(homeDepotListings => homeDepotListings)
        .catch(error => global.appLog.error(`${error} - HomeDepot.getPrices - line 110`));

      // If there are Amazon-supplier listings
      if (homeDepotListings.length !== 0) {
        // Filter the parent listings that contain variations -> they should not be a part of the price check process as they are only containers for the variations

        homeDepotListings = homeDepotListings.filter(e => e.has_variations === '0');

        this.checkPrices(homeDepotListings).then(() => {
          // If there are Amazon products with fetched information
          if (this.homeDepotProducts.length > 0) {
            // Iterate through all of them
            for (const product of this.homeDepotProducts) {

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
                        // let escapedLog = encodeURI(`${product.item_name} with HomeDepot # ${product.supplier_id} has a new price. The old price was ${currentPrice}. The new price is ${newPrice}`);
                        let escapedLog = `Has a new source price. The old price was ${currentPrice}. The new price is ${newPrice}`;

                        if (currentPrice == null) {
                          // escapedLog = encodeURI(`${product.item_name} with HomeDepot # ${product.supplier_id} has a price of ${newPrice}`);
                          escapedLog = `Has a price of ${newPrice}`;
                        }

                        // global.log.warn(escapedLog);
                        Util.insertListingLog(product, escapedLog, 'info');

                        // If yes, update the price in the database
                        global
                          .knex('tbl_listings')
                          .where({ supplier_id: product.supplier_id })
                          .update({ new_price: newPrice })
                          .catch(error => global.appLog.error(`${error} - HomeDepot.getPrices - line 74`));
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
                      // let escapedLog = encodeURI(`${product.item_name} with HomeDepot # ${product.supplier_id} has new product availability - ${newAvailability}`);
                      let escapedLog = `Has new product availability - ${newAvailability}`;

                      // Log a message when the listing is 'In Stock'
                      if (currentAvailability == null && newAvailability !== 'OUT_OF_STOCK' && newAvailability !== '0' && newAvailability !== null) {
                        // escapedLog = encodeURI(`${product.item_name} with HomeDepot # ${product.supplier_id} is in stock.`);
                        escapedLog = `Is in stock.`;
                      } else if (currentAvailability !== null && currentAvailability !== '0' && currentAvailability !== 'OUT_OF_STOCK' && (newAvailability === 'OUT_OF_STOCK' || newAvailability === '0')) {
                        // Log a message when the listing goes 'Out of stock'
                        // escapedLog = encodeURI(`${product.item_name} with HomeDepot # ${product.supplier_id} has gone out of stock. Its selling price will be increased multiple times in order to prevent customers from buying it.`);
                        escapedLog = `Has gone out of stock.`;
                      } else if (currentAvailability !== null && (currentAvailability === '0' || currentAvailability === 'OUT_OF_STOCK') && newAvailability !== null && newAvailability !== '0' && newAvailability !== 'OUT_OF_STOCK') {
                        // Log a message when the listing comes back 'In Stock'
                        // escapedLog = encodeURI(`${product.item_name} with HomeDepot # ${product.supplier_id} is back in stock. Its selling price will be lowered to the one you have specified in your settings.`);
                        escapedLog = `Is back in stock.`;
                      }

                      // global.log.warn(escapedLog);
                      Util.insertListingLog(product, escapedLog, 'info');
                      // If yes, update the availability in the database
                      global.knex('tbl_listings')
                        .where({ supplier_id: product.supplier_id })
                        .update({ product_availability: newAvailability })
                        .catch(error => global.appLog.error(`${error} - HomeDepot.getPrices - line 89`));
                    }
                  }
                  global.homeDepotPriceCheckIntervalIsRunning = false;
                  return null;
                })
                .catch(error => global.appLog.error(`${error} - get homedepot listing by a HomeDepot # - line 109`));
              
            }

            this.homeDepotProducts.length = 0;
          } else {
            global.log.info('Your HomeDepot listings` prices are all up-to-date.');
            global.homeDepotPriceCheckIntervalIsRunning = false;
          }
          return null;
        })
        .catch(error => global.appLog.error(`${error} - HomeDepot.checkPrices - line 102`));
        return null;
      }

      global.homeDepotPriceCheckIntervalIsRunning = false;
    } catch (error) {
      global.appLog.error(`${error} - catch block of HomeDepot.getPrices - line 112`);
    }
  };

  checkPrice = async homeDepotListing => {
    try {
      global.homeDepotSinglePriceCheckerIsRunning = true;
      // Start the amazon price-checker specific browser
      this.homeDepotSingleListingSupplierBrowser = await puppeteer.launch({
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

      await this.iterateListingsAndGetData(this.homeDepotSingleListingSupplierBrowser, [homeDepotListing]);
      
      await this.homeDepotSingleListingSupplierBrowser.close();

      global.homeDepotSinglePriceCheckerIsRunning = false;

      this.repricerHelper.getPrice();
      return null;
    } catch (error) {
      global.homeDepotSinglePriceCheckerIsRunning = false;
      global.appLog.error(`${error} - inside homeDepot.checkPrice - line 192`);
      this.homeDepotSingleListingSupplierBrowser.close();
      this.repricerHelper.getPrice();
    }
  }

  checkPrices = async homeDepotListings => {
    try {
      this.homeDepotBrowser = await puppeteer.launch({
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

      const homeDepotListingsShuffled = Util.shuffleArray(homeDepotListings);

      const homeDepotChunks = Util.splitArrayInResizedChunks(homeDepotListingsShuffled);

      const promises = [];
      if (homeDepotChunks.length > 1) {
        for (let i = 0; i < homeDepotChunks.length; i++) {
          promises.push(this.iterateListingsAndGetData(homeDepotChunks[i]));
        }
      } else {
        promises.push(this.iterateListingsAndGetData(homeDepotChunks[0]));
      }

      await Promise.all(promises);
      await this.homeDepotBrowser.close();

      if (this.homeDepotProducts.length !== 0) {
        return Promise.resolve(true);
      }

      return Promise.resolve(false);
    } catch (error) {
      global.appLog.error(`${error} - inside HomeDepot.checkprices - line 226`);
      this.homeDepotBrowser.close();
    }
  }

  iterateListingsAndGetData = async homeDepotListings => {
    const page = await this.homeDepotBrowser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    if (global.proxyUsername !== '' && global.proxyPassword !== '') {
      await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
    }

    // Iterate through all HomeDepot Listings that have been pulled out of the database
    for (const listing of homeDepotListings) {
      try {
        if (listing.supplier_url.includes('.homedepot.')) {
          await page.goto(listing.supplier_url, { waitUntil: 'networkidle0', timeout: 0 });

          // Check if access is not denied
          const accessDenied = await page.evaluate(() => {
            const accessDeniedMessage = document.querySelector('body h1').textContent;

            if (accessDeniedMessage !== null) {
              if (accessDeniedMessage.includes('Access Denied')) {
                return true;
              }
            }

            return false;
          });

          if (accessDenied) {
            await global.log.error('Dalio cannot check your Home Depot listings info. Access has been denied to Dalio due to your computer not having an US IP address. Consider using a VPN.');
            break;
          }
    
          const productData = await page.evaluate(() => {
            const scriptTags = document.querySelectorAll('script');
            let price;
            let quantity;
    
            /* If there is a'SkuService' script tag 
            * we parse it to a valid JSON object as it contains all the info we need (price and availability)
            */
            for (const tag of scriptTags) {
              if (tag.innerHTML.includes("['SkuService']")) {
                let scriptTag = tag.innerHTML.replace("window['__BOOTSTRAPPED_PROPS__']['SkuService'] =", '');;
                scriptTag = scriptTag.replace("window['__BOOTSTRAPPED_PROPS__'] = window['__BOOTSTRAPPED_PROPS__'] || {};", '');
                scriptTag = scriptTag.trim();
    
                if (scriptTag !== '' && scriptTag !== null) {
                  try {
                    const jsonScriptTag = JSON.parse(scriptTag);
                    price = jsonScriptTag.sku.itemExtension.pricing.specialPrice;
    
                    if (jsonScriptTag.sku.itemExtension.onlineStoreSku.fulfillmentOptions.fulfillable) {
                      quantity = 'IN_STOCK';
                    } else {
                      quantity = 'OUT_OF_STOCK';
                    }
                    
                  } catch (error) {
                    global.appLog.error(`${error} in HomeDepot.checkPrices -> parsing scriptTag to JSON`);
                  }
                }
              }
            }
    
            // If there was no such script tag -> both price and quantity will still be undefined
            if (price === undefined && quantity === undefined) {
              const priceSelector = document.querySelector('span#ajaxPrice');
              const buyBeltAvailabilitySelectors = document.querySelectorAll('#buybelt div.heading-message');
    
              // If there is any price
              if (priceSelector !== null) {
                const price = priceSelector.getAttribute('content');
    
                if (price !== null && price !== '') {
                    
                  if (buyBeltAvailabilitySelectors !== null) {
                    for (const availabilitySelector of buyBeltAvailabilitySelectors) {
                      if (availabilitySelector.textContent.includes('Out of stock') || availabilitySelector.textContent.includes('unavailable')) {
                        quantity = 'OUT_OF_STOCK';
                      } else if (availabilitySelector.textContent.includes('Free Delivery') || availabilitySelector.textContent.includes('Get it fast')) {
                        quantity = 'IN_STOCK';
                      }
                    }
                    return { price, quantity }
                  }
                }
              } else {
                return null;
              }
            }
    
            return { price, quantity };
          });
    
          // await console.log(`${listing.item_name},  price is ${productData.price}, quantity is ${productData.quantity}`);
    
          if (productData.price !== undefined && productData.quantity !== undefined) {
            listing.new_price = productData.price;
            listing.product_availability = productData.quantity;
            this.homeDepotProducts.push(listing);
          } else {
            // const escapedLog = encodeURI(`Dalio could not check the price and availability of listing '${listing.item_name}'. Please contact support in order to resolve the problem.`);
            const escapedLog = `Dalio could not check the price and availability of this listing. Please contact support in order to resolve the problem.`;
            // global.log.error(escapedLog);

            Util.insertListingLog(listing, escapedLog, 'error');
          }
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
          global.appLog.error(`${e} - inside HomeDepot.iterateListingsAndGetData() line 297`);
      } 
    }

    // await page.close();
  }
}

export default HomeDepot;
