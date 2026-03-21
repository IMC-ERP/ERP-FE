/**
 * Layout Component
 * GCP-ERP 스타일 - 반응형 사이드바 + AI 드로어
 * 모바일: 햄버거 메뉴 + 오버레이 사이드바
 */

import { useState, useEffect, lazy, Suspense } from 'react';
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
  Menu,
  BarChart3,
  Moon,
  Sun,
  Type
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

// Lazy load AIAssistant to avoid circular dependency
const AIAssistant = lazy(() => import('../../pages/AIAssistant'));

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const NavItem = ({ to, icon: Icon, label, active, onClick }: NavItemProps) => (
  <Link
    to={to}
    onClick={onClick}
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { storeProfile, appSettings, updateAppSettings } = useData();

  // 모바일 여부 감지
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = isMobileSidebarOpen || isAIDrawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAIDrawerOpen, isMobile, isMobileSidebarOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = appSettings.darkMode ? 'dark' : 'light';
    document.documentElement.dataset.fontSize = appSettings.fontSize;
    document.documentElement.style.colorScheme = appSettings.darkMode ? 'dark' : 'light';
  }, [appSettings.darkMode, appSettings.fontSize]);

  // 페이지 이동 시 모바일 사이드바 닫기
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);
  const toggleDarkMode = () => updateAppSettings({ darkMode: !appSettings.darkMode });
  const cycleFontSize = () => {
    const nextSize = appSettings.fontSize === 'small'
      ? 'medium'
      : appSettings.fontSize === 'medium'
        ? 'large'
        : 'small';

    updateAppSettings({ fontSize: nextSize });
  };
  const fontSizeToken = appSettings.fontSize === 'small' ? 'A-' : appSettings.fontSize === 'medium' ? 'A' : 'A+';
  const fontSizeLabel = appSettings.fontSize === 'small' ? '작게' : appSettings.fontSize === 'medium' ? '보통' : '크게';

  const navItems = [
    { to: '/', icon: Home, label: '홈' },
    { to: '/dashboard', icon: LayoutDashboard, label: '경영 현황' },
    { to: '/period', icon: Calendar, label: '매출 분석' },
    { to: '/transactions', icon: ClipboardList, label: '거래 데이터 관리' },
    { to: '/inventory', icon: Package, label: '재고 관리' },
    { to: '/cost-recipe', icon: ChefHat, label: '원가/레시피 관리' },
    { to: '/kpi', icon: BarChart3, label: 'KPI 현황' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-x-hidden">

      {/* ===== 모바일 상단 헤더 ===== */}
      {isMobile && (
        <div className="mobile-top-header">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="mobile-hamburger-btn"
            aria-label="메뉴 열기"
          >
            <Menu size={22} />
          </button>
          <div className="mobile-header-title">
            {storeProfile.logoUrl ? (
              <img src={storeProfile.logoUrl} alt="Logo" className="mobile-header-logo" />
            ) : (
              <Coffee className="text-amber-600" size={18} />
            )}
            <span>{storeProfile.name}</span>
          </div>
          <div className="mobile-header-actions">
            <button
              onClick={cycleFontSize}
              className="mobile-header-utility-btn"
              aria-label={`글자 크기 변경, 현재 ${fontSizeLabel}`}
              title={`글자 크기: ${fontSizeLabel}`}
            >
              <Type size={15} />
              <span>{fontSizeToken}</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="mobile-header-utility-btn"
              aria-label={appSettings.darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              title={appSettings.darkMode ? '라이트 모드' : '다크 모드'}
            >
              {appSettings.darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setIsAIDrawerOpen(prev => !prev)}
              className="mobile-ai-btn"
              aria-label="AI 비서"
            >
              <Bot size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ===== 모바일 오버레이 ===== */}
      {isMobile && isMobileSidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={closeMobileSidebar}
        />
      )}

      {/* ===== 사이드바 ===== */}
      <div className={`
        sidebar-container
        ${isMobile ? 'mobile-sidebar' : ''}
        ${isMobile && isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}
        ${isMobile && !isMobileSidebarOpen ? 'mobile-sidebar-closed' : ''}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          {storeProfile.logoUrl ? (
            <img src={storeProfile.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="bg-amber-100 p-2 rounded-full">
              <Coffee className="text-amber-700" size={24} />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-800 tracking-tight leading-tight">{storeProfile.name}</h1>
            <p className="text-[10px] text-slate-400">Coffee ERP v2.5.4</p>
          </div>
          {isMobile && (
            <button
              onClick={closeMobileSidebar}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="메뉴 닫기"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.map(item => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
              onClick={isMobile ? closeMobileSidebar : undefined}
            />
          ))}
        </nav>

        {/* Bottom Utility Navigation */}
        <div className="p-4 border-t border-slate-100 space-y-1 bg-slate-50/50">
          <NavItem to="/help" icon={HelpCircle} label="도움말" active={location.pathname === '/help'} onClick={isMobile ? closeMobileSidebar : undefined} />
          <NavItem to="/settings" icon={Settings} label="설정" active={location.pathname === '/settings'} onClick={isMobile ? closeMobileSidebar : undefined} />
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div
        className={`flex-1 relative transition-all duration-300 ease-in-out ${isMobile ? 'ml-0 layout-main-mobile' : 'ml-64'}`}
        style={{ marginRight: !isMobile && isAIDrawerOpen ? '400px' : '0' }}
      >
        <main className={`${isMobile ? 'p-4 pb-8' : 'p-8'} max-w-7xl mx-auto w-full`}>
          <Outlet />
        </main>
      </div>

      {/* Floating AI Button (Desktop only) */}
      {!isMobile && (
        <>
          <div className="desktop-top-utilities">
            <button
              onClick={cycleFontSize}
              className="desktop-utility-btn"
              title={`글자 크기: ${fontSizeLabel}`}
            >
              <Type size={16} />
              <span>{fontSizeToken}</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="desktop-utility-btn"
              title={appSettings.darkMode ? '라이트 모드' : '다크 모드'}
            >
              {appSettings.darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          <button
            onClick={() => setIsAIDrawerOpen(prev => !prev)}
            className={`fixed top-6 right-8 z-40 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 group border-2 border-white/20 ${isAIDrawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            title="AI 코파일럿 열기"
          >
            <Bot size={24} className="group-hover:rotate-12 transition-transform" />
          </button>
        </>
      )}

      {/* AI Assistant Drawer */}
      <div
        className={`fixed inset-y-0 right-0 ${isMobile ? 'w-full' : 'w-[400px]'} bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isAIDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <div className="bg-white p-1.5 rounded-full shadow-sm">
              <Bot className="text-blue-600" size={20} />
            </div>
            <span>AI 운영 코파일럿</span>
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
