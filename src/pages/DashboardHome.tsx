/**
 * DashboardHome.tsx — 초안1 병합 대시보드
 * 상단: '오늘 매장 현황' 스냅샷 (KPI 3 + AI 마진 알림 + 재고부족/인기메뉴 + 시간대별 매출)
 * 하단: 기존 월간 경영현황(Dashboard) — 수익성/운영비 관리
 * 데이터: /api/home (homeApi) — summary/marginWarnings/stockWarnings/topMenus/hourlySales
 */

import { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { homeApi, type HomeDataResponse } from '../services/api';
import {
    TrendingUp, TrendingDown, Package, AlertTriangle, Sparkles,
    Wallet, ShoppingBag, Clock, Loader2, RefreshCcw
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import Dashboard from './Dashboard';
import SpotlightTour from '../components/SpotlightTour';

// ── 포매터 ──────────────────────────────────────────────
const wonFull = (v: number) => `₩${Math.round(v || 0).toLocaleString()}`;
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / Math.abs(prev)) * 100) : 0);
const marginRate = (profit: number, rev: number) => (rev > 0 ? Math.round((profit / rev) * 100) : 0);

// ── KPI 카드 ────────────────────────────────────────────
interface KpiCardProps {
    title: string;
    value: string;
    sub: React.ReactNode;
}
const KpiCard = ({ title, value, sub }: KpiCardProps) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col gap-1.5">
        <span className="text-xs sm:text-sm text-slate-500">{title}</span>
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight break-keep">{value}</span>
        <span className="text-xs text-slate-400">{sub}</span>
    </div>
);

const TrendBadge = ({ value, suffix = '%' }: { value: number; suffix?: string }) => {
    if (!value) return <span className="text-slate-400">지난주와 비슷</span>;
    const up = value > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 font-medium ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            지난주 대비 {Math.abs(value)}{suffix}
        </span>
    );
};

