// @flow

export type CrediCardObjectType = {
  display_name: string,
  card_number: string,
  number_tail: string,
  expiry_date: string
};

export type Account = {
  id: number,
  account: 'dalio' | 'ebay_us' | 'ebay_uk' | 'ebay_ca' | 'ebay_de' | 'ebay_it' | 'autoorder_amazon_us' | 'autoorder_amazon_uk',
  cookies_content: string,
  country: 'US' | 'UK' | 'CA' | 'DE' | 'FR' | 'IT' | 'ES',
  email: string,
  has_cookie_file: boolean,
  has_valid_cookies: boolean,
  password: string,
  settings: {
    payment_methods: {
      credit_cards: Array<CrediCardObjectType>,
      gift_card_balance: string
    }
  },
  status: string
};