/**
 * Sales Analysis Page — 매출 분석 대시보드
 *
 * Recharts 기반 4대 차트 + Hero Cards + Quick 필터 + 달력 기간 선택
 * 백엔드 GET /api/v1/analytics/sales 연동
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Treemap, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Info, ArrowLeft, Loader2, Calendar, LineChart as LineChartIcon, ArrowRightLeft } from 'lucide-react';
import { analyticsApi, storeHoursApi, type SalesAnalyticsResponse } from '../services/api';

import SalesComparisonTab from './SalesComparisonTab';

// ==================== 유틸리티 ====================

const fmt = (n: number) => n.toLocaleString('ko-KR');

const toYMD = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/** YYYYMMDD → YYYY-MM-DD (input[type=date] 호환) */
const toInputDate = (ymd: string) => ymd.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
/** YYYY-MM-DD → YYYYMMDD */
const fromInputDate = (v: string) => v.replace(/-/g, '');
/** YYYYMMDD → 표시용 YYYY.MM.DD */
const toDisplay = (ymd: string) => ymd.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');

/** startDate~endDate 일수 계산 */
const calcDays = (s: string, e: string) => {
    const sd = new Date(toInputDate(s));
    const ed = new Date(toInputDate(e));
    return Math.round((ed.getTime() - sd.getTime()) / (86400000)) + 1;
};

const smartYDomain = (data: number[]): [number, number] => {
    if (!data.length) return [0, 100];
    const min = Math.min(...data);
    const max = Math.max(...data);
    if (max === 0) return [0, 100];
    const range = max - min;
    if (min < max * 0.5) return [0, Math.ceil(max + range * 0.2)];
    let yMin = min - range * 0.2;
    const yMax = max + range * 0.2;
    if (yMin < 0) yMin = 0;
    return [Math.floor(yMin), Math.ceil(yMax)];
};

// ==================== 컴포넌트 ====================

