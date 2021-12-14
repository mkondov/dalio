import React from 'react';
import Dashboard from '../components/dashboard/Dashboard';
import Header from '../components/header/Header';
import SpeedDialActions from '../components/speedDialActions/SpeedDialActions';

const HomePage = () => (
  <React.Fragment>
    <Header />
    <Dashboard />
    <SpeedDialActions />
  </React.Fragment>
);

export default HomePage;
