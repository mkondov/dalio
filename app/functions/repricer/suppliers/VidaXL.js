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
/* eslint no-useless-escape: 0 */
/* eslint no-restricted-globals: 0 */
/* eslint no-underscore-dangle: 0 */
/* eslint no-lonely-if: 0 */
/* eslint radix: 0 */

import moment from 'moment';
import Util from '../../core/util/Util';

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality -> makes puppeteer not as easily detectable
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth')();
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const Client = require('@infosimples/node_two_captcha');

puppeteer.use(pluginStealth);

puppeteer.use(
  RecaptchaPlugin({
    provider: { id: '2captcha', token: 'a9c97548d53ee90dc7a64c6728800a94' },
    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  })
)

const client = new Client('a9c97548d53ee90dc7a64c6728800a94', {
    timeout: 60000,
    polling: 5000,
    throwErrors: false
});

class VidaXL {
  vidaXLBrowser = false;

  vidaXLSingleListingSupplierBrowser = false;

  constructor (repricerHelper) {
    this.repricerHelper = repricerHelper;
  }

  getPrices = async () => {
    try {
      // 1. Track that the price check interval is running
      global.vidaXLPriceCheckIntervalIsRunning = true;

      // Select the listings which have 'vidaxl' as a supplier - 1
      let vidaXLListings = await global.knex('tbl_listings')
      .where({ supplier: 'vidaxl' })
      .whereNot({ is_deleted: '1' })
      .then(vidaXLListings => vidaXLListings)
      .catch(error => global.appLog.error(`${error} - vidaXL.getPrices - line 54`));

      // If there are VidaXL listings
      if (vidaXLListings.length !== 0) {
        // Filter the parent listings that contain variations -> they should not be a part of the price check process as they are only containers for the variations
        vidaXLListings = await vidaXLListings.filter(e => e.has_variations === '0');
        // Run the price-checker
        await this.checkPrices(vidaXLListings).catch(error => global.appLog.error(`${error} - vidaXL.checkPrices - line 63`));

      }

      global.vidaXLPriceCheckIntervalIsRunning = false;
      return null;
    } catch (error) {
      global.vidaXLPriceCheckIntervalIsRunning = false;
      global.appLog.error(`${error} - catch block of vidaXL.getPrices - line 70`);
    }
  };

