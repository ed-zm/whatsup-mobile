import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  PhoneInput: undefined;
  VerifyOtp: {
    phoneNumber: string;
  };
};

export type MainTabsParamList = {
  Chats: NavigatorScreenParams<ChatsStackParamList>;
  Updates: undefined;
  Communities: undefined;
  Calls: undefined;
};

export type ChatsStackParamList = {
  ChatList: undefined;
  ChatRoom: {
    chatId: string;
    title: string;
  };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabsParamList>;
};
