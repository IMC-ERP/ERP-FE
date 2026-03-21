const PREVIEW_MODE_STORAGE_KEY = 'erp_preview_mode';

export const isPreviewModeEnabled = () => {
  if (typeof window === 'undefined') return false;

  return window.localStorage.getItem(PREVIEW_MODE_STORAGE_KEY) === 'true';
};

export const setPreviewModeEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;

  if (enabled) {
    window.localStorage.setItem(PREVIEW_MODE_STORAGE_KEY, 'true');
    return;
  }

  window.localStorage.removeItem(PREVIEW_MODE_STORAGE_KEY);
};

export const clearPreviewMode = () => {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(PREVIEW_MODE_STORAGE_KEY);
};
