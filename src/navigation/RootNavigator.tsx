import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';

import { useAuthStore } from '@/store/auth.store';

import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initialRouteName = useMemo(
    () => (isAuthenticated ? 'Main' : 'Auth'),
    [isAuthenticated],
  );

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        {isAuthenticated ? (
          <Stack.Screen component={MainTabs} name="Main" />
        ) : (
          <Stack.Screen component={AuthStack} name="Auth" />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