  checkPrice = async vidaXLListing => {
    try {
      global.vidaXLSinglePriceCheckerIsRunning = true;
      // Start the amazon price-checker specific browser
      this.vidaXLSingleListingSupplierBrowser = await puppeteer.launch({
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

      await this.iterateListingsAndGetData(this.vidaXLSingleListingSupplierBrowser, [vidaXLListing]);
      
      await this.vidaXLSingleListingSupplierBrowser.close();

      global.vidaXLSinglePriceCheckerIsRunning = false;

      this.repricerHelper.getPrice();
      return null;
    } catch (error) {
      global.vidaXLSinglePriceCheckerIsRunning = false;
      global.appLog.error(`${error} - inside vidaXL.checkPrice - line 109`);
      this.vidaXLSingleListingSupplierBrowser.close();
      this.repricerHelper.getPrice();
    }
  }

  checkPrices = async vidaXLListings => {
    try {
      // Start the amazon price-checker specific browser
      this.vidaXLBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        slowMo: 100,
        devtools: false,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--disable-webgl'
        ],
      });

      const vidaXLListingsShuffled = Util.shuffleArray(vidaXLListings);

      const vidaXLChunks = Util.splitArrayInResizedChunks(vidaXLListingsShuffled);

      const promises = [];
      if (vidaXLChunks.length > 1) {
        for (let i = 0; i < vidaXLChunks.length; i++) {
          promises.push(this.iterateListingsAndGetData(vidaXLChunks[i]));
        }
      } else {
        promises.push(this.iterateListingsAndGetData(vidaXLChunks[0]));
      }

      await Promise.all(promises);
      
      await this.vidaXLBrowser.close();

      return Promise.resolve(true);
    } catch (error) {
      global.appLog.error(`${error} - inside vidaXL.checkprices - line 141`);
      this.vidaXLBrowser.close();
    }
  }

  iterateListingsAndGetData = async vidaXLListings => {
    const page = await this.vidaXLBrowser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultNavigationTimeout(60000); 

    if (global.proxyUsername !== '' && global.proxyPassword !== '') {
     await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
    }

    // 1. Navigate to the relevant vidaXL marketplace
    if (vidaXLListings[0].supplier_url.toLowerCase().includes('vidaxl.com')) {
        await page.goto('https://vidaxl.com', { waitUntil: 'networkidle0' });
    } else if (vidaXLListings[0].supplier_url.toLowerCase().includes('vidaxl.co.uk')) {
        await page.goto('https://vidaxl.co.uk', { waitUntil: 'networkidle0' });
    } else if (vidaXLListings[0].supplier_url.toLowerCase().includes('vidaxl.de')) {
        await page.goto('https://vidaxl.de', { waitUntil: 'networkidle0' });
    }  

    // 2. Iterate through all vidaXL Listings that have been pulled out of the database
    for (const listing of vidaXLListings) {
      // Wrap the whole loop function in a try block -> if anything fails -> increase the current listing price check errors
      try {  
        // Make sure that the listing url is a vidaXL url
        if (listing.supplier_url.includes('.vidaxl.') || listing.supplier_url.includes('/vidaxl.')) {
            // Navigate to the specific VidaX< listing URL
            await page.goto(listing.supplier_url, { waitUntil: 'domcontentloaded' });

            const price = await page.evaluate(() => {
                const priceMetaSelector = document.querySelector('meta[itemprop=price]');

                if (priceMetaSelector !== null) {
                    const price = parseFloat(priceMetaSelector.content);

                    if (!isNaN(price)) {
                        return price;
                    }
                }

                return null;
            });

            // Product availability can either be IN STOCK or OUT OF STOCK
            const productAvailability = await page.evaluate(() => {
                const inStockSelector = document.querySelector('#in-stock');
                const outOfStockSelector = document.querySelector('#not-available');

                if (inStockSelector !== null && outOfStockSelector !== null) {
                    if (inStockSelector.style.display !== 'none' && outOfStockSelector.style.display === 'none') {
                        return 'IN_STOCK';
                    } else if (inStockSelector.style.display === 'none' && outOfStockSelector.style.display !== 'none') {
                        return 'OUT_OF_STOCK';
                    }
                }

                return null;
            });

            // console.log(`VIDAXL listing ${listing.item_name}, price is ${price}, type - ${typeof price} and quantity ${productAvailability}`);
                        
            // If the price is not null -> then a price had been retrieved
            if (price !== null) {

                // Compare the new price of the product with the one already saved to the database. If there has been a reduction in the price -> DO NOT lower immediately, wait for at least two price checks and then lower it -> this will prevent catching temporary price drops (sometimes for as long as 30 minutes)

                // Assume a current price of 0
                let currentPrice = 0;

                // IF a listing is just added -> it will have a new_price of null
                if (listing.new_price !== undefined && listing.new_price !== null && listing.new_price !== '') {
                    // So, if it is not null -> parse it and set it to the currentPrice variable
                    const currentPriceParsed = parseFloat(listing.new_price);
                    if (!isNaN(currentPriceParsed)) {
                       currentPrice = parseFloat(listing.new_price);
                    }
                }

                // Compare the two prices
                if (price < currentPrice) {
                    // 10.3.1.1 If the new price is lower -> check if it has been lower on at least two occasions
                    if (listing.lower_price_count < 1) {
                        // 10.3.1.1.1 If the lower price counter is less than 1 -> increase the counter
                        listing.lower_price_count++;
                    } else {
                        // 10.3.1.2 The price has been lower for two times or more already, so can be dropped
                        listing.lower_price_count = 0;
                        listing.new_price = price.toFixed(2);
                    }
                } else if(price > currentPrice) {
                    // 10.3.2 The new price is the same or greater, so can be changed on eBay
                    listing.new_price = price.toFixed(2);
                    listing.lower_price_count = 0;
                } else {
                    listing.lower_price_count = 0;
                }

                // 10.4 If the current price is different from the newly retrieved price -> update the database
                if (currentPrice !== listing.new_price) {
                    // 10.4.1 Update it and update the errors_during_price check to 0
                    global
                    .knex('tbl_listings')
                    .where({ supplier_id: listing.supplier_id })
                    .update({ 
                        new_price: listing.new_price,
                        lower_price_count: listing.lower_price_count,
                        errors_during_price_check: 0 
                    })
                    .catch(error => global.appLog.error(`${error} - vidaXL.getPrices - line 250`));
                    
                    // let escapedLog = await encodeURI(`${listing.item_name} with VidaXL # ${listing.supplier_id} has a new price. The old price was ${currentPrice}. The new price is ${listing.new_price}`);
                    let escapedLog = `Has a new source price. The old price was ${currentPrice}. The new price is ${listing.new_price}`;

                    if (currentPrice == null) {
                      //  escapedLog = await encodeURI(`${listing.item_name} with VidaXL # ${listing.supplier_id} has a price of ${listing.new_price}`);
                       escapedLog = `Has a price of ${listing.new_price}`;
                    }

                    // global.log.warn(escapedLog);
                    await Util.insertListingLog(listing, escapedLog, 'info');
                } else {
                    global
                    .knex('tbl_listings')
                    .where({ supplier_id: listing.supplier_id })
                    .update({ 
                        lower_price_count: listing.lower_price_count,
                        errors_during_price_check: 0 
                    })
                    .catch(error => global.appLog.error(`${error} - vidaXL.getPrices - line 267`));
                }
            }

            // If the product availability is not NULL -> update the listing`s product availability
            if (productAvailability !== null){

              const currentAvailability = listing.product_availability;
              const newAvailability = productAvailability;

              // Check if the new availability of a product is different from the one in the database
              if (currentAvailability !== newAvailability) {

                // If yes, update the availability in the database
                await global.knex('tbl_listings')
                .where({ supplier_id: listing.supplier_id })
                .update({ 
                  product_availability: newAvailability,
                  errors_during_price_check: 0 
                })
                .catch(error => global.appLog.error(`${error} - vidaXL.iterateListings - line 287`));


                // let escapedLog = await encodeURI(`${listing.item_name} with VidaXL # ${listing.supplier_id} has a new product availability - ${newAvailability}`);
                let escapedLog = `Has a new product availability - ${newAvailability}`;

                // Log a message when the listing is 'In Stock'
                if (currentAvailability === null && newAvailability !== 'OUT_OF_STOCK' && newAvailability !== null) {
                    // escapedLog = await encodeURI(`${listing.item_name} with VidaXL # ${listing.supplier_id} is in stock.`);
                    escapedLog = `Is in stock.`;
                } else if (currentAvailability !== null && currentAvailability !== 'OUT_OF_STOCK' && newAvailability === 'OUT_OF_STOCK') {
                    // Log a message when the listing goes 'Out of stock'
                    // escapedLog = await encodeURI(`${listing.item_name} with VidaXL # ${listing.supplier_id} has gone out of stock. Its selling price will be increased multiple times in order to prevent customers from buying it.`);
                    escapedLog = `Has gone out of stock.`;
                } else if (currentAvailability !== null && currentAvailability === 'OUT_OF_STOCK' && newAvailability !== null && newAvailability !== 'OUT_OF_STOCK') {
                  // Log a message when the listing comes back 'In Stock'
                  // escapedLog = await encodeURI(`${listing.item_name} with VidaXL # ${listing.supplier_id} is back in stock. Its selling price will be lowered to the one you have specified in your settings.`);
                  escapedLog = `Is back in stock.`;
                }

                // await global.log.warn(escapedLog);
                await Util.insertListingLog(listing, escapedLog, 'info');
              }

            }

          } else {
            // const escapedLog = encodeURI(`'${listing.item_name}' does not have a valid ${listing.supplier} URL. Please change it so Dalio can perform a price check.`);
            const escapedLog = `Does not have a valid ${listing.supplier} URL. Please change it so Dalio can perform a price check.`;
            // global.log.error(escapedLog);
            await Util.insertListingLog(listing, escapedLog, 'error');
        }
      } catch (e) {   
          await global.appLog.error(`${e} - ${listing.item_name} - inside VidaXL.iterateListingsAndGetData() line 553`);

          const escapedLog = `Cannot be price checked. Please investigate the issue.`;

          let errorsDuringPriceCheck = listing.errors_during_price_check;
          errorsDuringPriceCheck++;

          // If the current listing has two or more price check errors -> the error is persistent, so the user should be notified and product availability brought down to 0
          if (errorsDuringPriceCheck >= 2) {
            // await global.log.error(encodeURI(log));
            await Util.insertListingLog(listing, escapedLog, 'error');

            await global.knex('tbl_listings')
            .where({ id: listing.id })
            .update({ 
              product_availability: '0',
              errors_during_price_check: errorsDuringPriceCheck 
            });

            await global.nucleus.track("VIDAXL_PRODUCT_PRICE_CHECK_ERROR", {
              product_name: listing.item_name,
              product_url: listing.supplier_url
            });
          } else {
            await global.knex('tbl_listings')
            .where({ id: listing.id })
            .update({ 
              errors_during_price_check: errorsDuringPriceCheck 
            });
          }
      } 
    }
  }
}

export default VidaXL;
