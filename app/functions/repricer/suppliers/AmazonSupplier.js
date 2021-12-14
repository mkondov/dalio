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
/* eslint arrow-body-style: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint eqeqeq: 0 */

import moment from 'moment';
import fs from 'fs';
import { ipcMain } from 'electron';
import Util from '../../core/util/Util';

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality -> makes puppeteer not as easily detectable
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth')();
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const Client = require('@infosimples/node_two_captcha');

puppeteer.use(pluginStealth);

// puppeteer.use(require('puppeteer-extra-plugin-anonymize-ua')())

puppeteer.use(
  RecaptchaPlugin({
    provider: { id: '2captcha', token: 'a9c97548d53ee90dc7a64c6728800a94' },
    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  })
);

const client = new Client('a9c97548d53ee90dc7a64c6728800a94', {
                    timeout: 60000,
                    polling: 5000,
                    throwErrors: false});

class AmazonSupplier {
  amazonSupplierBrowser = false;

  amazonSingleListingSupplierBrowser = false;

  amazonSupplierProducts = [];

  mainWindow = undefined;

  currentListing = 0;

  userAgents = [ 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36', 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:70.0) Gecko/20100101 Firefox/70.0', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 Edg/85.0.100.0' ];

  chosenUserAgent = 0;

  // Keep track of reprice checks
  repriceCheckNumber = 0;

  constructor(repricerHelper) {
    this.mainWindow = repricerHelper.mainWindow;
    this.repricerHelper = repricerHelper;

    ipcMain.on('sanny-soft-test', async event => {
      puppeteer.launch({ headless: false }).then(async browser => {
        const page = await browser.newPage();
        await page.setViewport({ width: 800, height: 600 });
        console.log(await browser.userAgent())
        await page.setUserAgent(this.userAgents[1]);
        console.log(await browser.userAgent())

        console.log(`Testing the stealth plugin..`);
        await page.goto('https://bot.sannysoft.com');
        await page.waitFor(5000);
        await page.screenshot({ path: 'stealth.png', fullPage: true });
      
        console.log(`All done, check the screenshots. ✨`);
        await browser.close();
        return null;
      })
      .catch(e => global.appLog.error(`${e} - AmazonSupplier.sanny-soft-test`));

    });
  }

  getPrices = async () => {
    try {
      // 1. Track that the price check interval is running
      global.amazonPriceCheckIntervalIsRunning = true;
      // Select the listings which have 'Amazon' as a supplier - 1
      let amazonSupplierListings = await global.knex('tbl_listings')
      .where({ supplier: 'amazon' })
      .whereNot({ is_deleted: '1' })
      .then(amazonSupplierListings => amazonSupplierListings)
      .catch(error => global.appLog.error(`${error} - amazonSupplier.getPrices - line 110`));

      // If there are Amazon-supplier listings
      if (amazonSupplierListings.length !== 0) {
        // Filter the parent listings that contain variations -> they should not be a part of the price check process as they are only containers for the variations
        amazonSupplierListings = await amazonSupplierListings.filter(e => e.has_variations === '0'); 

        if (amazonSupplierListings.length > 0) {
          const priceCheckerStartedAt = await moment().format('DD-MM-YYYY HH:mm:ss');

          this.mainWindow.webContents.send('update-amazon-price-checker-notification', { status: true, current_listing: 0, total_listings: amazonSupplierListings.length, started_at: priceCheckerStartedAt });
        }

        // Run the price-checker
        await this.checkPrices(amazonSupplierListings).catch(error => global.appLog.error(`${error} - amazonSupplier.checkPrices - line 63`));

        // After each price check -> check if the a product has probably changed and mark it as changed -> then send a notification event to the front end
        const listingsWithWarning = await global.knex('tbl_listings')
        .where({ product_changed: 1 })
        .then(rows => rows)
        .catch(error => global.appLog.error(`${error} - amazonSupplier.checkPrices - line 63`));

        if (listingsWithWarning.length > 0) {
          this.mainWindow.webContents.send('toggle-listings-warning', true, listingsWithWarning.length);
        }
      }

      global.amazonPriceCheckIntervalIsRunning = false;
      return null;
    } catch (error) {
      global.amazonPriceCheckIntervalIsRunning = false;
      global.appLog.error(`${error} - catch block of amazonSupplier.getPrices - line 112`);
    }
  };

  checkPrice = async amazonListing => {
    try {
      global.amazonSinglePriceCheckerIsRunning = true;
      // Start the amazon price-checker specific browser
      this.amazonSingleListingSupplierBrowser = await puppeteer.launch({
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

      await this.iterateListingsAndGetData(this.amazonSingleListingSupplierBrowser, [amazonListing]);
      
      await this.amazonSingleListingSupplierBrowser.close();

      global.amazonSinglePriceCheckerIsRunning = false;

      this.repricerHelper.getPrice();
      return null;
    } catch (error) {
      global.amazonSinglePriceCheckerIsRunning = false;
      global.appLog.error(`${error} - inside amazonSupplier.checkPrice - line 140`);
      this.amazonSingleListingSupplierBrowser.close();
      this.repricerHelper.getPrice();
    }
  }

  checkPrices = async amazonListings => {
    try {
      // Start the amazon price-checker specific browser
      this.amazonSupplierBrowser = await puppeteer.launch({
        headless: global.headless,
        executablePath: Util.getChromiumExecPath(puppeteer),
        // slowMo: 100,
        devtools: false,
        ignoreDefaultArgs: ['--enable-automation'],
        ignoreHTTPSErrors: true,
        args: [
          '--disable-webgl',
          '--ignore-certificate-errors',
          '--no-sandbox'
        ],
      });

      this.amazonSupplierBrowser.on('disconnected', () => {
        this.amazonSupplierBrowser = false;
        this.currentListing = 0;
        this.mainWindow.webContents.send('update-amazon-price-checker-notification', { current_listing: this.currentListing, status: false });
      });
      
      const amazonListingsShuffled = Util.shuffleArray(amazonListings);

      const amazonSupplierChunks = Util.splitArrayInResizedChunks(amazonListingsShuffled);

      const randomUserAgent = Util.getRandomInt(0, 3, 'int');
      const promises = [];
      if (amazonSupplierChunks.length > 1) {
        for (let i = 0; i < amazonSupplierChunks.length; i++) {
          promises.push(this.iterateListingsAndGetData(this.amazonSupplierBrowser, amazonSupplierChunks[i], randomUserAgent));
        }
      } else {
        promises.push(this.iterateListingsAndGetData(this.amazonSupplierBrowser, amazonSupplierChunks[0], randomUserAgent));
      }

      await Promise.all(promises);
      
      await this.amazonSupplierBrowser.close();
      this.currentListing = 0;
      this.mainWindow.webContents.send('update-amazon-price-checker-notification', { current_listing: this.currentListing, status: false });

      if (this.amazonSupplierProducts.length !== 0) {
        return Promise.resolve(true);
      }

      return Promise.resolve(false);
    } catch (error) {
      global.appLog.error(`${error} - inside amazonSupplier.checkprices - line 226`);
      if (this.amazonSupplierBrowser) {
        this.amazonSupplierBrowser.close();
      }
      this.currentListing = 0;
      this.mainWindow.webContents.send('update-amazon-price-checker-notification', { current_listing: this.currentListing, status: false });

    }
  }

  iterateListingsAndGetData = async (browser, amazonListings, randomUserAgent) => {
    const page = await browser.newPage();
    await page.setUserAgent(this.userAgents[randomUserAgent]);
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultNavigationTimeout(60000); 
    
    // await page.setRequestInterception(false);

    // page.on('request', interceptedRequest => {
    //   // ax-eu.amazon-adsystem.com
    //   // ups.analytics.yahoo.com
    //   // interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg')
    //   // req.resourceType() === 'font'
    //   if (interceptedRequest.url().includes('ax-eu.amazon-adsystem.com') || interceptedRequest.url().includes('ups.analytics.yahoo.com') || interceptedRequest.url().endsWith('.gif') || interceptedRequest.resourceType() === 'css' || interceptedRequest.resourceType() === 'font' || interceptedRequest.resourceType() === 'media') {
    //     interceptedRequest.abort();
    //   } else {
    //     interceptedRequest.continue();
    //   }
    // });

    if (global.proxyUsername !== '' && global.proxyPassword !== '') {
     await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
    }

    // // 1. Navigate to the relevant Amazon marketplace
    // if (amazonListings[0].supplier_url.includes('amazon.com')) {
    //   global.amazonCookies.US = await this.readCookieFile(true, 'US');
    //   if (global.amazonCookies.US) {
    //     await page.setCookie(...global.amazonCookies.US);
    //   }
    //   // await page.goto('https://amazon.com', { waitUntil: ['networkidle2', 'domcontentloaded'] });
    // } else if (amazonListings[0].supplier_url.includes('amazon.ca')) {
    //   global.amazonCookies.CA = await this.readCookieFile(true, 'CA');
    //   if (global.amazonCookies.CA) {
    //     await page.setCookie(...global.amazonCookies.CA);
    //   }
    //   // await page.goto('https://amazon.ca', { waitUntil: ['networkidle2', 'domcontentloaded'] });
    // } else if (amazonListings[0].supplier_url.includes('amazon.co.uk')) {
    //   global.amazonCookies.UK = await this.readCookieFile(true, 'UK');
    //   if (global.amazonCookies.UK) {
    //     await page.setCookie(...global.amazonCookies.UK);
    //   }
    //   // await page.goto('https://amazon.co.uk', { waitUntil: ['networkidle2', 'domcontentloaded'] });
    // } else if (amazonListings[0].supplier_url.includes('amazon.de')) {
    //   global.amazonCookies.DE = await this.readCookieFile(true, 'DE');
    //   if (global.amazonCookies.DE) {
    //     await page.setCookie(...global.amazonCookies.DE);
    //   }
    //   // await page.goto('https://amazon.de', { waitUntil: ['networkidle2', 'domcontentloaded'] });
    // } else if (amazonListings[0].supplier_url.includes('amazon.fr')) {
    //   global.amazonCookies.FR = await this.readCookieFile(true, 'FR');
    //   if (global.amazonCookies.FR) {
    //     await page.setCookie(...global.amazonCookies.FR);
    //   }
    //   // await page.goto('https://amazon.fr', { waitUntil: ['networkidle2', 'domcontentloaded'] });
    // } else if (amazonListings[0].supplier_url.includes('amazon.it')) {
    //   global.amazonCookies.IT = await this.readCookieFile(true, 'IT');
    //   if (global.amazonCookies.IT) {
    //     await page.setCookie(...global.amazonCookies.IT);
    //   }
    //   // await page.goto('https://amazon.it', { waitUntil: ['networkidle2', 'domcontentloaded'] });
    // } else if (amazonListings[0].supplier_url.includes('amazon.es')) {
    //   global.amazonCookies.ES = await this.readCookieFile(true, 'ES');
    //   if (global.amazonCookies.ES) {
    //     await page.setCookie(...global.amazonCookies.ES);
    //   }
    //   // await page.goto('https://amazon.es', { waitUntil: ['networkidle2', 'domcontentloaded'] });
    // }

    // 2. Iterate through all Amazon Listings that have been pulled out of the database
    for (const listing of amazonListings) {
      this.currentListing++;
      await this.mainWindow.webContents.send('update-amazon-price-checker-notification', { current_listing: this.currentListing, item_name: listing.item_name });
      // Wrap the whole loop function in a try block -> if anything fails -> increase the current listing price check errors
      try {  
        // 3. Make sure that the listing url is an Amazon url
        if (listing.supplier_url.includes('.amazon.') || listing.supplier_url.includes('/amazon.')) {

            // 4. Navigate to the specific Amazon listing URL
            await page.goto(listing.supplier_url, { waitUntil: ['networkidle2', 'domcontentloaded'] });
     
            // 5. Solve the image captcha if it appears
            await this._solveCaptchaIfPresent(page);

            await this.acceptCookies(page);

            const correctAddress = false;

            // 6. Set the correct post code for every specific marketplace. It makes sure the correct price and shipping is shown.If the listing is sourced from the US -> check whether the Amazon address is set to a New York zip code 10001
            // if (listing.supplier_url.includes('amazon.com')) {
            //   correctAddress = await changeAmazonDeliveryAddress(page, '10001');
            // } else if (listing.supplier_url.includes('amazon.ca')) {
            //   correctAddress = await changeAmazonDeliveryAddress(page, 'H1A 0A1');
            // } else if (listing.supplier_url.includes('amazon.co.uk')) {
            //   correctAddress = await changeAmazonDeliveryAddress(page, 'CV24NA');
            // } else if (listing.supplier_url.includes('amazon.de')) {
            //   correctAddress = await changeAmazonDeliveryAddress(page, '10115');
            // } else if (listing.supplier_url.includes('amazon.fr')) {
            //   correctAddress = await changeAmazonDeliveryAddress(page, '75000');
            // } else if (listing.supplier_url.includes('amazon.it')) {
            //   correctAddress = await changeAmazonDeliveryAddress(page, '00100');
            // } else if (listing.supplier_url.includes('amazon.es')) {
            //   correctAddress = await changeAmazonDeliveryAddress(page, '28001');
            // }

            // 7. Try to get a BUY BOX price. If there IS buy box -> the price of the item will appear inside the cerberus-data-metrics element
            let price = await page.evaluate(correctAddress => {
              // 7.1 There are a few different section on the page where a product price can appear
              const priceDivSelector = document.querySelector('#cerberus-data-metrics');
              const bookItemPriceDivSelector = document.querySelector('div#buyNewSection div div div span.offer-price');
              const bookItemPriceDivSelectorAlt = document.querySelector('div#buyNewSection span.offer-price');
              const spanPriceBuyBoxAlternative = document.querySelector('#price_inside_buybox');
              const spanPriceBlockAlternative = document.querySelector('#priceblock_ourprice');
              const movieCollectionBuyBox = document.querySelector('#newBuyBoxPrice');

              // 7.2 If there is a price in one of the alternative places -> use it
              if (
                priceDivSelector !== null || 
                spanPriceBuyBoxAlternative !== null || 
                spanPriceBlockAlternative !== null ||
                movieCollectionBuyBox !== null
                ) {
                // 7.2.1 Assume the price is an empty string
                let price = '';

                // 7.2.2 If the priceDivSelector is not null -> get the price (it can either be an empty string or the price itself)
                if (priceDivSelector !== null) {
                  price = priceDivSelector.getAttribute('data-asin-price');
                }

                // 7.2.3 There is a buybox if the price is not an empty string | It can also be a empty string if the priceDivSelector is null
                if (price === '') {
                  // 7.2.3.1 Sometimes there is a buybox but the data-asin-price is empty -> handle it here
                  if (spanPriceBuyBoxAlternative !== null) {
                    const priceMatch = spanPriceBuyBoxAlternative.textContent.match(/[\d\.\,]+/g);
                    if (priceMatch !== null) {
                      const priceMatchRegexed = priceMatch[0].replace(',','');
                      price = priceMatchRegexed;
                    }
                  } else if (spanPriceBlockAlternative !== null) {
                    const priceMatch = spanPriceBlockAlternative.textContent.match(/[\d\.\,]+/g);
                    if (priceMatch !== null) {
                      const priceMatchRegexed = priceMatch[0].replace(',','');
                      price = priceMatchRegexed;
                    } 
                  } else if (movieCollectionBuyBox !== null) {
                    const priceMatch = movieCollectionBuyBox.textContent.match(/[\d\.\,]+/g);
                    if (priceMatch !== null) {
                      const priceMatchRegexed = priceMatch[0].replace(',','');
                      price = priceMatchRegexed;
                    } 
                  }     
                }

                // 7.2.4 If a price was found -> start looking for shipping prices -> there are two options -> in the buybox div or next to the price  
                if (price !== '') {
                  // 7.2.4.1 Parse it to float so arithmetical operations can be possible
                 price = parseFloat(price);

                 const buyBoxShippingPriceSelector = document.querySelector('div#shippingMessageInsideBuyBox_feature_div > div > div > div > span');

                 const outsideBuyBoxShippingPriceSelector = document.querySelector('span#ourprice_shippingmessage > span');

                 // 7.2.4.2 If the there is shipping price in the buybox div
                 if (buyBoxShippingPriceSelector !== null) {
                   let shippingPrice = buyBoxShippingPriceSelector.textContent.toLowerCase();
                   
                   // 7.2.4.2.1 Make the delivery is not free
                   if (!shippingPrice.includes('free shipping') && !shippingPrice.includes('free delivery')) {
                     // Extract the decimal number from the price (for example, the price turns from $8.91 to 8.91)
                     shippingPrice = shippingPrice.match(/[\d\.\,]+/g);
                     if (shippingPrice !== null) {
                       shippingPrice = shippingPrice[0].replace(',','');
                       shippingPrice = parseFloat(shippingPrice);
                     }
                   }
                   
                     // 7.2.4.2.2 If both the offer price and the shipping price are numbers -> add them together and return them as the 'price'
                     if (!isNaN(price) && !isNaN(shippingPrice) && correctAddress) {
                        return price + shippingPrice;
                     } else if (!isNaN(price)) {
                        // 7.2.4.2.3 If no shipping price was found -> return the base product price only
                        return price;
                     }
                 } else if (outsideBuyBoxShippingPriceSelector !== null) {
                   // 7.2.4.3 If, on the other hand, the shipping price is under the title
                   let shippingPrice = outsideBuyBoxShippingPriceSelector.textContent.toLowerCase();

                   if (!shippingPrice.includes('free shipping') && !shippingPrice.includes('free delivery')) {
                     // Extract the decimal number from the price (for example, the price turns from $8.91 to 8.91)
                     shippingPrice = shippingPrice.match(/[\d\.]+/);
                     if (shippingPrice !== null) {
                       shippingPrice = shippingPrice[0];
                       shippingPrice = parseFloat(shippingPrice);
                     }
                   }

                   // 7.2.4.3.1 If both the offer price and the shipping price are numbers -> add them toggether and return them as the 'price'
                   if (!isNaN(price) && !isNaN(shippingPrice) && correctAddress) {
                     return price + shippingPrice;
                   } else if (!isNaN(price)) {
                    // 7.2.4.3.2 If there is no shipping price -> return the base product price only
                     return price;
                   }
                 }
                }

                // 7.2.5 Return the price, which can either be -> offerPrice + shipping or an empty string (no buy box)
                return price;
              } else if (bookItemPriceDivSelector !== null || bookItemPriceDivSelectorAlt !== null) {
                  // 7.3 The item must be a book -> different page layout
                  let offerPrice;

                  if (bookItemPriceDivSelector !== null) {
                    offerPrice = bookItemPriceDivSelector.textContent;
                  } else if (bookItemPriceDivSelectorAlt !== null) {
                    offerPrice = bookItemPriceDivSelectorAlt.textContent;
                  }

                  offerPrice = offerPrice.match(/[\d\.\,]+/g);
                  let shippingPrice = null;

                  let shippingPriceSelector = document.querySelector('div#soldByThirdParty span.shipping3P');
                  if (shippingPriceSelector !== null) {
                    shippingPriceSelector = shippingPriceSelector.textContent;
                    shippingPrice = shippingPriceSelector.match(/[\d\.\,]+/g);
                  }

                  // 7.3.1 It is sold by third party -> there is shipping price as well -> return the base product price + shipping price
                  if (offerPrice !== null && shippingPrice !== null) {
                    offerPrice = offerPrice[0].replace(',','');
                    offerPrice = parseFloat(offerPrice);

                    shippingPrice = shippingPrice[0].replace(',','');
                    shippingPrice = parseFloat(shippingPrice);

                    return offerPrice + shippingPrice;
                  } else if (offerPrice !== null) {
                    // 7.3.2 Only the base product price is available -> return it
                    offerPrice = offerPrice[0];
                    offerPrice = parseFloat(offerPrice);

                    return offerPrice;
                  }
              }
              
              // 7.3 If no price was found at all -> return null
              return null;
            }, correctAddress);

            // 8. Now check availability
            const availabilityText = await page.evaluate(() => document.querySelector('div#availability > span').textContent);

            // 8.1 Sometimes it says that the product ships within... (users requested to make sure that if a product ships later than 7 days, it is out of stock) - So, get days, week and even months
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

            // 8.2 Assume product availability of zero
            let productAvailability = '0';

            // 8.3 If the product`s availability text contains 'in stock'
            if (availabilityText.toLowerCase().includes('in stock.')) {
              // 8.3.1 The product is in stock -> we can get the product availability number
              productAvailability = await page.evaluate(() => {
                let productAvailability = 'IN_STOCK';
                let availabilitySelector = document.querySelector('select#quantity');
                if (availabilitySelector !== null) {
                  availabilitySelector = document.querySelectorAll('select#quantity option');
                  productAvailability = availabilitySelector.length;
                }

                return productAvailability;
              });
            } else if (availabilityText.includes('left in stock')) {
              // 8.3.2 There is some of the product left
              productAvailability = 'IN_STOCK';
            } else if (shipsWithinDaysRegX !== null) {
              // 8.3.3 If shipsWithinDaysRegX is not null -> we need to find out after how many days the product can be shipped

              // 8.3.3.1 Assume that the product is 'IN_STOCK'
              productAvailability = 'IN_STOCK';
              const firstDayDigit = parseInt(shipsWithinDaysRegX[1]);
              const secondDayDigit = parseInt(shipsWithinDaysRegX[2]);

              // 8.3.3.2 If the product can be shipped in more than 5 days -> mark it as OUT OF STOCK 
              if (firstDayDigit > 5) {
                productAvailability = '0';
              } else {
                // 8.3.3.3 Else it is 'IN_STOCK' -> try to find an exact quantity
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
              // 8.3.4 If the product ships within weeks -> it should be OUT OF STOCK
              productAvailability = '0';
            } else if (shipsWithinMonthsRegX !== null) {
              // 8.3.5 If the product ships within months -> it should be OUT OF STOCK
              productAvailability = '0';
            } else {
              // 8.3.5 Any other unforeseen scenario - OUT OF STOCK
              productAvailability = '0'
            }

            // 8.4 If the listing is not intially determined as OUT OF STOCK -> we need to check whether it has extended delivery (over 7 days)
            if (productAvailability !== 'OUT_OF_STOCK' && productAvailability !== '0') {
              // Because of COVID-19 Amazon has extended delivery times -> detect products with extended delivery time and make it OUT OF STOCK
          
              // 8.4.1 Check if there is a delivery message
              // ddmDeliveryMessage
              // delivery-message
              let deliveryMessageSelector = await page.$('#delivery-message');

              if (deliveryMessageSelector === null) {
                deliveryMessageSelector = await page.$('#ddmDeliveryMessage');
              }

              // 8.4.2 If there is -> there should be an estimate -> if that date estimate is further away than 7 days -> product is OUT OF STOCK
              if (deliveryMessageSelector !== null) {
                // 8.4.2.1 Get a delivery date object
                const deliveryDateObject = await page.evaluate(deliveryMessageSelector => {
                  const deliveryTimeText = deliveryMessageSelector.textContent.toLowerCase();
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
    
                  // 8.4.2.1.1 Match if there is a date in the selector
                  const dateMatch = deliveryTimeText.match(/\d+/g);
                  let monthMatch = -1;
                  
                  // 8.4.2.1.2 Check if there is a month match as well
                  for (let i = 0; i < monthsArray.length; i++) {
                    if (deliveryTimeText.includes(monthsArray[i])) {
                      monthMatch = i;
                      break;
                    }
                  }

                  // 8.4.2.1.2.1 Sometimes the months are not written with their full names (check for shortened versions)
                  if (monthMatch === -1) {
                    for (let i = 0; i < monthsArrayAlternative.length; i++) {
                      if (deliveryTimeText.includes(monthsArrayAlternative[i])) {
                        monthMatch = i;
                        break;
                      }
                    }
                  }

                  // 8.4.2.1.3 Return the matches
                  return {
                    date_match: dateMatch,
                    month_match: monthMatch
                  }
                }, deliveryMessageSelector);
                              
                // 8.4.2.2 If there is a month and a date match
                if (deliveryDateObject.month_match !== -1 && deliveryDateObject.date_match.length > 0) {
                  // 8.4.2.2.1 Get the current time and year using moment.js
                  const now = moment();
                  const currentYear = moment().year();

                  // 8.4.2.2.2 Normalize the month by adding 1, as it starts from 0 and should start from 1
                  let normalizedMonth = ++deliveryDateObject.month_match;
                  
                  // 8.4.2.2.3 If the normalized month is less than 10 a.k.a before October -> turn it into a 2-digit string (9 -> 09)
                  if (normalizedMonth < 10) {
                    normalizedMonth = `0${normalizedMonth}`;
                  }

                  // 8.4.2.2.4 Calculate the difference in days, between now and the first available delivery date
                  const deliveryDateFormat = `${currentYear}-${normalizedMonth}-${deliveryDateObject.date_match[0]}`;
                  const deliveryDate = moment(deliveryDateFormat);
                  const deliveryTimePeriod = deliveryDate.diff(now, 'days');

                  // console.log('deliveryTimePeriod', deliveryTimePeriod, deliveryDateFormat);
                  // 8.4.2.2.5 If the delivery time takes more than 13 days -> product is OUT OF STOCK
                  if (deliveryTimePeriod > 13) {
                    listing.has_extended_delivery = '1';
                    listing.delivery_date = deliveryDateFormat;
                    listing.delivery_time_period = deliveryTimePeriod;
                    productAvailability = '0';
                  }
                }
              } else {
                // 8.4.3 If there is no delivery message - product is OUT OF STOCK - not sure if this is correct -> test further
                productAvailability = '0';
              }
            }       

            // 9. If there is NO buybox
            if (price === '') {
              const seeAllBuyingOptionsButton = await page.$('#buybox-see-all-buying-choices-announce');
              const availableFromTheseSellers = await page.$('div#availability_feature_div div#availability span a');
              // 9.1 If the 'available from these sellers' link is available -> click it
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
               
                // 9.1.1 This will open the page with the sellers data (including price) - in the newer version it is a modal flyout from the right
                const productData = await this._getBestOfferFromMultipleSellers(page);
                
                // 9.3 If the returned response is not NULL -> there is a price and therefore quantity
                if (productData !== null) {
                  price = productData.price;
                  productAvailability = productData.productAvailability;
                } else {
                  price = null;
                }
              } else {
                // 9.2 Item is out of stock (and has no price showing on the product page)
                const itemAvailable = await page.evaluate(() => {
                  const priceSelectorText = document.querySelector('#outOfStock div div .a-color-price').textContent;
                  if (priceSelectorText.toLowerCase().includes('currently unavailable')) {
                    return false;
                  }

                  return true;
                });

                if (!itemAvailable) {
                  price = null;
                }
              }
            }

            // 10. Get the item name on Amazon
            const supplierItemName = await page.evaluate(() => {
              const itemName = document.querySelector('#productTitle');
              if (itemName !== null) {
                return itemName.textContent.trim();
              }

              return null;
            });

            if (supplierItemName !== null) {
              // If the listing already has a supplier item name from a previous price check
              if (listing.supplier_item_name !== null) {
                // Split both the newly extracted item name and the currently saved item name
                const newItemNameSplit = await supplierItemName.trim().toLowerCase().replace(/  +/g, ' ').split(' ');
                const currentItemNameSplit = await listing.supplier_item_name.trim().toLowerCase().replace(/  +/g, ' ').split(' ');

                // Check if the currently saved item name has any words (should compare for 1 word as well)
                if (currentItemNameSplit.length > 0) {
                  const currentItemNameObjectArray = [];
                  const newItemNameObjectArray = [];

                  // Create a new array structure of both item names splits, in order to be able to track each individual word match
                  for (let i = 0; i < currentItemNameSplit.length; i++) {
                    currentItemNameObjectArray.push({
                      name: currentItemNameSplit[i],
                      matched: false
                    });
                  }

                  for (let i = 0; i < newItemNameSplit.length; i++) {
                    newItemNameObjectArray.push({
                      name: newItemNameSplit[i],
                      matched: false
                    });
                  }

                  // Will be used to track how many matches there were between the two titles
                  let matchesCounter = 0;

                  // If there IS a current name
                  for (let i = 0; i < currentItemNameObjectArray.length; i++) {
                    if (newItemNameObjectArray.length > 0) {
                      for (let k = 0; k < newItemNameObjectArray.length; k++) {
                        if (currentItemNameObjectArray[i].name === newItemNameObjectArray[k].name) {
                          if (!currentItemNameObjectArray[i].matched && !newItemNameObjectArray[k].matched) {
                            // console.log(`${currentItemNameObjectArray[i].name} MATCHES ${newItemNameObjectArray[k].name}`);
                            currentItemNameObjectArray[i].matched = true;
                            newItemNameObjectArray[k].matched = true;
                            matchesCounter++;
                          }
                        }
                      }
                    }
                  }

                  // The matches count should be divided by the higher item name lenght to get a match percentage
                  const divideByLength = newItemNameObjectArray.length > currentItemNameObjectArray.length ? newItemNameObjectArray.length : currentItemNameObjectArray.length;

                  const percentageMatch = (matchesCounter/divideByLength) * 100;
                  // console.log(`Current name: ${listing.supplier_item_name}, length: ${currentItemNameObjectArray.length}, new item name length: ${newItemNameObjectArray.length}`);
                  // console.log(`Matches: ${matchesCounter}, percentage: ${percentageMatch}`);

                  const accountRow = await global.knex('tbl_users')
                  .where({ account: 'dalio' })
                  .first()
                  .then(row => row)
                  .catch(e => global.appLog.error(`${e} - AmazonSupplier.iterateListingsAndGetData - line 760`));

                  const accountSettings = JSON.parse(accountRow.settings);
                  const percentageThreshold = typeof accountSettings.ebay_inventory_manager.title_similarity_threshold == 'number' ? accountSettings.ebay_inventory_manager.title_similarity_threshold : parseInt(accountSettings.ebay_inventory_manager.title_similarity_threshold);


                  // If the match percentage is below 40 -> it might be a different product
                  if (percentageMatch < percentageThreshold) {
                    // enter the item title in the DB to use for comparison next time
                    await global.knex('tbl_listings')
                    .where({ id: listing.id })
                    .update({ product_changed: 1 })
                    .catch(error => global.applog.error(`${error} - in AmazonSupplier.js - iterateListingsAndGetData - line 608`));
                  } else {     
                    // If the product title match is 100% -> check if the product had been marked as 'changed' and undo it
                    if (listing.product_changed == 1) {
                      await global.knex('tbl_listings')
                      .where({ id: listing.id })
                      .update({ product_changed: 0 })
                      .catch(error => global.applog.error(`${error} - in AmazonSupplier.js - iterateListingsAndGetData - line 725`));
                    }
                  }

                  if (percentageMatch < 100) {
                    // Check for the presence of a swatch twister - has 2 or more variation levels to the listing. When there are 2 or more variation levels and the variation we are looking for is not avaailable, Dalio needs to commpare if the product name has ANY differences. If it does, consider the variation to be OUT OF STOCK.
                    const swatchTwister = await page.$$('#twister > div');

                    if (swatchTwister.length > 1) {
                      // console.log('THERE ARE TWO OR MORE VARIATIONS');
                      await global.knex('tbl_listings')
                      .where({ id: listing.id })
                      .update({ product_changed: 1 })
                      .catch(error => global.applog.error(`${error} - in AmazonSupplier.js - iterateListingsAndGetData - line 718`));
                    }
                  }

                }
                // compare the two strings and check if there is a major difference

                // split both strings

              } else {
                // enter the item title in the DB to use for comparison next time
                await global.knex('tbl_listings')
                .where({ id: listing.id })
                .update({ supplier_item_name: supplierItemName })
                .catch(error => global.applog.error(`${error} - in AmazonSupplier.js - iterateListingsAndGetData - line 569`));
              }
            }

            // console.log(`Listing ${listing.item_name}, price is ${price}, type - ${typeof price} and quantity ${productAvailability}`);
                        
            // 10. If the price is not null -> then a price had been retrieved
            if (price !== null && price !== '') {
              // 10.1 If the price is a number already -> just turn it into a string with two decimal points
              if (typeof price === 'number') {
                price = price.toFixed(2);
              } else if (typeof price === 'string') {
                // 10.2 Else if the price is a string -> parse it to a float and then turn it into a string with two decimal points
                price = parseFloat(price);
                price = price.toFixed(2);
              }

              // 10.3 Compare the new price of the product with the one already saved to the database. If there has been a reduction in the price -> DO NOT lower immediately, wait for at least two price checks and then lower it -> this will prevent catching temporary price drops (sometimes for as long as 30 minutes)

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

              const newPrice = parseFloat(price);

              // 10.3.1 Compare the two prices
              if (newPrice < currentPrice) {
                // 10.3.1.1 If the new price is lower -> check if it has been lower on at least two occasions
                if (listing.lower_price_count < 1) {
                  // 10.3.1.1.1 If the lower price counter is less than 1 -> increase the counter
                  listing.lower_price_count++;
                } else {
                  // 10.3.1.2 The price has been lower for two times or more already, so can be dropped
                  listing.lower_price_count = 0;
                  listing.new_price = newPrice.toFixed(2);
                }
              } else if(newPrice > currentPrice) {
                // 10.3.2 The new price is the same or greater, so can be changed on eBay
                listing.new_price = newPrice.toFixed(2);
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
                .catch(error => global.appLog.error(`${error} - amazonSupplier.getPrices - line 634`));
                
                // let escapedLog = await encodeURI(`${listing.item_name} with Amazon # ${listing.supplier_id} has a new price. The old price was ${currentPrice}. The new price is ${listing.new_price}`);
                let escapedLog = `Has a new source price. The old price was ${currentPrice}. The new price is ${listing.new_price}`;

                if (currentPrice == null) {
                  // escapedLog = await encodeURI(`${listing.item_name} with Amazon # ${listing.supplier_id} has a price of ${listing.new_price}`);
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
                .catch(error => global.appLog.error(`${error} - amazonSupplier.getPrices - line 634`));

                // const escapedLog = `Has been price checked. No change in the price - ${listing.new_price}`;
                // await Util.insertListingLog(listing, escapedLog, 'info');

              }
            }

            // 11. If the product availability is not NULL -> update the listing`s product availability
            if (productAvailability !== null){

              let currentAvailability = listing.product_availability;
              let newAvailability = productAvailability;

              if (typeof currentAvailability === 'number') {
                currentAvailability = currentAvailability.toString();
              }

              if (typeof newAvailability === 'number') {
                newAvailability = newAvailability.toString();
              }

              // Check if the new availability of a product is different from the one in the database
              if (currentAvailability !== newAvailability) {

                // If yes, update the availability in the database
                await global.knex('tbl_listings')
                .where({ supplier_id: listing.supplier_id })
                .update({ 
                  product_availability: newAvailability,
                  has_extended_delivery: listing.has_extended_delivery,
                  errors_during_price_check: 0 
                })
                .catch(error => global.appLog.error(`${error} - amazonSuppluer.iterateListings - line 630`));


                // let escapedLog = await encodeURI(`${listing.item_name} with Amazon # ${listing.supplier_id} has a new product availability - ${newAvailability}`);
                let escapedLog = `Has a new product availability - ${newAvailability}`;

                // Log a message when the listing is 'In Stock'
                if (currentAvailability == null && newAvailability !== 'OUT_OF_STOCK' && newAvailability !== '0' && newAvailability !== null) {
                  // escapedLog = await encodeURI(`${listing.item_name} with Amazon # ${listing.supplier_id} is in stock.`);
                  escapedLog = `Is in stock.`;
                  listing.has_extended_delivery = '0';
                  await Util.insertListingLog(listing, escapedLog, 'info');

                } else if (currentAvailability !== null && currentAvailability !== '0' && currentAvailability !== 'OUT_OF_STOCK' && (newAvailability === 'OUT_OF_STOCK' || newAvailability === '0')) {
                  if (listing.has_extended_delivery === '1') {
                    // escapedLog = await encodeURI(`${listing.item_name} with Amazon # ${listing.supplier_id} is OUT OF STOCK as it will be shipped in ${listing.delivery_time_period} days on ${listing.delivery_date}.`);
                    escapedLog = `Is OUT OF STOCK as it will be shipped in ${listing.delivery_time_period} days on ${listing.delivery_date}.`;
                    await Util.insertListingLog(listing, escapedLog, 'warning');

                  } else {
                    // Log a message when the listing goes 'Out of stock'
                    // escapedLog = encodeURI(`${listing.item_name} with Amazon # ${listing.supplier_id} has gone out of stock. Its selling price will be increased multiple times in order to prevent customers from buying it.`);
                    escapedLog = `Has gone out of stock.`;
                    await Util.insertListingLog(listing, escapedLog, 'warning');

                  } 
                } else if (currentAvailability !== null && (currentAvailability === '0' || currentAvailability === 'OUT_OF_STOCK') && newAvailability !== null && newAvailability !== '0' && newAvailability !== 'OUT_OF_STOCK') {
                  // Log a message when the listing comes back 'In Stock'
                  // escapedLog = await encodeURI(`${listing.item_name} with Amazon # ${listing.supplier_id} is back in stock. Its selling price will be lowered to the one you have specified in your settings.`);
                  escapedLog = `Is back in stock.`;
                  listing.has_extended_delivery = '0';
                  await Util.insertListingLog(listing, escapedLog, 'info');
                }

                // await global.log.warn(escapedLog);
              } else {
                const prodAvailabilityText = newAvailability == 'IN_STOCK' ? 'in stock' : newAvailability == 'OUT_OF_STOCK' ? '0' : newAvailability;
                // const escapedLog = `No change in product availability - ${prodAvailabilityText}`;
                // await Util.insertListingLog(listing, escapedLog, 'info', true);
              }

            }

            const priceCheckDelay = Util.getRandomInt(15, 20);
            await page.waitFor(priceCheckDelay);

            // 12. If the price OR the product availability is not null -> push the listing to the array of all scraped listing
            // if (price !== null || productAvailability !== null) {
            //   this.amazonSupplierProducts.push(listing);
            // }
          } else {
            // const escapedLog = encodeURI(`Listing '${listing.item_name}' does not have a valid ${listing.supplier} URL. Please change it so Dalio can perform a price check.`);
            const escapedLog = `Does not have a valid ${listing.supplier} URL. Please change it so Dalio can perform a price check.`;
            // global.log.error(escapedLog);
            await Util.insertListingLog(listing, escapedLog, 'error');
        }
      } catch (e) {   
          // await page.screenshot({ path: 'screenshot.jpeg', type: 'jpeg', fullpage: true });
          await global.appLog.error(`${e} - ${listing.item_name} - inside AmazonSupplier.iterateListingsAndGetData() line 553`);

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

            await global.nucleus.track("AMAZON_PRODUCT_PRICE_CHECK_ERROR", {
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
    
    await this.writeCookieFile(page);
    // await page.close();
  }

  _solveCaptchaIfPresent = async page => {
    // Check for an image captcha
    // await page.screenshot({ path: 'captcha.jpeg', type: 'jpeg', fullpage: true });
    const captchaInput = await page.$('input#captchacharacters');
  
    // if (captchaInput !== null) {
    //   await page.reload({ waitUntil: ["networkidle0"] });
    // }
    if (captchaInput !== null) {
      // If it appears -> get the image url
      const captchaImageURL = await page.evaluate(() => {
        const captchaImageSelector = document.querySelector('img');
        return captchaImageSelector.getAttribute('src');
      });
  
      // Send the image to 2Captcha
      const captchaResponse = await client.decode({ url: captchaImageURL }).then((response) => response);
  
      // If the response is NOT OK -> reload the page (the captcha will disappear)
      if (captchaResponse !== undefined) {
        if (captchaResponse._apiResponse !== null && captchaResponse._apiResponse !== undefined) {
          if (!captchaResponse._apiResponse.includes('OK')) {
            await page.reload({ waitUntil: "networkidle0" });
          } else {
            // If it is okay -> type the result and click the 'Continue shopping' button
            await page.type('input#captchacharacters', captchaResponse._text.toString(), { delay: 100 });
            // await page.screenshot({ path: 'captchatyped.jpeg', type: 'jpeg', fullpage: true });

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
              delivery_content: deliveryMessageSelectors[i] !== undefined ? deliveryMessageSelectors[i].textContent : ''
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
        let aodShippingCharge = [];

        // 4.3 Get all the offers` price selectors and shipping charge selectors
        const aodOfferListPricesSelectors = document.querySelectorAll('#aod-offer-list .aod-information-block #aod-offer-price .a-price .a-offscreen');

        aodShippingCharge = Array.from(document.querySelectorAll('#aod-offer-list .aod-ship-charge'));
        // document.querySelectorAll('#aod-offer-list .aod-delivery-column > span');

        // Try to get an alternative
        if (aodShippingCharge.length === 0) {
          aodShippingCharge = Array.from(document.querySelectorAll('#aod-offer-list .aod-delivery-column > span'));
        }

        // If the shipping charge still cannot be found
        if (aodShippingCharge.length === 0) {
          // Get the anchor tags after where the shipping price is supposed to be, so we can search with previous element sibling
          const anchorSelectors = document.querySelectorAll('.aod-delivery-promise');

          if (anchorSelectors.length > 0) {
            for (let i = 0; i < anchorSelectors.length; i++) {
              const shippingSelector = anchorSelectors[i].previousElementSibling;

              if (shippingSelector !== null) {
                if (shippingSelector.textContent.toLowerCase().includes('delivery') || shippingSelector.textContent.toLowerCase().includes('shipping')) {
                  aodShippingCharge.push(shippingSelector);
                }
              }
            }
          }
        }

        // document.querySelector('.aod-delivery-promise').previousElementSibling

        // 4.4 Get all of the condition selectors (if contains 'used' do not bother any longer)
        const conditionSelectors = document.querySelectorAll('#aod-offer-list #aod-offer-heading');

        // Sometimes Amazon hides half of the delivery info with (... More). Check if such buttons are available and click them all
        const aodDeliveryMoreActionButtons = document.querySelectorAll('#aod-delivery-more-action');
        if (aodDeliveryMoreActionButtons.length > 0) {
          for (let i = 0; i < aodDeliveryMoreActionButtons.length; i++) {
            aodDeliveryMoreActionButtons[i].click();
          }
        } 

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
              delivery_content: deliveryMessageSelectors[i] !== undefined ? deliveryMessageSelectors[i].textContent : ''
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
        const priceMatchRegexed = priceMatch[0].replace(',', '');

        offers[i].price_content_match = await parseFloat(priceMatchRegexed);
      }

      // 1.3 If the shipping price container does NOT include the 'free shipping' text -> extract shipping price using regex
      const containsFreeShippingText = await offers[i].ship_charge_content.toLowerCase().includes('free shipping');
      const containsFreeDeliveryText = await offers[i].ship_charge_content.toLowerCase().includes('free delivery');
      if (!containsFreeShippingText && !containsFreeDeliveryText) {
        const shipChargeMatch = await offers[i].ship_charge_content.match(/[\d\.\,]+/g);
        if (shipChargeMatch !== null) {
          const shipChargeMatchRegexed = shipChargeMatch[0].replace(',', '');

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

        let normalizedDate = await parseInt(dateMatch[0]);

        if (normalizedDate < 10) {
          normalizedDate = await `0${normalizedDate}`;
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
      }
    }

    return bestOffer;
  }

  /*
   * Delete Amazon cookie file -> logging out of Amazon account
   */
  deleteCookieFile = async (country = 'US', type = 'repricer') => {
    let cookieFilePath = global.amazonUSCookiePath;

    if (country === 'CA') {
      cookieFilePath = global.amazonCACookiePath;
    } else if (country === 'UK') {
      cookieFilePath = global.amazonUKCookiePath;
    } else if (country === 'DE') {
      cookieFilePath = global.amazonDECookiePath;
    } else if (country === 'FR') {
      cookieFilePath = global.amazonFRCookiePath;
    } else if (country === 'IT') {
      cookieFilePath = global.amazonITCookiePath;
    } else if (country === 'ES') {
      cookieFilePath = global.amazonESCookiePath;
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
  readCookieFile = async (country = 'US') => {
    // Default cookie path is US
    let cookieFilePath = global.amazonUSCookiePath;

    if (country === 'CA') {
      cookieFilePath = global.amazonCACookiePath;
    } else if (country === 'UK') {
      cookieFilePath = global.amazonUKCookiePath;
    } else if (country === 'DE') {
      cookieFilePath = global.amazonDECookiePath;
    } else if (country === 'FR') {
      cookieFilePath = global.amazonFRCookiePath;
    } else if (country === 'IT') {
      cookieFilePath = global.amazonITCookiePath;
    } else if (country === 'ES') {
      cookieFilePath = global.amazonESCookiePath;
    } 

    const cookieFileExists = await new Promise((resolve, reject) => {
      return fs.access(cookieFilePath, fs.F_OK, err => {
          if (err) {
            if (err && err.code === 'ENOENT') {
              return resolve(false);
            } else {
              global.appLog.info(err);
              return reject(err);
            }
          } else {
            return resolve(true);
          }
      });
    });

    if (cookieFileExists) {
      // Query the file content of the specified country`s cookie file
      const fileContent = await new Promise((resolve, reject) => {
        // This function reads and returns the content of the cookie file -> it is parsed as JSON
        return fs.readFile(cookieFilePath, { encoding: 'utf8' }, (err, data) => {
          if (err) {
            return reject(err);
          }

          return resolve(JSON.parse(data));
        });
      });
      
      return fileContent;
    }

    return cookieFileExists;
  };

  /*
   * Gets the cookies from the Amazon session and saves/overwrites the cookie file
   */
  writeCookieFile = async page => {
    global.amazonCookies.US = await page.cookies(
      'https://amazon.com',
      'https://www.amazon.com'
    );

    global.amazonCookies.CA = await page.cookies(
      'https://amazon.ca',
      'https://www.amazon.ca'
    );

    global.amazonCookies.MX = await page.cookies(
      'https://amazon.com.mx',
      'https://www.amazon.com.mx'
    );

    global.amazonCookies.UK = await page.cookies(
      'https://amazon.co.uk',
      'https://www.amazon.co.uk'
    );

    global.amazonCookies.DE = await page.cookies(
      'https://amazon.de',
      'https://www.amazon.de'
    );

    global.amazonCookies.FR = await page.cookies(
      'https://amazon.fr',
      'https://www.amazon.fr'
    );

    global.amazonCookies.IT = await page.cookies(
      'https://amazon.it',
      'https://www.amazon.it'
    );

    global.amazonCookies.ES = await page.cookies(
      'https://amazon.es',
      'https://www.amazon.es'
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

  acceptCookies = async page => {
    // sp-cc-accept
    // const cookieBannerSelector = await page.$('#sp-cc');
    const cookieAcceptButton = await page.$('#sp-cc-accept');

    if (cookieAcceptButton !== null) {
      // await Promise.all([
      //   page.waitForNavigation({ waitUntil: 'networkidle0' }),
      //   cookieAcceptButton.click()
      // ]);

      await cookieAcceptButton.click();
      await page.waitFor(10000);
    }
  }
}

const changeAmazonDeliveryAddress = async (page, postcode) => {
  // Check if the address is already set
  const addressAlreadySet = await page.evaluate(postcode => {
    // Get the current zip code
    const currentAddress = document.querySelector('div#nav-global-location-slot > span > a > div#glow-ingress-block > span#glow-ingress-line2');

    if (currentAddress !== null) {
      // If it is set to the postcode provided as parameter -> return true -> the address is set
      if (currentAddress.textContent.includes(postcode)) {
        return true;
      }
    }

    // Else -> return false
    return false;
  }, postcode);
  
  // If the address is not already set
  if (!addressAlreadySet) {
    // Check if a different address in the same country is set (not likely)
    const differentAddress = await page.evaluate(() => {
      const differentAddress = document.querySelector('a#GLUXChangePostalCodeLink');
      // If it is set, then click the 'Change address' link
      if (differentAddress !== null) {
        differentAddress.click();
        return true;
      }

      return false;
    });

    // If a different address in the same country had been set -> Dalio will have clicked the change address button
    if (differentAddress) {
      // Wait for everything to calm down
      await page.waitFor(2000);
    }

    // await page.bringToFront();
    // Click the address location link
    await page.waitForSelector('#nav-global-location-slot > span');
    await page.click('#nav-global-location-slot > span');
    await page.waitFor(4000);
    // Enter the postcode provided
    // await page.bringToFront();
    await page.waitForSelector('input#GLUXZipUpdateInput');
    await page.type('input#GLUXZipUpdateInput', postcode, { delay: 100 }); 
    await page.waitFor(4000);
    // await page.bringToFront();
    // After the postcode is entered -> click 'Apply'
    await page.waitForSelector('span#GLUXZipUpdate > span > input');
    await page.click('span#GLUXZipUpdate > span > input');
    await page.waitFor(4000);
    // if the 'Done' button appears -> click it

    // if (glowDoneButton !== null) {
    //   // await page.bringToFront();
    //   await glowDoneButton.click();
    // } else {
    //   if (confirmButton !== null) {
    //     // await page.bringToFront();
    //     await confirmButton.click();
    //   }
    // }

    await page.evaluate(() => {
      const glowDoneButton = document.querySelector('button[name="glowDoneButton"]');
      const confirmButton = document.querySelector('input#GLUXConfirmClose');

      if (glowDoneButton !== null) {
        glowDoneButton.click();
      } else {
        if (confirmButton !== null) {
          confirmButton.click();
        }
      }
    });

    await page.waitFor(3000);
  } else {
    return true;
  }

  const correctAddressAfterSetting = await page.evaluate(postcode => {
    // Get the current zip code
    const currentAddress = document.querySelector('div#nav-global-location-slot > span > a > div#glow-ingress-block > span#glow-ingress-line2').textContent;

    // If it is set to the postcode provided as parameter -> return true -> the address is set
    if (currentAddress.includes(postcode)) {
      return true;
    }

    // Else -> return false
    return false;
  }, postcode);

  if (correctAddressAfterSetting) {
    return true;
  }

  return false;
}

export default AmazonSupplier;
