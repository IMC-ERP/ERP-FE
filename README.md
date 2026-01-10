# IMC-ERP Frontend

React + TypeScript + Vite 기반의 커피 ERP 시스템 프론트엔드

## 기술 스택

- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빠른 개발 서버 및 빌드 도구
- **React Router** - 클라이언트 사이드 라우팅
- **Axios** - HTTP 클라이언트
- **Recharts** - 데이터 시각화
- **Lucide React** - 아이콘 라이브러리

## 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

개발 서버가 시작되면 브라우저에서 http://localhost:5173 으로 접속할 수 있습니다.

### 3. 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

### 4. 프로덕션 미리보기

```bash
npm run preview
```

### 5. 린트 검사

```bash
npm run lint
```

## 주요 기능

- **대시보드** - 판매 현황, 재고 상태, 주요 지표 시각화
- **판매 관리** - 판매 데이터 조회 및 관리
- **재고 관리** - 원자재 재고 추적 및 관리
- **레시피 관리** - 제품 레시피 및 BOM 관리
- **AI 어시스턴트** - AI 기반 데이터 분석 및 조회

## 프로젝트 구조

```
frontend/
├── src/
│   ├── main.tsx              # 앱 진입점
│   ├── App.tsx               # 메인 앱 컴포넌트 및 라우팅
│   ├── components/           # 재사용 가능한 컴포넌트
│   │   ├── Layout/
│   │   │   ├── Layout.tsx    # 메인 레이아웃
│   │   │   └── Sidebar.tsx   # 사이드바 네비게이션
│   │   └── Dashboard/
│   │       └── MetricCard.tsx # 대시보드 메트릭 카드
│   ├── pages/                # 페이지 컴포넌트
│   │   ├── Dashboard.tsx     # 대시보드 페이지
│   │   ├── Sales.tsx         # 판매 관리 페이지
│   │   ├── Inventory.tsx     # 재고 관리 페이지
│   │   ├── Recipes.tsx       # 레시피 관리 페이지
│   │   └── AIAssistant.tsx   # AI 어시스턴트 페이지
│   └── services/
│       └── api.ts            # API 클라이언트 설정
├── public/                   # 정적 파일
├── index.html               # HTML 템플릿
├── vite.config.ts           # Vite 설정
├── tsconfig.json            # TypeScript 설정
└── package.json             # 프로젝트 메타데이터

```

## API 연동

백엔드 API와 통신하기 위해 [src/services/api.ts](src/services/api.ts)에서 Axios 인스턴스를 설정합니다.

기본 API 주소: `http://localhost:8000`

백엔드 서버가 다른 포트나 주소에서 실행 중이라면 [api.ts](src/services/api.ts:4)의 `baseURL`을 수정하세요.

## 개발 가이드

### 새 페이지 추가하기

1. `src/pages/` 폴더에 새 컴포넌트 파일 생성
2. [src/App.tsx](src/App.tsx)에 라우트 추가
3. 필요시 [src/components/Layout/Sidebar.tsx](src/components/Layout/Sidebar.tsx)에 네비게이션 항목 추가

### 새 API 엔드포인트 호출하기

[src/services/api.ts](src/services/api.ts)에서 Axios 인스턴스를 import하여 사용:

```typescript
import api from '../services/api';

const fetchData = async () => {
  const response = await api.get('/api/endpoint');
  return response.data;
};
```

### 스타일링

각 컴포넌트는 별도의 CSS 파일을 가지고 있습니다. 전역 스타일은 [src/index.css](src/index.css)에 정의되어 있습니다.

## 환경 설정

개발 환경에 따라 `.env.local` 파일을 생성하여 환경 변수를 설정할 수 있습니다:

```bash
VITE_API_URL=http://localhost:8000
```

환경 변수는 코드에서 `import.meta.env.VITE_API_URL`로 접근할 수 있습니다.

## 트러블슈팅

### API 연결 실패
```
Network Error / CORS Error
```
- 백엔드 서버가 실행 중인지 확인
- 백엔드의 CORS 설정에 프론트엔드 주소가 포함되어 있는지 확인
- [api.ts](src/services/api.ts)의 baseURL이 올바른지 확인

### 포트 충돌
```
Port 5173 is already in use
```
- 5173 포트가 이미 사용 중인 경우 다른 포트 사용:
  ```bash
  npm run dev -- --port 3000
  ```

### 빌드 오류
```
TypeScript errors
```
- 타입 오류를 먼저 해결:
  ```bash
  npx tsc --noEmit
  ```

## 라이선스

MIT
