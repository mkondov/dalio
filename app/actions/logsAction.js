/* eslint import/prefer-default-export: 0 */
// @flow
import { GET_LOGS } from '../reducers/types';

type Logs = Array<{
    date: string, 
    level: string, 
    message: string
}>;

export const getLogs = (logs: Logs) => ({
  type: GET_LOGS,
  logs
});
