import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  RefreshCw, Upload, TrendingUp, AlertTriangle, 
  DollarSign, Camera, Package
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

// Mock Data for AI Prediction Chart
const generatePredictionData = () => {
  const data = [];
  const today = new Date("2025-12-05");
  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    data.push({
      date: d.toISOString().split('T')[0].slice(5), // MM-DD
      actual: i < 1 ? 10 : null, // Show actual for today only
      predicted: Math.floor(Math.random() * 20) + 5 + (i % 7 === 5 || i % 7 === 6 ? 10 : 0), // Random prediction with weekend spike
      confidenceLower: 0,
      confidenceUpper: 0
    });
  }
  // Fill confidence intervals
  return data.map(d => ({
    ...d,
    confidenceLower: (d.predicted || 0) * 0.8,
    confidenceUpper: (d.predicted || 0) * 1.2
  }));
};

export const Inventory = () => {
  const { inventory } = useData();
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedMenu, setSelectedMenu] = useState("Americano (I/H)");
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh Handler
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    alert("데이터를 새로 불러왔습니다. (캐시 초기화)");
  };

  // --- Sub-components for Tabs ---

  // 1. Raw Material Price Tab
  const PriceTab = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
        <span className="text-2xl">💸</span>
        <h2>원재료 시세 비교</h2>
      </div>

      <div className="space-y-4">
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">비교할 품목(선택은 옵션)</label>
           <select className="w-full p-3 bg-slate-100 border-none rounded-lg text-slate-700 font-medium">
              <option>딸기 1kg(제철)</option>
              <option>우유 1L</option>
              <option>원두 1kg</option>
           </select>
           <p className="text-xs text-slate-400 mt-1">추천 검색어: 딸기 1kg · 단위: 1kg</p>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">검색어 직접 입력</label>
           <input 
             type="text" 
             defaultValue="딸기 1kg"
             className="w-full p-3 bg-slate-100 border-none rounded-lg text-slate-700"
           />
        </div>

        <div className="text-sm text-slate-500 flex items-center gap-1">
           키 상태 · NAVER: <span className="text-red-500 font-bold flex items-center"><AlertTriangle size={14} /> 없음</span>
        </div>

        <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
           시세 불러오기
        </button>

        <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-lg font-medium">
           시세를 불러오려면 검색어 입력 후 버튼을 눌러주세요.
        </div>
      </div>
    </div>
  );

  // 2. Inventory Input Tab
  const InputTab = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
        <span className="text-2xl">📸</span>
        <h2>영수증 기반 재고 입고</h2>
      </div>
      <p className="text-slate-500 text-sm">원재료 구매 영수증을 업로드하면 AI가 자동으로 내역을 입력해줍니다.</p>

      <div className="mt-4">
         <h3 className="text-lg font-bold text-slate-800 mb-4">영수증 사진 업로드</h3>
         <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 text-center hover:bg-slate-100 transition-colors cursor-pointer">
            <div className="mb-3 flex justify-center">
               <Upload className="text-slate-400" size={48} />
            </div>
            <p className="font-bold text-slate-700">Drag and drop file here</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Limit 200MB per file • PNG, JPG, JPEG, WEBP</p>
            <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50">
               Browse files
            </button>
         </div>
      </div>
    </div>
  );

  // 3. Inventory Summary Tab
  const SummaryTab = () => {
    // Helper to calculate status and display values
    const getRowData = (item: any, index: number) => {
      const dailyUsage = item.avgDailyUsage || (Math.random() * 500); // Mock usage
      const daysCover = item.currentStock / (dailyUsage || 1);
      const isLow = daysCover < item.leadTimeDays + 2;
      const isVeryLow = daysCover < item.leadTimeDays;
      
      let status = { label: "충분", color: "text-green-600", dot: "bg-green-500" };
      if (isVeryLow) status = { label: "위험", color: "text-red-600", dot: "bg-red-500" };
      else if (isLow) status = { label: "주의", color: "text-amber-500", dot: "bg-amber-400" };

      // Mock D-day string
      const dDay = daysCover > 100 ? "D-∞" : `D-${Math.floor(daysCover)}`;
      
      return {
        id: item.id,
        index: index + 1,
        name: item.name_ko,
        status,
        currentStockStr: `${item.currentStock.toLocaleString()}${item.uom} (약 ${(item.currentStock).toLocaleString()}${item.uom === 'g' ? '잔' : '개'})`, // Simplified
        dailyUsage: dailyUsage.toFixed(2) + item.uom,
        daysCover: daysCover > 999 ? 9999 : daysCover.toFixed(1),
        dDay,
        orderPoint: `${item.leadTimeDays}일 전`,
        supplyMode: item.supplyMode
      };
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <h2>주요 재고 현황 (잔/개 단위로 직관적으로)</h2>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                   {/* Column Header similar to screenshot */}
                   <th className="px-4 py-3 border-r border-slate-200 w-12 text-center">No</th>
                   <th className="px-4 py-3 border-r border-slate-200">품목</th>
                   <th className="px-4 py-3 border-r border-slate-200">상태</th>
                   <th className="px-4 py-3 border-r border-slate-200">현재 재고</th>
                   <th className="px-4 py-3 border-r border-slate-200">일평균 소진</th>
                   <th className="px-4 py-3 border-r border-slate-200">판매 가능 일수(일)</th>
                   <th className="px-4 py-3 border-r border-slate-200">D-day</th>
                   <th className="px-4 py-3 border-r border-slate-200">발주 시점</th>
                   <th className="px-4 py-3">공급 방식</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item, idx) => {
                  const row = getRowData(item, idx);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                       <td className="px-4 py-3 text-center text-slate-400 border-r border-slate-100">{5 + idx}</td>
                       <td className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100">{row.name}</td>
                       <td className="px-4 py-3 border-r border-slate-100">
                          <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full shadow-sm ${row.status.dot}`}></div>
                             <span className={`font-bold ${row.status.color}`}>{row.status.label}</span>
                          </div>
                       </td>
                       <td className="px-4 py-3 border-r border-slate-100 text-slate-700">{row.currentStockStr}</td>
                       <td className="px-4 py-3 border-r border-slate-100 text-slate-600">{row.dailyUsage}</td>
                       <td className="px-4 py-3 border-r border-slate-100 text-slate-600 text-right">{row.daysCover}</td>
                       <td className="px-4 py-3 border-r border-slate-100 font-mono font-medium text-slate-800">{row.dDay}</td>
                       <td className="px-4 py-3 border-r border-slate-100 text-slate-600">{row.orderPoint}</td>
                       <td className="px-4 py-3 text-slate-600">{row.supplyMode}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 bg-white">
           <button className="flex items-center gap-2 text-sm font-bold text-slate-700 w-full">
              <ChevronRightIcon size={16} /> 왜 그렇지? (상세 설명 모아보기)
           </button>
        </div>
      </div>
    );
  };

  // 4. AI Impact Tab
  const AiImpactTab = () => {
    const data = useMemo(() => generatePredictionData(), []);
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <span className="text-2xl">🔮</span>
          <h2>메뉴별 재고 영향도 분석 (AI 예측)</h2>
        </div>

        <div className="space-y-2">
           <label className="text-sm font-bold text-slate-600">분석할 메뉴를 선택하세요</label>
           <select 
             value={selectedMenu}
             onChange={(e) => setSelectedMenu(e.target.value)}
             className="w-full p-3 bg-slate-100 border-none rounded-lg text-slate-700 font-medium"
           >
              <option>Americano (I/H)</option>
              <option>Caffè Latte (I/H)</option>
              <option>Vanilla Bean Latte</option>
           </select>
        </div>

        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm font-medium border border-blue-100 flex items-center gap-2">
           <span className="text-lg">🔮</span> AI 수요 예측을 향후 <span className="font-bold">21일</span> 기준으로 실행합니다.
        </div>

        <div className="bg-green-50 text-green-800 p-4 rounded-lg text-sm font-medium border border-green-100 flex items-center gap-2">
           <span className="text-lg">🤖</span> AI 예측: '{selectedMenu}'의 향후 <span className="font-bold">21일간</span> 예상 판매량을 <span className="font-bold">192개</span>로 예측했습니다.
        </div>

        <div className="space-y-2 mt-6">
           <h3 className="font-bold text-slate-800 text-sm">'{selectedMenu}' 전체 기간 수요 예측</h3>
           <div className="h-80 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend verticalAlign="top" height={36} />
                    <Line type="monotone" dataKey="actual" name="실제 판매량(전체)" stroke="#4b5563" strokeWidth={2} dot={{r: 4}} connectNulls />
                    <Line type="monotone" dataKey="predicted" name="AI 예측(향후)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3}} />
                 </LineChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-6">
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                 <tr>
                    <th className="px-4 py-3 w-12 text-center"></th>
                    <th className="px-4 py-3">상품상세</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3">현재재고</th>
                    <th className="px-4 py-3">권장발주</th>
                    <th className="px-4 py-3">판매 가능 일수</th>
                    <th className="px-4 py-3">일평균소진</th>
                    <th className="px-4 py-3">발주 시점</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-400">0</td>
                    <td className="px-4 py-3 font-medium">물</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-1 text-green-600 font-bold"><div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>충분</span></td>
                    <td className="px-4 py-3">10,000.0 ml</td>
                    <td className="px-4 py-3">1.0 ml</td>
                    <td className="px-4 py-3">21.9일</td>
                    <td className="px-4 py-3">456.6 ml</td>
                    <td className="px-4 py-3">1,370.0 ml</td>
                 </tr>
                 <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-400">1</td>
                    <td className="px-4 py-3 font-medium">에스프레소</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-1 text-green-600 font-bold"><div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>충분</span></td>
                    <td className="px-4 py-3">9,156.0 g</td>
                    <td className="px-4 py-3">1.0 g</td>
                    <td className="px-4 py-3">250.6일</td>
                    <td className="px-4 py-3">36.5 g</td>
                    <td className="px-4 py-3">110.0 g</td>
                 </tr>
              </tbody>
           </table>
        </div>
      </div>
    );
  };


  // --- Main Layout ---
  const TABS = [
    { id: "price", label: "원재료 시세", icon: DollarSign },
    { id: "input", label: "재고 입력", icon: Camera },
    { id: "summary", label: "재고 요약", icon: Package },
    { id: "ai", label: "AI 영향도", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-4">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
             <span className="text-amber-700"><Package size={32} /></span>
             재고 관리
          </h2>
        </div>

        {/* Refresh Button */}
        <button 
           onClick={handleRefresh}
           className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors w-fit"
        >
           <RefreshCw size={16} /> 데이터 새로 불러오기 (캐시 초기화)
        </button>

        {/* Alerts */}
        <div className="bg-green-50 border border-green-100 text-green-800 px-4 py-3 rounded-lg text-sm font-medium">
           대표님, 오늘(2025-12-05 (금)) 기준 물 소진 예상 D-4 (약 4.4일 후))
        </div>
        <div className="bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 rounded-lg text-sm">
           제안: 재고 요약/AI 영향도 탭에서 권장발주와 커버일수를 확인하고, 재고 입력 탭에서 즉시 반영하세요.
        </div>
      </header>

      {/* Custom Radio-Style Tab Navigation */}
      <div className="space-y-2">
         <div className="text-xs font-bold text-slate-500">탭 선택</div>
         <div className="flex flex-wrap gap-4 items-center">
            {TABS.map((tab) => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 group cursor-pointer"
               >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                     activeTab === tab.id ? 'border-red-500' : 'border-slate-300 group-hover:border-slate-400'
                  }`}>
                     {activeTab === tab.id && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                  <span className={`text-sm font-medium flex items-center gap-1 ${
                     activeTab === tab.id ? 'text-slate-900 font-bold' : 'text-slate-600 group-hover:text-slate-800'
                  }`}>
                     {tab.id === 'price' && '💸'} 
                     {tab.id === 'input' && '📸'} 
                     {tab.id === 'summary' && '📦'} 
                     {tab.id === 'ai' && '🔮'} 
                     {tab.label}
                  </span>
               </button>
            ))}
         </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        {activeTab === "price" && <PriceTab />}
        {activeTab === "input" && <InputTab />}
        {activeTab === "summary" && <SummaryTab />}
        {activeTab === "ai" && <AiImpactTab />}
      </div>
    </div>
  );
};

// Helper Icon for "Why" button
const ChevronRightIcon = ({size}: {size: number}) => (
   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);