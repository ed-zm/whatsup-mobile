import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { initLocalDatabase } from '@/database';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useAuthStore } from '@/store/auth.store';

export default function App() {
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  useEffect(() => {
    void Promise.all([
      initLocalDatabase(),
      useAuthStore.getState().hydrateSession(),
    ]).then(() => setIsDatabaseReady(true));
  }, []);

  if (!isDatabaseReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#25D366" size="large" />
      </View>
    );
  }

  return (
    <>
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    alignItems: 'center',
    backgroundColor: '#0B141A',
    flex: 1,
    justifyContent: 'center',
  },
});
