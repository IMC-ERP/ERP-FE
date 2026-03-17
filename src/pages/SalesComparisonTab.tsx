import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2, ArrowRight, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { analyticsApi, type SalesComparisonResponse } from '../services/api';

const fmt = (n: number) => n.toLocaleString('ko-KR');

function VarianceBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const isZero = value === 0;

    let color = 'text-slate-500 bg-slate-100';
    let Icon = Minus;

    if (isPositive) {
        color = 'text-emerald-600 bg-emerald-50 border-emerald-100';
        Icon = TrendingUp;
    } else if (isNegative) {
        color = 'text-rose-600 bg-rose-50 border-rose-100';
        Icon = TrendingDown;
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-black border ${color} shadow-sm transition-all animate-fade-in`}>
            {!isZero && <Icon size={12} />}
            {isPositive ? '+' : ''}{value}{suffix}
        </span>
    );
}

// KPI 카드 컴포넌트
function KPICard({ title, labelA, valA, labelB, valB, diff, variance, unit = '원' }: any) {
    const isPositive = variance >= 0;
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <VarianceBadge value={variance} />
            </div>

            <div className="space-y-5">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 mb-0.5">{labelA}</span>
                    <span className="text-sm font-bold text-slate-500">{fmt(valA)}{unit}</span>
                </div>

                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 mb-1 leading-none">{labelB}</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-800 tracking-tighter group-hover:text-indigo-600 transition-colors">{fmt(valB)}</span>
                        <span className="text-sm font-bold text-slate-400">{unit}</span>
                    </div>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">전기 대비 변동액</span>
                <span className={`text-[11px] font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isPositive ? '+' : ''}{fmt(diff)}{unit}
                </span>
            </div>
        </div>
    );
}

