import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChatListScreen } from '@/features/chats/screens/ChatListScreen';
import { ChatRoomScreen } from '@/features/chats/screens/ChatRoomScreen';
import type { ChatsStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<ChatsStackParamList>();

export function ChatsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#075E54' },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen component={ChatListScreen} name="ChatList" options={{ title: 'Chats' }} />
      <Stack.Screen
        component={ChatRoomScreen}
        name="ChatRoom"
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
