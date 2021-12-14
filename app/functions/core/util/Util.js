/* eslint no-plusplus: 0 */
/* eslint no-param-reassign: 0 */
/* eslint no-undef: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint no-shadow: 0 */
/* eslint object-shorthand: 0 */
/* eslint array-callback-return: 0 */
/* eslint eqeqeq: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint no-else-return: 0 */
/* eslint no-useless-escape: 0 */
/* eslint prefer-template: 0 */
/* eslint operator-assignment: 0 */

// @flow

import moment from 'moment';
import type { HandleOnboardingInfo, AccountRow } from '../../../types/UtilTypes';

class Util {

  static showWarnings = async mainWindow => {
    const listings = await global.knex('tbl_listings')
    .select()
    .where({ is_deleted: '0' })
    .then(rows => rows)
    .catch(error => global.appLog.error(`${error} - Util.showWarnings() line 14`));

    if (listings.length > 0) {
      let showWarning = false;
      let listingsWithWarnings = 0;
      let repriceableListings = 0;

      for (let i = 0; i < listings.length; i++) {
        if (
          listings[i].product_changed != '0' || 
          listings[i].pause_listing === '1' ||
          (listings[i].store_id === null && listings[i].has_variations !== '1') || 
          (listings[i].store_id === '' && listings[i].has_variations !== '1') || 
          (listings[i].supplier_id === null && listings[i].has_variations !== '1') || 
          (listings[i].supplier_id === '' && listings[i].has_variations !== '1') || 
          (listings[i].supplier_url === null && listings[i].has_variations !== '1') || 
          (listings[i].supplier_url === '' && listings[i].has_variations !== '1') || 
          (listings[i].store_url === null && listings[i].has_variations !== '1') || 
          (listings[i].store_url === '' && listings[i].has_variations !== '1')
          ) {
          
          showWarning = true;
          listingsWithWarnings++;
        } else {
          repriceableListings++;
        }
      }

      if (showWarning) {
        mainWindow.webContents.send('toggle-listings-warning', showWarning, listingsWithWarnings);
      }

      mainWindow.webContents.send('repriceable-listings-count', repriceableListings, listings.length);
    }
  }

  static showOrderWarnings = async mainWindow => {
    const orders = await global.knex('tbl_orders')
    .select()
    .then(rows => rows)
    .catch(error => global.appLog.error(`${error} - Util.showOrderWarnings() line 42`));

    if (orders.length > 0) {
      let showWarning = false;
      let ordersWithWarnings = 0;
      // @TODO - send it to the front end and show it in the UI
      // let actionableOrders = 0;

      for (let i = 0; i < orders.length; i++) {
        if (orders[i].status_code === '0' && orders[i].matched_listing_store_id === null || (orders[i].errors !== 0 && orders[i].errors !== null)) {
          showWarning = true;
          ordersWithWarnings++;
        } 
        // else {
        //   actionableOrders++;
        // }
      }

      if (showWarning) {
        mainWindow.webContents.send('toggle-orders-warning', showWarning, ordersWithWarnings);
      }
    }
  }

