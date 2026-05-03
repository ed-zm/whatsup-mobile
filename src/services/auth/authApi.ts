import { apiClient } from '@/services/api/apiClient';
import type { AuthUser } from '@/store/auth.store';

type GenerateOtpResponse = {
  requestId?: string;
  expiresInSeconds?: number;
};

type VerifyOtpResponse = {
  jwt?: string;
  token?: string;
  accessToken?: string;
  user: AuthUser;
};

export async function generateOtp(phoneNumber: string) {
  const response = await apiClient.post<GenerateOtpResponse>('/auth/send-sms', {
    phoneNumber,
  });
  console.log('response', response);
  return response.data;
}

export async function verifyOtp(phoneNumber: string, code: string) {
  const response = await apiClient.post<VerifyOtpResponse>('/auth/verify-sms', {
    phoneNumber,
    otpCode: code,
  });
  const jwt = response.data.jwt ?? response.data.token ?? response.data.accessToken;

  if (!jwt) {
    throw new Error('Auth API did not return a JWT');
  }

  return {
    jwt,
    user: response.data.user,
  };
}
