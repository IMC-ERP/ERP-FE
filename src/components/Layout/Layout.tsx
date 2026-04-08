/**
 * Layout Component
 * 카페 사장님용 일일 운영 중심 사이드바
 */

import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, type Location } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Coffee,
  ChefHat,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface NavItemDefinition {
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  caption: string;
  isActive: (location: Location) => boolean;
}

interface NavItemProps {
  item: NavItemDefinition;
  active: boolean;
}

const hasTab = (location: Location, tab: string) =>
  location.pathname === '/inventory' && new URLSearchParams(location.search).get('tab') === tab;

const PRIMARY_NAV_ITEMS: NavItemDefinition[] = [
  {
    to: '/',
    icon: Home,
    label: '홈',
    caption: '오늘 매장 체크',
    isActive: (location) => location.pathname === '/',
  },
  {
    to: '/inventory?tab=overview',
    icon: Package,
    label: '재고',
    caption: '부족 재고와 발주 확인',
    isActive: (location) => hasTab(location, 'overview') || (location.pathname === '/inventory' && !location.search),
  },
  {
    to: '/inventory?tab=receiving',
    icon: ReceiptText,
    label: '입고 / OCR',
    caption: '영수증 업로드와 입고 정리',
    isActive: (location) => hasTab(location, 'receiving'),
  },
  {
    to: '/sales',
    icon: BarChart3,
    label: '매출',
    caption: '오늘 매출과 판매 입력',
    isActive: (location) => location.pathname === '/sales',
  },
];

const ADVANCED_NAV_ITEMS: NavItemDefinition[] = [
  {
    to: '/dashboard',
    icon: LayoutDashboard,
    label: '경영 현황',
    caption: '상세 KPI 보기',
    isActive: (location) => location.pathname === '/dashboard',
  },
  {
    to: '/period',
    icon: BarChart3,
    label: '매출 분석',
    caption: '기간별 추이 확인',
    isActive: (location) => location.pathname === '/period',
  },
  {
    to: '/transactions',
    icon: ClipboardList,
    label: '거래 관리',
    caption: '거래 이력과 OCR 매출',
    isActive: (location) => location.pathname === '/transactions',
  },
  {
    to: '/cost-recipe',
    icon: ChefHat,
    label: '원가 / 레시피',
    caption: '메뉴 원가 점검',
    isActive: (location) => location.pathname === '/cost-recipe' || location.pathname === '/recipes',
  },
  {
    to: '/ai',
    icon: Sparkles,
    label: 'AI 도우미',
    caption: '고급 운영 인사이트',
    isActive: (location) => location.pathname === '/ai',
  },
];

const UTILITY_NAV_ITEMS: NavItemDefinition[] = [
  {
    to: '/settings',
    icon: Settings,
    label: '설정',
    caption: '매장 정보와 계정',
    isActive: (location) => location.pathname === '/settings',
  },
  {
    to: '/help',
    icon: LifeBuoy,
    label: '도움말',
    caption: '지원 및 가이드',
    isActive: (location) => location.pathname === '/help',
  },
];

const NavItem = ({ item, active }: NavItemProps) => {
  const { to, icon: Icon, label, caption } = item;

  return (
  <Link
    to={to}
    className={`flex items-start gap-3 rounded-2xl px-4 py-3 transition-colors duration-200 ${
      active
        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <div className={`mt-0.5 rounded-xl p-2 ${active ? 'bg-white text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className={`text-sm font-semibold ${active ? 'text-amber-800' : 'text-slate-800'}`}>{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{caption}</p>
    </div>
  </Link>
  );
};

export default function Layout() {
  const location = useLocation();
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const { storeProfile } = useData();
  const { user, logout } = useAuth();

  const hasAdvancedRouteActive = useMemo(
    () => ADVANCED_NAV_ITEMS.some((item) => item.isActive(location)),
    [location],
  );
  const isAdvancedSectionOpen = hasAdvancedRouteActive || showAdvancedTools;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="fixed z-10 flex h-full w-72 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <Coffee className="text-amber-700" size={24} />
          </div>
          <div>
              <h1 className="text-base font-bold leading-tight text-slate-800 tracking-tight">
                {storeProfile.store_name}
              </h1>
              <p className="text-[11px] text-slate-500">카페 운영을 매일 10분 안에 점검하세요</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">오늘의 기본 메뉴</p>
            <p className="mt-1 text-sm text-slate-600">홈, 재고, 입고, 매출만 먼저 보고 운영 루틴을 잡을 수 있게 구성했습니다.</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          <div className="space-y-2">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavItem key={item.label} item={item} active={item.isActive(location)} />
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70">
            <button
              type="button"
              onClick={() => setShowAdvancedTools((current) => !current)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">고급 기능</p>
                <p className="mt-0.5 text-xs text-slate-500">상세 분석과 설정이 필요한 경우만 여세요</p>
              </div>
              {isAdvancedSectionOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {isAdvancedSectionOpen && (
              <div className="space-y-2 border-t border-slate-200 px-3 py-3">
                {ADVANCED_NAV_ITEMS.map((item) => (
                  <NavItem key={item.label} item={item} active={item.isActive(location)} />
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-4">
          {UTILITY_NAV_ITEMS.map((item) => (
            <NavItem key={item.label} item={item} active={item.isActive(location)} />
          ))}
        </div>

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

      <div className="relative ml-72 flex-1">
        <main className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
