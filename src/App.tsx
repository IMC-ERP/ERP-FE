/**
 * App.tsx - Main Application with React Router
 * GCP-ERP 스타일 적용 + Google 로그인 + 멀티유저 대응
 */

import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingGuard from './components/OnboardingGuard';
import OnboardingLayout from './pages/onboarding/OnboardingLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Recipes from './pages/Recipes';
import AIAssistant from './pages/AIAssistant';
import SalesAnalysis from './pages/SalesAnalysis';
import TransactionManager from './pages/TransactionManager';
import CostRecipeManager from './pages/CostRecipeManager';
import Home from './pages/Home';
import SettingsPage from './pages/SettingsPage';
import InvitePage from './pages/InvitePage';
import { startSpotlightTour } from './components/SpotlightTour';
import './index.css';

// HomePage 삭제됨 (Home.tsx로 대체)

const HelpPage = () => {
  const navigate = useNavigate();

  const handleStartTour = (path: string, tourKey: string) => {
    navigate(path);
    // 내비게이션 후 컴포넌트 마운트 및 데이터 로딩 시간을 벌기 위해 충분한 지연 후 이벤트 발송
    setTimeout(() => {
      startSpotlightTour(tourKey);
    }, 400);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-4xl">
            📖
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">도움말 및 가이드</h2>
            <p className="max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
              자주 쓰는 흐름만 빠르게 정리했습니다. 서비스 이용 중 궁금한 점이 있다면 아래 가이드 투어를 다시 실행해 보세요.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            ✨ 핵심 기능 가이드 다시 보기
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => handleStartTour('/', 'home_page')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group bg-white shadow-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">🏠</div>
              <div>
                <div className="font-bold text-slate-800">홈 대시보드</div>
                <div className="text-xs text-slate-500">전체 경영 현황 파악</div>
              </div>
            </button>
            <button
              onClick={() => handleStartTour('/dashboard', 'dashboard_page')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition-all text-left group bg-white shadow-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">💰</div>
              <div>
                <div className="font-bold text-slate-800">경영 현황 분석</div>
                <div className="text-xs text-slate-500">수익성 및 지출 관리</div>
              </div>
            </button>
            <button
              onClick={() => handleStartTour('/inventory', 'inventory_onboarding')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-all text-left group bg-white shadow-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">📦</div>
              <div>
                <div className="font-bold text-slate-800">재고 실무 가이드</div>
                <div className="text-xs text-slate-500">입고 및 재고 실사 방법</div>
              </div>
            </button>
            <button
              onClick={() => handleStartTour('/sales', 'sales_onboarding')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all text-left group bg-white shadow-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">🛒</div>
              <div>
                <div className="font-bold text-slate-800">매출 등록 내역</div>
                <div className="text-xs text-slate-500">수기 입력 및 데이터 조회</div>
              </div>
            </button>
            <button
              onClick={() => handleStartTour('/period', 'sales_analysis_page')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group bg-white shadow-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">📈</div>
              <div>
                <div className="font-bold text-slate-800">매출 심층 분석</div>
                <div className="text-xs text-slate-500">기간별/요일별 추이 분석</div>
              </div>
            </button>
            <button
              onClick={() => handleStartTour('/transactions', 'transaction_manager_page')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group bg-white shadow-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">🧾</div>
              <div>
                <div className="font-bold text-slate-800">거래 데이터 관리</div>
                <div className="text-xs text-slate-500">영수증 스캔 및 거래 검증</div>
              </div>
            </button>
            <button
              onClick={() => handleStartTour('/cost-recipe', 'cost_recipe_page')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group bg-white shadow-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">🥘</div>
              <div>
                <div className="font-bold text-slate-800">원가/레시피 관리</div>
                <div className="text-xs text-slate-500">메뉴별 수익성 최적화</div>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-800">빠른 시작 팁</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              홈에서 지표를 확인하고, 매출 입력과 거래 데이터 관리에서 데이터 상태를 먼저 검증하세요.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-bold text-blue-800">추가 문의</h3>
            <p className="mt-2 text-sm leading-relaxed text-blue-700">
              권한, 데이터 동기화, 계정 문제는 관리자 또는 매장 대표 계정에서 설정 화면을 확인해 주세요.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            {/* 로그인 페이지 (보호 안 함) */}
            <Route path="/login" element={<LoginPage />} />

            {/* 회원가입 페이지 (인증된 상태에서만 접근) */}
            <Route path="/register" element={
              <ProtectedRoute checkRegistration={false}>
                <RegisterPage />
              </ProtectedRoute>
            } />

            {/* 초대 페이지 */}
            <Route path="/invite" element={<InvitePage />} />

            {/* 온보딩 (회원가입 후 초기 설정) */}
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <OnboardingLayout />
              </ProtectedRoute>
            } />

            {/* 메인 앱 (온보딩 미완료 시 자동 리다이렉트) */}
            <Route path="/" element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <Layout />
                </OnboardingGuard>
              </ProtectedRoute>
            }>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="period" element={<SalesAnalysis />} />
              <Route path="transactions" element={<TransactionManager />} />
              <Route path="sales" element={<Sales />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="cost-recipe" element={<CostRecipeManager />} />
              <Route path="recipes" element={<Recipes />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="ai" element={<AIAssistant />} />
            </Route>

            {/* 404 → 로그인으로 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
export default App;
