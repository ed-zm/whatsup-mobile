import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PhoneInputScreen } from '@/features/auth/screens/PhoneInputScreen';
import { VerifyOtpScreen } from '@/features/auth/screens/VerifyOtpScreen';
import type { AuthStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: '#FFFFFF' },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen
        component={PhoneInputScreen}
        name="PhoneInput"
        options={{ title: 'Ingresa tu telefono' }}
      />
      <Stack.Screen
        component={VerifyOtpScreen}
        name="VerifyOtp"
        options={{ title: 'Verifica tu numero' }}
      />
    </Stack.Navigator>
  );
}