  static handleOnboarding = async (mainWindow: Object, info: HandleOnboardingInfo) => {
      switch (info.action) {
        case 'get-settings':
          global
            .knex('tbl_users')
            .where({ account: 'dalio' })
            .first()
            .then((row: AccountRow | void) => {
              if (row !== undefined) {
                if (row.settings !== null) {
                  const settings = JSON.parse(row.settings);
                  mainWindow.webContents.send('onboarding', settings.onboarding);
                }
              }
              return null;
            })
            .catch(err => global.appLog.error(err));
          break;
        case 'change-settings':
          global
            .knex('tbl_users')
            .where({ account: 'dalio' })
            .first()
            .then((row: AccountRow | void) => {
              // If there is such an account DB entry
              if (row !== undefined) {
                // If the settings row is not null
                if (row.settings !== null) {
                  
                  // Parse the JSON settings value to a JS object
                  const settings = JSON.parse(row.settings);
  
                  // If the setting to be changed is 'show'
                  if (info.settings.show !== undefined) {
                    // Compare it to the one already in the database
                    if (info.settings.show !== settings.onboarding.show) {
                      // If different -> change it
                      settings.onboarding.show = info.settings.show;
                      // Update the DB entry with the new setting
                      global
                        .knex('tbl_users')
                        .where({ account: 'dalio' })
                        .update({
                          settings: JSON.stringify(settings)
                        })
                        .catch(err => global.appLog.error(err));
                    }
                  }
  
                  // If the setting to be changed is 'sign_in_amazon'
                  if (info.settings.sign_in_amazon !== undefined) {
                    // Compare it to the one already in the database
                    if (info.settings.sign_in_amazon !== settings.onboarding.sign_in_amazon) {
                      // If different -> change it
                      settings.onboarding.sign_in_amazon = info.settings.sign_in_amazon;
                      // Update the DB entry with the new setting
                      global
                        .knex('tbl_users')
                        .where({ account: 'dalio' })
                        .update({
                          settings: JSON.stringify(settings)
                        })
                        .catch(err => global.appLog.error(err));
                    }
                  }
  
                  // If the setting to be changed is 'sign_in_amazon'
                  if (info.settings.sign_in_ebay !== undefined) {
                    // Compare it to the one already in the database
                    if (info.settings.sign_in_ebay !== settings.onboarding.sign_in_ebay) {
                      // If different -> change it
                      settings.onboarding.sign_in_ebay = info.settings.sign_in_ebay;
                      // Update the DB entry with the new setting
                      global
                        .knex('tbl_users')
                        .where({ account: 'dalio' })
                        .update({ settings: JSON.stringify(settings) })
                        .catch(err => global.appLog.error(err));
                    }
                  }
  
                  // If the setting to be changed is 'add_first_listing'
                  if (info.settings.add_first_listing !== undefined) {
                    // Compare it to the one already in the database
                    if (info.settings.add_first_listing !== settings.onboarding.add_first_listing) {
                      // If different -> change it
                      settings.onboarding.add_first_listing = info.settings.add_first_listing;
                      // Update the DB entry with the new setting
                      global
                        .knex('tbl_users')
                        .where({ account: 'dalio' })
                        .update({
                          settings: JSON.stringify(settings)
                        })
                        .catch(err => global.appLog.error(err));
                    }
                  }
                }
              }
              return null;
            }).catch(err => global.appLog.error(err));
          break;
        default:
        // do nothing
      }
  };

  static getChromiumExecPath = (puppeteer: Object): string => {
    const path = puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
    return path;
  };

  static shuffleArray = (array: Array<any>): Array<any> => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  static splitArrayInChunks = (array: Array<any>, size: number): Array<any> => {
    if (!array.length) {
      return [];
    }
    const head = array.slice(0, size);
    const tail = array.slice(size);
  
    return [head, ...this.splitArrayInChunks(tail, size)];
  }

  static splitArrayInResizedChunks = (array) => {
    if (array.length < 60) {
      return this.splitArrayInChunks(array, 20);
    } else if (array.length >= 60 && array.length < 100) {
      return this.splitArrayInChunks(array, 30);
    } else if (array.length >= 100 && array.length < 200) {
      return this.splitArrayInChunks(array, 40);
    } else if (array.length >= 200 && array.length < 300) {
      return this.splitArrayInChunks(array, 150);
    } else if (array.length >= 300 && array.length < 400) {
      return this.splitArrayInChunks(array, 200);
    } else if (array.length >= 400 && array.length < 500) {
      return this.splitArrayInChunks(array, 250);
    } else if (array.length >= 500 && array.length < 600) {
      return this.splitArrayInChunks(array, 300);
    } else if (array.length >= 600 && array.length < 700) {
      return this.splitArrayInChunks(array, 350);
    } else if (array.length >= 700 && array.length < 800) {
      return this.splitArrayInChunks(array, 400);
    } else if (array.length >= 800 && array.length < 900) {
      return this.splitArrayInChunks(array, 450);
    } else if (array.length >= 900 && array.length < 1000) {
      return this.splitArrayInChunks(array, 500);
    } else if (array.length >= 1000 && array.length < 1200) {
      return this.splitArrayInChunks(array, 600);
    } else if (array.length >= 1200 && array.length < 1400) {
      return this.splitArrayInChunks(array, 7000);
    } else if (array.length >= 1400 && array.length < 1600) {
      return this.splitArrayInChunks(array, 800);
    } else if (array.length >= 1600 && array.length < 1800) {
      return this.splitArrayInChunks(array, 900);
    } else if (array.length >= 1800 && array.length < 2000) {
      return this.splitArrayInChunks(array, 1000);
    } 
      
    return this.splitArrayInChunks(array, 400);
  }

  static autoScroll = async (page: Object): Promise<any> => {
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  };

