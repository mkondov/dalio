/* eslint global-require: 0 */
/* eslint no-plusplus: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint no-else-return: 0 */
/* eslint no-await-in-loop: 0 */

import { ipcMain } from 'electron';
import axios from 'axios';
// import papa from 'papaparse';
// import fs from 'fs';
import ServerCommunications from '../../core/util/ServerCommunications';

import Util from '../../core/util/Util';

class Listings {
    csvFile = '';

    mainWindow = undefined;

    constructor (repricerHelper) {
        this.repricerHelper = repricerHelper;
        this.mainWindow = repricerHelper.mainWindow;

        ipcMain.on('count-listings', async event => {
          const number = await this.countListings();
          event.sender.send('count-listings', number);
          Util.showWarnings(this.mainWindow);
        });

        ipcMain.on('request-listings', (): void => {
          this.sendListingsToFrontEnd();
        });

        ipcMain.on('add-listing', async (event, data) => {
          // Await for the add listing reponse
          const listingAdded = await this.addListing(data);

          // If the listing cannot be added -> send an error back to addListings.js else send confirmation
          event.sender.send('add-listing', listingAdded);

          if (global.accountStatus !== 0) {
            const listingData = await JSON.parse(JSON.stringify(data));
            listingData.user_email = global.accountEmail;
            listingData.time_created = data.created_at;

            const listingsArray = [];
            listingsArray.push(listingData);

            ServerCommunications.sendListings('update', listingsArray);
            
          }
        });

        ipcMain.on('delete-listing', async (event, listing) => {
          this.deleteListing(listing);

          if (global.accountEmail !== undefined && global.accountEmail !== 'godmode@dalio.io') {
            const listingData = await JSON.parse(JSON.stringify(listing));
            listingData.user_email = global.accountEmail;
            listingData.time_created = listing.created_at;

            const listingsArray = [];
            await listingsArray.push(listingData);
            
            ServerCommunications.sendListings('delete', listingsArray);
          }

        });

        ipcMain.on('update-listing', async (event, data) => {
          const listingUpdated = await this.updateListing(data);
          this.repricerHelper.refactorPrices();
          event.sender.send('update-listing', listingUpdated);

          if (global.accountStatus !== 0) {
            const listingData = await JSON.parse(JSON.stringify(data));
            listingData.user_email = global.accountEmail;
            listingData.time_created = data.created_at;

            const listingsArray = [];
            listingsArray.push(listingData);

            ServerCommunications.sendListings('update', listingsArray);
          }
        });

        ipcMain.on('add-listing-variation', async (event, data) => {
          // Await for the add listing reponse
          const listingVariationAdded = await this.addListingVariation(data);

          // If the listing variation cannot be added -> send an error back to addListingsVariation.js else send confirmation
          event.sender.send('add-listing-variation', listingVariationAdded);

          if (global.accountStatus !== 0) {
            const listingData = await JSON.parse(JSON.stringify(data));
            listingData.user_email = global.accountEmail;
            listingData.time_created = data.created_at;

            const listingsArray = [];
            listingsArray.push(listingData);

            ServerCommunications.sendListings('update', listingsArray);
            
          }
        });

        // reset-changed-product-warning
        ipcMain.on('reset-changed-product-warning', async (event, listing) => {
          await global.knex('tbl_listings')
          .where({ store_id: listing.store_id })
          .update({ 
            product_changed: 0,
            supplier_item_name: null
          })
          .catch(error => global.appLog.error(`${error} in Listings.js - reset-changed-product-warning - line 136`));

          const listingsWithWarnings = await global.knex('tbl_listings')
          .where({ product_changed: 1 })
          .then(rows => rows)
          .catch(error => global.appLog.error(`${error} in Listings.js - reset-changed-product-warning - line 141`));

          if (listingsWithWarnings.length === 0) {
            event.sender.send('toggle-listings-warning', false, 0);
          } else {
            event.sender.send('toggle-listings-warning', true, listingsWithWarnings.length);
          }
        });

        ipcMain.on('pause-listing', async (event, listing) => {
          await global.knex('tbl_listings')
          .where({ store_id: listing.store_id })
          .update({ pause_listing: listing.pause_listing })
          .catch(e => global.appLog.error(`${e} - Listings - pause-listing - line 136`));
          
          Util.showWarnings(this.mainWindow);
        });
        
        ipcMain.on('force-oos', async (event, listing) => {
          await global.knex('tbl_listings')
          .where({ store_id: listing.store_id })
          .update({ force_oos: listing.force_oos })
          .catch(e => global.appLog.error(`${e} - Listings - force-oos - line 145`));
          
          // Util.showWarnings(this.mainWindow);
        }); 

        ipcMain.on('update-listing-logs-status', async (event, listing) => {
          let stringifiedLogs = '';
    
          if (typeof listing.logs !== 'string') {
            stringifiedLogs = JSON.stringify(listing.logs);
          } else {
            stringifiedLogs = listing.logs;
          }
    
          global.knex('tbl_listings')
            .where({ store_id: listing.store_id })
            .update({ logs: stringifiedLogs })
            .catch(e => global.appLog.error(`${e} - Listings - update-listing-logs-status - line 152`));
        });

        ipcMain.on('delete-listing-logs', async (event, listing) => {
          console.log('deleting logs for', listing.item_name);
          const listingLogsValue = null;

          await global.knex('tbl_listings')
          .where({ store_id: listing.store_id })
          .update({ logs: listingLogsValue })
          .catch(e => global.appLog.error(`${e} - Listings.delete-listing-logs line 160`));
          
          this.sendListingsToFrontEnd();
        });

        // ipcMain.on('stream-csv-file', async (event, file) => {        
        //   this.csvFile = file[0];
        //   this.repricerHelper.mainWindow.webContents.send('open-csv-import-modal', 0, '', true);

        //   const csvStream = fs.createReadStream(file[0]);
        //   let count = 0; // cache the running count
        
        //   papa.parse(csvStream, {
        //     worker: true,
        //     header: true,
        //     step: (result) => {
        //         // do stuff with result
        //         // if (count < 1) {
        //         //   console.log(result.data);
        //         // }
        
        //         count++;
        //     },
        //     complete: () => {
        //         console.log('Parsing finished', count);
        //         this.repricerHelper.mainWindow.webContents.send('open-csv-import-modal', count, file[0], false);
        //     }
        //   });

        // });

        // ipcMain.on('parse-csv-file', async (event, lowerBoundary, higherBoundary) => {        
          
        //   if (this.csvFile !== '') {
        //     const csvStream = fs.createReadStream(this.csvFile);
        //     let count = 0; // cache the running count
        //     let addedToDBCount = 0;

        //     const listingsToImport = [];
        //     papa.parse(csvStream, {
        //       worker: true,
        //       header: true,
        //       step: (result) => {

        //           if (count >= lowerBoundary && count <= higherBoundary) {
        //             // listingsToImport.push(result.data);

        //             const listing = {};
        //             listing.local_refactor_settings = JSON.stringify({
        //               refactor_percentage: 15,
        //               add_state_tax: 0,
        //               state_tax_percentage: 6,
        //               add_amazon_fee: 0,
        //               amazon_fee_percentage: 15,
        //               refactor_fixed_sum: 0,
        //               add_ebay_fee: 0,
        //               ebay_fee: 11,
        //               add_paypal_fee: 0,
        //               paypal_fee_percentage: 2.9,
        //               paypal_fixed_fee: 0.30,
        //               minimum_price: 0,
        //               maximum_price: 0,
        //             });

        //             const title = result.data['Title'];
        //             const supplier_url = result.data['Link'];
        //             const supplier_id = result.data['SKU'];
        //             const image = result.data['Image 1'];

        //             let supplier = '';

        //             if (supplier_url.toLowerCase().includes('vidaxl')) {
        //               supplier = 'vidaxl';
        //             } else if (supplier_url.toLowerCase().includes('amazon')) {
        //               supplier = 'amazon';
        //             } if (supplier_url.toLowerCase().includes('walmart')) {
        //               supplier = 'walmart';
        //             } if (supplier_url.toLowerCase().includes('homedepot')) {
        //               supplier = 'homedepot';
        //             }

        //             listing.has_variations = '0';
        //             listing.is_variant = '0';
        //             listing.item_name = title;
        //             listing.supplier_url = supplier_url;
        //             listing.supplier_id = supplier_id;
        //             listing.image = image;

        //             if (supplier !== '') {
        //               listing.supplier = supplier;
        //             }        

        //             global.knex('tbl_listings')
        //             .insert(listing)
        //             .catch(error => global.appLog.error(error));

        //             addedToDBCount++;
        //           }

        //           count++;

        //       },
        //       complete: async () => {
        //           console.log('Parsing finished', addedToDBCount, count);

        //           // if (listingsToImport.length > 0) {
        //           //   const listingsToInsertInDB = [];

        //           //   for (let i = 0; i < listingsToImport.length; i++) {
        //           //     const listing = {};
        //           //     listing.local_refactor_settings = JSON.stringify({
        //           //       refactor_percentage: 15,
        //           //       add_state_tax: 0,
        //           //       state_tax_percentage: 6,
        //           //       add_amazon_fee: 0,
        //           //       amazon_fee_percentage: 15,
        //           //       refactor_fixed_sum: 0,
        //           //       add_ebay_fee: 0,
        //           //       ebay_fee: 11,
        //           //       add_paypal_fee: 0,
        //           //       paypal_fee_percentage: 2.9,
        //           //       paypal_fixed_fee: 0.30,
        //           //       minimum_price: 0,
        //           //       maximum_price: 0,
        //           //     });

        //           //     const title = listingsToImport[i]['Title'];
        //           //     const supplier_url = listingsToImport[i]['Link'];
        //           //     const supplier_id = listingsToImport[i]['SKU'];
        //           //     const image = listingsToImport[i]['Image 1'];

        //           //     let supplier = '';

        //           //     if (await supplier_url.toLowerCase().includes('vidaxl')) {
        //           //       supplier = 'vidaxl';
        //           //     } else if (await supplier_url.toLowerCase().includes('amazon')) {
        //           //       supplier = 'amazon';
        //           //     } if (await supplier_url.toLowerCase().includes('walmart')) {
        //           //       supplier = 'walmart';
        //           //     } if (await supplier_url.toLowerCase().includes('homedepot')) {
        //           //       supplier = 'homedepot';
        //           //     }

        //           //     listing.has_variations = '0';
        //           //     listing.is_variant = '0';
        //           //     listing.item_name = title;
        //           //     listing.supplier_url = supplier_url;
        //           //     listing.supplier_id = supplier_id;
        //           //     listing.image = image;

        //           //     if (supplier !== '') {
        //           //       listing.supplier = supplier;
        //           //     }

        //           //     await listingsToInsertInDB.push(listing);
        //           //   }

        //           //   global.knex('tbl_listings')
        //           //   .insert(listingsToInsertInDB)
        //           //   .catch(error => global.appLog.error(error));

        //           // }

        //           this.sendListingsToFrontEnd();
        //           this.repricerHelper.mainWindow.webContents.send('parse-csv-file', addedToDBCount);
        //       }
        //     });
        //   }


        // });

        // TEST
        ipcMain.on('sync-listings-from-server', async () => {
          this.syncListingsFromServer();
        });

        // setTimeout(this.syncListingsFromServer, 15000);        
    }

