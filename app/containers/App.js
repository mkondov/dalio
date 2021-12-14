/* eslint react/static-property-placement: 0 */

// @flow
import * as React from 'react';
import ReactNotification from 'react-notifications-component';

type Props = {
  children: React.Node
};

export default class App extends React.Component<Props> {
  props: Props;

  render() {
    const { children } = this.props;
    return (
      <React.Fragment>
        <ReactNotification />
        {children}
      </React.Fragment>
    )
  }
}
