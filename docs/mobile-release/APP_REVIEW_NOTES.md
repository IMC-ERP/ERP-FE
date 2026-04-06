# App Review Notes

아래 초안은 App Store Connect의 `App Review Information` 및 Google Play `App access` 설명에 맞춰 수정해서 사용합니다.

## 앱 설명 요약

- 이 앱은 카페/매장 운영자를 위한 ERP 앱입니다.
- 핵심 기능은 로그인 기반 매장 식별, 매출/재고 조회, OCR 기반 영수증 업로드, 설정 및 계정 관리입니다.
- 앱은 백엔드 API와 실시간으로 통신하며, 리뷰 기간 중 운영 서버가 활성화되어 있어야 합니다.

## 리뷰어 접근 정보

- 로그인 방식: Google 계정 기반 로그인
- 테스트 계정 이메일: `<reviewer-account@example.com>`
- 테스트 계정 비밀번호/접근 방법: `<필요 시 입력>`
- 테스트 매장명: `<review store>`

## 리뷰어가 확인할 핵심 경로

1. 로그인 화면에서 Google 로그인 진행
2. 최초 사용자면 회원가입 화면에서 매장 정보 등록
3. 홈/대시보드 확인
4. 재고 관리 화면에서 이미지 업로드 또는 OCR 기능 확인
5. 설정 화면에서 개인정보처리방침, 고객지원, 계정 삭제 요청 경로 확인

## 비고

- 계정 삭제 경로는 앱 내 설정 화면과 공개 URL `/account-deletion`에 모두 제공됩니다.
- 개인정보처리방침 URL: `<production-url>/privacy-policy`
- 고객지원 URL: `<production-url>/support`
- 계정 삭제 URL: `<production-url>/account-deletion`

## Android App Access 초안

- App access required: `Yes`
- Instructions:
  - Launch the app.
  - Sign in with the provided reviewer account.
  - Navigate to Inventory for OCR upload testing.
  - Navigate to Settings > 계정 및 정책 for privacy policy and account deletion access.