export default function SalesAnalysis() {
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeTab, setActiveTab] = useState<'trend' | 'compare'>('trend');

    const [startDate, setStartDate] = useState(toYMD(monthStart));
    const [endDate, setEndDate] = useState(toYMD(now));
    const [data, setData] = useState<SalesAnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeQuick, setActiveQuick] = useState<string | null>(null);

    // 차트 옵션
    const [fridayWeekend, setFridayWeekend] = useState(false);
    const [treemapMode, setTreemapMode] = useState<'menu' | 'category'>('menu');
    const [drillCategory, setDrillCategory] = useState<string | null>(null);

    // storeHours
    const [openHour, setOpenHour] = useState(0);
    const [closeHour, setCloseHour] = useState(23);
    const [storeHoursLoaded, setStoreHoursLoaded] = useState(false);

    useEffect(() => {
        storeHoursApi.get().then(res => {
            const hours = res.data?.storeHours;
            if (hours && Object.keys(hours).length > 0) {
                const allOpens = Object.values(hours).map(h => parseInt(h.open?.split(':')[0] || '0'));
                const allCloses = Object.values(hours).map(h => parseInt(h.close?.split(':')[0] || '23'));
                if (allOpens.length) setOpenHour(Math.min(...allOpens));
                if (allCloses.length) setCloseHour(Math.max(...allCloses));
            }
            setStoreHoursLoaded(true);
        }).catch(() => { setStoreHoursLoaded(true); });
    }, []);

    const fetchData = useCallback(async (s: string, e: string) => {
        setLoading(true);
        try {
            const res = await analyticsApi.getSales(s, e);
            setData(res.data);
            if (res.data.openHour !== undefined) setOpenHour(res.data.openHour);
            if (res.data.closeHour !== undefined) setCloseHour(res.data.closeHour);
            setStoreHoursLoaded(true);
        } catch (err) {
            console.error('Analytics fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(startDate, endDate); }, [startDate, endDate, fetchData]);

    // Quick 필터
    const quickFilters = [
        { label: '1주일', days: 7 },
        { label: '1개월', days: 30 },
        { label: '3개월', days: 90 },
        { label: '6개월', days: 180 },
        { label: '1년', days: 360 },
    ];

    const handleQuick = (label: string, days: number) => {
        const end = new Date(yesterday);
        const start = new Date(yesterday);
        start.setDate(end.getDate() - days + 1);
        setStartDate(toYMD(start));
        setEndDate(toYMD(end));
        setActiveQuick(label);
    };

    // 달력 날짜 변경
    const handleStartChange = (v: string) => {
        setStartDate(fromInputDate(v));
        setActiveQuick(null);
    };
    const handleEndChange = (v: string) => {
        setEndDate(fromInputDate(v));
        setActiveQuick(null);
    };

    // 기간 일수
    const periodDays = useMemo(() => calcDays(startDate, endDate), [startDate, endDate]);

    // Tooltip
    const tooltipText = useMemo(() => {
        const exEnd = new Date(yesterday);
        const exStart = new Date(yesterday); exStart.setDate(exEnd.getDate() - 6);
        return `Quick 필터는 어제를 기준으로 역산합니다 (예: 1주일 = ${exStart.getMonth() + 1}.${exStart.getDate()}~${exEnd.getMonth() + 1}.${exEnd.getDate()})`;
    }, []);

    // --------- 시간대별 필터 (storeHours 기반) ---------
    const filteredHourly = useMemo(() => {
        if (!data) return [];
        // 백엔드에서 내려준 운영 시간이 있는 경우 해당 범위로 필터링
        if (storeHoursLoaded) {
            return data.salesByHour.filter(h => {
                const hr = parseInt(h.hour);
                return hr >= openHour && hr <= closeHour;
            });
        }
        return data.salesByHour.filter(h => h.sales > 0);
    }, [data, openHour, closeHour, storeHoursLoaded]);

    const peakLowIdx = useMemo(() => {
        if (!filteredHourly.length) return { peak: -1, low: -1 };
        let peakI = 0, lowI = 0;
        filteredHourly.forEach((h, i) => {
            if (h.sales > filteredHourly[peakI].sales) peakI = i;
            if (h.sales < filteredHourly[lowI].sales) lowI = i;
        });
        return { peak: peakI, low: lowI };
    }, [filteredHourly]);

    const hourlyYDomain = useMemo(() => smartYDomain(filteredHourly.map(h => h.sales)), [filteredHourly]);

    // Treemap 데이터
    const treemapData = useMemo(() => {
        if (!data) return [];
        if (treemapMode === 'menu' || drillCategory) {
            const items = drillCategory
                ? data.menuTreemap.filter(m => m.category === drillCategory)
                : data.menuTreemap;
            const totalRev = items.reduce((s, m) => s + m.revenue, 0);
            return items.map(m => ({
                name: m.name, size: m.revenue,
                pct: totalRev > 0 ? ((m.revenue / totalRev) * 100).toFixed(1) : '0',
                revenue: m.revenue,
            }));
        }
        return data.salesByCategory.map(c => ({
            name: c.category, size: c.revenue,
            pct: c.percentage.toString(), revenue: c.revenue,
        }));
    }, [data, treemapMode, drillCategory]);

    const top5XDomain = useMemo(() => {
        if (!data?.menuTop5.length) return [0, 100];
        const maxRev = Math.max(...data.menuTop5.map(m => m.revenue));
        return [0, Math.ceil(maxRev * 1.2)];
    }, [data]);

    // ==================== Render ====================
    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }
    if (!data) return null;

    const isPositive = data.changeRate >= 0;

    const TreemapTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm">
                    <div className="font-bold text-slate-800">{d.name}</div>
                    <div className="text-slate-600">매출: {fmt(d.revenue)}원</div>
                    <div className="text-indigo-600 font-medium">비중: {d.pct}%</div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">

            {/* ===== 페이지 타이틀 & 탭 ===== */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">매출 분석</h2>

                {/* 탭 컨트롤러 (좌측 정렬) */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('trend')}
                        className={`flex items-center justify-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'trend' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LineChartIcon size={16} /> 매출 추이
                    </button>
                    <button
                        onClick={() => setActiveTab('compare')}
                        className={`flex items-center justify-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'compare' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowRightLeft size={16} /> 비교하기
                    </button>
                </div>
            </div>

            {activeTab === 'trend' ? (
                <>
                    {/* ===== 기간 설정 + Hero Cards (같은 행) ===== */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                        {/* 기간 설정 카드 */}
                        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar size={16} className="text-slate-500" />
                                <span className="text-sm font-semibold text-slate-700">조회 기간</span>
                                <div className="group relative ml-auto">
                                    <Info size={14} className="text-slate-400 cursor-help" />
                                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-slate-800 text-xs text-slate-200 rounded-lg shadow-xl z-50">
                                        {tooltipText}
                                        <div className="absolute right-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800" />
                                    </div>
                                </div>
                            </div>

                            {/* 달력 입력 */}
                            <div className="flex items-center gap-2 mb-3">
                                <input
                                    type="date"
                                    value={toInputDate(startDate)}
                                    onChange={e => handleStartChange(e.target.value)}
                                    className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                                <span className="text-slate-400 text-xs">~</span>
                                <input
                                    type="date"
                                    value={toInputDate(endDate)}
                                    onChange={e => handleEndChange(e.target.value)}
                                    className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                            </div>

                            {/* Quick 버튼 */}
                            <div className="flex flex-wrap gap-1.5">
                                {quickFilters.map(q => (
                                    <button
                                        key={q.label}
                                        onClick={() => handleQuick(q.label, q.days)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${activeQuick === q.label
                                            ? 'bg-slate-800 text-white border-slate-800'
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        {q.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-auto pt-3 text-xs text-slate-400">
                                {toDisplay(startDate)} ~ {toDisplay(endDate)} ({periodDays}일)
                            </div>
                        </div>

                        {/* 총 매출 카드 */}
                        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                            <div className="text-sm text-slate-500 mb-1">기간 내 총 매출</div>
                            <div className="text-4xl font-extrabold text-slate-900">{fmt(data.totalRevenue)}원</div>
                            <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                <span>{isPositive ? '+' : ''}{data.changeRate}%</span>
                                <span className="text-slate-400 font-normal ml-1">전기 대비</span>
                            </div>
                        </div>

                        {/* 전기 매출 카드 */}
                        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                            <div className="text-sm text-slate-500 mb-1">지난 {periodDays}일 대비 매출 추이</div>
                            <div className="text-2xl font-bold text-slate-700">{fmt(data.previousTotalRevenue)}원</div>
                            <div className="text-xs text-slate-400 mt-1">직전 동일 기간 비교</div>
                        </div>
                    </div>

                    {/* ===== 차트 그리드 ===== */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* 1. 요일별 매출 (Bar Chart) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800">요일별 매출</h3>
                                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                                    <span>금요일 주말 포함</span>
                                    <button
                                        onClick={() => setFridayWeekend(!fridayWeekend)}
                                        className={`relative w-8 h-4 rounded-full transition-colors ${fridayWeekend ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${fridayWeekend ? 'translate-x-4' : ''}`} />
                                    </button>
                                </label>
                            </div>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={data.salesByWeekday} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="weekday" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(Number(v) / 10000).toFixed(0)}만`} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(v: any) => [`${fmt(Number(v))}원`, '매출']}
                                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 13 }}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Bar dataKey="sales" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out">
                                        {data.salesByWeekday.map((entry, i) => {
                                            const isWeekend = entry.weekdayEn === 'Saturday' || entry.weekdayEn === 'Sunday'
                                                || (fridayWeekend && entry.weekdayEn === 'Friday');
                                            return <Cell key={i} fill={isWeekend ? '#fbbf24' : '#6366f1'} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 2. 시간대별 매출 (Line Chart — storeHours 기반 X축) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800">시간대별 매출</h3>
                                {storeHoursLoaded && (openHour > 0 || closeHour < 23) && (
                                    <span className="text-xs text-slate-400">영업시간 {String(openHour).padStart(2, '0')}:00 ~ {String(closeHour).padStart(2, '0')}:00</span>
                                )}
                            </div>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={filteredHourly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={h => `${h}시`} axisLine={false} tickLine={false} />
                                    <YAxis domain={hourlyYDomain} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(Number(v) / 10000).toFixed(0)}만`} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(v: any) => [`${fmt(Number(v))}원`, '매출']}
                                        labelFormatter={h => `${h}시`}
                                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 13 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        dot={(props: any) => {
                                            const { cx, cy, index } = props;
                                            const isPeak = index === peakLowIdx.peak;
                                            const isLow = index === peakLowIdx.low;
                                            const fill = isPeak ? '#10b981' : isLow ? '#f59e0b' : '#6366f1';
                                            const r = isPeak || isLow ? 6 : 0; // 평상시 점은 숨김
                                            if (r === 0) return null;
                                            return <circle key={index} cx={cx} cy={cy} r={r} fill={fill} stroke="#fff" strokeWidth={2} />;
                                        }}
                                        activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                                        isAnimationActive={true}
                                        animationDuration={1500}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 피크 타임</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 최저 시간</span>
                            </div>
                        </div>

                        {/* 3. 메뉴별 / 카테고리별 트리맵 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                {drillCategory ? (
                                    <button onClick={() => setDrillCategory(null)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                                        <ArrowLeft size={16} /> 전체 카테고리 보기
                                    </button>
                                ) : (
                                    <h3 className="font-bold text-slate-800">
                                        {treemapMode === 'menu' ? '메뉴별 매출' : '카테고리별 매출'}
                                    </h3>
                                )}
                                {!drillCategory && (
                                    <div className="flex items-center bg-slate-100 rounded-full p-0.5">
                                        <button
                                            onClick={() => { setTreemapMode('menu'); setDrillCategory(null); }}
                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${treemapMode === 'menu' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                        >메뉴별</button>
                                        <button
                                            onClick={() => { setTreemapMode('category'); setDrillCategory(null); }}
                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${treemapMode === 'category' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                        >카테고리별</button>
                                    </div>
                                )}
                            </div>
                            {treemapData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <Treemap
                                        data={treemapData}
                                        dataKey="size"
                                        stroke="#fff"
                                        isAnimationActive={true}
                                        animationDuration={1200}
                                        animationEasing="ease-in-out"
                                        content={({ x, y, width, height, name, index, root }: any) => {
                                            if (width < 30 || height < 20) return <g />;
                                            const total = root.value;
                                            const val = treemapData[index]?.size ?? 0;
                                            const ratio = total > 0 ? val / total : 0;
                                            const opacity = 0.4 + (ratio * 0.6);
                                            const fill = `rgba(99, 102, 241, ${opacity})`;
                                            const clipId = `treemap-clip-${index}`;
                                            const fontSize = Math.min(width / 7, 13);
                                            const pctFontSize = Math.min(width / 10, 11);
                                            const padding = 6;
                                            const usableWidth = width - padding * 2;

                                            // 텍스트 줄 바꿈 로직
                                            const wrapText = (text: string, maxW: number, fSize: number): string[] => {
                                                if (!text) return [];
                                                const charWidth = fSize * 0.65;
                                                const maxChars = Math.max(Math.floor(maxW / charWidth), 1);
                                                if (text.length <= maxChars) return [text];
                                                const lines: string[] = [];
                                                for (let i = 0; i < text.length; i += maxChars) {
                                                    lines.push(text.substring(i, i + maxChars));
                                                }
                                                return lines;
                                            };

                                            const showName = width > 40 && height > 30;
                                            const nameLines = showName ? wrapText(name, usableWidth, fontSize) : [];
                                            const lineHeight = fontSize * 1.3;
                                            // 최대 표시 줄 수 제한 (블록 높이 기준)
                                            const maxNameLines = Math.max(Math.floor((height - padding * 2 - (width > 60 && height > 50 ? pctFontSize + 4 : 0)) / lineHeight), 1);
                                            const clampedLines = nameLines.slice(0, maxNameLines);
                                            if (clampedLines.length < nameLines.length && clampedLines.length > 0) {
                                                const last = clampedLines[clampedLines.length - 1];
                                                clampedLines[clampedLines.length - 1] = last.length > 2 ? last.slice(0, -2) + '…' : last;
                                            }

                                            const showPct = width > 60 && height > 50;
                                            const totalTextHeight = clampedLines.length * lineHeight + (showPct ? pctFontSize + 4 : 0);
                                            const textStartY = y + (height - totalTextHeight) / 2 + lineHeight / 2;

                                            return (
                                                <g
                                                    onClick={() => { if (treemapMode === 'category' && !drillCategory) setDrillCategory(name); }}
                                                    style={{ cursor: treemapMode === 'category' && !drillCategory ? 'pointer' : 'default' }}
                                                >
                                                    <defs>
                                                        <clipPath id={clipId}>
                                                            <rect x={x} y={y} width={width} height={height} />
                                                        </clipPath>
                                                    </defs>
                                                    <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} stroke="#fff" strokeWidth={1} />
                                                    <g clipPath={`url(#${clipId})`}>
                                                        {showName && clampedLines.map((line, li) => (
                                                            <text key={li} x={x + width / 2} y={textStartY + li * lineHeight} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={fontSize} fontWeight={600} style={{ pointerEvents: 'none' }}>
                                                                {line}
                                                            </text>
                                                        ))}
                                                        {showPct && (
                                                            <text x={x + width / 2} y={textStartY + clampedLines.length * lineHeight + 4} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.9)" fontSize={pctFontSize} style={{ pointerEvents: 'none' }}>
                                                                {treemapData[index]?.pct}%
                                                            </text>
                                                        )}
                                                    </g>
                                                </g>
                                            );
                                        }}
                                    >
                                        <Tooltip content={<TreemapTooltip />} />
                                    </Treemap>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">데이터 없음</div>
                            )}
                        </div>

                        {/* 4. 매출 Top 5 (Horizontal Bar) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-800 mb-4">매출 상위 5개 메뉴</h3>
                            {data.menuTop5.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={data.menuTop5} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            domain={top5XDomain}
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            tickFormatter={v => `${(Number(v) / 10000).toFixed(0)}만`}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            formatter={(v: any) => [`${fmt(Number(v))}원`, '매출']}
                                            contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 13 }}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="revenue" radius={[0, 6, 6, 0]} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out">
                                            {data.menuTop5.map((_, i) => (
                                                <Cell key={i} fill="#6366f1" />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">데이터 없음</div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <SalesComparisonTab />
            )}

            {loading && (
                <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 pointer-events-none">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
            )}
        </div>
    );
}
