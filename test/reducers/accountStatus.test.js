import { SET_ACCOUNT_STATUS } from '../../app/reducers/types';
import accountStatus from '../../app/reducers/accountStatus';

describe('accountStatus reducer', () => {
  it('Should return default state', () => {
    const newState = accountStatus(undefined, {});
    expect(newState).toEqual({ value: 0 });
  });

  it('Should set account status', () => {
    const newState = accountStatus(undefined, {
      type: SET_ACCOUNT_STATUS,
      value: 1
    });
    expect(newState).toEqual({ value: 1 });
  });
});
