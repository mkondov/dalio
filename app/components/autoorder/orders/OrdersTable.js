/* eslint react/destructuring-assignment: 0 */
/* eslint no-shadow: 0 */
/* eslint react/prop-types: 0 */
/* eslint react/jsx-boolean-value: 0 */
/* eslint no-nested-ternary: 0 */
/* eslint eqeqeq: 0 */
/* eslint arrow-body-style: 0 */
/* eslint object-shorthand: 0 */
/* eslint no-plusplus: 0 */
/* eslint no-unneeded-ternary: 0 */
/* eslint no-else-return: 0 */
// @flow

import React, { useEffect, forwardRef } from 'react';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import MaterialTable from 'material-table';
import { ipcRenderer, shell } from 'electron';
import { connect } from 'react-redux';
import { store } from 'react-notifications-component';
import Modal from '@material-ui/core/Modal';
import Badge from '@material-ui/core/Badge';
import Backdrop from '@material-ui/core/Backdrop';
import Icon from '@material-ui/core/Icon';
import CircularProgress from '@material-ui/core/CircularProgress'; 

import SyncIcon from '@material-ui/icons/Sync';
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
import SpeakerNotes from '@material-ui/icons/SpeakerNotes';
import Assessment from '@material-ui/icons/Assessment';
import ThumbsUpAlt from '@material-ui/icons/ThumbUpAlt';

import OrderLogs from './OrderLogs';
import OrderInfo from './OrderInfo';
import { getOrders } from '../../../actions/ordersAction';

import EbayLogo from '../../../media/logos/ebay-logo.svg';

// TYPES
import type { Order } from '../../../types/OrdersTypes';
import type { Account } from '../../../types/AccountsTypes';
import OrderProgress from './OrderProgress';

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

const StyledBadge = withStyles(() => ({
  badge: {
    background: 'orange',
    color: '#000',
    border: '1px solid #000',
    fontSize: 11,
    fontWeight: 900
  },
}))(Badge);

type OrdersTableProps = {
  orders: Array<Order>,
  loggedInMarketplaces: Array<Account>,
  allAccounts: {
    [key: number]: Account
  },
  ebayOrderSyncStatus: { status: boolean, started_at: string },
  history: {
    push: Function,
    ...
  },
  ...
};

const useStyles = makeStyles(() => ({
  modal: {
    position: 'absolute',
    overflowY: 'auto',
    margin: 'auto',
    color: '#000',
    backgroundColor: '#fff',
    boxShadow: '0px 2px 5px rgba(0,0,0,0.5)',
    border: '1px solid #fff',
    padding: '20px 30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  backdrop: {
    zIndex: 1000
  },
  linkWithImageCell: {
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '5px',
    paddingBottom: '5px'
  }
}));


