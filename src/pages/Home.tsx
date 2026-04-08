import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowRight,
    ChefHat,
    DollarSign,
    Loader2,
    Package,
    ReceiptText,
    RefreshCcw,
    ShoppingCart,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { homeApi, type HomeDataResponse } from '../services/api';

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString()}원`;
const formatTrend = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

interface MetricCardProps {
    title: string;
    value: string;
    helper: string;
    icon: React.ComponentType<{ size?: number }>;
    tone: 'amber' | 'blue' | 'emerald' | 'rose';
}

interface ActionItem {
    id: string;
    title: string;
    description: string;
    to: string;
    ctaLabel: string;
}

const toneClasses: Record<MetricCardProps['tone'], string> = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
};

function MetricCard({ title, value, helper, icon: Icon, tone }: MetricCardProps) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
                    <p className="mt-2 text-sm text-slate-500">{helper}</p>
                </div>
                <div className={`rounded-2xl border px-3 py-3 ${toneClasses[tone]}`}>
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
}

function SectionCard({
    title,
    description,
    emptyMessage,
    children,
}: {
    title: string;
    description: string;
    emptyMessage?: string;
    children?: ReactNode;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            {children ?? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    {emptyMessage}
                </div>
            )}
        </section>
    );
}

export default function Home() {
    const { userProfile } = useAuth();
    const { storeProfile } = useData();
    const [data, setData] = useState<HomeDataResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchHomeData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) {
                setLoading(true);
            }

            const response = await homeApi.get();
            setData(response.data);
        } catch (error) {
            console.error('Home 데이터 로드 실패:', error);
            if (!isSilent) {
                setData(null);
            }
        } finally {
            if (!isSilent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchHomeData();
        const interval = window.setInterval(() => {
            void fetchHomeData(true);
        }, 120000);

        return () => window.clearInterval(interval);
    }, [fetchHomeData]);

    const quickActions = useMemo<ActionItem[]>(() => {
        if (!data) {
            return [];
        }

        const actions: ActionItem[] = [];
        const { summary, stockWarnings, marginWarnings, topMenus } = data;

        if (stockWarnings.length > 0) {
            actions.push({
                id: 'restock',
                title: `발주가 필요한 품목이 ${stockWarnings.length}개 있습니다`,
                description: `가장 급한 품목은 ${stockWarnings[0].name}입니다. 오늘 입고 내역을 먼저 반영해보세요.`,
                to: '/inventory?tab=receiving',
                ctaLabel: '입고 정리하기',
            });
        } else {
            actions.push({
                id: 'upload-receipt',
                title: '오늘 들어온 영수증부터 올려보세요',
                description: '입고 영수증을 올리면 재고와 평균 단가를 한 번에 정리할 수 있습니다.',
                to: '/inventory?tab=receiving',
                ctaLabel: '영수증 올리기',
            });
        }

        if (marginWarnings.length > 0) {
            actions.push({
                id: 'margin-warning',
                title: '원가 점검이 필요한 메뉴가 있습니다',
                description: `${marginWarnings[0].name} 메뉴의 원가율을 먼저 확인해보세요.`,
                to: '/cost-recipe',
                ctaLabel: '원가 확인하기',
            });
        } else if (topMenus.length > 0) {
            actions.push({
                id: 'top-menu',
                title: `오늘 가장 잘 나가는 메뉴는 ${topMenus[0].name}입니다`,
                description: '잘 팔리는 메뉴 흐름을 확인하고 누락된 매출이 없는지 점검해보세요.',
                to: '/sales',
                ctaLabel: '매출 확인하기',
            });
        }

        if (summary.todayOrders > 0) {
            actions.push({
                id: 'sales-check',
                title: `오늘 판매 ${summary.todayOrders}건이 기록되었습니다`,
                description: `어제 대비 ${formatTrend(summary.orderTrend)} 흐름입니다. 마감 전에 누락된 판매가 없는지 확인하세요.`,
                to: '/sales',
                ctaLabel: '판매 기록 보기',
            });
        } else {
            actions.push({
                id: 'first-sale',
                title: '오늘 첫 판매 또는 수기 기록을 남겨보세요',
                description: '매출 기록이 쌓여야 오늘 운영 상태와 잘 팔린 메뉴를 더 정확하게 보여줄 수 있습니다.',
                to: '/sales',
                ctaLabel: '판매 입력하기',
            });
        }

        return actions.slice(0, 3);
    }, [data]);

    if (loading && !data) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-amber-600" size={40} />
                <p className="text-slate-500 font-medium">오늘 운영 현황을 불러오는 중입니다...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
                <AlertTriangle className="text-amber-600" size={40} />
                <div>
                    <h1 className="text-xl font-bold text-slate-900">홈 데이터를 불러오지 못했습니다</h1>
                    <p className="mt-2 text-sm text-slate-600">백엔드 연결이나 운영 설정을 먼저 확인한 뒤 다시 시도해주세요.</p>
                </div>
                <button
                    onClick={() => void fetchHomeData()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    const { summary, topMenus, stockWarnings, marginWarnings, updatedAt } = data;
    const greetingName = userProfile?.name ?? userProfile?.owner_name ?? '사장님';

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-amber-800 px-8 py-8 text-white shadow-lg">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-200">Daily Cafe Ops</p>
                        <h1 className="mt-3 text-3xl font-black leading-tight">
                            {greetingName} 사장님,
                            <br />
                            오늘 운영에서 먼저 볼 건 이 3가지예요.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                            {storeProfile.store_name}의 매출, 부족 재고, 원가 점검 포인트를 한 화면에 모았습니다.
                            지금 가장 급한 일부터 처리할 수 있게 구성했습니다.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/inventory?tab=receiving"
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-50"
                        >
                            <ReceiptText size={16} />
                            입고 영수증 올리기
                        </Link>
                        <Link
                            to="/sales"
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            <ShoppingCart size={16} />
                            오늘 매출 보기
                        </Link>
                    </div>
                </div>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-slate-100">
                    <RefreshCcw size={12} />
                    <span>마지막 업데이트 {new Date(updatedAt).toLocaleString('ko-KR')}</span>
                </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="오늘 매출"
                    value={formatCurrency(summary.todaySales)}
                    helper={`어제 대비 ${formatTrend(summary.salesTrend)}`}
                    icon={DollarSign}
                    tone="amber"
                />
                <MetricCard
                    title="오늘 판매 건수"
                    value={`${summary.todayOrders.toLocaleString()}건`}
                    helper={`어제 대비 ${formatTrend(summary.orderTrend)}`}
                    icon={ShoppingCart}
                    tone="blue"
                />
                <MetricCard
                    title="발주 필요 품목"
                    value={`${summary.lowStockCount.toLocaleString()}개`}
                    helper={summary.lowStockCount > 0 ? '입고 또는 발주 확인이 필요합니다' : '현재는 급한 발주 품목이 없습니다'}
                    icon={Package}
                    tone="rose"
                />
                <MetricCard
                    title="원가 점검 메뉴"
                    value={`${summary.marginWarningCount.toLocaleString()}개`}
                    helper={summary.marginWarningCount > 0 ? '원가율이 높거나 다시 점검할 메뉴가 있습니다' : '현재 점검이 필요한 메뉴가 없습니다'}
                    icon={ChefHat}
                    tone="emerald"
                />
            </section>

            <SectionCard
                title="오늘 바로 할 일"
                description="앱을 열었을 때 가장 먼저 해야 하는 일만 정리했습니다."
            >
                <div className="grid gap-4 lg:grid-cols-3">
                    {quickActions.map((action) => (
                        <div key={action.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h3 className="text-base font-semibold text-slate-900">{action.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                            <Link
                                to={action.to}
                                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 transition hover:text-amber-800"
                            >
                                {action.ctaLabel}
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    ))}
                </div>
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard
                    title="부족 재고"
                    description="오늘 바로 발주하거나 입고를 확인해야 하는 품목입니다."
                    emptyMessage="현재는 급하게 발주할 품목이 없습니다."
                >
                    {stockWarnings.length > 0 && (
                        <div className="space-y-3">
                            {stockWarnings.slice(0, 5).map((item) => (
                                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{item.name}</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            현재 {item.current.toLocaleString()}
                                            {item.unit} / 안전재고 {item.safety.toLocaleString()}
                                            {item.unit}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                                        발주 필요
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                <SectionCard
                    title="원가 점검 메뉴"
                    description="판매는 되고 있지만 원가율이 높아 먼저 봐야 하는 메뉴입니다."
                    emptyMessage="지금은 특별히 점검할 원가 경고가 없습니다."
                >
                    {marginWarnings.length > 0 && (
                        <div className="space-y-3">
                            {marginWarnings.slice(0, 5).map((item) => (
                                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{item.name}</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            원가율 {item.costRatio.toFixed(1)}% / 판매가 {formatCurrency(item.sellingPrice)}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            item.status === 'danger'
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}
                                    >
                                        {item.status === 'danger' ? '우선 점검' : '점검 권장'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            <SectionCard
                title="오늘 잘 팔린 메뉴"
                description="매출 흐름을 빠르게 파악할 수 있도록 오늘 판매 상위 메뉴를 보여드립니다."
                emptyMessage="아직 오늘 집계된 판매 내역이 없습니다. 첫 판매를 기록해보세요."
            >
                {topMenus.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-3">
                        {topMenus.slice(0, 3).map((menu, index) => (
                            <div key={menu.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                    Top {index + 1}
                                </p>
                                <p className="mt-3 text-xl font-bold text-slate-900">{menu.name}</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    {menu.qty.toLocaleString()}개 판매 / {formatCurrency(menu.revenue)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
