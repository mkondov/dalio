/* eslint arrow-body-style: 0 */

import React from 'react';
import { Offline } from 'react-detect-offline';

const OfflineDetector = () => {
  return (
    <Offline>
       <div
          style={{
            width: '100%',
            backgroundColor: '#ffa500',
            color: '#fff',
            fontWeight: 300,
            textAlign: 'center'
          }}
        >
          <p style={{ margin: 0, padding: 5, fontSize: 12 }}>
            You are now offline. Please check your internet connection.
          </p>
        </div>
    </Offline>
  );
};

export default OfflineDetector;
