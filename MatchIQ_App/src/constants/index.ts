export const APP_NAME = 'MATCH IQ';
export const APP_TAGLINE = 'Premium Esports Tournaments';
export const UNITY_SCHEME = 'matchiqunity://play';
export const RESULT_SCHEME = 'matchiq://match-result';
/** Installed Unity gameplay APK applicationId */
export const UNITY_ANDROID_PACKAGE = 'com.matchiq.game';
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://rmsurveyai.com/api/v1';

export const ROUTES = {
  Splash: 'Splash',
  Onboarding: 'Onboarding',
  Login: 'Login',
  Register: 'Register',
  OTPVerification: 'OTPVerification',
  ForgotPassword: 'ForgotPassword',
  MainTabs: 'MainTabs',
  Home: 'Home',
  Tournament: 'Tournament',
  Events: 'Events',
  Wallet: 'Wallet',
  Profile: 'Profile',
  TournamentDetails: 'TournamentDetails',
  MatchSelection: 'MatchSelection',
  GameplayLoader: 'GameplayLoader',
  UnityGameplay: 'UnityGameplay',
  CreatePool: 'CreatePool',
  MatchResult: 'MatchResult',
  Victory: 'Victory',
  Defeat: 'Defeat',
  DailyReward: 'DailyReward',
  Missions: 'Missions',
  Leaderboard: 'Leaderboard',
  Friends: 'Friends',
  Clan: 'Clan',
  EditProfile: 'EditProfile',
  Deposit: 'Deposit',
  Withdraw: 'Withdraw',
  TransactionHistory: 'TransactionHistory',
  Store: 'Store',
  Inventory: 'Inventory',
  Notifications: 'Notifications',
  Mail: 'Mail',
  Settings: 'Settings',
  Language: 'Language',
  PrivacyPolicy: 'PrivacyPolicy',
  Terms: 'Terms',
  HelpCenter: 'HelpCenter',
  ContactSupport: 'ContactSupport',
  About: 'About',
  Referral: 'Referral',
  InviteFriends: 'InviteFriends',
  LuckySpin: 'LuckySpin',
  Achievements: 'Achievements',
  BattlePass: 'BattlePass',
  SeasonRewards: 'SeasonRewards',
  RankRewards: 'RankRewards',
  AvatarSelection: 'AvatarSelection',
  FrameSelection: 'FrameSelection',
  Statistics: 'Statistics',
  MatchHistory: 'MatchHistory',
  Loading: 'Loading',
  NoInternet: 'NoInternet',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

export * from './poolRules';
