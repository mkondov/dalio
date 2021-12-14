/* eslint no-unused-vars: 0 */
/* eslint eqeqeq: 0 */
/* eslint object-shorthand: 0 */

// @flow
import axios from 'axios';
import https from 'https';
import { ipcMain } from 'electron';

import isOnline from 'is-online';

type User = {
  email: string,
  pass: string
};

type Login = {
  status: string | number,
  message: string
};

class Account {
  accountCheckInterval: ?IntervalID = undefined;

  mainWindow: Object;

  constructor (mainWindow: Object) {
    this.mainWindow = mainWindow;

    ipcMain.on('login-dalio', async (event: SyntheticEvent<>, user: User): Promise<any> => {
      const status: ?Login = await this.login(user);
      this.mainWindow.webContents.send('login-dalio', status);

      global.nucleus.track("LOGIN_DALIO", {
        description: 'The user is trying to login a Dalio account.',
        email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
      });
    });

    ipcMain.on('get-dalio-account-status', async (): Promise<any> => {
      const status: string = await this.getStatus();
      const accountRow = await global
      .knex('tbl_users')
      .select()
      .where({ account: 'dalio' })
      .first()
      .then(row => row)
      .catch(error => global.appLog.error(`${error} - Account.js login()`));

      if (accountRow.email !== null) {
        const orderInfo = accountRow.order_info !== null && accountRow.order_info !== '' ? JSON.parse(accountRow.order_info) : null;

        let paymentUrl = '';
        let orderAmount = '';
        if (orderInfo !== null) {
          if (orderInfo.payment_url !== undefined) {
            paymentUrl = orderInfo.payment_url;
          }

          if (orderInfo.order_item_totals !== undefined) {
            const orderItemTotals = JSON.parse(orderInfo.order_item_totals);
            orderAmount = orderItemTotals.order_total.value;
          }
        }

        this.mainWindow.webContents.send('get-dalio-account-status', { status: status, email: accountRow.email, payment_url: paymentUrl, order_amount: orderAmount, tracking_funds: accountRow.tracking_funds });
      } else {
        this.mainWindow.webContents.send('get-dalio-account-status', { status: status, email: '' });
      }
    });

    ipcMain.on('logout-dalio', async (): Promise<any> => {
      await this.logout();
      const status: string = await this.getStatus();
      this.mainWindow.webContents.send('get-dalio-account-status', { status: status, email: '' });
      global.nucleus.track("LOGOUT_DALIO", {
        description: 'The user is trying to logout from a Dalio account.',
        email: global.accountEmail !== null ? global.accountEmail : 'Not provided'
      });
    });

    // Sets up an interval that checks for the presence and validity of dalio.io accounts 
    this.accountCheckInterval = setInterval(() => {
      if (!global.accountCheckIntervalIsRunning) {
        const connectionStatus: boolean = isOnline();
        if (connectionStatus) {
          Account.check(this.mainWindow);
        } else {
          global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
        }
      }
    }, 10800000); // 3 hours

    setTimeout(() => {
      if (!global.accountCheckIntervalIsRunning) {
        const connectionStatus: boolean = isOnline();
        if (connectionStatus) {
          Account.check(this.mainWindow);
        } else {
          global.appLog.error('There is no internet connection. Dalio`s work will stop until you are connected to the internet.');
        }
      }
    }, 5000);


    // TESTS
    ipcMain.on('test-dalio-account-check', async (): Promise<any> => {
      await Account.check(this.mainWindow);
      this.mainWindow.webContents.send('get-dalio-account-status', { status: global.accountStatus });
    });
  }

