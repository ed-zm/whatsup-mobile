import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { useRef, useState } from 'react';
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
import { verifyOtp } from '@/services/auth/authApi';
import { useAuthStore } from '@/store/auth.store';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

const OTP_LENGTH = 6;

export function VerifyOtpScreen({ route }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signIn = useAuthStore((state) => state.signIn);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => code[index] ?? '');
  const canSubmit = code.length === OTP_LENGTH;

  const handleVerifyOtp = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const session = await verifyOtp(route.params.phoneNumber, code);
      await signIn(session);
    } catch (error) {
      setErrorMessage(getVerifyErrorMessage(error));
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
        <Text style={styles.title}>Verificando tu numero</Text>
        <Text style={styles.description}>
          Esperando detectar automaticamente un SMS enviado a {route.params.phoneNumber}.
        </Text>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
          {digits.map((digit, index) => (
            <View key={index} style={[styles.otpCell, digit && styles.otpCellFilled]}>
              <Text style={styles.otpDigit}>{digit}</Text>
            </View>
          ))}
        </Pressable>

        <TextInput
          ref={inputRef}
          autoFocus
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          style={styles.hiddenInput}
          textContentType="oneTimeCode"
          value={code}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          disabled={!canSubmit || isSubmitting}
          onPress={handleVerifyOtp}
          style={({ pressed }) => [
            styles.button,
            (!canSubmit || isSubmitting || pressed) && styles.buttonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#0B141A" />
          ) : (
            <Text style={styles.buttonText}>Verificar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function getVerifyErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? 'El codigo no es valido o expiro.';
  }

  return 'No pudimos verificar el codigo. Intentalo de nuevo.';
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
    alignItems: 'center',
    padding: 24,
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
    marginTop: 20,
    textAlign: 'center',
  },
  hiddenInput: {
    height: 1,
    opacity: 0,
    width: 1,
  },
  otpCell: {
    alignItems: 'center',
    borderBottomColor: '#00A884',
    borderBottomWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 34,
  },
  otpCellFilled: {
    borderBottomColor: '#128C7E',
  },
  otpDigit: {
    color: '#111B21',
    fontSize: 24,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 36,
  },
  title: {
    color: '#111B21',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
