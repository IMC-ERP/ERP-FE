import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import type { User } from '@supabase/supabase-js';
import type { OAuthProvider } from './oauthProviders';
import {
  assertSupabaseConfigured,
  getSupabaseRedirectUrl,
  supabase,
  SUPABASE_WEB_CALLBACK_PATH,
} from '../../supabase';

export interface MappedAuthUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const mapSupabaseUser = (supabaseUser: User): MappedAuthUser => ({
  id: supabaseUser.id,
  uid: supabaseUser.id,
  email: supabaseUser.email ?? null,
  displayName:
    supabaseUser.user_metadata?.full_name
    ?? supabaseUser.user_metadata?.name
    ?? supabaseUser.user_metadata?.display_name
    ?? null,
  photoURL:
    supabaseUser.user_metadata?.avatar_url
    ?? supabaseUser.user_metadata?.picture
    ?? null,
});

const readParamFromUrl = (url: URL, key: string) => {
  const searchValue = url.searchParams.get(key);
  if (searchValue) {
    return searchValue;
  }

  const hashValue = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  return new URLSearchParams(hashValue).get(key);
};

export const isSupportedAuthCallbackUrl = (url: URL) => {
  const isNativeCallback =
    url.protocol === 'com.imcerp.coffeeerp:' &&
    url.hostname === 'auth' &&
    url.pathname === '/callback';

  const isWebCallback = url.pathname === SUPABASE_WEB_CALLBACK_PATH;

  return isNativeCallback || isWebCallback;
};

export const completeSupabaseAuthFromUrl = async (rawUrl: string) => {
  const callbackUrl = new URL(rawUrl);

  if (!isSupportedAuthCallbackUrl(callbackUrl)) {
    return false;
  }

  const providerError =
    readParamFromUrl(callbackUrl, 'error_description')
    ?? readParamFromUrl(callbackUrl, 'error');

  if (providerError) {
    throw new Error(providerError);
  }

  const authCode = readParamFromUrl(callbackUrl, 'code');
  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) {
      throw error;
    }

    return true;
  }

  const accessToken = readParamFromUrl(callbackUrl, 'access_token');
  const refreshToken = readParamFromUrl(callbackUrl, 'refresh_token');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    return true;
  }

  return false;
};

export const beginSupabaseOAuthSignIn = async (
  provider: OAuthProvider,
  redirectPath?: string,
) => {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getSupabaseRedirectUrl(redirectPath),
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error('Supabase OAuth URL을 생성하지 못했습니다.');
  }

  if (Capacitor.isNativePlatform()) {
    await Browser.open({
      url: data.url,
      presentationStyle: 'fullscreen',
    });
    return;
  }

  window.location.assign(data.url);
};

export const closeInAppBrowserSafely = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await Browser.close().catch(() => undefined);
};
