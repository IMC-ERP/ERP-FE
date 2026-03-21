/**
 * App.tsx - Main Application with React Router
 * Auth + ERP Layout + AI 코파일럿 라우트 통합
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Recipes from './pages/Recipes';
import PeriodAnalysis from './pages/PeriodAnalysis';
import TransactionManager from './pages/TransactionManager';
import CostRecipeManager from './pages/CostRecipeManager';
import SettingsPage from './pages/SettingsPage';
import './index.css';

const AIAssistant = lazy(() => import('./pages/AIAssistant'));

const HomePage = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 sm:p-6 md:p-8 rounded-2xl text-white">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">☕ Coffee ERP에 오신 것을 환영합니다!</h1>
      <p className="text-amber-100">좌측 메뉴에서 원하시는 기능을 선택해주세요.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-3xl mb-3">📊</div>
        <h3 className="font-bold text-slate-800 mb-2">경영 현황</h3>
        <p className="text-sm text-slate-500">실시간 수익성 분석과 공과금 관리</p>
      </div>
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-3xl mb-3">📈</div>
        <h3 className="font-bold text-slate-800 mb-2">매출 분석</h3>
        <p className="text-sm text-slate-500">기간별, 상품별 매출 트렌드 분석</p>
      </div>
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-3xl mb-3">📦</div>
        <h3 className="font-bold text-slate-800 mb-2">재고 관리</h3>
        <p className="text-sm text-slate-500">AI 기반 재고 예측 및 발주 관리</p>
      </div>
    </div>
  </div>
);

const HelpPage = () => (
  <div className="p-5 sm:p-6 md:p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm min-h-[320px] md:min-h-[400px] flex flex-col justify-center items-center animate-fade-in">
    <div className="text-6xl mb-4">📖</div>
    <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">도움말 및 가이드</h2>
    <p className="text-slate-500 max-w-md">
      ERP 시스템 사용에 어려움이 있으신가요? <br />
      관리자에게 문의해주세요.
    </p>
  </div>
);

const KPIPage = () => {
  const { sales } = useData();

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.revenue, 0);
  const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

  const topMenuEntry = Object.entries(
    sales.reduce((acc, sale) => {
      const currentValue = acc[sale.itemDetail] || 0;
      acc[sale.itemDetail] = currentValue + sale.revenue;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a)[0];

  const weekdayEntry = Object.entries(
    sales.reduce((acc, sale) => {
      const currentValue = acc[sale.dayOfWeek] || 0;
      acc[sale.dayOfWeek] = currentValue + sale.revenue;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a)[0];

  const latestDates = [...new Set(sales.map(sale => sale.date))].sort().slice(-7);
  const recentRevenue = sales
    .filter(sale => latestDates.includes(sale.date))
    .reduce((sum, sale) => sum + sale.revenue, 0);

  const cards = [
    { title: '누적 매출', value: `${Math.round(totalRevenue).toLocaleString()}원`, desc: '현재 적재된 매출 데이터 기준' },
    { title: '평균 객단가', value: `${Math.round(avgTicket).toLocaleString()}원`, desc: '거래 1건당 평균 매출' },
    { title: '베스트 메뉴', value: topMenuEntry?.[0] || '데이터 없음', desc: topMenuEntry ? `${Math.round(topMenuEntry[1]).toLocaleString()}원 매출` : '판매 데이터가 부족합니다' },
    { title: '강한 요일', value: weekdayEntry?.[0] || '데이터 없음', desc: weekdayEntry ? `${Math.round(weekdayEntry[1]).toLocaleString()}원 매출` : '요일 데이터가 부족합니다' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5 md:space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
        <div className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">KPI Overview</div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">핵심 지표 현황</h2>
        <p className="text-sm md:text-base text-slate-500 leading-relaxed">
          누적 매출, 객단가, 베스트 메뉴, 강한 요일을 한 화면에서 확인할 수 있도록 요약했습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="text-xs font-bold tracking-[0.16em] uppercase text-slate-400 mb-2">{card.title}</div>
            <div className="text-xl font-bold text-slate-800">{card.value}</div>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-2">최근 7일 매출</h3>
          <p className="text-2xl font-bold text-blue-600">{Math.round(recentRevenue).toLocaleString()}원</p>
          <p className="text-sm text-slate-500 mt-2">최신 매출일 기준 최근 7개 날짜를 묶어 계산했습니다.</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-2">권장 다음 액션</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            KPI는 단독 분석보다 경영 현황, 매출 분석, AI 코파일럿 화면과 함께 볼 때 의미가 큽니다. 지금은 이 요약을 기준으로 상세 화면으로 바로 이어서 보는 흐름이 가장 적합합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/register"
              element={(
                <ProtectedRoute checkRegistration={false}>
                  <RegisterPage />
                </ProtectedRoute>
              )}
            />

            <Route
              path="/"
              element={(
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<HomePage />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="period" element={<PeriodAnalysis />} />
              <Route path="transactions" element={<TransactionManager />} />
              <Route path="sales" element={<Sales />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="cost-recipe" element={<CostRecipeManager />} />
              <Route path="kpi" element={<KPIPage />} />
              <Route path="recipes" element={<Recipes />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route
                path="ai"
                element={(
                  <Suspense fallback={<div className="p-6 text-slate-400">AI 코파일럿 로딩 중...</div>}>
                    <AIAssistant />
                  </Suspense>
                )}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