  addListing = async data => {
    // const listingsCount = await this.countListings();

    // Check if the free version is used and if the max listings count has been reached
    // if (global.accountStatus !== '1' && listingsCount >= 100) {
    //   // Escape the special characters as they mess with displaying the logs
    //   const escapedLog = encodeURI(
    //     `${data.item_name} could not be added as you have reached your maximum listings capacity. Please upgrade your account in order to add more listings.`
    //   );
    //   global.log.error(escapedLog);
    //   return { status: 'error', type: 'reached-account-limit', listing: '' };
    // }

    // Query for a listing with the same store_id (selling_platform_id)
    const listingsInDB = await global.knex('tbl_listings')
    .where({ store_id: data.store_id.trim() })
    .then(rows => rows)
    .catch(error => {
      global.appLog.error(`${error} - in dalioHelper.addListing - line 512`);
    });
    
    // If such a listing or listings exist -> cannot reenter it as a variation
    if (listingsInDB.length > 0) {
      return { status: 'error', type: 'listing-already-exists', listing: '' }
    }

    global
    .knex('tbl_listings')
    .insert({
      item_name: data.item_name.trim(),
      is_variant: 0,
      has_variations: 0,
      store_id: data.store_id.trim(),
      supplier: data.supplier,
      supplier_id: data.supplier_id.trim(),
      supplier_url: data.supplier_url.trim(),
      store: data.store,
      store_url: data.store_url.trim(),
      use_global_refactor_settings: data.use_global_refactor_settings,
      use_minimum_price: data.use_minimum_price,
      use_maximum_price: data.use_maximum_price,
      local_refactor_settings: JSON.stringify(data.local_refactor_settings),
      last_repriced: 'Never'
    })
    .then(() => {
      // Escape the special characters as they mess with displaying the logs
      const escapedLog = encodeURI(`${data.item_name} listing has been successfully added.`);
      global.log.info(escapedLog);
      this.repricerHelper.handleStats('increase-total-listings', 1);
      return null;
    }).catch(err => global.appLog.error(err));

    // IF there are orders for the same product -> update the supplier info for it

    global
    .knex('tbl_orders')
    .where({ store_id: data.store_id })
    .update({
      supplier_url: data.supplier_url.trim(),
      supplier: data.supplier.trim(),
      supplier_id: data.supplier_id.trim(),
      matched_listing_store_id: data.store_id.trim(),
    }).catch(error => global.appLog.error(`${error} - inside DalioHelper.addListing - line 489`));

    Util.showWarnings(this.mainWindow);
    return { status: 'ok', type: '', listing: data };
  };

