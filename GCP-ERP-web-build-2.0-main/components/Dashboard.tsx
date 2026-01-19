import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { ChevronDown, ChevronRight, Info, Calendar, Plus, Trash2, CheckCircle2, Circle, FileText, Receipt, ArrowDownCircle, Search, Download, RotateCcw } from 'lucide-react';

interface UtilityItem {
  id: string;
  name: string;
  amount: number;
  type: 'recurring' | 'onetime'; // 'recurring' = 매달, 'onetime' = 이번달만
}

interface MonthlyUtilities {
  [key: string]: UtilityItem[]; // key: YYYY-MM
}

// Interface for Expenditure Proof
interface ExpenditureItem {
  id: string;
  date: string;
  vendor: string; // 거래처
  description: string; // 적요/내용
  amount: number;
  proofType: '세금계산서' | '현금영수증' | '간이영수증' | '기타(이체내역)';
}

export const Dashboard = () => {
  const { sales } = useData();

  // --- State Configuration ---
  const [showProfitDetails, setShowProfitDetails] = useState(false);
  const [showUtilityDetails, setShowUtilityDetails] = useState(false);
  const [showExpenditureDetails, setShowExpenditureDetails] = useState(false);
  const [includeUtilities, setIncludeUtilities] = useState(true);
  
  // Date State (Mocking 'Today' as late 2025 to match data)
  const [currentDate] = useState(new Date("2025-11-25")); 
  const [selectedUtilityMonth, setSelectedUtilityMonth] = useState("2025-11");

  // Expenditure Search State (Range)
  const [expSearchStartDate, setExpSearchStartDate] = useState("");
  const [expSearchEndDate, setExpSearchEndDate] = useState("");

  // Initial Mock Utility Data
  const [utilityData, setUtilityData] = useState<MonthlyUtilities>({
    "2025-10": [
      { id: '1', name: '월세', amount: 1500000, type: 'recurring' },
      { id: '2', name: '전기세', amount: 350000, type: 'recurring' },
      { id: '3', name: '수도세', amount: 80000, type: 'recurring' },
      { id: '4', name: '에어컨 수리', amount: 120000, type: 'onetime' },
    ],
    "2025-11": [
      { id: '1', name: '월세', amount: 1500000, type: 'recurring' },
      { id: '2', name: '전기세', amount: 320000, type: 'recurring' },
      { id: '3', name: '수도세', amount: 75000, type: 'recurring' },
      { id: '5', name: '캡스 경비', amount: 50000, type: 'recurring' },
    ]
  });

  // Mock Data for Expenditure Proof
  const [expenditureData, setExpenditureData] = useState<ExpenditureItem[]>([
    { id: '1', date: '2025-11-02', vendor: '을지로 인테리어', description: '매장 조명 수리', amount: 150000, proofType: '세금계산서' },
    { id: '2', date: '2025-11-10', vendor: '다이소', description: '청소용품 구매', amount: 15000, proofType: '현금영수증' },
    { id: '3', date: '2025-11-15', vendor: '김철수 용달', description: '화물 운송비', amount: 50000, proofType: '기타(이체내역)' },
    { id: '4', date: '2025-11-20', vendor: '한전', description: '전력 보수비', amount: 33000, proofType: '현금영수증' },
    { id: '5', date: '2025-11-22', vendor: '카페몰', description: '테이크아웃 비닐', amount: 45000, proofType: '세금계산서' },
    { id: '6', date: '2025-11-23', vendor: '남양유업', description: '우유 샘플 구매', amount: 12000, proofType: '간이영수증' },
  ]);

  // New Utility Input State
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemType, setNewItemType] = useState<'recurring' | 'onetime'>('onetime');

  // New Expenditure Input State
  const [newExpDate, setNewExpDate] = useState("2025-11-25");
  const [newExpVendor, setNewExpVendor] = useState("");
  const [newExpDesc, setNewExpDesc] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpProof, setNewExpProof] = useState<ExpenditureItem['proofType']>('현금영수증');

  // --- Calculation Logic ---

  const dateRange = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate);
    end.setDate(currentDate.getDate() - 1); // Yesterday
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
    
    // Calculate what % of revenue is consumed by costs
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

  const addExpenditureItem = () => {
    if (!newExpVendor || !newExpAmount || !newExpDesc) return;
    const newItem: ExpenditureItem = { id: Math.random().toString(36).substr(2, 9), date: newExpDate, vendor: newExpVendor, description: newExpDesc, amount: parseInt(newExpAmount), proofType: newExpProof };
    setExpenditureData(prev => [newItem, ...prev]);
    setNewExpVendor(""); setNewExpDesc(""); setNewExpAmount("");
  };

  const removeExpenditureItem = (id: string) => {
    setExpenditureData(prev => prev.filter(item => item.id !== id));
  };

  const handleDownloadExcel = () => {
    // CSV Download simulation
    const headers = "날짜,거래처,내용,증빙유형,금액\n";
    const rows = filteredExpenditureData.map(item => `${item.date},${item.vendor},${item.description},${item.proofType},${item.amount}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `expenditure_proof_${selectedUtilityMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Expenditure Filter Logic ---
  const filteredExpenditureData = useMemo(() => {
    return expenditureData
      .filter(item => {
        const afterStart = !expSearchStartDate || item.date >= expSearchStartDate;
        const beforeEnd = !expSearchEndDate || item.date <= expSearchEndDate;
        return afterStart && beforeEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenditureData, expSearchStartDate, expSearchEndDate]);

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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in overflow-visible">
      
      {/* 1. Profitability Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className={`relative ${theme.gradient} p-8 text-white transition-colors duration-500 rounded-t-2xl ${!showProfitDetails ? 'rounded-b-2xl' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`${theme.subTitleColor} font-medium text-sm`}>실시간 수익성 분석</span>
                <div className="group relative">
                  <Info size={16} className={`${theme.iconColor} cursor-help`} />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-slate-800 text-xs text-slate-200 rounded-lg shadow-xl z-[60]">
                    이번 달 1일({dateRange.start.toLocaleDateString()})부터 어제({dateRange.end.toLocaleDateString()})까지의 데이터 기준 이익률입니다.
                    <div className="absolute left-1.5 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-4">
                <h1 className="text-3xl font-light">
                  현재 이달 수익률은 <span className="font-bold text-5xl">{financialMetrics.profitMargin.toFixed(1)}%</span> 입니다.
                </h1>
                <button 
                  onClick={() => setShowProfitDetails(!showProfitDetails)}
                  className="mb-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  {showProfitDetails ? <ChevronDown size={28} /> : <ChevronRight size={28} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showProfitDetails && (
          <div className="p-8 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Cost Analysis</h3>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-600 font-medium">공과금 포함</span>
                    <button 
                      onClick={() => setIncludeUtilities(!includeUtilities)}
                      className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${includeUtilities ? 'bg-slate-700' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${includeUtilities ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-slate-500 text-sm">Average Total Cost (일평균)</span>
                    <span className="text-slate-700 font-mono font-semibold">{Math.round(financialMetrics.avgDailyCost).toLocaleString()}원</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full mb-4">
                    <div className="h-full bg-slate-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(financialMetrics.costRatio, 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-slate-800 font-bold">실제 전체 비용</span>
                    <span className="text-2xl font-bold text-slate-800">{Math.round(financialMetrics.totalCost).toLocaleString()}원</span>
                  </div>
                  {includeUtilities && <div className="text-right text-xs text-slate-400 mt-1">(재료비 추정치 + 공과금 {financialMetrics.totalUtilities.toLocaleString()}원 포함)</div>}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-2">Total Revenue Analysis</h3>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-slate-500 text-sm">Average Total Revenue (일평균)</span>
                    <span className="text-slate-700 font-mono font-semibold">{Math.round(financialMetrics.avgDailyRevenue).toLocaleString()}원</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full mb-4">
                    <div className={`h-full rounded-full transition-all duration-700 ${isPositive ? 'bg-rose-400' : 'bg-blue-400'}`} style={{ width: '100%' }}></div>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-slate-800 font-bold">실제 전체 수익</span>
                    <span className="text-2xl font-bold text-slate-800">{financialMetrics.totalRevenue.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
              <div className="text-slate-600 font-medium">총 순수익 (Net Profit)</div>
              <div className="text-right">
                <div className={`text-3xl font-extrabold ${theme.textMain}`}>{Math.round(financialMetrics.netProfit).toLocaleString()}원</div>
                <div className="text-sm font-medium text-slate-400">매출 대비 <span className={theme.textSub}>{financialMetrics.profitMargin.toFixed(1)}%</span> 마진</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Utility Bills Management Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-6">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">공과금 (세금과공과 제외)</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowUtilityDetails(!showUtilityDetails)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                  {showUtilityDetails ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
              </button>
              <h2 className="text-xl font-bold text-slate-800">이번달 공과금은 <span className="text-amber-600">{currentMonthUtilitiesTotal.toLocaleString()}원</span> 입니다.</h2>
            </div>
         </div>
         {showUtilityDetails && (
            <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                 <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input type="month" value={selectedUtilityMonth} onChange={handleMonthChange} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900" style={{ colorScheme: 'light' }}/>
                 </div>
                 <div className="text-sm text-slate-500"><span className="font-medium text-slate-700">{selectedUtilityMonth}</span>월 데이터 관리 중</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                       <tr><th className="px-4 py-3">항목명</th><th className="px-4 py-3 text-right">금액</th><th className="px-4 py-3 text-center">유형</th><th className="px-4 py-3 text-center">관리</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {(utilityData[selectedUtilityMonth] || []).length === 0 ? (<tr><td colSpan={4} className="p-8 text-center text-slate-400">등록된 공과금 내역이 없습니다.</td></tr>) : ((utilityData[selectedUtilityMonth] || []).map((item) => (
                           <tr key={item.id} className="hover:bg-slate-50 group">
                              <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-600">{item.amount.toLocaleString()}원</td>
                              <td className="px-4 py-3 text-center"><button onClick={() => toggleItemType(item.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${item.type === 'recurring' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>{item.type === 'recurring' ? '🔄 매달 반복' : '⚡ 이번달만'}</button></td>
                              <td className="px-4 py-3 text-center"><button onClick={() => removeUtilityItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button></td>
                           </tr>)))}
                    </tbody>
                 </table>
              </div>
              <div className="bg-slate-100 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 w-full"><label className="block text-xs font-medium text-slate-500 mb-1">항목 이름</label><input type="text" placeholder="예: 인터넷비" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 shadow-sm"/></div>
                 <div className="w-full md:w-32"><label className="block text-xs font-medium text-slate-500 mb-1">금액 (원)</label><input type="number" placeholder="0" value={newItemAmount} onChange={(e) => setNewItemAmount(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-right text-slate-900 shadow-sm"/></div>
                 <div className="w-full md:w-40"><label className="block text-xs font-medium text-slate-500 mb-1">반복 여부</label><div className="flex bg-white rounded-lg border border-slate-300 p-1 shadow-sm"><button onClick={() => setNewItemType('recurring')} className={`flex-1 text-xs py-1.5 rounded-md ${newItemType === 'recurring' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-400'}`}>매달</button><button onClick={() => setNewItemType('onetime')} className={`flex-1 text-xs py-1.5 rounded-md ${newItemType === 'onetime' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-slate-400'}`}>이번달</button></div></div>
                 <button onClick={addUtilityItem} disabled={!newItemName || !newItemAmount} className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-95"><Plus size={16} />추가</button>
              </div>
            </div>
         )}
      </div>

      {/* 3. Expenditure Proof Management Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-6">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">지출 증빙 관리 (세무 보고용)</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowExpenditureDetails(!showExpenditureDetails)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                  {showExpenditureDetails ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
              </button>
              <h2 className="text-xl font-bold text-slate-800">누적 지출 증빙 데이터 보기</h2>
            </div>
         </div>

         {showExpenditureDetails && (
            <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-fade-in">
              <div className="mb-4 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                 <Receipt className="text-blue-500 mt-1" size={20} />
                 <div className="text-sm text-blue-800">
                    <strong>지출 증빙 안내:</strong> 법인카드 외 현금 결제나 계좌 이체 건에 대해 입력해주세요. 
                    세금계산서, 현금영수증, 간이영수증 등 적격 증빙 종류를 선택하여 관리하면 세금 감면에 도움이 됩니다.
                 </div>
              </div>

              {/* Search and Action Bar */}
              <div className="flex flex-col md:flex-row gap-3 mb-4 items-center">
                 <div className="flex items-center gap-2 flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 shadow-sm">
                    <Calendar className="text-slate-400 shrink-0" size={18} />
                    <div className="flex items-center gap-2 flex-1">
                      <input 
                        type="date" 
                        title="시작 날짜"
                        value={expSearchStartDate}
                        onChange={(e) => setExpSearchStartDate(e.target.value)}
                        className="bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 text-slate-900 font-bold p-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                        style={{ colorScheme: 'light' }}
                      />
                      <span className="text-slate-400 text-sm font-black shrink-0 px-1">~</span>
                      <input 
                        type="date" 
                        title="종료 날짜"
                        value={expSearchEndDate}
                        onChange={(e) => setExpSearchEndDate(e.target.value)}
                        className="bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 text-slate-900 font-bold p-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                        style={{ colorScheme: 'light' }}
                      />
                      {(expSearchStartDate || expSearchEndDate) && (
                        <button 
                          onClick={() => { setExpSearchStartDate(""); setExpSearchEndDate(""); }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all shrink-0 ml-1"
                          title="필터 초기화"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                 </div>
                 <button 
                   onClick={handleDownloadExcel}
                   className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-100 transition-all whitespace-nowrap active:scale-95"
                 >
                    <Download size={18} /> 엑셀 다운로드
                 </button>
              </div>

              {/* Data Table Area */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6 flex flex-col">
                 <div className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 flex text-xs md:text-sm uppercase tracking-wider">
                    <div className="w-28 px-4 py-3">날짜</div>
                    <div className="w-28 px-4 py-3">거래처</div>
                    <div className="flex-1 px-4 py-3">적요(내용)</div>
                    <div className="w-36 px-4 py-3 text-center">증빙유형</div>
                    <div className="w-28 px-4 py-3 text-right">금액</div>
                    <div className="w-16 px-4 py-3 text-center">삭제</div>
                 </div>

                 {/* Scrollable Body */}
                 <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                    {filteredExpenditureData.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-sm italic">해당 날짜 범위에 조회된 내역이 없습니다.</div>
                    ) : (
                      filteredExpenditureData.map((item) => (
                        <div key={item.id} className="flex items-center text-sm border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                           <div className="w-28 px-4 py-3 text-slate-600 font-mono">{item.date}</div>
                           <div className="w-28 px-4 py-3 font-semibold text-slate-800 truncate">{item.vendor}</div>
                           <div className="flex-1 px-4 py-3 text-slate-600 truncate">{item.description}</div>
                           <div className="w-36 px-4 py-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                                item.proofType === '세금계산서' ? 'border-blue-200 bg-blue-50 text-blue-700' : 
                                item.proofType === '현금영수증' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                                'border-slate-200 bg-slate-50 text-slate-600'
                              }`}>{item.proofType}</span>
                           </div>
                           <div className="w-28 px-4 py-3 text-right font-mono text-slate-900 font-bold">{item.amount.toLocaleString()}원</div>
                           <div className="w-16 px-4 py-3 text-center">
                              <button 
                                onClick={() => removeExpenditureItem(item.id)} 
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
              </div>

              <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 shadow-inner">
                 <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-600"/> 새 지출 내역 추가</h4>
                 <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">날짜</label>
                      <input type="date" value={newExpDate} onChange={(e) => setNewExpDate(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-medium" style={{ colorScheme: 'light' }}/>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">거래처</label>
                      <input type="text" placeholder="예: 다이소" value={newExpVendor} onChange={(e) => setNewExpVendor(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"/>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">내용 (적요)</label>
                      <input type="text" placeholder="예: 청소용품" value={newExpDesc} onChange={(e) => setNewExpDesc(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"/>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">금액</label>
                      <input type="number" value={newExpAmount} onChange={(e) => setNewExpAmount(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 text-right focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-mono"/>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">증빙 유형</label>
                      <select value={newExpProof} onChange={(e) => setNewExpProof(e.target.value as any)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-medium">
                        <option value="세금계산서">세금계산서</option>
                        <option value="현금영수증">현금영수증</option>
                        <option value="간이영수증">간이영수증</option>
                        <option value="기타(이체내역)">기타(이체)</option>
                      </select>
                    </div>
                 </div>
                 <button 
                   onClick={addExpenditureItem} 
                   disabled={!newExpVendor || !newExpAmount} 
                   className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg disabled:opacity-50 active:scale-[0.99]"
                 >
                   지출 내역 등록하기
                 </button>
              </div>
            </div>
         )}
      </div>

    </div>
  );
};