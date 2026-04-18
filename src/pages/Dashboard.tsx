/**
 * Dashboard Page
 * 경영 현황 대시보드 — 실시간 수익성 분석 + 매장 운영비 관리
 * stats_daily + expenses 백엔드 API 연동
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  profitDashboardApi,
  expensesApi,
  type ProfitDashboardResponse,
  type MonthlyExpensesResponse,
} from '../services/api';
import { ChevronDown, ChevronRight, Info, Calendar, Plus, Trash2, Tag, TrendingUp, Loader2 } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import SpotlightTour from '../components/SpotlightTour';

// ==================== 상수 ====================

const CHART_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const DEFAULT_CATEGORIES = [
  { value: 'rent', label: '임대료' },
  { value: 'utility', label: '공과금' },
  { value: 'labor', label: '인건비' },
  { value: 'supplies', label: '소모품' },
  { value: 'insurance', label: '보험료' },
  { value: 'maintenance', label: '유지보수' },
  { value: 'marketing', label: '마케팅' },
  { value: 'other', label: '기타' },
];

// ==================== 컴포넌트 ====================

export default function Dashboard() {
  const { userProfile } = useAuth();
  const storeId = userProfile?.store_id;
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // --- 수익성 분석 상태 ---
  const [profitData, setProfitData] = useState<ProfitDashboardResponse | null>(null);
  const [profitLoading, setProfitLoading] = useState(true);
  const [showProfitDetails, setShowProfitDetails] = useState(false);
  const [includeExpenses, setIncludeExpenses] = useState(true);

  // --- 운영비 상태 ---
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [expensesData, setExpensesData] = useState<MonthlyExpensesResponse | null>(null);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensesError, setExpensesError] = useState('');
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);

  // 운영비 입력 폼
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'fixed' | 'variable'>('variable');
  const [newCategory, setNewCategory] = useState('utility');
  const [newDescription, setNewDescription] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ==================== 데이터 로드 ====================

  const fetchProfitData = useCallback(async () => {
    // if (!storeId) return; // 주석 처리하여 더미 상점 ID로 진행할 수 있도록 함
    try {
      setProfitLoading(true);
      const res = await profitDashboardApi.get(selectedMonth); // 선택된 월에 맞춰 수익성 데이터 호출
      setProfitData(res.data);
    } catch (err) {
      console.error('수익성 데이터 로드 실패:', err);
      setProfitData(null);
    } finally {
      setProfitLoading(false);
    }
  }, [storeId, selectedMonth]);

  const fetchExpenses = useCallback(async () => {
    // if (!storeId) return; // 주석 처리하여 더미 상점 ID로 진행할 수 있도록 함
    try {
      setExpensesLoading(true);
      setExpensesError('');
      const res = await expensesApi.getMonthly(storeId || 'dummy-store-id', selectedMonth);
      setExpensesData(res.data);
      // 커스텀 카테고리 추출
      const existing = new Set(DEFAULT_CATEGORIES.map(c => c.value));
      if (res.data.items) {
        Object.values(res.data.items).forEach(item => {
          if (!existing.has(item.category)) {
            existing.add(item.category);
            setCategories(prev => prev.some(c => c.value === item.category) ? prev : [...prev, { value: item.category, label: item.category }]);
          }
        });
      }
    } catch (err: any) {
      console.error('운영비 데이터 로드 실패:', err);
      setExpensesData(null);
    } finally {
      setExpensesLoading(false);
    }
  }, [storeId, selectedMonth]);

  useEffect(() => { fetchProfitData(); }, [fetchProfitData]);
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ==================== 운영비 핸들러 ====================

  const addExpenseItem = async () => {
    if (!storeId) return;
    if (!newName.trim() || !newAmount.trim()) { setExpensesError('항목명과 금액은 필수입니다.'); return; }
    // 정규식을 이용해 순수 숫자만 있는지 한 번 더 검증
    if (!/^\d+$/.test(newAmount)) { setExpensesError('금액은 숫자만 입력 가능합니다.'); return; }
    const amount = parseInt(newAmount, 10);
    if (isNaN(amount) || amount <= 0) { setExpensesError('금액을 올바르게 입력하세요.'); return; }
    try {
      setAddingItem(true); setExpensesError('');
      await expensesApi.addItem(storeId, selectedMonth, {
        name: newName.trim(), amount, type: newType, category: newCategory,
        description: newDescription.trim() || undefined,
        paymentDate: newPaymentDate || new Date().toISOString().split('T')[0],
        status: 'paid',
      });
      setNewName(''); setNewAmount(''); setNewDescription(''); setNewPaymentDate('');
      await fetchExpenses();
      await fetchProfitData(); // 수익성 데이터 항상 갱신
    } catch (err: any) {
      setExpensesError(err.response?.data?.detail || '항목 추가에 실패했습니다.');
    } finally { setAddingItem(false); }
  };

  const deleteExpenseItem = async (itemId: string) => {
    if (!storeId) return;
    try {
      await expensesApi.deleteItem(storeId, selectedMonth, itemId);
      setDeleteConfirmId(null);
      await fetchExpenses();
      await fetchProfitData();
    } catch (err: any) { setExpensesError(err.response?.data?.detail || '삭제에 실패했습니다.'); }
  };

  const toggleItemType = async (itemId: string, currentType: string) => {
    if (!storeId) return;
    try {
      await expensesApi.updateItem(storeId, selectedMonth, itemId, { type: currentType === 'fixed' ? 'variable' : 'fixed' });
      await fetchExpenses();
    } catch (err: any) { setExpensesError(err.response?.data?.detail || '수정에 실패했습니다.'); }
  };

  const addCustomCategory = () => {
    if (!customCategory.trim()) return;
    const val = customCategory.trim();
    if (!categories.some(c => c.value === val)) setCategories(prev => [...prev, { value: val, label: val }]);
    setNewCategory(val); setCustomCategory(''); setShowNewCategory(false);
  };

  // ==================== 계산 ====================

  const summary = profitData?.summary;
  const monthlyExp = profitData?.monthly_expenses;

  const totalSales = summary?.accumulated_sales ?? 0;
  const totalCogs = summary?.accumulated_cogs ?? 0;
  const totalExpenses = monthlyExp?.total_expenses ?? 0;
  const totalCost = totalCogs + (includeExpenses ? totalExpenses : 0);
  const netProfit = totalSales - totalCost;
  const profitMargin = totalSales > 0
    ? (netProfit / totalSales) * 100
    : (netProfit < 0 ? -100 : 0);
  const getDaysPassedInMonth = () => {
    if (!selectedMonth) return 1;
    const [yearStr, monthStr] = selectedMonth.split('-');
    const targetYear = parseInt(yearStr, 10);
    const targetMonth = parseInt(monthStr, 10) - 1; // 0-indexed month

    const today = new Date();
    if (today.getFullYear() === targetYear && today.getMonth() === targetMonth) {
      return Math.max(1, today.getDate());
    } else {
      // Past or future month, return total days in that month
      return new Date(targetYear, targetMonth + 1, 0).getDate();
    }
  };

  const daysPassedRaw = getDaysPassedInMonth();
  const safeDaysPassed = (isNaN(daysPassedRaw) || daysPassedRaw <= 0) ? 1 : daysPassedRaw;
  const avgDailyCost = totalCost / safeDaysPassed;
  const avgDailySales = totalSales / safeDaysPassed;
  const costRatio = totalSales > 0 ? (totalCost / totalSales) * 100 : 0;

  // 전월 대비 수익률 지표 (백엔드에서 null 반환 가능)
  const momProfitTrend = (summary as any)?.profitTrend;

  const isPositive = netProfit >= 0;
  // 부드럽고 눈이 편안한 파스텔톤 계열로 완화 (Muted Sage Green / Muted Clay Red)
  const theme = {
    gradient: isPositive ? 'bg-gradient-to-r from-[#448b71] to-[#3a7560]' : 'bg-gradient-to-r from-[#bd5f68] to-[#ab525a]',
    textMain: isPositive ? 'text-[#3a7560]' : 'text-[#ab525a]',
    textSub: isPositive ? 'text-[#448b71]' : 'text-[#bd5f68]',
    iconColor: isPositive ? 'text-[#aee0cd]' : 'text-[#f0b1b7]',
    subTitleColor: isPositive ? 'text-[#d6f0e4]' : 'text-[#fbe0e3]',
  };

  // --- 차트 데이터 ---
  const expenseItems = expensesData?.items ? Object.entries(expensesData.items) : [];
  const expTotalAmount = expensesData?.totalAmount ?? 0;

  // Chart B: 카테고리별 그룹핑
  const categoryMap: Record<string, number> = {};
  expenseItems.forEach(([, item]) => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + item.amount;
  });

  const categoryChartList = Object.entries(categoryMap).filter(([, amt]) => amt > 0);
  const derivedTotal = categoryChartList.reduce((sum, [, amt]) => sum + (amt as number), 0);

  const categoryChartData = categoryChartList
    .map(([cat, amt]) => ({
      name: categories.find(c => c.value === cat)?.label || cat,
      value: amt as number,
      pct: derivedTotal > 0 ? (((amt as number) / derivedTotal) * 100).toFixed(1) : '0.0',
    }));

  // 소액 지출 통합 (3% 이하 항목을 묶음)
  const { processedChartData, smallExpenseDetails } = useMemo(() => {
    const threshold = 3;
    const main = categoryChartData.filter(d => parseFloat(d.pct) > threshold);
    const small = categoryChartData.filter(d => parseFloat(d.pct) <= threshold);
    if (small.length === 0) return { processedChartData: categoryChartData, smallExpenseDetails: [] as typeof categoryChartData };
    const totalSmallValue = small.reduce((s, d) => s + d.value, 0);
    const totalSmallPct = derivedTotal > 0 ? ((totalSmallValue / derivedTotal) * 100).toFixed(1) : '0.0';
    return {
      processedChartData: [...main, { name: '소액 지출', value: totalSmallValue, pct: totalSmallPct }],
      smallExpenseDetails: small,
    };
  }, [categoryChartData, derivedTotal]);

  // Chart A: 매출 대비 비용 -> 수익 구조 분석 (통합 도넛 차트)
  const isDeficit = totalCost > totalSales;
  const pieData = isDeficit
    ? [
      { name: '매출', value: totalSales, pct: ((totalSales / totalCost) * 100).toFixed(1) },
      { name: '적자', value: totalCost - totalSales, pct: (((totalCost - totalSales) / totalCost) * 100).toFixed(1) },
    ]
    : [
      { name: '비용', value: totalCost, pct: costRatio.toFixed(1) },
      { name: '순수익', value: Math.max(netProfit, 0), pct: (100 - costRatio).toFixed(1) },
    ];

  const getCategoryLabel = (val: string) => categories.find(c => c.value === val)?.label || val;
  const selectedMonthLabel = selectedMonth.replace('-', '년 ') + '월';

  // 커스텀 외부 라벨 렌더러 (Direct Labeling — 긴 텍스트 자르기 및 위치 최적화)
  const renderOutsideLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload, percent }: any) => {
    if (isMobile) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    // 반지름을 약간 더 넓게 설정하여 그래프와 겹침 방지 (기존 1.5 -> 1.7)
    const radius = innerRadius + (outerRadius - innerRadius) * 1.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';

    // 항목명이 너무 길 경우 자르기 (최대 8자)
    const truncatedName = payload.name.length > 8
      ? `${payload.name.slice(0, 8)}...`
      : payload.name;

    // 퍼센트 값이 유효하지 않을 경우(NaN 등) 대비 안전 장치
    const safePercent = (percent && isFinite(percent)) ? (percent * 100).toFixed(1) : '0.0';

    return (
      <text
        x={x}
        y={y}
        fill="#475569"
        textAnchor={textAnchor}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
        className="pointer-events-none select-none"
      >
        {truncatedName} {safePercent}%
      </text>
    );
  };

  // 커스텀 툴팁 — 소액 지출 시 세부 항목 리스트 표시
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      if (d.name === '소액 지출' && smallExpenseDetails.length > 0) {
        return (
          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm min-w-[180px]">
            <div className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-100">소액 지출 (합계 {d.pct}%)</div>
            <div className="space-y-1">
              {smallExpenseDetails.map((item, i) => (
                <div key={i} className="flex justify-between gap-4 text-xs">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="text-slate-500 font-medium">{item.pct}% ({Number(item.value).toLocaleString()}원)</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm">
          <div className="font-bold text-slate-800">{d.name}</div>
          <div className="text-slate-600">{Number(d.value).toLocaleString()}원</div>
          {d.pct && <div className="text-slate-400">{d.pct}%</div>}
        </div>
      );
    }
    return null;
  };

  // ==================== JSX ====================

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in overflow-visible">

      {/* ==================== 1. 수익성 분석 카드 ==================== */}
      <div id="tour-dashboard-profit" className="bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className={`relative ${theme.gradient} p-5 sm:p-8 text-white transition-colors duration-500 rounded-t-2xl ${!showProfitDetails ? 'rounded-b-2xl' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <button type="button" className="flex items-center gap-2 mb-2 group cursor-help w-max focus:outline-none" onClick={(e) => { e.currentTarget.focus(); }}>
                <span className={`${theme.subTitleColor} font-bold tracking-wide text-sm`}>실시간 수익성 분석</span>
                <div className="relative flex items-center justify-center">
                  <Info size={16} className={`${theme.iconColor} opacity-80`} />
                  <div className="absolute left-1/2 -translate-x-[32px] top-full mt-3 opacity-0 translate-y-2 group-hover:opacity-100 group-focus:opacity-100 group-hover:translate-y-0 group-focus:translate-y-0 transition-all duration-300 ease-out w-[min(18rem,calc(100vw-3rem))] p-4 bg-slate-800/95 backdrop-blur-sm text-xs text-slate-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[60] pointer-events-none border border-slate-700/50 leading-relaxed font-medium text-left">
                    {profitData ? `${profitData.period.start_date} ~ ${profitData.period.end_date} 기간의 실제 판매량 및 등록된 운영비 데이터를 바탕으로 계산됩니다.` : '데이터 로딩 중...'}
                    <div className="absolute left-[32px] -translate-x-1/2 bottom-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-800/95" />
                  </div>
                </div>
              </button>
              <div className="flex min-h-[48px] w-full flex-row items-end justify-between gap-4 mt-2">
                {profitLoading ? (
                  <div className="flex items-center gap-3 text-white/70">
                    <Loader2 className="animate-spin" size={24} />
                    <h1 className="text-xl sm:text-2xl font-light">데이터를 불러오는 중...</h1>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-end">
                    <h1 className="text-xl sm:text-3xl font-light leading-snug sm:leading-tight break-keep">
                      <span className="opacity-90">{selectedMonth.split('-')[1]}월</span> 수익률은 <br className="sm:hidden" />
                      <span className="font-bold text-4xl sm:text-5xl ml-1 sm:ml-0">{profitMargin.toFixed(1)}%</span> 입니다.
                    </h1>
                    {/* 전월 대비 비교 지표 */}
                    <div className="mt-1 sm:mt-0 sm:mb-2">
                      {momProfitTrend === null || momProfitTrend === undefined ? (
                        <span className="inline-flex items-center whitespace-nowrap gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold leading-none text-slate-100 sm:px-3 sm:py-1.5 sm:text-sm">
                          이전 데이터 없음
                        </span>
                      ) : momProfitTrend > 0 ? (
                        <span className="inline-flex items-center whitespace-nowrap gap-0.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold leading-none text-emerald-100 sm:gap-1 sm:px-3 sm:py-1.5 sm:text-sm">
                          ▲ {momProfitTrend}%
                        </span>
                      ) : momProfitTrend < 0 ? (
                        <span className="inline-flex items-center whitespace-nowrap gap-0.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold leading-none text-rose-100 sm:gap-1 sm:px-3 sm:py-1.5 sm:text-sm">
                          ▼ {Math.abs(momProfitTrend)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center whitespace-nowrap gap-0.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold leading-none text-slate-100 sm:gap-1 sm:px-3 sm:py-1.5 sm:text-sm">
                          0%
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <button
                  id="tour-dashboard-expand"
                  onClick={() => setShowProfitDetails(!showProfitDetails)}
                  className="shrink-0 rounded-full p-1.5 hover:bg-white/20 transition-colors focus:outline-none sm:mb-2 sm:ml-2"
                >
                  <div className={`transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] ${showProfitDetails ? 'rotate-180' : 'rotate-0'}`}>
                    <ChevronDown size={28} className="sm:w-8 sm:h-8" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] ${showProfitDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="p-8 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 매출 분석 (원래 우측에 있던 것 -> 좌측으로) */}
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-3 min-h-[28px]">
                  <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">매출 분석</h3>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-slate-500 text-sm">일 평균 매출</span>
                      <span className="text-slate-700 font-mono font-semibold">{Math.round(avgDailySales).toLocaleString()}원</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end">
                      <span className="text-slate-800 font-bold">실제 전체 매출</span>
                      <span className="text-2xl font-bold text-slate-800">{Math.round(totalSales).toLocaleString()}원</span>
                    </div>
                    {/* 우측 카드와 정확한 높이 정렬을 위해 동일한 텍스트 렌더링 후 투명도 0으로 숨김 처리 */}
                    <div className="text-right text-xs opacity-0 pointer-events-none select-none mt-1" aria-hidden="true">
                      {includeExpenses ? `(원가 ${totalCogs.toLocaleString()}원 + 운영비 ${totalExpenses.toLocaleString()}원)` : `(원가 ${totalCogs.toLocaleString()}원)`}
                    </div>
                  </div>
                </div>
              </div>

              {/* 비용 분석 (원래 좌측에 있던 것 -> 우측으로) */}
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-3 min-h-[28px]">
                  <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">비용 분석</h3>
                  {/* 운영비 포함 토글 이동됨 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">운영비 포함</span>
                    <button
                      onClick={() => setIncludeExpenses(!includeExpenses)}
                      className={`relative w-8 h-4 rounded-full transition-colors duration-200 outline-none ${includeExpenses ? 'bg-slate-700' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${includeExpenses ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-slate-500 text-sm">일 평균 비용</span>
                      <span className="text-slate-700 font-mono font-semibold">{Math.round(avgDailyCost).toLocaleString()}원</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end">
                      <span className="text-slate-800 font-bold">실제 전체 비용</span>
                      <span className="text-2xl font-bold text-slate-800">{Math.round(totalCost).toLocaleString()}원</span>
                    </div>
                    {includeExpenses ? (
                      <div className="text-right text-xs text-slate-400 mt-1">(원가 {totalCogs.toLocaleString()}원 + 운영비 {totalExpenses.toLocaleString()}원)</div>
                    ) : (
                      <div className="text-right text-xs text-slate-400 mt-1">(원가 {totalCogs.toLocaleString()}원)</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 순수익 (컨테이너 박스로 시각적 그룹핑) */}
            <div className={`mt-8 p-6 rounded-xl border ${isPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} flex justify-between items-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]`}>
              <div>
                <div className="text-slate-700 font-bold text-lg flex items-center gap-2">
                  <TrendingUp size={20} className={isPositive ? 'text-emerald-500' : 'text-rose-500'} />
                  총 순수익
                </div>
                <div className="text-sm font-medium text-slate-500 mt-1">
                  매출 대비 <span className={`font-bold ${theme.textMain}`}>{profitMargin.toFixed(1)}%</span> 마진
                </div>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-extrabold tracking-tight ${theme.textMain}`}>
                  {Math.round(netProfit).toLocaleString()}원
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* ==================== 2. 차트 카드 2종 ==================== */}
      <div id="tour-dashboard-charts" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 차트 A: 매출 대비 비용 -> 수익 구조 분석 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">수익 구조 분석</h3>
          {profitLoading ? (
            <div className="h-52 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <span className="text-sm font-medium">분석 중...</span>
            </div>
          ) : (totalSales === 0 && totalCost === 0) ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">데이터가 없습니다.</div>
          ) : (
            /* 수익 구조 도넛 차트 (수익/적자 통합) */
            <div className="relative h-[220px] w-full">
              {/* 도넛 중앙 텍스트 (수익 시 '총 매출', 적자 시 '총 비용') */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {isDeficit ? '총 비용' : '총 매출'}
                </span>
                <span className={`text-xl font-black tracking-tight ${isDeficit ? 'text-rose-600' : 'text-slate-800'}`}>
                  {((isDeficit ? totalCost : totalSales) / 10000).toFixed(0)}만원
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 52 : 60}
                    outerRadius={isMobile ? 72 : 80}
                    paddingAngle={0}
                    minAngle={15} // 아주 작은 슬라이스도 최소 각도 확보하여 라벨 겹침 방지
                    dataKey="value"
                    label={isMobile ? false : renderOutsideLabel}
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} // 지원되지 않는 length 속성 제거
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={isDeficit ? (i === 1 ? '#f43f5e' : '#64748b') : (i === 1 ? '#10b981' : '#64748b')}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 차트 B: 운영비 카테고리별 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">운영비 카테고리별 비율</h3>
          {expensesLoading ? (
            <div className="h-52 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="animate-spin text-amber-500" size={32} />
              <span className="text-sm font-medium">계산 중...</span>
            </div>
          ) : (categoryChartData.length === 0 || expTotalAmount === 0) ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">등록된 운영비가 없습니다.</div>
          ) : (
            <div className="relative h-[240px] w-full">
              {/* 도넛 중앙 총 지출 텍스트 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">총 지출</span>
                <span className="text-xl font-black text-slate-800 tracking-tight">
                  {(derivedTotal / 10000).toFixed(0)}만원
                </span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={processedChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 58 : 70}
                    outerRadius={isMobile ? 78 : 90}
                    paddingAngle={2}
                    minAngle={15} // 운영비 비중이 매우 작은 경우에도 라벨 겹침 방지
                    dataKey="value"
                    label={isMobile ? false : renderOutsideLabel}
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  >
                    {processedChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 3. 매장 운영비 관리 ==================== */}
      <div id="tour-dashboard-manage" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowExpenseDetails(!showExpenseDetails)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Tag size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">매장 운영비 관리 및 상세 내역</h2>
              <p className="text-xs text-slate-500">운영비 항목 추가, 수정 및 삭제</p>
            </div>
          </div>
          <button className="self-end p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors focus:outline-none sm:self-auto">
            <div className={`transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] ${showExpenseDetails ? 'rotate-180' : 'rotate-0'}`}>
              <ChevronDown size={24} />
            </div>
          </button>
        </div>

        <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] ${showExpenseDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="border-t border-slate-100 bg-slate-50/50 p-6">
              {/* 월 선택 */}
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900" style={{ colorScheme: 'light' }} />
              </div>
              <div className="text-xs sm:text-sm text-slate-500">
                <span className="font-medium text-slate-700">{selectedMonthLabel}</span> 데이터 관리 중
                {expensesData && (
                  <span className="mt-1 block text-xs text-slate-400 md:ml-2 md:mt-0 md:inline">
                    (고정: {(expensesData.totalFixed ?? 0).toLocaleString()}원 / 변동: {(expensesData.totalVariable ?? 0).toLocaleString()}원)
                  </span>
                )}
              </div>
            </div>

            {expensesError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{expensesError}</div>}

            {/* 테이블 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[800px] text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">결제일</th>
                      <th className="px-4 py-3 whitespace-nowrap">카테고리</th>
                      <th className="px-4 py-3 whitespace-nowrap">항목명</th>
                      <th className="px-4 py-3 whitespace-nowrap">설명</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">유형</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">금액</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expensesLoading ? (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-400">로딩 중...</td></tr>
                    ) : expenseItems.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-400">등록된 운영비 내역이 없습니다.</td></tr>
                    ) : (
                      expenseItems.map(([id, item]) => (
                        <tr key={id} className="hover:bg-slate-50 group">
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.paymentDate}</td>
                          <td className="px-4 py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium"><Tag size={10} /> {getCategoryLabel(item.category)}</span></td>
                          <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{item.name}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            <div className="max-w-[160px] truncate" title={item.description}>
                              {item.description || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button onClick={() => toggleItemType(id, item.type)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${item.type === 'fixed' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                              {item.type === 'fixed' ? '🔄 고정비' : '⚡ 변동비'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600 whitespace-nowrap">{item.amount.toLocaleString()}원</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button onClick={() => setDeleteConfirmId(id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="삭제"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="responsive-table-hint px-4 py-3 sm:hidden">표는 좌우로 밀어서 확인할 수 있습니다.</p>
            </div>

            {/* 입력 폼 */}
            <div className="bg-slate-100 p-4 rounded-xl space-y-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">운영비 항목 추가</div>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">항목 이름 *</label>
                  <input type="text" placeholder="예: 인터넷 요금" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm" />
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-xs font-medium text-slate-500 mb-1">금액 (원) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="예: 50000"
                    value={newAmount}
                    onChange={e => {
                      // 숫자 이외의 문자(e, +, -, . 등) 제거
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setNewAmount(val);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-right text-slate-900 shadow-sm"
                  />
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-xs font-medium text-slate-500 mb-1">결제일</label>
                  <input type="date" value={newPaymentDate} onChange={e => setNewPaymentDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm" />
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">카테고리</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {showNewCategory ? (
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <input type="text" placeholder="새 카테고리 입력" value={customCategory} onChange={e => setCustomCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomCategory()} className="flex-1 p-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm" autoFocus />
                        <button onClick={addCustomCategory} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">확인</button>
                        <button
                          onClick={() => {
                            setShowNewCategory(false);
                            setCustomCategory('');
                            // 만약 중도 취소 시 현재 선택값이 유효하지 않다면 첫 번째 카테고리로 복구
                            if (!categories.some(c => c.value === newCategory)) {
                              setNewCategory(categories[0]?.value || 'utility');
                            }
                          }}
                          className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-400"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <>
                        <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm bg-white">
                          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <button onClick={() => setShowNewCategory(true)} className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 whitespace-nowrap">+ 새 카테고리</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-xs font-medium text-slate-500 mb-1">비용 유형</label>
                  <div className="flex bg-white rounded-lg border border-slate-300 p-1 shadow-sm">
                    <button onClick={() => setNewType('fixed')} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${newType === 'fixed' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-400'}`}>고정비</button>
                    <button onClick={() => setNewType('variable')} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${newType === 'variable' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-slate-400'}`}>변동비</button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">설명 (선택)</label>
                  <input type="text" placeholder="메모" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={addExpenseItem} disabled={addingItem || !newName || !newAmount} className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-95">
                  <Plus size={16} />{addingItem ? '저장 중...' : '항목 등록'}
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* ==================== 삭제 확인 모달 ==================== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">항목 삭제</h3>
              <p className="text-slate-500 mb-6">정말 삭제하시겠습니까?<br />삭제된 데이터는 복구할 수 없습니다.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => deleteExpenseItem(deleteConfirmId)}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-rose-200"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SpotlightTour
        tourKey="dashboard_page"
        steps={[
          {
            targetId: 'tour-dashboard-profit',
            title: '💰 실시간 수익성 분석',
            content: '이번 달 매장의 실제 수익률과 순수익을 한눈에 파악할 수 있는 가장 중요한 공간입니다.',
            placement: 'bottom',
          },
          {
            targetId: 'tour-dashboard-expand',
            title: '🔍 상세 내역 보기',
            content: '이 버튼을 누르면 매출과 비용의 상세 내역을 포함한 심층 분석 리포트가 펼쳐집니다.',
            placement: 'bottom',
          },
          {
            targetId: 'tour-dashboard-charts',
            title: '📊 지출 구조 시각화',
            content: '임대료, 인건비 등 비중이 높은 지출 항목을 차트로 분석하여 고정비를 줄일 수 있는 포인트를 찾아보세요.',
            placement: 'top',
          },
          {
            targetId: 'tour-dashboard-manage',
            title: '🛠️ 운영비 직접 관리',
            content: '매달 발생하는 운영비를 직접 입력하고 관리하세요. 입력된 정보는 수익성 분석에 즉시 반영됩니다.',
            placement: 'top',
          },
        ]}
        autoStart={true}
        showIntro={false}
      />
    </div>
  );
}
