import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { CallsScreen } from '@/features/calls/screens/CallsScreen';
import { CommunitiesScreen } from '@/features/communities/screens/CommunitiesScreen';
import { UpdatesScreen } from '@/features/updates/screens/UpdatesScreen';
import { ChatsStack } from '@/navigation/ChatsStack';
import type { MainTabsParamList } from '@/navigation/types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Chats"
      screenOptions={{
        headerStyle: { backgroundColor: '#075E54' },
        headerTintColor: '#FFFFFF',
        tabBarActiveTintColor: '#128C7E',
        tabBarInactiveTintColor: '#667781',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        component={ChatsStack}
        name="Chats"
        options={{ headerShown: false, title: 'Chats', tabBarLabel: 'Chats' }}
      />
      <Tab.Screen
        component={UpdatesScreen}
        name="Updates"
        options={{ title: 'Novedades', tabBarLabel: 'Novedades' }}
      />
      <Tab.Screen
        component={CommunitiesScreen}
        name="Communities"
        options={{ title: 'Comunidades', tabBarLabel: 'Comunidades' }}
      />
      <Tab.Screen
        component={CallsScreen}
        name="Calls"
        options={{ title: 'Llamadas', tabBarLabel: 'Llamadas' }}
      />
    </Tab.Navigator>
  );
}