export default function SalesComparisonTab() {
    const [mode, setMode] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
    const [availableMin, setAvailableMin] = useState<string>('');
    const [availableMax, setAvailableMax] = useState<string>('');
    const [periodA, setPeriodA] = useState<string>('');
    const [periodB, setPeriodB] = useState<string>('');
    const [category, setCategory] = useState<string>('전체 카테고리');
    const [data, setData] = useState<SalesComparisonResponse | null>(null);
    const [loading, setLoading] = useState(false);

    // 1) Fetch Available Dates
    useEffect(() => {
        analyticsApi.getAvailableDates().then(res => {
            setAvailableMin(res.data.min_date);
            setAvailableMax(res.data.max_date);
        }).catch(err => console.error(err));
    }, []);

    // 2) Generate Options
    const options = useMemo(() => {
        if (!availableMin || !availableMax) return [];
        const startY = parseInt(availableMin.substring(0, 4));
        const endY = parseInt(availableMax.substring(0, 4));
        const now = new Date();
        const curY = now.getFullYear();
        const curM = now.getMonth() + 1;
        const result: { value: string; label: string; start: string; end: string }[] = [];

        if (mode === 'monthly') {
            const startM = parseInt(availableMin.substring(4, 6));
            for (let y = startY; y <= endY; y++) {
                for (let m = (y === startY ? startM : 1); m <= 12; m++) {
                    if (y === curY && m >= curM) continue;
                    const mStr = String(m).padStart(2, '0');
                    const value = `${y}-${mStr}`;
                    const label = `${y}년 ${m}월`;
                    const start = `${y}${mStr}01`;
                    const lastDay = new Date(y, m, 0).getDate();
                    const end = `${y}${mStr}${lastDay}`;
                    result.push({ value, label, start, end });
                }
            }
        } else if (mode === 'quarterly') {
            for (let y = startY; y <= endY; y++) {
                for (let q = 1; q <= 4; q++) {
                    const qStartM = (q - 1) * 3 + 1;
                    if (y === curY && qStartM >= curM) continue;
                    const value = `${y}-Q${q}`;
                    const label = `${y}년 ${q}분기`;
                    const mStartStr = String(qStartM).padStart(2, '0');
                    const mEndStr = String(qStartM + 2).padStart(2, '0');
                    const lastDay = new Date(y, qStartM + 2, 0).getDate();
                    const start = `${y}${mStartStr}01`;
                    const end = `${y}${mEndStr}${lastDay}`;
                    result.push({ value, label, start, end });
                }
            }
        } else if (mode === 'yearly') {
            for (let y = startY; y <= endY; y++) {
                if (y === curY) continue;
                const value = `${y}`;
                const label = `${y}년`;
                const start = `${y}0101`;
                const end = `${y}1231`;
                result.push({ value, label, start, end });
            }
        }
        return result.reverse();
    }, [mode, availableMin, availableMax]);

    useEffect(() => {
        if (options.length >= 2) {
            setPeriodA(options[1].value);
            setPeriodB(options[0].value);
        } else if (options.length === 1) {
            setPeriodB(options[0].value);
        }
    }, [mode, options]);

    // 3) Fetch Business Logic
    const handleCompare = useCallback(() => {
        if (!periodA || !periodB) return;
        const optA = options.find(o => o.value === periodA);
        const optB = options.find(o => o.value === periodB);
        if (!optA || !optB) return;

        setLoading(true);
        analyticsApi.getCompareSales(optA.start, optA.end, optB.start, optB.end, category)
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [periodA, periodB, category, options]);

    // Initial load
    useEffect(() => {
        if (periodA && periodB) {
            handleCompare();
        }
    }, [periodA, periodB, handleCompare]);

    const labelA = options.find(o => o.value === periodA)?.label || 'Period A';
    const labelB = options.find(o => o.value === periodB)?.label || 'Period B';

    return (
        <div className="space-y-8 animate-fade-in pb-12 overflow-x-hidden">

            {/* 🎯 컨트롤러 바 (Filter & Compare Button) */}
            <div className="bg-white p-2 rounded-[28px] border border-slate-200 shadow-sm flex flex-col xl:flex-row items-center gap-2">

                {/* 주기 선택 토글 */}
                <div className="bg-slate-100 p-1 rounded-2xl flex w-full xl:w-72">
                    {['monthly', 'quarterly', 'yearly'].map((m: any) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${mode === m ? 'bg-white shadow-sm text-slate-900 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {m === 'monthly' ? '월간' : m === 'quarterly' ? '분기간' : '연간'}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-1 w-full xl:w-auto px-2">
                    {/* Period A */}
                    <div className="flex-1 min-w-[140px] relative">
                        <select
                            value={periodA}
                            onChange={e => setPeriodA(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border-none rounded-2xl text-[13px] font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                        >
                            <option disabled>비교 기준 기간</option>
                            {options.map(o => <option key={o.value} value={o.value}>{o.label} (A)</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    <ArrowRight size={16} className="text-slate-300 hidden xl:block" />

                    {/* Period B */}
                    <div className="flex-1 min-w-[140px] relative">
                        <select
                            value={periodB}
                            onChange={e => setPeriodB(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-indigo-50/50 border-none rounded-2xl text-[13px] font-bold text-indigo-600 appearance-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                        >
                            <option disabled>비교 대상 기간</option>
                            {options.map(o => <option key={o.value} value={o.value}>{o.label} (B)</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="flex-1 min-w-[140px] relative">
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border-none rounded-2xl text-[13px] font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                        >
                            <option value="전체 카테고리">전체 카테고리</option>
                            <option value="Coffee">Coffee</option>
                            <option value="Tea">Tea</option>
                            <option value="Bakery">Bakery</option>
                            <option value="Beverage">Beverage</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {/* Compare Action Button */}
                    <button
                        onClick={handleCompare}
                        disabled={loading}
                        className="xl:ml-2 h-12 px-6 bg-slate-900 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        <span>비교하기</span>
                    </button>
                </div>
            </div>

            {loading && !data && (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                    <p className="text-slate-400 font-bold animate-pulse text-sm">데이터를 비교 분석하고 있습니다...</p>
                </div>
            )}

            {!loading && data && (
                <>
                    {/* 🚀 3대 요약 카드 (Smart Tiles) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KPICard
                            title="총 매출"
                            labelA={labelA} valA={data.summary.revenue.periodA}
                            labelB={labelB} valB={data.summary.revenue.periodB}
                            diff={data.summary.revenue.diff}
                            variance={data.summary.revenue.variance}
                        />
                        <KPICard
                            title="총 주문 건수"
                            labelA={labelA} valA={data.summary.orderCount.periodA}
                            labelB={labelB} valB={data.summary.orderCount.periodB}
                            diff={data.summary.orderCount.diff}
                            variance={data.summary.orderCount.variance}
                            unit="건"
                        />
                        <KPICard
                            title="객단가"
                            labelA={labelA} valA={data.summary.aov.periodA}
                            labelB={labelB} valB={data.summary.aov.periodB}
                            diff={data.summary.aov.diff}
                            variance={data.summary.aov.variance}
                        />
                    </div>

                    {/* 📊 분석 그리드 */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* 카테고리별 비중 변화 (Sales Share by Category) */}
                        <div className="lg:col-span-12 xl:col-span-7 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">카테고리별 매출 비중</h3>
                                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> {labelA}</div>
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> {labelB}</div>
                                </div>
                            </div>

                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.categoryShare} margin={{ top: 0, right: 30, left: 0, bottom: 0 }} layout="vertical">
                                        <CartesianGrid strokeDasharray="6 6" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={12} width={100} tickLine={false} axisLine={false} fontWeight={800} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            content={({ active, payload }: any) => {
                                                if (!active || !payload?.length) return null;
                                                const catData = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-200">
                                                        <div className="font-black text-sm mb-3 border-b border-slate-800 pb-2">{catData.category}</div>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between gap-8 items-center">
                                                                <span className="text-[10px] font-bold text-slate-500">{labelA}</span>
                                                                <span className="text-sm font-black">{fmt(catData.periodA)}원</span>
                                                            </div>
                                                            <div className="flex justify-between gap-8 items-center">
                                                                <span className="text-[10px] font-bold text-indigo-400">{labelB}</span>
                                                                <span className="text-sm font-black text-indigo-400">{fmt(catData.periodB)}원</span>
                                                            </div>
                                                            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">증감률</span>
                                                                <span className={`text-xs font-black ${catData.variance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {catData.variance > 0 ? '+' : ''}{catData.variance}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Bar dataKey="periodA" fill="#f1f5f9" radius={[0, 10, 10, 0]} barSize={24} />
                                        <Bar dataKey="periodB" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={24}>
                                            {data.categoryShare.map((entry, index) => (
                                                <Cell key={index} fill={entry.variance > 0 ? '#6366f1' : '#94a3b8'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 인기 메뉴 랭킹 비교 (Top 5 Menu Rankings) */}
                        <div className="lg:col-span-12 xl:col-span-5 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="text-lg font-black text-slate-800 mb-8 tracking-tight">매출 상위 5개 메뉴</h3>

                            <div className="flex-1 space-y-3">
                                {data.rankings.periodB.map((item, idx) => {
                                    return (
                                        <div key={idx} className="group flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all hover:shadow-lg hover:-translate-y-0.5">
                                            {/* Rank Number */}
                                            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-900 font-black text-lg border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                {item.rank}
                                            </div>

                                            {/* Menu Info */}
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-slate-800 truncate" title={item.name}>{item.name}</h4>
                                                    {item.status === 'new' && (
                                                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded-full uppercase tracking-tighter">New</span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 mt-0.5">{fmt(item.qty)}개 판매 · {fmt(item.revenue)}원</p>
                                            </div>

                                            {/* Rank Change Status */}
                                            <div className="flex flex-col items-center justify-center w-12 bg-white rounded-xl py-2 border border-slate-100 shadow-sm">
                                                {item.status === 'up' && (
                                                    <>
                                                        <ChevronUp size={14} className="text-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-600">{item.rankChange}</span>
                                                    </>
                                                )}
                                                {item.status === 'down' && (
                                                    <>
                                                        <ChevronDown size={14} className="text-rose-500" />
                                                        <span className="text-[10px] font-black text-rose-600">{item.rankChange}</span>
                                                    </>
                                                )}
                                                {item.status === 'unchanged' && (
                                                    <span className="text-slate-300 font-black text-xs">-</span>
                                                )}
                                                {item.status === 'new' && (
                                                    <TrendingUp size={14} className="text-indigo-600" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {data.rankings.periodB.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                                        <RefreshCw size={40} className="mb-4 opacity-20" />
                                        <p className="font-bold text-sm">기록된 데이터가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
