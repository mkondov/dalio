/* eslint no-plusplus: 0 */
/* eslint no-param-reassign: 0 */
/* eslint no-undef: 0 */
/* eslint prefer-destructuring: 0 */
// @flow

import axios from 'axios';
import https from 'https';

class ServerCommunications {
  static sendListings = async (type = 'update', listingsArray) => {

    if (global.accountEmail !== undefined && global.accountEmail !== 'godmode@dalio.io') {
      let dataObject = {};

      if (type === 'update') {
        dataObject = JSON.stringify({
          user_email: global.accountEmail,
          listings: {
            update: listingsArray,
            delete: []
          }
        });
      } else if (type === 'delete') {
        dataObject = JSON.stringify({
          user_email: global.accountEmail,
          listings: {
            update: [],
            delete: listingsArray
          }
        });
      }

      const agent = new https.Agent({
        rejectUnauthorized: false
      });

      axios.post('https://dalio.io/app/api/listings', dataObject, { auth: {
        username: 'dalioapp@gmail.com',
        password: 'dalioappQWE123!'
      }, httpsAgent: agent })
      .catch(error => global.appLog.error(`${error} - DalioHelper.sendListingsToServer() line 605`));
    }
  }

  static sendOrders = async (type = 'update', ordersArray) => {

    if (global.accountEmail !== undefined && global.accountEmail !== 'godmode@dalio.io') {
      let dataObject;

      if (type === 'update') {
        dataObject = JSON.stringify({
          user_email: global.accountEmail,
          orders: {
            update: ordersArray,
            delete: []
          }
        });
      } else if (type === 'delete') {
        dataObject = JSON.stringify({
          user_email: global.accountEmail,
          orders: {
            update: [],
            delete: ordersArray
          }
        });
      }

      const agent = new https.Agent({
        rejectUnauthorized: false
      });

      // global.appLog.error(dataObject);

      axios.post('https://dalio.io/app/api/orders', dataObject, { auth: {
        username: 'dalioapp@gmail.com',
        password: 'dalioappQWE123!'
      }, httpsAgent: agent })
      .then((res) => console.log('send orders to server response', res.status, res.statusText))
      .catch(error => global.appLog.error(`${error} - DalioHelper.sendOrdersToServer() line 70`));
    }
  }

  static decrementFunds = async (quantity = 1) => {
    const dataObject = JSON.stringify({
      user_email: global.accountEmail,
      orders: {
        update: [],
        delete: [],
        decrement_funds: quantity * 0.04
      }
    });

    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    // global.appLog.error(dataObject);

    const trackingFundsResult = await axios.post('https://dalio.io/app/api/orders', dataObject, { auth: {
      username: 'dalioapp@gmail.com',
      password: 'dalioappQWE123!'
    }, httpsAgent: agent })
    .catch(error => global.appLog.error(`${error} - DalioHelper.decrementFunds() line 104`));

    console.log('decrease funds response', trackingFundsResult.status, trackingFundsResult.tracking_funds);

    if (trackingFundsResult.tracking_funds !== undefined) {
      global.knex('tbl_users')
      .where({ account: 'dalio' })
      .update({ tracking_funds: trackingFundsResult.tracking_funds })
      .catch(e => global.appLog.error(`${e} - ServerCommunications.decrementFunds - line 111`));

      return trackingFundsResult.tracking_funds;
    }

    return null;
  }
}

export default ServerCommunications;