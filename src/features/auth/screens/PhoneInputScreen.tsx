import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AuthStackParamList } from '@/navigation/types';
import { generateOtp } from '@/services/auth/authApi';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneInput'>;

export function PhoneInputScreen({ navigation }: Props) {
  const [countryCode, setCountryCode] = useState('+52');
  const [localNumber, setLocalNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phoneNumber = `${countryCode}${localNumber.replace(/\D/g, '')}`;
  const canSubmit = countryCode.trim().length > 1 && localNumber.replace(/\D/g, '').length >= 8;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await generateOtp(phoneNumber);
      navigation.navigate('VerifyOtp', { phoneNumber });
    } catch (error) {
      console.log('generateOtp error', error);
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Ingresa tu numero de telefono</Text>
        <Text style={styles.description}>
          WhatsUp necesitara verificar tu numero de telefono. El operador puede aplicar cargos por
          SMS.
        </Text>

        <View style={styles.countryRow}>
          <Text style={styles.countryLabel}>Pais</Text>
          <Text style={styles.countryValue}>Mexico</Text>
        </View>

        <View style={styles.phoneRow}>
          <TextInput
            keyboardType="phone-pad"
            onChangeText={setCountryCode}
            placeholder="+52"
            style={styles.countryCodeInput}
            value={countryCode}
          />
          <TextInput
            autoFocus
            keyboardType="phone-pad"
            onChangeText={setLocalNumber}
            placeholder="Numero de telefono"
            style={styles.phoneInput}
            value={localNumber}
          />
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          disabled={!canSubmit || isSubmitting}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.button,
            (!canSubmit || isSubmitting || pressed) && styles.buttonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#0B141A" />
          ) : (
            <Text style={styles.buttonText}>Siguiente</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const isNetwork =
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      (!error.response && !!error.request);

    if (isNetwork) {
      return 'Sin conexion al servidor. Revisa EXPO_PUBLIC_API_URL (o EXPO_PUBLIC_API_BASE_URL) en `.env`, que el backend escuche en esa IP/puerto, y reinicia Expo.';
    }

    return error.response?.data?.message ?? 'No pudimos enviar el codigo. Intentalo de nuevo.';
  }

  return 'No pudimos enviar el codigo. Revisa tu conexion e intentalo de nuevo.';
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#25D366',
    borderRadius: 24,
    marginTop: 32,
    minWidth: 132,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#0B141A',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  content: {
    padding: 24,
  },
  countryCodeInput: {
    borderBottomColor: '#00A884',
    borderBottomWidth: 1.5,
    color: '#111B21',
    fontSize: 18,
    marginRight: 16,
    paddingVertical: 8,
    textAlign: 'center',
    width: 72,
  },
  countryLabel: {
    color: '#667781',
    fontSize: 14,
  },
  countryRow: {
    borderBottomColor: '#00A884',
    borderBottomWidth: 1.5,
    marginTop: 32,
    paddingBottom: 10,
  },
  countryValue: {
    color: '#111B21',
    fontSize: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  description: {
    color: '#667781',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#D93025',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  phoneInput: {
    borderBottomColor: '#00A884',
    borderBottomWidth: 1.5,
    color: '#111B21',
    flex: 1,
    fontSize: 18,
    paddingVertical: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  title: {
    color: '#111B21',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
