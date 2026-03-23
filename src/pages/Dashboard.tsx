/**
 * Dashboard Page
 * GCP-ERP 스타일 경영 현황 대시보드
 */

import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { ChevronDown, ChevronRight, Info, Calendar, Plus, Trash2 } from 'lucide-react';

interface UtilityItem {
  id: string;
  name: string;
  amount: number;
  type: 'recurring' | 'onetime';
}

interface MonthlyUtilities {
  [key: string]: UtilityItem[];
}

export default function Dashboard() {
  const { sales } = useData();

  // --- State Configuration ---
  const [showProfitDetails, setShowProfitDetails] = useState(false);
  const [showUtilityDetails, setShowUtilityDetails] = useState(false);
  const [includeUtilities, setIncludeUtilities] = useState(true);

  // Date State
  const [currentDate] = useState(new Date("2025-11-25"));
  const [selectedUtilityMonth, setSelectedUtilityMonth] = useState("2025-11");

  // Utility Data (사용자 입력 - 향후 API 연동 가능)
  const [utilityData, setUtilityData] = useState<MonthlyUtilities>({});

  // New Utility Input State
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemType, setNewItemType] = useState<'recurring' | 'onetime'>('onetime');

  // --- Calculation Logic ---

  const dateRange = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate);
    end.setDate(currentDate.getDate() - 1);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return { start, end, daysPassed };
  }, [currentDate]);

  const financialMetrics = useMemo(() => {
    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];
    const periodSales = sales.filter(s => s.date >= startStr && s.date <= endStr);
    const totalRevenue = periodSales.reduce((sum, item) => sum + item.revenue, 0);
    const estimatedCOGS = totalRevenue * 0.35;
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const monthlyUtils = utilityData[currentMonthKey] || [];
    const totalUtilities = monthlyUtils.reduce((sum, item) => sum + item.amount, 0);
    const totalCost = estimatedCOGS + (includeUtilities ? totalUtilities : 0);
    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const costRatio = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      avgDailyRevenue: totalRevenue / (dateRange.daysPassed || 1),
      totalCost,
      avgDailyCost: totalCost / (dateRange.daysPassed || 1),
      netProfit,
      profitMargin,
      totalUtilities,
      costRatio
    };
  }, [sales, dateRange, utilityData, includeUtilities, currentDate]);

  // --- Handlers ---

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setSelectedUtilityMonth(newMonth);
    if (!utilityData[newMonth]) {
      const sortedMonths = Object.keys(utilityData).sort();
      const lastMonth = sortedMonths[sortedMonths.length - 1];
      if (lastMonth) {
        const carriedOverItems = utilityData[lastMonth].filter(item => item.type === 'recurring').map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) }));
        setUtilityData(prev => ({ ...prev, [newMonth]: carriedOverItems }));
      } else {
        setUtilityData(prev => ({ ...prev, [newMonth]: [] }));
      }
    }
  };

  const addUtilityItem = () => {
    if (!newItemName || !newItemAmount) return;
    const newItem: UtilityItem = { id: Math.random().toString(36).substr(2, 9), name: newItemName, amount: parseInt(newItemAmount), type: newItemType };
    setUtilityData(prev => ({ ...prev, [selectedUtilityMonth]: [...(prev[selectedUtilityMonth] || []), newItem] }));
    setNewItemName(""); setNewItemAmount("");
  };

  const removeUtilityItem = (id: string) => {
    setUtilityData(prev => ({ ...prev, [selectedUtilityMonth]: prev[selectedUtilityMonth].filter(item => item.id !== id) }));
  };

  const toggleItemType = (id: string) => {
    setUtilityData(prev => ({ ...prev, [selectedUtilityMonth]: prev[selectedUtilityMonth].map(item => item.id === id ? { ...item, type: item.type === 'recurring' ? 'onetime' : 'recurring' } : item) }));
  };

  const currentMonthUtilitiesTotal = (utilityData[selectedUtilityMonth] || []).reduce((sum, item) => sum + item.amount, 0);

  const isPositive = financialMetrics.netProfit > 0;
  const theme = {
    gradient: isPositive ? "bg-gradient-to-r from-rose-500 to-red-600" : "bg-gradient-to-r from-blue-500 to-indigo-600",
    textMain: isPositive ? "text-rose-600" : "text-blue-600",
    textSub: isPositive ? "text-rose-500" : "text-blue-500",
    bgSub: isPositive ? "bg-rose-100" : "bg-blue-100",
    iconColor: isPositive ? "text-rose-200" : "text-blue-200",
    subTitleColor: isPositive ? "text-rose-100" : "text-blue-100"
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in overflow-visible">

      {/* 1. Profitability Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className={`relative ${theme.gradient} p-5 md:p-8 text-white transition-colors duration-500 rounded-t-2xl ${!showProfitDetails ? 'rounded-b-2xl' : ''}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`${theme.subTitleColor} font-medium text-sm`}>실시간 수익성 분석</span>
                <div className="group relative hidden md:block">
                  <Info size={16} className={`${theme.iconColor} cursor-help`} />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-slate-800 text-xs text-slate-200 rounded-lg shadow-xl z-[60]">
                    이번 달 1일({dateRange.start.toLocaleDateString()})부터 어제({dateRange.end.toLocaleDateString()})까지의 데이터 기준 이익률입니다.
                    <div className="absolute left-1.5 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                <h1 className="text-lg sm:text-xl md:text-3xl font-light leading-tight">
                  현재 이달 수익률은 <span className="block sm:inline font-bold text-3xl sm:text-4xl md:text-5xl">{financialMetrics.profitMargin.toFixed(1)}%</span> 입니다.
                </h1>
                <button
                  onClick={() => setShowProfitDetails(!showProfitDetails)}
                  className="self-start sm:self-auto sm:mb-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                  aria-label={showProfitDetails ? '수익성 상세 접기' : '수익성 상세 펼치기'}
                >
                  {showProfitDetails ? <ChevronDown size={28} /> : <ChevronRight size={28} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showProfitDetails && (
          <div className="p-4 md:p-8 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                  <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Cost Analysis</h3>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-600 font-medium">공과금 포함</span>
                    <button
                      onClick={() => setIncludeUtilities(!includeUtilities)}
                      className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${includeUtilities ? 'bg-slate-700' : 'bg-slate-300'}`}
                      aria-label={includeUtilities ? '공과금 포함 끄기' : '공과금 포함 켜기'}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${includeUtilities ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-1">
                    <span className="text-slate-500 text-sm">Average Total Cost (일평균)</span>
                    <span className="text-slate-700 font-mono font-semibold">{Math.round(financialMetrics.avgDailyCost).toLocaleString()}원</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full mb-4">
                    <div className="h-full bg-slate-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(financialMetrics.costRatio, 100)}%` }}></div>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <span className="text-slate-800 font-bold">실제 전체 비용</span>
                    <span className="text-2xl font-bold text-slate-800">{Math.round(financialMetrics.totalCost).toLocaleString()}원</span>
                  </div>
                  {includeUtilities && <div className="text-right text-xs text-slate-400 mt-1">(재료비 추정치 + 공과금 {financialMetrics.totalUtilities.toLocaleString()}원 포함)</div>}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-2">Total Revenue Analysis</h3>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-1">
                    <span className="text-slate-500 text-sm">Average Total Revenue (일평균)</span>
                    <span className="text-slate-700 font-mono font-semibold">{Math.round(financialMetrics.avgDailyRevenue).toLocaleString()}원</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full mb-4">
                    <div className={`h-full rounded-full transition-all duration-700 ${isPositive ? 'bg-rose-400' : 'bg-blue-400'}`} style={{ width: '100%' }}></div>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <span className="text-slate-800 font-bold">실제 전체 수익</span>
                    <span className="text-2xl font-bold text-slate-800">{financialMetrics.totalRevenue.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-slate-600 font-medium">총 순수익 (Net Profit)</div>
              <div className="w-full text-left sm:w-auto sm:text-right">
                <div className={`text-3xl font-extrabold ${theme.textMain}`}>{Math.round(financialMetrics.netProfit).toLocaleString()}원</div>
                <div className="text-sm font-medium text-slate-400">매출 대비 <span className={theme.textSub}>{financialMetrics.profitMargin.toFixed(1)}%</span> 마진</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Utility Bills Management Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">공과금 (세금과공과 제외)</div>
          <div className="flex items-start gap-2">
            <button onClick={() => setShowUtilityDetails(!showUtilityDetails)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors" aria-label={showUtilityDetails ? '공과금 상세 접기' : '공과금 상세 펼치기'}>
              {showUtilityDetails ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">이번달 공과금은 <span className="text-amber-600">{currentMonthUtilitiesTotal.toLocaleString()}원</span> 입니다.</h2>
          </div>
        </div>
        {showUtilityDetails && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input type="month" value={selectedUtilityMonth} onChange={handleMonthChange} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900" style={{ colorScheme: 'light' }} />
              </div>
              <div className="text-sm text-slate-500"><span className="font-medium text-slate-700">{selectedUtilityMonth}</span>월 데이터 관리 중</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="responsive-table-shell">
                <table className="w-full min-w-[640px] text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr><th className="px-4 py-3">항목명</th><th className="px-4 py-3 text-right">금액</th><th className="px-4 py-3 text-center">유형</th><th className="px-4 py-3 text-center">관리</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(utilityData[selectedUtilityMonth] || []).length === 0 ? (<tr><td colSpan={4} className="p-8 text-center text-slate-400">등록된 공과금 내역이 없습니다.</td></tr>) : ((utilityData[selectedUtilityMonth] || []).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{item.amount.toLocaleString()}원</td>
                        <td className="px-4 py-3 text-center"><button onClick={() => toggleItemType(item.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${item.type === 'recurring' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>{item.type === 'recurring' ? '🔄 매달 반복' : '⚡ 이번달만'}</button></td>
                        <td className="px-4 py-3 text-center"><button onClick={() => removeUtilityItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" aria-label={`${item.name} 공과금 항목 삭제`}><Trash2 size={16} /></button></td>
                      </tr>)))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="responsive-table-hint mb-3 sm:hidden">표는 좌우로 밀어서 확인할 수 있습니다.</p>
            <div className="bg-slate-100 p-3 md:p-4 rounded-xl flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-end">
              <div className="flex-1 w-full"><label className="block text-xs font-medium text-slate-500 mb-1">항목 이름</label><input type="text" placeholder="예: 인터넷비" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full p-2.5 md:p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm" /></div>
              <div className="w-full md:w-32"><label className="block text-xs font-medium text-slate-500 mb-1">금액 (원)</label><input type="number" placeholder="0" value={newItemAmount} onChange={(e) => setNewItemAmount(e.target.value)} className="w-full p-2.5 md:p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-right text-slate-900 shadow-sm" /></div>
              <div className="w-full md:w-40"><label className="block text-xs font-medium text-slate-500 mb-1">반복 여부</label><div className="flex bg-white rounded-lg border border-slate-300 p-1 shadow-sm"><button onClick={() => setNewItemType('recurring')} className={`flex-1 text-xs py-1.5 rounded-md ${newItemType === 'recurring' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-400'}`}>매달</button><button onClick={() => setNewItemType('onetime')} className={`flex-1 text-xs py-1.5 rounded-md ${newItemType === 'onetime' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-slate-400'}`}>이번달</button></div></div>
              <button onClick={addUtilityItem} disabled={!newItemName || !newItemAmount} className="w-full md:w-auto px-4 py-2.5 md:py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-95"><Plus size={16} />추가</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
