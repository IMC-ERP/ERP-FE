
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { SaleItem } from '../types';
import { FileText, PlusCircle, Search, Filter, RotateCcw, Calendar, Clock, Save, X, AlertTriangle, ArrowRight, Check } from 'lucide-react';

// --- Sub-component: Transaction History ---
const HistoryView = () => {
  const { sales, updateSale } = useData();
  
  // Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Edit States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SaleItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Extract Unique Categories for Dropdown
  const categories = useMemo(() => {
    const cats = new Set(sales.map(s => s.category));
    return ['All', ...Array.from(cats)];
  }, [sales]);

  // Filtering Logic
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // 1. Date Filter
      if (startDate && sale.date < startDate) return false;
      if (endDate && sale.date > endDate) return false;

      // 2. Time Filter (Assuming sale.time is HH:MM:SS)
      // Extract HH:MM for comparison
      const saleTimeHM = sale.time.slice(0, 5); 
      if (startTime && saleTimeHM < startTime) return false;
      if (endTime && saleTimeHM > endTime) return false;

      // 3. Category Filter
      if (selectedCategory !== 'All' && sale.category !== selectedCategory) return false;

      // 4. Keyword Filter (Menu Name)
      if (searchKeyword && !sale.itemDetail.toLowerCase().includes(searchKeyword.toLowerCase())) return false;

      return true;
    }).sort((a, b) => 
      // Sort Descending
      new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()
    );
  }, [sales, startDate, endDate, startTime, endTime, selectedCategory, searchKeyword]);

  // --- Handlers ---
  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setSelectedCategory('All');
    setSearchKeyword('');
  };

  const handleRowDoubleClick = (sale: SaleItem) => {
    setEditingId(sale.id);
    setEditForm({ ...sale });
  };

  const handleEditChange = (field: keyof SaleItem, value: any) => {
    if (!editForm) return;

    let updatedForm = { ...editForm, [field]: value };

    // Auto-calculate revenue if qty or price changes
    if (field === 'qty' || field === 'price') {
      const q = field === 'qty' ? Number(value) : editForm.qty;
      const p = field === 'price' ? Number(value) : editForm.price;
      updatedForm.revenue = q * p;
    }

    setEditForm(updatedForm);
  };

  const initiateSave = () => {
    if (!editingId || !editForm) return;
    // Check if anything actually changed could go here
    setShowConfirmModal(true);
  };

  const confirmSave = () => {
    if (editForm) {
      updateSale(editForm);
      setEditingId(null);
      setEditForm(null);
      setShowConfirmModal(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setShowConfirmModal(false);
  };

  // Helper to get original data for comparison
  const originalData = useMemo(() => {
    return sales.find(s => s.id === editingId);
  }, [sales, editingId]);

  return (
    <div className="space-y-4 animate-fade-in relative">
      {/* Advanced Filter Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-2">
           <Filter size={18} className="text-blue-600" />
           <span>상세 검색 필터</span>
        </div>
        
        {/* Adjusted grid for better spacing: ranges get more columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
           {/* Date Range (2 columns span) */}
           <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                 <Calendar size={12} /> 날짜 범위
              </label>
              <div className="flex items-center gap-2">
                 <input 
                   type="date" 
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                 />
                 <span className="text-slate-400">~</span>
                 <input 
                   type="date" 
                   value={endDate}
                   onChange={(e) => setEndDate(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                 />
              </div>
           </div>

           {/* Time Range (2 columns span) */}
           <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                 <Clock size={12} /> 시간 범위
              </label>
              <div className="flex items-center gap-2">
                 <input 
                   type="time" 
                   value={startTime}
                   onChange={(e) => setStartTime(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                 />
                 <span className="text-slate-400">~</span>
                 <input 
                   type="time" 
                   value={endTime}
                   onChange={(e) => setEndTime(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                 />
              </div>
           </div>

           {/* Category Select (1 column span) */}
           <div className="space-y-1 lg:col-span-1">
              <label className="text-xs font-semibold text-slate-500">카테고리</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none h-[38px]"
              >
                 {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? '전체 카테고리' : cat}</option>
                 ))}
              </select>
           </div>

           {/* Menu Search (1 column span) */}
           <div className="space-y-1 lg:col-span-1">
              <label className="text-xs font-semibold text-slate-500">메뉴명 검색</label>
              <div className="relative">
                 <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                 <input 
                   type="text" 
                   placeholder="검색..." 
                   value={searchKeyword}
                   onChange={(e) => setSearchKeyword(e.target.value)}
                   className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none h-[38px]"
                 />
              </div>
           </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
           <div className="text-xs text-slate-500">
              검색 결과: <span className="font-bold text-blue-600">{filteredSales.length}</span> 건
           </div>
           <button 
             onClick={handleReset}
             className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
           >
              <RotateCcw size={12} /> 필터 초기화
           </button>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] relative">
         {/* Fixed Header with Sticky positioning */}
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap bg-slate-50">날짜</th>
                <th className="px-6 py-3 whitespace-nowrap bg-slate-50">시간</th>
                <th className="px-6 py-3 whitespace-nowrap bg-slate-50">카테고리</th>
                <th className="px-6 py-3 whitespace-nowrap bg-slate-50">메뉴명</th>
                <th className="px-6 py-3 text-right whitespace-nowrap bg-slate-50">수량</th>
                <th className="px-6 py-3 text-right whitespace-nowrap bg-slate-50">단가</th>
                <th className="px-6 py-3 text-right whitespace-nowrap bg-slate-50">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                 <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                       검색 조건에 맞는 거래 내역이 없습니다.
                    </td>
                 </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isEditing = editingId === sale.id;
                  return (
                    <tr 
                      key={sale.id} 
                      onDoubleClick={() => handleRowDoubleClick(sale)}
                      className={`transition-colors cursor-pointer ${isEditing ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                    >
                      {isEditing && editForm ? (
                        <>
                          <td className="px-6 py-3">
                            <input 
                              type="date" 
                              value={editForm.date} 
                              onChange={(e) => handleEditChange('date', e.target.value)}
                              className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-3">
                             <input 
                              type="time" 
                              value={editForm.time.slice(0, 5)} 
                              onChange={(e) => handleEditChange('time', e.target.value + ":00")}
                              className="w-24 bg-white border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input 
                              type="text" 
                              value={editForm.category} 
                              onChange={(e) => handleEditChange('category', e.target.value)}
                              className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input 
                              type="text" 
                              value={editForm.itemDetail} 
                              onChange={(e) => handleEditChange('itemDetail', e.target.value)}
                              className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-3 text-right">
                             <input 
                              type="number" 
                              value={editForm.qty} 
                              onChange={(e) => handleEditChange('qty', parseInt(e.target.value))}
                              className="w-16 bg-white border border-blue-300 rounded px-2 py-1 text-xs text-right focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-3 text-right">
                             <input 
                              type="number" 
                              value={editForm.price} 
                              onChange={(e) => handleEditChange('price', parseInt(e.target.value))}
                              className="w-20 bg-white border border-blue-300 rounded px-2 py-1 text-xs text-right focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-3 text-right font-mono font-medium text-blue-600">
                             {editForm.revenue.toLocaleString()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-3 text-slate-600">{sale.date}</td>
                          <td className="px-6 py-3 text-slate-600">{sale.time.slice(0, 5)}</td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                              {sale.category}
                            </span>
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-800 truncate max-w-[200px]" title={sale.itemDetail}>{sale.itemDetail}</td>
                          <td className="px-6 py-3 text-right font-mono text-slate-600">{sale.qty}</td>
                          <td className="px-6 py-3 text-right font-mono text-slate-500">{sale.price.toLocaleString()}</td>
                          <td className="px-6 py-3 text-right font-mono font-medium text-blue-600">{sale.revenue.toLocaleString()}</td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Floating Save Button */}
        {editingId && (
          <div className="absolute bottom-6 right-8 flex gap-3 animate-bounce-in">
             <button
               onClick={cancelEdit}
               className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-600 rounded-full shadow-lg hover:bg-slate-50 font-bold transition-all"
             >
                <X size={20} /> 취소
             </button>
             <button
               onClick={initiateSave}
               className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 font-bold transition-all hover:scale-105 ring-4 ring-blue-100"
             >
                <Save size={20} /> 변경사항 저장하기
             </button>
          </div>
        )}
      </div>
      
      {/* Note for scrolling */}
      {filteredSales.length > 20 && !editingId && (
         <div className="text-center text-xs text-slate-400">
            * 내역이 많을 경우 목록을 스크롤하여 확인하세요. 행을 더블클릭하여 수정할 수 있습니다.
         </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && originalData && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
              <div className="p-6 border-b border-slate-100 flex items-start gap-4 bg-amber-50">
                 <div className="p-3 bg-amber-100 rounded-full flex-shrink-0">
                    <AlertTriangle className="text-amber-600" size={24} />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">변경사항 확인</h3>
                    <p className="text-sm text-slate-600 mt-1">
                       다음 거래 내역을 수정하시겠습니까? 이 작업은 즉시 반영됩니다.
                    </p>
                 </div>
              </div>

              <div className="p-6 space-y-4">
                 <div className="grid grid-cols-11 gap-2 items-center text-sm">
                    {/* Header */}
                    <div className="col-span-5 font-bold text-slate-500 text-center">변경 전</div>
                    <div className="col-span-1 flex justify-center"></div>
                    <div className="col-span-5 font-bold text-blue-600 text-center">변경 후</div>

                    {/* Compare Fields */}
                    {originalData.itemDetail !== editForm.itemDetail && (
                       <>
                          <div className="col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center">{originalData.itemDetail}</div>
                          <div className="col-span-1 flex justify-center"><ArrowRight size={14} className="text-slate-400"/></div>
                          <div className="col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center">{editForm.itemDetail}</div>
                       </>
                    )}
                     {originalData.qty !== editForm.qty && (
                       <>
                          <div className="col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center">{originalData.qty}개</div>
                          <div className="col-span-1 flex justify-center"><ArrowRight size={14} className="text-slate-400"/></div>
                          <div className="col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center">{editForm.qty}개</div>
                       </>
                    )}
                     {originalData.price !== editForm.price && (
                       <>
                          <div className="col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center">{originalData.price.toLocaleString()}원</div>
                          <div className="col-span-1 flex justify-center"><ArrowRight size={14} className="text-slate-400"/></div>
                          <div className="col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center">{editForm.price.toLocaleString()}원</div>
                       </>
                    )}
                     {originalData.date !== editForm.date && (
                       <>
                          <div className="col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center">{originalData.date}</div>
                          <div className="col-span-1 flex justify-center"><ArrowRight size={14} className="text-slate-400"/></div>
                          <div className="col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center">{editForm.date}</div>
                       </>
                    )}
                 </div>
                 
                 {/* No visible changes check (optional but good UX) */}
                 {originalData.itemDetail === editForm.itemDetail && 
                  originalData.qty === editForm.qty && 
                  originalData.price === editForm.price && 
                  originalData.date === editForm.date && 
                  originalData.category === editForm.category &&
                  originalData.time === editForm.time && (
                     <div className="text-center py-4 text-slate-500 italic">
                        변경된 내용이 없습니다.
                     </div>
                  )
                 }
              </div>

              <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                 <button 
                   onClick={() => setShowConfirmModal(false)}
                   className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                 >
                    취소
                 </button>
                 <button 
                   onClick={confirmSave}
                   className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                 >
                    <Check size={18} />
                    확인 및 적용
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-component: Add Transaction ---
const QUICK_MENU_ITEMS = [
  { name: "Americano (I/H)", count: 808, price: 4000 },
  { name: "Caffè Latte (I/H)", count: 510, price: 4500 },
  { name: "Hazelnut Americano (Iced)", count: 408, price: 4500 },
  { name: "Vanilla Bean Latte (Iced)", count: 224, price: 5300 },
  { name: "Dolce Latte (Iced)", count: 140, price: 5500 },
  { name: "Honey Americano (Iced)", count: 100, price: 4500 },
  { name: "Shakerato (Iced)", count: 97, price: 4800 },
];

const AddView = () => {
  const { addSale } = useData();
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [price, setPrice] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleQuickSelect = (item: typeof QUICK_MENU_ITEMS[0]) => {
    setSelectedItem(item.name);
    setPrice(item.price);
    setQty(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || price <= 0 || qty <= 0) return;

    const newSale: SaleItem = {
      id: Math.random().toString(36).substr(2, 9),
      date: date,
      time: new Date().toLocaleTimeString('en-GB'),
      itemDetail: selectedItem,
      category: selectedItem.includes("Latte") || selectedItem.includes("Americano") ? "Coffee" : "Other",
      type: "Manual",
      qty,
      price,
      revenue: price * qty,
      dayOfWeek: new Date(date).toLocaleDateString('ko-KR', { weekday: 'short' })
    };

    addSale(newSale);
    alert("✅ 저장되었습니다. (재고 자동 차감 시뮬레이션)");
    setQty(1);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Quick Select Cards */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
        <h3 className="text-sm font-bold text-amber-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
          <span>🏆</span> 자주 찾는 메뉴 (Top 7)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {QUICK_MENU_ITEMS.map((item) => (
            <button
              key={item.name}
              onClick={() => handleQuickSelect(item)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedItem === item.name 
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                  : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
              }`}
            >
              <div className="font-bold text-slate-800 text-xs mb-1 truncate" title={item.name}>{item.name}</div>
              <div className="text-[10px] font-semibold text-blue-600">{item.price.toLocaleString()}원</div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Entry Form */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
           <PlusCircle size={20} className="text-blue-600" />
           상세 거래 입력
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">메뉴 선택</label>
            <input 
              type="text" 
              value={selectedItem} 
              onChange={(e) => setSelectedItem(e.target.value)}
              placeholder="메뉴를 선택하거나 직접 입력하세요..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">수량</label>
              <input 
                type="number" 
                min="1"
                value={qty} 
                onChange={(e) => setQty(parseInt(e.target.value))}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">단가 (원)</label>
              <input 
                type="text" 
                value={price} 
                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">날짜</label>
             <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
             />
          </div>

          <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center">
             <span className="text-slate-600 font-medium">💰 계산된 수익</span>
             <span className="text-xl font-bold text-blue-600">{(price * qty).toLocaleString()}원</span>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200"
          >
            거래 등록하기
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main Container ---
export const TransactionManager = () => {
  const [activeTab, setActiveTab] = useState("history");

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
           📋 거래 데이터 관리
        </h2>
        <p className="text-sm text-slate-500">전체 거래 내역을 조회하거나 새로운 매출 데이터를 등록할 수 있습니다.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${
            activeTab === "history" 
              ? "bg-white text-blue-600 border-b-2 border-blue-600" 
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <FileText size={16} />
          거래 내역
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${
            activeTab === "add" 
              ? "bg-white text-blue-600 border-b-2 border-blue-600" 
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <PlusCircle size={16} />
          거래 추가
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "history" && <HistoryView />}
        {activeTab === "add" && <AddView />}
      </div>
    </div>
  );
};
