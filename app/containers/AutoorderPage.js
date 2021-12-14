
/* eslint react/prop-types: 0 */

import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import Autoorder from '../components/autoorder/Autoorder';
import Header from '../components/header/Header';
import routes from '../constants/routes.json';

const AutoorderPage = props => {

  React.useEffect(() => {
    if (props.accountStatus.status !== '1' || props.accountStatus.email === 'godmode@dalio.io') {
      props.history.push(routes.LOGIN);
    }
  }, []);

  return (
    <React.Fragment>
      <Header />
      <Autoorder />
    </React.Fragment>
  )
}

const mapStateToProps = state => ({
  ...state
});

export default compose(withRouter, connect(mapStateToProps))(AutoorderPage);