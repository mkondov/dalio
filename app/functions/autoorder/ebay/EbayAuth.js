/* eslint no-shadow: 0 */

import fs from 'fs';

class EbayAuth {
    static async canLogIn(returnCookies = false, country = 'ALL') {
     if (country === 'ALL') {
       // Check if the bot can login inside all Ebay marketplaces
       const cookieFiles = await this.checkIfCookieFileExists().then(async cookieFiles => {
           const marketplaces = {
             US: false,
             UK: false,
             DE: false,
             CA: false
           };
           // If there is a US cookie file
           if (cookieFiles.US) {
             // Check if the return of the cookie file is requested
             if (returnCookies) {
               // If yes, read US cookie file and return the content of it
               const fileContent = await this.readCookieFile(true, 'US');
               marketplaces.US = fileContent;
             } else {
               // If not, just read US cookie file and make sure there is a session id
               const hasSessionId = await this.readCookieFile(false, 'US');
               marketplaces.US = hasSessionId;
             }
           }
 
           // If there is a UK cookie file
           if (cookieFiles.UK) {
             // Check if the return of the cookie file is requested
             if (returnCookies) {
               // If yes, read UK cookie file and return the content of it
               const fileContent = await this.readCookieFile(true, 'UK');
               marketplaces.UK = fileContent;
             } else {
               // If not, just read UK cookie file and make sure there is a session id
               const hasSessionId = await this.readCookieFile(false, 'UK');
               marketplaces.UK = hasSessionId;
             }
           }
 
           // If there is a DE cookie file
           if (cookieFiles.DE) {
             // Check if the return of the cookie file is requested
             if (returnCookies) {
               // If yes, read DE cookie file and return the content of it
               const fileContent = await this.readCookieFile(true, 'DE');
               marketplaces.DE = fileContent;
             } else {
               // If not, just read DE cookie file and make sure there is a session id
               const hasSessionId = await this.readCookieFile(false, 'DE');
               marketplaces.DE = hasSessionId;
             }
           }
 
           // If there is a CA cookie file
           if (cookieFiles.CA) {
             // Check if the return of the cookie file is requested
             if (returnCookies) {
               // If yes, read DE cookie file and return the content of it
               const fileContent = await this.readCookieFile(true, 'CA');
               marketplaces.CA = fileContent;
             } else {
               // If not, just read DE cookie file and make sure there is a session id
               const hasSessionId = await this.readCookieFile(false, 'CA');
               marketplaces.CA = hasSessionId;
             }
           }

           // If there is a IT cookie file
           if (cookieFiles.IT) {
            // Check if the return of the cookie file is requested
            if (returnCookies) {
              // If yes, read DE cookie file and return the content of it
              const fileContent = await this.readCookieFile(true, 'IT');
              marketplaces.IT = fileContent;
            } else {
              // If not, just read DE cookie file and make sure there is a session id
              const hasSessionId = await this.readCookieFile(false, 'IT');
              marketplaces.IT = hasSessionId;
            }
          }
 
           return marketplaces;
         }
       );
 
       return cookieFiles;
     }
 
     // If it is a specific country whose cookie file is requested -> check for the existence of all of the,
     const cookieFile = await this.checkIfCookieFileExists().then(async cookieFiles => {
         // If the cookie file of the specified country exists
         if (cookieFiles[country]) {
           // Check if the return of the cookie file is requested
           if (returnCookies) {
             // If yes, read the country`s cookie file and return the content of it
             const fileContent = await this.readCookieFile(true, country);
             return fileContent;
           }
 
           // If not, just read country`s cookie file and make sure there is a session id
           const hasSessionId = await this.readCookieFile(false, country);
           return hasSessionId;
         }
         return false;
       }
     );
 
     return cookieFile;
    };

    static async checkIfCookieFileExists() {
      const US = await new Promise((resolve, reject) => fs.access(global.ebayUSCookiePath, fs.F_OK, err => {
          if (err) {
            if (err && err.code === 'ENOENT') {
              resolve(false);
            } else {
              global.appLog.info(err);
              reject(err);
            }
          } else {
            resolve(true);
          }
      }));

      const UK = await new Promise((resolve, reject) => fs.access(global.ebayUKCookiePath, fs.F_OK, err => {
          if (err) {
            if (err && err.code === 'ENOENT') {
              resolve(false);
            } else {
              global.appLog.info(err);
              reject(err);
            }
          } else {
            resolve(true);
          }
      }));

      const DE = await new Promise((resolve, reject) => fs.access(global.ebayDECookiePath, fs.F_OK, err => {
          if (err) {
            if (err && err.code === 'ENOENT') {
              resolve(false);
            } else {
              global.appLog.info(err);
              reject(err);
            }
          } else {
            resolve(true);
          }
      }));

      const CA = await new Promise((resolve, reject) => fs.access(global.ebayCACookiePath, fs.F_OK, err => {
          if (err) {
            if (err && err.code === 'ENOENT') {
              resolve(false);
            } else {
              global.appLog.info(err);
              reject(err);
            }
          } else {
            resolve(true);
          }
      }));
    
      return { US, UK, DE, CA };
   };

