/* eslint react/destructuring-assignment: 0 */
/* eslint no-shadow: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/jsx-boolean-value: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint eqeqeq: 0 */
/* eslint arrow-body-style: 0 */
/* eslint no-unreachable: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint no-undef-init: 0 */
/* eslint default-case: 0 */
/* eslint no-plusplus: 0 */
/* eslint no-else-return: 0 */
/* eslint jsx-a11y/control-has-associated-label: 0 */

import React, { useEffect, forwardRef } from 'react';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import MaterialTable from 'material-table';
import { ipcRenderer, shell } from 'electron';
import { connect } from 'react-redux';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import Modal from '@material-ui/core/Modal'; 
import Backdrop from '@material-ui/core/Backdrop';
import Grid from '@material-ui/core/Grid';
import Badge from '@material-ui/core/Badge';
import Icon from '@material-ui/core/Icon';
import Tooltip from '@material-ui/core/Tooltip';

import AddListingIcon from '@material-ui/icons/AddCircle';
import AddVariantIcon from '@material-ui/icons/LibraryAdd';
import SpeakerNotes from '@material-ui/icons/SpeakerNotes';
import AddBox from '@material-ui/icons/AddBox';
import ArrowUpward from '@material-ui/icons/ArrowUpward';
import Check from '@material-ui/icons/Check';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import Clear from '@material-ui/icons/Clear';
import DeleteOutline from '@material-ui/icons/DeleteOutline';
import Edit from '@material-ui/icons/Edit';
import FilterList from '@material-ui/icons/FilterList';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import Remove from '@material-ui/icons/Remove';
import SaveAlt from '@material-ui/icons/SaveAlt';
import Search from '@material-ui/icons/Search';
import ViewColumn from '@material-ui/icons/ViewColumn';
import Warning from '@material-ui/icons/Warning';
import Assessment from '@material-ui/icons/Assessment';
import ArrowRightAlt from '@material-ui/icons/ArrowRightAlt';
import ResetListingIcon from '@material-ui/icons/SettingsBackupRestore';
import PlayCircleFilled from '@material-ui/icons/PlayCircleFilledOutlined';
import PauseCircleFilled from '@material-ui/icons/PauseCircleFilledOutlined';
import LocalOfferIcon from '@material-ui/icons/LocalOffer';
import WatchersIcon from '@material-ui/icons/Visibility';
import PageViews from '@material-ui/icons/TouchApp';
import SoldQuantity from '@material-ui/icons/Shop';

import { store } from 'react-notifications-component';

import routes from '../../constants/routes.json';

import AmazonLogo from '../../media/logos/amazon-logo.svg';
import EbayLogo from '../../media/logos/ebay-logo.svg';
import WalmartLogo from '../../media/logos/walmart-logo.svg';
import AliExpressLogo from '../../media/logos/aliexpress-logo.svg';
import HomeDepotLogo from '../../media/logos/home-depot-logo.svg';
import VidaXLLogo from '../../media/logos/vidaxl-logo.svg';

import { getListingsAction, setListingsPageRowSize } from '../../actions/listingsAction';

import ListingLogs from './ListingLogs';

const tableIcons = {
  Add: forwardRef((props, ref) => <AddBox {...props} ref={ref} />),
  Check: forwardRef((props, ref) => <Check {...props} ref={ref} />),
  Clear: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Delete: forwardRef((props, ref) => <DeleteOutline {...props} ref={ref} />),
  DetailPanel: forwardRef((props, ref) => (
    <ChevronRight {...props} ref={ref} />
  )),
  Edit: forwardRef((props, ref) => <Edit {...props} ref={ref} />),
  Export: forwardRef((props, ref) => <SaveAlt {...props} ref={ref} />),
  Filter: forwardRef((props, ref) => <FilterList {...props} ref={ref} />),
  FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
  LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
  NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  PreviousPage: forwardRef((props, ref) => (
    <ChevronLeft {...props} ref={ref} />
  )),
  ResetSearch: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Search: forwardRef((props, ref) => <Search {...props} ref={ref} />),
  SortArrow: forwardRef((props, ref) => <ArrowUpward {...props} ref={ref} />),
  ThirdStateCheck: forwardRef((props, ref) => <Remove {...props} ref={ref} />),
  ViewColumn: forwardRef((props, ref) => <ViewColumn {...props} ref={ref} />)
};

