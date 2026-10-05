export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Stats: undefined;
  Insights: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  TransactionForm: { id?: string };
  Categories: undefined;
  Wallets: undefined;
};