export default function DashboardHome() {
    const { storeProfile } = useData();
    const [data, setData] = useState<HomeDataResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [tourReady, setTourReady] = useState(false);

    const fetchHomeData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const res = await homeApi.get();
            setData(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('대시보드 데이터 로드 실패:', err);
            setData(null);
            setLastUpdated(new Date());
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeData();
        const interval = setInterval(() => fetchHomeData(true), 60000);
        return () => clearInterval(interval);
    }, [fetchHomeData]);

    useEffect(() => {
        if (!loading && data) {
            const t = setTimeout(() => setTourReady(true), 1000);
            return () => clearTimeout(t);
        }
    }, [loading, data]);

    const MAIN_DASHBOARD_TOUR = [
        {
            targetId: 'tour-kpi-cards',
            title: '📊 매장 현황 한눈에',
            content: '오늘 순이익·마진율·매출을 한눈에 파악하세요. 지난주 같은 요일과 비교한 증감도 함께 보여드립니다.',
            placement: 'bottom' as const,
            scrollOffset: 0.1,
        },
        {
            targetId: 'tour-stock-warning',
            title: '⚠️ 긴급 재고 알림',
            content: '안전 재고가 부족해진 품목을 바로 알려드립니다. 늦지 않게 발주를 확인하세요!',
            placement: 'top' as const,
        },
    ];

    const dateStr = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });

    const summary = data?.summary;
    const stockWarnings = data?.stockWarnings ?? [];
    const costWarnings = data?.costWarnings ?? [];
    const topMenus = data?.topMenus ?? [];
    const openHour = data?.openHour ?? 0;
    const closeHour = data?.closeHour ?? 24;

    const hourlyData = (data?.hourlySales ?? [])
        .filter(h => h.hour >= openHour && h.hour <= closeHour);

    return (
        <div className="space-y-8 animate-fade-in pb-4">
            {/* ============ 상단: 오늘 매장 현황 (초안1) ============ */}
            <section className="max-w-4xl mx-auto w-full space-y-6">
                <header className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-slate-400">{dateStr}</p>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight break-keep">
                            오늘 {storeProfile.name || '매장'} 현황
                        </h1>
                    </div>
                    <button
                        onClick={() => fetchHomeData(false)}
                        className="shrink-0 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCcw size={12} className={loading ? 'animate-spin text-blue-600' : ''} />
                        <span className="hidden sm:inline">{lastUpdated?.toLocaleTimeString() ?? '업데이트'}</span>
                    </button>
                </header>

                {loading && !data ? (
                    <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <p className="text-slate-500 font-medium">매장 정보를 분석 중입니다...</p>
                    </div>
                ) : !data || !summary ? (
                    <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
                        <AlertTriangle className="text-amber-500" size={40} />
                        <p className="text-slate-500 font-medium">데이터를 불러오지 못했습니다.</p>
                        <button onClick={() => fetchHomeData()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <>
                        {/* KPI 3카드 */}
                        <div id="tour-kpi-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <KpiCard
                                title="오늘 순이익"
                                value={wonFull(summary.todayProfit)}
                                sub={<TrendBadge value={pct(summary.todayProfit, summary.previousProfit)} />}
                            />
                            <KpiCard
                                title="마진율"
                                value={`${marginRate(summary.todayProfit, summary.todayRevenue)}%`}
                                sub={`지난주 ${marginRate(summary.previousProfit, summary.previousRevenue)}%`}
                            />
                            <KpiCard
                                title="오늘 매출"
                                value={wonFull(summary.todayRevenue)}
                                sub={`${(summary.todayOrders ?? 0).toLocaleString()}건 주문`}
                            />
                        </div>

                        {/* AI 원가 알림: 단가 인상 감지 (costWarnings 있을 때만) */}
                        {costWarnings.length > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                                <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                <div className="min-w-0 text-sm">
                                    <p className="font-bold text-amber-800 mb-1">AI 원가 알림</p>
                                    <ul className="space-y-1.5 text-amber-700">
                                        {costWarnings.slice(0, 3).map((c, i) => (
                                            <li key={i} className="break-keep">
                                                <span className="font-semibold">{c.name}</span> 단가 <span className="font-semibold">{c.changePct}%</span> 인상 감지 ({wonFull(c.oldPrice)} → {wonFull(c.newPrice)}).
                                                {c.affectedMenus.length > 0 ? (
                                                    <span className="block text-xs text-amber-600 mt-0.5">
                                                        {c.affectedMenus.map((m, j) => (
                                                            <span key={j} className="mr-2 whitespace-nowrap">
                                                                · {m.name} 마진 {m.oldMargin}% → <span className="font-semibold">{m.newMargin}%</span>
                                                            </span>
                                                        ))}
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600"> 메뉴 원가·가격 점검을 추천합니다.</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* 긴급 재고 부족 + 오늘 인기 메뉴 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {/* 재고 부족 */}
                            <div id="tour-stock-warning" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Package size={16} className="text-rose-500" /> 긴급 재고 부족
                                    </h3>
                                    {stockWarnings.length > 0 && (
                                        <span className="text-xs font-bold px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                                            {stockWarnings.length}건
                                        </span>
                                    )}
                                </div>
                                {stockWarnings.length > 0 ? (
                                    <ul className="divide-y divide-slate-100">
                                        {stockWarnings.map((item, i) => (
                                            <li key={i} className="py-2.5 flex justify-between items-center gap-3">
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-slate-700 block truncate">{item.name}</span>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        현재 {item.current}{item.unit} · 안전재고 {item.safety}{item.unit}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-xs font-bold px-2 py-1 bg-rose-50 text-rose-600 rounded border border-rose-100">발주 필요</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-400 py-6 text-center">모든 재고가 충분합니다.</p>
                                )}
                            </div>

                            {/* 인기 메뉴 */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <ShoppingBag size={16} className="text-blue-500" /> 오늘 인기 메뉴
                                </h3>
                                {topMenus.length > 0 ? (
                                    <ul className="space-y-2">
                                        {topMenus.slice(0, 5).map((menu: any, idx: number) => (
                                            <li key={idx} className="flex items-center gap-3">
                                                <span className="w-6 h-6 shrink-0 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">{idx + 1}</span>
                                                <span className="font-semibold text-slate-700 truncate flex-1">{menu.name}</span>
                                                <span className="text-xs text-slate-400 shrink-0">{menu.qty}개</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-400 py-6 text-center">집계된 판매 내역이 없습니다.</p>
                                )}
                            </div>
                        </div>

                        {/* 시간대별 매출 흐름 */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Clock size={16} className="text-blue-500" /> 시간대별 매출 흐름
                                </h3>
                                <span className="text-xs text-slate-400">
                                    {String(openHour).padStart(2, '0')}시 ~ {String(closeHour).padStart(2, '0')}시
                                </span>
                            </div>
                            <div className="h-[260px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="dhSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v}시`} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 10000)}만`} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => [`${Number(value).toLocaleString()}원`, '매출']}
                                            labelFormatter={(h) => `${h}시`}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#dhSales)" animationDuration={1200} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {/* 구분선 */}
            <div className="max-w-4xl mx-auto w-full flex items-center gap-3 px-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Wallet size={13} /> 월간 경영 현황
                </span>
                <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* ============ 하단: 월간 경영현황 (기존 Dashboard) ============ */}
            <Dashboard />

            <SpotlightTour
                steps={MAIN_DASHBOARD_TOUR}
                tourKey="home_page"
                autoStart={tourReady}
            />
        </div>
    );
}
