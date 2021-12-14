import { configureStore } from '../../app/store/configureStore';
import { setAppUpdateStatus } from '../../app/actions/appUpdateAction';

const store = configureStore();

describe('appUpdateAction', () => {
  it('Store is updated correctly', () => {
    store.dispatch(setAppUpdateStatus(true));
    const newState = store.getState();
    expect(newState.appUpdateStatus.value).toBe(true);
  });
});