  static changeAmazonDeliveryAddress = async (page, supplierUrl) => {
    let postcode = '';

    if (supplierUrl.includes('amazon.com')) {
      postcode = '10001';
    } else if (supplierUrl.includes('amazon.ca')) {
      postcode = 'H1A 0A1';
    } else if (supplierUrl.includes('amazon.co.uk')) {
      postcode = 'CV24NA';
    } else if (supplierUrl.includes('amazon.de')) {
      postcode = '10115';
    } else if (supplierUrl.includes('amazon.fr')) {
      postcode = '75000';
    } else if (supplierUrl.includes('amazon.it')) {
      postcode = '00100';
    } else if (supplierUrl.includes('amazon.es')) {
      postcode = '28001';
    }


    // Check if the address is already set
    const addressAlreadySet = await page.evaluate(postcode => {
      // Get the current zip code
      const currentAddress = document.querySelector('div#nav-global-location-slot > span > a > div#glow-ingress-block > span#glow-ingress-line2').textContent;
  
      // If it is set to the postcode provided as parameter -> return true -> the address is set
      if (currentAddress.includes(postcode)) {
        return true;
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

  static insertListingLog = async (listing, log, level = 'info', read = false) => {
    const logTime = await moment().format('DD-MM-YYYY HH:mm:ss');
    const now = await moment();

    const listingLog = {
      time: logTime,
      log: encodeURI(log),
      level: level,
      read: read
    };

    const currentListing = await global.knex('tbl_listings')
    .where({ store_id: listing.store_id })
    .first()
    .then(row => row)
    .catch(e => global.appLog.error(`${e} - Listings.insertListingLog - line 775`));

    if (currentListing !== null && currentListing !== undefined) {
      let currentListingLogs;
      if (currentListing.logs !== null && currentListing.logs !== '' && currentListing.logs !== 'null') {
        currentListingLogs = JSON.parse(currentListing.logs);

        // Filter out all listings older than 4 days as they get too many
        currentListingLogs = currentListingLogs.filter((log) => {
          const logTimeDate = moment(log.time, 'DD-MM-YYYY');
          const logTimeDiff = now.diff(logTimeDate, 'days');
          if (logTimeDiff <= 5) {
            return log;
          }
        });        

      } else {
        currentListingLogs = [];
      }

      currentListingLogs.push(listingLog);
      currentListingLogs = JSON.stringify(currentListingLogs);
      
      await global.knex('tbl_listings')
      .where({ store_id: listing.store_id })
      .update({ logs: currentListingLogs })
      .catch(e => global.appLog.error(`${e} - Listings.insertListingLogs - line 790`));


      // Create a backup copy of the log in a separate table
      await global.knex('tbl_listing_logs')
      .insert({
        listing_id: listing.store_id,
        log: listingLog.log,
        time_created: listingLog.time,
        level: listingLog.level
      })
      .catch(e => global.appLog.error(`${e} - in Util.inserListingLog - line 389`));
    }
  }

  static insertOrderLog = async (order, log, level = 'info') => {
    const logTime = await moment().format('DD-MM-YYYY HH:mm:ss');

    const orderLog = {
      time: logTime,
      log: encodeURI(log),
      level: level,
      read: false
    };

    const currentOrder = await global.knex('tbl_orders')
    .where({ order_number: order.order_number })
    .first()
    .then(row => row)
    .catch(e => global.appLog.error(`${e} - Util.insertOrderLog - line 419`));

    if (currentOrder !== null && currentOrder !== undefined) {
      let currentOrderLogs;
      if (currentOrder.logs !== null && currentOrder.logs !== '' && currentOrder.logs !== 'null') {
        currentOrderLogs = JSON.parse(currentOrder.logs);
      } else {
        currentOrderLogs = [];
      }

      currentOrderLogs.push(orderLog);
      currentOrderLogs = JSON.stringify(currentOrderLogs);
      
      await global.knex('tbl_orders')
      .where({ order_number: order.order_number})
      .update({ logs: currentOrderLogs })
      .catch(e => global.appLog.error(`${e} - Util.insertOrderLogs - line 435`))
    }
  }

  static calculateSalePrice = async (sourcePriceParam, formulaSettings) => {
    const sourcePrice = parseFloat(sourcePriceParam);

    let stateTaxPercentage = 0;
    if (formulaSettings.add_state_tax == '1') {
      stateTaxPercentage = parseFloat(formulaSettings.state_tax_percentage);
    }

    let vatPercentage = 0;
    let purchaseVAT = 0;
    if (formulaSettings.add_vat == '1') {
      vatPercentage = parseFloat(formulaSettings.vat_percentage);
    }

    let ebayFeePercentage = 0;
    if (formulaSettings.add_ebay_fee == '1') {
      ebayFeePercentage = parseFloat(formulaSettings.ebay_fee);
    }

    let paypalFeePercentage = 0;
    let paypalFixedFee = 0;
    if (formulaSettings.add_paypal_fee == '1') {
      paypalFeePercentage = parseFloat(formulaSettings.paypal_fee_percentage);
      paypalFixedFee = parseFloat(formulaSettings.paypal_fixed_fee);
    }

    // console.log('----------------------------------');

    // Assume a larger number
    let multiplyFactor = 2;
    let result = (Math.abs(sourcePrice) + 0.1) * multiplyFactor;

    let refactorSum = 0;
    const refactorPercentage = parseFloat(formulaSettings.refactor_percentage);
    if (formulaSettings.use_refactor_percentage == '0') {
      refactorSum = parseFloat(formulaSettings.refactor_fixed_sum);
    } else if (formulaSettings.use_refactor_percentage == '1') {
      refactorSum = result * (refactorPercentage/100);
    }

    let calculatedSaleVAT = result - result / (1 + (vatPercentage/100));
    let calculatedPaypalFees = formulaSettings.add_paypal_fee == '1' ? result * (paypalFeePercentage/100) + paypalFixedFee : 0;
    let calculatedEbayFees = formulaSettings.add_ebay_fee == '1' ? result * (ebayFeePercentage/100) : 0;

    // (10*1.07+0.30)/(1-(0.029+0.10+0.10))
    let calculatedStateTax = formulaSettings.add_state_tax == '1' ? sourcePrice * (stateTaxPercentage/100) : 0;

    if (formulaSettings.add_vat == '0') {
      if ((result - calculatedPaypalFees - calculatedEbayFees - calculatedStateTax - refactorSum) < sourcePrice) {
        while ((result - calculatedPaypalFees - calculatedEbayFees - calculatedStateTax - refactorSum) < sourcePrice) {
          result = (Math.abs(sourcePrice) + 0.1) * ++multiplyFactor;

          if (formulaSettings.use_refactor_percentage == '1') {
            refactorSum = result * (refactorPercentage/100);
          }

          calculatedPaypalFees = formulaSettings.add_paypal_fee == '1' ? result * (paypalFeePercentage/100) + paypalFixedFee : 0;
          calculatedEbayFees = formulaSettings.add_ebay_fee == '1' ? result * (ebayFeePercentage/100) : 0;
          calculatedStateTax = formulaSettings.add_state_tax == '1' ? sourcePrice * (stateTaxPercentage/100) : 0;
        }
      }

      while ((result - calculatedPaypalFees - calculatedEbayFees - calculatedStateTax - refactorSum) > sourcePrice){
        result -= 0.01;

        if (formulaSettings.use_refactor_percentage == '1') {
          refactorSum = result * (refactorPercentage/100);
        }

        calculatedPaypalFees = formulaSettings.add_paypal_fee == '1' ? result * (paypalFeePercentage/100) + paypalFixedFee : 0;
        calculatedEbayFees = formulaSettings.add_ebay_fee == '1' ? result * (ebayFeePercentage/100) : 0;
        calculatedStateTax = formulaSettings.add_state_tax == '1' ? sourcePrice * (stateTaxPercentage/100) : 0;
      }

      // console.log('Source price: ', sourcePrice);
      // console.log('State tax percentage: ', stateTaxPercentage, calculatedStateTax.toFixed(2));
      // console.log('Ebay fee percentage: ', ebayFeePercentage, calculatedEbayFees.toFixed(2));
      // console.log('Paypal fees: ', paypalFeePercentage, paypalFixedFee, calculatedPaypalFees.toFixed(2));
      // console.log('Profit sum: ', refactorSum);

      // console.log(`${result} - (${calculatedPaypalFees.toFixed(2)}) - ${calculatedEbayFees.toFixed(2)}) - ${calculatedStateTax}) - ${refactorSum}`);

    } else {
      purchaseVAT = sourcePrice - sourcePrice / (1 + (vatPercentage / 100));

      if ((result - calculatedPaypalFees - calculatedEbayFees - calculatedSaleVAT + purchaseVAT - refactorSum) < sourcePrice) {
        while ((result - calculatedPaypalFees - calculatedEbayFees - calculatedSaleVAT + purchaseVAT - refactorSum) < sourcePrice) {
          result = (Math.abs(sourcePrice) + 0.1) * ++multiplyFactor;

          if (formulaSettings.use_refactor_percentage == '1') {
            refactorSum = result * (refactorPercentage/100);
          }

          purchaseVAT = sourcePrice - sourcePrice / (1 + (vatPercentage / 100));
          calculatedPaypalFees = result * (paypalFeePercentage/100) + paypalFixedFee;
          calculatedEbayFees = result * (ebayFeePercentage/100);
          calculatedSaleVAT = result - result / (1 + (vatPercentage/100));
        }
      }

      while ((result - calculatedPaypalFees - calculatedEbayFees - calculatedSaleVAT + purchaseVAT - refactorSum) > sourcePrice){
        result -= 0.01;

        if (formulaSettings.use_refactor_percentage == '1') {
          refactorSum = result * (refactorPercentage/100);
        }

        purchaseVAT = sourcePrice - sourcePrice / (1 + (vatPercentage / 100));
        calculatedPaypalFees = result * (paypalFeePercentage/100) + paypalFixedFee;
        calculatedEbayFees = result * (ebayFeePercentage/100);
        calculatedSaleVAT = result - result / (1 + (vatPercentage/100));
      }

      // console.log('Source price: ', sourcePrice);
      // console.log('Purchase VAT: ', purchaseVAT.toFixed(2));
      // console.log('VAT percentage: ', vatPercentage, (result * (vatPercentage/100)).toFixed(2));
      // console.log('Ebay fee percentage: ', ebayFeePercentage, calculatedEbayFees.toFixed(2));
      // console.log('Paypal fees: ', paypalFeePercentage, paypalFixedFee, calculatedPaypalFees.toFixed(2));
      // console.log('Profit sum: ', refactorSum);

      // console.log(`${result} - (${calculatedPaypalFees.toFixed(2)}) - ${calculatedEbayFees.toFixed(2)}) - ${calculatedSaleVAT}) - ${refactorSum}`);

    }

    result = parseFloat(result).toFixed(2);

    const calculatedProfit = refactorSum > 0 ? `+${refactorSum.toFixed(2)}` : refactorSum == 0 ? refactorSum.toFixed(2) : `-${refactorSum.toFixed(2)}`;
    
    return {
      target_price: result,
      calculated_ebay_fee: calculatedEbayFees.toFixed(2),
      calculated_paypal_fees: calculatedPaypalFees.toFixed(2),
      calculated_state_tax: calculatedStateTax.toFixed(2),
      calculated_purchase_vat: purchaseVAT.toFixed(2),
      calculated_sale_vat: calculatedSaleVAT.toFixed(2),
      use_refactor_percentage: formulaSettings.use_refactor_percentage,
      refactor_percentage: refactorPercentage,
      calculated_profit: calculatedProfit
    };
  }

  static getRandomInt = (min, max, type = 'ms') => {
    min = Math.ceil(min);
    max = Math.floor(max);
    if (type === 'ms') {
      return (Math.floor(Math.random() * (max - min) + min))*1000; // The maximum is exclusive and the minimum is inclusive
    }

    return Math.floor(Math.random() * (max - min) + min);
  }

  static parseEbayDate = (date) => {
    const dateRegex = new RegExp(/(\d\d?\s\w+\s\d{4})[^\d]+(\d{1,2})\.(\d{1,2})\s?(am|pm).*((GMT|EST|BST|UTC)((\+|\-)?\d{1,4})?)/,"i");

    const parsedDateDay = date.match(dateRegex)[1];
    const parsedDateHour = date.match(dateRegex)[2];
    const parsedDateMinute = date.match(dateRegex)[3];
    const parsedDateAMPM = date.match(dateRegex)[4];
    // const parsedDateTimezone = date.match(dateRegex)[5];

    const parsedDate = new Date(parsedDateDay.replace(' ', '-') + ' ' + parsedDateHour + ':' + parsedDateMinute + ' ' + parsedDateAMPM.toUpperCase());

    return `${parsedDate.getFullYear()}-${this.pad((parsedDate.getMonth()+1),2,0)}-${this.pad(parsedDate.getDate(),2,0)} ${this.pad(parsedDate.getHours(),2,0)}:${this.pad(parsedDate.getMinutes(),2,0)}:00`;

  }

  static pad = (n, width, z) => {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }
}

export default Util;