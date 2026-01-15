import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { Layout } from './components/Layout';
import { Home } from './components/Home';
import { Dashboard } from './components/Dashboard';
import { PeriodAnalysis } from './components/PeriodAnalysis';
import { Inventory } from './components/Inventory';
import { AIAssistant } from './components/AIAssistant';
import { TransactionManager } from './components/TransactionManager';
import { CostRecipeManager } from './components/CostRecipeManager';
import { SettingsPage } from './components/SettingsPage';

// Placeholder for Help Page
const HelpPage = () => (
  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col justify-center items-center">
    <div className="text-6xl mb-4">📖</div>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">도움말 및 가이드</h2>
    <p className="text-slate-500 max-w-md">
      ERP 시스템 사용에 어려움이 있으신가요? <br/>
      현재 페이지 준비 중입니다. 관리자에게 문의해주세요.
    </p>
  </div>
);

const App = () => {
  return (
    <DataProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/period" element={<PeriodAnalysis />} />
            <Route path="/transactions" element={<TransactionManager />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/cost-recipe" element={<CostRecipeManager />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/ai" element={<AIAssistant />} />
            
            {/* Backward compatibility */}
            <Route path="/add" element={<TransactionManager />} />
            <Route path="/history" element={<TransactionManager />} />
          </Routes>
        </Layout>
      </HashRouter>
    </DataProvider>
  );
};

export default App;