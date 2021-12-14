// @flow
export type HandleOnboardingInfo = {
  action: string,
  settings?: {
    show?: boolean,
    sign_in_amazon?: boolean,
    sign_in_ebay?: boolean,
    add_first_listing?: boolean 
  }
};

export type AccountRow = {
    id: number,
    account: string,
    email: string | null,
    password: string | null,
    status: string | number,
    settings: string | null,
    country: string
};

export type SettingsParsed = {
    show: boolean,
    sign_in_amazon: boolean,
    sign_in_ebay: boolean,
    add_first_listing: boolean 
};
