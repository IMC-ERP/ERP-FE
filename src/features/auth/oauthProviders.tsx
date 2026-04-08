import type { ComponentPropsWithoutRef } from 'react';

export type OAuthProvider = 'apple' | 'google';
export type AuthActionMode = 'login' | 'signup';
export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ['apple', 'google'];

type ProviderConfig = {
  label: string;
  buttonClassName: string;
  idleSpinnerClassName: string;
};

const PROVIDER_CONFIG: Record<OAuthProvider, ProviderConfig> = {
  apple: {
    label: 'Apple',
    buttonClassName: 'bg-slate-900 border-2 border-slate-900 text-white hover:bg-slate-800 hover:border-slate-800',
    idleSpinnerClassName: 'border-slate-500 border-t-white',
  },
  google: {
    label: 'Google',
    buttonClassName: 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
    idleSpinnerClassName: 'border-slate-300 border-t-slate-600',
  },
};

export const getOAuthProviderConfig = (provider: OAuthProvider) => PROVIDER_CONFIG[provider];

export const getOAuthProviderActionLabel = (provider: OAuthProvider, mode: AuthActionMode) => (
  `${PROVIDER_CONFIG[provider].label}로 ${mode === 'login' ? '로그인' : '회원가입'}`
);

export const getOAuthProviderContinueLabel = (provider: OAuthProvider) => (
  `${PROVIDER_CONFIG[provider].label}로 계속하기`
);

export const getOAuthProviderErrorMessage = (provider: OAuthProvider) => (
  provider === 'apple'
    ? 'Apple 인증에 실패했습니다. 다시 시도해주세요.'
    : 'Google 인증에 실패했습니다. 다시 시도해주세요.'
);

export type OAuthProviderButtonProps = ComponentPropsWithoutRef<'button'> & {
  provider: OAuthProvider;
  loading?: boolean;
  label: string;
};