const useStyles = makeStyles(() => ({
  paper: {
    position: 'absolute',
    width: 580, 
    height: 660,
    margin: 'auto',
    color: '#000',
    backgroundColor: '#f5f5f5',
    // boxShadow: theme.shadows[3],
    border: '1px solid #fff',
    padding: '20px 30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around'
  },
  repricerSwitchMessage: {
    display: 'flex', 
    maxWidth: '700px',
    justifyContent: 'center',
    alignItems: 'center', 
    textAlign: 'left',
    paddingTop: 10,
    '& h3': {
      margin: '0px!important',
      paddingBottom: 5
    },
    '& p': {
      margin: '0px!important'
    }
  },
  h2Modal: {
    fontSize: 14,
    fontWeight: 400,
    paddingBottom: 5,
    textDecoration: 'underline'
  },
  h3Modal: {
    fontSize: 12
  },
  h4Modal: {
    fontSize: 10,
    textAlign: 'center'
  },
  gridContainer: {
    paddingTop: 10,
    paddingBottom: 10
  },
  pBuy: {
    color: '#ff0000',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  pSell: {
    color: '#00ff00',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  pGrossProfit: {
    color: '#333',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  spanPrice: {
    display: 'block', 
    textAlign: 'center', 
    padding: 5, 
    color: '#333',
    background: '#ccc'
  },
  padding5: {
    padding: 5
  },
  pSmall: {
    fontSize: 10,
    textAlign: 'center'
  },
  linkWithImageCell: {
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '5px',
    paddingBottom: '5px'
  },
  flexDiv: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 0
  },
  pricePDiv: {
    flexBasis: '80%',
    color: '#333',
    background: '#eee',
    padding: '7px 0px',
    marginTop: '2px',
    marginRight: '3px',
    marginBottom: '0px',
    borderRadius: '5px',
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  priceCheckButton: {
    marginLeft: 'auto',
    border: 'none',
    background: 'none',
    fontSize: '16px',
    cursor: 'pointer',
  },
  iconP: {
    color: '#333',
    // background: '#eee',
    padding: '0px 5px',
    marginTop: '2px',
    marginBottom: '0px',
    borderRadius: '5px',
    fontSize: '14px',
    fontWeight: 700,
    textTransform: 'uppercase',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    flexBasis: '50%'
  },
}));

const StyledBadge = withStyles(() => ({
  badge: {
    background: 'orange',
    color: '#000',
    border: '1px solid #000',
    fontSize: 11,
    fontWeight: 900
  },
}))(Badge);

// const { dialog } = require('electron').remote;

const ListingsTable = props => {
  const classes = useStyles();
  const { listings } = props;
  const [state, setState] = React.useState({
    columns: [
      {
        title: 'Image',
        field: 'image',
        editable: 'never',
        render: rowData => (
          <img style={{ maxWidth: 50 }} src={rowData.image} loading="lazy" alt=""/>
        ),
        headerStyle: {
          padding: 5,
          margin: 'auto',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'center'
        },
        searchable: false
      },
      {
        title: 'Item name',
        field: 'item_name',
        headerStyle: {
          minWidth: '200px',
          padding: 5,
          margin: 'auto',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'left'
        },
        searchable: true
      },
      {
        title: 'Supplier id',
        field: 'supplier_id',
        headerStyle: {
          minWidth: '200px',
          padding: 5,
          margin: 'auto',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'left'
        },
        hidden: true,
        searchable: true
      },
      {
        title: 'Store id',
        field: 'store_id',
        headerStyle: {
          minWidth: '200px',
          display: 'none',
          padding: 5,
          margin: 'auto',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'left'
        },
        hidden: true,
        searchable: true
      },
      {
        title: 'Prices',
        field: 'prices',
        render: rowData => {
          let supplierCurrencySymbol = '';
          let sellingPlatformCurrencySymbol = '';
          const repriceBreakdown = rowData.reprice_breakdown !== null ? JSON.parse(rowData.reprice_breakdown) : rowData.reprice_breakdown;

          let profitFieldStyle = { color: 'green' };
          if (repriceBreakdown !== null) {
            profitFieldStyle = repriceBreakdown.calculated_profit.includes('-') ? { color: '#ff0000' } : { color: 'green' };
          }
          
          if (rowData.supplier_url !== null && rowData.new_price !== null) {
            supplierCurrencySymbol = rowData.supplier_url.includes('.com') ? '$' : rowData.supplier_url.includes('.co.uk') ? '£' : '€'
          }

          if (rowData.store_url !== null && rowData.refactored_price !== null) {
            sellingPlatformCurrencySymbol = rowData.store_url.includes('.com') ? '$' : rowData.store_url.includes('.co.uk') ? '£' : '€';
          }
           
          return ( 
            
            <div className={classes.linkWithImageCell}>
              <div className={classes.flexDiv}><div className={classes.pricePDiv}>BUY: <span style={{ color: '#ff0000' }}>{`${supplierCurrencySymbol}${rowData.new_price !== null ? rowData.new_price : 'N/A'}`}</span></div>
                <Tooltip title="Check the source price of this listing">
                  <button className={classes.priceCheckButton} type="button" onClick={() => {
                    ipcRenderer.send('check-price', rowData);
                    store.addNotification({
                      title: `${rowData.item_name} added to price check queue`,
                      message: 'The listing will be price checked shortly.',
                      type: 'info',
                      insert: 'bottom',
                      container: 'bottom-right',
                      animationIn: ['animated', 'fadeIn'],
                      animationOut: ['animated', 'fadeOut'],
                      dismiss: {
                        duration: 5000,
                        onScreen: true
                      }
                    });
                  }}><LocalOfferIcon style={{ fontSize: 16 }} /></button></Tooltip></div><div className={classes.pricePDiv}>SELL: <span style={{ color: 'green' }}>{`${sellingPlatformCurrencySymbol}${rowData.refactored_price !== null ? rowData.refactored_price : 'N/A'}`}</span></div>
                  {repriceBreakdown !== null ? (
                    <div className={classes.pricePDiv}>{repriceBreakdown.calculated_profit.includes('-') ? 'Loss' : 'Profit' }: {repriceBreakdown.use_refactor_percentage == '1' ? `${repriceBreakdown.refactor_percentage}% ` : null}<span style={profitFieldStyle}>{`${repriceBreakdown !== null ? repriceBreakdown.calculated_profit : 'N/A'}`}</span></div>
                  ) : null}
                  
            </div>
          )
        },
        headerStyle: {
          padding: 5,
          margin: 'auto',
          minWidth: '130px',
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'center'
        },
        searchable: false
      },
      {
        title: 'Sourcing platform',
        field: 'supplier',
        searchable: true,
        render: rowData => {
          let logo = undefined;

          switch (rowData.supplier) {
            case 'walmart':
              logo = WalmartLogo
              break;
            case 'amazon':
              logo = AmazonLogo
              break;
            case 'aliexpress':
              logo = AliExpressLogo
              break;
            case 'homedepot':
              logo = HomeDepotLogo
              break;
            case 'vidaxl':
              logo = VidaXLLogo
              break;
          }
  

          return <div className={classes.linkWithImageCell}>
            {logo !== undefined ? <img style={{ maxWidth: 50, marginBottom: '10px' }} src={logo} loading="lazy" alt=""/> : null}
            <button
              type="button"
              className="link-buttons-listings"
              onClick={() => shell.openExternal(rowData.supplier_url)}
            >
              {rowData.supplier_id}
            </button>
          </div>
        },
        headerStyle: {
          padding: 5,
          margin: 'auto',
          minWidth: '130px',
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'center'
        }
      },
      {
        title: 'Selling platform',
        field: 'store',
        render: rowData => {

          let logo = undefined;

          switch (rowData.store) {
              case 'ebay':
                logo = EbayLogo
                break;
              case 'amazon':
                logo = AmazonLogo
                break;
            }
    

          return <div className={classes.linkWithImageCell}>
            {logo !== undefined ? <img style={{ maxWidth: 50, marginBottom: '10px' }} src={logo} loading="lazy" alt=""/> : null}
            <button
              type="button"
              className="link-buttons-listings"
              onClick={() => shell.openExternal(rowData.store_url)}
            >
              {rowData.store_id}
            </button>

            {rowData.has_variations == '0' ? (
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', padding: 0, width: '100px' }}>
                <Tooltip title="Watchers">
                  <p className={classes.iconP}><WatchersIcon style={{ fontSize: '17px', paddingRight: '5px' }} />  {rowData.store_watches}</p>
                </Tooltip>

                <Tooltip title="Page views">
                  <p className={classes.iconP}><PageViews style={{ fontSize: '17px', paddingRight: '5px' }} />  {rowData.store_page_visits}</p>
                </Tooltip>

                <Tooltip title="Sold quantity">
                  <p className={classes.iconP}><SoldQuantity style={{ fontSize: '17px', paddingRight: '5px' }} />  {rowData.store_items_sold}</p>
                </Tooltip>
              </div>
            ) : null}
          </div>
        },
        headerStyle: {
          padding: 5,
          minWidth: '130px',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 0px',
          textAlign: 'center'
        },
        searchable: false
      },
      {
        title: 'Repricer settings',
        field: 'use_global_refactor_settings',
        type: 'numeric',
        render: rowData => (
          <p style={{ fontSize: '12px' }}>
            {rowData.use_global_refactor_settings == '0' ? 'Local settings' : 'Global settings'}
          </p>
        ),
        headerStyle: {
          padding: 5,
          minWidth: '150px',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'center'
        },
        searchable: false
      },
      // {
      //   title: 'Source price',
      //   field: 'new_price',
      //   editable: 'never',
      //   render: rowData => (
      //     <p style={{ fontSize: '12px' }}>
      //       {rowData.new_price !== null ? rowData.new_price : 'N/A'}
      //     </p>
      //   ),
      //   headerStyle: {
      //     padding: 5,
      //     minWidth: '100px',
      //   },
      //   cellStyle: {
      //     padding: '4px 10px',
      //     textAlign: 'center'
      //   }
      // },
      // {
      //   title: 'Selling platform price',
      //   field: 'price',
      //   editable: 'never',
      //   render: rowData => (
      //     <p style={{ fontSize: '12px' }}>
      //       {rowData.price !== null ? rowData.price : 'N/A'}
      //     </p>
      //   ),
      //   headerStyle: {
      //     padding: 5,
      //     minWidth: '100px',
      //   },
      //   cellStyle: {
      //     padding: '4px 10px',
      //     textAlign: 'center'
      //   }
      // },
      // {
      //   title: 'Source product availability',
      //   field: 'product_availability',
      //   editable: 'never',
      //   render: rowData => (
      //     <p style={{ fontSize: '12px' }}>
      //       {rowData.product_availability !== null ? rowData.product_availability : 'N/A'}
      //     </p>
      //   ),
      //   headerStyle: {
      //     padding: 5,
      //     minWidth: '130px',
      //   },
      //   cellStyle: {
      //     padding: '4px 10px',
      //     textAlign: 'center'
      //   }
      // },
      {
        title: 'Last repriced',
        field: 'last_repriced',
        editable: 'never',
        headerStyle: {
          minWidth: '150px'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'center'
        },
        searchable: false
      }
    ],
    data: listings
  });
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modal, setModal] = React.useState({});
  const [logsModal, setLogsModal] = React.useState({
    open: false,
    listing: undefined
  });
  const [amazonSettings, setAmazonSettings] = React.useState({
    add_state_tax: '0',
    state_tax_percentage: 6,
    add_amazon_fee: '0',
    amazon_fee_percentage: 15,
    use_refactor_percentage: '0',
    refactor_percentage: 15,
    refactor_fixed_sum: 0
  });

  const [ebaySettings, setEbaySettings] = React.useState({
    add_state_tax: '0',
    state_tax_percentage: 6,
    add_vat: '0',
    vat_percentage: 20,
    add_ebay_fee: '0',
    ebay_fee: 11,
    add_paypal_fee: '0',
    paypal_fee_percentage: 2.9,
    paypal_fixed_fee: 0.30,
    use_refactor_percentage: '0',
    refactor_percentage: 15,
    refactor_fixed_sum: 0
  });

  const [windowSize, setWindowSize] = React.useState({
    width: 1200,
    height: 690
  });

  const openModal = (rowData) => {
    setModalOpen(true);
    setModal({
      ...modal,
      listing: rowData
    });
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const openLogsModal = (rowData) => {    
    setLogsModal({ ...logsModal, open: true, listing: rowData });

    // Deep copy the passed listing data
    const listing = JSON.parse(JSON.stringify(rowData));

    // Deep copy all of the listings from the Redux state
    const listings = [...props.listings];
    
    // Mark the presence of unread logs in the current listing
    let hasUnreadLogs = false;

    if (listing.logs !== null && listing.logs !== '') {
      if (listing.logs.length > 0) {
        // If any of the logs of the currently open listing has an unread log -> mark it as read
        for (let i = 0; i < listing.logs.length; i++) {
          if (!listing.logs[i].read) {
            hasUnreadLogs = true;
            listing.logs[i].read = true;
          }
        }

        // IF there are unread logs -> update the orders redux state, so the table itself can be updated
        if (hasUnreadLogs && listings.length > 0) {
          for (let o = 0; o < listings.length; o++) {
            if (listing.store_id === listings[o].store_id) {
              listings[o] = JSON.parse(JSON.stringify(listing));
              listings[o].logs = JSON.stringify(listings[o].logs);
              break;
            }
          }

          props.getListingsAction(listings);
        }
      }
    }

    ipcRenderer.send('update-listing-logs-status', listing);
  };

  const closeLogsModal = () => {
    setLogsModal({ ...logsModal, open: false });
  };

  /*
   * Set the component state to be equal to the global Redux Store state and
   * re-render only when the Redux state changes
   */
  useEffect(() => {
    setState({ ...state, data: listings });
  }, [listings]);

  useEffect(() => {
    // Listening for 'amazon-setting' event coming from the main process
    ipcRenderer.on('amazon-settings', (event, resSettings) => {
      // When received -> update the state object with the new data
      setAmazonSettings(prevState => {
        return {...prevState, ...resSettings }
      });
    });

    // Listening for 'amazon-setting' event coming from the main process
    ipcRenderer.on('ebay-settings', (event, resSettings) => {
      // When received -> update the state object with the new data
      setEbaySettings(prevState => {
        return {...prevState, ...resSettings }
      });
    });

    /* Sends an event to the main process that queries all amazon settings
    * the listener in the beginning of this useEffect handles the response to THIS event
    */
    ipcRenderer.send('amazon-settings', { action: 'query-amazon-settings' });

    ipcRenderer.send('ebay-settings', { action: 'query-ebay-settings' });

    window.addEventListener('resize', e => {
      e.preventDefault();
      setWindowSize({ width: e.target.innerWidth, height: e.target.innerHeight })
    });

    setWindowSize({ width: window.innerWidth, height: window.innerHeight })

    // calculateSandboxTargetPrice()();
    // Specify how to clean up after this effect:
    return () => {
      ipcRenderer.removeAllListeners('amazon-settings');
      ipcRenderer.removeAllListeners('ebay-settings');
    };
  }, []);

  // Render the material table
  if (listings !== undefined) {
    return (
      <div id="listings-table">
        <MaterialTable
          title={
            props.ebayRepricerSwitch.running === true ? (
              <React.Fragment>
                <div className={classes.repricerSwitchMessage}>
                  <Icon
                    className="fas fa-robot"
                    style={{ color: '#00ff00', width: 'auto', fontSize: 36, paddingRight: 10 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around'}}>
                    <h3 style={{ fontSize: 18 }}>Your price and inventory monitor is ON</h3>
                    <p style={{ fontSize: 12 }}>Next check run: {props.ebayRepricerSwitch.status}</p>      
                  </div>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className={classes.repricerSwitchMessage}>
                  <Icon
                    className="fas fa-robot"
                    style={{ color: '#ff0000', width: 'auto', fontSize: 36, paddingRight: 10 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around'}}>
                    <h3 style={{ fontSize: 18 }}>Your price and inventory monitor is OFF</h3>
                    <p style={{ fontSize: 12 }}>Dalio will not perform any price and inventory checks and will not change any of your listings prices/inventory until you turn it on from the &apos;Dashboard&apos;.</p>      
                  </div>
                </div>
              </React.Fragment>
            )
          }
          columns={state.columns}
          data={state.data}
          icons={tableIcons}
          parentChildData={(row, rows) => rows.find(a => a.store_id !== null && row.parent_listing_id !== null && a.store_id === row.parent_listing_id)}
          localization={{ body: { editRow: { deleteText: 'Delete this listing from Dalio' } } }}
          options={{
            // actionsColumnIndex: -1,
            headerStyle: {
              backgroundColor: '#fff',
              color: '#d5008d',
              minWidth: '50px',
              fontWeight: 900,
              textAlign: 'center'
            },
            searchFieldStyle: {
              maxWidth: '400px'
            },
            rowStyle: rowData => ({
              backgroundColor: ((rowData.store_id === null || rowData.supplier_id === null) && rowData.has_variations == '0') ? '#f1f1f1' : ((rowData.disabled !== undefined || rowData.product_changed === 1 || rowData.errors_during_price_check > 1) && rowData.has_variations == '0') ? '#EEE' : '#FFF',
              border: ((rowData.store_id === null || rowData.supplier_id === null) && rowData.has_variations == '0') ? '2px solid red' : ((rowData.disabled !== undefined || rowData.product_changed === 1 || rowData.errors_during_price_check > 1) && rowData.has_variations == '0') ? '2px solid red' : 'none',
            }),
            emptyRowsWhenPaging: false,
            pageSize: props.listingsPageRowSize !== undefined ? props.listingsPageRowSize : 20,
            pageSizeOptions: [5, 10, 20, 50, 100],
            minBodyHeight: windowSize.height - 250,
            maxBodyHeight: windowSize.height - 200
            }}
          onChangeRowsPerPage={size => {
            props.setListingsPageRowSize(size);
          }}
          actions={[
            rowData => rowData.product_changed == '1' ? ({
              // If a product is believed to have changed at the source -> show reset icon
              icon: () => rowData.product_changed == 1 ? <ResetListingIcon style={{ color: 'green' }} /> : null,
              tooltip: rowData.product_changed == 1 ? 'If the product has not changed, resume tracking.' : null,
              onClick: (event, rowData) => {
                const data = [...state.data];
                const resetListingIndex = data.indexOf(rowData);

                const listingData = JSON.parse(JSON.stringify(rowData));
                listingData.product_changed = 0;

                data[resetListingIndex] = listingData;

                setState({ ...state, data });
  
                ipcRenderer.send('reset-changed-product-warning', listingData);
              },
              disabled: rowData.product_changed == 1 ? false : true,
            }) : null,
            rowData => rowData.has_variations == '0' ? ({
              icon: () => {
                if ((rowData.product_availability == null || rowData.product_availability == '0' || rowData.product_availability == 'OUT_OF_STOCK') && rowData.has_variations !== '1') {
                  return <Icon className="fas fa-boxes" style={{ color: '#ff0000', width: '30px' }} />
                } else if (rowData.product_availability !== null && rowData.product_availability !== '0' && rowData.product_availability !== 'OUT_OF_STOCK' && rowData.has_variations !== '1') {

                  if (rowData.force_oos == '1') {
                    return <Icon className="fas fa-boxes" style={{ color: '#CCCC00', width: '30px' }} />
                  }

                  return <Icon className="fas fa-boxes" style={{ color: 'green', width: '30px' }} />
                }

                return null;
              }, 
              tooltip: (rowData.product_availability == null || rowData.product_availability == '0' || rowData.product_availability == 'OUT_OF_STOCK') && rowData.has_variations !== '1' ? 'Out of stock' : rowData.product_availability !== null && rowData.product_availability !== '0' && rowData.product_availability !== 'OUT_OF_STOCK' && rowData.has_variations !== '1' && rowData.force_oos == '0' ? 'Force listing OUT OF STOCK' : 'Resume item as IN STOCK',
              onClick: (event, rowData) => {
                const data = [...state.data];
                const resetListingIndex = data.indexOf(rowData);
                const listingData = JSON.parse(JSON.stringify(rowData));

                if (listingData.force_oos === '0') {
                  listingData.force_oos = '1';
                } else {
                  listingData.force_oos = '0';
                }

                data[resetListingIndex] = listingData;

                setState({ ...state, data });
  
                ipcRenderer.send('force-oos', listingData);
              },
              disabled: (rowData.product_availability == null || rowData.product_availability == '0' || rowData.product_availability == 'OUT_OF_STOCK') && rowData.has_variations !== '1' ? true : false,
            }) : null,
            rowData => rowData.has_variations == '0' ? ({
              icon: () => rowData.has_variations == '1' ? null : rowData.pause_listing === '1' ? <PlayCircleFilled style={{ color: '#00ff00' }} /> : <PauseCircleFilled />,
              tooltip: rowData.has_variations == '1' ? null : rowData.pause_listing === '1' ? 'Resume listing tracking' : 'Pause listing tracking',
              onClick: (event, rowData) => {
                const data = [...state.data];
                const resetListingIndex = data.indexOf(rowData);
                const listingData = JSON.parse(JSON.stringify(rowData));

                if (listingData.pause_listing === '0') {
                  listingData.pause_listing = '1';
                } else {
                  listingData.pause_listing = '0';
                }

                data[resetListingIndex] = listingData;

                setState({ ...state, data });
  
                ipcRenderer.send('pause-listing', listingData);
              },
              disabled: rowData.has_variations == '0' ? false : true,
            }) : null, 
            rowData => rowData.has_variations == '0' ? ({
              /* If a product is not correctly linked to a source -> show 'Alert' icon
              * if it is correctly linked -> show product information
              */
              icon: () => rowData.has_variations == '1' ? null : rowData.supplier_url !== null && rowData.supplier_url !== "" && rowData.supplier !== null && rowData.supplier !== "" && rowData.supplier_id !== null && rowData.supplier_id !== "" && rowData.store_url !== null && rowData.store_url !== "" && rowData.store_id !== null && rowData.store_id !== "" ? <Assessment /> : <Warning style={{ color: 'red' }}/>,
              tooltip: rowData.has_variations == '1' ? null : rowData.supplier_url !== null && rowData.supplier_url !== "" && rowData.supplier !== null && rowData.supplier !== "" && rowData.supplier_id !== null && rowData.supplier_id !== "" && rowData.store_url !== null && rowData.store_url !== "" && rowData.store_id !== null && rowData.store_id !== "" ? 'Product info' : 'This listing has to be correctly linked to a sourcing/selling platform.',
              onClick: (event, rowData) => {
                // If product is correctly linked to a source -> show product data in modal
                if (rowData.supplier_url !== null && rowData.supplier_url !== "" && rowData.supplier !== null && rowData.supplier !== "" && rowData.supplier_id !== null && rowData.supplier_id !== "" && rowData.store_url !== null && rowData.store_url !== "" && rowData.store_id !== null && rowData.store_id !== "") {

                  const rowDataParsed = JSON.parse(JSON.stringify(rowData));

                  if (typeof rowDataParsed.local_refactor_settings !== 'object' && rowDataParsed.local_refactor_settings !== null) {
                    rowDataParsed.local_refactor_settings = JSON.parse(rowData.local_refactor_settings);
                  }

                  rowDataParsed.reprice_breakdown = JSON.parse(rowDataParsed.reprice_breakdown);

                  openModal(rowDataParsed);
                
                } else {
                  // Else, redirect to 'Edit listing' page
                  props.history.push({
                    pathname: routes.EDIT_LISTING,
                    state: {
                      data: rowData,
                      referrer: 'listings_page' 
                    }
                  })
                }
              },
              disabled: rowData.has_variations == '1' ? true : false
            }) : null,
            rowData => rowData.has_variations == '0' ? ({
              icon: () => {
                const rowDataParsed = JSON.parse(JSON.stringify(rowData));
                let unreadLogs = 0;

                if (rowDataParsed.logs !== null && rowDataParsed.logs !== 'null' && rowDataParsed.logs !== '') {
                  rowDataParsed.logs = JSON.parse(rowDataParsed.logs);
                  if (rowDataParsed.logs.length > 0) {
                    for (let i = 0; i < rowDataParsed.logs.length; i++) {
                      if (!rowDataParsed.logs[i].read) {
                        unreadLogs++;
                      }
                    }
                  }
                }

                return (
                  <StyledBadge badgeContent={unreadLogs} color="primary">
                    <SpeakerNotes />
                  </StyledBadge>
                  )
              },
              tooltip: (rowData.logs == null || rowData.logs == 'null' || rowData.logs == '') ? 'No logs yet' : 'Listing logs',
              onClick: (event, rowData) => {
                const rowDataParsed = JSON.parse(JSON.stringify(rowData));

                if (rowDataParsed.logs !== null && rowDataParsed.logs !== '') {
                  rowDataParsed.logs = JSON.parse(rowData.logs);
                }

                openLogsModal(rowDataParsed);
              },
              disabled: rowData.logs == null || rowData.logs == 'null' || rowData.logs == ''
            }) : null,
            rowData => rowData.is_variant == '0' ? ({
              icon: AddVariantIcon,
              tooltip: 'Add variation',
              onClick: (event, rowData) =>
                props.history.push({
                  pathname: routes.ADD_LISTING_VARIATION,
                  state: {
                    data: rowData,
                    referrer: 'listings_page'
                  }
                }),
              disabled: rowData.is_variant === '1' || rowData.supplier == null || rowData.store == null
            }) : null,
            
            rowData => rowData.has_variations == '0' ? ({
              icon: () => rowData.has_variations == '0' ? <Edit /> : null,
              tooltip: rowData.has_variations == '0' ? 'Edit listing' : null,
              onClick: (event, rowData) => {                
                props.history.push({
                  pathname: routes.EDIT_LISTING,
                  state: {
                    data: rowData,
                    referrer: 'listings_page'
                  }
                })
              },
              disabled: rowData.has_variations == '1' ? true : false
            }) : null,
            {
              icon: AddListingIcon,
              tooltip: 'Add Listing',
              isFreeAction: true,
              onClick: () =>
                props.history.push({
                  pathname: routes.ADD_LISTING,
                  state: {
                    referrer: 'listings_page'
                  }
                })
            },
            // {
            //   icon: ImportCSVIcon,
            //   tooltip: 'Import CSV',
            //   isFreeAction: true,
            //   onClick: () => {
            //     dialog.showOpenDialog({ properties: ['openFile'] }, file => {
            //       if (file !== undefined) {
            //         ipcRenderer.send('stream-csv-file', file);
            //       }
            //     });
            //   }
            // }
          ]}
          editable={{
            onRowDelete: async oldData => {
              let data = [...state.data];
              // Remove all variations if there are any
              if (oldData.has_variations === '1') {
                data = data.filter(
                  value => value.parent_listing_id !== oldData.store_id
                );
              }
              data.splice(data.indexOf(oldData), 1);
              setState({ ...state, data });

              ipcRenderer.send('delete-listing', oldData);

              store.addNotification({
                title: 'Successfully deleted',
                message: `Listing ${oldData.item_name} has been successfully deleted!`,
                type: 'success',
                insert: 'bottom',
                container: 'bottom-right',
                animationIn: ['animated', 'fadeIn'],
                animationOut: ['animated', 'fadeOut'],
                dismiss: {
                  duration: 5000,
                  onScreen: true
                }
              });
            }
          }}
        />

        {logsModal.listing !== undefined ? (
          <ListingLogs listing={logsModal.listing} open={logsModal.open} closeModal={closeLogsModal} />
        ) : null}

        <Backdrop open={modalOpen} style={{ zIndex: 1000 }}>
          <Modal
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
            className={classes.paper}
            BackdropProps={{ invisible: true }}
            disableAutoFocus
            disableEnforceFocus
            open={modalOpen}
            onClose={closeModal}
          >
            <Grid container>
              <Grid item xs={12}>
                <Grid container className={classes.gridContainer}>
                  
                  <Grid item xs={12}>
                    <h2 className={classes.h2Modal}>Product title:</h2>
                  </Grid>
                  <Grid item xs={2}>
                    <img src={modal.listing !== undefined ? modal.listing.image : '#'} loading="lazy" style={{ maxWidth: '80px' }} alt=""/>
                  </Grid>
                  <Grid item xs={10}>
                    <h3 className={classes.h3Modal}>{modal.listing !== undefined ? modal.listing.item_name : 'Please wait...'}</h3>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Grid container className={classes.gridContainer}>
                  <Grid item xs={12}>
                    <h2 className={classes.h2Modal}>Listing relationship:</h2>
                  </Grid>
                  <Grid item xs>
                    <Grid container direction="column">
                      <Grid item xs>
                        {modal.listing !== undefined ? (
                        <img style={{ width: '100%' }} src={modal.listing.supplier === 'amazon' ? AmazonLogo : modal.listing.supplier === 'walmart' ? WalmartLogo : modal.listing.supplier === 'aliexpress' ? AliExpressLogo : modal.listing.supplier === 'homedepot' ? HomeDepotLogo : VidaXLLogo } loading="lazy" alt=""/>
                      ) : 'N/A'}
                      </Grid>
                      <Grid item xs>
                          <h4 className={classes.h4Modal}>Supplier</h4>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={3}>
                    <ArrowRightAlt style={{ width: '100%', fontSize: 40 }}/>
                  </Grid>
                  <Grid item xs>
                    <Grid container direction="column">
                      <Grid item xs={12}>
                        {modal.listing !== undefined ? (
                        <img style={{ width: '100%' }} src={modal.listing.store === 'amazon' ? AmazonLogo : EbayLogo} loading="lazy" alt=""/>
                        ) : 'N/A'}
                      </Grid>
                      <Grid item xs={12}>
                        <h4 className={classes.h4Modal}>Selling on</h4>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              {modal.listing !== undefined && modal.listing.disabled ? (
                <Grid item xs={12}>
                  <h2 style={{ color: 'red', fontSize: 20, fontWeight: 900, textAlign: 'center', textTransform: 'uppercase' }}>This listing is NOT being repriced.</h2>
                </Grid>
              ) : null}

              <Grid item xs={12}>
                <Grid container>
                  <Grid item xs={12}>
                    <h2 className={classes.h2Modal}>Pricing:</h2>
                  </Grid>
                  <Grid item xs={3} className={classes.padding5}>
                  <p className={classes.pBuy}>You buy: <span className={classes.spanPrice}>
                  {modal.listing == undefined ? 'N/A' : modal.listing.new_price !== null ? modal.listing.new_price : 'N/A'}</span>
                  </p>   
                  </Grid>
                  
                  <Grid item xs={3} className={classes.padding5}>
                    <p className={classes.pSell}>You sell: <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : modal.listing.refactored_price !== null ? modal.listing.refactored_price : 'N/A'}</span></p>
                  </Grid>

                  <Grid item xs={3} className={classes.padding5}>
                    <p className={classes.pGrossProfit}>Minimum sell price: <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : modal.listing.use_minimum_price == '0' ? 'No' : modal.listing.local_refactor_settings.minimum_price == undefined ? 'No' : modal.listing.local_refactor_settings.minimum_price}</span></p>
                  </Grid>

                  <Grid item xs={3} className={classes.padding5}>
                    <p className={classes.pGrossProfit}>Maximum sell price: <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : modal.listing.use_maximum_price == '0' ? 'No' : modal.listing.local_refactor_settings.maximum_price == undefined ? 'No' : modal.listing.local_refactor_settings.maximum_price}</span></p>
                  </Grid>

                  {modal.listing == undefined ? null : modal.listing.store === 'amazon' ? (
                    modal.listing == undefined ? null : modal.listing.use_global_refactor_settings == '1' ? (
                      <React.Fragment>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>State tax <span className={classes.spanPrice}>
                          {modal.listing == undefined ? 'N/A' : amazonSettings.add_state_tax == '1' ? `${amazonSettings.state_tax_percentage}%` : 'N/A'}
                          </span></p>
                        </Grid>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Amazon fee<span className={classes.spanPrice}>
                          {modal.listing == undefined ? 'N/A' : amazonSettings.add_amazon_fee == '1' ? `${amazonSettings.amazon_fee_percentage}%` : 'N/A'}
                          </span></p>
                        </Grid>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Gross profit <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : amazonSettings.refactor_fixed_sum !== null ? amazonSettings.refactor_fixed_sum : 'N/A'}</span></p>
                        </Grid>
                      </React.Fragment>
                      ) : (
                      <React.Fragment>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>State tax <span className={classes.spanPrice}>
                          {modal.listing == undefined ? 'N/A' : modal.listing.local_refactor_settings.add_state_tax == '1' ? `${modal.listing.local_refactor_settings.state_tax_percentage}%` : 'N/A'}
                          </span></p>
                        </Grid>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Amazon fee<span className={classes.spanPrice}>
                          {modal.listing == undefined ? 'N/A' : modal.listing.local_refactor_settings.add_amazon_fee == '1' ? `${modal.listing.local_refactor_settings.amazon_fee_percentage}%` : 'N/A'}
                          </span></p>
                        </Grid>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Your profit <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : modal.listing.local_refactor_settings.use_refactor_percentage == '1' ? `${modal.listing.local_refactor_settings.refactor_percentage} %` : modal.listing.local_refactor_settings.refactor_fixed_sum}</span></p>
                        </Grid>
                      </React.Fragment>
                    )
                  ) : null}


                  {modal.listing == undefined ? null : modal.listing.store === 'ebay' ? (
                    modal.listing == undefined ? null : modal.listing.use_global_refactor_settings == '1' ? (
                      <React.Fragment>
                        <Grid item xs={4} className={classes.padding5}>
                          <p className={classes.pGrossProfit}>State tax <span className={classes.spanPrice}>
                          {modal.listing == undefined ? 'N/A' : ebaySettings.add_state_tax == '1' ? `${ebaySettings.state_tax_percentage}% ${modal.listing.reprice_breakdown !== null ? `/ ${modal.listing.reprice_breakdown.calculated_state_tax}` : ''}` : 'N/A'}
                          </span></p>
                        </Grid>
                        <Grid item xs={4} className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Ebay fee<span className={classes.spanPrice}>
                          {modal.listing == undefined ? 'N/A' : ebaySettings.add_ebay_fee == '1' ? `${ebaySettings.ebay_fee}% ${modal.listing.reprice_breakdown !== null ? `/ ${modal.listing.reprice_breakdown.calculated_ebay_fee}` : ''}` : 'N/A'}
                          </span></p>
                        </Grid>
                        <Grid item xs={4} className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Your profit <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : modal.listing.reprice_breakdown !== null ? modal.listing.reprice_breakdown.calculated_profit : 'N/A'}</span></p>
                        </Grid>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Paypal fee <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : ebaySettings.add_paypal_fee == '1' ? `${ebaySettings.paypal_fee_percentage}%` : 'N/A'}</span></p>
                        </Grid>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Paypal fixed fee <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : ebaySettings.add_paypal_fee == '1' ? ebaySettings.paypal_fixed_fee : 'N/A'}</span></p>
                        </Grid>

                        {modal.listing !== undefined && ebaySettings.add_paypal_fee == '1' ? (
                          <Grid item xs className={classes.padding5}>
                            <p className={classes.pGrossProfit}>Calculated Paypal fee <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : modal.listing.reprice_breakdown !== null ? modal.listing.reprice_breakdown.calculated_paypal_fees : 'N/A'}</span></p>
                          </Grid>
                        ) : null}
                      </React.Fragment>
                      ) : (
                        <React.Fragment>
                        <Grid item xs={4} className={classes.padding5}>
                          <p className={classes.pGrossProfit}>State tax <span className={classes.spanPrice}>
                          {modal.listing == undefined ? 'N/A' : modal.listing.local_refactor_settings.add_state_tax == '1' ? `${modal.listing.local_refactor_settings.state_tax_percentage}% ${modal.listing.reprice_breakdown !== null ? `/ ${modal.listing.reprice_breakdown.calculated_state_tax}` : ''}` : 'N/A'}
                          </span></p>
                        </Grid>
                        <Grid item xs={4} className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Ebay fee<span className={classes.spanPrice}>
                          {modal.listing == undefined ? 'N/A' : modal.listing.local_refactor_settings.add_ebay_fee == '1' ? `${modal.listing.local_refactor_settings.ebay_fee}% ${modal.listing.reprice_breakdown !== null ? `/ ${modal.listing.reprice_breakdown.calculated_ebay_fee}` : ''}` : 'N/A'}
                          </span></p>
                        </Grid>
                        <Grid item xs={4} className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Your profit <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : modal.listing.reprice_breakdown !== null ? modal.listing.reprice_breakdown.calculated_profit : 'N/A'}</span></p>
                        </Grid>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Paypal fee <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : modal.listing.local_refactor_settings.add_paypal_fee == '1' ? `${modal.listing.local_refactor_settings.paypal_fee_percentage}%` : 'N/A'}</span></p>
                        </Grid>
                        <Grid item xs className={classes.padding5}>
                          <p className={classes.pGrossProfit}>Paypal fixed fee <span className={classes.spanPrice}>{modal.listing == undefined ? 'N/A' : modal.listing.local_refactor_settings.add_paypal_fee == '1' ? modal.listing.local_refactor_settings.paypal_fixed_fee : 'N/A'}</span></p>
                        </Grid>
                      </React.Fragment>
                    )
                  ) : null} 
                  

                  {modal.listing == undefined ? null : modal.listing.product_availability == 'OUT_OF_STOCK' || modal.listing.product_availability == '0' ? (
                    <Grid item xs={12}>
                    <p className={classes.pSmall}>The product is currently out of stock and the price has been increased dramatically in order to prevent people from buying it. Once it comes back in stock, the price will be normalised.</p>
                  </Grid>
                  ) : null}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Grid container>
                  <Grid item xs className={classes.padding5}>
                    <p className={classes.pGrossProfit}>Source product availability: <span className={classes.spanPrice}>
                    {modal.listing == undefined ? 'N/A' : modal.listing.product_availability !== null ? modal.listing.product_availability : 'N/A'}</span>
                    </p>   
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Grid container>
                  <Grid item xs className={classes.padding5}>
                    <p className={classes.pGrossProfit}>Last repriced: <span className={classes.spanPrice}>
                    {modal.listing == undefined ? 'N/A' : modal.listing.last_repriced !== null ? modal.listing.last_repriced : 'N/A'}</span>
                    </p>   
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Modal>
        </Backdrop>
      </div>
    );
  }

  return null;
};

const mapStateToProps = state => ({
  ...state
});

export default compose(
  withRouter,
  connect(mapStateToProps, { setListingsPageRowSize, getListingsAction })
)(ListingsTable);
