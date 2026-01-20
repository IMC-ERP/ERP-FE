/**
 * Layout Component
 * GCP-ERP 스타일 - 고정 사이드바 + AI 드로어
 */

import { useState, lazy, Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Package,
  Bot,
  Coffee,
  Home,
  ClipboardList,
  ChefHat,
  Settings,
  HelpCircle,
  X,
  LogOut
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

// Lazy load AIAssistant to avoid circular dependency
const AIAssistant = lazy(() => import('../../pages/AIAssistant'));

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
}

const NavItem = ({ to, icon: Icon, label, active }: NavItemProps) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${active
      ? "bg-blue-100 text-blue-700 font-semibold"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
  >
    <Icon size={20} />
    <span>{label}</span>
  </Link>
);

export default function Layout() {
  const location = useLocation();
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const { storeProfile } = useData();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-x-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 fixed h-full z-10 transition-all duration-300 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          {storeProfile.logoUrl ? (
            <img src={storeProfile.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="bg-amber-100 p-2 rounded-full">
              <Coffee className="text-amber-700" size={24} />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight leading-tight">{storeProfile.name}</h1>
            <p className="text-[10px] text-slate-400">Coffee ERP v2.5.4</p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          <NavItem to="/" icon={Home} label="홈" active={location.pathname === '/'} />
          <NavItem to="/dashboard" icon={LayoutDashboard} label="경영 현황" active={location.pathname === '/dashboard'} />
          <NavItem to="/period" icon={Calendar} label="매출 분석" active={location.pathname === '/period'} />
          <NavItem to="/transactions" icon={ClipboardList} label="거래 데이터 관리" active={location.pathname === '/transactions'} />
          <NavItem to="/inventory" icon={Package} label="재고 관리" active={location.pathname === '/inventory'} />
          <NavItem to="/cost-recipe" icon={ChefHat} label="원가/레시피 관리" active={location.pathname === '/cost-recipe'} />
        </nav>

        {/* Bottom Utility Navigation */}
        <div className="p-4 border-t border-slate-100 space-y-1 bg-slate-50/50">
          <NavItem to="/help" icon={HelpCircle} label="도움말" active={location.pathname === '/help'} />
          <NavItem to="/settings" icon={Settings} label="설정" active={location.pathname === '/settings'} />
        </div>

        {/* User Profile & Logout */}
        {user && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3 mb-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {user.displayName || '사용자'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-600 
                         hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <LogOut size={16} />
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Wrapper - Pushes content when drawer is open */}
      <div
        className="flex-1 ml-64 relative transition-all duration-300 ease-in-out"
        style={{ marginRight: isAIDrawerOpen ? '400px' : '0' }}
      >
        <main className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Button (Top Right) */}
      <button
        onClick={() => setIsAIDrawerOpen(prev => !prev)}
        className={`fixed top-6 right-8 z-40 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 group border-2 border-white/20 ${isAIDrawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        title="AI 비서 열기"
      >
        <Bot size={24} className="group-hover:rotate-12 transition-transform" />
      </button>

      {/* AI Assistant Drawer (Push Mode) */}
      <div
        className={`fixed inset-y-0 right-0 w-[400px] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isAIDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <div className="bg-white p-1.5 rounded-full shadow-sm">
              <Bot className="text-blue-600" size={20} />
            </div>
            <span>AI 경영 비서</span>
          </div>
          <button
            onClick={() => setIsAIDrawerOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="p-4 text-center text-slate-400">로딩 중...</div>}>
            <AIAssistant isWidget={true} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
