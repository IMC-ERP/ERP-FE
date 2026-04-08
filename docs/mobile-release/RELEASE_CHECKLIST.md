# Release Checklist

## P0

- `VITE_SUPPORT_EMAIL`을 실제 운영 메일로 교체했다.
- 운영 지원 이메일이 기본 placeholder 값이 아님을 확인했다.
- `VITE_API_URL`을 실제 운영 API로 교체했다.
- `VITE_SUPABASE_URL`을 실제 Supabase 프로젝트 URL로 교체했다.
- `VITE_SUPABASE_ANON_KEY`를 실제 anon key로 교체했다.
- 개인정보처리방침 공개 URL이 실제 배포 URL에서 열린다.
- 고객지원 페이지 공개 URL이 실제 배포 URL에서 열린다.
- 계정 삭제 페이지 공개 URL이 실제 배포 URL에서 열린다.
- Supabase Google provider가 활성화되어 있다.
- Supabase Apple provider가 활성화되어 있다.
- Supabase Auth Redirect URL에 `com.imcerp.coffeeerp://auth/callback`을 등록했다.
- Supabase Auth Redirect URL에 웹 콜백 URL `https://<frontend-domain>/auth/callback`을 등록했다.
- Android 실기기에서 로그인 성공을 확인했다.
- Android 실기기에서 OCR 업로드 성공을 확인했다.
- Android 실기기에서 앱 재실행 후 로그인 유지 여부를 확인했다.
- 계정 삭제 요청 동선이 앱 안에서 접근 가능함을 확인했다.

## P1

- Apple Developer Program 계정이 준비되어 있다.
- full Xcode.app 이 설치되어 있고 `xcodebuild -version`이 정상 동작한다.
- App Store Connect 앱 레코드를 만들었다.
- iOS 타깃이 iPhone only로 정리되어 있고 불필요한 iPad 제출 범위가 제거됐다.
- Play Console 앱 레코드를 만들었다.
- 리뷰용 테스트 계정 또는 데모 모드를 준비했다.
- iOS 심사용 경로에서 `Sign in with Apple` 동작을 확인했다.
- 리뷰 노트에 로그인 방법과 핵심 기능 설명을 적었다.
- Privacy Policy URL을 App Store Connect / Play Console에 입력했다.
- Data safety 문항을 작성했다.
- 앱 아이콘과 스플래시가 최종 브랜딩 자산으로 교체됐다.
- 스크린샷 세트를 만들었다.

## P2

- iOS 실기기에서 로그인, OCR, 백그라운드 복귀를 검증했다.
- Android upload key를 안전한 비밀 저장소에 백업했다.
- Play Console 신규 personal 계정 테스트 요건 여부를 확인했다.
- Supabase Dashboard의 Google / Apple OAuth 설정이 운영 값으로 고정됐다.

## 생성 산출물

- Android signed AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Android upload keystore: `android/coffee-erp-upload.jks`
