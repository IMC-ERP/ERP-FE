/**
 * App.tsx - Main Application with React Router
 * GCP-ERP 스타일 적용 + Google 로그인 + 멀티유저 대응
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Recipes from './pages/Recipes';
import AIAssistant from './pages/AIAssistant';
import PeriodAnalysis from './pages/PeriodAnalysis';
import TransactionManager from './pages/TransactionManager';
import CostRecipeManager from './pages/CostRecipeManager';
import SettingsPage from './pages/SettingsPage';
import './index.css';

const HomePage = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 rounded-2xl text-white">
      <h1 className="text-3xl font-bold mb-2">☕ Coffee ERP에 오신 것을 환영합니다!</h1>
      <p className="text-amber-100">좌측 메뉴에서 원하시는 기능을 선택해주세요.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-3xl mb-3">📊</div>
        <h3 className="font-bold text-slate-800 mb-2">경영 현황</h3>
        <p className="text-sm text-slate-500">실시간 수익성 분석과 공과금 관리</p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-3xl mb-3">📈</div>
        <h3 className="font-bold text-slate-800 mb-2">매출 분석</h3>
        <p className="text-sm text-slate-500">기간별, 상품별 매출 트렌드 분석</p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-3xl mb-3">📦</div>
        <h3 className="font-bold text-slate-800 mb-2">재고 관리</h3>
        <p className="text-sm text-slate-500">AI 기반 재고 예측 및 발주 관리</p>
      </div>
    </div>
  </div>
);

const HelpPage = () => (
  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col justify-center items-center animate-fade-in">
    <div className="text-6xl mb-4">📖</div>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">도움말 및 가이드</h2>
    <p className="text-slate-500 max-w-md">
      ERP 시스템 사용에 어려움이 있으신가요? <br />
      관리자에게 문의해주세요.
    </p>
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

            {/* 보호된 라우트들 */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<HomePage />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="period" element={<PeriodAnalysis />} />
              <Route path="transactions" element={<TransactionManager />} />
              <Route path="sales" element={<Sales />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="cost-recipe" element={<CostRecipeManager />} />
              <Route path="recipes" element={<Recipes />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="ai" element={<AIAssistant />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
export default App;
