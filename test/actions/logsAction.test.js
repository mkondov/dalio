import { configureStore } from '../../app/store/configureStore';
import { getLogs } from '../../app/actions/logsAction';

const store = configureStore();

describe('logsAction', () => {
  const dummyLogs = [
    {
      date: '04-09-2019 09:34:58',
      level: 'warn',
      message:
        "Listing 'Oster%20BLSTRM-DZG-BG0%20Designed%20for%20Life%20General%20Blender,%2013.9%20x%2010.2%20x%208.9%20inches,%20Silver' must be repriced. Current price is 69.97. The new price is 75.97"
    }
  ];
  it('Store is updated correctly', () => {
    store.dispatch(getLogs(dummyLogs));
    const newState = store.getState();
    expect(newState.logs).toBe(dummyLogs);
  });
});
