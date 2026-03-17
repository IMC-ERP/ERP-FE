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
import { ChevronDown, ChevronRight, Info, Calendar, Plus, Trash2, Tag } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

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

  // ==================== 데이터 로드 ====================

  const fetchProfitData = useCallback(async () => {
    if (!storeId) return;
    try {
      setProfitLoading(true);
      const res = await profitDashboardApi.get(currentMonthKey);
      setProfitData(res.data);
    } catch (err) {
      console.error('수익성 데이터 로드 실패:', err);
    } finally {
      setProfitLoading(false);
    }
  }, [storeId, currentMonthKey]);

  const fetchExpenses = useCallback(async () => {
    if (!storeId) return;
    try {
      setExpensesLoading(true);
      setExpensesError('');
      const res = await expensesApi.getMonthly(storeId, selectedMonth);
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
      setExpensesError('데이터를 불러오는 데 실패했습니다.');
    } finally {
      setExpensesLoading(false);
    }
  }, [storeId, selectedMonth]);

  useEffect(() => { fetchProfitData(); }, [fetchProfitData]);
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ==================== 운영비 핸들러 ====================

  const addExpenseItem = async () => {
    if (!storeId) return;
    if (!newName.trim() || !newAmount.trim()) { setExpensesError('항목명과 금액은 필수입니다.'); return; }
    const amount = parseFloat(newAmount);
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
      if (selectedMonth === currentMonthKey) await fetchProfitData(); // 수익성 데이터도 갱신
    } catch (err: any) {
      setExpensesError(err.response?.data?.detail || '항목 추가에 실패했습니다.');
    } finally { setAddingItem(false); }
  };

  const deleteExpenseItem = async (itemId: string) => {
    if (!storeId) return;
    try {
      await expensesApi.deleteItem(storeId, selectedMonth, itemId);
      await fetchExpenses();
      if (selectedMonth === currentMonthKey) await fetchProfitData();
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
  const dailyStats = profitData?.daily_stats ?? [];

  const totalSales = summary?.accumulated_sales ?? 0;
  const totalCogs = summary?.accumulated_cogs ?? 0;
  const totalExpenses = monthlyExp?.total_expenses ?? 0;
  const totalCost = totalCogs + (includeExpenses ? totalExpenses : 0);
  const netProfit = totalSales - totalCost;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
  const daysPassed = dailyStats.length || 1;
  const avgDailyCost = totalCost / daysPassed;
  const avgDailySales = totalSales / daysPassed;
  const costRatio = totalSales > 0 ? (totalCost / totalSales) * 100 : 0;

  const isPositive = netProfit >= 0;
  const theme = {
    gradient: isPositive ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-red-600',
    textMain: isPositive ? 'text-emerald-600' : 'text-rose-600',
    textSub: isPositive ? 'text-emerald-500' : 'text-rose-500',
    iconColor: isPositive ? 'text-emerald-200' : 'text-rose-200',
    subTitleColor: isPositive ? 'text-emerald-100' : 'text-rose-100',
  };

  // --- 차트 데이터 ---
  const expenseItems = expensesData?.items ? Object.entries(expensesData.items) : [];
  const expTotalAmount = expensesData?.totalAmount ?? 0;

  // Chart B: 카테고리별 그룹핑
  const categoryMap: Record<string, number> = {};
  expenseItems.forEach(([, item]) => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + item.amount;
  });
  const categoryChartData = Object.entries(categoryMap).map(([cat, amt]) => ({
    name: categories.find(c => c.value === cat)?.label || cat,
    value: amt,
    pct: expTotalAmount > 0 ? ((amt / expTotalAmount) * 100).toFixed(1) : '0',
  }));

  // 소액 지출 통합 (3% 이하 항목을 묶음)
  const { processedChartData, smallExpenseDetails } = useMemo(() => {
    const threshold = 3;
    const main = categoryChartData.filter(d => parseFloat(d.pct) > threshold);
    const small = categoryChartData.filter(d => parseFloat(d.pct) <= threshold);
    if (small.length === 0) return { processedChartData: categoryChartData, smallExpenseDetails: [] as typeof categoryChartData };
    const totalSmallValue = small.reduce((s, d) => s + d.value, 0);
    const totalSmallPct = expTotalAmount > 0 ? ((totalSmallValue / expTotalAmount) * 100).toFixed(1) : '0';
    return {
      processedChartData: [...main, { name: '소액 지출', value: totalSmallValue, pct: totalSmallPct }],
      smallExpenseDetails: small,
    };
  }, [categoryChartData, expTotalAmount]);

  // Chart A: 매출 vs 비용
  const isDeficit = totalCost > totalSales;
  const pieData = isDeficit ? [] : [
    { name: '비용', value: totalCost, pct: costRatio.toFixed(1) },
    { name: '순수익', value: Math.max(netProfit, 0), pct: (100 - costRatio).toFixed(1) },
  ];
  const barData = isDeficit ? [
    { name: '매출', value: totalSales },
    { name: '비용', value: totalCost },
  ] : [];

  const getCategoryLabel = (val: string) => categories.find(c => c.value === val)?.label || val;

  // 커스텀 라벨 렌더러 — 조각 내부 중앙에 % 표시
  const renderInsideLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = parseFloat(payload.pct);
    if (pct < 5) return null;
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} style={{ pointerEvents: 'none' }}>
        {payload.pct}%
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
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className={`relative ${theme.gradient} p-8 text-white transition-colors duration-500 rounded-t-2xl ${!showProfitDetails ? 'rounded-b-2xl' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`${theme.subTitleColor} font-medium text-sm`}>실시간 수익성 분석</span>
                <div className="group relative">
                  <Info size={16} className={`${theme.iconColor} cursor-help`} />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-slate-800 text-xs text-slate-200 rounded-lg shadow-xl z-[60]">
                    {profitData ? `${profitData.period.start_date} ~ ${profitData.period.end_date} 기간의 stats_daily + expenses 실제 데이터 기반` : '데이터 로딩 중...'}
                    <div className="absolute left-1.5 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800" />
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-4">
                {profitLoading ? (
                  <h1 className="text-3xl font-light opacity-60">데이터 로딩 중...</h1>
                ) : (
                  <h1 className="text-3xl font-light">
                    현재 이달 수익률은 <span className="font-bold text-5xl">{profitMargin.toFixed(1)}%</span> 입니다.
                  </h1>
                )}
                <button onClick={() => setShowProfitDetails(!showProfitDetails)} className="mb-2 p-1 rounded-full hover:bg-white/20 transition-colors">
                  {showProfitDetails ? <ChevronDown size={28} /> : <ChevronRight size={28} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showProfitDetails && (
          <div className="p-8 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
            {/* 상단 옵션 */}
            <div className="flex justify-end mb-6">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-600 font-medium">운영비 포함</span>
                <button
                  onClick={() => setIncludeExpenses(!includeExpenses)}
                  className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${includeExpenses ? 'bg-slate-700' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${includeExpenses ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 비용 분석 */}
              <div className="flex flex-col h-full">
                <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-3">비용 분석</h3>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-slate-500 text-sm">일 평균 비용</span>
                      <span className="text-slate-700 font-mono font-semibold">{Math.round(avgDailyCost).toLocaleString()}원</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full mb-6">
                      <div className="h-full bg-slate-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(costRatio, 100)}%` }} />
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

              {/* 매출 분석 */}
              <div className="flex flex-col h-full">
                <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-3">매출 분석</h3>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-slate-500 text-sm">일 평균 매출</span>
                      <span className="text-slate-700 font-mono font-semibold">{Math.round(avgDailySales).toLocaleString()}원</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full mb-6">
                      <div className={`h-full rounded-full transition-all duration-700 ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end">
                      <span className="text-slate-800 font-bold">실제 전체 매출</span>
                      <span className="text-2xl font-bold text-slate-800">{Math.round(totalSales).toLocaleString()}원</span>
                    </div>
                    {/* 높이 정렬을 위한 투명 텍스트 */}
                    <div className="text-right text-xs text-transparent mt-1 select-none" aria-hidden="true">(높이 맞춤용)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 순수익 */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
              <div className="text-slate-600 font-medium">총 순수익</div>
              <div className="text-right">
                <div className={`text-3xl font-extrabold ${theme.textMain}`}>{Math.round(netProfit).toLocaleString()}원</div>
                <div className="text-sm font-medium text-slate-400">매출 대비 <span className={theme.textSub}>{profitMargin.toFixed(1)}%</span> 마진</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 2. 차트 카드 2종 ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 차트 A: 매출 대비 비용 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">매출 대비 비용 비율</h3>
          {profitLoading ? (
            <div className="h-52 flex items-center justify-center text-slate-400">로딩 중...</div>
          ) : totalSales === 0 && totalCost === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">데이터가 없습니다.</div>
          ) : isDeficit ? (
            /* 적자: 막대 그래프 */
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()}원`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((_, i) => <Cell key={i} fill={i === 0 ? '#3b82f6' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            /* 흑자: 원 그래프 */
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                  label={renderInsideLabel}
                  labelLine={false}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={i === 1 ? '#10b981' : '#f87171'} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 text-center text-xs text-slate-400">
            {isDeficit ? '⚠️ 비용이 매출을 초과 — 적자 상태' : `비용 비율: ${costRatio.toFixed(1)}%`}
          </div>
        </div>

        {/* 차트 B: 운영비 카테고리별 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">운영비 카테고리별 비율</h3>
          {expensesLoading ? (
            <div className="h-52 flex items-center justify-center text-slate-400">로딩 중...</div>
          ) : categoryChartData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">등록된 운영비가 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={processedChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                  label={renderInsideLabel}
                  labelLine={false}
                >
                  {processedChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 text-center text-xs text-slate-400">
            총 운영비: {expTotalAmount.toLocaleString()}원
          </div>
        </div>
      </div>

      {/* ==================== 3. 매장 운영비 관리 ==================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">매장 운영비 관리</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowExpenseDetails(!showExpenseDetails)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
              {showExpenseDetails ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
            </button>
            <h2 className="text-xl font-bold text-slate-800">
              이번달 매장 운영비는 <span className="text-amber-600">{expTotalAmount.toLocaleString()}원</span> 입니다.
            </h2>
          </div>
        </div>

        {showExpenseDetails && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-fade-in">
            {/* 월 선택 */}
            <div className="flex justify-between items-center mb-6">
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900" style={{ colorScheme: 'light' }} />
              </div>
              <div className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">{selectedMonth}</span>월 데이터 관리 중
                {expensesData && (
                  <span className="ml-2 text-xs text-slate-400">
                    (고정: {(expensesData.totalFixed ?? 0).toLocaleString()}원 / 변동: {(expensesData.totalVariable ?? 0).toLocaleString()}원)
                  </span>
                )}
              </div>
            </div>

            {expensesError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{expensesError}</div>}

            {/* 테이블 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">결제일</th>
                    <th className="px-4 py-3">카테고리</th>
                    <th className="px-4 py-3">항목명</th>
                    <th className="px-4 py-3">설명</th>
                    <th className="px-4 py-3 text-center">유형</th>
                    <th className="px-4 py-3 text-right">금액</th>
                    <th className="px-4 py-3 text-center">관리</th>
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
                        <td className="px-4 py-3 text-slate-500 text-xs">{item.paymentDate}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium"><Tag size={10} /> {getCategoryLabel(item.category)}</span></td>
                        <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate">{item.description || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleItemType(id, item.type)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${item.type === 'fixed' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                            {item.type === 'fixed' ? '🔄 고정비' : '⚡ 변동비'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{item.amount.toLocaleString()}원</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deleteExpenseItem(id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                  <input type="number" placeholder="0" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-right text-slate-900 shadow-sm" />
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-xs font-medium text-slate-500 mb-1">결제일</label>
                  <input type="date" value={newPaymentDate} onChange={e => setNewPaymentDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm" />
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">카테고리</label>
                  <div className="flex gap-2">
                    {showNewCategory ? (
                      <div className="flex-1 flex gap-2">
                        <input type="text" placeholder="새 카테고리 입력" value={customCategory} onChange={e => setCustomCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomCategory()} className="flex-1 p-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm" autoFocus />
                        <button onClick={addCustomCategory} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">확인</button>
                        <button onClick={() => { setShowNewCategory(false); setCustomCategory(''); }} className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-400">취소</button>
                      </div>
                    ) : (
                      <>
                        <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm bg-white">
                          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <button onClick={() => setShowNewCategory(true)} className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 whitespace-nowrap">+ 추가</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-xs font-medium text-slate-500 mb-1">반복 여부</label>
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
                <button onClick={addExpenseItem} disabled={addingItem || !newName || !newAmount} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-95">
                  <Plus size={16} />{addingItem ? '저장 중...' : '추가'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
