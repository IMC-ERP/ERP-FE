const PREVIEW_MODE_STORAGE_KEY = 'erp_preview_mode';
const PREVIEW_MODE_EVENT = 'erp:preview-mode-changed';

const isIpHost = (hostname: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

export const isPreviewHost = () => {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  return (
    import.meta.env.DEV ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    isIpHost(hostname)
  );
};

const emitPreviewModeChange = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PREVIEW_MODE_EVENT));
};

export const isPreviewModeEnabled = () => {
  if (typeof window === 'undefined' || !isPreviewHost()) return false;

  return window.localStorage.getItem(PREVIEW_MODE_STORAGE_KEY) === 'true';
};

export const setPreviewModeEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;

  if (!isPreviewHost()) {
    window.localStorage.removeItem(PREVIEW_MODE_STORAGE_KEY);
    emitPreviewModeChange();
    return;
  }

  if (enabled) {
    window.localStorage.setItem(PREVIEW_MODE_STORAGE_KEY, 'true');
    emitPreviewModeChange();
    return;
  }

  window.localStorage.removeItem(PREVIEW_MODE_STORAGE_KEY);
  emitPreviewModeChange();
};

export const clearPreviewMode = () => {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(PREVIEW_MODE_STORAGE_KEY);
  emitPreviewModeChange();
};

export const subscribePreviewMode = (callback: () => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PREVIEW_MODE_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener(PREVIEW_MODE_EVENT, callback);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(PREVIEW_MODE_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
  };
};
