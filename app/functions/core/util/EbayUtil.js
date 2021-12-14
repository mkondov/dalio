/* eslint no-plusplus: 0 */
/* eslint no-param-reassign: 0 */
/* eslint no-undef: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint camelcase: 0 */

class EbayUtil {
    static loginIfNecessary = async (page, marketplace) => {
        await page.waitFor(5000);
        // Check for the presence of the 'Sign in' button in the top bar
        // const goToLogin = await page.$('#gh-ug a');
      
        // // If present -> click it so we can get to the login page
        // if (goToLogin !== null) {
        //   await goToLogin.click();
        //   await page.waitFor(3000);
        // }

        const credentials = {};
        let marketplace_account;
    
        if (marketplace === 'US') {
          marketplace_account = 'ebay_us';
        } else if (marketplace === 'UK') {
          marketplace_account = 'ebay_uk';
        } else if (marketplace === 'DE') {
          marketplace_account = 'ebay_de';
        } else if (marketplace === 'CA') {
          marketplace_account = 'ebay_ca';
        } 
    
        // Run a DB query that gets the required 'Ebay' email and password and assign it to the 'credentials' object
        await global
          .knex('tbl_users')
          .where({ account: marketplace_account })
          .first()
          .then(row => {
            credentials.userid = row.email;
            credentials.password = row.password;
            return null;
          }).catch(error => global.appLog.error(`${error} - inside ebay.loginIfNecessary - line 1567`));

        // Check if the login form is on the page
        // const loginForm = await page.$(`#signinContainer`);
        // const loginFormAlternative = await page.$('#signin-form');  

        const loginForm = await page.evaluate(() => document.querySelector('#signinContainer'));
        const loginFormAlternative = await page.evaluate(() => document.querySelector('#signin-form'));

        // console.log('login form', loginForm);

        // console.log('login form alternative', loginFormAlternative);
        // If yes
        if (loginForm !== null) {
          
          // Type the username in the input field with a delay as if it was a human
          await page.type('input#userid', credentials.userid.toString(), { delay: 50 });
      
          // This will need to be randomized as to resemble human actions
          await page.waitFor(1000);
      
          await page.type('input#pass', credentials.password.toString(), { delay: 50 });
      
          // This will need to be randomized as to resemble human actions
          await page.waitFor(2000);
      
          await page.click('button#sgnBt');
      
          // Wait for the reload to completely finish
          // await page.waitForNavigation({ waitUntil: 'networkidle0' });
          await page.waitFor(5000);
          
          // resolve a captcha if it appears 
          await page.solveRecaptchas();

          await page.waitFor(10000);
       
          const phoneConfirmMaybeLater = await page.$('#rmdLtr');
          if (phoneConfirmMaybeLater !== null) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 180000 }),
              phoneConfirmMaybeLater.click()
            ]);
          }
      
          // Wait for the 'Hello `username` on ebay top bar
          await page.waitForSelector('#gh-eb-u', { timeout: 360000 });
          // Hover over the 'Hello `username` on ebay top bar so that the sign out button can appear
          await page.hover('#gh-top ul#gh-topl #gh-eb-u');
          // Here we know that the user has logged in - #gh-uo-a is the logout button
          await page.waitForSelector('#gh-uo a');
        } else if (loginFormAlternative !== null) {
          await page.type('input#pass', credentials.password.toString(), { delay: 50 });
      
          // This will need to be randomized as to resemble human actions
          await page.waitFor(2000);
      
          await page.click('button#sgnBt');
      
          // Wait for the reload to completely finish
          // await page.waitForNavigation({ waitUntil: 'networkidle0' });
          await page.waitFor(5000);
          
          // resolve a captcha if it appears 
          await page.solveRecaptchas();
          await page.waitFor(10000);
       
          const phoneConfirmMaybeLater = await page.$('#rmdLtr');
          if (phoneConfirmMaybeLater !== null) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 180000 }),
              phoneConfirmMaybeLater.click()
            ]);
          }
      
          // Wait for the 'Hello `username` on ebay top bar
          await page.waitForSelector('#gh-eb-u', { timeout: 360000 });
          // Hover over the 'Hello `username` on ebay top bar so that the sign out button can appear
          await page.hover('#gh-top ul#gh-topl #gh-eb-u');
          // Here we know that the user has logged in - #gh-uo-a is the logout button
          await page.waitForSelector('#gh-uo a');
        }
    }
    
    static loginIfNecessaryBulkEditPage = async (page, marketplace) => {
      await page.waitFor(5000);
      // Check for the presence of the 'Sign in' button in the top bar
      // const goToLogin = await page.$('#gh-ug a');
    
      // // If present -> click it so we can get to the login page
      // if (goToLogin !== null) {
      //   await goToLogin.click();
      //   await page.waitFor(3000);
      // }

      const credentials = {};
      let marketplace_account;
  
      if (marketplace === 'US') {
        marketplace_account = 'ebay_us';
      } else if (marketplace === 'UK') {
        marketplace_account = 'ebay_uk';
      } else if (marketplace === 'DE') {
        marketplace_account = 'ebay_de';
      } else if (marketplace === 'CA') {
        marketplace_account = 'ebay_ca';
      } 
  
      // Run a DB query that gets the required 'Ebay' email and password and assign it to the 'credentials' object
      await global
        .knex('tbl_users')
        .where({ account: marketplace_account })
        .first()
        .then(row => {
          credentials.userid = row.email;
          credentials.password = row.password;
          return null;
        }).catch(error => global.appLog.error(`${error} - inside ebay.loginIfNecessary - line 1567`));

      // Check if the login form is on the page
      // const loginForm = await page.$(`#signinContainer`);
      // const loginFormAlternative = await page.$('#signin-form');  

      const loginForm = await page.evaluate(() => document.querySelector('#signinContainer'));
      const loginFormAlternative = await page.evaluate(() => document.querySelector('#signin-form'));

      // If yes
      if (loginForm !== null) {
        
        // Type the username in the input field with a delay as if it was a human
        await page.type('input#userid', credentials.userid.toString(), { delay: 50 });
    
        // This will need to be randomized as to resemble human actions
        await page.waitFor(1000);
    
        await page.type('input#pass', credentials.password.toString(), { delay: 50 });
    
        // This will need to be randomized as to resemble human actions
        await page.waitFor(2000);
    
        await page.click('button#sgnBt');
    
        // Wait for the reload to completely finish
        // await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitFor(5000);
        
        // resolve a captcha if it appears 
        await page.solveRecaptchas();

        await page.waitFor(10000);
       
        const phoneConfirmMaybeLater = await page.$('#rmdLtr');
        if (phoneConfirmMaybeLater !== null) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 180000 }),
            phoneConfirmMaybeLater.click()
          ]);
        }
    
        // Wait for the 'Hello `username` on ebay top bar
        await page.waitForSelector('#tbl_dtModuleContainer', { timeout: 180000 });
      } else if (loginFormAlternative !== null) {
        await page.type('input#pass', credentials.password.toString(), { delay: 50 });
    
        // This will need to be randomized as to resemble human actions
        await page.waitFor(2000);
    
        await page.click('button#sgnBt');
    
        // Wait for the reload to completely finish
        // await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitFor(5000);
        
        // resolve a captcha if it appears 
        await page.solveRecaptchas();

        await page.waitFor(10000);
       
        const phoneConfirmMaybeLater = await page.$('#rmdLtr');
        if (phoneConfirmMaybeLater !== null) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 180000 }),
            phoneConfirmMaybeLater.click()
          ]);
        }
  
        await page.waitForSelector('#tbl_dtModuleContainer', { timeout: 180000 });
      }
    }
 }
 
 export default EbayUtil;