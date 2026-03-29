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
import SalesAnalysis from './pages/SalesAnalysis';
import TransactionManager from './pages/TransactionManager';
import CostRecipeManager from './pages/CostRecipeManager';
import Home from './pages/Home';
import SettingsPage from './pages/SettingsPage';
import InvitePage from './pages/InvitePage';
import './index.css';

// HomePage 삭제됨 (Home.tsx로 대체)

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
            <Route path="/invite" element={<InvitePage />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
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
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
export default App;
