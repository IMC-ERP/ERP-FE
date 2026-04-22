/**
 * Layout Component
 * 인증 정보 + 반응형 사이드바 + AI Monstock 드로어 통합
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
  ScrollText,
  Settings,
  HelpCircle,
  X,
  Menu,
  Type,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const AIAssistant = lazy(() => import('../../pages/AIAssistant'));

interface NavItemProps {
  id?: string;
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const NavItem = ({ id, to, icon: Icon, label, active, onClick }: NavItemProps) => (
  <Link
    id={id}
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors duration-200 ${active
      ? 'bg-blue-100 text-blue-700 font-semibold nav-item-active'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
  >
    <Icon size={20} />
    <span className="min-w-0 break-words leading-snug">{label}</span>
  </Link>
);

export default function Layout() {
  const location = useLocation();
  const { storeProfile, appSettings, updateAppSettings } = useData();
  const { user, logout } = useAuth();

  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // 외부(예: 스포트라이트 투어)에서 사이드바를 강제로 열 수 있도록 이벤트 리스너 추가
  useEffect(() => {
    const handleOpenSidebar = () => {
      if (isMobile) setIsMobileSidebarOpen(true);
    };
    window.addEventListener('erp:sidebar:open', handleOpenSidebar);
    return () => window.removeEventListener('erp:sidebar:open', handleOpenSidebar);
  }, [isMobile]);

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);
  const openAIDrawer = () => {
    setIsMobileSidebarOpen(false);
    setIsAIDrawerOpen(true);
  };

  const cycleFontSize = () => {
    const nextSize = appSettings.fontSize === 'small'
      ? 'medium'
      : appSettings.fontSize === 'medium'
        ? 'large'
        : 'small';

    updateAppSettings({ fontSize: nextSize });
  };

  const handleLogout = async () => {
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) return;
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const fontSizeToken = appSettings.fontSize === 'small' ? 'A-' : appSettings.fontSize === 'medium' ? 'A' : 'A+';
  const fontSizeLabel = appSettings.fontSize === 'small' ? '작게' : appSettings.fontSize === 'medium' ? '보통' : '크게';

  const navItems = [
    { id: 'tour-nav-home', to: '/', icon: Home, label: '홈' },
    { id: 'tour-nav-dashboard', to: '/dashboard', icon: LayoutDashboard, label: '경영 현황' },
    { id: 'tour-nav-sales', to: '/sales', icon: ScrollText, label: '매출 입력' },
    { id: 'tour-nav-analysis', to: '/period', icon: Calendar, label: '매출 분석' },
    { id: 'tour-nav-transactions', to: '/transactions', icon: ClipboardList, label: '거래 데이터 관리' },
    { id: 'tour-nav-inventory', to: '/inventory', icon: Package, label: '재고 관리' },
    { id: 'tour-nav-recipe', to: '/cost-recipe', icon: ChefHat, label: '원가/레시피 관리' },
    { id: 'tour-nav-ai', to: '/ai', icon: Bot, label: 'AI Monstock' }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-x-hidden">
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
          <div className="mobile-header-actions flex items-center gap-2">
            <button
              onClick={() => updateAppSettings({ darkMode: !appSettings.darkMode })}
              className="mobile-header-utility-btn"
              title={appSettings.darkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
              aria-label="다크 모드 전환"
            >
              {appSettings.darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={cycleFontSize}
              className="mobile-header-utility-btn mobile-font-btn flex items-center gap-1"
              title={`글자 크기: ${fontSizeLabel}`}
              aria-label={`글자 크기: ${fontSizeLabel}`}
            >
              <Type size={15} />
              <span className="mobile-font-token font-bold text-xs">{fontSizeToken}</span>
            </button>
          </div>
        </div>
      )}

      {isMobile && isMobileSidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={closeMobileSidebar} />
      )}

      <div className={`
        sidebar-container
        ${isMobile ? 'mobile-sidebar' : ''}
        ${isMobile && isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}
        ${isMobile && !isMobileSidebarOpen ? 'mobile-sidebar-closed' : ''}
      `}>
        <Link to="/" className="p-6 border-b border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors">
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
        </Link>

        <nav id="tour-sidebar-nav" className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.map(item => (
            <NavItem
              key={item.to}
              id={item.id}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
              onClick={isMobile ? closeMobileSidebar : undefined}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1 bg-slate-50/50">
          <NavItem to="/help" icon={HelpCircle} label="도움말" active={location.pathname === '/help'} onClick={isMobile ? closeMobileSidebar : undefined} />
          <NavItem to="/settings" icon={Settings} label="설정" active={location.pathname === '/settings'} onClick={isMobile ? closeMobileSidebar : undefined} />
        </div>

        {user && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3 mb-3">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
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
                  {user.user_metadata?.full_name || '사용자'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <LogOut size={16} />
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>

      <div
        className={`flex-1 relative min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out ${isMobile ? 'ml-0 layout-main-mobile' : 'ml-64'}`}
        style={{ marginRight: !isMobile && isAIDrawerOpen ? '400px' : '0' }}
      >
        <main className={`${isMobile ? 'p-4 pb-8' : 'p-8'} max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden`}>
          <Outlet />
        </main>
      </div>

      {!isMobile && !isAIDrawerOpen && (
        <div className="fixed bottom-8 right-8 z-40 flex flex-col items-center gap-3">
          {/* 다크/라이트 모드 (데스크탑) */}
          <button
            onClick={() => updateAppSettings({ darkMode: !appSettings.darkMode })}
            className="p-3.5 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-slate-600"
            title={appSettings.darkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
          >
            {appSettings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* 글자 크기 조절 (데스크탑) */}
          <button
            onClick={cycleFontSize}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-slate-600"
            title={`글자 크기: ${fontSizeLabel}`}
          >
            <span className="font-black text-sm">{fontSizeToken}</span>
          </button>

          {/* AI Monstock */}
          <button
            onClick={openAIDrawer}
            className="p-4 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-110 hover:bg-blue-700 transition-all duration-200 mt-1"
            title="AI Monstock 열기"
            aria-label="AI Monstock 열기"
          >
            <Bot size={24} />
          </button>
        </div>
      )}

      <div
        className={`fixed inset-y-0 right-0 ${isMobile ? 'w-full' : 'w-[400px]'} bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isAIDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <div className="bg-white p-1.5 rounded-full shadow-sm">
              <Bot className="text-blue-600" size={20} />
            </div>
            <span>AI Monstock</span>
          </div>
          <button
            onClick={() => setIsAIDrawerOpen(false)}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="p-4 text-center text-slate-400">로딩 중...</div>}>
            <AIAssistant isWidget={true} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
