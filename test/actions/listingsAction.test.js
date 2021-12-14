import { configureStore } from '../../app/store/configureStore';
// import { getListings } from '../../app/actions/listingsAction';

const store = configureStore();

describe('listingsAction', () => {
  const dummyListings = [
    {
      store_id: 'BWAL_5.980',
      created_at: '2019-08-16 07:10:06',
      has_variations: '0',
      id: 20,
      is_variant: 0,
      item_name:
        'Atkins Gluten Free Protein-Rich Shake, Mocha Latte, Keto Friendly, 4 Count …',
      last_repriced: '2019-08-16 20:35:11',
      new_price: 7.78,
      parent_listing_id: null,
      price: 9.08,
      product_availability: 'IN_STOCK',
      refactored_price: 10.19,
      store_url: 'https://www.amazon.com/dp/B00DKETC5C?ref=myi_title_dp',
      supplier: '1',
      supplier_id: '575402666',
      supplier_url:
        'https://www.walmart.com/ip/Atkins-PLUS-Protein-Fiber-Creamy-Milk-Chocolate-Shake-11-fl-oz-4-pack-Ready-To-Drink/912426669',
      user_email: null
    }
  ];
  it('Store is updated correctly', () => {
    // store.dispatch(getListings(dummyListings));
    const newState = store.getState();
    expect(newState.listings).toBe(dummyListings);
  });
});
