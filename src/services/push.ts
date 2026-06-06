/**
 * Web Push 구독 관리 (프론트)
 *
 * 흐름: 알림 권한 요청 → Service Worker 등록 확인 → 서버에서 VAPID 공개키 받기
 *      → pushManager.subscribe → 구독 정보를 백엔드에 저장.
 * SW의 push/notificationclick 핸들러는 public/sw-push-handler.js 에 있다.
 */

import { notificationsApi } from './api';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/** VAPID 공개키(base64url)를 pushManager가 요구하는 Uint8Array로 변환 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // vite-plugin-pwa가 자동 등록한 SW가 활성화될 때까지 대기
  return navigator.serviceWorker.ready;
}

/** 현재 구독 상태 확인 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await getRegistration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * 알림 켜기: 권한 요청 + 구독 생성 + 서버 저장.
 * 성공 시 true, 권한 거부/미지원 시 false.
 */
export async function enablePush(): Promise<boolean> {
  if (!isPushSupported()) {
    throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg = await getRegistration();

  // 이미 구독돼 있으면 재사용, 없으면 새로 구독
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    const { data } = await notificationsApi.getVapidPublicKey();
    if (!data.publicKey) throw new Error('서버에 VAPID 공개키가 설정되지 않았습니다.');
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
    });
  }

  await notificationsApi.subscribe(subscription.toJSON());
  return true;
}

/** 알림 끄기: 브라우저 구독 해제 + 서버에서 삭제 */
export async function disablePush(): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } finally {
    await notificationsApi.unsubscribe(endpoint);
  }
}
