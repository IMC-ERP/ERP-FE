/**
 * Sales Analysis Page — 매출 분석 대시보드
 *
 * Recharts 기반 4대 차트 + Hero Cards + Quick 필터 + 달력 기간 선택
 * 백엔드 GET /api/v1/analytics/sales 연동
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Cell
} from 'recharts';
import { Info, Loader2, Calendar } from 'lucide-react';
import { analyticsApi, storeHoursApi, type SalesAnalyticsResponse } from '../services/api';

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

    const [startDate, setStartDate] = useState(toYMD(monthStart));
    const [endDate, setEndDate] = useState(toYMD(now));
    const [data, setData] = useState<SalesAnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeQuick, setActiveQuick] = useState<string | null>(null);
    const [dateError, setDateError] = useState<string | null>(null);

    // 차트 옵션
    const [fridayWeekend, setFridayWeekend] = useState(false);

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
            setData(null);
            setStoreHoursLoaded(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (startDate > endDate) {
            setDateError('시작일은 종료일보다 빨라야 합니다.');
            return;
        }
        setDateError(null);
        fetchData(startDate, endDate);
    }, [startDate, endDate, fetchData]);

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
        const newStart = fromInputDate(v);
        setStartDate(newStart);
        setActiveQuick(null);
    };
    const handleEndChange = (v: string) => {
        const newEnd = fromInputDate(v);
        setEndDate(newEnd);
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
        let allSame = true;
        const firstVal = filteredHourly[0].sales;

        filteredHourly.forEach((h, i) => {
            if (h.sales !== firstVal) allSame = false;
            if (h.sales > filteredHourly[peakI].sales) peakI = i;
            if (h.sales < filteredHourly[lowI].sales) lowI = i;
        });

        if (allSame) return { peak: -1, low: -1 };
        return { peak: peakI, low: lowI };
    }, [filteredHourly]);

    const hourlyYDomain = useMemo(() => smartYDomain(filteredHourly.map(h => h.sales)), [filteredHourly]);

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


    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">

            {/* ===== 페이지 타이틀 ===== */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">매출 분석</h2>
            </div>

            <>
                {/* ===== 기간 설정 + 통합 Hero Card (같은 행) ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* 기간 설정 카드 */}
                    <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar size={16} className="text-slate-500" />
                            <span className="text-sm font-semibold text-slate-700">조회 기간</span>
                            <div className="group relative ml-auto">
                                <Info size={14} className="text-slate-400 cursor-help" />
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-slate-800 text-xs text-slate-200 rounded-lg shadow-xl z-50 pointer-events-none">
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
                                onFocus={() => setActiveQuick(null)}
                                onClick={() => setActiveQuick(null)}
                                className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                            <span className="text-slate-400 text-xs">~</span>
                            <input
                                type="date"
                                value={toInputDate(endDate)}
                                onChange={e => handleEndChange(e.target.value)}
                                onFocus={() => setActiveQuick(null)}
                                onClick={() => setActiveQuick(null)}
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

                        {dateError && (
                            <div className="mt-2 text-[10px] font-bold text-rose-500 bg-rose-50 p-1.5 rounded animate-pulse">
                                ⚠️ {dateError}
                            </div>
                        )}

                        <div className="mt-auto pt-3 text-xs text-slate-400">
                            {toDisplay(startDate)} ~ {toDisplay(endDate)} ({periodDays}일)
                        </div>
                    </div>

                    {/* 병합된 총 매출 카드 */}
                    <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50" />
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">기간 내 총 매출</div>
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                            <div className="text-4xl font-extrabold text-slate-900 tracking-tighter">{fmt(data.totalRevenue)}<span className="text-2xl font-bold ml-1 text-slate-500">원</span></div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-slate-500 text-sm hidden sm:inline opacity-30"> | </span>
                                <span className="text-slate-500 text-sm font-medium">지난 {periodDays}일 대비</span>
                                {data.changeRate === null || data.changeRate === undefined ? (
                                    <span className="font-bold text-slate-400 text-sm">비교 불가</span>
                                ) : data.changeRate > 0 ? (
                                    <span className="font-bold text-emerald-600">▲ {data.changeRate.toFixed(1)}%</span>
                                ) : data.changeRate < 0 ? (
                                    <span className="font-bold text-rose-600">▼ {Math.abs(data.changeRate).toFixed(1)}%</span>
                                ) : (
                                    <span className="font-bold text-slate-400">0.0%</span>
                                )}
                                <span className="text-slate-400 text-[10px] font-normal">(직전 동기 {fmt(data.previousTotalRevenue)}원)</span>
                            </div>
                        </div>
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
                                    formatter={(v: any) => [`${(Number(v) / 10000).toFixed(0)}만`, '매출']}
                                    contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 13 }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar
                                    dataKey="sales"
                                    radius={[6, 6, 0, 0]}
                                    background={{ fill: '#f1f5f9', radius: 6 }}
                                    isAnimationActive={true}
                                    animationDuration={300}
                                    animationEasing="ease-out"
                                >
                                    {data.salesByWeekday.map((entry, i) => {
                                        const isWeekend = entry.weekdayEn === 'Sat' || entry.weekdayEn === 'Sun'
                                            || (fridayWeekend && entry.weekdayEn === 'Fri');
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
                            <LineChart data={filteredHourly} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={h => `${h}시`} axisLine={false} tickLine={false} interval={0} />
                                <YAxis domain={hourlyYDomain} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${fmt(Number(v))}원`} axisLine={false} tickLine={false} width={80} />
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
                                    animationDuration={300}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 피크 타임</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 최저 시간</span>
                        </div>
                    </div>

                    {/* 3. 매출 Top 5 (Horizontal Bar) - 트리맵 삭제 후 전체 너비 차지 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
                        <h3 className="font-bold text-slate-800 mb-4">매출 상위 5개 메뉴</h3>
                        {data.menuTop5.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={data.menuTop5} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        domain={top5XDomain}
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        tickFormatter={v => `${(Number(v) / 10000).toFixed(0)}만`}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(v: any) => [`${(Number(v) / 10000).toFixed(0)}만`, '매출']}
                                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 13 }}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} isAnimationActive={true} animationDuration={300} animationEasing="ease-out" barSize={32}>
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

            {loading && (
                <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 pointer-events-none">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
            )}
        </div>
    );
}
