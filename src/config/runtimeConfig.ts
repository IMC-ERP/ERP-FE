const DEFAULT_PRODUCTION_API_URL = 'https://coffee-erp-backend-427178764915.asia-northeast3.run.app/api';
const DEFAULT_DEVELOPMENT_API_URL = 'http://localhost:8000/api';
const IS_PRODUCTION_BUILD = !import.meta.env.DEV;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const normalizeApiBaseUrl = (rawUrl?: string) => {
  if (!rawUrl) {
    return import.meta.env.DEV ? DEFAULT_DEVELOPMENT_API_URL : DEFAULT_PRODUCTION_API_URL;
  }

  try {
    const url = new URL(rawUrl);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/api';
    }

    return trimTrailingSlash(url.toString());
  } catch {
    const trimmed = trimTrailingSlash(rawUrl);
    if (!trimmed) {
      return import.meta.env.DEV ? DEFAULT_DEVELOPMENT_API_URL : DEFAULT_PRODUCTION_API_URL;
    }

    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
};

const blockingIssues = [
  !import.meta.env.VITE_SUPABASE_URL && 'Supabase 프로젝트 URL이 설정되지 않았습니다.',
  !import.meta.env.VITE_SUPABASE_ANON_KEY && 'Supabase anon key가 설정되지 않았습니다.',
  IS_PRODUCTION_BUILD && !import.meta.env.VITE_API_URL && '운영 API 주소가 설정되지 않았습니다.',
].filter(Boolean) as string[];

const warningIssues = [
  !import.meta.env.VITE_SUPPORT_EMAIL && '지원 이메일이 지정되지 않아 기본 지원 주소가 표시됩니다.',
].filter(Boolean) as string[];

export const runtimeConfig = {
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_URL),
  blockingIssues,
  warningIssues,
  hasBlockingIssues: blockingIssues.length > 0,
};