const OrdersTable = (props: OrdersTableProps) => {
  const classes = useStyles();
  const { orders, loggedInMarketplaces, allAccounts } = props;
  const [state, setState] = React.useState({
    columns: [
      {
        title: 'Image',
        field: 'image',
        editable: 'never',
        filtering: false,
        render: rowData => (
          <img style={{ maxWidth: 80 }} src={rowData.image} alt=""/>
        ),
        headerStyle: {
          padding: 5,
          margin: 'auto',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'center'
        }
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
          textAlign: 'justify'
        }
      },
      {
        title: 'Status',
        field: 'status',
        sorting: true,
        customSort: (a, b) => a.status_code - b.status_code,
        headerStyle: {
          minWidth: '100px',
          padding: 5,
          margin: 'auto',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'center'
        }
      },
      {
        title: 'Source order status',
        field: 'source_order_status',
        sorting: false,
        filtering: false,
        render: rowData => {
          const NA = rowData.source_order_status === null && rowData.source_order_url == null && rowData.supplier_account == null ? true : false;

          if (NA) {
            return 'N/A';
          } else {
            return (
              <div>
                {rowData.supplier_account !== null ? <span>Ordered with: <b>{rowData.supplier_account}</b></span> : ''}
                {rowData.source_order_url !== null ? (
                <button type="button" className="link-buttons-listings" onClick={() => shell.openExternal(rowData.source_order_url)}>
                  {rowData.source_order_status}
                </button>
                ) : null}
              </div>
            )
          }
        },
        headerStyle: {
          minWidth: '100px',
          padding: 5,
          margin: 'auto',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'center'
        }
      },
      {
        title: 'Status code',
        field: 'status_code',
        sorting: true,
        defaultSort: 'asc',
        hidden: true
      },
      {
        title: 'Order number',
        field: 'order_number',
        render: rowData => {

          let logo;

          switch (rowData.store) {
              case 'ebay':
                logo = EbayLogo
                break;
              default:
                logo = EbayLogo
                break;
            }
    

          return <div className={classes.linkWithImageCell}>
            {logo !== undefined ? <img style={{ maxWidth: 50, marginBottom: '10px' }} src={logo} loading="lazy" alt=""/> : null}
            <button
              type="button"
              className="link-buttons-listings"
              onClick={() => shell.openExternal(rowData.store_order_url)}
            >
              {rowData.order_number}
            </button>
            {rowData.buyer_note !== null && rowData.buyer_note !== '' ? (
              <p style={{ fontSize: '12px', background: '#fdfbe8', padding: '5px', fontWeight: 500 }}>{rowData.buyer_note}</p>
            ) : null}

          </div>
        },
        headerStyle: {
          minWidth: '200px',
          padding: 5,
          margin: 'auto',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'center'
        }
      },
      {
        title: 'Date sold',
        field: 'date_sold',
        filtering: false,
        headerStyle: {
          minWidth: '200px',
          padding: 5,
          margin: 'auto',
          textAlign: 'center'
        },
        cellStyle: {
          padding: '4px 10px',
          textAlign: 'justify'
        }
      },
    ],
    data: orders
  });

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modal, setModal] = React.useState({});
  const [windowSize, setWindowSize] = React.useState({
    width: 1200,
    height: 690
  });

  const openModal = (rowData, type) => {    
    setModal({ ...modal, order: rowData, type: type });

    if (type === 'logs') {
      setModalOpen(true);

      // Deep copy the passed order data
      const order = JSON.parse(JSON.stringify(rowData));

      // Deep copy all of the orders from the Redux state
      const orders = [...props.orders];
      
      // Mark the presence of unread logs in the current order
      let hasUnreadLogs = false;

      if (order.logs !== null && order.logs !== '') {
        if (order.logs.length > 0) {
          // If any of the logs of the currently open order has an unread log -> mark it as read
          for (let i = 0; i < order.logs.length; i++) {
            if (!order.logs[i].read) {
              hasUnreadLogs = true;
              order.logs[i].read = true;
            }
          }

          // IF there are unread logs -> update the orders redux state, so the table itself can be updated
          if (hasUnreadLogs && orders.length > 0) {
            for (let o = 0; o < orders.length; o++) {
              if (order.order_number === orders[o].order_number) {
                orders[o] = JSON.parse(JSON.stringify(order));
                orders[o].logs = JSON.stringify(orders[o].logs);
                break;
              }
            }

            props.getOrders(orders);
          }
        }
      }

      ipcRenderer.send('update-order-logs-status', order);
    } else if (type === 'info') {
      setModalOpen(true);
    }

  };

  const closeModal = () => {
    setModalOpen(false);
  };

  useEffect(() => {
    window.addEventListener('resize', e => {
      e.preventDefault();
      setWindowSize({ width: e.target.innerWidth, height: e.target.innerHeight })
    });

    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  }, []);

  /*
   * Set the component state to be equal to the global Redux Store state and
   * re-render only when the Redux state changes
   */
  useEffect(() => {
    setState({ ...state, data: orders });
  }, [orders]);

  // Render the material table
  if (orders !== undefined) {
    return (
      <div id="orders-table">
        <MaterialTable
          title="Your Orders"
          columns={state.columns}
          data={state.data}
          icons={tableIcons}
          options={{
            // actionsColumnIndex: -1,
            headerStyle: {
              backgroundColor: '#fff',
              color: '#d5008d',
              minWidth: '50px',
              fontWeight: 900,
              textAlign: 'center'
            },
            rowStyle: rowData => ({
              backgroundColor: (rowData.status_code !== '2' && (rowData.matched_listing_store_id === null || (rowData.errors !== 0 && rowData.errors !== null))) ? '#EEE' : '#FFF',
              border: (rowData.status_code !== '2' && (rowData.matched_listing_store_id === null || (rowData.errors !== 0 && rowData.errors !== null))) ? '2px solid red' : 'none',
            }),
            emptyRowsWhenPaging: false,
            filtering: true,
            filterCellStyle: {
              paddingLeft: 5,
              paddingRight: 5,
            },
            pageSize: 20,
            pageSizeOptions: [5, 10, 20, 50, 100],
            minBodyHeight: windowSize.height - 250,
            maxBodyHeight: windowSize.height - 200
          }}
          actions={[
            rowData => ({
              icon: () => rowData.being_ordered_at_source == '1' ? <CircularProgress size={20} /> : (rowData.status_code === '1' || rowData.status_code === '2' || rowData.status_code === '3') ? <Icon className="fab fa-amazon" style={{ color: 'green', width: '30px' }} /> : (rowData.errors !== null && rowData.errors !== 0) ? <Icon className="fab fa-amazon" style={{ color: '#ff0000', width: '30px' }} /> : <Icon className="fab fa-amazon" style={{ color: 'orange', width: '30px' }} />, 
              tooltip:  rowData.being_ordered_at_source == '1' ? 'Ordering...' : (rowData.status_code === '1' || rowData.status_code === '2' || rowData.status_code === '3') ? 'This product has been ordered on Amazon' : (rowData.errors !== null && rowData.errors !== 0) ? 'There was an error while ordering this product' : 'This product has not yet been ordered on Amazon',
              disabled: true
            }),


            rowData => rowData.status_code !== '0' && rowData.status_code !== '3' ? ({
              icon: () => rowData.tracking_number == null ? <Icon className="fas fa-shipping-fast" style={{ width: 'initial', color: 'red' }} /> : 
              (rowData.tracking_number !== null && rowData.proxy_tracking_number == null) ? <Badge badgeContent="" color="primary"><Icon className="fas fa-shipping-fast" style={{ width: 'initial', color: 'orange' }} /></Badge> : 
              (rowData.tracking_number !== null && rowData.proxy_tracking_number !== null && rowData.tracking_uploaded == '0') ? <Badge badgeContent="BCE" color="primary"><Icon className="fas fa-truck-loading" style={{ width: 'initial', color: 'orange' }} /></Badge> : 
              (rowData.tracking_number !== null && rowData.proxy_tracking_number !== null && rowData.tracking_uploaded == '1') ? <Icon className="fas fa-truck-loading" style={{ width: 'initial', color: 'green' }} /> : null, 

              tooltip: rowData.tracking_number == null ? 'There is no tracking number' : 
              (rowData.tracking_number !== null && rowData.proxy_tracking_number == null) ? `There is a source tracking number - ${rowData.tracking_number}. You can convert it to a BCE tracking number` : 
              (rowData.tracking_number !== null && rowData.proxy_tracking_number !== null && rowData.tracking_uploaded == '0') ? 'Upload the converted BCE tracking' :
              (rowData.tracking_number !== null && rowData.proxy_tracking_number !== null && rowData.tracking_uploaded == '1') ? 'The converted BCE tracking number has been uploaded' : null,

              disabled: true
            }) : null,


            rowData => ({
              icon: () => rowData.being_marked_as_shipped == '1' ? <CircularProgress size={20} /> : (rowData.status_code === '2' || rowData.status_code === '3') ? <Icon className="fab fa-ebay" style={{ color: 'green', width: '30px' }} /> : <Icon className="fab fa-ebay" style={{ color: 'orange', width: '30px' }} />, 
              tooltip: rowData.being_marked_as_shipped == '1' ? 'Marking as shipped...' : (rowData.status_code === '2' || rowData.status_code === '3')? 'This order has been marked as shipped' : 'This order has not yet been marked as shipped',
              disabled: true
            }),

            rowData => rowData.status_code == '2' || rowData.status_code == '3' ? ({
              icon: () => rowData.leaving_store_feedback == '1' ? <CircularProgress size={20} /> : (rowData.store_feedback === '1') ? <ThumbsUpAlt style={{ color: 'green', width: '30px' }} /> : <ThumbsUpAlt style={{ color: 'orange', width: '30px' }} />, 
              tooltip: rowData.leaving_store_feedback == '1' ? 'Leaving feedback...' : rowData.store_feedback == '1' ? 'Feedback left' : 'Leave feedback',
              onClick: () => { 
                ipcRenderer.send('leave-feedback', [rowData]);
                store.addNotification({
                  title: "Leave feedback action added to queue",
                  message: `Leaving feedback for order with order number ${rowData.order_number} has been added to the queue.`,
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
              },
              disabled: rowData.leaving_store_feedback == '1' || rowData.store_feedback == '1'
            }) : null,

            (rowData: Order) => ({
              icon: () => <Assessment />,
              tooltip: 'Order info',
              onClick: () => {
                const rowDataParsed = JSON.parse(JSON.stringify(rowData));

                openModal(rowDataParsed, 'info');
              },
            }),
            (rowData: Order) => ({
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
              tooltip: 'Order logs',
              onClick: (event, rowData) => {
                const rowDataParsed = JSON.parse(JSON.stringify(rowData));

                if (rowDataParsed.logs !== null && rowDataParsed.logs !== '') {
                  rowDataParsed.logs = JSON.parse(rowData.logs);
                }

                openModal(rowDataParsed, 'logs');
                
              },
              // disabled: (rowData.supplier_url !== null && rowData.supplier_url !== "" && rowData.supplier !== null && rowData.supplier !== "" && rowData.supplier_id !== null && rowData.supplier_id !== "")
            }),
            {
              icon: () => props.ebayOrderSyncStatus.status ? <SyncIcon style={{ color: '#00ff00', animation: `spin 1s linear infinite` }} /> : <SyncIcon/>,
              tooltip: props.ebayOrderSyncStatus.status ? 'Syncing orders...' : 'Sync orders',
              isFreeAction: true,
              onClick: () => {
                if (!props.ebayOrderSyncStatus.status) {
                  ipcRenderer.send('sync-ebay-orders');
                }
              }
            } 
          ]}
          editable={{
            onRowDelete: oldData =>
              new Promise(resolve => {
                setTimeout(() => {
                  resolve();
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
                }, 600);
              })
          }}
          detailPanel={rowData => {
            const localizedMarketplaces: Array<Account> = loggedInMarketplaces.filter((marketplace: Account) => (rowData.supplier_url !== null && rowData.supplier_url.includes('amazon.com') && marketplace.country === 'US') || (rowData.supplier_url !== null && rowData.supplier_url.includes('amazon.co.uk') && marketplace.country === 'UK'));

            console.log('localized markrasras', localizedMarketplaces);

            return <OrderProgress order={rowData} loggedInMarketplaces={loggedInMarketplaces} localizedMarketplaces={localizedMarketplaces} allAccounts={allAccounts} trackingFunds={props.accountStatus.tracking_funds} /> 
          }}
        />

        {modal.order !== undefined ? (
          modal.type === 'logs' ? (
            <Backdrop open={modalOpen} className={classes.backdrop}>
              <OrderLogs order={modal.order} open={modalOpen} closeModal={closeModal} />
            </Backdrop>
          ) : (
            <Backdrop className={classes.backdrop} open={modalOpen}>
              <Modal
                aria-labelledby="edit-order-modal"
                aria-describedby="edit-order-modal"
                className={classes.modal}
                BackdropProps={{ invisible: true }}
                disableAutoFocus
                disableEnforceFocus
                open={modalOpen}
                onClose={closeModal}
                style={{ width: windowSize.width - 200, height: windowSize.height - 200 }}
              >
                <OrderInfo order={modal.order} />
              </Modal>
            </Backdrop>
          )
        ) : null}
      </div>
    );
  }

  return null;
};

const mapStateToProps = state => ({
  ...state
});

export default compose(withRouter, connect(mapStateToProps, { getOrders }))(OrdersTable);
