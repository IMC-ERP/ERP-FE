# iOS Submission Guide

이 문서는 이 저장소 상태를 기준으로 `App Store Connect 제출`까지 가는 순서입니다.

## 1. Xcode 준비

- Mac App Store에서 전체 `Xcode.app` 설치
- `xcode-select`가 Command Line Tools가 아니라 Xcode를 가리키도록 설정
- Apple Developer 계정 로그인

## 2. 프로젝트 열기

```bash
npx cap open ios
```

- Xcode에서 `App` 타깃 선택
- Signing & Capabilities 확인
- Team 지정
- Bundle Identifier 확인: `com.imcerp.coffeeerp`
- Version / Build 확인
- iPhone only 타깃인지 확인

## 3. 제출 전 필수 확인

- `google-services`가 아니라 Supabase OAuth redirect 설정이 운영값으로 완료되어 있어야 함
- `VITE_SUPPORT_EMAIL`이 실제 운영 메일이어야 함
- 운영 웹 URL에서 아래 페이지가 열려야 함
  - `/privacy-policy`
  - `/support`
  - `/account-deletion`
  - `/auth/callback`

## 4. 실기기 확인

- iPhone에서 앱 실행
- Sign in with Apple 확인
- 로그인 후 Home 진입 확인
- Inventory OCR 업로드 확인
- Settings에서 정책/삭제 경로 접근 확인

## 5. Archive 생성

- Xcode 메뉴에서 `Product > Archive`
- Organizer에서 archive 확인

## 6. App Store Connect 입력

- [APP_STORE_CONNECT_METADATA.md](./APP_STORE_CONNECT_METADATA.md) 기준으로 메타데이터 입력
- Privacy Policy URL 입력
- Review account 입력
- 스크린샷 업로드

## 7. TestFlight

- 먼저 내부 테스트 배포
- 로그인 / OCR / 설정 / 계정 삭제 동선 최종 확인

## 8. 제출

- Export Compliance 확인
- App Privacy 답변 입력
- 제출

## 현재 로컬 환경 기준 blocker

- 이 머신은 현재 full Xcode가 없어 `xcodebuild`가 동작하지 않음
- 따라서 iOS Archive / TestFlight / App Store 업로드는 Xcode 설치 후 진행해야 함