  deleteListing = async listing => {
    await global
    .knex('tbl_listings')
    .where({ id: listing.id })
    .del()
    .then(() => {
      this.repricerHelper.handleStats('decrease-total-listings', 1);
      if (listing.has_variations === '1') {
        global
          .knex('tbl_listings')
          .where({ parent_listing_id: listing.store_id })
          .del()
          .then(() =>
            this.repricerHelper.handleStats('decrease-total-listings', 1)
          )
          .catch(error => global.appLog.error(`${error} - inside dalioHelper.deleteListing - line 273`));
      }

      // If the listing we just deleted has a parent -> query the DB for more listings with same parent
      if (listing.is_variant === '1') {
        global
          .knex('tbl_listings')
          .where({ parent_listing_id: listing.parent_listing_id })
          .then(rows =>{
            // If there are none -> that means there are no more variations for this parent
            if (rows.length === 0) {
              global
                .knex('tbl_listings')
                .where({ store_id: listing.parent_listing_id })
                .update({ has_variations: '0' })
                .catch(error => global.appLog.error(`${error} - inside dalioHelper.deleteListing - line 273`));
            }

            return null;
          })
          .catch(error => global.appLog.error(`${error} - inside dalioHelper.deleteListing - line 293`));
      }

      // IF there are orders for the same product -> update the info, so it can no longer be ordered
      global
      .knex('tbl_orders')
      .where({ store_id: listing.store_id })
      .update({
        supplier_url: null,
        supplier: null,
        supplier_id: null,
        matched_listing_store_id: null,
      }).catch(error => global.appLog.error(`${error} - inside DalioHelper.addListingVariation - line 665`));

      return null;
    }).catch(error => global.log.error(`${error} - inside daliohelper.deleteListing - line 561`));

    Util.showWarnings(this.mainWindow);
  };

