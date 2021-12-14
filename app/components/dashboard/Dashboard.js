/* eslint no-unused-vars: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint arrow-body-style: 0 */

import React from 'react';
import { ipcRenderer } from 'electron';
import { store } from 'react-notifications-component';

import Repricers from './repricers/Repricers';
import Onboarding from './Onboarding';
import AccountCheckModule from './AccountCheckModule';
// import TrackingUploader from './trackingUploader/TrackingUploader';

const Dashboard = () => {
  const sendUserData = async () => {
    ipcRenderer.send('send-user-data');
    store.addNotification({
      title: "Thank you!",
      message: "Your error logs have been sent to Dalio`s developers.",
      type: "info",
      insert: "bottom",
      container: "bottom-right",
      animationIn: ["animated", "fadeIn"],
      animationOut: ["animated", "fadeOut"],
      dismiss: {
        duration: 5000,
        onScreen: true
      }
    });
  }

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '20px',
        marginTop: '100px'
      }}
      data-testid="home-wrapper"
    >
      <AccountCheckModule />
      <Onboarding />
      <Repricers />
      <p style={{ fontSize: 12 }}>Dalio version: 1.0.2</p>
    </div>
  );
};

export default Dashboard;
