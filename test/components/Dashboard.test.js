import React from 'react';
import { Provider } from 'react-redux';
import { render, cleanup } from '@testing-library/react';
import { configureStore } from '../../app/store/configureStore';
// import { setAccountStatus } from '../../app/actions/accountStatusAction';
import Dashboard from '../../app/components/dashboard/Dashboard';

import '@testing-library/jest-dom/extend-expect';

const store = configureStore();

describe('Dashboard component', () => {
  afterEach(cleanup);

  test('Renders three modules', () => {
    // await store.dispatch(setAccountStatus(1));
    // const newState = await store.getState();
    // console.log(newState);

    const { debug } = render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );
    debug();

    // const homeWrapper = getByTestId('home-wrapper');
  });
});