  updateListing = async data => {
    // The data can come with null values from the front end and cannot be trimmed, so it needs to be filtered
    const filteredData = data;

    if (filteredData.item_name !== null) {
      filteredData.item_name = data.item_name.trim();
    }

    if (filteredData.store_id !== null) {
      filteredData.store_id = data.store_id.trim();
    }

    if (filteredData.supplier_url !== null) {
      filteredData.supplier_url = data.supplier_url.trim();
    }

    if (filteredData.store_url !== null) {
      filteredData.store_url = data.store_url.trim();
    }

    if (filteredData.supplier_id !== null) {
      filteredData.supplier_id = data.supplier_id.trim();
    }

    await global
    .knex('tbl_listings')
    .where({ id: data.id })
    .update({
      item_name: filteredData.item_name,
      is_variant: filteredData.is_variant,
      has_variations: filteredData.has_variations,
      store_id: filteredData.store_id,
      supplier_url: filteredData.supplier_url,
      store: filteredData.store,
      store_url: filteredData.store_url,
      supplier: filteredData.supplier,
      supplier_id: filteredData.supplier_id,
      price: filteredData.price,
      refactor_percentage: filteredData.refactor_percentage,
      use_global_refactor_settings: filteredData.use_global_refactor_settings,
      use_minimum_price: filteredData.use_minimum_price,
      use_maximum_price: filteredData.use_maximum_price,
      local_refactor_settings: JSON.stringify(filteredData.local_refactor_settings),
    })
    .catch(error => global.appLog.error(`${error} - inside DalioHelper.updateListings - line 364`));

    // IF there are orders for the same product -> update the supplier info for it
    global
      .knex('tbl_orders')
      .where({ store_id: data.store_id })
      .update({
        supplier_url: filteredData.supplier_url,
        supplier: filteredData.supplier,
        supplier_id: filteredData.supplier_id,
        matched_listing_store_id: filteredData.store_id,
      })
      .catch(error => global.appLog.error(`${error} - inside DalioHelper.updateListings - line 578`));

    Util.showWarnings(this.mainWindow);

    return { status: 'ok', type: '' };
  };

