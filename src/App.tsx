/**
 * App.tsx - Main Application with React Router
 * GCP-ERP 스타일 적용
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { Lock } from 'lucide-react';
import { authApi } from './services/api';
import Layout from './components/Layout/Layout';
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

// ... (HomePage, HelpPage 생략 - 기존 코드 유지)

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

// Placeholder Pages

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('erp_auth') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');

    if (!passcode) {
      setPasscodeError('패스코드를 입력해주세요.');
      return;
    }

    try {
      const res = await authApi.verifyPasscode(passcode);
      if (res.data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem('erp_auth', 'true');
      } else {
        setPasscodeError('패스코드가 올바르지 않습니다.');
      }
    } catch (err) {
      console.error('Passcode verification error:', err);
      setPasscodeError('인증 중 오류가 발생했습니다.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-100">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
              <Lock size={36} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            카피앤드 대표님 어서오세요! 👋
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            안전한 데이터 관리를 위해<br />
            설정된 패스코드를 입력해주세요.
          </p>

          <form onSubmit={handlePasscodeSubmit}>
            <div className="relative mb-6">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all text-center text-2xl tracking-[0.5em] font-bold text-slate-700 placeholder-slate-300 bg-slate-50 focus:bg-white shadow-inner"
                placeholder=""
                maxLength={4}
                autoFocus
              />
            </div>

            {passcodeError && (
              <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center justify-center gap-2 animate-pulse">
                <span>⚠️</span> {passcodeError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
            >
              입장하기
            </button>
          </form>

          <div className="mt-8 text-xs text-slate-400">
            Powered by IMC-ERP System
          </div>
        </div>
      </div>
    );
  }

  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
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
  );
}

export default App;
