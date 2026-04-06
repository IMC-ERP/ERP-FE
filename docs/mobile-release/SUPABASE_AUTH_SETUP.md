# Supabase Auth Setup

## Supabase Dashboard

- Auth > Providers에서 Google provider를 활성화
- Google Cloud OAuth client를 연결
- Redirect URL 허용 목록에 아래 두 값을 추가
  - `com.imcerp.coffeeerp://auth/callback`
  - `https://<frontend-domain>/auth/callback`

## Frontend Env

- `.env.local` 또는 배포 환경에 아래 값을 설정
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_URL`

## Native Deep Link

- Android package / iOS bundle ID: `com.imcerp.coffeeerp`
- Android와 iOS 모두 `com.imcerp.coffeeerp://auth/callback` 스킴을 처리하도록 설정되어 있음

## 확인 항목

- `npx cap sync` 실행
- Android 실기기에서 Google 로그인 확인
- iOS는 Xcode 설치 후 signing 설정과 함께 실기기 로그인 확인

## 참고

- Android upload key 파일: `android/coffee-erp-upload.jks`
- Android release bundle: `android/app/build/outputs/bundle/release/app-release.aab`
