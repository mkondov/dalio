// @flow
import { GET_LOGS } from './types';

// TYPES
import type { Log } from '../types/LogsTypes';

type Action = {
  type: string,
  logs: Array<Log>
};

export default function(state: Array<any> = [], action: Action): Array<any> {
  switch (action.type) {
    case GET_LOGS:
      return action.logs;
    default:
      return state;
  }
}
