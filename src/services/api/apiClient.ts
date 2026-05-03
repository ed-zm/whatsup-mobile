import axios from 'axios';
import { Platform } from 'react-native';

import { getSecureJwt } from '@/services/auth/secureAuthStorage';

const DEFAULT_DEV_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '3000';

/**
 * Normalize API base URLs from `.env`:
 * - `EXPO_PUBLIC_API_URL` — used by many projects (see repo `.env`)
 * - `EXPO_PUBLIC_API_BASE_URL` — alternative name we also support
 * Adds `http://` when scheme is omitted (Metro only injects literal env strings).
 *
 * Expo dev: localhost is often wrong on Android emulator/device; overrides above take precedence.
 */
function normalizeExplicitBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

function defaultDevMachineBaseUrl(): string {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_DEV_PORT}`;
  }
  return `http://localhost:${DEFAULT_DEV_PORT}`;
}

function resolveApiBaseUrl(): string {
  const explicit =
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || process.env.EXPO_PUBLIC_API_URL?.trim();

  if (explicit) {
    return normalizeExplicitBaseUrl(explicit);
  }

  if (__DEV__) {
    return defaultDevMachineBaseUrl();
  }

  return `http://localhost:${DEFAULT_DEV_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  console.log('[apiClient] baseURL:', API_BASE_URL);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const jwt = await getSecureJwt();

  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }

  return config;
});
