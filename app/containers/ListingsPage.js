import React from 'react';
import Listings from '../components/listings/Listings';
// import CSVImportModal from '../components/listings/CSVImportModal';
import Header from '../components/header/Header';
// import SpeedDialActions from '../components/speedDialActions/SpeedDialActions';

const ListingsPage = () => (
  <React.Fragment>
    <Header />
    <Listings />
    {/* <CSVImportModal /> */}
    {/* <SpeedDialActions /> */}
  </React.Fragment>
);

export default ListingsPage;