  addListingVariation = async data => {
    // const listingsCount = await this.countListings();
    
    // Check if the free version is used and if the max listings count has been reached
    // if (global.accountStatus !== '1' && listingsCount >= 100) {
    //   // Escape the special characters as they mess with displaying the logs
    //   const escapedLog = encodeURI(
    //     `${data.item_name} could not be added as you have reached your maximum listings capacity. Please upgrade your account in order to add more listings.`
    //   );
    //   global.log.error(escapedLog);
    //   return { status: 'error', type: 'reached-account-limit', listing: '' };
    // }

    // Query for a listing with the same store_id (selling_platform_id)
    const listingsInDB = await global.knex('tbl_listings')
    .where({ store_id: data.store_id.trim() })
    .then(rows => rows)
    .catch(error => {
      global.appLog.error(`${error} - in dalioHelper.addListingVariation - line 512`);
    });
    
    // If such a listing or listings exist -> cannot reenter it as a variation
    if (listingsInDB.length > 0) {
      return { status: 'error', type: 'listing-already-exists', listing: '' }
    }

    await global
    .knex('tbl_listings')
    .insert({
      item_name: data.item_name.trim(),
      is_variant: data.is_variant,
      has_variations: data.has_variations,
      parent_listing_id: data.parent_listing_id.trim(),
      store_id: data.store_id.trim(),
      supplier: data.supplier,
      supplier_id: data.supplier_id.trim(),
      supplier_url: data.supplier_url.trim(),
      store: data.store,
      store_url: data.store_url.trim(),
      use_global_refactor_settings: data.use_global_refactor_settings,
      use_minimum_price: data.use_minimum_price,
      use_maximum_price: data.use_maximum_price,
      local_refactor_settings: JSON.stringify(data.local_refactor_settings),
      last_repriced: 'Never'
    })
    .then(async () => {
      const escapedLog = encodeURI(`${data.item_name} listing variation has been successfully added.`);
      global.log.info(escapedLog);
      global
        .knex('tbl_listings')
        .where({ store_id: data.parent_listing_id })
        .update({
          has_variations: '1'
        })
        .catch(err => global.appLog.error(err));

      this.repricerHelper.handleStats('increase-total-listings', 1);
      return null;
    })
    .catch(err => global.appLog.error(err));

    // IF there are orders for the same product -> update the supplier info for it
    global
    .knex('tbl_orders')
    .where({ store_id: data.store_id.trim() })
    .update({
      supplier_url: data.supplier_url.trim(),
      supplier: data.supplier,
      supplier_id: data.supplier_id.trim(),
      matched_listing_store_id: data.store_id.trim(),
    })
    .catch(error => global.appLog.error(`${error} - inside DalioHelper.addListingVariation - line 665`));

    Util.showWarnings(this.mainWindow);
    return { status: 'ok', type: '', listing: data };
  };

