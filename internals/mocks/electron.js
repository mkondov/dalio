/* eslint import/prefer-default-export: 0 */
/* eslint no-undef: 0 */

export const ipcRenderer = {
  on: jest.fn(),
  send: jest.fn(),
  removeAllListeners: jest.fn()
};
