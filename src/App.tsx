/**
 * App.tsx - Main Application with React Router
 * GCP-ERP 스타일 적용 + Google 로그인 + 멀티유저 대응
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import './index.css';

// HomePage 삭제됨 (Home.tsx로 대체)

const HelpPage = () => (
  <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-4xl">
          📖
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">도움말 및 가이드</h2>
          <p className="max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
            자주 쓰는 흐름만 빠르게 정리했습니다. 모바일에서는 먼저 메뉴 입력, 거래 조회, 재고 확인, 설정 순서로 점검하면 대부분 바로 해결됩니다.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-800">빠른 시작</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            홈에서 지표를 확인하고, 매출 입력과 거래 데이터 관리에서 데이터 상태를 먼저 검증하세요.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-800">원가/재고 점검</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            재고 관리에서 입고와 재고를 확인하고, 원가/레시피 관리에서 원가율과 재료 단가를 맞추면 됩니다.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-800">모바일 사용 팁</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            표가 좁으면 좌우로 밀어 보고, 상단의 글자 크기와 화면 모드 버튼으로 가독성을 먼저 맞추세요.
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