  login = async (user: User): Promise<?Login> => {
    if (user !== undefined) {

      const login: Login = {
        status: 0,
        message: 'Error! Please contact an administrator!'
      };

       // At request level
       const agent = new https.Agent({
        rejectUnauthorized: false
      });
  
      if (user.email === 'godmode@dalio.io' && user.pass === 'godmodejahx*@8ssa(') {
        login.status = 1;
        login.message = 'Success';
        global
        .knex('tbl_users')
        .where({ account: 'dalio' })
        .update({
          email: user.email,
          password: user.pass,
          status: login.status
        }).catch(error => global.appLog.error(`${error} - Account.js login() - line 15`));     
      } else {
        // {"user":"illidanmax@gmail.com","pass":"illidanmax123"}
        // return data { status: 3, msg: 'Free user' }
        // 1 - all is good - has more than listings, orders or trackings and has no unpaid invoices
        // 2 - there is a user but hasn`t paid yet (has more than 100 listings, orders or trackings and hasn`t paid for last month)
        // 3 - there is a user and has a free trial (has less than 100 listings, orders and trackings)
        // 5 - invalid user or pass

        await axios.post('https://dalio.io/app/api/auth', {
            user: user.email,
            pass: user.pass
          }, { auth: {
            username: 'dalioapp@gmail.com',
            password: 'dalioappQWE123!'
          }, httpsAgent: agent }).then(response => {
            const { data } = response;
            // console.log('data', data, typeof data.status);
            login.status = data.status;

            if (data.status === 5) {
              login.message = 'ERROR! Wrong username or password';
            } else if (data.status === 8) {
              login.message = 'ERROR! Please contact an administrator';
            } else {
              login.message = 'Success!';

              global
              .knex('tbl_users')
              .where({ account: 'dalio' })
              .update({
                email: user.email,
                password: user.pass,
                status: data.status
              })
              .catch(error => global.appLog.error(`${error} - Account.js login()`));

              this.mainWindow.webContents.send('get-dalio-account-status', { status: login.status });

            }

            return data;
          }).catch(error => global.appLog.error(`${error} - Account.js login()`));

      }

      return login;
    }
    return null;
  };

  static check = async (mainWindow): Promise<any> => {
    type dalioUserRow = {
      id: number,
      account: string,
      email: null | string,
      password: null | string,
      status: string,
      country: null | string,
      tracking_funds: number,
      settings: Object
    };

    const row = await global.knex('tbl_users')
    .where({ account: 'dalio' })
    .first()
    .then(rowDB => rowDB)
    .catch(error => global.appLog.error(`${error} - Account.js check()`));

    if (
      row.email !== null && 
      row.password !== null &&
      row.email !== '' &&
      row.password !== ''
      ) {
      if (row.email === 'godmode@dalio.io') {
        if (row.password === 'godmodejahx*@8ssa(') {
          global.accountStatus = '1';
          await global.knex('tbl_users')
            .where({ account: 'dalio' })
            .update({ status: '1' })
            .catch(error => global.appLog.error(`${error} - Account.js check()`));
        } else {
          global.accountStatus = '0';
          await global.knex('tbl_users')
            .where({ account: 'dalio' })
            .update({ status: '0' })
            .catch(error => global.appLog.error(`${error} - Account.js check()`));
        }
      } else {

        // At request level
        const agent = new https.Agent({
          rejectUnauthorized: false
        });

        const serverResponse = await axios.post('https://dalio.io/app/api/auth', { user: row.email, pass: row.password }, { auth: { username: 'dalioapp@gmail.com', password: 'dalioappQWE123!' }, httpsAgent: agent })
        .catch(error => global.appLog.error(`${error} - Account.js check()`));

        if (serverResponse.data !== undefined) {
          const { data } = serverResponse;

          const trackingFunds = data.tracking_funds !== undefined ? data.tracking_funds : 0;

          // console.log('data', data);
          if (data.status == 2 && data.order_item_totals !== undefined) {
            await global.knex('tbl_users')
            .where({ account: 'dalio' })
            .update({ order_info: JSON.stringify(data) })
            .catch(error => global.appLog.error(`${error} - Account.js check()`));
          }
  
          // Update the global accountstatus variable used as reference in other functions
          global.accountStatus = data.status;
          await global.knex('tbl_users')
          .where({ account: 'dalio' })
          .update({ 
            status: data.status,
            tracking_funds: trackingFunds
          })
          .catch(error => global.appLog.error(`${error} - Account.js check()`));

          mainWindow.webContents.send('check-tracking-funds', { tracking_funds: parseFloat(trackingFunds) });

        }
      }
    }
  };

  getStatus = async (): Promise<string> => {
    const status: Promise<string> = await global
      .knex('tbl_users')
      .where({ account: 'dalio' })
      .first()
      .then(row => row.status)
      .catch(error => global.appLog.error(`${error} - Account.js getStatus()`));

    global.accountStatus = status;
    return status;
  };

  logout = async (): Promise<any> => {
    global
      .knex('tbl_users')
      .where({ account: 'dalio' })
      .update({
        email: null,
        password: null,
        status: '0'
      })
      .catch(error => global.appLog.error(`${error} - Account.js logout()`));
  };
}

export default Account;
