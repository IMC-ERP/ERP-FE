import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Package, ClipboardList, ChefHat } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export const Home = () => {
  const navigate = useNavigate();
  const { storeProfile } = useData();

  const MainCard = ({ title, desc, icon: Icon, path, color }: any) => (
    <button 
      onClick={() => navigate(path)}
      className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-400 transition-all text-center group h-40"
    >
      <div className={`mb-4 p-3 rounded-full bg-slate-50 group-hover:bg-${color}-50 transition-colors`}>
        <Icon className={`w-8 h-8 text-slate-600 group-hover:text-${color}-600`} />
      </div>
      <div className="font-bold text-slate-800 text-lg mb-1">{title}</div>
      <div className="text-xs text-slate-500">{desc}</div>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="mt-8">
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <span className="text-4xl">👋</span> 안녕하세요, {storeProfile.ceoName} 대표님!
          </h2>
          <p className="text-slate-500 mt-2 text-lg">
             <span className="font-bold text-slate-700">{storeProfile.name}</span>의 비즈니스 현황을 한눈에 확인하세요.
          </p>
        </div>
      </div>

      {/* Main Menu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MainCard 
          title="경영 현황" 
          desc="전체 경영 현황 확인" 
          icon={LayoutDashboard} 
          path="/dashboard" 
          color="blue"
        />
        <MainCard 
          title="매출 분석" 
          desc="기간별 데이터 분석" 
          icon={Calendar} 
          path="/period" 
          color="indigo"
        />
        <MainCard 
          title="거래 데이터 관리" 
          desc="거래 내역 및 추가" 
          icon={ClipboardList} 
          path="/transactions" 
          color="green"
        />
        <MainCard 
          title="재고 관리" 
          desc="재고/발주 핵심 정보" 
          icon={Package} 
          path="/inventory" 
          color="amber"
        />
        <MainCard 
          title="원가/레시피" 
          desc="원가율 및 레시피" 
          icon={ChefHat} 
          path="/cost-recipe" 
          color="rose"
        />
      </div>
    </div>
  );
};