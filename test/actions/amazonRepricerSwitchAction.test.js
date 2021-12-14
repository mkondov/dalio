import { configureStore } from '../../app/store/configureStore';
import { setAmazonRepricerSwitch } from '../../app/actions/amazonRepricerActions';

const store = configureStore();

describe('amazonRepricerSwitchAction', () => {
  it('Store is updated correctly', () => {
    store.dispatch(setAmazonRepricerSwitch(true));
    const newState = store.getState();
    expect(newState.amazonRepricerSwitch.value).toBe(true);
  });
});
