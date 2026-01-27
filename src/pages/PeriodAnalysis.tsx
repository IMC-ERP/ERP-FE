/**
 * PeriodAnalysis Page
 * GCP-ERP 스타일 매출 분석 - Migrated from GCP-ERP-web-build-2.0-main
 */

import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Treemap, Legend } from 'recharts';
import { WEEKDAY_ORDER } from '../constants';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Info, Calendar, Clock } from 'lucide-react';

// Custom content renderer for Treemap
const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, value } = props;
    if (width < 60 || height < 40) return <g />;
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill="#60a5fa" stroke="#fff" strokeWidth={2} />
            <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                {name.split(' (')[0]}
            </text>
            <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="#e0f2fe" fontSize={11} style={{ pointerEvents: 'none' }}>
                {value.toLocaleString()}
            </text>
        </g>
    );
};

export default function PeriodAnalysis() {
    const { sales, isLoading } = useData();
    const [activeTab, setActiveTab] = useState("trend");

    // Trend Tab State
    const [startDate, setStartDate] = useState("2025-10-25");
    const [endDate, setEndDate] = useState("2025-11-24");
    const [includeFridayInWeekend, setIncludeFridayInWeekend] = useState(false);

    // New Operational Hour State
    const [startHour, setStartHour] = useState(8);
    const [endHour, setEndHour] = useState(22);

    // Compare Tab State
    const [compareMode, setCompareMode] = useState<'month' | 'year' | 'quarter'>('month');
    const [periodA, setPeriodA] = useState("2024-11");
    const [periodB, setPeriodB] = useState("2025-11");
    const [compareCategory, setCompareCategory] = useState("All");

    // --- TREND LOGIC ---
    const filteredSales = useMemo(() => {
        return sales.filter(s => s.date >= startDate && s.date <= endDate);
    }, [sales, startDate, endDate]);

    const totalRevenue = filteredSales.reduce((acc, curr) => acc + curr.revenue, 0);

    // --- PREVIOUS PERIOD COMPARISON LOGIC ---
    const comparisonMetrics = useMemo(() => {
        const currentStart = new Date(startDate);
        const currentEnd = new Date(endDate);

        // Calculate duration of selected period
        const diffTime = currentEnd.getTime() - currentStart.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Calculate previous period of same duration
        const prevEnd = new Date(currentStart);
        prevEnd.setDate(prevEnd.getDate() - 1);

        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - (diffDays - 1));

        const prevStartStr = prevStart.toISOString().split('T')[0];
        const prevEndStr = prevEnd.toISOString().split('T')[0];

        const prevSales = sales.filter(s => s.date >= prevStartStr && s.date <= prevEndStr);
        const prevTotalRevenue = prevSales.reduce((acc, curr) => acc + curr.revenue, 0);

        const revenueDiff = totalRevenue - prevTotalRevenue;
        const percentageChange = prevTotalRevenue !== 0 ? (revenueDiff / prevTotalRevenue) * 100 : 0;

        return {
            prevTotalRevenue,
            revenueDiff,
            percentageChange,
            diffDays,
            prevStartStr,
            prevEndStr
        };
    }, [sales, startDate, endDate, totalRevenue]);

    const weeklyData = useMemo(() => {
        const map = new Map<string, number>();
        WEEKDAY_ORDER.forEach(day => map.set(day, 0));
        filteredSales.forEach(s => {
            const date = new Date(s.date);
            const dayKo = date.toLocaleDateString('ko-KR', { weekday: 'short' });
            const cleanDay = dayKo.replace('요일', '');
            map.set(cleanDay, (map.get(cleanDay) || 0) + s.revenue);
        });
        return Array.from(map.entries()).map(([day, revenue]) => ({ day, revenue }));
    }, [filteredSales]);

    const hourlyData = useMemo(() => {
        const buckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, revenue: 0 }));
        filteredSales.forEach(s => {
            const hour = parseInt(s.time.split(':')[0], 10);
            if (buckets[hour]) buckets[hour].revenue += s.revenue;
        });
        return buckets.filter(b => b.hour >= startHour && b.hour <= endHour);
    }, [filteredSales, startHour, endHour]);

    // Find Peak and Low for highlighting
    const { peakHour, lowHour } = useMemo(() => {
        if (hourlyData.length === 0) return { peakHour: -1, lowHour: -1 };
        let maxRev = -1;
        let minRev = Infinity;
        let peak = -1;
        let low = -1;

        hourlyData.forEach(d => {
            if (d.revenue > maxRev) {
                maxRev = d.revenue;
                peak = d.hour;
            }
            if (d.revenue < minRev) {
                minRev = d.revenue;
                low = d.hour;
            }
        });

        return { peakHour: peak, lowHour: low };
    }, [hourlyData]);

    const itemSalesData = useMemo(() => {
        const map = new Map<string, number>();
        filteredSales.forEach(s => {
            map.set(s.itemDetail, (map.get(s.itemDetail) || 0) + s.revenue);
        });
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredSales]);

    // --- COMPARE LOGIC ---
    const { summaryA, summaryB, categoryComparison, topItemsA, topItemsB } = useMemo(() => {
        const getSalesForPeriod = (periodStr: string, mode: 'month' | 'year' | 'quarter') => {
            return sales.filter(s => {
                if (compareCategory !== "All" && s.category !== compareCategory) return false;

                if (mode === 'quarter') {
                    const [year, q] = periodStr.split('-');
                    const sDate = new Date(s.date);
                    const sYear = sDate.getFullYear().toString();
                    const sMonth = sDate.getMonth() + 1;

                    if (sYear !== year) return false;

                    const qNum = parseInt(q);
                    if (qNum === 1) return sMonth >= 1 && sMonth <= 3;
                    if (qNum === 2) return sMonth >= 4 && sMonth <= 6;
                    if (qNum === 3) return sMonth >= 7 && sMonth <= 9;
                    if (qNum === 4) return sMonth >= 10 && sMonth <= 12;
                    return false;
                }

                return s.date.startsWith(periodStr);
            });
        };

        const salesA = getSalesForPeriod(periodA, compareMode);
        const salesB = getSalesForPeriod(periodB, compareMode);

        const calcSummary = (data: typeof sales) => ({
            revenue: data.reduce((sum, s) => sum + s.revenue, 0),
            count: data.length,
            avgTicket: data.length > 0 ? Math.round(data.reduce((sum, s) => sum + s.revenue, 0) / data.length) : 0,
        });

        const sumA = calcSummary(salesA);
        const sumB = calcSummary(salesB);

        const categories = Array.from(new Set([...salesA, ...salesB].map(s => s.category)));
        const catData = categories.map(cat => {
            const revA = salesA.filter(s => s.category === cat).reduce((sum, s) => sum + s.revenue, 0);
            const revB = salesB.filter(s => s.category === cat).reduce((sum, s) => sum + s.revenue, 0);
            return { name: cat, [periodA]: revA, [periodB]: revB };
        });

        const getTopItems = (data: typeof sales) => {
            const map = new Map<string, number>();
            data.forEach(s => map.set(s.itemDetail, (map.get(s.itemDetail) || 0) + s.qty));
            return Array.from(map.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        };

        return {
            summaryA: sumA,
            summaryB: sumB,
            categoryComparison: catData,
            topItemsA: getTopItems(salesA),
            topItemsB: getTopItems(salesB),
        };
    }, [sales, compareMode, periodA, periodB, compareCategory]);

    const renderGrowthBadge = (curr: number, prev: number) => {
        if (prev === 0) return <span className="text-slate-400 text-xs">-</span>;
        const diff = curr - prev;
        const pct = ((diff / prev) * 100).toFixed(1);
        const isPositive = diff > 0;
        const isZero = diff === 0;

        return (
            <div className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-red-50 text-red-600' : isZero ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                {isPositive ? <ArrowUpRight size={12} /> : isZero ? <Minus size={12} /> : <ArrowDownRight size={12} />}
                <span className="ml-1">{Math.abs(Number(pct))}%</span>
            </div>
        );
    };

    const categoriesList = useMemo(() => ["All", ...Array.from(new Set(sales.map(s => s.category)))], [sales]);

    const renderPeriodSelector = (value: string, onChange: (val: string) => void, isPrimary: boolean) => {
        const inputClass = `w-full p-2 border rounded-lg text-sm ${isPrimary ? 'border-blue-300 ring-1 ring-blue-100 bg-white' : 'border-slate-300 bg-slate-50'}`;

        if (compareMode === 'quarter') {
            const [year, quarter] = value.includes('-') ? value.split('-') : [value, '1'];
            return (
                <div className="flex gap-2">
                    <select
                        value={year}
                        onChange={(e) => onChange(`${e.target.value}-${quarter}`)}
                        className={`${inputClass} flex-1`}
                    >
                        {Array.from({ length: 5 }, (_, i) => 2024 + i).map(y => (
                            <option key={y} value={y}>{y}년</option>
                        ))}
                    </select>
                    <select
                        value={quarter}
                        onChange={(e) => onChange(`${year}-${e.target.value}`)}
                        className={`${inputClass} flex-1`}
                    >
                        <option value="1">1분기 (1~3월)</option>
                        <option value="2">2분기 (4~6월)</option>
                        <option value="3">3분기 (7~9월)</option>
                        <option value="4">4분기 (10~12월)</option>
                    </select>
                </div>
            );
        }

        return (
            <input
                type={compareMode === 'month' ? 'month' : 'number'}
                min="2024" max="2030"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputClass}
            />
        );
    };

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-lg font-semibold text-slate-500 animate-pulse">데이터를 불러오는 중입니다...</div>
            </div>
        );
    }

    if (!sales || sales.length === 0) {
        return (
            <div className="space-y-6 animate-fade-in">
                <header>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        📈 매출 분석
                    </h2>
                </header>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                    <h3 className="text-lg font-bold text-blue-800 mb-2">데이터가 없습니다</h3>
                    <p className="text-blue-600">아직 등록된 매출 데이터가 없거나, 데이터를 불러오지 못했습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <header>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    📈 매출 분석
                </h2>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1">
                {["trend", "compare"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === tab
                            ? "bg-white text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        {tab === "trend" && "매출 추이"}
                        {tab === "compare" && "비교하기"}
                    </button>
                ))}
            </div>

            {activeTab === "trend" && (
                <div className="space-y-8 animate-fade-in">
                    {/* Controls & KPI Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* 1. 조회 기간 설정 */}
                        <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <Calendar size={18} className="text-blue-500" />
                                조회 기간 설정
                            </h3>
                            <div className="flex gap-4 items-end mb-5">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">시작일</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">종료일</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2.5">
                                <button onClick={() => { setStartDate("2025-11-17"); setEndDate("2025-11-24") }} className="px-4 py-1.5 bg-slate-100 text-[11px] font-bold text-slate-600 rounded-md hover:bg-slate-200 hover:text-blue-600 transition-all">최근 1주일</button>
                                <button onClick={() => { setStartDate("2025-10-25"); setEndDate("2025-11-24") }} className="px-4 py-1.5 bg-slate-100 text-[11px] font-bold text-slate-600 rounded-md hover:bg-slate-200 hover:text-blue-600 transition-all">최근 1개월</button>
                                <button onClick={() => { setStartDate("2025-08-25"); setEndDate("2025-11-24") }} className="px-4 py-1.5 bg-slate-100 text-[11px] font-bold text-slate-600 rounded-md hover:bg-slate-200 hover:text-blue-600 transition-all">최근 3개월</button>
                            </div>
                        </div>

                        {/* 2. 총 매출 KPI */}
                        <div className="lg:col-span-3 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl border border-blue-100 shadow-lg text-white flex flex-col justify-center">
                            <div className="text-blue-100 font-bold text-[10px] uppercase tracking-wider mb-2.5 flex items-center gap-2 opacity-90">
                                <TrendingUp size={16} />
                                총 매출 (선택 기간)
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black truncate">{totalRevenue.toLocaleString()}</span>
                                    <span className="text-base font-bold text-blue-100/70">원</span>
                                </div>
                                <div className="text-[10px] text-blue-200 mt-2.5 font-medium bg-white/10 px-2 py-0.5 rounded-full w-fit">
                                    조회 일수: {comparisonMetrics.diffDays}일
                                </div>
                            </div>
                        </div>

                        {/* 3. 비교 분석 KPI */}
                        <div className={`lg:col-span-3 p-6 rounded-xl border shadow-lg flex flex-col justify-center transition-all ${comparisonMetrics.revenueDiff >= 0 ? 'bg-white border-rose-100' : 'bg-white border-blue-100'
                            }`}>
                            <div className="flex justify-between items-start mb-2.5">
                                <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2">
                                    <Info size={16} className="text-slate-400" />
                                    전기 대비 증감
                                </div>
                                <div className="group relative">
                                    <span className="cursor-help text-slate-300 hover:text-slate-500"><Info size={14} /></span>
                                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-[10px] text-slate-200 rounded shadow-xl z-20">
                                        비교 기간: {comparisonMetrics.prevStartStr} ~ {comparisonMetrics.prevEndStr} ({comparisonMetrics.diffDays}일)
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <h4 className={`text-base font-bold leading-tight ${comparisonMetrics.revenueDiff >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                                    지난 {comparisonMetrics.diffDays}일 동안 <br />
                                    <span className="text-2xl font-black">{Math.abs(comparisonMetrics.percentageChange).toFixed(1)}%</span> {comparisonMetrics.revenueDiff >= 0 ? '증가' : '감소'}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    {comparisonMetrics.revenueDiff >= 0 ?
                                        <ArrowUpRight size={14} className="text-rose-500" /> :
                                        <ArrowDownRight size={14} className="text-blue-500" />
                                    }
                                    <span className={`text-[11px] font-bold ${comparisonMetrics.revenueDiff >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                        {comparisonMetrics.revenueDiff >= 0 ? '+' : ''}
                                        {comparisonMetrics.revenueDiff.toLocaleString()}원
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly & Hourly Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 요일별 매출 */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">📊 요일별 매출</h3>
                                <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-500">금요일 주말 포함</span>
                                    <button
                                        onClick={() => setIncludeFridayInWeekend(!includeFridayInWeekend)}
                                        className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${includeFridayInWeekend ? 'bg-orange-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${includeFridayInWeekend ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                        <YAxis hide />
                                        <Tooltip formatter={(value) => (value as number)?.toLocaleString() + '원'} cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                                            {weeklyData.map((entry, index) => {
                                                const isWeekend = includeFridayInWeekend
                                                    ? ['금', '토', '일'].includes(entry.day)
                                                    : ['토', '일'].includes(entry.day);
                                                return <Cell key={`cell-${index}`} fill={isWeekend ? '#f97316' : '#3b82f6'} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-2 text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> 평일
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> 주말 {includeFridayInWeekend && '(금 포함)'}
                                </div>
                            </div>
                        </div>

                        {/* 시간대별 매출 추이 */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">⏰ 시간대별 매출 추이</h3>
                                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                    <Clock size={14} className="text-slate-400 ml-1" />
                                    <div className="flex items-center gap-1">
                                        <select
                                            value={startHour}
                                            onChange={(e) => setStartHour(parseInt(e.target.value))}
                                            className="bg-transparent text-[10px] font-bold text-slate-600 outline-none"
                                        >
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                            ))}
                                        </select>
                                        <span className="text-slate-300 text-[10px]">~</span>
                                        <select
                                            value={endHour}
                                            onChange={(e) => setEndHour(parseInt(e.target.value))}
                                            className="bg-transparent text-[10px] font-bold text-slate-600 outline-none"
                                        >
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="h-64 flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={hourlyData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="hour"
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => `${val}시`}
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            formatter={(value) => (value as number)?.toLocaleString() + '원'}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            dot={(props: any) => {
                                                const { cx, cy, payload } = props;
                                                const isPeak = payload.hour === peakHour;
                                                const isLow = payload.hour === lowHour;

                                                if (isPeak) {
                                                    return (
                                                        <g key={`peak-${payload.hour}`}>
                                                            <circle cx={cx} cy={cy} r={6} fill="#10b981" stroke="#fff" strokeWidth={2} />
                                                        </g>
                                                    );
                                                }
                                                if (isLow) {
                                                    return (
                                                        <g key={`low-${payload.hour}`}>
                                                            <circle cx={cx} cy={cy} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                                                        </g>
                                                    );
                                                }
                                                return <circle key={`dot-${payload.hour}`} cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="#fff" strokeWidth={1} />;
                                            }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Peak/Low Analysis Footer */}
                            <div className="mt-4 flex flex-wrap gap-4 text-[11px]">
                                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100">
                                    <span className="font-black">PEAK</span>
                                    <span>{peakHour}시 ({hourlyData.find(d => d.hour === peakHour)?.revenue.toLocaleString()}원)</span>
                                </div>
                                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100">
                                    <span className="font-black">LOW</span>
                                    <span>{lowHour}시 ({hourlyData.find(d => d.hour === lowHour)?.revenue.toLocaleString()}원)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Analysis Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            🛍️ 상품 및 카테고리 분석
                        </h3>
                        <p className="text-sm text-slate-500">박스 크기 = 매출액</p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                                <ResponsiveContainer width="100%" height="100%">
                                    <Treemap
                                        data={itemSalesData}
                                        dataKey="value"
                                        stroke="#fff"
                                        fill="#60a5fa"
                                        content={<CustomTreemapContent />}
                                    >
                                        <Tooltip
                                            formatter={(value) => `${(value as number)?.toLocaleString()}원`}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </Treemap>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                                <h4 className="text-sm font-bold text-slate-700 mb-4">🏆 상품별 매출 순위</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={itemSalesData.slice(0, 10)}
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={150}
                                            tick={{ fontSize: 11, fill: '#475569' }}
                                        />
                                        <Tooltip
                                            formatter={(value) => `${(value as number)?.toLocaleString()}원`}
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "compare" && (
                <div className="space-y-8 animate-fade-in">
                    {/* Comparison Controls */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-6 items-end">
                            <div className="w-full md:w-64">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">비교 기준</label>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => { setCompareMode('month'); setPeriodA('2024-11'); setPeriodB('2025-11'); }}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${compareMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                                    >
                                        월별
                                    </button>
                                    <button
                                        onClick={() => { setCompareMode('quarter'); setPeriodA('2024-1'); setPeriodB('2025-1'); }}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${compareMode === 'quarter' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                                    >
                                        분기별
                                    </button>
                                    <button
                                        onClick={() => { setCompareMode('year'); setPeriodA('2024'); setPeriodB('2025'); }}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${compareMode === 'year' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                                    >
                                        연도별
                                    </button>
                                </div>
                            </div>

                            <div className="w-full md:flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">기준 기간 (과거/A)</label>
                                    {renderPeriodSelector(periodA, setPeriodA, false)}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">비교 기간 (현재/B)</label>
                                    {renderPeriodSelector(periodB, setPeriodB, true)}
                                </div>
                            </div>

                            <div className="w-full md:w-48">
                                <label className="block text-xs font-medium text-slate-500 mb-1">카테고리 필터</label>
                                <select
                                    value={compareCategory}
                                    onChange={(e) => setCompareCategory(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                >
                                    {categoriesList.map(cat => <option key={cat} value={cat}>{cat === 'All' ? '전체 카테고리' : cat}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-slate-500 font-medium">총 매출 (Revenue)</span>
                                {renderGrowthBadge(summaryB.revenue, summaryA.revenue)}
                            </div>
                            <div className="flex items-end gap-3">
                                <span className="text-2xl font-bold text-slate-800">{summaryB.revenue.toLocaleString()}원</span>
                                <span className="text-xs text-slate-400 mb-1">vs {summaryA.revenue.toLocaleString()}원</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-slate-500 font-medium">총 결제 건수 (Orders)</span>
                                {renderGrowthBadge(summaryB.count, summaryA.count)}
                            </div>
                            <div className="flex items-end gap-3">
                                <span className="text-2xl font-bold text-slate-800">{summaryB.count.toLocaleString()}건</span>
                                <span className="text-xs text-slate-400 mb-1">vs {summaryA.count.toLocaleString()}건</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-slate-500 font-medium">평균 주문금액 (Avg Ticket)</span>
                                {renderGrowthBadge(summaryB.avgTicket, summaryA.avgTicket)}
                            </div>
                            <div className="flex items-end gap-3">
                                <span className="text-2xl font-bold text-slate-800">{summaryB.avgTicket.toLocaleString()}원</span>
                                <span className="text-xs text-slate-400 mb-1">vs {summaryA.avgTicket.toLocaleString()}원</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Comparison Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">📊 카테고리별 성과 비교</h3>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryComparison} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value) => (value as number)?.toLocaleString() + '원'} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Bar dataKey={periodA} name={`${periodA} (과거)`} fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} />
                                        <Bar dataKey={periodB} name={`${periodB} (현재)`} fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">🏆 인기 메뉴 랭킹 (판매량 기준)</h3>
                            <div className="flex-1 overflow-auto">
                                <div className="grid grid-cols-2 gap-4 h-full">
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <div className="text-xs font-bold text-slate-500 mb-3 text-center border-b border-slate-200 pb-2">{periodA} Top 5</div>
                                        <div className="space-y-3">
                                            {topItemsA.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                                                        <span className="truncate text-slate-700">{item.name}</span>
                                                    </div>
                                                    <span className="font-mono text-slate-500 text-xs">{item.count}개</span>
                                                </div>
                                            ))}
                                            {topItemsA.length === 0 && <div className="text-center text-xs text-slate-400 py-4">데이터 없음</div>}
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <div className="text-xs font-bold text-blue-600 mb-3 text-center border-b border-blue-200 pb-2">{periodB} Top 5</div>
                                        <div className="space-y-3">
                                            {topItemsB.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                                                        <span className="truncate text-slate-800 font-medium">{item.name}</span>
                                                    </div>
                                                    <span className="font-mono text-blue-600 font-bold text-xs">{item.count}개</span>
                                                </div>
                                            ))}
                                            {topItemsB.length === 0 && <div className="text-center text-xs text-slate-400 py-4">데이터 없음</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
