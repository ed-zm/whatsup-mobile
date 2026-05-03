import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth.jwt';
const AUTH_USER_ID_KEY = 'auth.userId';

export type SecureSession = {
  jwt: string;
  userId: string;
};

export async function saveSecureSession(session: SecureSession) {
  await Promise.all([
    SecureStore.setItemAsync(AUTH_TOKEN_KEY, session.jwt, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
    SecureStore.setItemAsync(AUTH_USER_ID_KEY, session.userId, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  ]);
}

export async function getSecureSession(): Promise<SecureSession | null> {
  const [jwt, userId] = await Promise.all([
    SecureStore.getItemAsync(AUTH_TOKEN_KEY),
    SecureStore.getItemAsync(AUTH_USER_ID_KEY),
  ]);

  if (!jwt || !userId) {
    return null;
  }

  return { jwt, userId };
}

export async function getSecureJwt() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function clearSecureSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_USER_ID_KEY),
  ]);
}
