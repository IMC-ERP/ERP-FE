/**
 * Supabase Configuration
 * 웹/앱 공통 OAuth 콜백을 지원하는 Supabase 초기화
 */

import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder-anon-key';

export const SUPABASE_WEB_CALLBACK_PATH = '/auth/callback';
export const SUPABASE_NATIVE_REDIRECT_URL = 'com.imcerp.coffeeerp://auth/callback';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const assertSupabaseConfigured = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 설정이 누락되었습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인해주세요.');
  }
};

export const getSupabaseRedirectUrl = (redirectPath: string = SUPABASE_WEB_CALLBACK_PATH) => {
  if (Capacitor.isNativePlatform()) {
    return SUPABASE_NATIVE_REDIRECT_URL;
  }

  if (typeof window === 'undefined') {
    return redirectPath;
  }

  if (/^https?:\/\//.test(redirectPath)) {
    return redirectPath;
  }

  const normalizedPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
  return new URL(normalizedPath, window.location.origin).toString();
};

if (!isSupabaseConfigured) {
  console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(
  supabaseUrl ?? FALLBACK_SUPABASE_URL,
  supabaseAnonKey ?? FALLBACK_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