  // Helper function that returns the total listings count
  countListings = async () => {
    const number = await global.knex
      .select()
      .from('tbl_listings')
      .where({ is_deleted: '0' })
      .then(rows => rows.length)
      .catch(err => global.appLog.error(err));
    return number;
  };

  syncListingsFromServer = async () => {
    // 1. Pull the Dalio account row from the DB -> we need it to find out whether the user has logged in
    const accountRow = await global
      .knex('tbl_users')
      .where({ account: 'dalio' })
      .first()
      .then(row => row)
      .catch(err => global.appLog.error(`${err} - Listings.js line 368`));

    // 2. If the email is not null -> the user has logged in
    if (accountRow.email !== null && accountRow.email !== 'godmode@dalio.io') {
      // 2.1 Send a GET request to the server, which will return the listings
      const response = await axios.get(`https://dalio.io/app/api/listings?user_email=${accountRow.email}`, { auth: {
        username: 'dalioapp@gmail.com',
        password: 'dalioappQWE123!'
      }})
      .catch(error => global.appLog.error(`${error} - Listings.js - line 378`));
      
      if (response.data.data.listings !== undefined && response.data.data.listings.length > 0) {
        const { listings } = response.data.data;

        const listingsInDB = await global.knex('tbl_listings')
        .select()
        .then(rows => rows)
        .catch(error => global.appLog.error(`${error} - Listings.js - line 701`));

        for (let i = 0; i < listings.length; i++) {
          const listingObject = {};

          if (listings[i].item_name !== undefined && listings[i].item_name !== null) {
            listingObject.item_name = listings[i].item_name;
          }

          if (listings[i].has_variations !== undefined && listings[i].has_variations !== null) {
            listingObject.has_variations = listings[i].has_variations;
          }

          if (listings[i].is_variant !== undefined && listings[i].is_variant !== null) {
            listingObject.is_variant = listings[i].is_variant;
          }

          if (listings[i].parent_listing_id !== undefined && listings[i].parent_listing_id !== null) {
            listingObject.parent_listing_id = listings[i].parent_listing_id;
          }

          if (listings[i].store_id !== undefined && listings[i].store_id !== null) {
            listingObject.store_id = listings[i].store_id;
          }

          if (listings[i].store_url !== undefined && listings[i].store_url !== null) {
            listingObject.store_url = listings[i].store_url;
          }

          if (listings[i].store !== undefined && listings[i].store !== null) {
            listingObject.store = listings[i].store;
          }

          if (listings[i].supplier !== undefined && listings[i].supplier !== null) {
            listingObject.supplier = listings[i].supplier;
          } else if (listings[i].supplier_url !== undefined && listings[i].supplier_url !== null) {
            if (listings[i].supplier_url.includes('amazon.')) {
              listingObject.supplier = 'amazon';
            } else if (listings[i].supplier_url.includes('walmart.')) {
              listingObject.supplier = 'walmart';
            } else if (listings[i].supplier_url.includes('aliexpress.')) {
              listingObject.supplier = 'aliexpress';
            } else if (listings[i].supplier_url.includes('homedepot.')) {
              listingObject.supplier = 'homedepot';
            } else if (listings[i].supplier_url.includes('vidaxl.')) {
              listingObject.supplier = 'vidaxl';
            } 
          }

          if (listings[i].supplier_url !== undefined && listings[i].supplier_url !== null) {
            listingObject.supplier_url = listings[i].supplier_url;
          }

          if (listings[i].supplier_id !== undefined && listings[i].supplier_id !== null) {
            listingObject.supplier_id = listings[i].supplier_id;
          }

          if (listings[i].product_availability !== undefined && listings[i].product_availability !== null) {
            listingObject.product_availability = listings[i].product_availability;
          }

          if (listings[i].supplier_price !== undefined && listings[i].supplier_price !== null) {
            listingObject.new_price = listings[i].supplier_price;
          }

          if (listings[i].time_created !== undefined && listings[i].time_created !== null) {
            listingObject.created_at = listings[i].time_created;
          }

          let listingAlreadyInDB = false;

          if (listingsInDB.length > 0) {
            for (let l = 0; l < listingsInDB.length; l++) {
              if (listingsInDB[l].store_id === listingObject.store_id) {
                listingAlreadyInDB = true;
              }
            }
          }

          if (!listingAlreadyInDB) {
            await global.knex('tbl_listings')
            .insert(listingObject)
            .catch(error => global.appLog.error(error));
          }
        }
      }
    }
  }

