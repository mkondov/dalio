// @flow

import path from 'path';
import fs from 'fs-extra';
import nodemailer from 'nodemailer';
import archiver from 'archiver';
import extract from 'extract-zip';
import moment from 'moment';
import { app, dialog } from 'electron';

import * as key from './dalio-key.json';

class SendUserData {

    static send = async (): Promise<any> => {
        const EMAIL_ADDRESS: string = 'martin.kondov@gmail.com';
        const RECEIVER_EMAIL_ADDRESS: string = 'dalioapp@gmail.com';

        const fileName = this.archiveUserData();

        const transporter = await nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                user: EMAIL_ADDRESS,
                serviceClient: key.client_id,
                privateKey: key.private_key
            }
        });

        try {
            await transporter.verify();
        } catch (error) {
            const log = `${error} in - SendUserData.js - send() - Could not send user data.`
            await global.appLog.error(error);
            
            const errorObject = {
                status: 'error',
                message: log
            };

            throw errorObject.message;
        }

        const emailHtml: string = `<p>The user <br>${process.env.USERNAME}@${process.env.COMPUTERNAME}</br> has sent error logs.`;

        const mailOptions = {
            from: EMAIL_ADDRESS,
            to: RECEIVER_EMAIL_ADDRESS, 
            subject: 'Error logs', 
            html: emailHtml,
            attachments: [
                {   
                    filename: fileName,
                    path: `${global.dalioAppDataPathDir}/backups/${fileName}` // stream this file
                },
            ]
        };

        // send mail with defined transport object
        const info = await transporter.sendMail(mailOptions).catch((error) => {
            global.appLog.error(`${error} - ${info} - email was not sent - in SendUserData.js - line 27`);
        });

        const backupToRemovePath = path.resolve(global.dalioAppDataPathDir, 'backups', fileName);

        fs.remove(backupToRemovePath, err => {
            if (err) return console.error(err);
        })
    }

    static createBackup = async (): Promise<any> => {

        const fileName = this.archiveUserData(true);

        const saveFilePath = await dialog.showSaveDialog(null, {
            title: fileName,
            defaultPath: `${app.getPath('documents')}/${fileName}`,
            properties: {
                createDirectory: true,
            }
        });

        if (typeof saveFilePath === 'string' && saveFilePath !== undefined) {
            const scrFilePath = `${global.dalioAppDataPathDir}/backups/${fileName}`;
            fs.move(scrFilePath, saveFilePath, err => {
                if (err){
                    global.appLog.error(err);
                }
            });
        }

    }

    static restoreUserData = async () => {
        const openFilePath = await dialog.showOpenDialog(null, {
            defaultPath: `${app.getPath('documents')}`,
            properties: ['openFile'],
            filters: [
                { name: 'Dalio backup files', extensions: ['dlo'] },
            ],
        });

        if (openFilePath !== undefined) {
            // Destroy the current DB connection pool

            const tempFolderPath = path.resolve(global.dalioAppDataPathDir, 'temp');
            await fs.ensureDir(tempFolderPath, err => global.appLog.error(err));

            await extract(openFilePath[0], { dir: tempFolderPath })

            const extractedDBPath = path.resolve(global.dalioAppDataPathDir, 'temp', 'database', 'ds-repricer.db');

            if (fs.existsSync(extractedDBPath)) {

                try {
                    await global.knex.destroy();

                    const dbFilePath = path.resolve(global.dalioAppDataPathDir, 'database', 'ds-repricer.db'); 
                    const dbTempFilePath = path.resolve(global.dalioAppDataPathDir, 'temp', 'database', 'ds-repricer.db');
                    await fs.remove(dbFilePath);

                    try {
                        await fs.move(dbTempFilePath, dbFilePath);
                    } catch (err) {
                        global.appLog.error(err);
                    }

                    try {
                        const cookieFolderPath = path.resolve(global.dalioAppDataPathDir, 'cookies');
                        const tempCookieFolderPath = path.resolve(global.dalioAppDataPathDir, 'temp', 'cookies');

                        const logsFolderPath = path.resolve(global.dalioAppDataPathDir, 'logs');
                        const tempLogsFolderPath = path.resolve(global.dalioAppDataPathDir, 'temp', 'logs');

                        const errorLogsFolderPath = path.resolve(global.dalioAppDataPathDir, 'errorLogs');
                        const errorLogsAlternativeFolderPath = path.resolve(global.dalioAppDataPathDir, 'error-logs');
                        const tempErrorLogsFolderPath = path.resolve(global.dalioAppDataPathDir, 'temp', 'errorLogs');

                        const logsTransport = await global.log.transports.find(transport => transport.filename === '%DATE%-info.log');
                        const errorLogsTransport = await global.appLog.transports.find(transport => transport.filename === '%DATE%-app.log');

                        await global.log.remove(logsTransport);
                        await global.appLog.remove(errorLogsTransport);

                        await fs.remove(cookieFolderPath);
                        await fs.remove(logsFolderPath);
                        await fs.remove(errorLogsFolderPath);
                        await fs.remove(errorLogsAlternativeFolderPath);

                        await fs.move(tempCookieFolderPath, cookieFolderPath);
                        await fs.move(tempLogsFolderPath, logsFolderPath);
                        await fs.move(tempErrorLogsFolderPath, errorLogsFolderPath);

                        await fs.remove(tempFolderPath);

                        app.relaunch();
                        app.quit();
                      } catch (err) {
                        global.appLog.error(err);
                      }

                    } catch (err) {
                        global.appLog.error(err);
                    }
                }
            }
    }

    static archiveUserData = (changeExtension = false) => {
        // create a file to stream archive data to.
        const extension = changeExtension ? 'dlo' : 'zip';
        const date = moment().format('DD-MM-YYYY');
        const fileName = `dalio-${date}.${extension}`;

        const backupsDir = path.resolve(global.dalioAppDataPathDir, 'backups');

        fs.ensureDir(backupsDir, err => {
            if (err) {
                global.appLog.error(err) // => null
            }
        });

        const outputPath = path.resolve(global.dalioAppDataPathDir, 'backups', fileName);
        const output = fs.createWriteStream(outputPath);

        const archive = archiver('zip', {
           zlib: { level: 9 } // Sets the compression level.
        });

        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        output.on('close', () => {
            global.appLog.info(`Dalio archived the user's folder - ${archive.pointer()} total bytes`);
        });


        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                // log warning
            } else {
                global.appLog.error(`${err} - archive.on 'warning' - sendUserData.archiveUserData()`);
            }
        });

        // good practice to catch this error explicitly
        archive.on('error', (err) => {
            global.appLog.error(`${err} - archive.on 'error' - sendUserData.error()`);
        });

        // pipe archive data to the file
        archive.pipe(output);

        // append files from a sub-directory and naming it `new-subdir` within the archive
        archive.directory(global.errorLogPathDir, 'errorLogs');
        archive.directory(global.logPathDir, 'logs');
        archive.directory(global.dbPathDir, 'database');
        archive.directory(global.cookiesPathDir, 'cookies');

        // finalize the archive (ie we are done appending files but streams have to finish yet)
        // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
        archive.finalize();

        return fileName;
    }
}

export default SendUserData;
