const DEFAULT_SUPPORT_EMAIL = 'support@company.example';

export const APP_INFO = {
  appName: 'Coffee ERP',
  companyName: import.meta.env.VITE_COMPANY_NAME || 'Coffee ERP',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL,
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '',
  supportResponseWindow: import.meta.env.VITE_SUPPORT_RESPONSE_WINDOW || '영업일 기준 2~3일 이내',
  privacyPolicyPath: '/privacy-policy',
  supportPath: '/support',
  accountDeletionPath: '/account-deletion',
  effectiveDate: '2026-03-29',
};

export const SUPPORT_EMAIL_IS_PLACEHOLDER = APP_INFO.supportEmail === DEFAULT_SUPPORT_EMAIL;
