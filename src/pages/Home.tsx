import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { homeApi, type HomeDataResponse } from '../services/api';
import {
    TrendingUp, TrendingDown, Package, AlertTriangle,
    ShoppingCart, DollarSign, Clock,
    Loader2, RefreshCcw
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function Home() {
    const { userProfile } = useAuth();
    const { storeProfile } = useData();
    const [data, setData] = useState<HomeDataResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchHomeData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const res = await homeApi.get();
            setData(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Home 데이터 로드 실패:', err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeData();
        const interval = setInterval(() => {
            fetchHomeData(true);
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchHomeData]);

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-slate-500 font-medium">오늘의 매장 정보를 분석 중입니다...</p>
            </div>
        );
    }

    const { summary, hourlySales, topMenus, stockWarnings, marginWarnings, openHour, closeHour } = data!;

    const filteredHourly = hourlySales.filter(h => {
        const hr = parseInt(h.hour);
        return hr >= openHour && hr <= closeHour;
    });

    return (
        <div className="flex flex-col space-y-8 animate-fade-in pb-12 w-full max-w-full overflow-hidden">
            {/* 🔹 헤더 인삿말 */}
            <div className="flex items-end justify-between w-full">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {userProfile?.name} 사장님, {storeProfile.store_name}의 오늘 현황입니다.
                    </h1>
                    <p className="text-slate-500 mt-1">오늘 하루도 힘내세요! 실시간으로 매장을 모니터링 중입니다.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
                    <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
                    <span>최종 업데이트: {lastUpdated?.toLocaleTimeString()}</span>
                </div>
            </div>

            {/* 🔹 상단 요약 칩 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <SummaryCard
                    title="오늘 총매출"
                    value={summary.todaySales}
                    trend={summary.salesTrend}
                    icon={DollarSign}
                    color="blue"
                />
                <SummaryCard
                    title="추정 순이익"
                    value={summary.todayProfit}
                    trend={summary.profitTrend}
                    icon={TrendingUp}
                    color="indigo"
                />
                <SummaryCard
                    title="오늘 주문 건수"
                    value={summary.todayOrders}
                    trend={summary.orderTrend}
                    icon={ShoppingCart}
                    color="amber"
                    unit="건"
                />
            </div>

            {/* 🔹 중앙 콘텐츠 섹션 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-start">
                {/* 좌측: 액션 카드 리스트 */}
                <div className="flex flex-col space-y-6">
                    <ActionCard
                        title="긴급 재고 부족"
                        icon={Package}
                        count={stockWarnings.length}
                        type="negative"
                    >
                        {stockWarnings.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                                {stockWarnings.map(item => (
                                    <li key={item.id} className="py-3 flex justify-between items-center">
                                        <div className="pr-4">
                                            <span className="font-semibold text-slate-700 block">{item.name}</span>
                                            <p className="text-xs text-slate-400 mt-0.5">현재: {item.current}{item.unit} / 안전재고: {item.safety}{item.unit}</p>
                                        </div>
                                        <span className="text-xs font-bold px-2 py-1 bg-red-50 text-red-600 rounded border border-red-100 whitespace-nowrap">발주 필요</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState message="모든 재고가 충분합니다." />
                        )}
                    </ActionCard>

                    <ActionCard
                        title="원가율 주의 메뉴"
                        icon={AlertTriangle}
                        count={marginWarnings.length}
                        type="warning"
                    >
                        {marginWarnings.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                                {marginWarnings.map(item => (
                                    <li key={item.id} className="py-3 flex justify-between items-center">
                                        <div className="pr-4">
                                            <span className="font-semibold text-slate-700 block">{item.name}</span>
                                            <p className="text-xs text-slate-400 mt-0.5">판매가: {item.price.toLocaleString()}원</p>
                                        </div>
                                        <div className="text-right whitespace-nowrap">
                                            <span className="text-sm font-bold text-orange-600">{item.margin}%</span>
                                            <p className="text-[10px] text-slate-400 uppercase">Margin</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState message="마진율이 낮은 메뉴가 없습니다." />
                        )}
                    </ActionCard>
                </div>

                {/* 우측: 매출 차트 */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="text-blue-500" size={20} />
                            실시간 매출 흐름
                        </h3>
                        <span className="text-xs text-slate-400">오늘 ({String(openHour).padStart(2, '0')}시 ~ {String(closeHour).padStart(2, '0')}시)</span>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={filteredHourly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="hour"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    tickFormatter={(v) => `${v}시`}
                                />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`${Number(value).toLocaleString()}원`, '매출']}
                                    labelFormatter={(h) => `${h}시`}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                    isAnimationActive={true}
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 🔹 하단 베스트 메뉴 섹션 - 구분 확실히 */}
            <div className="w-full pt-4">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 font-mono tracking-tight uppercase border-l-4 border-blue-600 pl-3">
                        Today's Best Sellers
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {topMenus.map((menu, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1">
                                <div className="w-12 h-12 min-w-[48px] rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
                                    #{idx + 1}
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-bold text-slate-800 truncate">{menu.name}</h4>
                                    <p className="text-sm text-slate-500 mt-0.5 underline decoration-slate-200 underline-offset-4">
                                        {menu.qty}개 판매 <span className="mx-1 text-slate-300">|</span> {menu.revenue.toLocaleString()}원
                                    </p>
                                </div>
                            </div>
                        ))}
                        {topMenus.length === 0 && <p className="col-span-3 text-center text-slate-400 py-6 italic font-medium">아직 집계된 판매 내역이 없습니다.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 🔸 내부 컴포넌트: 요약 카드
function SummaryCard({ title, value, trend, icon: Icon, color, unit = '원' }: any) {
    const isPositive = trend >= 0;
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        amber: 'bg-amber-50 text-amber-600',
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl transition-colors ${colorMap[color]}`}>
                    <Icon size={20} />
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                    {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(trend)}%
                </div>
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{value.toLocaleString()}</span>
                    <span className="text-sm text-slate-400 font-bold">{unit}</span>
                </div>
            </div>
        </div>
    );
}

// 🔸 내부 컴포넌트: 액션 카드 (h-full 제거, 동적 높이 지원)
function ActionCard({ title, icon: Icon, count, children, type }: any) {
    const colorClass = type === 'negative' ? 'text-rose-500' : 'text-amber-500';
    const bgColor = type === 'negative' ? 'bg-rose-50' : 'bg-amber-50';

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col w-full">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={colorClass} size={18} />
                    <h4 className="font-bold text-slate-700 text-sm">{title}</h4>
                </div>
                {count > 0 && (
                    <span className={`px-2 py-0.5 ${bgColor} ${colorClass} text-[10px] font-black rounded-full`}>
                        {count}건
                    </span>
                )}
            </div>
            {/* 4개 이상일 때만 스크롤 활성화 */}
            <div className={`p-4 ${count >= 4 ? 'max-h-[320px] overflow-y-auto custom-scrollbar' : 'h-auto'}`}>
                {children}
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-slate-300">
            <div className="bg-slate-50 p-4 rounded-full mb-3">
                <Package size={28} />
            </div>
            <p className="text-xs font-semibold">{message}</p>
        </div>
    );
}
