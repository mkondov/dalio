import { configureStore } from '../../app/store/configureStore';
import { setAccountStatus } from '../../app/actions/accountStatusAction';

const store = configureStore();

describe('setAccountStatus action', () => {
  it('Store is updated correctly', () => {
    store.dispatch(setAccountStatus(1));
    const newState = store.getState();
    expect(newState.accountStatus.value).toBe(1);
  });
});