   static async readCookieFile(returnCookies = false, country = 'US') {
    // Query the file content of the specified country`s cookie file
    const fileContent = await new Promise((resolve, reject) => {
      // Default cookie path is US
      let cookieFilePath = global.ebayUSCookiePath;

      if (country === 'UK') {
        // If UK is specified, change to it
        cookieFilePath = global.ebayUKCookiePath;
      } else if (country === 'DE') {
        // If DE is specified, change to it
        cookieFilePath = global.ebayDECookiePath;
      } else if (country === 'CA') {
        // If CA is specified, change to it
        cookieFilePath = global.ebayCACookiePath;
      }

      // This function reads and returns the content of the cookie file -> it is parsed as JSON
      return fs.readFile(cookieFilePath, { encoding: 'utf8' }, (err, data) => {
          if (err) {
            return reject(err);
          }

          return resolve(JSON.parse(data));
        }
      );
    });

    // If returnCookies parameter is true -> return the whole content of the file
    if (returnCookies) {
      return fileContent;
    }

    // If returnCookies parameter is false -> just check if the cookie file contains a session id -> return it
    let hasSessionId = false;

    await fileContent.forEach(item => {
      if (item.name === 'npii') {
        hasSessionId = true;
      }
    });

    return hasSessionId;
   };

    static async writeCookieFile(page) {
        const pageURL = page.url();

        if (pageURL.includes('ebay.com')) {
        global.ebayCookies.US = await page.cookies(
            'https://ebay.com',
            'https://www.ebay.com',
            'https://signin.ebay.com',
            'https://pages.ebay.com',
            'https://rover.ebay.com',
            'https://gha.ebay.com',
            'https://ocsrest.ebay.com',
            'https://svcs.ebay.com',
            'https://pulsar.ebay.com',
        );

        if (global.ebayCookies.US.length > 0) {
            fs.writeFileSync(
            global.ebayUSCookiePath,
            JSON.stringify(global.ebayCookies.US),
            'utf-8'
            );
        }
        }
        
        if (pageURL.includes('ebay.co.uk')) {
        global.ebayCookies.UK = await page.cookies(
            'https://ebay.co.uk',
            'https://www.ebay.co.uk',
            'https://signin.ebay.co.uk',
            'https://gha.ebay.co.uk',
        );

        if (global.ebayCookies.UK.length > 0) {
            fs.writeFileSync(
            global.ebayUKCookiePath,
            JSON.stringify(global.ebayCookies.UK),
            'utf-8'
            );
        }
        }

        if (pageURL.includes('ebay.de')) {
        global.ebayCookies.DE = await page.cookies(
            'https://ebay.de',
            'https://www.ebay.de',
            'https://signin.ebay.de',
            'https://gha.ebay.de',
        );

        if (global.ebayCookies.DE.length > 0) {
            fs.writeFileSync(
            global.ebayDECookiePath,
            JSON.stringify(global.ebayCookies.DE),
            'utf-8'
            );
        }
        }

        if (pageURL.includes('ebay.ca')) {
        global.ebayCookies.CA = await page.cookies(
            'https://ebay.ca',
            'https://www.ebay.ca',
            'https://signin.ebay.ca',
            'https://gha.ebay.ca',
        );

        if (global.ebayCookies.CA.length > 0) {
            fs.writeFileSync(
            global.ebayCACookiePath,
            JSON.stringify(global.ebayCookies.CA),
            'utf-8'
            );
        }
        }

        if (pageURL.includes('ebay.it')) {
          global.ebayCookies.IT = await page.cookies(
              'https://ebay.it',
              'https://www.ebay.it',
              'https://signin.ebay.it',
              'https://gha.ebay.it',
          );

          if (global.ebayCookies.IT.length > 0) {
              fs.writeFileSync(
              global.ebayITCookiePath,
              JSON.stringify(global.ebayCookies.IT),
              'utf-8'
              );
          }
        }

    };

    static async deleteCookieFile(country = 'US') {
        let cookieFilePath = global.ebayUSCookiePath;

        if (country === 'UK') {
        cookieFilePath = global.ebayUKCookiePath;
        } else if (country === 'DE') {
        cookieFilePath = global.ebayDECookiePath;
        } else if (country === 'CA') {
        cookieFilePath = global.ebayCACookiePath;
        }

        try {
        fs.unlinkSync(cookieFilePath, error => {
            if (error) {
            global.appLog.error(`Error while deleting Ebay ${country} cookie file - ${error}`);
            return false;
            }
            return true;
        });
        } catch (error) {
        global.appLog.error(`${error} - inside ebay.deleteCookie - line 371`);
        }
    };
}

export default EbayAuth;