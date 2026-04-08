import type { SVGProps } from 'react';
import { getOAuthProviderConfig, type OAuthProviderButtonProps } from '../../features/auth/oauthProviders';

const GoogleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AppleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M16.37 12.2c.01 2.64 2.31 3.52 2.34 3.53-.02.06-.37 1.27-1.22 2.51-.73 1.07-1.49 2.14-2.69 2.16-1.18.02-1.56-.7-2.91-.7-1.36 0-1.78.68-2.88.72-1.15.04-2.02-1.15-2.76-2.21-1.5-2.16-2.65-6.11-1.11-8.8.76-1.33 2.13-2.17 3.62-2.19 1.13-.02 2.2.76 2.91.76.7 0 2.01-.94 3.39-.8.58.02 2.22.24 3.27 1.77-.09.05-1.95 1.14-1.96 3.25ZM14.82 5.16c.61-.74 1.02-1.77.91-2.8-.88.04-1.95.59-2.58 1.33-.57.66-1.07 1.72-.93 2.73.98.08 1.99-.5 2.6-1.26Z" />
  </svg>
);

export default function OAuthProviderButton({
  provider,
  loading = false,
  label,
  className = '',
  disabled,
  ...props
}: OAuthProviderButtonProps) {
  const config = getOAuthProviderConfig(provider);
  const Icon = provider === 'apple' ? AppleIcon : GoogleIcon;

  return (
    <button
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonClassName} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <div className={`h-5 w-5 animate-spin rounded-full border-2 ${config.idleSpinnerClassName}`} />
      ) : (
        <Icon className={`h-5 w-5 ${provider === 'apple' ? 'fill-current' : ''}`} />
      )}
      <span>{loading ? '인증 중...' : label}</span>
    </button>
  );
}
