import React from 'react';
import { Provider } from 'react-redux';
import { render, cleanup } from '@testing-library/react';
import { configureStore } from '../../app/store/configureStore';
import { setAccountStatus } from '../../app/actions/accountStatusAction';
import AccountCheckModule from '../../app/components/dashboard/AccountCheckModule';
import '@testing-library/jest-dom/extend-expect';

const store = configureStore();

describe('<AccountCheckModule/> component', () => {
  afterEach(cleanup);

  test('Does not render the free account notice if accountStatus = 1', () => {
    store.dispatch(setAccountStatus('1'));
    const { queryByTestId } = render(
      <Provider store={store}>
        <AccountCheckModule />
      </Provider>
    );
    expect(queryByTestId('paper')).toBeFalsy();
  });

  test('Render the free account notice if accountStatus !== 1', () => {
    store.dispatch(setAccountStatus('0'));
    const { queryByTestId } = render(
      <Provider store={store}>
        <AccountCheckModule />
      </Provider>
    );
    expect(queryByTestId('paper')).toBeTruthy();
  });

  test('Linear progress should render without problems', () => {
    store.dispatch(setAccountStatus('0'));
    const { queryByTestId } = render(
      <Provider store={store}>
        <AccountCheckModule />
      </Provider>
    );
    expect(queryByTestId('border-linear-progress')).toBeTruthy();
  });

  test('Free listings counter should render without problems', () => {
    store.dispatch(setAccountStatus('0'));
    const { queryByTestId } = render(
      <Provider store={store}>
        <AccountCheckModule />
      </Provider>
    );
    const counter = queryByTestId('free-listings-counter');
    expect(counter).toBeTruthy();
    expect(counter.textContent).toBe('Free listings: 0/100');
  });
});