  sendListingsToFrontEnd = async () => {
    // 1. Query all listings from the DB
    const listings = await global.knex
    .select()
    .from('tbl_listings')
    .where({ is_deleted: '0' })
    .then(rows => rows)
    .catch(error => global.appLog.error(`${error} Listings.js - ipcMain.on - request-listings`));

    // 2. Check if the account status is 0 or 2 (free or unpaid) and there are more than 100 listings
    if ((global.accountStatus === '0' || global.accountStatus === '2') && listings.length > 100) {
      // 3.1 Determine the index of the last free listing
      const boundaryListing = listings[99];

      // 3.2 Filter all listings
      const listingsToReturn = await listings.filter((listing) => {
        const listingCopy = listing;
        // 3.2.1 If the iterated listing is after the last free listing -> mark it as disabled (will not be repriced)
        if (listingCopy.id > boundaryListing.id) {
          listingCopy.disabled = true;
        }

        return listingCopy;
      });

      // 3.3 Return the listings and the warning status to the front end
      this.mainWindow.webContents.send('send-listings', listingsToReturn);
    } else {
      // 3. If it is a paid account -> filter the listings in the array to be sent to the front end
      if (listings.length > 0) {
        await listings.sort((a, b) => {
          if ((a.product_changed === 1 && b.product_changed === 0) || (a.store_id === null && a.has_variations !== '1' && b.store_id !== null) || (a.supplier_id === null && a.has_variations !== '1' && b.supplier_id !== null) || (a.store_url === null && a.has_variations !== '1' && b.store_url !== null) || (a.supplier_url === null && a.has_variations !== '1' && b.supplier_url !== null)) {
            return -1;
          } else if ((a.product_changed === 0 && b.product_changed === 1 && b.has_variations !== '1') || (a.store_id !== null && b.store_id === null && b.has_variations !== '1') || (a.supplier_id !== null && b.supplier_id === null && b.has_variations !== '1') || (a.store_url !== null && b.store_url === null && b.has_variations !== '1') || (a.supplier_url !== null && b.supplier_url === null && b.has_variations !== '1')) {              
            return 1;
          } 
          
          return 0;
        });
      }

      this.mainWindow.webContents.send('send-listings', listings);
    }

    // Use this hook to handle the 'Add first listing' of the onboarding process
    if (listings.length === 0) {
      await Util.handleOnboarding(this.mainWindow, {
        action: 'change-settings',
        settings: { add_first_listing: false }
      });
    } else {
      await Util.handleOnboarding(this.mainWindow, {
        action: 'change-settings',
        settings: { add_first_listing: true }
      });
    }

    Util.showWarnings(this.mainWindow);
  }
}

export default Listings;
