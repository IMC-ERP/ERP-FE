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
  Settings,
  HelpCircle,
  X,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const AIAssistant = lazy(() => import('../../pages/AIAssistant'));

// 초안1: 상단 3탭 구조. 각 그룹은 기존 경로(children)를 묶는 진입점이다.
interface NavChild {
  id?: string;
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}

interface NavGroup {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  children: NavChild[];
}

const navGroups: NavGroup[] = [
  {
    key: 'dashboard',
    label: '대시보드',
    icon: LayoutDashboard,
    children: [
      { id: 'tour-nav-home', to: '/', icon: Home, label: '홈' },
      { id: 'tour-nav-dashboard', to: '/dashboard', icon: LayoutDashboard, label: '경영 현황' },
    ],
  },
  {
    key: 'inventory',
    label: '재고',
    icon: Package,
    children: [
      { id: 'tour-nav-inventory', to: '/inventory', icon: Package, label: '재고 관리' },
      { id: 'tour-nav-recipe', to: '/cost-recipe', icon: ChefHat, label: '원가/레시피 관리' },
      { id: 'tour-nav-ai', to: '/ai', icon: Bot, label: 'AI Monstock' },
    ],
  },
  {
    key: 'report',
    label: '리포트',
    icon: ClipboardList,
    children: [
      { id: 'tour-nav-transactions', to: '/transactions', icon: ClipboardList, label: '거래 데이터 관리' },
      { id: 'tour-nav-analysis', to: '/period', icon: Calendar, label: '매출 분석' },
    ],
  },
];

export default function Layout() {
  const location = useLocation();
  const { storeProfile, appSettings, updateAppSettings } = useData();
  const { user, logout } = useAuth();

  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
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

    document.body.style.overflow = isAIDrawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAIDrawerOpen, isMobile]);

  const openAIDrawer = () => setIsAIDrawerOpen(true);

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

  // 현재 경로가 속한 그룹 (없으면 첫 그룹). 상단 탭 활성 표시 + 서브탭 노출에 사용.
  const activeGroup = navGroups.find(group => group.children.some(child => child.to === location.pathname)) ?? navGroups[0];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-x-hidden">
      {/* 상단 헤더: 로고 + 3탭 + 우상단 메뉴 */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-6 h-14">
          {/* 로고 */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            {storeProfile.logoUrl ? (
              <img src={storeProfile.logoUrl} alt="Logo" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="bg-amber-100 p-1.5 rounded-full">
                <Coffee className="text-amber-700" size={20} />
              </div>
            )}
            <span className="hidden sm:block text-sm font-bold text-slate-800 truncate max-w-[140px]">{storeProfile.name}</span>
          </Link>

          {/* 3탭 (대시보드 / 재고 / 리포트) */}
          <nav id="tour-sidebar-nav" className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {navGroups.map(group => {
              const GroupIcon = group.icon;
              const groupActive = group.key === activeGroup.key;
              return (
                <Link
                  key={group.key}
                  to={group.children[0].to}
                  className={`flex items-center gap-2 px-3 sm:px-4 h-14 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${groupActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <GroupIcon size={18} />
                  <span>{group.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* 우상단 유틸: 다크모드 / 글자크기 / 도움말 / 설정 / 로그아웃 */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              onClick={() => updateAppSettings({ darkMode: !appSettings.darkMode })}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title={appSettings.darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-label="다크 모드 전환"
            >
              {appSettings.darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={cycleFontSize}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title={`글자 크기: ${fontSizeLabel}`}
              aria-label={`글자 크기: ${fontSizeLabel}`}
            >
              <span className="font-black text-xs">{fontSizeToken}</span>
            </button>
            <Link
              to="/help"
              className={`p-2 rounded-lg transition-colors ${location.pathname === '/help' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              title="도움말"
              aria-label="도움말"
            >
              <HelpCircle size={18} />
            </Link>
            <Link
              to="/settings"
              className={`p-2 rounded-lg transition-colors ${location.pathname === '/settings' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              title="설정"
              aria-label="설정"
            >
              <Settings size={18} />
            </Link>
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 pl-1.5 pr-1 sm:pr-2 py-1 ml-0.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="로그아웃"
              >
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-7 h-7 rounded-full border border-slate-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <LogOut size={16} className="hidden sm:block" />
              </button>
            )}
          </div>
        </div>

        {/* 서브탭 줄: 활성 그룹의 하위 경로 */}
        {activeGroup.children.length > 1 && (
          <div className="flex items-center gap-1 px-2 sm:px-5 py-1.5 overflow-x-auto border-t border-slate-100 bg-slate-50/70">
            {activeGroup.children.map(child => {
              const ChildIcon = child.icon;
              const childActive = location.pathname === child.to;
              return (
                <Link
                  key={child.to}
                  id={child.id}
                  to={child.to}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${childActive
                    ? 'bg-blue-600 text-white font-semibold nav-item-active'
                    : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                >
                  <ChildIcon size={16} />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* 메인 콘텐츠 */}
      <div
        className="flex-1 relative min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out"
        style={{ marginRight: !isMobile && isAIDrawerOpen ? '400px' : '0' }}
      >
        <main className={`${isMobile ? 'p-4 pb-24' : 'p-6 lg:p-8'} max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden`}>
          <Outlet />
        </main>
      </div>

      {/* 우하단 FAB: AI Monstock (통합 카메라 FAB는 Step 3에서 추가) */}
      {!isAIDrawerOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={openAIDrawer}
            className="p-4 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-110 hover:bg-blue-700 transition-all duration-200"
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
