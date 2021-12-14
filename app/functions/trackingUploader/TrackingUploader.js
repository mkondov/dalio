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
/* eslint camelcase: 0 */

import fs from 'fs';
import { ipcMain } from 'electron';
import { google } from 'googleapis';
import cheerio from 'cheerio';

const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth')();

puppeteer.use(pluginStealth);

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

const CREDENTIALS_PATH = 'app/credentials/credentials.json';

class TrackingUploader {

  constructor () {
    ipcMain.on('gmailOAuth', async () => {
      this.gmailOAuth();
    });
  }

  gmailOAuth = () => {
    // Load client secrets from a local file.
    fs.readFile(CREDENTIALS_PATH, (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      // Authorize a client with credentials, then call the Gmail API.
      this.authorize(JSON.parse(content), this.listEmails);
    });
  }
  
  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */

    authorize = (credentials, callback) => {
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
    
        // Check if we have previously stored a token.
        fs.readFile(global.gmailTokenPath, (err, token) => {
          if (err) return this.getNewToken(oAuth2Client, callback);
          oAuth2Client.setCredentials(JSON.parse(token));
          callback(oAuth2Client);
        });
    }
  
  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback for the authorized client.
   */

  getNewToken = async (oAuth2Client, callback) => {
    const authUrl = await oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    });

    const code = await this.authenticateInBrowser(authUrl);

    // This will provide an object with the access_token and refresh_token.
    // Save these somewhere safe so they can be used at a later time.
    const { tokens } = await oAuth2Client.getToken(code);
    await oAuth2Client.setCredentials(tokens);

    // Store the token to disk for later program executions
    fs.writeFile(global.gmailTokenPath, JSON.stringify(tokens), (err) => {
    if (err) return console.error(err);
    });
  }
  
   /**
   * Lists the labels in the user's account.
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
    listEmails = auth => {
        const gmail = google.gmail({version: 'v1', auth});
        gmail.users.messages.list({
          userId: 'me',
          labelIds: ['INBOX'],	
          }, (err, res) => {
          if (err) return console.log('The API returned an error: ', err);

          console.log(res.data.messages.length);

          for (let i = 0; i < res.data.messages.length; i++) {
            gmail.users.messages.get({
              id: res.data.messages[i].id,
              userId: 'me',
              // format: 'raw'
            }).then(res => {

              // 1. Check the headers for a specific email address (etc. @amazon.co.uk)

              for (const header of res.data.payload.headers) {
                if (header.name === 'From') {
                  console.log(header.value);
                  if (header.value.includes('trackinguploader@gmail.com')) {
                    console.log('This is an amazon email');
                    for (const part of res.data.payload.parts) {
                      // console.log(part);
                      console.log('part -------------------------------------------');
                      // console.log(Buffer.from(part.body.data, 'base64').toString('ascii'));

                      const asciiBodyPart = Buffer.from(part.body.data, 'base64').toString('ascii');
                      const $ = cheerio.load(asciiBodyPart);
                      console.log($('span'));
                      // if ($('span').includes('Tracking Number')) {

                      // }
                      // console.log($('a').attr('href'));

                    }
                  }
                }
              }
              // 2. Parse the payload parts and look for the info

              // 3. Get a tracking code if present and add it to the DB

              // console.log(res.data.payload);
              // console.log('body', res.data.payload.body);
              // console.log('parts', res.data.payload.parts);

              // for (const part of res.data.payload.parts) {
              //   // console.log(part);
              //   console.log('part -------------------------------------------');
              //   console.log(Buffer.from(part.body.data, 'base64').toString('ascii'))
              // }
              // const messageRawToASCII = res.data.raw;
              // const decodedData = Buffer.from(messageRawToASCII, 'base64').toString('ascii');
              // console.log(decodedData);
              return null;
            })
            .catch(err => {
              console.log('Error when getting a message', err);
            });
          }

        });
    }

    authenticateInBrowser = async authUrl => {
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: global.headless,
          executablePath: getChromiumExecPath(),
          slowMo: 100,
          devtools: false,
          defaultViewport: null,
          args: [
            '--disable-webgl'
          ],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setDefaultNavigationTimeout(0);
        await page.setDefaultTimeout(0);

        if (global.proxyUsername !== '' && global.proxyPassword !== '') {
          await page.authenticate({ username: global.proxyUsername, password: global.proxyPassword });
        }

        await page.goto(authUrl);

        const approvalRequest = await page.waitForRequest(request => request.url().includes('https://accounts.google.com/o/oauth2/approval/v2'));

        // Extract the get query params
        const consentUrl = await approvalRequest.url().substring(approvalRequest.url().indexOf('?') + 1);

        const queryParameters = new URLSearchParams(consentUrl);

        await browser.close();
        return queryParameters.get('approvalCode');
      } catch (error) {
        global.appLog.error(`${error} - inside TrackingUploader.authenticateInBrowser - line 171`);
        browser.close();
      }
    }
}

const getChromiumExecPath = () => {
  const path = puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
  return path;
};

export default TrackingUploader;
